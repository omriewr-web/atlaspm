"use client";

import { TenantView } from "@/types";
import { useAppStore } from "@/stores/app-store";
import { fmt$ } from "@/lib/utils";
import ArrearsBadge from "./arrears-badge";
import LeaseBadge from "./lease-badge";
import { getScoreLabel } from "@/lib/scoring";
import DataTable, { Column } from "@/components/ui/data-table";

interface Props {
  tenants: TenantView[];
  showBuilding?: boolean;
  showLease?: boolean;
  showScore?: boolean;
}

export default function TenantTable({ tenants, showBuilding = true, showLease = false, showScore = true }: Props) {
  const {
    sortField, sortDir, setSort,
    setDetailTenantId,
    selectedTenantIds, toggleTenant, selectAll, deselectAll,
  } = useAppStore();

  function handleSort(field: string) {
    if (sortField === field) {
      setSort(field, sortDir === "asc" ? "desc" : "asc");
    } else {
      setSort(field, "desc");
    }
  }

  const columns: Column<TenantView>[] = [
    ...(showBuilding
      ? [{
          key: "building",
          label: "Building",
          render: (t: TenantView) => (
            <span className="text-text-muted text-xs">{t.buildingAddress}</span>
          ),
        }]
      : []),
    {
      key: "unit",
      label: "Unit",
      render: (t: TenantView) => <span className="text-text-primary font-mono text-xs">{t.unitNumber}</span>,
    },
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (t: TenantView) => (
        <div>
          <span className="text-text-primary">{t.name}</span>
          {t.legalFlag && <span className="ml-1.5 text-[10px] text-purple-400">LEGAL</span>}
        </div>
      ),
    },
    {
      key: "balance",
      label: "Balance",
      sortable: true,
      className: "text-right",
      render: (t: TenantView) => (
        <span className={t.balance > 0 ? "text-red-400" : "text-green-400"}>{fmt$(t.balance)}</span>
      ),
    },
    {
      key: "marketRent",
      label: "Rent",
      className: "text-right",
      render: (t: TenantView) => <span className="text-text-muted">{fmt$(t.marketRent)}</span>,
    },
    {
      key: "arrears",
      label: "Arrears",
      render: (t: TenantView) => <ArrearsBadge category={t.arrearsCategory} />,
    },
    ...(showLease
      ? [{
          key: "lease",
          label: "Lease",
          render: (t: TenantView) => <LeaseBadge status={t.leaseStatus} />,
        }]
      : []),
    ...(showScore
      ? [{
          key: "collectionScore",
          label: "Score",
          sortable: true,
          className: "text-right",
          render: (t: TenantView) => {
            const { label, color } = getScoreLabel(t.collectionScore);
            return (
              <span className="font-mono text-xs font-bold" style={{ color }}>
                {t.collectionScore} <span className="text-[10px] font-normal">{label}</span>
              </span>
            );
          },
        }]
      : []),
    {
      key: "notes",
      label: "Notes",
      className: "text-center",
      render: (t: TenantView) => (
        <span className="text-text-dim text-xs">{t.noteCount || "—"}</span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={tenants}
      rowKey={(t) => t.id}
      onRowClick={(t) => setDetailTenantId(t.id)}
      sortField={sortField}
      sortDir={sortDir}
      onSort={handleSort}
      selectedIds={selectedTenantIds}
      onToggleSelect={toggleTenant}
      onSelectAll={() => {
        if (selectedTenantIds.size === tenants.length) {
          deselectAll();
        } else {
          selectAll(tenants.map((t) => t.id));
        }
      }}
      emptyMessage="No tenants found"
    />
  );
}
