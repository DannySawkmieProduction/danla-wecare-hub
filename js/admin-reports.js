// Reports & Analytics — reads from existing storage keys and renders cards, simple SVG charts, and CSV exports
const DEPT_KEY = 'danlaWeCare.departments';
const SUBJECT_KEY = 'danlaWeCare.subjects';
const CLASS_KEY = 'danlaWeCare.classes';
const FACULTY_KEY = 'danlaWeCare.faculty';
const STUDENT_KEY = 'danlaWeCare.students';
const ATT_KEY = 'danlaWeCare.attendance';
const ASSIGN_KEY = 'danlaWeCare.assignments';
const EXAM_KEY = 'danlaWeCare.exams';
const RES_KEY = 'danlaWeCare.resources';
const NOTICE_KEY = 'danlaWeCare.notices';
const MARKS_KEY = 'danlaWeCare.marks';

function readStorage(key){ const raw = localStorage.getItem(key); if(!raw) return []; try{ const p = JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];} }

function buildCards(){ const deps = readStorage(DEPT_KEY).length; const subs = readStorage(SUBJECT_KEY).length; const classes = readStorage(CLASS_KEY).length; const faculty = readStorage(FACULTY_KEY).length; const students = readStorage(STUDENT_KEY).length; const attendance = readStorage(ATT_KEY).length; const assigns = readStorage(ASSIGN_KEY).length; const exams = readStorage(EXAM_KEY).length; const resources = readStorage(RES_KEY).length; const notices = readStorage(NOTICE_KEY).length;
  const wrap = document.getElementById('reports-cards'); wrap.innerHTML = `
    <div class="dashboard-card"><h4>Total Departments</h4><p>${deps}</p></div>
    <div class="dashboard-card"><h4>Total Subjects</h4><p>${subs}</p></div>
    <div class="dashboard-card"><h4>Total Classes</h4><p>${classes}</p></div>
    <div class="dashboard-card"><h4>Total Faculty</h4><p>${faculty}</p></div>
    <div class="dashboard-card"><h4>Total Students</h4><p>${students}</p></div>
    <div class="dashboard-card"><h4>Attendance Records</h4><p>${attendance}</p></div>
    <div class="dashboard-card"><h4>Assignments</h4><p>${assigns}</p></div>
    <div class="dashboard-card"><h4>Examinations</h4><p>${exams}</p></div>
    <div class="dashboard-card"><h4>Learning Resources</h4><p>${resources}</p></div>
    <div class="dashboard-card"><h4>Notices</h4><p>${notices}</p></div>
  `; }

// Simple SVG bar chart for enrollment by department
function renderEnrollmentChart(){ const depts = readStorage(DEPT_KEY); const students = readStorage(STUDENT_KEY); const counts = {}; depts.forEach(d=> counts[d.name] = 0); students.forEach(s=>{ if(s.department && counts[s.department]!==undefined) counts[s.department]++; else counts['Unassigned'] = (counts['Unassigned']||0)+1; }); const entries = Object.entries(counts); const max = Math.max(1, ...entries.map(e=> e[1])); const w = 400; const h = 200; let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`; const barW = Math.floor(w / Math.max(1, entries.length)) - 6; entries.forEach((e, i)=>{ const x = i*(barW+6)+10; const barH = Math.round((e[1]/max)*(h-40)); const y = h - barH - 20; svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="#4f9da6"></rect>`; svg += `<text x="${x+barW/2}" y="${h-4}" font-size="10" fill="#e6eef2" text-anchor="middle">${e[0].slice(0,10)}</text>`; svg += `<text x="${x+barW/2}" y="${y-4}" font-size="10" fill="#e6eef2" text-anchor="middle">${e[1]}</text>`; }); svg += `</svg>`; document.getElementById('chart-enrollment').innerHTML = svg; }

