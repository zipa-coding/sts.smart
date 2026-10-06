import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Path to data file
const DB_PATH = path.join(process.cwd(), "src", "data", "db.json");

// In-memory database cache for sub-millisecond responses
let memoryDB: any = null;
let saveDebounceTimer: NodeJS.Timeout | null = null;

// Helper to read database with memory caching
async function readDB() {
  if (memoryDB) {
    return memoryDB;
  }
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    memoryDB = JSON.parse(data);
    return memoryDB;
  } catch (err) {
    console.error("Error reading db file, using empty default:", err);
    memoryDB = {
      teachers: [],
      students: [],
      grades: [],
      walikelas_notes: {},
      tujuan_pembelajaran_templates: {},
    };
    return memoryDB;
  }
}

// Helper to write database with background async disk sync
async function writeDB(data: any) {
  memoryDB = data;
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing db file:", err);
  }
}

// Background sync helper that doesn't block HTTP responses
function asyncPersistDB() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(async () => {
    if (memoryDB) {
      try {
        await fs.writeFile(DB_PATH, JSON.stringify(memoryDB, null, 2), "utf-8");
      } catch (e) {
        console.error("Async disk sync error:", e);
      }
    }
  }, 50);
}

// ==================== API ENDPOINTS ====================

// 1. Auth Endpoint
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required." });
  }

  const db = await readDB();
  const teacher = db.teachers.find(
    (t: any) =>
      t.username.toLowerCase() === username.toLowerCase() &&
      t.password === password,
  );

  if (!teacher) {
    return res
      .status(401)
      .json({ error: "Kombinasi pengguna dan kata sandi salah." });
  }

  res.json({
    id: teacher.id,
    name: teacher.name,
    username: teacher.username,
    subject: teacher.subject,
    isWaliKelas: teacher.isWaliKelas || false,
    kelas: teacher.kelas || "",
  });
});

app.post("/api/verify-session", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Sesi tidak lengkap." });
  }

  const db = await readDB();
  const teacher = db.teachers.find(
    (t: any) =>
      t.username.toLowerCase() === username.toLowerCase() &&
      t.password === password,
  );

  if (!teacher) {
    return res.status(401).json({ error: "Sesi tidak valid." });
  }

  res.json({
    id: teacher.id,
    name: teacher.name,
    username: teacher.username,
    subject: teacher.subject,
    isWaliKelas: teacher.isWaliKelas || false,
    kelas: teacher.kelas || "",
  });
});

// 2. Teachers CRUD
app.get("/api/teachers", async (req, res) => {
  const db = await readDB();
  res.json(db.teachers);
});

app.post("/api/teachers", async (req, res) => {
  const { name, username, password, subject, isWaliKelas, kelas, isPembinaEkskul, pembinaEkskulId, pembinaEkskulName } = req.body;
  if (!name || !username || !password || !subject) {
    return res.status(400).json({ error: "Data guru kurang lengkap." });
  }

  const db = await readDB();

  // Check unique username
  const exists = db.teachers.some(
    (t: any) => t.username.toLowerCase() === username.toLowerCase(),
  );
  if (exists) {
    return res.status(400).json({ error: "Username sudah digunakan." });
  }

  const newTeacher = {
    id: "t_" + Date.now(),
    name,
    username,
    password,
    subject,
    isWaliKelas: !!isWaliKelas,
    kelas: kelas || "",
    isPembinaEkskul: !!isPembinaEkskul,
    pembinaEkskulId: pembinaEkskulId || "",
    pembinaEkskulName: pembinaEkskulName || "",
  };

  db.teachers.push(newTeacher);
  await writeDB(db);
  res.status(201).json(newTeacher);
});

