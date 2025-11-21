
import React, { useState, useRef, useCallback, useEffect } from 'react';
import CameraHandler, { CameraHandlerRef } from './components/CameraHandler';
import ControlPanel from './components/ControlPanel';
import AuthScreen from './components/AuthScreen';
import { detectSignLanguage, detectSignSentence } from './services/geminiService';
import { getCurrentUser, logout } from './services/authService';
import { AppState, HistoryItem, SignDetectionResult, DetectionMode, SignLanguage, User } from './types';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(getCurrentUser());

  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('WORD');
  const [signLanguage, setSignLanguage] = useState<SignLanguage>('ASL');
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  // Audio Settings
  const [isMuted, setIsMuted] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  
  const [currentPrediction, setCurrentPrediction] = useState<SignDetectionResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [frameCount, setFrameCount] = useState(0);
  
  const cameraRef = useRef<CameraHandlerRef>(null);
  const framesBufferRef = useRef<string[]>([]);
  const processingRef = useRef(false);

  // Text-to-Speech
  const speak = useCallback((text: string) => {
    if (isMuted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    window.speechSynthesis.speak(utterance);
  }, [isMuted, speechRate, speechPitch]);

  // Auth Handlers
  const handleLogout = useCallback(async () => {
    setIsCameraActive(false); // Safety: stop camera on logout
    await logout();
    setUser(null);
  }, []);

  // --- Frame Processing Logic ---

  // 1. Handle Single Frame (Word Mode)
  const handleWordDetection = useCallback(async (base64Image: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setAppState(AppState.PROCESSING);

    try {
      const result = await detectSignLanguage(base64Image, signLanguage);
      
      if (result.isSign && result.translation) {
        setCurrentPrediction(result);
        setHistory(prev => {
          const lastItem = prev[prev.length - 1];
          // Simple deduping
          if (!lastItem || lastItem.text.toLowerCase() !== result.translation.toLowerCase()) {
            speak(result.translation);
            return [...prev, {
              id: Date.now().toString(),
              text: result.translation,
              timestamp: Date.now(),
              mode: 'WORD'
            }];
          }
          return prev;
        });
      } else {
        setCurrentPrediction(prev => prev ? { ...prev, description: "No clear sign detected" } : null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      processingRef.current = false;
      setAppState(AppState.SCANNING);
    }
  }, [signLanguage, speak]);

  // 2. Handle Sentence Recording
  const toggleRecording = useCallback(async () => {
    if (appState === AppState.RECORDING) {
      // STOP RECORDING -> PROCESS
      setAppState(AppState.PROCESSING);
      const frames = framesBufferRef.current;
      
      if (frames.length > 0) {
        try {
          const result = await detectSignSentence(frames, signLanguage);
          if (result.isSign) {
            setCurrentPrediction(result);
            speak(result.translation);
            setHistory(prev => [...prev, {
              id: Date.now().toString(),
              text: result.translation,
              timestamp: Date.now(),
              mode: 'SENTENCE'
            }]);
          } else {
             setCurrentPrediction({ isSign: false, translation: "Could not understand sentence", confidence: 0 });
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      framesBufferRef.current = [];
      setFrameCount(0);
      setAppState(AppState.IDLE); // Return to IDLE state for sentence mode
    } else {
      // START RECORDING
      framesBufferRef.current = [];
      setFrameCount(0);
      setAppState(AppState.RECORDING);
    }
  }, [appState, speak, signLanguage]);


  // Central Frame Handler from Camera
  const handleFrameCapture = useCallback((base64Image: string) => {
    if (detectionMode === 'WORD') {
      handleWordDetection(base64Image);
    } else if (detectionMode === 'SENTENCE' && appState === AppState.RECORDING) {
      framesBufferRef.current.push(base64Image);
      setFrameCount(prev => prev + 1);
    }
  }, [detectionMode, appState, handleWordDetection]); // Added handleWordDetection dependency


  // Interval for Sentence Mode Recording (Capture frames every 250ms)
  useEffect(() => {
    let interval: number;
    if (appState === AppState.RECORDING && detectionMode === 'SENTENCE') {
      interval = window.setInterval(() => {
        cameraRef.current?.captureOnce();
      }, 250); // 4 FPS is sufficient for gesture flow
    }
    return () => clearInterval(interval);
  }, [appState, detectionMode]);

  // Authentication Guard
  if (!user) {
    return <AuthScreen onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 pb-10 font-sans">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
             <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">SignLens AI</h1>
            <div className="flex items-center gap-2">
               <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-800 px-1.5 rounded">Gemini 2.5 Flash</span>
               <span className="text-[10px] uppercase tracking-wider text-indigo-300 bg-indigo-900/30 px-1.5 rounded">{signLanguage}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="hidden md:block text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Logged in as</div>
              <div className="text-sm font-bold text-white">{user.name}</div>
           </div>
           <button 
             onClick={handleLogout}
             className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
             title="Logout"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
           </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">
        
        {/* Left Column: Camera */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="relative aspect-[4/3] w-full bg-black rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden group">
            <CameraHandler
              ref={cameraRef}
              isActive={isCameraActive}
              // Auto-scan only in WORD mode and not currently processing
              isAutoMode={isCameraActive && detectionMode === 'WORD' && appState !== AppState.PROCESSING}
              scanIntervalMs={1500} // Faster scanning for words
              onFrameCapture={handleFrameCapture}
            />
            
            {/* Status Overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
               <div className={`px-3 py-1 rounded-full border backdrop-blur-md text-xs font-mono transition-colors ${
                 appState === AppState.RECORDING ? 'bg-red-500/80 border-red-400 text-white animate-pulse' : 'bg-black/60 border-white/10 text-slate-300'
               }`}>
                 {appState === AppState.RECORDING ? '● RECORDING' : detectionMode} MODE
               </div>
               
               {appState === AppState.PROCESSING && (
                  <div className="px-3 py-1 rounded-full bg-indigo-600/80 border border-indigo-400 text-white text-xs font-mono animate-pulse">
                    AI PROCESSING...
                  </div>
               )}
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="md:hidden">
             <ControlPanel 
                appState={appState}
                detectionMode={detectionMode}
                setDetectionMode={setDetectionMode}
                isCameraActive={isCameraActive}
                toggleCamera={() => setIsCameraActive(!isCameraActive)}
                triggerManualCapture={() => cameraRef.current?.captureOnce()}
                toggleRecording={toggleRecording}
                clearHistory={() => setHistory([])}
                isMuted={isMuted}
                toggleMute={() => setIsMuted(!isMuted)}
                frameCount={frameCount}
                signLanguage={signLanguage}
                setSignLanguage={setSignLanguage}
                speechRate={speechRate}
                setSpeechRate={setSpeechRate}
                speechPitch={speechPitch}
                setSpeechPitch={setSpeechPitch}
              />
          </div>

          {/* Prediction Result Card */}
          <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-6 border border-slate-800 shadow-xl min-h-[160px] flex flex-col justify-center items-center text-center">
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">
              {detectionMode === 'SENTENCE' ? 'Translated Sentence' : 'Detected Sign'} ({signLanguage})
            </h3>
            
            {currentPrediction?.isSign ? (
              <div className="animate-in fade-in zoom-in duration-300">
                <div className={`font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-2 ${
                  detectionMode === 'SENTENCE' ? 'text-3xl md:text-4xl leading-tight' : 'text-6xl md:text-7xl'
                }`}>
                  {currentPrediction.translation}
                </div>
                {currentPrediction.description && (
                  <p className="text-slate-400 text-sm max-w-md mx-auto">{currentPrediction.description}</p>
                )}
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400 border border-slate-700">
                  <span>Confidence: {(currentPrediction.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            ) : (
               <div className="flex flex-col items-center text-slate-600 gap-2">
                  {appState === AppState.RECORDING ? (
                    <>
                      <div className="w-12 h-12 rounded-full border-4 border-t-red-500 border-slate-800 animate-spin"></div>
                      <p>Recording gestures...</p>
                    </>
                  ) : (
                    <p className="italic">
                      {detectionMode === 'WORD' ? `Waiting for clear ${signLanguage} sign...` : 'Press Record to start signing'}
                    </p>
                  )}
               </div>
            )}
          </div>
        </div>

        {/* Right Column: History & Controls */}
        <div className="flex-1 flex flex-col gap-6 min-h-[500px]">
          
          <div className="hidden md:block">
             <ControlPanel 
                appState={appState}
                detectionMode={detectionMode}
                setDetectionMode={setDetectionMode}
                isCameraActive={isCameraActive}
                toggleCamera={() => setIsCameraActive(!isCameraActive)}
                triggerManualCapture={() => cameraRef.current?.captureOnce()}
                toggleRecording={toggleRecording}
                clearHistory={() => setHistory([])}
                isMuted={isMuted}
                toggleMute={() => setIsMuted(!isMuted)}
                frameCount={frameCount}
                signLanguage={signLanguage}
                setSignLanguage={setSignLanguage}
                speechRate={speechRate}
                setSpeechRate={setSpeechRate}
                speechPitch={speechPitch}
                setSpeechPitch={setSpeechPitch}
              />
          </div>

          {/* History Panel */}
          <div className="flex-1 bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 sticky top-0 flex justify-between items-center">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Session History
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
              {history.length === 0 && (
                <div className="text-center mt-10 text-slate-600">
                  <p>No translations yet.</p>
                </div>
              )}
              {history.slice().reverse().map((item) => (
                <div key={item.id} className={`flex flex-col p-4 rounded-xl border transition-colors ${
                  item.mode === 'SENTENCE' 
                    ? 'bg-violet-500/10 border-violet-500/30' 
                    : 'bg-slate-800/50 border-slate-700/50'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      item.mode === 'SENTENCE' ? 'bg-violet-500 text-white' : 'bg-cyan-500 text-slate-900'
                    }`}>
                      {item.mode}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-200 text-lg font-medium leading-snug mt-1">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
