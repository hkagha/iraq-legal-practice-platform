# send-queued-emails — NOT YET IMPLEMENTED

The `public.email_queue` table accumulates outbound emails (notifications,
invoice receipts, invitations, password resets) but no sender is wired up.

## Status
Email sending requires either:
- **Lovable Emails** (recommended): an email domain must first be configured
  via Cloud → Emails → Manage Domains. This delegates a subdomain
  (e.g. `notify.qanuni.online`) to Lovable's nameservers and provisions the
  built-in `process-email-queue` dispatcher + `send-transactional-email`
  edge function. After domain setup completes, the queue can be drained by
  invoking `send-transactional-email` per row. No API key needed.
- **Resend (or other 3rd-party API)**: a `RESEND_API_KEY` secret must be
  configured in Supabase Edge Function secrets, and `qanuni.online` must
  be verified in the Resend dashboard.

## Next steps (pick one)
1. Set up Lovable Emails domain in Cloud → Emails, then ask the agent to
   wire `email_queue` → `send-transactional-email` and schedule a 5-minute
   pg_cron drain job.
2. Add `RESEND_API_KEY` to Edge Function secrets, then ask the agent to
   build `send-queued-emails` against the Resend API.

Until one of the above is done, queued emails will sit in `email_queue`
with `status='pending'` indefinitely — no data loss, just no delivery.
