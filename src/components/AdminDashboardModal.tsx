import React, { useState, useEffect } from 'react';
import { GeminiApiKey, UserProfile } from '../types';
import { 
  subscribeToApiKeys, 
  addApiKeyToPool, 
  toggleApiKeyStatus, 
  deleteApiKeyFromPool,
  subscribeToUsers 
} from '../services/apiKeyService';
import { 
  Key, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  ExternalLink,
  X,
  RefreshCw,
  Users,
  Clock,
  UserCheck
} from 'lucide-react';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  userEmail
}) => {
  const [activeTab, setActiveTab] = useState<'pool' | 'users'>('pool');

  // Keys state
  const [keys, setKeys] = useState<GeminiApiKey[]>([]);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Users state
  const [userList, setUserList] = useState<UserProfile[]>([]);

  // Unmasked keys map for toggle visibility
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsubKeys = subscribeToApiKeys((updatedKeys) => {
      setKeys(updatedKeys);
    });
    const unsubUsers = subscribeToUsers((updatedUsers) => {
      setUserList(updatedUsers);
    });
    return () => {
      unsubKeys();
      unsubUsers();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyValue.trim()) {
      setErrorMsg("Harap masukkan API Key Gemini.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await addApiKeyToPool(newKeyValue, newKeyLabel, userEmail);
      setNewKeyLabel('');
      setNewKeyValue('');
      setSuccessMsg("API Key berhasil ditambahkan ke dalam Pool!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menambahkan API Key.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (keyItem: GeminiApiKey) => {
    try {
      await toggleApiKeyStatus(keyItem.id, keyItem.status);
    } catch (err: any) {
      alert("Gagal mengubah status key: " + err.message);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus key "${label}" dari pool?`)) {
      try {
        await deleteApiKeyFromPool(id);
      } catch (err: any) {
        alert("Gagal menghapus key: " + err.message);
      }
    }
  };

  const toggleShowKey = (id: string) => {
    setShowKeyMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const activeCount = keys.filter(k => k.status === 'active').length;
  const disabledCount = keys.filter(k => k.status === 'disabled' || k.status === 'exhausted').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 pb-0 border-b border-slate-800">
          <div className="flex items-center justify-between pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Admin Dashboard</h2>
                <p className="text-xs text-slate-400">Pengaturan Pool API Key Gemini & Riwayat Login Pengguna</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-slate-800">
            <button
              onClick={() => setActiveTab('pool')}
              className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                activeTab === 'pool'
                  ? 'border-cyan-400 text-cyan-400 bg-slate-800/60 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Pool API Key ({keys.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                activeTab === 'users'
                  ? 'border-cyan-400 text-cyan-400 bg-slate-800/60 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Riwayat Login Pengguna ({userList.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: POOL API KEY */}
          {activeTab === 'pool' && (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Key di Pool</p>
                    <p className="text-2xl font-bold text-slate-800">{keys.length}</p>
                  </div>
                  <div className="p-3 bg-slate-200 text-slate-700 rounded-lg">
                    <Key className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Key Aktif (Siap Pakai)</p>
                    <p className="text-2xl font-bold text-emerald-800">{activeCount}</p>
                  </div>
                  <div className="p-3 bg-emerald-200 text-emerald-800 rounded-lg">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Key Nonaktif / Limit</p>
                    <p className="text-2xl font-bold text-amber-800">{disabledCount}</p>
                  </div>
                  <div className="p-3 bg-amber-200 text-amber-800 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Form Add New Key */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <Plus className="w-5 h-5 text-cyan-600" />
                  <span>Tambah API Key Gemini Baru</span>
                </h3>

                {errorMsg && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg font-medium">
                    {errorMsg}
                  </div>
                )}

                {successMsg && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg font-medium">
                    {successMsg}
                  </div>
                )}

                <form onSubmit={handleAddKey} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Label Key (Opsional)</label>
                      <input
                        type="text"
                        placeholder="mis. Key Utama 1, Key Laptop A"
                        value={newKeyLabel}
                        onChange={(e) => setNewKeyLabel(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Gemini API Key <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="AIzaSy..."
                        value={newKeyValue}
                        onChange={(e) => setNewKeyValue(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-600 hover:text-cyan-800 font-medium inline-flex items-center gap-1"
                    >
                      <span>Dapatkan API Key Gratis di Google AI Studio</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold px-5 py-2 rounded-lg text-sm shadow hover:shadow-cyan-500/30 transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Simpan ke Pool</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Key Pool List Table */}
              <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center justify-between">
                  <span>Daftar API Key dalam Pool ({keys.length})</span>
                </h3>

                {keys.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                    <Key className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600">Belum ada API Key di dalam pool.</p>
                    <p className="text-xs text-slate-400 mt-1">Tambahkan API Key dari Google AI Studio di atas agar generator dapat memproses dokumen.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                          <tr>
                            <th className="p-3">Label</th>
                            <th className="p-3">API Key</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Error Count</th>
                            <th className="p-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {keys.map((k) => {
                            const isRevealed = !!showKeyMap[k.id];
                            const masked = k.key.length > 10 
                              ? `${k.key.substring(0, 7)}...${k.key.substring(k.key.length - 4)}` 
                              : k.key;

                            return (
                              <tr key={k.id} className="hover:bg-slate-50/80 transition">
                                <td className="p-3 font-semibold text-slate-800">{k.label}</td>
                                <td className="p-3 font-mono text-xs text-slate-600">
                                  <div className="flex items-center gap-2">
                                    <span>{isRevealed ? k.key : masked}</span>
                                    <button
                                      onClick={() => toggleShowKey(k.id)}
                                      className="text-slate-400 hover:text-slate-600"
                                      title={isRevealed ? "Sembunyikan" : "Tampilkan"}
                                    >
                                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                      onClick={() => copyToClipboard(k.id, k.key)}
                                      className="text-slate-400 hover:text-slate-600"
                                      title="Salin Key"
                                    >
                                      {copiedId === k.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </td>
                                <td className="p-3">
                                  {k.status === 'active' && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                      Aktif
                                    </span>
                                  )}
                                  {k.status === 'disabled' && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                      Nonaktif
                                    </span>
                                  )}
                                  {k.status === 'exhausted' && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                      Limit Exceeded
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center font-semibold text-slate-700">
                                  {k.errorCount || 0}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleToggleStatus(k)}
                                      className={`px-3 py-1 rounded text-xs font-semibold transition ${
                                        k.status === 'active'
                                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                      }`}
                                    >
                                      {k.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                                    </button>
                                    <button
                                      onClick={() => handleDelete(k.id, k.label)}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                                      title="Hapus Key"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* How Pool Works Explanation */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-xs text-blue-900">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Sistem Rotasi API Key (Pool):</p>
                  <p className="leading-relaxed">
                    Setiap akun Google AI Studio Free Tier memiliki kuota per menit (RPM). Dengan menyimpan beberapa API Key dari akun yang berbeda dalam Pool, aplikasi ini akan secara otomatis membagi beban permintaan dan memulihkan error (failover) tanpa mengganggu pembuatan dokumen pengguna.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: RIWAYAT LOGIN PENGGUNA */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-cyan-600" />
                    <span>Daftar Pengguna Terdaftar ({userList.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Riwayat aktivitas login pengguna menggunakan email Gmail ke aplikasi
                  </p>
                </div>
              </div>

              {userList.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Belum ada pengguna terdaftar.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                        <tr>
                          <th className="p-3">Pengguna</th>
                          <th className="p-3">Email Gmail</th>
                          <th className="p-3">Peran</th>
                          <th className="p-3">Terdaftar</th>
                          <th className="p-3">Terakhir Login</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userList.map((u) => (
                          <tr key={u.uid} className="hover:bg-slate-50/80 transition">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                {u.photoURL ? (
                                  <img src={u.photoURL} alt={u.displayName} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                                    {u.displayName?.charAt(0) || 'U'}
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-slate-800 text-sm">{u.displayName}</p>
                                  <p className="text-[11px] text-slate-400 font-mono">UID: {u.uid.substring(0, 10)}...</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-medium text-slate-700">{u.email}</td>
                            <td className="p-3">
                              {u.role === 'admin' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                  Pengguna
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-xs text-slate-600">
                              {formatDate(u.createdAt)}
                            </td>
                            <td className="p-3 text-xs font-medium text-slate-800">
                              <span className="flex items-center gap-1 text-teal-700">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDate(u.lastLoginAt || u.createdAt)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 text-white font-semibold px-6 py-2 rounded-lg text-sm hover:bg-slate-900 transition"
          >
            Tutup Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};