app.put("/api/teachers/:id", async (req, res) => {
  const { id } = req.params;
  const { name, username, password, subject, isWaliKelas, kelas, isPembinaEkskul, pembinaEkskulId, pembinaEkskulName } = req.body;

  const db = await readDB();
  const index = db.teachers.findIndex((t: any) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Guru tidak ditemukan." });
  }

  // Check username unique except itself
  const exists = db.teachers.some(
    (t: any) =>
      t.username.toLowerCase() === username.toLowerCase() && t.id !== id,
  );
  if (exists) {
    return res.status(400).json({ error: "Username sudah digunakan." });
  }

  db.teachers[index] = {
    ...db.teachers[index],
    name,
    username,
    password,
    subject,
    isWaliKelas: !!isWaliKelas,
    kelas: kelas || "",
    isPembinaEkskul: !!isPembinaEkskul,
    pembinaEkskulId: pembinaEkskulId || "",
    pembinaEkskulName: pembinaEkskulName || "",
  };

  await writeDB(db);
  res.json(db.teachers[index]);
});

app.delete("/api/teachers/:id", async (req, res) => {
  const { id } = req.params;
  const db = await readDB();

  if (id === "t1") {
    return res
      .status(400)
      .json({ error: "Akun Super Admin utama tidak boleh dihapus." });
  }

  const filtered = db.teachers.filter((t: any) => t.id !== id);
  if (filtered.length === db.teachers.length) {
    return res.status(404).json({ error: "Guru tidak ditemukan." });
  }

  db.teachers = filtered;
  await writeDB(db);
  res.json({ message: "Guru berhasil dihapus." });
});

// 3. Students CRUD
app.get("/api/students", async (req, res) => {
  const db = await readDB();
  const sortedStudents = [...(db.students || [])].sort((a: any, b: any) => {
    if (a.kelas && b.kelas && String(a.kelas).trim() !== String(b.kelas).trim()) {
      return String(a.kelas).localeCompare(String(b.kelas), "id", { numeric: true });
    }
    return String(a.name || "").localeCompare(String(b.name || ""), "id", { sensitivity: "base" });
  });
  res.json(sortedStudents);
});

app.post("/api/students", async (req, res) => {
  const { name, nisn, kelas } = req.body;
  if (!name || !nisn || !kelas) {
    return res
      .status(400)
      .json({ error: "Nama, NISN, dan Kelas harus diisi." });
  }

  const db = await readDB();

  // Check unique NISN
  const exists = db.students.some((s: any) => s.nisn === nisn);
  if (exists) {
    return res
      .status(400)
      .json({ error: "Siswa dengan NISN ini sudah terdaftar." });
  }

  const newStudent = {
    id: "s_" + Date.now(),
    nisn,
    name,
    kelas,
  };

  db.students.push(newStudent);
  await writeDB(db);
  res.status(201).json(newStudent);
});

// POST /api/students/batch - Batch import students
app.post("/api/students/batch", async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res
      .status(400)
      .json({ error: "Daftar siswa wajib berupa array dan tidak boleh kosong." });
  }

  const db = await readDB();
  const existingNisns = new Set(
    db.students.map((s: any) => String(s.nisn || "").trim())
  );
  const batchNisns = new Set<string>();

  const addedStudents: any[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];

  let counter = 0;
  for (const item of students) {
    const name = String(item.name || "").trim();
    const nisn = String(item.nisn || "").trim().replace(/\D/g, "");
    const kelas = String(item.kelas || "7").trim();

    if (!name) {
      errors.push(`Baris NISN ${nisn || "?"}: Nama siswa tidak boleh kosong.`);
      continue;
    }
    if (!nisn) {
      errors.push(`Siswa "${name}": NISN tidak boleh kosong dan harus berupa angka.`);
      continue;
    }

    if (existingNisns.has(nisn) || batchNisns.has(nisn)) {
      duplicates.push(`${name} (${nisn})`);
      continue;
    }

    batchNisns.add(nisn);
    existingNisns.add(nisn);

    const newStudent = {
      id: "s_" + Date.now() + "_" + (++counter),
      nisn,
      name,
      kelas: kelas || "7",
    };

    db.students.push(newStudent);
    addedStudents.push(newStudent);
  }

  if (addedStudents.length > 0) {
    await writeDB(db);
  }

  res.status(200).json({
    success: true,
    addedCount: addedStudents.length,
    duplicatesCount: duplicates.length,
    duplicates,
    errors,
    students: addedStudents,
    totalStudents: db.students.length,
  });
});

