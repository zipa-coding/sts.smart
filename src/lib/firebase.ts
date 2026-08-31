import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from "firebase/firestore";
import dbData from "../data/db.json";

const dbDataAny = dbData as any;
const metaEnv = (import.meta as any).env || {};

// Firebase configuration can be populated via Vite environment variables
// Or directly override here by pasting raw credentials
const firebaseConfig = {
  apiKey: "AIzaSyDHuaZ2ean-ZDP84bDC2lOZxVCEklLvD4o",
  authDomain: "smartsts-12f15.firebaseapp.com",
  projectId: "smartsts-12f15",
  storageBucket: "smartsts-12f15.firebasestorage.app",
  messagingSenderId: "400636927793",
  appId: "1:400636927793:web:52dc8ce6b88a8373085a10"
};

// Check if Firebase is configured with credentials
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.appId
);

let app;
let db: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    console.log("Firebase initialized successfully! Running with cloud database (Firestore) backend.");
    
    // Seed database if empty in the background
    seedFirestoreIfEmpty();
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

// Function to seed Firestore if empty (first run)
async function seedFirestoreIfEmpty() {
  try {
    const teachersRef = collection(db, "teachers");
    const snapshot = await getDocs(teachersRef);
    if (snapshot.empty) {
      console.log("Firestore is empty. Seeding templates from db.json...");
      
      // 1. Seed Teachers
      for (const t of dbDataAny.teachers) {
        await setDoc(doc(db, "teachers", t.id), t);
      }
      
      // 2. Seed Students
      for (const s of dbDataAny.students) {
        await setDoc(doc(db, "students", s.id), s);
      }
      
      // 3. Seed Grades
      for (const g of dbDataAny.grades) {
        const id = `${g.studentId}_${g.subject.replace(/[^a-zA-Z0-9]/g, "_")}`;
        await setDoc(doc(db, "grades", id), g);
      }
      
      // 4. Seed Wali Kelas Notes
      if (dbDataAny.walikelas_notes) {
        for (const [studentId, note] of Object.entries(dbDataAny.walikelas_notes)) {
          await setDoc(doc(db, "walikelas_notes", studentId), note as any);
        }
      }
      
      // 5. Seed TPs templates
      if (dbDataAny.tujuan_pembelajaran_templates) {
        for (const [subject, tps] of Object.entries(dbDataAny.tujuan_pembelajaran_templates)) {
          await setDoc(doc(db, "tujuan_pembelajaran_templates", subject), { tps });
        }
      }
      
      // 6. Seed Settings
      if (dbDataAny.settings) {
        await setDoc(doc(db, "settings", "app"), dbDataAny.settings);
      }
      
      // 7. Seed Ekskul
      const defaultEkskul = [
        { "id": "e1", "name": "Pramuka", "type": "Wajib" },
        { "id": "e2", "name": "Mentoring", "type": "Wajib" },
        { "id": "e3", "name": "Futsal", "type": "Pilihan" },
        { "id": "e4", "name": "Voli", "type": "Pilihan" },
        { "id": "e5", "name": "Panahan", "type": "Pilihan" },
        { "id": "e6", "name": "Study Club", "type": "Pilihan" }
      ];
      for (const e of defaultEkskul) {
        await setDoc(doc(db, "ekskul", e.id), e);
      }
      
      console.log("Firestore successfully seeded with default data!");
    }
  } catch (error) {
    console.warn("Failed background seeding:", error);
  }
}

