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
} from 'lucide-react';
import {
  DailyAttendanceRecord,
  MonthlySummaryRecord,
  RawAttendanceDataset,
  RawDayAttendance,
  AppSettings,
} from '../types';

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
}) => {
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
                Active Period
              </span>
              <span className="text-xs text-slate-400 font-medium">Authoritative Made Date</span>
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
              Recalculate Entire Period
            </button>
            <button
              id="dash-import-btn"
              onClick={onOpenImport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-slate-500" />
              Import New File
            </button>
          </div>
        </div>
      </div>

      {/* Suggested 7 KPI Cards (PRD Section 4: Employees | Present | Absent | Late | Worked Hours | Overtime Hours | Late Minutes) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        {/* Employees */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Employees</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totalEmployees}</p>
          <span className="text-[11px] text-slate-400">Total in report</span>
        </div>

        {/* Present */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Present</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{totalPresentDays}</p>
          <span className="text-[11px] text-slate-400">Days attended</span>
        </div>

        {/* Absent */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Absent</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600">{totalAbsentDays}</p>
          <span className="text-[11px] text-slate-400">True scheduled absences</span>
        </div>

        {/* Late Days */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Late Days</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{totalLateDays}</p>
          <span className="text-[11px] text-slate-400">Occurrences</span>
        </div>

        {/* Worked Hours */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Worked Hours</span>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">{workedHoursStr}</p>
          <span className="text-[11px] text-slate-400">Normal base time</span>
        </div>

        {/* Overtime Hours (Supp) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs bg-indigo-50/20">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-800">Overtime (Supp)</span>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-indigo-700">{suppHoursStr}</p>
          <span className="text-[11px] text-indigo-600 font-medium">&gt; 15m threshold</span>
        </div>

        {/* Late Minutes */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Late Minutes</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">{totalLateMinutes} m</p>
          <span className="text-[11px] text-slate-400">Cumulative delay</span>
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
              {totalRawPunchesCount} raw biometric punches
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/70">
              <p className="text-xs font-medium text-slate-500">Missing Punches</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{totalMissingPunches}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Single punch entries or exits
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/70">
              <p className="text-xs font-medium text-slate-500">Configured OFF Days</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{totalOffDays}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Excluded from absences (Fridays)
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/70">
              <p className="text-xs font-medium text-slate-500">Overtime Rule</p>
              <p className="text-xl font-bold text-indigo-700 mt-1">
                {settings.defaultOvertimeGraceMinutes} min grace
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Threshold logic applied (&gt;15m)
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Leading zeros preserved in all IDs (e.g. 0004, 00022236)
            </div>
            <button
              onClick={() => onNavigateTab('daily')}
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Review all daily records <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Report Exports Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Download className="h-4 w-4 text-indigo-600" />
              Exports & Reporting
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Download audited Excel workbooks or print-ready A4 PDF reports.
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Daily Attendance</p>
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
                  <p className="text-xs font-semibold text-slate-800">Monthly Summary</p>
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
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => onNavigateTab('monthly')}
              className="w-full inline-flex items-center justify-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View Full Monthly Summary Table <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
