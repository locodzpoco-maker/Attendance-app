import React, { useState, useRef, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Download,
  Sparkles,
  X,
  Play,
  UserPlus,
} from 'lucide-react';
import { parseRawAttendanceFile } from '../utils/parser';
import { generateReferenceDataset, downloadSampleAttendanceFile } from '../utils/sampleData';
import { RawAttendanceDataset, Employee } from '../types';
import { findUnmappedEmployees, createEmployeeFromDetected } from '../utils/employees';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetLoaded: (dataset: RawAttendanceDataset) => void;
  existingEmployees?: Employee[];
  onAddBatchEmployees?: (newEmployees: Employee[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onDatasetLoaded,
  existingEmployees,
  onAddBatchEmployees,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDataset, setPreviewDataset] = useState<RawAttendanceDataset | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoAddUnmapped, setAutoAddUnmapped] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect unmapped workers in the preview dataset
  const unmappedInPreview = useMemo(() => {
    if (!previewDataset || !existingEmployees) return [];
    return findUnmappedEmployees(previewDataset.employees, existingEmployees);
  }, [previewDataset, existingEmployees]);


  if (!isOpen) return null;

  const processFile = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedFile(file);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseRawAttendanceFile(buffer, file.name);

      if (result.error) {
        setErrorMessage(result.error);
        setPreviewDataset(null);
      } else if (result.dataset) {
        setPreviewDataset(result.dataset);
      }
    } catch {
      setErrorMessage(
        'An error occurred while reading the file. Please ensure it is a valid .xls or .xlsx attendance export.'
      );
      setPreviewDataset(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleLoadDemoDataset = () => {
    const demo = generateReferenceDataset();
    setPreviewDataset(demo);
    setSelectedFile(null);
    setErrorMessage(null);
  };

  const handleConfirmCalculate = () => {
    if (previewDataset) {
      if (autoAddUnmapped && unmappedInPreview.length > 0 && onAddBatchEmployees) {
        const newEmps = unmappedInPreview.map((w) => createEmployeeFromDetected(w));
        onAddBatchEmployees(newEmps);
      }
      onDatasetLoaded(previewDataset);
      onClose();
    }
  };


  return (
    <div
      id="import-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="import-modal-card"
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Import Raw Attendance Export</h3>
              <p className="text-xs text-slate-500">Supports legacy .xls and modern .xlsx formats</p>
            </div>
          </div>
          <button
            id="close-import-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action helper banner */}
        <div className="my-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs">
          <span className="text-slate-600">Need a sample file to test right away?</span>
          <div className="flex items-center gap-2">
            <button
              id="download-sample-file-btn"
              onClick={downloadSampleAttendanceFile}
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <Download className="h-3.5 w-3.5" />
              Download AttendanceRecord_0 (56).xlsx
            </button>
            <span className="text-slate-300">|</span>
            <button
              id="load-demo-btn"
              onClick={handleLoadDemoDataset}
              className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-800"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Load July 2026 Reference Data
            </button>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          id="dropzone-area"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
            dragOver
              ? 'border-indigo-500 bg-indigo-50/50'
              : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-3">
            <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {isLoading
              ? 'Reading and validating spreadsheet...'
              : 'Drop your attendance file here, or browse'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Accepts raw exports from fingerprint / biometric software (.xls or .xlsx)
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 border border-rose-200 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Import Error:</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Successful validation summary preview (PRD Section 9: Import Validation) */}
        {previewDataset && !errorMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider pb-2 border-b border-emerald-200">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              File Verified & Validated Successfully
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 text-xs">
              <div>
                <span className="text-slate-500">File Name:</span>
                <p className="font-mono font-medium text-slate-800 truncate">
                  {previewDataset.fileName}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Worksheet Detected:</span>
                <p className="font-medium text-slate-800">{previewDataset.sheetName}</p>
              </div>
              <div>
                <span className="text-slate-500">Attendance Period:</span>
                <p className="font-medium text-slate-800">
                  {previewDataset.startDate} → {previewDataset.endDate}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Employees Found:</span>
                <p className="font-bold text-emerald-700">{previewDataset.employees.length}</p>
              </div>
              <div>
                <span className="text-slate-500">Calendar Days:</span>
                <p className="font-medium text-slate-800">{previewDataset.totalDays} days</p>
              </div>
              <div>
                <span className="text-slate-500">Validation Status:</span>
                <p className="font-bold text-emerald-700">Ready for calculation</p>
              </div>
            </div>

            {/* Quick Preview of parsed employees */}
            <div className="mt-3 pt-3 border-t border-emerald-200/60">
              <span className="text-[11px] font-semibold text-slate-500">Sample of detected employees:</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {previewDataset.employees.slice(0, 6).map((e) => (
                  <span
                    key={e.employeeId}
                    className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-[11px] font-mono font-medium text-slate-700 border border-emerald-200 shadow-2xs"
                  >
                    ID: {e.employeeId} - {e.name}
                  </span>
                ))}
                {previewDataset.employees.length > 6 && (
                  <span className="text-[11px] text-slate-500 self-center">
                    +{previewDataset.employees.length - 6} more
                  </span>
                )}
              </div>
            </div>

            {/* Unmapped Employees Notice & Auto-add Checkbox */}
            {unmappedInPreview.length > 0 && (
              <div
                id="unmapped-in-import-preview-box"
                className="mt-3.5 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-3.5 text-xs text-amber-950 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="font-bold text-amber-950">
                      {unmappedInPreview.length} New Workers Detected (Not in Saved Mapping)
                    </span>
                  </div>
                  <span className="rounded-full bg-amber-200/80 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-900 shrink-0">
                    {previewDataset.employees.length} in file vs {existingEmployees?.length || 0} saved
                  </span>
                </div>
                <p className="mt-1 text-amber-800/90 text-[11px] leading-relaxed">
                  The uploaded file contains <strong>{unmappedInPreview.length}</strong> workers not yet saved in your Employee Mapping directory.
                </p>
                {onAddBatchEmployees && (
                  <label className="mt-2.5 flex items-center gap-2 cursor-pointer select-none font-semibold text-amber-950 bg-white/70 border border-amber-200 rounded-lg p-2 hover:bg-white transition-colors">
                    <input
                      type="checkbox"
                      id="auto-add-unmapped-import-checkbox"
                      checked={autoAddUnmapped}
                      onChange={(e) => setAutoAddUnmapped(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>
                      Automatically add these <strong>{unmappedInPreview.length}</strong> new workers to Employee Mapping upon calculation
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            id="cancel-import-btn"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            id="confirm-calculate-btn"
            disabled={!previewDataset}
            onClick={handleConfirmCalculate}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all ${
              previewDataset
                ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-98 ring-2 ring-indigo-600/30'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Play className="h-4 w-4 fill-white" />
            CALCULATE ATTENDANCE
          </button>
        </div>
      </div>
    </div>
  );
};
