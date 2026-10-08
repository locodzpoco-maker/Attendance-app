import React, { useState } from 'react';
import { DailyAttendanceRecord, AppLanguage, WorkSchedule } from '../types';
import { Clock, ShieldAlert, Check, X, HelpCircle, Layers, Zap } from 'lucide-react';
import { formatMinutesToHoursAndMinutes, ADMIN_SHIFT_SATURDAY, STOCK_SHIFT_SATURDAY } from '../utils/schedules';
import { isAdminWorker } from '../utils/employees';
import { getTranslations } from '../utils/i18n';

interface ManualCorrectionModalProps {
  record: DailyAttendanceRecord | null;
  onClose: () => void;
  onSave: (
    recordId: string,
    adjustedEntry: string | undefined,
    adjustedExit: string | undefined,
    reason: string,
    auditor: string,
    overrideShiftId?: string,
    adjustedSecondCheckIn?: string,
    injectedSuppMinutes?: number,
    exactPunchOnly?: boolean,
    deductBreak?: boolean,
    eligibleForOvertime?: boolean,
    isHalfDayAbsent?: boolean,
    halfDaySession?: 'morning' | 'afternoon'
  ) => void;
  currentUser: string;
  language?: AppLanguage;
  schedules?: WorkSchedule[];
}

