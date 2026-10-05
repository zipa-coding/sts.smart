import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  VerticalAlign,
  BorderStyle,
  VerticalMergeType,
  ImageRun,
  PageBreak,
  TabStopType,
} from "docx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { Student, Grade, Halaqoh, Teacher } from "../types";
import { KEISLAMAN_SUBJECTS } from "../components/HalaqohRaportView";
import kopSuratBannerUrl from "../assets/images/kop_surat_banner.png";

const border = {
  style: BorderStyle.SINGLE,
  size: 6, // 0.75 pt
  color: "000000",
};
const tableBorders = {
  top: border,
  bottom: border,
  left: border,
  right: border,
  insideHorizontal: border,
  insideVertical: border,
};

const cellMargins = {
  top: 55, // dxa (~2.75pt) - moderate comfortable spacing
  bottom: 55,
  left: 90,
  right: 90,
};

// Cached banner buffer to avoid re-fetching on every document generation
let cachedBannerBuffer: ArrayBuffer | null = null;

export function triggerBrowserDownload(blob: Blob, fileName: string): void {
  try {
    saveAs(blob, fileName);
  } catch (err) {
    console.warn("saveAs failed, falling back to anchor click", err);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch {}
    }, 2000);
  }
}

export async function generateHalaqohWordBlob(
  halaqoh: Halaqoh,
  subjectMeta: (typeof KEISLAMAN_SUBJECTS)[0],
  allStudents: Student[],
  grades: Grade[],
  teachers: Teacher[],
  descFontSize: string = "9.5pt"
): Promise<{ blob: Blob; fileName: string }> {
  // 1. Fetch Kop Surat Banner image buffer reliably (with caching for speed)
  let bannerBuffer: ArrayBuffer | null = cachedBannerBuffer;
  if (!bannerBuffer) {
    try {
      let res = await fetch(kopSuratBannerUrl);
      if (!res.ok) {
        res = await fetch("/kop_surat_banner.png");
      }
      if (res.ok) {
        bannerBuffer = await res.arrayBuffer();
        cachedBannerBuffer = bannerBuffer;
      }
    } catch {
      try {
        const res = await fetch("/kop_surat_banner.png");
        if (res.ok) {
          bannerBuffer = await res.arrayBuffer();
          cachedBannerBuffer = bannerBuffer;
        }
      } catch (err) {
        console.warn("Could not load kop surat banner image, continuing without image banner", err);
      }
    }
  }

  // 2. Resolve member students strictly as assigned in Admin Panel
  const memberStudents = (halaqoh.studentIds || [])
    .map((id) => allStudents.find((s) => String(s.id).trim() === String(id).trim()))
    .filter((s): s is Student => Boolean(s))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "id", { sensitivity: "base" }));

  // 3. Resolve mentor teacher strictly from halaqoh data or registered teachers (never invent fake names)
  const mentorTeacher = teachers.find((t) => t.id === halaqoh.mentorTeacherId);
  const mentorName =
    halaqoh.mentorName && halaqoh.mentorName.trim() !== ""
      ? halaqoh.mentorName.trim()
      : mentorTeacher?.name && mentorTeacher.name.trim() !== ""
      ? mentorTeacher.name.trim()
      : "";

  const formatKelasName = (k: string) => {
    const clean = String(k || "").trim().toUpperCase();
    if (clean === "7" || clean === "VII") return "VII (Tujuh)";
    if (clean === "8" || clean === "VIII") return "VIII (Delapan)";
    if (clean === "9" || clean === "IX") return "IX (Sembilan)";
    return clean ? `Kelas ${clean}` : "-";
  };

  // Helper to build a student card block with tight spacing
  const buildStudentCardDocx = (
    student: Student,
    cardNum: number,
    isFirstOnPage: boolean = false
  ): (Paragraph | Table)[] => {
    const studentName = student.name ? student.name.trim() : "-";
    const kelasName = formatKelasName(student.kelas);

    const normalizeSub = (s: string | undefined | null) => {
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
      const normA = normalizeSub(a);
      const normB = normalizeSub(b);
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

    const scoreToPred = (score: number | string | undefined | null): string => {
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
      : (gradeObj?.score !== undefined && gradeObj?.score !== null)
      ? scoreToPred(gradeObj.score)
      : "A";

    const prosesVal = (gradeObj?.proses && gradeObj.proses.trim() !== "")
      ? gradeObj.proses.trim()
      : (gradeObj?.score !== undefined && gradeObj?.score !== null)
      ? scoreToPred(gradeObj.score)
      : "A";

    const capaianVal = (gradeObj?.capaian && gradeObj.capaian.trim() !== "")
      ? gradeObj.capaian.trim()
      : (gradeObj?.score !== undefined && gradeObj?.score !== null)
      ? scoreToPred(gradeObj.score)
      : "A";

    let descContent = "";
    if (gradeObj?.deskripsi && gradeObj.deskripsi.trim()) {
      descContent = gradeObj.deskripsi.trim();
    } else {
      const studentFirstName = student.name.split(" ")[0] || student.name;
      descContent = `Alhamdulillah ananda ${studentFirstName} saat ini capaian pembelajaran ${subjectMeta.tableHeader} telah tuntas sesuai target. Harapannya ananda bisa terus istiqomah dan lancar.`;
    }

    // Name paragraph with TabStop for perfect colon alignment, moderate balanced spacing
    const pName = new Paragraph({
      children: [
        new TextRun({
          text: `${cardNum}. Nama`,
          font: "Times New Roman",
          size: 21, // 10.5pt
        }),
        new TextRun({
          text: `\t: ${studentName}`,
          font: "Times New Roman",
          size: 21,
        }),
      ],
      tabStops: [{ type: TabStopType.LEFT, position: 1100 }],
      spacing: { before: isFirstOnPage ? 0 : 100, after: 15, line: 240 },
    });

    // Class paragraph with TabStop for perfect colon alignment, moderate balanced spacing before table
    const pClass = new Paragraph({
      children: [
        new TextRun({
          text: `   Kelas`,
          font: "Times New Roman",
          size: 21,
        }),
        new TextRun({
          text: `\t: ${kelasName}`,
          font: "Times New Roman",
          size: 21,
        }),
      ],
      tabStops: [{ type: TabStopType.LEFT, position: 1100 }],
      spacing: { before: 0, after: 35, line: 240 },
    });

    // Calculate dynamic docx font size for description (e.g. 9.5pt -> 19)
    const parsedPt = parseFloat(descFontSize) || 9.5;
    const docxDescSize = Math.round(parsedPt * 2);

    // Score & Description Table with balanced cell spacing
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders,
      rows: [
        // Row 1: Headers & Subject Name (Vertical merge restart)
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: subjectMeta.tableHeader,
                      bold: true,
                      font: "Times New Roman",
                      size: 20, // 10pt
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0, line: 220 },
                }),
              ],
              verticalMerge: VerticalMergeType.RESTART,
              verticalAlign: VerticalAlign.CENTER,
              width: { size: 48, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              margins: cellMargins,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Usaha",
                      bold: true,
                      font: "Times New Roman",
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0, line: 220 },
                }),
              ],
              verticalAlign: VerticalAlign.CENTER,
              width: { size: 17, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              margins: cellMargins,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Proses",
                      bold: true,
                      font: "Times New Roman",
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0, line: 220 },
                }),
              ],
              verticalAlign: VerticalAlign.CENTER,
              width: { size: 17, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              margins: cellMargins,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Capaian",
                      bold: true,
                      font: "Times New Roman",
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0, line: 220 },
                }),
              ],
              verticalAlign: VerticalAlign.CENTER,
              width: { size: 18, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              margins: cellMargins,
            }),
          ],
        }),
        // Row 2: Grades
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ spacing: { before: 0, after: 0, line: 220 } })],
              verticalMerge: VerticalMergeType.CONTINUE,
              width: { size: 48, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              margins: cellMargins,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: String(usahaVal),
                      bold: true,
                      font: "Times New Roman",
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0, line: 220 },
                }),
              ],
              verticalAlign: VerticalAlign.CENTER,
              width: { size: 17, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              margins: cellMargins,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: String(prosesVal),
                      bold: true,
                      font: "Times New Roman",
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0, line: 220 },
                }),
              ],
              verticalAlign: VerticalAlign.CENTER,
              width: { size: 17, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              margins: cellMargins,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: String(capaianVal),
                      bold: true,
                      font: "Times New Roman",
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0, line: 220 },
                }),
              ],
              verticalAlign: VerticalAlign.CENTER,
              width: { size: 18, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              margins: cellMargins,
            }),
          ],
        }),
        // Row 3: Description with compact margins
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 4,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Deskripsi : ",
                      bold: true,
                      font: "Times New Roman",
                      size: docxDescSize,
                    }),
                    new TextRun({
                      text: descContent,
                      font: "Times New Roman",
                      size: docxDescSize,
                    }),
                  ],
                  alignment: AlignmentType.BOTH,
                  spacing: { before: 0, after: 0, line: 240 },
                }),
              ],
              borders: tableBorders,
              margins: {
                top: 60,
                bottom: 60,
                left: 100,
                right: 100,
              },
            }),
          ],
        }),
      ],
    });

    return [pName, pClass, table];
  };

  // 4. Organize students into exact pages matching the user's reference PDF:
  // Page 1: Kop Banner + Title + First 4 students
  // Page 2: Next 5 students (students 5 to 9)
  // Page 3: Signature + Keterangan Legend (or next students if > 9)
  const page1Students = memberStudents.slice(0, 4);
  const remainingStudents = memberStudents.slice(4);

  const documentChildren: (Paragraph | Table)[] = [];

  // ================= PAGE 1 =================
  // Banner Image - Large, full-width matching the page margins with prominent official logos
  if (bannerBuffer) {
    documentChildren.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: "png",
            data: new Uint8Array(bannerBuffer),
            transformation: {
              width: 685,
              height: 102.75,
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 70 },
      })
    );
  }

  // Document Title exactly matching reference with compact spacing
  documentChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Hasil Evaluasi Tahsin Tahfidz Qur,an (ETTQ)",
          bold: true,
          font: "Times New Roman",
          size: 26, // 13pt
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 15 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: subjectMeta.shortTitle,
          bold: true,
          font: "Times New Roman",
          size: 24, // 12pt
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 15 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Semester-1, Tahun Pelajaran 2025/2026",
          bold: true,
          font: "Times New Roman",
          size: 21, // 10.5pt
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
    })
  );

  // Render Page 1 Students
  page1Students.forEach((student, idx) => {
    const cardElements = buildStudentCardDocx(student, idx + 1, idx === 0);
    documentChildren.push(...cardElements);
  });

  // ================= PAGE 2 & SUBSEQUENT PAGES =================
  if (remainingStudents.length > 0) {
    // Break to Page 2
    documentChildren.push(
      new Paragraph({
        children: [new PageBreak()],
        spacing: { before: 0, after: 0 },
      })
    );

    // Group remaining into chunks of 5 students per page
    const chunkSize = 5;
    for (let i = 0; i < remainingStudents.length; i += chunkSize) {
      if (i > 0) {
        documentChildren.push(
          new Paragraph({
            children: [new PageBreak()],
            spacing: { before: 0, after: 0 },
          })
        );
      }
      const chunk = remainingStudents.slice(i, i + chunkSize);
      chunk.forEach((student, idx) => {
        const globalIdx = 4 + i + idx;
        const cardElements = buildStudentCardDocx(student, globalIdx + 1, idx === 0);
        documentChildren.push(...cardElements);
      });
    }
  }

  // ================= FINAL PAGE: SIGNATURE & KETERANGAN =================
  // Break to Final Page for Signature & Legend (matching PDF page 3)
  documentChildren.push(
    new Paragraph({
      children: [new PageBreak()],
      spacing: { before: 0, after: 0 },
    })
  );

  // Signature Block right aligned
  documentChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Pangkalpinang, 30 September 2025",
          font: "Times New Roman",
          size: 21,
        }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 100, after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Ustadz/ah Pembimbing,",
          font: "Times New Roman",
          size: 21,
        }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 680 }, // Gap for manual or signed signature
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: mentorName ? `( ${mentorName} )` : "( ..................................................... )",
          font: "Times New Roman",
          size: 21,
          bold: Boolean(mentorName),
        }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 300 },
    })
  );

  // Keterangan Legend Table matching PDF 2 Page 3
  const keteranganTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Keterangan :",
                    bold: true,
                    font: "Times New Roman",
                    size: 19,
                  }),
                ],
              }),
            ],
            borders: {
              top: border,
              bottom: border,
              left: border,
              right: border,
            },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
          }),
        ],
      }),
      new TableRow({
        children: [
          // Left side: Grades range
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "A : 90 – 100",
                    font: "Times New Roman",
                    size: 18,
                  }),
                ],
                spacing: { after: 20 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "B : 75 – 89",
                    font: "Times New Roman",
                    size: 18,
                  }),
                ],
                spacing: { after: 20 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "C : 60 – 74",
                    font: "Times New Roman",
                    size: 18,
                  }),
                ],
              }),
            ],
            borders: {
              top: border,
              bottom: border,
              left: border,
              right: border,
            },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
          }),
          // Right side: Criteria explanations
          new TableCell({
            width: { size: 80, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Usaha", font: "Times New Roman", size: 18 }),
                  new TextRun({
                    text: "\t: Ikhtiar yang dilakukan siswa untuk menghafal dan setoran.",
                    font: "Times New Roman",
                    size: 18,
                  }),
                ],
                tabStops: [{ type: TabStopType.LEFT, position: 950 }],
                spacing: { after: 20 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Proses", font: "Times New Roman", size: 18 }),
                  new TextRun({
                    text: "\t: Teknis ketika siswa setoran ke pembimbing TnT dan penguji.",
                    font: "Times New Roman",
                    size: 18,
                  }),
                ],
                tabStops: [{ type: TabStopType.LEFT, position: 950 }],
                spacing: { after: 20 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Capaian", font: "Times New Roman", size: 18 }),
                  new TextRun({
                    text: "\t: Hasil dari ETTQ",
                    font: "Times New Roman",
                    size: 18,
                  }),
                ],
                tabStops: [{ type: TabStopType.LEFT, position: 950 }],
                spacing: { after: 20 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Deskripsi", font: "Times New Roman", size: 18 }),
                  new TextRun({
                    text: `\t: ${subjectMeta.descNote || `Keadaan reel siswa dalam pembelajaran ${subjectMeta.shortTitle} (apa saja yang harus diperbaiki)`}`,
                    font: "Times New Roman",
                    size: 18,
                  }),
                ],
                tabStops: [{ type: TabStopType.LEFT, position: 950 }],
              }),
            ],
            borders: {
              top: border,
              bottom: border,
              left: border,
              right: border,
            },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
          }),
        ],
      }),
    ],
  });

  documentChildren.push(keteranganTable);

  // 5. Build Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 570, // ~1 cm
              bottom: 570, // ~1 cm
              left: 720, // ~0.5 inch / 1.27 cm
              right: 720,
            },
          },
        },
        children: documentChildren,
      },
    ],
  });

  // 6. Pack document as .docx blob
  const blob = await Packer.toBlob(doc);
  const safeSubName = subjectMeta.shortTitle.replace(/[^a-zA-Z0-9]/g, "_");
  const safeHalaqohName = halaqoh.name.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `Raport_ETTQ_${safeSubName}_${safeHalaqohName}.docx`;

  return { blob, fileName };
}

