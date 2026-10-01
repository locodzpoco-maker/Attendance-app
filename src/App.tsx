import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RawAttendanceDataset,
  DailyAttendanceRecord,
  MonthlySummaryRecord,
  WorkSchedule,
  Employee,
  AppSettings,
  ManualAdjustment,
  AttendanceAuditLog,
  HistoricalPeriodRecord,
  PaidVacation,
  AppLanguage,
} from './types';
import { DEFAULT_SCHEDULES, STOCK_SHIFT_SATURDAY, ADMIN_SHIFT_SATURDAY, NO_SHIFT_SCHEDULE } from './utils/schedules';
import { DEFAULT_EMPLOYEES, findUnmappedEmployees, DEFAULT_SATURDAY_WORKER_IDS, isSaturdayWorker } from './utils/employees';
import { calculateAttendance } from './utils/calculator';
import { generateReferenceDataset } from './utils/sampleData';
import { getTranslations, isRtlLanguage } from './utils/i18n';
import {
  exportDailyAttendanceToExcel,
  exportDailyAttendanceToPDF,
  exportMonthlySummaryToExcel,
  exportMonthlySummaryToPDF,
} from './utils/exporter';
import {
  cleanupLegacyStorage,
  getStorageItem,
  saveStorageItem,
  saveCompactHistoricalPeriods,
  exportBackupToFile,
  parseBackupFile,
  exportProgressToFile,
  parseProgressFile,
  idbGet,
  AppProgressSnapshot,
  SavedDailyFilters,
  SavedMonthlyFilters,
  SavedEmployeesFilters,
  STORAGE_KEYS,
} from './utils/storage';
import { CheckCircle2, Save, Upload } from 'lucide-react';

import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { DailyAttendanceView } from './components/DailyAttendanceView';
import { MonthlySummaryView } from './components/MonthlySummaryView';
import { EmployeesView } from './components/EmployeesView';
import { SchedulesView } from './components/SchedulesView';
import { SettingsView } from './components/SettingsView';
import { ImportModal } from './components/ImportModal';
import { ManualCorrectionModal } from './components/ManualCorrectionModal';
import { InjectSuppHoursModal, InjectSuppHoursParams } from './components/InjectSuppHoursModal';
import { DesktopDatabaseModal } from './components/DesktopDatabaseModal';
import { PaidVacationModal } from './components/PaidVacationModal';
import { isElectronApp, loadInitialAppData, persistPaidVacations } from './utils/storageAdapter';

