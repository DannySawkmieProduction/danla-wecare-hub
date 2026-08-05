const MARKS_STORAGE_KEY = 'danlaWeCare.marks';
const EXAM_STORAGE_KEY = 'danlaWeCare.exams';
const STUDENT_STORAGE_KEY = 'danlaWeCare.students';
const SUBJECT_STORAGE_KEY = 'danlaWeCare.subjects';
const CLASS_STORAGE_KEY = 'danlaWeCare.classes';
const FACULTY_STORAGE_KEY = 'danlaWeCare.faculty';
const GRADING_RULES_KEY = 'danlaWeCare.gradingRules';

function getMarks(){ const raw = localStorage.getItem(MARKS_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function saveMarks(arr){ localStorage.setItem(MARKS_STORAGE_KEY, JSON.stringify(arr)); }
function getExams(){ const raw = localStorage.getItem(EXAM_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getStudents(){ const raw = localStorage.getItem(STUDENT_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getSubjects(){ const raw = localStorage.getItem(SUBJECT_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getClasses(){ const raw = localStorage.getItem(CLASS_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getFaculty(){ const raw = localStorage.getItem(FACULTY_STORAGE_KEY); if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }

function getGradingRules(){ const raw = localStorage.getItem(GRADING_RULES_KEY); if(!raw){ const defaultRules = {
  // percentage thresholds descending
  gradeMap: [
    {min:90, grade:'A+', gpa:4.0},
    {min:80, grade:'A', gpa:4.0},
    {min:70, grade:'B+', gpa:3.5},
    {min:60, grade:'B', gpa:3.0},
    {min:50, grade:'C', gpa:2.0},
    {min:40, grade:'D', gpa:1.0},
    {min:0,  grade:'F', gpa:0.0}
  ],
  passPercentage:40
}; localStorage.setItem(GRADING_RULES_KEY, JSON.stringify(defaultRules)); return defaultRules; }
try{ const p=JSON.parse(raw); return p; }catch(e){ return {}; } }
function saveGradingRules(rules){ localStorage.setItem(GRADING_RULES_KEY, JSON.stringify(rules)); }

function formatDateTime(ts){ return new Date(ts).toLocaleString([], { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}); }

function calculateMarksAndGrades(record){ // record: {internal, external, practical, maxMarks, passingMarks}
  const internal = Number(record.internalMarks || 0);
  const external = Number(record.externalMarks || 0);
  const practical = Number(record.practicalMarks || 0);
  const total = internal + external + practical;
  const max = Number(record.maxMarks || record.examMaxMarks || 100);
  const percentage = max>0? (total / max) * 100 : 0;
  const rules = getGradingRules();
  let grade='F', gpa=0.0;
  const map = rules.gradeMap || [];
  for(const m of map){ if(percentage >= m.min){ grade = m.grade; gpa = m.gpa; break; } }
  const passMark = record.passingMarks !== undefined ? Number(record.passingMarks) : (rules.passPercentage !== undefined ? (rules.passPercentage/100)*max : (0.4*max));
  const pass = total >= passMark;
  return { internal, external, practical, total, max, percentage, grade, gpa, pass, passMark };
}

function createMarkCard(mark){ const card = document.createElement('article'); card.className='class-card'; card.dataset.id = mark.id; const status = mark.pass? 'Pass':'Fail'; card.innerHTML = `
  <div class="class-card-header">
    <div>
      <p class="eyebrow">${mark.examName || mark.examId} • ${mark.academicYear || ''}</p>
      <h3>${mark.studentName} — ${mark.subject}</h3>
    </div>
    <span class="status-pill ${mark.pass? 'status-active':'status-inactive'}">${status}</span>
  </div>
  <p class="class-description">Total: ${mark.total} / ${mark.max} • ${mark.percentage.toFixed(2)}% • Grade: ${mark.grade} • GPA: ${mark.gpa}</p>
  <div class="class-details">
    <span>Class: ${mark.className || ''}</span>
    <span>Exam: ${mark.examName || ''}</span>
    <span>Subject: ${mark.subject || ''}</span>
    <span>Invigilator: ${mark.facultyName || ''}</span>
    <span>Rank: ${mark.rank ?? '-'}</span>
    <span>Recorded: ${formatDateTime(mark.createdAt)}</span>
  </div>
  <div class="department-actions">
    <button class="button button-secondary edit-mark">Edit</button>
    <button class="button button-secondary delete-mark">Delete</button>
  </div>
`;
  return card; }

function renderMarksList(marks){ const list = document.getElementById('marks-list'); list.innerHTML=''; if(marks.length===0){ list.innerHTML='<p class="empty-state">No marks recorded yet.</p>'; return; } marks.forEach(m=> list.appendChild(createMarkCard(m))); }

function getSearchQuery(){ const input = document.getElementById('marks-search-input'); return input?.value.trim().toLowerCase() || ''; }

function filterAndSortMarks(all){ const query = getSearchQuery(); const examFilter = document.getElementById('marks-filter-exam')?.value || ''; const classFilter = document.getElementById('marks-filter-class')?.value || ''; const statusFilter = document.getElementById('marks-filter-status')?.value || ''; let res = all.slice(); if(examFilter) res = res.filter(r=> r.examId === examFilter); if(classFilter) res = res.filter(r=> r.className === classFilter); if(statusFilter) res = res.filter(r=> (r.pass? 'Pass':'Fail') === statusFilter); if(query) res = res.filter(r=> [r.studentName,r.studentId,r.subject,r.examName,r.className,r.facultyName].some(v=> (v||'').toString().toLowerCase().includes(query)) ); // default sort by createdAt desc
  res.sort((a,b)=> b.createdAt - a.createdAt); return res; }

function calculateRanks(marks){ // ranks per examId + subject + className
  const groups = {};
  marks.forEach(m=>{
    const key = `${m.examId}||${m.subject}||${m.className}`;
    if(!groups[key]) groups[key]=[];
    groups[key].push(m);
  });
  Object.values(groups).forEach(group=>{
    group.sort((a,b)=> b.total - a.total);
    for(let i=0;i<group.length;i++){ group[i].rank = i+1; }
  });
}

function buildSelectOptions(){ const exams = getExams(); const classes = getClasses(); const examSel = document.getElementById('marks-filter-exam'); const classSel = document.getElementById('marks-filter-class'); if(examSel){ examSel.innerHTML = '<option value="">All</option>' + exams.map(e=>`<option value="${e.id}">${e.examType} • ${e.academicYear} • ${e.subject} • ${e.className}</option>`).join(''); }
  if(classSel){ classSel.innerHTML = '<option value="">All</option>' + classes.map(c=>`<option value="${c.name}">${c.name}</option>`).join(''); }
}

function openGradeConfig(){ const rules = getGradingRules(); const modal = document.createElement('div'); modal.className='modal-overlay'; modal.innerHTML = `<div class="modal-card"><h2>Grading Rules (JSON)</h2><textarea id="grading-json" style="width:100%;min-height:240px">${JSON.stringify(rules,null,2)}</textarea><div class="modal-actions"><button class="button button-secondary" id="cancel-grading">Cancel</button><button class="button button-primary" id="save-grading">Save</button></div></div>`; document.body.appendChild(modal); document.getElementById('cancel-grading')?.addEventListener('click', ()=>{ document.body.removeChild(modal); }); document.getElementById('save-grading')?.addEventListener('click', ()=>{ try{ const text = document.getElementById('grading-json').value; const parsed = JSON.parse(text); saveGradingRules(parsed); alert('Saved grading rules.'); document.body.removeChild(modal); }catch(err){ alert('Invalid JSON: ' + err.message); } }); }

function openMarkForm(mark=null){ const exams = getExams(); const students = getStudents(); const subjects = getSubjects(); const classes = getClasses(); const faculty = getFaculty(); const examOptions = exams.length? exams.map(e=>`<option value="${e.id}">${e.examType} • ${e.academicYear} • ${e.subject} • ${e.className}</option>`).join('') : '<option value="">No exams</option>';
  const studentOptions = students.length? students.map(s=>`<option value="${s.id}">${s.name} (${s.id})</option>`).join('') : '<option value="">No students</option>';
  const subjectOptions = subjects.length? subjects.map(s=>`<option value="${s.name}">${s.name}</option>`).join('') : '<option value="">No subjects</option>';
  const classOptions = classes.length? classes.map(c=>`<option value="${c.name}">${c.name}</option>`).join('') : '<option value="">No classes</option>';
  const facultyOptions = faculty.length? faculty.map(f=>`<option value="${f.name}">${f.name}</option>`).join('') : '<option value="">No faculty</option>';

  const html = `
    <form id="mark-form" class="modal-form">
      <h2>${mark? 'Edit Mark':'New Mark'}</h2>

      <label for="mark-exam">Exam</label>
      <select id="mark-exam"> <option value="">Select exam</option> ${examOptions}</select>

      <label for="mark-student">Student</label>
      <select id="mark-student"> <option value="">Select student</option> ${studentOptions}</select>

      <label for="mark-class">Class</label>
      <select id="mark-class"> <option value="">Select class</option> ${classOptions}</select>

      <label for="mark-subject">Subject</label>
      <select id="mark-subject"> <option value="">Select subject</option> ${subjectOptions}</select>

      <label for="mark-internal">Internal Marks</label>
      <input id="mark-internal" type="number" min="0" value="${mark?.internalMarks||''}">

      <label for="mark-external">External Marks</label>
      <input id="mark-external" type="number" min="0" value="${mark?.externalMarks||''}">

      <label for="mark-practical">Practical Marks</label>
      <input id="mark-practical" type="number" min="0" value="${mark?.practicalMarks||''}">

      <label for="mark-max">Maximum Marks</label>
      <input id="mark-max" type="number" min="1" value="${mark?.maxMarks||''}">

      <label for="mark-pass">Passing Marks</label>
      <input id="mark-pass" type="number" min="0" value="${mark?.passingMarks||''}">

      <label for="mark-faculty">Faculty (Invigilator)</label>
      <select id="mark-faculty"> <option value="">Select faculty</option> ${facultyOptions}</select>

      <label for="mark-remarks">Remarks</label>
      <input id="mark-remarks" type="text" value="${mark?.remarks||''}">

      <div class="modal-actions">
        <button class="button button-secondary" type="button" id="cancel-mark">Cancel</button>
        <button class="button button-primary" type="submit">${mark? 'Save changes':'Save mark'}</button>
      </div>
    </form>
  `;

  const modal = document.createElement('div'); modal.className='modal-overlay'; modal.innerHTML = `<div class="modal-card">${html}</div>`; document.body.appendChild(modal);

  if(mark){ document.getElementById('mark-exam').value = mark.examId || ''; document.getElementById('mark-student').value = mark.studentId || ''; document.getElementById('mark-class').value = mark.className || ''; document.getElementById('mark-subject').value = mark.subject || ''; document.getElementById('mark-faculty').value = mark.facultyId || ''; }

  document.getElementById('cancel-mark')?.addEventListener('click', ()=> document.body.removeChild(modal));
  document.getElementById('mark-form')?.addEventListener('submit', (ev)=>{ ev.preventDefault(); saveMark(mark?.id); document.body.removeChild(modal); });
}

function saveMark(existingId=null){ const marks = getMarks(); const examId = document.getElementById('mark-exam').value; const studentId = document.getElementById('mark-student').value; const className = document.getElementById('mark-class').value; const subject = document.getElementById('mark-subject').value; const internalMarks = document.getElementById('mark-internal').value; const externalMarks = document.getElementById('mark-external').value; const practicalMarks = document.getElementById('mark-practical').value; const maxMarks = document.getElementById('mark-max').value; const passingMarks = document.getElementById('mark-pass').value; const facultyId = document.getElementById('mark-faculty').value; const remarks = document.getElementById('mark-remarks').value.trim(); const timestamp = Date.now();
  if(!examId || !studentId || !className || !subject){ alert('Please select exam, student, class and subject.'); return; }

  // prevent duplicates (same student, subject, exam)
  const duplicate = marks.find(m=> m.studentId===studentId && m.subject===subject && m.examId===examId && m.id !== existingId);
  if(duplicate){ alert('A mark entry for this student, subject and exam already exists.'); return; }

  const exam = getExams().find(e=> e.id===examId);
  const student = getStudents().find(s=> s.id===studentId);
  const faculty = getFaculty().find(f=> f.id===facultyId);

  const base = { examId, examName: exam? `${exam.examType} • ${exam.academicYear}`: '', studentId, studentName: student? student.name:'', className, subject, facultyId, facultyName: faculty? faculty.name:'', internalMarks: internalMarks? Number(internalMarks):0, externalMarks: externalMarks? Number(externalMarks):0, practicalMarks: practicalMarks? Number(practicalMarks):0, maxMarks: maxMarks? Number(maxMarks): (exam?.maxMarks||100), passingMarks: passingMarks? Number(passingMarks): (exam?.passingMarks||undefined) };
  const calc = calculateMarksAndGrades(base);

  if(existingId){ const updated = marks.map(m=> m.id===existingId? { ...m, ...base, ...calc, updatedAt: timestamp } : m); saveMarks(updated); calculateRanks(updated); renderMarksList(filterAndSortMarks(updated)); return; }

  const newMark = { id:`mark-${timestamp}-${Math.random().toString(36).slice(2,6)}`, ...base, ...calc, createdAt: timestamp, updatedAt: timestamp };
  marks.unshift(newMark); saveMarks(marks); calculateRanks(marks); renderMarksList(filterAndSortMarks(marks)); }

function removeMark(id){ const marks = getMarks(); const updated = marks.filter(m=> m.id !== id); saveMarks(updated); renderMarksList(filterAndSortMarks(updated)); }
function confirmDelete(id){ if(confirm('Delete this mark entry? This cannot be undone.')) removeMark(id); }

function bindMarkActions(){ const list = document.getElementById('marks-list'); list.addEventListener('click', (e)=>{ const target = e.target; const card = target.closest('.class-card'); if(!card) return; const id = card.dataset.id; if(target.classList.contains('edit-mark')){ const mark = getMarks().find(m=> m.id===id); openMarkForm(mark); } if(target.classList.contains('delete-mark')){ confirmDelete(id); } }); }

function initializeMarksManagement(){ const newBtn = document.getElementById('new-mark-button'); const configureBtn = document.getElementById('configure-grading'); const search = document.getElementById('marks-search-input'); const filterExam = document.getElementById('marks-filter-exam'); const filterClass = document.getElementById('marks-filter-class'); const filterStatus = document.getElementById('marks-filter-status'); const logout = document.getElementById('admin-logout-button');
  newBtn?.addEventListener('click', ()=> openMarkForm()); configureBtn?.addEventListener('click', ()=> openGradeConfig()); search?.addEventListener('input', ()=> renderMarksList(filterAndSortMarks(getMarks()))); filterExam?.addEventListener('change', ()=> renderMarksList(filterAndSortMarks(getMarks()))); filterClass?.addEventListener('change', ()=> renderMarksList(filterAndSortMarks(getMarks()))); filterStatus?.addEventListener('change', ()=> renderMarksList(filterAndSortMarks(getMarks())));
  logout?.addEventListener('click', ()=>{ sessionStorage.setItem('danlaWeCare.adminAuthenticated','false'); window.location.replace('admin-login.html'); });

  buildSelectOptions(); const marks = getMarks(); calculateRanks(marks); renderMarksList(filterAndSortMarks(marks)); bindMarkActions(); }

window.addEventListener('DOMContentLoaded', ()=>{ if(typeof isAdminAuthenticated === 'function' && !isAdminAuthenticated()){ if(typeof redirectToLogin === 'function'){ redirectToLogin(); return; } window.location.replace('admin-login.html'); return; } initializeMarksManagement(); });

// --- CSV export/import ---
const MARKS_HEADER = ['id','examId','examName','studentId','studentName','className','subject','internalMarks','externalMarks','practicalMarks','maxMarks','passingMarks','total','percentage','grade','gpa','pass','rank','remarks','createdAt','updatedAt'];

function escapeCsv(val){ return `"${(val===undefined||val===null?'':String(val)).replace(/"/g,'""')}"`; }

function exportMarksCSV(){ const rows = filterAndSortMarks(getMarks()); if(rows.length===0){ alert('No marks to export.'); return; } const lines = [MARKS_HEADER.join(',')]; rows.forEach(r=>{ const vals = MARKS_HEADER.map(h=> escapeCsv(r[h])); lines.push(vals.join(',')); }); const blob = new Blob([lines.join('\n')], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download = `marks-${Date.now()}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

function parseCSVLine(line){ const out=[]; let cur=''; let inQuotes=false; for(let i=0;i<line.length;i++){ const ch=line[i]; if(ch==='"'){ if(inQuotes && line[i+1]==='"'){ cur+='"'; i++; } else { inQuotes = !inQuotes; } } else if(ch===',' && !inQuotes){ out.push(cur); cur=''; } else { cur+=ch; } } out.push(cur); return out; }

function validateMarkRow(obj){ const errors=[]; if(!obj.examId) errors.push('Missing examId'); if(!obj.studentId) errors.push('Missing studentId'); if(!obj.subject) errors.push('Missing subject'); if(!obj.className) errors.push('Missing className'); // numeric checks
  ['internalMarks','externalMarks','practicalMarks','maxMarks','passingMarks'].forEach(k=>{ if(obj[k]!==undefined && obj[k]!=='' && isNaN(Number(obj[k]))){ errors.push(`${k} is not a number`); } }); return errors; }

function showImportPreview(validRows, errors, onContinue, onAbort){ const modal = document.createElement('div'); modal.className='modal-overlay'; let inner = `<div class="modal-card"><h2>CSV Import Preview</h2><div style="max-height:40vh;overflow:auto;padding:0.5rem">`;
  if(errors.length>0){ inner += `<h4>Errors</h4><ul>${errors.map(e=>`<li>${e}</li>`).join('')}</ul>`; }
  inner += `<h4>Valid rows to import: ${validRows.length}</h4><table style="width:100%;border-collapse:collapse"><thead><tr>${MARKS_HEADER.map(h=>`<th style="text-align:left;padding:6px;border-bottom:1px solid rgba(255,255,255,0.04)">${h}</th>`).join('')}</tr></thead><tbody>`;
  validRows.slice(0,200).forEach(r=>{ inner += `<tr>${MARKS_HEADER.map(h=>`<td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.03)">${(r[h]||'')}</td>`).join('')}</tr>`; }); inner += `</tbody></table></div><div class="modal-actions"><button class="button button-secondary" id="import-abort">Abort</button><button class="button button-primary" id="import-continue">Import valid rows</button></div></div>`;
  modal.innerHTML = inner; document.body.appendChild(modal); document.getElementById('import-abort')?.addEventListener('click', ()=>{ document.body.removeChild(modal); if(onAbort) onAbort(); }); document.getElementById('import-continue')?.addEventListener('click', ()=>{ document.body.removeChild(modal); if(onContinue) onContinue(); }); }

function importMarksCSVFile(file){ if(!file) return; const reader = new FileReader(); reader.onload = e=>{ const text = e.target.result; const lines = text.split(/\r?\n/).filter(Boolean); if(lines.length<2){ alert('CSV has no data rows.'); return; } const header = parseCSVLine(lines[0]).map(h=>h.trim()); const missing = MARKS_HEADER.filter(h=> !header.includes(h)); if(missing.length>0){ alert('CSV missing required columns: ' + missing.join(', ')); return; }
  const validRows=[]; const errors=[]; const existing = getMarks(); for(let i=1;i<lines.length;i++){ const cols = parseCSVLine(lines[i]); if(cols.length===0) continue; const obj={}; header.forEach((h,idx)=> obj[h]= (cols[idx]||'').trim() ); const rowErrors = validateMarkRow(obj); if(rowErrors.length>0){ errors.push(`Row ${i+1}: ${rowErrors.join('; ')}`); } else { // prevent duplicates
      const dup = existing.find(m=> m.examId===obj.examId && m.studentId===obj.studentId && m.subject===obj.subject);
      if(dup) { errors.push(`Row ${i+1}: Duplicate existing mark entry for student ${obj.studentId} in exam ${obj.examId} subject ${obj.subject}`); } else { validRows.push(obj); }
    }
  }
  if(validRows.length===0){ alert('No valid rows to import. See errors.'); showImportPreview([], errors, ()=>{}, ()=>{}); return; }
  showImportPreview(validRows, errors, ()=>{ // continue import
    const marks = getMarks(); validRows.forEach(r=>{ const timestamp = Date.now(); const base = { id: r.id || `mark-${timestamp}-${Math.random().toString(36).slice(2,6)}`, examId: r.examId, examName: r.examName||'', studentId: r.studentId, studentName: r.studentName||'', className: r.className, subject: r.subject, internalMarks: r.internalMarks?Number(r.internalMarks):0, externalMarks: r.externalMarks?Number(r.externalMarks):0, practicalMarks: r.practicalMarks?Number(r.practicalMarks):0, maxMarks: r.maxMarks?Number(r.maxMarks):undefined, passingMarks: r.passingMarks?Number(r.passingMarks):undefined, remarks: r.remarks||'' }; const calc = calculateMarksAndGrades(base); const newMark = { ...base, ...calc, createdAt: timestamp, updatedAt: timestamp }; marks.unshift(newMark); }); saveMarks(marks); calculateRanks(marks); renderMarksList(filterAndSortMarks(marks)); alert('Imported ' + validRows.length + ' rows.'); }, ()=>{ alert('Import aborted.'); });
}; reader.readAsText(file); }

// wire CSV UI
window.addEventListener('DOMContentLoaded', ()=>{
  const exportBtn = document.getElementById('export-marks'); exportBtn?.addEventListener('click', exportMarksCSV);
  const importInput = document.getElementById('import-marks-input'); importInput?.addEventListener('change', e=>{ const f=e.target.files[0]; if(f) importMarksCSVFile(f); importInput.value=''; });
});
