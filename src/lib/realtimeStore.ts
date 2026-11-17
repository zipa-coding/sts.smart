import { collection, onSnapshot, Unsubscribe, QuerySnapshot, DocumentData } from "firebase/firestore";
import { db } from "./firebase";
import { tentukanPredikat } from "./predikat";

export type RealtimeCollectionName =
  | "students"
  | "grades"
  | "walikelas_notes"
  | "tujuan_pembelajaran_templates"
  | "settings"
  | "ekskul"
  | "teachers";

export type ConnectionStatus = "connected" | "syncing" | "offline";

export interface RealtimeStoreSnapshot {
  students: any[];
  grades: any[];
  walikelas_notes: Record<string, any>;
  tujuan_pembelajaran_templates: Record<string, any[]>;
  settings: any;
  ekskul: any[];
  teachers: any[];
  loadedCollections: Record<RealtimeCollectionName, boolean>;
  collectionErrors: Partial<Record<RealtimeCollectionName, string>>;
  connectionStatus: ConnectionStatus;
  isOffline: boolean;
  activeListenerCount: number;
  activeCollections: RealtimeCollectionName[];
  lastSyncAt: string | null;
}

const DEFAULT_SETTINGS = {
  principalName: "Ari Gunawan, S.Kom.",
  principalNip: "",
  format: {
    semesterName: "Ganjil",
    tahunPelajaran: "2026/2027",
    fontSize: "11pt",
    showLogo: true,
    showSpiritual: true,
    showSosial: true,
    showAttendance: true,
    showCatatan: true,
    fontFamily: "Times New Roman",
    descFontSize: "9pt",
    paperSize: "A4",
    tanggalRaport: "17 Juni 2026",
    principalSignaturePosition: "bottom_center",
    signatureCity: "Pangkal Pinang",
    principalTitle: "Kepala Sekolah",
    showPrincipalNip: false,
    showParentSignature: true,
    watermarkSize: 440,
    watermarkOpacity: 0.05,
  },
};

function normalizeKelasStr(k: any): string {
  const s = String(k || "").trim().toUpperCase();
  if (s === "VII" || s === "7" || s.startsWith("7")) return "7";
  if (s === "VIII" || s === "8" || s.startsWith("8")) return "8";
  if (s === "IX" || s === "9" || s.startsWith("9")) return "9";
  return s || "7";
}

function makeGradeKey(studentId: string, subject: string): string {
  const cleanStudentId = String(studentId || "").trim();
  const cleanSubject = String(subject || "").trim().replace(/[^a-zA-Z0-9]/g, "_");
  return `${cleanStudentId}_${cleanSubject}`;
}

function filterStudentEkskuls(arr: any[], expectedSid: string): any[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item: any) => {
      if (!item || !item.name) return false;
      if (item.studentId && String(item.studentId).trim() !== expectedSid) {
        return false;
      }
      return true;
    })
    .map((item: any) => ({
      ...item,
      studentId: expectedSid,
    }));
}

interface CollectionSubscriptionEntry {
  unsubscribe: Unsubscribe | null;
  subscribers: Set<() => void>;
  loaded: boolean;
  hasPendingWrites: boolean;
  error?: string;
}

class RealtimeStoreManager {
  private registry: Map<RealtimeCollectionName, CollectionSubscriptionEntry> = new Map();
  private statusSubscribers: Set<() => void> = new Set();

  // Raw parsed collection caches
  private studentsData: any[] = [];
  private gradesData: any[] = [];
  private rawWalikelasDocs: Record<string, any> = {};
  private rawSettingsDocs: Record<string, any> = {};
  private rawEkskulDocs: any[] = [];
  private rawTeachersDocs: any[] = [];

  // Derived normalized caches exposed to consumers
  private walikelasNotesMerged: Record<string, any> = {};
  private tpTemplatesMap: Record<string, any[]> = {};
  private appSettings: any = { ...DEFAULT_SETTINGS };
  private ekskulListMerged: any[] = [];
  private teachersListMerged: any[] = [];

  private browserOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
  private pendingWriteOperations: number = 0;
  private lastSyncAt: string | null = null;

