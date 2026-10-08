# Birthday Desk

Registration page + daily reminder to the admin, hosted on Vercel.

## Setup
1. Supabase: create a free project, run `schema.sql` in the SQL editor, then import `birthdays.csv` into the `birthdays` table (Table Editor > Import).
2. Copy `.env.example` values into Vercel > Project > Settings > Environment Variables.
3. Push this folder to GitHub and import the repo in Vercel (Framework preset: Other).
4. Open `/admin.html`, enter the admin password, and press "Send test reminder".

## Pages
- `/` member registration form
- `/admin.html` admin list (password protected)

## Notes
- The cron job runs daily at 06:00 UTC (see `vercel.json`). On the free plan Vercel may fire it anywhere in that hour.
- Change channel with `NOTIFY_CHANNEL` (telegram, email or whatsapp). Nothing else changes.
