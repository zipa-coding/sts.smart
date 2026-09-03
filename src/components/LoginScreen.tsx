import React, { useState, useEffect } from "react";
import {
  LogIn,
  ShieldAlert,
  Key,
  User,
  School as SchoolIcon,
  PlusCircle,
  Building2,
  CheckCircle2,
  MapPin,
  Hash,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Teacher, School } from "../types";
import SmpIslamSmartLogo from "./SmpIslamSmartLogo";
import { PWAInstallButton } from "./PWAInstallButton";

interface LoginScreenProps {
  onLoginSuccess: (user: Teacher) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  // Mode: "login" or "register_school"
  const [activeTab, setActiveTab] = useState<"login" | "register_school">(
    "login",
  );

  // List of registered schools
  const [schools, setSchools] = useState<School[]>([
    {
      id: "smp-islam-smart",
      name: "SMP ISLAM SMART PANGKALPINANG",
      city: "Pangkalpinang",
    },
  ]);
  const [selectedSchoolId, setSelectedSchoolId] =
    useState<string>("smp-islam-smart");

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // School registration form state
  const [regSchoolName, setRegSchoolName] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regNpsn, setRegNpsn] = useState("");
  const [regAdminName, setRegAdminName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch registered schools on mount
  const loadSchools = async () => {
    try {
      const res = await fetch("/api/schools");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setSchools(data);
        // If current selectedSchoolId is not in list, fallback
        if (!data.some((s) => s.id === selectedSchoolId)) {
          setSelectedSchoolId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Gagal memuat daftar sekolah:", err);
    }
  };

  useEffect(() => {
    loadSchools();
  }, []);

  // Fetch teachers for recommendations whenever selected school changes
  useEffect(() => {
    if (!selectedSchoolId) return;
    fetch(`/api/teachers?schoolId=${encodeURIComponent(selectedSchoolId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTeachers(data);
        }
      })
      .catch((err) =>
        console.error("Gagal memuat daftar guru untuk rekomendasi", err),
      );
  }, [selectedSchoolId]);

  // Selected school object
  const activeSchool =
    schools.find((s) => s.id === selectedSchoolId) || schools[0];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username dan kata sandi harus diisi.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          schoolId: selectedSchoolId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Terjadi kesalahan saat masuk.");
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || "Gagal menghubungkan ke server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!regSchoolName.trim()) {
      setError("Nama lengkap sekolah harus diisi.");
      return;
    }
    if (!regUsername.trim()) {
      setError("Username untuk Admin sekolah harus diisi.");
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
        `Sekolah "${data.school.name}" berhasil didaftarkan! Menyiapkan dashboard mandiri...`,
      );

      // Reload schools list
      await loadSchools();

      // Automatically log the new admin in after a brief pause
      setTimeout(() => {
        onLoginSuccess(data.admin);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Gagal mendaftarkan sekolah.");
      setLoading(false);
    }
  };

  const filteredSuggestions = username.trim()
    ? teachers
        .filter((t) => {
          const query = username.toLowerCase();
          return (
            t.name.toLowerCase().includes(query) ||
            t.username.toLowerCase().includes(query)
          );
        })
        .slice(0, 5)
    : [];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[#070b14] px-4 py-8 relative overflow-hidden"
      id="login-container"
    >
      {/* Refined Deep Ambient Glows */}
      <div className="absolute top-1/4 -left-32 w-80 h-80 bg-blue-900/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-emerald-900/15 rounded-full blur-3xl pointer-events-none"></div>

      <div
        className="w-full max-w-md bg-[#0d1527] rounded-2xl shadow-2xl border border-[#1e2e4a] overflow-hidden relative z-10"
        id="login-card"
      >
        {/* Header Section with dynamic school branding */}
        <div className="bg-gradient-to-b from-[#111c34] to-[#0d1527] px-6 pt-7 pb-5 text-center text-white relative border-b border-[#1e2e4a]">
          {activeSchool?.id === "smp-islam-smart" ? (
            <div className="mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-3 p-1.5 shadow-lg ring-1 ring-blue-400/20">
              <SmpIslamSmartLogo size="100%" />
            </div>
          ) : (
            <div className="mx-auto w-16 h-16 bg-blue-950/80 border border-blue-500/40 rounded-2xl flex items-center justify-center mb-3 shadow-lg text-blue-400">
              <Building2 className="w-8 h-8" />
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-300 text-[11px] font-semibold tracking-wide mb-2 max-w-full truncate">
            <SchoolIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">
              {activeTab === "login"
                ? activeSchool?.name || "SMP ISLAM SMART PANGKALPINANG"
                : "PENDAFTARAN SEKOLAH BARU"}
            </span>
          </div>

          <h1 className="text-lg font-extrabold tracking-tight text-white uppercase">
            PORTAL RAPORT STS
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Sistem Penilaian Sumatif Tengah Semester • Kurikulum Merdeka
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
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="tab-register-school"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Daftar Sekolah</span>
              <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1 py-0.2 rounded font-mono">
                Baru
              </span>
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-7">
          {error && (
            <div
              className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start gap-2.5 mb-4"
              id="login-error"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5 mb-4"
              id="login-success"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ================= TAB 1: MASUK (LOGIN) ================= */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* School Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono flex items-center justify-between">
                  <span>Nama Sekolah</span>
                  <span className="text-[10px] font-normal text-slate-400 normal-case">
                    Pilih sekolah Anda
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-400">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <select
                    value={selectedSchoolId}
                    onChange={(e) => {
                      setSelectedSchoolId(e.target.value);
                      setUsername("");
                      setPassword("");
                    }}
                    className="w-full pl-10 pr-8 py-2.5 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition font-medium appearance-none cursor-pointer"
                    id="school-select"
                  >
                    {schools.map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        className="bg-[#0d1527] text-slate-100"
                      >
                        {s.name} {s.city ? `(${s.city})` : ""}
                      </option>
                    ))}
                  </select>
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500 text-xs">
                    ▼
                  </span>
                </div>
                {selectedSchoolId === "smp-islam-smart" ? (
                  <p className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Database lengkap &
                    aktif (data siswa & guru tersedia)
                  </p>
                ) : (
                  <p className="text-[11px] text-blue-400/90 mt-1 flex items-center gap-1 font-medium">
                    <Sparkles className="w-3 h-3" /> Database sekolah terdaftar
                    mandiri
                  </p>
                )}
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                  Nama Pengguna (Username)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    placeholder="Masukkan username..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition font-medium"
                    id="username-input"
                    autoComplete="off"
                  />

                  {/* Suggestions Dropdown for the selected school */}
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1.5 bg-[#0a101f] border border-[#1e2e4a] rounded-xl shadow-2xl max-h-52 overflow-y-auto divide-y divide-[#15233c]">
                      <div className="p-2 text-[10px] font-bold text-slate-400 bg-[#070c18] uppercase tracking-wider font-mono">
                        Pilihan Pengguna di {activeSchool?.name}
                      </div>
                      {filteredSuggestions.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setUsername(t.username);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-[#121e36] transition flex flex-col gap-0.5 cursor-pointer text-slate-200"
                        >
                          <span className="text-xs font-bold text-blue-300">
                            {t.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-300 bg-[#0d1627] border border-[#1e2e4a] px-1.5 py-0.5 rounded font-medium">
                              {t.username}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              •{" "}
                              {t.subject === "Admin"
                                ? "Administrator Sekolah"
                                : `Mapel ${t.subject} ${t.isWaliKelas ? `(Kelas ${t.kelas})` : ""}`}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                  Kata Sandi (Password)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Key className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition font-medium"
                    id="password-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold font-mono tracking-wider shadow-lg shadow-blue-950/60 border border-blue-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
                id="login-button"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    MASUK KE SISTEM
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("register_school");
                    setError("");
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
                >
                  Sekolah Anda belum terdaftar? Daftarkan sekarang →
                </button>
              </div>
            </form>
          )}

          {/* ================= TAB 2: DAFTAR SEKOLAH BARU ================= */}
          {activeTab === "register_school" && (
            <form onSubmit={handleRegisterSchoolSubmit} className="space-y-3.5">
              <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl text-[11px] text-blue-200">
                <p className="font-semibold text-blue-300 mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Ruang
                  Database Mandiri
                </p>
                Sekolah baru yang didaftarkan akan menerima database default
                kosong. Admin sekolah yang bertugas mengisi data guru dan
                siswanya.
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
                    className="w-full pl-9 pr-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition font-medium"
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
                      className="w-full pl-8 pr-2.5 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
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
                      className="w-full pl-8 pr-2.5 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
                      id="reg-npsn"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#1e2e4a] pt-2">
                <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1 font-mono">
                  Akun Administrator Sekolah
                </label>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-0.5">
                      Nama Admin
                    </label>
                    <input
                      type="text"
                      value={regAdminName}
                      onChange={(e) => setRegAdminName(e.target.value)}
                      placeholder="Contoh: Admin Sekolah / Nama Petugas"
                      className="w-full px-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
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
                      className="w-full px-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
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
                        className="w-full px-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
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
                        className="w-full px-3 py-2 bg-[#080d19] border border-[#1e2e4a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
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
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold font-mono tracking-wider shadow-lg shadow-emerald-950/60 border border-emerald-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-3"
                id="register-school-button"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    DAFTARKAN SEKOLAH & BUAT RUANG
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
                  Sudah punya akun? Kembali ke menu Masuk
                </button>
              </div>
            </form>
          )}

          {/* PWA Install Button for Fast Laptop Access */}
          <PWAInstallButton variant="login" />
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-xs text-slate-500 font-medium max-w-sm">
        Sistem Raport STS Terpadu &bull; SMP Islam Smart Pangkalpinang & Sekolah
        Terdaftar
      </div>
    </div>
  );
}
