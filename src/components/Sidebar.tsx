import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Megaphone,
  BarChart3,
  Shield,
  KeyRound,
  Archive,
  ClipboardList,
  CheckCircle2,
  ShieldCheck,
  Bell,
  CalendarDays,
  Clock,
  FileText,
  HelpCircle,
  Wallet,
  HeartPulse,
  Sparkles,
  MessageSquare,
  FolderOpen,
  User,
  Home,
  Award,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Layers,
  Camera,
  Download,
  Settings,
} from 'lucide-react';
import type { Language, Role, SchoolRecord, StudentRecord, TeacherRecord } from '../types';
import type { DeviceViewMode } from '../utils/devicePreviewEngine';
import { AVATARS } from '../data/mockData';
import { b, tr } from '../i18n/translations';

export interface NavItem {
  id: string;
  labelBn: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: 'main' | 'control' | 'footer';
}

export const CENTRAL_ADMIN_NAV: NavItem[] = [
  { id: 'dashboard', labelBn: 'Dashboard', labelEn: 'Dashboard', icon: LayoutDashboard, section: 'main' },
  { id: 'schools', labelBn: 'বিদ্যালয় ব্যবস্থাপনা', labelEn: 'Schools Management', icon: Building2, section: 'main' },
  { id: 'locations', labelBn: 'লোকেশন ডাটাবেজ (BD)', labelEn: 'Location Database', icon: MapPin, section: 'main' },
  { id: 'teachers', labelBn: 'শিক্ষক অনুমোদন ও তালিকা', labelEn: 'Teacher Approvals', icon: Users, section: 'main' },
  { id: 'students', labelBn: 'শিক্ষার্থী ব্যবস্থাপনা', labelEn: 'Students Directory', icon: GraduationCap, section: 'main' },
  { id: 'academics', labelBn: 'একাডেমিক ব্যবস্থাপনা', labelEn: 'Academic System', icon: BookOpen, section: 'main' },
  { id: 'exams', labelBn: 'পরীক্ষা ও পরীক্ষার রুটিন', labelEn: 'Exams & Routines', icon: Award, section: 'main' },
  { id: 'documents', labelBn: 'অফিশিয়াল ডকুমেন্ট ও সনদ', labelEn: 'Official Documents', icon: FolderOpen, section: 'main' },
  { id: 'notices', labelBn: 'নোটিশ ও যোগাযোগ', labelEn: 'Notices & Messaging', icon: Megaphone, section: 'main' },
  { id: 'reports', labelBn: 'রিপোর্ট ও মনিটরিং', labelEn: 'Reports & Monitoring', icon: BarChart3, section: 'main' },
  { id: 'security', labelBn: 'Security & Account', labelEn: 'Security & Account', icon: Shield, section: 'main' },
  { id: 'permissions', labelBn: 'Permission System', labelEn: 'Permission System', icon: KeyRound, section: 'main' },
  { id: 'architecture', labelBn: 'সিস্টেম আর্কিটেকচার', labelEn: 'System Blueprint', icon: Layers, section: 'main' },
  { id: 'archive', labelBn: 'Delete / Archive', labelEn: 'Delete / Archive', icon: Archive, section: 'main' },
  { id: 'audit', labelBn: 'Audit Log', labelEn: 'Audit Log', icon: ClipboardList, section: 'main' },
  { id: 'approval', labelBn: 'Approval Center', labelEn: 'Approval Center', icon: CheckCircle2, section: 'control' },
  { id: 'verification', labelBn: 'Verification Center', labelEn: 'Verification Center', icon: ShieldCheck, section: 'control' },
  { id: 'notifications', labelBn: 'Notification Center', labelEn: 'Notification Center', icon: Bell, section: 'control' },
  { id: 'settings', labelBn: 'Settings (সেটিংস)', labelEn: 'Settings', icon: Settings, section: 'footer' },
];

