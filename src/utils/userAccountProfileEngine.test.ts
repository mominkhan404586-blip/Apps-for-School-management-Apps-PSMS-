import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyUserProfileUpdate,
  checkUsernameAndUniqueIdUniqueness,
  getSuggestedAvatarsByGender,
  verifyUserProfile,
} from './userAccountProfileEngine';
import { INITIAL_ADMIN_ACCOUNTS, INITIAL_SCHOOLS, INITIAL_TEACHERS } from './testFixtures';
import type { UserProfileRecord } from '../types';

test('checkUsernameAndUniqueIdUniqueness blocks duplicate usernames & IDs system-wide', () => {
  const dupTeacher = checkUsernameAndUniqueIdUniqueness({
    candidateUsername: 'tch-gps1042-02',
    candidateUniqueIdCode: 'UID-FRESH-999',
    currentEntityId: 'new-user-1',
    admins: INITIAL_ADMIN_ACCOUNTS,
    schools: INITIAL_SCHOOLS,
    teachers: INITIAL_TEACHERS,
  });
  assert.equal(dupTeacher.ok, false);
  assert.equal(dupTeacher.usernameConflict, true);

  const dupSchoolId = checkUsernameAndUniqueIdUniqueness({
    candidateUsername: 'fresh_user_abc',
    candidateUniqueIdCode: 'GPS-1042',
    currentEntityId: 'new-user-1',
    admins: INITIAL_ADMIN_ACCOUNTS,
    schools: INITIAL_SCHOOLS,
    teachers: INITIAL_TEACHERS,
  });
  assert.equal(dupSchoolId.ok, false);
  assert.equal(dupSchoolId.uniqueIdConflict, true);

  const selfOk = checkUsernameAndUniqueIdUniqueness({
    candidateUsername: INITIAL_SCHOOLS[0].adminUsername,
    candidateUniqueIdCode: INITIAL_SCHOOLS[0].code,
    currentEntityId: INITIAL_SCHOOLS[0].id,
    schools: INITIAL_SCHOOLS,
  });
  assert.equal(selfOk.ok, true);
});

test('applyUserProfileUpdate triggers reverification_required on critical edits & verifyUserProfile clears it', () => {
  const baseProfile: UserProfileRecord = {
    entityId: 'par-100',
    role: 'guardian',
    displayName: 'Kamrul Hasan',
    username: 'kamrul_parent',
    uniqueIdCode: 'PAR-1001',
    gender: 'Male',
    email: 'kamrul@example.com',
    mobile: '01711112222',
    verificationStatus: 'verified',
    verifiedAt: '2026-10-01T10:00:00.000Z',
    lastUpdatedAt: '2026-10-01T10:00:00.000Z',
  };

  // Avatar change alone should NOT force re-verification
  const avatarOnly = applyUserProfileUpdate(
    baseProfile,
    { photoUrl: getSuggestedAvatarsByGender('Male')[0].dataUrl },
    { schools: INITIAL_SCHOOLS, teachers: INITIAL_TEACHERS }
  );
  assert.equal(avatarOnly.ok, true);
  assert.equal(avatarOnly.requiresReverification, false);
  assert.equal(avatarOnly.profile?.verificationStatus, 'verified');

  // Changing username/mobile triggers reverification_required
  const criticalEdit = applyUserProfileUpdate(
    baseProfile,
    { username: 'kamrul_new', mobile: '01799998888' },
    { schools: INITIAL_SCHOOLS, teachers: INITIAL_TEACHERS }
  );
  assert.equal(criticalEdit.ok, true);
  assert.equal(criticalEdit.requiresReverification, true);
  assert.equal(criticalEdit.profile?.verificationStatus, 'reverification_required');

  const verifiedAgain = verifyUserProfile(criticalEdit.profile!);
  assert.equal(verifiedAgain.verificationStatus, 'verified');
  assert.equal(verifiedAgain.reverificationReason, undefined);
});

test('getSuggestedAvatarsByGender returns gender-specific SVG presets', () => {
  const male = getSuggestedAvatarsByGender('Male');
  const female = getSuggestedAvatarsByGender('Female');
  assert.ok(male.length >= 2);
  assert.ok(female.length >= 2);
  assert.ok(male.every((m) => m.gender === 'Male' && m.dataUrl.startsWith('data:image/svg+xml')));
  assert.ok(female.every((f) => f.gender === 'Female' && f.dataUrl.startsWith('data:image/svg+xml')));
});
