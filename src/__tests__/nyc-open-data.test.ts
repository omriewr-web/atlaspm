/**
 * Regression tests for violation mapper (nyc-open-data.ts).
 *
 * Covers fix 4: existing HPD violations update all mutable source fields.
 */
import { describe, it, expect } from "vitest";
import { mapHpdViolation } from "@/lib/nyc-open-data";

describe("mapHpdViolation", () => {
  const sampleRow = {
    violationid: "12345",
    class: "C",
    novdescription: "Peeling paint in bedroom",
    violationstatus: "Open",
    currentstatus: "Open",
    penalityamount: "500.00",
    currentstatusdate: "2024-06-15T00:00:00",
    certifieddate: "2024-07-01T00:00:00",
    approveddate: "2024-07-15T00:00:00",
    apartment: "4A",
    inspectiondate: "2024-05-01T00:00:00",
    novissueddate: "2024-05-02T00:00:00",
  };

  it("create block includes all expected fields", () => {
    const { create } = mapHpdViolation(sampleRow, "bld-1");
    expect(create.buildingId).toBe("bld-1");
    expect(create.source).toBe("HPD");
    expect(create.externalId).toBe("12345");
    expect(create.class).toBe("C");
    expect(create.severity).toBe("IMMEDIATELY_HAZARDOUS");
    expect(create.description).toBe("Peeling paint in bedroom");
    expect(create.unitNumber).toBe("4A");
    expect(create.penaltyAmount).toBe(500);
    expect(create.novDescription).toBe("Peeling paint in bedroom");
  });

  it("update block includes all mutable source fields", () => {
    const { update } = mapHpdViolation(sampleRow, "bld-1");

    // These fields must ALL be present in the update block
    expect(update).toHaveProperty("class");
    expect(update).toHaveProperty("severity");
    expect(update).toHaveProperty("description");
    expect(update).toHaveProperty("unitNumber");
    expect(update).toHaveProperty("respondByDate");
    expect(update).toHaveProperty("currentStatus");
    expect(update).toHaveProperty("penaltyAmount");
    expect(update).toHaveProperty("certifiedDismissDate");
    expect(update).toHaveProperty("correctionDate");
  });

  it("update block values match create block values for same row", () => {
    const { create, update } = mapHpdViolation(sampleRow, "bld-1");

    expect(update.class).toBe(create.class);
    expect(update.severity).toBe(create.severity);
    expect(update.description).toBe(create.description);
    expect(update.unitNumber).toBe(create.unitNumber);
    expect(update.currentStatus).toBe(create.currentStatus);
    expect(update.penaltyAmount).toBe(create.penaltyAmount);
    expect(update.respondByDate).toEqual(create.respondByDate);
    expect(update.certifiedDismissDate).toEqual(create.certifiedDismissDate);
    expect(update.correctionDate).toEqual(create.correctionDate);
  });

  it("update does NOT include immutable identifiers", () => {
    const { update } = mapHpdViolation(sampleRow, "bld-1");
    expect(update).not.toHaveProperty("buildingId");
    expect(update).not.toHaveProperty("source");
    expect(update).not.toHaveProperty("externalId");
    expect(update).not.toHaveProperty("inspectionDate");
    expect(update).not.toHaveProperty("issuedDate");
  });

  it("where clause uses composite source_externalId", () => {
    const { where } = mapHpdViolation(sampleRow, "bld-1");
    expect(where).toEqual({
      source_externalId: { source: "HPD", externalId: "12345" },
    });
  });

  it("class B maps to HAZARDOUS severity", () => {
    const { create } = mapHpdViolation({ ...sampleRow, class: "B" }, "bld-1");
    expect(create.class).toBe("B");
    expect(create.severity).toBe("HAZARDOUS");
  });

  it("class A maps to NON_HAZARDOUS severity", () => {
    const { create } = mapHpdViolation({ ...sampleRow, class: "A" }, "bld-1");
    expect(create.class).toBe("A");
    expect(create.severity).toBe("NON_HAZARDOUS");
  });

  it("handles missing optional fields gracefully", () => {
    const minimalRow = { violationid: "99999" };
    const { create, update } = mapHpdViolation(minimalRow, "bld-1");

    expect(create.externalId).toBe("99999");
    expect(create.class).toBeNull();
    expect(create.severity).toBeNull();
    expect(create.unitNumber).toBeNull();
    expect(create.penaltyAmount).toBe(0);
    expect(update.class).toBeNull();
    expect(update.severity).toBeNull();
  });
});
