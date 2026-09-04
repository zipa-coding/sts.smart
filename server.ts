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

const DEFAULT_SCHOOL_ID = "smp-islam-smart";
const DEFAULT_SCHOOL_NAME = "SMP ISLAM SMART PANGKALPINANG";

function ensureSchoolsInitialized(db: any) {
  if (!db.schools || !Array.isArray(db.schools) || db.schools.length === 0) {
    db.schools = [
      {
        id: DEFAULT_SCHOOL_ID,
        name: DEFAULT_SCHOOL_NAME,
        npsn: "69987654",
        city: "Pangkalpinang",
        adminUsername: "admin",
        schoolPassword: "123",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
  } else {
    const defaultSchool = db.schools.find((s: any) => s.id === DEFAULT_SCHOOL_ID);
    if (!defaultSchool) {
      db.schools.unshift({
        id: DEFAULT_SCHOOL_ID,
        name: DEFAULT_SCHOOL_NAME,
        npsn: "69987654",
        city: "Pangkalpinang",
        adminUsername: "admin",
        schoolPassword: "123",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
    } else if (!defaultSchool.schoolPassword) {
      defaultSchool.schoolPassword = "123";
    }
  }

  if (!db.school_settings) db.school_settings = {};
  if (!db.school_tps) db.school_tps = {};
  if (!db.school_ekskul) db.school_ekskul = {};
}

function getSchoolId(req: express.Request): string {
  const fromQuery =
    (req.query.schoolId as string) || (req.query.school as string);
  const fromHeader =
    (req.headers["x-school-id"] as string) ||
    (req.headers["x-school"] as string);
  const fromBody = req.body?.schoolId as string;
  return fromQuery || fromHeader || fromBody || DEFAULT_SCHOOL_ID;
}

function isRecordForSchool(record: any, targetSchoolId: string): boolean {
  if (!record) return false;
  const recSchoolId = record.schoolId || DEFAULT_SCHOOL_ID;
  return recSchoolId === targetSchoolId;
}

// Helper to read database with memory caching
async function readDB() {
  if (memoryDB) {
    ensureSchoolsInitialized(memoryDB);
    return memoryDB;
  }
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    memoryDB = JSON.parse(data);
    ensureSchoolsInitialized(memoryDB);
    return memoryDB;
  } catch (err) {
    console.error("Error reading db file, using empty default:", err);
    memoryDB = {
      schools: [
        {
          id: DEFAULT_SCHOOL_ID,
          name: DEFAULT_SCHOOL_NAME,
          npsn: "69987654",
          city: "Pangkalpinang",
          adminUsername: "admin",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      teachers: [],
      students: [],
      grades: [],
      walikelas_notes: {},
      tujuan_pembelajaran_templates: {},
      school_settings: {},
      school_tps: {},
      school_ekskul: {},
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

// 0. Schools Registry API
app.get("/api/schools", async (req, res) => {
  const db = await readDB();
  // Return sanitized list for system reference
  const sanitized = (db.schools || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    npsn: s.npsn || "",
    city: s.city || "",
  }));
  res.json(sanitized);
});

// Verify School Access with School Name & School Password
app.post("/api/schools/verify", async (req, res) => {
  const { schoolName, password } = req.body;
  const cleanSchoolName = (schoolName || "").trim();
  const cleanPassword = (password || "").trim();

  if (!cleanSchoolName) {
    return res.status(400).json({ error: "Nama sekolah harus diisi sesuai yang didaftarkan." });
  }
  if (!cleanPassword) {
    return res.status(400).json({ error: "Kata sandi sekolah harus diisi untuk membuka akses sekolah." });
  }

  const db = await readDB();
  const query = cleanSchoolName.toLowerCase();
  const queryNoSpace = query.replace(/[^a-z0-9]/g, "");

  // 1. Exact match (case-insensitive)
  let school = (db.schools || []).find(
    (s: any) => s.name.trim().toLowerCase() === query
  );

  // 2. Normalized without non-alphanumeric (e.g. Pangkal Pinang vs Pangkalpinang)
  if (!school) {
    school = (db.schools || []).find((s: any) => {
      const sNoSpace = (s.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return sNoSpace === queryNoSpace;
    });
  }

  // 3. Substring / partial match (e.g. "SMP ISLAM SMART" is inside "SMP ISLAM SMART PANGKALPINANG")
  if (!school && queryNoSpace.length >= 4) {
    school = (db.schools || []).find((s: any) => {
      const sNoSpace = (s.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return sNoSpace.includes(queryNoSpace) || queryNoSpace.includes(sNoSpace);
    });
  }

  // 4. Token match: all words in query (e.g. ["smp", "islam", "smart"]) are in school name
  if (!school) {
    const tokens = query.split(/\s+/).filter((t: string) => t.length > 2);
    if (tokens.length > 0) {
      school = (db.schools || []).find((s: any) => {
        const sLower = (s.name || "").toLowerCase();
        return tokens.every((token: string) => sLower.includes(token));
      });
    }
  }

  // 5. NPSN match
  if (!school && /^\d+$/.test(query)) {
    school = (db.schools || []).find((s: any) => s.npsn && s.npsn.trim() === query);
  }

  // 6. Direct username match: if user typed "admin" or their teacher username into the school box!
  if (!school) {
    const matchedTeacher = (db.teachers || []).find(
      (t: any) =>
        t.username.toLowerCase().trim() === query &&
        (t.password === cleanPassword || t.password === password)
    );
    if (matchedTeacher) {
      const teacherSchoolId = matchedTeacher.schoolId || DEFAULT_SCHOOL_ID;
      school = (db.schools || []).find((s: any) => s.id === teacherSchoolId);
    }
  }

  if (!school) {
    return res.status(404).json({
      error: `Sekolah "${cleanSchoolName}" tidak ditemukan. Pastikan nama sekolah yang dimasukkan sudah sesuai (contoh: SMP ISLAM SMART atau nama sekolah yang didaftarkan).`,
    });
  }

  // Find teachers for this school to verify passwords
  const schoolTeachers = (db.teachers || []).filter(
    (t: any) => t.schoolId === school.id || (!t.schoolId && school.id === DEFAULT_SCHOOL_ID)
  );

  const adminTeacher = schoolTeachers.find(
    (t: any) => t.username === school.adminUsername || t.subject === "Admin"
  );

  const isSchoolPassMatch =
    school.schoolPassword &&
    (school.schoolPassword === cleanPassword || school.schoolPassword === password);
  const isAdminPassMatch =
    adminTeacher &&
    (adminTeacher.password === cleanPassword || adminTeacher.password === password);
  const isAnyTeacherMatch = schoolTeachers.some(
    (t: any) => t.password === cleanPassword || t.password === password
  );
  const isDefaultMatch =
    (school.id === DEFAULT_SCHOOL_ID || school.name === DEFAULT_SCHOOL_NAME) &&
    (cleanPassword === "123" || cleanPassword === "admin");

  if (!isSchoolPassMatch && !isAdminPassMatch && !isAnyTeacherMatch && !isDefaultMatch) {
    return res.status(401).json({
      error: "Kata sandi sekolah salah. Silakan masukkan kata sandi yang sesuai.",
    });
  }

  res.json({
    success: true,
    school: {
      id: school.id,
      name: school.name,
      npsn: school.npsn || "",
      city: school.city || "",
    },
  });
});

app.post("/api/schools/register", async (req, res) => {
  const schoolName = req.body.schoolName || req.body.name;
  const adminName = req.body.adminName;
  const username = req.body.username || req.body.adminUsername;
  const password = req.body.password || req.body.adminPassword;
  const npsn = req.body.npsn;
  const city = req.body.city;

  if (!schoolName || !schoolName.trim()) {
    return res.status(400).json({ error: "Nama sekolah harus diisi." });
  }
  if (!username || !username.trim()) {
    return res.status(400).json({ error: "Username admin harus diisi." });
  }
  if (!password || !password.trim()) {
    return res.status(400).json({ error: "Kata sandi admin harus diisi." });
  }

  const db = await readDB();
  const cleanSchoolName = schoolName.trim();
  const cleanUsername = username.trim();

  // Check if school with identical name already exists
  const schoolExists = db.schools.some(
    (s: any) => s.name.toLowerCase() === cleanSchoolName.toLowerCase(),
  );
  if (schoolExists) {
    return res.status(400).json({
      error: `Sekolah dengan nama "${cleanSchoolName}" sudah terdaftar di sistem. Silakan masukkan nama dan kata sandinya di menu masuk.`,
    });
  }

  const newSchoolId = "sch_" + Date.now();
  const newSchool = {
    id: newSchoolId,
    name: cleanSchoolName,
    npsn: npsn?.trim() || "",
    city: city?.trim() || "",
    adminUsername: cleanUsername,
    schoolPassword: password.trim(),
    createdAt: new Date().toISOString(),
  };

  db.schools.push(newSchool);

  // Create initial Admin account for this new school
  const adminTeacher = {
    id: "t_" + Date.now(),
    name:
      adminName && adminName.trim()
        ? adminName.trim()
        : `Admin ${cleanSchoolName}`,
    username: cleanUsername,
    password: password.trim(),
    subject: "Admin",
    isWaliKelas: false,
    kelas: "",
    schoolId: newSchoolId,
    schoolName: cleanSchoolName,
  };

  db.teachers.push(adminTeacher);

  // Initialize empty configuration for this school
  if (!db.school_settings) db.school_settings = {};
  db.school_settings[newSchoolId] = {
    schoolId: newSchoolId,
    schoolName: cleanSchoolName,
    principalName: "",
    principalNip: "",
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
      tanggalRaport: "17 Juni 2026",
      watermarkSize: 440,
      watermarkOpacity: 0.05,
    },
  };

  await writeDB(db);

  res.status(201).json({
    success: true,
    message: `Sekolah "${cleanSchoolName}" berhasil didaftarkan. Ruang data default kosong telah disiapkan.`,
    school: newSchool,
    admin: {
      id: adminTeacher.id,
      name: adminTeacher.name,
      username: adminTeacher.username,
      subject: adminTeacher.subject,
      isWaliKelas: false,
      kelas: "",
      schoolId: newSchoolId,
      schoolName: cleanSchoolName,
    },
  });
});

// 1. Auth Endpoints
app.post("/api/login", async (req, res) => {
  const { username, password, schoolId } = req.body;
  const cleanUsername = (username || "").trim();
  const cleanPassword = (password || "").trim();

  if (!cleanUsername || !cleanPassword) {
    return res
      .status(400)
      .json({ error: "Username dan kata sandi harus diisi." });
  }

  const db = await readDB();

  let teacher = null;
  // If schoolId is explicitly provided, look in that school first
  if (schoolId) {
    teacher = db.teachers.find(
      (t: any) =>
        isRecordForSchool(t, schoolId) &&
        t.username.toLowerCase().trim() === cleanUsername.toLowerCase() &&
        (t.password === cleanPassword || t.password === password),
    );
  }

  // If no schoolId provided or not found, look across all registered teachers
  if (!teacher) {
    teacher = db.teachers.find(
      (t: any) =>
        t.username.toLowerCase().trim() === cleanUsername.toLowerCase() &&
        (t.password === cleanPassword || t.password === password),
    );
  }

  if (!teacher) {
    return res
      .status(401)
      .json({ error: "Kombinasi pengguna dan kata sandi salah." });
  }

  const userSchoolId = teacher.schoolId || DEFAULT_SCHOOL_ID;
  const schoolObj = db.schools.find((s: any) => s.id === userSchoolId) || {
    id: userSchoolId,
    name:
      userSchoolId === DEFAULT_SCHOOL_ID
        ? DEFAULT_SCHOOL_NAME
        : "Sekolah Terdaftar",
  };

  res.json({
    id: teacher.id,
    name: teacher.name,
    username: teacher.username,
    subject: teacher.subject,
    isWaliKelas: teacher.isWaliKelas || false,
    kelas: teacher.kelas || "",
    schoolId: userSchoolId,
    schoolName: schoolObj.name,
  });
});

app.post("/api/verify-session", async (req, res) => {
  const { username, password, schoolId } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Sesi tidak lengkap." });
  }

  const db = await readDB();

  let teacher = null;
  if (schoolId) {
    teacher = db.teachers.find(
      (t: any) =>
        isRecordForSchool(t, schoolId) &&
        t.username.toLowerCase() === username.toLowerCase() &&
        t.password === password,
    );
  }

  if (!teacher) {
    teacher = db.teachers.find(
      (t: any) =>
        t.username.toLowerCase() === username.toLowerCase() &&
        t.password === password,
    );
  }

  if (!teacher) {
    return res.status(401).json({ error: "Sesi tidak valid." });
  }

  const userSchoolId = teacher.schoolId || DEFAULT_SCHOOL_ID;
  const schoolObj = db.schools.find((s: any) => s.id === userSchoolId) || {
    id: userSchoolId,
    name:
      userSchoolId === DEFAULT_SCHOOL_ID
        ? DEFAULT_SCHOOL_NAME
        : "Sekolah Terdaftar",
  };

  res.json({
    id: teacher.id,
    name: teacher.name,
    username: teacher.username,
    subject: teacher.subject,
    isWaliKelas: teacher.isWaliKelas || false,
    kelas: teacher.kelas || "",
    schoolId: userSchoolId,
    schoolName: schoolObj.name,
  });
});

// 2. Teachers CRUD
app.get("/api/teachers", async (req, res) => {
  const db = await readDB();
  const schoolId = getSchoolId(req);
  const teachers = db.teachers.filter((t: any) =>
    isRecordForSchool(t, schoolId),
  );
  res.json(teachers);
});

app.post("/api/teachers", async (req, res) => {
  const { name, username, password, subject, isWaliKelas, kelas } = req.body;
  if (!name || !username || !password || !subject) {
    return res.status(400).json({ error: "Data guru kurang lengkap." });
  }

  const db = await readDB();
  const schoolId = getSchoolId(req);
  const school = db.schools.find((s: any) => s.id === schoolId);

  // Check unique username within this school
  const exists = db.teachers.some(
    (t: any) =>
      isRecordForSchool(t, schoolId) &&
      t.username.toLowerCase() === username.toLowerCase(),
  );
  if (exists) {
    return res
      .status(400)
      .json({ error: "Username sudah digunakan di sekolah ini." });
  }

  const newTeacher = {
    id: "t_" + Date.now(),
    name,
    username,
    password,
    subject,
    isWaliKelas: !!isWaliKelas,
    kelas: kelas || "",
    schoolId,
    schoolName: school?.name || DEFAULT_SCHOOL_NAME,
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

  const teacherSchoolId = db.teachers[index].schoolId || DEFAULT_SCHOOL_ID;

  // Check username unique within this school except itself
  const exists = db.teachers.some(
    (t: any) =>
      isRecordForSchool(t, teacherSchoolId) &&
      t.username.toLowerCase() === username.toLowerCase() &&
      t.id !== id,
  );
  if (exists) {
    return res
      .status(400)
      .json({ error: "Username sudah digunakan di sekolah ini." });
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

  const teacher = db.teachers.find((t: any) => t.id === id);
  if (!teacher) {
    return res.status(404).json({ error: "Guru tidak ditemukan." });
  }

  // Prevent deleting the only admin in the school
  if (teacher.subject === "Admin") {
    const schoolId = teacher.schoolId || DEFAULT_SCHOOL_ID;
    const adminCount = db.teachers.filter(
      (t: any) => isRecordForSchool(t, schoolId) && t.subject === "Admin",
    ).length;
    if (adminCount <= 1) {
      return res.status(400).json({
        error: "Akun Admin sekolah tidak boleh dihapus jika hanya tersisa satu.",
      });
    }
  }

  db.teachers = db.teachers.filter((t: any) => t.id !== id);
  await writeDB(db);
  res.json({ message: "Guru berhasil dihapus." });
});

// 3. Students CRUD
app.get("/api/students", async (req, res) => {
  const db = await readDB();
  const schoolId = getSchoolId(req);
  const students = db.students.filter((s: any) =>
    isRecordForSchool(s, schoolId),
  );
  res.json(students);
});

app.post("/api/students", async (req, res) => {
  const { name, nisn, kelas } = req.body;
  if (!name || !nisn || !kelas) {
    return res
      .status(400)
      .json({ error: "Nama, NISN, dan Kelas harus diisi." });
  }

  const db = await readDB();
  const schoolId = getSchoolId(req);

  // Check unique NISN in this school
  const exists = db.students.some(
    (s: any) => isRecordForSchool(s, schoolId) && s.nisn === nisn,
  );
  if (exists) {
    return res
      .status(400)
      .json({ error: "Siswa dengan NISN ini sudah terdaftar di sekolah ini." });
  }

  const newStudent = {
    id: "s_" + Date.now(),
    nisn,
    name,
    kelas,
    schoolId,
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

  const studentSchoolId = db.students[index].schoolId || DEFAULT_SCHOOL_ID;

  const exists = db.students.some(
    (s: any) =>
      isRecordForSchool(s, studentSchoolId) && s.nisn === nisn && s.id !== id,
  );
  if (exists) {
    return res
      .status(400)
      .json({ error: "NISN sudah digunakan oleh siswa lain di sekolah ini." });
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
  if (db.walikelas_notes && db.walikelas_notes[id]) {
    delete db.walikelas_notes[id];
  }

  db.students = filtered;
  await writeDB(db);
  res.json({ message: "Siswa berhasil dihapus." });
});

// 4. Grades & Objectives Management
app.get("/api/grades", async (req, res) => {
  const db = await readDB();
  const schoolId = getSchoolId(req);
  const grades = db.grades.filter((g: any) => isRecordForSchool(g, schoolId));
  res.json(grades);
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
  const schoolId = getSchoolId(req);

  // Find if grade already exists for this student and subject in this school
  const index = db.grades.findIndex(
    (g: any) =>
      isRecordForSchool(g, schoolId) &&
      g.studentId === studentId &&
      g.subject === subject,
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
    schoolId,
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
  const schoolId = getSchoolId(req);
  const schoolStudentIds = new Set(
    db.students
      .filter((s: any) => isRecordForSchool(s, schoolId))
      .map((s: any) => s.id),
  );

  const filteredNotes: any = {};
  if (db.walikelas_notes) {
    for (const [studentId, note] of Object.entries(db.walikelas_notes)) {
      if (schoolStudentIds.has(studentId)) {
        filteredNotes[studentId] = note;
      }
    }
  }

  res.json(filteredNotes);
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
  const schoolId = getSchoolId(req);
  if (schoolId === DEFAULT_SCHOOL_ID) {
    return res.json(db.tujuan_pembelajaran_templates || {});
  }
  const schoolTps =
    db.school_tps?.[schoolId] || db.tujuan_pembelajaran_templates || {};
  res.json(schoolTps);
});

app.post("/api/tps", async (req, res) => {
  const { subject, tpText } = req.body;
  if (!subject || !tpText) {
    return res
      .status(400)
      .json({ error: "Mata pelajaran dan teks TP diperlukan." });
  }

  const db = await readDB();
  const schoolId = getSchoolId(req);

  const newTP = {
    id: "tp_" + Date.now(),
    text: tpText,
  };

  if (schoolId === DEFAULT_SCHOOL_ID) {
    if (!db.tujuan_pembelajaran_templates)
      db.tujuan_pembelajaran_templates = {};
    if (!db.tujuan_pembelajaran_templates[subject])
      db.tujuan_pembelajaran_templates[subject] = [];
    db.tujuan_pembelajaran_templates[subject].push(newTP);
  } else {
    if (!db.school_tps) db.school_tps = {};
    if (!db.school_tps[schoolId]) {
      db.school_tps[schoolId] = JSON.parse(
        JSON.stringify(db.tujuan_pembelajaran_templates || {}),
      );
    }
    if (!db.school_tps[schoolId][subject])
      db.school_tps[schoolId][subject] = [];
    db.school_tps[schoolId][subject].push(newTP);
  }

  await writeDB(db);
  res.status(201).json(newTP);
});

app.delete("/api/tps/:subject/:tpId", async (req, res) => {
  const { subject, tpId } = req.params;
  const db = await readDB();
  const schoolId = getSchoolId(req);

  if (schoolId === DEFAULT_SCHOOL_ID) {
    if (
      db.tujuan_pembelajaran_templates &&
      db.tujuan_pembelajaran_templates[subject]
    ) {
      db.tujuan_pembelajaran_templates[subject] =
        db.tujuan_pembelajaran_templates[subject].filter(
          (tp: any) => tp.id !== tpId,
        );
      await writeDB(db);
      return res.json({ message: "TP berhasil dihapus." });
    }
  } else {
    if (
      db.school_tps &&
      db.school_tps[schoolId] &&
      db.school_tps[schoolId][subject]
    ) {
      db.school_tps[schoolId][subject] = db.school_tps[schoolId][
        subject
      ].filter((tp: any) => tp.id !== tpId);
      await writeDB(db);
      return res.json({ message: "TP berhasil dihapus." });
    }
  }

  res.status(404).json({ error: "Tujuan Pembelajaran tidak ditemukan." });
});

// 6.5. School Settings API (Principal, NIP & Raport Format config)
app.get("/api/settings", async (req, res) => {
  const db = await readDB();
  const schoolId = getSchoolId(req);
  const school = db.schools.find((s: any) => s.id === schoolId);

  if (schoolId === DEFAULT_SCHOOL_ID) {
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
    return res.json({
      schoolId: DEFAULT_SCHOOL_ID,
      schoolName: DEFAULT_SCHOOL_NAME,
      principalName,
      principalNip,
      format,
    });
  }

  const schSettings = db.school_settings?.[schoolId] || {};
  const principalName = schSettings.principalName || "";
  const principalNip = schSettings.principalNip || "";
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
    ...(schSettings.format || {}),
  };

  res.json({
    schoolId,
    schoolName: school?.name || "Sekolah",
    principalName,
    principalNip,
    format,
  });
});

app.post("/api/settings", async (req, res) => {
  const { principalName, principalNip, format } = req.body;
  const db = await readDB();
  const schoolId = getSchoolId(req);

  const formatObj = format
    ? {
        semesterName: format.semesterName || "Ganjil",
        tahunPelajaran: format.tahunPelajaran || "2026/2027",
        fontSize: format.fontSize || "11pt",
        showLogo: format.showLogo !== undefined ? format.showLogo : false,
        showSpiritual:
          format.showSpiritual !== undefined ? format.showSpiritual : true,
        showSosial: format.showSosial !== undefined ? format.showSosial : true,
        showAttendance:
          format.showAttendance !== undefined ? format.showAttendance : true,
        showCatatan:
          format.showCatatan !== undefined ? format.showCatatan : true,
        fontFamily: format.fontFamily || "Times New Roman",
        paperSize: format.paperSize || "A4",
        tanggalRaport: format.tanggalRaport || "17 Juni 2026",
        watermarkSize:
          format.watermarkSize !== undefined
            ? Number(format.watermarkSize)
            : 440,
        watermarkOpacity:
          format.watermarkOpacity !== undefined
            ? Number(format.watermarkOpacity)
            : 0.05,
      }
    : undefined;

  if (schoolId === DEFAULT_SCHOOL_ID) {
    if (!db.settings) db.settings = {};
    db.settings.principalName =
      principalName || "Ustadz H. Ir. Abdul Muhyi, M.Pd";
    db.settings.principalNip = principalNip || "19780512 200501 1 002";
    if (formatObj) db.settings.format = formatObj;
  } else {
    if (!db.school_settings) db.school_settings = {};
    if (!db.school_settings[schoolId]) db.school_settings[schoolId] = {};
    db.school_settings[schoolId].principalName = principalName || "";
    db.school_settings[schoolId].principalNip = principalNip || "";
    if (formatObj) db.school_settings[schoolId].format = formatObj;
  }

  await writeDB(db);
  res.json({ success: true, message: "Pengaturan berhasil disimpan." });
});

// 6.6. Extracurricular List API
app.get("/api/ekskul", async (req, res) => {
  const db = await readDB();
  const schoolId = getSchoolId(req);
  const defaultEkskul = [
    { id: "e1", name: "Pramuka", type: "Wajib" },
    { id: "e2", name: "Mentoring", type: "Wajib" },
    { id: "e3", name: "Futsal", type: "Pilihan" },
    { id: "e4", name: "Voli", type: "Pilihan" },
    { id: "e5", name: "Panahan", type: "Pilihan" },
    { id: "e6", name: "Study Club", type: "Pilihan" },
  ];

  if (schoolId === DEFAULT_SCHOOL_ID) {
    const ekskul = db.ekskul || defaultEkskul;
    if (!db.ekskul) {
      db.ekskul = defaultEkskul;
      await writeDB(db);
    }
    return res.json(ekskul);
  }

  if (!db.school_ekskul) db.school_ekskul = {};
  if (!db.school_ekskul[schoolId]) {
    db.school_ekskul[schoolId] = [...defaultEkskul];
    await writeDB(db);
  }
  res.json(db.school_ekskul[schoolId]);
});

app.post("/api/ekskul", async (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: "Nama dan tipe ekskul wajib diisi." });
  }
  const db = await readDB();
  const schoolId = getSchoolId(req);

  const newEkskul = {
    id: "e_" + Date.now(),
    name,
    type,
  };

  if (schoolId === DEFAULT_SCHOOL_ID) {
    if (!db.ekskul) db.ekskul = [];
    db.ekskul.push(newEkskul);
  } else {
    if (!db.school_ekskul) db.school_ekskul = {};
    if (!db.school_ekskul[schoolId]) db.school_ekskul[schoolId] = [];
    db.school_ekskul[schoolId].push(newEkskul);
  }

  await writeDB(db);
  res.status(201).json(newEkskul);
});

app.delete("/api/ekskul/:id", async (req, res) => {
  const { id } = req.params;
  const db = await readDB();
  const schoolId = getSchoolId(req);

  if (schoolId === DEFAULT_SCHOOL_ID) {
    if (db.ekskul) {
      db.ekskul = db.ekskul.filter((e: any) => e.id !== id);
      await writeDB(db);
    }
  } else {
    if (db.school_ekskul && db.school_ekskul[schoolId]) {
      db.school_ekskul[schoolId] = db.school_ekskul[schoolId].filter(
        (e: any) => e.id !== id,
      );
      await writeDB(db);
    }
  }

  res.json({ message: "Ekskul berhasil dihapus." });
});

// 7. General Progress / Summary APIs
app.get("/api/summary", async (req, res) => {
  const db = await readDB();
  const schoolId = getSchoolId(req);

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

  const schoolStudents = db.students.filter((s: any) =>
    isRecordForSchool(s, schoolId),
  );
  const schoolTeachers = db.teachers.filter((t: any) =>
    isRecordForSchool(t, schoolId),
  );
  const schoolGrades = db.grades.filter((g: any) =>
    isRecordForSchool(g, schoolId),
  );

  const totalStudents = schoolStudents.length;

  // Calculate progress mapping for this school
  const subjectProgress = subjects.map((sub) => {
    const filledGradesForSub = schoolGrades.filter(
      (g: any) => g.subject === sub,
    );
    const completedCount = filledGradesForSub.length;
    const percentage =
      totalStudents > 0
        ? Math.round((completedCount / totalStudents) * 100)
        : 0;

    // Find active teacher for this subject in this school
    const teacher = schoolTeachers.find((t: any) => t.subject === sub);

    return {
      subject: sub,
      completed: completedCount,
      total: totalStudents,
      percent: percentage,
      teacherName: teacher ? teacher.name : "Belum Ditugaskan",
    };
  });

  // Class progress summary for this school
  const classes = Array.from(
    new Set(schoolStudents.map((s: any) => s.kelas)),
  ) as string[];

  const classProgress = classes.map((cls) => {
    const studentsInClass = schoolStudents.filter((s: any) => s.kelas === cls);
    const totalGradesNeeded = studentsInClass.length * subjects.length;

    let gradesFilledCount = 0;
    const studentIds = studentsInClass.map((s: any) => s.id);
    schoolGrades.forEach((g: any) => {
      if (studentIds.includes(g.studentId)) {
        gradesFilledCount++;
      }
    });

    const percent =
      totalGradesNeeded > 0
        ? Math.round((gradesFilledCount / totalGradesNeeded) * 100)
        : 0;
    const waliKelas = schoolTeachers.find(
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
    totalTeachers: schoolTeachers.length,
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
