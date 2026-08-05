const INSTITUTION_KEY = 'danlaWeCare.institution';

function getInstitution(){ const raw = localStorage.getItem(INSTITUTION_KEY); if(!raw) return {}; try{ return JSON.parse(raw) || {}; }catch(e){ return {}; } }
function saveInstitution(obj){ localStorage.setItem(INSTITUTION_KEY, JSON.stringify(obj)); }

function applyInstitutionToDocument(){ const inst = getInstitution(); // map data attributes
  // elements with data-inst="name|short|address|email|website|logo|seal|city|state|country|pin|phone|principal|academicYear|semester"
  document.querySelectorAll('[data-inst]').forEach(el=>{ const key = el.getAttribute('data-inst'); const fallback = el.getAttribute('data-inst-fallback') || ''; const val = inst[key] || fallback; if(el.tagName==='IMG'){ if(val){ el.src = val; if(!el.alt) el.alt = inst.name || 'Institution logo'; } } else { el.textContent = val; } });

  // replace placeholders in titles and meta where present
  if(inst.name){ document.title = document.title.replace(/\{\{institution\}\}/g, inst.name); document.querySelectorAll('h1,h2,h3,p,span,div').forEach(el=>{ if(el.dataset && el.dataset.skipInst) return; if(el.innerHTML && el.innerHTML.includes('{{institution}}')) el.innerHTML = el.innerHTML.replace(/{{institution}}/g, inst.name); }); }
}

function ensureNavLinks(links){ const nav = document.querySelector('.primary-nav'); if(!nav) return; links.forEach(link=>{ if(!nav.querySelector(`a[href="${link.href}"]`)){ const a = document.createElement('a'); a.href = link.href; a.textContent = link.text; if(link.target) a.target = link.target; nav.appendChild(a); } }); }

window.ensureRoleNavigation = function(role){ const adminLinks = [
    { href:'admin-dashboard.html', text:'Dashboard' },
    { href:'admin-departments.html', text:'Departments' },
    { href:'admin-subjects.html', text:'Subjects' },
    { href:'admin-classes.html', text:'Classes' },
    { href:'admin-students.html', text:'Students' },
    { href:'admin-faculty.html', text:'Faculty' },
    { href:'admin-timetable.html', text:'Timetable' },
    { href:'admin-attendance.html', text:'Attendance' },
    { href:'admin-exams.html', text:'Examinations' },
    { href:'admin-marks.html', text:'Marks & Grades' },
    { href:'admin-assignments.html', text:'Assignments' },
    { href:'admin-resources.html', text:'Resources' },
    { href:'admin-notices.html', text:'Notices' },
    { href:'admin-reports.html', text:'Reports' },
    { href:'admin-institution.html', text:'Institution' },
    { href:'index.html', text:'Home' }
  ];
  const studentLinks = [
    { href:'student-dashboard.html', text:'Dashboard' },
    { href:'student-assignments.html', text:'Assignments' },
    { href:'index.html', text:'Home' }
  ];
  const teacherLinks = [
    { href:'teacher-dashboard.html', text:'Dashboard' },
    { href:'index.html', text:'Home' }
  ];
  if(role==='admin') ensureNavLinks(adminLinks);
  if(role==='student') ensureNavLinks(studentLinks);
  if(role==='teacher') ensureNavLinks(teacherLinks);
};

// helper to ensure institution values are available to other scripts (e.g., certificates)
window.getInstitution = getInstitution;
window.applyInstitutionToDocument = applyInstitutionToDocument;

// auto-apply on load
window.addEventListener('DOMContentLoaded', ()=>{ try{ applyInstitutionToDocument(); }catch(e){} });
