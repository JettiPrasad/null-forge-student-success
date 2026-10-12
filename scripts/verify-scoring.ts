import assert from "node:assert/strict";
import { mockStudents } from "../src/lib/mock-students";
import { analyzeStudent } from "../src/lib/scoring";

const byId = (id: string) => {
  const student = mockStudents.find((item) => item.id === id);

  assert.ok(student, `Missing test student: ${id}`);
  return student;
};

// The dataset itself must be consistent.
assert.equal(mockStudents.length, 7);
assert.equal(
  new Set(mockStudents.map((student) => student.id)).size,
  mockStudents.length,
  "Student IDs must be unique",
);

// 1. A complete, healthy student has a score.
const healthy = analyzeStudent(byId("S001"));

assert.notEqual(healthy.score, null);
assert.equal(healthy.dataCoverage, 100);
assert.equal(healthy.riskFlags.length, 0);

// 2. Academic problems must create an explainable risk flag.
const academicRisk = analyzeStudent(byId("S002"));

assert.ok(academicRisk.riskFlags.some((flag) => flag.id === "academic-risk"));
assert.equal(academicRisk.riskLevel, "High");

// 3. Low attendance must trigger an attendance flag.
const attendanceRisk = analyzeStudent(byId("S004"));

assert.ok(
  attendanceRisk.riskFlags.some((flag) => flag.id === "attendance-risk"),
);

// 4. Strong academics + weak placement must form a segment.
const placementRisk = analyzeStudent(byId("S003"));

assert.ok(
  placementRisk.segments.includes("Strong academics, low placement readiness"),
);
assert.ok(placementRisk.riskFlags.some((flag) => flag.id === "placement-risk"));

// 5. Missing data must not be treated as a score of zero.
const missingData = analyzeStudent(byId("S006"));

assert.equal(missingData.score, null);
assert.equal(missingData.dataCoverage, 0);
assert.equal(missingData.riskLevel, "Insufficient data");

// Print a compact diagnostic summary.
for (const student of mockStudents) {
  const result = analyzeStudent(student);

  console.log({
    id: student.id,
    name: student.fullName,
    score: result.score,
    coverage: result.dataCoverage,
    riskLevel: result.riskLevel,
    flags: result.riskFlags.map((flag) => flag.id),
    segments: result.segments,
  });
}

console.log("\nPASS: All scoring verification checks passed.");
