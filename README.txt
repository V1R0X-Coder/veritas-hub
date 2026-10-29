VERITAS HUB - CAMPUS MARKETPLACE UPDATE

How to run:
1. Extract the ZIP file.
2. Open the Veritas-Hub folder.
3. Double-click index.html to open the website in a browser.
4. Choose Student marketplace in the left menu.

Marketplace features:
- Sell/trade listings with item name, category, sale type, price, condition, description, campus meetup point, display name, contact phone, and optional item photo.
- Optional payment account name/number fields are stored only in this browser's local demo data and are not shown on listing cards. It is safer to leave them blank and only share payment details privately after confirming a transaction.
- Wanted requests for buyers with budget, condition, details, meetup point, name, and contact phone.
- Search listings and remove saved posts.

IMPORTANT LIMITATIONS:
- This is a local prototype. Data is saved in the browser on this device only; posts are not shared with other students and the forms do not send messages.
- Because this is not a hosted service, clearing browser data or switching devices can lose saved posts.
- Avoid posting private information. Meet at a busy public campus place during the day, inspect the item before paying, and do not send money before confirming the item and seller.
- Do not list illegal, unsafe, or prohibited items.


VERITAS HUB - STUDENT FORUM + VIRTUAL CLASSROOM PILOT

New features:
- Student forum: create discussion posts, choose JUPEB/undergraduate/campus categories, search and filter discussions, reply, and remove posts.
- Virtual classroom directory: add a class title, programme, pathway/department, level, subject, lecturer, date/time, and HTTPS meeting link. Students can search and open saved classroom links.
- New forum posts, replies, and classroom links are included in the demo data export/clear functions.

IMPORTANT LIMITATIONS:
- By default, forum posts and classroom listings are saved in this browser on this device only. The shared-forum starter can be enabled by following README-SHARED-FORUM.txt and running supabase-forum-setup.sql in a Supabase project. Classroom listings remain local in this version.
- The virtual classroom page does not carry live audio/video. It organises links to an external meeting or livestream service. Do not paste private links unless the lecturer has approved sharing them.
- A real university rollout needs verified student and lecturer accounts, moderation/reporting, stricter permissions, privacy rules, backups, and a school-approved live class provider. The starter shared forum is an early pilot only and allows anonymous read/create, not public edits or deletes.
- For a pilot, start with one JUPEB subject and a small test group, confirm the lecturer's approval, and test joining from both a phone and laptop before expanding.


VISITOR COUNTER
A shared visitor counter is included on the home dashboard. Run supabase-visitor-analytics-setup.sql once in Supabase before deploying this version. It estimates unique browser profiles and total page loads, not verified individual people. See README.md for details.
