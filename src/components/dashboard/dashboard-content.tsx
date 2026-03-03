"use client";

import { Building2, Users, AlertTriangle, DollarSign, Scale, FileText } from "lucide-react";
import { useMetrics } from "@/hooks/use-metrics";
import { useBuildings } from "@/hooks/use-buildings";
import StatCard from "@/components/ui/stat-card";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { fmt$, pct } from "@/lib/utils";
import ArrearsChart from "./arrears-chart";
import LeaseChart from "./lease-chart";
import BalanceChart from "./balance-chart";
import PropertiesTable from "./properties-table";
import BuildingInfo from "./building-info";
import { useAppStore } from "@/stores/app-store";

export default function DashboardContent() {
  const { data: metrics, isLoading } = useMetrics();
  const { data: buildings } = useBuildings();
  const { selectedBuildingId, setSelectedBuildingId } = useAppStore();
  const selectedBuilding = buildings?.find((b) => b.id === selectedBuildingId);

  if (isLoading || !metrics) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Units" value={metrics.totalUnits} icon={Building2} subtext={`${pct(metrics.occupancyRate)} occupied`} />
        <StatCard label="Occupied" value={metrics.occupied} icon={Users} color="#10B981" />
        <StatCard label="Vacant" value={metrics.vacant} icon={Building2} color="#F59E0B" subtext={metrics.lostRent > 0 ? `${fmt$(metrics.lostRent)} lost/mo` : undefined} />
        <StatCard label="Total Balance" value={fmt$(metrics.totalBalance)} icon={DollarSign} color="#EF4444" />
        <StatCard label="Legal Cases" value={metrics.legalCaseCount} icon={Scale} color="#8B5CF6" />
        <StatCard label="Expiring Leases" value={metrics.expiringSoon} icon={FileText} color="#F97316" subtext={`${metrics.expiredLease} expired`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-text-muted mb-4">Arrears Distribution</h3>
          <ArrearsChart
            current={metrics.totalUnits - metrics.arrears30 - metrics.arrears60 - metrics.arrears90Plus - metrics.vacant}
            d30={metrics.arrears30}
            d60={metrics.arrears60}
            d90plus={metrics.arrears90Plus}
          />
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-text-muted mb-4">Lease Status</h3>
          <LeaseChart
            active={metrics.occupied - metrics.noLease - metrics.expiredLease - metrics.expiringSoon}
            expiringSoon={metrics.expiringSoon}
            expired={metrics.expiredLease}
            noLease={metrics.noLease}
          />
        </div>
      </div>

      {selectedBuilding && (
        <BuildingInfo building={selectedBuilding} onClose={() => setSelectedBuildingId(null)} />
      )}

      {buildings && buildings.length > 0 && (
        <>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-text-muted mb-4">Top Balances by Property</h3>
            <BalanceChart buildings={buildings.sort((a, b) => b.totalBalance - a.totalBalance).slice(0, 15)} />
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-text-muted mb-4">Properties Overview</h3>
            <PropertiesTable buildings={buildings} />
          </div>
        </>
      )}
    </div>
  );
}
