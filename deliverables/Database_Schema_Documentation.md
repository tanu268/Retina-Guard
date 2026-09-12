# RetinaGuard Database Schema Documentation

## 1. Overview

RetinaGuard uses two databases:

- SQLite – Local/offline database on the technician device.
- Supabase PostgreSQL – Cloud database used for centralized storage.

The SQLite database stores data locally. When connectivity is available, the backend syncs pending records from SQLite to PostgreSQL.

---

## 2. Database Tables

The RetinaGuard database contains the following tables:

1. users
2. patients
3. consultations
4. images
5. analysis_results
6. reviews
7. sync_queue
8. audit_logs

---

## 3. users

### Purpose
Stores information about system users.

| Column | Data Type | Key | Description |
|---|---|---|---|
| id | TEXT | Primary Key | Unique user identifier |
| name | TEXT | — | User name |
| email | TEXT | — | User email |
| role | TEXT | — | User role |
| created_at | TEXT | — | Record creation time |
| updated_at | TEXT | — | Last update time |

---

## 4. patients

### Purpose
Stores basic information about patients.

| Column | Data Type | Key | Description |
|---|---|---|---|
| id | TEXT | Primary Key | Unique patient identifier |
| name | TEXT | — | Patient name |
| age | INTEGER | — | Patient age |
| gender | TEXT | — | Patient gender |
| phone | TEXT | — | Patient phone number |
| created_at | TEXT | — | Record creation time |
| updated_at | TEXT | — | Last update time |

---

## 5. consultations

### Purpose
Stores consultation records associated with patients and users.

| Column | Data Type | Key | Description |
|---|---|---|---|
| id | TEXT | Primary Key | Unique consultation identifier |
| patient_id | TEXT | Foreign Key | References patients(id) |
| user_id | TEXT | Foreign Key | References users(id) |
| notes | TEXT | — | Consultation notes |
| consultation_date | TEXT | — | Date of consultation |
| created_at | TEXT | — | Record creation time |
| updated_at | TEXT | — | Last update time |

---

## 6. images

### Purpose
Stores image information associated with patients and consultations.

| Column | Data Type | Key | Description |
|---|---|---|---|
| id | TEXT | Primary Key | Unique image identifier |
| patient_id | TEXT | Foreign Key | References patients(id) |
| consultation_id | TEXT | Foreign Key | References consultations(id) |
| image_path | TEXT | — | Path of stored image |
| eye | TEXT | — | Eye information |
| created_at | TEXT | — | Record creation time |
| updated_at | TEXT | — | Last update time |

---

## 7. analysis_results

### Purpose
Stores AI analysis results generated from retinal images.

| Column | Data Type | Key | Description |
|---|---|---|---|
| id | TEXT | Primary Key | Unique analysis result identifier |
| image_id | TEXT | Foreign Key | References images(id) |
| result | TEXT | — | Analysis result |
| confidence | REAL | — | Confidence score |
| created_at | TEXT | — | Record creation time |
| updated_at | TEXT | — | Last update time |

---

## 8. reviews

### Purpose
Stores review information for AI analysis results.

| Column | Data Type | Key | Description |
|---|---|---|---|
| id | TEXT | Primary Key | Unique review identifier |
| analysis_result_id | TEXT | Foreign Key | References analysis_results(id) |
| user_id | TEXT | Foreign Key | References users(id) |
| review | TEXT | — | Review information |
| status | TEXT | — | Review status |
| created_at | TEXT | — | Record creation time |
| updated_at | TEXT | — | Last update time |

---

## 9. sync_queue

### Purpose
Tracks records that need to be synchronized from the local SQLite database to PostgreSQL.

| Column | Data Type | Key | Description |
|---|---|---|---|
| id | TEXT | Primary Key | Unique queue item identifier |
| table_name | TEXT | — | Name of the table being synchronized |
| record_id | TEXT | — | ID of the record being synchronized |
| operation | TEXT | — | Operation such as INSERT |
| status | TEXT | — | PENDING, SYNCED or FAILED |
| retry_count | INTEGER | — | Number of retry attempts |
| created_at | TEXT | — | Queue creation time |
| updated_at | TEXT | — | Last update time |

---

## 10. audit_logs

### Purpose
Stores audit information about database/user actions.

| Column | Data Type | Key | Description |
|---|---|---|---|
| id | TEXT | Primary Key | Unique audit log identifier |
| user_id | TEXT | Foreign Key | References users(id) |
| action | TEXT | — | Action performed |
| table_name | TEXT | — | Related table name |
| record_id | TEXT | — | Related record identifier |
| details | TEXT | — | Additional information |
| created_at | TEXT | — | Record creation time |
| updated_at | TEXT | — | Last update time |

---

## 11. Relationships

The main foreign-key relationships are:

- consultations.patient_id → patients.id
- consultations.user_id → users.id
- images.patient_id → patients.id
- images.consultation_id → consultations.id
- analysis_results.image_id → images.id
- reviews.analysis_result_id → analysis_results.id
- reviews.user_id → users.id
- audit_logs.user_id → users.id

---

## 12. Synchronization Flow

The synchronization process works as follows:

1. Data is stored in SQLite.
2. A sync_queue entry is created for the required operation.
3. The background queue worker checks for pending records.
4. Pending records are uploaded to PostgreSQL.
5. Successfully synchronized records are marked as SYNCED.
6. Failed operations can be retried using retry_count.

---

## 13. Database Architecture

SQLite is used as the local/offline database, while Supabase PostgreSQL is used as the cloud database.

The backend acts as the bridge between the local SQLite database and the PostgreSQL database.