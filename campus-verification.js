/* Submit untrusted location suggestions for private administrative verification. */
(() => {
  'use strict';
  const URL = 'https://wutgiojgomcsocfqxnml.supabase.co';
  const KEY = 'sb_publishable_3-xb2zcXFzqfSiTKqip7Lw_6KF9qiI_';
  const SESSION_KEY = 'veritas-academic-session';
  const el = id => document.getElementById(id);
  window.submitCampusVerification = async event => {
    event.preventDefault();
    const status = el('campusVerificationStatus');
    const form = el('campusVerificationForm');
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    status.textContent = 'Checking your sign-in and submitting for review…';
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!session?.access_token) throw new Error('Sign in to your academic account first.');
      const token = session.access_token;
      const userResponse = await fetch(URL + '/auth/v1/user', {
        headers:{apikey:KEY,Authorization:'Bearer '+token}
      });
      if (!userResponse.ok) throw new Error('Session expired. Sign in again.');
      const user = await userResponse.json();
      const payload = {
        submitted_by:user.id,
        proposed_name:el('campusVerificationName').value.trim(),
        proposed_category:el('campusVerificationCategory').value,
        proposed_latitude:Number(el('campusVerificationLatitude').value),
        proposed_longitude:Number(el('campusVerificationLongitude').value),
        campus_contact:el('campusVerificationContact').value.trim(),
        evidence_description:el('campusVerificationEvidence').value.trim()
      };
      if (!Number.isFinite(payload.proposed_latitude) ||
          !Number.isFinite(payload.proposed_longitude) ||
          Math.abs(payload.proposed_latitude)>90 ||
          Math.abs(payload.proposed_longitude)>180)
        throw new Error('Enter valid decimal-degree coordinates.');
      const response = await fetch(URL + '/rest/v1/veritashub_campus_location_submissions', {
        method:'POST',
        headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Unable to submit suggestion.');
      }
      form.reset();
      status.textContent = 'Submitted for private review. This place is not a verified map pin yet.';
    } catch (error) {
      status.textContent = error.message || 'Submission failed.';
    } finally { submit.disabled = false; }
  };
})();
