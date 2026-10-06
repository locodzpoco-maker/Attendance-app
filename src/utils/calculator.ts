import {
  RawAttendanceDataset,
  Employee,
  WorkSchedule,
  DailyAttendanceRecord,
  MonthlySummaryRecord,
  AttendanceObservation,
  ManualAdjustment,
  AppSettings,
  PaidVacation,
  TimeAuthorization,
} from '../types';
import {
  DEFAULT_SCHEDULES,
  STOCK_SHIFT_1,
  STOCK_SHIFT_2,
  STOCK_SHIFT_3,
  STOCK_SHIFT_4,
  STOCK_SHIFT_SATURDAY,
  ADMIN_SHIFT_SATURDAY,
  STOCK_DYNAMIC_SCHEDULE,
  NO_SHIFT_SCHEDULE,
  detectStockShift,
  isEarlyMorningTime,
  getDayOfWeekFromDate,
  parseTimeToMinutes,
  formatMinutesToHoursAndMinutes,
} from './schedules';
import { isStockWorker, isAdminWorker } from './employees';

export interface CalculationOptions {
  schedules?: WorkSchedule[];
  employees?: Employee[];
  manualAdjustments?: Record<string, ManualAdjustment>; // key: "empId_date"
  paidVacations?: PaidVacation[];
  timeAuthorizations?: TimeAuthorization[];
  settings?: AppSettings;
  excludeArchived?: boolean;
}

/**
 * Normalizes and calculates daily attendance and monthly summaries.
 * Stock employees have DYNAMIC shift detection: their shift is determined for each
 * individual workday based on their actual first check-in time (Shift 1, 2, 3, or 4).
 */
