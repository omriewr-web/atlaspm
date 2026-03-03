"use client";

import { Search, X } from "lucide-react";
import { useAppStore } from "@/stores/app-store";

export default function FilterBar({ showLeaseFilter = false }: { showLeaseFilter?: boolean }) {
  const {
    searchTerm, setSearchTerm,
    arrearsFilter, setArrearsFilter,
    leaseFilter, setLeaseFilter,
    resetFilters,
  } = useAppStore();

  const hasFilters = searchTerm || arrearsFilter !== "all" || leaseFilter !== "all";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
        <input
          type="text"
          placeholder="Search tenants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-bg border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
        />
      </div>

      <select
        value={arrearsFilter}
        onChange={(e) => setArrearsFilter(e.target.value)}
        className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
      >
        <option value="all">All Arrears</option>
        <option value="current">Current</option>
        <option value="30">30 Days</option>
        <option value="60">60 Days</option>
        <option value="90">90 Days</option>
        <option value="120+">120+ Days</option>
      </select>

      {showLeaseFilter && (
        <select
          value={leaseFilter}
          onChange={(e) => setLeaseFilter(e.target.value)}
          className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="all">All Leases</option>
          <option value="active">Active</option>
          <option value="expiring-soon">Expiring Soon</option>
          <option value="expired">Expired</option>
          <option value="no-lease">No Lease</option>
        </select>
      )}

      {hasFilters && (
        <button
          onClick={resetFilters}
          className="text-xs text-text-dim hover:text-text-muted flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Clear
        </button>
      )}
    </div>
  );
}
