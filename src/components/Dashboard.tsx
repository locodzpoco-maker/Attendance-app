import React from 'react';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  FileText,
} from 'lucide-react';
import {
  DailyAttendanceRecord,
  MonthlySummaryRecord,
  RawAttendanceDataset,
  RawDayAttendance,
  AppSettings,
} from '../types';
import { getTranslations } from '../utils/i18n';

interface DashboardProps {
  dataset: RawAttendanceDataset | null;
  dailyRecords: DailyAttendanceRecord[];
  monthlySummary: MonthlySummaryRecord[];
  onNavigateTab: (tab: 'daily' | 'monthly' | 'employees' | 'schedules' | 'settings') => void;
  onOpenImport: () => void;
  onCalculate: () => void;
  onExportDailyExcel: () => void;
  onExportDailyPDF: () => void;
  onExportMonthlyExcel: () => void;
  onExportMonthlyPDF: () => void;
  settings: AppSettings;
  unmappedEmployeesCount?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  dataset,
  dailyRecords,
  monthlySummary,
  onNavigateTab,
  onOpenImport,
  onCalculate,
  onExportDailyExcel,
  onExportDailyPDF,
  onExportMonthlyExcel,
  onExportMonthlyPDF,
  settings,
  unmappedEmployeesCount = 0,
}) => {
  const t = getTranslations(settings.language);

  // Aggregate statistics across daily records
  const totalEmployees = monthlySummary.length || dataset?.employees.length || 0;

  let totalPresentDays = 0;
  let totalAbsentDays = 0;
  let totalLateDays = 0;
  let totalLateMinutes = 0;
  let totalWorkedMinutes = 0;
  let totalSuppMinutes = 0;
  let totalMissingPunches = 0;
  let totalOffDays = 0;

  for (const s of monthlySummary) {
    totalPresentDays += s.presentDays;
    totalAbsentDays += s.absentDays;
    totalLateDays += s.lateDays;
    totalLateMinutes += s.totalLateMinutes;
    totalWorkedMinutes += s.totalWorkedMinutes;
    totalSuppMinutes += s.totalSuppMinutes;
    totalMissingPunches += s.missingPunchesDays;
    totalOffDays += s.offDays;
  }

  // Count raw punches total
  let totalRawPunchesCount = 0;
  if (dataset) {
    for (const emp of dataset.employees) {
      const days = Object.values(emp.days) as RawDayAttendance[];
      for (const day of days) {
        if (day && day.rawPunches) {
          totalRawPunchesCount += day.rawPunches.length;
        }
      }
    }
  }

  const workedHoursStr = `${Math.floor(totalWorkedMinutes / 60)}h ${(totalWorkedMinutes % 60).toString().padStart(2, '0')}`;
  const suppHoursStr = `${Math.floor(totalSuppMinutes / 60)}h ${(totalSuppMinutes % 60).toString().padStart(2, '0')}`;

  const periodDisplay = dataset
    ? `${dataset.startDate} → ${dataset.endDate} (${dataset.totalDays} days)`
    : 'No period loaded';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Period & Primary Quick Action */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                {t.activePeriodBadge}
              </span>
              <span className="text-xs text-slate-400 font-medium">{t.authoritativeDate}</span>
            </div>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">
              {dataset?.madeDateRaw || 'Attendance Period: July 2026'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Source: <span className="font-mono text-slate-700">{dataset?.fileName || 'AttendanceRecord_0 (56).xls'}</span> • Sheet: <span className="font-semibold text-slate-700">{dataset?.sheetName || 'Attendance Record'}</span> • {dataset?.totalDays || 31} calendar days processed
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="dash-calculate-btn"
              onClick={onCalculate}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              {t.recalculateEntirePeriod}
            </button>
            <button
              id="dash-import-btn"
              onClick={onOpenImport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-slate-500" />
              {t.importNewFile}
            </button>
          </div>
        </div>
      </div>

      {/* Unmapped Workers Alert in Dashboard */}
      {unmappedEmployeesCount > 0 && settings.activeRole !== 'Management' && (
        <div
          id="dashboard-unmapped-workers-alert"
          className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-2xs shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                {unmappedEmployeesCount} {t.unmappedWorkers}
              </h4>
              <p className="text-xs text-amber-800/90 mt-0.5">
                The imported attendance file contains workers not currently saved in your Employee Mapping directory.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('employees')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white transition-colors shadow-2xs self-end sm:self-center shrink-0"
          >
            {t.reviewAndAdd}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Suggested 7 KPI Cards (PRD Section 4: Employees | Present | Absent | Late | Worked Hours | Overtime Hours | Late Minutes) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        {/* Employees */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.totalEmployees}</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totalEmployees}</p>
          <span className="text-[11px] text-slate-400">Total</span>
        </div>

        {/* Present */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.colPresentDays}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{totalPresentDays}</p>
          <span className="text-[11px] text-slate-400">{t.daysWord}</span>
        </div>

        {/* Absent */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.colAbsentDays}</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600">{totalAbsentDays}</p>
          <span className="text-[11px] text-slate-400">{t.daysWord}</span>
        </div>

        {/* Late Days */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.colLateDays}</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{totalLateDays}</p>
          <span className="text-[11px] text-slate-400">{t.daysWord}</span>
        </div>

        {/* Worked Hours */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.workedHoursStat}</span>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">{workedHoursStr}</p>
          <span className="text-[11px] text-slate-400">Total</span>
        </div>

        {/* Overtime Hours (Supp) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs bg-indigo-50/20">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-800">{t.overtimeHoursStat}</span>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-indigo-700">{suppHoursStr}</p>
          <span className="text-[11px] text-indigo-600 font-medium">&gt; 15m</span>
        </div>

        {/* Late Minutes */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.lateMinutesStat}</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">{totalLateMinutes} m</p>
          <span className="text-[11px] text-slate-400">{t.delay}</span>
        </div>
      </div>

      {/* QC Verification & Rules Check (PRD Section 31: Checks & Quality Control) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quality Control Card */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Attendance Quality Control & Integrity Check</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {totalRawPunchesCount} biometric punches
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/70">
              <p className="text-xs font-medium text-slate-500">{t.colMissingPunches}</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{totalMissingPunches}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Single punch entries or exits
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/70">
              <p className="text-xs font-medium text-slate-500">{t.colOffDays}</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{totalOffDays}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Excluded from absences
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/70">
              <p className="text-xs font-medium text-slate-500">{t.overtimeGrace}</p>
              <p className="text-xl font-bold text-indigo-700 mt-1">
                {settings.defaultOvertimeGraceMinutes} min
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Threshold (&gt;15m)
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Leading zeros preserved (0004, 00022236)
            </div>
            <button
              onClick={() => onNavigateTab('daily')}
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
            >
              {t.reviewDailyRecords} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Report Exports Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Download className="h-4 w-4 text-indigo-600" />
              {t.exportsAndReporting}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {t.exportsAndReportingDesc}
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <div>
                  <p className="text-xs font-semibold text-slate-800">{t.dailyAttendance}</p>
                  <p className="text-[11px] text-slate-400">Detailed punch & observation log</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    id="export-daily-excel-btn"
                    onClick={onExportDailyExcel}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 shadow-2xs"
                  >
                    .XLSX
                  </button>
                  <button
                    id="export-daily-pdf-btn"
                    onClick={onExportDailyPDF}
                    className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-900 shadow-2xs"
                  >
                    PDF
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <div>
                  <p className="text-xs font-semibold text-slate-800">{t.monthlySummary}</p>
                  <p className="text-[11px] text-slate-400">Employee totals, worked & supp</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    id="export-monthly-excel-btn"
                    onClick={onExportMonthlyExcel}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 shadow-2xs"
                  >
                    .XLSX
                  </button>
                  <button
                    id="export-monthly-pdf-btn"
                    onClick={onExportMonthlyPDF}
                    className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-900 shadow-2xs"
                  >
                    PDF
                  </button>
                </div>
              </div>

              {/* System Documentary & Manual (PDF) */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50">
                <div>
                  <p className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-indigo-600" />
                    {t.systemDocumentaryPdf}
                  </p>
                  <p className="text-[11px] text-indigo-700/80">
                    Trilingual handbook & architecture (EN / FR / AR)
                  </p>
                </div>
                <a
                  id="download-doc-dashboard-btn"
                  href="/Attendance_Management_System_Documentary_EN_FR_AR.pdf"
                  download="Attendance_Management_System_Documentary_EN_FR_AR.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 shadow-2xs whitespace-nowrap transition-colors"
                >
                  {t.downloadPdf}
                </a>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => onNavigateTab('monthly')}
              className="w-full inline-flex items-center justify-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              {t.viewFullMonthlySummary} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
