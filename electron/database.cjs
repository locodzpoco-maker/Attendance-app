const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

/**
 * Robust SQLite Database Manager for Attendance Management System
 * Stores database in C:\ProgramData\Attendance App\attendance.db on Windows
 * (or fallback to user data directory)
 */
class AttendanceDatabase {
  constructor(customDataDir = null) {
    this.SQL = null;
    this.db = null;
    this.dataDir = customDataDir || this.resolveDataDirectory();
    this.dbPath = path.join(this.dataDir, 'attendance.db');
    this.backupsDir = path.join(this.dataDir, 'Backups');
    this.maxBackups = 10;
  }

  resolveDataDirectory() {
    // Determine proper Windows application data directory
    if (process.platform === 'win32') {
      const programData = process.env.ALLUSERSPROFILE || process.env.ProgramData || 'C:\\ProgramData';
      return path.join(programData, 'Attendance App');
    }

    // macOS / Linux / dev fallback
    const home = process.env.HOME || process.env.USERPROFILE || '.';
    return path.join(home, '.attendance_app_data');
  }

  ensureDirectories() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (!fs.existsSync(this.backupsDir)) {
        fs.mkdirSync(this.backupsDir, { recursive: true });
      }
    } catch (err) {
      console.error('Failed to create data directories:', err);
      // Fallback to local app directory if permission denied
      const localFallback = path.join(process.cwd(), 'app_data');
      if (!fs.existsSync(localFallback)) {
        fs.mkdirSync(localFallback, { recursive: true });
      }
      this.dataDir = localFallback;
      this.dbPath = path.join(this.dataDir, 'attendance.db');
      this.backupsDir = path.join(this.dataDir, 'Backups');
      if (!fs.existsSync(this.backupsDir)) {
        fs.mkdirSync(this.backupsDir, { recursive: true });
      }
    }
  }

  async init() {
    this.ensureDirectories();

    if (!this.SQL) {
      this.SQL = await initSqlJs();
    }

    if (fs.existsSync(this.dbPath)) {
      try {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(fileBuffer);
      } catch (e) {
        console.error('Error loading existing SQLite database, creating new one:', e);
        this.db = new this.SQL.Database();
      }
    } else {
      this.db = new this.SQL.Database();
    }

    this.createTables();
    this.persist();
    return true;
  }

  createTables() {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        raw_department TEXT,
        company_department TEXT NOT NULL,
        group_name TEXT NOT NULL,
        schedule_id TEXT NOT NULL,
        status TEXT NOT NULL,
        start_date TEXT NOT NULL,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        is_active INTEGER NOT NULL,
        weekly_hours REAL NOT NULL,
        work_days_json TEXT NOT NULL,
        check_in TEXT NOT NULL,
        check_out TEXT NOT NULL,
        max_overtime_minutes INTEGER NOT NULL,
        is_cross_midnight INTEGER NOT NULL,
        break_type TEXT NOT NULL,
        break_duration_minutes INTEGER NOT NULL,
        break_start TEXT,
        break_end TEXT,
        flexible_break_window_start TEXT,
        flexible_break_window_end TEXT
      );

      CREATE TABLE IF NOT EXISTS daily_records (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        employee_name TEXT NOT NULL,
        department TEXT NOT NULL,
        schedule_id TEXT NOT NULL,
        date TEXT NOT NULL,
        day_name TEXT NOT NULL,
        shift_type TEXT NOT NULL,
        shift_name TEXT NOT NULL,
        is_off_day INTEGER NOT NULL,
        expected_check_in TEXT,
        expected_check_out TEXT,
        actual_check_in TEXT,
        actual_check_out TEXT,
        break_start TEXT,
        break_end TEXT,
        break_duration_minutes INTEGER NOT NULL,
        worked_minutes INTEGER NOT NULL,
        normal_minutes INTEGER NOT NULL,
        overtime_minutes INTEGER NOT NULL,
        late_minutes INTEGER NOT NULL,
        early_departure_minutes INTEGER NOT NULL,
        grace_period_minutes INTEGER NOT NULL,
        missing_punches_flag INTEGER NOT NULL,
        attendance_status TEXT NOT NULL,
        raw_punches_json TEXT,
        source_file TEXT,
        notes TEXT,
        manual_correction_json TEXT,
        injected_supp_minutes INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS monthly_summaries (
        period_id TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        employee_name TEXT NOT NULL,
        department TEXT NOT NULL,
        schedule_id TEXT NOT NULL,
        present_days INTEGER NOT NULL,
        absent_days INTEGER NOT NULL,
        late_days INTEGER NOT NULL,
        total_late_minutes INTEGER NOT NULL,
        missing_punches_days INTEGER NOT NULL,
        missing_entry_count INTEGER NOT NULL,
        missing_exit_count INTEGER NOT NULL,
        total_worked_minutes INTEGER NOT NULL,
        total_worked_formatted TEXT NOT NULL,
        total_supp_minutes INTEGER NOT NULL,
        total_supp_formatted TEXT NOT NULL,
        PRIMARY KEY (period_id, employee_id)
      );

      CREATE TABLE IF NOT EXISTS historical_periods (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        employee_count INTEGER NOT NULL,
        daily_record_count INTEGER NOT NULL,
        raw_dataset_json TEXT
      );

      CREATE TABLE IF NOT EXISTS manual_adjustments (
        record_id TEXT PRIMARY KEY,
        adjusted_by TEXT NOT NULL,
        adjusted_at TEXT NOT NULL,
        original_values_json TEXT NOT NULL,
        new_values_json TEXT NOT NULL,
        reason TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        user TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        employee_name TEXT NOT NULL,
        date TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS active_dataset (
        id TEXT PRIMARY KEY,
        data_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS paid_vacations (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        employee_name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        reason TEXT,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL
      );
    `);
  }

  persist() {
    if (!this.db) return false;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
      return true;
    } catch (err) {
      console.error('Failed to write SQLite database to disk:', err);
      return false;
    }
  }

  /* ================= EMPLOYEES ================= */
  getEmployees() {
    if (!this.db) return [];
    const res = this.db.exec(`SELECT * FROM employees ORDER BY id ASC`);
    if (!res || res.length === 0) return [];

    const cols = res[0].columns;
    return res[0].values.map((row) => {
      const obj = {};
      cols.forEach((col, idx) => (obj[col] = row[idx]));
      return {
        id: obj.id,
        name: obj.name,
        rawDepartment: obj.raw_department || undefined,
        companyDepartment: obj.company_department,
        groupName: obj.group_name,
        scheduleId: obj.schedule_id,
        status: obj.status,
        startDate: obj.start_date,
        notes: obj.notes || '',
      };
    });
  }

  saveEmployee(emp) {
    if (!this.db || !emp) return false;
    const stmt = this.db.prepare(`
      INSERT INTO employees (id, name, raw_department, company_department, group_name, schedule_id, status, start_date, notes)
      VALUES ($id, $name, $raw_dept, $company_dept, $group_name, $schedule_id, $status, $start_date, $notes)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        raw_department = excluded.raw_department,
        company_department = excluded.company_department,
        group_name = excluded.group_name,
        schedule_id = excluded.schedule_id,
        status = excluded.status,
        start_date = excluded.start_date,
        notes = excluded.notes;
    `);

    stmt.run({
      $id: String(emp.id),
      $name: emp.name || '',
      $raw_dept: emp.rawDepartment || null,
      $company_dept: emp.companyDepartment || emp.department || 'General',
      $group_name: emp.groupName || 'Default',
      $schedule_id: emp.scheduleId || 'SCH_01',
      $status: emp.status || (emp.active === false ? 'Inactive' : 'Active'),
      $start_date: emp.startDate || emp.hireDate || new Date().toISOString().slice(0, 10),
      $notes: emp.notes || '',
    });
    stmt.free();
    return this.persist();
  }

  saveEmployeesBatch(employees) {
    if (!this.db || !Array.isArray(employees)) return false;
    this.db.run('BEGIN TRANSACTION;');
    try {
      const stmt = this.db.prepare(`
        INSERT INTO employees (id, name, raw_department, company_department, group_name, schedule_id, status, start_date, notes)
        VALUES ($id, $name, $raw_dept, $company_dept, $group_name, $schedule_id, $status, $start_date, $notes)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          raw_department = excluded.raw_department,
          company_department = excluded.company_department,
          group_name = excluded.group_name,
          schedule_id = excluded.schedule_id,
          status = excluded.status,
          start_date = excluded.start_date,
          notes = excluded.notes;
      `);

      for (const emp of employees) {
        stmt.run({
          $id: String(emp.id),
          $name: emp.name || '',
          $raw_dept: emp.rawDepartment || null,
          $company_dept: emp.companyDepartment || emp.department || 'General',
          $group_name: emp.groupName || 'Default',
          $schedule_id: emp.scheduleId || 'SCH_01',
          $status: emp.status || (emp.active === false ? 'Inactive' : 'Active'),
          $start_date: emp.startDate || emp.hireDate || new Date().toISOString().slice(0, 10),
          $notes: emp.notes || '',
        });
      }
      stmt.free();
      this.db.run('COMMIT;');
      return this.persist();
    } catch (e) {
      this.db.run('ROLLBACK;');
      console.error('Batch save employees error:', e);
      return false;
    }
  }

  deleteEmployee(id) {
    if (!this.db) return false;
    const stmt = this.db.prepare(`DELETE FROM employees WHERE id = $id;`);
    stmt.run({ $id: id });
    stmt.free();
    return this.persist();
  }

  /* ================= SCHEDULES ================= */
  getSchedules() {
    if (!this.db) return [];
    const res = this.db.exec(`SELECT * FROM schedules ORDER BY name ASC`);
    if (!res || res.length === 0) return [];

    const cols = res[0].columns;
    return res[0].values.map((row) => {
      const obj = {};
      cols.forEach((col, idx) => (obj[col] = row[idx]));
      const isAdmin2 = obj.id === 'admin_g2' || (obj.name && String(obj.name).includes('Admin Group 2'));
      const normalWorked = isAdmin2 ? 4.0 : 7.0;
      const parsedDays = JSON.parse(obj.work_days_json || '[]');

      return {
        id: obj.id,
        name: obj.name,
        groupName: obj.name,
        department: obj.department,
        startTime: obj.check_in,
        endTime: obj.check_out,
        crossesMidnight: Boolean(obj.is_cross_midnight),
        hasBreak: obj.break_type !== 'None',
        breakStart: obj.break_start || undefined,
        breakEnd: obj.break_end || undefined,
        breakDurationMinutes: obj.break_duration_minutes,
        overtimeAllowed: obj.max_overtime_minutes > 0,
        overtimeStartTime: obj.check_out,
        normalWorkedHours: normalWorked,
        workingDays: parsedDays.length > 0 ? parsedDays : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        arrivalGraceMinutes: 10,
        breakGraceMinutes: 10,
        overtimeGraceMinutes: 15,
        isActive: Boolean(obj.is_active),
        weeklyHours: obj.weekly_hours,
        workDays: parsedDays,
        checkIn: obj.check_in,
        checkOut: obj.check_out,
        maxOvertimeMinutes: obj.max_overtime_minutes,
        isCrossMidnight: Boolean(obj.is_cross_midnight),
        breakType: obj.break_type,
        flexibleBreakWindowStart: obj.flexible_break_window_start || undefined,
        flexibleBreakWindowEnd: obj.flexible_break_window_end || undefined,
      };
    });
  }

  saveSchedule(sched) {
    if (!this.db || !sched) return false;
    const stmt = this.db.prepare(`
      INSERT INTO schedules (
        id, name, department, is_active, weekly_hours, work_days_json,
        check_in, check_out, max_overtime_minutes, is_cross_midnight,
        break_type, break_duration_minutes, break_start, break_end,
        flexible_break_window_start, flexible_break_window_end
      )
      VALUES (
        $id, $name, $dept, $is_active, $weekly_hours, $work_days_json,
        $check_in, $check_out, $max_ot, $is_cross_midnight,
        $break_type, $break_duration, $break_start, $break_end,
        $flex_start, $flex_end
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        department = excluded.department,
        is_active = excluded.is_active,
        weekly_hours = excluded.weekly_hours,
        work_days_json = excluded.work_days_json,
        check_in = excluded.check_in,
        check_out = excluded.check_out,
        max_overtime_minutes = excluded.max_overtime_minutes,
        is_cross_midnight = excluded.is_cross_midnight,
        break_type = excluded.break_type,
        break_duration_minutes = excluded.break_duration_minutes,
        break_start = excluded.break_start,
        break_end = excluded.break_end,
        flexible_break_window_start = excluded.flexible_break_window_start,
        flexible_break_window_end = excluded.flexible_break_window_end;
    `);

    stmt.run({
      $id: String(sched.id),
      $name: sched.name || 'Standard Schedule',
      $dept: sched.department || 'General',
      $is_active: sched.isActive !== false ? 1 : 0,
      $weekly_hours: Number(sched.weeklyHours ?? (sched.normalWorkedHours ? sched.normalWorkedHours * 5 : 40)),
      $work_days_json: JSON.stringify(sched.workDays || sched.workingDays || []),
      $check_in: sched.checkIn || sched.startTime || '08:30',
      $check_out: sched.checkOut || sched.endTime || '17:00',
      $max_ot: Number(sched.maxOvertimeMinutes ?? (sched.overtimeAllowed ? 120 : 0)),
      $is_cross_midnight: (sched.isCrossMidnight || sched.crossesMidnight) ? 1 : 0,
      $break_type: sched.breakType || (sched.hasBreak ? 'Fixed' : 'None'),
      $break_duration: Number(sched.breakDurationMinutes ?? 60),
      $break_start: sched.breakStart || null,
      $break_end: sched.breakEnd || null,
      $flex_start: sched.flexibleBreakWindowStart || null,
      $flex_end: sched.flexibleBreakWindowEnd || null,
    });
    stmt.free();
    return this.persist();
  }

  saveSchedulesBatch(schedules) {
    if (!this.db || !Array.isArray(schedules)) return false;
    this.db.run('BEGIN TRANSACTION;');
    try {
      const stmt = this.db.prepare(`
        INSERT INTO schedules (
          id, name, department, is_active, weekly_hours, work_days_json,
          check_in, check_out, max_overtime_minutes, is_cross_midnight,
          break_type, break_duration_minutes, break_start, break_end,
          flexible_break_window_start, flexible_break_window_end
        )
        VALUES (
          $id, $name, $dept, $is_active, $weekly_hours, $work_days_json,
          $check_in, $check_out, $max_ot, $is_cross_midnight,
          $break_type, $break_duration, $break_start, $break_end,
          $flex_start, $flex_end
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          department = excluded.department,
          is_active = excluded.is_active,
          weekly_hours = excluded.weekly_hours,
          work_days_json = excluded.work_days_json,
          check_in = excluded.check_in,
          check_out = excluded.check_out,
          max_overtime_minutes = excluded.max_overtime_minutes,
          is_cross_midnight = excluded.is_cross_midnight,
          break_type = excluded.break_type,
          break_duration_minutes = excluded.break_duration_minutes,
          break_start = excluded.break_start,
          break_end = excluded.break_end,
          flexible_break_window_start = excluded.flexible_break_window_start,
          flexible_break_window_end = excluded.flexible_break_window_end;
      `);

      for (const sched of schedules) {
        stmt.run({
          $id: String(sched.id),
          $name: sched.name || 'Standard Schedule',
          $dept: sched.department || 'General',
          $is_active: sched.isActive !== false ? 1 : 0,
          $weekly_hours: Number(sched.weeklyHours ?? (sched.normalWorkedHours ? sched.normalWorkedHours * 5 : 40)),
          $work_days_json: JSON.stringify(sched.workDays || sched.workingDays || []),
          $check_in: sched.checkIn || sched.startTime || '08:30',
          $check_out: sched.checkOut || sched.endTime || '17:00',
          $max_ot: Number(sched.maxOvertimeMinutes ?? (sched.overtimeAllowed ? 120 : 0)),
          $is_cross_midnight: (sched.isCrossMidnight || sched.crossesMidnight) ? 1 : 0,
          $break_type: sched.breakType || (sched.hasBreak ? 'Fixed' : 'None'),
          $break_duration: Number(sched.breakDurationMinutes ?? 60),
          $break_start: sched.breakStart || null,
          $break_end: sched.breakEnd || null,
          $flex_start: sched.flexibleBreakWindowStart || null,
          $flex_end: sched.flexibleBreakWindowEnd || null,
        });
      }
      stmt.free();
      this.db.run('COMMIT;');
      return this.persist();
    } catch (e) {
      try { this.db.run('ROLLBACK;'); } catch (err) {}
      console.error('Batch save schedules error:', e);
      return false;
    }
  }

  deleteSchedule(id) {
    if (!this.db) return false;
    const stmt = this.db.prepare(`DELETE FROM schedules WHERE id = $id;`);
    stmt.run({ $id: id });
    stmt.free();
    return this.persist();
  }

  /* ================= DAILY RECORDS ================= */
  getDailyRecords() {
    if (!this.db) return [];
    const res = this.db.exec(`SELECT * FROM daily_records ORDER BY date ASC, employee_id ASC`);
    if (!res || res.length === 0) return [];

    const cols = res[0].columns;
    return res[0].values.map((row) => {
      const obj = {};
      cols.forEach((col, idx) => (obj[col] = row[idx]));
      return {
        id: obj.id,
        employeeId: obj.employee_id,
        employeeName: obj.employee_name,
        department: obj.department,
        scheduleId: obj.schedule_id,
        date: obj.date,
        dayName: obj.day_name,
        shiftType: obj.shift_type,
        shiftName: obj.shift_name,
        isOffDay: Boolean(obj.is_off_day),
        expectedCheckIn: obj.expected_check_in || undefined,
        expectedCheckOut: obj.expected_check_out || undefined,
        actualCheckIn: obj.actual_check_in || undefined,
        actualCheckOut: obj.actual_check_out || undefined,
        breakStart: obj.break_start || undefined,
        breakEnd: obj.break_end || undefined,
        breakDurationMinutes: obj.break_duration_minutes,
        workedMinutes: obj.worked_minutes,
        normalMinutes: obj.normal_minutes,
        overtimeMinutes: obj.overtime_minutes,
        lateMinutes: obj.late_minutes,
        earlyDepartureMinutes: obj.early_departure_minutes,
        gracePeriodMinutes: obj.grace_period_minutes,
        missingPunchesFlag: Boolean(obj.missing_punches_flag),
        attendanceStatus: obj.attendance_status,
        rawPunches: JSON.parse(obj.raw_punches_json || '[]'),
        sourceFile: obj.source_file || '',
        notes: obj.notes || '',
        manualCorrection: obj.manual_correction_json ? JSON.parse(obj.manual_correction_json) : undefined,
        injectedSuppMinutes: obj.injected_supp_minutes || 0,
      };
    });
  }

  saveDailyRecords(records) {
    if (!this.db || !Array.isArray(records)) return false;
    this.db.run('BEGIN TRANSACTION;');
    try {
      this.db.run(`DELETE FROM daily_records;`);

      const stmt = this.db.prepare(`
        INSERT INTO daily_records (
          id, employee_id, employee_name, department, schedule_id,
          date, day_name, shift_type, shift_name, is_off_day,
          expected_check_in, expected_check_out, actual_check_in, actual_check_out,
          break_start, break_end, break_duration_minutes,
          worked_minutes, normal_minutes, overtime_minutes, late_minutes,
          early_departure_minutes, grace_period_minutes, missing_punches_flag,
          attendance_status, raw_punches_json, source_file, notes,
          manual_correction_json, injected_supp_minutes
        )
        VALUES (
          $id, $emp_id, $emp_name, $dept, $sched_id,
          $date, $day_name, $shift_type, $shift_name, $is_off,
          $exp_in, $exp_out, $act_in, $act_out,
          $brk_start, $brk_end, $brk_dur,
          $worked, $normal, $ot, $late,
          $early, $grace, $missing,
          $status, $raw_punches, $source_file, $notes,
          $manual_corr, $injected_supp
        );
      `);

      for (const r of records) {
        stmt.run({
          $id: String(r.id || `${r.employeeId}_${r.date}`),
          $emp_id: String(r.employeeId || ''),
          $emp_name: r.employeeName || '',
          $dept: r.companyDepartment || r.department || r.rawDepartment || 'General',
          $sched_id: r.scheduleId || 'SCH_01',
          $date: r.date || '',
          $day_name: r.dayName || r.dayOfWeek || '',
          $shift_type: r.shiftType || r.detectedShiftId || 'Standard',
          $shift_name: r.shiftName || r.scheduleName || 'Standard Shift',
          $is_off: (r.isOffDay || r.isWorkingDay === false) ? 1 : 0,
          $exp_in: r.expectedCheckIn || null,
          $exp_out: r.expectedCheckOut || null,
          $act_in: r.actualCheckIn || r.entryTime || null,
          $act_out: r.actualCheckOut || r.exitTime || null,
          $brk_start: r.breakStart || null,
          $brk_end: r.breakEnd || null,
          $brk_dur: Number(r.breakDurationMinutes ?? 0),
          $worked: Number(r.workedMinutes ?? 0),
          $normal: Number(r.normalMinutes ?? 0),
          $ot: Number(r.overtimeMinutes ?? (r.suppMinutes ?? 0)),
          $late: Number(r.lateMinutes ?? (r.delayMinutes ?? 0)),
          $early: Number(r.earlyDepartureMinutes ?? 0),
          $grace: Number(r.gracePeriodMinutes ?? 0),
          $missing: (r.missingPunchesFlag || r.isShiftUnclear) ? 1 : 0,
          $status: r.attendanceStatus || r.observation || 'Present',
          $raw_punches: JSON.stringify(r.rawPunches || []),
          $source_file: r.sourceFile || '',
          $notes: r.notes || '',
          $manual_corr: r.manualCorrection ? JSON.stringify(r.manualCorrection) : (r.manualAdjustment ? JSON.stringify(r.manualAdjustment) : null),
          $injected_supp: Number(r.injectedSuppMinutes ?? 0),
        });
      }
      stmt.free();
      this.db.run('COMMIT;');
      return this.persist();
    } catch (e) {
      this.db.run('ROLLBACK;');
      console.error('Error saving daily records:', e);
      return false;
    }
  }

  /* ================= MONTHLY SUMMARIES ================= */
  getMonthlySummaries(periodId = 'CURRENT') {
    if (!this.db) return [];
    const stmt = this.db.prepare(`SELECT * FROM monthly_summaries WHERE period_id = $periodId ORDER BY employee_id ASC`);
    const rows = [];
    stmt.bind({ $periodId: periodId });
    while (stmt.step()) {
      const row = stmt.getAsObject();
      rows.push({
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        department: row.department,
        scheduleId: row.schedule_id,
        presentDays: row.present_days,
        absentDays: row.absent_days,
        lateDays: row.late_days,
        totalLateMinutes: row.total_late_minutes,
        missingPunchesDays: row.missing_punches_days,
        missingEntryCount: row.missing_entry_count,
        missingExitCount: row.missing_exit_count,
        totalWorkedMinutes: row.total_worked_minutes,
        totalWorkedFormatted: row.total_worked_formatted,
        totalSuppMinutes: row.total_supp_minutes,
        totalSuppFormatted: row.total_supp_formatted,
      });
    }
    stmt.free();
    return rows;
  }

  saveMonthlySummaries(periodId, summaries) {
    if (!this.db || !Array.isArray(summaries)) return false;
    this.db.run('BEGIN TRANSACTION;');
    try {
      const delStmt = this.db.prepare(`DELETE FROM monthly_summaries WHERE period_id = $periodId;`);
      delStmt.run({ $periodId: periodId });
      delStmt.free();

      const stmt = this.db.prepare(`
        INSERT INTO monthly_summaries (
          period_id, employee_id, employee_name, department, schedule_id,
          present_days, absent_days, late_days, total_late_minutes,
          missing_punches_days, missing_entry_count, missing_exit_count,
          total_worked_minutes, total_worked_formatted, total_supp_minutes, total_supp_formatted
        )
        VALUES (
          $pid, $eid, $ename, $dept, $sched,
          $present, $absent, $late, $late_min,
          $miss_days, $miss_in, $miss_out,
          $worked_min, $worked_fmt, $supp_min, $supp_fmt
        );
      `);

      for (const s of summaries) {
        stmt.run({
          $pid: String(periodId || 'CURRENT'),
          $eid: String(s.employeeId || ''),
          $ename: s.employeeName || '',
          $dept: s.companyDepartment || s.department || 'General',
          $sched: s.scheduleId || 'SCH_01',
          $present: Number(s.presentDays ?? 0),
          $absent: Number(s.absentDays ?? 0),
          $late: Number(s.lateDays ?? 0),
          $late_min: Number(s.totalLateMinutes ?? (s.totalDelayMinutes ?? 0)),
          $miss_days: Number(s.missingPunchesDays ?? 0),
          $miss_in: Number(s.missingEntryCount ?? 0),
          $miss_out: Number(s.missingExitCount ?? 0),
          $worked_min: Number(s.totalWorkedMinutes ?? 0),
          $worked_fmt: s.totalWorkedFormatted || s.totalWorkedHoursFormatted || '',
          $supp_min: Number(s.totalSuppMinutes ?? 0),
          $supp_fmt: s.totalSuppFormatted || s.totalSuppHoursFormatted || '',
        });
      }
      stmt.free();
      this.db.run('COMMIT;');
      return this.persist();
    } catch (e) {
      this.db.run('ROLLBACK;');
      return false;
    }
  }

  /* ================= HISTORICAL PERIODS ================= */
  getHistoricalPeriods() {
    if (!this.db) return [];
    const res = this.db.exec(`SELECT * FROM historical_periods ORDER BY start_date DESC`);
    if (!res || res.length === 0) return [];
    const cols = res[0].columns;
    return res[0].values.map((row) => {
      const obj = {};
      cols.forEach((col, idx) => (obj[col] = row[idx]));
      return {
        id: obj.id,
        label: obj.label,
        startDate: obj.start_date,
        endDate: obj.end_date,
        createdAt: obj.created_at,
        employeeCount: obj.employee_count,
        dailyRecordCount: obj.daily_record_count,
        rawDataset: obj.raw_dataset_json ? JSON.parse(obj.raw_dataset_json) : undefined,
      };
    });
  }

  saveHistoricalPeriod(period) {
    if (!this.db || !period) return false;
    const stmt = this.db.prepare(`
      INSERT INTO historical_periods (id, label, start_date, end_date, created_at, employee_count, daily_record_count, raw_dataset_json)
      VALUES ($id, $label, $start_date, $end_date, $created_at, $employee_count, $daily_record_count, $raw_json)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        created_at = excluded.created_at,
        employee_count = excluded.employee_count,
        daily_record_count = excluded.daily_record_count,
        raw_dataset_json = excluded.raw_dataset_json;
    `);

    stmt.run({
      $id: String(period.id),
      $label: period.label || period.periodLabel || 'Historical Period',
      $start_date: period.startDate || '',
      $end_date: period.endDate || '',
      $created_at: period.createdAt || period.importedAt || new Date().toISOString(),
      $employee_count: Number(period.employeeCount ?? 0),
      $daily_record_count: Number(period.dailyRecordCount ?? (period.dailyRecords ? period.dailyRecords.length : 0)),
      $raw_json: period.rawDataset ? JSON.stringify(period.rawDataset) : (period.dataset ? JSON.stringify(period.dataset) : null),
    });
    stmt.free();
    return this.persist();
  }

  deleteHistoricalPeriod(id) {
    if (!this.db) return false;
    const stmt = this.db.prepare(`DELETE FROM historical_periods WHERE id = $id;`);
    stmt.run({ $id: id });
    stmt.free();
    return this.persist();
  }

  /* ================= AUDIT LOGS ================= */
  getAuditLogs() {
    if (!this.db) return [];
    const res = this.db.exec(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500`);
    if (!res || res.length === 0) return [];
    const cols = res[0].columns;
    return res[0].values.map((row) => {
      const obj = {};
      cols.forEach((col, idx) => (obj[col] = row[idx]));
      return {
        id: obj.id,
        timestamp: obj.timestamp,
        user: obj.user,
        employeeId: obj.employee_id,
        employeeName: obj.employee_name,
        date: obj.date,
        action: obj.action,
        details: obj.details,
      };
    });
  }

  saveAuditLogs(logs) {
    if (!this.db || !Array.isArray(logs)) return false;
    this.db.run('BEGIN TRANSACTION;');
    try {
      const stmt = this.db.prepare(`
        INSERT INTO audit_logs (id, timestamp, user, employee_id, employee_name, date, action, details)
        VALUES ($id, $ts, $user, $eid, $ename, $date, $action, $details)
        ON CONFLICT(id) DO NOTHING;
      `);

      for (const log of logs) {
        stmt.run({
          $id: String(log.id || `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
          $ts: log.timestamp || new Date().toISOString(),
          $user: log.user || 'Administrator',
          $eid: String(log.employeeId || ''),
          $ename: log.employeeName || '',
          $date: log.date || '',
          $action: log.action || 'Manual Adjustment',
          $details: log.details || '',
        });
      }
      stmt.free();
      this.db.run('COMMIT;');
      return this.persist();
    } catch (e) {
      this.db.run('ROLLBACK;');
      return false;
    }
  }

  /* ================= MANUAL ADJUSTMENTS ================= */
  getManualAdjustments() {
    if (!this.db) return {};
    const res = this.db.exec(`SELECT * FROM manual_adjustments`);
    if (!res || res.length === 0) return {};
    const cols = res[0].columns;
    const map = {};
    res[0].values.forEach((row) => {
      const obj = {};
      cols.forEach((col, idx) => (obj[col] = row[idx]));
      map[obj.record_id] = {
        recordId: obj.record_id,
        adjustedBy: obj.adjusted_by,
        adjustedAt: obj.adjusted_at,
        originalValues: JSON.parse(obj.original_values_json || '{}'),
        newValues: JSON.parse(obj.new_values_json || '{}'),
        reason: obj.reason,
      };
    });
    return map;
  }

  saveManualAdjustment(adjustment) {
    if (!this.db || !adjustment) return false;
    const stmt = this.db.prepare(`
      INSERT INTO manual_adjustments (record_id, adjusted_by, adjusted_at, original_values_json, new_values_json, reason)
      VALUES ($id, $by, $at, $orig, $new, $reason)
      ON CONFLICT(record_id) DO UPDATE SET
        adjusted_by = excluded.adjusted_by,
        adjusted_at = excluded.adjusted_at,
        original_values_json = excluded.original_values_json,
        new_values_json = excluded.new_values_json,
        reason = excluded.reason;
    `);

    stmt.run({
      $id: String(adjustment.recordId || adjustment.id || `${adjustment.employeeId}_${adjustment.date}`),
      $by: adjustment.adjustedBy || 'Administrator',
      $at: adjustment.adjustedAt || new Date().toISOString(),
      $orig: JSON.stringify(adjustment.originalValues || {}),
      $new: JSON.stringify(adjustment.newValues || {}),
      $reason: adjustment.reason || '',
    });
    stmt.free();
    return this.persist();
  }

  /* ================= APP SETTINGS ================= */
  getSettings() {
    if (!this.db) return null;
    const res = this.db.exec(`SELECT key, value FROM app_settings`);
    if (!res || res.length === 0) return null;

    const settings = {};
    res[0].values.forEach(([key, val]) => {
      try {
        settings[key] = JSON.parse(val);
      } catch (e) {
        settings[key] = val;
      }
    });

    if (Object.keys(settings).length === 0) return null;
    return settings;
  }

  saveSettings(settings) {
    if (!this.db || !settings) return false;
    this.db.run('BEGIN TRANSACTION;');
    try {
      const stmt = this.db.prepare(`
        INSERT INTO app_settings (key, value)
        VALUES ($key, $value)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value;
      `);

      for (const [k, v] of Object.entries(settings)) {
        stmt.run({
          $key: k,
          $value: JSON.stringify(v),
        });
      }
      stmt.free();
      this.db.run('COMMIT;');
      return this.persist();
    } catch (e) {
      this.db.run('ROLLBACK;');
      return false;
    }
  }

  /* ================= ACTIVE DATASET ================= */
  getActiveDataset() {
    if (!this.db) return null;
    const stmt = this.db.prepare(`SELECT data_json FROM active_dataset WHERE id = 'current';`);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return JSON.parse(row.data_json);
    }
    stmt.free();
    return null;
  }

  saveActiveDataset(dataset) {
    if (!this.db || !dataset) return false;
    const stmt = this.db.prepare(`
      INSERT INTO active_dataset (id, data_json)
      VALUES ('current', $json)
      ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json;
    `);
    stmt.run({ $json: JSON.stringify(dataset) });
    stmt.free();
    return this.persist();
  }

  /* ================= PAID VACATIONS ================= */
  getPaidVacations() {
    if (!this.db) return [];
    try {
      const res = this.db.exec(`
        SELECT id, employee_id, employee_name, start_date, end_date, reason, created_at, created_by
        FROM paid_vacations
        ORDER BY start_date DESC;
      `);
      if (!res || res.length === 0) return [];
      return res[0].values.map(([id, empId, empName, start, end, reason, created_at, created_by]) => ({
        id,
        employeeId: empId,
        employeeName: empName,
        startDate: start,
        endDate: end,
        reason: reason || '',
        createdAt: created_at,
        createdBy: created_by,
      }));
    } catch (e) {
      console.warn('Error reading paid_vacations table:', e);
      return [];
    }
  }

  savePaidVacation(vacation) {
    if (!this.db || !vacation) return false;
    try {
      const stmt = this.db.prepare(`
        INSERT INTO paid_vacations (id, employee_id, employee_name, start_date, end_date, reason, created_at, created_by)
        VALUES ($id, $empId, $empName, $start, $end, $reason, $createdAt, $createdBy)
        ON CONFLICT(id) DO UPDATE SET
          employee_id = excluded.employee_id,
          employee_name = excluded.employee_name,
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          reason = excluded.reason;
      `);
      stmt.run({
        $id: String(vacation.id),
        $empId: String(vacation.employeeId),
        $empName: String(vacation.employeeName),
        $start: String(vacation.startDate),
        $end: String(vacation.endDate),
        $reason: vacation.reason || '',
        $createdAt: vacation.createdAt || new Date().toISOString(),
        $createdBy: vacation.createdBy || 'Administrator',
      });
      stmt.free();
      return this.persist();
    } catch (e) {
      console.error('Error saving paid vacation:', e);
      return false;
    }
  }

  savePaidVacationsBatch(vacations) {
    if (!this.db || !Array.isArray(vacations)) return false;
    this.db.run('BEGIN TRANSACTION;');
    try {
      this.db.run('DELETE FROM paid_vacations;');
      const stmt = this.db.prepare(`
        INSERT INTO paid_vacations (id, employee_id, employee_name, start_date, end_date, reason, created_at, created_by)
        VALUES ($id, $empId, $empName, $start, $end, $reason, $createdAt, $createdBy);
      `);
      for (const v of vacations) {
        stmt.run({
          $id: String(v.id),
          $empId: String(v.employeeId),
          $empName: String(v.employeeName),
          $start: String(v.startDate),
          $end: String(v.endDate),
          $reason: v.reason || '',
          $createdAt: v.createdAt || new Date().toISOString(),
          $createdBy: v.createdBy || 'Administrator',
        });
      }
      stmt.free();
      this.db.run('COMMIT;');
      return this.persist();
    } catch (e) {
      this.db.run('ROLLBACK;');
      console.error('Error saving paid vacations batch:', e);
      return false;
    }
  }

  deletePaidVacation(id) {
    if (!this.db || !id) return false;
    try {
      const stmt = this.db.prepare(`DELETE FROM paid_vacations WHERE id = $id;`);
      stmt.run({ $id: String(id) });
      stmt.free();
      return this.persist();
    } catch (e) {
      console.error('Error deleting paid vacation:', e);
      return false;
    }
  }

  /* ================= BACKUP & RESTORE ================= */
  createBackup(customName = null) {
    this.ensureDirectories();
    if (!this.db) return { success: false, error: 'Database not initialized' };

    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}${mins}`;

      const filename = customName
        ? `${customName.replace(/[^a-zA-Z0-9_-]/g, '_')}.db`
        : `Attendance_Backup_${dateStr}_${timeStr}.db`;

      const backupFilePath = path.join(this.backupsDir, filename);

      const data = this.db.export();
      fs.writeFileSync(backupFilePath, Buffer.from(data));

      this.rotateBackups();

      return {
        success: true,
        fileName: filename,
        filePath: backupFilePath,
        createdAt: now.toISOString(),
      };
    } catch (err) {
      console.error('Backup creation failed:', err);
      return { success: false, error: err.message };
    }
  }

  rotateBackups() {
    try {
      if (!fs.existsSync(this.backupsDir)) return;
      const files = fs
        .readdirSync(this.backupsDir)
        .filter((f) => f.endsWith('.db'))
        .map((f) => {
          const fullPath = path.join(this.backupsDir, f);
          const stat = fs.statSync(fullPath);
          return { name: f, fullPath, mtime: stat.mtime.getTime() };
        })
        .sort((a, b) => b.mtime - a.mtime);

      if (files.length > this.maxBackups) {
        const toDelete = files.slice(this.maxBackups);
        toDelete.forEach((f) => {
          try {
            fs.unlinkSync(f.fullPath);
          } catch (e) {
            console.error('Error removing old backup:', e);
          }
        });
      }
    } catch (e) {
      console.error('Error during backup rotation:', e);
    }
  }

  listBackups() {
    this.ensureDirectories();
    try {
      const files = fs
        .readdirSync(this.backupsDir)
        .filter((f) => f.endsWith('.db'))
        .map((f) => {
          const fullPath = path.join(this.backupsDir, f);
          const stat = fs.statSync(fullPath);
          return {
            fileName: f,
            filePath: fullPath,
            sizeBytes: stat.size,
            createdAt: stat.mtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return files;
    } catch (e) {
      console.error('Error listing backups:', e);
      return [];
    }
  }

  restoreBackup(backupFileName) {
    if (!backupFileName) return { success: false, error: 'No backup filename specified' };
    const backupPath = path.join(this.backupsDir, backupFileName);

    if (!fs.existsSync(backupPath)) {
      return { success: false, error: `Backup file not found: ${backupFileName}` };
    }

    try {
      // Create a safety backup of current state first!
      this.createBackup(`AutoSafety_Before_Restore_${Date.now()}`);

      const fileBuffer = fs.readFileSync(backupPath);
      this.db = new this.SQL.Database(fileBuffer);
      this.persist();

      return { success: true, message: `Successfully restored backup from ${backupFileName}` };
    } catch (err) {
      console.error('Restore backup failed:', err);
      return { success: false, error: err.message };
    }
  }

  exportDatabaseToFile(targetPath) {
    try {
      if (!this.db) return { success: false, error: 'Database not initialized' };
      const data = this.db.export();
      fs.writeFileSync(targetPath, Buffer.from(data));
      return { success: true, targetPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  importDatabaseFromFile(sourcePath) {
    try {
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: 'File does not exist' };
      }
      this.createBackup(`AutoSafety_Before_Import_${Date.now()}`);
      const fileBuffer = fs.readFileSync(sourcePath);
      this.db = new this.SQL.Database(fileBuffer);
      this.persist();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /* ================= MIGRATION FROM LOCALSTORAGE ================= */
  migrateFromLocalStorage(localStorageDump) {
    if (!localStorageDump || typeof localStorageDump !== 'object') {
      return { success: false, error: 'Invalid migration data' };
    }

    try {
      this.db.run('BEGIN TRANSACTION;');

      let employeesImported = 0;
      let schedulesImported = 0;
      let periodsImported = 0;

      // 1. Employees
      if (localStorageDump.ams_employees && Array.isArray(localStorageDump.ams_employees)) {
        const empStmt = this.db.prepare(`
          INSERT INTO employees (id, name, raw_department, company_department, group_name, schedule_id, status, start_date, notes)
          VALUES ($id, $name, $raw_dept, $company_dept, $group_name, $schedule_id, $status, $start_date, $notes)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            company_department = excluded.company_department,
            group_name = excluded.group_name,
            schedule_id = excluded.schedule_id,
            status = excluded.status;
        `);
        for (const emp of localStorageDump.ams_employees) {
          empStmt.run({
            $id: emp.id,
            $name: emp.name,
            $raw_dept: emp.rawDepartment || null,
            $company_dept: emp.companyDepartment,
            $group_name: emp.groupName,
            $schedule_id: emp.scheduleId,
            $status: emp.status || 'Active',
            $start_date: emp.startDate || '2023-01-01',
            $notes: emp.notes || '',
          });
          employeesImported++;
        }
        empStmt.free();
      }

      // 2. Schedules
      if (localStorageDump.ams_schedules && Array.isArray(localStorageDump.ams_schedules)) {
        for (const s of localStorageDump.ams_schedules) {
          this.saveSchedule(s);
          schedulesImported++;
        }
      }

      // 3. Settings
      if (localStorageDump.ams_settings && typeof localStorageDump.ams_settings === 'object') {
        this.saveSettings(localStorageDump.ams_settings);
      }

      // 4. Adjustments
      if (localStorageDump.ams_adjustments && typeof localStorageDump.ams_adjustments === 'object') {
        for (const adj of Object.values(localStorageDump.ams_adjustments)) {
          this.saveManualAdjustment(adj);
        }
      }

      // 5. Audit Logs
      if (localStorageDump.ams_audit_logs && Array.isArray(localStorageDump.ams_audit_logs)) {
        this.saveAuditLogs(localStorageDump.ams_audit_logs);
      }

      // 6. Historical Periods
      if (localStorageDump.ams_historical_periods && Array.isArray(localStorageDump.ams_historical_periods)) {
        for (const p of localStorageDump.ams_historical_periods) {
          this.saveHistoricalPeriod(p);
          periodsImported++;
        }
      }

      // 7. Active dataset
      if (localStorageDump.ams_dataset) {
        this.saveActiveDataset(localStorageDump.ams_dataset);
      }

      this.db.run('COMMIT;');
      this.persist();

      return {
        success: true,
        summary: {
          employeesImported,
          schedulesImported,
          periodsImported,
        },
      };
    } catch (err) {
      this.db.run('ROLLBACK;');
      console.error('Migration failed:', err);
      return { success: false, error: err.message };
    }
  }

  getStats() {
    let employeesCount = 0;
    let schedulesCount = 0;
    let dailyRecordsCount = 0;
    let historicalCount = 0;
    let dbSize = 0;

    if (this.db) {
      try {
        const empRes = this.db.exec('SELECT count(*) FROM employees');
        if (empRes && empRes[0]) employeesCount = empRes[0].values[0][0];

        const schedRes = this.db.exec('SELECT count(*) FROM schedules');
        if (schedRes && schedRes[0]) schedulesCount = schedRes[0].values[0][0];

        const recRes = this.db.exec('SELECT count(*) FROM daily_records');
        if (recRes && recRes[0]) dailyRecordsCount = recRes[0].values[0][0];

        const histRes = this.db.exec('SELECT count(*) FROM historical_periods');
        if (histRes && histRes[0]) historicalCount = histRes[0].values[0][0];
      } catch (e) {}
    }

    if (fs.existsSync(this.dbPath)) {
      try {
        dbSize = fs.statSync(this.dbPath).size;
      } catch (e) {}
    }

    return {
      isElectron: true,
      dataDir: this.dataDir,
      dbPath: this.dbPath,
      backupsDir: this.backupsDir,
      dbSizeBytes: dbSize,
      employeesCount,
      schedulesCount,
      dailyRecordsCount,
      historicalCount,
      backupsCount: this.listBackups().length,
      maxBackups: this.maxBackups,
    };
  }
}

module.exports = AttendanceDatabase;