export const ManualCorrectionModal: React.FC<ManualCorrectionModalProps> = ({
  record,
  onClose,
  onSave,
  currentUser,
  language,
  schedules,
}) => {
  if (!record) return null;
  const t = getTranslations(language);

  const adminSat = schedules?.find((s) => s.id === 'admin_sat') || ADMIN_SHIFT_SATURDAY;
  const stockSat = schedules?.find((s) => s.id === 'stock_sat') || STOCK_SHIFT_SATURDAY;

  const [entry, setEntry] = useState(record.entryTime || '');
  const [secondCheckIn, setSecondCheckIn] = useState(record.secondCheckInTime || '');
  const [exit, setExit] = useState(record.exitTime || '');
  const [overrideShift, setOverrideShift] = useState<string>(
    record.manualAdjustment?.overrideShiftId || (record.isShiftUnclear ? 'stock_g1' : '')
  );

  // Injected Supp Hours
  const initialInjected = record.manualAdjustment?.injectedSuppMinutes ?? record.injectedSuppMinutes ?? 0;
  const [injectedHours, setInjectedHours] = useState<number>(Math.floor(initialInjected / 60));
  const [injectedMinutes, setInjectedMinutes] = useState<number>(initialInjected % 60);

  // Exact Punches Only Mode (ignore lateness and early exit for this day only)
  const [exactPunchOnly, setExactPunchOnly] = useState<boolean>(
    record.manualAdjustment?.exactPunchOnly ?? record.exactPunchOnly ?? false
  );
  const [deductBreak, setDeductBreak] = useState<boolean>(
    record.manualAdjustment?.deductBreak ?? record.deductBreak ?? false
  );

  const currentSched = schedules?.find((s) => s.id === (overrideShift || record.scheduleId));

  const isWorkerAdmin =
    record.workerType === 'Admin' ||
    record.isAdminWorkerType ||
    (record.companyDepartment || '').toLowerCase().includes('admin') ||
    isAdminWorker(record.employeeId);

  // Half-Day Absence Mode
  const [halfDayMode, setHalfDayMode] = useState<'none' | 'afternoon' | 'morning'>(() => {
    if (record.manualAdjustment?.isHalfDayAbsent !== undefined) {
      return record.manualAdjustment.isHalfDayAbsent
        ? (record.manualAdjustment.halfDaySession || 'afternoon')
        : 'none';
    }
    if (record.isHalfDayAbsent) {
      return record.halfDaySession || 'afternoon';
    }
    return 'none';
  });

  // Eligible for Overtime Checkbox
  // Per user requirement: admin workers' eligible for overtime box is UNCHECKED by default until manually checked
  const [eligibleForOvertime, setEligibleForOvertime] = useState<boolean>(() => {
    if (record.manualAdjustment?.eligibleForOvertime !== undefined) {
      return Boolean(record.manualAdjustment.eligibleForOvertime);
    }
    if (isWorkerAdmin) {
      return false;
    }
    if (record.eligibleForOvertime !== undefined) {
      return Boolean(record.eligibleForOvertime);
    }
    return Boolean(currentSched?.overtimeAllowed);
  });

  const [reason, setReason] = useState(record.manualAdjustment?.reason || '');
  const [auditor, setAuditor] = useState(currentUser || 'HR Admin');
  const [error, setError] = useState('');

  const totalInjectedMins = injectedHours * 60 + injectedMinutes;
  const schedBreakMins = currentSched?.hasBreak ? (currentSched.breakDurationMinutes || 90) : (record.breakDurationMinutes || 90);

  // Helper to parse HH:MM to minutes
  const parseTimeToMins = (tStr: string): number => {
    if (!tStr) return 0;
    const [h, m] = tStr.split(':').map((v) => parseInt(v, 10));
    return (h || 0) * 60 + (m || 0);
  };

  // Preview overtime calculated for this worker when eligible
  const calculatedOvertimeMinutes = React.useMemo(() => {
    if (!eligibleForOvertime) return 0;
    const effectiveExit = exit.trim() || record.exitTime || '';
    const effectiveEntry = entry.trim() || record.entryTime || '';
    if (!effectiveExit) return 0;

    let exitM = parseTimeToMins(effectiveExit);
    const entryM = parseTimeToMins(effectiveEntry);
    if (exitM <= 0) return 0;

    if (currentSched?.crossesMidnight || exitM < entryM || record.isOvernightPunch) {
      if (exitM < entryM || exitM <= 8 * 60) {
        exitM += 24 * 60;
      }
    }

    let otStartM = 0;
    if (currentSched?.overtimeStartTime) {
      otStartM = parseTimeToMins(currentSched.overtimeStartTime);
    } else if (currentSched?.endTime && currentSched.endTime !== 'Dynamic' && currentSched.id !== 'no_shift') {
      otStartM = parseTimeToMins(currentSched.endTime);
    } else if (currentSched?.normalWorkedHours) {
      otStartM = entryM + Math.round(currentSched.normalWorkedHours * 60) + (currentSched.hasBreak ? (currentSched.breakDurationMinutes || 0) : 0);
    } else {
      otStartM = entryM + 8 * 60;
    }

    if (currentSched?.crossesMidnight && otStartM < parseTimeToMins(currentSched.startTime || '00:00')) {
      otStartM += 24 * 60;
    }

    const otGrace = currentSched?.overtimeGraceMinutes ?? 15;
    if (exitM > otStartM) {
      const raw = exitM - otStartM;
      return raw > otGrace ? raw : 0;
    }
    return 0;
  }, [eligibleForOvertime, exit, entry, record, currentSched]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a mandatory justification/reason for audit compliance.');
      return;
    }
    onSave(
      record.id,
      entry.trim() ? entry.trim() : undefined,
      exit.trim() ? exit.trim() : undefined,
      reason.trim(),
      auditor.trim(),
      overrideShift || undefined,
      secondCheckIn.trim() ? secondCheckIn.trim() : undefined,
      totalInjectedMins > 0 ? totalInjectedMins : undefined,
      exactPunchOnly,
      deductBreak,
      eligibleForOvertime,
      halfDayMode !== 'none',
      halfDayMode !== 'none' ? halfDayMode : undefined
    );
    onClose();
  };

  return (
    <div
      id="manual-correction-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div
        id="manual-correction-modal"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {record.isShiftUnclear ? t.reviewShift : t.btnAdjust}
              </h3>
              <p className="text-xs text-slate-500">
                {record.employeeName} ({record.employeeId}) • {record.formattedDate}
              </p>
            </div>
          </div>
          <button
            id="close-correction-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Highlight if shift unclear */}
        {record.isShiftUnclear && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3.5 border border-rose-200 text-xs text-rose-900">
            <div className="flex items-start gap-2">
              <HelpCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{t.obsShiftUnclear}:</p>
                <p className="text-rose-800/90 mt-0.5">
                  First check-in <span className="font-mono font-bold">{record.firstCheckInTime || record.entryTime}</span>. {t.obsShiftUnclearDesc}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Raw Punch Audit Safeguard */}
        <div className="my-4 rounded-xl bg-amber-50/70 p-3.5 border border-amber-200/60 text-xs text-amber-900">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Raw Punch Audit:</p>
              <p className="text-amber-800/90 mt-0.5">
                <span className="font-mono font-semibold">{record.rawPunches.length > 0 ? record.rawPunches.join(', ') : '-'}</span>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-sm">
          {/* Shift Selection */}
          {(record.isDynamicShift || record.isShiftUnclear || record.dayOfWeek === 'Saturday') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                <span>{t.colShift} ({record.formattedDate})</span>
              </label>
              <select
                id="correction-shift-select"
                value={overrideShift}
                onChange={(e) => setOverrideShift(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="">{t.detectFingerprints} (Auto)</option>
                <option value="admin_sat">
                  {t.shiftSatLabel} [Admin] ({adminSat.startTime} – {adminSat.endTime}, {adminSat.hasBreak ? `Break ${adminSat.breakStart}–${adminSat.breakEnd}` : 'No Break'}, {adminSat.overtimeAllowed ? `OT > ${adminSat.overtimeStartTime}` : 'No OT'})
                </option>
                <option value="stock_sat">
                  {t.shiftSatLabel} [Stock] ({stockSat.startTime} – {stockSat.endTime}, {stockSat.hasBreak ? `Break ${stockSat.breakStart}–${stockSat.breakEnd}` : 'No Break'}, {stockSat.overtimeAllowed ? `OT > ${stockSat.overtimeStartTime}` : 'No OT'})
                </option>
                <option value="stock_g1">{t.shift1Label} (10:00 – 18:00, Break 13:00–14:00, OT &gt; 18:00)</option>
                <option value="stock_g2">{t.shift2Label} (18:00 – 02:00, Break 21:00–22:00, OT &gt; 02:00)</option>
                <option value="stock_g3">{t.shift3Label} (08:30 – 16:30, Break 12:00–13:00, OT &gt; 16:30)</option>
                <option value="stock_g4">{t.shift4Label} (16:00 – 00:00, Break 21:00–22:00, OT &gt; 00:00)</option>
              </select>
              <span className="block text-[11px] text-slate-400 mt-1">
                {t.colShift}: {record.detectedShiftName || '-'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.colIn} (HH:MM)
              </label>
              <input
                id="correction-entry-input"
                type="text"
                placeholder="e.g. 09:57"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-xs"
              />
              <span className="text-[11px] text-slate-400">{record.entryTime || '-'}</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.secondCheckIn}
              </label>
              <input
                id="correction-second-in-input"
                type="text"
                placeholder="e.g. 14:05"
                value={secondCheckIn}
                onChange={(e) => setSecondCheckIn(e.target.value)}
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-xs"
              />
              <span className="text-[11px] text-slate-400">{record.secondCheckInTime || '-'}</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.colOut} (HH:MM)
              </label>
              <input
                id="correction-exit-input"
                type="text"
                placeholder="e.g. 18:04"
                value={exit}
                onChange={(e) => setExit(e.target.value)}
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-xs"
              />
              <span className="text-[11px] text-slate-400">{record.exitTime || '-'}</span>
            </div>
          </div>

          {/* Injected Supp Hours Section */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-amber-900 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
                <span>{t.injectSuppHours}</span>
              </label>
              {totalInjectedMins > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setInjectedHours(0);
                    setInjectedMinutes(0);
                  }}
                  className="text-[11px] text-rose-600 hover:underline"
                >
                  {t.resetDefaults}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[11px] text-slate-600 mb-0.5">H</span>
                <input
                  id="correction-supp-hours-input"
                  type="number"
                  min="0"
                  max="24"
                  value={injectedHours}
                  onChange={(e) => setInjectedHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <span className="block text-[11px] text-slate-600 mb-0.5">M</span>
                <select
                  id="correction-supp-minutes-select"
                  value={injectedMinutes}
                  onChange={(e) => setInjectedMinutes(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold outline-none focus:border-amber-500"
                >
                  <option value={0}>00 min</option>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                </select>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-amber-900">
              <span>
                {t.colSupp}: <strong>+{formatMinutesToHoursAndMinutes(totalInjectedMins)}</strong>
              </span>
              <span className="text-slate-500">
                {formatMinutesToHoursAndMinutes(Math.max(0, record.suppMinutes - (record.injectedSuppMinutes || 0)))}
              </span>
            </div>
          </div>

          {/* Half-Day Absence Selection */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-950 flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 border border-amber-300">½j</span>
                Statut Demi-journée / Absence
              </span>
              <span className="text-[10px] text-amber-850 font-bold px-1.5 py-0.2 rounded bg-white border border-amber-200">
                {halfDayMode === 'none' ? 'Journée complète' : (halfDayMode === 'afternoon' ? 'Absent après-midi (0.5j)' : 'Absent matin (0.5j)')}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setHalfDayMode('none')}
                className={`py-1.5 px-2 rounded-lg text-center text-[11px] transition-all cursor-pointer ${
                  halfDayMode === 'none'
                    ? 'bg-white border-2 border-indigo-600 text-indigo-950 font-bold shadow-2xs'
                    : 'bg-white/80 border border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                Journée complète
              </button>
              <button
                type="button"
                onClick={() => setHalfDayMode('afternoon')}
                className={`py-1.5 px-2 rounded-lg text-center text-[11px] transition-all cursor-pointer ${
                  halfDayMode === 'afternoon'
                    ? 'bg-amber-100 border-2 border-amber-600 text-amber-950 font-bold shadow-2xs'
                    : 'bg-white/80 border border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                Absent Après-midi
              </button>
              <button
                type="button"
                onClick={() => setHalfDayMode('morning')}
                className={`py-1.5 px-2 rounded-lg text-center text-[11px] transition-all cursor-pointer ${
                  halfDayMode === 'morning'
                    ? 'bg-amber-100 border-2 border-amber-600 text-amber-950 font-bold shadow-2xs'
                    : 'bg-white/80 border border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                Absent Matin
              </button>
            </div>
            {halfDayMode !== 'none' && (
              <p className="text-[11px] text-amber-900/80 leading-relaxed pt-1 border-t border-amber-200/60">
                Comptabilisé comme 0.5 jour travaillé et 0.5 jour absent dans le récapitulatif mensuel (heures travaillées et retard calculés sur la session effectuée).
              </p>
            )}
          </div>

          {/* Eligible for Overtime Checkbox */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-xs space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                id="correction-eligible-overtime-checkbox"
                type="checkbox"
                checked={eligibleForOvertime}
                onChange={(e) => setEligibleForOvertime(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-indigo-950 block text-xs">
                    {t.eligibleForOvertimeLabel}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      eligibleForOvertime
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                    }`}
                  >
                    {eligibleForOvertime
                      ? t.eligibleForOvertimeActive
                      : (isWorkerAdmin && record.manualAdjustment?.eligibleForOvertime === undefined
                          ? t.eligibleForOvertimeAdminBadge
                          : t.eligibleForOvertimeInactive)}
                  </span>
                </div>
                <span className="text-indigo-900/80 text-[11px] block mt-0.5 leading-relaxed">
                  {t.eligibleForOvertimeDesc}
                </span>
              </div>
            </label>

            {eligibleForOvertime && (
              <div className="pt-2 border-t border-indigo-200/70 text-[11px] flex items-center justify-between animate-in fade-in duration-150">
                <span className="text-indigo-950 font-medium">
                  {t.overtimeCalculatedPreview}:
                </span>
                {calculatedOvertimeMinutes > 0 ? (
                  <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 shadow-2xs">
                    +{formatMinutesToHoursAndMinutes(calculatedOvertimeMinutes)}
                  </span>
                ) : (
                  <span className="text-slate-500 italic">
                    {t.noOvertimeCalculatedPreview}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Exact Punch Only Checkbox Option */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-xs space-y-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                id="correction-exact-punch-checkbox"
                type="checkbox"
                checked={exactPunchOnly}
                onChange={(e) => setExactPunchOnly(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div className="flex-1">
                <span className="font-semibold text-sky-950 block">
                  {t.exactPunchOptionTitle}
                </span>
                <span className="text-sky-800/90 text-[11px] block mt-0.5 leading-relaxed">
                  {t.exactPunchOptionDesc}
                </span>
              </div>
            </label>

            {exactPunchOnly && (
              <div className="pt-2.5 border-t border-sky-200/80 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sky-950 text-xs">
                    {t.pauseHandling} ({schedBreakMins > 0 ? `${schedBreakMins} min` : 'Pause'}) :
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    deductBreak ? 'bg-sky-100 text-sky-800 border border-sky-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {deductBreak ? `⏸️ ${t.pauseDeducted} (-${schedBreakMins}m)` : `⏸️ ${t.pauseIncluded}`}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      deductBreak
                        ? 'bg-white border-sky-500 ring-1 ring-sky-500 shadow-2xs text-sky-950 font-semibold'
                        : 'bg-white/60 border-sky-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pauseOption"
                      checked={deductBreak === true}
                      onChange={() => setDeductBreak(true)}
                      className="mt-0.5 text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <p className="text-xs">{t.deductPauseOption} ({schedBreakMins}m)</p>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                        La pause est déduite des heures travaillées (calcul net).
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      !deductBreak
                        ? 'bg-white border-sky-500 ring-1 ring-sky-500 shadow-2xs text-sky-950 font-semibold'
                        : 'bg-white/60 border-sky-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pauseOption"
                      checked={deductBreak === false}
                      onChange={() => setDeductBreak(false)}
                      className="mt-0.5 text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <p className="text-xs">{t.includePauseOption}</p>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                        Toutes les heures entre Entrée et Sortie sont comptées.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.colObservation} / Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="correction-reason-input"
              rows={2}
              required
              placeholder="Justification..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reviewer / Role
            </label>
            <input
              id="correction-auditor-input"
              type="text"
              value={auditor}
              onChange={(e) => setAuditor(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 focus:border-indigo-500 outline-none text-xs"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-medium">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              id="cancel-correction-btn"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {t.btnCancel}
            </button>
            <button
              type="submit"
              id="save-correction-btn"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
            >
              <Check className="h-4 w-4" /> {t.btnSave}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
