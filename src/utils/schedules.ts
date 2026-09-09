import { WorkSchedule, DayOfWeek } from '../types';

export const STOCK_SHIFT_1: WorkSchedule = {
  id: 'stock_g1',
  name: 'Shift 1 (10:00 - 18:00)',
  groupName: 'Stock Shift 1',
  department: 'Stock & Logistique',
  startTime: '10:00',
  endTime: '18:00',
  crossesMidnight: false,
  hasBreak: true,
  breakStart: '13:00',
  breakEnd: '14:00',
  breakDurationMinutes: 60,
  overtimeAllowed: true,
  overtimeStartTime: '18:00',
  normalWorkedHours: 7.0,
  workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  arrivalGraceMinutes: 0,
  overtimeGraceMinutes: 15,
};

export const STOCK_SHIFT_2: WorkSchedule = {
  id: 'stock_g2',
  name: 'Shift 2 (18:00 - 02:00)',
  groupName: 'Stock Shift 2',
  department: 'Stock & Logistique',
  startTime: '18:00',
  endTime: '02:00',
  crossesMidnight: true,
  hasBreak: true,
  breakStart: '21:00',
  breakEnd: '22:00',
  breakDurationMinutes: 60,
  overtimeAllowed: true,
  overtimeStartTime: '02:00', // overtime starts 02:00 next day
  normalWorkedHours: 7.0,
  workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  arrivalGraceMinutes: 0,
  overtimeGraceMinutes: 15,
};

export const STOCK_SHIFT_3: WorkSchedule = {
  id: 'stock_g3',
  name: 'Shift 3 (08:30 - 16:00)',
  groupName: 'Stock Shift 3',
  department: 'Stock & Logistique',
  startTime: '08:30',
  endTime: '16:00',
  crossesMidnight: false,
  hasBreak: true,
  breakStart: '12:00',
  breakEnd: '13:00',
  breakDurationMinutes: 60,
  overtimeAllowed: true,
  overtimeStartTime: '16:00',
  normalWorkedHours: 6.5,
  workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  arrivalGraceMinutes: 0,
  overtimeGraceMinutes: 15,
};

export const STOCK_SHIFT_4: WorkSchedule = {
  id: 'stock_g4',
  name: 'Shift 4 (16:00 - 00:00)',
  groupName: 'Stock Shift 4',
  department: 'Stock & Logistique',
  startTime: '16:00',
  endTime: '00:00',
  crossesMidnight: true,
  hasBreak: true,
  breakStart: '21:00',
  breakEnd: '22:00',
  breakDurationMinutes: 60,
  overtimeAllowed: true,
  overtimeStartTime: '00:00', // overtime starts 00:00 midnight next day
  normalWorkedHours: 7.0,
  workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  arrivalGraceMinutes: 0,
  overtimeGraceMinutes: 15,
};

export const STOCK_DYNAMIC_SCHEDULE: WorkSchedule = {
  id: 'stock_dynamic',
  name: 'Stock (Dynamic Daily Shift)',
  groupName: 'Stock',
  department: 'Stock & Logistique',
  startTime: 'Dynamic',
  endTime: 'Dynamic',
  crossesMidnight: false,
  hasBreak: true,
  breakDurationMinutes: 60,
  overtimeAllowed: true,
  normalWorkedHours: 7.0,
  workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  arrivalGraceMinutes: 0,
  overtimeGraceMinutes: 15,
};

export const DEFAULT_SCHEDULES: WorkSchedule[] = [
  {
    id: 'admin_g1',
    name: 'Admin Group 1 (08:30 - 17:00)',
    groupName: 'Admin Group 1',
    department: 'Administration',
    startTime: '08:30',
    endTime: '17:00',
    crossesMidnight: false,
    hasBreak: true,
    breakStart: '12:30',
    breakEnd: '14:00',
    breakDurationMinutes: 90,
    overtimeAllowed: false,
    normalWorkedHours: 6.0,
    workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    arrivalGraceMinutes: 0,
    overtimeGraceMinutes: 15,
  },
  {
    id: 'admin_g2',
    name: 'Admin Group 2 (17:00 - 21:00)',
    groupName: 'Admin Group 2',
    department: 'Administration',
    startTime: '17:00',
    endTime: '21:00',
    crossesMidnight: false,
    hasBreak: false,
    breakDurationMinutes: 0,
    overtimeAllowed: false,
    normalWorkedHours: 4.0,
    workingDays: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    arrivalGraceMinutes: 0,
    overtimeGraceMinutes: 15,
  },
  STOCK_DYNAMIC_SCHEDULE,
  STOCK_SHIFT_1,
  STOCK_SHIFT_2,
  STOCK_SHIFT_3,
  STOCK_SHIFT_4,
];

