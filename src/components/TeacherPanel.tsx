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

  // View state tab: grades (pengisian nilai) or tps (kelola TP)
  const [activeViewTab, setActiveViewTab] = useState<"grades" | "tps">(
    "grades",
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

      const isDummyTpId = (id: string) =>
        /^(pai|ppkn|indo|mat|mtk|ipa|ips|inggris|ing|pjok|prak|info|arab|tahsin|tahfizh|doa|wudhu)_[789]_\d+$/i.test(id) ||
        /^(pai|ppkn|indo|mat|mtk|ipa|ips|inggris|ing|pjok|prak|info|arab|tahsin|tahfizh|doa|wudhu)\d+$/i.test(id);

      if (existingGrade && Array.isArray(existingGrade.tps)) {
        existingGrade.tps.forEach((gtp: any) => {
          if (
            gtp &&
            gtp.text &&
            !isDummyTpId(gtp.id || "") &&
            !activeTemplates.some(
              (t) => t.text.trim().toLowerCase() === gtp.text.trim().toLowerCase()
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

  // Switch achievement status of some TP and automatically synchronize description
  const toggleTp = (id: string) => {
    const currentVal = tpAchievements[id];
    // If currently false -> true; if true or undefined -> false
    const nextAchieved = currentVal === false ? true : false;
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="teacher-panel">
      {/* Selector sidebar (Classes and Students list) */}
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

      {/* Main interactive panel */}
      <div className="lg:col-span-2 bg-[#0f172a] rounded-xl border-2 border-[#253e66] shadow-lg p-5 sm:p-6 space-y-5">
        {/* Navigation Tab Headers */}
        <div
          className="flex border-b-2 border-[#203254] gap-2 pb-1"
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
                  onChange={(e) => setCustomDescription(e.target.value)}
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
      </div>
    </div>
  );
}
