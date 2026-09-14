import { AppLanguage } from '../types';

export interface Translations {
  // Common & Navigation
  appTitle: string;
  appSubtitle: string;
  dashboard: string;
  dailyAttendance: string;
  monthlySummary: string;
  employees: string;
  schedules: string;
  settings: string;
  paidVacations: string;
  databaseBackups: string;

  // Header & Controls
  calculate: string;
  calculating: string;
  importFingerprints: string;
  unmappedWorkers: string;
  activeRole: string;
  admin: string;
  hrUser: string;
  management: string;
  language: string;
  switchLanguage: string;
  english: string;
  french: string;
  arabic: string;

  // Generic Actions
  importAction: string;
  exportAction: string;
  exportExcel: string;
  exportPdf: string;
  printPdf: string;
  exportBackup: string;
  importBackup: string;
  resetDefaults: string;
  resetToFullMonth: string;
  allDates: string;
  allGroups: string;
  allObservations: string;
  quickAddAll: string;
  reviewAndAdd: string;
  autoSavedLocally: string;
  injectSuppHours: string;

  // Quick Stats / Dashboard
  totalEmployees: string;
  presentToday: string;
  lateArrivals: string;
  unclearShifts: string;
  overtimeHours: string;
  injectedSuppHours: string;
  totalPaidVacations: string;
  exportDailyExcel: string;
  exportMonthlyExcel: string;
  exportPDF: string;
  quickActions: string;
  currentPeriod: string;
  recalculatePrompt: string;
  departmentDistribution: string;
  shiftBreakdown: string;
  recalculateEntirePeriod: string;
  importNewFile: string;
  activePeriodBadge: string;
  authoritativeDate: string;
  workedHoursStat: string;
  overtimeHoursStat: string;
  lateMinutesStat: string;
  exportsAndReporting: string;
  exportsAndReportingDesc: string;
  reviewDailyRecords: string;
  viewFullMonthlySummary: string;

  // Daily Attendance View
  searchWorker: string;
  allDepartments: string;
  allStatuses: string;
  startDate: string;
  endDate: string;
  clearFilters: string;
  colDate: string;
  colId: string;
  colName: string;
  colDept: string;
  colShift: string;
  colIn: string;
  secondCheckIn: string;
  colOut: string;
  colWorked: string;
  colLate: string;
  colBreak: string;
  colEarlyExit: string;
  colOvertime: string;
  colSupp: string;
  colObservation: string;
  colActions: string;
  groupSchedule: string;
  btnAdjust: string;
  btnAddSupp: string;
  btnEditSupp: string;
  btnPlanVacation: string;
  btnVacation: string;
  reviewShift: string;

  // Filter Presets & Badges
  allDatesPreset: string;
  presetFirst8: string;
  presetFirst15: string;
  presetSecondHalf: string;
  customRange: string;
  filterDateRange: string;
  fromLabel: string;
  toLabel: string;
  recordsWord: string;
  acrossWord: string;
  daysWord: string;
  shift1Label: string;
  shift2Label: string;
  shift3Label: string;
  shift4Label: string;
  adminFixedSchedule: string;

  // Observations
  obsOnTime: string;
  obsLate: string;
  obsAbsent: string;
  obsMissingEntry: string;
  obsMissingExit: string;
  obsExitAfterMidnight: string;
  obsShiftUnclear: string;
  obsOff: string;
  obsPaidVacation: string;
  obsHoliday: string;

  // Monthly Summary View
  colScheduledDays: string;
  colPresentDays: string;
  colVacationDays: string;
  colAbsentDays: string;
  colOffDays: string;
  colLateDays: string;
  colTotalLate: string;
  colMissingPunches: string;
  colTotalWorked: string;
  colTotalSupp: string;
  colTotalPaid: string;
  monthlyTotals: string;
  searchMonthlyPlaceholder: string;

  // Employees View
  addEmployee: string;
  editEmployee: string;
  batchAdd: string;
  detectMissing: string;
  colSchedule: string;
  colStatus: string;
  colStartDate: string;
  active: string;
  inactive: string;
  suspended: string;
  employeeFormTitle: string;
  fullName: string;
  department: string;
  group: string;
  assignedSchedule: string;
  save: string;
  cancel: string;
  delete: string;
  allWorkers: string;
  allStockWorkers: string;
  allAdminWorkers: string;
  searchEmployeePlaceholder: string;
  unmappedDetectedTitle: string;
  unmappedDetectedSubtitle: string;

  // Work Schedules View
  schedulesTitle: string;
  schedulesSubtitle: string;
  shiftEngineTitle: string;
  shiftEngineSubtitle: string;
  shiftHoursNotice: string;
  dayShift: string;
  nightShift: string;
  dayShifts: string;
  nightShifts: string;
  customShift: string;
  stockShift: string;
  adminShift: string;
  startTime: string;
  endTime: string;
  normalHours: string;
  overtimeStarts: string;
  graceArrival: string;
  graceOvertime: string;
  restDays: string;
  addNewSchedule: string;
  editSchedule: string;
  deleteSchedule: string;
  crossesMidnight: string;
  hasBreak: string;
  breakDuration: string;
  breakStart: string;
  breakEnd: string;
  breakGraceMinutesLabel: string;
  arrivalGraceMinutesLabel: string;
  overtimeGraceMinutesLabel: string;
  overtimeAllowed: string;
  workingDaysLabel: string;
  deleteScheduleConfirm: string;
  resetSchedulesConfirm: string;
  scheduleSavedSuccess: string;

  // Days of week
  daySunday: string;
  dayMonday: string;
  dayTuesday: string;
  dayWednesday: string;
  dayThursday: string;
  dayFriday: string;
  daySaturday: string;

  // Import Modal
  importModalTitle: string;
  importModalSubtitle: string;
  dropAttendanceFile: string;
  readingSpreadsheet: string;
  biometricFormatsNotice: string;
  downloadSampleFile: string;
  loadDemoData: string;
  fileValidatedSuccess: string;
  calculateAttendance: string;
  needSamplePrompt: string;
  autoAddUnmappedLabel: string;
  fileNameLabel: string;
  calendarDaysCount: string;

  // Paid Vacation Modal
  vacationModalTitle: string;
  vacationModalSubtitle: string;
  planNewVacation: string;
  selectEmployee: string;
  vacationStart: string;
  vacationEnd: string;
  vacationDaysCount: string;
  vacationReason: string;
  vacationReasonPlaceholder: string;
  saveVacation: string;
  activeVacationsList: string;
  noVacationsRecorded: string;
  deleteVacationConfirm: string;

