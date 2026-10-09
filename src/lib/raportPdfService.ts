import { Student, Grade, WaliKelasNote, Teacher } from "../types";
import { triggerBrowserDownload } from "./wordExport";
import JSZip from "jszip";
// @ts-ignore
import html2pdf from "html2pdf.js";

import logoUrl from "../assets/images/smp_logo_exact_match_revised_1783840969621.jpg";
import logoJsitUrl from "../assets/images/logo_jsit_indonesia_1783956323407.jpg";
import logoCahayaAmalUrl from "../assets/images/logo_cahaya_amal_1783956338475.jpg";

export interface RaportFormatSettings {
  semesterName?: string;
  tahunPelajaran?: string;
  fontSize?: string;
  showLogo?: boolean;
  showSpiritual?: boolean;
  showSosial?: boolean;
  showAttendance?: boolean;
  showCatatan?: boolean;
  fontFamily?: string;
  descFontSize?: string;
  paperSize?: string;
  tanggalRaport?: string;
  principalSignaturePosition?: string;
  signatureCity?: string;
  principalTitle?: string;
  showPrincipalNip?: boolean;
  showParentSignature?: boolean;
  watermarkSize?: number;
  watermarkOpacity?: number;
}

export interface RaportPrincipalSettings {
  name: string;
  nip: string;
}

export interface ZipBatchProgress {
  current: number;
  total: number;
  studentName: string;
  percent: number;
  status: "idle" | "generating" | "zipping" | "done" | "cancelled" | "error";
  errorMessage?: string;
}

export const UMUM_SUBJECTS = [
  "PAI",
  "PPKN",
  "Bahasa Indonesia",
  "Matematika",
  "IPA",
  "IPS",
  "Bahasa Inggris",
  "PJOK",
  "Prakarya",
  "Informatika",
];

export const MULOK_SUBJECTS = ["Bahasa Arab"];

export const KEISLAMAN_SUBJECTS = [
  "Tahsin ABaTaTsa",
  "Tahfizh Al-Qur’an",
  "Do’a Harian dan Hadits",
  "Wudhu dan Sholat",
];

export const OFFICIAL_SUBJECT_NAMES: Record<string, string> = {
  PAI: "Pendidikan Agama Islam",
  PPKN: "Pendidikan Pancasila dan Kewarganegaraan",
  "Bahasa Indonesia": "Bahasa Indonesia",
  Matematika: "Matematika",
  IPA: "Ilmu Pengetahuan Alam",
  IPS: "Ilmu Pengetahuan Sosial",
  "Bahasa Inggris": "Bahasa Inggris",
  PJOK: "Pendidikan Jasmani Olahraga dan Kesehatan",
  Informatika: "Informatika",
  Prakarya: "Prakarya",
  "Bahasa Arab": "Bahasa Arab",
  "Tahsin ABaTaTsa": "Tahsin ABaTaTsa",
  "Tahfizh Al-Qur’an": "Tahfizh Al-Qur’an",
  "Do’a Harian dan Hadits": "Do’a Harian dan Hadits",
  "Wudhu dan Sholat": "Wudhu dan Sholat",
};

export const getOfficialSubjectName = (sub: string, index: number) => {
  return `${index + 1}. ${OFFICIAL_SUBJECT_NAMES[sub] || sub}`;
};

export const formatFaseKelas = (kelas: string) => {
  if (kelas === "7") return "D / VII (Tujuh)";
  if (kelas === "8") return "D / VIII (Delapan)";
  if (kelas === "9") return "D / IX (Sembilan)";
  return `D / ${kelas}`;
};

export const formatWaliKelasTitle = (k: string | undefined | null) => {
  if (!k) return "Wali Kelas";
  const clean = String(k).replace(/^kelas\s*/i, "").trim();
  return clean ? `Wali Kelas ${clean}` : "Wali Kelas";
};

export const toGradeLetter = (val: any, fallback = "B"): string => {
  if (!val) return fallback;
  const s = String(val).trim().toUpperCase();
  if (s === "A" || s === "SANGAT BAIK" || s === "SB" || s.startsWith("A ") || s.startsWith("A(") || s === "A (SANGAT BAIK)") return "A";
  if (s === "B" || s === "BAIK" || s.startsWith("B ") || s.startsWith("B(") || s === "B (BAIK)") return "B";
  if (s === "C" || s === "CUKUP" || s === "CB" || s.startsWith("C ") || s.startsWith("C(") || s === "C (CUKUP)") return "C";
  if (s === "D" || s === "KURANG" || s === "KB" || s.startsWith("D ") || s.startsWith("D(") || s === "D (KURANG)") return "D";
  if (s.length === 1 && ["A", "B", "C", "D"].includes(s)) return s;
  return fallback;
};

export const getEkskulGrades = (e: any) => {
  const fallback = toGradeLetter(e?.predicate || e?.capaian || "B", "B");
  return {
    usaha: toGradeLetter(e?.usaha, fallback),
    proses: toGradeLetter(e?.proses, fallback),
    capaian: toGradeLetter(e?.capaian, fallback),
  };
};

