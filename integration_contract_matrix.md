# RetinaGuard Integration Contract Matrix

| Field | Canonical Name | Type | Nullable | Authoritative Source | Created By | Persisted In | Returned By | Consumed By |
|---|---|---|---|---|---|---|---|---|
| **Case UUID** | `case_uuid` | UUID | No | Backend | `consultationService` | `consultations.id` | `GET /case/:case_uuid` | Frontend, Services |
| **Patient ID** | `patient_id` | String | No | Frontend/Backend | Technician | `consultations.patient_id` | `GET /case/:case_uuid` | Frontend |
| **Image ID** | `image_id` | UUID | No | Backend | `imageService` | `images.id` | `GET /case/:case_uuid` | Frontend |
| **Analysis ID**| `analysis_id` | UUID | No | Backend | `analysisService` | `analyses.id` | N/A | Reviewer, Explanations |
| **Review ID** | `decision_uuid` | UUID | No | Backend | `reviewerService` | `reviews.id` | `POST /review` | Frontend |
| **Status** | `status` | String | No | Backend | `consultationService` | `consultations.status` | `GET /case`, `GET /queue` | Frontend |
| **Severity** | `severity` | Number | Yes | Model/AI | `analysisService` | `analyses.dr_grade_code` | `GET /queue` | Reviewer UI |
| **Quality Score**| `quality_score` | Number | Yes | Model/AI | `imageService` | `images.quality_score` | `GET /queue` | Reviewer UI |
| **Model Version**| `model_version` | String | No | Environment | `matlabService` | Configuration | `GET /model` | Audit/Traceability |
| **Explanation**| `explanation` | Object | Yes | Backend | `cases.controller` | N/A | `GET /case/:case_uuid` | Reviewer UI |
| **Created At** | `created_at` | Date | No | Backend | SQLite | `consultations.created_at` | `GET /case/:case_uuid` | Frontend |
| **Updated At** | `updated_at` | Date | No | Backend | SQLite | `consultations.updated_at` | N/A | Audit/Traceability |
