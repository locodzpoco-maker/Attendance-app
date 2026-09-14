import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Ensure output directories exist
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Initializing Attendance System Documentary PDF Generator...');

// Initialize jsPDF A4 Document
const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
  compress: true,
});

// Load Fonts
const libSansPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';
const libSansBoldPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
const kacstBookPath = '/usr/share/fonts/truetype/kacst/KacstBook.ttf';
const kacstTitlePath = '/usr/share/fonts/truetype/kacst/KacstTitle.ttf';

if (fs.existsSync(libSansPath)) {
  const libSansData = fs.readFileSync(libSansPath).toString('base64');
  doc.addFileToVFS('LiberationSans.ttf', libSansData);
  doc.addFont('LiberationSans.ttf', 'LiberationSans', 'normal');
}
if (fs.existsSync(libSansBoldPath)) {
  const libSansBoldData = fs.readFileSync(libSansBoldPath).toString('base64');
  doc.addFileToVFS('LiberationSans-Bold.ttf', libSansBoldData);
  doc.addFont('LiberationSans-Bold.ttf', 'LiberationSans', 'bold');
}
if (fs.existsSync(kacstBookPath)) {
  const kacstData = fs.readFileSync(kacstBookPath).toString('base64');
  doc.addFileToVFS('KacstBook.ttf', kacstData);
  doc.addFont('KacstBook.ttf', 'KacstBook', 'normal');
}
if (fs.existsSync(kacstTitlePath)) {
  const kacstTitleData = fs.readFileSync(kacstTitlePath).toString('base64');
  doc.addFileToVFS('KacstTitle.ttf', kacstTitleData);
  doc.addFont('KacstTitle.ttf', 'KacstTitle', 'bold');
  doc.addFont('KacstTitle.ttf', 'KacstBook', 'bold');
}

// Colors
const NAVY = [26, 36, 56];
const INDIGO = [79, 70, 229];
const EMERALD = [16, 185, 129];
const SLATE_DARK = [30, 41, 59];
const SLATE_MUTED = [100, 116, 139];
const BG_LIGHT = [248, 250, 252];
const BORDER_LIGHT = [226, 232, 240];

let cursorY = 20;

function checkPageBreak(neededMm = 25) {
  if (cursorY + neededMm > 275) {
    doc.addPage();
    cursorY = 25;
    return true;
  }
  return false;
}

function addPageHeader(title, lang = 'en') {
  const isAr = lang === 'ar';
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_MUTED);

  if (isAr) {
    doc.setFont('KacstBook', 'normal');
    doc.setR2L(true);
    const text = doc.processArabic(title);
    doc.text(text, 195, 12, { align: 'right' });
    doc.text(doc.processArabic('نظام إدارة الحضور والانصراف - وثيقة تشغيلية'), 15, 12);
  } else {
    doc.setFont('LiberationSans', 'normal');
    doc.setR2L(false);
    doc.text(title, 15, 12);
    doc.text('Attendance Management System • Operational Reference', 195, 12, { align: 'right' });
  }

  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.3);
  doc.line(15, 15, 195, 15);
}

function addSectionTitle(title, subtitle, lang = 'en') {
  checkPageBreak(30);
  const isAr = lang === 'ar';

  if (isAr) {
    doc.setFont('KacstTitle', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...NAVY);
    doc.setR2L(true);
    doc.text(doc.processArabic(title), 195, cursorY, { align: 'right' });
    cursorY += 7;

    if (subtitle) {
      doc.setFont('KacstBook', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...SLATE_MUTED);
      doc.text(doc.processArabic(subtitle), 195, cursorY, { align: 'right' });
      cursorY += 8;
    }
  } else {
    doc.setFont('LiberationSans', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...NAVY);
    doc.setR2L(false);
    doc.text(title, 15, cursorY);
    cursorY += 6;

    if (subtitle) {
      doc.setFont('LiberationSans', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...SLATE_MUTED);
      doc.text(subtitle, 15, cursorY);
      cursorY += 8;
    }
  }

  // Accent rule
  doc.setDrawColor(...INDIGO);
  doc.setLineWidth(0.8);
  doc.line(15, cursorY - 3, 195, cursorY - 3);
  cursorY += 4;
}

function addSubheading(title, lang = 'en') {
  checkPageBreak(16);
  const isAr = lang === 'ar';

  if (isAr) {
    doc.setFont('KacstTitle', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...INDIGO);
    doc.setR2L(true);
    doc.text(doc.processArabic(title), 195, cursorY, { align: 'right' });
  } else {
    doc.setFont('LiberationSans', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...INDIGO);
    doc.setR2L(false);
    doc.text(title, 15, cursorY);
  }
  cursorY += 6;
}

function addParagraph(text, lang = 'en') {
  const isAr = lang === 'ar';
  const width = 180;

  if (isAr) {
    doc.setFont('KacstBook', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_DARK);
    doc.setR2L(true);

    const lines = doc.splitTextToSize(text, width);
    checkPageBreak(lines.length * 5.5 + 4);
    for (const line of lines) {
      doc.text(doc.processArabic(line), 195, cursorY, { align: 'right' });
      cursorY += 5.2;
    }
    cursorY += 2;
  } else {
    doc.setFont('LiberationSans', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_DARK);
    doc.setR2L(false);

    const lines = doc.splitTextToSize(text, width);
    checkPageBreak(lines.length * 5 + 4);
    for (const line of lines) {
      doc.text(line, 15, cursorY);
      cursorY += 4.8;
    }
    cursorY += 2;
  }
}

