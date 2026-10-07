import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyAttendanceRecord, MonthlySummaryRecord, AppSettings, Employee } from '../types';
import { formatDaysNumber } from './calculator';

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
      '2nd In (Pause)',
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
      r.secondCheckInTime || '--:--',
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
    r.secondCheckInTime || '-',
    r.isShiftUnclear ? 'SHIFT UNCLEAR' : (r.detectedShiftName || r.groupName),
    r.exitTime || '-',
    r.delayMinutes > 0 ? `${r.delayMinutes} min` : '0 min',
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
        '1st Punch (Entrée)',
        '2nd In',
        'Shift',
        'Exit',
        'Late Time (Retard)',
        'Worked',
        'Supp',
        'Status / Observation',
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
 * Exports Daily Report containing First Punch of Day, Entry Status (Early/On Time/Late),
 * and Late Time for each worker to an elegant A4 PDF.
 */
export function exportDailyFirstPunchToPDF(
  records: DailyAttendanceRecord[],
  periodLabel: string,
  settings: AppSettings
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Title
  doc.setFontSize(15);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(settings.companyName || 'Attendance Management System', 14, 14);

  doc.setFontSize(11);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text(`Rapport Journalier - Premier Pointage du Jour (First Punch Report)`, 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Période / Date : ${periodLabel}`, 14, 25);
  doc.text(`Généré le : ${new Date().toLocaleString()}`, pageWidth - 14, 25, { align: 'right' });

  // Calculate high-level stats for the summary header banner
  let earlyCount = 0;
  let onTimeCount = 0;
  let lateCount = 0;
  let missingFirstPunchCount = 0;
  let totalLateMinutes = 0;

  records.forEach((r) => {
    const firstPunch = r.firstCheckInTime || r.entryTime;
    if (!firstPunch) {
      missingFirstPunchCount++;
    } else if (r.firstCheckInDelayMinutes > 0) {
      lateCount++;
      totalLateMinutes += r.firstCheckInDelayMinutes;
    } else {
      // Check if arrived earlier than normal start time
      onTimeCount++;
      // If we want to distinguish early vs on-time:
      if (r.observation === 'Ponctuel') {
        earlyCount++;
      }
    }
  });

  // Summary banner card
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 28, pageWidth - 28, 12, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const summaryText = `Total Enregistrements: ${records.length}   |   À l'heure / Avance: ${onTimeCount}   |   En Retard: ${lateCount}   |   Non Pointé: ${missingFirstPunchCount}   |   Total Retard: ${totalLateMinutes} min`;
  doc.text(summaryText, 18, 35.5);

  const tableBody = records.map((r) => {
    const firstPunch = r.firstCheckInTime || r.entryTime;
    const firstDelay = r.firstCheckInDelayMinutes;
    const totalDelay = r.delayMinutes;

    let arrivalStatus = 'À l\'heure';
    if (!firstPunch) {
      if (r.observation.includes('Absent') || r.observation === 'Absence') {
        arrivalStatus = r.observation;
      } else if (r.observation === 'OFF' || r.observation.includes('Congé')) {
        arrivalStatus = r.observation;
      } else {
        arrivalStatus = 'Non pointé';
      }
    } else if (firstDelay > 0) {
      arrivalStatus = `En retard (+${firstDelay}m)`;
    } else {
      arrivalStatus = 'À l\'heure / En avance';
    }

    const lateDisplay = firstDelay > 0
      ? `${firstDelay} min${totalDelay > firstDelay ? ` (Total ${totalDelay}m)` : ''}`
      : (totalDelay > 0 ? `0m (Pause ${totalDelay}m)` : '0 min');

    return [
      r.formattedDate,
      r.employeeId,
      r.employeeName,
      r.detectedShiftName || r.scheduleName || r.groupName || '-',
      firstPunch || 'Non pointé',
      arrivalStatus,
      lateDisplay,
      r.observationDetail || r.observation,
    ];
  });

  autoTable(doc, {
    startY: 43,
    head: [
      [
        'Date',
        'ID',
        'Employé',
        'Shift / Groupe',
        '1er Pointage',
        'Statut Entrée',
        'Temps Retard',
        'Observation',
      ],
    ],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 20 }, // Date
      1: { cellWidth: 16 }, // ID
      2: { cellWidth: 42 }, // Employee Name
      3: { cellWidth: 26 }, // Shift
      4: { cellWidth: 22, halign: 'center' }, // 1st Punch
      5: { cellWidth: 28 }, // Status
      6: { cellWidth: 20, halign: 'right' }, // Late time
      7: { cellWidth: 'auto' }, // Observation
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      // Color-code the Late Time and Status cells for quick scanning
      if (data.section === 'body') {
        const rawRow = records[data.row.index];
        if (rawRow) {
          if (data.column.index === 5) {
            // Status column
            if (rawRow.firstCheckInDelayMinutes > 0) {
              data.cell.styles.textColor = [185, 28, 28]; // red-700
              data.cell.styles.fontStyle = 'bold';
            } else if (rawRow.firstCheckInTime || rawRow.entryTime) {
              data.cell.styles.textColor = [4, 120, 87]; // emerald-700
            }
          }
          if (data.column.index === 6) {
            // Late time column
            if (rawRow.firstCheckInDelayMinutes > 0 || rawRow.delayMinutes > 0) {
              data.cell.styles.textColor = [180, 83, 9]; // amber-700
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`Rapport_Premier_Pointage_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
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
    formatDaysNumber(s.presentDays, settings.language),
    formatDaysNumber(s.absentDays, settings.language),
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

/**
 * Exports the employee roster to Excel (.xlsx)
 */
export function exportEmployeesToExcel(employees: Employee[], settings?: AppSettings): void {
  const wb = XLSX.utils.book_new();

  const dataRows: (string | number)[][] = [
    [settings?.companyName || 'ATTENDANCE MANAGEMENT SYSTEM'],
    [`Roster des Employés / Employees Database`],
    [`Total: ${employees.length} employés | Exporté le: ${new Date().toLocaleString()}`],
    [],
    [
      'Matricule (ID)',
      'Nom Complet',
      'Type Employé (Rôle)',
      'Département',
      'Groupe',
      'Horaire Assigné (ID)',
      'Statut',
      'Shift Samedi',
      'Date de Début',
      'Remarques',
    ],
  ];

  employees.forEach((e) => {
    dataRows.push([
      e.id,
      e.name,
      e.workerType || 'Admin',
      e.companyDepartment,
      e.groupName,
      e.scheduleId,
      e.status,
      e.hasSaturdayShift ? 'OUI' : 'NON',
      e.startDate || '',
      e.notes || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(dataRows);

  // Set explicit text cell type for the ID column so Excel preserves leading zeros like 0004
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:J1');
  for (let r = 4; r <= range.e.r; r++) {
    const idCellRef = XLSX.utils.encode_cell({ r, c: 0 });
    if (ws[idCellRef]) {
      ws[idCellRef].t = 's'; // string type
    }
  }

  // Column widths
  ws['!cols'] = [
    { wch: 16 }, // ID
    { wch: 28 }, // Name
    { wch: 18 }, // Worker Type
    { wch: 24 }, // Department
    { wch: 18 }, // Group
    { wch: 22 }, // Schedule ID
    { wch: 12 }, // Status
    { wch: 14 }, // Saturday
    { wch: 14 }, // Start Date
    { wch: 32 }, // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Employes');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Employees_List_${dateStr}.xlsx`);
}

/**
 * Exports the employee roster to CSV format with UTF-8 BOM
 */
export function exportEmployeesToCSV(employees: Employee[]): void {
  const headers = [
    'Matricule',
    'Nom Complet',
    'Type Employé',
    'Département',
    'Groupe',
    'Horaire (ID)',
    'Statut',
    'Shift Samedi',
    'Date de Début',
    'Remarques',
  ];

  const rows = employees.map((e) => [
    `"${e.id}"`,
    `"${(e.name || '').replace(/"/g, '""')}"`,
    `"${e.workerType || 'Admin'}"`,
    `"${(e.companyDepartment || '').replace(/"/g, '""')}"`,
    `"${(e.groupName || '').replace(/"/g, '""')}"`,
    `"${e.scheduleId}"`,
    `"${e.status}"`,
    `"${e.hasSaturdayShift ? 'OUI' : 'NON'}"`,
    `"${e.startDate || ''}"`,
    `"${(e.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Employees_List_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a sample template Excel spreadsheet for importing employees
 */
export function downloadEmployeesSampleTemplate(): void {
  const wb = XLSX.utils.book_new();

  const sampleRows: (string | number)[][] = [
    [
      'Matricule',
      'Nom Complet',
      'Type Employé',
      'Département',
      'Groupe',
      'Horaire (ID)',
      'Statut',
      'Shift Samedi',
      'Date de Début',
      'Remarques',
    ],
    [
      '00004',
      'BENSALAH ROMAISSA',
      'Admin',
      'Administration',
      'Admin Group 1',
      'admin_g1',
      'Active',
      'OUI',
      '2023-01-01',
      'Exemple employé administratif avec Shift Samedi',
    ],
    [
      '00039',
      'AMARI ISLAM',
      'Stock',
      'Stock & Logistique',
      'Stock',
      'stock_dynamic',
      'Active',
      'OUI',
      '2023-01-01',
      'Exemple ouvrier stock (détection dynamique 1–4)',
    ],
    [
      '00150',
      'KADRI KARIM',
      'Admin',
      'Sans Shift',
      'Sans Shift',
      'no_shift',
      'Active',
      'NON',
      '2024-01-01',
      'Exemple travailleur sans shift (calcul direct Entrée–Sortie)',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleRows);

  // Set explicit string type for Matricule so leading zeros are preserved
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:J4');
  for (let r = 1; r <= range.e.r; r++) {
    const idCellRef = XLSX.utils.encode_cell({ r, c: 0 });
    if (ws[idCellRef]) {
      ws[idCellRef].t = 's';
    }
  }

  ws['!cols'] = [
    { wch: 16 }, // ID
    { wch: 28 }, // Name
    { wch: 18 }, // Worker Type
    { wch: 24 }, // Department
    { wch: 18 }, // Group
    { wch: 22 }, // Schedule ID
    { wch: 12 }, // Status
    { wch: 14 }, // Saturday
    { wch: 14 }, // Start Date
    { wch: 45 }, // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Modele_Employes');
  XLSX.writeFile(wb, 'Modele_Import_Employes.xlsx');
}

