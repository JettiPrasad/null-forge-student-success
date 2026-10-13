import type { Student } from "@/lib/types";

export type ProfileSignalTone = "support" | "evidence";

export interface ProfileSignal {
  id: string;
  label: string;
  reason: string;
  tone: ProfileSignalTone;
}

function formatPercent(numerator: number, denominator: number): number {
  return Math.round((numerator / denominator) * 100);
}

/**
 * Profile signals surface recorded facts that are useful in a review. They are
 * deliberately separate from Student Success Score segments and risk flags.
 */
export function buildProfileSignals(student: Student): ProfileSignal[] {
  const signals: ProfileSignal[] = [];
  const { academic, attendance, lms, engagement, sourceDetails } = student;
  const placement = sourceDetails?.placement;
  const skills = sourceDetails?.skills;
  const projects = sourceDetails?.engagement?.projectsCompleted;

  const academicReasons: string[] = [];
  if (academic.cgpa !== null && academic.cgpa < 5.5) {
    academicReasons.push(`CGPA ${academic.cgpa.toFixed(1)} is below 5.5`);
  }
  if (academic.averageMarks !== null && academic.averageMarks < 50) {
    academicReasons.push(`exam marks ${academic.averageMarks}% are below 50%`);
  }
  if (academic.backlogs !== null && academic.backlogs > 0) {
    academicReasons.push(`${academic.backlogs} backlog(s) recorded`);
  }
  if (academicReasons.length > 0) {
    signals.push({
      id: "academic-support-review",
      label: "Academic support review",
      reason: academicReasons.join("; "),
      tone: "support",
    });
  }

  if (attendance.overallPercentage !== null && attendance.overallPercentage < 75) {
    signals.push({
      id: "attendance-support",
      label: "Attendance support",
      reason: `Attendance is ${attendance.overallPercentage}%, below the 75% prototype threshold.`,
      tone: "support",
    });
  }

  if (
    lms.assignmentsCompleted !== null &&
    lms.assignmentsTotal !== null &&
    lms.assignmentsTotal > 0
  ) {
    const completion = formatPercent(
      Math.min(lms.assignmentsCompleted, lms.assignmentsTotal),
      lms.assignmentsTotal,
    );
    if (completion < 75) {
      signals.push({
        id: "assignment-follow-up",
        label: "Assignment follow-up",
        reason: `${lms.assignmentsCompleted} of ${lms.assignmentsTotal} assignments submitted (${completion}%).`,
        tone: "support",
      });
    }
  }

  if (projects !== null && projects !== undefined && projects > 0) {
    signals.push({
      id: "project-experience",
      label: "Project experience recorded",
      reason: `${projects} completed project${projects === 1 ? "" : "s"} recorded in engagement data.`,
      tone: "evidence",
    });
  }

  if (engagement.certifications !== null && engagement.certifications > 0) {
    signals.push({
      id: "certifications",
      label: "Certifications recorded",
      reason: `${engagement.certifications} certification${engagement.certifications === 1 ? "" : "s"} recorded.`,
      tone: "evidence",
    });
  }

  const skillFields = [
    skills?.primarySkill,
    skills?.pythonLevel,
    skills?.sqlLevel,
    skills?.communicationLevel,
  ].filter((value): value is string => value !== null && value !== undefined && value !== "");
  if (skillFields.length > 0) {
    signals.push({
      id: "skills-profile",
      label: "Skills profile recorded",
      reason: `${skillFields.length} categorical skill indicator${skillFields.length === 1 ? "" : "s"} available for review.`,
      tone: "evidence",
    });
  }

  const placementActivity: string[] = [];
  if (placement?.trainingHours !== null && placement?.trainingHours !== undefined && placement.trainingHours > 0) {
    placementActivity.push(`${placement.trainingHours} training hours`);
  }
  if (placement?.applicationsCount !== null && placement?.applicationsCount !== undefined && placement.applicationsCount > 0) {
    placementActivity.push(`${placement.applicationsCount} application${placement.applicationsCount === 1 ? "" : "s"}`);
  }
  if (["Applied", "Ongoing", "Completed"].includes(placement?.internshipStatus ?? "")) {
    placementActivity.push(`internship status: ${placement!.internshipStatus}`);
  }
  if (placementActivity.length > 0) {
    signals.push({
      id: "placement-preparation",
      label: "Placement preparation activity",
      reason: `Recorded ${placementActivity.join(", ")}.`,
      tone: "evidence",
    });
  }

  return signals;
}
