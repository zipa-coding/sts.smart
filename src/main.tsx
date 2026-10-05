import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import dbData from './data/db.json';
import { isFirebaseConfigured, firebaseApi } from './lib/firebase';
import { registerSW } from 'virtual:pwa-register';

// Automatically register and update PWA service worker in production
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('Versi baru Raport STS tersedia. Memperbarui...');
    },
    onOfflineReady() {
      console.log('Aplikasi Raport STS siap digunakan secara offline.');
    },
  });
}

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

// Initialize localStorage with db.json seed data if empty or updated
const DB_VERSION_KEY = 'smart_sts_db_version_v4';

function initializeLocalStorage() {
  if (!clientDbCache) {
    const raw = localStorage.getItem('smart_sts_db');
    const savedVersion = localStorage.getItem(DB_VERSION_KEY);
    
    if (raw && savedVersion === 'v4') {
      try {
        clientDbCache = JSON.parse(raw);
        // Ensure TP templates are strictly separated per class (Kelas 7, 8, 9)
        let needsSave = false;
        if (!clientDbCache.tujuan_pembelajaran_templates || typeof clientDbCache.tujuan_pembelajaran_templates !== 'object') {
          clientDbCache.tujuan_pembelajaran_templates = dbData.tujuan_pembelajaran_templates;
          needsSave = true;
        }
        // Ensure student list matches the 84 authentic students
        if (!Array.isArray(clientDbCache.students) || clientDbCache.students.length !== 84 || !clientDbCache.students.some((s: any) => s.name === 'Aaisyah Nuur Husnaa' && s.kelas === '9')) {
          clientDbCache.students = (dbData as any).students || [];
          needsSave = true;
        }
        if (needsSave) {
          localStorage.setItem('smart_sts_db', JSON.stringify(clientDbCache));
        }
      } catch (e) {
        clientDbCache = dbData;
        localStorage.setItem('smart_sts_db', JSON.stringify(dbData));
        localStorage.setItem(DB_VERSION_KEY, 'v4');
      }
    } else {
      clientDbCache = dbData;
      localStorage.setItem('smart_sts_db', JSON.stringify(dbData));
      localStorage.setItem(DB_VERSION_KEY, 'v4');
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

        // POST /api/teachers/bulk-delete
        if (path === '/api/teachers/bulk-delete' && method === 'POST') {
          try {
            const ids = body?.ids || [];
            const res = await firebaseApi.deleteTeachersBulk(ids);
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

        // POST /api/students/batch
        if (path === '/api/students/batch' && method === 'POST') {
          try {
            const res = await firebaseApi.postStudentsBatch(body?.students || []);
            return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
          } catch (e: any) {
            console.warn("Firestore postStudentsBatch failed, falling back:", e);
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

        // POST /api/students/bulk-delete
        if (path === '/api/students/bulk-delete' && method === 'POST') {
          try {
            const ids = body?.ids || [];
            const res = await firebaseApi.deleteStudentsBulk(ids);
            return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
          } catch (e: any) {
            return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
          }
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

        if (path.startsWith('/api/ekskul/') && method === 'PUT') {
          const id = path.split('/').pop() || "";
          const e = await firebaseApi.putEkskul(id, body);
          return new Response(JSON.stringify(e), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        if (path.startsWith('/api/ekskul/') && method === 'DELETE') {
          const id = path.split('/').pop() || "";
          const res = await firebaseApi.deleteEkskul(id);
          return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        if (path === '/api/ekskul/grades/bulk' && method === 'POST') {
          const grades = body?.grades || [];
          const res = await firebaseApi.postEkskulGradesBulk(grades);
          return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // 10. GET, POST, PUT, DELETE /api/halaqoh for Cloud Firestore
        if (path === '/api/halaqoh' && method === 'GET') {
          const hlq = await firebaseApi.getHalaqoh();
          const db = getDB();
          if (Array.isArray(hlq)) {
            db.halaqoh = hlq;
            saveDB(db);
          }
          return new Response(JSON.stringify(hlq), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        if (path === '/api/halaqoh' && method === 'POST') {
          const newH = await firebaseApi.postHalaqoh(body);
          const db = getDB();
          if (!Array.isArray(db.halaqoh)) db.halaqoh = [];
          db.halaqoh.push(newH);
          saveDB(db);
          return new Response(JSON.stringify(newH), { status: 201, headers: { 'Content-Type': 'application/json' } });
        }

        if (path.startsWith('/api/halaqoh/') && method === 'PUT') {
          const id = path.split('/').pop() || "";
          const updatedH = await firebaseApi.putHalaqoh(id, body);
          const db = getDB();
          if (Array.isArray(db.halaqoh)) {
            const idx = db.halaqoh.findIndex((h: any) => h.id === id);
            if (idx !== -1) {
              db.halaqoh[idx] = { ...db.halaqoh[idx], ...updatedH };
              saveDB(db);
            }
          }
          return new Response(JSON.stringify(updatedH), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        if (path.startsWith('/api/halaqoh/') && method === 'DELETE') {
          const id = path.split('/').pop() || "";
          const res = await firebaseApi.deleteHalaqoh(id);
          const db = getDB();
          if (Array.isArray(db.halaqoh)) {
            db.halaqoh = db.halaqoh.filter((h: any) => h.id !== id);
            saveDB(db);
          }
          return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      } catch (firebaseErr) {
        console.warn("Firestore call failed, falling back to local database storage:", firebaseErr);
      }
    }

    // 1. POST /api/login
    if (path === '/api/login' && method === 'POST') {
      const { username, password } = body || {};
      const db = getDB();
      const teacher = db.teachers.find(
        (t: any) => t.username.toLowerCase() === username?.toLowerCase() && t.password === password
      );
      if (!teacher) {
        return new Response(JSON.stringify({ error: "Kombinasi pengguna dan kata sandi salah." }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({
        id: teacher.id,
        name: teacher.name,
        username: teacher.username,
        subject: teacher.subject,
        isWaliKelas: teacher.isWaliKelas || false,
        kelas: teacher.kelas || ""
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/verify-session
    if (path === '/api/verify-session' && method === 'POST') {
      const { username, password } = body || {};
      const db = getDB();
      const teacher = db.teachers.find(
        (t: any) => t.username.toLowerCase() === username?.toLowerCase() && t.password === password
      );
      if (!teacher) {
        return new Response(JSON.stringify({ error: "Sesi tidak valid." }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({
        id: teacher.id,
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
      return new Response(JSON.stringify(db.teachers), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/teachers
    if (path === '/api/teachers' && method === 'POST') {
      const { name, username, password, subject, isWaliKelas, kelas } = body || {};
      const db = getDB();
      const exists = db.teachers.some((t: any) => t.username.toLowerCase() === username?.toLowerCase());
      if (exists) {
        return new Response(JSON.stringify({ error: "Username sudah digunakan." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const newTeacher = {
        id: "t_" + Date.now(),
        name,
        username,
        password,
        subject,
        isWaliKelas: !!isWaliKelas,
        kelas: kelas || ""
      };
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

    // POST /api/teachers/bulk-delete
    if (path === '/api/teachers/bulk-delete' && method === 'POST') {
      const ids = body?.ids || [];
      const db = getDB();
      const validIds = new Set(ids.filter((id: string) => id && id !== 't1'));
      const beforeCount = db.teachers.length;
      db.teachers = db.teachers.filter((t: any) => !validIds.has(t.id));
      const deletedCount = beforeCount - db.teachers.length;
      saveDB(db);
      return new Response(JSON.stringify({ success: true, deletedCount, message: `Berhasil menghapus ${deletedCount} guru.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. GET /api/students
    if (path === '/api/students' && method === 'GET') {
      const db = getDB();
      return new Response(JSON.stringify(db.students), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/students
    if (path === '/api/students' && method === 'POST') {
      const { name, nisn, kelas } = body || {};
      const db = getDB();
      const exists = db.students.some((s: any) => s.nisn === nisn);
      if (exists) {
        return new Response(JSON.stringify({ error: "Siswa dengan NISN ini sudah terdaftar." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const newStudent = { id: "s_" + Date.now(), nisn, name, kelas };
      db.students.push(newStudent);
      saveDB(db);
      return new Response(JSON.stringify(newStudent), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/students/batch
    if (path === '/api/students/batch' && method === 'POST') {
      const studentsList = body?.students || [];
      const db = getDB();
      const existingNisns = new Set(db.students.map((s: any) => String(s.nisn || "").trim()));
      const batchNisns = new Set<string>();

      const addedStudents: any[] = [];
      const duplicates: string[] = [];
      const errors: string[] = [];

      let counter = 0;
      for (const item of studentsList) {
        const name = String(item.name || "").trim();
        const nisn = String(item.nisn || "").trim().replace(/\D/g, "");
        const kelas = String(item.kelas || "7").trim();

        if (!name) {
          errors.push(`Baris NISN ${nisn || "?"}: Nama siswa tidak boleh kosong.`);
          continue;
        }
        if (!nisn) {
          errors.push(`Siswa "${name}": NISN tidak valid (harus angka).`);
          continue;
        }

        if (existingNisns.has(nisn) || batchNisns.has(nisn)) {
          duplicates.push(`${name} (${nisn})`);
          continue;
        }

        batchNisns.add(nisn);
        existingNisns.add(nisn);

        const id = "s_" + Date.now() + "_" + (++counter);
        const newStudent = { id, nisn, name, kelas };
        db.students.push(newStudent);
        addedStudents.push(newStudent);
      }

      if (addedStudents.length > 0) {
        saveDB(db);
      }

      return new Response(JSON.stringify({
        success: true,
        addedCount: addedStudents.length,
        duplicatesCount: duplicates.length,
        duplicates,
        errors,
        students: addedStudents,
        totalStudents: db.students.length
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // PUT /api/students/:id
    if (path.startsWith('/api/students/') && method === 'PUT') {
      const id = path.split('/').pop();
      const { name, nisn, kelas } = body || {};
      const db = getDB();
      const index = db.students.findIndex((s: any) => s.id === id);
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
      db.students = db.students.filter((s: any) => s.id !== id);
      db.grades = db.grades.filter((g: any) => g.studentId !== id);
      if (db.walikelas_notes && db.walikelas_notes[id!]) {
        delete db.walikelas_notes[id!];
      }
      saveDB(db);
      return new Response(JSON.stringify({ message: "Siswa berhasil dihapus." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/students/bulk-delete
    if (path === '/api/students/bulk-delete' && method === 'POST') {
      const ids = body?.ids || [];
      const validIds = new Set(ids.filter(Boolean));
      const db = getDB();
      const beforeCount = db.students.length;
      db.students = db.students.filter((s: any) => !validIds.has(s.id));
      db.grades = db.grades.filter((g: any) => !validIds.has(g.studentId));
      if (db.walikelas_notes) {
        for (const sId of validIds) {
          if (db.walikelas_notes[sId as string]) {
            delete db.walikelas_notes[sId as string];
          }
        }
      }
      const deletedCount = beforeCount - db.students.length;
      saveDB(db);
      return new Response(JSON.stringify({ success: true, deletedCount, message: `Berhasil menghapus ${deletedCount} siswa.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 4. GET /api/grades
    if (path === '/api/grades' && method === 'GET') {
      const db = getDB();
      return new Response(JSON.stringify(db.grades), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/grades
    if (path === '/api/grades' && method === 'POST') {
      const { studentId, subject, score, tps, teacherName, usaha, proses, capaian, deskripsi } = body || {};
      const db = getDB();
      const index = db.grades.findIndex((g: any) => g.studentId === studentId && g.subject === subject);
      const updatedGrade = {
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
      const templates = db.tujuan_pembelajaran_templates || {};
      const urlObj = new URL(urlStr, 'http://localhost');
      const kelas = urlObj.searchParams.get('kelas');
      const subject = urlObj.searchParams.get('subject');

      if (subject) {
        let items = templates[subject] || [];
        if (kelas) {
          items = items.filter((item: any) => String(item.kelas || '').trim() === String(kelas).trim());
        }
        return new Response(JSON.stringify(items), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (kelas) {
        const filtered: Record<string, any[]> = {};
        for (const [sub, list] of Object.entries(templates)) {
          if (Array.isArray(list)) {
            filtered[sub] = list.filter((item: any) => String(item.kelas || '').trim() === String(kelas).trim());
          }
        }
        return new Response(JSON.stringify(filtered), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify(templates), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/tps
    if (path === '/api/tps' && method === 'POST') {
      const { subject, tpText, kelas } = body || {};
      const db = getDB();
      if (!db.tujuan_pembelajaran_templates) db.tujuan_pembelajaran_templates = {};
      if (!db.tujuan_pembelajaran_templates[subject]) db.tujuan_pembelajaran_templates[subject] = [];
      const newTP = { id: "tp_" + Date.now(), text: tpText, kelas: kelas ? String(kelas).trim() : "7" };
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
        showLogo: true,
        showSpiritual: true,
        showSosial: true,
        showAttendance: true,
        showCatatan: true,
        fontFamily: "Times New Roman",
        paperSize: "A4",
        tanggalRaport: "17 Juni 2026",
        principalSignaturePosition: "bottom_center",
        signatureCity: "Pangkal Pinang",
        principalTitle: "Kepala Sekolah",
        showPrincipalNip: true,
        showParentSignature: true,
        watermarkSize: 440,
        watermarkOpacity: 0.05
      };
      // If format doesn't have defaults, set them
      if (format) {
        if (!format.tanggalRaport) format.tanggalRaport = "17 Juni 2026";
        if (!format.principalSignaturePosition) format.principalSignaturePosition = "bottom_center";
        if (!format.signatureCity) format.signatureCity = "Pangkal Pinang";
        if (!format.principalTitle) format.principalTitle = "Kepala Sekolah";
        if (format.showPrincipalNip === undefined) format.showPrincipalNip = true;
        if (format.showParentSignature === undefined) format.showParentSignature = true;
        if (format.watermarkSize === undefined) format.watermarkSize = 440;
        if (format.watermarkOpacity === undefined) format.watermarkOpacity = 0.05;
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
          showLogo: format.showLogo !== undefined ? format.showLogo : true,
          showSpiritual: format.showSpiritual !== undefined ? format.showSpiritual : true,
          showSosial: format.showSosial !== undefined ? format.showSosial : true,
          showAttendance: format.showAttendance !== undefined ? format.showAttendance : true,
          showCatatan: format.showCatatan !== undefined ? format.showCatatan : true,
          fontFamily: format.fontFamily || "Times New Roman",
          paperSize: format.paperSize || "A4",
          tanggalRaport: format.tanggalRaport || "17 Juni 2026",
          principalSignaturePosition: format.principalSignaturePosition || "bottom_center",
          signatureCity: format.signatureCity || "Pangkal Pinang",
          principalTitle: format.principalTitle || "Kepala Sekolah",
          showPrincipalNip: format.showPrincipalNip !== undefined ? format.showPrincipalNip : true,
          showParentSignature: format.showParentSignature !== undefined ? format.showParentSignature : true,
          watermarkSize: format.watermarkSize !== undefined ? Number(format.watermarkSize) : 440,
          watermarkOpacity: format.watermarkOpacity !== undefined ? Number(format.watermarkOpacity) : 0.05
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
      const { name, type, pembinaTeacherId, pembinaName } = body || {};
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
      const newE = {
        id: "e_" + Date.now(),
        name,
        type,
        pembinaTeacherId: pembinaTeacherId || "",
        pembinaName: pembinaName || ""
      };
      db.ekskul.push(newE);
      saveDB(db);
      return new Response(JSON.stringify(newE), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    // PUT /api/ekskul/:id
    if (path.startsWith('/api/ekskul/') && method === 'PUT') {
      const id = path.split('/').pop() || "";
      const { name, type, pembinaTeacherId, pembinaName } = body || {};
      const db = getDB();
      if (!db.ekskul) db.ekskul = [];
      const idx = db.ekskul.findIndex((e: any) => e.id === id);
      if (idx === -1) {
        return new Response(JSON.stringify({ error: "Ekskul tidak ditemukan." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      db.ekskul[idx] = {
        ...db.ekskul[idx],
        name: name || db.ekskul[idx].name,
        type: type || db.ekskul[idx].type,
        pembinaTeacherId: pembinaTeacherId !== undefined ? pembinaTeacherId : db.ekskul[idx].pembinaTeacherId,
        pembinaName: pembinaName !== undefined ? pembinaName : db.ekskul[idx].pembinaName
      };
      saveDB(db);
      return new Response(JSON.stringify(db.ekskul[idx]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST /api/ekskul/grades/bulk
    if (path === '/api/ekskul/grades/bulk' && method === 'POST') {
      const grades = body?.grades || [];
      const db = getDB();
      if (!db.walikelas_notes) db.walikelas_notes = {};

      for (const item of grades) {
        const { studentId, ekskulId, name, type, usaha, proses, capaian, description, pembinaName, pembinaTeacherId, selected } = item;
        if (!studentId || !name) continue;

        if (!db.walikelas_notes[studentId]) {
          db.walikelas_notes[studentId] = {
            sakit: 0,
            izin: 0,
            alpa: 0,
            catatan: "",
            spiritualUsaha: "B",
            spiritualProses: "B",
            spiritualCapaian: "B",
            spiritualDeskripsi: "",
            sosialUsaha: "B",
            sosialProses: "B",
            sosialCapaian: "B",
            sosialDeskripsi: "",
            ekskul: []
          };
        }

        let currentEkskuls = Array.isArray(db.walikelas_notes[studentId].ekskul) ? db.walikelas_notes[studentId].ekskul : [];
        if (selected === false) {
          currentEkskuls = currentEkskuls.filter((e: any) => e.name !== name && e.ekskulId !== ekskulId);
        } else {
          const existIdx = currentEkskuls.findIndex((e: any) => e.name === name || (ekskulId && e.ekskulId === ekskulId));
          const newEkskulEntry = {
            ekskulId: ekskulId || "",
            name,
            type: type || "Pilihan",
            usaha: usaha || "B",
            proses: proses || "B",
            capaian: capaian || "B",
            predicate: capaian || "Baik",
            description: description || "",
            pembinaName: pembinaName || "",
            pembinaTeacherId: pembinaTeacherId || "",
            updatedAt: new Date().toISOString()
          };
          if (existIdx !== -1) {
            currentEkskuls[existIdx] = { ...currentEkskuls[existIdx], ...newEkskulEntry };
          } else {
            currentEkskuls.push(newEkskulEntry);
          }
        }
        db.walikelas_notes[studentId].ekskul = currentEkskuls;
      }

      saveDB(db);
      return new Response(JSON.stringify({ success: true, count: grades.length }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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

    // 8. HALAQOH & KEISLAMAN API
    if (path === '/api/halaqoh' && method === 'GET') {
      const db = getDB();
      return new Response(JSON.stringify(db.halaqoh || []), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (path === '/api/halaqoh' && method === 'POST') {
      const { name, mentorName, mentorTeacherId, studentIds } = body || {};
      if (!name || !name.trim()) {
        return new Response(JSON.stringify({ error: "Nama halaqoh wajib diisi." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const db = getDB();
      if (!Array.isArray(db.halaqoh)) db.halaqoh = [];
      const newHalaqoh = {
        id: "hlq_" + Date.now(),
        name: name.trim(),
        mentorName: mentorName.trim(),
        mentorTeacherId: mentorTeacherId || "",
        studentIds: Array.isArray(studentIds) ? studentIds : [],
        createdAt: new Date().toISOString()
      };
      db.halaqoh.push(newHalaqoh);
      saveDB(db);
      return new Response(JSON.stringify(newHalaqoh), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    if (path.startsWith('/api/halaqoh/') && method === 'PUT') {
      const id = path.split('/').pop();
      const { name, mentorName, mentorTeacherId, studentIds } = body || {};
      const db = getDB();
      if (!Array.isArray(db.halaqoh)) db.halaqoh = [];
      const index = db.halaqoh.findIndex((h: any) => h.id === id);
      if (index === -1) {
        return new Response(JSON.stringify({ error: "Data Halaqoh tidak ditemukan." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      db.halaqoh[index] = {
        ...db.halaqoh[index],
        name: name ? name.trim() : db.halaqoh[index].name,
        mentorName: mentorName ? mentorName.trim() : db.halaqoh[index].mentorName,
        mentorTeacherId: mentorTeacherId !== undefined ? mentorTeacherId : db.halaqoh[index].mentorTeacherId,
        studentIds: Array.isArray(studentIds) ? studentIds : db.halaqoh[index].studentIds,
        updatedAt: new Date().toISOString()
      };
      saveDB(db);
      return new Response(JSON.stringify(db.halaqoh[index]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (path.startsWith('/api/halaqoh/') && method === 'DELETE') {
      const id = path.split('/').pop();
      const db = getDB();
      if (!Array.isArray(db.halaqoh)) db.halaqoh = [];
      db.halaqoh = db.halaqoh.filter((h: any) => h.id !== id);
      saveDB(db);
      return new Response(JSON.stringify({ message: "Halaqoh berhasil dihapus." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 7. GET /api/summary
    if (path === '/api/summary' && method === 'GET') {
      const db = getDB();
      const subjectsList = [
        "PAI", "PPKN", "Bahasa Indonesia", "Matematika", "IPA", "IPS", "Bahasa Inggris", "PJOK", "Prakarya", "Informatika",
        "Bahasa Arab", "Tahsin ABaTaTsa", "Tahfizh Al-Qur’an", "Do’a Harian dan Hadits", "Wudhu dan Sholat"
      ];
      const totalStudents = db.students.length;
      const registeredStudentIds = new Set(db.students.map((s: any) => s.id));

      const subjectProgress = subjectsList.map(sub => {
        const filledGradesForSub = db.grades.filter((g: any) => g.subject === sub && registeredStudentIds.has(g.studentId));
        const completedCount = filledGradesForSub.length;
        const percentage = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;
        const teacher = db.teachers.find((t: any) => t.subject === sub);
        return {
          subject: sub,
          completed: completedCount,
          total: totalStudents,
          percent: percentage,
          teacherName: teacher ? teacher.name : "Belum Ditugaskan"
        };
      });

      const classSet = new Set(["7", "8", "9"]);
      db.students.forEach((s: any) => {
        const k = String(s.kelas || "").trim();
        if (k) classSet.add(k);
      });
      const classes = Array.from(classSet).sort();

      const classProgress = classes.map(cls => {
        const studentsInClass = db.students.filter((s: any) => String(s.kelas || "").trim() === cls);
        const totalGradesNeeded = studentsInClass.length * subjectsList.length;
        let gradesFilledCount = 0;
        const studentIds = new Set(studentsInClass.map((s: any) => s.id));
        db.grades.forEach((g: any) => {
          if (studentIds.has(g.studentId)) {
            gradesFilledCount++;
          }
        });
        const percent = totalGradesNeeded > 0 ? Math.round((gradesFilledCount / totalGradesNeeded) * 100) : 0;
        const waliKelas = db.teachers.find((t: any) => t.isWaliKelas && String(t.kelas || "").trim() === cls);
        return {
          kelas: cls,
          studentCount: studentsInClass.length,
          filledGrades: gradesFilledCount,
          totalNeeded: totalGradesNeeded,
          percent,
          waliKelasName: waliKelas ? waliKelas.name : "Belum Ditugaskan"
        };
      });

      // Calculate Student Rankings
      const studentRankings = db.students.map((s: any) => {
        const studentGrades = db.grades.filter((g: any) => g.studentId === s.id);
        const subjectScores: Record<string, number> = {};
        let totalScore = 0;
        let filledSubjectsCount = 0;

        studentGrades.forEach((g: any) => {
          const val = Number(g.score);
          if (!isNaN(val) && g.score !== null && g.score !== undefined && g.subject) {
            subjectScores[g.subject] = val;
            totalScore += val;
            filledSubjectsCount++;
          }
        });

        const averageScore =
          filledSubjectsCount > 0
            ? Math.round((totalScore / filledSubjectsCount) * 10) / 10
            : 0;

        let predikat = "C (Cukup)";
        if (filledSubjectsCount === 0) predikat = "Belum Ada Nilai";
        else if (averageScore > 91) predikat = "A (Sangat Baik)";
        else if (averageScore >= 80) predikat = "B (Baik)";
        else predikat = "C (Cukup)";

        return {
          studentId: s.id,
          name: s.name,
          nisn: s.nisn,
          kelas: String(s.kelas || "").trim(),
          totalScore,
          averageScore,
          filledSubjectsCount,
          totalSubjectsCount: subjectsList.length,
          rank: 0,
          rankInClass: 0,
          predikat,
          subjectScores,
        };
      });

      studentRankings.sort((a: any, b: any) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
        return a.name.localeCompare(b.name);
      });

      studentRankings.forEach((s: any, idx: number) => {
        s.rank = idx + 1;
      });

      const classCounters: Record<string, number> = {};
      studentRankings.forEach((s: any) => {
        const k = s.kelas;
        classCounters[k] = (classCounters[k] || 0) + 1;
        s.rankInClass = classCounters[k];
      });

      return new Response(JSON.stringify({
        totalStudents,
        totalTeachers: db.teachers.length,
        subjectProgress,
        classProgress,
        studentRankings,
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

  // Only use static local mock if strictly on a static host without a backend (github.io or file:)
  if (isStaticHost) {
    return localFetchInterception(input, init);
  }

  // Always use the real backend server so ALL devices are 100% synchronized!
  try {
    const res = await originalFetch(input, init);
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    
    // If the server returned HTML (e.g. index.html SPA fallback), or non-200 non-JSON, intercept immediately
    if (contentType.includes('text/html') || res.status === 404 || (!res.ok && !contentType.includes('json'))) {
      return localFetchInterception(input, init);
    }
    return res;
  } catch (error) {
    // Server down or offline -> fallback to client-side database
    console.warn("Server API offline, falling back to client-side database:", error);
    return localFetchInterception(input, init);
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

// Two-way synchronization for Halaqoh: ensure Cloud Firestore is always the master source of truth across all devices
async function syncHalaqohAcrossDevices() {
  try {
    // 1. If Firebase Firestore is configured, fetch live cloud halaqoh records
    if (isFirebaseConfigured) {
      const cloudHalaqoh = await firebaseApi.getHalaqoh();
      if (Array.isArray(cloudHalaqoh) && cloudHalaqoh.length > 0) {
        // Sync cloud data into localStorage so every device and browser has the exact same latest ustadz/ustadzah names
        const raw = localStorage.getItem('smart_sts_db');
        const localDb = raw ? JSON.parse(raw) : {};
        localDb.halaqoh = cloudHalaqoh;
        localStorage.setItem('smart_sts_db', JSON.stringify(localDb));
        if (clientDbCache) clientDbCache.halaqoh = cloudHalaqoh;
        return;
      }
    }

    // 2. If Firestore had 0 records yet, check if user had created halaqoh in their local storage and push it to Cloud/Server
    const raw = localStorage.getItem('smart_sts_db');
    if (!raw) return;
    const localDb = JSON.parse(raw);
    if (!localDb || !Array.isArray(localDb.halaqoh) || localDb.halaqoh.length === 0) return;

    if (isFirebaseConfigured) {
      for (const h of localDb.halaqoh) {
        if (!h || !h.id) continue;
        await firebaseApi.postHalaqoh(h).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("Sync halaqoh across devices error:", err);
  }
}
syncHalaqohAcrossDevices();

// Mount application
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

