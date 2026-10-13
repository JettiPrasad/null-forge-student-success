import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

type Row = Record<string, string>;

const root = process.cwd();
const sourceDir = path.join(root, "data", "sample");
const outputDir = path.join(root, "data", "demo");

const tables = [
  "Students", "Academic", "Attendance", "LMS",
  "Engagement", "Placement", "Skills", "Feedback",
] as const;

const departments = ["CSE(AI)", "CSE", "ECE", "EEE", "MECH"];
const pythonLevels = ["Beginner", "Intermediate", "Advanced"];
const sqlLevels = ["Beginner", "Intermediate", "Advanced"];
const communicationLevels = ["Low", "Medium", "High"];
const primarySkills = ["Python", "SQL", "Java", "Web Development", "Data Analytics"];

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value)
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

function csvText(headers: string[], rows: Row[]): string {
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header] ?? "MISSING")).join(",")),
  ].join("\r\n") + "\r\n";
}

async function readTable(name: string): Promise<{ headers: string[]; rows: Row[] }> {
  const file = path.join(sourceDir, `${name}.csv`);
  const source = await readFile(file, "utf8");
  const rows = parse(source, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: false,
  }) as Row[];

  if (rows.length === 0) throw new Error(`${name}.csv is empty`);

  return { headers: Object.keys(rows[0]), rows };
}

function syntheticRow(table: string, headers: string[], i: number): Row {
  const number = i + 16;
  const id = `NF-S${String(number).padStart(3, "0")}`;
  const scenario = i % 12;
  const year = 1 + (i % 4);
  const semester = year * 2 - (Math.floor(i / 4) % 2);

  const row: Row = Object.fromEntries(headers.map((header) => [header, "MISSING"]));
  const put = (values: Record<string, string | number>) => {
    for (const [key, value] of Object.entries(values)) {
      if (!headers.includes(key)) throw new Error(`${table}: unexpected column ${key}`);
      row[key] = String(value);
    }
  };

  switch (table) {
    case "Students":
      put({
        student_id: id,
        student_name: `Student ${String(number).padStart(3, "0")}`,
        department: departments[i % departments.length],
        year,
        semester,
      });
      break;

    case "Academic": {
      const cgpa = scenario === 0
        ? round(4.1 + (i % 5) * 0.2)
        : round(5.3 + ((i * 17 + 11) % 46) / 10);
      const marks = scenario === 0
        ? 33 + (i % 7)
        : scenario === 1
          ? 43 + (i % 9)
          : 48 + ((i * 19 + 7) % 51);
      put({
        student_id: id,
        academic_year: "2026-27",
        semester,
        sgpa: round(Math.max(0, Math.min(10, cgpa + ((i % 5) - 2) * 0.2))),
        cgpa,
        backlog_count: scenario === 0 ? 2 + (i % 2) : i % 11 === 0 ? 1 : 0,
        exam_score_pct: Math.min(100, marks),
      });
      break;
    }

    case "Attendance": {
      const held = 60;
      const attended = scenario === 0
        ? 30 + (i % 9)
        : scenario === 1
          ? 39 + (i % 6)
          : 45 + ((i * 7) % 16);

      if (i % 29 !== 0) {
        put({
          student_id: id,
          semester,
          classes_held: held,
          classes_attended: attended,
          attendance_pct: round((attended / held) * 100),
        });
      } else {
        put({ student_id: id, semester });
      }
      break;
    }

    case "LMS": {
      const assigned = 12;
      const submitted = scenario === 0
        ? 1 + (i % 5)
        : Math.min(12, 5 + ((i * 3) % 8));
      put({
        student_id: id,
        semester,
        login_count: i % 23 === 0 ? "MISSING" : (i * 7 + 3) % 46,
        time_spent_hours: i % 31 === 0 ? "MISSING" : round(1 + ((i * 11) % 90) / 3),
        assignments_submitted: i % 19 === 0 ? "MISSING" : submitted,
        assignments_assigned: assigned,
        quiz_avg_pct: scenario === 0 ? 30 + (i % 19) : 45 + ((i * 13) % 56),
      });
      break;
    }

    case "Engagement": {
      const events = scenario === 0 ? i % 2 : (i * 3) % 11;
      const projects = scenario === 2 ? i % 2 : (i * 5) % 6;
      const level = events <= 2 && projects <= 1
        ? "Low"
        : events >= 6 && projects >= 3
          ? "High"
          : "Medium";
      put({
        student_id: id,
        semester,
        club_participation: i % 13 === 0 ? "MISSING" : i % 3 === 0 ? "Yes" : "No",
        events_attended: events,
        projects_completed: projects,
        engagement_level: level,
      });
      break;
    }

    case "Placement": {
      const training = scenario === 2 ? i % 2 : (i * 17) % 161;
      const applications = scenario === 2 ? i % 3 : (i * 7) % 13;
      const offers = year >= 3 && i % 11 === 0 ? 1 : 0;
      put({
        student_id: id,
        placement_interest: i % 9 === 0 ? "Undecided" : i % 10 === 0 ? "No" : "Yes",
        internship_status: ["Not applied", "Applied", "Ongoing", "Completed"][i % 4],
        training_hours: i % 37 === 0 ? "MISSING" : training,
        applications_count: applications,
        offers_count: offers,
        placement_status: offers > 0 ? "Placed" : training > 0 ? "Preparing" : "Not started",
      });
      break;
    }

    case "Skills":
      put({
        student_id: id,
        primary_skill: primarySkills[i % primarySkills.length],
        python_level: scenario === 2 ? "Beginner" : pythonLevels[(i * 5 + 1) % 3],
        sql_level: scenario === 2 ? "Beginner" : sqlLevels[(i * 2 + 1) % 3],
        communication_level: scenario === 2 ? "Low" : communicationLevels[(i + 1) % 3],
        certifications_count: i % 5,
      });
      break;

    case "Feedback":
      put({
        student_id: id,
        semester,
        course_rating: i % 17 === 0 ? "MISSING" : 1 + ((i * 3) % 5),
        faculty_support_rating: i % 21 === 0 ? "MISSING" : 1 + ((i * 2 + 1) % 5),
        learning_satisfaction: ["Low", "Medium", "High"][i % 3],
        feedback_comment: i % 7 === 0
          ? "MISSING"
          : ["Needs more practice", "Learning goals are progressing", "Requests additional placement guidance"][i % 3],
      });
      break;
  }

  if (row.student_id !== id) throw new Error(`${table}: student ID missing for ${id}`);
  return row;
}

