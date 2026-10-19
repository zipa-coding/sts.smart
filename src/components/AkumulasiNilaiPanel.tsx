import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Student, Teacher, SUBJECT_LIST } from "../types";
import {
  SemesterType,
  HasilHitungSiswa,
  KonfigurasiRumus,
  ModeRataKomponen,
  PerlakuanKosongUjian,
  DEFAULT_KONFIGURASI_RUMUS,
  normalizeKonfigurasiRumus,
  formatRumusNilaiAkhirText,
  formatRumusRataKomponenLabel,
  hitungAkumulasiSiswa,
  hitungLeggerSiswa,
  hitungRingkasanKelas,
  formatScore2,
  formatIntegerScore,
  parseAndValidateCellInput,
  hitungRataRataTerisi,
  KKM_DEFAULT,
} from "../lib/hitungNilai";
import {
  AkumulasiNilaiDoc,
  CellPatch,
  CellFieldType,
  fetchAkumulasiNilaiDoc,
  applyCellPatchesToDoc,
  saveCellPatchesToFirestore,
  saveMetadataToFirestore,
  normalizeKelasCode,
  formatKelasRomawi,
  createDefaultAkumulasiDoc,
} from "../lib/akumulasiNilaiService";
import {
  exportAkumulasiToExcel,
  triggerPrintAkumulasi,
  downloadAkumulasiPdf,
  PaperSizeOption,
} from "../lib/akumulasiExportService";
import {
  FileSpreadsheet,
  Printer,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Table,
  Layers,
  Send,
  Search,
  Info,
  RotateCcw,
  Calculator,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pin,
} from "lucide-react";

interface AkumulasiNilaiPanelProps {
  currentUser: Teacher;
  onRefreshTrigger?: () => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";
type ActiveSubView = "spreadsheet" | "legger";

interface InputColumnDescriptor {
  colIndex: number;
  field: CellFieldType;
  bab?: number;
  label: string;
}

export default function AkumulasiNilaiPanel({
  currentUser,
  onRefreshTrigger,
}: AkumulasiNilaiPanelProps) {
  const isSysAdmin = currentUser.subject === "Admin";

  // Filter states
  const [tahunAjaran, setTahunAjaran] = useState<string>("2026/2027");
  const [semester, setSemester] = useState<SemesterType>("Ganjil");
  const [selectedKelas, setSelectedKelas] = useState<string>(() => {
    if (currentUser.isWaliKelas && currentUser.kelas) {
      return normalizeKelasCode(currentUser.kelas);
    }
    return "7";
  });
  const [selectedMapel, setSelectedMapel] = useState<string>(() => {
    if (!isSysAdmin && currentUser.subject && SUBJECT_LIST.includes(currentUser.subject)) {
      return currentUser.subject;
    }
    return SUBJECT_LIST[0];
  });

  // Sub-view mode: "spreadsheet" (Tabel Akumulasi Utama) or "legger" (Tabel Legger 3.x & 4.x)
  const [activeSubView, setActiveSubView] = useState<ActiveSubView>("spreadsheet");
  const [focusedBab, setFocusedBab] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
  const [showFormulaPanel, setShowFormulaPanel] = useState<boolean>(false);
  const [paperSize, setPaperSize] = useState<PaperSizeOption>("F4");
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isSyncingToRaport, setIsSyncingToRaport] = useState<boolean>(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Master data states
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [defaultPrincipalName, setDefaultPrincipalName] = useState<string>("Ari Gunawan, S.Kom.");
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [loadingDoc, setLoadingDoc] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active document state
  const [docData, setDocData] = useState<AkumulasiNilaiDoc>(() =>
    createDefaultAkumulasiDoc({
      tahunAjaran: "2026/2027",
      semester: "Ganjil",
      kelas: "7",
      mapelId: !isSysAdmin && currentUser.subject ? currentUser.subject : SUBJECT_LIST[0],
      teacherName: currentUser.name,
      updatedBy: currentUser.name,
    })
  );

  // Draft values & validation errors per cell key: `${siswaId}_${field}_${bab || 0}`
  const [editingTexts, setEditingTexts] = useState<Record<string, string>>({});
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  // Autosave queue & status
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const pendingPatchesRef = useRef<Map<string, CellPatch>>(new Map());
  const debounceTimerRef = useRef<number | null>(null);
  const latestDocRef = useRef<AkumulasiNilaiDoc>(docData);
  latestDocRef.current = docData;

  // Refs for keyboard navigation across spreadsheet cells: key = `${rowIdx}_${colIdx}`
  const cellInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Refs & states for horizontal scroll controls (Geser Kanan - Kiri)
  const spreadsheetScrollRef = useRef<HTMLDivElement | null>(null);
  const leggerScrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollPos, setScrollPos] = useState<number>(0);
  const [maxScrollPos, setMaxScrollPos] = useState<number>(0);
  const [pinNilaiRapor, setPinNilaiRapor] = useState<boolean>(false);

