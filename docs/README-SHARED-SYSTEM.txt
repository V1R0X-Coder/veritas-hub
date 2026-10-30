VERITAS HUB — SHARED FEATURES PILOT

WHAT THIS VERSION ADDS
- Shared forum and replies through the existing forum tables.
- Shared lost-and-found reports across browsers/devices; optional item photos upload to Supabase Storage.
- Shared marketplace listings and wanted requests; optional listing photos upload to Supabase Storage.
- Shared study-resource links.
- Shared classroom links.
- A classroom Q&A queue: students submit questions, upvote questions, and post answers visible to everyone.
- A reusable shared-content helper that uses the same Supabase project URL and browser-safe publishable key.

IMPORTANT SETUP
1. Open Supabase Dashboard -> SQL Editor.
2. Since the forum tables are already created in your project, open supabase-shared-system-setup.sql from this folder.
3. Paste the full contents into SQL Editor and click Run. It creates the shared-content table and image bucket/policies. Do not use the original forum setup file again unless you need to recreate the forum tables/policies.
4. Open the website, go to Student forum -> Shared forum settings (Supabase), and make sure the Project URL and publishable key are saved. Settings are stored separately by each browser. If opening on another device/browser, enter/save the same URL and publishable key there too.
5. Test in Chrome: create a forum post, lost-and-found report, marketplace listing, resource link, classroom link and classroom question. Then check Supabase Table Editor -> shared_content and forum_posts.
6. Open the same hosted website in Edge and verify the same records appear. For photos, verify that the public image loads in Edge too.

PHOTOS
Shared photos use the Supabase Storage bucket named veritas-media. The website limits images to 2 MB and accepts JPG, PNG, WEBP or GIF. If the bucket/policies are missing, photo upload will fail with a message. Text-only reports/listings can still be posted without a photo.

CLASSROOM Q&A
Questions are shared and sorted by upvotes. Answers are shared. This is a first pilot queue, not a fully moderated lecturer-only console. Anyone with access can currently submit answers and votes; the vote limit is only a browser-side convenience, not secure identity verification. Before real classes, add Supabase Auth, lecturer/assistant roles, moderation/reporting, rate limits, and a way for staff to mark/close questions.

SECURITY AND LIMITATIONS
- Never put a Supabase secret/service_role key in this HTML. Use only the browser-safe publishable key with RLS enabled.
- This pilot allows anonymous read and insert access for shared_content and image upload. That is NOT suitable for a university-wide launch until authentication, moderation, spam protection, ownership rules, and deletion/report workflows are added.
- Marketplace contact name/phone fields are published to all visitors. Only enter contact details that you are comfortable sharing. Private bank/account fields are deliberately not uploaded.
- Do not upload IDs, faces of other people without consent, private documents, addresses, or sensitive photos.
- Public bucket photos are readable by anyone who has the URL. The project URL and publishable key are public browser credentials; security must come from RLS/storage policies.
- Existing records saved locally in a browser are not automatically migrated to Supabase.
- Personal timetable, profile preferences, and sticky notes remain local/personal; not every feature should be globally shared.
- Class links are shared records, but video/audio is hosted by the external meeting provider. This website does not host live video itself.
- The Q&A list refreshes when the page renders or the user clicks Refresh; it is not a true Supabase Realtime subscription yet. Shared items show across browsers after the page/list is refreshed; background push updates are not enabled.

TESTING STATUS
JavaScript syntax should be checked before using this build. It has not been live-tested against the user's Supabase project in this environment. Run the SQL and test each feature in Chrome and Edge before sharing it with other students.

PRIVATE STICKY NOTES SYNC (UPDATED TO MATCH YOUR EXISTING TABLE)
---------------------------------
The Sticky notes page can now sync notes and optional photos across browsers using a Supabase account.
1. In Supabase Dashboard > SQL Editor, run supabase-private-notes-setup.sql.
2. In Supabase Authentication settings, keep email/password sign-in enabled. If email confirmation is enabled, confirm the address after account creation.
3. Open Veritas Hub in Chrome, go to Sticky notes, and create an account or sign in.
4. Open the same app in Edge and sign in with the same email/password. The same private notes should appear.
5. Older notes saved only on a device stay local until you sign in and press “Sync existing local notes”. The migration button syncs note text; local photos must be uploaded again to sync as private attachments.

The app uses the existing public.private_note table (singular), with columns id, owner_id, body, created_at and photo_path. The setup SQL configures that table for Supabase Auth and row-level security. Do not share your account password. If the browser has not connected to the same Supabase project/key, note sync will not work. This is a pilot; test with non-sensitive notes first.

MARKETPLACE IMPROVEMENTS (LATEST PATCH)
- Added clear “Sell an item” and “Search items” shortcuts.
- Added an explicit Search button and Clear button; typing still filters listings live.
- Each listing now has a “Contact seller / Buy” button that opens WhatsApp with a draft enquiry, if the seller supplied a usable phone number. This does not take payment or guarantee the item is available.
- Listing price and wanted budget accept any non-negative whole-naira amount (not just steps of ₦50). Leave a listing price blank to show it as negotiable.
- Improved the message shown when the browser cannot reach Supabase. “Failed to fetch” is a network/browser/API reachability issue, not a price limit; check Settings → Supabase URL/key → Test connection, internet access, project status, and any browser extensions or network filters.


LATEST STUDY / APPEARANCE / FEEDBACK UPDATE
- Appearance now offers ten palettes: Forest, Ocean, Plum, Midnight, Sunset, Lavender, Rose, Sand, Mint and Charcoal & Gold.
- Sticky notes have a subject label. The subject is stored as a prefix in the existing private_note.body field when synced, so no new Supabase column is required.
- Random study facts can be filtered by subject, including Mathematics, Physics, Geography, Computer Science, Study Skills, Chemistry and Biology.
- Added a “Rate & report issues” page for ratings, glitch reports and suggestions. When Supabase is configured it attempts to save to shared_content (feature=feedback, kind=website-feedback); if the shared request fails, the submission is saved locally instead.
- The feedback page lists known prototype limitations found in a code review. These have not all been reproduced through live end-to-end testing.


UPDATE: SHARED WEBSITE FEEDBACK + COMMUNITY INBOX
- Website ratings, glitch reports, and suggestions use feature='feedback' in shared_content.
- If an older Supabase table/policy rejects them, run supabase-feedback-inbox-fix.sql once in Supabase SQL Editor.
- The Updates & messages page reads recent shared_content rows across supported features and allows filtering/searching older items. It is a community activity feed, not private direct messages.
- Items previously saved only in one browser are not automatically uploaded; submit them again after the SQL fix if you want them shared.
