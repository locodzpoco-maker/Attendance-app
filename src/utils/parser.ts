import * as XLSX from 'xlsx';
import { RawAttendanceDataset, RawEmployeeRecord, RawDayAttendance } from '../types';

/**
 * Extracts valid HH:MM punches from a text string containing line breaks or spaces.
 */
export function extractPunches(cellContent: unknown): string[] {
  if (cellContent === null || cellContent === undefined) return [];
  const text = String(cellContent).trim();
  if (!text) return [];

  // Split by line breaks, carriage returns, or multiple spaces
  const lines = text.split(/[\r\n]+/);
  const punches: string[] = [];

  for (const line of lines) {
    // Look for times matching HH:MM or HH:MM:SS
    const timeMatch = line.match(/\b([0-2]?[0-9]):([0-5][0-9])(?::[0-5][0-9])?\b/);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = timeMatch[2];
      punches.push(`${hours}:${minutes}`);
    }
  }

  return punches;
}

/**
 * Parse an uploaded raw attendance file (.xls or .xlsx)
 */
export function parseRawAttendanceFile(
  fileData: ArrayBuffer,
  fileName: string
): { dataset?: RawAttendanceDataset; error?: string } {
  try {
    // Read workbook with raw: false to help retain formatted text representations
    const workbook = XLSX.read(fileData, { type: 'array', cellText: true, raw: false });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { error: 'The uploaded file does not contain any worksheets.' };
    }

    // Step 1: Detect the relevant worksheet dynamically
    // PRD Section 6.1: "The parser should detect the relevant worksheet and locate the attendance header dynamically"
    let targetSheetName = workbook.SheetNames[0];
    let sheetData: (string | number | undefined)[][] = [];

    // Prioritize sheets named 'Attendance Record', 'Attendance', or scan sheets for headers
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;
      const rows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(sheet, {
        header: 1,
        raw: false,
        defval: '',
      });

      const hasEmployeeHeader = rows.some((row) =>
        row.some((cell) => {
          const str = String(cell || '').toLowerCase();
          return str.includes('employee id') || str.includes('id') || str.includes('code');
        })
      );

      if (hasEmployeeHeader || name.toLowerCase().includes('attendance')) {
        targetSheetName = name;
        sheetData = rows;
        break;
      }
    }

    if (sheetData.length === 0) {
      const defaultSheet = workbook.Sheets[targetSheetName];
      sheetData = XLSX.utils.sheet_to_json(defaultSheet, { header: 1, raw: false, defval: '' });
    }

    // Step 2: Extract Header/Report metadata (e.g. Made Date, Create Time)
    let madeDateRaw = '';
    let startDate = '';
    let endDate = '';
    let createTime = '';

    // Search top rows (first 10 rows) for metadata
    for (let r = 0; r < Math.min(15, sheetData.length); r++) {
      const row = sheetData[r];
      if (!row) continue;
      for (const cell of row) {
        const text = String(cell || '').trim();
        if (text.toLowerCase().includes('made date')) {
          madeDateRaw = text;
          // Format like: "Made Date:2026/07/01-2026/07/31" or "Made Date: 2026/07/01 - 2026/07/31"
          const dates = text.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/g);
          if (dates && dates.length >= 2) {
            startDate = dates[0].replace(/\//g, '-');
            endDate = dates[1].replace(/\//g, '-');
          }
        }
        if (text.toLowerCase().includes('create time')) {
          createTime = text;
        }
      }
    }

    // Step 3: Locate Employee ID, Name, Department and Date columns
    let headerRowIndex = -1;
    let colEmpId = 0;
    let colName = 1;
    let colDept = 2;
    const dayColMap: { colIndex: number; dayNumber: number }[] = [];

    for (let r = 0; r < Math.min(25, sheetData.length); r++) {
      const row = sheetData[r];
      if (!row) continue;

      let foundId = -1;
      let foundName = -1;
      let foundDept = -1;

      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '').trim().toLowerCase();
        if (cell.includes('employee id') || cell === 'id' || cell.includes('matricule')) {
          foundId = c;
        } else if (cell.includes('name') || cell.includes('nom') || cell.includes('employee name')) {
          foundName = c;
        } else if (cell.includes('department') || cell.includes('département') || cell.includes('dept')) {
          foundDept = c;
        }
      }

      // If we found employee info headers in this row
      if (foundId !== -1 && (foundName !== -1 || foundDept !== -1)) {
        headerRowIndex = r;
        colEmpId = foundId;
        colName = foundName !== -1 ? foundName : colEmpId + 1;
        colDept = foundDept !== -1 ? foundDept : colName + 1;

        // Scan columns after dept for day numbers (1, 2, 3 ... 31)
        for (let c = 0; c < row.length; c++) {
          if (c === colEmpId || c === colName || c === colDept) continue;
          const val = String(row[c] || '').trim();
          const num = parseInt(val, 10);
          if (!isNaN(num) && num >= 1 && num <= 31) {
            dayColMap.push({ colIndex: c, dayNumber: num });
          }
        }
        break;
      }
    }

    // Fallback if header wasn't found by text: try to find a row where subsequent columns are 1, 2, 3...
    if (headerRowIndex === -1) {
      for (let r = 0; r < Math.min(20, sheetData.length); r++) {
        const row = sheetData[r];
        if (!row) continue;
        const potentialDays = row
          .map((c, idx) => ({ idx, val: parseInt(String(c).trim(), 10) }))
          .filter((item) => !isNaN(item.val) && item.val >= 1 && item.val <= 31);

        if (potentialDays.length >= 10) {
          headerRowIndex = r;
          colEmpId = 0;
          colName = 1;
          colDept = 2;
          potentialDays.forEach((p) => dayColMap.push({ colIndex: p.idx, dayNumber: p.val }));
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      return {
        error:
          'Employee ID column could not be detected. Please ensure the file has the expected attendance export layout.',
      };
    }

    // Default dates if Made Date header was missing
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    if (startDate) {
      const parts = startDate.split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
    } else {
      // derive month and year based on days
      madeDateRaw = `Made Date:${year}/${month.toString().padStart(2, '0')}/01-${year}/${month.toString().padStart(2, '0')}/31`;
      startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const daysInMonth = new Date(year, month, 0).getDate();
      endDate = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;
    }

    const daysInMonth = new Date(year, month, 0).getDate();

    // Step 4: Extract employees and their punch records
    const employees: RawEmployeeRecord[] = [];
    const seenEmpIds = new Set<string>();

    for (let r = headerRowIndex + 1; r < sheetData.length; r++) {
      const row = sheetData[r];
      if (!row || row.length === 0) continue;

      const rawIdVal = row[colEmpId];
      if (rawIdVal === undefined || rawIdVal === null || String(rawIdVal).trim() === '') {
        continue;
      }

      // PRD Section 6.4: "Employee IDs must be treated as strings, not integers, because leading zeros may exist."
      const empId = String(rawIdVal).trim();
      const empName = String(row[colName] || '').trim() || `Employee ${empId}`;
      const empDept = String(row[colDept] || '').trim();

      // Check for empty or invalid rows (e.g. summary rows)
      if (empId.toLowerCase().includes('total') || empId.toLowerCase().includes('page')) {
        continue;
      }

      const days: Record<number, RawDayAttendance> = {};

      for (const { colIndex, dayNumber } of dayColMap) {
        if (dayNumber > daysInMonth) continue; // ignore non-existing calendar days

        const cellContent = row[colIndex];
        const punchesText = cellContent !== undefined && cellContent !== null ? String(cellContent).trim() : '';
        const punches = extractPunches(cellContent);

        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${dayNumber.toString().padStart(2, '0')}`;

        days[dayNumber] = {
          dayNumber,
          dateStr,
          rawPunchesText: punchesText,
          rawPunches: punches,
        };
      }

      // If we don't have day columns mapped, fill empty for calendar days
      if (dayColMap.length === 0) {
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
          days[d] = {
            dayNumber: d,
            dateStr,
            rawPunchesText: '',
            rawPunches: [],
          };
        }
      }

      // Avoid duplicates
      if (!seenEmpIds.has(empId)) {
        seenEmpIds.add(empId);
        employees.push({
          employeeId: empId,
          name: empName,
          rawDepartment: empDept,
          days,
        });
      }
    }

    if (employees.length === 0) {
      return {
        error:
          'No employee attendance records found in the detected worksheet. Please verify that the file contains valid rows.',
      };
    }

    return {
      dataset: {
        fileName,
        sheetName: targetSheetName,
        createTime,
        madeDateRaw,
        startDate,
        endDate,
        year,
        month,
        totalDays: daysInMonth,
        employees,
        parsedAt: new Date().toISOString(),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown parsing error';
    return { error: `Failed to parse file: ${message}. Please ensure it is a valid Excel spreadsheet.` };
  }
}