export const normalizeSubject = (s: string | undefined | null) => {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/[’'"`]/g, "'")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const isSameSubject = (a: string | undefined | null, b: string | undefined | null) => {
  if (!a || !b) return false;
  const normA = normalizeSubject(a);
  const normB = normalizeSubject(b);
  if (normA === normB) return true;
  const aliasA = normA
    .replace("tahfizh", "tahfidz")
    .replace("doa", "do'a")
    .replace("pendidikan agama islam", "pai")
    .replace("pendidikan pancasila dan kewarganegaraan", "ppkn")
    .replace("ilmu pengetahuan alam", "ipa")
    .replace("ilmu pengetahuan sosial", "ips")
    .replace("pendidikan jasmani olahraga dan kesehatan", "pjok");
  const aliasB = normB
    .replace("tahfizh", "tahfidz")
    .replace("doa", "do'a")
    .replace("pendidikan agama islam", "pai")
    .replace("pendidikan pancasila dan kewarganegaraan", "ppkn")
    .replace("ilmu pengetahuan alam", "ipa")
    .replace("ilmu pengetahuan sosial", "ips")
    .replace("pendidikan jasmani olahraga dan kesehatan", "pjok");
  return aliasA === aliasB;
};

export const scoreToPredicate = (score: number | string | undefined | null): string => {
  if (score === undefined || score === null || score === "") return "";
  const num = typeof score === "number" ? score : parseFloat(String(score));
  if (isNaN(num)) return String(score).trim();
  if (num > 91) return "A";
  if (num >= 80) return "B";
  if (num >= 70) return "C";
  return "D";
};

export const generateDescription = (g: Grade | undefined, studentName: string) => {
  if (!g || !g.tps || !Array.isArray(g.tps) || g.tps.length === 0) {
    return "";
  }
  const name = studentName ? studentName.trim() : "Siswa";
  const achieved = g.tps
    .filter((tp) => Boolean(tp.achieved))
    .map((tp) => (tp.text || "").trim())
    .filter(Boolean);
  const needImprovement = g.tps
    .filter((tp) => !tp.achieved)
    .map((tp) => (tp.text || "").trim())
    .filter(Boolean);

  const joinItems = (items: string[]) => {
    const cleaned = items.map((i) => i.trim().replace(/\.+$/, ""));
    if (cleaned.length === 0) return "";
    if (cleaned.length === 1) return cleaned[0];
    if (cleaned.length === 2) return `${cleaned[0]} dan ${cleaned[1]}`;
    return `${cleaned.slice(0, -1).join(", ")}, dan ${cleaned[cleaned.length - 1]}`;
  };

  const sub = g.subject || "mata pelajaran ini";
  let desc = "";
  if (achieved.length > 0 && needImprovement.length === 0) {
    desc = `Alhamdulillah, ananda ${name} dalam pembelajaran ${sub} menunjukkan penguasaan yang optimal dalam ${joinItems(achieved)}. Pertahankan prestasimu, teruslah bertumbuh dengan rendah hati, dan yakinlah setiap ikhtiar baikmu hari ini akan membuka pintu masa depan yang indah.`;
  } else if (achieved.length > 0 && needImprovement.length > 0) {
    desc = `Alhamdulillah, ananda ${name} dalam pembelajaran ${sub} menunjukkan penguasaan yang optimal dalam ${joinItems(achieved)}. Namun masih memerlukan bimbingan dan pendampingan lebih lanjut dalam ${joinItems(needImprovement)}. Tetaplah bersemangat, jangan pernah lelah untuk mencoba karena setiap proses belajarmu sangatlah berharga.`;
  } else if (needImprovement.length > 0) {
    desc = `Ananda ${name} dalam pembelajaran ${sub} masih memerlukan bimbingan dan pendampingan lebih lanjut dalam ${joinItems(needImprovement)}. Jangan berkecil hati, percayalah pada kemampuan dirimu; dengan kesabaran, doa, dan usaha yang tekun, ananda pasti mampu meraih hal yang lebih baik.`;
  }
  return desc.trim();
};

export function getTransparentWatermarkBase64(
  url: string,
  opacity: number = 0.05
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve("");
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 800;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, 800, 800);
        ctx.globalAlpha = opacity;
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 800, 800);
        resolve(canvas.toDataURL("image/png"));
      } else {
        resolve("");
      }
    };
    img.onerror = () => resolve("");
    img.src = url;
  });
}

