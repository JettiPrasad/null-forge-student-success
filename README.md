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
