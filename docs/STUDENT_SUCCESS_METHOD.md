# Student Success Score Methodology

## Purpose and limitations

This project demonstrates an explainable, rule-based student analytics workflow. The Student Success Score is a decision-support indicator, not a validated predictive model. Risk indicators are intended to support human review and should not be used as the sole basis for decisions about a student.

## Score composition

The configured domain weights are:

| Domain | Weight |
|---|---:|
| Academic | 35% |
| Attendance | 20% |
| LMS engagement | 15% |
| Placement assessment | 15% |
| Skills assessment | 10% |
| Engagement | 5% |

The configured weights total 100%. The score is calculated from available supported measurements. Missing measurements are not automatically converted to zero. Effective weight coverage indicates how much of the configured weighting is supported by available measurements. The overall score is withheld when effective coverage is below 50%.

## Input normalization

- Academic: CGPA is scaled to a 100-point basis; examination marks use percentage values.
- Attendance: attendance percentage.
- LMS: login activity is scored only when its measurement period is known; assignment completion is derived from submitted and assigned assignments.
- Placement assessment: average of available aptitude, coding and mock-interview assessment scores.
- Skills assessment: technical and soft-skill assessment scores.
- Engagement: available events, club participation, hackathon and certification measures are normalized according to the application's configured rules.

Only measurements actually supported by the source data should contribute to a score. Source fields that have different meanings must not be substituted for assessment inputs.

## Risk indicators

The current rule-based checks include:

- Academic support: CGPA below 5.5, examination marks below 50%, or at least one backlog. Severity is high for CGPA below 5.0, marks below 40%, or at least two backlogs; otherwise it is medium.
- Attendance support: attendance below 75%; high severity below 65%.
- Placement assessment: available placement assessment average below 55%; high severity below 40%.
- Overall score: score below 45 produces a medium-severity flag.

The overall risk level is high when a high-severity flag exists, moderate when other risk flags exist, insufficient data when no score is available and no flags exist, and low otherwise. These are heuristic thresholds, not empirically calibrated probabilities.

## Placement activity is separate

Placement activity records such as interest, internship status, training hours, applications and offers are displayed separately from placement assessment scores. They can prompt a follow-up review, but they do not replace missing aptitude, coding or mock-interview measurements.

## Source-data caveats

The sample contains 15 student records and has missing values. The source login count has no specified period, so it must not be represented as last-seven-days activity. Events attended are not equivalent to hackathons, projects completed are not hackathons, and categorical skill levels are not numeric skill-assessment scores. Unknown values remain unknown rather than being filled with fabricated measurements.

## Reproduction

Run these checks from the repository root:

- `npm run verify:dataset`
- `npm run verify:scoring`
- `npm run verify:release`
- `npx tsc --noEmit`
- `npm run build -- --webpack`

The application should be evaluated as a prototype using the supplied sample data. Further validation with authorized, representative data would be required before operational use.
