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


## Academic expansion delivery tracker (updated 2026-10-30)

**Tracking rule:** [x] means code merged and database migration verified, not necessarily tested end-to-end on production. [ ] means outstanding. Follow the PR links for implementation details.

### Foundation — requirements 1–8 and lecturer permissions
- [x] Academic student profile form and cloud sync — PRs [#2](https://github.com/V1R0X-Coder/veritas-hub/pull/2), [#3](https://github.com/V1R0X-Coder/veritas-hub/pull/3)
- [x] Published class catalog and student enrollment with RLS — [#4](https://github.com/V1R0X-Coder/veritas-hub/pull/4)
- [x] Verified lecturer assignment model and read-only dashboard — [#5](https://github.com/V1R0X-Coder/veritas-hub/pull/5)
- [ ] Configure approved lecturer accounts and real published classes
- [ ] Verify academic sign-up, class enrollment, lecturer authorization, and cloud sync in live mobile/desktop browsers

### Class materials — requirements 32–38
- [x] Class-scoped written teaching notes with publishing controls — [#6](https://github.com/V1R0X-Coder/veritas-hub/pull/6)
- [x] Private PDF, Word, PowerPoint uploads/downloads and enrollment-based RLS — [#7](https://github.com/V1R0X-Coder/veritas-hub/pull/7)
- [ ] Material version history and controlled replacement
- [ ] File malware screening and live student/lecturer upload/download smoke tests

### Assessments — requirements 39–56
- [x] Verified lecturer multiple-choice quiz draft creation — [#8](https://github.com/V1R0X-Coder/veritas-hub/pull/8)
- [x] Publish quiz, take quiz once, server-side automatic grading, private student results — [#9](https://github.com/V1R0X-Coder/veritas-hub/pull/9)
- [x] Optional submission deadline with server-side enforcement — [#10](https://github.com/V1R0X-Coder/veritas-hub/pull/10) (pending release verification)
- [x] Verified lecturers can add multiple questions to unpublished quiz drafts using existing question-insert RLS — [#19](https://github.com/V1R0X-Coder/veritas-hub/pull/19); authenticated browser verification pending
- [x] Explicit lecturer confirmation and cancel-safe feedback before publishing a draft quiz — [#22](https://github.com/V1R0X-Coder/veritas-hub/pull/22); authenticated browser verification pending
- [x] Lecturer-only draft question preview showing answer options and correct answers — [#23](https://github.com/V1R0X-Coder/veritas-hub/pull/23); authenticated browser/RLS verification pending
- [x] Student quiz answer progress and explicit confirmation before final submission — [#24](https://github.com/V1R0X-Coder/veritas-hub/pull/24); authenticated browser testing pending
- [x] Lecturer draft preview checks for missing, invalid or duplicate answer options — [#25](https://github.com/V1R0X-Coder/veritas-hub/pull/25); authenticated browser testing pending
- [x] Draft-question text, answer option and answer-key editing with verified lecturer ownership and scoped RLS — [#27](https://github.com/V1R0X-Coder/veritas-hub/pull/27); authenticated browser testing pending
- [ ] Marks per question and configurable late-submission rules
- [x] Lecturer-only aggregate quiz results (submissions, average and highest percentages) — [#11](https://github.com/V1R0X-Coder/veritas-hub/pull/11); authenticated browser verification outstanding
- [x] Private student score history and average percentage dashboard (existing own-attempt RLS) — [#18](https://github.com/V1R0X-Coder/veritas-hub/pull/18); authenticated browser verification outstanding
- [ ] Controlled score overrides and answer-key release controls
- [ ] Authenticated end-to-end tests of publishing, taking, scoring and authorization boundaries

- [x] Student quiz submission focuses the first unanswered question — [#28](https://github.com/V1R0X-Coder/veritas-hub/pull/28); authenticated browser testing pending

- [x] Student quiz clear-answers control with confirmation — [#29](https://github.com/V1R0X-Coder/veritas-hub/pull/29); browser verification pending

- [x] Student assessment dashboard shows best percentage — [#30](https://github.com/V1R0X-Coder/veritas-hub/pull/30); browser verification pending

- [x] Student assessment summary shows latest completed score — [#31](https://github.com/V1R0X-Coder/veritas-hub/pull/31); browser verification pending

- [x] Actionable empty-state guidance for student assessment history — [#32](https://github.com/V1R0X-Coder/veritas-hub/pull/32); browser verification pending

- [x] Student quiz exit control warns about unsaved answers — [#33](https://github.com/V1R0X-Coder/veritas-hub/pull/33); browser verification pending

### Campus maps and navigation — parallel workstream
- [x] Campus place directory, map-search links, satellite reference and opt-in device GPS — existing prototype; coordinates and internal routes unverified
- [x] Switch between satellite and street map references and open external walking directions — [#12](https://github.com/V1R0X-Coder/veritas-hub/pull/12); mobile browser smoke test outstanding
- [ ] Verify campus building and keke stop coordinates with campus representatives before publishing pins
- [x] Searchable suggested campus place directory with category filters — [#13](https://github.com/V1R0X-Coder/veritas-hub/pull/13); categories are provisional and browser verification remains outstanding
- [x] Mobile-friendly campus place detail panel with category, verification warning, external map lookup and destination selection — [#15](https://github.com/V1R0X-Coder/veritas-hub/pull/15); browser smoke test pending
- [x] In-page embedded map search preview for selected directory places, with map reset and unverified-result warnings — [#16](https://github.com/V1R0X-Coder/veritas-hub/pull/16); mobile browser smoke test pending
- [x] Share provisional campus map searches through native mobile share or clipboard fallback; accessible selected-place state — [#17](https://github.com/V1R0X-Coder/veritas-hub/pull/17); mobile/browser verification pending
- [ ] Interactive map with approved location pins, accessible labels and on-map filtering
- [ ] Validated walking paths, step-by-step campus navigation and distance estimates
- [x] Responsive campus map layout with phone-sized single-column view, 44px touch targets and readable directory cards — [#14](https://github.com/V1R0X-Coder/veritas-hub/pull/14); real-device smoke testing outstanding
- [ ] Low-bandwidth/mobile performance, offline fallback and location privacy review
- [ ] Campus map usability testing on Android and desktop; validate every route before labeling it official

### Live classrooms — requirements 9–20 and lecturer controls 21–31
- [ ] Evaluate provider pricing, privacy, mobile bandwidth and moderation
- [ ] Lecturer-controlled broadcast, student listen-only defaults, text questions and attendance

### Navigation and mobile usability
- [x] Group the existing sidebar into Academics, Campus life, Student community and My account, retaining standalone Home dashboard and support shortcut — [#20](https://github.com/V1R0X-Coder/veritas-hub/pull/20)
- [x] Accessible collapsible categories, keyboard focus, active-page expansion and mobile touch targets — [#20](https://github.com/V1R0X-Coder/veritas-hub/pull/20); device smoke test pending
- [x] Mobile navigation Escape-to-close, menu expanded-state announcements, focus return and responsive breakpoint alignment — [#21](https://github.com/V1R0X-Coder/veritas-hub/pull/21); physical device testing pending
- [ ] Test navigation and deep page entry on Android, iOS, keyboard-only desktop and assistive technology

### Quality, safety and release
- [x] Scoped branches, PRs and CI checks — [#1](https://github.com/V1R0X-Coder/veritas-hub/pull/1)
- [x] CI regression checks for assessment handler presence, submission confirmations and publish prompt formatting — [#26](https://github.com/V1R0X-Coder/veritas-hub/pull/26); static checks only
- [ ] CI integration tests for authenticated Supabase workflows
- [ ] Verify GitHub Pages deployment and mobile/desktop smoke tests after each release
- [ ] Production backup/rollback drills, accessibility and performance checks
- [ ] Audit remaining unrelated StudyLink database security separately

## Academic platform expansion (roadmap and requirements)


> **Status:** The requirement descriptions below are the original roadmap, not a statement of current feature status. Consult the delivery tracker above for implemented and outstanding items. Preserve all existing site features and student data throughout development.

### Student academic profiles and enrollment (requirements 1–8)

Students will be able to register or update their academic level, course, department/faculty, programme (including JUPEB where applicable), and subjects. Classroom, study materials, and assessment views should show only relevant enrolled classes. Validate academic selections and provide a way to correct them.

### Lecturer-led live classrooms (requirements 9–20)

Provide lecturer-led video sessions with the lecturer as primary broadcaster. Student microphones and cameras should be off by default, with text chat or question submission available. Show class/subject context, attendance, join/leave status, and materials. Support mobile screens and low-bandwidth conditions. The current external classroom links are **not** native live broadcasting; a suitable provider and cost model must be assessed before implementation.

### Lecturer dashboard (requirements 21–31)

Lecturers need authenticated access to their assigned subjects and classes, with controls to start/end lectures, manage participation, upload notes, set assignments and objective tests, configure answer keys, review scores, and track class performance. Campus utilities may remain available as optional navigation. The current role picker is a demonstration convenience, **not secure lecturer authentication**.

### Class-specific notes and files (requirements 32–38)

Allow authorized lecturers to upload permitted PDF, Word, PowerPoint, and other approved teaching files. Associate each resource with the appropriate programme, level, course, subject, and class. Enrolled students can view or download authorized resources. Preserve historical versions when materials are updated, with clear publication dates and file metadata.

### Assignments, tests, and grading (requirements 39–56)

Support objective question authoring with options, correct answers, marks per question, previews, deadlines, and publishing controls. Record student submissions and timestamps, auto-grade objective answers, calculate scores and percentages, and provide lecturer review and controlled score overrides. Define late-submission policies, result visibility, and answer-key release timing. Keep answer keys private until the configured release condition is met.

## Safe engineering and delivery workflow

The existing public site must remain usable throughout the expansion. No unrelated redesigns, destructive schema changes, or direct development commits to `main`.

1. Create a scoped feature or documentation branch from `main`.
2. Make small, reviewable changes with a focused commit.
3. Open a pull request documenting scope, test evidence, security implications, and rollback.
4. Run automated checks and review the diff. If CI is absent, add suitable checks rather than interpreting missing checks as success.
5. Obtain review approval before merging.
6. Confirm GitHub Pages deployment and smoke-test desktop and mobile experiences; revert or roll back regressions.

### Implementation order

1. **Foundation:** academic data model, verified student/lecturer identity, class enrollment, permissions, and Supabase row-level security.
2. **Materials:** class-scoped resources, secure uploads, download permissions, and versioning.
3. **Assessments:** lecturer authoring, deadlines, student submissions, auto-grading, score visibility, and result controls.
4. **Live teaching:** choose a video provider after evaluating costs, privacy, attendance, moderation, and mobile network conditions.
5. **Hardening:** regression testing, accessibility, performance, backups, staged rollout, and recovery rehearsals.

### Acceptance criteria

- Existing campus navigation, keke planner, food links, marketplace, lost and found, forums, notes, feedback, and visitor analytics still work.
- Authorization is enforced by backend/database policies, not just hidden buttons or a role selector.
- Students cannot view unrelated private records, restricted course files, or unreleased answer keys.
- File uploads have safe size/type limits and restricted storage permissions.
- Production migrations require backup and rollback plans.
- A feature is called **live** only after it is reviewed, merged, deployed, and verified.
