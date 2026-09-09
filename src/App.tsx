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
  >('dashboard');

  // App Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('ams_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      companyName: 'Attendance Management System',
      companySubtitle: 'Automated Biometric Fingerprint & Schedule Engine',
      defaultOvertimeGraceMinutes: 15,
      defaultArrivalGraceMinutes: 0,
      allowRecalculationOnFly: true,
      activeRole: 'Administrator',
    };
  });

  // Schedules
  const [schedules, setSchedules] = useState<WorkSchedule[]>(() => {
    const saved = localStorage.getItem('ams_schedules_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_SCHEDULES;
  });

  // Employees Database
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('ams_employees_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_EMPLOYEES;
  });

  // Manual Adjustments (Key: "empId_date")
  const [manualAdjustments, setManualAdjustments] = useState<
    Record<string, ManualAdjustment>
  >(() => {
    const saved = localStorage.getItem('ams_adjustments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {};
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AttendanceAuditLog[]>(() => {
    const saved = localStorage.getItem('ams_audit_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [];
  });

  // Raw Active Dataset
  const [activeDataset, setActiveDataset] = useState<RawAttendanceDataset>(() => {
    return generateReferenceDataset();
  });

  // Historical Periods
  const [historicalPeriods, setHistoricalPeriods] = useState<HistoricalPeriodRecord[]>(() => {
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

  const [selectedPeriodId, setSelectedPeriodId] = useState('2026-07');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeCorrectionRecord, setActiveCorrectionRecord] =
    useState<DailyAttendanceRecord | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('ams_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('ams_schedules', JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem('ams_employees_v3', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('ams_adjustments', JSON.stringify(manualAdjustments));
  }, [manualAdjustments]);

  useEffect(() => {
    localStorage.setItem('ams_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

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
    overrideShiftId?: string
  ) => {
    const target = dailyRecords.find((r) => r.id === recordId);
    if (!target) return;

    const adjustment: ManualAdjustment = {
      date: target.date,
      employeeId: target.employeeId,
      adjustedEntry,
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
      details: `Entry: ${adjustedEntry || target.entryTime || 'none'} | Exit: ${adjustedExit || target.exitTime || 'none'} | Shift: ${overrideShiftId || 'Auto'} | Reason: ${reason}`,
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

  // Schedule modifications
  const handleAddSchedule = (newSched: WorkSchedule) => {
    setSchedules((prev) => [...prev, newSched]);
  };

  const handleUpdateSchedule = (updatedSched: WorkSchedule) => {
    setSchedules((prev) => prev.map((s) => (s.id === updatedSched.id ? updatedSched : s)));
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
            canEdit={settings.activeRole !== 'Management'}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={setSettings}
            historicalPeriods={historicalPeriods}
            onSelectPeriod={handleSelectPeriod}
            onDeletePeriod={handleDeletePeriod}
            auditLogs={auditLogs}
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