// POST /api/students/bulk-update - Bulk update students without losing existing IDs, grades, or notes
app.post("/api/students/bulk-update", async (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates) || updates.length === 0) {
    return res
      .status(400)
      .json({ error: "Daftar pembaruan siswa wajib berupa array dan tidak boleh kosong." });
  }

  const db = await readDB();
  let updatedCount = 0;
  const notFound: string[] = [];
  const errors: string[] = [];
  const updatedStudents: any[] = [];

  for (const item of updates) {
    const { id, currentNisn, currentName, name, nisn, kelas } = item;

    // Match student by id, or by currentNisn / nisn, or by currentName / name
    let studentIndex = -1;
    if (id) {
      studentIndex = db.students.findIndex((s: any) => s.id === id);
    }
    if (studentIndex === -1 && currentNisn) {
      const cleanCurrentNisn = String(currentNisn).trim().replace(/\D/g, "");
      studentIndex = db.students.findIndex(
        (s: any) => String(s.nisn).trim().replace(/\D/g, "") === cleanCurrentNisn
      );
    }
    if (studentIndex === -1 && nisn) {
      const cleanNisn = String(nisn).trim().replace(/\D/g, "");
      studentIndex = db.students.findIndex(
        (s: any) => String(s.nisn).trim().replace(/\D/g, "") === cleanNisn
      );
    }
    if (studentIndex === -1 && currentName) {
      const cleanCurrentName = String(currentName).trim().toLowerCase();
      studentIndex = db.students.findIndex(
        (s: any) => String(s.name).trim().toLowerCase() === cleanCurrentName
      );
    }
    if (studentIndex === -1 && name) {
      const cleanName = String(name).trim().toLowerCase();
      studentIndex = db.students.findIndex(
        (s: any) => String(s.name).trim().toLowerCase() === cleanName
      );
    }

    if (studentIndex === -1) {
      notFound.push(name || currentName || nisn || currentNisn || "Siswa tidak dikenal");
      continue;
    }

    const existing = db.students[studentIndex];
    const newNisn = nisn !== undefined ? String(nisn).trim().replace(/\D/g, "") : existing.nisn;
    const newName = name !== undefined && String(name).trim() ? String(name).trim() : existing.name;
    const newKelas = kelas !== undefined && String(kelas).trim() ? String(kelas).trim() : existing.kelas;

    // Check if new NISN is used by someone else
    if (newNisn && newNisn !== existing.nisn) {
      const duplicateExists = db.students.some(
        (s: any) => s.id !== existing.id && String(s.nisn).trim() === newNisn
      );
      if (duplicateExists) {
        errors.push(`Siswa "${existing.name}": NISN ${newNisn} sudah digunakan oleh siswa lain.`);
        continue;
      }
    }

    db.students[studentIndex] = {
      ...existing,
      name: newName,
      nisn: newNisn || existing.nisn,
      kelas: newKelas,
    };

    updatedCount++;
    updatedStudents.push(db.students[studentIndex]);
  }

  if (updatedCount > 0) {
    await writeDB(db);
  }

  res.status(200).json({
    success: true,
    updatedCount,
    notFoundCount: notFound.length,
    notFound,
    errors,
    students: updatedStudents,
    totalStudents: db.students.length,
  });
});


app.put("/api/students/:id", async (req, res) => {
  const { id } = req.params;
  const { name, nisn, kelas } = req.body;

  const db = await readDB();
  const index = db.students.findIndex((s: any) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Siswa tidak ditemukan." });
  }

  const exists = db.students.some((s: any) => s.nisn === nisn && s.id !== id);
  if (exists) {
    return res
      .status(400)
      .json({ error: "NISN sudah digunakan oleh siswa lain." });
  }

  db.students[index] = {
    ...db.students[index],
    name,
    nisn,
    kelas,
  };

  await writeDB(db);
  res.json(db.students[index]);
});

