import React, { useState, useMemo } from 'react';
import { MonthlySummaryRecord, DailyAttendanceRecord, AppSettings } from '../types';
import {
  Search,
  Download,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  Calendar,
  CalendarRange,
  X,
  RotateCcw,
  Palmtree,
} from 'lucide-react';
import { generateMonthlySummaryFromDailyRecords } from '../utils/calculator';

interface MonthlySummaryViewProps {
  summaries: MonthlySummaryRecord[];
  dailyRecords?: DailyAttendanceRecord[];
  onExportExcel: (summariesToExport?: MonthlySummaryRecord[], customPeriodLabel?: string) => void;
  onExportPDF: (summariesToExport?: MonthlySummaryRecord[], customPeriodLabel?: string) => void;
  settings: AppSettings;
  periodLabel: string;
}

// Helper to format ISO date YYYY-MM-DD to display DD/MM/YYYY
function formatIsoToDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export const MonthlySummaryView: React.FC<MonthlySummaryViewProps> = ({
  summaries,
  dailyRecords = [],
  onExportExcel,
  onExportPDF,
  settings,
  periodLabel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Extract unique sorted dates from dailyRecords if available
  const dateOptions = useMemo(() => {
    const set = new Set<string>();
    dailyRecords.forEach((r) => {
      if (r.date) set.add(r.date);
    });
    return Array.from(set).sort();
  }, [dailyRecords]);

  const minAvailableDate = dateOptions[0] || '';
  const maxAvailableDate = dateOptions[dateOptions.length - 1] || '';

  // Effective start & end dates
  const effectiveStartDate = useMemo(() => {
    if (startDate && endDate && startDate > endDate) return endDate;
    return startDate;
  }, [startDate, endDate]);

  const effectiveEndDate = useMemo(() => {
    if (startDate && endDate && startDate > endDate) return startDate;
    return endDate;
  }, [startDate, endDate]);

  const isDateRangeFiltered = Boolean(effectiveStartDate || effectiveEndDate);

  // Quick Presets Handler
  const applyQuickPreset = (preset: 'ALL' | '01_08' | '01_15' | '16_END') => {
    if (preset === 'ALL' || dateOptions.length === 0) {
      setStartDate('');
      setEndDate('');
      return;
    }

    const firstDate = dateOptions[0];
    const lastDate = dateOptions[dateOptions.length - 1];
    const parts = firstDate.split('-');
    const year = parts[0];
    const month = parts[1];

    if (preset === '01_08') {
      const targetStart = `${year}-${month}-01`;
      const targetEnd = `${year}-${month}-08`;
      setStartDate(dateOptions.includes(targetStart) ? targetStart : firstDate);
      setEndDate(dateOptions.includes(targetEnd) ? targetEnd : (dateOptions.find((d) => d >= targetEnd) || lastDate));
    } else if (preset === '01_15') {
      const targetStart = `${year}-${month}-01`;
      const targetEnd = `${year}-${month}-15`;
      setStartDate(dateOptions.includes(targetStart) ? targetStart : firstDate);
      setEndDate(dateOptions.includes(targetEnd) ? targetEnd : (dateOptions.find((d) => d >= targetEnd) || lastDate));
    } else if (preset === '16_END') {
      const targetStart = `${year}-${month}-16`;
      setStartDate(dateOptions.find((d) => d >= targetStart) || firstDate);
      setEndDate(lastDate);
    }
  };

  // Base summaries: if date range is active and dailyRecords exist, dynamically generate summaries for that subset
  const activeSummaries = useMemo(() => {
    if (!isDateRangeFiltered || dailyRecords.length === 0) {
      return summaries;
    }

    const filteredDaily = dailyRecords.filter((r) => {
      if (effectiveStartDate && r.date < effectiveStartDate) return false;
      if (effectiveEndDate && r.date > effectiveEndDate) return false;
      return true;
    });

    return generateMonthlySummaryFromDailyRecords(filteredDaily);
  }, [summaries, dailyRecords, isDateRangeFiltered, effectiveStartDate, effectiveEndDate]);

  // Extract unique groups
  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    activeSummaries.forEach((s) => {
      if (s.groupName) set.add(s.groupName);
    });
    return Array.from(set).sort();
  }, [activeSummaries]);

  // Filtered summaries by search and group
  const filteredSummaries = useMemo(() => {
    return activeSummaries.filter((s) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase().replace(/\\/g, '/').trim();
        const mId = s.employeeId.toLowerCase().includes(q);
        const mName = s.employeeName.toLowerCase().includes(q);
        const mDept = s.companyDepartment.toLowerCase().includes(q);
        if (!mId && !mName && !mDept) return false;
      }

      if (selectedGroup !== 'ALL' && s.groupName !== selectedGroup) {
        return false;
      }

      return true;
    });
  }, [activeSummaries, searchTerm, selectedGroup]);

  // Aggregate totals
  const aggregates = useMemo(() => {
    let totWorkedMins = 0;
    let totSuppMins = 0;
    let totLateDays = 0;
    let totLateMins = 0;
    let totMissing = 0;
    let totPresent = 0;
    let totAbsent = 0;
    let totVacation = 0;

    filteredSummaries.forEach((s) => {
      totWorkedMins += s.totalWorkedMinutes;
      totSuppMins += s.totalSuppMinutes;
      totLateDays += s.lateDays;
      totLateMins += s.totalLateMinutes;
      totMissing += s.missingPunchesDays;
      totPresent += s.presentDays;
      totAbsent += s.absentDays;
      totVacation += s.paidVacationDays || 0;
    });

    return {
      workedHours: `${Math.floor(totWorkedMins / 60)}h ${(totWorkedMins % 60).toString().padStart(2, '0')}`,
      suppHours: `${Math.floor(totSuppMins / 60)}h ${(totSuppMins % 60).toString().padStart(2, '0')}`,
      lateDays: totLateDays,
      lateMins: totLateMins,
      missing: totMissing,
      present: totPresent,
      absent: totAbsent,
      vacation: totVacation,
    };
  }, [filteredSummaries]);

  // Custom period label for exports
  const activePeriodLabel = useMemo(() => {
    if (effectiveStartDate && effectiveEndDate) {
      return `${formatIsoToDisplay(effectiveStartDate)} - ${formatIsoToDisplay(effectiveEndDate)}`;
    } else if (effectiveStartDate) {
      return `From ${formatIsoToDisplay(effectiveStartDate)}`;
    } else if (effectiveEndDate) {
      return `Until ${formatIsoToDisplay(effectiveEndDate)}`;
    }
    return periodLabel;
  }, [effectiveStartDate, effectiveEndDate, periodLabel]);

  const handleExportXLSX = () => {
    onExportExcel(filteredSummaries, activePeriodLabel);
  };

  const handleExportPDFFile = () => {
    onExportPDF(filteredSummaries, activePeriodLabel);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Controls & Summary Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="search-monthly-input"
              type="text"
              placeholder="Search employee by ID, Name or Department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Date Range Filter for Monthly Summary */}
            {dateOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <Calendar className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                
                {/* From Date */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-medium text-slate-500">From</span>
                  <input
                    id="monthly-filter-date-from-input"
                    type="date"
                    value={startDate}
                    min={minAvailableDate}
                    max={endDate || maxAvailableDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-700 font-mono outline-none focus:border-indigo-500"
                    title="Filter start date"
                  />
                </div>

                {/* To Date */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-medium text-slate-500">To</span>
                  <input
                    id="monthly-filter-date-to-input"
                    type="date"
                    value={endDate}
                    min={startDate || minAvailableDate}
                    max={maxAvailableDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-700 font-mono outline-none focus:border-indigo-500"
                    title="Filter end date"
                  />
                </div>

                {/* Presets */}
                <select
                  id="monthly-filter-date-presets-select"
                  value={
                    !startDate && !endDate
                      ? 'ALL'
                      : startDate && endDate && startDate.endsWith('-01') && endDate.endsWith('-08')
                      ? 'PRESET_01_08'
                      : startDate && endDate && startDate.endsWith('-01') && endDate.endsWith('-15')
                      ? 'PRESET_01_15'
                      : startDate && endDate && startDate.endsWith('-16')
                      ? 'PRESET_16_END'
                      : 'CUSTOM'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'ALL') {
                      applyQuickPreset('ALL');
                    } else if (val === 'PRESET_01_08') {
                      applyQuickPreset('01_08');
                    } else if (val === 'PRESET_01_15') {
                      applyQuickPreset('01_15');
                    } else if (val === 'PRESET_16_END') {
                      applyQuickPreset('16_END');
                    }
                  }}
                  className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-700 outline-none cursor-pointer"
                  title="Quick date range presets"
                >
                  <option value="ALL">All Dates ({dateOptions.length} days)</option>
                  <option value="PRESET_01_08">01 to 08 (First 8 days)</option>
                  <option value="PRESET_01_15">01 to 15 (1st half)</option>
                  <option value="PRESET_16_END">16 to End (2nd half)</option>
                  {isDateRangeFiltered && <option value="CUSTOM">Custom Range Selected</option>}
                </select>

                {isDateRangeFiltered && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                    title="Reset date range to all dates"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            <select
              id="monthly-filter-group-select"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-700 outline-none"
            >
              <option value="ALL">All Groups ({activeSummaries.length} employees)</option>
              {groupOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <button
                id="monthly-export-xlsx-btn"
                onClick={handleExportXLSX}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                title={isDateRangeFiltered ? `Export summary for ${activePeriodLabel}` : 'Export summary'}
              >
                <Download className="h-3 w-3" /> Export Excel
              </button>
              <button
                id="monthly-export-pdf-btn"
                onClick={handleExportPDFFile}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1 font-semibold text-white hover:bg-slate-900 transition-colors shadow-2xs"
                title={isDateRangeFiltered ? `Export summary for ${activePeriodLabel}` : 'Print summary'}
              >
                <Download className="h-3 w-3" /> Print PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Date Range Filter Banner */}
      {isDateRangeFiltered && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-indigo-50/80 border border-indigo-200 px-3.5 py-2 text-xs text-indigo-950 shadow-2xs">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Summary Period Filter:</strong>{' '}
              <span className="font-mono font-semibold text-indigo-900 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                {formatIsoToDisplay(effectiveStartDate || minAvailableDate)}
              </span>{' '}
              <span className="text-indigo-400 font-medium">to</span>{' '}
              <span className="font-mono font-semibold text-indigo-900 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                {formatIsoToDisplay(effectiveEndDate || maxAvailableDate)}
              </span>
            </span>
            <span className="text-slate-500 text-[11px]">
              • Recalculated metrics for {filteredSummaries.length} employee{filteredSummaries.length > 1 ? 's' : ''} in this period
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-100/50 transition-colors shadow-2xs"
            >
              <RotateCcw className="h-3 w-3" /> Reset to Full Month
            </button>
          </div>
        </div>
      )}

      {/* Suggested Columns Table (PRD Section 23) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                <th className="py-3 px-3">Employee Name</th>
                <th className="py-3 px-3 font-mono">ID</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Group & Schedule</th>
                <th className="py-3 px-3 text-center">Present Days</th>
                <th className="py-3 px-3 text-center text-teal-800">Congé Payé</th>
                <th className="py-3 px-3 text-center">Absent Days</th>
                <th className="py-3 px-3 text-center">OFF Days</th>
                <th className="py-3 px-3 text-center">Worked Hours</th>
                <th className="py-3 px-3 text-center font-bold text-indigo-700">Supp Hours</th>
                <th className="py-3 px-3 text-center">Late Days</th>
                <th className="py-3 px-3 text-center">Late Minutes</th>
                <th className="py-3 px-3 text-center">Missing Punches</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    No matching monthly summary data found.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((s) => (
                  <tr key={s.employeeId} className="hover:bg-slate-50/70 transition-colors">
                    {/* Employee Name */}
                    <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {s.employeeName}
                    </td>

                    {/* ID (preserved string) */}
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {s.employeeId}
                    </td>

                    {/* Department */}
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {s.companyDepartment}
                    </td>

                    {/* Group & Schedule */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-medium text-slate-700">{s.groupName}</span>
                      <span className="block text-[10px] text-slate-400">{s.scheduleName}</span>
                    </td>

                    {/* Present Days (excluding OFF) */}
                    <td className="py-2.5 px-3 text-center font-semibold text-emerald-600">
                      {s.presentDays}
                    </td>

                    {/* Paid Vacation Days (Congé payé) */}
                    <td className="py-2.5 px-3 text-center">
                      {s.paidVacationDays && s.paidVacationDays > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 border border-teal-200 px-1.5 py-0.5 text-xs font-bold text-teal-700">
                          <Palmtree className="h-3 w-3 text-teal-600" />
                          {s.paidVacationDays} j
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Absent Days (excluding OFF) */}
                    <td className="py-2.5 px-3 text-center font-semibold text-rose-600">
                      {s.absentDays > 0 ? (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700">
                          {s.absentDays}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>

                    {/* OFF Days */}
                    <td className="py-2.5 px-3 text-center text-slate-400">
                      {s.offDays}
                    </td>

                    {/* Worked Hours */}
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                      {s.totalWorkedFormatted}
                    </td>

                    {/* Supp Hours (Overtime, kept separate) */}
                    <td className="py-2.5 px-3 text-center font-bold">
                      {s.totalSuppMinutes > 0 ? (
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-indigo-700">
                          {s.totalSuppFormatted}
                        </span>
                      ) : (
                        <span className="text-slate-400">0h 00</span>
                      )}
                    </td>

                    {/* Late Days */}
                    <td className="py-2.5 px-3 text-center text-amber-700 font-medium">
                      {s.lateDays > 0 ? s.lateDays : '0'}
                    </td>

                    {/* Total Late Minutes */}
                    <td className="py-2.5 px-3 text-center text-amber-800 font-semibold">
                      {s.totalLateMinutes > 0 ? `${s.totalLateMinutes} m` : '0 m'}
                    </td>

                    {/* Missing Punches */}
                    <td className="py-2.5 px-3 text-center">
                      {s.missingPunchesDays > 0 ? (
                        <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[11px] font-semibold text-orange-700">
                          {s.missingPunchesDays} (In: {s.missingEntryCount}, Out: {s.missingExitCount})
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Totals Summary Row */}
            {filteredSummaries.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-800">
                  <td className="py-3 px-3 uppercase tracking-wider text-[11px]" colSpan={4}>
                    Aggregated Total ({filteredSummaries.length} Employees)
                  </td>
                  <td className="py-3 px-3 text-center text-emerald-700">{aggregates.present}</td>
                  <td className="py-3 px-3 text-center text-teal-800 font-bold">{aggregates.vacation}</td>
                  <td className="py-3 px-3 text-center text-rose-700">{aggregates.absent}</td>
                  <td className="py-3 px-3 text-center text-slate-400">-</td>
                  <td className="py-3 px-3 text-center text-slate-900">{aggregates.workedHours}</td>
                  <td className="py-3 px-3 text-center text-indigo-700">{aggregates.suppHours}</td>
                  <td className="py-3 px-3 text-center text-amber-700">{aggregates.lateDays}</td>
                  <td className="py-3 px-3 text-center text-amber-800">{aggregates.lateMins} m</td>
                  <td className="py-3 px-3 text-center text-orange-700">{aggregates.missing}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
