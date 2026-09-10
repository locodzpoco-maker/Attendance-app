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
} from './types';
import { DEFAULT_SCHEDULES } from './utils/schedules';
import { DEFAULT_EMPLOYEES } from './utils/employees';
import { calculateAttendance } from './utils/calculator';
import { generateReferenceDataset } from './utils/sampleData';
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
} from './utils/storage';

import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { DailyAttendanceView } from './components/DailyAttendanceView';
import { MonthlySummaryView } from './components/MonthlySummaryView';
import { EmployeesView } from './components/EmployeesView';
import { SchedulesView } from './components/SchedulesView';
import { SettingsView } from './components/SettingsView';
import { ImportModal } from './components/ImportModal';
import { ManualCorrectionModal } from './components/ManualCorrectionModal';

export default function App() {
  // Navigation & Active Tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'daily' | 'monthly' | 'employees' | 'schedules' | 'settings'
  >(() => {
    return getStorageItem<'dashboard' | 'daily' | 'monthly' | 'employees' | 'schedules' | 'settings'>(
      'ams_active_tab',
      'dashboard'
    );
  });

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

  // Schedules (Reads from consistent storage key with quota recovery & fallback)
  const [schedules, setSchedules] = useState<WorkSchedule[]>(() => {
    cleanupLegacyStorage();
    const saved =
      getStorageItem<WorkSchedule[] | null>('ams_schedules', null) ||
      getStorageItem<WorkSchedule[] | null>('ams_schedules_v3', null) ||
      getStorageItem<WorkSchedule[] | null>('ams_schedules_v2', null);
    if (Array.isArray(saved) && saved.length > 0) {
      return saved;
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
      return saved;
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

  // Raw Active Dataset
  const [activeDataset, setActiveDataset] = useState<RawAttendanceDataset>(() => {
    const saved = getStorageItem<RawAttendanceDataset | null>('ams_active_dataset', null);
    if (saved && Array.isArray(saved.employees)) {
      return saved;
    }
    return generateReferenceDataset();
  });

  // Historical Periods
  const [historicalPeriods, setHistoricalPeriods] = useState<HistoricalPeriodRecord[]>(() => {
    const saved = getStorageItem<HistoricalPeriodRecord[] | null>('ams_historical_periods', null);
    if (Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    const initialDataset = generateReferenceDataset();
    const initialCalc = calculateAttendance(initialDataset, {
      schedules: DEFAULT_SCHEDULES,
      employees: DEFAULT_EMPLOYEES,
    });
    return [
      {
        id: '2026-07',
        periodLabel: '01/07/2026 → 31/07/2026',
        startDate: initialDataset.startDate,
        endDate: initialDataset.endDate,
        fileName: initialDataset.fileName,
        importedAt: new Date().toISOString(),
        employeeCount: initialDataset.employees.length,
        dataset: initialDataset,
        dailyRecords: initialCalc.dailyRecords,
        monthlySummary: initialCalc.monthlySummary,
      },
    ];
  });

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() => {
    return getStorageItem<string>('ams_selected_period_id', '2026-07');
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeCorrectionRecord, setActiveCorrectionRecord] =
    useState<DailyAttendanceRecord | null>(null);

  // Sync to Storage immediately upon state changes with quota safety
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
    saveStorageItem('ams_adjustments', manualAdjustments);
  }, [manualAdjustments]);

  useEffect(() => {
    saveStorageItem('ams_audit_logs', auditLogs);
  }, [auditLogs]);

  useEffect(() => {
    if (activeDataset) {
      saveStorageItem('ams_active_dataset', activeDataset);
    }
  }, [activeDataset]);

  useEffect(() => {
    saveCompactHistoricalPeriods(historicalPeriods);
  }, [historicalPeriods]);

  useEffect(() => {
    saveStorageItem('ams_selected_period_id', selectedPeriodId);
  }, [selectedPeriodId]);

  // Main Calculation Execution
  const { dailyRecords, monthlySummary } = useMemo(() => {
    if (!activeDataset) {
      return { dailyRecords: [], monthlySummary: [] };
    }
    return calculateAttendance(activeDataset, {
      schedules,
      employees,
      manualAdjustments,
      settings,
    });
  }, [activeDataset, schedules, employees, manualAdjustments, settings]);

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
    adjustedSecondCheckIn?: string
  ) => {
    const target = dailyRecords.find((r) => r.id === recordId);
    if (!target) return;

    const adjustment: ManualAdjustment = {
      date: target.date,
      employeeId: target.employeeId,
      adjustedEntry,
      adjustedSecondCheckIn,
      adjustedExit,
      overrideShiftId,
      reason,
      adjustedBy: auditor,
      adjustedAt: new Date().toISOString(),
    };

    setManualAdjustments((prev) => ({
      ...prev,
      [recordId]: adjustment,
    }));

    // Log to Audit Trail
    const newLog: AttendanceAuditLog = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: auditor,
      employeeId: target.employeeId,
      employeeName: target.employeeName,
      date: target.date,
      action: 'MANUAL_PUNCH_ADJUSTMENT',
      details: `Entry: ${adjustedEntry || target.entryTime || 'none'} | 2nd In: ${adjustedSecondCheckIn || target.secondCheckInTime || 'none'} | Exit: ${adjustedExit || target.exitTime || 'none'} | Shift: ${overrideShiftId || 'Auto'} | Reason: ${reason}`,
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Employee modifications
  const handleAddEmployee = (newEmp: Employee) => {
    setEmployees((prev) => [...prev, newEmp]);
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === updatedEmp.id ? updatedEmp : e)));
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

  // Export / Import entire application config (schedules, settings, employee assignments)
  const handleExportBackup = () => {
    exportBackupToFile(settings, schedules, employees, manualAdjustments);
  };

  const handleImportBackup = async (file: File) => {
    try {
      const backup = await parseBackupFile(file);
      if (backup.settings) {
        setSettings(backup.settings);
        saveStorageItem('ams_settings', backup.settings);
      }
      if (Array.isArray(backup.schedules) && backup.schedules.length > 0) {
        setSchedules(backup.schedules);
        saveStorageItem('ams_schedules', backup.schedules);
      }
      if (Array.isArray(backup.employees) && backup.employees.length > 0) {
        setEmployees(backup.employees);
        saveStorageItem('ams_employees', backup.employees);
      }
      if (backup.manualAdjustments) {
        setManualAdjustments(backup.manualAdjustments);
        saveStorageItem('ams_adjustments', backup.manualAdjustments);
      }
    } catch (e: any) {
      alert(`Could not restore backup file: ${e.message || e}`);
    }
  };

  // Period label for reports
  const currentPeriodLabel = activeDataset
    ? `${activeDataset.startDate} - ${activeDataset.endDate}`
    : 'Selected Period';

  // Export handlers
  const handleExportDailyExcel = () => {
    exportDailyAttendanceToExcel(dailyRecords, currentPeriodLabel, settings);
  };

  const handleExportDailyPDF = () => {
    exportDailyAttendanceToPDF(dailyRecords, currentPeriodLabel, settings);
  };

  const handleExportMonthlyExcel = () => {
    exportMonthlySummaryToExcel(monthlySummary, currentPeriodLabel, settings);
  };

  const handleExportMonthlyPDF = () => {
    exportMonthlySummaryToPDF(monthlySummary, currentPeriodLabel, settings);
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
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
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
          />
        )}

        {activeTab === 'daily' && (
          <DailyAttendanceView
            records={dailyRecords}
            onOpenCorrection={(record) => setActiveCorrectionRecord(record)}
            onExportExcel={handleExportDailyExcel}
            onExportPDF={handleExportDailyPDF}
            settings={settings}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlySummaryView
            summaries={monthlySummary}
            onExportExcel={handleExportMonthlyExcel}
            onExportPDF={handleExportMonthlyPDF}
            settings={settings}
            periodLabel={currentPeriodLabel}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeesView
            employees={employees}
            schedules={schedules}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onResetDefaults={() => setEmployees(DEFAULT_EMPLOYEES)}
            settings={settings}
          />
        )}

        {activeTab === 'schedules' && (
          <SchedulesView
            schedules={schedules}
            onUpdateSchedule={handleUpdateSchedule}
            onAddSchedule={handleAddSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onResetSchedules={handleResetSchedules}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            canEdit={settings.activeRole !== 'Management'}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            historicalPeriods={historicalPeriods}
            onSelectPeriod={handleSelectPeriod}
            onDeletePeriod={handleDeletePeriod}
            auditLogs={auditLogs}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
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
            }}
          />
        )}
      </main>

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onDatasetLoaded={handleDatasetLoaded}
      />

      {/* Manual Punch Correction Modal */}
      {activeCorrectionRecord && (
        <ManualCorrectionModal
          record={activeCorrectionRecord}
          onClose={() => setActiveCorrectionRecord(null)}
          onSave={handleSaveCorrection}
          currentUser={settings.activeRole}
        />
      )}
    </div>
  );
}
