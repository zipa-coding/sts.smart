import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  MonitorDown,
  Laptop,
  Check,
  X,
  Smartphone,
  Globe,
  ExternalLink,
  FileDown,
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'sidebar' | 'banner' | 'floating';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'navbar' }) => {
  const { isInstallable, isStandalone, install, deferredPrompt } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already installed and running inside the standalone app window
  if (isStandalone) {
    if (variant === 'sidebar') {
      return (
        <div className="mx-2 mb-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-[11px] text-emerald-300 font-mono">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate font-semibold">Aplikasi Desktop Aktif</span>
        </div>
      );
    }
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      try {
        await install();
      } catch (err) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  if (variant === 'sidebar') {
    return (
      <>
        <div className="px-2 mb-3">
          <div className="p-3 rounded-2xl bg-gradient-to-b from-[#111c34] to-[#0a1120] border border-blue-500/30 shadow-lg shadow-blue-950/40 relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-blue-600/10 rounded-full blur-xl group-hover:bg-blue-600/20 transition-all pointer-events-none"></div>
            
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                <Laptop className="w-4 h-4 text-amber-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="truncate">Download Aplikasi</span>
                  <span className="px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[8px] font-mono font-bold">
                    PWA
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">Pasang di Laptop & HP</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAction}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-950/50 border border-blue-400/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Download dan pasang aplikasi di laptop"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>Pasang Aplikasi</span>
            </button>
          </div>
        </div>

        {showModal && <PWAInstallModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  if (variant === 'floating') {
    return (
      <>
        <div className="fixed bottom-4 right-4 z-40 no-print">
          <button
            type="button"
            onClick={handleAction}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-2xl shadow-blue-950/80 border border-blue-400/40 transition transform hover:-translate-y-0.5 cursor-pointer"
            title="Download Aplikasi Raport di Laptop / Komputer"
          >
            <Download className="w-4 h-4 text-amber-300 animate-bounce" />
            <span>Download Aplikasi</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[9px] font-mono">
              Desktop
            </span>
          </button>
        </div>

        {showModal && <PWAInstallModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  // Default navbar variant
  return (
    <>
      <button
        type="button"
        onClick={handleAction}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-950/40 border border-blue-400/40 transition cursor-pointer select-none shrink-0 group"
        title="Download & Pasang Aplikasi Raport di Browser / Laptop"
        id="navbar-download-app-button"
      >
        <Download className="w-3.5 h-3.5 text-amber-300 shrink-0 group-hover:translate-y-0.5 transition-transform" />
        <span className="hidden sm:inline">Download Aplikasi</span>
        <span className="sm:hidden">Download</span>
        <span className="hidden md:inline px-1 py-0.2 rounded bg-white/20 text-[9px] font-mono uppercase">
          App
        </span>
      </button>

      {showModal && <PWAInstallModal onClose={() => setShowModal(false)} />}
    </>
  );
};

// Modal Download & Petunjuk Pemasangan Aplikasi
export const PWAInstallModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { isInstallable, install } = usePWAInstall();
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Generate & Download Windows Desktop Internet Shortcut file (.url)
  const handleDownloadShortcut = () => {
    try {
      const targetUrl = window.location.href;
      const shortcutContent = `[InternetShortcut]\r\nURL=${targetUrl}\r\nIconIndex=0\r\n`;
      const blob = new Blob([shortcutContent], { type: "application/internet-shortcut;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Smart-Raport-STS.url";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (e) {
      console.error("Gagal mendownload pintasan:", e);
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className="w-full max-w-lg bg-[#0c1322] border border-[#1e2f4f] rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-[#090e1c] to-[#10192e] border-b border-[#1e2f4f] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <Laptop className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase font-mono tracking-tight text-white flex items-center gap-2">
                <span>Download & Pasang Aplikasi</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] font-mono">
                  PWA
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Gunakan aplikasi secara mandiri di laptop, PC, atau HP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Quick Action 1: 1-Click Install if browser prompt is ready */}
          {isInstallable && (
            <div className="p-3.5 bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/50 rounded-xl flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Browser Siap Pasang Langsung</span>
                </div>
                <div className="text-[11px] text-blue-200">
                  Browser Anda mendukung pemasangan instan 1-klik ke sistem operasi.
                </div>
              </div>
              <button
                type="button"
                onClick={() => install()}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <MonitorDown className="w-4 h-4 text-amber-300" />
                <span>Pasang Sekarang</span>
              </button>
            </div>
          )}

          {/* Quick Action 2: Download Windows Shortcut (.url) */}
          <div className="p-3.5 bg-[#10192e] border border-[#1e2f4f] rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                <FileDown className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Download File Pintasan Desktop (.url)</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Download file pintasan untuk diletakkan di Desktop Laptop Windows Anda.
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadShortcut}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                downloadSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .url</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Action 3: Open in New Browser Tab */}
          <div className="p-3.5 bg-[#10192e] border border-[#1e2f4f] rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Buka di Jendela / Tab Baru Browser</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Buka langsung di tab penuh agar tombol install di bilah alamat browser aktif.
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Tab</span>
            </button>
          </div>

          {/* Instructions: Chrome & Edge on Laptop */}
          <div className="space-y-2">
            <div className="font-bold text-slate-200 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-400" />
              <span>Cara Pasang di Browser Laptop (Chrome / Edge):</span>
            </div>

            <div className="bg-[#090e1c] p-3.5 rounded-xl border border-[#1a2845] space-y-2.5 text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  1
                </span>
                <span>
                  Buka website raport di browser <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  2
                </span>
                <span>
                  Perhatikan <strong>bilah alamat URL (Address Bar)</strong> di kanan atas browser, klik ikon <strong>Install / Download Aplikasi <MonitorDown className="w-3.5 h-3.5 inline mx-0.5 text-blue-400" /></strong> atau klik tombol menu browser (⋮) lalu pilih <strong>"Install Raport STS..."</strong>
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  3
                </span>
                <span>
                  Klik <strong>Install</strong>. Aplikasi akan muncul sebagai program mandiri di Desktop & Taskbar laptop Anda.
                </span>
              </div>
            </div>
          </div>

          {/* Instructions: Mobile Phone (Android & iOS) */}
          <div className="space-y-2">
            <div className="font-bold text-slate-200 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Untuk Pengguna Smartphone (Android & iPhone):</span>
            </div>

            <div className="bg-[#090e1c] p-3.5 rounded-xl border border-[#1a2845] space-y-2 text-slate-300">
              <p>
                • <strong>Android (Google Chrome)</strong>: Ketuk menu titik tiga (⋮) di kanan atas browser &gt; pilih <strong>"Tambahkan ke Layar Utama"</strong> (<em>Add to Home Screen</em>).
              </p>
              <p>
                • <strong>iPhone / iPad (Safari)</strong>: Ketuk tombol <strong>Bagikan (Share)</strong> di bagian bawah &gt; gulir ke bawah dan pilih <strong>"Tambah ke Layar Utama"</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#090e1c] border-t border-[#1e2f4f] flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Aplikasi aman • Kurikulum Merdeka
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
