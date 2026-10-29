# Veritas Hub

A student-focused campus helper prototype for Veritas University. It includes campus services, keke trip notes, food/vendor pages, marketplace, lost and found, resources, classroom links and Q&A, student forum, private sticky notes, study facts, themes, and a shared website feedback/activity feed.

## Development status: work in progress

Veritas Hub is an independent student project intended to make campus life easier. Development is ongoing. The following are known limitations identified during a code review; they are not a claim that every issue has been reproduced in a live browser test.

- Some areas still save data only in the current browser, so they will not automatically appear on another device.
- The keke planner saves a trip note; it does not dispatch a driver or confirm a real fare.
- Shared posts and feedback depend on Supabase being reachable and its table permissions allowing the request.
- Marketplace contact opens WhatsApp; the site does not process payments or verify sellers and listings.
- Campus place labels and route information are a pilot and should be checked with students before being treated as official directions.
- Community ratings and issue reports are user-submitted and are not independently verified.

**These are known issues under development, not the end of the project.** Features will be improved as testing, student feedback and resources allow. Students are welcome to try the available features and report problems. Please verify important campus directions and transport details independently while navigation and transport features are being tested.

## Publish the website on GitHub Pages

This project is a static website. The main app is `index.html`, so it can be hosted free with GitHub Pages and opened from a phone or any computer.

1. Sign in to GitHub and create a **new repository**. For a public demo, set it to **Public**. A repository name such as `veritas-hub` is fine.
2. In the repository, choose **Add file → Upload files**.
3. Upload the *contents* of this folder (especially `index.html`, the `.sql` files, and this README) into the repository's top level. Do not upload only the ZIP file, and do not leave `index.html` buried inside another folder.
4. Commit the files to the `main` branch.
5. Open **Settings → Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**, select branch `main` and folder `/(root)`, then save.
7. Wait for GitHub Pages to finish. The published URL will appear in **Settings → Pages**. Open that URL on your phone to test it.

Every time you update the website, upload the changed files and commit again. You will not need to carry your PC just to open the hosted website.

## Supabase and shared data

The app is configured with the project's browser-safe Supabase URL and publishable key. A publishable key is expected to be visible in browser code; **never put a `service_role` or `sb_secret_` key in this repository**.

The website needs the Supabase database and row-level security policies to permit each feature's intended public reads/writes. The SQL files are provided for setup/reference:

- `supabase-forum-setup.sql` — forum tables and policies.
- `supabase-shared-system-setup.sql` — shared content table and media bucket policies.
- `supabase-private-notes-setup.sql` — authenticated private notes table/policies.
- `supabase-feedback-inbox-fix.sql` — enables the shared feedback feature and policies.

You have already run the feedback/inbox migration and received **“Success. No rows returned”**. Do not rerun setup scripts unnecessarily. If the live site shows a Supabase error, use the app's **Customize app → Shared forum settings → Test connection** and fix the specific policy/table error rather than blindly rerunning every SQL file.

## Important data and safety notes

- Public shared posts, feedback, marketplace listings, classroom links, and uploaded images may be visible to other visitors. Do not post passwords, student IDs, private documents, or sensitive personal information.
- Marketplace contact opens WhatsApp; the website does not handle payments or verify sellers. Meet only in a safe public campus location, preferably during the day, and confirm details before paying.
- Sticky notes and some preferences are device-local unless the private-notes sign-in/sync feature is used. Local browser data does not automatically move to another device.
- The student/lecturer role picker is a demo convenience, **not secure account authentication**. Do not rely on it for staff-only permissions.
- The inbox is a community activity feed, not private direct messaging. Shared items may need a manual refresh to appear.
- Campus map labels, routes, and service information are a prototype and should be verified with the university/community before relying on them as official directions.
- This is a student project prototype, not an official university service.

## Quick test after publishing

1. Open the public GitHub Pages URL and check that the home page loads on mobile and desktop.
2. Open **Customize app → Shared forum settings → Test connection**.
3. Submit a test website rating from **Rate & report issues** and confirm it appears in the feedback list and **Updates & messages**.
4. Open the same public URL in another browser/device and refresh. Confirm the test feedback appears there too.
5. Test one forum post and one marketplace listing, then check they appear on the other device.
6. Delete any test records that should not remain public, using the relevant database tools if the app does not offer a delete action.

## Files

- `index.html` — complete website (HTML, CSS and JavaScript in one file).
- `supabase-*.sql` — database setup/migration scripts.
- `README-SHARED-SYSTEM.txt` and related TXT files — additional project notes.
- `.nojekyll` — tells GitHub Pages not to apply Jekyll processing.


## Shared visitor counter

The home dashboard includes a shared usage counter with:
- **Unique browsers/devices:** an estimate based on a random ID stored in that browser's local storage.
- **Total visits:** recorded page loads from those browser profiles.

This is a lightweight prototype metric, **not a verified count of individual people**. Clearing browser storage or using another browser/device can count the same person more than once; multiple people sharing a device may count as one. It does not collect names, emails, IP addresses, or precise locations. Counts begin only after the analytics SQL is installed and this version is deployed; earlier visits cannot be reconstructed.

### Enable the counter

1. In Supabase, open **SQL Editor → New query**.
2. Copy and run `supabase-visitor-analytics-setup.sql` once.
3. Deploy the updated `index.html` with the rest of this project.
4. Open the published site and check the **Veritas Hub Community** counter on the home dashboard.

If the SQL has not been run yet, the website will show that the shared counter is unavailable. This migration creates a separate analytics table and function; it does not change forum or shared-content tables.
