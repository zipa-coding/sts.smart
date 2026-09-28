import React, { useState, useEffect, useRef } from "react";
import { Teacher, Student, Grade, Halaqoh } from "../types";
import {
  Download,
  Printer,
  FileDown,
  BookOpen,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ChevronDown,
  ArrowLeft,
  FileText,
  Calendar,
  UserCheck,
} from "lucide-react";
import logoUrl from "../assets/images/smp_logo_exact_match_revised_1783840969621.jpg";
import logoJsitUrl from "../assets/images/logo_jsit_indonesia_1783956323407.jpg";
import logoCahayaAmalUrl from "../assets/images/logo_cahaya_amal_1783956338475.jpg";
// @ts-ignore
import html2pdf from "html2pdf.js";

interface HalaqohRaportViewProps {
  currentUser: Teacher;
  onBack?: () => void;
}

export const KEISLAMAN_SUBJECTS = [
  {
    key: "Do’a Harian dan Hadits",
    shortTitle: "DO’A dan HADITS",
    tableHeader: "Do’a & Hadits",
    descNote: "Keadaan reel siswa dalam pembelajaran Do’a dan Hadits (apa saja yang harus diperbaiki)",
  },
  {
    key: "Tahsin ABaTaTsa",
    shortTitle: "TAHSIN AL-QUR'AN",
    tableHeader: "Tahsin ABaTaTsa",
    descNote: "Keadaan reel siswa dalam pembelajaran Tahsin (apa saja yang harus diperbaiki dalam tahsinnya)",
  },
  {
    key: "Tahfizh Al-Qur’an",
    shortTitle: "TAHFIZH AL-QUR'AN",
    tableHeader: "Tahfizh Al-Qur’an",
    descNote: "Keadaan reel siswa dalam pembelajaran Tahfidz Al-Qur'an (apa saja yang harus diperbaiki dalam hafalannya)",
  },
  {
    key: "Wudhu dan Sholat",
    shortTitle: "WUDHU dan SHOLAT",
    tableHeader: "Wudhu & Sholat",
    descNote: "Keadaan reel siswa dalam pembelajaran Wudhu & Sholat (apa saja yang harus diperbaiki dalam praktiknya)",
  },
];