app.delete("/api/students/:id", async (req, res) => {
  const { id } = req.params;
  const db = await readDB();

  const filtered = db.students.filter((s: any) => s.id !== id);
  if (filtered.length === db.students.length) {
    return res.status(404).json({ error: "Siswa tidak ditemukan." });
  }

  // Also clear grades with this studentId to keep DB clean
  db.grades = db.grades.filter((g: any) => g.studentId !== id);

  // Also clear walikelas_notes
  if (db.walikelas_notes[id]) {
    delete db.walikelas_notes[id];
  }

  db.students = filtered;
  await writeDB(db);
  res.json({ message: "Siswa berhasil dihapus." });
});

// 4. Grades & Objectives Management
app.get("/api/grades", async (req, res) => {
  const db = await readDB();
  res.json(db.grades);
});

app.post("/api/grades", async (req, res) => {
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
  } = req.body;
  if (!studentId || !subject || score === undefined || !tps) {
    return res.status(400).json({ error: "Data input nilai tidak lengkap." });
  }

  const db = await readDB();

  // Find if grade already exists for this student and subject
  const index = db.grades.findIndex(
    (g: any) => g.studentId === studentId && g.subject === subject,
  );

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
    lastUpdatedAt: new Date().toISOString(),
  };

  if (index !== -1) {
    db.grades[index] = updatedGrade;
  } else {
    db.grades.push(updatedGrade);
  }

  await writeDB(db);
  res.json(updatedGrade);
});

// 5. Wali Kelas Notes & Attendance
app.get("/api/walikelas/notes", async (req, res) => {
  const db = await readDB();
  res.json(db.walikelas_notes || {});
});

app.post("/api/walikelas/notes", async (req, res) => {
  const {
    studentId,
    sakit,
    izin,
    alpa,
    catatan,
    spiritualUsaha,
    spiritualProses,
    spiritualCapaian,
    spiritualDeskripsi,
    sosialUsaha,
    sosialProses,
    sosialCapaian,
    sosialDeskripsi,
    ekskul,
  } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: "ID Siswa harus diisi." });
  }

  const db = await readDB();
  if (!db.walikelas_notes) {
    db.walikelas_notes = {};
  }

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
    ekskul: ekskul || [],
  };

  await writeDB(db);
  res.json({ studentId, ...db.walikelas_notes[studentId] });
});

// 6. Learning Objectives (TP) Templates CRUD
app.get("/api/tps", async (req, res) => {
  const db = await readDB();
  const templates = db.tujuan_pembelajaran_templates || {};
  const { kelas, subject } = req.query;

  // If specific subject requested
  if (subject && typeof subject === "string") {
    let items = templates[subject] || [];
    if (kelas && typeof kelas === "string") {
      items = items.filter(
        (item: any) => String(item.kelas || "").trim() === String(kelas).trim()
      );
    }
    return res.json(items);
  }

  // If filtered by kelas across all subjects
  if (kelas && typeof kelas === "string") {
    const filtered: Record<string, any[]> = {};
    for (const [sub, list] of Object.entries(templates)) {
      if (Array.isArray(list)) {
        filtered[sub] = list.filter(
          (item: any) => String(item.kelas || "").trim() === String(kelas).trim()
        );
      }
    }
    return res.json(filtered);
  }

  res.json(templates);
});

app.post("/api/tps", async (req, res) => {
  const { subject, tpText, kelas } = req.body;
  if (!subject || !tpText) {
    return res
      .status(400)
      .json({ error: "Mata pelajaran dan teks TP diperlukan." });
  }

  const db = await readDB();
  if (!db.tujuan_pembelajaran_templates) {
    db.tujuan_pembelajaran_templates = {};
  }
  if (!db.tujuan_pembelajaran_templates[subject]) {
    db.tujuan_pembelajaran_templates[subject] = [];
  }

  const newTP = {
    id: "tp_" + Date.now(),
    text: tpText,
    kelas: kelas ? String(kelas).trim() : "7",
  };

  db.tujuan_pembelajaran_templates[subject].push(newTP);
  await writeDB(db);
  res.status(201).json(newTP);
});

