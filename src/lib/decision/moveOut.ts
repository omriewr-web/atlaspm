import { DecisionSuggestion } from "./types";

export interface ChargeRule {
  code: string;
  label: string;
  defaultAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  pricingType: "fixed" | "range" | "variable";
}

export const MOVE_OUT_CHARGE_RULES: ChargeRule[] = [
  // Keys & locks
  { code: "LOCK_REPLACEMENT", label: "Failure to turn in keys / new locks", defaultAmount: 150, pricingType: "fixed" },
  { code: "MAILBOX_LOCK", label: "Failure to turn in mailbox keys", defaultAmount: 25, pricingType: "fixed" },
  { code: "KEY_DUPLICATE", label: "Insufficient number of keys returned", defaultAmount: 15, pricingType: "fixed" },

  // Kitchen appliances
  { code: "GARBAGE_DISPOSAL", label: "Garbage disposal replacement", defaultAmount: 150, pricingType: "fixed" },
  { code: "DISHWASHER_PANEL", label: "Dishwasher panel damage", minAmount: 100, maxAmount: 200, pricingType: "range" },
  { code: "REFRIGERATOR_SHELF", label: "Refrigerator shelf damage", defaultAmount: 100, pricingType: "fixed" },
  { code: "REFRIGERATOR_DRAWERS", label: "Missing refrigerator drawers", minAmount: 50, maxAmount: 150, pricingType: "range" },
  { code: "REFRIGERATOR_DOOR", label: "Damaged refrigerator door", minAmount: 10, maxAmount: 400, pricingType: "range" },
  { code: "MISSING_ICE_TRAYS", label: "Missing ice trays", defaultAmount: 10, pricingType: "fixed" },
  { code: "DENTED_OVEN_DOOR", label: "Dented oven door", minAmount: 175, maxAmount: 400, pricingType: "range" },
  { code: "DIRTY_STOVE_OVEN", label: "Dirty stove / oven", minAmount: 15, maxAmount: 50, pricingType: "range" },
  { code: "DIRTY_REFRIGERATOR", label: "Dirty refrigerator / freezer", minAmount: 15, maxAmount: 50, pricingType: "range" },
  { code: "DIRTY_RANGE_HOOD", label: "Dirty range hood / filter", defaultAmount: 25, pricingType: "fixed" },
  { code: "MISSING_DISPOSAL_STOPPER", label: "Missing disposal stopper", defaultAmount: 10, pricingType: "fixed" },
  { code: "GREASE_CABINETS", label: "Grease or dirt on cabinets", minAmount: 15, maxAmount: 100, pricingType: "range" },

  // Kitchen surfaces & floors
  { code: "KITCHEN_COUNTER_DAMAGE", label: "Kitchen counter damage", minAmount: 100, maxAmount: 700, pricingType: "range" },
  { code: "KITCHEN_FLOOR_DAMAGE", label: "Kitchen floor damage", minAmount: 50, maxAmount: 600, pricingType: "range" },
  { code: "DIRTY_KITCHEN_FLOOR", label: "Dirty kitchen floor", minAmount: 25, maxAmount: 50, pricingType: "range" },
  { code: "CONTACT_PAPER_REMOVAL", label: "Contact paper removal (per shelf)", defaultAmount: 25, pricingType: "fixed" },

  // Bathroom
  { code: "DIRTY_BATHROOM", label: "Dirty bathroom", minAmount: 25, maxAmount: 75, pricingType: "range" },
  { code: "TUB_DAMAGE_CLEANING", label: "Tub damage or cleaning", minAmount: 30, maxAmount: 300, pricingType: "range" },
  { code: "TILE_CLEANING", label: "Tile cleaning", minAmount: 30, maxAmount: 75, pricingType: "range" },
  { code: "VANITY_DAMAGE", label: "Vanity damage", minAmount: 100, maxAmount: 700, pricingType: "range" },

  // Doors, walls, and fixtures
  { code: "INTERIOR_DOOR_DAMAGE", label: "Interior door damage", minAmount: 50, maxAmount: 200, pricingType: "range" },
  { code: "MISSING_DOOR_KNOBS", label: "Missing door knobs", defaultAmount: 75, pricingType: "fixed" },
  { code: "MISSING_LIGHT_LENS", label: "Missing light lens", minAmount: 25, maxAmount: 50, pricingType: "range" },
  { code: "CEILING_FAN_REPLACEMENT", label: "Ceiling fan replacement", defaultAmount: 250, pricingType: "fixed" },
  { code: "LIGHT_FIXTURE_REPLACEMENT", label: "Light fixture replacement", minAmount: 50, maxAmount: 200, pricingType: "range" },
  { code: "EXCESSIVE_NAIL_HOLES", label: "Excessive nail holes", minAmount: 5, maxAmount: 40, pricingType: "range" },
  { code: "LARGE_WALL_HOLES", label: "Large wall holes", pricingType: "variable" },
  { code: "STAIN_SEALING", label: "Stain sealing due to negligence", pricingType: "variable" },

  // Flooring and windows
  { code: "CARPET_DAMAGE", label: "Carpet damage", pricingType: "variable" },
  { code: "FLOORING_DAMAGE", label: "Flooring damage", pricingType: "variable" },
  { code: "MISSING_BLINDS", label: "Missing blinds", minAmount: 40, maxAmount: 300, pricingType: "range" },
  { code: "BROKEN_WINDOWS", label: "Broken windows", pricingType: "variable" },

  // Paint and walls
  { code: "WALLPAPER_REMOVAL", label: "Wallpaper removal", pricingType: "variable" },
  { code: "UNAUTHORIZED_PAINT", label: "Unauthorized paint colors", pricingType: "variable" },

  // General cleanup
  { code: "TRASH_REMOVAL", label: "Trash removal (per room)", defaultAmount: 50, pricingType: "fixed" },
  { code: "FURNITURE_REMOVAL", label: "Furniture removal (per piece)", defaultAmount: 50, pricingType: "fixed" },
];

