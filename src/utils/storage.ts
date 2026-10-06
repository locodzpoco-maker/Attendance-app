import { AppSettings, WorkSchedule, Employee, ManualAdjustment, AttendanceAuditLog, RawAttendanceDataset, HistoricalPeriodRecord, PaidVacation, TimeAuthorization } from '../types';

export const STORAGE_KEYS = {
  SETTINGS: 'ams_settings',
  SCHEDULES: 'ams_schedules',
  EMPLOYEES: 'ams_employees',
  ADJUSTMENTS: 'ams_adjustments',
  AUDIT_LOGS: 'ams_audit_logs',
  ACTIVE_TAB: 'ams_active_tab',
  ACTIVE_DATASET: 'ams_active_dataset',
  HISTORICAL_PERIODS: 'ams_historical_periods',
  SELECTED_PERIOD_ID: 'ams_selected_period_id',
  SELECTED_EMP_FOR_DAILY: 'ams_selected_emp_for_daily',
  PAID_VACATIONS: 'ams_paid_vacations',
  TIME_AUTHORIZATIONS: 'ams_time_authorizations',
  DAILY_FILTERS: 'ams_daily_filters',
  MONTHLY_FILTERS: 'ams_monthly_filters',
  EMPLOYEES_FILTERS: 'ams_employees_filters',
  SCHEDULES_FILTER: 'ams_schedules_filter',
};

export interface SavedDailyFilters {
  searchTerm?: string;
  selectedGroup?: 'ADMIN' | 'STOCK';
  selectedStatus?: string;
  excludeArchived?: boolean;
  excludeZeroPunches?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  selectedEmployeeId?: string | null;
}

export interface SavedMonthlyFilters {
  searchTerm?: string;
  selectedGroup?: string;
  excludeArchived?: boolean;
  punchFilter?: 'ALL' | 'ACTIVE_ONLY' | 'ZERO_PUNCHES_ONLY';
  startDate?: string;
  endDate?: string;
}

export interface SavedEmployeesFilters {
  searchTerm?: string;
  categoryFilter?: 'ALL' | 'STOCK' | 'ADMIN' | 'SATURDAY' | 'ARCHIVED';
  showArchived?: boolean;
}

// Full application snapshot for pausing and resuming work
export interface AppProgressSnapshot {
  type: 'AMS_PROGRESS_SNAPSHOT';
  version: string;
  exportedAt: string;
  activeTab?: 'dashboard' | 'daily' | 'monthly' | 'employees' | 'schedules' | 'settings';
  selectedPeriodId?: string;
  activeDataset?: RawAttendanceDataset | null;
  historicalPeriods?: HistoricalPeriodRecord[];
  settings: AppSettings;
  schedules: WorkSchedule[];
  employees: Employee[];
  manualAdjustments: Record<string, ManualAdjustment>;
  paidVacations?: PaidVacation[];
  timeAuthorizations?: TimeAuthorization[];
  auditLogs?: AttendanceAuditLog[];
  dailyFilters?: SavedDailyFilters;
  monthlyFilters?: SavedMonthlyFilters;
  employeesFilters?: SavedEmployeesFilters;
  schedulesFilter?: 'all' | 'weekday' | 'saturday';
  summary?: {
    totalEmployees?: number;
    exactPunchCount?: number;
    adjustmentsCount?: number;
    schedulesCount?: number;
    vacationsCount?: number;
  };
}

// Legacy format compatibility
export interface AppBackupPayload {
  version: string;
  exportedAt: string;
  settings: AppSettings;
  schedules: WorkSchedule[];
  employees: Employee[];
  manualAdjustments: Record<string, ManualAdjustment>;
  paidVacations?: PaidVacation[];
  timeAuthorizations?: TimeAuthorization[];
  activeDataset?: RawAttendanceDataset | null;
  historicalPeriods?: HistoricalPeriodRecord[];
}

// IndexedDB Helper for unlimited quota storage of heavy datasets
const IDB_NAME = 'AMS_ATTENDANCE_DB';
const IDB_STORE = 'ams_store';
const IDB_VERSION = 1;

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbSet<T>(key: string, value: T): Promise<boolean> {
  try {
    const db = await openIdb();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function idbGet<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await openIdb();
    if (!db) return defaultValue;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result !== undefined && req.result !== null) {
          resolve(req.result as T);
        } else {
          resolve(defaultValue);
        }
      };
      req.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

