import React, { useState, useEffect, useMemo } from "react";
import { Teacher, Student, Ekskul, StudentEkskulGrade } from "../types";
import {
  Award,
  Users,
  Search,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CheckSquare,
  Square,
  Layers,
  HelpCircle,
  Zap,
  Info,
  ShieldCheck,
  Filter,
} from "lucide-react";

interface EkskulPanelProps {
  currentUser: Teacher;
  onRefreshTrigger: () => void;
}

const DEFAULT_TEMPLATES = [
  "Menunjukkan kesungguhan, antusiasme, dan penguasaan teknik dasar yang sangat baik dalam kegiatan.",
  "Disiplin berlatih, aktif berkontribusi, serta memiliki sportivitas dan kerjasama tim yang handal.",
  "Mampu mengikuti arahan pembina dengan tertib dan menunjukkan perkembangan keterampilan yang positif.",
  "Cukup aktif dalam kegiatan, perlu sedikit peningkatan konsistensi dan inisiatif mandiri.",
];

export default function EkskulPanel({
  currentUser,
  onRefreshTrigger,
}: EkskulPanelProps) {
  const isSysAdmin =
    currentUser.username === "admin" || currentUser.subject === "Admin";

  const [ekskulList, setEkskulList] = useState<Ekskul[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allNotes, setAllNotes] = useState<{ [studentId: string]: any }>({});
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [selectedEkskulId, setSelectedEkskulId] = useState<string>("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Local map of student assessments for the selected ekskul: { [studentId]: StudentEkskulGrade & { selected: boolean } }
  const [studentGrades, setStudentGrades] = useState<{
    [studentId: string]: {
      selected: boolean;
      usaha: string;
      proses: string;
      capaian: string;
      description: string;
    };
  }>({});

  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [resE, resS, resN, resT] = await Promise.all([
        fetch("/api/ekskul"),
        fetch("/api/students"),
        fetch("/api/walikelas/notes"),
        fetch("/api/teachers"),
      ]);

      const eData = await resE.json();
      const sData = await resS.json();
      const nData = await resN.json();
      const tData = await resT.json();

      const eArr: Ekskul[] = Array.isArray(eData) ? eData : [];
      const sArr: Student[] = Array.isArray(sData) ? sData : [];
      const nObj = nData && typeof nData === "object" ? nData : {};
      const tArr: Teacher[] = Array.isArray(tData) ? tData : [];

      setEkskulList(eArr);
      setStudents(sArr);
      setAllNotes(nObj);
      setTeachers(tArr);

      // Auto-select ekskul for current teacher if they are pembina
      if (eArr.length > 0) {
        if (!selectedEkskulId) {
          const myEkskul = eArr.find(
            (e) =>
              (e.pembinaTeacherId && e.pembinaTeacherId === currentUser.id) ||
              (currentUser.isPembinaEkskul &&
                (currentUser.pembinaEkskulId === e.id ||
                  currentUser.pembinaEkskulName === e.name))
          );
          if (myEkskul) {
            setSelectedEkskulId(myEkskul.id);
          } else {
            setSelectedEkskulId(eArr[0].id);
          }
        }
      }
    } catch (err: any) {
      setError("Gagal memuat data ekstrakurikuler.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeEkskul = useMemo(() => {
    return ekskulList.find((e) => e.id === selectedEkskulId) || ekskulList[0];
  }, [ekskulList, selectedEkskulId]);

  // When activeEkskul, students, or allNotes change, initialize studentGrades
  useEffect(() => {
    if (!activeEkskul || students.length === 0) return;

    const initial: {
      [studentId: string]: {
        selected: boolean;
        usaha: string;
        proses: string;
        capaian: string;
        description: string;
      };
    } = {};

    students.forEach((s) => {
      const studentNote = allNotes[s.id];
      const ekskulArray: any[] =
        studentNote && Array.isArray(studentNote.ekskul)
          ? studentNote.ekskul
          : [];

      const match = ekskulArray.find(
        (item: any) =>
          (item.ekskulId && item.ekskulId === activeEkskul.id) ||
          (item.name && item.name.toLowerCase() === activeEkskul.name.toLowerCase())
      );

      if (match) {
        initial[s.id] = {
          selected: true,
          usaha: match.usaha || match.predicate || "B",
          proses: match.proses || match.predicate || "B",
          capaian: match.capaian || match.predicate || "B",
          description: match.description || match.deskripsi || "",
        };
      } else {
        // Default: Wajib is selected for everyone, Pilihan is unselected
        initial[s.id] = {
          selected: activeEkskul.type === "Wajib",
          usaha: "B",
          proses: "B",
          capaian: "B",
          description: "",
        };
      }
    });

    setStudentGrades(initial);
  }, [activeEkskul, students, allNotes]);

  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        const matchClass =
          selectedClassFilter === "all" ||
          String(s.kelas).trim() === String(selectedClassFilter).trim();
        const q = searchQuery.trim().toLowerCase();
        const matchSearch =
          !q ||
          s.name.toLowerCase().includes(q) ||
          String(s.nisn).includes(q);
        return matchClass && matchSearch;
      })
      .sort((a, b) => {
        if (selectedClassFilter === "all" && a.kelas !== b.kelas) {
          return String(a.kelas).localeCompare(String(b.kelas), "id", { numeric: true });
        }
        return String(a.name || "").localeCompare(String(b.name || ""), "id", { sensitivity: "base" });
      });
  }, [students, selectedClassFilter, searchQuery]);

  const participantCount = useMemo(() => {
    return Object.values(studentGrades).filter((g: any) => g && g.selected).length;
  }, [studentGrades]);

  const handleToggleStudent = (studentId: string) => {
    setStudentGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        selected: !prev[studentId]?.selected,
      },
    }));
  };

  const handleGradeChange = (
    studentId: string,
    field: "usaha" | "proses" | "capaian" | "description",
    val: string
  ) => {
    setStudentGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val,
      },
    }));
  };

  const handleQuickFillClass = (gradeValue: "A" | "B" | "C" | "D") => {
    setStudentGrades((prev) => {
      const updated = { ...prev };
      filteredStudents.forEach((s) => {
        if (updated[s.id]?.selected) {
          updated[s.id] = {
            ...updated[s.id],
            usaha: gradeValue,
            proses: gradeValue,
            capaian: gradeValue,
          };
        }
      });
      return updated;
    });
    setSuccess(
      `Berhasil mengisi nilai ${gradeValue} untuk seluruh santri yang aktif di kelas ini.`
    );
    setTimeout(() => setSuccess(""), 3500);
  };

  const handleSelectAllFiltered = (selectedState: boolean) => {
    setStudentGrades((prev) => {
      const updated = { ...prev };
      filteredStudents.forEach((s) => {
        updated[s.id] = {
          ...updated[s.id],
          selected: selectedState,
        };
      });
      return updated;
    });
  };

  const handleSaveAll = async () => {
    if (!activeEkskul) return;
    setSaveLoading(true);
    setError("");
    setSuccess("");

    try {
      const payloadGrades = Object.entries(studentGrades).map(
        ([studentId, g]: [string, any]) => ({
          studentId,
          ekskulId: activeEkskul.id,
          name: activeEkskul.name,
          type: activeEkskul.type,
          usaha: g?.usaha || "B",
          proses: g?.proses || "B",
          capaian: g?.capaian || "B",
          predicate: g?.capaian || "B",
          description: g?.description || "",
          pembinaName: activeEkskul.pembinaName || currentUser.name,
          pembinaTeacherId: activeEkskul.pembinaTeacherId || currentUser.id,
          selected: !!g?.selected,
        })
      );

      const res = await fetch("/api/ekskul/grades/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grades: payloadGrades }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan penilaian ekskul.");
      }

      setSuccess(
        `Alhamdulillah! Nilai ekstrakurikuler "${activeEkskul.name}" berhasil disimpan untuk ${participantCount} santri.`
      );
      onRefreshTrigger();

      // Refresh notes map
      const getNotes = await fetch("/api/walikelas/notes");
      const updatedNotes = await getNotes.json();
      setAllNotes(updatedNotes);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyimpan nilai.");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-12 animate-fade-in" id="ekskul-grading-panel">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-[#0d233a] via-[#102a45] to-[#0a192c] border border-sky-900/50 rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-1">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Penilaian Ekstrakurikuler Terpadu</span>
            </div>
            <h1 className="text-lg md:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Input Nilai Pembina Ekstrakurikuler</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Pengisian nilai ekstrakurikuler mencakup aspek{" "}
              <strong className="text-emerald-300">Usaha</strong>,{" "}
              <strong className="text-emerald-300">Proses</strong>, dan{" "}
              <strong className="text-emerald-300">Capaian</strong> serta deskripsi narasi kegiatan oleh Guru Pembina.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSaveAll}
              disabled={saveLoading || !activeEkskul}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saveLoading ? "Menyimpan ke Cloud..." : "Simpan Semua Nilai Ekskul"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 bg-red-900/30 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-900/30 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Ekskul Selection & Pembina Info */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0c1626] border border-[#1a2d47] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#1a2d47] pb-3 mb-3">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                Pilih Kegiatan Ekskul
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-bold">
                {ekskulList.length} Kegiatan
              </span>
            </div>

            <div className="space-y-2">
              {ekskulList.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 text-center">
                  Belum ada daftar ekstrakurikuler. Silakan tambahkan di Panel Admin.
                </p>
              ) : (
                ekskulList.map((eks) => {
                  const isSelected = activeEkskul?.id === eks.id;
                  const isMyAssigned =
                    (eks.pembinaTeacherId &&
                      eks.pembinaTeacherId === currentUser.id) ||
                    (currentUser.isPembinaEkskul &&
                      (currentUser.pembinaEkskulId === eks.id ||
                        currentUser.pembinaEkskulName === eks.name));

                  return (
                    <div
                      key={eks.id}
                      onClick={() => setSelectedEkskulId(eks.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? "bg-blue-600/20 border-blue-500 text-white ring-2 ring-blue-500/30"
                          : "bg-[#0f1d32] border-[#1e3452] text-slate-300 hover:bg-[#152742] hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{eks.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                            eks.type === "Wajib"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          }`}
                        >
                          {eks.type}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          Pembina:{" "}
                          <strong className="text-slate-200">
                            {eks.pembinaName || "Belum Ditugaskan"}
                          </strong>
                        </span>
                        {isMyAssigned && (
                          <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[8px] font-bold rounded border border-emerald-500/30">
                            Pembina Anda
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Guidelines Card */}
          <div className="bg-[#0c1626] border border-[#1a2d47] rounded-2xl p-4 text-xs space-y-2.5 text-slate-300">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Info className="w-3.5 h-3.5" />
              <span>Panduan Penilaian 3 Aspek</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Format penilaian rapor resmi SMP Islam Smart menggunakan 3 indikator:
            </p>
            <ul className="text-[11px] space-y-1.5 list-disc pl-4 text-slate-300">
              <li>
                <strong className="text-emerald-300">Usaha:</strong> Kerajinan, kesungguhan, dan kehadiran santri dalam mengikuti jadwal latihan.
              </li>
              <li>
                <strong className="text-emerald-300">Proses:</strong> Kedisiplinan, kerjasama tim, keaktifan, dan kepatuhan terhadap instruksi pembina.
              </li>
              <li>
                <strong className="text-emerald-300">Capaian:</strong> Penguasaan keterampilan teknis, peningkatan bakat, dan hasil performa.
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Students Grading List */}
        <div className="lg:col-span-8 space-y-4">
          {/* Controls & Quick Actions */}
          <div className="bg-[#0c1626] border border-[#1a2d47] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Filter Kelas:
                </span>
                <div className="inline-flex rounded-lg bg-[#070d18] p-1 border border-[#1a2d47]">
                  {["all", "7", "8", "9"].map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setSelectedClassFilter(cls)}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                        selectedClassFilter === cls
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {cls === "all" ? "Semua Kelas" : `Kelas ${cls}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama / NISN santri..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#070d18] border border-[#1a2d47] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Quick Bulk Assessment Buttons */}
            <div className="pt-2 border-t border-[#1a2d47] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Aksi Cepat:
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectAllFiltered(true)}
                  className="px-2.5 py-1 bg-[#13233c] hover:bg-[#1a3052] text-slate-200 border border-[#23426c] rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                >
                  <CheckSquare className="w-3 h-3 text-sky-400" />
                  Centang Semua
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllFiltered(false)}
                  className="px-2.5 py-1 bg-[#13233c] hover:bg-[#1a3052] text-slate-200 border border-[#23426c] rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                >
                  <Square className="w-3 h-3 text-slate-400" />
                  Hapus Centang
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Nilai Cepat:
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickFillClass("B")}
                  className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-emerald-400" />
                  Isi B (Baik)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFillClass("A")}
                  className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Isi A (Sangat Baik)
                </button>
              </div>
            </div>
          </div>

          {/* Student List Cards */}
          <div className="space-y-3">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center bg-[#0c1626] border border-[#1a2d47] rounded-2xl text-slate-400 text-xs italic">
                Tidak ada santri yang sesuai dengan filter pencarian.
              </div>
            ) : (
              filteredStudents.map((s, idx) => {
                const g = studentGrades[s.id] || {
                  selected: false,
                  usaha: "B",
                  proses: "B",
                  capaian: "B",
                  description: "",
                };

                return (
                  <div
                    key={s.id}
                    className={`rounded-2xl border transition duration-150 p-4 ${
                      g.selected
                        ? "bg-[#0c1626] border-emerald-500/40 shadow-sm"
                        : "bg-[#080f1a] border-[#152338] opacity-70"
                    }`}
                  >
                    {/* Header Row: Checkbox, Name, Class */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#162942]">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`check_${s.id}`}
                          checked={g.selected}
                          onChange={() => handleToggleStudent(s.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer bg-[#070d18] border-[#223b5c]"
                        />
                        <label
                          htmlFor={`check_${s.id}`}
                          className="cursor-pointer"
                        >
                          <span className="text-xs font-bold text-white hover:text-emerald-300 transition">
                            {idx + 1}. {s.name}
                          </span>
                          <span className="ml-2 font-mono text-[10px] text-slate-400">
                            NISN: {s.nisn}
                          </span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-bold">
                          Kelas {s.kelas}
                        </span>
                        {g.selected ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                            Mengikuti
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[9px] font-bold">
                            Tidak Ikut
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Inputs Row if Selected */}
                    {g.selected && (
                      <div className="pt-3 space-y-3 animate-fade-in">
                        {/* 3 Select Boxes: Usaha, Proses, Capaian */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                              1. Usaha
                            </label>
                            <select
                              value={g.usaha}
                              onChange={(e) =>
                                handleGradeChange(s.id, "usaha", e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 bg-[#070d18] border border-[#1e3452] rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                            >
                              <option value="A">A (Sangat Baik)</option>
                              <option value="B">B (Baik)</option>
                              <option value="C">C (Cukup)</option>
                              <option value="D">D (Kurang)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                              2. Proses
                            </label>
                            <select
                              value={g.proses}
                              onChange={(e) =>
                                handleGradeChange(s.id, "proses", e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 bg-[#070d18] border border-[#1e3452] rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                            >
                              <option value="A">A (Sangat Baik)</option>
                              <option value="B">B (Baik)</option>
                              <option value="C">C (Cukup)</option>
                              <option value="D">D (Kurang)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                              3. Capaian
                            </label>
                            <select
                              value={g.capaian}
                              onChange={(e) =>
                                handleGradeChange(s.id, "capaian", e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 bg-[#070d18] border border-[#1e3452] rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                            >
                              <option value="A">A (Sangat Baik)</option>
                              <option value="B">B (Baik)</option>
                              <option value="C">C (Cukup)</option>
                              <option value="D">D (Kurang)</option>
                            </select>
                          </div>
                        </div>

                        {/* Description input & template helpers */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Deskripsi / Keterangan Capaian Pembina
                          </label>
                          <input
                            type="text"
                            value={g.description}
                            onChange={(e) =>
                              handleGradeChange(
                                s.id,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Contoh: Sangat aktif, tekun berlatih, dan menunjukkan sportivitas yang tinggi..."
                            className="w-full px-3 py-1.5 bg-[#070d18] border border-[#1e3452] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                          />

                          {/* Quick Template Helper Buttons */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {DEFAULT_TEMPLATES.map((tmpl, tIdx) => (
                              <button
                                key={tIdx}
                                type="button"
                                onClick={() =>
                                  handleGradeChange(s.id, "description", tmpl)
                                }
                                className="px-2 py-0.5 rounded text-[9px] bg-[#102038] hover:bg-[#183054] text-slate-300 border border-[#203c64] transition cursor-pointer"
                                title={tmpl}
                              >
                                {tIdx === 0
                                  ? "💡 Sangat Baik & Antusias"
                                  : tIdx === 1
                                  ? "💡 Disiplin & Kerjasama"
                                  : tIdx === 2
                                  ? "💡 Perkembangan Positif"
                                  : "💡 Cukup Aktif"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Floating/Sticky Save Button */}
          <div className="p-4 bg-[#0c1626] border border-[#1a2d47] rounded-2xl flex items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              Total <strong className="text-white">{participantCount}</strong> dari{" "}
              <strong>{students.length}</strong> santri terdaftar mengikuti{" "}
              <strong className="text-emerald-300">{activeEkskul?.name}</strong>.
            </div>
            <button
              onClick={handleSaveAll}
              disabled={saveLoading || !activeEkskul}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saveLoading ? "Menyimpan ke Cloud..." : "Simpan Semua Nilai Ekskul"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
