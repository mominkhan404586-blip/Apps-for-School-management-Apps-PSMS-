import type { AuditLogEntry, Language, NotificationPreferences, Role } from '../types';

export type SettingsCategoryId =
  | 'account_profile'
  | 'security_privacy'
  | 'notifications'
  | 'appearance_language'
  | 'system_feature_control'
  | 'school_settings'
  | 'users_permissions'
  | 'data_backup'
  | 'templates_documents'
  | 'regional_settings'
  | 'subscription_billing'
  | 'help_support'
  | 'deployment_links'
  | 'about';

export interface SettingsCategoryMeta {
  id: SettingsCategoryId;
  order: number;
  labelBn: string;
  labelEn: string;
  descBn: string;
  descEn: string;
  iconKey: string;
  roles: Role[];
}

export const SETTINGS_CATEGORIES: SettingsCategoryMeta[] = [
  {
    id: 'account_profile',
    order: 1,
    labelBn: 'অ্যাকাউন্ট ও প্রোফাইল',
    labelEn: 'Account & Profile',
    descBn: 'ব্যক্তিগত প্রোফাইল, ছবি, পাসওয়ার্ড, User ID ও অ্যাকাউন্ট পুনরুদ্ধার',
    descEn: 'Profile, photo crop, password reset, User ID & recovery',
    iconKey: 'user',
    roles: ['central_admin', 'school_admin', 'teacher', 'student', 'guardian'],
  },
  {
    id: 'security_privacy',
    order: 2,
    labelBn: 'নিরাপত্তা ও গোপনীয়তা',
    labelEn: 'Security & Privacy',
    descBn: '2FA, OTP যাচাই, সক্রিয় ডিভাইস, লগইন ইতিহাস ও অটো-লগআউট',
    descEn: '2FA, OTP verification, active devices, login history & auto-logout',
    iconKey: 'shield',
    roles: ['central_admin', 'school_admin', 'teacher', 'student', 'guardian'],
  },
  {
    id: 'notifications',
    order: 3,
    labelBn: 'নোটিফিকেশন সেটিংস',
    labelEn: 'Notifications',
    descBn: 'Push, SMS, Email, নোটিশ, হাজিরা, পরীক্ষা ও ফি সতর্কতা নিয়ন্ত্রণ',
    descEn: 'Control Push, SMS, Email, notice, attendance, exam & fee alerts',
    iconKey: 'bell',
    roles: ['central_admin', 'school_admin', 'teacher', 'student', 'guardian'],
  },
  {
    id: 'appearance_language',
    order: 4,
    labelBn: 'অ্যাপিয়ারেন্স ও ভাষা',
    labelEn: 'Appearance & Language',
    descBn: 'থিম (Light/Dark/System), বাংলা/English, ফন্ট সাইজ ও ড্যাশবোর্ড লেআউট',
    descEn: 'Theme mode, language, font size, date/time format & layout density',
    iconKey: 'palette',
    roles: ['central_admin', 'school_admin', 'teacher', 'student', 'guardian'],
  },
  {
    id: 'system_feature_control',
    order: 5,
    labelBn: 'সিস্টেম ও ফিচার কন্ট্রোল',
    labelEn: 'System & Feature Control',
    descBn: 'নিবন্ধন, একাডেমিক, রুটিন, উপস্থিতি, পরীক্ষা, ফি ও ডকুমেন্ট ON/OFF',
    descEn: 'Non-destructive ON/OFF controls for registrations & school modules',
    iconKey: 'sliders',
    roles: ['central_admin', 'school_admin'],
  },
  {
    id: 'school_settings',
    order: 6,
    labelBn: 'স্কুল সেটিংস',
    labelEn: 'School Settings',
    descBn: 'স্কুলের সময়সূচি, কর্মদিবস, ছুটি, গ্রেডিং, হাজিরা নিয়ম ও কক্ষ ব্যবস্থাপনা',
    descEn: 'School hours, working days, holidays, grading, attendance rules & rooms',
    iconKey: 'building',
    roles: ['central_admin', 'school_admin'],
  },
  {
    id: 'users_permissions',
    order: 7,
    labelBn: 'ব্যবহারকারী ও পারমিশন',
    labelEn: 'Users & Permissions',
    descBn: 'শিক্ষক/শিক্ষার্থী/অভিভাবক রোল অ্যাক্সেস, ব্লক ও সক্রিয়/নিষ্ক্রিয় নিয়ন্ত্রণ',
    descEn: 'Role permissions, module access & account status management',
    iconKey: 'key',
    roles: ['central_admin', 'school_admin'],
  },
  {
    id: 'data_backup',
    order: 8,
    labelBn: 'ডাটা ও ব্যাকআপ',
    labelEn: 'Data & Backup',
    descBn: 'সম্পূর্ণ ব্যাকআপ, রিস্টোর, Export/Import, আর্কাইভ ও ট্র্যাশ রিকভারি',
    descEn: 'Backup download, restore, export/import, archive & deleted data recovery',
    iconKey: 'database',
    roles: ['central_admin', 'school_admin'],
  },
  {
    id: 'templates_documents',
    order: 9,
    labelBn: 'টেমপ্লেট ও ডকুমেন্টস',
    labelEn: 'Templates & Documents',
    descBn: 'নোটিশ, সার্টিফিকেট, আইডি কার্ড, রেজাল্ট, রসিদ ও অ্যাডমিট কার্ড টেমপ্লেট',
    descEn: 'Configure official templates for notices, certificates, IDs & receipts',
    iconKey: 'file',
    roles: ['central_admin', 'school_admin'],
  },
  {
    id: 'regional_settings',
    order: 10,
    labelBn: 'আঞ্চলিক সেটিংস',
    labelEn: 'Regional Settings',
    descBn: 'দেশ (Bangladesh), Time Zone (Asia/Dhaka), মুদ্রা (BDT ৳) ও সংখ্যা বিন্যাস',
    descEn: 'Country, timezone, BDT currency, date, time & numeral format',
    iconKey: 'globe',
    roles: ['central_admin', 'school_admin', 'teacher', 'student', 'guardian'],
  },
  {
    id: 'subscription_billing',
    order: 11,
    labelBn: 'সাবস্ক্রিপশন ও বিলিং',
    labelEn: 'Subscription & Billing',
    descBn: 'বর্তমান প্ল্যান, নবায়ন তারিখ, পেমেন্ট ইতিহাস ও প্ল্যান আপগ্রেড',
    descEn: 'Current plan, renewal status, billing history & plan upgrades',
    iconKey: 'credit_card',
    roles: ['central_admin'],
  },
  {
    id: 'help_support',
    order: 12,
    labelBn: 'সহায়তা ও সাপোর্ট',
    labelEn: 'Help & Support',
    descBn: 'সাহায্য কেন্দ্র, ইউজার গাইড, FAQ, সমস্যা রিপোর্ট ও ফিচার অনুরোধ',
    descEn: 'Help center, guide, FAQ, support ticket, bug report & feature request',
    iconKey: 'help',
    roles: ['central_admin', 'school_admin', 'teacher', 'student', 'guardian'],
  },
  {
    id: 'deployment_links',
    order: 13,
    labelBn: 'Utility ও App Tools (APK / Share)',
    labelEn: 'Utility & App Tools',
    descBn: 'Android APK ডাউনলোড, বন্ধুদের শেয়ার, Live Web App এবং GitHub লিংক',
    descEn: 'Android APK download, Share App, Live Web URL & GitHub links',
    iconKey: 'rocket',
    roles: ['central_admin', 'school_admin', 'teacher', 'student', 'guardian'],
  },
  {
    id: 'about',
    order: 14,
    labelBn: 'সিস্টেম সম্পর্কে (About)',
    labelEn: 'About & App Install',
    descBn: 'অ্যাপ সংস্করণ, Android APK + Web প্ল্যাটফর্ম, নীতিমালা ও ডেভেলপার তথ্য',
    descEn: 'App version, unified Android + Web status, legal policies & info',
    iconKey: 'info',
    roles: ['central_admin', 'school_admin', 'teacher', 'student', 'guardian'],
  },
];