export function calculateAttendance(
  dataset: RawAttendanceDataset,
  options?: CalculationOptions
): {
  dailyRecords: DailyAttendanceRecord[];
  monthlySummary: MonthlySummaryRecord[];
} {
  const schedules = options?.schedules || DEFAULT_SCHEDULES;
  const scheduleMap = new Map<string, WorkSchedule>();
  schedules.forEach((s) => scheduleMap.set(s.id, s));

  const employeeMap = new Map<string, Employee>();
  if (options?.employees) {
    options.employees.forEach((e) => {
      employeeMap.set(e.id, e);
      employeeMap.set(e.id.trim(), e);
      const unpadded = e.id.trim().replace(/^0+/, '');
      if (unpadded) employeeMap.set(unpadded, e);
      employeeMap.set(e.id.toLowerCase(), e);
    });
  }

  const manualAdjustments = options?.manualAdjustments || {};
  const globalOvertimeGrace = options?.settings?.defaultOvertimeGraceMinutes ?? 15;
  const globalArrivalGrace = options?.settings?.defaultArrivalGraceMinutes ?? 10;
  const globalBreakGrace = options?.settings?.defaultBreakGraceMinutes ?? 10;
  const globalEarlyExitGrace = options?.settings?.defaultEarlyExitGraceMinutes ?? 5;

  const dailyRecords: DailyAttendanceRecord[] = [];
  const daysInMonth = dataset.totalDays;

  // Process each employee
  for (const rawEmp of dataset.employees) {
    const empId = rawEmp.employeeId;
    const dbEmp =
      employeeMap.get(empId) ||
      employeeMap.get(empId.trim()) ||
      employeeMap.get(empId.trim().replace(/^0+/, '')) ||
      employeeMap.get(empId.toLowerCase());

    const isArchived = Boolean(dbEmp?.isArchived || dbEmp?.status === 'Archived');
    if (options?.excludeArchived && isArchived) {
      continue;
    }

    // Resolve employee category:
    // 1. Explicit employee workerType ('Stock' | 'Admin') if set on employee
    // 2. Explicit ADMIN designation
    // 3. Explicit STOCK designation
    // 4. Fallback based on department text
    const isExplicitAdmin = dbEmp?.workerType === 'Admin' || (!dbEmp?.workerType && isAdminWorker(empId, dbEmp));
    const isExplicitStock = dbEmp?.workerType === 'Stock' || (!dbEmp?.workerType && isStockWorker(empId, dbEmp));

    let isStock = false;
    let companyDept = 'Administration';
    let defaultGroupName = 'Admin Group 1';
    let baseSchedule: WorkSchedule = DEFAULT_SCHEDULES[0];

    if (dbEmp?.scheduleId === 'no_shift') {
      isStock = false;
      companyDept = dbEmp?.companyDepartment || 'Sans Shift';
      defaultGroupName = dbEmp?.groupName || 'Sans Shift';
      baseSchedule = scheduleMap.get('no_shift') || NO_SHIFT_SCHEDULE;
    } else if (isExplicitAdmin) {
      isStock = false;
      companyDept = dbEmp?.companyDepartment || 'Administration';
      defaultGroupName = dbEmp?.groupName || 'Admin Group 1';
      baseSchedule = (dbEmp?.scheduleId ? scheduleMap.get(dbEmp.scheduleId) : null) || scheduleMap.get('admin_g1') || DEFAULT_SCHEDULES[0];
    } else if (isExplicitStock) {
      isStock = true;
      companyDept = dbEmp?.companyDepartment || 'Stock & Logistique';
      defaultGroupName = dbEmp?.groupName || 'Stock';
      baseSchedule = STOCK_DYNAMIC_SCHEDULE;
    } else if (dbEmp) {
      companyDept = dbEmp.companyDepartment || 'Administration';
      const deptLower = companyDept.toLowerCase();
      const groupLower = (dbEmp.groupName || '').toLowerCase();
      isStock = deptLower.includes('stock') || groupLower.includes('stock');
      defaultGroupName = isStock ? 'Stock' : dbEmp.groupName || 'Admin Group 1';
      baseSchedule = isStock
        ? STOCK_DYNAMIC_SCHEDULE
        : scheduleMap.get(dbEmp.scheduleId) || DEFAULT_SCHEDULES[0];
    } else {
      const rawDeptLower = (rawEmp.rawDepartment || '').toLowerCase();
      if (rawDeptLower.includes('stock') || rawDeptLower.includes('depot')) {
        isStock = true;
        companyDept = 'Stock & Logistique';
        defaultGroupName = 'Stock';
        baseSchedule = STOCK_DYNAMIC_SCHEDULE;
      } else if (rawDeptLower.includes('admin') && rawDeptLower.includes('2')) {
        isStock = false;
        companyDept = 'Administration';
        defaultGroupName = 'Admin Group 2';
        baseSchedule = scheduleMap.get('admin_g2') || DEFAULT_SCHEDULES[1];
      } else {
        isStock = false;
        companyDept = 'Administration';
        defaultGroupName = 'Admin Group 1';
        baseSchedule = scheduleMap.get('admin_g1') || DEFAULT_SCHEDULES[0];
      }
    }

    const isAdminWorkerType = !isStock;

    // For overnight shifts (Shift 2: 18:00-02:00, Shift 4: 16:00-00:00), the punch recorded in
    // early morning of the next day is associated as the exit of the previous night.
    // We track consumed morning punches to avoid counting them as the next day's check-in.
    const consumedEarlyPunchDays = new Set<number>();

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const rawDay = rawEmp.days[dayNum];
      const dateStr = rawDay
        ? rawDay.dateStr
        : `${dataset.year}-${dataset.month.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      const dayOfWeek = getDayOfWeekFromDate(dateStr);
      const recordKey = `${empId}_${dateStr}`;
      const manualAdj = manualAdjustments[recordKey];

      const rawPunches = rawDay ? [...rawDay.rawPunches] : [];
      const rawPunchesText = rawDay ? rawDay.rawPunchesText : '';

      // Separate punches into early morning (00:00 to 05:30) vs regular (> 05:30)
      // Early morning punches (00:00 - 05:30) are ALWAYS overnight exits, NEVER shift starts!
      const earlyMorningPunches = rawPunches.filter((p) => isEarlyMorningTime(p));
      const regularPunches = rawPunches.filter((p) => !isEarlyMorningTime(p));

      // Has today's early morning punch already been consumed as yesterday's overnight exit?
      const isEarlyPunchConsumed = consumedEarlyPunchDays.has(dayNum);
      const availableEarlyPunch = !isEarlyPunchConsumed && earlyMorningPunches.length > 0
        ? earlyMorningPunches[0]
        : null;

      // Determine genuine first check-in time:
      // Early morning punches (00:00 - 05:30) can NEVER be an in-time / check-in!
      let firstCheckInTime: string | null = null;
      if (manualAdj?.adjustedEntry) {
        firstCheckInTime = manualAdj.adjustedEntry;
      } else if (regularPunches.length > 0) {
        firstCheckInTime = regularPunches[0];
      }

      // Determine schedule for THIS day:
      let assignedSchedule: WorkSchedule = baseSchedule;
      let detectedShiftId: string = baseSchedule.id;
      let detectedShiftName: string = baseSchedule.groupName;
      let isShiftUnclear = false;
      let dayGroupName = defaultGroupName;

      const hasSaturdayShift = Boolean(
        dbEmp?.hasSaturdayShift ||
        (dbEmp?.scheduleId === 'stock_sat') ||
        (baseSchedule.id === 'stock_sat')
      );

      if (isStock) {
        // STOCK EMPLOYEE: Dynamic Shift Detection per individual day!
        if (manualAdj?.overrideShiftId) {
          // Manual supervisor override
          const over =
            scheduleMap.get(manualAdj.overrideShiftId) ||
            (manualAdj.overrideShiftId === 'stock_sat'
              ? (scheduleMap.get('stock_sat') || STOCK_SHIFT_SATURDAY)
              : (scheduleMap.get('stock_g1') || STOCK_SHIFT_1));
          assignedSchedule = over;
          detectedShiftId = over.id;
          detectedShiftName = over.name.split(' (')[0];
          dayGroupName = `Stock ${detectedShiftName}`;
        } else if (firstCheckInTime) {
          // Auto-detect based on first check-in time and day of week
          const customStockSat = scheduleMap.get('stock_sat') || STOCK_SHIFT_SATURDAY;
          const detected = detectStockShift(firstCheckInTime, dayOfWeek, hasSaturdayShift, customStockSat);
          detectedShiftId = detected.shiftId;
          detectedShiftName = detected.shiftName;
          isShiftUnclear = detected.isUnclear;

          if (detected.schedule) {
            assignedSchedule = detected.schedule;
            dayGroupName = `Stock ${detected.shiftName}`;
          } else {
            // Unclear shift
            assignedSchedule = (dayOfWeek === 'Saturday' && hasSaturdayShift)
              ? (scheduleMap.get('stock_sat') || STOCK_SHIFT_SATURDAY)
              : (scheduleMap.get('stock_g1') || STOCK_SHIFT_1);
            dayGroupName = 'Stock (Shift Unclear)';
          }
        } else {
          // No regular check-in today (e.g. rest day, or day after night shift with only 02:00 exit)
          if (dayOfWeek === 'Saturday' && hasSaturdayShift) {
            assignedSchedule = scheduleMap.get('stock_sat') || STOCK_SHIFT_SATURDAY;
            detectedShiftId = 'stock_sat';
            detectedShiftName = assignedSchedule.name.split(' (')[0] || 'Shift Samedi';
            dayGroupName = assignedSchedule.groupName;
          } else {
            assignedSchedule = scheduleMap.get('stock_g1') || STOCK_SHIFT_1;
            detectedShiftId = 'NONE';
            detectedShiftName = '-';
            dayGroupName = 'Stock';
          }
        }
      } else {
        // ADMIN OR NO-SHIFT EMPLOYEE: Standard schedule
        if (assignedSchedule.id === 'no_shift') {
          detectedShiftId = 'no_shift';
          detectedShiftName = 'Sans Shift';
          dayGroupName = 'Sans Shift';
        } else if (manualAdj?.overrideShiftId) {
          const over =
            scheduleMap.get(manualAdj.overrideShiftId) ||
            (manualAdj.overrideShiftId === 'admin_sat'
              ? (scheduleMap.get('admin_sat') || ADMIN_SHIFT_SATURDAY)
              : manualAdj.overrideShiftId === 'stock_sat'
              ? (scheduleMap.get('stock_sat') || STOCK_SHIFT_SATURDAY)
              : undefined);
          if (over) {
            assignedSchedule = over;
            detectedShiftId = over.id;
            detectedShiftName = over.name.split(' (')[0];
            dayGroupName = over.groupName;
          }
        } else if (dayOfWeek === 'Saturday' && hasSaturdayShift && assignedSchedule.id !== 'admin_g2') {
          // If this employee is specifically assigned to Saturday shift (Admin: 09:00 - 17:00 or user-customized)
          assignedSchedule = scheduleMap.get('admin_sat') || ADMIN_SHIFT_SATURDAY;
          detectedShiftId = assignedSchedule.id;
          detectedShiftName = assignedSchedule.name.split(' (')[0] || 'Shift Samedi';
          dayGroupName = assignedSchedule.groupName;
        } else {
          detectedShiftId = assignedSchedule.id;
          detectedShiftName = assignedSchedule.groupName;
          dayGroupName = defaultGroupName;
        }
      }

      const isWorkingDay = assignedSchedule.workingDays.includes(dayOfWeek);
      const arrivalGrace = assignedSchedule.arrivalGraceMinutes ?? globalArrivalGrace;
      const breakGrace = assignedSchedule.breakGraceMinutes ?? globalBreakGrace;
      const earlyExitGrace = assignedSchedule.earlyExitGraceMinutes ?? globalEarlyExitGrace;
      const overtimeGrace = assignedSchedule.overtimeGraceMinutes ?? globalOvertimeGrace;

      // Check if employee is on approved Paid Vacation for this date
      const activeVacation = options?.paidVacations?.find((v) => {
        const matchEmp =
          v.employeeId === empId ||
          (dbEmp && v.employeeId === dbEmp.id) ||
          v.employeeId.trim() === empId.trim() ||
          v.employeeId.trim().replace(/^0+/, '') === empId.trim().replace(/^0+/, '');
        return matchEmp && dateStr >= v.startDate && dateStr <= v.endDate;
      });

      if (activeVacation) {
        const isVacationWorkingDay = assignedSchedule.workingDays.includes(dayOfWeek);
        const targetNormalMins = Math.round(assignedSchedule.normalWorkedHours * 60);
        const injectedSupp = manualAdj?.injectedSuppMinutes || 0;

        let observation: AttendanceObservation = 'Congé payé';
        let observationDetail = activeVacation.reason
          ? `Congé payé (${activeVacation.reason})`
          : 'Congé payé';
        let statusType: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'info';
        let workedMinutes = 0;

        if (isVacationWorkingDay) {
          observation = 'Congé payé';
          workedMinutes = targetNormalMins;
          statusType = 'info';
        } else {
          observation = 'OFF';
          observationDetail = 'OFF (Congé)';
          statusType = 'neutral';
          workedMinutes = 0;
        }

        const suppMinutes = injectedSupp;
        const workedHoursFormatted = formatMinutesToHoursAndMinutes(workedMinutes);
        const suppHoursFormatted = suppMinutes > 0 ? formatMinutesToHoursAndMinutes(suppMinutes) : '0';
        const workedDecimalHours = Math.round((workedMinutes / 60) * 100) / 100;
        const suppDecimalHours = Math.round((suppMinutes / 60) * 100) / 100;
        const dateParts = dateStr.split('-');
        const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

        dailyRecords.push({
          id: recordKey,
          date: dateStr,
          formattedDate,
          dayOfWeek,
          employeeId: empId,
          employeeName: rawEmp.name,
          rawDepartment: rawEmp.rawDepartment,
          companyDepartment: companyDept,
          groupName: dayGroupName,
          scheduleId: assignedSchedule.id,
          scheduleName: isStock
            ? isShiftUnclear
              ? 'SHIFT UNCLEAR'
              : detectedShiftName !== '-'
                ? `Stock ${detectedShiftName}`
                : 'Stock (Dynamic)'
            : assignedSchedule.name,
          isWorkingDay: isVacationWorkingDay,
          isDynamicShift: isStock,
          detectedShiftId,
          detectedShiftName,
          isShiftUnclear: false,
          rawPunches,
          rawPunchesText,
          firstCheckInTime,
          secondCheckInTime: null,
          entryTime: manualAdj?.adjustedEntry || (rawPunches.length > 0 ? rawPunches[0] : null),
          exitTime: manualAdj?.adjustedExit || (rawPunches.length > 1 ? rawPunches[rawPunches.length - 1] : null),
          isOvernightPunch: false,
          manualAdjustment: manualAdj,
          isManuallyAdjusted: Boolean(manualAdj),
          injectedSuppMinutes: injectedSupp > 0 ? injectedSupp : undefined,
          firstCheckInDelayMinutes: 0,
          secondCheckInDelayMinutes: 0,
          earlyExitMinutes: 0,
          delayMinutes: 0,
          breakDurationMinutes: assignedSchedule.hasBreak ? assignedSchedule.breakDurationMinutes : 0,
          workedMinutes,
          workedHoursFormatted,
          workedDecimalHours,
          suppMinutes,
          suppHoursFormatted,
          suppDecimalHours,
          observation,
          observationDetail,
          statusType,
          isArchived,
          isPaidVacation: true,
          vacationReason: activeVacation.reason,
        });

        continue; // Employee is on approved paid vacation for this date
      }

      // Check if employee has an active Schedule Dispensation / Time Authorization for this date
      const activeAuthorization = options?.timeAuthorizations?.find((auth) => {
        const matchEmp =
          auth.employeeId === empId ||
          (dbEmp && auth.employeeId === dbEmp.id) ||
          auth.employeeId.trim() === empId.trim() ||
          auth.employeeId.trim().replace(/^0+/, '') === empId.trim().replace(/^0+/, '');
        const matchDate = dateStr >= auth.startDate && (!auth.endDate || dateStr <= auth.endDate);
        return matchEmp && matchDate;
      });

      const authorizedLateArrivalMins = activeAuthorization?.allowedLateArrivalMinutes || 0;
      const authorizedEarlyExitMins = activeAuthorization?.allowedEarlyExitMinutes || 0;

      let entryTime: string | null = null;
      let secondCheckInTime: string | null = null;
      let exitTime: string | null = null;
      let isOvernightPunch = false;
      let isHalfDayAbsent = false;
      let halfDaySession: 'morning' | 'afternoon' | undefined = undefined;

      // Resolve Entry and Exit times from raw punches according to shift type
      if (assignedSchedule.crossesMidnight) {
        // Overnight Shift: Shift 2 (18:00 - 02:00) or Shift 4 (16:00 - 00:00)
        entryTime = firstCheckInTime;

        if (entryTime) {
          let foundExit = false;

          // Priority 1: Check next day's early morning punch (Day D+1)
          if (dayNum < daysInMonth) {
            const nextDayRaw = rawEmp.days[dayNum + 1];
            if (nextDayRaw && nextDayRaw.rawPunches.length > 0) {
              const nextEarly = nextDayRaw.rawPunches.find((p) => isEarlyMorningTime(p));
              if (nextEarly) {
                exitTime = nextEarly;
                isOvernightPunch = true;
                consumedEarlyPunchDays.add(dayNum + 1);
                foundExit = true;
              }
            }
          }

          // Priority 2: Check today's available early morning punch (both punches recorded in same day cell)
          if (!foundExit && availableEarlyPunch) {
            exitTime = availableEarlyPunch;
            isOvernightPunch = true;
            consumedEarlyPunchDays.add(dayNum);
            foundExit = true;
          }

          // Priority 3: Check if a second regular punch exists (e.g. exited before midnight like 23:55)
          if (!foundExit && regularPunches.length > 1) {
            exitTime = regularPunches[regularPunches.length - 1];
            foundExit = true;
          }
        }
      } else {
        // Standard Day Shift (Shift 1, Shift 3, Admin Group 1, Admin Group 2, No Shift)
        if (assignedSchedule.id === 'no_shift') {
          if (regularPunches.length === 1) {
            entryTime = regularPunches[0];
            exitTime = null;
          } else if (regularPunches.length > 1) {
            entryTime = regularPunches[0];
            exitTime = regularPunches[regularPunches.length - 1];
            if (regularPunches.length === 2 && entryTime === exitTime) {
              exitTime = null;
            }
          }
        } else if (
          (isAdminWorkerType || isExplicitAdmin || assignedSchedule.department === 'Administration' || assignedSchedule.id.startsWith('admin_')) &&
          assignedSchedule.hasBreak &&
          assignedSchedule.breakStart &&
          assignedSchedule.breakEnd &&
          regularPunches.length > 0
        ) {
          // Half-day absence logic for Admin workers:
          // A schedule with break divides the day into morning session and afternoon session.
          const sBreakStart = parseTimeToMinutes(assignedSchedule.breakStart);
          const sBreakEnd = parseTimeToMinutes(assignedSchedule.breakEnd);

          // All punches are in the morning before the afternoon shift return (< breakEnd - 15m)
          // i.e. worker attended morning, but the entire afterbreak shift is missing!
          const allPunchesMorning = regularPunches.every((p) => parseTimeToMinutes(p) < sBreakEnd - 15);

          // All punches are in the afternoon after morning shift (>= breakStart - 15m)
          // and there are NO morning arrival punches before break (< breakStart - 15m)
          // i.e. missing the morning before break punches, has punches only in the afternoon!
          const hasMorningPunch = regularPunches.some((p) => parseTimeToMinutes(p) < sBreakStart - 15);
          const allPunchesAfternoon = regularPunches.every((p) => parseTimeToMinutes(p) >= sBreakStart - 15);

          if (allPunchesMorning) {
            // Entire afterbreak shift is missing:
            // Admin worker attended morning only -> simply marked as absent for the afternoon (0.5 day worked, 0.5 day absent)
            isHalfDayAbsent = true;
            halfDaySession = 'afternoon';
            entryTime = regularPunches[0];
            exitTime = regularPunches.length > 1 ? regularPunches[regularPunches.length - 1] : assignedSchedule.breakStart;
            secondCheckInTime = null;
          } else if (allPunchesAfternoon && !hasMorningPunch) {
            // Missing morning before break punches, attended afternoon only:
            // Marked as absent for half the day (morning) (0.5 day worked, 0.5 day absent)
            isHalfDayAbsent = true;
            halfDaySession = 'morning';
            firstCheckInTime = null;
            entryTime = null;
            if (regularPunches.length === 1) {
              const pM = parseTimeToMinutes(regularPunches[0]);
              if (pM <= sBreakEnd + 60) {
                secondCheckInTime = regularPunches[0];
                exitTime = assignedSchedule.endTime;
              } else {
                secondCheckInTime = assignedSchedule.breakEnd;
                exitTime = regularPunches[0];
              }
            } else {
              secondCheckInTime = regularPunches[0];
              exitTime = regularPunches[regularPunches.length - 1];
            }
          } else {
            // Punches exist in both morning and afternoon (full day)
            entryTime = regularPunches[0];
            exitTime = regularPunches[regularPunches.length - 1];
            if (regularPunches.length === 2 && entryTime === exitTime) {
              exitTime = null;
            }
          }
        } else if (regularPunches.length === 1) {
          const p = regularPunches[0];
          const pMins = parseTimeToMinutes(p);
          const schedStartMins = parseTimeToMinutes(assignedSchedule.startTime);
          const schedEndMins = parseTimeToMinutes(assignedSchedule.endTime);

          if (Math.abs(pMins - schedStartMins) <= Math.abs(pMins - schedEndMins)) {
            entryTime = p;
          } else {
            exitTime = p;
          }
        } else if (regularPunches.length > 1) {
          entryTime = regularPunches[0];
          exitTime = regularPunches[regularPunches.length - 1];

          // Check if identical duplicate punches (e.g. "08:10", "08:10")
          if (regularPunches.length === 2 && entryTime === exitTime) {
            exitTime = null;
          }
        }
      }

      // Override with manual punch adjustments if explicitly provided
      if (manualAdj?.adjustedEntry !== undefined && manualAdj.adjustedEntry !== '') {
        entryTime = manualAdj.adjustedEntry;
      }
      if (manualAdj?.adjustedExit !== undefined && manualAdj.adjustedExit !== '') {
        exitTime = manualAdj.adjustedExit;
      }
      if (manualAdj?.adjustedSecondCheckIn !== undefined && manualAdj.adjustedSecondCheckIn !== '') {
        secondCheckInTime = manualAdj.adjustedSecondCheckIn;
      }
      if (manualAdj?.isHalfDayAbsent !== undefined) {
        isHalfDayAbsent = Boolean(manualAdj.isHalfDayAbsent);
        if (manualAdj.halfDaySession) {
          halfDaySession = manualAdj.halfDaySession;
        }
      }

      // Extract secondCheckInTime (return from break) if the schedule has a break and not already set:
      if (!secondCheckInTime && !isHalfDayAbsent && assignedSchedule.hasBreak && assignedSchedule.breakEnd) {
        // Collect intermediate regular punches that are between entry and exit
        const intermediatePunches = regularPunches.filter(
          (p) => p !== entryTime && p !== exitTime
        );

        if (intermediatePunches.length === 1) {
          const p = intermediatePunches[0];
          const pMins = parseTimeToMinutes(p);
          const schedBreakEndMins = parseTimeToMinutes(assignedSchedule.breakEnd);
          const schedBreakStartMins = assignedSchedule.breakStart
            ? parseTimeToMinutes(assignedSchedule.breakStart)
            : schedBreakEndMins - (assignedSchedule.breakDurationMinutes || 60);

          const distToStart = Math.abs(pMins - schedBreakStartMins);
          const distToEnd = Math.abs(pMins - schedBreakEndMins);
          if (distToEnd <= distToStart || pMins >= schedBreakEndMins) {
            secondCheckInTime = p;
          }
        } else if (intermediatePunches.length >= 2) {
          // In standard 4-punch attendance [entry, breakOut, breakIn, exit],
          // the last intermediate punch is the return from break (2nd check-in)
          secondCheckInTime = intermediatePunches[intermediatePunches.length - 1];
        }
      }

      // Calculations:
      let firstCheckInDelayMinutes = 0;
      let secondCheckInDelayMinutes = 0;
      let earlyExitMinutes = 0;
      let delayMinutes = 0;
      let workedMinutes = 0;
      let suppMinutes = 0;
      let observation: AttendanceObservation = 'Ponctuel';
      let observationDetail = 'Ponctuel';
      let statusType: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'success';

      const schedStartMins = parseTimeToMinutes(assignedSchedule.startTime);

      // Helper to calculate late time on entry (excluding grace period and authorized allowance from the late duration)
      const computeFirstCheckInDelay = (inTime: string): number => {
        if (!assignedSchedule.startTime || assignedSchedule.startTime === 'Dynamic') return 0;
        const entryMins = parseTimeToMinutes(inTime);
        const rawFirstDelay = entryMins - schedStartMins;
        if (rawFirstDelay <= 0) return 0;
        // Deduct authorized late arrival allowance (e.g. 1h allowed late arrival for distance/maternity)
        const delayAfterAuth = Math.max(0, rawFirstDelay - authorizedLateArrivalMins);
        if (delayAfterAuth <= 0) return 0;
        // Do not include the grace period in the calculated late time
        return delayAfterAuth > arrivalGrace ? delayAfterAuth - arrivalGrace : 0;
      };

      // Helper to calculate late time on break return (excluding grace period from the late duration)
      const computeSecondCheckInDelay = (secondInTime: string): number => {
        if (!assignedSchedule.hasBreak || !assignedSchedule.breakEnd) return 0;
        const secondMins = parseTimeToMinutes(secondInTime);
        let schedBreakEndMins = parseTimeToMinutes(assignedSchedule.breakEnd);

        if (assignedSchedule.crossesMidnight && schedBreakEndMins < schedStartMins) {
          schedBreakEndMins += 24 * 60;
        }

        let rawSecondDelay = secondMins - schedBreakEndMins;
        if (assignedSchedule.crossesMidnight && rawSecondDelay < -12 * 60) {
          rawSecondDelay += 24 * 60;
        }
        if (rawSecondDelay <= 0) return 0;

        // Deduct authorized late arrival allowance if applicable
        const delayAfterAuth = Math.max(0, rawSecondDelay - authorizedLateArrivalMins);
        if (delayAfterAuth <= 0) return 0;

        // Do not include the grace period in the calculated late time
        return delayAfterAuth > breakGrace ? delayAfterAuth - breakGrace : 0;
      };

      // Helper to calculate early departure before scheduled shift end time with 5-minute grace period
      // E.g. shift ends at 17:00 (5 PM):
      // - Exits at 16:55 (4:55): raw diff 5 min <= 5 min grace -> 0 min early exit (not late)
      // - Exits at 16:54 (4:54): raw diff 6 min > 5 min grace -> 6 - 5 = 1 min early exit added to late time
      // - Exits at 16:00 (4:00): raw diff 60 min > 5 min grace -> 60 - 5 = 55 min early exit added to late time
      const computeEarlyExit = (outTime: string): number => {
        if (!assignedSchedule.endTime || assignedSchedule.endTime === 'Dynamic') return 0;
        let schedEndMins = parseTimeToMinutes(assignedSchedule.endTime);
        let outMins = parseTimeToMinutes(outTime);

        if (assignedSchedule.crossesMidnight || isOvernightPunch) {
          if (schedEndMins <= schedStartMins) {
            schedEndMins += 24 * 60;
          }
          if (outMins < schedStartMins || outMins <= 8 * 60) {
            outMins += 24 * 60;
          }
        }

        if (outMins < schedEndMins) {
          const rawEarlyMins = schedEndMins - outMins;
          // Deduct authorized early exit allowance (e.g. 1h or 2h allowed early departure)
          const earlyAfterAuth = Math.max(0, rawEarlyMins - authorizedEarlyExitMins);
          if (earlyAfterAuth <= 0) return 0;
          return earlyAfterAuth > earlyExitGrace ? earlyAfterAuth - earlyExitGrace : 0;
        }
        return 0;
      };

      const isNoShiftSchedule = assignedSchedule.id === 'no_shift';
      const isExactPunchOnly = Boolean(manualAdj?.exactPunchOnly);
      const deductBreak = manualAdj?.deductBreak !== undefined
        ? Boolean(manualAdj.deductBreak)
        : Boolean(options?.settings?.exactPunchDeductBreakDefault);
      const injectedSuppMinutes = manualAdj?.injectedSuppMinutes || 0;
      const isOvertimeEligible = manualAdj?.eligibleForOvertime !== undefined
        ? Boolean(manualAdj.eligibleForOvertime)
        : (dbEmp?.eligibleForOvertime !== undefined
            ? Boolean(dbEmp.eligibleForOvertime)
            : (isAdminWorkerType ? false : Boolean(assignedSchedule.overtimeAllowed)));

      const computeOvertimeMinutes = (otAllowed: boolean, entryM: number, exitM: number): number => {
        if (!otAllowed) return 0;
        if (exitM <= 0) return 0;

        let otStartMins = 0;
        if (assignedSchedule.overtimeStartTime) {
          otStartMins = parseTimeToMinutes(assignedSchedule.overtimeStartTime);
        } else if (assignedSchedule.endTime && assignedSchedule.endTime !== 'Dynamic' && assignedSchedule.id !== 'no_shift') {
          otStartMins = parseTimeToMinutes(assignedSchedule.endTime);
        } else if (assignedSchedule.normalWorkedHours) {
          otStartMins = entryM + Math.round(assignedSchedule.normalWorkedHours * 60) + (assignedSchedule.hasBreak ? (assignedSchedule.breakDurationMinutes || 0) : 0);
        } else {
          otStartMins = entryM + 8 * 60;
        }

        if (assignedSchedule.crossesMidnight && otStartMins < schedStartMins) {
          otStartMins += 24 * 60;
        }

        if (exitM > otStartMins) {
          const rawOt = exitM - otStartMins;
          return rawOt > overtimeGrace ? rawOt : 0;
        }
        return 0;
      };

      if (isNoShiftSchedule || isExactPunchOnly) {
        firstCheckInDelayMinutes = 0;
        secondCheckInDelayMinutes = 0;
        earlyExitMinutes = 0;
        delayMinutes = 0;
      } else if (isHalfDayAbsent) {
        // Half-day absence: calculate late arrival / early departure for the attended session
        if (halfDaySession === 'afternoon') {
          // Attended MORNING session (absent in afternoon)
          firstCheckInDelayMinutes = entryTime ? computeFirstCheckInDelay(entryTime) : 0;
          secondCheckInDelayMinutes = 0;

          earlyExitMinutes = 0;
          if (exitTime && assignedSchedule.breakStart) {
            const schedBreakStartM = parseTimeToMinutes(assignedSchedule.breakStart);
            const exitM = parseTimeToMinutes(exitTime);
            if (exitM < schedBreakStartM) {
              const rawEarly = schedBreakStartM - exitM;
              const earlyAfterAuth = Math.max(0, rawEarly - authorizedEarlyExitMins);
              earlyExitMinutes = earlyAfterAuth > earlyExitGrace ? earlyAfterAuth - earlyExitGrace : 0;
            }
          }

          delayMinutes = firstCheckInDelayMinutes + earlyExitMinutes;
        } else {
          // Attended AFTERNOON session (absent in morning)
          firstCheckInDelayMinutes = 0;
          const afternoonInTime = secondCheckInTime || entryTime;
          secondCheckInDelayMinutes = afternoonInTime ? computeSecondCheckInDelay(afternoonInTime) : 0;

          earlyExitMinutes = 0;
          if (exitTime) {
            earlyExitMinutes = computeEarlyExit(exitTime);
          }

          delayMinutes = secondCheckInDelayMinutes + earlyExitMinutes;
        }
      } else {
        if (entryTime) {
          firstCheckInDelayMinutes = computeFirstCheckInDelay(entryTime);
        }

        // Count late time on 2nd check-in (after break) for Admin workers only.
        // Excludes the 10 min break grace from the total late duration.
        if (isAdminWorkerType && secondCheckInTime) {
          secondCheckInDelayMinutes = computeSecondCheckInDelay(secondCheckInTime);
        } else {
          secondCheckInDelayMinutes = 0;
        }

        earlyExitMinutes = 0;
        if (exitTime) {
          earlyExitMinutes = computeEarlyExit(exitTime);
        }

        delayMinutes = firstCheckInDelayMinutes + secondCheckInDelayMinutes + earlyExitMinutes;
      }

      if (isShiftUnclear) {
        firstCheckInDelayMinutes = 0;
        secondCheckInDelayMinutes = 0;
        earlyExitMinutes = 0;
        delayMinutes = 0;
        // Shift could not be clearly identified
        observation = 'SHIFT UNCLEAR';
        observationDetail = `Pointage ${firstCheckInTime} ne correspond à aucun shift (Révision requise)`;
        statusType = 'warning';

        // Calculate hours if both punches exist
        if (entryTime && exitTime) {
          const eM = parseTimeToMinutes(entryTime);
          let xM = parseTimeToMinutes(exitTime);
          if (xM < eM) xM += 24 * 60;
          const dur = Math.max(0, xM - eM);
          const breakMins = isExactPunchOnly ? 0 : (assignedSchedule.breakDurationMinutes || 60);
          workedMinutes = Math.max(0, dur - breakMins);
        }
      } else if (!entryTime && !exitTime) {
        if (!isWorkingDay) {
          observation = 'OFF';
          observationDetail = 'OFF';
          statusType = 'neutral';
        } else if (consumedEarlyPunchDays.has(dayNum) || isEarlyPunchConsumed || (earlyMorningPunches.length > 0 && regularPunches.length === 0)) {
          // Employee worked night shift ending this morning; today is post-night shift rest
          observation = 'OFF';
          observationDetail = 'Repos post-nuit';
          statusType = 'neutral';
        } else {
          observation = 'Absence';
          observationDetail = 'Absence';
          statusType = 'danger';
        }
      } else if (isHalfDayAbsent) {
        // Half-day absence: 0.5 day worked, 0.5 day absent
        // Dynamically compute session target minutes based on the attended session (Morning vs Afternoon)
        let sessionTargetMins = 0;
        if (assignedSchedule.hasBreak && assignedSchedule.breakStart && assignedSchedule.breakEnd) {
          const sStartM = parseTimeToMinutes(assignedSchedule.startTime);
          const sBreakStartM = parseTimeToMinutes(assignedSchedule.breakStart);
          const sBreakEndM = parseTimeToMinutes(assignedSchedule.breakEnd);
          const sEndM = parseTimeToMinutes(assignedSchedule.endTime);

          if (halfDaySession === 'afternoon') {
            // Attended morning session (e.g. 08:30 to 12:30 = 240 mins / 4h00)
            sessionTargetMins = Math.max(0, sBreakStartM - sStartM);
          } else {
            // Attended afternoon session (e.g. 14:00 to 17:00 = 180 mins / 3h00)
            sessionTargetMins = Math.max(0, sEndM - sBreakEndM);
          }
        } else {
          sessionTargetMins = Math.round((assignedSchedule.normalWorkedHours / 2) * 60);
        }

        if (halfDaySession === 'afternoon') {
          // Attended morning session (e.g. 08:30 to 12:30 = 240 mins / 4h00)
          // Deduct late arrival and early exit penalties from the session target hours
          workedMinutes = Math.max(0, sessionTargetMins - delayMinutes);
          suppMinutes = 0;
          observation = 'Absent (Après-midi)';
          observationDetail = delayMinutes > 0
            ? `Absent (Après-midi) (Retard: ${delayMinutes} min)`
            : 'Absent (Après-midi)';
          statusType = 'warning';
        } else {
          // Attended afternoon session (e.g. 14:00 to 17:00 = 180 mins / 3h00)
          // Deduct late arrival and early exit penalties from the 3 hours
          workedMinutes = Math.max(0, sessionTargetMins - delayMinutes);
          suppMinutes = 0;
          observation = 'Absent (Matin)';
          observationDetail = delayMinutes > 0
            ? `Absent (Matin) (Retard: ${delayMinutes} min)`
            : 'Absent (Matin)';
          statusType = 'warning';
        }
      } else if (entryTime && !exitTime) {
        // Missing exit
        observation = 'Sortie non pointée';
        if (isExactPunchOnly) {
          observationDetail = 'Sortie non pointée (Pointage exact)';
        } else if (delayMinutes > 0) {
          if (firstCheckInDelayMinutes > 0 && secondCheckInDelayMinutes > 0) {
            observationDetail = `Sortie non pointée (Retard: ${delayMinutes} min [Entrée ${firstCheckInDelayMinutes}m, Pause ${secondCheckInDelayMinutes}m])`;
          } else if (secondCheckInDelayMinutes > 0) {
            observationDetail = `Sortie non pointée (Retard reprise pause: ${secondCheckInDelayMinutes} min)`;
          } else {
            observationDetail = `Sortie non pointée (Retard: ${delayMinutes} min)`;
          }
        } else {
          observationDetail = 'Sortie non pointée';
        }
        statusType = 'warning';
      } else if (!entryTime && exitTime) {
        // Missing entry
        observation = 'Entrée non pointée';
        if (isExactPunchOnly) {
          observationDetail = 'Entrée non pointée (Pointage exact)';
        } else if (delayMinutes > 0) {
          const breakdownParts: string[] = [];
          if (secondCheckInDelayMinutes > 0) breakdownParts.push(`Pause ${secondCheckInDelayMinutes}m`);
          if (earlyExitMinutes > 0) breakdownParts.push(`Sortie anticipée ${earlyExitMinutes}m`);
          observationDetail = `Entrée non pointée (Retard: ${delayMinutes} min [${breakdownParts.join(' + ')}])`;
        } else {
          observationDetail = 'Entrée non pointée';
        }
        statusType = 'warning';
      } else if (entryTime && exitTime) {
        // Both punches exist!
        const entryMins = parseTimeToMinutes(entryTime);
        let exitMins = parseTimeToMinutes(exitTime);

        // If overnight shift or exit < entry (e.g. 18:04 in, 02:05 out)
        if (assignedSchedule.crossesMidnight || exitMins < entryMins || isOvernightPunch) {
          if (exitMins < entryMins || exitMins <= 8 * 60) {
            exitMins += 24 * 60;
            isOvernightPunch = true;
          }
        }

        if (isNoShiftSchedule) {
          // Employee follows NO SHIFT: calculates their work hours strictly from check-in to check-out normally!
          firstCheckInDelayMinutes = 0;
          secondCheckInDelayMinutes = 0;
          earlyExitMinutes = 0;
          delayMinutes = 0;

          const totalDuration = exitMins > entryMins ? exitMins - entryMins : 0;
          if (isOvertimeEligible && totalDuration > 0) {
            const normalTarget = Math.round(assignedSchedule.normalWorkedHours * 60);
            if (totalDuration > normalTarget) {
              const rawOt = totalDuration - normalTarget;
              if (rawOt > overtimeGrace) {
                suppMinutes = rawOt;
                workedMinutes = normalTarget;
              } else {
                suppMinutes = 0;
                workedMinutes = totalDuration;
              }
            } else {
              workedMinutes = totalDuration;
              suppMinutes = 0;
            }
          } else {
            workedMinutes = totalDuration;
            suppMinutes = 0;
          }
          observation = 'Ponctuel';
          observationDetail = 'Ponctuel (Sans Shift)';
          statusType = 'success';
        } else if (isExactPunchOnly) {
          // Ignore late arrival, 2nd check-in delay, and early departure for this day
          // Count working hours between check-in and check-out, and set status to On Time (Ponctuel)
          firstCheckInDelayMinutes = 0;
          secondCheckInDelayMinutes = 0;
          earlyExitMinutes = 0;
          delayMinutes = 0;

          // Overtime (Supp Hours) calculation if overtime allowed / eligible
          suppMinutes = computeOvertimeMinutes(isOvertimeEligible, entryMins, exitMins);

          // Calculate Worked Hours based on whether pause time is deducted or included
          const totalDurationMins = Math.max(0, exitMins - entryMins);

          if (deductBreak) {
            // Deduct the pause/break time from worked hours
            const breakDeduction = assignedSchedule.hasBreak ? (assignedSchedule.breakDurationMinutes || 0) : 0;
            const netDurationBeforeOt = Math.max(0, totalDurationMins - suppMinutes - breakDeduction);
            const targetNormalMins = Math.round(assignedSchedule.normalWorkedHours * 60);

            if (netDurationBeforeOt >= targetNormalMins) {
              workedMinutes = targetNormalMins;
            } else {
              workedMinutes = netDurationBeforeOt;
            }

            observation = 'Ponctuel';
            observationDetail = 'Ponctuel (Pause déduite)';
            statusType = 'success';
          } else {
            // Do NOT deduct the pause time (include pause time in worked hours)
            const netDurationBeforeOt = Math.max(0, totalDurationMins - suppMinutes);
            const fullShiftMins = Math.round(
              (assignedSchedule.normalWorkedHours * 60) +
              (assignedSchedule.hasBreak ? (assignedSchedule.breakDurationMinutes || 0) : 0)
            );

            if (netDurationBeforeOt >= fullShiftMins) {
              workedMinutes = fullShiftMins;
            } else {
              workedMinutes = netDurationBeforeOt;
            }

            observation = 'Ponctuel';
            observationDetail = 'Ponctuel (Pause incluse)';
            statusType = 'success';
          }
        } else {
          // 2. Calculate Overtime (Supp Hours)
          suppMinutes = computeOvertimeMinutes(isOvertimeEligible, entryMins, exitMins);

          // 3. Calculate Worked Hours
          const totalDurationMins = Math.max(0, exitMins - entryMins);
          const breakDeduction = assignedSchedule.hasBreak ? assignedSchedule.breakDurationMinutes : 0;
          const netDurationBeforeOt = Math.max(0, totalDurationMins - suppMinutes - breakDeduction);
          const targetNormalMins = Math.round(assignedSchedule.normalWorkedHours * 60);

          // Credit authorized dispensation time towards normal working hours
          const totalAuthorizedDispensationMins = authorizedLateArrivalMins + authorizedEarlyExitMins;
          const effectiveDuration = netDurationBeforeOt + totalAuthorizedDispensationMins;

          if (effectiveDuration >= targetNormalMins) {
            workedMinutes = targetNormalMins;
          } else {
            workedMinutes = effectiveDuration;
          }

          // Observation
          if (delayMinutes > 0) {
            observation = 'Retard';
            const breakdownParts: string[] = [];
            if (firstCheckInDelayMinutes > 0) breakdownParts.push(`Entrée ${firstCheckInDelayMinutes}m`);
            if (secondCheckInDelayMinutes > 0) breakdownParts.push(`Pause ${secondCheckInDelayMinutes}m`);
            if (earlyExitMinutes > 0) breakdownParts.push(`Sortie anticipée ${earlyExitMinutes}m`);

            if (breakdownParts.length > 1) {
              observationDetail = `Retard ${delayMinutes} min (${breakdownParts.join(' + ')})`;
            } else if (firstCheckInDelayMinutes > 0) {
              observationDetail = `Retard ${delayMinutes} min`;
            } else if (secondCheckInDelayMinutes > 0) {
              observationDetail = `Retard ${secondCheckInDelayMinutes} min (Reprise pause)`;
            } else if (earlyExitMinutes > 0) {
              observationDetail = `Retard ${earlyExitMinutes} min (Sortie anticipée)`;
            } else {
              observationDetail = `Retard ${delayMinutes} min`;
            }
            statusType = 'warning';
          } else if (isOvernightPunch) {
            observation = 'Sortie après minuit';
            observationDetail = 'Sortie après minuit';
            statusType = 'info';
          } else if (activeAuthorization && (authorizedLateArrivalMins > 0 || authorizedEarlyExitMins > 0)) {
            observation = 'Ponctuel';
            observationDetail = `Ponctuel (${activeAuthorization.reason || 'Autorisation'})`;
            statusType = 'success';
          } else {
            observation = 'Ponctuel';
            observationDetail = 'Ponctuel';
            statusType = 'success';
          }
        }
      }

      // Injected Supp Hours (Manual Overtime Injection by Supervisor/Admin)
      if (injectedSuppMinutes > 0) {
        suppMinutes += injectedSuppMinutes;
        if (observation === 'OFF') {
          observationDetail = `OFF (+${formatMinutesToHoursAndMinutes(injectedSuppMinutes)} Supp)`;
        } else if (observation === 'Ponctuel') {
          observationDetail = `Ponctuel (+${formatMinutesToHoursAndMinutes(injectedSuppMinutes)} Supp)`;
        }
      }

      // Format representations
      const workedHoursFormatted = formatMinutesToHoursAndMinutes(workedMinutes);
      const suppHoursFormatted = suppMinutes > 0 ? formatMinutesToHoursAndMinutes(suppMinutes) : '0';
      const workedDecimalHours = Math.round((workedMinutes / 60) * 100) / 100;
      const suppDecimalHours = Math.round((suppMinutes / 60) * 100) / 100;

      const dateParts = dateStr.split('-');
      const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

      dailyRecords.push({
        id: recordKey,
        date: dateStr,
        formattedDate,
        dayOfWeek,
        employeeId: empId,
        employeeName: rawEmp.name,
        rawDepartment: rawEmp.rawDepartment,
        companyDepartment: companyDept,
        groupName: dayGroupName,
        scheduleId: assignedSchedule.id,
        scheduleName: isStock
          ? isShiftUnclear
            ? 'SHIFT UNCLEAR'
            : detectedShiftName !== '-'
              ? `Stock ${detectedShiftName}`
              : 'Stock (Dynamic)'
          : assignedSchedule.name,
        isWorkingDay,
        workerType: isStock ? 'Stock' : 'Admin',
        isAdminWorkerType: !isStock,
        isDynamicShift: isStock,
        detectedShiftId,
        detectedShiftName,
        isShiftUnclear,
        rawPunches,
        rawPunchesText,
        firstCheckInTime,
        secondCheckInTime,
        entryTime,
        exitTime,
        isOvernightPunch,
        manualAdjustment: manualAdj,
        isManuallyAdjusted: Boolean(
          manualAdj &&
            (manualAdj.adjustedEntry ||
              manualAdj.adjustedExit ||
              manualAdj.adjustedSecondCheckIn ||
              manualAdj.overrideShiftId ||
              manualAdj.eligibleForOvertime !== undefined ||
              manualAdj.isHalfDayAbsent !== undefined ||
              (manualAdj.injectedSuppMinutes && manualAdj.injectedSuppMinutes > 0))
        ),
        exactPunchOnly: isExactPunchOnly,
        deductBreak: isExactPunchOnly ? deductBreak : undefined,
        eligibleForOvertime: isOvertimeEligible,
        injectedSuppMinutes: injectedSuppMinutes > 0 ? injectedSuppMinutes : undefined,
        firstCheckInDelayMinutes,
        secondCheckInDelayMinutes,
        earlyExitMinutes,
        delayMinutes,
        breakDurationMinutes: isNoShiftSchedule
          ? 0
          : (isExactPunchOnly
              ? (deductBreak ? (assignedSchedule.hasBreak ? (assignedSchedule.breakDurationMinutes || 0) : 0) : 0)
              : (assignedSchedule.hasBreak ? (assignedSchedule.breakDurationMinutes || 0) : 0)),
        workedMinutes,
        workedHoursFormatted,
        workedDecimalHours,
        suppMinutes,
        suppHoursFormatted,
        suppDecimalHours,
        isHalfDayAbsent,
        halfDaySession,
        hasTimeAuthorization: Boolean(activeAuthorization),
        timeAuthorizationReason: activeAuthorization?.reason,
        allowedLateArrivalMinutes: authorizedLateArrivalMins > 0 ? authorizedLateArrivalMins : undefined,
        allowedEarlyExitMinutes: authorizedEarlyExitMins > 0 ? authorizedEarlyExitMins : undefined,
        workedDaysCredit: isHalfDayAbsent ? 0.5 : (observation === 'Absence' || observation === 'OFF' ? 0 : 1),
        absentDaysCredit: isHalfDayAbsent ? 0.5 : (observation === 'Absence' ? 1 : 0),
        observation,
        observationDetail,
        statusType,
        isArchived,
      });
    }
  }

  // Generate Monthly Summary
  const monthlySummary = generateMonthlySummaryFromDailyRecords(dailyRecords);

  return { dailyRecords, monthlySummary };
}

/**
 * Computes aggregated attendance summary metrics from any subset of daily attendance records
 * (e.g. for a custom date range filter like 01/09/2026 to 08/09/2026)
 */
export function generateMonthlySummaryFromDailyRecords(
  dailyRecords: DailyAttendanceRecord[]
): MonthlySummaryRecord[] {
  const summaryMap = new Map<string, MonthlySummaryRecord>();

  for (const record of dailyRecords) {
    let summary = summaryMap.get(record.employeeId);
    if (!summary) {
      summary = {
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        companyDepartment: record.companyDepartment,
        groupName: record.isDynamicShift ? 'Stock' : record.groupName,
        scheduleName: record.isDynamicShift ? 'Stock (Dynamic Daily Shifts)' : record.scheduleName,
        isArchived: record.isArchived,
        scheduledWorkingDays: 0,
        presentDays: 0,
        paidVacationDays: 0,
        absentDays: 0,
        offDays: 0,
        lateDays: 0,
        totalLateMinutes: 0,
        missingPunchesDays: 0,
        missingEntryCount: 0,
        missingExitCount: 0,
        totalWorkedMinutes: 0,
        totalWorkedFormatted: '0h 00',
        totalSuppMinutes: 0,
        totalSuppFormatted: '0h 00',
        totalPunchesCount: 0,
      };
      summaryMap.set(record.employeeId, summary);
    }

    // Accumulate punches count for this day
    const dayPunchesCount = (record.rawPunches && record.rawPunches.length > 0)
      ? record.rawPunches.length
      : ((record.firstCheckInTime || record.entryTime ? 1 : 0) +
         (record.secondCheckInTime ? 1 : 0) +
         (record.exitTime ? 1 : 0));
    summary.totalPunchesCount = (summary.totalPunchesCount || 0) + dayPunchesCount;

    if (record.isWorkingDay) {
      summary.scheduledWorkingDays += 1;
    }

    if (record.observation === 'OFF') {
      summary.offDays += 1;
    } else if (record.observation === 'Congé payé' || record.observation === 'Congé / Férié' || record.isPaidVacation) {
      summary.paidVacationDays = (summary.paidVacationDays || 0) + 1;
      summary.presentDays += 1;
    } else if (record.observation === 'Absence') {
      summary.absentDays += 1;
    } else if (
      record.observation === 'Absent (Après-midi)' ||
      record.observation === 'Absent (Matin)' ||
      record.isHalfDayAbsent
    ) {
      // Half-day absence: 0.5 day worked, 0.5 day absent
      summary.presentDays += 0.5;
      summary.absentDays += 0.5;
    } else if (record.observation === 'Entrée non pointée') {
      summary.missingPunchesDays += 1;
      summary.missingEntryCount += 1;
      summary.presentDays += 1;
    } else if (record.observation === 'Sortie non pointée') {
      summary.missingPunchesDays += 1;
      summary.missingExitCount += 1;
      summary.presentDays += 1;
    } else {
      // Ponctuel, Retard, Sortie après minuit, SHIFT UNCLEAR with attendance
      summary.presentDays += 1;
    }

    if (record.delayMinutes > 0) {
      summary.lateDays += 1;
      summary.totalLateMinutes += record.delayMinutes;
    }

    summary.totalWorkedMinutes += record.workedMinutes;
    summary.totalSuppMinutes += record.suppMinutes;
  }

  return Array.from(summaryMap.values()).map((s) => ({
    ...s,
    totalWorkedFormatted: formatMinutesToHoursAndMinutes(s.totalWorkedMinutes),
    totalSuppFormatted: formatMinutesToHoursAndMinutes(s.totalSuppMinutes),
  }));
}

/**
 * Formats a day count (e.g. 21.5 or 0.5) according to locale (French uses comma '21,5', English uses '21.5')
 */
export function formatDaysNumber(val: number, lang: string = 'fr'): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  if (Number.isInteger(val)) return val.toString();
  const fixed = val.toFixed(1);
  return lang === 'fr' ? fixed.replace('.', ',') : fixed;
}

