import React, { useState } from 'react';
import { X, Key, ShieldCheck, Info, ExternalLink, RefreshCw } from 'lucide-react';
import { saveCustomFirebaseConfig, resetCustomFirebaseConfig, isUsingCustomFirebaseConfig } from '../lib/firebase';

interface CustomFirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomFirebaseModal: React.FC<CustomFirebaseModalProps> = ({ isOpen, onClose }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isCustom = isUsingCustomFirebaseConfig();

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      let parsed: any;
      const trimmed = jsonInput.trim();

      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          // If pure JSON parse fails, try extracting key-values via regex below
        }
      }

      if (!parsed) {
        // Extract key: "value" or key: 'value' or "key": "value" using regex
        const apiKeyMatch = trimmed.match(/["']?apiKey["']?\s*:\s*["']([^"']+)["']/);
        const authDomainMatch = trimmed.match(/["']?authDomain["']?\s*:\s*["']([^"']+)["']/);
        const projectIdMatch = trimmed.match(/["']?projectId["']?\s*:\s*["']([^"']+)["']/);
        const storageBucketMatch = trimmed.match(/["']?storageBucket["']?\s*:\s*["']([^"']+)["']/);
        const messagingSenderIdMatch = trimmed.match(/["']?messagingSenderId["']?\s*:\s*["']([^"']+)["']/);
        const appIdMatch = trimmed.match(/["']?appId["']?\s*:\s*["']([^"']+)["']/);

        if (apiKeyMatch && projectIdMatch) {
          parsed = {
            apiKey: apiKeyMatch[1],
            authDomain: authDomainMatch ? authDomainMatch[1] : undefined,
            projectId: projectIdMatch[1],
            storageBucket: storageBucketMatch ? storageBucketMatch[1] : undefined,
            messagingSenderId: messagingSenderIdMatch ? messagingSenderIdMatch[1] : undefined,
            appId: appIdMatch ? appIdMatch[1] : undefined
          };
        }
      }

      if (!parsed || !parsed.apiKey || !parsed.projectId) {
        throw new Error("Tidak dapat menemukan 'apiKey' dan 'projectId'. Pastikan Anda menempelkan seluruh teks firebaseConfig yang disalin dari Firebase Console.");
      }

      saveCustomFirebaseConfig(parsed);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memproses konfigurasi Firebase.");
    }
  };

  const handleReset = () => {
    if (confirm("Apakah Anda yakin ingin mengembalikan ke Konfigurasi Firebase Bawaan AI Studio?")) {
      resetCustomFirebaseConfig();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Konfigurasi Firebase Pribadi</h2>
              <p className="text-xs text-slate-400">Khusus untuk Deployment Netlify / Domain Sendiri</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm">
          <div className="bg-cyan-50 border border-cyan-200 p-4 rounded-xl text-xs text-cyan-950 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-cyan-900">
              <Info className="w-4 h-4 text-cyan-600 flex-shrink-0" />
              <span>Mengapa butuh Firebase Pribadi di Netlify?</span>
            </div>
            <p className="leading-relaxed">
              Project Firebase otomatis bawaan AI Studio tidak mengizinkan penambahan domain secara manual (Permission Restricted). Jika Anda menghosting web di Netlify, buatlah project Firebase gratis di Console Firebase milik Anda sendiri, lalu salin <code className="bg-cyan-100 px-1 py-0.5 rounded font-mono">firebaseConfig</code> ke sini.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tempelkan Teks <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-cyan-800">firebaseConfig</code> dari Firebase Console
              </label>
              <textarea
                rows={7}
                placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "proyek-saya.firebaseapp.com",\n  projectId: "proyek-saya",\n  storageBucket: "proyek-saya.appspot.com",\n  messagingSenderId: "123456789",\n  appId: "1:123456789:web:abc123"\n};`}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                required
                className="w-full p-3 border border-slate-300 rounded-xl font-mono text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                💡 Anda bisa langsung menempelkan seluruh kode <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">const firebaseConfig = &#123; ... &#125;;</code> tanpa perlu mengubahnya manual!
              </p>
            </div>

            <div className="flex justify-between items-center text-xs">
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 hover:text-cyan-800 font-semibold inline-flex items-center gap-1"
              >
                <span>Buka Console Firebase Saya</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2">
                {isCustom && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition"
                  >
                    Reset Bawaan
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold rounded-lg shadow hover:shadow-cyan-500/20 transition"
                >
                  Simpan & Terapkan
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
