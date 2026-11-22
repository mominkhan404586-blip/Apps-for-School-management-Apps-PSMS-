import type {
  AddressSelection,
  BdLocationDatabase,
  RecordStatus,
  SchoolTypeCode,
  StudentRecord,
} from '../types';

export interface SchoolTypeOption {
  code: SchoolTypeCode;
  labelBn: string;
  labelEn: string;
}

export const SCHOOL_TYPE_OPTIONS: SchoolTypeOption[] = [
  { code: 'KINDERGARTEN', labelBn: 'কিন্ডারগার্টেন', labelEn: 'Kindergarten' },
  { code: 'MADRASA', labelBn: 'মাদ্রাসা', labelEn: 'Madrasa' },
  { code: 'PRIMARY', labelBn: 'প্রাথমিক বিদ্যালয়', labelEn: 'Primary School' },
  { code: 'SECONDARY', labelBn: 'মাধ্যমিক বিদ্যালয়', labelEn: 'Secondary School' },
  { code: 'PRIMARY_SECONDARY', labelBn: 'প্রাথমিক ও মাধ্যমিক বিদ্যালয়', labelEn: 'Primary & Secondary School' },
  { code: 'OTHER', labelBn: 'অন্যান্য', labelEn: 'Other' },
];

export interface SchoolTypeConfiguration {
  code: SchoolTypeCode;
  labelBn: string;
  labelEn: string;
  defaultClasses: string[];
  sectionsStructure: { titleBn: string; titleEn: string; classes: string[] }[];
  subjects: { code: string; nameBn: string; nameEn: string; weeklyPeriods: number }[];
  applicableModules: string[];
  excludedDescriptionBn: string;
  excludedDescriptionEn: string;
}

