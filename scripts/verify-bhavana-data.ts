import { loadDemoStudents } from "../src/lib/bhavana-data";
import { buildAnalyzedStudents, summarizeDashboard } from "../src/lib/view-model";

async function main() {
  const students = await loadDemoStudents();

  if (students.length !== 100) {
    throw new Error(`Expected 100 demo students; got ${students.length}`);
  }

  if (new Set(students.map((student) => student.id)).size !== 100) {
    throw new Error("Student IDs are not unique");
  }
  const originalCount = students.filter((student) => student.id.startsWith("NF-F")).length;
  const syntheticCount = students.filter((student) => student.id.startsWith("NF-S")).length;
  if (originalCount !== 15 || syntheticCount !== 85) {
    throw new Error(`Expected 15 original and 85 synthetic records; got ${originalCount} and ${syntheticCount}`);
  }

  for (const student of students) {
    if (student.lms.loginsLast7Days !== null) {
      throw new Error(`${student.id}: unspecified login period was mapped`);
    }

    if (
      student.placement.aptitudeScore !== null ||
      student.placement.codingScore !== null ||
      student.placement.mockInterviewScore !== null
    ) {
      throw new Error(`${student.id}: fabricated placement score detected`);
    }

    if (
      student.skills.technicalScore !== null ||
      student.skills.softSkillScore !== null
    ) {
      throw new Error(`${student.id}: categorical skills were converted without approval`);
    }
  }

  const analyzed = buildAnalyzedStudents(students);
  const summary = summarizeDashboard(analyzed);

  if (summary.totalStudents !== 100) {
    throw new Error("Dashboard summary count mismatch");
  }

  console.log("DATASET VALIDATION PASSED");
  console.log("Students loaded:", students.length);
  console.log("Unique IDs:", new Set(students.map((student) => student.id)).size);
  console.log("Dashboard summary:", summary);
  console.log("\nStudent analyses:");

  for (const { student, analysis } of analyzed) {
    console.log({
      id: student.id,
      name: student.fullName,
      score: analysis.score,
      coverage: analysis.dataCoverage,
      risk: analysis.riskLevel,
      flags: analysis.riskFlags.map((flag) => flag.id),
    });
  }
}

main().catch((error: unknown) => {
  console.error("DATASET VALIDATION FAILED");
  console.error(error);
  process.exitCode = 1;
});
