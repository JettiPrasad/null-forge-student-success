import type { Student } from "@/lib/types";

export interface ReadinessFactor {
  key: string;
  label: string;
  weight: number;
  score: number | null;
  explanation: string;
}

export interface PlacementReadinessProxy {
  eligible: boolean;
  score: number | null;
  coverage: number;
  factors: ReadinessFactor[];
  caveat: string;
}

const levelScore = (
  value: string | null | undefined,
  mapping: Record<string, number>,
): number | null => {
  if (!value) return null;
  return mapping[value.trim().toLowerCase()] ?? null;
};

const boundedScale = (
  value: number | null | undefined,
  maximum: number,
): number | null =>
  value === null || value === undefined || !Number.isFinite(value)
    ? null
    : Math.round((Math.max(0, Math.min(maximum, value)) / maximum) * 100);

export function assessPlacementReadinessProxy(
  student: Student,
): PlacementReadinessProxy {
  const caveat =
    "Heuristic readiness indicator for student support, not a validated prediction, hiring probability, or substitute for an assessment.";

  if (student.yearOfStudy < 3 || student.yearOfStudy > 4) {
    return {
      eligible: false,
      score: null,
      coverage: 0,
      factors: [],
      caveat: "The prototype proxy is limited to Years 3–4.",
    };
  }

  const details = student.sourceDetails;
  const placement = details?.placement;
  const skills = details?.skills;
  const projects = details?.engagement?.projectsCompleted;
  const certifications = student.engagement.certifications;

  const factors: ReadinessFactor[] = [
    {
      key: "cgpa",
      label: "CGPA",
      weight: 20,
      score:
        student.academic.cgpa === null
          ? null
          : Math.max(0, Math.min(10, student.academic.cgpa)) * 10,
      explanation: "CGPA normalized to a 0–100 scale.",
    },
    {
      key: "backlogs",
      label: "Backlog indicator",
      weight: 10,
      score:
        student.academic.backlogs === null
          ? null
          : Math.max(0, 100 - Math.min(5, student.academic.backlogs) * 20),
      explanation: "Fewer recorded backlogs yield a higher indicator score.",
    },
    {
      key: "training",
      label: "Placement training",
      weight: 15,
      score: boundedScale(placement?.trainingHours, 120),
      explanation: "Training hours scale up to 120 hours; higher values cap at 100.",
    },
    {
      key: "applications",
      label: "Applications",
      weight: 10,
      score: boundedScale(placement?.applicationsCount, 10),
      explanation: "Application activity scales up to 10 applications.",
    },
    {
      key: "internship",
      label: "Internship activity",
      weight: 10,
      score: levelScore(placement?.internshipStatus, {
        "not applied": 0,
        applied: 40,
        ongoing: 70,
        completed: 100,
      }),
      explanation: "Derived ordinal mapping: Not applied 0, Applied 40, Ongoing 70, Completed 100.",
    },
    {
      key: "certifications",
      label: "Certifications",
      weight: 10,
      score: boundedScale(certifications, 5),
      explanation: "Certification count scales up to five certifications.",
    },
    {
      key: "projects",
      label: "Projects completed",
      weight: 10,
      score: boundedScale(projects, 5),
      explanation: "Project count scales up to five projects.",
    },
    {
      key: "python",
      label: "Python level",
      weight: 5,
      score: levelScore(skills?.pythonLevel, {
        beginner: 30,
        intermediate: 65,
        advanced: 100,
      }),
      explanation: "Derived ordinal mapping: Beginner 30, Intermediate 65, Advanced 100.",
    },
    {
      key: "sql",
      label: "SQL level",
      weight: 5,
      score: levelScore(skills?.sqlLevel, {
        beginner: 30,
        intermediate: 65,
        advanced: 100,
      }),
      explanation: "Derived ordinal mapping: Beginner 30, Intermediate 65, Advanced 100.",
    },
    {
      key: "communication",
      label: "Communication level",
      weight: 5,
      score: levelScore(skills?.communicationLevel, {
        low: 30,
        medium: 65,
        high: 100,
      }),
      explanation: "Derived ordinal mapping: Low 30, Medium 65, High 100.",
    },
  ];

  const known = factors.filter(
    (factor) => factor.score !== null && Number.isFinite(factor.score),
  );

  const availableWeight = known.reduce((sum, factor) => sum + factor.weight, 0);
  const weightedTotal = known.reduce(
    (sum, factor) => sum + factor.score! * factor.weight,
    0,
  );
  const score =
    availableWeight >= 50
      ? Math.round((weightedTotal / availableWeight) * 10) / 10
      : null;

  return {
    eligible: true,
    score,
    coverage: availableWeight,
    factors,
    caveat,
  };
}
