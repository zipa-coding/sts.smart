import React, { useState, useEffect } from "react";
import { Teacher } from "./types";
import LoginScreen from "./components/LoginScreen";
import DashboardProgress from "./components/DashboardProgress";
import AdminPanel from "./components/AdminPanel";
import TeacherPanel from "./components/TeacherPanel";
import WaliKelasPanel from "./components/WaliKelasPanel";
import SmpIslamSmartLogo from "./components/SmpIslamSmartLogo";
import { BookOpen, LogOut, Key, BarChart3, Settings, ShieldAlert, GraduationCap, PenTool, Sun, Moon, Menu, X } from "lucide-react";
import { isFirebaseConfigured } from "./lib/firebase";

export default function App() {
  const [currentUser, setCurrentUser] = useState<Teacher | null>(null);
  const [showInactivityModal, setShowInactivityModal] = useState<boolean>(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(() => {
    return !!sessionStorage.getItem("smp_islam_smart_user");
  });
  
  // Navigation: active main view tab
  const [activeTab, setActiveTab] = useState<string>("progress");
  
  // State trigger to notify progress widgets to refetch summary info
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Responsive mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Global screen dark mode state synced with local storage
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("smp_islam_smart_theme") === "dark";
  });

  useEffect(() => {
    localStorage.setItem("smp_islam_smart_theme", darkMode ? "dark" : "light");
    if (darkMode) {
      document.body.classList.add("dark");
      document.documentElement.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Check if session exists on load with security inactivity verify
  useEffect(() => {
    const savedUser = sessionStorage.getItem("smp_islam_smart_user");
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        
        // Security check for long-unopened window / inactive reload
        const lastActive = sessionStorage.getItem("smp_islam_smart_last_active");
        if (lastActive) {
          const inactiveDuration = Date.now() - Number(lastActive);
          const TIMEOUT_MS = 10 * 60 * 1000; // 10 menit
          if (inactiveDuration > TIMEOUT_MS) {
            sessionStorage.removeItem("smp_islam_smart_user");
            sessionStorage.removeItem("smp_islam_smart_last_active");
            setShowInactivityModal(true);
            setCurrentUser(null);
            setIsVerifyingSession(false);
            return;
          }
        }
        
        // Securely verify credentials with server database on every single page open/reload
        fetch("/api/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: u.username, password: u.password })
        })
          .then((res) => {
            if (!res.ok) throw new Error("Sesi tidak valid");
            return res.json();
          })
          .then((verifiedUser) => {
            setCurrentUser(verifiedUser);
            sessionStorage.setItem("smp_islam_smart_user", JSON.stringify(verifiedUser));
            sessionStorage.setItem("smp_islam_smart_last_active", Date.now().toString());
            setActiveTab("progress");
          })
          .catch(() => {
            // Force re-login if credentials changed or account was deleted
            sessionStorage.removeItem("smp_islam_smart_user");
            sessionStorage.removeItem("smp_islam_smart_last_active");
            setCurrentUser(null);
          })
          .finally(() => {
            setIsVerifyingSession(false);
          });
      } catch (e) {
        sessionStorage.removeItem("smp_islam_smart_user");
        setIsVerifyingSession(false);
      }
    } else {
      setIsVerifyingSession(false);
    }
  }, []);

  // Live session activity & lock-out tracking hook
  useEffect(() => {
    if (!currentUser) return;

    // Save initial load timestamp
    sessionStorage.setItem("smp_islam_smart_last_active", Date.now().toString());

    const TIMEOUT_MS = 10 * 60 * 1000; // 10 menit

    const checkInactivity = () => {
      const lastActive = sessionStorage.getItem("smp_islam_smart_last_active");
      if (lastActive) {
        const inactiveDuration = Date.now() - Number(lastActive);
        if (inactiveDuration > TIMEOUT_MS) {
          // Log out for security compliance
          setCurrentUser(null);
          sessionStorage.removeItem("smp_islam_smart_user");
          sessionStorage.removeItem("smp_islam_smart_last_active");
          setShowInactivityModal(true);
        }
      }
    };

    const updateActivity = () => {
      sessionStorage.setItem("smp_islam_smart_last_active", Date.now().toString());
    };

    // Listen to various desktop & mobile user events
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Check inactivity every 20 seconds
    const interval = setInterval(checkInactivity, 20000);

    // Check when tab gets focus or visibility transitions back to active
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkInactivity();
      }
    };
    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", checkInactivity);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", checkInactivity);
    };
  }, [currentUser]);

  const handleLoginSuccess = (user: Teacher) => {
    setCurrentUser(user);
    sessionStorage.setItem("smp_islam_smart_user", JSON.stringify(user));
    sessionStorage.setItem("smp_islam_smart_last_active", Date.now().toString());
    
    // Default tabs depending on role
    if (user.subject === "Admin") {
      setActiveTab("progress");
    } else if (user.subject !== "Admin") {
      setActiveTab("progress");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem("smp_islam_smart_user");
    sessionStorage.removeItem("smp_islam_smart_last_active");
  };

  const triggerProgressRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Render loading screen during session verification
  if (isVerifyingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 p-6 text-center space-y-6" id="session-verification-loading">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-100 dark:border-emerald-950/40"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-emerald-800 dark:border-t-emerald-500 animate-spin"></div>
        </div>
        <div className="space-y-2 max-w-sm">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Verifikasi Keamanan Sesi</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sedang memverifikasi kredensial akun Anda secara aman dengan server SMP Islam Smart...
          </p>
        </div>
      </div>
    );
  }

  // Render Lockscreen Modal if locked
  if (showInactivityModal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-950/20 backdrop-blur-md px-4 py-12" id="inactivity-lockscreen">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-rose-100 dark:border-slate-700 overflow-hidden text-center p-8 space-y-6 animate-scale-up">
          <div className="mx-auto w-20 h-20 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 animate-pulse">
            <ShieldAlert className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">Sesi Keamanan Terkunci</h2>
            <p className="text-xs text-rose-600 dark:text-rose-400 font-extrabold tracking-widest uppercase font-mono">
              Inactivity Auto-Lock
            </p>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Demi menjaga keamanan data akademik dan kerahasiaan nilai raport murid SMP Islam Smart, sistem ini otomatis mengunci sesi Anda apabila aplikasi tidak dibuka atau dibiarkan aktif tanpa aktivitas selama lebih dari 10 menit.
          </p>

          <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-550 dark:text-slate-400 text-left leading-relaxed">
            Silakan klik tombol di bawah untuk memverifikasi ulang akun Anda dan melanjutkan pengerjaan penginputan nilai.
          </div>

          <button
            onClick={() => setShowInactivityModal(false)}
            className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white rounded-lg text-xs font-bold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Key className="w-4.5 h-4.5" />
            Verifikasi & Masuk Kembali
          </button>
        </div>
      </div>
    );
  }

  // If there's no active user session, redirect to Login
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Determine which navigation tabs must be shown based on user role
  const isSysAdmin = currentUser.subject === "Admin";
  const isSubjectTeacher = currentUser.subject !== "Admin" && currentUser.subject !== "";
  const isWaliKelas = currentUser.isWaliKelas;

  return (
    <div className={`flex h-screen w-full overflow-hidden font-sans ${darkMode ? "dark bg-slate-900" : "bg-slate-50"}`} id="applet-viewport">
      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden no-print"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed inset-y-0 left-0 w-56 bg-emerald-900 text-white flex flex-col z-50 transform transition-transform duration-300 ease-in-out no-print shrink-0 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`} 
        id="app-sidebar"
      >
        {/* Sidebar Header Logo */}
        <div className="p-4 border-b border-emerald-800 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0 shadow">
              <SmpIslamSmartLogo size="100%" />
            </div>
            <h1 className="text-[10px] font-extrabold tracking-tight uppercase leading-snug">
              SMP ISLAM SMART<br />PANGKALPINANG
            </h1>
          </div>
          {/* Close button for small screens */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 rounded text-emerald-200 hover:text-white hover:bg-emerald-850 cursor-pointer"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pt-3">
          <p className="text-[10px] text-emerald-300 opacity-80 uppercase font-semibold block">
            STS Reporting System
          </p>
          <div className="mt-2.5">
            {isFirebaseConfigured ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-extrabold uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse"></span>
                Cloud Firebase
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] font-extrabold uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Offline / Lokal
              </span>
            )}
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 py-3 overflow-y-auto space-y-1">
          <div className="px-4 mb-2 text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
            Main Menu
          </div>
          
          <button
            onClick={() => {
              setActiveTab("progress");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-left transition-all cursor-pointer ${
              activeTab === "progress"
                ? "bg-emerald-800 border-l-4 border-amber-400 text-white"
                : "text-emerald-100 hover:bg-emerald-850 opacity-80 hover:opacity-100"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-300" />
            <span>Progres Penginputan</span>
          </button>

          {/* If Subject Teacher OR Admin */}
          {(isSubjectTeacher || isSysAdmin) && (
            <button
              onClick={() => {
                setActiveTab("grade_inputs");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-left transition-all cursor-pointer ${
                activeTab === "grade_inputs"
                  ? "bg-emerald-800 border-l-4 border-amber-400 text-white"
                  : "text-emerald-100 hover:bg-emerald-850 opacity-80 hover:opacity-100"
            }`}
            >
              <PenTool className="w-4 h-4 text-emerald-300" />
              <span>Input Nilai Mapel</span>
            </button>
          )}

          {/* If Wali Kelas OR Admin */}
          {(isWaliKelas || isSysAdmin) && (
            <button
              onClick={() => {
                setActiveTab("walikelas_panel");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-left transition-all cursor-pointer ${
                activeTab === "walikelas_panel"
                  ? "bg-emerald-800 border-l-4 border-amber-400 text-white"
                  : "text-emerald-100 hover:bg-emerald-850 opacity-80 hover:opacity-100"
              }`}
            >
              <GraduationCap className="w-4 h-4 text-emerald-300" />
              <span>Wali Kelas Menu</span>
            </button>
          )}

          {/* If SysAdmin */}
          {isSysAdmin && (
            <>
              <div className="px-4 mt-6 mb-2 text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                Administrator
              </div>
              <button
                onClick={() => {
                  setActiveTab("admin_panel");
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-left transition-all cursor-pointer ${
                  activeTab === "admin_panel"
                    ? "bg-emerald-800 border-l-4 border-amber-400 text-white"
                    : "text-emerald-100 hover:bg-emerald-850 opacity-80 hover:opacity-100"
                }`}
              >
                <Settings className="w-4 h-4 text-amber-400" />
                <span>Manajemen Guru</span>
              </button>
            </>
          )}
        </nav>

        {/* Sidebar Footer User Profile */}
        <div className="p-4 bg-emerald-950 border-t border-emerald-900 flex flex-col gap-1.5">
          <div className="text-xs font-semibold truncate text-white" title={currentUser.name}>
            {currentUser.name}
          </div>
          <div className="text-[10px] text-emerald-300 opacity-80 uppercase font-semibold">
            {isSysAdmin
              ? "Admin Sekolah"
              : isWaliKelas
              ? `Wali Kelas ${currentUser.kelas}`
              : `Guru ${currentUser.subject}`}
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Row */}
        <header className={`h-12 border-b flex items-center justify-between px-4 md:px-6 shrink-0 no-print transition-colors duration-200 ${darkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-800"}`} id="app-navbar">
          <div className="flex items-center gap-2">
            {/* Hamburger menu trigger for small screens */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className={`text-[10px] sm:text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              Semester Ganjil &bull; <span className={`font-bold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>Sumatif Tengah Semester (STS)</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold transition shadow-2xs cursor-pointer select-none border ${
                darkMode 
                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600" 
                  : "bg-slate-800 hover:bg-slate-900 text-white border-slate-950"
              }`}
              title="Ganti Mode Tampilan"
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-slate-950" />
                  <span className="hidden sm:inline">Mode Terang</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">Mode Gelap</span>
                </>
              )}
            </button>

            <button
              onClick={handleLogout}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold border transition select-none cursor-pointer ${
                darkMode
                  ? "text-rose-450 bg-rose-950/20 border-rose-900 hover:bg-rose-900/30"
                  : "text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200"
              }`}
              id="logout-button"
            >
              <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        {/* Inner Content Area */}
        <main className="flex-1 overflow-y-auto p-4 bg-slate-55 space-y-4" id="app-workspace">
          {/* Tab view containers */}
          <div className="tab-viewport animate-fade-in" id="tab-viewport">
            {activeTab === "progress" && (
              <div className="space-y-4">
                <div className="no-print bg-amber-50 rounded-lg p-3 border border-amber-200 text-[11px] text-amber-950 leading-relaxed">
                  📢 <strong>Sistem Sinkronisasi Terpadu:</strong> Halaman ini menangkap progres penginputan nilai dan ketercapaian siswa secara real-time. Jika salah satu guru menyelesaikan input nilai murid, status di bawah akan naik secara instan dan langsung menyesuaikan ke raport tengah semester.
                </div>
                <DashboardProgress onRefreshTrigger={refreshTrigger} />
              </div>
            )}

            {activeTab === "grade_inputs" && (
              <div>
                {isSysAdmin ? (
                  <div className="space-y-4">
                    {/* For admin, let them act as a specific teacher to test! */}
                    <div className="no-print bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 block mb-1">Kemampuan Admin</span>
                      <p className="text-[11px] text-slate-600 font-medium">Sebagai Admin Utama, Anda dapat bertindak sebagai Guru Mata Pelajaran mana saja atau menguji input nilai secara langsung dengan memilih ketersediaan peran di bawah ini.</p>
                    </div>
                    {/* Act as IPA Teacher by default for admin in workspace */}
                    <TeacherPanel
                      user={{ id: "admin_tester", name: "Pak Admin (Penguji)", username: "admin", subject: "Informatika", isWaliKelas: false, kelas: "" }}
                      onRefreshTrigger={triggerProgressRefresh}
                    />
                  </div>
                ) : (
                  <TeacherPanel user={currentUser} onRefreshTrigger={triggerProgressRefresh} />
                )}
              </div>
            )}

            {activeTab === "walikelas_panel" && (
              <div>
                {/* Wali Kelas dashboard integration */}
                <WaliKelasPanel user={currentUser} onRefreshTrigger={triggerProgressRefresh} />
              </div>
            )}

            {activeTab === "admin_panel" && isSysAdmin && (
              <div>
                {/* Admin Database control hub */}
                <AdminPanel onRefreshTrigger={triggerProgressRefresh} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