export const SCHOOL_ADMIN_NAV: NavItem[] = [
  { id: 'dashboard', labelBn: 'Dashboard', labelEn: 'Dashboard', icon: LayoutDashboard, section: 'main' },
  { id: 'academics', labelBn: 'একাডেমিক ম্যানেজমেন্ট', labelEn: 'Academic Management', icon: BookOpen, section: 'main' },
  { id: 'students', labelBn: 'শিক্ষার্থী তথ্য', labelEn: 'Students', icon: GraduationCap, section: 'main' },
  { id: 'teachers', labelBn: 'শিক্ষক ব্যবস্থাপনা ও যোগদান', labelEn: 'Teachers & Join Requests', icon: Users, section: 'main' },
  { id: 'school', labelBn: 'বিদ্যালয় ব্যবস্থাপনা', labelEn: 'School Profile', icon: Building2, section: 'main' },
  { id: 'classes', labelBn: 'ক্লাস ব্যবস্থাপনা', labelEn: 'Classes & Sections', icon: Home, section: 'main' },
  { id: 'routine', labelBn: 'রুটিন ও লাইভ ক্লাস', labelEn: 'Routine & Live Classes', icon: CalendarDays, section: 'main' },
  { id: 'subjects', labelBn: 'বিষয় ব্যবস্থাপনা', labelEn: 'Subjects', icon: BookOpen, section: 'main' },
  { id: 'lessons', labelBn: 'Classwork ও পাঠ', labelEn: 'Classwork & Lessons', icon: FileText, section: 'main' },
  { id: 'exams', labelBn: 'পরীক্ষা ও পরীক্ষার রুটিন', labelEn: 'Exams & Exam Routine', icon: ClipboardList, section: 'main' },
  { id: 'results', labelBn: 'ফলাফল ও সনদ', labelEn: 'Results & Certificates', icon: Award, section: 'main' },
  { id: 'attendance', labelBn: 'উপস্থিতি ও Kiosk', labelEn: 'Attendance & Kiosk', icon: Clock, section: 'main' },
  { id: 'finance', labelBn: 'আর্থিক ও ফি ব্যবস্থাপনা', labelEn: 'Fees & Finance', icon: Wallet, section: 'main' },
  { id: 'health', labelBn: 'স্বাস্থ্য ও উপবৃত্তি', labelEn: 'Health & Stipend', icon: HeartPulse, section: 'main' },
  { id: 'notices', labelBn: 'নোটিশ ও SMS', labelEn: 'Notices & SMS', icon: Megaphone, section: 'main' },
  { id: 'notifications', labelBn: 'Notification Center', labelEn: 'Notification Center', icon: Bell, section: 'main' },
  { id: 'events', labelBn: 'একাডেমিক ক্যালেন্ডার', labelEn: 'Academic Calendar', icon: CalendarDays, section: 'main' },
  { id: 'documents', labelBn: 'অফিশিয়াল ডকুমেন্ট ও সনদ', labelEn: 'Official Documents & Backup', icon: FolderOpen, section: 'main' },
  { id: 'ai_insights', labelBn: 'AI স্মার্ট বিশ্লেষণ', labelEn: 'AI School Insights', icon: Sparkles, section: 'main' },
  { id: 'reports', labelBn: 'একাডেমিক রিপোর্ট (১৪)', labelEn: 'Academic Reports', icon: BarChart3, section: 'main' },
  { id: 'security', labelBn: 'Security & Account', labelEn: 'Security & Account', icon: Shield, section: 'main' },
  { id: 'audit', labelBn: 'Audit Log', labelEn: 'Audit Log', icon: ClipboardList, section: 'main' },
  { id: 'support', labelBn: 'Support Center', labelEn: 'Support Center', icon: HelpCircle, section: 'footer' },
  { id: 'settings', labelBn: 'Settings (সেটিংস)', labelEn: 'Settings', icon: Settings, section: 'footer' },
];

