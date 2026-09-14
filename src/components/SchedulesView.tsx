import React, { useState, useRef } from 'react';
import { WorkSchedule, DayOfWeek, AppSettings } from '../types';
import { DAYS_OF_WEEK } from '../utils/schedules';
import { Clock, Plus, Edit2, Sun, Moon, Trash2, RotateCcw, CheckCircle2, Download, Upload } from 'lucide-react';
import { getTranslations, translateDayOfWeek, translateShiftName } from '../utils/i18n';

interface SchedulesViewProps {
  schedules: WorkSchedule[];
  onUpdateSchedule: (schedule: WorkSchedule) => void;
  onAddSchedule: (schedule: WorkSchedule) => void;
  onDeleteSchedule?: (scheduleId: string) => void;
  onResetSchedules?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
  canEdit: boolean;
  settings?: AppSettings;
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
  settings,
}) => {
  const t = getTranslations(settings?.language);
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
  const [arrivalGraceMinutes, setArrivalGraceMinutes] = useState(10);
  const [breakGraceMinutes, setBreakGraceMinutes] = useState(10);
  const [overtimeGraceMinutes, setOvertimeGraceMinutes] = useState(15);

  const openAdd = () => {
    setEditingSchedule(null);
    setName('');
    setGroupName('');
    setDepartment('Stock & Logistique');
    setStartTime('08:30');
    setEndTime('16:30');
    setCrossesMidnight(false);
    setHasBreak(true);
    setBreakStart('12:00');
    setBreakEnd('13:00');
    setBreakDurationMinutes(60);
    setOvertimeAllowed(true);
    setOvertimeStartTime('16:30');
    setNormalWorkedHours(7.0);
    setWorkingDays(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']);
    setArrivalGraceMinutes(10);
    setBreakGraceMinutes(10);
    setOvertimeGraceMinutes(15);
    setModalOpen(true);
  };

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
    setWorkingDays(s.workingDays);
    setArrivalGraceMinutes(s.arrivalGraceMinutes ?? 10);
    setBreakGraceMinutes(s.breakGraceMinutes ?? 10);
    setOvertimeGraceMinutes(s.overtimeGraceMinutes ?? 15);
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
    if (window.confirm(`${t.deleteScheduleConfirm} "${s.groupName}"?`)) {
      onDeleteSchedule(s.id);
    }
  };

  const handleReset = () => {
    if (!onResetSchedules) return;
    if (window.confirm(t.resetSchedulesConfirm)) {
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
                {t.shiftEngineTitle}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> {t.autoSavedLocally}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.shiftEngineSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onExportBackup && (
              <button
                type="button"
                onClick={onExportBackup}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                title={t.exportBackup}
              >
                <Download className="h-3.5 w-3.5 text-slate-500" /> {t.exportBackup}
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
                  title={t.importBackup}
                >
                  <Upload className="h-3.5 w-3.5 text-slate-500" /> {t.importBackup}
                </button>
              </>
            )}

            {canEdit && onResetSchedules && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                title={t.resetDefaults}
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" /> {t.resetDefaults}
              </button>
            )}

            {canEdit && (
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs"
              >
                <Plus className="h-4 w-4" /> {t.addNewSchedule}
              </button>
            )}
          </div>
        </div>
        {justSaved && (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {t.scheduleSavedSuccess}
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
                    <span className="font-bold text-slate-900 text-sm">{translateShiftName(s.groupName, settings?.language) || s.groupName}</span>
                    {s.crossesMidnight ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        <Moon className="h-3 w-3" /> {t.nightShift}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        <Sun className="h-3 w-3" /> {t.dayShift}
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
                      title={t.editSchedule}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {canEdit && onDeleteSchedule && schedules.length > 1 && (
                    <button
                      onClick={() => handleDelete(s)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title={t.deleteSchedule}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Schedule details */}
              <div className="mt-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t.startTime} / {t.endTime}:</span>
                  <span className="font-semibold text-slate-800">
                    {s.startTime} → {s.endTime}
                    {s.crossesMidnight && ` (${t.crossesMidnight})`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t.hasBreak}:</span>
                  <span className="font-medium text-slate-700">
                    {s.hasBreak ? `${s.breakDurationMinutes} min (${s.breakStart} - ${s.breakEnd})` : '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t.normalHours}:</span>
                  <span className="font-bold text-slate-900">{s.normalWorkedHours} h</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t.overtimeStarts}:</span>
                  <span className="font-medium text-indigo-700">
                    {s.overtimeAllowed ? s.overtimeStartTime : '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t.arrivalGraceMinutesLabel} / {t.breakGraceMinutesLabel}:</span>
                  <span className="font-semibold text-slate-800">
                    {s.arrivalGraceMinutes ?? 10}m / {s.breakGraceMinutes ?? 10}m
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t.overtimeGraceMinutesLabel}:</span>
                  <span className="font-semibold text-slate-800">{s.overtimeGraceMinutes} m</span>
                </div>

                {/* Working days pill list */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 block mb-1">{t.workingDaysLabel}:</span>
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
                          {translateDayOfWeek(day, settings?.language).slice(0, 3)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Summary Notice */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>{s.name}</span>
              {s.overtimeAllowed && (
                <span className="text-indigo-600 font-medium">+{t.overtimeAllowed}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit/Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              {editingSchedule ? t.editSchedule : t.addNewSchedule}
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.fullName} / Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shift 1 (10:00 - 18:00)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.group} Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stock Shift 1"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t.department}
                </label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.startTime} (HH:MM)
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
                    {t.endTime} (HH:MM)
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
                  {t.crossesMidnight}
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
                    {t.hasBreak}
                  </label>
                </div>
                {hasBreak && (
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        {t.breakStart}
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
                        {t.breakEnd}
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
                        {t.breakDuration}
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
                    {t.normalHours}
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
                    {t.arrivalGraceMinutesLabel}
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
                    {t.breakGraceMinutesLabel}
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
                    {t.overtimeGraceMinutesLabel}
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
                    {t.overtimeAllowed}
                  </label>
                </div>
                {overtimeAllowed && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.overtimeStarts}
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
                  {t.workingDaysLabel}
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
                        {translateDayOfWeek(day, settings?.language)}
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
    </div>
  );
};
