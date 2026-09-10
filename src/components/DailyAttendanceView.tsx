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
  X,
  RotateCcw,
  CalendarRange,
  Zap,
} from 'lucide-react';
import { formatMinutesToHoursAndMinutes } from '../utils/schedules';

interface DailyAttendanceViewProps {
  records: DailyAttendanceRecord[];
  onOpenCorrection: (record: DailyAttendanceRecord) => void;
  onOpenInjectSupp?: (record?: DailyAttendanceRecord) => void;
  onExportExcel: (recordsToExport?: DailyAttendanceRecord[], customPeriodLabel?: string) => void;
  onExportPDF: (recordsToExport?: DailyAttendanceRecord[], customPeriodLabel?: string) => void;
  settings: AppSettings;
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

// Helper to format ISO date YYYY-MM-DD to short display DD/MM/YY
function formatIsoToShortDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
  }
  return dateStr;
}

export const DailyAttendanceView: React.FC<DailyAttendanceViewProps> = ({
  records,
  onOpenCorrection,
  onOpenInjectSupp,
  onExportExcel,
  onExportPDF,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Count unclear shifts needing review
  const unclearCount = useMemo(() => {
    return records.filter((r) => r.isShiftUnclear).length;
  }, [records]);

  // Count records with injected supp hours
  const injectedSuppCount = useMemo(() => {
    return records.filter((r) => (r.injectedSuppMinutes || 0) > 0).length;
  }, [records]);

  // Extract unique departments/groups
  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.groupName) set.add(r.groupName);
    });
    return Array.from(set).sort();
  }, [records]);

  // Extract unique sorted dates from dataset
  const dateOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.date) set.add(r.date);
    });
    return Array.from(set).sort();
  }, [records]);

  const minAvailableDate = dateOptions[0] || '';
  const maxAvailableDate = dateOptions[dateOptions.length - 1] || '';

  // Effective start & end dates (handles inverted selection gracefully)
  const effectiveStartDate = useMemo(() => {
    if (startDate && endDate && startDate > endDate) return endDate;
    return startDate;
  }, [startDate, endDate]);

  const effectiveEndDate = useMemo(() => {
    if (startDate && endDate && startDate > endDate) return startDate;
    return endDate;
  }, [startDate, endDate]);

  const isDateRangeFiltered = Boolean(effectiveStartDate || effectiveEndDate);

  // Quick Presets Handler (e.g. 01 to 08, 01 to 15, etc.)
  const applyQuickPreset = (preset: 'ALL' | '01_08' | '01_15' | '16_END') => {
    if (preset === 'ALL' || dateOptions.length === 0) {
      setStartDate('');
      setEndDate('');
      setPage(1);
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
    setPage(1);
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search term
      if (searchTerm) {
        // Support searching with slashes, backslashes (e.g. 01\09\26 or 01/09/2026)
        const query = searchTerm.toLowerCase().replace(/\\/g, '/').trim();
        const matchesId = r.employeeId.toLowerCase().includes(query);
        const matchesName = r.employeeName.toLowerCase().includes(query);
        const matchesDept = r.companyDepartment.toLowerCase().includes(query);
        const matchesShift = (r.detectedShiftName || '').toLowerCase().includes(query);
        const matchesFormattedDate = r.formattedDate.toLowerCase().includes(query);
        const matchesIsoDate = r.date.toLowerCase().includes(query);
        const matchesDayOfWeek = r.dayOfWeek.toLowerCase().includes(query);
        const matchesShortDate = formatIsoToShortDisplay(r.date).toLowerCase().includes(query);

        if (
          !matchesId &&
          !matchesName &&
          !matchesDept &&
          !matchesShift &&
          !matchesFormattedDate &&
          !matchesIsoDate &&
          !matchesDayOfWeek &&
          !matchesShortDate
        ) {
          return false;
        }
      }

      // Group filter
      if (selectedGroup !== 'ALL' && r.groupName !== selectedGroup) {
        return false;
      }

      // Date Range filter (From effectiveStartDate to effectiveEndDate)
      if (effectiveStartDate && r.date < effectiveStartDate) {
        return false;
      }
      if (effectiveEndDate && r.date > effectiveEndDate) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'SHIFT_UNCLEAR' && !r.isShiftUnclear) return false;
        if (selectedStatus === 'RETARD' && r.delayMinutes === 0) return false;
        if (selectedStatus === 'ABSENCE' && r.observation !== 'Absence') return false;
        if (selectedStatus === 'OFF' && r.observation !== 'OFF') return false;
        if (selectedStatus === 'SUPP' && r.suppMinutes === 0) return false;
        if (selectedStatus === 'INJECTED_SUPP' && (!r.injectedSuppMinutes || r.injectedSuppMinutes === 0)) return false;
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
  }, [records, searchTerm, selectedGroup, effectiveStartDate, effectiveEndDate, selectedStatus]);

  // Count distinct days present in filtered set
  const filteredDaysCount = useMemo(() => {
    const s = new Set<string>();
    filteredRecords.forEach((r) => s.add(r.date));
    return s.size;
  }, [filteredRecords]);

  // Custom period label for export
  const activePeriodLabel = useMemo(() => {
    if (effectiveStartDate && effectiveEndDate) {
      return `${formatIsoToDisplay(effectiveStartDate)} - ${formatIsoToDisplay(effectiveEndDate)}`;
    } else if (effectiveStartDate) {
      return `From ${formatIsoToDisplay(effectiveStartDate)}`;
    } else if (effectiveEndDate) {
      return `Until ${formatIsoToDisplay(effectiveEndDate)}`;
    }
    return undefined;
  }, [effectiveStartDate, effectiveEndDate]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page]);

  // Export handlers passing filtered records and active date range label
  const handleExportXLSX = () => {
    onExportExcel(filteredRecords, activePeriodLabel);
  };

  const handleExportPDFFile = () => {
    onExportPDF(filteredRecords, activePeriodLabel);
  };

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
            {/* Date Range Filter */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
              <Calendar className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              
              {/* From Date */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-medium text-slate-500">From</span>
                <input
                  id="filter-date-from-input"
                  type="date"
                  value={startDate}
                  min={minAvailableDate}
                  max={endDate || maxAvailableDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-700 font-mono outline-none focus:border-indigo-500"
                  title="Filter start date"
                />
              </div>

              {/* To Date */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-medium text-slate-500">To</span>
                <input
                  id="filter-date-to-input"
                  type="date"
                  value={endDate}
                  min={startDate || minAvailableDate}
                  max={maxAvailableDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-700 font-mono outline-none focus:border-indigo-500"
                  title="Filter end date"
                />
              </div>

              {/* Quick Presets Dropdown */}
              <select
                id="filter-date-presets-select"
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

              {/* Clear date filter button */}
              {isDateRangeFiltered && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setPage(1);
                  }}
                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                  title="Reset date range to all dates"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
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
              {injectedSuppCount > 0 && (
                <option value="INJECTED_SUPP">⚡ Injected Supp Hours ({injectedSuppCount})</option>
              )}
              <option value="MISSING">Missing Punches (Entrée / Sortie)</option>
              <option value="ABSENCE">True Absences</option>
              <option value="OFF">Configured OFF Days</option>
            </select>

            {/* Inject Supp Hours Quick Button */}
            {settings.activeRole !== 'Management' && onOpenInjectSupp && (
              <button
                id="toolbar-inject-supp-btn"
                type="button"
                onClick={() => onOpenInjectSupp()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-2.5 py-1 font-semibold text-white transition-colors shadow-2xs text-xs"
                title="Inject / grant supplementary hours for workers"
              >
                <Zap className="h-3.5 w-3.5 fill-white" />
                <span>Inject Supp Hours</span>
              </button>
            )}

            {/* Export buttons */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <button
                id="daily-export-xlsx-btn"
                onClick={handleExportXLSX}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                title={isDateRangeFiltered ? `Export filtered records (${activePeriodLabel})` : 'Export all daily records'}
              >
                <Download className="h-3 w-3" /> Excel
              </button>
              <button
                id="daily-export-pdf-btn"
                onClick={handleExportPDFFile}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 font-semibold text-white hover:bg-slate-900 transition-colors shadow-2xs"
                title={isDateRangeFiltered ? `Export filtered records (${activePeriodLabel})` : 'Export all daily records'}
              >
                <Download className="h-3 w-3" /> PDF
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
              <strong>Date Range Filter:</strong>{' '}
              <span className="font-mono font-semibold text-indigo-900 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                {formatIsoToDisplay(effectiveStartDate || minAvailableDate)}
              </span>{' '}
              <span className="text-indigo-400 font-medium">to</span>{' '}
              <span className="font-mono font-semibold text-indigo-900 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                {formatIsoToDisplay(effectiveEndDate || maxAvailableDate)}
              </span>
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              • {filteredRecords.length} record{filteredRecords.length > 1 ? 's' : ''} across {filteredDaysCount} day{filteredDaysCount > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-100/50 transition-colors shadow-2xs"
            >
              <RotateCcw className="h-3 w-3" /> Clear Date Filter
            </button>
          </div>
        </div>
      )}

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
                <th className="py-3 px-3 text-center">2nd In (Pause)</th>
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
                  <td colSpan={13} className="py-12 text-center text-slate-400">
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
                        <span
                          className={`rounded px-1.5 py-0.5 ${
                            (r.firstCheckInDelayMinutes || 0) > 0
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                          title={
                            (r.firstCheckInDelayMinutes || 0) > 0
                              ? `1st In: ${r.firstCheckInTime || r.entryTime} (Late: ${r.firstCheckInDelayMinutes}m)`
                              : `1st In: ${r.firstCheckInTime || r.entryTime} (On time)`
                          }
                        >
                          {r.firstCheckInTime || r.entryTime}
                        </span>
                      ) : (
                        <span className="text-slate-300">--:--</span>
                      )}
                    </td>

                    {/* 2nd Check-in (Pause) */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                      {r.secondCheckInTime ? (
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-mono inline-flex items-center gap-1 ${
                            (r.secondCheckInDelayMinutes || 0) > 0
                              ? 'bg-amber-100 text-amber-800 font-semibold border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                          title={
                            (r.secondCheckInDelayMinutes || 0) > 0
                              ? `2nd In (Reprise pause): ${r.secondCheckInTime} (Retard: +${r.secondCheckInDelayMinutes}m hors 10 min de grâce)`
                              : `2nd In: ${r.secondCheckInTime} (Ponctuel)`
                          }
                        >
                          {r.secondCheckInTime}
                          {(r.secondCheckInDelayMinutes || 0) > 0 && (
                            <span className="text-[10px] text-amber-700 font-bold">
                              +{r.secondCheckInDelayMinutes}m
                            </span>
                          )}
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
                        <div>
                          <span
                            title={
                              (r.secondCheckInDelayMinutes || 0) > 0 && (r.firstCheckInDelayMinutes || 0) > 0
                                ? `Retard total: ${r.delayMinutes} min (Entrée: ${r.firstCheckInDelayMinutes}m + Pause: ${r.secondCheckInDelayMinutes}m hors 10 min de grâce)`
                                : (r.secondCheckInDelayMinutes || 0) > 0
                                ? `Retard reprise pause: ${r.secondCheckInDelayMinutes} min (hors 10 min de grâce)`
                                : `Retard entrée: ${r.delayMinutes} min (hors grâce)`
                            }
                            className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]"
                          >
                            {r.delayMinutes} min
                          </span>
                          {(r.firstCheckInDelayMinutes || 0) > 0 && (r.secondCheckInDelayMinutes || 0) > 0 && (
                            <span className="block text-[9px] text-slate-400 mt-0.5 whitespace-nowrap">
                              {r.firstCheckInDelayMinutes}m in + {r.secondCheckInDelayMinutes}m brk
                            </span>
                          )}
                        </div>
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
                      {r.injectedSuppMinutes && r.injectedSuppMinutes > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-300 px-1.5 py-0.5 text-amber-900 shadow-2xs"
                          title={`Total Supp: ${r.suppHoursFormatted} (Includes +${formatMinutesToHoursAndMinutes(r.injectedSuppMinutes)} manually injected)`}
                        >
                          <Zap className="h-3 w-3 fill-amber-500 text-amber-600 shrink-0" />
                          <span>{r.suppHoursFormatted}</span>
                          <span className="text-[10px] text-amber-700 font-mono font-medium">
                            (+{formatMinutesToHoursAndMinutes(r.injectedSuppMinutes)})
                          </span>
                        </span>
                      ) : r.suppMinutes > 0 ? (
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
                        <div className="inline-flex items-center gap-1">
                          {onOpenInjectSupp && (
                            <button
                              id={`row-inject-supp-btn-${r.id}`}
                              onClick={() => onOpenInjectSupp(r)}
                              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-xs transition-colors ${
                                r.injectedSuppMinutes && r.injectedSuppMinutes > 0
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                  : 'text-amber-700 hover:bg-amber-50 hover:text-amber-800'
                              }`}
                              title={`Inject or adjust supplementary hours for ${r.employeeName} on ${r.formattedDate}`}
                            >
                              <Zap className="h-3 w-3 fill-amber-500 text-amber-600" />
                              <span>{r.injectedSuppMinutes && r.injectedSuppMinutes > 0 ? 'Edit Supp' : '+ Supp'}</span>
                            </button>
                          )}
                          <button
                            id={`correct-btn-${r.id}`}
                            onClick={() => onOpenCorrection(r)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                            title="Correct punch, resolve unclear shift, or record justification"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>{r.isShiftUnclear ? 'Review Shift' : 'Adjust'}</span>
                          </button>
                        </div>
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
