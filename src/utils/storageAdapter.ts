import {
  Employee,
  WorkSchedule,
  DailyAttendanceRecord,
  MonthlySummaryRecord,
  HistoricalPeriodRecord,
  AttendanceAuditLog,
  ManualAdjustment,
  AppSettings,
  RawAttendanceDataset,
  DatabaseStats,
  BackupItem,
} from '../types';

/**
 * Checks if the application is running in an Electron desktop environment
 */
export function isElectronApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI && window.electronAPI.isElectron);
}

/**
 * Checks if legacy localStorage contains saved attendance data
 */
export function detectLocalStorageData(): Record<string, any> | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  try {
    const keys = [
      'ams_employees',
      'ams_schedules',
      'ams_settings',
      'ams_daily_records',
      'ams_monthly_summary',
      'ams_historical_periods',
      'ams_audit_logs',
      'ams_adjustments',
      'ams_dataset',
    ];

    const foundData: Record<string, any> = {};
    let hasAnyData = false;

    keys.forEach((key) => {
      const val = localStorage.getItem(key);
      if (val) {
        try {
          foundData[key] = JSON.parse(val);
          hasAnyData = true;
        } catch (e) {}
      }
    });

    return hasAnyData ? foundData : null;
  } catch (e) {
    return null;
  }
}

/**
 * Migrates data from browser localStorage to SQLite database
 */
export async function migrateLocalStorageToSQLite(): Promise<{
  success: boolean;
  summary?: { employeesImported: number; schedulesImported: number; periodsImported: number };
  error?: string;
}> {
  if (!isElectronApp() || !window.electronAPI) {
    return { success: false, error: 'Cannot migrate: Electron SQLite database is not active' };
  }

  const dump = detectLocalStorageData();
  if (!dump) {
    return { success: false, error: 'No localStorage attendance data found to migrate' };
  }

  try {
    const result = await window.electronAPI.migrateFromLocalStorage(dump);
    return result;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Migration failed' };
  }
}

/**
 * Gets database statistics and path locations
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  if (isElectronApp() && window.electronAPI) {
    return await window.electronAPI.getDbStats();
  }

  // Browser preview fallback stats
  return {
    isElectron: false,
    dataDir: 'Browser Local Storage / Web Preview',
    dbPath: 'In-Memory / localStorage',
    backupsDir: 'C:\\ProgramData\\Attendance App\\Backups\\ (Available in Desktop App)',
    dbSizeBytes: 0,
    employeesCount: 0,
    schedulesCount: 0,
    dailyRecordsCount: 0,
    historicalCount: 0,
    backupsCount: 0,
    maxBackups: 10,
  };
}

/**
 * Loads all initial application state from SQLite (or localStorage fallback)
 */
export async function loadInitialAppData(): Promise<{
  employees: Employee[] | null;
  schedules: WorkSchedule[] | null;
  settings: AppSettings | null;
  dailyRecords: DailyAttendanceRecord[] | null;
  monthlySummary: MonthlySummaryRecord[] | null;
  historicalPeriods: HistoricalPeriodRecord[] | null;
  auditLogs: AttendanceAuditLog[] | null;
  manualAdjustments: Record<string, ManualAdjustment> | null;
  activeDataset: RawAttendanceDataset | null;
}> {
  if (isElectronApp() && window.electronAPI) {
    try {
      const [
        employees,
        schedules,
        settings,
        dailyRecords,
        historicalPeriods,
        auditLogs,
        manualAdjustments,
        activeDataset,
      ] = await Promise.all([
        window.electronAPI.getEmployees(),
        window.electronAPI.getSchedules(),
        window.electronAPI.getSettings(),
        window.electronAPI.getDailyRecords(),
        window.electronAPI.getHistoricalPeriods(),
        window.electronAPI.getAuditLogs(),
        window.electronAPI.getManualAdjustments(),
        window.electronAPI.getActiveDataset(),
      ]);

      const monthlySummary = await window.electronAPI.getMonthlySummaries('CURRENT');

      return {
        employees: employees && employees.length > 0 ? employees : null,
        schedules: schedules && schedules.length > 0 ? schedules : null,
        settings,
        dailyRecords: dailyRecords && dailyRecords.length > 0 ? dailyRecords : null,
        monthlySummary: monthlySummary && monthlySummary.length > 0 ? monthlySummary : null,
        historicalPeriods: historicalPeriods && historicalPeriods.length > 0 ? historicalPeriods : null,
        auditLogs: auditLogs && auditLogs.length > 0 ? auditLogs : null,
        manualAdjustments,
        activeDataset,
      };
    } catch (e) {
      console.error('Error loading data from SQLite:', e);
    }
  }

  // LocalStorage fallback for browser preview
  const getLocal = (key: string) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  };

  return {
    employees: getLocal('ams_employees'),
    schedules: getLocal('ams_schedules'),
    settings: getLocal('ams_settings'),
    dailyRecords: getLocal('ams_daily_records'),
    monthlySummary: getLocal('ams_monthly_summary'),
    historicalPeriods: getLocal('ams_historical_periods'),
    auditLogs: getLocal('ams_audit_logs'),
    manualAdjustments: getLocal('ams_adjustments'),
    activeDataset: getLocal('ams_dataset'),
  };
}

/* ================= Persistence Functions ================= */

export async function persistEmployees(employees: Employee[]): Promise<void> {
  if (isElectronApp() && window.electronAPI) {
    await window.electronAPI.saveEmployeesBatch(employees);
  }
  try {
    localStorage.setItem('ams_employees', JSON.stringify(employees));
  } catch (e) {}
}

