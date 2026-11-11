# PayMood | TechMood Technology

Arabic-first, mobile-first **preview of a payment-management center**. PayMood is one independent product in the TechMood ecosystem.

## Current state

- **Preview, not production finance software.** No real payment processor, wallet, stored value, financial transaction, bank account, or cash transfer.
- Responsive dashboard (Arabic RTL, light/dark mode), draft payment requests, local search and product filters, draft CSV export, product integrations roadmap, payment methods placeholder, reports based on draft **counts only**.
- Drafts are written to the **browser's localStorage only**. They do not leave the device, cannot be verified, and are not evidence of payment.
- **Do not enter real personal, payment, banking, or sensitive data.** Use test names for preview.

## Deployment

A standalone static site in the \`paymood/\` root directory within \`IbrahemJBadawi/IbrahemJBadawi\`. Vercel project: \`paymood\`. No dependency install or build step required.

The shared hosting repository is only an interim location because repository creation is not available through the connected GitHub actions. It does not modify the existing products.

## Release gates before production

1. Decide what licensed external parties actually collect, hold, settle, or refund funds, then obtain any necessary legal/regulatory review.
2. Implement an authenticated, server-side request API with tenant/product isolation and RLS. Use independent protected tables; never expose service-role keys.
3. Ensure every request has a unique \`source_product\`, \`external_order_id\`, immutable source amount/currency, and idempotency key.
4. Separate \`proof_submitted\` from \`settled\` / \`confirmed\`. Only authorized reviewers and externally reconciled provider events may confirm received funds.
5. Make audit events append-only, verify concurrency safety, protect receipts and account identifiers, and test RBAC/RLS.
6. Reconcile daily against actual payment-provider/bank records; implement dispute, refund, and retention processes.
7. Connect products with scoped signed server-to-server APIs. Never exchange medical/learning/private records with PayMood.
8. Add production authentication, database migrations, observability, automated tests, and release checks.

No claim of working external payment integrations. TechMood XP/streak points are **not money**. Do not deploy a top-up / cash-out / balance feature without licensing and trusted partner integration.

## Files

- \`index.html\` — semantic RTL layout, icons and application shell.
- \`styles.css\` — responsive TechMood-inspired design system.
- \`app.js\` — local-only draft creation, search, filtering, CSV export, theme and navigation.
- \`favicon.svg\` — custom PayMood mark.
- \`vercel.json\` — static hosting security headers.
