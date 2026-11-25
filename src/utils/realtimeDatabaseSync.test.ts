import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  RTDB_DATABASE_URL,
  REALTIME_DATABASE_RULES_JSON,
  applyRealtimeUserToSession,
  normalizeRtdbUserRecord,
  validateRealtimeUserAccountUpdate,
} from './realtimeDatabaseSync';
import type { AuthenticatedSession } from './authGuard';

test('validateRealtimeUserAccountUpdate detects valid changes and produces accurate old-vs-new diffs', () => {
  const result = validateRealtimeUserAccountUpdate(
    {
      uid: 'uid-101',
      displayName: 'Momin Khan',
      email: 'mominkhan404586@gmail.com',
      phone: '01711000000',
      role: 'central_admin',
      status: 'active',
    },
    {
      displayName: 'Mominul Islam Khan',
      email: 'mominkhan404586@gmail.com',
      phone: '01812345678',
      role: 'central_admin',
      status: 'active',
    }
  );

  assert.equal(result.valid, true);
  assert.equal(result.invalidCount, 0);
  assert.equal(result.validCount, 5);
  assert.equal(result.changedCount, 2);

  const nameDiff = result.fieldDiffs.find((d) => d.field === 'displayName');
  assert.equal(nameDiff?.changed, true);
  assert.equal(nameDiff?.valid, true);
  assert.equal(nameDiff?.oldValue, 'Momin Khan');
  assert.equal(nameDiff?.newValue, 'Mominul Islam Khan');
});

test('validateRealtimeUserAccountUpdate highlights exact invalid fields vs valid fields', () => {
  const result = validateRealtimeUserAccountUpdate(
    {
      uid: 'uid-202',
      displayName: 'Rahim Teacher',
      email: 'rahim@school.edu.bd',
      phone: '01711223344',
      role: 'teacher',
      status: 'active',
    },
    {
      displayName: 'A',
      email: 'invalid-email',
      phone: '123',
      role: 'super_hacker' as never,
      status: 'unknown' as never,
    }
  );

  assert.equal(result.valid, false);
  assert.equal(result.invalidCount, 5);
  assert.ok(result.errors.displayName);
  assert.ok(result.errors.email);
  assert.ok(result.errors.phone);
  assert.ok(result.errors.role);
  assert.ok(result.errors.status);
});

test('applyRealtimeUserToSession auto-updates authenticatedSession on profile changes and blocks suspended accounts', () => {
  const baseSession: AuthenticatedSession = {
    uid: 'uid-teacher-1',
    role: 'teacher',
    displayName: 'Old Name',
    email: 'old@school.edu.bd',
    provider: 'firebase_email',
    schoolId: 'SCH-1',
    teacherId: 'TCH-1',
    signedInAtIso: '2026-11-25T00:00:00.000Z',
  };

  const noChange = applyRealtimeUserToSession(baseSession, {
    uid: 'uid-teacher-1',
    displayName: 'Old Name',
    email: 'old@school.edu.bd',
    role: 'teacher',
    status: 'active',
    schoolId: 'SCH-1',
    teacherId: 'TCH-1',
    updatedAt: 1732500000000,
  });
  assert.equal(noChange.changed, false);
  assert.equal(noChange.suspended, false);

  const updated = applyRealtimeUserToSession(baseSession, {
    uid: 'uid-teacher-1',
    displayName: 'New Teacher Name',
    email: 'new@school.edu.bd',
    role: 'school_admin',
    status: 'active',
    schoolId: 'SCH-2',
    teacherId: 'TCH-1',
    updatedAt: 1732500005000,
  });
  assert.equal(updated.changed, true);
  assert.equal(updated.suspended, false);
  assert.equal(updated.nextSession?.displayName, 'New Teacher Name');
  assert.equal(updated.nextSession?.email, 'new@school.edu.bd');
  assert.equal(updated.nextSession?.role, 'school_admin');
  assert.equal(updated.nextSession?.schoolId, 'SCH-2');

  const suspended = applyRealtimeUserToSession(baseSession, {
    uid: 'uid-teacher-1',
    displayName: 'Old Name',
    email: 'old@school.edu.bd',
    role: 'teacher',
    status: 'suspended',
    updatedAt: 1732500009000,
  });
  assert.equal(suspended.changed, true);
  assert.equal(suspended.suspended, true);
  assert.equal(suspended.nextSession, null);
});

test('normalizeRtdbUserRecord safely normalizes valid records and rejects invalid payloads', () => {
  assert.equal(normalizeRtdbUserRecord('u1', null), null);
  const normalized = normalizeRtdbUserRecord('u1', {
    displayName: '  Karim Ahmed  ',
    email: 'karim@example.com',
    phone: '01912345678',
    role: 'school_admin',
    status: 'active',
    schoolId: 'SCH-1042',
    updatedAt: 1732500000000,
  });
  assert.equal(normalized?.uid, 'u1');
  assert.equal(normalized?.displayName, 'Karim Ahmed');
  assert.equal(normalized?.schoolId, 'SCH-1042');
});

test('database.rules.json defines role-based & school/profile-ID scoped permissions across admins, teachers, students, and guardians', () => {
  const parsedFromExport = JSON.parse(REALTIME_DATABASE_RULES_JSON);
  const filePath = path.resolve(process.cwd(), 'database.rules.json');
  const parsedFromFile = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  assert.deepEqual(parsedFromFile, parsedFromExport);
  assert.equal(parsedFromFile.rules['.read'], false);
  assert.equal(parsedFromFile.rules['.write'], false);
  assert.ok(String(parsedFromFile.rules.users.$uid['.write']).includes('mominkhan404586@gmail.com'));
  assert.ok(String(parsedFromFile.rules.schools.$schoolId.teachers.$teacherId['.write']).includes('teacherId'));
  assert.ok(String(parsedFromFile.rules.schools.$schoolId.students.$studentId['.read']).includes('studentId'));
  assert.ok(String(parsedFromFile.rules.schools.$schoolId.students.$studentId['.read']).includes('guardian'));
  assert.ok(parsedFromFile.rules.account_snapshots.$uid);
  assert.ok(parsedFromFile.rules.rtdb_sync_tests.$uid);
  assert.equal(
    RTDB_DATABASE_URL,
    'https://school-management-apk-default-rtdb.asia-southeast1.firebasedatabase.app'
  );
});
