const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const AttendanceDatabase = require('./database.cjs');

let mainWindow = null;
let db = null;

// Ensure single application instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Attendance Management System',
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Remove default menu for clean native desktop look
  mainWindow.setMenuBarVisibility(false);

  // In production, load the built static HTML from dist/
  const distHtmlPath = path.join(__dirname, '../dist/index.html');
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (fs.existsSync(distHtmlPath)) {
    await mainWindow.loadFile(distHtmlPath);
  } else {
    // Fallback URL if dist not built yet
    await mainWindow.loadURL('http://localhost:3000');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  // Stats & paths
  ipcMain.handle('db:get-stats', async () => {
    return db.getStats();
  });

  // Employees
  ipcMain.handle('db:get-employees', async () => {
    return db.getEmployees();
  });
  ipcMain.handle('db:save-employee', async (_, emp) => {
    return db.saveEmployee(emp);
  });
  ipcMain.handle('db:save-employees-batch', async (_, emps) => {
    return db.saveEmployeesBatch(emps);
  });
  ipcMain.handle('db:delete-employee', async (_, id) => {
    return db.deleteEmployee(id);
  });

  // Schedules
  ipcMain.handle('db:get-schedules', async () => {
    return db.getSchedules();
  });
  ipcMain.handle('db:save-schedule', async (_, sched) => {
    return db.saveSchedule(sched);
  });
  ipcMain.handle('db:save-schedules-batch', async (_, scheds) => {
    return db.saveSchedulesBatch(scheds);
  });
  ipcMain.handle('db:delete-schedule', async (_, id) => {
    return db.deleteSchedule(id);
  });

  // Daily records
  ipcMain.handle('db:get-daily-records', async () => {
    return db.getDailyRecords();
  });
  ipcMain.handle('db:save-daily-records', async (_, records) => {
    return db.saveDailyRecords(records);
  });

  // Monthly summaries
  ipcMain.handle('db:get-monthly-summaries', async (_, periodId) => {
    return db.getMonthlySummaries(periodId);
  });
  ipcMain.handle('db:save-monthly-summaries', async (_, { periodId, summaries }) => {
    return db.saveMonthlySummaries(periodId, summaries);
  });

  // Historical periods
  ipcMain.handle('db:get-historical-periods', async () => {
    return db.getHistoricalPeriods();
  });
  ipcMain.handle('db:save-historical-period', async (_, period) => {
    return db.saveHistoricalPeriod(period);
  });
  ipcMain.handle('db:delete-historical-period', async (_, id) => {
    return db.deleteHistoricalPeriod(id);
  });

  // Audit logs
  ipcMain.handle('db:get-audit-logs', async () => {
    return db.getAuditLogs();
  });
  ipcMain.handle('db:save-audit-logs', async (_, logs) => {
    return db.saveAuditLogs(logs);
  });

  // Manual adjustments
  ipcMain.handle('db:get-manual-adjustments', async () => {
    return db.getManualAdjustments();
  });
  ipcMain.handle('db:save-manual-adjustment', async (_, adj) => {
    return db.saveManualAdjustment(adj);
  });

  // Settings
  ipcMain.handle('db:get-settings', async () => {
    return db.getSettings();
  });
  ipcMain.handle('db:save-settings', async (_, settings) => {
    return db.saveSettings(settings);
  });

  // Active dataset
  ipcMain.handle('db:get-active-dataset', async () => {
    return db.getActiveDataset();
  });
  ipcMain.handle('db:save-active-dataset', async (_, dataset) => {
    return db.saveActiveDataset(dataset);
  });

  // Backups
  ipcMain.handle('db:create-backup', async (_, customName) => {
    return db.createBackup(customName);
  });
  ipcMain.handle('db:list-backups', async () => {
    return db.listBackups();
  });
  ipcMain.handle('db:restore-backup', async (_, fileName) => {
    return db.restoreBackup(fileName);
  });

  // Open data folder in Windows Explorer
  ipcMain.handle('db:open-data-folder', async () => {
    const stats = db.getStats();
    if (fs.existsSync(stats.dataDir)) {
      shell.openPath(stats.dataDir);
      return true;
    }
    return false;
  });

  // Export database to chosen file location
  ipcMain.handle('db:export-database', async () => {
    if (!mainWindow) return { success: false };
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Attendance Database',
      defaultPath: `Attendance_Full_Backup_${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }],
    });
    if (filePath) {
      return db.exportDatabaseToFile(filePath);
    }
    return { success: false, canceled: true };
  });

  // Import database from file
  ipcMain.handle('db:import-database', async () => {
    if (!mainWindow) return { success: false };
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Backup Database to Restore',
      properties: ['openFile'],
      filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }],
    });
    if (filePaths && filePaths.length > 0) {
      return db.importDatabaseFromFile(filePaths[0]);
    }
    return { success: false, canceled: true };
  });

  // Migration from localStorage
  ipcMain.handle('db:migrate-from-localstorage', async (_, data) => {
    return db.migrateFromLocalStorage(data);
  });
}

app.whenReady().then(async () => {
  db = new AttendanceDatabase();
  await db.init();
  registerIpcHandlers();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
