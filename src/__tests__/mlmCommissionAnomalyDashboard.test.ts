import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const mlmDashboard = readFileSync(
  join(process.cwd(), "src/components/admin/MLMDashboard.tsx"),
  "utf8"
);

describe("MLM commission anomaly dashboard", () => {
  it("loads admin MLM commission anomalies from the hardened SQL view", () => {
    expect(mlmDashboard).toContain("admin_mlm_commission_anomalies");
    expect(mlmDashboard).toContain("admin-mlm-commission-anomalies");
    expect(mlmDashboard).toContain("MlmCommissionAnomaly");
  });

  it("surfaces unrecovered commission risk in the MLM admin UI", () => {
    expect(mlmDashboard).toContain("anomalie(s) MLM a controler");
    expect(mlmDashboard).toContain("Montant non recupere estime");
    expect(mlmDashboard).toContain("unrecoveredCommissionAmount");
    expect(mlmDashboard).toContain("anomaly_codes");
  });
});