export type FeatureToggleKey =
  // 1. System Control
  | 'systemActive'
  | 'limitedMode'
  | 'maintenanceMode'
  | 'newUserRegistration'
  | 'onlineRegistration'
  | 'onlineAdmission'
  | 'schoolJoining'
  // 2. Registration Control
  | 'studentRegistration'
  | 'teacherRegistration'
  | 'staffRegistration'
  | 'guardianRegistration'
  | 'schoolRegistration'
  | 'admissionRequest'
  | 'joinSchoolByCode'
  // 3. Academic Feature Control
  | 'academicManagement'
  | 'classManagement'
  | 'subjectManagement'
  | 'lesson'
  | 'lessonPlan'
  | 'curriculum'
  | 'syllabus'
  | 'assignment'
  | 'activity'
  // 4. Routine Control
  | 'classRoutine'
  | 'examRoutine'
  | 'teacherRoutine'
  | 'studentRoutine'
  // 5. Attendance Control
  | 'studentAttendance'
  | 'teacherAttendance'
  | 'staffAttendance'
  | 'qrScannerAttendance'
  | 'manualAttendance'
  | 'lateAttendance'
  | 'leaveRequest'
  // 6. Exam & Result Control
  | 'examManagement'
  | 'examRegistration'
  | 'examSchedule'
  | 'marksEntry'
  | 'resultProcessing'
  | 'resultPublish'
  | 'reportCard'
  | 'resultDownload'
  // 7. Fee & Payment Control
  | 'feeManagement'
  | 'onlinePayment'
  | 'feeCollection'
  | 'paymentReceipt'
  | 'dueManagement'
  | 'paymentNotification'
  // 8. Communication Control
  | 'notice'
  | 'announcement'
  | 'pushNotification'
  | 'sms'
  | 'email'
  | 'messaging'
  | 'adminToTeacher'
  | 'adminToStudent'
  | 'adminToGuardian'
  | 'teacherToStudent'
  | 'emergencyNotification'
  // 9. Document Control
  | 'idCard'
  | 'certificate'
  | 'admitCard'
  | 'report'
  | 'resultSheet'
  | 'receipt'
  | 'documentTemplates';

export type FeatureToggleScope = 'central_only' | 'school_and_central';

export interface FeatureToggleDefinition {
  key: FeatureToggleKey;
  group:
    | 'system'
    | 'registration'
    | 'academic'
    | 'routine'
    | 'attendance'
    | 'exam_result'
    | 'fee_payment'
    | 'communication'
    | 'document';
  labelBn: string;
  labelEn: string;
  scope: FeatureToggleScope;
  critical?: boolean;
  nonDestructiveNoteBn: string;
  nonDestructiveNoteEn: string;
}

