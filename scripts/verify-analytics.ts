import assert from "node:assert/strict";
import { loadDemoStudents } from "../src/lib/bhavana-data";
import {
  buildCorrelationInsights,
  buildDataCompleteness,
  buildDepartmentSummaries,
  buildInterventionQueue,
  scoreDistributionByYear,
} from "../src/lib/dashboard-analytics";
import { assessPlacementReadinessProxy } from "../src/lib/placement-readiness";
import { buildAnalyzedStudents } from "../src/lib/view-model";
import type { Student } from "../src/lib/types";

async function main(): Promise<void> {
  const students = await loadDemoStudents();
  assert.equal(students.length, 100);

  const insights = buildCorrelationInsights(students);
  assert.equal(insights.length, 3);
  assert.ok(insights.every((item) => item.validPairs >= 0));
  assert.ok(insights.every((item) => item.correlation === null || Math.abs(item.correlation) <= 1));

  const completeness = buildDataCompleteness(students);
  assert.equal(completeness.length, 7);
  assert.ok(completeness.every((item) => item.completenessPct >= 0 && item.completenessPct <= 100));

  const records = buildAnalyzedStudents(students);
  const departments = buildDepartmentSummaries(records);
  assert.ok(departments.length > 0);
  assert.equal(departments.reduce((sum, item) => sum + item.studentCount, 0), 100);

  const years = scoreDistributionByYear(students);
  assert.equal(years.length, 4);
  assert.equal(years.reduce((sum, item) => sum + item.count, 0), 100);

  const queue = buildInterventionQueue(records);
  assert.ok(queue.length > 0);
  assert.deepEqual(
    queue.map((item) => item.priority),
    [...queue.map((item) => item.priority)].sort((a, b) => b - a),
    "Interventions must be sorted by descending priority",
  );
  assert.ok(queue.every((item) => item.reasons.length > 0 && item.owner.length > 0 && item.suggestedAction.length > 0));

  const eligible = students.find((student) => student.yearOfStudy >= 3)!;
  const proxy = assessPlacementReadinessProxy(eligible);
  assert.equal(proxy.eligible, true);
  assert.equal(proxy.score !== null, proxy.coverage >= 50);
  assert.ok(proxy.coverage >= 0 && proxy.coverage <= 100);

  const ineligible = students.find((student) => student.yearOfStudy < 3)!;
  const earlyProxy = assessPlacementReadinessProxy(ineligible);
  assert.equal(earlyProxy.eligible, false);
  assert.equal(earlyProxy.score, null);

  // Outcome-leakage test: changing offers/status must not change readiness proxy.
  const before = assessPlacementReadinessProxy(eligible);
  const altered: Student = {
    ...eligible,
    sourceDetails: {
      ...eligible.sourceDetails,
      placement: {
        interest: eligible.sourceDetails?.placement?.interest ?? null,
        internshipStatus: eligible.sourceDetails?.placement?.internshipStatus ?? null,
        trainingHours: eligible.sourceDetails?.placement?.trainingHours ?? null,
        applicationsCount: eligible.sourceDetails?.placement?.applicationsCount ?? null,
        offersCount: 999,
        status: "Placed",
      },
    },
  };
  const after = assessPlacementReadinessProxy(altered);
  assert.equal(after.score, before.score, "Outcome fields must not affect readiness proxy");
  assert.equal(after.coverage, before.coverage);

  console.log("PASS: 100-student analytics input");
  console.log("PASS: correlation output and valid-pair counts");
  console.log("PASS: data completeness and group aggregation");
  console.log("PASS: intervention queue ranking and actions");
  console.log("PASS: Years 3–4-only readiness eligibility");
  console.log("PASS: placement outcomes excluded from readiness proxy");
  console.log("\nALL ANALYTICS TESTS PASSED");
}

main().catch((error: unknown) => {
  console.error("ANALYTICS TESTS FAILED");
  console.error(error);
  process.exitCode = 1;
});
