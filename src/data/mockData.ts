import type {
  AdminAccount,
  ApprovalRequest,
  AssignmentItem,
  AuditLogEntry,
  ContactAdminMessage,
  ExamRecord,
  ExamRoutineRecord,
  FeeRecord,
  KioskScanEvent,
  LeaveRequestItem,
  NoticeItem,
  NotificationItem,
  OfficialDocumentRecord,
  OfficialDocumentTemplate,
  RoutineSlot,
  SchoolRecord,
  StudentAttendanceHistoryEntry,
  StudentChangeRequest,
  StudentRecord,
  TeacherChangeRequest,
  TeacherMessageItem,
  TeacherRecord,
  TeacherSchoolAssignment,
} from '../types';

export const AVATARS = {
  centralAdmin: '/src/assets/images/avatar_central_admin_1794948103951.jpg',
  headTeacher: '/src/assets/images/avatar_head_teacher_1794948103808.jpg',
  studentRahim: '/src/assets/images/avatar_student_rahim_1794948104743.jpg',
};

export interface RecommendedCoverPreset {
  id: string;
  titleBn: string;
  titleEn: string;
  categoryBn: string;
  url: string;
}

export const RECOMMENDED_SCHOOL_COVERS: RecommendedCoverPreset[] = [
  {
    id: 'cov-campus-day',
    titleBn: 'সবুজ ক্যাম্পাস ও একাডেমিক ভবন',
    titleEn: 'Sunny Campus & Academic Hall',
    categoryBn: 'প্রাথমিক ও আদর্শ ক্যাম্পাস',
    url: '/src/assets/images/school_cover_campus_day_1795252299653.jpg',
  },
  {
    id: 'cov-modern-hall',
    titleBn: 'আধুনিক উচ্চ বিদ্যালয় কমপ্লেক্স',
    titleEn: 'Modern High School Complex',
    categoryBn: 'আধুনিক ভবন',
    url: '/src/assets/images/school_cover_modern_hall_1795252299637.jpg',
  },
  {
    id: 'cov-green-yard',
    titleBn: 'খেলার মাঠ ও বৃক্ষশোভিত প্রাঙ্গণ',
    titleEn: 'Green Courtyard & Playground',
    categoryBn: 'প্রাকৃতিক পরিবেশ',
    url: '/src/assets/images/school_cover_green_yard_1795252300454.jpg',
  },
  {
    id: 'cov-coastal-tech',
    titleBn: 'স্মার্ট ডিজিটাল শিক্ষাঙ্গন',
    titleEn: 'Smart Digital Campus',
    categoryBn: 'স্মার্ট ক্যাম্পাস',
    url: '/src/assets/images/school_cover_coastal_tech_1795252301819.jpg',
  },
];

export const DEFAULT_PROFILE_AVATARS = {
  central_admin: AVATARS.centralAdmin,
  school_admin: AVATARS.headTeacher,
  teacher: AVATARS.headTeacher,
  guardian: AVATARS.headTeacher,
} as const;

export const CENTRAL_ADMIN_CREDENTIALS = {
  username: 'mominkhan404586@gmail.com',
  email: 'mominkhan404586@gmail.com',
  mobile: '01331712797',
  displayNameBn: 'মোঃ মোমিন খান',
  displayNameEn: 'Md. Momin Khan',
};

export const INITIAL_ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    id: 'adm-1',
    name: 'মোঃ মোমিন খান',
    username: 'mominkhan404586@gmail.com',
    email: 'mominkhan404586@gmail.com',
    mobile: '01331712797',
    accessLevel: 'Super Central Admin',
    isMainOwner: true,
    permissions: ['*', 'schools', 'teachers', 'students', 'verification', 'approval', 'notices', 'exams', 'documents', 'reports', 'security'],
    status: 'active',
    lastLogin: 'Verified Portal Session',
    twoFactorEnabled: true,
    photoUrl: AVATARS.centralAdmin,
  },
];

