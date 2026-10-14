# NULL FORGE — Student Success Intelligence

An evaluation-focused prototype that brings academic, attendance, LMS,
engagement, placement activity, skills, and feedback evidence into an
explainable student-review workflow.

## Demo data and limitations

The app serves a **100-record demo cohort**: 15 original source records
(`NF-F001`–`NF-F015`) plus 85 deterministic generated demo records
(`NF-S016`–`NF-S100`). `data/sample` is the unchanged source baseline;
`data/demo` is the generated cohort used by the application. Missing values
remain unknown — they are never silently converted to zero.

Student Success Score is a transparent, rule-based decision-support indicator,
not a validated prediction of student or placement outcomes. The separate
Years 3–4 placement-readiness proxy is also a heuristic; it excludes offers
and placement status from its inputs.

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. The production API endpoint is
`/api/students`; it reports `demo-cohort`, 100 records, 15 source records,
and 85 generated records.

## Verify

```powershell
npx tsc --noEmit
npm run verify:scoring
npm run verify:dataset
npm run verify:analytics
npm run verify:release
npm run build
```

To recreate the deterministic demo cohort, run:

```powershell
npx tsx scripts/generate-demo-cohort.ts
```

See [the methodology](docs/STUDENT_SUCCESS_METHOD.md) for score weights,
coverage, risk rules, missing-data handling, and prototype limitations.

## Key Features

- Unified student profiles combining academic performance, attendance, LMS activity, engagement, placement-related evidence, skills, and feedback.
- Weighted Student Success Scores with domain-level evidence and explicit missing-data handling.
- Explainable rule-based risk flags with evidence and reasons.
- Student explorer with search, risk-level filtering, formal score-segment filtering, and pagination.
- Placement-readiness proxy for eligible Year 3–4 students, distinguished from actual placement outcomes.
- Analytics including correlations, department and year comparisons, and data-completeness summaries.
- Intervention queue with priority, explanations, suggested actions, responsible team, workflow status, and CSV export.
- Demonstration cohort of 100 records: 15 source records and 85 synthetic records.

## Technology Stack

| Area | Technology |
|---|---|
| Web framework | Next.js App Router |
| UI and language | React, TypeScript |
| Styling | Tailwind CSS |
| Runtime and package management | Node.js, npm |
| Analytics | TypeScript scoring rules and analytics utilities |
| Demonstration data | CSV files and validated application data loader |
| Version control | Git, GitHub |
| Deployment | Vercel |

### Prototype Limitations

NULL FORGE is a demonstration prototype. Its scores, risk flags, and placement-readiness values use explicit rules and heuristic mappings; they are not a trained or validated predictive AI model. Missing values are not silently replaced with zero. The 85 synthetic records are illustrative demonstration data, not actual student outcomes. Results demonstrate a decision-support workflow and are not validated claims about institutional performance.