export const FEATURE_TOGGLE_DEFINITIONS: FeatureToggleDefinition[] = [
  // System Control
  {
    key: 'systemActive',
    group: 'system',
    labelBn: 'মূল সিস্টেম সক্রিয় (System Active)',
    labelEn: 'System Active',
    scope: 'central_only',
    critical: true,
    nonDestructiveNoteBn: 'বন্ধ করলে শুধুমাত্র নতুন কার্যক্রম সাময়িক থামবে; কোন ডেটা মুছে যাবে না।',
    nonDestructiveNoteEn: 'Pauses public operations safely without deleting any saved data.',
  },
  {
    key: 'limitedMode',
    group: 'system',
    labelBn: 'সীমিত মোড (Limited Mode)',
    labelEn: 'Limited Mode',
    scope: 'central_only',
    critical: true,
    nonDestructiveNoteBn: 'পুরনো ব্যবহারকারী শুধু দেখতে পারবেন, নতুন এন্ট্রি সাময়িকভাবে সীমিত হবে।',
    nonDestructiveNoteEn: 'Existing users keep read access while new mutations pause.',
  },
  {
    key: 'maintenanceMode',
    group: 'system',
    labelBn: 'রক্ষণাবেক্ষণ মোড (Maintenance Mode)',
    labelEn: 'Maintenance Mode',
    scope: 'central_only',
    critical: true,
    nonDestructiveNoteBn: 'সাধারণ ইউজারকে রক্ষণাবেক্ষণ বার্তা দেখাবে; এডমিন অ্যাক্সেস চালু থাকবে।',
    nonDestructiveNoteEn: 'Shows maintenance banner to non-admins while keeping Admin access intact.',
  },
  {
    key: 'newUserRegistration',
    group: 'system',
    labelBn: 'নতুন ব্যবহারকারী নিবন্ধন (New User Registration)',
    labelEn: 'New User Registration',
    scope: 'central_only',
    critical: true,
    nonDestructiveNoteBn: 'বন্ধ করলে নতুন রেজিস্ট্রেশন বন্ধ হবে, কিন্তু পুরনো সকল অ্যাকাউন্ট স্বাভাবিকভাবে চলবে।',
    nonDestructiveNoteEn: 'Blocks new sign-ups only; existing users continue logging in normally.',
  },
  {
    key: 'onlineRegistration',
    group: 'system',
    labelBn: 'অনলাইন নিবন্ধন (Online Registration)',
    labelEn: 'Online Registration',
    scope: 'central_only',
    nonDestructiveNoteBn: 'পাবলিক অনলাইন ফর্ম বন্ধ রাখে; অফলাইন/অ্যাডমিন অনুমোদন চালু থাকে।',
    nonDestructiveNoteEn: 'Toggles public self-registration portal only.',
  },
  {
    key: 'onlineAdmission',
    group: 'system',
    labelBn: 'অনলাইন ভর্তি (Online Admission)',
    labelEn: 'Online Admission',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'নতুন ভর্তি আবেদন ফর্ম নিয়ন্ত্রণ করে; বিদ্যমান শিক্ষার্থী প্রোফাইল অপরিবর্তিত থাকে।',
    nonDestructiveNoteEn: 'Controls new online admissions; enrolled students remain active.',
  },
  {
    key: 'schoolJoining',
    group: 'system',
    labelBn: 'স্কুল যোগদান (School Joining)',
    labelEn: 'School Joining',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'নতুন বিদ্যালয় যোগদানের আবেদন থামায়; ইতোমধ্যে যুক্ত শিক্ষকরা কাজ চালিয়ে যাবেন।',
    nonDestructiveNoteEn: 'Blocks new join requests without affecting active school members.',
  },

  // Registration Control
  {
    key: 'studentRegistration',
    group: 'registration',
    labelBn: 'শিক্ষার্থী নিবন্ধন (Student Registration)',
    labelEn: 'Student Registration',
    scope: 'school_and_central',
    critical: true,
    nonDestructiveNoteBn: 'বন্ধ করলে শুধুমাত্র নতুন Student Registration হবে না; পুরনো শিক্ষার্থীর Login, হাজিরা, রুটিন ও রেজাল্ট সম্পূর্ণ সচল থাকবে।',
    nonDestructiveNoteEn: 'Blocks NEW student creation only; existing students keep full login, attendance, routine & results.',
  },
  {
    key: 'teacherRegistration',
    group: 'registration',
    labelBn: 'শিক্ষক নিবন্ধন (Teacher Registration)',
    labelEn: 'Teacher Registration',
    scope: 'central_only',
    critical: true,
    nonDestructiveNoteBn: 'বন্ধ করলে নতুন Teacher ID আবেদন বন্ধ হবে; বর্তমান সকল শিক্ষক ক্লাস ও নম্বর দিতে পারবেন।',
    nonDestructiveNoteEn: 'Blocks new Teacher ID signups; active teachers retain all dashboard tools.',
  },
  {
    key: 'staffRegistration',
    group: 'registration',
    labelBn: 'স্টাফ নিবন্ধন (Staff Registration)',
    labelEn: 'Staff Registration',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'নতুন স্টাফ অন্তর্ভুক্তি নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls onboarding new staff accounts.',
  },
  {
    key: 'guardianRegistration',
    group: 'registration',
    labelBn: 'অভিভাবক নিবন্ধন (Guardian Registration)',
    labelEn: 'Guardian Registration',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'নতুন অভিভাবক সংযোগ নিয়ন্ত্রণ করে; যুক্ত অভিভাবকদের ড্যাশবোর্ড সচল থাকে।',
    nonDestructiveNoteEn: 'Controls new guardian account links; linked guardians remain active.',
  },
  {
    key: 'schoolRegistration',
    group: 'registration',
    labelBn: 'নতুন বিদ্যালয় নিবন্ধন (School Registration)',
    labelEn: 'School Registration',
    scope: 'central_only',
    critical: true,
    nonDestructiveNoteBn: 'নতুন বিদ্যালয় আবেদন ফর্ম বন্ধ রাখে; নিবন্ধিত বিদ্যালয়সমূহ স্বাভাবিকভাবে পরিচালিত হয়।',
    nonDestructiveNoteEn: 'Blocks new school onboarding applications; existing schools remain active.',
  },
  {
    key: 'admissionRequest',
    group: 'registration',
    labelBn: 'ভর্তি আবেদন (Admission Request)',
    labelEn: 'Admission Request',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'শিক্ষার্থী ভর্তির নতুন আবেদন গ্রহণ নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Toggles incoming student admission requests.',
  },
  {
    key: 'joinSchoolByCode',
    group: 'registration',
    labelBn: 'স্কুল কোড দিয়ে যোগদান (Join School by Code)',
    labelEn: 'Join School by Code',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'ইউনিক স্কুল কোডের মাধ্যমে তাৎক্ষণিক যোগদান আবেদন নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls joining a school via unique school code.',
  },

  // Academic Feature Control
  {
    key: 'academicManagement',
    group: 'academic',
    labelBn: 'একাডেমিক ম্যানেজমেন্ট (Academic Management)',
    labelEn: 'Academic Management',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'একাডেমিক কাঠামোর নতুন পরিবর্তন সাময়িকভাবে স্থগিত রাখে।',
    nonDestructiveNoteEn: 'Controls academic management module operations.',
  },
  {
    key: 'classManagement',
    group: 'academic',
    labelBn: 'ক্লাস ও সেকশন ব্যবস্থাপনা (Class Management)',
    labelEn: 'Class Management',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'নতুন শ্রেণি/শাখা যোগ করা নিয়ন্ত্রণ করে; পুরনো ক্লাস ডেটা অক্ষত থাকে।',
    nonDestructiveNoteEn: 'Controls adding/editing classes without removing existing classes.',
  },
  {
    key: 'subjectManagement',
    group: 'academic',
    labelBn: 'বিষয় ব্যবস্থাপনা (Subject Management)',
    labelEn: 'Subject Management',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'বিষয় কনফিগারেশন নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls subject configuration.',
  },
  {
    key: 'lesson',
    group: 'academic',
    labelBn: 'আজকের পড়া / পাঠ (Lesson)',
    labelEn: 'Lesson',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'নতুন পাঠ প্রকাশ নিয়ন্ত্রণ করে; আগের পাঠ সংরক্ষিত থাকে।',
    nonDestructiveNoteEn: 'Controls new lesson publishing.',
  },
  {
    key: 'lessonPlan',
    group: 'academic',
    labelBn: 'পাঠ পরিকল্পনা (Lesson Plan)',
    labelEn: 'Lesson Plan',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'শিক্ষকদের নতুন লেসন প্ল্যান তৈরি নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls teacher lesson plan creation.',
  },
  {
    key: 'curriculum',
    group: 'academic',
    labelBn: 'কারিকুলাম (Curriculum)',
    labelEn: 'Curriculum',
    scope: 'central_only',
    nonDestructiveNoteBn: 'কেন্দ্রীয় কারিকুলাম আপডেট নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls curriculum authoring.',
  },
  {
    key: 'syllabus',
    group: 'academic',
    labelBn: 'সিলেবাস (Syllabus)',
    labelEn: 'Syllabus',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'সিলেবাস সম্পাদনা ও প্রকাশ নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls syllabus edits.',
  },
  {
    key: 'assignment',
    group: 'academic',
    labelBn: 'অ্যাসাইনমেন্ট ও বাড়ির কাজ (Assignment)',
    labelEn: 'Assignment',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'নতুন অ্যাসাইনমেন্ট তৈরি নিয়ন্ত্রণ করে; পূর্বের অ্যাসাইনমেন্ট দেখা যায়।',
    nonDestructiveNoteEn: 'Controls creating new assignments while keeping history visible.',
  },
  {
    key: 'activity',
    group: 'academic',
    labelBn: 'সহ-শিক্ষা কার্যক্রম (Activity)',
    labelEn: 'Activity',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'সহ-শিক্ষামূলক ইভেন্ট ও প্রজেক্ট কার্যক্রম নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls co-curricular academic activities.',
  },

  // Routine Control
  {
    key: 'classRoutine',
    group: 'routine',
    labelBn: 'ক্লাস রুটিন (Class Routine)',
    labelEn: 'Class Routine',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'ক্লাস রুটিন প্রকাশ/সম্পাদনা নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls class routine scheduling.',
  },
  {
    key: 'examRoutine',
    group: 'routine',
    labelBn: 'পরীক্ষার রুটিন (Exam Routine)',
    labelEn: 'Exam Routine',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'পরীক্ষার রুটিন প্রকাশ ও সময়সূচি নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls exam routine management.',
  },
  {
    key: 'teacherRoutine',
    group: 'routine',
    labelBn: 'শিক্ষক রুটিন (Teacher Routine)',
    labelEn: 'Teacher Routine',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'শিক্ষকের ব্যক্তিগত রুটিন দৃশ্যমানতা নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls teacher routine view.',
  },
  {
    key: 'studentRoutine',
    group: 'routine',
    labelBn: 'শিক্ষার্থী রুটিন (Student Routine)',
    labelEn: 'Student Routine',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'শিক্ষার্থীর ক্লাস রুটিন দৃশ্যমানতা নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls student routine view.',
  },

  // Attendance Control
  {
    key: 'studentAttendance',
    group: 'attendance',
    labelBn: 'শিক্ষার্থী উপস্থিতি (Student Attendance)',
    labelEn: 'Student Attendance',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'দৈনিক শিক্ষার্থী হাজিরা গ্রহণ নিয়ন্ত্রণ করে; পূর্বের হাজিরা অক্ষত থাকে।',
    nonDestructiveNoteEn: 'Controls daily student attendance capture.',
  },
  {
    key: 'teacherAttendance',
    group: 'attendance',
    labelBn: 'শিক্ষক উপস্থিতি (Teacher Attendance)',
    labelEn: 'Teacher Attendance',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'শিক্ষকের চেক-ইন/হাজিরা লগ নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls teacher check-in attendance.',
  },
  {
    key: 'staffAttendance',
    group: 'attendance',
    labelBn: 'স্টাফ উপস্থিতি (Staff Attendance)',
    labelEn: 'Staff Attendance',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'স্টাফ হাজিরা লগ নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls staff attendance.',
  },
  {
    key: 'qrScannerAttendance',
    group: 'attendance',
    labelBn: 'QR স্ক্যানার উপস্থিতি (QR Scanner Attendance)',
    labelEn: 'QR Scanner Attendance',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'অটো ক্যামেরা/কিয়স্ক QR হাজিরা স্ক্যান চালু বা বন্ধ করে।',
    nonDestructiveNoteEn: 'Enables or disables QR camera & kiosk scan attendance.',
  },
  {
    key: 'manualAttendance',
    group: 'attendance',
    labelBn: 'ম্যানুয়াল উপস্থিতি (Manual Attendance)',
    labelEn: 'Manual Attendance',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'শিক্ষক কর্তৃক ম্যানুয়াল হাজিরা সংশোধন নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls manual attendance marking by teachers.',
  },
  {
    key: 'lateAttendance',
    group: 'attendance',
    labelBn: 'বিলম্ব উপস্থিতি (Late Attendance)',
    labelEn: 'Late Attendance',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'বিলম্বে উপস্থিতি চিহ্নিতকরণ ও নিয়ম সক্রিয় রাখে।',
    nonDestructiveNoteEn: 'Controls late attendance tracking.',
  },
  {
    key: 'leaveRequest',
    group: 'attendance',
    labelBn: 'ছুটির আবেদন (Leave Request)',
    labelEn: 'Leave Request',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'শিক্ষার্থী ও শিক্ষকের ছুটির আবেদন গ্রহণ নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls leave request submissions.',
  },

  // Exam & Result Control
  {
    key: 'examManagement',
    group: 'exam_result',
    labelBn: 'পরীক্ষা ব্যবস্থাপনা (Exam Management)',
    labelEn: 'Exam Management',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'পরীক্ষা তৈরি ও পরিচালনা নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls exam creation and scheduling.',
  },
  {
    key: 'examRegistration',
    group: 'exam_result',
    labelBn: 'পরীক্ষা নিবন্ধন (Exam Registration)',
    labelEn: 'Exam Registration',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'শিক্ষার্থী পরীক্ষায় নিবন্ধন নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls exam registration.',
  },
  {
    key: 'examSchedule',
    group: 'exam_result',
    labelBn: 'পরীক্ষার সময়সূচি (Exam Schedule)',
    labelEn: 'Exam Schedule',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'পরীক্ষার সময়সূচি সম্পাদনা নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls exam schedules.',
  },
  {
    key: 'marksEntry',
    group: 'exam_result',
    labelBn: 'নম্বর এন্ট্রি (Marks Entry)',
    labelEn: 'Marks Entry',
    scope: 'school_and_central',
    critical: true,
    nonDestructiveNoteBn: 'বন্ধ করলে নতুন নম্বর এন্ট্রি সাময়িকভাবে লক হবে; পূর্বের সংরক্ষিত নম্বর অক্ষত থাকবে।',
    nonDestructiveNoteEn: 'Locks new marks entry while preserving all saved marks.',
  },
  {
    key: 'resultProcessing',
    group: 'exam_result',
    labelBn: 'ফলাফল প্রক্রিয়াকরণ (Result Processing)',
    labelEn: 'Result Processing',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'নম্বর থেকে গ্রেড ও মেধাতালিকা গণনা নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls GPA/merit calculation.',
  },
  {
    key: 'resultPublish',
    group: 'exam_result',
    labelBn: 'ফলাফল প্রকাশ (Result Publish)',
    labelEn: 'Result Publish',
    scope: 'central_only',
    critical: true,
    nonDestructiveNoteBn: 'কেন্দ্রীয় বা স্কুল পর্যায়ের চূড়ান্ত রেজাল্ট পাবলিশ নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls final result publication.',
  },
  {
    key: 'reportCard',
    group: 'exam_result',
    labelBn: 'রিপোর্ট কার্ড / মার্কশিট (Report Card)',
    labelEn: 'Report Card',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'প্রোগ্রেস রিপোর্ট ও মার্কশিট দৃশ্যমানতা নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls student report cards.',
  },
  {
    key: 'resultDownload',
    group: 'exam_result',
    labelBn: 'ফলাফল ডাউনলোড (Result Download)',
    labelEn: 'Result Download',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'শিক্ষার্থী ও অভিভাবকদের মার্কশিট প্রিন্ট/ডাউনলোড নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls downloading/printing published results.',
  },

  // Fee & Payment Control
  {
    key: 'feeManagement',
    group: 'fee_payment',
    labelBn: 'ফি ব্যবস্থাপনা (Fee Management)',
    labelEn: 'Fee Management',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'ফি খাত ও মাসিক বিলিং নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls fee structure management.',
  },
  {
    key: 'onlinePayment',
    group: 'fee_payment',
    labelBn: 'অনলাইন পেমেন্ট (Online Payment)',
    labelEn: 'Online Payment',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'bKash/Nagad/ব্যাংক অনলাইন পেমেন্ট অপশন নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls online fee gateway options.',
  },
  {
    key: 'feeCollection',
    group: 'fee_payment',
    labelBn: 'ফি আদায় (Fee Collection)',
    labelEn: 'Fee Collection',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'স্কুল কাউন্টার ফি আদায় নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls counter fee collection.',
  },
  {
    key: 'paymentReceipt',
    group: 'fee_payment',
    labelBn: 'পেমেন্ট রসিদ (Payment Receipt)',
    labelEn: 'Payment Receipt',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'ডিজিটাল রসিদ প্রিন্ট/ইস্যু নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls fee payment receipts.',
  },
  {
    key: 'dueManagement',
    group: 'fee_payment',
    labelBn: 'বকেয়া ব্যবস্থাপনা (Due Management)',
    labelEn: 'Due Management',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'বকেয়া হিসাব ও অনুস্মারক নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls due fee tracking.',
  },
  {
    key: 'paymentNotification',
    group: 'fee_payment',
    labelBn: 'পেমেন্ট নোটিফিকেশন (Payment Notification)',
    labelEn: 'Payment Notification',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'পেমেন্ট নিশ্চিতকরণ ও বকেয়া বিজ্ঞপ্তি নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls payment alert notifications.',
  },

  // Communication Control
  {
    key: 'notice',
    group: 'communication',
    labelBn: 'নোটিশ সিস্টেম (Notice)',
    labelEn: 'Notice System',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'নতুন নোটিশ প্রকাশ নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls new notice publishing.',
  },
  {
    key: 'announcement',
    group: 'communication',
    labelBn: 'ঘোষণা (Announcement)',
    labelEn: 'Announcement',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'জরুরি ও সাধারণ ঘোষণা প্রচার নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls public announcements.',
  },
  {
    key: 'pushNotification',
    group: 'communication',
    labelBn: 'পুশ নোটিফিকেশন (Push Notification)',
    labelEn: 'Push Notification',
    scope: 'central_only',
    nonDestructiveNoteBn: 'মোবাইল অ্যাপ ও ওয়েব পুশ নোটিফিকেশন সিস্টেম নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls browser & mobile push notifications.',
  },
  {
    key: 'sms',
    group: 'communication',
    labelBn: 'SMS গেটওয়ে (SMS)',
    labelEn: 'SMS Alerts',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'অনুপস্থিতি ও জরুরি SMS পাঠানো নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls SMS delivery alerts.',
  },
  {
    key: 'email',
    group: 'communication',
    labelBn: 'ইমেইল বিজ্ঞপ্তি (Email)',
    labelEn: 'Email Alerts',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'অফিশিয়াল ইমেইল নোটিফিকেশন নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls email notifications.',
  },
  {
    key: 'messaging',
    group: 'communication',
    labelBn: 'মেসেজিং (Messaging)',
    labelEn: 'Messaging',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'অভ্যন্তরীণ বার্তা আদান-প্রদান নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls internal messaging.',
  },
  {
    key: 'adminToTeacher',
    group: 'communication',
    labelBn: 'অ্যাডমিন → শিক্ষক বার্তা',
    labelEn: 'Admin to Teacher',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'অ্যাডমিন ও শিক্ষকদের মধ্যে সরাসরি বার্তা নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls Admin-to-Teacher messaging.',
  },
  {
    key: 'adminToStudent',
    group: 'communication',
    labelBn: 'অ্যাডমিন → শিক্ষার্থী বার্তা',
    labelEn: 'Admin to Student',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'অ্যাডমিন থেকে শিক্ষার্থীর বার্তা নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls Admin-to-Student messaging.',
  },
  {
    key: 'adminToGuardian',
    group: 'communication',
    labelBn: 'অ্যাডমিন → অভিভাবক বার্তা',
    labelEn: 'Admin to Guardian',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'অ্যাডমিন থেকে অভিভাবকের বার্তা নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls Admin-to-Guardian messaging.',
  },
  {
    key: 'teacherToStudent',
    group: 'communication',
    labelBn: 'শিক্ষক → শিক্ষার্থী/অভিভাবক বার্তা',
    labelEn: 'Teacher to Student',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'শিক্ষক ও শিক্ষার্থী/অভিভাবক যোগাযোগ নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls Teacher-to-Student messaging.',
  },
  {
    key: 'emergencyNotification',
    group: 'communication',
    labelBn: 'জরুরি নোটিফিকেশন (Emergency Notification)',
    labelEn: 'Emergency Notification',
    scope: 'school_and_central',
    critical: true,
    nonDestructiveNoteBn: 'জরুরি পিন করা সতর্কবার্তা প্রকাশ নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls high-priority emergency broadcasts.',
  },

  // Document Control
  {
    key: 'idCard',
    group: 'document',
    labelBn: 'ডিজিটাল আইডি কার্ড (ID Card)',
    labelEn: 'ID Card',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'শিক্ষার্থী ও শিক্ষকের QR আইডি কার্ড তৈরি নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls QR ID card generation.',
  },
  {
    key: 'certificate',
    group: 'document',
    labelBn: 'প্রত্যয়ন ও সনদ (Certificate)',
    labelEn: 'Certificate',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'সার্টিফিকেট ও প্রত্যয়নপত্র ইস্যু নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls certificate generation.',
  },
  {
    key: 'admitCard',
    group: 'document',
    labelBn: 'প্রবেশপত্র (Admit Card)',
    labelEn: 'Admit Card',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'পরীক্ষার প্রবেশপত্র ডাউনলোড/প্রিন্ট নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls exam admit card issuance.',
  },
  {
    key: 'report',
    group: 'document',
    labelBn: 'অফিশিয়াল রিপোর্ট (Report)',
    labelEn: 'Report',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'একাডেমিক ও প্রশাসনিক রিপোর্ট রপ্তানি নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls administrative reports.',
  },
  {
    key: 'resultSheet',
    group: 'document',
    labelBn: 'রেজাল্ট শীট / ট্যাবুলেশন (Result Sheet)',
    labelEn: 'Result Sheet',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'মার্কশিট ও টেবুলেশন শীট প্রিন্ট নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls result sheets.',
  },
  {
    key: 'receipt',
    group: 'document',
    labelBn: 'ফি রসিদ (Receipt)',
    labelEn: 'Fee Receipt',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'ফি পেমেন্ট রসিদ প্রিন্ট নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls fee receipts.',
  },
  {
    key: 'documentTemplates',
    group: 'document',
    labelBn: 'ডকুমেন্ট টেমপ্লেট (Document Templates)',
    labelEn: 'Document Templates',
    scope: 'school_and_central',
    nonDestructiveNoteBn: 'কাস্টম ডকুমেন্ট টেমপ্লেট সম্পাদনা নিয়ন্ত্রণ করে।',
    nonDestructiveNoteEn: 'Controls editing official document templates.',
  },
];