  // Settings View
  languageSettings: string;
  languageSettingsDesc: string;
  companySettings: string;
  companyName: string;
  companySubtitleLabel: string;
  gracePeriods: string;
  arrivalGraceMinutes: string;
  overtimeGraceMinutes: string;
  breakGraceMinutes: string;
  userRoles: string;
  backupRestore: string;
  resetAllData: string;
  resetConfirm: string;
  desktopDatabase: string;
  desktopDatabaseDesc: string;

  // Extended UI Keys
  shiftUnclear: string;
  clearDateFilter: string;
  noRecordsFound: string;
  adjustedBadge: string;
  showingWord: string;
  ofWord: string;
  pageWord: string;
  delay: string;
  overtimeGrace: string;
  restoreBackup: string;
  btnSave: string;
  btnCancel: string;
  stockRoleBadge: string;
  adminRoleBadge: string;
  obsShiftUnclearDesc: string;
  detectFingerprints: string;
  searchEmployees: string;
  fromDate: string;
  toDate: string;
  period: string;
  systemDocumentaryPdf: string;
  systemDocumentaryDesc: string;
  downloadPdf: string;
}

export const TRANSLATIONS: Record<AppLanguage, Translations> = {
  fr: {
    appTitle: 'Système de Gestion de Présence',
    appSubtitle: 'Moteur d’Émargement Biométrique et des Horaires de Travail',
    dashboard: 'Tableau de Bord',
    dailyAttendance: 'Présence Journalière',
    monthlySummary: 'Récapitulatif Mensuel',
    employees: 'Gestion des Employés',
    schedules: 'Horaires & Shifts',
    settings: 'Paramètres',
    paidVacations: 'Congés Payés',
    databaseBackups: 'Base de Données & Sauvegardes',

    calculate: 'Recalculer',
    calculating: 'Calcul en cours...',
    importFingerprints: 'Importer Émargement',
    unmappedWorkers: 'Travailleurs non mappés',
    activeRole: 'Rôle Actif',
    admin: 'Administrateur',
    hrUser: 'Utilisateur RH / Présence',
    management: 'Direction (Lecture seule)',
    language: 'Langue',
    switchLanguage: 'Changer la langue',
    english: 'English (Anglais)',
    french: 'Français',
    arabic: 'العربية (Arabe)',

    importAction: 'Importer',
    exportAction: 'Exporter',
    exportExcel: 'Exporter Excel',
    exportPdf: 'Exporter PDF',
    printPdf: 'Imprimer PDF',
    exportBackup: 'Exporter Sauvegarde',
    importBackup: 'Importer Sauvegarde',
    resetDefaults: 'Réinitialiser par Défaut',
    resetToFullMonth: 'Réinitialiser au Mois Complet',
    allDates: 'Toutes les Dates',
    allGroups: 'Tous les Groupes',
    allObservations: 'Toutes les Observations',
    quickAddAll: 'Ajout Rapide de Tous',
    reviewAndAdd: 'Examiner & Ajouter',
    autoSavedLocally: 'Enregistré Localement',
    injectSuppHours: 'Injecter Heures Supp.',

    totalEmployees: 'Total Employés',
    presentToday: 'Présents Aujourd’hui',
    lateArrivals: 'Retards',
    unclearShifts: 'Shifts Non Identifiés',
    overtimeHours: 'Heures Supplémentaires',
    injectedSuppHours: 'Heures Supp. Injectées',
    totalPaidVacations: 'En Congé Payé',
    exportDailyExcel: 'Exporter Journalier Excel',
    exportMonthlyExcel: 'Exporter Mensuel Excel',
    exportPDF: 'Exporter Rapport PDF',
    quickActions: 'Actions Rapides',
    currentPeriod: 'Période Active',
    recalculatePrompt: 'Recalculer les Shifts',
    departmentDistribution: 'Répartition par Département',
    shiftBreakdown: 'Répartition des Horaires',
    recalculateEntirePeriod: 'Recalculer Toute la Période',
    importNewFile: 'Importer un Nouveau Fichier',
    activePeriodBadge: 'Période Active',
    authoritativeDate: 'Date d’Établissement Officielle',
    workedHoursStat: 'Heures Travaillées',
    overtimeHoursStat: 'Heures Supplémentaires',
    lateMinutesStat: 'Minutes de Retard',
    exportsAndReporting: 'Exportations & Rapports',
    exportsAndReportingDesc: 'Télécharger les classeurs Excel audités ou les rapports PDF A4 prêts à l’impression.',
    reviewDailyRecords: 'Examiner tous les enregistrements quotidiens',
    viewFullMonthlySummary: 'Voir le Tableau Récapitulatif Mensuel Complet',

    searchWorker: 'Rechercher par nom, ID ou département...',
    allDepartments: 'Tous les Départements',
    allStatuses: 'Tous les Statuts',
    startDate: 'Date Début',
    endDate: 'Date Fin',
    clearFilters: 'Effacer Filtres',
    colDate: 'Date',
    colId: 'ID',
    colName: 'Nom de l’Employé',
    colDept: 'Département',
    colShift: 'Shift',
    colIn: 'Entrée',
    secondCheckIn: '2ème Entrée (Pause)',
    colOut: 'Sortie',
    colWorked: 'Travaillé',
    colLate: 'Retard',
    colBreak: 'Pause',
    colEarlyExit: 'Sortie Anticipée',
    colOvertime: 'H. Supp.',
    colSupp: 'Supp.',
    colObservation: 'Observation',
    colActions: 'Actions',
    groupSchedule: 'Groupe & Horaire',
    btnAdjust: 'Ajuster',
    btnAddSupp: '+ Supp',
    btnEditSupp: 'Éditer Supp',
    btnPlanVacation: 'Planifier Congé',
    btnVacation: 'Congé',
    reviewShift: 'Vérifier Shift',

    allDatesPreset: 'Toutes les Dates',
    presetFirst8: '01 au 08 (8 premiers jours)',
    presetFirst15: '01 au 15 (1ère quinzaine)',
    presetSecondHalf: '16 à la Fin (2ème quinzaine)',
    customRange: 'Période Personnalisée',
    filterDateRange: 'Filtre par Période',
    fromLabel: 'Du',
    toLabel: 'Au',
    recordsWord: 'enregistrements',
    acrossWord: 'sur',
    daysWord: 'jours',
    shift1Label: 'Shift 1 (10:00–18:00)',
    shift2Label: 'Shift 2 (18:00–02:00)',
    shift3Label: 'Shift 3 (08:30–16:30)',
    shift4Label: 'Shift 4 (16:00–00:00)',
    adminFixedSchedule: 'Administratif / Horaire Fixe',

    obsOnTime: 'Ponctuel',
    obsLate: 'Retard',
    obsAbsent: 'Absence',
    obsMissingEntry: 'Entrée non pointée',
    obsMissingExit: 'Sortie non pointée',
    obsExitAfterMidnight: 'Sortie après minuit',
    obsShiftUnclear: 'HORAIRE NON IDENTIFIÉ',
    obsOff: 'OFF (Repos)',
    obsPaidVacation: 'Congé payé',
    obsHoliday: 'Congé / Férié',

    colScheduledDays: 'Jours Ouvrés',
    colPresentDays: 'Présences',
    colVacationDays: 'Congé Payé',
    colAbsentDays: 'Absences',
    colOffDays: 'Repos (OFF)',
    colLateDays: 'Retards',
    colTotalLate: 'Total Retard',
    colMissingPunches: 'Pointages Manquants',
    colTotalWorked: 'Heures Travaillées',
    colTotalSupp: 'Heures Supp.',
    colTotalPaid: 'Total Heures Payées',
    monthlyTotals: 'Totaux Mensuels',
    searchMonthlyPlaceholder: 'Rechercher par ID, Nom ou Département...',

    addEmployee: 'Ajouter un Employé',
    editEmployee: 'Modifier l’Employé',
    batchAdd: 'Ajout Groupé',
    detectMissing: 'Détecter Travailleurs Non Mappés',
    colSchedule: 'Horaire Assigné',
    colStatus: 'Statut',
    colStartDate: 'Date Début',
    active: 'Actif',
    inactive: 'Inactif',
    suspended: 'Suspendu',
    employeeFormTitle: 'Fiche de l’Employé',
    fullName: 'Nom Complet',
    department: 'Département',
    group: 'Groupe',
    assignedSchedule: 'Horaire de Travail Assigné',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    allWorkers: 'Tous les Travailleurs',
    allStockWorkers: 'Travailleurs Stock',
    allAdminWorkers: 'Employés Administratifs',
    searchEmployeePlaceholder: 'Rechercher par ID (ex: 00039) ou Nom...',
    unmappedDetectedTitle: 'Travailleurs non mappés détectés dans le fichier d’émargement',
    unmappedDetectedSubtitle: 'Le fichier brut importé contient des travailleurs non enregistrés dans votre cartographie.',

    schedulesTitle: 'Horaires & Règles de Travail',
    schedulesSubtitle: 'Configuré en shifts de 7.0 heures normales (Administration Groupe 2 à 4.0 heures)',
    shiftEngineTitle: 'Moteur d’Horaires et de Shifts Configurable',
    shiftEngineSubtitle: 'Règles de travail, pauses, passage de minuit et seuil d’heures supplémentaires de 15 minutes. Sauvegardé localement.',
    shiftHoursNotice: 'Shifts généraux : 7h de travail | Shift Admin 2 : 4h',
    dayShift: 'Shift de Jour',
    nightShift: 'Shift de Nuit',
    dayShifts: 'Shifts de Jour',
    nightShifts: 'Shifts de Nuit',
    customShift: 'Shift Personnalisé',
    stockShift: 'Shift Stock',
    adminShift: 'Shift Administratif',
    startTime: 'Heure Début',
    endTime: 'Heure Fin',
    normalHours: 'Heures Normales',
    overtimeStarts: 'Début Heures Supp.',
    graceArrival: 'Tolérance Entrée (min)',
    graceOvertime: 'Tolérance H. Supp. (min)',
    restDays: 'Jours de Repos',
    addNewSchedule: 'Ajouter un Nouvel Horaire',
    editSchedule: 'Modifier l’Horaire',
    deleteSchedule: 'Supprimer l’Horaire',
    crossesMidnight: 'Dépasse Minuit (Jour Suivant)',
    hasBreak: 'Pause Déjeuner Incluse',
    breakDuration: 'Durée Pause (min)',
    breakStart: 'Début Pause',
    breakEnd: 'Fin Pause',
    breakGraceMinutesLabel: 'Tolérance Pause (min)',
    arrivalGraceMinutesLabel: 'Tolérance Retard Entrée (min)',
    overtimeGraceMinutesLabel: 'Seuil Déclenchement H. Supp. (min)',
    overtimeAllowed: 'Heures Supplémentaires Autorisées',
    workingDaysLabel: 'Jours Travaillés',
    deleteScheduleConfirm: 'Êtes-vous sûr de vouloir supprimer l’horaire ?',
    resetSchedulesConfirm: 'Réinitialiser tous les horaires aux valeurs par défaut d’usine ? Tout horaire personnalisé sera remplacé.',
    scheduleSavedSuccess: 'Horaire enregistré avec succès ! Sauvegardé localement.',

    daySunday: 'Dimanche',
    dayMonday: 'Lundi',
    dayTuesday: 'Mardi',
    dayWednesday: 'Mercredi',
    dayThursday: 'Jeudi',
    dayFriday: 'Vendredi',
    daySaturday: 'Samedi',

    importModalTitle: 'Importer Fichier d’Émargement Brut',
    importModalSubtitle: 'Supporte les formats .xls et .xlsx',
    dropAttendanceFile: 'Glissez votre fichier d’émargement ici, ou parcourez',
    readingSpreadsheet: 'Lecture et validation du fichier...',
    biometricFormatsNotice: 'Accepte les exports bruts de pointeuses biométriques (.xls ou .xlsx)',
    downloadSampleFile: 'Télécharger AttendanceRecord_0 (56).xlsx',
    loadDemoData: 'Charger Données Référence Juillet 2026',
    fileValidatedSuccess: 'Fichier Vérifié et Validé avec Succès',
    calculateAttendance: 'CALCULER L’ÉMARGEMENT',
    needSamplePrompt: 'Besoin d’un fichier exemple pour tester immédiatement ?',
    autoAddUnmappedLabel: 'Ajouter automatiquement ces nouveaux travailleurs au répertoire lors du calcul',
    fileNameLabel: 'Nom du Fichier',
    calendarDaysCount: 'jours calendaires traités',

    vacationModalTitle: 'Gestion des Congés Payés',
    vacationModalSubtitle: 'Définissez les périodes de congé payé pour vos employés',
    planNewVacation: 'Planifier un Nouveau Congé',
    selectEmployee: 'Sélectionner l’Employé',
    vacationStart: 'Date Début du Congé',
    vacationEnd: 'Date Fin du Congé',
    vacationDaysCount: 'Nombre de Jours Ouvrés',
    vacationReason: 'Motif / Justificatif',
    vacationReasonPlaceholder: 'Ex: Congé annuel payé, congé maladie justifié...',
    saveVacation: 'Enregistrer le Congé',
    activeVacationsList: 'Congés Enregistrés et Planifiés',
    noVacationsRecorded: 'Aucun congé payé n’est enregistré actuellement.',
    deleteVacationConfirm: 'Êtes-vous sûr de vouloir supprimer cette période de congé payé ?',

    languageSettings: 'Langue de l’Application',
    languageSettingsDesc: 'Choisissez votre langue préférée. La disposition de droite à gauche (RTL) est automatiquement activée pour l’arabe.',
    companySettings: 'Informations Entreprise',
    companyName: 'Nom de l’Entreprise',
    companySubtitleLabel: 'Sous-titre / Description',
    gracePeriods: 'Périodes de Tolérance',
    arrivalGraceMinutes: 'Tolérance Retard Entrée (minutes)',
    overtimeGraceMinutes: 'Seuil Heures Supplémentaires (minutes)',
    breakGraceMinutes: 'Tolérance Temps de Pause (minutes)',
    userRoles: 'Rôle Utilisateur Actif',
    backupRestore: 'Sauvegarde & Restauration',
    resetAllData: 'Réinitialiser toutes les données',
    resetConfirm: 'Voulez-vous vraiment réinitialiser toutes les données ?',
    desktopDatabase: 'Base de Données Locale SQLite',
    desktopDatabaseDesc: 'Gestion de la base de données locale d’émargement et sauvegardes automatiques.',

    shiftUnclear: 'Shift Non Clair',
    clearDateFilter: 'Effacer le filtre de date',
    noRecordsFound: 'Aucun enregistrement trouvé',
    adjustedBadge: 'Ajusté',
    showingWord: 'Affichage',
    ofWord: 'sur',
    pageWord: 'Page',
    delay: 'Retard',
    overtimeGrace: 'Seuil HS',
    restoreBackup: 'Restaurer',
    btnSave: 'Enregistrer',
    btnCancel: 'Annuler',
    stockRoleBadge: 'Shift Stock',
    adminRoleBadge: 'Admin',
    obsShiftUnclearDesc: 'ne correspond pas clairement aux shifts de stock. Veuillez sélectionner le shift travaillé.',
    detectFingerprints: 'Auto-Détection',
    searchEmployees: 'Rechercher par nom ou matricule...',
    fromDate: 'Du',
    toDate: 'Au',
    period: 'Période',
    systemDocumentaryPdf: 'Guide & Documentaire Système (PDF)',
    systemDocumentaryDesc: 'Documentaire complet, architecture technique et guide d\'utilisation (EN / FR / AR)',
    downloadPdf: 'Télécharger PDF',
  },

  en: {
    appTitle: 'Attendance Management System',
    appSubtitle: 'Automated Biometric Fingerprint & Schedule Engine',
    dashboard: 'Dashboard',
    dailyAttendance: 'Daily Attendance',
    monthlySummary: 'Monthly Summary',
    employees: 'Employees',
    schedules: 'Work Schedules',
    settings: 'Settings',
    paidVacations: 'Paid Vacations',
    databaseBackups: 'Database & Backups',

    calculate: 'Recalculate',
    calculating: 'Calculating...',
    importFingerprints: 'Import Fingerprints',
    unmappedWorkers: 'Unmapped Workers',
    activeRole: 'Active Role',
    admin: 'Administrator',
    hrUser: 'HR / Attendance User',
    management: 'Management',
    language: 'Language',
    switchLanguage: 'Switch Language',
    english: 'English',
    french: 'Français (French)',
    arabic: 'العربية (Arabic)',

    importAction: 'Import',
    exportAction: 'Export',
    exportExcel: 'Export Excel',
    exportPdf: 'Export PDF',
    printPdf: 'Print PDF',
    exportBackup: 'Export Backup',
    importBackup: 'Import Backup',
    resetDefaults: 'Reset Defaults',
    resetToFullMonth: 'Reset to Full Month',
    allDates: 'All Dates',
    allGroups: 'All Groups',
    allObservations: 'All Observations',
    quickAddAll: 'Quick Add All',
    reviewAndAdd: 'Review & Add',
    autoSavedLocally: 'Auto-Saved Locally',
    injectSuppHours: 'Inject Supp Hours',

    totalEmployees: 'Total Employees',
    presentToday: 'Present Today',
    lateArrivals: 'Late Arrivals',
    unclearShifts: 'Unclear Shifts',
    overtimeHours: 'Overtime Hours',
    injectedSuppHours: 'Supplementary Hours',
    totalPaidVacations: 'On Paid Vacation',
    exportDailyExcel: 'Export Daily Excel',
    exportMonthlyExcel: 'Export Monthly Excel',
    exportPDF: 'Export PDF Report',
    quickActions: 'Quick Actions',
    currentPeriod: 'Current Period',
    recalculatePrompt: 'Recalculate Shifts',
    departmentDistribution: 'Department Distribution',
    shiftBreakdown: 'Shift Breakdown',
    recalculateEntirePeriod: 'Recalculate Entire Period',
    importNewFile: 'Import New File',
    activePeriodBadge: 'Active Period',
    authoritativeDate: 'Authoritative Made Date',
    workedHoursStat: 'Worked Hours',
    overtimeHoursStat: 'Overtime Hours',
    lateMinutesStat: 'Late Minutes',
    exportsAndReporting: 'Exports & Reporting',
    exportsAndReportingDesc: 'Download audited Excel workbooks or print-ready A4 PDF reports.',
    reviewDailyRecords: 'Review all daily records',
    viewFullMonthlySummary: 'View Full Monthly Summary Table',

    searchWorker: 'Search by worker name, ID, or department...',
    allDepartments: 'All Departments',
    allStatuses: 'All Statuses',
    startDate: 'Start Date',
    endDate: 'End Date',
    clearFilters: 'Clear Filters',
    colDate: 'Date',
    colId: 'ID',
    colName: 'Employee Name',
    colDept: 'Department',
    colShift: 'Shift',
    colIn: 'In',
    secondCheckIn: '2nd In (Break)',
    colOut: 'Out',
    colWorked: 'Worked',
    colLate: 'Late',
    colBreak: 'Break',
    colEarlyExit: 'Early Exit',
    colOvertime: 'Overtime',
    colSupp: 'Supp',
    colObservation: 'Observation',
    colActions: 'Actions',
    groupSchedule: 'Group & Schedule',
    btnAdjust: 'Adjust',
    btnAddSupp: '+ Supp',
    btnEditSupp: 'Edit Supp',
    btnPlanVacation: 'Plan Vacation',
    btnVacation: 'Vacation',
    reviewShift: 'Review Shift',

    allDatesPreset: 'All Dates',
    presetFirst8: '01 to 08 (First 8 days)',
    presetFirst15: '01 to 15 (1st half)',
    presetSecondHalf: '16 to End (2nd half)',
    customRange: 'Custom Range Selected',
    filterDateRange: 'Date Range Filter',
    fromLabel: 'From',
    toLabel: 'To',
    recordsWord: 'records',
    acrossWord: 'across',
    daysWord: 'days',
    shift1Label: 'Shift 1 (10:00–18:00)',
    shift2Label: 'Shift 2 (18:00–02:00)',
    shift3Label: 'Shift 3 (08:30–16:30)',
    shift4Label: 'Shift 4 (16:00–00:00)',
    adminFixedSchedule: 'Admin / Fixed schedule',

    obsOnTime: 'On Time',
    obsLate: 'Late',
    obsAbsent: 'Absent',
    obsMissingEntry: 'Missing Entry',
    obsMissingExit: 'Missing Exit',
    obsExitAfterMidnight: 'Exit After Midnight',
    obsShiftUnclear: 'SHIFT UNCLEAR',
    obsOff: 'OFF (Rest)',
    obsPaidVacation: 'Paid Vacation',
    obsHoliday: 'Holiday',

    colScheduledDays: 'Work Days',
    colPresentDays: 'Present',
    colVacationDays: 'Paid Vacation',
    colAbsentDays: 'Absent',
    colOffDays: 'Rest (OFF)',
    colLateDays: 'Delays',
    colTotalLate: 'Total Late',
    colMissingPunches: 'Missing Punch',
    colTotalWorked: 'Worked Hours',
    colTotalSupp: 'Supp. Hours',
    colTotalPaid: 'Total Paid Hours',
    monthlyTotals: 'Monthly Totals',
    searchMonthlyPlaceholder: 'Search employee by ID, Name or Department...',

    addEmployee: 'Add Employee',
    editEmployee: 'Edit Employee',
    batchAdd: 'Batch Add',
    detectMissing: 'Detect Unmapped Workers',
    colSchedule: 'Assigned Schedule',
    colStatus: 'Status',
    colStartDate: 'Start Date',
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    employeeFormTitle: 'Employee Details',
    fullName: 'Full Name',
    department: 'Department',
    group: 'Group',
    assignedSchedule: 'Assigned Work Schedule',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    allWorkers: 'All Workers',
    allStockWorkers: 'Stock Workers',
    allAdminWorkers: 'Admin Workers',
    searchEmployeePlaceholder: 'Search ID (e.g. 00039) or Name...',
    unmappedDetectedTitle: 'Unmapped Workers Detected in Attendance File',
    unmappedDetectedSubtitle: 'The imported attendance file contains workers not saved in your Employee Mapping.',

    schedulesTitle: 'Work Schedules & Shift Rules',
    schedulesSubtitle: 'Configured with 7.0-hour normal shifts (Admin Group 2 at 4.0 hours)',
    shiftEngineTitle: 'Configurable Schedule & Shift Engine',
    shiftEngineSubtitle: 'Work rules, breaks, cross-midnight handling, and 15-minute overtime thresholds. Auto-saved locally.',
    shiftHoursNotice: 'General Shifts: 7 hrs | Admin Shift 2: 4 hrs',
    dayShift: 'Day Shift',
    nightShift: 'Night Shift',
    dayShifts: 'Day Shifts',
    nightShifts: 'Night Shifts',
    customShift: 'Custom Shift',
    stockShift: 'Stock Shift',
    adminShift: 'Admin Shift',
    startTime: 'Start Time',
    endTime: 'End Time',
    normalHours: 'Normal Hours',
    overtimeStarts: 'Overtime Starts',
    graceArrival: 'Arrival Grace (min)',
    graceOvertime: 'Overtime Grace (min)',
    restDays: 'Rest Days',
    addNewSchedule: 'Add New Schedule',
    editSchedule: 'Edit Schedule',
    deleteSchedule: 'Delete Schedule',
    crossesMidnight: 'Crosses Midnight (Next Day)',
    hasBreak: 'Lunch Break Included',
    breakDuration: 'Break Duration (min)',
    breakStart: 'Break Start',
    breakEnd: 'Break End',
    breakGraceMinutesLabel: 'Break Grace (min)',
    arrivalGraceMinutesLabel: 'Arrival Grace (min)',
    overtimeGraceMinutesLabel: 'Overtime Threshold (min)',
    overtimeAllowed: 'Overtime Allowed',
    workingDaysLabel: 'Working Days',
    deleteScheduleConfirm: 'Are you sure you want to delete this schedule?',
    resetSchedulesConfirm: 'Reset all schedules to system factory defaults? Any custom schedules will be replaced.',
    scheduleSavedSuccess: 'Schedule saved successfully! Changes are actively saved locally.',

    daySunday: 'Sunday',
    dayMonday: 'Monday',
    dayTuesday: 'Tuesday',
    dayWednesday: 'Wednesday',
    dayThursday: 'Thursday',
    dayFriday: 'Friday',
    daySaturday: 'Saturday',

    importModalTitle: 'Import Raw Attendance Export',
    importModalSubtitle: 'Supports legacy .xls and modern .xlsx formats',
    dropAttendanceFile: 'Drop your attendance file here, or browse',
    readingSpreadsheet: 'Reading and validating spreadsheet...',
    biometricFormatsNotice: 'Accepts raw exports from fingerprint / biometric software (.xls or .xlsx)',
    downloadSampleFile: 'Download AttendanceRecord_0 (56).xlsx',
    loadDemoData: 'Load July 2026 Reference Data',
    fileValidatedSuccess: 'File Verified & Validated Successfully',
    calculateAttendance: 'CALCULATE ATTENDANCE',
    needSamplePrompt: 'Need a sample file to test right away?',
    autoAddUnmappedLabel: 'Automatically add these new workers to Employee Mapping upon calculation',
    fileNameLabel: 'File Name',
    calendarDaysCount: 'calendar days processed',

    vacationModalTitle: 'Paid Vacation Management',
    vacationModalSubtitle: 'Define paid vacation periods for employees',
    planNewVacation: 'Plan New Vacation',
    selectEmployee: 'Select Employee',
    vacationStart: 'Vacation Start Date',
    vacationEnd: 'Vacation End Date',
    vacationDaysCount: 'Working Days Count',
    vacationReason: 'Reason / Notes',
    vacationReasonPlaceholder: 'e.g. Annual paid leave, approved medical...',
    saveVacation: 'Save Vacation',
    activeVacationsList: 'Scheduled Paid Vacations',
    noVacationsRecorded: 'No paid vacations currently recorded.',
    deleteVacationConfirm: 'Are you sure you want to delete this vacation record?',

    languageSettings: 'Application Language',
    languageSettingsDesc: 'Choose your preferred language. Right-to-Left (RTL) layout is automatically enabled for Arabic.',
    companySettings: 'Company Information',
    companyName: 'Company Name',
    companySubtitleLabel: 'Subtitle / Description',
    gracePeriods: 'Grace Periods',
    arrivalGraceMinutes: 'Arrival Grace (minutes)',
    overtimeGraceMinutes: 'Overtime Grace (minutes)',
    breakGraceMinutes: 'Break Grace (minutes)',
    userRoles: 'Active Role',
    backupRestore: 'Backup & Restore',
    resetAllData: 'Reset All Data',
    resetConfirm: 'Are you sure you want to reset all data and settings?',
    desktopDatabase: 'Local SQLite Database',
    desktopDatabaseDesc: 'Manage local attendance database and automated backups.',

    shiftUnclear: 'Shift Unclear',
    clearDateFilter: 'Clear date filter',
    noRecordsFound: 'No records found',
    adjustedBadge: 'Adjusted',
    showingWord: 'Showing',
    ofWord: 'of',
    pageWord: 'Page',
    delay: 'Late Arrival',
    overtimeGrace: 'Overtime Grace',
    restoreBackup: 'Restore',
    btnSave: 'Save',
    btnCancel: 'Cancel',
    stockRoleBadge: 'Stock Shift',
    adminRoleBadge: 'Admin',
    obsShiftUnclearDesc: 'does not clearly correspond to any stock shifts. Please confirm the shift worked.',
    detectFingerprints: 'Auto-Detect',
    searchEmployees: 'Search by name or ID...',
    fromDate: 'From',
    toDate: 'To',
    period: 'Period',
    systemDocumentaryPdf: 'System Documentary & Manual (PDF)',
    systemDocumentaryDesc: 'Complete technical architecture, capabilities & operator manual (EN / FR / AR)',
    downloadPdf: 'Download PDF',
  },

  ar: {
    appTitle: 'نظام إدارة الحضور والانصراف',
    appSubtitle: 'محرك أوتوماتيكي لمعالجة بصمات الحضور وجداول العمل',
    dashboard: 'لوحة التحكم',
    dailyAttendance: 'سجل الحضور اليومي',
    monthlySummary: 'الملخص الشهري',
    employees: 'إدارة الموظفين',
    schedules: 'جداول العمل والورديات',
    settings: 'الإعدادات',
    paidVacations: 'الإجازات المدفوعة',
    databaseBackups: 'قاعدة البيانات والنسخ الاحتياطي',

    calculate: 'إعادة الحساب',
    calculating: 'جاري الحساب...',
    importFingerprints: 'استيراد البصمات',
    unmappedWorkers: 'عمال غير مسجلين',
    activeRole: 'الدور الحالي',
    admin: 'مدير النظام',
    hrUser: 'مسؤول الموارد البشرية',
    management: 'الإدارة (قراءة فقط)',
    language: 'اللغة',
    switchLanguage: 'تغيير اللغة',
    english: 'English (الإنجليزية)',
    french: 'Français (الفرنسية)',
    arabic: 'العربية',

    importAction: 'استيراد',
    exportAction: 'تصدير',
    exportExcel: 'تصدير إكسل',
    exportPdf: 'تصدير PDF',
    printPdf: 'طباعة PDF',
    exportBackup: 'تصدير نسخة احتياطية',
    importBackup: 'استيراد نسخة احتياطية',
    resetDefaults: 'استعادة الإعدادات الافتراضية',
    resetToFullMonth: 'إعادة التعيين للشهر بالكامل',
    allDates: 'كل التواريخ',
    allGroups: 'كل المجموعات',
    allObservations: 'كل الملاحظات',
    quickAddAll: 'إضافة سريعة للكل',
    reviewAndAdd: 'مراجعة وإضافة',
    autoSavedLocally: 'محفوظ محلياً',
    injectSuppHours: 'إضافة ساعات إضافية',

    totalEmployees: 'إجمالي الموظفين',
    presentToday: 'الحاضرون اليوم',
    lateArrivals: 'حالات التأخير',
    unclearShifts: 'ورديات غير محددة',
    overtimeHours: 'ساعات العمل الإضافي',
    injectedSuppHours: 'ساعات إضافية مضافة',
    totalPaidVacations: 'في إجازة مدفوعة',
    exportDailyExcel: 'تصدير اليومي إكسل',
    exportMonthlyExcel: 'تصدير الشهري إكسل',
    exportPDF: 'تصدير تقرير PDF',
    quickActions: 'إجراءات سريعة',
    currentPeriod: 'الفترة الحالية',
    recalculatePrompt: 'إعادة حساب الورديات',
    departmentDistribution: 'توزيع الأقسام',
    shiftBreakdown: 'توزيع الورديات',
    recalculateEntirePeriod: 'إعادة حساب الفترة بالكامل',
    importNewFile: 'استيراد ملف جديد',
    activePeriodBadge: 'الفترة النشطة',
    authoritativeDate: 'تاريخ الإصدار المعتمد',
    workedHoursStat: 'ساعات العمل',
    overtimeHoursStat: 'الساعات الإضافية',
    lateMinutesStat: 'دقائق التأخير',
    exportsAndReporting: 'التصدير والتقارير',
    exportsAndReportingDesc: 'تنزيل دفاتر عمل Excel المراجعة أو تقارير PDF A4 الجاهزة للطباعة.',
    reviewDailyRecords: 'مراجعة جميع السجلات اليومية',
    viewFullMonthlySummary: 'عرض جدول الملخص الشهري الكامل',

    searchWorker: 'بحث باسم الموظف، الرقم التعريفي أو القسم...',
    allDepartments: 'جميع الأقسام',
    allStatuses: 'جميع الحالات',
    startDate: 'تاريخ البدء',
    endDate: 'تاريخ الانتهاء',
    clearFilters: 'مسح الفلاتر',
    colDate: 'التاريخ',
    colId: 'الرقم',
    colName: 'اسم الموظف',
    colDept: 'القسم',
    colShift: 'الوردية',
    colIn: 'دخول',
    secondCheckIn: 'دخول 2 (استراحة)',
    colOut: 'خروج',
    colWorked: 'المعمل',
    colLate: 'تأخير',
    colBreak: 'استراحة',
    colEarlyExit: 'خروج مبكر',
    colOvertime: 'إضافي',
    colSupp: 'مضاف',
    colObservation: 'الملاحظة',
    colActions: 'إجراءات',
    groupSchedule: 'المجموعة والجدول',
    btnAdjust: 'تعديل',
    btnAddSupp: '+ إضافي',
    btnEditSupp: 'تعديل الإضافي',
    btnPlanVacation: 'تسجيل إجازة',
    btnVacation: 'إجازة',
    reviewShift: 'مراجعة الوردية',

    allDatesPreset: 'جميع التواريخ',
    presetFirst8: '01 إلى 08 (أول 8 أيام)',
    presetFirst15: '01 إلى 15 (النصف الأول)',
    presetSecondHalf: '16 إلى النهاية (النصف الثاني)',
    customRange: 'نطاق مخصص محدد',
    filterDateRange: 'تصفية نطاق التاريخ',
    fromLabel: 'من',
    toLabel: 'إلى',
    recordsWord: 'سجلات',
    acrossWord: 'عبر',
    daysWord: 'أيام',
    shift1Label: 'وردية 1 (10:00–18:00)',
    shift2Label: 'وردية 2 (18:00–02:00)',
    shift3Label: 'وردية 3 (08:30–16:30)',
    shift4Label: 'وردية 4 (16:00–00:00)',
    adminFixedSchedule: 'إداري / جدول ثابت',

    obsOnTime: 'في الوقت',
    obsLate: 'متأخر',
    obsAbsent: 'غائب',
    obsMissingEntry: 'دخول غير مسجل',
    obsMissingExit: 'خروج غير مسجل',
    obsExitAfterMidnight: 'خروج بعد منتصف الليل',
    obsShiftUnclear: 'وردية غير محددة',
    obsOff: 'عطلة (OFF)',
    obsPaidVacation: 'إجازة مدفوعة',
    obsHoliday: 'عطلة رسمية',

    colScheduledDays: 'أيام العمل',
    colPresentDays: 'الحضور',
    colVacationDays: 'إجازة مدفوعة',
    colAbsentDays: 'الغياب',
    colOffDays: 'عطلة (OFF)',
    colLateDays: 'مرات التأخير',
    colTotalLate: 'إجمالي التأخير',
    colMissingPunches: 'بصمات ناقصة',
    colTotalWorked: 'ساعات العمل',
    colTotalSupp: 'ساعات إضافية',
    colTotalPaid: 'إجمالي الساعات المدفوعة',
    monthlyTotals: 'المجاميع الشهرية',
    searchMonthlyPlaceholder: 'بحث بالمعرف، الاسم أو القسم...',

    addEmployee: 'إضافة موظف',
    editEmployee: 'تعديل الموظف',
    batchAdd: 'إضافة جماعية',
    detectMissing: 'اكتشاف المفقودين',
    colSchedule: 'الجدول المحدد',
    colStatus: 'الحالة',
    colStartDate: 'تاريخ البدء',
    active: 'نشط',
    inactive: 'غير نشط',
    suspended: 'موقوف',
    employeeFormTitle: 'بيانات الموظف',
    fullName: 'الاسم الكامل',
    department: 'القسم',
    group: 'المجموعة',
    assignedSchedule: 'جدول العمل',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    allWorkers: 'جميع العمال',
    allStockWorkers: 'عمال المخزن',
    allAdminWorkers: 'الموظفون الإداريون',
    searchEmployeePlaceholder: 'بحث بالرقم التعريفي (مثال 00039) أو الاسم...',
    unmappedDetectedTitle: 'تم اكتشاف عمال غير مسجلين في ملف الحضور',
    unmappedDetectedSubtitle: 'يحتوي ملف الحضور المستورد على عمال غير مسجلين في دليل الموظفين لديك.',

    schedulesTitle: 'جداول العمل وقواعد الورديات',
    schedulesSubtitle: 'معدة بورديات 7.0 ساعات (مجموعة الإدارة 2 تحتفظ بـ 4.0 ساعات)',
    shiftEngineTitle: 'محرك جداول العمل والورديات القابل للتخصيص',
    shiftEngineSubtitle: 'قواعد العمل، الاستراحات، العمل بعد منتصف الليل وعتبة 15 دقيقة للعمل الإضافي. محفوظ محلياً.',
    shiftHoursNotice: 'الورديات العامة: 7 ساعات | وردية الإدارة 2: 4 ساعات',
    dayShift: 'وردية نهارية',
    nightShift: 'وردية ليلية',
    dayShifts: 'ورديات نهارية',
    nightShifts: 'ورديات ليلية',
    customShift: 'وردية مخصصة',
    stockShift: 'وردية المخزن',
    adminShift: 'وردية الإدارة',
    startTime: 'وقت البدء',
    endTime: 'وقت الانتهاء',
    normalHours: 'الساعات العادية',
    overtimeStarts: 'بداية الإضافي',
    graceArrival: 'سماحية الحضور (دقيقة)',
    graceOvertime: 'سماحية الإضافي (دقيقة)',
    restDays: 'أيام العطلة',
    addNewSchedule: 'إضافة جدول جديد',
    editSchedule: 'تعديل الجدول',
    deleteSchedule: 'حذف الجدول',
    crossesMidnight: 'يتجاوز منتصف الليل (اليوم التالي)',
    hasBreak: 'تشمل استراحة غداء',
    breakDuration: 'مدة الاستراحة (دقيقة)',
    breakStart: 'بداية الاستراحة',
    breakEnd: 'نهاية الاستراحة',
    breakGraceMinutesLabel: 'سماحية الاستراحة (دقيقة)',
    arrivalGraceMinutesLabel: 'سماحية تأخير الدخول (دقيقة)',
    overtimeGraceMinutesLabel: 'حد احتساب الإضافي (دقيقة)',
    overtimeAllowed: 'العمل الإضافي مسموح',
    workingDaysLabel: 'أيام العمل',
    deleteScheduleConfirm: 'هل أنت متأكد من حذف هذا الجدول؟',
    resetSchedulesConfirm: 'استعادة جميع الجداول إلى الإعدادات المصنعية الافتراضية؟ سيتم استبدال أي جداول مخصصة.',
    scheduleSavedSuccess: 'تم حفظ الجدول بنجاح! التغييرات محفوظة محلياً.',

    daySunday: 'الأحد',
    dayMonday: 'الإثنين',
    dayTuesday: 'الثلاثاء',
    dayWednesday: 'الأربعاء',
    dayThursday: 'الخميس',
    dayFriday: 'الجمعة',
    daySaturday: 'السبت',

    importModalTitle: 'استيراد ملف البصمات الخام',
    importModalSubtitle: 'يدعم تنسيقات .xls القديمة و .xlsx الحديثة',
    dropAttendanceFile: 'أسقط ملف الحضور هنا أو تصفح لاختياره',
    readingSpreadsheet: 'جاري قراءة الملف والتحقق منه...',
    biometricFormatsNotice: 'يقبل التصدير الخام من أجهزة وبرامج البصمة الحيوية (.xls أو .xlsx)',
    downloadSampleFile: 'تحميل AttendanceRecord_0 (56).xlsx',
    loadDemoData: 'تحميل البيانات المرجعية لشهر جويلية 2026',
    fileValidatedSuccess: 'تم فحص الملف والتحقق من صحته بنجاح',
    calculateAttendance: 'حساب الحضور والانصراف',
    needSamplePrompt: 'هل تحتاج إلى ملف تجريبي للاختبار الفوري؟',
    autoAddUnmappedLabel: 'إضافة هؤلاء العمال الجدد تلقائياً إلى دليل الموظفين عند الحساب',
    fileNameLabel: 'اسم الملف',
    calendarDaysCount: 'أيام تقويمية تمت معالجتها',

    vacationModalTitle: 'إدارة الإجازات المدفوعة',
    vacationModalSubtitle: 'تسجيل ومتابعة الإجازات المدفوعة مع احتساب الساعات العادية تلقائياً',
    planNewVacation: 'تسجيل إجازة جديدة',
    selectEmployee: 'اختر الموظف',
    vacationStart: 'تاريخ بداية الإجازة',
    vacationEnd: 'تاريخ نهاية الإجازة',
    vacationDaysCount: 'المدة الإجمالية',
    vacationReason: 'السبب / الملاحظة',
    vacationReasonPlaceholder: 'مثال: إجازة سنوية مدفوعة، إجازة مرضية معتمدة...',
    saveVacation: 'حفظ الإجازة',
    activeVacationsList: 'الإجازات المسجلة والمجدولة',
    noVacationsRecorded: 'لا توجد فترات إجازة مدفوعة مسجلة حالياً.',
    deleteVacationConfirm: 'هل أنت متأكد من حذف هذا السجل للإجازة؟',

    languageSettings: 'لغة التطبيق',
    languageSettingsDesc: 'اختر لغة الواجهة المفضلة لديك. يتم دعم الاتجاه من اليمين إلى اليسار (RTL) تلقائياً عند اختيار اللغة العربية.',
    companySettings: 'بيانات المؤسسة',
    companyName: 'اسم المؤسسة',
    companySubtitleLabel: 'الوصف الفرعي',
    gracePeriods: 'فترات السماحية والتجاوز',
    arrivalGraceMinutes: 'سماحية تأخير الدخول (دقائق)',
    overtimeGraceMinutes: 'حد احتساب العمل الإضافي (دقائق)',
    breakGraceMinutes: 'سماحية وقت الاستراحة (دقائق)',
    userRoles: 'الصلاحية النشطة',
    backupRestore: 'النسخ الاحتياطي والاستعادة',
    resetAllData: 'استعادة ضبط المصنع لجميع البيانات',
    resetConfirm: 'هل تريد بالفعل إعادة ضبط جميع البيانات والإعدادات؟',
    desktopDatabase: 'قاعدة بيانات SQLite المحلية',
    desktopDatabaseDesc: 'إدارة قاعدة بيانات الحضور المحلية والنسخ الاحتياطي التلقائي.',

    shiftUnclear: 'وردية غير واضحة',
    clearDateFilter: 'مسح تصفية التاريخ',
    noRecordsFound: 'لم يتم العثور على سجلات',
    adjustedBadge: 'معدل',
    showingWord: 'عرض',
    ofWord: 'من',
    pageWord: 'صفحة',
    delay: 'تأخر',
    overtimeGrace: 'عتبة العمل الإضافي',
    restoreBackup: 'استعادة',
    btnSave: 'حفظ',
    btnCancel: 'إلغاء',
    stockRoleBadge: 'وردية المخزن',
    adminRoleBadge: 'إداري',
    obsShiftUnclearDesc: 'لا تتطابق بوضوح مع ورديات المخزن. يرجى تأكيد الوردية المنجزة.',
    detectFingerprints: 'كشف تلقائي',
    searchEmployees: 'البحث بالاسم أو الرقم...',
    fromDate: 'من',
    toDate: 'إلى',
    period: 'الفترة',
    systemDocumentaryPdf: 'الدليل المرجعي والتوثيق الشامل (PDF)',
    systemDocumentaryDesc: 'التوثيق الفني الشامل، المعمارية، ودليل التشغيل خطوة بخطوة (عربي / إنجليزي / فرنسي)',
    downloadPdf: 'تحميل PDF',
  },
};

