"use client";

import { useEffect, useMemo, useState } from "react";
import { mockStudents } from "@/lib/mock-students";
import { buildAnalyzedStudents, summarizeDashboard } from "@/lib/view-model";
import type { OverallRiskLevel, Student } from "@/lib/types";
import { assessPlacementActivity } from "@/lib/placement-activity";
import {
  buildCorrelationInsights,
  buildDataCompleteness,
  buildDepartmentSummaries,
  buildInterventionQueue,
  buildScatterPoints,
  scoreDistributionByYear,
} from "@/lib/dashboard-analytics";
import { assessPlacementReadinessProxy } from "@/lib/placement-readiness";
import { buildProfileSignals } from "@/lib/profile-signals";

type RiskFilter = "All" | OverallRiskLevel;
type Screen = "Overview" | "Students" | "Insights" | "Interventions";
type InterventionStatus = "New" | "Contacted" | "Resolved";

function formatScore(score: number | null): string {
  return score === null ? "N/A" : score.toFixed(1);
}

function displayStudentName(fullName: string): string {
  return fullName.replace(/^Synthetic Student (\d{3})$/, "Student $1");
}

function formatSourceValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "Unavailable";
  }
  return String(value);
}

function formatDomainScore(
  label: string,
  value: number | null,
): string {
  if (value !== null) return `${value}/100`;
  if (label === "Placement") {
    return "Assessment score not recorded — see Placement Activity";
  }
  if (label === "Skills") {
    return "Numeric assessment not recorded — see Skills & Portfolio";
  }
  return "No numeric score recorded";
}

