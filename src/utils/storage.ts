import { AppSettings, WorkSchedule, Employee, ManualAdjustment, AttendanceAuditLog, RawAttendanceDataset, HistoricalPeriodRecord } from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'ams_settings',
  SCHEDULES: 'ams_schedules',
  EMPLOYEES: 'ams_employees',
  ADJUSTMENTS: 'ams_adjustments',
  AUDIT_LOGS: 'ams_audit_logs',
  ACTIVE_TAB: 'ams_active_tab',
  ACTIVE_DATASET: 'ams_active_dataset',
  HISTORICAL_PERIODS: 'ams_historical_periods',
  SELECTED_PERIOD_ID: 'ams_selected_period_id',
};

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

// Safely save item with QuotaExceeded recovery
export function saveStorageItem<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (e: any) {
    console.warn(`Quota or storage error writing key "${key}". Attempting cleanup...`, e);

    // If quota exceeded, remove heavy dataset cache and retry saving
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORICAL_PERIODS);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_DATASET);
      cleanupLegacyStorage();
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (retryError) {
      console.error(`Critical: Unable to save key "${key}" even after cleanup:`, retryError);
      return false;
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
      // Omit bulky dailyRecords and monthlySummary - they are computed dynamically on the fly!
    }));
    saveStorageItem(STORAGE_KEYS.HISTORICAL_PERIODS, compact);
  } catch (e) {
    console.warn('Failed to save compact historical periods', e);
  }
}

// Export backup payload
export interface AppBackupPayload {
  version: string;
  exportedAt: string;
  settings: AppSettings;
  schedules: WorkSchedule[];
  employees: Employee[];
  manualAdjustments: Record<string, ManualAdjustment>;
}

export function exportBackupToFile(
  settings: AppSettings,
  schedules: WorkSchedule[],
  employees: Employee[],
  manualAdjustments: Record<string, ManualAdjustment>
) {
  const payload: AppBackupPayload = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    settings,
    schedules,
    employees,
    manualAdjustments,
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(payload, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute('download', `Attendance_Settings_Backup_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function parseBackupFile(file: File): Promise<AppBackupPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON format');
        }
        if (!Array.isArray(parsed.schedules) && !parsed.settings) {
          throw new Error('Backup file does not contain valid settings or schedules');
        }
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}
