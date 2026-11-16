# HealthMood — wearable data integration plan

Status: **architecture only; no live device connection, permission request, API keys, or protected health storage has been deployed**.

## Current public prototype
The HealthMood homepage shows synthetic examples of heart rate, daily steps, sleep time, and blood pressure. It also contains a GitHub-style 12-week activity grid, a 7-day medication-*review* grid, a reports panel, and sample care contexts for general wellness, hypertension, diabetes, epilepsy, and Behçet disease. All values are deterministic sample figures. Neither the device integration panel nor the charts reads from a sensor or a real patient. Nothing is persisted. **Do not enter real medical data in this frontend**.

## Integration architecture
1. **Android native companion app** — request explicit per-type access through Health Connect for heart rate, steps, sleep sessions, and blood-pressure *records when a trusted device/app actually supplies them*. Implement a foreground/background syncing policy where users can revoke access. Be alert for multiple data sources and avoid double-counting step records.
2. **iOS native companion app** — read authorized data from Apple HealthKit with data-type-specific read permissions. A browser-only static app cannot replace this HealthKit integration.
3. **Other wearables** — vendor-approved partner routes for Garmin, Fitbit/Google Health APIs, etc., subject to approval, permissions, and compatible devices. Never suggest all brands sync from a bare web page.
4. **Ingestion pipeline** — authenticated app -> consent ledger -> protected ingestion endpoint -> validated event store (separate HealthMood backend), with fields: patient_id, metric_type, recorded_at, received_at, source_provider, source_device_id, units, value, measurement_method, quality_flags. Deduplicate by source record ID, restrict access through server authorization and RLS.
5. **Patient dashboard** — time-series queries should preserve source, timestamp, and units; render missing data as "not connected" instead of zero; permit user-requested export/deletion, permissions revocation, and care-team sharing *only after explicit consent*. Clinicians must be verified before access.
6. **Pressure and glucose** — do not infer blood pressure from a pulse sensor. Accept readings only from a validated compatible monitor, clinician-approved source, or manually entered observation with source clearly labeled. Sensor data is informational and is not a diagnosis or autonomous treatment advice.

## Medication and engagement constraints
- An activity-grid cell means a *review/logging event*, never "medication taken" unless the patient explicitly records that fact in a secure product with relevant supporting design.
- Do not incentivize extra doses, tests, or clinically "good" readings with XP.
- No streak penalty for hospitalization, disability, or illness. Provide pause/skip controls with no guilt mechanics.
- Alert thresholds require clinician review and careful triage design; do not hard-code universal dangerous/healthy thresholds.

## Prerequisites before actual data import
- Dedicated HealthMood backend and private medical database, account authentication, MFA where appropriate.
- Privacy impact assessment, purpose limitation, encryption in transit/at rest, row-level security, audit trails, retention and consent policies.
- Independent clinical and security review, verified clinical sources, robust incident response, accessibility and localized UI.
- Concrete user permission for each health-data type and platform; don't connect the device or export data silently.

## Official developer references
- Android Health Connect data types: https://developer.android.com/health-and-fitness/health-connect/data-types
- Android reading records: https://developer.android.com/health-and-fitness/health-connect/read-data
- Apple HealthKit: https://developer.apple.com/design/human-interface-guidelines/healthkit
- Garmin Connect Health API: https://developer.garmin.com/gc-developer-program/enterprise/health-api/