// Firestore operations matching API routes
export const firebaseApi = {
  // 1. POST /api/login
  login: async (body: any) => {
    const { username, password } = body || {};
    const q = query(collection(db, "teachers"), where("username", "==", username));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    let loggedInUser: any = null;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.password === password) {
        loggedInUser = { id: docSnap.id, ...data };
      }
    });
    return loggedInUser;
  },

  // 2. GET & POST /api/teachers
  getTeachers: async (): Promise<any[]> => {
    const snap = await getDocs(collection(db, "teachers"));
    return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  },
  postTeacher: async (body: any) => {
    const { name, username, password, subject, isWaliKelas, kelas } = body;
    // Check duplication
    const q = query(collection(db, "teachers"), where("username", "==", username));
    const dup = await getDocs(q);
    if (!dup.empty) throw new Error("Username sudah digunakan.");

    const id = "t_" + Date.now();
    const newTeacher = { id, name, username, password, subject, isWaliKelas: !!isWaliKelas, kelas: kelas || "" };
    await setDoc(doc(db, "teachers", id), newTeacher);
    return newTeacher;
  },
  putTeacher: async (id: string, body: any) => {
    const { name, username, password, subject, isWaliKelas, kelas } = body;
    const ref = doc(db, "teachers", id);
    const updated = { name, username, password, subject, isWaliKelas: !!isWaliKelas, kelas: kelas || "" };
    await updateDoc(ref, updated);
    return { id, ...updated };
  },
  deleteTeacher: async (id: string) => {
    if (id === 't1') throw new Error("Akun Super Admin utama tidak boleh dihapus.");
    await deleteDoc(doc(db, "teachers", id));
    return { message: "Guru berhasil dihapus." };
  },

  // 3. GET, POST, PUT, DELETE /api/students
  getStudents: async (): Promise<any[]> => {
    const snap = await getDocs(collection(db, "students"));
    return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  },
  postStudent: async (body: any) => {
    const { name, nisn, kelas } = body;
    const q = query(collection(db, "students"), where("nisn", "==", nisn));
    const dup = await getDocs(q);
    if (!dup.empty) throw new Error("Siswa dengan NISN ini sudah terdaftar.");

    const id = "s_" + Date.now();
    const newStudent = { id, nisn, name, kelas };
    await setDoc(doc(db, "students", id), newStudent);
    return newStudent;
  },
  putStudent: async (id: string, body: any) => {
    const { name, nisn, kelas } = body;
    const ref = doc(db, "students", id);
    const updated = { name, nisn, kelas };
    await updateDoc(ref, updated);
    return { id, ...updated };
  },
  deleteStudent: async (id: string) => {
    // Delete student doc
    await deleteDoc(doc(db, "students", id));
    
    // Clean up grades
    const gradesSnap = await getDocs(collection(db, "grades"));
    for (const gDoc of gradesSnap.docs) {
      if (gDoc.data().studentId === id) {
        await deleteDoc(doc(db, "grades", gDoc.id));
      }
    }
    
    // Clean up notes
    await deleteDoc(doc(db, "walikelas_notes", id));
    return { message: "Siswa berhasil dihapus." };
  },

  // 4. GET & POST /api/grades
  getGrades: async (): Promise<any[]> => {
    const snap = await getDocs(collection(db, "grades"));
    return snap.docs.map(docSnap => docSnap.data());
  },
  postGrade: async (body: any) => {
    const { studentId, subject, score, tps, teacherName, usaha, proses, capaian, deskripsi } = body;
    const cleanSub = subject.replace(/[^a-zA-Z0-9]/g, "_");
    const docId = `${studentId}_${cleanSub}`;
    
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
    
    await setDoc(doc(db, "grades", docId), updatedGrade);
    return updatedGrade;
  },

  // 5. GET & POST /api/walikelas/notes
  getWaliKelasNotes: async () => {
    const snap = await getDocs(collection(db, "walikelas_notes"));
    const notes: any = {};
    snap.docs.forEach(docSnap => {
      notes[docSnap.id] = docSnap.data();
    });
    return notes;
  },
  postWaliKelasNotes: async (body: any) => {
    const { studentId, sakit, izin, alpa, catatan, spiritualUsaha, spiritualProses, spiritualCapaian, spiritualDeskripsi, sosialUsaha, sosialProses, sosialCapaian, sosialDeskripsi, ekskul } = body;
    const note = {
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
    await setDoc(doc(db, "walikelas_notes", studentId), note);
    return { studentId, ...note };
  },

  // 6. GET, POST, DELETE /api/tps
  getTPs: async () => {
    const snap = await getDocs(collection(db, "tujuan_pembelajaran_templates"));
    const templates: any = {};
    snap.docs.forEach(docSnap => {
      templates[docSnap.id] = docSnap.data().tps || [];
    });
    return templates;
  },
  postTP: async (body: any) => {
    const { subject, tpText } = body;
    const ref = doc(db, "tujuan_pembelajaran_templates", subject);
    const docSnap = await getDoc(ref);
    let tpsList = [];
    if (docSnap.exists()) {
      tpsList = docSnap.data().tps || [];
    }
    const newTP = { id: "tp_" + Date.now(), text: tpText };
    tpsList.push(newTP);
    await setDoc(ref, { tps: tpsList });
    return newTP;
  },
  deleteTP: async (subject: string, tpId: string) => {
    const ref = doc(db, "tujuan_pembelajaran_templates", subject);
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) throw new Error("TP tidak ditemukan.");
    const tpsList = docSnap.data().tps || [];
    const filtered = tpsList.filter((tp: any) => tp.id !== tpId);
    await setDoc(ref, { tps: filtered });
    return { message: "TP berhasil dihapus." };
  },

  // 7. GET & POST /api/settings
  getSettings: async () => {
    const ref = doc(db, "settings", "app");
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.format && !data.format.tanggalRaport) {
        data.format.tanggalRaport = "17 Juni 2026";
      }
      return data;
    }
    return {
      principalName: "Ustadz H. Ir. Abdul Muhyi, M.Pd",
      principalNip: "19780512 200501 1 002",
      format: {
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
      }
    };
  },
  postSettings: async (body: any) => {
    const { principalName, principalNip, format } = body;
    const settingsData = {
      principalName: principalName || "Ustadz H. Ir. Abdul Muhyi, M.Pd",
      principalNip: principalNip || "19780512 200501 1 002",
      format: format ? {
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
      } : {}
    };
    await setDoc(doc(db, "settings", "app"), settingsData);
    return { success: true, settings: settingsData };
  },

  // 8. GET /api/summary
  getSummary: async () => {
    // Aggregation logic
    const students = await firebaseApi.getStudents() as any[];
    const teachers = await firebaseApi.getTeachers() as any[];
    const grades = await firebaseApi.getGrades() as any[];
    
    const subjectsList = [
      "PAI", "PPKN", "Bahasa Indonesia", "Matematika", "IPA", "IPS", "Bahasa Inggris", "PJOK", "Prakarya", "Informatika",
      "Bahasa Arab", "Tahsin ABaTaTsa", "Tahfizh Al-Qur’an", "Do’a Harian dan Hadits", "Wudhu dan Sholat"
    ];
    const totalStudents = students.length;
    
    const subjectProgress = subjectsList.map(sub => {
      const filledGradesForSub = grades.filter((g: any) => g.subject === sub);
      const completedCount = filledGradesForSub.length;
      const percentage = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;
      const t = teachers.find((teach: any) => teach.subject === sub);
      return {
        subject: sub,
        completed: completedCount,
        total: totalStudents,
        percent: percentage,
        teacherName: t ? t.name : "Belum Ditugaskan"
      };
    });

    const classes = Array.from(new Set(students.map((s: any) => s.kelas))) as string[];
    const classProgress = classes.map(cls => {
      const studentsInClass = students.filter((s: any) => s.kelas === cls);
      const totalGradesNeeded = studentsInClass.length * subjectsList.length;
      let gradesFilledCount = 0;
      const studentIds = studentsInClass.map((s: any) => s.id);
      grades.forEach((g: any) => {
        if (studentIds.includes(g.studentId)) {
          gradesFilledCount++;
        }
      });
      const percent = totalGradesNeeded > 0 ? Math.round((gradesFilledCount / totalGradesNeeded) * 100) : 0;
      const waliKelas = teachers.find((teach: any) => teach.isWaliKelas && teach.kelas === cls);
      return {
        kelas: cls,
        studentCount: studentsInClass.length,
        filledGrades: gradesFilledCount,
        totalNeeded: totalGradesNeeded,
        percent,
        waliKelasName: waliKelas ? waliKelas.name : "Belum Ditugaskan"
      };
    });

    return {
      totalStudents,
      totalTeachers: teachers.length,
      subjectProgress,
      classProgress,
      lastUpdate: new Date().toISOString()
    };
  },

  // 9. GET, POST, DELETE /api/ekskul
  getEkskul: async (): Promise<any[]> => {
    const snap = await getDocs(collection(db, "ekskul"));
    if (snap.empty) {
      return [
        { "id": "e1", "name": "Pramuka", "type": "Wajib" },
        { "id": "e2", "name": "Mentoring", "type": "Wajib" },
        { "id": "e3", "name": "Futsal", "type": "Pilihan" },
        { "id": "e4", "name": "Voli", "type": "Pilihan" },
        { "id": "e5", "name": "Panahan", "type": "Pilihan" },
        { "id": "e6", "name": "Study Club", "type": "Pilihan" }
      ];
    }
    return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  },
  postEkskul: async (body: any) => {
    const { name, type } = body;
    const id = "e_" + Date.now();
    const newE = { id, name, type };
    await setDoc(doc(db, "ekskul", id), newE);
    return newE;
  },
  deleteEkskul: async (id: string) => {
    await deleteDoc(doc(db, "ekskul", id));
    return { message: "Ekskul deleted" };
  }
};
export { db as default };
