import { analyzeStudent } from "@/lib/scoring";
import type { Student } from "@/lib/types";
import type { AnalyzedStudentRecord } from "@/lib/view-model";

export interface CorrelationInsight {
  id: string;
  title: string;
  xLabel: string;
  yLabel: string;
  validPairs: number;
  correlation: number | null;
  interpretation: string;
}

export interface CompletenessMetric {
  domain: string;
  populatedFields: number;
  possibleFields: number;
  completenessPct: number;
}

export interface DepartmentSummary {
  name: string;
  studentCount: number;
  scoredCount: number;
  averageScore: number | null;
  highRiskCount: number;
}

export interface Intervention {
  studentId: string;
  studentName: string;
  department: string;
  yearOfStudy: number;
  priority: number;
  severity: "High" | "Moderate" | "Watch";
  reasons: string[];
  suggestedAction: string;
  owner: string;
}

function pearson(
  pairs: Array<[number, number]>,
): number | null {
  if (pairs.length < 8) return null;

  const meanX = pairs.reduce((sum, pair) => sum + pair[0], 0) / pairs.length;
  const meanY = pairs.reduce((sum, pair) => sum + pair[1], 0) / pairs.length;

  const numerator = pairs.reduce(
    (sum, [x, y]) => sum + (x - meanX) * (y - meanY),
    0,
  );
  const denominatorX = Math.sqrt(
    pairs.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0),
  );
  const denominatorY = Math.sqrt(
    pairs.reduce((sum, [, y]) => sum + (y - meanY) ** 2, 0),
  );

  if (denominatorX === 0 || denominatorY === 0) return null;
  return Math.round((numerator / (denominatorX * denominatorY)) * 1000) / 1000;
}

function correlationDescription(value: number | null, n: number): string {
  if (n < 8) return "Insufficient valid pairs for a displayed correlation.";
  if (value === null) return "Correlation unavailable because one variable has no variation.";
  const size = Math.abs(value) < 0.2 ? "little linear" : Math.abs(value) < 0.5 ? "weak-to-moderate" : "stronger";
  const direction = value > 0.05 ? "positive" : value < -0.05 ? "negative" : "near-zero";
  return `${size} ${direction} association in this demo cohort. Descriptive only; not causal or statistically validated.`;
}

function validPairs(
  students: Student[],
  getX: (student: Student) => number | null,
  getY: (student: Student) => number | null,
): Array<[number, number]> {
  const result: Array<[number, number]> = [];

  for (const student of students) {
    const x = getX(student);
    const y = getY(student);
    if (
      x !== null &&
      y !== null &&
      Number.isFinite(x) &&
      Number.isFinite(y)
    ) {
      result.push([x, y]);
    }
  }
  return result;
}

export function buildCorrelationInsights(
  students: Student[],
): CorrelationInsight[] {
  const specifications = [
    {
      id: "attendance-cgpa",
      title: "Attendance and CGPA",
      xLabel: "Attendance (%)",
      yLabel: "CGPA",
      getX: (student: Student) => student.attendance.overallPercentage,
      getY: (student: Student) => student.academic.cgpa,
    },
    {
      id: "lms-exam",
      title: "LMS quiz results and exam marks",
      xLabel: "LMS quiz average (%)",
      yLabel: "Exam marks (%)",
      getX: (student: Student) => student.sourceDetails?.lms?.quizAveragePct ?? null,
      getY: (student: Student) => student.academic.averageMarks,
    },
    {
      id: "training-applications",
      title: "Training and application activity",
      xLabel: "Training hours",
      yLabel: "Applications",
      getX: (student: Student) => student.sourceDetails?.placement?.trainingHours ?? null,
      getY: (student: Student) => student.sourceDetails?.placement?.applicationsCount ?? null,
    },
  ];

  return specifications.map((specification) => {
    const pairs = validPairs(students, specification.getX, specification.getY);
    const correlation = pearson(pairs);

    return {
      id: specification.id,
      title: specification.title,
      xLabel: specification.xLabel,
      yLabel: specification.yLabel,
      validPairs: pairs.length,
      correlation,
      interpretation: correlationDescription(correlation, pairs.length),
    };
  });
}

