/**
 * Menggabungkan deskripsi nilai lama dan baru secara aman agar deskripsi siswa
 * tidak pernah tertimpa atau hilang secara tidak sengaja.
 *
 * Aturan:
 * 1. Jika deskripsiBaru undefined atau null, kembalikan deskripsiLama.
 * 2. Jika deskripsiBaru kosong ("" / hanya spasi) dan deskripsiLama berisi teks,
 *    kembalikan deskripsiLama kecuali izinKosongkan === true.
 * 3. Selain itu kembalikan deskripsiBaru.
 */
export function mergeDeskripsiAman(
  deskripsiLama: string | undefined,
  deskripsiBaru: string | undefined,
  izinKosongkan: boolean
): string {
  const lama = deskripsiLama ?? "";

  if (deskripsiBaru === undefined || deskripsiBaru === null) {
    return lama;
  }

  if (deskripsiBaru.trim() === "" && lama.trim() !== "") {
    if (izinKosongkan === true) {
      return deskripsiBaru;
    }
    return lama;
  }

  return deskripsiBaru;
}
