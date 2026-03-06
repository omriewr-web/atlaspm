export interface OwnerSummaryInput {
  vacancyLoss: number;
  arrears: number;
  legalCases: number;
  openViolations: number;
  majorRepairSpend: number;
  notableItems: string[];
}

export function buildOwnerSummary(input: OwnerSummaryInput): string[] {
  const lines: string[] = [];

  lines.push(`Revenue at risk is $${(input.vacancyLoss + input.arrears).toLocaleString()}, made up of vacancy loss and arrears.`);

  if (input.legalCases > 0) {
    lines.push(`${input.legalCases} active legal case(s) require owner attention.`);
  }

  if (input.openViolations > 0) {
    lines.push(`${input.openViolations} open violation(s) remain, with priority on items affecting compliance, insurance, or lender concerns.`);
  }

  if (input.majorRepairSpend > 0) {
    lines.push(`Major repair activity this period totals $${input.majorRepairSpend.toLocaleString()}.`);
  }

  for (const item of input.notableItems.slice(0, 3)) {
    lines.push(item);
  }

  return lines;
}
