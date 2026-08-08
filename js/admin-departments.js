const DEPARTMENT_STORAGE_KEY = 'danlaWeCare.departments';

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

function saveDepartments(departments) {
  localStorage.setItem(DEPARTMENT_STORAGE_KEY, JSON.stringify(departments));
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

function createDepartmentCard(department) {
  const card = document.createElement('article');
  card.className = 'department-card';
  card.dataset.id = department.id;

  card.innerHTML = `
    <div class="department-card-header">
      <div>
        <p class="eyebrow">${department.code}</p>
        <h3>${department.name}</h3>
      </div>
      <span class="status-pill ${department.status === 'Active' ? 'status-active' : 'status-inactive'}">${department.status}</span>
    </div>
    <p class="department-description">${department.description || 'No description provided.'}</p>
    <div class="department-details">
      <span>Head: ${department.hod || 'Unassigned'}</span>
      <span>Created: ${formatDateTime(department.createdAt)}</span>
      <span>Updated: ${formatDateTime(department.updatedAt)}</span>
    </div>
    <div class="department-actions">
      <button class="button button-secondary edit-department">Edit</button>
      <button class="button button-secondary delete-department">Delete</button>
    </div>
  `;

  return card;
}

function renderDepartmentList(departments) {
  const list = document.getElementById('department-list');
  list.innerHTML = '';

  if (departments.length === 0) {
    list.innerHTML = '<p class="empty-state">No departments have been created yet.</p>';
    return;
  }

  departments.forEach(department => {
    list.appendChild(createDepartmentCard(department));
  });
}

function getSearchQuery() {
  const input = document.getElementById('department-search-input');
  return input?.value.trim().toLowerCase() || '';
}

function filterDepartments(departments) {
  const query = getSearchQuery();
  if (!query) {
    return departments;
  }

  return departments.filter(department => {
    return [
      department.name,
      department.code,
      department.description,
      department.hod,
      department.status
    ].some(value => value?.toLowerCase().includes(query));
  });
}

function openDepartmentForm(department = null) {
  const formHtml = `
    <form id="department-form" class="modal-form">
      <h2>${department ? 'Edit Department' : 'New Department'}</h2>
      <label for="department-name">Department Name</label>
      <input id="department-name" name="department-name" type="text" value="${department?.name || ''}" required>

      <label for="department-code">Department Code</label>
      <input id="department-code" name="department-code" type="text" value="${department?.code || ''}" required>

      <label for="department-description">Description</label>
      <textarea id="department-description" name="department-description">${department?.description || ''}</textarea>

      <label for="department-hod">Head of Department</label>
      <input id="department-hod" name="department-hod" type="text" value="${department?.hod || ''}">

      <label for="department-status">Status</label>
      <select id="department-status" name="department-status">
        <option value="Active" ${department?.status === 'Active' ? 'selected' : ''}>Active</option>
        <option value="Inactive" ${department?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
      </select>

      <div class="modal-actions">
        <button class="button button-secondary" type="button" id="cancel-department">Cancel</button>
        <button class="button button-primary" type="submit">${department ? 'Save changes' : 'Create department'}</button>
      </div>
    </form>
  `;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal-card">${formHtml}</div>`;
  document.body.appendChild(modal);

  document.getElementById('cancel-department')?.addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  const form = document.getElementById('department-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    saveDepartment(department?.id);
    document.body.removeChild(modal);
  });
}

function saveDepartment(existingId = null) {
  const departments = getDepartments();

  const name = document.getElementById('department-name').value.trim();
  const code = document.getElementById('department-code').value.trim();
  const description = document.getElementById('department-description').value.trim();
  const hod = document.getElementById('department-hod').value.trim();
  const status = document.getElementById('department-status').value;
  const timestamp = Date.now();

  if (!name || !code) {
    return;
  }

  if (existingId) {
    const updated = departments.map(department => {
      if (department.id !== existingId) return department;
      return {
        ...department,
        name,
        code,
        description,
        hod,
        status,
        updatedAt: timestamp
      };
    });

    saveDepartments(updated);
    renderDepartmentList(filterDepartments(updated));
    return;
  }

  const newDepartment = {
    id: `dept-${timestamp}`,
    name,
    code,
    description,
    hod,
    status,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  departments.unshift(newDepartment);
  saveDepartments(departments);
  renderDepartmentList(filterDepartments(departments));
}

function removeDepartment(id) {
  const departments = getDepartments();
  const updated = departments.filter(department => department.id !== id);
  saveDepartments(updated);
  renderDepartmentList(filterDepartments(updated));
}

function confirmDelete(id) {
  if (confirm('Delete this department? This action cannot be undone.')) {
    removeDepartment(id);
  }
}

function bindDepartmentActions() {
  const list = document.getElementById('department-list');
  list.addEventListener('click', event => {
    const target = event.target;
    const card = target.closest('.department-card');
    if (!card) {
      return;
    }

    const id = card.dataset.id;

    if (target.classList.contains('edit-department')) {
      const department = getDepartments().find(item => item.id === id);
      openDepartmentForm(department);
    }

    if (target.classList.contains('delete-department')) {
      confirmDelete(id);
    }
  });
}

function initializeDepartmentManagement() {
  const newButton = document.getElementById('new-department-button');
  const searchInput = document.getElementById('department-search-input');
  const logoutButton = document.getElementById('admin-logout-button');

  newButton?.addEventListener('click', () => openDepartmentForm());
  searchInput?.addEventListener('input', () => {
    renderDepartmentList(filterDepartments(getDepartments()));
  });
  logoutButton?.addEventListener('click', () => {
    sessionStorage.setItem('danlaWeCare.adminAuthenticated', 'false');
    window.location.replace('admin-login.html');
  });

  bindDepartmentActions();
  renderDepartmentList(filterDepartments(getDepartments()));
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

  initializeDepartmentManagement();
});
