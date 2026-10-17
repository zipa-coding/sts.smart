import ExcelJS from "exceljs";
import { Student } from "../types";
import {
  HasilHitungSiswa,
  hitungAkumulasiSiswa,
  hitungLeggerSiswa,
  hitungRingkasanKelas,
  formatScore2,
  formatIntegerScore,
  KKM_DEFAULT,
} from "./hitungNilai";
import {
  AkumulasiNilaiDoc,
  formatKelasRomawi,
} from "./akumulasiNilaiService";

export type PaperSizeOption = "F4" | "A4";

/**
 * Mengonversi indeks kolom 1-based menjadi huruf kolom Excel (1 -> A, 26 -> Z, 27 -> AA, dst).
 */
export function colIndexToLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = "";
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

/**
 * Mengekspor data Akumulasi Nilai & Legger ke file Excel (.xlsx) lengkap dengan:
 * - Judul "Format Akumulasi Nilai" & identitas sekolah SMP Islam SMART Pangkalpinang
 * - Kolom grup per bab (T, SH, Rata Bab, P)
 * - Rumus Excel hidup (AVERAGE, ROUND, IF, COUNTA, MAX, MIN, COUNTIF)
 * - Keterangan rentang nilai predikat (A/B/C/D)
 * - Tanda tangan Kepala Sekolah (kiri) dan Guru Mata Pelajaran (kanan)
 */
