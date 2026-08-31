import React, { useState, useEffect } from "react";
import { LogIn, ShieldAlert, Key, User } from "lucide-react";
import { Teacher } from "../types";
import SmpIslamSmartLogo from "./SmpIslamSmartLogo";

interface LoginScreenProps {
  onLoginSuccess: (user: Teacher) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetch("/api/teachers")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Filter out Admin from suggestions
          setTeachers(data.filter((t) => t.subject !== "Admin"));
        }
      })
      .catch((err) => console.error("Gagal memuat daftar guru untuk rekomendasi", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username dan kata sandi harus diisi.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12" id="login-container">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden" id="login-card">
        {/* Header decoration */}
        <div className="bg-emerald-800 px-6 py-8 text-center text-white relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500"></div>
          <div className="mx-auto w-32 h-32 bg-white rounded-full flex items-center justify-center mb-4 p-1 shadow-md">
            <SmpIslamSmartLogo size="100%" />
          </div>
          <h1 className="text-lg font-extrabold tracking-tight uppercase leading-snug">SMP ISLAM SMART PANGKALPINANG</h1>
          <p className="text-xs text-emerald-200 mt-1 uppercase tracking-widest font-mono">
            Sistem Raport STS Terintegrasi
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 flex items-start gap-2.5" id="login-error">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Nama Pengguna (Username)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="h-4.5 w-4.5" />
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
                    // Delay to allow suggestion click
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  placeholder="Masukkan username..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                  id="username-input"
                  autoComplete="off"
                />

                {/* Suggestions Dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto divide-y divide-gray-100">
                    <div className="p-2 text-[10px] font-bold text-gray-400 bg-slate-50 uppercase tracking-wider">
                      Saran Nama Pengguna
                    </div>
                    {filteredSuggestions.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setUsername(t.username);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50/50 transition flex flex-col gap-0.5 cursor-pointer"
                      >
                        <span className="text-xs font-bold text-gray-800">{t.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1 rounded font-bold">
                            {t.username}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            • Mapel {t.subject} {t.isWaliKelas ? `(Kelas ${t.kelas})` : ""}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Kunci Pengaman (Kata Sandi)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Key className="h-4.5 w-4.5" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                  id="password-input"
                />
              </div>
            </div>

            <button
               type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white rounded-lg text-sm font-semibold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              id="login-button"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Masuk ke Dashboard
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
