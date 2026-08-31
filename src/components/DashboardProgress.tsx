import React, { useEffect, useState } from "react";
import { SchoolSummary } from "../types";
import {
  RefreshCw,
  BookMarked,
  Users,
  CheckCircle2,
  AlertCircle,
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

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 min-h-[300px] flex flex-col items-center justify-center rounded-xl border border-red-100 italic">
        <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
        <p>{error}</p>
        <button
          onClick={fetchSummary}
          className="mt-4 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-xs shrink-0 cursor-pointer"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!summary && loading) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[300px]"
        id="loading-summary"
      >
        <div className="w-10 h-10 border-4 border-emerald-800/30 border-t-emerald-850 rounded-full animate-spin mb-3"></div>
        <p className="text-gray-500 text-sm">
          Menghitung progres penginputan rapor sekolah...
        </p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6" id="dashboard-progress">
      {/* Top Banner stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="stats-grid">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-850 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
              Total Siswa Terdaftar
            </span>
            <span className="text-2xl font-bold text-gray-850">
              {summary.totalStudents} Siswa
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <BookMarked className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
              Total Guru Mata Pelajaran
            </span>
            <span className="text-2xl font-bold text-gray-850">
              {summary.totalTeachers} Guru
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-650 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
              Sinkronisasi Server
            </span>
            <span className="text-lg font-bold text-gray-850 flex items-center gap-1.5 mt-0.5">
              <span>Aktif Otomatis</span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping inline-block"></span>
            </span>
          </div>
        </div>
      </div>

      {/* Progress per Mata Pelajaran Grid (15 Subjects) */}
      <div
        className="bg-white rounded-lg border border-slate-200 shadow-xs p-4"
        id="subject-progress-card"
      >
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
              Progres Penginputan Nilai Keaslian (15 Mapel)
            </h2>
            <p className="text-[10px] text-slate-400">
              Status real-time keterisian raport Sumatif Tengah Semester (STS)
              oleh pengampu mapel
            </p>
          </div>
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold rounded transition cursor-pointer disabled:opacity-50"
            id="refresh-progress-button"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Perbarui Data
          </button>
        </div>

        {/* Global Progress Bar dynamic representation - HIGH DENSITY THEME FEATURE */}
        <div className="bg-slate-50 border border-slate-150 rounded-lg p-3.5 mb-5 shrink-0">
          <div className="flex justify-between items-end mb-2.5">
            <h3 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest">
              Kolom Visual Progres Input Kolektif
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 text-right">
              {Math.round(
                summary.subjectProgress.reduce(
                  (sum, curr) => sum + curr.percent,
                  0,
                ) / (summary.subjectProgress.length || 15),
              )}
              % Total Selesai
            </span>
          </div>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${summary.subjectProgress.length || 15}, minmax(0, 1fr))`,
            }}
          >
            {summary.subjectProgress.map((sub, idx) => (
              <div
                key={idx}
                className="text-center group relative cursor-pointer"
                title={`${sub.subject}: ${sub.percent}% selesai (Guru: ${sub.teacherName})`}
              >
                <div className="h-16 w-full bg-slate-200/50 rounded-md relative overflow-hidden flex flex-col justify-end">
                  <div
                    className="w-full bg-emerald-500 group-hover:bg-emerald-400 transition-all duration-500"
                    style={{ height: `${sub.percent}%` }}
                  ></div>
                </div>
                <span
                  className="text-[9px] font-bold mt-1 block truncate text-slate-750"
                  title={sub.subject}
                >
                  {sub.subject.length > 5
                    ? sub.subject.substring(0, 4) + "."
                    : sub.subject}
                </span>
                <span className="text-[8px] font-semibold text-emerald-800 font-mono mt-0.5 block">
                  {sub.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          id="subject-progress-grid"
        >
          {summary.subjectProgress.map((sub, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 block uppercase tracking-wide">
                      {sub.subject}
                    </h4>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                      Ust: {sub.teacherName}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${sub.percent === 100 ? "bg-green-100 text-green-700" : sub.percent > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {sub.percent}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${sub.percent === 100 ? "bg-green-600" : "bg-emerald-700"}`}
                    style={{ width: `${sub.percent}%` }}
                  ></div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-500 pt-2 border-t border-slate-100">
                <span>
                  Terisi: {sub.completed} / {sub.total} siswa
                </span>
                <span
                  className={
                    sub.percent === 100
                      ? "text-green-600"
                      : "text-amber-600 font-medium"
                  }
                >
                  {sub.percent === 100 ? "Selesai ✓" : "Sedang diisi"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress per Kelas (Wali Kelas helper) */}
      <div
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        id="class-progress-card"
      >
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Status Kesiapan Cetak Kelas
          </h2>
          <p className="text-xs text-gray-400 mb-5">
            Rapor siswa per kelas dapat dicetak/didownload jika progres
            penginputan 15 mapel mencapai 100%.
          </p>
        </div>

        <div className="space-y-4" id="class-progress-list">
          {summary.classProgress.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-4">
              Belum ada kelas terdaftar.
            </p>
          ) : (
            summary.classProgress.map((cls, idx) => (
              <div
                key={idx}
                className="p-4 border border-gray-100 rounded-xl bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-base text-emerald-850">
                      Kelas {cls.kelas}
                    </span>
                    <span className="text-xs text-gray-400">
                      • wali: {cls.waliKelasName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span>
                      Jumlah Siswa: <strong>{cls.studentCount}</strong>
                    </span>
                    <span>
                      Total Grades Terisi: <strong>{cls.filledGrades}</strong>{" "}
                      dari <strong>{cls.totalNeeded}</strong> poin nilai (15
                      mapel/siswa)
                    </span>
                  </div>
                </div>

                <div className="w-full md:w-64">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-gray-650">
                      Kesiapan Raport
                    </span>
                    <span className="font-bold text-emerald-850">
                      {cls.percent}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-150 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${cls.percent === 100 ? "bg-green-600" : "bg-emerald-700"}`}
                      style={{ width: `${cls.percent}%` }}
                    ></div>
                  </div>
                </div>

                <div className="shrink-0">
                  {cls.percent === 100 ? (
                    <span className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Siap Cetak
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full font-medium">
                      Menunggu Mapel
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