export type ThemePreference = 'light' | 'dark' | 'system';
export type FontSizeOption = 'small' | 'normal' | 'large';
export type DateFormatOption = 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD MMM, YYYY';
export type TimeFormatOption = '12h' | '24h';
export type DashboardDensity = 'comfortable' | 'compact';
export type NumberFormatOption = 'bn' | 'en';

export interface ActiveSessionDevice {
  id: string;
  deviceName: string;
  platform: 'Android App' | 'Web Browser' | 'Tablet';
  location: string;
  ipMasked: string;
  lastActive: string;
  isCurrent: boolean;
  trusted: boolean;
}

export interface LoginHistoryRecord {
  id: string;
  timestamp: string;
  device: string;
  ipMasked: string;
  status: 'Success' | 'OTP Verified' | 'Blocked Attempt';
}

export interface ExtendedNotificationChannels {
  push: boolean;
  email: boolean;
  sms: boolean;
  notice: boolean;
  attendance: boolean;
  exam: boolean;
  result: boolean;
  assignment: boolean;
  routine: boolean;
  feePayment: boolean;
  emergency: boolean;
}

export interface SchoolGovernanceConfig {
  schoolStartTime: string;
  schoolEndTime: string;
  workingDays: string[];
  holidayCalendarSummary: string;
  gradingScaleMode: 'NCTB Primary (A+ to F)' | 'Percentage Standard';
  passMarkPct: number;
  lateGraceMinutes: number;
  minAttendanceAlertPct: number;
  defaultClassList: string;
  defaultSections: string;
  roomsList: string;
}