function known(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

export interface ScatterPoint {
  id: string;
  xPct: number;
  yPct: number;
}

export function buildScatterPoints(
  students: Student[],
  insightId: string,
): ScatterPoint[] {
  const pairs: Array<{ id: string; x: number; y: number }> = [];

  for (const student of students) {
    let x: number | null = null;
    let y: number | null = null;

    if (insightId === "attendance-cgpa") {
      x = student.attendance.overallPercentage;
      y = student.academic.cgpa;
    } else if (insightId === "lms-exam") {
      x = student.sourceDetails?.lms?.quizAveragePct ?? null;
      y = student.academic.averageMarks;
    } else if (insightId === "training-applications") {
      x = student.sourceDetails?.placement?.trainingHours ?? null;
      y = student.sourceDetails?.placement?.applicationsCount ?? null;
    }

    if (x !== null && y !== null && Number.isFinite(x) && Number.isFinite(y)) {
      pairs.push({ id: student.id, x, y });
    }
  }

  const xs = pairs.map((point) => point.x);
  const ys = pairs.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return pairs.map((point) => ({
    id: point.id,
    xPct: 5 + ((point.x - minX) / (maxX - minX || 1)) * 90,
    yPct: 5 + ((point.y - minY) / (maxY - minY || 1)) * 90,
  }));
}
export function buildDataCompleteness(
  students: Student[],
): CompletenessMetric[] {
  const fields: Array<{ domain: string; get: (s: Student) => unknown[] }> = [
    {
      domain: "Academic",
      get: (s) => [
        s.academic.cgpa,
        s.academic.averageMarks,
        s.academic.backlogs,
        s.sourceDetails?.academic?.academicYear,
        s.sourceDetails?.academic?.sgpa,
      ],
    },
    {
      domain: "Attendance",
      get: (s) => [
        s.attendance.overallPercentage,
        s.sourceDetails?.attendance?.classesHeld,
        s.sourceDetails?.attendance?.classesAttended,
      ],
    },
    {
      domain: "LMS",
      get: (s) => [
        s.sourceDetails?.lms?.loginCount,
        s.sourceDetails?.lms?.timeSpentHours,
        s.lms.assignmentsCompleted,
        s.lms.assignmentsTotal,
        s.sourceDetails?.lms?.quizAveragePct,
      ],
    },
    {
      domain: "Engagement",
      get: (s) => [
        s.engagement.eventsAttended,
        s.engagement.clubMember,
        s.sourceDetails?.engagement?.projectsCompleted,
        s.sourceDetails?.engagement?.engagementLevel,
      ],
    },
    {
      domain: "Placement",
      get: (s) => [
        s.sourceDetails?.placement?.interest,
        s.sourceDetails?.placement?.internshipStatus,
        s.sourceDetails?.placement?.trainingHours,
        s.sourceDetails?.placement?.applicationsCount,
        s.sourceDetails?.placement?.offersCount,
        s.sourceDetails?.placement?.status,
      ],
    },
    {
      domain: "Skills",
      get: (s) => [
        s.sourceDetails?.skills?.primarySkill,
        s.sourceDetails?.skills?.pythonLevel,
        s.sourceDetails?.skills?.sqlLevel,
        s.sourceDetails?.skills?.communicationLevel,
        s.engagement.certifications,
      ],
    },
    {
      domain: "Feedback",
      get: (s) => [
        s.feedback.studentSatisfaction,
        s.feedback.facultyFeedbackScore,
        s.sourceDetails?.feedback?.learningSatisfaction,
        s.sourceDetails?.feedback?.comment,
      ],
    },
  ];

  return fields.map(({ domain, get }) => {
    const values = students.flatMap(get);
    const populatedFields = values.filter(known).length;
    const possibleFields = values.length;

    return {
      domain,
      populatedFields,
      possibleFields,
      completenessPct:
        possibleFields === 0
          ? 0
          : Math.round((populatedFields / possibleFields) * 1000) / 10,
    };
  });
}

export function buildDepartmentSummaries(
  records: AnalyzedStudentRecord[],
): DepartmentSummary[] {
  const groups = new Map<string, AnalyzedStudentRecord[]>();

  for (const record of records) {
    const bucket = groups.get(record.student.department) ?? [];
    bucket.push(record);
    groups.set(record.student.department, bucket);
  }

  return [...groups.entries()]
    .map(([name, rows]) => {
      const scores = rows
        .map(({ analysis }) => analysis.score)
        .filter((score): score is number => score !== null);

      return {
        name,
        studentCount: rows.length,
        scoredCount: scores.length,
        averageScore:
          scores.length === 0
            ? null
            : Math.round(
                (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10,
              ) / 10,
        highRiskCount: rows.filter(({ analysis }) => analysis.riskLevel === "High").length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function actionForFlag(id: string): { owner: string; action: string } {
  switch (id) {
    case "academic-risk":
      return {
        owner: "Academic mentor / HoD",
        action: "Review recent marks and backlogs; agree a subject-level support plan.",
      };
    case "attendance-risk":
      return {
        owner: "Class mentor",
        action: "Confirm attendance records and discuss barriers to attendance with the student.",
      };
    case "placement-risk":
      return {
        owner: "Placement cell",
        action: "Arrange an aptitude, coding, or mock-interview assessment; scores are currently required.",
      };
    default:
      return {
        owner: "Academic mentor",
        action: "Review the composite score and available contributing domains with the student.",
      };
  }
}

export function buildInterventionQueue(
  records: AnalyzedStudentRecord[],
): Intervention[] {
  const interventions: Intervention[] = [];

  for (const { student, analysis } of records) {
    const flags = analysis.riskFlags;
    const reasons = flags.map((flag) => flag.reason);
    let watch = false;

    if (flags.length === 0) {
      const near: string[] = [];
      const cgpa = student.academic.cgpa;
      const marks = student.academic.averageMarks;
      const attendance = student.attendance.overallPercentage;

      if (cgpa !== null && cgpa >= 5.5 && cgpa <= 6) {
        near.push(`CGPA ${cgpa.toFixed(1)} is near the 5.5 support threshold`);
      }
      if (marks !== null && marks >= 50 && marks <= 55) {
        near.push(`Exam marks ${marks}% are near the 50% support threshold`);
      }
      if (attendance !== null && attendance >= 75 && attendance <= 80) {
        near.push(`Attendance ${attendance}% is close to the 75% threshold`);
      }

      if (near.length > 0) {
        watch = true;
        reasons.push(...near);
      }
    }

    if (reasons.length === 0) continue;

    const firstFlag = flags[0];
    const recommendation = firstFlag
      ? actionForFlag(firstFlag.id)
      : {
          owner: "Class mentor",
          action: "Monitor the next attendance and assessment review; this is a threshold watch, not an active risk flag.",
        };

    const severity: Intervention["severity"] = flags.some((flag) => flag.severity === "high")
      ? "High"
      : flags.length > 0
        ? "Moderate"
        : "Watch";

    const priority =
      (severity === "High" ? 100 : severity === "Moderate" ? 60 : 30) +
      Math.min(20, Math.max(0, reasons.length - 1) * 5);

    interventions.push({
      studentId: student.id,
      studentName: student.fullName,
      department: student.department,
      yearOfStudy: student.yearOfStudy,
      priority,
      severity,
      reasons,
      suggestedAction: recommendation.action,
      owner: recommendation.owner,
    });

    if (!watch && firstFlag === undefined) {
      throw new Error("Invalid intervention state");
    }
  }

  return interventions.sort(
    (a, b) =>
      b.priority - a.priority ||
      a.studentId.localeCompare(b.studentId),
  );
}

export function describeInsightCoverage(students: Student[]): string {
  const pairs = buildCorrelationInsights(students).map((item) => item.validPairs);
  const adequate = pairs.filter((count) => count >= 8).length;
  return `${adequate} of ${pairs.length} cross-domain comparisons have at least 8 valid pairs.`;
}

export function scoreDistributionByYear(
  students: Student[],
): Array<{ year: number; count: number; scoredCount: number; averageScore: number | null }> {
  return [1, 2, 3, 4].map((year) => {
    const cohort = students.filter((student) => student.yearOfStudy === year);
    const scores = cohort
      .map((student) => analyzeStudent(student).score)
      .filter((score): score is number => score !== null);

    return {
      year,
      count: cohort.length,
      scoredCount: scores.length,
      averageScore:
        scores.length === 0
          ? null
          : Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10,
    };
  });
}
