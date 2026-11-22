import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Info,
  MapPin,
  PenLine,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import type {
  AddressSource,
  BdLocationDatabase,
  Language,
  SchoolRecord,
  SchoolTypeCode,
} from '../types';
import {
  getSchoolTypeConfig,
  SCHOOL_TYPE_OPTIONS,
  validateAddressHierarchy,
} from '../utils/schoolConfigAndAddress';
import { generateStandardSchoolId } from '../utils/adminAndTeacherIdentityEngine';
import { RECOMMENDED_SCHOOL_COVERS } from '../data/mockData';
import { b, tr } from '../i18n/translations';

interface SchoolRegistrationModalProps {
  open: boolean;
  mode: 'ONLINE' | 'MANUAL';
  lang: Language;
  locationDb: BdLocationDatabase;
  existingSchools?: SchoolRecord[];
  onClose: () => void;
  onRegisterSchool: (school: SchoolRecord) => void;
}

export const SchoolRegistrationModal: React.FC<SchoolRegistrationModalProps> = ({
  open,
  mode,
  lang,
  locationDb,
  existingSchools = [],
  onClose,
  onRegisterSchool,
}) => {
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [code, setCode] = useState('');
  const [eiin, setEiin] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [cluster, setCluster] = useState('');
  const [headTeacher, setHeadTeacher] = useState('');
  const [headTeacherMobile, setHeadTeacherMobile] = useState('');
  const [schoolPassword, setSchoolPassword] = useState('school@123');

  // School Type Configuration
  const [schoolType, setSchoolType] = useState<SchoolTypeCode>('PRIMARY');
  const [manualSchoolTypeMode, setManualSchoolTypeMode] = useState(false);
  const [customSchoolType, setCustomSchoolType] = useState('');

  // Bangladesh Address Selection (Automatic Cascading vs Manual Entry Fallback)
  const [addressSource, setAddressSource] = useState<AddressSource>('AUTOMATIC');
  const [divisionId, setDivisionId] = useState('div-dhk');
  const [districtId, setDistrictId] = useState('dist-dhk');
  const [upazilaId, setUpazilaId] = useState('upz-mirpur');
  const [unionId, setUnionId] = useState('uni-pallabi');
  const [villageId, setVillageId] = useState('vil-mirpur10');

  const [manualDivision, setManualDivision] = useState('');
  const [manualDistrict, setManualDistrict] = useState('');
  const [manualUpazila, setManualUpazila] = useState('');
  const [manualUnion, setManualUnion] = useState('');
  const [manualVillage, setManualVillage] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [docName, setDocName] = useState('বিদ্যালয়_নিবন্ধন_ও_EIIN_সনদ.pdf');
  const [error, setError] = useState('');

  const activeDivisions = useMemo(
    () => locationDb.divisions.filter((d) => d.isActive),
    [locationDb.divisions]
  );
  const activeDistricts = useMemo(
    () => locationDb.districts.filter((d) => d.isActive && d.parentId === divisionId),
    [locationDb.districts, divisionId]
  );
  const activeUpazilas = useMemo(
    () => locationDb.upazilas.filter((u) => u.isActive && u.parentId === districtId),
    [locationDb.upazilas, districtId]
  );
  const activeUnions = useMemo(
    () => locationDb.unions.filter((u) => u.isActive && u.parentId === upazilaId),
    [locationDb.unions, upazilaId]
  );
  const activeVillages = useMemo(
    () => locationDb.villages.filter((v) => v.isActive && v.parentId === unionId),
    [locationDb.villages, unionId]
  );

  if (!open) return null;

  const effectiveType: SchoolTypeCode = manualSchoolTypeMode ? 'OTHER' : schoolType;
  const typePreview = getSchoolTypeConfig(effectiveType);

  // Strict cascading resets when any parent changes
  const handleDivisionChange = (newDivId: string) => {
    setDivisionId(newDivId);
    setDistrictId('');
    setUpazilaId('');
    setUnionId('');
    setVillageId('');
    setError('');
  };

  const handleDistrictChange = (newDistId: string) => {
    setDistrictId(newDistId);
    setUpazilaId('');
    setUnionId('');
    setVillageId('');
    setError('');
  };

  const handleUpazilaChange = (newUpzId: string) => {
    setUpazilaId(newUpzId);
    setUnionId('');
    setVillageId('');
    setError('');
  };

  const handleUnionChange = (newUnionId: string) => {
    setUnionId(newUnionId);
    setVillageId('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameBn.trim() || !code.trim() || !headTeacher.trim() || !mobile.trim()) {
      setError(
        b(
          'বিদ্যালয়ের নাম, রেজিস্ট্রেশন কোড, মোবাইল এবং প্রধান শিক্ষকের নাম আবশ্যক।',
          'School name, registration code, mobile, and head teacher name are required.',
          lang
        )
      );
      return;
    }

    if (manualSchoolTypeMode && !customSchoolType.trim()) {
      setError(b('ম্যানুয়াল বিদ্যালয়ের ধরন লিখুন।', 'Please enter the manual school type.', lang));
      return;
    }

    const divObj = locationDb.divisions.find((d) => d.id === divisionId);
    const distObj = locationDb.districts.find((d) => d.id === districtId);
    const upzObj = locationDb.upazilas.find((u) => u.id === upazilaId);
    const uniObj = locationDb.unions.find((u) => u.id === unionId);
    const vilObj = locationDb.villages.find((v) => v.id === villageId);

    const addrValidation = validateAddressHierarchy(
      {
        addressSource,
        divisionId,
        districtId,
        upazilaId,
        unionId,
        villageId,
        divisionName: addressSource === 'MANUAL' ? manualDivision : divObj?.nameBn ?? '',
        districtName: addressSource === 'MANUAL' ? manualDistrict : distObj?.nameBn ?? '',
        upazilaName: addressSource === 'MANUAL' ? manualUpazila : upzObj?.nameBn ?? '',
        unionName: addressSource === 'MANUAL' ? manualUnion : uniObj?.nameBn ?? '',
        villageName: addressSource === 'MANUAL' ? manualVillage : vilObj?.nameBn ?? '',
        fullAddress,
      },
      locationDb
    );

    if (!addrValidation.valid) {
      setError(b(addrValidation.errorBn ?? 'সঠিক ঠিকানা দিন।', addrValidation.errorEn ?? 'Invalid address.', lang));
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const todayIso = new Date().toISOString().slice(0, 10);
    const derivedCat =
      effectiveType === 'KINDERGARTEN'
        ? 'Kindergarten'
        : effectiveType === 'MADRASA'
          ? 'Madrasa'
          : effectiveType === 'PRIMARY'
            ? 'Government'
            : 'Private';
    const classRangeStr = `${typePreview.defaultClasses[0]} – ${typePreview.defaultClasses[typePreview.defaultClasses.length - 1]}`;
    const adminUser = `head_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const standardPublicId = generateStandardSchoolId(existingSchools);
    const newSchool: SchoolRecord = {
      id: cleanCode,
      schoolPublicId: standardPublicId,
      registrationId: `REG-2026-${cleanCode}`,
      code: cleanCode,
      eiin: eiin.trim() || 'PENDING-EIIN',
      coverImageUrl: RECOMMENDED_SCHOOL_COVERS[0].url,
      loginPassword: schoolPassword.trim() || 'school@123',
      nameBn: nameBn.trim(),
      nameEn: nameEn.trim() || nameBn.trim(),
      schoolType: effectiveType,
      customSchoolType: manualSchoolTypeMode ? customSchoolType.trim() : undefined,
      category: derivedCat,
      educationLevel: classRangeStr,
      establishedYear: '2026',
      mobile: mobile.trim(),
      email: email.trim() || `${cleanCode.toLowerCase()}@edu.bd`,
      cluster: cluster.trim() || 'সাধারণ ক্লাস্টার',
      division: addressSource === 'MANUAL' ? manualDivision.trim() : divObj?.nameBn ?? '',
      district: addressSource === 'MANUAL' ? manualDistrict.trim() : distObj?.nameBn ?? '',
      upazila: addressSource === 'MANUAL' ? manualUpazila.trim() : upzObj?.nameBn ?? '',
      union: addressSource === 'MANUAL' ? manualUnion.trim() || '-' : uniObj?.nameBn ?? '-',
      village: addressSource === 'MANUAL' ? manualVillage.trim() || '-' : vilObj?.nameBn ?? '-',
      divisionId: addressSource === 'AUTOMATIC' ? divisionId : undefined,
      districtId: addressSource === 'AUTOMATIC' ? districtId : undefined,
      upazilaId: addressSource === 'AUTOMATIC' ? upazilaId : undefined,
      unionId: addressSource === 'AUTOMATIC' ? unionId || undefined : undefined,
      villageId: addressSource === 'AUTOMATIC' ? villageId || undefined : undefined,
      fullAddress: fullAddress.trim() || `${addressSource === 'MANUAL' ? manualUpazila : upzObj?.nameBn}, ${addressSource === 'MANUAL' ? manualDistrict : distObj?.nameBn}`,
      addressSource,
      addressVerified: addressSource === 'AUTOMATIC',
      headTeacher: headTeacher.trim(),
      headTeacherMobile: headTeacherMobile.trim() || mobile.trim(),
      adminUsername: adminUser,
      studentCount: 0,
      teacherCount: 1,
      classRange: classRangeStr,
      approvedClasses: typePreview.defaultClasses,
      academicYear: '২০২৬',
      status: 'pending',
      approvalStatus: 'pending',
      registrationDate: todayIso,
      registrationMethod: mode,
      documents: [docName.trim() || 'school_registration_doc.pdf'],
      verifiedDate: 'অপেক্ষমান',
      attendanceRate: 0,
      schoolAdmins: [
        {
          id: `adm-${cleanCode}`,
          name: headTeacher.trim(),
          username: adminUser,
          email: email.trim() || `${cleanCode.toLowerCase()}@edu.bd`,
          mobile: headTeacherMobile.trim() || mobile.trim(),
          roleType: 'Primary Admin',
          invitationStatus: 'Invited',
          permissions: ['students', 'teachers', 'attendance', 'exams', 'results', 'notices'],
          status: 'active',
          assignedAt: todayIso,
        },
      ],
      approvalHistory: [
        {
          id: `APH-${Date.now().toString().slice(-5)}`,
          date: todayIso,
          actor: mode === 'MANUAL' ? 'Central Admin' : headTeacher.trim(),
          action: mode === 'MANUAL' ? 'Manual Registration Created' : 'Online Application Submitted',
          fromStatus: 'New',
          toStatus: 'pending',
          note: `Method: ${mode}, Address: ${addressSource}`,
        },
      ],
    };

    onRegisterSchool(newSchool);
    setNameBn('');
    setNameEn('');
    setCode('');
    setEiin('');
    setMobile('');
    setEmail('');
    setHeadTeacher('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="school-reg-title"
        className="w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        {/* Royal-Blue Gradient Top Header */}
        <div className="shrink-0 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 px-6 py-4 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 id="school-reg-title" className="text-base sm:text-lg font-extrabold tracking-tight truncate">
                {mode === 'ONLINE'
                  ? 'School Registration & Approval System'
                  : b('ম্যানুয়াল স্কুল রেজিস্ট্রেশন (Central Admin)', 'Manual School Registration (Central Admin)', lang)}
              </h3>
              <p className="text-xs text-blue-100 truncate">
                {b('শিক্ষা প্রতিষ্ঠান নিবন্ধন ও অনুমোদন ব্যবস্থা', 'Institutional Onboarding & Central Approval Workflow', lang)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-right">
              <div className="text-[11px] leading-tight text-blue-100">
                <div className="font-bold text-white">{b('স্মার্ট শিক্ষা,', 'Smart Education,', lang)}</div>
                <div>{b('স্মার্ট বাংলাদেশ', 'Smart Bangladesh', lang)}</div>
              </div>
              {/* Crisp BD Circular Emblem */}
              <div className="w-8 h-8 rounded-full bg-[#006a4e] border-2 border-white/40 flex items-center justify-center shrink-0" aria-hidden="true">
                <span className="w-3.5 h-3.5 rounded-full bg-[#f42a41]" />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={tr('close', lang)}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5-Step Progress Pipeline */}
        <div className="shrink-0 bg-slate-50/90 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5">
          <div className="grid grid-cols-5 gap-2 max-w-3xl mx-auto">
            {[
              { step: 1, labelBn: 'নিবন্ধন ফর্ম', labelEn: 'Form', icon: PenLine, active: true },
              { step: 2, labelBn: 'ডকুমেন্ট আপলোড', labelEn: 'Documents', icon: FileText, active: false },
              { step: 3, labelBn: 'পর্যালোচনা চলছে', labelEn: 'Review', icon: Search, active: false },
              { step: 4, labelBn: 'অনুমোদিত', labelEn: 'Approved', icon: CheckCircle2, active: false },
              { step: 5, labelBn: 'সক্রিয়', labelEn: 'Active', icon: CheckCircle2, active: false },
            ].map((s, idx) => {
              const StepIcon = s.icon;
              return (
                <div key={s.step} className="relative flex flex-col items-center text-center">
                  {idx < 4 && (
                    <div
                      className={`hidden sm:block absolute top-4 left-[58%] w-[84%] h-0.5 ${
                        idx === 0 ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    />
                  )}
                  <div
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                      s.active
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm ring-4 ring-blue-100 dark:ring-blue-950/60'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <StepIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-[11px] font-bold mt-1 text-slate-800 dark:text-slate-200 leading-tight">
                    <span className="text-blue-700 dark:text-blue-400 mr-1">{s.step}</span>
                    {b(s.labelBn, s.labelEn, lang)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 text-xs">
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
            {/* Blue Strip Title + Info Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-4 py-2 font-bold text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {b('বিদ্যালয় নিবন্ধন ফর্ম', 'School Registration Form', lang)}
              </div>
              <div className="px-4 py-2 text-[11px] font-medium text-blue-800 dark:text-blue-200 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{b('সঠিক তথ্য প্রদান করুন, এটি পরবর্তীতে পরিবর্তন করা যাবে।', 'Provide accurate details; verified records can be updated later.', lang)}</span>
              </div>
            </div>
          {/* A. Basic School Information */}
          <div className="space-y-3">
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {b('১. বিদ্যালয়ের মৌলিক তথ্য', '1. School Basic Information', lang)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">{b('বিদ্যালয়ের নাম (বাংলা) *', 'School Name (BN) *', lang)}</label>
                <input
                  type="text"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  placeholder="যেমন: উত্তরা মডেল প্রাথমিক বিদ্যালয়"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('বিদ্যালয়ের নাম (English)', 'School Name (EN)', lang)}</label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="Uttara Model Primary School"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('রেজিস্ট্রেশন কোড *', 'Registration Code *', lang)}</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="GPS-2095"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('EIIN নম্বর', 'School EIIN Number', lang)}</label>
                <input
                  type="text"
                  value={eiin}
                  onChange={(e) => setEiin(e.target.value)}
                  placeholder="108912"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('অফিসিয়াল মোবাইল *', 'School Mobile *', lang)}</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('অফিসিয়াল Gmail / Email', 'Official Gmail / Email', lang)}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="school@gmail.com"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('প্রাথমিক শিক্ষা ক্লাস্টার', 'Primary Education Cluster', lang)}</label>
                <input
                  type="text"
                  value={cluster}
                  onChange={(e) => setCluster(e.target.value)}
                  placeholder="মিরপুর দক্ষিণ ক্লাস্টার"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('প্রধান শিক্ষক / অধ্যক্ষ *', 'Head Teacher *', lang)}</label>
                <input
                  type="text"
                  value={headTeacher}
                  onChange={(e) => setHeadTeacher(e.target.value)}
                  placeholder="মোঃ সাইফুল ইসলাম"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('প্রধান শিক্ষকের মোবাইল', 'Head Teacher Mobile', lang)}</label>
                <input
                  type="tel"
                  value={headTeacherMobile}
                  onChange={(e) => setHeadTeacherMobile(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{b('বিদ্যালয় লগইন পাসওয়ার্ড *', 'School Login Password *', lang)}</label>
                <input
                  type="password"
                  value={schoolPassword}
                  onChange={(e) => setSchoolPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* B. School Type Configuration */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                {b('২. বিদ্যালয়ের ধরন (School Type Configuration)', '2. School Type Configuration', lang)}
              </div>
              <button
                type="button"
                onClick={() => setManualSchoolTypeMode((m) => !m)}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {manualSchoolTypeMode
                  ? b('প্রস্তাবিত তালিকা ব্যবহার করুন', 'Use Predefined School Types', lang)
                  : b('School Type খুঁজে পাচ্ছেন না? → Manual Entry / Other', "Can't find School Type? → Manual Entry", lang)}
              </button>
            </div>

            {!manualSchoolTypeMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                <div>
                  <label className="block font-semibold mb-1">{b('School Type নির্বাচন করুন *', 'Select School Type *', lang)}</label>
                  <select
                    value={schoolType}
                    onChange={(e) => setSchoolType(e.target.value as SchoolTypeCode)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                  >
                    {SCHOOL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.labelBn} / {opt.labelEn} ({opt.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {b('স্বয়ংক্রিয় কনফিগারেশন:', 'Auto-loaded Configuration:', lang)}{' '}
                    <span className="font-mono text-blue-700 dark:text-blue-400">school_type = {effectiveType}</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    {b('অনুমোদিত শ্রেণি:', 'Classes:', lang)} {typePreview.defaultClasses.join(', ')}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {b(typePreview.excludedDescriptionBn, typePreview.excludedDescriptionEn, lang)}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block font-semibold mb-1">
                  {b('বিদ্যালয়ের ধরন নিজে লিখুন (Manual Entry) *', 'Enter School Type Manually *', lang)}
                </label>
                <input
                  type="text"
                  value={customSchoolType}
                  onChange={(e) => setCustomSchoolType(e.target.value)}
                  placeholder={b('যেমন: কারিগরি ও ভোকেশনাল ইনস্টিটিউট', 'e.g. Technical / Special Education School', lang)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                />
              </div>
            )}
          </div>

          {/* C. Bangladesh Administrative Address (Automatic Cascading + Manual Entry Fallback) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                {b('৩. বাংলাদেশ প্রশাসনিক ঠিকানা (বিভাগ → জেলা → উপজেলা → ইউনিয়ন → গ্রাম)', '3. Bangladesh Address Hierarchy', lang)}
              </div>
              <button
                type="button"
                onClick={() => setAddressSource((s) => (s === 'AUTOMATIC' ? 'MANUAL' : 'AUTOMATIC'))}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-blue-700 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {addressSource === 'AUTOMATIC'
                  ? b('তথ্য খুঁজে পাচ্ছেন না? → Manual Entry / নিজে লিখুন', "Location not listed? → Manual Entry", lang)
                  : b('Verified Dropdown-এ ফিরে যান (Automatic)', 'Switch to Automatic Dropdown', lang)}
              </button>
            </div>

            <div className="text-[11px] text-slate-500">
              {addressSource === 'AUTOMATIC'
                ? b(
                    'address_source = AUTOMATIC · যাচাইকৃত ডাটাবেজ থেকে ধাপে ধাপে নির্বাচন করুন (উপরের স্তর পরিবর্তন করলে নিচের তালিকা স্বয়ংক্রিয়ভাবে রিসেট হবে)।',
                    'address_source = AUTOMATIC · Cascading verified selection (changing parent automatically resets child levels).',
                    lang
                  )
                : b(
                    'address_source = MANUAL · ম্যানুয়াল ঠিকানা দিলে আবেদন আটকে থাকবে না; Central Admin রিভিউয়ের সময় যাচাই করবেন।',
                    'address_source = MANUAL · Registration proceeds freely; flagged for Central Admin verification.',
                    lang
                  )}
            </div>

            {addressSource === 'AUTOMATIC' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <div>
                  <label className="block font-semibold mb-1">{b('বিভাগ *', 'Division *', lang)}</label>
                  <select
                    value={divisionId}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="">{b('নির্বাচন করুন', 'Select', lang)}</option>
                    {activeDivisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.nameBn} ({d.nameEn})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('জেলা *', 'District *', lang)}</label>
                  <select
                    value={districtId}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    disabled={!divisionId}
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-50"
                  >
                    <option value="">{b('নির্বাচন করুন', 'Select', lang)}</option>
                    {activeDistricts.map((d) => (
                      <option key={d.id} value={d.id}>{d.nameBn} ({d.nameEn})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('উপজেলা *', 'Upazila *', lang)}</label>
                  <select
                    value={upazilaId}
                    onChange={(e) => handleUpazilaChange(e.target.value)}
                    disabled={!districtId}
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-50"
                  >
                    <option value="">{b('নির্বাচন করুন', 'Select', lang)}</option>
                    {activeUpazilas.map((u) => (
                      <option key={u.id} value={u.id}>{u.nameBn} ({u.nameEn})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('ইউনিয়ন / ওয়ার্ড', 'Union / Ward', lang)}</label>
                  <select
                    value={unionId}
                    onChange={(e) => handleUnionChange(e.target.value)}
                    disabled={!upazilaId}
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-50"
                  >
                    <option value="">{b('নির্বাচন করুন', 'Select', lang)}</option>
                    {activeUnions.map((u) => (
                      <option key={u.id} value={u.id}>{u.nameBn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('গ্রাম / এলাকা', 'Village / Area', lang)}</label>
                  <select
                    value={villageId}
                    onChange={(e) => setVillageId(e.target.value)}
                    disabled={!unionId}
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-50"
                  >
                    <option value="">{b('নির্বাচন করুন', 'Select', lang)}</option>
                    {activeVillages.map((v) => (
                      <option key={v.id} value={v.id}>{v.nameBn}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <div>
                  <label className="block font-semibold mb-1">{b('বিভাগ (নিজে লিখুন) *', 'Division *', lang)}</label>
                  <input
                    type="text"
                    value={manualDivision}
                    onChange={(e) => setManualDivision(e.target.value)}
                    placeholder="যেমন: ঢাকা"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('জেলা (নিজে লিখুন) *', 'District *', lang)}</label>
                  <input
                    type="text"
                    value={manualDistrict}
                    onChange={(e) => setManualDistrict(e.target.value)}
                    placeholder="যেমন: নরসিংদী"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('উপজেলা (নিজে লিখুন) *', 'Upazila *', lang)}</label>
                  <input
                    type="text"
                    value={manualUpazila}
                    onChange={(e) => setManualUpazila(e.target.value)}
                    placeholder="যেমন: রায়পুরা"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('ইউনিয়ন', 'Union', lang)}</label>
                  <input
                    type="text"
                    value={manualUnion}
                    onChange={(e) => setManualUnion(e.target.value)}
                    placeholder="চানপুর"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{b('গ্রাম', 'Village', lang)}</label>
                  <input
                    type="text"
                    value={manualVillage}
                    onChange={(e) => setManualVillage(e.target.value)}
                    placeholder="নতুন বাজার"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold mb-1">{b('বিস্তারিত ঠিকানা (বাড়ি/রোড/পোস্ট)', 'Full Street Address', lang)}</label>
                <input
                  type="text"
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="রোড নং ০৪, বাজার সংলগ্ন"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  <FileText className="w-3.5 h-3.5 inline mr-1" />
                  {b('প্রয়োজনীয় ডকুমেন্ট সংযুক্তি', 'Required Documents Attachment', lang)}
                </label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

            {/* Important Guidelines Box + Submit CTA */}
            <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-950/25 border border-indigo-200/70 dark:border-indigo-800/50 p-4 space-y-1.5 text-xs">
              <div className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {b('গুরুত্বপূর্ণ নির্দেশনা', 'Important Guidelines', lang)}
              </div>
              <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {b('School Type নির্বাচন করুন এবং সঠিক ঠিকানা নির্বাচন করুন।', 'Select the School Type and complete the address hierarchy.', lang)}
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {b('Automatic Selection আপনার জন্য উত্তম, তবে প্রয়োজন হলে Manual Entry ব্যবহার করুন।', 'Use Automatic BD Selection when available, or switch to Manual Entry.', lang)}
                </li>
              </ul>
            </div>

            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          </div>

          <div className="shrink-0 flex items-center justify-between gap-2 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer">
              {tr('cancel', lang)}
            </button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer">
              <span>{b('নিবন্ধন করুন', 'Submit Registration', lang)}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
