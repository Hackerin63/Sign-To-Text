
import React from 'react';
import { AppState, DetectionMode, SignLanguage } from '../types';

interface ControlPanelProps {
  appState: AppState;
  detectionMode: DetectionMode;
  setDetectionMode: (mode: DetectionMode) => void;
  isCameraActive: boolean;
  toggleCamera: () => void;
  triggerManualCapture: () => void;
  toggleRecording: () => void;
  clearHistory: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  frameCount: number;
  
  signLanguage: SignLanguage;
  setSignLanguage: (lang: SignLanguage) => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  speechPitch: number;
  setSpeechPitch: (pitch: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  appState,
  detectionMode,
  setDetectionMode,
  isCameraActive,
  toggleCamera,
  triggerManualCapture,
  toggleRecording,
  clearHistory,
  isMuted,
  toggleMute,
  frameCount,
  signLanguage,
  setSignLanguage,
  speechRate,
  setSpeechRate,
  speechPitch,
  setSpeechPitch
}) => {
  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto mt-6 p-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700">
      
      {/* Language Selector */}
      <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg">
        <span className="text-xs font-semibold text-slate-400 pl-2">SIGN LANGUAGE</span>
        <div className="flex gap-2">
          {(['ASL', 'ISL'] as SignLanguage[]).map((lang) => (
             <button
               key={lang}
               onClick={() => setSignLanguage(lang)}
               className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                 signLanguage === lang 
                   ? 'bg-indigo-600 text-white shadow' 
                   : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
               }`}
             >
               {lang}
             </button>
          ))}
        </div>
      </div>

      {/* Top Row: Camera & Mute */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={toggleCamera}
          className={`flex items-center justify-center py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
            isCameraActive 
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' 
              : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
          }`}
        >
          {isCameraActive ? 'Stop Camera' : 'Start Camera'}
        </button>

        <button
          onClick={toggleMute}
          className={`flex items-center justify-center py-3 px-4 rounded-lg font-medium transition-all ${
            isMuted 
              ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' 
              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
          }`}
        >
          {isMuted ? 'Sound Off' : 'Sound On'}
        </button>
      </div>

      {isCameraActive && (
        <div className="flex flex-col gap-4 pt-2 border-t border-slate-700/50">
          
          {/* Mode Switcher */}
          <div className="bg-slate-900/80 p-1 rounded-lg flex">
             <button
                onClick={() => appState !== AppState.RECORDING && setDetectionMode('WORD')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  detectionMode === 'WORD' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                }`}
                disabled={appState === AppState.RECORDING}
             >
               Live Word
             </button>
             <button
                onClick={() => appState !== AppState.RECORDING && setDetectionMode('SENTENCE')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  detectionMode === 'SENTENCE' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                }`}
                disabled={appState === AppState.RECORDING}
             >
               Full Sentence
             </button>
          </div>

          {/* Action Buttons based on Mode */}
          <div className="relative">
            {detectionMode === 'WORD' ? (
              <div className="text-center py-4 bg-cyan-950/30 rounded-xl border border-cyan-500/20">
                 <div className="flex items-center justify-center gap-3 text-cyan-400 mb-1">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                    </span>
                    <span className="font-mono text-sm">AUTO-SCANNING</span>
                 </div>
                 <p className="text-xs text-slate-500">Detecting {signLanguage} signs every 1.5s</p>
              </div>
            ) : (
              <button
                onClick={toggleRecording}
                disabled={appState === AppState.PROCESSING}
                className={`w-full py-6 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3 ${
                  appState === AppState.RECORDING 
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                    : appState === AppState.PROCESSING 
                      ? 'bg-slate-700 text-slate-400 cursor-wait'
                      : 'bg-violet-500 hover:bg-violet-400 text-white shadow-violet-500/25'
                }`}
              >
                {appState === AppState.PROCESSING ? (
                  <span>Processing Video...</span>
                ) : appState === AppState.RECORDING ? (
                  <>
                    <div className="w-4 h-4 bg-white rounded-sm"></div>
                    Stop & Translate ({frameCount})
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 bg-red-200 rounded-full"></div>
                    Hold to Record Sentence
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Speech Settings (Only visible if not muted) */}
      {!isMuted && (
        <div className="space-y-3 pt-2 border-t border-slate-700/50">
          <div className="flex flex-col gap-1">
             <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500">
                <span>Speech Rate</span>
                <span>{speechRate.toFixed(1)}x</span>
             </div>
             <input 
               type="range" 
               min="0.5" 
               max="2" 
               step="0.1" 
               value={speechRate}
               onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
               className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
             />
          </div>
          <div className="flex flex-col gap-1">
             <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500">
                <span>Speech Pitch</span>
                <span>{speechPitch.toFixed(1)}</span>
             </div>
             <input 
               type="range" 
               min="0.5" 
               max="2" 
               step="0.1" 
               value={speechPitch}
               onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
               className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
             />
          </div>
        </div>
      )}

      <button 
        onClick={clearHistory}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors mt-2"
      >
        Clear Translation History
      </button>

    </div>
  );
};

export default ControlPanel;
