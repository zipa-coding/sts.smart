export type SemesterType = "Ganjil" | "Genap";

export type PredikatNilai = "A" | "B" | "C" | "D";

export type ModeRataKomponen =
  | "bab_terisi"
  | "semua_bab_cakupan"
  | "pembagi_tetap";

export type ModeNilaiAkhir = "bobot_langsung" | "gabungan_praktek";

export type PerlakuanKosongUjian =
  | "proporsional"
  | "kosong_jadi_nol"
  | "wajib_lengkap";

export interface KonfigurasiRumus {
  // Rumus Rata-rata Tugas (Rata T)
  modeRataT: ModeRataKomponen;
  pembagiTetapT: number;

  // Rumus Rata-rata Sumatif Harian (Rata SH)
  modeRataSH: ModeRataKomponen;
  pembagiTetapSH: number;

  // Rumus Rata-rata Praktek (Rata P)
  modeRataP: ModeRataKomponen;
  pembagiTetapP: number;

  // Rumus Rata Bab (3.x)
  modeRataBab: "t_dan_sh" | "sh_saja" | "t_saja";

  // Nilai STS dan Nilai SAT adalah NILAI MURNI (tanpa rumus)

  // Rumus Nilai Akhir Siswa:
  // Default: ((2 * Rata SH) + (1 * Rata T) + (1 * Nilai SAT) + (1 * Nilai STS)) / 5
  modeNilaiAkhir: ModeNilaiAkhir;
  bobotRataSH: number; // default: 2
  bobotRataT: number; // default: 1
  bobotSAT: number; // default: 1
  bobotSTS: number; // default: 1
  bobotRataP: number; // default: 0
  pembagiNilaiAkhir: number; // default: 5
  gunakanPembagiOtomatis: boolean; // default: false (pakai pembagiNilaiAkhir = 5)
  perlakuanKosongUjian: PerlakuanKosongUjian; // default: "proporsional"
}

export const DEFAULT_KONFIGURASI_RUMUS: KonfigurasiRumus = {
  modeRataT: "bab_terisi",
  pembagiTetapT: 6,
  modeRataSH: "bab_terisi",
  pembagiTetapSH: 6,
  modeRataP: "bab_terisi",
  pembagiTetapP: 6,
  modeRataBab: "t_dan_sh",
  modeNilaiAkhir: "bobot_langsung",
  bobotRataSH: 2,
  bobotRataT: 1,
  bobotSAT: 1,
  bobotSTS: 1,
  bobotRataP: 0,
  pembagiNilaiAkhir: 5,
  gunakanPembagiOtomatis: false,
  perlakuanKosongUjian: "proporsional",
};

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
  rumus?: Partial<KonfigurasiRumus>;
}

export interface HasilPerBab {
  bab: number;
  t: number | null;
  sh: number | null;
  rataBab: number | null; // 3.x (Pengetahuan bab ke-x)
  p: number | null; // 4.x (Praktek bab ke-x)
}