export interface DocumentTemplateToggle {
  id: string;
  titleBn: string;
  titleEn: string;
  category: 'notice' | 'certificate' | 'idCard' | 'result' | 'report' | 'receipt' | 'letter' | 'admitCard';
  enabled: boolean;
  headerStyle: string;
  footerNote: string;
}

export interface TrashRecoveryItem {
  id: string;
  entityType: 'school' | 'teacher' | 'student' | 'notice' | 'document';
  titleBn: string;
  titleEn: string;
  deletedAt: string;
  deletedBy: string;
  restored?: boolean;
}

export interface SupportTicketDraft {
  id: string;
  type: 'bug' | 'feedback' | 'feature_request' | 'support';
  subject: string;
  message: string;
  createdAt: string;
  status: 'Submitted' | 'Under Review';
}

export interface SystemSettingsState {
  version: number;
  updatedAt: string;
  updatedBy: string;
  accountRecoveryEmail: string;
  accountRecoveryPhone: string;
  security: {
    twoFactorEnabled: boolean;
    otpVerificationRequired: boolean;
    loginAlerts: boolean;
    profileVisibility: 'school_only' | 'public_verified' | 'private';
    autoLogoutMinutes: 15 | 30 | 60 | 120;
    devices: ActiveSessionDevice[];
    loginHistory: LoginHistoryRecord[];
  };
  notifications: ExtendedNotificationChannels;
  appearance: {
    themePreference: ThemePreference;
    language: Language;
    fontSize: FontSizeOption;
    dateFormat: DateFormatOption;
    timeFormat: TimeFormatOption;
    dashboardView: 'cards' | 'summary_table';
    density: DashboardDensity;
  };
  features: Record<FeatureToggleKey, boolean>;
  schoolConfig: SchoolGovernanceConfig;
  regional: {
    language: Language;
    country: string;
    timeZone: string;
    currency: string;
    dateFormat: DateFormatOption;
    timeFormat: TimeFormatOption;
    numberFormat: NumberFormatOption;
  };
  templates: DocumentTemplateToggle[];
  dataGovernance: {
    autoBackupInterval: 'Daily' | 'Weekly' | 'Manual';
    lastBackupAt: string;
    retentionDays: 90 | 180 | 365;
    trashItems: TrashRecoveryItem[];
  };
  subscription: {
    planName: string;
    status: 'Active' | 'Trial' | 'Grace Period';
    renewalDate: string;
    billingCycle: 'Annual Government Grant' | 'Monthly Institutional';
    maxSchools: string;
    paymentHistory: { id: string; date: string; amount: string; status: string; invoiceNo: string }[];
  };
  supportTickets: SupportTicketDraft[];
}

