import * as XLSX from "xlsx";
import { RawAttendanceDataset, RawEmployeeRecord } from "../types";
import { STOCK_WORKERS_INPUT, ADMIN_WORKERS_INPUT } from "./employees";

/**
 * Creates a complete, realistic reference dataset matching AttendanceRecord_0 (56).xls
 * for July 2026 (31 days), featuring:
 * - 48 Stock workers with dynamic shift rotations (Shift 1, Shift 2, Shift 3, Shift 4)
 * - 38 Admin workers (Group 1: 08:30 - 17:00)
 */
export function generateReferenceDataset(): RawAttendanceDataset {
  const year = 2026;
  const month = 7;
  const totalDays = 31;
  const startDate = "2026-07-01";
  const endDate = "2026-07-31";

  const dStr = (d: number) =>
    `${year}-${month.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;

  const employees: RawEmployeeRecord[] = [];

  // 1. Generate records for Stock Workers (Dynamic Daily Shifts 1, 2, 3, 4, Sun-Thu, Fri/Sat OFF)
  STOCK_WORKERS_INPUT.forEach((worker, idx) => {
    const days: Record<number, { dayNumber: number; dateStr: string; rawPunchesText: string; rawPunches: string[] }> = {};

    for (let d = 1; d <= totalDays; d++) {
      const dayOfWeek = new Date(`${dStr(d)}T12:00:00Z`).getUTCDay(); // 0: Sun, 5: Fri, 6: Sat
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        // Weekend / OFF
        days[d] = { dayNumber: d, dateStr: dStr(d), rawPunchesText: "", rawPunches: [] };
        continue;
      }

      // Demonstration day: Shift unclear for manual review on worker idx 2, day 15
      if (idx === 2 && d === 15) {
        days[d] = {
          dayNumber: d,
          dateStr: dStr(d),
          rawPunchesText: "13:30\n19:00",
          rawPunches: ["13:30", "19:00"],
        };
        continue;
      }

      // Occasional absence
      if ((d + idx) % 29 === 0) {
        days[d] = { dayNumber: d, dateStr: dStr(d), rawPunchesText: "", rawPunches: [] };
        continue;
      }

      // Dynamic rotation across shifts:
      // Shifts rotate by week / day patterns:
      // Shift 1: 10:00 - 18:00
      // Shift 2: 18:00 - 02:00 (crosses midnight)
      // Shift 3: 08:30 - 16:30
      // Shift 4: 16:00 - 00:00 (crosses midnight)
      const shiftType = (Math.floor(d / 7) + idx) % 4;

      if (shiftType === 0) {
        // Shift 1: Check-in around 10:00 (e.g. 09:57 or 10:02), exit 18:04
        const inMin = 55 + ((d + idx) % 7); // 09:55 to 10:01
        const inStr = inMin >= 60 ? `10:0${inMin - 60}` : `09:${inMin}`;
        const otExit = (d + idx) % 5 === 0 ? "18:28" : "18:04";
        days[d] = {
          dayNumber: d,
          dateStr: dStr(d),
          rawPunchesText: `${inStr}\n${otExit}`,
          rawPunches: [inStr, otExit],
        };
      } else if (shiftType === 1) {
        // Shift 2: Check-in around 18:00 (e.g. 18:04), exit 02:05 next morning
        const inMin = (d + idx) % 8;
        const inStr = `18:0${inMin}`;
        const outStr = (d + idx) % 4 === 0 ? "02:30" : "02:05";
        days[d] = {
          dayNumber: d,
          dateStr: dStr(d),
          rawPunchesText: `${inStr}\n${outStr}`,
          rawPunches: [inStr, outStr],
        };
      } else if (shiftType === 2) {
        // Shift 3: Check-in around 08:30 (e.g. 08:35), exit 16:34
        const inMin = 28 + ((d + idx) % 9);
        const inStr = `08:${inMin}`;
        const outStr = (d + idx) % 6 === 0 ? "16:55" : "16:34";
        days[d] = {
          dayNumber: d,
          dateStr: dStr(d),
          rawPunchesText: `${inStr}\n${outStr}`,
          rawPunches: [inStr, outStr],
        };
      } else {
        // Shift 4: Check-in around 16:00 (e.g. 16:02), exit 00:05
        const inMin = (d + idx) % 6;
        const inStr = `16:0${inMin}`;
        const outStr = (d + idx) % 5 === 0 ? "00:25" : "00:05";
        days[d] = {
          dayNumber: d,
          dateStr: dStr(d),
          rawPunchesText: `${inStr}\n${outStr}`,
          rawPunches: [inStr, outStr],
        };
      }
    }

    employees.push({
      employeeId: worker.id,
      name: worker.name,
      rawDepartment: "Stock",
      days,
    });
  });

  // 2. Generate records for Admin Workers (08:30 - 17:00 shift, Sun-Thu, Fri/Sat OFF)
  ADMIN_WORKERS_INPUT.forEach((worker, idx) => {
    const days: Record<number, { dayNumber: number; dateStr: string; rawPunchesText: string; rawPunches: string[] }> = {};
    for (let d = 1; d <= totalDays; d++) {
      const dayOfWeek = new Date(`${dStr(d)}T12:00:00Z`).getUTCDay();
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        days[d] = { dayNumber: d, dateStr: dStr(d), rawPunchesText: "", rawPunches: [] };
      } else if (d === 1) {
        days[d] = {
          dayNumber: d,
          dateStr: dStr(d),
          rawPunchesText: "08:10\n12:38\n14:26\n17:13",
          rawPunches: ["08:10", "12:38", "14:26", "17:13"],
        };
      } else if (d === 8 && idx % 3 === 0) {
        days[d] = {
          dayNumber: d,
          dateStr: dStr(d),
          rawPunchesText: "08:44\n12:35\n14:05\n17:02",
          rawPunches: ["08:44", "12:35", "14:05", "17:02"],
        };
      } else if (d === 15 && idx === 0) {
        days[d] = {
          dayNumber: d,
          dateStr: dStr(d),
          rawPunchesText: "08:28",
          rawPunches: ["08:28"],
        };
      } else {
        days[d] = {
          dayNumber: d,
          dateStr: dStr(d),
          rawPunchesText: "08:25\n12:30\n14:00\n17:05",
          rawPunches: ["08:25", "12:30", "14:00", "17:05"],
        };
      }
    }

    employees.push({
      employeeId: worker.id,
      name: worker.name,
      rawDepartment: "Administration",
      days,
    });
  });

  return {
    fileName: "AttendanceRecord_0 (56).xls",
    sheetName: "Attendance Record",
    createTime: "Create Time: 2026/08/01 08:00:00",
    madeDateRaw: "Made Date:2026/07/01-2026/07/31",
    startDate,
    endDate,
    year,
    month,
    totalDays,
    employees,
    parsedAt: new Date().toISOString(),
  };
}

/**
 * Downloads a sample raw Excel file matching the biometric format
 */
export function downloadSampleExcelWorkbook() {
  const dataset = generateReferenceDataset();
  const headers = ["No.", "ID", "Name", "Department"];
  for (let d = 1; d <= dataset.totalDays; d++) {
    headers.push(d.toString());
  }

  const rows: (string | number)[][] = [
    ["Create Time: 2026/08/01 08:00:00", "", "", ""],
    ["Attendance Record", "", "", ""],
    ["Made Date:2026/07/01-2026/07/31", "", "", ""],
    headers,
  ];

  dataset.employees.forEach((emp, index) => {
    const row: (string | number)[] = [
      index + 1,
      emp.employeeId,
      emp.name,
      emp.rawDepartment,
    ];
    for (let d = 1; d <= dataset.totalDays; d++) {
      row.push(emp.days[d]?.rawPunchesText || "");
    }
    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance Record");
  XLSX.writeFile(wb, "AttendanceRecord_Sample_July2026.xlsx");
}

export const downloadSampleAttendanceFile = downloadSampleExcelWorkbook;