// Clean up duplicate legacy keys on module load to free quota space
export function cleanupLegacyStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const legacyKeys = [
      'ams_schedules_v3',
      'ams_schedules_v2',
      'ams_employees_v5',
      'ams_employees_v4',
      'ams_employees_v3',
    ];
    legacyKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    });

    // Purge previous sample reference punches and demo dataset from storage
    const savedDataset = localStorage.getItem('ams_active_dataset');
    if (
      savedDataset &&
      (savedDataset.includes('AttendanceRecord_0 (56).xls') ||
        savedDataset.includes('2026/07/01-2026/07/31'))
    ) {
      localStorage.removeItem('ams_active_dataset');
      localStorage.removeItem('ams_historical_periods');
      localStorage.removeItem('ams_selected_period_id');
    }
  } catch (e) {
    console.warn('Could not cleanup legacy storage', e);
  }
}

// Safely get item from localStorage
export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return defaultValue;
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    const parsed = JSON.parse(item);
    return parsed !== null && parsed !== undefined ? (parsed as T) : defaultValue;
  } catch (e) {
    console.warn(`Error reading localStorage key "${key}":`, e);
    return defaultValue;
  }
}

// Safely save item with QuotaExceeded recovery, IndexedDB backing, and Electron SQLite synchronization
export function saveStorageItem<T>(key: string, value: T): boolean {
  // Sync heavy data with IndexedDB asynchronously so it is NEVER lost even if localStorage is full
  if (key === STORAGE_KEYS.ACTIVE_DATASET || key === STORAGE_KEYS.HISTORICAL_PERIODS) {
    idbSet(key, value).catch(() => {});
  }

  // Sync with Electron SQLite database if running in desktop shell
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.isElectron) {
    try {
      if (key === 'ams_employees' && Array.isArray(value)) {
        window.electronAPI.saveEmployeesBatch(value as any).catch(console.error);
      } else if (key === 'ams_schedules' && Array.isArray(value)) {
        window.electronAPI.saveSchedulesBatch(value as any).catch(console.error);
      } else if (key === 'ams_settings' && typeof value === 'object') {
        window.electronAPI.saveSettings(value as any).catch(console.error);
      } else if (key === 'ams_daily_records' && Array.isArray(value)) {
        window.electronAPI.saveDailyRecords(value as any).catch(console.error);
      } else if (key === 'ams_monthly_summary' && Array.isArray(value)) {
        window.electronAPI.saveMonthlySummaries('CURRENT', value as any).catch(console.error);
      } else if (key === 'ams_audit_logs' && Array.isArray(value)) {
        window.electronAPI.saveAuditLogs(value as any).catch(console.error);
      } else if (key === 'ams_dataset' && typeof value === 'object') {
        window.electronAPI.saveActiveDataset(value as any).catch(console.error);
      } else if (key === 'ams_paid_vacations' && Array.isArray(value)) {
        if (window.electronAPI.savePaidVacationsBatch) {
          window.electronAPI.savePaidVacationsBatch(value as any).catch(console.error);
        }
      }
    } catch (e) {
      console.warn('Error syncing to Electron SQLite:', e);
    }
  }

  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (e: any) {
    console.warn(`Quota or storage error writing key "${key}". Attempting cleanup...`, e);

    // Save heavy dataset to IndexedDB first
    if (key === STORAGE_KEYS.ACTIVE_DATASET || key === STORAGE_KEYS.HISTORICAL_PERIODS) {
      idbSet(key, value);
    }

    try {
      cleanupLegacyStorage();
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (retryError) {
      // If still exceeding quota, make sure key is preserved in IndexedDB
      idbSet(key, value);
      console.warn(`Saved key "${key}" to IndexedDB due to localStorage quota limit.`);
      return true;
    }
  }
}

// Compact historical periods (omit heavy calculated dailyRecords to save megabytes)
export function saveCompactHistoricalPeriods(periods: HistoricalPeriodRecord[]) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const compact = periods.map((p) => ({
      id: p.id,
      periodLabel: p.periodLabel,
      startDate: p.startDate,
      endDate: p.endDate,
      fileName: p.fileName,
      importedAt: p.importedAt,
      employeeCount: p.employeeCount,
      dataset: p.dataset,
    }));
    saveStorageItem(STORAGE_KEYS.HISTORICAL_PERIODS, compact);
  } catch (e) {
    console.warn('Failed to save compact historical periods', e);
  }
}