export function getSchoolTypeConfig(
  schoolType: SchoolTypeCode,
  customClasses?: string[]
): SchoolTypeConfiguration {
  switch (schoolType) {
    case 'PRIMARY':
      return {
        code: 'PRIMARY',
        labelBn: 'প্রাথমিক বিদ্যালয়',
        labelEn: 'Primary School',
        defaultClasses: customClasses?.length
          ? customClasses
          : ['Pre-Primary', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'],
        sectionsStructure: [
          {
            titleBn: 'প্রাথমিক স্তর (Pre-Primary – Class 5)',
            titleEn: 'Primary Section (Pre-Primary – Class 5)',
            classes: ['Pre-Primary', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'],
          },
        ],
        subjects: [
          { code: 'PRI-101', nameBn: 'বাংলা', nameEn: 'Bangla', weeklyPeriods: 6 },
          { code: 'PRI-102', nameBn: 'ইংরেজি', nameEn: 'English', weeklyPeriods: 6 },
          { code: 'PRI-103', nameBn: 'প্রাথমিক গণিত', nameEn: 'Elementary Mathematics', weeklyPeriods: 6 },
          { code: 'PRI-104', nameBn: 'প্রাথমিক বিজ্ঞান', nameEn: 'Elementary Science', weeklyPeriods: 4 },
          { code: 'PRI-105', nameBn: 'বাংলাদেশ ও বিশ্বপরিচয়', nameEn: 'Bangladesh & Global Studies', weeklyPeriods: 4 },
          { code: 'PRI-106', nameBn: 'ধর্ম ও নৈতিক শিক্ষা', nameEn: 'Religion & Moral Education', weeklyPeriods: 3 },
        ],
        applicableModules: ['students', 'teachers', 'attendance', 'routine', 'exams', 'results', 'health', 'stipend', 'finance', 'notices'],
        excludedDescriptionBn: 'Class 6–10 এবং মাধ্যমিক স্তরের মডিউল এই বিদ্যালয়ের জন্য লুকানো আছে।',
        excludedDescriptionEn: 'Class 6–10 and Secondary School modules are excluded for PRIMARY configuration.',
      };

    case 'SECONDARY':
      return {
        code: 'SECONDARY',
        labelBn: 'মাধ্যমিক বিদ্যালয়',
        labelEn: 'Secondary School',
        defaultClasses: customClasses?.length
          ? customClasses
          : ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'],
        sectionsStructure: [
          {
            titleBn: 'মাধ্যমিক স্তর (Class 6 – Class 10)',
            titleEn: 'Secondary Section (Class 6 – Class 10)',
            classes: ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'],
          },
        ],
        subjects: [
          { code: 'SEC-201', nameBn: 'বাংলা ১ম ও ২য় পত্র', nameEn: 'Bangla 1st & 2nd Paper', weeklyPeriods: 6 },
          { code: 'SEC-202', nameBn: 'ইংরেজি ১ম ও ২য় পত্র', nameEn: 'English 1st & 2nd Paper', weeklyPeriods: 6 },
          { code: 'SEC-203', nameBn: 'সাধারণ ও উচ্চতর গণিত', nameEn: 'Mathematics & Higher Math', weeklyPeriods: 6 },
          { code: 'SEC-204', nameBn: 'পদার্থ, রসায়ন ও জীববিজ্ঞান', nameEn: 'Physics, Chemistry & Biology', weeklyPeriods: 5 },
          { code: 'SEC-205', nameBn: 'তথ্য ও যোগাযোগ প্রযুক্তি (ICT)', nameEn: 'ICT', weeklyPeriods: 3 },
          { code: 'SEC-206', nameBn: 'ইতিহাস ও সামাজিক বিজ্ঞান', nameEn: 'History & Social Science', weeklyPeriods: 4 },
        ],
        applicableModules: ['students', 'teachers', 'attendance', 'routine', 'exams', 'results', 'finance', 'notices', 'ai_insights'],
        excludedDescriptionBn: 'Pre-Primary এবং Class 1–5 কার্যক্রম এই মাধ্যমিক বিদ্যালয়ের জন্য প্রযোজ্য নয়।',
        excludedDescriptionEn: 'Pre-Primary and Class 1–5 modules are hidden for SECONDARY configuration.',
      };

    case 'PRIMARY_SECONDARY':
      return {
        code: 'PRIMARY_SECONDARY',
        labelBn: 'প্রাথমিক ও মাধ্যমিক বিদ্যালয়',
        labelEn: 'Primary & Secondary School',
        defaultClasses: customClasses?.length
          ? customClasses
          : [
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
            ],
        sectionsStructure: [
          {
            titleBn: 'প্রাথমিক শাখা (Primary Section)',
            titleEn: 'Primary Section',
            classes: ['Pre-Primary', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'],
          },
          {
            titleBn: 'মাধ্যমিক শাখা (Secondary Section)',
            titleEn: 'Secondary Section',
            classes: ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'],
          },
        ],
        subjects: [
          { code: 'PS-101', nameBn: 'বাংলা', nameEn: 'Bangla', weeklyPeriods: 6 },
          { code: 'PS-102', nameBn: 'ইংরেজি', nameEn: 'English', weeklyPeriods: 6 },
          { code: 'PS-103', nameBn: 'গণিত', nameEn: 'Mathematics', weeklyPeriods: 6 },
          { code: 'PS-104', nameBn: 'বিজ্ঞান', nameEn: 'Science', weeklyPeriods: 5 },
          { code: 'PS-105', nameBn: 'বাংলাদেশ ও বিশ্বপরিচয়', nameEn: 'Bangladesh & Global Studies', weeklyPeriods: 4 },
          { code: 'PS-106', nameBn: 'তথ্য ও যোগাযোগ প্রযুক্তি (ICT)', nameEn: 'ICT (Class 6–10)', weeklyPeriods: 3 },
        ],
        applicableModules: ['students', 'teachers', 'attendance', 'routine', 'exams', 'results', 'health', 'stipend', 'finance', 'notices', 'ai_insights'],
        excludedDescriptionBn: 'প্রাথমিক ও মাধ্যমিক উভয় শাখা পৃথক সেকশনে পরিচালিত হয়।',
        excludedDescriptionEn: 'Both Primary Section and Secondary Section modules are active.',
      };

    case 'KINDERGARTEN':
      return {
        code: 'KINDERGARTEN',
        labelBn: 'কিন্ডারগার্টেন',
        labelEn: 'Kindergarten',
        defaultClasses: customClasses?.length
          ? customClasses
          : ['Playgroup', 'Nursery', 'KG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'],
        sectionsStructure: [
          {
            titleBn: 'কিন্ডারগার্টেন ও প্রাথমিক স্তর',
            titleEn: 'Kindergarten & Early Primary',
            classes: customClasses?.length
              ? customClasses
              : ['Playgroup', 'Nursery', 'KG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'],
          },
        ],
        subjects: [
          { code: 'KG-101', nameBn: 'বাংলা বর্ণমালা ও ছড়া', nameEn: 'Bangla & Rhymes', weeklyPeriods: 5 },
          { code: 'KG-102', nameBn: 'English Phonics & Writing', nameEn: 'English Phonics & Writing', weeklyPeriods: 5 },
          { code: 'KG-103', nameBn: 'প্রাথমিক গণিত', nameEn: 'Early Numeracy', weeklyPeriods: 5 },
          { code: 'KG-104', nameBn: 'চিত্রাঙ্কন ও সাধারণ জ্ঞান', nameEn: 'Drawing & General Knowledge', weeklyPeriods: 4 },
        ],
        applicableModules: ['students', 'teachers', 'attendance', 'routine', 'exams', 'results', 'health', 'finance', 'notices'],
        excludedDescriptionBn: 'মাধ্যমিক শ্রেণি (Class 6–10) স্বয়ংক্রিয়ভাবে প্রদর্শিত হয় না।',
        excludedDescriptionEn: 'Secondary classes (Class 6–10) are not exposed for Kindergarten.',
      };

    case 'MADRASA':
      return {
        code: 'MADRASA',
        labelBn: 'মাদ্রাসা',
        labelEn: 'Madrasa',
        defaultClasses: customClasses?.length
          ? customClasses
          : [
              'ইবতেদায়ী ১ম',
              'ইবতেদায়ী ২য়',
              'ইবতেদায়ী ৩য়',
              'ইবতেদায়ী ৪র্থ',
              'ইবতেদায়ী ৫ম',
              'দাখিল ৬ষ্ঠ',
              'দাখিল ৭ম',
              'দাখিল ৮ম',
              'দাখিল ৯ম',
              'দাখিল ১০ম',
            ],
        sectionsStructure: [
          {
            titleBn: 'ইবতেদায়ী শাখা (১ম – ৫ম)',
            titleEn: 'Ebtedayee Section (1 – 5)',
            classes: ['ইবতেদায়ী ১ম', 'ইবতেদায়ী ২য়', 'ইবতেদায়ী ৩য়', 'ইবতেদায়ী ৪র্থ', 'ইবতেদায়ী ৫ম'],
          },
          {
            titleBn: 'দাখিল শাখা (৬ষ্ঠ – ১০ম)',
            titleEn: 'Dakhil Section (6 – 10)',
            classes: ['দাখিল ৬ষ্ঠ', 'দাখিল ৭ম', 'দাখিল ৮ম', 'দাখিল ৯ম', 'দাখিল ১০ম'],
          },
        ],
        subjects: [
          { code: 'MAD-101', nameBn: 'কুরআন মাজীদ ও তাজবীদ', nameEn: 'Quran Majid & Tajweed', weeklyPeriods: 6 },
          { code: 'MAD-102', nameBn: 'আকাইদ ও ফিকহ', nameEn: 'Aqaid & Fiqh', weeklyPeriods: 5 },
          { code: 'MAD-103', nameBn: 'আরবি প্রথম ও দ্বিতীয় পত্র', nameEn: 'Arabic 1st & 2nd Paper', weeklyPeriods: 6 },
          { code: 'MAD-104', nameBn: 'আল-হাদীস', nameEn: 'Al-Hadith', weeklyPeriods: 4 },
          { code: 'MAD-105', nameBn: 'বাংলা, ইংরেজি ও গণিত', nameEn: 'Bangla, English & Mathematics', weeklyPeriods: 6 },
        ],
        applicableModules: ['students', 'teachers', 'attendance', 'routine', 'exams', 'results', 'finance', 'notices'],
        excludedDescriptionBn: 'স্বতন্ত্র মাদ্রাসা সিলেবাস ও ইবতেদায়ী-দাখিল কাঠামো সক্রিয়।',
        excludedDescriptionEn: 'Independent Madrasa Ebtedayee & Dakhil academic structure active.',
      };

    default:
      return {
        code: 'OTHER',
        labelBn: 'স্বতন্ত্র / অন্যান্য',
        labelEn: 'Custom / Other',
        defaultClasses: customClasses?.length ? customClasses : ['Level 1', 'Level 2', 'Level 3'],
        sectionsStructure: [
          {
            titleBn: 'কনফিগারকৃত শ্রেণি কাঠামো',
            titleEn: 'Configured Class Structure',
            classes: customClasses?.length ? customClasses : ['Level 1', 'Level 2', 'Level 3'],
          },
        ],
        subjects: [
          { code: 'GEN-101', nameBn: 'বাংলা', nameEn: 'Bangla', weeklyPeriods: 5 },
          { code: 'GEN-102', nameBn: 'ইংরেজি', nameEn: 'English', weeklyPeriods: 5 },
          { code: 'GEN-103', nameBn: 'গণিত', nameEn: 'Mathematics', weeklyPeriods: 5 },
        ],
        applicableModules: ['students', 'teachers', 'attendance', 'routine', 'exams', 'results', 'finance', 'notices'],
        excludedDescriptionBn: 'কনফিগারেশন অনুযায়ী কাস্টম শ্রেণি প্রদর্শিত হচ্ছে।',
        excludedDescriptionEn: 'Custom configured levels active.',
      };
  }
}

export interface AddressValidationResult {
  valid: boolean;
  errorBn?: string;
  errorEn?: string;
}

/**
 * Validates parent-child location hierarchy for AUTOMATIC address selection.
 * Never blocks registration when addressSource is MANUAL (fallback mode).
 */
export function validateAddressHierarchy(
  selection: AddressSelection,
  db: BdLocationDatabase
): AddressValidationResult {
  if (selection.addressSource === 'MANUAL') {
    if (!selection.divisionName.trim() || !selection.districtName.trim() || !selection.upazilaName.trim()) {
      return {
        valid: false,
        errorBn: 'ম্যানুয়াল ঠিকানায় কমপক্ষে বিভাগ, জেলা ও উপজেলা লিখুন।',
        errorEn: 'For manual address entry, please enter at least Division, District, and Upazila.',
      };
    }
    return { valid: true };
  }

  const div = db.divisions.find((d) => d.id === selection.divisionId && d.isActive);
  if (!div) {
    return { valid: false, errorBn: 'একটি বৈধ বিভাগ নির্বাচন করুন।', errorEn: 'Select a valid Division.' };
  }

  const dist = db.districts.find((d) => d.id === selection.districtId && d.isActive);
  if (!dist || dist.parentId !== div.id) {
    return {
      valid: false,
      errorBn: 'নির্বাচিত জেলা নির্বাচিত বিভাগের অধীনে নয়।',
      errorEn: 'Selected District does not belong to the selected Division.',
    };
  }

  const upz = db.upazilas.find((u) => u.id === selection.upazilaId && u.isActive);
  if (!upz || upz.parentId !== dist.id) {
    return {
      valid: false,
      errorBn: 'নির্বাচিত উপজেলা নির্বাচিত জেলার অধীনে নয়।',
      errorEn: 'Selected Upazila does not belong to the selected District.',
    };
  }

  if (selection.unionId) {
    const uni = db.unions.find((u) => u.id === selection.unionId && u.isActive);
    if (!uni || uni.parentId !== upz.id) {
      return {
        valid: false,
        errorBn: 'নির্বাচিত ইউনিয়ন নির্বাচিত উপজেলার অধীনে নয়।',
        errorEn: 'Selected Union does not belong to the selected Upazila.',
      };
    }
    if (selection.villageId) {
      const vil = db.villages.find((v) => v.id === selection.villageId && v.isActive);
      if (!vil || vil.parentId !== uni.id) {
        return {
          valid: false,
          errorBn: 'নির্বাচিত গ্রাম নির্বাচিত ইউনিয়নের অধীনে নয়।',
          errorEn: 'Selected Village does not belong to the selected Union.',
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Enforces School Approval Workflow transitions:
 * Pending -> Under Review -> Approved -> Active (or Pending/Under Review -> Rejected)
 */
export function getNextWorkflowStatuses(current: RecordStatus): RecordStatus[] {
  switch (current) {
    case 'pending':
      return ['under_review', 'rejected'];
    case 'under_review':
      return ['approved', 'rejected'];
    case 'approved':
      return ['active'];
    case 'active':
    case 'verified':
      return ['suspended', 'archived'];
    case 'suspended':
      return ['active', 'archived'];
    default:
      return [];
  }
}

export function validateStudentActivationLogin(
  students: StudentRecord[],
  studentIdInput: string,
  mobileInput: string,
  activationCodeInput?: string
): { ok: boolean; student?: StudentRecord; errorBn?: string; errorEn?: string } {
  const cleanId = studentIdInput.trim().toUpperCase();
  const cleanMobile = mobileInput.trim();
  const found = students.find(
    (s) => s.permanentId.toUpperCase() === cleanId && s.guardianMobile === cleanMobile
  );
  if (!found) {
    return {
      ok: false,
      errorBn: 'Student ID অথবা নিবন্ধিত মোবাইল নম্বর সঠিক নয়।',
      errorEn: 'Invalid Student ID or registered mobile number.',
    };
  }
  if (activationCodeInput && activationCodeInput.trim()) {
    if (found.activationCode.toUpperCase() !== activationCodeInput.trim().toUpperCase()) {
      return {
        ok: false,
        errorBn: 'One-Time Activation Code মেলেনি।',
        errorEn: 'One-Time Activation Code does not match.',
      };
    }
  }
  return { ok: true, student: found };
}