/**
 * Export a single subject report to .docx and trigger browser download
 */
export async function exportHalaqohToWord(
  halaqoh: Halaqoh,
  subjectMeta: (typeof KEISLAMAN_SUBJECTS)[0],
  allStudents: Student[],
  grades: Grade[],
  teachers: Teacher[],
  descFontSize: string = "9.5pt"
): Promise<void> {
  const { blob, fileName } = await generateHalaqohWordBlob(
    halaqoh,
    subjectMeta,
    allStudents,
    grades,
    teachers,
    descFontSize
  );
  triggerBrowserDownload(blob, fileName);
}

/**
 * Export all 4 subject reports bundled into a single .zip file.
 * This avoids the browser's "multiple file download permission" popup entirely!
 */
export async function exportAllHalaqohToZip(
  halaqoh: Halaqoh,
  allStudents: Student[],
  grades: Grade[],
  teachers: Teacher[],
  descFontSize: string = "9.5pt",
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();
  const folderName = `Raport_Word_${halaqoh.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const zipFolder = zip.folder(folderName) || zip;

  for (let i = 0; i < KEISLAMAN_SUBJECTS.length; i++) {
    const subjectMeta = KEISLAMAN_SUBJECTS[i];
    if (onProgress) {
      onProgress(i + 1, KEISLAMAN_SUBJECTS.length);
    }
    const { blob, fileName } = await generateHalaqohWordBlob(
      halaqoh,
      subjectMeta,
      allStudents,
      grades,
      teachers,
      descFontSize
    );
    zipFolder.file(fileName, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const safeHalaqohName = halaqoh.name.replace(/[^a-zA-Z0-9]/g, "_");
  triggerBrowserDownload(zipBlob, `Semua_Raport_Word_${safeHalaqohName}.zip`);
}