export const DEFAULT_FEATURE_CONTROLS: Record<FeatureToggleKey, boolean> = {
  systemActive: true,
  limitedMode: false,
  maintenanceMode: false,
  newUserRegistration: true,
  onlineRegistration: true,
  onlineAdmission: true,
  schoolJoining: true,
  studentRegistration: true,
  teacherRegistration: true,
  staffRegistration: true,
  guardianRegistration: true,
  schoolRegistration: true,
  admissionRequest: true,
  joinSchoolByCode: true,
  academicManagement: true,
  classManagement: true,
  subjectManagement: true,
  lesson: true,
  lessonPlan: true,
  curriculum: true,
  syllabus: true,
  assignment: true,
  activity: true,
  classRoutine: true,
  examRoutine: true,
  teacherRoutine: true,
  studentRoutine: true,
  studentAttendance: true,
  teacherAttendance: true,
  staffAttendance: true,
  qrScannerAttendance: true,
  manualAttendance: true,
  lateAttendance: true,
  leaveRequest: true,
  examManagement: true,
  examRegistration: true,
  examSchedule: true,
  marksEntry: true,
  resultProcessing: true,
  resultPublish: true,
  reportCard: true,
  resultDownload: true,
  feeManagement: true,
  onlinePayment: true,
  feeCollection: true,
  paymentReceipt: true,
  dueManagement: true,
  paymentNotification: true,
  notice: true,
  announcement: true,
  pushNotification: true,
  sms: true,
  email: true,
  messaging: true,
  adminToTeacher: true,
  adminToStudent: true,
  adminToGuardian: true,
  teacherToStudent: true,
  emergencyNotification: true,
  idCard: true,
  certificate: true,
  admitCard: true,
  report: true,
  resultSheet: true,
  receipt: true,
  documentTemplates: true,
};

