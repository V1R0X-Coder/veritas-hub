/* Separate Supabase Auth connection for Veritas Hub academic profiles.
 * Existing campus community Supabase configuration is intentionally unchanged.
 * The publishable key is public; never use a secret or service-role key here.
 */
(function () {
  'use strict';
  const URL = 'https://wutgiojgomcsocfqxnml.supabase.co';
  const KEY = 'sb_publishable_3-xb2zcXFzqfSiTKqip7Lw_6KF9qiI_';
  const SESSION_KEY = 'veritas-academic-session';
  const el = id => document.getElementById(id);
  const status = message => { if (el('academicAuthStatus')) el('academicAuthStatus').textContent = message; };
  function session() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch (_) { return null; }
  }
  function store(data) {
    if (!data || !data.access_token || !data.refresh_token) throw new Error('No active session. Confirm your email, then sign in.');
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      access_token: data.access_token, refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (Number(data.expires_in) || 3600),
      user_id: data.user && data.user.id
    }));
  }
  async function request(path, body, method = 'POST', token, upsert = false) {
    const res = await fetch(URL + path, {
      method,
      headers: { apikey: KEY, 'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(upsert ? { Prefer: 'resolution=merge-duplicates,return=minimal' } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const raw = await res.text();
    let data;
    try { data = raw ? JSON.parse(raw) : null; } catch (_) { data = null; }
    if (!res.ok) throw new Error((data && (data.msg || data.error_description || data.message || data.error)) || 'Request failed (' + res.status + ')');
    return data;
  }
  async function accessToken() {
    const current = session();
    if (!current) throw new Error('Sign in to sync your academic profile.');
    if (current.expires_at > Date.now() / 1000 + 60) return current.access_token;
    try {
      const refreshed = await request('/auth/v1/token?grant_type=refresh_token', { refresh_token: current.refresh_token });
      store(refreshed);
      return refreshed.access_token;
    } catch (err) {
      localStorage.removeItem(SESSION_KEY);
      throw new Error('Your session expired. Please sign in again.');
    }
  }
  async function run(action) {
    try { status('Working…'); await action(); }
    catch (err) { status(err.message || 'Something went wrong.'); }
  }
  window.academicSignUp = () => run(async () => {
    const email = el('academicEmail').value.trim(), password = el('academicPassword').value;
    if (!email || password.length < 8) throw new Error('Enter a valid email and a password with at least 8 characters.');
    const data = await request('/auth/v1/signup', { email, password });
    if (data && data.access_token) { store(data); status('Account created and signed in. You can save your profile to the cloud.'); }
    else status('Check your email for a confirmation link, then sign in.');
    el('academicPassword').value = '';
  });
  window.academicSignIn = () => run(async () => {
    const email = el('academicEmail').value.trim(), password = el('academicPassword').value;
    if (!email || !password) throw new Error('Enter your email and password.');
    const data = await request('/auth/v1/token?grant_type=password', { email, password });
    store(data);
    el('academicPassword').value = '';
    status('Signed in. Choose Load cloud profile or Save current profile to cloud.');
  });
  window.academicSignOut = () => run(async () => {
    const current = session();
    localStorage.removeItem(SESSION_KEY);
    if (current && current.access_token) {
      try { await request('/auth/v1/logout', undefined, 'POST', current.access_token); } catch (_) {}
    }
    status('Signed out of academic account. Your device-local profile is unchanged.');
  });
  window.academicSaveProfile = () => run(async () => {
    const token = await accessToken();
    const user = await request('/auth/v1/user', undefined, 'GET', token);
    const value = id => (el(id).value || '').trim();
    const profile = {
      user_id: user.id, display_name: value('profileName'),
      programme: value('profileProgramme'), academic_level: value('profileLevel'),
      department: value('profileDepartment'), course_of_study: value('profileCourse'),
      subjects: [...new Set(value('profileSubjects').split(',').map(s => s.trim()).filter(Boolean))].slice(0, 30),
      interests: value('profileInterests'), updated_at: new Date().toISOString()
    };
    await request('/rest/v1/veritashub_academic_profiles?on_conflict=user_id',
      profile, 'POST', token, true);
    status('Academic profile saved securely to your account.');
  });
  window.academicLoadProfile = () => run(async () => {
    const token = await accessToken();
    const user = await request('/auth/v1/user', undefined, 'GET', token);
    const rows = await request('/rest/v1/veritashub_academic_profiles?user_id=eq.' +
      encodeURIComponent(user.id) + '&select=*', undefined, 'GET', token);
    if (!Array.isArray(rows) || !rows.length) { status('No cloud profile yet. Fill the form and choose Save current profile to cloud.'); return; }
    const p = rows[0];
    const values = {
      profileName: p.display_name, profileProgramme: p.programme,
      profileLevel: p.academic_level, profileDepartment: p.department,
      profileCourse: p.course_of_study, profileSubjects: (p.subjects || []).join(', '),
      profileInterests: p.interests
    };
    for (const [id, value] of Object.entries(values)) if (el(id)) el(id).value = value || '';
    status('Cloud profile loaded. Choose Save academic profile to keep a local copy.');
  });
  async function listAcademicClasses() {
    const token = await accessToken();
    const [classes, enrollments] = await Promise.all([
      request('/rest/v1/veritashub_classes?select=id,title,subject_code,programme,academic_level,department,description&order=subject_code.asc', undefined, 'GET', token),
      request('/rest/v1/veritashub_class_enrollments?select=class_id', undefined, 'GET', token)
    ]);
    const enrolled = new Set((enrollments || []).map(row => row.class_id));
    const container = el('academicClassesList');
    container.replaceChildren();
    for (const cls of classes || []) {
      const card = document.createElement('div');
      card.className = 'list-item';
      const detail = document.createElement('div');
      detail.style.flex = '1';
      const title = document.createElement('strong');
      title.textContent = cls.subject_code + ' · ' + cls.title;
      const description = document.createElement('p');
      description.textContent = [cls.programme, cls.academic_level, cls.department, cls.description].filter(Boolean).join(' · ');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      const joined = enrolled.has(cls.id);
      button.textContent = joined ? 'Leave class' : 'Join class';
      button.addEventListener('click', () => changeAcademicEnrollment(cls.id, !joined));
      detail.append(title, description);
      card.append(detail, button);
      container.append(card);
    }
    el('academicClassesStatus').textContent = (classes || []).length
      ? 'Showing ' + classes.length + ' published class(es). Your enrollment is personal to your account.'
      : 'No classes have been published yet. Please check back later.';
  }
  window.academicListClasses = () => runClasses(listAcademicClasses);
  async function runClasses(action) {
    try {
      el('academicClassesStatus').textContent = 'Loading…';
      await action();
    } catch (err) {
      el('academicClassesStatus').textContent = err.message || 'Unable to load classes.';
    }
  }
  async function changeAcademicEnrollment(classId, join) {
    await runClasses(async () => {
      const token = await accessToken();
      const user = await request('/auth/v1/user', undefined, 'GET', token);
      if (join) {
        await request('/rest/v1/veritashub_class_enrollments?on_conflict=user_id,class_id',
          { user_id: user.id, class_id: classId }, 'POST', token, true);
      } else {
        await request('/rest/v1/veritashub_class_enrollments?class_id=eq.' +
          encodeURIComponent(classId) + '&user_id=eq.' + encodeURIComponent(user.id),
          undefined, 'DELETE', token);
      }
      await listAcademicClasses();
    });
  }
  window.academicLoadLecturerDashboard = async () => {
    const status = el('lecturerDashboardStatus');
    const list = el('lecturerClassList');
    list.replaceChildren();
    try {
      status.textContent = 'Checking verified lecturer permissions…';
      const token = await accessToken();
      const user = await request('/auth/v1/user', undefined, 'GET', token);
      const lecturers = await request('/rest/v1/veritashub_lecturers?user_id=eq.' +
        encodeURIComponent(user.id) + '&active=eq.true&select=user_id,display_name',
        undefined, 'GET', token);
      if (!Array.isArray(lecturers) || !lecturers.length) {
        status.textContent = 'No active lecturer permission for this account. Contact the project administrator for verification.';
        return;
      }
      const assignments = await request('/rest/v1/veritashub_lecturer_classes?lecturer_id=eq.' +
        encodeURIComponent(user.id) + '&select=class_id', undefined, 'GET', token);
      const ids = (assignments || []).map(row => row.class_id);
      if (!ids.length) {
        status.textContent = 'Verified lecturer: ' + lecturers[0].display_name + '. No classes assigned yet.';
        return;
      }
      const classes = await request('/rest/v1/veritashub_classes?id=in.(' +
        ids.map(encodeURIComponent).join(',') +
        ')&select=id,title,subject_code,programme,academic_level,department',
        undefined, 'GET', token);
      for (const cls of classes || []) {
        const card = document.createElement('div');
        card.className = 'list-item';
        const title = document.createElement('strong');
        title.textContent = cls.subject_code + ' · ' + cls.title;
        const meta = document.createElement('p');
        meta.textContent = [cls.programme, cls.academic_level, cls.department].filter(Boolean).join(' · ');
        const info = document.createElement('div');
        info.append(title, meta);
        card.append(info);
        list.append(card);
      }
      status.textContent = 'Verified lecturer: ' + lecturers[0].display_name +
        '. Showing ' + (classes || []).length + ' published assigned class(es).';
    } catch (err) {
      status.textContent = err.message || 'Unable to load lecturer assignments.';
    }
  };
  function renderNoteList(target, notes) {
    const container = el(target);
    container.replaceChildren();
    for (const note of notes) {
      const item = document.createElement('article');
      item.className = 'list-item';
      const inner = document.createElement('div');
      const heading = document.createElement('strong');
      heading.textContent = note.title + (note.published ? '' : ' (draft)');
      const body = document.createElement('p');
      body.textContent = note.body;
      body.style.whiteSpace = 'pre-wrap';
      const date = document.createElement('small');
      date.textContent = 'Published status: ' + (note.published ? 'visible to enrolled students' : 'draft');
      inner.append(heading, body, date);
      item.append(inner);
      container.append(item);
    }
  }
  async function verifiedTeachingClasses(token, userId) {
    const lecturer = await request('/rest/v1/veritashub_lecturers?user_id=eq.' +
      encodeURIComponent(userId) + '&active=eq.true&select=user_id', undefined, 'GET', token);
    if (!lecturer || !lecturer.length) throw new Error('Only verified active lecturers can manage notes.');
    const assigned = await request('/rest/v1/veritashub_lecturer_classes?lecturer_id=eq.' +
      encodeURIComponent(userId) + '&select=class_id', undefined, 'GET', token);
    const ids = (assigned || []).map(row => row.class_id);
    if (!ids.length) return [];
    return request('/rest/v1/veritashub_classes?id=in.(' + ids.map(encodeURIComponent).join(',') +
      ')&select=id,title,subject_code&order=subject_code.asc', undefined, 'GET', token);
  }
  window.academicLoadStudentNotes = async () => {
    const status = el('studentNotesStatus');
    el('studentNotesList').replaceChildren();
    try {
      status.textContent = 'Loading your published notes…';
      const token = await accessToken();
      const enrollment = await request('/rest/v1/veritashub_class_enrollments?select=class_id', undefined, 'GET', token);
      const ids = (enrollment || []).map(row => row.class_id);
      if (!ids.length) { status.textContent = 'Join a published class to see its notes.'; return; }
      const notes = await request('/rest/v1/veritashub_class_notes?published=eq.true&class_id=in.(' +
        ids.map(encodeURIComponent).join(',') +
        ')&select=id,title,body,published,created_at&order=created_at.desc', undefined, 'GET', token);
      renderNoteList('studentNotesList', notes || []);
      status.textContent = notes.length ? notes.length + ' published note(s) available.' : 'No published notes in your classes yet.';
    } catch (err) { status.textContent = err.message || 'Unable to load notes.'; }
  };
  window.academicLoadLecturerNotes = async () => {
    const status = el('lecturerNotesStatus');
    el('lecturerNotesList').replaceChildren();
    try {
      status.textContent = 'Loading your notes…';
      const token = await accessToken();
      const user = await request('/auth/v1/user', undefined, 'GET', token);
      const classes = await verifiedTeachingClasses(token, user.id);
      const select = el('lecturerNoteClass');
      const previous = select.value;
      select.replaceChildren();
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Choose an assigned published class';
      select.append(placeholder);
      for (const cls of classes) {
        const option = document.createElement('option');
        option.value = cls.id;
        option.textContent = cls.subject_code + ' · ' + cls.title;
        select.append(option);
      }
      if (classes.some(c => c.id === previous)) select.value = previous;
      if (!classes.length) { status.textContent = 'No published classes assigned to you.'; return; }
      const notes = await request('/rest/v1/veritashub_class_notes?lecturer_id=eq.' +
        encodeURIComponent(user.id) + '&select=id,title,body,published,created_at&order=created_at.desc',
        undefined, 'GET', token);
      renderNoteList('lecturerNotesList', notes || []);
      status.textContent = notes.length + ' note(s) found. Choose a class to write a new note.';
    } catch (err) { status.textContent = err.message || 'Unable to load lecturer notes.'; }
  };
  window.academicPublishNote = async () => {
    const status = el('lecturerNotesStatus');
    try {
      status.textContent = 'Saving your note…';
      const token = await accessToken();
      const user = await request('/auth/v1/user', undefined, 'GET', token);
      const classes = await verifiedTeachingClasses(token, user.id);
      const classId = el('lecturerNoteClass').value;
      if (!classes.some(c => c.id === classId)) throw new Error('Choose one of your assigned published classes.');
      const title = el('lecturerNoteTitle').value.trim();
      const body = el('lecturerNoteBody').value.trim();
      if (title.length < 3 || title.length > 160 || !body || body.length > 20000)
        throw new Error('Enter a title (3–160 characters) and a note (1–20,000 characters).');
      await request('/rest/v1/veritashub_class_notes', {
        class_id: classId, lecturer_id: user.id, title, body,
        published: el('lecturerNotePublished').checked
      }, 'POST', token, true);
      el('lecturerNoteTitle').value = '';
      el('lecturerNoteBody').value = '';
      el('lecturerNotePublished').checked = false;
      await window.academicLoadLecturerNotes();
      status.textContent = 'Note saved successfully. ' + status.textContent;
    } catch (err) { status.textContent = err.message || 'Unable to save note.'; }
  };
  document.addEventListener('DOMContentLoaded', () => {
    if (session()) status('Previous academic session found. Sign in again if it has expired.');
  });
})();
