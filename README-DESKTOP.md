# Attendance Management System — Windows Standalone Desktop Application

A complete standalone, offline-ready Windows desktop application built with Electron, React, Vite, and a local SQLite database engine.

---

## Key Features

- **100% Standalone & Offline**: Runs entirely on a single Windows PC with no internet requirement and no remote cloud dependencies.
- **Native Window Execution**: Launches directly into a focused, border-contained desktop window (no browser tabs, no terminal windows required).
- **SQLite Single Source of Truth**: Replaces volatile browser cache with a persistent SQLite database located safely outside the app installation directory.
- **Automatic Migration**: Automatically detects existing records in browser `localStorage` on first desktop startup and migrates them safely into SQLite.
- **Safe Database Directory**: Data is stored in `C:\ProgramData\Attendance App\attendance.db`. Upgrades or uninstalls will **never** delete your attendance data.
- **Automated & Manual Backups**: Built-in daily/startup automated backups with rolling retention (keeps the last 10 backups), one-click manual backups, and direct Windows Explorer folder launcher for quick USB drive archiving.
- **Full Feature Parity**: Retains all attendance calculation rules:
  - 10-minute entry & break grace periods
  - 15-minute overtime (Heures Supplémentaires) calculation threshold
  - Stock department 4-shift dynamic automatic detection
  - Daily Attendance drilldown, manual supervisor corrections with audit trails
  - Monthly aggregated summaries, Excel (`.xlsx`) & PDF reports export
  - Employee roster and schedule configuration

---

## 1. How to Build the Windows Installer

To build the standalone Windows installer (`Attendance-App-Setup.exe`), run:

```bash
# Install dependencies
npm install

# Build the production frontend and package the Windows installer
npm run dist
```

Alternatively, to build without the installer package (unpacked directory):
```bash
npm run electron:build
```

The compiled installer will be generated in the **`dist-electron/`** folder:
- **`dist-electron/Attendance-App-Setup.exe`**

---

## 2. How to Install on Windows

1. Copy or distribute **`Attendance-App-Setup.exe`** to your target Windows PC.
2. Double-click **`Attendance-App-Setup.exe`** to launch the installer wizard.
3. Choose the installation directory (default: `C:\Users\<User>\AppData\Local\Programs\attendance-management-system`).
4. The installer will automatically:
   - Create a desktop shortcut.
   - Create a Start Menu shortcut under **Attendance Management System**.
   - Launch the application immediately upon completion.
5. On the first launch, if previous browser records are detected, the app will automatically migrate them into the SQLite database.

---

## 3. Where Data is Stored

To ensure complete data safety across application upgrades or re-installations, the database is stored **outside** the application's installation folder:

- **Database Path**:
  ```text
  C:\ProgramData\Attendance App\attendance.db
  ```
- **Automated & Manual Backups Folder**:
  ```text
  C:\ProgramData\Attendance App\Backups\
  ```

*(Note: On non-Windows development machines, it gracefully falls back to `~/.attendance_app_data/attendance.db` or `./app_data/attendance.db`)*.

---

## 4. How to Backup and Restore

### In-App Backup & Restore:
1. Open the application and click **"Database & Backups"** in the top navigation header (or navigate to **Settings** > **Standalone Windows Desktop & SQLite Database**).
2. **Create Manual Backup**: Click **"Create Backup Now"** to generate a timestamped snapshot in `C:\ProgramData\Attendance App\Backups\`.
3. **Restore Backup**: Select any backup file from the list and click **"Restore"**. The app will automatically create a pre-restore safety snapshot before rolling back to the chosen point in time.
4. **Export to USB / External Drive**: Click **"Export Database"** to save a single `.db` file to any custom folder, USB flash drive, or network drive.
5. **Import Database**: Click **"Import Database"** to restore from an external `.db` file on your drive.
6. **Open Data Folder**: Click **"Open Data Folder"** to open Windows Explorer directly at `C:\ProgramData\Attendance App\` for direct file inspection.

### External / Manual USB Copy:
You can also back up the database at any time by copying `C:\ProgramData\Attendance App\attendance.db` directly onto a USB drive or external hard disk.

---

## 5. How to Transfer to Another PC

To migrate the application and all attendance records to a new Windows PC:

1. On the **Original PC**:
   - In the application, click **"Database & Backups"** > **"Export Database"** and save the `.db` file to a USB flash drive (or copy `C:\ProgramData\Attendance App\attendance.db`).
2. On the **New PC**:
   - Run **`Attendance-App-Setup.exe`** to install the application.
   - Launch the application on the new PC.
   - Click **"Database & Backups"** > **"Import Database"** and select the `.db` file from your USB flash drive.
   - All employees, schedules, historical periods, daily attendance calculations, and audit logs will be restored immediately.
