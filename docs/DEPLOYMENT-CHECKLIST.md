# GitHub Pages launch checklist

- [ ] Create a public GitHub repository named `veritas-hub` (or another name you prefer).
- [ ] Upload the contents of this folder at repository root; `index.html` must be at root.
- [ ] Commit to `main`.
- [ ] Repository Settings → Pages → Deploy from a branch → `main` → `/(root)` → Save.
- [ ] Wait for the published URL shown in Settings → Pages.
- [ ] Open the URL on your phone and another browser.
- [ ] Test **Customize app → Shared forum settings → Test connection**.
- [ ] Test a feedback rating, forum post, and marketplace listing on one browser; refresh the site on a second browser and confirm shared records appear.
- [ ] Remove test posts or feedback you do not want visible to visitors.

## Never commit

- Supabase `service_role` keys or `sb_secret_` keys.
- Passwords, tokens, private student data, or private documents.

The `sb_publishable_...` key in the app is designed for public browser use. RLS policies must still be configured correctly.

## Work-in-progress notice

The website includes a visible **Veritas Hub is a work in progress** panel on the home page, and the README documents known limitations. These are known development priorities, not claims that every issue was reproduced live. Keep the notice visible while features are being tested and improved.


## Visitor counter
- [ ] Run `supabase-visitor-analytics-setup.sql` once in Supabase SQL Editor.
- [ ] Publish the updated `index.html` and SQL/documentation files.
- [ ] Check that the home dashboard displays unique browser profiles and total visits.
- [ ] Confirm the page describes these numbers as estimates, not verified people.
