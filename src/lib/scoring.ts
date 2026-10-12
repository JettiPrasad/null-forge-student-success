import type {
  DomainKey,
  DomainScores,
  RiskFlag,
  RiskSeverity,
  Student,
  StudentSuccessAnalysis,
} from "@/lib/types";

export const STUDENT_SCORE_WEIGHTS: Record<DomainKey, number> = {
  academic: 35,
  attendance: 20,
  lms: 15,
  placement: 15,
  skills: 10,
  engagement: 5,
};

const DOMAIN_LABELS: Record<DomainKey, string> = {
  academic: "Academic performance",
  attendance: "Attendance",
  lms: "LMS engagement",
  placement: "Placement readiness",
  skills: "Skills",
  engagement: "Engagement",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;

  return round1(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function availableValues(values: Array<number | null>): number[] {
  return values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
}

function percent(value: number | null): number | null {
  return value === null ? null : round1(clamp(value, 0, 100));
}

function scaledCount(value: number | null, maximum: number): number | null {
  if (value === null || !Number.isFinite(value)) return null;

  return round1((clamp(value, 0, maximum) / maximum) * 100);
}

function assignmentCompletion(student: Student): number | null {
  const { assignmentsCompleted, assignmentsTotal } = student.lms;

  if (
    assignmentsCompleted === null ||
    assignmentsTotal === null ||
    assignmentsTotal <= 0
  ) {
    return null;
  }

  return round1(
    (clamp(assignmentsCompleted, 0, assignmentsTotal) / assignmentsTotal) * 100,
  );
}

export function analyzeStudent(student: Student): StudentSuccessAnalysis {
  const metrics: Record<DomainKey, Array<number | null>> = {
    academic: [
      student.academic.cgpa === null
        ? null
        : clamp(student.academic.cgpa, 0, 10) * 10,
      percent(student.academic.averageMarks),
    ],

    attendance: [percent(student.attendance.overallPercentage)],

    lms: [
      scaledCount(student.lms.loginsLast7Days, 7),
      assignmentCompletion(student),
    ],

    placement: [
      percent(student.placement.aptitudeScore),
      percent(student.placement.codingScore),
      percent(student.placement.mockInterviewScore),
    ],

    skills: [
      percent(student.skills.technicalScore),
      percent(student.skills.softSkillScore),
    ],

    engagement: [
      scaledCount(student.engagement.eventsAttended, 5),
      student.engagement.clubMember === null
        ? null
        : student.engagement.clubMember
          ? 100
          : 0,
      scaledCount(student.engagement.hackathons, 3),
      scaledCount(student.engagement.certifications, 5),
    ],
  };

  const domainScores = {} as DomainScores;
  let weightedTotal = 0;
  let availableWeight = 0;

  for (const domain of Object.keys(metrics) as DomainKey[]) {
    const allMetrics = metrics[domain];
    const available = availableValues(allMetrics);
    const domainScore = average(available);

    domainScores[domain] = domainScore;

    if (domainScore !== null && allMetrics.length > 0) {
      // Partially missing domains contribute proportionally less.
      const effectiveWeight =
        STUDENT_SCORE_WEIGHTS[domain] * (available.length / allMetrics.length);

      weightedTotal += domainScore * effectiveWeight;
      availableWeight += effectiveWeight;
    }
  }

  // Coverage estimates how much of the weighted input data is present.
  const dataCoverage = round1(availableWeight);

  // Do not publish a composite score when less than half its inputs
  // are represented. Never silently treat missing values as zero.
  const score =
    availableWeight >= 50 ? round1(weightedTotal / availableWeight) : null;

  const riskFlags: RiskFlag[] = [];

  const academicReasons: string[] = [];
  const academicSeverities: RiskSeverity[] = [];

  const { cgpa, averageMarks, backlogs } = student.academic;

  if (cgpa !== null && cgpa < 5.5) {
    academicReasons.push(`CGPA is ${cgpa.toFixed(1)}, below 5.5`);
    academicSeverities.push(cgpa < 5.0 ? "high" : "medium");
  }

  if (averageMarks !== null && averageMarks < 50) {
    academicReasons.push(`Average marks are ${averageMarks}, below 50`);
    academicSeverities.push(averageMarks < 40 ? "high" : "medium");
  }

  if (backlogs !== null && backlogs > 0) {
    academicReasons.push(`${backlogs} backlog(s) recorded`);
    academicSeverities.push(backlogs >= 2 ? "high" : "medium");
  }

  if (academicReasons.length > 0) {
    riskFlags.push({
      id: "academic-risk",
      label: "Academic support",
      severity: academicSeverities.includes("high") ? "high" : "medium",
      reason: academicReasons.join("; "),
    });
  }

  const attendance = student.attendance.overallPercentage;

  if (attendance !== null && attendance < 75) {
    riskFlags.push({
      id: "attendance-risk",
      label: "Attendance support",
      severity: attendance < 65 ? "high" : "medium",
      reason: `Attendance is ${attendance}%, below the 75% prototype threshold`,
    });
  }

  const placementScore = domainScores.placement;

  if (placementScore !== null && placementScore < 55) {
    riskFlags.push({
      id: "placement-risk",
      label: "Placement readiness support",
      severity: placementScore < 40 ? "high" : "medium",
      reason: `Placement assessment average is ${placementScore}/100`,
    });
  }

  if (score !== null && score < 45) {
    riskFlags.push({
      id: "overall-score-risk",
      label: "Low overall success score",
      severity: "medium",
      reason: `Calculated success score is ${score}/100`,
    });
  }

  let riskLevel: StudentSuccessAnalysis["riskLevel"];

  if (riskFlags.some((flag) => flag.severity === "high")) {
    riskLevel = "High";
  } else if (riskFlags.length > 0) {
    riskLevel = "Moderate";
  } else if (score === null) {
    riskLevel = "Insufficient data";
  } else {
    riskLevel = "Low";
  }

  const segments: string[] = [];
  const academicScore = domainScores.academic;
  const attendanceScore = domainScores.attendance;
  const lmsScore = domainScores.lms;

  if (
    academicScore !== null &&
    academicScore >= 75 &&
    placementScore !== null &&
    placementScore < 50
  ) {
    segments.push("Strong academics, low placement readiness");
  }

  if (attendanceScore !== null && attendanceScore < 75) {
    segments.push("Attendance support needed");
  }

  if (lmsScore !== null && lmsScore < 50) {
    segments.push("Low LMS engagement");
  }

  if (score !== null && score >= 80) {
    segments.push("High overall success score");
  }

  const scoreDrivers: string[] = [];

  for (const domain of Object.keys(domainScores) as DomainKey[]) {
    const domainScore = domainScores[domain];

    if (domainScore === null) continue;

    if (domainScore < 55) {
      scoreDrivers.push(`${DOMAIN_LABELS[domain]} is low (${domainScore}/100)`);
    } else if (domainScore >= 80) {
      scoreDrivers.push(
        `${DOMAIN_LABELS[domain]} is a strength (${domainScore}/100)`,
      );
    }
  }

  if (scoreDrivers.length === 0) {
    scoreDrivers.push(
      "No unusually low or high domain score stands out in available data.",
    );
  }

  return {
    score,
    dataCoverage,
    domainScores,
    riskLevel,
    riskFlags,
    segments,
    scoreDrivers,
  };
}
