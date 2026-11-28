import type {
  AdminAccount,
  NoticeItem,
  ParentAccountRecord,
  SchoolRecord,
  StudentRecord,
  TeacherRecord,
} from '../types';

export const DOMAIN_STATE_STORAGE_KEY = 'psms_persisted_domain_state_v1';

export const KNOWN_LEGACY_DEMO_SCHOOL_IDS = new Set([
  'GPS-1042',
  'DHS-2019',
  'MGP-3011',
  'KG-4010',
]);
export const KNOWN_LEGACY_DEMO_STUDENT_IDS = new Set([
  'stu-rahim',
  'stu-karim',
  'stu-3',
  'stu-4',
  'stu-5',
  'stu-6',
  'stu-7',
  'stu-8',
]);
export const KNOWN_LEGACY_DEMO_TEACHER_IDS = new Set([
  'tch-1',
  'tch-2',
  'tch-3',
  'tch-4',
  'tch-5',
  'tch-6',
]);
export const KNOWN_LEGACY_DEMO_ADMIN_IDS = new Set(['adm-2']);

export interface GuardianProfileState {
  displayName: string;
  email: string;
  phone: string;
  photoUrl?: string;
}

export interface PersistedDomainState {
  version: number;
  schools?: SchoolRecord[];
  teachers?: TeacherRecord[];
  students?: StudentRecord[];
  parents?: ParentAccountRecord[];
  adminAccounts?: AdminAccount[];
  notices?: NoticeItem[];
  guardianProfile?: GuardianProfileState;
  updatedAtIso?: string;
}

export function createDefaultGuardianProfile(
  fallbackPhone = '',
  fallbackEmail = ''
): GuardianProfileState {
  return {
    displayName: 'Parent',
    email: fallbackEmail,
    phone: fallbackPhone,
  };
}

export function stripLegacyDemoRecords(state: PersistedDomainState | null): PersistedDomainState | null {
  if (!state) return null;
  const cleanedSchools = Array.isArray(state.schools)
    ? state.schools.filter((s) => s && !KNOWN_LEGACY_DEMO_SCHOOL_IDS.has(s.id))
    : state.schools;
  const cleanedStudents = Array.isArray(state.students)
    ? state.students.filter((s) => s && !KNOWN_LEGACY_DEMO_STUDENT_IDS.has(s.id))
    : state.students;
  const cleanedTeachers = Array.isArray(state.teachers)
    ? state.teachers.filter((t) => t && !KNOWN_LEGACY_DEMO_TEACHER_IDS.has(t.id))
    : state.teachers;
  const cleanedAdmins = Array.isArray(state.adminAccounts)
    ? state.adminAccounts.filter((a) => a && !KNOWN_LEGACY_DEMO_ADMIN_IDS.has(a.id))
    : state.adminAccounts;

  return {
    ...state,
    schools: cleanedSchools,
    students: cleanedStudents,
    teachers: cleanedTeachers,
    adminAccounts: cleanedAdmins,
  };
}

export function mergeDomainRecordsById<T extends { id: string }>(
  baseRecords: T[],
  overrideRecords?: T[] | null
): T[] {
  if (!Array.isArray(overrideRecords) || overrideRecords.length === 0) {
    return baseRecords;
  }
  const byId = new Map<string, T>();
  baseRecords.forEach((item) => byId.set(item.id, item));
  const merged: T[] = [];

  overrideRecords.forEach((ov) => {
    if (!ov || typeof ov.id !== 'string' || !ov.id.trim()) return;
    const base = byId.get(ov.id);
    merged.push(base ? { ...base, ...ov } : ov);
  });

  return merged;
}

export function loadPersistedDomainState(
  storage?: Pick<Storage, 'getItem'> | null
): PersistedDomainState | null {
  const store =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null;
  if (!store) return null;
  try {
    const raw = store.getItem(DOMAIN_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedDomainState | null;
    if (!parsed || typeof parsed !== 'object') return null;
    return stripLegacyDemoRecords(parsed);
  } catch {
    return null;
  }
}

export function savePersistedDomainState(
  state: PersistedDomainState,
  storage?: Pick<Storage, 'setItem'> | null
): boolean {
  const store =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null;
  if (!store) return false;
  try {
    const payload = JSON.stringify({
      ...state,
      version: 2,
      updatedAtIso: new Date().toISOString(),
    });
    if (payload.length > 3_500_000) {
      return false;
    }
    store.setItem(DOMAIN_STATE_STORAGE_KEY, payload);
    return true;
  } catch {
    return false;
  }
}