app.put("/api/tps/:subject/:tpId", async (req, res) => {
  const { subject, tpId } = req.params;
  const { tpText, kelas } = req.body;
  if (!tpText) {
    return res.status(400).json({ error: "Teks TP wajib diisi." });
  }

  const db = await readDB();
  if (!db.tujuan_pembelajaran_templates) {
    db.tujuan_pembelajaran_templates = {};
  }
  if (!db.tujuan_pembelajaran_templates[subject]) {
    db.tujuan_pembelajaran_templates[subject] = [];
  }

  const cleanTpId = String(tpId).trim();
  const list = db.tujuan_pembelajaran_templates[subject];
  const index = list.findIndex((tp: any) => String(tp.id).trim() === cleanTpId);

  if (index !== -1) {
    list[index] = {
      ...list[index],
      text: tpText.trim(),
      ...(kelas ? { kelas: String(kelas).trim() } : {}),
    };
  } else {
    list.push({
      id: cleanTpId,
      text: tpText.trim(),
      kelas: kelas ? String(kelas).trim() : "7",
    });
  }

  await writeDB(db);
  res.json(list[index !== -1 ? index : list.length - 1]);
});

app.delete("/api/tps/:subject/:tpId", async (req, res) => {
  const { subject, tpId } = req.params;
  const db = await readDB();

  if (
    db.tujuan_pembelajaran_templates &&
    db.tujuan_pembelajaran_templates[subject]
  ) {
    const cleanTpId = String(tpId).trim();
    db.tujuan_pembelajaran_templates[subject] =
      db.tujuan_pembelajaran_templates[subject].filter(
        (tp: any) => String(tp.id).trim() !== cleanTpId,
      );
    await writeDB(db);
    res.json({ message: "TP berhasil dihapus." });
  } else {
    res.status(404).json({ error: "Tujuan Pembelajaran tidak ditemukan." });
  }
});

// 6.5. School Settings API (Principal, NIP & Raport Format config)
app.get("/api/settings", async (req, res) => {
  const db = await readDB();
  const principalName =
    db.settings?.principalName || "Ari Gunawan, S.Kom.";
  const principalNip = db.settings?.principalNip || "";
  const format = {
    semesterName: "Ganjil",
    tahunPelajaran: "2026/2027",
    fontSize: "11pt",
    showLogo: false,
    showSpiritual: true,
    showSosial: true,
    showAttendance: true,
    showCatatan: true,
    fontFamily: "Times New Roman",
    descFontSize: "9pt",
    paperSize: "A4",
    tanggalRaport: "17 Juni 2026",
    watermarkSize: 440,
    watermarkOpacity: 0.05,
    showPrincipalNip: false,
    ...(db.settings?.format || {}),
  };
  res.json({ principalName, principalNip, format });
});

app.post("/api/settings", async (req, res) => {
  const { principalName, principalNip, format } = req.body;
  const db = await readDB();
  if (!db.settings) {
    db.settings = {};
  }
  db.settings.principalName =
    principalName || "Ari Gunawan, S.Kom.";
  db.settings.principalNip = principalNip || "";

  if (format) {
    db.settings.format = {
      semesterName: format.semesterName || "Ganjil",
      tahunPelajaran: format.tahunPelajaran || "2026/2027",
      fontSize: format.fontSize || "11pt",
      showLogo: format.showLogo !== undefined ? format.showLogo : false,
      showSpiritual:
        format.showSpiritual !== undefined ? format.showSpiritual : true,
      showSosial: format.showSosial !== undefined ? format.showSosial : true,
      showAttendance:
        format.showAttendance !== undefined ? format.showAttendance : true,
      showCatatan: format.showCatatan !== undefined ? format.showCatatan : true,
      fontFamily: format.fontFamily || "Times New Roman",
      descFontSize: format.descFontSize || "9pt",
      paperSize: format.paperSize || "A4",
      tanggalRaport: format.tanggalRaport || "17 Juni 2026",
      principalSignaturePosition:
        format.principalSignaturePosition || "bottom_center",
      signatureCity: format.signatureCity || "Pangkal Pinang",
      principalTitle: format.principalTitle || "Kepala Sekolah",
      showPrincipalNip: false,
      showParentSignature:
        format.showParentSignature !== undefined
          ? format.showParentSignature
          : true,
      watermarkSize:
        format.watermarkSize !== undefined ? format.watermarkSize : 440,
      watermarkOpacity:
        format.watermarkOpacity !== undefined ? format.watermarkOpacity : 0.05,
    };
  }

  await writeDB(db);
  res.json({ success: true, settings: db.settings });
});