export const TEACHER_NAV: NavItem[] = [
  { id: 'dashboard', labelBn: 'Dashboard', labelEn: 'Dashboard', icon: LayoutDashboard, section: 'main' },
  { id: 'my_work', labelBn: 'My Work (আজকের কাজ)', labelEn: 'My Work', icon: CheckCircle2, section: 'main' },
  { id: 'my_classes', labelBn: 'My Classes (শ্রেণি ও স্বত্ব)', labelEn: 'My Classes', icon: Home, section: 'main' },
  { id: 'my_students', labelBn: 'আমার শিক্ষার্থী ও ভর্তি', labelEn: 'My Students & Admission', icon: GraduationCap, section: 'main' },
  { id: 'teaching', labelBn: 'Teaching (আজকের পড়া ও পাঠ)', labelEn: 'Teaching & Lessons', icon: BookOpen, section: 'main' },
  { id: 'attendance', labelBn: 'Auto ID Attendance', labelEn: 'Auto ID Attendance', icon: Clock, section: 'main' },
  { id: 'assessment', labelBn: 'Assessment (নম্বর ও পরীক্ষা)', labelEn: 'Assessment & Marks', icon: Award, section: 'main' },
  { id: 'exam_routine', labelBn: 'পরীক্ষার রুটিন ও ডিউটি', labelEn: 'Exam Routine & Duties', icon: ClipboardList, section: 'main' },
  { id: 'progress', labelBn: 'Student Progress', labelEn: 'Student Progress', icon: TrendingUp, section: 'main' },
  { id: 'my_routine', labelBn: 'My Routine', labelEn: 'My Routine', icon: CalendarDays, section: 'main' },
  { id: 'live_classes', labelBn: 'Live Class Session', labelEn: 'Live Classes', icon: Clock, section: 'main' },
  { id: 'my_documents', labelBn: 'অফিশিয়াল ডকুমেন্ট ও সনদ', labelEn: 'Official Documents', icon: FolderOpen, section: 'main' },
  { id: 'join_schools', labelBn: 'বিদ্যালয়ে যোগদান ও সুইচ', labelEn: 'Join & Switch Schools', icon: Building2, section: 'main' },
  { id: 'notices', labelBn: 'নোটিশ ও যোগাযোগ', labelEn: 'Notices & Communication', icon: Megaphone, section: 'main' },
  { id: 'notifications', labelBn: 'Notification Center', labelEn: 'Notification Center', icon: Bell, section: 'main' },
  { id: 'reports', labelBn: 'Reports', labelEn: 'Reports', icon: BarChart3, section: 'main' },
  { id: 'settings', labelBn: 'Settings', labelEn: 'Settings', icon: Shield, section: 'footer' },
];

export const STUDENT_NAV: NavItem[] = [
  { id: 'dashboard', labelBn: 'Dashboard', labelEn: 'Dashboard', icon: LayoutDashboard, section: 'main' },
  { id: 'todays_lessons', labelBn: 'আজকের পড়া ও Homework', labelEn: "Today's Lessons", icon: BookOpen, section: 'main' },
  { id: 'classes', labelBn: 'My Classes', labelEn: 'My Classes', icon: Home, section: 'main' },
  { id: 'routine', labelBn: 'Routine', labelEn: 'Routine', icon: CalendarDays, section: 'main' },
  { id: 'lessons', labelBn: 'Lessons & Syllabus', labelEn: 'Lessons & Syllabus', icon: Layers, section: 'main' },
  { id: 'classwork', labelBn: 'Classwork', labelEn: 'Classwork', icon: FileText, section: 'main' },
  { id: 'homework', labelBn: 'Homework', labelEn: 'Homework', icon: ClipboardList, section: 'main' },
  { id: 'assignment', labelBn: 'Assignment', labelEn: 'Assignment', icon: CheckCircle2, section: 'main' },
  { id: 'assessment', labelBn: 'Exams & Assessment', labelEn: 'Assessment', icon: Clock, section: 'main' },
  { id: 'results', labelBn: 'Results & Marksheet', labelEn: 'Results & Marksheet', icon: Award, section: 'main' },
  { id: 'progress', labelBn: 'Academic Progress', labelEn: 'Progress', icon: TrendingUp, section: 'main' },
  { id: 'ranking', labelBn: 'Merit & Ranking', labelEn: 'Ranking', icon: Sparkles, section: 'main' },
  { id: 'documents', labelBn: 'ID Card & Documents', labelEn: 'Documents', icon: FolderOpen, section: 'main' },
  { id: 'notices', labelBn: 'স্কুল ও শ্রেণি নোটিশ', labelEn: 'Notices & Circulars', icon: Megaphone, section: 'main' },
  { id: 'notifications', labelBn: 'Notification Center', labelEn: 'Notification Center', icon: Bell, section: 'main' },
  { id: 'profile', labelBn: 'আমার Profile', labelEn: 'My Profile', icon: User, section: 'main' },
  { id: 'settings', labelBn: 'Settings (সেটিংস)', labelEn: 'Settings', icon: Settings, section: 'footer' },
];

