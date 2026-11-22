export type Role = 'central_admin' | 'school_admin' | 'teacher' | 'guardian' | 'student';
export type Language = 'bn' | 'en';
export type Theme = 'light' | 'dark';

export type SchoolTypeCode =
  | 'KINDERGARTEN'
  | 'MADRASA'
  | 'PRIMARY'
  | 'SECONDARY'
  | 'PRIMARY_SECONDARY'
  | 'OTHER';

export type RecordStatus =
  | 'active'
  | 'pending'
  | 'under_review'
  | 'revision_requested'
  | 'approved'
  | 'verified'
  | 'rejected'
  | 'suspended'
  | 'deactivated'
  | 'disabled'
  | 'archived';

export type ApprovalStatus =
  | 'pending'
  | 'under_review'
  | 'revision_requested'
  | 'approved'
  | 'rejected';

export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'flagged';

export type VerificationCategoryId =
  | 'school'
  | 'teacher'
  | 'student'
  | 'document'
  | 'address_location'
  | 'id_check'
  | 'duplicate_check'
  | 'critical_info';

export type AdminReviewerRole =
  | 'Super Central Admin'
  | 'Verification Officer'
  | 'Approval Officer'
  | 'Audit Officer';

export type GovernanceEntity = 'school' | 'teacher' | 'student' | 'verification';
export type GovernanceAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'verify'
  | 'approve'
  | 'transfer'
  | 'suspend'
  | 'deactivate'
  | 'reissue_id'
  | 'delete_archive'
  | 'restore'
  | 'notice'
  | 'activity_history'
  | 'reports';

export type PermissionKey = `${GovernanceEntity}:${GovernanceAction}`;
export type RolePermissionMatrix = Record<AdminReviewerRole, Record<PermissionKey, boolean>>;

export type SchoolCategory =
  | 'Government'
  | 'Private'
  | 'MPO'
  | 'Kindergarten'
  | 'Madrasa'
  | 'NGO';

export type AddressSource = 'AUTOMATIC' | 'MANUAL';

export interface LocationNode {
  id: string;
  parentId: string | null;
  nameBn: string;
  nameEn: string;
  isActive: boolean;
}

export interface BdLocationDatabase {
  divisions: LocationNode[];
  districts: LocationNode[];
  upazilas: LocationNode[];
  unions: LocationNode[];
  villages: LocationNode[];
}

export interface AddressSelection {
  addressSource: AddressSource;
  divisionId: string;
  districtId: string;
  upazilaId: string;
  unionId: string;
  villageId: string;
  divisionName: string;
  districtName: string;
  upazilaName: string;
  unionName: string;
  villageName: string;
  fullAddress: string;
}

export interface SchoolApprovalHistoryItem {
  id: string;
  date: string;
  actor: string;
  action: string;
  fromStatus: string;
  toStatus: string;
  note?: string;
}

export interface SchoolInspectionRecord {
  id: string;
  date: string;
  inspectorName: string;
  findings: string;
  recommendation: 'recommend_approval' | 'revision_needed' | 'flag_issue';
  reportRef?: string;
}

export interface SchoolApplicationRecord {
  id: string;
  type: string;
  submittedDate: string;
  status: string;
  summary: string;
}

export interface SchoolSuspensionDetails {
  reason: string;
  startDate: string;
  expectedResumeDate: string;
  reactivationRequested?: boolean;
  reactivationNote?: string;
}

export interface SchoolDeactivationRecord {
  reason: string;
  evidenceDoc: string;
  inspectionReportRef: string;
  studentTransferDone: boolean;
  staffAdjustmentDone: boolean;
  assetDisposalDone: boolean;
  finalApprovalBy: string;
  finalApprovalDate: string;
  note?: string;
}

export interface SchoolAdminMember {
  id: string;
  name: string;
  username: string;
  email: string;
  mobile: string;
  roleType: 'Primary Admin' | 'Acting / Temporary Admin';
  invitationStatus: 'Accepted' | 'Invited';
  permissions: string[];
  status: 'active' | 'removed';
  assignedAt: string;
}

export interface SchoolAdminHandoverRecord {
  id: string;
  date: string;
  previousAdminName: string;
  newAdminName: string;
  actionType: 'Appointed' | 'Replaced' | 'Acting Assigned' | 'Removed' | 'Permissions Updated';
  handoverNote: string;
  recordedBy: string;
}

