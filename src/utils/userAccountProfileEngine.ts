import type {
  AdminAccount,
  ParentAccountRecord,
  SchoolRecord,
  StudentRecord,
  TeacherRecord,
  UserProfileRecord,
} from '../types';

export interface AvatarPresetOption {
  id: string;
  gender: 'Male' | 'Female';
  labelBn: string;
  labelEn: string;
  dataUrl: string;
}

function makeAvatarSvg(bg1: string, bg2: string, skin: string, hair: string, isFemale: boolean, accent: string): string {
  const hairPath = isFemale
    ? `<path d="M22 46 C22 18, 74 18, 74 46 L76 74 C68 68, 62 66, 48 66 C34 66, 28 68, 20 74 Z" fill="${hair}"/>`
    : `<path d="M26 40 C26 20, 70 20, 70 40 C66 29, 58 26, 48 26 C38 26, 30 29, 26 40 Z" fill="${hair}"/>`;
  const outfit = isFemale
    ? `<path d="M18 96 C20 72, 34 66, 48 66 C62 66, 76 72, 78 96 Z" fill="${accent}"/><path d="M36 67 L48 80 L60 67" fill="none" stroke="#ffffff" stroke-width="2.5"/>`
    : `<path d="M18 96 C20 72, 34 66, 48 66 C62 66, 76 72, 78 96 Z" fill="${accent}"/><path d="M40 67 L48 79 L56 67" fill="#ffffff"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="96" height="96" rx="48" fill="url(#g)"/>
    ${hairPath}
    <circle cx="48" cy="44" r="18" fill="${skin}"/>
    ${outfit}
    <circle cx="42" cy="43" r="2.1" fill="#1e293b"/>
    <circle cx="54" cy="43" r="2.1" fill="#1e293b"/>
    <path d="M42 51 Q48 56 54 51" fill="none" stroke="#9a3412" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const GENDER_AVATAR_PRESETS: AvatarPresetOption[] = [
  {
    id: 'male-formal',
    gender: 'Male',
    labelBn: 'পুরুষ — ফরমাল শিক্ষক/অভিভাবক',
    labelEn: 'Male — Formal Educator / Parent',
    dataUrl: makeAvatarSvg('#dbeafe', '#bfdbfe', '#f1c27d', '#1e293b', false, '#1d4ed8'),
  },
  {
    id: 'male-emerald',
    gender: 'Male',
    labelBn: 'পুরুষ — ক্লাসিক অ্যাডমিন',
    labelEn: 'Male — Classic Admin',
    dataUrl: makeAvatarSvg('#d1fae5', '#a7f3d0', '#e0ac69', '#0f172a', false, '#047857'),
  },
  {
    id: 'female-educator',
    gender: 'Female',
    labelBn: 'নারী — শিক্ষিকা/অভিভাবক',
    labelEn: 'Female — Educator / Mother',
    dataUrl: makeAvatarSvg('#fce7f3', '#fbcfe8', '#f1c27d', '#1e293b', true, '#be185d'),
  },
  {
    id: 'female-teal',
    gender: 'Female',
    labelBn: 'নারী — ক্লাসিক প্রোফাইল',
    labelEn: 'Female — Classic Profile',
    dataUrl: makeAvatarSvg('#ccfbf1', '#99f6e4', '#e0ac69', '#0f172a', true, '#0f766e'),
  },
];

export function getSuggestedAvatarsByGender(gender: 'Male' | 'Female'): AvatarPresetOption[] {
  return GENDER_AVATAR_PRESETS.filter((p) => p.gender === gender);
}

export interface UniquenessCheckInput {
  candidateUsername: string;
  candidateUniqueIdCode: string;
  currentEntityId: string;
  admins?: AdminAccount[];
  schools?: SchoolRecord[];
  teachers?: TeacherRecord[];
  parents?: ParentAccountRecord[];
  students?: StudentRecord[];
  extraProfiles?: UserProfileRecord[];
}

export interface UniquenessCheckResult {
  ok: boolean;
  usernameConflict: boolean;
  uniqueIdConflict: boolean;
  errorBn?: string;
  errorEn?: string;
}

export function checkUsernameAndUniqueIdUniqueness(
  input: UniquenessCheckInput
): UniquenessCheckResult {
  const uname = input.candidateUsername.trim().toLowerCase();
  const uidCode = input.candidateUniqueIdCode.trim().toLowerCase();
  const selfId = input.currentEntityId.trim().toLowerCase();

  if (!uname || uname.length < 3 || /\s/.test(uname)) {
    return {
      ok: false,
      usernameConflict: true,
      uniqueIdConflict: false,
      errorBn: 'ইউজারনেম কমপক্ষে ৩ অক্ষরের হতে হবে এবং ফাঁকা স্থান রাখা যাবে না।',
      errorEn: 'Username must be at least 3 characters with no spaces.',
    };
  }

  if (!uidCode || uidCode.length < 3 || /\s/.test(uidCode)) {
    return {
      ok: false,
      usernameConflict: false,
      uniqueIdConflict: true,
      errorBn: 'ইউনিক আইডি কোড কমপক্ষে ৩ অক্ষরের হতে হবে এবং ফাঁকা স্থান রাখা যাবে না।',
      errorEn: 'Unique ID Code must be at least 3 characters with no spaces.',
    };
  }

  const takenUsernames = new Set<string>();
  const takenUniqueIds = new Set<string>();

  const pushIfOther = (
    entityId: string | undefined,
    username?: string,
    uniqueIdCode?: string
  ) => {
    if (entityId && entityId.trim().toLowerCase() === selfId) return;
    if (username?.trim()) takenUsernames.add(username.trim().toLowerCase());
    if (uniqueIdCode?.trim()) takenUniqueIds.add(uniqueIdCode.trim().toLowerCase());
  };

  const pushUniqueIds = (entityId: string | undefined, ...ids: (string | undefined)[]) => {
    if (entityId && entityId.trim().toLowerCase() === selfId) return;
    ids.forEach((v) => {
      if (v?.trim()) takenUniqueIds.add(v.trim().toLowerCase());
    });
  };

  (input.admins ?? []).forEach((a) => {
    pushIfOther(a.id, a.username, a.uniqueIdCode ?? a.id);
    pushUniqueIds(a.id, a.id, a.uniqueIdCode);
  });
  (input.schools ?? []).forEach((s) => {
    pushIfOther(s.id, s.adminUsername, s.uniqueIdCode);
    pushUniqueIds(s.id, s.id, s.code, s.schoolPublicId, s.uniqueIdCode);
  });
  (input.teachers ?? []).forEach((t) => {
    pushIfOther(t.id, t.username ?? t.teacherCode, t.uniqueIdCode ?? t.teacherCode);
    pushUniqueIds(t.id, t.id, t.teacherCode, t.uniqueIdCode);
  });
  (input.parents ?? []).forEach((p) => {
    pushIfOther(p.id, p.username, p.uniqueIdCode);
    pushUniqueIds(p.id, p.id, p.uniqueIdCode);
  });
  (input.students ?? []).forEach((st) => {
    pushIfOther(st.id, st.username, st.uniqueIdCode ?? st.permanentId);
    pushUniqueIds(st.id, st.id, st.permanentId, st.uniqueIdCode);
  });
  (input.extraProfiles ?? []).forEach((pr) =>
    pushIfOther(pr.entityId, pr.username, pr.uniqueIdCode)
  );

  const usernameConflict = takenUsernames.has(uname);
  const uniqueIdConflict = takenUniqueIds.has(uidCode);

  if (usernameConflict && uniqueIdConflict) {
    return {
      ok: false,
      usernameConflict: true,
      uniqueIdConflict: true,
      errorBn: 'এই ইউজারনেম এবং ইউনিক আইডি কোড উভয়ই সিস্টেমে ইতোমধ্যে ব্যবহৃত হয়েছে।',
      errorEn: 'Both this Username and Unique ID Code are already taken in the system.',
    };
  }
  if (usernameConflict) {
    return {
      ok: false,
      usernameConflict: true,
      uniqueIdConflict: false,
      errorBn: 'এই ইউজারনেমটি ইতোমধ্যে অন্য অ্যাকাউন্টে ব্যবহৃত হয়েছে। অনুগ্রহ করে ভিন্ন ইউজারনেম দিন।',
      errorEn: 'This Username is already in use by another account. Please choose another.',
    };
  }
  if (uniqueIdConflict) {
    return {
      ok: false,
      usernameConflict: false,
      uniqueIdConflict: true,
      errorBn: 'এই ইউনিক আইডি কোডটি ইতোমধ্যে ব্যবহৃত হয়েছে। অনুগ্রহ করে ভিন্ন কোড দিন।',
      errorEn: 'This Unique ID Code is already in use. Please choose another.',
    };
  }

  return { ok: true, usernameConflict: false, uniqueIdConflict: false };
}

export interface ProfileUpdatePatch {
  displayName?: string;
  username?: string;
  uniqueIdCode?: string;
  gender?: 'Male' | 'Female';
  email?: string;
  mobile?: string;
  photoUrl?: string;
  avatarPresetId?: string;
}

export interface ProfileUpdateOutcome {
  ok: boolean;
  profile?: UserProfileRecord;
  requiresReverification: boolean;
  errorBn?: string;
  errorEn?: string;
}

export function applyUserProfileUpdate(
  current: UserProfileRecord,
  patch: ProfileUpdatePatch,
  registry: Omit<UniquenessCheckInput, 'candidateUsername' | 'candidateUniqueIdCode' | 'currentEntityId'>
): ProfileUpdateOutcome {
  const nextUsername = (patch.username ?? current.username).trim();
  const nextUniqueId = (patch.uniqueIdCode ?? current.uniqueIdCode).trim();
  const uniq = checkUsernameAndUniqueIdUniqueness({
    ...registry,
    candidateUsername: nextUsername,
    candidateUniqueIdCode: nextUniqueId,
    currentEntityId: current.entityId,
  });

  if (!uniq.ok) {
    return {
      ok: false,
      requiresReverification: false,
      errorBn: uniq.errorBn,
      errorEn: uniq.errorEn,
    };
  }

  const nextName = (patch.displayName ?? current.displayName).trim();
  const nextEmail = (patch.email ?? current.email).trim();
  const nextMobile = (patch.mobile ?? current.mobile).trim();
  const nextGender = patch.gender ?? current.gender;

  const criticalChanged =
    nextName !== current.displayName ||
    nextUsername.toLowerCase() !== current.username.toLowerCase() ||
    nextUniqueId.toLowerCase() !== current.uniqueIdCode.toLowerCase() ||
    nextEmail.toLowerCase() !== current.email.toLowerCase() ||
    nextMobile !== current.mobile;

  const verificationStatus = criticalChanged
    ? 'reverification_required'
    : current.verificationStatus;

  const nowIso = new Date().toISOString();
  return {
    ok: true,
    requiresReverification: criticalChanged,
    profile: {
      ...current,
      displayName: nextName,
      username: nextUsername,
      uniqueIdCode: nextUniqueId,
      gender: nextGender,
      email: nextEmail,
      mobile: nextMobile,
      photoUrl: patch.photoUrl !== undefined ? patch.photoUrl : current.photoUrl,
      avatarPresetId:
        patch.avatarPresetId !== undefined ? patch.avatarPresetId : current.avatarPresetId,
      verificationStatus,
      reverificationReason: criticalChanged
        ? 'প্রোফাইলের গুরুত্বপূর্ণ তথ্য পরিবর্তিত হয়েছে — পুনরায় যাচাই প্রয়োজন'
        : current.reverificationReason,
      lastUpdatedAt: nowIso,
    },
  };
}

export function verifyUserProfile(profile: UserProfileRecord): UserProfileRecord {
  const nowIso = new Date().toISOString();
  return {
    ...profile,
    verificationStatus: 'verified',
    verifiedAt: nowIso,
    lastUpdatedAt: nowIso,
    reverificationReason: undefined,
  };
}
