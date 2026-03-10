/**
 * Regression test for fix 6: importing auth.ts must NOT trigger bootstrap side effects.
 *
 * Verifies that the auth module is free of import-time database writes.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("auth module import safety", () => {
  it("auth.ts does not import bootstrap-admin", () => {
    const authSource = fs.readFileSync(
      path.resolve(__dirname, "../lib/auth.ts"),
      "utf-8"
    );
    expect(authSource).not.toMatch(/import.*bootstrap/i);
  });

  it("auth.ts does not call bootstrapAdmin at module level", () => {
    const authSource = fs.readFileSync(
      path.resolve(__dirname, "../lib/auth.ts"),
      "utf-8"
    );
    expect(authSource).not.toMatch(/bootstrapAdmin\s*\(/);
  });

  it("auth.ts has no top-level async calls (side effects)", () => {
    const authSource = fs.readFileSync(
      path.resolve(__dirname, "../lib/auth.ts"),
      "utf-8"
    );
    // Should not have any top-level promise/async invocation patterns
    // Lines outside of function bodies that call .then() or await
    const lines = authSource.split("\n");
    const topLevelAsyncCalls = lines.filter(
      (line) =>
        !line.trim().startsWith("//") &&
        !line.trim().startsWith("*") &&
        (line.match(/^const\s+\w+\s*=\s*\w+\(/) ||
          line.match(/^\w+\(.*\)\.catch/) ||
          line.match(/^\w+\(.*\)\.then/))
    );
    expect(topLevelAsyncCalls).toEqual([]);
  });

  it("bootstrap-admin.ts still exports bootstrapAdmin function", () => {
    const bootstrapSource = fs.readFileSync(
      path.resolve(__dirname, "../lib/bootstrap-admin.ts"),
      "utf-8"
    );
    expect(bootstrapSource).toMatch(/export\s+(async\s+)?function\s+bootstrapAdmin/);
  });

  it("bootstrap-admin.ts supports standalone execution", () => {
    const bootstrapSource = fs.readFileSync(
      path.resolve(__dirname, "../lib/bootstrap-admin.ts"),
      "utf-8"
    );
    expect(bootstrapSource).toMatch(/require\.main\s*===\s*module/);
  });
});
