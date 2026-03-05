interface ScoringInput {
  classACount: number;
  classBCount: number;
  classCCount: number;
  overdueItems: number;
  totalComplianceItems: number;
  nonCompliantCount: number;
  totalPenalties: number;
}

export function calcBuildingHealthScore(input: ScoringInput): number {
  let score = 100;

  // Class C (Immediately Hazardous): -15 each, max -45
  score -= Math.min(input.classCCount * 15, 45);

  // Class A/B: -3 each, max -30
  score -= Math.min((input.classACount + input.classBCount) * 3, 30);

  // Overdue compliance items: -5 each, max -25
  score -= Math.min(input.overdueItems * 5, 25);

  // Non-compliance rate: up to -20
  if (input.totalComplianceItems > 0) {
    const nonComplianceRate = input.nonCompliantCount / input.totalComplianceItems;
    score -= Math.min(Math.round(nonComplianceRate * 20), 20);
  }

  // Fines: up to -10
  if (input.totalPenalties > 0) {
    const fineDeduction = Math.min(Math.floor(input.totalPenalties / 5000), 10);
    score -= fineDeduction;
  }

  return Math.max(0, Math.min(100, score));
}

export function getHealthLabel(score: number): string {
  if (score >= 90) return "EXCELLENT";
  if (score >= 75) return "GOOD";
  if (score >= 60) return "FAIR";
  if (score >= 40) return "POOR";
  return "CRITICAL";
}
