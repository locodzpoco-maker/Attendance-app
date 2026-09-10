import React, { useState, useMemo, useEffect } from 'react';
import { DailyAttendanceRecord } from '../types';
import {
  Zap,
  Clock,
  User,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Check,
  X,
  Plus,
  Trash2,
  CalendarRange,
} from 'lucide-react';
import { formatMinutesToHoursAndMinutes } from '../utils/schedules';

export interface InjectSuppHoursParams {
  employeeIds: string[];
  dates: string[];
  suppMinutesToAdd: number;
  mode: 'add' | 'set' | 'clear';
  reason: string;
  auditor: string;
}

interface InjectSuppHoursModalProps {
  isOpen: boolean;
  initialRecord: DailyAttendanceRecord | null;
  allDailyRecords: DailyAttendanceRecord[];
  onClose: () => void;
  onInjectSupp: (params: InjectSuppHoursParams) => void;
  currentUser: string;
}

export const InjectSuppHoursModal: React.FC<InjectSuppHoursModalProps> = ({
  isOpen,
  initialRecord,
  allDailyRecords,
  onClose,
  onInjectSupp,
  currentUser,
}) => {
  if (!isOpen) return null;

  // Extract unique sorted list of employees from daily records
  const employeeList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; department: string; group: string }>();
    allDailyRecords.forEach((r) => {
      if (!map.has(r.employeeId)) {
        map.set(r.employeeId, {
          id: r.employeeId,
          name: r.employeeName,
          department: r.companyDepartment,
          group: r.groupName,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [allDailyRecords]);

  // Extract unique sorted list of dates
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    allDailyRecords.forEach((r) => {
      if (r.date) set.add(r.date);
    });
    return Array.from(set).sort();
  }, [allDailyRecords]);

  // State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    initialRecord ? initialRecord.employeeId : employeeList[0]?.id || ''
  );
  const [dateMode, setDateMode] = useState<'single' | 'range' | 'all'>('single');
  const [selectedDate, setSelectedDate] = useState<string>(
    initialRecord ? initialRecord.date : availableDates[0] || ''
  );
  const [startDate, setStartDate] = useState<string>(
    initialRecord ? initialRecord.date : availableDates[0] || ''
  );
  const [endDate, setEndDate] = useState<string>(
    initialRecord ? initialRecord.date : availableDates[availableDates.length - 1] || ''
  );

  // Supp hours inputs
  const [hoursInput, setHoursInput] = useState<number>(1);
  const [minutesInput, setMinutesInput] = useState<number>(0);
  const [mode, setMode] = useState<'add' | 'set' | 'clear'>('add');
  const [reason, setReason] = useState<string>('');
  const [auditor, setAuditor] = useState<string>(currentUser || 'Supervisor');
  const [error, setError] = useState<string>('');

  // When initialRecord changes, reset target
  useEffect(() => {
    if (initialRecord) {
      setSelectedEmployeeId(initialRecord.employeeId);
      setSelectedDate(initialRecord.date);
      setDateMode('single');
      // If already has injected supp minutes, default to that or 1h
      if (initialRecord.injectedSuppMinutes && initialRecord.injectedSuppMinutes > 0) {
        setHoursInput(Math.floor(initialRecord.injectedSuppMinutes / 60));
        setMinutesInput(initialRecord.injectedSuppMinutes % 60);
      } else {
        setHoursInput(1);
        setMinutesInput(0);
      }
    }
  }, [initialRecord]);

  // Selected employee metadata
  const selectedEmp = useMemo(() => {
    return employeeList.find((e) => e.id === selectedEmployeeId);
  }, [employeeList, selectedEmployeeId]);

  // Total minutes to inject per day
  const totalMinutesToInject = hoursInput * 60 + minutesInput;

  // Compute targeted dates
  const targetedDates = useMemo(() => {
    if (dateMode === 'single') {
      return selectedDate ? [selectedDate] : [];
    }
    if (dateMode === 'range') {
      const from = startDate <= endDate ? startDate : endDate;
      const to = startDate <= endDate ? endDate : startDate;
      return availableDates.filter((d) => d >= from && d <= to);
    }
    // all
    return availableDates;
  }, [dateMode, selectedDate, startDate, endDate, availableDates]);

  // Selected existing record info (when single date mode)
  const existingRecord = useMemo(() => {
    if (dateMode === 'single' && selectedEmployeeId && selectedDate) {
      return allDailyRecords.find(
        (r) => r.employeeId === selectedEmployeeId && r.date === selectedDate
      );
    }
    return null;
  }, [allDailyRecords, dateMode, selectedEmployeeId, selectedDate]);

  // Quick preset pills
  const applyPreset = (h: number, m: number) => {
    setHoursInput(h);
    setMinutesInput(m);
    if (mode === 'clear') setMode('add');
    if (error) setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedEmployeeId) {
      setError('Please select an employee.');
      return;
    }

    if (targetedDates.length === 0) {
      setError('No valid dates selected for injection.');
      return;
    }

    if (mode !== 'clear' && totalMinutesToInject <= 0) {
      setError('Please specify the amount of supplementary hours/minutes to inject (> 0).');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a mandatory audit justification (e.g. Authorized overtime shift).');
      return;
    }

    onInjectSupp({
      employeeIds: [selectedEmployeeId],
      dates: targetedDates,
      suppMinutesToAdd: totalMinutesToInject,
      mode,
      reason: reason.trim(),
      auditor: auditor.trim() || currentUser || 'Supervisor',
    });

    onClose();
  };

  return (
    <div
      id="inject-supp-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        id="inject-supp-modal"
        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Zap className="h-5 w-5 fill-amber-500 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Inject Supplementary Hours</span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800 uppercase tracking-wide">
                  Heures Supp
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Grant approved overtime / extra supplementary hours with full audit logging
              </p>
            </div>
          </div>
          <button
            id="close-inject-supp-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Employee Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-indigo-600" />
              <span>Target Worker</span>
            </label>
            <select
              id="inject-supp-employee-select"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              {employeeList.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.id} - {emp.name} ({emp.group} | {emp.department})
                </option>
              ))}
            </select>
          </div>

          {/* Date Mode Selection */}
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                <span>Date Target</span>
              </span>
              <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setDateMode('single')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    dateMode === 'single'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Single Day
                </button>
                <button
                  type="button"
                  onClick={() => setDateMode('range')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    dateMode === 'range'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Date Range
                </button>
                <button
                  type="button"
                  onClick={() => setDateMode('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    dateMode === 'all'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Days ({availableDates.length})
                </button>
              </div>
            </div>

            {/* Date Inputs based on mode */}
            {dateMode === 'single' && (
              <div>
                <select
                  id="inject-supp-single-date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 font-mono"
                >
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {dateMode === 'range' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">From Date</span>
                  <input
                    id="inject-supp-range-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 font-mono outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">To Date</span>
                  <input
                    id="inject-supp-range-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>
                Targeting <strong>{targetedDates.length}</strong> day{targetedDates.length > 1 ? 's' : ''}
              </span>
              {existingRecord && dateMode === 'single' && (
                <span className="text-slate-600">
                  Current overtime on this day:{' '}
                  <strong className="text-indigo-600">
                    {existingRecord.suppHoursFormatted || '0'}
                  </strong>
                  {existingRecord.injectedSuppMinutes ? (
                    <span className="text-amber-600 font-mono">
                      {' '}
                      ({formatMinutesToHoursAndMinutes(existingRecord.injectedSuppMinutes)} injected)
                    </span>
                  ) : null}
                </span>
              )}
            </div>
          </div>

          {/* Amount of Supp Hours to Inject */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>Supplementary Hours to Inject</span>
              </label>

              {/* Mode switch: Add or Replace or Clear */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMode('add')}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                    mode === 'add'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                  title="Add to existing overtime hours"
                >
                  + Add to Existing
                </button>
                <button
                  type="button"
                  onClick={() => setMode('set')}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                    mode === 'set'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                  title="Overwrite/set exact injected overtime"
                >
                  Set Exact
                </button>
                {existingRecord?.injectedSuppMinutes ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('clear');
                      setHoursInput(0);
                      setMinutesInput(0);
                    }}
                    className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                      mode === 'clear'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-white text-rose-600 border border-rose-200'
                    }`}
                    title="Remove previously injected overtime on target dates"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            {mode !== 'clear' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Hours
                    </label>
                    <div className="relative">
                      <input
                        id="inject-supp-hours-input"
                        type="number"
                        min="0"
                        max="24"
                        value={hoursInput}
                        onChange={(e) => {
                          setHoursInput(Math.max(0, parseInt(e.target.value, 10) || 0));
                          if (error) setError('');
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                      <span className="absolute right-3 top-1.5 text-slate-400 text-xs">hrs</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Minutes
                    </label>
                    <select
                      id="inject-supp-minutes-select"
                      value={minutesInput}
                      onChange={(e) => {
                        setMinutesInput(parseInt(e.target.value, 10) || 0);
                        if (error) setError('');
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono font-bold outline-none focus:border-amber-500"
                    >
                      <option value={0}>00 min</option>
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                    </select>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Quick Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyPreset(0, 30)}
                      className="rounded-md bg-white px-2 py-0.5 border border-amber-200 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
                    >
                      +30 min
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(1, 0)}
                      className="rounded-md bg-white px-2 py-0.5 border border-amber-200 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
                    >
                      +1 hr
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(1, 30)}
                      className="rounded-md bg-white px-2 py-0.5 border border-amber-200 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
                    >
                      +1h 30m
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(2, 0)}
                      className="rounded-md bg-white px-2 py-0.5 border border-amber-200 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
                    >
                      +2 hrs
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(3, 0)}
                      className="rounded-md bg-white px-2 py-0.5 border border-amber-200 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
                    >
                      +3 hrs
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(4, 0)}
                      className="rounded-md bg-white px-2 py-0.5 border border-amber-200 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
                    >
                      +4 hrs
                    </button>
                  </div>
                </div>

                {/* Calculation Preview */}
                <div className="rounded-lg bg-white p-2.5 border border-amber-200/80 flex items-center justify-between text-xs text-amber-950 font-medium">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                    <span>
                      Injection:{' '}
                      <strong className="text-amber-800 font-mono text-sm">
                        +{formatMinutesToHoursAndMinutes(totalMinutesToInject)}
                      </strong>{' '}
                      ({totalMinutesToInject} minutes) per day
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Total: {formatMinutesToHoursAndMinutes(totalMinutesToInject * targetedDates.length)} across {targetedDates.length} day(s)
                  </span>
                </div>
              </>
            ) : (
              <div className="rounded-lg bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800">
                <p className="font-semibold">Reset / Clear Injected Hours:</p>
                <p className="mt-0.5 text-rose-700">
                  This will remove all manually injected overtime on the selected date(s), restoring the natural biometric punch calculation.
                </p>
              </div>
            )}
          </div>

          {/* Audit Compliance Fields */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Justification / Reason for Overtime <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="inject-supp-reason-input"
              rows={2}
              required
              placeholder="e.g. Authorized extra hours for urgent weekend stock inventory dispatch; approved by site director."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Authorized Supervisor / Reviewer</span>
            </label>
            <input
              id="inject-supp-auditor-input"
              type="text"
              value={auditor}
              onChange={(e) => setAuditor(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 focus:border-indigo-500 outline-none text-xs font-medium"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-rose-50 p-2.5 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              id="cancel-inject-supp-btn"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-inject-supp-btn"
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors"
            >
              <Check className="h-4 w-4" />
              {mode === 'clear' ? 'Clear Injected Hours' : 'Inject Supp Hours & Recalculate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
