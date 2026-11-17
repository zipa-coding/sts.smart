import { detectForeignStudentNamesInDescription } from "./raportPdfService";

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertArrayEqual(actual: string[], expected: string[], message: string): void {
  if (
    actual.length !== expected.length ||
    actual.some((val, idx) => val !== expected[idx])
  ) {
    throw new Error(
      `[FAIL] ${message}: expected [${expected.join(", ")}], got [${actual.join(", ")}]`
    );
  }
}

export function runRaportPdfServiceTests(): { passed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0;

  const classStudents = [
    { id: "s_1", name: "Ahmad Fauzi", kelas: "7" },
    { id: "s_2", name: "Budi Santoso", kelas: "7" },
    { id: "s_3", name: "Ali", kelas: "7" },
    { id: "s_4", name: "Ali Akbar", kelas: "7" },
    { id: "s_5", name: "Siti Aminah", kelas: "8" },
  ];

  // =========================================================================
  // KASUS (a): Deskripsi berisi nama siswa lain dari kelas yang sama ->
  // hasilnya berisi nama siswa lain tersebut.
  // =========================================================================
  const caseA1 = detectForeignStudentNamesInDescription(
    "Alhamdulillah ananda Budi Santoso telah memahami konsep aljabar dengan sangat baik.",
    { id: "s_1", name: "Ahmad Fauzi", kelas: "7" },
    classStudents
  );
  assertArrayEqual(
    caseA1,
    ["Budi Santoso"],
    "Kasus (a1): Deskripsi berisi nama siswa lain dari kelas yang sama ('Budi Santoso')"
  );

  // Siswa dari kelas berbeda ("Siti Aminah" kelas 8) tidak boleh terdeteksi untuk siswa kelas 7
  const caseA2 = detectForeignStudentNamesInDescription(
    "Alhamdulillah ananda Siti Aminah telah memahami materi.",
    { id: "s_1", name: "Ahmad Fauzi", kelas: "7" },
    classStudents
  );
  assertArrayEqual(
    caseA2,
    [],
    "Kasus (a2): Nama siswa dari kelas berbeda tidak terdeteksi"
  );
  passed += 2;
  details.push("PASS: Kasus (a) Deskripsi berisi nama siswa lain dari kelas yang sama terdeteksi akurat");

  // =========================================================================
  // KASUS (b): Deskripsi hanya berisi nama siswa yang dipilih ->
  // hasilnya array kosong.
  // =========================================================================
  const caseB1 = detectForeignStudentNamesInDescription(
    "Alhamdulillah ananda Ahmad Fauzi menunjukkan pemahaman yang sangat baik pada materi ini.",
    { id: "s_1", name: "Ahmad Fauzi", kelas: "7" },
    classStudents
  );
  assertArrayEqual(
    caseB1,
    [],
    "Kasus (b1): Deskripsi hanya berisi nama siswa yang dipilih ('Ahmad Fauzi')"
  );

  const caseB2 = detectForeignStudentNamesInDescription(
    "Ananda Ali Akbar sangat aktif berdiskusi di kelas.",
    { id: "s_4", name: "Ali Akbar", kelas: "7" },
    classStudents
  );
  assertArrayEqual(
    caseB2,
    [],
    "Kasus (b2): Deskripsi hanya berisi nama lengkap siswa terpilih ('Ali Akbar') menghasilkan kosong"
  );
  passed += 2;
  details.push("PASS: Kasus (b) Deskripsi hanya berisi nama siswa yang dipilih menghasilkan array kosong");

  // =========================================================================
  // KASUS (c): Nama lain yang menjadi bagian dari nama lain (misalnya "Ali"
  // di dalam "Ali Akbar") harus terdeteksi sebagai kata utuh, tidak sebagai substring.
  // =========================================================================
  // c1: Kata yang memuat "ali" sebagai substring ("Aliansyah", "sekali", "Halimah", "kualitas")
  // TIDAK boleh mendeteksi siswa bernama "Ali".
  const caseC1 = detectForeignStudentNamesInDescription(
    "Ananda Ahmad Fauzi sekali lagi menunjukkan kualitas belajar yang baik bersama Aliansyah dan Halimah.",
    { id: "s_1", name: "Ahmad Fauzi", kelas: "7" },
    classStudents
  );
  assertArrayEqual(
    caseC1,
    [],
    "Kasus (c1): Substring 'ali' di dalam kata 'sekali'/'kualitas'/'Aliansyah'/'Halimah' tidak terdeteksi sebagai 'Ali'"
  );

  // c2: Nama "Ali" sebagai kata utuh terdeteksi ketika siswa terpilih adalah Ahmad Fauzi
  const caseC2 = detectForeignStudentNamesInDescription(
    "Alhamdulillah ananda Ali sudah tuntas menghafal materi.",
    { id: "s_1", name: "Ahmad Fauzi", kelas: "7" },
    classStudents
  );
  assertArrayEqual(
    caseC2,
    ["Ali"],
    "Kasus (c2): Nama 'Ali' sebagai kata utuh terdeteksi untuk siswa terpilih Ahmad Fauzi"
  );

  // c3: Nama "Ali" di dalam frasa "Ali Akbar" terdeteksi sebagai kata utuh ketika siswa terpilih adalah Ahmad Fauzi
  const caseC3 = detectForeignStudentNamesInDescription(
    "Alhamdulillah ananda Ali Akbar sudah tuntas menghafal materi.",
    { id: "s_1", name: "Ahmad Fauzi", kelas: "7" },
    classStudents
  );
  assertEqual(
    caseC3.includes("Ali"),
    true,
    "Kasus (c3): 'Ali' di dalam 'Ali Akbar' terdeteksi sebagai kata utuh ketika siswa terpilih bukan Ali Akbar"
  );
  assertEqual(
    caseC3.includes("Ali Akbar"),
    true,
    "Kasus (c3b): 'Ali Akbar' juga terdeteksi untuk siswa terpilih Ahmad Fauzi"
  );

  // c4: Ketika siswa terpilih adalah "Ali Akbar", tetapi di deskripsi tertulis nama panggilan siswa lain "Ali" secara terpisah
  const caseC4 = detectForeignStudentNamesInDescription(
    "Alhamdulillah ananda Ali sudah tuntas menghafal materi.",
    { id: "s_4", name: "Ali Akbar", kelas: "7" },
    classStudents
  );
  assertArrayEqual(
    caseC4,
    ["Ali"],
    "Kasus (c4): 'Ali' sebagai kata utuh terdeteksi jika tertulis 'Ali' saja pada deskripsi milik 'Ali Akbar'"
  );
  passed += 5;
  details.push("PASS: Kasus (c) Deteksi kata utuh vs substring ('Ali' vs 'Ali Akbar' & 'Aliansyah'/'sekali')");

  // =========================================================================
  // KASUS (d): Huruf besar-kecil diabaikan (case-insensitive).
  // =========================================================================
  const caseD1 = detectForeignStudentNamesInDescription(
    "alhamdulillah ananda budi santoso dan ali telah menyelesaikan tugas praktik.",
    { id: "s_1", name: "Ahmad Fauzi", kelas: "7" },
    classStudents
  );
  assertArrayEqual(
    caseD1,
    ["Budi Santoso", "Ali"],
    "Kasus (d1): Huruf kecil semua ('budi santoso', 'ali') tetap terdeteksi"
  );

  const caseD2 = detectForeignStudentNamesInDescription(
    "ALHAMDULILLAH ANANDA BUDI SANTOSO TELAH TUNTAS.",
    { id: "s_1", name: "Ahmad Fauzi", kelas: "7" },
    classStudents
  );
  assertArrayEqual(
    caseD2,
    ["Budi Santoso"],
    "Kasus (d2): Huruf kapital semua ('BUDI SANTOSO') tetap terdeteksi"
  );
  passed += 2;
  details.push("PASS: Kasus (d) Perbedaan huruf besar-kecil diabaikan (case-insensitive)");

  // =========================================================================
  // KASUS (e): Deskripsi kosong menghasilkan array kosong.
  // =========================================================================
  assertArrayEqual(
    detectForeignStudentNamesInDescription("", { id: "s_1", name: "Ahmad Fauzi", kelas: "7" }, classStudents),
    [],
    "Kasus (e1): String kosong menghasilkan array kosong"
  );
  assertArrayEqual(
    detectForeignStudentNamesInDescription("   ", { id: "s_1", name: "Ahmad Fauzi", kelas: "7" }, classStudents),
    [],
    "Kasus (e2): String spasi menghasilkan array kosong"
  );
  assertArrayEqual(
    detectForeignStudentNamesInDescription(null, { id: "s_1", name: "Ahmad Fauzi", kelas: "7" }, classStudents),
    [],
    "Kasus (e3): null menghasilkan array kosong"
  );
  assertArrayEqual(
    detectForeignStudentNamesInDescription(undefined, { id: "s_1", name: "Ahmad Fauzi", kelas: "7" }, classStudents),
    [],
    "Kasus (e4): undefined menghasilkan array kosong"
  );
  passed += 4;
  details.push("PASS: Kasus (e) Deskripsi kosong/spasi/null/undefined menghasilkan array kosong");

  return { passed, details };
}

// Allow direct CLI execution via tsx
if (typeof process !== "undefined" && process.argv?.[1]?.includes("raportPdfService.test")) {
  const result = runRaportPdfServiceTests();
  for (const line of result.details) {
    console.log(line);
  }
  console.log(`Total assertions passed: ${result.passed}`);
}
