import { DecisionSuggestion } from "./types";

export interface CollectionsInput {
  collectionCaseId: string;
  tenantId: string;
  unitId: string;
  daysLate: number;
  balanceOwed: number;
  monthlyRent: number;
  status: string;
  hasLegalCase: boolean;
  goodPaymentHistory: boolean;
  priorLegalCases: number;
}

export function evaluateCollections(c: CollectionsInput): DecisionSuggestion[] {
  // If tenant already has an active legal case, suppress ALL collections alerts
  if (c.hasLegalCase) return [];

  const suggestions: DecisionSuggestion[] = [];

  // Repeat risk: prior legal history + new delinquency
  if (c.priorLegalCases > 0 && c.daysLate > 0 && c.balanceOwed > 0) {
    suggestions.push({
      module: "collections",
      severity: "high",
      code: "COLLECTION_REPEAT_RISK",
      title: "Repeat risk tenant",
      reason: "Tenant has prior legal history and is carrying a new balance.",
      suggestedAction: "Monitor closely and escalate faster than standard timeline.",
      ownerVisible: true,
      entityType: "tenant",
      entityId: c.tenantId,
      metadata: { priorLegalCases: c.priorLegalCases, balanceOwed: c.balanceOwed, daysLate: c.daysLate },
    });
  }

  // 0-10 days: reminder stage
  if (c.daysLate >= 0 && c.daysLate <= 10 && c.status === "new_arrears") {
    suggestions.push({
      module: "collections",
      severity: "medium",
      code: "COLLECTION_REMINDER_DUE",
      title: "Reminder stage",
      reason: "Tenant is within the first 10 days of delinquency.",
      suggestedAction: "Send reminder and monitor for payment.",
      ownerVisible: false,
      entityType: "tenant",
      entityId: c.tenantId,
    });
  }

  // 10-30 days: aggressive effort
  if (c.daysLate > 10 && c.daysLate <= 30) {
    suggestions.push({
      module: "collections",
      severity: "high",
      code: "COLLECTION_AGGRESSIVE_EFFORT",
      title: "Escalate collection effort",
      reason: "Tenant is between 10 and 30 days late.",
      suggestedAction: "Call tenant, door knock if appropriate, and push payment resolution.",
      ownerVisible: true,
      entityType: "tenant",
      entityId: c.tenantId,
      metadata: { balanceOwed: c.balanceOwed, daysLate: c.daysLate },
    });

    // Good payment history: suggest payment plan option
    if (c.goodPaymentHistory) {
      suggestions.push({
        module: "collections",
        severity: "low",
        code: "COLLECTION_PAYMENT_PLAN_OPTION",
        title: "Payment plan may be appropriate",
        reason: "Tenant has good payment history — payment plan is an option.",
        suggestedAction: "Offer structured payment plan before escalating further.",
        ownerVisible: false,
        entityType: "tenant",
        entityId: c.tenantId,
      });
    }
  }

  // 30+ days: legal review trigger
  if (c.daysLate > 30 && c.balanceOwed >= c.monthlyRent * 0.5) {
    suggestions.push({
      module: "legal",
      severity: "critical",
      code: "LEGAL_REVIEW_TRIGGER",
      title: "Legal review recommended",
      reason: "Tenant is over 30 days late and not yet in legal.",
      suggestedAction: "Begin legal process and confirm required notices under NYC procedure.",
      ownerVisible: true,
      entityType: "tenant",
      entityId: c.tenantId,
      metadata: { balanceOwed: c.balanceOwed, daysLate: c.daysLate, monthlyRent: c.monthlyRent },
    });
  }

  // 35+ days: formal rent demand notice
  if (c.daysLate >= 35 && c.balanceOwed >= c.monthlyRent * 0.5) {
    suggestions.push({
      module: "legal",
      severity: "critical",
      code: "LEGAL_DEMAND_NOTICE_DUE",
      title: "Formal rent demand notice due",
      reason: "Tenant is 35+ days late with significant balance owed.",
      suggestedAction: "Send formal rent demand notice per NYC procedure immediately.",
      ownerVisible: true,
      entityType: "tenant",
      entityId: c.tenantId,
      metadata: { balanceOwed: c.balanceOwed, daysLate: c.daysLate },
    });
  }

  return suggestions;
}
