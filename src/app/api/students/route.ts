import { loadBhavanaStudents } from "@/lib/bhavana-data";


export async function GET() {
  try {
    const students = await loadBhavanaStudents();

    return Response.json(
      {
        source: "bhavana-sample",
        count: students.length,
        students,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load the Bhavana sample dataset:", error);

    return Response.json(
      { error: "Failed to load the sample student dataset." },
      { status: 500 },
    );
  }
}

