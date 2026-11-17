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
import { tentukanPredikat, tentukanPredikatLabel } from "./predikat";
import { mergeDeskripsiAman } from "./gradeMerge";

const metaEnv = (import.meta as any).env || {};

// Firebase configuration with smartsts-12f15
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyDHuaZ2ean-ZDP84bDC2lOZxVCEklLvD4o",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "smartsts-12f15.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "smartsts-12f15",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "smartsts-12f15.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "400636927793",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:400636927793:web:52dc8ce6b88a8373085a10",
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || "G-3YM825SY0M"
};

// Check if Firebase is genuinely configured with credentials
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.appId
);

let app: any = null;
let db: any = null;

// Timeout helper with 15s default
export function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.")), ms)
    ),
  ]);
}

// Timeout + 1 retry helper (15 seconds per attempt, 1 retry)
export async function withRetryAndTimeout<T>(
  operation: () => Promise<T>,
  ms = 15000,
  retries = 1
): Promise<T> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(operation(), ms);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.");
}

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    console.log("Firebase initialized successfully with cloud Firestore.");
  } catch (error) {
    console.warn("Firebase initialization skipped or failed:", error);
  }
}

// Firestore operations matching API routes
export const firebaseApi = {
  // 1. POST /api/login
  login: async (body: any) => {
    if (!db) throw new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.");
    const { username, password } = body || {};
    if (!username) return null;

    const trimmedUser = String(username).trim();

    const q = query(collection(db, "teachers"), where("username", "==", trimmedUser));
    const snapshot = await withRetryAndTimeout(() => getDocs(q), 15000, 1);
    if (snapshot && !snapshot.empty) {
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.password === password || (!data.password && password === "123")) {
          return {
            ...data,
            id: docSnap.id,
            name: data.name || data.nama || data.namaGuru || data.nama_lengkap || "Guru",
            username: data.username || data.user || trimmedUser,
            password: data.password || password,
            subject: data.subject || data.mapel || data.mataPelajaran || data.mata_pelajaran || "Guru",
            isWaliKelas: !!(data.isWaliKelas || data.waliKelas || data.is_wali_kelas || data.isWali),
            kelas: data.kelas || data.rombel || data.class || "",
          };
        }
      }
    }

    const docDirect = await withRetryAndTimeout(() => getDoc(doc(db, "teachers", trimmedUser)), 15000, 1);
    if (docDirect && docDirect.exists()) {
      const data = docDirect.data();
      if (data.password === password || (!data.password && password === "123")) {
        return {
          ...data,
          id: docDirect.id,
          name: data.name || data.nama || data.namaGuru || data.nama_lengkap || "Guru",
          username: data.username || data.user || trimmedUser,
          password: data.password || password,
          subject: data.subject || data.mapel || data.mataPelajaran || data.mata_pelajaran || "Guru",
          isWaliKelas: !!(data.isWaliKelas || data.waliKelas || data.is_wali_kelas || data.isWali),
          kelas: data.kelas || data.rombel || data.class || "",
        };
      }
    }

    if (trimmedUser === "admin" && password === "123") {
      return {
        id: "t1",
        name: "Admin",
        username: "admin",
        password: "123",
        subject: "Admin",
        isWaliKelas: false,
        kelas: ""
      };
    }

    return null;
  },

  // 2. GET & POST /api/teachers
  getTeachers: async (): Promise<any[]> => {
    if (!db) throw new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.");
    const snap = await withRetryAndTimeout(() => getDocs(collection(db, "teachers")), 15000, 1);
    return snap.docs.map(docSnap => {
      const d = docSnap.data();
      return {
        ...d,
        id: docSnap.id,
        name: d.name || d.nama || d.namaGuru || d.nama_lengkap || d.namaLengkap || d.fullname || "Guru",
        username: d.username || d.user || d.email || docSnap.id,
        password: d.password || d.pass || "123",
        subject: d.subject || d.mapel || d.mataPelajaran || d.mata_pelajaran || "Guru",
        isWaliKelas: !!(d.isWaliKelas || d.waliKelas || d.is_wali_kelas || d.isWali),
        kelas: d.kelas || d.rombel || d.class || "",
        isPembinaEkskul: !!(d.isPembinaEkskul || d.is_pembina_ekskul),
        pembinaEkskulId: d.pembinaEkskulId || "",
        pembinaEkskulName: d.pembinaEkskulName || "",
      };
    });
  },
  postTeacher: async (body: any) => {
    if (!db) throw new Error("Database not connected");
    const { name, username, password, subject, isWaliKelas, kelas, isPembinaEkskul, pembinaEkskulId, pembinaEkskulName } = body;
    const q = query(collection(db, "teachers"), where("username", "==", username));
    const dup = await withRetryAndTimeout(() => getDocs(q), 15000, 1);
    if (!dup.empty) throw new Error("Username sudah digunakan.");

    const id = "t_" + Date.now();
    const newTeacher = {
      id,
      name,
      username,
      password,
      subject,
      isWaliKelas: !!isWaliKelas,
      kelas: kelas || "",
      isPembinaEkskul: !!isPembinaEkskul,
      pembinaEkskulId: pembinaEkskulId || "",
      pembinaEkskulName: pembinaEkskulName || ""
    };
    await withRetryAndTimeout(() => setDoc(doc(db, "teachers", id), newTeacher), 15000, 1);
    return newTeacher;
  },
  putTeacher: async (id: string, body: any) => {
    if (!db) throw new Error("Database not connected");
    const { name, username, password, subject, isWaliKelas, kelas, isPembinaEkskul, pembinaEkskulId, pembinaEkskulName } = body;
    const ref = doc(db, "teachers", id);
    const updated = {
      name,
      username,
      password,
      subject,
      isWaliKelas: !!isWaliKelas,
      kelas: kelas || "",
      isPembinaEkskul: !!isPembinaEkskul,
      pembinaEkskulId: pembinaEkskulId || "",
      pembinaEkskulName: pembinaEkskulName || ""
    };
    await withRetryAndTimeout(() => updateDoc(ref, updated), 15000, 1);
    return { id, ...updated };
  },
  deleteTeacher: async (id: string) => {
    if (!db) throw new Error("Database not connected");
    if (id === 't1') throw new Error("Akun Super Admin utama tidak boleh dihapus.");
    await withRetryAndTimeout(() => deleteDoc(doc(db, "teachers", id)), 15000, 1);
    return { message: "Guru berhasil dihapus." };
  },
  deleteTeachersBulk: async (ids: string[]) => {
    if (!db) throw new Error("Database not connected");
    const validIds = ids.filter(id => id && id !== 't1');
    let deletedCount = 0;
    for (const id of validIds) {
      await withRetryAndTimeout(() => deleteDoc(doc(db, "teachers", id)), 15000, 1);
      deletedCount++;
    }
    return { success: true, deletedCount, message: `Berhasil menghapus ${deletedCount} guru.` };
  },

  // 3. GET, POST, PUT, DELETE /api/students
  // Hanya membaca dari koleksi "students", menempatkan ...d sebelum id: docSnap.id, timeout 15s + 1 retry, dan melempar error jika gagal
  getStudents: async (): Promise<any[]> => {
    if (!db) {
      throw new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.");
    }

    const sortList = (list: any[]) =>
      [...list].sort((a: any, b: any) => {
        if (a.kelas && b.kelas && String(a.kelas).trim() !== String(b.kelas).trim()) {
          return String(a.kelas).localeCompare(String(b.kelas), "id", { numeric: true });
        }
        return String(a.name || "").localeCompare(String(b.name || ""), "id", { sensitivity: "base" });
      });

    const snap = await withRetryAndTimeout(() => getDocs(collection(db, "students")), 15000, 1);
    const mapped = snap.docs.map(docSnap => {
      const d = docSnap.data();
      return {
        ...d,
        id: docSnap.id,
        name: d.name || d.nama || d.namaSiswa || d.nama_lengkap || d.namaLengkap || d.fullname || "Siswa",
        nisn: d.nisn || d.nis || d.nisnSiswa || d.nis_nisn || d.no_induk || docSnap.id,
        kelas: String(d.kelas || d.rombel || d.class || d.tingkat || "7").trim(),
      };
    });
    return sortList(mapped);
  },
  postStudent: async (body: any) => {
    if (!db) throw new Error("Database not connected");
    const { name, nisn, kelas } = body;
    const cleanNisn = String(nisn || "").trim().replace(/\D/g, "");
    const q = query(collection(db, "students"), where("nisn", "==", cleanNisn));
    const dup = await withRetryAndTimeout(() => getDocs(q), 15000, 1);
    if (!dup.empty) throw new Error("Siswa dengan NISN ini sudah terdaftar.");

    const id = "s_" + Date.now();
    const newStudent = { id, nisn: cleanNisn, name: String(name || "").trim(), kelas: String(kelas || "7").trim() };
    await withRetryAndTimeout(() => setDoc(doc(db, "students", id), newStudent), 15000, 1);
    return newStudent;
  },
  postStudentsBatch: async (studentsList: any[]): Promise<any> => {
    if (!db) throw new Error("Database not connected");
    const existing = await firebaseApi.getStudents();
    const existingNisns = new Set(existing.map((s: any) => String(s.nisn || "").trim()));
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
      await withRetryAndTimeout(() => setDoc(doc(db, "students", id), newStudent), 15000, 1);
      addedStudents.push(newStudent);
    }

    return {
      success: true,
      addedCount: addedStudents.length,
      duplicatesCount: duplicates.length,
      duplicates,
      errors,
      students: addedStudents,
      totalStudents: existing.length + addedStudents.length,
    };
  },
  putStudentsBulk: async (updatesList: any[]): Promise<any> => {
    if (!db) throw new Error("Database not connected");
    const existing = await firebaseApi.getStudents();
    let updatedCount = 0;
    const notFound: string[] = [];
    const errors: string[] = [];
    const updatedStudents: any[] = [];

    for (const item of updatesList) {
      const { id, currentNisn, currentName, name, nisn, kelas } = item;

      let targetStudent = null;
      if (id) {
        targetStudent = existing.find((s: any) => s.id === id);
      }
      if (!targetStudent && currentNisn) {
        const cleanCurrNisn = String(currentNisn).trim().replace(/\D/g, "");
        targetStudent = existing.find(
          (s: any) => String(s.nisn).trim().replace(/\D/g, "") === cleanCurrNisn
        );
      }
      if (!targetStudent && nisn) {
        const cleanNisn = String(nisn).trim().replace(/\D/g, "");
        targetStudent = existing.find(
          (s: any) => String(s.nisn).trim().replace(/\D/g, "") === cleanNisn
        );
      }
      if (!targetStudent && currentName) {
        const cleanCurrName = String(currentName).trim().toLowerCase();
        targetStudent = existing.find(
          (s: any) => String(s.name).trim().toLowerCase() === cleanCurrName
        );
      }
      if (!targetStudent && name) {
        const cleanName = String(name).trim().toLowerCase();
        targetStudent = existing.find(
          (s: any) => String(s.name).trim().toLowerCase() === cleanName
        );
      }

      if (!targetStudent) {
        notFound.push(name || currentName || nisn || currentNisn || "Siswa");
        continue;
      }

      const newNisn = nisn !== undefined ? String(nisn).trim().replace(/\D/g, "") : targetStudent.nisn;
      const newName = name !== undefined && String(name).trim() ? String(name).trim() : targetStudent.name;
      const newKelas = kelas !== undefined && String(kelas).trim() ? String(kelas).trim() : targetStudent.kelas;

      if (newNisn && newNisn !== targetStudent.nisn) {
        const existsAnother = existing.some(
          (s: any) => s.id !== targetStudent.id && String(s.nisn).trim() === newNisn
        );
        if (existsAnother) {
          errors.push(`Siswa "${targetStudent.name}": NISN ${newNisn} sudah digunakan oleh siswa lain.`);
          continue;
        }
      }

      const updatedData = {
        name: newName,
        nisn: newNisn || targetStudent.nisn,
        kelas: newKelas,
      };

      try {
        await withRetryAndTimeout(() => updateDoc(doc(db, "students", targetStudent.id), updatedData), 15000, 1);
        updatedCount++;
        updatedStudents.push({ ...targetStudent, ...updatedData });
      } catch (err: any) {
        console.warn(`Failed to update student doc ${targetStudent.id}:`, err);
        errors.push(`Gagal memperbarui ${targetStudent.name}: ${err.message}`);
      }
    }

    return {
      success: true,
      updatedCount,
      notFoundCount: notFound.length,
      notFound,
      errors,
      students: updatedStudents,
      totalStudents: existing.length,
    };
  },
  putStudent: async (id: string, body: any) => {
    if (!db) throw new Error("Database not connected");
    const { name, nisn, kelas } = body;
    const ref = doc(db, "students", id);
    const updated = { name, nisn, kelas };
    await withRetryAndTimeout(() => updateDoc(ref, updated), 15000, 1);
    return { id, ...updated };
  },
  deleteStudent: async (id: string) => {
    if (!db) throw new Error("Database not connected");
    await withRetryAndTimeout(() => deleteDoc(doc(db, "students", id)), 15000, 1);
    
    const gradesSnap = await withRetryAndTimeout(() => getDocs(collection(db, "grades")), 15000, 1);
    for (const gDoc of gradesSnap.docs) {
      if (gDoc.data().studentId === id) {
        await deleteDoc(doc(db, "grades", gDoc.id));
      }
    }
    
    await deleteDoc(doc(db, "walikelas_notes", id)).catch(() => {});
    return { message: "Siswa berhasil dihapus." };
  },
  deleteStudentsBulk: async (ids: string[]) => {
    if (!db) throw new Error("Database not connected");
    const validIds = new Set(ids.filter(Boolean));
    let deletedCount = 0;
    
    for (const id of validIds) {
      await withRetryAndTimeout(() => deleteDoc(doc(db, "students", id)), 15000, 1);
      await deleteDoc(doc(db, "walikelas_notes", id)).catch(() => {});
      deletedCount++;
    }

    const gradesSnap = await withRetryAndTimeout(() => getDocs(collection(db, "grades")), 15000, 1);
    for (const gDoc of gradesSnap.docs) {
      if (validIds.has(gDoc.data().studentId)) {
        await deleteDoc(doc(db, "grades", gDoc.id)).catch(() => {});
      }
    }

    return { success: true, deletedCount, message: `Berhasil menghapus ${deletedCount} siswa.` };
  },

  // 4. GET & POST /api/grades
  // Hanya membaca dari koleksi "grades", timeout 15s + 1 retry, dan melempar error jika gagal
  getGrades: async (): Promise<any[]> => {
    if (!db) {
      throw new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.");
    }
    const snap = await withRetryAndTimeout(() => getDocs(collection(db, "grades")), 15000, 1);
    return snap.docs.map(docSnap => ({
      ...docSnap.data(),
      _docId: docSnap.id,
    }));
  },
  postGrade: async (body: any) => {
    if (!db) throw new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.");
    const {
      studentId,
      subject,
      score,
      tps,
      teacherName,
      usaha,
      proses,
      capaian,
      deskripsi,
      izinKosongkanDeskripsi,
    } = body || {};
    const cleanStudentId = String(studentId || "").trim();
    if (!cleanStudentId) {
      throw new Error("ID Siswa tidak boleh kosong.");
    }
    if (!subject || !String(subject).trim()) {
      throw new Error("Mata pelajaran tidak boleh kosong.");
    }

    // Validasi bahwa studentId benar-benar ada di koleksi "students"
    const studentRef = doc(db, "students", cleanStudentId);
    const studentSnap = await withRetryAndTimeout(() => getDoc(studentRef), 15000, 1);
    if (!studentSnap.exists()) {
      throw new Error(`Siswa dengan ID "${cleanStudentId}" tidak ditemukan di koleksi students. Penyimpanan nilai ditolak.`);
    }

    const studentData = studentSnap.data() || {};
    const snapshotStudentName = String(
      studentData.name || studentData.nama || studentData.namaSiswa || studentData.nama_lengkap || ""
    ).trim();
    const snapshotKelas = String(
      studentData.kelas || studentData.rombel || studentData.class || studentData.tingkat || ""
    ).trim();

    // Rumus ID dokumen grades TIDAK boleh diubah: studentId + "_" + nama mapel (karakter non-alfanumerik diganti "_")
    const cleanSub = subject.replace(/[^a-zA-Z0-9]/g, "_");
    const docId = `${cleanStudentId}_${cleanSub}`;
    const gradeRef = doc(db, "grades", docId);

    // Ambil dokumen lama terlebih dahulu untuk menjaga deskripsi dan tps yang sudah ada
    const existingSnap = await withRetryAndTimeout(() => getDoc(gradeRef), 15000, 1);
    const existingData = existingSnap.exists() ? existingSnap.data() || {} : {};
    const deskripsiLama: string | undefined =
      typeof existingData.deskripsi === "string"
        ? existingData.deskripsi
        : typeof existingData.description === "string"
        ? existingData.description
        : undefined;

    const deskripsiBaru: string | undefined =
      deskripsi !== undefined && deskripsi !== null ? String(deskripsi) : undefined;
    const izinKosongkan = izinKosongkanDeskripsi === true;
    const finalDeskripsi = mergeDeskripsiAman(deskripsiLama, deskripsiBaru, izinKosongkan);

    const numericScore = Number(score);
    const derivedPredikat = tentukanPredikat(numericScore);

    const updatedGrade: Record<string, any> = {
      studentId: cleanStudentId,
      studentName: snapshotStudentName,
      kelas: snapshotKelas,
      subject,
      score: numericScore,
      usaha: usaha || existingData.usaha || derivedPredikat || "B",
      proses: proses || existingData.proses || derivedPredikat || "B",
      capaian: capaian || existingData.capaian || derivedPredikat || "B",
      deskripsi: finalDeskripsi,
      lastUpdatedBy: teacherName || "Guru Mata Pelajaran",
      lastUpdatedAt: new Date().toISOString(),
    };

    if (izinKosongkan && finalDeskripsi.trim() === "") {
      updatedGrade.deskripsi = "";
      updatedGrade.deskripsiDikosongkan = true;
    } else if (finalDeskripsi.trim() !== "") {
      updatedGrade.deskripsiDikosongkan = false;
    }

    if (derivedPredikat !== null) {
      updatedGrade.predikat = derivedPredikat;
    }

    // Jika body.tps undefined, jangan timpa tps lama
    if (tps !== undefined) {
      updatedGrade.tps = tps;
    }

    await withRetryAndTimeout(
      () => setDoc(gradeRef, updatedGrade, { merge: true }),
      15000,
      1
    );
    return {
      ...existingData,
      ...updatedGrade,
    };
  },

  // 5. GET & POST /api/walikelas/notes
  getWaliKelasNotes: async () => {
    if (!db) {
      throw new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.");
    }

    const [snap, ekskulBackupSnap, studentsList] = await Promise.all([
      withRetryAndTimeout(() => getDocs(collection(db, "walikelas_notes")), 15000, 1),
      withRetryAndTimeout(() => getDoc(doc(db, "settings", "ekskul_grades")), 15000, 1).catch(() => null),
      firebaseApi.getStudents(),
    ]);

    const studentMap = new Map<string, any>();
    if (Array.isArray(studentsList)) {
      studentsList.forEach((s: any) => {
        if (s && s.id) studentMap.set(String(s.id).trim(), s);
      });
    }

    // Filter ekskul items to strictly this studentId WITHOUT auto-rewriting description text
    const filterStudentEkskuls = (rawList: any[], targetStudentId: string): any[] => {
      if (!Array.isArray(rawList)) return [];
      const cleanSid = String(targetStudentId).trim();
      const targetStudent = studentMap.get(cleanSid);
      const targetName = targetStudent?.name ? String(targetStudent.name).trim() : "";

      return rawList
        .filter((item: any) => {
          if (!item || !item.name) return false;
          if (item.studentId && String(item.studentId).trim() !== "" && String(item.studentId).trim() !== cleanSid) {
            return false;
          }
          return true;
        })
        .map((item: any) => ({
          ...item,
          studentId: cleanSid,
          studentName: targetName || item.studentName || "",
          description: String(item.description || item.deskripsi || "").trim(),
        }));
    };

    const notes: Record<string, any> = {};
    if (snap && !snap.empty) {
      snap.docs.forEach(docSnap => {
        const sid = String(docSnap.id).trim();
        const data = docSnap.data() || {};
        const cloudEkskul = Array.isArray(data.ekskul) ? data.ekskul : [];
        notes[sid] = {
          ...data,
          studentId: sid,
          ekskul: filterStudentEkskuls(cloudEkskul, sid),
        };
      });
    }

    if (ekskulBackupSnap && ekskulBackupSnap.exists()) {
      const backupMap = ekskulBackupSnap.data()?.map;
      if (backupMap && typeof backupMap === "object") {
        for (const [sid, backupEkskulList] of Object.entries(backupMap)) {
          const cleanSid = String(sid).trim();
          if (!Array.isArray(backupEkskulList)) continue;
          const filteredBackup = filterStudentEkskuls(backupEkskulList, cleanSid);
          if (!notes[cleanSid]) {
            notes[cleanSid] = {
              studentId: cleanSid,
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
              ekskul: filteredBackup,
            };
          } else {
            const currentEkskuls: any[] = Array.isArray(notes[cleanSid].ekskul) ? [...notes[cleanSid].ekskul] : [];
            if (currentEkskuls.length === 0 && filteredBackup.length > 0) {
              notes[cleanSid].ekskul = filteredBackup;
            } else if (filteredBackup.length > 0) {
              for (const bItem of filteredBackup) {
                const idx = currentEkskuls.findIndex(
                  (e: any) =>
                    (bItem.ekskulId && e.ekskulId === bItem.ekskulId) ||
                    (e.name && bItem.name && String(e.name).toLowerCase() === String(bItem.name).toLowerCase())
                );
                if (idx === -1) {
                  currentEkskuls.push(bItem);
                } else if (bItem.updatedAt && (!currentEkskuls[idx].updatedAt || bItem.updatedAt > currentEkskuls[idx].updatedAt)) {
                  currentEkskuls[idx] = bItem;
                }
              }
              notes[cleanSid].ekskul = filterStudentEkskuls(currentEkskuls, cleanSid);
            }
          }
        }
      }
    }

    return notes;
  },
  postWaliKelasNotes: async (body: any) => {
    if (!db) throw new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.");
    const { studentId, sakit, izin, alpa, catatan, spiritualUsaha, spiritualProses, spiritualCapaian, spiritualDeskripsi, sosialUsaha, sosialProses, sosialCapaian, sosialDeskripsi, ekskul, updatedAt, lastUpdatedBy, waliKelasName } = body;
    if (!studentId) throw new Error("ID Siswa wajib diisi.");
    const cleanStudentId = String(studentId).trim();

    let preservedEkskul: any[] = Array.isArray(ekskul) ? ekskul : [];

    const existingSnap = await withRetryAndTimeout(() => getDoc(doc(db, "walikelas_notes", cleanStudentId)), 15000, 1);
    if (existingSnap && existingSnap.exists()) {
      const cloudEkskul = existingSnap.data()?.ekskul;
      if (Array.isArray(cloudEkskul) && cloudEkskul.length > 0) {
        if (preservedEkskul.length === 0 || cloudEkskul.length >= preservedEkskul.length) {
          preservedEkskul = cloudEkskul;
        }
      }
    }

    preservedEkskul = preservedEkskul
      .filter((item: any) => item && item.name && (!item.studentId || String(item.studentId).trim() === cleanStudentId))
      .map((item: any) => ({ ...item, studentId: cleanStudentId }));

    const note = {
      studentId: cleanStudentId,
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
      ekskul: preservedEkskul,
      lastUpdatedBy: lastUpdatedBy || waliKelasName || "Wali Kelas",
      updatedAt: updatedAt || new Date().toISOString()
    };

    await withRetryAndTimeout(() => setDoc(doc(db, "walikelas_notes", cleanStudentId), note, { merge: true }), 15000, 1);
    return note;
  },

  // 6. GET, POST, PUT, DELETE /api/tps
  getTPs: async (kelas?: string) => {
    if (!db) {
      throw new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.");
    }
    const snap = await withRetryAndTimeout(() => getDocs(collection(db, "tujuan_pembelajaran_templates")), 15000, 1);
    const templates: Record<string, any[]> = {};
    snap.docs.forEach(docSnap => {
      let tpsList = docSnap.data().tps || [];
      if (kelas) {
        tpsList = tpsList.filter((item: any) => String(item.kelas || '').trim() === String(kelas).trim());
      }
      templates[docSnap.id] = tpsList;
    });
    return templates;
  },

  postTP: async (body: any) => {
    if (!db) throw new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.");
    const { subject, tpText, kelas } = body;
    const ref = doc(db, "tujuan_pembelajaran_templates", subject);
    const docSnap = await withRetryAndTimeout(() => getDoc(ref), 15000, 1);
    let tpsList: any[] = [];
    if (docSnap && docSnap.exists()) {
      tpsList = docSnap.data().tps || [];
    }
    const newTP = { id: "tp_" + Date.now(), text: tpText, kelas: kelas ? String(kelas).trim() : "7" };
    tpsList.push(newTP);
    await withRetryAndTimeout(() => setDoc(ref, { tps: tpsList }), 15000, 1);
    return newTP;
  },

  putTP: async (subject: string, tpId: string, body: any) => {
    if (!db) throw new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.");
    const { tpText, kelas } = body || {};
    const ref = doc(db, "tujuan_pembelajaran_templates", subject);
    const docSnap = await withRetryAndTimeout(() => getDoc(ref), 15000, 1);
    let tpsList: any[] = [];
    if (docSnap && docSnap.exists()) {
      tpsList = docSnap.data().tps || [];
    }
    const cleanTpId = String(tpId).trim();
    const index = tpsList.findIndex((tp: any) => String(tp.id).trim() === cleanTpId);
    if (index !== -1) {
      tpsList[index] = {
        ...tpsList[index],
        text: tpText,
        ...(kelas ? { kelas: String(kelas).trim() } : {}),
      };
    } else {
      tpsList.push({
        id: cleanTpId,
        text: tpText,
        kelas: kelas ? String(kelas).trim() : "7",
      });
    }
    await withRetryAndTimeout(() => setDoc(ref, { tps: tpsList }), 15000, 1);
    return tpsList[index !== -1 ? index : tpsList.length - 1];
  },

  deleteTP: async (subject: string, tpId: string) => {
    if (!db) throw new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.");
    const ref = doc(db, "tujuan_pembelajaran_templates", subject);
    const docSnap = await withRetryAndTimeout(() => getDoc(ref), 15000, 1);
    let tpsList: any[] = [];
    if (docSnap && docSnap.exists()) {
      tpsList = docSnap.data().tps || [];
    }
    const cleanTpId = String(tpId).trim();
    const filtered = tpsList.filter((tp: any) => String(tp.id).trim() !== cleanTpId);
    await withRetryAndTimeout(() => setDoc(ref, { tps: filtered }), 15000, 1);
    return { message: "TP berhasil dihapus." };
  },

  // 7. GET & POST /api/settings
  getSettings: async () => {
    if (!db) throw new Error("Database not connected");
    const ref = doc(db, "settings", "app");
    const docSnap = await withRetryAndTimeout(() => getDoc(ref), 15000, 1);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (!data.principalName) data.principalName = "Ari Gunawan, S.Kom.";
      data.principalNip = "";
      if (data.format) {
        if (!data.format.tanggalRaport) data.format.tanggalRaport = "17 Juni 2026";
        if (!data.format.principalSignaturePosition) data.format.principalSignaturePosition = "bottom_center";
        if (!data.format.signatureCity) data.format.signatureCity = "Pangkal Pinang";
        if (!data.format.principalTitle) data.format.principalTitle = "Kepala Sekolah";
        data.format.showPrincipalNip = false;
      }
      return data;
    }
    return {
      principalName: "Ari Gunawan, S.Kom.",
      principalNip: "",
      format: {
        semesterName: "Ganjil",
        tahunPelajaran: "2026/2027",
        fontSize: "11pt",
        showLogo: true,
        showSpiritual: true,
        showSosial: true,
        showAttendance: true,
        showCatatan: true,
        fontFamily: "Times New Roman",
        descFontSize: "9pt",
        paperSize: "A4",
        tanggalRaport: "17 Juni 2026",
        principalSignaturePosition: "bottom_center",
        signatureCity: "Pangkal Pinang",
        principalTitle: "Kepala Sekolah",
        showPrincipalNip: false,
        showParentSignature: true,
        watermarkSize: 440,
        watermarkOpacity: 0.05
      }
    };
  },
  postSettings: async (body: any) => {
    if (!db) throw new Error("Database not connected");
    const { principalNip, format } = body;
    const settingsData = {
      principalName: "Ari Gunawan, S.Kom.",
      principalNip: principalNip || "",
      format: format ? {
        semesterName: format.semesterName || "Ganjil",
        tahunPelajaran: format.tahunPelajaran || "2026/2027",
        fontSize: format.fontSize || "11pt",
        showLogo: format.showLogo !== undefined ? format.showLogo : true,
        showSpiritual: format.showSpiritual !== undefined ? format.showSpiritual : true,
        showSosial: format.showSosial !== undefined ? format.showSosial : true,
        showAttendance: format.showAttendance !== undefined ? format.showAttendance : true,
        showCatatan: format.showCatatan !== undefined ? format.showCatatan : true,
        fontFamily: format.fontFamily || "Times New Roman",
        descFontSize: format.descFontSize || "9pt",
        paperSize: format.paperSize || "A4",
        tanggalRaport: format.tanggalRaport || "17 Juni 2026",
        principalSignaturePosition: format.principalSignaturePosition || "bottom_center",
        signatureCity: format.signatureCity || "Pangkal Pinang",
        principalTitle: format.principalTitle || "Kepala Sekolah",
        showPrincipalNip: false,
        showParentSignature: format.showParentSignature !== undefined ? format.showParentSignature : true,
        watermarkSize: format.watermarkSize !== undefined ? Number(format.watermarkSize) : 440,
        watermarkOpacity: format.watermarkOpacity !== undefined ? Number(format.watermarkOpacity) : 0.05
      } : {}
    };
    await withRetryAndTimeout(() => setDoc(doc(db, "settings", "app"), settingsData), 15000, 1);
    return { success: true, settings: settingsData };
  },

  // 8. GET /api/summary
  getSummary: async () => {
    const students = (await firebaseApi.getStudents()) as any[];
    const teachers = (await firebaseApi.getTeachers()) as any[];
    const grades = (await firebaseApi.getGrades()) as any[];
    
    const subjectsList = [
      "PAI", "PPKN", "Bahasa Indonesia", "Matematika", "IPA", "IPS", "Bahasa Inggris", "PJOK", "Prakarya", "Informatika",
      "Bahasa Arab", "Tahsin ABaTaTsa", "Tahfizh Al-Qur’an", "Do’a Harian dan Hadits", "Wudhu dan Sholat"
    ];
    const totalStudents = students.length;

    const normalizeSub = (str: string) =>
      String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const matchesStudent = (g: any, s: any) => {
      if (!g || !s) return false;
      return String(g.studentId || "").trim() === String(s.id || "").trim();
    };
    
    const subjectProgress = subjectsList.map(sub => {
      const targetNorm = normalizeSub(sub);
      const filledGradesForSub = grades.filter((g: any) => {
        const isSubMatch = normalizeSub(g.subject) === targetNorm || g.subject === sub;
        const isStudentMatch = students.some((s: any) => matchesStudent(g, s));
        return isSubMatch && isStudentMatch;
      });
      const completedCount = filledGradesForSub.length;
      const percentage = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;
      const t = teachers.find((teach: any) => normalizeSub(teach.subject) === targetNorm || teach.subject === sub);
      return {
        subject: sub,
        completed: completedCount,
        total: totalStudents,
        percent: percentage,
        teacherName: t ? t.name : "Belum Ditugaskan"
      };
    });

    const classSet = new Set(["7", "8", "9"]);
    students.forEach((s: any) => {
      const k = String(s.kelas || "").trim();
      if (k) classSet.add(k);
    });
    const classes = Array.from(classSet).sort();

    const classProgress = classes.map(cls => {
      const studentsInClass = students.filter((s: any) => String(s.kelas || "").trim() === cls);
      const totalGradesNeeded = studentsInClass.length * subjectsList.length;
      let gradesFilledCount = 0;
      
      studentsInClass.forEach((s: any) => {
        const studentGrades = grades.filter((g: any) => matchesStudent(g, s));
        gradesFilledCount += studentGrades.length;
      });

      const percent = totalGradesNeeded > 0 ? Math.round((gradesFilledCount / totalGradesNeeded) * 100) : 0;
      const waliKelas = teachers.find((teach: any) => teach.isWaliKelas && String(teach.kelas || "").trim() === cls);
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
    const studentRankings = students.map((s: any) => {
      const studentGrades = grades.filter((g: any) => matchesStudent(g, s));
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

      const predikat =
        filledSubjectsCount === 0
          ? "Belum Ada Nilai"
          : tentukanPredikatLabel(averageScore);

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

    return {
      totalStudents,
      totalTeachers: teachers.length,
      subjectProgress,
      classProgress,
      studentRankings,
      lastUpdate: new Date().toISOString()
    };
  },

  // 9. GET, POST, DELETE /api/ekskul
  getEkskul: async (): Promise<any[]> => {
    if (!db) throw new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.");
    const snap = await withRetryAndTimeout(() => getDocs(collection(db, "ekskul")), 15000, 1);
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
    return snap.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id }));
  },
  postEkskul: async (body: any) => {
    if (!db) throw new Error("Database not connected");
    const { name, type, pembinaTeacherId, pembinaName } = body;
    const id = "e_" + Date.now();
    const newE = {
      id,
      name,
      type,
      pembinaTeacherId: pembinaTeacherId || "",
      pembinaName: pembinaName || ""
    };
    await withRetryAndTimeout(() => setDoc(doc(db, "ekskul", id), newE), 15000, 1);
    return newE;
  },
  putEkskul: async (id: string, body: any) => {
    if (!db) throw new Error("Database not connected");
    const { name, type, pembinaTeacherId, pembinaName } = body;
    const ref = doc(db, "ekskul", id);
    const updated = {
      name,
      type,
      pembinaTeacherId: pembinaTeacherId || "",
      pembinaName: pembinaName || ""
    };
    await withRetryAndTimeout(() => setDoc(ref, updated, { merge: true }), 15000, 1);
    return { id, ...updated };
  },
  deleteEkskul: async (id: string) => {
    if (!db) throw new Error("Database not connected");
    await withRetryAndTimeout(() => deleteDoc(doc(db, "ekskul", id)), 15000, 1);
    return { message: "Ekskul deleted" };
  },
  postEkskulGradesBulk: async (gradesList: any[]) => {
    if (!db) throw new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.");
    if (!Array.isArray(gradesList) || gradesList.length === 0) {
      return { success: true, count: 0 };
    }

    const [existingNotesMap, backupSnap, studentsList] = await Promise.all([
      firebaseApi.getWaliKelasNotes(),
      withRetryAndTimeout(() => getDoc(doc(db, "settings", "ekskul_grades")), 15000, 1).catch(() => null),
      firebaseApi.getStudents(),
    ]);

    const studentMap = new Map<string, any>();
    if (Array.isArray(studentsList)) {
      studentsList.forEach((s: any) => {
        if (s && s.id) studentMap.set(String(s.id).trim(), s);
      });
    }

    const masterEkskulMap: Record<string, any[]> =
      backupSnap && backupSnap.exists() && backupSnap.data()?.map && typeof backupSnap.data().map === "object"
        ? { ...backupSnap.data().map }
        : {};

    const toLetter = (val: any, fallback = "B") => {
      if (!val) return fallback;
      const s = String(val).trim().toUpperCase();
      if (s === "A" || s === "SANGAT BAIK" || s === "SB" || s.startsWith("A ") || s.startsWith("A(")) return "A";
      if (s === "B" || s === "BAIK" || s.startsWith("B ") || s.startsWith("B(")) return "B";
      if (s === "C" || s === "CUKUP" || s === "CB" || s.startsWith("C ") || s.startsWith("C(")) return "C";
      if (s === "D" || s === "KURANG" || s === "KB" || s.startsWith("D ") || s.startsWith("D(")) return "D";
      if (s.length === 1 && ["A", "B", "C", "D"].includes(s)) return s;
      return fallback;
    };

    const docsToUpdate: Array<{ studentId: string; noteData: any }> = [];
    const nowIso = new Date().toISOString();

    for (const item of gradesList) {
      const { studentId, ekskulId, name, type, usaha, proses, capaian, description, pembinaName, pembinaTeacherId, selected } = item;
      if (!studentId || !name) continue;
      const cleanStudentId = String(studentId).trim();
      const studentObj = studentMap.get(cleanStudentId);
      const studentName = studentObj?.name ? String(studentObj.name).trim() : String(item.studentName || "").trim();

      const currentNote: any = existingNotesMap[cleanStudentId] || {
        studentId: cleanStudentId,
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
        ekskul: [],
      };

      let currentEkskuls: any[] = (Array.isArray(currentNote.ekskul) ? [...currentNote.ekskul] : []).filter(
        (e: any) => e && e.name && (!e.studentId || String(e.studentId).trim() === cleanStudentId)
      );

      const matchesTargetEkskul = (e: any) =>
        (ekskulId && e.ekskulId === ekskulId) ||
        (e.name && String(e.name).trim().toLowerCase() === String(name).trim().toLowerCase());

      const existIdx = currentEkskuls.findIndex(matchesTargetEkskul);

      if (selected === false) {
        if (existIdx === -1) {
          masterEkskulMap[cleanStudentId] = currentEkskuls;
          continue;
        }
        currentEkskuls = currentEkskuls.filter((e: any) => !matchesTargetEkskul(e));
      } else {
        const fallbackL = toLetter(capaian, "B");
        const uL = toLetter(usaha, fallbackL);
        const pL = toLetter(proses, fallbackL);
        const cL = toLetter(capaian, fallbackL);

        const newEkskulEntry = {
          studentId: cleanStudentId,
          studentName,
          ekskulId: ekskulId || "",
          name: String(name).trim(),
          type: type || "Pilihan",
          usaha: uL,
          proses: pL,
          capaian: cL,
          predicate: cL,
          description: String(description || "").trim(),
          pembinaName: pembinaName || "",
          pembinaTeacherId: pembinaTeacherId || "",
          updatedAt: nowIso,
        };

        if (existIdx !== -1) {
          currentEkskuls[existIdx] = { ...currentEkskuls[existIdx], ...newEkskulEntry };
        } else {
          currentEkskuls.push(newEkskulEntry);
        }
      }

      const updatedNote = {
        ...currentNote,
        studentId: cleanStudentId,
        ekskul: currentEkskuls,
        updatedAt: nowIso,
      };

      existingNotesMap[cleanStudentId] = updatedNote;
      masterEkskulMap[cleanStudentId] = currentEkskuls;

      docsToUpdate.push({ studentId: cleanStudentId, noteData: updatedNote });
    }

    const BATCH_SIZE = 15;
    for (let i = 0; i < docsToUpdate.length; i += BATCH_SIZE) {
      const chunk = docsToUpdate.slice(i, i + BATCH_SIZE);
      await Promise.all(
        chunk.map(({ studentId: sid, noteData }) =>
          withRetryAndTimeout(() => setDoc(doc(db!, "walikelas_notes", sid), noteData, { merge: true }), 15000, 1)
        )
      );
    }

    await withRetryAndTimeout(
      () =>
        setDoc(
          doc(db, "settings", "ekskul_grades"),
          {
            principalName: "Ari Gunawan, S.Kom.",
            principalNip: "",
            map: masterEkskulMap,
            updatedAt: nowIso,
          },
          { merge: true }
        ),
      15000,
      1
    );

    return { success: true, count: docsToUpdate.length, notes: existingNotesMap };
  },

  // 10. GET, POST, PUT, DELETE /api/halaqoh (Cloud Firestore Persistence)
  getHalaqoh: async (): Promise<any[]> => {
    if (!db) throw new Error("Gagal memuat data dari server. Periksa koneksi lalu muat ulang.");
    const docSnap = await withRetryAndTimeout(() => getDoc(doc(db, "settings", "halaqoh")), 15000, 1).catch(() => null);
    if (docSnap && docSnap.exists() && Array.isArray(docSnap.data()?.list) && docSnap.data().list.length > 0) {
      return docSnap.data().list;
    }

    const snap = await withRetryAndTimeout(() => getDocs(collection(db, "halaqoh")), 15000, 1);
    if (snap && !snap.empty) {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      await setDoc(doc(db, "settings", "halaqoh"), { list }, { merge: true }).catch(() => {});
      return list;
    }
    return [];
  },
  postHalaqoh: async (body: any) => {
    if (!db) throw new Error("Database not connected");
    const { name, mentorName, mentorTeacherId, studentIds } = body || {};
    if (!name || !name.trim()) throw new Error("Nama halaqoh wajib diisi.");
    const id = "hlq_" + Date.now();
    const newHalaqoh = {
      id,
      name: name.trim(),
      mentorName: (mentorName || "").trim(),
      mentorTeacherId: mentorTeacherId || "",
      studentIds: Array.isArray(studentIds) ? studentIds : [],
      createdAt: new Date().toISOString()
    };

    let currentList: any[] = [];
    const snap = await withRetryAndTimeout(() => getDoc(doc(db, "settings", "halaqoh")), 15000, 1).catch(() => null);
    if (snap && snap.exists() && Array.isArray(snap.data()?.list)) {
      currentList = snap.data().list;
    }

    const updatedList = [...currentList, newHalaqoh];
    await withRetryAndTimeout(() => setDoc(doc(db, "settings", "halaqoh"), { list: updatedList }, { merge: true }), 15000, 1);
    await setDoc(doc(db, "halaqoh", id), newHalaqoh).catch(() => {});
    return newHalaqoh;
  },
  putHalaqoh: async (id: string, body: any) => {
    if (!db) throw new Error("Database not connected");
    const { name, mentorName, mentorTeacherId, studentIds } = body || {};

    let currentList: any[] = [];
    const snap = await withRetryAndTimeout(() => getDoc(doc(db, "settings", "halaqoh")), 15000, 1).catch(() => null);
    if (snap && snap.exists() && Array.isArray(snap.data()?.list)) {
      currentList = snap.data().list;
    }

    const index = currentList.findIndex((h: any) => h.id === id);
    let updatedH: any = null;
    if (index !== -1) {
      updatedH = {
        ...currentList[index],
        name: name ? name.trim() : currentList[index].name,
        mentorName: mentorName !== undefined ? (mentorName || "").trim() : currentList[index].mentorName,
        mentorTeacherId: mentorTeacherId !== undefined ? mentorTeacherId : currentList[index].mentorTeacherId,
        studentIds: Array.isArray(studentIds) ? studentIds : currentList[index].studentIds,
        updatedAt: new Date().toISOString()
      };
      currentList[index] = updatedH;
    } else {
      updatedH = {
        id,
        name: (name || "").trim(),
        mentorName: (mentorName || "").trim(),
        mentorTeacherId: mentorTeacherId || "",
        studentIds: Array.isArray(studentIds) ? studentIds : [],
        updatedAt: new Date().toISOString()
      };
      currentList.push(updatedH);
    }

    await withRetryAndTimeout(() => setDoc(doc(db, "settings", "halaqoh"), { list: currentList }, { merge: true }), 15000, 1);
    await setDoc(doc(db, "halaqoh", id), updatedH, { merge: true }).catch(() => {});
    return updatedH;
  },
  deleteHalaqoh: async (id: string) => {
    if (!db) throw new Error("Database not connected");
    let currentList: any[] = [];
    const snap = await withRetryAndTimeout(() => getDoc(doc(db, "settings", "halaqoh")), 15000, 1).catch(() => null);
    if (snap && snap.exists() && Array.isArray(snap.data()?.list)) {
      currentList = snap.data().list;
    }

    const filtered = currentList.filter((h: any) => h.id !== id);
    await withRetryAndTimeout(() => setDoc(doc(db, "settings", "halaqoh"), { list: filtered }, { merge: true }), 15000, 1);
    await deleteDoc(doc(db, "halaqoh", id)).catch(() => {});
    return { message: "Halaqoh berhasil dihapus." };
  },
  syncHalaqohList: async (list: any[]) => {
    if (!db || !Array.isArray(list)) return [];
    await withRetryAndTimeout(() => setDoc(doc(db, "settings", "halaqoh"), { list }, { merge: true }), 15000, 1);
    return list;
  }
};
export { db, db as default };
