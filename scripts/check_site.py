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
print(f"Static site checks passed: {len(parser.buffers)} inline JavaScript block(s)")
