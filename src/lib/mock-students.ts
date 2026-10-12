import type { Student } from "./types";

type StudentOverrides = {
  department?: string;
  yearOfStudy?: number;
  semester?: number;
  academic?: Partial<Student["academic"]>;
  attendance?: Partial<Student["attendance"]>;
  lms?: Partial<Student["lms"]>;
  engagement?: Partial<Student["engagement"]>;
  placement?: Partial<Student["placement"]>;
  skills?: Partial<Student["skills"]>;
  feedback?: Partial<Student["feedback"]>;
};

function createStudent(
  id: string,
  fullName: string,
  overrides: StudentOverrides = {},
): Student {
  return {
    id,
    fullName,
    department: overrides.department ?? "CSE (AI & DS)",
    yearOfStudy: overrides.yearOfStudy ?? 3,
    semester: overrides.semester ?? 5,

    academic: {
      cgpa: 8.2,
      averageMarks: 78,
      backlogs: 0,
      ...overrides.academic,
    },

    attendance: {
      overallPercentage: 88,
      subjectWise: [
        { subject: "Data Structures", percentage: 90 },
        { subject: "Database Systems", percentage: 86 },
      ],
      ...overrides.attendance,
    },

    lms: {
      loginsLast7Days: 5,
      assignmentsCompleted: 8,
      assignmentsTotal: 10,
      ...overrides.lms,
    },

    engagement: {
      eventsAttended: 3,
      clubMember: true,
      hackathons: 1,
      certifications: 2,
      ...overrides.engagement,
    },

    placement: {
      aptitudeScore: 76,
      codingScore: 72,
      mockInterviewScore: 75,
      ...overrides.placement,
    },

    skills: {
      technicalScore: 78,
      softSkillScore: 74,
      ...overrides.skills,
    },

    feedback: {
      studentSatisfaction: 4,
      facultyFeedbackScore: 4,
      ...overrides.feedback,
    },
  };
}

export const mockStudents: Student[] = [
  // S001: Healthy baseline; most indicators are strong.
  createStudent("S001", "Aanya Rao"),

  // S002: Multiple academic warning indicators.
  createStudent("S002", "Ravi Kumar", {
    academic: {
      cgpa: 4.4,
      averageMarks: 38,
      backlogs: 2,
    },
    attendance: { overallPercentage: 62 },
  }),

  // S003: Strong academic results but weak placement readiness.
  createStudent("S003", "Meera Shah", {
    academic: {
      cgpa: 9.1,
      averageMarks: 88,
      backlogs: 0,
    },
    placement: {
      aptitudeScore: 45,
      codingScore: 28,
      mockInterviewScore: 42,
    },
  }),

  // S004: Attendance requires attention.
  createStudent("S004", "Kiran Reddy", {
    attendance: { overallPercentage: 58 },
  }),

  // S005: Low LMS activity and incomplete assignments.
  createStudent("S005", "Divya Nair", {
    lms: {
      loginsLast7Days: 1,
      assignmentsCompleted: 3,
      assignmentsTotal: 10,
    },
  }),

  // S006: Missing data. Missing values must not become zeros.
  createStudent("S006", "Arjun Das", {
    academic: {
      cgpa: null,
      averageMarks: null,
      backlogs: null,
    },
    attendance: {
      overallPercentage: null,
      subjectWise: [],
    },
    lms: {
      loginsLast7Days: null,
      assignmentsCompleted: null,
      assignmentsTotal: null,
    },
    engagement: {
      eventsAttended: null,
      clubMember: null,
      hackathons: null,
      certifications: null,
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
  }),

  // S007: Good overall results, but not perfect.
  createStudent("S007", "Sahana Iyer", {
    academic: {
      cgpa: 7.4,
      averageMarks: 71,
      backlogs: 0,
    },
    attendance: { overallPercentage: 79 },
    placement: {
      aptitudeScore: 68,
      codingScore: 65,
      mockInterviewScore: 70,
    },
  }),
];
