import React, { useState, useEffect } from "react";
import { Teacher, Student, Grade, TPItem } from "../types";
import {
  BookOpen,
  User,
  ClipboardPlus,
  CheckCircle,
  Save,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Pencil,
  X,
  Trophy,
  Award,
  Search,
  ArrowUpDown,
  AlertTriangle,
  Printer,
  TrendingUp,
  TrendingDown,
  Percent,
  Sparkles,
  Filter,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

interface TeacherPanelProps {
  user: Teacher;
  onRefreshTrigger: () => void;
}

export default function TeacherPanel({
  user,
  onRefreshTrigger,
}: TeacherPanelProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [tpTemplates, setTpTemplates] = useState<
    { id: string; text: string }[]
  >([]);

  // View state tab: grades (pengisian nilai), tps (kelola TP), or ranking (peringkat & analisis bimbingan)
  const [activeViewTab, setActiveViewTab] = useState<"grades" | "tps" | "ranking">(
    "grades",
  );

  // Class selection state (7, 8, 9)
  const [selectedClass, setSelectedClass] = useState("7");
  // Student selection state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Ranking & Bimbingan Tab States
  const [rankingSubject, setRankingSubject] = useState<string>(user.subject);
  const [rankingClass, setRankingClass] = useState<string>("all"); // "all" | "7" | "8" | "9"
  const [rankingSort, setRankingSort] = useState<"desc" | "asc">("desc"); // desc = highest to lowest, asc = lowest to highest
  const [rankingSearch, setRankingSearch] = useState<string>("");
  const [rankingFilterStatus, setRankingFilterStatus] = useState<"all" | "bimbingan" | "tuntas">("all");
  const [kkmThreshold, setKkmThreshold] = useState<number>(75);

  // Form states
  const [score, setScore] = useState<string>("");
  const [usaha, setUsaha] = useState<string>("B");
  const [proses, setProses] = useState<string>("B");
  const [capaian, setCapaian] = useState<string>("B");
  const [tpAchievements, setTpAchievements] = useState<{
    [tpId: string]: boolean;
  }>({});

  const [customDescription, setCustomDescription] = useState<string>("");
  const [isCustomDescActive, setIsCustomDescActive] = useState<boolean>(false);

  // Manage TP template state for teacher (Add & Edit)
  const [newTpText, setNewTpText] = useState("");
  const [tpSubmitLoading, setTpSubmitLoading] = useState(false);
  const [editingTpId, setEditingTpId] = useState<string | null>(null);
  const [editingTpText, setEditingTpText] = useState("");
  const [editTpLoading, setEditTpLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [resS, resG, resTp] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/grades"),
        fetch("/api/tps"),
      ]);

      const sData = await resS.json();
      const gData = await resG.json();
      const tpData = await resTp.json();

      const sArr = Array.isArray(sData) ? sData : [];
      const gArr = Array.isArray(gData) ? gData : [];
      const tpObj = tpData && typeof tpData === "object" ? tpData : {};

      setStudents(sArr);
      setGrades(gArr);

      // Filter TP templates specifically for this teacher's subject and the selected class
      const allSubjectTps = Array.isArray(tpObj[user.subject])
        ? tpObj[user.subject]
        : [];
      const classTps = allSubjectTps.filter(
        (t: any) => String(t.kelas || "").trim() === String(selectedClass).trim()
      );
      setTpTemplates(classTps);

      // Auto-select first student in this class if available
      const classStudents = sArr
        .filter((s: Student) => String(s.kelas).trim() === String(selectedClass).trim())
        .sort((a: Student, b: Student) => (a.name || "").localeCompare(b.name || "", "id", { sensitivity: "base" }));
      if (classStudents.length > 0) {
        handleStudentSelect(classStudents[0], gArr, classTps);
      } else {
        setSelectedStudent(null);
        setScore("");
        setTpAchievements({});
        setUsaha("B");
        setProses("B");
        setCapaian("B");
        setCustomDescription("");
        setIsCustomDescActive(false);
      }
    } catch (err) {
      setError("Gagal memuat sinkronisasi data dari server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClass, user.subject]);

  // Helper function to generate narrative description based on Kurikulum Merdeka standards
  const generateNarrativeDescription = (
    student: Student | null,
    subjectName: string,
    templates: { id: string; text: string }[],
    achievements: { [tpId: string]: boolean },
  ) => {
    if (!student) return "";
    const name = student.name ? student.name.trim() : "Siswa";

    const safeTemplates = Array.isArray(templates)
      ? templates.filter((tp) => tp && tp.id && tp.text)
      : [];

    if (safeTemplates.length === 0) return "";

    const achieved = safeTemplates
      .filter((tp) => achievements[tp.id] !== false)
      .map((tp) => tp.text.trim())
      .filter(Boolean);
    const needImprovement = safeTemplates
      .filter((tp) => achievements[tp.id] === false)
      .map((tp) => tp.text.trim())
      .filter(Boolean);

    const joinItems = (items: string[]) => {
      const cleaned = items.map((i) => i.trim().replace(/\.+$/, ""));
      if (cleaned.length === 0) return "";
      if (cleaned.length === 1) return cleaned[0];
      if (cleaned.length === 2) return `${cleaned[0]} dan ${cleaned[1]}`;
      return `${cleaned.slice(0, -1).join(", ")}, dan ${cleaned[cleaned.length - 1]}`;
    };

    let text = "";

    if (achieved.length > 0 && needImprovement.length === 0) {
      text = `Alhamdulillah, ananda ${name} dalam pembelajaran ${subjectName || "mata pelajaran ini"} menunjukkan penguasaan yang optimal dalam ${joinItems(achieved)}. Pertahankan prestasimu, teruslah bertumbuh dengan rendah hati, dan yakinlah setiap ikhtiar baikmu hari ini akan membuka pintu masa depan yang indah.`;
    } else if (achieved.length > 0 && needImprovement.length > 0) {
      text = `Alhamdulillah, ananda ${name} dalam pembelajaran ${subjectName || "mata pelajaran ini"} menunjukkan penguasaan yang optimal dalam ${joinItems(achieved)}. Namun masih memerlukan bimbingan dan pendampingan lebih lanjut dalam ${joinItems(needImprovement)}. Tetaplah bersemangat, jangan pernah lelah untuk mencoba karena setiap proses belajarmu sangatlah berharga.`;
    } else if (needImprovement.length > 0) {
      text = `Ananda ${name} dalam pembelajaran ${subjectName || "mata pelajaran ini"} masih memerlukan bimbingan dan pendampingan lebih lanjut dalam ${joinItems(needImprovement)}. Jangan berkecil hati, percayalah pada kemampuan dirimu; dengan kesabaran, doa, dan usaha yang tekun, ananda pasti mampu meraih hal yang lebih baik.`;
    }

    return text;
  };

  const normalizeSubject = (s: string | undefined | null) => {
    if (!s) return "";
    return s
      .toLowerCase()
      .replace(/[’'"`]/g, "'")
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const normalizeTpText = (t: string | undefined | null) => {
    if (!t) return "";
    return t.toLowerCase().replace(/[^a-z0-9]/g, "");
  };

  const handleStudentSelect = (
    student: Student,
    allGrades: Grade[] = grades,
    templates: { id: string; text: string; kelas?: string }[] = tpTemplates,
  ) => {
    try {
      setSelectedStudent(student);
      setSuccess("");
      setError("");

      const safeGrades = Array.isArray(allGrades) ? allGrades : [];
      let activeTemplates = Array.isArray(templates) ? [...templates] : [];

      // Look up if this student already has a grade for this teacher's subject (robust subject matching)
      const existingGrade = safeGrades.find(
        (g) => g && g.studentId === student?.id && normalizeSubject(g.subject) === normalizeSubject(user.subject),
      );

      if (existingGrade && Array.isArray(existingGrade.tps)) {
        existingGrade.tps.forEach((gtp: any) => {
          if (
            gtp &&
            gtp.text &&
            !activeTemplates.some(
              (t) =>
                (t.id && gtp.id && String(t.id).trim() === String(gtp.id).trim()) ||
                t.text.trim().toLowerCase() === gtp.text.trim().toLowerCase()
            )
          ) {
            activeTemplates.push({
              id: gtp.id || ("tp_" + Math.random().toString(36).substring(2, 7)),
              text: gtp.text.trim(),
              kelas: selectedClass,
            });
          }
        });
      }

      if (existingGrade) {
        setScore(
          String(
            existingGrade.score !== undefined && existingGrade.score !== null
              ? existingGrade.score
              : "",
          ),
        );
        setUsaha(existingGrade.usaha || "B");
        setProses(existingGrade.proses || "B");
        setCapaian(existingGrade.capaian || "B");

        const studentSavedTps = Array.isArray(existingGrade.tps) ? existingGrade.tps : [];

        // Build active checked states with multi-level matching:
        // Priority:
        // 1. Direct ID match
        // 2. Exact/normalized text match
        // 3. Substring text match
        // 4. Positional index fallback if length is identical
        // ABSOLUTE GUARANTEE: An un-checked TP (achieved: false) will ALWAYS remain false!
        const achievedMap: { [tpId: string]: boolean } = {};

        activeTemplates.forEach((tmpl, tmplIdx) => {
          if (!tmpl || !tmpl.id) return;
          const normTmplText = normalizeTpText(tmpl.text);

          let matchedItem: any = null;

          // 1. Direct ID match
          matchedItem = studentSavedTps.find(
            (t) => t && t.id && String(t.id).trim() === String(tmpl.id).trim()
          );

          // 2. Normalized text match
          if (!matchedItem && normTmplText) {
            matchedItem = studentSavedTps.find(
              (t) => t && t.text && normalizeTpText(t.text) === normTmplText
            );
          }

          // 3. Substring text match
          if (!matchedItem && normTmplText) {
            matchedItem = studentSavedTps.find((t) => {
              if (!t || !t.text) return false;
              const normT = normalizeTpText(t.text);
              return normT.includes(normTmplText) || normTmplText.includes(normT);
            });
          }

          // 4. Fallback index match if same length
          if (!matchedItem && studentSavedTps.length === activeTemplates.length && studentSavedTps[tmplIdx]) {
            matchedItem = studentSavedTps[tmplIdx];
          }

          if (matchedItem) {
            // Strictly check false values - never let false flip to true
            const isAchieved =
              matchedItem.achieved !== false &&
              (matchedItem.achieved as any) !== "false" &&
              (matchedItem.achieved as any) !== 0;
            achievedMap[tmpl.id] = isAchieved;
            if (matchedItem.id && matchedItem.id !== tmpl.id) {
              achievedMap[matchedItem.id] = isAchieved;
            }
          } else {
            // If student already has saved TPs, check if this position in saved TPs was marked false
            if (studentSavedTps.length > 0 && tmplIdx < studentSavedTps.length && studentSavedTps[tmplIdx]?.achieved === false) {
              achievedMap[tmpl.id] = false;
            } else {
              achievedMap[tmpl.id] = true;
            }
          }
        });

        // Also record raw student saved TP IDs so any direct lookups work
        studentSavedTps.forEach((stTp) => {
          if (stTp && stTp.id) {
            const isAchieved =
              stTp.achieved !== false &&
              (stTp.achieved as any) !== "false" &&
              (stTp.achieved as any) !== 0;
            achievedMap[stTp.id] = isAchieved;
          }
        });

        setTpAchievements(achievedMap);

        if (existingGrade.deskripsi && existingGrade.deskripsi.trim() !== "") {
          setCustomDescription(existingGrade.deskripsi.trim());
          setIsCustomDescActive(true);
        } else if (activeTemplates.length > 0) {
          const auto = generateNarrativeDescription(
            student,
            user.subject,
            activeTemplates,
            achievedMap,
          );
          setCustomDescription(auto);
          setIsCustomDescActive(false);
        } else {
          setCustomDescription("");
          setIsCustomDescActive(false);
        }
      } else {
        // Clear forms for new entries
        setScore("");
        setUsaha("B");
        setProses("B");
        setCapaian("B");

        const defaultMap: { [tpId: string]: boolean } = {};
        activeTemplates.forEach((t) => {
          if (t && t.id) {
            defaultMap[t.id] = true; // default achieved for brand new grade
          }
        });
        setTpAchievements(defaultMap);

        if (activeTemplates.length > 0) {
          const auto = generateNarrativeDescription(
            student,
            user.subject,
            activeTemplates,
            defaultMap,
          );
          setCustomDescription(auto);
        } else {
          setCustomDescription("");
        }
        setIsCustomDescActive(false);
      }
    } catch (e: any) {
      console.error("Error in handleStudentSelect:", e);
      setError("Terjadi kesalahan memproses data siswa terpilih.");
    }
  };

  // Helper with numeric-to-predicate mapping for default selections
  const handleScoreChange = (val: string) => {
    setScore(val);
    const num = Number(val);
    if (!isNaN(num) && val.trim() !== "") {
      let defaultGrade = "C";
      if (num > 91) defaultGrade = "A";
      else if (num >= 80) defaultGrade = "B";
      else defaultGrade = "C";

      setUsaha(defaultGrade);
      setProses(defaultGrade);
      setCapaian(defaultGrade);
    }
  };

  // Switch achievement status of some TP (preserves teacher-entered custom descriptions)
  const toggleTp = (id: string) => {
    const currentVal = tpAchievements[id];
    // If currently false -> true; if true or undefined -> false
    const nextAchieved = currentVal === false ? true : false;
    const nextMap = {
      ...tpAchievements,
      [id]: nextAchieved,
    };
    setTpAchievements(nextMap);

    // Hanya perbarui narasi otomatis jika guru BELUM memasukkan deskripsi kustom/manual
    // Deskripsi yang sudah diinputkan oleh guru tidak boleh ditimpa saat toggle TP
    if (!isCustomDescActive && selectedStudent && tpTemplates.length > 0) {
      const updatedDesc = generateNarrativeDescription(
        selectedStudent,
        user.subject,
        tpTemplates,
        nextMap,
      );
      setCustomDescription(updatedDesc);
    }
  };

  // Bulk set all TPs status (Semua Optimal atau Semua Butuh Bimbingan)
  const setAllTpStatus = (achieved: boolean) => {
    const nextMap: { [tpId: string]: boolean } = {};
    tpTemplates.forEach((t) => {
      if (t && t.id) nextMap[t.id] = achieved;
    });
    setTpAchievements(nextMap);

    // Hanya perbarui narasi otomatis jika guru belum memasukkan deskripsi kustom
    if (!isCustomDescActive && selectedStudent && tpTemplates.length > 0) {
      const updatedDesc = generateNarrativeDescription(
        selectedStudent,
        user.subject,
        tpTemplates,
        nextMap,
      );
      setCustomDescription(updatedDesc);
    }
  };

  // Sync / regenerate description from current TP status
  const handleRegenerateFromTp = () => {
    if (!selectedStudent) return;
    if (tpTemplates.length === 0) {
      setError("Belum ada Tujuan Pembelajaran (TP) untuk kelas ini.");
      return;
    }
    const updatedDesc = generateNarrativeDescription(
      selectedStudent,
      user.subject,
      tpTemplates,
      tpAchievements,
    );
    setCustomDescription(updatedDesc);
    setSuccess("Deskripsi berhasil diperbarui otomatis dari ceklist TP.");
    setTimeout(() => setSuccess(""), 3000);
  };

  // Auto generate narrative description (used as fallback)
  const getAutoDescription = () => {
    return generateNarrativeDescription(
      selectedStudent,
      user.subject,
      tpTemplates,
      tpAchievements,
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setError("");
    setSuccess("");

    const parsedScore = Number(score);
    if (
      isNaN(parsedScore) ||
      parsedScore < 0 ||
      parsedScore > 100 ||
      score.trim() === ""
    ) {
      setError("Masukkan nilai numerik valid antara 0 sampai 100.");
      return;
    }

    setSaveLoading(true);

    // Format TP list for post payload (supports empty TP list)
    const safeTemplates = Array.isArray(tpTemplates) ? tpTemplates : [];
    const formattedTps: TPItem[] = safeTemplates.map((tp) => {
      const val = tpAchievements[tp.id];
      const isAchieved = val === false || val === "false" || val === 0 ? false : (val ?? true);
      return {
        id: tp.id,
        text: tp.text,
        achieved: isAchieved,
      };
    });

    // Description is taken directly from the textarea (supports both auto from TP and purely manual)
    let finalDescription = customDescription.trim();
    if (selectedStudent && finalDescription) {
      // Safety guard: Pastikan deskripsi tidak memuat nama siswa lain jika guru menyalin teks
      const otherStudents = students.filter(
        (s) => s && s.id !== selectedStudent.id && s.kelas === selectedStudent.kelas,
      );
      for (const other of otherStudents) {
        if (other && other.name && finalDescription.includes(other.name)) {
          finalDescription = finalDescription.split(other.name).join(selectedStudent.name);
        }
      }
    }

    try {
      const response = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          subject: user.subject,
          score: parsedScore,
          tps: formattedTps,
          usaha,
          proses,
          capaian,
          deskripsi: finalDescription,
          teacherName: user.name,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan nilai.");

      // Immediately synchronize local state so un-checked TPs stay strictly intact
      const updatedGradeItem = {
        studentId: selectedStudent.id,
        subject: user.subject,
        score: parsedScore,
        tps: formattedTps,
        usaha,
        proses,
        capaian,
        deskripsi: finalDescription,
        teacherName: user.name,
        lastUpdatedBy: user.name,
        lastUpdatedAt: new Date().toISOString(),
      };

      setGrades((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex(
          (g) => g && g.studentId === selectedStudent.id && normalizeSubject(g.subject) === normalizeSubject(user.subject),
        );
        if (idx !== -1) copy[idx] = updatedGradeItem;
        else copy.push(updatedGradeItem);
        return copy;
      });

      setSuccess(
        `Nilai ${user.subject} untuk ${selectedStudent.name} berhasil disimpan!`,
      );
      onRefreshTrigger(); // trigger live stats update in index
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Add TP template directly by the teacher
  const handleAddLocalTp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTpText.trim()) return;
    setError("");
    setSuccess("");
    setTpSubmitLoading(true);

    try {
      const response = await fetch("/api/tps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: user.subject,
          tpText: newTpText.trim(),
          kelas: selectedClass,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan TP.");

      setNewTpText("");
      setSuccess(`Tujuan Pembelajaran untuk Kelas ${selectedClass} berhasil ditambahkan!`);

      // Reload TP templates for this subject and selected class
      const resTp = await fetch(`/api/tps?kelas=${selectedClass}`);
      const tpData = await resTp.json();
      const allSubjectTps = Array.isArray(tpData[user.subject])
        ? tpData[user.subject]
        : Array.isArray(tpData)
        ? tpData
        : [];
      const classTps = allSubjectTps.filter(
        (t: any) => String(t.kelas || "").trim() === String(selectedClass).trim()
      );
      setTpTemplates(classTps);

      // Default the new TP as achieved in state
      setTpAchievements((prev) => ({
        ...prev,
        [data.id]: true,
      }));
    } catch (err: any) {
      setError(err.message || "Gagal menambahkan TP.");
    } finally {
      setTpSubmitLoading(false);
    }
  };

  // Edit TP template by teacher
  const startEditTp = (tp: { id: string; text: string }) => {
    setEditingTpId(tp.id);
    setEditingTpText(tp.text);
    setError("");
    setSuccess("");
  };

  const cancelEditTp = () => {
    setEditingTpId(null);
    setEditingTpText("");
  };

  const handleSaveEditTp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTpId || !editingTpText.trim()) return;
    setEditTpLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/tps/${encodeURIComponent(user.subject)}/${encodeURIComponent(editingTpId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tpText: editingTpText.trim(),
            kelas: selectedClass,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memperbarui TP.");

      setTpTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTpId ? { ...t, text: editingTpText.trim() } : t,
        ),
      );
      setSuccess("Tujuan Pembelajaran berhasil diperbarui/diganti!");
      setEditingTpId(null);
      setEditingTpText("");
    } catch (err: any) {
      setError(err.message || "Gagal memperbarui TP.");
    } finally {
      setEditTpLoading(false);
    }
  };

  // Delete TP template permanently (with cloud and cache synchronization)
  const handleDeleteLocalTp = async (tpId: string) => {
    if (
      !confirm(
        "Apakah Anda yakin ingin menghapus Tujuan Pembelajaran (TP) ini secara permanen?",
      )
    )
      return;
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/tps/${encodeURIComponent(user.subject)}/${encodeURIComponent(tpId)}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus TP.");

      // Immediately filter out from active state so it is gone permanently
      setTpTemplates((prev) => prev.filter((t) => t.id !== tpId));
      setTpAchievements((prev) => {
        const next = { ...prev };
        delete next[tpId];
        return next;
      });

      setSuccess("Tujuan Pembelajaran berhasil dihapus permanen.");

      // Also reload in background to stay synced
      const resTp = await fetch("/api/tps");
      const tpData = await resTp.json();
      const allSubjectTps = Array.isArray(tpData[user.subject])
        ? tpData[user.subject]
        : Array.isArray(tpData)
        ? tpData
        : [];
      const classTps = allSubjectTps.filter(
        (t: any) => String(t.kelas || "").trim() === String(selectedClass).trim(),
      );
      setTpTemplates(classTps);
    } catch (err: any) {
      setError(err.message || "Gagal menghapus TP.");
    }
  };

  // Helper arrays
  const safeStudents = Array.isArray(students) ? students : [];
  const classStudents = safeStudents
    .filter((s) => s && String(s.kelas).trim() === String(selectedClass).trim())
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "id", { sensitivity: "base" }));
  const filledCount = Array.isArray(grades)
    ? classStudents.filter((s) =>
        grades.some(
          (g) => g && g.studentId === s.id && g.subject === user.subject,
        ),
      ).length
    : 0;

  // List of all subjects available in school
  const availableSubjects = React.useMemo(() => {
    const defaultSubs = [
      "PAI",
      "PPKN",
      "Bahasa Indonesia",
      "Matematika",
      "IPA",
      "IPS",
      "Bahasa Inggris",
      "PJOK",
      "Informatika",
      "Bahasa Arab",
      "Tahsin ABaTaTsa",
      "Tahfizh Al-Qur’an",
      "Do’a Harian dan Hadits",
      "Wudhu dan Sholat",
    ];
    const fromGrades = (grades || [])
      .map((g) => g.subject)
      .filter((s): s is string => Boolean(s && s.trim()));
    return Array.from(new Set([user.subject, ...defaultSubs, ...fromGrades])).filter(Boolean);
  }, [user.subject, grades]);

  // Full rankings computation for the selected subject
  const subjectRankings = React.useMemo(() => {
    if (!students || students.length === 0) return [];

    const normTargetSubject = normalizeSubject(rankingSubject);

    // 1. Filter students by class if specified
    const filteredStudents = students.filter((s) => {
      if (rankingClass === "all") return true;
      return String(s.kelas).trim() === rankingClass;
    });

    // 2. Map student to grade & score
    const mapped = filteredStudents.map((s) => {
      const studentGrade = (grades || []).find(
        (g) =>
          g &&
          String(g.studentId).trim() === String(s.id).trim() &&
          normalizeSubject(g.subject) === normTargetSubject
      );

      const hasScore =
        studentGrade &&
        studentGrade.score !== undefined &&
        studentGrade.score !== null &&
        studentGrade.score !== "" &&
        !isNaN(Number(studentGrade.score));

      const numericScore = hasScore ? Number(studentGrade.score) : null;
      const percentage = numericScore !== null ? Math.min(100, Math.max(0, numericScore)) : null;

      const unachievedTps = (studentGrade?.tps || []).filter(
        (tp) => tp && tp.achieved === false
      );

      let predikat = "-";
      if (numericScore !== null) {
        if (numericScore >= 90) predikat = "A (Sangat Baik)";
        else if (numericScore >= 80) predikat = "B (Baik)";
        else if (numericScore >= 70) predikat = "C (Cukup)";
        else predikat = "D (Perlu Bimbingan)";
      }

      let guidanceStatus: "needs_guidance" | "competent" | "advanced" | "unrated" = "unrated";
      if (numericScore === null) {
        guidanceStatus = "unrated";
      } else if (numericScore < kkmThreshold) {
        guidanceStatus = "needs_guidance";
      } else if (numericScore >= 85) {
        guidanceStatus = "advanced";
      } else {
        guidanceStatus = "competent";
      }

      return {
        student: s,
        grade: studentGrade,
        score: numericScore,
        percentage,
        predikat,
        guidanceStatus,
        unachievedTps,
        deskripsi: studentGrade?.deskripsi || "",
      };
    });

    // 3. Separate graded and ungraded
    const gradedList = mapped.filter((item) => item.score !== null);
    const ungradedList = mapped.filter((item) => item.score === null);

    // 4. Sort graded students
    if (rankingSort === "desc") {
      gradedList.sort((a, b) => {
        if (b.score! !== a.score!) return b.score! - a.score!;
        return (a.student.name || "").localeCompare(b.student.name || "", "id");
      });
    } else {
      gradedList.sort((a, b) => {
        if (a.score! !== b.score!) return a.score! - b.score!;
        return (a.student.name || "").localeCompare(b.student.name || "", "id");
      });
    }

    // 5. Assign true tie-aware ranks
    let lastScore: number | null = null;
    let lastRank = 1;
    const rankedList = gradedList.map((item, idx) => {
      let rank = idx + 1;
      if (rankingSort === "desc") {
        if (idx === 0) {
          rank = 1;
          lastRank = 1;
          lastScore = item.score;
        } else {
          if (item.score === lastScore) {
            rank = lastRank;
          } else {
            rank = idx + 1;
            lastRank = idx + 1;
            lastScore = item.score;
          }
        }
      } else {
        rank = idx + 1;
      }
      return {
        ...item,
        rank,
        displayOrder: idx + 1,
      };
    });

    ungradedList.sort((a, b) => (a.student.name || "").localeCompare(b.student.name || "", "id"));

    return [...rankedList, ...ungradedList];
  }, [students, grades, rankingSubject, rankingClass, rankingSort, kkmThreshold]);

  // Filter rankings by search query and guidance status
  const filteredSubjectRankings = React.useMemo(() => {
    let result = subjectRankings;

    if (rankingSearch.trim()) {
      const q = rankingSearch.toLowerCase().trim();
      result = result.filter(
        (item) =>
          (item.student.name || "").toLowerCase().includes(q) ||
          String(item.student.nisn || "").includes(q)
      );
    }

    if (rankingFilterStatus === "bimbingan") {
      result = result.filter((item) => item.guidanceStatus === "needs_guidance");
    } else if (rankingFilterStatus === "tuntas") {
      result = result.filter(
        (item) => item.guidanceStatus === "competent" || item.guidanceStatus === "advanced"
      );
    }

    return result;
  }, [subjectRankings, rankingSearch, rankingFilterStatus]);

  // Overall ranking statistics
  const rankingStats = React.useMemo(() => {
    const total = subjectRankings.length;
    const graded = subjectRankings.filter((i) => i.score !== null);
    const countGraded = graded.length;
    const scores = graded.map((i) => i.score!);
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const avgScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0;

    const needsGuidance = subjectRankings.filter((i) => i.guidanceStatus === "needs_guidance");
    const competent = subjectRankings.filter(
      (i) => i.guidanceStatus === "competent" || i.guidanceStatus === "advanced"
    );

    return {
      total,
      countGraded,
      maxScore,
      minScore,
      avgScore,
      countNeedsGuidance: needsGuidance.length,
      countCompetent: competent.length,
      passRate: countGraded > 0 ? Math.round((competent.length / countGraded) * 100) : 0,
    };
  }, [subjectRankings]);

  // Top 3 Podium Students
  const topThreePodium = React.useMemo(() => {
    const gradedOnly = subjectRankings.filter((i) => i.score !== null);
    const sortedDesc = [...gradedOnly].sort((a, b) => b.score! - a.score!);
    return sortedDesc.slice(0, 3);
  }, [subjectRankings]);

  // Quick action from ranking table to grading form
  const handleSelectStudentForGrading = (st: Student) => {
    setSelectedClass(st.kelas);
    const classTps = tpTemplates.filter(
      (t: any) => String(t.kelas || "").trim() === String(st.kelas).trim()
    );
    handleStudentSelect(st, grades, classTps);
    setActiveViewTab("grades");
  };

  // Print official ranking report
  const handlePrintRankingReport = () => {
    const printWin = window.open("", "_blank");
    if (!printWin) {
      alert("Pop-up diblokir browser. Izinkan pop-up untuk mencetak laporan.");
      return;
    }

    const items = filteredSubjectRankings;
    const dateStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Peringkat & Analisis Bimbingan - ${rankingSubject}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm 15mm 15mm; }
            body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; margin: 0; padding: 0; }
            h1, h2, h3, p { margin: 0; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
            .header h1 { font-size: 14pt; text-transform: uppercase; font-weight: bold; }
            .header h2 { font-size: 12pt; text-transform: uppercase; margin-top: 4px; }
            .header p { font-size: 10pt; color: #333; margin-top: 2px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 10pt; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #000; padding: 6px 8px; font-size: 9.5pt; }
            th { background-color: #f1f5f9; text-align: center; font-weight: bold; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .status-bimbingan { font-weight: bold; color: #b91c1c; }
            .status-tuntas { color: #15803d; }
            .footer { margin-top: 24px; display: flex; justify-content: flex-end; }
            .sig-box { width: 220px; text-align: center; font-size: 10.5pt; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SMP ISLAM SMART</h1>
            <h2>Laporan Peringkat Siswa & Analisis Bimbingan Belajar</h2>
            <p>Mata Pelajaran: <strong>${rankingSubject}</strong> | Rombel: <strong>${rankingClass === "all" ? "Semua Kelas" : `Kelas ${rankingClass}`}</strong></p>
          </div>
          <div class="meta">
            <div>Guru Pengampu: <strong>${user.name}</strong></div>
            <div>Standar KKM: <strong>${kkmThreshold}</strong> | Tanggal: <strong>${dateStr}</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">No</th>
                <th style="width: 50px;">Rank</th>
                <th>Nama Siswa</th>
                <th style="width: 60px;">Kelas</th>
                <th style="width: 60px;">Nilai</th>
                <th style="width: 70px;">Persentase</th>
                <th style="width: 60px;">Predikat</th>
                <th>Status Pembelajaran / Bimbingan</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (it, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td class="text-center">${it.rank ? `#${it.rank}` : "-"}</td>
                  <td><strong>${it.student.name}</strong><br><small style="color: #555;">NISN: ${it.student.nisn || "-"}</small></td>
                  <td class="text-center">Kelas ${it.student.kelas}</td>
                  <td class="text-center"><strong>${it.score !== null ? it.score : "-"}</strong></td>
                  <td class="text-center">${it.percentage !== null ? `${it.percentage}%` : "-"}</td>
                  <td class="text-center">${it.predikat}</td>
                  <td>
                    ${
                      it.guidanceStatus === "needs_guidance"
                        ? '<span class="status-bimbingan">⚠️ Perlu Bimbingan Lebih</span>'
                        : it.guidanceStatus === "advanced"
                        ? '<span class="status-tuntas">🌟 Sangat Baik (Pengayaan)</span>'
                        : it.guidanceStatus === "competent"
                        ? '<span class="status-tuntas">✅ Tuntas</span>'
                        : "<span>Belum Dinilai</span>"
                    }
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="footer">
            <div class="sig-box">
              <p>Pangkalpinang, ${dateStr}</p>
              <p style="margin-top: 4px; margin-bottom: 50px;">Guru Mata Pelajaran,</p>
              <p><strong>( ${user.name} )</strong></p>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.focus(); window.print(); }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div
      className={
        activeViewTab === "ranking"
          ? "grid grid-cols-1 gap-4"
          : "grid grid-cols-1 lg:grid-cols-3 gap-4"
      }
      id="teacher-panel"
    >
      {/* Selector sidebar (Classes and Students list) - hidden in ranking mode */}
      {activeViewTab !== "ranking" && (
        <div className="lg:col-span-1 bg-[#0f172a] rounded-xl border-2 border-[#253e66] shadow-md p-4 h-fit space-y-4">
          <div>
            <label className="block text-xs font-black text-white uppercase tracking-wider mb-2">
              PILIH KELAS:
            </label>
            <div className="grid grid-cols-3 gap-2" id="class-button-selectors">
              {["7", "8", "9"].map((cls) => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`py-2 px-3 rounded-lg text-xs font-black transition cursor-pointer text-center ${
                    selectedClass === cls
                      ? "bg-emerald-600 text-white border-2 border-emerald-300 shadow-md ring-2 ring-emerald-500/30"
                      : "bg-[#142036] text-white hover:bg-[#1c2e4e] hover:text-white border-2 border-[#2c4570]"
                  }`}
                >
                  Kelas {cls}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t-2 border-[#203254] pt-3.5 flex items-center justify-between">
            <h3 className="font-black text-xs uppercase tracking-wider text-white">
              DAFTAR SISWA ({classStudents.length})
            </h3>
            <span className="text-xs font-black bg-emerald-900 text-emerald-100 px-3 py-1 rounded-lg border-2 border-emerald-400 shadow-xs">
              Terisi: {filledCount}/{classStudents.length}
            </span>
          </div>

          <div
            className="space-y-2 max-h-[380px] overflow-y-auto pr-1"
            id="student-vertical-list"
          >
            {loading ? (
              <div className="p-6 text-center text-xs text-white font-bold italic bg-[#142036] rounded-xl border border-[#203254]">
                Memuat daftar siswa...
              </div>
            ) : classStudents.length === 0 ? (
              <p className="text-xs text-slate-300 font-bold italic text-center py-6 bg-[#142036] rounded-xl border border-[#203254]">
                Belum ada siswa di kelas ini.
              </p>
            ) : (
              classStudents.map((s) => {
                const isFilled =
                  Array.isArray(grades) &&
                  grades.some(
                    (g) =>
                      g && g.studentId === s.id && normalizeSubject(g.subject) === normalizeSubject(user.subject),
                  );
                const isSelected = selectedStudent?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleStudentSelect(s)}
                    className={`w-full p-3 rounded-xl text-left text-xs transition flex items-center justify-between gap-2 border-2 cursor-pointer ${
                      isSelected
                        ? "bg-[#0b291d] border-emerald-400 font-black text-white shadow-md ring-2 ring-emerald-400/40"
                        : "bg-[#142036] border-[#294269] text-white hover:bg-[#1a2d4b] hover:border-slate-300 font-bold"
                    }`}
                  >
                    <span className="truncate text-white font-bold">{s.name || "N/A"}</span>
                    {isFilled ? (
                      <span className="bg-emerald-600 text-white text-[11px] font-black px-2.5 py-1 rounded shadow-xs shrink-0 border border-emerald-300">
                        Selesai ✓
                      </span>
                    ) : (
                      <span className="bg-slate-700 text-slate-100 text-[11px] font-extrabold px-2.5 py-1 rounded border border-slate-500 shrink-0">
                        Kosong
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main interactive panel */}
      <div
        className={
          activeViewTab === "ranking"
            ? "w-full bg-[#0f172a] rounded-xl border-2 border-[#253e66] shadow-lg p-5 sm:p-6 space-y-5"
            : "lg:col-span-2 bg-[#0f172a] rounded-xl border-2 border-[#253e66] shadow-lg p-5 sm:p-6 space-y-5"
        }
      >
        {/* Navigation Tab Headers */}
        <div
          className="flex border-b-2 border-[#203254] gap-2 pb-1 flex-wrap"
          id="teacher-view-tabs"
        >
          <button
            onClick={() => setActiveViewTab("grades")}
            className={`py-2.5 px-4 uppercase tracking-wider text-xs font-black transition flex items-center gap-2 cursor-pointer rounded-t-lg ${
              activeViewTab === "grades"
                ? "bg-emerald-600 text-white border-b-4 border-emerald-300 shadow-md"
                : "bg-[#142036] text-white hover:text-white hover:bg-[#1c2e4e] border-2 border-[#2b4168]"
            }`}
          >
            <ClipboardPlus className="w-4 h-4 text-white" /> Pengisian Nilai & Deskripsi
          </button>
          <button
            onClick={() => setActiveViewTab("tps")}
            className={`py-2.5 px-4 uppercase tracking-wider text-xs font-black transition flex items-center gap-2 cursor-pointer rounded-t-lg ${
              activeViewTab === "tps"
                ? "bg-emerald-600 text-white border-b-4 border-emerald-300 shadow-md"
                : "bg-[#142036] text-white hover:text-white hover:bg-[#1c2e4e] border-2 border-[#2b4168]"
            }`}
          >
            <BookOpen className="w-4 h-4 text-white" /> Kelola TP ({user.subject})
          </button>
          <button
            onClick={() => setActiveViewTab("ranking")}
            className={`py-2.5 px-4 uppercase tracking-wider text-xs font-black transition flex items-center gap-2 cursor-pointer rounded-t-lg ${
              activeViewTab === "ranking"
                ? "bg-amber-600 text-white border-b-4 border-amber-300 shadow-md"
                : "bg-[#142036] text-amber-300 hover:text-white hover:bg-[#1c2e4e] border-2 border-amber-500/40"
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-300" /> Peringkat & Analisis Bimbingan ({user.subject})
          </button>
        </div>

        <div className="pb-3 border-b-2 border-[#203254] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs uppercase tracking-wider font-black shadow-xs border border-emerald-300">
              Mapel {user.subject}
            </span>
            <span className="text-xs text-slate-200 font-bold">
              Pengampu: <span className="text-white font-black">{user.name}</span>
            </span>
          </div>
          <button
            onClick={fetchData}
            className="p-2 px-3.5 bg-[#142036] hover:bg-[#1c2e4e] border-2 border-[#2b4168] text-xs font-black rounded-lg transition text-white cursor-pointer flex items-center gap-2 shadow-xs self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Sinkronkan DB
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/90 text-white text-xs font-black rounded-xl border-2 border-red-500 flex items-start gap-2.5 shadow-md">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-950/90 text-white text-xs font-black rounded-xl border-2 border-emerald-400 flex items-center gap-2.5 animate-fade-in shadow-md">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* INPUT GRADING TAB */}
        {activeViewTab === "grades" &&
          (selectedStudent ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="p-4 bg-[#142036] border-2 border-[#294269] rounded-xl flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg border-2 border-emerald-300 shadow-md shrink-0">
                  {selectedStudent.name?.charAt(0) || "?"}
                </div>
                <div>
                  <h3 className="font-black text-base text-white uppercase tracking-wide">
                    {selectedStudent.name || "N/A"}
                  </h3>
                  <p className="text-xs text-slate-200 font-bold mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>NISN: <span className="font-mono text-emerald-300 font-black">{selectedStudent.nisn || "-"}</span></span>
                    <span>•</span>
                    <span>Kelas: <span className="font-mono text-amber-300 font-black">{selectedStudent.kelas || "-"}</span></span>
                  </p>
                </div>
              </div>

              {/* THREE-GRADE EVALUATION CRITERIA + NUMERIC SCORE */}
              <div className="bg-[#142036] border-2 border-[#294269] p-4.5 rounded-xl space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b-2 border-[#203254]">
                  <div>
                    <span className="text-xs font-black text-white uppercase tracking-wider block mb-1.5">
                      Input Nilai & Kriteria Evaluasi
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-black px-3 py-1 rounded-lg bg-emerald-950 border-2 border-emerald-400 text-emerald-200 shadow-xs">
                        &gt; 91 = A (Sangat Baik)
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-black px-3 py-1 rounded-lg bg-blue-950 border-2 border-blue-400 text-blue-200 shadow-xs">
                        80 - 91 = B (Baik)
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-black px-3 py-1 rounded-lg bg-amber-950 border-2 border-amber-400 text-amber-200 shadow-xs">
                        &le; 79 = C (Cukup)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3.5 self-end sm:self-auto">
                    <div className="text-right">
                      <label className="text-xs font-black text-white block">
                        Nilai Akhir:
                      </label>
                      <span
                        className={`text-xs font-black font-mono block ${
                          score !== ""
                            ? Number(score) > 91
                              ? "text-emerald-300"
                              : Number(score) >= 80
                              ? "text-blue-300"
                              : "text-amber-300"
                            : "text-slate-300"
                        }`}
                      >
                        {score !== "" ? (
                          Number(score) > 91
                            ? "Predikat A"
                            : Number(score) >= 80
                            ? "Predikat B"
                            : "Predikat C"
                        ) : (
                          "Belum diisi"
                        )}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={score}
                      onChange={(e) =>
                        handleScoreChange(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="0"
                      className="w-24 p-2.5 bg-[#050a12] border-3 border-emerald-400 rounded-xl text-center text-2xl font-black text-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-400/50 shadow-inner"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-black text-white uppercase tracking-wider mb-1.5">
                      Grade Usaha
                    </label>
                    <select
                      value={usaha}
                      onChange={(e) => setUsaha(e.target.value)}
                      className="w-full p-2.5 bg-[#060b14] border-2 border-[#3d5a8a] rounded-xl text-xs sm:text-sm font-black text-white focus:outline-none focus:border-emerald-400 shadow-xs"
                    >
                      <option value="A">A (Sangat Baik)</option>
                      <option value="B">B (Baik)</option>
                      <option value="C">C (Cukup)</option>
                      <option value="D">D (Kurang)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-white uppercase tracking-wider mb-1.5">
                      Grade Proses
                    </label>
                    <select
                      value={proses}
                      onChange={(e) => setProses(e.target.value)}
                      className="w-full p-2.5 bg-[#060b14] border-2 border-[#3d5a8a] rounded-xl text-xs sm:text-sm font-black text-white focus:outline-none focus:border-emerald-400 shadow-xs"
                    >
                      <option value="A">A (Sangat Baik)</option>
                      <option value="B">B (Baik)</option>
                      <option value="C">C (Cukup)</option>
                      <option value="D">D (Kurang)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-white uppercase tracking-wider mb-1.5">
                      Grade Capaian
                    </label>
                    <select
                      value={capaian}
                      onChange={(e) => setCapaian(e.target.value)}
                      className="w-full p-2.5 bg-[#060b14] border-2 border-[#3d5a8a] rounded-xl text-xs sm:text-sm font-black text-white focus:outline-none focus:border-emerald-400 shadow-xs"
                    >
                      <option value="A">A (Sangat Baik)</option>
                      <option value="B">B (Baik)</option>
                      <option value="C">C (Cukup)</option>
                      <option value="D">D (Kurang)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* TP Objectives Checklist (Tujuan Pembelajaran) */}
              <div className="border-t-2 border-[#203254] pt-4.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-black text-xs sm:text-sm text-white uppercase tracking-wider">
                      Tujuan Pembelajaran (TP) untuk Anak Ini
                    </h4>
                    <p className="text-xs text-slate-200 font-bold mt-0.5 leading-relaxed">
                      Centang jika anak sudah optimal (Sangat Baik). Un-centang jika masih butuh bimbingan.
                    </p>
                  </div>
                  {Array.isArray(tpTemplates) && tpTemplates.length > 0 && (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setAllTpStatus(true)}
                        className="px-3.5 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-300 rounded-lg transition cursor-pointer shadow-md"
                      >
                        Semua Optimal ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllTpStatus(false)}
                        className="px-3.5 py-2 text-xs font-black bg-rose-600 hover:bg-rose-500 text-white border-2 border-rose-300 rounded-lg transition cursor-pointer shadow-md"
                      >
                        Semua Butuh Bimbingan ⚠️
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className="space-y-3 max-h-72 overflow-y-auto pr-1"
                  id="tp-grading-list"
                >
                  {!Array.isArray(tpTemplates) || tpTemplates.length === 0 ? (
                    <div className="p-6 bg-[#142036] text-white text-xs rounded-xl border-2 border-dashed border-[#294269] text-center space-y-2">
                      <p className="font-black text-white text-sm">
                        Belum ada template Tujuan Pembelajaran (TP) Kelas {selectedClass}
                      </p>
                      <p className="text-xs text-slate-200 font-bold">
                        Anda dapat menambahkan TP melalui tab <strong>Kelola TP</strong> di atas, atau mengetikkan narasi deskripsi raport secara manual di bawah.
                      </p>
                    </div>
                  ) : (
                    tpTemplates
                      .filter((tp) => tp && tp.id)
                      .map((tp) => {
                        const isChecked =
                          tpAchievements && tpAchievements[tp.id] !== false;
                        return (
                          <div
                            key={tp.id}
                            onClick={() => toggleTp(tp.id)}
                            className={`p-3.5 rounded-xl border-2 text-xs transition cursor-pointer select-none flex items-start gap-3.5 shadow-sm ${
                              isChecked
                                ? "bg-[#0b291d] border-emerald-400 text-white hover:bg-[#0f3426]"
                                : "bg-[#330f16] border-rose-400 text-white hover:bg-[#42141d]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleTp(tp.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer mt-0.5 accent-emerald-500 shrink-0"
                            />
                            <div className="flex-1 space-y-2">
                              <p className="text-white leading-relaxed font-black text-xs sm:text-sm">
                                {tp.text}
                              </p>
                              <div>
                                <span
                                  className={`text-[11px] font-black tracking-wide inline-flex items-center gap-1 uppercase px-3 py-1 rounded-md shadow-xs ${
                                    isChecked
                                      ? "bg-emerald-600 text-white border border-emerald-300"
                                      : "bg-rose-600 text-white border border-rose-300"
                                  }`}
                                >
                                  {isChecked
                                    ? "Sudah Optimal ✓"
                                    : "Perlu Bimbingan / Belum Optimal ⚠️"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* NARRATIVE DESCRIPTION PREVIEW / MANUAL INPUT */}
              <div className="border-t-2 border-[#203254] pt-4.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-black text-xs sm:text-sm text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Narasi Deskripsi Raport</span>
                      {tpTemplates.length > 0 && (
                        <span className="px-2.5 py-0.5 bg-emerald-900 text-emerald-200 border border-emerald-400 rounded text-[10px] font-black">
                          otomatis memuat nama siswa
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-200 font-bold mt-0.5 leading-relaxed">
                      {tpTemplates.length > 0
                        ? `Deskripsi otomatis langsung disesuaikan saat ceklist TP diubah (termasuk nama ananda ${selectedStudent.name}). Tetap bisa diedit manual langsung di kolom ini.`
                        : `Ketik narasi deskripsi capaian raport ananda ${selectedStudent.name} secara manual di bawah (dapat disimpan tanpa TP).`}
                    </p>
                  </div>
                  {tpTemplates.length > 0 && (
                    <button
                      type="button"
                      onClick={handleRegenerateFromTp}
                      title="Klik untuk menyinkronkan atau menghasilkan ulang narasi deskripsi dari ceklist TP saat ini"
                      className="px-3.5 py-1.5 text-xs font-black bg-[#142036] hover:bg-[#1c2e4e] text-emerald-300 rounded-lg border-2 border-emerald-400 flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Sinkronkan dari TP</span>
                    </button>
                  )}
                </div>

                <textarea
                  value={customDescription}
                  onChange={(e) => {
                    setCustomDescription(e.target.value);
                    setIsCustomDescActive(true);
                  }}
                  rows={4}
                  placeholder={
                    selectedStudent
                      ? `Ketik deskripsi capaian rapor untuk ananda ${selectedStudent.name} di sini...`
                      : "Ketik deskripsi capaian nilai rapor secara manual di sini..."
                  }
                  className="w-full p-4 border-2 border-[#3d5a8a] rounded-xl text-xs sm:text-sm bg-[#060b14] text-white font-bold leading-relaxed placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40 shadow-inner"
                />
              </div>

              {/* Save trigger */}
              <div className="border-t-2 border-[#203254] pt-4.5 text-right">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-black flex items-center gap-2 ml-auto shadow-lg border-2 border-emerald-300 transition cursor-pointer disabled:opacity-50"
                  id="submit-grades-button"
                >
                  {saveLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Simpan Nilai & Deskripsi
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-16 text-center text-white font-black text-xs bg-[#142036] rounded-xl border-2 border-dashed border-[#294269]">
              Pilihlah salah satu siswa di bar sebelah kiri untuk memulai pengisian rapor.
            </div>
          ))}

        {/* LOCAL TP MANAGEMENT TAB */}
        {activeViewTab === "tps" && (
          <div
            className="space-y-5 animate-fade-in"
            id="teacher-tplocal-management"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b-2 border-[#203254] pb-3.5">
              <div>
                <h3 className="font-black text-sm text-white uppercase flex items-center gap-2">
                  <span>Kelola Tujuan Pembelajaran (TP) - {user.subject}</span>
                  <span className="px-3 py-1 bg-emerald-600 text-white rounded-md text-xs font-black shadow-xs border border-emerald-300">
                    Kelas {selectedClass}
                  </span>
                </h3>
                <p className="text-xs text-slate-200 font-bold mt-1 leading-relaxed">
                  Tujuan pembelajaran disesuaikan spesifik untuk tingkat Kelas {selectedClass}. Anda dapat <strong>mengganti / mengedit</strong> teks TP atau <strong>menambah</strong> TP baru di bawah.
                </p>
              </div>
            </div>

            {/* Form to add custom learning objective directly by the teacher */}
            <form
              onSubmit={handleAddLocalTp}
              className="p-4.5 bg-[#142036] rounded-xl border-2 border-[#294269] flex flex-col sm:flex-row gap-3 items-end shadow-sm"
            >
              <div className="flex-1 w-full">
                <label className="block text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span>Tambah Tujuan Pembelajaran Baru:</span>
                  <span className="text-emerald-300 font-black">(Tingkat Kelas {selectedClass})</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTpText}
                  onChange={(e) => setNewTpText(e.target.value)}
                  placeholder={`Contoh: Menguasai kompetensi dasar materi kelas ${selectedClass}...`}
                  className="w-full p-3 bg-[#060b14] border-2 border-[#3d5a8a] rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 font-bold focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
              </div>
              <button
                type="submit"
                disabled={tpSubmitLoading || !newTpText.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-3 rounded-lg cursor-pointer transition flex items-center justify-center gap-2 text-xs font-black shadow-md border-2 border-emerald-300 shrink-0 w-full sm:w-auto h-[46px]"
                title="Tambahkan TP"
              >
                {tpSubmitLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Tambah TP</span>
                  </>
                )}
              </button>
            </form>

            {/* List of current objectives for this subject with edit and delete buttons */}
            <div className="border-2 border-[#203254] rounded-xl overflow-hidden bg-[#0f172a] shadow-sm">
              <div className="bg-[#142036] px-4.5 py-3 border-b-2 border-[#203254] flex items-center justify-between">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Daftar TP Kelas {selectedClass}</span>
                  <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded text-xs font-mono font-black border border-emerald-300">
                    {!Array.isArray(tpTemplates) ? 0 : tpTemplates.length} TP
                  </span>
                </span>
                <span className="text-xs text-slate-200 font-bold">
                  Khusus Rombel {selectedClass}
                </span>
              </div>
              <div className="divide-y-2 border-[#203254] max-h-[380px] overflow-y-auto">
                {!Array.isArray(tpTemplates) || tpTemplates.length === 0 ? (
                  <p className="p-8 text-center text-xs text-white font-black italic bg-[#142036]">
                    Belum ada Tujuan Pembelajaran untuk Kelas {selectedClass}. Silakan tambahkan pada form di atas.
                  </p>
                ) : (
                  tpTemplates
                    .filter((tp) => tp && tp.id)
                    .map((tp, idx) => (
                      <div
                        key={tp.id}
                        className="p-4 flex flex-col gap-3 bg-[#142036] hover:bg-[#1a2d4b] transition border-b border-[#203254] last:border-b-0"
                      >
                        {editingTpId === tp.id ? (
                          /* INLINE EDIT / REPLACE FORM */
                          <form onSubmit={handleSaveEditTp} className="space-y-3 bg-[#0b291d] p-3.5 rounded-xl border-2 border-emerald-400">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-emerald-200 uppercase">
                                Ganti / Edit Teks TP #{idx + 1}
                              </span>
                              <span className="text-[10px] font-bold text-slate-300 font-mono">
                                ID: {tp.id}
                              </span>
                            </div>
                            <textarea
                              rows={2}
                              required
                              value={editingTpText}
                              onChange={(e) => setEditingTpText(e.target.value)}
                              className="w-full p-2.5 border-2 border-emerald-400 rounded-lg text-xs sm:text-sm bg-[#060b14] text-white font-bold leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-400"
                              placeholder="Masukkan teks tujuan pembelajaran yang baru..."
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={cancelEditTp}
                                className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white font-black text-xs rounded-lg transition cursor-pointer flex items-center gap-1 border border-slate-500"
                              >
                                <X className="w-3.5 h-3.5" /> Batal
                              </button>
                              <button
                                type="submit"
                                disabled={editTpLoading || !editingTpText.trim()}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs border-2 border-emerald-300"
                              >
                                {editTpLoading ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                  <>
                                    <Save className="w-3.5 h-3.5" /> Simpan Perubahan TP
                                  </>
                                )}
                              </button>
                            </div>
                          </form>
                        ) : (
                          /* STANDARD TP DISPLAY ROW */
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3">
                              <span className="text-xs font-mono font-black text-emerald-400 mt-0.5">
                                {idx + 1}.
                              </span>
                              <div className="space-y-1.5">
                                <p className="text-xs sm:text-sm text-white font-black leading-relaxed">
                                  {tp.text}
                                </p>
                                <div>
                                  <span className="inline-block text-[10px] font-black px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-200 border border-emerald-400 font-mono">
                                    Kelas {tp.kelas || selectedClass}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEditTp(tp)}
                                className="text-white bg-blue-600 hover:bg-blue-500 border-2 border-blue-300 px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Ganti / Edit Teks TP"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Ganti</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLocalTp(tp.id)}
                                className="text-white bg-rose-600 hover:bg-rose-500 border-2 border-rose-300 px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Hapus TP Permanen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* RANKING & GUIDANCE ANALYSIS TAB */}
        {activeViewTab === "ranking" && (
          <div className="space-y-6 animate-fade-in" id="teacher-ranking-analysis">
            {/* Top Toolbar & Filter Header */}
            <div className="bg-[#142036] border-2 border-[#294269] rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#203254]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-amber-300 shadow-md shrink-0">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                        Peringkat Siswa & Analisis Bimbingan
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase font-mono">
                        {rankingSubject}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Peringkat nilai tertinggi ke terendah, persentase penguasaan kompetensi, serta pemetaan siswa yang memerlukan bimbingan lebih
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
                  <button
                    type="button"
                    onClick={handlePrintRankingReport}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-2 cursor-pointer transition shadow-md border border-blue-400/50"
                    title="Cetak Lembar Laporan Peringkat & Daftar Bimbingan Siswa"
                  >
                    <Printer className="w-4 h-4 text-white" />
                    <span>Cetak Laporan Peringkat</span>
                  </button>
                  <button
                    type="button"
                    onClick={fetchData}
                    className="px-3.5 py-2 rounded-xl bg-[#0f172a] hover:bg-[#1a2844] text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition border border-[#2b4168]"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Segarkan Data</span>
                  </button>
                </div>
              </div>

              {/* Filtering Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1">
                {/* 1. Subject Selector */}
                <div className="lg:col-span-4 space-y-1">
                  <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider block">
                    Pilih Mata Pelajaran:
                  </label>
                  <div className="relative">
                    <select
                      value={rankingSubject}
                      onChange={(e) => setRankingSubject(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#090f1d] border border-[#2b4168] rounded-xl text-xs font-black text-white focus:outline-none focus:border-amber-400 cursor-pointer appearance-none pr-8"
                    >
                      {availableSubjects.map((sub) => (
                        <option key={sub} value={sub} className="bg-[#0f172a] text-white">
                          {sub} {sub === user.subject ? "(Mapel Anda)" : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 2. Class Filter */}
                <div className="lg:col-span-3 space-y-1">
                  <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider block">
                    Tingkat Kelas:
                  </label>
                  <div className="grid grid-cols-4 gap-1 bg-[#090f1d] p-1 rounded-xl border border-[#2b4168]">
                    {[
                      { id: "all", label: "Semua" },
                      { id: "7", label: "Kls 7" },
                      { id: "8", label: "Kls 8" },
                      { id: "9", label: "Kls 9" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setRankingClass(c.id)}
                        className={`py-1 rounded-lg text-xs font-black transition cursor-pointer text-center ${
                          rankingClass === c.id
                            ? "bg-amber-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white hover:bg-[#142036]"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Sort Order Toggle */}
                <div className="lg:col-span-3 space-y-1">
                  <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider block">
                    Urutan Nilai:
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-[#090f1d] p-1 rounded-xl border border-[#2b4168]">
                    <button
                      type="button"
                      onClick={() => setRankingSort("desc")}
                      className={`py-1 px-2 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                        rankingSort === "desc"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white hover:bg-[#142036]"
                      }`}
                      title="Urutkan dari nilai tertinggi ke terendah"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Tertinggi ↓</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRankingSort("asc")}
                      className={`py-1 px-2 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                        rankingSort === "asc"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white hover:bg-[#142036]"
                      }`}
                      title="Urutkan dari nilai terendah (siswa butuh bimbingan teratas)"
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>Terendah ↑</span>
                    </button>
                  </div>
                </div>

                {/* 4. KKM Threshold */}
                <div className="lg:col-span-2 space-y-1">
                  <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider block flex items-center justify-between">
                    <span>Standar KKM:</span>
                    <span className="text-[10px] text-amber-300 font-mono font-bold">{kkmThreshold}</span>
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={kkmThreshold}
                    onChange={(e) => setKkmThreshold(Number(e.target.value) || 75)}
                    className="w-full px-3 py-1.5 bg-[#090f1d] border border-[#2b4168] rounded-xl text-xs font-black text-center text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Search & Guidance Filter Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-400">Filter Tampilan:</span>
                  <button
                    type="button"
                    onClick={() => setRankingFilterStatus("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      rankingFilterStatus === "all"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-[#090f1d] text-slate-300 hover:text-white border border-[#2b4168]"
                    }`}
                  >
                    Semua Siswa ({rankingStats.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRankingFilterStatus("bimbingan")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      rankingFilterStatus === "bimbingan"
                        ? "bg-red-600 text-white shadow-xs"
                        : "bg-red-950/40 text-red-300 hover:text-white border border-red-500/50"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span>⚠️ Perlu Bimbingan Lebih ({rankingStats.countNeedsGuidance})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRankingFilterStatus("tuntas")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      rankingFilterStatus === "tuntas"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-emerald-950/40 text-emerald-300 hover:text-white border border-emerald-500/50"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tuntas ({rankingStats.countCompetent})</span>
                  </button>
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={rankingSearch}
                    onChange={(e) => setRankingSearch(e.target.value)}
                    placeholder="Cari nama santri / NISN..."
                    className="w-full pl-8 pr-3 py-1.5 bg-[#090f1d] border border-[#2b4168] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  {rankingSearch && (
                    <button
                      type="button"
                      onClick={() => setRankingSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* KPI STAT SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Total Graded */}
              <div className="bg-[#142036] border-2 border-[#294269] rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block font-mono">
                    Siswa Dinilai
                  </span>
                  <div className="text-xl font-black text-white font-mono">
                    {rankingStats.countGraded} <span className="text-xs text-slate-400 font-normal">/ {rankingStats.total} Siswa</span>
                  </div>
                  <span className="text-[10px] text-blue-300 font-bold">
                    {rankingStats.total > 0 ? Math.round((rankingStats.countGraded / rankingStats.total) * 100) : 0}% terinput
                  </span>
                </div>
              </div>

              {/* Card 2: Average & Highest Score */}
              <div className="bg-[#142036] border-2 border-[#294269] rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                  <Percent className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block font-mono">
                    Rata-Rata Nilai Mapel
                  </span>
                  <div className="text-xl font-black text-amber-300 font-mono">
                    {rankingStats.avgScore || "-"}
                  </div>
                  <span className="text-[10px] text-slate-300 font-bold">
                    Tertinggi: <strong className="text-emerald-300">{rankingStats.maxScore || 0}</strong> • Terendah: <strong className="text-rose-300">{rankingStats.minScore || 0}</strong>
                  </span>
                </div>
              </div>

              {/* Card 3: Competent Students */}
              <div className="bg-[#142036] border-2 border-[#294269] rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block font-mono">
                    Siswa Tuntas (&ge; {kkmThreshold})
                  </span>
                  <div className="text-xl font-black text-emerald-300 font-mono">
                    {rankingStats.countCompetent} <span className="text-xs text-slate-400 font-normal">Siswa</span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-bold">
                    Tingkat Kelulusan: {rankingStats.passRate}%
                  </span>
                </div>
              </div>

              {/* Card 4: Special Guidance Needed Alert */}
              <div className={`rounded-2xl p-4 shadow-sm flex items-center gap-3.5 border-2 transition ${
                rankingStats.countNeedsGuidance > 0
                  ? "bg-gradient-to-r from-red-950/60 to-[#142036] border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  : "bg-[#142036] border-[#294269]"
              }`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  rankingStats.countNeedsGuidance > 0
                    ? "bg-red-500/20 border border-red-400 text-red-300 animate-pulse"
                    : "bg-slate-700/30 text-slate-400"
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block font-mono">
                    Butuh Bimbingan Lebih
                  </span>
                  <div className={`text-xl font-black font-mono ${rankingStats.countNeedsGuidance > 0 ? "text-red-300" : "text-slate-300"}`}>
                    {rankingStats.countNeedsGuidance} <span className="text-xs text-slate-400 font-normal">Siswa</span>
                  </div>
                  <span className={`text-[10px] font-bold ${rankingStats.countNeedsGuidance > 0 ? "text-red-400 font-black" : "text-slate-400"}`}>
                    {rankingStats.countNeedsGuidance > 0 ? "⚠️ Perlu Remedial / Intervensi" : "Seluruh siswa telah tuntas"}
                  </span>
                </div>
              </div>
            </div>

            {/* TOP 3 PODIUM FOR SUBJECT (when descending and unfiltered) */}
            {rankingSort === "desc" && rankingFilterStatus === "all" && !rankingSearch.trim() && topThreePodium.length > 0 && (
              <div className="bg-[#142036] border-2 border-[#294269] rounded-2xl p-5 shadow-md space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#203254]">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>3 Besar Peraih Nilai Tertinggi - {rankingSubject}</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {rankingClass === "all" ? "Seluruh Rombel" : `Tingkat Kelas ${rankingClass}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                  {/* Juara 2 (Silver) */}
                  {topThreePodium[1] && (() => {
                    const isTie1 = topThreePodium[1].score === topThreePodium[0].score;
                    return (
                      <div className="order-2 md:order-1 rounded-xl bg-[#090f1d] border border-slate-500/50 p-4 flex flex-col justify-between relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-400/20 border border-slate-300/40 text-slate-200 text-xs font-black">
                            {isTie1 ? "🥇 Juara 1 (Bersama)" : "🥈 Juara 2"}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] font-mono font-bold">
                            Kelas {topThreePodium[1].student.kelas}
                          </span>
                        </div>
                        <div>
                          <h5 className="text-sm font-black text-white truncate" title={topThreePodium[1].student.name}>
                            {topThreePodium[1].student.name}
                          </h5>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            NISN: {topThreePodium[1].student.nisn || "-"}
                          </p>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-[#203254] flex items-center justify-between">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono block">Nilai Mapel</span>
                            <span className="text-lg font-black text-slate-200 font-mono">{topThreePodium[1].score}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono block">Persentase</span>
                            <span className="text-base font-black text-cyan-300 font-mono">{topThreePodium[1].percentage}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Juara 1 (Gold - Center & Elevated) */}
                  {topThreePodium[0] && (
                    <div className="order-1 md:order-2 rounded-xl bg-gradient-to-b from-amber-950/40 via-[#0e172a] to-[#090f1d] border-2 border-amber-400/70 p-4.5 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col justify-between relative overflow-hidden">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-black shadow-xs">
                          🥇 Juara 1 (Terbaik)
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-mono font-bold">
                          Kelas {topThreePodium[0].student.kelas}
                        </span>
                      </div>
                      <div>
                        <h5 className="text-base font-black text-amber-200 truncate" title={topThreePodium[0].student.name}>
                          {topThreePodium[0].student.name}
                        </h5>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          NISN: {topThreePodium[0].student.nisn || "-"}
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-amber-500/30 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-amber-300 font-mono block font-bold">Nilai Mapel</span>
                          <span className="text-2xl font-black text-amber-300 font-mono">{topThreePodium[0].score}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase tracking-wider text-amber-300 font-mono block font-bold">Persentase</span>
                          <span className="text-xl font-black text-emerald-300 font-mono">{topThreePodium[0].percentage}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Juara 3 (Bronze) */}
                  {topThreePodium[2] && (() => {
                    const isTie2 = topThreePodium[2].score === topThreePodium[1].score;
                    return (
                      <div className="order-3 md:order-3 rounded-xl bg-[#090f1d] border border-amber-700/50 p-4 flex flex-col justify-between relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-700/20 border border-amber-600/40 text-amber-400 text-xs font-black">
                            {isTie2 ? "🥈 Juara 2 (Bersama)" : "🥉 Juara 3"}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] font-mono font-bold">
                            Kelas {topThreePodium[2].student.kelas}
                          </span>
                        </div>
                        <div>
                          <h5 className="text-sm font-black text-white truncate" title={topThreePodium[2].student.name}>
                            {topThreePodium[2].student.name}
                          </h5>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            NISN: {topThreePodium[2].student.nisn || "-"}
                          </p>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-[#203254] flex items-center justify-between">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono block">Nilai Mapel</span>
                            <span className="text-lg font-black text-amber-300/90 font-mono">{topThreePodium[2].score}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono block">Persentase</span>
                            <span className="text-base font-black text-cyan-300 font-mono">{topThreePodium[2].percentage}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* FULL RANKING & GUIDANCE TABLE */}
            <div className="bg-[#142036] border-2 border-[#294269] rounded-2xl overflow-hidden shadow-lg">
              <div className="p-4 bg-[#0c1424] border-b border-[#203254] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Daftar Urutan Nilai & Status Bimbingan Santri ({filteredSubjectRankings.length})
                  </h4>
                  {rankingFilterStatus === "bimbingan" && (
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-black uppercase">
                      Hanya Menampilkan Anak Butuh Bimbingan
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  Klik <strong>"Bimbing / Input Nilai"</strong> untuk langsung mengedit nilai dan deskripsi siswa
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#090f1d] text-slate-300 uppercase tracking-wider font-mono text-[10px] border-b border-[#203254]">
                    <tr>
                      <th className="py-3 px-3.5 text-center w-14">Rank</th>
                      <th className="py-3 px-4 min-w-[200px]">Nama Santri / NISN</th>
                      <th className="py-3 px-3 text-center w-20">Kelas</th>
                      <th className="py-3 px-4 text-center w-24">Nilai</th>
                      <th className="py-3 px-4 text-left min-w-[160px]">Persentase Nilai</th>
                      <th className="py-3 px-3 text-center w-20">Predikat</th>
                      <th className="py-3 px-4 min-w-[220px]">Status Pembelajaran & Bimbingan</th>
                      <th className="py-3 px-3.5 text-center w-36">Aksi Guru</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#203254]/70">
                    {filteredSubjectRankings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                          <AlertTriangle className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                          Tidak ada data santri yang sesuai dengan filter ini.
                        </td>
                      </tr>
                    ) : (
                      filteredSubjectRankings.map((item, idx) => {
                        const hasScore = item.score !== null;
                        const isNeedsGuidance = item.guidanceStatus === "needs_guidance";
                        const isAdvanced = item.guidanceStatus === "advanced";
                        const isCompetent = item.guidanceStatus === "competent";

                        return (
                          <tr
                            key={item.student.id}
                            className={`transition hover:bg-[#1a2b48] ${
                              isNeedsGuidance ? "bg-red-950/20" : ""
                            }`}
                          >
                            {/* 1. Rank */}
                            <td className="py-3.5 px-3.5 text-center font-mono">
                              {hasScore ? (
                                item.rank === 1 ? (
                                  <span className="w-7 h-7 mx-auto rounded-full bg-amber-500/20 text-amber-300 border border-amber-400 font-black text-xs flex items-center justify-center shadow-xs">
                                    🥇
                                  </span>
                                ) : item.rank === 2 ? (
                                  <span className="w-7 h-7 mx-auto rounded-full bg-slate-400/20 text-slate-200 border border-slate-300 font-black text-xs flex items-center justify-center">
                                    🥈
                                  </span>
                                ) : item.rank === 3 ? (
                                  <span className="w-7 h-7 mx-auto rounded-full bg-amber-700/20 text-amber-400 border border-amber-600 font-black text-xs flex items-center justify-center">
                                    🥉
                                  </span>
                                ) : (
                                  <span className="font-bold text-slate-300">#{item.rank}</span>
                                )
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>

                            {/* 2. Student Name & NISN */}
                            <td className="py-3.5 px-4">
                              <div className="font-black text-white text-xs leading-tight">
                                {item.student.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                NISN: {item.student.nisn || "-"}
                              </div>
                            </td>

                            {/* 3. Class */}
                            <td className="py-3.5 px-3 text-center font-mono">
                              <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/30 text-[11px] font-bold">
                                Kelas {item.student.kelas}
                              </span>
                            </td>

                            {/* 4. Score */}
                            <td className="py-3.5 px-4 text-center font-mono">
                              {hasScore ? (
                                <span
                                  className={`text-base font-black px-2.5 py-0.5 rounded-lg ${
                                    isNeedsGuidance
                                      ? "bg-red-500/20 text-red-300 border border-red-500/50"
                                      : isAdvanced
                                      ? "bg-emerald-500/20 text-emerald-300 font-black"
                                      : "bg-[#090f1d] text-white"
                                  }`}
                                >
                                  {item.score}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">Belum diisi</span>
                              )}
                            </td>

                            {/* 5. Percentage Progress Bar */}
                            <td className="py-3.5 px-4">
                              {hasScore ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px] font-mono">
                                    <span className="font-bold text-slate-300">Ketercapaian:</span>
                                    <span
                                      className={`font-black ${
                                        isNeedsGuidance
                                          ? "text-red-300"
                                          : isAdvanced
                                          ? "text-emerald-300"
                                          : "text-blue-300"
                                      }`}
                                    >
                                      {item.percentage}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-[#090f1d] h-2 rounded-full overflow-hidden border border-[#2b4168]">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        isNeedsGuidance
                                          ? "bg-red-500"
                                          : isAdvanced
                                          ? "bg-emerald-400"
                                          : "bg-blue-500"
                                      }`}
                                      style={{ width: `${item.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[11px]">-</span>
                              )}
                            </td>

                            {/* 6. Predicate */}
                            <td className="py-3.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-black font-mono ${
                                  item.predikat.startsWith("A")
                                    ? "bg-emerald-950 text-emerald-300 border border-emerald-500/50"
                                    : item.predikat.startsWith("B")
                                    ? "bg-blue-950 text-blue-300 border border-blue-500/50"
                                    : item.predikat.startsWith("C")
                                    ? "bg-amber-950 text-amber-300 border border-amber-500/50"
                                    : item.predikat.startsWith("D")
                                    ? "bg-red-950 text-red-300 border border-red-500/50"
                                    : "text-slate-500"
                                }`}
                              >
                                {item.predikat.charAt(0) || "-"}
                              </span>
                            </td>

                            {/* 7. Guidance & Evaluation Status */}
                            <td className="py-3.5 px-4">
                              {isNeedsGuidance ? (
                                <div className="space-y-1">
                                  <span className="px-2.5 py-1 rounded-lg bg-red-950/90 text-red-300 border-2 border-red-500 font-black text-[11px] inline-flex items-center gap-1.5 shadow-xs">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                    <span>PERLU BIMBINGAN LEBIH</span>
                                  </span>
                                  <div className="text-[10px] text-red-300 font-semibold leading-tight">
                                    Nilai ({item.score}) di bawah KKM ({kkmThreshold}). Butuh perhatian khusus & remedial.
                                  </div>
                                  {item.unachievedTps.length > 0 && (
                                    <div className="text-[9.5px] text-amber-300 bg-amber-950/40 p-1 rounded border border-amber-500/30">
                                      ⚠️ {item.unachievedTps.length} TP belum optimal
                                    </div>
                                  )}
                                </div>
                              ) : isAdvanced ? (
                                <div className="space-y-0.5">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-200 border border-emerald-400 font-bold text-[11px] inline-flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-emerald-400" />
                                    <span>Sangat Baik (Pengayaan)</span>
                                  </span>
                                  <div className="text-[10px] text-slate-400">Kompetensi tercapai optimal</div>
                                </div>
                              ) : isCompetent ? (
                                <div className="space-y-0.5">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-950/80 text-blue-200 border border-blue-400 font-bold text-[11px] inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-blue-400" />
                                    <span>Tuntas (&ge; KKM)</span>
                                  </span>
                                  <div className="text-[10px] text-slate-400">Target pembelajaran tercapai</div>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[11px] italic">
                                  Belum diinput guru
                                </span>
                              )}
                            </td>

                            {/* 8. Quick Action: Guide Student */}
                            <td className="py-3.5 px-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleSelectStudentForGrading(item.student)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition shadow-xs border border-emerald-300"
                                title={`Buka formulir input nilai dan bimbingan untuk ananda ${item.student.name}`}
                              >
                                <ClipboardPlus className="w-3.5 h-3.5" />
                                <span>Bimbing Siswa</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
