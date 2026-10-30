"""Non-destructive checks for the GitHub Pages static site."""
from pathlib import Path
from html.parser import HTMLParser
import re
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
html = root / "index.html"
assert html.is_file(), "GitHub Pages entrypoint index.html is missing"
source = html.read_text(encoding="utf-8")
assert "<!doctype html>" in source.lower(), "Missing HTML doctype"
assert "<title>" in source.lower(), "Missing page title"
assert 'name="viewport"' in source, "Missing mobile viewport"
assert len(source) > 10000, "Entrypoint unexpectedly truncated"
assert (root / ".nojekyll").exists(), "Missing GitHub Pages .nojekyll"

class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.buffers = []
    def handle_starttag(self, tag, attrs):
        if tag == "script":
            attributes = dict(attrs)
            self.active = "src" not in attributes and attributes.get("type", "text/javascript") in ("text/javascript", "module", "")
            if self.active:
                self.buffers.append("")
    def handle_data(self, data):
        if self.active and self.buffers:
            self.buffers[-1] += data
    def handle_endtag(self, tag):
        if tag == "script":
            self.active = False

parser = Scripts()
parser.feed(source)
assert parser.buffers, "No inline application JavaScript found"
with tempfile.TemporaryDirectory() as tmp:
    for i, code in enumerate(parser.buffers):
        path = Path(tmp) / f"script-{i}.mjs"
        path.write_text(code, encoding="utf-8")
        subprocess.run(["node", "--check", str(path)], check=True)
external = root / "academic-auth.js"
if 'src="academic-auth.js"' in source:
    assert external.is_file(), "Missing academic auth JavaScript"
    subprocess.run(["node", "--check", str(external)], check=True)
if 'academicUploadClassFile()' in source:
    assert 'academicLoadStudentFiles()' in source, "Student document controls missing"
    assert external.is_file(), "Missing document integration"
    script = external.read_text(encoding="utf-8")
    for required in ('window.academicUploadClassFile', 'window.academicLoadStudentFiles',
                     'window.academicLoadLecturerFiles', "FILE_BUCKET = 'veritashub-class-files'"):
        assert required in script, f"Missing academic document handler: {required}"
    assert (root / "supabase/veritashub_private_class_files.sql").is_file(), "Missing document storage migration"
# Protect key assessment interactions against accidental removal during refactors.
if external.is_file():
    assessment = external.read_text(encoding="utf-8")
    required_assessment = (
        "window.academicPreviewDraftQuiz",
        "window.academicLoadLecturerQuizzes",
        "window.academicAddDraftQuestion",
        "window.academicTakeQuiz",
        "window.academicLoadStudentResults",
        "veritashub_submit_quiz",
        "veritashub_publish_quiz",
        "Answered 0 of ",
        "Submission cancelled. Your selected answers are still here.",
        "Publishing cancelled. Your quiz remains a draft.",
        "Basic checks passed: ",
    )
    for marker in required_assessment:
        assert marker in assessment, f"Missing assessment workflow marker: {marker}"
    assert "'” now?\\\\n\\\\n'" not in assessment, "Publish confirmation contains escaped literal newlines"
print(f"Static site checks passed: {len(parser.buffers)} inline JavaScript block(s)")

# Weighted grading and draft edit permissions must remain wired together.
marks_js = (root / "academic-auth.js").read_text(encoding="utf-8")
assert "askQuestionMarks" in marks_js
assert "marks}, 'PATCH'" in marks_js
weighted_sql = (root / "supabase/veritashub_weighted_quiz_grading.sql").read_text(encoding="utf-8")
assert "sum(marks)" in weighted_sql
assert "jsonb_object_keys" in weighted_sql
assert "grant update(marks)" in (root / "supabase/veritashub_question_marks_edit_grant.sql").read_text(encoding="utf-8")

# Assessment controls: both client workflows must rely on restricted RPCs.
assessment_ui = (root / "academic-auth.js").read_text(encoding="utf-8")
for marker in ("window.academicOverrideQuizScore", "/rpc/veritashub_override_score",
               "window.academicScheduleAnswerKeyRelease", "/rpc/veritashub_schedule_answer_key_release",
               "window.academicViewReleasedAnswerKey", "/rpc/veritashub_get_released_answer_key"):
    assert marker in assessment_ui, f"Missing assessment control: {marker}"
for filename, markers in {
    "veritashub_score_overrides.sql": ("enable row level security", "veritashub_lecturer_classes", "for update", "revoke all on function"),
    "veritashub_answer_key_release.sql": ("veritashub_quiz_attempts", "answer_key_release_at", "clock_timestamp()", "revoke all on function"),
    "veritashub_answer_key_schedule_rpc.sql": ("veritashub_lecturer_classes", "auth.uid()", "revoke all on function"),
}.items():
    migration = (root / "supabase" / filename).read_text(encoding="utf-8")
    for marker in markers:
        assert marker in migration, f"Missing authorization control {marker} in {filename}"

# Lecturer aggregate results must honor the latest audited correction.
summary_sql = (root / "supabase/veritashub_override_aware_results.sql").read_text(encoding="utf-8")
for marker in ("left join lateral", "revised_score", "created_at desc", "veritashub_lecturer_classes", "revoke all on function"):
    assert marker in summary_sql, f"Missing corrected score summary guard: {marker}"