export interface SchoolRecord {
  id: string;
  schoolPublicId?: string;
  registrationId?: string;
  code: string;
  eiin: string;
  nameBn: string;
  nameEn: string;
  schoolType: SchoolTypeCode;
  customSchoolType?: string;
  category?: SchoolCategory;
  educationLevel?: string;
  establishedYear?: string;
  mobile: string;
  email: string;
  cluster: string;
  division: string;
  district: string;
  upazila: string;
  union: string;
  village: string;
  divisionId?: string;
  districtId?: string;
  upazilaId?: string;
  unionId?: string;
  villageId?: string;
  fullAddress: string;
  gpsLat?: string;
  gpsLng?: string;
  addressSource: AddressSource;
  addressVerified?: boolean;
  headTeacher: string;
  headTeacherMobile?: string;
  adminUsername: string;
  studentCount: number;
  teacherCount: number;
  classRange: string;
  approvedClasses: string[];
  academicYear: string;
  status: RecordStatus;
  verificationStatus?: VerificationStatus;
  verifiedBy?: string;
  verificationNote?: string;
  approvalStatus?: ApprovalStatus;
  registrationDate?: string;
  registrationMethod: 'ONLINE' | 'MANUAL';
  documents: string[];
  verifiedDate: string;
  attendanceRate: number;
  revisionNote?: string;
  suspensionDetails?: SchoolSuspensionDetails;
  deactivationDetails?: SchoolDeactivationRecord;
  schoolAdmins?: SchoolAdminMember[];
  handoverHistory?: SchoolAdminHandoverRecord[];
  approvalHistory?: SchoolApprovalHistoryItem[];
  inspectionHistory?: SchoolInspectionRecord[];
  previousApplications?: SchoolApplicationRecord[];
  resultPublishAllowed?: boolean;
  coverImageUrl?: string;
  loginPassword?: string;
  headTeacherPhotoUrl?: string;
}

export interface ApprovalRequest {
  id: string;
  type: 'school' | 'teacher' | 'student' | 'academic' | 'tc';
  verificationCategory?: VerificationCategoryId;
  typeLabelBn: string;
  typeLabelEn: string;
  applicantName: string;
  schoolName: string;
  schoolId: string;
  targetEntityId?: string;
  schoolType?: SchoolTypeCode;
  addressSource?: AddressSource;
  submittedAt: string;
  verificationStatus?: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNote?: string;
  status: 'pending' | 'under_review' | 'revision_requested' | 'approved' | 'verified' | 'rejected' | 'suspended';
  priority: 'normal' | 'urgent';
  details: string;
}

export interface AuditLogEntry {
  id: string;
  who: string;
  role: Role;
  when: string;
  what: string;
  targetName: string;
  schoolId?: string;
  teacherId?: string;
  studentId?: string;
  requestId: string;
  oldValue: string;
  newValue: string;
  reason?: string;
}

export interface AdminAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  mobile: string;
  accessLevel: 'Super Central Admin' | 'Regional Reviewer' | 'Audit Officer';
  isMainOwner?: boolean;
  permissions?: string[];
  status: 'active' | 'suspended';
  lastLogin: string;
  twoFactorEnabled: boolean;
  photoUrl?: string;
}

export interface ContactAdminMessage {
  id: string;
  senderName: string;
  senderRole: Role | 'guest';
  senderSchoolId?: string;
  senderContact: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'Pending' | 'Reviewed' | 'Replied';
  replyNote?: string;
}

export type StudentStatus =
  | 'active'
  | 'pending'
  | 'under_review'
  | 'rejected'
  | 'suspended'
  | 'deactivated'
  | 'archived'
  | 'withdrawn'
  | 'repeated';

export interface StudentDocument {
  id: string;
  name: string;
  type: 'birth_cert' | 'photo' | 'transfer_cert' | 'guardian_nid' | 'other';
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  docRef?: string;
}

export interface StudentApprovalHistoryItem {
  id: string;
  date: string;
  actor: string;
  category:
    | 'new_registration'
    | 'document_verification'
    | 'important_profile_change'
    | 'school_transfer'
    | 'profile_edit'
    | 'status_change'
    | 'notice'
    | 'verification';
  actionTitleBn: string;
  actionTitleEn: string;
  fromValue: string;
  toValue: string;
  decision: 'approved' | 'rejected' | 'pending' | 'under_review' | 'completed' | 'verified' | 'flagged';
  note?: string;
}

export type StudentRequestCategory =
  | 'new_registration'
  | 'important_profile_change'
  | 'school_transfer';

export type StudentImportantFieldKey =
  | 'nameBn'
  | 'nameEn'
  | 'dob'
  | 'birthRegNo'
  | 'fatherName'
  | 'motherName'
  | 'className'
  | 'guardianMobile'
  | 'bloodGroup';

export interface StudentChangeRequest {
  id: string;
  studentId: string;
  permanentId: string;
  studentNameBn: string;
  schoolId: string;
  schoolNameBn: string;
  category: StudentRequestCategory;
  titleBn: string;
  titleEn: string;
  requestedBy: string;
  requestedByRole: 'student' | 'school_admin' | 'teacher' | 'guardian';
  submittedAt: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  fieldKey?: StudentImportantFieldKey;
  currentValue: string;
  proposedValue: string;
  targetSchoolId?: string;
  targetSchoolNameBn?: string;
  reason: string;
}

