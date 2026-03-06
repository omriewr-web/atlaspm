import { DecisionSuggestion } from "./types";

export interface VacancyInput {
  vacancyId: string;
  buildingId: string;
  unitId: string;
  daysVacant: number;
  stage: string;
  brokerAssigned: boolean;
  showingsCount: number;
  majorWorkRequired?: boolean;
  buildingArrearsRatio?: number;
  totalUnitsInBuilding?: number;
}

export function evaluateVacancy(v: VacancyInput): DecisionSuggestion[] {
  const suggestions: DecisionSuggestion[] = [];

  // Upcoming vacancy: notify broker
  if (v.stage === "upcoming") {
    suggestions.push({
      module: "vacancy",
      severity: "medium",
      code: "VACANCY_NOTIFY_BROKER",
      title: "Upcoming vacancy — notify broker",
      reason: "Tenant has given notice. Prep begins on move-out day.",
      suggestedAction: "Notify broker of upcoming availability. Do not begin unit prep yet.",
      ownerVisible: false,
      entityType: "unit",
      entityId: v.unitId,
    });
  }

  // Move-out day: begin turnover
  if (v.daysVacant === 0) {
    suggestions.push({
      module: "vacancy",
      severity: "high",
      code: "VACANCY_BEGIN_TURNOVER",
      title: "Move-out day — begin turnover immediately",
      reason: "Unit became vacant today and should be inspected/prepped the same day.",
      suggestedAction: "Inspect unit today, assess scope, create turnover work order.",
      ownerVisible: false,
      entityType: "unit",
      entityId: v.unitId,
    });
  }

  // Exceeds standard turnover window
  if (v.daysVacant > 2 && !v.majorWorkRequired) {
    suggestions.push({
      module: "vacancy",
      severity: "high",
      code: "VACANCY_EXCEEDS_TURNOVER_WINDOW",
      title: "Vacancy exceeds standard turnover window",
      reason: "Simple turns should generally be completed in 1-2 days.",
      suggestedAction: "Review scope, assignment, and listing readiness.",
      ownerVisible: true,
      entityType: "unit",
      entityId: v.unitId,
      metadata: { daysVacant: v.daysVacant },
    });
  }

  // No broker traction
  if (v.daysVacant >= 5 && v.showingsCount === 0) {
    suggestions.push({
      module: "vacancy",
      severity: "high",
      code: "VACANCY_NO_BROKER_TRACTION",
      title: "Vacant unit has no showing activity",
      reason: "Unit has been vacant for 5+ days without any showings.",
      suggestedAction: "Review broker activity, pricing, and listing status immediately.",
      ownerVisible: true,
      entityType: "unit",
      entityId: v.unitId,
    });
  }

  // No broker assigned
  if (!v.brokerAssigned && !["listed", "showing", "application", "lease_signed", "upcoming"].includes(v.stage)) {
    suggestions.push({
      module: "vacancy",
      severity: "medium",
      code: "VACANCY_NO_BROKER",
      title: "No broker assigned",
      reason: "Vacancy is active but broker assignment is missing.",
      suggestedAction: "Assign broker or confirm internal leasing path.",
      ownerVisible: false,
      entityType: "unit",
      entityId: v.unitId,
    });
  }

  // Building-level: high arrears ratio
  if (v.buildingArrearsRatio !== undefined && v.buildingArrearsRatio >= 0.20) {
    suggestions.push({
      module: "vacancy",
      severity: "high",
      code: "BUILDING_HIGH_ARREARS_RATIO",
      title: "Building has elevated arrears rate",
      reason: "More than 20% of units in this building carry outstanding balances.",
      suggestedAction: "Review all delinquent tenants in this building as a group.",
      ownerVisible: true,
      entityType: "building",
      entityId: v.buildingId,
      metadata: { buildingArrearsRatio: v.buildingArrearsRatio, totalUnitsInBuilding: v.totalUnitsInBuilding },
    });
  }

  return suggestions;
}
