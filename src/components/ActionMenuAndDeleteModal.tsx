import React, { useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  Eye,
  FileWarning,
  History,
  Lock,
  MoreVertical,
  Printer,
  RefreshCw,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import type {
  AcademicRecordCategory,
  AcademicSecondaryAction,
  Language,
  Role,
} from '../types';
import { getAllowedSecondaryActions } from '../utils/academicEngine';
import { b } from '../i18n/translations';

interface CleanRowActionBarProps {
  lang: Language;
  role: Role;
  category: AcademicRecordCategory;
  status?: string;
  readOnlyOversight?: boolean;
  itemTitle: string;
  onView: () => void;
  onEdit?: () => void;
  onSecondaryAction: (action: AcademicSecondaryAction, reason?: string) => void;
}

const ACTION_META: Record<
  AcademicSecondaryAction,
  { bn: string; en: string; icon: React.ComponentType<{ className?: string }>; danger?: boolean }
> = {
  change: { bn: 'পরিবর্তন (Change)', en: 'Change', icon: RefreshCw },
  replace: { bn: 'প্রতিস্থাপন (Replace)', en: 'Replace', icon: RefreshCw },
  duplicate: { bn: 'অনুলিপি (Duplicate)', en: 'Duplicate', icon: Copy },
  suspend: { bn: 'স্থগিত (Suspend)', en: 'Suspend', icon: Lock },
  approve: { bn: 'অনুমোদন (Approve)', en: 'Approve', icon: CheckCircle2 },
  cancel: { bn: 'বাতিল (Cancel)', en: 'Cancel', icon: X },
  lock: { bn: 'লক (Lock)', en: 'Lock', icon: Lock },
  unlock: { bn: 'আনলক (Unlock)', en: 'Unlock', icon: Unlock },
  correction_request: { bn: 'সংশোধন অনুরোধ', en: 'Correction Request', icon: FileWarning },
  void: { bn: 'অকার্যকর (Void)', en: 'Void', icon: X, danger: true },
  archive: { bn: 'আর্কাইভ (Archive)', en: 'Archive', icon: Archive },
  history: { bn: 'ইতিহাস (History)', en: 'History', icon: History },
  download: { bn: 'ডাউনলোড (Download)', en: 'Download', icon: Download },
  print: { bn: 'প্রিন্ট (Print)', en: 'Print', icon: Printer },
  delete: { bn: 'মুছে ফেলুন (Delete)', en: 'Delete', icon: Trash2, danger: true },
};

export const CleanRowActionBar: React.FC<CleanRowActionBarProps> = ({
  lang,
  role,
  category,
  status = 'active',
  readOnlyOversight = false,
  itemTitle,
  onView,
  onEdit,
  onSecondaryAction,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const allowedActions = getAllowedSecondaryActions(role, category, status, readOnlyOversight);
  const canEdit = Boolean(onEdit) && role !== 'student' && role !== 'guardian' && !readOnlyOversight;

  return (
    <div className="relative inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onView}
        aria-label={`View ${itemTitle}`}
        title={b('দেখুন', 'View', lang)}
        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap"
      >
        <Eye className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{b('দেখুন', 'View', lang)}</span>
      </button>

      {canEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${itemTitle}`}
          title={b('সম্পাদনা', 'Edit', lang)}
          className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[11px] font-semibold text-blue-700 dark:text-blue-300 cursor-pointer whitespace-nowrap"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{b('Edit', 'Edit', lang)}</span>
        </button>
      )}

      {allowedActions.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={`More actions for ${itemTitle}`}
            title={b('আরও', 'More', lang)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg z-40 py-1 text-xs">
              {allowedActions.map((act) => {
                const meta = ACTION_META[act];
                const Icon = meta.icon;
                return (
                  <button
                    key={act}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      if (act === 'delete') {
                        setDeleteDialogOpen(true);
                      } else {
                        onSecondaryAction(act);
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${
                      meta.danger ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{b(meta.bn, meta.en, lang)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xl space-y-4 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>{b('রেকর্ড মুছে ফেলার নিশ্চিতকরণ', 'Confirm Delete Action', lang)}</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                aria-label="Close modal"
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              Are you sure you want to delete this item? ({itemTitle})
            </p>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {b('কারণ উল্লেখ করুন (বাধ্যতামূলক)', 'Reason for deletion (required)', lang)}
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder={b('যেমন: ডুপ্লিকেট বা বাতিল এন্ট্রি...', 'e.g. Duplicate entry or cancelled...', lang)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
              >
                {b('বাতিল', 'Cancel', lang)}
              </button>
              <button
                type="button"
                disabled={!deleteReason.trim()}
                onClick={() => {
                  onSecondaryAction('delete', deleteReason.trim());
                  setDeleteReason('');
                  setDeleteDialogOpen(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold cursor-pointer"
              >
                {b('Delete নিশ্চিত করুন', 'Confirm Delete', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
