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
  FileSpreadsheet,
  Table,
  CheckSquare,
  Sparkles,
  Upload,
  X,
  FileText,
  Copy,
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

  // View state tab: grades (pengisian nilai per siswa), table (input cepat tabel kelas), or tps (kelola TP)
  const [activeViewTab, setActiveViewTab] = useState<"grades" | "table" | "tps">(
    "table",
  );

  // Class selection state (7, 8, 9)
  const [selectedClass, setSelectedClass] = useState("7");
  // Student selection state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

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

  // Manage TP template state for teacher
  const [newTpText, setNewTpText] = useState("");
  const [tpSubmitLoading, setTpSubmitLoading] = useState(false);

  // Bulk / Table Input State
  const [bulkRows, setBulkRows] = useState<{
    [studentId: string]: {
      score: string;
      usaha: string;
      proses: string;
      capaian: string;
      deskripsi: string;
      tps: { [tpId: string]: boolean };
    };
  }>({});
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState("");

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

      // Initialize bulk table rows
      initializeBulkRows(sArr, gArr, classTps);

      // Auto-select first student in this class if available
      const classStudents = sArr.filter(
        (s: Student) => s.kelas === selectedClass,
      );
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

  const initializeBulkRows = (
    currentStudents: Student[],
    currentGrades: Grade[],
    currentTps: { id: string; text: string }[],
  ) => {
    const classStudents = currentStudents.filter(
      (s) => String(s.kelas || "").trim() === String(selectedClass).trim(),
    );

    const rows: { [studentId: string]: any } = {};
    classStudents.forEach((st) => {
      const existing = currentGrades.find(
        (g) => g.studentId === st.id && g.subject === user.subject,
      );

      const tpMap: { [tpId: string]: boolean } = {};
      currentTps.forEach((t) => {
        if (existing && Array.isArray(existing.tps)) {
          const found = existing.tps.find((x: any) => x && x.id === t.id);
          tpMap[t.id] = found ? !!found.achieved : true;
        } else {
          tpMap[t.id] = true;
        }
      });

      let desc = existing?.deskripsi || "";
      if (!desc && currentTps.length > 0) {
        desc = generateNarrativeDescription(
          st,
          user.subject,
          currentTps,
          tpMap,
        );
      }

      rows[st.id] = {
        score:
          existing && existing.score !== undefined
            ? String(existing.score)
            : "",
        usaha: existing?.usaha || "B",
        proses: existing?.proses || "B",
        capaian: existing?.capaian || "B",
        deskripsi: desc,
        tps: tpMap,
      };
    });
    setBulkRows(rows);
  };

  const handleBulkRowChange = (studentId: string, field: string, value: any) => {
    setBulkRows((prev) => {
      const current = prev[studentId] || {
        score: "",
        usaha: "B",
        proses: "B",
        capaian: "B",
        deskripsi: "",
        tps: {},
      };

      const updated = { ...current, [field]: value };

      if (field === "score") {
        const num = Number(value);
        if (!isNaN(num) && String(value).trim() !== "") {
          let pred = "C";
          if (num > 91) pred = "A";
          else if (num >= 80) pred = "B";
          else pred = "C";
          updated.usaha = pred;
          updated.proses = pred;
          updated.capaian = pred;
        }
      }

      return { ...prev, [studentId]: updated };
    });
  };

  const handleApplyToAll = (action: string) => {
    setBulkRows((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((sid) => {
        if (action === "predikatB") {
          next[sid].usaha = "B";
          next[sid].proses = "B";
          next[sid].capaian = "B";
        } else if (action === "score80") {
          if (!next[sid].score) next[sid].score = "80";
          next[sid].usaha = "B";
          next[sid].proses = "B";
          next[sid].capaian = "B";
        } else if (action === "checkAllTps") {
          const tpMap: { [id: string]: boolean } = {};
          tpTemplates.forEach((t) => {
            tpMap[t.id] = true;
          });
          next[sid].tps = tpMap;
        }
      });
      return next;
    });
    setSuccess("Berhasil menerapkan perubahan cepat ke seluruh siswa!");
  };

  const handleProcessPasteExcel = () => {
    if (!pasteRawText.trim()) return;
    const lines = pasteRawText.trim().split(/\r?\n/);
    const classStudents = students.filter(
      (s) => String(s.kelas || "").trim() === String(selectedClass).trim(),
    );

    setBulkRows((prev) => {
      const next = { ...prev };
      lines.forEach((line, idx) => {
        if (idx < classStudents.length) {
          const student = classStudents[idx];
          // Check if line has tab-separated numbers or single number
          const parts = line.split("\t").map((p) => p.trim()).filter(Boolean);
          let scoreVal = "";
          // Extract numeric score
          for (const p of parts) {
            const num = Number(p.replace(/[^0-9.]/g, ""));
            if (!isNaN(num) && num > 0 && num <= 100) {
              scoreVal = String(num);
              break;
            }
          }
          if (scoreVal) {
            const num = Number(scoreVal);
            let pred = "C";
            if (num > 91) pred = "A";
            else if (num >= 80) pred = "B";
            else pred = "C";

            next[student.id] = {
              ...(next[student.id] || {}),
              score: scoreVal,
              usaha: pred,
              proses: pred,
              capaian: pred,
            };
          }
        }
      });
      return next;
    });

    setIsPasteModalOpen(false);
    setPasteRawText("");
    setSuccess(`Berhasil menempelkan nilai untuk siswa Kelas ${selectedClass}! Silakan periksa dan klik 'Simpan Semua Nilai'.`);
  };

  const handleSaveBulkGrades = async () => {
    setIsBulkSaving(true);
    setError("");
    setSuccess("");

    const classStudents = students.filter(
      (s) => String(s.kelas || "").trim() === String(selectedClass).trim(),
    );

    const payloadGrades: any[] = [];
    classStudents.forEach((st) => {
      const row = bulkRows[st.id];
      if (row && row.score !== undefined && row.score !== "") {
        const parsedScore = Number(row.score);
        if (!isNaN(parsedScore)) {
          const formattedTps: TPItem[] = tpTemplates.map((tp) => ({
            id: tp.id,
            text: tp.text,
            achieved: row.tps?.[tp.id] ?? true,
          }));

          let finalDesc = row.deskripsi ? row.deskripsi.trim() : "";
          if (!finalDesc && tpTemplates.length > 0) {
            finalDesc = generateNarrativeDescription(
              st,
              user.subject,
              tpTemplates,
              row.tps || {},
            );
          }

          payloadGrades.push({
            studentId: st.id,
            subject: user.subject,
            score: parsedScore,
            tps: formattedTps,
            usaha: row.usaha || "B",
            proses: row.proses || "B",
            capaian: row.capaian || "B",
            deskripsi: finalDesc,
            teacherName: user.name,
          });
        }
      }
    });

    if (payloadGrades.length === 0) {
      setError("Belum ada nilai yang diinput pada tabel.");
      setIsBulkSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/grades/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grades: payloadGrades }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan nilai massal.");

      setSuccess(`Alhamdulillah! Berhasil menyimpan nilai untuk ${payloadGrades.length} siswa Kelas ${selectedClass}!`);
      onRefreshTrigger();

      // Refresh grades
      const getGrades = await fetch("/api/grades");
      const updatedGrades = await getGrades.json();
      setGrades(updatedGrades);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyimpan nilai.");
    } finally {
      setIsBulkSaving(false);
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

  const handleStudentSelect = (
    student: Student,
    allGrades: Grade[] = grades,
    templates: { id: string; text: string }[] = tpTemplates,
  ) => {
    try {
      setSelectedStudent(student);
      setSuccess("");
      setError("");

      const safeGrades = Array.isArray(allGrades) ? allGrades : [];
      const safeTemplates = Array.isArray(templates) ? templates : [];

      // Look up if this student already has a grade for this teacher's subject
      const existingGrade = safeGrades.find(
        (g) => g && g.studentId === student?.id && g.subject === user.subject,
      );

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

        // Build active checked states
        const achievedMap: { [tpId: string]: boolean } = {};
        safeTemplates.forEach((tmpl) => {
          if (tmpl && tmpl.id) {
            const found = Array.isArray(existingGrade.tps)
              ? existingGrade.tps.find((t: any) => t && t.id === tmpl.id)
              : null;
            achievedMap[tmpl.id] = found ? !!found.achieved : true; // Default to true mapped
          }
        });
        setTpAchievements(achievedMap);

        if (existingGrade.deskripsi && existingGrade.deskripsi.trim() !== "") {
          setCustomDescription(existingGrade.deskripsi.trim());
          setIsCustomDescActive(true);
        } else if (safeTemplates.length > 0) {
          const auto = generateNarrativeDescription(
            student,
            user.subject,
            safeTemplates,
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
        safeTemplates.forEach((t) => {
          if (t && t.id) {
            defaultMap[t.id] = true; // default achieved
          }
        });
        setTpAchievements(defaultMap);

        if (safeTemplates.length > 0) {
          const auto = generateNarrativeDescription(
            student,
            user.subject,
            safeTemplates,
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

  // Switch achievement status of some TP and automatically synchronize description
  const toggleTp = (id: string) => {
    const nextAchieved = !tpAchievements[id];
    const nextMap = {
      ...tpAchievements,
      [id]: nextAchieved,
    };
    setTpAchievements(nextMap);

    // Otomatis memperbarui deskripsi sesuai status TP terbaru & menyertakan nama siswa
    if (selectedStudent && tpTemplates.length > 0) {
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

    if (selectedStudent && tpTemplates.length > 0) {
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
    const formattedTps: TPItem[] = safeTemplates.map((tp) => ({
      id: tp.id,
      text: tp.text,
      achieved: tpAchievements[tp.id] ?? true,
    }));

    // Description is taken directly from the textarea (supports both auto from TP and purely manual)
    const finalDescription = customDescription.trim();

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

      setSuccess(
        `Nilai ${user.subject} untuk ${selectedStudent.name} berhasil disimpan!`,
      );
      onRefreshTrigger(); // trigger live stats update in index

      // Refresh grades silently
      const getGrades = await fetch("/api/grades");
      const updatedGrades = await getGrades.json();
      setGrades(updatedGrades);
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

  // Delete TP template by teacher
  const handleDeleteLocalTp = async (tpId: string) => {
    if (
      !confirm(
        "Apakah Anda yakin ingin menghapus Tujuan Pembelajaran (TP) ini?",
      )
    )
      return;
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/tps/${user.subject}/${tpId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus TP.");

      setSuccess("Tujuan Pembelajaran berhasil dihapus.");

      // Reload TP templates for selected class
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
    } catch (err: any) {
      setError(err.message || "Gagal menghapus TP.");
    }
  };

  // Helper arrays
  const safeStudents = Array.isArray(students) ? students : [];
  const classStudents = safeStudents.filter(
    (s) => s && s.kelas === selectedClass,
  );
  const filledCount = Array.isArray(grades)
    ? classStudents.filter((s) =>
        grades.some(
          (g) => g && g.studentId === s.id && g.subject === user.subject,
        ),
      ).length
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="teacher-panel">
      {/* Selector sidebar (Classes and Students list) */}
      <div className="lg:col-span-1 bg-white rounded-lg border border-slate-200 shadow-sm p-3 h-fit space-y-3.5">
        <div>
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
            Pilih Kelas:
          </label>
          <div className="grid grid-cols-3 gap-1.5" id="class-button-selectors">
            {["7", "8", "9"].map((cls) => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`py-1 px-1.5 rounded text-xs font-bold transition cursor-pointer text-center ${selectedClass === cls ? "bg-emerald-800 text-white shadow-2xs" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
              >
                Kelas {cls}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between">
          <h3 className="font-extrabold text-[10px] uppercase tracking-wider text-slate-500">
            Daftar Siswa ({classStudents.length})
          </h3>
          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100">
            Terisi: {filledCount}/{classStudents.length}
          </span>
        </div>

        <div
          className="space-y-1 max-h-[350px] overflow-y-auto pr-1"
          id="student-vertical-list"
        >
          {loading ? (
            <div className="p-3 text-center text-xs text-slate-400 italic">
              Memuat daftar siswa...
            </div>
          ) : classStudents.length === 0 ? (
            <p className="text-xs text-slate-450 italic text-center py-3">
              Belum ada siswa di kelas ini.
            </p>
          ) : (
            classStudents.map((s) => {
              const isFilled =
                Array.isArray(grades) &&
                grades.some(
                  (g) =>
                    g && g.studentId === s.id && g.subject === user.subject,
                );
              const isSelected = selectedStudent?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleStudentSelect(s)}
                  className={`w-full p-2 rounded text-left text-xs transition flex items-center justify-between gap-2 border cursor-pointer ${isSelected ? "bg-emerald-50/70 border-emerald-400 font-bold text-emerald-900" : "bg-white border-slate-150 text-slate-700 hover:bg-slate-50"}`}
                >
                  <span className="truncate">{s.name || "N/A"}</span>
                  {isFilled ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0">
                      Selesai ✓
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-400 text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0">
                      Kosong
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main interactive panel */}
      <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        {/* Navigation Tab Headers */}
        <div
          className="flex border-b border-slate-200 gap-1 mb-4 overflow-x-auto"
          id="teacher-view-tabs"
        >
          <button
            onClick={() => setActiveViewTab("table")}
            className={`py-1.5 px-3 uppercase tracking-wider text-[10px] font-extrabold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${activeViewTab === "table" ? "border-emerald-800 text-emerald-850 bg-emerald-50/40 font-black" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" /> Input Cepat Massal (Tabel Kelas {selectedClass})
          </button>
          <button
            onClick={() => setActiveViewTab("grades")}
            className={`py-1.5 px-3 uppercase tracking-wider text-[10px] font-extrabold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${activeViewTab === "grades" ? "border-emerald-800 text-emerald-850 bg-emerald-50/40" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <ClipboardPlus className="w-3.5 h-3.5" /> Input Rinci Per Siswa
          </button>
          <button
            onClick={() => setActiveViewTab("tps")}
            className={`py-1.5 px-3 uppercase tracking-wider text-[10px] font-extrabold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${activeViewTab === "tps" ? "border-emerald-800 text-emerald-850 bg-emerald-50/40" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Kelola TP ({user.subject})
          </button>
        </div>

        <div className="pb-2.5 mb-4 flex items-center justify-between">
          <div>
            <span className="px-2 py-0.5 bg-emerald-800 text-white rounded text-[10px] uppercase tracking-wider font-extrabold mr-2">
              Mapel {user.subject}
            </span>
            <span className="text-[11px] text-slate-400 italic">
              Pengampu: {user.name}
            </span>
          </div>
          <button
            onClick={fetchData}
            className="p-1 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold rounded transition text-slate-600 cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Sinkronkan DB
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-250 flex items-start gap-2 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-2.5 bg-green-50 text-green-800 text-xs font-bold rounded border border-green-200 flex items-center gap-1.5 animate-fade-in mb-3">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>{success}</span>
          </div>
        )}

        {/* TABLE BATCH GRADING TAB */}
        {activeViewTab === "table" && (
          <div className="space-y-4" id="batch-table-view">
            {/* Action Bar & Quick Helpers */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(true)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Tempel dari Excel / Sheets</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyToAll("predikatB")}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Ubah semua kriteria Usaha, Proses, dan Capaian menjadi B (Baik)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Set Predikat B Semua</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyToAll("checkAllTps")}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Tandai seluruh TP tercapai untuk semua siswa"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Centang Semua TP</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveBulkGrades}
                disabled={isBulkSaving}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isBulkSaving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Simpan Semua Nilai Kelas {selectedClass}</span>
              </button>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-800 text-white sticky top-0 z-10 text-[11px] uppercase tracking-wider font-extrabold">
                    <tr>
                      <th className="p-2.5 text-center w-10">No</th>
                      <th className="p-2.5 w-28">NISN</th>
                      <th className="p-2.5 min-w-[160px]">Nama Siswa</th>
                      <th className="p-2.5 text-center w-24">Nilai (0-100)</th>
                      <th className="p-2.5 text-center w-20">Usaha</th>
                      <th className="p-2.5 text-center w-20">Proses</th>
                      <th className="p-2.5 text-center w-20">Capaian</th>
                      <th className="p-2.5 min-w-[200px]">Tujuan Pembelajaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classStudents.map((st, idx) => {
                      const row = bulkRows[st.id] || {
                        score: "",
                        usaha: "B",
                        proses: "B",
                        capaian: "B",
                        deskripsi: "",
                        tps: {},
                      };
                      const isRowFilled = row.score !== "" && row.score !== undefined;

                      return (
                        <tr
                          key={st.id}
                          className={`hover:bg-slate-50 transition ${
                            isRowFilled ? "bg-emerald-50/20" : ""
                          }`}
                        >
                          <td className="p-2.5 text-center font-bold text-slate-500 text-xs">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-600 font-semibold">
                            {st.nisn}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 text-xs">
                            {st.name}
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row.score}
                              onChange={(e) =>
                                handleBulkRowChange(st.id, "score", e.target.value)
                              }
                              placeholder="0-100"
                              className="w-18 p-1.5 text-center font-bold text-xs rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 bg-white text-slate-900"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <select
                              value={row.usaha}
                              onChange={(e) =>
                                handleBulkRowChange(st.id, "usaha", e.target.value)
                              }
                              className="p-1 text-xs font-bold border border-slate-300 rounded bg-white text-slate-800"
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          </td>
                          <td className="p-2.5 text-center">
                            <select
                              value={row.proses}
                              onChange={(e) =>
                                handleBulkRowChange(st.id, "proses", e.target.value)
                              }
                              className="p-1 text-xs font-bold border border-slate-300 rounded bg-white text-slate-800"
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          </td>
                          <td className="p-2.5 text-center">
                            <select
                              value={row.capaian}
                              onChange={(e) =>
                                handleBulkRowChange(st.id, "capaian", e.target.value)
                              }
                              className="p-1 text-xs font-bold border border-slate-300 rounded bg-white text-slate-800"
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          </td>
                          <td className="p-2.5 text-xs">
                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                              {tpTemplates.map((tp, tpIdx) => {
                                const isChecked = row.tps?.[tp.id] ?? true;
                                return (
                                  <label
                                    key={tp.id}
                                    className="flex items-start gap-1.5 cursor-pointer text-[11px] text-slate-700 hover:text-slate-900"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const newTps = {
                                          ...(row.tps || {}),
                                          [tp.id]: e.target.checked,
                                        };
                                        handleBulkRowChange(st.id, "tps", newTps);
                                      }}
                                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-700"
                                    />
                                    <span className="leading-tight">
                                      TP {tpIdx + 1}: {tp.text}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-medium">
                Total Siswa: <strong>{classStudents.length} orang</strong> (Kelas {selectedClass})
              </span>
              <button
                type="button"
                onClick={handleSaveBulkGrades}
                disabled={isBulkSaving}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isBulkSaving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Simpan Nilai Semua Siswa Kelas {selectedClass}</span>
              </button>
            </div>
          </div>
        )}

        {/* INPUT GRADING TAB */}
        {activeViewTab === "grades" &&
          (selectedStudent ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-emerald-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {selectedStudent.name?.charAt(0) || "?"}
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-slate-800 uppercase">
                    {selectedStudent.name || "N/A"}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    NISN: {selectedStudent.nisn || "-"} • Kelas{" "}
                    {selectedStudent.kelas || "-"}
                  </p>
                </div>
              </div>

              {/* THREE-GRADE EVALUATION CRITERIA + NUMERIC SCORE */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-0.5">
                      Input Nilai & Kriteria Evaluasi
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        &gt; 91 = A (Sangat Baik)
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-300">
                        80 - 91 = B (Baik)
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                        &le; 79 = C (Cukup)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    <div className="text-right">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Nilai Akhir:
                      </label>
                      <span className={`text-[10px] font-extrabold font-mono block ${
                        score !== ""
                          ? Number(score) > 91
                            ? "text-emerald-600"
                            : Number(score) >= 80
                            ? "text-cyan-600"
                            : "text-amber-600"
                          : "text-slate-400"
                      }`}>
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
                      className="w-16 p-1 border-2 border-emerald-500 rounded text-center text-base font-bold bg-white text-emerald-950 focus:outline-none shadow-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Grade Usaha
                    </label>
                    <select
                      value={usaha}
                      onChange={(e) => setUsaha(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs focus:outline-none"
                    >
                      <option value="A">A (Sangat Baik)</option>
                      <option value="B">B (Baik)</option>
                      <option value="C">C (Cukup)</option>
                      <option value="D">D (Kurang)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Grade Proses
                    </label>
                    <select
                      value={proses}
                      onChange={(e) => setProses(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs focus:outline-none"
                    >
                      <option value="A">A (Sangat Baik)</option>
                      <option value="B">B (Baik)</option>
                      <option value="C">C (Cukup)</option>
                      <option value="D">D (Kurang)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Grade Capaian
                    </label>
                    <select
                      value={capaian}
                      onChange={(e) => setCapaian(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs focus:outline-none"
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
              <div className="border-t border-[#1e2e4a] pt-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                  <div>
                    <h4 className="font-extrabold text-[11px] text-white uppercase tracking-wider">
                      Tujuan Pembelajaran (TP) untuk Anak Ini
                    </h4>
                    <p className="text-[10px] text-slate-300 leading-tight">
                      Centang jika anak sudah optimal (Sangat Baik). Un-centang jika masih butuh bimbingan.
                    </p>
                  </div>
                  {Array.isArray(tpTemplates) && tpTemplates.length > 0 && (
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setAllTpStatus(true)}
                        className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded transition cursor-pointer"
                      >
                        Semua Optimal ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllTpStatus(false)}
                        className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded transition cursor-pointer"
                      >
                        Semua Butuh Bimbingan ⚠️
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className="space-y-2 max-h-56 overflow-y-auto pr-1"
                  id="tp-grading-list"
                >
                  {!Array.isArray(tpTemplates) || tpTemplates.length === 0 ? (
                    <div className="p-3 bg-[#0b1222] text-slate-300 text-xs rounded-lg border border-dashed border-[#1e2e4a] text-center">
                      <p className="font-bold text-white mb-0.5">
                        Belum ada template Tujuan Pembelajaran (TP) Kelas {selectedClass}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Anda tetap dapat menyimpan nilai serta menuliskan narasi deskripsi raport secara manual pada kolom di bawah.
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
                            className={`p-2.5 rounded-lg border text-xs transition cursor-pointer select-none flex items-start gap-3 ${
                              isChecked
                                ? "bg-[#0d2820] border-[#059669] text-white hover:bg-[#11352a]"
                                : "bg-[#241a0e] border-[#d97706] text-white hover:bg-[#302313]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleTp(tp.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer mt-0.5"
                            />
                            <div className="flex-1 space-y-1">
                              <p className="text-white leading-relaxed font-semibold">
                                {tp.text}
                              </p>
                              <span
                                className={`text-[9px] font-extrabold tracking-wide inline-flex items-center gap-1 uppercase px-2 py-0.5 rounded border ${
                                  isChecked
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                    : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                }`}
                              >
                                {isChecked
                                  ? "Sudah Optimal ✓"
                                  : "Butuh Bimbingan ⚠️"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* NARRATIVE DESCRIPTION PREVIEW / MANUAL INPUT */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <div>
                    <h4 className="font-extrabold text-[10px] text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Narasi Deskripsi Raport</span>
                      {tpTemplates.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded text-[9px] font-semibold lowercase">
                          otomatis memuat nama siswa
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {tpTemplates.length > 0
                        ? `Deskripsi otomatis langsung diperbarui saat ceklist TP diubah (termasuk nama ananda ${selectedStudent.name}). Tetap bisa diedit manual langsung di kolom ini.`
                        : `Ketik narasi deskripsi capaian raport ananda ${selectedStudent.name} secara manual di bawah (dapat disimpan tanpa TP).`}
                    </p>
                  </div>
                  {tpTemplates.length > 0 && (
                    <button
                      type="button"
                      onClick={handleRegenerateFromTp}
                      title="Klik untuk menyinkronkan atau menghasilkan ulang narasi deskripsi dari ceklist TP saat ini"
                      className="px-2.5 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer shadow-xs"
                    >
                      <RefreshCw className="w-3 h-3 text-emerald-600" />
                      <span>Sinkronkan dari TP</span>
                    </button>
                  )}
                </div>

                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  rows={4}
                  placeholder={
                    selectedStudent
                      ? `Ketik deskripsi capaian rapor untuk ananda ${selectedStudent.name} di sini...`
                      : "Ketik deskripsi capaian nilai rapor secara manual di sini..."
                  }
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Save trigger */}
              <div className="border-t border-slate-150 pt-3 text-right">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded text-xs font-bold flex items-center gap-1.5 ml-auto shadow-xs transition disabled:opacity-50 cursor-pointer"
                  id="submit-grades-button"
                >
                  {saveLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Simpan Nilai & Deskripsi
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-12 text-center text-slate-400 italic text-xs">
              Pilihlah salah satu siswa di bar sebelah kiri untuk memulai
              pengisian rapor.
            </div>
          ))}

        {/* LOCAL TP MANAGEMENT TAB */}
        {activeViewTab === "tps" && (
          <div
            className="space-y-4 animate-fade-in"
            id="teacher-tplocal-management"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#1e2e4a] pb-3">
              <div>
                <h3 className="font-bold text-xs text-white uppercase flex items-center gap-2">
                  <span>Kelola Tujuan Pembelajaran (TP) - {user.subject}</span>
                  <span className="px-2 py-0.5 bg-emerald-700 text-white rounded text-[10px] font-bold shadow-2xs border border-emerald-500/40">
                    Kelas {selectedClass}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Tujuan pembelajaran otomatis disesuaikan secara spesifik untuk tingkat Kelas {selectedClass}. Anda dapat menambah atau memperbarui sesuai kebutuhan materi.
                </p>
              </div>
            </div>

            {/* Form to add custom learning objective directly by the teacher */}
            <form
              onSubmit={handleAddLocalTp}
              className="p-3.5 bg-[#142036] rounded-xl border border-[#253e66] flex gap-2.5 items-end shadow-2xs"
            >
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-white uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <span>Tambah Tujuan Pembelajaran Baru:</span>
                  <span className="text-emerald-300 font-extrabold">(Tingkat Kelas {selectedClass})</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTpText}
                  onChange={(e) => setNewTpText(e.target.value)}
                  placeholder={`Contoh: Menguasai kompetensi dasar materi kelas ${selectedClass}...`}
                  className="w-full p-2 bg-[#0b1222] border border-[#293e66] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={tpSubmitLoading || !newTpText.trim()}
                className="bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white p-2 rounded-lg cursor-pointer transition flex items-center justify-center h-[36px] w-[40px] border border-emerald-500/40 shrink-0"
                title="Tambahkan TP"
              >
                {tpSubmitLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </form>

            {/* List of current objectives for this subject with delete buttons */}
            <div className="border border-[#1e2e4a] rounded-xl overflow-hidden bg-[#0f172a]">
              <div className="bg-[#131f38] px-3.5 py-2.5 border-b border-[#223554] flex items-center justify-between">
                <span className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <span>Daftar TP Kelas {selectedClass}</span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold">
                    {!Array.isArray(tpTemplates) ? 0 : tpTemplates.length} TP
                  </span>
                </span>
                <span className="text-[10px] text-slate-300 italic font-medium">
                  Khusus Rombel {selectedClass}
                </span>
              </div>
              <div className="divide-y divide-[#1e2e4a] max-h-[320px] overflow-y-auto">
                {!Array.isArray(tpTemplates) || tpTemplates.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-400 italic bg-[#0b1222]">
                    Belum ada Tujuan Pembelajaran untuk Kelas {selectedClass}. Silakan tambahkan pada form di atas.
                  </p>
                ) : (
                  tpTemplates
                    .filter((tp) => tp && tp.id)
                    .map((tp, idx) => (
                      <div
                        key={tp.id}
                        className="p-3 flex items-start justify-between gap-3 bg-[#0f172a] hover:bg-[#16233c] transition"
                      >
                        <div className="flex gap-2.5">
                          <span className="text-xs font-mono font-bold text-slate-400 mt-0.5">
                            {idx + 1}.
                          </span>
                          <div className="space-y-1">
                            <p className="text-xs text-white font-semibold leading-relaxed">
                              {tp.text}
                            </p>
                            <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Kelas {tp.kelas || selectedClass}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteLocalTp(tp.id)}
                          className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/20 transition cursor-pointer shrink-0"
                          title="Hapus TP"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PASTE FROM EXCEL MODAL */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-fade-in my-8">
            <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
                <h3 className="text-sm font-bold uppercase tracking-wide">
                  Tempel Nilai dari Excel / Google Sheets (Kelas {selectedClass})
                </h3>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  Petunjuk Penggunaan Cepat:
                </p>
                <ul className="list-disc list-inside text-[11px] text-emerald-800 pl-1 space-y-0.5">
                  <li>Buka berkas Excel / Spreadsheet Anda.</li>
                  <li>Salin (*copy*) kolom nilai siswa (urutan 1 sampai {classStudents.length}).</li>
                  <li>Tempel (*paste*) ke kotak di bawah, lalu klik <strong>"Terapkan ke Tabel"</strong>.</li>
                  <li>Sistem akan otomatis mengisi nilai dan menyesuaikan predikat A/B/C secara instan!</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tempelkan Kolom Nilai Di Sini:
                </label>
                <textarea
                  rows={8}
                  value={pasteRawText}
                  onChange={(e) => setPasteRawText(e.target.value)}
                  placeholder={`Contoh:\n85\n90\n78\n88\n95\n... (sesuai urutan siswa Kelas ${selectedClass})`}
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessPasteExcel}
                  disabled={!pasteRawText.trim()}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Terapkan ke Tabel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
