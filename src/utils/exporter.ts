import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyAttendanceRecord, MonthlySummaryRecord, AppSettings } from '../types';

/**
 * Exports daily attendance records to Excel (.xlsx)
 */
export function exportDailyAttendanceToExcel(
  records: DailyAttendanceRecord[],
  periodLabel: string,
  settings: AppSettings
): void {
  const wb = XLSX.utils.book_new();

  const dataRows: (string | number)[][] = [
    [settings.companyName || 'ATTENDANCE MANAGEMENT SYSTEM'],
    [`Daily Attendance Report - Period: ${periodLabel}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    [
      'Date',
      'Day',
      'Employee ID',
      'Employee Name',
      'Department',
      'Group',
      'First Check-in',
      'Detected Shift',
      'Exit',
      'Delay',
      'Break',
      'Worked Hours',
      'Supp Hours',
      'Observation',
      'Raw Punches',
    ],
  ];

  records.forEach((r) => {
    dataRows.push([
      r.formattedDate,
      r.dayOfWeek,
      r.employeeId,
      r.employeeName,
      r.companyDepartment,
      r.groupName,
      r.firstCheckInTime || r.entryTime || '--:--',
      r.isShiftUnclear ? 'SHIFT UNCLEAR' : (r.detectedShiftName || r.scheduleName),
      r.exitTime || '--:--',
      r.delayMinutes > 0 ? `${r.delayMinutes} min` : '0 min',
      r.breakDurationMinutes > 0 ? `${r.breakDurationMinutes} min` : 'None',
      r.workedHoursFormatted,
      r.suppHoursFormatted,
      r.observationDetail,
      r.rawPunches.join(', '),
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(dataRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Daily Attendance');
  XLSX.writeFile(wb, `Daily_Attendance_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
}

/**
 * Exports monthly summary records to Excel (.xlsx)
 */
export function exportMonthlySummaryToExcel(
  summaries: MonthlySummaryRecord[],
  periodLabel: string,
  settings: AppSettings
): void {
  const wb = XLSX.utils.book_new();

  const dataRows: (string | number)[][] = [
    [settings.companyName || 'ATTENDANCE MANAGEMENT SYSTEM'],
    [`Monthly Attendance Summary - Period: ${periodLabel}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    [
      'Employee ID',
      'Employee Name',
      'Department',
      'Group',
      'Schedule',
      'Working Days',
      'Present Days',
      'Absent Days',
      'OFF Days',
      'Late Days',
      'Total Late (min)',
      'Worked Hours',
      'Supp (Overtime)',
      'Missing Punches',
    ],
  ];

  summaries.forEach((s) => {
    dataRows.push([
      s.employeeId,
      s.employeeName,
      s.companyDepartment,
      s.groupName,
      s.scheduleName,
      s.scheduledWorkingDays,
      s.presentDays,
      s.absentDays,
      s.offDays,
      s.lateDays,
      s.totalLateMinutes,
      s.totalWorkedFormatted,
      s.totalSuppFormatted,
      s.missingPunchesDays,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(dataRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly Summary');
  XLSX.writeFile(wb, `Monthly_Summary_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
}

/**
 * Exports Daily Attendance to an elegant A4 PDF
 */
export function exportDailyAttendanceToPDF(
  records: DailyAttendanceRecord[],
  periodLabel: string,
  settings: AppSettings
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Header Title
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(settings.companyName || 'Attendance Management System', 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Daily Attendance Report | Period: ${periodLabel}`, 14, 21);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 220, 21);

  const tableBody = records.map((r) => [
    r.formattedDate,
    r.employeeId,
    r.employeeName,
    r.firstCheckInTime || r.entryTime || '-',
    r.isShiftUnclear ? 'SHIFT UNCLEAR' : (r.detectedShiftName || r.groupName),
    r.exitTime || '-',
    r.delayMinutes > 0 ? `${r.delayMinutes}m` : '0',
    r.workedHoursFormatted,
    r.suppMinutes > 0 ? r.suppHoursFormatted : '0',
    r.observationDetail,
  ]);

  autoTable(doc, {
    startY: 26,
    head: [
      [
        'Date',
        'ID',
        'Employee',
        'Check-in',
        'Detected Shift',
        'Exit',
        'Delay',
        'Worked',
        'Supp',
        'Observation',
      ],
    ],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`Daily_Attendance_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

/**
 * Exports Monthly Summary to an elegant A4 PDF
 */
export function exportMonthlySummaryToPDF(
  summaries: MonthlySummaryRecord[],
  periodLabel: string,
  settings: AppSettings
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(settings.companyName || 'Attendance Management System', 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Monthly Attendance Summary | Period: ${periodLabel}`, 14, 21);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 220, 21);

  const tableBody = summaries.map((s) => [
    s.employeeId,
    s.employeeName,
    s.companyDepartment,
    s.groupName,
    s.presentDays,
    s.absentDays,
    s.offDays,
    s.lateDays,
    `${s.totalLateMinutes}m`,
    s.totalWorkedFormatted,
    s.totalSuppFormatted,
    s.missingPunchesDays,
  ]);

  autoTable(doc, {
    startY: 26,
    head: [
      [
        'ID',
        'Employee',
        'Department',
        'Group',
        'Present',
        'Absent',
        'OFF',
        'Late Days',
        'Late Mins',
        'Worked Hours',
        'Supp Hours',
        'Missing',
      ],
    ],
    body: tableBody,
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`Monthly_Summary_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}
