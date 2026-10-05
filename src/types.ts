export interface Teacher {
  id: string;
  name: string;
  username: string;
  password?: string;
  subject: string;
  isWaliKelas: boolean;
  kelas: string;
  isPembinaEkskul?: boolean;
  pembinaEkskulId?: string;
  pembinaEkskulName?: string;
}

export interface Student {
  id: string;
  nisn: string;
  name: string;
  kelas: string;
}

export interface Ekskul {
  id: string;
  name: string;
  type: "Wajib" | "Pilihan";
  pembinaTeacherId?: string;
  pembinaName?: string;
}

export interface StudentEkskulGrade {
  ekskulId?: string;
  name: string;
  type?: "Wajib" | "Pilihan";
  usaha: string;    // "A" | "B" | "C" | "D"
  proses: string;   // "A" | "B" | "C" | "D"
  capaian: string;  // "A" | "B" | "C" | "D"
  predicate?: string;
  description?: string;
  deskripsi?: string;
  pembinaName?: string;
  pembinaTeacherId?: string;
  updatedAt?: string;
}

export interface TPItem {
  id: string;
  text: string;
  achieved: boolean;
  kelas?: string;
}

export interface TPTemplate {
  id: string;
  text: string;
  kelas?: string;
}

export interface StudentRanking {
  studentId: string;
  name: string;
  nisn: string;
  kelas: string;
  totalScore: number;
  averageScore: number;
  filledSubjectsCount: number;
  totalSubjectsCount: number;
  rank: number;
  rankInClass: number;
  predikat: string;
  subjectScores?: { [subject: string]: number };
}

export interface Grade {
  studentId: string;
  subject: string;
  score: number;
  tps: TPItem[];
  usaha?: string;
  proses?: string;
  capaian?: string;
  deskripsi?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

export interface WaliKelasNote {
  sakit: number;
  izin: number;
  alpa: number;
  catatan: string;
  spiritualUsaha?: string;
  spiritualProses?: string;
  spiritualCapaian?: string;
  spiritualDeskripsi?: string;
  sosialUsaha?: string;
  sosialProses?: string;
  sosialCapaian?: string;
  sosialDeskripsi?: string;
  ekskul?: StudentEkskulGrade[];
}

export interface WaliKelasNotesMap {
  [studentId: string]: WaliKelasNote;
}

export interface SubjectProgress {
  subject: string;
  completed: number;
  total: number;
  percent: number;
  teacherName: string;
}

export interface ClassProgress {
  kelas: string;
  studentCount: number;
  filledGrades: number;
  totalNeeded: number;
  percent: number;
  waliKelasName: string;
}

export interface SchoolSummary {
  totalStudents: number;
  totalTeachers: number;
  subjectProgress: SubjectProgress[];
  classProgress: ClassProgress[];
  studentRankings?: StudentRanking[];
  lastUpdate: string;
}

export interface Halaqoh {
  id: string;
  name: string;
  mentorName: string;
  mentorTeacherId?: string;
  studentIds: string[];
  createdAt?: string;
}

export const SUBJECT_LIST = [
  // B. Umum
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
  // C. Muatan Lokal
  "Bahasa Arab",
  // D. Keislaman
  "Tahsin ABaTaTsa",
  "Tahfizh Al-Qur’an",
  "Do’a Harian dan Hadits",
  "Wudhu dan Sholat"
];

// Helper to sort students in halaqoh by Class (7 -> 8 -> 9) and then alphabetically by Name (A -> Z)
export const sortHalaqohStudents = (a: Student, b: Student): number => {
  const parseClassNum = (k: string | number | undefined): number => {
    if (!k) return 999;
    const str = String(k).trim().toUpperCase();
    if (str.startsWith("7") || str === "VII") return 7;
    if (str.startsWith("8") || str === "VIII") return 8;
    if (str.startsWith("9") || str === "IX") return 9;
    const num = parseInt(str, 10);
    return isNaN(num) ? 999 : num;
  };

  const classA = parseClassNum(a.kelas);
  const classB = parseClassNum(b.kelas);

  if (classA !== classB) {
    return classA - classB;
  }

  return (a.name || "").localeCompare(b.name || "", "id", { sensitivity: "base" });
};

