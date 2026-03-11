"use client";

import { useMemo } from "react";
import Link from "next/link";
import { DoorOpen, ArrowRight, ClipboardList } from "lucide-react";
import { useBuildings } from "@/hooks/use-buildings";
import { useMetrics } from "@/hooks/use-metrics";
import { useTurnovers, useCreateTurnover } from "@/hooks/use-turnovers";
import StatCard from "@/components/ui/stat-card";
import { PageSkeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import VacancyChart from "@/components/dashboard/vacancy-chart";
import { fmt$, pct } from "@/lib/utils";
import ExportButton from "@/components/ui/export-button";

const TURNOVER_STATUS_LABELS: Record<string, string> = {
  PENDING_INSPECTION: "Pending Inspection",
  INSPECTION_DONE: "Inspection Done",
  SCOPE_CREATED: "Scope Created",
  VENDORS_ASSIGNED: "Vendors Assigned",
  READY_TO_LIST: "Ready to List",
  LISTED: "Listed",
  COMPLETE: "Complete",
};

export default function VacanciesContent() {
  const { data: buildings, isLoading } = useBuildings();
  const { data: metrics } = useMetrics();
  const { data: turnovers } = useTurnovers();
  const createTurnover = useCreateTurnover();

  const buildingsWithVacancies = useMemo(
    () => (buildings || []).filter((b) => b.vacant > 0).sort((a, b) => b.vacant - a.vacant),
    [buildings]
  );

  const totalVacantRent = useMemo(
    () => metrics?.lostRent || 0,
    [metrics]
  );

  // Build a map of unitId → turnover for quick lookup
  const turnoverByUnit = useMemo(() => {
    const map = new Map<string, (typeof turnovers extends (infer T)[] | undefined ? T : never)>();
    for (const t of turnovers || []) {
      map.set(t.unitId, t);
    }
    return map;
  }, [turnovers]);

  const activeTurnoverCount = turnovers?.filter((t) => t.status !== "COMPLETE").length || 0;

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Vacancy Tracking</h1>
        <div className="flex items-center gap-2">
          <ExportButton
            data={buildingsWithVacancies.map((b) => ({
              address: b.address,
              totalUnits: b.totalUnits,
              occupied: b.occupied,
              vacant: b.vacant,
              vacancyRate: b.totalUnits > 0 ? ((b.vacant / b.totalUnits) * 100).toFixed(1) + "%" : "0%",
              totalMarketRent: b.totalMarketRent,
            }))}
            filename="vacancy-report"
            columns={[
              { key: "address", label: "Property" },
              { key: "totalUnits", label: "Total Units" },
              { key: "occupied", label: "Occupied" },
              { key: "vacant", label: "Vacant" },
              { key: "vacancyRate", label: "Vacancy Rate" },
              { key: "totalMarketRent", label: "Market Rent" },
            ]}
            pdfConfig={{
              title: "Vacancy Report",
              stats: [
                { label: "Vacant Units", value: String(metrics?.vacant || 0) },
                { label: "Vacancy Rate", value: metrics?.totalUnits ? pct(((metrics?.vacant || 0) / metrics.totalUnits) * 100) : "0%" },
                { label: "Lost Rent/Mo", value: fmt$(totalVacantRent) },
              ],
            }}
          />
          <Link
            href="/turnovers"
            className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-light transition-colors bg-accent/10 px-3 py-1.5 rounded-lg"
          >
            <ClipboardList className="w-4 h-4" />
            {activeTurnoverCount > 0 ? `${activeTurnoverCount} Active Turnovers` : "Turnovers"}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Vacant Units" value={metrics?.vacant || 0} icon={DoorOpen} color="#F59E0B" />
        <StatCard label="Total Units" value={metrics?.totalUnits || 0} />
        <StatCard label="Vacancy Rate" value={metrics?.totalUnits ? pct(((metrics?.vacant || 0) / metrics.totalUnits) * 100) : "0%"} color="#F59E0B" />
        <StatCard label="Lost Rent/Mo" value={fmt$(totalVacantRent)} color="#EF4444" />
      </div>

      {buildingsWithVacancies.length > 0 && (
        <div className="bg-card-gradient border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-text-muted mb-4">Vacancies by Property</h3>
          <VacancyChart buildings={buildingsWithVacancies} />
        </div>
      )}

      {/* Active turnovers summary */}
      {turnovers && turnovers.length > 0 && (
        <div className="bg-card-gradient border border-border rounded-xl overflow-x-auto">
          <div className="px-3 py-2 border-b border-border">
            <h3 className="text-sm font-medium text-text-muted">Active Turnover Workflows</h3>
          </div>
          <table className="w-full text-sm min-w-[650px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-medium text-text-dim uppercase">Property</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-dim uppercase">Unit</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-dim uppercase">Status</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-dim uppercase">Days</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-dim uppercase">Est. Cost</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {turnovers.filter((t) => t.status !== "COMPLETE").slice(0, 10).map((t, i) => {
                const days = Math.ceil((Date.now() - new Date(t.createdAt).getTime()) / 86400000);
                const urgencyColor = days >= 60 ? "text-red-400" : days >= 30 ? "text-orange-400" : "text-amber-400";
                return (
                  <tr key={t.id} className={`border-b border-border/50 last:border-0 hover:bg-card-hover transition-colors ${i % 2 === 1 ? "bg-white/[0.02]" : ""}`}>
                    <td className="px-3 py-2 text-text-primary">{t.building.address}</td>
                    <td className="px-3 py-2 text-text-muted font-mono">{t.unit.unitNumber}</td>
                    <td className="px-3 py-2 text-xs text-text-muted">{TURNOVER_STATUS_LABELS[t.status] || t.status}</td>
                    <td className={`px-3 py-2 text-right font-mono tabular-nums ${urgencyColor}`}>{days}</td>
                    <td className="px-3 py-2 text-right text-text-muted font-mono tabular-nums">{t.estimatedCost ? fmt$(t.estimatedCost) : "—"}</td>
                    <td className="px-3 py-2">
                      <Link href={`/turnovers/${t.id}`} className="text-accent hover:text-accent-light">
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {buildingsWithVacancies.length > 0 ? (
        <div className="bg-card-gradient border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-medium text-text-dim uppercase">Property</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-dim uppercase">Total</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-dim uppercase">Occupied</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-dim uppercase">Vacant</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-dim uppercase">Vacancy Rate</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-dim uppercase">Market Rent</th>
              </tr>
            </thead>
            <tbody>
              {buildingsWithVacancies.map((b) => (
                <tr key={b.id} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                  <td className="px-3 py-2 text-text-primary">{b.address}</td>
                  <td className="px-3 py-2 text-right text-text-muted font-mono">{b.totalUnits}</td>
                  <td className="px-3 py-2 text-right text-green-400 font-mono">{b.occupied}</td>
                  <td className="px-3 py-2 text-right text-amber-400 font-bold font-mono">{b.vacant}</td>
                  <td className="px-3 py-2 text-right text-amber-400 font-mono">
                    {b.totalUnits > 0 ? pct((b.vacant / b.totalUnits) * 100) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-text-muted font-mono">{fmt$(b.totalMarketRent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No vacancies" description="All units are currently occupied" icon={DoorOpen} />
      )}
    </div>
  );
}
