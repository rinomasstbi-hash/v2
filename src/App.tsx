import React, { useState, useCallback, useEffect } from 'react';
import { RPMForm } from './components/RPMForm';
import { RPMOutput } from './components/RPMOutput';
import { LoadingScreen } from './components/LoadingScreen';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { HistoryModal } from './components/HistoryModal';
import type { RPMInput, UserProfile } from './types';
import { generateRPM, MISSING_API_KEY_ERROR } from './services/geminiService';
import { Notification } from './components/Notification';
import { auth, onAuthStateChanged, syncUserProfile, getLocalSessionUser } from './lib/firebase';
import { saveRpmHistory } from './services/apiKeyService';

const loadingMessages = [
  'Menganalisis tujuan pembelajaran...',
  'Merancang kegiatan inti yang menarik...',
  'Menyiapkan placeholder untuk visual...',
  'Mengintegrasikan nilai-nilai KBC...',
  'Menyiapkan asesmen dan lampiran...',
  'Menyelesaikan dokumen akhir...',
];

const spinnerColors = [
  'text-cyan-500',
  'text-indigo-500',
  'text-purple-500',
  'text-pink-500',
  'text-orange-500',
  'text-teal-500',
];

const ErrorDisplay = ({ message }: { message: string }) => (
    <div className="bg-red-50 text-red-800 p-4 rounded-lg border-l-4 border-red-500 flex items-start space-x-3" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
            <p className="font-bold">Terjadi Kesalahan</p>
            <p className="text-sm">{message}</p>
        </div>
    </div>
);

const ConfigErrorDisplay = ({ message }: { message: string }) => (
    <div className="bg-amber-50 text-amber-900 p-4 rounded-lg border-l-4 border-amber-500 flex items-start space-x-3" role="alert">
       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
           <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
           <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
       </svg>
        <div>
            <p className="font-bold">Konfigurasi Dibutuhkan</p>
            <p className="text-sm">{message}</p>
        </div>
    </div>
);

