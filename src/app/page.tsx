"use client";

import { useMemo, useState } from "react";
import { mockStudents } from "@/lib/mock-students";
import { buildAnalyzedStudents, summarizeDashboard } from "@/lib/view-model";
import type { OverallRiskLevel } from "@/lib/types";

type RiskFilter = "All" | OverallRiskLevel;
type Screen = "Overview" | "Students";

function formatScore(score: number | null): string {
  return score === null ? "N/A" : score.toFixed(1);
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
  const [selectedId, setSelectedId] = useState("S001");

  // One shared analysis result per student.
  const records = useMemo(() => buildAnalyzedStudents(mockStudents), []);

  const summary = useMemo(() => summarizeDashboard(records), [records]);

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

  const selectedRecord =
    records.find(({ student }) => student.id === selectedId) ?? null;

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
              Synthetic data
            </span>
          </div>
        </div>
      </header>

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
          {(["Overview", "Students"] as const).map((item) => (
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
                label="Insufficient data"
                value={String(summary.insufficientDataCount)}
                helper="Not enough weighted inputs for a score"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="text-lg font-semibold">Risk distribution</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Students grouped by their current rule-based risk level.
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
                    ["Placement readiness", summary.placementRiskCount],
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
                  View all students →
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
                        <p className="font-medium">{student.fullName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {student.id} · {student.department}
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
        ) : (
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
                onChange={(event) => setSearch(event.target.value)}
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

            <p className="text-xs text-slate-500">
              Showing {filteredRecords.length} of {records.length} students
            </p>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <section className="space-y-3">
                {filteredRecords.map(({ student, analysis }) => (
                  <button
                    type="button"
                    key={student.id}
                    onClick={() => setSelectedId(student.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedId === student.id
                        ? "border-indigo-400 bg-indigo-400/10"
                        : "border-slate-800 bg-slate-900 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{student.fullName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {student.id} · {student.department} · Year{" "}
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
                          {selectedRecord.student.fullName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {selectedRecord.student.id} ·{" "}
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
                            {value === null ? "No data" : `${value}/100`}
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

                    <h4 className="mt-7 font-semibold">Student segments</h4>
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
                          No segments assigned.
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">
                    Select a student to view their profile.
                  </p>
                )}
              </section>
            </div>
          </section>
        )}

        <footer className="mt-10 border-t border-slate-800 py-5 text-xs leading-5 text-slate-500">
          NULL FORGE · HackXLerate 2026 prototype · Fictional demonstration data
          · Risk indicators are transparent rules, not validated predictions.
          Missing input data is shown as unavailable.
        </footer>
      </div>
    </main>
  );
}
