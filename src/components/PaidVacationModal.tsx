import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Palmtree,
  Calendar,
  CalendarDays,
  User,
  CheckCircle2,
  Trash2,
  Plus,
  Search,
  Clock,
  Briefcase,
  AlertCircle,
  HelpCircle,
  FileText,
  CalendarRange,
} from 'lucide-react';
import { Employee, WorkSchedule, PaidVacation, TimeAuthorization } from '../types';
import { getDayOfWeekFromDate } from '../utils/schedules';

interface PaidVacationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  schedules: WorkSchedule[];
  paidVacations: PaidVacation[];
  onSaveVacation: (vacation: PaidVacation) => void;
  onDeleteVacation: (vacationId: string) => void;
  timeAuthorizations?: TimeAuthorization[];
  onSaveTimeAuthorization?: (auth: TimeAuthorization) => void;
  onDeleteTimeAuthorization?: (authId: string) => void;
  preSelectedEmployee?: Employee | null;
  preSelectedDate?: string;
  currentUserRole?: string;
}

const COMMON_REASONS = [
  'Congé annuel / Annual Leave',
  'Congé exceptionnel',
  'Congé de maladie payé',
  'Événement familial / Mariage',
  'Récupération d’heures',
  'Maternité / Paternité',
];

export const PaidVacationModal: React.FC<PaidVacationModalProps> = ({
  isOpen,
  onClose,
  employees,
  schedules,
  paidVacations,
  onSaveVacation,
  onDeleteVacation,
  timeAuthorizations = [],
  onSaveTimeAuthorization,
  onDeleteTimeAuthorization,
  preSelectedEmployee,
  preSelectedDate,
  currentUserRole = 'Administrator',
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'authorizations'>('create');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [empSearch, setEmpSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reason, setReason] = useState<string>('Congé annuel / Annual Leave');
  const [editingVacationId, setEditingVacationId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [listSearch, setListSearch] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Time Authorization (Dispensation for maternity, distance, etc.) State
  const [authEmpId, setAuthEmpId] = useState<string>('');
  const [authStartDate, setAuthStartDate] = useState<string>('');
  const [authEndDate, setAuthEndDate] = useState<string>('');
  const [authType, setAuthType] = useState<'early_exit' | 'late_arrival' | 'both'>('early_exit');
  const [authLateMinutes, setAuthLateMinutes] = useState<number>(60);
  const [authEarlyMinutes, setAuthEarlyMinutes] = useState<number>(60);
  const [authReason, setAuthReason] = useState<string>("Maternité / Allaitement (Sortie 1h)");
  const [authNotes, setAuthNotes] = useState<string>('');
  const [editingAuthId, setEditingAuthId] = useState<string | null>(null);
  const [authSearch, setAuthSearch] = useState<string>('');
  const [confirmDeleteAuthId, setConfirmDeleteAuthId] = useState<string | null>(null);
  const [authFormOpen, setAuthFormOpen] = useState<boolean>(true);

  // Initialize preselection when modal opens
  useEffect(() => {
    if (isOpen) {
      if (preSelectedEmployee) {
        setSelectedEmpId(preSelectedEmployee.id);
      } else if (!selectedEmpId && employees.length > 0) {
        setSelectedEmpId(employees[0].id);
      }

      if (preSelectedDate) {
        setStartDate(preSelectedDate);
        setEndDate(preSelectedDate);
      } else if (!startDate) {
        const todayStr = new Date().toISOString().slice(0, 10);
        setStartDate(todayStr);
        setEndDate(todayStr);
      }
      setFormError('');
      setConfirmDeleteId(null);
    }
  }, [isOpen, preSelectedEmployee, preSelectedDate]);

  // Selected Employee object
  const currentEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmpId) || null;
  }, [employees, selectedEmpId]);

  // Selected Employee's Work Schedule
  const currentSchedule = useMemo(() => {
    if (!currentEmployee) return null;
    return schedules.find((s) => s.id === currentEmployee.scheduleId) || schedules[0] || null;
  }, [currentEmployee, schedules]);

  // Filtered employees for dropdown search
  const filteredEmployees = useMemo(() => {
    if (!empSearch.trim()) return employees;
    const term = empSearch.toLowerCase().trim();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.id.toLowerCase().includes(term) ||
        e.companyDepartment.toLowerCase().includes(term) ||
        e.groupName.toLowerCase().includes(term)
    );
  }, [employees, empSearch]);

  // Calculate day range metrics
  const rangeMetrics = useMemo(() => {
    if (!startDate || !endDate) {
      return { totalDays: 0, workDays: 0, paidHours: 0, isValid: false, message: 'Please select start and end dates.' };
    }

    if (startDate > endDate) {
      return { totalDays: 0, workDays: 0, paidHours: 0, isValid: false, message: 'Start date cannot be after end date.' };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const totalDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Count scheduled working days
    let workDays = 0;
    const workingDaysList = currentSchedule ? currentSchedule.workingDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const normalHoursPerDay = currentSchedule ? currentSchedule.normalWorkedHours : 7.0;

    const cur = new Date(start);
    while (cur <= end) {
      const yyyy = cur.getFullYear();
      const mm = String(cur.getMonth() + 1).padStart(2, '0');
      const dd = String(cur.getDate()).padStart(2, '0');
      const dayStr = `${yyyy}-${mm}-${dd}`;
      const dayName = getDayOfWeekFromDate(dayStr);
      if (workingDaysList.includes(dayName)) {
        workDays += 1;
      }
      cur.setDate(cur.getDate() + 1);
    }

    const paidHours = Math.round(workDays * normalHoursPerDay * 10) / 10;

    return {
      totalDays,
      workDays,
      paidHours,
      normalHoursPerDay,
      isValid: true,
      message: `${totalDays} calendar days (${workDays} working shifts credited = ${paidHours} paid hours)`,
    };
  }, [startDate, endDate, currentSchedule]);

  // Quick Preset Handlers
  const setQuickRange = (days: number) => {
    const baseDate = startDate ? new Date(startDate) : new Date();
    if (isNaN(baseDate.getTime())) return;
    const end = new Date(baseDate);
    end.setDate(baseDate.getDate() + (days - 1));

    const yyyy = end.getFullYear();
    const mm = String(end.getMonth() + 1).padStart(2, '0');
    const dd = String(end.getDate()).padStart(2, '0');
    setEndDate(`${yyyy}-${mm}-${dd}`);
  };

  // Submit Vacation
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      setFormError('Please select an employee.');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Please select both start and end dates.');
      return;
    }
    if (startDate > endDate) {
      setFormError('Start date must be before or equal to end date.');
      return;
    }

    const targetEmp = employees.find((e) => e.id === selectedEmpId);
    const empName = targetEmp ? targetEmp.name : selectedEmpId;

    const vacationPayload: PaidVacation = {
      id: editingVacationId || `vac_${selectedEmpId}_${startDate}_${endDate}_${Date.now()}`,
      employeeId: selectedEmpId,
      employeeName: empName,
      startDate,
      endDate,
      reason: reason.trim() || 'Congé annuel / Annual Leave',
      createdAt: new Date().toISOString(),
      createdBy: currentUserRole,
    };

    onSaveVacation(vacationPayload);
    setEditingVacationId(null);
    setFormError('');
    setActiveTab('list');
  };

  // Start Editing an existing vacation
  const startEdit = (vac: PaidVacation) => {
    setEditingVacationId(vac.id);
    setSelectedEmpId(vac.employeeId);
    setStartDate(vac.startDate);
    setEndDate(vac.endDate);
    setReason(vac.reason || 'Congé annuel / Annual Leave');
    setActiveTab('create');
  };

  // Cancel edit mode
  const cancelEdit = () => {
    setEditingVacationId(null);
    const todayStr = new Date().toISOString().slice(0, 10);
    setStartDate(todayStr);
    setEndDate(todayStr);
    setReason('Congé annuel / Annual Leave');
  };

  // Filtered recorded authorizations
  const filteredAuthorizations = useMemo(() => {
    let list = [...timeAuthorizations];
    if (authSearch.trim()) {
      const term = authSearch.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.employeeName.toLowerCase().includes(term) ||
          a.employeeId.toLowerCase().includes(term) ||
          (a.reason && a.reason.toLowerCase().includes(term))
      );
    }
    return list.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [timeAuthorizations, authSearch]);

  const handleSaveAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmpId) {
      setFormError('Veuillez sélectionner un travailleur.');
      return;
    }
    if (!authStartDate) {
      setFormError('Veuillez sélectionner une date de début.');
      return;
    }
    const targetEmp = employees.find((e) => e.id === authEmpId);
    if (!targetEmp) return;

    const newAuth: TimeAuthorization = {
      id: editingAuthId || `auth_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      employeeId: targetEmp.id,
      employeeName: targetEmp.name,
      startDate: authStartDate,
      endDate: authEndDate || authStartDate,
      type: authType,
      allowedLateArrivalMinutes:
        authType === 'late_arrival' || authType === 'both' ? authLateMinutes : undefined,
      allowedEarlyExitMinutes:
        authType === 'early_exit' || authType === 'both' ? authEarlyMinutes : undefined,
      reason: authReason.trim() || "Autorisation d'horaire",
      notes: authNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      createdBy: currentUserRole,
    };

    onSaveTimeAuthorization?.(newAuth);
    setEditingAuthId(null);
    setAuthNotes('');
    setFormError('');
  };

  const startEditAuth = (auth: TimeAuthorization) => {
    setEditingAuthId(auth.id);
    setAuthEmpId(auth.employeeId);
    setAuthStartDate(auth.startDate);
    setAuthEndDate(auth.endDate || auth.startDate);
    setAuthType(auth.type);
    if (auth.allowedLateArrivalMinutes) setAuthLateMinutes(auth.allowedLateArrivalMinutes);
    if (auth.allowedEarlyExitMinutes) setAuthEarlyMinutes(auth.allowedEarlyExitMinutes);
    setAuthReason(auth.reason);
    setAuthNotes(auth.notes || '');
    setAuthFormOpen(true);
    setActiveTab('authorizations');
  };

  const cancelEditAuth = () => {
    setEditingAuthId(null);
    setAuthNotes('');
    const todayStr = new Date().toISOString().slice(0, 10);
    setAuthStartDate(todayStr);
    setAuthEndDate(todayStr);
    setAuthReason("Maternité / Allaitement (Sortie 1h)");
  };

  // Filtered recorded vacations
  const filteredVacations = useMemo(() => {
    let list = [...paidVacations];
    if (listSearch.trim()) {
      const term = listSearch.toLowerCase().trim();
      list = list.filter(
        (v) =>
          v.employeeName.toLowerCase().includes(term) ||
          v.employeeId.toLowerCase().includes(term) ||
          (v.reason && v.reason.toLowerCase().includes(term))
      );
    }
    // Sort descending by startDate
    return list.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [paidVacations, listSearch]);

  if (!isOpen) return null;

  return (
    <div
      id="paid-vacation-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="paid-vacation-modal-content"
        className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
              <Palmtree className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Paid Vacation Management
                <span className="rounded-full bg-teal-100 text-teal-800 text-[10px] font-semibold px-2 py-0.5 border border-teal-200">
                  Congés Payés
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Grant approved paid leaves across custom date ranges. Automatically credits daily working hours without absences.
              </p>
            </div>
          </div>
          <button
            id="close-vacation-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            id="tab-vacation-create"
            onClick={() => setActiveTab('create')}
            className={`inline-flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold transition-colors ${
              activeTab === 'create'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            {editingVacationId ? 'Edit Vacation' : 'Assign Vacation Range'}
          </button>
          <button
            id="tab-vacation-list"
            onClick={() => setActiveTab('list')}
            className={`inline-flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold transition-colors ${
              activeTab === 'list'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Active & Scheduled Vacations
            {paidVacations.length > 0 && (
              <span className="rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold px-1.5 py-0.2">
                {paidVacations.length}
              </span>
            )}
          </button>
          <button
            id="tab-time-authorizations"
            onClick={() => {
              setActiveTab('authorizations');
              if (!authEmpId && employees.length > 0) {
                setAuthEmpId(employees[0].id);
              }
              if (!authStartDate) {
                const todayStr = new Date().toISOString().slice(0, 10);
                setAuthStartDate(todayStr);
                setAuthEndDate(todayStr);
              }
            }}
            className={`inline-flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold transition-colors ${
              activeTab === 'authorizations'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-indigo-600" />
            Autorisations d'Horaire (Dispensation)
            {timeAuthorizations.length > 0 && (
              <span className="rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.2">
                {timeAuthorizations.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'create' ? (
            <form onSubmit={handleSave} className="space-y-5">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Worker Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Select Worker / Employee</span>
                  {currentEmployee && (
                    <span className="text-[11px] font-normal text-slate-500">
                      Dept: <strong className="text-slate-700">{currentEmployee.companyDepartment}</strong> • Group: <strong className="text-slate-700">{currentEmployee.groupName}</strong>
                    </span>
                  )}
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <select
                      id="vacation-employee-select"
                      value={selectedEmpId}
                      onChange={(e) => setSelectedEmpId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    >
                      <option value="">-- Choose a worker --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.id}) - {emp.groupName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Search */}
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter employee list..."
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-teal-500"
                    />
                  </div>
                </div>

                {currentEmployee && currentSchedule && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-teal-50/70 border border-teal-100 px-3 py-1.5 text-xs text-teal-800">
                    <Clock className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                    <span>
                      Standard shift: <strong>{currentSchedule.name}</strong> (<strong>{currentSchedule.normalWorkedHours} hrs/day</strong> normal credited hours)
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Vacation Date Range Picker */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CalendarRange className="h-4 w-4 text-teal-600" />
                    Pick Vacation Date Range
                  </label>
                  <span className="text-[11px] text-slate-500">Both start and end dates are inclusive</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Start Date (First day of vacation)
                    </label>
                    <input
                      type="date"
                      id="vacation-start-date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (!endDate || endDate < e.target.value) {
                          setEndDate(e.target.value);
                        }
                      }}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      End Date (Last day of vacation)
                    </label>
                    <input
                      type="date"
                      id="vacation-end-date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                    Quick Range:
                  </span>
                  {[
                    { label: '3 Days', days: 3 },
                    { label: '5 Days', days: 5 },
                    { label: '1 Week (7d)', days: 7 },
                    { label: '10 Days', days: 10 },
                    { label: '2 Weeks (14d)', days: 14 },
                    { label: '3 Weeks (21d)', days: 21 },
                    { label: '1 Month (30d)', days: 30 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setQuickRange(preset.days)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors"
                    >
                      +{preset.label}
                    </button>
                  ))}
                </div>

                {/* Live Duration Calculation Box */}
                <div
                  className={`rounded-xl p-3 text-xs flex items-start gap-2.5 transition-all ${
                    rangeMetrics.isValid
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border border-amber-200 text-amber-900'
                  }`}
                >
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 mt-0.5 ${
                      rangeMetrics.isValid ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  />
                  <div>
                    <div className="font-bold">
                      {rangeMetrics.isValid ? 'Approved Vacation Impact:' : 'Invalid Range:'}
                    </div>
                    <div className="text-[11px] mt-0.5">{rangeMetrics.message}</div>
                    {rangeMetrics.isValid && (
                      <div className="text-[10px] text-emerald-700/80 mt-1">
                        • Scheduled working days will be recorded as <strong>'Congé payé'</strong> with normal hours ({rangeMetrics.normalHoursPerDay}h/day).
                        <br />
                        • Standard weekend/OFF days during this period remain categorized as <strong>'OFF (Congé)'</strong>.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Reason & Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Vacation Reason & Category</span>
                  <span className="text-[11px] font-normal text-slate-400">Printed in daily reports & summary</span>
                </label>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                        reason === r
                          ? 'bg-teal-600 text-white shadow-2xs font-semibold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  id="vacation-reason-input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Congé annuel / Annual Leave"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {editingVacationId ? (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel Edit
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    id="save-vacation-btn"
                    disabled={!rangeMetrics.isValid}
                    className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-md transition-all ${
                      rangeMetrics.isValid
                        ? 'bg-teal-600 hover:bg-teal-700 active:scale-98 ring-2 ring-teal-600/30'
                        : 'bg-slate-300 cursor-not-allowed text-slate-500'
                    }`}
                  >
                    {editingVacationId ? 'Update Vacation' : 'Save & Credit Vacation'}
                  </button>
                </div>
              </div>
            </form>
          ) : activeTab === 'list' ? (
            /* Active & Recorded Vacations List */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search vacations by employee or reason..."
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-teal-500"
                  />
                </div>

                <button
                  onClick={() => {
                    cancelEdit();
                    setActiveTab('create');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-teal-700 transition-colors self-start sm:self-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add New Vacation
                </button>
              </div>

              {filteredVacations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                  <Palmtree className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-slate-700">No vacations recorded yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Add a vacation range for any worker to mark their time as paid leave and credit full normal hours.
                  </p>
                  <button
                    onClick={() => {
                      cancelEdit();
                      setActiveTab('create');
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Record First Vacation
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-600 font-semibold">
                          <th className="py-2.5 px-3">Employee</th>
                          <th className="py-2.5 px-3">Date Range</th>
                          <th className="py-2.5 px-3 text-center">Duration</th>
                          <th className="py-2.5 px-3">Reason</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredVacations.map((vac) => {
                          const startParts = vac.startDate.split('-');
                          const endParts = vac.endDate.split('-');
                          const fmtStart = `${startParts[2]}/${startParts[1]}/${startParts[0]}`;
                          const fmtEnd = `${endParts[2]}/${endParts[1]}/${endParts[0]}`;

                          const s = new Date(vac.startDate);
                          const e = new Date(vac.endDate);
                          const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                          return (
                            <tr key={vac.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="font-semibold text-slate-900 block">
                                  {vac.employeeName}
                                </span>
                                <span className="font-mono text-[10px] text-slate-500">
                                  ID: {vac.employeeId}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-medium text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {fmtStart}
                                  </span>
                                  <span className="text-slate-400">→</span>
                                  <span className="font-mono font-medium text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {fmtEnd}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700 border border-teal-200">
                                  {days} day{days > 1 ? 's' : ''}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                <span className="inline-flex items-center gap-1 text-slate-700">
                                  {vac.reason || 'Congé payé'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                {confirmDeleteId === vac.id ? (
                                  <div className="inline-flex items-center gap-1">
                                    <span className="text-[10px] text-rose-600 font-semibold mr-1">
                                      Confirm?
                                    </span>
                                    <button
                                      onClick={() => {
                                        onDeleteVacation(vac.id);
                                        setConfirmDeleteId(null);
                                      }}
                                      className="rounded bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-rose-700 transition-colors"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="rounded bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-300 transition-colors"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      onClick={() => startEdit(vac)}
                                      className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-teal-700 transition-colors"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(vac.id)}
                                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                      title="Delete vacation record"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Time Authorizations / Dispensation View (Maternity, Distance, etc.) */
            <div className="space-y-5">
              {/* Informative Banner */}
              <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3.5 text-xs text-indigo-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-indigo-950">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  <span>Autorisation d'Horaire Personnalisée (Sortie anticipée ou Arrivée tardive)</span>
                </div>
                <p className="text-[11px] text-indigo-850 leading-relaxed">
                  Pour les employées venant d'accoucher (maternité / allaitement), les travailleurs habitant loin ou toute situation particulière, accordez une durée personnalisée autorisée (ex: 1 heure ou 2 heures).
                  <strong> Lors du calcul de l'assiduité, le retard ignore automatiquement cette durée autorisée</strong> et celle-ci est comptabilisée dans les heures travaillées normales.
                </p>
              </div>

              {/* Form Section */}
              <div className="rounded-2xl border border-indigo-100 bg-slate-50/50 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px]">
                      {editingAuthId ? '✎' : '+'}
                    </span>
                    {editingAuthId ? "Modifier l'Autorisation" : "Créer une Nouvelle Autorisation d'Horaire"}
                  </h3>
                  {editingAuthId && (
                    <button
                      type="button"
                      onClick={cancelEditAuth}
                      className="text-[11px] text-rose-600 hover:underline"
                    >
                      Annuler la modification
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveAuth} className="space-y-4">
                  {/* Worker & Date Range Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Travailleur / Employé <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="auth-worker-select"
                        value={authEmpId}
                        onChange={(e) => setAuthEmpId(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">-- Choisir un travailleur --</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.id}) - {emp.companyDepartment}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Date de début <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="auth-start-date"
                        value={authStartDate}
                        onChange={(e) => setAuthStartDate(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Date de fin <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (authStartDate) {
                                const d = new Date(authStartDate);
                                d.setMonth(d.getMonth() + 1);
                                setAuthEndDate(d.toISOString().slice(0, 10));
                              }
                            }}
                            className="text-[10px] text-indigo-600 hover:underline"
                            title="Ajouter 1 mois"
                          >
                            +1 Mois
                          </button>
                          <span className="text-[10px] text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (authStartDate) {
                                const d = new Date(authStartDate);
                                d.setMonth(d.getMonth() + 3);
                                setAuthEndDate(d.toISOString().slice(0, 10));
                              }
                            }}
                            className="text-[10px] text-indigo-600 hover:underline"
                            title="Ajouter 3 mois (congé maternité)"
                          >
                            +3 Mois
                          </button>
                        </div>
                      </div>
                      <input
                        type="date"
                        id="auth-end-date"
                        value={authEndDate}
                        onChange={(e) => setAuthEndDate(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Dispensation Type Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Type de Dispensation d'Horaire
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAuthType('early_exit')}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          authType === 'early_exit'
                            ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/20 text-indigo-950 font-bold shadow-2xs'
                            : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>🚪 Sortie Anticipée</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                          Autorisé à partir plus tôt avant la fin du shift
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAuthType('late_arrival')}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          authType === 'late_arrival'
                            ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/20 text-indigo-950 font-bold shadow-2xs'
                            : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>🌅 Arrivée Tardive</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                          Autorisé à arriver plus tard le matin
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAuthType('both')}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          authType === 'both'
                            ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/20 text-indigo-950 font-bold shadow-2xs'
                            : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>🔄 Les Deux</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                          Arrivée tardive ET sortie anticipée
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Allowed Time Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    {(authType === 'early_exit' || authType === 'both') && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-800">
                            Durée sortie anticipée autorisée :
                          </label>
                          <span className="font-mono text-xs font-bold text-indigo-600">
                            {authEarlyMinutes} min ({Math.floor(authEarlyMinutes / 60)}h{authEarlyMinutes % 60 ? (authEarlyMinutes % 60) + 'm' : ''})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {[30, 60, 90, 120].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setAuthEarlyMinutes(mins)}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                                authEarlyMinutes === mins
                                  ? 'bg-indigo-600 text-white font-bold'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {mins >= 60 ? `${mins / 60} heure${mins > 60 ? 's' : ''}` : `${mins} min`}
                            </button>
                          ))}
                        </div>
                        <input
                          type="number"
                          min={5}
                          max={300}
                          step={5}
                          value={authEarlyMinutes}
                          onChange={(e) => setAuthEarlyMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-mono"
                          placeholder="Minutes personnalisées (ex: 60)"
                        />
                      </div>
                    )}

                    {(authType === 'late_arrival' || authType === 'both') && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-800">
                            Durée arrivée tardive autorisée :
                          </label>
                          <span className="font-mono text-xs font-bold text-indigo-600">
                            {authLateMinutes} min ({Math.floor(authLateMinutes / 60)}h{authLateMinutes % 60 ? (authLateMinutes % 60) + 'm' : ''})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {[30, 60, 90, 120].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setAuthLateMinutes(mins)}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                                authLateMinutes === mins
                                  ? 'bg-indigo-600 text-white font-bold'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {mins >= 60 ? `${mins / 60} heure${mins > 60 ? 's' : ''}` : `${mins} min`}
                            </button>
                          ))}
                        </div>
                        <input
                          type="number"
                          min={5}
                          max={300}
                          step={5}
                          value={authLateMinutes}
                          onChange={(e) => setAuthLateMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-mono"
                          placeholder="Minutes personnalisées (ex: 60)"
                        />
                      </div>
                    )}
                  </div>

                  {/* Reason & Situation */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Motif / Justification <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        "Maternité / Allaitement (Sortie 1h)",
                        "Maternité (Sortie 2h)",
                        "Éloignement géographique / Transport",
                        "Situation familiale particulière",
                        "Raison médicale / Santé",
                        "Autorisation spéciale direction",
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAuthReason(preset)}
                          className={`rounded-lg px-2 py-0.5 text-[11px] transition-colors ${
                            authReason === preset
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      id="auth-reason-input"
                      value={authReason}
                      onChange={(e) => setAuthReason(e.target.value)}
                      placeholder="e.g. Maternité / Heure d'allaitement"
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  {/* Submit buttons */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    {editingAuthId && (
                      <button
                        type="button"
                        onClick={cancelEditAuth}
                        className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Annuler
                      </button>
                    )}
                    <button
                      type="submit"
                      id="save-auth-btn"
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-bold text-white shadow-md transition-colors"
                    >
                      {editingAuthId ? "Mettre à jour l'Autorisation" : "Enregistrer l'Autorisation"}
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Registered Time Authorizations */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Autorisations Actives ({timeAuthorizations.length})</span>
                  </h4>
                  {timeAuthorizations.length > 3 && (
                    <div className="relative max-w-xs">
                      <Search className="h-3 w-3 absolute left-2.5 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        value={authSearch}
                        onChange={(e) => setAuthSearch(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white pl-7 pr-2.5 py-1 text-xs text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {filteredAuthorizations.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-white">
                    <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">Aucune autorisation d'horaire enregistrée</p>
                    <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-0.5">
                      Utilisez le formulaire ci-dessus pour accorder à un travailleur une dispense de retard à l'entrée ou une sortie anticipée (maternité, transport, etc.).
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Employé</th>
                            <th className="py-2.5 px-3">Période de Validité</th>
                            <th className="py-2.5 px-3">Type & Durée Autorisée</th>
                            <th className="py-2.5 px-3">Motif</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredAuthorizations.map((auth) => (
                            <tr key={auth.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-medium text-slate-900">
                                <div className="font-semibold text-slate-900">{auth.employeeName}</div>
                                <div className="text-[10px] font-mono text-slate-400">ID: {auth.employeeId}</div>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                                <div className="font-mono text-[11px]">
                                  {auth.startDate} <span className="text-slate-400">→</span> {auth.endDate}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  {(auth.type === 'early_exit' || auth.type === 'both') && auth.allowedEarlyExitMinutes && (
                                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                      🚪 Sortie: {Math.floor(auth.allowedEarlyExitMinutes / 60)}h{auth.allowedEarlyExitMinutes % 60 ? `${auth.allowedEarlyExitMinutes % 60}m` : ''} (-{auth.allowedEarlyExitMinutes}m)
                                    </span>
                                  )}
                                  {(auth.type === 'late_arrival' || auth.type === 'both') && auth.allowedLateArrivalMinutes && (
                                    <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-200">
                                      🌅 Arrivée: {Math.floor(auth.allowedLateArrivalMinutes / 60)}h{auth.allowedLateArrivalMinutes % 60 ? `${auth.allowedLateArrivalMinutes % 60}m` : ''} (+{auth.allowedLateArrivalMinutes}m)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                <span className="text-[11px] text-slate-800 font-medium">{auth.reason}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                {confirmDeleteAuthId === auth.id ? (
                                  <div className="inline-flex items-center gap-1">
                                    <span className="text-[10px] text-rose-600 font-semibold mr-1">
                                      Supprimer ?
                                    </span>
                                    <button
                                      onClick={() => {
                                        onDeleteTimeAuthorization?.(auth.id);
                                        setConfirmDeleteAuthId(null);
                                      }}
                                      className="rounded bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-rose-700 transition-colors"
                                    >
                                      Oui
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteAuthId(null)}
                                      className="rounded bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-300 transition-colors"
                                    >
                                      Non
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      onClick={() => startEditAuth(auth)}
                                      className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-indigo-700 transition-colors"
                                    >
                                      Modifier
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteAuthId(auth.id)}
                                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                      title="Supprimer l'autorisation"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info banner */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-3 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Paid vacations automatically feed into <strong>Daily Attendance</strong>, <strong>Monthly Summaries</strong>, and <strong>PDF/Excel exports</strong>.
            </span>
          </div>
          <span className="font-mono text-slate-400">
            {paidVacations.length} Record{paidVacations.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};
