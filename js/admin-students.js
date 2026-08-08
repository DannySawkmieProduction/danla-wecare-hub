const STUDENT_STORAGE_KEY = 'danlaWeCare.students';
const DEPARTMENT_STORAGE_KEY = 'danlaWeCare.departments';
const CLASS_STORAGE_KEY = 'danlaWeCare.classes';

function getStudents() {
  const raw = localStorage.getItem(STUDENT_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveStudents(students) {
  localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(students));
}

function getDepartments() {
  const raw = localStorage.getItem(DEPARTMENT_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function getClasses() {
  const raw = localStorage.getItem(CLASS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
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

function createStudentCard(student) {
  const card = document.createElement('article');
  card.className = 'subject-card';
  card.dataset.id = student.id;

  card.innerHTML = `
    <div class="subject-card-header">
      <div>
        <p class="eyebrow">${student.studentId || ''}</p>
        <h3>${student.name}</h3>
      </div>
      <span class="status-pill ${student.status === 'Active' ? 'status-active' : 'status-inactive'}">${student.status}</span>
    </div>
    <p class="subject-description">${student.email || 'No email provided.'}</p>
    <div class="subject-details">
      <span>Department: ${student.department || 'Unassigned'}</span>
      <span>Class: ${student.class || 'Unassigned'}</span>
      <span>Enrolled: ${student.enrollmentYear || 'N/A'}</span>
      <span>Created: ${formatDateTime(student.createdAt)}</span>
      <span>Updated: ${formatDateTime(student.updatedAt)}</span>
    </div>
    <div class="subject-actions">
      <button class="button button-secondary edit-student">Edit</button>
      <button class="button button-secondary delete-student">Delete</button>
    </div>
  `;

  return card;
}

function renderStudentList(students) {
  const list = document.getElementById('student-list');
  list.innerHTML = '';
  if (students.length === 0) {
    list.innerHTML = '<p class="empty-state">No students have been created yet.</p>';
    return;
  }
  students.forEach(s => list.appendChild(createStudentCard(s)));
}

function getSearchQuery() {
  const input = document.getElementById('student-search-input');
  return input?.value.trim().toLowerCase() || '';
}

function filterStudents(students) {
  const q = getSearchQuery();
  if (!q) return students;
  return students.filter(student => {
    return [
      student.name,
      student.studentId,
      student.email,
      student.department,
      student.class,
      student.enrollmentYear?.toString(),
      student.status
    ].some(v => v?.toString().toLowerCase().includes(q));
  });
}

function buildDepartmentOptions(departments) {
  if (departments.length === 0) return '<option value="">No departments available</option>';
  return departments.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
}

function buildClassOptions(classes) {
  if (classes.length === 0) return '<option value="">No classes available</option>';
  return classes.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

function openStudentForm(student = null) {
  const departments = getDepartments();
  const classes = getClasses();
  const deptOptions = buildDepartmentOptions(departments);
  const classOptions = buildClassOptions(classes);

  const formHtml = `
    <form id="student-form" class="modal-form">
      <h2>${student ? 'Edit Student' : 'New Student'}</h2>

      <label for="student-name">Full name</label>
      <input id="student-name" name="student-name" type="text" value="${student?.name || ''}" required>

      <label for="student-id">Student ID</label>
      <input id="student-id" name="student-id" type="text" value="${student?.studentId || ''}" required>

      <label for="student-email">Email</label>
      <input id="student-email" name="student-email" type="email" value="${student?.email || ''}">

      <label for="student-department">Department</label>
      <select id="student-department" name="student-department">
        <option value="">Select a department</option>
        ${deptOptions}
      </select>

      <label for="student-class">Class</label>
      <select id="student-class" name="student-class">
        <option value="">Select a class</option>
        ${classOptions}
      </select>

      <label for="student-year">Enrollment year</label>
      <input id="student-year" name="student-year" type="number" min="1900" max="2099" step="1" value="${student?.enrollmentYear || ''}">

      <label for="student-status">Status</label>
      <select id="student-status" name="student-status">
        <option value="Active" ${student?.status === 'Active' ? 'selected' : ''}>Active</option>
        <option value="Inactive" ${student?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
      </select>

      <label for="student-notes">Notes</label>
      <textarea id="student-notes" name="student-notes">${student?.notes || ''}</textarea>

      <div class="modal-actions">
        <button class="button button-secondary" type="button" id="cancel-student">Cancel</button>
        <button class="button button-primary" type="submit">${student ? 'Save changes' : 'Create student'}</button>
      </div>
    </form>
  `;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal-card">${formHtml}</div>`;
  document.body.appendChild(modal);

  const deptSelect = document.getElementById('student-department');
  const classSelect = document.getElementById('student-class');
  if (student?.department) deptSelect.value = student.department;
  if (student?.class) classSelect.value = student.class;

  document.getElementById('cancel-student')?.addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  const form = document.getElementById('student-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    saveStudent(student?.id);
    document.body.removeChild(modal);
  });
}

function saveStudent(existingId = null) {
  const students = getStudents();
  const name = document.getElementById('student-name').value.trim();
  const studentId = document.getElementById('student-id').value.trim();
  const email = document.getElementById('student-email').value.trim();
  const department = document.getElementById('student-department').value;
  const clazz = document.getElementById('student-class').value;
  const year = document.getElementById('student-year').value.trim();
  const status = document.getElementById('student-status').value;
  const notes = document.getElementById('student-notes').value.trim();
  const ts = Date.now();

  if (!name || !studentId) return;

  const enrollmentYear = year === '' ? null : Number(year);
  if (year !== '' && (Number.isNaN(enrollmentYear) || enrollmentYear < 1900)) return;

  if (existingId) {
    const updated = students.map(s => {
      if (s.id !== existingId) return s;
      return {
        ...s,
        name,
        studentId,
        email,
        department,
        class: clazz,
        enrollmentYear,
        status,
        notes,
        updatedAt: ts
      };
    });
    saveStudents(updated);
    renderStudentList(filterStudents(updated));
    return;
  }

  const newStudent = {
    id: `stud-${ts}`,
    name,
    studentId,
    email,
    department,
    class: clazz,
    enrollmentYear,
    status,
    notes,
    createdAt: ts,
    updatedAt: ts
  };

  students.unshift(newStudent);
  saveStudents(students);
  renderStudentList(filterStudents(students));
}

function removeStudent(id) {
  const students = getStudents();
  const updated = students.filter(s => s.id !== id);
  saveStudents(updated);
  renderStudentList(filterStudents(updated));
}

function confirmDelete(id) {
  if (confirm('Delete this student? This action cannot be undone.')) {
    removeStudent(id);
  }
}

function bindStudentActions() {
  const list = document.getElementById('student-list');
  list.addEventListener('click', event => {
    const target = event.target;
    const card = target.closest('.subject-card');
    if (!card) return;
    const id = card.dataset.id;
    if (target.classList.contains('edit-student')) {
      const s = getStudents().find(item => item.id === id);
      openStudentForm(s);
    }
    if (target.classList.contains('delete-student')) {
      confirmDelete(id);
    }
  });
}

function initializeStudentManagement() {
  const newButton = document.getElementById('new-student-button');
  const searchInput = document.getElementById('student-search-input');
  const logoutButton = document.getElementById('admin-logout-button');

  newButton?.addEventListener('click', () => openStudentForm());
  searchInput?.addEventListener('input', () => {
    renderStudentList(filterStudents(getStudents()));
  });
  logoutButton?.addEventListener('click', () => {
    sessionStorage.setItem('danlaWeCare.adminAuthenticated', 'false');
    window.location.replace('admin-login.html');
  });

  bindStudentActions();
  renderStudentList(filterStudents(getStudents()));
}

window.addEventListener('DOMContentLoaded', async () => {
  if (typeof isAdminAuthenticated === 'function' && !(await isAdminAuthenticated())) {
    if (typeof redirectToLogin === 'function') {
      redirectToLogin();
      return;
    }
    window.location.replace('admin-login.html');
    return;
  }

  initializeStudentManagement();
});
