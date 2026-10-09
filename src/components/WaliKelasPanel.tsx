import React, { useState, useEffect, useRef } from "react";
import { Teacher, Student, Grade, WaliKelasNotesMap } from "../types";
import {
  Printer,
  ChevronRight,
  Award,
  AlertTriangle,
  Save,
  CheckCircle2,
  RefreshCw,
  UserPlus,
  X,
  AlertCircle,
  Search,
  Sparkles,
  ChevronLeft,
  BookOpen,
  Heart,
  Users,
  ShieldCheck,
  Check,
  RotateCcw,
  Archive,
  FileArchive,
  FileDown,
  CheckSquare,
  Square
} from "lucide-react";
import PrintRaportView from "./PrintRaportView";
import {
  downloadSingleStudentRaportPdf,
  downloadClassRaportZip,
  ZipBatchProgress,
  RaportFormatSettings,
  RaportPrincipalSettings
} from "../lib/raportPdfService";

interface WaliKelasPanelProps {
  user: Teacher;
  onRefreshTrigger: () => void;
}

export default function WaliKelasPanel({ user, onRefreshTrigger }: WaliKelasPanelProps) {
  // 15 Mata Pelajaran lists
  const subjects_list = [
    "PAI", "PPKN", "Bahasa Indonesia", "Matematika", "IPA", "IPS", "Bahasa Inggris", "PJOK", "Prakarya", "Informatika",
    "Bahasa Arab", "Tahsin ABaTaTsa", "Tahfizh Al-Qur’an", "Do’a Harian dan Hadits", "Wudhu dan Sholat"
  ];

  const initialClass = user.kelas || "7";
  const [selectedClass, setSelectedClass] = useState(initialClass);
  const [searchQuery, setSearchQuery] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [allClassNotes, setAllClassNotes] = useState<WaliKelasNotesMap>({});

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Attendance Form (Kedisiplinan)
  const [sakit, setSakit] = useState<string>("0");
  const [izin, setIzin] = useState<string>("0");
  const [alpa, setAlpa] = useState<string>("0");
  const [catatan, setCatatan] = useState<string>("");

  // Spiritual Character Form Elements
  const [spiritualUsaha, setSpiritualUsaha] = useState<string>("B");
  const [spiritualProses, setSpiritualProses] = useState<string>("B");
  const [spiritualCapaian, setSpiritualCapaian] = useState<string>("B");
  const [spiritualDeskripsi, setSpiritualDeskripsi] = useState<string>("");

  // Social Character Form Elements
  const [sosialUsaha, setSosialUsaha] = useState<string>("B");
  const [sosialProses, setSosialProses] = useState<string>("B");
  const [sosialCapaian, setSosialCapaian] = useState<string>("B");
  const [sosialDeskripsi, setSosialDeskripsi] = useState<string>("");

  // Form dirty tracking
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  isDirtyRef.current = isDirty;

  // Sub-navigation view state
  const [raportPrintTarget, setRaportPrintTarget] = useState<Student | null>(null);

  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeEkskulList, setActiveEkskulList] = useState<{ id: string; name: string; type: "Wajib" | "Pilihan" }[]>([]);

  // Quick Add Student Modal State
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentNisn, setNewStudentNisn] = useState("");
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [addStudentError, setAddStudentError] = useState("");

  // Raport Settings State (Loaded from server for PDF generation)
  const [raportSettings, setRaportSettings] = useState<{
    principal: RaportPrincipalSettings;
    format: RaportFormatSettings;
  }>({
    principal: { name: "Ari Gunawan, S.Kom.", nip: "" },
    format: {
      semesterName: "Ganjil",
      tahunPelajaran: "2026/2027",
      showLogo: true,
      paperSize: "A4",
      tanggalRaport: "17 Juni 2026",
      signatureCity: "Pangkal Pinang",
      principalTitle: "Kepala Sekolah",
      principalSignaturePosition: "bottom_center",
      showPrincipalNip: false,
      showParentSignature: true,
      watermarkOpacity: 0.05,
      watermarkSize: 440,
      descFontSize: "9pt",
    },
  });

  // Single & Batch ZIP Download states
  const [isDownloadingSingleId, setIsDownloadingSingleId] = useState<string | null>(null);
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<ZipBatchProgress>({
    current: 0,
    total: 0,
    studentName: "",
    percent: 0,
    status: "idle",
  });
  const [selectedStudentIdsForZip, setSelectedStudentIdsForZip] = useState<string[]>([]);
  const zipCancelRef = useRef(false);

  // Fetch report settings on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setRaportSettings({
            principal: {
              name: "Ari Gunawan, S.Kom.",
              nip: data.principalNip || "",
            },
            format: {
              semesterName: data.format?.semesterName || "Ganjil",
              tahunPelajaran: data.format?.tahunPelajaran || "2026/2027",
              showLogo: data.format?.showLogo !== undefined ? !!data.format.showLogo : true,
              paperSize: data.format?.paperSize || "A4",
              tanggalRaport: data.format?.tanggalRaport || "",
              signatureCity: data.format?.signatureCity || "Pangkal Pinang",
              principalTitle: data.format?.principalTitle || "Kepala Sekolah",
              principalSignaturePosition: data.format?.principalSignaturePosition || "bottom_center",
              showPrincipalNip: data.format?.showPrincipalNip !== false,
              showParentSignature: data.format?.showParentSignature !== false,
              watermarkOpacity: data.format?.watermarkOpacity || 0.05,
              watermarkSize: data.format?.watermarkSize || 440,
              descFontSize: data.format?.descFontSize || "9pt",
            },
          });
        }
      })
      .catch((err) => console.error("Error loading raport settings:", err));
  }, []);

  // Helper generators for professional religious & character descriptions
  const generateSpiritualNarrative = (name: string, pred: string) => {
    const sName = name || "ananda";
    if (pred === "A") {
      return `Alhamdulillah ananda ${sName} menunjukkan kesungguhan dan keteladanan yang sangat baik dalam seluruh ibadah wajib, tahsin, tahfizh, dan dzikir, serta senantiasa menjaga adab islami dengan istiqomah.`;
    } else if (pred === "B") {
      return `Alhamdulillah ananda ${sName} menunjukkan perkembangan spiritual yang baik. Ia telah memahami tata cara beribadah harian dengan rajin serta menjaga adab ketertiban bersama teman.`;
    } else if (pred === "C") {
      return `Ananda ${sName} cukup baik dalam pelaksanaan ibadah dan adab harian. Perlu terus didampingi dan dimotivasi dalam kedisiplinan sholat berjamaah dan muroja'ah hafalan.`;
    } else {
      return `Ananda ${sName} memerlukan bimbingan dan pembiasaan lebih intensif dalam kedisiplinan ibadah harian serta penanaman adab dan akhlak islami.`;
    }
  };

  const generateSosialNarrative = (name: string, pred: string) => {
    const sName = name || "ananda";
    if (pred === "A") {
      return `Alhamdulillah ananda ${sName} memiliki kepribadian santun, empati tinggi, sangat disiplin, proaktif dalam gotong royong, serta menjadi teladan yang baik bagi teman-temannya.`;
    } else if (pred === "B") {
      return `Alhamdulillah ananda ${sName} mudah bergaul, memiliki rasa empati yang baik, serta sopan santun dalam berinteraksi kepada ustadz/ustadzah maupun sesama kawan.`;
    } else if (pred === "C") {
      return `Ananda ${sName} cukup kooperatif dan dapat berbaur dengan teman. Perlu ditingkatkan konsistensi kedisiplinan dan rasa tanggung jawab dalam tugas bersama.`;
    } else {
      return `Ananda ${sName} memerlukan perhatian dan pendampingan khusus dalam membina interaksi sosial, pengelolaan emosi, dan kedisiplinan tata tertib sekolah.`;
    }
  };

  const generateCatatanWaliKelas = (name: string, avgScore: number) => {
    const sName = name || "Ananda";
    if (avgScore >= 85) {
      return `Selamat atas pencapaian luar biasa ananda ${sName}. Prestasi akademik dan karakter ananda sangat membanggakan. Teruslah istiqomah dan rendah hati.`;
    } else if (avgScore >= 75) {
      return `Alhamdulillah ananda ${sName} menunjukkan perkembangan yang baik dan semangat belajar yang konsisten. Terus tingkatkan ikhtiar dan doa untuk hasil yang lebih gemilang.`;
    } else {
      return `Kami berharap ananda ${sName} terus meningkatkan fokus, ketekunan, dan manajemen waktu dalam belajar agar potensi yang dimiliki dapat berkembang optimal.`;
    }
  };

  // Quick Add Student Handler
  const handleQuickAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddStudentError("");

    const name = newStudentName.trim();
    const nisn = newStudentNisn.trim().replace(/\D/g, "");

    if (!name) {
      setAddStudentError("Nama siswa wajib diisi.");
      return;
    }
    if (!nisn) {
      setAddStudentError("NISN siswa wajib diisi (numerik angka).");
      return;
    }

    setIsAddingStudent(true);
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          nisn,
          kelas: selectedClass
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menambahkan siswa.");
      }

      await fetchData();
      onRefreshTrigger();
      setIsAddStudentOpen(false);
      setNewStudentName("");
      setNewStudentNisn("");
      setSuccess(`Siswa ${name} berhasil ditambahkan ke Kelas ${selectedClass}!`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setAddStudentError(err.message || "Terjadi kesalahan saat menambahkan siswa.");
    } finally {
      setIsAddingStudent(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [resS, resG, resN, resE] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/grades"),
        fetch("/api/walikelas/notes"),
        fetch("/api/ekskul")
      ]);

      const sData = await resS.json();
      const gData = await resG.json();
      const nData = await resN.json();
      const eData = await resE.json();

      const studentsArray = Array.isArray(sData) ? sData : [];
      const gradesArray = Array.isArray(gData) ? gData : [];
      const notesObj = nData && typeof nData === "object" && !Array.isArray(nData) ? nData : {};
      const ekskulArray = Array.isArray(eData) ? eData : [];

      setStudents(studentsArray);
      setGrades(gradesArray);
      setAllClassNotes(notesObj);
      setActiveEkskulList(ekskulArray);

      // Select student
      const classStudents = studentsArray
        .filter((s: Student) => String(s.kelas).trim() === String(selectedClass).trim())
        .sort((a: Student, b: Student) => (a.name || "").localeCompare(b.name || "", "id", { sensitivity: "base" }));

      if (classStudents.length > 0) {
        if (!selectedStudent || !classStudents.some(s => s.id === selectedStudent.id)) {
          loadStudentData(classStudents[0], notesObj);
        } else {
          // Re-sync selected student data
          const current = classStudents.find(s => s.id === selectedStudent.id) || classStudents[0];
          loadStudentData(current, notesObj);
        }
      } else {
        setSelectedStudent(null);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Gagal memuat sinkronisasi data wali kelas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClass]);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (selectedStudent && !saveLoading) {
          saveCurrentNotes();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const loadStudentData = (student: Student, notesMap: WaliKelasNotesMap = allClassNotes) => {
    setSelectedStudent(student);
    setSuccess("");
    setError("");
    setIsDirty(false);

    const safeNotesMap = notesMap && typeof notesMap === "object" && !Array.isArray(notesMap) ? notesMap : {};
    const note = safeNotesMap[student.id];

    // Check local draft fallback
    let draft = null;
    try {
      const rawDraft = localStorage.getItem(`walikelas_draft_${student.id}`);
      if (rawDraft) draft = JSON.parse(rawDraft);
    } catch {}

    const source = draft || note;

    if (source) {
      setSakit(String(source.sakit ?? "0"));
      setIzin(String(source.izin ?? "0"));
      setAlpa(String(source.alpa ?? "0"));
      setCatatan(source.catatan || generateCatatanWaliKelas(student.name, 80));

      setSpiritualUsaha(source.spiritualUsaha || "B");
      setSpiritualProses(source.spiritualProses || "B");
      setSpiritualCapaian(source.spiritualCapaian || "B");
      setSpiritualDeskripsi(source.spiritualDeskripsi || generateSpiritualNarrative(student.name, source.spiritualCapaian || "B"));

      setSosialUsaha(source.sosialUsaha || "B");
      setSosialProses(source.sosialProses || "B");
      setSosialCapaian(source.sosialCapaian || "B");
      setSosialDeskripsi(source.sosialDeskripsi || generateSosialNarrative(student.name, source.sosialCapaian || "B"));
    } else {
      setSakit("0");
      setIzin("0");
      setAlpa("0");
      setCatatan(`Ananda ${student.name} menunjukkan kepribadian dan budi pekerti yang baik. Pertahankan terus semangat belajarmu.`);

      setSpiritualUsaha("B");
      setSpiritualProses("B");
      setSpiritualCapaian("B");
      setSpiritualDeskripsi(generateSpiritualNarrative(student.name, "B"));

      setSosialUsaha("B");
      setSosialProses("B");
      setSosialCapaian("B");
      setSosialDeskripsi(generateSosialNarrative(student.name, "B"));
    }
  };

  // Auto-save draft before switching student
  const handleStudentSelect = (student: Student) => {
    if (selectedStudent && selectedStudent.id !== student.id && isDirtyRef.current) {
      // Background auto-save previous student's edits so nothing is lost
      saveNotesForStudent(selectedStudent.id, {
        sakit: Number(sakit || 0),
        izin: Number(izin || 0),
        alpa: Number(alpa || 0),
        catatan,
        spiritualUsaha,
        spiritualProses,
        spiritualCapaian,
        spiritualDeskripsi,
        sosialUsaha,
        sosialProses,
        sosialCapaian,
        sosialDeskripsi
      });
    }

    loadStudentData(student, allClassNotes);
  };

  const saveNotesForStudent = async (studentId: string, data: any) => {
    try {
      const currentStudentNote = allClassNotes[studentId];
      const existingEkskul = currentStudentNote && Array.isArray(currentStudentNote.ekskul)
        ? currentStudentNote.ekskul
        : [];

      const payload = {
        studentId,
        sakit: Number(data.sakit || 0),
        izin: Number(data.izin || 0),
        alpa: Number(data.alpa || 0),
        catatan: data.catatan || "",
        spiritualUsaha: data.spiritualUsaha || "B",
        spiritualProses: data.spiritualProses || "B",
        spiritualCapaian: data.spiritualCapaian || "B",
        spiritualDeskripsi: data.spiritualDeskripsi || "",
        sosialUsaha: data.sosialUsaha || "B",
        sosialProses: data.sosialProses || "B",
        sosialCapaian: data.sosialCapaian || "B",
        sosialDeskripsi: data.sosialDeskripsi || "",
        ekskul: existingEkskul,
        updatedAt: new Date().toISOString()
      };

      // Update in-memory state immediately
      setAllClassNotes(prev => ({
        ...prev,
        [studentId]: payload
      }));

      // Cache draft in localStorage
      localStorage.setItem(`walikelas_draft_${studentId}`, JSON.stringify(payload));

      await fetch("/api/walikelas/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn("Background auto-save failed:", e);
    }
  };

  const saveCurrentNotes = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStudent) return;
    setError("");
    setSuccess("");
    setSaveLoading(true);

    try {
      const currentStudentNote = allClassNotes[selectedStudent.id];
      const existingEkskul = currentStudentNote && Array.isArray(currentStudentNote.ekskul)
        ? currentStudentNote.ekskul
        : [];

      const payload = {
        studentId: selectedStudent.id,
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
        ekskul: existingEkskul,
        updatedAt: new Date().toISOString()
      };

      // Optimistic update
      setAllClassNotes(prev => ({
        ...prev,
        [selectedStudent.id]: payload
      }));
      localStorage.setItem(`walikelas_draft_${selectedStudent.id}`, JSON.stringify(payload));

      const response = await fetch("/api/walikelas/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Gagal menyimpan catatan.");
      }

      setIsDirty(false);
      setSuccess(`Data Presensi, Evaluasi Sikap & Catatan Wali Kelas untuk ${selectedStudent.name} berhasil disimpan!`);
      onRefreshTrigger();

      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan catatan.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Filtered students
  const currentClassStudents = students
    .filter((s) => String(s.kelas).trim() === String(selectedClass).trim())
    .filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (s.name || "").toLowerCase().includes(q) || (s.nisn || "").toLowerCase().includes(q);
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "id", { sensitivity: "base" }));

  const currentStudentIndex = selectedStudent
    ? currentClassStudents.findIndex(s => s.id === selectedStudent.id)
    : -1;

  const handlePrevStudent = () => {
    if (currentStudentIndex > 0) {
      handleStudentSelect(currentClassStudents[currentStudentIndex - 1]);
    }
  };

  const handleNextStudent = () => {
    if (currentStudentIndex >= 0 && currentStudentIndex < currentClassStudents.length - 1) {
      handleStudentSelect(currentClassStudents[currentStudentIndex + 1]);
    }
  };

  // Single Student PDF Download handler
  const handleDownloadSingleStudent = async (studentToDownload: Student) => {
    if (!studentToDownload) return;
    setIsDownloadingSingleId(studentToDownload.id);
    try {
      const sGrades = grades.filter(
        (g) => String(g.studentId).trim() === String(studentToDownload.id).trim()
      );
      const sNote = allClassNotes[studentToDownload.id] || {
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
        ekskul: [],
      };

      await downloadSingleStudentRaportPdf({
        student: studentToDownload,
        grades: sGrades,
        waliKelasNote: sNote,
        waliKelas: user,
        principal: raportSettings.principal,
        format: raportSettings.format,
      });

      setSuccess(`Rapor ${studentToDownload.name} berhasil diunduh dalam format PDF!`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error("Single PDF download failed:", err);
      setError(err?.message || "Gagal mengunduh berkas PDF siswa.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsDownloadingSingleId(null);
    }
  };

  // Open ZIP Download Modal with all students selected by default
  const handleOpenZipModal = () => {
    const ids = currentClassStudents.map((s) => s.id);
    setSelectedStudentIdsForZip(ids);
    setZipProgress({
      current: 0,
      total: currentClassStudents.length,
      studentName: "",
      percent: 0,
      status: "idle",
    });
    setIsZipModalOpen(true);
  };

  // Toggle selection for ZIP batch
  const handleToggleSelectStudentForZip = (studentId: string) => {
    if (isGeneratingZip) return;
    setSelectedStudentIdsForZip((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleToggleSelectAllZip = () => {
    if (isGeneratingZip) return;
    if (selectedStudentIdsForZip.length === currentClassStudents.length) {
      setSelectedStudentIdsForZip([]);
    } else {
      setSelectedStudentIdsForZip(currentClassStudents.map((s) => s.id));
    }
  };

  // Run the ZIP compilation & download
  const handleStartZipDownload = async () => {
    const studentsToDownload = currentClassStudents.filter((s) =>
      selectedStudentIdsForZip.includes(s.id)
    );

    if (studentsToDownload.length === 0) {
      setError("Pilih minimal 1 siswa untuk diunduh.");
      setTimeout(() => setError(""), 4000);
      return;
    }

    setIsGeneratingZip(true);
    zipCancelRef.current = false;
    setZipProgress({
      current: 0,
      total: studentsToDownload.length,
      studentName: "Mempersiapkan dokumen...",
      percent: 0,
      status: "generating",
    });

    try {
      const result = await downloadClassRaportZip({
        students: studentsToDownload,
        allGrades: grades,
        allNotes: allClassNotes,
        waliKelas: user,
        principal: raportSettings.principal,
        format: raportSettings.format,
        className: selectedClass,
        onProgress: (p) => setZipProgress(p),
        isCancelled: () => zipCancelRef.current,
      });

      setSuccess(`Berhasil mengunduh ${result.count} rapor dalam berkas ZIP: ${result.zipName}`);
      setTimeout(() => setSuccess(""), 6000);
    } catch (err: any) {
      if (!zipCancelRef.current) {
        console.error("Error generating ZIP:", err);
        setZipProgress((prev) => ({
          ...prev,
          status: "error",
          errorMessage: err.message || "Gagal mengunduh berkas ZIP.",
        }));
      }
    } finally {
      setIsGeneratingZip(false);
    }
  };

  const studentGrades = selectedStudent
    ? grades.filter((g) => String(g.studentId).trim() === String(selectedStudent.id).trim())
    : [];
  const gradesCount = studentGrades.length;

  if (raportPrintTarget && selectedStudent) {
    const studentNote = allClassNotes[selectedStudent.id] || {
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
      sosialDeskripsi: ""
    };
    return (
      <PrintRaportView
        student={selectedStudent}
        grades={studentGrades}
        waliKelasNote={studentNote}
        waliKelas={user}
        allClassStudents={currentClassStudents}
        allClassNotes={allClassNotes}
        allGrades={grades}
        onBack={() => setRaportPrintTarget(null)}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="wali-kelas-panel">
      {/* Sidebar: Student list in class */}
      <div className="lg:col-span-4 bg-[#0f172a] rounded-2xl border-2 border-[#253e66] shadow-xl p-4.5 h-fit space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest block">
              ⭐ PANEL WALI KELAS
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
              Aktif
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-2 bg-[#142036] p-2.5 rounded-xl border border-[#2b446f]">
            <h3 className="text-sm font-black text-white">
              Kelas {selectedClass} {user.kelas === selectedClass && "⭐ (Kelas Anda)"}
            </h3>
            {user.subject === "Admin" && (
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedStudent(null);
                }}
                className="text-xs bg-[#090f1d] border border-emerald-500 rounded-lg px-2.5 py-1 font-bold text-white focus:outline-none"
              >
                <option value="7">Kelas 7</option>
                <option value="8">Kelas 8</option>
                <option value="9">Kelas 9</option>
              </select>
            )}
          </div>
        </div>

        {/* Quick Batch ZIP Download Banner for Walas */}
        <div className="bg-gradient-to-br from-[#0c2e22] to-[#122841] border border-emerald-500/50 rounded-xl p-3 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                <Archive className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white leading-tight">Unduh Rapor 1 Kelas</h4>
                <p className="text-[10px] text-emerald-300 font-mono">Format Arsip ZIP ({currentClassStudents.length} Siswa)</p>
              </div>
            </div>
            <button
              onClick={handleOpenZipModal}
              disabled={currentClassStudents.length === 0}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] rounded-lg transition shadow-md flex items-center gap-1 cursor-pointer border border-emerald-400 disabled:opacity-40"
              title="Unduh seluruh raport PDF kelas ini dalam satu berkas ZIP"
              id="unduh-zip-walas-btn"
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>Unduh ZIP</span>
            </button>
          </div>
        </div>

        {/* Student search & quick actions */}
        <div className="space-y-2 pt-1 border-t border-[#203254]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari siswa / NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-[#142036] text-white border border-[#2c4570] rounded-xl placeholder-slate-400 focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300 font-bold px-1">
            <span>Siswa ({currentClassStudents.length})</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setAddStudentError("");
                  setIsAddStudentOpen(true);
                }}
                title="Tambah Siswa Baru"
                className="p-1 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-black px-2"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Siswa</span>
              </button>
              <button
                onClick={fetchData}
                title="Refresh & Sinkronisasi Data"
                className="p-1.5 hover:bg-slate-700 rounded-lg transition cursor-pointer text-slate-300"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Student list */}
        <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1" id="walikelas-student-scroll">
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-300 font-bold italic bg-[#142036] rounded-xl">
              Memuat data siswa & nilai...
            </div>
          ) : currentClassStudents.length === 0 ? (
            <div className="text-xs text-slate-450 italic text-center py-6 bg-[#142036] rounded-xl text-slate-300 font-bold">
              {searchQuery ? "Tidak ada siswa yang cocok." : "Belum ada siswa di kelas ini."}
            </div>
          ) : (
            currentClassStudents.map((s) => {
              const sGrades = grades.filter((g) => g.studentId === s.id);
              const count = sGrades.length;
              const hasNotes = !!allClassNotes[s.id];
              const isSelected = selectedStudent?.id === s.id;

              return (
                <button
                  key={s.id}
                  onClick={() => handleStudentSelect(s)}
                  className={`w-full p-2.5 rounded-xl text-left text-xs transition flex flex-col gap-1 border-2 cursor-pointer ${
                    isSelected
                      ? "bg-[#0b291d] border-emerald-400 font-black text-white shadow-lg ring-2 ring-emerald-400/40"
                      : "bg-[#142036] border-[#253e66] text-white hover:bg-[#1a2c4a] hover:border-slate-300 font-bold"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-black block truncate leading-tight text-white">{s.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSingleStudent(s);
                        }}
                        disabled={isDownloadingSingleId === s.id}
                        className="p-1 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-200 rounded-lg transition cursor-pointer border border-transparent hover:border-emerald-500/40"
                        title={`Unduh PDF rapor ${s.name}`}
                      >
                        {isDownloadingSingleId === s.id ? (
                          <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FileDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? "translate-x-1 text-emerald-400" : ""}`} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className={`px-2 py-0.5 rounded-md font-bold ${
                      count === 15
                        ? "bg-emerald-800 text-emerald-100 border border-emerald-400"
                        : count > 0
                        ? "bg-amber-900/80 text-amber-200 border border-amber-500"
                        : "bg-slate-700 text-slate-300"
                    }`}>
                      Mapel: {count}/15
                    </span>
                    {hasNotes && (
                      <span className="bg-sky-900/80 border border-sky-400 text-sky-200 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Catatan
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main pane: Grade status, spiritual, social, attendance and homeroom note forms */}
      <div className="lg:col-span-8 space-y-4" id="walikelas-main-pane">
        {selectedStudent ? (
          <>
            {/* Student card header */}
            <div className="bg-[#0f172a] rounded-2xl border-2 border-[#253e66] shadow-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-800 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-md">
                  {selectedStudent.name?.charAt(0) || "?"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-white uppercase tracking-wide">
                      {selectedStudent.name || "N/A"}
                    </h3>
                    {isDirty && (
                      <span className="bg-amber-400 text-black text-[10px] font-black px-2 py-0.5 rounded-md animate-pulse">
                        Ada Perubahan Belum Disimpan
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-0.5 font-bold">
                    NISN: <span className="text-emerald-300">{selectedStudent.nisn || "-"}</span> • Kelas: <span className="text-emerald-300">{selectedStudent.kelas || "-"}</span>
                  </p>
                </div>
              </div>

              {/* Prev / Next & Raport Print triggers */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-[#142036] border border-[#2c4570] rounded-xl p-1">
                  <button
                    onClick={handlePrevStudent}
                    disabled={currentStudentIndex <= 0}
                    className="p-1.5 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-white font-bold cursor-pointer transition"
                    title="Siswa Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono px-2 text-slate-300 font-bold">
                    {currentStudentIndex + 1}/{currentClassStudents.length}
                  </span>
                  <button
                    onClick={handleNextStudent}
                    disabled={currentStudentIndex >= currentClassStudents.length - 1}
                    className="p-1.5 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-white font-bold cursor-pointer transition"
                    title="Siswa Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Single PDF Download */}
                <button
                  onClick={() => handleDownloadSingleStudent(selectedStudent)}
                  disabled={isDownloadingSingleId === selectedStudent.id}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1a2d4b] hover:bg-[#233a60] text-emerald-300 font-black text-xs rounded-xl transition shadow-md border border-emerald-500/50 cursor-pointer disabled:opacity-50"
                  title="Unduh berkas PDF Rapor siswa ini secara langsung"
                >
                  {isDownloadingSingleId === selectedStudent.id ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <span>Mengunduh...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 text-emerald-400" />
                      <span>Unduh PDF Siswa</span>
                    </>
                  )}
                </button>

                {/* View / Print Full Raport */}
                <button
                  onClick={() => setRaportPrintTarget(selectedStudent)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition shadow-lg border border-emerald-300 cursor-pointer"
                  id="view-raport-trigger"
                  title="Buka tampilan cetak & pratinjau rapor lengkap"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Rapor Siswa</span>
                </button>

                {/* Batch ZIP for Class */}
                <button
                  onClick={handleOpenZipModal}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-600 text-white font-black text-xs rounded-xl transition shadow-md border border-teal-400 cursor-pointer"
                  title="Unduh seluruh rapor siswa kelas ini dalam format berkas ZIP"
                >
                  <Archive className="w-4 h-4" />
                  <span>Unduh 1 Kelas (ZIP)</span>
                </button>
              </div>
            </div>

            {/* Error and success messages */}
            {error && (
              <div className="p-3 bg-red-950 border-2 border-red-500 text-red-100 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 bg-[#0b291d] border-2 border-emerald-400 text-emerald-100 text-xs font-black rounded-xl flex items-center gap-2 shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Sub-grid: 15 Subject completion rate checker */}
            <div className="bg-[#0f172a] rounded-2xl border-2 border-[#253e66] shadow-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#203254]">
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    Progres Kelengkapan Nilai Siswa (15 Mapel)
                  </h4>
                  <p className="text-[11px] text-slate-300 font-medium">
                    Nilai dari 15 guru mata pelajaran otomatis ditarik untuk lembar Rapor Siswa.
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-lg font-black border ${
                  gradesCount === 15
                    ? "bg-emerald-800 text-white border-emerald-300"
                    : "bg-amber-900 text-amber-100 border-amber-400"
                }`}>
                  {gradesCount}/15 Mapel Terisi
                </span>
              </div>

              {/* Visual mini circles representing 15 subjects */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2" id="subject-matrix-completion">
                {subjects_list.map((sub) => {
                  const xGrade = studentGrades.find((g) => g.subject === sub);
                  const isFilled = !!xGrade;

                  return (
                    <div
                      key={sub}
                      className={`p-2 rounded-xl border-2 text-center transition ${
                        isFilled
                          ? "bg-[#0b291d] border-emerald-400 text-white"
                          : "bg-[#142036] border-[#253e66] text-slate-400"
                      }`}
                    >
                      <span className="text-[10px] font-black block truncate" title={sub}>{sub}</span>
                      <span className="text-sm font-black block mt-0.5">
                        {isFilled ? <span className="text-emerald-300">{xGrade.score}</span> : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {gradesCount < 15 && (
                <div className="p-2.5 bg-amber-950/80 border border-amber-500 text-amber-200 text-xs rounded-xl flex items-start gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>
                    Catatan: Terdapat {15 - gradesCount} mata pelajaran belum diinput nilainya oleh guru pengampu.
                  </span>
                </div>
              )}
            </div>

            {/* Attendance & Character forms */}
            <form onSubmit={saveCurrentNotes} className="space-y-4">
              
              {/* BAGIAN E: SIKAP SPIRITUAL */}
              <div className="bg-[#0f172a] rounded-2xl border-2 border-[#253e66] shadow-xl p-4.5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#203254] pb-2.5">
                  <h4 className="font-black text-xs uppercase tracking-wider text-white flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <span>E. Evaluasi Sikap Spiritual (Wali Kelas)</span>
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSpiritualDeskripsi(generateSpiritualNarrative(selectedStudent.name, spiritualCapaian));
                        setIsDirty(true);
                      }}
                      className="px-2.5 py-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-[10px] font-black rounded-lg border border-emerald-500/50 cursor-pointer flex items-center gap-1 transition"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-300" />
                      <span>Generate Narasi</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-300 uppercase mb-1">1. Usaha</label>
                    <select
                      value={spiritualUsaha}
                      onChange={(e) => {
                        setSpiritualUsaha(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full p-2 bg-[#142036] border-2 border-[#2b446f] rounded-xl text-xs font-black text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="A">A (Sangat Baik)</option>
                      <option value="B">B (Baik)</option>
                      <option value="C">C (Cukup)</option>
                      <option value="D">D (Kurang)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-300 uppercase mb-1">2. Proses</label>
                    <select
                      value={spiritualProses}
                      onChange={(e) => {
                        setSpiritualProses(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full p-2 bg-[#142036] border-2 border-[#2b446f] rounded-xl text-xs font-black text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="A">A (Sangat Baik)</option>
                      <option value="B">B (Baik)</option>
                      <option value="C">C (Cukup)</option>
                      <option value="D">D (Kurang)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-300 uppercase mb-1">3. Capaian</label>
                    <select
                      value={spiritualCapaian}
                      onChange={(e) => {
                        const newCap = e.target.value;
                        setSpiritualCapaian(newCap);
                        setSpiritualDeskripsi(generateSpiritualNarrative(selectedStudent.name, newCap));
                        setIsDirty(true);
                      }}
                      className="w-full p-2 bg-[#142036] border-2 border-[#2b446f] rounded-xl text-xs font-black text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="A">A (Sangat Baik)</option>
                      <option value="B">B (Baik)</option>
                      <option value="C">C (Cukup)</option>
                      <option value="D">D (Kurang)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-black text-slate-300 uppercase">Deskripsi Sikap Spiritual</label>
                    <span className="text-[10px] text-slate-400">{spiritualDeskripsi.length} karakter</span>
                  </div>
                  <textarea
                    value={spiritualDeskripsi}
                    onChange={(e) => {
                      setSpiritualDeskripsi(e.target.value);
                      setIsDirty(true);
                    }}
                    rows={2}
                    placeholder="Deskripsi kemajuan sikap kerohanian, sholat, tahsin, tahfizh dan adab islami..."
                    className="w-full p-3 bg-[#142036] border-2 border-[#2b446f] rounded-xl text-xs text-white placeholder-slate-400 font-sans leading-relaxed focus:outline-none focus:border-emerald-400 font-medium"
                  />
                </div>
              </div>

              {/* BAGIAN F: SIKAP SOSIAL */}
              <div className="bg-[#0f172a] rounded-2xl border-2 border-[#253e66] shadow-xl p-4.5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#203254] pb-2.5">
                  <h4 className="font-black text-xs uppercase tracking-wider text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>F. Evaluasi Sikap Sosial (Wali Kelas)</span>
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSosialDeskripsi(generateSosialNarrative(selectedStudent.name, sosialCapaian));
                        setIsDirty(true);
                      }}
                      className="px-2.5 py-1 bg-sky-900/60 hover:bg-sky-800 text-sky-200 text-[10px] font-black rounded-lg border border-sky-500/50 cursor-pointer flex items-center gap-1 transition"
                    >
                      <Sparkles className="w-3 h-3 text-sky-300" />
                      <span>Generate Narasi</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-300 uppercase mb-1">1. Usaha</label>
                    <select
                      value={sosialUsaha}
                      onChange={(e) => {
                        setSosialUsaha(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full p-2 bg-[#142036] border-2 border-[#2b446f] rounded-xl text-xs font-black text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="A">A (Sangat Baik)</option>
                      <option value="B">B (Baik)</option>
                      <option value="C">C (Cukup)</option>
                      <option value="D">D (Kurang)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-300 uppercase mb-1">2. Proses</label>
                    <select
                      value={sosialProses}
                      onChange={(e) => {
                        setSosialProses(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full p-2 bg-[#142036] border-2 border-[#2b446f] rounded-xl text-xs font-black text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="A">A (Sangat Baik)</option>
                      <option value="B">B (Baik)</option>
                      <option value="C">C (Cukup)</option>
                      <option value="D">D (Kurang)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-300 uppercase mb-1">3. Capaian</label>
                    <select
                      value={sosialCapaian}
                      onChange={(e) => {
                        const newCap = e.target.value;
                        setSosialCapaian(newCap);
                        setSosialDeskripsi(generateSosialNarrative(selectedStudent.name, newCap));
                        setIsDirty(true);
                      }}
                      className="w-full p-2 bg-[#142036] border-2 border-[#2b446f] rounded-xl text-xs font-black text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="A">A (Sangat Baik)</option>
                      <option value="B">B (Baik)</option>
                      <option value="C">C (Cukup)</option>
                      <option value="D">D (Kurang)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-black text-slate-300 uppercase">Deskripsi Sikap Sosial</label>
                    <span className="text-[10px] text-slate-400">{sosialDeskripsi.length} karakter</span>
                  </div>
                  <textarea
                    value={sosialDeskripsi}
                    onChange={(e) => {
                      setSosialDeskripsi(e.target.value);
                      setIsDirty(true);
                    }}
                    rows={2}
                    placeholder="Deskripsi interaksi sosial, gotong-royong, empati dan kedisiplinan..."
                    className="w-full p-3 bg-[#142036] border-2 border-[#2b446f] rounded-xl text-xs text-white placeholder-slate-400 font-sans leading-relaxed focus:outline-none focus:border-emerald-400 font-medium"
                  />
                </div>
              </div>

              {/* BAGIAN G: KEDISIPLINAN & PRESENSI */}
              <div className="bg-[#0f172a] rounded-2xl border-2 border-[#253e66] shadow-xl p-4.5 space-y-3.5">
                <div className="border-b border-[#203254] pb-2.5 flex items-center justify-between">
                  <h4 className="font-black text-xs uppercase tracking-wider text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>G. Kedisiplinan & Presensi Absensi (Hari)</span>
                  </h4>
                  <span className="text-[10px] text-slate-300 font-bold">
                    Dicetak pada Bagian G Rapor
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#142036] p-3 rounded-xl border border-[#2b446f]">
                    <label className="block text-[10px] font-black text-slate-300 uppercase mb-1.5">Sakit (S)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={sakit}
                        onChange={(e) => {
                          setSakit(e.target.value.replace(/\D/g, ""));
                          setIsDirty(true);
                        }}
                        className="w-full text-center px-2 py-1.5 bg-[#090f1d] border-2 border-slate-600 rounded-lg font-black text-sm text-white focus:outline-none focus:border-emerald-400"
                      />
                      <span className="text-xs text-slate-300 font-bold">Hari</span>
                    </div>
                  </div>

                  <div className="bg-[#142036] p-3 rounded-xl border border-[#2b446f]">
                    <label className="block text-[10px] font-black text-slate-300 uppercase mb-1.5">Izin (I)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={izin}
                        onChange={(e) => {
                          setIzin(e.target.value.replace(/\D/g, ""));
                          setIsDirty(true);
                        }}
                        className="w-full text-center px-2 py-1.5 bg-[#090f1d] border-2 border-slate-600 rounded-lg font-black text-sm text-white focus:outline-none focus:border-emerald-400"
                      />
                      <span className="text-xs text-slate-300 font-bold">Hari</span>
                    </div>
                  </div>

                  <div className="bg-[#142036] p-3 rounded-xl border border-[#2b446f]">
                    <label className="block text-[10px] font-black text-slate-300 uppercase mb-1.5">Tanpa Keterangan (A)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={alpa}
                        onChange={(e) => {
                          setAlpa(e.target.value.replace(/\D/g, ""));
                          setIsDirty(true);
                        }}
                        className="w-full text-center px-2 py-1.5 bg-[#090f1d] border-2 border-slate-600 rounded-lg font-black text-sm text-white focus:outline-none focus:border-emerald-400"
                      />
                      <span className="text-xs text-slate-300 font-bold">Hari</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BAGIAN H: CATATAN UMUM WALI KELAS */}
              <div className="bg-[#0f172a] rounded-2xl border-2 border-[#253e66] shadow-xl p-4.5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#203254] pb-2.5">
                  <h4 className="font-black text-xs uppercase tracking-wider text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>H. Catatan Umum Wali Kelas</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setCatatan(generateCatatanWaliKelas(selectedStudent.name, 85));
                      setIsDirty(true);
                    }}
                    className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-200 text-[10px] font-black rounded-lg border border-amber-500/50 cursor-pointer flex items-center gap-1 transition"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Contoh Catatan</span>
                  </button>
                </div>

                <textarea
                  value={catatan}
                  onChange={(e) => {
                    setCatatan(e.target.value);
                    setIsDirty(true);
                  }}
                  rows={2}
                  placeholder={`Contoh: Ananda ${selectedStudent.name} menunjukkan kepribadian dan budi pekerti yang baik. Pertahankan terus semangat belajarmu.`}
                  className="w-full p-3 bg-[#142036] border-2 border-[#2b446f] rounded-xl text-xs text-white placeholder-slate-400 font-sans leading-relaxed focus:outline-none focus:border-emerald-400 font-medium"
                />
              </div>

              {/* EKSTRAKURIKULER (READ ONLY FOR WALI KELAS, AUTO DARI PEMBINA) */}
              <div className="bg-[#0f172a] rounded-2xl border-2 border-[#253e66] shadow-xl p-4.5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#203254] pb-2">
                  <h4 className="font-black text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Penilaian Ekstrakurikuler (Oleh Guru Pembina)</span>
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                    Otomatis dari Pembina Ekskul
                  </span>
                </div>

                {(() => {
                  const studentNote = allClassNotes[selectedStudent.id];
                  const studentEkskuls: any[] = studentNote && Array.isArray(studentNote.ekskul) ? studentNote.ekskul : [];

                  if (studentEkskuls.length === 0) {
                    return (
                      <div className="p-3.5 rounded-xl bg-[#142036] border border-[#253e66] text-center text-slate-300 text-xs italic font-medium">
                        Belum ada penilaian ekstrakurikuler dari Pembina untuk siswa ini.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {studentEkskuls.map((eks: any, idx: number) => {
                        const toLetter = (val: any, fallback = "B") => {
                          if (!val) return fallback;
                          const s = String(val).trim().toUpperCase();
                          if (s === "A" || s === "SANGAT BAIK" || s === "SB") return "A";
                          if (s === "B" || s === "BAIK") return "B";
                          if (s === "C" || s === "CUKUP" || s === "CB") return "C";
                          if (s === "D" || s === "KURANG" || s === "KB") return "D";
                          if (s.length === 1 && ["A", "B", "C", "D"].includes(s)) return s;
                          return fallback;
                        };
                        const fallbackLetter = toLetter(eks.predicate || eks.capaian || "B", "B");
                        const usahaVal = toLetter(eks.usaha, fallbackLetter);
                        const prosesVal = toLetter(eks.proses, fallbackLetter);
                        const capaianVal = toLetter(eks.capaian, fallbackLetter);

                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-xl border border-[#2b446f] bg-[#142036] space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <span className="font-black text-xs text-white">
                                  {eks.name}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                    eks.type === "Wajib"
                                      ? "bg-amber-900 text-amber-200 border border-amber-500"
                                      : "bg-sky-900 text-sky-200 border border-sky-500"
                                  }`}
                                >
                                  {eks.type || "Pilihan"}
                                </span>
                              </div>

                              {eks.pembinaName && (
                                <span className="text-[10px] text-slate-300">
                                  Pembina: <strong className="text-emerald-300 font-black">{eks.pembinaName}</strong>
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#203254]">
                              <div className="bg-[#090f1d] p-1.5 rounded-lg text-center border border-[#203254]">
                                <div className="text-[9px] font-black text-slate-400 uppercase">1. Usaha</div>
                                <div className="font-black text-xs text-emerald-300">{usahaVal}</div>
                              </div>
                              <div className="bg-[#090f1d] p-1.5 rounded-lg text-center border border-[#203254]">
                                <div className="text-[9px] font-black text-slate-400 uppercase">2. Proses</div>
                                <div className="font-black text-xs text-emerald-300">{prosesVal}</div>
                              </div>
                              <div className="bg-[#090f1d] p-1.5 rounded-lg text-center border border-[#203254]">
                                <div className="text-[9px] font-black text-slate-400 uppercase">3. Capaian</div>
                                <div className="font-black text-xs text-emerald-300">{capaianVal}</div>
                              </div>
                            </div>

                            {(eks.description || eks.deskripsi) && (
                              <div className="text-[11px] text-slate-200 bg-[#090f1d] p-2 rounded-lg border border-[#203254] leading-relaxed italic">
                                "{eks.description || eks.deskripsi}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* SAVE BUTTON & CONTROLS */}
              <div className="sticky bottom-4 z-20 bg-[#0f172a]/95 backdrop-blur-md p-3.5 rounded-2xl border-2 border-emerald-500/70 shadow-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isDirty ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                  <span className="text-xs font-bold text-white">
                    {isDirty ? "Perubahan belum disimpan (Tekan Simpan atau Ctrl+S)" : "Semua data tersimpan aman ✓"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50 border border-emerald-300"
                    id="submit-notes-button"
                  >
                    {saveLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan Evaluasi & Presensi</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </>
        ) : (
          <div className="p-16 text-center text-slate-300 italic text-sm bg-[#0f172a] border-2 border-[#253e66] rounded-2xl font-medium">
            Pilihlah peserta didik pada daftar sebelah kiri untuk menginput data presensi, karakter, dan mencetak raport.
          </div>
        )}
      </div>

      {/* QUICK ADD STUDENT MODAL FOR WALI KELAS */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] w-full max-w-md rounded-2xl border-2 border-[#253e66] shadow-2xl overflow-hidden animate-scale-up text-white">
            <div className="bg-emerald-700 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span>Tambah Siswa ke Kelas {selectedClass}</span>
              </h3>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="text-white hover:text-red-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddStudent} className="p-6 space-y-4">
              {addStudentError && (
                <div className="p-3 bg-red-950 border border-red-500 rounded-xl text-xs text-red-200 flex gap-2 items-start font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>{addStudentError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-200 mb-1.5 uppercase">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Contoh: Ahmad Fadilah"
                  className="w-full px-3.5 py-2.5 bg-[#142036] border border-[#2b446f] rounded-xl text-xs md:text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-200 mb-1.5 uppercase">
                  NISN Siswa (Nomor Induk Siswa Nasional)
                </label>
                <input
                  type="text"
                  required
                  value={newStudentNisn}
                  onChange={(e) => setNewStudentNisn(e.target.value)}
                  placeholder="Contoh: 0134988720"
                  className="w-full px-3.5 py-2.5 bg-[#142036] border border-[#2b446f] rounded-xl text-xs md:text-sm text-white focus:outline-none focus:border-emerald-400"
                  id="quick-student-nisn-input"
                />
              </div>

              <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-xs text-emerald-200 font-medium">
                Siswa baru akan otomatis terdaftar di <strong>Kelas {selectedClass}</strong> dan dapat langsung dinilai.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isAddingStudent}
                  onClick={() => setIsAddStudentOpen(false)}
                  className="w-1/2 py-2.5 border border-slate-600 text-slate-300 hover:bg-slate-800 text-xs font-black rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingStudent}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition disabled:opacity-60 shadow-lg border border-emerald-300"
                >
                  {isAddingStudent ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Siswa</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ZIP Export Modal for Wali Kelas */}
      {isZipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" id="walas-zip-export-modal">
          <div className="bg-[#0f172a] border-2 border-teal-500/60 rounded-2xl max-w-xl w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400 flex items-center justify-center text-teal-300">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Unduh Rapor Siswa (Format ZIP)</h3>
                  <p className="text-xs text-teal-300/80 font-mono">
                    Kelas {selectedClass} • {selectedStudentIdsForZip.length} dari {currentClassStudents.length} Siswa Terpilih
                  </p>
                </div>
              </div>
              {!isGeneratingZip && (
                <button
                  onClick={() => setIsZipModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Modal Body: Generating Progress */}
            {isGeneratingZip || zipProgress.status === "generating" || zipProgress.status === "zipping" ? (
              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-teal-300 flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                    <span>{zipProgress.status === "zipping" ? "Mengompresi ke Berkas ZIP..." : "Membuat & Mengonversi Dokumen PDF..."}</span>
                  </span>
                  <span className="font-mono text-teal-400 font-black text-sm">{zipProgress.percent}%</span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700 p-0.5">
                  <div
                    className="bg-gradient-to-r from-teal-500 via-emerald-400 to-green-500 h-full rounded-full transition-all duration-300 shadow-md"
                    style={{ width: `${zipProgress.percent}%` }}
                  />
                </div>

                <div className="bg-[#142036] p-3.5 rounded-xl border border-[#233c66] text-xs space-y-1.5">
                  <div className="text-slate-400 text-[11px] font-mono">Status Saat Ini:</div>
                  <div className="text-white font-bold text-sm truncate">
                    {zipProgress.current > 0 ? `${zipProgress.current} dari ${zipProgress.total}: ` : ""}
                    {zipProgress.studentName || "Mempersiapkan template..."}
                  </div>
                  <div className="text-emerald-400 text-[10px] italic">
                    Setiap halaman diberi nomor urut dan watermark secara otomatis.
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic text-center">
                  💡 Harap jangan menutup jendela browser Anda hingga proses kompilasi berkas ZIP selesai.
                </p>

                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => {
                      zipCancelRef.current = true;
                    }}
                    className="px-4 py-2 bg-red-950/80 hover:bg-red-900 border border-red-500 text-red-200 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Batalkan Pengunduhan
                  </button>
                </div>
              </div>
            ) : zipProgress.status === "done" ? (
              <div className="py-4 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-emerald-300">Pengunduhan ZIP Selesai!</h4>
                <p className="text-xs text-slate-300 leading-relaxed px-4">
                  Seluruh <strong>{zipProgress.total} berkas rapor siswa Kelas {selectedClass}</strong> telah berhasil dikemas dan diunduh ke komputer Anda dalam satu berkas arsip ZIP.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={() => setIsZipModalOpen(false)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition shadow-lg border border-emerald-300 cursor-pointer"
                  >
                    Selesai & Tutup
                  </button>
                  <button
                    onClick={() => {
                      setZipProgress({ current: 0, total: currentClassStudents.length, studentName: "", percent: 0, status: "idle" });
                    }}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-600 transition cursor-pointer"
                  >
                    Unduh Lagi
                  </button>
                </div>
              </div>
            ) : (
              /* Idle / Student Selection Mode */
              <div className="space-y-4">
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 leading-relaxed">
                  Fitur ini memungkinkan wali kelas mengunduh seluruh raport siswa dalam format <strong>PDF beresolusi tinggi</strong> sekaligus dalam satu berkas arsip <strong>ZIP</strong> tanpa perlu mendownload satu per satu.
                </div>

                <div className="flex items-center justify-between text-xs font-bold px-1">
                  <button
                    onClick={handleToggleSelectAllZip}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 cursor-pointer font-black text-xs"
                  >
                    {selectedStudentIdsForZip.length === currentClassStudents.length ? (
                      <>
                        <CheckSquare className="w-4 h-4" />
                        <span>Batalkan Pilih Semua</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" />
                        <span>Pilih Semua Siswa ({currentClassStudents.length})</span>
                      </>
                    )}
                  </button>
                  <span className="text-slate-400 text-[11px] font-mono">
                    {selectedStudentIdsForZip.length} Siswa Dipilih
                  </span>
                </div>

                {/* Students Checklist */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 border border-slate-700/80 p-2 rounded-xl bg-[#090f1d]">
                  {currentClassStudents.map((s, idx) => {
                    const isChecked = selectedStudentIdsForZip.includes(s.id);
                    const sGrades = grades.filter((g) => g.studentId === s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleToggleSelectStudentForZip(s.id)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition border ${
                          isChecked
                            ? "bg-[#0f291e] border-emerald-500/60 text-white font-bold"
                            : "bg-[#142036] border-slate-800 text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="font-mono text-[11px] text-slate-400">{String(idx + 1).padStart(2, "0")}.</span>
                          <span className="font-bold text-white">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            NISN: {s.nisn || "-"}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            sGrades.length === 15 ? "bg-emerald-900 text-emerald-200" : "bg-amber-950 text-amber-300"
                          }`}>
                            Mapel: {sGrades.length}/15
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-700/80">
                  <button
                    onClick={() => setIsZipModalOpen(false)}
                    className="px-4 py-2 border border-slate-600 text-slate-300 hover:bg-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleStartZipDownload}
                    disabled={selectedStudentIdsForZip.length === 0}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition shadow-lg border border-emerald-300 flex items-center gap-2 cursor-pointer disabled:opacity-40"
                  >
                    <Archive className="w-4 h-4" />
                    <span>Mulai Unduh ZIP ({selectedStudentIdsForZip.length} Siswa)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
