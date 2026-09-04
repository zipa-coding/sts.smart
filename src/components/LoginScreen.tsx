import React, { useState } from "react";
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
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Teacher } from "../types";
import SmpIslamSmartLogo from "./SmpIslamSmartLogo";

interface LoginScreenProps {
  onLoginSuccess: (user: Teacher) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  // Main Tab: "school_login" (Masuk Sistem Sekolah) or "register_school" (Daftar Sekolah Baru)
  const [activeTab, setActiveTab] = useState<"school_login" | "register_school">("school_login");

  // School Login States
  const [schoolInput, setSchoolInput] = useState("");
  const [schoolPassword, setSchoolPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Optional: Personal Teacher Login Toggle
  const [showTeacherLogin, setShowTeacherLogin] = useState(false);
  const [teacherUsername, setTeacherUsername] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);

  // School Registration Form States
  const [regSchoolName, setRegSchoolName] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regNpsn, setRegNpsn] = useState("");
  const [regAdminName, setRegAdminName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");

  // Feedback States
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Handler: Masuk dengan Nama Sekolah & Kata Sandi Sekolah
  const handleSchoolLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanName = schoolInput.trim();
    const cleanPass = schoolPassword.trim();

    if (!cleanName) {
      setError("Silakan masukkan nama sekolah yang sudah terdaftar.");
      return;
    }
    if (!cleanPass) {
      setError("Silakan masukkan kata sandi sekolah.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/schools/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: cleanName,
          password: cleanPass,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal masuk ke sistem sekolah.");
      }

      setSuccessMsg(`Berhasil masuk ke portal ${data.school.name}!`);
      setTimeout(() => {
        onLoginSuccess(data.user);
      }, 500);
    } catch (err: any) {
      setError(err.message || "Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  // Handler: Masuk dengan Akun Guru Pribadi
  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanUser = teacherUsername.trim();
    const cleanPass = teacherPassword.trim();

    if (!cleanUser) {
      setError("Silakan masukkan username guru.");
      return;
    }
    if (!cleanPass) {
      setError("Silakan masukkan kata sandi.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUser,
          password: cleanPass,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Username atau kata sandi tidak sesuai.");
      }

      setSuccessMsg(`Selamat datang, ${data.name}!`);
      setTimeout(() => {
        onLoginSuccess(data);
      }, 500);
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
        `Sekolah "${data.school.name}" berhasil didaftarkan! Membuka portal kosong...`
      );

      setTimeout(() => {
        const adminUser = data.user || data.admin;
        if (adminUser) {
          onLoginSuccess(adminUser);
        } else {
          setActiveTab("school_login");
          setSchoolInput(data.school.name);
          setSchoolPassword(regPassword);
        }
      }, 800);
    } catch (err: any) {
      setError(err.message || "Gagal mendaftarkan sekolah.");
      setLoading(false);
    }
  };

  // Helper quick fill for SMP ISLAM SMART
  const fillDefaultSchool = () => {
    setSchoolInput("SMP ISLAM SMART PANGKALPINANG");
    setSchoolPassword("SMART01PKP");
    setError("");
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
          {/* Logo */}
          <div className="mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-3 p-1.5 shadow-lg ring-1 ring-blue-400/20">
            <SmpIslamSmartLogo
              size="100%"
              schoolName={schoolInput || "SMP ISLAM SMART PANGKALPINANG"}
            />
          </div>

          <h1 className="text-lg font-extrabold tracking-tight text-white uppercase font-sans">
            PORTAL SISTEM RAPORT
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Sistem Informasi Penilaian & Raport Digital Terpadu
          </p>

          {/* Tab Switcher */}
          <div
            className="flex items-center mt-5 bg-[#080d19] p-1 rounded-xl border border-[#1e2e4a]"
            id="auth-mode-tabs"
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab("school_login");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "school_login"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="tab-login"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Portal Sekolah</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register_school");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
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

          {/* ================= TAB 1: MASUK PORTAL SEKOLAH ================= */}
          {activeTab === "school_login" && (
            <div className="space-y-4">
              {!showTeacherLogin ? (
                <form
                  onSubmit={handleSchoolLogin}
                  className="space-y-4"
                  id="school-login-form"
                >
                  <div className="p-3 bg-[#080d19] border border-blue-500/20 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
                    <Building2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold text-slate-200 block">
                        Akses Portal Sekolah Terdaftar
                      </span>
                      Cukup ketikkan nama sekolah yang sudah terdaftar beserta kata sandinya untuk langsung masuk. Sistem otomatis mengenali berbagai variasi tulisan.
                    </div>
                  </div>

                  {/* Input: Nama Sekolah */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 font-mono flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Nama Sekolah Terdaftar</span>
                      </span>
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
                      Mengenali variasi tulisan (contoh: SMP ISLAM SMART, huruf kecil/besar, atau singkatan).
                    </p>
                  </div>

                  {/* Input: Kata Sandi Sekolah */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 font-mono flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-blue-400" />
                      <span>Kata Sandi Sekolah</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={schoolPassword}
                        onChange={(e) => setSchoolPassword(e.target.value)}
                        placeholder="Masukkan kata sandi (contoh: SMART01PKP)"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition font-medium"
                        id="school-password-input"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                        title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quick preset badge */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={fillDefaultSchool}
                      className="w-full py-2 px-3 rounded-lg bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/30 text-[11px] text-blue-300 font-medium transition flex items-center justify-between cursor-pointer group"
                      id="quick-fill-btn"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
                        <span className="truncate">
                          Contoh Terdaftar: <strong>SMP ISLAM SMART PANGKALPINANG</strong> (Sandi: SMART01PKP)
                        </span>
                      </span>
                      <span className="text-[10px] bg-blue-600/30 px-1.5 py-0.5 rounded text-blue-200 shrink-0 ml-1">
                        Isi Otomatis
                      </span>
                    </button>
                  </div>

                  {/* Tombol Masuk */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold font-mono tracking-wider shadow-lg shadow-blue-950/60 border border-blue-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
                    id="school-login-button"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>MASUK KE SISTEM RAPORT</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  {/* Toggle Teacher Personal Login */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setShowTeacherLogin(true)}
                      className="text-xs text-slate-400 hover:text-blue-400 transition cursor-pointer underline decoration-dotted underline-offset-4"
                    >
                      Atau masuk dengan akun Guru / Username Pengguna
                    </button>
                  </div>
                </form>
              ) : (
                /* Fallback: Guru Login with username & password */
                <form
                  onSubmit={handleTeacherLogin}
                  className="space-y-4"
                  id="teacher-login-form"
                >
                  <div className="p-3 bg-[#080d19] border border-indigo-500/20 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
                    <User className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold text-slate-200 block">
                        Masuk dengan Akun Guru Spesifik
                      </span>
                      Gunakan username dan kata sandi akun guru Anda untuk langsung masuk ke portal mata pelajaran Anda.
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 font-mono flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Username Pengguna</span>
                    </label>
                    <input
                      type="text"
                      value={teacherUsername}
                      onChange={(e) => setTeacherUsername(e.target.value)}
                      placeholder="Masukkan username akun..."
                      className="w-full px-3.5 py-2.5 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition font-medium"
                      id="teacher-username-input"
                      autoComplete="username"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 font-mono flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Kata Sandi</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showTeacherPassword ? "text" : "password"}
                        value={teacherPassword}
                        onChange={(e) => setTeacherPassword(e.target.value)}
                        placeholder="Masukkan kata sandi..."
                        className="w-full pl-3.5 pr-10 py-2.5 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition font-medium"
                        id="teacher-password-input"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showTeacherPassword ? (
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
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold font-mono tracking-wider shadow-lg shadow-indigo-950/60 border border-indigo-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
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

                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => setShowTeacherLogin(false)}
                      className="text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    >
                      ← Kembali ke Masuk dengan Nama Sekolah
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ================= TAB 2: DAFTAR SEKOLAH BARU ================= */}
          {activeTab === "register_school" && (
            <form
              onSubmit={handleRegisterSchoolSubmit}
              className="space-y-3.5"
              id="register-school-form"
            >
              <div className="p-3 bg-[#080d19] border border-indigo-500/20 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-slate-200 block">
                    Pendaftaran Sekolah Mandiri
                  </span>
                  Setelah mendaftar, Anda akan langsung masuk ke website sekolah baru dalam keadaan data kosong, sehingga Admin Sekolah dapat menginputkan guru, siswa, dan logo sekolah masing-masing.
                </div>
              </div>

              {/* Nama Sekolah */}
              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1 font-mono flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Nama Lengkap Sekolah *</span>
                </label>
                <input
                  type="text"
                  required
                  value={regSchoolName}
                  onChange={(e) => setRegSchoolName(e.target.value)}
                  placeholder="Contoh: SMP IT INSAN CENDEKIA"
                  className="w-full px-3.5 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition font-medium"
                  id="reg-school-name"
                />
              </div>

              {/* Kota & NPSN */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1 font-mono flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Kota / Kab</span>
                  </label>
                  <input
                    type="text"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="Contoh: Pangkalpinang"
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
                    id="reg-school-city"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1 font-mono flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-indigo-400" />
                    <span>NPSN (Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={regNpsn}
                    onChange={(e) => setRegNpsn(e.target.value)}
                    placeholder="Contoh: 10987654"
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
                    id="reg-school-npsn"
                  />
                </div>
              </div>

              {/* Nama Admin & Username */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1 font-mono">
                    Nama Admin Sekolah
                  </label>
                  <input
                    type="text"
                    value={regAdminName}
                    onChange={(e) => setRegAdminName(e.target.value)}
                    placeholder="Nama Lengkap Admin"
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
                    id="reg-admin-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1 font-mono">
                    Username Login *
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Username admin"
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
                    id="reg-admin-username"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Sandi & Konfirmasi Sandi */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1 font-mono">
                    Kata Sandi *
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimal 3 karakter"
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
                    id="reg-admin-password"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1 font-mono">
                    Ulangi Sandi *
                  </label>
                  <input
                    type="password"
                    required
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    placeholder="Ketik ulang sandi"
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
                    id="reg-admin-password-confirm"
                    autoComplete="new-password"
                  />
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
                    <span>DAFTAR & MASUK KE SISTEM</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
