#!/usr/bin/env python3
"""Authenticated assessment API smoke tests against a dedicated test tenant.

Required environment: VERITASHUB_TEST_URL, VERITASHUB_TEST_ANON_KEY,
VERITASHUB_TEST_STUDENT_EMAIL, VERITASHUB_TEST_STUDENT_PASSWORD,
VERITASHUB_TEST_OUTSIDER_EMAIL, VERITASHUB_TEST_OUTSIDER_PASSWORD,
VERITASHUB_TEST_QUIZ_ID (published, student enrolled, outsider not enrolled).
No privileged service key; no writes; safe for staging.
"""
import json
import os
import urllib.error
import urllib.request

PREFIX = "VERITASHUB_TEST_"
REQUIRED = ("URL", "ANON_KEY", "STUDENT_EMAIL", "STUDENT_PASSWORD",
            "OUTSIDER_EMAIL", "OUTSIDER_PASSWORD", "QUIZ_ID")
missing = [PREFIX + k for k in REQUIRED if not os.getenv(PREFIX + k)]
if missing:
    raise SystemExit("Missing required staging test configuration: " + ", ".join(missing))

url = os.environ[PREFIX + "URL"].rstrip("/")
key = os.environ[PREFIX + "ANON_KEY"]
quiz = os.environ[PREFIX + "QUIZ_ID"]

def call(path, token=None, body=None):
    headers = {"apikey": key, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url + path, headers=headers, data=data,
                                 method="POST" if body is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            return res.status, json.load(res)
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read().decode() or "{}")

def login(email, password):
    status, data = call("/auth/v1/token?grant_type=password",
                        body={"email": email, "password": password})
    assert status == 200 and data.get("access_token"), "Staging login failed"
    return data["access_token"]

student = login(os.environ[PREFIX + "STUDENT_EMAIL"],
                os.environ[PREFIX + "STUDENT_PASSWORD"])
outsider = login(os.environ[PREFIX + "OUTSIDER_EMAIL"],
                 os.environ[PREFIX + "OUTSIDER_PASSWORD"])
rpc = "/rest/v1/rpc/"
for name, args in [
    ("veritashub_get_quiz_questions", {"p_quiz": quiz}),
    ("veritashub_get_released_answer_key", {"p_quiz": quiz}),
    ("veritashub_lecturer_quiz_results", {"p_quiz": quiz}),
    ("veritashub_override_score", {"p_quiz": quiz, "p_student": quiz,
                                   "p_score": 0, "p_reason": "Unauthorized correction attempt"}),
    ("veritashub_schedule_answer_key_release", {"p_quiz": quiz,
                                                 "p_release_at": None}),
]:
    code, _ = call(rpc + name, outsider, args)
    assert code in (401, 403, 400), f"Outsider unexpectedly authorized for {name}: {code}"
code, questions = call(rpc + "veritashub_get_quiz_questions", student,
                       {"p_quiz": quiz})
assert code == 200 and isinstance(questions, list) and len(questions) > 0
assert all("correct_index" not in q and "marks" not in q for q in questions)
code, _ = call(rpc + "veritashub_lecturer_quiz_results", student,
               {"p_quiz": quiz})
assert code in (400, 401, 403), "Student unexpectedly accessed lecturer results"
print("PASS: enrolled student sees redacted questions; outsider and student denied privileged RPCs.")
