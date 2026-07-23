import React from 'react';
import { UserProfile } from '../types';
import { logoutUser } from '../lib/firebase';
import { Key, History, LogOut, ShieldCheck, User } from 'lucide-react';

interface HeaderProps {
  user: UserProfile | null;
  onOpenAdminDashboard: () => void;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenAdminDashboard,
  onOpenHistory
}) => {
  return (
    <header className="bg-slate-800 shadow-lg sticky top-0 z-40 no-print">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand / Logo */}
        <div className="flex items-center">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Kementerian_Agama_new_logo.png/330px-Kementerian_Agama_new_logo.png" 
            alt="Logo Kemenag" 
            className="h-10 w-10 mr-3 object-contain" 
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Generator RPM KBC</h1>
            <p className="text-xs sm:text-sm text-cyan-300 font-medium">MTsN 4 Jombang</p>
          </div>
        </div>

        {/* User & Nav Controls */}
        {user && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">

            {/* History Button */}
            <button
              onClick={onOpenHistory}
              className="bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-600 transition shadow-sm"
              title="Lihat Riwayat Dokumen RPM Tersimpan"
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Riwayat Dokumen</span>
            </button>

            {/* Admin Dashboard Button (Only for Admin) */}
            {user.role === 'admin' && (
              <button
                onClick={onOpenAdminDashboard}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition shadow-sm"
                title="Kelola Pool API Key Gemini"
              >
                <Key className="w-3.5 h-3.5 text-slate-950" />
                <span>Admin Dashboard</span>
              </button>
            )}

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700 px-2.5 py-1 rounded-lg">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-200 line-clamp-1">{user.displayName}</p>
                <p className="text-[10px] text-slate-400 line-clamp-1">{user.email}</p>
              </div>
              {user.role === 'admin' && (
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-400/30">
                  Admin
                </span>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={() => logoutUser()}
              className="p-1.5 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg transition"
              title="Keluar / Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>
        )}

      </div>
    </header>
  );
};