  const syncScrollMetrics = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    setScrollPos(Math.round(el.scrollLeft));
    setMaxScrollPos(Math.round(max));
  }, []);

  const scrollHorizontalBy = (delta: number) => {
    const activeEl =
      activeSubView === "spreadsheet"
        ? spreadsheetScrollRef.current
        : leggerScrollRef.current;
    if (!activeEl) return;
    activeEl.scrollBy({ left: delta, behavior: "smooth" });
  };

  const scrollHorizontalTo = (target: "start" | "end" | number) => {
    const activeEl =
      activeSubView === "spreadsheet"
        ? spreadsheetScrollRef.current
        : leggerScrollRef.current;
    if (!activeEl) return;
    if (target === "start") {
      activeEl.scrollTo({ left: 0, behavior: "smooth" });
    } else if (target === "end") {
      activeEl.scrollTo({ left: activeEl.scrollWidth, behavior: "smooth" });
    } else {
      activeEl.scrollTo({ left: target, behavior: "auto" });
      setScrollPos(target);
    }
  };

  // Available subjects based on role (Admin: all subjects; Guru: their assigned subject)
  const availableSubjects = useMemo<string[]>(() => {
    if (isSysAdmin) {
      return SUBJECT_LIST;
    }
    if (currentUser.subject && SUBJECT_LIST.includes(currentUser.subject)) {
      return [currentUser.subject];
    }
    return SUBJECT_LIST;
  }, [isSysAdmin, currentUser.subject]);

  // Warn before leaving page if there are unsaved changes
  const hasUnsavedChanges =
    saveStatus === "saving" || pendingPatchesRef.current.size > 0;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "Ada perubahan nilai yang sedang disimpan. Yakin ingin meninggalkan halaman?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // 1. Load students, teachers, and school settings once on mount
  useEffect(() => {
    let mounted = true;
    async function loadMasterData() {
      setLoadingInitial(true);
      try {
        const [studentsRes, teachersRes, settingsRes] = await Promise.all([
          fetch("/api/students"),
          fetch("/api/teachers"),
          fetch("/api/settings"),
        ]);

        if (studentsRes.ok) {
          const sList = (await studentsRes.json()) as Student[];
          if (mounted && Array.isArray(sList)) {
            setAllStudents(sList);
          }
        }
        if (teachersRes.ok) {
          const tList = (await teachersRes.json()) as Teacher[];
          if (mounted && Array.isArray(tList)) {
            setAllTeachers(tList);
          }
        }
        if (settingsRes.ok) {
          const sData = (await settingsRes.json()) as {
            principalName?: string;
            format?: { tahunPelajaran?: string; semesterName?: string };
          };
          if (mounted && sData?.principalName) {
            setDefaultPrincipalName(sData.principalName);
          }
        }
      } catch (err) {
        console.warn("Gagal memuat data master siswa/pengaturan:", err);
      } finally {
        if (mounted) {
          setLoadingInitial(false);
        }
      }
    }
    loadMasterData();
    return () => {
      mounted = false;
    };
  }, []);

  // Determine default teacher name for the selected subject
  const resolvedSubjectTeacherName = useMemo<string>(() => {
    if (!isSysAdmin && currentUser.subject === selectedMapel) {
      return currentUser.name;
    }
    const found = allTeachers.find(
      (t) =>
        t.subject &&
        t.subject.trim().toLowerCase() === selectedMapel.trim().toLowerCase()
    );
    return found ? found.name : currentUser.name;
  }, [isSysAdmin, currentUser, selectedMapel, allTeachers]);

  // Flush pending cell patches immediately
  const flushPendingPatches = useCallback(async () => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const patches: CellPatch[] = Array.from(pendingPatchesRef.current.values());
    if (patches.length === 0) return;

    setSaveStatus("saving");
    try {
      await saveCellPatchesToFirestore(
        latestDocRef.current,
        patches,
        currentUser.name
      );
      pendingPatchesRef.current.clear();
      const now = new Date();
      setLastSavedTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setSaveStatus("saved");
    } catch (err) {
      console.error("Gagal menyimpan perubahan sel ke Firestore:", err);
      setSaveStatus("error");
    }
  }, [currentUser.name]);

  // 2. Load document when filter (tahunAjaran, semester, selectedKelas, selectedMapel) changes
  useEffect(() => {
    let active = true;
    async function loadDocument() {
      // Flush any pending edits on previous document before switching
      if (pendingPatchesRef.current.size > 0) {
        await flushPendingPatches();
      }
      setLoadingDoc(true);
      setLoadError(null);
      setEditingTexts({});
      setCellErrors({});

      try {
        const loaded = await fetchAkumulasiNilaiDoc({
          tahunAjaran,
          semester,
          kelas: selectedKelas,
          mapelId: selectedMapel,
          principalName: defaultPrincipalName,
          teacherName: resolvedSubjectTeacherName,
        });
        if (active) {
          setDocData(loaded);
          setSaveStatus("idle");
        }
      } catch (err) {
        if (active) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Gagal memuat data akumulasi nilai. Periksa koneksi jaringan Anda."
          );
        }
      } finally {
        if (active) {
          setLoadingDoc(false);
        }
      }
    }
    loadDocument();
    return () => {
      active = false;
    };
  }, [
    tahunAjaran,
    semester,
    selectedKelas,
    selectedMapel,
    defaultPrincipalName,
    resolvedSubjectTeacherName,
    flushPendingPatches,
  ]);

  // Filter students for selected class
  const classStudents = useMemo<Student[]>(() => {
    const targetCode = normalizeKelasCode(selectedKelas);
    return allStudents
      .filter((s) => normalizeKelasCode(String(s.kelas || "")) === targetCode)
      .sort((a, b) => a.name.localeCompare(b.name, "id", { sensitivity: "base" }));
  }, [allStudents, selectedKelas]);

  const filteredStudents = useMemo<Student[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return classStudents;
    return classStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.nisn || "").toLowerCase().includes(q)
    );
  }, [classStudents, searchQuery]);

  // Active number of chapters (1..7)
  const jumlahBab = Math.max(1, Math.min(7, docData.jumlahBab || 6));
  const activeBabNumbers = useMemo<number[]>(
    () => Array.from({ length: jumlahBab }, (_, i) => i + 1),
    [jumlahBab]
  );

  // Chapters displayed in the spreadsheet (all active chapters or single focused chapter)
  const displayedBabNumbers = useMemo<number[]>(() => {
    if (focusedBab === "all" || focusedBab > jumlahBab) {
      return activeBabNumbers;
    }
    return [focusedBab];
  }, [focusedBab, jumlahBab, activeBabNumbers]);

  useEffect(() => {
    const activeEl =
      activeSubView === "spreadsheet"
        ? spreadsheetScrollRef.current
        : leggerScrollRef.current;
    syncScrollMetrics(activeEl);
    const onResize = () => syncScrollMetrics(activeEl);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeSubView, displayedBabNumbers, filteredStudents.length, syncScrollMetrics]);

  // Ordered input columns for keyboard navigation & Excel multi-cell paste
  // Per bab: T, SH, P (3 input columns per bab), followed by STS, SAT
  const inputColumns = useMemo<InputColumnDescriptor[]>(() => {
    const cols: InputColumnDescriptor[] = [];
    let colIdx = 0;
    for (let b = 1; b <= jumlahBab; b++) {
      cols.push({ colIndex: colIdx++, field: "t", bab: b, label: `Bab ${b} - T` });
      cols.push({ colIndex: colIdx++, field: "sh", bab: b, label: `Bab ${b} - SH` });
      cols.push({ colIndex: colIdx++, field: "p", bab: b, label: `Bab ${b} - P` });
    }
    cols.push({ colIndex: colIdx++, field: "sts", label: "STS" });
    cols.push({ colIndex: colIdx++, field: "sat", label: "SAT" });
    return cols;
  }, [jumlahBab]);

  const activeRumus = useMemo<KonfigurasiRumus>(
    () => normalizeKonfigurasiRumus(docData.rumus),
    [docData.rumus]
  );

  // Real-time calculation for every student in the class
  const hasilPerSiswaMap = useMemo<Record<string, HasilHitungSiswa>>(() => {
    const map: Record<string, HasilHitungSiswa> = {};
    const config = {
      jumlahBab,
      cakupanSTS: docData.cakupanSTS,
      cakupanSAS: docData.cakupanSAS,
      rumus: activeRumus,
    };
    for (const s of classStudents) {
      map[s.id] = hitungAkumulasiSiswa(docData.siswa[s.id], config);
    }
    return map;
  }, [
    classStudents,
    docData.siswa,
    jumlahBab,
    docData.cakupanSTS,
    docData.cakupanSAS,
    activeRumus,
  ]);

  // Class summary statistics
  const ringkasanKelas = useMemo(() => {
    const list = classStudents.map((s) => hasilPerSiswaMap[s.id]).filter(Boolean);
    return hitungRingkasanKelas(list);
  }, [classStudents, hasilPerSiswaMap]);

  // Column-level averages for footer summary
  const rataKolomKelas = useMemo(() => {
    const list = classStudents.map((s) => hasilPerSiswaMap[s.id]).filter(Boolean);
    const babAverages: Record<
      number,
      { t: number | null; sh: number | null; rataBab: number | null; p: number | null }
    > = {};
    for (let b = 1; b <= jumlahBab; b++) {
      babAverages[b] = {
        t: hitungRataRataTerisi(list.map((h) => h.perBab[b]?.t)),
        sh: hitungRataRataTerisi(list.map((h) => h.perBab[b]?.sh)),
        rataBab: hitungRataRataTerisi(list.map((h) => h.perBab[b]?.rataBab)),
        p: hitungRataRataTerisi(list.map((h) => h.perBab[b]?.p)),
      };
    }
    return {
      babAverages,
      sts: hitungRataRataTerisi(list.map((h) => h.sts)),
      sat: hitungRataRataTerisi(list.map((h) => h.sat)),
      rataT: hitungRataRataTerisi(list.map((h) => h.rataT)),
      rataSH: hitungRataRataTerisi(list.map((h) => h.rataSH)),
      rataP: hitungRataRataTerisi(list.map((h) => h.rataP)),
      pengetahuanSTS: hitungRataRataTerisi(list.map((h) => h.pengetahuanSTS)),
      pengetahuanSAS: hitungRataRataTerisi(list.map((h) => h.pengetahuanSAS)),
      nilaiAkhirSTS: hitungRataRataTerisi(list.map((h) => h.nilaiAkhirSTS)),
      nilaiAkhirSAS: hitungRataRataTerisi(list.map((h) => h.nilaiAkhirSAS)),
    };
  }, [classStudents, hasilPerSiswaMap, jumlahBab]);

  // Queue cell patches and trigger 800ms debounced autosave
  const queueCellPatches = useCallback(
    (patches: CellPatch[]) => {
      if (patches.length === 0) return;

      setDocData((prev) => {
        const updated = applyCellPatchesToDoc(prev, patches, currentUser.name);
        latestDocRef.current = updated;
        return updated;
      });

      for (const p of patches) {
        const patchKey = `${p.siswaId}_${p.field}_${p.bab ?? 0}`;
        pendingPatchesRef.current.set(patchKey, p);
      }

      setSaveStatus("saving");
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        void flushPendingPatches();
      }, 800);
    },
    [currentUser.name, flushPendingPatches]
  );

  // Build unique cell key
  const getCellKey = (siswaId: string, field: CellFieldType, bab?: number): string =>
    `${siswaId}_${field}_${bab ?? 0}`;

  // Get current raw numeric value for a cell
  const getCellNumericValue = (
    siswaId: string,
    field: CellFieldType,
    bab?: number
  ): number | null => {
    const rawSiswa = docData.siswa[siswaId];
    if (!rawSiswa) return null;
    if (field === "sts") return rawSiswa.sts ?? null;
    if (field === "sat") return rawSiswa.sat ?? null;
    if (bab !== undefined) {
      const bObj = rawSiswa.bab?.[String(bab)];
      if (!bObj) return null;
      return bObj[field] ?? null;
    }
    return null;
  };

  // Handle single cell input change
  const handleCellInputChange = (
    siswaId: string,
    field: CellFieldType,
    rawText: string,
    bab?: number
  ) => {
    const cellKey = getCellKey(siswaId, field, bab);
    setEditingTexts((prev) => ({ ...prev, [cellKey]: rawText }));

    const validation = parseAndValidateCellInput(rawText);
    if (!validation.valid) {
      setCellErrors((prev) => ({
        ...prev,
        [cellKey]: validation.error || "Rentang 0–100",
      }));
      return;
    }

    // Clear error if valid
    setCellErrors((prev) => {
      if (!(cellKey in prev)) return prev;
      const next = { ...prev };
      delete next[cellKey];
      return next;
    });

    queueCellPatches([
      {
        siswaId,
        field,
        bab,
        value: validation.value,
      },
    ]);
  };

  // Clean up editing text on blur if valid
  const handleCellBlur = (siswaId: string, field: CellFieldType, bab?: number) => {
    const cellKey = getCellKey(siswaId, field, bab);
    if (!cellErrors[cellKey]) {
      setEditingTexts((prev) => {
        if (!(cellKey in prev)) return prev;
        const next = { ...prev };
        delete next[cellKey];
        return next;
      });
    }
  };

  // Handle keyboard navigation (Enter, Tab, Arrow keys) like Excel
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) => {
    const totalRows = filteredStudents.length;
    const totalCols = inputColumns.length;

    const focusCell = (r: number, c: number) => {
      const target = cellInputRefs.current.get(`${r}_${c}`);
      if (target) {
        target.focus();
        target.select();
      }
    };

    if (e.key === "Enter") {
      e.preventDefault();
      const nextRow = e.shiftKey ? rowIdx - 1 : rowIdx + 1;
      if (nextRow >= 0 && nextRow < totalRows) {
        focusCell(nextRow, colIdx);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (rowIdx + 1 < totalRows) {
        focusCell(rowIdx + 1, colIdx);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (rowIdx - 1 >= 0) {
        focusCell(rowIdx - 1, colIdx);
      }
    } else if (e.key === "ArrowRight") {
      const input = e.currentTarget;
      if (input.selectionStart === input.value.length && colIdx + 1 < totalCols) {
        e.preventDefault();
        focusCell(rowIdx, colIdx + 1);
      }
    } else if (e.key === "ArrowLeft") {
      const input = e.currentTarget;
      if (input.selectionStart === 0 && colIdx - 1 >= 0) {
        e.preventDefault();
        focusCell(rowIdx, colIdx - 1);
      }
    }
  };

  // Handle multi-cell paste from Excel / Google Sheets (TSV / CSV)
  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startRowIdx: number,
    startColIdx: number
  ) => {
    const clipboardText = e.clipboardData.getData("text/plain");
    if (!clipboardText) return;

    // If single value without tabs or newlines, let normal input or handle it cleanly
    const hasMultipleCells =
      clipboardText.includes("\t") ||
      clipboardText.includes("\n") ||
      clipboardText.includes("\r");
    if (!hasMultipleCells) return;

    e.preventDefault();

    const rows = clipboardText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter((r, idx, arr) => !(idx === arr.length - 1 && r.trim() === ""));

    const patches: CellPatch[] = [];
    const newEditingTexts: Record<string, string> = {};
    const newErrors: Record<string, string> = {};
    let validCount = 0;
    let invalidCount = 0;

    rows.forEach((rowStr, rOffset) => {
      const targetRowIdx = startRowIdx + rOffset;
      if (targetRowIdx >= filteredStudents.length) return;
      const targetStudent = filteredStudents[targetRowIdx];
      const cells = rowStr.split("\t");

      cells.forEach((rawCell, cOffset) => {
        const targetColIdx = startColIdx + cOffset;
        if (targetColIdx >= inputColumns.length) return;
        const colDesc = inputColumns[targetColIdx];
        const cellKey = getCellKey(targetStudent.id, colDesc.field, colDesc.bab);
        const trimmed = rawCell.trim();

        // Treat "-" from exported tables as empty cell
        const effectiveText = trimmed === "-" ? "" : trimmed;
        const validation = parseAndValidateCellInput(effectiveText);

        if (validation.valid) {
          patches.push({
            siswaId: targetStudent.id,
            field: colDesc.field,
            bab: colDesc.bab,
            value: validation.value,
          });
          validCount++;
        } else {
          newEditingTexts[cellKey] = trimmed;
          newErrors[cellKey] = validation.error || "Rentang 0–100";
          invalidCount++;
        }
      });
    });

    if (Object.keys(newEditingTexts).length > 0) {
      setEditingTexts((prev) => ({ ...prev, ...newEditingTexts }));
      setCellErrors((prev) => ({ ...prev, ...newErrors }));
    }

    if (patches.length > 0) {
      queueCellPatches(patches);
    }

    setPasteNotice(
      `Berhasil menempelkan ${validCount} sel dari Excel${
        invalidCount > 0 ? ` (${invalidCount} sel diabaikan karena di luar 0–100)` : ""
      }.`
    );
    window.setTimeout(() => setPasteNotice(null), 4500);
  };

  // Update metadata configuration (jumlahBab, cakupanSTS, cakupanSAS, signature info)
  const updateMetadataConfig = async (partial: Partial<AkumulasiNilaiDoc>) => {
    const nextDoc: AkumulasiNilaiDoc = {
      ...docData,
      ...partial,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.name,
    };
    setDocData(nextDoc);
    latestDocRef.current = nextDoc;

    setSaveStatus("saving");
    try {
      await saveMetadataToFirestore(nextDoc, currentUser.name);
      const now = new Date();
      setLastSavedTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setSaveStatus("saved");
    } catch (err) {
      console.error("Gagal menyimpan konfigurasi metadata:", err);
      setSaveStatus("error");
    }
  };

  // Handle changing Jumlah Bab (1..7)
  const handleJumlahBabChange = (newJumlah: number) => {
    const clamped = Math.max(1, Math.min(7, newJumlah));
    const nextSTS = docData.cakupanSTS.filter((b) => b <= clamped);
    const nextSAS = Array.from({ length: clamped }, (_, i) => i + 1);
    void updateMetadataConfig({
      jumlahBab: clamped,
      cakupanSTS: nextSTS.length > 0 ? nextSTS : [1],
      cakupanSAS: nextSAS,
    });
  };

  // Toggle chapter in cakupanSTS or cakupanSAS
  const toggleCakupanBab = (target: "STS" | "SAS", babNum: number) => {
    const currentList = target === "STS" ? docData.cakupanSTS : docData.cakupanSAS;
    const exists = currentList.includes(babNum);
    let nextList = exists
      ? currentList.filter((b) => b !== babNum)
      : [...currentList, babNum].sort((a, b) => a - b);

    if (nextList.length === 0) {
      nextList = [babNum]; // Minimal 1 bab terpilih
    }

    if (target === "STS") {
      void updateMetadataConfig({ cakupanSTS: nextList });
    } else {
      void updateMetadataConfig({ cakupanSAS: nextList });
    }
  };

  // Update partial formula configuration (KonfigurasiRumus)
  const updateRumusConfig = (partialRumus: Partial<KonfigurasiRumus>) => {
    const mergedRumus = normalizeKonfigurasiRumus({
      ...activeRumus,
      ...partialRumus,
    });
    void updateMetadataConfig({ rumus: mergedRumus });
  };

  const resetDefaultRumus = () => {
    void updateMetadataConfig({
      rumus: { ...DEFAULT_KONFIGURASI_RUMUS },
    });
  };

  // Export to Excel (.xlsx) with live formulas
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      await flushPendingPatches();
      await exportAkumulasiToExcel({
        docData: latestDocRef.current,
        students: classStudents,
      });
    } catch (err) {
      console.error("Gagal mengekspor Excel:", err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Download PDF Landscape (F4 / A4)
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await flushPendingPatches();
      await downloadAkumulasiPdf({
        docData: latestDocRef.current,
        students: classStudents,
        paperSize,
        includeLegger: true,
      });
    } catch (err) {
      console.error("Gagal mengunduh PDF:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Print Landscape (F4 / A4)
  const handlePrint = async () => {
    await flushPendingPatches();
    triggerPrintAkumulasi({
      docData: latestDocRef.current,
      students: classStudents,
      paperSize,
      includeLegger: true,
    });
  };

  // Optional convenience: Sync calculated Nilai Rapor into main Raport `/api/grades`
  const handleSyncToRaportGrades = async () => {
    setIsSyncingToRaport(true);
    setSyncSuccessMessage(null);
    try {
      await flushPendingPatches();
      const gradesRes = await fetch("/api/grades");
      const existingGrades = gradesRes.ok ? ((await gradesRes.json()) as Array<{
        studentId: string;
        subject: string;
        score: number;
        tps?: unknown[];
        usaha?: string;
        proses?: string;
        capaian?: string;
        deskripsi?: string;
      }>) : [];

      let syncedCount = 0;
      for (const s of classStudents) {
        const hasil = hasilPerSiswaMap[s.id];
        if (!hasil || hasil.nilaiRapor === null) continue;

        const existing = existingGrades.find(
          (g) => g.studentId === s.id && g.subject === selectedMapel
        );

        await fetch("/api/grades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: s.id,
            subject: selectedMapel,
            score: hasil.nilaiRapor,
            tps: existing?.tps || [],
            teacherName: docData.teacherName || currentUser.name,
            usaha: existing?.usaha || hasil.predikat || "B",
            proses: existing?.proses || hasil.predikat || "B",
            capaian: hasil.predikat || "B",
            deskripsi: existing?.deskripsi || "",
          }),
        });
        syncedCount++;
      }

      if (onRefreshTrigger) {
        onRefreshTrigger();
      }
      setSyncSuccessMessage(
        `Berhasil menyinkronkan ${syncedCount} Nilai Rapor (${selectedMapel} - Kelas ${formatKelasRomawi(
          selectedKelas
        )}) ke Rapor Wali Kelas.`
      );
      window.setTimeout(() => setSyncSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Gagal sinkronisasi ke rapor:", err);
    } finally {
      setIsSyncingToRaport(false);
    }
  };

  return (
    <div className="space-y-4 text-slate-100" id="akumulasi-nilai-panel">
      {/* Top Document Header & Action Bar */}
      <div className="bg-[#0c1322] border border-[#1a2948] rounded-xl p-4 md:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#1a2948] pb-4">
          <div className="space-y-1">
            <div className="text-xs font-mono text-emerald-400 tracking-wide">
              SMP Islam SMART Pangkalpinang · Tahun Ajaran {tahunAjaran}
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
              Format Akumulasi Nilai — Mata Pelajaran: {selectedMapel}
            </h2>
            <p className="text-xs text-slate-400">
              Kelas {formatKelasRomawi(selectedKelas)} · Semester {semester} · Perhitungan otomatis real-time dari input mentah per bab
            </p>
          </div>

          {/* Autosave status & Primary Export Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Autosave Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#131f38] border border-[#1e3458] text-xs font-mono">
              {saveStatus === "saving" && (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-amber-300 font-semibold">Menyimpan...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-semibold">
                    Tersimpan {lastSavedTime ? `(${lastSavedTime})` : ""}
                  </span>
                </>
              )}
              {saveStatus === "error" && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-300 font-semibold">Gagal, coba lagi</span>
                  <button
                    type="button"
                    onClick={() => void flushPendingPatches()}
                    className="px-2 py-0.5 rounded bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                </div>
              )}
              {saveStatus === "idle" && (
                <span className="text-slate-400">Siap Input (Autosave Aktif)</span>
              )}
            </div>

            {/* Pengaturan Rumus Perhitungan Nilai Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFormulaPanel((prev) => !prev)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                showFormulaPanel
                  ? "bg-amber-600 text-white border-amber-400"
                  : "bg-[#131f38] text-amber-300 border-amber-500/40 hover:bg-[#1a2c4a]"
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Pengaturan Rumus Nilai</span>
            </button>

            {/* Settings Toggle Button */}
            <button
              type="button"
              onClick={() => setShowSettingsPanel((prev) => !prev)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                showSettingsPanel
                  ? "bg-blue-600 text-white border-blue-400"
                  : "bg-[#131f38] text-slate-200 border-[#253e66] hover:bg-[#1a2c4a]"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Cakupan &amp; Penandatangan</span>
            </button>

            {/* Excel Export (.xlsx) */}
            <button
              type="button"
              onClick={() => void handleExportExcel()}
              disabled={isExportingExcel || loadingDoc || classStudents.length === 0}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isExportingExcel ? "Mengekspor..." : "Ekspor Excel (.xlsx)"}</span>
            </button>

            {/* Paper Size Selector + Print / PDF */}
            <div className="flex items-center rounded-lg bg-[#131f38] border border-[#253e66] p-0.5">
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as PaperSizeOption)}
                aria-label="Ukuran Kertas Cetak"
                className="bg-transparent text-xs font-mono font-semibold text-slate-200 px-2 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="F4" className="bg-slate-900 text-white">
                  Kertas F4 (Landscape)
                </option>
                <option value="A4" className="bg-slate-900 text-white">
                  Kertas A4 (Landscape)
                </option>
              </select>
              <button
                type="button"
                onClick={() => void handlePrint()}
                disabled={loadingDoc || classStudents.length === 0}
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-200 hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                title="Cetak Landscape"
              >
                <Printer className="w-3.5 h-3.5 text-sky-400" />
                <span>Cetak</span>
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadPdf()}
                disabled={isExportingPdf || loadingDoc || classStudents.length === 0}
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white transition flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                title="Unduh PDF Landscape"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{isExportingPdf ? "Membuat PDF..." : "PDF"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar: Tahun Ajaran, Semester, Kelas, Mata Pelajaran, Jumlah Bab */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Tahun Ajaran
            </label>
            <select
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
              className="w-full bg-[#131f38] border border-[#253e66] rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-400"
            >
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
              <option value="2027/2028">2027/2028</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value as SemesterType)}
              className="w-full bg-[#131f38] border border-[#253e66] rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-400"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Kelas
            </label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full bg-[#131f38] border border-[#253e66] rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-400"
            >
              <option value="7">Kelas VII (7)</option>
              <option value="8">Kelas VIII (8)</option>
              <option value="9">Kelas IX (9)</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Mata Pelajaran {!isSysAdmin ? "(Sesuai Ampuan Guru)" : "(Semua Mapel)"}
            </label>
            <select
              value={selectedMapel}
              onChange={(e) => setSelectedMapel(e.target.value)}
              disabled={!isSysAdmin && availableSubjects.length === 1}
              className="w-full bg-[#131f38] border border-[#253e66] rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-80 focus:outline-none focus:border-blue-400"
            >
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Jumlah Bab (1–7)
            </label>
            <select
              value={jumlahBab}
              onChange={(e) => handleJumlahBabChange(Number(e.target.value))}
              className="w-full bg-[#131f38] border border-[#253e66] rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-400"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <option key={num} value={num}>
                  {num} Bab {num === 6 ? "(Default)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Panel Pengaturan Rumus Perhitungan Nilai */}
        {showFormulaPanel && (
          <div className="bg-[#10192d] border border-amber-500/40 rounded-xl p-4 md:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e3152] pb-3">
              <div>
                <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  <span>Pengaturan Rumus Perhitungan Nilai</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Atur rumus Rata-rata Tugas, Rata-rata Sumatif Harian, Rata-rata Praktek, serta rumus Nilai Akhir Siswa. Nilai STS &amp; SAT merupakan nilai murni.
                </p>
              </div>
              <button
                type="button"
                onClick={resetDefaultRumus}
                className="px-3 py-1.5 rounded-lg bg-[#162440] hover:bg-[#1e3156] border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ke Rumus Standar</span>
              </button>
            </div>

            {/* 1. Rumus Rata-rata Tugas, Sumatif Harian, dan Praktek */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Rata-rata Tugas (Rata T) */}
              <div className="bg-[#0c1322] border border-[#223559] rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300">
                    1. Rumus Rata-Rata Tugas (Rata T)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-500/30">
                    Tugas (T)
                  </span>
                </div>
                <select
                  value={activeRumus.modeRataT}
                  onChange={(e) =>
                    updateRumusConfig({
                      modeRataT: e.target.value as ModeRataKomponen,
                    })
                  }
                  className="w-full bg-[#131f38] border border-[#253e66] rounded-lg px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="bab_terisi">
                    Jumlah Nilai Tugas ÷ Jumlah Bab yang Diisi (Default)
                  </option>
                  <option value="semua_bab_cakupan">
                    Jumlah Nilai Tugas ÷ Total Bab Cakupan ({docData.cakupanSAS.length} Bab)
                  </option>
                  <option value="pembagi_tetap">
                    Jumlah Nilai Tugas ÷ Pembagi Tetap Pilihan Guru
                  </option>
                </select>
                {activeRumus.modeRataT === "pembagi_tetap" && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-slate-300">
                      Dibagi dengan jumlah bab tetap:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={activeRumus.pembagiTetapT}
                      onChange={(e) =>
                        updateRumusConfig({
                          pembagiTetapT: Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                        })
                      }
                      className="w-16 bg-[#131f38] border border-sky-400/50 rounded px-2 py-1 text-center font-mono text-xs text-white"
                    />
                  </div>
                )}
                <div className="text-[11px] font-mono text-slate-400 bg-[#111c33] rounded px-2.5 py-1.5 border border-[#1e2f50]">
                  Rumus: <strong className="text-sky-200">{formatRumusRataKomponenLabel("Tugas (T)", activeRumus.modeRataT, activeRumus.pembagiTetapT, docData.cakupanSAS.length)}</strong>
                </div>
              </div>

              {/* Rata-rata Sumatif Harian (Rata SH) */}
              <div className="bg-[#0c1322] border border-[#223559] rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-300">
                    2. Rumus Rata-Rata Sumatif Harian (Rata SH)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-500/30">
                    Sumatif (SH)
                  </span>
                </div>
                <select
                  value={activeRumus.modeRataSH}
                  onChange={(e) =>
                    updateRumusConfig({
                      modeRataSH: e.target.value as ModeRataKomponen,
                    })
                  }
                  className="w-full bg-[#131f38] border border-[#253e66] rounded-lg px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-teal-400"
                >
                  <option value="bab_terisi">
                    Jumlah Nilai SH ÷ Jumlah Bab yang Diisi (Default)
                  </option>
                  <option value="semua_bab_cakupan">
                    Jumlah Nilai SH ÷ Total Bab Cakupan ({docData.cakupanSAS.length} Bab)
                  </option>
                  <option value="pembagi_tetap">
                    Jumlah Nilai SH ÷ Pembagi Tetap Pilihan Guru
                  </option>
                </select>
                {activeRumus.modeRataSH === "pembagi_tetap" && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-slate-300">
                      Dibagi dengan jumlah bab tetap:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={activeRumus.pembagiTetapSH}
                      onChange={(e) =>
                        updateRumusConfig({
                          pembagiTetapSH: Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                        })
                      }
                      className="w-16 bg-[#131f38] border border-teal-400/50 rounded px-2 py-1 text-center font-mono text-xs text-white"
                    />
                  </div>
                )}
                <div className="text-[11px] font-mono text-slate-400 bg-[#111c33] rounded px-2.5 py-1.5 border border-[#1e2f50]">
                  Rumus: <strong className="text-teal-200">{formatRumusRataKomponenLabel("SH", activeRumus.modeRataSH, activeRumus.pembagiTetapSH, docData.cakupanSAS.length)}</strong>
                </div>
              </div>

              {/* Rata-rata Praktek (Rata P) */}
              <div className="bg-[#0c1322] border border-[#223559] rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300">
                    3. Rumus Rata-Rata Praktek (Rata P)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    Praktek (P)
                  </span>
                </div>
                <select
                  value={activeRumus.modeRataP}
                  onChange={(e) =>
                    updateRumusConfig({
                      modeRataP: e.target.value as ModeRataKomponen,
                    })
                  }
                  className="w-full bg-[#131f38] border border-[#253e66] rounded-lg px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="bab_terisi">
                    Jumlah Nilai Praktek ÷ Jumlah Bab yang Diisi (Default)
                  </option>
                  <option value="semua_bab_cakupan">
                    Jumlah Nilai Praktek ÷ Total Bab Cakupan ({docData.cakupanSAS.length} Bab)
                  </option>
                  <option value="pembagi_tetap">
                    Jumlah Nilai Praktek ÷ Pembagi Tetap Pilihan Guru
                  </option>
                </select>
                {activeRumus.modeRataP === "pembagi_tetap" && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-slate-300">
                      Dibagi dengan jumlah bab tetap:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={activeRumus.pembagiTetapP}
                      onChange={(e) =>
                        updateRumusConfig({
                          pembagiTetapP: Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                        })
                      }
                      className="w-16 bg-[#131f38] border border-emerald-400/50 rounded px-2 py-1 text-center font-mono text-xs text-white"
                    />
                  </div>
                )}
                <div className="text-[11px] font-mono text-slate-400 bg-[#111c33] rounded px-2.5 py-1.5 border border-[#1e2f50]">
                  Rumus: <strong className="text-emerald-200">{formatRumusRataKomponenLabel("Praktek (P)", activeRumus.modeRataP, activeRumus.pembagiTetapP, docData.cakupanSAS.length)}</strong>
                </div>
              </div>
            </div>

            {/* 2. Keterangan Nilai Murni STS & SAT */}
            <div className="bg-[#0c1322] border border-[#223559] rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white">
                    4. Nilai STS &amp; Nilai SAT — Nilai Murni (Tidak Ada Rumus)
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Nilai <strong className="text-amber-300">STS (Sumatif Tengah Semester)</strong> dan{" "}
                    <strong className="text-amber-300">SAT (Sumatif Akhir Semester)</strong> merupakan{" "}
                    <strong>Nilai Murni</strong> hasil ujian (0–100) yang diinput langsung oleh guru tanpa rumus rata-rata.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold whitespace-nowrap self-start sm:self-center">
                STS &amp; SAT = Nilai Murni
              </span>
            </div>

            {/* 3. Pengaturan Rumus Nilai Akhir Siswa */}
            <div className="bg-[#0c1322] border border-amber-500/40 rounded-lg p-4 space-y-3.5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-amber-300">
                    5. Rumus Nilai Akhir Siswa
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Rumus standar: <strong className="text-white font-mono">((2 × Rata-rata Sumatif Harian) + Rata-rata Tugas + Nilai SAT + Nilai STS) / 5</strong>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-[#162742] border border-amber-400/40 text-xs font-mono font-bold text-amber-200">
                  Nilai Akhir = {formatRumusNilaiAkhirText(activeRumus)}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Bobot Rata SH
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step="0.5"
                    value={activeRumus.bobotRataSH}
                    onChange={(e) =>
                      updateRumusConfig({
                        bobotRataSH: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full bg-[#131f38] border border-[#2c4878] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-amber-400"
                  />
                  <span className="block text-[10px] text-slate-400 mt-0.5 text-center">
                    Default: 2× Rata SH
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Bobot Rata Tugas (T)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step="0.5"
                    value={activeRumus.bobotRataT}
                    onChange={(e) =>
                      updateRumusConfig({
                        bobotRataT: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full bg-[#131f38] border border-[#2c4878] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-amber-400"
                  />
                  <span className="block text-[10px] text-slate-400 mt-0.5 text-center">
                    Default: 1× Rata Tugas
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Bobot Nilai SAT (Murni)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step="0.5"
                    value={activeRumus.bobotSAT}
                    onChange={(e) =>
                      updateRumusConfig({
                        bobotSAT: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full bg-[#131f38] border border-[#2c4878] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-amber-400"
                  />
                  <span className="block text-[10px] text-slate-400 mt-0.5 text-center">
                    Default: 1× Nilai SAT
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Bobot Nilai STS (Murni)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step="0.5"
                    value={activeRumus.bobotSTS}
                    onChange={(e) =>
                      updateRumusConfig({
                        bobotSTS: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full bg-[#131f38] border border-[#2c4878] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-amber-400"
                  />
                  <span className="block text-[10px] text-slate-400 mt-0.5 text-center">
                    Default: 1× Nilai STS
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Bobot Rata Praktek (P)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step="0.5"
                    value={activeRumus.bobotRataP}
                    onChange={(e) =>
                      updateRumusConfig({
                        bobotRataP: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full bg-[#131f38] border border-[#2c4878] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-amber-400"
                  />
                  <span className="block text-[10px] text-slate-400 mt-0.5 text-center">
                    Default: 0 (Tidak Ikut)
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                    Angka Pembagi (/ N)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    step="0.5"
                    value={activeRumus.pembagiNilaiAkhir}
                    onChange={(e) =>
                      updateRumusConfig({
                        gunakanPembagiOtomatis: false,
                        pembagiNilaiAkhir: Math.max(1, Number(e.target.value) || 5),
                      })
                    }
                    className="w-full bg-[#1a2942] border border-amber-400/70 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-amber-200 text-center focus:outline-none focus:border-amber-300"
                  />
                  <span className="block text-[10px] text-amber-300/80 mt-0.5 text-center">
                    Default: Dibagi 5
                  </span>
                </div>
              </div>

              <div className="border-t border-[#1e3152] pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-300">
                    Jika Nilai SAT / STS Belum Diinput:
                  </span>
                  <select
                    value={activeRumus.perlakuanKosongUjian}
                    onChange={(e) =>
                      updateRumusConfig({
                        perlakuanKosongUjian: e.target.value as PerlakuanKosongUjian,
                      })
                    }
                    className="bg-[#131f38] border border-[#253e66] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="proporsional">
                      Proporsional (Saat SAT kosong gunakan Nilai Akhir STS, saat SAT diisi bagi {activeRumus.pembagiNilaiAkhir})
                    </option>
                    <option value="kosong_jadi_nol">
                      Langsung Bagi {activeRumus.pembagiNilaiAkhir} (Nilai STS/SAT yang belum diisi dihitung 0)
                    </option>
                    <option value="wajib_lengkap">
                      Tampilkan &quot;-&quot; sampai Rata T, Rata SH, STS, dan SAT terisi lengkap
                    </option>
                  </select>
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeRumus.gunakanPembagiOtomatis}
                    onChange={(e) =>
                      updateRumusConfig({
                        gunakanPembagiOtomatis: e.target.checked,
                      })
                    }
                    className="rounded border-slate-600 text-amber-500 focus:ring-amber-400"
                  />
                  <span>Pembagi otomatis mengikuti jumlah bobot</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Cakupan Bab (STS/SAS) & Pengaturan Penandatangan */}
        {showSettingsPanel && (
          <div className="bg-[#111a2e] border border-[#223559] rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cakupan Bab STS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    Cakupan Bab untuk Hitungan STS (Default Bab 1–3)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void updateMetadataConfig({
                        cakupanSTS: [1, 2, 3].filter((b) => b <= jumlahBab),
                      })
                    }
                    className="text-[11px] text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Default
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeBabNumbers.map((b) => {
                    const active = docData.cakupanSTS.includes(b);
                    return (
                      <button
                        key={`sts-bab-${b}`}
                        type="button"
                        onClick={() => toggleCakupanBab("STS", b)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition cursor-pointer ${
                          active
                            ? "bg-blue-600 text-white border-blue-400"
                            : "bg-[#0c1322] text-slate-400 border-[#253e66] hover:text-white"
                        }`}
                      >
                        Bab {b} {active ? "✓" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cakupan Bab SAS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    Cakupan Bab untuk Hitungan SAS (Default Semua Bab)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void updateMetadataConfig({
                        cakupanSAS: activeBabNumbers,
                      })
                    }
                    className="text-[11px] text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Pilih Semua Bab
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeBabNumbers.map((b) => {
                    const active = docData.cakupanSAS.includes(b);
                    return (
                      <button
                        key={`sas-bab-${b}`}
                        type="button"
                        onClick={() => toggleCakupanBab("SAS", b)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition cursor-pointer ${
                          active
                            ? "bg-emerald-700 text-white border-emerald-400"
                            : "bg-[#0c1322] text-slate-400 border-[#253e66] hover:text-white"
                        }`}
                      >
                        Bab {b} {active ? "✓" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pengaturan Penandatangan Dokumen */}
            <div className="border-t border-[#1e3152] pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Nama Kepala Sekolah (Kiri)
                </label>
                <input
                  type="text"
                  value={docData.principalName}
                  onChange={(e) =>
                    setDocData((prev) => ({ ...prev, principalName: e.target.value }))
                  }
                  onBlur={() =>
                    void updateMetadataConfig({ principalName: docData.principalName })
                  }
                  className="w-full bg-[#0c1322] border border-[#253e66] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-400"
                  placeholder="Nama Kepala Sekolah"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Nama Guru Mata Pelajaran (Kanan)
                </label>
                <input
                  type="text"
                  value={docData.teacherName}
                  onChange={(e) =>
                    setDocData((prev) => ({ ...prev, teacherName: e.target.value }))
                  }
                  onBlur={() =>
                    void updateMetadataConfig({ teacherName: docData.teacherName })
                  }
                  className="w-full bg-[#0c1322] border border-[#253e66] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-400"
                  placeholder="Nama Guru Mapel"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Tempat Tanda Tangan
                </label>
                <input
                  type="text"
                  value={docData.signaturePlace}
                  onChange={(e) =>
                    setDocData((prev) => ({ ...prev, signaturePlace: e.target.value }))
                  }
                  onBlur={() =>
                    void updateMetadataConfig({ signaturePlace: docData.signaturePlace })
                  }
                  className="w-full bg-[#0c1322] border border-[#253e66] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-400"
                  placeholder="Pangkalpinang"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Bulan &amp; Tahun Tanda Tangan
                </label>
                <input
                  type="text"
                  value={docData.signatureDate}
                  onChange={(e) =>
                    setDocData((prev) => ({ ...prev, signatureDate: e.target.value }))
                  }
                  onBlur={() =>
                    void updateMetadataConfig({ signatureDate: docData.signatureDate })
                  }
                  className="w-full bg-[#0c1322] border border-[#253e66] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-400"
                  placeholder="Oktober 2026"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sub-navigation Tabs (Spreadsheet vs Legger), Search, and Sync Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1 p-1 bg-[#131f38] border border-[#253e66] rounded-lg self-start">
            <button
              type="button"
              onClick={() => setActiveSubView("spreadsheet")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubView === "spreadsheet"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabel Input &amp; Akumulasi Nilai</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView("legger")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubView === "legger"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tabel Legger (3.1, 4.1 ... 3.{jumlahBab}, 4.{jumlahBab})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search student */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa..."
                className="bg-[#131f38] border border-[#253e66] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 w-48 sm:w-56"
              />
            </div>

            {/* Sync to Raport Grades */}
            <button
              type="button"
              onClick={() => void handleSyncToRaportGrades()}
              disabled={isSyncingToRaport || loadingDoc || classStudents.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#131f38] hover:bg-[#1a2c4a] border border-emerald-500/40 text-emerald-300 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Salin Nilai Rapor yang sudah terhitung ke Nilai Rapor Utama"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSyncingToRaport ? "Menyinkronkan..." : "Kirim Nilai Rapor ke Wali Kelas"}
              </span>
            </button>
          </div>
        </div>

        {/* Notifications (Paste / Sync) */}
        {pasteNotice && (
          <div className="px-3.5 py-2 rounded-lg bg-blue-950/60 border border-blue-500/40 text-blue-200 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{pasteNotice}</span>
          </div>
        )}
        {syncSuccessMessage && (
          <div className="px-3.5 py-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* Loading Skeleton / Error / Empty States */}
      {loadingInitial || loadingDoc ? (
        <div className="bg-[#0c1322] border border-[#1a2948] rounded-xl p-6 space-y-3">
          <div className="h-6 w-64 bg-slate-800 rounded animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`skel-${i}`}
                className="h-9 w-full bg-slate-800/70 rounded animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : loadError ? (
        <div className="bg-[#0c1322] border border-rose-500/40 rounded-xl p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">Gagal Memuat Data Akumulasi Nilai</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">{loadError}</p>
          <button
            type="button"
            onClick={() => setTahunAjaran((prev) => prev)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
          >
            Muat Ulang
          </button>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-[#0c1322] border border-[#1a2948] rounded-xl p-10 text-center space-y-2">
          <p className="text-sm font-bold text-slate-200">
            {searchQuery
              ? `Tidak ada siswa dengan nama "${searchQuery}" di Kelas ${formatKelasRomawi(selectedKelas)}.`
              : `Belum ada data siswa terdaftar di Kelas ${formatKelasRomawi(selectedKelas)}.`}
          </p>
          <p className="text-xs text-slate-400">
            Data siswa diambil langsung dari database utama tanpa duplikasi.
          </p>
        </div>
      ) : activeSubView === "spreadsheet" ? (
        /* =================================================================
           VIEW 1: SPREADSHEET AKUMULASI NILAI PER-BAB
           ================================================================= */
        <div className="bg-[#0c1322] border border-[#1a2948] rounded-xl overflow-hidden shadow-xl">
          {/* Quick Helper & Chapter Focus Selector Bar */}
          <div className="px-4 py-2.5 bg-[#090f1d] border-b border-[#1a2948] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-[11px] text-slate-300">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-emerald-400 mr-1">
                Pilih Bab untuk Input:
              </span>
              <button
                type="button"
                onClick={() => setFocusedBab("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition cursor-pointer ${
                  focusedBab === "all"
                    ? "bg-blue-600 text-white border-blue-400"
                    : "bg-[#131f38] text-slate-300 border-[#253e66] hover:text-white"
                }`}
              >
                Semua Bab (1–{jumlahBab})
              </button>
              {activeBabNumbers.map((b) => (
                <button
                  key={`focus-bab-${b}`}
                  type="button"
                  onClick={() => setFocusedBab(b)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border transition cursor-pointer ${
                    focusedBab === b
                      ? "bg-emerald-600 text-white border-emerald-400"
                      : "bg-[#131f38] text-slate-300 border-[#253e66] hover:text-white"
                  }`}
                >
                  Bab {b}
                </button>
              ))}
            </div>
            <div className="text-slate-400">
              Ketik langsung nilai <strong className="text-white">T</strong> (Tugas),{" "}
              <strong className="text-white">SH</strong> (Sumatif Harian),{" "}
              <strong className="text-white">P</strong> (Praktek), serta nilai murni{" "}
              <strong className="text-amber-300">STS</strong> dan{" "}
              <strong className="text-amber-300">SAT</strong>.
            </div>
          </div>

          {/* Info Ringkasan Rumus Aktif */}
          <div className="px-4 py-2 bg-[#0d182c] border-b border-[#1a2948] flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300 font-mono">
              <span>
                <strong className="text-sky-300">Rata T:</strong>{" "}
                {activeRumus.modeRataT === "bab_terisi"
                  ? "ΣT ÷ Bab Terisi"
                  : activeRumus.modeRataT === "semua_bab_cakupan"
                  ? `ΣT ÷ ${docData.cakupanSAS.length} Bab`
                  : `ΣT ÷ ${activeRumus.pembagiTetapT}`}
              </span>
              <span>
                <strong className="text-teal-300">Rata SH:</strong>{" "}
                {activeRumus.modeRataSH === "bab_terisi"
                  ? "ΣSH ÷ Bab Terisi"
                  : activeRumus.modeRataSH === "semua_bab_cakupan"
                  ? `ΣSH ÷ ${docData.cakupanSAS.length} Bab`
                  : `ΣSH ÷ ${activeRumus.pembagiTetapSH}`}
              </span>
              <span>
                <strong className="text-emerald-300">Rata P:</strong>{" "}
                {activeRumus.modeRataP === "bab_terisi"
                  ? "ΣP ÷ Bab Terisi"
                  : activeRumus.modeRataP === "semua_bab_cakupan"
                  ? `ΣP ÷ ${docData.cakupanSAS.length} Bab`
                  : `ΣP ÷ ${activeRumus.pembagiTetapP}`}
              </span>
              <span>
                <strong className="text-amber-300">STS &amp; SAT:</strong> Nilai Murni
              </span>
              <span>
                <strong className="text-amber-200">Nilai Akhir Siswa:</strong>{" "}
                {formatRumusNilaiAkhirText(activeRumus)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowFormulaPanel((prev) => !prev)}
              className="text-amber-300 hover:text-amber-200 underline font-semibold cursor-pointer flex items-center gap-1"
            >
              <Calculator className="w-3 h-3" />
              <span>{showFormulaPanel ? "Tutup Pengaturan Rumus" : "Ubah Rumus"}</span>
            </button>
          </div>

          {/* Bar Navigasi Geser Kanan-Kiri & Sematkan Nilai Rapor */}
          <div className="px-4 py-2.5 bg-[#101c34] border-b border-[#253e66] flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-sky-300 mr-1">
                Geser Tabel (Kiri / Kanan):
              </span>
              <button
                type="button"
                onClick={() => scrollHorizontalTo("start")}
                className="px-2.5 py-1.5 rounded-lg bg-[#162647] hover:bg-[#1f3460] border border-[#2c4878] text-xs font-semibold text-slate-200 flex items-center gap-1 cursor-pointer transition"
                title="Geser ke Paling Kiri (Bab 1)"
              >
                <ChevronsLeft className="w-3.5 h-3.5 text-sky-400" />
                <span>Awal (Bab 1)</span>
              </button>
              <button
                type="button"
                onClick={() => scrollHorizontalBy(-360)}
                className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 border border-blue-400/50 text-xs font-bold text-white flex items-center gap-1 cursor-pointer transition shadow-xs"
                title="Geser Tabel ke Kiri"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Geser Kiri</span>
              </button>
              <button
                type="button"
                onClick={() => scrollHorizontalBy(360)}
                className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 border border-blue-400/50 text-xs font-bold text-white flex items-center gap-1 cursor-pointer transition shadow-xs"
                title="Geser Tabel ke Kanan"
              >
                <span>Geser Kanan</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollHorizontalTo("end")}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 border border-amber-300/60 text-xs font-bold text-white flex items-center gap-1 cursor-pointer transition shadow-xs"
                title="Langsung Geser ke Kolom Paling Kanan (Nilai Akhir, Nilai Rapor & Predikat)"
              >
                <span>Lihat Nilai Rapor (Kanan)</span>
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Slider Geser Cepat */}
              {maxScrollPos > 0 && (
                <div className="flex items-center gap-2 bg-[#0b1324] border border-[#253e66] rounded-lg px-2.5 py-1">
                  <span className="text-[10px] font-mono text-slate-400">Kiri</span>
                  <input
                    type="range"
                    min={0}
                    max={maxScrollPos}
                    value={Math.min(scrollPos, maxScrollPos)}
                    onChange={(e) => scrollHorizontalTo(Number(e.target.value))}
                    aria-label="Slider Geser Tabel Kiri Kanan"
                    className="w-28 sm:w-40 accent-amber-400 cursor-pointer h-1.5"
                  />
                  <span className="text-[10px] font-mono text-amber-300 font-bold">
                    Nilai Rapor
                  </span>
                </div>
              )}

              {/* Tombol Sematkan (Pin) Nilai Rapor & Predikat agar selalu terlihat di kanan */}
              <button
                type="button"
                onClick={() => setPinNilaiRapor((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                  pinNilaiRapor
                    ? "bg-emerald-700 text-white border-emerald-400 shadow-xs"
                    : "bg-[#162647] text-emerald-300 border-emerald-500/40 hover:bg-[#1f3460]"
                }`}
                title="Kunci kolom Nilai Rapor & Predikat agar selalu menempel dan terlihat di sisi kanan layar"
              >
                <Pin className="w-3.5 h-3.5" />
                <span>
                  {pinNilaiRapor
                    ? "Nilai Rapor Terkunci di Kanan ✓"
                    : "Sematkan Nilai Rapor di Kanan"}
                </span>
              </button>
            </div>
          </div>

          <div
            ref={spreadsheetScrollRef}
            onScroll={(e) => syncScrollMetrics(e.currentTarget)}
            className="akumulasi-scroll-container overflow-x-auto max-h-[68vh] overflow-y-auto relative scroll-smooth"
          >
            <table
              className="w-max min-w-full border-collapse text-xs font-mono tabular-nums"
              id="akumulasi-spreadsheet-table"
            >
              <thead className="sticky top-0 z-30">
                <tr className="bg-[#111c33] text-slate-100 border-b border-[#253e66] text-[11px]">
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-40 bg-[#111c33] border-r border-[#253e66] px-1 py-1.5 text-center font-bold w-8 min-w-[32px]"
                  >
                    No
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky left-[32px] z-40 bg-[#111c33] border-r-2 border-[#315182] px-2.5 py-1.5 text-left font-bold min-w-[165px] max-w-[185px]"
                  >
                    Nama Siswa
                  </th>
                  {displayedBabNumbers.map((b) => {
                    const inSTS = docData.cakupanSTS.includes(b);
                    const inSAS = docData.cakupanSAS.includes(b);
                    return (
                      <th
                        key={`header-bab-${b}`}
                        colSpan={4}
                        className="border-r border-[#253e66] px-1 py-1 text-center font-bold bg-[#152340]"
                      >
                        <div className="flex items-center justify-center gap-1 leading-tight">
                          <span>BAB {b}</span>
                          <span className="text-[8px] font-normal text-slate-400">
                            ({inSTS ? "STS" : ""}
                            {inSTS && inSAS ? "·" : ""}
                            {inSAS ? "SAS" : ""})
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th
                    rowSpan={2}
                    className="border-r border-[#253e66] px-1 py-1.5 text-center font-bold bg-[#172847] w-[46px] min-w-[46px]"
                    title="Nilai Murni Sumatif Tengah Semester (Tanpa Rumus)"
                  >
                    <div>STS</div>
                    <div className="text-[8px] font-normal text-amber-300">Murni</div>
                  </th>
                  <th
                    rowSpan={2}
                    className="border-r-2 border-[#315182] px-1 py-1.5 text-center font-bold bg-[#172847] w-[46px] min-w-[46px]"
                    title="Nilai Murni Sumatif Akhir Semester (Tanpa Rumus)"
                  >
                    <div>SAT</div>
                    <div className="text-[8px] font-normal text-amber-300">Murni</div>
                  </th>
                  <th
                    rowSpan={2}
                    className="border-r border-[#253e66] px-1.5 py-1.5 text-center font-bold bg-[#0f293a] text-sky-200 min-w-[54px]"
                    title="Rata-rata Tugas"
                  >
                    <div>Rata T</div>
                    <div className="text-[8px] font-normal text-sky-300/80">Tugas</div>
                  </th>
                  <th
                    rowSpan={2}
                    className="border-r border-[#253e66] px-1.5 py-1.5 text-center font-bold bg-[#0f293a] text-sky-200 min-w-[54px]"
                    title="Rata-rata Sumatif Harian"
                  >
                    <div>Rata SH</div>
                    <div className="text-[8px] font-normal text-sky-300/80">Sumatif</div>
                  </th>
                  <th
                    rowSpan={2}
                    className="border-r border-[#253e66] px-1.5 py-1.5 text-center font-bold bg-[#0f293a] text-sky-200 min-w-[54px]"
                    title="Rata-rata Praktek"
                  >
                    <div>Rata P</div>
                    <div className="text-[8px] font-normal text-sky-300/80">Praktek</div>
                  </th>
                  <th
                    rowSpan={2}
                    className="border-r border-[#253e66] px-1.5 py-1.5 text-center font-bold bg-[#102d38] text-teal-200 min-w-[56px]"
                  >
                    Peng STS
                  </th>
                  <th
                    rowSpan={2}
                    className="border-r border-[#253e66] px-1.5 py-1.5 text-center font-bold bg-[#102d38] text-teal-200 min-w-[56px]"
                  >
                    Peng SAS
                  </th>
                  <th
                    rowSpan={2}
                    className="border-r border-[#253e66] px-1.5 py-1.5 text-center font-bold bg-[#11302e] text-emerald-200 min-w-[58px]"
                  >
                    NA STS
                  </th>
                  <th
                    rowSpan={2}
                    className="border-r border-[#253e66] px-1.5 py-1.5 text-center font-bold bg-[#11302e] text-emerald-200 min-w-[66px]"
                    title={`Rumus Nilai Akhir Siswa: ${formatRumusNilaiAkhirText(activeRumus)}`}
                  >
                    <div>Nilai Akhir</div>
                    <div className="text-[8px] font-normal text-emerald-300/90">Siswa</div>
                  </th>
                  <th
                    rowSpan={2}
                    className={`${
                      pinNilaiRapor
                        ? "sticky right-[56px] z-40 border-l-2 border-l-amber-400/70 shadow-[-4px_0_10px_rgba(0,0,0,0.45)]"
                        : ""
                    } border-r border-[#253e66] px-2 py-1.5 text-center font-extrabold bg-[#16382c] text-amber-300 min-w-[64px] w-[64px]`}
                  >
                    Nilai Rapor
                  </th>
                  <th
                    rowSpan={2}
                    className={`${
                      pinNilaiRapor ? "sticky right-0 z-40" : ""
                    } px-2 pr-2.5 py-1.5 text-center font-extrabold bg-[#16382c] text-amber-300 min-w-[56px] w-[56px]`}
                  >
                    Predikat
                  </th>
                </tr>
                <tr className="bg-[#0f172a] text-slate-300 border-b-2 border-[#315182] text-[10px]">
                  {displayedBabNumbers.map((b) => (
                    <React.Fragment key={`sub-bab-${b}`}>
                      <th className="border-r border-[#1e293b] px-0.5 py-1 text-center font-semibold w-[42px] min-w-[42px]">
                        T
                      </th>
                      <th className="border-r border-[#1e293b] px-0.5 py-1 text-center font-semibold w-[42px] min-w-[42px]">
                        SH
                      </th>
                      <th className="border-r border-[#1e293b] px-1 py-1 text-center font-semibold bg-[#162238] text-sky-300 w-[46px] min-w-[46px]">
                        Rata
                      </th>
                      <th className="border-r border-[#253e66] px-0.5 py-1 text-center font-semibold w-[42px] min-w-[42px]">
                        P
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student, rowIdx) => {
                  const hasil = hasilPerSiswaMap[student.id];
                  const isBelow = hasil?.isBelowKKM ?? false;
                  const rowBgClass = isBelow
                    ? "bg-rose-950/35 hover:bg-rose-950/55"
                    : rowIdx % 2 === 0
                    ? "bg-[#0c1322] hover:bg-[#131e36]"
                    : "bg-[#0e1729] hover:bg-[#131e36]";

                  const stickyBgClass = isBelow
                    ? "bg-[#2a121c]"
                    : rowIdx % 2 === 0
                    ? "bg-[#0c1322]"
                    : "bg-[#0e1729]";

                  const renderInputCell = (
                    field: CellFieldType,
                    colIdx: number,
                    bab?: number
                  ) => {
                    const cellKey = getCellKey(student.id, field, bab);
                    const numVal = getCellNumericValue(student.id, field, bab);
                    const displayVal =
                      cellKey in editingTexts
                        ? editingTexts[cellKey]
                        : numVal !== null
                        ? String(numVal)
                        : "";
                    const errText = cellErrors[cellKey];

                    return (
                      <div className="relative">
                        <input
                          ref={(el) => {
                            const refKey = `${rowIdx}_${colIdx}`;
                            if (el) {
                              cellInputRefs.current.set(refKey, el);
                            } else {
                              cellInputRefs.current.delete(refKey);
                            }
                          }}
                          type="text"
                          inputMode="decimal"
                          value={displayVal}
                          placeholder="-"
                          aria-label={`${student.name} ${field.toUpperCase()} ${
                            bab ? `Bab ${bab}` : ""
                          }`}
                          onChange={(e) =>
                            handleCellInputChange(student.id, field, e.target.value, bab)
                          }
                          onBlur={() => handleCellBlur(student.id, field, bab)}
                          onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx)}
                          onPaste={(e) => handleCellPaste(e, rowIdx, colIdx)}
                          className={`w-[38px] h-6 px-0.5 text-center font-mono text-[11px] rounded transition focus:outline-none focus:ring-1 ${
                            errText
                              ? "bg-rose-950/90 text-rose-200 border border-rose-400 focus:ring-rose-400"
                              : "bg-[#14223d] text-white border border-[#2c4878] hover:border-blue-400 focus:bg-[#1a2e52] focus:border-blue-400 focus:ring-blue-400/50 placeholder-slate-500"
                          }`}
                        />
                        {errText && (
                          <div className="text-[8px] leading-tight text-rose-300 bg-rose-950 border border-rose-500/50 rounded px-1 py-0.5 mt-0.5 whitespace-nowrap">
                            {errText}
                          </div>
                        )}
                      </div>
                    );
                  };

                  const stsColIdx = jumlahBab * 3;
                  const satColIdx = jumlahBab * 3 + 1;

                  return (
                    <tr
                      key={student.id}
                      className={`border-b border-[#1a2948] transition-colors text-[11px] ${rowBgClass}`}
                    >
                      {/* Sticky No */}
                      <td
                        className={`sticky left-0 z-20 ${stickyBgClass} border-r border-[#253e66] px-1 py-0.5 text-center font-semibold text-slate-400 w-8 min-w-[32px]`}
                      >
                        {rowIdx + 1}
                      </td>

                      {/* Sticky Nama Siswa */}
                      <td
                        className={`sticky left-[32px] z-20 ${stickyBgClass} border-r-2 border-[#315182] px-2.5 py-1 text-left font-sans font-semibold min-w-[165px] max-w-[185px] ${
                          isBelow ? "text-rose-200" : "text-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate max-w-[145px]" title={student.name}>
                            {student.name}
                          </span>
                          {isBelow && (
                            <span
                              className="text-[9px] font-mono font-bold text-rose-300 shrink-0"
                              title="Nilai Rapor di bawah 73 (KKM)"
                            >
                              &lt;73
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Grup Kolom Per Bab: T, SH, Rata Bab (read-only), P */}
                      {displayedBabNumbers.map((b) => {
                        const baseInputCol = (b - 1) * 3;
                        const rataBabVal = hasil?.perBab[b]?.rataBab ?? null;
                        return (
                          <React.Fragment key={`${student.id}-bab-${b}`}>
                            <td className="border-r border-[#1a2948] p-0.5 text-center w-[42px] min-w-[42px]">
                              {renderInputCell("t", baseInputCol, b)}
                            </td>
                            <td className="border-r border-[#1a2948] p-0.5 text-center w-[42px] min-w-[42px]">
                              {renderInputCell("sh", baseInputCol + 1, b)}
                            </td>
                            <td className="border-r border-[#1a2948] px-1 py-0.5 text-center font-semibold bg-[#131f38]/80 text-sky-300 select-none w-[46px] min-w-[46px]">
                              {formatScore2(rataBabVal)}
                            </td>
                            <td className="border-r border-[#253e66] p-0.5 text-center w-[42px] min-w-[42px]">
                              {renderInputCell("p", baseInputCol + 2, b)}
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {/* STS & SAT */}
                      <td className="border-r border-[#253e66] p-0.5 text-center bg-[#111c33]/40 w-[46px] min-w-[46px]">
                        {renderInputCell("sts", stsColIdx)}
                      </td>
                      <td className="border-r-2 border-[#315182] p-0.5 text-center bg-[#111c33]/40 w-[46px] min-w-[46px]">
                        {renderInputCell("sat", satColIdx)}
                      </td>

                      {/* Read-only Calculated Columns */}
                      <td className="border-r border-[#1e3152] px-1.5 py-0.5 text-center font-semibold bg-[#0f2236] text-sky-200 select-none">
                        {formatScore2(hasil?.rataT)}
                      </td>
                      <td className="border-r border-[#1e3152] px-1.5 py-0.5 text-center font-semibold bg-[#0f2236] text-sky-200 select-none">
                        {formatScore2(hasil?.rataSH)}
                      </td>
                      <td className="border-r border-[#1e3152] px-1.5 py-0.5 text-center font-semibold bg-[#0f2236] text-sky-200 select-none">
                        {formatScore2(hasil?.rataP)}
                      </td>
                      <td className="border-r border-[#1e3152] px-1.5 py-0.5 text-center font-semibold bg-[#0e2632] text-teal-200 select-none">
                        {formatScore2(hasil?.pengetahuanSTS)}
                      </td>
                      <td className="border-r border-[#1e3152] px-1.5 py-0.5 text-center font-semibold bg-[#0e2632] text-teal-200 select-none">
                        {formatScore2(hasil?.pengetahuanSAS)}
                      </td>
                      <td className="border-r border-[#1e3152] px-1.5 py-0.5 text-center font-bold bg-[#0f292a] text-emerald-200 select-none">
                        {formatScore2(hasil?.nilaiAkhirSTS)}
                      </td>
                      <td className="border-r border-[#1e3152] px-1.5 py-0.5 text-center font-bold bg-[#0f292a] text-emerald-200 select-none">
                        {formatScore2(hasil?.nilaiAkhirSAS)}
                      </td>

                      {/* Nilai Rapor (Bulat) & Predikat */}
                      <td
                        className={`${
                          pinNilaiRapor
                            ? "sticky right-[56px] z-20 border-l-2 border-l-amber-400/60 shadow-[-4px_0_10px_rgba(0,0,0,0.45)]"
                            : ""
                        } border-r border-[#1e3152] px-2 py-0.5 text-center text-xs font-extrabold select-none min-w-[64px] w-[64px] ${
                          isBelow
                            ? "bg-[#5c1324] text-rose-100"
                            : "bg-[#14382c] text-amber-300"
                        }`}
                      >
                        {formatIntegerScore(hasil?.nilaiRapor)}
                      </td>
                      <td
                        className={`${
                          pinNilaiRapor ? "sticky right-0 z-20" : ""
                        } px-2 pr-2.5 py-0.5 text-center text-xs font-extrabold select-none min-w-[56px] w-[56px] ${
                          isBelow
                            ? "bg-[#5c1324] text-rose-100"
                            : "bg-[#14382c] text-amber-300"
                        }`}
                      >
                        {hasil?.predikat ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Baris Ringkasan Kelas di bawah tabel */}
              <tfoot className="bg-[#111c33] text-slate-200 border-t-2 border-[#315182] font-mono text-xs">
                <tr className="border-b border-[#253e66]">
                  <td
                    colSpan={2}
                    className="sticky left-0 z-20 bg-[#111c33] border-r-2 border-[#315182] px-3 py-2 text-right font-sans font-bold text-slate-200"
                  >
                    Rata-Rata Kelas
                  </td>
                  {displayedBabNumbers.map((b) => (
                    <React.Fragment key={`foot-avg-${b}`}>
                      <td className="border-r border-[#253e66] px-1.5 py-2 text-center font-semibold">
                        {formatScore2(rataKolomKelas.babAverages[b]?.t)}
                      </td>
                      <td className="border-r border-[#253e66] px-1.5 py-2 text-center font-semibold">
                        {formatScore2(rataKolomKelas.babAverages[b]?.sh)}
                      </td>
                      <td className="border-r border-[#253e66] px-1.5 py-2 text-center font-semibold text-sky-300">
                        {formatScore2(rataKolomKelas.babAverages[b]?.rataBab)}
                      </td>
                      <td className="border-r border-[#253e66] px-1.5 py-2 text-center font-semibold">
                        {formatScore2(rataKolomKelas.babAverages[b]?.p)}
                      </td>
                    </React.Fragment>
                  ))}
                  <td className="border-r border-[#253e66] px-2 py-2 text-center font-semibold">
                    {formatScore2(rataKolomKelas.sts)}
                  </td>
                  <td className="border-r-2 border-[#315182] px-2 py-2 text-center font-semibold">
                    {formatScore2(rataKolomKelas.sat)}
                  </td>
                  <td className="border-r border-[#253e66] px-2 py-2 text-center font-semibold text-sky-200">
                    {formatScore2(rataKolomKelas.rataT)}
                  </td>
                  <td className="border-r border-[#253e66] px-2 py-2 text-center font-semibold text-sky-200">
                    {formatScore2(rataKolomKelas.rataSH)}
                  </td>
                  <td className="border-r border-[#253e66] px-2 py-2 text-center font-semibold text-sky-200">
                    {formatScore2(rataKolomKelas.rataP)}
                  </td>
                  <td className="border-r border-[#253e66] px-2 py-2 text-center font-semibold text-teal-200">
                    {formatScore2(rataKolomKelas.pengetahuanSTS)}
                  </td>
                  <td className="border-r border-[#253e66] px-2 py-2 text-center font-semibold text-teal-200">
                    {formatScore2(rataKolomKelas.pengetahuanSAS)}
                  </td>
                  <td className="border-r border-[#253e66] px-2 py-2 text-center font-bold text-emerald-200">
                    {formatScore2(rataKolomKelas.nilaiAkhirSTS)}
                  </td>
                  <td className="border-r border-[#253e66] px-2 py-2 text-center font-bold text-emerald-200">
                    {formatScore2(rataKolomKelas.nilaiAkhirSAS)}
                  </td>
                  <td
                    colSpan={2}
                    className={`${
                      pinNilaiRapor
                        ? "sticky right-0 z-20 border-l-2 border-l-amber-400/70"
                        : ""
                    } px-3 pr-4 py-2 text-center text-sm font-extrabold text-amber-300 bg-[#16382c]`}
                  >
                    {formatScore2(ringkasanKelas.rataRataNilaiRapor)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Summary Bar & Signature Preview */}
          <div className="p-4 bg-[#090f1d] border-t border-[#1a2948] space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="bg-[#111c33] border border-[#253e66] rounded-lg p-3">
                <div className="text-[11px] font-sans text-slate-400">
                  Rata-Rata Nilai Rapor Kelas
                </div>
                <div className="text-base font-bold text-white mt-0.5 tabular-nums">
                  {formatScore2(ringkasanKelas.rataRataNilaiRapor)}
                </div>
              </div>
              <div className="bg-[#111c33] border border-[#253e66] rounded-lg p-3">
                <div className="text-[11px] font-sans text-slate-400">
                  Nilai Rapor Tertinggi
                </div>
                <div className="text-base font-bold text-emerald-400 mt-0.5 tabular-nums">
                  {formatIntegerScore(ringkasanKelas.nilaiTertinggi)}
                </div>
              </div>
              <div className="bg-[#111c33] border border-[#253e66] rounded-lg p-3">
                <div className="text-[11px] font-sans text-slate-400">
                  Nilai Rapor Terendah
                </div>
                <div className="text-base font-bold text-amber-400 mt-0.5 tabular-nums">
                  {formatIntegerScore(ringkasanKelas.nilaiTerendah)}
                </div>
              </div>
              <div className="bg-[#111c33] border border-[#253e66] rounded-lg p-3">
                <div className="text-[11px] font-sans text-slate-400">
                  Siswa di Bawah 73 (KKM)
                </div>
                <div
                  className={`text-base font-bold mt-0.5 tabular-nums ${
                    ringkasanKelas.jumlahDiBawahKKM > 0
                      ? "text-rose-400"
                      : "text-emerald-400"
                  }`}
                >
                  {ringkasanKelas.jumlahDiBawahKKM} Siswa
                </div>
              </div>
            </div>

            {/* Keterangan Rentang Predikat & Tanda Tangan */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pt-2 border-t border-[#1a2948] text-xs text-slate-300">
              <div className="space-y-1">
                <div className="font-bold text-slate-200">
                  Keterangan Rentang Nilai Rapor &amp; Predikat:
                </div>
                <div className="text-slate-400 font-mono">
                  91–100 = A (Sangat Baik) · 81–90 = B (Baik) · 73–80 = C (Cukup) · &lt; 73 = D (Merah / Peringatan)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 text-center sm:min-w-[420px]">
                <div className="space-y-8">
                  <div>
                    <div className="text-slate-400">Mengetahui,</div>
                    <div className="font-bold text-slate-200">Kepala Sekolah</div>
                  </div>
                  <div className="font-bold underline text-white">
                    {docData.principalName || "Ari Gunawan, S.Kom."}
                  </div>
                </div>
                <div className="space-y-8">
                  <div>
                    <div className="text-slate-400">
                      {docData.signaturePlace || "Pangkalpinang"},{" "}
                      {docData.signatureDate}
                    </div>
                    <div className="font-bold text-slate-200">Guru Mata Pelajaran</div>
                  </div>
                  <div className="font-bold underline text-white">
                    {docData.teacherName || currentUser.name}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =================================================================
           VIEW 2: TABEL LEGGER NILAI PER-BAB (3.1, 4.1 ... 3.x, 4.x)
           ================================================================= */
        <div className="bg-[#0c1322] border border-[#1a2948] rounded-xl overflow-hidden shadow-xl">
          <div className="px-4 py-2.5 bg-[#090f1d] border-b border-[#1a2948] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <div>
              <strong>Tabel Legger Per-Bab:</strong> Kolom{" "}
              <span className="font-mono text-sky-300">3.x</span> = Rata Bab
              (Pengetahuan) bab ke-x · Kolom{" "}
              <span className="font-mono text-emerald-300">4.x</span> = Nilai Praktek
              (Keterampilan) bab ke-x. Hanya menampilkan{" "}
              <strong>{jumlahBab} bab aktif</strong>.
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollHorizontalTo("start")}
                className="px-2.5 py-1 rounded-md bg-[#162647] hover:bg-[#1f3460] border border-[#2c4878] text-xs font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <ChevronsLeft className="w-3.5 h-3.5 text-sky-400" />
                <span>Awal</span>
              </button>
              <button
                type="button"
                onClick={() => scrollHorizontalBy(-320)}
                className="px-2.5 py-1 rounded-md bg-blue-700 hover:bg-blue-600 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Geser Kiri</span>
              </button>
              <button
                type="button"
                onClick={() => scrollHorizontalBy(320)}
                className="px-2.5 py-1 rounded-md bg-blue-700 hover:bg-blue-600 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Geser Kanan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollHorizontalTo("end")}
                className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Lihat Nilai Rapor</span>
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={leggerScrollRef}
            onScroll={(e) => syncScrollMetrics(e.currentTarget)}
            className="akumulasi-scroll-container overflow-x-auto max-h-[68vh] overflow-y-auto scroll-smooth"
          >
            <table
              className="w-max min-w-full border-collapse text-xs font-mono tabular-nums"
              id="akumulasi-legger-table"
            >
              <thead className="sticky top-0 z-30 bg-[#111c33] text-slate-100 border-b-2 border-[#315182]">
                <tr>
                  <th className="sticky left-0 z-40 bg-[#111c33] border-r border-[#253e66] px-2.5 py-2.5 text-center font-bold w-11">
                    No
                  </th>
                  <th className="sticky left-[44px] z-40 bg-[#111c33] border-r-2 border-[#315182] px-3 py-2.5 text-left font-bold min-w-[210px]">
                    Nama Siswa
                  </th>
                  {activeBabNumbers.map((b) => (
                    <React.Fragment key={`legger-head-${b}`}>
                      <th className="border-r border-[#253e66] px-2.5 py-2.5 text-center font-bold bg-[#142642] text-sky-200 min-w-[68px]">
                        3.{b}
                      </th>
                      <th className="border-r border-[#253e66] px-2.5 py-2.5 text-center font-bold bg-[#122b38] text-emerald-200 min-w-[68px]">
                        4.{b}
                      </th>
                    </React.Fragment>
                  ))}
                  <th className="border-r border-[#253e66] px-2.5 py-2.5 text-center font-bold bg-[#16382c] text-amber-300 min-w-[76px]">
                    Nilai Rapor
                  </th>
                  <th className="px-2.5 py-2.5 text-center font-bold bg-[#16382c] text-amber-300 min-w-[68px]">
                    Predikat
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => {
                  const hasil = hasilPerSiswaMap[student.id];
                  const leggerList = hitungLeggerSiswa(hasil, jumlahBab);
                  const isBelow = hasil?.isBelowKKM ?? false;
                  const rowBg = isBelow
                    ? "bg-rose-950/35 hover:bg-rose-950/55"
                    : idx % 2 === 0
                    ? "bg-[#0c1322] hover:bg-[#131e36]"
                    : "bg-[#0e1729] hover:bg-[#131e36]";
                  const stickyBg = isBelow
                    ? "bg-[#2a121c]"
                    : idx % 2 === 0
                    ? "bg-[#0c1322]"
                    : "bg-[#0e1729]";

                  return (
                    <tr
                      key={`legger-row-${student.id}`}
                      className={`border-b border-[#1a2948] ${rowBg}`}
                    >
                      <td
                        className={`sticky left-0 z-20 ${stickyBg} border-r border-[#253e66] px-2 py-2 text-center text-slate-400`}
                      >
                        {idx + 1}
                      </td>
                      <td
                        className={`sticky left-[44px] z-20 ${stickyBg} border-r-2 border-[#315182] px-3 py-2 text-left font-sans font-semibold ${
                          isBelow ? "text-rose-200" : "text-slate-100"
                        }`}
                      >
                        {student.name}
                      </td>
                      {leggerList.map((item) => (
                        <React.Fragment key={`${student.id}-leg-${item.bab}`}>
                          <td className="border-r border-[#1a2948] px-2.5 py-2 text-center font-semibold text-sky-200">
                            {formatScore2(item.nilaiPengetahuan)}
                          </td>
                          <td className="border-r border-[#253e66] px-2.5 py-2 text-center font-semibold text-emerald-200">
                            {formatScore2(item.nilaiKeterampilan)}
                          </td>
                        </React.Fragment>
                      ))}
                      <td
                        className={`border-r border-[#1e3152] px-2.5 py-2 text-center font-bold ${
                          isBelow ? "text-rose-300" : "text-amber-300"
                        }`}
                      >
                        {formatIntegerScore(hasil?.nilaiRapor)}
                      </td>
                      <td
                        className={`px-2.5 py-2 text-center font-bold ${
                          isBelow ? "text-rose-300" : "text-amber-300"
                        }`}
                      >
                        {hasil?.predikat ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
