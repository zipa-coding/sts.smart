import React, { useState, useEffect, useMemo } from "react";
import { Student, Grade } from "../types";
import { detectForeignStudentNamesInDescription } from "../lib/raportPdfService";
import {
  ShieldAlert,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  Users,
  Copy,
} from "lucide-react";

interface OrphanGradeItem {
  docId: string;
  studentId: string;
  studentNameSnapshot: string;
  kelasSnapshot: string;
  subject: string;
  score: number;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

interface ForeignNameInDescriptionItem {
  docId: string;
  studentId: string;
  studentName: string;
  kelas: string;
  subject: string;
  detectedForeignNames: string[];
  deskripsi: string;
}

interface DuplicateSubjectGradeItem {
  studentId: string;
  studentName: string;
  kelas: string;
  subject: string;
  documentCount: number;
  docIds: string[];
  scores: number[];
}

interface DuplicateStudentNameInClassItem {
  kelas: string;
  normalizedName: string;
  displayName: string;
  count: number;
  studentIds: string[];
  nisns: string[];
}

interface NonStandardGradeDocIdItem {
  docId: string;
  expectedDocId: string;
  studentId: string;
  studentName: string;
  kelas: string;
  subject: string;
  score: number;
  lastUpdatedAt: string;
}

export default function AuditDataPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastCheckedAt, setLastCheckedAt] = useState<string>("");

  const fetchAuditData = async () => {
    setLoading(true);
    setError("");
    try {
      const [resS, resG] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/grades"),
      ]);

      if (!resS.ok || !resG.ok) {
        throw new Error(
          "Gagal memuat data dari server. Periksa koneksi lalu muat ulang."
        );
      }

      const sData = await resS.json();
      const gData = await resG.json();

      setStudents(Array.isArray(sData) ? sData : []);
      setGrades(Array.isArray(gData) ? gData : []);
      setLastCheckedAt(new Date().toISOString());
    } catch (err: any) {
      setError(
        err?.message ||
          "Gagal memuat data dari server. Periksa koneksi lalu muat ulang."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const normalizeSubject = (s: string | undefined | null) => {
    if (!s) return "";
    return s
      .toLowerCase()
      .replace(/[’'"`]/g, "'")
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  // (a) Dokumen grades yang studentId-nya tidak ada di students
  const orphanGrades = useMemo<OrphanGradeItem[]>(() => {
    const studentMap = new Map<string, Student>();
    students.forEach((s) => {
      if (s && s.id) {
        studentMap.set(String(s.id).trim(), s);
      }
    });

    const result: OrphanGradeItem[] = [];
    grades.forEach((g, idx) => {
      if (!g) return;
      const sid = String(g.studentId || "").trim();
      if (!sid || !studentMap.has(sid)) {
        const fallbackDocId = `${sid}_${String(g.subject || "").replace(/[^a-zA-Z0-9]/g, "_")}`;
        result.push({
          docId: g._docId || fallbackDocId || `grade_${idx}`,
          studentId: sid || "(kosong)",
          studentNameSnapshot: g.studentName || "-",
          kelasSnapshot: g.kelas || "-",
          subject: g.subject || "-",
          score: Number(g.score ?? 0),
          lastUpdatedBy: g.lastUpdatedBy || g.teacherName || "-",
          lastUpdatedAt: g.lastUpdatedAt || "-",
        });
      }
    });

    return result;
  }, [students, grades]);

  // (b) Deskripsi nilai yang memuat nama siswa lain dari kelas yang sama
  const foreignNameDescriptions = useMemo<ForeignNameInDescriptionItem[]>(() => {
    const studentMap = new Map<string, Student>();
    students.forEach((s) => {
      if (s && s.id) {
        studentMap.set(String(s.id).trim(), s);
      }
    });

    const result: ForeignNameInDescriptionItem[] = [];
    grades.forEach((g, idx) => {
      if (!g || !g.deskripsi || !g.deskripsi.trim()) return;
      const sid = String(g.studentId || "").trim();
      const targetStudent = studentMap.get(sid);
      if (!targetStudent) return;

      const foreignNames = detectForeignStudentNamesInDescription(
        g.deskripsi,
        targetStudent,
        students
      );

      if (foreignNames.length > 0) {
        const fallbackDocId = `${sid}_${String(g.subject || "").replace(/[^a-zA-Z0-9]/g, "_")}`;
        result.push({
          docId: g._docId || fallbackDocId || `grade_${idx}`,
          studentId: sid,
          studentName: targetStudent.name,
          kelas: targetStudent.kelas,
          subject: g.subject || "-",
          detectedForeignNames: foreignNames,
          deskripsi: g.deskripsi,
        });
      }
    });

    return result;
  }, [students, grades]);

  // (c) Siswa yang punya lebih dari satu dokumen grades untuk mapel yang sama
  const duplicateSubjectGrades = useMemo<DuplicateSubjectGradeItem[]>(() => {
    const studentMap = new Map<string, Student>();
    students.forEach((s) => {
      if (s && s.id) {
        studentMap.set(String(s.id).trim(), s);
      }
    });

    const groupMap = new Map<
      string,
      {
        studentId: string;
        subject: string;
        docs: { docId: string; score: number }[];
      }
    >();

    grades.forEach((g, idx) => {
      if (!g) return;
      const sid = String(g.studentId || "").trim();
      const normSub = normalizeSubject(g.subject);
      if (!sid || !normSub) return;

      const key = `${sid}__${normSub}`;
      const fallbackDocId = `${sid}_${String(g.subject || "").replace(/[^a-zA-Z0-9]/g, "_")}`;
      const docId = g._docId || `${fallbackDocId}#${idx + 1}`;

      const existing = groupMap.get(key);
      if (existing) {
        existing.docs.push({ docId, score: Number(g.score ?? 0) });
      } else {
        groupMap.set(key, {
          studentId: sid,
          subject: g.subject || normSub,
          docs: [{ docId, score: Number(g.score ?? 0) }],
        });
      }
    });

    const result: DuplicateSubjectGradeItem[] = [];
    groupMap.forEach((val) => {
      if (val.docs.length > 1) {
        const st = studentMap.get(val.studentId);
        result.push({
          studentId: val.studentId,
          studentName: st?.name || "(Siswa Tidak Ditemukan)",
          kelas: st?.kelas || "-",
          subject: val.subject,
          documentCount: val.docs.length,
          docIds: val.docs.map((d) => d.docId),
          scores: val.docs.map((d) => d.score),
        });
      }
    });

    return result;
  }, [students, grades]);

  // (d) Nama siswa ganda di kelas yang sama
  const duplicateStudentNamesInClass = useMemo<
    DuplicateStudentNameInClassItem[]
  >(() => {
    const groupMap = new Map<
      string,
      {
        kelas: string;
        normalizedName: string;
        displayName: string;
        students: Student[];
      }
    >();

    students.forEach((s) => {
      if (!s || !s.name) return;
      const kelas = String(s.kelas || "").trim();
      const normName = s.name.trim().toLowerCase().replace(/\s+/g, " ");
      if (!normName) return;

      const key = `${kelas}__${normName}`;
      const existing = groupMap.get(key);
      if (existing) {
        existing.students.push(s);
      } else {
        groupMap.set(key, {
          kelas,
          normalizedName: normName,
          displayName: s.name.trim(),
          students: [s],
        });
      }
    });

    const result: DuplicateStudentNameInClassItem[] = [];
    groupMap.forEach((val) => {
      if (val.students.length > 1) {
        result.push({
          kelas: val.kelas,
          normalizedName: val.normalizedName,
          displayName: val.displayName,
          count: val.students.length,
          studentIds: val.students.map((s) => s.id),
          nisns: val.students.map((s) => s.nisn || "-"),
        });
      }
    });

    return result;
  }, [students]);

  // (e) Dokumen grades yang ID-nya tidak sesuai rumus standar (studentId_mapel)
  const nonStandardGradeDocIds = useMemo<NonStandardGradeDocIdItem[]>(() => {
    const studentMap = new Map<string, Student>();
    students.forEach((s) => {
      if (s && s.id) {
        studentMap.set(String(s.id).trim(), s);
      }
    });

    const result: NonStandardGradeDocIdItem[] = [];
    grades.forEach((g) => {
      if (!g) return;
      const actualDocId = String(g._docId || (g as any).id || "").trim();
      const sid = String(g.studentId || "").trim();
      const subj = String(g.subject || "").trim();
      if (!actualDocId || !sid || !subj) return;

      const cleanSub = subj.replace(/[^a-zA-Z0-9]/g, "_");
      const expectedDocId = `${sid}_${cleanSub}`;

      if (actualDocId !== expectedDocId) {
        const st = studentMap.get(sid);
        result.push({
          docId: actualDocId,
          expectedDocId,
          studentId: sid,
          studentName: st?.name || g.studentName || "-",
          kelas: st?.kelas || g.kelas || "-",
          subject: subj,
          score: Number(g.score ?? 0),
          lastUpdatedAt: g.lastUpdatedAt || "-",
        });
      }
    });

    return result;
  }, [students, grades]);

  const handleDownloadJsonReport = () => {
    const reportPayload = {
      generatedAt: new Date().toISOString(),
      mode: "READ_ONLY_AUDIT",
      summary: {
        totalStudents: students.length,
        totalGradesDocuments: grades.length,
        orphanGradesCount: orphanGrades.length,
        foreignNameDescriptionsCount: foreignNameDescriptions.length,
        duplicateSubjectGradesCount: duplicateSubjectGrades.length,
        duplicateStudentNamesInClassCount: duplicateStudentNamesInClass.length,
        nonStandardGradeDocIdsCount: nonStandardGradeDocIds.length,
      },
      findings: {
        a_orphanGradesWithoutStudent: orphanGrades,
        b_descriptionsWithForeignStudentName: foreignNameDescriptions,
        c_duplicateGradesPerStudentSubject: duplicateSubjectGrades,
        d_duplicateStudentNamesInSameClass: duplicateStudentNamesInClass,
        e_nonStandardGradeDocIds: nonStandardGradeDocIds,
      },
    };

    const blob = new Blob([JSON.stringify(reportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const datePart = new Date().toISOString().slice(0, 10);
    a.download = `audit-integritas-data-smart-sts-${datePart}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalFindings =
    orphanGrades.length +
    foreignNameDescriptions.length +
    duplicateSubjectGrades.length +
    duplicateStudentNamesInClass.length +
    nonStandardGradeDocIds.length;

  return (
    <div className="space-y-6 text-white" id="audit-data-panel">
      {/* Header Banner */}
      <div className="bg-[#0f172a] border-2 border-[#253e66] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-950/90 text-amber-300 border border-amber-500/50 text-[11px] font-black uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Mode Baca-Saja (Read-Only) • Tidak Mengubah Data</span>
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-wide">
            Audit Integritas Data Siswa &amp; Nilai Firestore
          </h2>
          <p className="text-xs text-slate-300 font-medium">
            Memeriksa konsistensi ID siswa, deskripsi lintas nama di kelas yang sama, duplikasi dokumen nilai per mapel, dan nama siswa ganda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchAuditData}
            disabled={loading}
            className="px-4 py-2.5 bg-[#142036] hover:bg-[#1c2e4e] text-white font-black text-xs rounded-xl border-2 border-[#2b4168] flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Memeriksa..." : "Muat Ulang Audit"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJsonReport}
            disabled={loading || !!error}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl border-2 border-emerald-300 flex items-center gap-2 cursor-pointer transition disabled:opacity-50 shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Laporan JSON</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/90 border-2 border-red-500 rounded-xl text-xs font-black text-white flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-[#0f172a] border-2 border-[#253e66] space-y-1">
          <span className="text-[11px] font-black text-slate-300 uppercase">
            (a) Nilai Tanpa Siswa Valid
          </span>
          <div className="text-2xl font-black font-mono text-amber-300">
            {orphanGrades.length}
          </div>
          <p className="text-[11px] text-slate-400">
            Dokumen <code>grades</code> yang <code>studentId</code>-nya tidak ada di <code>students</code>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0f172a] border-2 border-[#253e66] space-y-1">
          <span className="text-[11px] font-black text-slate-300 uppercase">
            (b) Deskripsi Memuat Nama Lain
          </span>
          <div className="text-2xl font-black font-mono text-rose-300">
            {foreignNameDescriptions.length}
          </div>
          <p className="text-[11px] text-slate-400">
            Deskripsi nilai yang memuat nama siswa lain di kelas yang sama
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0f172a] border-2 border-[#253e66] space-y-1">
          <span className="text-[11px] font-black text-slate-300 uppercase">
            (c) Nilai Mapel Ganda
          </span>
          <div className="text-2xl font-black font-mono text-sky-300">
            {duplicateSubjectGrades.length}
          </div>
          <p className="text-[11px] text-slate-400">
            Siswa dengan &gt;1 dokumen <code>grades</code> pada mata pelajaran yang sama
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0f172a] border-2 border-[#253e66] space-y-1">
          <span className="text-[11px] font-black text-slate-300 uppercase">
            (d) Nama Siswa Ganda Sekelas
          </span>
          <div className="text-2xl font-black font-mono text-purple-300">
            {duplicateStudentNamesInClass.length}
          </div>
          <p className="text-[11px] text-slate-400">
            Nama siswa yang terduplikasi di dalam kelas yang sama
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0f172a] border-2 border-[#253e66] space-y-1">
          <span className="text-[11px] font-black text-slate-300 uppercase">
            (e) ID Dokumen Non-Standar
          </span>
          <div className="text-2xl font-black font-mono text-orange-300">
            {nonStandardGradeDocIds.length}
          </div>
          <p className="text-[11px] text-slate-400">
            Dokumen <code>grades</code> dengan ID bukan <code>studentId_mapel</code>
          </p>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 py-2.5 rounded-xl bg-[#142036] border border-[#294269] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-bold">
          {totalFindings === 0 ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300">
                Tidak ditemukan anomali pada kelima kategori audit.
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-200">
                Ditemukan total <strong>{totalFindings}</strong> temuan audit dari{" "}
                <strong>{students.length}</strong> siswa &amp;{" "}
                <strong>{grades.length}</strong> dokumen nilai.
              </span>
            </>
          )}
        </div>
        {lastCheckedAt && (
          <span className="text-[11px] text-slate-400 font-mono">
            Diperiksa: {new Date(lastCheckedAt).toLocaleString("id-ID")}
          </span>
        )}
      </div>

      {/* Section (a) */}
      <div className="bg-[#0f172a] border-2 border-[#253e66] rounded-2xl overflow-hidden shadow-md">
        <div className="px-5 py-3.5 bg-[#142036] border-b border-[#253e66] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-amber-400" />
            <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-white">
              (a) Dokumen Grades dengan studentId Tidak Terdaftar di Students ({orphanGrades.length})
            </h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0b1324] text-slate-300 border-b border-[#253e66] uppercase text-[11px] font-black">
                <th className="py-2.5 px-4">No</th>
                <th className="py-2.5 px-4">ID Dokumen</th>
                <th className="py-2.5 px-4">studentId</th>
                <th className="py-2.5 px-4">Snapshot Nama / Kelas</th>
                <th className="py-2.5 px-4">Mata Pelajaran</th>
                <th className="py-2.5 px-4">Nilai</th>
                <th className="py-2.5 px-4">Diperbarui Oleh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3152]">
              {orphanGrades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                    Tidak ada dokumen grades yatim (seluruh studentId terdaftar di koleksi students).
                  </td>
                </tr>
              ) : (
                orphanGrades.map((item, idx) => (
                  <tr key={`${item.docId}_${idx}`} className="hover:bg-[#142036]/60">
                    <td className="py-2.5 px-4 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-mono text-amber-300">{item.docId}</td>
                    <td className="py-2.5 px-4 font-mono text-rose-300 font-bold">{item.studentId}</td>
                    <td className="py-2.5 px-4">
                      {item.studentNameSnapshot} (Kelas {item.kelasSnapshot})
                    </td>
                    <td className="py-2.5 px-4 font-bold">{item.subject}</td>
                    <td className="py-2.5 px-4 font-mono font-bold">{item.score}</td>
                    <td className="py-2.5 px-4 text-slate-300">{item.lastUpdatedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section (b) */}
      <div className="bg-[#0f172a] border-2 border-[#253e66] rounded-2xl overflow-hidden shadow-md">
        <div className="px-5 py-3.5 bg-[#142036] border-b border-[#253e66] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-white">
              (b) Deskripsi Nilai yang Memuat Nama Siswa Lain dari Kelas yang Sama ({foreignNameDescriptions.length})
            </h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0b1324] text-slate-300 border-b border-[#253e66] uppercase text-[11px] font-black">
                <th className="py-2.5 px-4">No</th>
                <th className="py-2.5 px-4">Siswa Pemilik Nilai</th>
                <th className="py-2.5 px-4">Kelas</th>
                <th className="py-2.5 px-4">Mapel</th>
                <th className="py-2.5 px-4">Nama Siswa Lain yang Terdeteksi</th>
                <th className="py-2.5 px-4">Cuplikan Deskripsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3152]">
              {foreignNameDescriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                    Tidak ada deskripsi nilai yang memuat nama siswa lain dari kelas yang sama.
                  </td>
                </tr>
              ) : (
                foreignNameDescriptions.map((item, idx) => (
                  <tr key={`${item.docId}_${idx}`} className="hover:bg-[#142036]/60">
                    <td className="py-2.5 px-4 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-bold">
                      {item.studentName}
                      <div className="text-[10px] font-mono text-slate-400">ID: {item.studentId}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono">Kelas {item.kelas}</td>
                    <td className="py-2.5 px-4 font-bold">{item.subject}</td>
                    <td className="py-2.5 px-4 font-bold text-rose-300">
                      {item.detectedForeignNames.join(", ")}
                    </td>
                    <td className="py-2.5 px-4 text-slate-200 max-w-md">
                      <div className="line-clamp-3">{item.deskripsi}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section (c) */}
      <div className="bg-[#0f172a] border-2 border-[#253e66] rounded-2xl overflow-hidden shadow-md">
        <div className="px-5 py-3.5 bg-[#142036] border-b border-[#253e66] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-sky-400" />
            <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-white">
              (c) Siswa dengan Lebih dari Satu Dokumen Grades pada Mapel yang Sama ({duplicateSubjectGrades.length})
            </h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0b1324] text-slate-300 border-b border-[#253e66] uppercase text-[11px] font-black">
                <th className="py-2.5 px-4">No</th>
                <th className="py-2.5 px-4">Nama Siswa</th>
                <th className="py-2.5 px-4">Kelas</th>
                <th className="py-2.5 px-4">Mata Pelajaran</th>
                <th className="py-2.5 px-4">Jumlah Dokumen</th>
                <th className="py-2.5 px-4">Daftar Nilai</th>
                <th className="py-2.5 px-4">ID Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3152]">
              {duplicateSubjectGrades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                    Tidak ada duplikasi dokumen grades untuk siswa dan mata pelajaran yang sama.
                  </td>
                </tr>
              ) : (
                duplicateSubjectGrades.map((item, idx) => (
                  <tr key={`${item.studentId}_${item.subject}_${idx}`} className="hover:bg-[#142036]/60">
                    <td className="py-2.5 px-4 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-bold">
                      {item.studentName}
                      <div className="text-[10px] font-mono text-slate-400">ID: {item.studentId}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono">Kelas {item.kelas}</td>
                    <td className="py-2.5 px-4 font-bold">{item.subject}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-sky-300">
                      {item.documentCount} dokumen
                    </td>
                    <td className="py-2.5 px-4 font-mono">{item.scores.join(", ")}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-300">
                      {item.docIds.join(", ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section (d) */}
      <div className="bg-[#0f172a] border-2 border-[#253e66] rounded-2xl overflow-hidden shadow-md">
        <div className="px-5 py-3.5 bg-[#142036] border-b border-[#253e66] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-white">
              (d) Nama Siswa Ganda di Kelas yang Sama ({duplicateStudentNamesInClass.length})
            </h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0b1324] text-slate-300 border-b border-[#253e66] uppercase text-[11px] font-black">
                <th className="py-2.5 px-4">No</th>
                <th className="py-2.5 px-4">Nama Siswa</th>
                <th className="py-2.5 px-4">Kelas</th>
                <th className="py-2.5 px-4">Jumlah Duplikat</th>
                <th className="py-2.5 px-4">Daftar studentId</th>
                <th className="py-2.5 px-4">Daftar NISN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3152]">
              {duplicateStudentNamesInClass.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                    Tidak ada nama siswa ganda di kelas yang sama.
                  </td>
                </tr>
              ) : (
                duplicateStudentNamesInClass.map((item, idx) => (
                  <tr key={`${item.kelas}_${item.normalizedName}_${idx}`} className="hover:bg-[#142036]/60">
                    <td className="py-2.5 px-4 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-bold text-purple-200">{item.displayName}</td>
                    <td className="py-2.5 px-4 font-mono">Kelas {item.kelas}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-purple-300">
                      {item.count} siswa
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-300">
                      {item.studentIds.join(", ")}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-300">
                      {item.nisns.join(", ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section (e) */}
      <div className="bg-[#0f172a] border-2 border-[#253e66] rounded-2xl overflow-hidden shadow-md">
        <div className="px-5 py-3.5 bg-[#142036] border-b border-[#253e66] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-orange-400" />
            <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-white">
              (e) Dokumen Grades dengan ID Tidak Sesuai Rumus Standar (studentId_mapel) ({nonStandardGradeDocIds.length})
            </h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0b1324] text-slate-300 border-b border-[#253e66] uppercase text-[11px] font-black">
                <th className="py-2.5 px-4">No</th>
                <th className="py-2.5 px-4">ID Dokumen Aktual</th>
                <th className="py-2.5 px-4">ID Standar Seharusnya</th>
                <th className="py-2.5 px-4">Nama Siswa / studentId</th>
                <th className="py-2.5 px-4">Kelas</th>
                <th className="py-2.5 px-4">Mata Pelajaran</th>
                <th className="py-2.5 px-4">Nilai</th>
                <th className="py-2.5 px-4">Terakhir Diperbarui</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3152]">
              {nonStandardGradeDocIds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                    Seluruh dokumen grades telah memiliki ID sesuai rumus standar (studentId_mapel).
                  </td>
                </tr>
              ) : (
                nonStandardGradeDocIds.map((item, idx) => (
                  <tr key={`${item.docId}_${idx}`} className="hover:bg-[#142036]/60">
                    <td className="py-2.5 px-4 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-orange-300">{item.docId}</td>
                    <td className="py-2.5 px-4 font-mono text-emerald-300">{item.expectedDocId}</td>
                    <td className="py-2.5 px-4 font-bold">
                      {item.studentName}
                      <div className="text-[10px] font-mono text-slate-400">ID: {item.studentId}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono">Kelas {item.kelas}</td>
                    <td className="py-2.5 px-4 font-bold">{item.subject}</td>
                    <td className="py-2.5 px-4 font-mono font-bold">{item.score}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-300">{item.lastUpdatedAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