const ServerBusyDisplay = () => (
    <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center gap-4 mb-6" role="alert">
        <div className="bg-orange-100 p-2 rounded-full flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </div>
        <div>
            <h3 className="text-orange-900 font-bold mb-1">Server Google AI Sedang Sibuk</h3>
            <p className="text-orange-800 text-sm">
                Sistem tertunda karena antrean yang tinggi. Silakan tunggu 1 hingga 2 menit dan coba lagi.
            </p>
        </div>
    </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatedRpm, setGeneratedRpm] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isConfigError, setIsConfigError] = useState<boolean>(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(loadingMessages[0]);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [view, setView] = useState<'form' | 'output'>('form');
  const [showNotification, setShowNotification] = useState<boolean>(true);
  const [colorIndex, setColorIndex] = useState<number>(0);
  const [isServerBusy, setIsServerBusy] = useState<boolean>(false);

  // Modals state
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Listen to Auth State
  useEffect(() => {
    const localUser = getLocalSessionUser();
    if (localUser) {
      setUser(localUser);
      setIsAuthChecking(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const profile = await syncUserProfile(currentUser);
          setUser(profile);
        } catch (err) {
          console.error("Gagal menyinkronkan profil user:", err);
          setUser({
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || 'Pengguna',
            photoURL: currentUser.photoURL || undefined,
            role: currentUser.email === 'rinomasstbi@gmail.com' ? 'admin' : 'user'
          });
        }
      } else {
        setUser(null);
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFormSubmit = useCallback(async (data: RPMInput) => {
    setView('output');
    setIsLoading(true);
    setGeneratedRpm('');
    setError(null);
    setIsConfigError(false);
    setIsServerBusy(false);
    setLoadingProgress(0);
    setCurrentLoadingMessage(loadingMessages[0]);
    setColorIndex(0);

    let fullOutput = '';

    try {
      const stream = await generateRPM(data);
      let chunkCount = 0;
      const messageChangeChunkInterval = 10; 
      
      setTimeout(() => setLoadingProgress(5), 100);

      for await (const chunk of stream) {
        const textChunk = chunk.text || '';
        fullOutput += textChunk;
        setGeneratedRpm(prev => prev + textChunk);
        
        setLoadingProgress(prev => Math.min(95, prev + (95 - prev) * 0.05));

        chunkCount++;
        const nextMessageIndex = Math.min(loadingMessages.length - 1, Math.floor(chunkCount / messageChangeChunkInterval));
        setCurrentLoadingMessage(loadingMessages[nextMessageIndex]);
        setColorIndex(nextMessageIndex);
      }

      // Automatically save to history if generation completed and user logged in
      if (user && fullOutput.trim() !== '') {
        saveRpmHistory(
          user.uid,
          data.teacherName,
          data.subject,
          data.className,
          data.subjectMatter,
          fullOutput
        );
      }

    } catch (e: any) {
      console.error(e);
      
      let errorMessage = 'Gagal menghasilkan RPM. Terjadi kesalahan yang tidak diketahui.';
      if (e instanceof Error) {
        if (e.message === MISSING_API_KEY_ERROR) {
            setIsConfigError(true);
            errorMessage = e.message;
        } else if (e.message === 'SERVER_BUSY' || e.message.includes('503') || e.message.includes('UNAVAILABLE') || (typeof e.message === 'string' && e.message.includes('high demand'))) {
            setIsServerBusy(true);
            errorMessage = 'Server Google AI (Gemini) saat ini sedang sangat sibuk.';
        } else {
            errorMessage = e.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoadingProgress(100);
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  }, [user]);

  const handleBackToForm = useCallback(() => {
    setView('form');
  }, []);

  const handleSelectHistoryItem = useCallback((htmlContent: string) => {
    setGeneratedRpm(htmlContent);
    setView('output');
  }, []);

  // Show Auth Loading Screen
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-300 font-medium text-sm">Memeriksa autentikasi...</p>
      </div>
    );
  }

  // Show Login Screen if not logged in
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen text-slate-800 font-sans">
      <Header 
        user={user}
        onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      <main className="container mx-auto p-4 md:p-8 lg:p-12">
        {view === 'form' ? (
          <div className="bg-white p-8 rounded-xl shadow-2xl shadow-slate-200/50 border border-slate-200/50 no-print">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Formulir Input <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-teal-600">RPM</span></h2>
            <p className="mb-8 text-slate-500">Isi semua kolom di bawah ini untuk menghasilkan Rencana Pembelajaran Mendalam (RPM) secara otomatis.</p>
            <RPMForm onSubmit={handleFormSubmit} isLoading={isLoading} />
          </div>
        ) : (
          <div className="bg-white p-8 rounded-xl shadow-2xl shadow-slate-200/50 border border-slate-200/50 print-container">
             <h2 className="text-3xl font-bold text-slate-800 mb-6 no-print">Hasil <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-teal-600">RPM</span> Anda</h2>
            
            {isLoading && <LoadingScreen message={currentLoadingMessage} progress={loadingProgress} color={spinnerColors[colorIndex]} />}

            {error && (
                isConfigError ? <ConfigErrorDisplay message={error} /> : 
                isServerBusy ? <ServerBusyDisplay /> :
                <ErrorDisplay message={error} />
            )}

            {!isLoading && !error && generatedRpm && (
                <div className="mt-6">
                  <RPMOutput 
                      htmlContent={generatedRpm} 
                      isGenerating={isLoading} 
                      onBack={handleBackToForm}
                      showBackButton={true}
                  />
                </div>
            )}
            
            {!isLoading && error && (
                 <div className="mt-6 no-print">
                    <button
                        onClick={handleBackToForm}
                        className="w-full sm:w-auto bg-white text-slate-700 font-bold py-3 px-6 rounded-lg border-2 border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 flex items-center justify-center gap-2 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Kembali ke Formulir
                    </button>
                </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* Admin Dashboard Modal */}
      {user.role === 'admin' && (
        <AdminDashboardModal 
          isOpen={isAdminDashboardOpen}
          onClose={() => setIsAdminDashboardOpen(false)}
          userEmail={user.email}
        />
      )}

      {/* History Modal */}
      <HistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        userId={user.uid}
        onSelectHistoryItem={handleSelectHistoryItem}
      />
    </div>
  );
};

export default App;
