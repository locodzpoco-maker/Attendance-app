import React, { useState, useMemo } from 'react';
import {
  DailyAttendanceRecord,
  AppSettings,
} from '../types';
import {
  Search,
  Filter,
  Download,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HelpCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';

interface DailyAttendanceViewProps {
  records: DailyAttendanceRecord[];
  onOpenCorrection: (record: DailyAttendanceRecord) => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  settings: AppSettings;
}

export const DailyAttendanceView: React.FC<DailyAttendanceViewProps> = ({
  records,
  onOpenCorrection,
  onExportExcel,
  onExportPDF,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Count unclear shifts needing review
  const unclearCount = useMemo(() => {
    return records.filter((r) => r.isShiftUnclear).length;
  }, [records]);

  // Extract unique departments/groups
  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.groupName) set.add(r.groupName);
    });
    return Array.from(set).sort();
  }, [records]);

  // Extract unique dates
  const dateOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => set.add(r.date));
    return Array.from(set).sort();
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search term
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesId = r.employeeId.toLowerCase().includes(query);
        const matchesName = r.employeeName.toLowerCase().includes(query);
        const matchesDept = r.companyDepartment.toLowerCase().includes(query);
        const matchesShift = (r.detectedShiftName || '').toLowerCase().includes(query);
        if (!matchesId && !matchesName && !matchesDept && !matchesShift) return false;
      }

      // Group filter
      if (selectedGroup !== 'ALL' && r.groupName !== selectedGroup) {
        return false;
      }

      // Date filter
      if (selectedDate !== 'ALL' && r.date !== selectedDate) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'SHIFT_UNCLEAR' && !r.isShiftUnclear) return false;
        if (selectedStatus === 'RETARD' && r.delayMinutes === 0) return false;
        if (selectedStatus === 'ABSENCE' && r.observation !== 'Absence') return false;
        if (selectedStatus === 'OFF' && r.observation !== 'OFF') return false;
        if (selectedStatus === 'SUPP' && r.suppMinutes === 0) return false;
        if (
          selectedStatus === 'MISSING' &&
          r.observation !== 'Entrée non pointée' &&
          r.observation !== 'Sortie non pointée'
        )
          return false;
        if (selectedStatus === 'PONCTUEL' && (r.delayMinutes > 0 || r.observation !== 'Ponctuel'))
          return false;
      }

      return true;
    });
  }, [records, searchTerm, selectedGroup, selectedDate, selectedStatus]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page]);

  // Helper for Detected Shift badge styling
  const renderDetectedShiftBadge = (record: DailyAttendanceRecord) => {
    if (record.isShiftUnclear) {
      return (
        <span
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border bg-rose-50 text-rose-700 border-rose-300"
          title="First check-in time does not clearly correspond to any Stock shift. Manual review required."
        >
          <AlertTriangle className="h-3 w-3 text-rose-600" />
          SHIFT UNCLEAR
        </span>
      );
    }

    if (record.isDynamicShift) {
      const shiftName = record.detectedShiftName || 'Shift 1';
      let color = 'bg-blue-50 text-blue-700 border-blue-200';
      let icon = null;
      let label = shiftName;

      if (shiftName.includes('Shift 1')) {
        color = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        label = 'Shift 1 (10:00–18:00)';
      } else if (shiftName.includes('Shift 2')) {
        color = 'bg-purple-50 text-purple-700 border-purple-200';
        icon = <span className="text-[10px]">🌙</span>;
        label = 'Shift 2 (18:00–02:00)';
      } else if (shiftName.includes('Shift 3')) {
        color = 'bg-sky-50 text-sky-700 border-sky-200';
        label = 'Shift 3 (08:30–16:00)';
      } else if (shiftName.includes('Shift 4')) {
        color = 'bg-amber-50 text-amber-800 border-amber-200';
        icon = <span className="text-[10px]">🌙</span>;
        label = 'Shift 4 (16:00–00:00)';
      } else if (shiftName === '-') {
        return <span className="text-slate-300">-</span>;
      }

      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${color}`}
          title={`Automatically detected from check-in ${record.firstCheckInTime || record.entryTime || '-'}`}
        >
          {icon}
          {label}
        </span>
      );
    }

    // Admin / Fixed schedule
    return (
      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200">
        {record.groupName}
      </span>
    );
  };

  // Helper for status badge styling
  const renderObservationBadge = (record: DailyAttendanceRecord) => {
    let bg = 'bg-slate-100 text-slate-700 border-slate-200';
    let icon = null;

    switch (record.observation) {
      case 'SHIFT UNCLEAR':
        bg = 'bg-rose-50 text-rose-700 border-rose-300 font-bold';
        icon = <AlertTriangle className="h-3 w-3 text-rose-600" />;
        break;
      case 'Ponctuel':
        bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        icon = <CheckCircle2 className="h-3 w-3" />;
        break;
      case 'Retard':
        bg = 'bg-amber-50 text-amber-800 border-amber-200';
        icon = <Clock className="h-3 w-3" />;
        break;
      case 'Absence':
        bg = 'bg-rose-50 text-rose-700 border-rose-200';
        icon = <AlertTriangle className="h-3 w-3" />;
        break;
      case 'Entrée non pointée':
      case 'Sortie non pointée':
        bg = 'bg-orange-50 text-orange-700 border-orange-200';
        icon = <HelpCircle className="h-3 w-3" />;
        break;
      case 'Sortie après minuit':
        bg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        icon = <Clock className="h-3 w-3" />;
        break;
      case 'OFF':
        bg = 'bg-slate-100 text-slate-600 border-slate-200';
        break;
    }

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${bg}`}
      >
        {icon}
        {record.observationDetail}
      </span>
    );
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Alert banner if any days are flagged as SHIFT UNCLEAR */}
      {unclearCount > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-300 p-3.5 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">{unclearCount} check-in{unclearCount > 1 ? 's' : ''} flagged as SHIFT UNCLEAR:</span>
              <span className="ml-1 text-amber-800">
                The employee's first check-in time did not clearly match any of the 4 Stock shifts (Shift 1, 2, 3, or 4). Flagged for manual review.
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedStatus('SHIFT_UNCLEAR')}
            className="rounded-lg bg-amber-600 text-white font-semibold px-3 py-1 hover:bg-amber-700 transition-colors shrink-0 text-xs shadow-2xs"
          >
            Review Unclear ({unclearCount})
          </button>
        </div>
      )}

      {/* Controls Bar: Search, Filters & Export */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="search-daily-input"
              type="text"
              placeholder="Search by ID, Name, Department, or Shift..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Date filter */}
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <select
                id="filter-date-select"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-700 outline-none"
              >
                <option value="ALL">All Dates ({dateOptions.length} days)</option>
                {dateOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Group filter */}
            <select
              id="filter-group-select"
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-700 outline-none"
            >
              <option value="ALL">All Groups</option>
              {groupOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              id="filter-status-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-700 outline-none"
            >
              <option value="ALL">All Observations</option>
              {unclearCount > 0 && (
                <option value="SHIFT_UNCLEAR">⚠️ SHIFT UNCLEAR ({unclearCount})</option>
              )}
              <option value="PONCTUEL">Ponctuel (On time)</option>
              <option value="RETARD">Retard (Late)</option>
              <option value="SUPP">Overtime / Supp Hours</option>
              <option value="MISSING">Missing Punches (Entrée / Sortie)</option>
              <option value="ABSENCE">True Absences</option>
              <option value="OFF">Configured OFF Days</option>
            </select>

            {/* Export buttons */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <button
                id="daily-export-xlsx-btn"
                onClick={onExportExcel}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
              >
                <Download className="h-3 w-3" /> Excel
              </button>
              <button
                id="daily-export-pdf-btn"
                onClick={onExportPDF}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 font-semibold text-white hover:bg-slate-900 transition-colors shadow-2xs"
              >
                <Download className="h-3 w-3" /> PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Columns Table (PRD Section 21 + Dynamic Shift Specification) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 font-mono">ID</th>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3 text-center">First Check-in</th>
                <th className="py-3 px-3 text-center">Detected Shift</th>
                <th className="py-3 px-3 text-center">Exit</th>
                <th className="py-3 px-3 text-center">Delay</th>
                <th className="py-3 px-3 text-center">Break</th>
                <th className="py-3 px-3 text-center">Worked</th>
                <th className="py-3 px-3 text-center font-bold text-indigo-700">Supp (OT)</th>
                <th className="py-3 px-3">Observation</th>
                {settings.activeRole !== 'Management' && (
                  <th className="py-3 px-3 text-right">Audit Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    No matching attendance records found for the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      r.isShiftUnclear
                        ? 'bg-rose-50/40 border-l-2 border-rose-500'
                        : r.isManuallyAdjusted
                          ? 'bg-amber-50/30'
                          : ''
                    }`}
                  >
                    {/* Date */}
                    <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                      {r.formattedDate}
                      <span className="block text-[10px] text-slate-400">{r.dayOfWeek.slice(0, 3)}</span>
                    </td>

                    {/* ID (preserved string with leading zeros) */}
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {r.employeeId}
                    </td>

                    {/* Employee Name */}
                    <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {r.employeeName}
                        {r.isManuallyAdjusted && (
                          <span
                            title={`Manually adjusted: ${r.manualAdjustment?.reason}`}
                            className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-100 px-1 rounded-sm"
                          >
                            Adjusted
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-400">
                        {r.companyDepartment}
                      </span>
                    </td>

                    {/* First Check-in */}
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800">
                      {r.firstCheckInTime || r.entryTime ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">
                          {r.firstCheckInTime || r.entryTime}
                        </span>
                      ) : (
                        <span className="text-slate-300">--:--</span>
                      )}
                    </td>

                    {/* Detected Shift (Dynamic Daily Result) */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {renderDetectedShiftBadge(r)}
                    </td>

                    {/* Exit */}
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-800">
                      {r.exitTime ? (
                        <span className="inline-flex items-center gap-1">
                          {r.exitTime}
                          {r.isOvernightPunch && (
                            <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1 rounded">
                              +1d
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-300">--:--</span>
                      )}
                    </td>

                    {/* Delay */}
                    <td className="py-2.5 px-3 text-center">
                      {r.delayMinutes > 0 ? (
                        <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                          {r.delayMinutes} min
                        </span>
                      ) : (
                        <span className="text-slate-400">0 min</span>
                      )}
                    </td>

                    {/* Break */}
                    <td className="py-2.5 px-3 text-center text-slate-500">
                      {r.breakDurationMinutes > 0 ? (
                        `${Math.floor(r.breakDurationMinutes / 60)}h${r.breakDurationMinutes % 60 ? (r.breakDurationMinutes % 60) + 'm' : ''}`
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Worked Hours */}
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-800">
                      {r.workedHoursFormatted}
                    </td>

                    {/* Supp (Overtime) Hours */}
                    <td className="py-2.5 px-3 text-center font-bold">
                      {r.suppMinutes > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">
                          {r.suppHoursFormatted}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    {/* Observation */}
                    <td className="py-2.5 px-3">{renderObservationBadge(r)}</td>

                    {/* Manual Audit Action */}
                    {settings.activeRole !== 'Management' && (
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          id={`correct-btn-${r.id}`}
                          onClick={() => onOpenCorrection(r)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                          title="Correct punch, resolve unclear shift, or record justification"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>{r.isShiftUnclear ? 'Review Shift' : 'Adjust'}</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold">{paginatedRecords.length}</span> of{' '}
            <span className="font-semibold">{filteredRecords.length}</span> records
          </div>
          <div className="flex items-center gap-2">
            <button
              id="prev-page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-300 p-1 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              id="next-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-300 p-1 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
