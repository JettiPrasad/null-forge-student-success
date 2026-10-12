
-- NULL FORGE: Fictional student prototype schema
-- Source: data/sample/*.csv
-- Review with the team before applying to Supabase.
-- Missing source values must be imported as SQL NULL, never zero.

CREATE TABLE IF NOT EXISTS students (
    student_id TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    department TEXT NOT NULL,
    year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 4),
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8)
);

CREATE TABLE IF NOT EXISTS academic_metrics (
    student_id TEXT NOT NULL REFERENCES students(student_id),
    academic_year TEXT,
    semester INTEGER CHECK (semester BETWEEN 1 AND 8),
    sgpa NUMERIC CHECK (sgpa BETWEEN 0 AND 10),
    cgpa NUMERIC CHECK (cgpa BETWEEN 0 AND 10),
    backlog_count INTEGER CHECK (backlog_count >= 0),
    exam_score_pct NUMERIC CHECK (exam_score_pct BETWEEN 0 AND 100),
    PRIMARY KEY (student_id, academic_year, semester)
);

CREATE TABLE IF NOT EXISTS attendance_metrics (
    student_id TEXT NOT NULL REFERENCES students(student_id),
    semester INTEGER CHECK (semester BETWEEN 1 AND 8),
    classes_held INTEGER CHECK (classes_held >= 0),
    classes_attended INTEGER CHECK (classes_attended >= 0),
    attendance_pct NUMERIC CHECK (attendance_pct BETWEEN 0 AND 100),
    PRIMARY KEY (student_id, semester),
    CHECK (
        classes_held IS NULL
        OR classes_attended IS NULL
        OR classes_attended <= classes_held
    )
);

CREATE TABLE IF NOT EXISTS lms_metrics (
    student_id TEXT NOT NULL REFERENCES students(student_id),
    semester INTEGER CHECK (semester BETWEEN 1 AND 8),
    login_count INTEGER CHECK (login_count >= 0),
    time_spent_hours NUMERIC CHECK (time_spent_hours >= 0),
    assignments_submitted INTEGER CHECK (assignments_submitted >= 0),
    assignments_assigned INTEGER CHECK (assignments_assigned >= 0),
    quiz_avg_pct NUMERIC CHECK (quiz_avg_pct BETWEEN 0 AND 100),
    PRIMARY KEY (student_id, semester),
    CHECK (
        assignments_submitted IS NULL
        OR assignments_assigned IS NULL
        OR assignments_submitted <= assignments_assigned
    )
);

-- IMPORTANT:
-- The reporting period of login_count is unconfirmed.
-- Do not map it to Student.lms.loginsLast7Days yet.

CREATE TABLE IF NOT EXISTS engagement_metrics (
    student_id TEXT NOT NULL REFERENCES students(student_id),
    semester INTEGER CHECK (semester BETWEEN 1 AND 8),
    club_participation TEXT,
    events_attended INTEGER CHECK (events_attended >= 0),
    projects_completed INTEGER CHECK (projects_completed >= 0),
    engagement_level TEXT,
    PRIMARY KEY (student_id, semester)
);

CREATE TABLE IF NOT EXISTS placement_metrics (
    student_id TEXT PRIMARY KEY REFERENCES students(student_id),
    placement_interest TEXT,
    internship_status TEXT,
    training_hours NUMERIC CHECK (training_hours >= 0),
    applications_count INTEGER CHECK (applications_count >= 0),
    offers_count INTEGER CHECK (offers_count >= 0),
    placement_status TEXT
);

CREATE TABLE IF NOT EXISTS skills_metrics (
    student_id TEXT PRIMARY KEY REFERENCES students(student_id),
    primary_skill TEXT,
    python_level TEXT,
    sql_level TEXT,
    communication_level TEXT,
    certifications_count INTEGER CHECK (certifications_count >= 0)
);

CREATE TABLE IF NOT EXISTS feedback_metrics (
    student_id TEXT NOT NULL REFERENCES students(student_id),
    semester INTEGER CHECK (semester BETWEEN 1 AND 8),
    course_rating NUMERIC CHECK (course_rating BETWEEN 1 AND 5),
    faculty_support_rating NUMERIC CHECK (
        faculty_support_rating BETWEEN 1 AND 5
    ),
    learning_satisfaction TEXT,
    feedback_comment TEXT,
    PRIMARY KEY (student_id, semester)
);

-- Access/security:
-- No permissive RLS policies are defined here.
-- Do not import real student data.
-- Database credentials belong in local environment variables,
-- never committed to Git.
-- Team approval is required before deploying this schema.