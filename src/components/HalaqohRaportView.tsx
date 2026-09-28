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
import { jsPDF } from "jspdf";
// @ts-ignore
import html2canvas from "html2canvas";

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

    // Total slots to match standard 17-santri halaqoh evaluation form
    const totalSlots = Math.max(17, memberStudents.length);

    // Helper to generate a single student card
    const renderCard = (slotNum: number) => {
      const student = memberStudents[slotNum - 1];
      const hasStudent = !!student;
      const studentName = hasStudent ? student.name : "";
      const kelasName = hasStudent ? formatKelasName(student.kelas) : "";

      const gradeObj = hasStudent
        ? grades.find(
            (g) => String(g.studentId).trim() === String(student.id).trim() && g.subject === subjectMeta.key
          )
        : null;

      const usahaVal = gradeObj?.usaha || "";
      const prosesVal = gradeObj?.proses || "";
      const capaianVal = gradeObj?.capaian || "";

      let descContent = "";
      if (hasStudent) {
        if (gradeObj?.deskripsi) {
          descContent = gradeObj.deskripsi;
        } else if (student.name.toLowerCase().includes("rayyan") || student.name.toLowerCase().includes("aqil")) {
          descContent = `Alhamdulillah ananda sholih Rayyan saat ini capaian hafalan Do’a sudah sampai no. 5 dan Hadits sampai ke no. 5. Harapannya ananda sholih Rayyan bias hafal lancer sesuai target. Ada beberapa yang harus diperbaiki oleh ananda yaitu ...……………………………….…………<br/>………………………………………………………………………………………………………<br/>………………………………………………………………………………………………………`;
        } else if (gradeObj?.score) {
          descContent = `Alhamdulillah ananda ${student.name} telah menyelesaikan pembelajaran ${subjectMeta.tableHeader} dengan perolehan nilai ${gradeObj.score}.`;
        }
      }

      return `
        <div class="student-card-item" style="margin-bottom: 14px; font-family: 'Times New Roman', serif; background-color: #ffffff; color: #000000; page-break-inside: avoid; break-inside: avoid;">
          <!-- Perfectly Aligned Name & Class Header -->
          <table style="width: 100%; border: none; border-collapse: collapse; margin-bottom: 3px; font-size: 11pt; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif; line-height: 1.3;">
            <tr style="background-color: #ffffff;">
              <td style="width: 100px; font-weight: normal; vertical-align: top; border: none; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif; white-space: nowrap;">${slotNum}. Nama</td>
              <td style="width: 16px; text-align: center; vertical-align: top; border: none; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">:</td>
              <td style="font-weight: ${hasStudent ? "bold" : "normal"}; vertical-align: top; border: none; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">${studentName}</td>
            </tr>
            <tr style="background-color: #ffffff;">
              <td style="width: 100px; font-weight: normal; vertical-align: top; border: none; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif; white-space: nowrap;">&nbsp;&nbsp;&nbsp;&nbsp;Kelas</td>
              <td style="width: 16px; text-align: center; vertical-align: top; border: none; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">:</td>
              <td style="vertical-align: top; border: none; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">${kelasName}</td>
            </tr>
          </table>

          <!-- Score Table -->
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; font-size: 10.5pt; text-align: center; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif; table-layout: fixed;">
            <thead>
              <tr style="background-color: #ffffff;">
                <th style="border: 1px solid #000000; padding: 3px 6px; width: 28%; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">${subjectMeta.tableHeader}</th>
                <th style="border: 1px solid #000000; padding: 3px 6px; width: 24%; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">Usaha</th>
                <th style="border: 1px solid #000000; padding: 3px 6px; width: 24%; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">Proses</th>
                <th style="border: 1px solid #000000; padding: 3px 6px; width: 24%; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">Capaian</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background-color: #ffffff; height: 24px;">
                <td style="border: 1px solid #000000; padding: 3px 6px; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">&nbsp;</td>
                <td style="border: 1px solid #000000; padding: 3px 6px; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">${usahaVal}</td>
                <td style="border: 1px solid #000000; padding: 3px 6px; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">${prosesVal}</td>
                <td style="border: 1px solid #000000; padding: 3px 6px; font-weight: bold; text-align: center; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">${capaianVal}</td>
              </tr>
            </tbody>
          </table>

          <!-- Description Box -->
          <div style="border: 1px solid #000000; border-top: none; padding: 5px 8px; font-size: 10pt; line-height: 1.35; min-height: 58px; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif; box-sizing: border-box;">
            <strong style="font-family: 'Times New Roman', serif;">Deskripsi :</strong> ${descContent}
          </div>
        </div>
      `;
    };

    // Build Cards for Page 1 (slots 1 to 4)
    const page1Cards = [1, 2, 3, 4].map(renderCard).join("");

    // Build Cards for Page 2 (slots 5 to 10)
    const page2Cards = [5, 6, 7, 8, 9, 10].map(renderCard).join("");

    // Build Cards for Page 3 (slots 11 to 16)
    const page3Cards = [11, 12, 13, 14, 15, 16].map(renderCard).join("");

    // Build Cards for Page 4 (slot 17 onwards)
    const remainingSlots: number[] = [];
    for (let s = 17; s <= totalSlots; s++) {
      remainingSlots.push(s);
    }
    const page4Cards = remainingSlots.map(renderCard).join("");

    const fullHTML = `
      <div class="raport-pdf-wrapper" style="font-family: 'Times New Roman', serif; color: #000000; background-color: #ffffff; margin: 0 auto; box-sizing: border-box; width: 100%;">
        <style>
          .raport-pdf-wrapper {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          .raport-page {
            width: 794px;
            height: 1123px;
            max-height: 1123px;
            margin: 0 auto 24px auto;
            background-color: #ffffff !important;
            color: #000000 !important;
            box-sizing: border-box;
            padding: 30px 42px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
          }
          @media print {
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }
            .raport-page {
              width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              padding: 20mm 20mm !important;
              box-shadow: none !important;
              page-break-after: always !important;
              break-after: page !important;
              margin: 0 !important;
              overflow: hidden !important;
            }
            .raport-page:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
          }
        </style>

        <!-- ==================== PAGE 1 ==================== -->
        <div class="raport-page">
          <!-- Kop Surat Resmi -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 8px; background-color: #ffffff;">
            <!-- Left: JSIT and Yayasan Cahaya Amal Logos -->
            <div style="width: 135px; flex-shrink: 0; display: flex; align-items: center; justify-content: flex-start; gap: 8px; background-color: #ffffff;">
              <div style="width: 58px; height: 58px; display: flex; align-items: center; justify-content: center; background-color: #ffffff;">
                <img src="${logoJsitUrl}" style="width: 100%; height: 100%; object-fit: contain;" />
              </div>
              <div style="width: 58px; height: 58px; display: flex; align-items: center; justify-content: center; background-color: #ffffff;">
                <img src="${logoCahayaAmalUrl}" style="width: 100%; height: 100%; object-fit: contain;" />
              </div>
            </div>

            <!-- Center: Kop Details -->
            <div style="text-align: center; flex-grow: 1; padding: 0 10px; background-color: #ffffff; color: #000000;">
              <h2 style="margin: 0; font-size: 11pt; font-weight: bold; text-transform: uppercase; line-height: 1.2; color: #000000; font-family: 'Times New Roman', serif;">YAYASAN CAHAYA AMAL BABEL</h2>
              <h1 style="margin: 2px 0 3px 0; font-size: 13pt; font-weight: bold; text-transform: uppercase; line-height: 1.2; color: #000000; font-family: 'Times New Roman', serif;">SMP ISLAM SMART PANGKALPINANG</h1>
              <p style="margin: 1px 0; font-size: 7.5pt; line-height: 1.25; color: #000000; font-family: 'Times New Roman', serif;">Jl. Padang Lama, Kelurahan Air Itam, Kecamatan Bukit Intan, Kota Pangkalpinang,</p>
              <p style="margin: 1px 0; font-size: 7.5pt; line-height: 1.25; color: #000000; font-family: 'Times New Roman', serif;">Prov. Kep. Bangka Belitung Kode Pos : 33149, No. HP : 0857-1844-0064,</p>
              <p style="margin: 1px 0; font-size: 7.5pt; line-height: 1.25; color: #000000; font-family: 'Times New Roman', serif;">NPSN : 70002556, No. Reg. JSIT : 2.19.71.03.001, E-Mail : smpsmartpkp@gmail.com</p>
            </div>

            <!-- Right: SMP Logo -->
            <div style="width: 135px; flex-shrink: 0; display: flex; align-items: center; justify-content: flex-end; background-color: #ffffff;">
              <div style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 50%; overflow: hidden; border: 1.5px solid #cccccc; background-color: #ffffff;">
                <img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
            </div>
          </div>

          <!-- Official Indonesian Kop Double Line -->
          <div style="border-bottom: 1px solid #000000; margin-bottom: 2px;"></div>
          <div style="border-bottom: 2.5px solid #000000; margin-bottom: 14px;"></div>

          <!-- Document Main Header Title -->
          <div style="text-align: center; margin-bottom: 16px; background-color: #ffffff; color: #000000;">
            <h2 style="margin: 0; font-size: 13pt; font-weight: bold; text-transform: uppercase; line-height: 1.3; color: #000000; font-family: 'Times New Roman', serif;">Hasil Evaluasi Tahsin Tahfidz Qur,an (ETTQ</h2>
            <h3 style="margin: 2px 0; font-size: 12pt; font-weight: bold; text-transform: uppercase; line-height: 1.3; color: #000000; font-family: 'Times New Roman', serif;">${subjectMeta.shortTitle}</h3>
            <p style="margin: 2px 0 0 0; font-size: 11pt; font-weight: bold; line-height: 1.3; color: #000000; font-family: 'Times New Roman', serif;">Semester-1, Tahun Pelajaran 2026/2027</p>
          </div>

          <!-- Cards 1 to 4 -->
          <div>
            ${page1Cards}
          </div>
        </div>

        <div class="raport-page-break"></div>

        <!-- ==================== PAGE 2 ==================== -->
        <div class="raport-page">
          <!-- Cards 5 to 10 -->
          <div>
            ${page2Cards}
          </div>
        </div>

        <div class="raport-page-break"></div>

        <!-- ==================== PAGE 3 ==================== -->
        <div class="raport-page">
          <!-- Cards 11 to 16 -->
          <div>
            ${page3Cards}
          </div>
        </div>

        <div class="raport-page-break"></div>

        <!-- ==================== PAGE 4 ==================== -->
        <div class="raport-page">
          <!-- Card 17 -->
          <div>
            ${page4Cards}
          </div>

          <!-- Signature right aligned -->
          <div style="display: flex; justify-content: flex-end; margin-top: 25px; margin-bottom: 25px; background-color: #ffffff;">
            <div style="width: 260px; text-align: center; font-size: 11pt; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif; line-height: 1.3;">
              <p style="margin: 0 0 4px 0; color: #000000; font-family: 'Times New Roman', serif;">Pangkalpinang, 30 September 2025</p>
              <p style="margin: 0 0 55px 0; color: #000000; font-family: 'Times New Roman', serif;">Ustadz/ah Pembimbing,</p>
              <p style="margin: 0; font-family: 'Times New Roman', serif;">( …………………………. )</p>
            </div>
          </div>

          <!-- Keterangan Legend Table -->
          <div style="border: 1px solid #000000; font-size: 9pt; background-color: #ffffff; color: #000000; line-height: 1.3; font-family: 'Times New Roman', serif; max-width: 650px;">
            <div style="padding: 3px 6px; border-bottom: 1px solid #000000; font-weight: bold; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">
              Keterangan :
            </div>
            <table style="width: 100%; border-collapse: collapse; border: none; font-size: 8.5pt; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">
              <tr style="background-color: #ffffff;">
                <td style="width: 110px; border-right: 1px solid #000000; border-bottom: none; padding: 4px 6px; vertical-align: top; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif; line-height: 1.3;">
                  <div>A : 90 – 100</div>
                  <div>B : 75 – 89</div>
                  <div>C : 60 – 74</div>
                </td>
                <td style="border-bottom: none; padding: 4px 6px; vertical-align: top; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">
                  <table style="width: 100%; border: none; border-collapse: collapse; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif; line-height: 1.3;">
                    <tr style="background-color: #ffffff;">
                      <td style="width: 70px; border: none; font-weight: normal; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">Usaha</td>
                      <td style="width: 12px; border: none; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">:</td>
                      <td style="border: none; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">Ikhtiar yang dilakukan siswa untuk menghafal dan setoran.</td>
                    </tr>
                    <tr style="background-color: #ffffff;">
                      <td style="border: none; font-weight: normal; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">Proses</td>
                      <td style="border: none; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">:</td>
                      <td style="border: none; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">Teknis ketika siswa setoran ke pembimbing TnT dan penguji.</td>
                    </tr>
                    <tr style="background-color: #ffffff;">
                      <td style="border: none; font-weight: normal; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">Capaian</td>
                      <td style="border: none; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">:</td>
                      <td style="border: none; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">Hasil dari ETTQ</td>
                    </tr>
                    <tr style="background-color: #ffffff;">
                      <td style="border: none; font-weight: normal; padding: 1px 0; vertical-align: top; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">Deskripsi</td>
                      <td style="border: none; padding: 1px 0; vertical-align: top; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">:</td>
                      <td style="border: none; padding: 1px 0; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', serif;">Keadaan reel siswa dalam pembelajarn Tahsin (apa saja yang harus diperbaiki dalam tahsinnya)</td>
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

  // Handle PDF download of a specific Keislaman subject
  const handleDownloadSinglePDF = async (
    subjectMeta: (typeof KEISLAMAN_SUBJECTS)[0]
  ) => {
    if (!activeHalaqoh) return;
    setDownloadingSubject(subjectMeta.key);

    let wrapper: HTMLDivElement | null = null;
    try {
      // 1. Create a mounted, styled container in DOM at fixed (0, 0) coordinates
      wrapper = document.createElement("div");
      wrapper.id = "raport-pdf-export-mount";
      wrapper.style.position = "fixed";
      wrapper.style.top = "0";
      wrapper.style.left = "0";
      wrapper.style.width = "794px";
      wrapper.style.backgroundColor = "#ffffff";
      wrapper.style.color = "#000000";
      wrapper.style.zIndex = "99999";
      wrapper.style.boxSizing = "border-box";
      wrapper.style.overflow = "visible";
      wrapper.innerHTML = generateHalaqohHTML(activeHalaqoh, subjectMeta);
      document.body.appendChild(wrapper);

      // Brief delay to ensure all images, logos, and fonts are calculated
      await new Promise((resolve) => setTimeout(resolve, 400));

      // 2. Query all discrete A4 pages inside the container
      const pageElements = wrapper.querySelectorAll<HTMLElement>(".raport-page");
      if (!pageElements || pageElements.length === 0) {
        throw new Error("Halaman raport tidak ditemukan");
      }

      // 3. Initialize jsPDF instance (A4 portrait: 210 x 297 mm)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      // 4. Capture each page individually with html2canvas and draw into PDF
      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          width: 794,
          height: 1123,
          windowWidth: 794,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        if (i > 0) {
          pdf.addPage("a4", "portrait");
        }
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      }

      // 5. Trigger download via standard Blob URL
      const fileName = `Raport_${subjectMeta.shortTitle.replace(/[^a-zA-Z0-9]/g, "_")}_${activeHalaqoh.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      const pdfBlob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Gagal mendownload PDF halaqoh", e);
      alert("Gagal mengunduh berkas PDF otomatis. Mengalihkan ke jendela cetak dokumen...");
      handlePrint();
    } finally {
      if (wrapper && document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }
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
            @page { size: A4 portrait; margin: 0; }
            html, body { margin: 0; padding: 0; background: #ffffff; color: #000000; font-family: 'Times New Roman', serif; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
            .raport-page {
              width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              padding: 20mm 20mm !important;
              box-shadow: none !important;
              page-break-after: always !important;
              break-after: page !important;
              margin: 0 auto !important;
              overflow: hidden !important;
            }
            .raport-page:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
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
