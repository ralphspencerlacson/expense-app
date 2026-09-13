# Expenses App

React expense tracking app backed by Supabase authentication and Postgres.

## Setup

1. Apply all files in `supabase/migrations` to the shared Supabase project in timestamp order (or run `supabase db push` with the Supabase CLI).
2. In Supabase, add `expense` to **Settings > API > Exposed schemas**.
3. Copy the variable names from `web/.env.example` into `web/.env` and provide the shared project's URL and publishable key.
4. Create a user in Supabase Authentication if the user does not already exist in the shared project.
5. Run `npm install` and `npm run dev` from `web`.

App tables live in the `expense` schema. Authentication remains in Supabase's shared `auth` schema, while database rows are protected with row-level security and scoped to the signed-in user. Browser-only prototype data can be reviewed and explicitly imported into the signed-in account. Matching IDs are kept, imports are atomic and retryable, and the browser backup is retained.

## Production flow

Apply `20260912120000_production_flow.sql` before running this frontend against an existing database. It adds optional transaction accounts, occurrence keys, reversible skips, schedule history, and an authenticated atomic-write function. It preserves existing records; ambiguous legacy links are left for manual reconciliation.

- Existing accounts open directly to the dashboard. New users can skip setup and immediately record transactions.
- Transaction forms retain their drafts on save failure and clear only after a successful write. Account names and notes are optional; accounts are labels, without opening balances or reconciliation.
- Confirming recurring income or bills asks for the actual amount and payment date. Confirmation is unique per user and occurrence, including across tabs. A payment in another month settles the original occurrence and contributes to the actual payment month.
- Schedule edits, pauses, and deletions take effect from the selected month. Earlier months use persisted prior values. Changes before the most recent revision are rejected. Changes within one month take effect for that whole month.
- Received recurring income can be marked not received, and paid recurring expenses can be marked unpaid. The existing record becomes pending and can be confirmed again without duplication.
- Skipped occurrences can be restored. They do not alter future months or actual transactions.
- Monthly net cashflow and charts are computed from confirmed transactions. They represent income minus expenses, rather than an account balance or accumulated savings.
- Import preview identifies matching transaction IDs. Different IDs are not automatically reconciled. Export downloads a JSON copy of the account's records.

## Validation

Run `npm test`, `npm run lint`, and `npm run build` from `web`. The tests apply the migrations to isolated PGlite PostgreSQL databases and cover atomic rollback, retries, ownership, occurrence uniqueness, legacy data, schedule revisions, skips, user deletion, and cashflow calculations. They do not connect to the shared Supabase project.

Before deploying, apply the forward migration to a staging copy of the existing database and verify sign-in, a failed save/retry, payment confirmation across months, import, and export with representative existing accounts. The frontend and migration must be released together. The migration cannot reconstruct schedule values changed before it was introduced.

For an existing staging database, run `supabase/checks/production_flow_preflight.sql` first using an administrative database connection. It checks baseline tables and row-level security, reports migration state and aggregate row counts, and flags ambiguous legacy links without modifying records. If production-flow columns or tables already exist, inspect the migration history before applying the forward migration again.

The frontend publishable key cannot apply SQL migrations. Migration access requires a Supabase CLI linked to the staging project or a PostgreSQL connection configured locally. Identify the staging target explicitly; the frontend's shared Supabase project is not automatically the staging target.

Income schedules support multiple paydays per month, each with its own amount and payment day. Add/remove paydays in the income form, source editor, or setup wizard. Existing first/second occurrence keys remain compatible; additional paydays use distinct keys. The stored `cutoff` schedule value now represents multiple monthly paydays; no additional database migration is needed. Monthly income is grouped by source, with one row per expected or received payment and expandable schedule details.
