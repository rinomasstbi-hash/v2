import React from 'react';

export const Footer: React.FC = () => {
    return (
        <footer className="bg-slate-800 mt-12 py-6 no-print">
            <div className="container mx-auto px-4 text-center text-slate-400 text-sm">
                <p>&copy; {new Date().getFullYear()} MTsN 4 Jombang. Didukung oleh Teknologi AI Generatif.</p>
            </div>
        </footer>
    );
};