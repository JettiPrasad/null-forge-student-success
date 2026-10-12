# NULL FORGE — Sample Student Data

This folder contains fictional student datasets for prototype development and team discussion. No real student personal data is included.

## Datasets

* Students.csv — Student master records
* Academic.csv — Academic performance
* Attendance.csv — Attendance records
* LMS.csv — Learning management system activity
* Engagement.csv — Student participation
* Placement.csv — Placement information
* Skills.csv — Student skills
* Feedback.csv — Student feedback
* Data_Dictionary.csv — Field definitions
* Checklist.csv — Data preparation checklist

## Data Rules

All eight master and domain datasets use `student_id` as their common identifier.

All original source fields must be preserved.

Missing values must never automatically be converted to zero. Explicit `Missing` markers should be converted to `null` during application parsing.

## LMS Limitation

The reporting period of `LMS.login_count` is currently unknown. It must not automatically be treated as `loginsLast7Days`.

## Integration

The canonical Student interface is defined in `src/lib/types.ts`. Prasad will finalize the canonical data mapping before any Supabase import.

No datasets have been imported into Supabase.
