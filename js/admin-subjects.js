const SUBJECT_STORAGE_KEY = 'danlaWeCare.subjects';
const DEPARTMENT_STORAGE_KEY = 'danlaWeCare.departments';

function getSubjects() {
  const raw = localStorage.getItem(SUBJECT_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveSubjects(subjects) {
  localStorage.setItem(SUBJECT_STORAGE_KEY, JSON.stringify(subjects));
}

function getDepartments() {
  const raw = localStorage.getItem(DEPARTMENT_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function createSubjectCard(subject) {
  const card = document.createElement('article');
  card.className = 'subject-card';
  card.dataset.id = subject.id;

  card.innerHTML = `
    <div class="subject-card-header">
      <div>
        <p class="eyebrow">${subject.code}</p>
        <h3>${subject.name}</h3>
      </div>
      <span class="status-pill ${subject.status === 'Active' ? 'status-active' : 'status-inactive'}">${subject.status}</span>
    </div>
    <p class="subject-description">${subject.description || 'No description provided.'}</p>
    <div class="subject-details">
      <span>Department: ${subject.department || 'Unassigned'}</span>
      <span>Semester: ${subject.semester || 'N/A'}</span>
      <span>Credits: ${subject.credits || 'N/A'}</span>
      <span>Teacher: ${subject.teacher || 'Unassigned'}</span>
      <span>Created: ${formatDateTime(subject.createdAt)}</span>
      <span>Updated: ${formatDateTime(subject.updatedAt)}</span>
    </div>
    <div class="subject-actions">
      <button class="button button-secondary edit-subject">Edit</button>
      <button class="button button-secondary delete-subject">Delete</button>
    </div>
  `;

  return card;
}

function renderSubjectList(subjects) {
  const list = document.getElementById('subject-list');
  list.innerHTML = '';

  if (subjects.length === 0) {
    list.innerHTML = '<p class="empty-state">No subjects have been created yet.</p>';
    return;
  }

  subjects.forEach(subject => {
    list.appendChild(createSubjectCard(subject));
  });
}

function getSearchQuery() {
  const input = document.getElementById('subject-search-input');
  return input?.value.trim().toLowerCase() || '';
}

function filterSubjects(subjects) {
  const query = getSearchQuery();
  if (!query) {
    return subjects;
  }

  return subjects.filter(subject => {
    return [
      subject.name,
      subject.code,
      subject.department,
      subject.semester,
      subject.credits?.toString(),
      subject.teacher,
      subject.description,
      subject.status
    ].some(value => value?.toString().toLowerCase().includes(query));
  });
}

function buildDepartmentOptions(departments) {
  if (departments.length === 0) {
    return '<option value="">No departments available</option>';
  }

  return departments.map(department => `
    <option value="${department.name}">${department.name}</option>
  `).join('');
}

function openSubjectForm(subject = null) {
  const departments = getDepartments();
  const departmentOptions = buildDepartmentOptions(departments);

  const formHtml = `
    <form id="subject-form" class="modal-form">
      <h2>${subject ? 'Edit Subject' : 'New Subject'}</h2>
      <label for="subject-name">Subject Name</label>
      <input id="subject-name" name="subject-name" type="text" value="${subject?.name || ''}" required>

      <label for="subject-code">Subject Code</label>
      <input id="subject-code" name="subject-code" type="text" value="${subject?.code || ''}" required>

      <label for="subject-department">Department</label>
      <select id="subject-department" name="subject-department" required>
        <option value="">Select a department</option>
        ${departmentOptions}
      </select>

      <label for="subject-semester">Semester</label>
      <input id="subject-semester" name="subject-semester" type="text" value="${subject?.semester || ''}" required>

      <label for="subject-credits">Credits</label>
      <input id="subject-credits" name="subject-credits" type="number" min="0" step="0.5" value="${subject?.credits ?? ''}" required>

      <label for="subject-teacher">Assigned Teacher</label>
      <input id="subject-teacher" name="subject-teacher" type="text" value="${subject?.teacher || ''}">

      <label for="subject-description">Description</label>
      <textarea id="subject-description" name="subject-description">${subject?.description || ''}</textarea>

      <label for="subject-status">Status</label>
      <select id="subject-status" name="subject-status">
        <option value="Active" ${subject?.status === 'Active' ? 'selected' : ''}>Active</option>
        <option value="Inactive" ${subject?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
      </select>

      <div class="modal-actions">
        <button class="button button-secondary" type="button" id="cancel-subject">Cancel</button>
        <button class="button button-primary" type="submit">${subject ? 'Save changes' : 'Create subject'}</button>
      </div>
    </form>
  `;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal-card">${formHtml}</div>`;
  document.body.appendChild(modal);

  const departmentSelect = document.getElementById('subject-department');
  if (subject?.department) {
    departmentSelect.value = subject.department;
  }

  document.getElementById('cancel-subject')?.addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  const form = document.getElementById('subject-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    saveSubject(subject?.id);
    document.body.removeChild(modal);
  });
}

function saveSubject(existingId = null) {
  const subjects = getSubjects();
  const departments = getDepartments();

  const name = document.getElementById('subject-name').value.trim();
  const code = document.getElementById('subject-code').value.trim();
  const department = document.getElementById('subject-department').value;
  const semester = document.getElementById('subject-semester').value.trim();
  const credits = document.getElementById('subject-credits').value.trim();
  const teacher = document.getElementById('subject-teacher').value.trim();
  const description = document.getElementById('subject-description').value.trim();
  const status = document.getElementById('subject-status').value;
  const timestamp = Date.now();

  if (!name || !code || !department || !semester || credits === '') {
    return;
  }

  const creditValue = Number(credits);
  if (Number.isNaN(creditValue)) {
    return;
  }

  if (existingId) {
    const updated = subjects.map(subject => {
      if (subject.id !== existingId) return subject;
      return {
        ...subject,
        name,
        code,
        department,
        semester,
        credits: creditValue,
        teacher,
        description,
        status,
        updatedAt: timestamp
      };
    });

    saveSubjects(updated);
    renderSubjectList(filterSubjects(updated));
    return;
  }

  const newSubject = {
    id: `subj-${timestamp}`,
    name,
    code,
    department,
    semester,
    credits: creditValue,
    teacher,
    description,
    status,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  subjects.unshift(newSubject);
  saveSubjects(subjects);
  renderSubjectList(filterSubjects(subjects));
}

function removeSubject(id) {
  const subjects = getSubjects();
  const updated = subjects.filter(subject => subject.id !== id);
  saveSubjects(updated);
  renderSubjectList(filterSubjects(updated));
}

function confirmDelete(id) {
  if (confirm('Delete this subject? This action cannot be undone.')) {
    removeSubject(id);
  }
}

function bindSubjectActions() {
  const list = document.getElementById('subject-list');
  list.addEventListener('click', event => {
    const target = event.target;
    const card = target.closest('.subject-card');
    if (!card) {
      return;
    }

    const id = card.dataset.id;

    if (target.classList.contains('edit-subject')) {
      const subject = getSubjects().find(item => item.id === id);
      openSubjectForm(subject);
    }

    if (target.classList.contains('delete-subject')) {
      confirmDelete(id);
    }
  });
}

function initializeSubjectManagement() {
  const newButton = document.getElementById('new-subject-button');
  const searchInput = document.getElementById('subject-search-input');
  const logoutButton = document.getElementById('admin-logout-button');

  newButton?.addEventListener('click', () => openSubjectForm());
  searchInput?.addEventListener('input', () => {
    renderSubjectList(filterSubjects(getSubjects()));
  });
  logoutButton?.addEventListener('click', () => {
    sessionStorage.setItem('danlaWeCare.adminAuthenticated', 'false');
    window.location.replace('admin-login.html');
  });

  bindSubjectActions();
  renderSubjectList(filterSubjects(getSubjects()));
}

window.addEventListener('DOMContentLoaded', () => {
  if (typeof isAdminAuthenticated === 'function' && !isAdminAuthenticated()) {
    if (typeof redirectToLogin === 'function') {
      redirectToLogin();
      return;
    }
    window.location.replace('admin-login.html');
    return;
  }

  initializeSubjectManagement();
});