function stableRank(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 16777619) >>> 0;
  }
  return hash;
}
async function main(): Promise<void> {
  const source = new Map<string, { headers: string[]; rows: Row[] }>();

  for (const table of tables) source.set(table, await readTable(table));

  const masterRows = source.get("Students")!.rows;
  if (masterRows.length !== 15) {
    throw new Error(`Expected exactly 15 original Students rows; found ${masterRows.length}`);
  }

  const originalIds = masterRows.map((row) => row.student_id);
  if (new Set(originalIds).size !== 15) throw new Error("Original student IDs are not unique");

  const masterSet = new Set(originalIds);
  for (const table of tables) {
    const rows = source.get(table)!.rows;
    if (rows.length !== 15) throw new Error(`${table}: expected 15 original rows, got ${rows.length}`);
    if (new Set(rows.map((row) => row.student_id)).size !== 15) {
      throw new Error(`${table}: original student IDs are not unique`);
    }
    if (rows.some((row) => !masterSet.has(row.student_id))) {
      throw new Error(`${table}: found an ID that is not in Students.csv`);
    }
    if (originalIds.some((id) => !rows.some((row) => row.student_id === id))) {
      throw new Error(`${table}: at least one original student has no matching row`);
    }
  }

  const generatedIds = Array.from({ length: 85 }, (_, index) =>
    `NF-S${String(index + 16).padStart(3, "0")}`,
  );

  await mkdir(outputDir, { recursive: true });

  for (const table of tables) {
    const { headers, rows: originals } = source.get(table)!;
    const generated = Array.from({ length: 85 }, (_, index) =>
      syntheticRow(table, headers, index),
    );
    const allRows = [...originals, ...generated].sort((left, right) => stableRank(left.student_id) - stableRank(right.student_id) || left.student_id.localeCompare(right.student_id));

    if (allRows.length !== 100 || new Set(allRows.map((row) => row.student_id)).size !== 100) {
      throw new Error(`${table}: generated cohort failed the 100 unique IDs check`);
    }

    const actualGeneratedIds = generated.map((row) => row.student_id);
    if (actualGeneratedIds.some((id, index) => id !== generatedIds[index])) {
      throw new Error(`${table}: generated ID sequence is inconsistent`);
    }

    await writeFile(
      path.join(outputDir, `${table}.csv`),
      csvText(headers, allRows),
      "utf8",
    );

    console.log(`${table}.csv: ${originals.length} source + ${generated.length} synthetic = ${allRows.length}`);
  }

  await writeFile(
    path.join(outputDir, "README.txt"),
    [
      "NULL FORGE — 100-STUDENT DEMO COHORT",
      "",
      "This directory contains 15 original source records and 85 deterministic synthetic demo records.",
      "Original source files remain in data/sample and are not modified by this generator.",
      "Synthetic student IDs use the NF-S prefix. Original IDs are retained unchanged.",
      "All eight CSV schemas match the corresponding data/sample schemas.",
      "MISSING and blank values represent unknown data, not numeric zero.",
      "Synthetic outcomes are for demonstration only and are not validated real-world evidence.",
      "Placement readiness must not use offers_count or placement_status as input features.",
      "Regenerate with: npx tsx scripts/generate-demo-cohort.ts",
      "",
    ].join("\r\n"),
    "utf8",
  );

  console.log("\nPASS: data/demo contains 100 students per table (15 source + 85 synthetic).");
  console.log("PASS: data/sample was read only and was not modified.");
}

main().catch((error: unknown) => {
  console.error("DEMO COHORT GENERATION FAILED");
  console.error(error);
  process.exitCode = 1;
});
