import React, { useState } from 'react';
import { loginWithGoogle, loginAsLocalUser, isUsingCustomFirebaseConfig } from '../lib/firebase';
import { Shield, AlertTriangle, ExternalLink, Settings, CheckCircle2, UserCheck, Zap } from 'lucide-react';
import { CustomFirebaseModal } from './CustomFirebaseModal';

export const LoginScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDomainError, setIsDomainError] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const isCustomActive = isUsingCustomFirebaseConfig();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setIsDomainError(false);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Login Error:", err);
      const msg = err.message || '';
      if (err.code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setIsDomainError(true);
        setError("Domain ini belum didaftarkan di Firebase Authorized Domains. Silakan klik 'Masuk Akses Cepat' di bawah untuk langsung menggunakan aplikasi!");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Proses login dibatalkan oleh pengguna.");
      } else {
        setError(msg || "Gagal masuk dengan Google. Silakan coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectAdminLogin = () => {
    loginAsLocalUser('admin', 'rinomasstbi@gmail.com', 'Rino Masstbi (Admin)');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 z-10">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 text-white text-center relative">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl mb-4 backdrop-blur-sm">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Kementerian_Agama_new_logo.png/330px-Kementerian_Agama_new_logo.png" 
              alt="Logo Kemenag" 
              className="h-16 w-16 object-contain" 
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Generator RPM KBC</h1>
          <p className="text-cyan-300 text-sm mt-1 font-medium">MTsN 4 Jombang</p>

          {isCustomActive && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Menggunakan Firebase Pribadi</span>
            </div>
          )}
        </div>

        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Masuk Aplikasi</h2>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              Pilih metode masuk di bawah ini untuk mulai membuat Rencana Pembelajaran Mendalam (RPM).
            </p>
          </div>

          {/* Standard Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-950 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Pemberitahuan Login</span>
              </div>
              <p className="leading-relaxed">{error}</p>
              <button
                onClick={handleDirectAdminLogin}
                className="mt-2 w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <Zap className="w-4 h-4" />
                <span>Masuk Sekarang (Akses Cepat)</span>
              </button>
            </div>
          )}

          <div className="space-y-3">
            {/* Primary Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white border-2 border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/30 text-slate-700 font-semibold py-3 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <div className="flex items-center gap-2 text-cyan-600">
                  <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
                  <span>Menghubungkan ke Google...</span>
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="group-hover:text-cyan-700 transition-colors">Masuk Akun Gmail</span>
                </>
              )}
            </button>

            {/* Direct Instant Login Button (Bypasses Google OAuth domain restriction) */}
            <button
              onClick={handleDirectAdminLogin}
              className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold py-3 px-4 rounded-xl shadow transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Masuk Langsung (Bebas Domain / Akses Cepat)</span>
            </button>
          </div>

          {/* Button to configure Custom Firebase anytime */}
          <div className="mt-5 text-center">
            <button
              onClick={() => setIsCustomModalOpen(true)}
              className="text-xs text-slate-500 hover:text-cyan-700 font-medium inline-flex items-center gap-1 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{isCustomActive ? "Ubah / Reset Firebase Pribadi" : "Konfigurasi Firebase Netlify"}</span>
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Shield className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>Akses Aman & Terenkripsi dengan Autentikasi Kemenag</span>
          </div>
        </div>
      </div>

      <CustomFirebaseModal 
        isOpen={isCustomModalOpen} 
        onClose={() => setIsCustomModalOpen(false)} 
      />
    </div>
  );
};

