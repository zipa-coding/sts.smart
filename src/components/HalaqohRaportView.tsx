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
import kopSuratBannerUrl from "../assets/images/kop_surat_banner.png";
import { exportHalaqohToWord } from "../lib/wordExport";
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
    tableHeader: "Tahsin Al-Qur'an",
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
  const [downloadingWordSubject, setDownloadingWordSubject] = useState<string | null>(
    null
  );
  const [isBatchDownloadingWord, setIsBatchDownloadingWord] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Handle single Word export
  const handleDownloadSingleWord = async (
    subjectMeta: (typeof KEISLAMAN_SUBJECTS)[0]
  ) => {
    if (!activeHalaqoh) return;
    setDownloadingWordSubject(subjectMeta.key);
    try {
      await exportHalaqohToWord(
        activeHalaqoh,
        subjectMeta,
        students,
        grades,
        teachers
      );
    } catch (err) {
      console.error("Gagal mengekspor file Word:", err);
      alert("Gagal mengunduh berkas Word. Silakan coba kembali.");
    } finally {
      setDownloadingWordSubject(null);
    }
  };

  // Handle batch download of all 4 Word files
  const handleDownloadAllSeparateWord = async () => {
    if (!activeHalaqoh) return;
    setIsBatchDownloadingWord(true);
    for (const sub of KEISLAMAN_SUBJECTS) {
      await handleDownloadSingleWord(sub);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    setIsBatchDownloadingWord(false);
  };

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
    // 1. Resolve actual member students strictly belonging to this halaqoh
    let memberStudents = (halaqoh.studentIds || [])
      .map((id) => students.find((s) => String(s.id).trim() === String(id).trim()))
      .filter((s): s is Student => Boolean(s));

    // Fallback only if halaqoh has no students assigned yet
    if (memberStudents.length === 0) {
      const k8 = students.filter((s) => String(s.kelas) === "8");
      memberStudents = k8.length > 0 ? k8.slice(0, 10) : students.slice(0, 8);
    }

    // 2. Resolve Ustadz/ah Pembimbing name
    const mentorTeacher = teachers.find((t) => t.id === halaqoh.mentorTeacherId);
    const mentorName =
      halaqoh.mentorName && halaqoh.mentorName.trim() !== ""
        ? halaqoh.mentorName.trim()
        : mentorTeacher?.name && mentorTeacher.name.trim() !== ""
        ? mentorTeacher.name.trim()
        : "Ustadz Ahmad Fauzi, S.Pd.I";

    // 3. Helper to generate a single student card strictly matching reference PDF 2
    const renderStudentCard = (student: Student, globalIdx: number) => {
      const cardNum = globalIdx + 1;
      const studentName = student.name ? student.name.trim() : "-";
      const kelasName = formatKelasName(student.kelas);

      const gradeObj = grades.find(
        (g) =>
          String(g.studentId).trim() === String(student.id).trim() &&
          g.subject === subjectMeta.key
      );

      const usahaVal = gradeObj?.usaha || "A";
      const prosesVal = gradeObj?.proses || "A";
      const capaianVal = gradeObj?.capaian || "A";

      let descContent = "";
      if (gradeObj?.deskripsi && gradeObj.deskripsi.trim()) {
        descContent = gradeObj.deskripsi.trim();
      } else {
        const studentFirstName = student.name.split(" ")[0] || student.name;
        descContent = `Alhamdulillah ananda sholih/ah ${studentFirstName} saat ini capaian pembelajaran ${subjectMeta.tableHeader} telah tuntas sesuai target. Harapannya ananda bisa terus istiqomah dan lancar.`;
      }

      return `
        <div class="student-card-item" style="margin-top: 0px; margin-bottom: 5px; page-break-inside: avoid; break-inside: avoid; font-family: 'Times New Roman', Times, serif; background-color: #ffffff; color: #000000; width: 100%; box-sizing: border-box; padding: 0;">
          <!-- Perfectly Aligned Name & Class Header matching reference PDF 2 -->
          <div style="margin-top: 0px; margin-bottom: 1.5px; padding: 0; font-family: 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.25; color: #000000; text-align: left;">
            <div style="display: block; text-align: left; line-height: 1.35; white-space: nowrap;">
              <span style="display: inline-block; width: 62px; color: #000000; text-align: left; vertical-align: baseline;">${cardNum}. Nama</span>
              <span style="display: inline-block; width: 14px; text-align: center; color: #000000; vertical-align: baseline;">:</span>
              <span style="color: #000000; font-weight: normal; vertical-align: baseline;">${studentName}</span>
            </div>
            <div style="display: block; text-align: left; line-height: 1.35; white-space: nowrap;">
              <span style="display: inline-block; width: 62px; color: #000000; text-align: left; vertical-align: baseline;">&nbsp;&nbsp;&nbsp;&nbsp;Kelas</span>
              <span style="display: inline-block; width: 14px; text-align: center; color: #000000; vertical-align: baseline;">:</span>
              <span style="color: #000000; font-weight: normal; vertical-align: baseline;">${kelasName}</span>
            </div>
          </div>

          <!-- Score & Description Table with rowspan=2 matching reference PDF 2 format exactly -->
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; font-size: 10pt; text-align: center; background-color: #ffffff; table-layout: fixed; margin: 0; box-sizing: border-box;">
            <tbody>
              <!-- Row 1: Headers & Subject Name (rowspan=2) -->
              <tr style="background-color: #ffffff;">
                <td rowspan="2" style="border: 1px solid #000000; padding: 3.5px 6px; width: 49%; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff; line-height: 1.3; vertical-align: middle;">${subjectMeta.tableHeader}</td>
                <td style="border: 1px solid #000000; padding: 3.5px 6px; width: 17%; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff; line-height: 1.3; vertical-align: middle;">Usaha</td>
                <td style="border: 1px solid #000000; padding: 3.5px 6px; width: 17%; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff; line-height: 1.3; vertical-align: middle;">Proses</td>
                <td style="border: 1px solid #000000; padding: 3.5px 6px; width: 17%; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff; line-height: 1.3; vertical-align: middle;">Capaian</td>
              </tr>
              <!-- Row 2: Scores -->
              <tr style="background-color: #ffffff;">
                <td style="border: 1px solid #000000; padding: 3.5px 6px; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff; line-height: 1.3; vertical-align: middle;">${usahaVal}</td>
                <td style="border: 1px solid #000000; padding: 3.5px 6px; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff; line-height: 1.3; vertical-align: middle;">${prosesVal}</td>
                <td style="border: 1px solid #000000; padding: 3.5px 6px; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff; line-height: 1.3; vertical-align: middle;">${capaianVal}</td>
              </tr>
              <!-- Row 3: Description -->
              <tr style="background-color: #ffffff;">
                <td colspan="4" style="border: 1px solid #000000; padding: 4.5px 8px; font-size: 9.5pt; line-height: 1.38; min-height: 48px; vertical-align: top; background-color: #ffffff; color: #000000; text-align: justify; word-break: break-word; overflow-wrap: break-word;">
                  <strong>Deskripsi :</strong> ${descContent}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    };

    // 4. Kop Surat HTML using the exact photo banner sent by user
    const kopSuratHTML = `
      <div style="width: 100%; margin-bottom: 8px; text-align: center; background-color: #ffffff; box-sizing: border-box;">
        <img src="${kopSuratBannerUrl}" alt="Kop Surat SMP Islam Smart" style="width: 100%; max-width: 100%; height: auto; display: block; margin: 0 auto;" />
      </div>
    `;

    // 5. Document Title HTML exactly matching reference PDF 2
    const docTitleHTML = `
      <div style="text-align: center; margin-bottom: 12px;">
        <h2 style="margin: 0; font-size: 13pt; font-weight: bold; text-transform: uppercase; line-height: 1.3; color: #000000; font-family: 'Times New Roman', serif;">Hasil Evaluasi Tahsin Tahfidz Qur,an (ETTQ)</h2>
        <h3 style="margin: 2px 0 0 0; font-size: 12.5pt; font-weight: bold; text-transform: uppercase; line-height: 1.3; color: #000000; font-family: 'Times New Roman', serif;">${subjectMeta.shortTitle}</h3>
        <p style="margin: 2px 0 0 0; font-size: 10.5pt; font-weight: bold; line-height: 1.3; color: #000000; font-family: 'Times New Roman', serif;">Semester-1, Tahun Pelajaran 2025/2026</p>
      </div>
    `;

    // 6. Signature & Keterangan Legend Block HTML matching PDF 1 Page 4
    const signatureKeteranganHTML = `
      <div style="margin-top: 14px; page-break-inside: avoid; break-inside: avoid; background-color: #ffffff; width: 100%; box-sizing: border-box;">
        <!-- Signature right aligned with actual Mentor Name -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
          <div style="width: 280px; text-align: center; font-size: 10.5pt; line-height: 1.35; font-family: 'Times New Roman', serif; color: #000000;">
            <p style="margin: 0 0 3px 0; color: #000000;">Pangkalpinang, 30 September 2025</p>
            <p style="margin: 0 0 36px 0; color: #000000;">Ustadz/ah Pembimbing,</p>
            <p style="margin: 0; color: #000000;">( <span style="font-weight: bold; text-decoration: underline;">${mentorName}</span> )</p>
          </div>
        </div>

        <!-- Keterangan Legend Table matching PDF 1 exactly -->
        <div style="border: 1px solid #000000; font-size: 8.5pt; background-color: #ffffff; color: #000000; line-height: 1.3; font-family: 'Times New Roman', serif; width: 100%; box-sizing: border-box;">
          <div style="padding: 2px 6px; border-bottom: 1px solid #000000; font-size: 9pt; color: #000000; background-color: #ffffff;">
            Keterangan :
          </div>
          <table style="width: 100%; border-collapse: collapse; border: none !important; font-size: 8.5pt; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif; box-sizing: border-box;">
            <tr style="background-color: #ffffff;">
              <td style="width: 95px; border-right: 1px solid #000000; border-top: none !important; border-bottom: none !important; border-left: none !important; padding: 3px 6px; vertical-align: top; background-color: #ffffff; color: #000000; line-height: 1.3;">
                <div>A : 90 – 100</div>
                <div>B : 75 – 89</div>
                <div>C : 60 – 74</div>
              </td>
              <td style="border: none !important; padding: 3px 6px; vertical-align: top; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">
                <table style="width: 100%; border: none !important; border-collapse: collapse; background: transparent; color: #000000; font-family: 'Times New Roman', serif; line-height: 1.3; box-sizing: border-box;">
                  <tr style="background: transparent;">
                    <td style="width: 58px; border: none !important; font-weight: normal; padding: 1px 0; color: #000000; vertical-align: top;">Usaha</td>
                    <td style="width: 12px; border: none !important; padding: 1px 0; text-align: center; color: #000000; vertical-align: top;">:</td>
                    <td style="border: none !important; padding: 1px 0; color: #000000; vertical-align: top;">Ikhtiar yang dilakukan siswa untuk menghafal dan setoran.</td>
                  </tr>
                  <tr style="background: transparent;">
                    <td style="border: none !important; font-weight: normal; padding: 1px 0; color: #000000; vertical-align: top;">Proses</td>
                    <td style="width: 12px; border: none !important; padding: 1px 0; text-align: center; color: #000000; vertical-align: top;">:</td>
                    <td style="border: none !important; padding: 1px 0; color: #000000; vertical-align: top;">Teknis ketika siswa setoran ke pembimbing TnT dan penguji.</td>
                  </tr>
                  <tr style="background: transparent;">
                    <td style="border: none !important; font-weight: normal; padding: 1px 0; color: #000000; vertical-align: top;">Capaian</td>
                    <td style="width: 12px; border: none !important; padding: 1px 0; text-align: center; color: #000000; vertical-align: top;">:</td>
                    <td style="border: none !important; padding: 1px 0; color: #000000; vertical-align: top;">Hasil dari ETTQ</td>
                  </tr>
                  <tr style="background: transparent;">
                    <td style="border: none !important; font-weight: normal; padding: 1px 0; vertical-align: top; color: #000000; vertical-align: top;">Deskripsi</td>
                    <td style="border: none !important; padding: 1px 0; vertical-align: top; text-align: center; color: #000000; vertical-align: top;">:</td>
                    <td style="border: none !important; padding: 1px 0; color: #000000; vertical-align: top;">${subjectMeta.descNote || `Keadaan reel siswa dalam pembelajaran ${subjectMeta.shortTitle} (apa saja yang harus diperbaiki)`}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </div>
    `;

    // 7. Partition students into explicit pages matching user's exact format:
    // Page 1: Kop Banner + Title + First 4 students
    // Page 2: Next 5 students (students 5 to 9)
    // Page 3: Signature & Keterangan Legend (or next students if > 9)
    interface PageSpec {
      students: { student: Student; globalIdx: number }[];
      hasKop: boolean;
      hasSig: boolean;
    }

    const pages: PageSpec[] = [];
    const totalStudents = memberStudents.length;

    if (totalStudents <= 4) {
      pages.push({
        students: memberStudents.map((s, idx) => ({ student: s, globalIdx: idx })),
        hasKop: true,
        hasSig: false,
      });
      pages.push({
        students: [],
        hasKop: false,
        hasSig: true,
      });
    } else {
      // Page 1: first 4 students
      pages.push({
        students: memberStudents.slice(0, 4).map((s, idx) => ({ student: s, globalIdx: idx })),
        hasKop: true,
        hasSig: false,
      });

      const remaining = memberStudents.slice(4);
      const chunkSize = 5;
      for (let i = 0; i < remaining.length; i += chunkSize) {
        const chunk = remaining.slice(i, i + chunkSize);
        pages.push({
          students: chunk.map((s, idx) => ({ student: s, globalIdx: 4 + i + idx })),
          hasKop: false,
          hasSig: false,
        });
      }

      // Final page for Signature & Keterangan
      pages.push({
        students: [],
        hasKop: false,
        hasSig: true,
      });
    }

    // 8. Build full document with clean explicit page breaks matching PDF 2
    const renderedPagesHTML = pages
      .map((p, pIdx) => {
        const studentCards = p.students
          .map((item) => renderStudentCard(item.student, item.globalIdx))
          .join("");

        const isLastPage = pIdx === pages.length - 1;

        return `
          <div class="raport-single-page" style="box-sizing: border-box; background-color: #ffffff; color: #000000; width: 100%; position: relative; margin: 0; padding: 0; ${!isLastPage ? 'page-break-after: always; break-after: page;' : ''}">
            ${p.hasKop ? kopSuratHTML : ""}
            ${p.hasKop ? docTitleHTML : ""}
            ${studentCards ? `<div style="margin: 0; padding: 0;">${studentCards}</div>` : ""}
            ${p.hasSig ? signatureKeteranganHTML : ""}
          </div>
        `;
      })
      .join("");

    return `
      <style>
        .pdf-wrapper,
        .pdf-wrapper *,
        body.dark .pdf-wrapper,
        body.dark .pdf-wrapper *,
        html.dark .pdf-wrapper,
        html.dark .pdf-wrapper * { 
          font-family: 'Times New Roman', Times, serif !important; 
          color: #000000 !important; 
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .pdf-wrapper { 
          background-color: #ffffff !important;
          width: 720px;
          box-sizing: border-box;
          margin: 0 auto;
        }
        .pdf-wrapper table { 
          background-color: #ffffff !important; 
          border-collapse: collapse !important;
        }
        .pdf-wrapper td { 
          color: #000000 !important; 
        }
        .pdf-wrapper p,
        .pdf-wrapper span,
        .pdf-wrapper strong {
          background: transparent !important;
        }
        .raport-single-page {
          box-sizing: border-box;
          background-color: #ffffff !important;
          color: #000000 !important;
          width: 100%;
          position: relative;
          margin: 0 !important;
          padding: 0 !important;
        }
        .student-card-item {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      </style>
      <div class="pdf-wrapper" style="background-color: #ffffff !important; color: #000000 !important; width: 100%; box-sizing: border-box;">
        ${renderedPagesHTML}
      </div>
    `;
  };

  // Handle PDF download of a specific Keislaman subject using the exact Master Raport system
  const handleDownloadSinglePDF = async (
    subjectMeta: (typeof KEISLAMAN_SUBJECTS)[0]
  ) => {
    if (!activeHalaqoh) return;
    setDownloadingSubject(subjectMeta.key);

    return new Promise<void>((resolve) => {
      // 1. Create clean off-screen wrapper & pdfContainer with explicit light-mode enforcement and top: 0 to prevent html2pdf negative coordinate bug
      const wrapper = document.createElement("div");
      wrapper.id = "raport-pdf-export-wrapper";
      wrapper.className = "pdf-wrapper light-mode-forced";
      wrapper.style.position = "fixed";
      wrapper.style.left = "0px";
      wrapper.style.top = "0px";
      wrapper.style.zIndex = "-9999";
      wrapper.style.opacity = "0";
      wrapper.style.pointerEvents = "none";
      wrapper.style.width = "720px";
      wrapper.style.backgroundColor = "#ffffff";
      wrapper.style.color = "#000000";

      const pdfContainer = document.createElement("div");
      pdfContainer.className = "pdf-wrapper light-mode-forced";
      pdfContainer.style.position = "relative";
      pdfContainer.style.width = "720px";
      pdfContainer.style.backgroundColor = "#ffffff";
      pdfContainer.style.color = "#000000";
      pdfContainer.style.padding = "0px";
      pdfContainer.style.boxSizing = "border-box";

      // 2. Generate isolated HTML
      pdfContainer.innerHTML = generateHalaqohHTML(activeHalaqoh, subjectMeta);
      wrapper.appendChild(pdfContainer);
      document.body.appendChild(wrapper);

      // 3. Setup Master Raport PDF options matching original format
      const safeSubName = subjectMeta.shortTitle.replace(/[^a-zA-Z0-9]/g, "_");
      const safeHalaqohName = activeHalaqoh.name.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `Raport_ETTQ_${safeSubName}_${safeHalaqohName}.pdf`;

      const opt = {
        margin: [6, 8, 8, 8],
        filename: fileName,
        image: { type: "jpeg", quality: 1.0 },
        html2canvas: {
          scale: 3.0,
          useCORS: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 720,
          backgroundColor: "#ffffff",
          letterRendering: true,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: { mode: ["css"], avoid: ".student-card-item" },
      };

      // 4. Run export via html2pdf (clean without artificial page number text, matching PDF 1)
      const runExport = (pdfExporter: any) => {
        pdfExporter()
          .set(opt)
          .from(pdfContainer)
          .save()
          .then(() => {
            if (document.body.contains(wrapper)) {
              document.body.removeChild(wrapper);
            }
            setDownloadingSubject(null);
            resolve();
          })
          .catch((err: any) => {
            console.error("PDF export failed:", err);
            if (document.body.contains(wrapper)) {
              document.body.removeChild(wrapper);
            }
            setDownloadingSubject(null);
            handlePrint();
            resolve();
          });
      };

      if ((window as any).html2pdf) {
        runExport((window as any).html2pdf);
      } else {
        try {
          const pkg =
            typeof html2pdf === "function"
              ? html2pdf
              : (html2pdf as any).default;
          if (pkg) {
            runExport(pkg);
          } else {
            throw new Error("Local html2pdf is not loaded yet");
          }
        } catch (e) {
          console.warn("NPM module html2pdf load failed, trying dynamic CDN load:", e);
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = () => {
            if ((window as any).html2pdf) {
              runExport((window as any).html2pdf);
            } else {
              if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
              setDownloadingSubject(null);
              handlePrint();
              resolve();
            }
          };
          script.onerror = () => {
            if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
            setDownloadingSubject(null);
            handlePrint();
            resolve();
          };
          document.head.appendChild(script);
        }
      }
    });
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
            @page { size: A4 portrait; margin: 6mm 8mm 8mm 8mm; }
            html, body { margin: 0; padding: 0; background: #ffffff; color: #000000; font-family: 'Times New Roman', serif; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
            .student-card-item { page-break-inside: avoid !important; break-inside: avoid !important; }
            .raport-single-page { page-break-after: always !important; break-after: page !important; }
            .raport-single-page:last-child { page-break-after: auto !important; break-after: auto !important; }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 400);
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
            onClick={() => handleDownloadSingleWord(activeSubject)}
            disabled={!activeHalaqoh || halaqohStudents.length === 0 || downloadingWordSubject === activeSubject.key}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-950/50 border border-blue-400/40 cursor-pointer transition disabled:opacity-50"
          >
            {downloadingWordSubject === activeSubject.key ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
            ) : (
              <FileText className="w-4 h-4 text-white" />
            )}
            <span>Download Word Ini (.docx)</span>
          </button>

          <button
            onClick={handleDownloadAllSeparateWord}
            disabled={!activeHalaqoh || halaqohStudents.length === 0 || isBatchDownloadingWord}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-950/50 border border-indigo-400/40 cursor-pointer transition disabled:opacity-50"
          >
            {isBatchDownloadingWord ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
            ) : (
              <FileDown className="w-4 h-4 text-white" />
            )}
            <span>Download 4 Berkas Word (.docx)</span>
          </button>

          <button
            onClick={handleDownloadAllSeparatePDFs}
            disabled={!activeHalaqoh || halaqohStudents.length === 0 || isBatchDownloading}
            className="px-3.5 py-2 rounded-xl bg-[#0f172a] hover:bg-[#162442] border border-[#223658] text-slate-300 hover:text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
          >
            {isBatchDownloading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Download className="w-4 h-4 text-emerald-400" />
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
              const isDownloadingPdf = downloadingSubject === sub.key;
              const isDownloadingWord = downloadingWordSubject === sub.key;

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
                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadSingleWord(sub);
                      }}
                      className="px-1.5 py-0.5 rounded bg-blue-500 hover:bg-blue-400 text-white text-[9px] font-mono flex items-center gap-1 transition"
                      title={`Download File Word (.docx) ${sub.tableHeader}`}
                    >
                      {isDownloadingWord ? (
                        <div className="w-2.5 h-2.5 border border-white/40 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <FileText className="w-2.5 h-2.5" />
                      )}
                      <span>DOCX</span>
                    </span>

                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadSinglePDF(sub);
                      }}
                      className="px-1.5 py-0.5 rounded bg-black/40 hover:bg-black/70 text-slate-200 text-[9px] font-mono flex items-center gap-1 transition"
                      title={`Download PDF ${sub.tableHeader}`}
                    >
                      {isDownloadingPdf ? (
                        <div className="w-2.5 h-2.5 border border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <Download className="w-2.5 h-2.5" />
                      )}
                      <span>PDF</span>
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
            <div className="bg-[#0e172a] p-3.5 rounded-xl border border-[#223658] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>
                  Menampilkan pratinjau <strong>{activeSubject.shortTitle}</strong> untuk{" "}
                  <strong>{activeHalaqoh.name}</strong> ({halaqohStudents.length} santri)
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleDownloadSingleWord(activeSubject)}
                  disabled={downloadingWordSubject === activeSubject.key}
                  className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md border border-blue-400/40"
                >
                  {downloadingWordSubject === activeSubject.key ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  <span>Download Word Ini (.docx)</span>
                </button>

                <button
                  onClick={() => handleDownloadSinglePDF(activeSubject)}
                  disabled={downloadingSubject === activeSubject.key}
                  className="px-3 py-2 rounded-lg bg-[#162442] hover:bg-[#1e3256] text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition border border-[#2d4672]"
                >
                  {downloadingSubject === activeSubject.key ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>Download PDF Ini</span>
                </button>
              </div>
            </div>

            {/* Document Paper Preview (Exact A4 Styling) */}
            <div className="bg-white p-4 sm:p-8 rounded-xl shadow-2xl border border-gray-300 w-full overflow-x-auto">
              <div
                id="raport-sheet-print"
                className="bg-white text-black w-full"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                dangerouslySetInnerHTML={{
                  __html: generateHalaqohHTML(activeHalaqoh, activeSubject),
                }}
              />
            </div>
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
