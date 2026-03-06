import { DecisionSuggestion } from "./types";

export interface WorkOrderRoutingInput {
  workOrderId: string;
  estimatedHours?: number | null;
  requiresSpecialSkill?: boolean;
  assignedUserId?: string | null;
  assignedVendorId?: string | null;
  openedAt: Date;
  lastUpdatedAt: Date;
  status: string;
  isViolationRelated?: boolean;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function evaluateWorkOrderRouting(w: WorkOrderRoutingInput): DecisionSuggestion[] {
  const suggestions: DecisionSuggestion[] = [];

  // Super candidate: short task, no special skill, unassigned
  if ((w.estimatedHours ?? 0) <= 3 && !w.requiresSpecialSkill && !w.assignedUserId && !w.assignedVendorId) {
    suggestions.push({
      module: "work_orders",
      severity: "medium",
      code: "WORKORDER_SUPER_CANDIDATE",
      title: "Likely superintendent-level task",
      reason: "Repair appears short and does not require special skill.",
      suggestedAction: "Consider assigning to super before outsourcing.",
      ownerVisible: false,
      entityType: "work_order",
      entityId: w.workOrderId,
    });
  }

  // Vendor recommended: longer or specialized work without vendor
  if (((w.estimatedHours ?? 0) > 3 || w.requiresSpecialSkill) && !w.assignedVendorId) {
    suggestions.push({
      module: "work_orders",
      severity: "medium",
      code: "WORKORDER_VENDOR_RECOMMENDED",
      title: "Vendor likely needed",
      reason: "Scope appears longer or more specialized than a quick super repair.",
      suggestedAction: "Assign contractor/vendor or confirm internal capability.",
      ownerVisible: false,
      entityType: "work_order",
      entityId: w.workOrderId,
    });
  }

  // Unassigned for 24+ hours
  if (
    w.status === "open" &&
    !w.assignedUserId &&
    !w.assignedVendorId &&
    Date.now() - w.openedAt.getTime() > ONE_DAY_MS
  ) {
    suggestions.push({
      module: "work_orders",
      severity: "high",
      code: "WORKORDER_UNASSIGNED_TOO_LONG",
      title: "Work order unassigned for 24+ hours",
      reason: "Work order has been open without assignment for over a day.",
      suggestedAction: "Assign to super or vendor immediately.",
      ownerVisible: false,
      entityType: "work_order",
      entityId: w.workOrderId,
    });
  }

  // Stalled: in progress but no update in 24 hours
  if (
    w.status === "in_progress" &&
    Date.now() - w.lastUpdatedAt.getTime() > ONE_DAY_MS
  ) {
    suggestions.push({
      module: "work_orders",
      severity: "high",
      code: "WORKORDER_STALLED",
      title: "Work order stalled — no update in 24 hours",
      reason: "Work order is in progress but has not been updated recently.",
      suggestedAction: "Check status with assignee and update work order.",
      ownerVisible: false,
      entityType: "work_order",
      entityId: w.workOrderId,
    });
  }

  // Violation-related and unassigned
  if (w.isViolationRelated && !w.assignedUserId && !w.assignedVendorId) {
    suggestions.push({
      module: "work_orders",
      severity: "high",
      code: "WORKORDER_VIOLATION_UNASSIGNED",
      title: "Violation-related work order has no vendor",
      reason: "Violation remediation requires prompt assignment to avoid deadline breach.",
      suggestedAction: "Assign vendor immediately to begin violation remediation.",
      ownerVisible: false,
      entityType: "work_order",
      entityId: w.workOrderId,
    });
  }

  return suggestions;
}
