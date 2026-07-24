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
  const [desktopLayout, setDesktopLayout] = useState<'split' | 'full'>('split');
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

      <main className="max-w-[1600px] mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
        {/* Desktop Layout Mode Switcher */}
        <div className="hidden lg:flex items-center justify-between mb-4 bg-white px-5 py-3 rounded-xl border border-slate-200/80 shadow-sm no-print">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
            <span className="text-sm font-semibold text-slate-700">Mode Tampilan Desktop</span>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-medium">
              {desktopLayout === 'split' ? '2 Bilah (Bilah Samping Form & Hasil)' : '1 Bilah (Layar Penuh)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDesktopLayout('split')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                desktopLayout === 'split'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Mode 2 Bilah
            </button>
            <button
              type="button"
              onClick={() => setDesktopLayout('full')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                desktopLayout === 'full'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Mode 1 Bilah (Layar Penuh)
            </button>
          </div>
        </div>

        {/* Layout Grid */}
        <div className={desktopLayout === 'split' ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" : "block"}>
          
          {/* LEFT PANE: RPM Form */}
          <div className={`
            ${desktopLayout === 'split' ? 'lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1' : ''}
            ${view === 'output' && desktopLayout === 'full' ? 'hidden' : ''}
            ${view === 'output' && desktopLayout === 'split' ? 'hidden lg:block' : 'block'}
          `}>
            <div className="bg-white p-5 sm:p-6 md:p-7 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 no-print">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Formulir Input <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-teal-600">RPM</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Isi parameter untuk menghasilkan dokumen RPM.</p>
                </div>
                {generatedRpm && (
                  <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Dokumen Siap
                  </span>
                )}
              </div>
              <RPMForm onSubmit={handleFormSubmit} isLoading={isLoading} />
            </div>
          </div>

          {/* RIGHT PANE: RPM Output / Preview / Loading */}
          <div className={`
            ${desktopLayout === 'split' ? 'lg:col-span-7 xl:col-span-8 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pl-1' : ''}
            ${view === 'form' && desktopLayout === 'full' ? 'hidden' : ''}
            ${view === 'form' && desktopLayout === 'split' ? 'hidden lg:block' : 'block'}
          `}>
            <div className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 print-container min-h-[550px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 no-print">
                  <h2 className="text-xl md:text-2xl font-bold text-slate-800">
                    Hasil <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-teal-600">RPM</span> Anda
                  </h2>
                  
                  {/* Mobile Back Button */}
                  <div className="flex items-center gap-2">
                    {view === 'output' && (
                      <button
                        onClick={handleBackToForm}
                        className="lg:hidden text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Kembali ke Form
                      </button>
                    )}
                  </div>
                </div>

                {/* State: Loading */}
                {isLoading && (
                  <div className="py-8">
                    <LoadingScreen message={currentLoadingMessage} progress={loadingProgress} color={spinnerColors[colorIndex]} />
                  </div>
                )}

                {/* State: Error */}
                {error && (
                  <div className="py-4">
                    {isConfigError ? <ConfigErrorDisplay message={error} /> : 
                    isServerBusy ? <ServerBusyDisplay /> :
                    <ErrorDisplay message={error} />}
                    
                    <div className="mt-4 no-print">
                      <button
                        onClick={handleBackToForm}
                        className="w-full sm:w-auto text-xs bg-white text-slate-700 font-bold py-2.5 px-5 rounded-lg border border-slate-300 hover:bg-slate-50 transition flex items-center justify-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                        </svg>
                        Kembali ke Formulir
                      </button>
                    </div>
                  </div>
                )}

                {/* State: Generated Content */}
                {!isLoading && !error && generatedRpm && (
                  <div className="mt-2">
                    <RPMOutput 
                      htmlContent={generatedRpm} 
                      isGenerating={isLoading} 
                      onBack={handleBackToForm}
                      showBackButton={desktopLayout === 'full' || view === 'output'}
                    />
                  </div>
                )}

                {/* State: Empty Placeholder */}
                {!isLoading && !error && !generatedRpm && (
                  <div className="my-auto py-20 flex flex-col items-center justify-center text-center p-8 bg-slate-50/80 rounded-2xl border-2 border-dashed border-slate-200/90 no-print">
                    <div className="w-20 h-20 bg-gradient-to-br from-cyan-100 to-teal-100 text-cyan-600 rounded-3xl flex items-center justify-center mb-5 shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Pratinjau Dokumen RPM</h3>
                    <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-6">
                      Isi formulir di bilah sebelah kiri, lalu klik tombol <span className="font-semibold text-cyan-600">"Generate RPM"</span>. Dokumen Rencana Pembelajaran Mendalam Anda akan ditampilkan langsung di sini secara real-time.
                    </p>
                    <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 bg-white px-3.5 py-2 rounded-full border border-slate-200 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Format dokumen A4 otomatis disesuaikan
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
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
