import React, { useState, useEffect } from "react";
import { Teacher, Student, SUBJECT_LIST, Halaqoh, Ekskul } from "../types";
import {
  Users,
  GraduationCap,
  Plus,
  Trash2,
  Edit,
  Key,
  Save,
  BookOpen,
  CalendarDays,
  UserCheck,
  X,
  AlertCircle,
  Award,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  Search,
  FileText,
  Copy,
  PenTool,
  LayoutTemplate,
  MapPin,
  Sparkles,
  Check,
  AlertTriangle,
  CheckSquare,
  Square,
  MinusSquare,
  ShieldAlert,
  Download,
  Database,
  RotateCcw,
  UploadCloud,
  RefreshCw,
} from "lucide-react";

interface AdminPanelProps {
  onRefreshTrigger: () => void;
}

export default function AdminPanel({ onRefreshTrigger }: AdminPanelProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    "teachers" | "students" | "tps" | "settings" | "ekskul" | "halaqoh" | "backup"
  >("teachers");

  // State arrays fetched from API
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [halaqohList, setHalaqohList] = useState<Halaqoh[]>([]);
  const [isHalaqohModalOpen, setIsHalaqohModalOpen] = useState(false);
  const [editingHalaqoh, setEditingHalaqoh] = useState<Halaqoh | null>(null);
  const [halaqohModalError, setHalaqohModalError] = useState("");
  const [isSubmittingHalaqoh, setIsSubmittingHalaqoh] = useState(false);
  const [halaqohForm, setHalaqohForm] = useState({
    name: "",
    mentorName: "",
    mentorTeacherId: "",
    studentIds: [] as string[],
  });
  const [halaqohStudentSearch, setHalaqohStudentSearch] = useState("");
  const [halaqohClassFilter, setHalaqohClassFilter] = useState("all");
  const [halaqohGenderFilter, setHalaqohGenderFilter] = useState("all");
  const [tpsTemplates, setTpsTemplates] = useState<{
    [subject: string]: { id: string; text: string }[];
  }>({});
  const [ekskuls, setEkskuls] = useState<
    { id: string; name: string; type: "Wajib" | "Pilihan" }[]
  >([]);

  // Principal settings state
  const [principalName, setPrincipalName] = useState(
    "Ustadz H. Ir. Abdul Muhyi, M.Pd",
  );
  const [principalNip, setPrincipalNip] = useState("19780512 200501 1 002");
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Raport formatting settings state
  const [semesterName, setSemesterName] = useState("Ganjil");
  const [tahunPelajaran, setTahunPelajaran] = useState("2026/2027");
  const [fontSize, setFontSize] = useState("11pt");
  const [showLogo, setShowLogo] = useState(true);
  const [showSpiritual, setShowSpiritual] = useState(true);
  const [showSosial, setShowSosial] = useState(true);
  const [showAttendance, setShowAttendance] = useState(true);
  const [showCatatan, setShowCatatan] = useState(true);
  const [fontFamily, setFontFamily] = useState("Times New Roman");
  const [paperSize, setPaperSize] = useState("A4");
  const [tanggalRaport, setTanggalRaport] = useState("17 Juni 2026");
  const [watermarkSize, setWatermarkSize] = useState(440);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.05);

  // Signature Position & Layout settings
  const [principalSignaturePosition, setPrincipalSignaturePosition] = useState<
    "bottom_center" | "bottom_left" | "bottom_right" | "inline_three_columns" | "top_left"
  >("bottom_center");
  const [signatureCity, setSignatureCity] = useState("Pangkal Pinang");
  const [principalTitle, setPrincipalTitle] = useState("Kepala Sekolah");
  const [showPrincipalNip, setShowPrincipalNip] = useState(true);
  const [showParentSignature, setShowParentSignature] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals / Form States
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherModalError, setTeacherModalError] = useState("");
  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    username: "",
    password: "",
    subject: "IPA",
    isWaliKelas: false,
    kelas: "",
    isPembinaEkskul: false,
    pembinaEkskulId: "",
    pembinaEkskulName: "",
  });

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentModalError, setStudentModalError] = useState("");
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({
    name: "",
    nisn: "",
    kelas: "7",
  });

  // Batch student import state
  const [isBatchStudentModalOpen, setIsBatchStudentModalOpen] = useState(false);
  const [batchRawText, setBatchRawText] = useState("");
  const [batchDefaultClass, setBatchDefaultClass] = useState("7");
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    success: boolean;
    addedCount: number;
    duplicatesCount: number;
    duplicates: string[];
    errors: string[];
  } | null>(null);

  // Batch student edit state (Edit Massal)
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);
  const [batchEditActiveTab, setBatchEditActiveTab] = useState<"paste" | "table">("paste");
  const [batchEditRawText, setBatchEditRawText] = useState("");
  const [batchEditMatchBy, setBatchEditMatchBy] = useState<"nisn" | "name" | "id">("nisn");
  const [batchEditDefaultClass, setBatchEditDefaultClass] = useState("7");
  const [isSubmittingBatchEdit, setIsSubmittingBatchEdit] = useState(false);
  const [batchEditResult, setBatchEditResult] = useState<{
    success: boolean;
    updatedCount: number;
    notFoundCount: number;
    notFound: string[];
    errors: string[];
  } | null>(null);

  // Table Grid batch edit state
  const [gridEditStudents, setGridEditStudents] = useState<{
    id: string;
    name: string;
    nisn: string;
    kelas: string;
    originalName: string;
    originalNisn: string;
    originalKelas: string;
    isDirty: boolean;
  }[]>([]);
  const [gridEditClassFilter, setGridEditClassFilter] = useState<string>("all");
  const [gridEditSearch, setGridEditSearch] = useState<string>("");
  const [gridEditSelectedIds, setGridEditSelectedIds] = useState<string[]>([]);


  // Student filtering & search
  const [studentClassFilter, setStudentClassFilter] = useState<string>("all");
  const [studentSearch, setStudentSearch] = useState<string>("");

  // Multi-Selection State for Bulk Deletions
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  // Confirmation Delete Modal State
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    type: "single_student" | "bulk_students" | "single_teacher" | "bulk_teachers";
    targetId?: string;
    targetName?: string;
    targetIds?: string[];
    count?: number;
    details?: string;
  }>({
    isOpen: false,
    type: "single_student",
  });
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Memoized live parsing of batch input
  const parsedBatchStudents = React.useMemo(() => {
    if (!batchRawText.trim()) return [];
    const lines = batchRawText.split(/\r?\n/);
    const existingNisns = new Set(students.map((s) => String(s.nisn || "").trim()));
    const seenBatchNisns = new Set<string>();

    const results: {
      rawLine: string;
      nisn: string;
      name: string;
      kelas: string;
      status: "valid" | "duplicate_db" | "duplicate_batch" | "invalid_nisn" | "invalid_name";
      message: string;
    }[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Check if header row
      const lower = line.toLowerCase();
      if (
        (lower.includes("nisn") && (lower.includes("nama") || lower.includes("name"))) ||
        (lower.includes("no") && lower.includes("siswa"))
      ) {
        continue;
      }

      // Delimiter detection
      let tokens: string[] = [];
      if (line.includes("\t")) {
        tokens = line.split("\t");
      } else if (line.includes(";")) {
        tokens = line.split(";");
      } else if (line.includes("|")) {
        tokens = line.split("|");
      } else if (line.includes(",")) {
        tokens = line.split(",");
      } else {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          tokens = [parts[0], parts.slice(1).join(" ")];
        } else {
          tokens = [line];
        }
      }

      tokens = tokens.map((t) => t.trim()).filter((t) => t.length > 0);
      if (tokens.length === 0) continue;

      let nisn = "";
      let name = "";
      let kelas = batchDefaultClass;

      if (tokens.length === 1) {
        name = tokens[0];
      } else if (tokens.length === 2) {
        const d0 = tokens[0].replace(/\D/g, "");
        const d1 = tokens[1].replace(/\D/g, "");
        if (d0.length >= 4 && d1.length < 4) {
          nisn = d0;
          name = tokens[1];
        } else if (d1.length >= 4 && d0.length < 4) {
          nisn = d1;
          name = tokens[0];
        } else {
          nisn = d0 || tokens[0];
          name = tokens[1];
        }
      } else if (tokens.length === 3) {
        if (/^\d{1,3}$/.test(tokens[0]) && tokens[1].replace(/\D/g, "").length >= 4) {
          nisn = tokens[1].replace(/\D/g, "");
          name = tokens[2];
        } else {
          nisn = tokens[0].replace(/\D/g, "");
          name = tokens[1];
          const k = tokens[2].replace(/\D/g, "");
          if (["7", "8", "9"].includes(k)) kelas = k;
          else kelas = tokens[2];
        }
      } else if (tokens.length >= 4) {
        nisn = tokens[1].replace(/\D/g, "");
        name = tokens[2];
        const k = tokens[3].replace(/\D/g, "");
        if (["7", "8", "9"].includes(k)) kelas = k;
        else kelas = tokens[3];
      }

      // Live validation
      if (!name) {
        results.push({
          rawLine,
          nisn,
          name: "-",
          kelas,
          status: "invalid_name",
          message: "Nama siswa kosong",
        });
      } else if (!nisn || nisn.length < 4) {
        results.push({
          rawLine,
          nisn,
          name,
          kelas,
          status: "invalid_nisn",
          message: "NISN tidak valid (min. 4 angka)",
        });
      } else if (existingNisns.has(nisn)) {
        results.push({
          rawLine,
          nisn,
          name,
          kelas,
          status: "duplicate_db",
          message: "NISN sudah ada di database",
        });
      } else if (seenBatchNisns.has(nisn)) {
        results.push({
          rawLine,
          nisn,
          name,
          kelas,
          status: "duplicate_batch",
          message: "NISN duplikat di teks ini",
        });
      } else {
        seenBatchNisns.add(nisn);
        results.push({
          rawLine,
          nisn,
          name,
          kelas,
          status: "valid",
          message: "Siap disimpan",
        });
      }
    }

    return results;
  }, [batchRawText, batchDefaultClass, students]);

  const fillSampleBatchData = () => {
    const sample = `0012984101\tAhmad Fauzi Ramadhan\t7
0012984102\tAisyah Putri Azzahra\t7
0012984103\tBilal Al-Ghifari\t7
0012984104\tFatimah Az-Zahra\t8
0012984105\tMuhammad Farhan Hakim\t8
0012984106\tZahra Nurul Izzah\t9`;
    setBatchRawText(sample);
  };

  const handleBatchStudentSubmit = async () => {
    const validStudents = parsedBatchStudents
      .filter((p) => p.status === "valid")
      .map((p) => ({
        nisn: p.nisn,
        name: p.name,
        kelas: p.kelas || batchDefaultClass || "7",
      }));

    if (validStudents.length === 0) {
      alert("Tidak ada baris siswa yang valid untuk disimpan.");
      return;
    }

    setIsSubmittingBatch(true);
    setBatchResult(null);
    try {
      const res = await fetch("/api/students/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: validStudents }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengimpor siswa.");
      }

      setBatchResult({
        success: true,
        addedCount: data.addedCount || validStudents.length,
        duplicatesCount: data.duplicatesCount || 0,
        duplicates: data.duplicates || [],
        errors: data.errors || [],
      });

      await fetchAllData();
      onRefreshTrigger();
      showSuccess(`Berhasil menginput ${data.addedCount || validStudents.length} siswa baru sekaligus!`);
      setBatchRawText("");
    } catch (err: any) {
      setBatchResult({
        success: false,
        addedCount: 0,
        duplicatesCount: 0,
        duplicates: [],
        errors: [err.message || "Gagal menginput siswa."],
      });
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // ==================== BATCH EDIT (EDIT MASSAL) HELPERS ====================
  const openBatchEditModal = () => {
    setBatchEditResult(null);
    const sorted = [...students].sort((a, b) => {
      if (a.kelas && b.kelas && String(a.kelas).trim() !== String(b.kelas).trim()) {
        return String(a.kelas).localeCompare(String(b.kelas), "id", { numeric: true });
      }
      return String(a.name || "").localeCompare(String(b.name || ""), "id", { sensitivity: "base" });
    });
    setGridEditStudents(
      sorted.map((s) => ({
        id: s.id,
        name: s.name,
        nisn: s.nisn,
        kelas: s.kelas,
        originalName: s.name,
        originalNisn: s.nisn,
        originalKelas: s.kelas,
        isDirty: false,
      }))
    );
    setGridEditSelectedIds([]);
    setIsBatchEditModalOpen(true);
  };

  const loadCurrentStudentsIntoBatchEditText = (cls: string = "all") => {
    let list = cls === "all" ? [...students] : students.filter((s) => String(s.kelas).trim() === cls);
    if (list.length === 0) {
      alert(`Tidak ada siswa di ${cls === "all" ? "database" : "Kelas " + cls}.`);
      return;
    }
    list.sort((a, b) => {
      if (cls === "all" && a.kelas && b.kelas && String(a.kelas).trim() !== String(b.kelas).trim()) {
        return String(a.kelas).localeCompare(String(b.kelas), "id", { numeric: true });
      }
      return String(a.name || "").localeCompare(String(b.name || ""), "id", { sensitivity: "base" });
    });
    const text = list.map((s) => `${s.nisn}\t${s.name}\t${s.kelas}`).join("\n");
    setBatchEditRawText(text);
    setBatchEditResult(null);
  };

  const fillSampleBatchEditData = () => {
    if (students.length > 0) {
      const sample = students.slice(0, 5).map((s) => `${s.nisn}\t${s.name} (Revisi)\t${s.kelas}`).join("\n");
      setBatchEditRawText(sample);
    } else {
      setBatchEditRawText(`0012984101\tAhmad Fauzi Ramadhan\t7\n0012984102\tAisyah Putri Azzahra\t7\n0012984103\tBilal Al-Ghifari\t8`);
    }
  };

  // Memoized live parsing of batch edit input
  const parsedBatchEditStudents = React.useMemo(() => {
    if (!batchEditRawText.trim()) return [];
    const lines = batchEditRawText.split(/\r?\n/);

    const results: {
      rawLine: string;
      targetStudentId?: string;
      currentStudent?: Student;
      newNisn: string;
      newName: string;
      newKelas: string;
      hasNameChange: boolean;
      hasNisnChange: boolean;
      hasKelasChange: boolean;
      status: "ready" | "unchanged" | "not_found" | "invalid_nisn" | "invalid_name" | "nisn_taken_by_other";
      message: string;
    }[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Skip header row
      const lower = line.toLowerCase();
      if (
        (lower.includes("nisn") && (lower.includes("nama") || lower.includes("name"))) ||
        (lower.includes("no") && lower.includes("siswa"))
      ) {
        continue;
      }

      // Delimiters
      let tokens: string[] = [];
      if (line.includes("\t")) {
        tokens = line.split("\t");
      } else if (line.includes(";")) {
        tokens = line.split(";");
      } else if (line.includes("|")) {
        tokens = line.split("|");
      } else if (line.includes(",")) {
        tokens = line.split(",");
      } else {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          tokens = [parts[0], parts.slice(1).join(" ")];
        } else {
          tokens = [line];
        }
      }

      tokens = tokens.map((t) => t.trim()).filter((t) => t.length > 0);
      if (tokens.length === 0) continue;

      let keyToken = "";
      let nameToken = "";
      let kelasToken = batchEditDefaultClass;

      if (tokens.length === 1) {
        keyToken = tokens[0];
      } else if (tokens.length === 2) {
        const d0 = tokens[0].replace(/\D/g, "");
        const d1 = tokens[1].replace(/\D/g, "");
        if (d0.length >= 4 && d1.length < 4) {
          keyToken = d0;
          nameToken = tokens[1];
        } else if (d1.length >= 4 && d0.length < 4) {
          keyToken = d1;
          nameToken = tokens[0];
        } else {
          keyToken = d0 || tokens[0];
          nameToken = tokens[1];
        }
      } else if (tokens.length === 3) {
        if (/^\d{1,3}$/.test(tokens[0]) && tokens[1].replace(/\D/g, "").length >= 4) {
          keyToken = tokens[1].replace(/\D/g, "");
          nameToken = tokens[2];
        } else {
          keyToken = tokens[0].replace(/\D/g, "") || tokens[0];
          nameToken = tokens[1];
          const k = tokens[2].replace(/\D/g, "");
          if (["7", "8", "9"].includes(k)) kelasToken = k;
          else kelasToken = tokens[2];
        }
      } else if (tokens.length >= 4) {
        keyToken = tokens[1].replace(/\D/g, "") || tokens[1];
        nameToken = tokens[2];
        const k = tokens[3].replace(/\D/g, "");
        if (["7", "8", "9"].includes(k)) kelasToken = k;
        else kelasToken = tokens[3];
      }

      // Find matching student
      let matchedStudent: Student | undefined;
      const cleanKeyDigits = keyToken.replace(/\D/g, "");

      if (batchEditMatchBy === "nisn") {
        matchedStudent = students.find(
          (s) => String(s.nisn).trim().replace(/\D/g, "") === cleanKeyDigits || String(s.nisn).trim() === keyToken
        );
      } else if (batchEditMatchBy === "name") {
        const targetNameSearch = (nameToken || keyToken).toLowerCase();
        matchedStudent = students.find(
          (s) => s.name.trim().toLowerCase() === targetNameSearch
        );
      } else if (batchEditMatchBy === "id") {
        matchedStudent = students.find((s) => s.id === keyToken);
      }

      // Fallback matching if not found
      if (!matchedStudent) {
        if (cleanKeyDigits.length >= 4) {
          matchedStudent = students.find(
            (s) => String(s.nisn).trim().replace(/\D/g, "") === cleanKeyDigits
          );
        }
        if (!matchedStudent && nameToken) {
          matchedStudent = students.find(
            (s) => s.name.trim().toLowerCase() === nameToken.trim().toLowerCase()
          );
        }
      }

      if (!matchedStudent) {
        results.push({
          rawLine,
          newNisn: cleanKeyDigits || keyToken,
          newName: nameToken || keyToken,
          newKelas: kelasToken,
          hasNameChange: false,
          hasNisnChange: false,
          hasKelasChange: false,
          status: "not_found",
          message: `Siswa "${keyToken}" tidak ditemukan`,
        });
        continue;
      }

      // Determine updated values
      let finalName = matchedStudent.name;
      let finalNisn = matchedStudent.nisn;
      let finalKelas = matchedStudent.kelas;

      if (batchEditMatchBy === "nisn") {
        if (nameToken) finalName = nameToken;
        if (kelasToken) finalKelas = kelasToken;
      } else if (batchEditMatchBy === "name") {
        if (cleanKeyDigits) finalNisn = cleanKeyDigits;
        if (kelasToken) finalKelas = kelasToken;
      } else {
        if (nameToken) finalName = nameToken;
        if (kelasToken) finalKelas = kelasToken;
      }

      const hasNameChange = finalName !== matchedStudent.name;
      const hasNisnChange = finalNisn !== matchedStudent.nisn;
      const hasKelasChange = String(finalKelas).trim() !== String(matchedStudent.kelas).trim();
      const isModified = hasNameChange || hasNisnChange || hasKelasChange;

      // Duplicate checking for new NISN
      if (hasNisnChange) {
        const nisnTakenByOther = students.some(
          (s) => s.id !== matchedStudent!.id && String(s.nisn).trim() === finalNisn
        );
        if (nisnTakenByOther) {
          results.push({
            rawLine,
            targetStudentId: matchedStudent.id,
            currentStudent: matchedStudent,
            newNisn: finalNisn,
            newName: finalName,
            newKelas: finalKelas,
            hasNameChange,
            hasNisnChange,
            hasKelasChange,
            status: "nisn_taken_by_other",
            message: `NISN ${finalNisn} sudah digunakan siswa lain`,
          });
          continue;
        }
      }

      if (!finalName) {
        results.push({
          rawLine,
          targetStudentId: matchedStudent.id,
          currentStudent: matchedStudent,
          newNisn: finalNisn,
          newName: "-",
          newKelas: finalKelas,
          hasNameChange,
          hasNisnChange,
          hasKelasChange,
          status: "invalid_name",
          message: "Nama siswa kosong",
        });
        continue;
      }

      if (!finalNisn || finalNisn.length < 4) {
        results.push({
          rawLine,
          targetStudentId: matchedStudent.id,
          currentStudent: matchedStudent,
          newNisn: finalNisn,
          newName: finalName,
          newKelas: finalKelas,
          hasNameChange,
          hasNisnChange,
          hasKelasChange,
          status: "invalid_nisn",
          message: "NISN tidak valid",
        });
        continue;
      }

      if (isModified) {
        results.push({
          rawLine,
          targetStudentId: matchedStudent.id,
          currentStudent: matchedStudent,
          newNisn: finalNisn,
          newName: finalName,
          newKelas: finalKelas,
          hasNameChange,
          hasNisnChange,
          hasKelasChange,
          status: "ready",
          message: "Siap diperbarui",
        });
      } else {
        results.push({
          rawLine,
          targetStudentId: matchedStudent.id,
          currentStudent: matchedStudent,
          newNisn: finalNisn,
          newName: finalName,
          newKelas: finalKelas,
          hasNameChange: false,
          hasNisnChange: false,
          hasKelasChange: false,
          status: "unchanged",
          message: "Data sama (tidak ada perubahan)",
        });
      }
    }

    return results;
  }, [batchEditRawText, batchEditMatchBy, batchEditDefaultClass, students]);

  const handleBatchEditSubmit = async () => {
    let updatesToSubmit: { id: string; name: string; nisn: string; kelas: string }[] = [];

    if (batchEditActiveTab === "paste") {
      const validRows = parsedBatchEditStudents.filter((p) => p.status === "ready" && p.targetStudentId);
      if (validRows.length === 0) {
        alert("Tidak ada pembaruan data siswa yang perlu disimpan.");
        return;
      }
      updatesToSubmit = validRows.map((p) => ({
        id: p.targetStudentId!,
        name: p.newName,
        nisn: p.newNisn,
        kelas: p.newKelas,
      }));
    } else {
      // Table Grid tab
      const modifiedRows = gridEditStudents.filter((s) => s.isDirty);
      if (modifiedRows.length === 0) {
        alert("Belum ada perubahan data siswa di tabel.");
        return;
      }
      updatesToSubmit = modifiedRows.map((s) => ({
        id: s.id,
        name: s.name.trim(),
        nisn: s.nisn.trim().replace(/\D/g, ""),
        kelas: s.kelas.trim(),
      }));
    }

    setIsSubmittingBatchEdit(true);
    setBatchEditResult(null);

    try {
      const res = await fetch("/api/students/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: updatesToSubmit }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui data siswa secara massal.");
      }

      setBatchEditResult({
        success: true,
        updatedCount: data.updatedCount || updatesToSubmit.length,
        notFoundCount: data.notFoundCount || 0,
        notFound: data.notFound || [],
        errors: data.errors || [],
      });

      await fetchAllData();
      onRefreshTrigger();
      showSuccess(`Alhamdulillah! Berhasil memperbarui data ${data.updatedCount || updatesToSubmit.length} siswa secara massal.`);

      // Update grid states
      setGridEditStudents((prev) =>
        prev.map((s) => {
          const updated = updatesToSubmit.find((u) => u.id === s.id);
          if (updated) {
            return {
              ...s,
              name: updated.name,
              nisn: updated.nisn,
              kelas: updated.kelas,
              originalName: updated.name,
              originalNisn: updated.nisn,
              originalKelas: updated.kelas,
              isDirty: false,
            };
          }
          return s;
        })
      );
    } catch (err: any) {
      setBatchEditResult({
        success: false,
        updatedCount: 0,
        notFoundCount: 0,
        notFound: [],
        errors: [err.message || "Gagal memperbarui data siswa."],
      });
    } finally {
      setIsSubmittingBatchEdit(false);
    }
  };

  // In Grid Tab: Quick bulk actions
  const handleGridBulkClassChange = (targetClass: string) => {
    setGridEditStudents((prev) =>
      prev.map((s) => {
        const isTarget =
          gridEditSelectedIds.length > 0
            ? gridEditSelectedIds.includes(s.id)
            : gridEditClassFilter === "all" || String(s.kelas).trim() === gridEditClassFilter;
        if (isTarget) {
          const isDirty =
            s.name !== s.originalName ||
            s.nisn !== s.originalNisn ||
            targetClass !== s.originalKelas;
          return { ...s, kelas: targetClass, isDirty };
        }
        return s;
      })
    );
    showSuccess(`Kelas berhasil diubah ke Kelas ${targetClass}`);
  };

  const handleGridBulkTitleCase = () => {
    const toTitleCase = (str: string) =>
      str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

    setGridEditStudents((prev) =>
      prev.map((s) => {
        const isTarget =
          gridEditSelectedIds.length > 0
            ? gridEditSelectedIds.includes(s.id)
            : gridEditClassFilter === "all" || String(s.kelas).trim() === gridEditClassFilter;
        if (isTarget) {
          const formatted = toTitleCase(s.name.trim());
          const isDirty =
            formatted !== s.originalName ||
            s.nisn !== s.originalNisn ||
            s.kelas !== s.originalKelas;
          return { ...s, name: formatted, isDirty };
        }
        return s;
      })
    );
    showSuccess("Format nama siswa berhasil dirapikan ke Title Case.");
  };


  const filteredStudents = React.useMemo(() => {
    return students
      .filter((s) => {
        const matchClass =
          studentClassFilter === "all" ||
          String(s.kelas).trim() === studentClassFilter;
        const q = studentSearch.trim().toLowerCase();
        const matchSearch =
          !q ||
          s.name.toLowerCase().includes(q) ||
          String(s.nisn).includes(q);
        return matchClass && matchSearch;
      })
      .sort((a, b) => {
        if (studentClassFilter === "all" && a.kelas !== b.kelas) {
          return String(a.kelas).localeCompare(String(b.kelas), "id", { numeric: true });
        }
        return String(a.name || "").localeCompare(String(b.name || ""), "id", { sensitivity: "base" });
      });
  }, [students, studentClassFilter, studentSearch]);

  const [tpForm, setTpForm] = useState({
    subject: "IPA",
    text: "",
    kelas: "7",
  });
  const [tpFilterClass, setTpFilterClass] = useState<"all" | "7" | "8" | "9">("all");

  const [newEkskulName, setNewEkskulName] = useState("");
  const [newEkskulType, setNewEkskulType] = useState<"Wajib" | "Pilihan">(
    "Pilihan",
  );
  const [newEkskulPembinaTeacherId, setNewEkskulPembinaTeacherId] = useState("");
  const [ekskulLoading, setEkskulLoading] = useState(false);

  // Edit Ekskul Modal State
  const [isEkskulEditModalOpen, setIsEkskulEditModalOpen] = useState(false);
  const [editingEkskul, setEditingEkskul] = useState<Ekskul | null>(null);
  const [editEkskulForm, setEditEkskulForm] = useState<{
    name: string;
    type: "Wajib" | "Pilihan";
    pembinaTeacherId: string;
  }>({
    name: "",
    type: "Pilihan",
    pembinaTeacherId: "",
  });

  const handleAddEkskul = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEkskulName.trim()) return;
    setError("");
    setEkskulLoading(true);
    try {
      const selectedTeacher = teachers.find(
        (t) => t.id === newEkskulPembinaTeacherId,
      );
      const res = await fetch("/api/ekskul", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEkskulName.trim(),
          type: newEkskulType,
          pembinaTeacherId: newEkskulPembinaTeacherId || "",
          pembinaName: selectedTeacher ? selectedTeacher.name : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah ekskul.");
      
      // If teacher was selected, update teacher object as well
      if (selectedTeacher && data.id) {
        await fetch(`/api/teachers/${selectedTeacher.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...selectedTeacher,
            isPembinaEkskul: true,
            pembinaEkskulId: data.id,
            pembinaEkskulName: data.name,
          }),
        });
      }

      setNewEkskulName("");
      setNewEkskulType("Pilihan");
      setNewEkskulPembinaTeacherId("");
      await fetchAllData();
      showSuccess("Ekstrakurikuler berhasil ditambahkan!");
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan.");
    } finally {
      setEkskulLoading(false);
    }
  };

  const startEditEkskul = (e: Ekskul) => {
    setEditingEkskul(e);
    setEditEkskulForm({
      name: e.name,
      type: e.type,
      pembinaTeacherId: e.pembinaTeacherId || "",
    });
    setIsEkskulEditModalOpen(true);
  };

  const handleUpdateEkskul = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEkskul || !editEkskulForm.name.trim()) return;
    setError("");
    setEkskulLoading(true);
    try {
      const selectedTeacher = teachers.find(
        (t) => t.id === editEkskulForm.pembinaTeacherId,
      );
      const res = await fetch(`/api/ekskul/${editingEkskul.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editEkskulForm.name.trim(),
          type: editEkskulForm.type,
          pembinaTeacherId: editEkskulForm.pembinaTeacherId || "",
          pembinaName: selectedTeacher ? selectedTeacher.name : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui ekskul.");

      // Sync teacher's pembina status if assigned
      if (selectedTeacher) {
        await fetch(`/api/teachers/${selectedTeacher.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...selectedTeacher,
            isPembinaEkskul: true,
            pembinaEkskulId: editingEkskul.id,
            pembinaEkskulName: editEkskulForm.name.trim(),
          }),
        });
      }

      setIsEkskulEditModalOpen(false);
      setEditingEkskul(null);
      await fetchAllData();
      showSuccess("Ekstrakurikuler berhasil diperbarui!");
    } catch (err: any) {
      setError(err.message || "Gagal memperbarui.");
    } finally {
      setEkskulLoading(false);
    }
  };

  const handleDeleteEkskul = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus ekstrakurikuler ini?"))
      return;
    setError("");
    try {
      const res = await fetch(`/api/ekskul/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus.");
      await fetchAllData();
      showSuccess("Ekstrakurikuler berhasil dihapus.");
    } catch (err: any) {
      setError(err.message || "Gagal menghapus.");
    }
  };

  // Fetch all starting info
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [resT, resS, resTp, resSet, resEks, resHlq] = await Promise.all([
        fetch("/api/teachers"),
        fetch("/api/students"),
        fetch("/api/tps"),
        fetch("/api/settings"),
        fetch("/api/ekskul"),
        fetch("/api/halaqoh"),
      ]);

      const tData = await resT.json();
      const sData = await resS.json();
      const tpData = await resTp.json();
      const setData = await resSet.json();
      const eksData = await resEks.json();
      const hlqData = await resHlq.json();

      if (Array.isArray(tData)) setTeachers(tData);
      if (Array.isArray(sData)) setStudents(sData);
      if (Array.isArray(hlqData)) setHalaqohList(hlqData);
      if (tpData && typeof tpData === "object" && !Array.isArray(tpData)) setTpsTemplates(tpData);
      if (Array.isArray(eksData)) setEkskuls(eksData);
      if (setData && typeof setData === "object") {
        if (setData.principalName) {
          setPrincipalName(setData.principalName);
        }
        if (setData.principalNip) {
          setPrincipalNip(setData.principalNip);
        }
        if (setData.format) {
          setSemesterName(setData.format.semesterName || "Ganjil");
          setTahunPelajaran(setData.format.tahunPelajaran || "2026/2027");
          setFontSize(setData.format.fontSize || "11pt");
          setShowLogo(
            setData.format.showLogo !== undefined
              ? !!setData.format.showLogo
              : true,
          );
          setShowSpiritual(
            setData.format.showSpiritual !== undefined
              ? setData.format.showSpiritual
              : true,
          );
          setShowSosial(
            setData.format.showSosial !== undefined
              ? setData.format.showSosial
              : true,
          );
          setShowAttendance(
            setData.format.showAttendance !== undefined
              ? setData.format.showAttendance
              : true,
          );
          setShowCatatan(
            setData.format.showCatatan !== undefined
              ? setData.format.showCatatan
              : true,
          );
          setFontFamily(setData.format.fontFamily || "Times New Roman");
          setPaperSize(setData.format.paperSize || "A4");
          setTanggalRaport(setData.format.tanggalRaport || "17 Juni 2026");
          setPrincipalSignaturePosition(
            setData.format.principalSignaturePosition || "bottom_center"
          );
          setSignatureCity(setData.format.signatureCity || "Pangkal Pinang");
          setPrincipalTitle(setData.format.principalTitle || "Kepala Sekolah");
          setShowPrincipalNip(
            setData.format.showPrincipalNip !== undefined
              ? setData.format.showPrincipalNip
              : true
          );
          setShowParentSignature(
            setData.format.showParentSignature !== undefined
              ? setData.format.showParentSignature
              : true
          );
          setWatermarkSize(
            setData.format.watermarkSize !== undefined
              ? Number(setData.format.watermarkSize)
              : 440,
          );
          setWatermarkOpacity(
            setData.format.watermarkOpacity !== undefined
              ? Number(setData.format.watermarkOpacity)
              : 0.05,
          );
        }
      }
    } catch (err) {
      setError("Gagal memuat database dari server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [activeTab]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleHalaqohSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHalaqohModalError("");
    setError("");

    if (!halaqohForm.name.trim()) {
      setHalaqohModalError("Nama halaqoh wajib diisi.");
      return;
    }

    setIsSubmittingHalaqoh(true);
    try {
      const url = editingHalaqoh
        ? `/api/halaqoh/${editingHalaqoh.id}`
        : "/api/halaqoh";
      const method = editingHalaqoh ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(halaqohForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan data halaqoh.");

      await fetchAllData();
      onRefreshTrigger();
      setIsHalaqohModalOpen(false);
      setEditingHalaqoh(null);
      setHalaqohForm({ name: "", mentorName: "", mentorTeacherId: "", studentIds: [] });
      showSuccess(editingHalaqoh ? "Data halaqoh berhasil diperbarui!" : "Kelompok halaqoh baru berhasil dibuat!");
    } catch (err: any) {
      setHalaqohModalError(err.message || "Terjadi kesalahan.");
    } finally {
      setIsSubmittingHalaqoh(false);
    }
  };

  const startEditHalaqoh = (h: Halaqoh) => {
    setEditingHalaqoh(h);
    setHalaqohModalError("");
    setHalaqohForm({
      name: h.name,
      mentorName: h.mentorName,
      mentorTeacherId: h.mentorTeacherId || "",
      studentIds: h.studentIds || [],
    });
    setIsHalaqohModalOpen(true);
  };

  const deleteHalaqoh = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kelompok halaqoh ini?")) return;
    try {
      const res = await fetch(`/api/halaqoh/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus halaqoh.");
      await fetchAllData();
      onRefreshTrigger();
      showSuccess("Kelompok halaqoh berhasil dihapus.");
    } catch (err: any) {
      setError(err.message || "Gagal menghapus halaqoh.");
    }
  };

  // TEACHER CRUD
  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherModalError("");
    setError("");

    const payload = {
      ...teacherForm,
      name: teacherForm.name.trim(),
      username: teacherForm.username.trim().toLowerCase(),
      password: teacherForm.password.trim(),
      subject: teacherForm.subject.trim(),
      kelas: teacherForm.isWaliKelas ? teacherForm.kelas : "",
    };

    if (!payload.name) {
      setTeacherModalError("Nama lengkap guru wajib diisi.");
      return;
    }
    if (!payload.username) {
      setTeacherModalError("Login username guru wajib diisi.");
      return;
    }
    if (!payload.password) {
      setTeacherModalError("Kata sandi akun guru wajib diisi.");
      return;
    }
    if (!payload.subject) {
      setTeacherModalError("Mata pelajaran guru wajib dipilih.");
      return;
    }
    if (payload.isWaliKelas && !payload.kelas) {
      setTeacherModalError("Silakan pilih kelas asuhan untuk wali kelas (Kelas 7, 8, atau 9).");
      return;
    }

    setIsSubmittingTeacher(true);
    try {
      const url = editingTeacher
        ? `/api/teachers/${editingTeacher.id}`
        : "/api/teachers";
      const method = editingTeacher ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan rincian guru.");
      }

      // If assigned as pembina ekskul, sync to ekskul master document
      if (payload.isPembinaEkskul && payload.pembinaEkskulId) {
        const teacherId = data.id || editingTeacher?.id || "";
        await fetch(`/api/ekskul/${payload.pembinaEkskulId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pembinaTeacherId: teacherId,
            pembinaName: payload.name,
          }),
        });
      }

      await fetchAllData();
      onRefreshTrigger();
      setIsTeacherModalOpen(false);
      setEditingTeacher(null);
      setTeacherModalError("");
      setTeacherForm({
        name: "",
        username: "",
        password: "",
        subject: "IPA",
        isWaliKelas: false,
        kelas: "",
        isPembinaEkskul: false,
        pembinaEkskulId: "",
        pembinaEkskulName: "",
      });
      showSuccess(
        editingTeacher
          ? "Data guru berhasil diperbarui!"
          : "Guru baru berhasil ditambahkan!",
      );
    } catch (err: any) {
      setTeacherModalError(err.message || "Terjadi kesalahan saat menyimpan data guru.");
      setError(err.message || "Terjadi kesalahan saat menyimpan data guru.");
    } finally {
      setIsSubmittingTeacher(false);
    }
  };

  const startEditTeacher = (t: Teacher) => {
    setEditingTeacher(t);
    setTeacherModalError("");
    setTeacherForm({
      name: t.name,
      username: t.username,
      password: t.password || "123",
      subject: t.subject,
      isWaliKelas: t.isWaliKelas,
      kelas: t.kelas || "",
      isPembinaEkskul: !!t.isPembinaEkskul,
      pembinaEkskulId: t.pembinaEkskulId || "",
      pembinaEkskulName: t.pembinaEkskulName || "",
    });
    setIsTeacherModalOpen(true);
  };

  const deleteTeacher = async (id: string) => {
    const teacherToDelete = teachers.find((t) => t.id === id);
    if (id === "t1" || teacherToDelete?.username === "admin") {
      setError("Akun Super Admin utama tidak boleh dihapus.");
      return;
    }
    setConfirmDeleteModal({
      isOpen: true,
      type: "single_teacher",
      targetId: id,
      targetName: teacherToDelete ? teacherToDelete.name : "Guru",
      details: teacherToDelete ? `Mata Pelajaran: ${teacherToDelete.subject}${teacherToDelete.isWaliKelas ? ` (Wali Kelas ${teacherToDelete.kelas})` : ""}` : "",
    });
  };

  const promptDeleteBulkTeachers = () => {
    const validIds = selectedTeacherIds.filter((id) => id !== "t1");
    if (validIds.length === 0) return;
    setConfirmDeleteModal({
      isOpen: true,
      type: "bulk_teachers",
      targetIds: validIds,
      count: validIds.length,
      details: `${validIds.length} akun guru terpilih akan dihapus dari sistem.`,
    });
  };

  const toggleSelectTeacher = (id: string) => {
    if (id === "t1") return; // Protect Super Admin
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllTeachers = () => {
    const deletableTeachers = teachers.filter((t) => t.id !== "t1");
    const allSelected = deletableTeachers.every((t) =>
      selectedTeacherIds.includes(t.id)
    );
    if (allSelected) {
      setSelectedTeacherIds([]);
    } else {
      setSelectedTeacherIds(deletableTeachers.map((t) => t.id));
    }
  };

  const clearTeacherSelection = () => {
    setSelectedTeacherIds([]);
  };

  // STUDENT CRUD
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentModalError("");
    setError("");

    const payload = {
      ...studentForm,
      name: studentForm.name.trim(),
      nisn: studentForm.nisn.trim().replace(/\D/g, ""),
      kelas: studentForm.kelas.trim(),
    };

    if (!payload.name) {
      setStudentModalError("Nama lengkap siswa wajib diisi.");
      return;
    }
    if (!payload.nisn) {
      setStudentModalError("NISN siswa wajib diisi (numerik angka).");
      return;
    }
    if (!payload.kelas) {
      setStudentModalError("Kelas siswa wajib dipilih (7, 8, atau 9).");
      return;
    }

    setIsSubmittingStudent(true);
    try {
      const url = editingStudent
        ? `/api/students/${editingStudent.id}`
        : "/api/students";
      const method = editingStudent ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan rincian siswa.");
      }

      await fetchAllData();
      onRefreshTrigger();
      setIsStudentModalOpen(false);
      setEditingStudent(null);
      setStudentModalError("");
      setStudentForm({
        name: "",
        nisn: "",
        kelas: "7",
      });
      showSuccess(
        editingStudent
          ? "Data siswa berhasil diperbarui!"
          : "Siswa baru berhasil ditambahkan!",
      );
    } catch (err: any) {
      setStudentModalError(err.message || "Terjadi kesalahan saat menyimpan data siswa.");
      setError(err.message || "Terjadi kesalahan saat menyimpan data siswa.");
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  const startEditStudent = (s: Student) => {
    setEditingStudent(s);
    setStudentModalError("");
    setStudentForm({
      name: s.name,
      nisn: s.nisn,
      kelas: s.kelas,
    });
    setIsStudentModalOpen(true);
  };

  const deleteStudent = async (id: string) => {
    const studentToDelete = students.find((s) => s.id === id);
    setConfirmDeleteModal({
      isOpen: true,
      type: "single_student",
      targetId: id,
      targetName: studentToDelete ? studentToDelete.name : "Siswa",
      details: studentToDelete ? `NISN: ${studentToDelete.nisn} • Kelas: ${studentToDelete.kelas}` : "",
    });
  };

  const promptDeleteBulkStudents = () => {
    if (selectedStudentIds.length === 0) return;
    setConfirmDeleteModal({
      isOpen: true,
      type: "bulk_students",
      targetIds: [...selectedStudentIds],
      count: selectedStudentIds.length,
      details: `${selectedStudentIds.length} siswa terpilih beserta seluruh data nilai dan catatan wali kelasnya akan dihapus.`,
    });
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllStudents = () => {
    const currentFilteredIds = filteredStudents.map((s) => s.id);
    const allSelected = currentFilteredIds.length > 0 && currentFilteredIds.every((id) =>
      selectedStudentIds.includes(id)
    );
    if (allSelected) {
      // Deselect currently filtered
      setSelectedStudentIds((prev) =>
        prev.filter((id) => !currentFilteredIds.includes(id))
      );
    } else {
      // Add all currently filtered
      setSelectedStudentIds((prev) => [
        ...prev,
        ...currentFilteredIds.filter((id) => !prev.includes(id)),
      ]);
    }
  };

  const clearStudentSelection = () => {
    setSelectedStudentIds([]);
  };

  // Centralized Execution Handler for Deletions
  const handleExecuteDelete = async () => {
    setIsDeleting(true);
    setError("");

    try {
      if (confirmDeleteModal.type === "single_student" && confirmDeleteModal.targetId) {
        const id = confirmDeleteModal.targetId;
        const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menghapus siswa.");
        setSelectedStudentIds((prev) => prev.filter((item) => item !== id));
        showSuccess(`Siswa "${confirmDeleteModal.targetName}" berhasil dihapus.`);
      } else if (confirmDeleteModal.type === "bulk_students" && confirmDeleteModal.targetIds) {
        const ids = confirmDeleteModal.targetIds;
        const res = await fetch("/api/students/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menghapus data siswa massal.");
        setSelectedStudentIds((prev) => prev.filter((item) => !ids.includes(item)));
        showSuccess(`Alhamdulillah! Berhasil menghapus ${ids.length} siswa secara massal.`);
      } else if (confirmDeleteModal.type === "single_teacher" && confirmDeleteModal.targetId) {
        const id = confirmDeleteModal.targetId;
        const res = await fetch(`/api/teachers/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menghapus guru.");
        setSelectedTeacherIds((prev) => prev.filter((item) => item !== id));
        showSuccess(`Guru "${confirmDeleteModal.targetName}" berhasil dihapus.`);
      } else if (confirmDeleteModal.type === "bulk_teachers" && confirmDeleteModal.targetIds) {
        const ids = confirmDeleteModal.targetIds;
        const res = await fetch("/api/teachers/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menghapus guru massal.");
        setSelectedTeacherIds((prev) => prev.filter((item) => !ids.includes(item)));
        showSuccess(`Alhamdulillah! Berhasil menghapus ${ids.length} guru secara massal.`);
      }

      await fetchAllData();
      onRefreshTrigger();
      setConfirmDeleteModal({ isOpen: false, type: "single_student" });
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menghapus data.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Objectives (TP) Adding
  const addTpObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tpForm.text) return;
    setError("");

    try {
      const response = await fetch("/api/tps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: tpForm.subject,
          tpText: tpForm.text,
          kelas: tpForm.kelas || "7",
        }),
      });

      if (!response.ok) throw new Error("Gagal menambah Tujuan Pembelajaran.");

      setTpForm((prev) => ({ ...prev, text: "" }));
      await fetchAllData();
      showSuccess(`Tujuan Pembelajaran untuk Kelas ${tpForm.kelas} berhasil ditambahkan!`);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    }
  };

  const deleteTpObjective = async (subject: string, tpId: string) => {
    if (!confirm("Hapus Tujuan Pembelajaran (TP) template ini?")) return;
    setError("");

    try {
      const response = await fetch(`/api/tps/${subject}/${tpId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Gagal menghapus tujuan pembelajaran.");

      await fetchAllData();
      showSuccess("Tujuan Pembelajaran berhasil dihapus!");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSettingsLoading(true);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principalName,
          principalNip,
          format: {
            semesterName,
            tahunPelajaran,
            fontSize,
            showLogo,
            showSpiritual,
            showSosial,
            showAttendance,
            showCatatan,
            fontFamily,
            paperSize,
            tanggalRaport,
            principalSignaturePosition,
            signatureCity,
            principalTitle,
            showPrincipalNip,
            showParentSignature,
            watermarkSize,
            watermarkOpacity,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Gagal menyimpan rincian kepala sekolah.",
        );

      showSuccess("Pengaturan format & tanda tangan raport berhasil disimpan!");
      onRefreshTrigger();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setSettingsLoading(false);
    }
  };

  // Backup & Restore Handlers
  const [isRestoring, setIsRestoring] = useState(false);

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Gagal mengunduh berkas cadangan.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smart_raport_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showSuccess("Berkas cadangan data raport (.json) berhasil diunduh!");
    } catch (err: any) {
      setError(err.message || "Gagal mengunduh cadangan.");
    }
  };

  const handleRestoreFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setError("");
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulihkan data.");

      await fetchAllData();
      onRefreshTrigger();
      showSuccess("Alhamdulillah! Data raport berhasil dipulihkan secara penuh dari berkas cadangan!");
    } catch (err: any) {
      setError(err.message || "Format berkas JSON tidak valid atau gagal dipulihkan.");
    } finally {
      setIsRestoring(false);
      e.target.value = "";
    }
  };

  const handleResetToFactory = async () => {
    if (!confirm("Apakah Anda yakin ingin mengembalikan seluruh data ke kondisi awal? Seluruh perubahan terbaru akan dikembalikan ke data default bawaan sistem.")) {
      return;
    }

    setIsRestoring(true);
    setError("");
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mereset data.");

      await fetchAllData();
      onRefreshTrigger();
      showSuccess("Alhamdulillah! Data raport telah berhasil dipulihkan ke kondisi awal.");
    } catch (err: any) {
      setError(err.message || "Gagal mereset data.");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-4" id="admin-panel">
      {/* Messages */}
      {error && (
        <div className="p-2.5 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 flex gap-2 items-start shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-2.5 bg-green-50 border-l-4 border-green-500 text-green-800 rounded text-xs font-bold transition-all animate-fade-in shadow-2xs">
          🎉 {successMsg}
        </div>
      )}

      {/* Admin Tab Headers */}
      <div
        className="flex border-b border-slate-200 gap-1 overflow-x-auto"
        id="admin-nav-tabs"
      >
        <button
          onClick={() => setActiveTab("teachers")}
          className={`py-1.5 px-3.5 text-xs font-bold tracking-wider uppercase border-b-2 transition flex items-center gap-1.5 cursor-pointer ${activeTab === "teachers" ? "border-emerald-850 text-emerald-850 bg-emerald-50/40" : "border-transparent text-slate-500 hover:text-slate-805"}`}
        >
          <Users className="w-3.5 h-3.5" /> Manajemen Guru
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`py-1.5 px-3.5 text-xs font-bold tracking-wider uppercase border-b-2 transition flex items-center gap-1.5 cursor-pointer ${activeTab === "students" ? "border-emerald-850 text-emerald-850 bg-emerald-50/40" : "border-transparent text-slate-500 hover:text-slate-805"}`}
        >
          <GraduationCap className="w-3.5 h-3.5" /> Manajemen Siswa
        </button>
        <button
          onClick={() => setActiveTab("tps")}
          className={`py-1.5 px-3.5 text-xs font-bold tracking-wider uppercase border-b-2 transition flex items-center gap-1.5 cursor-pointer ${activeTab === "tps" ? "border-emerald-850 text-emerald-850 bg-emerald-50/40" : "border-transparent text-slate-500 hover:text-slate-805"}`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Template TP (Mata Pelajaran)
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`py-1.5 px-3.5 text-xs font-bold tracking-wider uppercase border-b-2 transition flex items-center gap-1.5 cursor-pointer ${activeTab === "settings" ? "border-emerald-850 text-emerald-850 bg-emerald-50/40" : "border-transparent text-slate-500 hover:text-slate-805"}`}
        >
          <UserCheck className="w-3.5 h-3.5" /> Pengaturan Raport
        </button>
        <button
          onClick={() => setActiveTab("ekskul")}
          className={`py-1.5 px-3.5 text-xs font-bold tracking-wider uppercase border-b-2 transition flex items-center gap-1.5 cursor-pointer ${activeTab === "ekskul" ? "border-emerald-850 text-emerald-850 bg-emerald-50/40" : "border-transparent text-slate-500 hover:text-slate-805"}`}
        >
          <Award className="w-3.5 h-3.5" /> Manajemen Ekskul
        </button>
        <button
          onClick={() => setActiveTab("halaqoh")}
          className={`py-1.5 px-3.5 text-xs font-bold tracking-wider uppercase border-b-2 transition flex items-center gap-1.5 cursor-pointer ${activeTab === "halaqoh" ? "border-emerald-850 text-emerald-850 bg-emerald-50/40" : "border-transparent text-slate-500 hover:text-slate-805"}`}
        >
          <Users className="w-3.5 h-3.5 text-teal-600" /> Manajemen Halaqoh & Keislaman
        </button>
        <button
          onClick={() => setActiveTab("backup")}
          className={`py-1.5 px-3.5 text-xs font-bold tracking-wider uppercase border-b-2 transition flex items-center gap-1.5 cursor-pointer ${activeTab === "backup" ? "border-blue-600 text-blue-600 bg-blue-50/40 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-805"}`}
        >
          <Database className="w-3.5 h-3.5 text-blue-500" /> Cadangkan & Pulihkan Data
        </button>
      </div>

      {/* TEACHERS TAB */}
      {activeTab === "teachers" && (
        <div
          className="bg-white rounded-lg border border-slate-205 shadow-sm p-4 space-y-4"
          id="teacher-management-panel"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Daftar Guru & Hak Akses
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold font-mono">
                  {teachers.length} Guru
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Kelola akun guru mata pelajaran, hak wali kelas, dan sandi sistem keamanan masuk
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingTeacher(null);
                  setTeacherModalError("");
                  setTeacherForm({
                    name: "",
                    username: "",
                    password: "123",
                    subject: SUBJECT_LIST[0] || "PAI",
                    isWaliKelas: false,
                    kelas: "",
                  });
                  setIsTeacherModalOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Guru Baru
              </button>
            </div>
          </div>

          {/* Bulk Action Bar for Teachers */}
          {selectedTeacherIds.length > 0 && (
            <div className="p-3 bg-red-950/30 border border-red-500/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shadow-sm">
              <div className="flex items-center gap-2 text-xs text-white">
                <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-[11px] border border-red-500/40">
                  {selectedTeacherIds.length}
                </span>
                <span className="font-bold">
                  {selectedTeacherIds.length} Akun Guru Terpilih
                </span>
                <span className="text-slate-400 text-[11px] hidden sm:inline">
                  (dari {teachers.filter(t => t.id !== "t1").length} guru yang dapat dihapus)
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={clearTeacherSelection}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-[#0b1222] hover:bg-[#141f36] border border-[#1e2e4a] rounded-lg font-semibold transition cursor-pointer"
                >
                  Batal Pilih
                </button>
                <button
                  onClick={promptDeleteBulkTeachers}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md hover:shadow-lg transition cursor-pointer border border-red-400/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus {selectedTeacherIds.length} Guru Terpilih</span>
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm border-collapse text-gray-700">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        teachers.filter((t) => t.id !== "t1").length > 0 &&
                        teachers
                          .filter((t) => t.id !== "t1")
                          .every((t) => selectedTeacherIds.includes(t.id))
                      }
                      onChange={toggleSelectAllTeachers}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      title="Pilih Semua Guru"
                    />
                  </th>
                  <th className="p-3 font-semibold text-gray-500 uppercase tracking-wider">
                    Nama Guru
                  </th>
                  <th className="p-3 font-semibold text-gray-500 uppercase tracking-wider">
                    Login Username
                  </th>
                  <th className="p-3 font-semibold text-gray-500 uppercase tracking-wider">
                    Keamanan Sandi
                  </th>
                  <th className="p-3 font-semibold text-gray-500 uppercase tracking-wider">
                    Mata Pelajaran (Mapel)
                  </th>
                  <th className="p-3 font-semibold text-gray-500 uppercase tracking-wider">
                    Tugas Wali / Pembina Ekskul
                  </th>
                  <th className="p-3 font-semibold text-gray-500 uppercase tracking-wider text-right">
                    Tindakan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teachers.map((t) => {
                  const isSelected = selectedTeacherIds.includes(t.id);
                  const isSuperAdmin = t.id === "t1" || t.username === "admin";

                  return (
                    <tr
                      key={t.id}
                      className={`transition ${
                        isSelected
                          ? "bg-[#132742] border-l-4 border-l-emerald-500"
                          : "hover:bg-gray-50/30"
                      }`}
                    >
                      <td className="p-3 text-center">
                        {isSuperAdmin ? (
                          <span
                            className="text-[9px] font-mono text-slate-500 bg-slate-800/80 px-1 py-0.5 rounded border border-slate-700"
                            title="Akun Super Admin utama terlindungi"
                          >
                            🔒
                          </span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectTeacher(t.id)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        )}
                      </td>
                      <td className="p-3 font-bold text-gray-850 flex items-center gap-2">
                        <span>{t.name}</span>
                        {isSuperAdmin && (
                          <span className="text-[9px] bg-red-500/20 text-red-300 border border-red-500/40 px-1.5 py-0.2 rounded font-bold uppercase">
                            Admin Utama
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-emerald-800">
                        {t.username}
                      </td>
                      <td className="p-3 font-mono text-gray-400 font-bold">
                        &#8226;&#8226;&#8226;&#8226;&#8226;&#8226;
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${t.subject === "Admin" ? "bg-red-150 text-red-800" : "bg-emerald-100 text-emerald-900"}`}
                        >
                          {t.subject}
                        </span>
                      </td>
                      <td className="p-3 text-xs">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {t.isWaliKelas && (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 py-0.5 px-2 rounded-full font-semibold text-[10px]">
                              Wali Kelas {t.kelas}
                            </span>
                          )}
                          {t.isPembinaEkskul && (
                            <span className="text-purple-700 bg-purple-50 border border-purple-200 py-0.5 px-2 rounded-full font-semibold text-[10px] flex items-center gap-1">
                              <Award className="w-3 h-3 text-purple-600" />
                              <span>Pembina {t.pembinaEkskulName || "Ekskul"}</span>
                            </span>
                          )}
                          {!t.isWaliKelas && !t.isPembinaEkskul && (
                            <span className="text-gray-400 italic text-[11px]">Guru Mapel</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {isSuperAdmin ? (
                          <span className="text-2xs text-gray-400 italic bg-gray-50 p-1 rounded">
                            Utama
                          </span>
                        ) : (
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => startEditTeacher(t)}
                              className="p-1 text-sky-650 hover:bg-sky-50 rounded transition cursor-pointer"
                              title="Edit Guru"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteTeacher(t.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                              title="Hapus Guru"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STUDENTS TAB */}
      {activeTab === "students" && (
        <div
          className="bg-white rounded-lg border border-slate-200 shadow-sm p-4"
          id="student-management-panel"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Daftar & Manajemen Siswa SMP
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold font-mono">
                  {students.length} Total Siswa
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Kelola data siswa, NISN, dan pembagian kelas siswa secara individual atau massal
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={openBatchEditModal}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition border border-blue-400/40"
                title="Edit massal nama, NISN, atau kelas banyak siswa sekaligus tanpa menghapus data nilai"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Banyak Siswa (Massal)
              </button>
              <button
                onClick={() => {
                  setBatchResult(null);
                  setIsBatchStudentModalOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition"
              >
                <FileSpreadsheet className="w-4 h-4" /> Input Banyak Siswa Sekaligus
              </button>
              <button
                onClick={() => {
                  setEditingStudent(null);
                  setStudentForm({
                    name: "",
                    nisn: "",
                    kelas: "7",
                  });
                  setIsStudentModalOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 active:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Satu Siswa
              </button>
            </div>

          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
            {/* Total Siswa Card */}
            <div
              onClick={() => setStudentClassFilter("all")}
              className={`p-2.5 rounded-lg border transition cursor-pointer ${
                studentClassFilter === "all"
                  ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200"
                  : "bg-slate-50 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-emerald-900 text-xs font-black block">
                    Semua Siswa
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                    Total Terdaftar
                  </span>
                </div>
                <span className="text-base font-black text-emerald-800 font-mono">
                  {students.length}
                </span>
              </div>
            </div>

            {/* Quick Filter Info Cards for Classes 7, 8, 9 */}
            {["7", "8", "9"].map((cls) => {
              const count = students.filter(
                (s) => String(s.kelas || "").trim() === cls
              ).length;
              const isSelected = studentClassFilter === cls;
              return (
                <div
                  key={cls}
                  onClick={() => setStudentClassFilter(isSelected ? "all" : cls)}
                  className={`p-2.5 rounded-lg border transition cursor-pointer ${
                    isSelected
                      ? "bg-blue-50 border-blue-400 ring-2 ring-blue-200"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-blue-900 text-xs font-black block">
                        Kelas {cls}
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                        Siswa Terdaftar
                      </span>
                    </div>
                    <span className="text-base font-black text-slate-800 font-mono">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 mb-3">
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
              {[
                { id: "all", label: `Semua (${students.length})` },
                { id: "7", label: `Kelas 7 (${students.filter(s => String(s.kelas).trim() === "7").length})` },
                { id: "8", label: `Kelas 8 (${students.filter(s => String(s.kelas).trim() === "8").length})` },
                { id: "9", label: `Kelas 9 (${students.filter(s => String(s.kelas).trim() === "9").length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStudentClassFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer shrink-0 ${
                    studentClassFilter === tab.id
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Cari nama atau NISN..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
              {studentSearch && (
                <button
                  onClick={() => setStudentSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Bulk Action Toolbar for Students */}
          {selectedStudentIds.length > 0 && (
            <div className="p-3 bg-red-950/30 border border-red-500/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 mb-3 animate-fade-in shadow-sm">
              <div className="flex items-center gap-2 text-xs text-white">
                <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-[11px] border border-red-500/40">
                  {selectedStudentIds.length}
                </span>
                <span className="font-bold">
                  {selectedStudentIds.length} Siswa Terpilih
                </span>
                <span className="text-slate-400 text-[11px] hidden sm:inline">
                  (dari {filteredStudents.length} siswa tampil • Total {students.length})
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={toggleSelectAllStudents}
                  className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-[#0b1222] hover:bg-[#141f36] border border-[#1e2e4a] rounded-lg font-semibold transition cursor-pointer"
                >
                  {filteredStudents.every((s) => selectedStudentIds.includes(s.id))
                    ? "Batal Pilih Tampil"
                    : `Pilih Semua Tampil (${filteredStudents.length})`}
                </button>
                <button
                  onClick={clearStudentSelection}
                  className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-[#0b1222] hover:bg-[#141f36] border border-[#1e2e4a] rounded-lg font-semibold transition cursor-pointer"
                >
                  Bersihkan
                </button>
                <button
                  onClick={promptDeleteBulkStudents}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md hover:shadow-lg transition cursor-pointer border border-red-400/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus {selectedStudentIds.length} Siswa Terpilih</span>
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm border-collapse text-gray-700">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredStudents.length > 0 &&
                        filteredStudents.every((s) => selectedStudentIds.includes(s.id))
                      }
                      onChange={toggleSelectAllStudents}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      title="Pilih Semua Siswa yang Tampil"
                    />
                  </th>
                  <th className="p-3 font-semibold text-gray-500 uppercase tracking-wider w-12 text-center">
                    No
                  </th>
                  <th className="p-3 font-semibold text-gray-500 uppercase tracking-wider">
                    Nama Siswa
                  </th>
                  <th className="p-3 font-semibold text-gray-500 uppercase tracking-wider">
                    NISN Siswa
                  </th>
                  <th className="p-3 font-semibold text-gray-500 uppercase tracking-wider">
                    Kelas
                  </th>
                  <th className="p-3 font-semibold text-gray-500 uppercase tracking-wider text-right">
                    Tindakan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-400 text-xs">
                      Tidak ada data siswa yang cocok dengan filter atau pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    return (
                      <tr
                        key={s.id}
                        className={`transition ${
                          isSelected
                            ? "bg-[#132742] border-l-4 border-l-emerald-500"
                            : "hover:bg-gray-50/50"
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectStudent(s.id)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-center text-gray-400 font-mono text-xs">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-bold text-gray-800">{s.name}</td>
                        <td className="p-3 font-mono text-gray-500">{s.nisn}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-850 border border-emerald-200 rounded text-xs font-bold font-mono">
                            Kelas {s.kelas}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => startEditStudent(s)}
                              className="p-1 text-sky-650 hover:bg-sky-50 rounded transition cursor-pointer"
                              title="Edit Siswa"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteStudent(s.id)}
                              className="p-1 text-red-650 hover:bg-red-50 rounded transition cursor-pointer"
                              title="Hapus Siswa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TPS (MATA PELAJARAN / LEARNING OBJECTIVES TEMPLATES) TAB */}
      {activeTab === "tps" && (
        <div
          className="bg-[#0f172a] rounded-xl border border-[#1e2e4a] shadow-sm p-6 space-y-6 animate-fade-in"
          id="tp-templates-panel"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1e2e4a] pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Template Capaian / Tujuan Pembelajaran (TP)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Berdasarkan Kelas
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Setiap tingkat rombel (Kelas 7, 8, dan 9) memiliki Capaian Pembelajaran dan TP spesifik sesuai Kurikulum Merdeka.
              </p>
            </div>

            {/* Filter by class buttons */}
            <div className="flex items-center gap-1.5 bg-[#0b1222] border border-[#1e2e4a] p-1 rounded-lg">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider px-2">
                Filter:
              </span>
              {[
                { id: "all", label: "Semua Tingkat" },
                { id: "7", label: "Kelas 7" },
                { id: "8", label: "Kelas 8" },
                { id: "9", label: "Kelas 9" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setTpFilterClass(tab.id as any);
                    if (tab.id !== "all") {
                      setTpForm((prev) => ({ ...prev, kelas: tab.id }));
                    }
                  }}
                  className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    tpFilterClass === tab.id
                      ? "bg-emerald-700 text-white shadow-xs border border-emerald-500/40"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form to add new TP with class selector */}
          <form
            onSubmit={addTpObjective}
            className="p-4 bg-[#142036] border border-[#253e66] rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end shadow-3xs"
          >
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5">
                Mata Pelajaran
              </label>
              <select
                value={tpForm.subject}
                onChange={(e) =>
                  setTpForm((prev) => ({ ...prev, subject: e.target.value }))
                }
                className="w-full p-2 bg-[#0b1222] border border-[#293e66] rounded-lg text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              >
                {SUBJECT_LIST.map((sub, i) => (
                  <option key={i} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5">
                Tingkat Kelas
              </label>
              <select
                value={tpForm.kelas}
                onChange={(e) =>
                  setTpForm((prev) => ({ ...prev, kelas: e.target.value }))
                }
                className="w-full p-2 bg-[#0b1222] border border-[#293e66] rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-500 font-bold text-white transition"
              >
                <option value="7">Kelas 7</option>
                <option value="8">Kelas 8</option>
                <option value="9">Kelas 9</option>
                <option value="all">Semua Kelas</option>
              </select>
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5">
                Deskripsi Ringkas Tujuan Pembelajaran (TP)
              </label>
              <input
                type="text"
                value={tpForm.text}
                onChange={(e) =>
                  setTpForm((prev) => ({ ...prev, text: e.target.value }))
                }
                placeholder="Contoh: Mengidentifikasi rumus kuadratik dan diagram koordinat..."
                className="w-full p-2 bg-[#0b1222] border border-[#293e66] rounded-lg text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-1 transition cursor-pointer border border-emerald-500/40"
              >
                <Plus className="w-4 h-4" /> Simpan TP
              </button>
            </div>
          </form>

          {/* Group display of subject templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {SUBJECT_LIST.map((subject) => {
              const allItems = tpsTemplates[subject] || [];
              const items =
                tpFilterClass === "all"
                  ? allItems
                  : allItems.filter(
                      (item: any) =>
                        String(item.kelas || "").trim() === tpFilterClass
                    );

              return (
                <div
                  key={subject}
                  className="bg-[#0f172a] rounded-xl border border-[#1e2e4a] p-4 shadow-3xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-[#1e2e4a] pb-2.5 mb-3">
                      <span className="px-3 py-1 bg-emerald-700 text-white rounded text-2xs uppercase tracking-wider font-bold shadow-2xs">
                        {subject}
                      </span>
                      <span className="text-[11px] font-mono text-slate-300 font-bold bg-[#142036] px-2 py-0.5 rounded border border-[#253e66]">
                        {items.length} TP {tpFilterClass !== "all" ? `(Kelas ${tpFilterClass})` : "Total"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {items.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4 text-center bg-[#0b1222] rounded-lg border border-dashed border-[#1e2e4a]">
                          Belum ada tujuan pembelajaran {tpFilterClass !== "all" ? `untuk Kelas ${tpFilterClass}` : ""} pada mapel ini.
                        </p>
                      ) : (
                        items.map((item) => {
                          const itemClass = String(item.kelas || "7").trim();
                          const badgeColor =
                            itemClass === "7"
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                              : itemClass === "8"
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                              : itemClass === "9"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/40";

                          return (
                            <div
                              key={item.id}
                              className="p-3 bg-[#142036] rounded-lg border border-[#203254] flex items-start justify-between gap-3 text-xs hover:bg-[#182844] hover:border-emerald-500/50 transition"
                            >
                              <div className="flex-1 space-y-1.5">
                                <p className="text-white leading-relaxed text-justify font-medium">
                                  {item.text}
                                </p>
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border ${badgeColor}`}
                                >
                                  {itemClass === "all" ? "Semua Kelas" : `Kelas ${itemClass}`}
                                </span>
                              </div>
                              <button
                                onClick={() => deleteTpObjective(subject, item.id)}
                                className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/20 transition cursor-pointer shrink-0 mt-0.5"
                                title="Hapus TP"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SETTINGS (PENGATURAN RAPORT) TAB */}
      {activeTab === "settings" && (
        <div
          className="bg-white rounded-xl border border-gray-150 shadow-sm p-6 max-w-3xl animate-fade-in"
          id="school-settings-panel"
        >
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-emerald-700" />
              <span>Pengaturan Format & Tata Letak Raport</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                Akses Admin
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-1">
              Sesuaikan identitas, format penandatanganan kepala sekolah, posisi tanda tangan, font, ukuran, serta komponen yang ditampilkan pada cetak raport siswa.
            </p>
          </div>

          <form onSubmit={handleSettingsSubmit} className="space-y-6">
            {/* Bagian 1: Identitas Penandatangan */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  1. Identitas Kepala Sekolah & Pengesahan
                </span>
                <span className="text-[10px] text-slate-400 font-normal lowercase">Wajib diisi untuk keabsahan raport</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Nama Kepala Sekolah & Gelar
                  </label>
                  <input
                    type="text"
                    required
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    placeholder="Contoh: Ustadz H. Ir. Abdul Muhyi, M.Pd"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    NIP Kepala Sekolah
                  </label>
                  <input
                    type="text"
                    required
                    value={principalNip}
                    onChange={(e) => setPrincipalNip(e.target.value)}
                    placeholder="Contoh: 19780512 200501 1 002"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Sebutan Jabatan / Titimangsa
                  </label>
                  <input
                    type="text"
                    required
                    value={principalTitle}
                    onChange={(e) => setPrincipalTitle(e.target.value)}
                    placeholder="Contoh: Kepala Sekolah / Plt. Kepala Sekolah"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Teks di atas tanda tangan kepala sekolah (default: "Kepala Sekolah")</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Kota / Domisili Penerbitan Raport
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={signatureCity}
                      onChange={(e) => setSignatureCity(e.target.value)}
                      placeholder="Contoh: Pangkal Pinang"
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Digunakan untuk format tanggal: <em>{signatureCity}, {tanggalRaport}</em></p>
                </div>
              </div>
            </div>

            {/* Bagian 2: Posisi & Tata Letak Tanda Tangan */}
            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-emerald-200/60 pb-2">
                <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <LayoutTemplate className="w-3.5 h-3.5 text-emerald-700" />
                  2. Pengaturan Posisi Tanda Tangan Kepala Sekolah
                </h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                  Format Tata Letak
                </span>
              </div>
              
              <p className="text-xs text-slate-600 leading-relaxed">
                Pilih susunan tata letak penandatanganan raport di lembar akhir. Penataan ini akan otomatis diselaraskan pada pratinjau, unduhan PDF, cetak langsung, serta ekspor dokumen Word.
              </p>

              {/* Position Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. Bottom Center (Standar) */}
                <div
                  onClick={() => setPrincipalSignaturePosition("bottom_center")}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                    principalSignaturePosition === "bottom_center"
                      ? "border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white/70 hover:border-emerald-300 hover:bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800">Tengah Bawah (Standar)</span>
                      {principalSignaturePosition === "bottom_center" && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    {/* Mini Diagram */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 mb-2 space-y-1 text-[9px] font-medium text-slate-500 text-center">
                      <div className="flex justify-between gap-1">
                        <div className="w-1/2 bg-slate-200/70 py-0.5 rounded text-[8px]">Orang Tua</div>
                        <div className="w-1/2 bg-blue-100 text-blue-800 py-0.5 rounded text-[8px]">Wali Kelas</div>
                      </div>
                      <div className="w-3/4 mx-auto bg-emerald-100 text-emerald-800 font-bold py-1 rounded text-[8px] mt-1 shadow-xs">
                        Kepala Sekolah
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Orang Tua di kiri, Wali Kelas di kanan, dan Kepala Sekolah di tengah bawah. Standar resmi rapor sekolah.
                    </p>
                  </div>
                  <div className="mt-2 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded w-fit">
                    Rekomendasi Resmi
                  </div>
                </div>

                {/* 2. Inline Three Columns (Sejajar 3 Kolom) */}
                <div
                  onClick={() => setPrincipalSignaturePosition("inline_three_columns")}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                    principalSignaturePosition === "inline_three_columns"
                      ? "border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white/70 hover:border-emerald-300 hover:bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800">Sejajar 3 Kolom</span>
                      {principalSignaturePosition === "inline_three_columns" && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    {/* Mini Diagram */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 mb-2 text-[9px] font-medium text-slate-500 text-center">
                      <div className="flex justify-between gap-1">
                        <div className="w-1/3 bg-slate-200/70 py-1.5 rounded text-[7.5px] truncate">Orang Tua</div>
                        <div className="w-1/3 bg-emerald-100 text-emerald-800 font-bold py-1.5 rounded text-[7.5px] truncate">Kepala Sek.</div>
                        <div className="w-1/3 bg-blue-100 text-blue-800 py-1.5 rounded text-[7.5px] truncate">Wali Kelas</div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Ketiga tanda tangan diletakkan sejajar 1 baris. Sangat ringkas dan menghemat ruang vertikal halaman.
                    </p>
                  </div>
                  <div className="mt-2 text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                    Hemat Halaman
                  </div>
                </div>

                {/* 3. Bottom Left (Kiri Bawah) */}
                <div
                  onClick={() => setPrincipalSignaturePosition("bottom_left")}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                    principalSignaturePosition === "bottom_left"
                      ? "border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white/70 hover:border-emerald-300 hover:bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800">Kiri Bawah</span>
                      {principalSignaturePosition === "bottom_left" && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    {/* Mini Diagram */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 mb-2 space-y-1 text-[9px] font-medium text-slate-500 text-center">
                      <div className="flex justify-between gap-1">
                        <div className="w-1/2 bg-slate-200/70 py-0.5 rounded text-[8px]">Orang Tua</div>
                        <div className="w-1/2 bg-blue-100 text-blue-800 py-0.5 rounded text-[8px]">Wali Kelas</div>
                      </div>
                      <div className="flex justify-start">
                        <div className="w-1/2 bg-emerald-100 text-emerald-800 font-bold py-1 rounded text-[8px]">
                          Kepala Sekolah
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Orang Tua & Wali Kelas di atas, tanda tangan Kepala Sekolah di sudut kiri bawah (mengetahui).
                    </p>
                  </div>
                </div>

                {/* 4. Bottom Right (Kanan Bawah) */}
                <div
                  onClick={() => setPrincipalSignaturePosition("bottom_right")}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                    principalSignaturePosition === "bottom_right"
                      ? "border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white/70 hover:border-emerald-300 hover:bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800">Kanan Bawah</span>
                      {principalSignaturePosition === "bottom_right" && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    {/* Mini Diagram */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 mb-2 space-y-1 text-[9px] font-medium text-slate-500 text-center">
                      <div className="flex justify-between gap-1">
                        <div className="w-1/2 bg-slate-200/70 py-0.5 rounded text-[8px]">Orang Tua</div>
                        <div className="w-1/2 bg-blue-100 text-blue-800 py-0.5 rounded text-[8px]">Wali Kelas</div>
                      </div>
                      <div className="flex justify-end">
                        <div className="w-1/2 bg-emerald-100 text-emerald-800 font-bold py-1 rounded text-[8px]">
                          Kepala Sekolah
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Orang Tua & Wali Kelas di atas, tanda tangan Kepala Sekolah di sudut kanan bawah disertai tanggal.
                    </p>
                  </div>
                </div>

                {/* 5. Top Left (Kiri Atas Sejajar Wali Kelas) */}
                <div
                  onClick={() => setPrincipalSignaturePosition("top_left")}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                    principalSignaturePosition === "top_left"
                      ? "border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white/70 hover:border-emerald-300 hover:bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800">Kiri Atas (Sejajar Wali)</span>
                      {principalSignaturePosition === "top_left" && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    {/* Mini Diagram */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 mb-2 space-y-1 text-[9px] font-medium text-slate-500 text-center">
                      <div className="flex justify-between gap-1">
                        <div className="w-1/2 bg-emerald-100 text-emerald-800 font-bold py-0.5 rounded text-[8px]">Kepala Sekolah</div>
                        <div className="w-1/2 bg-blue-100 text-blue-800 py-0.5 rounded text-[8px]">Wali Kelas</div>
                      </div>
                      <div className="w-3/4 mx-auto bg-slate-200/70 py-1 rounded text-[8px] mt-1">
                        Orang Tua/Wali
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Kepala Sekolah di kiri atas sejajar dengan Wali Kelas di kanan atas, Orang Tua di tengah bawah.
                    </p>
                  </div>
                </div>
              </div>

              {/* Toggles for Signatures */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={showPrincipalNip}
                    onChange={(e) => setShowPrincipalNip(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-550 w-4 h-4"
                  />
                  <span>Tampilkan Nomor Induk Pegawai (NIP)</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={showParentSignature}
                    onChange={(e) => setShowParentSignature(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-550 w-4 h-4"
                  />
                  <span>Tampilkan Kolom Tanda Tangan Orang Tua/Wali</span>
                </label>
              </div>

              {/* Live Interactive Signature Preview Box */}
              <div className="mt-4 p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Simulasi Pratinjau Tanda Tangan Raport
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Font: {fontFamily}
                  </span>
                </div>

                <div 
                  className="bg-slate-50/70 p-4 rounded-lg border border-dashed border-slate-200 text-black text-center text-xs space-y-4"
                  style={{ fontFamily: fontFamily === 'Arial' ? 'Arial, sans-serif' : fontFamily === 'Georgia' ? 'Georgia, serif' : fontFamily === 'Courier New' ? 'Courier New, monospace' : '"Times New Roman", Times, serif' }}
                >
                  {/* Rendering the active layout in the live preview */}
                  {principalSignaturePosition === "bottom_center" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          {showParentSignature ? (
                            <>
                              <p className="mb-10 text-slate-700">&nbsp;<br />Orang Tua/Wali Siswa</p>
                              <p className="font-bold border-b border-dotted border-slate-400 inline-block px-4">……………………………</p>
                            </>
                          ) : null}
                        </div>
                        <div>
                          <p className="mb-10 text-slate-700">{signatureCity}, {tanggalRaport}<br />Wali Kelas Kelas 7</p>
                          <p className="font-bold border-b border-dotted border-slate-400 inline-block px-4">Ustadzah Nama Wali Kelas</p>
                        </div>
                      </div>
                      <div className="pt-2 text-center">
                        <p className="mb-10 text-slate-800 font-medium">Mengetahui,<br />{principalTitle}</p>
                        <p className="font-bold">{principalName}</p>
                        {showPrincipalNip && (
                          <p className="text-[10px] text-slate-500 font-mono">NIP. {principalNip}</p>
                        )}
                      </div>
                    </>
                  )}

                  {principalSignaturePosition === "inline_three_columns" && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        {showParentSignature ? (
                          <>
                            <p className="mb-10 text-slate-700 text-[11px]">&nbsp;<br />Orang Tua/Wali</p>
                            <p className="font-bold text-[11px] border-b border-dotted border-slate-400 inline-block px-2">………………………</p>
                          </>
                        ) : null}
                      </div>
                      <div>
                        <p className="mb-10 text-slate-800 font-medium text-[11px]">Mengetahui,<br />{principalTitle}</p>
                        <p className="font-bold text-[11px]">{principalName}</p>
                        {showPrincipalNip && (
                          <p className="text-[9px] text-slate-500 font-mono">NIP. {principalNip}</p>
                        )}
                      </div>
                      <div>
                        <p className="mb-10 text-slate-700 text-[11px]">{signatureCity}, {tanggalRaport}<br />Wali Kelas</p>
                        <p className="font-bold text-[11px] border-b border-dotted border-slate-400 inline-block px-2">Nama Wali Kelas</p>
                      </div>
                    </div>
                  )}

                  {principalSignaturePosition === "bottom_left" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          {showParentSignature ? (
                            <>
                              <p className="mb-10 text-slate-700">&nbsp;<br />Orang Tua/Wali Siswa</p>
                              <p className="font-bold border-b border-dotted border-slate-400 inline-block px-4">……………………………</p>
                            </>
                          ) : null}
                        </div>
                        <div>
                          <p className="mb-10 text-slate-700">{signatureCity}, {tanggalRaport}<br />Wali Kelas Kelas 7</p>
                          <p className="font-bold border-b border-dotted border-slate-400 inline-block px-4">Nama Wali Kelas</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="text-center">
                          <p className="mb-10 text-slate-800 font-medium">Mengetahui,<br />{principalTitle}</p>
                          <p className="font-bold">{principalName}</p>
                          {showPrincipalNip && (
                            <p className="text-[10px] text-slate-500 font-mono">NIP. {principalNip}</p>
                          )}
                        </div>
                        <div />
                      </div>
                    </>
                  )}

                  {principalSignaturePosition === "bottom_right" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          {showParentSignature ? (
                            <>
                              <p className="mb-10 text-slate-700">&nbsp;<br />Orang Tua/Wali Siswa</p>
                              <p className="font-bold border-b border-dotted border-slate-400 inline-block px-4">……………………………</p>
                            </>
                          ) : null}
                        </div>
                        <div>
                          <p className="mb-10 text-slate-700">&nbsp;<br />Wali Kelas Kelas 7</p>
                          <p className="font-bold border-b border-dotted border-slate-400 inline-block px-4">Nama Wali Kelas</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div />
                        <div className="text-center">
                          <p className="mb-10 text-slate-800 font-medium">{signatureCity}, {tanggalRaport}<br />Mengetahui,<br />{principalTitle}</p>
                          <p className="font-bold">{principalName}</p>
                          {showPrincipalNip && (
                            <p className="text-[10px] text-slate-500 font-mono">NIP. {principalNip}</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {principalSignaturePosition === "top_left" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="mb-10 text-slate-800 font-medium">Mengetahui,<br />{principalTitle}</p>
                          <p className="font-bold">{principalName}</p>
                          {showPrincipalNip && (
                            <p className="text-[10px] text-slate-500 font-mono">NIP. {principalNip}</p>
                          )}
                        </div>
                        <div>
                          <p className="mb-10 text-slate-700">{signatureCity}, {tanggalRaport}<br />Wali Kelas Kelas 7</p>
                          <p className="font-bold border-b border-dotted border-slate-400 inline-block px-4">Nama Wali Kelas</p>
                        </div>
                      </div>
                      {showParentSignature && (
                        <div className="pt-2 text-center">
                          <p className="mb-10 text-slate-700">&nbsp;<br />Orang Tua/Wali Siswa</p>
                          <p className="font-bold border-b border-dotted border-slate-400 inline-block px-4">……………………………</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bagian 3: Kustomisasi Teks & Sesi */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1">
                3. Informasi Semester, Tahun Pelajaran & Tanggal Rapor
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Nama Semester
                  </label>
                  <input
                    type="text"
                    required
                    value={semesterName}
                    onChange={(e) => setSemesterName(e.target.value)}
                    placeholder="Contoh: Ganjil"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Tahun Pelajaran
                  </label>
                  <input
                    type="text"
                    required
                    value={tahunPelajaran}
                    onChange={(e) => setTahunPelajaran(e.target.value)}
                    placeholder="Contoh: 2026/2027"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Tanggal Pembagian Raport
                  </label>
                  <input
                    type="text"
                    required
                    value={tanggalRaport}
                    onChange={(e) => setTanggalRaport(e.target.value)}
                    placeholder="Contoh: 17 Juni 2026"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 4: Tata Letak & Gaya */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1">
                4. Gaya & Desain Cetak
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Jenis Font Word/Cetak
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                  >
                    <option value="Times New Roman">
                      Times New Roman (Formal)
                    </option>
                    <option value="Arial">Arial (Modern & Bersih)</option>
                    <option value="Georgia">Georgia (Elegan & Klasik)</option>
                    <option value="Courier New">Courier New (Monospace)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Ukuran Font Dasar
                  </label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                  >
                    <option value="10pt">Sangat Kecil (10pt)</option>
                    <option value="11pt">Standar (11pt)</option>
                    <option value="12pt">Besar (12pt)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Ukuran Kertas Raport
                  </label>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                  >
                    <option value="A4">A4 (Standard 21.0 x 29.7 cm)</option>
                    <option value="F4">
                      F4 / Folio (Sekolah 21.5 x 33.0 cm)
                    </option>
                    <option value="Letter">
                      Letter (Standard 21.59 x 27.94 cm)
                    </option>
                    <option value="Legal">
                      Legal (Standard 21.59 x 35.56 cm)
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bagian 5: Visibilitas Komponen */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1">
                5. Visibilitas Elemen Raport
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700">
                <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-550 w-4 h-4"
                  />
                  <span>Tampilkan Logo Kop Sekolah</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={showSpiritual}
                    onChange={(e) => setShowSpiritual(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-550 w-4 h-4"
                  />
                  <span>Tampilkan Aspek Sikap Spiritual</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={showSosial}
                    onChange={(e) => setShowSosial(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-550 w-4 h-4"
                  />
                  <span>Tampilkan Aspek Sikap Sosial</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={showAttendance}
                    onChange={(e) => setShowAttendance(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-550 w-4 h-4"
                  />
                  <span>Tampilkan Presensi Kehadiran</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition text-nowrap">
                  <input
                    type="checkbox"
                    checked={showCatatan}
                    onChange={(e) => setShowCatatan(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-550 w-4 h-4"
                  />
                  <span>Tampilkan Catatan Wali Kelas</span>
                </label>
              </div>
            </div>

            {/* Bagian 6: Pengaturan Watermark */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1">
                6. Pengaturan Watermark
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Ukuran Watermark Raport
                  </label>
                  <select
                    value={watermarkSize}
                    onChange={(e) => setWatermarkSize(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg text-xs focus:outline-none focus:border-emerald-600"
                  >
                    <option value={300}>Kecil (300px)</option>
                    <option value={380}>Sedang (380px)</option>
                    <option value={440}>Standar (440px)</option>
                    <option value={500}>Besar (500px)</option>
                    <option value={580}>Sangat Besar (580px)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Transparansi Watermark
                  </label>
                  <select
                    value={watermarkOpacity}
                    onChange={(e) =>
                      setWatermarkOpacity(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg text-xs focus:outline-none focus:border-emerald-600"
                  >
                    <option value={0.03}>Sangat Tipis (3%)</option>
                    <option value={0.05}>Tipis (5%)</option>
                    <option value={0.075}>Standar (7.5%)</option>
                    <option value={0.1}>Sedang (10%)</option>
                    <option value={0.15}>Tebal (15%)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={settingsLoading}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {settingsLoading ? "Saving..." : "Simpan Format Raport"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EXTRACURRICULAR (EKSKUL) TAB */}
      {activeTab === "ekskul" && (
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in"
          id="ekskul-management-panel"
        >
          {/* Form to add new Ekskul */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit">
            <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-800" />
              <span>Tambah Ekskul Baru</span>
            </h2>
            <p className="text-[10px] text-slate-400 mb-4">
              Tambahkan nama dan tentukan tipe kegiatan ekstrakurikuler baru ke
              dalam daftar sekolah.
            </p>

            <form onSubmit={handleAddEkskul} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Nama Kegiatan
                </label>
                <input
                  type="text"
                  required
                  value={newEkskulName}
                  onChange={(e) => setNewEkskulName(e.target.value)}
                  placeholder="Contoh: Futsal, Voli, Pramuka"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Tipe Ekstrakurikuler
                </label>
                <select
                  value={newEkskulType}
                  onChange={(e) =>
                    setNewEkskulType(e.target.value as "Wajib" | "Pilihan")
                  }
                  className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg text-xs focus:outline-none focus:border-emerald-600"
                >
                  <option value="Wajib">Wajib (Compulsory)</option>
                  <option value="Pilihan">Pilihan (Elective)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Guru Pembina Kegiatan
                </label>
                <select
                  value={newEkskulPembinaTeacherId}
                  onChange={(e) => setNewEkskulPembinaTeacherId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg text-xs focus:outline-none focus:border-emerald-600"
                >
                  <option value="">-- Belum Ditugaskan --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subject})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Guru pembina bertugas menginput nilai aspek Usaha, Proses, dan Capaian siswa.
                </p>
              </div>

              <button
                type="submit"
                disabled={ekskulLoading || !newEkskulName.trim()}
                className="w-full py-2 bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                {ekskulLoading ? "Menyimpan..." : "Tambahkan Ekskul"}
              </button>
            </form>
          </div>

          {/* List of existing Ekskuls */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900">
                Daftar Kegiatan Ekstrakurikuler ({ekskuls.length})
              </h2>
              <p className="text-[10px] text-slate-400">
                Daftar kegiatan ekstrakurikuler beserta Guru Pembina yang berhak menginput nilai rapor.
              </p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-550 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3 text-[10px]">No</th>
                    <th className="py-2.5 px-3 text-[10px]">
                      Nama Ekstrakurikuler
                    </th>
                    <th className="py-2.5 px-3 text-[10px]">Tipe</th>
                    <th className="py-2.5 px-3 text-[10px]">Guru Pembina</th>
                    <th className="py-2.5 px-3 text-[10px] text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ekskuls.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-400 italic"
                      >
                        Belum ada kegiatan ekstrakurikuler. Silakan tambahkan di
                        form sebelah kiri.
                      </td>
                    </tr>
                  ) : (
                    ekskuls.map((e, idx) => (
                      <tr
                        key={e.id}
                        className="hover:bg-slate-50/50 transition"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-405">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {e.name}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${e.type === "Wajib" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-sky-100 text-sky-800 border border-sky-200"}`}
                          >
                            {e.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {e.pembinaName ? (
                            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px] inline-flex items-center gap-1">
                              <Award className="w-3 h-3 text-emerald-600" />
                              {e.pembinaName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Belum Ditugaskan
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex gap-1.5 items-center justify-center">
                            <button
                              onClick={() => startEditEkskul(e)}
                              className="p-1 hover:bg-sky-50 text-sky-600 rounded transition cursor-pointer"
                              title="Edit Ekstrakurikuler / Ganti Pembina"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEkskul(e.id)}
                              className="p-1 hover:bg-red-50 text-red-500 rounded transition cursor-pointer"
                              title="Hapus Ekstrakurikuler"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EDIT EKSKUL MODAL */}
      {isEkskulEditModalOpen && editingEkskul && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="bg-emerald-800 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span>Edit Ekstrakurikuler & Pembina</span>
              </h3>
              <button
                onClick={() => setIsEkskulEditModalOpen(false)}
                className="text-white/85 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateEkskul} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-750 mb-1.5">
                  Nama Kegiatan Ekstrakurikuler
                </label>
                <input
                  type="text"
                  required
                  value={editEkskulForm.name}
                  onChange={(e) =>
                    setEditEkskulForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-250 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-750 mb-1.5">
                  Tipe Ekstrakurikuler
                </label>
                <select
                  value={editEkskulForm.type}
                  onChange={(e) =>
                    setEditEkskulForm((prev) => ({
                      ...prev,
                      type: e.target.value as "Wajib" | "Pilihan",
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600"
                >
                  <option value="Wajib">Wajib (Compulsory)</option>
                  <option value="Pilihan">Pilihan (Elective)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-750 mb-1.5">
                  Tugaskan Guru Pembina
                </label>
                <select
                  value={editEkskulForm.pembinaTeacherId}
                  onChange={(e) =>
                    setEditEkskulForm((prev) => ({
                      ...prev,
                      pembinaTeacherId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 font-semibold"
                >
                  <option value="">-- Belum Ditugaskan --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subject})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  Guru pembina yang dipilih akan memiliki akses penginputan nilai Usaha, Proses, dan Capaian siswa di Rapor.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  disabled={ekskulLoading}
                  onClick={() => setIsEkskulEditModalOpen(false)}
                  className="w-1/2 py-2.5 border border-gray-250 text-gray-650 hover:bg-gray-50 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={ekskulLoading || !editEkskulForm.name.trim()}
                  className="w-1/2 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{ekskulLoading ? "Menyimpan..." : "Simpan Perubahan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEACHER MODAL FORM */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="bg-emerald-800 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wide">
                {editingTeacher ? "Edit Akun Guru" : "Tambah Guru Baru"}
              </h3>
              <button
                onClick={() => setIsTeacherModalOpen(false)}
                className="text-white/85 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTeacherSubmit} className="p-6 space-y-4">
              {teacherModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex gap-2 items-start animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span className="font-semibold">{teacherModalError}</span>
                </div>
              )}

              {/* Petunjuk Guru Multi-Mapel */}
              <div className="bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded-r-lg text-2xs md:text-xs text-emerald-800 leading-relaxed space-y-1">
                <p className="font-bold uppercase tracking-wider text-[10px]">
                  Panduan Guru Multi-Mapel:
                </p>
                <p>
                  Nama lengkap diperbolehkan sama persis. Jika guru mengampu
                  beberapa mata pelajaran sekaligus, silakan buat akun tambahan
                  untuk tiap mapel dengan{" "}
                  <strong>Login Username yang berbeda</strong> (contoh:{" "}
                  <code className="bg-emerald-100/80 px-1 rounded">
                    budi_ipa
                  </code>{" "}
                  dan{" "}
                  <code className="bg-emerald-100/80 px-1 rounded">
                    budi_ips
                  </code>
                  ).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-750 mb-1.5">
                  Nama Lengkap & Gelar
                </label>
                <input
                  type="text"
                  required
                  value={teacherForm.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setTeacherForm((prev) => {
                      const updated = { ...prev, name: newName };
                      // If adding new teacher and username is still empty or default, suggest clean username
                      if (!editingTeacher && (!prev.username || prev.username === "")) {
                        const clean = newName
                          .toLowerCase()
                          .replace(/[^a-z0-9]/g, "")
                          .substring(0, 12);
                        if (clean) updated.username = clean;
                      }
                      return updated;
                    });
                  }}
                  placeholder="Contoh: Dr. H. Slamet, M.Pd"
                  className="w-full px-3 py-2 border border-gray-250 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
                  id="teacher-name-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-750 mb-1.5">
                    Login Username
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherForm.username}
                    onChange={(e) =>
                      setTeacherForm((prev) => ({
                        ...prev,
                        username: e.target.value.toLowerCase().replace(/\s+/g, ""),
                      }))
                    }
                    placeholder="nama_panggil"
                    className="w-full px-3 py-2 border border-gray-250 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white font-mono text-xs"
                    id="teacher-username-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-750 mb-1.5">
                    Masuk/PIN Sandi
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherForm.password}
                    onChange={(e) =>
                      setTeacherForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    placeholder="Sandi Akun"
                    className="w-full px-3 py-2 border border-gray-250 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
                    id="teacher-password-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-750 mb-1.5">
                  Mata Pelajaran yang Diampu
                </label>
                <select
                  value={teacherForm.subject}
                  onChange={(e) =>
                    setTeacherForm((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-250 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
                  id="teacher-subject-select"
                >
                  {SUBJECT_LIST.map((sub, i) => (
                    <option key={i} value={sub}>
                      {sub}
                    </option>
                  ))}
                  <option value="Admin">Hanya Admin</option>
                </select>
              </div>

              <div className="pt-2 border-t border-gray-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs md:text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={teacherForm.isWaliKelas}
                    onChange={(e) =>
                      setTeacherForm((prev) => ({
                        ...prev,
                        isWaliKelas: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded border-gray-300 text-emerald-800 focus:ring-emerald-500"
                  />
                  <span>Tugaskan sebagai Wali Kelas</span>
                </label>

                {teacherForm.isWaliKelas && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-150 animate-fade-in">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Kelas yang Diajar & Asuh
                    </label>
                    <select
                      value={teacherForm.kelas}
                      onChange={(e) =>
                        setTeacherForm((prev) => ({
                          ...prev,
                          kelas: e.target.value,
                        }))
                      }
                      className="w-full p-2 bg-white border border-gray-250 rounded text-xs focus:outline-none focus:border-emerald-600"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      <option value="7">Kelas 7</option>
                      <option value="8">Kelas 8</option>
                      <option value="9">Kelas 9</option>
                    </select>
                  </div>
                )}

                {/* Pembina Ekstrakurikuler Assignment */}
                <label className="flex items-center gap-2 cursor-pointer text-xs md:text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={teacherForm.isPembinaEkskul}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setTeacherForm((prev) => {
                        const defaultEks = ekskuls.length > 0 ? ekskuls[0] : null;
                        return {
                          ...prev,
                          isPembinaEkskul: isChecked,
                          pembinaEkskulId: isChecked ? (prev.pembinaEkskulId || defaultEks?.id || "") : "",
                          pembinaEkskulName: isChecked ? (prev.pembinaEkskulName || defaultEks?.name || "") : "",
                        };
                      });
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-purple-700 focus:ring-purple-500"
                  />
                  <span>Tugaskan sebagai Pembina Ekstrakurikuler</span>
                </label>

                {teacherForm.isPembinaEkskul && (
                  <div className="bg-purple-50/60 p-3 rounded-lg border border-purple-200 animate-fade-in space-y-1.5">
                    <label className="block text-xs font-semibold text-purple-900 mb-1">
                      Pilih Kegiatan Ekstrakurikuler yang Dibina:
                    </label>
                    <select
                      value={teacherForm.pembinaEkskulId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const matchedEks = ekskuls.find((x) => x.id === selectedId);
                        setTeacherForm((prev) => ({
                          ...prev,
                          pembinaEkskulId: selectedId,
                          pembinaEkskulName: matchedEks ? matchedEks.name : "",
                        }));
                      }}
                      className="w-full p-2 bg-white border border-purple-300 rounded text-xs focus:outline-none focus:border-purple-600 font-semibold text-purple-950"
                    >
                      <option value="">-- Pilih Ekstrakurikuler --</option>
                      {ekskuls.map((eks) => (
                        <option key={eks.id} value={eks.id}>
                          {eks.name} ({eks.type})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-purple-700 leading-tight">
                      Guru yang ditugaskan dapat langsung menginput nilai 3 aspek (Usaha, Proses, Capaian) dan deskripsi kegiatan melalui menu Nilai Ekstrakurikuler.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  disabled={isSubmittingTeacher}
                  onClick={() => setIsTeacherModalOpen(false)}
                  className="w-1/2 py-2.5 border border-gray-250 text-gray-650 hover:bg-gray-50 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTeacher}
                  className="w-1/2 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition disabled:opacity-60"
                >
                  {isSubmittingTeacher ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Data</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT MODAL FORM */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="bg-emerald-800 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wide">
                {editingStudent ? "Edit Identitas Siswa" : "Tambah Siswa Baru"}
              </h3>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="text-white/85 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStudentSubmit} className="p-6 space-y-4">
              {studentModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex gap-2 items-start animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span className="font-semibold">{studentModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-750 mb-1.5">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.name}
                  onChange={(e) =>
                    setStudentForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Contoh: Muhammad Al-Farabi"
                  className="w-full px-3 py-2 border border-gray-250 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
                  id="student-name-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-750 mb-1.5">
                  NISN Siswa (Nomor Induk Nasional)
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.nisn}
                  onChange={(e) =>
                    setStudentForm((prev) => ({
                      ...prev,
                      nisn: e.target.value,
                    }))
                  }
                  placeholder="Contoh: 0134988712"
                  className="w-full px-3 py-2 border border-gray-250 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
                  id="student-nisn-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-750 mb-1.5">
                  Kelas / Rombongan Belajar
                </label>
                <select
                  value={studentForm.kelas}
                  onChange={(e) =>
                    setStudentForm((prev) => ({
                      ...prev,
                      kelas: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-250 rounded-lg text-xs md:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
                  id="student-class-select"
                >
                  <option value="7">Kelas 7</option>
                  <option value="8">Kelas 8</option>
                  <option value="9">Kelas 9</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  disabled={isSubmittingStudent}
                  onClick={() => setIsStudentModalOpen(false)}
                  className="w-1/2 py-2.5 border border-gray-250 text-gray-650 hover:bg-gray-50 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStudent}
                  className="w-1/2 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition disabled:opacity-60"
                >
                  {isSubmittingStudent ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Data</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH STUDENT IMPORT MODAL */}
      {isBatchStudentModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up my-6">
            {/* Modal Header */}
            <div className="bg-emerald-850 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-700/60 border border-emerald-500/40 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wide">
                    Input Siswa Secara Massal (Banyak Sekaligus)
                  </h3>
                  <p className="text-[11px] text-emerald-200 font-normal">
                    Salin & tempel baris dari Excel, Google Sheets, atau CSV tanpa perlu input satu per satu
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsBatchStudentModalOpen(false);
                  setBatchResult(null);
                }}
                className="text-white/80 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Batch Result Banner */}
              {batchResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    batchResult.success
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                      : "bg-red-50 border-red-300 text-red-900"
                  }`}
                >
                  {batchResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold">
                      {batchResult.success
                        ? `Alhamdulillah! Berhasil menambahkan ${batchResult.addedCount} siswa baru ke sistem.`
                        : "Gagal menyimpan data siswa massal."}
                    </p>
                    {batchResult.duplicatesCount > 0 && (
                      <p className="text-[11px] text-amber-800 font-medium">
                        Catatan: {batchResult.duplicatesCount} siswa dilewati karena NISN sudah terdaftar.
                      </p>
                    )}
                    {batchResult.errors.length > 0 && (
                      <div className="text-[11px] text-red-700">
                        {batchResult.errors.map((err, i) => (
                          <div key={i}>• {err}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Guide and Controls Toolbar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700">
                      Kelas Default:
                    </label>
                    <select
                      value={batchDefaultClass}
                      onChange={(e) => setBatchDefaultClass(e.target.value)}
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="7">Kelas 7</option>
                      <option value="8">Kelas 8</option>
                      <option value="9">Kelas 9</option>
                    </select>
                    <span className="text-[10px] text-slate-400">
                      (Digunakan bila kolom kelas tidak diisi di teks)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fillSampleBatchData}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-md flex items-center gap-1 cursor-pointer transition shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" /> Isi Contoh Format
                    </button>
                    {batchRawText && (
                      <button
                        type="button"
                        onClick={() => {
                          setBatchRawText("");
                          setBatchResult(null);
                        }}
                        className="px-2.5 py-1 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-[11px] font-bold rounded-md flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" /> Bersihkan
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-0.5">
                    Format yang Didukung (Bisa langsung blok & copy dari Excel / Spreadsheet):
                  </span>
                  <div className="font-mono text-[10px] text-slate-600 space-y-0.5">
                    <div>Format 1: <strong className="text-emerald-700">NISN [Tab/Koma] Nama Lengkap Siswa [Tab/Koma] Kelas</strong></div>
                    <div>Format 2: <strong className="text-emerald-700">NISN [Tab/Koma] Nama Lengkap Siswa</strong> (Kelas otomatis ikut Kelas Default)</div>
                  </div>
                </div>
              </div>

              {/* Textarea Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tempelkan (Paste) Teks Data Siswa Di Bawah Ini:
                </label>
                <textarea
                  value={batchRawText}
                  onChange={(e) => {
                    setBatchRawText(e.target.value);
                    if (batchResult) setBatchResult(null);
                  }}
                  rows={6}
                  placeholder={`Contoh tempel (paste):&#10;0012984101\tAhmad Fauzi Ramadhan\t7&#10;0012984102\tAisyah Putri Azzahra\t7&#10;0012984103\tBilal Al-Ghifari\t8`}
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-600 focus:bg-white resize-y shadow-inner bg-slate-50/50"
                ></textarea>
              </div>

              {/* Parsing Telemetry Summary */}
              {batchRawText.trim() && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[11px]">
                        Total Baris: {parsedBatchStudents.length}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        Siap Disimpan: {parsedBatchStudents.filter((p) => p.status === "valid").length}
                      </span>
                      {parsedBatchStudents.some((p) => p.status !== "valid") && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px]">
                          Bermasalah / Duplikat: {parsedBatchStudents.filter((p) => p.status !== "valid").length}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Pratinjau Data Sebelum Disimpan
                    </span>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2 font-bold text-slate-600 w-10 text-center">No</th>
                          <th className="p-2 font-bold text-slate-600">NISN</th>
                          <th className="p-2 font-bold text-slate-600">Nama Siswa</th>
                          <th className="p-2 font-bold text-slate-600">Kelas</th>
                          <th className="p-2 font-bold text-slate-600 text-right">Status Validasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {parsedBatchStudents.map((item, idx) => (
                          <tr
                            key={idx}
                            className={
                              item.status === "valid"
                                ? "bg-emerald-50/30 hover:bg-emerald-50/60"
                                : "bg-red-50/30 hover:bg-red-50/60"
                            }
                          >
                            <td className="p-2 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="p-2 font-mono font-bold text-slate-700">
                              {item.nisn || "-"}
                            </td>
                            <td className="p-2 font-semibold text-slate-800 truncate max-w-[200px]">
                              {item.name}
                            </td>
                            <td className="p-2 font-mono">
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                                Kelas {item.kelas}
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              {item.status === "valid" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Siap Disimpan
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                  <AlertCircle className="w-3 h-3 text-amber-600" /> {item.message}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSubmittingBatch}
                  onClick={() => {
                    setIsBatchStudentModalOpen(false);
                    setBatchResult(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={
                    isSubmittingBatch ||
                    parsedBatchStudents.filter((p) => p.status === "valid").length === 0
                  }
                  onClick={handleBatchStudentSubmit}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-2 transition disabled:opacity-40 shadow-sm"
                >
                  {isSubmittingBatch ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>
                        Simpan Semua Siswa Valid (
                        {parsedBatchStudents.filter((p) => p.status === "valid").length} Siswa)
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BATCH STUDENT EDIT MODAL (EDIT MASSAL SISWA) */}
      {isBatchEditModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up my-6 border border-slate-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-blue-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-inner">
                  <Edit className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wide text-white flex items-center gap-2">
                    <span>Edit Data Siswa Secara Massal</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-mono border border-blue-400/30">
                      Preserve ID & History Nilai
                    </span>
                  </h3>
                  <p className="text-[11px] text-blue-200/90 font-normal">
                    Perbarui nama, NISN, atau kelas banyak siswa sekaligus tanpa menghapus data nilai raport maupun catatan wali kelas
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsBatchEditModalOpen(false);
                  setBatchEditResult(null);
                }}
                className="text-white/80 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Navigation Tabs: Paste vs Table Grid */}
            <div className="bg-slate-100 px-6 pt-3 flex items-center gap-2 border-b border-slate-200">
              <button
                onClick={() => setBatchEditActiveTab("paste")}
                className={`py-2 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer border-t border-x ${
                  batchEditActiveTab === "paste"
                    ? "bg-white text-blue-700 border-slate-200 border-b-white -mb-px shadow-2xs"
                    : "bg-slate-200/70 text-slate-600 border-transparent hover:bg-slate-200"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>Salin & Tempel (Excel / Text)</span>
              </button>
              <button
                onClick={() => setBatchEditActiveTab("table")}
                className={`py-2 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer border-t border-x ${
                  batchEditActiveTab === "table"
                    ? "bg-white text-blue-700 border-slate-200 border-b-white -mb-px shadow-2xs"
                    : "bg-slate-200/70 text-slate-600 border-transparent hover:bg-slate-200"
                }`}
              >
                <PenTool className="w-4 h-4 text-blue-600" />
                <span>Tabel Interaktif (Edit Langsung di Grid)</span>
                {gridEditStudents.filter((s) => s.isDirty).length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono text-[10px] font-extrabold">
                    {gridEditStudents.filter((s) => s.isDirty).length}
                  </span>
                )}
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto bg-slate-50/40">
              {/* Batch Edit Result Banner */}
              {batchEditResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in ${
                    batchEditResult.success
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                      : "bg-red-50 border-red-300 text-red-900"
                  }`}
                >
                  {batchEditResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold text-sm">
                      {batchEditResult.success
                        ? `Alhamdulillah! Berhasil memperbarui ${batchEditResult.updatedCount} siswa secara massal.`
                        : "Gagal memperbarui data siswa."}
                    </p>
                    {batchEditResult.notFoundCount > 0 && (
                      <p className="text-[11px] text-amber-800 font-medium">
                        ⚠️ Catatan: {batchEditResult.notFoundCount} entri tidak ditemukan di database siswa.
                      </p>
                    )}
                    {batchEditResult.errors.length > 0 && (
                      <div className="text-[11px] text-red-700 space-y-0.5">
                        {batchEditResult.errors.map((err, i) => (
                          <div key={i}>• {err}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 1: PASTE / EXCEL MODE */}
              {batchEditActiveTab === "paste" && (
                <div className="space-y-4">
                  {/* Controls & Quick Loader Bar */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            Metode Pencocokan:
                          </label>
                          <select
                            value={batchEditMatchBy}
                            onChange={(e) => setBatchEditMatchBy(e.target.value as any)}
                            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold text-blue-900 focus:outline-none focus:border-blue-600"
                          >
                            <option value="nisn">Cocokkan Berdasarkan NISN (Ubah Nama & Kelas)</option>
                            <option value="name">Cocokkan Berdasarkan Nama (Ubah NISN & Kelas)</option>
                            <option value="id">Cocokkan Berdasarkan ID Siswa</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            Kelas Default:
                          </label>
                          <select
                            value={batchEditDefaultClass}
                            onChange={(e) => setBatchEditDefaultClass(e.target.value)}
                            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                          >
                            <option value="7">Kelas 7</option>
                            <option value="8">Kelas 8</option>
                            <option value="9">Kelas 9</option>
                          </select>
                        </div>
                      </div>

                      {/* Quick Loader Dropdown / Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Muat Data:
                          </span>
                          {["all", "7", "8", "9"].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => loadCurrentStudentsIntoBatchEditText(c)}
                              className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 border border-slate-200 rounded-md transition cursor-pointer"
                              title={`Muat data siswa ${c === "all" ? "semua kelas" : "Kelas " + c} ke teks`}
                            >
                              {c === "all" ? "Semua" : `Kls ${c}`}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={fillSampleBatchEditData}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg flex items-center gap-1 border border-blue-200 cursor-pointer transition"
                        >
                          <Copy className="w-3.5 h-3.5" /> Contoh Format
                        </button>
                        {batchEditRawText && (
                          <button
                            type="button"
                            onClick={() => {
                              setBatchEditRawText("");
                              setBatchEditResult(null);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 text-[11px] font-bold rounded-lg flex items-center gap-1 border border-red-200 cursor-pointer transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Bersihkan
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 bg-blue-50/50 p-2.5 rounded-lg border border-blue-150 leading-relaxed">
                      <strong className="text-blue-900 block mb-0.5">Petunjuk Format Edit Massal:</strong>
                      <span>
                        Tempelkan kolom yang ingin diperbarui: <code className="font-mono font-bold text-blue-800">NISN [Tab/Koma] Nama Lengkap Baru [Tab/Koma] Kelas Baru</code>. Anda dapat mengedit nama siswa, memperbaiki ejaan, merapikan NISN, atau menaikkan kelas siswa secara massal tanpa merusak data raport yang sudah diisi!
                      </span>
                    </div>
                  </div>

                  {/* Textarea Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Tempelkan Teks Data Siswa untuk Diperbarui:
                    </label>
                    <textarea
                      value={batchEditRawText}
                      onChange={(e) => {
                        setBatchEditRawText(e.target.value);
                        if (batchEditResult) setBatchEditResult(null);
                      }}
                      rows={6}
                      placeholder={`Contoh tempel (paste):&#10;0012984101\tAhmad Fauzi Ramadhan\t7&#10;0012984102\tAisyah Putri Azzahra\t8&#10;0012984103\tBilal Al-Ghifari\t9`}
                      className="w-full p-3 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-600 focus:bg-white resize-y shadow-inner bg-white"
                    ></textarea>
                  </div>

                  {/* Preview Table for Paste Tab */}
                  {batchEditRawText.trim() && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[11px]">
                            Total Baris: {parsedBatchEditStudents.length}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[11px]">
                            Siap Diperbarui: {parsedBatchEditStudents.filter((p) => p.status === "ready").length}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">
                            Tidak Berubah: {parsedBatchEditStudents.filter((p) => p.status === "unchanged").length}
                          </span>
                          {parsedBatchEditStudents.some((p) => p.status !== "ready" && p.status !== "unchanged") && (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[11px]">
                              Tidak Ditemukan / Error: {parsedBatchEditStudents.filter((p) => p.status !== "ready" && p.status !== "unchanged").length}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Pratinjau Perubahan Data
                        </span>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto bg-white shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 sticky top-0 border-b border-slate-200">
                            <tr>
                              <th className="p-2 font-bold text-slate-600 w-10 text-center">No</th>
                              <th className="p-2 font-bold text-slate-600">Siswa Target (Data Lama)</th>
                              <th className="p-2 font-bold text-slate-600">Perubahan Nama</th>
                              <th className="p-2 font-bold text-slate-600">Perubahan NISN</th>
                              <th className="p-2 font-bold text-slate-600">Perubahan Kelas</th>
                              <th className="p-2 font-bold text-slate-600 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            {parsedBatchEditStudents.map((item, idx) => {
                              const isReady = item.status === "ready";
                              const isUnchanged = item.status === "unchanged";

                              return (
                                <tr
                                  key={idx}
                                  className={
                                    isReady
                                      ? "bg-blue-50/30 hover:bg-blue-50/60"
                                      : isUnchanged
                                      ? "bg-white hover:bg-slate-50"
                                      : "bg-red-50/30 hover:bg-red-50/60"
                                  }
                                >
                                  <td className="p-2 text-center text-slate-400 font-mono text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="p-2">
                                    {item.currentStudent ? (
                                      <div>
                                        <p className="font-bold text-slate-900">{item.currentStudent.name}</p>
                                        <p className="text-[10px] text-slate-500 font-mono">
                                          NISN: {item.currentStudent.nisn} • Kls {item.currentStudent.kelas}
                                        </p>
                                      </div>
                                    ) : (
                                      <span className="text-red-600 font-semibold">{item.rawLine}</span>
                                    )}
                                  </td>
                                  <td className="p-2">
                                    {item.hasNameChange ? (
                                      <div className="flex items-center gap-1">
                                        <span className="line-through text-slate-400 text-[10px]">{item.currentStudent?.name}</span>
                                        <span className="font-bold text-blue-700">{item.newName}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-600">{item.newName}</span>
                                    )}
                                  </td>
                                  <td className="p-2 font-mono">
                                    {item.hasNisnChange ? (
                                      <div className="flex items-center gap-1">
                                        <span className="line-through text-slate-400 text-[10px]">{item.currentStudent?.nisn}</span>
                                        <span className="font-bold text-blue-700">{item.newNisn}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-600">{item.newNisn}</span>
                                    )}
                                  </td>
                                  <td className="p-2 font-mono">
                                    {item.hasKelasChange ? (
                                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                                        Kls {item.currentStudent?.kelas} ➔ Kls {item.newKelas}
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                                        Kelas {item.newKelas}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2 text-right">
                                    {isReady ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                                        <CheckCircle2 className="w-3 h-3 text-blue-600" /> Siap Update
                                      </span>
                                    ) : isUnchanged ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                                        Tidak Berubah
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                                        <AlertCircle className="w-3 h-3 text-red-600" /> {item.message}
                                      </span>
                                    )}
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
              )}

              {/* TAB 2: INTERACTIVE TABLE GRID */}
              {batchEditActiveTab === "table" && (
                <div className="space-y-3">
                  {/* Grid Toolbar: Search, Filter, Bulk Operations */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Filter & Search */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                          {[
                            { id: "all", label: `Semua (${gridEditStudents.length})` },
                            { id: "7", label: `Kelas 7 (${gridEditStudents.filter(s => String(s.kelas).trim() === "7").length})` },
                            { id: "8", label: `Kelas 8 (${gridEditStudents.filter(s => String(s.kelas).trim() === "8").length})` },
                            { id: "9", label: `Kelas 9 (${gridEditStudents.filter(s => String(s.kelas).trim() === "9").length})` },
                          ].map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setGridEditClassFilter(t.id)}
                              className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                                gridEditClassFilter === t.id
                                  ? "bg-blue-600 text-white shadow-2xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        <div className="relative w-48">
                          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={gridEditSearch}
                            onChange={(e) => setGridEditSearch(e.target.value)}
                            placeholder="Cari di tabel..."
                            className="w-full pl-7 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* Quick Bulk Actions for Table */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Aksi Massal:
                        </span>
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-0.5 rounded-lg">
                          <span className="text-[10px] font-medium text-slate-500 px-1">Set Kelas:</span>
                          {["7", "8", "9"].map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => handleGridBulkClassChange(k)}
                              className="px-2 py-0.5 bg-white hover:bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-slate-200 transition cursor-pointer"
                              title={`Ubah kelas siswa yang tampil / dipilih ke Kelas ${k}`}
                            >
                              ➔ Kls {k}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleGridBulkTitleCase}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg border border-slate-200 transition cursor-pointer"
                          title="Ubah huruf awal nama siswa menjadi kapital (Title Case)"
                        >
                          Aa Title Case
                        </button>
                      </div>
                    </div>

                    {/* Dirty count badge */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-medium">
                          Status Perubahan:
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[11px] font-mono">
                          {gridEditStudents.filter((s) => s.isDirty).length} siswa telah diedit
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Anda dapat mengedit langsung teks nama, nomor NISN, atau kelas pada kotak tabel di bawah.
                      </span>
                    </div>
                  </div>

                  {/* Grid Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-white shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 z-10">
                        <tr>
                          <th className="p-2.5 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={
                                gridEditStudents.length > 0 &&
                                gridEditStudents.every((s) => gridEditSelectedIds.includes(s.id))
                              }
                              onChange={() => {
                                if (gridEditSelectedIds.length === gridEditStudents.length) {
                                  setGridEditSelectedIds([]);
                                } else {
                                  setGridEditSelectedIds(gridEditStudents.map((s) => s.id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </th>
                          <th className="p-2.5 font-bold text-slate-600 w-10 text-center">No</th>
                          <th className="p-2.5 font-bold text-slate-600">Nama Lengkap Siswa</th>
                          <th className="p-2.5 font-bold text-slate-600 w-44">NISN</th>
                          <th className="p-2.5 font-bold text-slate-600 w-32">Kelas</th>
                          <th className="p-2.5 font-bold text-slate-600 text-right w-28">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {gridEditStudents
                          .filter((s) => {
                            const matchClass = gridEditClassFilter === "all" || String(s.kelas).trim() === gridEditClassFilter;
                            const q = gridEditSearch.trim().toLowerCase();
                            const matchSearch = !q || s.name.toLowerCase().includes(q) || String(s.nisn).includes(q);
                            return matchClass && matchSearch;
                          })
                          .map((student, idx) => {
                            const isSelected = gridEditSelectedIds.includes(student.id);

                            return (
                              <tr
                                key={student.id}
                                className={`transition ${
                                  student.isDirty
                                    ? "bg-amber-50/40 border-l-4 border-l-amber-500"
                                    : isSelected
                                    ? "bg-blue-50/30"
                                    : "hover:bg-slate-50/60"
                                }`}
                              >
                                <td className="p-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      setGridEditSelectedIds((prev) =>
                                        prev.includes(student.id)
                                          ? prev.filter((id) => id !== student.id)
                                          : [...prev, student.id]
                                      );
                                    }}
                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                </td>
                                <td className="p-2 text-center text-slate-400 font-mono text-[11px]">
                                  {idx + 1}
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={student.name}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setGridEditStudents((prev) =>
                                        prev.map((item) => {
                                          if (item.id === student.id) {
                                            const isDirty =
                                              val !== item.originalName ||
                                              item.nisn !== item.originalNisn ||
                                              item.kelas !== item.originalKelas;
                                            return { ...item, name: val, isDirty };
                                          }
                                          return item;
                                        })
                                      );
                                    }}
                                    className={`w-full px-2.5 py-1 text-xs rounded-lg border focus:outline-none focus:border-blue-600 focus:bg-white font-semibold ${
                                      student.name !== student.originalName
                                        ? "border-amber-400 bg-amber-50/50 text-amber-950 font-bold"
                                        : "border-slate-250 bg-white text-slate-900"
                                    }`}
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={student.nisn}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/\D/g, "");
                                      setGridEditStudents((prev) =>
                                        prev.map((item) => {
                                          if (item.id === student.id) {
                                            const isDirty =
                                              item.name !== item.originalName ||
                                              val !== item.originalNisn ||
                                              item.kelas !== item.originalKelas;
                                            return { ...item, nisn: val, isDirty };
                                          }
                                          return item;
                                        })
                                      );
                                    }}
                                    className={`w-full px-2.5 py-1 text-xs rounded-lg border focus:outline-none focus:border-blue-600 focus:bg-white font-mono ${
                                      student.nisn !== student.originalNisn
                                        ? "border-amber-400 bg-amber-50/50 text-amber-950 font-bold"
                                        : "border-slate-250 bg-white text-slate-800"
                                    }`}
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    value={student.kelas}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setGridEditStudents((prev) =>
                                        prev.map((item) => {
                                          if (item.id === student.id) {
                                            const isDirty =
                                              item.name !== item.originalName ||
                                              item.nisn !== item.originalNisn ||
                                              val !== item.originalKelas;
                                            return { ...item, kelas: val, isDirty };
                                          }
                                          return item;
                                        })
                                      );
                                    }}
                                    className={`w-full px-2 py-1 text-xs rounded-lg border focus:outline-none focus:border-blue-600 font-bold ${
                                      student.kelas !== student.originalKelas
                                        ? "border-amber-400 bg-amber-50 text-amber-900 font-extrabold"
                                        : "border-slate-250 bg-white text-slate-800"
                                    }`}
                                  >
                                    <option value="7">Kelas 7</option>
                                    <option value="8">Kelas 8</option>
                                    <option value="9">Kelas 9</option>
                                  </select>
                                </td>
                                <td className="p-2 text-right">
                                  {student.isDirty ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Diubah
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      Asli
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <div className="text-[11px] text-slate-500">
                  {batchEditActiveTab === "paste"
                    ? `${parsedBatchEditStudents.filter((p) => p.status === "ready").length} pembaruan siap disimpan`
                    : `${gridEditStudents.filter((s) => s.isDirty).length} data siswa diubah`}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    disabled={isSubmittingBatchEdit}
                    onClick={() => {
                      setIsBatchEditModalOpen(false);
                      setBatchEditResult(null);
                    }}
                    className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    disabled={
                      isSubmittingBatchEdit ||
                      (batchEditActiveTab === "paste"
                        ? parsedBatchEditStudents.filter((p) => p.status === "ready").length === 0
                        : gridEditStudents.filter((s) => s.isDirty).length === 0)
                    }
                    onClick={handleBatchEditSubmit}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 active:from-blue-800 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2 transition disabled:opacity-40 shadow-md shadow-blue-900/20 border border-blue-400/40"
                  >
                    {isSubmittingBatchEdit ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Menyimpan Perubahan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>
                          Simpan {batchEditActiveTab === "paste"
                            ? parsedBatchEditStudents.filter((p) => p.status === "ready").length
                            : gridEditStudents.filter((s) => s.isDirty).length} Pembaruan Siswa
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* PROFESSIONAL CONFIRMATION DELETE MODAL */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#0f172a] w-full max-w-lg rounded-2xl border border-red-500/30 shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-950 via-rose-950 to-red-900 px-6 py-4 border-b border-red-500/30 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-300 shadow-inner">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wide text-white">
                    Konfirmasi Hapus {confirmDeleteModal.type.includes("student") ? "Siswa" : "Guru"}
                  </h3>
                  <p className="text-[11px] text-red-200/80">
                    Tindakan ini permanen dan tidak dapat dibatalkan
                  </p>
                </div>
              </div>
              <button
                disabled={isDeleting}
                onClick={() => setConfirmDeleteModal({ isOpen: false, type: "single_student" })}
                className="text-slate-400 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Target Details Card */}
              <div className="p-4 bg-[#141f36] border border-[#203254] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    Data yang Akan Dihapus:
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                    {confirmDeleteModal.type.startsWith("bulk") ? `${confirmDeleteModal.count} Item Terpilih` : "1 Item"}
                  </span>
                </div>

                {confirmDeleteModal.type === "single_student" && (
                  <div className="space-y-1">
                    <p className="text-base font-bold text-white">
                      {confirmDeleteModal.targetName}
                    </p>
                    <p className="text-xs text-slate-300 font-mono">
                      {confirmDeleteModal.details}
                    </p>
                  </div>
                )}

                {confirmDeleteModal.type === "single_teacher" && (
                  <div className="space-y-1">
                    <p className="text-base font-bold text-white">
                      {confirmDeleteModal.targetName}
                    </p>
                    <p className="text-xs text-slate-300">
                      {confirmDeleteModal.details}
                    </p>
                  </div>
                )}

                {confirmDeleteModal.type === "bulk_students" && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-200">
                      Anda akan menghapus <strong className="text-red-400 font-black">{confirmDeleteModal.count} siswa</strong> sekaligus:
                    </p>
                    <div className="max-h-36 overflow-y-auto divide-y divide-[#1e2e4a] bg-[#0b1222] p-2.5 rounded-lg border border-[#1e2e4a] text-xs text-slate-300">
                      {confirmDeleteModal.targetIds?.map((id, i) => {
                        const s = students.find((item) => item.id === id);
                        return (
                          <div key={id} className="py-1 flex items-center justify-between gap-2">
                            <span className="truncate font-medium text-white">
                              {i + 1}. {s ? s.name : id}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              Kelas {s ? s.kelas : "-"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {confirmDeleteModal.type === "bulk_teachers" && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-200">
                      Anda akan menghapus <strong className="text-red-400 font-black">{confirmDeleteModal.count} guru</strong> sekaligus:
                    </p>
                    <div className="max-h-36 overflow-y-auto divide-y divide-[#1e2e4a] bg-[#0b1222] p-2.5 rounded-lg border border-[#1e2e4a] text-xs text-slate-300">
                      {confirmDeleteModal.targetIds?.map((id, i) => {
                        const t = teachers.find((item) => item.id === id);
                        return (
                          <div key={id} className="py-1 flex items-center justify-between gap-2">
                            <span className="truncate font-medium text-white">
                              {i + 1}. {t ? t.name : id}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                              {t ? t.subject : "-"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Warning Notice */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-200">Peringatan Keamanan Database:</p>
                  <p className="text-[11px] text-amber-300/90 leading-relaxed">
                    {confirmDeleteModal.type.includes("student")
                      ? "Menghapus data siswa akan secara otomatis membersihkan seluruh rekam nilai mata pelajaran, catatan sikap wali kelas, serta presensi kehadiran siswa terkait dari database."
                      : "Akun guru yang dihapus tidak akan dapat lagi masuk atau mengisi nilai rapor di dalam sistem."}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setConfirmDeleteModal({ isOpen: false, type: "single_student" })}
                  className="px-4 py-2.5 bg-[#141f36] hover:bg-[#1b2b4a] border border-[#203254] text-slate-300 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleExecuteDelete}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:via-rose-700 hover:to-red-800 active:from-red-800 active:to-rose-900 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-red-950/50 disabled:opacity-60 border border-red-400/40"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sedang Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Ya, Hapus Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HALAQOH & KEISLAMAN TAB */}
      {activeTab === "halaqoh" && (
        <div className="bg-white rounded-lg border border-slate-205 shadow-sm p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Manajemen Kelompok Halaqoh & Ustadz/ah Pembimbing
              </h2>
              <p className="text-xs text-slate-500">
                Atur kelompok halaqoh santri, tentukan ustadz/ah pembimbing, dan masukkan daftar siswa per halaqoh.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingHalaqoh(null);
                setHalaqohModalError("");
                setHalaqohForm({ name: "", mentorName: "", mentorTeacherId: "", studentIds: [] });
                setIsHalaqohModalOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kelompok Halaqoh</span>
            </button>
          </div>

          {/* Halaqoh Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {halaqohList.length > 0 ? (
              halaqohList.map((h) => {
                const memberCount = h.studentIds?.length || 0;
                const memberStudents = students
                  .filter((s) => (h.studentIds || []).includes(s.id))
                  .sort((a, b) => (a.name || "").localeCompare(b.name || "", "id", { sensitivity: "base" }));

                return (
                  <div key={h.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-white transition flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold uppercase">
                            Halaqoh Santri
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 mt-1">{h.name}</h3>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditHalaqoh(h)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg transition cursor-pointer"
                            title="Edit Halaqoh"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteHalaqoh(h.id)}
                            className="p-1.5 text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 rounded-lg transition cursor-pointer"
                            title="Hapus Halaqoh"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-slate-700 font-medium mb-3 flex items-center gap-1.5 bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                        <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Pembimbing: <strong className="text-blue-900">{h.mentorName}</strong></span>
                      </div>

                      <div className="text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                        <span>Anggota Santri ({memberCount}):</span>
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                        {memberStudents.length > 0 ? (
                          memberStudents.map((s, idx) => (
                            <div key={s.id} className="text-xs text-slate-700 flex items-center justify-between py-0.5 border-b border-slate-100 last:border-0">
                              <span>{idx + 1}. {s.name}</span>
                              <span className="text-[10px] font-mono text-slate-500">Kelas {s.kelas || "-"}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-400 italic text-center py-2">Belum ada santri dalam halaqoh ini.</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center p-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Belum Ada Kelompok Halaqoh</p>
                <p className="text-xs text-slate-500 mt-1">Klik tombol "Tambah Kelompok Halaqoh" di atas untuk membuat kelompok baru.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BACKUP & RESTORE TAB */}
      {activeTab === "backup" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6" id="backup-restore-panel">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-extrabold text-slate-900">
                Pusat Cadangan & Pemulihan Data (Backup & Restore)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Seluruh data akademik (Siswa, Guru, Nilai Mata Pelajaran, Catatan Wali Kelas, Template TP, Ekskul, dan Halaqoh) disimpan secara aman. Anda dapat mengunduh berkas cadangan `.json` kapan saja, mengunggah kembali berkas cadangan lama, atau memulihkan data ke kondisi awal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Action 1: Download Backup */}
            <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">1. Cadangkan Data (.json)</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Unduh seluruh data raport saat ini ke dalam satu berkas cadangan JSON untuk disimpan di komputer atau Google Drive Anda.
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownloadBackup}
                className="mt-5 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Berkas Cadangan</span>
              </button>
            </div>

            {/* Action 2: Restore from JSON file */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">2. Pulihkan dari Berkas Cadangan</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Pilih dan unggah berkas cadangan `.json` yang telah Anda unduh sebelumnya untuk memulihkan seluruh data raport dengan cepat.
                  </p>
                </div>
              </div>

              <label className="mt-5 w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer text-center">
                <UploadCloud className="w-4 h-4" />
                <span>{isRestoring ? "Memulihkan..." : "Pilih Berkas .json"}</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleRestoreFromFile}
                  disabled={isRestoring}
                  className="hidden"
                />
              </label>
            </div>

            {/* Action 3: Restore to Factory Default */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">3. Pulihkan ke Kondisi Awal</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Kembalikan database ke kondisi awal bawaan asli sistem jika data Anda mengalami kesalahan atau ingin dibersihkan.
                  </p>
                </div>
              </div>

              <button
                onClick={handleResetToFactory}
                disabled={isRestoring}
                className="mt-5 w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Pulihkan ke Kondisi Awal</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              <span>Petunjuk Keamanan Cadangan Data:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-500">
              <li>Lakukan pengunduhan cadangan data secara berkala setiap kali selesai melakukan penginputan nilai raport.</li>
              <li>Proses pemulihan data dari berkas `.json` akan menggantikan data yang ada saat ini secara langsung.</li>
              <li>Jika Anda memulihkan data ke kondisi awal, seluruh data nilai yang pernah dimasukkan sebelumnya dapat Anda kembalikan dengan mengunggah kembali berkas cadangan `.json`.</li>
            </ul>
          </div>
        </div>
      )}

      {/* HALAQOH FORM MODAL */}
      {isHalaqohModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-fade-in my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-bold uppercase tracking-wide">
                  {editingHalaqoh ? "Edit Kelompok Halaqoh" : "Tambah Kelompok Halaqoh Baru"}
                </h3>
              </div>
              <button
                onClick={() => setIsHalaqohModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleHalaqohSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {halaqohModalError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-xs text-red-700 font-semibold rounded">
                  {halaqohModalError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Nama Kelompok Halaqoh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Halaqoh 1 / Kelompok A"
                    value={halaqohForm.name}
                    onChange={(e) => setHalaqohForm({ ...halaqohForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 text-slate-900 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Ustadz/ah Pembimbing (Pilih dari Manajemen Guru)
                  </label>
                  <select
                    value={halaqohForm.mentorTeacherId || ""}
                    onChange={(e) => {
                      const teacherId = e.target.value;
                      if (!teacherId) {
                        setHalaqohForm({
                          ...halaqohForm,
                          mentorTeacherId: "",
                          mentorName: "",
                        });
                        return;
                      }
                      const selectedTeacher = teachers.find((t) => t.id === teacherId);
                      if (selectedTeacher) {
                        setHalaqohForm({
                          ...halaqohForm,
                          mentorTeacherId: selectedTeacher.id,
                          mentorName: selectedTeacher.name,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 font-semibold cursor-pointer focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Pilih Guru Terdaftar di Manajemen Guru --</option>
                    {teachers
                      .filter((t) => t.username !== "admin" && t.subject !== "Admin")
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.subject || "Guru"})
                        </option>
                      ))}
                  </select>
                  <p className="text-[10px] text-slate-500 italic">
                    Hanya guru yang terdaftar di Manajemen Guru yang dapat dipilih.
                  </p>
                </div>
              </div>

              {/* Student Assignment Section */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Pilih Anggota Santri / Siswa ({halaqohForm.studentIds.length} dipilih)
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const visibleIds = students
                          .filter((s) => {
                            const matchClass = halaqohClassFilter === "all" || String(s.kelas).trim() === halaqohClassFilter;
                            const isFemale = (() => {
                              const n = s.name.toLowerCase();
                              const femaleKeywords = ["siti", "nur", "aisyah", "fatimah", "zahra", "khadijah", "annisa", "putri", "salsabila", "salma", "nabila", "zahira", "kayla", "naura", "dinda", "fauziyah", "amalia", "zaskia", "aulia", "safira", "husna", "rahma", "syifa", "nadia", "fitri", "intan", "dewi", "sri", "lestari", "pertiwi", "wulan", "melati", "ananda", "mutiara"];
                              return femaleKeywords.some(kw => n.includes(kw)) || n.endsWith("a") || n.endsWith("i") || n.endsWith("h");
                            })();
                            const matchGender = halaqohGenderFilter === "all" || (halaqohGenderFilter === "putri" ? isFemale : !isFemale);
                            const matchSearch = s.name.toLowerCase().includes(halaqohStudentSearch.toLowerCase()) || s.nisn.includes(halaqohStudentSearch);
                            return matchClass && matchGender && matchSearch;
                          })
                          .map(s => s.id);
                        
                        const merged = Array.from(new Set([...halaqohForm.studentIds, ...visibleIds]));
                        setHalaqohForm({ ...halaqohForm, studentIds: merged });
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                    >
                      ✓ Pilih Semua (Filter Ini)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const visibleIdsSet = new Set(
                          students
                            .filter((s) => {
                              const matchClass = halaqohClassFilter === "all" || String(s.kelas).trim() === halaqohClassFilter;
                              const isFemale = (() => {
                                const n = s.name.toLowerCase();
                                const femaleKeywords = ["siti", "nur", "aisyah", "fatimah", "zahra", "khadijah", "annisa", "putri", "salsabila", "salma", "nabila", "zahira", "kayla", "naura", "dinda", "fauziyah", "amalia", "zaskia", "aulia", "safira", "husna", "rahma", "syifa", "nadia", "fitri", "intan", "dewi", "sri", "lestari", "pertiwi", "wulan", "melati", "ananda", "mutiara"];
                                return femaleKeywords.some(kw => n.includes(kw)) || n.endsWith("a") || n.endsWith("i") || n.endsWith("h");
                              })();
                              const matchGender = halaqohGenderFilter === "all" || (halaqohGenderFilter === "putri" ? isFemale : !isFemale);
                              const matchSearch = s.name.toLowerCase().includes(halaqohStudentSearch.toLowerCase()) || s.nisn.includes(halaqohStudentSearch);
                              return matchClass && matchGender && matchSearch;
                            })
                            .map(s => s.id)
                        );
                        const filtered = halaqohForm.studentIds.filter(id => !visibleIdsSet.has(id));
                        setHalaqohForm({ ...halaqohForm, studentIds: filtered });
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                    >
                      ✕ Batalkan Filter Ini
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={halaqohClassFilter}
                    onChange={(e) => setHalaqohClassFilter(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 font-semibold"
                  >
                    <option value="all">Semua Kelas (7, 8, 9)</option>
                    <option value="7">Kelas 7</option>
                    <option value="8">Kelas 8</option>
                    <option value="9">Kelas 9</option>
                  </select>

                  <select
                    value={halaqohGenderFilter}
                    onChange={(e) => setHalaqohGenderFilter(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 font-semibold"
                  >
                    <option value="all">Semua Siswa</option>
                    <option value="putra">Siswa Putra</option>
                    <option value="putri">Siswa Putri</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Cari nama / NISN..."
                    value={halaqohStudentSearch}
                    onChange={(e) => setHalaqohStudentSearch(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 font-semibold"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto border border-slate-300 rounded-xl p-2.5 space-y-1.5 bg-slate-100 shadow-inner">
                  {students
                    .filter((s) => {
                      const matchClass = halaqohClassFilter === "all" || String(s.kelas).trim() === halaqohClassFilter;
                      const isFemale = (() => {
                        const n = s.name.toLowerCase();
                        const femaleKeywords = ["siti", "nur", "aisyah", "fatimah", "zahra", "khadijah", "annisa", "putri", "salsabila", "salma", "nabila", "zahira", "kayla", "naura", "dinda", "fauziyah", "amalia", "zaskia", "aulia", "safira", "husna", "rahma", "syifa", "nadia", "fitri", "intan", "dewi", "sri", "lestari", "pertiwi", "wulan", "melati", "ananda", "mutiara"];
                        return femaleKeywords.some(kw => n.includes(kw)) || n.endsWith("a") || n.endsWith("i") || n.endsWith("h");
                      })();
                      const matchGender = halaqohGenderFilter === "all" || (halaqohGenderFilter === "putri" ? isFemale : !isFemale);
                      const matchSearch = s.name.toLowerCase().includes(halaqohStudentSearch.toLowerCase()) || s.nisn.includes(halaqohStudentSearch);
                      return matchClass && matchGender && matchSearch;
                    })
                    .sort((a, b) => {
                      if (halaqohClassFilter === "all" && a.kelas !== b.kelas) {
                        return String(a.kelas).localeCompare(String(b.kelas), "id", { numeric: true });
                      }
                      return (a.name || "").localeCompare(b.name || "", "id", { sensitivity: "base" });
                    })
                    .map((s) => {
                      const isSelected = halaqohForm.studentIds.includes(s.id);

                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            const newIds = isSelected
                              ? halaqohForm.studentIds.filter((id) => id !== s.id)
                              : [...halaqohForm.studentIds, s.id];
                            setHalaqohForm({ ...halaqohForm, studentIds: newIds });
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition border ${
                            isSelected 
                              ? "bg-blue-600 border-blue-700 text-white shadow-md font-bold" 
                              : "bg-white hover:bg-slate-50 border-slate-300 text-slate-900 font-semibold"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-700"
                            />
                            <span className="text-xs">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                              isSelected ? "bg-blue-800 text-white" : "bg-slate-200 text-slate-800 font-bold"
                            }`}>
                              Kelas {s.kelas || "-"} ({s.nisn})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsHalaqohModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHalaqoh}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isSubmittingHalaqoh && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>}
                  <span>Simpan Halaqoh</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
