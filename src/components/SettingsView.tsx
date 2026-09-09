import React, { useState } from 'react';
import { AppSettings, AttendanceAuditLog, HistoricalPeriodRecord } from '../types';
import {
  Settings as SettingsIcon,
  Shield,
  History,
  Building,
  Save,
  Trash2,
  Calendar,
  CheckCircle,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  historicalPeriods: HistoricalPeriodRecord[];
  onSelectPeriod: (periodId: string) => void;
  onDeletePeriod: (periodId: string) => void;
  auditLogs: AttendanceAuditLog[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  historicalPeriods,
  onSelectPeriod,
  onDeletePeriod,
  auditLogs,
}) => {
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [companySubtitle, setCompanySubtitle] = useState(settings.companySubtitle);
  const [overtimeGrace, setOvertimeGrace] = useState(settings.defaultOvertimeGraceMinutes);
  const [arrivalGrace, setArrivalGrace] = useState(settings.defaultArrivalGraceMinutes);
  const [activeRole, setActiveRole] = useState(settings.activeRole);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      companyName: companyName.trim(),
      companySubtitle: companySubtitle.trim(),
      defaultOvertimeGraceMinutes: Number(overtimeGrace),
      defaultArrivalGraceMinutes: Number(arrivalGrace),
      activeRole,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Settings Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Building className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Application & Engine Settings</h2>
            <p className="text-xs text-slate-500">PRD Section 27: Company headers, grace thresholds, and role policies</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 mt-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Company / Organization Name
              </label>
              <input
                id="setting-company-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Report Subtitle / Description
              </label>
              <input
                id="setting-company-subtitle"
                type="text"
                value={companySubtitle}
                onChange={(e) => setCompanySubtitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Overtime Grace Threshold (Minutes)
              </label>
              <input
                id="setting-ot-grace"
                type="number"
                min="0"
                max="60"
                value={overtimeGrace}
                onChange={(e) => setOvertimeGrace(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-slate-800 outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                PRD Section 18: Default 15 minutes. Once exceeded, count entire overtime from start.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Arrival Grace Threshold (Minutes)
              </label>
              <input
                id="setting-arrival-grace"
                type="number"
                min="0"
                max="60"
                value={arrivalGrace}
                onChange={(e) => setArrivalGrace(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-slate-800 outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Allowed delay buffer before marking as "Retard"
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Current Access Role
              </label>
              <select
                id="setting-active-role"
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value as AppSettings['activeRole'])}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-indigo-500"
              >
                <option value="Administrator">Administrator (Full Access)</option>
                <option value="HR / Attendance User">HR / Attendance User (Import & Calculate)</option>
                <option value="Management">Management (Read-Only Dashboards)</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Controls edit permissions for punches and schedules
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {savedSuccess ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <CheckCircle className="h-4 w-4" /> Settings updated successfully!
              </span>
            ) : (
              <span className="text-slate-400">Settings take effect immediately for calculations</span>
            )}

            <button
              type="submit"
              id="save-settings-btn"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition-colors shadow-2xs"
            >
              <Save className="h-4 w-4" /> Save Configuration
            </button>
          </div>
        </form>
      </div>

      {/* Historical Periods (PRD Section 25) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <History className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Historical Attendance Periods</h2>
            <p className="text-xs text-slate-500">
              PRD Section 25: Stored monthly calculations. Previous months can be reopened or re-analyzed at any time.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Period Label</th>
                <th className="py-2.5 px-3">Source File</th>
                <th className="py-2.5 px-3">Employees</th>
                <th className="py-2.5 px-3">Imported Date</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historicalPeriods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No historical periods stored.
                  </td>
                </tr>
              ) : (
                historicalPeriods.map((hp) => (
                  <tr key={hp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {hp.periodLabel}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{hp.fileName}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">{hp.employeeCount}</td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(hp.importedAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectPeriod(hp.id)}
                          className="font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Open Period
                        </button>
                        {settings.activeRole === 'Administrator' && historicalPeriods.length > 1 && (
                          <button
                            onClick={() => onDeletePeriod(hp.id)}
                            className="text-rose-500 hover:text-rose-700"
                            title="Delete period"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail Log (PRD Section 24: Manual Corrections & Auditability) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Shield className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Audit Trail & Compliance Log</h2>
            <p className="text-xs text-slate-500">
              PRD Section 24: Permanent log of manual adjustments with recorded timestamp, reviewer, and reason.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Authorized User</th>
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Date Adjusted</th>
                <th className="py-2.5 px-3">Reason / Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No manual corrections recorded in the audit trail.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-indigo-700">{log.user}</td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">
                      {log.employeeName} ({log.employeeId})
                    </td>
                    <td className="py-2.5 px-3 font-mono">{log.date}</td>
                    <td className="py-2.5 px-3 text-slate-600">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
