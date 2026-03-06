export type DecisionSeverity = "low" | "medium" | "high" | "critical";

export type DecisionModule =
  | "vacancy"
  | "collections"
  | "legal"
  | "violations"
  | "work_orders"
  | "inspections"
  | "move_out"
  | "leases"
  | "owner_summary";

export interface DecisionSuggestion {
  module: DecisionModule;
  severity: DecisionSeverity;
  code: string;
  title: string;
  reason: string;
  suggestedAction: string;
  ownerVisible: boolean;
  entityType?: "building" | "unit" | "tenant" | "work_order" | "violation" | "inspection";
  entityId?: string;
  metadata?: Record<string, unknown>;
  buildingName?: string;
  unitNumber?: string;
  buildingSize?: "small" | "large";
}
