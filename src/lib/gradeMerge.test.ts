import { mergeDeskripsiAman, tentukanDeskripsiAwalForm } from "./gradeMerge";

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `[FAIL] ${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

export function runGradeMergeTests(): { passed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0;

  // =========================================================================
  // KASUS 1: deskripsiBaru undefined (atau null) -> kembalikan deskripsiLama
  // =========================================================================
  assertEqual(
    mergeDeskripsiAman("Alhamdulillah ananda tuntas.", undefined, false),
    "Alhamdulillah ananda tuntas.",
    "Kasus 1a: deskripsiBaru undefined mengembalikan deskripsiLama"
  );
  assertEqual(
    mergeDeskripsiAman("Alhamdulillah ananda tuntas.", undefined, true),
    "Alhamdulillah ananda tuntas.",
    "Kasus 1b: deskripsiBaru undefined tetap mengembalikan deskripsiLama meski izinKosongkan true"
  );
  assertEqual(
    mergeDeskripsiAman("Alhamdulillah ananda tuntas.", null as unknown as undefined, false),
    "Alhamdulillah ananda tuntas.",
    "Kasus 1c: deskripsiBaru null mengembalikan deskripsiLama"
  );
  assertEqual(
    mergeDeskripsiAman(undefined, undefined, false),
    "",
    "Kasus 1d: deskripsiLama dan deskripsiBaru sama-sama undefined mengembalikan string kosong"
  );
  passed += 4;
  details.push("PASS: Kasus 1 (deskripsiBaru undefined/null mengembalikan deskripsiLama)");

  // =========================================================================
  // KASUS 2: deskripsiBaru kosong ("" / spasi) menimpa teks lama dengan izinKosongkan=false (DITOLAK)
  // =========================================================================
  assertEqual(
    mergeDeskripsiAman("Ananda menunjukkan pemahaman sangat baik.", "", false),
    "Ananda menunjukkan pemahaman sangat baik.",
    "Kasus 2a: deskripsiBaru '' ditolak menimpa deskripsiLama saat izinKosongkan=false"
  );
  assertEqual(
    mergeDeskripsiAman("Ananda menunjukkan pemahaman sangat baik.", "   ", false),
    "Ananda menunjukkan pemahaman sangat baik.",
    "Kasus 2b: deskripsiBaru berisi spasi saja ditolak menimpa deskripsiLama saat izinKosongkan=false"
  );
  passed += 2;
  details.push("PASS: Kasus 2 (deskripsiBaru kosong menimpa teks lama ditolak jika izinKosongkan=false)");

  // =========================================================================
  // KASUS 3: deskripsiBaru kosong dengan izinKosongkan=true (DITERIMA)
  // =========================================================================
  assertEqual(
    mergeDeskripsiAman("Ananda menunjukkan pemahaman sangat baik.", "", true),
    "",
    "Kasus 3a: deskripsiBaru '' diterima saat izinKosongkan=true"
  );
  assertEqual(
    mergeDeskripsiAman("Ananda menunjukkan pemahaman sangat baik.", "   ", true),
    "   ",
    "Kasus 3b: deskripsiBaru spasi diterima saat izinKosongkan=true"
  );
  passed += 2;
  details.push("PASS: Kasus 3 (deskripsiBaru kosong diterima jika izinKosongkan=true)");

  // =========================================================================
  // KASUS 4: Teks baru menggantikan teks lama
  // =========================================================================
  assertEqual(
    mergeDeskripsiAman(
      "Deskripsi lama semester lalu.",
      "Alhamdulillah ananda menguasai materi bab 1 hingga bab 3.",
      false
    ),
    "Alhamdulillah ananda menguasai materi bab 1 hingga bab 3.",
    "Kasus 4a: Teks baru menggantikan teks lama (izinKosongkan=false)"
  );
  assertEqual(
    mergeDeskripsiAman(
      "Deskripsi lama semester lalu.",
      "Alhamdulillah ananda menguasai materi bab 1 hingga bab 3.",
      true
    ),
    "Alhamdulillah ananda menguasai materi bab 1 hingga bab 3.",
    "Kasus 4b: Teks baru menggantikan teks lama (izinKosongkan=true)"
  );
  passed += 2;
  details.push("PASS: Kasus 4 (Teks baru menggantikan teks lama)");

  // =========================================================================
  // KASUS 5: Deskripsi lama kosong dan deskripsi baru berisi
  // =========================================================================
  assertEqual(
    mergeDeskripsiAman("", "Ananda aktif bertanya di kelas.", false),
    "Ananda aktif bertanya di kelas.",
    "Kasus 5a: deskripsiLama '' dan deskripsiBaru berisi teks"
  );
  assertEqual(
    mergeDeskripsiAman(undefined, "Ananda aktif bertanya di kelas.", false),
    "Ananda aktif bertanya di kelas.",
    "Kasus 5b: deskripsiLama undefined dan deskripsiBaru berisi teks"
  );
  assertEqual(
    mergeDeskripsiAman("   ", "Ananda aktif bertanya di kelas.", false),
    "Ananda aktif bertanya di kelas.",
    "Kasus 5c: deskripsiLama spasi dan deskripsiBaru berisi teks"
  );
  passed += 3;
  details.push("PASS: Kasus 5 (Deskripsi lama kosong dan deskripsi baru berisi teks)");

  // =========================================================================
  // KASUS 6: Kondisi "kosong sengaja" (tentukanDeskripsiAwalForm)
  // (a) Deskripsi kosong dan penanda true -> tetap kosong, isCustomDescActive=true
  // (b) Deskripsi kosong dan penanda tidak ada / false -> teks otomatis, isCustomDescActive=false
  // (c) Deskripsi berisi teks -> teks dari dokumen
  // =========================================================================
  const teksOtomatis = "Alhamdulillah, ananda Ahmad menunjukkan penguasaan optimal.";

  // (a) Deskripsi kosong dan penanda true (kosong sengaja)
  const hasilKosongSengaja = tentukanDeskripsiAwalForm("", true, teksOtomatis);
  assertEqual(
    hasilKosongSengaja.customDescription,
    "",
    "Kasus 6a-1: deskripsi '' dan deskripsiDikosongkan=true menghasilkan customDescription=''"
  );
  assertEqual(
    hasilKosongSengaja.isCustomDescActive,
    true,
    "Kasus 6a-2: deskripsi '' dan deskripsiDikosongkan=true menghasilkan isCustomDescActive=true"
  );

  // (b) Deskripsi kosong dan penanda tidak ada (undefined / false) -> teks otomatis
  const hasilTanpaPenanda = tentukanDeskripsiAwalForm("", undefined, teksOtomatis);
  assertEqual(
    hasilTanpaPenanda.customDescription,
    teksOtomatis,
    "Kasus 6b-1: deskripsi '' dan deskripsiDikosongkan=undefined menghasilkan teks otomatis"
  );
  assertEqual(
    hasilTanpaPenanda.isCustomDescActive,
    false,
    "Kasus 6b-2: deskripsi '' dan deskripsiDikosongkan=undefined menghasilkan isCustomDescActive=false"
  );

  const hasilPenandaFalse = tentukanDeskripsiAwalForm("", false, teksOtomatis);
  assertEqual(
    hasilPenandaFalse.customDescription,
    teksOtomatis,
    "Kasus 6b-3: deskripsi '' dan deskripsiDikosongkan=false menghasilkan teks otomatis"
  );
  assertEqual(
    hasilPenandaFalse.isCustomDescActive,
    false,
    "Kasus 6b-4: deskripsi '' dan deskripsiDikosongkan=false menghasilkan isCustomDescActive=false"
  );

  // (c) Deskripsi berisi teks -> teks dari dokumen
  const teksDokumenManual = "Ananda Ahmad sangat tekun menghafal dan memahami materi.";
  const hasilTeksDokumen = tentukanDeskripsiAwalForm(teksDokumenManual, false, teksOtomatis);
  assertEqual(
    hasilTeksDokumen.customDescription,
    teksDokumenManual,
    "Kasus 6c-1: deskripsi berisi teks menghasilkan teks dari dokumen"
  );
  assertEqual(
    hasilTeksDokumen.isCustomDescActive,
    true,
    "Kasus 6c-2: deskripsi manual yang berbeda dari teks otomatis menghasilkan isCustomDescActive=true"
  );

  const hasilTeksDokumenSamaOtomatis = tentukanDeskripsiAwalForm(teksOtomatis, false, teksOtomatis);
  assertEqual(
    hasilTeksDokumenSamaOtomatis.customDescription,
    teksOtomatis,
    "Kasus 6c-3: deskripsi sama dengan teks otomatis tetap menghasilkan teks dari dokumen"
  );
  assertEqual(
    hasilTeksDokumenSamaOtomatis.isCustomDescActive,
    false,
    "Kasus 6c-4: deskripsi sama dengan teks otomatis menghasilkan isCustomDescActive=false"
  );

  passed += 10;
  details.push(
    "PASS: Kasus 6 (tentukanDeskripsiAwalForm: kosong sengaja -> '', tanpa penanda -> teks otomatis, berisi teks -> teks dokumen)"
  );

  return { passed, details };
}

// Allow direct CLI execution via tsx
if (typeof process !== "undefined" && process.argv?.[1]?.includes("gradeMerge.test")) {
  const result = runGradeMergeTests();
  for (const line of result.details) {
    console.log(line);
  }
  console.log(`Total assertions passed: ${result.passed}`);
}

