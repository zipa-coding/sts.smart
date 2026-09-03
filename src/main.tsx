import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import dbData from './data/db.json';
import { isFirebaseConfigured, firebaseApi } from './lib/firebase';
import { registerSW } from 'virtual:pwa-register';

// Automatically register and update PWA service worker
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Versi baru Raport STS tersedia. Memperbarui...');
  },
  onOfflineReady() {
    console.log('Aplikasi Raport STS siap digunakan secara offline.');
  },
});

// Keep reference to original fetch
const originalFetch = window.fetch;

// Determine if we should use local localStorage mock API
// We use mock API if on *.github.io, if protocol is file:, or if there is no server running
const isStaticHost = 
  window.location.hostname.includes('github.io') || 
  window.location.hostname.includes('gmpg.io') ||
  window.location.protocol === 'file:';

// Memory cache for client-side storage simulation
let clientDbCache: any = null;

// Initialize localStorage with db.json seed data if empty
function initializeLocalStorage() {
  if (!clientDbCache) {
    const raw = localStorage.getItem('smart_sts_db');
    if (raw) {
      try {
        clientDbCache = JSON.parse(raw);
      } catch (e) {
        clientDbCache = dbData;
      }
    } else {
      clientDbCache = dbData;
      localStorage.setItem('smart_sts_db', JSON.stringify(dbData));
    }
  }
}