export const GUARDIAN_NAV: NavItem[] = [
  { id: 'dashboard', labelBn: 'ড্যাশবোর্ড', labelEn: 'Dashboard', icon: LayoutDashboard, section: 'main' },
  { id: 'child', labelBn: 'আমার সন্তান', labelEn: 'My Child', icon: GraduationCap, section: 'main' },
  { id: 'todays_lessons', labelBn: 'আজকের পড়া ও Homework', labelEn: "Today's Lessons", icon: BookOpen, section: 'main' },
  { id: 'routine', labelBn: 'ক্লাস রুটিন', labelEn: 'Class Routine', icon: CalendarDays, section: 'main' },
  { id: 'attendance', labelBn: 'উপস্থিতি ও ছুটি', labelEn: 'Attendance & Leave', icon: Clock, section: 'main' },
  { id: 'homework', labelBn: 'Homework', labelEn: 'Homework', icon: Home, section: 'main' },
  { id: 'assignments', labelBn: 'Assignment', labelEn: 'Assignments', icon: FileText, section: 'main' },
  { id: 'exams', labelBn: 'পরীক্ষা', labelEn: 'Examinations', icon: ClipboardList, section: 'main' },
  { id: 'results', labelBn: 'ফলাফল ও মার্কশিট', labelEn: 'Results & Marksheet', icon: Award, section: 'main' },
  { id: 'progress', labelBn: 'Academic Progress', labelEn: 'Academic Progress', icon: TrendingUp, section: 'main' },
  { id: 'fees', labelBn: 'ফি ও পেমেন্ট', labelEn: 'Fees & Payments', icon: Wallet, section: 'main' },
  { id: 'documents', labelBn: 'সার্টিফিকেট ও ডকুমেন্ট', labelEn: 'Documents', icon: FolderOpen, section: 'main' },
  { id: 'notices', labelBn: 'নোটিশ ও বিজ্ঞপ্তি', labelEn: 'Notices', icon: Megaphone, section: 'main' },
  { id: 'notifications', labelBn: 'Notification Center', labelEn: 'Notification Center', icon: Bell, section: 'main' },
  { id: 'messages', labelBn: 'শিক্ষকের সাথে যোগাযোগ', labelEn: 'Teacher Contact', icon: MessageSquare, section: 'main' },
  { id: 'school_info', labelBn: 'বিদ্যালয়ের তথ্য ও পাঠ্যবই', labelEn: 'School Info & Materials', icon: Building2, section: 'main' },
  { id: 'profile', labelBn: 'আমার Profile', labelEn: 'My Profile', icon: User, section: 'main' },
  { id: 'support', labelBn: 'Help & Support', labelEn: 'Help & Support', icon: HelpCircle, section: 'footer' },
  { id: 'settings', labelBn: 'Settings (সেটিংস)', labelEn: 'Settings', icon: Settings, section: 'footer' },
];

