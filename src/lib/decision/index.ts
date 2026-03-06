import { evaluateVacancy, VacancyInput } from "./vacancy";
import { evaluateCollections, CollectionsInput } from "./collections";
import { evaluateViolation, ViolationInput } from "./violations";
import { evaluateWorkOrderRouting, WorkOrderRoutingInput } from "./workOrders";
import { evaluateLeaseExpiration, LeaseExpirationInput } from "./leases";
import { DecisionSuggestion } from "./types";

export function runDecisionEngine(input: {
  vacancies?: VacancyInput[];
  collections?: CollectionsInput[];
  violations?: ViolationInput[];
  workOrders?: WorkOrderRoutingInput[];
  leases?: LeaseExpirationInput[];
}): DecisionSuggestion[] {
  return [
    ...(input.vacancies ?? []).flatMap(evaluateVacancy),
    ...(input.collections ?? []).flatMap(evaluateCollections),
    ...(input.violations ?? []).flatMap(evaluateViolation),
    ...(input.workOrders ?? []).flatMap(evaluateWorkOrderRouting),
    ...(input.leases ?? []).flatMap(evaluateLeaseExpiration),
  ];
}

export * from "./types";
export * from "./vacancy";
export * from "./collections";
export * from "./violations";
export * from "./workOrders";
export * from "./moveOut";
export * from "./leases";
export * from "./ownerSummary";
