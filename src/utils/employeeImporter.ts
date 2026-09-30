import * as XLSX from 'xlsx';
import { Employee } from '../types';

export interface ParseEmployeesResult {
  employees: Employee[];
  warnings: string[];
  totalRows: number;
}

/**
 * Normalizes text for header matching: removes accents, spaces, special chars
 */
function normalizeHeader(header: string): string {
  return (header || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV file into an array of Employee records
 */
export async function parseEmployeesFromFile(file: File): Promise<ParseEmployeesResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', raw: false });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('No sheets found in the uploaded workbook.');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error('Could not access sheet contents.');
  }

  // Parse as raw 2D array of strings
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (rawRows.length < 2) {
    throw new Error('File appears to be empty or has no data rows below the header.');
  }

  // Find header row (usually row 0, or within first 5 rows)
  let headerRowIndex = -1;
  let colIndices: {
    id: number;
    name: number;
    workerType: number;
    department: number;
    group: number;
    scheduleId: number;
    status: number;
    hasSaturdayShift: number;
    startDate: number;
    notes: number;
  } = {
    id: -1,
    name: -1,
    workerType: -1,
    department: -1,
    group: -1,
    scheduleId: -1,
    status: -1,
    hasSaturdayShift: -1,
    startDate: -1,
    notes: -1,
  };

  for (let r = 0; r < Math.min(10, rawRows.length); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    let foundId = -1;
    let foundName = -1;

    row.forEach((cell, idx) => {
      const norm = normalizeHeader(String(cell));
      if (
        norm === 'id' ||
        norm === 'matricule' ||
        norm === 'empid' ||
        norm === 'employeeid' ||
        norm === 'code' ||
        norm === 'identifiant' ||
        norm === 'n' ||
        norm === 'no'
      ) {
        foundId = idx;
      }
      if (
        norm === 'name' ||
        norm === 'nom' ||
        norm === 'nomcomplet' ||
        norm === 'fullname' ||
        norm === 'employeename' ||
        norm === 'worker' ||
        norm === 'agent'
      ) {
        foundName = idx;
      }
    });

    if (foundId !== -1 && foundName !== -1) {
      headerRowIndex = r;
      break;
    }
  }

  // Fallback to row 0 if no clear header keywords matched
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  // Map all columns based on the identified header row
  const headerRow = rawRows[headerRowIndex];
  headerRow.forEach((cell, idx) => {
    const norm = normalizeHeader(String(cell));
    if (
      norm.includes('matricule') ||
      norm === 'id' ||
      norm.includes('employeeid') ||
      norm.includes('empid') ||
      norm === 'code'
    ) {
      if (colIndices.id === -1) colIndices.id = idx;
    } else if (
      norm.includes('nom') ||
      norm.includes('name') ||
      norm.includes('worker') ||
      norm.includes('employe')
    ) {
      if (colIndices.name === -1) colIndices.name = idx;
    } else if (
      norm.includes('type') ||
      norm.includes('role') ||
      norm.includes('categorie')
    ) {
      if (colIndices.workerType === -1) colIndices.workerType = idx;
    } else if (
      norm.includes('depart') ||
      norm.includes('dept') ||
      norm.includes('service')
    ) {
      if (colIndices.department === -1) colIndices.department = idx;
    } else if (
      norm.includes('group') ||
      norm.includes('equipe') ||
      norm.includes('team')
    ) {
      if (colIndices.group === -1) colIndices.group = idx;
    } else if (
      norm.includes('horaire') ||
      norm.includes('schedule') ||
      norm.includes('shift')
    ) {
      if (colIndices.scheduleId === -1) colIndices.scheduleId = idx;
    } else if (norm.includes('statut') || norm.includes('status') || norm.includes('etat')) {
      if (colIndices.status === -1) colIndices.status = idx;
    } else if (norm.includes('samedi') || norm.includes('saturday')) {
      if (colIndices.hasSaturdayShift === -1) colIndices.hasSaturdayShift = idx;
    } else if (
      norm.includes('date') ||
      norm.includes('embauche') ||
      norm.includes('start')
    ) {
      if (colIndices.startDate === -1) colIndices.startDate = idx;
    } else if (
      norm.includes('note') ||
      norm.includes('remarque') ||
      norm.includes('comment')
    ) {
      if (colIndices.notes === -1) colIndices.notes = idx;
    }
  });

  // Default fallbacks if indices couldn't be detected
  if (colIndices.id === -1) colIndices.id = 0;
  if (colIndices.name === -1) colIndices.name = 1;

  const employees: Employee[] = [];
  const warnings: string[] = [];
  let totalDataRows = 0;

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || !Array.isArray(row)) continue;

    // Check if entire row is empty
    const hasAnyVal = row.some((c) => String(c || '').trim() !== '');
    if (!hasAnyVal) continue;

    totalDataRows++;

    const rawId = colIndices.id >= 0 ? String(row[colIndices.id] || '').trim() : '';
    const rawName = colIndices.name >= 0 ? String(row[colIndices.name] || '').trim() : '';

    if (!rawId && !rawName) {
      continue;
    }

    if (!rawId) {
      warnings.push(`Row ${r + 1}: Skipped worker "${rawName}" because ID is missing.`);
      continue;
    }

    if (!rawName) {
      warnings.push(`Row ${r + 1}: Worker ID "${rawId}" has no name provided.`);
    }

    const rawType = colIndices.workerType >= 0 ? String(row[colIndices.workerType] || '').trim().toLowerCase() : '';
    const rawDept = colIndices.department >= 0 ? String(row[colIndices.department] || '').trim() : '';
    const rawGroup = colIndices.group >= 0 ? String(row[colIndices.group] || '').trim() : '';
    const rawSched = colIndices.scheduleId >= 0 ? String(row[colIndices.scheduleId] || '').trim() : '';
    const rawStatus = colIndices.status >= 0 ? String(row[colIndices.status] || '').trim().toLowerCase() : '';
    const rawSat = colIndices.hasSaturdayShift >= 0 ? String(row[colIndices.hasSaturdayShift] || '').trim().toLowerCase() : '';
    const rawDate = colIndices.startDate >= 0 ? String(row[colIndices.startDate] || '').trim() : '';
    const rawNotes = colIndices.notes >= 0 ? String(row[colIndices.notes] || '').trim() : '';

    // Determine Worker Type (Admin vs Stock)
    let workerType: 'Admin' | 'Stock' = 'Admin';
    if (
      rawType.includes('stock') ||
      rawDept.toLowerCase().includes('stock') ||
      rawGroup.toLowerCase().includes('stock') ||
      rawSched.toLowerCase().includes('stock')
    ) {
      workerType = 'Stock';
    }

    // Determine Schedule ID
    let scheduleId = workerType === 'Stock' ? 'stock_dynamic' : 'admin_g1';
    const schedNorm = rawSched.toLowerCase();
    if (
      schedNorm.includes('no_shift') ||
      schedNorm.includes('sans shift') ||
      schedNorm.includes('sansshift') ||
      schedNorm.includes('libre') ||
      schedNorm === 'none'
    ) {
      scheduleId = 'no_shift';
    } else if (schedNorm.includes('stock_dynamic') || schedNorm.includes('dynamic')) {
      scheduleId = 'stock_dynamic';
    } else if (schedNorm.includes('admin_g1') || schedNorm.includes('08:30')) {
      scheduleId = 'admin_g1';
    } else if (schedNorm.includes('admin_g2') || schedNorm.includes('17:00')) {
      scheduleId = 'admin_g2';
    } else if (schedNorm.includes('stock_g1')) {
      scheduleId = 'stock_g1';
    } else if (schedNorm.includes('stock_g2')) {
      scheduleId = 'stock_g2';
    } else if (schedNorm.includes('stock_g3')) {
      scheduleId = 'stock_g3';
    } else if (schedNorm.includes('stock_g4')) {
      scheduleId = 'stock_g4';
    } else if (rawSched.trim()) {
      scheduleId = rawSched.trim();
    }

    // Determine Status
    let status: 'Active' | 'Inactive' | 'Archived' = 'Active';
    if (rawStatus.includes('archive') || rawStatus.includes('archiv')) {
      status = 'Archived';
    } else if (rawStatus.includes('inact') || rawStatus.includes('non') || rawStatus.includes('off')) {
      status = 'Inactive';
    }

    // Determine Saturday Shift
    const hasSaturdayShift =
      rawSat === 'oui' ||
      rawSat === 'yes' ||
      rawSat === 'true' ||
      rawSat === '1' ||
      rawSat === 'vrai' ||
      rawSat.includes('actif') ||
      rawSat.includes('active');

    // Determine Department & Group defaults if not specified
    let department = rawDept;
    if (!department) {
      if (scheduleId === 'no_shift') {
        department = 'Sans Shift';
      } else if (workerType === 'Stock') {
        department = 'Stock & Logistique';
      } else {
        department = 'Administration';
      }
    }

    let group = rawGroup;
    if (!group) {
      if (scheduleId === 'no_shift') {
        group = 'Sans Shift';
      } else if (workerType === 'Stock') {
        group = 'Stock';
      } else {
        group = 'Admin Group 1';
      }
    }

    // Determine Start Date
    let startDate = rawDate;
    if (!startDate || isNaN(Date.parse(startDate))) {
      startDate = new Date().toISOString().slice(0, 10);
    } else {
      try {
        const d = new Date(startDate);
        startDate = d.toISOString().slice(0, 10);
      } catch {
        startDate = new Date().toISOString().slice(0, 10);
      }
    }

    employees.push({
      id: rawId,
      name: rawName || `Worker ${rawId}`,
      workerType,
      companyDepartment: department,
      groupName: group,
      scheduleId,
      status,
      isArchived: status === 'Archived',
      archivedAt: status === 'Archived' ? new Date().toISOString() : undefined,
      hasSaturdayShift,
      startDate,
      notes: rawNotes || undefined,
    });
  }

  if (employees.length === 0) {
    throw new Error('No valid employee records could be parsed from the file.');
  }

  return {
    employees,
    warnings,
    totalRows: totalDataRows,
  };
}
