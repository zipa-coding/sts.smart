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

    // Helper to generate a single student card
    const studentCardsHTML = memberStudents
      .map((student, idx) => {
        const cardNum = idx + 1;
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
          <div class="student-card-item" style="margin-bottom: 14px; page-break-inside: avoid; break-inside: avoid; font-family: 'Times New Roman', Times, serif;">
            <!-- Perfectly Aligned Name & Class Header -->
            <table style="width: 100%; border: none; border-collapse: collapse; margin-bottom: 4px; font-size: 11pt; line-height: 1.35; background-color: #ffffff; color: #000000;">
              <tr style="background-color: #ffffff;">
                <td style="width: 85px; font-weight: normal; vertical-align: top; border: none; padding: 1px 0; color: #000000; white-space: nowrap;">${cardNum}. Nama</td>
                <td style="width: 16px; text-align: center; vertical-align: top; border: none; padding: 1px 0; color: #000000;">:</td>
                <td style="font-weight: bold; vertical-align: top; border: none; padding: 1px 0; color: #000000;">${studentName}</td>
              </tr>
              <tr style="background-color: #ffffff;">
                <td style="width: 85px; font-weight: normal; vertical-align: top; border: none; padding: 1px 0; color: #000000; white-space: nowrap;">&nbsp;&nbsp;&nbsp;&nbsp;Kelas</td>
                <td style="width: 16px; text-align: center; vertical-align: top; border: none; padding: 1px 0; color: #000000;">:</td>
                <td style="vertical-align: top; border: none; padding: 1px 0; color: #000000;">${kelasName}</td>
              </tr>
            </table>

            <!-- Score Table (Pure White Background, 1px solid black) -->
            <table style="width: 100%; border-collapse: collapse; border: 1.2px solid #000000; font-size: 10pt; text-align: center; background-color: #ffffff; table-layout: fixed; margin-bottom: 0;">
              <thead>
                <tr style="background-color: #ffffff;">
                  <th style="border: 1px solid #000000; padding: 4px 6px; width: 28%; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff;">${subjectMeta.tableHeader}</th>
                  <th style="border: 1px solid #000000; padding: 4px 6px; width: 24%; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff;">Usaha</th>
                  <th style="border: 1px solid #000000; padding: 4px 6px; width: 24%; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff;">Proses</th>
                  <th style="border: 1px solid #000000; padding: 4px 6px; width: 24%; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff;">Capaian</th>
                </tr>
              </thead>
              <tbody>
                <tr style="background-color: #ffffff; height: 24px;">
                  <td style="border: 1px solid #000000; padding: 4px 6px; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff;">&nbsp;</td>
                  <td style="border: 1px solid #000000; padding: 4px 6px; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff;">${usahaVal}</td>
                  <td style="border: 1px solid #000000; padding: 4px 6px; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff;">${prosesVal}</td>
                  <td style="border: 1px solid #000000; padding: 4px 6px; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff;">${capaianVal}</td>
                </tr>
              </tbody>
            </table>

            <!-- Description Box (Pure White Background, 1px solid black) -->
            <div style="border: 1.2px solid #000000; border-top: none; padding: 6px 8px; font-size: 9.5pt; line-height: 1.4; min-height: 50px; background-color: #ffffff; color: #000000; box-sizing: border-box; text-align: justify;">
              <strong>Deskripsi :</strong> ${descContent}
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <style>
        .pdf-wrapper { 
          font-family: 'Times New Roman', Times, serif; 
          font-size: 11pt; 
          line-height: 1.45; 
          color: #000000 !important; 
          background-color: #ffffff; 
          position: relative;
        }
        .pdf-wrapper * {
          color: #000000 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        table { background-color: #ffffff !important; }
        td, th { color: #000000 !important; }
      </style>
      <div class="pdf-wrapper">
        <!-- Kop Surat Resmi Identik Master Raport -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; width: 100%; border-bottom: 3px double #000000; padding-bottom: 10px;">
          <!-- Left Side: JSIT and Yayasan Cahaya Amal logos -->
          <div style="width: 155px; flex-shrink: 0; display: flex; align-items: center; justify-content: flex-start; gap: 8px;">
            <div style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; background-color: #ffffff;">
              <img src="${logoJsitUrl}" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
            <div style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; background-color: #ffffff;">
              <img src="${logoCahayaAmalUrl}" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
          </div>

          <!-- Center: School name and address -->
          <div style="text-align: center; flex-grow: 1; padding: 0 10px;">
            <h2 style="margin: 0; font-size: 11.5pt; font-weight: bold; text-transform: uppercase; line-height: 1.25; color: #000000; font-family: 'Times New Roman', serif;">YAYASAN CAHAYA AMAL BABEL</h2>
            <h1 style="margin: 2px 0 3px 0; font-size: 13.5pt; font-weight: bold; text-transform: uppercase; line-height: 1.25; color: #000000; font-family: 'Times New Roman', serif;">SMP ISLAM SMART PANGKALPINANG</h1>
            <p style="margin: 1px 0; font-size: 7.5pt; line-height: 1.25; color: #000000; font-family: 'Times New Roman', serif;">Jl. Padang Lama, Kelurahan Air Itam, Kecamatan Bukit Intan, Kota Pangkalpinang,</p>
            <p style="margin: 1px 0; font-size: 7.5pt; line-height: 1.25; color: #000000; font-family: 'Times New Roman', serif;">Prov. Kep. Bangka Belitung Kode Pos : 33149, No. HP : 0857-1844-0064,</p>
            <p style="margin: 1px 0; font-size: 7.5pt; line-height: 1.25; color: #000000; font-family: 'Times New Roman', serif;">NPSN : 70002556, No. Reg. JSIT : 2.19.71.03.001, E-Mail : smpsmartpkp@gmail.com</p>
          </div>

          <!-- Right Side: SMP logo -->
          <div style="width: 155px; flex-shrink: 0; display: flex; align-items: center; justify-content: flex-end;">
            <div style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; border-radius: 50%; overflow: hidden; border: 1.5px solid #cccccc; background-color: #ffffff;">
              <img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          </div>
        </div>

        <!-- Document Title -->
        <div style="text-align: center; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 13pt; font-weight: bold; text-transform: uppercase; line-height: 1.3; color: #000000; font-family: 'Times New Roman', serif;">Hasil Evaluasi Tahsin Tahfidz Qur'an (ETTQ)</h2>
          <h3 style="margin: 2px 0; font-size: 12pt; font-weight: bold; text-transform: uppercase; line-height: 1.3; color: #000000; font-family: 'Times New Roman', serif;">${subjectMeta.shortTitle}</h3>
          <p style="margin: 2px 0 0 0; font-size: 11pt; font-weight: bold; line-height: 1.3; color: #000000; font-family: 'Times New Roman', serif;">Semester-1, Tahun Pelajaran 2026/2027</p>
        </div>

        <!-- Halaqoh & Pembimbing Header Meta Table -->
        <table style="width: 100%; border: none; border-collapse: collapse; margin-bottom: 14px; font-family: 'Times New Roman', serif; font-size: 10.5pt; background-color: #ffffff; color: #000000;">
          <tr style="background-color: #ffffff;">
            <td style="width: 145px; font-weight: bold; border: none; padding: 2px 0; color: #000000; white-space: nowrap;">Ustadz/ah Pembimbing</td>
            <td style="width: 16px; text-align: center; border: none; padding: 2px 0; color: #000000;">:</td>
            <td style="font-weight: bold; border: none; padding: 2px 0; color: #000000;">${mentorName}</td>
            <td style="width: 130px; font-weight: bold; border: none; padding: 2px 0; text-align: right; color: #000000; white-space: nowrap;">Kelompok Halaqoh :</td>
            <td style="width: 160px; font-weight: bold; border: none; padding: 2px 0 2px 8px; color: #000000;">${halaqoh.name}</td>
          </tr>
        </table>

        <!-- Student Cards List -->
        <div>
          ${studentCardsHTML}
        </div>

        <!-- Signature & Keterangan Legend Block (Protected from Page Breaking) -->
        <div style="page-break-inside: avoid; break-inside: avoid; margin-top: 18px;">
          <!-- Signature right aligned with actual Mentor Name -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 18px;">
            <div style="width: 280px; text-align: center; font-size: 11pt; line-height: 1.35; font-family: 'Times New Roman', serif;">
              <p style="margin: 0 0 4px 0; color: #000000;">Pangkalpinang, 30 September 2025</p>
              <p style="margin: 0 0 52px 0; color: #000000;">Ustadz/ah Pembimbing,</p>
              <p style="margin: 0; font-weight: bold; text-decoration: underline; color: #000000;">( ${mentorName} )</p>
            </div>
          </div>

          <!-- Keterangan Legend Table (Pure White Background, 1px solid black) -->
          <div style="border: 1px solid #000000; font-size: 9pt; background-color: #ffffff; color: #000000; line-height: 1.3; font-family: 'Times New Roman', serif; max-width: 680px;">
            <div style="padding: 4px 8px; border-bottom: 1px solid #000000; font-weight: bold; background-color: #ffffff; color: #000000;">
              Keterangan :
            </div>
            <table style="width: 100%; border-collapse: collapse; border: none; font-size: 8.5pt; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">
              <tr style="background-color: #ffffff;">
                <td style="width: 110px; border-right: 1px solid #000000; border-bottom: none; padding: 4px 6px; vertical-align: top; background-color: #ffffff; color: #000000; line-height: 1.3;">
                  <div>A : 90 – 100</div>
                  <div>B : 75 – 89</div>
                  <div>C : 60 – 74</div>
                </td>
                <td style="border-bottom: none; padding: 4px 6px; vertical-align: top; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">
                  <table style="width: 100%; border: none; border-collapse: collapse; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif; line-height: 1.3;">
                    <tr style="background-color: #ffffff;">
                      <td style="width: 70px; border: none; font-weight: normal; padding: 1px 0; color: #000000;">Usaha</td>
                      <td style="width: 12px; border: none; padding: 1px 0; color: #000000;">:</td>
                      <td style="border: none; padding: 1px 0; color: #000000;">Ikhtiar yang dilakukan siswa untuk menghafal dan setoran.</td>
                    </tr>
                    <tr style="background-color: #ffffff;">
                      <td style="border: none; font-weight: normal; padding: 1px 0; color: #000000;">Proses</td>
                      <td style="border: none; padding: 1px 0; color: #000000;">:</td>
                      <td style="border: none; padding: 1px 0; color: #000000;">Teknis ketika siswa setoran ke pembimbing TnT dan penguji.</td>
                    </tr>
                    <tr style="background-color: #ffffff;">
                      <td style="border: none; font-weight: normal; padding: 1px 0; color: #000000;">Capaian</td>
                      <td style="border: none; padding: 1px 0; color: #000000;">:</td>
                      <td style="border: none; padding: 1px 0; color: #000000;">Hasil dari ETTQ</td>
                    </tr>
                    <tr style="background-color: #ffffff;">
                      <td style="border: none; font-weight: normal; padding: 1px 0; vertical-align: top; color: #000000;">Deskripsi</td>
                      <td style="border: none; padding: 1px 0; vertical-align: top; color: #000000;">:</td>
                      <td style="border: none; padding: 1px 0; color: #000000;">Keadaan reel siswa dalam pembelajaran ${subjectMeta.shortTitle} (apa saja yang harus diperbaiki)</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        </div>
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
      // 1. Create clean off-screen wrapper & pdfContainer exactly matching Master Raport
      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-9999px";
      wrapper.style.top = "-9999px";
      wrapper.style.width = "720px";
      wrapper.style.background = "white";

      const pdfContainer = document.createElement("div");
      pdfContainer.style.position = "relative";
      pdfContainer.style.width = "720px";
      pdfContainer.style.background = "white";
      pdfContainer.style.padding = "5px 0px";
      pdfContainer.style.boxSizing = "border-box";

      // 2. Generate isolated HTML
      pdfContainer.innerHTML = generateHalaqohHTML(activeHalaqoh, subjectMeta);
      wrapper.appendChild(pdfContainer);
      document.body.appendChild(wrapper);

      // 3. Setup Master Raport PDF options
      const safeSubName = subjectMeta.shortTitle.replace(/[^a-zA-Z0-9]/g, "_");
      const safeHalaqohName = activeHalaqoh.name.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `Raport_ETTQ_${safeSubName}_${safeHalaqohName}.pdf`;

      const opt = {
        margin: [8, 12, 12, 12],
        filename: fileName,
        image: { type: "jpeg", quality: 1.0 },
        html2canvas: {
          scale: 3.0,
          useCORS: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 720,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: { mode: ["avoid-all", "css"] },
      };

      // 4. Run export via html2pdf matching Master Raport
      const runExport = (pdfExporter: any) => {
        pdfExporter()
          .set(opt)
          .from(pdfContainer)
          .toPdf()
          .get("pdf")
          .then((pdf: any) => {
            const totalPages = pdf.internal.getNumberOfPages();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            for (let i = 1; i <= totalPages; i++) {
              pdf.setPage(i);
              pdf.setFont("times", "normal");
              pdf.setFontSize(9);
              pdf.setTextColor(0, 0, 0);
              const pageText = `Halaman ${i} dari ${totalPages}`;
              pdf.text(pageText, pageWidth - 12, pageHeight - 8, {
                align: "right",
              });
            }
            return pdf.output("blob");
          })
          .then((pdfBlob: Blob) => {
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            if (document.body.contains(wrapper)) {
              document.body.removeChild(wrapper);
            }
            setDownloadingSubject(null);
            resolve();
          })
          .catch((err: any) => {
            console.error("PDF export failed, trying direct save:", err);
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
              .catch((saveErr: any) => {
                console.error("Direct save failed too:", saveErr);
                if (document.body.contains(wrapper)) {
                  document.body.removeChild(wrapper);
                }
                setDownloadingSubject(null);
                handlePrint();
                resolve();
              });
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
            @page { size: A4 portrait; margin: 10mm 12mm 10mm 12mm; }
            html, body { margin: 0; padding: 0; background: #ffffff; color: #000000; font-family: 'Times New Roman', serif; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
            .student-card-item { page-break-inside: avoid !important; break-inside: avoid !important; }
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
