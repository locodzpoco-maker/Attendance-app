import React, { useState, useEffect } from 'react';
import {
  Database,
  HardDrive,
  FolderOpen,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  X,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import {
  isElectronApp,
  getDatabaseStats,
  createDatabaseBackup,
  listDatabaseBackups,
  restoreDatabaseBackup,
  exportDatabaseFile,
  importDatabaseFile,
  openAppDataFolder,
  detectLocalStorageData,
  migrateLocalStorageToSQLite,
} from '../utils/storageAdapter';
import { DatabaseStats, BackupItem } from '../types';

interface DesktopDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReloadNeeded?: () => void;
}

export const DesktopDatabaseModal: React.FC<DesktopDatabaseModalProps> = ({
  isOpen,
  onClose,
  onDataReloadNeeded,
}) => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [legacyData, setLegacyData] = useState<Record<string, any> | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  const isDesktop = isElectronApp();

  const refreshInfo = async () => {
    setIsLoading(true);
    try {
      const s = await getDatabaseStats();
      setStats(s);
      if (isDesktop) {
        const b = await listDatabaseBackups();
        setBackups(b);
      }
      const legacy = detectLocalStorageData();
      setLegacyData(legacy);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshInfo();
      setStatusMessage(null);
      setMigrationResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateBackup = async () => {
    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'Creating database backup...' });
    try {
      const res = await createDatabaseBackup();
      if (res.success) {
        setStatusMessage({ type: 'success', text: `Backup created successfully: ${res.fileName}` });
        await refreshInfo();
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to create backup' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async (fileName: string) => {
    if (!window.confirm(`Are you sure you want to restore from ${fileName}?\n\nAn automatic safety backup of your current database will be created first.`)) {
      return;
    }

    setIsLoading(true);
    setStatusMessage({ type: 'info', text: `Restoring database from ${fileName}...` });
    try {
      const res = await restoreDatabaseBackup(fileName);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message || 'Database restored successfully!' });
        await refreshInfo();
        if (onDataReloadNeeded) onDataReloadNeeded();
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to restore backup' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportDatabase = async () => {
    try {
      const res = await exportDatabaseFile();
      if (res.success && res.targetPath) {
        setStatusMessage({ type: 'success', text: `Database exported to: ${res.targetPath}` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleImportDatabase = async () => {
    if (!window.confirm('Importing an external database will replace the current database.\nAn automatic safety backup will be created first.\n\nDo you want to proceed?')) {
      return;
    }
    try {
      const res = await importDatabaseFile();
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Database file imported successfully!' });
        await refreshInfo();
        if (onDataReloadNeeded) onDataReloadNeeded();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleMigrate = async () => {
    setIsMigrating(true);
    setStatusMessage(null);
    try {
      const res = await migrateLocalStorageToSQLite();
      if (res.success) {
        setMigrationResult(res.summary);
        setStatusMessage({
          type: 'success',
          text: `Migration successful! Imported ${res.summary?.employeesImported ?? 0} employees and ${res.summary?.schedulesImported ?? 0} schedules into SQLite.`,
        });
        await refreshInfo();
        if (onDataReloadNeeded) onDataReloadNeeded();
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Migration failed' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Local SQLite Database & Backups
                {isDesktop ? (
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                    Windows Desktop Active
                  </span>
                ) : (
                  <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                    Web Preview Mode
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Local offline database storage, automatic multi-file backup system, and migration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
              {statusMessage.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              {statusMessage.type === 'info' && <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />}
              <div className="flex-1 font-medium">{statusMessage.text}</div>
            </div>
          )}

          {/* Database Path & Storage Information Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-slate-700" /> Storage Architecture & Storage Paths
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Database File Location:</span>
                <span className="font-mono text-xs text-slate-800 font-semibold break-all">
                  {stats?.dbPath || 'C:\\ProgramData\\Attendance App\\attendance.db'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Stored outside Program Files so application updates will never overwrite your records.
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Automatic Backups Folder:</span>
                <span className="font-mono text-xs text-slate-800 font-semibold break-all">
                  {stats?.backupsDir || 'C:\\ProgramData\\Attendance App\\Backups\\'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Retains multiple versioned .db backup snapshots automatically.
                </span>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                onClick={handleCreateBackup}
                disabled={isLoading}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Backup Database Now
              </button>

              {isDesktop && (
                <>
                  <button
                    onClick={openAppDataFolder}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                    Open Data Folder in Explorer
                  </button>

                  <button
                    onClick={handleExportDatabase}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    Export Full .db File
                  </button>

                  <button
                    onClick={handleImportDatabase}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    Import External .db File
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Migration Card (If localStorage data is detected) */}
          {legacyData && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">
                      Browser Storage Migration Tool
                    </h4>
                    <p className="text-xs text-amber-700">
                      Detected previous attendance data saved in browser storage. Migrate it safely into your SQLite database.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleMigrate}
                  disabled={isMigrating}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {isMigrating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  Migrate Data to SQLite
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white/80 p-2 rounded-lg border border-amber-200">
                  <span className="text-slate-500 block">Employees in storage:</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {legacyData.ams_employees?.length || 0}
                  </span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-amber-200">
                  <span className="text-slate-500 block">Schedules in storage:</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {legacyData.ams_schedules?.length || 0}
                  </span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-amber-200">
                  <span className="text-slate-500 block">Historical periods:</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {legacyData.ams_historical_periods?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Database Backups List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-700" /> Database Backup Snapshots ({backups.length})
              </h4>
              <button
                onClick={refreshInfo}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {backups.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                No database backups recorded yet. Click "Backup Database Now" to generate an immediate snapshot.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {backups.map((b) => (
                  <div key={b.fileName} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <div className="font-mono text-xs font-semibold text-slate-800">{b.fileName}</div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(b.createdAt).toLocaleString()} &bull; {(b.sizeBytes / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRestoreBackup(b.fileName)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>SQLite 3 Engine &bull; Automatic Safety Snapshots Before Restores</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
