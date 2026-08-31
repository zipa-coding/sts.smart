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

  // Manage TP template state for teacher
  const [newTpText, setNewTpText] = useState("");
  const [tpSubmitLoading, setTpSubmitLoading] = useState(false);

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

      // Filter TP templates specifically for this teacher's subject
      const subjectTps = Array.isArray(tpObj[user.subject])
        ? tpObj[user.subject]
        : [];
      setTpTemplates(subjectTps);

      // Auto-select first student in this class if available
      const classStudents = sArr.filter(
        (s: Student) => s.kelas === selectedClass,
      );
      if (classStudents.length > 0) {
        handleStudentSelect(classStudents[0], gArr, subjectTps);
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

        if (existingGrade.deskripsi) {
          setCustomDescription(existingGrade.deskripsi);
          setIsCustomDescActive(true);
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
        setCustomDescription("");
        setIsCustomDescActive(false);

        const defaultMap: { [tpId: string]: boolean } = {};
        safeTemplates.forEach((t) => {
          if (t && t.id) {
            defaultMap[t.id] = true; // default achieved
          }
        });
        setTpAchievements(defaultMap);
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
      else if (num >= 85) defaultGrade = "B";
      else defaultGrade = "C";

      setUsaha(defaultGrade);
      setProses(defaultGrade);
      setCapaian(defaultGrade);
    }
  };

  // Switch achievement status of some TP
  const toggleTp = (id: string) => {
    setTpAchievements((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Auto generate narrative description
  const getAutoDescription = () => {
    if (!selectedStudent) return "";

    const safeTemplates = Array.isArray(tpTemplates)
      ? tpTemplates.filter((tp) => tp && tp.id)
      : [];
    const achieved = safeTemplates
      .filter((tp) => tpAchievements && tpAchievements[tp.id] !== false)
      .map((tp) => tp.text || "");
    const needImprovement = safeTemplates
      .filter((tp) => tpAchievements && tpAchievements[tp.id] === false)
      .map((tp) => tp.text || "");

    const name = selectedStudent.name || "Siswa";

    const gradeWord = (g: string) => {
      if (g === "A") return "Sangat Baik";
      if (g === "B") return "Baik";
      if (g === "C") return "Cukup Baik";
      return "Perlu Bimbingan";
    };

    let text = `Alhamdulillah ananda ${name} dalam usaha, proses serta capaian untuk pelajaran ${user.subject || ""} sudah ${gradeWord(capaian)}. `;

    if (achieved.length > 0) {
      text += `Mampu menguasai kompetensi yang optimal dalam hal ${achieved.join(", ")}. `;
    }

    if (needImprovement.length > 0) {
      text += `Namun perlu bimbingan lebih lanjut terutama dalam hal ${needImprovement.join(", ")}. `;
    } else {
      text += `Pertahankan motivasi serta konsistensi belajarmu yang luar biasa ini di masa mendatang!`;
    }

    return text;
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

    if (tpTemplates.length === 0) {
      setError(
        "Harap isi atau tambahkan template Tujuan Pembelajaran (TP) terlebih dahulu.",
      );
      return;
    }

    setSaveLoading(true);

    // Format TP list for post payload
    const formattedTps: TPItem[] = tpTemplates.map((tp) => ({
      id: tp.id,
      text: tp.text,
      achieved: tpAchievements[tp.id] ?? true,
    }));

    const finalDescription = isCustomDescActive
      ? customDescription
      : getAutoDescription();

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
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan TP.");

      setNewTpText("");
      setSuccess("Tujuan Pembelajaran berhasil ditambahkan!");

      // Reload TP templates for this subject
      const resTp = await fetch("/api/tps");
      const tpData = await resTp.json();
      const subjectTps = tpData[user.subject] || [];
      setTpTemplates(subjectTps);

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

      // Reload TP templates
      const resTp = await fetch("/api/tps");
      const tpData = await resTp.json();
      const subjectTps = Array.isArray(tpData[user.subject])
        ? tpData[user.subject]
        : [];
      setTpTemplates(subjectTps);
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
          className="flex border-b border-slate-200 gap-1 mb-4"
          id="teacher-view-tabs"
        >
          <button
            onClick={() => setActiveViewTab("grades")}
            className={`py-1.5 px-3 uppercase tracking-wider text-[10px] font-extrabold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${activeViewTab === "grades" ? "border-emerald-800 text-emerald-850 bg-emerald-50/40" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <ClipboardPlus className="w-3.5 h-3.5" /> Pengisian Nilai &
            Deskripsi
          </button>
          <button
            onClick={() => setActiveViewTab("tps")}
            className={`py-1.5 px-3 uppercase tracking-wider text-[10px] font-extrabold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${activeViewTab === "tps" ? "border-emerald-800 text-emerald-850 bg-emerald-50/40" : "border-transparent text-slate-500 hover:text-slate-800"}`}
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
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-0.5">
                      Input Nilai & Kriteria
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Rentang Skala (0 - 100)
                    </span>
                    <span className="text-[9px] text-amber-600 dark:text-amber-400 block font-bold mt-0.5">
                      Kategori: &gt;91 = A, &ge;85 = B, &lt;85 = C
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-slate-700">
                      Nilai Akhir:
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={score}
                      onChange={(e) =>
                        handleScoreChange(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="0"
                      className="w-16 p-1 border-2 border-emerald-500 rounded text-center text-base font-bold bg-white text-emerald-950 focus:outline-none"
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
              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h4 className="font-extrabold text-[10px] text-slate-600 uppercase tracking-wider">
                      Tujuan Pembelajaran (TP) untuk Anak Ini
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Centang jika anak sudah optimal (Sangat Baik) pada TP
                      tersebut.
                    </p>
                  </div>
                </div>

                <div
                  className="space-y-1.5 max-h-48 overflow-y-auto"
                  id="tp-grading-list"
                >
                  {!Array.isArray(tpTemplates) || tpTemplates.length === 0 ? (
                    <div className="p-3 bg-amber-50 text-amber-900 text-xs rounded border border-amber-200 text-center font-medium">
                      Belum ada Tujuan Pembelajaran (TP) untuk mapel{" "}
                      <strong>{user.subject}</strong>. Silakan tambahkan pada
                      tab "Kelola TP".
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
                            className={`p-2 rounded-lg border text-[11px] transition cursor-pointer select-none flex items-start gap-2.5 ${
                              isChecked
                                ? "bg-transparent border-slate-200/60 hover:bg-emerald-50/20 dark:border-slate-800 dark:hover:bg-emerald-950/10"
                                : "bg-transparent border-slate-100 hover:bg-slate-50/30 dark:border-slate-900 dark:hover:bg-slate-850/20"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by parent div click
                              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5 dark:bg-slate-900 dark:border-slate-700"
                            />
                            <div className="flex-1">
                              <p className="text-slate-800 dark:text-slate-200 leading-normal">
                                {tp.text}
                              </p>
                              <span
                                className={`text-[8px] font-extrabold tracking-wide mt-0.5 inline-block uppercase py-0.5 rounded ${
                                  isChecked
                                    ? "text-green-700 dark:text-emerald-400"
                                    : "text-amber-700 dark:text-amber-400"
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
              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center mb-1.5">
                  <div>
                    <h4 className="font-extrabold text-[10px] text-slate-600 uppercase tracking-wider">
                      Narasi Deskripsi Raport
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Secara otomatis dihasilkan berdasarkan kriteria Usaha,
                      Proses, Capaian dan status TP di atas.
                    </p>
                  </div>
                  <label className="flex items-center gap-1 cursor-pointer text-[10px] font-semibold text-slate-650 hover:text-slate-800">
                    <input
                      type="checkbox"
                      checked={isCustomDescActive}
                      onChange={(e) => {
                        setIsCustomDescActive(e.target.checked);
                        if (e.target.checked)
                          setCustomDescription(getAutoDescription());
                      }}
                      className="w-3 h-3 rounded"
                    />
                    <span>Edit Manual</span>
                  </label>
                </div>

                <textarea
                  value={
                    isCustomDescActive
                      ? customDescription
                      : getAutoDescription()
                  }
                  onChange={(e) => setCustomDescription(e.target.value)}
                  disabled={!isCustomDescActive}
                  rows={4}
                  placeholder="Deskripsi nilai rapor otomatis..."
                  className="w-full p-2 border border-slate-200 rounded text-xs bg-slate-50 border-slate-205 focus:bg-white text-slate-700 leading-relaxed font-sans focus:outline-none"
                />
              </div>

              {/* Save trigger */}
              <div className="border-t border-slate-150 pt-3 text-right">
                <button
                  type="submit"
                  disabled={saveLoading || tpTemplates.length === 0}
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
            <div>
              <h3 className="font-bold text-xs text-slate-800 uppercase">
                Kelola Tujuan Pembelajaran (TP) - {user.subject}
              </h3>
              <p className="text-[10px] text-slate-400">
                Hubungkan materi dan kompetensi yang diujikan dalam raport untuk
                mapel Anda. Semua guru bebas menambahkan atau mengedit di sini!
              </p>
            </div>

            {/* Form to add custom learning objective directly by the teacher */}
            <form
              onSubmit={handleAddLocalTp}
              className="p-3 bg-emerald-50 rounded-lg border border-emerald-150 flex gap-2 items-end"
            >
              <div className="flex-1">
                <label className="block text-[9px] font-bold text-emerald-900 uppercase tracking-widest mb-1">
                  Tambah Tujuan Pembelajaran Baru:
                </label>
                <input
                  type="text"
                  required
                  value={newTpText}
                  onChange={(e) => setNewTpText(e.target.value)}
                  placeholder="Contoh: Mengidentifikasi rumus kuadratik dan diagram koordinat..."
                  className="w-full p-1.5 bg-white border border-emerald-250 rounded text-xs focus:outline-none focus:border-emerald-700"
                />
              </div>
              <button
                type="submit"
                disabled={tpSubmitLoading || !newTpText.trim()}
                className="bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white p-1.5 rounded cursor-pointer transition flex items-center justify-center h-[32px] w-[36px]"
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
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  Daftar TP Terdaftar (
                  {!Array.isArray(tpTemplates) ? 0 : tpTemplates.length})
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {!Array.isArray(tpTemplates) || tpTemplates.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400 italic">
                    Belum ada Tujuan Pembelajaran yang ditambahkan.
                  </p>
                ) : (
                  tpTemplates
                    .filter((tp) => tp && tp.id)
                    .map((tp, idx) => (
                      <div
                        key={tp.id}
                        className="p-2.5 flex items-start justify-between gap-3 bg-white hover:bg-slate-50/50 transition"
                      >
                        <div className="flex gap-2">
                          <span className="text-[10px] font-mono text-slate-350">
                            {idx + 1}.
                          </span>
                          <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                            {tp.text}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteLocalTp(tp.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition cursor-pointer shrink-0"
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
    </div>
  );
}
