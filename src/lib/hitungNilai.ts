export type SemesterType = "Ganjil" | "Genap";

export type PredikatNilai = "A" | "B" | "C" | "D";

export interface NilaiBabInput {
  t?: number | null;
  sh?: number | null;
  p?: number | null;
}

export interface NilaiSiswaInput {
  bab?: Record<string, NilaiBabInput>;
  sts?: number | null;
  sat?: number | null;
}

export interface KonfigurasiCakupan {
  jumlahBab: number; // 1 - 7
  cakupanSTS: number[]; // e.g., [1, 2, 3]
  cakupanSAS: number[]; // e.g., [1, 2, 3, 4, 5, 6]
}

export interface HasilPerBab {
  bab: number;
  t: number | null;
  sh: number | null;
  rataBab: number | null; // 3.x (Pengetahuan bab ke-x)
  p: number | null;       // 4.x (Praktek bab ke-x)
}

export interface HasilHitungSiswa {
  perBab: Record<number, HasilPerBab>;
  sts: number | null;
  sat: number | null;
  // Agregat sesuai cakupan STS
  rataT_STS: number | null;
  rataSH_STS: number | null;
  rataP_STS: number | null;
  // Agregat sesuai cakupan SAS
  rataT_SAS: number | null;
  rataSH_SAS: number | null;
  rataP_SAS: number | null;
  // Agregat utama untuk ditampilkan di kolom Rata T, Rata SH, Rata P
  rataT: number | null;
  rataSH: number | null;
  rataP: number | null;
  // Nilai Pengetahuan & Nilai Akhir
  pengetahuanSTS: number | null;
  pengetahuanSAS: number | null;
  nilaiAkhirSTS: number | null;
  nilaiAkhirSAS: number | null;
  // Nilai Rapor & Predikat
  nilaiRaporSTS: number | null;
  predikatSTS: PredikatNilai | null;
  nilaiRaporSAS: number | null;
  predikatSAS: PredikatNilai | null;
  nilaiRapor: number | null;
  predikat: PredikatNilai | null;
  isBelowKKM: boolean;
}

export interface LeggerItem {
  bab: number;
  kodePengetahuan: string; // "3.1", "3.2", ...
  nilaiPengetahuan: number | null;
  kodeKeterampilan: string; // "4.1", "4.2", ...
  nilaiKeterampilan: number | null;
}

export interface RingkasanKelas {
  rataRataNilaiRapor: number | null;
  nilaiTertinggi: number | null;
  nilaiTerendah: number | null;
  jumlahDiBawahKKM: number;
  jumlahSiswaTerhitung: number;
  totalSiswa: number;
}

export const KKM_DEFAULT = 73;

/**
 * Mengecek apakah suatu nilai merupakan angka valid dalam rentang 0 - 100.
 * Nilai kosong (null / undefined / NaN) bukan angka valid.
 * Nilai 0 adalah angka valid.
 */
export function isValidScore(val: number | null | undefined): val is number {
  return typeof val === "number" && !Number.isNaN(val) && Number.isFinite(val) && val >= 0 && val <= 100;
}

/**
 * Membulatkan angka ke 2 desimal secara presisi (menghindari floating point drift).
 */
export function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Memformat angka ke tampilan tabel 2 angka desimal (atau "-" jika null).
 */
export function formatScore2(val: number | null | undefined, useComma = true): string {
  if (val === null || val === undefined || Number.isNaN(val)) {
    return "-";
  }
  const fixed = round2(val).toFixed(2);
  return useComma ? fixed.replace(".", ",") : fixed;
}

/**
 * Memformat nilai bulat (seperti Nilai Rapor) atau "-" jika null.
 */
export function formatIntegerScore(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) {
    return "-";
  }
  return String(Math.round(val));
}

/**
 * Menghitung Rata Bab (Pengetahuan):
 * Rata Bab = (T + SH) / 2.
 * Jika salah satu kosong, pakai yang terisi saja.
 * Jika keduanya kosong, kembalikan null.
 */
