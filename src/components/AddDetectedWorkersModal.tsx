import React, { useState, useMemo } from 'react';
import {
  Employee,
  WorkSchedule,
} from '../types';
import {
  DetectedUnmappedWorker,
  createEmployeeFromDetected,
} from '../utils/employees';
import {
  Users,
  UserPlus,
  Check,
  Search,
  X,
  Sparkles,
  Layers,
  Clock,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';

interface AddDetectedWorkersModalProps {
  isOpen: boolean;
  onClose: () => void;
  unmappedWorkers: DetectedUnmappedWorker[];
  schedules: WorkSchedule[];
  onAddWorkers: (employees: Employee[]) => void;
  totalSavedCount: number;
  totalDetectedCount: number;
}

export const AddDetectedWorkersModal: React.FC<AddDetectedWorkersModalProps> = ({
  isOpen,
  onClose,
  unmappedWorkers,
  schedules,
  onAddWorkers,
  totalSavedCount,
  totalDetectedCount,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'STOCK' | 'ADMIN'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(unmappedWorkers.map((w) => w.id));
  });

  // Custom department/schedule overrides per worker ID
  const [overrides, setOverrides] = useState<
    Record<string, { companyDepartment: string; groupName: string; scheduleId: string }>
  >({});

  // Reset selection when modal opens or unmapped workers change
  React.useEffect(() => {
    setSelectedIds(new Set(unmappedWorkers.map((w) => w.id)));
  }, [unmappedWorkers]);

  if (!isOpen || unmappedWorkers.length === 0) return null;

  // Filtered workers based on search and category
  const filteredWorkers = unmappedWorkers.filter((w) => {
    if (filterCategory === 'STOCK' && !w.isSuggestedStock) return false;
    if (filterCategory === 'ADMIN' && w.isSuggestedStock) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        w.id.toLowerCase().includes(q) ||
        w.name.toLowerCase().includes(q) ||
        w.rawDepartment.toLowerCase().includes(q) ||
        w.suggestedDepartment.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredWorkers.forEach((w) => next.add(w.id));
      return next;
    });
  };

  const handleDeselectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredWorkers.forEach((w) => next.delete(w.id));
      return next;
    });
  };

  const handleApplyBulkType = (type: 'STOCK' | 'ADMIN') => {
    const updated = { ...overrides };
    unmappedWorkers.forEach((w) => {
      if (selectedIds.has(w.id)) {
        if (type === 'STOCK') {
          updated[w.id] = {
            companyDepartment: 'Stock & Logistique',
            groupName: 'Stock',
            scheduleId: 'stock_dynamic',
          };
        } else {
          updated[w.id] = {
            companyDepartment: 'Administration',
            groupName: 'Admin Group 1',
            scheduleId: 'admin_g1',
          };
        }
      }
    });
    setOverrides(updated);
  };

  const handleWorkerOverrideChange = (
    workerId: string,
    field: 'companyDepartment' | 'groupName' | 'scheduleId',
    value: string
  ) => {
    const base = unmappedWorkers.find((w) => w.id === workerId);
    if (!base) return;

    const current = overrides[workerId] || {
      companyDepartment: base.suggestedDepartment,
      groupName: base.suggestedGroupName,
      scheduleId: base.suggestedScheduleId,
    };

    const next = {
      ...current,
      [field]: value,
    };

    // Auto-sync related fields if department changes
    if (field === 'companyDepartment') {
      if (value.toLowerCase().includes('stock')) {
        next.groupName = 'Stock';
        next.scheduleId = 'stock_dynamic';
      } else if (value.toLowerCase().includes('admin')) {
        next.groupName = 'Admin Group 1';
        next.scheduleId = 'admin_g1';
      }
    }

    setOverrides((prev) => ({ ...prev, [workerId]: next }));
  };

  const handleConfirmAddSelected = () => {
    const toAdd = unmappedWorkers.filter((w) => selectedIds.has(w.id));
    if (toAdd.length === 0) return;

    const newEmployees: Employee[] = toAdd.map((w) => {
      const custom = overrides[w.id];
      return createEmployeeFromDetected(w, custom);
    });

    onAddWorkers(newEmployees);
    onClose();
  };

  const handleConfirmAddAll = () => {
    const newEmployees: Employee[] = unmappedWorkers.map((w) => {
      const custom = overrides[w.id];
      return createEmployeeFromDetected(w, custom);
    });

    onAddWorkers(newEmployees);
    onClose();
  };

  const selectedCount = unmappedWorkers.filter((w) => selectedIds.has(w.id)).length;
  const isAllFilteredSelected =
    filteredWorkers.length > 0 &&
    filteredWorkers.every((w) => selectedIds.has(w.id));

  return (
    <div
      id="add-detected-workers-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="add-detected-workers-card"
        className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6 flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-2xs">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Add Detected Workers to Employee Mapping
                </h3>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 font-mono">
                  {unmappedWorkers.length} unmapped
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Found {totalDetectedCount} workers in raw attendance files vs {totalSavedCount} currently saved in mapping.
              </p>
            </div>
          </div>
          <button
            id="close-add-detected-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="my-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 p-3 text-xs text-amber-900 shrink-0 flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-bold">Auto-classification ready:</span> We inspected their ID patterns and raw department names to suggest whether each worker belongs to <strong>Stock (dynamic shifts)</strong> or <strong>Administration (08:30 - 17:00)</strong>. You can customize their department or schedule below before saving.
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 py-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                id="search-detected-workers-input"
                type="text"
                placeholder="Search detected ID, name, dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Filter Pills */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterCategory('ALL')}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  filterCategory === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({unmappedWorkers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('STOCK')}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  filterCategory === 'STOCK'
                    ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Stock ({unmappedWorkers.filter((w) => w.isSuggestedStock).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('ADMIN')}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  filterCategory === 'ADMIN'
                    ? 'bg-slate-800 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin ({unmappedWorkers.filter((w) => !w.isSuggestedStock).length})
              </button>
            </div>
          </div>

          {/* Quick Bulk Setting Buttons */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 text-[11px]">Set selected to:</span>
            <button
              type="button"
              onClick={() => handleApplyBulkType('STOCK')}
              disabled={selectedCount === 0}
              className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-40"
              title="Set all currently selected workers to Stock & Logistique (Dynamic Shifts)"
            >
              Stock
            </button>
            <button
              type="button"
              onClick={() => handleApplyBulkType('ADMIN')}
              disabled={selectedCount === 0}
              className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-40"
              title="Set all currently selected workers to Administration (08:30 - 17:00)"
            >
              Admin
            </button>
          </div>
        </div>

        {/* Selection bar */}
        <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs shrink-0 my-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="select-all-filtered-checkbox"
              checked={isAllFilteredSelected}
              onChange={() => {
                if (isAllFilteredSelected) {
                  handleDeselectAllFiltered();
                } else {
                  handleSelectAllFiltered();
                }
              }}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label
              htmlFor="select-all-filtered-checkbox"
              className="font-semibold text-slate-700 cursor-pointer"
            >
              Select All Filtered ({filteredWorkers.length})
            </label>
          </div>
          <span className="font-medium text-slate-600">
            <strong>{selectedCount}</strong> of {unmappedWorkers.length} workers selected
          </span>
        </div>

        {/* Scrollable Workers Table */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl my-2 min-h-[220px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold shadow-2xs">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th className="py-2.5 px-3 font-mono">Employee ID</th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Raw Dept</th>
                <th className="py-2.5 px-3">Assign Department</th>
                <th className="py-2.5 px-3">Work Schedule</th>
                <th className="py-2.5 px-3 text-center">Punches</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredWorkers.map((w) => {
                const isSelected = selectedIds.has(w.id);
                const custom = overrides[w.id];
                const dept = custom?.companyDepartment || w.suggestedDepartment;
                const schedule = custom?.scheduleId || w.suggestedScheduleId;

                return (
                  <tr
                    key={w.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-indigo-50/40 hover:bg-indigo-50/70' : 'hover:bg-slate-50 opacity-70'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(w.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    {/* ID */}
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {w.id}
                    </td>

                    {/* Name */}
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {w.name}
                    </td>

                    {/* Raw Dept */}
                    <td className="py-2 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {w.rawDepartment || <span className="italic text-slate-400">None</span>}
                    </td>

                    {/* Department Dropdown */}
                    <td className="py-2 px-3">
                      <select
                        value={dept}
                        onChange={(e) =>
                          handleWorkerOverrideChange(w.id, 'companyDepartment', e.target.value)
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-full max-w-[170px]"
                      >
                        <option value="Stock & Logistique">Stock & Logistique</option>
                        <option value="Administration">Administration</option>
                        <option value="Direction">Direction</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Finance & Comptabilité">Finance & Comptabilité</option>
                        <option value="Informatique">Informatique</option>
                      </select>
                    </td>

                    {/* Schedule Dropdown */}
                    <td className="py-2 px-3">
                      <select
                        value={schedule}
                        onChange={(e) =>
                          handleWorkerOverrideChange(w.id, 'scheduleId', e.target.value)
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-full max-w-[190px]"
                      >
                        <option value="stock_dynamic">⚡ Stock (Dynamic Daily Shift)</option>
                        {schedules.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.department})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Punches Count in file */}
                    <td className="py-2 px-3 text-center whitespace-nowrap font-mono text-[11px]">
                      {w.punchCount > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 font-bold border border-emerald-200">
                          {w.punchCount} punches
                        </span>
                      ) : (
                        <span className="text-slate-400">0 punches</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer / Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 shrink-0">
          <div className="text-xs text-slate-500">
            Adding will save these workers permanently to your <strong>Employee Mapping</strong> database.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="cancel-add-detected-btn"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>

            {/* Add All Button */}
            <button
              type="button"
              id="add-all-detected-btn"
              onClick={handleConfirmAddAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs"
              title="Add all detected unmapped workers at once"
            >
              Add All ({unmappedWorkers.length})
            </button>

            {/* Add Selected Button */}
            <button
              type="button"
              id="confirm-add-selected-detected-btn"
              disabled={selectedCount === 0}
              onClick={handleConfirmAddSelected}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all ${
                selectedCount > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-98 ring-2 ring-indigo-600/30'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <UserPlus className="h-4 w-4 fill-white" />
              Add Selected ({selectedCount}) to Mapping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
