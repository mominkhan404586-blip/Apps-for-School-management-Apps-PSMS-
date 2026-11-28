import type { Language } from '../types';

export const labels = {
  // Brand & Role titles
  centralTitle: { bn: 'প্রাথমিক ও মাধ্যমিক শিক্ষা কেন্দ্রীয় প্রশাসন', en: 'Central Education Administration' },
  centralSubtitle: { bn: 'Primary & Secondary Education Management System', en: 'Primary & Secondary Education Management System' },
  schoolTitle: { bn: 'বিদ্যালয় ব্যবস্থাপনা ড্যাশবোর্ড', en: 'School Management Dashboard' },
  schoolSubtitle: { bn: 'প্রাতিষ্ঠানিক পোর্টাল', en: 'Institutional Portal' },
  guardianTitle: { bn: 'শিক্ষা ব্যবস্থাপনা পোর্টাল', en: 'Education Management Portal' },
  guardianSubtitle: { bn: 'অভিভাবক (Parent) ও প্রতিষ্ঠান পোর্টাল', en: 'Parent & School Portal' },

  // Common Header
  searchPlaceholder: { bn: 'বিদ্যালয়, শিক্ষার্থী ID, শিক্ষক বা নোটিশ খুঁজুন...', en: 'Search schools, student ID, teachers or notices...' },
  mainMenu: { bn: 'প্রধান মেনু', en: 'Main Menu' },
  centralControl: { bn: 'কেন্দ্রীয় নিয়ন্ত্রণ', en: 'Central Control' },
  selectChild: { bn: 'সন্তান নির্বাচন', en: 'Select Child' },
  switchRole: { bn: 'রোল পরিবর্তন', en: 'Switch Role' },
  notifications: { bn: 'নোটিফিকেশন', en: 'Notifications' },
  markAllRead: { bn: 'সব পঠিত করুন', en: 'Mark all read' },
  profile: { bn: 'প্রোফাইল', en: 'Profile' },
  loginPortal: { bn: 'লগইন / অ্যাকাউন্ট পরীক্ষা', en: 'Login / Switch Account' },
  logout: { bn: 'লগআউট', en: 'Logout' },
  onlineMode: { bn: 'অনলাইন', en: 'Online' },
  offlineMode: { bn: 'অফলাইন কিউ', en: 'Offline Queue' },
  viewDetails: { bn: 'বিস্তারিত দেখুন', en: 'View details' },
  approve: { bn: 'অনুমোদন', en: 'Approve' },
  verify: { bn: 'যাচাই করুন', en: 'Verify' },
  suspend: { bn: 'স্থগিত করুন', en: 'Suspend' },
  edit: { bn: 'সম্পাদনা', en: 'Edit' },
  delete: { bn: 'মুছুন', en: 'Delete' },
  cancel: { bn: 'বাতিল', en: 'Cancel' },
  confirm: { bn: 'নিশ্চিত করুন', en: 'Confirm' },
  save: { bn: 'সংরক্ষণ করুন', en: 'Save' },
  close: { bn: 'বন্ধ করুন', en: 'Close' },
  exportCsv: { bn: 'CSV ডাউনলোড', en: 'Export CSV' },
  print: { bn: 'প্রিন্ট / PDF', en: 'Print / PDF' },

  // Roles
  roleCentral: { bn: 'Super Central Admin', en: 'Super Central Admin' },
  roleSchool: { bn: 'School Admin', en: 'School Admin' },
  roleGuardian: { bn: 'অভিভাবক (Parent)', en: 'Parent' },
} as const;

export function tr(key: keyof typeof labels, lang: Language): string {
  return labels[key][lang];
}

export function b(bn: string, en: string, lang: Language): string {
  return lang === 'bn' ? bn : en;
}
