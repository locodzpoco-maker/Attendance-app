import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, AttendanceAuditLog, HistoricalPeriodRecord, AppLanguage } from '../types';
import {
  Settings as SettingsIcon,
  Shield,
  History,
  Building,
  Save,
  Trash2,
  Calendar,
  CheckCircle,
  Database,
  RotateCcw,
  CheckCircle2,
  Download,
  Upload,
  Languages,
} from 'lucide-react';
import { getTranslations } from '../utils/i18n';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  historicalPeriods: HistoricalPeriodRecord[];
  onSelectPeriod: (periodId: string) => void;
  onDeletePeriod: (periodId: string) => void;
  auditLogs: AttendanceAuditLog[];
  onResetAllData?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
  onOpenDatabaseModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  historicalPeriods,
  onSelectPeriod,
  onDeletePeriod,
  auditLogs,
  onResetAllData,
  onExportBackup,
  onImportBackup,
  onOpenDatabaseModal,
}) => {
  const t = getTranslations(settings.language);

  const [companyName, setCompanyName] = useState(settings.companyName);
  const [companySubtitle, setCompanySubtitle] = useState(settings.companySubtitle);
  const [overtimeGrace, setOvertimeGrace] = useState(settings.defaultOvertimeGraceMinutes);
  const [arrivalGrace, setArrivalGrace] = useState(settings.defaultArrivalGraceMinutes);
  const [breakGrace, setBreakGrace] = useState(settings.defaultBreakGraceMinutes ?? 10);
  const [activeRole, setActiveRole] = useState(settings.activeRole);
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(settings.language || 'fr');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCompanyName(settings.companyName);
    setCompanySubtitle(settings.companySubtitle);
    setOvertimeGrace(settings.defaultOvertimeGraceMinutes);
    setArrivalGrace(settings.defaultArrivalGraceMinutes);
    setBreakGrace(settings.defaultBreakGraceMinutes ?? 10);
    setActiveRole(settings.activeRole);
    setSelectedLanguage(settings.language || 'fr');
  }, [settings]);

  const handleLanguageChange = (lang: AppLanguage) => {
    setSelectedLanguage(lang);
    onUpdateSettings({
      ...settings,
      language: lang,
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      companyName: companyName.trim(),
      companySubtitle: companySubtitle.trim(),
      defaultOvertimeGraceMinutes: Number(overtimeGrace),
      defaultArrivalGraceMinutes: Number(arrivalGrace),
      defaultBreakGraceMinutes: Number(breakGrace),
      activeRole,
      language: selectedLanguage,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Language Selection Card */}
      <div className="rounded-2xl border border-indigo-100 bg-linear-to-r from-indigo-50/70 via-white to-purple-50/70 p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-indigo-100/70">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <Languages className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{t.languageSettings}</h2>
            <p className="text-xs text-slate-500">{t.languageSettingsDesc}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* French */}
          <button
            type="button"
            onClick={() => handleLanguageChange('fr')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
              selectedLanguage === 'fr'
                ? 'border-indigo-600 bg-white ring-2 ring-indigo-600/20 shadow-xs'
                : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">🇫🇷</span>
              {selectedLanguage === 'fr' && (
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                  Actif
                </span>
              )}
            </div>
            <div className="mt-2">
              <span className="font-bold text-slate-900 block text-sm">Français</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Interface en français standard</span>
            </div>
          </button>

          {/* English */}
          <button
            type="button"
            onClick={() => handleLanguageChange('en')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
              selectedLanguage === 'en'
                ? 'border-indigo-600 bg-white ring-2 ring-indigo-600/20 shadow-xs'
                : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">🇬🇧</span>
              {selectedLanguage === 'en' && (
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                  Active
                </span>
              )}
            </div>
            <div className="mt-2">
              <span className="font-bold text-slate-900 block text-sm">English</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Standard English interface</span>
            </div>
          </button>

          {/* Arabic */}
          <button
            type="button"
            onClick={() => handleLanguageChange('ar')}
            className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between ${
              selectedLanguage === 'ar'
                ? 'border-indigo-600 bg-white ring-2 ring-indigo-600/20 shadow-xs'
                : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              {selectedLanguage === 'ar' && (
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                  نشط
                </span>
              )}
              <span className="text-2xl">🇩🇿</span>
            </div>
            <div className="mt-2">
              <span className="font-bold text-slate-900 block text-sm font-sans">العربية</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">واجهة كاملة مع دعم من اليمين لليسار (RTL)</span>
            </div>
          </button>
        </div>
      </div>

      {/* Settings Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Building className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">{t.companySettings}</h2>
            <p className="text-xs text-slate-500">{t.gracePeriods}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 mt-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.companyName}
              </label>
              <input
                id="setting-company-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.companySubtitleLabel}
              </label>
              <input
                id="setting-company-subtitle"
                type="text"
                value={companySubtitle}
                onChange={(e) => setCompanySubtitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.overtimeGraceMinutes}
              </label>
              <input
                id="setting-ot-grace"
                type="number"
                min="0"
                max="60"
                value={overtimeGrace}
                onChange={(e) => setOvertimeGrace(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-slate-800 outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Default 15m.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.arrivalGraceMinutes}
              </label>
              <input
                id="setting-arrival-grace"
                type="number"
                min="0"
                max="60"
                value={arrivalGrace}
                onChange={(e) => setArrivalGrace(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-slate-800 outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Default 10m.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.breakGraceMinutes}
              </label>
              <input
                id="setting-break-grace"
                type="number"
                min="0"
                max="60"
                value={breakGrace}
                onChange={(e) => setBreakGrace(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-slate-800 outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Default 10m.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.userRoles}
              </label>
              <select
                id="setting-active-role"
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value as AppSettings['activeRole'])}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-indigo-500"
              >
                <option value="Administrator">{t.admin}</option>
                <option value="HR / Attendance User">{t.hrUser}</option>
                <option value="Management">{t.management}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {savedSuccess ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <CheckCircle className="h-4 w-4" /> {t.save} ✓
              </span>
            ) : (
              <span className="text-slate-400">{t.currentPeriod}</span>
            )}

            <button
              type="submit"
              id="save-settings-btn"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition-colors shadow-2xs"
            >
              <Save className="h-4 w-4" /> {t.save}
            </button>
          </div>
        </form>
      </div>

      {/* Historical Periods (PRD Section 25) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <History className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Historical Attendance Periods</h2>
            <p className="text-xs text-slate-500">
              PRD Section 25: Stored monthly calculations. Previous months can be reopened or re-analyzed at any time.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Period Label</th>
                <th className="py-2.5 px-3">Source File</th>
                <th className="py-2.5 px-3">Employees</th>
                <th className="py-2.5 px-3">Imported Date</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historicalPeriods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No historical periods stored.
                  </td>
                </tr>
              ) : (
                historicalPeriods.map((hp) => (
                  <tr key={hp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {hp.periodLabel}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{hp.fileName}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">{hp.employeeCount}</td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(hp.importedAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectPeriod(hp.id)}
                          className="font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Open Period
                        </button>
                        {settings.activeRole === 'Administrator' && historicalPeriods.length > 1 && (
                          <button
                            onClick={() => onDeletePeriod(hp.id)}
                            className="text-rose-500 hover:text-rose-700"
                            title="Delete period"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail Log (PRD Section 24: Manual Corrections & Auditability) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Shield className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Audit Trail & Compliance Log</h2>
            <p className="text-xs text-slate-500">
              PRD Section 24: Permanent log of manual adjustments with recorded timestamp, reviewer, and reason.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Authorized User</th>
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Date Adjusted</th>
                <th className="py-2.5 px-3">Reason / Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No manual corrections recorded in the audit trail.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-indigo-700">{log.user}</td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">
                      {log.employeeName} ({log.employeeId})
                    </td>
                    <td className="py-2.5 px-3 font-mono">{log.date}</td>
                    <td className="py-2.5 px-3 text-slate-600">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standalone Windows Desktop & SQLite Database Management */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Standalone Windows Desktop Application & SQLite Database
              </h2>
              <p className="text-xs text-slate-500">
                Offline standalone architecture: persistent SQLite database with versioned backups and localStorage migration.
              </p>
            </div>
          </div>

          {onOpenDatabaseModal && (
            <button
              type="button"
              onClick={onOpenDatabaseModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Database className="h-3.5 w-3.5" /> Manage SQLite Database & Backups
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-700 block">Database Storage Path</span>
            <code className="text-[11px] font-mono text-indigo-700 bg-indigo-50/60 px-1.5 py-0.5 rounded border border-indigo-100 block break-all">
              C:\ProgramData\Attendance App\attendance.db
            </code>
            <p className="text-[11px] text-slate-400">
              Stored completely outside the application installation folder (Program Files) so updating or reinstalling never deletes records.
            </p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-700 block">Automated Backup Location</span>
            <code className="text-[11px] font-mono text-emerald-700 bg-emerald-50/60 px-1.5 py-0.5 rounded border border-emerald-100 block break-all">
              C:\ProgramData\Attendance App\Backups\
            </code>
            <p className="text-[11px] text-slate-400">
              Stores timestamped snapshots (e.g. Attendance_Backup_YYYY-MM-DD_HHMM.db) with automatic rollback protection.
            </p>
          </div>
        </div>
      </div>

      {/* Storage & Data Persistence Status */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Local Browser Storage & Persistence</h2>
              <p className="text-xs text-slate-500">
                All settings, shift configurations, employee rosters, and imported files are automatically saved in your browser storage.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Auto-Save Active
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-slate-500 block font-medium">Work Schedules</span>
            <span className="text-slate-900 font-bold text-sm mt-0.5 block">Saved Locally</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Custom shift hours, break times & grace periods persist across page reloads.</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-slate-500 block font-medium">Calculation Rules & Settings</span>
            <span className="text-slate-900 font-bold text-sm mt-0.5 block">Saved Locally</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Company title, OT grace, arrival grace & role settings remain active.</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-slate-500 block font-medium">Historical Periods & Audit</span>
            <span className="text-slate-900 font-bold text-sm mt-0.5 block">{historicalPeriods.length} Stored</span>
            <span className="text-[11px] text-slate-400 mt-1 block">All manual punch corrections and audit trail events remain safely logged.</span>
          </div>
        </div>

        {/* Backup & Export Controls */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-800 block">Configuration Backup & Transfer</span>
            <span className="text-[11px] text-slate-400 block">
              Download your custom schedules, grace settings, and employee assignments as a JSON file to transfer or keep safe offline.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onExportBackup && (
              <button
                type="button"
                onClick={onExportBackup}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                title={t.exportBackup}
              >
                <Download className="h-3.5 w-3.5 text-slate-500" /> {t.exportBackup}
              </button>
            )}

            {onImportBackup && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImportBackup(file);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                  title={t.importBackup}
                >
                  <Upload className="h-3.5 w-3.5 text-indigo-600" /> {t.importBackup}
                </button>
              </>
            )}
          </div>
        </div>

        {onResetAllData && settings.activeRole === 'Administrator' && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {t.resetConfirm}
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t.resetConfirm)) {
                  onResetAllData();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {t.resetAllData}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