export interface HasilHitungSiswa {
  perBab: Record<number, HasilPerBab>;
  sts: number | null; // Nilai Murni STS
  sat: number | null; // Nilai Murni SAT
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
  // Nilai Pengetahuan & Nilai Akhir Siswa
  pengetahuanSTS: number | null;
  pengetahuanSAS: number | null;
  nilaiAkhirSTS: number | null;
  nilaiAkhirSAS: number | null;
  nilaiAkhir: number | null; // Nilai Akhir Siswa utama sesuai rumus aktif
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
 * Menormalkan objek KonfigurasiRumus agar selalu memiliki nilai valid.
 */
export function normalizeKonfigurasiRumus(
  raw?: Partial<KonfigurasiRumus> | null
): KonfigurasiRumus {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_KONFIGURASI_RUMUS };
  }

  const validModeRata = (v: unknown): ModeRataKomponen =>
    v === "semua_bab_cakupan" || v === "pembagi_tetap" ? v : "bab_terisi";

  const validPembagiTetap = (v: unknown, fallback = 6): number => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 && n <= 20 ? Math.round(n) : fallback;
  };

  const validBobot = (v: unknown, fallback: number): number => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 20 ? round2(n) : fallback;
  };

  const bobotRataSH = validBobot(raw.bobotRataSH, DEFAULT_KONFIGURASI_RUMUS.bobotRataSH);
  const bobotRataT = validBobot(raw.bobotRataT, DEFAULT_KONFIGURASI_RUMUS.bobotRataT);
  const bobotSAT = validBobot(raw.bobotSAT, DEFAULT_KONFIGURASI_RUMUS.bobotSAT);
  const bobotSTS = validBobot(raw.bobotSTS, DEFAULT_KONFIGURASI_RUMUS.bobotSTS);
  const bobotRataP = validBobot(raw.bobotRataP, DEFAULT_KONFIGURASI_RUMUS.bobotRataP);

  const gunakanPembagiOtomatis = Boolean(raw.gunakanPembagiOtomatis);
  const totalBobot = round2(bobotRataSH + bobotRataT + bobotSAT + bobotSTS + bobotRataP);
  const rawPembagi = Number(raw.pembagiNilaiAkhir);
  const pembagiManual =
    Number.isFinite(rawPembagi) && rawPembagi > 0 && rawPembagi <= 100
      ? round2(rawPembagi)
      : DEFAULT_KONFIGURASI_RUMUS.pembagiNilaiAkhir;

  return {
    modeRataT: validModeRata(raw.modeRataT),
    pembagiTetapT: validPembagiTetap(raw.pembagiTetapT, 6),
    modeRataSH: validModeRata(raw.modeRataSH),
    pembagiTetapSH: validPembagiTetap(raw.pembagiTetapSH, 6),
    modeRataP: validModeRata(raw.modeRataP),
    pembagiTetapP: validPembagiTetap(raw.pembagiTetapP, 6),
    modeRataBab:
      raw.modeRataBab === "sh_saja" || raw.modeRataBab === "t_saja"
        ? raw.modeRataBab
        : "t_dan_sh",
    modeNilaiAkhir:
      raw.modeNilaiAkhir === "gabungan_praktek"
        ? "gabungan_praktek"
        : "bobot_langsung",
    bobotRataSH,
    bobotRataT,
    bobotSAT,
    bobotSTS,
    bobotRataP,
    pembagiNilaiAkhir: gunakanPembagiOtomatis
      ? totalBobot > 0
        ? totalBobot
        : 5
      : pembagiManual,
    gunakanPembagiOtomatis,
    perlakuanKosongUjian:
      raw.perlakuanKosongUjian === "kosong_jadi_nol" ||
      raw.perlakuanKosongUjian === "wajib_lengkap"
        ? raw.perlakuanKosongUjian
        : "proporsional",
  };
}

/**
 * Menghasilkan teks deskripsi rumus Nilai Akhir Siswa yang mudah dibaca oleh guru.
 */
export function formatRumusNilaiAkhirText(rumus?: Partial<KonfigurasiRumus> | null): string {
  const r = normalizeKonfigurasiRumus(rumus);
  if (r.modeNilaiAkhir === "gabungan_praktek") {
    return "((Pengetahuan + Rata Praktek) / 2), di mana Pengetahuan = ((2 × Rata SH) + Rata T + SAT + STS) / 5";
  }

  const parts: string[] = [];
  if (r.bobotRataSH > 0) {
    parts.push(
      r.bobotRataSH === 1
        ? "Rata-rata Sumatif Harian"
        : `(${r.bobotRataSH} × Rata-rata Sumatif Harian)`
    );
  }
  if (r.bobotRataT > 0) {
    parts.push(
      r.bobotRataT === 1 ? "Rata-rata Tugas" : `(${r.bobotRataT} × Rata-rata Tugas)`
    );
  }
  if (r.bobotRataP > 0) {
    parts.push(
      r.bobotRataP === 1 ? "Rata-rata Praktek" : `(${r.bobotRataP} × Rata-rata Praktek)`
    );
  }
  if (r.bobotSAT > 0) {
    parts.push(r.bobotSAT === 1 ? "Nilai SAT" : `(${r.bobotSAT} × Nilai SAT)`);
  }
  if (r.bobotSTS > 0) {
    parts.push(r.bobotSTS === 1 ? "Nilai STS" : `(${r.bobotSTS} × Nilai STS)`);
  }

  const pembagi = r.gunakanPembagiOtomatis
    ? round2(r.bobotRataSH + r.bobotRataT + r.bobotRataP + r.bobotSAT + r.bobotSTS) || 5
    : r.pembagiNilaiAkhir;

  if (parts.length === 0) {
    return "((2 × Rata-rata Sumatif Harian) + Rata-rata Tugas + Nilai SAT + Nilai STS) / 5";
  }
  return `(${parts.join(" + ")}) / ${pembagi}`;
}

/**
 * Menghasilkan teks penjelasan singkat untuk mode rata-rata komponen (Tugas / SH / Praktek).
 */