export function hitungRataBab(t: number | null | undefined, sh: number | null | undefined): number | null {
  const hasT = isValidScore(t);
  const hasSH = isValidScore(sh);

  if (hasT && hasSH) {
    return round2((t + sh) / 2);
  }
  if (hasT) {
    return round2(t);
  }
  if (hasSH) {
    return round2(sh);
  }
  return null;
}

/**
 * Menghitung rata-rata dari daftar nilai yang terisi (mengabaikan null/undefined).
 * Jika tidak ada yang terisi, kembalikan null.
 */
export function hitungRataRataTerisi(values: Array<number | null | undefined>): number | null {
  const validValues = values.filter(isValidScore);
  if (validValues.length === 0) {
    return null;
  }
  const total = validValues.reduce((sum, item) => sum + item, 0);
  return round2(total / validValues.length);
}

/**
 * Menghitung Nilai Pengetahuan STS:
 * Pengetahuan STS = (Rata T + 2 * Rata SH + STS) / 4
 * Jika salah satu komponen belum terisi (null), kembalikan null.
 */
export function hitungPengetahuanSTS(
  rataT: number | null,
  rataSH: number | null,
  sts: number | null | undefined
): number | null {
  if (rataT === null || rataSH === null || !isValidScore(sts)) {
    return null;
  }
  return round2((rataT + 2 * rataSH + sts) / 4);
}

/**
 * Menghitung Nilai Pengetahuan SAS:
 * Pengetahuan SAS = (Rata T + 2 * Rata SH + STS + SAT) / 5
 * Jika salah satu komponen belum terisi (null), kembalikan null.
 */
export function hitungPengetahuanSAS(
  rataT: number | null,
  rataSH: number | null,
  sts: number | null | undefined,
  sat: number | null | undefined
): number | null {
  if (rataT === null || rataSH === null || !isValidScore(sts) || !isValidScore(sat)) {
    return null;
  }
  return round2((rataT + 2 * rataSH + sts + sat) / 5);
}

/**
 * Menghitung Nilai Akhir (STS atau SAS):
 * Nilai Akhir = (Pengetahuan + Rata P) / 2
 * Jika salah satu komponen belum terisi (null), kembalikan null.
 */
export function hitungNilaiAkhir(
  pengetahuan: number | null,
  rataP: number | null
): number | null {
  if (pengetahuan === null || rataP === null) {
    return null;
  }
  return round2((pengetahuan + rataP) / 2);
}

/**
 * Membulatkan Nilai Akhir ke bilangan bulat terdekat untuk Nilai Rapor.
 */
export function hitungNilaiRapor(nilaiAkhir: number | null): number | null {
  if (nilaiAkhir === null || Number.isNaN(nilaiAkhir)) {
    return null;
  }
  return Math.round(nilaiAkhir);
}

/**
 * Menentukan Predikat dari Nilai Rapor yang sudah dibulatkan:
 * 91–100 = A
 * 81–90  = B
 * 73–80  = C
 * < 73   = D
 */
export function tentukanPredikat(nilaiRaporBulat: number | null): PredikatNilai | null {
  if (nilaiRaporBulat === null || Number.isNaN(nilaiRaporBulat)) {
    return null;
  }
  if (nilaiRaporBulat >= 91) return "A";
  if (nilaiRaporBulat >= 81) return "B";
  if (nilaiRaporBulat >= 73) return "C";
  return "D";
}

/**
 * Menormalkan cakupan bab agar selalu berada di dalam rentang 1..jumlahBab.
 */
export function normalizeCakupan(cakupan: number[], jumlahBab: number): number[] {
  const clampedMax = Math.max(1, Math.min(7, jumlahBab));
  const valid = Array.from(
    new Set(
      cakupan.filter((b) => Number.isInteger(b) && b >= 1 && b <= clampedMax)
    )
  ).sort((a, b) => a - b);
  return valid;
}

/**
 * Fungsi utama untuk menghitung seluruh nilai akumulasi seorang siswa secara murni (pure function).
 */
