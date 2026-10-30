# Campus location review procedure

This is an administrative workflow, **not** an approval form for ordinary signed-in users.

1. A campus representative submits a proposed place, coordinates, evidence, and contact through the Campus Map form. The private `veritashub_campus_location_submissions` table records it as pending.
2. A trusted project administrator checks the representative's identity, confirms the place and coordinate onsite with independent evidence, and documents any accessibility or safety caveats. Do not rely on a single browser GPS reading.
3. The administrator uses a privileged database transaction (Supabase SQL editor or a controlled server process), never a browser client, to create a `veritashub_verified_campus_locations` record with `verified_by`, `verification_source`, `verified_at` and `published=false`.
4. In the **same transaction**, update the submission to `status='approved'`, `reviewed_by`, `reviewed_at`, `review_note` and `approved_location_id`, and insert a matching `veritashub_campus_review_events` row. The `reviewer_id` must be an actual authorized admin account, not the submitter by default.
5. Check that the coordinates and evidence are correct before a privileged administrator separately sets the verified location's `published=true`. Only then will the public map display the pin.
6. To reject a submission, use a privileged transaction to set `status='rejected'`, `reviewed_by`, `reviewed_at`, and `review_note`, and insert a rejection event with no location ID.
7. Re-review any moved, renamed or disputed place; unpublish inaccurate coordinates immediately. Never invent coordinates, approvals or evidence.

## Safety boundaries

- Public browsers can only read published verified points.
- Authenticated submitters can create pending suggestions and read their own submission; they cannot update, approve, reject or publish them.
- Review audit events have RLS enabled and **no** browser read/write grants.
- A submitted location is not a validated walking path. Walking paths require separate physical verification and accessibility review.
- Before enabling a production reviewer UI, implement an explicitly authorized administrative role and transaction-safe review RPC in a trusted backend, plus authenticated negative tests.

## Reviewer acceptance checks

- Verify the campus contact's affiliation and record the independent evidence source.
- Confirm the location is inside the expected campus area; inspect GPS accuracy and alternate map imagery.
- Record accessibility and any hazards without publishing private contact details.
- Check that a non-reviewer cannot mutate the submission, audit events or verified locations.
- Confirm that unpublished points do not appear on the public map.
