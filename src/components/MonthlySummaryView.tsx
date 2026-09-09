import React, { useState, useMemo } from 'react';
import { MonthlySummaryRecord, AppSettings } from '../types';
import { Search, Download, Users, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

interface MonthlySummaryViewProps {
  summaries: MonthlySummaryRecord[];
  onExportExcel: () => void;
  onExportPDF: () => void;
  settings: AppSettings;
  periodLabel: string;
}

export const MonthlySummaryView: React.FC<MonthlySummaryViewProps> = ({
  summaries,
  onExportExcel,
  onExportPDF,
  settings,
  periodLabel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');

  // Extract unique groups
  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    summaries.forEach((s) => {
      if (s.groupName) set.add(s.groupName);
    });
    return Array.from(set).sort();
  }, [summaries]);

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
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
  }, [summaries, searchTerm, selectedGroup]);

  // Aggregate totals
  const aggregates = useMemo(() => {
    let totWorkedMins = 0;
    let totSuppMins = 0;
    let totLateDays = 0;
    let totLateMins = 0;
    let totMissing = 0;
    let totPresent = 0;
    let totAbsent = 0;

    filteredSummaries.forEach((s) => {
      totWorkedMins += s.totalWorkedMinutes;
      totSuppMins += s.totalSuppMinutes;
      totLateDays += s.lateDays;
      totLateMins += s.totalLateMinutes;
      totMissing += s.missingPunchesDays;
      totPresent += s.presentDays;
      totAbsent += s.absentDays;
    });

    return {
      workedHours: `${Math.floor(totWorkedMins / 60)}h ${(totWorkedMins % 60).toString().padStart(2, '0')}`,
      suppHours: `${Math.floor(totSuppMins / 60)}h ${(totSuppMins % 60).toString().padStart(2, '0')}`,
      lateDays: totLateDays,
      lateMins: totLateMins,
      missing: totMissing,
      present: totPresent,
      absent: totAbsent,
    };
  }, [filteredSummaries]);

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
            <select
              id="monthly-filter-group-select"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-700 outline-none"
            >
              <option value="ALL">All Groups ({summaries.length} employees)</option>
              {groupOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <button
                id="monthly-export-xlsx-btn"
                onClick={onExportExcel}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
              >
                <Download className="h-3 w-3" /> Export Excel
              </button>
              <button
                id="monthly-export-pdf-btn"
                onClick={onExportPDF}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1 font-semibold text-white hover:bg-slate-900 transition-colors shadow-2xs"
              >
                <Download className="h-3 w-3" /> Print PDF
              </button>
            </div>
          </div>
        </div>
      </div>

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
                  <td colSpan={12} className="py-12 text-center text-slate-400">
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
