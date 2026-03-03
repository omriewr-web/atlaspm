"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import Button from "@/components/ui/button";
import { useImportExcel } from "@/hooks/use-import";
import { cn } from "@/lib/utils";

export default function UploadZone() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const importExcel = useImportExcel();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls") || f.name.endsWith(".csv"))) {
      setFile(f);
    }
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  function handleUpload() {
    if (!file) return;
    importExcel.mutate(file, {
      onSuccess: () => setFile(null),
    });
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
          dragOver ? "border-accent bg-accent/5" : "border-border hover:border-border-light"
        )}
      >
        <Upload className="w-8 h-8 text-text-dim mx-auto mb-3" />
        <p className="text-sm text-text-muted">
          Drag & drop an Excel file here, or <span className="text-accent">browse</span>
        </p>
        <p className="text-xs text-text-dim mt-1">.xlsx, .xls, or .csv</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {file && (
        <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3">
          <FileSpreadsheet className="w-5 h-5 text-green-400" />
          <div className="flex-1">
            <p className="text-sm text-text-primary">{file.name}</p>
            <p className="text-xs text-text-dim">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={() => setFile(null)} className="text-text-dim hover:text-text-muted">
            <X className="w-4 h-4" />
          </button>
          <Button onClick={handleUpload} disabled={importExcel.isPending}>
            {importExcel.isPending ? "Importing..." : "Import"}
          </Button>
        </div>
      )}

      {importExcel.data && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-sm text-green-400">
          Imported {importExcel.data.imported} records
          {importExcel.data.skipped > 0 && `, ${importExcel.data.skipped} skipped`}
          {importExcel.data.errors?.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-green-400/70">
                {importExcel.data.errors.length} warnings
              </summary>
              <ul className="mt-1 text-xs text-text-dim list-disc list-inside">
                {importExcel.data.errors.map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