export function getTranslations(lang?: AppLanguage): Translations {
  if (lang && TRANSLATIONS[lang]) {
    return TRANSLATIONS[lang];
  }
  return TRANSLATIONS.fr; // default to French
}

export function isRtlLanguage(lang?: AppLanguage): boolean {
  return lang === 'ar';
}

/**
 * Translate Day of Week
 */
export function translateDayOfWeek(day: string, lang?: AppLanguage): string {
  const t = getTranslations(lang);
  switch (day.toLowerCase()) {
    case 'sunday':
      return t.daySunday;
    case 'monday':
      return t.dayMonday;
    case 'tuesday':
      return t.dayTuesday;
    case 'wednesday':
      return t.dayWednesday;
    case 'thursday':
      return t.dayThursday;
    case 'friday':
      return t.dayFriday;
    case 'saturday':
      return t.daySaturday;
    default:
      return day;
  }
}

/**
 * Translate Shift names and badges
 */
export function translateShiftName(name: string, lang?: AppLanguage): string {
  const t = getTranslations(lang);
  if (!name) return '';
  if (name.includes('Shift 1') || name.includes('stock_g1')) return t.shift1Label;
  if (name.includes('Shift 2') || name.includes('stock_g2')) return t.shift2Label;
  if (name.includes('Shift 3') || name.includes('stock_g3')) return t.shift3Label;
  if (name.includes('Shift 4') || name.includes('stock_g4')) return t.shift4Label;
  if (name.toLowerCase().includes('admin') || name.includes('Admin')) return t.adminFixedSchedule;
  if (name.toLowerCase().includes('custom')) return t.customShift;
  return name;
}
