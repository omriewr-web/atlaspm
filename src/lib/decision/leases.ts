import { DecisionSuggestion } from "./types";

export interface LeaseExpirationInput {
  leaseId: string;
  tenantId: string;
  unitId: string;
  leaseEndDate: Date;
  renewalInProgress: boolean;
  buildingName?: string;
  unitNumber?: string;
}

export function evaluateLeaseExpiration(l: LeaseExpirationInput): DecisionSuggestion[] {
  const suggestions: DecisionSuggestion[] = [];

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilExpiry = Math.ceil((l.leaseEndDate.getTime() - now.getTime()) / msPerDay);

  if (daysUntilExpiry <= 30 && !l.renewalInProgress) {
    suggestions.push({
      module: "leases",
      severity: "critical",
      code: "LEASE_EXPIRING_URGENT",
      title: "Lease expiring in 30 days — urgent",
      reason: `Lease expires in ${daysUntilExpiry} days with no renewal started.`,
      suggestedAction: "Lease expires within 30 days. Confirm renewal or initiate vacancy pipeline now.",
      ownerVisible: true,
      entityType: "tenant",
      entityId: l.tenantId,
      buildingName: l.buildingName,
      unitNumber: l.unitNumber,
      metadata: { leaseEndDate: l.leaseEndDate.toISOString(), daysUntilExpiry },
    });
  } else if (daysUntilExpiry <= 60 && !l.renewalInProgress) {
    suggestions.push({
      module: "leases",
      severity: "high",
      code: "LEASE_EXPIRING_NO_RENEWAL",
      title: "Lease expiring — no renewal in progress",
      reason: `Lease expires in ${daysUntilExpiry} days with no renewal started.`,
      suggestedAction: "Contact tenant immediately to confirm renewal or begin vacancy prep.",
      ownerVisible: false,
      entityType: "tenant",
      entityId: l.tenantId,
      buildingName: l.buildingName,
      unitNumber: l.unitNumber,
      metadata: { leaseEndDate: l.leaseEndDate.toISOString(), daysUntilExpiry },
    });
  }

  return suggestions;
}