// 6.6. Extracurricular List API
app.get("/api/ekskul", async (req, res) => {
  const db = await readDB();
  const defaultEkskul = [
    { id: "e1", name: "Pramuka", type: "Wajib" },
    { id: "e2", name: "Mentoring", type: "Wajib" },
    { id: "e3", name: "Futsal", type: "Pilihan" },
    { id: "e4", name: "Voli", type: "Pilihan" },
    { id: "e5", name: "Panahan", type: "Pilihan" },
    { id: "e6", name: "Study Club", type: "Pilihan" },
  ];
  const ekskul = db.ekskul || defaultEkskul;
  if (!db.ekskul) {
    db.ekskul = defaultEkskul;
    await writeDB(db);
  }
  res.json(ekskul);
});

app.post("/api/ekskul", async (req, res) => {
  const { name, type, pembinaTeacherId, pembinaName } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: "Nama dan tipe ekskul wajib diisi." });
  }
  const db = await readDB();
  if (!db.ekskul) {
    db.ekskul = [
      { id: "e1", name: "Pramuka", type: "Wajib" },
      { id: "e2", name: "Mentoring", type: "Wajib" },
      { id: "e3", name: "Futsal", type: "Pilihan" },
      { id: "e4", name: "Voli", type: "Pilihan" },
      { id: "e5", name: "Panahan", type: "Pilihan" },
      { id: "e6", name: "Study Club", type: "Pilihan" },
    ];
  }
  const newEkskul = {
    id: "e_" + Date.now(),
    name,
    type,
    pembinaTeacherId: pembinaTeacherId || "",
    pembinaName: pembinaName || "",
  };
  db.ekskul.push(newEkskul);
  await writeDB(db);
  res.status(201).json(newEkskul);
});

app.put("/api/ekskul/:id", async (req, res) => {
  const { id } = req.params;
  const { name, type, pembinaTeacherId, pembinaName } = req.body;
  const db = await readDB();
  if (!db.ekskul) db.ekskul = [];
  const idx = db.ekskul.findIndex((e: any) => e.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Ekskul tidak ditemukan." });
  }
  db.ekskul[idx] = {
    ...db.ekskul[idx],
    name: name || db.ekskul[idx].name,
    type: type || db.ekskul[idx].type,
    pembinaTeacherId: pembinaTeacherId !== undefined ? pembinaTeacherId : db.ekskul[idx].pembinaTeacherId,
    pembinaName: pembinaName !== undefined ? pembinaName : db.ekskul[idx].pembinaName,
  };
  await writeDB(db);
  res.json(db.ekskul[idx]);
});

app.delete("/api/ekskul/:id", async (req, res) => {
  const { id } = req.params;
  const db = await readDB();
  if (db.ekskul) {
    db.ekskul = db.ekskul.filter((e: any) => e.id !== id);
    await writeDB(db);
  }
  res.json({ message: "Ekskul berhasil dihapus." });
});

app.post("/api/ekskul/grades/bulk", async (req, res) => {
  const { grades } = req.body;
  if (!Array.isArray(grades) || grades.length === 0) {
    return res.status(400).json({ error: "Daftar nilai ekskul wajib diisi." });
  }

  const db = await readDB();
  if (!db.walikelas_notes) {
    db.walikelas_notes = {};
  }

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

  await writeDB(db);
  res.json({ success: true, count: grades.length });
});