# Verified campus directory must not publish fabricated seed coordinates.
registry = (root / "supabase/veritashub_verified_campus_locations.sql").read_text(encoding="utf-8")
for marker in ("enable row level security", "published = true", "verification_source", "verified_by", "revoke all"):
    assert marker in registry, f"Missing verified-location safeguard: {marker}"
assert "insert into public.veritashub_verified_campus_locations" not in registry.lower()
location_ui = (root / "verified-campus-locations.js").read_text(encoding="utf-8")
assert "published=eq.true" in location_ui
assert "textContent = place.name" in location_ui
assert "verified-campus-locations.js" in (root / "index.html").read_text(encoding="utf-8")

# Approved map pins only: no hard-coded campus coordinates or unsafe popup HTML.
verified_map = (root / "verified-campus-locations.js").read_text(encoding="utf-8")
for marker in ("renderPinMap(matches)", "pinLayer.clearLayers()", "marker.bindPopup(label)", "label.textContent = place.name", "published=eq.true"):
    assert marker in verified_map, f"Missing approved pin safeguard: {marker}"
html_map = (root / "index.html").read_text(encoding="utf-8")
assert 'id="verifiedCampusPinMap"' in html_map
assert 'leaflet@1.9.4' in html_map

# Submitted campus suggestions must never self-approve or become public pins.
intake_sql = (root / "supabase/veritashub_campus_location_submissions.sql").read_text(encoding="utf-8")
for marker in ("enable row level security", "grant select,insert", "status='pending'", "submitted_by = (select auth.uid())"):
    assert marker in intake_sql, f"Missing intake security guard: {marker}"
assert "grant update" not in intake_sql.lower()
intake_js = (root / "campus-verification.js").read_text(encoding="utf-8")
assert "veritashub_campus_location_submissions" in intake_js
assert "veritashub_verified_campus_locations" not in intake_js
assert "campus-verification.js" in (root / "index.html").read_text(encoding="utf-8")

# Review provenance is recorded server-side and never granted to browser users.
review_sql = (root / "supabase/veritashub_campus_review_audit.sql").read_text(encoding="utf-8")
for marker in ("reviewed_by", "approved_location_id", "enable row level security", "revoke all", "unique(submission_id)"):
    assert marker in review_sql, f"Missing administrative review safeguard: {marker}"
assert "grant select" not in review_sql.lower()
assert "grant update" not in review_sql.lower()
assert (root / "docs/campus-location-review.md").exists()

# Reviewer-only RPCs must check a trusted reviewer table and never publish pins.
review_rpc = (root / "supabase/veritashub_campus_review_rpc.sql").read_text(encoding="utf-8")
for marker in ("veritashub_campus_reviewers", "auth.uid()", "for update", "published)", "now(),false", "security definer"):
    assert marker in review_rpc, f"Missing review RPC safeguard: {marker}"
assert "grant insert on public.veritashub_campus_reviewers" not in review_rpc.lower()
assert "grant update on public.veritashub_verified_campus_locations" not in review_rpc.lower()
assert "campus-reviewer.js" in (root / "index.html").read_text(encoding="utf-8")

# Publication must require independent review and an appointed second actor.
publication_sql = (root / "supabase/veritashub_campus_publication_control.sql").read_text(encoding="utf-8")
for marker in ("veritashub_campus_publishers", "veritashub_campus_review_events", "v_reviewer=v_actor", "for update", "veritashub_campus_publication_events", "revoke all"):
    assert marker in publication_sql, f"Missing campus publication safeguard: {marker}"
assert "grant insert on public.veritashub_campus_publishers" not in publication_sql.lower()
assert (root / "docs/campus-pin-publication.md").exists()

# Routes must use approved walking segments, not straight-line distances.
walking_sql = (root / "supabase/veritashub_campus_walking_edges.sql").read_text(encoding="utf-8")
for marker in ("enable row level security", "published=true", "a.published=true", "b.published=true", "verification_source", "revoke all"):
    assert marker in walking_sql, f"Missing verified walking guard: {marker}"
walking_js = (root / "campus-walking-routes.js").read_text(encoding="utf-8")
for marker in ("veritashub_campus_walking_edges", "No fully verified walking route", "distance_m", "prev.set"):
    assert marker in walking_js, f"Missing verified walking route behavior: {marker}"
assert "campus-walking-routes.js" in (root / "index.html").read_text(encoding="utf-8")

# Keep auxiliary documentation in docs/ while preserving GitHub's root README.
for legacy_doc in ("DEPLOYMENT-CHECKLIST.md", "README-SHARED-FORUM.txt", "README-SHARED-SYSTEM.txt", "README.txt"):
    assert not (root / legacy_doc).exists(), f"Auxiliary documentation remains in repository root: {legacy_doc}"
    assert (root / "docs" / legacy_doc).is_file(), f"Missing relocated documentation: {legacy_doc}"

# Offline directory must be bounded and visibly marked stale; no cached navigation pins.
offline_map = (root / "verified-campus-locations.js").read_text(encoding="utf-8")
for marker in ("MAX_CACHE_AGE_MS", "readCachedLocations", "cachePublishedLocations", "OFFLINE REFERENCE", "if (offlineCopy)", "live map pins are disabled"):
    assert marker in offline_map, f"Missing campus offline safety behavior: {marker}"
assert "navigator.geolocation" not in offline_map
