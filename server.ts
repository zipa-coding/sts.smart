import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Path to data file
const DB_PATH = path.join(process.cwd(), "src", "data", "db.json");

// Helper to read database
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading db file, using empty default:", err);
    return {
      teachers: [],
      students: [],
      grades: [],
      walikelas_notes: {},
      tujuan_pembelajaran_templates: {},
    };
  }
}

// Helper to write database
async function writeDB(data: any) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing db file:", err);
  }
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
  const { name, username, password, subject, isWaliKelas, kelas } = req.body;
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
  };

  db.teachers.push(newTeacher);
  await writeDB(db);
  res.status(201).json(newTeacher);
});

app.put("/api/teachers/:id", async (req, res) => {
  const { id } = req.params;
  const { name, username, password, subject, isWaliKelas, kelas } = req.body;

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
  res.json(db.students);
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
  res.json(db.tujuan_pembelajaran_templates || {});
});

app.post("/api/tps", async (req, res) => {
  const { subject, tpText } = req.body;
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
  };

  db.tujuan_pembelajaran_templates[subject].push(newTP);
  await writeDB(db);
  res.status(201).json(newTP);
});

app.delete("/api/tps/:subject/:tpId", async (req, res) => {
  const { subject, tpId } = req.params;
  const db = await readDB();

  if (
    db.tujuan_pembelajaran_templates &&
    db.tujuan_pembelajaran_templates[subject]
  ) {
    db.tujuan_pembelajaran_templates[subject] =
      db.tujuan_pembelajaran_templates[subject].filter(
        (tp: any) => tp.id !== tpId,
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
    db.settings?.principalName || "Ustadz H. Ir. Abdul Muhyi, M.Pd";
  const principalNip = db.settings?.principalNip || "19780512 200501 1 002";
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
    paperSize: "A4",
    tanggalRaport: "17 Juni 2026",
    watermarkSize: 440,
    watermarkOpacity: 0.05,
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
    principalName || "Ustadz H. Ir. Abdul Muhyi, M.Pd";
  db.settings.principalNip = principalNip || "19780512 200501 1 002";

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
      paperSize: format.paperSize || "A4",
      tanggalRaport: format.tanggalRaport || "17 Juni 2026",
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
  const { name, type } = req.body;
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
  };
  db.ekskul.push(newEkskul);
  await writeDB(db);
  res.status(201).json(newEkskul);
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

  // Calculate progress mapping
  const subjectProgress = subjects.map((sub) => {
    const filledGradesForSub = db.grades.filter((g: any) => g.subject === sub);
    const completedCount = filledGradesForSub.length;
    const percentage =
      totalStudents > 0
        ? Math.round((completedCount / totalStudents) * 100)
        : 0;

    // Find active teacher for this subject
    const teacher = db.teachers.find((t: any) => t.subject === sub);

    return {
      subject: sub,
      completed: completedCount,
      total: totalStudents,
      percent: percentage,
      teacherName: teacher ? teacher.name : "Belum Ditugaskan",
    };
  });

  // Class progress summary
  const classes = Array.from(
    new Set(db.students.map((s: any) => s.kelas)),
  ) as string[];
  const classProgress = classes.map((cls) => {
    const studentsInClass = db.students.filter((s: any) => s.kelas === cls);
    const totalGradesNeeded = studentsInClass.length * subjects.length;

    let gradesFilledCount = 0;
    const studentIds = studentsInClass.map((s: any) => s.id);
    db.grades.forEach((g: any) => {
      if (studentIds.includes(g.studentId)) {
        gradesFilledCount++;
      }
    });

    const percent =
      totalGradesNeeded > 0
        ? Math.round((gradesFilledCount / totalGradesNeeded) * 100)
        : 0;
    const waliKelas = db.teachers.find(
      (t: any) => t.isWaliKelas && t.kelas === cls,
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

  res.json({
    totalStudents,
    totalTeachers: db.teachers.length,
    subjectProgress,
    classProgress,
    lastUpdate: new Date().toISOString(),
  });
});

// ==================== FRONTEND INTEGRATION ====================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
