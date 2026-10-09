import React, { useState, useEffect, useRef } from "react";
import { Teacher, Student, Grade, Halaqoh, sortHalaqohStudents } from "../types";
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
  Archive,
  Settings,
  Check,
  X,
} from "lucide-react";
import logoUrl from "../assets/images/smp_logo_exact_match_revised_1783840969621.jpg";
import logoJsitUrl from "../assets/images/logo_jsit_indonesia_1783956323407.jpg";
import logoCahayaAmalUrl from "../assets/images/logo_cahaya_amal_1783956338475.jpg";
import kopSuratBannerUrl from "../assets/images/kop_surat_banner.png";
import { exportHalaqohToWord, exportAllHalaqohToZip, triggerBrowserDownload } from "../lib/wordExport";
import JSZip from "jszip";
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
  const [descFontSize, setDescFontSize] = useState<string>(() => {
    return localStorage.getItem("halaqoh_desc_font_size") || "9.5pt";
  });

  const handleDescFontSizeChange = (newSize: string) => {
    setDescFontSize(newSize);
    localStorage.setItem("halaqoh_desc_font_size", newSize);
  };

  // Dynamic Academic Year, Semester, Date & Location Settings for Halaqoh Raport
  const [tahunPelajaran, setTahunPelajaran] = useState<string>(() => {
    return localStorage.getItem("halaqoh_tahun_pelajaran") || "2025/2026";
  });
  const [semesterName, setSemesterName] = useState<string>(() => {
    return localStorage.getItem("halaqoh_semester") || "Semester-1";
  });
  const [tanggalRaport, setTanggalRaport] = useState<string>(() => {
    return localStorage.getItem("halaqoh_tanggal_raport") || "30 September 2025";
  });
  const [kota, setKota] = useState<string>(() => {
    return localStorage.getItem("halaqoh_kota") || "Pangkalpinang";
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  // Form states for the modal
  const [formTahunPelajaran, setFormTahunPelajaran] = useState(tahunPelajaran);
  const [formSemesterName, setFormSemesterName] = useState(semesterName);
  const [formTanggalRaport, setFormTanggalRaport] = useState(tanggalRaport);
  const [formKota, setFormKota] = useState(kota);

  const handleOpenSettingsModal = () => {
    setFormTahunPelajaran(tahunPelajaran);
    setFormSemesterName(semesterName);
    setFormTanggalRaport(tanggalRaport);
    setFormKota(kota);
    setSettingsMessage("");
    setIsSettingsModalOpen(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage("");
    try {
      const payload = {
        tahunPelajaran: formTahunPelajaran.trim() || "2025/2026",
        semesterName: formSemesterName.trim() || "Semester-1",
        tanggalRaport: formTanggalRaport.trim() || "30 September 2025",
        kota: formKota.trim() || "Pangkalpinang",
        descFontSize,
      };

      await fetch("/api/settings/halaqoh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Update local storage
      localStorage.setItem("halaqoh_tahun_pelajaran", payload.tahunPelajaran);
      localStorage.setItem("halaqoh_semester", payload.semesterName);
      localStorage.setItem("halaqoh_tanggal_raport", payload.tanggalRaport);
      localStorage.setItem("halaqoh_kota", payload.kota);

      // Update active component state
      setTahunPelajaran(payload.tahunPelajaran);
      setSemesterName(payload.semesterName);
      setTanggalRaport(payload.tanggalRaport);
      setKota(payload.kota);

      setSettingsMessage("Pengaturan tahun dan format raport halaqoh berhasil disimpan!");
      setTimeout(() => {
        setIsSettingsModalOpen(false);
        setSettingsMessage("");
      }, 1000);
    } catch (err: any) {
      console.error("Gagal menyimpan pengaturan halaqoh:", err);
      const payload = {
        tahunPelajaran: formTahunPelajaran.trim() || "2025/2026",
        semesterName: formSemesterName.trim() || "Semester-1",
        tanggalRaport: formTanggalRaport.trim() || "30 September 2025",
        kota: formKota.trim() || "Pangkalpinang",
      };
      localStorage.setItem("halaqoh_tahun_pelajaran", payload.tahunPelajaran);
      localStorage.setItem("halaqoh_semester", payload.semesterName);
      localStorage.setItem("halaqoh_tanggal_raport", payload.tanggalRaport);
      localStorage.setItem("halaqoh_kota", payload.kota);
      setTahunPelajaran(payload.tahunPelajaran);
      setSemesterName(payload.semesterName);
      setTanggalRaport(payload.tanggalRaport);
      setKota(payload.kota);
      setIsSettingsModalOpen(false);
    } finally {
      setSavingSettings(false);
    }
  };

  // Quick helper to construct custom format payload
  const getCustomFormat = () => ({
    tahunPelajaran,
    semesterName,
    tanggalRaport,
    kota,
    headerTitle: "Hasil Evaluasi Tahsin Tahfidz Qur,an (ETTQ)",
  });

  const [downloadingSubject, setDownloadingSubject] = useState<string | null>(
    null
  );
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [downloadingWordSubject, setDownloadingWordSubject] = useState<string | null>(
    null
  );
  const [isBatchDownloadingWord, setIsBatchDownloadingWord] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isDownloadingZipPDF, setIsDownloadingZipPDF] = useState(false);

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
        teachers,
        descFontSize,
        getCustomFormat()
      );
    } catch (err) {
      console.error("Gagal mengekspor file Word:", err);
      alert("Gagal mengunduh berkas Word. Silakan coba kembali.");
    } finally {
      setDownloadingWordSubject(null);
    }
  };

  // Handle batch download of all 4 Word files bundled in 1 ZIP
  const handleDownloadZipWord = async () => {
    if (!activeHalaqoh) return;
    setIsDownloadingZip(true);
    try {
      await exportAllHalaqohToZip(
        activeHalaqoh,
        students,
        grades,
        teachers,
        descFontSize,
        undefined,
        getCustomFormat()
      );
    } catch (err) {
      console.error("Gagal mengunduh arsip zip Word:", err);
      alert("Gagal mengunduh arsip ZIP Word. Silakan coba kembali.");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Handle batch download of all 4 Word files separately
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
      const [resH, resS, resG, resT, resSet] = await Promise.all([
        fetch("/api/halaqoh"),
        fetch("/api/students"),
        fetch("/api/grades"),
        fetch("/api/teachers"),
        fetch("/api/settings/halaqoh").catch(() => null),
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

      if (resSet && resSet.ok) {
        const sConf = await resSet.json().catch(() => null);
        if (sConf) {
          if (sConf.tahunPelajaran) {
            setTahunPelajaran(sConf.tahunPelajaran);
            localStorage.setItem("halaqoh_tahun_pelajaran", sConf.tahunPelajaran);
          }
          if (sConf.semesterName) {
            setSemesterName(sConf.semesterName);
            localStorage.setItem("halaqoh_semester", sConf.semesterName);
          }
          if (sConf.tanggalRaport) {
            setTanggalRaport(sConf.tanggalRaport);
            localStorage.setItem("halaqoh_tanggal_raport", sConf.tanggalRaport);
          }
          if (sConf.kota) {
            setKota(sConf.kota);
            localStorage.setItem("halaqoh_kota", sConf.kota);
          }
          if (sConf.descFontSize) {
            setDescFontSize(sConf.descFontSize);
            localStorage.setItem("halaqoh_desc_font_size", sConf.descFontSize);
          }
        }
      }

      if (hArr.length > 0) {
        // If current user is a mentor of a halaqoh, auto-select it
        const myHalaqoh = hArr.find(
          (h: Halaqoh) =>
            (h.mentorTeacherId && h.mentorTeacherId === currentUser.id) ||
            (Boolean(h.mentorName) && h.mentorName.toLowerCase().includes((currentUser.name || "").toLowerCase()))
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

  // Filter students in this halaqoh - sorted by Class (7 -> 8 -> 9) and then Alphabetical (A -> Z)
  const halaqohStudents = React.useMemo(() => {
    if (!activeHalaqoh) return [];
    const idSet = new Set(activeHalaqoh.studentIds || []);
    return students
      .filter((s) => idSet.has(s.id))
      .sort(sortHalaqohStudents);
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
    // 1. Resolve actual member students strictly belonging to this halaqoh (ordered 7 -> 8 -> 9 then A-Z)
    const memberStudents = (halaqoh.studentIds || [])
      .map((id) => students.find((s) => String(s.id).trim() === String(id).trim()))
      .filter((s): s is Student => Boolean(s))
      .sort(sortHalaqohStudents);

    if (memberStudents.length === 0) {
      return `
        <div style="background-color: #ffffff; color: #000000; padding: 30px 20px; text-align: center; font-family: 'Times New Roman', serif;">
          <img src="${kopSuratBannerUrl}" alt="Kop Surat" style="width: 100%; max-width: 100%; height: auto; display: block; margin: 0 auto 24px auto;" />
          <div style="margin: 30px auto; max-width: 520px; padding: 24px; border: 2px dashed #cbd5e1; border-radius: 12px; background-color: #f8fafc;">
            <p style="font-size: 13pt; font-weight: bold; margin-bottom: 8px; color: #0f172a;">Belum Ada Santri di ${halaqoh.name}</p>
            <p style="font-size: 10.5pt; color: #64748b; line-height: 1.5; margin: 0;">
              Kelompok halaqoh ini belum memiliki santri yang ditetapkan. Silakan pilih dan masukkan santri melalui menu <strong>Panel Admin &gt; Manajemen Halaqoh</strong>.
            </p>
          </div>
        </div>
      `;
    }

    // 2. Resolve Ustadz/ah Pembimbing name - only from actual halaqoh or registered teacher
    const mentorTeacher = teachers.find((t) => t.id === halaqoh.mentorTeacherId);
    const mentorName =
      halaqoh.mentorName && halaqoh.mentorName.trim() !== ""
        ? halaqoh.mentorName.trim()
        : mentorTeacher?.name && mentorTeacher.name.trim() !== ""
        ? mentorTeacher.name.trim()
        : "";

    // 3. Helper to generate a single student card strictly matching reference PDF 2
    const renderStudentCard = (student: Student, globalIdx: number) => {
      const cardNum = globalIdx + 1;
      const studentName = student.name ? student.name.trim() : "-";
      const kelasName = formatKelasName(student.kelas);

      const normalizeSubject = (s: string | undefined | null) => {
        if (!s) return "";
        return s
          .toLowerCase()
          .replace(/[’'"`]/g, "'")
          .replace(/[-_]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      };

      const isSameSub = (a: string | undefined | null, b: string | undefined | null) => {
        if (!a || !b) return false;
        const normA = normalizeSubject(a);
        const normB = normalizeSubject(b);
        if (normA === normB) return true;
        const aliasA = normA.replace("tahfizh", "tahfidz").replace("doa", "do'a").replace("&", "dan");
        const aliasB = normB.replace("tahfizh", "tahfidz").replace("doa", "do'a").replace("&", "dan");
        return aliasA === aliasB;
      };

      const gradeObj = grades.find(
        (g) =>
          String(g.studentId).trim() === String(student.id).trim() &&
          isSameSub(g.subject, subjectMeta.key)
      );

      const scoreToPredicate = (score: number | string | undefined | null): string => {
        if (score === undefined || score === null || score === "") return "";
        const num = typeof score === "number" ? score : parseFloat(String(score));
        if (isNaN(num)) return String(score).trim();
        if (num >= 90) return "A";
        if (num >= 80) return "B";
        if (num >= 70) return "C";
        return "D";
      };

      const usahaVal = (gradeObj?.usaha && gradeObj.usaha.trim() !== "")
        ? gradeObj.usaha.trim()
        : (gradeObj?.score !== undefined && gradeObj?.score !== null && gradeObj?.score !== "")
        ? scoreToPredicate(gradeObj.score)
        : "A";

      const prosesVal = (gradeObj?.proses && gradeObj.proses.trim() !== "")
        ? gradeObj.proses.trim()
        : (gradeObj?.score !== undefined && gradeObj?.score !== null && gradeObj?.score !== "")
        ? scoreToPredicate(gradeObj.score)
        : "A";

      const capaianVal = (gradeObj?.capaian && gradeObj.capaian.trim() !== "")
        ? gradeObj.capaian.trim()
        : (gradeObj?.score !== undefined && gradeObj?.score !== null && gradeObj?.score !== "")
        ? scoreToPredicate(gradeObj.score)
        : "A";

      let descContent = "";
      if (gradeObj?.deskripsi && gradeObj.deskripsi.trim()) {
        descContent = gradeObj.deskripsi.trim();
      } else {
        const studentFirstName = student.name.split(" ")[0] || student.name;
        descContent = `Alhamdulillah ananda ${studentFirstName} saat ini capaian pembelajaran ${subjectMeta.tableHeader} telah tuntas sesuai target. Harapannya ananda bisa terus istiqomah dan lancar.`;
      }

      return `
        <div class="student-card-item" style="margin-top: 0px; margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid; font-family: 'Times New Roman', Times, serif; background-color: #ffffff; color: #000000; width: 100%; box-sizing: border-box; padding: 0;">
          <!-- Perfectly Aligned Name & Class Header with Flex layout to avoid text truncation -->
          <div style="margin-top: 0px; margin-bottom: 3px; padding: 0; font-family: 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.35; color: #000000; text-align: left;">
            <div style="display: flex; align-items: flex-start; text-align: left; line-height: 1.35;">
              <span style="display: inline-block; width: 62px; flex-shrink: 0; color: #000000; text-align: left;">${cardNum}. Nama</span>
              <span style="display: inline-block; width: 14px; flex-shrink: 0; text-align: center; color: #000000;">:</span>
              <span style="color: #000000; font-weight: normal; flex-grow: 1; word-break: break-word;">${studentName}</span>
            </div>
            <div style="display: flex; align-items: flex-start; text-align: left; line-height: 1.35;">
              <span style="display: inline-block; width: 62px; flex-shrink: 0; color: #000000; text-align: left;">&nbsp;&nbsp;&nbsp;&nbsp;Kelas</span>
              <span style="display: inline-block; width: 14px; flex-shrink: 0; text-align: center; color: #000000;">:</span>
              <span style="color: #000000; font-weight: normal; flex-grow: 1; word-break: break-word;">${kelasName}</span>
            </div>
          </div>

          <!-- Score & Description Table with rowspan=2 matching reference PDF 2 format exactly -->
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; font-size: 10pt; text-align: center; background-color: #ffffff; table-layout: fixed; margin: 0; box-sizing: border-box;">
            <tbody>
              <!-- Row 1: Headers & Subject Name (rowspan=2) -->
              <tr style="background-color: #ffffff;">
                <td rowspan="2" style="border: 1px solid #000000; padding: 3.5px 6px; width: 49%; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff; line-height: 1.3; vertical-align: middle;">${subjectMeta.tableHeader}</td>
                <td style="border: 1px solid #000000; padding: 0px 6px 5.5px 6px; width: 17%; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff; line-height: 1.2; vertical-align: middle;">
                  <span style="display: inline-block; position: relative; top: -2.5px;">Usaha</span>
                </td>
                <td style="border: 1px solid #000000; padding: 0px 6px 5.5px 6px; width: 17%; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff; line-height: 1.2; vertical-align: middle;">
                  <span style="display: inline-block; position: relative; top: -2.5px;">Proses</span>
                </td>
                <td style="border: 1px solid #000000; padding: 0px 6px 5.5px 6px; width: 17%; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff; line-height: 1.2; vertical-align: middle;">
                  <span style="display: inline-block; position: relative; top: -2.5px;">Capaian</span>
                </td>
              </tr>
              <!-- Row 2: Scores -->
              <tr style="background-color: #ffffff;">
                <td style="border: 1px solid #000000; padding: 0px 6px 5.5px 6px; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff; line-height: 1.3; vertical-align: middle;">
                  <span style="display: inline-block; position: relative; top: -2px;">${usahaVal}</span>
                </td>
                <td style="border: 1px solid #000000; padding: 0px 6px 5.5px 6px; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff; line-height: 1.3; vertical-align: middle;">
                  <span style="display: inline-block; position: relative; top: -2px;">${prosesVal}</span>
                </td>
                <td style="border: 1px solid #000000; padding: 0px 6px 5.5px 6px; font-weight: bold; text-align: center; color: #000000; background-color: #ffffff; line-height: 1.3; vertical-align: middle;">
                  <span style="display: inline-block; position: relative; top: -2px;">${capaianVal}</span>
                </td>
              </tr>
              <!-- Row 3: Description -->
              <tr style="background-color: #ffffff;">
                <td colspan="4" style="border: 1px solid #000000; padding: 4.5px 8px; font-size: ${descFontSize}; line-height: 1.38; min-height: 48px; vertical-align: top; background-color: #ffffff; color: #000000; text-align: justify; word-break: break-word; overflow-wrap: break-word;">
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
        <p style="margin: 2px 0 0 0; font-size: 10.5pt; font-weight: bold; line-height: 1.3; color: #000000; font-family: 'Times New Roman', serif;">${semesterName}, Tahun Pelajaran ${tahunPelajaran}</p>
      </div>
    `;

    // 6. Signature & Keterangan Legend Block HTML matching PDF 1 Page 4
    const signatureKeteranganHTML = `
      <div style="margin-top: 14px; page-break-inside: avoid; break-inside: avoid; background-color: #ffffff; width: 100%; box-sizing: border-box;">
        <!-- Signature right aligned with actual Mentor Name -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
          <div style="width: 280px; text-align: center; font-size: 10.5pt; line-height: 1.35; font-family: 'Times New Roman', serif; color: #000000;">
            <p style="margin: 0 0 3px 0; color: #000000;">${kota}, ${tanggalRaport}</p>
            <p style="margin: 0 0 36px 0; color: #000000;">Ustadz/ah Pembimbing,</p>
            <p style="margin: 0; color: #000000;">( <span style="font-weight: bold; text-decoration: ${mentorName ? 'underline' : 'none'};">${mentorName || "....................................................."}</span> )</p>
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

  // Helper to generate a single Keislaman PDF as a Blob
  const generateHalaqohPdfBlob = async (
    subjectMeta: (typeof KEISLAMAN_SUBJECTS)[0]
  ): Promise<Blob> => {
    if (!activeHalaqoh) throw new Error("No active halaqoh");

    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-9999px";
    wrapper.style.top = "0px";
    wrapper.style.width = "720px";
    wrapper.style.backgroundColor = "#ffffff";
    wrapper.style.zIndex = "-9999";

    const pdfContainer = document.createElement("div");
    pdfContainer.style.position = "relative";
    pdfContainer.style.width = "720px";
    pdfContainer.style.backgroundColor = "#ffffff";
    pdfContainer.style.padding = "0px";
    pdfContainer.style.boxSizing = "border-box";
    pdfContainer.style.color = "#000000";

    pdfContainer.innerHTML = generateHalaqohHTML(activeHalaqoh, subjectMeta);
    wrapper.appendChild(pdfContainer);
    document.body.appendChild(wrapper);

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

    try {
      const runner =
        (window as any).html2pdf ||
        (typeof html2pdf === "function" ? html2pdf : (html2pdf as any)?.default);
      const pdf = await runner().set(opt).from(pdfContainer).toPdf().get("pdf");
      const blob = pdf.output("blob");
      return blob;
    } finally {
      if (document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }
    }
  };

  // Handle Batch downloading of all 4 Keislaman PDFs in 1 ZIP
  const handleDownloadZipPDF = async () => {
    if (!activeHalaqoh) return;
    setIsDownloadingZipPDF(true);
    try {
      const zip = new JSZip();
      const safeHalaqohName = activeHalaqoh.name.replace(/[^a-zA-Z0-9]/g, "_");
      for (const sub of KEISLAMAN_SUBJECTS) {
        const safeSubName = sub.shortTitle.replace(/[^a-zA-Z0-9]/g, "_");
        const blob = await generateHalaqohPdfBlob(sub);
        zip.file(`Raport_ETTQ_${safeSubName}_${safeHalaqohName}.pdf`, blob);
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      triggerBrowserDownload(
        zipBlob,
        `Raport_Keislaman_Halaqoh_${safeHalaqohName}_4Mapel_PDF.zip`
      );
    } catch (err) {
      console.error("Batch Keislaman PDF ZIP failed:", err);
    } finally {
      setIsDownloadingZipPDF(false);
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
          {/* Tombol Pengaturan Tahun & Sesi Raport Halaqoh */}
          <button
            onClick={handleOpenSettingsModal}
            className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-xs"
            title="Ubah Tahun Pelajaran, Semester, dan Tanggal Raport Halaqoh"
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Tahun: <strong className="text-white">{tahunPelajaran}</strong> ({semesterName})</span>
            <Settings className="w-3.5 h-3.5 text-amber-300 ml-0.5" />
          </button>

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
            onClick={handleDownloadZipWord}
            disabled={!activeHalaqoh || halaqohStudents.length === 0 || isDownloadingZip}
            title="Download seluruh 4 mapel dalam 1 paket ZIP tanpa gangguan peringatan izin browser"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 border border-emerald-400/40 cursor-pointer transition disabled:opacity-50"
          >
            {isDownloadingZip ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Archive className="w-4 h-4 text-white" />
            )}
            <span>Download 4 Berkas (.zip)</span>
          </button>

          <button
            onClick={handleDownloadAllSeparateWord}
            disabled={!activeHalaqoh || halaqohStudents.length === 0 || isBatchDownloadingWord}
            className="px-3.5 py-2 rounded-xl bg-[#0f172a] hover:bg-[#162442] border border-[#223658] text-slate-300 hover:text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
          >
            {isBatchDownloadingWord ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
            ) : (
              <FileDown className="w-4 h-4 text-indigo-400" />
            )}
            <span>Download 4 Word Terpisah</span>
          </button>

          <button
            onClick={handleDownloadZipPDF}
            disabled={!activeHalaqoh || halaqohStudents.length === 0 || isDownloadingZipPDF}
            title="Download seluruh 4 mapel PDF keislaman dalam 1 berkas arsip ZIP"
            className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-200 hover:text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
          >
            {isDownloadingZipPDF ? (
              <div className="w-4 h-4 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin"></div>
            ) : (
              <Archive className="w-4 h-4 text-emerald-400" />
            )}
            <span>Download 4 PDF (.zip)</span>
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
        <div className="md:col-span-4 flex flex-col gap-1.5">
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
                  {h.name}{h.mentorName ? ` — ${h.mentorName}` : ""} ({h.studentIds?.length || 0} Santri)
                </option>
              ))}
            </select>
          ) : (
            <div className="p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Belum ada data halaqoh.</span>
            </div>
          )}
        </div>

        {/* Keislaman Subject Selector */}
        <div className="md:col-span-5 flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pilih Berkas Raport ETTQ</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {KEISLAMAN_SUBJECTS.map((sub) => {
              const isActive = selectedSubjectKey === sub.key;
              const isDownloadingWord = downloadingWordSubject === sub.key;

              return (
                <div
                  key={sub.key}
                  onClick={() => setSelectedSubjectKey(sub.key)}
                  className={`p-2 rounded-xl text-[11px] font-bold text-left transition flex flex-col justify-between border cursor-pointer ${
                    isActive
                      ? "bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-950/60"
                      : "bg-[#0e172a] border-[#223658] text-slate-300 hover:text-white hover:bg-[#15233c]"
                  }`}
                >
                  <span className="truncate select-none">{sub.tableHeader}</span>
                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadSingleWord(sub);
                      }}
                      className="px-1.5 py-0.5 rounded bg-blue-500 hover:bg-blue-400 text-white text-[9px] font-mono flex items-center gap-1 transition border-none cursor-pointer"
                      title={`Download File Word (.docx) ${sub.tableHeader}`}
                    >
                      {isDownloadingWord ? (
                        <div className="w-2.5 h-2.5 border border-white/40 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <FileText className="w-2.5 h-2.5" />
                      )}
                      <span>DOCX</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadSinglePDF(sub);
                      }}
                      className="px-1.5 py-0.5 rounded bg-black/40 hover:bg-black/70 text-slate-200 text-[9px] font-mono flex items-center gap-1 transition border-none cursor-pointer"
                      title={`Download File PDF ${sub.tableHeader}`}
                    >
                      <Download className="w-2.5 h-2.5 text-emerald-400" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Font Size Selector for Uniform Description */}
        <div className="md:col-span-3 flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Ukuran Font Deskripsi</span>
          </label>
          <div className="relative">
            <select
              value={descFontSize}
              onChange={(e) => handleDescFontSizeChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0e172a] border border-amber-500/40 rounded-xl text-xs font-bold text-amber-200 focus:outline-none focus:border-amber-400 cursor-pointer appearance-none pr-8"
            >
              <option value="8.5pt" className="bg-[#0e172a] text-white">8.5 pt — Sangat Ringkas</option>
              <option value="9.0pt" className="bg-[#0e172a] text-white">9.0 pt — Ringkas</option>
              <option value="9.5pt" className="bg-[#0e172a] text-white">9.5 pt — Standar (Rekomendasi)</option>
              <option value="10.0pt" className="bg-[#0e172a] text-white">10.0 pt — Sedang</option>
              <option value="10.5pt" className="bg-[#0e172a] text-white">10.5 pt — Besar</option>
              <option value="11.0pt" className="bg-[#0e172a] text-white">11.0 pt — Sangat Besar</option>
            </select>
            <ChevronDown className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <span className="text-[10px] text-slate-400">
            Penyesuaian otomatis seragam untuk Layar, PDF, Cetak & Word (.docx)
          </span>
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

      {/* MODAL PENGATURAN TAHUN AJARAN & FORMAT RAPORT HALAQOH */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f172a] border-2 border-[#2b4168] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#0c1322] border-b border-[#1e3256] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Pengaturan Raport Halaqoh
                  </h3>
                  <p className="text-xs text-slate-300">
                    Ubah Tahun Ajaran, Semester, dan Tanggal Terbit Raport ETTQ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2844] transition cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveSettings} className="p-5 sm:p-6 space-y-4">
              {settingsMessage && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-400 text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{settingsMessage}</span>
                </div>
              )}

              {/* 1. Tahun Pelajaran */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-between">
                  <span>Tahun Pelajaran:</span>
                  <span className="text-[10px] text-amber-300 font-mono font-normal">Wajib Diisi</span>
                </label>
                <input
                  type="text"
                  value={formTahunPelajaran}
                  onChange={(e) => setFormTahunPelajaran(e.target.value)}
                  placeholder="Contoh: 2025/2026 atau 2026/2027"
                  className="w-full px-3.5 py-2.5 bg-[#0a101f] border border-[#2b4168] rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  required
                />
                {/* Quick Presets for Tahun Pelajaran */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-400 font-bold mr-1">Pilihan Cepat:</span>
                  {["2024/2025", "2025/2026", "2026/2027", "2027/2028"].map((th) => (
                    <button
                      key={th}
                      type="button"
                      onClick={() => setFormTahunPelajaran(th)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        formTahunPelajaran === th
                          ? "bg-amber-500 text-slate-950 border-amber-300 shadow-sm"
                          : "bg-[#142036] text-slate-300 hover:text-white border-[#2b4168] hover:bg-[#1e2f4f]"
                      }`}
                    >
                      {th}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Tahun ajaran ini langsung tampil pada kop judul raport ETTQ di layar pratinjau, hasil cetak, PDF, dan unduhan file Word (.docx).
                </p>
              </div>

              {/* 2. Semester */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-white uppercase tracking-wider block">
                  Semester:
                </label>
                <input
                  type="text"
                  value={formSemesterName}
                  onChange={(e) => setFormSemesterName(e.target.value)}
                  placeholder="Contoh: Semester-1, Semester-2, Ganjil, atau Genap"
                  className="w-full px-3.5 py-2.5 bg-[#0a101f] border border-[#2b4168] rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  required
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {["Semester-1", "Semester-2", "Semester Ganjil", "Semester Genap"].map((sem) => (
                    <button
                      key={sem}
                      type="button"
                      onClick={() => setFormSemesterName(sem)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        formSemesterName === sem
                          ? "bg-amber-500 text-slate-950 border-amber-300 shadow-sm"
                          : "bg-[#142036] text-slate-300 hover:text-white border-[#2b4168] hover:bg-[#1e2f4f]"
                      }`}
                    >
                      {sem}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Tanggal Raport & Kota */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-white uppercase tracking-wider block">
                    Tanggal Raport:
                  </label>
                  <input
                    type="text"
                    value={formTanggalRaport}
                    onChange={(e) => setFormTanggalRaport(e.target.value)}
                    placeholder="Contoh: 30 September 2025"
                    className="w-full px-3 py-2.5 bg-[#0a101f] border border-[#2b4168] rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-white uppercase tracking-wider block">
                    Kota Penerbitan:
                  </label>
                  <input
                    type="text"
                    value={formKota}
                    onChange={(e) => setFormKota(e.target.value)}
                    placeholder="Contoh: Pangkalpinang"
                    className="w-full px-3 py-2.5 bg-[#0a101f] border border-[#2b4168] rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#1e3256] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#142036] hover:bg-[#1e2f4f] border border-[#2b4168] text-slate-300 hover:text-white text-xs font-bold cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSettings || !formTahunPelajaran.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 cursor-pointer transition shadow-lg shadow-amber-950/40 disabled:opacity-50"
                >
                  {savingSettings ? (
                    <div className="w-4 h-4 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin"></div>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Simpan Pengaturan Tahun</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