export async function persistEmployee(employee: Employee): Promise<void> {
  if (isElectronApp() && window.electronAPI) {
    await window.electronAPI.saveEmployee(employee);
  }
}

export async function deleteEmployeeFromStorage(id: string): Promise<void> {
  if (isElectronApp() && window.electronAPI) {
    await window.electronAPI.deleteEmployee(id);
  }
}

export async function persistSchedules(schedules: WorkSchedule[]): Promise<void> {
  if (isElectronApp() && window.electronAPI) {
    await window.electronAPI.saveSchedulesBatch(schedules);
  }
  try {
    localStorage.setItem('ams_schedules', JSON.stringify(schedules));
  } catch (e) {}
}

export async function persistSchedule(schedule: WorkSchedule): Promise<void> {
  if (isElectronApp() && window.electronAPI) {
    await window.electronAPI.saveSchedule(schedule);
  }
}

export async function deleteScheduleFromStorage(id: string): Promise<void> {
  if (isElectronApp() && window.electronAPI) {
    await window.electronAPI.deleteSchedule(id);
  }
}

export async function persistDailyRecords(records: DailyAttendanceRecord[]): Promise<void> {
  if (isElectronApp() && window.electronAPI) {
    await window.electronAPI.saveDailyRecords(records);
  }
  try {
    localStorage.setItem('ams_daily_records', JSON.stringify(records));
  } catch (e) {}
}

export async function persistMonthlySummaries(periodId: string, summaries: MonthlySummaryRecord[]): Promise<void> {
  if (isElectronApp() && window.electronAPI) {
    await window.electronAPI.saveMonthlySummaries(periodId, summaries);
  }
  try {
    localStorage.setItem('ams_monthly_summary', JSON.stringify(summaries));
  } catch (e) {}
}

export async function persistHistoricalPeriod(period: HistoricalPeriodRecord): Promise<void> {
  if (isElectronApp() && window.electronAPI) {
    await window.electronAPI.saveHistoricalPeriod(period);
  }
}

export async function persistHistoricalPeriods(periods: HistoricalPeriodRecord[]): Promise<void> {
  try {
    localStorage.setItem('ams_historical_periods', JSON.stringify(periods));
  } catch (e) {}
}

export async function deleteHistoricalPeriodFromStorage(id: string): Promise<void> {
  if (isElectronApp() && window.electronAPI) {
    await window.electronAPI.deleteHistoricalPeriod(id);
  }
}

export async function persistAuditLogs(logs: AttendanceAuditLog[]): Promise<void> {
  if (isElectronApp() && window.electronAPI) {
    await window.electronAPI.saveAuditLogs(logs);
  }
  try {
    localStorage.setItem('ams_audit_logs', JSON.stringify(logs));
  } catch (e) {}
}

export async function persistManualAdjustment(adjustment: ManualAdjustment): Promise<void> {
  if (isElectronApp() && window.electronAPI) {
    await window.electronAPI.saveManualAdjustment(adjustment);
  }
}

export async function persistSettings(settings: AppSettings): Promise<void> {
  if (isElectronApp() && window.electronAPI) {
    await window.electronAPI.saveSettings(settings);
  }
  try {
    localStorage.setItem('ams_settings', JSON.stringify(settings));
  } catch (e) {}
}

export async function persistActiveDataset(dataset: RawAttendanceDataset | null): Promise<void> {
  if (isElectronApp() && window.electronAPI && dataset) {
    await window.electronAPI.saveActiveDataset(dataset);
  }
  try {
    if (dataset) {
      localStorage.setItem('ams_dataset', JSON.stringify(dataset));
    } else {
      localStorage.removeItem('ams_dataset');
    }
  } catch (e) {}
}

/* ================= Backup & System Controls ================= */

export async function createDatabaseBackup(customName?: string): Promise<{ success: boolean; fileName?: string; error?: string }> {
  if (isElectronApp() && window.electronAPI) {
    return await window.electronAPI.createBackup(customName);
  }

  // Web preview fallback simulation: saves JSON backup snapshot to download
  try {
    const dump = detectLocalStorageData() || {};
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const filename = `Attendance_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true, fileName: filename };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function listDatabaseBackups(): Promise<BackupItem[]> {
  if (isElectronApp() && window.electronAPI) {
    return await window.electronAPI.listBackups();
  }
  return [];
}

export async function restoreDatabaseBackup(fileName: string): Promise<{ success: boolean; message?: string; error?: string }> {
  if (isElectronApp() && window.electronAPI) {
    return await window.electronAPI.restoreBackup(fileName);
  }
  return { success: false, error: 'Restore is available in the desktop application' };
}

export async function exportDatabaseFile(): Promise<{ success: boolean; targetPath?: string; error?: string; canceled?: boolean }> {
  if (isElectronApp() && window.electronAPI) {
    return await window.electronAPI.exportDatabase();
  }
  return { success: false, error: 'Database export is available in the desktop application' };
}

export async function importDatabaseFile(): Promise<{ success: boolean; error?: string; canceled?: boolean }> {
  if (isElectronApp() && window.electronAPI) {
    return await window.electronAPI.importDatabase();
  }
  return { success: false, error: 'Database import is available in the desktop application' };
}

export async function openAppDataFolder(): Promise<boolean> {
  if (isElectronApp() && window.electronAPI) {
    return await window.electronAPI.openDataFolder();
  }
  return false;
}
