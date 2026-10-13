import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type { Student } from "@/lib/types";

type CsvRow = Record<string, string>;
type StudentRow = CsvRow & {
  student_id: string;
  student_name: string;
  department: string;
  year: string;
  semester: string;
};

const missing = (value: string | undefined) =>
  value === undefined || value.trim() === "" || value.trim().toUpperCase() === "MISSING";

function textValue(row: CsvRow, key: string): string | null {
  const value = row[key]?.trim();
  return missing(value) ? null : value!;
}

function requiredText(row: CsvRow, key: string, context: string): string {
  const value = textValue(row, key);
  if (value === null) throw new Error(`${context}: required ${key} is missing`);
  return value;
}

function numberValue(
  row: CsvRow,
  key: string,
  context: string,
  min: number,
  max: number,
  integer = false,
): number | null {
  const value = textValue(row, key);
  if (value === null) return null;

  const parsed = Number(value);
  if (
    !Number.isFinite(parsed) ||
    parsed < min ||
    parsed > max ||
    (integer && !Number.isInteger(parsed))
  ) {
    throw new Error(`${context}: invalid ${key} value "${value}"`);
  }

  return parsed;
}

function requiredNumber(
  row: CsvRow,
  key: string,
  context: string,
  min: number,
  max: number,
): number {
  const value = numberValue(row, key, context, min, max, true);
  if (value === null) throw new Error(`${context}: required ${key} is missing`);
  return value;
}

function nullableBoolean(row: CsvRow, key: string, context: string): boolean | null {
  const value = textValue(row, key);
  if (value === null) return null;

  if (value.toLowerCase() === "yes") return true;
  if (value.toLowerCase() === "no") return false;

  throw new Error(`${context}: ${key} must be Yes, No, or MISSING`);
}

async function readTable(name: string): Promise<CsvRow[]> {
  const file = path.join(process.cwd(), "data", "sample", `${name}.csv`);
  const source = await readFile(file, "utf8");

  const rows = parse(source, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: false,
  }) as CsvRow[];

  if (rows.length === 0) throw new Error(`${name}.csv has no data rows`);
  return rows;
}

function indexDomain(
  name: string,
  rows: CsvRow[],
  master: Map<string, StudentRow>,
): Map<string, CsvRow> {
  const indexed = new Map<string, CsvRow>();

  for (const row of rows) {
    const id = requiredText(row, "student_id", name);
    const masterStudent = master.get(id);

    if (!masterStudent) throw new Error(`${name}: orphan student ID ${id}`);
    if (indexed.has(id)) throw new Error(`${name}: duplicate student ID ${id}`);

    // Semester-scoped records must match the student's master semester.
    if (Object.hasOwn(row, "semester")) {
      const recordSemester = numberValue(row, "semester", name, 1, 8, true);
      if (
        recordSemester !== null &&
        recordSemester !== Number(masterStudent.semester)
      ) {
        throw new Error(
          `${name}: semester mismatch for ${id} (record ${recordSemester}, master ${masterStudent.semester})`,
        );
      }
    }

    indexed.set(id, row);
  }

  for (const id of master.keys()) {
    if (!indexed.has(id)) throw new Error(`${name}: no record found for ${id}`);
  }

  return indexed;
}

export async function loadBhavanaStudents(): Promise<Student[]> {
  const [
    studentRows,
    academicRows,
    attendanceRows,
    lmsRows,
    engagementRows,
    placementRows,
    skillsRows,
    feedbackRows,
  ] = await Promise.all([
    readTable("Students"),
    readTable("Academic"),
    readTable("Attendance"),
    readTable("LMS"),
    readTable("Engagement"),
    readTable("Placement"),
    readTable("Skills"),
    readTable("Feedback"),
  ]);

  const master = new Map<string, StudentRow>();

  for (const raw of studentRows) {
    const row = raw as StudentRow;
    const id = requiredText(row, "student_id", "Students");

    if (master.has(id)) throw new Error(`Students: duplicate student ID ${id}`);

    // Fail early if the required identity fields are absent.
    requiredText(row, "student_name", `Students ${id}`);
    requiredText(row, "department", `Students ${id}`);
    requiredNumber(row, "year", `Students ${id}`, 1, 4);
    requiredNumber(row, "semester", `Students ${id}`, 1, 8);
    master.set(id, row);
  }

  const tables = {
    Academic: indexDomain("Academic", academicRows, master),
    Attendance: indexDomain("Attendance", attendanceRows, master),
    LMS: indexDomain("LMS", lmsRows, master),
    Engagement: indexDomain("Engagement", engagementRows, master),
    Placement: indexDomain("Placement", placementRows, master),
    Skills: indexDomain("Skills", skillsRows, master),
    Feedback: indexDomain("Feedback", feedbackRows, master),
  };

  function rowFor(table: Map<string, CsvRow>, id: string): CsvRow {
    const row = table.get(id);
    if (!row) throw new Error(`No joined record for ${id}`);
    return row;
  }

  return [...master.entries()].map(([id, base]) => {
    const academic = rowFor(tables.Academic, id);
    const attendance = rowFor(tables.Attendance, id);
    const lms = rowFor(tables.LMS, id);
    const engagement = rowFor(tables.Engagement, id);
    const placement = rowFor(tables.Placement, id);
    const skills = rowFor(tables.Skills, id);
    const feedback = rowFor(tables.Feedback, id);

    const studentContext = `Student ${id}`;

    return {
      id,
      fullName: requiredText(base, "student_name", studentContext),
      department: requiredText(base, "department", studentContext),
      yearOfStudy: requiredNumber(base, "year", studentContext, 1, 4),
      semester: requiredNumber(base, "semester", studentContext, 1, 8),

      academic: {
        cgpa: numberValue(academic, "cgpa", id, 0, 10),
        averageMarks: numberValue(academic, "exam_score_pct", id, 0, 100),
        backlogs: numberValue(academic, "backlog_count", id, 0, 100, true),
      },

      attendance: {
        overallPercentage: numberValue(
          attendance,
          "attendance_pct",
          id,
          0,
          100,
        ),
        // The source has overall attendance only; do not invent subject records.
        subjectWise: [],
      },

      lms: {
        // The source's login_count reporting period is unspecified.
        loginsLast7Days: null,
        assignmentsCompleted: numberValue(
          lms,
          "assignments_submitted",
          id,
          0,
          100000,
          true,
        ),
        assignmentsTotal: numberValue(
          lms,
          "assignments_assigned",
          id,
          0,
          100000,
          true,
        ),
      },

      engagement: {
        eventsAttended: numberValue(
          engagement,
          "events_attended",
          id,
          0,
          100000,
          true,
        ),
        clubMember: nullableBoolean(engagement, "club_participation", id),
        // projects_completed is not equivalent to hackathons.
        hackathons: null,
        certifications: numberValue(
          skills,
          "certifications_count",
          id,
          0,
          100000,
          true,
        ),
      },

      // Placement activity exists, but assessment scores do not.
      placement: {
        aptitudeScore: null,
        codingScore: null,
        mockInterviewScore: null,
      },

      // Skill levels are categorical and are not converted into scores here.
      skills: {
        technicalScore: null,
        softSkillScore: null,
      },

      feedback: {
        studentSatisfaction: numberValue(
          feedback,
          "course_rating",
          id,
          1,
          5,
          true,
        ),
        facultyFeedbackScore: numberValue(
          feedback,
          "faculty_support_rating",
          id,
          1,
          5,
          true,
        ),
      },
    } satisfies Student;
  });
}
