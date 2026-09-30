import React, { useState, useRef } from 'react';
import { Employee, WorkSchedule } from '../types';
import { parseEmployeesFromFile, ParseEmployeesResult } from '../utils/employeeImporter';
import { downloadEmployeesSampleTemplate } from '../utils/exporter';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle,
  X,
  Users,
  RefreshCw,
  Plus,
  ArrowRight,
  Info,
} from 'lucide-react';

interface ImportEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingEmployees: Employee[];
  schedules: WorkSchedule[];
  onImportComplete: (
    imported: Employee[],
    mode: 'merge' | 'addNewOnly' | 'replace'
  ) => void;
}

export const ImportEmployeesModal: React.FC<ImportEmployeesModalProps> = ({
  isOpen,
  onClose,
  existingEmployees,
  schedules,
  onImportComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseEmployeesResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'addNewOnly' | 'replace'>('merge');

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseError(null);
    setParseResult(null);

    try {
      const res = await parseEmployeesFromFile(file);
      setParseResult(res);
    } catch (err: any) {
      setParseError(err?.message || 'Erreur lors de la lecture du fichier.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  const handleConfirm = () => {
    if (!parseResult || parseResult.employees.length === 0) return;
    onImportComplete(parseResult.employees, importMode);
    onClose();
  };

  // Compute breakdown of parsed employees compared to existing
  const existingIdSet = new Set(existingEmployees.map((e) => e.id.trim()));
  const updateCount = parseResult?.employees.filter((e) => existingIdSet.has(e.id.trim())).length || 0;
  const newCount = (parseResult?.employees.length || 0) - updateCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Importer la Liste des Employés
              </h2>
              <p className="text-xs text-slate-500">
                Fichier Excel (.xlsx, .xls) ou CSV avec détection automatique des colonnes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadEmployeesSampleTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
              title="Télécharger un modèle Excel exemple"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Modèle Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/70 scale-[0.99]'
                : selectedFile
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleInputChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                  selectedFile
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                {selectedFile ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              {selectedFile ? (
                <div>
                  <p className="font-bold text-slate-900 text-sm">{selectedFile.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} Ko • Cliquez pour remplacer le fichier
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-slate-800 text-sm">
                    Glissez-déposez votre fichier ici, ou <span className="text-indigo-600 underline">parcourez</span>
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Formats acceptés: Excel (.xlsx, .xls) ou CSV UTF-8
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {parseError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Échec de lecture du fichier</p>
                <p className="text-xs text-rose-700 mt-0.5">{parseError}</p>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isParsing && (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="font-medium">Analyse des colonnes et des données en cours...</p>
            </div>
          )}

          {/* Parsed Results Overview */}
          {parseResult && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-medium">Total Détecté</span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">
                    {parseResult.employees.length}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">employés</span>
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 shadow-2xs">
                  <span className="text-[11px] text-emerald-800 font-medium">Nouveaux Employés</span>
                  <p className="text-xl font-bold text-emerald-900 mt-0.5">
                    {newCount}
                    <span className="text-xs font-normal text-emerald-700 ml-1.5">nouveaux IDs</span>
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 shadow-2xs">
                  <span className="text-[11px] text-amber-800 font-medium">Existants (Mises à jour)</span>
                  <p className="text-xl font-bold text-amber-900 mt-0.5">
                    {updateCount}
                    <span className="text-xs font-normal text-amber-700 ml-1.5">matricules déjà connus</span>
                  </p>
                </div>
              </div>

              {/* Warnings if any */}
              {parseResult.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-amber-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Avertissements ({parseResult.warnings.length})</span>
                  </p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-amber-800">
                    {parseResult.warnings.slice(0, 4).map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                    {parseResult.warnings.length > 4 && (
                      <li>... et {parseResult.warnings.length - 4} autres.</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Import Mode Selector */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">
                  Méthode d'importation :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'merge'
                        ? 'bg-white border-indigo-500 shadow-2xs text-indigo-950 font-semibold'
                        : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs">Fusionner & Mettre à jour</p>
                      <p className="text-[10px] text-slate-500 font-normal">
                        Ajoute les nouveaux et met à jour les matricules existants.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'addNewOnly'
                        ? 'bg-white border-indigo-500 shadow-2xs text-indigo-950 font-semibold'
                        : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'addNewOnly'}
                      onChange={() => setImportMode('addNewOnly')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs">Nouveaux uniquement</p>
                      <p className="text-[10px] text-slate-500 font-normal">
                        Ignore les matricules déjà enregistrés sans les modifier.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'bg-white border-rose-500 shadow-2xs text-rose-950 font-semibold'
                        : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <p className="text-xs text-rose-900">Remplacer toute la liste</p>
                      <p className="text-[10px] text-slate-500 font-normal">
                        Écrase l'ensemble des employés actuels par ce fichier.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Data Preview Table */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-800 text-xs">
                    Aperçu des données ({parseResult.employees.length} employés) :
                  </span>
                  <span className="text-[11px] text-slate-400">Affichage des 10 premiers</span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold sticky top-0">
                      <tr>
                        <th className="py-2 px-3 font-mono">Matricule</th>
                        <th className="py-2 px-3">Nom</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Département</th>
                        <th className="py-2 px-3">Groupe</th>
                        <th className="py-2 px-3">Horaire</th>
                        <th className="py-2 px-3 text-center">Samedi</th>
                        <th className="py-2 px-3">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-normal">
                      {parseResult.employees.slice(0, 15).map((e, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {e.id}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{e.name}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                e.workerType === 'Stock'
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {e.workerType === 'Stock' ? '📦 Stock' : '🏢 Admin'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">{e.companyDepartment}</td>
                          <td className="py-2 px-3 text-slate-600">{e.groupName}</td>
                          <td className="py-2 px-3">
                            <span className="font-mono text-[10px] bg-slate-100 rounded px-1 py-0.5">
                              {e.scheduleId}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {e.hasSaturdayShift ? (
                              <span className="text-teal-700 font-bold bg-teal-50 rounded px-1.5 py-0.5">
                                OUI
                              </span>
                            ) : (
                              <span className="text-slate-400">NON</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                e.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {e.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
          >
            Annuler
          </button>

          <button
            type="button"
            disabled={!parseResult || parseResult.employees.length === 0 || isParsing}
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-xs font-semibold text-white shadow-2xs transition-all"
          >
            <CheckCircle className="w-4 h-4" />
            <span>
              Confirmer l'Importation ({parseResult ? parseResult.employees.length : 0} employés)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
