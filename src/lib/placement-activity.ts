import type { Student } from "@/lib/types";

export type PlacementActivityStatus =
  | "recorded"
  | "review"
  | "in-progress"
  | "confirm-interest"
  | "unavailable";

export interface PlacementActivityAssessment {
  status: PlacementActivityStatus;
  title: string;
  rationale: string;
  suggestedAction: string;
  segment: string;
}

export function assessPlacementActivity(
  student: Student,
): PlacementActivityAssessment {
  const placement = student.sourceDetails?.placement;

  if (!placement) {
    return {
      status: "unavailable",
      title: "Placement activity unavailable",
      rationale: "No placement source details were supplied.",
      suggestedAction: "Verify that placement data has been imported.",
      segment: "Placement data unavailable",
    };
  }

  const interest = placement.interest?.trim().toLowerCase() ?? "";
  const placementStatus = placement.status?.trim().toLowerCase() ?? "";
  const internshipStatus = placement.internshipStatus?.trim().toLowerCase() ?? "";
  const applications = placement.applicationsCount;
  const offers = placement.offersCount;
  const trainingHours = placement.trainingHours;

  if (placementStatus === "placed" || (offers !== null && offers > 0)) {
    return {
      status: "recorded",
      title: "Offer or placement recorded",
      rationale: `Source records indicate ${offers ?? "an unknown number of"} offer(s); status: ${placement.status ?? "unavailable"}.`,
      suggestedAction: "Verify the recorded status and update the student record if needed.",
      segment: "Offer or placement recorded",
    };
  }

  if (
    interest === "yes" &&
    placementStatus === "not started" &&
    internshipStatus === "not applied" &&
    trainingHours === 0 &&
    applications === 0 &&
    offers === 0
  ) {
    return {
      status: "review",
      title: "Placement activity review",
      rationale: "The student expressed placement interest, but the current source record shows no applications, no internship application, no offers, and a Not started status.",
      suggestedAction: "Offer a placement-readiness discussion and confirm whether the record is current.",
      segment: "Interested; activity not started",
    };
  }

  if (interest === "no") {
    return {
      status: "confirm-interest",
      title: "No current placement interest recorded",
      rationale: "The source records no placement interest. This is not a placement-risk finding.",
      suggestedAction: "Confirm the student's current plans before recommending support.",
      segment: "No placement interest recorded",
    };
  }

  if (interest === "undecided") {
    return {
      status: "confirm-interest",
      title: "Placement interest undecided",
      rationale: "The source records undecided placement interest.",
      suggestedAction: "Discuss available placement pathways and update the preference if it changes.",
      segment: "Placement interest undecided",
    };
  }

  if (
    (applications !== null && applications > 0) ||
    (offers !== null && offers > 0) ||
    (trainingHours !== null && trainingHours > 0) ||
    ["applied", "ongoing", "completed"].includes(internshipStatus) ||
    placementStatus === "preparing"
  ) {
    return {
      status: "in-progress",
      title: "Placement activity in progress",
      rationale: `Source records show status ${placement.status ?? "unavailable"}, ${applications ?? "unknown"} applications, and ${trainingHours ?? "unknown"} training hours.`,
      suggestedAction: "Review applications and preparation progress during the next student check-in.",
      segment: "Placement activity in progress",
    };
  }

  return {
    status: "unavailable",
    title: "Placement activity needs clarification",
    rationale: "The available source values are insufficient to determine an activity state.",
    suggestedAction: "Verify the placement-interest and activity fields.",
    segment: "Placement activity needs clarification",
  };
}
