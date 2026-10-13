import { loadDemoStudents } from "@/lib/bhavana-data";

export async function GET() {
  try {
    const students = await loadDemoStudents();
    const originalCount = students.filter((student) => student.id.startsWith("NF-F")).length;
    const syntheticCount = students.filter((student) => student.id.startsWith("NF-S")).length;

    if (
      students.length !== 100 ||
      originalCount !== 15 ||
      syntheticCount !== 85
    ) {
      throw new Error(
        `Unexpected cohort size: total=${students.length}, original=${originalCount}, synthetic=${syntheticCount}`,
      );
    }

    return Response.json(
      {
        source: "demo-cohort",
        count: students.length,
        originalCount,
        syntheticCount,
        students,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load the 100-student demo cohort:", error);

    return Response.json(
      { error: "Failed to load the 100-student demo cohort." },
      { status: 500 },
    );
  }
}