export interface SubjectAttendance {
  subject: string;
  percentage: number | null;
}

export interface Student {
  id: string;
  fullName: string;
  department: string;
  yearOfStudy: number;
  semester: number;

  academic: {
    cgpa: number | null;
    averageMarks: number | null;
    backlogs: number | null;
  };

  attendance: {
    overallPercentage: number | null;
    subjectWise: SubjectAttendance[];
  };

  lms: {
    loginsLast7Days: number | null;
    assignmentsCompleted: number | null;
    assignmentsTotal: number | null;
  };

  engagement: {
    eventsAttended: number | null;
    clubMember: boolean | null;
    hackathons: number | null;
    certifications: number | null;
  };

  placement: {
    aptitudeScore: number | null;
    codingScore: number | null;
    mockInterviewScore: number | null;
  };

  skills: {
    technicalScore: number | null;
    softSkillScore: number | null;
  };

  feedback: {
    studentSatisfaction: number | null;
    facultyFeedbackScore: number | null;
  };
}

export type DomainKey =
  | "academic"
  | "attendance"
  | "lms"
  | "engagement"
  | "placement"
  | "skills";

export type DomainScores = Record<DomainKey, number | null>;

export type RiskSeverity = "high" | "medium";

export type OverallRiskLevel =
  | "High"
  | "Moderate"
  | "Low"
  | "Insufficient data";

export interface RiskFlag {
  id: string;
  label: string;
  severity: RiskSeverity;
  reason: string;
}

export interface StudentSuccessAnalysis {
  score: number | null;
  dataCoverage: number;
  domainScores: DomainScores;
  riskLevel: OverallRiskLevel;
  riskFlags: RiskFlag[];
  segments: string[];
  scoreDrivers: string[];
}
