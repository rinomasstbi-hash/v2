import React from 'react';

interface NotificationProps {
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 transition-opacity animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-title"
    >
      <div 
        className="bg-slate-800 rounded-xl shadow-2xl p-6 sm:p-8 max-w-lg w-full mx-4 border border-slate-700 transform animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
            <svg className="h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 id="notification-title" className="mt-4 text-xl font-bold text-white">
            Pemberitahuan Penggunaan Aplikasi
          </h3>
          <div className="mt-2">
            <p className="text-sm text-slate-300">
              Aplikasi ini dikembangkan secara khusus untuk para guru di lingkungan MTsN 4 Jombang. Penggunaan di luar instansi tersebut memerlukan izin. Untuk informasi kerja sama, silakan hubungi pengembang di <a href="mailto:rinomasstbi@gmail.com" className="font-medium text-cyan-400 hover:text-cyan-300 underline">rinomasstbi@gmail.com</a>.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <button
            onClick={onClose}
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-cyan-600 text-base font-medium text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-800 sm:text-sm transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};
