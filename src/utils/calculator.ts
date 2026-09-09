import {
  RawAttendanceDataset,
  Employee,
  WorkSchedule,
  DailyAttendanceRecord,
  MonthlySummaryRecord,
  AttendanceObservation,
  ManualAdjustment,
  AppSettings,
} from '../types';
import {
  DEFAULT_SCHEDULES,
  STOCK_SHIFT_1,
  STOCK_SHIFT_2,
  STOCK_SHIFT_3,
  STOCK_SHIFT_4,
  STOCK_DYNAMIC_SCHEDULE,
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
  settings?: AppSettings;
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

    // Resolve employee category:
    // 1. Explicit ADMIN designation
    // 2. Explicit STOCK designation
    // 3. Fallback based on department text
    const isExplicitAdmin = isAdminWorker(empId);
    const isExplicitStock = isStockWorker(empId);

    let isStock = false;
    let companyDept = 'Administration';
    let defaultGroupName = 'Admin Group 1';
    let baseSchedule: WorkSchedule = DEFAULT_SCHEDULES[0];

    if (isExplicitAdmin) {
      isStock = false;
      companyDept = 'Administration';
      defaultGroupName = 'Admin Group 1';
      baseSchedule = scheduleMap.get('admin_g1') || DEFAULT_SCHEDULES[0];
    } else if (isExplicitStock) {
      isStock = true;
      companyDept = 'Stock & Logistique';
      defaultGroupName = 'Stock';
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

      if (isStock) {
        // STOCK EMPLOYEE: Dynamic Shift Detection per individual day!
        if (manualAdj?.overrideShiftId) {
          // Manual supervisor override
          const over = scheduleMap.get(manualAdj.overrideShiftId) || STOCK_SHIFT_1;
          assignedSchedule = over;
          detectedShiftId = over.id;
          detectedShiftName = over.name.split(' (')[0];
          dayGroupName = `Stock ${detectedShiftName}`;
        } else if (firstCheckInTime) {
          // Auto-detect based on first check-in time
          const detected = detectStockShift(firstCheckInTime);
          detectedShiftId = detected.shiftId;
          detectedShiftName = detected.shiftName;
          isShiftUnclear = detected.isUnclear;

          if (detected.schedule) {
            assignedSchedule = detected.schedule;
            dayGroupName = `Stock ${detected.shiftName}`;
          } else {
            // Unclear shift
            assignedSchedule = STOCK_SHIFT_1; // fallback baseline for work hours
            dayGroupName = 'Stock (Shift Unclear)';
          }
        } else {
          // No regular check-in today (e.g. rest day, or day after night shift with only 02:00 exit)
          assignedSchedule = STOCK_SHIFT_1;
          detectedShiftId = 'NONE';
          detectedShiftName = '-';
          dayGroupName = 'Stock';
        }
      } else {
        // ADMIN EMPLOYEE: Standard schedule
        detectedShiftId = assignedSchedule.id;
        detectedShiftName = assignedSchedule.groupName;
        dayGroupName = defaultGroupName;
      }

      const isWorkingDay = assignedSchedule.workingDays.includes(dayOfWeek);
      const arrivalGrace = assignedSchedule.arrivalGraceMinutes ?? globalArrivalGrace;
      const breakGrace = assignedSchedule.breakGraceMinutes ?? globalBreakGrace;
      const overtimeGrace = assignedSchedule.overtimeGraceMinutes ?? globalOvertimeGrace;

      let entryTime: string | null = null;
      let exitTime: string | null = null;
      let isOvernightPunch = false;

      // Resolve Entry and Exit times
      if (manualAdj) {
        if (manualAdj.adjustedEntry) entryTime = manualAdj.adjustedEntry;
        if (manualAdj.adjustedExit) exitTime = manualAdj.adjustedExit;
      } else if (assignedSchedule.crossesMidnight) {
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
        // Standard Day Shift (Shift 1, Shift 3, Admin Group 1, Admin Group 2)
        if (regularPunches.length === 1) {
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

      // Extract secondCheckInTime (return from break) if the schedule has a break:
      let secondCheckInTime: string | null = null;
      if (manualAdj?.adjustedSecondCheckIn) {
        secondCheckInTime = manualAdj.adjustedSecondCheckIn;
      } else if (assignedSchedule.hasBreak && assignedSchedule.breakEnd) {
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
      let delayMinutes = 0;
      let workedMinutes = 0;
      let suppMinutes = 0;
      let observation: AttendanceObservation = 'Ponctuel';
      let observationDetail = 'Ponctuel';
      let statusType: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'success';

      const schedStartMins = parseTimeToMinutes(assignedSchedule.startTime);

      // Helper to calculate late time on entry (past 10m grace)
      const computeFirstCheckInDelay = (inTime: string): number => {
        if (!assignedSchedule.startTime || assignedSchedule.startTime === 'Dynamic') return 0;
        const entryMins = parseTimeToMinutes(inTime);
        const rawFirstDelay = entryMins - schedStartMins;
        return rawFirstDelay > arrivalGrace ? rawFirstDelay : 0;
      };

      // Helper to calculate late time on break return (past 10m grace)
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

        return rawSecondDelay > breakGrace ? rawSecondDelay : 0;
      };

      if (entryTime) {
        firstCheckInDelayMinutes = computeFirstCheckInDelay(entryTime);
      }
      if (secondCheckInTime) {
        secondCheckInDelayMinutes = computeSecondCheckInDelay(secondCheckInTime);
      }
      delayMinutes = firstCheckInDelayMinutes + secondCheckInDelayMinutes;

      if (isShiftUnclear) {
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
          workedMinutes = Math.max(0, dur - (assignedSchedule.breakDurationMinutes || 60));
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
      } else if (entryTime && !exitTime) {
        // Missing exit
        observation = 'Sortie non pointée';
        if (delayMinutes > 0) {
          observationDetail = `Sortie non pointée (Retard: ${delayMinutes} min)`;
        } else {
          observationDetail = 'Sortie non pointée';
        }
        statusType = 'warning';
      } else if (!entryTime && exitTime) {
        // Missing entry
        observation = 'Entrée non pointée';
        if (secondCheckInDelayMinutes > 0) {
          observationDetail = `Entrée non pointée (Retard reprise pause: ${secondCheckInDelayMinutes} min)`;
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

        // 2. Calculate Overtime (Supp Hours)
        if (assignedSchedule.overtimeAllowed && assignedSchedule.overtimeStartTime) {
          let otStartMins = parseTimeToMinutes(assignedSchedule.overtimeStartTime);
          if (assignedSchedule.crossesMidnight && otStartMins < schedStartMins) {
            otStartMins += 24 * 60;
          }

          if (exitMins > otStartMins) {
            const rawOt = exitMins - otStartMins;
            if (rawOt <= overtimeGrace) {
              suppMinutes = 0;
            } else {
              suppMinutes = rawOt;
            }
          }
        }

        // 3. Calculate Worked Hours
        const totalDurationMins = Math.max(0, exitMins - entryMins);
        const breakDeduction = assignedSchedule.hasBreak ? assignedSchedule.breakDurationMinutes : 0;
        const netDurationBeforeOt = Math.max(0, totalDurationMins - suppMinutes - breakDeduction);
        const targetNormalMins = Math.round(assignedSchedule.normalWorkedHours * 60);

        if (netDurationBeforeOt >= targetNormalMins) {
          workedMinutes = targetNormalMins;
        } else {
          workedMinutes = netDurationBeforeOt;
        }

        // Observation
        if (delayMinutes > 0) {
          observation = 'Retard';
          if (firstCheckInDelayMinutes > 0 && secondCheckInDelayMinutes > 0) {
            observationDetail = `Retard ${delayMinutes} min (Entrée: ${firstCheckInDelayMinutes}m, Pause: ${secondCheckInDelayMinutes}m)`;
          } else if (firstCheckInDelayMinutes > 0) {
            observationDetail = `Retard ${firstCheckInDelayMinutes} min (Entrée)`;
          } else {
            observationDetail = `Retard ${secondCheckInDelayMinutes} min (Reprise pause)`;
          }
          statusType = 'warning';
        } else if (isOvernightPunch) {
          observation = 'Sortie après minuit';
          observationDetail = 'Sortie après minuit';
          statusType = 'info';
        } else {
          observation = 'Ponctuel';
          observationDetail = 'Ponctuel';
          statusType = 'success';
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
        isManuallyAdjusted: Boolean(manualAdj),
        firstCheckInDelayMinutes,
        secondCheckInDelayMinutes,
        delayMinutes,
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
      });
    }
  }

  // Generate Monthly Summary
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
        scheduledWorkingDays: 0,
        presentDays: 0,
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
      };
      summaryMap.set(record.employeeId, summary);
    }

    if (record.isWorkingDay) {
      summary.scheduledWorkingDays += 1;
    }

    if (record.observation === 'OFF') {
      summary.offDays += 1;
    } else if (record.observation === 'Absence') {
      summary.absentDays += 1;
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

  const monthlySummary: MonthlySummaryRecord[] = Array.from(summaryMap.values()).map((s) => ({
    ...s,
    totalWorkedFormatted: formatMinutesToHoursAndMinutes(s.totalWorkedMinutes),
    totalSuppFormatted: formatMinutesToHoursAndMinutes(s.totalSuppMinutes),
  }));

  return { dailyRecords, monthlySummary };
}
