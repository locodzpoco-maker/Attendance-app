import React, { useState, useMemo } from 'react';
import { Employee, WorkSchedule, AppSettings, RawEmployeeRecord } from '../types';
import { isStockWorker, isAdminWorker, findUnmappedEmployees, createEmployeeFromDetected } from '../utils/employees';
import { Users, Plus, Edit2, Search, CheckCircle, XCircle, ShieldAlert, UserPlus, Sparkles, Zap, Check } from 'lucide-react';
import { AddDetectedWorkersModal } from './AddDetectedWorkersModal';

interface EmployeesViewProps {
  employees: Employee[];
  schedules: WorkSchedule[];
  onAddEmployee: (emp: Employee) => void;
  onAddBatchEmployees?: (newEmployees: Employee[]) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onResetDefaults?: () => void;
  settings: AppSettings;
  rawEmployeesFromDataset?: RawEmployeeRecord[];
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  schedules,
  onAddEmployee,
  onAddBatchEmployees,
  onUpdateEmployee,
  onResetDefaults,
  settings,
  rawEmployeesFromDataset,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'STOCK' | 'ADMIN'>('ALL');
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
    setToastMessage(`Successfully added all ${newEmployees.length} detected workers to Employee Mapping!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAddBatchFromModal = (newEmps: Employee[]) => {
    if (!onAddBatchEmployees) return;
    onAddBatchEmployees(newEmps);
    setToastMessage(`Successfully added ${newEmps.length} worker${newEmps.length > 1 ? 's' : ''} to Employee Mapping!`);
    setTimeout(() => setToastMessage(null), 4000);
  };


  // Form states
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [companyDept, setCompanyDept] = useState('Stock & Logistique');
  const [groupName, setGroupName] = useState('Stock Group 1');
  const [scheduleId, setScheduleId] = useState('stock_g1');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingEmp(null);
    setEmpId('');
    setName('');
    setCompanyDept('Stock & Logistique');
    setGroupName('Stock Group 1');
    setScheduleId(schedules[0]?.id || 'stock_g1');
    setStatus('Active');
    setStartDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpId(emp.id);
    setName(emp.name);
    setCompanyDept(emp.companyDepartment);
    setGroupName(emp.groupName);
    setScheduleId(emp.scheduleId);
    setStatus(emp.status);
    setStartDate(emp.startDate);
    setNotes(emp.notes || '');
    setFormError('');
    setModalOpen(true);
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

    const payload: Employee = {
      id: empId.trim(),
      name: name.trim(),
      companyDepartment: companyDept.trim(),
      groupName: groupName.trim(),
      scheduleId,
      status,
      startDate,
      notes: notes.trim() || undefined,
    };

    if (editingEmp) {
      onUpdateEmployee(payload);
    } else {
      onAddEmployee(payload);
    }
    setModalOpen(false);
  };

  const stockCount = employees.filter((e) => isStockWorker(e.id) || e.companyDepartment.toLowerCase().includes("stock")).length;
  const adminCount = employees.length - stockCount;

  const filteredEmployees = employees.filter((e) => {
    const isStock = isStockWorker(e.id) || e.companyDepartment.toLowerCase().includes("stock");
    if (categoryFilter === "STOCK" && !isStock) return false;
    if (categoryFilter === "ADMIN" && isStock) return false;

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
                  {unmappedWorkers.length} Unmapped Workers Detected in Attendance File
                </h4>
                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-bold text-amber-900 font-mono">
                  {rawEmployeesFromDataset?.length || 0} in file vs {employees.length} saved
                </span>
              </div>
              <p className="text-xs text-amber-800/90 mt-0.5 max-w-2xl">
                The imported raw attendance file contains <strong>{rawEmployeesFromDataset?.length || (employees.length + unmappedWorkers.length)}</strong> workers, but only <strong>{employees.length}</strong> are saved in your Employee Mapping. You can add the remaining <strong>{unmappedWorkers.length}</strong> workers with their auto-detected shifts.
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
              Quick Add All ({unmappedWorkers.length})
            </button>

            <button
              id="review-add-unmapped-btn"
              type="button"
              onClick={() => setDetectedModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white transition-colors shadow-2xs"
              title="Review, customize departments/schedules, and add selected workers"
            >
              <UserPlus className="h-4 w-4" />
              Review & Add ({unmappedWorkers.length})
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
                placeholder="Search ID (e.g. 00039) or Name..."
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
                All ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("STOCK")}
                className={`rounded-lg px-2.5 py-1 transition-all ${categoryFilter === "STOCK" ? "bg-indigo-600 text-white shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
              >
                Stock Workers ({stockCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("ADMIN")}
                className={`rounded-lg px-2.5 py-1 transition-all ${categoryFilter === "ADMIN" ? "bg-slate-800 text-white shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
              >
                Admin Workers ({adminCount})
              </button>
            </div>
          </div>

          {settings.activeRole !== 'Management' && (
            <div className="flex items-center gap-2">
              {unmappedWorkers.length > 0 && (
                <button
                  id="toolbar-add-detected-btn"
                  type="button"
                  onClick={() => setDetectedModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors shadow-2xs"
                  title="Review and add unmapped workers detected in attendance logs"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add Detected ({unmappedWorkers.length})</span>
                </button>
              )}
              <button
                id="add-employee-btn"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs"
              >
                <Plus className="h-4 w-4" /> Add Employee
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                <th className="py-3 px-4 font-mono">Employee ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Group</th>
                <th className="py-3 px-4">Assigned Schedule</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Start Date</th>
                {settings.activeRole !== 'Management' && (
                  <th className="py-3 px-4 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((e) => {
                const sched = schedules.find((s) => s.id === e.scheduleId);
                return (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {e.id}
                      {isStockWorker(e.id) ? (
                        <span className="ml-2 inline-flex items-center rounded-sm bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                          STOCK
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                          ADMIN
                        </span>
                      )}
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
                        {e.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{e.startDate || '-'}</td>
                    {settings.activeRole !== 'Management' && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(e)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors font-medium"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </button>
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
                {editingEmp ? 'Edit Employee' : 'Add New Employee'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Employee ID <span className="text-rose-500">*</span>
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
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
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
                    Company Department
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
                    Group Name
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Assigned Work Schedule <span className="text-rose-500">*</span>
                </label>
                <select
                  value={scheduleId}
                  onChange={(e) => setScheduleId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-800 outline-none focus:border-indigo-500"
                >
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime}
                      {s.crossesMidnight ? ' next day' : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
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

              {formError && (
                <p className="text-xs text-rose-600 font-medium">{formError}</p>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg px-4 py-1.5 text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 font-bold text-white hover:bg-indigo-700"
                >
                  Save Employee
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
    </div>
  );
};