export function createDefaultSettingsState(lang: Language = 'bn', theme: ThemePreference = 'light'): SystemSettingsState {
  return {
    version: 1,
    updatedAt: '2026-11-21T00:00:00.000Z',
    updatedBy: 'System',
    accountRecoveryEmail: 'support@psms.gov.bd',
    accountRecoveryPhone: '01700-000001',
    security: {
      twoFactorEnabled: true,
      otpVerificationRequired: true,
      loginAlerts: true,
      profileVisibility: 'school_only',
      autoLogoutMinutes: 60,
      devices: [
        {
          id: 'DEV-01',
          deviceName: 'Chrome Web Workspace (Desktop)',
          platform: 'Web Browser',
          location: 'Dhaka, Bangladesh',
          ipMasked: '103.112.**.42',
          lastActive: 'Active now',
          isCurrent: true,
          trusted: true,
        },
        {
          id: 'DEV-02',
          deviceName: 'PSMS Android Mobile App (Pixel / Galaxy)',
          platform: 'Android App',
          location: 'Dhaka, Bangladesh',
          ipMasked: '103.112.**.89',
          lastActive: '14 mins ago',
          isCurrent: false,
          trusted: true,
        },
      ],
      loginHistory: [
        {
          id: 'LH-101',
          timestamp: '21 Nov 2026, 09:15 AM',
          device: 'PSMS Android Mobile App',
          ipMasked: '103.112.**.89',
          status: 'OTP Verified',
        },
        {
          id: 'LH-102',
          timestamp: '20 Nov 2026, 04:40 PM',
          device: 'Chrome Web Browser',
          ipMasked: '103.112.**.42',
          status: 'Success',
        },
      ],
    },
    notifications: {
      push: true,
      email: true,
      sms: true,
      notice: true,
      attendance: true,
      exam: true,
      result: true,
      assignment: true,
      routine: true,
      feePayment: true,
      emergency: true,
    },
    appearance: {
      themePreference: theme,
      language: lang,
      fontSize: 'normal',
      dateFormat: 'DD MMM, YYYY',
      timeFormat: '12h',
      dashboardView: 'cards',
      density: 'comfortable',
    },
    features: { ...DEFAULT_FEATURE_CONTROLS },
    schoolConfig: {
      schoolStartTime: '09:00',
      schoolEndTime: '15:15',
      workingDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
      holidayCalendarSummary: 'শুক্রবার ও শনিবার সাপ্তাহিক ছুটি + সরকারি একাডেমিক ছুটি',
      gradingScaleMode: 'NCTB Primary (A+ to F)',
      passMarkPct: 33,
      lateGraceMinutes: 15,
      minAttendanceAlertPct: 75,
      defaultClassList: 'Pre-Primary, Class 1, Class 2, Class 3, Class 4, Class 5',
      defaultSections: 'ক (A), খ (B)',
      roomsList: 'Room 101, Room 102, Room 103, Room 104, Room 105, Lab-01',
    },
    regional: {
      language: lang,
      country: 'Bangladesh',
      timeZone: 'Asia/Dhaka (UTC+6)',
      currency: 'BDT (৳)',
      dateFormat: 'DD MMM, YYYY',
      timeFormat: '12h',
      numberFormat: lang === 'bn' ? 'bn' : 'en',
    },
    templates: [
      {
        id: 'TPL-NOTICE',
        titleBn: 'অফিশিয়াল নোটিশ টেমপ্লেট',
        titleEn: 'Official Notice Template',
        category: 'notice',
        enabled: true,
        headerStyle: 'DPE Crest + School Code Header',
        footerNote: 'প্রধান শিক্ষক / কর্তৃপক্ষ কর্তৃক স্বাক্ষরিত',
      },
      {
        id: 'TPL-CERT',
        titleBn: 'প্রত্যয়নপত্র ও সনদ টেমপ্লেট',
        titleEn: 'Certificate & Testimonial Template',
        category: 'certificate',
        enabled: true,
        headerStyle: 'Official Border + QR Verification',
        footerNote: 'QR কোড স্ক্যান করে সত্যতা যাচাইযোগ্য',
      },
      {
        id: 'TPL-ID',
        titleBn: 'ডিজিটাল QR আইডি কার্ড টেমপ্লেট',
        titleEn: 'Digital QR ID Card Template',
        category: 'idCard',
        enabled: true,
        headerStyle: 'Compact Portrait + Permanent ID Barcode',
        footerNote: 'Emergency Guardian Contact Included',
      },
      {
        id: 'TPL-RESULT',
        titleBn: 'রেজাল্ট ও মার্কশিট টেমপ্লেট',
        titleEn: 'Result & Marksheet Template',
        category: 'result',
        enabled: true,
        headerStyle: 'Subject Marks + GPA Summary Table',
        footerNote: 'Academic Controller Verified',
      },
      {
        id: 'TPL-RECEIPT',
        titleBn: 'ফি ও পেমেন্ট রসিদ টেমপ্লেট',
        titleEn: 'Fee Payment Receipt Template',
        category: 'receipt',
        enabled: true,
        headerStyle: 'Dual Copy Thermal / A4 Receipt',
        footerNote: 'Digital Transaction Ref Embedded',
      },
      {
        id: 'TPL-ADMIT',
        titleBn: 'পরীক্ষার প্রবেশপত্র টেমপ্লেট',
        titleEn: 'Exam Admit Card Template',
        category: 'admitCard',
        enabled: true,
        headerStyle: 'Candidate Photo + Exam Seat & Routine',
        footerNote: 'Examination Hall Rules Attached',
      },
    ],
    dataGovernance: {
      autoBackupInterval: 'Daily',
      lastBackupAt: '21 Nov 2026, 06:00 AM',
      retentionDays: 365,
      trashItems: [
        {
          id: 'TRASH-01',
          entityType: 'notice',
          titleBn: 'বার্ষিক ক্রীড়া মহড়া (খসড়া)',
          titleEn: 'Annual Sports Rehearsal Draft',
          deletedAt: '19 Nov 2026',
          deletedBy: 'School Admin',
        },
        {
          id: 'TRASH-02',
          entityType: 'document',
          titleBn: 'ডুপ্লিকেট প্রত্যয়ন খসড়া #DOC-2026-08',
          titleEn: 'Duplicate Prottoyon Draft #DOC-2026-08',
          deletedAt: '18 Nov 2026',
          deletedBy: 'Head Teacher',
        },
      ],
    },
    subscription: {
      planName: 'National Unified School Suite (DPE Enterprise)',
      status: 'Active',
      renewalDate: '31 Dec 2027',
      billingCycle: 'Annual Government Grant',
      maxSchools: 'Unlimited Schools & Devices (Web + Android APK)',
      paymentHistory: [
        {
          id: 'PAY-2026-01',
          date: '01 Jan 2026',
          amount: '৳ ০ (সরকারি প্রাতিষ্ঠানিক লাইসেন্স)',
          status: 'Paid / Active',
          invoiceNo: 'INV-DPE-2026-0001',
        },
      ],
    },
    supportTickets: [],
  };
}

/**
 * Returns ONLY the settings categories authorized for the given user role.
 */
export function getVisibleSettingsSectionsForRole(role: Role): SettingsCategoryMeta[] {
  return SETTINGS_CATEGORIES.filter((cat) => cat.roles.includes(role)).sort((a, b) => a.order - b.order);
}

/**
 * Returns which feature toggles the role is permitted to view and edit.
 * - central_admin: ALL toggles
 * - school_admin: school_and_central toggles ONLY (cannot disable national/central system toggles)
 * - teacher / student / guardian: NONE (empty array)
 */
export function getEditableFeatureTogglesForRole(role: Role): FeatureToggleDefinition[] {
  if (role === 'central_admin') {
    return FEATURE_TOGGLE_DEFINITIONS;
  }
  if (role === 'school_admin') {
    return FEATURE_TOGGLE_DEFINITIONS.filter((def) => def.scope === 'school_and_central');
  }
  return [];
}

export function canRoleEditFeatureToggle(role: Role, key: FeatureToggleKey): boolean {
  if (role === 'central_admin') return true;
  if (role === 'school_admin') {
    const def = FEATURE_TOGGLE_DEFINITIONS.find((f) => f.key === key);
    return def?.scope === 'school_and_central';
  }
  return false;
}

