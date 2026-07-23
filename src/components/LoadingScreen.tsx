import React from 'react';

interface LoadingScreenProps {
  message: string;
  progress: number;
  color: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message, progress, color }) => {
  const progressColor = progress > 95 ? 'text-green-500' : color;
  const textColor = progress > 95 ? 'text-green-600' : color.replace('500', '600');

  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-lg">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            className="text-slate-200"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r="40"
            cx="50"
            cy="50"
          />
          {/* Progress circle */}
          <circle
            className={`${progressColor} transition-colors duration-500 ease-in-out`}
            strokeWidth="8"
            strokeDasharray={2 * Math.PI * 40}
            strokeDashoffset={2 * Math.PI * 40 * (1 - progress / 100)}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="40"
            cx="50"
            cy="50"
            style={{ transitionProperty: 'stroke-dashoffset, stroke', transitionDuration: '0.5s', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${textColor} transition-colors duration-500 ease-in-out`}>
          {Math.floor(progress)}%
        </span>
      </div>
      <p className="mt-6 text-slate-700 font-semibold text-lg">AI sedang bekerja keras...</p>
      <p className="mt-2 text-sm text-slate-500 text-center w-full max-w-xs transition-opacity duration-500">{message}</p>
    </div>
  );
};