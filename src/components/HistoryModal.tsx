import React, { useState, useEffect } from 'react';
import { RpmHistoryItem } from '../types';
import { fetchUserRpmHistory, deleteRpmHistoryItem } from '../services/apiKeyService';
import { FileText, Trash2, Eye, Calendar, User, BookOpen, X, Clock } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSelectHistoryItem: (htmlContent: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSelectHistoryItem
}) => {
  const [historyList, setHistoryList] = useState<RpmHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadHistory();
    }
  }, [isOpen, userId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const items = await fetchUserRpmHistory(userId);
      setHistoryList(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Apakah Anda yakin ingin menghapus dokumen ini dari riwayat tersimpan?")) {
      try {
        await deleteRpmHistoryItem(id);
        setHistoryList(prev => prev.filter(item => item.id !== id));
      } catch (err) {
        alert("Gagal menghapus riwayat.");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="bg-slate-800 text-white p-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Riwayat Dokumen RPM Tersimpan</h2>
              <p className="text-xs text-slate-300">Daftar dokumen Rencana Pembelajaran Mendalam yang telah Anda buat</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <div className="w-8 h-8 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium">Memuat riwayat dokumen...</p>
            </div>
          ) : historyList.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-700">Belum Ada Riwayat Dokumen</p>
              <p className="text-xs text-slate-400 mt-1">Dokumen RPM yang Anda buat akan tersimpan di sini secara otomatis.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyList.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    onSelectHistoryItem(item.htmlContent);
                    onClose();
                  }}
                  className="bg-slate-50 hover:bg-cyan-50/50 border border-slate-200 hover:border-cyan-300 p-4 rounded-xl transition cursor-pointer group flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-base group-hover:text-cyan-700 transition">
                        {item.subject} - Kelas {item.className}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1 font-medium">
                      Materi: {item.subjectMatter}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {item.teacherName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(item.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, item.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="Hapus dari riwayat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="bg-white group-hover:bg-cyan-600 group-hover:text-white p-2 rounded-lg border border-slate-200 text-slate-600 transition">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 text-white font-semibold px-5 py-2 rounded-lg text-sm hover:bg-slate-900 transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