export interface StudentRecord {
  id: string;
  permanentId: string;
  activationCode: string;
  activated?: boolean;
  guardianLinkCode: string;
  schoolId: string;
  schoolNameBn: string;
  previousSchools?: string[];
  nameBn: string;
  nameEn: string;
  dob: string;
  birthRegNo: string;
  gender: 'Male' | 'Female';
  fatherName: string;
  motherName: string;
  guardianMobile: string;
  emergencyContact?: string;
  address?: string;
  bloodGroup: string;
  className: string;
  section: string;
  roll: number;
  status: StudentStatus;
  verificationStatus?: VerificationStatus;
  verifiedBy?: string;
  verifiedDate?: string;
  verificationNote?: string;
  approvalStatus?: ApprovalStatus;
  attendancePct: number;
  heightCm: number;
  weightKg: number;
  gpa?: string;
  examResultLabel?: string;
  academicSummary?: string;
  stipendStatus: 'approved' | 'pending' | 'not_applied';
  photoUrl?: string;
  digitalIdSerial?: string;
  lastIdIssuedAt?: string;
  reissuedIdCount?: number;
  admissionHistory: string[];
  documents?: StudentDocument[];
  approvalHistory?: StudentApprovalHistoryItem[];
  suspensionReason?: string;
  deactivationReason?: string;
  guardianUserId?: string;
  academicYear?: string;
  admissionDate?: string;
  fatherNameEn?: string;
  motherNameEn?: string;
  guardianRelation?: string;
  guardianNid?: string;
  presentAddress?: AddressSelection;
  permanentAddress?: AddressSelection;
  previousSchoolInfo?: {
    notApplicable: boolean;
    schoolName?: string;
    lastClass?: string;
    tcNumber?: string;
    leavingYear?: string;
  };
  admittedByTeacherId?: string;
  admittedByTeacherName?: string;
  qrPayload?: string;
}

export type TeacherStatus =
  | 'active'
  | 'pending'
  | 'under_review'
  | 'rejected'
  | 'suspended'
  | 'deactivated'
  | 'archived'
  | 'transferred';

export type TeacherApprovalCategory =
  | 'new_registration'
  | 'school_change'
  | 'designation_change'
  | 'subject_change'
  | 'important_info_change'
  | 'appointment_approval'
  | 'promotion_approval'
  | 'transfer_approval'
  | 'leave_absence_approval'
  | 'duty_change'
  | 'workplace_branch_change'
  | 'class_subject_allocation'
  | 'joining_date_correction'
  | 'suspend_or_reinstate'
  | 'profile_reactivation'
  | 'retirement_approval'
  | 'other_school_joining'
  | 'school_admin_role_change';

export interface TeacherApprovalHistoryItem {
  id: string;
  date: string;
  actor: string;
  category: TeacherApprovalCategory | 'status_change' | 'notice' | 'visit' | 'verification';
  actionTitleBn: string;
  actionTitleEn: string;
  fromValue: string;
  toValue: string;
  decision: 'approved' | 'rejected' | 'pending' | 'under_review' | 'completed' | 'verified' | 'flagged';
  note?: string;
}

export interface TeacherChangeRequest {
  id: string;
  teacherId: string;
  teacherCode: string;
  teacherNameBn: string;
  schoolId: string;
  schoolNameBn: string;
  category: TeacherApprovalCategory;
  titleBn: string;
  titleEn: string;
  requestedBy: string;
  submittedAt: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  currentValue: string;
  proposedValue: string;
  targetSchoolId?: string;
  targetSchoolNameBn?: string;
  newDesignation?: string;
  newSubjects?: string[];
  newAssignedClasses?: string[];
  newJoiningDate?: string;
  newBranch?: string;
  newDuty?: string;
  leaveRange?: string;
  reason: string;
}

export interface TeacherRecord {
  id: string;
  teacherCode: string;
  schoolId: string;
  schoolNameBn: string;
  branchName?: string;
  nameBn: string;
  nameEn: string;
  designation: string;
  qualification: string;
  joiningDate: string;
  subjects: string[];
  assignedClasses: string[];
  mobile: string;
  email?: string;
  nidNumber?: string;
  status: TeacherStatus;
  verificationStatus?: VerificationStatus;
  verifiedBy?: string;
  verifiedDate?: string;
  verificationNote?: string;
  approvalStatus?: ApprovalStatus;
  photoUrl?: string;
  reissuedIdCount?: number;
  lastIdIssuedAt?: string;
  performanceScore: number;
  specialDuty?: string;
  leaveStatus?: string;
  retirementDate?: string;
  isSchoolAdmin?: boolean;
  suspensionReason?: string;
  deactivationReason?: string;
  documents?: string[];
  transferHistory?: string[];
  activityHistory?: string[];
  approvalHistory?: TeacherApprovalHistoryItem[];
  // Part A Personal Info
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other';
  nationality?: string;
  presentAddress?: string;
  permanentAddress?: string;
  // Part B Professional Info (post-login editable)
  academicDegree?: string;
  subjectMajor?: string;
  training?: string;
  experienceYears?: number;
  previousInstitution?: string;
  employmentStatus?: 'Active' | 'On Leave' | 'Suspended' | 'Inactive' | 'Resigned';
  teacherType?: 'Permanent' | 'Contract' | 'Part-time' | 'Substitute';
  globalVerificationStatus?: 'pending' | 'under_review' | 'verified' | 'active' | 'suspended' | 'inactive' | 'deactivated';
  partBCompleted?: boolean;
}