export function buildStudentRaportHtml({
  student,
  grades,
  waliKelasNote,
  waliKelas,
  principal,
  format,
}: {
  student: Student;
  grades: Grade[];
  waliKelasNote: WaliKelasNote;
  waliKelas: Teacher | null;
  principal: RaportPrincipalSettings;
  format: RaportFormatSettings;
}): string {
  const note = waliKelasNote || {
    sakit: 0,
    izin: 0,
    alpa: 0,
    catatan: "",
    spiritualUsaha: "B",
    spiritualProses: "B",
    spiritualCapaian: "B",
    spiritualDeskripsi: "",
    sosialUsaha: "B",
    sosialProses: "B",
    sosialCapaian: "B",
    sosialDeskripsi: "",
    ekskul: [],
  };

  const getSubjectGradeObj = (sub: string) => {
    return (grades || []).find((x) => isSameSubject(x.subject, sub));
  };

  const getSubjectUsaha = (sub: string) => {
    const g = getSubjectGradeObj(sub);
    if (g && g.usaha && g.usaha.trim() !== "") return g.usaha.trim();
    if (g && g.score !== undefined && g.score !== null && String(g.score).trim() !== "")
      return scoreToPredicate(g.score);
    if (g && g.capaian && g.capaian.trim() !== "") return g.capaian.trim();
    return "B";
  };

  const getSubjectProses = (sub: string) => {
    const g = getSubjectGradeObj(sub);
    if (g && g.proses && g.proses.trim() !== "") return g.proses.trim();
    if (g && g.score !== undefined && g.score !== null && String(g.score).trim() !== "")
      return scoreToPredicate(g.score);
    if (g && g.capaian && g.capaian.trim() !== "") return g.capaian.trim();
    return "B";
  };

  const getSubjectCapaian = (sub: string) => {
    const g = getSubjectGradeObj(sub);
    if (g && g.capaian && g.capaian.trim() !== "") return g.capaian.trim();
    if (g && g.score !== undefined && g.score !== null && String(g.score).trim() !== "")
      return scoreToPredicate(g.score);
    if (g && g.usaha && g.usaha.trim() !== "") return g.usaha.trim();
    return "B";
  };

  const getSubjectDescription = (sub: string) => {
    const g = getSubjectGradeObj(sub);
    if (g) {
      if (g.deskripsi && g.deskripsi.trim() !== "") return g.deskripsi.trim();
      const generated = generateDescription(g, student.name);
      if (generated) return generated;
    }
    const name = student?.name ? student.name.trim() : "Siswa";
    return `Alhamdulillah, ananda ${name} menunjukkan pemahaman dan penguasaan yang baik dalam capaian pembelajaran ${sub}. Harapannya ananda dapat terus mempertahankan semangat dan prestasi belajarnya.`;
  };

  const renderSubjectBlock = (sub: string, idx: number) => {
    const title = getOfficialSubjectName(sub, idx);
    const usahaGrade = getSubjectUsaha(sub);
    const prosesGrade = getSubjectProses(sub);
    const capaianGrade = getSubjectCapaian(sub);
    const desc = getSubjectDescription(sub);

    return `
      <div class="pdf-table-block">
        <table class="pdf-box-table">
          <tr>
            <td rowspan="2" style="width: 52%; font-weight: bold; font-size: 9.3pt; padding: 3px 6px 5px 6px; vertical-align: middle; line-height: 1.25;">
              ${title}
            </td>
            <td style="width: 16%; text-align: center; font-weight: bold; font-size: 8.8pt; padding: 0px 3px 5.5px 3px; background-color: #f2f2f2; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2.5px;">Usaha</span>
            </td>
            <td style="width: 16%; text-align: center; font-weight: bold; font-size: 8.8pt; padding: 0px 3px 5.5px 3px; background-color: #f2f2f2; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2.5px;">Proses</span>
            </td>
            <td style="width: 16%; text-align: center; font-weight: bold; font-size: 8.8pt; padding: 0px 3px 5.5px 3px; background-color: #f2f2f2; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2.5px;">Capaian</span>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold; font-size: 10pt; padding: 0px 3px 5.5px 3px; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2px;">${usahaGrade}</span>
            </td>
            <td style="text-align: center; font-weight: bold; font-size: 10pt; padding: 0px 3px 5.5px 3px; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2px;">${prosesGrade}</span>
            </td>
            <td style="text-align: center; font-weight: bold; font-size: 10pt; padding: 0px 3px 5.5px 3px; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2px;">${capaianGrade}</span>
            </td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 3.5px 6px 4.5px 6px; font-size: ${format.descFontSize || "8.8pt"}; text-align: justify; line-height: 1.35;">
              <strong>Deskripsi:</strong> ${desc}
            </td>
          </tr>
        </table>
      </div>
    `;
  };

  const pos = format.principalSignaturePosition || "bottom_center";
  const city = format.signatureCity || "Pangkal Pinang";
  const dateStr = format.tanggalRaport ? `${format.tanggalRaport}` : "………………………";
  const pTitle = format.principalTitle || "Kepala Sekolah";
  const showParent = format.showParentSignature !== false;
  const pName = principal?.name ? principal.name : "Ari Gunawan, S.Kom.";
  const showNip = format.showPrincipalNip !== false && !!principal?.nip;
  const nipHtml = showNip
    ? `<br /><span style="font-size: 9pt; font-weight: normal; font-family: monospace;">NIP. ${principal.nip}</span>`
    : "";
  const wName = waliKelas ? waliKelas.name : "……………………………";
  const parentHtml = showParent
    ? `<p style="margin: 0 0 55px 0;">&nbsp;<br />Orang Tua/Wali Siswa</p><p style="margin: 0; font-weight: bold; font-size: 11pt;">……………………………</p>`
    : "";

  let signatureTableHtml = "";
  if (pos === "inline_three_columns") {
    signatureTableHtml = `
      <table class="pdf-signature-table" style="width: 100%; border: none; page-break-inside: avoid;">
        <tr>
          <td style="width: 33.33%; text-align: center; vertical-align: top; border: none;">${parentHtml}</td>
          <td style="width: 33.33%; text-align: center; vertical-align: top; border: none;">
            <p style="margin: 0 0 55px 0; line-height: 1.3;">Mengetahui,<br />${pTitle}</p>
            <p style="margin: 0; font-weight: bold; font-size: 11pt;">${pName}${nipHtml}</p>
          </td>
          <td style="width: 33.33%; text-align: center; vertical-align: top; border: none;">
            <p style="margin: 0 0 55px 0;">${city}, ${dateStr}<br />${formatWaliKelasTitle(student.kelas)}</p>
            <p style="margin: 0; font-weight: bold; font-size: 11pt;">${wName}</p>
          </td>
        </tr>
      </table>
    `;
  } else if (pos === "bottom_left") {
    signatureTableHtml = `
      <table class="pdf-signature-table" style="width: 100%; border: none; page-break-inside: avoid;">
        <tr>
          <td style="width: 50%; padding-bottom: 50px; text-align: center; vertical-align: top; border: none;">${parentHtml}</td>
          <td style="width: 50%; padding-bottom: 50px; text-align: center; vertical-align: top; border: none;">
            <p style="margin: 0 0 55px 0;">${city}, ${dateStr}<br />${formatWaliKelasTitle(student.kelas)}</p>
            <p style="margin: 0; font-weight: bold; font-size: 11pt;">${wName}</p>
          </td>
        </tr>
        <tr>
          <td style="width: 50%; text-align: center; padding-top: 15px; vertical-align: top; border: none;">
            <p style="margin: 0 0 55px 0; line-height: 1.3;">Mengetahui,<br />${pTitle}</p>
            <p style="margin: 0; font-weight: bold; font-size: 11pt;">${pName}${nipHtml}</p>
          </td>
          <td style="width: 50%; border: none;"></td>
        </tr>
      </table>
    `;
  } else if (pos === "bottom_right") {
    signatureTableHtml = `
      <table class="pdf-signature-table" style="width: 100%; border: none; page-break-inside: avoid;">
        <tr>
          <td style="width: 50%; padding-bottom: 50px; text-align: center; vertical-align: top; border: none;">${parentHtml}</td>
          <td style="width: 50%; padding-bottom: 50px; text-align: center; vertical-align: top; border: none;">
            <p style="margin: 0 0 55px 0;">&nbsp;<br />${formatWaliKelasTitle(student.kelas)}</p>
            <p style="margin: 0; font-weight: bold; font-size: 11pt;">${wName}</p>
          </td>
        </tr>
        <tr>
          <td style="width: 50%; border: none;"></td>
          <td style="width: 50%; text-align: center; padding-top: 15px; vertical-align: top; border: none;">
            <p style="margin: 0 0 55px 0; line-height: 1.3;">${city}, ${dateStr}<br />Mengetahui,<br />${pTitle}</p>
            <p style="margin: 0; font-weight: bold; font-size: 11pt;">${pName}${nipHtml}</p>
          </td>
        </tr>
      </table>
    `;
  } else if (pos === "top_left") {
    signatureTableHtml = `
      <table class="pdf-signature-table" style="width: 100%; border: none; page-break-inside: avoid;">
        <tr>
          <td style="width: 50%; padding-bottom: 50px; text-align: center; vertical-align: top; border: none;">
            <p style="margin: 0 0 55px 0; line-height: 1.3;">Mengetahui,<br />${pTitle}</p>
            <p style="margin: 0; font-weight: bold; font-size: 11pt;">${pName}${nipHtml}</p>
          </td>
          <td style="width: 50%; padding-bottom: 50px; text-align: center; vertical-align: top; border: none;">
            <p style="margin: 0 0 55px 0;">${city}, ${dateStr}<br />${formatWaliKelasTitle(student.kelas)}</p>
            <p style="margin: 0; font-weight: bold; font-size: 11pt;">${wName}</p>
          </td>
        </tr>
        ${showParent ? `
        <tr>
          <td colspan="2" style="text-align: center; padding-top: 15px; vertical-align: top; border: none;">
            <p style="margin: 0 0 55px 0;">&nbsp;<br />Orang Tua/Wali Siswa</p>
            <p style="margin: 0; font-weight: bold; font-size: 11pt;">……………………………</p>
          </td>
        </tr>` : ""}
      </table>
    `;
  } else {
    // Default: bottom_center
    signatureTableHtml = `
      <table class="pdf-signature-table" style="width: 100%; border: none; page-break-inside: avoid;">
        <tr>
          <td style="width: 50%; padding-bottom: 50px; text-align: center; vertical-align: top; border: none;">${parentHtml}</td>
          <td style="width: 50%; padding-bottom: 50px; text-align: center; vertical-align: top; border: none;">
            <p style="margin: 0 0 55px 0;">${city}, ${dateStr}<br />${formatWaliKelasTitle(student.kelas)}</p>
            <p style="margin: 0; font-weight: bold; font-size: 11pt;">${wName}</p>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="text-align: center; padding-top: 15px; vertical-align: top; border: none;">
            <p style="margin: 0 0 55px 0; line-height: 1.3;">Mengetahui,<br />${pTitle}</p>
            <p style="margin: 0; font-weight: bold; font-size: 11pt;">${pName}${nipHtml}</p>
          </td>
        </tr>
      </table>
    `;
  }

  return `
    <style>
      .pdf-wrapper { 
        font-family: 'Times New Roman', Times, serif; 
        font-size: 10pt; 
        line-height: 1.4; 
        color: #000000 !important; 
        background-color: #ffffff; 
        position: relative;
      }
      .pdf-wrapper * {
        color: #000000 !important; 
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        box-sizing: border-box !important;
      }
      .pdf-meta-table { width: 100%; border: none; margin-bottom: 8px; font-size: 9.5pt; border-collapse: collapse; margin-left: auto !important; margin-right: auto !important; line-height: 1.4 !important; }
      .pdf-meta-table td { padding: 2px 4px 4px 0 !important; vertical-align: top !important; color: #000000 !important; line-height: 1.4 !important; overflow: visible !important; box-sizing: content-box !important; }
      .pdf-table-block { page-break-inside: avoid !important; break-inside: avoid !important; margin-top: 3.5px !important; margin-bottom: 6.5px !important; padding-top: 1px !important; width: 100% !important; }
      .pdf-box-table { width: 100% !important; border-collapse: collapse !important; margin: 0 !important; border: 1.2px solid #000000 !important; background-color: #ffffff !important; margin-left: auto !important; margin-right: auto !important; page-break-inside: avoid !important; break-inside: avoid !important; box-sizing: border-box !important; }
      .pdf-box-table td { border: 1px solid #000000 !important; vertical-align: middle; color: #000000 !important; box-sizing: border-box !important; }
      .pdf-box-table tr:first-child td { border-top: 1.2px solid #000000 !important; }
      .pdf-heading { margin: 9px 0 4px 0; text-transform: uppercase; font-size: 9.8pt; font-weight: bold; color: #000000 !important; page-break-after: avoid !important; break-after: avoid !important; }
      .pdf-signature-table { width: 100%; border: none; margin-top: 10px; border-collapse: collapse; margin-left: auto !important; margin-right: auto !important; page-break-inside: avoid !important; break-inside: avoid !important; }
      .pdf-signature-table td { text-align: center; vertical-align: middle; color: #000000 !important; }
    </style>
    <div class="pdf-wrapper">
      <div>
        ${
          format.showLogo
            ? `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; width: 100%; border-bottom: 3px double #000000; padding-bottom: 12px;">
            <div style="width: 165px; flex-shrink: 0; display: flex; align-items: center; justify-content: flex-start; gap: 10px;">
              <div style="width: 75px; height: 75px; display: flex; align-items: center; justify-content: center; background-color: #ffffff; box-sizing: border-box;">
                <img src="${logoJsitUrl}" style="width: 100%; height: 100%; object-fit: contain;" />
              </div>
              <div style="width: 75px; height: 75px; display: flex; align-items: center; justify-content: center; background-color: #ffffff; box-sizing: border-box;">
                <img src="${logoCahayaAmalUrl}" style="width: 100%; height: 100%; object-fit: contain;" />
              </div>
            </div>
            <div style="text-align: center; flex-grow: 1; padding: 0 10px;">
              <h2 style="margin: 0; text-transform: uppercase; font-size: 11.5pt; color: #000000; font-weight: bold; line-height: 1.25;">SMP ISLAM SMART PANGKAL PINANG</h2>
              <h3 style="margin: 3px 0; text-transform: uppercase; font-size: 10pt; color: #000000; font-weight: bold; line-height: 1.25;">LAPORAN SUMATIF TENGAH SEMESTER (STS)</h3>
              <h4 style="margin: 3px 0; font-size: 9.5pt; color: #000000; font-weight: bold; line-height: 1.25;">SEMESTER ${format.semesterName ? format.semesterName.toUpperCase() : "GANJIL"}</h4>
              <p style="margin: 2px 0 0 0; font-size: 8.5pt; font-weight: bold; color: #000000; line-height: 1.25;">TAHUN PELAJARAN ${format.tahunPelajaran || "2026/2027"}</p>
            </div>
            <div style="width: 165px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
              <div style="width: 75px; height: 75px; display: flex; align-items: center; justify-content: center; border: 1.5px solid #cccccc; border-radius: 50%; overflow: hidden; background-color: #ffffff;">
                <img src="${logoUrl}" style="width: 75px; height: 75px; object-fit: cover;" />
              </div>
            </div>
          </div>
          `
            : `
          <div style="text-align: center; margin-bottom: 15px; width: 100%; border-bottom: 3px double #000000; padding-bottom: 12px;">
            <h2 style="margin: 0; text-transform: uppercase; font-size: 14pt; color: #000000; font-weight: bold;">SMP ISLAM SMART PANGKAL PINANG</h2>
            <h3 style="margin: 3px 0; text-transform: uppercase; font-size: 12pt; color: #000000; font-weight: bold;">LAPORAN SUMATIF TENGAH SEMESTER (STS)</h3>
            <h4 style="margin: 3px 0; font-size: 11pt; color: #000000; font-weight: bold;">SEMESTER ${format.semesterName ? format.semesterName.toUpperCase() : "GANJIL"}</h4>
            <p style="margin: 2px 0 0 0; font-size: 10.5pt; font-weight: bold; color: #000000;">TAHUN PELAJARAN ${format.tahunPelajaran || "2026/2027"}</p>
          </div>
          `
        }

      <table class="pdf-meta-table" style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5pt; line-height: 1.65;">
        <tr>
          <td style="width: 14%; font-weight: normal; white-space: nowrap; padding: 4px 2px 8px 0; vertical-align: top; line-height: 1.65; overflow: visible;">Nama</td>
          <td style="width: 2%; text-align: center; padding: 4px 2px 8px 2px; vertical-align: top; line-height: 1.65; overflow: visible;">:</td>
          <td style="width: 38%; font-weight: bold; padding: 4px 8px 8px 2px; vertical-align: top; line-height: 1.65; word-break: break-word; overflow: visible;">${student.name}</td>
          <td style="width: 15%; font-weight: normal; white-space: nowrap; padding: 4px 2px 8px 0; vertical-align: top; line-height: 1.65; overflow: visible;">Fase/Kelas</td>
          <td style="width: 2%; text-align: center; padding: 4px 2px 8px 2px; vertical-align: top; line-height: 1.65; overflow: visible;">:</td>
          <td style="width: 29%; font-weight: bold; padding: 4px 0 8px 2px; vertical-align: top; line-height: 1.65; white-space: nowrap; overflow: visible;">${formatFaseKelas(student.kelas)}</td>
        </tr>
        <tr>
          <td style="font-weight: normal; white-space: nowrap; padding: 4px 2px 8px 0; vertical-align: top; line-height: 1.65; overflow: visible;">NISN/ NIS</td>
          <td style="text-align: center; padding: 4px 2px 8px 2px; vertical-align: top; line-height: 1.65; overflow: visible;">:</td>
          <td style="font-weight: bold; padding: 4px 8px 8px 2px; vertical-align: top; line-height: 1.65; word-break: break-word; overflow: visible;">${student.nisn || "-"}</td>
          <td style="font-weight: normal; white-space: nowrap; padding: 4px 2px 8px 0; vertical-align: top; line-height: 1.65; overflow: visible;">Semester</td>
          <td style="text-align: center; padding: 4px 2px 8px 2px; vertical-align: top; line-height: 1.65; overflow: visible;">:</td>
          <td style="font-weight: bold; padding: 4px 0 8px 2px; vertical-align: top; line-height: 1.65; white-space: nowrap; overflow: visible;">${format.semesterName || "Ganjil"}</td>
        </tr>
      </table>

      <h4 class="pdf-heading">A. Sikap</h4>
      
      <!-- Spiritual Aspect Table -->
      <div class="pdf-table-block">
        <table class="pdf-box-table">
          <tr>
            <td rowspan="2" style="width: 52%; font-weight: bold; font-size: 9.3pt; padding: 3px 6px 5px 6px; vertical-align: middle; line-height: 1.25;">
              1. Spiritual
            </td>
            <td style="width: 16%; text-align: center; font-weight: bold; font-size: 8.8pt; padding: 0px 3px 5.5px 3px; background-color: #f2f2f2; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2.5px;">Usaha</span>
            </td>
            <td style="width: 16%; text-align: center; font-weight: bold; font-size: 8.8pt; padding: 0px 3px 5.5px 3px; background-color: #f2f2f2; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2.5px;">Proses</span>
            </td>
            <td style="width: 16%; text-align: center; font-weight: bold; font-size: 8.8pt; padding: 0px 3px 5.5px 3px; background-color: #f2f2f2; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2.5px;">Capaian</span>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold; font-size: 10pt; padding: 0px 3px 5.5px 3px; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2px;">${toGradeLetter(note.spiritualUsaha, "B")}</span>
            </td>
            <td style="text-align: center; font-weight: bold; font-size: 10pt; padding: 0px 3px 5.5px 3px; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2px;">${toGradeLetter(note.spiritualProses, "B")}</span>
            </td>
            <td style="text-align: center; font-weight: bold; font-size: 10pt; padding: 0px 3px 5.5px 3px; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2px;">${toGradeLetter(note.spiritualCapaian, "B")}</span>
            </td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 3.5px 6px 4.5px 6px; font-size: ${format.descFontSize || "8.8pt"}; text-align: justify; line-height: 1.35;">
              <strong>Deskripsi:</strong> ${note.spiritualDeskripsi || `Alhamdulillah ananda ${student.name} menunjukkan perkembangan spiritual yang baik. Ia telah memahami tata cara beribadah harian dengan rajin serta menjaga adab ketertiban.`}
            </td>
          </tr>
        </table>
      </div>

      <!-- Sosial Aspect Table -->
      <div class="pdf-table-block">
        <table class="pdf-box-table">
          <tr>
            <td rowspan="2" style="width: 52%; font-weight: bold; font-size: 9.3pt; padding: 3px 6px 5px 6px; vertical-align: middle; line-height: 1.25;">
              2. Sosial
            </td>
            <td style="width: 16%; text-align: center; font-weight: bold; font-size: 8.8pt; padding: 0px 3px 5.5px 3px; background-color: #f2f2f2; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2.5px;">Usaha</span>
            </td>
            <td style="width: 16%; text-align: center; font-weight: bold; font-size: 8.8pt; padding: 0px 3px 5.5px 3px; background-color: #f2f2f2; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2.5px;">Proses</span>
            </td>
            <td style="width: 16%; text-align: center; font-weight: bold; font-size: 8.8pt; padding: 0px 3px 5.5px 3px; background-color: #f2f2f2; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2.5px;">Capaian</span>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold; font-size: 10pt; padding: 0px 3px 5.5px 3px; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2px;">${toGradeLetter(note.sosialUsaha, "B")}</span>
            </td>
            <td style="text-align: center; font-weight: bold; font-size: 10pt; padding: 0px 3px 5.5px 3px; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2px;">${toGradeLetter(note.sosialProses, "B")}</span>
            </td>
            <td style="text-align: center; font-weight: bold; font-size: 10pt; padding: 0px 3px 5.5px 3px; vertical-align: middle; line-height: 1;">
              <span style="display: inline-block; position: relative; top: -2px;">${toGradeLetter(note.sosialCapaian, "B")}</span>
            </td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 3.5px 6px 4.5px 6px; font-size: ${format.descFontSize || "8.8pt"}; text-align: justify; line-height: 1.35;">
              <strong>Deskripsi:</strong> ${note.sosialDeskripsi || `Alhamdulillah ananda ${student.name} mudah bergaul, memiliki rasa empati tinggi, serta sopan santun dalam berkata kata kepada guru maupun sesama kawan.`}
            </td>
          </tr>
        </table>
      </div>

      <h4 class="pdf-heading">B. Umum</h4>
      ${UMUM_SUBJECTS.map((sub, idx) => renderSubjectBlock(sub, idx)).join("")}

      <h4 class="pdf-heading">C. Muatan Lokal</h4>
      ${MULOK_SUBJECTS.map((sub, idx) => renderSubjectBlock(sub, idx)).join("")}

      <h4 class="pdf-heading">D. Keislaman</h4>
      ${KEISLAMAN_SUBJECTS.map((sub, idx) => renderSubjectBlock(sub, idx)).join("")}

      <h4 class="pdf-heading">E. Ekstrakurikuler dan Keterampilan</h4>
      ${
        ((note as any).ekskul || []).length === 0
          ? `
        <div class="pdf-table-block">
          <table class="pdf-box-table">
            <tr>
              <td style="text-align: center; font-size: 9pt; padding: 6px; font-style: italic; color: #555;">
                Tidak mengikuti kegiatan ekstrakurikuler.
              </td>
            </tr>
          </table>
        </div>
      `
          : ((note as any).ekskul || [])
              .map((e: any, idx: number) => {
                const gradesE = getEkskulGrades(e);
                return `
          <div class="pdf-table-block">
            <table class="pdf-box-table">
              <tr>
                <td rowspan="2" style="width: 52%; font-weight: bold; font-size: 9.3pt; padding: 3px 6px 5px 6px; vertical-align: middle; line-height: 1.25;">
                  ${idx + 1}. Ekstrakurikuler ${e.type || "Pilihan"}: ${e.name}
                </td>
                <td style="width: 16%; text-align: center; font-weight: bold; font-size: 8.8pt; padding: 0px 3px 5.5px 3px; background-color: #f2f2f2; vertical-align: middle; line-height: 1;">
                  <span style="display: inline-block; position: relative; top: -2.5px;">Usaha</span>
                </td>
                <td style="width: 16%; text-align: center; font-weight: bold; font-size: 8.8pt; padding: 0px 3px 5.5px 3px; background-color: #f2f2f2; vertical-align: middle; line-height: 1;">
                  <span style="display: inline-block; position: relative; top: -2.5px;">Proses</span>
                </td>
                <td style="width: 16%; text-align: center; font-weight: bold; font-size: 8.8pt; padding: 0px 3px 5.5px 3px; background-color: #f2f2f2; vertical-align: middle; line-height: 1;">
                  <span style="display: inline-block; position: relative; top: -2.5px;">Capaian</span>
                </td>
              </tr>
              <tr>
                <td style="text-align: center; font-weight: bold; font-size: 10pt; padding: 0px 3px 5.5px 3px; vertical-align: middle; line-height: 1;">
                  <span style="display: inline-block; position: relative; top: -2px;">${gradesE.usaha}</span>
                </td>
                <td style="text-align: center; font-weight: bold; font-size: 10pt; padding: 0px 3px 5.5px 3px; vertical-align: middle; line-height: 1;">
                  <span style="display: inline-block; position: relative; top: -2px;">${gradesE.proses}</span>
                </td>
                <td style="text-align: center; font-weight: bold; font-size: 10pt; padding: 0px 3px 5.5px 3px; vertical-align: middle; line-height: 1;">
                  <span style="display: inline-block; position: relative; top: -2px;">${gradesE.capaian}</span>
                </td>
              </tr>
              <tr>
                <td colspan="4" style="padding: 3.5px 6px 4.5px 6px; font-size: ${format.descFontSize || "8.8pt"}; text-align: justify; line-height: 1.35;">
                  <strong>Deskripsi:</strong> ${e.description || e.deskripsi || "-"}
                </td>
              </tr>
            </table>
          </div>
        `;
              })
              .join("")
      }

      <h4 class="pdf-heading">F. Saran-Saran</h4>
      <div class="pdf-table-block">
        <table class="pdf-box-table">
          <tr>
            <td style="padding: 5px 8px 6px 8px; font-size: ${format.descFontSize || "8.8pt"}; text-align: justify; line-height: 1.35;">
              ${note.catatan || "-"}
            </td>
          </tr>
        </table>
      </div>

      <h4 class="pdf-heading">G. Kedisiplinan</h4>
      <div class="pdf-table-block">
        <table class="pdf-box-table" style="text-align: center; border-collapse: collapse; width: 100%;">
          <tr style="background-color: transparent;">
            <td style="font-weight: bold; font-size: 8.8pt; font-family: 'Times New Roman', Times, serif; width: 33.3%; padding: 0px 4px 6.5px 4px; vertical-align: middle; text-align: center; line-height: 1.1; color: #000000 !important;">
              <span style="display: inline-block; position: relative; top: -2.5px;">Sakit</span>
            </td>
            <td style="font-weight: bold; font-size: 8.8pt; font-family: 'Times New Roman', Times, serif; width: 33.3%; padding: 0px 4px 6.5px 4px; vertical-align: middle; text-align: center; line-height: 1.1; color: #000000 !important;">
              <span style="display: inline-block; position: relative; top: -2.5px;">Izin</span>
            </td>
            <td style="font-weight: bold; font-size: 8.8pt; font-family: 'Times New Roman', Times, serif; width: 33.3%; padding: 0px 4px 6.5px 4px; vertical-align: middle; text-align: center; line-height: 1.1; color: #000000 !important;">
              <span style="display: inline-block; position: relative; top: -2.5px;">Tanpa Keterangan</span>
            </td>
          </tr>
          <tr>
            <td style="font-size: 9pt; text-align: center; vertical-align: middle; font-weight: normal; font-family: 'Times New Roman', Times, serif; padding: 0px 4px 6px 4px; line-height: 1.1; color: #000000 !important;">
              <span style="display: inline-block; position: relative; top: -2px;">${note.sakit && Number(note.sakit) > 0 ? `${note.sakit} Hari` : "- Hari"}</span>
            </td>
            <td style="font-size: 9pt; text-align: center; vertical-align: middle; font-weight: normal; font-family: 'Times New Roman', Times, serif; padding: 0px 4px 6px 4px; line-height: 1.1; color: #000000 !important;">
              <span style="display: inline-block; position: relative; top: -2px;">${note.izin && Number(note.izin) > 0 ? `${note.izin} Hari` : "- Hari"}</span>
            </td>
            <td style="font-size: 9pt; text-align: center; vertical-align: middle; font-weight: normal; font-family: 'Times New Roman', Times, serif; padding: 0px 4px 6px 4px; line-height: 1.1; color: #000000 !important;">
              <span style="display: inline-block; position: relative; top: -2px;">${note.alpa && Number(note.alpa) > 0 ? `${note.alpa} Hari` : "- Hari"}</span>
            </td>
          </tr>
        </table>
      </div>

      <br />
      ${signatureTableHtml}
      </div>
    </div>
  `;
}

