# NULL FORGE — Component Contract

## Shared data source

- Student records use `src/lib/types.ts`.
- Scores and risk flags come from `src/lib/scoring.ts`.
- The initial development data comes from `src/lib/mock-students.ts`.
- Dashboard aggregation and component interfaces come from `src/lib/view-model.ts`.
- Never duplicate or invent the score formula inside a UI component.
- Missing values remain null and must not be displayed as zero.

## Naseema — Dashboard

Own:

- src/components/dashboard/DashboardOverview.tsx
- src/components/dashboard/KpiCards.tsx
- src/components/dashboard/RiskDistributionChart.tsx
- src/components/dashboard/ScoreDistributionChart.tsx

Requirements:

- Use DashboardOverviewProps from the shared view-model.
- Show total students, average score, high-risk count and insufficient-data count.
- Show risk distribution and score distribution.
- Call onSelectStudent(studentId) when a dashboard item opens a student.
- Show an appropriate empty state when data is unavailable.

## Lavanya — Student Explorer

Own:

- src/components/students/StudentExplorer.tsx
- src/components/students/StudentProfile.tsx

Requirements:

- Use StudentExplorerProps and StudentProfileProps.
- Search by student name or ID.
- Filter by department and risk level.
- Show score, risk level and data coverage.
- Explain each risk using the reason returned by scoring.ts.
- Show score drivers and student segments.
- Do not create a second score calculation.

## Bhavana — Data validation and Supabase

Own:

- src/lib/data-validation.ts
- supabase/schema.sql

Requirements:

- Validate IDs, numeric ranges and required fields.
- Preserve missing values as null.
- Use fictional demo records only.
- Keep the database schema consistent with types.ts.
- Document database access and required environment variables.
- Do not expose secrets or create permissive policies for real student data.

## Amulya — Documentation and manual testing

Own:

- docs/STUDENT_SUCCESS_METHOD.md
- docs/DEMO_SCRIPT.md
- tests/manual-checklist.md

Requirements:

- Explain the proposed prototype scoring method and its limitations.
- Write reproducible test steps and record pass/fail results.
- Prepare a demo script that matches the actual application.
- Do not claim unimplemented features are working.

## Prasad — Integration

Own:

- src/app/page.tsx
- integration and release coordination

Requirements:

- Build analyzed records with buildAnalyzedStudents().
- Build KPI summaries with summarizeDashboard().
- Connect the dashboard and student explorer using the shared props.
- Review pull requests and run verification plus production build.
- Keep main as the integrated, working version.

## Git workflow

- Work only on your assigned branch.
- Do not push directly to main.
- Commit small, understandable changes.
- Open a pull request targeting main.
- Include the test result and a screenshot where useful.
- Merge only after review and successful verification.
