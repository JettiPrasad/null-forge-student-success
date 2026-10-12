
import type { Student } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validNumber(
  value: number | null,
  min: number,
  max: number
): boolean {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max)
  );
}

function validInteger(
  value: number | null,
  min: number,
  max: number
): boolean {
  return value === null ||
    (validNumber(value, min, max) && Number.isInteger(value));
}

export function validateStudent(
  student: Student
): ValidationResult {
  const errors: string[] = [];

  if (!student.id?.trim()) {
    errors.push("Student ID is required");
  }

  if (!student.fullName?.trim()) {
    errors.push("Student name is required");
  }

  if (!student.department?.trim()) {
    errors.push("Department is required");
  }

  if (!validInteger(student.yearOfStudy, 1, 4) ||
      student.yearOfStudy === null) {
    errors.push("Year of study must be between 1 and 4");
  }

  if (!validInteger(student.semester, 1, 8) ||
      student.semester === null) {
    errors.push("Semester must be between 1 and 8");
  }

  const check = (
    field: string,
    value: number | null,
    min: number,
    max: number,
    integer = false
  ) => {
    const valid = integer
      ? validInteger(value, min, max)
      : validNumber(value, min, max);

    if (!valid) {
      errors.push(`${field} must be between ${min} and ${max}, or null`);
    }
  };

  check("CGPA", student.academic.cgpa, 0, 10);
  check("Average marks", student.academic.averageMarks, 0, 100);
  check("Backlogs", student.academic.backlogs, 0, 100, true);

  check(
    "Overall attendance",
    student.attendance.overallPercentage,
    0,
    100
  );

  student.attendance.subjectWise.forEach((record, index) => {
    if (!record.subject?.trim()) {
      errors.push(`Subject ${index + 1}: name is required`);
    }

    check(
      `Subject ${index + 1} attendance`,
      record.percentage,
      0,
      100
    );
  });

  check("LMS logins", student.lms.loginsLast7Days, 0, 10000, true);
  check("Assignments completed", student.lms.assignmentsCompleted, 0, 10000, true);
  check("Assignments total", student.lms.assignmentsTotal, 0, 10000, true);

  if (
    student.lms.assignmentsCompleted !== null &&
    student.lms.assignmentsTotal !== null &&
    student.lms.assignmentsCompleted > student.lms.assignmentsTotal
  ) {
    errors.push("Completed assignments cannot exceed total assignments");
  }

  check("Events attended", student.engagement.eventsAttended, 0, 10000, true);
  check("Hackathons", student.engagement.hackathons, 0, 10000, true);
  check("Certifications", student.engagement.certifications, 0, 10000, true);

  if (
    student.engagement.clubMember !== null &&
    typeof student.engagement.clubMember !== "boolean"
  ) {
    errors.push("Club membership must be true, false, or null");
  }

  check("Aptitude score", student.placement.aptitudeScore, 0, 100);
  check("Coding score", student.placement.codingScore, 0, 100);
  check("Mock interview score", student.placement.mockInterviewScore, 0, 100);

  check("Technical score", student.skills.technicalScore, 0, 100);
  check("Soft skill score", student.skills.softSkillScore, 0, 100);

  check("Student satisfaction", student.feedback.studentSatisfaction, 1, 5);
  check("Faculty feedback", student.feedback.facultyFeedbackScore, 1, 5);

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateStudents(
  students: Student[]
): ValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();

  students.forEach((student, index) => {
    const result = validateStudent(student);

    result.errors.forEach((error) => {
      errors.push(`Student ${index + 1}: ${error}`);
    });

    if (typeof student.id === "string" && student.id.trim()) {
      if (ids.has(student.id)) {
        errors.push(`Duplicate student ID: ${student.id}`);
      }
      ids.add(student.id);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}