export default function App() {
  // Desktop SQLite Modal State
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);

  // Navigation & Active Tab
  const [activeTab, setActiveTabState] = useState<
    'dashboard' | 'daily' | 'monthly' | 'employees' | 'schedules' | 'settings'
  >(() => {
    return getStorageItem<'dashboard' | 'daily' | 'monthly' | 'employees' | 'schedules' | 'settings'>(
      'ams_active_tab',
      'dashboard'
    );
  });

  const setActiveTab = (
    tab: 'dashboard' | 'daily' | 'monthly' | 'employees' | 'schedules' | 'settings'
  ) => {
    setActiveTabState(tab);
    saveStorageItem('ams_active_tab', tab);
  };

  // App Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaultSettings: AppSettings = {
      companyName: 'Attendance Management System',
      companySubtitle: 'Automated Biometric Fingerprint & Schedule Engine',
      defaultOvertimeGraceMinutes: 15,
      defaultArrivalGraceMinutes: 10,
      defaultBreakGraceMinutes: 10,
      allowRecalculationOnFly: true,
      activeRole: 'Administrator',
      language: 'fr',
    };
    const saved = getStorageItem<Partial<AppSettings> | null>('ams_settings', null);
    if (saved && typeof saved === 'object') {
      return {
        ...defaultSettings,
        ...saved,
      };
    }
    return defaultSettings;
  });

  const t = getTranslations(settings.language);

  // Schedules (Reads from consistent storage key with quota recovery & fallback)
  const [schedules, setSchedules] = useState<WorkSchedule[]>(() => {
    cleanupLegacyStorage();
    const saved =
      getStorageItem<WorkSchedule[] | null>('ams_schedules', null) ||
      getStorageItem<WorkSchedule[] | null>('ams_schedules_v3', null) ||
      getStorageItem<WorkSchedule[] | null>('ams_schedules_v2', null);
    if (Array.isArray(saved) && saved.length > 0) {
      const list = saved.map((s) => {
        if (s.id === 'admin_sat') {
          // If still using old legacy 08:30 default with 90m break, upgrade to new 09:00 default; otherwise preserve custom edits
          if (s.startTime === '08:30' && (s.breakDurationMinutes === 90 || s.breakDurationMinutes === undefined)) {
            return ADMIN_SHIFT_SATURDAY;
          }
          return s;
        }
        if (s.id === 'stock_sat') {
          return s;
        }
        if (s.id === 'admin_g2' || s.groupName === 'Admin Group 2' || s.name.includes('Admin Group 2')) {
          return s;
        }
        if (s.id === 'stock_g3') {
          return {
            ...s,
            name: s.name || 'Shift 3 (08:30 - 16:30)',
            endTime: s.endTime || '16:30',
            overtimeStartTime: s.overtimeStartTime || '16:30',
            normalWorkedHours: s.normalWorkedHours ?? 7.0,
          };
        }
        return s;
      });
      if (!list.some((s) => s.id === 'stock_sat')) {
        list.push(STOCK_SHIFT_SATURDAY);
      }
      if (!list.some((s) => s.id === 'admin_sat')) {
        list.push(ADMIN_SHIFT_SATURDAY);
      }
      if (!list.some((s) => s.id === 'no_shift')) {
        list.unshift(NO_SHIFT_SCHEDULE);
      }
      return list;
    }
    return DEFAULT_SCHEDULES;
  });

  // Employees Database
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved =
      getStorageItem<Employee[] | null>('ams_employees', null) ||
      getStorageItem<Employee[] | null>('ams_employees_v5', null) ||
      getStorageItem<Employee[] | null>('ams_employees_v4', null);
    if (Array.isArray(saved) && saved.length > 0) {
      return saved.map((e) => {
        if ((e.hasSaturdayShift === undefined || !e.hasSaturdayShift) && isSaturdayWorker(e.id)) {
          return { ...e, hasSaturdayShift: true };
        }
        return e;
      });
    }
    return DEFAULT_EMPLOYEES;
  });

  // Manual Adjustments (Key: "empId_date")
  const [manualAdjustments, setManualAdjustments] = useState<
    Record<string, ManualAdjustment>
  >(() => {
    return getStorageItem<Record<string, ManualAdjustment>>('ams_adjustments', {});
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AttendanceAuditLog[]>(() => {
    return getStorageItem<AttendanceAuditLog[]>('ams_audit_logs', []);
  });

  // Raw Active Dataset - starts completely empty with 0 punches
  const [activeDataset, setActiveDataset] = useState<RawAttendanceDataset | null>(() => {
    cleanupLegacyStorage();
    const saved = getStorageItem<RawAttendanceDataset | null>('ams_active_dataset', null);
    if (saved && Array.isArray(saved.employees) && saved.employees.length > 0) {
      if (
        saved.fileName === 'AttendanceRecord_0 (56).xls' ||
        saved.madeDateRaw?.includes('2026/07/01-2026/07/31')
      ) {
        return null;
      }
      return saved;
    }
    return null;
  });

  // Historical Periods - starts empty []
  const [historicalPeriods, setHistoricalPeriods] = useState<HistoricalPeriodRecord[]>(() => {
    const saved = getStorageItem<HistoricalPeriodRecord[] | null>('ams_historical_periods', null);
    if (Array.isArray(saved) && saved.length > 0) {
      const filtered = saved.filter(
        (p) =>
          p.fileName !== 'AttendanceRecord_0 (56).xls' &&
          p.id !== '2026-07' &&
          !p.periodLabel?.includes('01/07/2026')
      );
      return filtered;
    }
    return [];
  });

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() => {
    const saved = getStorageItem<string>('ams_selected_period_id', '');
    if (saved === '2026-07') return '';
    return saved;
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeCorrectionRecord, setActiveCorrectionRecord] =
    useState<DailyAttendanceRecord | null>(null);
  const [isInjectSuppModalOpen, setIsInjectSuppModalOpen] = useState(false);
  const [injectSuppTargetRecord, setInjectSuppTargetRecord] =
    useState<DailyAttendanceRecord | null>(null);

  // Paid Vacations State
  const [paidVacations, setPaidVacations] = useState<PaidVacation[]>(() => {
    return getStorageItem<PaidVacation[]>('ams_paid_vacations', []);
  });
  const [isVacationModalOpen, setIsVacationModalOpen] = useState(false);
  const [vacationModalPreSelectedEmp, setVacationModalPreSelectedEmp] = useState<Employee | null>(null);
  const [vacationModalPreSelectedDate, setVacationModalPreSelectedDate] = useState<string | undefined>(undefined);

  // Toast notification for user actions (save progress, restore, etc.)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Drilldown filter: specific employee selected from Monthly Summary to view in Daily Attendance
  const [selectedEmployeeIdForDaily, setSelectedEmployeeIdForDaily] = useState<string | null>(() => {
    return getStorageItem<string | null>(STORAGE_KEYS.SELECTED_EMP_FOR_DAILY, null);
  });

  const handleSelectEmployeeForDaily = (employeeId: string) => {
    setSelectedEmployeeIdForDaily(employeeId);
    saveStorageItem(STORAGE_KEYS.SELECTED_EMP_FOR_DAILY, employeeId);
    setActiveTab('daily');
  };

  const handleClearSelectedEmployeeForDaily = () => {
    setSelectedEmployeeIdForDaily(null);
    saveStorageItem(STORAGE_KEYS.SELECTED_EMP_FOR_DAILY, null);
  };

  const handleOpenInjectSupp = (record?: DailyAttendanceRecord) => {
    setInjectSuppTargetRecord(record || null);
    setIsInjectSuppModalOpen(true);
  };

  // Sync to Storage immediately upon state changes with quota safety
  useEffect(() => {
    saveStorageItem(STORAGE_KEYS.SELECTED_EMP_FOR_DAILY, selectedEmployeeIdForDaily);
  }, [selectedEmployeeIdForDaily]);

  useEffect(() => {
    saveStorageItem('ams_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    saveStorageItem('ams_settings', settings);
  }, [settings]);

  useEffect(() => {
    saveStorageItem('ams_schedules', schedules);
  }, [schedules]);

  useEffect(() => {
    saveStorageItem('ams_employees', employees);
  }, [employees]);

  useEffect(() => {
    saveStorageItem('ams_paid_vacations', paidVacations);
  }, [paidVacations]);

  useEffect(() => {
    saveStorageItem('ams_adjustments', manualAdjustments);
  }, [manualAdjustments]);

  useEffect(() => {
    saveStorageItem('ams_audit_logs', auditLogs);
  }, [auditLogs]);

  useEffect(() => {
    if (activeDataset) {
      saveStorageItem('ams_active_dataset', activeDataset);
    } else {
      try {
        localStorage.removeItem('ams_active_dataset');
      } catch {}
    }
  }, [activeDataset]);

  useEffect(() => {
    saveCompactHistoricalPeriods(historicalPeriods);
  }, [historicalPeriods]);

  useEffect(() => {
    saveStorageItem('ams_selected_period_id', selectedPeriodId);
  }, [selectedPeriodId]);

  // Load data from SQLite if running in Electron desktop shell
  const reloadFromDatabase = useCallback(async () => {
    if (!isElectronApp()) return;
    try {
      const data = await loadInitialAppData();
      if (data.employees && data.employees.length > 0) setEmployees(data.employees);
      if (data.schedules && data.schedules.length > 0) {
        const sanitized = data.schedules.map((s) => {
          if (s.id === 'admin_g2' || s.groupName === 'Admin Group 2' || (s.name && s.name.includes('Admin Group 2'))) {
            return s;
          }
          if (s.id === 'stock_g3') {
            return {
              ...s,
              name: 'Shift 3 (08:30 - 16:30)',
              endTime: '16:30',
              overtimeStartTime: '16:30',
              normalWorkedHours: 7.0,
            };
          }
          return {
            ...s,
            normalWorkedHours: 7.0,
          };
        });
        setSchedules(sanitized);
      }
      if (data.settings) setSettings(data.settings);
      if (data.manualAdjustments) setManualAdjustments(data.manualAdjustments);
      if (data.auditLogs && data.auditLogs.length > 0) setAuditLogs(data.auditLogs);
      if (data.historicalPeriods && data.historicalPeriods.length > 0) setHistoricalPeriods(data.historicalPeriods);
      if (data.activeDataset) setActiveDataset(data.activeDataset);
      if (data.paidVacations && Array.isArray(data.paidVacations)) {
        setPaidVacations(data.paidVacations);
        saveStorageItem('ams_paid_vacations', data.paidVacations);
      }
    } catch (e) {
      console.warn('Could not load data from SQLite:', e);
    }
  }, []);

  useEffect(() => {
    if (isElectronApp()) {
      reloadFromDatabase();
    }
  }, [reloadFromDatabase]);

  // Check IndexedDB on startup to restore large datasets if localStorage quota was reached
  useEffect(() => {
    idbGet<RawAttendanceDataset | null>(STORAGE_KEYS.ACTIVE_DATASET, null).then((storedDataset) => {
      if (storedDataset && Array.isArray(storedDataset.employees) && storedDataset.employees.length > 0) {
        setActiveDataset((curr) => (!curr || curr.employees.length === 0 ? storedDataset : curr));
      }
    });
    idbGet<HistoricalPeriodRecord[] | null>(STORAGE_KEYS.HISTORICAL_PERIODS, null).then((storedPeriods) => {
      if (storedPeriods && Array.isArray(storedPeriods) && storedPeriods.length > 0) {
        setHistoricalPeriods((curr) => (curr.length <= 1 ? storedPeriods : curr));
      }
    });
  }, []);

  // Sync document language and RTL layout direction
  useEffect(() => {
    const currentLang = settings.language || 'fr';
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLang;
      document.documentElement.dir = isRtlLanguage(currentLang) ? 'rtl' : 'ltr';
    }
  }, [settings.language]);

  // Main Calculation Execution
  const { dailyRecords, monthlySummary } = useMemo(() => {
    if (!activeDataset) {
      return { dailyRecords: [], monthlySummary: [] };
    }
    return calculateAttendance(activeDataset, {
      schedules,
      employees,
      manualAdjustments,
      paidVacations,
      settings,
    });
  }, [activeDataset, schedules, employees, manualAdjustments, paidVacations, settings]);

  const handleRecalculate = useCallback(() => {
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
    }, 400);
  }, []);

  // When a new file is imported or loaded
  const handleDatasetLoaded = (newDataset: RawAttendanceDataset) => {
    setActiveDataset(newDataset);
    const periodKey = `${newDataset.year}-${newDataset.month.toString().padStart(2, '0')}`;
    const periodLabel = `${newDataset.startDate} → ${newDataset.endDate}`;

    const calc = calculateAttendance(newDataset, {
      schedules,
      employees,
      manualAdjustments,
      paidVacations,
      settings,
    });

    const newPeriodRecord: HistoricalPeriodRecord = {
      id: periodKey,
      periodLabel,
      startDate: newDataset.startDate,
      endDate: newDataset.endDate,
      fileName: newDataset.fileName,
      importedAt: new Date().toISOString(),
      employeeCount: newDataset.employees.length,
      dataset: newDataset,
      dailyRecords: calc.dailyRecords,
      monthlySummary: calc.monthlySummary,
    };

    setHistoricalPeriods((prev) => {
      const filtered = prev.filter((p) => p.id !== periodKey);
      return [newPeriodRecord, ...filtered];
    });

    setSelectedPeriodId(periodKey);
    setActiveTab('dashboard');
  };

  const handleSelectPeriod = (periodId: string) => {
    setSelectedPeriodId(periodId);
    const found = historicalPeriods.find((p) => p.id === periodId);
    if (found) {
      setActiveDataset(found.dataset);
    }
  };

  const handleDeletePeriod = (periodId: string) => {
    setHistoricalPeriods((prev) => prev.filter((p) => p.id !== periodId));
    if (selectedPeriodId === periodId && historicalPeriods.length > 1) {
      const next = historicalPeriods.find((p) => p.id !== periodId);
      if (next) {
        setSelectedPeriodId(next.id);
        setActiveDataset(next.dataset);
      }
    }
  };

  // Manual Punch Correction Handler
  const handleSaveCorrection = (
    recordId: string,
    adjustedEntry: string | undefined,
    adjustedExit: string | undefined,
    reason: string,
    auditor: string,
    overrideShiftId?: string,
    adjustedSecondCheckIn?: string,
    injectedSuppMinutes?: number,
    exactPunchOnly?: boolean,
    deductBreak?: boolean,
    eligibleForOvertime?: boolean
  ) => {
    const target = dailyRecords.find((r) => r.id === recordId);
    if (!target) return;

    const existingAdj = manualAdjustments[recordId];

    const adjustment: ManualAdjustment = {
      date: target.date,
      employeeId: target.employeeId,
      adjustedEntry,
      adjustedSecondCheckIn,
      adjustedExit,
      overrideShiftId,
      injectedSuppMinutes: injectedSuppMinutes !== undefined ? injectedSuppMinutes : existingAdj?.injectedSuppMinutes,
      exactPunchOnly: exactPunchOnly !== undefined ? exactPunchOnly : existingAdj?.exactPunchOnly,
      deductBreak: deductBreak !== undefined ? deductBreak : existingAdj?.deductBreak,
      eligibleForOvertime: eligibleForOvertime !== undefined ? eligibleForOvertime : existingAdj?.eligibleForOvertime,
      reason,
      adjustedBy: auditor,
      adjustedAt: new Date().toISOString(),
    };

    setManualAdjustments((prev) => ({
      ...prev,
      [recordId]: adjustment,
    }));

    // Log to Audit Trail
    const suppDetail = injectedSuppMinutes !== undefined ? ` | Injected Supp: +${Math.floor(injectedSuppMinutes / 60)}h ${injectedSuppMinutes % 60}m` : '';
    const exactPunchDetail = exactPunchOnly ? ` | Exact Punch Mode: Enabled (${deductBreak ? 'Pause déduite' : 'Pause incluse'}, 0 late penalty)` : '';
    const otDetail = eligibleForOvertime !== undefined ? ` | OT Eligible: ${eligibleForOvertime ? 'Yes' : 'No'}` : '';
    const newLog: AttendanceAuditLog = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: auditor,
      employeeId: target.employeeId,
      employeeName: target.employeeName,
      date: target.date,
      action: 'MANUAL_PUNCH_ADJUSTMENT',
      details: `Entry: ${adjustedEntry || target.entryTime || 'none'} | 2nd In: ${adjustedSecondCheckIn || target.secondCheckInTime || 'none'} | Exit: ${adjustedExit || target.exitTime || 'none'} | Shift: ${overrideShiftId || 'Auto'}${suppDetail}${exactPunchDetail}${otDetail} | Reason: ${reason}`,
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Toggle Exact Punch Only for a specific day directly from the daily attendance table checkbox
  const handleToggleExactPunchOnly = useCallback((recordId: string, forcedDeductBreak?: boolean) => {
    const target = dailyRecords.find((r) => r.id === recordId);
    if (!target) return;

    const existingAdj = manualAdjustments[recordId];
    const currentlyExact = Boolean(existingAdj?.exactPunchOnly ?? target.exactPunchOnly ?? false);
    const nextExact = forcedDeductBreak !== undefined ? true : !currentlyExact;

    // Check if there are other manual adjustments on this record
    const hasOtherAdjustments = Boolean(
      existingAdj && (
        existingAdj.adjustedEntry ||
        existingAdj.adjustedExit ||
        existingAdj.adjustedSecondCheckIn ||
        existingAdj.overrideShiftId ||
        (existingAdj.injectedSuppMinutes !== undefined && existingAdj.injectedSuppMinutes > 0) ||
        (existingAdj.reason && !existingAdj.reason.includes('Exact punch mode') && !existingAdj.reason.includes('Pointage brut') && !existingAdj.reason.includes('Ignore late'))
      )
    );

    const deductBreakChoice = forcedDeductBreak !== undefined
      ? forcedDeductBreak
      : (existingAdj?.deductBreak !== undefined ? existingAdj.deductBreak : Boolean(settings.exactPunchDeductBreakDefault));

    setManualAdjustments((prev) => {
      if (!nextExact && !hasOtherAdjustments) {
        const copy = { ...prev };
        delete copy[recordId];
        return copy;
      }

      const updatedAdj: ManualAdjustment = {
        date: target.date,
        employeeId: target.employeeId,
        adjustedEntry: existingAdj?.adjustedEntry,
        adjustedSecondCheckIn: existingAdj?.adjustedSecondCheckIn,
        adjustedExit: existingAdj?.adjustedExit,
        overrideShiftId: existingAdj?.overrideShiftId,
        injectedSuppMinutes: existingAdj?.injectedSuppMinutes,
        exactPunchOnly: nextExact,
        deductBreak: deductBreakChoice,
        reason: existingAdj?.reason || (nextExact ? `Ignore late time enabled (${deductBreakChoice ? 'Pause déduite' : 'Pause incluse'})` : 'Standard schedule rules restored'),
        adjustedBy: settings.activeRole || 'HR Admin',
        adjustedAt: new Date().toISOString(),
      };

      return {
        ...prev,
        [recordId]: updatedAdj,
      };
    });

    // Add audit log entry
    const newLog: AttendanceAuditLog = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: settings.activeRole || 'HR Admin',
      employeeId: target.employeeId,
      employeeName: target.employeeName,
      date: target.date,
      action: 'MANUAL_PUNCH_ADJUSTMENT',
      details: nextExact
        ? `[Ignore Late Enabled] ${target.employeeName} (${target.date}): Ignored late time in all reports, pause ${deductBreakChoice ? 'déduite' : 'incluse'}, status set to On Time.`
        : `[Ignore Late Disabled] ${target.employeeName} (${target.date}): Reverted to standard schedule rules.`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  }, [dailyRecords, manualAdjustments, settings.activeRole, settings.exactPunchDeductBreakDefault]);

  // Toggle specifically whether pause time is deducted or included when exactPunchOnly is enabled
  const handleToggleExactPunchDeductBreak = useCallback((recordId: string) => {
    const target = dailyRecords.find((r) => r.id === recordId);
    if (!target) return;

    const existingAdj = manualAdjustments[recordId];
    const currentlyDeduct = existingAdj?.deductBreak !== undefined
      ? Boolean(existingAdj.deductBreak)
      : Boolean(target.deductBreak ?? settings.exactPunchDeductBreakDefault);
    const nextDeduct = !currentlyDeduct;

    setManualAdjustments((prev) => {
      const updatedAdj: ManualAdjustment = {
        date: target.date,
        employeeId: target.employeeId,
        adjustedEntry: existingAdj?.adjustedEntry,
        adjustedSecondCheckIn: existingAdj?.adjustedSecondCheckIn,
        adjustedExit: existingAdj?.adjustedExit,
        overrideShiftId: existingAdj?.overrideShiftId,
        injectedSuppMinutes: existingAdj?.injectedSuppMinutes,
        exactPunchOnly: true,
        deductBreak: nextDeduct,
        reason: existingAdj?.reason || `Ignore late: ${nextDeduct ? 'Pause déduite' : 'Pause incluse'}`,
        adjustedBy: settings.activeRole || 'HR Admin',
        adjustedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        [recordId]: updatedAdj,
      };
    });

    const newLog: AttendanceAuditLog = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: settings.activeRole || 'HR Admin',
      employeeId: target.employeeId,
      employeeName: target.employeeName,
      date: target.date,
      action: 'MANUAL_PUNCH_ADJUSTMENT',
      details: `[Pause Mode Changed] ${target.employeeName} (${target.date}): Pause is now ${nextDeduct ? 'DÉDUITE' : 'INCLUSE (non déduite)'}.`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  }, [dailyRecords, manualAdjustments, settings.activeRole, settings.exactPunchDeductBreakDefault]);

  // Bulk set pause mode (deductBreak: true = deduct pause, false = include pause) for checked exactPunch records
  const handleBulkSetExactPunchBreakMode = useCallback((recordIds: string[], deductBreak: boolean) => {
    setManualAdjustments((prev) => {
      const updated = { ...prev };
      recordIds.forEach((recordId) => {
        const target = dailyRecords.find((r) => r.id === recordId);
        if (!target) return;
        const existingAdj = updated[recordId];
        updated[recordId] = {
          date: target.date,
          employeeId: target.employeeId,
          adjustedEntry: existingAdj?.adjustedEntry,
          adjustedSecondCheckIn: existingAdj?.adjustedSecondCheckIn,
          adjustedExit: existingAdj?.adjustedExit,
          overrideShiftId: existingAdj?.overrideShiftId,
          injectedSuppMinutes: existingAdj?.injectedSuppMinutes,
          exactPunchOnly: true,
          deductBreak: deductBreak,
          reason: existingAdj?.reason || `Ignore late: ${deductBreak ? 'Pause déduite' : 'Pause incluse'}`,
          adjustedBy: settings.activeRole || 'HR Admin',
          adjustedAt: new Date().toISOString(),
        };
      });
      return updated;
    });

    const newLog: AttendanceAuditLog = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: settings.activeRole || 'HR Admin',
      employeeId: 'BULK',
      employeeName: `${recordIds.length} records`,
      date: new Date().toISOString().split('T')[0],
      action: 'MANUAL_PUNCH_ADJUSTMENT',
      details: `[Bulk Pause Mode] Updated ${recordIds.length} records to pause ${deductBreak ? 'DÉDUITE' : 'INCLUSE (non déduite)'}.`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  }, [dailyRecords, settings.activeRole]);

  // Inject Supplementary Hours Handler
  const handleInjectSuppHours = (params: InjectSuppHoursParams) => {
    const { employeeIds, dates, suppMinutesToAdd, mode, reason, auditor } = params;

    setManualAdjustments((prev) => {
      const updated = { ...prev };
      employeeIds.forEach((empId) => {
        dates.forEach((date) => {
          const recordKey = `${empId}_${date}`;
          const existing = updated[recordKey] || {};
          const target = dailyRecords.find((r) => r.id === recordKey);

          let finalInjected: number | undefined;
          if (mode === 'clear') {
            finalInjected = undefined;
          } else if (mode === 'set') {
            finalInjected = suppMinutesToAdd > 0 ? suppMinutesToAdd : undefined;
          } else {
            // 'add'
            const currentInjected = existing.injectedSuppMinutes ?? target?.injectedSuppMinutes ?? 0;
            const sum = currentInjected + suppMinutesToAdd;
            finalInjected = sum > 0 ? sum : undefined;
          }

          updated[recordKey] = {
            ...existing,
            date,
            employeeId: empId,
            injectedSuppMinutes: finalInjected,
            reason: reason || existing.reason || 'Manual supp hours injection',
            adjustedBy: auditor,
            adjustedAt: new Date().toISOString(),
          };
        });
      });
      return updated;
    });

    // Create Audit Logs
    const timestamp = new Date().toISOString();
    const newLogs: AttendanceAuditLog[] = [];
    employeeIds.forEach((empId, idx) => {
      const emp = dailyRecords.find((r) => r.employeeId === empId);
      const empName = emp ? emp.employeeName : empId;
      const hoursText = `${Math.floor(suppMinutesToAdd / 60)}h ${suppMinutesToAdd % 60}m`;
      const dateText = dates.length === 1 ? dates[0] : `${dates[0]} → ${dates[dates.length - 1]} (${dates.length} days)`;

      newLogs.push({
        id: `audit_supp_${Date.now()}_${idx}`,
        timestamp,
        user: auditor,
        employeeId: empId,
        employeeName: empName,
        date: dateText,
        action: 'INJECT_SUPP_HOURS',
        details: `Injected supplementary hours: ${mode === 'clear' ? 'Cleared' : `+${hoursText}`} per day | Mode: ${mode} | Reason: ${reason}`,
      });
    });

    setAuditLogs((prev) => [...newLogs, ...prev]);
  };

  // Unmapped employees detected in raw dataset compared to saved mapping
  const unmappedEmployees = useMemo(() => {
    return findUnmappedEmployees(activeDataset?.employees || [], employees);
  }, [activeDataset?.employees, employees]);
  const unmappedEmployeesCount = unmappedEmployees.length;

  // Employee modifications
  const handleAddEmployee = (newEmp: Employee) => {
    setEmployees((prev) => {
      const next = [...prev, newEmp];
      saveStorageItem('ams_employees', next);
      return next;
    });
  };

  const handleAddBatchEmployees = (newEmps: Employee[]) => {
    if (newEmps.length === 0) return;
    setEmployees((prev) => {
      const existingNormalized = new Set(prev.map((e) => e.id.trim().replace(/^0+/, '')));
      const uniqueNew = newEmps.filter((e) => !existingNormalized.has(e.id.trim().replace(/^0+/, '')));
      const updated = [...prev, ...uniqueNew];
      saveStorageItem('ams_employees', updated);
      return updated;
    });

    const newLog: AttendanceAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      user: settings.activeRole,
      employeeId: 'BATCH',
      employeeName: `${newEmps.length} Detected Workers`,
      date: new Date().toISOString().slice(0, 10),
      action: 'ADD_BATCH_EMPLOYEES',
      details: `Added ${newEmps.length} unmapped detected workers into Employee Mapping directory.`,
    };
    setAuditLogs((prev) => {
      const next = [newLog, ...prev];
      saveStorageItem('ams_audit_logs', next);
      return next;
    });
  };

  const handleImportEmployees = (
    importedList: Employee[],
    mode: 'merge' | 'addNewOnly' | 'replace'
  ) => {
    if (importedList.length === 0) return;
    setEmployees((prev) => {
      let next: Employee[] = [];
      if (mode === 'replace') {
        next = importedList;
      } else if (mode === 'addNewOnly') {
        const existingIds = new Set(prev.map((e) => e.id.trim()));
        const toAdd = importedList.filter((e) => !existingIds.has(e.id.trim()));
        next = [...prev, ...toAdd];
      } else {
        // 'merge': update existing, append new
        const map = new Map<string, Employee>();
        prev.forEach((e) => map.set(e.id.trim(), e));
        importedList.forEach((e) => map.set(e.id.trim(), e));
        next = Array.from(map.values());
      }
      saveStorageItem('ams_employees', next);
      return next;
    });

    const newLog: AttendanceAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      user: settings.activeRole,
      employeeId: 'IMPORT',
      employeeName: `${importedList.length} Imported Workers`,
      date: new Date().toISOString().slice(0, 10),
      action: 'IMPORT_EMPLOYEES',
      details: `Imported ${importedList.length} workers via Excel/CSV (mode: ${mode}).`,
    };
    setAuditLogs((prev) => {
      const next = [newLog, ...prev];
      saveStorageItem('ams_audit_logs', next);
      return next;
    });
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    const prevEmp = employees.find((e) => e.id === updatedEmp.id);
    setEmployees((prev) => {
      const next = prev.map((e) => (e.id === updatedEmp.id ? updatedEmp : e));
      saveStorageItem('ams_employees', next);
      return next;
    });

    if (prevEmp && (Boolean(prevEmp.isArchived) !== Boolean(updatedEmp.isArchived) || prevEmp.status !== updatedEmp.status)) {
      const isNowArchived = Boolean(updatedEmp.isArchived || updatedEmp.status === 'Archived');
      const newLog: AttendanceAuditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        user: settings.activeRole,
        employeeId: updatedEmp.id,
        employeeName: updatedEmp.name,
        date: new Date().toISOString().slice(0, 10),
        action: isNowArchived ? 'ARCHIVE_EMPLOYEE' : 'UNARCHIVE_EMPLOYEE',
        details: isNowArchived
          ? `Archived employee ${updatedEmp.name} (${updatedEmp.id}). Excluded from daily attendance & monthly summaries.`
          : `Re-activated archived employee ${updatedEmp.name} (${updatedEmp.id}).`,
      };
      setAuditLogs((prev) => {
        const next = [newLog, ...prev];
        saveStorageItem('ams_audit_logs', next);
        return next;
      });
    }
  };

  // Schedule modifications with immediate synchronous storage persistence
  const handleAddSchedule = (newSched: WorkSchedule) => {
    setSchedules((prev) => {
      const next = [...prev, newSched];
      saveStorageItem('ams_schedules', next);
      return next;
    });
  };

  const handleUpdateSchedule = (updatedSched: WorkSchedule) => {
    setSchedules((prev) => {
      const next = prev.map((s) => (s.id === updatedSched.id ? updatedSched : s));
      saveStorageItem('ams_schedules', next);
      return next;
    });
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveStorageItem('ams_schedules', next);
      return next;
    });
  };

  const handleResetSchedules = () => {
    setSchedules(DEFAULT_SCHEDULES);
    saveStorageItem('ams_schedules', DEFAULT_SCHEDULES);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveStorageItem('ams_settings', newSettings);
  };

  // Vacation handlers
  const handleOpenVacationModal = (empId?: string, date?: string) => {
    if (empId) {
      const found = employees.find((e) => e.id === empId || e.id.trim() === empId.trim());
      setVacationModalPreSelectedEmp(
        found || {
          id: empId,
          name: empId,
          companyDepartment: 'Stock & Logistique',
          groupName: 'Stock',
          scheduleId: 'stock_dynamic',
          status: 'Active',
        }
      );
    } else {
      setVacationModalPreSelectedEmp(null);
    }
    setVacationModalPreSelectedDate(date);
    setIsVacationModalOpen(true);
  };

  const handleSaveVacation = (vacation: PaidVacation) => {
    setPaidVacations((prev) => {
      const filtered = prev.filter((v) => v.id !== vacation.id);
      const updated = [...filtered, vacation];
      saveStorageItem('ams_paid_vacations', updated);
      if (isElectronApp()) {
        persistPaidVacations(updated);
      }
      return updated;
    });
  };

  const handleDeleteVacation = (vacationId: string) => {
    setPaidVacations((prev) => {
      const updated = prev.filter((v) => v.id !== vacationId);
      saveStorageItem('ams_paid_vacations', updated);
      if (isElectronApp()) {
        persistPaidVacations(updated);
      }
      return updated;
    });
  };

  // Export / Import entire application progress snapshot (dataset, periods, schedules, employees, manual adjustments with checkboxes, settings, filters, and active tab)
  const handleExportBackup = () => {
    const dailyFilters = getStorageItem<SavedDailyFilters | undefined>(STORAGE_KEYS.DAILY_FILTERS, undefined);
    const monthlyFilters = getStorageItem<SavedMonthlyFilters | undefined>(STORAGE_KEYS.MONTHLY_FILTERS, undefined);
    const employeesFilters = getStorageItem<SavedEmployeesFilters | undefined>(STORAGE_KEYS.EMPLOYEES_FILTERS, undefined);
    const schedulesFilter = getStorageItem<'all' | 'weekday' | 'saturday' | undefined>(STORAGE_KEYS.SCHEDULES_FILTER, undefined);

    const snapshot: AppProgressSnapshot = {
      type: 'AMS_PROGRESS_SNAPSHOT',
      version: '3.0',
      exportedAt: new Date().toISOString(),
      activeTab,
      selectedPeriodId,
      activeDataset,
      historicalPeriods,
      settings,
      schedules,
      employees,
      manualAdjustments,
      paidVacations,
      auditLogs,
      dailyFilters: {
        ...dailyFilters,
        selectedEmployeeId: selectedEmployeeIdForDaily,
      },
      monthlyFilters,
      employeesFilters,
      schedulesFilter,
      summary: {
        totalEmployees: employees.length,
        adjustmentsCount: Object.keys(manualAdjustments).length,
        exactPunchCount: Object.values(manualAdjustments).filter((a: ManualAdjustment) => Boolean(a.exactPunchOnly)).length,
        schedulesCount: schedules.length,
        vacationsCount: paidVacations.length,
      },
    };

    exportProgressToFile(snapshot);
    showToast(t.progressSavedSuccess || 'Work progress saved and exported successfully!');
  };

  const handleImportBackup = async (file: File) => {
    try {
      const backup = await parseProgressFile(file);
      if (backup.settings) {
        setSettings(backup.settings);
        saveStorageItem(STORAGE_KEYS.SETTINGS, backup.settings);
      }
      if (Array.isArray(backup.schedules) && backup.schedules.length > 0) {
        setSchedules(backup.schedules);
        saveStorageItem(STORAGE_KEYS.SCHEDULES, backup.schedules);
      }
      if (Array.isArray(backup.employees) && backup.employees.length > 0) {
        setEmployees(backup.employees);
        saveStorageItem(STORAGE_KEYS.EMPLOYEES, backup.employees);
      }
      if (backup.manualAdjustments) {
        setManualAdjustments(backup.manualAdjustments);
        saveStorageItem(STORAGE_KEYS.ADJUSTMENTS, backup.manualAdjustments);
      }
      if (Array.isArray(backup.paidVacations)) {
        setPaidVacations(backup.paidVacations);
        saveStorageItem(STORAGE_KEYS.PAID_VACATIONS, backup.paidVacations);
      }
      if (Array.isArray(backup.auditLogs) && backup.auditLogs.length > 0) {
        setAuditLogs(backup.auditLogs);
        saveStorageItem(STORAGE_KEYS.AUDIT_LOGS, backup.auditLogs);
      }
      if (backup.activeDataset && Array.isArray(backup.activeDataset.employees)) {
        setActiveDataset(backup.activeDataset);
        saveStorageItem(STORAGE_KEYS.ACTIVE_DATASET, backup.activeDataset);
      }
      if (Array.isArray(backup.historicalPeriods) && backup.historicalPeriods.length > 0) {
        setHistoricalPeriods(backup.historicalPeriods);
        saveCompactHistoricalPeriods(backup.historicalPeriods);
      }
      if (backup.selectedPeriodId) {
        setSelectedPeriodId(backup.selectedPeriodId);
        saveStorageItem(STORAGE_KEYS.SELECTED_PERIOD_ID, backup.selectedPeriodId);
      }
      if (backup.dailyFilters) {
        saveStorageItem(STORAGE_KEYS.DAILY_FILTERS, backup.dailyFilters);
        if (backup.dailyFilters.selectedEmployeeId !== undefined) {
          setSelectedEmployeeIdForDaily(backup.dailyFilters.selectedEmployeeId);
          saveStorageItem(STORAGE_KEYS.SELECTED_EMP_FOR_DAILY, backup.dailyFilters.selectedEmployeeId);
        }
      }
      if (backup.monthlyFilters) {
        saveStorageItem(STORAGE_KEYS.MONTHLY_FILTERS, backup.monthlyFilters);
      }
      if (backup.employeesFilters) {
        saveStorageItem(STORAGE_KEYS.EMPLOYEES_FILTERS, backup.employeesFilters);
      }
      if (backup.schedulesFilter) {
        saveStorageItem(STORAGE_KEYS.SCHEDULES_FILTER, backup.schedulesFilter);
      }
      if (backup.activeTab) {
        setActiveTab(backup.activeTab);
      }

      // Notify mounted views to refresh filters immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('ams_progress_restored'));
      }

      const exactCount = backup.manualAdjustments
        ? Object.values(backup.manualAdjustments).filter((a) => a.exactPunchOnly).length
        : 0;
      const adjustmentsCount = backup.manualAdjustments
        ? Object.keys(backup.manualAdjustments).length
        : 0;

      showToast(
        `${t.progressRestoredSuccess || 'Work progress restored!'} (${adjustmentsCount} adjustments, ${exactCount} checkboxes, ${backup.schedules?.length || 0} schedules)`
      );
    } catch (e: any) {
      alert(`Could not restore progress file: ${e.message || e}`);
    }
  };

  // Period label for reports
  const currentPeriodLabel = activeDataset
    ? `${activeDataset.startDate} - ${activeDataset.endDate}`
    : (settings.language === 'ar' ? 'لا توجد فترة محددة' : settings.language === 'en' ? 'No Period Loaded' : 'Aucune période chargée');

  // Export handlers
  const handleExportDailyExcel = (recordsToExport?: DailyAttendanceRecord[], customPeriodLabel?: string) => {
    exportDailyAttendanceToExcel(
      recordsToExport && recordsToExport.length > 0 ? recordsToExport : dailyRecords,
      customPeriodLabel || currentPeriodLabel,
      settings
    );
  };

  const handleExportDailyPDF = (recordsToExport?: DailyAttendanceRecord[], customPeriodLabel?: string) => {
    exportDailyAttendanceToPDF(
      recordsToExport && recordsToExport.length > 0 ? recordsToExport : dailyRecords,
      customPeriodLabel || currentPeriodLabel,
      settings
    );
  };

  const handleExportMonthlyExcel = (summariesToExport?: MonthlySummaryRecord[], customPeriodLabel?: string) => {
    exportMonthlySummaryToExcel(
      summariesToExport && summariesToExport.length > 0 ? summariesToExport : monthlySummary,
      customPeriodLabel || currentPeriodLabel,
      settings
    );
  };

  const handleExportMonthlyPDF = (summariesToExport?: MonthlySummaryRecord[], customPeriodLabel?: string) => {
    exportMonthlySummaryToPDF(
      summariesToExport && summariesToExport.length > 0 ? summariesToExport : monthlySummary,
      customPeriodLabel || currentPeriodLabel,
      settings
    );
  };

  return (
    <div id="attendance-app-root" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenImport={() => setIsImportModalOpen(true)}
        onCalculate={handleRecalculate}
        isCalculating={isCalculating}
        hasData={dailyRecords.length > 0}
        currentPeriodLabel={currentPeriodLabel}
        historicalPeriods={historicalPeriods}
        onSelectPeriod={handleSelectPeriod}
        selectedPeriodId={selectedPeriodId}
        settings={settings}
        onUpdateRole={(role) => setSettings((s) => ({ ...s, activeRole: role }))}
        onUpdateLanguage={(newLang) => handleUpdateSettings({ ...settings, language: newLang })}
        unmappedEmployeesCount={unmappedEmployeesCount}
        onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
        onOpenVacationModal={() => handleOpenVacationModal()}
        vacationCount={paidVacations.length}
        onSaveProgress={handleExportBackup}
        onImportProgress={handleImportBackup}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 pt-4">
        <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
          <Dashboard
            dataset={activeDataset}
            dailyRecords={dailyRecords}
            monthlySummary={monthlySummary}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenImport={() => setIsImportModalOpen(true)}
            onCalculate={handleRecalculate}
            onExportDailyExcel={handleExportDailyExcel}
            onExportDailyPDF={handleExportDailyPDF}
            onExportMonthlyExcel={handleExportMonthlyExcel}
            onExportMonthlyPDF={handleExportMonthlyPDF}
            settings={settings}
            unmappedEmployeesCount={unmappedEmployeesCount}
          />
        </div>

        <div className={activeTab === 'daily' ? 'block' : 'hidden'}>
          <DailyAttendanceView
            records={dailyRecords}
            onOpenCorrection={(record) => setActiveCorrectionRecord(record)}
            onOpenInjectSupp={handleOpenInjectSupp}
            onOpenVacationForEmployee={handleOpenVacationModal}
            onToggleExactPunchOnly={handleToggleExactPunchOnly}
            onToggleExactPunchDeductBreak={handleToggleExactPunchDeductBreak}
            onBulkSetExactPunchBreakMode={handleBulkSetExactPunchBreakMode}
            onUpdateSettings={handleUpdateSettings}
            onExportExcel={handleExportDailyExcel}
            onExportPDF={handleExportDailyPDF}
            settings={settings}
            selectedEmployeeId={selectedEmployeeIdForDaily}
            onClearSelectedEmployee={handleClearSelectedEmployeeForDaily}
          />
        </div>

        <div className={activeTab === 'monthly' ? 'block' : 'hidden'}>
          <MonthlySummaryView
            summaries={monthlySummary}
            dailyRecords={dailyRecords}
            onExportExcel={handleExportMonthlyExcel}
            onExportPDF={handleExportMonthlyPDF}
            settings={settings}
            periodLabel={currentPeriodLabel}
            onSelectEmployeeForDaily={handleSelectEmployeeForDaily}
          />
        </div>

        <div className={activeTab === 'employees' ? 'block' : 'hidden'}>
          <EmployeesView
            employees={employees}
            schedules={schedules}
            onAddEmployee={handleAddEmployee}
            onAddBatchEmployees={handleAddBatchEmployees}
            onImportEmployees={handleImportEmployees}
            onUpdateEmployee={handleUpdateEmployee}
            onResetDefaults={() => setEmployees(DEFAULT_EMPLOYEES)}
            onOpenVacationForEmployee={(empId) => handleOpenVacationModal(empId)}
            settings={settings}
            rawEmployeesFromDataset={activeDataset?.employees || []}
          />
        </div>

        <div className={activeTab === 'schedules' ? 'block' : 'hidden'}>
          <SchedulesView
            schedules={schedules}
            onUpdateSchedule={handleUpdateSchedule}
            onAddSchedule={handleAddSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onResetSchedules={handleResetSchedules}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            canEdit={settings.activeRole !== 'Management'}
            settings={settings}
          />
        </div>

        <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            historicalPeriods={historicalPeriods}
            onSelectPeriod={handleSelectPeriod}
            onDeletePeriod={handleDeletePeriod}
            auditLogs={auditLogs}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
            onResetAllData={() => {
              try {
                localStorage.clear();
              } catch (e) {
                console.warn(e);
              }
              const defaultSet: AppSettings = {
                companyName: 'Attendance Management System',
                companySubtitle: 'Automated Biometric Fingerprint & Schedule Engine',
                defaultOvertimeGraceMinutes: 15,
                defaultArrivalGraceMinutes: 10,
                defaultBreakGraceMinutes: 10,
                allowRecalculationOnFly: true,
                activeRole: 'Administrator',
              };
              setSettings(defaultSet);
              saveStorageItem('ams_settings', defaultSet);
              setSchedules(DEFAULT_SCHEDULES);
              saveStorageItem('ams_schedules', DEFAULT_SCHEDULES);
              setEmployees(DEFAULT_EMPLOYEES);
              saveStorageItem('ams_employees', DEFAULT_EMPLOYEES);
              setManualAdjustments({});
              saveStorageItem('ams_adjustments', {});
              setAuditLogs([]);
              saveStorageItem('ams_audit_logs', []);
              setPaidVacations([]);
              saveStorageItem('ams_paid_vacations', []);
            }}
          />
        </div>
      </main>

      {/* Desktop SQLite Database & Backups Management Modal */}
      <DesktopDatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        onDataReloadNeeded={reloadFromDatabase}
        language={settings.language}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onDatasetLoaded={handleDatasetLoaded}
        existingEmployees={employees}
        onAddBatchEmployees={handleAddBatchEmployees}
        language={settings.language}
      />

      {/* Manual Punch Correction Modal */}
      {activeCorrectionRecord && (
        <ManualCorrectionModal
          record={activeCorrectionRecord}
          onClose={() => setActiveCorrectionRecord(null)}
          onSave={handleSaveCorrection}
          currentUser={settings.activeRole}
          language={settings.language}
          schedules={schedules}
        />
      )}

      {/* Inject Supplementary Hours Modal */}
      <InjectSuppHoursModal
        isOpen={isInjectSuppModalOpen}
        initialRecord={injectSuppTargetRecord}
        allDailyRecords={dailyRecords}
        onClose={() => {
          setIsInjectSuppModalOpen(false);
          setInjectSuppTargetRecord(null);
        }}
        onInjectSupp={handleInjectSuppHours}
        currentUser={settings.activeRole}
      />

      {/* Paid Vacation Management Modal */}
      <PaidVacationModal
        isOpen={isVacationModalOpen}
        onClose={() => {
          setIsVacationModalOpen(false);
          setVacationModalPreSelectedEmp(null);
          setVacationModalPreSelectedDate(undefined);
        }}
        employees={employees}
        schedules={schedules}
        paidVacations={paidVacations}
        onSaveVacation={handleSaveVacation}
        onDeleteVacation={handleDeleteVacation}
        preSelectedEmployee={vacationModalPreSelectedEmp}
        preSelectedDate={vacationModalPreSelectedDate}
        currentUserRole={settings.activeRole}
      />

      {/* Global Toast Notification for Save & Restore Progress */}
      {toastMessage && (
        <div
          id="app-global-toast"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-xl border border-slate-700 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
