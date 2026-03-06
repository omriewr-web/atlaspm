import { normalizeAddress } from "@/lib/building-matching";

export interface LegalCaseRow {
  address: string;
  unit: string;
  tenantName: string;
  caseNumber: string;
  attorney: string;
  filingDate: Date | null;
  courtDate: Date | null;
  legalStage: string;
  arrearsBalance: number;
  notes: string;
  status: string;
  rowIndex: number;
}

export interface TenantRecord {
  id: string;
  name: string;
  unitNumber: string;
  buildingId: string;
  buildingAddress: string;
  balance: number;
}

export type MatchType = "exact" | "likely" | "needs_review" | "no_match";

export interface MatchResult {
  row: LegalCaseRow;
  matchType: MatchType;
  confidence: number;
  tenant: TenantRecord | null;
  reasons: string[];
}

function normalizeNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeNameForMatch(a);
  const nb = normalizeNameForMatch(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;

  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  // Check last-name match
  const partsA = na.split(" ");
  const partsB = nb.split(" ");
  const lastA = partsA[partsA.length - 1];
  const lastB = partsB[partsB.length - 1];
  if (lastA === lastB && lastA.length > 2) {
    // Same last name, check first initial
    if (partsA[0]?.[0] === partsB[0]?.[0]) return 0.75;
    return 0.6;
  }

  // Levenshtein on full normalized name
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const similarity = 1 - dist / maxLen;
  return similarity;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalizeUnit(unit: string): string {
  return unit.toLowerCase().replace(/^(apt|unit|#|no\.?|suite)\s*/i, "").trim();
}

export function matchLegalCase(
  row: LegalCaseRow,
  tenants: TenantRecord[],
  addressToBuildingId: Map<string, string>,
): MatchResult {
  const reasons: string[] = [];

  // 1. Find building by address
  let targetBuildingId: string | undefined;
  if (row.address) {
    targetBuildingId = addressToBuildingId.get(normalizeAddress(row.address));
    if (targetBuildingId) {
      reasons.push("Building matched by address");
    }
  }

  // 2. Filter tenants by building if found
  let candidates = targetBuildingId
    ? tenants.filter((t) => t.buildingId === targetBuildingId)
    : tenants;

  // 3. Filter by unit if provided
  if (row.unit) {
    const normUnit = normalizeUnit(row.unit);
    const unitMatches = candidates.filter((t) => normalizeUnit(t.unitNumber) === normUnit);
    if (unitMatches.length > 0) {
      candidates = unitMatches;
      reasons.push("Unit number matched");
    }
  }

  // 4. Score each candidate by name similarity
  if (candidates.length === 0) {
    return { row, matchType: "no_match", confidence: 0, tenant: null, reasons: ["No matching building/unit found"] };
  }

  let bestTenant: TenantRecord | null = null;
  let bestScore = 0;

  for (const t of candidates) {
    let score = 0;

    // Name similarity (weight: 50%)
    const ns = nameSimilarity(row.tenantName, t.name);
    score += ns * 0.50;

    // Unit match (weight: 25%)
    if (row.unit && normalizeUnit(row.unit) === normalizeUnit(t.unitNumber)) {
      score += 0.25;
    }

    // Building match (weight: 20%)
    if (targetBuildingId && t.buildingId === targetBuildingId) {
      score += 0.20;
    }

    // Balance proximity (weight: 5%)
    if (row.arrearsBalance > 0 && t.balance > 0) {
      const balRatio = Math.min(row.arrearsBalance, t.balance) / Math.max(row.arrearsBalance, t.balance);
      score += balRatio * 0.05;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTenant = t;
    }
  }

  if (!bestTenant) {
    return { row, matchType: "no_match", confidence: 0, tenant: null, reasons: ["No tenant match found"] };
  }

  // Name similarity for reason tracking
  const nameScore = nameSimilarity(row.tenantName, bestTenant.name);
  if (nameScore >= 0.95) reasons.push("Exact name match");
  else if (nameScore >= 0.75) reasons.push("Close name match");
  else if (nameScore >= 0.5) reasons.push("Partial name match");
  else reasons.push("Weak name match");

  // Classify match
  let matchType: MatchType;
  if (bestScore >= 0.85) {
    matchType = "exact";
  } else if (bestScore >= 0.65) {
    matchType = "likely";
  } else if (bestScore >= 0.40) {
    matchType = "needs_review";
  } else {
    matchType = "no_match";
  }

  return {
    row,
    matchType,
    confidence: Math.round(bestScore * 100) / 100,
    tenant: bestTenant,
    reasons,
  };
}

// Legal referral candidate scoring
export interface LegalCandidate {
  tenantId: string;
  name: string;
  unitNumber: string;
  buildingAddress: string;
  balance: number;
  monthsOwed: number;
  collectionScore: number;
  arrearsCategory: string;
  leaseStatus: string;
  arrearsDays: number;
  referralScore: number;
  reasons: string[];
}

export function scoreLegalCandidate(tenant: {
  balance: number;
  marketRent: number;
  collectionScore: number;
  arrearsCategory: string;
  leaseStatus: string;
  arrearsDays: number;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Balance severity (up to 35 pts)
  const monthsOwed = tenant.marketRent > 0 ? tenant.balance / tenant.marketRent : 0;
  if (monthsOwed >= 6) { score += 35; reasons.push(`${monthsOwed.toFixed(1)} months owed`); }
  else if (monthsOwed >= 3) { score += 25; reasons.push(`${monthsOwed.toFixed(1)} months owed`); }
  else if (monthsOwed >= 2) { score += 15; reasons.push(`${monthsOwed.toFixed(1)} months owed`); }

  // Collection score (up to 25 pts)
  if (tenant.collectionScore >= 80) { score += 25; reasons.push("Very high collection score"); }
  else if (tenant.collectionScore >= 60) { score += 15; reasons.push("High collection score"); }

  // Arrears duration (up to 20 pts)
  if (tenant.arrearsDays >= 180) { score += 20; reasons.push(`${tenant.arrearsDays} days in arrears`); }
  else if (tenant.arrearsDays >= 90) { score += 12; reasons.push(`${tenant.arrearsDays} days in arrears`); }
  else if (tenant.arrearsDays >= 60) { score += 6; reasons.push(`${tenant.arrearsDays} days in arrears`); }

  // Lease status (up to 10 pts)
  if (tenant.leaseStatus === "expired") { score += 10; reasons.push("Lease expired"); }
  else if (tenant.leaseStatus === "no-lease") { score += 8; reasons.push("No lease on file"); }

  // Balance threshold (up to 10 pts)
  if (tenant.balance >= 10000) { score += 10; reasons.push("Balance exceeds $10K"); }
  else if (tenant.balance >= 5000) { score += 5; reasons.push("Balance exceeds $5K"); }

  return { score: Math.min(100, score), reasons };
}
