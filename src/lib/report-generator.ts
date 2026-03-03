import { TenantView, PortfolioMetrics } from "@/types";
import { getScoreLabel } from "./scoring";

function fmt$(v: number) {
  return "$" + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateCollectionReport(tenants: TenantView[], metrics: PortfolioMetrics, title: string): string {
  const now = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const rows = tenants
    .filter((t) => t.balance > 0)
    .sort((a, b) => b.collectionScore - a.collectionScore)
    .map((t) => {
      const { label, color } = getScoreLabel(t.collectionScore);
      return `<tr>
        <td>${t.buildingAddress}</td>
        <td>${t.unitNumber}</td>
        <td>${t.name}</td>
        <td style="text-align:right;color:#dc2626">${fmt$(t.balance)}</td>
        <td style="text-align:right">${fmt$(t.marketRent)}</td>
        <td>${t.arrearsCategory}</td>
        <td style="text-align:right;font-weight:bold;color:${color}">${t.collectionScore} ${label}</td>
        <td>${t.legalFlag ? t.legalStage?.replace(/-/g, " ") || "In Legal" : t.legalRecommended ? "Recommended" : ""}</td>
        <td>${t.noteCount}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html><head>
<title>${title}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #1a1a1a; }
  h1 { font-size: 18px; margin-bottom: 5px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
  .kpi { display: flex; gap: 15px; margin-bottom: 20px; }
  .kpi div { background: #f5f5f5; padding: 10px 15px; border-radius: 6px; }
  .kpi .label { font-size: 10px; text-transform: uppercase; color: #666; }
  .kpi .value { font-size: 20px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f0f0f0; padding: 6px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #ccc; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; }
  tr:hover { background: #fafafa; }
  @media print { .no-print { display: none; } }
</style>
</head><body>
<h1>${title}</h1>
<p class="meta">Generated: ${now}</p>
<div class="kpi">
  <div><div class="label">Total Units</div><div class="value">${metrics.totalUnits}</div></div>
  <div><div class="label">Occupancy</div><div class="value">${metrics.occupancyRate.toFixed(1)}%</div></div>
  <div><div class="label">Total Balance</div><div class="value" style="color:#dc2626">${fmt$(metrics.totalBalance)}</div></div>
  <div><div class="label">Legal Cases</div><div class="value">${metrics.legalCaseCount}</div></div>
</div>
<table>
<thead><tr><th>Building</th><th>Unit</th><th>Name</th><th style="text-align:right">Balance</th><th style="text-align:right">Rent</th><th>Arrears</th><th style="text-align:right">Score</th><th>Legal</th><th>Notes</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<br><button class="no-print" onclick="window.print()">Print Report</button>
</body></html>`;
}
