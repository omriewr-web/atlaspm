import { DecisionSuggestion } from "./types";

export interface ViolationInput {
  violationId: string;
  buildingId: string;
  unitId?: string | null;
  agency: string;
  violationType: string;
  classOrSeverity?: string | null;
  status: string;
  isOpen: boolean;
  targetCompletionDate?: Date | null;
  openBCViolationsInBuilding?: number;
  totalUnitsInBuilding?: number;
}

export function evaluateViolation(v: ViolationInput): DecisionSuggestion[] {
  const suggestions: DecisionSuggestion[] = [];
  const type = v.violationType.toLowerCase();
  const severity = (v.classOrSeverity || "").toLowerCase();

  // Heat / hot water: immediate dispatch
  if (type.includes("heat") || type.includes("hot water")) {
    suggestions.push({
      module: "violations",
      severity: "critical",
      code: "VIOLATION_HEAT_HOT_WATER",
      title: "Heat / hot water issue requires immediate action",
      reason: "Heat and hot water are the highest priority issues.",
      suggestedAction: "Dispatch repair same day. No exceptions.",
      ownerVisible: false,
      entityType: "violation",
      entityId: v.violationId,
    });
  }

  // Class C: high priority
  if (severity === "c" || severity.includes("class c")) {
    suggestions.push({
      module: "violations",
      severity: "high",
      code: "VIOLATION_CLASS_C_PRIORITY",
      title: "Class C violation should be prioritized",
      reason: "Hazardous violations require prompt attention.",
      suggestedAction: "Create or confirm remediation work order immediately.",
      ownerVisible: false,
      entityType: "violation",
      entityId: v.violationId,
    });
  }

  // Class B: medium priority
  if (severity === "b" || severity.includes("class b")) {
    suggestions.push({
      module: "violations",
      severity: "medium",
      code: "VIOLATION_CLASS_B_QUEUE",
      title: "Class B violation requires attention",
      reason: "Important but not immediately dangerous — still must be resolved.",
      suggestedAction: "Create remediation work order and track to closure.",
      ownerVisible: false,
      entityType: "violation",
      entityId: v.violationId,
    });
  }

  // Class A: low priority
  if ((severity === "a" || severity.includes("class a")) && v.isOpen) {
    suggestions.push({
      module: "violations",
      severity: "low",
      code: "VIOLATION_CLASS_A_QUEUE",
      title: "Class A violation should be queued for repair",
      reason: "Class A is lower priority but still requires resolution.",
      suggestedAction: "Add to maintenance queue and track toward closure.",
      ownerVisible: false,
      entityType: "violation",
      entityId: v.violationId,
    });
  }

  // Past target completion date
  if (
    v.targetCompletionDate &&
    v.targetCompletionDate.getTime() < Date.now() &&
    !["closed", "certified"].includes(v.status.toLowerCase())
  ) {
    suggestions.push({
      module: "violations",
      severity: "high",
      code: "VIOLATION_PAST_TARGET_DATE",
      title: "Violation past target completion date",
      reason: "The target completion date has passed and the violation is still open.",
      suggestedAction: "Violation deadline has passed. Escalate remediation immediately.",
      ownerVisible: false,
      entityType: "violation",
      entityId: v.violationId,
      metadata: { targetCompletionDate: v.targetCompletionDate.toISOString() },
    });
  }

  // AEP risk calculation
  if (
    v.openBCViolationsInBuilding !== undefined &&
    v.totalUnitsInBuilding !== undefined &&
    v.totalUnitsInBuilding > 0
  ) {
    const ratio = v.openBCViolationsInBuilding / v.totalUnitsInBuilding;
    const isLarge = v.totalUnitsInBuilding >= 20;
    const threshold = isLarge ? 3.0 : 5.0;
    const warnAt = threshold * 0.6;
    const criticalAt = threshold * 0.8;

    if (ratio >= criticalAt) {
      suggestions.push({
        module: "violations",
        severity: "critical",
        code: "VIOLATION_AEP_RISK_CRITICAL",
        title: "Building at critical AEP risk",
        reason:
          "B+C violation ratio is at 80%+ of HPD AEP threshold. " +
          "AEP enrollment means rent freeze, $500/unit fees, and potential HPD takeover.",
        suggestedAction: "Immediate action required. Close all B and C violations now.",
        ownerVisible: false,
        entityType: "building",
        entityId: v.buildingId,
        buildingSize: isLarge ? "large" : "small",
        metadata: { ratio, totalUnitsInBuilding: v.totalUnitsInBuilding, threshold },
      });
    } else if (ratio >= warnAt) {
      suggestions.push({
        module: "violations",
        severity: "high",
        code: "VIOLATION_AEP_RISK_WARNING",
        title: "Building approaching AEP violation threshold",
        reason:
          "B+C violation ratio is at 60%+ of HPD AEP selection threshold. " +
          "Large buildings (20+): AEP triggers at 3.0/unit. " +
          "Small buildings (3-19): AEP triggers at 5.0/unit.",
        suggestedAction: "Prioritize closing open B and C violations to reduce AEP exposure.",
        ownerVisible: false,
        entityType: "building",
        entityId: v.buildingId,
        buildingSize: isLarge ? "large" : "small",
        metadata: { ratio, totalUnitsInBuilding: v.totalUnitsInBuilding, threshold },
      });
    }
  }

  return suggestions;
}
