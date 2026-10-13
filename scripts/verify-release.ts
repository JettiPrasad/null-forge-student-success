import assert from "node:assert/strict";
import { loadBhavanaStudents } from "../src/lib/bhavana-data";
import { assessPlacementActivity } from "../src/lib/placement-activity";
import { analyzeStudent } from "../src/lib/scoring";
import type { Student } from "../src/lib/types";

type Placement = NonNullable<NonNullable<Student["sourceDetails"]>["placement"]>;

interface FixtureOptions {
  cgpa?: number;
  marks?: number;
  attendancePct?: number;
  placement?: Partial<Placement>;
  includeSourceDetails?: boolean;
  allMetricsMissing?: boolean;
}

function fixture(options: FixtureOptions = {}): Student {
  const missing = options.allMetricsMissing ?? false;

  return {
    id: "TEST-001",
    fullName: "Synthetic Test Student",
    department: "Test Department",
    yearOfStudy: 2,
    semester: 4,

    academic: {
      cgpa: missing ? null : options.cgpa ?? 7,
      averageMarks: missing ? null : options.marks ?? 70,
      backlogs: missing ? null : 0,
    },

    attendance: {
      overallPercentage: missing ? null : options.attendancePct ?? 80,
      subjectWise: [],
    },

    lms: {
      loginsLast7Days: null,
      assignmentsCompleted: missing ? null : 8,
      assignmentsTotal: missing ? null : 10,
    },

    engagement: {
      eventsAttended: missing ? null : 2,
      clubMember: missing ? null : true,
      hackathons: null,
      certifications: missing ? null : 1,
    },

    placement: {
      aptitudeScore: null,
      codingScore: null,
      mockInterviewScore: null,
    },

    skills: {
      technicalScore: null,
      softSkillScore: null,
    },

    feedback: {
      studentSatisfaction: null,
      facultyFeedbackScore: null,
    },

    sourceDetails: options.includeSourceDetails === false ? undefined : {
      placement: {
        interest: missing ? null : "Yes",
        internshipStatus: missing ? null : "Not applied",
        trainingHours: missing ? null : 0,
        applicationsCount: missing ? null : 0,
        offersCount: missing ? null : 0,
        status: missing ? null : "Not started",
        ...options.placement,
      },
    },
  };
}

function testPlacement(
  name: string,
  expected: string,
  student: Student,
): void {
  const result = assessPlacementActivity(student);
  assert.equal(result.status, expected, name);
  assert.ok(result.title.length > 0, `${name}: title required`);
  assert.ok(result.rationale.length > 0, `${name}: rationale required`);
  assert.ok(result.suggestedAction.length > 0, `${name}: suggested action required`);
  assert.ok(result.segment.length > 0, `${name}: segment required`);
  console.log(`PASS placement: ${name}`);
}

async function main() {
  console.log("=== PLACEMENT ACTIVITY TESTS ===");

  testPlacement("Interested, no activity started", "review", fixture());

  testPlacement(
    "Recorded offer",
    "recorded",
    fixture({ placement: { offersCount: 1 } }),
  );

  testPlacement(
    "Placed status",
    "recorded",
    fixture({ placement: { status: "Placed" } }),
  );

  testPlacement(
    "Student not interested",
    "confirm-interest",
    fixture({ placement: { interest: "No" } }),
  );

  testPlacement(
    "Interest undecided",
    "confirm-interest",
    fixture({ placement: { interest: "Undecided" } }),
  );

  testPlacement(
    "Applications in progress",
    "in-progress",
    fixture({ placement: { applicationsCount: 1 } }),
  );

  testPlacement(
    "Training underway",
    "in-progress",
    fixture({ placement: { trainingHours: 2 } }),
  );

  testPlacement(
    "No placement source",
    "unavailable",
    fixture({ includeSourceDetails: false }),
  );

  testPlacement(
    "Placement fields missing",
    "unavailable",
    fixture({
      allMetricsMissing: true,
      placement: {
        interest: null,
        internshipStatus: null,
        trainingHours: null,
        applicationsCount: null,
        offersCount: null,
        status: null,
      },
    }),
  );

  console.log("\n=== SCORE THRESHOLD TESTS ===");

  const cgpaRisk = analyzeStudent(fixture({ cgpa: 5.49 }));
  assert.ok(cgpaRisk.riskFlags.some((flag) => flag.id === "academic-risk"));
  assert.ok(
    cgpaRisk.riskFlags.find((flag) => flag.id === "academic-risk")?.severity === "medium",
    "CGPA 5.49 should trigger medium academic severity",
  );
  console.log("PASS CGPA below 5.5 triggers academic support");

  const exactBoundary = analyzeStudent(
    fixture({ cgpa: 5.5, marks: 50, attendancePct: 75 }),
  );

  assert.ok(!exactBoundary.riskFlags.some((flag) => flag.id === "academic-risk"));
  assert.ok(!exactBoundary.riskFlags.some((flag) => flag.id === "attendance-risk"));
  console.log("PASS exact CGPA/marks/attendance thresholds are not flagged");

  const highCgpaRisk = analyzeStudent(fixture({ cgpa: 4.9 }));
  assert.equal(
    highCgpaRisk.riskFlags.find((flag) => flag.id === "academic-risk")?.severity,
    "high",
  );
  console.log("PASS CGPA below 5.0 triggers high academic severity");

  const emptyMetrics = analyzeStudent(fixture({ allMetricsMissing: true }));
  assert.equal(emptyMetrics.score, null);
  assert.equal(emptyMetrics.riskLevel, "Insufficient data");
  assert.equal(emptyMetrics.dataCoverage, 0);
  console.log("PASS all missing metrics never produce a zero-filled score");

  console.log("\n=== REAL DATASET INTEGRATION TESTS ===");

  const students = await loadBhavanaStudents();

  assert.equal(students.length, 15, "Expected 15 audited student records");
  assert.equal(new Set(students.map((student) => student.id)).size, 15);

  for (const student of students) {
    assert.ok(student.sourceDetails, `${student.id}: source details missing`);
    assert.ok(student.sourceDetails.placement, `${student.id}: placement details missing`);
    assert.equal(student.lms.loginsLast7Days, null);
    assert.equal(student.placement.aptitudeScore, null);
    assert.equal(student.placement.codingScore, null);
    assert.equal(student.placement.mockInterviewScore, null);
    assert.equal(student.skills.technicalScore, null);
    assert.equal(student.skills.softSkillScore, null);

    const activity = assessPlacementActivity(student);
    assert.ok(activity.title && activity.rationale && activity.suggestedAction);
  }

  assert.ok(
    students.some((student) => assessPlacementActivity(student).status === "review"),
    "Expected at least one genuine source record requiring placement activity review",
  );

  console.log("PASS 15 unique audited records");
  console.log("PASS source details present for every record");
  console.log("PASS unknown login period remains unscored");
  console.log("PASS unavailable placement/skill scores remain null");
  console.log("PASS actual placement alerts have explainable actions");
  console.log("\nALL RELEASE TESTS PASSED");
}

main().catch((error: unknown) => {
  console.error("RELEASE TESTS FAILED", error);
  process.exitCode = 1;
});
