# HealthMood — TechMood Technology

This folder is an isolated, **static preview** for HealthMood, a health engagement product. It lives on the `feature/healthmood-demo-20261111` branch so the repository's other products and production branches are untouched.

## Current prototype
- Arabic RTL, mobile responsive interface
- Daily follow-up checklist and progress
- Demonstration medications and examinations, condition placeholders, appointments and doctor directory
- Learning XP and review badges; **no points for taking medications, missing doses or changing treatments**
- No localStorage, cookies, login, backend, medical database, patient records, data upload, or persistent state

## Important safety warning
**Do not use with real patient information.** This demonstration is not a medical service. Every example is synthetic and interaction is reset on reload. Vercel preview must not be represented as a production clinical product.

## Clinical backend prerequisites
Use a dedicated HealthMood project and database, not the TechMood education database. Before handling real data, implement and test: patient-controlled access grants, verified clinician identity, MFA, clinic isolation, Supabase RLS, private Storage, audit trails, secure consent handling, retention and deletion, emergency-access policy, incident response, and independent security/privacy review.

## Deployment
Vercel should use this repo with **Root Directory** `healthmood`. This is a no-build static app; `index.html` is the entry point. The connected repository is a temporary placement until a dedicated HealthMood repository is created.

Sources for a richer React/Vite prototype can be exported separately.