export async function exportAkumulasiToExcel(params: {
  docData: AkumulasiNilaiDoc;
  students: Student[];
}): Promise<void> {
  const { docData, students } = params;
  const jumlahBab = Math.max(1, Math.min(7, docData.jumlahBab || 6));
  const kelasRomawi = formatKelasRomawi(docData.kelas);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SMP Islam SMART Pangkalpinang";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Akumulasi Nilai", {
    pageSetup: {
      orientation: "landscape",
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
    views: [{ state: "frozen", xSplit: 2, ySplit: 7 }],
  });

  // Total kolom:
  // 2 (No, Nama) + jumlahBab * 4 (T, SH, Rata Bab, P) + 2 (STS, SAT) + 3 (Rata T, Rata SH, Rata P) + 2 (Peng STS, Peng SAS) + 2 (NA STS, NA SAS) + 2 (Nilai Rapor, Predikat)
  const totalCols = 2 + jumlahBab * 4 + 11;
  const lastColLetter = colIndexToLetter(totalCols);

  // 1. Header Dokumen
  ws.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = ws.getCell("A1");
  titleCell.value = "FORMAT AKUMULASI NILAI";
  titleCell.font = { name: "Arial", size: 14, bold: true };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`A2:${lastColLetter}2`);
  const schoolCell = ws.getCell("A2");
  schoolCell.value = "SMP ISLAM SMART PANGKALPINANG";
  schoolCell.font = { name: "Arial", size: 12, bold: true };
  schoolCell.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`A3:${lastColLetter}3`);
  const mapelCell = ws.getCell("A3");
  mapelCell.value = `Mata Pelajaran: ${docData.mapelId}`;
  mapelCell.font = { name: "Arial", size: 11, bold: true };
  mapelCell.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`A4:${lastColLetter}4`);
  const metaCell = ws.getCell("A4");
  metaCell.value = `Kelas: ${kelasRomawi}   |   Semester: ${docData.semester}   |   Tahun Ajaran: ${docData.tahunAjaran}`;
  metaCell.font = { name: "Arial", size: 10, italic: false };
  metaCell.alignment = { horizontal: "center", vertical: "middle" };

  // Baris 5 kosong
  const headerRowTop = 6;
  const headerRowSub = 7;

  // 2. Header Tabel (Baris 6 & 7)
  ws.mergeCells(headerRowTop, 1, headerRowSub, 1);
  ws.getCell(headerRowTop, 1).value = "No";

  ws.mergeCells(headerRowTop, 2, headerRowSub, 2);
  ws.getCell(headerRowTop, 2).value = "Nama Siswa";

  // Catat indeks kolom untuk rumus Excel hidup
  const tColLettersByBab: Record<number, string> = {};
  const shColLettersByBab: Record<number, string> = {};
  const rataBabColLettersByBab: Record<number, string> = {};
  const pColLettersByBab: Record<number, string> = {};

  let colCursor = 3;
  for (let b = 1; b <= jumlahBab; b++) {
    const startCol = colCursor;
    const endCol = colCursor + 3;
    ws.mergeCells(headerRowTop, startCol, headerRowTop, endCol);
    ws.getCell(headerRowTop, startCol).value = `BAB ${b}`;

    ws.getCell(headerRowSub, startCol).value = "T";
    ws.getCell(headerRowSub, startCol + 1).value = "SH";
    ws.getCell(headerRowSub, startCol + 2).value = "Rata Bab";
    ws.getCell(headerRowSub, startCol + 3).value = "P";

    tColLettersByBab[b] = colIndexToLetter(startCol);
    shColLettersByBab[b] = colIndexToLetter(startCol + 1);
    rataBabColLettersByBab[b] = colIndexToLetter(startCol + 2);
    pColLettersByBab[b] = colIndexToLetter(startCol + 3);

    colCursor += 4;
  }

  const stsColIdx = colCursor++;
  const satColIdx = colCursor++;
  const rataTColIdx = colCursor++;
  const rataSHColIdx = colCursor++;
  const rataPColIdx = colCursor++;
  const pengSTSColIdx = colCursor++;
  const pengSASColIdx = colCursor++;
  const naSTSColIdx = colCursor++;
  const naSASColIdx = colCursor++;
  const raporColIdx = colCursor++;
  const predikatColIdx = colCursor++;

  const stsColLetter = colIndexToLetter(stsColIdx);
  const satColLetter = colIndexToLetter(satColIdx);
  const rataTColLetter = colIndexToLetter(rataTColIdx);
  const rataSHColLetter = colIndexToLetter(rataSHColIdx);
  const rataPColLetter = colIndexToLetter(rataPColIdx);
  const pengSTSColLetter = colIndexToLetter(pengSTSColIdx);
  const pengSASColLetter = colIndexToLetter(pengSASColIdx);
  const naSTSColLetter = colIndexToLetter(naSTSColIdx);
  const naSASColLetter = colIndexToLetter(naSASColIdx);
  const raporColLetter = colIndexToLetter(raporColIdx);
  const predikatColLetter = colIndexToLetter(predikatColIdx);

  const singleHeaders: Array<{ col: number; label: string }> = [
    { col: stsColIdx, label: "STS" },
    { col: satColIdx, label: "SAT" },
    { col: rataTColIdx, label: "Rata T" },
    { col: rataSHColIdx, label: "Rata SH" },
    { col: rataPColIdx, label: "Rata P" },
    { col: pengSTSColIdx, label: "Pengetahuan STS" },
    { col: pengSASColIdx, label: "Pengetahuan SAS" },
    { col: naSTSColIdx, label: "Nilai Akhir STS" },
    { col: naSASColIdx, label: "Nilai Akhir SAS" },
    { col: raporColIdx, label: "Nilai Rapor" },
    { col: predikatColIdx, label: "Predikat" },
  ];

  for (const h of singleHeaders) {
    ws.mergeCells(headerRowTop, h.col, headerRowSub, h.col);
    ws.getCell(headerRowTop, h.col).value = h.label;
  }

  // Style Header
  for (let r = headerRowTop; r <= headerRowSub; r++) {
    for (let c = 1; c <= totalCols; c++) {
      const cell = ws.getCell(r, c);
      cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: c >= rataTColIdx ? "FF0F3D3E" : "FF1E293B" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF94A3B8" } },
        left: { style: "thin", color: { argb: "FF94A3B8" } },
        bottom: { style: "thin", color: { argb: "FF94A3B8" } },
        right: { style: "thin", color: { argb: "FF94A3B8" } },
      };
    }
  }
  ws.getRow(headerRowTop).height = 20;
  ws.getRow(headerRowSub).height = 22;

  // 3. Baris Siswa dengan Rumus Excel Hidup
  const cakupanSTS = docData.cakupanSTS.length > 0 ? docData.cakupanSTS : [1, 2, 3];
  const cakupanSAS =
    docData.cakupanSAS.length > 0
      ? docData.cakupanSAS
      : Array.from({ length: jumlahBab }, (_, i) => i + 1);

  const firstStudentRow = 8;
  const hasilAllStudents: HasilHitungSiswa[] = [];

  students.forEach((student, idx) => {
    const rowNum = firstStudentRow + idx;
    const rawSiswa = docData.siswa[student.id];
    const hasil = hitungAkumulasiSiswa(rawSiswa, {
      jumlahBab,
      cakupanSTS,
      cakupanSAS,
    });
    hasilAllStudents.push(hasil);

    const row = ws.getRow(rowNum);
    row.height = 19;

    ws.getCell(rowNum, 1).value = idx + 1;
    ws.getCell(rowNum, 1).alignment = { horizontal: "center", vertical: "middle" };

    ws.getCell(rowNum, 2).value = student.name;
    ws.getCell(rowNum, 2).alignment = { horizontal: "left", vertical: "middle" };

    // Kolom per bab
    for (let b = 1; b <= jumlahBab; b++) {
      const baseCol = 3 + (b - 1) * 4;
      const babRes = hasil.perBab[b];

      const tCell = ws.getCell(rowNum, baseCol);
      if (babRes && babRes.t !== null) tCell.value = babRes.t;
      tCell.numFmt = "0.##";

      const shCell = ws.getCell(rowNum, baseCol + 1);
      if (babRes && babRes.sh !== null) shCell.value = babRes.sh;
      shCell.numFmt = "0.##";

      // Rumus Hidup Rata Bab = IF(COUNTA(T,SH)=0,"",ROUND(AVERAGE(T,SH),2))
      const tRef = `${tColLettersByBab[b]}${rowNum}`;
      const shRef = `${shColLettersByBab[b]}${rowNum}`;
      const rataBabCell = ws.getCell(rowNum, baseCol + 2);
      rataBabCell.value = {
        formula: `IF(COUNTA(${tRef},${shRef})=0,"",ROUND(AVERAGE(${tRef},${shRef}),2))`,
        result: babRes?.rataBab ?? "",
      };
      rataBabCell.numFmt = "0.00";

      const pCell = ws.getCell(rowNum, baseCol + 3);
      if (babRes && babRes.p !== null) pCell.value = babRes.p;
      pCell.numFmt = "0.##";
    }

    // STS & SAT
    const stsCell = ws.getCell(rowNum, stsColIdx);
    if (hasil.sts !== null) stsCell.value = hasil.sts;
    stsCell.numFmt = "0.##";

    const satCell = ws.getCell(rowNum, satColIdx);
    if (hasil.sat !== null) satCell.value = hasil.sat;
    satCell.numFmt = "0.##";

    // Daftar referensi sel bab dalam cakupan untuk rumus Rata T, Rata SH, Rata P
    const activeCakupan = hasil.sat !== null ? cakupanSAS : cakupanSTS;
    const tRefs = activeCakupan
      .filter((b) => b >= 1 && b <= jumlahBab)
      .map((b) => `${tColLettersByBab[b]}${rowNum}`)
      .join(",");
    const shRefs = activeCakupan
      .filter((b) => b >= 1 && b <= jumlahBab)
      .map((b) => `${shColLettersByBab[b]}${rowNum}`)
      .join(",");
    const pRefs = activeCakupan
      .filter((b) => b >= 1 && b <= jumlahBab)
      .map((b) => `${pColLettersByBab[b]}${rowNum}`)
      .join(",");

    const rataTCell = ws.getCell(rowNum, rataTColIdx);
    rataTCell.value = {
      formula: `IF(COUNTA(${tRefs})=0,"",ROUND(AVERAGE(${tRefs}),2))`,
      result: hasil.rataT ?? "",
    };
    rataTCell.numFmt = "0.00";

    const rataSHCell = ws.getCell(rowNum, rataSHColIdx);
    rataSHCell.value = {
      formula: `IF(COUNTA(${shRefs})=0,"",ROUND(AVERAGE(${shRefs}),2))`,
      result: hasil.rataSH ?? "",
    };
    rataSHCell.numFmt = "0.00";

    const rataPCell = ws.getCell(rowNum, rataPColIdx);
    rataPCell.value = {
      formula: `IF(COUNTA(${pRefs})=0,"",ROUND(AVERAGE(${pRefs}),2))`,
      result: hasil.rataP ?? "",
    };
    rataPCell.numFmt = "0.00";

    const rtRef = `${rataTColLetter}${rowNum}`;
    const rshRef = `${rataSHColLetter}${rowNum}`;
    const rpRef = `${rataPColLetter}${rowNum}`;
    const stsRef = `${stsColLetter}${rowNum}`;
    const satRef = `${satColLetter}${rowNum}`;
    const pengSTSRef = `${pengSTSColLetter}${rowNum}`;
    const pengSASRef = `${pengSASColLetter}${rowNum}`;
    const naSTSRef = `${naSTSColLetter}${rowNum}`;
    const naSASRef = `${naSASColLetter}${rowNum}`;
    const raporRef = `${raporColLetter}${rowNum}`;

    // Pengetahuan STS = (Rata T + 2 * Rata SH + STS) / 4
    const pengSTSCell = ws.getCell(rowNum, pengSTSColIdx);
    pengSTSCell.value = {
      formula: `IF(OR(${rtRef}="",${rshRef}="",${stsRef}=""),"",ROUND((${rtRef}+2*${rshRef}+${stsRef})/4,2))`,
      result: hasil.pengetahuanSTS ?? "",
    };
    pengSTSCell.numFmt = "0.00";

    // Pengetahuan SAS = (Rata T + 2 * Rata SH + STS + SAT) / 5
    const pengSASCell = ws.getCell(rowNum, pengSASColIdx);
    pengSASCell.value = {
      formula: `IF(OR(${rtRef}="",${rshRef}="",${stsRef}="",${satRef}=""),"",ROUND((${rtRef}+2*${rshRef}+${stsRef}+${satRef})/5,2))`,
      result: hasil.pengetahuanSAS ?? "",
    };
    pengSASCell.numFmt = "0.00";

    // Nilai Akhir STS = (Pengetahuan STS + Rata P) / 2
    const naSTSCell = ws.getCell(rowNum, naSTSColIdx);
    naSTSCell.value = {
      formula: `IF(OR(${pengSTSRef}="",${rpRef}=""),"",ROUND((${pengSTSRef}+${rpRef})/2,2))`,
      result: hasil.nilaiAkhirSTS ?? "",
    };
    naSTSCell.numFmt = "0.00";

    // Nilai Akhir SAS = (Pengetahuan SAS + Rata P) / 2
    const naSASCell = ws.getCell(rowNum, naSASColIdx);
    naSASCell.value = {
      formula: `IF(OR(${pengSASRef}="",${rpRef}=""),"",ROUND((${pengSASRef}+${rpRef})/2,2))`,
      result: hasil.nilaiAkhirSAS ?? "",
    };
    naSASCell.numFmt = "0.00";

    // Nilai Rapor = pembulatan ke bilangan bulat terdekat dari Nilai Akhir
    const raporCell = ws.getCell(rowNum, raporColIdx);
    raporCell.value = {
      formula: `IF(${naSASRef}<>"",ROUND(${naSASRef},0),IF(${naSTSRef}<>"",ROUND(${naSTSRef},0),""))`,
      result: hasil.nilaiRapor ?? "",
    };
    raporCell.numFmt = "0";

    // Predikat dari Nilai Rapor: 91-100=A, 81-90=B, 73-80=C, <73=D
    const predikatCell = ws.getCell(rowNum, predikatColIdx);
    predikatCell.value = {
      formula: `IF(${raporRef}="","",IF(${raporRef}>=91,"A",IF(${raporRef}>=81,"B",IF(${raporRef}>=73,"C","D"))))`,
      result: hasil.predikat ?? "",
    };

    // Styling sel baris
    for (let c = 1; c <= totalCols; c++) {
      const cell = ws.getCell(rowNum, c);
      const isReadOnlyCalc =
        c >= rataTColIdx || (c >= 3 && c < stsColIdx && (c - 3) % 4 === 2);

      cell.font = {
        name: "Arial",
        size: 9,
        bold: c === raporColIdx || c === predikatColIdx,
        color: {
          argb: hasil.isBelowKKM && (c === raporColIdx || c === predikatColIdx || c === 2)
            ? "FFB91C1C"
            : "FF0F172A",
        },
      };

      if (hasil.isBelowKKM) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEE2E2" },
        };
      } else if (isReadOnlyCalc) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF1F5F9" },
        };
      }

      if (c > 2) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }

      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    }
  });

  const lastStudentRow = Math.max(firstStudentRow, firstStudentRow + students.length - 1);
  const ringkasan = hitungRingkasanKelas(hasilAllStudents);

  // 4. Baris Ringkasan Kelas di bawah tabel
  const summaryRows: Array<{
    label: string;
    formulaFn: (colLetter: string) => string;
    resultVal: number | string;
    numFmt: string;
  }> = [
    {
      label: "Rata-Rata Kelas",
      formulaFn: (col) =>
        `IF(COUNT(${col}${firstStudentRow}:${col}${lastStudentRow})=0,"",ROUND(AVERAGE(${col}${firstStudentRow}:${col}${lastStudentRow}),2))`,
      resultVal: ringkasan.rataRataNilaiRapor ?? "",
      numFmt: "0.00",
    },
    {
      label: "Nilai Tertinggi",
      formulaFn: (col) =>
        `IF(COUNT(${col}${firstStudentRow}:${col}${lastStudentRow})=0,"",MAX(${col}${firstStudentRow}:${col}${lastStudentRow}))`,
      resultVal: ringkasan.nilaiTertinggi ?? "",
      numFmt: "0.##",
    },
    {
      label: "Nilai Terendah",
      formulaFn: (col) =>
        `IF(COUNT(${col}${firstStudentRow}:${col}${lastStudentRow})=0,"",MIN(${col}${firstStudentRow}:${col}${lastStudentRow}))`,
      resultVal: ringkasan.nilaiTerendah ?? "",
      numFmt: "0.##",
    },
    {
      label: `Jumlah Siswa di Bawah KKM (< ${KKM_DEFAULT})`,
      formulaFn: (col) =>
        `COUNTIF(${col}${firstStudentRow}:${col}${lastStudentRow},"<${KKM_DEFAULT}")`,
      resultVal: ringkasan.jumlahDiBawahKKM,
      numFmt: "0",
    },
  ];

  summaryRows.forEach((sRow, sIdx) => {
    const rNum = lastStudentRow + 1 + sIdx;
    ws.mergeCells(rNum, 1, rNum, totalCols - 2);
    const labelCell = ws.getCell(rNum, 1);
    labelCell.value = sRow.label;
    labelCell.font = { name: "Arial", size: 9, bold: true };
    labelCell.alignment = { horizontal: "right", vertical: "middle" };

    const valCell = ws.getCell(rNum, raporColIdx);
    valCell.value = {
      formula: sRow.formulaFn(raporColLetter),
      result: sRow.resultVal,
    };
    valCell.numFmt = sRow.numFmt;
    valCell.font = { name: "Arial", size: 9, bold: true };
    valCell.alignment = { horizontal: "center", vertical: "middle" };

    for (let c = 1; c <= totalCols; c++) {
      const cell = ws.getCell(rNum, c);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF94A3B8" } },
        left: { style: "thin", color: { argb: "FF94A3B8" } },
        bottom: { style: "thin", color: { argb: "FF94A3B8" } },
        right: { style: "thin", color: { argb: "FF94A3B8" } },
      };
    }
  });

  // 5. Keterangan Rentang Predikat & Blok Tanda Tangan
  const footerStartRow = lastStudentRow + 6;
  ws.getCell(footerStartRow, 2).value = "Keterangan Rentang Nilai & Predikat:";
  ws.getCell(footerStartRow, 2).font = { name: "Arial", size: 9, bold: true };

  const rentangInfo = [
    "91 – 100 = A (Sangat Baik)",
    "81 – 90  = B (Baik)",
    "73 – 80  = C (Cukup)",
    "< 73     = D (Perlu Bimbingan / Di Bawah KKM)",
  ];
  rentangInfo.forEach((info, i) => {
    const c = ws.getCell(footerStartRow + 1 + i, 2);
    c.value = info;
    c.font = { name: "Arial", size: 9 };
  });

  // Tanda tangan: Kepala Sekolah (kiri) & Guru Mata Pelajaran (kanan)
  const signRowTop = footerStartRow + 6;
  const rightSignCol = Math.max(6, totalCols - 5);

  ws.getCell(signRowTop, 2).value = "Mengetahui,";
  ws.getCell(signRowTop, 2).font = { name: "Arial", size: 10 };

  ws.getCell(signRowTop + 1, 2).value = "Kepala SMP Islam SMART Pangkalpinang";
  ws.getCell(signRowTop + 1, 2).font = { name: "Arial", size: 10, bold: true };

  ws.getCell(signRowTop + 5, 2).value = docData.principalName || "Ari Gunawan, S.Kom.";
  ws.getCell(signRowTop + 5, 2).font = { name: "Arial", size: 10, bold: true, underline: true };

  const placeDateText = `${docData.signaturePlace || "Pangkalpinang"}, ${docData.signatureDate}`;
  ws.getCell(signRowTop, rightSignCol).value = placeDateText;
  ws.getCell(signRowTop, rightSignCol).font = { name: "Arial", size: 10 };

  ws.getCell(signRowTop + 1, rightSignCol).value = "Guru Mata Pelajaran";
  ws.getCell(signRowTop + 1, rightSignCol).font = { name: "Arial", size: 10, bold: true };

  ws.getCell(signRowTop + 5, rightSignCol).value = docData.teacherName || docData.updatedBy;
  ws.getCell(signRowTop + 5, rightSignCol).font = {
    name: "Arial",
    size: 10,
    bold: true,
    underline: true,
  };

  // Lebar Kolom
  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 28;
  for (let c = 3; c < rataTColIdx; c++) {
    ws.getColumn(c).width = 7.5;
  }
  for (let c = rataTColIdx; c <= totalCols; c++) {
    ws.getColumn(c).width = 11;
  }

  // =========================================================================
  // SHEET 2: TABEL LEGGER (3.1, 4.1, ... sampai bab aktif)
  // =========================================================================
  const wsLegger = workbook.addWorksheet("Legger Nilai", {
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  const leggerTotalCols = 2 + jumlahBab * 2 + 2;
  const leggerLastLetter = colIndexToLetter(leggerTotalCols);

  wsLegger.mergeCells(`A1:${leggerLastLetter}1`);
  wsLegger.getCell("A1").value = `LEGGER NILAI PER-BAB (3.x PENGETAHUAN & 4.x KETERAMPILAN)`;
  wsLegger.getCell("A1").font = { name: "Arial", size: 13, bold: true };
  wsLegger.getCell("A1").alignment = { horizontal: "center" };

  wsLegger.mergeCells(`A2:${leggerLastLetter}2`);
  wsLegger.getCell("A2").value = `SMP Islam SMART Pangkalpinang — Mata Pelajaran: ${docData.mapelId} — Kelas ${kelasRomawi} (${docData.semester} ${docData.tahunAjaran})`;
  wsLegger.getCell("A2").font = { name: "Arial", size: 10, bold: true };
  wsLegger.getCell("A2").alignment = { horizontal: "center" };

  const legHeaderRow = 4;
  wsLegger.getCell(legHeaderRow, 1).value = "No";
  wsLegger.getCell(legHeaderRow, 2).value = "Nama Siswa";

  let legCol = 3;
  for (let b = 1; b <= jumlahBab; b++) {
    wsLegger.getCell(legHeaderRow, legCol++).value = `3.${b}`;
    wsLegger.getCell(legHeaderRow, legCol++).value = `4.${b}`;
  }
  wsLegger.getCell(legHeaderRow, legCol++).value = "Nilai Rapor";
  wsLegger.getCell(legHeaderRow, legCol++).value = "Predikat";

  for (let c = 1; c <= leggerTotalCols; c++) {
    const cell = wsLegger.getCell(legHeaderRow, c);
    cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  }

  students.forEach((student, idx) => {
    const r = legHeaderRow + 1 + idx;
    const mainRow = firstStudentRow + idx;
    const hasil = hasilAllStudents[idx];
    const leggerItems = hitungLeggerSiswa(hasil, jumlahBab);

    wsLegger.getCell(r, 1).value = idx + 1;
    wsLegger.getCell(r, 2).value = student.name;

    let cIdx = 3;
    leggerItems.forEach((item) => {
      const rataBabRef = `'Akumulasi Nilai'!${rataBabColLettersByBab[item.bab]}${mainRow}`;
      const pRef = `'Akumulasi Nilai'!${pColLettersByBab[item.bab]}${mainRow}`;

      const c3 = wsLegger.getCell(r, cIdx++);
      c3.value = { formula: rataBabRef, result: item.nilaiPengetahuan ?? "" };
      c3.numFmt = "0.00";
      c3.alignment = { horizontal: "center" };

      const c4 = wsLegger.getCell(r, cIdx++);
      c4.value = { formula: pRef, result: item.nilaiKeterampilan ?? "" };
      c4.numFmt = "0.00";
      c4.alignment = { horizontal: "center" };
    });

    const cRapor = wsLegger.getCell(r, cIdx++);
    cRapor.value = {
      formula: `'Akumulasi Nilai'!${raporColLetter}${mainRow}`,
      result: hasil.nilaiRapor ?? "",
    };
    cRapor.alignment = { horizontal: "center" };

    const cPred = wsLegger.getCell(r, cIdx++);
    cPred.value = {
      formula: `'Akumulasi Nilai'!${predikatColLetter}${mainRow}`,
      result: hasil.predikat ?? "",
    };
    cPred.alignment = { horizontal: "center" };
  });

  wsLegger.getColumn(1).width = 5;
  wsLegger.getColumn(2).width = 28;
  for (let c = 3; c <= leggerTotalCols; c++) {
    wsLegger.getColumn(c).width = 10;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const safeMapel = docData.mapelId.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `Format_Akumulasi_Nilai_${safeMapel}_Kelas_${kelasRomawi}_${docData.semester}.xlsx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Membangun HTML dokumen cetak / PDF dengan orientasi Landscape (F4 atau A4)
 * dan header tabel yang berulang otomatis di setiap halaman.
 */
export function buildAkumulasiPrintHtml(params: {
  docData: AkumulasiNilaiDoc;
  students: Student[];
  paperSize: PaperSizeOption;
  includeLegger?: boolean;
}): string {
  const { docData, students, paperSize, includeLegger = true } = params;
  const jumlahBab = Math.max(1, Math.min(7, docData.jumlahBab || 6));
  const kelasRomawi = formatKelasRomawi(docData.kelas);
  const cakupanSTS = docData.cakupanSTS.length > 0 ? docData.cakupanSTS : [1, 2, 3];
  const cakupanSAS =
    docData.cakupanSAS.length > 0
      ? docData.cakupanSAS
      : Array.from({ length: jumlahBab }, (_, i) => i + 1);

  const hasilList = students.map((s) =>
    hitungAkumulasiSiswa(docData.siswa[s.id], {
      jumlahBab,
      cakupanSTS,
      cakupanSAS,
    })
  );
  const ringkasan = hitungRingkasanKelas(hasilList);

  const pageCssSize = paperSize === "F4" ? "330mm 215mm" : "A4 landscape";

  let babGroupHeaders = "";
  let babSubHeaders = "";
  for (let b = 1; b <= jumlahBab; b++) {
    babGroupHeaders += `<th colspan="4">BAB ${b}</th>`;
    babSubHeaders += `<th>T</th><th>SH</th><th class="calc-col">Rata</th><th>P</th>`;
  }

  const studentRowsHtml = students
    .map((s, idx) => {
      const h = hasilList[idx];
      let babCells = "";
      for (let b = 1; b <= jumlahBab; b++) {
        const pb = h.perBab[b];
        babCells += `
          <td>${pb?.t !== null && pb?.t !== undefined ? pb.t : "-"}</td>
          <td>${pb?.sh !== null && pb?.sh !== undefined ? pb.sh : "-"}</td>
          <td class="calc-col">${formatScore2(pb?.rataBab)}</td>
          <td>${pb?.p !== null && pb?.p !== undefined ? pb.p : "-"}</td>
        `;
      }
      const rowWarnClass = h.isBelowKKM ? "below-kkm" : "";
      return `
        <tr class="${rowWarnClass}">
          <td style="text-align:center;">${idx + 1}</td>
          <td style="text-align:left; font-weight:600; white-space:nowrap;">${s.name}</td>
          ${babCells}
          <td>${h.sts !== null ? h.sts : "-"}</td>
          <td>${h.sat !== null ? h.sat : "-"}</td>
          <td class="calc-col">${formatScore2(h.rataT)}</td>
          <td class="calc-col">${formatScore2(h.rataSH)}</td>
          <td class="calc-col">${formatScore2(h.rataP)}</td>
          <td class="calc-col">${formatScore2(h.pengetahuanSTS)}</td>
          <td class="calc-col">${formatScore2(h.pengetahuanSAS)}</td>
          <td class="calc-col">${formatScore2(h.nilaiAkhirSTS)}</td>
          <td class="calc-col">${formatScore2(h.nilaiAkhirSAS)}</td>
          <td class="rapor-col">${formatIntegerScore(h.nilaiRapor)}</td>
          <td class="rapor-col">${h.predikat ?? "-"}</td>
        </tr>
      `;
    })
    .join("");

  let leggerSectionHtml = "";
  if (includeLegger) {
    let leggerHeaders = "";
    for (let b = 1; b <= jumlahBab; b++) {
      leggerHeaders += `<th>3.${b}</th><th>4.${b}</th>`;
    }
    const leggerRows = students
      .map((s, idx) => {
        const h = hasilList[idx];
        const items = hitungLeggerSiswa(h, jumlahBab);
        const cells = items
          .map(
            (it) =>
              `<td>${formatScore2(it.nilaiPengetahuan)}</td><td>${formatScore2(it.nilaiKeterampilan)}</td>`
          )
          .join("");
        return `
          <tr class="${h.isBelowKKM ? "below-kkm" : ""}">
            <td style="text-align:center;">${idx + 1}</td>
            <td style="text-align:left; font-weight:600;">${s.name}</td>
            ${cells}
            <td class="rapor-col">${formatIntegerScore(h.nilaiRapor)}</td>
            <td class="rapor-col">${h.predikat ?? "-"}</td>
          </tr>
        `;
      })
      .join("");

    leggerSectionHtml = `
      <div style="page-break-before: always; margin-top: 14px;">
        <div class="doc-header">
          <h2>TABEL LEGGER NILAI PER-BAB (3.x PENGETAHUAN & 4.x KETERAMPILAN)</h2>
          <p>SMP Islam SMART Pangkalpinang — Mata Pelajaran: <strong>${docData.mapelId}</strong> — Kelas ${kelasRomawi} (${docData.semester} ${docData.tahunAjaran})</p>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:28px;">No</th>
              <th style="min-width:160px;">Nama Siswa</th>
              ${leggerHeaders}
              <th>Nilai Rapor</th>
              <th>Predikat</th>
            </tr>
          </thead>
          <tbody>
            ${leggerRows}
          </tbody>
        </table>
      </div>
    `;
  }

  const totalSpanBeforeSummary = 2 + jumlahBab * 4 + 9;

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Format Akumulasi Nilai - ${docData.mapelId} - Kelas ${kelasRomawi}</title>
      <style>
        @page {
          size: ${pageCssSize};
          margin: 10mm 10mm 12mm 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 8pt;
          color: #0f172a;
          margin: 0;
          padding: 0;
        }
        .doc-header {
          text-align: center;
          margin-bottom: 8px;
        }
        .doc-header h1 {
          font-size: 12pt;
          font-weight: 800;
          margin: 0 0 2px 0;
          letter-spacing: 0.3px;
        }
        .doc-header h2 {
          font-size: 10.5pt;
          font-weight: 700;
          margin: 0 0 3px 0;
        }
        .doc-header p {
          font-size: 8.5pt;
          margin: 1px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-variant-numeric: tabular-nums;
        }
        thead {
          display: table-header-group;
        }
        tfoot {
          display: table-row-group;
        }
        tr {
          page-break-inside: avoid;
        }
        th, td {
          border: 1px solid #475569;
          padding: 2.5px 3.5px;
          text-align: center;
          font-size: 7.5pt;
        }
        th {
          background-color: #1e293b;
          color: #ffffff;
          font-weight: 700;
        }
        .calc-col {
          background-color: #f1f5f9;
          font-weight: 600;
        }
        .rapor-col {
          background-color: #e2e8f0;
          font-weight: 700;
        }
        tr.below-kkm td {
          background-color: #fee2e2 !important;
          color: #991b1b !important;
        }
        .summary-row td {
          background-color: #e2e8f0;
          font-weight: 700;
        }
        .footer-grid {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 12px;
          page-break-inside: avoid;
        }
        .predikat-box {
          font-size: 7.5pt;
          border: 1px solid #94a3b8;
          padding: 6px 10px;
          border-radius: 4px;
          background: #f8fafc;
        }
        .signature-area {
          display: flex;
          justify-content: space-between;
          width: 62%;
          font-size: 8.5pt;
        }
        .sig-block {
          text-align: center;
          min-width: 200px;
        }
        .sig-space {
          height: 46px;
        }
        .sig-name {
          font-weight: 700;
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="doc-header">
        <h1>FORMAT AKUMULASI NILAI</h1>
        <h2>SMP ISLAM SMART PANGKALPINANG</h2>
        <p><strong>Mata Pelajaran: ${docData.mapelId}</strong></p>
        <p>Kelas: <strong>${kelasRomawi}</strong> &nbsp;|&nbsp; Semester: <strong>${docData.semester}</strong> &nbsp;|&nbsp; Tahun Ajaran: <strong>${docData.tahunAjaran}</strong></p>
      </div>

      <table>
        <thead>
          <tr>
            <th rowspan="2" style="width:24px;">No</th>
            <th rowspan="2" style="min-width:140px;">Nama Siswa</th>
            ${babGroupHeaders}
            <th rowspan="2">STS</th>
            <th rowspan="2">SAT</th>
            <th rowspan="2">Rata T</th>
            <th rowspan="2">Rata SH</th>
            <th rowspan="2">Rata P</th>
            <th rowspan="2">Peng STS</th>
            <th rowspan="2">Peng SAS</th>
            <th rowspan="2">NA STS</th>
            <th rowspan="2">NA SAS</th>
            <th rowspan="2">Nilai Rapor</th>
            <th rowspan="2">Predikat</th>
          </tr>
          <tr>
            ${babSubHeaders}
          </tr>
        </thead>
        <tbody>
          ${studentRowsHtml}
        </tbody>
        <tfoot>
          <tr class="summary-row">
            <td colspan="${totalSpanBeforeSummary}" style="text-align:right; padding-right:8px;">Rata-Rata Kelas</td>
            <td colspan="2">${formatScore2(ringkasan.rataRataNilaiRapor)}</td>
          </tr>
          <tr class="summary-row">
            <td colspan="${totalSpanBeforeSummary}" style="text-align:right; padding-right:8px;">Nilai Tertinggi / Nilai Terendah</td>
            <td colspan="2">${formatIntegerScore(ringkasan.nilaiTertinggi)} / ${formatIntegerScore(ringkasan.nilaiTerendah)}</td>
          </tr>
          <tr class="summary-row">
            <td colspan="${totalSpanBeforeSummary}" style="text-align:right; padding-right:8px;">Jumlah Siswa di Bawah KKM (&lt; ${KKM_DEFAULT})</td>
            <td colspan="2">${ringkasan.jumlahDiBawahKKM} Siswa</td>
          </tr>
        </tfoot>
      </table>

      <div class="footer-grid">
        <div class="predikat-box">
          <strong>Keterangan Rentang Nilai Rapor &amp; Predikat:</strong><br/>
          • 91 – 100 = <strong>A</strong> (Sangat Baik) &nbsp;&nbsp; • 81 – 90 = <strong>B</strong> (Baik)<br/>
          • 73 – 80 = <strong>C</strong> (Cukup) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • &lt; 73 = <strong>D</strong> (Di Bawah KKM / Perlu Bimbingan)
        </div>
        <div class="signature-area">
          <div class="sig-block">
            <div>Mengetahui,</div>
            <div><strong>Kepala Sekolah</strong></div>
            <div class="sig-space"></div>
            <div class="sig-name">${docData.principalName || "Ari Gunawan, S.Kom."}</div>
          </div>
          <div class="sig-block">
            <div>${docData.signaturePlace || "Pangkalpinang"}, ${docData.signatureDate}</div>
            <div><strong>Guru Mata Pelajaran</strong></div>
            <div class="sig-space"></div>
            <div class="sig-name">${docData.teacherName || docData.updatedBy}</div>
          </div>
        </div>
      </div>

      ${leggerSectionHtml}
    </body>
    </html>
  `;
}

/**
 * Mencetak dokumen menggunakan iframe tersembunyi (tanpa membuka window baru yang terblokir di iframe sandbox).
 */
export function triggerPrintAkumulasi(params: {
  docData: AkumulasiNilaiDoc;
  students: Student[];
  paperSize: PaperSizeOption;
  includeLegger?: boolean;
}): void {
  const html = buildAkumulasiPrintHtml(params);
  const existingFrame = document.getElementById("akumulasi-print-iframe");
  if (existingFrame && existingFrame.parentNode) {
    existingFrame.parentNode.removeChild(existingFrame);
  }

  const iframe = document.createElement("iframe");
  iframe.id = "akumulasi-print-iframe";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 350);
  }
}

/**
 * Mengunduh file PDF (.pdf) dengan orientasi Landscape dan ukuran kertas F4 (330x215mm) atau A4 (297x210mm).
 */
export async function downloadAkumulasiPdf(params: {
  docData: AkumulasiNilaiDoc;
  students: Student[];
  paperSize: PaperSizeOption;
  includeLegger?: boolean;
}): Promise<void> {
  const html = buildAkumulasiPrintHtml(params);
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = params.paperSize === "F4" ? "1240px" : "1120px";
  container.style.background = "#ffffff";
  container.style.padding = "16px";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default;
    const kelasRomawi = formatKelasRomawi(params.docData.kelas);
    const safeMapel = params.docData.mapelId.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `Format_Akumulasi_Nilai_${safeMapel}_Kelas_${kelasRomawi}_${params.docData.semester}.pdf`;

    const pdfFormat: [number, number] | string =
      params.paperSize === "F4" ? [330, 215] : "a4";

    await html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: pdfFormat, orientation: "landscape" },
      })
      .from(container)
      .save();
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
