const ASSIGN_STORAGE_KEY = 'danlaWeCare.assignments';
const DEPARTMENT_STORAGE_KEY = 'danlaWeCare.departments';
const CLASS_STORAGE_KEY = 'danlaWeCare.classes';
const SUBJECT_STORAGE_KEY = 'danlaWeCare.subjects';
const FACULTY_STORAGE_KEY = 'danlaWeCare.faculty';
const STUDENT_STORAGE_KEY = 'danlaWeCare.students';

function getAssignments(){ const raw = localStorage.getItem(ASSIGN_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function saveAssignments(arr){ localStorage.setItem(ASSIGN_STORAGE_KEY, JSON.stringify(arr)); }
function getDepartments(){ const raw = localStorage.getItem(DEPARTMENT_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getClasses(){ const raw = localStorage.getItem(CLASS_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getSubjects(){ const raw = localStorage.getItem(SUBJECT_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getFaculty(){ const raw = localStorage.getItem(FACULTY_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getStudents(){ const raw = localStorage.getItem(STUDENT_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }

function formatDate(ts){ return ts ? new Date(ts).toLocaleString() : '-'; }

function createAssignCard(a){ const card = document.createElement('article'); card.className='class-card'; card.dataset.id = a.id; const statusClass = a.status==='Published'? 'status-active' : (a.status==='Closed' ? 'status-inactive' : 'status-inactive'); const submissions = a.submissions || []; const submitted = submissions.filter(s=> s.status==='Submitted').length; card.innerHTML = `
  <div class="class-card-header">
    <div>
      <p class="eyebrow">${a.type} • ${a.academicYear} ${a.semester? '• '+a.semester : ''}</p>
      <h3>${a.title}</h3>
    </div>
    <span class="status-pill ${statusClass}">${a.status}</span>
  </div>
  <p class="class-description">Subject: ${a.subject || '-'} • Due: ${a.dueDate || '-'} ${a.presentationSchedule? '• Presentation: '+a.presentationSchedule : ''}</p>
  <div class="class-details">
    <span>Dept: ${a.department || '-'}</span>
    <span>Class: ${a.className || '-'}</span>
    <span>Max Marks: ${a.maxMarks ?? '-'}</span>
    <span>Invigilator: ${a.facultyName || '-'}</span>
    <span>Submissions: ${submitted}/${submissions.length || 0}</span>
    <span>Created: ${formatDate(a.createdAt)}</span>
  </div>
  <div class="department-actions">
    <button class="button button-secondary view-assign">View</button>
    <button class="button button-secondary edit-assign">Edit</button>
    <button class="button button-secondary delete-assign">Delete</button>
  </div>
`;
  return card; }

function renderAssignList(items){ const list = document.getElementById('assign-list'); list.innerHTML=''; if(items.length===0){ list.innerHTML='<p class="empty-state">No assignments or projects found.</p>'; return; } items.forEach(i=> list.appendChild(createAssignCard(i))); }

function getSearchQuery(){ const input = document.getElementById('assign-search-input'); return input?.value.trim().toLowerCase() || ''; }

function filterAssignments(all){ const type = document.getElementById('assign-filter-type')?.value || ''; const dept = document.getElementById('assign-filter-dept')?.value || ''; const cls = document.getElementById('assign-filter-class')?.value || ''; const status = document.getElementById('assign-filter-status')?.value || ''; const q = getSearchQuery(); let res = all.slice(); if(type) res = res.filter(r=> r.type===type); if(dept) res = res.filter(r=> r.department===dept); if(cls) res = res.filter(r=> r.className===cls); if(status) res = res.filter(r=> r.status===status); if(q) res = res.filter(r=> [r.title,r.description,r.instructions,r.subject,r.facultyName].some(v=> (v||'').toString().toLowerCase().includes(q))); // sort by created desc
  res.sort((a,b)=> b.createdAt - a.createdAt); return res; }

function buildFilterOptions(){ const deps = getDepartments(); const classes = getClasses(); const depSel = document.getElementById('assign-filter-dept'); const classSel = document.getElementById('assign-filter-class'); if(depSel) depSel.innerHTML = '<option value="">All</option>' + deps.map(d=>`<option value="${d.name}">${d.name}</option>`).join(''); if(classSel) classSel.innerHTML = '<option value="">All</option>' + classes.map(c=>`<option value="${c.name}">${c.name}</option>`).join(''); }

function openAssignForm(item=null){ const deps = getDepartments(); const classes = getClasses(); const subjects = getSubjects(); const faculty = getFaculty(); const deptOptions = deps.length? deps.map(d=>`<option value="${d.name}">${d.name}</option>`).join('') : '<option value="">No departments</option>'; const classOptions = classes.length? classes.map(c=>`<option value="${c.name}">${c.name}</option>`).join('') : '<option value="">No classes</option>'; const subjectOptions = subjects.length? subjects.map(s=>`<option value="${s.name}">${s.name}</option>`).join('') : '<option value="">No subjects</option>'; const facultyOptions = faculty.length? faculty.map(f=>`<option value="${f.id}">${f.name}</option>`).join('') : '<option value="">No faculty</option>';

  const html = `
    <form id="assign-form" class="modal-form">
      <h2>${item? 'Edit Item':'New Item'}</h2>

      <label for="assign-type">Type</label>
      <select id="assign-type"><option value="Assignment">Assignment</option><option value="Project">Project</option><option value="Presentation">Presentation</option></select>

      <label for="assign-year">Academic Year</label>
      <input id="assign-year" type="text" value="${item?.academicYear||''}" required>

      <label for="assign-semester">Semester</label>
      <input id="assign-semester" type="text" value="${item?.semester||''}">

      <label for="assign-dept">Department</label>
      <select id="assign-dept"> <option value="">Select department</option> ${deptOptions}</select>

      <label for="assign-class">Class</label>
      <select id="assign-class"> <option value="">Select class</option> ${classOptions}</select>

      <label for="assign-subject">Subject</label>
      <select id="assign-subject"> <option value="">Select subject</option> ${subjectOptions}</select>

      <label for="assign-faculty">Faculty</label>
      <select id="assign-faculty"> <option value="">Select faculty</option> ${facultyOptions}</select>

      <label for="assign-title">Title</label>
      <input id="assign-title" type="text" value="${item?.title||''}" required>

      <label for="assign-description">Description</label>
      <textarea id="assign-description">${item?.description||''}</textarea>

      <label for="assign-instructions">Instructions</label>
      <textarea id="assign-instructions">${item?.instructions||''}</textarea>

      <label for="assign-due">Due Date</label>
      <input id="assign-due" type="date" value="${item?.dueDate||''}">

      <label for="assign-max">Maximum Marks</label>
      <input id="assign-max" type="number" min="0" value="${item?.maxMarks||''}">

      <label for="assign-status">Status</label>
      <select id="assign-status"><option value="Draft" ${item?.status==='Draft'?'selected':''}>Draft</option><option value="Published" ${item?.status==='Published'?'selected':''}>Published</option><option value="Closed" ${item?.status==='Closed'?'selected':''}>Closed</option></select>

      <label for="assign-remarks">Teacher Remarks</label>
      <input id="assign-remarks" type="text" value="${item?.teacherRemarks||''}">

      <label for="assign-file">File (placeholder)</label>
      <input id="assign-file" type="text" placeholder="filename.pdf" value="${item?.file||''}">

      <label for="assign-presentation">Presentation Schedule (for Presentation)</label>
      <input id="assign-presentation" type="datetime-local" value="${item?.presentationSchedule||''}">

      <div class="modal-actions">
        <button class="button button-secondary" type="button" id="cancel-assign">Cancel</button>
        <button class="button button-primary" type="submit">${item? 'Save changes':'Create item'}</button>
      </div>
    </form>
  `;

  const modal = document.createElement('div'); modal.className='modal-overlay'; modal.innerHTML = `<div class="modal-card">${html}</div>`; document.body.appendChild(modal);
  if(item){ document.getElementById('assign-type').value = item.type || 'Assignment'; document.getElementById('assign-dept').value = item.department || ''; document.getElementById('assign-class').value = item.className || ''; document.getElementById('assign-subject').value = item.subject || ''; document.getElementById('assign-faculty').value = item.facultyId || ''; }
  document.getElementById('cancel-assign')?.addEventListener('click', ()=> document.body.removeChild(modal));
  document.getElementById('assign-form')?.addEventListener('submit', (ev)=>{ ev.preventDefault(); saveAssignment(item?.id); document.body.removeChild(modal); });
}

function saveAssignment(existingId=null){ const items = getAssignments(); const type = document.getElementById('assign-type').value; const academicYear = document.getElementById('assign-year').value.trim(); const semester = document.getElementById('assign-semester').value.trim(); const department = document.getElementById('assign-dept').value; const className = document.getElementById('assign-class').value; const subject = document.getElementById('assign-subject').value; const facultyId = document.getElementById('assign-faculty').value; const title = document.getElementById('assign-title').value.trim(); const description = document.getElementById('assign-description').value.trim(); const instructions = document.getElementById('assign-instructions').value.trim(); const dueDate = document.getElementById('assign-due').value; const maxMarks = document.getElementById('assign-max').value; const status = document.getElementById('assign-status').value; const teacherRemarks = document.getElementById('assign-remarks').value.trim(); const file = document.getElementById('assign-file').value.trim(); const presentationSchedule = document.getElementById('assign-presentation').value; const timestamp = Date.now();
  if(!title || !type || !academicYear){ alert('Please fill required fields: Title, Type, Academic Year.'); return; }

  // prevent duplicate exact title for same class/subject/type
  const duplicate = items.find(i=> i.title===title && i.className===className && i.subject===subject && i.type===type && i.id !== existingId);
  if(duplicate){ alert('An item with the same title, class, subject and type already exists.'); return; }

  const faculty = getFaculty().find(f=> f.id===facultyId);
  const base = { type, academicYear, semester, department, className, subject, facultyId, facultyName: faculty? faculty.name:'', title, description, instructions, dueDate, maxMarks: maxMarks? Number(maxMarks): undefined, status, teacherRemarks, file, presentationSchedule };

  if(existingId){ const updated = items.map(i=> i.id===existingId? { ...i, ...base, updatedAt: timestamp } : i); saveAssignments(updated); renderAssignList(filterAssignments(updated)); return; }

  const newItem = { id:`assign-${timestamp}-${Math.random().toString(36).slice(2,6)}`, submissions: [], ...base, createdAt: timestamp, updatedAt: timestamp };
  items.unshift(newItem); saveAssignments(items); renderAssignList(filterAssignments(items)); }

function removeAssignment(id){ const items = getAssignments(); const updated = items.filter(i=> i.id !== id); saveAssignments(updated); renderAssignList(filterAssignments(updated)); }
function confirmDelete(id){ if(confirm('Delete this item? This cannot be undone.')) removeAssignment(id); }

function viewAssignment(id){ const item = getAssignments().find(i=> i.id===id); if(!item) return; const submissions = item.submissions || []; let html = `<div class="modal-overlay"><div class="modal-card"><h2>${item.title}</h2><p><strong>Type:</strong> ${item.type} • <strong>Status:</strong> ${item.status}</p><p>${item.description||''}</p><h3>Instructions</h3><p>${item.instructions||''}</p><h3>Submissions (${submissions.length})</h3><div style="max-height:40vh;overflow:auto;padding:0.5rem">`;
  // Admin controls: export/import submissions, export student report
  html = `<div class="modal-overlay"><div class="modal-card"><h2>${item.title}</h2><div style="display:flex;gap:0.5rem;margin-bottom:0.5rem"><button class="button button-secondary" id="export-subs">Export Submissions CSV</button><label class="button button-secondary" for="import-subs-input">Import Submissions<input id="import-subs-input" type="file" accept="text/csv" style="display:none"></label><button class="button button-secondary" id="export-all-student-reports">Export All Student Reports (CSV)</button></div><p><strong>Type:</strong> ${item.type} • <strong>Status:</strong> ${item.status}</p><p>${item.description||''}</p><h3>Instructions</h3><p>${item.instructions||''}</p><h3>Submissions (${submissions.length})</h3><div style="max-height:40vh;overflow:auto;padding:0.5rem">`;
  if(submissions.length===0) html += '<p class="empty-state">No submissions yet.</p>'; else submissions.forEach(s=>{ const student = getStudents().find(st=> st.id===s.studentId); html += `<div style="padding:0.5rem;border-bottom:1px solid rgba(255,255,255,0.04)"><strong>${student? student.name: s.studentId}</strong> — Status: ${s.status} — Submitted: ${s.submissionDate? s.submissionDate : '-'} <div style="color:#a9b7c7">Remarks: ${s.remarks||''} • File: ${s.file||'-'}</div><div style="margin-top:0.5rem"><button class="button button-secondary mark-submitted" data-student="${s.studentId}" data-id="${id}">Mark Submitted</button> <button class="button button-secondary export-student-report" data-student="${s.studentId}">Export Student Report</button></div></div>`; });
  html += `</div><div class="modal-actions"><button class="button button-secondary" id="close-assign-view">Close</button></div></div></div>`;
  const wrap = document.createElement('div'); wrap.innerHTML = html; document.body.appendChild(wrap.firstChild);
  document.getElementById('close-assign-view')?.addEventListener('click', ()=> document.querySelector('.modal-overlay')?.remove());
  document.querySelectorAll('.mark-submitted').forEach(btn=> btn.addEventListener('click', ()=>{ const studentId = btn.dataset.student; const assignId = btn.dataset.id; markSubmission(assignId, studentId); document.querySelector('.modal-overlay')?.remove(); }));

  // wire export/import buttons in the modal
  document.getElementById('export-subs')?.addEventListener('click', ()=> exportSubmissionsCSV(id));
  const importInput = document.getElementById('import-subs-input'); importInput?.addEventListener('change', e=>{ const f=e.target.files[0]; if(f) importSubmissionsCSVFile(id, f); importInput.value=''; });
  document.querySelectorAll('.export-student-report').forEach(btn=> btn.addEventListener('click', ()=>{ const studentId = btn.dataset.student; exportStudentReportCSV(studentId); }));
  document.getElementById('export-all-student-reports')?.addEventListener('click', ()=>{ exportAllStudentReportsCSV(); });
 }

// --- Submissions CSV export/import and reports ---
const SUBS_HEADER = ['assignmentId','assignmentTitle','studentId','studentName','status','submissionDate','remarks','fileName'];

function exportSubmissionsCSV(assignId){ const item = getAssignments().find(i=> i.id===assignId); if(!item) return; const rows = item.submissions || []; if(rows.length===0){ alert('No submissions to export.'); return; } const lines = [SUBS_HEADER.join(',')]; rows.forEach(s=>{ const vals = SUBS_HEADER.map(h=> escapeCsv(h==='assignmentId'? assignId : (h==='assignmentTitle'? item.title : (s[h]||'')))); lines.push(vals.join(',')); }); const blob = new Blob([lines.join('\n')], {type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`submissions-${assignId}-${Date.now()}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

function validateSubmissionRow(obj){ const errors=[]; if(!obj.assignmentId) errors.push('Missing assignmentId'); if(!obj.studentId) errors.push('Missing studentId'); if(!obj.status) errors.push('Missing status'); return errors; }

function importSubmissionsCSVFile(assignId, file){ if(!file) return; const reader=new FileReader(); reader.onload = e=>{ const text = e.target.result; const lines = text.split(/\r?\n/).filter(Boolean); if(lines.length<2){ alert('CSV has no data rows.'); return; } const header = parseCSVLine(lines[0]).map(h=>h.trim()); const missing = SUBS_HEADER.filter(h=> !header.includes(h)); if(missing.length>0){ alert('CSV missing required columns: ' + missing.join(', ')); return; } const validRows=[]; const errors=[]; const items = getAssignments(); const item = items.find(i=> i.id===assignId); if(!item){ alert('Assignment not found'); return; } for(let i=1;i<lines.length;i++){ const cols = parseCSVLine(lines[i]); if(cols.length===0) continue; const obj={}; header.forEach((h,idx)=> obj[h]= (cols[idx]||'').trim() ); const rowErrors = validateSubmissionRow(obj); if(rowErrors.length>0){ errors.push(`Row ${i+1}: ${rowErrors.join('; ')}`); } else { // check student exists
        const studentExists = getStudents().some(s=> s.id===obj.studentId);
        if(!studentExists) { errors.push(`Row ${i+1}: Student ${obj.studentId} not found`); } else { // check duplicate
          const dup = item.submissions?.find(s=> s.studentId===obj.studentId);
          if(dup) errors.push(`Row ${i+1}: Duplicate submission for student ${obj.studentId}`); else validRows.push(obj);
        }
      }
    }
    if(validRows.length===0){ alert('No valid submission rows to import.'); showImportPreviewAssign([], errors, ()=>{}, ()=>{}); return; }
    showImportPreviewAssign(validRows, errors, ()=>{ validRows.forEach(r=>{ const ts = Date.now(); item.submissions = item.submissions || []; item.submissions.push({ studentId: r.studentId, studentName: r.studentName||'', status: r.status, submissionDate: r.submissionDate||new Date().toISOString(), remarks: r.remarks||'', file: r.fileName||'', fileData: r.fileData||'' }); }); saveAssignments(items); renderAssignList(filterAssignments(items)); alert('Imported ' + validRows.length + ' submissions.'); }, ()=>{ alert('Import aborted.'); });
  };
  reader.readAsText(file);
}

function exportStudentReportCSV(studentId){ const assignments = getAssignments(); const rows = []; assignments.forEach(a=>{ const s = (a.submissions||[]).find(x=> x.studentId===studentId); rows.push({ assignmentId: a.id, title: a.title, type: a.type, subject: a.subject, className: a.className, maxMarks: a.maxMarks, status: a.status, submissionStatus: s? s.status : 'Not Submitted', submissionDate: s? s.submissionDate : '', remarks: s? s.remarks : '' }); }); const header = ['studentId','assignmentId','title','type','subject','className','maxMarks','status','submissionStatus','submissionDate','remarks']; const lines=[header.join(',')]; const student = getStudents().find(st=> st.id===studentId); rows.forEach(r=>{ const vals = header.map(h=> escapeCsv(h==='studentId'? studentId : (r[h]||''))); lines.push(vals.join(',')); }); const blob = new Blob([lines.join('\n')], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download = `student-report-${studentId}-${Date.now()}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

function exportAllStudentReportsCSV(){ const students = getStudents(); if(students.length===0){ alert('No students found.'); return; } students.forEach((st,idx)=>{ setTimeout(()=> exportStudentReportCSV(st.id), idx*400); }); alert('Exporting student reports (one file per student).'); }

function markSubmission(assignId, studentId){ const items = getAssignments(); const item = items.find(i=> i.id===assignId); if(!item) return; item.submissions = item.submissions || []; const sub = item.submissions.find(s=> s.studentId===studentId); const timestamp = new Date().toISOString(); if(sub){ sub.status = 'Submitted'; sub.submissionDate = timestamp; } else { item.submissions.push({ studentId, status:'Submitted', submissionDate: timestamp, remarks: '', file: '' }); }
  saveAssignments(items); renderAssignList(filterAssignments(items)); }

function bindAssignActions(){ const list = document.getElementById('assign-list'); list.addEventListener('click', (e)=>{ const target = e.target; const card = target.closest('.class-card'); if(!card) return; const id = card.dataset.id; if(target.classList.contains('edit-assign')){ const it = getAssignments().find(x=> x.id===id); openAssignForm(it); } if(target.classList.contains('delete-assign')){ confirmDelete(id); } if(target.classList.contains('view-assign')){ viewAssignment(id); } }); }

function initializeAssignments(){ const newBtn = document.getElementById('new-assign-button'); const search = document.getElementById('assign-search-input'); const filterType = document.getElementById('assign-filter-type'); const filterDept = document.getElementById('assign-filter-dept'); const filterClass = document.getElementById('assign-filter-class'); const filterStatus = document.getElementById('assign-filter-status'); const logout = document.getElementById('admin-logout-button');
  newBtn?.addEventListener('click', ()=> openAssignForm()); search?.addEventListener('input', ()=> renderAssignList(filterAssignments(getAssignments()))); filterType?.addEventListener('change', ()=> renderAssignList(filterAssignments(getAssignments()))); filterDept?.addEventListener('change', ()=> renderAssignList(filterAssignments(getAssignments()))); filterClass?.addEventListener('change', ()=> renderAssignList(filterAssignments(getAssignments()))); filterStatus?.addEventListener('change', ()=> renderAssignList(filterAssignments(getAssignments())));
  logout?.addEventListener('click', ()=>{ sessionStorage.setItem('danlaWeCare.adminAuthenticated','false'); window.location.replace('admin-login.html'); });

  buildFilterOptions(); const items = getAssignments(); renderAssignList(filterAssignments(items)); bindAssignActions(); }

// --- CSV export/import for assignments ---
const ASSIGN_HEADER = ['id','type','academicYear','semester','department','className','subject','facultyId','facultyName','title','description','instructions','dueDate','maxMarks','status','teacherRemarks','file','presentationSchedule','createdAt','updatedAt'];

function escapeCsv(val){ return `"${(val===undefined||val===null?'':String(val)).replace(/"/g,'""')}"`; }

function exportAssignmentsCSV(){ const rows = filterAssignments(getAssignments()); if(rows.length===0){ alert('No items to export.'); return; } const lines=[ASSIGN_HEADER.join(',')]; rows.forEach(r=>{ const vals = ASSIGN_HEADER.map(h=> escapeCsv(r[h])); lines.push(vals.join(',')); }); const blob=new Blob([lines.join('\n')], {type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`assignments-${Date.now()}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

function parseCSVLine(line){ const out=[]; let cur=''; let inQuotes=false; for(let i=0;i<line.length;i++){ const ch=line[i]; if(ch==='"'){ if(inQuotes && line[i+1]==='"'){ cur+='"'; i++; } else { inQuotes = !inQuotes; } } else if(ch===',' && !inQuotes){ out.push(cur); cur=''; } else { cur+=ch; } } out.push(cur); return out; }

function validateAssignRow(obj){ const errors=[]; if(!obj.type) errors.push('Missing type'); if(!obj.academicYear) errors.push('Missing academicYear'); if(!obj.title) errors.push('Missing title'); // numeric check
  if(obj.maxMarks!==undefined && obj.maxMarks!=='' && isNaN(Number(obj.maxMarks))) errors.push('maxMarks is not a number'); return errors; }

function showImportPreviewAssign(validRows, errors, onContinue, onAbort){ const modal=document.createElement('div'); modal.className='modal-overlay'; let inner=`<div class="modal-card"><h2>CSV Import Preview</h2><div style="max-height:40vh;overflow:auto;padding:0.5rem">`; if(errors.length>0) inner += `<h4>Errors</h4><ul>${errors.map(e=>`<li>${e}</li>`).join('')}</ul>`; inner += `<h4>Valid rows: ${validRows.length}</h4><table style="width:100%;border-collapse:collapse"><thead><tr>${ASSIGN_HEADER.map(h=>`<th style="text-align:left;padding:6px;border-bottom:1px solid rgba(255,255,255,0.04)">${h}</th>`).join('')}</tr></thead><tbody>`; validRows.slice(0,200).forEach(r=>{ inner += `<tr>${ASSIGN_HEADER.map(h=>`<td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.03)">${(r[h]||'')}</td>`).join('')}</tr>`; }); inner += `</tbody></table></div><div class="modal-actions"><button class="button button-secondary" id="import-assign-abort">Abort</button><button class="button button-primary" id="import-assign-continue">Import valid rows</button></div></div>`; modal.innerHTML = inner; document.body.appendChild(modal); document.getElementById('import-assign-abort')?.addEventListener('click', ()=>{ document.body.removeChild(modal); if(onAbort) onAbort(); }); document.getElementById('import-assign-continue')?.addEventListener('click', ()=>{ document.body.removeChild(modal); if(onContinue) onContinue(); }); }

function importAssignmentsCSVFile(file){ if(!file) return; const reader=new FileReader(); reader.onload = e=>{ const text = e.target.result; const lines = text.split(/\r?\n/).filter(Boolean); if(lines.length<2){ alert('CSV has no data rows.'); return; } const header = parseCSVLine(lines[0]).map(h=>h.trim()); const missing = ASSIGN_HEADER.filter(h=> !header.includes(h)); if(missing.length>0){ alert('CSV missing required columns: ' + missing.join(', ')); return; } const validRows=[]; const errors=[]; const existing = getAssignments(); for(let i=1;i<lines.length;i++){ const cols = parseCSVLine(lines[i]); if(cols.length===0) continue; const obj={}; header.forEach((h,idx)=> obj[h]= (cols[idx]||'').trim() ); const rowErrors = validateAssignRow(obj); if(rowErrors.length>0){ errors.push(`Row ${i+1}: ${rowErrors.join('; ')}`); } else { // duplicate check title+class+subject+type
      const dup = existing.find(x=> x.title===obj.title && x.className===obj.className && x.subject===obj.subject && x.type===obj.type);
      if(dup) errors.push(`Row ${i+1}: Duplicate existing item with same title/class/subject/type`); else validRows.push(obj);
    }
  }
  if(validRows.length===0){ alert('No valid rows to import.'); showImportPreviewAssign([], errors, ()=>{}, ()=>{}); return; }
  showImportPreviewAssign(validRows, errors, ()=>{ const items = getAssignments(); validRows.forEach(r=>{ const ts = Date.now(); const base = { id: r.id || `assign-${ts}-${Math.random().toString(36).slice(2,6)}`, type: r.type, academicYear: r.academicYear, semester: r.semester, department: r.department, className: r.className, subject: r.subject, facultyId: r.facultyId, facultyName: r.facultyName, title: r.title, description: r.description, instructions: r.instructions, dueDate: r.dueDate, maxMarks: r.maxMarks?Number(r.maxMarks):undefined, status: r.status||'Draft', teacherRemarks: r.teacherRemarks||'', file: r.file||'', presentationSchedule: r.presentationSchedule||'', submissions: [], createdAt: r.createdAt? Number(r.createdAt): ts, updatedAt: r.updatedAt? Number(r.updatedAt): ts }; items.unshift(base); }); saveAssignments(items); renderAssignList(filterAssignments(items)); alert('Imported ' + validRows.length + ' rows.'); }, ()=>{ alert('Import aborted.'); });
}; reader.readAsText(file); }

// wire CSV buttons
window.addEventListener('DOMContentLoaded', ()=>{
  const exportBtn = document.getElementById('export-assignments'); exportBtn?.addEventListener('click', exportAssignmentsCSV);
  const importInput = document.getElementById('import-assignments-input'); importInput?.addEventListener('change', e=>{ const f=e.target.files[0]; if(f) importAssignmentsCSVFile(f); importInput.value=''; });
});

window.addEventListener('DOMContentLoaded', ()=>{ if(typeof isAdminAuthenticated === 'function' && !isAdminAuthenticated()){ if(typeof redirectToLogin === 'function'){ redirectToLogin(); return; } window.location.replace('admin-login.html'); return; } initializeAssignments(); });