export function formatRumusRataKomponenLabel(
  namaKomponen: string,
  mode: ModeRataKomponen,
  pembagiTetap: number,
  jumlahBabCakupan: number
): string {
  if (mode === "semua_bab_cakupan") {
    return `Jumlah ${namaKomponen} ÷ ${jumlahBabCakupan} Bab Cakupan`;
  }
  if (mode === "pembagi_tetap") {
    return `Jumlah ${namaKomponen} ÷ ${pembagiTetap} (Pembagi Tetap)`;
  }
  return `Jumlah ${namaKomponen} ÷ Jumlah Bab Terisi`;
}

/**
 * Mengecek apakah suatu nilai merupakan angka valid dalam rentang 0 - 100.
 * Nilai kosong (null / undefined / NaN) bukan angka valid.
 * Nilai 0 adalah angka valid.
 */
export function isValidScore(val: number | null | undefined): val is number {
  return (
    typeof val === "number" &&
    !Number.isNaN(val) &&
    Number.isFinite(val) &&
    val >= 0 &&
    val <= 100
  );
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
 * Menghitung Rata Bab (Pengetahuan per bab):
 * Default ("t_dan_sh"): Rata Bab = (T + SH) / 2. Jika salah satu kosong, pakai yang terisi saja.
 * Jika keduanya kosong, kembalikan null.
 */
export function hitungRataBab(
  t: number | null | undefined,
  sh: number | null | undefined,
  mode: "t_dan_sh" | "sh_saja" | "t_saja" = "t_dan_sh"
): number | null {
  const hasT = isValidScore(t);
  const hasSH = isValidScore(sh);

  if (mode === "sh_saja") {
    return hasSH ? round2(sh) : null;
  }
  if (mode === "t_saja") {
    return hasT ? round2(t) : null;
  }

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
export function hitungRataRataTerisi(
  values: Array<number | null | undefined>
): number | null {
  const validValues = values.filter(isValidScore);
  if (validValues.length === 0) {
    return null;
  }
  const total = validValues.reduce((sum, item) => sum + item, 0);
  return round2(total / validValues.length);
}

/**
 * Menghitung rata-rata komponen (Tugas / Sumatif Harian / Praktek) sesuai pengaturan rumus:
 * - "bab_terisi": Jumlah nilai terisi / Jumlah bab yang terisi
 * - "semua_bab_cakupan": Jumlah nilai terisi / Total bab dalam cakupan (jika minimal 1 bab terisi)
 * - "pembagi_tetap": Jumlah nilai terisi / pembagiTetap (jika minimal 1 bab terisi)
 */
export function hitungRataKomponenDenganRumus(
  values: Array<number | null | undefined>,
  mode: ModeRataKomponen = "bab_terisi",
  pembagiTetap = 6
): number | null {
  const validValues = values.filter(isValidScore);
  if (validValues.length === 0) {
    return null;
  }
  const total = validValues.reduce((sum, item) => sum + item, 0);

  if (mode === "semua_bab_cakupan") {
    const divisor = Math.max(1, values.length);
    return round2(total / divisor);
  }
  if (mode === "pembagi_tetap") {
    const divisor = Math.max(1, pembagiTetap);
    return round2(total / divisor);
  }
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
 * Pengetahuan SAS = ((2 * Rata SH) + Rata T + SAT + STS) / 5
 * Jika salah satu komponen belum terisi (null), kembalikan null.
 */
export function hitungPengetahuanSAS(
  rataT: number | null,
  rataSH: number | null,
  sts: number | null | undefined,
  sat: number | null | undefined
): number | null {
  if (
    rataT === null ||
    rataSH === null ||
    !isValidScore(sts) ||
    !isValidScore(sat)
  ) {
    return null;
  }
  return round2((2 * rataSH + rataT + sat + sts) / 5);
}

/**
 * Menghitung Nilai Akhir dari gabungan Pengetahuan dan Rata Praktek:
 * Nilai Akhir = (Pengetahuan + Rata P) / 2
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
 * Menghitung Nilai Akhir Siswa berdasarkan KonfigurasiRumus.
 * Rumus standar sekolah:
 * Nilai Akhir Siswa = ((2 * Rata SH) + Rata T + Nilai SAT + Nilai STS) / 5
 */
export function hitungNilaiAkhirDenganRumus(params: {
  rataT: number | null;
  rataSH: number | null;
  rataP: number | null;
  sts: number | null;
  sat: number | null;
  target: "STS" | "SAS";
  rumus: KonfigurasiRumus;
}): number | null {
  const { rataT, rataSH, rataP, sts, sat, target, rumus } = params;

  // Mode 2: Gabungan Pengetahuan + Praktek
  if (rumus.modeNilaiAkhir === "gabungan_praktek") {
    if (target === "STS") {
      const pengSTS = hitungPengetahuanSTS(rataT, rataSH, sts);
      return hitungNilaiAkhir(pengSTS, rataP);
    }
    const pengSAS = hitungPengetahuanSAS(rataT, rataSH, sts, sat);
    return hitungNilaiAkhir(pengSAS, rataP);
  }

  // Mode 1 (Default): Rumus Bobot Langsung
  // Default: ((2 * Rata SH) + (1 * Rata T) + (1 * Nilai SAT) + (1 * Nilai STS)) / 5
  const bSH = rumus.bobotRataSH;
  const bT = rumus.bobotRataT;
  const bP = rumus.bobotRataP;
  const bSTS = rumus.bobotSTS;
  const bSAT = target === "SAS" ? rumus.bobotSAT : 0;

  // Untuk target STS (tengah semester):
  if (target === "STS") {
    if (rumus.perlakuanKosongUjian === "kosong_jadi_nol") {
      const hasAny = rataT !== null || rataSH !== null || sts !== null || (bP > 0 && rataP !== null);
      if (!hasAny) return null;
      const sumBobotSTS = bSH + bT + bP + bSTS;
      const divisor = sumBobotSTS > 0 ? sumBobotSTS : 4;
      const numerator =
        bSH * (rataSH ?? 0) +
        bT * (rataT ?? 0) +
        bP * (rataP ?? 0) +
        bSTS * (sts ?? 0);
      return round2(numerator / divisor);
    }

    // Default STS: butuh komponen yang berbobot > 0 terisi
    if (bSH > 0 && rataSH === null) return null;
    if (bT > 0 && rataT === null) return null;
    if (bP > 0 && rataP === null) return null;
    if (bSTS > 0 && sts === null) return null;

    const sumBobotSTS = bSH + bT + bP + bSTS;
    const divisor = sumBobotSTS > 0 ? sumBobotSTS : 4;
    const numerator =
      bSH * (rataSH ?? 0) +
      bT * (rataT ?? 0) +
      bP * (rataP ?? 0) +
      bSTS * (sts ?? 0);
    return round2(numerator / divisor);
  }

  // Untuk target SAS (Nilai Akhir Siswa):
  const divisorSAS = rumus.gunakanPembagiOtomatis
    ? round2(bSH + bT + bP + bSAT + bSTS) || 5
    : rumus.pembagiNilaiAkhir > 0
    ? rumus.pembagiNilaiAkhir
    : 5;

  if (rumus.perlakuanKosongUjian === "kosong_jadi_nol") {
    const hasAny =
      rataT !== null ||
      rataSH !== null ||
      sts !== null ||
      sat !== null ||
      (bP > 0 && rataP !== null);
    if (!hasAny) return null;

    const numerator =
      bSH * (rataSH ?? 0) +
      bT * (rataT ?? 0) +
      bP * (rataP ?? 0) +
      bSAT * (sat ?? 0) +
      bSTS * (sts ?? 0);
    return round2(numerator / divisorSAS);
  }

  // Untuk "proporsional" atau "wajib_lengkap", komponen SAS dihitung jika komponen berbobot > 0 sudah terisi
  if (bSH > 0 && rataSH === null) return null;
  if (bT > 0 && rataT === null) return null;
  if (bP > 0 && rataP === null) return null;
  if (bSTS > 0 && sts === null) return null;
  if (bSAT > 0 && sat === null) return null;

  const numerator =
    bSH * (rataSH ?? 0) +
    bT * (rataT ?? 0) +
    bP * (rataP ?? 0) +
    bSAT * (sat ?? 0) +
    bSTS * (sts ?? 0);
  return round2(numerator / divisorSAS);
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
export function tentukanPredikat(
  nilaiRaporBulat: number | null
): PredikatNilai | null {
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
export function normalizeCakupan(
  cakupan: number[],
  jumlahBab: number
): number[] {
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
  const rumus = normalizeKonfigurasiRumus(konfigurasi.rumus);

  const perBab: Record<number, HasilPerBab> = {};
  const babMap = input?.bab ?? {};

  for (let b = 1; b <= jumlahBab; b++) {
    const rawBab = babMap[String(b)];
    const tVal = isValidScore(rawBab?.t) ? round2(rawBab.t) : null;
    const shVal = isValidScore(rawBab?.sh) ? round2(rawBab.sh) : null;
    const pVal = isValidScore(rawBab?.p) ? round2(rawBab.p) : null;
    const rataBab = hitungRataBab(tVal, shVal, rumus.modeRataBab);

    perBab[b] = {
      bab: b,
      t: tVal,
      sh: shVal,
      rataBab,
      p: pVal,
    };
  }

  // Nilai STS dan Nilai SAT adalah NILAI MURNI (tidak ada rumus)
  const stsVal = isValidScore(input?.sts) ? round2(input.sts) : null;
  const satVal = isValidScore(input?.sat) ? round2(input.sat) : null;

  // Agregat untuk STS sesuai pengaturan rumus (Rata T, Rata SH, Rata P)
  const rataT_STS = hitungRataKomponenDenganRumus(
    cakupanSTS.map((b) => perBab[b]?.t),
    rumus.modeRataT,
    rumus.pembagiTetapT
  );
  const rataSH_STS = hitungRataKomponenDenganRumus(
    cakupanSTS.map((b) => perBab[b]?.sh),
    rumus.modeRataSH,
    rumus.pembagiTetapSH
  );
  const rataP_STS = hitungRataKomponenDenganRumus(
    cakupanSTS.map((b) => perBab[b]?.p),
    rumus.modeRataP,
    rumus.pembagiTetapP
  );

  // Agregat untuk SAS sesuai pengaturan rumus (Rata T, Rata SH, Rata P)
  const rataT_SAS = hitungRataKomponenDenganRumus(
    cakupanSAS.map((b) => perBab[b]?.t),
    rumus.modeRataT,
    rumus.pembagiTetapT
  );
  const rataSH_SAS = hitungRataKomponenDenganRumus(
    cakupanSAS.map((b) => perBab[b]?.sh),
    rumus.modeRataSH,
    rumus.pembagiTetapSH
  );
  const rataP_SAS = hitungRataKomponenDenganRumus(
    cakupanSAS.map((b) => perBab[b]?.p),
    rumus.modeRataP,
    rumus.pembagiTetapP
  );

  // Pengetahuan STS & SAS
  const pengetahuanSTS = hitungPengetahuanSTS(rataT_STS, rataSH_STS, stsVal);
  const pengetahuanSAS = hitungPengetahuanSAS(
    rataT_SAS,
    rataSH_SAS,
    stsVal,
    satVal
  );

  // Nilai Akhir STS & Nilai Akhir SAS sesuai rumus aktif
  const nilaiAkhirSTS = hitungNilaiAkhirDenganRumus({
    rataT: rataT_STS,
    rataSH: rataSH_STS,
    rataP: rataP_STS,
    sts: stsVal,
    sat: satVal,
    target: "STS",
    rumus,
  });

  const nilaiAkhirSAS = hitungNilaiAkhirDenganRumus({
    rataT: rataT_SAS,
    rataSH: rataSH_SAS,
    rataP: rataP_SAS,
    sts: stsVal,
    sat: satVal,
    target: "SAS",
    rumus,
  });

  // Nilai Rapor & Predikat masing-masing
  const nilaiRaporSTS = hitungNilaiRapor(nilaiAkhirSTS);
  const predikatSTS = tentukanPredikat(nilaiRaporSTS);

  const nilaiRaporSAS = hitungNilaiRapor(nilaiAkhirSAS);
  const predikatSAS = tentukanPredikat(nilaiRaporSAS);

  // Penentuan Nilai Akhir Siswa utama:
  // - Jika mode "wajib_lengkap", hanya gunakan nilaiAkhirSAS (ketika seluruh komponen SAS lengkap)
  // - Jika mode "proporsional" atau "kosong_jadi_nol", gunakan nilaiAkhirSAS jika tersedia, atau fallback ke nilaiAkhirSTS saat SAT belum diisi
  const useSAS =
    rumus.perlakuanKosongUjian === "kosong_jadi_nol" ||
    rumus.perlakuanKosongUjian === "wajib_lengkap" ||
    (satVal !== null && nilaiAkhirSAS !== null);

  const rataT = useSAS ? rataT_SAS : (rataT_STS ?? rataT_SAS);
  const rataSH = useSAS ? rataSH_SAS : (rataSH_STS ?? rataSH_SAS);
  const rataP = useSAS ? rataP_SAS : (rataP_STS ?? rataP_SAS);

  const nilaiAkhir =
    rumus.perlakuanKosongUjian === "wajib_lengkap"
      ? nilaiAkhirSAS
      : nilaiAkhirSAS !== null
      ? nilaiAkhirSAS
      : nilaiAkhirSTS;

  const nilaiRapor = hitungNilaiRapor(nilaiAkhir);
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
    nilaiAkhir,
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
export function hitungRingkasanKelas(
  hasilSiswaList: HasilHitungSiswa[]
): RingkasanKelas {
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
  const jumlahDiBawahKKM = nilaiRaporValid.filter(
    (v) => v < KKM_DEFAULT
  ).length;

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
