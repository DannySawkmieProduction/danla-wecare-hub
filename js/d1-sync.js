// d1-sync.js — client-side sync to Cloudflare D1 REST API
(async function(){ const ping = await fetch('/api/ping').catch(()=>null); if(!ping || !ping.ok) return; // no D1 API available
  try{
    // initial dump to localStorage
    const dumpRes = await fetch('/api/dump'); if(dumpRes.ok){ const data = await dumpRes.json(); // map tables to localStorage keys used in app
      const mapping = {
        departments: 'danlaWeCare.departments',
        classes: 'danlaWeCare.classes',
        subjects: 'danlaWeCare.subjects',
        faculty: 'danlaWeCare.faculty',
        students: 'danlaWeCare.students',
        assignments: 'danlaWeCare.assignments',
        exams: 'danlaWeCare.exams',
        attendance: 'danlaWeCare.attendance',
        resources: 'danlaWeCare.resources',
        notices: 'danlaWeCare.notices',
        marks: 'danlaWeCare.marks',
        kv_store: 'danlaWeCare.kv'
      };
      Object.keys(mapping).forEach(tbl=>{ try{ const arr = data[tbl] || []; localStorage.setItem(mapping[tbl], JSON.stringify(arr)); }catch(e){} });
    }
  }catch(e){ console.warn('D1 initial sync failed', e); }

  // monkey-patch localStorage.setItem / removeItem to POST to /api/kv/:key
  const origSet = Storage.prototype.setItem; const origRemove = Storage.prototype.removeItem;
  Storage.prototype.setItem = function(key, value){ try{ origSet.apply(this, [key, value]); // async sync
      if(key && key.startsWith('danlaWeCare.')){ fetch('/api/kv/' + encodeURIComponent(key), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ value: JSON.parse(value) }) }).catch(()=>{}); } }catch(e){ console.warn(e); origSet.apply(this, [key, value]); } };
  Storage.prototype.removeItem = function(key){ try{ origRemove.apply(this,[key]); if(key && key.startsWith('danlaWeCare.')){ fetch('/api/kv/' + encodeURIComponent(key), { method:'DELETE' }).catch(()=>{}); } }catch(e){ origRemove.apply(this,[key]); } };
})();
