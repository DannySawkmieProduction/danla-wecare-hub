const ATTENDANCE_STORAGE_KEY = 'danlaWeCare.attendance';
const STUDENT_STORAGE_KEY = 'danlaWeCare.students';
const DEPARTMENT_STORAGE_KEY = 'danlaWeCare.departments';
const CLASS_STORAGE_KEY = 'danlaWeCare.classes';
const SUBJECT_STORAGE_KEY = 'danlaWeCare.subjects';
const FACULTY_STORAGE_KEY = 'danlaWeCare.faculty';

function getAttendance(){ try{ const p=JSON.parse(localStorage.getItem(ATTENDANCE_STORAGE_KEY)||'[]'); return Array.isArray(p)?p:[];}catch(e){return [];} }
function saveAttendance(list){ localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(list)); }
function getStudents(){ try{ const p=JSON.parse(localStorage.getItem(STUDENT_STORAGE_KEY)||'[]'); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getDepartments(){ try{ const p=JSON.parse(localStorage.getItem(DEPARTMENT_STORAGE_KEY)||'[]'); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getClasses(){ try{ const p=JSON.parse(localStorage.getItem(CLASS_STORAGE_KEY)||'[]'); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getSubjects(){ try{ const p=JSON.parse(localStorage.getItem(SUBJECT_STORAGE_KEY)||'[]'); return Array.isArray(p)?p:[];}catch(e){return [];} }
function getFaculty(){ try{ const p=JSON.parse(localStorage.getItem(FACULTY_STORAGE_KEY)||'[]'); return Array.isArray(p)?p:[];}catch(e){return [];} }

function formatDate(ts){ return new Date(ts).toLocaleString(); }

function createAttendanceCard(rec){ const card=document.createElement('article'); card.className='class-card'; card.dataset.id=rec.id; card.innerHTML=`
  <div class="class-card-header">
    <div>
      <p class="eyebrow">${rec.academicYear} • ${rec.semester}</p>
      <h3>${rec.studentName} — ${rec.studentId}</h3>
    </div>
    <span class="status-pill ${rec.status==='Present'?'status-active':'status-inactive'}">${rec.status}</span>
  </div>
  <p class="class-description">${rec.department} • ${rec.className} • ${rec.subject} • ${rec.faculty || 'Unassigned'}</p>
  <div class="class-details">
    <span>Date: ${rec.date}</span>
    <span>Time: ${rec.timeSlot}</span>
    <span>Attendance: ${rec.status}</span>
    <span>Remarks: ${rec.remarks || '—'}</span>
    <span>Created: ${formatDate(rec.createdAt)}</span>
    <span>Updated: ${formatDate(rec.updatedAt)}</span>
  </div>
  <div class="class-actions">
    <button class="button button-secondary edit-attendance">Edit</button>
    <button class="button button-secondary delete-attendance">Delete</button>
  </div>
`;
  return card; }

function renderAttendanceList(list){ const el=document.getElementById('attendance-list'); el.innerHTML=''; if(list.length===0){ el.innerHTML='<p class="empty-state">No attendance records yet.</p>'; return; } list.forEach(r=>el.appendChild(createAttendanceCard(r))); }

function getSearchQuery(){ const input=document.getElementById('attendance-search-input'); return input?.value.trim().toLowerCase()||''; }

function filterAttendance(list){ const q=getSearchQuery(); if(!q) return list; return list.filter(r=>{ return [r.academicYear,r.semester,r.department,r.className,r.subject,r.faculty,r.studentName,r.studentId,r.date,r.timeSlot,r.status,r.remarks].some(v=>v?.toString().toLowerCase().includes(q)); }); }

function buildOptions(items,key='name'){ if(!items||items.length===0) return '<option value="">None</option>'; return items.map(it=>`<option value="${it[key]||it.name||it}">${it[key]||it.name||it}</option>`).join(''); }

function openAttendanceForm(record=null){ const departments=getDepartments(); const classes=getClasses(); const subjects=getSubjects(); const faculty=getFaculty(); const students=getStudents(); const deptOptions=buildOptions(departments,'name'); const classOptions=buildOptions(classes,'name'); const subjectOptions=buildOptions(subjects,'name'); const facultyOptions=buildOptions(faculty,'name');

  const formHtml=`
    <form id="attendance-form" class="modal-form">
      <h2>${record? 'Edit Attendance':'New Attendance / Bulk Mark'}</h2>

      <label for="att-year">Academic Year</label>
      <input id="att-year" name="att-year" type="text" value="${record?.academicYear||''}" required>

      <label for="att-semester">Semester</label>
      <input id="att-semester" name="att-semester" type="text" value="${record?.semester||''}" required>

      <label for="att-department">Department</label>
      <select id="att-department" name="att-department">
        <option value="">Select a department</option>
        ${deptOptions}
      </select>

      <label for="att-class">Class</label>
      <select id="att-class" name="att-class">
        <option value="">Select a class</option>
        ${classOptions}
      </select>

      <label for="att-subject">Subject</label>
      <select id="att-subject" name="att-subject">
        <option value="">Select a subject</option>
        ${subjectOptions}
      </select>

      <label for="att-faculty">Faculty</label>
      <select id="att-faculty" name="att-faculty">
        <option value="">Select a faculty</option>
        ${facultyOptions}
      </select>

      <label for="att-date">Date</label>
      <input id="att-date" name="att-date" type="date" value="${record?.date||''}" required>

      <label for="att-timeslot">Time Slot (e.g. 09:00-10:30)</label>
      <input id="att-timeslot" name="att-timeslot" type="text" value="${record?.timeSlot||''}" required>

      <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem;">
        <button id="load-students" class="button button-secondary" type="button">Load Students</button>
        <div style="margin-left:auto;display:flex;gap:0.5rem;">
          <button id="bulk-present" class="button button-primary" type="button">Mark All Present</button>
          <button id="bulk-absent" class="button button-secondary" type="button">Mark All Absent</button>
        </div>
      </div>

      <div id="attendance-students" style="max-height:14rem;overflow:auto;padding:0.5rem;border-radius:0.5rem;background:rgba(255,255,255,0.02)"></div>

      <div style="display:flex;gap:0.5rem;align-items:center;margin-top:0.5rem;">
        <label for="att-status">Default Status</label>
        <select id="att-status" name="att-status">
          <option value="Present">Present</option>
          <option value="Absent">Absent</option>
          <option value="Late">Late</option>
          <option value="Leave">Leave</option>
        </select>
      </div>

      <div class="modal-actions">
        <button class="button button-secondary" type="button" id="cancel-attendance">Cancel</button>
        <button class="button button-primary" type="submit">${record? 'Save changes':'Save attendance'}</button>
      </div>
    </form>
  `;

  const modal=document.createElement('div'); modal.className='modal-overlay'; modal.innerHTML=`<div class="modal-card">${formHtml}</div>`; document.body.appendChild(modal);

  if(record){ document.getElementById('att-department').value=record.department||''; document.getElementById('att-class').value=record.className||''; document.getElementById('att-subject').value=record.subject||''; document.getElementById('att-faculty').value=record.faculty||''; document.getElementById('att-status').value=record.status||'Present'; }

  document.getElementById('cancel-attendance')?.addEventListener('click', ()=>{ document.body.removeChild(modal); });

  document.getElementById('load-students')?.addEventListener('click', ()=>{
    const className=document.getElementById('att-class').value; const students=getStudents().filter(s=>s.class===className);
    const container=document.getElementById('attendance-students'); container.innerHTML=''; if(students.length===0){ container.innerHTML='<p class="empty-state">No students found for selected class.</p>'; return; }
    students.forEach(st=>{
      const row=document.createElement('div'); row.style.display='flex'; row.style.alignItems='center'; row.style.gap='0.5rem'; row.style.padding='0.25rem 0';
      row.innerHTML=`<label style="flex:1">${st.name} (${st.studentId})</label><select data-student-id="${st.id}" class="att-select"><option value="Present">Present</option><option value="Absent">Absent</option><option value="Late">Late</option><option value="Leave">Leave</option></select><input data-student-id-note="${st.id}" placeholder="Remarks" style="flex:0.8" />`;
      container.appendChild(row);
    });
  });

  document.getElementById('bulk-present')?.addEventListener('click', ()=>{ Array.from(document.querySelectorAll('#attendance-students .att-select')).forEach(s=>s.value='Present'); });
  document.getElementById('bulk-absent')?.addEventListener('click', ()=>{ Array.from(document.querySelectorAll('#attendance-students .att-select')).forEach(s=>s.value='Absent'); });

  const form=document.getElementById('attendance-form'); form.addEventListener('submit', e=>{ e.preventDefault(); if(record){ // edit single record
      updateAttendanceRecord(record.id); document.body.removeChild(modal); return; }
    // bulk create from student inputs
    const year=document.getElementById('att-year').value.trim(); const semester=document.getElementById('att-semester').value.trim(); const department=document.getElementById('att-department').value; const className=document.getElementById('att-class').value; const subject=document.getElementById('att-subject').value; const faculty=document.getElementById('att-faculty').value; const date=document.getElementById('att-date').value; const timeSlot=document.getElementById('att-timeslot').value.trim(); const defaultStatus=document.getElementById('att-status').value; const ts=Date.now();
    const selects = Array.from(document.querySelectorAll('#attendance-students .att-select'));
    if(selects.length===0){ alert('Load students for the selected class before saving.'); return; }
    const records = getAttendance();
    selects.forEach(sel=>{
      const stIdAttr=sel.dataset.studentId; const status=sel.value; const noteInput = document.querySelector(`#attendance-students input[data-student-id-note="${stIdAttr}"]`); const remarks = noteInput?.value?.trim() || '';
      const student = getStudents().find(s=>s.id===stIdAttr);
      const rec = { id:`att-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, academicYear:year, semester, department, className, subject, faculty, studentId: student?.studentId || '', studentName: student?.name || '', date, timeSlot, status, remarks, createdAt: ts, updatedAt: ts };
      records.unshift(rec);
    });
    saveAttendance(records); renderAttendanceList(filterAttendance(records)); document.body.removeChild(modal);
  });
}

function updateAttendanceRecord(id){ const list=getAttendance(); const year=document.getElementById('att-year').value.trim(); const semester=document.getElementById('att-semester').value.trim(); const department=document.getElementById('att-department').value; const className=document.getElementById('att-class').value; const subject=document.getElementById('att-subject').value; const faculty=document.getElementById('att-faculty').value; const date=document.getElementById('att-date').value; const timeSlot=document.getElementById('att-timeslot').value.trim(); const status=document.getElementById('att-status').value; const ts=Date.now(); const updated = list.map(r=> r.id===id? {...r, academicYear:year, semester, department, className, subject, faculty, date, timeSlot, status, updatedAt:ts } : r ); saveAttendance(updated); renderAttendanceList(filterAttendance(updated)); }

function removeAttendance(id){ const list=getAttendance(); const updated=list.filter(r=>r.id!==id); saveAttendance(updated); renderAttendanceList(filterAttendance(updated)); }
function confirmDelete(id){ if(confirm('Delete this attendance record?')) removeAttendance(id); }

function bindAttendanceActions(){ const el=document.getElementById('attendance-list'); el.addEventListener('click', e=>{ const t=e.target; const card = t.closest('.class-card'); if(!card) return; const id=card.dataset.id; if(t.classList.contains('edit-attendance')){ const rec=getAttendance().find(r=>r.id===id); openAttendanceForm(rec); } if(t.classList.contains('delete-attendance')){ confirmDelete(id); } }); }

function initializeAttendance(){ const newBtn=document.getElementById('new-attendance-button'); const search=document.getElementById('attendance-search-input'); const logout=document.getElementById('admin-logout-button'); newBtn?.addEventListener('click', ()=>openAttendanceForm()); search?.addEventListener('input', ()=>renderAttendanceList(filterAttendance(getAttendance()))); logout?.addEventListener('click', ()=>{ sessionStorage.setItem('danlaWeCare.adminAuthenticated','false'); window.location.replace('admin-login.html'); }); bindAttendanceActions(); renderAttendanceList(filterAttendance(getAttendance())); }

window.addEventListener('DOMContentLoaded', ()=>{ if(typeof isAdminAuthenticated==='function' && !isAdminAuthenticated()){ if(typeof redirectToLogin==='function'){ redirectToLogin(); return; } window.location.replace('admin-login.html'); return; } initializeAttendance(); });

// --- CSV export/import and calendar summary ---
// --- CSV export/import with strict validation and calendar month view ---

const ATT_HEADER = ['id','academicYear','semester','department','className','subject','faculty','studentId','studentName','date','timeSlot','status','remarks','createdAt','updatedAt'];

function exportAttendanceCSV(){ // export currently filtered view
  const rows = filterAttendance(getAttendance()); if(rows.length===0){ alert('No attendance records to export.'); return; }
  const header = ATT_HEADER;
  const lines = [header.join(',')];
  rows.forEach(r=>{ const vals = header.map(h=>`"${(r[h]??'').toString().replace(/"/g,'""')}"`); lines.push(vals.join(',')); });
  const blob = new Blob([lines.join('\n')], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download = `attendance-${Date.now()}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function parseCSVLine(line){ const out=[]; let cur=''; let inQuotes=false; for(let i=0;i<line.length;i++){ const ch=line[i]; if(ch==='"'){ if(inQuotes && line[i+1]==='"'){ cur+= '"'; i++; } else { inQuotes = !inQuotes; } } else if(ch===',' && !inQuotes){ out.push(cur); cur=''; } else { cur+=ch; } } out.push(cur); return out; }

function validateAttendanceObj(obj){ const errors=[]; // required fields
  if(!obj.academicYear) errors.push('Missing academicYear');
  if(!obj.semester) errors.push('Missing semester');
  if(!obj.studentId) errors.push('Missing studentId');
  if(!obj.studentName) errors.push('Missing studentName');
  // date validation YYYY-MM-DD
  if(obj.date && !/^\d{4}-\d{2}-\d{2}$/.test(obj.date)) errors.push(`Invalid date format (${obj.date})`);
  // timeslot validation HH:MM-HH:MM
  if(obj.timeSlot && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(obj.timeSlot)) errors.push(`Invalid timeSlot (${obj.timeSlot})`);
  const allowed = ['Present','Absent','Late','Leave']; if(obj.status && !allowed.includes(obj.status)) errors.push(`Invalid status (${obj.status})`);
  return errors;
}

function showValidationModal(errors, onContinue, onAbort){ const html = `<div class="modal-overlay"><div class="modal-card"><h2>CSV Validation Errors</h2><div style="max-height:40vh;overflow:auto;padding:0.5rem"><ul>${errors.map(e=>`<li>${e}</li>`).join('')}</ul></div><div class="modal-actions"><button class="button button-secondary" id="csv-abort">Abort</button><button class="button button-primary" id="csv-continue">Import with valid rows</button></div></div></div>`; const wrap=document.createElement('div'); wrap.innerHTML = html; document.body.appendChild(wrap.firstChild); document.getElementById('csv-abort')?.addEventListener('click', ()=>{ document.querySelector('.modal-overlay')?.remove(); if(onAbort) onAbort(); }); document.getElementById('csv-continue')?.addEventListener('click', ()=>{ document.querySelector('.modal-overlay')?.remove(); if(onContinue) onContinue(); }); }

function importAttendanceCSVFile(file){ if(!file) return; const reader=new FileReader(); reader.onload = e=>{ const text = e.target.result; const lines = text.split(/\r?\n/).filter(Boolean); if(lines.length<2){ alert('CSV contains no records.'); return; }
    const header = parseCSVLine(lines[0]).map(h=>h.trim()); // strict header check
    const missing = ATT_HEADER.filter(h=>!header.includes(h)); if(missing.length>0){ alert('CSV missing required columns: ' + missing.join(', ')); return; }
    const records = getAttendance(); const errors=[]; const validRows=[];
    for(let i=1;i<lines.length;i++){ const cols=parseCSVLine(lines[i]); if(cols.length===0) continue; const obj={}; header.forEach((h,idx)=>{ obj[h]= (cols[idx]||'').trim(); }); // coerce timestamps
      obj.createdAt = obj.createdAt? Number(obj.createdAt): Date.now(); obj.updatedAt = obj.updatedAt? Number(obj.updatedAt): Date.now(); if(!obj.id) obj.id = `att-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      const rowErrors = validateAttendanceObj(obj); if(rowErrors.length>0){ errors.push(`Row ${i+1}: ${rowErrors.join('; ')}`); } else { validRows.push(obj); }
    }
    if(errors.length>0){ showValidationModal(errors, ()=>{ // continue with validRows
        validRows.reverse().forEach(r=>records.unshift(r)); saveAttendance(records); renderAttendanceList(filterAttendance(records)); alert('Imported ' + validRows.length + ' valid records (invalid rows skipped).'); }, ()=>{ /*abort*/ }); return; }
    // no errors, import all
    validRows.reverse().forEach(r=>records.unshift(r)); saveAttendance(records); renderAttendanceList(filterAttendance(records)); alert('Imported ' + validRows.length + ' records.');
  };
  reader.readAsText(file);
}

// Calendar: full month grid with per-day counts and date drilldown
function buildCalendarModal(year, month){ const records = getAttendance(); const dateCounts = {}; records.forEach(r=>{ const d = r.date || new Date(r.createdAt).toISOString().slice(0,10); if(!dateCounts[d]) dateCounts[d] = {Present:0,Absent:0,Late:0,Leave:0,total:0}; dateCounts[d][r.status] = (dateCounts[d][r.status]||0)+1; dateCounts[d].total++; });
  const first = new Date(year, month, 1); const startDay = first.getDay(); const daysInMonth = new Date(year, month+1, 0).getDate();
  let gridHtml = `<div class="calendar-wrapper"><div class="calendar-header"><button id="cal-prev" class="button button-secondary">◀</button><h3>${first.toLocaleString(undefined,{month:'long', year:'numeric'})}</h3><button id="cal-next" class="button button-secondary">▶</button></div><div class="calendar-grid"><div class="calendar-weekday">Sun</div><div class="calendar-weekday">Mon</div><div class="calendar-weekday">Tue</div><div class="calendar-weekday">Wed</div><div class="calendar-weekday">Thu</div><div class="calendar-weekday">Fri</div><div class="calendar-weekday">Sat</div>`;
  // blank cells
  for(let i=0;i<startDay;i++) gridHtml += `<div class="calendar-cell empty"></div>`;
  for(let d=1; d<=daysInMonth; d++){ const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const counts = dateCounts[key] || {Present:0,Absent:0,Late:0,Leave:0,total:0}; gridHtml += `<div class="calendar-cell" data-date="${key}"><div class="cal-date">${d}</div><div class="cal-counts">P:${counts.Present||0} A:${counts.Absent||0}</div></div>`; }
  gridHtml += `</div></div>`;
  const modalHtml = `<div class="modal-overlay"><div class="modal-card">${gridHtml}<div class="modal-actions"><button class="button button-secondary" id="close-cal">Close</button></div></div></div>`;
  const wrap = document.createElement('div'); wrap.innerHTML = modalHtml; document.body.appendChild(wrap.firstChild);
  document.getElementById('cal-prev')?.addEventListener('click', ()=>{ document.querySelector('.modal-overlay')?.remove(); const prev = new Date(year, month-1,1); buildCalendarModal(prev.getFullYear(), prev.getMonth()); });
  document.getElementById('cal-next')?.addEventListener('click', ()=>{ document.querySelector('.modal-overlay')?.remove(); const next = new Date(year, month+1,1); buildCalendarModal(next.getFullYear(), next.getMonth()); });
  document.getElementById('close-cal')?.addEventListener('click', ()=>{ document.querySelector('.modal-overlay')?.remove(); });
  // date click drilldown
  document.querySelectorAll('.calendar-cell[data-date]').forEach(cell=>{ cell.addEventListener('click', ()=>{ const date = cell.dataset.date; showCalendarDateDetails(date); }); });
}

function showCalendarDateDetails(date){ const records = getAttendance().filter(r=> (r.date||new Date(r.createdAt).toISOString().slice(0,10))===date); let html = `<div class="modal-overlay"><div class="modal-card"><h2>Attendance on ${date}</h2><div style="max-height:60vh;overflow:auto;padding:0.5rem">`;
  if(records.length===0) html += '<p class="empty-state">No records for this date.</p>'; else records.forEach(r=>{ html += `<div style="padding:0.5rem;border-bottom:1px solid rgba(255,255,255,0.04)"><strong>${r.studentName} (${r.studentId})</strong> — ${r.className} — ${r.subject} — ${r.status} <div style="color:#a9b7c7">${r.timeSlot} • ${r.remarks||''}</div></div>`; }); html += `</div><div class="modal-actions"><button class="button button-secondary" id="close-date-detail">Close</button></div></div></div>`; const wrap=document.createElement('div'); wrap.innerHTML = html; document.body.appendChild(wrap.firstChild); document.getElementById('close-date-detail')?.addEventListener('click', ()=>{ document.querySelector('.modal-overlay')?.remove(); }); }

// wire export/import/calendar UI
window.addEventListener('DOMContentLoaded', ()=>{
  const exportBtn = document.getElementById('export-attendance'); exportBtn?.addEventListener('click', exportAttendanceCSV);
  const importInput = document.getElementById('import-attendance-input'); importInput?.addEventListener('change', e=>{ const f=e.target.files[0]; if(f) importAttendanceCSVFile(f); importInput.value=''; });
  const calBtn = document.getElementById('attendance-calendar'); calBtn?.addEventListener('click', ()=>{ const now=new Date(); buildCalendarModal(now.getFullYear(), now.getMonth()); });
});