function riskStyle(level: OverallRiskLevel): string {
  switch (level) {
    case "High":
      return "border-red-400/30 bg-red-400/10 text-red-300";
    case "Moderate":
      return "border-amber-400/30 bg-amber-400/10 text-amber-300";
    case "Low":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
    default:
      return "border-slate-600 bg-slate-800 text-slate-300";
  }
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("Overview");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("All");
  const [pageSize, setPageSize] = useState<number | "all">(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [dataStatus, setDataStatus] = useState<"loading" | "demo" | "fallback">("loading");
  const [interventionStatuses, setInterventionStatuses] =
    useState<Record<string, InterventionStatus>>({});

  // Fetch validated source data; retain mock data only as a labelled fallback.
  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      try {
        const response = await fetch("/api/students", { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Students API returned HTTP ${response.status}`);
        }

        const payload = (await response.json()) as {
          source?: string;
          count?: number;
          originalCount?: number;
          syntheticCount?: number;
          students?: Student[];
        };

        if (
          payload.source !== "demo-cohort" ||
          !Array.isArray(payload.students) ||
          payload.count !== 100 ||
          payload.students.length !== 100 ||
          payload.originalCount !== 15 ||
          payload.syntheticCount !== 85
        ) {
          throw new Error("Students API response failed 100-student cohort validation");
        }

        if (cancelled) return;

        setStudents(payload.students);
        setDataStatus("demo");
        setSelectedId(payload.students[0]?.id ?? "");
      } catch (error) {
        console.error("Could not load the 100-student demo cohort; using mock fallback.", error);

        if (cancelled) return;

        setStudents(mockStudents);
        setDataStatus("fallback");
        setSelectedId(mockStudents[0]?.id ?? "");
      }
    }

    void loadStudents();

    return () => {
      cancelled = true;
    };
  }, []);

  // Scores and dashboard metrics always come from the shared analysis code.
  const records = useMemo(() => buildAnalyzedStudents(students), [students]);

  const summary = useMemo(() => summarizeDashboard(records), [records]);
  const placementActivityReviewCount = useMemo(
    () =>
      records.filter(
        ({ student }) => assessPlacementActivity(student).status === "review",
      ).length,
    [records],
  );

  const correlationInsights = useMemo(
    () => buildCorrelationInsights(students),
    [students],
  );
  const completeness = useMemo(
    () => buildDataCompleteness(students),
    [students],
  );
  const departmentSummaries = useMemo(
    () => buildDepartmentSummaries(records),
    [records],
  );
  const yearSummaries = useMemo(
    () => scoreDistributionByYear(students),
    [students],
  );
  const interventions = useMemo(
    () => buildInterventionQueue(records),
    [records],
  );
  const readinessRows = useMemo(
    () =>
      students
        .map((student) => ({
          student,
          proxy: assessPlacementReadinessProxy(student),
        }))
        .filter(({ proxy }) => proxy.eligible)
        .sort((a, b) => (a.proxy.score ?? 101) - (b.proxy.score ?? 101)),
    [students],
  );

  const placementReadinessSummary = useMemo(() => {
    const scored = readinessRows.filter(({ proxy }) => proxy.score !== null);

    return {
      eligibleCount: readinessRows.length,
      scoredCount: scored.length,
      averageScore:
        scored.length === 0
          ? null
          : Math.round(
              (scored.reduce(
                (sum, { proxy }) => sum + (proxy.score ?? 0),
                0,
              ) /
                scored.length) *
                10,
            ) / 10,
      reviewCount: readinessRows.filter(
        ({ proxy }) => proxy.score !== null && proxy.score < 50,
      ).length,
      developCount: readinessRows.filter(
        ({ proxy }) =>
          proxy.score !== null && proxy.score >= 50 && proxy.score < 75,
      ).length,
      continueCount: readinessRows.filter(
        ({ proxy }) => proxy.score !== null && proxy.score >= 75,
      ).length,
      insufficientCount: readinessRows.filter(
        ({ proxy }) => proxy.score === null,
      ).length,
    };
  }, [readinessRows]);
  function exportInterventionsCsv() {
    const headers = [
      "student_id", "student_name", "department", "year",
      "priority", "severity", "reasons", "owner", "suggested_action", "status",
    ];
    const escapeCell = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = interventions.map((item) => [
      item.studentId,
      displayStudentName(item.studentName),
      item.department,
      item.yearOfStudy,
      item.priority,
      item.severity,
      item.reasons.join("; "),
      item.owner,
      item.suggestedAction,
      interventionStatuses[item.studentId] ?? "New",
    ]);
    const csv = [
      headers.map(escapeCell).join(","),
      ...rows.map((row) => row.map(escapeCell).join(",")),
    ].join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "null-forge-interventions.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter(({ student, analysis }) => {
      const matchesSearch =
        query.length === 0 ||
        student.id.toLowerCase().includes(query) ||
        student.fullName.toLowerCase().includes(query) ||
        student.department.toLowerCase().includes(query);

      const matchesRisk =
        riskFilter === "All" || analysis.riskLevel === riskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [records, search, riskFilter]);

  const pageCount =
    pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(filteredRecords.length / pageSize));

  const effectivePage = Math.min(currentPage, pageCount);

  const paginatedRecords =
    pageSize === "all"
      ? filteredRecords
      : filteredRecords.slice(
          (effectivePage - 1) * pageSize,
          effectivePage * pageSize,
        );

  const selectedVisibleId = filteredRecords.some(
    ({ student }) => student.id === selectedId,
  )
    ? selectedId
    : filteredRecords[0]?.student.id ?? "";

  const selectedRecord =
    filteredRecords.find(
      ({ student }) => student.id === selectedVisibleId,
    ) ?? null;
  const selectedProfileSignals = useMemo(
    () =>
      selectedRecord === null
        ? []
        : buildProfileSignals(selectedRecord.student),
    [selectedRecord],
  );

  const riskRows: { label: OverallRiskLevel; count: number }[] = [
    { label: "High", count: summary.highRiskCount },
    { label: "Moderate", count: summary.moderateRiskCount },
    { label: "Low", count: summary.lowRiskCount },
    {
      label: "Insufficient data",
      count: summary.insufficientDataCount,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 font-bold">
                NF
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  NULL FORGE
                </h1>
                <p className="text-xs text-slate-400">
                  Student Success Intelligence
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-emerald-300">
              Prototype
            </span>
                        <span className="rounded-full border border-slate-700 px-3 py-1.5 text-slate-400">
              {dataStatus === "loading"
                ? "Loading dataset..."
                : dataStatus === "demo"
                  ? `Demo cohort | ${students.length} records (15 source + 85 synthetic)`
                  : `Mock fallback | ${students.length} records`}
            </span>
          </div>
        </div>
      </header>

      {dataStatus === "fallback" ? (
        <div
          role="alert"
          className="border-b border-rose-500/30 bg-rose-950/50 px-5 py-3 text-sm text-rose-200"
        >
          The student API failed. This view is showing fallback mock data,
          not the 100-student demo cohort. Verify /api/students before presenting.
        </div>
      ) : null}
      <div className="mx-auto max-w-7xl px-5 py-8">
        <section className="mb-8">
          <p className="text-sm font-medium text-indigo-300">
            SMART CAMPUS ANALYTICS
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Student success dashboard
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Explore academic performance, attendance, engagement and placement
            readiness. Every risk flag includes a reason. These prototype rules
            support review; they are not validated predictions of a
            student&apos;s future.
          </p>
        </section>

        <nav className="mb-6 flex gap-2 border-b border-slate-800 pb-3">
          {(["Overview", "Students", "Insights", "Interventions"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setScreen(item)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                screen === item
                  ? "bg-indigo-500 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        {screen === "Overview" ? (
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Students in dataset"
                value={String(summary.totalStudents)}
                helper="Fictional demonstration records"
              />
              <MetricCard
                label="Average success score"
                value={
                  summary.averageScore === null
                    ? "N/A"
                    : `${summary.averageScore}/100`
                }
                helper={`${summary.scoredStudents} students have a score`}
              />
              <MetricCard
                label="High-risk students"
                value={String(summary.highRiskCount)}
                helper="At least one high-severity risk flag"
              />
              <MetricCard
                label="Unscored students"
                value={String(summary.unscoredStudents)}
                helper="No composite success score"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="text-lg font-semibold">Risk distribution</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Students grouped by their rule-based risk level. Students without a composite score may still have explicit High or Moderate risk flags.
                </p>

                <div className="mt-6 space-y-5">
                  {riskRows.map(({ label, count }) => {
                    const width =
                      summary.totalStudents === 0
                        ? 0
                        : (count / summary.totalStudents) * 100;

                    return (
                      <div key={label}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-slate-300">{label}</span>
                          <span className="tabular-nums text-slate-400">
                            {count}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${
                              label === "High"
                                ? "bg-red-400"
                                : label === "Moderate"
                                  ? "bg-amber-400"
                                  : label === "Low"
                                    ? "bg-emerald-400"
                                    : "bg-slate-500"
                            }`}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="text-lg font-semibold">Risk indicators</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Count of students with each specific type of flag. A student
                  can have more than one.
                </p>

                <div className="mt-5 space-y-3">
                  {[
                    ["Academic support", summary.academicRiskCount],
                    ["Attendance support", summary.attendanceRiskCount],
                    ["Placement assessment flags", summary.placementRiskCount],
                    ["Placement activity review", placementActivityReviewCount],
                  ].map(([label, count]) => (
                    <div
                      key={String(label)}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-4"
                    >
                      <span className="text-sm text-slate-300">{label}</span>
                      <span className="text-xl font-semibold tabular-nums">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setScreen("Students")}
                  className="mt-5 w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold hover:bg-indigo-400"
                >
                  Explore students
                </button>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Placement readiness snapshot</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Rule-based heuristic for eligible Years 3–4 students. This is a
                    support indicator, not a prediction of placement outcomes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setScreen("Insights")}
                  className="text-sm font-medium text-indigo-300 hover:text-indigo-200"
                >
                  View readiness insights
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                <MetricCard
                  label="Eligible students (Years 3–4)"
                  value={String(placementReadinessSummary.eligibleCount)}
                  helper="Within the proxy's scope"
                />
                <MetricCard
                  label="Average readiness proxy"
                  value={placementReadinessSummary.averageScore === null ? "N/A" : `${placementReadinessSummary.averageScore}/100`}
                  helper={`${placementReadinessSummary.scoredCount} with calculable scores`}
                />
                <MetricCard
                  label="Readiness support review"
                  value={String(placementReadinessSummary.reviewCount)}
                  helper="Proxy score below 50"
                />
                <MetricCard
                  label="Develop skills and practice"
                  value={String(placementReadinessSummary.developCount)}
                  helper="Proxy score from 50 to below 75"
                />
                <MetricCard
                  label="Continue practice and assessment"
                  value={String(placementReadinessSummary.continueCount)}
                  helper="Proxy score 75 or above"
                />
                <MetricCard
                  label="Insufficient proxy data"
                  value={String(placementReadinessSummary.insufficientCount)}
                  helper="Not enough available inputs"
                />
              </div>
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-lg font-semibold">
                How the Student Success Score works
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                The score is a weighted average of available domain evidence.
                Missing values are not treated as zero. Partially available
                domains contribute proportionally less weight.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Academic", weight: 35 },
                  { label: "Attendance", weight: 20 },
                  { label: "LMS activity", weight: 15 },
                  { label: "Placement assessments", weight: 15 },
                  { label: "Skills", weight: 10 },
                  { label: "Engagement", weight: 5 },
                ].map(({ label, weight }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-300">{label}</span>
                      <span className="font-semibold tabular-nums">
                        {weight}%
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-indigo-400"
                        style={{ width: `${weight}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <h4 className="font-medium text-slate-200">
                  Missing-data and scoring rules
                </h4>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-400">
                  <li>
                    Only available metrics contribute to the score denominator.
                  </li>
                  <li>
                    Missing metrics reduce the effective contribution of their
                    domain instead of being silently assigned zero.
                  </li>
                  <li>
                    The composite score is withheld when the available weighted
                    input is below 50% of the full model weight.
                  </li>
                  <li>
                    Risk levels are assigned separately from the composite
                    score. Explicit risk flags can identify students needing
                    review even when their score is unavailable.
                  </li>
                </ul>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Prototype methodology: these weights and thresholds are
                demonstration assumptions, not a validated measure of student
                success or future outcomes.
              </p>
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    Students requiring attention
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Prioritize review by risk; inspect the reason before
                    deciding on an intervention.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setScreen("Students")}
                  className="text-sm font-medium text-indigo-300 hover:text-indigo-200"
                >
                  View all students
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {records
                  .filter(({ analysis }) => analysis.riskFlags.length > 0)
                  .sort((a, b) => {
                    const rank = {
                      High: 0,
                      Moderate: 1,
                      Low: 2,
                      "Insufficient data": 3,
                    };
                    return (
                      rank[a.analysis.riskLevel] - rank[b.analysis.riskLevel]
                    );
                  })
                  .slice(0, 4)
                  .map(({ student, analysis }) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(student.id);
                        setScreen("Students");
                      }}
                      className="flex w-full flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-left hover:border-slate-600 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{displayStudentName(student.fullName)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {student.id} | {student.department}
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          {analysis.riskFlags[0]?.reason}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${riskStyle(analysis.riskLevel)}`}
                        >
                          {analysis.riskLevel}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {formatScore(analysis.score)}
                        </span>
                      </div>
                    </button>
                  ))}

                {records.every(
                  ({ analysis }) => analysis.riskFlags.length === 0,
                ) && (
                  <p className="text-sm text-slate-400">
                    No risk flags are present in this dataset.
                  </p>
                )}
              </div>
            </section>
          </section>
        ) : screen === "Students" ? (
          <section className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold">Student explorer</h3>
              <p className="mt-1 text-sm text-slate-400">
                Search for a student and review their score, risk reasons and
                indicator coverage.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by student ID, name or department..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-indigo-400"
                aria-label="Search students"
              />

              <select
                value={riskFilter}
                onChange={(event) =>
                  setRiskFilter(event.target.value as RiskFilter)
                }
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                aria-label="Filter by risk level"
              >
                <option value="All">All risk levels</option>
                <option value="High">High risk</option>
                <option value="Moderate">Moderate risk</option>
                <option value="Low">Low risk</option>
                <option value="Insufficient data">Insufficient data</option>
              </select>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400" aria-live="polite">
                {filteredRecords.length === 0
                  ? "No matching students"
                  : `Showing ${
                      pageSize === "all"
                        ? 1
                        : (effectivePage - 1) * pageSize + 1
                    } - ${
                      pageSize === "all"
                        ? filteredRecords.length
                        : Math.min(
                            effectivePage * pageSize,
                            filteredRecords.length,
                          )
                    } of ${filteredRecords.length} matching students`}
              </p>

              <label className="flex items-center gap-3 text-sm text-slate-300">
                <span className="shrink-0">Students per view</span>
                <select
                  value={String(pageSize)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPageSize(value === "all" ? "all" : Number(value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400"
                  aria-label="Students per view"
                >
                  <option value="all">Display all</option>
                  <option value="25">25 students</option>
                  <option value="50">50 students</option>
                  <option value="75">75 students</option>
                  <option value="100">100 students</option>
                </select>
              </label>
            </div>

            <div className="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <section className="space-y-3">
                {paginatedRecords.map(({ student, analysis }) => (
                  <button
                    type="button"
                    key={student.id}
                    onClick={() => setSelectedId(student.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedVisibleId === student.id
                        ? "border-indigo-400 bg-indigo-400/10"
                        : "border-slate-800 bg-slate-900 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{displayStudentName(student.fullName)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {student.id} | {student.department} | Year{" "}
                          {student.yearOfStudy}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${riskStyle(analysis.riskLevel)}`}
                      >
                        {analysis.riskLevel}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-slate-400">Success score</span>
                      <span className="font-semibold">
                        {formatScore(analysis.score)}
                        {analysis.score !== null ? "/100" : ""}
                      </span>
                    </div>
                  </button>
                ))}

                {filteredRecords.length === 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
                    No students match your search and risk filter.
                  </div>
                )}

                {filteredRecords.length > 0 &&
                  pageSize !== "all" &&
                  pageCount > 1 && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
                      <span className="text-xs text-slate-500">
                        Page {effectivePage} of {pageCount}
                      </span>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={effectivePage === 1}
                          onClick={() =>
                            setCurrentPage((page) => Math.max(1, page - 1))
                          }
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Previous
                        </button>

                        <button
                          type="button"
                          disabled={effectivePage === pageCount}
                          onClick={() =>
                            setCurrentPage((page) =>
                              Math.min(pageCount, page + 1),
                            )
                          }
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
              </section>

              <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                {selectedRecord ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Student profile
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold">
                          {displayStudentName(selectedRecord.student.fullName)}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {selectedRecord.student.id} | {" "}
                          {selectedRecord.student.department}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1.5 text-xs ${riskStyle(selectedRecord.analysis.riskLevel)}`}
                      >
                        {selectedRecord.analysis.riskLevel}
                      </span>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-xs text-slate-500">Success score</p>
                        <p className="mt-2 text-2xl font-semibold">
                          {formatScore(selectedRecord.analysis.score)}
                          {selectedRecord.analysis.score !== null ? "/100" : ""}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-xs text-slate-500">Data coverage</p>
                        <p className="mt-2 text-2xl font-semibold">
                          {selectedRecord.analysis.dataCoverage}%
                        </p>
                      </div>
                    </div>

                    <h4 className="mt-7 font-semibold">Integrated source data</h4>
                    <p className="mt-1 text-sm leading-5 text-slate-400">
                      Values come from the supplied student dataset. Unavailable values are not treated as zero.
                      The LMS login reporting period is unspecified.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          domain: "Academic",
                          items: [
                            { label: "Academic year", value: selectedRecord.student.sourceDetails?.academic?.academicYear },
                            { label: "SGPA", value: selectedRecord.student.sourceDetails?.academic?.sgpa },
                            { label: "CGPA", value: selectedRecord.student.academic.cgpa },
                            { label: "Exam score (%)", value: selectedRecord.student.academic.averageMarks },
                            { label: "Backlogs", value: selectedRecord.student.academic.backlogs },
                          ],
                        },
                        {
                          domain: "Attendance",
                          items: [
                            { label: "Overall attendance (%)", value: selectedRecord.student.attendance.overallPercentage },
                            { label: "Classes held", value: selectedRecord.student.sourceDetails?.attendance?.classesHeld },
                            { label: "Classes attended", value: selectedRecord.student.sourceDetails?.attendance?.classesAttended },
                          ],
                        },
                        {
                          domain: "LMS",
                          items: [
                            { label: "Login count (period unspecified)", value: selectedRecord.student.sourceDetails?.lms?.loginCount },
                            { label: "Time spent (hours)", value: selectedRecord.student.sourceDetails?.lms?.timeSpentHours },
                            { label: "Quiz average (%)", value: selectedRecord.student.sourceDetails?.lms?.quizAveragePct },
                            { label: "Assignments submitted", value: selectedRecord.student.lms.assignmentsCompleted },
                            { label: "Assignments assigned", value: selectedRecord.student.lms.assignmentsTotal },
                          ],
                        },
                        {
                          domain: "Engagement",
                          items: [
                            { label: "Events attended", value: selectedRecord.student.engagement.eventsAttended },
                            { label: "Club participation", value: selectedRecord.student.engagement.clubMember === null ? null : selectedRecord.student.engagement.clubMember ? "Yes" : "No" },
                            { label: "Projects completed", value: selectedRecord.student.sourceDetails?.engagement?.projectsCompleted },
                            { label: "Engagement level", value: selectedRecord.student.sourceDetails?.engagement?.engagementLevel },
                            { label: "Certifications", value: selectedRecord.student.engagement.certifications },
                          ],
                        },
                        {
                          domain: "Feedback",
                          items: [
                            { label: "Course rating (1-5)", value: selectedRecord.student.feedback.studentSatisfaction },
                            { label: "Faculty support (1-5)", value: selectedRecord.student.feedback.facultyFeedbackScore },
                            { label: "Learning satisfaction", value: selectedRecord.student.sourceDetails?.feedback?.learningSatisfaction },
                            { label: "Feedback comment", value: selectedRecord.student.sourceDetails?.feedback?.comment },
                          ],
                        },
                      ].map(({ domain, items }) => (
                        <div key={domain} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                          <h5 className="font-medium text-slate-200">{domain}</h5>
                          <dl className="mt-3 space-y-2">
                            {items.map(({ label, value }) => (
                              <div key={label} className="flex items-start justify-between gap-3 border-b border-slate-800/70 pb-2 last:border-0">
                                <dt className="text-xs text-slate-500">{label}</dt>
                                <dd className="max-w-[60%] break-words text-right text-xs text-slate-300">
                                  {formatSourceValue(value)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ))}
                    </div>

                    <div className="mt-7 grid gap-4 lg:grid-cols-2">
                      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div>
                            <h4 className="font-semibold">Skills &amp; Portfolio</h4>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Recorded categorical evidence; it is not a numeric skills assessment.
                            </p>
                          </div>
                          <span className="text-xs text-slate-500">
                            Assessment results not recorded
                          </span>
                        </div>
                        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                          {[
                            ["Primary skill", selectedRecord.student.sourceDetails?.skills?.primarySkill],
                            ["Python", selectedRecord.student.sourceDetails?.skills?.pythonLevel],
                            ["SQL", selectedRecord.student.sourceDetails?.skills?.sqlLevel],
                            ["Communication", selectedRecord.student.sourceDetails?.skills?.communicationLevel],
                            ["Projects completed", selectedRecord.student.sourceDetails?.engagement?.projectsCompleted],
                            ["Certifications", selectedRecord.student.engagement.certifications],
                          ].map(([label, value]) => (
                            <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-3">
                              <dt className="text-xs text-slate-500">{label}</dt>
                              <dd className="mt-1 text-sm font-medium text-slate-200">
                                {formatSourceValue(value as string | number | null | undefined)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </section>

                      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                        <h4 className="font-semibold">Placement Activity</h4>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Activity and outcomes are displayed separately from missing placement assessments.
                        </p>
                        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                          {[
                            ["Interest", selectedRecord.student.sourceDetails?.placement?.interest],
                            ["Internship", selectedRecord.student.sourceDetails?.placement?.internshipStatus],
                            ["Training hours", selectedRecord.student.sourceDetails?.placement?.trainingHours],
                            ["Applications", selectedRecord.student.sourceDetails?.placement?.applicationsCount],
                          ].map(([label, value]) => (
                            <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-3">
                              <dt className="text-xs text-slate-500">{label}</dt>
                              <dd className="mt-1 text-sm font-medium text-slate-200">
                                {formatSourceValue(value as string | number | null | undefined)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm">
                          <p className="text-xs text-slate-500">Recorded outcome — excluded from readiness-proxy inputs</p>
                          <p className="mt-1 text-slate-200">
                            {formatSourceValue(selectedRecord.student.sourceDetails?.placement?.status)}
                            {" | "}
                            {formatSourceValue(selectedRecord.student.sourceDetails?.placement?.offersCount)} offer(s)
                          </p>
                        </div>
                        {(() => {
                          const proxy = assessPlacementReadinessProxy(selectedRecord.student);
                          if (!proxy.eligible) {
                            return <p className="mt-3 text-xs text-slate-500">Readiness proxy is limited to Years 3–4.</p>;
                          }
                          return (
                            <p className="mt-3 text-xs leading-5 text-slate-500">
                              Readiness proxy: {proxy.score === null ? "insufficient input coverage" : `${proxy.score}/100`} ({proxy.coverage}% input coverage). Rule-based heuristic, not a placement prediction.
                            </p>
                          );
                        })()}
                      </section>
                    </div>

                    <h4 className="mt-7 font-semibold">Score breakdown</h4>
                    <div className="mt-3 space-y-3">
                      {[
                        [
                          "Academic",
                          selectedRecord.analysis.domainScores.academic,
                        ],
                        [
                          "Attendance",
                          selectedRecord.analysis.domainScores.attendance,
                        ],
                        ["LMS", selectedRecord.analysis.domainScores.lms],
                        [
                          "Placement",
                          selectedRecord.analysis.domainScores.placement,
                        ],
                        ["Skills", selectedRecord.analysis.domainScores.skills],
                        [
                          "Engagement",
                          selectedRecord.analysis.domainScores.engagement,
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={String(label)}
                          className="flex items-center justify-between border-b border-slate-800 pb-3 text-sm"
                        >
                          <span className="text-slate-400">{label}</span>
                          <span className="font-medium tabular-nums">
                            {formatDomainScore(String(label), value as number | null)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <h4 className="mt-7 font-semibold">Risk explanations</h4>
                    {selectedRecord.analysis.riskFlags.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {selectedRecord.analysis.riskFlags.map((flag) => (
                          <div
                            key={flag.id}
                            className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                          >
                            <p className="font-medium">{flag.label}</p>
                            <p className="mt-1 text-sm leading-5 text-slate-400">
                              {flag.reason}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                              {flag.severity} severity
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">
                        No risk flags for the available data.
                      </p>
                    )}

                    <h4 className="mt-7 font-semibold">Score drivers</h4>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-400">
                      {selectedRecord.analysis.scoreDrivers.map((driver) => (
                        <li key={driver}>{driver}</li>
                      ))}
                    </ul>

                    <h4 className="mt-7 font-semibold">Placement activity review</h4>
                    {(() => {
                      const activity = assessPlacementActivity(selectedRecord.student);
                      const accent =
                        activity.status === "review"
                          ? "border-amber-400/30 bg-amber-400/10"
                          : activity.status === "recorded"
                            ? "border-emerald-400/30 bg-emerald-400/10"
                            : "border-slate-800 bg-slate-950";
                      return (
                        <div className={`mt-3 rounded-xl border p-4 ${accent}`}>
                          <p className="font-medium">{activity.title}</p>
                          <p className="mt-2 text-sm leading-5 text-slate-400">{activity.rationale}</p>
                          <p className="mt-2 text-sm leading-5 text-slate-300">
                            Suggested action: {activity.suggestedAction}
                          </p>
                          <p className="mt-3 text-xs text-slate-500">
                            Workflow indicator only; not a prediction of placement outcomes.
                          </p>
                        </div>
                      );
                    })()}

                    <h4 className="mt-7 font-semibold">Formal score segments</h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedRecord.analysis.segments.length > 0 ? (
                        selectedRecord.analysis.segments.map((segment) => (
                          <span
                            key={segment}
                            className="rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1.5 text-xs text-indigo-200"
                          >
                            {segment}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">
                          No formal score segments apply to the available numeric inputs.
                        </span>
                      )}
                    </div>

                    <h4 className="mt-7 font-semibold">Profile signals</h4>
                    <p className="mt-1 text-sm leading-5 text-slate-400">
                      Evidence-grounded review signals, separate from score segments and risk labels.
                    </p>
                    {selectedProfileSignals.length > 0 ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {selectedProfileSignals.map((signal) => (
                          <div
                            key={signal.id}
                            className={`rounded-xl border p-4 ${
                              signal.tone === "support"
                                ? "border-amber-400/30 bg-amber-400/10"
                                : "border-cyan-400/30 bg-cyan-400/10"
                            }`}
                          >
                            <p className="font-medium">{signal.label}</p>
                            <p className="mt-1 text-sm leading-5 text-slate-400">
                              {signal.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        No additional profile signals can be supported by the recorded data.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400">
                    Select a student to view their profile.
                  </p>
                )}
              </section>
            </div>
          </section>
        ) : null}

        {screen === "Insights" ? (
          <section className="space-y-6">
            <div>
              <h3 className="text-2xl font-semibold">Cross-domain insights</h3>
              <p className="mt-2 text-sm text-slate-400">
                Descriptive comparisons across academic, attendance, LMS, and placement activity.
                Associations are not causal claims or validated predictions.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {correlationInsights.map((insight) => {
                const points = buildScatterPoints(students, insight.id);
                return (
                  <article key={insight.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <h4 className="font-semibold">{insight.title}</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      {insight.validPairs} valid pairs | Pearson r: {insight.correlation === null ? "N/A" : insight.correlation.toFixed(3)}
                    </p>
                    <div className="relative mt-4 h-36 overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                      <div className="absolute inset-0 grid grid-cols-4 grid-rows-3">
                        {Array.from({ length: 12 }, (_, index) => (
                          <div key={index} className="border-r border-t border-slate-800/70" />
                        ))}
                      </div>
                      {points.map((point) => (
                        <span
                          key={point.id}
                          title={point.id}
                          style={{ left: `${point.xPct}%`, bottom: `${point.yPct}%` }}
                          className="absolute h-2 w-2 -translate-x-1/2 rounded-full bg-indigo-300"
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between gap-2 text-xs text-slate-500">
                      <span>{insight.xLabel}</span>
                      <span>{insight.yLabel}</span>
                    </div>
                    <p className="mt-3 text-sm leading-5 text-slate-400">{insight.interpretation}</p>
                  </article>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h4 className="text-lg font-semibold">Department comparison</h4>
                <p className="mt-1 text-sm text-slate-500">Composite score averages use scored records only.</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr><th className="py-2">Department</th><th>Students</th><th>Scored</th><th>Avg. score</th><th>High risk</th></tr>
                    </thead>
                    <tbody>
                      {departmentSummaries.map((item) => (
                        <tr key={item.name} className="border-t border-slate-800">
                          <td className="py-3 pr-2">{item.name}</td>
                          <td>{item.studentCount}</td><td>{item.scoredCount}</td>
                          <td>{item.averageScore === null ? "N/A" : item.averageScore}</td>
                          <td>{item.highRiskCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h4 className="text-lg font-semibold">Year-level comparison</h4>
                <div className="mt-4 space-y-4">
                  {yearSummaries.map((item) => (
                    <div key={item.year}>
                      <div className="flex justify-between gap-3 text-sm">
                        <span>Year {item.year} | {item.count} students</span>
                        <span className="tabular-nums">{item.averageScore === null ? "N/A" : `${item.averageScore}/100`}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-indigo-400"
                          style={{ width: `${item.averageScore ?? 0}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.scoredCount} scored records</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h4 className="text-lg font-semibold">Data completeness by domain</h4>
              <p className="mt-1 text-sm text-slate-500">Populated fields divided by possible source fields; missing values remain unknown.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {completeness.map((item) => (
                  <div key={item.domain} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{item.domain}</span>
                      <span className="text-sm tabular-nums">{item.completenessPct}%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-800">
                      <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${item.completenessPct}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{item.populatedFields}/{item.possibleFields} populated fields</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h4 className="text-lg font-semibold">Placement-readiness proxy</h4>
              <p className="mt-1 text-sm leading-5 text-slate-400">
                Years 3-4 only. A transparent heuristic based on recorded academics, training, applications,
                internship activity, projects, certifications, and categorical skills. It is not a validated prediction.
                Offers and placement status are excluded from the score inputs.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr><th className="py-2">Student</th><th>Year</th><th>Proxy score</th><th>Input coverage</th><th>Interpretation</th></tr>
                  </thead>
                  <tbody>
                    {readinessRows.slice(0, 12).map(({ student, proxy }) => (
                      <tr key={student.id} className="border-t border-slate-800">
                        <td className="py-3 pr-3">
                          <div>{displayStudentName(student.fullName)}</div>
                          <div className="text-xs text-slate-500">{student.id}</div>
                        </td>
                        <td>{student.yearOfStudy}</td>
                        <td>{proxy.score === null ? "Insufficient data" : `${proxy.score}/100`}</td>
                        <td>{proxy.coverage}%</td>
                        <td className="text-xs text-slate-400">
                          {proxy.score === null ? "Review missing input data" : proxy.score < 50 ? "Readiness support review" : proxy.score < 75 ? "Develop skills and practice" : "Continue practice and assessment"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Showing the 12 lowest proxy scores or insufficient-data cases among eligible students.
                The ordinal mappings and factor weights are prototype assumptions, not validated measures.
              </p>
            </section>
          </section>
        ) : null}

        {screen === "Interventions" ? (
          <section className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold">Prioritized intervention queue</h3>
                <p className="mt-2 max-w-3xl text-sm leading-5 text-slate-400">
                  Rule-based prioritization for human review. Status changes live in this browser session only;
                  they are not persisted to a database.
                </p>
              </div>
              <button
                type="button"
                onClick={exportInterventionsCsv}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
              >
                Export full queue CSV
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {(["High", "Moderate", "Watch"] as const).map((severity) => (
                <div key={severity} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-sm text-slate-400">{severity} priority</p>
                  <p className="mt-2 text-3xl font-semibold">{interventions.filter((item) => item.severity === severity).length}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {interventions.slice(0, 30).map((item) => (
                <article key={item.studentId} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold">{displayStudentName(item.studentName)}</h4>
                        <span className={`rounded-full border px-2.5 py-1 text-xs ${item.severity === "High" ? "border-red-400/30 bg-red-400/10 text-red-300" : item.severity === "Moderate" ? "border-amber-400/30 bg-amber-400/10 text-amber-300" : "border-slate-700 text-slate-300"}`}>
                          {item.severity} | Priority {item.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.studentId} | {item.department} | Year {item.yearOfStudy}</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-400">
                      Workflow status
                      <select
                        value={interventionStatuses[item.studentId] ?? "New"}
                        onChange={(event) => setInterventionStatuses((previous) => ({
                          ...previous,
                          [item.studentId]: event.target.value as InterventionStatus,
                        }))}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Evidence / reasons</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                        {item.reasons.map((reason, index) => <li key={`${item.studentId}-${index}`}>{reason}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Suggested action</p>
                      <p className="mt-2 text-sm leading-5 text-slate-300">{item.suggestedAction}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Responsible team</p>
                      <p className="mt-2 text-sm leading-5 text-slate-300">{item.owner}</p>
                    </div>
                  </div>
                </article>
              ))}
              {interventions.length === 0 ? (
                <p className="rounded-xl border border-slate-800 p-5 text-sm text-slate-400">
                  No active risk flags or threshold watches were found in the available records.
                </p>
              ) : null}
            </div>
            <p className="text-xs text-slate-500">
              Displaying up to 30 interventions. CSV export includes the full queue. Confirm each record before acting.
            </p>
          </section>
        ) : null}
        <section aria-labelledby="team-heading" className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                THE PEOPLE BEHIND THE PROJECT
              </p>
              <h3 id="team-heading" className="mt-2 text-xl font-semibold text-slate-100">
                NULL FORGE
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                HacXLerate 2026 · Student Success Intelligence
              </p>
            </div>
            <p className="text-sm text-slate-500">Five-member team</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-xl border border-indigo-400/40 bg-indigo-400/10 p-4 sm:col-span-2 lg:col-span-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-white">Jetti Prasad</h4>
                <span className="rounded-full border border-indigo-300/30 px-2 py-1 text-xs font-semibold text-indigo-200">
                  TEAM LEAD
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Integration, architecture and release coordination
              </p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <h4 className="font-semibold text-slate-100">Amulya</h4>
              <p className="mt-2 text-sm text-slate-400">Documentation and testing</p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <h4 className="font-semibold text-slate-100">Bhavana</h4>
              <p className="mt-2 text-sm text-slate-400">Data validation</p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <h4 className="font-semibold text-slate-100">Lavanya</h4>
              <p className="mt-2 text-sm text-slate-400">Student explorer</p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <h4 className="font-semibold text-slate-100">Naseema</h4>
              <p className="mt-2 text-sm text-slate-400">Dashboard development</p>
            </article>
          </div>
        </section>

        <footer className="mt-6 border-t border-slate-800 py-5 text-xs leading-5 text-slate-500">
          <p>NULL FORGE · HacXLerate 2026</p>
          <p className="mt-1">
            Prototype demonstration. Risk indicators use transparent rules, not validated predictions.
            Missing inputs remain unscored.
          </p>
        </footer>
      </div>
    </main>
  );
}
