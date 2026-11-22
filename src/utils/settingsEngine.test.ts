import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SETTINGS_CATEGORIES,
  FEATURE_TOGGLE_DEFINITIONS,
  createDefaultSettingsState,
  getVisibleSettingsSectionsForRole,
  getEditableFeatureTogglesForRole,
  toggleSystemFeatureSafely,
  canPerformActionUnderSettings,
  mapExtendedNotificationsToPreferences,
} from './settingsEngine.ts';

test('all 14 settings categories exist and role visibility filters strictly by role', () => {
  assert.equal(SETTINGS_CATEGORIES.length, 14);

  const central = getVisibleSettingsSectionsForRole('central_admin').map((c) => c.id);
  assert.equal(central.length, 14);
  assert.ok(central.includes('system_feature_control'));
  assert.ok(central.includes('subscription_billing'));
  assert.ok(central.includes('deployment_links'));

  const school = getVisibleSettingsSectionsForRole('school_admin').map((c) => c.id);
  assert.ok(school.includes('system_feature_control'));
  assert.ok(school.includes('school_settings'));
  assert.ok(school.includes('users_permissions'));
  assert.ok(school.includes('deployment_links'));
  assert.ok(!school.includes('subscription_billing'));

  for (const role of ['teacher', 'student', 'guardian'] as const) {
    const sections = getVisibleSettingsSectionsForRole(role).map((c) => c.id);
    assert.ok(sections.includes('account_profile'));
    assert.ok(sections.includes('security_privacy'));
    assert.ok(sections.includes('notifications'));
    assert.ok(sections.includes('appearance_language'));
    assert.ok(sections.includes('regional_settings'));
    assert.ok(sections.includes('help_support'));
    assert.ok(sections.includes('deployment_links'));
    assert.ok(sections.includes('about'));
    assert.ok(!sections.includes('system_feature_control'), `${role} must not see system_feature_control`);
    assert.ok(!sections.includes('school_settings'), `${role} must not see school_settings`);
    assert.ok(!sections.includes('users_permissions'), `${role} must not see users_permissions`);
  }
});

test('non-destructive feature toggle: disabling studentRegistration blocks ONLY new registration while keeping existing student active', () => {
  const initial = createDefaultSettingsState('bn', 'light');
  assert.equal(initial.features.studentRegistration, true);

  const result = toggleSystemFeatureSafely(
    initial,
    'central_admin',
    'Super Central Admin',
    'studentRegistration',
    false,
    'Admission window closed'
  );

  assert.equal(result.allowed, true);
  assert.ok(result.auditEntry);
  assert.equal(result.auditEntry?.oldValue, 'ON');
  assert.equal(result.auditEntry?.newValue, 'OFF');
  assert.equal(result.nextState.features.studentRegistration, false);

  // Other features MUST remain untouched (never cascade!)
  assert.equal(result.nextState.features.teacherRegistration, true);
  assert.equal(result.nextState.features.classRoutine, true);
  assert.equal(result.nextState.features.studentAttendance, true);

  // New student registration is blocked:
  const newRegCheck = canPerformActionUnderSettings(result.nextState, 'new_student_registration');
  assert.equal(newRegCheck.allowed, false);

  // Existing student actions STILL ALLOWED:
  assert.equal(canPerformActionUnderSettings(result.nextState, 'existing_student_login').allowed, true);
  assert.equal(canPerformActionUnderSettings(result.nextState, 'existing_student_attendance').allowed, true);
  assert.equal(canPerformActionUnderSettings(result.nextState, 'existing_student_view_routine').allowed, true);
  assert.equal(canPerformActionUnderSettings(result.nextState, 'existing_student_view_results').allowed, true);
  assert.equal(canPerformActionUnderSettings(result.nextState, 'existing_student_view_notices').allowed, true);
  assert.equal(canPerformActionUnderSettings(result.nextState, 'existing_student_submit_assignment').allowed, true);

  // Re-enabling works instantly:
  const reEnabled = toggleSystemFeatureSafely(
    result.nextState,
    'school_admin',
    'Head Teacher',
    'studentRegistration',
    true
  );
  assert.equal(reEnabled.allowed, true);
  assert.equal(canPerformActionUnderSettings(reEnabled.nextState, 'new_student_registration').allowed, true);
});

test('RBAC prevents teacher/student/guardian from mutating any system toggle and limits school_admin to school-level toggles', () => {
  const initial = createDefaultSettingsState('bn', 'light');

  const teacherAttempt = toggleSystemFeatureSafely(initial, 'teacher', 'Rahim Sir', 'studentRegistration', false);
  assert.equal(teacherAttempt.allowed, false);
  assert.equal(teacherAttempt.nextState.features.studentRegistration, true);

  const studentAttempt = toggleSystemFeatureSafely(initial, 'student', 'Student', 'marksEntry', false);
  assert.equal(studentAttempt.allowed, false);

  // School admin CANNOT edit central_only toggles like maintenanceMode or schoolRegistration
  const schoolCentralAttempt = toggleSystemFeatureSafely(initial, 'school_admin', 'Head Teacher', 'schoolRegistration', false);
  assert.equal(schoolCentralAttempt.allowed, false);

  // Central admin has access to all feature toggle definitions
  assert.equal(getEditableFeatureTogglesForRole('central_admin').length, FEATURE_TOGGLE_DEFINITIONS.length);
  assert.ok(getEditableFeatureTogglesForRole('school_admin').length < FEATURE_TOGGLE_DEFINITIONS.length);
  assert.equal(getEditableFeatureTogglesForRole('teacher').length, 0);
});

test('regional defaults match Bangladesh standards and notification channels map cleanly', () => {
  const def = createDefaultSettingsState('bn', 'light');
  assert.equal(def.regional.country, 'Bangladesh');
  assert.equal(def.regional.timeZone, 'Asia/Dhaka (UTC+6)');
  assert.equal(def.regional.currency, 'BDT (৳)');

  const prefs = mapExtendedNotificationsToPreferences({
    ...def.notifications,
    notice: false,
    exam: false,
    result: false,
  });
  assert.equal(prefs.notice, false);
  assert.equal(prefs.exam_result, false);
  assert.equal(prefs.routine, true);
});