export default function HalaqohRaportView({
  currentUser,
  onBack,
}: HalaqohRaportViewProps) {
  const [halaqohList, setHalaqohList] = useState<Halaqoh[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [selectedHalaqohId, setSelectedHalaqohId] = useState<string>("");
  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string>(
    "Do’a Harian dan Hadits"
  );
  const [downloadingSubject, setDownloadingSubject] = useState<string | null>(
    null
  );
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Fetch all necessary data
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [resH, resS, resG, resT] = await Promise.all([
        fetch("/api/halaqoh"),
        fetch("/api/students"),
        fetch("/api/grades"),
        fetch("/api/teachers"),
      ]);

      const hData = await resH.json();
      const sData = await resS.json();
      const gData = await resG.json();
      const tData = await resT.json();

      const hArr = Array.isArray(hData) ? hData : [];
      const sArr = Array.isArray(sData) ? sData : [];
      const gArr = Array.isArray(gData) ? gData : [];
      const tArr = Array.isArray(tData) ? tData : [];

      setHalaqohList(hArr);
      setStudents(sArr);
      setGrades(gArr);
      setTeachers(tArr);

      if (hArr.length > 0) {
        // If current user is a mentor of a halaqoh, auto-select it
        const myHalaqoh = hArr.find(
          (h: Halaqoh) =>
            h.mentorTeacherId === currentUser.id ||
            h.mentorName.toLowerCase().includes(currentUser.name.toLowerCase())
        );
        if (myHalaqoh) {
          setSelectedHalaqohId(myHalaqoh.id);
        } else {
          setSelectedHalaqohId(hArr[0].id);
        }
      }
    } catch (err: any) {
      setError("Gagal memuat data halaqoh dan nilai keislaman.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeHalaqoh = halaqohList.find((h) => h.id === selectedHalaqohId);

  // Filter students in this halaqoh
  const halaqohStudents = React.useMemo(() => {
    if (!activeHalaqoh) return [];
    const idSet = new Set(activeHalaqoh.studentIds || []);
    return students.filter((s) => idSet.has(s.id));
  }, [activeHalaqoh, students]);

  const activeSubject =
    KEISLAMAN_SUBJECTS.find((s) => s.key === selectedSubjectKey) ||
    KEISLAMAN_SUBJECTS[0];

  // Helper to convert kelas digit to formal text (e.g. 8 -> "VIII (Delapan)")
  const formatKelasName = (k: string) => {
    const clean = String(k || "").trim().toUpperCase();
    if (clean === "7" || clean === "VII") return "VII (Tujuh)";
    if (clean === "8" || clean === "VIII") return "VIII (Delapan)";
    if (clean === "9" || clean === "IX") return "IX (Sembilan)";
    return clean ? `Kelas ${clean}` : "-";
  };

  // Build the complete high-fidelity printable HTML template matching the sample PDF
  const generateHalaqohHTML = (
    halaqoh: Halaqoh,
    subjectMeta: (typeof KEISLAMAN_SUBJECTS)[0]
  ) => {
    const idSet = new Set((halaqoh.studentIds || []).map((id) => String(id).trim()));
    const memberStudents = students.filter((s) => idSet.has(String(s.id).trim()));

    const studentCardsHTML = memberStudents
      .map((student, idx) => {
        // Find existing grade for this student in this Keislaman subject
        const gradeObj = grades.find(
          (g) => String(g.studentId).trim() === String(student.id).trim() && g.subject === subjectMeta.key
        );

        const usahaVal = gradeObj?.usaha || "-";
        const prosesVal = gradeObj?.proses || "-";
        const capaianVal = gradeObj?.capaian || "-";
        const descText =
          gradeObj?.deskripsi ||
          (gradeObj?.score
            ? `Alhamdulillah ananda ${student.name} telah menyelesaikan pembelajaran ${subjectMeta.tableHeader} dengan perolehan nilai ${gradeObj.score}.`
            : "");

        return `
        <div style="margin-bottom: 24px; page-break-inside: avoid; break-inside: avoid; font-family: 'Times New Roman', Times, serif; background-color: #ffffff; color: #000000;">
          <table style="width: 100%; border: none; border-collapse: collapse; margin-bottom: 4px; font-size: 11pt; background-color: #ffffff; color: #000000;">
            <tr style="background-color: #ffffff;">
              <td style="width: 110px; font-weight: normal; vertical-align: top; border: none; padding: 2px 0; background-color: #ffffff; color: #000000;">${idx + 1}. Nama</td>
              <td style="width: 15px; text-align: center; vertical-align: top; border: none; padding: 2px 0; background-color: #ffffff; color: #000000;">:</td>
              <td style="font-weight: bold; vertical-align: top; border: none; padding: 2px 0; background-color: #ffffff; color: #000000;">${student.name}</td>
            </tr>
            <tr style="background-color: #ffffff;">
              <td style="font-weight: normal; vertical-align: top; border: none; padding: 2px 0; background-color: #ffffff; color: #000000;">&nbsp;&nbsp;&nbsp;&nbsp;Kelas</td>
              <td style="text-align: center; vertical-align: top; border: none; padding: 2px 0; background-color: #ffffff; color: #000000;">:</td>
              <td style="vertical-align: top; border: none; padding: 2px 0; background-color: #ffffff; color: #000000;">${formatKelasName(student.kelas)}</td>
            </tr>
          </table>

          <!-- Score Table -->
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; font-size: 10.5pt; text-align: center; background-color: #ffffff; color: #000000;">
            <thead>
              <tr style="background-color: #ffffff;">
                <th style="border: 1px solid #000000; padding: 5px 8px; width: 26%; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000;">${subjectMeta.tableHeader}</th>
                <th style="border: 1px solid #000000; padding: 5px 8px; width: 24%; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000;">Usaha</th>
                <th style="border: 1px solid #000000; padding: 5px 8px; width: 25%; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000;">Proses</th>
                <th style="border: 1px solid #000000; padding: 5px 8px; width: 25%; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000;">Capaian</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background-color: #ffffff;">
                <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000;">&nbsp;</td>
                <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000;">${usahaVal}</td>
                <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000;">${prosesVal}</td>
                <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000;">${capaianVal}</td>
              </tr>
            </tbody>
          </table>

          <!-- Description Box -->
          <div style="border: 1.5px solid #000000; border-top: none; padding: 8px 10px; font-size: 10pt; line-height: 1.45; min-height: 52px; background-color: #ffffff; color: #000000;">
            <strong style="color: #000000;">Deskripsi :</strong> ${
              descText
                ? descText
                : `<span style="color: #000000;">...........................................................................................................................................................................................................................................................................................................................................................................................................................</span>`
            }
          </div>
        </div>
      `;
      })
      .join("");

    const fullHTML = `
      <div class="raport-pdf-wrapper" style="font-family: 'Times New Roman', Times, serif; color: #000000; background-color: #ffffff; padding: 20px 25px; max-width: 800px; margin: 0 auto; box-sizing: border-box;">
        <style>
          .raport-pdf-wrapper, .raport-pdf-wrapper * {
            background-color: #ffffff !important;
            color: #000000 !important;
            border-color: #000000 !important;
            box-shadow: none !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          .raport-pdf-wrapper table {
            background-color: #ffffff !important;
            border-collapse: collapse !important;
          }
          .raport-pdf-wrapper td, .raport-pdf-wrapper th {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
        </style>
        
        <!-- Kop Surat Resmi -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3.5px double #000000; padding-bottom: 10px; margin-bottom: 18px; background-color: #ffffff;">
          <!-- Left: JSIT and Yayasan Cahaya Amal Logos -->
          <div style="width: 140px; flex-shrink: 0; display: flex; align-items: center; justify-content: flex-start; gap: 8px; background-color: #ffffff;">
            <div style="width: 62px; height: 62px; display: flex; align-items: center; justify-content: center; background-color: #ffffff;">
              <img src="${logoJsitUrl}" style="width: 100%; height: 100%; object-fit: contain; background-color: transparent;" />
            </div>
            <div style="width: 62px; height: 62px; display: flex; align-items: center; justify-content: center; background-color: #ffffff;">
              <img src="${logoCahayaAmalUrl}" style="width: 100%; height: 100%; object-fit: contain; background-color: transparent;" />
            </div>
          </div>

          <!-- Center: Kop Details -->
          <div style="text-align: center; flex-grow: 1; padding: 0 10px; background-color: #ffffff; color: #000000;">
            <h2 style="margin: 0; font-size: 11pt; font-weight: bold; text-transform: uppercase; line-height: 1.2; color: #000000;">YAYASAN CAHAYA AMAL BABEL</h2>
            <h1 style="margin: 2px 0 3px 0; font-size: 13pt; font-weight: bold; text-transform: uppercase; line-height: 1.2; color: #000000;">SMP ISLAM SMART PANGKALPINANG</h1>
            <p style="margin: 1px 0; font-size: 7.5pt; line-height: 1.25; color: #000000;">Jl. Padang Lama, Kelurahan Air Itam, Kecamatan Bukit Intan, Kota Pangkalpinang,</p>
            <p style="margin: 1px 0; font-size: 7.5pt; line-height: 1.25; color: #000000;">Prov. Kep. Bangka Belitung Kode Pos : 33149, No. HP : 0857-1844-0064,</p>
            <p style="margin: 1px 0; font-size: 7.5pt; line-height: 1.25; color: #000000;">NPSN : 70002556, No. Reg. JSIT : 2.19.71.03.001, E-Mail : smpsmartpkp@gmail.com</p>
          </div>

          <!-- Right: SMP Logo -->
          <div style="width: 140px; flex-shrink: 0; display: flex; align-items: center; justify-content: flex-end; background-color: #ffffff;">
            <div style="width: 65px; height: 65px; display: flex; align-items: center; justify-content: center; border-radius: 50%; overflow: hidden; border: 1.5px solid #cccccc; background-color: #ffffff;">
              <img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: cover; background-color: transparent;" />
            </div>
          </div>
        </div>

        <!-- Document Main Header Title -->
        <div style="text-align: center; margin-bottom: 22px; background-color: #ffffff; color: #000000;">
          <h2 style="margin: 0; font-size: 12.5pt; font-weight: bold; text-transform: uppercase; line-height: 1.3; color: #000000;">Hasil Evaluasi Tahsin Tahfidz Qur,an (ETTQ)</h2>
          <h3 style="margin: 3px 0; font-size: 12pt; font-weight: bold; text-transform: uppercase; line-height: 1.3; color: #000000;">${subjectMeta.shortTitle}</h3>
          <p style="margin: 2px 0 0 0; font-size: 10.5pt; font-weight: bold; line-height: 1.3; color: #000000;">Semester-1, Tahun Pelajaran 2026/2027</p>
        </div>

        <!-- List of Student Cards -->
        <div style="margin-bottom: 25px; background-color: #ffffff;">
          ${
            memberStudents.length > 0
              ? studentCardsHTML
              : `<div style="text-align: center; padding: 30px; font-style: italic; border: 1px dashed #999; color: #000000; background-color: #ffffff;">Belum ada santri/siswa yang dimasukkan ke dalam halaqoh ini. Silakan input/pilih santri di Panel Admin.</div>`
          }
        </div>

        <!-- Bottom Footer: Signature and Grading Legend (Keterangan) -->
        <div style="margin-top: 30px; page-break-inside: avoid; break-inside: avoid; background-color: #ffffff; color: #000000;">
          <!-- Signature right aligned -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 25px; background-color: #ffffff;">
            <div style="width: 250px; text-align: center; font-size: 10.5pt; background-color: #ffffff; color: #000000;">
              <p style="margin: 0 0 4px 0; color: #000000;">Pangkalpinang, 30 September 2025</p>
              <p style="margin: 0 0 55px 0; color: #000000;">Ustadz/ah Pembimbing,</p>
              <p style="margin: 0; font-weight: bold; text-decoration: underline; color: #000000;">( ${halaqoh.mentorName || "........................................"} )</p>
            </div>
          </div>

          <!-- Keterangan Legend Table -->
          <div style="border: 1.5px solid #000000; font-size: 9pt; background-color: #ffffff; color: #000000; line-height: 1.4;">
            <div style="padding: 4px 8px; border-bottom: 1px solid #000000; font-weight: bold; background-color: #ffffff; color: #000000;">
              Keterangan :
            </div>
            <table style="width: 100%; border-collapse: collapse; border: none; font-size: 8.5pt; background-color: #ffffff; color: #000000;">
              <tr style="background-color: #ffffff;">
                <td style="width: 120px; border-right: 1px solid #000000; border-bottom: none; padding: 6px 8px; vertical-align: top; background-color: #ffffff; color: #000000;">
                  <div>A : 90 – 100</div>
                  <div>B : 75 – 89</div>
                  <div>C : 60 – 74</div>
                </td>
                <td style="border-bottom: none; padding: 6px 8px; vertical-align: top; background-color: #ffffff; color: #000000;">
                  <table style="width: 100%; border: none; border-collapse: collapse; background-color: #ffffff; color: #000000;">
                    <tr style="background-color: #ffffff;">
                      <td style="width: 80px; border: none; font-weight: normal; padding: 1px 0; background-color: #ffffff; color: #000000;">Usaha</td>
                      <td style="width: 10px; border: none; padding: 1px 0; background-color: #ffffff; color: #000000;">:</td>
                      <td style="border: none; padding: 1px 0; background-color: #ffffff; color: #000000;">Ikhtiar yang dilakukan siswa untuk menghafal dan setoran.</td>
                    </tr>
                    <tr style="background-color: #ffffff;">
                      <td style="border: none; font-weight: normal; padding: 1px 0; background-color: #ffffff; color: #000000;">Proses</td>
                      <td style="border: none; padding: 1px 0; background-color: #ffffff; color: #000000;">:</td>
                      <td style="border: none; padding: 1px 0; background-color: #ffffff; color: #000000;">Teknis ketika siswa setoran ke pembimbing TnT dan penguji.</td>
                    </tr>
                    <tr style="background-color: #ffffff;">
                      <td style="border: none; font-weight: normal; padding: 1px 0; background-color: #ffffff; color: #000000;">Capaian</td>
                      <td style="border: none; padding: 1px 0; background-color: #ffffff; color: #000000;">:</td>
                      <td style="border: none; padding: 1px 0; background-color: #ffffff; color: #000000;">Hasil dari ETTQ</td>
                    </tr>
                    <tr style="background-color: #ffffff;">
                      <td style="border: none; font-weight: normal; padding: 1px 0; vertical-align: top; background-color: #ffffff; color: #000000;">Deskripsi</td>
                      <td style="border: none; padding: 1px 0; vertical-align: top; background-color: #ffffff; color: #000000;">:</td>
                      <td style="border: none; padding: 1px 0; background-color: #ffffff; color: #000000;">Keadaan reel siswa dalam pembelajarn Tahsin (apa saja yang harus diperbaiki dalam tahsinnya)</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        </div>

      </div>
    `;

    return fullHTML;
  };

  // Handle PDF download of a specific Keislaman subject by targeting the visible preview element
  const handleDownloadSinglePDF = async (
    subjectMeta: (typeof KEISLAMAN_SUBJECTS)[0]
  ) => {
    if (!activeHalaqoh) return;
    setDownloadingSubject(subjectMeta.key);

    try {
      // 1. Ensure the active tab displays the requested subject so it's fully rendered on screen
      if (selectedSubjectKey !== subjectMeta.key) {
        setSelectedSubjectKey(subjectMeta.key);
        // Wait for React to render the report sheet
        await new Promise((resolve) => setTimeout(resolve, 350));
      } else {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      // 2. Get the rendered report sheet element directly from screen
      const element = document.getElementById("raport-sheet-print");
      if (!element) {
        alert("Gagal menemukan lembar pratinjau raport.");
        return;
      }

      const fileName = `Raport_${subjectMeta.shortTitle.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

      const opt = {
        margin: [8, 8, 8, 8] as [number, number, number, number],
        filename: fileName,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          scrollY: -window.scrollY,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error("Gagal mendownload PDF halaqoh", e);
      alert("Terjadi kendala saat mengunduh PDF. Mengalihkan ke mode cetak/simpan PDF langsung...");
      handlePrint();
    } finally {
      setDownloadingSubject(null);
    }
  };

  // Handle Batch downloading of all 4 separate Keislaman PDFs
  const handleDownloadAllSeparatePDFs = async () => {
    if (!activeHalaqoh) return;
    setIsBatchDownloading(true);

    for (const sub of KEISLAMAN_SUBJECTS) {
      await handleDownloadSinglePDF(sub);
      // Brief pause between downloads to let browser handle files
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    setIsBatchDownloading(false);
  };

  // Handle Print Preview direct
  const handlePrint = () => {
    if (!activeHalaqoh) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Pop-up diblokir browser. Izinkan pop-up untuk mencetak raport.");
      return;
    }

    const htmlContent = generateHalaqohHTML(activeHalaqoh, activeSubject);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Raport Keislaman ${activeSubject.shortTitle} - ${activeHalaqoh.name}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { margin: 0; padding: 0; background: #fff; font-family: 'Times New Roman', serif; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <div className="text-sm font-bold text-white">Memuat Data Halaqoh & Nilai Keislaman...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080d1a] overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 md:p-5 bg-[#0c1322] border-b border-[#1e3256] flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-[#0f172a] hover:bg-[#162442] border border-[#223658] text-white cursor-pointer transition"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] font-black uppercase">
                KEISLAMAN & HALAQOH
              </span>
              <h1 className="text-base md:text-lg font-black text-white uppercase tracking-tight">
                Raport ETTQ Per Halaqoh
              </h1>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Hasil Evaluasi Tahsin, Tahfidz, Do’a & Hadits, serta Wudhu & Sholat per kelompok halaqoh santri
            </p>
          </div>
        </div>

        {/* Global Action Download Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrint}
            disabled={!activeHalaqoh || halaqohStudents.length === 0}
            className="px-3.5 py-2 rounded-xl bg-[#0f172a] hover:bg-[#162442] border border-[#223658] text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Cetak Dokumen</span>
          </button>

          <button
            onClick={handleDownloadAllSeparatePDFs}
            disabled={!activeHalaqoh || halaqohStudents.length === 0 || isBatchDownloading}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 border border-emerald-400/40 cursor-pointer transition disabled:opacity-50"
          >
            {isBatchDownloading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Download 4 Berkas PDF Terpisah</span>
          </button>
        </div>
      </div>

      {/* Selector Toolbar */}
      <div className="p-4 bg-[#0a101f] border-b border-[#1e3256] grid grid-cols-1 md:grid-cols-12 gap-3 shrink-0">
        {/* Halaqoh Group Selector */}
        <div className="md:col-span-6 flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Pilih Kelompok Halaqoh</span>
          </label>
          {halaqohList.length > 0 ? (
            <select
              value={selectedHalaqohId}
              onChange={(e) => setSelectedHalaqohId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0e172a] border border-[#243b64] rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {halaqohList.map((h) => (
                <option key={h.id} value={h.id} className="bg-[#0e172a] text-white">
                  {h.name} — Pembimbing: {h.mentorName} ({h.studentIds?.length || 0} Santri)
                </option>
              ))}
            </select>
          ) : (
            <div className="p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Belum ada data halaqoh. Silakan buat kelompok halaqoh di Panel Admin.</span>
            </div>
          )}
        </div>

        {/* Keislaman Subject Selector & Quick Download Buttons */}
        <div className="md:col-span-6 flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pilih Berkas Raport Keislaman (ETTQ)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {KEISLAMAN_SUBJECTS.map((sub) => {
              const isActive = selectedSubjectKey === sub.key;
              const isDownloading = downloadingSubject === sub.key;

              return (
                <button
                  key={sub.key}
                  onClick={() => setSelectedSubjectKey(sub.key)}
                  className={`p-2 rounded-xl text-[11px] font-bold text-left transition flex flex-col justify-between border cursor-pointer ${
                    isActive
                      ? "bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-950/60"
                      : "bg-[#0e172a] border-[#223658] text-slate-300 hover:text-white hover:bg-[#15233c]"
                  }`}
                >
                  <span className="truncate">{sub.tableHeader}</span>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[9px] font-mono opacity-80">PDF</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadSinglePDF(sub);
                      }}
                      className="p-1 rounded bg-black/30 hover:bg-black/60 text-white transition"
                      title={`Download PDF ${sub.tableHeader}`}
                    >
                      {isDownloading ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Workspace Preview */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col items-center">
        {activeHalaqoh ? (
          <div className="w-full max-w-4xl space-y-4">
            {/* Info Badge */}
            <div className="bg-[#0e172a] p-3.5 rounded-xl border border-[#223658] flex items-center justify-between gap-3 text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>
                  Menampilkan pratinjau <strong>{activeSubject.shortTitle}</strong> untuk{" "}
                  <strong>{activeHalaqoh.name}</strong> ({halaqohStudents.length} santri)
                </span>
              </div>
              <button
                onClick={() => handleDownloadSinglePDF(activeSubject)}
                disabled={downloadingSubject === activeSubject.key}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md"
              >
                {downloadingSubject === activeSubject.key ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download PDF Ini</span>
              </button>
            </div>

            {/* Document Paper Preview (Exact A4 Styling) */}
            <div
              id="raport-sheet-print"
              className="bg-white text-black p-6 md:p-10 rounded-xl shadow-2xl border border-gray-300 w-full overflow-x-auto"
              style={{ minHeight: "800px", fontFamily: "'Times New Roman', Times, serif" }}
              dangerouslySetInnerHTML={{
                __html: generateHalaqohHTML(activeHalaqoh, activeSubject),
              }}
            />
          </div>
        ) : (
          <div className="m-auto text-center p-8 bg-[#0e172a] rounded-2xl border border-[#223658] max-w-md space-y-3">
            <Users className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">Belum Ada Halaqoh Dipilih</h3>
            <p className="text-xs text-slate-300">
              Silakan tambahkan data kelompok halaqoh pada menu Administrator atau pilih halaqoh dari daftar di atas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
