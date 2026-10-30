VERITAS HUB - CONNECTING THE SHARED STUDENT FORUM

The HTML now includes an optional Supabase REST API integration. It remains in local-demo mode until you configure the project URL and anon/public key.

SETUP
1. Create a Supabase project at https://supabase.com/ (use an account with permission; ask a parent/guardian or trusted adult to help if needed).
2. In the Supabase project, open SQL Editor and run the complete contents of supabase-forum-setup.sql.
3. In the project settings/API section, copy the Project URL and the anon/public key (the publishable/anon key intended for browser use).
4. Open Student forum and expand “Shared forum settings (Supabase)”. The supplied settings are prefilled, but you can paste the Project URL and browser-safe publishable key there if needed. Click “Save Supabase settings”, then “Test connection”.
5. For testing, open the folder using a local web server such as VS Code Live Server, or host it on an HTTPS static site. An HTTPS page is recommended for a more reliable test.
6. Create a forum post in Chrome, then open the same hosted page in Edge or another device. The post should appear in both if the Supabase setup is correct.

IMPORTANT SECURITY NOTES
- Never paste a service_role/secret key into index.html or share it in chat. Only use the browser-safe anon/public key with Row Level Security enabled.
- This is an early pilot: anonymous users can read and create posts/replies. The project URL and publishable key are embedded in index.html, which is normal for browser apps; database security must come from grants and Row Level Security policies. Public edit/delete is disabled. It does not yet have verified student accounts, spam protection, moderation/reporting or administrator controls. Do not launch it publicly for the whole university until those are added and tested.
- The virtual classroom links still use their existing local storage; this change makes the forum shared, not classroom listings.
- Local forum posts previously saved in a browser are not automatically migrated to Supabase.