interface SidebarProps {
  role: Role;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  lang: Language;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  activeSchool?: SchoolRecord;
  activeStudent?: StudentRecord;
  activeGuardianChild?: StudentRecord;
  activeTeacher?: TeacherRecord;
  onOpenContactAdmin?: () => void;
  onOpenAppDownloadAndShare?: () => void;
  onOpenPhotoEditor?: () => void;
  previewViewMode?: DeviceViewMode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  activeTab,
  onSelectTab,
  lang,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  activeSchool,
  activeStudent,
  activeGuardianChild,
  activeTeacher,
  onOpenContactAdmin,
  onOpenAppDownloadAndShare,
  onOpenPhotoEditor,
  previewViewMode = 'auto',
}) => {
  const items =
    role === 'central_admin'
      ? CENTRAL_ADMIN_NAV
      : role === 'school_admin'
        ? SCHOOL_ADMIN_NAV
        : role === 'teacher'
          ? TEACHER_NAV
          : role === 'student'
            ? STUDENT_NAV
            : GUARDIAN_NAV;

  const mainItems = items.filter((i) => i.section === 'main');
  const controlItems = items.filter((i) => i.section === 'control');
  const footerItems = items.filter((i) => i.section === 'footer');

  // Deep Navy sidebar specifically for School Admin matching reference
  const isNavySidebar = role === 'school_admin';
  const studentIdentity =
    role === 'student' ? activeStudent : role === 'guardian' ? activeGuardianChild : undefined;

  const getActiveNavClass = () => {
    if (role === 'central_admin' || role === 'teacher') {
      return 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm';
    }
    if (role === 'school_admin') {
      return 'bg-blue-600 text-white shadow-sm';
    }
    return 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm';
  };

  const renderItem = (item: NavItem, isMobile = false) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const text = b(item.labelBn, item.labelEn, lang);

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          onSelectTab(item.id);
          if (isMobile) onCloseMobile();
        }}
        title={collapsed && !isMobile ? text : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
          isActive
            ? getActiveNavClass()
            : isNavySidebar
              ? 'text-slate-300 hover:bg-white/10 hover:text-white'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
        } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {(!collapsed || isMobile) && <span className="truncate">{text}</span>}
      </button>
    );
  };

  const sidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full">
      {/* Top Collapse Header */}
      <div
        className={`flex items-center justify-between px-3 py-3 border-b ${
          isNavySidebar ? 'border-white/10' : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        {(!collapsed || isMobile) && (
          <span
            className={`text-xs font-semibold tracking-wide ${
              isNavySidebar ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {tr('mainMenu', lang)}
          </span>
        )}
        {isMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className={`p-1.5 rounded-lg ${
              isNavySidebar
                ? 'text-slate-300 hover:bg-white/10'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`p-1.5 rounded-lg cursor-pointer ${
              isNavySidebar
                ? 'text-slate-300 hover:bg-white/10'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            } ${collapsed ? 'mx-auto' : ''}`}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Role-Specific Sidebar Identity Card */}
      {(!collapsed || isMobile) && role === 'school_admin' && activeSchool && (
        <div className="mx-3 mt-3 mb-1 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src={activeSchool.headTeacherPhotoUrl || AVATARS.headTeacher}
              alt={activeSchool.headTeacher}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400/70"
            />
            {onOpenPhotoEditor && (
              <button
                type="button"
                onClick={onOpenPhotoEditor}
                title={b('ছবি পরিবর্তন', 'Edit Photo', lang)}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center border border-[#0f1f3d] cursor-pointer"
              >
                <Camera className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">{activeSchool.headTeacher}</div>
            <div className="text-[11px] text-emerald-300 truncate">{activeSchool.nameBn}</div>
            <div className="text-[10px] font-mono text-slate-400">
              {activeSchool.schoolPublicId ?? activeSchool.code}
            </div>
          </div>
        </div>
      )}

      {(!collapsed || isMobile) && studentIdentity && (
        <div className="mx-3 mt-3 mb-1 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-center space-y-2">
          <div className="relative w-14 h-14 mx-auto">
            <img
              src={studentIdentity.photoUrl || AVATARS.studentRahim}
              alt={studentIdentity.nameEn}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-full object-cover border-2 border-blue-500"
            />
            {onOpenPhotoEditor && (
              <button
                type="button"
                onClick={onOpenPhotoEditor}
                title={b('ছবি পরিবর্তন', 'Edit Photo', lang)}
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center border-2 border-white dark:border-slate-800 shadow cursor-pointer"
              >
                <Camera className="w-3 h-3" />
              </button>
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {b(studentIdentity.nameBn, studentIdentity.nameEn, lang)}
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              ID: {studentIdentity.permanentId}
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-700 text-white text-[11px] font-semibold">
            <span>{studentIdentity.className}</span>
            <span>|</span>
            <span>{studentIdentity.section}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {b('রোল:', 'Roll:', lang)} {studentIdentity.roll} · AY 2026
          </div>
        </div>
      )}

      {(!collapsed || isMobile) && role === 'teacher' && activeTeacher && (
        <div className="mx-3 mt-3 mb-1 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 flex items-center gap-2.5">
          <div className="relative shrink-0">
            <img
              src={activeTeacher.photoUrl || AVATARS.headTeacher}
              alt={activeTeacher.nameEn}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-emerald-500"
            />
            {onOpenPhotoEditor && (
              <button
                type="button"
                onClick={onOpenPhotoEditor}
                title={b('ছবি পরিবর্তন', 'Edit Photo', lang)}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center border border-white dark:border-slate-900 cursor-pointer"
              >
                <Camera className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {b(activeTeacher.nameBn, activeTeacher.nameEn, lang)}
            </div>
            <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 truncate">
              {activeTeacher.teacherCode}
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-2.5 space-y-1" aria-label="Role Navigation">
        {mainItems.map((i) => renderItem(i, isMobile))}

        {controlItems.length > 0 && (
          <div
            className={`pt-3 mt-3 border-t space-y-1 ${
              isNavySidebar ? 'border-white/10' : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            {(!collapsed || isMobile) && (
              <div
                className={`px-3 pb-1 text-[11px] font-semibold ${
                  isNavySidebar ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tr('centralControl', lang)}
              </div>
            )}
            {controlItems.map((i) => renderItem(i, isMobile))}
          </div>
        )}
      </nav>

      {(footerItems.length > 0 || onOpenContactAdmin || onOpenAppDownloadAndShare) && (
        <div
          className={`p-2.5 border-t space-y-1 ${
            isNavySidebar ? 'border-white/10' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          {onOpenAppDownloadAndShare && (
            <button
              type="button"
              data-testid="sidebar-apps-download-share-btn"
              onClick={() => {
                onOpenAppDownloadAndShare();
                if (isMobile) onCloseMobile();
              }}
              title={collapsed && !isMobile ? b('অ্যাপস ডাউনলোড ও শেয়ার করুন', 'Download Apps & Share', lang) : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                isNavySidebar
                  ? 'bg-blue-600/20 text-blue-200 hover:bg-blue-600/35 hover:text-white border border-blue-400/25'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/70 dark:border-blue-800/60'
              } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`}
            >
              <Download className="w-4 h-4 shrink-0" />
              {(!collapsed || isMobile) && (
                <span className="truncate">{b('অ্যাপস ডাউনলোড ও শেয়ার', 'Download Apps & Share', lang)}</span>
              )}
            </button>
          )}
          {footerItems.map((i) => renderItem(i, isMobile))}
          {onOpenContactAdmin && (
            <button
              type="button"
              onClick={() => {
                onOpenContactAdmin();
                if (isMobile) onCloseMobile();
              }}
              title={collapsed && !isMobile ? b('Admin-এর সাথে যোগাযোগ', 'Contact Admin', lang) : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                isNavySidebar
                  ? 'text-teal-300 hover:bg-white/10 hover:text-white'
                  : 'text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30'
              } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              {(!collapsed || isMobile) && (
                <span className="truncate">{b('Admin-এর সাথে যোগাযোগ', 'Contact Admin', lang)}</span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden in Mobile preview mode in favor of BottomNavigation) */}
      <aside
        className={`${
          previewViewMode === 'mobile' ? 'hidden' : 'hidden lg:flex'
        } flex-col shrink-0 border-r transition-[width] duration-200 no-print ${
          isNavySidebar
            ? 'bg-[#0f1f3d] dark:bg-slate-950 border-slate-800 text-slate-200'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        } ${collapsed ? 'w-[72px]' : 'w-64'}`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile Slide-Out Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            className={`relative w-72 max-w-[85vw] h-full border-r z-10 shadow-xl ${
              isNavySidebar
                ? 'bg-[#0f1f3d] dark:bg-slate-950 border-slate-800 text-slate-200'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            {sidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