  constructor() {
    const allCols: RealtimeCollectionName[] = [
      "students",
      "grades",
      "walikelas_notes",
      "tujuan_pembelajaran_templates",
      "settings",
      "ekskul",
      "teachers",
    ];
    for (const col of allCols) {
      this.registry.set(col, {
        unsubscribe: null,
        subscribers: new Set(),
        loaded: false,
        hasPendingWrites: false,
      });
    }

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.browserOnline = true;
        this.notifyAll();
      });
      window.addEventListener("offline", () => {
        this.browserOnline = false;
        this.notifyAll();
      });
      (window as any).__smartStsRealtimeDiagnostics = () => this.getDiagnostics();
    }
  }

  public markWriteStart(): void {
    this.pendingWriteOperations += 1;
    this.notifyStatusSubscribers();
  }

  public markWriteEnd(): void {
    this.pendingWriteOperations = Math.max(0, this.pendingWriteOperations - 1);
    this.lastSyncAt = new Date().toISOString();
    this.notifyStatusSubscribers();
  }

  public subscribeStatus(callback: () => void): () => void {
    this.statusSubscribers.add(callback);
    return () => {
      this.statusSubscribers.delete(callback);
    };
  }

  /**
   * Subscribe a component to a set of Firestore collections.
   * Ensures at most ONE onSnapshot listener per collection across the entire app.
   * Automatically unsubscribes when the last subscriber for a collection unmounts.
   */
  public subscribeCollections(
    collections: RealtimeCollectionName[],
    callback: () => void
  ): () => void {
    const uniqueCols = Array.from(new Set(collections));

    for (const col of uniqueCols) {
      const entry = this.registry.get(col)!;
      entry.subscribers.add(callback);
      if (!entry.unsubscribe) {
        this.startCollectionListener(col, entry);
      }
    }

    this.notifyStatusSubscribers();

    return () => {
      for (const col of uniqueCols) {
        const entry = this.registry.get(col);
        if (!entry) continue;
        entry.subscribers.delete(callback);
        if (entry.subscribers.size === 0 && entry.unsubscribe) {
          entry.unsubscribe();
          entry.unsubscribe = null;
          entry.hasPendingWrites = false;
          console.info(
            `[RealtimeStore] - Listener detached for "${col}". Active listeners: ${this.getActiveListenerCount()} (${this.getActiveCollections().join(", ") || "none"})`
          );
        }
      }
      this.notifyStatusSubscribers();
    };
  }

  private startCollectionListener(
    colName: RealtimeCollectionName,
    entry: CollectionSubscriptionEntry
  ): void {
    if (!db) {
      entry.error = "Firestore belum terhubung.";
      return;
    }

    const colRef = collection(db, colName);
    entry.unsubscribe = onSnapshot(
      colRef,
      { includeMetadataChanges: true },
      (snapshot: QuerySnapshot<DocumentData>) => {
        entry.loaded = true;
        entry.error = undefined;
        entry.hasPendingWrites = snapshot.metadata.hasPendingWrites;
        this.lastSyncAt = new Date().toISOString();

        this.processCollectionSnapshot(colName, snapshot);
        this.notifyCollectionSubscribers(colName);
        this.notifyStatusSubscribers();
      },
      (err: Error) => {
        console.error(`[RealtimeStore] Error on listener "${colName}":`, err);
        entry.error =
          "Gagal memuat data realtime dari server. Periksa koneksi internet Anda.";
        this.notifyCollectionSubscribers(colName);
        this.notifyStatusSubscribers();
      }
    );

    console.info(
      `[RealtimeStore] + Listener attached for "${colName}". Active listeners: ${this.getActiveListenerCount()} (${this.getActiveCollections().join(", ")})`
    );
  }

  private processCollectionSnapshot(
    colName: RealtimeCollectionName,
    snapshot: QuerySnapshot<DocumentData>
  ): void {
    if (colName === "students") {
      const list = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const docId = String(docSnap.id).trim();
        return {
          ...d,
          id: docId,
          name: String(d.name || d.nama || d.studentName || d.fullName || "Tanpa Nama").trim(),
          nis: String(d.nis || d.nisn || d.nomorInduk || "-").trim(),
          kelas: normalizeKelasStr(d.kelas || d.class || d.rombel || "7"),
        };
      });
      list.sort((a, b) => {
        if (a.kelas !== b.kelas) return String(a.kelas).localeCompare(String(b.kelas));
        return String(a.name).localeCompare(String(b.name));
      });
      this.studentsData = list;
      return;
    }

    if (colName === "grades") {
      const gradesMap = new Map<string, any>();
      for (const docSnap of snapshot.docs) {
        const d = docSnap.data();
        const docId = String(docSnap.id).trim();
        const sid = String(d.studentId || d.id_siswa || d.siswaId || "").trim();
        const subj = String(d.subject || d.mapel || d.mataPelajaran || "").trim();
        if (!sid || !subj) continue;

        const expectedKey = makeGradeKey(sid, subj);
        const rawScore =
          d.score !== undefined && d.score !== null && d.score !== ""
            ? Number(d.score)
            : d.nilai !== undefined && d.nilai !== null && d.nilai !== ""
            ? Number(d.nilai)
            : null;
        const computedPredicate = tentukanPredikat(rawScore);

        const normalizedGrade: any = {
          ...d,
          id: docId,
          _docId: docId,
          studentId: sid,
          subject: subj,
          score: rawScore !== null && !Number.isNaN(rawScore) ? rawScore : 0,
          predicate: computedPredicate,
          predikat: computedPredicate,
          description: d.description || d.deskripsi || d.catatan || "",
          deskripsi:
            typeof d.deskripsi === "string"
              ? d.deskripsi
              : typeof d.description === "string"
              ? d.description
              : "",
          deskripsiDikosongkan:
            typeof d.deskripsiDikosongkan === "boolean"
              ? d.deskripsiDikosongkan
              : undefined,
          achievedTps: Array.isArray(d.achievedTps)
            ? d.achievedTps
            : Array.isArray(d.tps)
            ? d.tps
            : [],
        };

        const existing = gradesMap.get(expectedKey);
        if (!existing) {
          gradesMap.set(expectedKey, normalizedGrade);
        } else if (docId === expectedKey) {
          console.warn(
            `[realtimeStore] Dokumen grades ganda untuk ${expectedKey}: melewati dokumen ID "${existing.id}", memilih dokumen ID standar "${docId}".`
          );
          gradesMap.set(expectedKey, normalizedGrade);
        } else if (existing.id === expectedKey) {
          console.warn(
            `[realtimeStore] Dokumen grades ganda untuk ${expectedKey}: melewati dokumen ID "${docId}", mempertahankan dokumen ID standar "${existing.id}".`
          );
        } else {
          const newLastUpdated = String(normalizedGrade.lastUpdatedAt || "");
          const existingLastUpdated = String(existing.lastUpdatedAt || "");
          if (
            newLastUpdated &&
            (!existingLastUpdated || newLastUpdated > existingLastUpdated)
          ) {
            console.warn(
              `[realtimeStore] Dokumen grades ganda untuk ${expectedKey}: melewati dokumen ID "${existing.id}", memilih dokumen lastUpdatedAt terbaru "${docId}".`
            );
            gradesMap.set(expectedKey, normalizedGrade);
          } else {
            console.warn(
              `[realtimeStore] Dokumen grades ganda untuk ${expectedKey}: melewati dokumen ID "${docId}", mempertahankan dokumen "${existing.id}".`
            );
          }
        }
      }
      this.gradesData = Array.from(gradesMap.values());
      return;
    }

    if (colName === "tujuan_pembelajaran_templates") {
      const templates: Record<string, any[]> = {};
      for (const docSnap of snapshot.docs) {
        const docId = String(docSnap.id).trim();
        const data = docSnap.data();
        templates[docId] = Array.isArray(data.tps) ? data.tps : [];
      }
      this.tpTemplatesMap = templates;
      return;
    }

    if (colName === "walikelas_notes") {
      const rawNotes: Record<string, any> = {};
      for (const docSnap of snapshot.docs) {
        const d = docSnap.data();
        const docId = String(docSnap.id).trim();
        const sid = String(d.studentId || docId).trim();
        if (!sid) continue;
        rawNotes[sid] = {
          ...d,
          id: docId,
          studentId: sid,
          ekskul: filterStudentEkskuls(d.ekskul, sid),
        };
      }
      this.rawWalikelasDocs = rawNotes;
      this.rebuildWalikelasAndSettingsDerived();
      return;
    }

    if (colName === "settings") {
      const rawSettings: Record<string, any> = {};
      for (const docSnap of snapshot.docs) {
        rawSettings[String(docSnap.id).trim()] = docSnap.data();
      }
      this.rawSettingsDocs = rawSettings;
      this.rebuildWalikelasAndSettingsDerived();
      this.rebuildEkskulDerived();
      this.rebuildTeachersDerived();
      if (this.registry.get("walikelas_notes")?.subscribers.size) {
        this.notifyCollectionSubscribers("walikelas_notes");
      }
      if (this.registry.get("ekskul")?.subscribers.size) {
        this.notifyCollectionSubscribers("ekskul");
      }
      if (this.registry.get("teachers")?.subscribers.size) {
        this.notifyCollectionSubscribers("teachers");
      }
      return;
    }

    if (colName === "ekskul") {
      this.rawEkskulDocs = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: String(docSnap.id).trim(),
      }));
      this.rebuildEkskulDerived();
      return;
    }

    if (colName === "teachers") {
      this.rawTeachersDocs = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: String(docSnap.id).trim(),
      }));
      this.rebuildTeachersDerived();
      return;
    }
  }

  private rebuildWalikelasAndSettingsDerived(): void {
    // 1. Rebuild app settings
    const appDoc = this.rawSettingsDocs["app"];
    if (appDoc) {
      const data = { ...appDoc };
      if (!data.principalName) data.principalName = "Ari Gunawan, S.Kom.";
      data.principalNip = "";
      if (data.format) {
        data.format = {
          ...DEFAULT_SETTINGS.format,
          ...data.format,
          tanggalRaport: data.format.tanggalRaport || "17 Juni 2026",
          principalSignaturePosition:
            data.format.principalSignaturePosition || "bottom_center",
          signatureCity: data.format.signatureCity || "Pangkal Pinang",
          principalTitle: data.format.principalTitle || "Kepala Sekolah",
          showPrincipalNip: false,
        };
      } else {
        data.format = { ...DEFAULT_SETTINGS.format };
      }
      this.appSettings = data;
    } else {
      this.appSettings = { ...DEFAULT_SETTINGS };
    }

    // 2. Rebuild walikelas_notes merged with settings/ekskul_grades backup
    const merged: Record<string, any> = {};
    for (const [sid, note] of Object.entries(this.rawWalikelasDocs)) {
      merged[sid] = {
        ...note,
        ekskul: Array.isArray(note.ekskul) ? [...note.ekskul] : [],
      };
    }

    const ekskulGradesDoc = this.rawSettingsDocs["ekskul_grades"];
    const byStudent = ekskulGradesDoc?.byStudent;
    if (byStudent && typeof byStudent === "object") {
      for (const [sid, backupEkskulList] of Object.entries(byStudent)) {
        const cleanSid = String(sid).trim();
        const filteredBackup = filterStudentEkskuls(backupEkskulList as any[], cleanSid);
        if (filteredBackup.length === 0) continue;

        if (!merged[cleanSid]) {
          merged[cleanSid] = {
            id: cleanSid,
            studentId: cleanSid,
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
            ekskul: filteredBackup,
          };
        } else {
          const currentEkskuls: any[] = Array.isArray(merged[cleanSid].ekskul)
            ? [...merged[cleanSid].ekskul]
            : [];
          if (currentEkskuls.length === 0) {
            merged[cleanSid].ekskul = filteredBackup;
          } else {
            for (const bItem of filteredBackup) {
              const idx = currentEkskuls.findIndex(
                (e: any) =>
                  (bItem.ekskulId && e.ekskulId === bItem.ekskulId) ||
                  (e.name &&
                    bItem.name &&
                    String(e.name).toLowerCase() === String(bItem.name).toLowerCase())
              );
              if (idx === -1) {
                currentEkskuls.push(bItem);
              } else if (
                bItem.updatedAt &&
                (!currentEkskuls[idx].updatedAt ||
                  bItem.updatedAt > currentEkskuls[idx].updatedAt)
              ) {
                currentEkskuls[idx] = bItem;
              }
            }
            merged[cleanSid].ekskul = filterStudentEkskuls(currentEkskuls, cleanSid);
          }
        }
      }
    }

    this.walikelasNotesMerged = merged;
  }

  private rebuildEkskulDerived(): void {
    const map = new Map<string, any>();
    const settingsEkskul = this.rawSettingsDocs["ekskul"];
    if (settingsEkskul && Array.isArray(settingsEkskul.list)) {
      for (const item of settingsEkskul.list) {
        if (item && item.id) {
          map.set(String(item.id).trim(), item);
        }
      }
    }
    for (const d of this.rawEkskulDocs) {
      if (d && d.id) {
        const existing = map.get(d.id);
        if (!existing || (d.updatedAt && (!existing.updatedAt || d.updatedAt >= existing.updatedAt))) {
          map.set(d.id, d);
        }
      }
    }
    this.ekskulListMerged = Array.from(map.values());
  }

  private rebuildTeachersDerived(): void {
    const map = new Map<string, any>();
    const settingsTeachers = this.rawSettingsDocs["teachers"];
    if (settingsTeachers && Array.isArray(settingsTeachers.list)) {
      for (const item of settingsTeachers.list) {
        if (item && item.id) {
          map.set(String(item.id).trim(), item);
        }
      }
    }
    for (const d of this.rawTeachersDocs) {
      if (d && d.id) {
        map.set(d.id, d);
      }
    }
    this.teachersListMerged = Array.from(map.values());
  }

  private notifyCollectionSubscribers(colName: RealtimeCollectionName): void {
    const entry = this.registry.get(colName);
    if (!entry) return;
    entry.subscribers.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error("[RealtimeStore] Subscriber callback error:", e);
      }
    });
  }

  private notifyStatusSubscribers(): void {
    this.statusSubscribers.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error("[RealtimeStore] Status callback error:", e);
      }
    });
  }

  private notifyAll(): void {
    for (const col of this.registry.keys()) {
      this.notifyCollectionSubscribers(col);
    }
    this.notifyStatusSubscribers();
  }

  public getActiveCollections(): RealtimeCollectionName[] {
    const active: RealtimeCollectionName[] = [];
    for (const [col, entry] of this.registry.entries()) {
      if (entry.unsubscribe !== null) {
        active.push(col);
      }
    }
    return active;
  }

  public getActiveListenerCount(): number {
    return this.getActiveCollections().length;
  }

  public getConnectionStatus(): ConnectionStatus {
    if (!this.browserOnline) {
      return "offline";
    }
    if (this.pendingWriteOperations > 0) {
      return "syncing";
    }
    for (const [, entry] of this.registry.entries()) {
      if (entry.unsubscribe !== null && (!entry.loaded || entry.hasPendingWrites)) {
        return "syncing";
      }
    }
    return "connected";
  }

  public getSnapshot(): RealtimeStoreSnapshot {
    const loadedCollections: Record<RealtimeCollectionName, boolean> = {
      students: !!this.registry.get("students")?.loaded,
      grades: !!this.registry.get("grades")?.loaded,
      walikelas_notes: !!this.registry.get("walikelas_notes")?.loaded,
      tujuan_pembelajaran_templates: !!this.registry.get("tujuan_pembelajaran_templates")?.loaded,
      settings: !!this.registry.get("settings")?.loaded,
      ekskul: !!this.registry.get("ekskul")?.loaded,
      teachers: !!this.registry.get("teachers")?.loaded,
    };

    const collectionErrors: Partial<Record<RealtimeCollectionName, string>> = {};
    for (const [col, entry] of this.registry.entries()) {
      if (entry.error) {
        collectionErrors[col] = entry.error;
      }
    }

    const status = this.getConnectionStatus();

    return {
      students: this.studentsData,
      grades: this.gradesData,
      walikelas_notes: this.walikelasNotesMerged,
      tujuan_pembelajaran_templates: this.tpTemplatesMap,
      settings: this.appSettings,
      ekskul: this.ekskulListMerged,
      teachers: this.teachersListMerged,
      loadedCollections,
      collectionErrors,
      connectionStatus: status,
      isOffline: status === "offline",
      activeListenerCount: this.getActiveListenerCount(),
      activeCollections: this.getActiveCollections(),
      lastSyncAt: this.lastSyncAt,
    };
  }

  public getDiagnostics() {
    const details: Record<string, { hasListener: boolean; subscriberCount: number; loaded: boolean }> = {};
    for (const [col, entry] of this.registry.entries()) {
      details[col] = {
        hasListener: entry.unsubscribe !== null,
        subscriberCount: entry.subscribers.size,
        loaded: entry.loaded,
      };
    }
    return {
      activeListenerCount: this.getActiveListenerCount(),
      activeCollections: this.getActiveCollections(),
      connectionStatus: this.getConnectionStatus(),
      collections: details,
    };
  }
}

export const realtimeStore = new RealtimeStoreManager();

export function markWriteOperationStart(): void {
  realtimeStore.markWriteStart();
}

export function markWriteOperationEnd(): void {
  realtimeStore.markWriteEnd();
}

export function getActiveListenerDiagnostics() {
  return realtimeStore.getDiagnostics();
}
