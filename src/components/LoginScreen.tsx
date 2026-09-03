import React, { useState, useEffect } from "react";
import {
  LogIn,
  ShieldAlert,
  Key,
  User,
  PlusCircle,
  Building2,
  CheckCircle2,
  MapPin,
  Hash,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { Teacher } from "../types";
import SmpIslamSmartLogo from "./SmpIslamSmartLogo";

interface RegisteredSchool {
  id: string;
  name: string;
  npsn?: string;
  city?: string;
  adminUsername?: string;
}

interface LoginScreenProps {
  onLoginSuccess: (user: Teacher) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  // Main Tab: "login" or "register_school"
  const [activeTab, setActiveTab] = useState<"login" | "register_school">("login");

  // School step states: user manually types school name and school password
  const [activeSchool, setActiveSchool] = useState<RegisteredSchool | null>(null);
  const [schoolInput, setSchoolInput] = useState("");
  const [schoolPassword, setSchoolPassword] = useState("");
  const [showSchoolPassword, setShowSchoolPassword] = useState(false);
  const [verifyingSchool, setVerifyingSchool] = useState(false);

  // User selection within active verified school
  // Role tab: "guru" (pilih nama guru) or "admin" (admin pengatur data)
  const [roleTab, setRoleTab] = useState<"guru" | "admin">("guru");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [teacherPassword, setTeacherPassword] = useState("");

  // Admin login states
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // UI helpers
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // School registration form state
  const [regSchoolName, setRegSchoolName] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regNpsn, setRegNpsn] = useState("");
  const [regAdminName, setRegAdminName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");

  // Load teachers whenever activeSchool is set
  useEffect(() => {
    if (!activeSchool) {
      setTeachers([]);
      setSelectedTeacherId("");
      return;
    }

    fetch(`/api/teachers?schoolId=${encodeURIComponent(activeSchool.id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTeachers(data);
          // Filter teachers excluding admin
          const nonAdminTeachers = data.filter(
            (t) =>
              t.subject?.toLowerCase() !== "admin" &&
              t.username?.toLowerCase() !== "admin"
          );
          if (nonAdminTeachers.length > 0) {
            setSelectedTeacherId(nonAdminTeachers[0].id);
          } else {
            setSelectedTeacherId("");
          }
        }
      })
      .catch((err) => {
        console.error("Gagal memuat daftar guru untuk sekolah", err);
      });
  }, [activeSchool]);

  // List of teachers excluding Admin (admin manages school data separately)
  const availableTeachers = teachers.filter(
    (t) =>
      t.subject?.toLowerCase() !== "admin" &&
      t.username?.toLowerCase() !== "admin"
  );

  const currentSelectedTeacher = availableTeachers.find(
    (t) => t.id === selectedTeacherId
  );

  // Handler: Verifikasi Sekolah Mandiri (Nama Sekolah + Kata Sandi Sekolah)
  const handleVerifySchool = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanName = schoolInput.trim();
    const cleanPass = schoolPassword.trim();

    if (!cleanName) {
      setError("Silakan ketikkan nama sekolah sesuai yang didaftarkan.");
      return;
    }
    if (!cleanPass) {
      setError("Silakan masukkan kata sandi sekolah untuk membuka data sekolah.");
      return;
    }

    setVerifyingSchool(true);

    try {
      const response = await fetch("/api/schools/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: cleanName,
          password: cleanPass,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nama sekolah atau kata sandi salah.");
      }

      setActiveSchool(data.school);
      setSchoolInput(data.school.name);
      setSchoolPassword("");
      setError("");
      setTeacherPassword("");
      setAdminPassword("");
      setRoleTab("guru");
      setSuccessMsg(`Portal ${data.school.name} berhasil diverifikasi.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError(err.message || "Gagal memverifikasi sekolah.");
    } finally {
      setVerifyingSchool(false);
    }
  };

  // Handler: Ganti Sekolah / Keluar dari Sesi Sekolah
  const handleSwitchSchool = () => {
    setActiveSchool(null);
    setSelectedTeacherId("");
    setTeachers([]);
    setError("");
    setSuccessMsg("");
    setTeacherPassword("");
    setAdminPassword("");
    setSchoolPassword("");
  };

  // Handler: Login sebagai Guru (Pilih nama guru yang terdaftar)
  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!activeSchool) {
      setError("Silakan masukkan dan verifikasi nama sekolah terlebih dahulu.");
      return;
    }

    if (!currentSelectedTeacher) {
      setError("Silakan pilih salah satu nama guru yang terdaftar.");
      return;
    }

    if (!teacherPassword) {
      setError("Kata sandi guru harus diisi.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentSelectedTeacher.username,
          password: teacherPassword,
          schoolId: activeSchool.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kata sandi guru tidak sesuai.");
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || "Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  // Handler: Login sebagai Administrator Sekolah (Pengatur Data)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!activeSchool) {
      setError("Silakan masukkan dan verifikasi nama sekolah terlebih dahulu.");
      return;
    }

    if (!adminUsername.trim() || !adminPassword) {
      setError("Username dan kata sandi administrator harus diisi.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword,
          schoolId: activeSchool.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kombinasi username atau kata sandi admin salah.");
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || "Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  // Handler: Pendaftaran Sekolah Baru
  const handleRegisterSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!regSchoolName.trim()) {
      setError("Nama lengkap sekolah harus diisi.");
      return;
    }
    if (!regUsername.trim()) {
      setError("Username login admin sekolah harus diisi.");
      return;
    }
    if (!regPassword) {
      setError("Kata sandi admin harus diisi.");
      return;
    }
    if (regPassword.length < 3) {
      setError("Kata sandi minimal 3 karakter.");
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/schools/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: regSchoolName.trim(),
          city: regCity.trim(),
          npsn: regNpsn.trim(),
          adminName: regAdminName.trim() || `Admin ${regSchoolName.trim()}`,
          username: regUsername.trim(),
          password: regPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal mendaftarkan sekolah baru.");
      }

      setSuccessMsg(
        `Sekolah "${data.school.name}" berhasil didaftarkan! Menyiapkan dashboard...`
      );

      setTimeout(() => {
        onLoginSuccess(data.admin);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Gagal mendaftarkan sekolah.");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[#070b14] px-4 py-8 relative overflow-hidden"
      id="login-container"
    >
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-32 w-80 h-80 bg-blue-900/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-indigo-900/15 rounded-full blur-3xl pointer-events-none"></div>

      <div
        className="w-full max-w-lg bg-[#0d1527] rounded-2xl shadow-2xl border border-[#1e2e4a] overflow-hidden relative z-10"
        id="login-card"
      >
        {/* Header Section */}
        <div className="bg-gradient-to-b from-[#111c34] to-[#0d1527] px-6 pt-7 pb-5 text-center text-white relative border-b border-[#1e2e4a]">
          {/* Logo or School Badge */}
          <div className="mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-3 p-1.5 shadow-lg ring-1 ring-blue-400/20">
            {activeSchool?.id === "smp-islam-smart" || !activeSchool ? (
              <SmpIslamSmartLogo size="100%" />
            ) : (
              <div className="w-full h-full rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            )}
          </div>

          <h1 className="text-lg font-extrabold tracking-tight text-white uppercase">
            PORTAL SISTEM RAPORT
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Sistem Informasi Penilaian & Raport Digital Terpadu
          </p>

          {/* Tab Switcher: Masuk vs Daftar Sekolah */}
          <div
            className="flex items-center mt-5 bg-[#080d19] p-1 rounded-xl border border-[#1e2e4a]"
            id="auth-mode-tabs"
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "login"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="tab-login"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Portal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register_school");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "register_school"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="tab-register-school"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Daftar Sekolah Baru</span>
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-7">
          {/* Alert Error */}
          {error && (
            <div
              className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start gap-2.5 mb-4 animate-fade-in"
              id="login-error"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Alert Success */}
          {successMsg && (
            <div
              className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5 mb-4 animate-fade-in"
              id="login-success"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div className="flex-1 leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* ================= TAB 1: MASUK PORTAL ================= */}
          {activeTab === "login" && (
            <div className="space-y-5">
              {/* STEP 1: PENGGUNA MENGISI SENDIRI NAMA SEKOLAH BESERTA KATA SANDINYA (KEAMANAN DATA TINGGI) */}
              {!activeSchool ? (
                <form
                  onSubmit={handleVerifySchool}
                  className="space-y-4"
                  id="school-verification-form"
                >
                  <div className="p-3 bg-[#080d19] border border-blue-500/20 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold text-slate-200 block">
                        Keamanan Akses Data Sekolah
                      </span>
                      Silakan masukkan nama resmi sekolah beserta kata sandi yang telah didaftarkan untuk membuka akses portal guru dan admin.
                    </div>
                  </div>

                  {/* Input 1: Nama Sekolah */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 font-mono flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-400" />
                      <span>Nama Sekolah (Sesuai yang Didaftarkan)</span>
                    </label>
                    <input
                      type="text"
                      value={schoolInput}
                      onChange={(e) => setSchoolInput(e.target.value)}
                      placeholder="Contoh: SMP ISLAM SMART PANGKALPINANG"
                      className="w-full px-3.5 py-2.5 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition font-medium"
                      id="school-name-input"
                      autoComplete="off"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Ketikkan nama sekolah persis sesuai nama saat registrasi.
                    </p>
                  </div>

                  {/* Input 2: Kata Sandi Sekolah */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 font-mono flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-blue-400" />
                      <span>Kata Sandi Sekolah</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showSchoolPassword ? "text" : "password"}
                        value={schoolPassword}
                        onChange={(e) => setSchoolPassword(e.target.value)}
                        placeholder="Masukkan kata sandi sekolah..."
                        className="w-full pl-3.5 pr-10 py-2.5 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition font-medium"
                        id="school-password-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSchoolPassword(!showSchoolPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                        title={showSchoolPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                      >
                        {showSchoolPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Kata sandi akses sekolah / sandi akun admin sekolah.
                    </p>
                  </div>

                  {/* Helper Petunjuk Uji Coba */}
                  <div className="text-[11px] text-slate-400 bg-[#080d19]/60 px-3 py-2 rounded-lg border border-[#15233c]">
                    <span className="text-blue-400 font-semibold">Petunjuk: </span>
                    Untuk sekolah bawaan, masukkan nama{" "}
                    <span className="font-mono text-slate-200 font-bold">
                      SMP ISLAM SMART PANGKALPINANG
                    </span>{" "}
                    dengan sandi{" "}
                    <span className="font-mono text-slate-200 font-bold">123</span>.
                  </div>

                  {/* Tombol Lanjut Buka Akun Sekolah */}
                  <button
                    type="submit"
                    disabled={verifyingSchool}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold font-mono tracking-wider shadow-lg shadow-blue-950/60 border border-blue-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-3"
                    id="connect-school-button"
                  >
                    {verifyingSchool ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>BUKA PORTAL SEKOLAH</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* STEP 2: SETELAH BERHASIL LOGIN DI AKUN SEKOLAH YANG BENAR */
                <div className="space-y-4" id="active-school-login-section">
                  {/* Banner Sekolah Terverifikasi & Tombol Ganti Sekolah */}
                  <div className="p-3.5 bg-gradient-to-r from-blue-950/70 to-indigo-950/70 border border-blue-500/40 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono text-blue-300 uppercase tracking-wider font-semibold">
                          Akun Sekolah Terverifikasi
                        </div>
                        <div className="text-xs font-bold text-white truncate">
                          {activeSchool.name}
                        </div>
                        {activeSchool.city && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{activeSchool.city}</span>
                            {activeSchool.npsn && (
                              <span>&bull; NPSN: {activeSchool.npsn}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSwitchSchool}
                      className="px-2.5 py-1.5 rounded-lg bg-[#080d19] border border-blue-500/30 hover:border-blue-400 text-[11px] text-blue-300 hover:text-white transition flex items-center gap-1 shrink-0 cursor-pointer"
                      title="Ganti atau masukkan nama sekolah lain"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Ganti</span>
                    </button>
                  </div>

                  {/* Tab Pilihan Peran: Guru (Pilih Akun Guru) vs Administrator (Pengatur Data) */}
                  <div className="flex items-center bg-[#080d19] p-1 rounded-xl border border-[#1e2e4a]">
                    <button
                      type="button"
                      onClick={() => {
                        setRoleTab("guru");
                        setError("");
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        roleTab === "guru"
                          ? "bg-blue-600 text-white shadow"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                      id="role-tab-guru"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Guru / Wali Kelas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRoleTab("admin");
                        setError("");
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        roleTab === "admin"
                          ? "bg-amber-600 text-white shadow"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                      id="role-tab-admin"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Administrator Sekolah</span>
                    </button>
                  </div>

                  {/* FORM 1: LOGIN GURU (PILIH DARI DAFTAR GURU TERDAFTAR KECUALI ADMIN) */}
                  {roleTab === "guru" && (
                    <form onSubmit={handleTeacherLogin} className="space-y-4 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 font-mono flex items-center justify-between">
                          <span>Pilih Nama Guru Terdaftar (Username)</span>
                          <span className="text-[10px] text-blue-400 font-normal">
                            {availableTeachers.length} Guru Siap
                          </span>
                        </label>

                        {availableTeachers.length > 0 ? (
                          <div className="space-y-2">
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <User className="h-4 w-4" />
                              </span>
                              <select
                                value={selectedTeacherId}
                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                                className="w-full pl-10 pr-8 py-2.5 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition font-medium appearance-none cursor-pointer"
                                id="teacher-select-dropdown"
                              >
                                {availableTeachers.map((teacher) => (
                                  <option
                                    key={teacher.id}
                                    value={teacher.id}
                                    className="bg-[#0c1322] text-slate-100 py-1"
                                  >
                                    {teacher.name} — Mapel {teacher.subject}
                                    {teacher.isWaliKelas && teacher.kelas
                                      ? ` (Wali Kelas ${teacher.kelas})`
                                      : ""}{" "}
                                    [Username: {teacher.username}]
                                  </option>
                                ))}
                              </select>
                              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs">
                                ▼
                              </span>
                            </div>

                            {/* Info Card Guru yang Dipilih */}
                            {currentSelectedTeacher && (
                              <div className="p-3 bg-[#080d19] border border-[#1e2e4a] rounded-xl flex items-center justify-between gap-3 text-xs">
                                <div>
                                  <div className="font-bold text-blue-300">
                                    {currentSelectedTeacher.name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span>
                                      Mapel:{" "}
                                      <strong className="text-slate-200">
                                        {currentSelectedTeacher.subject}
                                      </strong>
                                    </span>
                                    {currentSelectedTeacher.isWaliKelas && (
                                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px]">
                                        Wali Kelas {currentSelectedTeacher.kelas}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-[9px] text-slate-500 font-mono uppercase">
                                    Username
                                  </div>
                                  <div className="text-xs font-mono font-bold text-slate-200 bg-[#0d1627] px-2 py-0.5 rounded border border-[#1e2e4a]">
                                    {currentSelectedTeacher.username}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-200 space-y-2">
                            <p className="font-semibold text-amber-300">
                              Belum ada akun guru terdaftar di sekolah ini.
                            </p>
                            <p className="text-[11px] text-slate-300">
                              Karena admin bertugas mengisi dan mengatur data guru di website sekolah, silakan masuk melalui menu Administrator Sekolah untuk menambahkan data guru.
                            </p>
                            <button
                              type="button"
                              onClick={() => setRoleTab("admin")}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Masuk sebagai Administrator</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Password Guru */}
                      {availableTeachers.length > 0 && (
                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                            Kata Sandi Guru
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                              <Key className="h-4 w-4" />
                            </span>
                            <input
                              type={showPassword ? "text" : "password"}
                              value={teacherPassword}
                              onChange={(e) => setTeacherPassword(e.target.value)}
                              placeholder="Masukkan kata sandi guru..."
                              className="w-full pl-10 pr-10 py-2.5 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition font-medium"
                              id="teacher-password-input"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {availableTeachers.length > 0 && (
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold font-mono tracking-wider shadow-lg shadow-blue-950/60 border border-blue-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
                          id="teacher-login-button"
                        >
                          {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <LogIn className="w-4 h-4" />
                              <span>MASUK SEBAGAI GURU</span>
                            </>
                          )}
                        </button>
                      )}
                    </form>
                  )}

                  {/* FORM 2: LOGIN ADMINISTRATOR (BERTUGAS MENGATUR DATA) */}
                  {roleTab === "admin" && (
                    <form onSubmit={handleAdminLogin} className="space-y-4 pt-1">
                      <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-[11px] text-amber-200">
                        <div className="font-bold text-amber-300 flex items-center gap-1.5 mb-0.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Akses Pengatur & Pengelola Data</span>
                        </div>
                        Administrator bertugas mengisi dan mengatur data siswa, guru, kelas, mata pelajaran, serta konfigurasi website sekolah.
                      </div>

                      {/* Username Admin */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                          Username Administrator
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <User className="h-4 w-4" />
                          </span>
                          <input
                            type="text"
                            value={adminUsername}
                            onChange={(e) => setAdminUsername(e.target.value)}
                            placeholder="Contoh: admin..."
                            className="w-full pl-10 pr-4 py-2.5 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition font-medium"
                            id="admin-username-input"
                            autoComplete="off"
                          />
                        </div>
                      </div>

                      {/* Password Admin */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                          Kata Sandi Administrator
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Key className="h-4 w-4" />
                          </span>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="Masukkan kata sandi admin..."
                            className="w-full pl-10 pr-10 py-2.5 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition font-medium"
                            id="admin-password-input"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-xl text-xs font-bold font-mono tracking-wider shadow-lg shadow-amber-950/60 border border-amber-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
                        id="admin-login-button"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>MASUK SEBAGAI ADMINISTRATOR</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: PENDAFTARAN SEKOLAH BARU ================= */}
          {activeTab === "register_school" && (
            <form onSubmit={handleRegisterSchoolSubmit} className="space-y-3.5">
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-[11px] text-indigo-200">
                <p className="font-semibold text-indigo-300 mb-0.5 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Pendaftaran Sekolah Mandiri</span>
                </p>
                Daftarkan nama sekolah Anda untuk membuat portal penilaian terpisah. Akun administrator bertugas mengisi dan mengatur data guru, siswa, dan kelas.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Nama Lengkap Sekolah *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={regSchoolName}
                    onChange={(e) => setRegSchoolName(e.target.value)}
                    placeholder="Contoh: SMP Negeri 1 Pangkalpinang"
                    className="w-full pl-9 pr-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition font-medium"
                    id="reg-school-name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                    Kota / Kabupaten
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      placeholder="Pangkalpinang"
                      className="w-full pl-8 pr-2.5 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
                      id="reg-city"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                    NPSN (Opsional)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Hash className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      value={regNpsn}
                      onChange={(e) => setRegNpsn(e.target.value)}
                      placeholder="8 digit NPSN"
                      className="w-full pl-8 pr-2.5 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
                      id="reg-npsn"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#1e2e4a] pt-2">
                <label className="block text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-1 font-mono">
                  Akun Administrator Sekolah
                </label>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-0.5">
                      Nama Lengkap Admin
                    </label>
                    <input
                      type="text"
                      value={regAdminName}
                      onChange={(e) => setRegAdminName(e.target.value)}
                      placeholder="Contoh: Admin Sekolah / Nama Petugas"
                      className="w-full px-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
                      id="reg-admin-name"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-0.5">
                      Username Login Admin *
                    </label>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="Contoh: admin_smpn1"
                      className="w-full px-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
                      id="reg-username"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-0.5">
                        Kata Sandi *
                      </label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Kata sandi..."
                        className="w-full px-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
                        id="reg-password"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-0.5">
                        Ulangi Sandi *
                      </label>
                      <input
                        type="password"
                        value={regPasswordConfirm}
                        onChange={(e) => setRegPasswordConfirm(e.target.value)}
                        placeholder="Konfirmasi..."
                        className="w-full px-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
                        id="reg-password-confirm"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold font-mono tracking-wider shadow-lg shadow-indigo-950/60 border border-indigo-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-3"
                id="register-school-button"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>DAFTARKAN SEKOLAH</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setError("");
                  }}
                  className="text-xs text-slate-400 hover:text-slate-300 font-medium cursor-pointer"
                >
                  Sudah terdaftar? Kembali ke menu Masuk
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Clean Footer Info */}
      <div className="mt-6 text-center text-xs text-slate-500 font-medium max-w-sm">
        Sistem Manajemen Nilai & Raport Digital Terpadu
      </div>
    </div>
  );
}
