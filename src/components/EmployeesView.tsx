import React, { useState, useMemo, useEffect } from 'react';
import { Employee, WorkSchedule, AppSettings, RawEmployeeRecord } from '../types';
import { isStockWorker, isAdminWorker, findUnmappedEmployees, createEmployeeFromDetected } from '../utils/employees';
import { Users, Plus, Edit2, Search, CheckCircle, XCircle, ShieldAlert, UserPlus, Sparkles, Zap, Check, Palmtree, Archive, ArchiveRestore, Upload, Download, FileSpreadsheet, ChevronDown, FileDown } from 'lucide-react';
import { AddDetectedWorkersModal } from './AddDetectedWorkersModal';
import { ImportEmployeesModal } from './ImportEmployeesModal';
import { exportEmployeesToExcel, exportEmployeesToCSV, downloadEmployeesSampleTemplate } from '../utils/exporter';
import { getTranslations } from '../utils/i18n';
import { getStorageItem, saveStorageItem } from '../utils/storage';

interface SavedEmployeesFilters {
  searchTerm?: string;
  categoryFilter?: 'ALL' | 'STOCK' | 'ADMIN' | 'SATURDAY' | 'ARCHIVED';
  showArchived?: boolean;
}

interface EmployeesViewProps {
  employees: Employee[];
  schedules: WorkSchedule[];
  onAddEmployee: (emp: Employee) => void;
  onAddBatchEmployees?: (newEmployees: Employee[]) => void;
  onImportEmployees?: (employees: Employee[], mode: 'merge' | 'addNewOnly' | 'replace') => void;
  onUpdateEmployee: (emp: Employee) => void;
  onResetDefaults?: () => void;
  onOpenVacationForEmployee?: (empId: string) => void;
  settings: AppSettings;
  rawEmployeesFromDataset?: RawEmployeeRecord[];
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  schedules,
  onAddEmployee,
  onAddBatchEmployees,
  onImportEmployees,
  onUpdateEmployee,
  onResetDefaults,
  onOpenVacationForEmployee,
  settings,
  rawEmployeesFromDataset,
}) => {
  const t = getTranslations(settings.language);
  const [savedFilters] = useState<SavedEmployeesFilters | null>(() =>
    getStorageItem<SavedEmployeesFilters | null>('ams_employees_filters', null)
  );
  const [searchTerm, setSearchTerm] = useState(savedFilters?.searchTerm ?? '');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'STOCK' | 'ADMIN' | 'SATURDAY' | 'ARCHIVED'>(
    savedFilters?.categoryFilter ?? 'ALL'
  );
  const [showArchived, setShowArchived] = useState(savedFilters?.showArchived ?? false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Persist employee filters to localStorage in real time
  useEffect(() => {
    saveStorageItem('ams_employees_filters', {
      searchTerm,
      categoryFilter,
      showArchived,
    });
  }, [searchTerm, categoryFilter, showArchived]);

  // Listen for progress restored event to update active filters in real-time
  useEffect(() => {
    const handleProgressRestored = () => {
      const restored = getStorageItem<SavedEmployeesFilters | null>('ams_employees_filters', null);
      if (restored) {
        if (restored.searchTerm !== undefined) setSearchTerm(restored.searchTerm);
        if (restored.categoryFilter !== undefined) setCategoryFilter(restored.categoryFilter);
        if (restored.showArchived !== undefined) setShowArchived(restored.showArchived);
      }
    };
    window.addEventListener('ams_progress_restored', handleProgressRestored);
    return () => window.removeEventListener('ams_progress_restored', handleProgressRestored);
  }, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [detectedModalOpen, setDetectedModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Compute detected workers in attendance file that are not in employees mapping
  const unmappedWorkers = useMemo(() => {
    return findUnmappedEmployees(rawEmployeesFromDataset || [], employees);
  }, [rawEmployeesFromDataset, employees]);

  const handleQuickAddAllUnmapped = () => {
    if (!onAddBatchEmployees || unmappedWorkers.length === 0) return;
    const newEmployees = unmappedWorkers.map((w) => createEmployeeFromDetected(w));
    onAddBatchEmployees(newEmployees);
    setToastMessage(`Successfully added all ${newEmployees.length} detected workers!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAddBatchFromModal = (newEmps: Employee[]) => {
    if (!onAddBatchEmployees) return;
    onAddBatchEmployees(newEmps);
    setToastMessage(`Successfully added ${newEmps.length} worker${newEmps.length > 1 ? 's' : ''}!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleImportComplete = (
    importedList: Employee[],
    mode: 'merge' | 'addNewOnly' | 'replace'
  ) => {
    if (onImportEmployees) {
      onImportEmployees(importedList, mode);
    } else if (onAddBatchEmployees) {
      onAddBatchEmployees(importedList);
    }
    setToastMessage(`Importation réussie : ${importedList.length} employé(s) traité(s) !`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleExportExcel = () => {
    exportEmployeesToExcel(filteredEmployees.length > 0 ? filteredEmployees : employees, settings);
    setExportDropdownOpen(false);
  };

  const handleExportCSV = () => {
    exportEmployeesToCSV(filteredEmployees.length > 0 ? filteredEmployees : employees);
    setExportDropdownOpen(false);
  };


  // Form states
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [workerType, setWorkerType] = useState<'Admin' | 'Stock'>('Admin');
  const [companyDept, setCompanyDept] = useState('Stock & Logistique');
  const [groupName, setGroupName] = useState('Stock Group 1');
  const [scheduleId, setScheduleId] = useState('stock_g1');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Archived'>('Active');
  const [isArchived, setIsArchived] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [hasSaturdayShift, setHasSaturdayShift] = useState(false);
  const [eligibleForOvertime, setEligibleForOvertime] = useState(true);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Helper to reliably check if employee is classified as a Stock worker
  const isStockWorkerRecord = (e: Employee): boolean => {
    if (e.workerType === 'Stock') return true;
    if (e.workerType === 'Admin') return false;
    return isStockWorker(e.id, e) || (e.companyDepartment || '').toLowerCase().includes('stock');
  };

  const handleWorkerTypeChange = (newType: 'Admin' | 'Stock') => {
    setWorkerType(newType);
    if (newType === 'Stock') {
      if (!companyDept || companyDept === 'Administration' || companyDept.toLowerCase().includes('admin')) {
        setCompanyDept('Stock & Logistique');
      }
      if (!groupName || groupName === 'Admin Group 1' || groupName === 'Admin Group 2') {
        setGroupName('Stock');
      }
      if (scheduleId === 'admin_g1' || scheduleId === 'admin_g2') {
        setScheduleId('stock_dynamic');
      }
    } else {
      if (!companyDept || companyDept === 'Stock & Logistique' || companyDept.toLowerCase().includes('stock')) {
        setCompanyDept('Administration');
      }
      if (!groupName || groupName === 'Stock') {
        setGroupName('Admin Group 1');
      }
      if (scheduleId === 'stock_dynamic' || scheduleId.startsWith('stock_')) {
        setScheduleId('admin_g1');
      }
      setEligibleForOvertime(false);
    }
  };

  const openAddModal = () => {
    setEditingEmp(null);
    setEmpId('');
    setName('');
    setWorkerType('Stock');
    setCompanyDept('Stock & Logistique');
    setGroupName('Stock Group 1');
    setScheduleId(schedules[0]?.id || 'stock_g1');
    setStatus('Active');
    setIsArchived(false);
    setStartDate(new Date().toISOString().slice(0, 10));
    setHasSaturdayShift(false);
    setEligibleForOvertime(true);
    setNotes('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    const isStock = isStockWorkerRecord(emp);
    setEditingEmp(emp);
    setEmpId(emp.id);
    setName(emp.name);
    setWorkerType(emp.workerType || (isStock ? 'Stock' : 'Admin'));
    setCompanyDept(emp.companyDepartment);
    setGroupName(emp.groupName);
    setScheduleId(emp.scheduleId);
    setStatus(emp.status);
    setIsArchived(Boolean(emp.isArchived || emp.status === 'Archived'));
    setStartDate(emp.startDate);
    setHasSaturdayShift(Boolean(emp.hasSaturdayShift));
    setEligibleForOvertime(
      emp.eligibleForOvertime !== undefined
        ? Boolean(emp.eligibleForOvertime)
        : isStock
    );
    setNotes(emp.notes || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleArchiveEmployee = (emp: Employee) => {
    const updated: Employee = {
      ...emp,
      status: 'Archived',
      isArchived: true,
      archivedAt: new Date().toISOString(),
    };
    onUpdateEmployee(updated);
    setToastMessage(`${emp.name} (${emp.id}) — ${t.archiveEmployee} (${t.archivedExcludedBadge})`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleUnarchiveEmployee = (emp: Employee) => {
    const updated: Employee = {
      ...emp,
      status: 'Active',
      isArchived: false,
      archivedAt: undefined,
    };
    onUpdateEmployee(updated);
    setToastMessage(`${emp.name} (${emp.id}) — ${t.unarchiveEmployee}`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId.trim()) {
      setFormError('Employee ID is strictly required and stored as text (e.g. 00022236).');
      return;
    }
    if (!name.trim()) {
      setFormError('Employee Name is required.');
      return;
    }

    // Check duplicate ID if creating new
    if (!editingEmp) {
      const exists = employees.some((e) => e.id.trim() === empId.trim());
      if (exists) {
        setFormError(`An employee with ID "${empId}" already exists. ID must be unique.`);
        return;
      }
    }

    const archivedFlag = isArchived || status === 'Archived';
    const payload: Employee = {
      id: empId.trim(),
      name: name.trim(),
      companyDepartment: companyDept.trim(),
      groupName: groupName.trim(),
      scheduleId,
      status: archivedFlag ? 'Archived' : status,
      startDate,
      hasSaturdayShift,
      eligibleForOvertime,
      isArchived: archivedFlag,
      archivedAt: archivedFlag ? (editingEmp?.archivedAt || new Date().toISOString()) : undefined,
      notes: notes.trim() || undefined,
      workerType,
    };

    if (editingEmp) {
      onUpdateEmployee(payload);
    } else {
      onAddEmployee(payload);
    }
    setModalOpen(false);
  };

  const handleQuickChangeWorkerType = (emp: Employee, newType: 'Admin' | 'Stock') => {
    const updated: Employee = {
      ...emp,
      workerType: newType,
      companyDepartment:
        newType === 'Stock' && (!emp.companyDepartment || emp.companyDepartment === 'Administration')
          ? 'Stock & Logistique'
          : (newType === 'Admin' && (!emp.companyDepartment || emp.companyDepartment === 'Stock & Logistique') ? 'Administration' : emp.companyDepartment),
      groupName:
        newType === 'Stock' && (emp.groupName === 'Admin Group 1' || emp.groupName === 'Admin Group 2')
          ? 'Stock'
          : (newType === 'Admin' && emp.groupName === 'Stock' ? 'Admin Group 1' : emp.groupName),
      scheduleId:
        newType === 'Stock' && (emp.scheduleId === 'admin_g1' || emp.scheduleId === 'admin_g2')
          ? 'stock_dynamic'
          : (newType === 'Admin' && (emp.scheduleId === 'stock_dynamic' || emp.scheduleId.startsWith('stock_')) ? 'admin_g1' : emp.scheduleId),
    };
    onUpdateEmployee(updated);
    setToastMessage(`${emp.name} (${emp.id}) — ${newType === 'Stock' ? t.stockRoleBadge : t.adminRoleBadge}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const archivedCount = employees.filter((e) => Boolean(e.isArchived || e.status === 'Archived')).length;
  const activeEmployees = employees.filter((e) => !e.isArchived && e.status !== 'Archived');
  const stockCount = employees.filter(isStockWorkerRecord).length;
  const adminCount = employees.length - stockCount;
  const saturdayCount = employees.filter((e) => Boolean(e.hasSaturdayShift)).length;
  const stockSaturdayCount = employees.filter((e) => Boolean(e.hasSaturdayShift) && isStockWorkerRecord(e)).length;
  const adminSaturdayCount = saturdayCount - stockSaturdayCount;

  const filteredEmployees = employees.filter((e) => {
    const isEmpArchived = Boolean(e.isArchived || e.status === 'Archived');

    if (categoryFilter === "ARCHIVED") {
      if (!isEmpArchived) return false;
    } else {
      // If browsing active categories and not explicitly showing archived, exclude them
      if (!showArchived && isEmpArchived) return false;

      const isStock = isStockWorkerRecord(e);
      if (categoryFilter === "STOCK" && !isStock) return false;
      if (categoryFilter === "ADMIN" && isStock) return false;
      if (categoryFilter === "SATURDAY" && !e.hasSaturdayShift) return false;
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        e.id.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.companyDepartment.toLowerCase().includes(q) ||
        e.groupName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Success Toast */}
      {toastMessage && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Unmapped Workers Banner */}
      {unmappedWorkers.length > 0 && settings.activeRole !== 'Management' && (
        <div
          id="unmapped-workers-detected-banner"
          className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-2xs shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-amber-950">
                  {unmappedWorkers.length} {t.unmappedDetectedTitle}
                </h4>
                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-bold text-amber-900 font-mono">
                  {rawEmployeesFromDataset?.length || 0} / {employees.length}
                </span>
              </div>
              <p className="text-xs text-amber-800/90 mt-0.5 max-w-2xl">
                {t.unmappedDetectedSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button
              id="quick-add-all-unmapped-btn"
              type="button"
              onClick={handleQuickAddAllUnmapped}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 transition-colors shadow-2xs"
              title="Add all detected unmapped workers with default detected shifts"
            >
              <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-600" />
              {t.batchAdd} ({unmappedWorkers.length})
            </button>

            <button
              id="review-add-unmapped-btn"
              type="button"
              onClick={() => setDetectedModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white transition-colors shadow-2xs"
              title="Review, customize departments/schedules, and add selected workers"
            >
              <UserPlus className="h-4 w-4" />
              {t.detectMissing} ({unmappedWorkers.length})
            </button>
          </div>
        </div>
      )}

      {/* Control bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="search-employee-input"
                type="text"
                placeholder={t.searchEmployeePlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setCategoryFilter("ALL")}
                className={`rounded-lg px-2.5 py-1 transition-all ${categoryFilter === "ALL" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
              >
                {t.allWorkers} ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("STOCK")}
                className={`rounded-lg px-2.5 py-1 transition-all ${categoryFilter === "STOCK" ? "bg-indigo-600 text-white shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
              >
                {t.allStockWorkers} ({stockCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("ADMIN")}
                className={`rounded-lg px-2.5 py-1 transition-all ${categoryFilter === "ADMIN" ? "bg-slate-800 text-white shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
              >
                {t.allAdminWorkers} ({adminCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("SATURDAY")}
                className={`rounded-lg px-2.5 py-1 transition-all ${categoryFilter === "SATURDAY" ? "bg-teal-600 text-white shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                title={`${stockSaturdayCount} Stock, ${adminSaturdayCount} Administration`}
              >
                📅 {t.filterSaturdayWorkers} ({saturdayCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("ARCHIVED")}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  categoryFilter === "ARCHIVED"
                    ? "bg-amber-600 text-white shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title={t.totalArchived}
              >
                📁 {t.tabArchived} ({archivedCount})
              </button>
              {categoryFilter === "SATURDAY" && (
                <span className="text-[11px] text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-2.5 py-1 font-semibold flex items-center gap-1.5 shadow-2xs">
                  <span>
                    {stockSaturdayCount} {t.stockRoleBadge} ({schedules.find((s) => s.id === 'stock_sat')?.startTime || '10:00'}–{schedules.find((s) => s.id === 'stock_sat')?.endTime || '17:00'})
                  </span>
                  <span className="text-teal-400">•</span>
                  <span>
                    {adminSaturdayCount} {t.adminRoleBadge} ({schedules.find((s) => s.id === 'admin_sat')?.startTime || '09:00'}–{schedules.find((s) => s.id === 'admin_sat')?.endTime || '17:00'})
                  </span>
                </span>
              )}
            </div>

            {/* Toggle show/hide archived when in standard categories */}
            {categoryFilter !== "ARCHIVED" && archivedCount > 0 && (
              <button
                id="employees-toggle-show-archived-btn"
                type="button"
                onClick={() => setShowArchived((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all shadow-2xs ${
                  showArchived
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title={showArchived ? t.excludeArchived : t.includeArchived}
              >
                <Archive className="h-3.5 w-3.5 text-amber-600" />
                <span>{showArchived ? t.includeArchived : t.excludeArchived}</span>
                {!showArchived && (
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] text-slate-700 font-mono">
                    {archivedCount} {t.archivedExcludedBadge}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Export Dropdown */}
            <div className="relative">
              <button
                id="export-employees-dropdown-btn"
                type="button"
                onClick={() => setExportDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                title={t.exportEmployees}
              >
                <Download className="h-4 w-4 text-emerald-600" />
                <span>{t.exportEmployees}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {exportDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-slate-200 bg-white shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 text-xs"
                  onMouseLeave={() => setExportDropdownOpen(false)}
                >
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span>{t.exportExcel}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                  >
                    <FileDown className="h-4 w-4 text-indigo-600" />
                    <span>{t.exportCsv}</span>
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      downloadEmployeesSampleTemplate();
                      setExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-500 text-[11px] cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-400" />
                    <span>{t.downloadTemplate} (.xlsx)</span>
                  </button>
                </div>
              )}
            </div>

            {settings.activeRole !== 'Management' && (
              <>
                <button
                  id="import-employees-btn"
                  type="button"
                  onClick={() => setImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                  title={t.importEmployees}
                >
                  <Upload className="h-4 w-4 text-indigo-600" />
                  <span>{t.importEmployees}</span>
                </button>

                {unmappedWorkers.length > 0 && (
                  <button
                    id="toolbar-add-detected-btn"
                    type="button"
                    onClick={() => setDetectedModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors shadow-2xs"
                    title="Review and add unmapped workers detected in attendance logs"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>{t.detectMissing} ({unmappedWorkers.length})</span>
                  </button>
                )}
                <button
                  id="add-employee-btn"
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs"
                >
                  <Plus className="h-4 w-4" /> {t.addEmployee}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                <th className="py-3 px-4 font-mono">{t.colId}</th>
                <th className="py-3 px-4">{t.colName}</th>
                <th className="py-3 px-4">{t.department}</th>
                <th className="py-3 px-4">{t.group}</th>
                <th className="py-3 px-4">{t.assignedSchedule}</th>
                <th className="py-3 px-4 text-center">{t.colStatus}</th>
                <th className="py-3 px-4 text-center">{t.shiftSatLabel}</th>
                <th className="py-3 px-4">{t.colStartDate}</th>
                {settings.activeRole !== 'Management' && (
                  <th className="py-3 px-4 text-right">{t.colActions}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((e) => {
                const sched = schedules.find((s) => s.id === e.scheduleId);
                return (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{e.id}</span>
                        <div className="relative inline-block">
                          <select
                            id={`worker-type-select-${e.id}`}
                            aria-label={`Change worker type for ${e.name}`}
                            disabled={settings.activeRole === 'Management'}
                            value={isStockWorkerRecord(e) ? 'Stock' : 'Admin'}
                            onChange={(ev) => handleQuickChangeWorkerType(e, ev.target.value as 'Admin' | 'Stock')}
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-all outline-none appearance-none pr-5 ${
                              isStockWorkerRecord(e)
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 focus:ring-1 focus:ring-indigo-400'
                                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 focus:ring-1 focus:ring-slate-400'
                            } ${settings.activeRole === 'Management' ? 'cursor-default pointer-events-none opacity-80' : ''}`}
                            title="Changer le type d'employé: Admin ou Stock"
                          >
                            <option value="Admin">🏢 {t.adminRoleBadge}</option>
                            <option value="Stock">📦 {t.stockRoleBadge}</option>
                          </select>
                          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-400">
                            ▼
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {e.name}
                      {e.notes && (
                        <span className="block text-[11px] font-normal text-slate-400">
                          {e.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{e.companyDepartment}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{e.groupName}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {sched ? sched.name : e.scheduleId}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {e.isArchived || e.status === 'Archived' ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200"
                          title={t.archiveStatusExpl}
                        >
                          <Archive className="h-3 w-3 text-amber-600" />
                          {t.archived}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            e.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {e.status === 'Active' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {e.status === 'Active' ? t.active : t.inactive}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(() => {
                        const isStockEmp = isStockWorkerRecord(e);
                        const satShiftTime = isStockEmp ? '10:00–17:00' : '08:30–17:00';
                        return (
                          <button
                            type="button"
                            disabled={settings.activeRole === 'Management'}
                            onClick={() => {
                              onUpdateEmployee({
                                ...e,
                                hasSaturdayShift: !e.hasSaturdayShift,
                              });
                            }}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all border ${
                              e.hasSaturdayShift
                                ? 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100 shadow-2xs'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                            } ${settings.activeRole === 'Management' ? 'cursor-default' : 'cursor-pointer'}`}
                            title={e.hasSaturdayShift ? `${t.saturdayActive} (${satShiftTime})` : t.saturdayOff}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${e.hasSaturdayShift ? 'bg-teal-500' : 'bg-slate-300'}`} />
                            {e.hasSaturdayShift ? satShiftTime : 'OFF'}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{e.startDate || '-'}</td>
                    {settings.activeRole !== 'Management' && (
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        {onOpenVacationForEmployee && (
                          <button
                            onClick={() => onOpenVacationForEmployee(e.id)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors font-medium text-xs"
                            title={`${t.btnPlanVacation}: ${e.name}`}
                          >
                            <Palmtree className="h-3.5 w-3.5 text-teal-600" /> {t.btnVacation}
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(e)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors font-medium text-xs"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> {t.editEmployee}
                        </button>
                        {e.isArchived || e.status === 'Archived' ? (
                          <button
                            onClick={() => handleUnarchiveEmployee(e)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors font-semibold text-xs"
                            title={t.unarchiveEmployee}
                          >
                            <ArchiveRestore className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{t.unarchiveEmployee}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchiveEmployee(e)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-slate-500 hover:text-amber-800 hover:bg-amber-50 transition-colors font-medium text-xs"
                            title={t.archiveEmployee}
                          >
                            <Archive className="h-3.5 w-3.5 text-amber-600" />
                            <span>{t.archiveEmployee}</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          id="employee-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div
            id="employee-form-card"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingEmp ? t.editEmployee : t.addEmployee}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.colId} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingEmp)}
                    placeholder="e.g. 0004 or 00022236"
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-slate-800 disabled:bg-slate-100 outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400">Stored as text (preserves leading zeros)</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.workerType} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="modal-worker-type-dropdown"
                    value={workerType}
                    onChange={(e) => handleWorkerTypeChange(e.target.value as 'Admin' | 'Stock')}
                    className="w-full rounded-lg border-2 border-indigo-300 bg-indigo-50/60 px-2.5 py-1.5 font-bold text-indigo-950 outline-none focus:border-indigo-600 focus:bg-white cursor-pointer transition-colors"
                  >
                    <option value="Admin">🏢 {t.adminRoleBadge} ({t.adminWorker})</option>
                    <option value="Stock">📦 {t.stockRoleBadge} ({t.stockWorker})</option>
                  </select>
                  <span className="text-[10px] text-indigo-600 font-medium">
                    {workerType === 'Stock' ? 'Shifts dynamiques 1–4' : 'Horaire fixe 08:30–17:00'}
                  </span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.colStatus}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => {
                      const newStatus = e.target.value as 'Active' | 'Inactive' | 'Archived';
                      setStatus(newStatus);
                      setIsArchived(newStatus === 'Archived');
                    }}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="Active">{t.active}</option>
                    <option value="Inactive">{t.inactive}</option>
                    <option value="Archived">{t.archived} ({t.archivedExcludedBadge})</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t.fullName} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BENSALAH ROMAISSA"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.department}
                  </label>
                  <input
                    type="text"
                    value={companyDept}
                    onChange={(e) => setCompanyDept(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.group}
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>{t.assignedSchedule} <span className="text-rose-500">*</span></span>
                  {scheduleId === 'no_shift' && (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5">
                      ⚡ Calcul direct Entrée - Sortie
                    </span>
                  )}
                </label>
                <select
                  value={scheduleId}
                  onChange={(e) => setScheduleId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id === 'no_shift' ? '⚡ ' : ''}{s.name}
                      {s.id !== 'no_shift' ? ` (${s.startTime} - ${s.endTime}${s.crossesMidnight ? ' next day' : ''})` : ''}
                    </option>
                  ))}
                </select>
                {scheduleId === 'no_shift' && (
                  <div className="mt-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 p-2.5 text-xs text-indigo-900 leading-relaxed">
                    <p className="font-bold flex items-center gap-1.5 text-indigo-950">
                      <span>⚡</span> Option Sans Shift (Calcul Normal) :
                    </p>
                    <p className="text-[11px] text-indigo-800 mt-0.5">
                      Cet employé ne suit aucun shift fixe. Ses heures de travail sont calculées normalement entre son pointage d'entrée et son pointage de sortie, sans aucune pénalité de retard ou de sortie anticipée.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t.colStartDate}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="Shift notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Saturday Shift Toggle */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasSaturdayShift}
                    onChange={(e) => setHasSaturdayShift(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  {(() => {
                    const isStockEmp = workerType === 'Stock';
                    const satSched = schedules.find((s) => s.id === (isStockEmp ? 'stock_sat' : 'admin_sat'));
                    const startT = satSched?.startTime || (isStockEmp ? '10:00' : '09:00');
                    const endT = satSched?.endTime || '17:00';
                    const hasB = satSched ? satSched.hasBreak : true;
                    const breakInfo = hasB && satSched?.breakStart && satSched?.breakEnd
                      ? `, Pause ${satSched.breakStart}–${satSched.breakEnd}`
                      : '';
                    const otInfo = satSched?.overtimeAllowed && satSched?.overtimeStartTime
                      ? `, HS > ${satSched.overtimeStartTime}`
                      : (isStockEmp ? '' : ', Sans HS');
                    return (
                      <div className="text-xs">
                        <span className="font-bold text-teal-950 flex items-center gap-1.5">
                          <span>📅</span> {t.hasSaturdayShift}
                          <span className="ml-1 text-[11px] font-semibold text-teal-700 bg-teal-100/80 rounded px-1.5 py-0.5">
                            {startT}–{endT}
                          </span>
                        </span>
                        <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                          {isStockEmp ? 'Stock' : 'Administration'} : Shift Samedi ({startT} – {endT}{breakInfo}{otInfo})
                        </p>
                      </div>
                    );
                  })()}
                </label>
              </div>

              {/* Eligible for Overtime Toggle */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eligibleForOvertime}
                    onChange={(e) => setEligibleForOvertime(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                      <span>⏱️</span> {t.eligibleForOvertimeLabel}
                      <span className={`text-[10px] font-bold rounded px-1.5 py-0.2 ${
                        eligibleForOvertime ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {eligibleForOvertime ? t.eligibleForOvertimeActive : t.eligibleForOvertimeInactive}
                      </span>
                    </span>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                      {t.eligibleForOvertimeDesc}
                    </p>
                  </div>
                </label>
              </div>

              {/* Archive Toggle / Status */}
              <div className={`rounded-xl border p-3 transition-colors ${
                isArchived || status === 'Archived'
                  ? 'border-amber-300 bg-amber-50/80 shadow-2xs'
                  : 'border-slate-200 bg-slate-50/60'
              }`}>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isArchived || status === 'Archived'}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsArchived(checked);
                      if (checked) {
                        setStatus('Archived');
                      } else if (status === 'Archived') {
                        setStatus('Active');
                      }
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Archive className="h-3.5 w-3.5 text-amber-600" />
                      {t.archiveEmployee}
                      {(isArchived || status === 'Archived') && (
                        <span className="rounded bg-amber-200/80 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                          {t.archivedExcludedBadge}
                        </span>
                      )}
                    </span>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                      {t.archiveStatusExpl}
                    </p>
                  </div>
                </label>
              </div>

              {formError && (
                <p className="text-xs text-rose-600 font-medium">{formError}</p>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg px-4 py-1.5 text-slate-600 hover:bg-slate-100"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 font-bold text-white hover:bg-indigo-700"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Detected Workers Modal */}
      <AddDetectedWorkersModal
        isOpen={detectedModalOpen}
        onClose={() => setDetectedModalOpen(false)}
        unmappedWorkers={unmappedWorkers}
        schedules={schedules}
        onAddWorkers={handleAddBatchFromModal}
        totalSavedCount={employees.length}
        totalDetectedCount={rawEmployeesFromDataset?.length || (employees.length + unmappedWorkers.length)}
      />

      {/* Import Employees Modal */}
      <ImportEmployeesModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        existingEmployees={employees}
        schedules={schedules}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};
