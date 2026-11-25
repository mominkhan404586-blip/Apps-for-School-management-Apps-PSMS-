import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  QrCode,
  UserPlus,
  X,
} from 'lucide-react';
import type {
  AddressSelection,
  Language,
  SchoolRecord,
  StudentRecord,
} from '../types';
import { b } from '../i18n/translations';
import { INITIAL_BD_LOCATIONS } from '../data/bdLocations';
import {
  admitStudent6Part,
  checkDuplicateStudent,
} from '../utils/adminAndTeacherIdentityEngine';

interface TeacherStudentAdmissionModalProps {
  open: boolean;
  lang: Language;
  school: SchoolRecord;
  schools?: SchoolRecord[];
  allowSchoolSelection?: boolean;
  students: StudentRecord[];
  admittedByTeacherId?: string;
  admittedByTeacherName: string;
  autoActivate?: boolean;
  onClose: () => void;
  onStudentAdmitted: (student: StudentRecord) => void;
}

export const TeacherStudentAdmissionModal: React.FC<TeacherStudentAdmissionModalProps> = ({
  open,
  lang,
  school,
  schools,
  allowSchoolSelection = false,
  students,
  admittedByTeacherId,
  admittedByTeacherName,
  autoActivate = false,
  onClose,
  onStudentAdmitted,
}) => {
  const [selectedSchoolId, setSelectedSchoolId] = useState(school.id);
  const activeSchool = useMemo(() => {
    if (allowSchoolSelection && schools && schools.length > 0) {
      return schools.find((s) => s.id === selectedSchoolId) ?? schools[0];
    }
    return school;
  }, [allowSchoolSelection, schools, selectedSchoolId, school]);
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [dob, setDob] = useState('2016-05-14');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [birthRegNo, setBirthRegNo] = useState('');

  const [academicYear, setAcademicYear] = useState('২০২৬');
  const [className, setClassName] = useState(school.approvedClasses[0] ?? 'Class 1');
  const [section, setSection] = useState('ক (A)');
  const [roll, setRoll] = useState(1);
  const [admissionDate, setAdmissionDate] = useState('2026-11-19');

  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('Father');
  const [guardianMobile, setGuardianMobile] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  const [addressSource, setAddressSource] = useState<'AUTOMATIC' | 'MANUAL'>('AUTOMATIC');
  const [divisionId, setDivisionId] = useState(INITIAL_BD_LOCATIONS.divisions[0]?.id ?? 'div-dhk');
  const [manualAddressText, setManualAddressText] = useState('');

  const [prevNotApplicable, setPrevNotApplicable] = useState(true);
  const [prevSchoolName, setPrevSchoolName] = useState('');
  const [prevLastClass, setPrevLastClass] = useState('');
  const [prevTcNumber, setPrevTcNumber] = useState('');

  const [docBirthCert, setDocBirthCert] = useState(true);
  const [docPhoto, setDocPhoto] = useState(true);
  const [docGuardianNid, setDocGuardianNid] = useState(true);

  const [error, setError] = useState('');
  const [createdResult, setCreatedResult] = useState<{
    student: StudentRecord;
    initialPassword: string;
  } | null>(null);

  const liveDupCheck = useMemo(
    () =>
      checkDuplicateStudent(students, {
        schoolId: activeSchool.id,
        className,
        section,
        roll,
        birthRegNo,
      }),
    [students, activeSchool.id, className, section, roll, birthRegNo]
  );

  if (!open) return null;

  const selectedDiv = INITIAL_BD_LOCATIONS.divisions.find((d) => d.id === divisionId);
  const selectedDist = INITIAL_BD_LOCATIONS.districts.find((d) => d.parentId === divisionId);
  const selectedUpz = INITIAL_BD_LOCATIONS.upazilas.find((u) => u.parentId === selectedDist?.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const addressObj: AddressSelection = {
      addressSource,
      divisionId: addressSource === 'AUTOMATIC' ? divisionId : '',
      districtId: addressSource === 'AUTOMATIC' ? selectedDist?.id ?? '' : '',
      upazilaId: addressSource === 'AUTOMATIC' ? selectedUpz?.id ?? '' : '',
      unionId: '',
      villageId: '',
      divisionName: selectedDiv?.nameBn ?? 'ঢাকা',
      districtName: selectedDist?.nameBn ?? 'ঢাকা',
      upazilaName: selectedUpz?.nameBn ?? 'মিরপুর',
      unionName: '',
      villageName: '',
      fullAddress:
        addressSource === 'MANUAL'
          ? manualAddressText.trim() || 'ম্যানুয়াল ঠিকানা'
          : `${selectedUpz?.nameBn ?? ''}, ${selectedDist?.nameBn ?? ''}, ${selectedDiv?.nameBn ?? ''}`,
    };

    const docs: string[] = [];
    if (docBirthCert) docs.push('Birth_Registration_Certificate.pdf');
    if (docPhoto) docs.push('Student_Passport_Photo.jpg');
    if (docGuardianNid) docs.push('Guardian_NID.pdf');

    const res = admitStudent6Part(students, activeSchool, {
      nameBn,
      nameEn,
      dob,
      gender,
      bloodGroup,
      birthRegNo,
      academicYear,
      schoolId: activeSchool.id,
      schoolNameBn: activeSchool.nameBn,
      className,
      section,
      roll,
      admissionDate,
      fatherName,
      motherName,
      guardianRelation,
      guardianMobile,
      emergencyContact: emergencyContact || guardianMobile,
      presentAddress: addressObj,
      permanentAddress: addressObj,
      previousSchoolInfo: {
        notApplicable: prevNotApplicable,
        schoolName: prevNotApplicable ? undefined : prevSchoolName,
        lastClass: prevNotApplicable ? undefined : prevLastClass,
        tcNumber: prevNotApplicable ? undefined : prevTcNumber,
      },
      documents: docs.length > 0 ? docs : ['Admission_Form.pdf'],
      admittedByTeacherId,
      admittedByTeacherName,
      autoActivate,
    });

    if (!res.ok || !res.student || !res.credentials) {
      setError(b(res.errorBn ?? 'ভর্তি সম্পন্ন হয়নি।', res.errorEn ?? 'Admission blocked.', lang));
      return;
    }

    onStudentAdmitted(res.student);
    setCreatedResult({ student: res.student, initialPassword: res.credentials.initialPassword });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {b('নতুন শিক্ষার্থী ভর্তি ফরম (৬-অংশ)', 'New Student Admission Form (6-Part)', lang)}
              </h2>
              <p className="text-xs text-slate-500">
                {activeSchool.nameBn} ({activeSchool.code}) · {b('স্বয়ংক্রিয় ID + ডিজিটাল QR কার্ড', 'Auto ID & QR Card Generation', lang)}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {createdResult ? (
          <div className="p-6 space-y-4 text-xs overflow-y-auto">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              {b('শিক্ষার্থী ভর্তি সফল ও স্বয়ংক্রিয় ID + QR কার্ড তৈরি হয়েছে!', 'Student Admitted! Auto ID & Digital QR Card Generated.', lang)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="font-bold text-sm text-slate-900 dark:text-white">{createdResult.student.nameBn}</div>
                <div><strong>Student ID (Username):</strong> <span className="font-mono font-bold text-blue-700">{createdResult.student.permanentId}</span></div>
                <div><strong>Initial Password:</strong> <span className="font-mono">{createdResult.initialPassword}</span></div>
                <div><strong>Activation Code:</strong> <span className="font-mono">{createdResult.student.activationCode}</span></div>
                <div><strong>Class / Section / Roll:</strong> {createdResult.student.className} · {createdResult.student.section} · #{createdResult.student.roll}</div>
                <div><strong>Approval Status:</strong> <span className="font-bold">{createdResult.student.status}</span></div>
              </div>

              <div className="p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col items-center justify-center text-center space-y-2">
                <QrCode className="w-14 h-14 text-blue-800 dark:text-blue-300" />
                <div className="font-bold text-slate-900 dark:text-white">DIGITAL SMART ID CARD</div>
                <div className="font-mono text-[11px]">{createdResult.student.digitalIdSerial}</div>
                <div className="font-mono text-[10px] text-slate-500">{createdResult.student.qrPayload}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreatedResult(null);
                  setNameBn('');
                  setNameEn('');
                  setBirthRegNo('');
                  setRoll((r) => r + 1);
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
              >
                {b('আরেকজন শিক্ষার্থী ভর্তি করুন', 'Admit Another Student', lang)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatedResult(null);
                  onClose();
                }}
                className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
              >
                {b('সম্পন্ন', 'Done', lang)}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 text-xs">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {liveDupCheck.isDuplicate && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{b(liveDupCheck.warningBn ?? '', liveDupCheck.warningEn ?? '', lang)}</span>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold">
                  {error}
                </div>
              )}

              {allowSchoolSelection && schools && schools.length > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                  <label className="block font-bold text-emerald-900 dark:text-emerald-200">
                    {b('ভর্তির বিদ্যালয় নির্বাচন করুন *', 'Select Target School *', lang)}
                  </label>
                  <select
                    data-testid="public-student-reg-school-select"
                    value={activeSchool.id}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedSchoolId(nextId);
                      const nextSchool = schools.find((s) => s.id === nextId);
                      if (nextSchool && nextSchool.approvedClasses.length > 0) {
                        setClassName(nextSchool.approvedClasses[0]);
                      }
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                  >
                    {schools.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.code} — {b(sc.nameBn, sc.nameEn, lang)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Part 1: Basic Info */}
              <div className="space-y-2.5">
                <div className="font-bold text-sm text-blue-800 dark:text-blue-400">১. মৌলিক তথ্য (Basic Info)</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input type="text" required value={nameBn} onChange={(e) => setNameBn(e.target.value)} placeholder="শিক্ষার্থীর নাম (বাংলা) *" className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Student Name (English)" className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono" />
                  <select value={gender} onChange={(e) => setGender(e.target.value as 'Male' | 'Female')} className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <option value="Male">ছাত্র (Male)</option>
                    <option value="Female">ছাত্রী (Female)</option>
                  </select>
                  <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                      <option key={bg} value={bg}>Blood: {bg}</option>
                    ))}
                  </select>
                  <input type="text" value={birthRegNo} onChange={(e) => setBirthRegNo(e.target.value)} placeholder="জন্ম নিবন্ধন নম্বর (Birth Reg No)" className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono" />
                </div>
              </div>

              {/* Part 2: Academic Info */}
              <div className="space-y-2.5">
                <div className="font-bold text-sm text-blue-800 dark:text-blue-400">২. একাডেমিক তথ্য (Academic Info · অনুমোদিত শ্রেণি)</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <input type="text" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="Session" className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  <select value={className} onChange={(e) => setClassName(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    {school.approvedClasses.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                  <input type="text" value={section} onChange={(e) => setSection(e.target.value)} placeholder="Section" className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  <input type="number" min={1} value={roll} onChange={(e) => setRoll(Number(e.target.value))} placeholder="Roll" className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  <input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono" />
                </div>
              </div>

              {/* Part 3: Guardian Info */}
              <div className="space-y-2.5">
                <div className="font-bold text-sm text-blue-800 dark:text-blue-400">৩. অভিভাবকের তথ্য (Guardian Info)</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input type="text" required value={fatherName} onChange={(e) => setFatherName(e.target.value)} placeholder="পিতার নাম *" className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  <input type="text" value={motherName} onChange={(e) => setMotherName(e.target.value)} placeholder="মাতার নাম" className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  <select value={guardianRelation} onChange={(e) => setGuardianRelation(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                  </select>
                  <input type="tel" required value={guardianMobile} onChange={(e) => setGuardianMobile(e.target.value)} placeholder="অভিভাবকের মোবাইল নম্বর *" className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono" />
                  <input type="tel" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="জরুরি যোগাযোগ নম্বর" className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono" />
                </div>
              </div>

              {/* Part 4: Address */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-blue-800 dark:text-blue-400">৪. ঠিকানা (Address)</div>
                  <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                    <input type="checkbox" checked={addressSource === 'MANUAL'} onChange={(e) => setAddressSource(e.target.checked ? 'MANUAL' : 'AUTOMATIC')} />
                    Manual Entry
                  </label>
                </div>
                {addressSource === 'AUTOMATIC' ? (
                  <select value={divisionId} onChange={(e) => setDivisionId(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    {INITIAL_BD_LOCATIONS.divisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.nameBn} ({d.nameEn})</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={manualAddressText} onChange={(e) => setManualAddressText(e.target.value)} placeholder="গ্রাম / রোড / ডাকঘর / উপজেলা / জেলা" className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                )}
              </div>

              {/* Part 5: Previous School */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-blue-800 dark:text-blue-400">৫. পূর্ববর্তী বিদ্যালয়ের তথ্য (Previous School)</div>
                  <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                    <input type="checkbox" checked={prevNotApplicable} onChange={(e) => setPrevNotApplicable(e.target.checked)} />
                    প্রযোজ্য নয় (Not Applicable)
                  </label>
                </div>
                {!prevNotApplicable && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input type="text" value={prevSchoolName} onChange={(e) => setPrevSchoolName(e.target.value)} placeholder="Previous School Name" className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                    <input type="text" value={prevLastClass} onChange={(e) => setPrevLastClass(e.target.value)} placeholder="Last Class" className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                    <input type="text" value={prevTcNumber} onChange={(e) => setPrevTcNumber(e.target.value)} placeholder="TC Number" className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  </div>
                )}
              </div>

              {/* Part 6: Documents */}
              <div className="space-y-2">
                <div className="font-bold text-sm text-blue-800 dark:text-blue-400">৬. ভর্তির নথিপত্র (Documents)</div>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={docBirthCert} onChange={(e) => setDocBirthCert(e.target.checked)} />
                    জন্ম নিবন্ধন সনদ (Birth Certificate)
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={docPhoto} onChange={(e) => setDocPhoto(e.target.checked)} />
                    পাসপোর্ট ছবি (Photo)
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={docGuardianNid} onChange={(e) => setDocGuardianNid(e.target.checked)} />
                    অভিভাবকের NID (Guardian NID)
                  </label>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex justify-end gap-2 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer">
                {b('বাতিল', 'Cancel', lang)}
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer">
                {b('ভর্তি সম্পন্ন ও Auto ID তৈরি করুন', 'Complete Admission & Generate Auto ID', lang)}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