export function hitungAkumulasiSiswa(
  input: NilaiSiswaInput | undefined | null,
  konfigurasi: KonfigurasiCakupan
): HasilHitungSiswa {
  const jumlahBab = Math.max(1, Math.min(7, konfigurasi.jumlahBab || 6));
  const cakupanSTS = normalizeCakupan(
    konfigurasi.cakupanSTS.length > 0 ? konfigurasi.cakupanSTS : [1, 2, 3],
    jumlahBab
  );
  const defaultSAS = Array.from({ length: jumlahBab }, (_, idx) => idx + 1);
  const cakupanSAS = normalizeCakupan(
    konfigurasi.cakupanSAS.length > 0 ? konfigurasi.cakupanSAS : defaultSAS,
    jumlahBab
  );

  const perBab: Record<number, HasilPerBab> = {};
  const babMap = input?.bab ?? {};

  for (let b = 1; b <= jumlahBab; b++) {
    const rawBab = babMap[String(b)];
    const tVal = isValidScore(rawBab?.t) ? round2(rawBab.t) : null;
    const shVal = isValidScore(rawBab?.sh) ? round2(rawBab.sh) : null;
    const pVal = isValidScore(rawBab?.p) ? round2(rawBab.p) : null;
    const rataBab = hitungRataBab(tVal, shVal);

    perBab[b] = {
      bab: b,
      t: tVal,
      sh: shVal,
      rataBab,
      p: pVal,
    };
  }

  const stsVal = isValidScore(input?.sts) ? round2(input.sts) : null;
  const satVal = isValidScore(input?.sat) ? round2(input.sat) : null;

  // Agregat untuk STS (hanya dari bab yang terisi dalam cakupanSTS)
  const rataT_STS = hitungRataRataTerisi(cakupanSTS.map((b) => perBab[b]?.t));
  const rataSH_STS = hitungRataRataTerisi(cakupanSTS.map((b) => perBab[b]?.sh));
  const rataP_STS = hitungRataRataTerisi(cakupanSTS.map((b) => perBab[b]?.p));

  // Agregat untuk SAS (hanya dari bab yang terisi dalam cakupanSAS)
  const rataT_SAS = hitungRataRataTerisi(cakupanSAS.map((b) => perBab[b]?.t));
  const rataSH_SAS = hitungRataRataTerisi(cakupanSAS.map((b) => perBab[b]?.sh));
  const rataP_SAS = hitungRataRataTerisi(cakupanSAS.map((b) => perBab[b]?.p));

  // Pengetahuan STS & SAS
  const pengetahuanSTS = hitungPengetahuanSTS(rataT_STS, rataSH_STS, stsVal);
  const pengetahuanSAS = hitungPengetahuanSAS(rataT_SAS, rataSH_SAS, stsVal, satVal);

  // Nilai Akhir STS & SAS
  const nilaiAkhirSTS = hitungNilaiAkhir(pengetahuanSTS, rataP_STS);
  const nilaiAkhirSAS = hitungNilaiAkhir(pengetahuanSAS, rataP_SAS);

  // Nilai Rapor & Predikat masing-masing
  const nilaiRaporSTS = hitungNilaiRapor(nilaiAkhirSTS);
  const predikatSTS = tentukanPredikat(nilaiRaporSTS);

  const nilaiRaporSAS = hitungNilaiRapor(nilaiAkhirSAS);
  const predikatSAS = tentukanPredikat(nilaiRaporSAS);

  // Jika SAT sudah diinput dan menghasilkan Nilai Akhir SAS, gunakan SAS sebagai Nilai Rapor utama;
  // jika belum (mis. saat periode STS), gunakan Nilai Akhir STS.
  const useSAS = satVal !== null && nilaiAkhirSAS !== null;
  const rataT = useSAS ? rataT_SAS : (rataT_STS ?? rataT_SAS);
  const rataSH = useSAS ? rataSH_SAS : (rataSH_STS ?? rataSH_SAS);
  const rataP = useSAS ? rataP_SAS : (rataP_STS ?? rataP_SAS);

  const nilaiRapor = nilaiRaporSAS !== null ? nilaiRaporSAS : nilaiRaporSTS;
  const predikat = tentukanPredikat(nilaiRapor);
  const isBelowKKM = nilaiRapor !== null && nilaiRapor < KKM_DEFAULT;

  return {
    perBab,
    sts: stsVal,
    sat: satVal,
    rataT_STS,
    rataSH_STS,
    rataP_STS,
    rataT_SAS,
    rataSH_SAS,
    rataP_SAS,
    rataT,
    rataSH,
    rataP,
    pengetahuanSTS,
    pengetahuanSAS,
    nilaiAkhirSTS,
    nilaiAkhirSAS,
    nilaiRaporSTS,
    predikatSTS,
    nilaiRaporSAS,
    predikatSAS,
    nilaiRapor,
    predikat,
    isBelowKKM,
  };
}