export interface DetectedShiftResult {
  schedule: WorkSchedule | null;
  shiftId: string;
  shiftName: string;
  isUnclear: boolean;
}

/**
 * Automatically determines which shift a Stock employee worked on a given date
 * based on their actual first check-in time.
 *
 * Expected Stock shift check-in targets:
 * - Shift 3: 08:30 (Window: 07:00 - 09:14, e.g. 08:35)
 * - Shift 1: 10:00 (Window: 09:15 - 12:30, e.g. 09:57)
 * - Shift 4: 16:00 (Window: 14:30 - 17:00, e.g. 16:02)
 * - Shift 2: 18:00 (Window: 17:01 - 20:00, e.g. 18:04)
 *
 * If outside these clear windows, returns isUnclear: true ("SHIFT UNCLEAR").
 */
export function detectStockShift(firstCheckInTime: string | null): DetectedShiftResult {
  if (!firstCheckInTime) {
    return {
      schedule: null,
      shiftId: 'NONE',
      shiftName: '-',
      isUnclear: false,
    };
  }

  const mins = parseTimeToMinutes(firstCheckInTime);

  // Early morning punch (00:00 to 05:30) is an overnight exit punch, not a shift entry
  if (mins >= 0 && mins <= 330) {
    return {
      schedule: null,
      shiftId: 'NONE',
      shiftName: '-',
      isUnclear: false,
    };
  }

  // Shift 3: Check-in 08:30 (Window: 07:00 to 09:14)
  if (mins >= 420 && mins <= 554) {
    return {
      schedule: STOCK_SHIFT_3,
      shiftId: 'stock_g3',
      shiftName: 'Shift 3',
      isUnclear: false,
    };
  }

  // Shift 1: Check-in 10:00 (Window: 09:15 to 12:30)
  if (mins >= 555 && mins <= 750) {
    return {
      schedule: STOCK_SHIFT_1,
      shiftId: 'stock_g1',
      shiftName: 'Shift 1',
      isUnclear: false,
    };
  }

  // Shift 4: Check-in 16:00 (Window: 14:30 to 16:45)
  if (mins >= 870 && mins <= 1005) {
    return {
      schedule: STOCK_SHIFT_4,
      shiftId: 'stock_g4',
      shiftName: 'Shift 4',
      isUnclear: false,
    };
  }

  // Shift 2: Check-in 18:00 (Window: 16:46 to 21:00)
  if (mins >= 1006 && mins <= 1260) {
    return {
      schedule: STOCK_SHIFT_2,
      shiftId: 'stock_g2',
      shiftName: 'Shift 2',
      isUnclear: false,
    };
  }

  // If the first check-in does not clearly correspond to any shift:
  return {
    schedule: null,
    shiftId: 'UNCLEAR',
    shiftName: 'SHIFT UNCLEAR',
    isUnclear: true,
  };
}

/**
 * Checks whether a punch time falls in the early morning overnight window (00:00 - 05:30).
 * In all shifts, early morning punches represent exit punches for overnight shifts (Shift 2 or Shift 4),
 * and NEVER represent the entry time of a new work shift.
 */
export function isEarlyMorningTime(timeStr: string): boolean {
  if (!timeStr) return false;
  const mins = parseTimeToMinutes(timeStr);
  return mins >= 0 && mins <= 5 * 60 + 30; // 00:00 to 05:30
}

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function getDayOfWeekFromDate(dateStr: string): DayOfWeek {
  const d = new Date(dateStr + 'T12:00:00Z');
  const dayIndex = d.getUTCDay(); // 0 is Sunday, 6 is Saturday
  return DAYS_OF_WEEK[dayIndex];
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

export function formatMinutesToHoursAndMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0h 00';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}`;
}
