import React, { useState, useMemo, useEffect } from 'react';
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
  Palmtree,
  Archive,
  Users,
  UserX,
  UserCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatMinutesToHoursAndMinutes } from '../utils/schedules';
import { getTranslations, translateDayOfWeek, Translations } from '../utils/i18n';
import { isAdminWorker, isStockWorker } from '../utils/employees';
import { getStorageItem, saveStorageItem } from '../utils/storage';

interface SavedDailyFilters {
  searchTerm?: string;
  selectedGroup?: 'ADMIN' | 'STOCK';
  selectedStatus?: string;
  excludeArchived?: boolean;
  excludeZeroPunches?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
}

interface DailyAttendanceViewProps {
  records: DailyAttendanceRecord[];
  onOpenCorrection: (record: DailyAttendanceRecord) => void;
  onOpenInjectSupp?: (record?: DailyAttendanceRecord) => void;
  onOpenVacationForEmployee?: (empId: string, date: string) => void;
  onToggleExactPunchOnly?: (recordId: string) => void;
  onExportExcel: (recordsToExport?: DailyAttendanceRecord[], customPeriodLabel?: string) => void;
  onExportPDF: (recordsToExport?: DailyAttendanceRecord[], customPeriodLabel?: string) => void;
  settings: AppSettings;
  selectedEmployeeId?: string | null;
  onClearSelectedEmployee?: () => void;
}

// Helpers to classify records strictly into Admin vs Stock
export function isDailyRecordStock(r: DailyAttendanceRecord): boolean {
  if (isAdminWorker(r.employeeId)) return false;
  if (isStockWorker(r.employeeId)) return true;
  if (r.isDynamicShift) return true;
  const dept = (r.companyDepartment || '').toLowerCase();
  const grp = (r.groupName || '').toLowerCase();
  const sched = (r.scheduleId || '').toLowerCase();
  return (
    dept.includes('stock') ||
    dept.includes('depot') ||
    dept.includes('dépôt') ||
    grp.includes('stock') ||
    sched.includes('stock')
  );
}

