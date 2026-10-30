# Campus pin publication — two-person control

Campus place suggestions are untrusted until independently verified. Reviewer approval creates an **unpublished** point. A separately appointed publisher must check the evidence before public release.

## Appoint trusted people

A trusted database administrator (not a browser client) appoints campus reviewers in `veritashub_campus_reviewers` and separate campus publishers in `veritashub_campus_publishers`. Never populate these tables from sign-up metadata or client input. Use real authorized Auth user IDs and record the appointment source.

## Review and publish

1. The reviewer checks coordinates on campus, documents independent evidence and approves through the reviewer RPC. The point remains unpublished.
2. A **different** authorized publisher verifies the evidence and invokes `veritashub_set_campus_location_published(location_id,true,reason)` with a meaningful reason.
3. The function checks publisher authorization, the approved review event, reviewer identity, and that reviewer and publisher are different. It changes publication status and records an audit event atomically.
4. For a disputed or dangerous pin, a publisher invokes the same RPC with `false` and a reason. Unpublishing does not require the original reviewer and takes effect on subsequent public queries.
5. Recheck public map behavior with authenticated and anonymous browsers; never mark field verification complete from database checks alone.

**Important:** The current database owner/service role can still directly modify records. Restrict access to trusted administrators and do not expose service credentials in frontend code. Browser-facing users have no direct UPDATE privileges on verified points.

## Testing

- Non-publishers must be denied RPC access, including users who submitted or reviewed the location.
- A publisher must not be able to publish their own reviewed location.
- A location without an approved review event must be rejected for publication.
- A valid second-person publication must produce one event and a public pin.
- Unpublish must remove the point from anonymous and enrolled-student map queries.
- Verify all flows with real staging accounts before production activation.