// Production zero-demo initial state: all institutional, user, and operational datasets start empty
export const INITIAL_SCHOOLS: SchoolRecord[] = [];
export const INITIAL_APPROVAL_REQUESTS: ApprovalRequest[] = [];
export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];
export const INITIAL_STUDENTS: StudentRecord[] = [];
export const INITIAL_STUDENT_CHANGE_REQUESTS: StudentChangeRequest[] = [];
export const INITIAL_TEACHERS: TeacherRecord[] = [];
export const INITIAL_TEACHER_CHANGE_REQUESTS: TeacherChangeRequest[] = [];
export const INITIAL_ROUTINE_SLOTS: RoutineSlot[] = [];
export const INITIAL_KIOSK_SCANS: KioskScanEvent[] = [];
export const INITIAL_ATTENDANCE_HISTORY: StudentAttendanceHistoryEntry[] = [];
export const INITIAL_EXAMS: ExamRecord[] = [];
export const INITIAL_FEES: FeeRecord[] = [];
export const INITIAL_NOTICES: NoticeItem[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_ASSIGNMENTS: AssignmentItem[] = [];
export const INITIAL_LEAVE_REQUESTS: LeaveRequestItem[] = [];
export const INITIAL_TEACHER_MESSAGES: TeacherMessageItem[] = [];
export const CLASS_ENROLLMENT_DATA: Array<{ label: string; value: number }> = [];
export const INITIAL_TEACHER_SCHOOL_ASSIGNMENTS: TeacherSchoolAssignment[] = [];
export const INITIAL_OFFICIAL_DOCUMENTS: OfficialDocumentRecord[] = [];
export const INITIAL_EXAM_ROUTINES: ExamRoutineRecord[] = [];
export const INITIAL_CONTACT_ADMIN_MESSAGES: ContactAdminMessage[] = [];

export const ALL_CLASSES = [
  'Pre-Primary',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
];

export const NCTB_SUBJECTS = [
  { code: 'NCTB-101', nameBn: 'বাংলা', nameEn: 'Bangla', classes: 'Pre-Primary – Class 10', weeklyPeriods: 6 },
  { code: 'NCTB-102', nameBn: 'ইংরেজি', nameEn: 'English', classes: 'Class 1 – Class 10', weeklyPeriods: 6 },
  { code: 'NCTB-103', nameBn: 'গণিত', nameEn: 'Mathematics', classes: 'Pre-Primary – Class 10', weeklyPeriods: 6 },
  { code: 'NCTB-104', nameBn: 'প্রাথমিক / সাধারণ বিজ্ঞান', nameEn: 'Science', classes: 'Class 3 – Class 10', weeklyPeriods: 4 },
  { code: 'NCTB-105', nameBn: 'বাংলাদেশ ও বিশ্বপরিচয়', nameEn: 'Bangladesh & Global Studies', classes: 'Class 3 – Class 10', weeklyPeriods: 4 },
  { code: 'NCTB-106', nameBn: 'ধর্ম ও নৈতিক শিক্ষা', nameEn: 'Religion & Moral Education', classes: 'Class 3 – Class 10', weeklyPeriods: 3 },
  { code: 'NCTB-107', nameBn: 'তথ্য ও যোগাযোগ প্রযুক্তি (ICT)', nameEn: 'Information & Communication Technology', classes: 'Class 6 – Class 10', weeklyPeriods: 3 },
];

export const INITIAL_DOCUMENT_TEMPLATES: OfficialDocumentTemplate[] = [
  {
    id: 'tpl-stu-prottoyon',
    docType: 'prottoyon_patro',
    category: 'student',
    nameBn: 'প্রত্যয়ন পত্র',
    nameEn: 'Testimonial / Attestation (Prottoyon Patro)',
    prefixCode: 'CERT',
    lockedPlaceholders: ['{{student_name}}', '{{student_id}}', '{{father_name}}', '{{class}}', '{{section}}', '{{roll}}', '{{session}}', '{{school_name}}', '{{issue_date}}', '{{document_number}}'],
    bodyTemplate: 'এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, {{student_name}} (Student ID: {{student_id}}), পিতা: {{father_name}}, {{school_name}}-এর {{class}} ({{section}}), রোল: {{roll}}, শিক্ষাবর্ষ {{session}}-এর একজন নিয়মিত শিক্ষার্থী। তার নৈতিক চরিত্র ও আচরণ সন্তোষজনক। তারিখ: {{issue_date}} · নথি নং: {{document_number}}।',
  },
  {
    id: 'tpl-stu-tc',
    docType: 'transfer_certificate',
    category: 'student',
    nameBn: 'ছাড়পত্র / Transfer Certificate',
    nameEn: 'Transfer Certificate (TC)',
    prefixCode: 'TC',
    lockedPlaceholders: ['{{student_name}}', '{{student_id}}', '{{father_name}}', '{{class}}', '{{section}}', '{{roll}}', '{{session}}', '{{school_name}}', '{{issue_date}}', '{{document_number}}'],
    bodyTemplate: 'OFFICIAL TRANSFER CERTIFICATE ({{document_number}}): {{student_name}} (ID: {{student_id}}), পিতা: {{father_name}}, {{school_name}}-এর {{class}} (শাখা: {{section}}, রোল: {{roll}}, শিক্ষাবর্ষ: {{session}})-এ অধ্যয়নরত ছিল। বিদ্যালয়ের সকল পাওনা পরিশোধ সাপেক্ষে তাকে {{issue_date}} তারিখে ছাড়পত্র প্রদান করা হলো।',
  },
  {
    id: 'tpl-stu-marksheet',
    docType: 'marksheet',
    category: 'student',
    nameBn: 'Marksheet',
    nameEn: 'Academic Marksheet',
    prefixCode: 'MARK',
    lockedPlaceholders: ['{{student_name}}', '{{student_id}}', '{{father_name}}', '{{class}}', '{{section}}', '{{roll}}', '{{session}}', '{{school_name}}', '{{issue_date}}', '{{document_number}}'],
    bodyTemplate: 'ACADEMIC TRANSCRIPT & MARKSHEET ({{document_number}}): Student {{student_name}} ({{student_id}}), Father: {{father_name}}, {{school_name}}, Class {{class}} ({{section}}), Roll #{{roll}}, Session {{session}}. Verified Examination Record issued on {{issue_date}}.',
  },
  {
    id: 'tpl-tch-employment',
    docType: 'employment_certificate',
    category: 'teacher',
    nameBn: 'Employment Certificate',
    nameEn: 'Teacher Employment Certificate',
    prefixCode: 'EMP',
    lockedPlaceholders: ['{{teacher_name}}', '{{designation}}', '{{school_name}}', '{{issue_date}}', '{{document_number}}'],
    bodyTemplate: 'EMPLOYMENT CERTIFICATE ({{document_number}}): This is to certify that {{teacher_name}} is serving as {{designation}} at {{school_name}} in good standing. Issued on {{issue_date}}.',
  },
];