export interface TeacherSchoolPermissions {
  addStudent: boolean;
  createNotice: boolean;
  generateDocs: boolean;
  takeAttendance: boolean;
}

export interface TeacherSchoolAssignment {
  id: string;
  teacherId: string;
  teacherCode: string;
  schoolId: string;
  schoolNameBn: string;
  designation: string;
  joiningDate: string;
  department: string;
  assignedClasses: string[];
  assignedSubjects: string[];
  sections: string[];
  room: string;
  classSchedule?: string;
  employmentStatus: 'Active' | 'On Leave' | 'Suspended' | 'Inactive' | 'Resigned';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  permissions: TeacherSchoolPermissions;
}

export type SubstituteReason =
  | 'Teacher Absent'
  | 'Emergency'
  | 'Room Unavailable'
  | 'Special Event'
  | 'Exam'
  | 'Administrative Reason'
  | 'Other';

export interface ClassSessionRecord {
  sessionId: string;
  slotId: string;
  date: string;
  startedAt: string;
  endedAt?: string;
  autoAttendanceCount: number;
  autoAttendanceTotal: number;
  presentStudentIds: string[];
  lessonId?: string;
  lessonTopic: string;
  learningObjective: string;
  classworkSummary: string;
  teachingActivity: string;
  teacherPrivateNotes: string;
  homeworkSummary: string;
}

export interface RoutineSlot {
  id: string;
  schoolId?: string;
  dayOfWeek?: string;
  period: number;
  timeRange: string;
  endsAt?: string;
  className: string;
  section: string;
  subjectBn: string;
  subjectEn: string;
  teacherId: string;
  teacherName: string;
  room: string;
  status: 'pending' | 'in_progress' | 'homework_pending' | 'completed' | 'sub_requested' | 'cancelled';
  startedAt?: string;
  lessonTopic?: string;
  homeworkText?: string;
  substituteTeacher?: string;
  substituteTeacherId?: string;
  substituteReason?: string;
  substitutePermissionId?: string;
  cancelledReason?: string;
  cancelledRemarks?: string;
  durationMins?: number;
  session?: ClassSessionRecord;
}

export interface KioskScanEvent {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  roll: number;
  scanTime: string;
  type: 'entry' | 'exit';
  attendanceState: 'present' | 'late';
  schoolId?: string;
  dateIso?: string;
  source?: 'auto_camera' | 'manual_teacher' | 'kiosk';
  guardianNotified?: boolean;
}

export interface StudentAttendanceHistoryEntry {
  id: string;
  studentId: string;
  schoolId: string;
  dateIso: string;
  status: 'present' | 'late' | 'absent';
  scanTime?: string;
  source: 'auto_camera' | 'manual_teacher' | 'kiosk';
  guardianNotified?: boolean;
}

export type ExamCategoryType =
  | 'term_1'
  | 'term_2'
  | 'term_3_annual'
  | 'class_test'
  | 'model_test'
  | 'weekly_test'
  | 'monthly_test'
  | 'custom';

export interface ExamMarkEntry {
  studentId: string;
  studentName: string;
  roll: number;
  className?: string;
  subjectBn: string;
  subjectEn: string;
  written: number;
  mcq?: number;
  oral: number;
  continuous: number;
  fullMarks: number;
  passMarks: number;
  previousTotal?: number;
}

export interface ExamRecord {
  id: string;
  schoolId?: string;
  academicYear?: string;
  titleBn: string;
  titleEn: string;
  className: string;
  section?: string;
  dateRange: string;
  status: 'scheduled' | 'marks_entry' | 'published' | 'held';
  examCategory?: ExamCategoryType;
  isCentralControlled?: boolean;
  centralApproved?: boolean;
  centralPublished?: boolean;
  subjectBn?: string;
  subjectEn?: string;
  examDate?: string;
  startTime?: string;
  durationMins?: number;
  fullMarks?: number;
  instructionsBn?: string;
  instructionsEn?: string;
  createdByRole?: Role;
  createdByName?: string;
  createdByTeacherId?: string;
  participantStudentIds?: string[];
  subjectSubmissions?: SubjectResultSubmission[];
  entries: ExamMarkEntry[];
}

