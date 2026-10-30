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
  const FILE_BUCKET = 'veritashub-class-files';
  const FILE_TYPES = new Set([
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]);
  const FILE_EXTENSIONS = {pdf:'application/pdf',doc:'application/msword',
    docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt:'application/vnd.ms-powerpoint',
    pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
  async function storageRequest(path, token, method, file, contentType) {
    const response = await fetch(URL + '/storage/v1/object/' + FILE_BUCKET + '/' +
      path.split('/').map(encodeURIComponent).join('/'), {
      method, headers: {apikey:KEY, Authorization:'Bearer ' + token,
        ...(contentType ? {'Content-Type':contentType} : {})},
      ...(file ? {body:file} : {})
    });
    if (!response.ok) {
      const body = await response.text();
      let error;
      try { error = JSON.parse(body); } catch (_) { error = {}; }
      throw new Error(error.message || error.error || 'Storage request failed (' + response.status + ').');
    }
    return response;
  }
  async function downloadAcademicFile(row) {
    const token = await accessToken();
    const response = await storageRequest(row.storage_path, token, 'GET');
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = row.file_name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60000);
  }
  function renderAcademicFiles(target, rows) {
    const container = el(target);
    container.replaceChildren();
    for (const row of rows) {
      const card = document.createElement('div');
      card.className = 'list-item';
      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = row.title + (row.published ? '' : ' (draft)');
      const description = document.createElement('p');
      description.textContent = row.file_name + ' · ' + Math.ceil(row.file_size / 1024) + ' KB';
      info.append(title, description);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.textContent = 'Download';
      button.addEventListener('click', async () => {
        button.disabled = true;
        try { await downloadAcademicFile(row); }
        catch (err) { window.alert(err.message || 'Unable to download document.'); }
        finally { button.disabled = false; }
      });
      card.append(info, button);
      container.append(card);
    }
  }
  window.academicLoadStudentFiles = async () => {
    const status = el('studentFilesStatus');
    el('studentFilesList').replaceChildren();
    try {
      status.textContent = 'Loading class documents…';
      const token = await accessToken();
      const enrolled = await request('/rest/v1/veritashub_class_enrollments?select=class_id',
        undefined, 'GET', token);
      const ids = (enrolled || []).map(row => row.class_id);
      if (!ids.length) { status.textContent = 'Join a class to access its published documents.'; return; }
      const files = await request('/rest/v1/veritashub_class_files?published=eq.true&class_id=in.(' +
        ids.map(encodeURIComponent).join(',') +
        ')&select=title,file_name,storage_path,file_size,published&order=created_at.desc',
        undefined, 'GET', token);
      renderAcademicFiles('studentFilesList', files || []);
      status.textContent = files.length + ' published document(s) available.';
    } catch (err) { status.textContent = err.message || 'Unable to load documents.'; }
  };
  window.academicLoadLecturerFiles = async () => {
    const status = el('lecturerFilesStatus');
    el('lecturerFilesList').replaceChildren();
    try {
      status.textContent = 'Loading teaching documents…';
      const token = await accessToken();
      const user = await request('/auth/v1/user', undefined, 'GET', token);
      const classes = await verifiedTeachingClasses(token, user.id);
      const selector = el('lecturerFileClass');
      const previous = selector.value;
      selector.replaceChildren();
      const empty = document.createElement('option');
      empty.value = ''; empty.textContent = 'Choose an assigned class';
      selector.append(empty);
      for (const cls of classes) {
        const option = document.createElement('option');
        option.value = cls.id;
        option.textContent = cls.subject_code + ' · ' + cls.title;
        selector.append(option);
      }
      if (classes.some(c => c.id === previous)) selector.value = previous;
      const files = await request('/rest/v1/veritashub_class_files?lecturer_id=eq.' +
        encodeURIComponent(user.id) +
        '&select=title,file_name,storage_path,file_size,published&order=created_at.desc',
        undefined, 'GET', token);
      renderAcademicFiles('lecturerFilesList', files || []);
      status.textContent = files.length + ' document(s) found; ' + classes.length + ' assigned published class(es).';
    } catch (err) { status.textContent = err.message || 'Unable to load documents.'; }
  };
  window.academicUploadClassFile = async () => {
    const status = el('lecturerFilesStatus');
    try {
      status.textContent = 'Checking document and permissions…';
      const token = await accessToken();
      const user = await request('/auth/v1/user', undefined, 'GET', token);
      const classes = await verifiedTeachingClasses(token, user.id);
      const classId = el('lecturerFileClass').value;
      if (!classes.some(c => c.id === classId)) throw new Error('Select a verified assigned class.');
      const title = el('lecturerFileTitle').value.trim();
      const file = el('lecturerFileInput').files[0];
      if (title.length < 3 || title.length > 160) throw new Error('Enter a title of 3–160 characters.');
      if (!file || !file.size || file.size > 10485760) throw new Error('Choose a document of at most 10 MB.');
      const extension = (file.name.split('.').pop() || '').toLowerCase();
      const expectedMime = FILE_EXTENSIONS[extension];
      if (!expectedMime || !FILE_TYPES.has(expectedMime) ||
          (file.type && file.type !== expectedMime))
        throw new Error('Only PDF, DOC, DOCX, PPT or PPTX documents are supported.');
      const fileName = file.name.slice(0, 200);
      const path = classId + '/' + user.id + '/' + crypto.randomUUID() + '.' + extension;
      status.textContent = 'Uploading private document…';
      await storageRequest(path, token, 'POST', file, expectedMime);
      try {
        await request('/rest/v1/veritashub_class_files', {
          class_id:classId, lecturer_id:user.id, title, file_name:fileName,
          storage_path:path, mime_type:expectedMime, file_size:file.size,
          published:el('lecturerFilePublished').checked
        }, 'POST', token);
      } catch (error) {
        try { await storageRequest(path, token, 'DELETE'); } catch (_) {}
        throw error;
      }
      el('lecturerFileTitle').value = '';
      el('lecturerFileInput').value = '';
      el('lecturerFilePublished').checked = false;
      await window.academicLoadLecturerFiles();
      status.textContent = 'Document uploaded successfully. ' + status.textContent;
    } catch (err) { status.textContent = err.message || 'Unable to upload document.'; }
  };
  window.academicLoadQuizClasses = async () => {
    const status = el('quizDraftStatus');
    try {
      const token = await accessToken();
      const user = await request('/auth/v1/user', undefined, 'GET', token);
      const classes = await verifiedTeachingClasses(token, user.id);
      const select = el('quizDraftClass');
      select.replaceChildren();
      const empty = document.createElement('option');
      empty.value = ''; empty.textContent = 'Choose an assigned class';
      select.append(empty);
      for (const cls of classes) {
        const option = document.createElement('option');
        option.value = cls.id;
        option.textContent = cls.subject_code + ' · ' + cls.title;
        select.append(option);
      }
      status.textContent = classes.length + ' published class(es) available for draft quizzes.';
    } catch (err) { status.textContent = err.message || 'Unable to load assigned classes.'; }
  };
  window.academicCreateQuizDraft = async () => {
    const status = el('quizDraftStatus');
    try {
      const token = await accessToken();
      const user = await request('/auth/v1/user', undefined, 'GET', token);
      const classes = await verifiedTeachingClasses(token, user.id);
      const classId = el('quizDraftClass').value;
      const title = el('quizDraftTitle').value.trim();
      const prompt = el('quizDraftPrompt').value.trim();
      const options = el('quizDraftOptions').value.split(/\\r?\\n/).map(x => x.trim());
      const correct = Number(el('quizDraftCorrect').value);
      const deadlineInput = el('quizDraftDeadline').value;
      const deadlineDate = deadlineInput ? new Date(deadlineInput) : null;
      if (deadlineDate && (!Number.isFinite(deadlineDate.getTime()) ||
          deadlineDate.getTime() <= Date.now() + 60000))
        throw new Error('The submission deadline must be in the future.');
      if (!classes.some(x => x.id === classId)) throw new Error('Select an assigned class.');
      if (title.length < 3 || title.length > 160 || prompt.length < 3 || prompt.length > 2000 ||
          options.length !== 4 || options.some(x => !x || x.length > 500) ||
          !Number.isInteger(correct) || correct < 0 || correct > 3)
        throw new Error('Enter a title, question, exactly four nonempty answers, and the correct choice.');
      status.textContent = 'Saving private draft…';
      const response = await fetch(URL + '/rest/v1/veritashub_quizzes?select=id', {
        method:'POST', headers:{apikey:KEY,Authorization:'Bearer ' + token,
          'Content-Type':'application/json',Prefer:'return=representation'},
        body:JSON.stringify({class_id:classId,lecturer_id:user.id,title,published:false,deadline_at:deadlineDate ? deadlineDate.toISOString() : null})
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Could not create draft.');
      const id = payload[0] && payload[0].id;
      if (!id) throw new Error('Draft created but no identifier returned. Contact support.');
      await request('/rest/v1/veritashub_quiz_questions', {
        quiz_id:id,prompt,options,correct_index:correct,position:0
      }, 'POST', token);
      el('quizDraftTitle').value = '';
      el('quizDraftPrompt').value = '';
      el('quizDraftOptions').value = '';
      el('quizDraftDeadline').value = '';
      status.textContent = 'Private quiz draft saved. Student publishing and grading are coming in the next release.';
    } catch (err) { status.textContent = err.message || 'Unable to save quiz draft.'; }
  };
  window.academicAddDraftQuestion = async (quizId, button) => {
    const status = el('lecturerQuizStatus');
    const prompt = window.prompt('Enter the new question (3–2000 characters):');
    if (prompt === null) return;
    const question = prompt.trim();
    if (question.length < 3 || question.length > 2000) {
      status.textContent = 'Question must contain 3–2000 characters.'; return;
    }
    const answers = [];
    for (let i = 0; i < 4; i++) {
      const answer = window.prompt('Answer option ' + (i+1) + ' of 4:');
      if (answer === null) return;
      if (!answer.trim() || answer.trim().length > 500) {
        status.textContent = 'Every answer must contain 1–500 characters.'; return;
      }
      answers.push(answer.trim());
    }
    const chosen = window.prompt('Correct answer number (1–4):');
    if (chosen === null) return;
    if (!/^[1-4]$/.test(chosen.trim())) {
      status.textContent = 'Choose a correct answer from 1 to 4.'; return;
    }
    button.disabled = true;
    try {
      const token = await accessToken();
      const user = await request('/auth/v1/user', undefined, 'GET', token);
      await verifiedTeachingClasses(token, user.id);
      const drafts = await request('/rest/v1/veritashub_quizzes?id=eq.' +
        encodeURIComponent(quizId) + '&lecturer_id=eq.' + encodeURIComponent(user.id) +
        '&published=eq.false&select=id', undefined, 'GET', token);
      if (!drafts || drafts.length !== 1) throw new Error('Draft is unavailable or already published.');
      await request('/rest/v1/veritashub_quiz_questions', {
        quiz_id:quizId, prompt:question, options:answers, correct_index:Number(chosen.trim())-1
      }, 'POST', token);
      status.textContent = 'Question added to your private draft. Review the draft before publishing.';
    } catch (err) {
      status.textContent = err.message || 'Unable to add question.';
    } finally {
      button.disabled = false;
    }
  };
  window.academicEditDraftQuestion = async (quizId, question, title, button) => {
    const status = el('lecturerQuizStatus');
    const promptText = window.prompt('Edit question:', question.prompt);
    if (promptText === null) return;
    const promptValue = promptText.trim();
    if (promptValue.length < 3 || promptValue.length > 2000) {
      status.textContent = 'Question must contain 3–2000 characters.'; return;
    }
    const options = [];
    for (let i = 0; i < 4; i++) {
      const answer = window.prompt('Edit answer ' + (i + 1) + ':', question.options[i]);
      if (answer === null) return;
      if (!answer.trim() || answer.trim().length > 500) {
        status.textContent = 'Each answer must contain 1–500 characters.'; return;
      }
      options.push(answer.trim());
    }
    if (new Set(options.map(answer => answer.toLocaleLowerCase())).size !== 4) {
      status.textContent = 'Each answer option must be different.'; return;
    }
    const selected = window.prompt('Correct answer (1–4):', String(question.correct_index + 1));
    if (selected === null) return;
    if (!/^[1-4]$/.test(selected.trim())) {
      status.textContent = 'Choose a correct answer from 1 to 4.'; return;
    }
    button.disabled = true;
    try {
      const token = await accessToken();
      const user = await request('/auth/v1/user', undefined, 'GET', token);
      await verifiedTeachingClasses(token, user.id);
      const drafts = await request('/rest/v1/veritashub_quizzes?id=eq.' +
        encodeURIComponent(quizId) + '&lecturer_id=eq.' + encodeURIComponent(user.id) +
        '&published=eq.false&select=id', undefined, 'GET', token);
      if (!Array.isArray(drafts) || drafts.length !== 1) throw new Error('Draft no longer editable.');
      const updated = await request('/rest/v1/veritashub_quiz_questions?id=eq.' +
        encodeURIComponent(question.id) + '&quiz_id=eq.' + encodeURIComponent(quizId) +
        '&select=id', {prompt:promptValue,options,correct_index:Number(selected.trim())-1}, 'PATCH', token);
      // Re-read the draft to confirm the update actually persisted under RLS.
      const verify = await request('/rest/v1/veritashub_quiz_questions?id=eq.' +
        encodeURIComponent(question.id) + '&quiz_id=eq.' + encodeURIComponent(quizId) +
        '&select=id,prompt,options,correct_index', undefined, 'GET', token);
      if (!Array.isArray(verify) || verify.length !== 1 ||
          verify[0].prompt !== promptValue || JSON.stringify(verify[0].options) !== JSON.stringify(options) ||
          verify[0].correct_index !== Number(selected.trim())-1) {
        throw new Error('Question update could not be verified. Check your permissions.');
      }
      await window.academicPreviewDraftQuiz(quizId, title, button);
      status.textContent = 'Draft question updated successfully.';
    } catch (err) {
      status.textContent = err.message || 'Unable to update question.';
    } finally { button.disabled = false; }
  };
  window.academicPreviewDraftQuiz = async (quizId, title, button) => {
    const status = el('lecturerQuizStatus');
    const container = el('lecturerQuizResults');
    button.disabled = true;
    container.replaceChildren();
    status.textContent = 'Loading your private draft preview…';
    try {
      const token = await accessToken();
      const user = await request('/auth/v1/user', undefined, 'GET', token);
      await verifiedTeachingClasses(token, user.id);
      const drafts = await request('/rest/v1/veritashub_quizzes?id=eq.' +
        encodeURIComponent(quizId) + '&lecturer_id=eq.' + encodeURIComponent(user.id) +
        '&published=eq.false&select=id,title', undefined, 'GET', token);
      if (!Array.isArray(drafts) || drafts.length !== 1) throw new Error('Draft not found or already published.');
      const questions = await request('/rest/v1/veritashub_quiz_questions?quiz_id=eq.' +
        encodeURIComponent(quizId) + '&select=id,prompt,options,correct_index&order=created_at.asc',
        undefined, 'GET', token);
      const heading = document.createElement('h3');
      heading.textContent = 'Draft preview: ' + title;
      const note = document.createElement('p');
      note.textContent = 'Lecturer-only preview. Correct answers shown here are not visible to students.';
      container.append(heading, note);
      const issues = [];
      for (const [index, question] of (Array.isArray(questions) ? questions : []).entries()) {
        const options = Array.isArray(question.options) ? question.options : [];
        if (options.length !== 4 || options.some(option => typeof option !== 'string' || !option.trim())) {
          issues.push('Question ' + (index + 1) + ': all four answer options must be filled.');
        }
        if (!Number.isInteger(question.correct_index) || question.correct_index < 0 || question.correct_index >= options.length) {
          issues.push('Question ' + (index + 1) + ': select a valid correct answer.');
        }
        if (new Set(options.map(option => String(option).trim().toLocaleLowerCase())).size !== options.length) {
          issues.push('Question ' + (index + 1) + ': duplicate answer options detected.');
        }
      }
      const quality = document.createElement('div');
      quality.setAttribute('role', 'status');
      quality.style.marginBottom = '12px';
      const qualityHeading = document.createElement('strong');
      qualityHeading.textContent = !questions.length ? 'No questions yet' :
        issues.length ? 'Review needed: ' + issues.length + ' issue(s)' :
        'Basic checks passed: ' + questions.length + ' question(s)';
      quality.append(qualityHeading);
      for (const issue of issues) {
        const message = document.createElement('p');
        message.textContent = '⚠ ' + issue;
        quality.append(message);
      }
      if (!issues.length && questions.length) {
        const message = document.createElement('p');
        message.textContent = 'Check question wording and factual accuracy before publishing.';
        quality.append(message);
      }
      container.append(quality);
      if (!Array.isArray(questions) || !questions.length) {
        const empty = document.createElement('p');
        empty.textContent = 'No questions found. Add questions before publishing.';
        container.append(empty);
      } else {
        for (const [index, question] of questions.entries()) {
          const block = document.createElement('section');
          block.className = 'list-item';
          const label = document.createElement('strong');
          label.textContent = (index + 1) + '. ' + question.prompt;
          block.append(label);
          for (const [optionIndex, answer] of (Array.isArray(question.options) ? question.options : []).entries()) {
            const option = document.createElement('p');
            option.textContent = String.fromCharCode(65 + optionIndex) + '. ' + answer +
              (optionIndex === question.correct_index ? ' ✓ Correct answer' : '');
            block.append(option);
          }
          const edit = document.createElement('button');
          edit.type = 'button'; edit.className = 'btn light';
          edit.textContent = 'Edit question';
          edit.addEventListener('click', () => window.academicEditDraftQuestion(quizId, question, title, edit));
          block.append(edit);
          container.append(block);
        }
      }
      status.textContent = 'Preview loaded: ' + (questions || []).length +
        ' question(s), ' + issues.length + ' basic quality issue(s).';
      container.scrollIntoView({behavior:'smooth',block:'nearest'});
    } catch (err) {
      status.textContent = err.message || 'Unable to preview this draft.';
    } finally {
      button.disabled = false;
    }
  };
  window.academicLoadLecturerQuizzes = async () => {
    const status = el('lecturerQuizStatus');
    const list = el('lecturerQuizList');
    list.replaceChildren();
    try {
      const token = await accessToken();
      const user = await request('/auth/v1/user', undefined, 'GET', token);
      await verifiedTeachingClasses(token, user.id);
      const quizzes = await request('/rest/v1/veritashub_quizzes?lecturer_id=eq.' +
        encodeURIComponent(user.id) + '&select=id,title,published&order=created_at.desc',
        undefined, 'GET', token);
      for (const quiz of quizzes || []) {
        const row = document.createElement('div');
        row.className = 'list-item';
        const title = document.createElement('strong');
        title.textContent = quiz.title + (quiz.published ? ' (published)' : ' (draft)');
        row.append(title);
        if (quiz.published) {
          const results = document.createElement('button');
          results.type = 'button'; results.className = 'btn light';
          results.textContent = 'View results';
          results.addEventListener('click', () => window.academicViewQuizResults(quiz.id));
          row.append(results);
        }
        if (!quiz.published) {
          const addQuestion = document.createElement('button');
          addQuestion.type = 'button'; addQuestion.className = 'btn light';
          addQuestion.textContent = 'Add question';
          addQuestion.addEventListener('click', () => window.academicAddDraftQuestion(quiz.id, addQuestion));
          row.append(addQuestion);
          const preview = document.createElement('button');
          preview.type = 'button'; preview.className = 'btn light';
          preview.textContent = 'Preview questions';
          preview.addEventListener('click', () => window.academicPreviewDraftQuiz(quiz.id, quiz.title, preview));
          row.append(preview);
          const button = document.createElement('button');
          button.type = 'button'; button.className = 'btn dark';
          button.textContent = 'Publish';
          button.addEventListener('click', async () => {
            const warning = 'Publish “' + quiz.title + '” now?\n\n' +
              'Students enrolled in this class will be able to take the test. ' +
              'Check every question and correct answer before continuing. ' +
              'Published quizzes cannot be edited in the current interface.';
            if (!window.confirm(warning)) {
              status.textContent = 'Publishing cancelled. Your quiz remains a draft.';
              return;
            }
            button.disabled = true;
            status.textContent = 'Publishing quiz…';
            try {
              await request('/rest/v1/rpc/veritashub_publish_quiz', {p_quiz:quiz.id}, 'POST', token);
              await window.academicLoadLecturerQuizzes();
              status.textContent = 'Quiz published. Enrolled students can now access it.';
            } catch (err) {
              status.textContent = err.message || 'Publish failed. Your quiz was not confirmed as published.';
              button.disabled = false;
            }
          });
          row.append(button);
        }
        list.append(row);
      }
      status.textContent = (quizzes || []).length + ' quiz(es) found.';
    } catch (err) { status.textContent = err.message || 'Unable to load quizzes.'; }
  };
  window.academicViewQuizResults = async (quizId) => {
    const status = el('lecturerQuizStatus');
    try {
      status.textContent = 'Loading private result summary…';
      const token = await accessToken();
      const result = await request('/rest/v1/rpc/veritashub_lecturer_quiz_results',
        {p_quiz:quizId}, 'POST', token);
      const container = el('lecturerQuizResults');
      container.replaceChildren();
      const heading = document.createElement('h4');
      heading.textContent = result.title;
      const summary = document.createElement('p');
      summary.textContent = 'Submissions: ' + result.submissions +
        ' · Average: ' + (result.average_percent === null ? '—' : result.average_percent + '%') +
        ' · Highest: ' + (result.highest_percent === null ? '—' : result.highest_percent + '%');
      container.append(heading, summary);
      status.textContent = 'Result summary loaded.';
    } catch (err) { status.textContent = err.message || 'Unable to load results.'; }
  };
  window.academicLoadStudentResults = async () => {
    const status = el('studentResultStatus');
    const summary = el('studentResultSummary');
    const list = el('studentResultList');
    summary.replaceChildren();
    list.replaceChildren();
    status.textContent = 'Loading your private assessment results…';
    try {
      const token = await accessToken();
      const [attempts, quizzes] = await Promise.all([
        request('/rest/v1/veritashub_quiz_attempts?select=quiz_id,score,total,submitted_at&order=submitted_at.desc',
          undefined, 'GET', token),
        request('/rest/v1/veritashub_quizzes?published=eq.true&select=id,title',
          undefined, 'GET', token)
      ]);
      const names = new Map((quizzes || []).map(q => [q.id, q.title]));
      const records = (attempts || []).filter(a => Number(a.total) > 0);
      if (!records.length) {
        status.textContent = 'No completed tests yet. Open Available tests, choose a published quiz, and submit your answers to see scores here.';
        return;
      }
      const percentages = records.map(a => 100 * Number(a.score) / Number(a.total));
      const mean = percentages.reduce((sum, value) => sum + value, 0) / percentages.length;
      const overview = document.createElement('p');
      overview.textContent = 'Completed tests: ' + records.length + ' · Average score: ' + mean.toFixed(1) + '%' +
        ' · Best score: ' + Math.max(...percentages).toFixed(1) + '%' +
        ' · Latest: ' + percentages[0].toFixed(1) + '%';
      summary.append(overview);
      for (const attempt of records) {
        const row = document.createElement('div');
        row.className = 'list-item';
        const label = document.createElement('strong');
        label.textContent = names.get(attempt.quiz_id) || 'Completed assessment';
        const score = document.createElement('p');
        const percent = 100 * Number(attempt.score) / Number(attempt.total);
        const submitted = attempt.submitted_at ? new Date(attempt.submitted_at) : null;
        score.textContent = attempt.score + '/' + attempt.total + ' (' + percent.toFixed(1) + '%)' +
          (submitted && !Number.isNaN(submitted.getTime()) ? ' · Submitted ' + submitted.toLocaleString() : '');
        row.append(label, score);
        list.append(row);
      }
      status.textContent = 'Showing your completed assessments only.';
    } catch (err) {
      status.textContent = err.message || 'Unable to load your results.';
    }
  };
  window.academicLoadStudentQuizzes = async () => {
    const status = el('studentQuizStatus');
    const list = el('studentQuizList');
    list.replaceChildren();
    el('studentQuizQuestions').replaceChildren();
    try {
      const token = await accessToken();
      const quizzes = await request('/rest/v1/veritashub_quizzes?published=eq.true&select=id,title,deadline_at&order=created_at.desc',
        undefined, 'GET', token);
      const results = await request('/rest/v1/veritashub_quiz_attempts?select=quiz_id,score,total',
        undefined, 'GET', token);
      const completed = new Map((results || []).map(x => [x.quiz_id,x]));
      for (const quiz of quizzes || []) {
        const row = document.createElement('div');
        row.className = 'list-item';
        const title = document.createElement('strong');
        title.textContent = quiz.title + (quiz.deadline_at ? ' · Deadline: ' + new Date(quiz.deadline_at).toLocaleString() : ' · No deadline');
        if (quiz.deadline_at) {
          const remaining = new Date(quiz.deadline_at).getTime() - Date.now();
          if (remaining > 0 && remaining <= 24 * 60 * 60 * 1000) {
            const notice = document.createElement('p');
            notice.textContent = 'Deadline approaching: less than 24 hours remaining.';
            row.append(notice);
          }
        }
        row.append(title);
        if (completed.has(quiz.id)) {
          const result = document.createElement('span');
          const value = completed.get(quiz.id);
          result.textContent = 'Score: ' + value.score + '/' + value.total;
          row.append(result);
        } else {
          const button = document.createElement('button');
          button.type = 'button'; button.className = 'btn dark';
          button.textContent = 'Take test';
          if (quiz.deadline_at && new Date(quiz.deadline_at).getTime() <= Date.now()) {
            button.disabled = true;
            button.textContent = 'Deadline passed';
          }
          button.addEventListener('click', () => window.academicTakeQuiz(quiz.id, quiz.title));
          row.append(button);
        }
        list.append(row);
      }
      status.textContent = (quizzes || []).length + ' available test(s).';
    } catch (err) { status.textContent = err.message || 'Unable to load tests.'; }
  };
  window.academicTakeQuiz = async (quizId, title) => {
    const status = el('studentQuizStatus');
    const container = el('studentQuizQuestions');
    container.replaceChildren();
    try {
      const token = await accessToken();
      const questions = await request('/rest/v1/rpc/veritashub_get_quiz_questions',
        {p_quiz:quizId}, 'POST', token);
      if (!Array.isArray(questions) || !questions.length) throw new Error('This test has no questions.');
      const heading = document.createElement('h3');
      heading.textContent = title;
      container.append(heading);
      const progress = document.createElement('p');
      progress.setAttribute('role', 'status');
      progress.setAttribute('aria-live', 'polite');
      progress.textContent = 'Answered 0 of ' + questions.length + ' questions';
      container.append(progress);
      const inputs = [];
      for (const [index, question] of questions.entries()) {
        const fieldset = document.createElement('fieldset');
        const legend = document.createElement('legend');
        legend.textContent = (index+1) + '. ' + question.prompt;
        fieldset.append(legend);
        const group = [];
        for (const [choice, option] of question.options.entries()) {
          const label = document.createElement('label');
          const radio = document.createElement('input');
          radio.type = 'radio'; radio.name = 'veritas-quiz-' + quizId + '-' + index;
          radio.value = String(choice);
          label.append(radio,document.createTextNode(' ' + option));
          fieldset.append(label,document.createElement('div'));
          group.push(radio);
        }
        inputs.push({id:question.id,radios:group});
        group.forEach(radio => radio.addEventListener('change', () => {
          const answered = inputs.filter(item => item.radios.some(input => input.checked)).length;
          progress.textContent = 'Answered ' + answered + ' of ' + questions.length + ' questions';
        }));
        container.append(fieldset);
      }
      const submit = document.createElement('button');
      submit.type = 'button'; submit.className = 'btn dark'; submit.textContent = 'Submit answers';
      submit.addEventListener('click', async () => {
        const answers = {};
        for (const item of inputs) {
          const selected = item.radios.find(radio => radio.checked);
          if (!selected) { status.textContent = 'Answer every question before submitting. The first unanswered question is highlighted.'; const fieldset = item.radios[0].closest('fieldset'); if (fieldset) { fieldset.scrollIntoView({behavior:'smooth',block:'center'}); item.radios[0].focus(); } return; }
          answers[item.id] = Number(selected.value);
        }
        if (!window.confirm('Submit your ' + questions.length +
          ' answers now? You cannot change them after submission.')) {
          status.textContent = 'Submission cancelled. Your selected answers are still here.';
          return;
        }
        submit.disabled = true;
        status.textContent = 'Submitting your answers…';
        try {
          const result = await request('/rest/v1/rpc/veritashub_submit_quiz',
            {p_quiz:quizId,p_answers:answers}, 'POST', token);
          container.replaceChildren();
          status.textContent = 'Test submitted. Your score: ' + result.score + '/' + result.total;
          await window.academicLoadStudentQuizzes();
          await window.academicLoadStudentResults().catch(() => {});
          status.textContent = 'Test submitted. Your score: ' + result.score + '/' + result.total;
        } catch (err) { status.textContent = err.message || 'Submission failed.'; submit.disabled = false; }
      });
      container.append(submit);
      const clear = document.createElement('button');
      clear.type = 'button'; clear.className = 'btn light'; clear.textContent = 'Clear answers';
      clear.addEventListener('click', () => {
        if (!window.confirm('Clear all selected answers for this test?')) return;
        inputs.forEach(item => item.radios.forEach(radio => { radio.checked = false; }));
        progress.textContent = 'Answered 0 of ' + questions.length + ' questions';
        status.textContent = 'Answers cleared. You can start again.';
      });
      container.append(clear);
      const exit = document.createElement('button');
      exit.type = 'button'; exit.className = 'btn light'; exit.textContent = 'Exit test';
      exit.addEventListener('click', () => {
        if (!window.confirm('Exit this test? Unsaved answers will be lost.')) return;
        container.replaceChildren();
        status.textContent = 'Test closed without submitting any answers.';
      });
      container.append(exit);
      status.textContent = 'Complete every question and submit once.';
    } catch (err) { status.textContent = err.message || 'Unable to open test.'; }
  };
  document.addEventListener('DOMContentLoaded', () => {
    if (session()) status('Previous academic session found. Sign in again if it has expired.');
  });
})();