// 7. General Progress / Summary APIs
app.get("/api/summary", async (req, res) => {
  const db = await readDB();

  const subjects = [
    "PAI",
    "PPKN",
    "Bahasa Indonesia",
    "Matematika",
    "IPA",
    "IPS",
    "Bahasa Inggris",
    "PJOK",
    "Prakarya",
    "Informatika",
    "Bahasa Arab",
    "Tahsin ABaTaTsa",
    "Tahfizh Al-Qur’an",
    "Do’a Harian dan Hadits",
    "Wudhu dan Sholat",
  ];

  const totalStudents = db.students.length;

  const normalizeSub = (str: string) =>
    String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const matchesStudent = (g: any, s: any) => {
    if (!g || !s) return false;
    if (g.studentId && g.studentId === s.id) return true;
    if (g.studentId && String(g.studentId).replace(/\D/g, "") === String(s.nisn).replace(/\D/g, "") && String(s.nisn).length >= 4) return true;
    if (g.nisn && String(g.nisn).replace(/\D/g, "") === String(s.nisn).replace(/\D/g, "")) return true;
    if (g.studentName && s.name && g.studentName.trim().toLowerCase() === s.name.trim().toLowerCase()) return true;
    return false;
  };

  // Calculate progress mapping - only count grades for active registered students
  const subjectProgress = subjects.map((sub) => {
    const targetNorm = normalizeSub(sub);
    const filledGradesForSub = db.grades.filter((g: any) => {
      const isSubMatch = normalizeSub(g.subject) === targetNorm || g.subject === sub;
      const isStudentMatch = db.students.some((s: any) => matchesStudent(g, s));
      return isSubMatch && isStudentMatch;
    });
    const completedCount = filledGradesForSub.length;
    const percentage =
      totalStudents > 0
        ? Math.round((completedCount / totalStudents) * 100)
        : 0;

    // Find active teacher for this subject
    const teacher = db.teachers.find((t: any) => normalizeSub(t.subject) === targetNorm || t.subject === sub);

    return {
      subject: sub,
      completed: completedCount,
      total: totalStudents,
      percent: percentage,
      teacherName: teacher ? teacher.name : "Belum Ditugaskan",
    };
  });

  // Ensure standard classes (7, 8, 9) and any custom classes are represented
  const classSet = new Set(["7", "8", "9"]);
  db.students.forEach((s: any) => {
    const k = String(s.kelas || "").trim();
    if (k) classSet.add(k);
  });
  const classes = Array.from(classSet).sort();

  const classProgress = classes.map((cls) => {
    const studentsInClass = db.students.filter(
      (s: any) => String(s.kelas || "").trim() === cls
    );
    const totalGradesNeeded = studentsInClass.length * subjects.length;

    let gradesFilledCount = 0;
    studentsInClass.forEach((s: any) => {
      const studentGrades = db.grades.filter((g: any) => matchesStudent(g, s));
      gradesFilledCount += studentGrades.length;
    });

    const percent =
      totalGradesNeeded > 0
        ? Math.round((gradesFilledCount / totalGradesNeeded) * 100)
        : 0;
    const waliKelas = db.teachers.find(
      (t: any) => t.isWaliKelas && String(t.kelas || "").trim() === cls,
    );

    return {
      kelas: cls,
      studentCount: studentsInClass.length,
      filledGrades: gradesFilledCount,
      totalNeeded: totalGradesNeeded,
      percent,
      waliKelasName: waliKelas ? waliKelas.name : "Belum Ditugaskan",
    };
  });

  // Calculate Student Rankings (Akumulasi Nilai Tertinggi ke Nilai Terendah)
  const studentRankings = db.students.map((s: any) => {
    const studentGrades = db.grades.filter((g: any) => matchesStudent(g, s));
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
      totalSubjectsCount: subjects.length,
      rank: 0,
      rankInClass: 0,
      predikat,
      subjectScores,
    };
  });

  // Sort descending by totalScore, then averageScore, then name
  studentRankings.sort((a: any, b: any) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
    return a.name.localeCompare(b.name);
  });

  // Assign overall rank (1-indexed)
  studentRankings.forEach((s: any, idx: number) => {
    s.rank = idx + 1;
  });

  // Assign rankInClass per class
  const classCounters: Record<string, number> = {};
  studentRankings.forEach((s: any) => {
    const k = s.kelas;
    classCounters[k] = (classCounters[k] || 0) + 1;
    s.rankInClass = classCounters[k];
  });

  res.json({
    totalStudents,
    totalTeachers: db.teachers.length,
    subjectProgress,
    classProgress,
    studentRankings,
    lastUpdate: new Date().toISOString(),
  });
});

