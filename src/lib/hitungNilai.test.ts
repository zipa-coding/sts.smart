import {
  hitungRataBab,
  hitungRataRataTerisi,
  hitungPengetahuanSTS,
  hitungPengetahuanSAS,
  hitungNilaiAkhir,
  hitungNilaiRapor,
  tentukanPredikat,
  hitungAkumulasiSiswa,
  hitungLeggerSiswa,
  hitungRingkasanKelas,
  parseAndValidateCellInput,
  KonfigurasiCakupan,
} from "./hitungNilai";

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

export function runHitungNilaiTests(): { passed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0;

  const defaultConfig: KonfigurasiCakupan = {
    jumlahBab: 6,
    cakupanSTS: [1, 2, 3],
    cakupanSAS: [1, 2, 3, 4, 5, 6],
  };

  // =========================================================================
  // KASUS UJI 1 (Siswa A - sesuai spesifikasi):
  // T bab 1–3 = 79, 90, 85; SH bab 1–3 = 85, 86, 88; P bab 1–3 = 80, 87, 87;
  // STS = 79; SAT kosong; cakupan STS = bab 1–3.
  // - Rata T = 84,67
  // - Rata SH = 86,33
  // - Rata P = 84,67
  // - Pengetahuan STS = (84,67 + 2×86,33 + 79) / 4 = 84,08
  // - Nilai Akhir STS = (84,08 + 84,67) / 2 = 84,38, Nilai Rapor 84, Predikat B
  // =========================================================================
  const hasilSiswaA = hitungAkumulasiSiswa(
    {
      bab: {
        "1": { t: 79, sh: 85, p: 80 },
        "2": { t: 90, sh: 86, p: 87 },
        "3": { t: 85, sh: 88, p: 87 },
      },
      sts: 79,
      sat: null,
    },
    defaultConfig
  );

  assertEqual(hasilSiswaA.rataT, 84.67, "Siswa A - Rata T");
  assertEqual(hasilSiswaA.rataSH, 86.33, "Siswa A - Rata SH");
  assertEqual(hasilSiswaA.rataP, 84.67, "Siswa A - Rata P");
  assertEqual(hasilSiswaA.pengetahuanSTS, 84.08, "Siswa A - Pengetahuan STS");
  assertEqual(hasilSiswaA.nilaiAkhirSTS, 84.38, "Siswa A - Nilai Akhir STS");
  assertEqual(hasilSiswaA.nilaiRapor, 84, "Siswa A - Nilai Rapor");
  assertEqual(hasilSiswaA.predikat, "B", "Siswa A - Predikat");
  assertEqual(hasilSiswaA.pengetahuanSAS, null, "Siswa A - Pengetahuan SAS harus null karena SAT kosong");
  assertEqual(hasilSiswaA.nilaiAkhirSAS, null, "Siswa A - Nilai Akhir SAS harus null karena SAT kosong");
  assertEqual(hasilSiswaA.isBelowKKM, false, "Siswa A - Tidak di bawah KKM");
  passed += 10;
  details.push("PASS: Kasus Uji Siswa A (Rata T=84,67; Rata SH=86,33; Rata P=84,67; Peng STS=84,08; NA STS=84,38; Rapor=84; Predikat=B)");

  // =========================================================================
  // KASUS UJI 2 (Siswa B - semua nilai kosong, semua hasil tampil "-"):
  // =========================================================================
  const hasilSiswaB = hitungAkumulasiSiswa({}, defaultConfig);

  assertEqual(hasilSiswaB.perBab[1].rataBab, null, "Siswa B - Rata Bab 1 harus null");
  assertEqual(hasilSiswaB.rataT, null, "Siswa B - Rata T harus null");
  assertEqual(hasilSiswaB.rataSH, null, "Siswa B - Rata SH harus null");
  assertEqual(hasilSiswaB.rataP, null, "Siswa B - Rata P harus null");
  assertEqual(hasilSiswaB.pengetahuanSTS, null, "Siswa B - Pengetahuan STS harus null");
  assertEqual(hasilSiswaB.pengetahuanSAS, null, "Siswa B - Pengetahuan SAS harus null");
  assertEqual(hasilSiswaB.nilaiAkhirSTS, null, "Siswa B - Nilai Akhir STS harus null");
  assertEqual(hasilSiswaB.nilaiAkhirSAS, null, "Siswa B - Nilai Akhir SAS harus null");
  assertEqual(hasilSiswaB.nilaiRapor, null, "Siswa B - Nilai Rapor harus null");
  assertEqual(hasilSiswaB.predikat, null, "Siswa B - Predikat harus null");
  assertEqual(hasilSiswaB.isBelowKKM, false, "Siswa B - isBelowKKM false untuk nilai kosong");
  passed += 11;
  details.push("PASS: Kasus Uji Siswa B (Semua nilai kosong menghasilkan null / '-')");

  // =========================================================================
  // KASUS UJI 3 (Siswa C - T=70, SH=70, P=70, STS=70, SAT=70 -> < 73, Predikat D & merah):
  // =========================================================================
  const hasilSiswaC = hitungAkumulasiSiswa(
    {
      bab: {
        "1": { t: 70, sh: 70, p: 70 },
        "2": { t: 70, sh: 70, p: 70 },
        "3": { t: 70, sh: 70, p: 70 },
      },
      sts: 70,
      sat: 70,
    },
    defaultConfig
  );

  assertEqual(hasilSiswaC.rataT, 70, "Siswa C - Rata T");
  assertEqual(hasilSiswaC.rataSH, 70, "Siswa C - Rata SH");
  assertEqual(hasilSiswaC.rataP, 70, "Siswa C - Rata P");
  assertEqual(hasilSiswaC.pengetahuanSTS, 70, "Siswa C - Pengetahuan STS");
  assertEqual(hasilSiswaC.pengetahuanSAS, 70, "Siswa C - Pengetahuan SAS");
  assertEqual(hasilSiswaC.nilaiAkhirSTS, 70, "Siswa C - Nilai Akhir STS");
  assertEqual(hasilSiswaC.nilaiAkhirSAS, 70, "Siswa C - Nilai Akhir SAS");
  assertEqual(hasilSiswaC.nilaiRapor, 70, "Siswa C - Nilai Rapor");
  assertEqual(hasilSiswaC.predikat, "D", "Siswa C - Predikat D");
  assertEqual(hasilSiswaC.isBelowKKM, true, "Siswa C - Ditandai merah (di bawah 73)");
  passed += 10;
  details.push("PASS: Kasus Uji Siswa C (Nilai 70 menghasilkan Rapor=70, Predikat=D, isBelowKKM=true)");

  // =========================================================================
  // KASUS UJI 4: Perbedaan Sel Kosong vs Nilai 0
  // =========================================================================
  assertEqual(hitungRataBab(80, null), 80, "Rata Bab jika SH kosong memakai T saja");
  assertEqual(hitungRataBab(null, 90), 90, "Rata Bab jika T kosong memakai SH saja");
  assertEqual(hitungRataBab(80, 0), 40, "Rata Bab jika SH bernilai 0 ikut dihitung (80+0)/2 = 40");
  assertEqual(hitungRataRataTerisi([80, null, 100]), 90, "Rata-rata mengabaikan null");
  assertEqual(hitungRataRataTerisi([80, 0, 100]), 60, "Rata-rata menyertakan angka 0");
  passed += 5;
  details.push("PASS: Kasus Uji Sel Kosong vs Nilai 0");

  // =========================================================================
  // KASUS UJI 5: Legger (3.x dan 4.x) & Ringkasan Kelas & Validasi Input
  // =========================================================================
  const leggerA = hitungLeggerSiswa(hasilSiswaA, 4);
  assertEqual(leggerA.length, 4, "Jumlah item legger sesuai jumlahBab aktif (4)");
  assertEqual(leggerA[0].kodePengetahuan, "3.1", "Kode pengetahuan bab 1");
  assertEqual(leggerA[0].nilaiPengetahuan, 82, "Nilai 3.1 Siswa A = (79+85)/2 = 82");
  assertEqual(leggerA[0].kodeKeterampilan, "4.1", "Kode keterampilan bab 1");
  assertEqual(leggerA[0].nilaiKeterampilan, 80, "Nilai 4.1 Siswa A = 80");
  assertEqual(leggerA[3].nilaiPengetahuan, null, "Nilai 3.4 Siswa A kosong");

  const ringkasan = hitungRingkasanKelas([hasilSiswaA, hasilSiswaB, hasilSiswaC]);
  assertEqual(ringkasan.rataRataNilaiRapor, 77, "Rata-rata kelas (84 + 70) / 2 = 77");
  assertEqual(ringkasan.nilaiTertinggi, 84, "Nilai tertinggi = 84");
  assertEqual(ringkasan.nilaiTerendah, 70, "Nilai terendah = 70");
  assertEqual(ringkasan.jumlahDiBawahKKM, 1, "Jumlah siswa di bawah 73 = 1 (Siswa C)");

  assertEqual(parseAndValidateCellInput("85,5").valid, true, "Input desimal koma valid");
  assertEqual(parseAndValidateCellInput("85,5").value, 85.5, "Nilai desimal koma = 85.5");
  assertEqual(parseAndValidateCellInput("105").valid, false, "Input > 100 ditolak");
  assertEqual(parseAndValidateCellInput("-5").valid, false, "Input < 0 ditolak");
  assertEqual(parseAndValidateCellInput("abc").valid, false, "Input huruf ditolak");
  passed += 15;
  details.push("PASS: Kasus Uji Legger, Ringkasan Kelas, dan Validasi Input");

  return { passed, details };
}

// Allow direct CLI execution via tsx
if (typeof process !== "undefined" && process.argv?.[1]?.includes("hitungNilai.test")) {
  const result = runHitungNilaiTests();
  for (const line of result.details) {
    console.log(line);
  }
  console.log(`Total assertions passed: ${result.passed}`);
}
