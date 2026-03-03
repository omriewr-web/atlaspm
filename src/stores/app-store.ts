import { create } from "zustand";

interface AppState {
  selectedBuildingId: string | null;
  setSelectedBuildingId: (id: string | null) => void;

  searchTerm: string;
  setSearchTerm: (term: string) => void;

  arrearsFilter: string;
  setArrearsFilter: (f: string) => void;

  leaseFilter: string;
  setLeaseFilter: (f: string) => void;

  balanceMin: string;
  balanceMax: string;
  setBalanceMin: (v: string) => void;
  setBalanceMax: (v: string) => void;

  sortField: string;
  sortDir: "asc" | "desc";
  setSort: (field: string, dir: "asc" | "desc") => void;

  selectedTenantIds: Set<string>;
  toggleTenant: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;

  detailTenantId: string | null;
  setDetailTenantId: (id: string | null) => void;

  editTenantId: string | null;
  setEditTenantId: (id: string | null) => void;

  resetFilters: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedBuildingId: null,
  setSelectedBuildingId: (id) => set({ selectedBuildingId: id }),

  searchTerm: "",
  setSearchTerm: (term) => set({ searchTerm: term }),

  arrearsFilter: "all",
  setArrearsFilter: (f) => set({ arrearsFilter: f }),

  leaseFilter: "all",
  setLeaseFilter: (f) => set({ leaseFilter: f }),

  balanceMin: "",
  balanceMax: "",
  setBalanceMin: (v) => set({ balanceMin: v }),
  setBalanceMax: (v) => set({ balanceMax: v }),

  sortField: "balance",
  sortDir: "desc",
  setSort: (field, dir) => set({ sortField: field, sortDir: dir }),

  selectedTenantIds: new Set(),
  toggleTenant: (id) =>
    set((s) => {
      const next = new Set(s.selectedTenantIds);
      next.has(id) ? next.delete(id) : next.add(id);
      return { selectedTenantIds: next };
    }),
  selectAll: (ids) => set({ selectedTenantIds: new Set(ids) }),
  deselectAll: () => set({ selectedTenantIds: new Set() }),

  detailTenantId: null,
  setDetailTenantId: (id) => set({ detailTenantId: id }),

  editTenantId: null,
  setEditTenantId: (id) => set({ editTenantId: id }),

  resetFilters: () =>
    set({
      searchTerm: "",
      arrearsFilter: "all",
      leaseFilter: "all",
      balanceMin: "",
      balanceMax: "",
    }),
}));
