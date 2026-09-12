-- RetinaGuard PostgreSQL Migration

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. Patients
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    phone TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 3. Consultations
CREATE TABLE IF NOT EXISTS consultations (
    id TEXT PRIMARY KEY NOT NULL,
    patient_id TEXT NOT NULL,
    user_id TEXT,
    notes TEXT,
    consultation_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CONSTRAINT fk_consultation_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_consultation_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. Images
CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY NOT NULL,
    patient_id TEXT NOT NULL,
    consultation_id TEXT,
    image_path TEXT NOT NULL,
    eye TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CONSTRAINT fk_image_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_image_consultation
        FOREIGN KEY (consultation_id) REFERENCES consultations(id)
);

-- 5. Analysis Results
CREATE TABLE IF NOT EXISTS analysis_results (
    id TEXT PRIMARY KEY NOT NULL,
    image_id TEXT NOT NULL,
    result TEXT,
    confidence REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CONSTRAINT fk_analysis_image
        FOREIGN KEY (image_id) REFERENCES images(id)
);

-- 6. Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY NOT NULL,
    analysis_result_id TEXT NOT NULL,
    user_id TEXT,
    review TEXT,
    status TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CONSTRAINT fk_review_analysis
        FOREIGN KEY (analysis_result_id) REFERENCES analysis_results(id),
    CONSTRAINT fk_review_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 7. Sync Queue
CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 8. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    details TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);