// ==================== HALAQOH & KEISLAMAN API ====================
app.get("/api/halaqoh", async (req, res) => {
  const db = await readDB();
  const halaqohList = Array.isArray(db.halaqoh) ? db.halaqoh : [];
  res.json(halaqohList);
});

app.post("/api/halaqoh", async (req, res) => {
  const { name, mentorName, mentorTeacherId, studentIds } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Nama halaqoh wajib diisi." });
  }

  const db = await readDB();
  if (!Array.isArray(db.halaqoh)) {
    db.halaqoh = [];
  }

  const newHalaqoh = {
    id: "hlq_" + Date.now(),
    name: name.trim(),
    mentorName: (mentorName || "").trim(),
    mentorTeacherId: mentorTeacherId || "",
    studentIds: Array.isArray(studentIds) ? studentIds : [],
    createdAt: new Date().toISOString(),
  };

  db.halaqoh.push(newHalaqoh);
  await writeDB(db);
  res.status(201).json(newHalaqoh);
});

app.put("/api/halaqoh/:id", async (req, res) => {
  const { id } = req.params;
  const { name, mentorName, mentorTeacherId, studentIds } = req.body;

  const db = await readDB();
  if (!Array.isArray(db.halaqoh)) {
    db.halaqoh = [];
  }

  const index = db.halaqoh.findIndex((h: any) => h.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Data Halaqoh tidak ditemukan." });
  }

  db.halaqoh[index] = {
    ...db.halaqoh[index],
    name: name ? name.trim() : db.halaqoh[index].name,
    mentorName: mentorName !== undefined ? (mentorName || "").trim() : db.halaqoh[index].mentorName,
    mentorTeacherId: mentorTeacherId !== undefined ? mentorTeacherId : db.halaqoh[index].mentorTeacherId,
    studentIds: Array.isArray(studentIds) ? studentIds : db.halaqoh[index].studentIds,
    updatedAt: new Date().toISOString(),
  };

  await writeDB(db);
  res.json(db.halaqoh[index]);
});

app.delete("/api/halaqoh/:id", async (req, res) => {
  const { id } = req.params;
  const db = await readDB();
  if (!Array.isArray(db.halaqoh)) {
    db.halaqoh = [];
  }

  db.halaqoh = db.halaqoh.filter((h: any) => h.id !== id);
  await writeDB(db);
  res.json({ message: "Halaqoh berhasil dihapus." });
});

// ==================== BACKUP & RESTORE DATA API ====================
app.get("/api/backup", async (req, res) => {
  try {
    const db = await readDB();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="smart_raport_backup_${Date.now()}.json"`);
    res.send(JSON.stringify(db, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: "Gagal mengunduh cadangan data: " + err.message });
  }
});

app.post("/api/restore", async (req, res) => {
  try {
    const backupData = req.body;
    if (!backupData || typeof backupData !== "object" || !Array.isArray(backupData.teachers) || !Array.isArray(backupData.students)) {
      return res.status(400).json({ error: "Format berkas cadangan JSON tidak valid. Pastikan berkas memiliki struktur data guru dan siswa." });
    }

    // Write directly to DB
    await writeDB(backupData);
    res.json({ success: true, message: "Alhamdulillah! Data raport berhasil dipulihkan secara penuh." });
  } catch (err: any) {
    res.status(500).json({ error: "Gagal memulihkan data: " + err.message });
  }
});

app.post("/api/reset", async (req, res) => {
  try {
    // Read original backup if exists or reset to default state
    const backupPath = path.join(process.cwd(), "src", "data", "db.backup.json");
    let originalData;
    try {
      const raw = await fs.readFile(backupPath, "utf-8");
      originalData = JSON.parse(raw);
    } catch {
      const raw = await fs.readFile(DB_PATH, "utf-8");
      originalData = JSON.parse(raw);
    }

    await writeDB(originalData);
    res.json({ success: true, message: "Data berhasil dikembalikan ke kondisi awal." });
  } catch (err: any) {
    res.status(500).json({ error: "Gagal mereset data: " + err.message });
  }
});

// ==================== FRONTEND INTEGRATION ====================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : undefined,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
