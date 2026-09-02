import React, { useEffect, useState, useMemo } from "react";
import { SchoolSummary } from "../types";
import AestheticClock from "./AestheticClock";
import SplineWaveChart from "./SplineWaveChart";
import {
  RefreshCw,
  BookMarked,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Search,
  Layers,
  GraduationCap,
  PieChart,
  ShieldCheck,
  Zap,
  Filter,
  Award
} from "lucide-react";

interface DashboardProgressProps {
  onRefreshTrigger?: number;
}

export default function DashboardProgress({
  onRefreshTrigger,
}: DashboardProgressProps) {
  const [summary, setSummary] = useState<SchoolSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Subject filtering and search
  const [categoryFilter, setCategoryFilter] = useState<"all" | "nasional" | "islamic" | "muatan">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSummary = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/summary");
      if (!response.ok) throw new Error("Gagal memuat ringkasan data.");
      const data = await response.json();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || "Gagal menghubungkan ke server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [onRefreshTrigger]);

  // Subject categorization helper
  const categorizedSubjects = useMemo(() => {
    if (!summary?.subjectProgress) return [];

    const islamicSubjects = ["PAI", "Bahasa Arab", "Tahsin ABaTaTsa", "Tahfizh Al-Qur’an", "Do’a Harian dan Hadits", "Wudhu dan Sholat"];
    const muatanSubjects = ["Prakarya", "Informatika"];

    return summary.subjectProgress.map(sub => {
      let category: "nasional" | "islamic" | "muatan" = "nasional";
      if (islamicSubjects.includes(sub.subject)) {
        category = "islamic";
      } else if (muatanSubjects.includes(sub.subject)) {
        category = "muatan";
      }
      return {
        ...sub,
        category
      };
    });
  }, [summary]);

  const filteredSubjects = useMemo(() => {
    return categorizedSubjects.filter(sub => {
      const matchesCategory = categoryFilter === "all" || sub.category === categoryFilter;
      const matchesSearch = sub.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            sub.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [categorizedSubjects, categoryFilter, searchQuery]);

  // Overall Statistics calculations
  const stats = useMemo(() => {
    if (!summary?.subjectProgress || summary.subjectProgress.length === 0) {
      return {
        overallPercent: 0,
        completedCount: 0,
        inProgressCount: 0,
        unstartedCount: 0,
        totalGradesFilled: 0,
        totalGradesRequired: 0
      };
    }

    const totalSubjects = summary.subjectProgress.length;
    const sumPercent = summary.subjectProgress.reduce((acc, curr) => acc + curr.percent, 0);
    const overallPercent = Math.round(sumPercent / totalSubjects);

    const completedCount = summary.subjectProgress.filter(s => s.percent === 100).length;
    const inProgressCount = summary.subjectProgress.filter(s => s.percent > 0 && s.percent < 100).length;
    const unstartedCount = summary.subjectProgress.filter(s => s.percent === 0).length;

    const totalGradesFilled = summary.classProgress.reduce((acc, curr) => acc + curr.filledGrades, 0);
    const totalGradesRequired = summary.classProgress.reduce((acc, curr) => acc + curr.totalNeeded, 0);

    return {
      overallPercent,
      completedCount,
      inProgressCount,
      unstartedCount,
      totalGradesFilled,
      totalGradesRequired
    };
  }, [summary]);

  if (error) {
    return (
      <div className="p-8 bg-slate-900 border border-rose-500/30 text-slate-100 min-h-[300px] flex flex-col items-center justify-center rounded-2xl shadow-xl space-y-4" id="dashboard-error">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-base font-bold text-white">Gagal Memuat Telemetri</h3>
          <p className="text-xs text-rose-300/80">{error}</p>
        </div>
        <button
          onClick={fetchSummary}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold tracking-wide shadow-lg shadow-emerald-950/40 transition cursor-pointer flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Hubungkan Ulang
        </button>
      </div>
    );
  }

  if (!summary && loading) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[350px] p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 text-center"
        id="loading-summary"
      >
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-emerald-400 border-r-teal-400 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-2 border-emerald-400/20"></div>
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white tracking-wide">Sinkronisasi Data Telemetri Rapor...</h4>
          <p className="text-xs text-emerald-400/70 font-mono">
            Menganalisis matriks progres 15 mata pelajaran & kelas...
          </p>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-5 animate-fade-in" id="dashboard-progress">
      {/* Top Banner Header (Style from Screenshot) */}
      <div className="rounded-2xl bg-[#0c1322] border border-[#1a2948] p-5 md:p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            {/* Pill Badges on Top */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-bold font-mono">
                <BookMarked className="w-3.5 h-3.5" />
                RAPORT STS GANJIL 2026/2027
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold font-mono">
                <GraduationCap className="w-3.5 h-3.5" />
                MODE SMP KURIKULUM MERDEKA
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Dashboard Pemantauan Raport STS SMP
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Pangkalpinang - Visualisasi real-time sebaran nilai 15 mata pelajaran, rasio ketuntasan TP, dan kesiapan cetak raport seluruh kelas.
            </p>
          </div>

          {/* Action Button on Right */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchSummary}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-900/40 border border-blue-400/40 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Perbarui Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row of 4 Metric Stat Cards (Matching Screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
        {/* Card 1: TOTAL SISWA TERDAFTAR */}
        <div className="rounded-2xl bg-[#0c1322] p-5 border border-[#1a2948] shadow-md flex flex-col justify-between hover:border-blue-500/40 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                TOTAL SISWA TERDAFTAR
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div className="text-3xl font-black text-white tracking-tight">
              {summary.totalStudents}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Fisik siswa terdaftar di Mode SMP
          </p>
        </div>

        {/* Card 2: MAPEL TUNTAS (100%) */}
        <div className="rounded-2xl bg-[#0c1322] p-5 border border-[#1a2948] shadow-md flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                MAPEL TUNTAS (100%)
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">
                {stats.completedCount}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold font-mono">
                {Math.round((stats.completedCount / (summary.subjectProgress.length || 1)) * 100)}%
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Siap digunakan & dicetak tanpa kendala
          </p>
        </div>

        {/* Card 3: BELUM TUNTAS / PERLU PERHATIAN */}
        <div className="rounded-2xl bg-[#0c1322] p-5 border border-[#1a2948] shadow-md flex flex-col justify-between hover:border-amber-500/40 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                BELUM TUNTAS / PERHATIAN
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-400 tracking-tight">
                {stats.inProgressCount + stats.unstartedCount}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold font-mono">
                {Math.round(((stats.inProgressCount + stats.unstartedCount) / (summary.subjectProgress.length || 1)) * 100)}%
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            {stats.inProgressCount} sedang diisi, {stats.unstartedCount} belum dimulai
          </p>
        </div>

        {/* Card 4: TOTAL KELAS & ROMBEL */}
        <div className="rounded-2xl bg-[#0c1322] p-5 border border-[#1a2948] shadow-md flex flex-col justify-between hover:border-purple-500/40 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                TOTAL KELAS / LOKASI
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>

            <div className="text-3xl font-black text-purple-400 tracking-tight">
              {summary.classProgress.length || 3}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Fasilitas Kelas 7, 8, 9 di Mode SMP
          </p>
        </div>
      </div>

      {/* Visual Analytics Main Section (Matching Screenshot Wave Chart Section) */}
      <div className="rounded-2xl bg-[#0c1322] border border-[#1a2948] p-5 md:p-6 shadow-xl space-y-5" id="telemetry-overview-section">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1a2948]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm md:text-base font-extrabold text-white tracking-tight">
                Analisis Visual Progres Nilai Per Mapel & Kelas
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Pemantauan sebaran ketuntasan 15 mata pelajaran, rasio ketercapaian TP, serta intensitas penginputan nilai secara real-time.
            </p>
          </div>

          {/* Search Box in Section Header */}
          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari mapel / guru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#080d1a] border border-[#1a2948] text-slate-200 focus:outline-none focus:border-blue-500 w-full sm:w-56"
            />
          </div>
        </div>

        {/* Wave Spline Graphic Panel */}
        <div>
          <div className="flex items-center justify-between text-xs mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider font-mono">
                GRAFIK SEBARAN NILAI & KONDISI FISIK KETUNTASAN PER MAPEL
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Nilai Tuntas (100%)
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Sedang Diisi / Belum
              </span>
            </div>
          </div>

          {/* Interactive Spline Chart */}
          <SplineWaveChart 
            data={filteredSubjects} 
            overallAverage={stats.overallPercent} 
          />
        </div>
      </div>

      {/* Bottom Grid: Aesthetic Clock & Subject Breakdown List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Aesthetic Live Clock Widget (4 Cols) */}
        <div className="lg:col-span-4">
          <AestheticClock variant="card" className="h-full min-h-[220px]" />
        </div>

        {/* Right: Category Filter Chips & Progress List (8 Cols) */}
        <div className="lg:col-span-8 rounded-2xl bg-[#0c1322] border border-[#1a2948] p-5 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Daftar Progres 15 Mata Pelajaran
                  </h3>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Filter berdasarkan kelompok kurikulum & status ketuntasan guru
                </p>
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center p-1 rounded-xl bg-[#080d1a] border border-[#1a2948]">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                    categoryFilter === "all"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Semua ({summary.subjectProgress.length})
                </button>
                <button
                  onClick={() => setCategoryFilter("nasional")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                    categoryFilter === "nasional"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Nasional
                </button>
                <button
                  onClick={() => setCategoryFilter("islamic")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                    categoryFilter === "islamic"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Islamic
                </button>
                <button
                  onClick={() => setCategoryFilter("muatan")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                    categoryFilter === "muatan"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Muatan
                </button>
              </div>
            </div>

            {/* Quick mini-table list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {filteredSubjects.map((sub, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#080d1a] border border-[#1a2948] hover:border-blue-500/40 transition text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-slate-200 truncate">{sub.subject}</div>
                    <div className="text-[10px] text-slate-400 truncate">{sub.teacherName}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        sub.percent === 100
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : sub.percent > 0
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {sub.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#1a2948] flex items-center justify-between text-[11px] text-slate-400">
            <span>Total Nilai Terisi Sekolah:</span>
            <span className="font-mono font-bold text-emerald-400">
              {stats.totalGradesFilled} / {stats.totalGradesRequired} Siswa ({stats.overallPercent}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
