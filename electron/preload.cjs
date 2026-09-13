const { contextBridge, ipcRenderer } = require('electron');

/**
 * Secure Electron Preload Bridge
 * contextIsolation: true, nodeIntegration: false
 * Exposes only necessary database and system operations without leaking raw Node APIs
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Environment indicator
  isElectron: true,
  platform: process.platform,

  // Database System Stats & Paths
  getDbStats: () => ipcRenderer.invoke('db:get-stats'),

  // Employees
  getEmployees: () => ipcRenderer.invoke('db:get-employees'),
  saveEmployee: (employee) => ipcRenderer.invoke('db:save-employee', employee),
  saveEmployeesBatch: (employees) => ipcRenderer.invoke('db:save-employees-batch', employees),
  deleteEmployee: (id) => ipcRenderer.invoke('db:delete-employee', id),

  // Schedules
  getSchedules: () => ipcRenderer.invoke('db:get-schedules'),
  saveSchedule: (schedule) => ipcRenderer.invoke('db:save-schedule', schedule),
  saveSchedulesBatch: (schedules) => ipcRenderer.invoke('db:save-schedules-batch', schedules),
  deleteSchedule: (id) => ipcRenderer.invoke('db:delete-schedule', id),

  // Daily Records & Attendance
  getDailyRecords: () => ipcRenderer.invoke('db:get-daily-records'),
  saveDailyRecords: (records) => ipcRenderer.invoke('db:save-daily-records', records),

  // Monthly Summaries
  getMonthlySummaries: (periodId) => ipcRenderer.invoke('db:get-monthly-summaries', periodId),
  saveMonthlySummaries: (periodId, summaries) => ipcRenderer.invoke('db:save-monthly-summaries', periodId, summaries),

  // Historical Periods
  getHistoricalPeriods: () => ipcRenderer.invoke('db:get-historical-periods'),
  saveHistoricalPeriod: (period) => ipcRenderer.invoke('db:save-historical-period', period),
  deleteHistoricalPeriod: (id) => ipcRenderer.invoke('db:delete-historical-period', id),

  // Audit Logs
  getAuditLogs: () => ipcRenderer.invoke('db:get-audit-logs'),
  saveAuditLogs: (logs) => ipcRenderer.invoke('db:save-audit-logs', logs),

  // Manual Adjustments
  getManualAdjustments: () => ipcRenderer.invoke('db:get-manual-adjustments'),
  saveManualAdjustment: (adjustment) => ipcRenderer.invoke('db:save-manual-adjustment', adjustment),

  // Paid Vacations
  getPaidVacations: () => ipcRenderer.invoke('db:get-paid-vacations'),
  savePaidVacation: (vacation) => ipcRenderer.invoke('db:save-paid-vacation', vacation),
  savePaidVacationsBatch: (vacations) => ipcRenderer.invoke('db:save-paid-vacations-batch', vacations),
  deletePaidVacation: (id) => ipcRenderer.invoke('db:delete-paid-vacation', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('db:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('db:save-settings', settings),

  // Active Dataset
  getActiveDataset: () => ipcRenderer.invoke('db:get-active-dataset'),
  saveActiveDataset: (dataset) => ipcRenderer.invoke('db:save-active-dataset', dataset),

  // Backups & Restore
  createBackup: (customName) => ipcRenderer.invoke('db:create-backup', customName),
  listBackups: () => ipcRenderer.invoke('db:list-backups'),
  restoreBackup: (backupFileName) => ipcRenderer.invoke('db:restore-backup', backupFileName),
  exportDatabase: (targetPath) => ipcRenderer.invoke('db:export-database', targetPath),
  importDatabase: (sourcePath) => ipcRenderer.invoke('db:import-database', sourcePath),
  openDataFolder: () => ipcRenderer.invoke('db:open-data-folder'),

  // Migration from localStorage
  migrateFromLocalStorage: (data) => ipcRenderer.invoke('db:migrate-from-localstorage', data),
});
