import React, { useState } from 'react';
import { loginWithGoogle } from '../lib/firebase';
import { Shield, AlertTriangle, ExternalLink } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setIsOperationNotAllowed(false);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Login Error:", err);
      const msg = err.message || '';
      if (err.code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
        setIsOperationNotAllowed(true);
        setError("Metode Login Google belum diaktifkan di Console Firebase Anda (project kbcrmp).");
      } else if (err.code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setError("Domain ini belum terdaftar di Firebase Authorized Domains. Pastikan mtsn4jbg.netlify.app sudah tersimpan di Firebase Console -> Authentication -> Settings -> Authorized domains.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Proses login dibatalkan oleh pengguna.");
      } else {
        setError(msg || "Gagal masuk dengan Google. Silakan coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 z-10">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 text-white text-center relative">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl mb-4 backdrop-blur-sm">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Kementerian_Agama_new_logo.png/330px-Kementerian_Agama_new_logo.png" 
              alt="Logo Kemenag" 
              className="h-16 w-16 object-contain" 
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Generator RPM/RPP/Modul Ajar</h1>
          <p className="text-cyan-300 text-sm mt-1 font-medium">Kumer - KBC - MTsN 4 Jombang</p>
        </div>

        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Masuk Akun Google</h2>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              Silakan masuk menggunakan akun Google Anda untuk mengakses Generator Rencana Pembelajaran Mendalam (RPM) Kurikulum Berbasis Cinta (KBC).
            </p>
          </div>

          {/* Standard Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-950 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Kendala Login Firebase</span>
              </div>
              <p className="leading-relaxed font-medium">{error}</p>
              
              {isOperationNotAllowed && (
                <div className="mt-2 pt-2 border-t border-amber-200 text-[11px] text-amber-900 space-y-1.5">
                  <p className="font-bold">Langkah Mengaktifkan Google Sign-In:</p>
                  <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                    <li>Buka <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-cyan-800 inline-flex items-center gap-0.5">Firebase Console <ExternalLink className="w-3 h-3" /></a> dan pilih project <code className="bg-amber-100 px-1 rounded font-mono">kbcrmp</code>.</li>
                    <li>Buka menu <b>Authentication</b> &rarr; tab <b>Sign-in method</b>.</li>
                    <li>Klik <b>Add new provider</b> (atau pilih <b>Google</b>).</li>
                    <li>Aktifkan sakelar (<b>Enable</b>), masukkan email dukungan, lalu klik <b>Save</b> (Simpan).</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Single Primary Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white border-2 border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/30 text-slate-700 font-semibold py-3.5 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
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
                <span className="group-hover:text-cyan-700 transition-colors">Lanjutkan dengan Gmail</span>
              </>
            )}
          </button>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Shield className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>Akses Aman & Terenkripsi dengan Autentikasi Google</span>
          </div>
        </div>
      </div>
    </div>
  );
};