// Wrapper to simulate fetch for /api/* requests on static deployments
const localFetchInterception = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const urlStr = typeof input === 'string' ? input : (input as any).url || '';
  
  // Only intercept /api/ requests
  if (!urlStr.includes('/api/')) {
    return originalFetch(input, init);
  }

  initializeLocalStorage();
  const getDB = () => clientDbCache || JSON.parse(localStorage.getItem('smart_sts_db') || '{}');
  const saveDB = (data: any) => {
    clientDbCache = data;
    localStorage.setItem('smart_sts_db', JSON.stringify(data));
  };

  const path = urlStr.startsWith('http') 
    ? new URL(urlStr).pathname 
    : urlStr.split('?')[0];
    
  const method = init?.method?.toUpperCase() || 'GET';
  const body = init?.body ? JSON.parse(init.body as string) : null;

  // Extract schoolId from query, headers, or body
  let reqSchoolId = 'smp-islam-smart';
  const urlObj = urlStr.startsWith('http') ? new URL(urlStr) : null;
  if (urlObj && urlObj.searchParams.get('schoolId')) {
    reqSchoolId = urlObj.searchParams.get('schoolId')!;
  } else if (urlStr.includes('schoolId=')) {
    const m = urlStr.match(/schoolId=([^&]+)/);
    if (m) reqSchoolId = decodeURIComponent(m[1]);
  }
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      const h = init.headers.get('x-school-id') || init.headers.get('x-school');
      if (h) reqSchoolId = h;
    } else if (typeof init.headers === 'object') {
      const h = (init.headers as any)['x-school-id'] || (init.headers as any)['x-school'];
      if (h) reqSchoolId = h;
    }
  }
  if (body?.schoolId) {
    reqSchoolId = body.schoolId;
  }

  // Multi-school API endpoints in local simulation
  if (path === '/api/schools' && method === 'GET') {
    const db = getDB();
    const schools = db.schools || [
      {
        id: "smp-islam-smart",
        name: "SMP ISLAM SMART PANGKALPINANG",
        npsn: "69987654",
        city: "Pangkalpinang",
        adminUsername: "admin",
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ];
    return new Response(JSON.stringify(schools), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (path === '/api/schools/register' && method === 'POST') {
    const { name, npsn, city, adminName, adminUsername, adminPassword } = body || {};
    if (!name || !adminUsername || !adminPassword) {
      return new Response(JSON.stringify({ error: "Nama sekolah, username admin, dan password wajib diisi." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const db = getDB();
    if (!db.schools) {
      db.schools = [{ id: "smp-islam-smart", name: "SMP ISLAM SMART PANGKALPINANG", npsn: "69987654", city: "Pangkalpinang", adminUsername: "admin", createdAt: "2026-01-01T00:00:00.000Z" }];
    }
    const exists = db.schools.some((s: any) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (exists) {
      return new Response(JSON.stringify({ error: "Sekolah dengan nama tersebut sudah terdaftar di sistem." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const schoolId = "sch_" + Date.now();
    const newSchool = {
      id: schoolId,
      name: name.trim().toUpperCase(),
      npsn: npsn?.trim() || "",
      city: city?.trim() || "",
      adminUsername: adminUsername.trim(),
      createdAt: new Date().toISOString()
    };
    db.schools.push(newSchool);
    const newAdmin = {
      id: "t_" + Date.now(),
      schoolId: schoolId,
      name: adminName?.trim() || "Administrator",
      username: adminUsername.trim(),
      password: adminPassword,
      subject: "Admin",
      isWaliKelas: false,
      kelas: ""
    };
    if (!db.teachers) db.teachers = [];
    db.teachers.push(newAdmin);
    saveDB(db);
    return new Response(JSON.stringify({ success: true, message: "Pendaftaran sekolah berhasil.", school: newSchool, admin: newAdmin }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    if (isFirebaseConfigured) {
      try {
        // 1. POST /api/login
        if (path === '/api/login' && method === 'POST') {
          const user = await firebaseApi.login(body);
          if (!user) {
            return new Response(JSON.stringify({ error: "Kombinasi pengguna dan kata sandi salah." }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return new Response(JSON.stringify(user), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // POST /api/verify-session
        if (path === '/api/verify-session' && method === 'POST') {
          const user = await firebaseApi.login(body);
          if (!user) {
            return new Response(JSON.stringify({ error: "Sesi tidak valid." }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return new Response(JSON.stringify(user), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // 2. GET /api/teachers
        if (path === '/api/teachers' && method === 'GET') {
          const t = await firebaseApi.getTeachers();
          return new Response(JSON.stringify(t), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // POST /api/teachers
        if (path === '/api/teachers' && method === 'POST') {
          try {
            const t = await firebaseApi.postTeacher(body);
            return new Response(JSON.stringify(t), { status: 201, headers: { 'Content-Type': 'application/json' } });
          } catch (e: any) {
            if (e.message?.includes("Username sudah digunakan") || e.message?.includes("wajib") || e.message?.includes("lengkap")) {
              return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            console.warn("Firestore postTeacher failed, falling back to local DB:", e);
            // Fall back to local DB processing
          }
        }

        // PUT /api/teachers/:id
        if (path.startsWith('/api/teachers/') && method === 'PUT') {
          const id = path.split('/').pop() || "";
          const t = await firebaseApi.putTeacher(id, body);
          return new Response(JSON.stringify(t), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // DELETE /api/teachers/:id
        if (path.startsWith('/api/teachers/') && method === 'DELETE') {
          const id = path.split('/').pop() || "";
          try {
            const res = await firebaseApi.deleteTeacher(id);
            return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
          } catch (e: any) {
            return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
          }
        }

        // 3. GET /api/students
        if (path === '/api/students' && method === 'GET') {
          const s = await firebaseApi.getStudents();
          return new Response(JSON.stringify(s), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // POST /api/students
        if (path === '/api/students' && method === 'POST') {
          try {
            const s = await firebaseApi.postStudent(body);
            return new Response(JSON.stringify(s), { status: 201, headers: { 'Content-Type': 'application/json' } });
          } catch (e: any) {
            if (e.message?.includes("NISN") || e.message?.includes("wajib") || e.message?.includes("lengkap")) {
              return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            console.warn("Firestore postStudent failed, falling back to local DB:", e);
            // Fall back to local DB processing
          }
        }

        // PUT /api/students/:id
        if (path.startsWith('/api/students/') && method === 'PUT') {
          const id = path.split('/').pop() || "";
          const s = await firebaseApi.putStudent(id, body);
          return new Response(JSON.stringify(s), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // DELETE /api/students/:id
        if (path.startsWith('/api/students/') && method === 'DELETE') {
          const id = path.split('/').pop() || "";
          const res = await firebaseApi.deleteStudent(id);
          return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // 4. GET /api/grades
        if (path === '/api/grades' && method === 'GET') {
          const g = await firebaseApi.getGrades();
          return new Response(JSON.stringify(g), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // POST /api/grades
        if (path === '/api/grades' && method === 'POST') {
          const g = await firebaseApi.postGrade(body);
          return new Response(JSON.stringify(g), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // 5. GET /api/walikelas/notes
        if (path === '/api/walikelas/notes' && method === 'GET') {
          const n = await firebaseApi.getWaliKelasNotes();
          return new Response(JSON.stringify(n), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // POST /api/walikelas/notes
        if (path === '/api/walikelas/notes' && method === 'POST') {
          const n = await firebaseApi.postWaliKelasNotes(body);
          return new Response(JSON.stringify(n), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // 6. GET /api/tps
        if (path === '/api/tps' && method === 'GET') {
          const tps = await firebaseApi.getTPs();
          return new Response(JSON.stringify(tps), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // POST /api/tps
        if (path === '/api/tps' && method === 'POST') {
          const tp = await firebaseApi.postTP(body);
          return new Response(JSON.stringify(tp), { status: 201, headers: { 'Content-Type': 'application/json' } });
        }

        // DELETE /api/tps/:subject/:tpId
        if (path.startsWith('/api/tps/') && method === 'DELETE') {
          const parts = path.split('/');
          const tpId = parts.pop() || "";
          const subject = decodeURIComponent(parts.pop() || '');
          const res = await firebaseApi.deleteTP(subject, tpId);
          return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // 7. GET /api/settings
        if (path === '/api/settings' && method === 'GET') {
          const s = await firebaseApi.getSettings();
          return new Response(JSON.stringify(s), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // POST /api/settings
        if (path === '/api/settings' && method === 'POST') {
          const s = await firebaseApi.postSettings(body);
          return new Response(JSON.stringify(s), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // 8. GET /api/summary
        if (path === '/api/summary' && method === 'GET') {
          const sum = await firebaseApi.getSummary();
          return new Response(JSON.stringify(sum), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // 9. GET, POST, DELETE /api/ekskul for Firebase
        if (path === '/api/ekskul' && method === 'GET') {
          const e = await firebaseApi.getEkskul();
          return new Response(JSON.stringify(e), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        if (path === '/api/ekskul' && method === 'POST') {
          const e = await firebaseApi.postEkskul(body);
          return new Response(JSON.stringify(e), { status: 201, headers: { 'Content-Type': 'application/json' } });
        }

        if (path.startsWith('/api/ekskul/') && method === 'DELETE') {
          const id = path.split('/').pop() || "";
          const res = await firebaseApi.deleteEkskul(id);
          return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      } catch (firebaseErr) {
        console.warn("Firestore call failed, falling back to local database storage:", firebaseErr);
      }
    }

    const isItemForSchool = (item: any) => {
      if (!item) return false;
      if (reqSchoolId === 'smp-islam-smart') {
        return !item.schoolId || item.schoolId === 'smp-islam-smart';
      }
      return item.schoolId === reqSchoolId;
    };

    // 1. POST /api/login
    if (path === '/api/login' && method === 'POST') {
      const { username, password, schoolId } = body || {};
      const targetSchoolId = schoolId || reqSchoolId || 'smp-islam-smart';
      const db = getDB();
      const school = (db.schools || []).find((s: any) => s.id === targetSchoolId);
      const isTargetRecord = (item: any) => {
        if (!item) return false;
        if (targetSchoolId === 'smp-islam-smart') {
          return !item.schoolId || item.schoolId === 'smp-islam-smart';
        }
        return item.schoolId === targetSchoolId;
      };
      const teacher = (db.teachers || []).find(
        (t: any) => isTargetRecord(t) && t.username?.toLowerCase() === username?.toLowerCase() && t.password === password
      );
      if (!teacher) {
        return new Response(JSON.stringify({ error: "Kombinasi pengguna dan kata sandi salah untuk sekolah yang dipilih." }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({
        id: teacher.id,
        schoolId: targetSchoolId,
        schoolName: school?.name || "SMP ISLAM SMART PANGKALPINANG",
        name: teacher.name,
        username: teacher.username,
        subject: teacher.subject,
        isWaliKelas: teacher.isWaliKelas || false,
        kelas: teacher.kelas || ""
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/verify-session
    if (path === '/api/verify-session' && method === 'POST') {
      const { username, password, schoolId } = body || {};
      const targetSchoolId = schoolId || reqSchoolId || 'smp-islam-smart';
      const db = getDB();
      const school = (db.schools || []).find((s: any) => s.id === targetSchoolId);
      const isTargetRecord = (item: any) => {
        if (!item) return false;
        if (targetSchoolId === 'smp-islam-smart') {
          return !item.schoolId || item.schoolId === 'smp-islam-smart';
        }
        return item.schoolId === targetSchoolId;
      };
      const teacher = (db.teachers || []).find(
        (t: any) => isTargetRecord(t) && t.username?.toLowerCase() === username?.toLowerCase() && t.password === password
      );
      if (!teacher) {
        return new Response(JSON.stringify({ error: "Sesi tidak valid." }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({
        id: teacher.id,
        schoolId: targetSchoolId,
        schoolName: school?.name || "SMP ISLAM SMART PANGKALPINANG",
        name: teacher.name,
        username: teacher.username,
        subject: teacher.subject,
        isWaliKelas: teacher.isWaliKelas || false,
        kelas: teacher.kelas || ""
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. GET /api/teachers
    if (path === '/api/teachers' && method === 'GET') {
      const db = getDB();
      const filtered = (db.teachers || []).filter(isItemForSchool);
      return new Response(JSON.stringify(filtered), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/teachers
    if (path === '/api/teachers' && method === 'POST') {
      const { name, username, password, subject, isWaliKelas, kelas } = body || {};
      const db = getDB();
      const exists = (db.teachers || []).some((t: any) => isItemForSchool(t) && t.username.toLowerCase() === username?.toLowerCase());
      if (exists) {
        return new Response(JSON.stringify({ error: "Username sudah digunakan di sekolah ini." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const newTeacher = {
        id: "t_" + Date.now(),
        schoolId: reqSchoolId,
        name,
        username,
        password,
        subject,
        isWaliKelas: !!isWaliKelas,
        kelas: kelas || ""
      };
      if (!db.teachers) db.teachers = [];
      db.teachers.push(newTeacher);
      saveDB(db);
      return new Response(JSON.stringify(newTeacher), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    // PUT /api/teachers/:id
    if (path.startsWith('/api/teachers/') && method === 'PUT') {
      const id = path.split('/').pop();
      const { name, username, password, subject, isWaliKelas, kelas } = body || {};
      const db = getDB();
      const index = db.teachers.findIndex((t: any) => t.id === id);
      if (index === -1) {
        return new Response(JSON.stringify({ error: "Guru tidak ditemukan." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      db.teachers[index] = { ...db.teachers[index], name, username, password, subject, isWaliKelas: !!isWaliKelas, kelas: kelas || "" };
      saveDB(db);
      return new Response(JSON.stringify(db.teachers[index]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // DELETE /api/teachers/:id
    if (path.startsWith('/api/teachers/') && method === 'DELETE') {
      const id = path.split('/').pop();
      if (id === 't1') {
        return new Response(JSON.stringify({ error: "Akun Super Admin utama tidak boleh dihapus." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const db = getDB();
      db.teachers = db.teachers.filter((t: any) => t.id !== id);
      saveDB(db);
      return new Response(JSON.stringify({ message: "Guru berhasil dihapus." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. GET /api/students
    if (path === '/api/students' && method === 'GET') {
      const db = getDB();
      const filtered = (db.students || []).filter(isItemForSchool);
      return new Response(JSON.stringify(filtered), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/students
    if (path === '/api/students' && method === 'POST') {
      const { name, nisn, kelas } = body || {};
      const db = getDB();
      const exists = (db.students || []).some((s: any) => isItemForSchool(s) && s.nisn === nisn);
      if (exists) {
        return new Response(JSON.stringify({ error: "Siswa dengan NISN ini sudah terdaftar di sekolah ini." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const newStudent = { id: "s_" + Date.now(), schoolId: reqSchoolId, nisn, name, kelas };
      if (!db.students) db.students = [];
      db.students.push(newStudent);
      saveDB(db);
      return new Response(JSON.stringify(newStudent), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    // PUT /api/students/:id
    if (path.startsWith('/api/students/') && method === 'PUT') {
      const id = path.split('/').pop();
      const { name, nisn, kelas } = body || {};
      const db = getDB();
      const index = (db.students || []).findIndex((s: any) => s.id === id);
      if (index === -1) {
        return new Response(JSON.stringify({ error: "Siswa tidak ditemukan." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      db.students[index] = { ...db.students[index], name, nisn, kelas };
      saveDB(db);
      return new Response(JSON.stringify(db.students[index]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // DELETE /api/students/:id
    if (path.startsWith('/api/students/') && method === 'DELETE') {
      const id = path.split('/').pop();
      const db = getDB();
      db.students = (db.students || []).filter((s: any) => s.id !== id);
      db.grades = (db.grades || []).filter((g: any) => g.studentId !== id);
      if (db.walikelas_notes && db.walikelas_notes[id!]) {
        delete db.walikelas_notes[id!];
      }
      saveDB(db);
      return new Response(JSON.stringify({ message: "Siswa berhasil dihapus." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 4. GET /api/grades
    if (path === '/api/grades' && method === 'GET') {
      const db = getDB();
      const filtered = (db.grades || []).filter(isItemForSchool);
      return new Response(JSON.stringify(filtered), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/grades
    if (path === '/api/grades' && method === 'POST') {
      const { studentId, subject, score, tps, teacherName, usaha, proses, capaian, deskripsi } = body || {};
      const db = getDB();
      if (!db.grades) db.grades = [];
      const index = db.grades.findIndex((g: any) => isItemForSchool(g) && g.studentId === studentId && g.subject === subject);
      const updatedGrade = {
        schoolId: reqSchoolId,
        studentId,
        subject,
        score: Number(score),
        tps,
        usaha: usaha || "B",
        proses: proses || "B",
        capaian: capaian || "B",
        deskripsi: deskripsi || "",
        lastUpdatedBy: teacherName || "Guru Mata Pelajaran",
        lastUpdatedAt: new Date().toISOString()
      };
      if (index !== -1) {
        db.grades[index] = updatedGrade;
      } else {
        db.grades.push(updatedGrade);
      }
      saveDB(db);
      return new Response(JSON.stringify(updatedGrade), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 5. GET /api/walikelas/notes
    if (path === '/api/walikelas/notes' && method === 'GET') {
      const db = getDB();
      return new Response(JSON.stringify(db.walikelas_notes || {}), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/walikelas/notes
    if (path === '/api/walikelas/notes' && method === 'POST') {
      const { studentId, sakit, izin, alpa, catatan, spiritualUsaha, spiritualProses, spiritualCapaian, spiritualDeskripsi, sosialUsaha, sosialProses, sosialCapaian, sosialDeskripsi, ekskul } = body || {};
      const db = getDB();
      if (!db.walikelas_notes) db.walikelas_notes = {};
      db.walikelas_notes[studentId] = {
        sakit: Number(sakit || 0),
        izin: Number(izin || 0),
        alpa: Number(alpa || 0),
        catatan: catatan || "",
        spiritualUsaha: spiritualUsaha || "B",
        spiritualProses: spiritualProses || "B",
        spiritualCapaian: spiritualCapaian || "B",
        spiritualDeskripsi: spiritualDeskripsi || "",
        sosialUsaha: sosialUsaha || "B",
        sosialProses: sosialProses || "B",
        sosialCapaian: sosialCapaian || "B",
        sosialDeskripsi: sosialDeskripsi || "",
        ekskul: ekskul || []
      };
      saveDB(db);
      return new Response(JSON.stringify({ studentId, ...db.walikelas_notes[studentId] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 6. GET /api/tps
    if (path === '/api/tps' && method === 'GET') {
      const db = getDB();
      return new Response(JSON.stringify(db.tujuan_pembelajaran_templates || {}), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/tps
    if (path === '/api/tps' && method === 'POST') {
      const { subject, tpText } = body || {};
      const db = getDB();
      if (!db.tujuan_pembelajaran_templates) db.tujuan_pembelajaran_templates = {};
      if (!db.tujuan_pembelajaran_templates[subject]) db.tujuan_pembelajaran_templates[subject] = [];
      const newTP = { id: "tp_" + Date.now(), text: tpText };
      db.tujuan_pembelajaran_templates[subject].push(newTP);
      saveDB(db);
      return new Response(JSON.stringify(newTP), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    // DELETE /api/tps/:subject/:tpId
    if (path.startsWith('/api/tps/') && method === 'DELETE') {
      const parts = path.split('/');
      const tpId = parts.pop();
      const subject = decodeURIComponent(parts.pop() || '');
      const db = getDB();
      if (db.tujuan_pembelajaran_templates && db.tujuan_pembelajaran_templates[subject]) {
        db.tujuan_pembelajaran_templates[subject] = db.tujuan_pembelajaran_templates[subject].filter((tp: any) => tp.id !== tpId);
        saveDB(db);
        return new Response(JSON.stringify({ message: "TP berhasil dihapus." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: "TP tidak ditemukan." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // 6.5 GET /api/settings
    if (path === '/api/settings' && method === 'GET') {
      const db = getDB();
      const principalName = db.settings?.principalName || "Ustadz H. Ir. Abdul Muhyi, M.Pd";
      const principalNip = db.settings?.principalNip || "19780512 200501 1 002";
      const format = db.settings?.format || {
        semesterName: "Ganjil",
        tahunPelajaran: "2026/2027",
        fontSize: "11pt",
        showLogo: false,
        showSpiritual: true,
        showSosial: true,
        showAttendance: true,
        showCatatan: true,
        fontFamily: "Times New Roman",
        paperSize: "A4",
        tanggalRaport: "17 Juni 2026"
      };
      // If format doesn't have tanggalRaport, default it
      if (format && !format.tanggalRaport) {
        format.tanggalRaport = "17 Juni 2026";
      }
      return new Response(JSON.stringify({ principalName, principalNip, format }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/settings
    if (path === '/api/settings' && method === 'POST') {
      const { principalName, principalNip, format } = body || {};
      const db = getDB();
      if (!db.settings) db.settings = {};
      db.settings.principalName = principalName || "Ustadz H. Ir. Abdul Muhyi, M.Pd";
      db.settings.principalNip = principalNip || "19780512 200501 1 002";
      if (format) {
        db.settings.format = {
          semesterName: format.semesterName || "Ganjil",
          tahunPelajaran: format.tahunPelajaran || "2026/2027",
          fontSize: format.fontSize || "11pt",
          showLogo: format.showLogo !== undefined ? format.showLogo : false,
          showSpiritual: format.showSpiritual !== undefined ? format.showSpiritual : true,
          showSosial: format.showSosial !== undefined ? format.showSosial : true,
          showAttendance: format.showAttendance !== undefined ? format.showAttendance : true,
          showCatatan: format.showCatatan !== undefined ? format.showCatatan : true,
          fontFamily: format.fontFamily || "Times New Roman",
          paperSize: format.paperSize || "A4",
          tanggalRaport: format.tanggalRaport || "17 Juni 2026"
        };
      }
      saveDB(db);
      return new Response(JSON.stringify({ success: true, settings: db.settings }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // GET /api/ekskul
    if (path === '/api/ekskul' && method === 'GET') {
      const db = getDB();
      const defaultEkskul = [
        { "id": "e1", "name": "Pramuka", "type": "Wajib" },
        { "id": "e2", "name": "Mentoring", "type": "Wajib" },
        { "id": "e3", "name": "Futsal", "type": "Pilihan" },
        { "id": "e4", "name": "Voli", "type": "Pilihan" },
        { "id": "e5", "name": "Panahan", "type": "Pilihan" },
        { "id": "e6", "name": "Study Club", "type": "Pilihan" }
      ];
      if (!db.ekskul) {
        db.ekskul = defaultEkskul;
        saveDB(db);
      }
      return new Response(JSON.stringify(db.ekskul), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/ekskul
    if (path === '/api/ekskul' && method === 'POST') {
      const { name, type } = body || {};
      const db = getDB();
      if (!db.ekskul) {
        db.ekskul = [
          { "id": "e1", "name": "Pramuka", "type": "Wajib" },
          { "id": "e2", "name": "Mentoring", "type": "Wajib" },
          { "id": "e3", "name": "Futsal", "type": "Pilihan" },
          { "id": "e4", "name": "Voli", "type": "Pilihan" },
          { "id": "e5", "name": "Panahan", "type": "Pilihan" },
          { "id": "e6", "name": "Study Club", "type": "Pilihan" }
        ];
      }
      const newE = { id: "e_" + Date.now(), name, type };
      db.ekskul.push(newE);
      saveDB(db);
      return new Response(JSON.stringify(newE), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    // DELETE /api/ekskul/:id
    if (path.startsWith('/api/ekskul/') && method === 'DELETE') {
      const id = path.split('/').pop() || "";
      const db = getDB();
      if (db.ekskul) {
        db.ekskul = db.ekskul.filter((e: any) => e.id !== id);
        saveDB(db);
      }
      return new Response(JSON.stringify({ message: "Ekskul deleted" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 7. GET /api/summary
    if (path === '/api/summary' && method === 'GET') {
      const db = getDB();
      const subjectsList = [
        "PAI", "PPKN", "Bahasa Indonesia", "Matematika", "IPA", "IPS", "Bahasa Inggris", "PJOK", "Prakarya", "Informatika",
        "Bahasa Arab", "Tahsin ABaTaTsa", "Tahfizh Al-Qur’an", "Do’a Harian dan Hadits", "Wudhu dan Sholat"
      ];
      const schoolStudents = (db.students || []).filter(isItemForSchool);
      const schoolGrades = (db.grades || []).filter(isItemForSchool);
      const schoolTeachers = (db.teachers || []).filter(isItemForSchool);
      const totalStudents = schoolStudents.length;
      const subjectProgress = subjectsList.map(sub => {
        const filledGradesForSub = schoolGrades.filter((g: any) => g.subject === sub);
        const completedCount = filledGradesForSub.length;
        const percentage = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;
        const teacher = schoolTeachers.find((t: any) => t.subject === sub);
        return {
          subject: sub,
          completed: completedCount,
          total: totalStudents,
          percent: percentage,
          teacherName: teacher ? teacher.name : "Belum Ditugaskan"
        };
      });

      const classes = Array.from(new Set(schoolStudents.map((s: any) => s.kelas))) as string[];
      const classProgress = classes.map(cls => {
        const studentsInClass = schoolStudents.filter((s: any) => s.kelas === cls);
        const totalGradesNeeded = studentsInClass.length * subjectsList.length;
        let gradesFilledCount = 0;
        const studentIds = studentsInClass.map((s: any) => s.id);
        schoolGrades.forEach((g: any) => {
          if (studentIds.includes(g.studentId)) {
            gradesFilledCount++;
          }
        });
        const percent = totalGradesNeeded > 0 ? Math.round((gradesFilledCount / totalGradesNeeded) * 100) : 0;
        const waliKelas = schoolTeachers.find((t: any) => t.isWaliKelas && t.kelas === cls);
        return {
          kelas: cls,
          studentCount: studentsInClass.length,
          filledGrades: gradesFilledCount,
          totalNeeded: totalGradesNeeded,
          percent,
          waliKelasName: waliKelas ? waliKelas.name : "Belum Ditugaskan"
        };
      });

      return new Response(JSON.stringify({
        totalStudents,
        totalTeachers: schoolTeachers.length,
        subjectProgress,
        classProgress,
        lastUpdate: new Date().toISOString()
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: "Endpoint not found in client-side mock" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Local mock server error:", error);
    return new Response(JSON.stringify({ error: "Internal client-server error in mock mode" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

// Implement global window.fetch fallback strategy
const customFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === 'string' ? input : (input as any).url || '';

  // Non-API fetches are bypassed
  if (!urlStr.includes('/api/')) {
    return originalFetch(input, init);
  }

  // Determine active schoolId from session if available
  let activeSchoolId = 'smp-islam-smart';
  try {
    const saved = sessionStorage.getItem('smp_islam_smart_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.schoolId) {
        activeSchoolId = parsed.schoolId;
      }
    }
  } catch (e) {}

  // Ensure x-school-id header is included
  const enhancedInit: RequestInit = { ...(init || {}) };
  let headers: Headers;
  if (enhancedInit.headers instanceof Headers) {
    headers = new Headers(enhancedInit.headers);
  } else if (enhancedInit.headers && typeof enhancedInit.headers === 'object') {
    headers = new Headers(enhancedInit.headers as Record<string, string>);
  } else {
    headers = new Headers();
  }
  if (!headers.has('x-school-id')) {
    headers.set('x-school-id', activeSchoolId);
  }
  enhancedInit.headers = headers;

  // On static hosting without backend, route directly to local simulation
  if (isStaticHost) {
    return localFetchInterception(input, enhancedInit);
  }

  // Always try real backend (Express server) first
  try {
    const res = await originalFetch(input, enhancedInit);
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    
    // If the server returned HTML (e.g. index.html SPA fallback), or 404, fallback to local interception
    if (contentType.includes('text/html') || res.status === 404) {
      return localFetchInterception(input, enhancedInit);
    }
    return res;
  } catch (error) {
    // Server down or offline -> fallback to client-side database
    console.warn("Backend server offline, falling back to client-side database:", error);
    return localFetchInterception(input, enhancedInit);
  }
};

try {
  Object.defineProperty(window, 'fetch', {
    value: customFetch,
    configurable: true,
    writable: true,
    enumerable: true
  });
} catch (error) {
  console.warn("Failed to redefine window.fetch with Object.defineProperty, falling back to direct assignment:", error);
  try {
    (window as any).fetch = customFetch;
  } catch (directError) {
    console.error("Failed to assign fetch on window directly:", directError);
  }
}

// Mount application
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

