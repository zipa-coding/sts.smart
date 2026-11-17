export type PredikatNilai = "A" | "B" | "C";

/**
 * Konstanta batas predikat nilai:
 * - Nilai > 91        = A (Sangat Baik)
 * - Nilai >= 80..91   = B (Baik)
 * - Nilai < 80        = C (Cukup)
 */
export const BATAS_ATAS_PREDIKAT_B = 91; // Nilai > 91 -> A
export const BATAS_MIN_PREDIKAT_B = 80; // Nilai >= 80 -> B, < 80 -> C

// KKM mata pelajaran, dikunci 80 dan berlaku di seluruh aplikasi, tidak dapat diubah pengguna
export const KKM_DEFAULT = 80;
// Status unggul/pengayaan, sama dengan batas predikat A
export const BATAS_UNGGUL = 91;

export const RENTANG_PREDIKAT_A = "> 91 = A (Sangat Baik)";
export const RENTANG_PREDIKAT_B = "80 - 91 = B (Baik)";
export const RENTANG_PREDIKAT_C = "< 80 = C (Cukup)";

export const KETERANGAN_RENTANG_PREDIKAT =
  "> 91 = A (Sangat Baik) | 80 - 91 = B (Baik) | < 80 = C (Cukup)";

export const KETERANGAN_RENTANG_PREDIKAT_LIST: readonly string[] = [
  RENTANG_PREDIKAT_A,
  RENTANG_PREDIKAT_B,
  RENTANG_PREDIKAT_C,
];

/**
 * Menentukan predikat ("A" | "B" | "C" | null) dari nilai angka atau string numerik.
 * - Nilai > 91 = "A"
 * - Nilai >= 80 dan <= 91 = "B"
 * - Nilai < 80 = "C"
 * - null, undefined, string kosong, atau NaN mengembalikan null.
 * - Tidak melakukan pembulatan nilai.
 */
export function tentukanPredikat(
  nilai: number | string | null | undefined
): PredikatNilai | null {
  if (nilai === null || nilai === undefined) {
    return null;
  }
  if (typeof nilai === "string") {
    const trimmed = nilai.trim();
    if (trimmed === "") {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
      return null;
    }
    if (parsed > BATAS_ATAS_PREDIKAT_B) return "A";
    if (parsed >= BATAS_MIN_PREDIKAT_B) return "B";
    return "C";
  }
  if (typeof nilai === "number") {
    if (!Number.isFinite(nilai) || Number.isNaN(nilai)) {
      return null;
    }
    if (nilai > BATAS_ATAS_PREDIKAT_B) return "A";
    if (nilai >= BATAS_MIN_PREDIKAT_B) return "B";
    return "C";
  }
  return null;
}

/**
 * Mengembalikan label lengkap dari huruf predikat:
 * - "A" -> "A (Sangat Baik)"
 * - "B" -> "B (Baik)"
 * - "C" -> "C (Cukup)"
 */
export function labelPredikat(
  p: PredikatNilai | string | null | undefined,
  emptyLabel: string = "-"
): string {
  if (p === "A") return "A (Sangat Baik)";
  if (p === "B") return "B (Baik)";
  if (p === "C") return "C (Cukup)";
  return emptyLabel;
}

/**
 * Menentukan predikat dari nilai angka lalu mengembalikan label lengkapnya:
 * "A (Sangat Baik)", "B (Baik)", "C (Cukup)", atau emptyLabel jika nilai kosong/tidak valid.
 */
export function tentukanPredikatLabel(
  nilai: number | string | null | undefined,
  emptyLabel: string = "-"
): string {
  const pred = tentukanPredikat(nilai);
  if (!pred) return emptyLabel;
  return labelPredikat(pred, emptyLabel);
}
