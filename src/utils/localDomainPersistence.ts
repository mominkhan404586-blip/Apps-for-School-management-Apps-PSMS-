import type {
  AdminAccount,
  NoticeItem,
  SchoolRecord,
  StudentRecord,
  TeacherRecord,
} from '../types';

export const DOMAIN_STATE_STORAGE_KEY = 'psms_persisted_domain_state_v1';

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
  adminAccounts?: AdminAccount[];
  notices?: NoticeItem[];
  guardianProfile?: GuardianProfileState;
  updatedAtIso?: string;
}

export function createDefaultGuardianProfile(
  fallbackPhone = '01712345678',
  fallbackEmail = 'guardian@psms.gov.bd'
): GuardianProfileState {
  return {
    displayName: 'মোঃ জামাল উদ্দিন (অভিভাবক)',
    email: fallbackEmail,
    phone: fallbackPhone,
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
  const seen = new Set<string>();
  const merged: T[] = [];

  overrideRecords.forEach((ov) => {
    if (!ov || typeof ov.id !== 'string' || !ov.id.trim()) return;
    const base = byId.get(ov.id);
    merged.push(base ? { ...base, ...ov } : ov);
    seen.add(ov.id);
  });

  // Preserve any newly added seed items from baseRecords only if override list looks partial?
  // Note: If user explicitly deleted a school/teacher/student, keep overrideRecords exact list when valid.
  return merged.length > 0 ? merged : baseRecords;
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
    return parsed;
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
      version: 1,
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
