const CLASS_STORAGE_KEY = 'danlaWeCare.classes';
const DEPARTMENT_STORAGE_KEY = 'danlaWeCare.departments';
const SUBJECT_STORAGE_KEY = 'danlaWeCare.subjects';

function getClasses() {
  const raw = localStorage.getItem(CLASS_STORAGE_KEY);
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

function saveClasses(classes) {
  localStorage.setItem(CLASS_STORAGE_KEY, JSON.stringify(classes));
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

function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function createClassCard(clazz) {
  const card = document.createElement('article');
  card.className = 'class-card';
  card.dataset.id = clazz.id;

  card.innerHTML = `
    <div class="class-card-header">
      <div>
        <p class="eyebrow">${clazz.code}</p>
        <h3>${clazz.name}</h3>
      </div>
      <span class="status-pill ${clazz.status === 'Active' ? 'status-active' : 'status-inactive'}">${clazz.status}</span>
    </div>
    <p class="class-description">${clazz.description || 'No description provided.'}</p>
    <div class="class-details">
      <span>Department: ${clazz.department || 'Unassigned'}</span>
      <span>Subject: ${clazz.subject || 'Unassigned'}</span>
      <span>Teacher: ${clazz.teacher || 'Unassigned'}</span>
      <span>Students: ${clazz.students || '0'}</span>
      <span>Created: ${formatDateTime(clazz.createdAt)}</span>
      <span>Updated: ${formatDateTime(clazz.updatedAt)}</span>
    </div>
    <div class="subject-actions">
      <button class="button button-secondary edit-class">Edit</button>
      <button class="button button-secondary delete-class">Delete</button>
    </div>
  `;

  return card;
}

function renderClassList(classes) {
  const list = document.getElementById('class-list');
  list.innerHTML = '';

  if (classes.length === 0) {
    list.innerHTML = '<p class="empty-state">No classes have been created yet.</p>';
    return;
  }

  classes.forEach(clazz => {
    list.appendChild(createClassCard(clazz));
  });
}

function getSearchQuery() {
  const input = document.getElementById('class-search-input');
  return input?.value.trim().toLowerCase() || '';
}

function filterClasses(classes) {
  const query = getSearchQuery();
  if (!query) {
    return classes;
  }

  return classes.filter(clazz => {
    return [
      clazz.name,
      clazz.code,
      clazz.department,
      clazz.subject,
      clazz.teacher,
      clazz.students?.toString(),
      clazz.description,
      clazz.status
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

function buildSubjectOptions(subjects) {
  if (subjects.length === 0) {
    return '<option value="">No subjects available</option>';
  }

  return subjects.map(subject => `
    <option value="${subject.name}">${subject.name}</option>
  `).join('');
}

function openClassForm(clazz = null) {
  const departments = getDepartments();
  const subjects = getSubjects();
  const departmentOptions = buildDepartmentOptions(departments);
  const subjectOptions = buildSubjectOptions(subjects);

  const formHtml = `
    <form id="class-form" class="modal-form">
      <h2>${clazz ? 'Edit Class' : 'New Class'}</h2>

      <label for="class-name">Class Name</label>
      <input id="class-name" name="class-name" type="text" value="${clazz?.name || ''}" required>

      <label for="class-code">Class Code</label>
      <input id="class-code" name="class-code" type="text" value="${clazz?.code || ''}" required>

      <label for="class-department">Department</label>
      <select id="class-department" name="class-department" required>
        <option value="">Select a department</option>
        ${departmentOptions}
      </select>

      <label for="class-subject">Subject</label>
      <select id="class-subject" name="class-subject" required>
        <option value="">Select a subject</option>
        ${subjectOptions}
      </select>

      <label for="class-teacher">Assigned Teacher</label>
      <input id="class-teacher" name="class-teacher" type="text" value="${clazz?.teacher || ''}">

      <label for="class-students">Student Count</label>
      <input id="class-students" name="class-students" type="number" min="0" step="1" value="${clazz?.students ?? ''}">

      <label for="class-description">Description</label>
      <textarea id="class-description" name="class-description">${clazz?.description || ''}</textarea>

      <label for="class-status">Status</label>
      <select id="class-status" name="class-status">
        <option value="Active" ${clazz?.status === 'Active' ? 'selected' : ''}>Active</option>
        <option value="Inactive" ${clazz?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
      </select>

      <div class="modal-actions">
        <button class="button button-secondary" type="button" id="cancel-class">Cancel</button>
        <button class="button button-primary" type="submit">${clazz ? 'Save changes' : 'Create class'}</button>
      </div>
    </form>
  `;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal-card">${formHtml}</div>`;
  document.body.appendChild(modal);

  const departmentSelect = document.getElementById('class-department');
  const subjectSelect = document.getElementById('class-subject');

  if (clazz?.department) {
    departmentSelect.value = clazz.department;
  }

  if (clazz?.subject) {
    subjectSelect.value = clazz.subject;
  }

  document.getElementById('cancel-class')?.addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  const form = document.getElementById('class-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    saveClass(clazz?.id);
    document.body.removeChild(modal);
  });
}

function saveClass(existingId = null) {
  const classes = getClasses();
  const departments = getDepartments();
  const subjects = getSubjects();

  const name = document.getElementById('class-name').value.trim();
  const code = document.getElementById('class-code').value.trim();
  const department = document.getElementById('class-department').value;
  const subject = document.getElementById('class-subject').value;
  const teacher = document.getElementById('class-teacher').value.trim();
  const students = document.getElementById('class-students').value.trim();
  const description = document.getElementById('class-description').value.trim();
  const status = document.getElementById('class-status').value;
  const timestamp = Date.now();

  if (!name || !code || !department || !subject) {
    return;
  }

  const studentCount = students === '' ? 0 : Number(students);
  if (students !== '' && (Number.isNaN(studentCount) || studentCount < 0)) {
    return;
  }

  if (existingId) {
    const updated = classes.map(clazz => {
      if (clazz.id !== existingId) return clazz;
      return {
        ...clazz,
        name,
        code,
        department,
        subject,
        teacher,
        students: studentCount,
        description,
        status,
        updatedAt: timestamp
      };
    });

    saveClasses(updated);
    renderClassList(filterClasses(updated));
    return;
  }

  const newClass = {
    id: `class-${timestamp}`,
    name,
    code,
    department,
    subject,
    teacher,
    students: studentCount,
    description,
    status,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  classes.unshift(newClass);
  saveClasses(classes);
  renderClassList(filterClasses(classes));
}

function removeClass(id) {
  const classes = getClasses();
  const updated = classes.filter(clazz => clazz.id !== id);
  saveClasses(updated);
  renderClassList(filterClasses(updated));
}

function confirmDelete(id) {
  if (confirm('Delete this class? This action cannot be undone.')) {
    removeClass(id);
  }
}

function bindClassActions() {
  const list = document.getElementById('class-list');
  list.addEventListener('click', event => {
    const target = event.target;
    const card = target.closest('.class-card');
    if (!card) {
      return;
    }

    const id = card.dataset.id;

    if (target.classList.contains('edit-class')) {
      const clazz = getClasses().find(item => item.id === id);
      openClassForm(clazz);
    }

    if (target.classList.contains('delete-class')) {
      confirmDelete(id);
    }
  });
}

function initializeClassManagement() {
  const newButton = document.getElementById('new-class-button');
  const searchInput = document.getElementById('class-search-input');
  const logoutButton = document.getElementById('admin-logout-button');

  newButton?.addEventListener('click', () => openClassForm());
  searchInput?.addEventListener('input', () => {
    renderClassList(filterClasses(getClasses()));
  });
  logoutButton?.addEventListener('click', () => {
    sessionStorage.setItem('danlaWeCare.adminAuthenticated', 'false');
    window.location.replace('admin-login.html');
  });

  bindClassActions();
  renderClassList(filterClasses(getClasses()));
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

  initializeClassManagement();
});
