import { analyzeStudent } from "@/lib/scoring";
import type {
  OverallRiskLevel,
  Student,
  StudentSuccessAnalysis,
} from "@/lib/types";

export interface AnalyzedStudentRecord {
  student: Student;
  analysis: StudentSuccessAnalysis;
}

export interface DashboardSummary {
  totalStudents: number;
  scoredStudents: number;
  averageScore: number | null;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
  insufficientDataCount: number;
  academicRiskCount: number;
  attendanceRiskCount: number;
  placementRiskCount: number;
  riskCounts: Record<OverallRiskLevel, number>;
}

export interface DashboardOverviewProps {
  records: AnalyzedStudentRecord[];
  summary: DashboardSummary;
  onSelectStudent: (studentId: string) => void;
}

export interface StudentExplorerProps {
  records: AnalyzedStudentRecord[];
  onSelectStudent: (studentId: string) => void;
}

export interface StudentProfileProps {
  record: AnalyzedStudentRecord | null;
  onBack: () => void;
}

export function buildAnalyzedStudents(
  students: Student[],
): AnalyzedStudentRecord[] {
  return students.map((student) => ({
    student,
    analysis: analyzeStudent(student),
  }));
}

export function summarizeDashboard(
  records: AnalyzedStudentRecord[],
): DashboardSummary {
  const scores = records
    .map(({ analysis }) => analysis.score)
    .filter((score): score is number => score !== null);

  const averageScore =
    scores.length === 0
      ? null
      : Math.round(
          (scores.reduce((total, score) => total + score, 0) / scores.length) *
            10,
        ) / 10;

  const riskCounts: Record<OverallRiskLevel, number> = {
    High: 0,
    Moderate: 0,
    Low: 0,
    "Insufficient data": 0,
  };

  let academicRiskCount = 0;
  let attendanceRiskCount = 0;
  let placementRiskCount = 0;

  for (const { analysis } of records) {
    riskCounts[analysis.riskLevel] += 1;

    if (analysis.riskFlags.some((flag) => flag.id === "academic-risk")) {
      academicRiskCount += 1;
    }

    if (analysis.riskFlags.some((flag) => flag.id === "attendance-risk")) {
      attendanceRiskCount += 1;
    }

    if (analysis.riskFlags.some((flag) => flag.id === "placement-risk")) {
      placementRiskCount += 1;
    }
  }

  return {
    totalStudents: records.length,
    scoredStudents: scores.length,
    averageScore,
    highRiskCount: riskCounts.High,
    moderateRiskCount: riskCounts.Moderate,
    lowRiskCount: riskCounts.Low,
    insufficientDataCount: riskCounts["Insufficient data"],
    academicRiskCount,
    attendanceRiskCount,
    placementRiskCount,
    riskCounts,
  };
}