export function isCriticalFeatureToggle(key: FeatureToggleKey): boolean {
  return Boolean(FEATURE_TOGGLE_DEFINITIONS.find((f) => f.key === key)?.critical);
}

/**
 * Non-destructive feature toggle engine:
 * - Verifies RBAC authorization (throws/denies unauthorized roles without mutating state)
 * - Updates ONLY the targeted feature key (never cascades to disable other features)
 * - Generates an audit trail entry recording who, when, what, oldValue, and newValue
 */
export function toggleSystemFeatureSafely(
  state: SystemSettingsState,
  role: Role,
  actorName: string,
  key: FeatureToggleKey,
  nextValue: boolean,
  reason?: string
): { allowed: boolean; nextState: SystemSettingsState; auditEntry?: AuditLogEntry; errorBn?: string; errorEn?: string } {
  if (!canRoleEditFeatureToggle(role, key)) {
    return {
      allowed: false,
      nextState: state,
      errorBn: 'আপনার এই সিস্টেম ফিচার পরিবর্তন করার অনুমতি নেই।',
      errorEn: 'You do not have permission to modify this system setting.',
    };
  }

  const prevValue = Boolean(state.features[key]);
  if (prevValue === nextValue) {
    return { allowed: true, nextState: state };
  }

  const def = FEATURE_TOGGLE_DEFINITIONS.find((f) => f.key === key);
  const nowIso = new Date().toISOString();

  const nextState: SystemSettingsState = {
    ...state,
    version: state.version + 1,
    updatedAt: nowIso,
    updatedBy: actorName,
    features: {
      ...state.features,
      [key]: nextValue,
    },
  };

  const auditEntry: AuditLogEntry = {
    id: `AUD-SET-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    who: actorName,
    role,
    when: nowIso.replace('T', ' ').slice(0, 16),
    what: `Settings Feature Toggle: ${def ? def.labelEn : key}`,
    targetName: def ? `${def.labelBn} (${key})` : key,
    requestId: `SET-${key.toUpperCase()}`,
    oldValue: prevValue ? 'ON' : 'OFF',
    newValue: nextValue ? 'ON' : 'OFF',
    reason: reason || (nextValue ? 'Re-enabled via Settings' : 'Disabled via Settings (Existing records preserved)'),
  };

  return { allowed: true, nextState, auditEntry };
}

export type ProtectedUserAction =
  | 'new_student_registration'
  | 'new_teacher_registration'
  | 'new_school_registration'
  | 'join_school_by_code'
  | 'existing_student_login'
  | 'existing_student_attendance'
  | 'existing_student_view_routine'
  | 'existing_student_view_results'
  | 'existing_student_view_notices'
  | 'existing_student_submit_assignment'
  | 'create_notice'
  | 'marks_entry'
  | 'qr_attendance_scan';

/**
 * Guarantees the Non-Destructive Rule:
 * Turning OFF e.g. `studentRegistration` ONLY blocks `new_student_registration`,
 * NEVER blocking existing students from logging in, viewing routine/results/notices, or attending!
 */
export function canPerformActionUnderSettings(
  state: SystemSettingsState,
  action: ProtectedUserAction
): { allowed: boolean; reasonBn?: string; reasonEn?: string } {
  const f = state.features;
  if (!f.systemActive && action.startsWith('new_')) {
    return {
      allowed: false,
      reasonBn: 'সিস্টেম সাময়িকভাবে সীমিত অবস্থায় রয়েছে। নতুন আবেদন এখন বন্ধ।',
      reasonEn: 'System is temporarily paused for new registrations.',
    };
  }

  switch (action) {
    case 'new_student_registration':
      if (!f.newUserRegistration || !f.studentRegistration) {
        return {
          allowed: false,
          reasonBn: 'নতুন শিক্ষার্থী নিবন্ধন বর্তমানে বন্ধ রয়েছে (Settings থেকে নিয়ন্ত্রিত)। পূর্বের সকল শিক্ষার্থীর অ্যাকাউন্ট সচল আছে।',
          reasonEn: 'New student registration is currently disabled in Settings. Existing student accounts remain active.',
        };
      }
      return { allowed: true };
    case 'new_teacher_registration':
      if (!f.newUserRegistration || !f.teacherRegistration) {
        return {
          allowed: false,
          reasonBn: 'নতুন শিক্ষক নিবন্ধন বর্তমানে বন্ধ রয়েছে। বিদ্যমান সকল শিক্ষক যথারীতি কাজ করতে পারবেন।',
          reasonEn: 'New teacher registration is currently disabled in Settings. Existing teachers remain active.',
        };
      }
      return { allowed: true };
    case 'new_school_registration':
      if (!f.schoolRegistration) {
        return {
          allowed: false,
          reasonBn: 'নতুন বিদ্যালয় নিবন্ধন সাময়িকভাবে বন্ধ রয়েছে।',
          reasonEn: 'New school registration is currently disabled in Settings.',
        };
      }
      return { allowed: true };
    case 'join_school_by_code':
      if (!f.joinSchoolByCode || !f.schoolJoining) {
        return {
          allowed: false,
          reasonBn: 'কোডের মাধ্যমে নতুন বিদ্যালয়ে যোগদান বর্তমানে বন্ধ রয়েছে।',
          reasonEn: 'Joining a school by code is currently disabled in Settings.',
        };
      }
      return { allowed: true };
    case 'create_notice':
      if (!f.notice) {
        return {
          allowed: false,
          reasonBn: 'নতুন নোটিশ প্রকাশ বর্তমানে বন্ধ আছে (পূর্বের নোটিশ দেখা যাবে)।',
          reasonEn: 'Publishing new notices is paused (previous notices remain visible).',
        };
      }
      return { allowed: true };
    case 'marks_entry':
      if (!f.marksEntry) {
        return {
          allowed: false,
          reasonBn: 'নতুন নম্বর এন্ট্রি সাময়িকভাবে লক করা হয়েছে।',
          reasonEn: 'Marks entry is currently locked in Settings.',
        };
      }
      return { allowed: true };
    case 'qr_attendance_scan':
      if (!f.qrScannerAttendance) {
        return {
          allowed: false,
          reasonBn: 'QR স্ক্যানার হাজিরা Settings থেকে বন্ধ আছে।',
          reasonEn: 'QR Scanner attendance is disabled in Settings.',
        };
      }
      return { allowed: true };
    // Existing user core operations are NEVER disabled by registration/creation toggles!
    case 'existing_student_login':
    case 'existing_student_attendance':
    case 'existing_student_view_routine':
    case 'existing_student_view_results':
    case 'existing_student_view_notices':
    case 'existing_student_submit_assignment':
      return { allowed: true };
    default:
      return { allowed: true };
  }
}

export function mapExtendedNotificationsToPreferences(
  channels: ExtendedNotificationChannels
): NotificationPreferences {
  return {
    notice: channels.notice,
    academic: channels.assignment,
    exam_result: channels.exam || channels.result,
    routine: channels.routine,
    message: channels.push || channels.email || channels.sms,
    account: true,
    system: true,
    emergency: channels.emergency,
  };
}