// Attendance trends: average attendance per day in date range
function renderAttendanceChart(){ const records = readStorage(ATT_KEY); if(records.length===0){ document.getElementById('chart-attendance').innerHTML = '<p class="empty-state">No attendance records</p>'; return; } // aggregate by date
  const byDate = {}; records.forEach(r=>{ const date = r.date || r.day || r.attendanceDate || ''; if(!date) return; byDate[date] = byDate[date] || {present:0,total:0}; const entries = r.entries || r.records || r.attendance || []; if(Array.isArray(entries) && entries.length>0){ entries.forEach(e=>{ if(e.status==='Present' || e.present) byDate[date].present++; byDate[date].total++; }); } else { // fallback
    if(r.presentCount!==undefined && r.totalCount!==undefined){ byDate[date].present += Number(r.presentCount); byDate[date].total += Number(r.totalCount); }
  }});
  const points = Object.entries(byDate).sort((a,b)=> new Date(a[0]) - new Date(b[0])); if(points.length===0){ document.getElementById('chart-attendance').innerHTML = '<p class="empty-state">No attendance data</p>'; return; }
  const values = points.map(p=> p[1].total? (p[1].present / p[1].total)*100 : 0);
  const w = 400; const h = 200; let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`; const maxV = Math.max(...values,1); const stepX = Math.max(1, Math.floor((w-40)/(values.length-1||1))); svg += `<polyline fill="none" stroke="#ffd166" stroke-width="2" points="`;
  values.forEach((v,i)=>{ const x = 20 + i*stepX; const y = h - 20 - (v/maxV)*(h-40); svg += `${x},${y} `; }); svg += `"/></svg>`; document.getElementById('chart-attendance').innerHTML = svg; }

// Marks distribution (histogram) — read marks array
function renderMarksChart(){ const marks = readStorage(MARKS_KEY); if(marks.length===0){ document.getElementById('chart-marks').innerHTML = '<p class="empty-state">No marks data</p>'; return; } const scores = marks.map(m=> Number(m.marksObtained||m.score||0)); const buckets = [0,10,20,30,40,50,60,70,80,90,100]; const counts = new Array(buckets.length-1).fill(0); scores.forEach(s=>{ for(let i=0;i<buckets.length-1;i++){ if(s>=buckets[i] && s< buckets[i+1]){ counts[i]++; break; } if(s>=100) counts[counts.length-1]++; } }); const w=400,h=200,barW=Math.floor((w-40)/counts.length)-6; let svg=`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`; const max = Math.max(1, ...counts); counts.forEach((c,i)=>{ const x = 20 + i*(barW+6); const barH = Math.round((c/max)*(h-40)); const y = h - barH - 20; svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="#8ac4d0"></rect>`; svg += `<text x="${x+barW/2}" y="${h-4}" font-size="10" fill="#e6eef2" text-anchor="middle">${buckets[i]}-${buckets[i+1]-1}</text>`; svg += `<text x="${x+barW/2}" y="${y-4}" font-size="10" fill="#e6eef2" text-anchor="middle">${c}</text>`; }); svg += `</svg>`; document.getElementById('chart-marks').innerHTML = svg; }

// Faculty workload: count assignments/exams per faculty
function renderFacultyChart(){ const assigns = readStorage(ASSIGN_KEY); const exams = readStorage(EXAM_KEY); const faculty = readStorage(FACULTY_KEY); const counts = {}; faculty.forEach(f=> counts[f.id] = {name:f.name,count:0}); assigns.forEach(a=>{ if(a.facultyId && counts[a.facultyId]) counts[a.facultyId].count++; }); exams.forEach(e=>{ if(e.facultyId && counts[e.facultyId]) counts[e.facultyId].count++; }); const entries = Object.values(counts).sort((a,b)=> b.count - a.count).slice(0,10); const w=400,h=200,barW= Math.floor((w-40)/Math.max(1,entries.length))-6; let svg=`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`; const max = Math.max(1, ...entries.map(e=> e.count)); entries.forEach((e,i)=>{ const x = 20 + i*(barW+6); const barH = Math.round((e.count/max)*(h-40)); const y = h - barH - 20; svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="#ffb4a2"></rect>`; svg += `<text x="${x+barW/2}" y="${h-4}" font-size="10" fill="#3b3b3b" text-anchor="middle">${e.name.slice(0,10)}</text>`; svg += `<text x="${x+barW/2}" y="${y-4}" font-size="10" fill="#3b3b3b" text-anchor="middle">${e.count}</text>`; }); svg += `</svg>`; document.getElementById('chart-faculty').innerHTML = svg; }