export function isDailyRecordAdmin(r: DailyAttendanceRecord): boolean {
  return !isDailyRecordStock(r);
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
  onOpenVacationForEmployee,
  onToggleExactPunchOnly,
  onExportExcel,
  onExportPDF,
  settings,
  selectedEmployeeId,
  onClearSelectedEmployee,
}) => {
  const t = getTranslations(settings.language);
  const [savedFilters] = useState<SavedDailyFilters | null>(() =>
    getStorageItem<SavedDailyFilters | null>('ams_daily_filters', null)
  );
  const [searchTerm, setSearchTerm] = useState(savedFilters?.searchTerm ?? '');
  const [selectedGroup, setSelectedGroup] = useState<'ADMIN' | 'STOCK'>(savedFilters?.selectedGroup ?? 'ADMIN');
  const [selectedStatus, setSelectedStatus] = useState(savedFilters?.selectedStatus ?? 'ALL');
  const [excludeArchived, setExcludeArchived] = useState(savedFilters?.excludeArchived ?? true);
  const [excludeZeroPunches, setExcludeZeroPunches] = useState(savedFilters?.excludeZeroPunches ?? false);
  const [startDate, setStartDate] = useState(savedFilters?.startDate ?? '');
  const [endDate, setEndDate] = useState(savedFilters?.endDate ?? '');
  const [page, setPage] = useState(savedFilters?.page ?? 1);
  const pageSize = 25;

  // Persist filters to localStorage in real time
  useEffect(() => {
    saveStorageItem('ams_daily_filters', {
      searchTerm,
      selectedGroup,
      selectedStatus,
      excludeArchived,
      excludeZeroPunches,
      startDate,
      endDate,
      page,
      selectedEmployeeId: selectedEmployeeId || undefined,
    });
  }, [searchTerm, selectedGroup, selectedStatus, excludeArchived, excludeZeroPunches, startDate, endDate, page, selectedEmployeeId]);

  // Sync selected employee from props only when selectedEmployeeId actually changes value (prevent resetting when records recompute)
  const prevSelectedEmployeeIdRef = React.useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (selectedEmployeeId && selectedEmployeeId !== prevSelectedEmployeeIdRef.current) {
      prevSelectedEmployeeIdRef.current = selectedEmployeeId;
      const empRecords = records.filter((r) => r.employeeId === selectedEmployeeId);
      const isStock = empRecords.length > 0
        ? isDailyRecordStock(empRecords[0])
        : isStockWorker(selectedEmployeeId);

      setSelectedGroup(isStock ? 'STOCK' : 'ADMIN');

      const isArchived = empRecords.some((r) => r.isArchived);
      if (isArchived) {
        setExcludeArchived(false);
      }
      setExcludeZeroPunches(false);
      setPage(1);
    } else if (!selectedEmployeeId) {
      prevSelectedEmployeeIdRef.current = null;
    }
  }, [selectedEmployeeId, records]);

  // Listen for progress restored event to update active filters in real-time
  useEffect(() => {
    const handleProgressRestored = () => {
      const restored = getStorageItem<SavedDailyFilters | null>('ams_daily_filters', null);
      if (restored) {
        if (restored.searchTerm !== undefined) setSearchTerm(restored.searchTerm);
        if (restored.selectedGroup !== undefined) setSelectedGroup(restored.selectedGroup);
        if (restored.selectedStatus !== undefined) setSelectedStatus(restored.selectedStatus);
        if (restored.excludeArchived !== undefined) setExcludeArchived(restored.excludeArchived);
        if (restored.excludeZeroPunches !== undefined) setExcludeZeroPunches(restored.excludeZeroPunches);
        if (restored.startDate !== undefined) setStartDate(restored.startDate);
        if (restored.endDate !== undefined) setEndDate(restored.endDate);
        if (restored.page !== undefined) setPage(restored.page);
      }
    };
    window.addEventListener('ams_progress_restored', handleProgressRestored);
    return () => window.removeEventListener('ams_progress_restored', handleProgressRestored);
  }, []);

  // Selected employee information for the active filter banner
  const selectedEmployeeInfo = useMemo(() => {
    if (!selectedEmployeeId) return null;
    const rec = records.find((r) => r.employeeId === selectedEmployeeId);
    return rec
      ? { id: rec.employeeId, name: rec.employeeName, dept: rec.companyDepartment }
      : { id: selectedEmployeeId, name: selectedEmployeeId, dept: '' };
  }, [selectedEmployeeId, records]);

  // Count archived records
  const archivedRecordsCount = useMemo(() => {
    return records.filter((r) => r.isArchived).length;
  }, [records]);

  // Count unclear shifts needing review
  const unclearCount = useMemo(() => {
    return records.filter((r) => r.isShiftUnclear).length;
  }, [records]);

  // Count records with injected supp hours
  const injectedSuppCount = useMemo(() => {
    return records.filter((r) => (r.injectedSuppMinutes || 0) > 0).length;
  }, [records]);

  // Count unique workers in Admin and Stock groups
  const adminWorkersCount = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (isDailyRecordAdmin(r) && (!excludeArchived || !r.isArchived)) {
        set.add(r.employeeId);
      }
    });
    return set.size;
  }, [records, excludeArchived]);

  const stockWorkersCount = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (isDailyRecordStock(r) && (!excludeArchived || !r.isArchived)) {
        set.add(r.employeeId);
      }
    });
    return set.size;
  }, [records, excludeArchived]);

  // Set of employee IDs that have 0 punches for the entire month
  const zeroPunchEmployeeIds = useMemo(() => {
    const punchCountMap = new Map<string, number>();
    records.forEach((r) => {
      const count = (r.rawPunches && r.rawPunches.length > 0)
        ? r.rawPunches.length
        : ((r.firstCheckInTime || r.entryTime ? 1 : 0) + (r.secondCheckInTime ? 1 : 0) + (r.exitTime ? 1 : 0));
      punchCountMap.set(r.employeeId, (punchCountMap.get(r.employeeId) || 0) + count);
    });

    const set = new Set<string>();
    punchCountMap.forEach((count, empId) => {
      if (count === 0) set.add(empId);
    });
    return set;
  }, [records]);

  // Count of zero punch workers in the current group (Admin/Stock)
  const zeroPunchEmployeesInGroupCount = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (excludeArchived && r.isArchived) return;
      if (selectedGroup === 'ADMIN' && !isDailyRecordAdmin(r)) return;
      if (selectedGroup === 'STOCK' && !isDailyRecordStock(r)) return;
      if (zeroPunchEmployeeIds.has(r.employeeId)) {
        set.add(r.employeeId);
      }
    });
    return set.size;
  }, [records, excludeArchived, selectedGroup, zeroPunchEmployeeIds]);

  // Count of records with Exact Punch Mode enabled in current group
  const exactPunchCount = useMemo(() => {
    return records.filter((r) => {
      if (excludeArchived && r.isArchived) return false;
      if (selectedGroup === 'ADMIN' && !isDailyRecordAdmin(r)) return false;
      if (selectedGroup === 'STOCK' && !isDailyRecordStock(r)) return false;
      return Boolean(r.exactPunchOnly);
    }).length;
  }, [records, excludeArchived, selectedGroup]);

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
      // Drilldown employee filter from Monthly Summary
      if (selectedEmployeeId && r.employeeId !== selectedEmployeeId) {
        return false;
      }

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

      // Group filter: Strictly 2 options (ADMIN: all admin workers with admin shifts; STOCK: all stock workers with stock shifts)
      if (selectedGroup === 'ADMIN' && !isDailyRecordAdmin(r)) {
        return false;
      }
      if (selectedGroup === 'STOCK' && !isDailyRecordStock(r)) {
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
        if (selectedStatus === 'VACATION' && r.observation !== 'Congé payé' && !r.isPaidVacation) return false;
        if (selectedStatus === 'SUPP' && r.suppMinutes === 0) return false;
        if (selectedStatus === 'INJECTED_SUPP' && (!r.injectedSuppMinutes || r.injectedSuppMinutes === 0)) return false;
        if (selectedStatus === 'ZERO_PUNCHES' && !zeroPunchEmployeeIds.has(r.employeeId)) return false;
        if (selectedStatus === 'EXACT_PUNCHES' && !r.exactPunchOnly) return false;
        if (
          selectedStatus === 'MISSING' &&
          r.observation !== 'Entrée non pointée' &&
          r.observation !== 'Sortie non pointée'
        )
          return false;
        if (selectedStatus === 'PONCTUEL' && (r.delayMinutes > 0 || r.observation !== 'Ponctuel'))
          return false;
      }

      // Exclude archived employees if toggle is active
      if (excludeArchived && r.isArchived) {
        return false;
      }

      // Exclude employees with 0 punches across the month if toggle is active
      if (excludeZeroPunches && !selectedEmployeeId && zeroPunchEmployeeIds.has(r.employeeId)) {
        return false;
      }

      return true;
    });
  }, [records, searchTerm, selectedGroup, effectiveStartDate, effectiveEndDate, selectedStatus, excludeArchived, excludeZeroPunches, selectedEmployeeId, zeroPunchEmployeeIds]);

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

  // Helper to translate observation details
  const getObservationDisplay = (record: DailyAttendanceRecord): string => {
    switch (record.observation) {
      case 'SHIFT UNCLEAR':
        return t.obsShiftUnclear;
      case 'Ponctuel':
        return t.obsOnTime;
      case 'Retard':
        if (record.observationDetail) {
          return record.observationDetail.replace('Retard', t.obsLate).replace('Late', t.obsLate);
        }
        return t.obsLate;
      case 'Absence':
        return t.obsAbsent;
      case 'Entrée non pointée':
        return t.obsMissingEntry;
      case 'Sortie non pointée':
        return t.obsMissingExit;
      case 'Sortie après minuit':
        return t.obsExitAfterMidnight;
      case 'OFF':
        return t.obsOff;
      case 'Congé payé':
        return t.obsPaidVacation;
      case 'Congé / Férié':
        return t.obsHoliday;
      default:
        return record.observationDetail || record.observation;
    }
  };

  // Helper for Detected Shift badge styling
  const renderDetectedShiftBadge = (record: DailyAttendanceRecord) => {
    if (record.isShiftUnclear) {
      return (
        <span
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border bg-rose-50 text-rose-700 border-rose-300"
          title={t.shiftUnclear}
        >
          <AlertTriangle className="h-3 w-3 text-rose-600" />
          {t.obsShiftUnclear}
        </span>
      );
    }

    if (record.isDynamicShift) {
      const shiftName = record.detectedShiftName || 'Shift 1';
      let color = 'bg-blue-50 text-blue-700 border-blue-200';
      let icon = null;
      let label = shiftName;

      if (shiftName.includes('Samedi') || shiftName.includes('Saturday') || record.detectedShiftId === 'stock_sat') {
        color = 'bg-teal-50 text-teal-800 border-teal-200';
        icon = <span className="text-[10px]">📅</span>;
        label = t.shiftSatLabel;
      } else if (shiftName.includes('Shift 1')) {
        color = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        label = t.shift1Label;
      } else if (shiftName.includes('Shift 2')) {
        color = 'bg-purple-50 text-purple-700 border-purple-200';
        icon = <span className="text-[10px]">🌙</span>;
        label = t.shift2Label;
      } else if (shiftName.includes('Shift 3')) {
        color = 'bg-sky-50 text-sky-700 border-sky-200';
        label = t.shift3Label;
      } else if (shiftName.includes('Shift 4')) {
        color = 'bg-amber-50 text-amber-800 border-amber-200';
        icon = <span className="text-[10px]">🌙</span>;
        label = t.shift4Label;
      } else if (shiftName === '-') {
        return <span className="text-slate-300">-</span>;
      }

      return (
        <span
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold border whitespace-nowrap ${color}`}
          title={`Check-in ${record.firstCheckInTime || record.entryTime || '-'}`}
        >
          {icon}
          {label}
        </span>
      );
    }

    // Admin / Fixed schedule
    const isSat =
      record.dayOfWeek === 'Saturday' &&
      (record.scheduleId === 'admin_sat' ||
        record.detectedShiftName?.includes('Samedi') ||
        record.groupName?.includes('Samedi'));
    const adminLabel = record.scheduleName || record.groupName || t.adminFixedSchedule;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold border whitespace-nowrap ${
          isSat
            ? 'bg-teal-50 text-teal-800 border-teal-200'
            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
        }`}
        title={record.scheduleName || record.groupName}
      >
        {isSat && <span className="text-[10px]">📅</span>}
        {adminLabel}
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
      case 'Congé payé':
      case 'Congé / Férié':
        bg = 'bg-teal-50 text-teal-800 border-teal-200';
        icon = <Palmtree className="h-3 w-3 text-teal-600" />;
        break;
    }

    return (
      <span
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold border whitespace-nowrap ${bg}`}
      >
        {icon}
        {getObservationDisplay(record)}
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
              <span className="font-bold">{unclearCount} {t.obsShiftUnclear}:</span>
              <span className="ml-1 text-amber-800">
                {t.shiftUnclear}
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedStatus('SHIFT_UNCLEAR')}
            className="rounded-lg bg-amber-600 text-white font-semibold px-3 py-1 hover:bg-amber-700 transition-colors shrink-0 text-xs shadow-2xs"
          >
            {t.obsShiftUnclear} ({unclearCount})
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
              placeholder={t.searchWorker}
              value={searchTerm}
              onChange={(e) => {
                if (selectedEmployeeId && onClearSelectedEmployee) {
                  onClearSelectedEmployee();
                }
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
                <span className="text-[11px] font-medium text-slate-500">{t.fromLabel}</span>
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
                <span className="text-[11px] font-medium text-slate-500">{t.toLabel}</span>
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
                <option value="ALL">{t.allDatesPreset} ({dateOptions.length} {t.daysWord})</option>
                <option value="PRESET_01_08">{t.presetFirst8}</option>
                <option value="PRESET_01_15">{t.presetFirst15}</option>
                <option value="PRESET_16_END">{t.presetSecondHalf}</option>
                {isDateRangeFiltered && <option value="CUSTOM">{t.customRange}</option>}
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
                  title={t.clearDateFilter}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Group filter: Exactly 2 options (Admin & Stock) */}
            <select
              id="filter-group-select"
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value as 'ADMIN' | 'STOCK');
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer"
            >
              <option value="ADMIN">
                🏢 {t.dailyFilterAdminOption} ({adminWorkersCount})
              </option>
              <option value="STOCK">
                📦 {t.dailyFilterStockOption} ({stockWorkersCount})
              </option>
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
              <option value="ALL">{t.allObservations}</option>
              {unclearCount > 0 && (
                <option value="SHIFT_UNCLEAR">⚠️ {t.obsShiftUnclear} ({unclearCount})</option>
              )}
              <option value="PONCTUEL">{t.obsOnTime}</option>
              <option value="RETARD">{t.obsLate}</option>
              <option value="SUPP">{t.colOvertime}</option>
              {injectedSuppCount > 0 && (
                <option value="INJECTED_SUPP">⚡ {t.injectedSuppHours} ({injectedSuppCount})</option>
              )}
              <option value="MISSING">{t.colMissingPunches}</option>
              {zeroPunchEmployeesInGroupCount > 0 && (
                <option value="ZERO_PUNCHES">🚫 {t.zeroPunchesBadge} ({zeroPunchEmployeesInGroupCount})</option>
              )}
              {exactPunchCount > 0 && (
                <option value="EXACT_PUNCHES">⏱️ {t.filterExactPunches} ({exactPunchCount})</option>
              )}
              <option value="VACATION">🌴 {t.paidVacations}</option>
              <option value="ABSENCE">{t.obsAbsent}</option>
              <option value="OFF">{t.obsOff}</option>
            </select>

            {/* Exclude / Include Archived Toggle */}
            <button
              id="daily-exclude-archived-toggle"
              type="button"
              onClick={() => {
                setExcludeArchived((prev) => !prev);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all shadow-2xs ${
                excludeArchived
                  ? 'bg-slate-800 text-white border-slate-900 hover:bg-slate-900'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
              title={excludeArchived ? t.includeArchived : t.excludeArchived}
            >
              <Archive className="h-3.5 w-3.5" />
              <span>{excludeArchived ? t.excludeArchived : t.includeArchived}</span>
              {archivedRecordsCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    excludeArchived ? 'bg-slate-700 text-slate-200' : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {excludeArchived ? `${archivedRecordsCount} ${t.archivedExcludedBadge}` : archivedRecordsCount}
                </span>
              )}
            </button>

            {/* Exclude / Include Zero Punches Toggle */}
            <button
              id="daily-exclude-zero-punches-toggle"
              type="button"
              onClick={() => {
                setExcludeZeroPunches((prev) => !prev);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all shadow-2xs ${
                excludeZeroPunches
                  ? 'bg-rose-700 text-white border-rose-800 hover:bg-rose-800'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              title={excludeZeroPunches ? t.showZeroPunches : t.hideZeroPunches}
            >
              {excludeZeroPunches ? (
                <UserX className="h-3.5 w-3.5 text-rose-200" />
              ) : (
                <UserCheck className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span>{excludeZeroPunches ? t.hideZeroPunches : t.showZeroPunches}</span>
              {zeroPunchEmployeesInGroupCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    excludeZeroPunches ? 'bg-rose-800 text-rose-100' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {zeroPunchEmployeesInGroupCount}
                </span>
              )}
            </button>

            {/* Inject Supp Hours Quick Button */}
            {settings.activeRole !== 'Management' && onOpenInjectSupp && (
              <button
                id="toolbar-inject-supp-btn"
                type="button"
                onClick={() => onOpenInjectSupp()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-2.5 py-1 font-semibold text-white transition-colors shadow-2xs text-xs"
                title={t.injectSuppHours}
              >
                <Zap className="h-3.5 w-3.5 fill-white" />
                <span>{t.injectSuppHours}</span>
              </button>
            )}

            {/* Export buttons */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <button
                id="daily-export-xlsx-btn"
                onClick={handleExportXLSX}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                title={isDateRangeFiltered ? `${t.exportExcel} (${activePeriodLabel})` : t.exportExcel}
              >
                <Download className="h-3 w-3" /> {t.exportExcel}
              </button>
              <button
                id="daily-export-pdf-btn"
                onClick={handleExportPDFFile}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 font-semibold text-white hover:bg-slate-900 transition-colors shadow-2xs"
                title={isDateRangeFiltered ? `${t.exportPdf} (${activePeriodLabel})` : t.exportPdf}
              >
                <Download className="h-3 w-3" /> {t.exportPdf}
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
              <strong>{t.filterDateRange}:</strong>{' '}
              <span className="font-mono font-semibold text-indigo-900 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                {formatIsoToDisplay(effectiveStartDate || minAvailableDate)}
              </span>{' '}
              <span className="text-indigo-400 font-medium">{t.toLabel}</span>{' '}
              <span className="font-mono font-semibold text-indigo-900 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                {formatIsoToDisplay(effectiveEndDate || maxAvailableDate)}
              </span>
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              • {filteredRecords.length} {t.recordsWord} {t.acrossWord} {filteredDaysCount} {t.daysWord}
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
              <RotateCcw className="h-3 w-3" /> {t.clearDateFilter}
            </button>
          </div>
        </div>
      )}

      {/* Active Employee Drilldown Filter Banner */}
      {selectedEmployeeInfo && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-indigo-50/90 border border-indigo-200 px-3.5 py-2.5 text-xs text-indigo-950 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs">
              <Users className="h-4 w-4" />
            </div>
            <span>
              <strong>{t.filteringByEmployee}:</strong>{' '}
              <span className="font-bold text-indigo-950 text-sm">{selectedEmployeeInfo.name}</span>{' '}
              <span className="font-mono font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                ID: {selectedEmployeeInfo.id}
              </span>
              {selectedEmployeeInfo.dept && (
                <span className="text-slate-600 ml-1.5 font-medium">({selectedEmployeeInfo.dept})</span>
              )}
              <span className="text-slate-500 font-mono text-[11px] ml-2">
                • {filteredRecords.length} {t.recordsWord}
              </span>
            </span>
          </div>
          <button
            type="button"
            id="clear-selected-employee-btn"
            onClick={() => onClearSelectedEmployee?.()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-100/70 transition-colors shadow-2xs cursor-pointer"
            title={t.viewAllEmployees}
          >
            <X className="h-3.5 w-3.5 text-indigo-600" />
            <span>{t.viewAllEmployees}</span>
          </button>
        </div>
      )}

      {/* 0-Punches notification banner in Daily Attendance */}
      {excludeZeroPunches && zeroPunchEmployeesInGroupCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50/90 border border-amber-200 px-3.5 py-2 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>{t.filterZeroPunches}:</strong>{' '}
              <span>{zeroPunchEmployeesInGroupCount} {t.zeroPunchesHiddenNotice}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setExcludeZeroPunches(false)}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200 hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Eye className="h-3 w-3" />
            <span>{t.showZeroPunches}</span>
          </button>
        </div>
      )}

      {selectedStatus === 'ZERO_PUNCHES' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2 text-xs text-rose-950 shadow-2xs">
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-rose-600 shrink-0" />
            <span>
              <strong>{t.zeroPunchesBannerTitle}:</strong>{' '}
              <span className="font-semibold text-rose-900">{zeroPunchEmployeesInGroupCount} {t.zeroPunchesBannerDesc}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedStatus('ALL')}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{t.filterAllWorkers}</span>
          </button>
        </div>
      )}

      {selectedStatus === 'EXACT_PUNCHES' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky-50 border border-sky-200 px-3.5 py-2 text-xs text-sky-950 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
            <span>
              <strong>{t.exactPunchOptionTitle}:</strong>{' '}
              <span className="font-semibold text-sky-900">{exactPunchCount} {t.exactPunchOptionDesc}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedStatus('ALL')}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{t.filterAllWorkers}</span>
          </button>
        </div>
      )}

      {/* Suggested Columns Table (PRD Section 21 + Dynamic Shift Specification) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs table-auto">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold text-[11px]">
                <th
                  className="py-2.5 px-1 text-center w-8 font-bold whitespace-nowrap"
                  title={t.colExactPunchTooltip}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    {t.colExactPunchShort}
                  </span>
                </th>
                <th className="py-2.5 px-2 whitespace-nowrap">{t.colDate}</th>
                <th className="py-2.5 px-2 font-mono whitespace-nowrap">{t.colId}</th>
                <th className="py-2.5 px-2 whitespace-nowrap">{t.colName}</th>
                <th className="py-2.5 px-1.5 text-center whitespace-nowrap">{t.colIn}</th>
                <th className="py-2.5 px-1.5 text-center whitespace-nowrap">{t.secondCheckIn}</th>
                <th className="py-2.5 px-1.5 text-center whitespace-nowrap">{t.colShift}</th>
                <th className="py-2.5 px-1.5 text-center whitespace-nowrap">{t.colOut}</th>
                <th className="py-2.5 px-1.5 text-center whitespace-nowrap">{t.colLate}</th>
                <th className="py-2.5 px-1.5 text-center whitespace-nowrap">{t.colBreak}</th>
                <th className="py-2.5 px-1.5 text-center whitespace-nowrap">{t.colWorked}</th>
                <th className="py-2.5 px-1.5 text-center font-bold text-indigo-700 whitespace-nowrap">{t.colSupp}</th>
                <th className="py-2.5 px-2 whitespace-nowrap">{t.colObservation}</th>
                {settings.activeRole !== 'Management' && (
                  <th className="py-2.5 px-2 text-right whitespace-nowrap">{t.colActions}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock className="h-8 w-8 text-slate-300" />
                      <p className="font-semibold text-slate-700 text-sm">
                        {records.length === 0
                          ? settings.language === 'ar'
                            ? 'لا توجد تسجيلات حضور محملة'
                            : settings.language === 'en'
                            ? 'No Attendance Records Loaded'
                            : 'Aucun enregistrement de présence chargé'
                          : t.noRecordsFound}
                      </p>
                      <p className="text-xs text-slate-400 max-w-md">
                        {records.length === 0
                          ? settings.language === 'ar'
                            ? 'قم باستيراد ملف البصمة البيومترية من الشريط العلوي لعرض الحضور اليومي وساعات العمل.'
                            : settings.language === 'en'
                            ? 'Import a biometric fingerprint file from the top bar to calculate daily attendance and worked hours.'
                            : 'Importez un fichier d’émargement biométrique depuis la barre supérieure pour afficher les pointages et les heures travaillées.'
                          : ''}
                      </p>
                    </div>
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
                    {/* Ignore Late / On Time Checkbox */}
                    <td className="py-2 px-1 text-center whitespace-nowrap">
                      <label
                        htmlFor={`check-exact-punch-${r.id}`}
                        className="inline-flex items-center justify-center p-0.5 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                        title={
                          r.exactPunchOnly
                            ? t.exactPunchEnabledTitle
                            : t.exactPunchDisabledTitle
                        }
                      >
                        <input
                          id={`check-exact-punch-${r.id}`}
                          type="checkbox"
                          checked={Boolean(r.exactPunchOnly)}
                          onChange={() => onToggleExactPunchOnly?.(r.id)}
                          disabled={settings.activeRole === 'Management'}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed transition-transform hover:scale-110"
                        />
                      </label>
                    </td>

                    {/* Date */}
                    <td className="py-2 px-2 font-medium text-slate-800 whitespace-nowrap">
                      <div className="flex items-baseline gap-1">
                        <span>{r.formattedDate}</span>
                        <span className="text-[10px] text-slate-400">
                          {translateDayOfWeek(r.dayOfWeek as any, settings.language).slice(0, 3)}
                        </span>
                      </div>
                    </td>

                    {/* ID (preserved string with leading zeros) */}
                    <td className="py-2 px-2 font-mono font-semibold text-slate-700 whitespace-nowrap text-[11px]">
                      {r.employeeId}
                    </td>

                    {/* Employee Name */}
                    <td className="py-2 px-2 font-medium text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-900">{r.employeeName}</span>
                        {zeroPunchEmployeeIds.has(r.employeeId) && (
                          <span
                            title={t.zeroPunchesBadge}
                            className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1 py-0.2 text-[9px] font-bold text-rose-800 border border-rose-300"
                          >
                            <UserX className="h-2 w-2 text-rose-600" />
                            {t.zeroPunchesBadge}
                          </span>
                        )}
                        {r.isArchived && (
                          <span
                            title={t.archived}
                            className="inline-flex items-center gap-0.5 rounded bg-slate-200 px-1 py-0.2 text-[9px] font-semibold text-slate-700 border border-slate-300"
                          >
                            <Archive className="h-2 w-2" />
                            {t.archived}
                          </span>
                        )}
                        {r.isManuallyAdjusted && (
                          <span
                            title={`Manually adjusted: ${r.manualAdjustment?.reason}`}
                            className="inline-flex items-center text-[9px] font-semibold text-amber-700 bg-amber-100 px-1 rounded-sm"
                          >
                            {t.adjustedBadge}
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-400 truncate max-w-[130px]">
                        {r.companyDepartment}
                      </span>
                    </td>

                    {/* First Check-in */}
                    <td className="py-2 px-1.5 text-center font-mono font-semibold text-slate-800 whitespace-nowrap text-[11px]">
                      {r.firstCheckInTime || r.entryTime ? (
                        <span
                          className={`rounded px-1 py-0.5 ${
                            (r.firstCheckInDelayMinutes || 0) > 0
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                          title={
                            (r.firstCheckInDelayMinutes || 0) > 0
                              ? `1st In: ${r.firstCheckInTime || r.entryTime} (${t.obsLate}: ${r.firstCheckInDelayMinutes}m)`
                              : `1st In: ${r.firstCheckInTime || r.entryTime} (${t.obsOnTime})`
                          }
                        >
                          {r.firstCheckInTime || r.entryTime}
                        </span>
                      ) : (
                        <span className="text-slate-300">--:--</span>
                      )}
                    </td>

                    {/* 2nd Check-in (Pause) */}
                    <td className="py-2 px-1.5 text-center font-mono text-slate-700 whitespace-nowrap text-[11px]">
                      {r.secondCheckInTime ? (
                        <span
                          className={`rounded px-1 py-0.5 text-[11px] font-mono inline-flex items-center gap-0.5 ${
                            (r.secondCheckInDelayMinutes || 0) > 0
                              ? 'bg-amber-100 text-amber-800 font-semibold border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                          title={
                            (r.secondCheckInDelayMinutes || 0) > 0
                              ? `2nd In: ${r.secondCheckInTime} (${t.obsLate}: +${r.secondCheckInDelayMinutes}m)`
                              : `2nd In: ${r.secondCheckInTime} (${t.obsOnTime})`
                          }
                        >
                          {r.secondCheckInTime}
                          {(r.secondCheckInDelayMinutes || 0) > 0 && (
                            <span className="text-[9px] text-amber-700 font-bold">
                              +{r.secondCheckInDelayMinutes}m
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-300">--:--</span>
                      )}
                    </td>

                    {/* Detected Shift (Dynamic Daily Result) */}
                    <td className="py-2 px-1.5 text-center whitespace-nowrap">
                      {renderDetectedShiftBadge(r)}
                    </td>

                    {/* Exit */}
                    <td className="py-2 px-1.5 text-center font-mono font-medium text-slate-800 whitespace-nowrap text-[11px]">
                      {r.exitTime ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-0.5">
                            <span className={(r.earlyExitMinutes || 0) > 0 ? 'text-amber-800 font-semibold' : ''}>
                              {r.exitTime}
                            </span>
                            {r.isOvernightPunch && (
                              <span className="text-[8px] text-indigo-600 font-bold bg-indigo-50 px-0.5 rounded">
                                +1d
                              </span>
                            )}
                          </span>
                          {(r.earlyExitMinutes || 0) > 0 && (
                            <span
                              className="text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded font-semibold whitespace-nowrap"
                              title={`${t.earlyExitLabel}: -${r.earlyExitMinutes}m`}
                            >
                              -{r.earlyExitMinutes}m
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">--:--</span>
                      )}
                    </td>

                    {/* Delay */}
                    <td className="py-2 px-1.5 text-center whitespace-nowrap text-[11px]">
                      {r.delayMinutes > 0 ? (
                        <div>
                          <span
                            title={r.observationDetail}
                            className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]"
                          >
                            {r.delayMinutes} min
                          </span>
                          {(((r.firstCheckInDelayMinutes || 0) > 0 ? 1 : 0) +
                            ((r.secondCheckInDelayMinutes || 0) > 0 ? 1 : 0) +
                            ((r.earlyExitMinutes || 0) > 0 ? 1 : 0) > 1 ||
                            (r.earlyExitMinutes || 0) > 0) && (
                            <span className="block text-[9px] text-slate-400 whitespace-nowrap">
                              {[
                                (r.firstCheckInDelayMinutes || 0) > 0
                                  ? `${r.firstCheckInDelayMinutes}m`
                                  : null,
                                (r.secondCheckInDelayMinutes || 0) > 0
                                  ? `${r.secondCheckInDelayMinutes}m`
                                  : null,
                                (r.earlyExitMinutes || 0) > 0
                                  ? `-${r.earlyExitMinutes}m`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join('+')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">0 min</span>
                      )}
                    </td>

                    {/* Break */}
                    <td className="py-2 px-1.5 text-center text-slate-500 whitespace-nowrap text-[11px]">
                      {r.breakDurationMinutes > 0 ? (
                        `${Math.floor(r.breakDurationMinutes / 60)}h${r.breakDurationMinutes % 60 ? (r.breakDurationMinutes % 60) + 'm' : ''}`
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Worked Hours */}
                    <td className="py-2 px-1.5 text-center font-semibold text-slate-800 whitespace-nowrap text-[11px]">
                      {r.workedHoursFormatted}
                    </td>

                    {/* Supp (Overtime) Hours */}
                    <td className="py-2 px-1.5 text-center font-bold whitespace-nowrap text-[11px]">
                      {r.injectedSuppMinutes && r.injectedSuppMinutes > 0 ? (
                        <span
                          className="inline-flex items-center gap-0.5 rounded bg-amber-50 border border-amber-300 px-1 py-0.5 text-amber-900 shadow-2xs"
                          title={`Total Supp: ${r.suppHoursFormatted} (+${formatMinutesToHoursAndMinutes(r.injectedSuppMinutes)})`}
                        >
                          <Zap className="h-2.5 w-2.5 fill-amber-500 text-amber-600 shrink-0" />
                          <span>{r.suppHoursFormatted}</span>
                        </span>
                      ) : r.suppMinutes > 0 ? (
                        <span className="inline-flex items-center gap-0.5 rounded bg-indigo-50 px-1 py-0.5 text-indigo-700">
                          {r.suppHoursFormatted}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    {/* Observation */}
                    <td className="py-2 px-2 whitespace-nowrap">{renderObservationBadge(r)}</td>

                    {/* Manual Audit Action */}
                    {settings.activeRole !== 'Management' && (
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {onOpenVacationForEmployee && (
                            <button
                              id={`row-vacation-btn-${r.id}`}
                              onClick={() => onOpenVacationForEmployee(r.employeeId, r.date)}
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-1 font-semibold text-[11px] transition-colors ${
                                r.isPaidVacation
                                  ? 'bg-teal-100 text-teal-900 border border-teal-300 hover:bg-teal-200'
                                  : 'text-teal-700 hover:bg-teal-50 hover:text-teal-800'
                              }`}
                              title={`${t.paidVacations}: ${r.employeeName}`}
                            >
                              <Palmtree className="h-3 w-3 text-teal-600" />
                              <span className="hidden xl:inline">{r.isPaidVacation ? t.btnVacation : t.btnPlanVacation}</span>
                            </button>
                          )}
                          {onOpenInjectSupp && (
                            <button
                              id={`row-inject-supp-btn-${r.id}`}
                              onClick={() => onOpenInjectSupp(r)}
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-1 font-semibold text-[11px] transition-colors ${
                                r.injectedSuppMinutes && r.injectedSuppMinutes > 0
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                  : 'text-amber-700 hover:bg-amber-50 hover:text-amber-800'
                              }`}
                              title={`${t.injectSuppHours}: ${r.employeeName} (${r.formattedDate})`}
                            >
                              <Zap className="h-3 w-3 fill-amber-500 text-amber-600" />
                              <span className="hidden xl:inline">{r.injectedSuppMinutes && r.injectedSuppMinutes > 0 ? t.btnEditSupp : t.btnAddSupp}</span>
                            </button>
                          )}
                          <button
                            id={`correct-btn-${r.id}`}
                            onClick={() => onOpenCorrection(r)}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-1 font-semibold text-[11px] text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                            title={r.isShiftUnclear ? t.reviewShift : t.btnAdjust}
                          >
                            <Edit3 className="h-3 w-3" />
                            <span className="hidden xl:inline">{r.isShiftUnclear ? t.reviewShift : t.btnAdjust}</span>
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
            {t.showingWord} <span className="font-semibold">{paginatedRecords.length}</span> {t.ofWord}{' '}
            <span className="font-semibold">{filteredRecords.length}</span> {t.recordsWord}
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
              {t.pageWord} {page} {t.ofWord} {totalPages}
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