export interface FeeRecord {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  className: string;
  categoryBn: string;
  categoryEn: string;
  month: string;
  totalAmount: number;
  paidAmount: number;
  method: 'Cash' | 'bKash' | 'Nagad' | 'Bank' | 'Unpaid';
  transactionRef: string;
  paidDate: string;
}

export type NoticeTypeCategory = 'central' | 'school' | 'teacher' | 'student' | 'emergency';
export type NoticeLifecycleStatus = 'Draft' | 'Scheduled' | 'Published' | 'Edited' | 'Expired' | 'Cancelled';
export type NoticeAudienceGroup =
  | 'all'
  | 'teachers'
  | 'students'
  | 'guardians'
  | 'class_group'
  | 'specific_users'
  | 'specific_section'
  | 'specific_teacher'
  | 'specific_student'
  | 'school_staff'
  | 'selected_groups';

export interface NoticeImageAttachment {
  id: string;
  dataUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface NoticeHistoryEntry {
  id: string;
  timestamp: string;
  actorName: string;
  action:
    | 'Created'
    | 'Scheduled'
    | 'Published'
    | 'Edited'
    | 'Expired'
    | 'Cancelled'
    | 'Image Added'
    | 'Image Removed'
    | 'Image Replaced';
  summary: string;
}

export interface NoticeItem {
  id: string;
  titleBn: string;
  titleEn: string;
  bodyBn: string;
  bodyEn: string;
  category: 'central' | 'exam' | 'holiday' | 'meeting' | 'event' | 'general';
  audience: 'all' | 'teachers' | 'guardians' | 'students';
  date: string;
  schoolId?: string;
  author: string;
  authorRole?: Role;
  authorId?: string;
  noticeType?: NoticeTypeCategory;
  status?: NoticeLifecycleStatus;
  audienceGroup?: NoticeAudienceGroup;
  targetClassNames?: string[];
  targetSections?: string[];
  targetUserIds?: string[];
  targetUserNames?: string[];
  images?: NoticeImageAttachment[];
  allowImageDownload?: boolean;
  scheduledAt?: string;
  expiresAt?: string;
  validityLabel?: string;
  isEmergency?: boolean;
  readByUserIds?: string[];
  history?: NoticeHistoryEntry[];
}

export type NotificationCategory =
  | 'notice'
  | 'academic'
  | 'exam_result'
  | 'routine'
  | 'message'
  | 'account'
  | 'system'
  | 'emergency';

export type NotificationPriority = 'normal' | 'important' | 'emergency';

export interface NotificationPreferences {
  notice: boolean;
  academic: boolean;
  exam_result: boolean;
  routine: boolean;
  message: boolean;
  account: boolean;
  system: boolean;
  emergency: boolean;
}

export interface NotificationItem {
  id: string;
  titleBn: string;
  titleEn: string;
  messageBn: string;
  messageEn: string;
  time: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'alert';
  roleTarget: Role | 'all';
  schoolId?: string;
  teacherId?: string;
  studentId?: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  isPinned?: boolean;
  createdAtIso?: string;
  dateLabel?: string;
  targetTab?: string;
  targetAcademicModule?: AcademicModuleId;
  targetNoticeId?: string;
  targetExamId?: string;
  targetStudentId?: string;
}

export interface AssignmentItem {
  id: string;
  studentId: string;
  titleBn: string;
  titleEn: string;
  subjectBn: string;
  subjectEn: string;
  className?: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'late';
  isHomework?: boolean;
  score?: number;
  maxScore?: number;
  feedback?: string;
}

export interface LeaveRequestItem {
  id: string;
  studentId: string;
  studentName: string;
  reasonType: string;
  dateRange: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface TeacherMessageItem {
  id: string;
  studentId: string;
  sender: 'guardian' | 'teacher';
  senderName: string;
  text: string;
  time: string;
}

// === Comprehensive Academic Management Types ===

export type AcademicModuleId =
  | 'academic_dashboard'
  | 'academic_year'
  | 'academic_calendar'
  | 'class_management'
  | 'subject_management'
  | 'teacher_assignment'
  | 'class_routine'
  | 'live_class_monitor'
  | 'todays_lessons'
  | 'curriculum'
  | 'syllabus'
  | 'lesson_management'
  | 'lesson_plan'
  | 'study_materials'
  | 'classwork'
  | 'homework'
  | 'assignment'
  | 'activity'
  | 'class_test'
  | 'question_bank'
  | 'question_paper'
  | 'exam'
  | 'exam_schedule'
  | 'continuous_assessment'
  | 'marks_entry'
  | 'grading_scheme'
  | 'result'
  | 'merit_ranking'
  | 'student_progress'
  | 'certificates'
  | 'learning_outcome'
  | 'remedial_class'
  | 'enrichment_learning'
  | 'project_management'
  | 'presentation_viva'
  | 'academic_promotion'
  | 'academic_reports';

export interface AcademicTermRecord {
  id: string;
  nameBn: string;
  nameEn: string;
  startDate: string;
  endDate: string;
  status: 'completed' | 'active' | 'upcoming';
}

export interface AcademicYearRecord {
  id: string;
  yearLabel: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isArchived: boolean;
  terms: AcademicTermRecord[];
  passRatePct: number;
  avgAttendancePct: number;
}

export type AcademicCalendarEventType =
  | 'academic_year'
  | 'term_semester'
  | 'class_start'
  | 'class_end'
  | 'exam'
  | 'holiday'
  | 'result_publication'
  | 'assignment_deadline'
  | 'school_event'
  | 'assessment_date';

export interface AcademicCalendarEvent {
  id: string;
  academicYearId: string;
  date: string;
  endDate?: string;
  type: AcademicCalendarEventType;
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
}

export interface ClassSectionRoomConfig {
  id: string;
  className: string;
  section: string;
  groupName?: string;
  roomNo: string;
  capacity: number;
  enrolledCount: number;
  classTeacherId: string;
  classTeacherName: string;
}

export interface AcademicSubjectConfig {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  classRange: string;
  weeklyPeriods: number;
  fullMarks: number;
  passMarks: number;
  type: 'Compulsory' | 'Elective' | 'Co-Curricular';
}

export interface TeacherSubjectAssignment {
  id: string;
  academicYear: string;
  teacherId: string;
  teacherName: string;
  subjectCode: string;
  subjectBn: string;
  subjectEn: string;
  className: string;
  section: string;
  weeklyPeriods: number;
  room: string;
  assignedBy: string;
  assignedDate: string;
}

export interface TeacherAttendanceLog {
  id: string;
  teacherId: string;
  date: string;
  status: 'present' | 'late' | 'leave' | 'not_checked_in';
  checkInTime?: string;
  checkOutTime?: string;
  note?: string;
}

export interface ClassworkStudentStatus {
  studentId: string;
  studentName: string;
  roll: number;
  status: 'completed' | 'pending' | 'not_submitted';
  score?: number;
  feedback?: string;
}

export interface ClassworkItem {
  id: string;
  date: string;
  className: string;
  section: string;
  subjectBn: string;
  subjectEn: string;
  teacherId: string;
  teacherName: string;
  titleBn: string;
  titleEn: string;
  topic: string;
  studentStatuses: ClassworkStudentStatus[];
}

export interface CurriculumUnit {
  id: string;
  subjectBn: string;
  subjectEn: string;
  className: string;
  totalChapters: number;
  completedChapters: number;
  syllabusTitleBn: string;
  learningOutcomesBn: string;
  targetMonth: string;
}

export interface LessonPlanItem {
  id: string;
  className: string;
  subjectBn: string;
  subjectEn: string;
  teacherId: string;
  teacherName: string;
  chapterTitle: string;
  lessonTopic: string;
  learningObjective: string;
  teachingMethod: string;
  durationMins: number;
  status: 'planned' | 'taught' | 'reviewed';
}

export interface StudyMaterialItem {
  id: string;
  titleBn: string;
  titleEn: string;
  className: string;
  subjectBn: string;
  subjectEn: string;
  materialType: 'PDF Note' | 'Worksheet' | 'Video Lesson' | 'Slide Deck';
  uploadedBy: string;
  uploadedDate: string;
}

export interface ClassTestQuizItem {
  id: string;
  titleBn: string;
  titleEn: string;
  className: string;
  subjectBn: string;
  subjectEn: string;
  date: string;
  totalMarks: number;
  avgScore: number;
  status: 'scheduled' | 'completed';
}

export interface QuestionBankItem {
  id: string;
  className: string;
  subjectBn: string;
  subjectEn: string;
  chapter: string;
  questionType: 'MCQ' | 'CQ / Written' | 'Short Answer';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionText: string;
  marks: number;
}

export interface ExamScheduleItem {
  id: string;
  examTitleBn: string;
  className: string;
  subjectBn: string;
  subjectEn: string;
  date: string;
  timeRange: string;
  room: string;
  invigilator: string;
}

export interface GradingRuleItem {
  id: string;
  minPercent: number;
  maxPercent: number;
  letterGrade: string;
  gradePoint: number;
  remarkBn: string;
  remarkEn: string;
}

export interface ExtraAcademicItem {
  id: string;
  category: 'activity' | 'remedial' | 'enrichment' | 'project' | 'viva' | 'competency';
  className: string;
  subjectBn: string;
  titleBn: string;
  titleEn: string;
  participantInfo: string;
  scheduleOrDue: string;
  status: 'active' | 'completed' | 'upcoming';
}

export interface SubstitutePermissionRecord {
  id: string;
  schoolId: string;
  slotId: string;
  className: string;
  section: string;
  subjectBn: string;
  subjectEn: string;
  ownerTeacherId: string;
  ownerTeacherName: string;
  substituteTeacherId: string;
  substituteTeacherName: string;
  date: string;
  timeRange: string;
  reason: string;
  durationDays: number;
  status: 'pending_admin' | 'approved' | 'revoked';
  createdAt: string;
  reviewedBy?: string;
}

export type DailyLessonStatus = 'pending' | 'completed' | 'submitted' | 'overdue';

export interface DailyLessonHomeworkItem {
  id: string;
  schoolId: string;
  academicYear: string;
  date: string;
  className: string;
  section: string;
  subjectBn: string;
  subjectEn: string;
  teacherId: string;
  teacherName: string;
  lessonTitleBn: string;
  lessonTitleEn: string;
  homeworkTextBn: string;
  homeworkTextEn: string;
  dueDate: string;
  attachmentLabel?: string;
  status: 'published' | 'draft';
  studentStates: Record<string, DailyLessonStatus>;
}

export interface SubjectResultSubmission {
  id: string;
  schoolId: string;
  academicYear: string;
  examId: string;
  className: string;
  subjectBn: string;
  subjectEn: string;
  teacherId: string;
  teacherName: string;
  status: 'pending' | 'submitted' | 'correction_requested' | 'verified';
  submittedAt?: string;
  verifiedBy?: string;
  correctionNote?: string;
}

export interface ResultAuditEntry {
  id: string;
  schoolId: string;
  examId: string;
  className: string;
  subjectEn: string;
  actorName: string;
  actorRole: Role;
  action:
    | 'marks_entered'
    | 'submitted'
    | 'correction_requested'
    | 'verified'
    | 'published'
    | 'unpublished'
    | 'central_locked'
    | 'central_unlocked';
  timestamp: string;
  note?: string;
}

export interface TeacherDailyTaskItem {
  id: string;
  titleBn: string;
  titleEn: string;
  type: 'checkin' | 'class' | 'homework' | 'marks' | 'report';
  status: 'pending' | 'in_progress' | 'completed';
  slotId?: string;
}

export interface TeacherPerformanceMetrics {
  teacherId: string;
  attendancePct: number;
  onTimeStartPct: number;
  classCompletionPct: number;
  homeworkSubmissionPct: number;
  adminEvaluationPct: number;
  overallScorePct: number;
}

export interface GlobalAcademicSearchResult {
  id: string;
  category: 'student' | 'result' | 'assignment' | 'routine' | 'lesson' | 'teacher_assignment' | 'report';
  title: string;
  subtitle: string;
  targetRoleTab?: string;
  targetModule?: AcademicModuleId;
  contextClass?: string;
  contextSubjectEn?: string;
  studentId?: string;
}

export interface AcademicFavoriteItem {
  id: string;
  moduleId: AcademicModuleId;
  labelBn: string;
  labelEn: string;
}

export type AcademicCancelClassReason =
  | 'Teacher Unavailable'
  | 'Emergency'
  | 'Student Issue'
  | 'Technical Problem'
  | 'School Activity'
  | 'Other';

export type AcademicRecordCategory =
  | 'standard'
  | 'result'
  | 'marks'
  | 'exam'
  | 'attendance'
  | 'document';

export type AcademicSecondaryAction =
  | 'change'
  | 'replace'
  | 'duplicate'
  | 'suspend'
  | 'approve'
  | 'cancel'
  | 'lock'
  | 'unlock'
  | 'correction_request'
  | 'void'
  | 'archive'
  | 'history'
  | 'download'
  | 'print'
  | 'delete';

// === Master Routine Management System Types ===

export type RoutineType = 'weekly' | 'monthly' | 'annual';
export type RoutineStatus = 'Draft' | 'Published' | 'Active' | 'Expired' | 'Archived';

export interface RoutineDayConfig {
  id: string;
  nameBn: string;
  nameEn: string;
  shortCode: string;
  order: number;
  isActive: boolean;
}

export interface RoutinePeriodConfig {
  id: string;
  periodNumber: number;
  nameBn: string;
  nameEn: string;
  startTime: string; // HH:MM (24h, e.g. "09:30")
  endTime: string;   // HH:MM (24h, e.g. "10:15")
  durationMins: number;
}

export interface RoutineCellSchedule {
  id: string;
  dayId: string;
  periodId: string;
  className: string;
  section: string;
  subjectBn: string;
  subjectEn: string;
  teacherId: string;
  teacherName: string;
  room: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  note?: string;
}

export interface RoutineVersionSnapshot {
  versionNumber: number;
  savedAt: string;
  savedBy: string;
  status: RoutineStatus;
  summaryNote: string;
  days: RoutineDayConfig[];
  periods: RoutinePeriodConfig[];
  schedules: RoutineCellSchedule[];
}

export interface MasterRoutineRecord {
  id: string;
  schoolId: string;
  titleBn: string;
  titleEn: string;
  routineType: RoutineType;
  academicYear: string;
  month?: string;
  className: string;
  section: string;
  status: RoutineStatus;
  isTemporary?: boolean;
  startDate?: string;
  endDate?: string;
  previousActiveRoutineId?: string;
  version: number;
  versions: RoutineVersionSnapshot[];
  days: RoutineDayConfig[];
  periods: RoutinePeriodConfig[];
  schedules: RoutineCellSchedule[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export type RoutineConflictKind =
  | 'teacher_conflict'
  | 'class_conflict'
  | 'room_conflict'
  | 'duplicate_schedule'
  | 'missing_teacher'
  | 'missing_subject'
  | 'missing_time'
  | 'invalid_time';

export interface RoutineConflict {
  kind: RoutineConflictKind;
  messageBn: string;
  messageEn: string;
  cellId?: string;
  conflictingRoutineTitle?: string;
}

// === Official Document, Certificate, Marksheet & ID Card Generation Types ===

export type StudentOfficialDocType =
  | 'prottoyon_patro'
  | 'transfer_certificate'
  | 'testimonial'
  | 'character_certificate'
  | 'studentship_certificate'
  | 'student_id_card'
  | 'marksheet'
  | 'progress_report'
  | 'result_certificate'
  | 'admission_certificate'
  | 'scholarship_certificate'
  | 'participation_certificate'
  | 'achievement_certificate'
  | 'study_completion_certificate'
  | 'other_student_certificate';

export type TeacherOfficialDocType =
  | 'teacher_id_card'
  | 'employment_certificate'
  | 'working_certificate'
  | 'experience_certificate'
  | 'teacher_testimonial'
  | 'release_certificate'
  | 'training_certificate'
  | 'other_teacher_document';

export type OfficialDocumentType = StudentOfficialDocType | TeacherOfficialDocType;
export type OfficialDocumentCategory = 'student' | 'teacher';
export type OfficialDocumentMode = 'auto' | 'template' | 'manual';
export type OfficialDocumentStatus =
  | 'Draft'
  | 'Generated'
  | 'Pending Approval'
  | 'Approved'
  | 'Issued'
  | 'Rejected'
  | 'Cancelled'
  | 'Reissued';

export interface OfficialDocumentAuditEntry {
  id: string;
  timestamp: string;
  actorName: string;
  action: string;
  status: OfficialDocumentStatus;
  note?: string;
}

export interface OfficialDocumentTemplate {
  id: string;
  docType: OfficialDocumentType;
  category: OfficialDocumentCategory;
  nameBn: string;
  nameEn: string;
  bodyTemplate: string;
  lockedPlaceholders: string[];
  prefixCode: string;
}

export interface OfficialDocumentRecord {
  id: string;
  documentNumber: string;
  qrVerifyCode: string;
  category: OfficialDocumentCategory;
  docType: OfficialDocumentType;
  docTitleBn: string;
  docTitleEn: string;
  mode: OfficialDocumentMode;
  status: OfficialDocumentStatus;
  schoolId: string;
  schoolNameBn: string;
  targetEntityId: string;
  targetPermanentId: string;
  targetNameBn: string;
  targetNameEn: string;
  targetMetaSummary: string;
  renderedBody: string;
  customRemarks?: string;
  lockedSystemSnapshot: Record<string, string>;
  issueDate: string;
  issuedBy: string;
  approvedBy?: string;
  reissueOfDocNumber?: string;
  reissueCount?: number;
  cancelReason?: string;
  auditHistory: OfficialDocumentAuditEntry[];
}

// === Exam Routine Management System Types ===

export type ExamRoutineStatus = 'Draft' | 'Approved' | 'Published' | 'Archived';

export interface ExamRoutineSlot {
  id: string;
  subjectBn: string;
  subjectEn: string;
  examDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  durationMins: number;
  fullMarks: number;
  room: string;
  seatAllocation: string;
  invigilatorTeacherId: string;
  invigilatorTeacherName: string;
  examType: 'Written' | 'MCQ' | 'Oral' | 'Practical';
}

export interface ExamRoutineConflict {
  kind: 'invigilator_conflict' | 'room_conflict' | 'class_section_conflict' | 'teacher_double_duty' | 'invalid_time';
  messageBn: string;
  messageEn: string;
  slotId?: string;
}

export interface ExamRoutineRecord {
  id: string;
  schoolId: string;
  academicYear: string;
  examId: string;
  examTitleBn: string;
  examTitleEn: string;
  className: string;
  section: string;
  status: ExamRoutineStatus;
  slots: ExamRoutineSlot[];
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}


