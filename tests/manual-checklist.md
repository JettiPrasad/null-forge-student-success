# Manual Release Checklist

## Dashboard behavior
- [ ] Overview loads without browser-console errors.
- [ ] KPI totals and risk distribution display correctly.
- [ ] Search works by student ID and name.
- [ ] Risk filter returns the expected students.
- [ ] Student profile shows score, data coverage, breakdown and explanations.
- [ ] Integrated source details display available values and mark missing values as unavailable.
- [ ] Placement activity review displays its reason and suggested action when applicable.
- [ ] Layout remains usable at desktop and narrow/mobile widths.

## Data integrity
- [ ] `/api/students` returns HTTP 200 and source `bhavana-sample`.
- [ ] API returns 15 unique student records.
- [ ] All seven source domains are represented where data is available.
- [ ] Unspecified login period is not mislabeled as last-seven-days activity.
- [ ] Events attended and projects completed are not represented as hackathons.
- [ ] Categorical skill levels are not fabricated into numeric assessment scores.
- [ ] Missing data remains missing rather than being zero-filled.
- [ ] Records below the score-coverage threshold have no fabricated score.

## Automated verification
- [ ] `npm run verify:dataset`
- [ ] `npm run verify:scoring`
- [ ] `npm run verify:release`
- [ ] `npx tsc --noEmit`
- [ ] `git diff --check`
- [ ] `npm run build -- --webpack`

## Security and submission
- [ ] No credentials, access tokens, `.env.local` contents or private data are committed.
- [ ] Repository visibility matches the hackathon submission requirements.
- [ ] Deployment protection does not block an unauthenticated judge.
- [ ] Production URL opens in a private/incognito session.
- [ ] Dashboard and API work on the public deployment.
- [ ] Demo claims match the deployed implementation and sample data.