// Run selected report and build table
function runReport(type){ const output = document.getElementById('report-output'); output.innerHTML = ''; if(type==='students'){ const students = readStorage(STUDENT_KEY); output.innerHTML = `<table class="table"><thead><tr><th>ID</th><th>Name</th><th>Class</th><th>Department</th><th>Registered</th></tr></thead><tbody>${students.map(s=> `<tr><td>${s.id||''}</td><td>${s.name||''}</td><td>${s.className||''}</td><td>${s.department||''}</td><td>${formatDate(s.createdAt||s.registeredAt||'')}</td></tr>`).join('')}</tbody></table>`; }
  if(type==='faculty'){ const fac = readStorage(FACULTY_KEY); output.innerHTML = `<table class="table"><thead><tr><th>ID</th><th>Name</th><th>Department</th><th>Email</th></tr></thead><tbody>${fac.map(f=> `<tr><td>${f.id||''}</td><td>${f.name||''}</td><td>${f.department||''}</td><td>${f.email||''}</td></tr>`).join('')}</tbody></table>`; }
  if(type==='class'){ const classes = readStorage(CLASS_KEY); output.innerHTML = `<table class="table"><thead><tr><th>Name</th><th>Department</th></tr></thead><tbody>${classes.map(c=> `<tr><td>${c.name||''}</td><td>${c.department||''}</td></tr>`).join('')}</tbody></table>`; }
  if(type==='attendance'){ const att = readStorage(ATT_KEY); output.innerHTML = `<table class="table"><thead><tr><th>Date</th><th>Class</th><th>Present</th><th>Total</th></tr></thead><tbody>${att.map(a=> `<tr><td>${a.date||a.attendanceDate||''}</td><td>${a.className||a.class||''}</td><td>${a.presentCount||''}</td><td>${a.totalCount||''}</td></tr>`).join('')}</tbody></table>`; }
  if(type==='exams'){ const exams = readStorage(EXAM_KEY); output.innerHTML = `<table class="table"><thead><tr><th>Title</th><th>Class</th><th>Date</th><th>Type</th></tr></thead><tbody>${exams.map(e=> `<tr><td>${e.title||e.name||''}</td><td>${e.className||''}</td><td>${e.date||''}</td><td>${e.type||''}</td></tr>`).join('')}</tbody></table>`; }
  if(type==='marks'){ const marks = readStorage(MARKS_KEY); output.innerHTML = `<table class="table"><thead><tr><th>Student</th><th>Exam</th><th>Marks</th></tr></thead><tbody>${marks.map(m=> `<tr><td>${m.studentName||m.studentId||''}</td><td>${m.examTitle||m.examId||''}</td><td>${m.marksObtained||m.score||''}</td></tr>`).join('')}</tbody></table>`; }
  if(type==='assignments'){ const assigns = readStorage(ASSIGN_KEY); output.innerHTML = `<table class="table"><thead><tr><th>Title</th><th>Class</th><th>Due</th><th>Submissions</th></tr></thead><tbody>${assigns.map(a=> `<tr><td>${a.title||''}</td><td>${a.className||''}</td><td>${a.dueDate||''}</td><td>${(a.submissions||[]).length||0}</td></tr>`).join('')}</tbody></table>`; }
}

function formatDate(ts){ return ts ? new Date(ts).toLocaleString() : '-'; }