export async function getHtml2PdfRunner(): Promise<any> {
  if (typeof window !== "undefined" && (window as any).html2pdf) {
    return (window as any).html2pdf;
  }
  try {
    const mod = typeof html2pdf === "function" ? html2pdf : (html2pdf as any)?.default;
    if (mod) return mod;
  } catch {}

  if (typeof window !== "undefined") {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
    return (window as any).html2pdf;
  }
  throw new Error("html2pdf is only supported in browser context.");
}

export async function generateStudentRaportPdfBlob({
  student,
  grades,
  waliKelasNote,
  waliKelas,
  principal,
  format,
  watermarkBase64,
}: {
  student: Student;
  grades: Grade[];
  waliKelasNote: WaliKelasNote;
  waliKelas: Teacher | null;
  principal: RaportPrincipalSettings;
  format: RaportFormatSettings;
  watermarkBase64?: string;
}): Promise<Blob> {
  const runner = await getHtml2PdfRunner();

  let wmBase64 = watermarkBase64;
  if (!wmBase64) {
    wmBase64 = await getTransparentWatermarkBase64(logoUrl, format.watermarkOpacity || 0.05);
  }

  // Create isolated off-screen wrapper
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "-9999px";
  wrapper.style.width = "720px";
  wrapper.style.background = "#ffffff";
  wrapper.style.zIndex = "-9999";

  const pdfContainer = document.createElement("div");
  pdfContainer.style.position = "relative";
  pdfContainer.style.width = "720px";
  pdfContainer.style.background = "#ffffff";
  pdfContainer.style.padding = "5px 0px";
  pdfContainer.style.boxSizing = "border-box";

  pdfContainer.innerHTML = buildStudentRaportHtml({
    student,
    grades,
    waliKelasNote,
    waliKelas,
    principal,
    format,
  });

  wrapper.appendChild(pdfContainer);
  document.body.appendChild(wrapper);

  try {
    const opt = {
      margin: [6, 11, 8, 11],
      filename: `Raport_STS_${student.name.replace(/\s+/g, "_")}.pdf`,
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
        format: format.paperSize === "F4" ? [215, 330] : "a4",
        orientation: "portrait",
      },
      pagebreak: { mode: ["avoid-all", "css"] },
    };

    const pdf = await runner()
      .set(opt)
      .from(pdfContainer)
      .toPdf()
      .get("pdf");

    const totalPages = pdf.internal.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);

      if (wmBase64) {
        const sizeInMm = ((format.watermarkSize || 440) / 440) * 140;
        const x = (pageWidth - sizeInMm) / 2;
        const y = (pageHeight - sizeInMm) / 2;
        pdf.addImage(wmBase64, "PNG", x, y, sizeInMm, sizeInMm, undefined, "FAST");
      }

      pdf.setFont("times", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      const pageText = `Halaman ${i} dari ${totalPages}`;
      pdf.text(pageText, pageWidth - 12, pageHeight - 9.5, {
        align: "right",
      });
    }

    const blob = pdf.output("blob");
    return blob;
  } finally {
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
  }
}

