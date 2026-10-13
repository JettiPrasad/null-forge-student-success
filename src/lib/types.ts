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
  // Original source facts not represented by the numeric scoring model.
  sourceDetails?: {
    academic?: { academicYear: string | null; sgpa: number | null };
    attendance?: { classesHeld: number | null; classesAttended: number | null };
    lms?: {
      loginCount: number | null;
      loginPeriod: "unspecified";
      timeSpentHours: number | null;
      quizAveragePct: number | null;
    };
    engagement?: {
      projectsCompleted: number | null;
      engagementLevel: string | null;
    };
    placement?: {
      interest: string | null;
      internshipStatus: string | null;
      trainingHours: number | null;
      applicationsCount: number | null;
      offersCount: number | null;
      status: string | null;
    };
    skills?: {
      primarySkill: string | null;
      pythonLevel: string | null;
      sqlLevel: string | null;
      communicationLevel: string | null;
    };
    feedback?: {
      learningSatisfaction: string | null;
      comment: string | null;
    };
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