// Export CSV helper
function exportTableCSV(filename, rows){ if(!rows || rows.length===0){ alert('No data to export.'); return; } const header = Object.keys(rows[0]); const lines = [header.join(',')]; rows.forEach(r=>{ const vals = header.map(h=> `"${String(r[h]===undefined?'':r[h]).replace(/"/g,'""')}"`); lines.push(vals.join(',')); }); const blob = new Blob([lines.join('\n')], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

function runSelectedReportToCSV(type){ let rows = []; if(type==='students'){ rows = readStorage(STUDENT_KEY).map(s=> ({ id: s.id||'', name: s.name||'', class: s.className||'', department: s.department||'' })); }
  if(type==='faculty'){ rows = readStorage(FACULTY_KEY).map(f=> ({ id: f.id||'', name: f.name||'', department: f.department||'', email: f.email||'' })); }
  if(type==='attendance'){ rows = readStorage(ATT_KEY).map(a=> ({ date: a.date||a.attendanceDate||'', class: a.className||a.class||'', present: a.presentCount||'', total: a.totalCount||'' })); }
  if(type==='exams'){ rows = readStorage(EXAM_KEY).map(e=> ({ title: e.title||'', class: e.className||'', date: e.date||'', type: e.type||'' })); }
  if(type==='marks'){ rows = readStorage(MARKS_KEY).map(m=> ({ student: m.studentName||m.studentId||'', exam: m.examTitle||m.examId||'', marks: m.marksObtained||m.score||'' })); }
  if(type==='assignments'){ rows = readStorage(ASSIGN_KEY).map(a=> ({ title: a.title||'', class: a.className||'', due: a.dueDate||'', submissions: (a.submissions||[]).length })); }
  if(rows.length===0){ alert('No data for this report.'); return; } exportTableCSV(`${type}-report-${Date.now()}.csv`, rows); }

function buildFilters(){ const years = new Set(); const assigns = readStorage(ASSIGN_KEY); assigns.forEach(a=> { if(a.academicYear) years.add(a.academicYear); }); const yearSel = document.getElementById('report-filter-year'); yearSel.innerHTML = '<option value="">All Years</option>' + Array.from(years).map(y=> `<option value="${y}">${y}</option>`).join(''); const classes = readStorage(CLASS_KEY); const classSel = document.getElementById('report-filter-class'); classSel.innerHTML = '<option value="">All Classes</option>' + classes.map(c=> `<option value="${c.name}">${c.name}</option>`).join(''); const subs = readStorage(SUBJECT_KEY); const subSel = document.getElementById('report-filter-subject'); subSel.innerHTML = '<option value="">All Subjects</option>' + subs.map(s=> `<option value="${s.name}">${s.name}</option>`).join(''); const deps = readStorage(DEPT_KEY); const depSel = document.getElementById('report-filter-dept'); depSel.innerHTML = '<option value="">All Departments</option>' + deps.map(d=> `<option value="${d.name}">${d.name}</option>`).join(''); }

function initializeReports(){ const runBtn = document.getElementById('run-report'); const reportSelect = document.getElementById('report-select'); const csvBtn = document.getElementById('export-csv'); const pdfBtn = document.getElementById('export-pdf'); runBtn?.addEventListener('click', ()=> runReport(reportSelect?.value||'students'));
  document.getElementById('report-filter-year')?.addEventListener('change', ()=> { renderAll(); }); document.getElementById('report-filter-class')?.addEventListener('change', ()=> { renderAll(); }); csvBtn?.addEventListener('click', ()=>{ const report = reportSelect?.value||'students'; runSelectedReportToCSV(report); }); pdfBtn?.addEventListener('click', ()=> alert('PDF export placeholder — integrate a server-side renderer for production.'));
  buildCards(); buildFilters(); renderAll(); document.getElementById('report-select')?.addEventListener('change', ()=> document.getElementById('report-output').innerHTML='');
}

function renderAll(){ buildCards(); renderEnrollmentChart(); renderAttendanceChart(); renderMarksChart(); renderFacultyChart(); }

window.addEventListener('DOMContentLoaded', async ()=>{ if(typeof isAdminAuthenticated === 'function' && !(await isAdminAuthenticated())){ if(typeof redirectToLogin === 'function'){ redirectToLogin(); return; } window.location.replace('admin-login.html'); return; } initializeReports(); });
