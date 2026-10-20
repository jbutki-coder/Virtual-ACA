# Virtual ACA

A free static finder for online and hybrid Adult Children of Alcoholics & Dysfunctional Families meetings. Independent project, not affiliated with or endorsed by ACA WSO.

## Features

- “Now,” day and week views, language and time filters, search, local timezone conversion, and recurring meeting days.
- Clickable published room/access links, group instructions, passcodes when published, and source IDs. Meetings requiring contact remain listed without invented room links.
- A daily meditation card linking to the complete **Strengthening My Recovery** reading on ACA's official website. Only the reading title/date are stored; ACA blocks iframe embedding and the full copyrighted readings are not republished.
- Static HTML/CSS/JavaScript delivered through Render's CDN: no paid web server, no server wake-up, no API keys or database.

## Run

Node.js 22+; no dependencies to install.

```sh
npm run refresh  # Fetch public ACA meeting data (several minutes)
npm test
npm run build    # Copy validated assets into dist
npm start        # Local preview at http://localhost:3001
```

## Render

Create a **Static Site**, connect this repository, choose `main`, use build command `npm test && npm run build`, and publish directory `dist`. Auto-deploy should be enabled. `render.yaml` provides equivalent Blueprint configuration. Do not select a paid web service or cron job.

Render static sites have no compute charge and do not sleep; account bandwidth/build allowances still apply. GitHub Actions uses standard hosted runners in this public repository. No paid resources are configured.

## Updates and source limitations

The `Refresh ACA directory` workflow runs daily at 06:37 UTC and can also run manually from Actions. It fetches all pages of the public ACA WSO search endpoint and additional recurring-day details, then commits a sanitized snapshot. Render deploys the commit automatically. The browser's Refresh list button reloads that published snapshot; it does not scrape ACA on each visit.

Upstream failures abort the meeting update and retain the last complete snapshot. The page shows the update date and warns after 48 hours. GitHub may delay scheduled runs or disable schedules after prolonged repository inactivity; check Actions if the date stops advancing. Source records can be outdated, restricted, or have incomplete room details. Honor the group instructions and use its ACA ID in the official directory to confirm details.

The source does not supply meeting end times. “Now” means started within the last hour or starting within three hours, not a guarantee that a meeting is still running. Local-time conversions use each group's IANA timezone and the actual occurrence date to handle daylight-saving changes.

Meeting data: https://adultchildren.org/meeting-search/

Daily meditation: https://adultchildren.org/literature/meditation/
