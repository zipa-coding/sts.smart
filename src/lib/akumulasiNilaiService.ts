import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  FieldValue,
} from "firebase/firestore";
import db, { isFirebaseConfigured, withTimeout } from "./firebase";
import {
  NilaiSiswaInput,
  SemesterType,
  KonfigurasiRumus,
  DEFAULT_KONFIGURASI_RUMUS,
  normalizeCakupan,
  normalizeKonfigurasiRumus,
} from "./hitungNilai";

export interface AkumulasiNilaiMetadata {
  tahunAjaran: string;
  semester: SemesterType;
  kelas: string; // "7" | "8" | "9"
  mapelId: string;
  jumlahBab: number; // 1..7, default 6
  cakupanSTS: number[]; // default [1, 2, 3]
  cakupanSAS: number[]; // default [1..jumlahBab]
  rumus: KonfigurasiRumus;
  principalName: string;
  teacherName: string;
  signaturePlace: string;
  signatureDate: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AkumulasiNilaiDoc extends AkumulasiNilaiMetadata {
  siswa: Record<string, NilaiSiswaInput>;
}

export type CellFieldType = "t" | "sh" | "p" | "sts" | "sat";

export interface CellPatch {
  siswaId: string;
  field: CellFieldType;
  bab?: number; // 1..7 for t, sh, p
  value: number | null; // null means empty -> deleteField()
}

const LOCAL_STORAGE_KEY = "smart_sts_akumulasi_nilai_v1";

/**
 * Menormalkan kode kelas ke angka "7", "8", atau "9" agar konsisten dengan data siswa di database,
 * serta menyediakan konversi ke angka Romawi (VII, VIII, IX) untuk tampilan dokumen.
 */
export function normalizeKelasCode(kelas: string): string {
  const clean = kelas.trim().toUpperCase();
  if (clean === "VII" || clean === "7" || clean.startsWith("7")) return "7";
  if (clean === "VIII" || clean === "8" || clean.startsWith("8")) return "8";
  if (clean === "IX" || clean === "9" || clean.startsWith("9")) return "9";
  return clean || "7";
}

export function formatKelasRomawi(kelas: string): string {
  const code = normalizeKelasCode(kelas);
  if (code === "7") return "VII";
  if (code === "8") return "VIII";
  if (code === "9") return "IX";
  return code;
}

/**
 * Membuat ID dokumen Firestore untuk koleksi `akumulasiNilai` dengan format:
 * {tahunAjaran}_{semester}_{kelas}_{mapelId}
 */
export function buildAkumulasiDocId(
  tahunAjaran: string,
  semester: SemesterType,
  kelas: string,
  mapelId: string
): string {
  const cleanTA = tahunAjaran.trim().replace(/[^a-zA-Z0-9]/g, "-");
  const cleanSem = semester.trim().replace(/[^a-zA-Z0-9]/g, "");
  const cleanKelas = formatKelasRomawi(kelas).replace(/[^a-zA-Z0-9]/g, "");
  const cleanMapel = mapelId
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `${cleanTA}_${cleanSem}_${cleanKelas}_${cleanMapel}`;
}

/**
 * Membuat bulan & tahun default bahasa Indonesia untuk tanda tangan, misal "Oktober 2026".
 */
export function getDefaultBulanTahun(): string {
  const bulanIndo = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const now = new Date();
  return `${bulanIndo[now.getMonth()]} ${now.getFullYear()}`;
}

export function createDefaultAkumulasiDoc(params: {
  tahunAjaran: string;
  semester: SemesterType;
  kelas: string;
  mapelId: string;
  principalName?: string;
  teacherName?: string;
  updatedBy?: string;
}): AkumulasiNilaiDoc {
  const jumlahBab = 6;
  return {
    tahunAjaran: params.tahunAjaran || "2026/2027",
    semester: params.semester || "Ganjil",
    kelas: normalizeKelasCode(params.kelas || "7"),
    mapelId: params.mapelId,
    jumlahBab,
    cakupanSTS: [1, 2, 3],
    cakupanSAS: [1, 2, 3, 4, 5, 6],
    rumus: { ...DEFAULT_KONFIGURASI_RUMUS },
    principalName: params.principalName || "Ari Gunawan, S.Kom.",
    teacherName: params.teacherName || params.updatedBy || "Guru Mata Pelajaran",
    signaturePlace: "Pangkalpinang",
    signatureDate: getDefaultBulanTahun(),
    updatedAt: new Date().toISOString(),
    updatedBy: params.updatedBy || params.teacherName || "Guru Mata Pelajaran",
    siswa: {},
  };
}

function readLocalCache(): Record<string, AkumulasiNilaiDoc> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, AkumulasiNilaiDoc>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalCache(docId: string, data: AkumulasiNilaiDoc): void {
  try {
    const current = readLocalCache();
    current[docId] = data;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn("Gagal menyimpan cache lokal akumulasiNilai:", e);
  }
}

function normalizeRawDoc(
  raw: Partial<AkumulasiNilaiDoc>,
  fallback: AkumulasiNilaiDoc
): AkumulasiNilaiDoc {
  const jumlahBab = Math.max(1, Math.min(7, Number(raw.jumlahBab || 6)));
  return {
    ...fallback,
    ...raw,
    tahunAjaran: raw.tahunAjaran || fallback.tahunAjaran,
    semester: (raw.semester as SemesterType) || fallback.semester,
    kelas: normalizeKelasCode(raw.kelas || fallback.kelas),
    mapelId: raw.mapelId || fallback.mapelId,
    jumlahBab,
    cakupanSTS: normalizeCakupan(
      Array.isArray(raw.cakupanSTS) ? raw.cakupanSTS : [1, 2, 3],
      jumlahBab
    ),
    cakupanSAS: normalizeCakupan(
      Array.isArray(raw.cakupanSAS)
        ? raw.cakupanSAS
        : Array.from({ length: jumlahBab }, (_, i) => i + 1),
      jumlahBab
    ),
    rumus: normalizeKonfigurasiRumus(raw.rumus),
    principalName: raw.principalName || fallback.principalName,
    teacherName: raw.teacherName || fallback.teacherName,
    signaturePlace: raw.signaturePlace || fallback.signaturePlace,
    signatureDate: raw.signatureDate || fallback.signatureDate,
    siswa: raw.siswa && typeof raw.siswa === "object" ? raw.siswa : {},
  };
}

/**
 * Mengambil dokumen akumulasiNilai dari Firestore (atau cache lokal jika belum ada / aturan belum dideploy).
 * Tidak pernah melempar error ke UI agar tabel input selalu langsung terbuka bagi guru.
 */
export async function fetchAkumulasiNilaiDoc(params: {
  tahunAjaran: string;
  semester: SemesterType;
  kelas: string;
  mapelId: string;
  principalName?: string;
  teacherName?: string;
}): Promise<AkumulasiNilaiDoc> {
  const docId = buildAkumulasiDocId(
    params.tahunAjaran,
    params.semester,
    params.kelas,
    params.mapelId
  );
  const fallback = createDefaultAkumulasiDoc(params);
  const localCache = readLocalCache();

  if (isFirebaseConfigured && db) {
    // 1. Coba baca dari koleksi utama `akumulasiNilai/{docId}`
    try {
      const ref = doc(db, "akumulasiNilai", docId);
      const snap = await withTimeout(getDoc(ref), 4000);
      if (snap.exists()) {
        const merged = normalizeRawDoc(
          snap.data() as Partial<AkumulasiNilaiDoc>,
          fallback
        );
        writeLocalCache(docId, merged);
        return merged;
      }
    } catch {
      // Lanjut ke jalur kompatibilitas cloud `settings/akumulasi_{docId}` jika rules `akumulasiNilai` belum dideploy
    }

    // 2. Coba baca dari dokumen cloud `settings/akumulasi_{docId}`
    try {
      const mirrorRef = doc(db, "settings", `akumulasi_${docId}`);
      const mirrorSnap = await withTimeout(getDoc(mirrorRef), 4000);
      if (mirrorSnap.exists()) {
        const merged = normalizeRawDoc(
          mirrorSnap.data() as Partial<AkumulasiNilaiDoc>,
          fallback
        );
        writeLocalCache(docId, merged);
        return merged;
      }
    } catch {
      // Gunakan cache lokal atau dokumen baru
    }
  }

  if (localCache[docId]) {
    return normalizeRawDoc(localCache[docId], fallback);
  }

  return fallback;
}

/**
 * Menerapkan daftar perubahan sel (CellPatch[]) ke objek AkumulasiNilaiDoc di memori client.
 * Sel yang bernilai null dihapus key-nya dari objek siswa.
 */
export function applyCellPatchesToDoc(
  currentDoc: AkumulasiNilaiDoc,
  patches: CellPatch[],
  updatedBy: string
): AkumulasiNilaiDoc {
  const nextSiswa: Record<string, NilaiSiswaInput> = { ...currentDoc.siswa };

  for (const patch of patches) {
    const existingStudent: NilaiSiswaInput = nextSiswa[patch.siswaId]
      ? {
          ...nextSiswa[patch.siswaId],
          bab: nextSiswa[patch.siswaId].bab
            ? { ...nextSiswa[patch.siswaId].bab }
            : {},
        }
      : { bab: {} };

    if (patch.field === "sts" || patch.field === "sat") {
      if (patch.value === null) {
        delete existingStudent[patch.field];
      } else {
        existingStudent[patch.field] = patch.value;
      }
    } else if (patch.bab !== undefined) {
      const babKey = String(patch.bab);
      const currentBab = existingStudent.bab?.[babKey]
        ? { ...existingStudent.bab[babKey] }
        : {};
      if (patch.value === null) {
        delete currentBab[patch.field];
      } else {
        currentBab[patch.field] = patch.value;
      }
      if (!existingStudent.bab) {
        existingStudent.bab = {};
      }
      existingStudent.bab[babKey] = currentBab;
    }

    nextSiswa[patch.siswaId] = existingStudent;
  }

  return {
    ...currentDoc,
    updatedAt: new Date().toISOString(),
    updatedBy,
    siswa: nextSiswa,
  };
}

/**
 * Helper untuk menjalankan updateDoc dengan dot-notation dan membuat dokumen awal bila belum ada.
 */
async function executeDotNotationUpdate(
  collectionName: string,
  documentId: string,
  docData: AkumulasiNilaiDoc,
  updatePayload: Record<string, number | string | FieldValue>,
  nowIso: string,
  updatedBy: string
): Promise<void> {
  if (!db) return;
  const ref = doc(db, collectionName, documentId);
  try {
    await withTimeout(updateDoc(ref, updatePayload), 5000);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (
      errMsg.includes("No document to update") ||
      errMsg.includes("not-found") ||
      errMsg.includes("NOT_FOUND")
    ) {
      const initialDoc = {
        principalName: docData.principalName || "Ari Gunawan, S.Kom.",
        principalNip: "",
        tahunAjaran: docData.tahunAjaran,
        semester: docData.semester,
        kelas: docData.kelas,
        mapelId: docData.mapelId,
        jumlahBab: docData.jumlahBab,
        cakupanSTS: docData.cakupanSTS,
        cakupanSAS: docData.cakupanSAS,
        rumus: normalizeKonfigurasiRumus(docData.rumus),
        teacherName: docData.teacherName,
        signaturePlace: docData.signaturePlace,
        signatureDate: docData.signatureDate,
        updatedAt: nowIso,
        updatedBy,
        siswa: {},
      };
      await withTimeout(setDoc(ref, initialDoc, { merge: true }), 5000);
      await withTimeout(updateDoc(ref, updatePayload), 5000);
    } else {
      throw err;
    }
  }
}

/**
 * Menyimpan perubahan sel ke Firestore menggunakan `updateDoc` dengan dot notation
 * (`siswa.{siswaId}.bab.{no}.{field}` atau `siswa.{siswaId}.sts`) dan `deleteField()`
 * untuk sel yang dikosongkan.
 */
export async function saveCellPatchesToFirestore(
  docData: AkumulasiNilaiDoc,
  patches: CellPatch[],
  updatedBy: string
): Promise<void> {
  const docId = buildAkumulasiDocId(
    docData.tahunAjaran,
    docData.semester,
    docData.kelas,
    docData.mapelId
  );

  // 1. Selalu simpan ke penyimpanan lokal terlebih dahulu (instan & anti-hilang)
  writeLocalCache(docId, docData);

  if (!isFirebaseConfigured || !db || patches.length === 0) {
    return;
  }

  const nowIso = new Date().toISOString();
  const updatePayload: Record<string, number | string | FieldValue> = {
    principalName: docData.principalName || "Ari Gunawan, S.Kom.",
    principalNip: "",
    updatedAt: nowIso,
    updatedBy,
  };

  for (const patch of patches) {
    const fieldVal: number | FieldValue =
      patch.value === null ? deleteField() : patch.value;

    if (patch.field === "sts" || patch.field === "sat") {
      updatePayload[`siswa.${patch.siswaId}.${patch.field}`] = fieldVal;
    } else if (patch.bab !== undefined) {
      updatePayload[`siswa.${patch.siswaId}.bab.${patch.bab}.${patch.field}`] =
        fieldVal;
    }
  }

  // 2. Coba simpan ke koleksi `akumulasiNilai/{docId}` dengan updateDoc dot-notation
  try {
    await executeDotNotationUpdate(
      "akumulasiNilai",
      docId,
      docData,
      updatePayload,
      nowIso,
      updatedBy
    );
  } catch {
    // 3. Jika `akumulasiNilai` terkendala rules di project eksternal, simpan dengan dot-notation ke `settings/akumulasi_{docId}`
    try {
      await executeDotNotationUpdate(
        "settings",
        `akumulasi_${docId}`,
        docData,
        updatePayload,
        nowIso,
        updatedBy
      );
    } catch (mirrorErr) {
      console.warn("Cloud sync warning (data tersimpan aman di perangkat):", mirrorErr);
    }
  }
}

/**
 * Menyimpan perubahan metadata konfigurasi (jumlahBab, cakupanSTS, cakupanSAS, penandatangan)
 * menggunakan updateDoc (atau setDoc merge jika dokumen baru) tanpa menimpa map `siswa`.
 */
export async function saveMetadataToFirestore(
  docData: AkumulasiNilaiDoc,
  updatedBy: string
): Promise<void> {
  const docId = buildAkumulasiDocId(
    docData.tahunAjaran,
    docData.semester,
    docData.kelas,
    docData.mapelId
  );

  writeLocalCache(docId, docData);

  if (!isFirebaseConfigured || !db) {
    return;
  }

  const metadataPayload = {
    principalName: docData.principalName || "Ari Gunawan, S.Kom.",
    principalNip: "",
    tahunAjaran: docData.tahunAjaran,
    semester: docData.semester,
    kelas: docData.kelas,
    mapelId: docData.mapelId,
    jumlahBab: docData.jumlahBab,
    cakupanSTS: docData.cakupanSTS,
    cakupanSAS: docData.cakupanSAS,
    rumus: normalizeKonfigurasiRumus(docData.rumus),
    teacherName: docData.teacherName,
    signaturePlace: docData.signaturePlace,
    signatureDate: docData.signatureDate,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  try {
    const ref = doc(db, "akumulasiNilai", docId);
    await withTimeout(updateDoc(ref, metadataPayload), 5000).catch(async () => {
      await withTimeout(setDoc(ref, metadataPayload, { merge: true }), 5000);
    });
  } catch {
    try {
      const mirrorRef = doc(db, "settings", `akumulasi_${docId}`);
      await withTimeout(updateDoc(mirrorRef, metadataPayload), 5000).catch(async () => {
        await withTimeout(setDoc(mirrorRef, metadataPayload, { merge: true }), 5000);
      });
    } catch (mirrorErr) {
      console.warn("Cloud metadata sync warning (tersimpan di perangkat):", mirrorErr);
    }
  }
}
