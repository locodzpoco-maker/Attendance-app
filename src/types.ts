export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface WorkSchedule {
  id: string;
  name: string;
  groupName: string;
  department: string;
  startTime: string; // "08:30" or "18:00"
  endTime: string; // "17:00" or "02:00"
  crossesMidnight: boolean;
  hasBreak: boolean;
  breakStart?: string; // "12:30"
  breakEnd?: string; // "14:00"
  breakDurationMinutes: number; // e.g. 90 or 60
  overtimeAllowed: boolean;
  overtimeStartTime?: string; // "18:00" or "02:00" (or cross midnight)
  normalWorkedHours: number; // e.g. 6.0, 7.0, 6.5
  workingDays: DayOfWeek[]; // default ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
  arrivalGraceMinutes: number; // default 0 or 5
  overtimeGraceMinutes: number; // default 15
}

export interface Employee {
  id: string; // strictly string to preserve leading zeroes
  name: string;
  rawDepartment?: string;
  companyDepartment: string;
  groupName: string;
  scheduleId: string;
  status: 'Active' | 'Inactive';
  startDate: string;
  notes?: string;
}

export interface RawDayAttendance {
  dayNumber: number;
  dateStr: string; // "2026-07-01"
  rawPunchesText: string; // e.g. "08:10\n12:38\n14:26\n18:13"
  rawPunches: string[]; // ["08:10", "12:38", "14:26", "18:13"]
}

export interface RawEmployeeRecord {
  employeeId: string;
  name: string;
  rawDepartment: string;
  days: Record<number, RawDayAttendance>;
}

export interface RawAttendanceDataset {
  fileName: string;
  sheetName: string;
  createTime?: string;
  madeDateRaw: string; // "Made Date:2026/07/01-2026/07/31"
  startDate: string; // "2026-07-01"
  endDate: string; // "2026-07-31"
  year: number;
  month: number; // 1-12
  totalDays: number;
  employees: RawEmployeeRecord[];
  parsedAt: string;
}

export type AttendanceObservation =
  | 'Ponctuel'
  | 'Retard'
  | 'Absence'
  | 'Entrée non pointée'
  | 'Sortie non pointée'
  | 'Sortie après minuit'
  | 'SHIFT UNCLEAR'
  | 'OFF'
  | 'Congé / Férié';

export interface ManualAdjustment {
  date: string;
  employeeId: string;
  adjustedEntry?: string;
  adjustedExit?: string;
  overrideShiftId?: string; // e.g. "stock_g1", "stock_g2", "stock_g3", "stock_g4"
  reason: string;
  adjustedBy: string;
  adjustedAt: string;
}

export interface DailyAttendanceRecord {
  id: string; // "empId_date"
  date: string; // "2026-07-01"
  formattedDate: string; // "01/07/2026"
  dayOfWeek: DayOfWeek;
  employeeId: string;
  employeeName: string;
  rawDepartment: string;
  companyDepartment: string;
  groupName: string;
  scheduleId: string;
  scheduleName: string;
  isWorkingDay: boolean;

  // Dynamic Shift Detection (for Stock workers)
  isDynamicShift?: boolean;
  detectedShiftId?: string; // 'stock_g1' | 'stock_g2' | 'stock_g3' | 'stock_g4' | 'UNCLEAR' | string;
  detectedShiftName?: string; // 'Shift 1' | 'Shift 2' | 'Shift 3' | 'Shift 4' | 'SHIFT UNCLEAR';
  isShiftUnclear?: boolean;

  // Punches
  rawPunches: string[];
  rawPunchesText: string;
  firstCheckInTime: string | null; // e.g. "09:57"
  entryTime: string | null; // e.g. "08:10"
  exitTime: string | null; // e.g. "18:13"
  isOvernightPunch: boolean; // if exit belongs to next day early morning

  // Manual Adjustment (if any)
  manualAdjustment?: ManualAdjustment;
  isManuallyAdjusted: boolean;

  // Calculated figures
  delayMinutes: number; // delay past scheduled start
  breakDurationMinutes: number; // break deducted
  workedMinutes: number; // normal worked minutes
  workedHoursFormatted: string; // e.g. "7h 12"
  workedDecimalHours: number;

  suppMinutes: number; // overtime minutes after 15m threshold
  suppHoursFormatted: string; // e.g. "0h 20" or "0"
  suppDecimalHours: number;

  observation: AttendanceObservation;
  observationDetail: string; // e.g. "Retard 8 min", "Sortie non pointée", "OFF", etc.
  statusType: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export interface MonthlySummaryRecord {
  employeeId: string;
  employeeName: string;
  companyDepartment: string;
  groupName: string;
  scheduleName: string;
  scheduledWorkingDays: number;
  presentDays: number;
  absentDays: number;
  offDays: number;
  lateDays: number;
  totalLateMinutes: number;
  missingPunchesDays: number;
  missingEntryCount: number;
  missingExitCount: number;
  totalWorkedMinutes: number;
  totalWorkedFormatted: string; // e.g. "154h 00"
  totalSuppMinutes: number;
  totalSuppFormatted: string; // e.g. "8h 20"
}

export interface AttendanceAuditLog {
  id: string;
  timestamp: string;
  user: string;
  employeeId: string;
  employeeName: string;
  date: string;
  action: string;
  details: string;
}

export interface AppSettings {
  companyName: string;
  companySubtitle: string;
  defaultOvertimeGraceMinutes: number; // 15
  defaultArrivalGraceMinutes: number; // 0
  allowRecalculationOnFly: boolean;
  activeRole: 'Administrator' | 'HR / Attendance User' | 'Management';
}

export interface HistoricalPeriodRecord {
  id: string; // "2026-07"
  periodLabel: string; // "01/07/2026 - 31/07/2026"
  startDate: string;
  endDate: string;
  fileName: string;
  importedAt: string;
  employeeCount: number;
  dataset: RawAttendanceDataset;
  dailyRecords: DailyAttendanceRecord[];
  monthlySummary: MonthlySummaryRecord[];
}
