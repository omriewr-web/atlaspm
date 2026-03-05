"use client";

import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  sortField?: string;
  sortDir?: "asc" | "desc";
  onSort?: (field: string) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
  emptyMessage?: string;
}

export default function DataTable<T>({
  columns, data, rowKey, onRowClick, sortField, sortDir, onSort,
  selectedIds, onToggleSelect, onSelectAll, emptyMessage = "No data",
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b border-border">
            {onToggleSelect && (
              <th className="px-3 py-2.5 text-left w-8">
                <input
                  type="checkbox"
                  checked={data.length > 0 && selectedIds?.size === data.length}
                  onChange={onSelectAll}
                  className="rounded"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-3 py-2.5 text-left text-xs font-medium text-text-dim uppercase tracking-wider",
                  col.sortable && "cursor-pointer hover:text-text-muted select-none",
                  col.className
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortField === col.key && (
                    sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (onToggleSelect ? 1 : 0)}
                className="px-3 py-8 text-center text-text-dim"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const id = rowKey(row);
              return (
                <tr
                  key={id}
                  className={cn(
                    "border-b border-border/50 transition-all border-l-2 border-l-transparent",
                    index % 2 === 1 && "bg-[#141A2240]",
                    onRowClick && "cursor-pointer hover:bg-card-hover hover:border-l-accent",
                    selectedIds?.has(id) && "bg-accent/5"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {onToggleSelect && (
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds?.has(id) ?? false}
                        onChange={() => onToggleSelect(id)}
                        className="rounded"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-3 py-2.5", col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export type { Column };