/**
 * Export full work progress snapshot to JSON file (handles everything: dataset, adjustments, checked boxes, schedules, filters, tabs)
 */
export function exportProgressToFile(snapshot: AppProgressSnapshot) {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(snapshot, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  downloadAnchor.setAttribute('download', `Attendance_Work_Progress_${dateStr}_${timeStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Legacy export backup compatibility wrapper
 */
export function exportBackupToFile(
  settings: AppSettings,
  schedules: WorkSchedule[],
  employees: Employee[],
  manualAdjustments: Record<string, ManualAdjustment>,
  paidVacations?: PaidVacation[],
  activeDataset?: RawAttendanceDataset | null,
  historicalPeriods?: HistoricalPeriodRecord[]
) {
  const dailyFilters = getStorageItem<SavedDailyFilters | undefined>(STORAGE_KEYS.DAILY_FILTERS, undefined);
  const monthlyFilters = getStorageItem<SavedMonthlyFilters | undefined>(STORAGE_KEYS.MONTHLY_FILTERS, undefined);
  const employeesFilters = getStorageItem<SavedEmployeesFilters | undefined>(STORAGE_KEYS.EMPLOYEES_FILTERS, undefined);
  const schedulesFilter = getStorageItem<'all' | 'weekday' | 'saturday' | undefined>(STORAGE_KEYS.SCHEDULES_FILTER, undefined);
  const activeTab = getStorageItem<any>(STORAGE_KEYS.ACTIVE_TAB, 'daily');
  const selectedPeriodId = getStorageItem<string>(STORAGE_KEYS.SELECTED_PERIOD_ID, '2026-07');

  const snapshot: AppProgressSnapshot = {
    type: 'AMS_PROGRESS_SNAPSHOT',
    version: '3.0',
    exportedAt: new Date().toISOString(),
    activeTab,
    selectedPeriodId,
    activeDataset: activeDataset || getStorageItem(STORAGE_KEYS.ACTIVE_DATASET, null),
    historicalPeriods: historicalPeriods || getStorageItem(STORAGE_KEYS.HISTORICAL_PERIODS, []),
    settings,
    schedules,
    employees,
    manualAdjustments,
    paidVacations: paidVacations || [],
    dailyFilters,
    monthlyFilters,
    employeesFilters,
    schedulesFilter,
    summary: {
      totalEmployees: employees.length,
      adjustmentsCount: Object.keys(manualAdjustments).length,
      exactPunchCount: Object.values(manualAdjustments).filter((a) => a.exactPunchOnly).length,
      schedulesCount: schedules.length,
      vacationsCount: paidVacations ? paidVacations.length : 0,
    },
  };

  exportProgressToFile(snapshot);
}

/**
 * Parses and validates a progress snapshot or backup file
 */
export function parseProgressFile(file: File): Promise<AppProgressSnapshot> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON format in progress file');
        }
        if (!Array.isArray(parsed.schedules) && !parsed.settings && !parsed.manualAdjustments) {
          throw new Error('File does not contain valid Attendance Management progress data');
        }

        const snapshot: AppProgressSnapshot = {
          type: 'AMS_PROGRESS_SNAPSHOT',
          version: parsed.version || '3.0',
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          activeTab: parsed.activeTab || 'daily',
          selectedPeriodId: parsed.selectedPeriodId,
          activeDataset: parsed.activeDataset,
          historicalPeriods: parsed.historicalPeriods,
          settings: parsed.settings,
          schedules: parsed.schedules || [],
          employees: parsed.employees || [],
          manualAdjustments: parsed.manualAdjustments || {},
          paidVacations: parsed.paidVacations || [],
          auditLogs: parsed.auditLogs || [],
          dailyFilters: parsed.dailyFilters,
          monthlyFilters: parsed.monthlyFilters,
          employeesFilters: parsed.employeesFilters,
          schedulesFilter: parsed.schedulesFilter,
          summary: parsed.summary,
        };

        resolve(snapshot);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

export function parseBackupFile(file: File): Promise<AppProgressSnapshot> {
  return parseProgressFile(file);
}