export const LABOR_RATE_PER_HOUR = 28;

export interface MoveOutChargeInput {
  code: string;
  quantity?: number;
  amount?: number;
}

export function calculateMoveOutChargeTotal(items: MoveOutChargeInput[]): number {
  return items.reduce((sum, item) => {
    const rule = MOVE_OUT_CHARGE_RULES.find((r) => r.code === item.code);
    if (!rule) return sum;

    const quantity = item.quantity ?? 1;
    const amount =
      item.amount ??
      rule.defaultAmount ??
      rule.minAmount ??
      0;

    return sum + amount * quantity;
  }, 0);
}

export function buildMoveOutDraftEmail(
  tenantName: string,
  unitAddress: string,
  charges: MoveOutChargeInput[],
  securityDeposit: number,
): string {
  const lines: string[] = [];

  lines.push(`Subject: Move-Out Statement — ${unitAddress}`);
  lines.push("");
  lines.push(`Dear ${tenantName},`);
  lines.push("");
  lines.push(
    "Thank you for your tenancy. Following the move-out inspection of your unit, " +
    "the following charges have been assessed:"
  );
  lines.push("");

  let total = 0;
  for (const charge of charges) {
    const rule = MOVE_OUT_CHARGE_RULES.find((r) => r.code === charge.code);
    const label = rule?.label ?? charge.code;
    const qty = charge.quantity ?? 1;
    const unitAmt = charge.amount ?? rule?.defaultAmount ?? rule?.minAmount ?? 0;
    const lineTotal = unitAmt * qty;
    total += lineTotal;

    if (qty > 1) {
      lines.push(`  - ${label} (x${qty}): $${lineTotal.toFixed(2)}`);
    } else {
      lines.push(`  - ${label}: $${lineTotal.toFixed(2)}`);
    }
  }

  lines.push("");
  lines.push(`Total charges: $${total.toFixed(2)}`);
  lines.push(`Security deposit on file: $${securityDeposit.toFixed(2)}`);
  lines.push("");

  if (total <= securityDeposit) {
    const returnAmount = securityDeposit - total;
    lines.push(
      `Based on these charges, we recommend returning $${returnAmount.toFixed(2)} ` +
      "of your security deposit."
    );
  } else {
    lines.push(
      "[PM TO COMPLETE: balance owed or payment plan]"
    );
  }

  lines.push("");
  lines.push(
    "Please note that this statement will be reviewed by the property manager " +
    "before being finalized and sent."
  );
  lines.push("");
  lines.push("Sincerely,");
  lines.push("[Property Manager Name]");
  lines.push("[Management Company]");

  return lines.join("\n");
}

export interface MoveOutAssessmentInput {
  tenantId: string;
  unitId: string;
  moveOutDate: Date;
  assessmentCompletedAt?: Date | null;
}

export function evaluateMoveOut(m: MoveOutAssessmentInput): DecisionSuggestion[] {
  const suggestions: DecisionSuggestion[] = [];

  if (!m.assessmentCompletedAt) {
    const now = new Date();
    const moveOut = new Date(m.moveOutDate);
    const sameDay =
      now.getFullYear() === moveOut.getFullYear() &&
      now.getMonth() === moveOut.getMonth() &&
      now.getDate() === moveOut.getDate();

    if (sameDay) {
      suggestions.push({
        module: "move_out",
        severity: "high",
        code: "MOVEOUT_ASSESSMENT_REQUIRED",
        title: "Move-out assessment required today",
        reason: "Tenant is moving out today and no assessment has been completed.",
        suggestedAction: "Complete move-out inspection and damage assessment today.",
        ownerVisible: false,
        entityType: "unit",
        entityId: m.unitId,
      });
    }
  }

  return suggestions;
}
