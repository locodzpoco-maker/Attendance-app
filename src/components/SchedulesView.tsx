import React, { useState, useRef } from 'react';
import { WorkSchedule, DayOfWeek } from '../types';
import { DAYS_OF_WEEK } from '../utils/schedules';
import { Clock, Plus, Edit2, Check, ShieldCheck, Sun, Moon, Trash2, RotateCcw, CheckCircle2, Download, Upload } from 'lucide-react';

interface SchedulesViewProps {
  schedules: WorkSchedule[];
  onUpdateSchedule: (schedule: WorkSchedule) => void;
  onAddSchedule: (schedule: WorkSchedule) => void;
  onDeleteSchedule?: (scheduleId: string) => void;
  onResetSchedules?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
  canEdit: boolean;
}

export const SchedulesView: React.FC<SchedulesViewProps> = ({
  schedules,
  onUpdateSchedule,
  onAddSchedule,
  onDeleteSchedule,
  onResetSchedules,
  onExportBackup,
  onImportBackup,
  canEdit,
}) => {
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [department, setDepartment] = useState('Stock & Logistique');
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('17:00');
  const [crossesMidnight, setCrossesMidnight] = useState(false);
  const [hasBreak, setHasBreak] = useState(true);
  const [breakStart, setBreakStart] = useState('12:30');
  const [breakEnd, setBreakEnd] = useState('14:00');
  const [breakDurationMinutes, setBreakDurationMinutes] = useState(90);
  const [overtimeAllowed, setOvertimeAllowed] = useState(false);
  const [overtimeStartTime, setOvertimeStartTime] = useState('18:00');
  const [normalWorkedHours, setNormalWorkedHours] = useState(7.0);
  const [workingDays, setWorkingDays] = useState<DayOfWeek[]>([
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
  ]);
  const [overtimeGraceMinutes, setOvertimeGraceMinutes] = useState(15);
  const [arrivalGraceMinutes, setArrivalGraceMinutes] = useState(10);
  const [breakGraceMinutes, setBreakGraceMinutes] = useState(10);

  const openEdit = (s: WorkSchedule) => {
    setEditingSchedule(s);
    setName(s.name);
    setGroupName(s.groupName);
    setDepartment(s.department);
    setStartTime(s.startTime);
    setEndTime(s.endTime);
    setCrossesMidnight(s.crossesMidnight);
    setHasBreak(s.hasBreak);
    setBreakStart(s.breakStart || '12:00');
    setBreakEnd(s.breakEnd || '13:00');
    setBreakDurationMinutes(s.breakDurationMinutes);
    setOvertimeAllowed(s.overtimeAllowed);
    setOvertimeStartTime(s.overtimeStartTime || s.endTime);
    setNormalWorkedHours(s.normalWorkedHours);
    setWorkingDays([...s.workingDays]);
    setOvertimeGraceMinutes(s.overtimeGraceMinutes);
    setArrivalGraceMinutes(s.arrivalGraceMinutes ?? 10);
    setBreakGraceMinutes(s.breakGraceMinutes ?? 10);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditingSchedule(null);
    setName('Custom Shift');
    setGroupName('Custom Group');
    setDepartment('Stock & Logistique');
    setStartTime('08:00');
    setEndTime('16:00');
    setCrossesMidnight(false);
    setHasBreak(true);
    setBreakStart('12:00');
    setBreakEnd('13:00');
    setBreakDurationMinutes(60);
    setOvertimeAllowed(true);
    setOvertimeStartTime('16:00');
    setNormalWorkedHours(7.0);
    setWorkingDays(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']);
    setOvertimeGraceMinutes(15);
    setArrivalGraceMinutes(10);
    setBreakGraceMinutes(10);
    setModalOpen(true);
  };

  const toggleDay = (day: DayOfWeek) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: WorkSchedule = {
      id: editingSchedule ? editingSchedule.id : `sched_${Date.now()}`,
      name: name.trim(),
      groupName: groupName.trim(),
      department: department.trim(),
      startTime,
      endTime,
      crossesMidnight,
      hasBreak,
      breakStart: hasBreak ? breakStart : undefined,
      breakEnd: hasBreak ? breakEnd : undefined,
      breakDurationMinutes: hasBreak ? breakDurationMinutes : 0,
      overtimeAllowed,
      overtimeStartTime: overtimeAllowed ? overtimeStartTime : undefined,
      normalWorkedHours: Number(normalWorkedHours),
      workingDays,
      arrivalGraceMinutes: Number(arrivalGraceMinutes),
      breakGraceMinutes: Number(breakGraceMinutes),
      overtimeGraceMinutes: Number(overtimeGraceMinutes),
    };

    if (editingSchedule) {
      onUpdateSchedule(payload);
    } else {
      onAddSchedule(payload);
    }
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
    setModalOpen(false);
  };

  const handleDelete = (s: WorkSchedule) => {
    if (!onDeleteSchedule) return;
    if (window.confirm(`Are you sure you want to delete the schedule "${s.groupName}"?`)) {
      onDeleteSchedule(s.id);
    }
  };

  const handleReset = () => {
    if (!onResetSchedules) return;
    if (window.confirm('Reset all schedules to system factory defaults? Any custom schedules will be replaced.')) {
      onResetSchedules();
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600" />
                Configurable Schedule & Shift Engine
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Auto-Saved Locally
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              PRD Sections 11–13: Work rules, breaks, cross-midnight handling, and 15-minute overtime thresholds. All schedule changes persist on page reload.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onExportBackup && (
              <button
                type="button"
                onClick={onExportBackup}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                title="Download JSON backup of all schedules & settings"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" /> Export Backup
              </button>
            )}

            {onImportBackup && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImportBackup(file);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                  title="Import schedules and settings from JSON file"
                >
                  <Upload className="h-3.5 w-3.5 text-slate-500" /> Import Backup
                </button>
              </>
            )}

            {canEdit && onResetSchedules && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                title="Reset all schedules to original default presets"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" /> Reset Defaults
              </button>
            )}

            {canEdit && (
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs"
              >
                <Plus className="h-4 w-4" /> Add New Schedule
              </button>
            )}
          </div>
        </div>
        {justSaved && (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Schedule saved successfully! Changes are actively saved to browser storage.
          </div>
        )}
      </div>

      {/* Grid of Schedules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedules.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-sm">{s.groupName}</span>
                    {s.crossesMidnight ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        <Moon className="h-3 w-3" /> Night Shift
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        <Sun className="h-3 w-3" /> Day Shift
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{s.department}</p>
                </div>

                <div className="flex items-center gap-1">
                  {canEdit && (
                    <button
                      onClick={() => openEdit(s)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                      title="Edit schedule"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {canEdit && onDeleteSchedule && schedules.length > 1 && (
                    <button
                      onClick={() => handleDelete(s)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Delete schedule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Schedule details */}
              <div className="mt-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Working Hours:</span>
                  <span className="font-semibold text-slate-800">
                    {s.startTime} → {s.endTime}
                    {s.crossesMidnight && ' (next day)'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Scheduled Break:</span>
                  <span className="font-medium text-slate-700">
                    {s.hasBreak ? `${s.breakDurationMinutes} min (${s.breakStart} - ${s.breakEnd})` : 'None'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Normal Hours:</span>
                  <span className="font-bold text-slate-900">{s.normalWorkedHours} hours</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Overtime (Supp):</span>
                  <span className="font-medium text-indigo-700">
                    {s.overtimeAllowed ? `After ${s.overtimeStartTime}` : 'None'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Grace (1st / 2nd In):</span>
                  <span className="font-semibold text-slate-800">
                    {s.arrivalGraceMinutes ?? 10}m / {s.breakGraceMinutes ?? 10}m
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">OT Grace Threshold:</span>
                  <span className="font-semibold text-slate-800">{s.overtimeGraceMinutes} minutes</span>
                </div>

                {/* Working days pill list */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 block mb-1">Configured Workdays:</span>
                  <div className="flex flex-wrap gap-1">
                    {DAYS_OF_WEEK.map((day) => {
                      const isWorking = s.workingDays.includes(day);
                      return (
                        <span
                          key={day}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            isWorking
                              ? 'bg-slate-800 text-white'
                              : 'bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingSchedule ? 'Edit Work Schedule' : 'Create New Schedule'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Schedule Title
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Group Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Shift Start Time
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="HH:MM"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Shift End Time
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="HH:MM"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-50/50 border border-indigo-100">
                <input
                  type="checkbox"
                  id="crosses-midnight-chk"
                  checked={crossesMidnight}
                  onChange={(e) => setCrossesMidnight(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <label htmlFor="crosses-midnight-chk" className="font-semibold text-indigo-900 cursor-pointer">
                  Crosses Midnight (e.g. Stock Group 2: 18:00 to 02:00 next day)
                </label>
              </div>

              {/* Break Configuration */}
              <div className="rounded-lg border border-slate-200 p-3 space-y-2.5 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="has-break-chk"
                    checked={hasBreak}
                    onChange={(e) => setHasBreak(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <label htmlFor="has-break-chk" className="font-semibold text-slate-800 cursor-pointer">
                    Schedule Includes Unpaid Lunch / Rest Break
                  </label>
                </div>
                {hasBreak && (
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Break Start (HH:MM)
                      </label>
                      <input
                        type="text"
                        placeholder="12:30"
                        value={breakStart}
                        onChange={(e) => setBreakStart(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-slate-800 outline-none text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Break End / 2nd In (HH:MM)
                      </label>
                      <input
                        type="text"
                        placeholder="14:00"
                        value={breakEnd}
                        onChange={(e) => setBreakEnd(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-slate-800 outline-none text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Duration (mins)
                      </label>
                      <input
                        type="number"
                        value={breakDurationMinutes}
                        onChange={(e) => setBreakDurationMinutes(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-800 outline-none text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Normal Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={normalWorkedHours}
                    onChange={(e) => setNormalWorkedHours(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Arrival Grace (mins)
                  </label>
                  <input
                    type="number"
                    value={arrivalGraceMinutes}
                    onChange={(e) => setArrivalGraceMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Break Grace (mins)
                  </label>
                  <input
                    type="number"
                    value={breakGraceMinutes}
                    onChange={(e) => setBreakGraceMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    OT Grace (mins)
                  </label>
                  <input
                    type="number"
                    value={overtimeGraceMinutes}
                    onChange={(e) => setOvertimeGraceMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 mt-5">
                  <input
                    type="checkbox"
                    id="ot-allowed-chk"
                    checked={overtimeAllowed}
                    onChange={(e) => setOvertimeAllowed(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <label htmlFor="ot-allowed-chk" className="font-semibold text-slate-700 cursor-pointer">
                    Eligible for Overtime
                  </label>
                </div>
                {overtimeAllowed && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Overtime Starts At
                    </label>
                    <input
                      type="text"
                      placeholder="HH:MM"
                      value={overtimeStartTime}
                      onChange={(e) => setOvertimeStartTime(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-slate-800 outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Working Days
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const active = workingDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                          active
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