/**
 * Menghasilkan daftar kolom Legger (3.1, 4.1, ... sampai 3.N, 4.N) untuk bab yang aktif.
 */
export function hitungLeggerSiswa(
  hasil: HasilHitungSiswa,
  jumlahBab: number
): LeggerItem[] {
  const clampedMax = Math.max(1, Math.min(7, jumlahBab));
  const items: LeggerItem[] = [];
  for (let b = 1; b <= clampedMax; b++) {
    const babInfo = hasil.perBab[b];
    items.push({
      bab: b,
      kodePengetahuan: `3.${b}`,
      nilaiPengetahuan: babInfo ? babInfo.rataBab : null,
      kodeKeterampilan: `4.${b}`,
      nilaiKeterampilan: babInfo ? babInfo.p : null,
    });
  }
  return items;
}

/**
 * Menghitung statistik ringkasan kelas (rata-rata kelas, tertinggi, terendah, jumlah < 73).
 */
export function hitungRingkasanKelas(hasilSiswaList: HasilHitungSiswa[]): RingkasanKelas {
  const nilaiRaporValid = hasilSiswaList
    .map((h) => h.nilaiRapor)
    .filter((v): v is number => v !== null && !Number.isNaN(v));

  if (nilaiRaporValid.length === 0) {
    return {
      rataRataNilaiRapor: null,
      nilaiTertinggi: null,
      nilaiTerendah: null,
      jumlahDiBawahKKM: 0,
      jumlahSiswaTerhitung: 0,
      totalSiswa: hasilSiswaList.length,
    };
  }

  const total = nilaiRaporValid.reduce((acc, cur) => acc + cur, 0);
  const rataRataNilaiRapor = round2(total / nilaiRaporValid.length);
  const nilaiTertinggi = Math.max(...nilaiRaporValid);
  const nilaiTerendah = Math.min(...nilaiRaporValid);
  const jumlahDiBawahKKM = nilaiRaporValid.filter((v) => v < KKM_DEFAULT).length;

  return {
    rataRataNilaiRapor,
    nilaiTertinggi,
    nilaiTerendah,
    jumlahDiBawahKKM,
    jumlahSiswaTerhitung: nilaiRaporValid.length,
    totalSiswa: hasilSiswaList.length,
  };
}

/**
 * Memvalidasi string input sel dari user.
 * Mengembalikan { valid: true, value: number | null } atau { valid: false, error: string }.
 */
export function parseAndValidateCellInput(raw: string): {
  valid: boolean;
  value: number | null;
  error?: string;
} {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { valid: true, value: null };
  }

  // Izinkan koma atau titik sebagai pemisah desimal
  const normalized = trimmed.replace(",", ".");

  // Tolak jika mengandung huruf atau karakter selain angka dan satu titik desimal
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return {
      valid: false,
      value: null,
      error: "Hanya angka 0–100",
    };
  }

  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return {
      valid: false,
      value: null,
      error: "Nilai tidak valid",
    };
  }

  if (parsed < 0 || parsed > 100) {
    return {
      valid: false,
      value: null,
      error: "Rentang 0–100",
    };
  }

  return {
    valid: true,
    value: round2(parsed),
  };
}