export async function downloadSingleStudentRaportPdf({
  student,
  grades,
  waliKelasNote,
  waliKelas,
  principal,
  format,
  watermarkBase64,
}: {
  student: Student;
  grades: Grade[];
  waliKelasNote: WaliKelasNote;
  waliKelas: Teacher | null;
  principal: RaportPrincipalSettings;
  format: RaportFormatSettings;
  watermarkBase64?: string;
}): Promise<void> {
  const blob = await generateStudentRaportPdfBlob({
    student,
    grades,
    waliKelasNote,
    waliKelas,
    principal,
    format,
    watermarkBase64,
  });

  const safeName = student.name.trim().replace(/[/\\?%*:|"<>]/g, "_");
  const fileName = `Raport_STS_${safeName}.pdf`;
  triggerBrowserDownload(blob, fileName);
}

export async function downloadClassRaportZip({
  students,
  allGrades,
  allNotes,
  waliKelas,
  principal,
  format,
  className,
  onProgress,
  isCancelled,
}: {
  students: Student[];
  allGrades: Grade[];
  allNotes: Record<string, WaliKelasNote>;
  waliKelas: Teacher | null;
  principal: RaportPrincipalSettings;
  format: RaportFormatSettings;
  className: string;
  onProgress?: (progress: ZipBatchProgress) => void;
  isCancelled?: () => boolean;
}): Promise<{ count: number; zipName: string }> {
  if (!students || students.length === 0) {
    throw new Error("Daftar siswa kosong. Tidak ada raport yang dapat diunduh.");
  }

  onProgress?.({
    current: 0,
    total: students.length,
    studentName: "Mempersiapkan template & watermark...",
    percent: 0,
    status: "generating",
  });

  const watermarkBase64 = await getTransparentWatermarkBase64(
    logoUrl,
    format.watermarkOpacity || 0.05
  );

  const zip = new JSZip();
  const targetKelas = className || students[0]?.kelas || "7";
  const zipFolderName = `Raport_STS_Kelas_${targetKelas}`;
  const zipFolder = zip.folder(zipFolderName) || zip;

  for (let i = 0; i < students.length; i++) {
    if (isCancelled && isCancelled()) {
      onProgress?.({
        current: i,
        total: students.length,
        studentName: "Dibatalkan oleh pengguna",
        percent: Math.round((i / students.length) * 100),
        status: "cancelled",
      });
      throw new Error("Proses pengunduhan ZIP dibatalkan oleh pengguna.");
    }

    const currentStudent = students[i];
    const sGrades = (allGrades || []).filter(
      (g) => String(g.studentId).trim() === String(currentStudent.id).trim()
    );
    const sNote = allNotes[currentStudent.id] || {
      sakit: 0,
      izin: 0,
      alpa: 0,
      catatan: "",
      spiritualUsaha: "B",
      spiritualProses: "B",
      spiritualCapaian: "B",
      spiritualDeskripsi: "",
      sosialUsaha: "B",
      sosialProses: "B",
      sosialCapaian: "B",
      sosialDeskripsi: "",
      ekskul: [],
    };

    const currentPercent = Math.round((i / students.length) * 92);
    onProgress?.({
      current: i + 1,
      total: students.length,
      studentName: currentStudent.name,
      percent: currentPercent,
      status: "generating",
    });

    const pdfBlob = await generateStudentRaportPdfBlob({
      student: currentStudent,
      grades: sGrades,
      waliKelasNote: sNote,
      waliKelas,
      principal,
      format,
      watermarkBase64,
    });

    const numPrefix = String(i + 1).padStart(2, "0");
    const safeStudentName = currentStudent.name.trim().replace(/[/\\?%*:|"<>]/g, "_");
    const pdfFileName = `Raport_STS_Kelas_${currentStudent.kelas || targetKelas}_${numPrefix}_${safeStudentName}.pdf`;

    zipFolder.file(pdfFileName, pdfBlob);

    // Yield execution to keep the browser responsive and allow React to render progress updates
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  onProgress?.({
    current: students.length,
    total: students.length,
    studentName: "Mengemas seluruh dokumen ke berkas ZIP...",
    percent: 96,
    status: "zipping",
  });

  const zipBlob = await zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      const zipPercent = 95 + Math.round((metadata.percent / 100) * 5);
      onProgress?.({
        current: students.length,
        total: students.length,
        studentName: `Mengompresi ZIP: ${Math.round(metadata.percent)}%`,
        percent: Math.min(zipPercent, 99),
        status: "zipping",
      });
    }
  );

  const zipFileName = `Raport_STS_Kelas_${targetKelas}_Semua_Siswa_${students.length}_Anak.zip`;
  triggerBrowserDownload(zipBlob, zipFileName);

  onProgress?.({
    current: students.length,
    total: students.length,
    studentName: "Pengunduhan ZIP Selesai!",
    percent: 100,
    status: "done",
  });

  return { count: students.length, zipName: zipFileName };
}
