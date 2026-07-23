import React from 'react';

export const Header: React.FC = () => {
    return (
        <header className="bg-slate-800 shadow-lg sticky top-0 z-50 no-print">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                <div className="flex items-center">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Kementerian_Agama_new_logo.png/330px-Kementerian_Agama_new_logo.png" alt="Logo Kemenag" className="h-12 w-12 mr-4" />
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Generator RPM KBC</h1>
                        <p className="text-sm text-cyan-300">MTsN 4 Jombang</p>
                    </div>
                </div>
            </div>
        </header>
    );
};