function addBullet(title, description, lang = 'en') {
  const isAr = lang === 'ar';

  if (isAr) {
    doc.setFont('KacstTitle', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.setR2L(true);

    const fullText = title ? `${title}: ${description}` : description;
    const lines = doc.splitTextToSize(fullText, 172);
    checkPageBreak(lines.length * 5.2 + 3);

    // Bullet dot
    doc.setFillColor(...INDIGO);
    doc.circle(192, cursorY - 1.2, 1, 'F');

    for (const line of lines) {
      doc.text(doc.processArabic(line), 188, cursorY, { align: 'right' });
      cursorY += 5.2;
    }
    cursorY += 1.5;
  } else {
    doc.setFont('LiberationSans', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.setR2L(false);

    const fullText = title ? `${title}: ${description}` : description;
    const lines = doc.splitTextToSize(fullText, 172);
    checkPageBreak(lines.length * 4.8 + 3);

    // Bullet dot
    doc.setFillColor(...INDIGO);
    doc.circle(18, cursorY - 1.2, 1, 'F');

    for (const line of lines) {
      doc.text(line, 22, cursorY);
      cursorY += 4.8;
    }
    cursorY += 1.5;
  }
}

function addCalloutBox(title, bodyText, lang = 'en') {
  const isAr = lang === 'ar';
  const boxWidth = 180;
  const lines = doc.splitTextToSize(bodyText, boxWidth - 14);
  const boxHeight = lines.length * (isAr ? 5.2 : 4.8) + 14;

  checkPageBreak(boxHeight + 5);

  // Background
  doc.setFillColor(...BG_LIGHT);
  doc.roundedRect(15, cursorY, boxWidth, boxHeight, 3, 3, 'F');

  // Left/Right accent border
  doc.setFillColor(...INDIGO);
  if (isAr) {
    doc.roundedRect(192.5, cursorY, 2.5, boxHeight, 1, 1, 'F');
  } else {
    doc.roundedRect(15, cursorY, 2.5, boxHeight, 1, 1, 'F');
  }

  const startTextY = cursorY + 6;

  if (isAr) {
    doc.setFont('KacstTitle', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.setR2L(true);
    doc.text(doc.processArabic(title), 188, startTextY, { align: 'right' });

    doc.setFont('KacstBook', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_DARK);

    let textY = startTextY + 5.5;
    for (const line of lines) {
      doc.text(doc.processArabic(line), 188, textY, { align: 'right' });
      textY += 5;
    }
  } else {
    doc.setFont('LiberationSans', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.setR2L(false);
    doc.text(title, 22, startTextY);

    doc.setFont('LiberationSans', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_DARK);

    let textY = startTextY + 5;
    for (const line of lines) {
      doc.text(line, 22, textY);
      textY += 4.6;
    }
  }

  cursorY += boxHeight + 5;
}

// ==========================================
// 1. COVER PAGE / MASTER FRONT MATTER
// ==========================================
console.log('Rendering Master Cover Page...');

// Header background banner
doc.setFillColor(26, 36, 56);
doc.rect(0, 0, 210, 78, 'F');

// Top Brand Badge
doc.setFillColor(79, 70, 229);
doc.roundedRect(15, 14, 38, 8, 2, 2, 'F');
doc.setFont('LiberationSans', 'bold');
doc.setFontSize(8.5);
doc.setTextColor(255, 255, 255);
doc.text('OFFLINE READY v1.0', 18, 19.5);

// System Title (Trilingual)
doc.setFont('LiberationSans', 'bold');
doc.setFontSize(20);
doc.setTextColor(255, 255, 255);
doc.text('ATTENDANCE MANAGEMENT SYSTEM', 15, 31);

doc.setFontSize(12);
doc.setTextColor(199, 210, 254);
doc.text('Complete Operational Documentary, Technical Architecture & User Manual', 15, 38);

doc.setFontSize(11);
doc.setTextColor(226, 232, 240);
doc.text('Système de Gestion des Présences • Guide Complet & Manuel Utilisateur', 15, 45);

doc.setFont('KacstTitle', 'bold');
doc.setFontSize(13);
doc.setR2L(true);
doc.text(doc.processArabic('نظام إدارة الحضور والانصراف والمواقيت • التوثيق الشامل ودليل التشغيل'), 195, 54, { align: 'right' });
doc.setR2L(false);

// Sub-strip with Metadata
doc.setFillColor(30, 41, 59);
doc.rect(0, 62, 210, 16, 'F');
doc.setFont('LiberationSans', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(148, 163, 184);
doc.text('Storage: Local SQLite 3 Engine (attendance.db)   |   Platforms: Windows / macOS / Linux / Web   |   Languages: EN / FR / AR (RTL)', 15, 71.5);

// Main Body Cards on Cover Page
cursorY = 90;

doc.setFont('LiberationSans', 'bold');
doc.setFontSize(14);
doc.setTextColor(...NAVY);
doc.text('Document Structure & Master Index', 15, cursorY);
cursorY += 8;

const indexData = [
  ['Part I', 'English Manual', 'Architecture, Capabilities, Shift Engine & Operator Guide', 'Pages 2 – 5'],
  ['Part II', 'Version Française', 'Architecture, Fonctionnalités, Moteur de Shifts & Guide Pas-à-Pas', 'Pages 6 – 9'],
  ['Part III', 'النسخة العربية', 'المعمارية التقنية، محرك الورديات الذكي، ودليل الاستخدام خطوة بخطوة', 'Pages 10 – 13'],
];

autoTable(doc, {
  startY: cursorY,
  head: [['Section', 'Edition', 'Core Scope & Contents', 'Location']],
  body: indexData,
  theme: 'grid',
  styles: { font: 'LiberationSans', fontSize: 9, cellPadding: 3 },
  headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
  alternateRowStyles: { fillColor: BG_LIGHT },
  margin: { left: 15, right: 15 },
});

cursorY = doc.lastAutoTable.finalY + 12;

// Key Architectural Highlights Box
doc.setFont('LiberationSans', 'bold');
doc.setFontSize(12);
doc.setTextColor(...NAVY);
doc.text('Core Technical Highlights at a Glance', 15, cursorY);
cursorY += 6;

addBullet('100% Offline & Local-First', 'Powered by an embedded SQLite 3 database. No external cloud dependencies, zero latency, and zero risk of corporate biometric data exposure.');
addBullet('Biometric Zero-Loss Ingestion', 'Strictly preserves leading zeros in employee IDs (e.g., 0004, 00022236). Reads text terminals and Excel tables without integer corruption.');
addBullet('Dynamic Shift Detection', 'Automatically assigns Stock team members to Shift 1, Shift 2 (Overnight 18:00–02:00), Shift 3, or Shift 4 based on arrival timestamps.');
addBullet('Shift Unclear Resolution', 'Flags ambiguous punches for supervisor review with audited overrides and immutable raw punch logs.');
addBullet('Regulatory Payroll Compliance', 'Implements 15-min overtime grace thresholds, mid-day pause delay accounting, Friday rest-day exclusions, and automated vacation credits.');
addBullet('Automated Safety Backups', 'Point-in-time snapshot generator, one-click SQLite database restore, and full .db export/import capabilities.');

// Footer on Cover
doc.setFontSize(8);
doc.setTextColor(...SLATE_MUTED);
doc.text('Attendance Management System • Official Documentation • Confidential HR System Document', 15, 288);
doc.text('Page 1 of 13', 195, 288, { align: 'right' });


// ==========================================
// PART I: ENGLISH MANUAL (PAGES 2 - 5)
// ==========================================
console.log('Rendering English Manual...');

doc.addPage();
cursorY = 25;
addPageHeader('PART I: SYSTEM DOCUMENTARY & USER MANUAL (ENGLISH)', 'en');

addSectionTitle('1. System Vision & Architectural Foundation', 'Offline-first, enterprise-grade biometric time & attendance management', 'en');

addParagraph('The Attendance Management System is an enterprise-grade desktop and local web application architected specifically to automate workforce time tracking, biometric punch consolidation, dynamic shift assignment, and compliant payroll calculations.', 'en');

addParagraph('Unlike cloud-based solutions that mandate perpetual internet access, third-party subscriptions, and external hosting of sensitive biometric records, this system runs completely offline. It is powered by a high-performance, embedded SQLite 3 relational database engine (attendance.db) integrated via an abstraction layer that transparently functions within both Electron desktop executables and modern browsers.', 'en');

addSubheading('The Three-Tier Processing Pipeline', 'en');
addBullet('Tier 1: Raw Punch Ingestion & Normalization', 'Raw biometric logs from USB drives, text files, or Excel exports are parsed, deduplicated, and associated with employees while preserving vital formatting like leading zeros.', 'en');
addBullet('Tier 2: Daily Evaluation Engine', 'Each employee calendar day is evaluated against their assigned schedule or dynamic shift criteria. Punches are filtered into first check-in, mid-day breaks, second check-ins, and final exits.', 'en');
addBullet('Tier 3: Monthly Payroll & Audit Layer', 'Aggregates worked hours, overtime, morning delays, break delays, vacation credits, and rest days into multi-sheet Excel reports and printable PDF executive summaries.', 'en');

addCalloutBox(
  'Absolute Biometric Immutability Guarantee',
  'A core security tenet of this system is that raw biometric punch logs are permanently immutable. When an administrator or supervisor adjusts a punch or overrides an unclear shift, the system never alters or deletes the original punch records. Instead, it records an audited adjustment record containing the reviewer name, timestamp, and mandatory justification.',
  'en'
);

addSubheading('2. Deep-Dive: Core Features & Capabilities', 'en');

addParagraph('Below is an exhaustive technical catalog of the operational modules built into the system:', 'en');

addBullet('Preservation of Leading Zeros', 'Biometric employee identifiers such as 0004 or 00022236 frequently lose their leading zeros when opened in traditional spreadsheet software, causing catastrophic payroll mismatches. This system enforces strict string preservation across all parsing, storage, and export layers.', 'en');

addBullet('Dynamic Stock & Logistics Shift Engine', 'Employees assigned to the Stock & Logistics department frequently rotate between 4 distinct daily shifts without advance notice. The system automatically inspects the first punch of each day to dynamically classify the shift:', 'en');

const shiftTableData = [
  ['Shift 1 (Stock Day)', '10:00 – 18:00', '13:00 – 14:00 (60m)', 'After 18:00 (+15m grace)', 'Normal day shift'],
  ['Shift 2 (Stock Night)', '18:00 – 02:00 (+1)', '21:00 – 22:00 (60m)', 'After 02:00 (+15m grace)', 'Crosses midnight into next day'],
  ['Shift 3 (Stock Morning)', '08:30 – 16:30', '12:00 – 13:00 (60m)', 'After 16:30 (+15m grace)', 'Standard logistics morning shift'],
  ['Shift 4 (Stock Mid/Midnight)', '16:00 – 00:00', '21:00 – 22:00 (60m)', 'After 00:00 (+15m grace)', 'Ends precisely at midnight'],
];

autoTable(doc, {
  startY: cursorY,
  head: [['Shift Name', 'Operating Hours', 'Official Break Window', 'Overtime Rule', 'Special Classification']],
  body: shiftTableData,
  theme: 'grid',
  styles: { font: 'LiberationSans', fontSize: 8, cellPadding: 2.2 },
  headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
  alternateRowStyles: { fillColor: BG_LIGHT },
  margin: { left: 15, right: 15 },
});

cursorY = doc.lastAutoTable.finalY + 6;

// Page 3: English Continued
checkPageBreak(50);
addPageHeader('PART I: SYSTEM DOCUMENTARY & USER MANUAL (ENGLISH)', 'en');

addSubheading('Shift Unclear Detection & Supervisor Review', 'en');
addParagraph('When an employee punches in at an unusual hour that falls outside the detection windows for Shifts 1, 2, 3, and 4 (for example, punching in at 13:45 or 23:30), the engine safely flags the record as "Shift Unclear" (SHIFT_UNCLEAR) instead of making an erroneous guess. A prominent review badge appears on the daily attendance screen, enabling the supervisor to open the Shift Review Modal, confirm the actual shift worked, or adjust the punch.', 'en');

addSubheading('Administrative Schedules & Lunch Break Grace Rules', 'en');
addBullet('Admin Group 1 (08:00 – 16:00)', 'Fixed morning schedule for administrative staff with Saturday–Thursday working days.', 'en');
addBullet('Admin Group 2 (08:30 – 16:30)', 'Fixed standard office schedule with weekend off-days.', 'en');
addBullet('Mid-Day Pause Grace Threshold', 'For administrative schedules, employees who punch out and return from lunch after the scheduled break window are granted a 10-minute grace period. If their break delay exceeds 10 minutes, the excess minutes are automatically counted against their daily worked hours.', 'en');

addSubheading('Overtime & Delay Calculation Precision', 'en');
addBullet('15-Minute Overtime Grace Rule', 'Overtime (Heures Supplémentaires) does not accumulate for trivial departures. The system requires an employee to work at least 15 minutes beyond their scheduled shift end before overtime begins accumulating.', 'en');
addBullet('Overnight Shift Day-Off Protection', 'Employees finishing Shift 2 at 02:00 AM have their rest day following the night shift properly accounted for. The engine ensures they are not falsely marked absent on the subsequent day.', 'en');
addBullet('Weekly Rest Days & Friday Exclusions', 'Configurable weekly rest days (defaulting to Friday in accordance with regional labor conventions) are classified as "OFF" and never penalized as unexcused absences.', 'en');

addSubheading('Paid Vacation & Leave Management', 'en');
addParagraph('The Paid Vacation Manager enables administrators to define approved vacation periods for employees. When a vacation is active, the engine automatically credits the employee with a full standard working day (8 hours) and flags the record with a PALMTREE vacation badge, preserving the employee\'s attendance bonus.', 'en');

addSubheading('Local SQLite 3 Database & Automated Snapshot Backups', 'en');
addBullet('Automated Safety Backups', 'Prior to every major batch import or calculation run, the system automatically creates a timestamped snapshot of the local database in the local backups directory.', 'en');
addBullet('Point-in-Time Restore', 'Administrators can view all historical backups and roll back the database with one click.', 'en');
addBullet('Direct .db File Portability', 'Export the entire raw SQLite database file (attendance.db) to an external flash drive or import an existing database from another workstation.', 'en');

// Page 4: English User Guide
checkPageBreak(50);
addPageHeader('PART I: SYSTEM DOCUMENTARY & USER MANUAL (ENGLISH)', 'en');

addSectionTitle('3. Step-by-Step Operator Guide ("How to Use")', 'Complete workflow from biometric terminal to approved payroll', 'en');

const workflowSteps = [
  ['Step 1', 'Initialize Schedules & Rest Days', 'Navigate to "Schedules" tab. Verify shift times for Admin G1, Admin G2, and Stock Shifts 1 to 4. Ensure Friday is designated as the weekly rest day.'],
  ['Step 2', 'Configure Employee Registry', 'Navigate to "Employees" tab. Import employee roster or manually assign employees to their respective department (Stock vs Administration) and schedule.'],
  ['Step 3', 'Import Biometric Attendance Data', 'Click "Import Attendance". Drag & drop your biometric Excel (.xlsx), CSV, or raw text terminal export. The system verifies leading zeros and checks for formatting anomalies.'],
  ['Step 4', 'Execute Attendance Calculation', 'Click the prominent purple "Calculate" button in the top header. The calculation engine processes all punches across all days in seconds.'],
  ['Step 5', 'Audit Daily Records & Resolve Shifts', 'Review the "Daily Attendance" screen. Filter by "Shift Unclear" to review any flagged stock punches. Click "Review Shift" to assign the verified shift.'],
  ['Step 6', 'Apply Overtime Injections or Leave', 'If an employee completed authorized off-clock overtime or had an approved vacation, use the "Adjust Punch" or "Paid Vacations" modals to record audited credits.'],
  ['Step 7', 'Review Monthly Summary & Export', 'Switch to "Monthly Summary" to audit present days, absences, total delay, and overtime hours. Export to formatted Excel (.xlsx) or printable A4 PDF report.'],
];

autoTable(doc, {
  startY: cursorY,
  head: [['Step', 'Operational Phase', 'Standard Operating Procedure']],
  body: workflowSteps,
  theme: 'grid',
  styles: { font: 'LiberationSans', fontSize: 8.5, cellPadding: 2.8 },
  headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
  alternateRowStyles: { fillColor: BG_LIGHT },
  margin: { left: 15, right: 15 },
});

cursorY = doc.lastAutoTable.finalY + 8;

addSubheading('4. Practical Tips & Troubleshooting', 'en');
addBullet('Missing Exit Punch', 'If an employee forgets to clock out, the system safely records an incomplete punch warning and flags the observation column, allowing the supervisor to enter the verified exit time with an audited note.');
addBullet('Duplicate Punches in Succession', 'Employees often badge multiple times within seconds. The ingestion engine automatically deduplicates punches within the configured 5-minute threshold.');
addBullet('Switching Language & Roles', 'Use the top-right controls to toggle instantly between French, English, and Arabic (with complete RTL orientation), and toggle roles between Administrator, HR User, and Management.');

// Footers
doc.setFontSize(8);
doc.setTextColor(...SLATE_MUTED);
doc.text('Attendance Management System • Operational Reference Manual', 15, 288);
doc.text(`Page ${doc.internal.pages.length - 1} of 13`, 195, 288, { align: 'right' });


// ==========================================
// PART II: FRENCH MANUAL (PAGES 6 - 9)
// ==========================================
console.log('Rendering French Manual...');

doc.addPage();
cursorY = 25;
addPageHeader('PARTIE II : DOCUMENTAIRE TECHNIQUE & MANUEL UTILISATEUR (FRANÇAIS)', 'fr');

addSectionTitle('1. Vision du Système & Architecture Technique', 'Gestion biométrique des présences 100% hors-ligne et souveraineté des données', 'fr');

addParagraph('Le Système de Gestion des Présences et du Temps de Travail est une solution logicielle pour ordinateur (Desktop et Web local) spécialement conçue pour répondre aux exigences strictes de la gestion RH : suivi précis des émargements biométriques, affectation dynamique des shifts d\'équipes, et calcul certifié des heures pour la paie.', 'fr');

addParagraph('Contrairement aux plateformes infonuagiques (cloud) imposant des abonnements récurrents et exposant les données personnelles des employés sur des serveurs externes, cette application fonctionne intégralement hors-ligne. Les données sont conservées localement dans un moteur de base de données relationnel SQLite 3 (attendance.db) ultra-rapide et robuste.', 'fr');

addSubheading('Le Pipeline de Traitement en Trois Niveaux', 'fr');
addBullet('Niveau 1 : Ingestion & Normalisation des Données Brutes', 'Importation des pointages issus de clés USB, pointeuses biométriques ou fichiers Excel, avec préservation stricte des zéros initiaux des matricules (ex. 0004, 00022236).', 'fr');
addBullet('Niveau 2 : Évaluation Journalière Intelligente', 'Chaque journée de travail est analysée en fonction du planning assigné ou des règles de détection dynamique des shifts pour le personnel du stock.', 'fr');
addBullet('Niveau 3 : Synthèse Mensuelle & Audit de Clôture', 'Consolidation des heures normales, heures supplémentaires, retards matinaux, dépassements de pause, et génération de rapports Excel et PDF certifiés.', 'fr');

addCalloutBox(
  'Garantie d\'Immuabilité des Pointages Biométriques',
  'Le principe cardinal de sécurité du système repose sur l\'inaltérabilité des pointages bruts. Toute correction ou régularisation manuelle effectuée par un administrateur ne modifie jamais les données d\'origine de la pointeuse : elle fait l\'objet d\'une fiche d\'ajustement signée, datée avec motif obligatoire et identité de l\'auditeur.',
  'fr'
);

addSubheading('2. Répertoire Complet des Fonctionnalités', 'fr');

addBullet('Préservation des Zéros Initiaux des Matricules', 'Les identifiants d\'employés tels que 0004 sont fréquemment tronqués en 4 par les tableurs standards, provoquant des erreurs critiques de paie. Le système applique un traitement textuel rigoureux garantissant l\'intégrité des identifiants.', 'fr');

addBullet('Moteur de Shifts Dynamiques Stock & Logistique', 'Pour les agents du département Stock & Logistique soumis à des rotations journalières sans planning fixe préalable, le système identifie automatiquement le shift effectué d\'après l\'heure du premier pointage :', 'fr');

const shiftTableFr = [
  ['Shift 1 (Stock Jour)', '10:00 – 18:00', '13:00 – 14:00 (60 min)', 'Au-delà de 18:00 (+15 min grâce)', 'Shift de jour standard'],
  ['Shift 2 (Stock Nuit)', '18:00 – 02:00 (+1)', '21:00 – 22:00 (60 min)', 'Au-delà de 02:00 (+15 min grâce)', 'Franchit minuit (J+1)'],
  ['Shift 3 (Stock Matin)', '08:30 – 16:30', '12:00 – 13:00 (60 min)', 'Au-delà de 16:30 (+15 min grâce)', 'Shift logistique du matin'],
  ['Shift 4 (Stock Soir/Minuit)', '16:00 – 00:00', '21:00 – 22:00 (60 min)', 'Au-delà de 00:00 (+15 min grâce)', 'Termine exactement à minuit'],
];

autoTable(doc, {
  startY: cursorY,
  head: [['Nom du Shift', 'Plage Horaire', 'Pause Déjeuner Officielle', 'Heures Supplémentaires (HS)', 'Spécificité']],
  body: shiftTableFr,
  theme: 'grid',
  styles: { font: 'LiberationSans', fontSize: 8, cellPadding: 2.2 },
  headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
  alternateRowStyles: { fillColor: BG_LIGHT },
  margin: { left: 15, right: 15 },
});

cursorY = doc.lastAutoTable.finalY + 6;

// French Page Continued
checkPageBreak(50);
addPageHeader('PARTIE II : DOCUMENTAIRE TECHNIQUE & MANUEL UTILISATEUR (FRANÇAIS)', 'fr');

addSubheading('Détection du Statut "Shift Non Clair" et Validation Superviseur', 'fr');
addParagraph('Lorsqu\'un employé effectue son premier pointage en dehors des créneaux de tolérance des 4 shifts prévus (par exemple à 13h45 ou à 23h30), le système attribue immédiatement l\'état "Shift Non Clair" (SHIFT_UNCLEAR) au lieu de faire une supposition erronée. Le superviseur peut ainsi ouvrir la fenêtre de régularisation et assigner le shift réel après vérification.', 'fr');

addSubheading('Horaires Administratifs & Seuil de Tolérance sur la Pause', 'fr');
addBullet('Admin Groupe 1 (08:00 – 16:00)', 'Horaire fixe pour les services généraux avec repos hebdomadaire le vendredi.', 'fr');
addBullet('Admin Groupe 2 (08:30 – 16:30)', 'Horaire standard pour le personnel de bureau et secrétariat.', 'fr');
addBullet('Pénalité de Dépassement de Pause', 'Pour le personnel administratif, un retour de déjeuner avec plus de 10 minutes de retard au-delà de la fin de pause prévue est automatiquement décompté du temps de travail effectif.', 'fr');

addSubheading('Règles d\'Exactitude des Calculs (Heures Sup & Retards)', 'fr');
addBullet('Seuil de Grâce de 15 Minutes pour les HS', 'Les départs décalés de quelques minutes ne génèrent pas d\'heures supplémentaires indues. Le temps supplémentaire n\'est comptabilisé que si le salarié reste au moins 15 minutes après l\'heure de fin planifiée.', 'fr');
addBullet('Protection du Repos Post-Garde de Nuit', 'Pour un salarié terminant le Shift 2 à 02h00 du matin, la journée de repos qui suit est protégée contre tout faux signalement d\'absence injustifiée.', 'fr');
addBullet('Neutralisation des Vendredis et Jours Fériés', 'Les jours de repos hebdomadaires sont étiquetés "OFF" et ne sont jamais pénalisés comme absences.', 'fr');

addSubheading('Gestion des Congés Payés & Absences Autorisées', 'fr');
addParagraph('Le gestionnaire de congés payés permet d\'enregistrer les périodes d\'absence validées. Lors de ces journées, l\'employé reçoit un crédit complet de 8 heures de présence avec le badge "PALMIER", garantissant la préservation de ses primes d\'assiduité.', 'fr');

addSubheading('Base de Données Locale SQLite 3 & Sauvegardes Instantanées', 'fr');
addBullet('Instantanés de Sécurité Automatisés', 'Avant tout traitement ou réimport massif, une copie conforme (snapshot) de la base de données est enregistrée localement dans le dossier des sauvegardes.', 'fr');
addBullet('Restauration en 1 Clic', 'Possibilité de revenir en arrière instantanément à un état antérieur en cas de mauvaise manipulation.', 'fr');
addBullet('Portabilité Totale (.db)', 'Exportez et importez directement le fichier attendance.db pour transférer la base d\'un ordinateur à un autre.', 'fr');

// French Page 4: User Guide
checkPageBreak(50);
addPageHeader('PARTIE II : DOCUMENTAIRE TECHNIQUE & MANUEL UTILISATEUR (FRANÇAIS)', 'fr');

addSectionTitle('3. Guide Pratique d\'Utilisation Pas à Pas', 'Procédure opérationnelle complète de la pointeuse à la paie', 'fr');

const workflowStepsFr = [
  ['Étape 1', 'Configuration des Horaires', 'Consulter l\'onglet "Horaires". Vérifier les heures de début, de fin et de pause pour Admin G1, G2 et Shifts 1 à 4. Valider le vendredi comme jour OFF.'],
  ['Étape 2', 'Registre du Personnel', 'Dans l\'onglet "Employés", vérifier l\'association de chaque collaborateur à son département (Stock vs Administration) et son matricule exact.'],
  ['Étape 3', 'Importation des Émargements', 'Cliquer sur "Importer Émargements". Glisser-déposer le fichier Excel (.xlsx) ou texte brut de la pointeuse. Le système vérifie l\'absence de doublons.'],
  ['Étape 4', 'Exécution du Calcul Automatisé', 'Cliquer sur le bouton violet "Calculer" dans le bandeau supérieur. L\'ensemble des données de la période est traité en quelques secondes.'],
  ['Étape 5', 'Audit Journalier & Shifts Non Clairs', 'Dans l\'onglet "Présences Journalières", filtrer par "Shift Non Clair" et utiliser le bouton "Régulariser" pour valider le shift des cas ambigus.'],
  ['Étape 6', 'Injection d\'Heures & Congés', 'Si des heures exceptionnelles ont été autorisées ou des congés validés, utiliser les fenêtres "Ajuster Pointage" et "Congés Payés" avec motif audité.'],
  ['Étape 7', 'Synthèse Mensuelle & Exportations', 'Accéder à la "Synthèse Mensuelle" pour contrôler les totaux par salarié. Exporter vers Excel (.xlsx) ou en rapport PDF imprimable.'],
];

autoTable(doc, {
  startY: cursorY,
  head: [['Étape', 'Phase Opérationnelle', 'Instructions de Travail']],
  body: workflowStepsFr,
  theme: 'grid',
  styles: { font: 'LiberationSans', fontSize: 8.5, cellPadding: 2.8 },
  headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
  alternateRowStyles: { fillColor: BG_LIGHT },
  margin: { left: 15, right: 15 },
});

cursorY = doc.lastAutoTable.finalY + 8;

addSubheading('4. Bonnes Pratiques & Guide de Dépannage', 'fr');
addBullet('Oubli de Pointage Sortie', 'Si un employé oublie de badger en sortant, le système le signale dans la colonne observation. L\'administrateur peut renseigner l\'heure certifiée en justifiant la modification.');
addBullet('Double Pointage Rapproché', 'Les salariés badgent souvent deux fois en quelques secondes. Le moteur fusionne automatiquement tout pointage multiple survenant dans un intervalle de 5 minutes.');
addBullet('Changement Instantané de Langue', 'Basculez librement entre le Français, l\'Anglais et l\'Arabe à tout moment sans recharger la page.');


// ==========================================
// PART III: ARABIC MANUAL (PAGES 10 - 13)
// ==========================================
console.log('Rendering Arabic Manual...');

doc.addPage();
cursorY = 25;
addPageHeader('القسم الثالث: التوثيق الفني الشامل ودليل المستخدم (النسخة العربية)', 'ar');

addSectionTitle('1. رؤية النظام والمعمارية التقنية', 'نظام محلي متكامل لإدارة الحضور والانصراف والمواقيت دون الحاجة للإنترنت', 'ar');

addParagraph('نظام إدارة الحضور والانصراف والمواقيت هو تطبيق مكتبي متخصص تم تصميمه وتطويره لتلبية أعلى معايير الدقة والامتثال الإداري في تتبع دوام الموظفين، معالجة سجلات البصمات الحيوية، إدارة الورديات اليومية المرنة، واستخراج تقارير الأجور الشهرية بكل موثوقية.', 'ar');

addParagraph('يتميز النظام بكونه يعمل بالكامل بدون اتصال بالإنترنت (Offline-First)، مما يضمن سرعة استجابة فائقة وحماية مطلقة للبيانات الحيوية وسجلات الموظفين من أي تسريب خارجي. يعتمد النظام على محرك قاعدة بيانات SQLite 3 محلي (attendance.db) مدمج، يتميز بالثبات والكفاءة العالية.', 'ar');

addSubheading('مسار المعالجة الآلي ثلاثي المراحل', 'ar');
addBullet('المرحلة الأولى: استيراد وتوحيد سجلات البصمات', 'قراءة وتدقيق ملفات البصمة الصادرة من أجهزة الحضور (نصية أو إكسل)، مع منع تكرار البصمات والحفاظ التام على الأصفار البادئة في أرقام الموظفين (مثل 0004 و 00022236).', 'ar');
addBullet('المرحلة الثانية: محرك التقييم والاحتساب اليومي', 'تحليل كل يوم عمل لكل موظف وتحديد توقيت الحضور، فترات الاستراحة، توقيت البصمة الثانية، وتوقيت الخروج، مع التعيين التلقائي للورديات لعمال المخازن.', 'ar');
addBullet('المرحلة الثالثة: الملخص الشهري والتدقيق المالي', 'تجميع ساعات العمل الفعلية، ساعات العمل الإضافية، دقائق التأخير، واستبعاد أيام العطلات الأسبوعية، مع تصدير تقارير إكسل وPDF جاهزة للطباعة والاعتماد.', 'ar');

addCalloutBox(
  'ضمان الحصانة الدائمة لسجلات البصمة الأصلية',
  'يقوم المبدأ الأمني للنظام على أن سجلات البصمات الحيوية الخام المستوردة غير قابلة للتعديل أو الحذف إطلاقاً. عند قيام المسؤول بتعديل بصمة ناقصة أو تصحيح وردية، يقوم النظام بحفظ سجل تعديل معتمد ومستقل يحتوي على اسم المسؤول، التوقيت، وسبب التعديل الإلزامي مع إبقاء السجل الخام شاهداً موثقاً.',
  'ar'
);

addSubheading('2. الدليل التفصيلي لميزات وإمكانيات النظام', 'ar');

addBullet('الحفاظ الصارم على الأصفار البادئة في الأرقام الوظيفية', 'غالباً ما تتسبب البرامج التقليدية في حذف الصفر من الأرقام مثل 0004 لتحويلها إلى 4، مما يفسد بيانات الرواتب. يفرض هذا النظام تخزيناً نصياً دقيقاً يمنع ضياع أي رمز.', 'ar');

addBullet('محرك الورديات اليومية الديناميكية لعمال المخازن', 'نظراً لأن عمال المخازن واللوجستيك يتناوبون على 4 ورديات مختلفة بدون جدول مسبق، يقوم النظام بقراءة بصمة الدخول الأولى وتحديد الوردية تلقائياً وفق الجدول التالي:', 'ar');

const shiftTableAr = [
  ['وردية 1 (مخزن نهارية)', '10:00 – 18:00', '13:00 – 14:00 (60 دقيقة)', 'بعد 18:00 (عتبة 15 دقيقة)', 'وردية نهارية أساسية'],
  ['وردية 2 (مخزن ليلية)', '18:00 – 02:00 (+1)', '21:00 – 22:00 (60 دقيقة)', 'بعد 02:00 (عتبة 15 دقيقة)', 'تتجاوز منتصف الليل لليوم التالي'],
  ['وردية 3 (مخزن صباحية)', '08:30 – 16:30', '12:00 – 13:00 (60 دقيقة)', 'بعد 16:30 (عتبة 15 دقيقة)', 'وردية صباحية لوجستية'],
  ['وردية 4 (مخزن منتصف الليل)', '16:00 – 00:00', '21:00 – 22:00 (60 دقيقة)', 'بعد 00:00 (عتبة 15 دقيقة)', 'تنتهي تماماً عند منتصف الليل'],
];

autoTable(doc, {
  startY: cursorY,
  head: [['اسم الوردية', 'مواقيت العمل', 'فترة الاستراحة الرسمية', 'احتساب الساعات الإضافية', 'الخصائص']],
  body: shiftTableAr,
  theme: 'grid',
  styles: { font: 'KacstBook', fontSize: 8, cellPadding: 2.2, halign: 'right' },
  headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' },
  alternateRowStyles: { fillColor: BG_LIGHT },
  margin: { left: 15, right: 15 },
});

cursorY = doc.lastAutoTable.finalY + 6;

// Arabic Page Continued
checkPageBreak(50);
addPageHeader('القسم الثالث: التوثيق الفني الشامل ودليل المستخدم (النسخة العربية)', 'ar');

addSubheading('كشف الوردية غير الواضحة وآلية اعتماد المشرف', 'ar');
addParagraph('إذا قام العامل بتسجيل بصمة دخول في وقت غير معتاد يقع خارج نطاق الورديات الأربع (مثل الساعة 13:45 أو 23:30)، يقوم النظام فوراً بوسم السجل بحالة "وردية غير واضحة" لحمايته من الحساب الخاطئ، ويظهر تنبيه واضح للمشرف لمراجعة السجل واختيار الوردية المعتمدة رسمياً.', 'ar');

addSubheading('الجداول الإدارية ومراقبة استراحة الغداء', 'ar');
addBullet('المجموعة الإدارية 1 (08:00 – 16:00)', 'جدول دوام ثابت للموظفين الإداريين مع احتساب الجمعة كيوم عطلة أسبوعية رسمية.', 'ar');
addBullet('المجموعة الإدارية 2 (08:30 – 16:30)', 'جدول الدوام المكتبي القياسي للوظائف المساندة.', 'ar');
addBullet('عتبة استراحة الغداء', 'يمنح النظام الموظف الإداري مهلة 10 دقائق بعد انتهاء فترة الاستراحة المحددة، وأي تأخير يتجاوز ذلك يتم خصمه تلقائياً من ساعات العمل اليومية الفعلية.', 'ar');

addSubheading('قواعد دقة الاحتساب (الساعات الإضافية والتأخيرات)', 'ar');
addBullet('عتبة الـ 15 دقيقة للساعات الإضافية', 'لا يتم احتساب دقائق البقاء البسيطة كساعات إضافية. يشترط النظام أن يتجاوز الموظف موعد نهاية ورديته بـ 15 دقيقة على الأقل حتى يبدأ عداد الساعات الإضافية.', 'ar');
addBullet('حماية راحة ما بعد الوردية الليلية', 'العامل الذي ينهي الوردية الثانية الساعة 02:00 فجراً يحصل على راحة مستحقة في اليوم التالي، ويمنع النظام تسجيله كغائب دون عذر في ذلك اليوم.', 'ar');
addBullet('استبعاد أيام الجمعة والعطلات', 'تعتبر أيام العطلات الأسبوعية الرسمية أيام راحة (OFF) ولا تؤثر على استحقاق الرواتب أو تقييم الحضور.', 'ar');

addSubheading('إدارة الإجازات السنوية والغياب المبرر', 'ar');
addParagraph('تتيح نافذة إدارة الإجازات تسجيل الفترات المعتمدة للموظفين. ويقوم النظام تلقائياً باحتساب 8 ساعات حضور كاملة عن كل يوم إجازة مع وسم السجل بأيقونة النخلة لضمان حفظ حقوق الموظف في المكافآت.', 'ar');

addSubheading('قاعدة بيانات SQLite 3 المحلية والنسخ الاحتياطي التلقائي', 'ar');
addBullet('النسخ الاحتياطي التلقائي الفوري', 'قبل أي عملية استيراد كبرى أو إعادة احتساب، يُنشئ النظام لقطة أمان كاملة لقاعدة البيانات في مجلد النسخ الاحتياطي المحلي.', 'ar');
addBullet('الاستعادة بنقرة واحدة', 'إمكانية استرجاع أي نقطة زمنية سابقة فوراً في حال حدوث خطأ تشغيلي.', 'ar');
addBullet('تصدير واستيراد ملف .db', 'إمكانية نقل ملف قاعدة البيانات كاملاً على وحدة تخزين خارجية وتشغيله على جهاز حاسوب آخر بكل سهولة.', 'ar');

// Arabic Page 4: User Guide
checkPageBreak(50);
addPageHeader('القسم الثالث: التوثيق الفني الشامل ودليل المستخدم (النسخة العربية)', 'ar');

addSectionTitle('3. دليل الاستخدام التشغيلي خطوة بخطوة', 'الإجراءات القياسية من سحب البصمات وحتى إعداد كشوف الأجور', 'ar');

const workflowStepsAr = [
  ['الخطوة 1', 'ضبط الورديات ومواعيد الدوام', 'التوجه إلى تبويب "المواقيت". التأكد من أوقات البداية والنهاية والاستراحة، وتأكيد تعيين يوم الجمعة كيوم عطلة أسبوعية.'],
  ['الخطوة 2', 'إعداد سجل الموظفين', 'في تبويب "الموظفون"، مراجعة أسماء الموظفين، أرقامهم الوظيفية، وتعيين القسم المناسب (مخزن أو إدارة).'],
  ['الخطوة 3', 'استيراد سجلات البصمة', 'النقر على زر "استيراد البصمات"، ثم سحب وإفلات ملف الإكسل أو الملف النصي لجهاز البصمة، حيث يقوم النظام بالتحقق التلقائي.'],
  ['الخطوة 4', 'بدء عملية المعالجة والحساب', 'الضغط على زر "احسب" البنفسجي في الشريط العلوي. تتم معالجة آلاف البصمات وحساب الساعات في ثوانٍ معدودة.'],
  ['الخطوة 5', 'مراجعة الحضور اليومي والورديات', 'في شاشة "الحضور اليومي"، تصفية السجلات حسب "وردية غير واضحة" واعتماد الوردية المناسبة عبر زر "تعديل الوردية".'],
  ['الخطوة 6', 'إضافة الساعات الإضافية والإجازات', 'في حال وجود عمل إضافي معتمد خارج أوقات البصمة، يتم استخدام نافذة "تعديل البصمة" وإدخال الساعات مع كتابة سبب التعديل.'],
  ['الخطوة 7', 'مراجعة الملخص الشهري والتصدير', 'الانتقال إلى "الملخص الشهري" لتدقيق إجمالي الحضور والغياب وساعات العمل، ثم تصدير الملف كتقرير إكسل أو ملف PDF رسمي.'],
];

autoTable(doc, {
  startY: cursorY,
  head: [['الخطوة', 'المرحلة التشغيلية', 'خطوات العمل القياسية']],
  body: workflowStepsAr,
  theme: 'grid',
  styles: { font: 'KacstBook', fontSize: 8.5, cellPadding: 2.8, halign: 'right' },
  headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' },
  alternateRowStyles: { fillColor: BG_LIGHT },
  margin: { left: 15, right: 15 },
});

cursorY = doc.lastAutoTable.finalY + 8;

addSubheading('4. إرشادات تشغيلية وحلول المشاكل الشائعة', 'ar');
addBullet('نسيان بصمة الخروج', 'عند نسيان العامل لبصمة الخروج، يضع النظام تنبيهاً في خانة الملاحظات، ويمكن للمشرف إدخال وقت الخروج المعتمد مع كتابة المبرر القانوني.', 'ar');
addBullet('تكرار البصمات في ثوانٍ معدودة', 'يقوم النظام بدمج البصمات المتتالية تلقائياً متى ما كانت في نطاق أقل من 5 دقائق لتفادي احتساب بصمات خاطئة.', 'ar');
addBullet('التبديل الفوري بين اللغات', 'يدعم النظام التبديل السريع بين العربية (مع اتجاه كامل من اليمين لليسار) والإنجليزية والفرنسية من الشريط العلوي.', 'ar');

// Total pages calculation and page numbers stamping
const totalPages = doc.internal.pages.length - 1;
console.log(`Document generated with ${totalPages} pages. Applying pagination headers and footers...`);

for (let i = 2; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFont('LiberationSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_MUTED);
  doc.text(`Attendance Management System • Operational Reference Manual • Page ${i} of ${totalPages}`, 15, 288);
}

// Write to files
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

const targetPublicPath = path.resolve('public', 'Attendance_Management_System_Documentary_EN_FR_AR.pdf');
const targetRootPath = path.resolve('Attendance_Management_System_Documentary_EN_FR_AR.pdf');

fs.writeFileSync(targetPublicPath, pdfBuffer);
fs.writeFileSync(targetRootPath, pdfBuffer);

console.log(`PDF successfully generated:`);
console.log(` - ${targetPublicPath} (${pdfBuffer.length} bytes)`);
console.log(` - ${targetRootPath} (${pdfBuffer.length} bytes)`);
