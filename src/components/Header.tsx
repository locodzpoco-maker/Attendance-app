import React from 'react';
import {
  Calendar,
  UploadCloud,
  FileSpreadsheet,
  Users,
  Clock,
  Settings as SettingsIcon,
  Play,
  LayoutDashboard,
  ShieldCheck,
  Database,
  Palmtree,
  Languages,
  FileText,
} from 'lucide-react';
import { AppSettings, HistoricalPeriodRecord, AppLanguage } from '../types';
import { getTranslations } from '../utils/i18n';

interface HeaderProps {
  activeTab: 'dashboard' | 'daily' | 'monthly' | 'employees' | 'schedules' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'daily' | 'monthly' | 'employees' | 'schedules' | 'settings') => void;
  onOpenImport: () => void;
  onCalculate: () => void;
  isCalculating: boolean;
  hasData: boolean;
  currentPeriodLabel: string;
  historicalPeriods: HistoricalPeriodRecord[];
  onSelectPeriod: (periodId: string) => void;
  selectedPeriodId: string;
  settings: AppSettings;
  onUpdateRole: (role: AppSettings['activeRole']) => void;
  onUpdateLanguage?: (lang: AppLanguage) => void;
  unmappedEmployeesCount?: number;
  onOpenDatabaseModal?: () => void;
  onOpenVacationModal?: () => void;
  vacationCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenImport,
  onCalculate,
  isCalculating,
  hasData,
  currentPeriodLabel,
  historicalPeriods,
  onSelectPeriod,
  selectedPeriodId,
  settings,
  onUpdateRole,
  onUpdateLanguage,
  unmappedEmployeesCount = 0,
  onOpenDatabaseModal,
  onOpenVacationModal,
  vacationCount = 0,
}) => {
  const t = getTranslations(settings.language);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top Banner with App Brand, Period, Role & Fast Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-lg shadow-sm">
              <Clock className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  {settings.companyName || t.appTitle}
                </h1>
                <span className="hidden sm:inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  v1.0 Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {settings.companySubtitle || t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Period selector, Language & Quick action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Period Selector Dropdown if multiple exist */}
            {historicalPeriods.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-xs text-slate-700">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <select
                  id="period-select-dropdown"
                  value={selectedPeriodId}
                  onChange={(e) => onSelectPeriod(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
                >
                  {historicalPeriods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.periodLabel}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Language Switcher Dropdown */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-xs hover:border-slate-300 transition-colors">
              <Languages className="h-3.5 w-3.5 text-indigo-600" />
              <select
                id="header-language-select"
                value={settings.language || 'fr'}
                onChange={(e) => onUpdateLanguage?.(e.target.value as AppLanguage)}
                className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer text-xs"
                title={t.switchLanguage}
              >
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇬🇧 English</option>
                <option value="ar">🇩🇿 العربية</option>
              </select>
            </div>

            {/* Role Switcher */}
            <div className="hidden lg:flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-400">{t.activeRole}:</span>
              <select
                id="role-switch-dropdown"
                value={settings.activeRole}
                onChange={(e) => onUpdateRole(e.target.value as AppSettings['activeRole'])}
                className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
              >
                <option value="Administrator">{t.admin}</option>
                <option value="HR / Attendance User">{t.hrUser}</option>
                <option value="Management">{t.management}</option>
              </select>
            </div>

            {/* Database & Backups Quick Launcher */}
            {onOpenDatabaseModal && (
              <button
                id="header-database-btn"
                onClick={onOpenDatabaseModal}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
                title={t.desktopDatabaseDesc}
              >
                <Database className="h-4 w-4 text-blue-600" />
                <span className="hidden sm:inline">{t.databaseBackups}</span>
              </button>
            )}

            {/* Paid Vacation Manager */}
            {onOpenVacationModal && settings.activeRole !== 'Management' && (
              <button
                id="header-vacation-btn"
                onClick={onOpenVacationModal}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50/70 px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-xs hover:bg-teal-100 transition-colors"
                title={t.vacationModalSubtitle}
              >
                <Palmtree className="h-4 w-4 text-teal-600" />
                <span className="hidden sm:inline">{t.paidVacations}</span>
                {vacationCount > 0 && (
                  <span className="rounded-full bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.2 leading-none">
                    {vacationCount}
                  </span>
                )}
              </button>
            )}

            {/* Import Button */}
            {settings.activeRole !== 'Management' && (
              <button
                id="header-import-btn"
                onClick={onOpenImport}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
              >
                <UploadCloud className="h-4 w-4 text-slate-500" />
                <span className="hidden sm:inline">{t.importFingerprints}</span>
              </button>
            )}

            {/* Large CALCULATE Button */}
            <button
              id="header-calculate-btn"
              onClick={onCalculate}
              disabled={isCalculating || !hasData}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-all ${
                isCalculating || !hasData
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-98 ring-2 ring-indigo-600/30'
              }`}
            >
              <Play className={`h-4 w-4 ${isCalculating ? 'animate-spin' : 'fill-white'}`} />
              <span>{isCalculating ? t.calculating : t.calculate}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="border-t border-slate-100 bg-slate-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-1">
            <button
              id="nav-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              {t.dashboard}
            </button>

            <button
              id="nav-daily"
              onClick={() => setActiveTab('daily')}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'daily'
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {t.dailyAttendance}
            </button>

            <button
              id="nav-monthly"
              onClick={() => setActiveTab('monthly')}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'monthly'
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              {t.monthlySummary}
            </button>

            <button
              id="nav-employees"
              onClick={() => setActiveTab('employees')}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'employees'
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>{t.employees}</span>
              {unmappedEmployeesCount > 0 && (
                <span
                  className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 font-mono border border-amber-300"
                  title={`${unmappedEmployeesCount} unmapped workers detected in raw attendance`}
                >
                  +{unmappedEmployeesCount}
                </span>
              )}
            </button>

            <button
              id="nav-schedules"
              onClick={() => setActiveTab('schedules')}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'schedules'
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {t.schedules}
            </button>

            <button
              id="nav-settings"
              onClick={() => setActiveTab('settings')}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              {t.settings}
            </button>

            {/* Comprehensive Documentary & Manual PDF */}
            <a
              id="nav-documentary-pdf"
              href="/Attendance_Management_System_Documentary_EN_FR_AR.pdf"
              download="Attendance_Management_System_Documentary_EN_FR_AR.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200/80 transition-colors sm:ml-auto whitespace-nowrap shadow-2xs"
              title={t.systemDocumentaryDesc}
            >
              <FileText className="h-3.5 w-3.5 text-indigo-600" />
              <span>{t.systemDocumentaryPdf}</span>
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
};
