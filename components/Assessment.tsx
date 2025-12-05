import React, { useState, useEffect, useRef } from 'react';
import { Question, Track } from '../types';
import { Loader2, ArrowLeft, Camera, AlertCircle, RefreshCw, CheckCircle2, ShieldCheck, UserX, AlertTriangle } from 'lucide-react';
import { detectPeopleCount } from '../services/geminiService';

interface AssessmentProps {
  questions: Question[];
  track: Track;
  title: string;
  isSubmitting: boolean;
  onSubmit: (answers: Record<number, string>) => void;
  enableCamera?: boolean;
  onBack?: () => void;
}

const Assessment: React.FC<AssessmentProps> = ({ 
  questions, 
  track, 
  title, 
  isSubmitting, 
  onSubmit, 
  enableCamera = false,
  onBack
}) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  
  // Camera State
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string | null>(null);
  
  // View State
  const [hasStarted, setHasStarted] = useState(!enableCamera);
  
  // Proctoring State
  const [isPaused, setIsPaused] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null); // Hidden canvas for capturing frames
  const isInitializing = useRef(false);

  // --- Camera Logic ---

  const stopCamera = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
            track.stop();
        });
        streamRef.current = null;
    }
  };

  const startCamera = async (retries = 0) => {
    if (!enableCamera) return;
    if (isInitializing.current) return; // Prevent double-fire

    isInitializing.current = true;
    
    // 1. Cleanup & Wait: Give OS time to release hardware
    stopCamera();
    await new Promise(r => setTimeout(r, 500)); 

    setCameraStatus('loading');
    setCameraErrorMsg(null);

    try {
        // 2. Request Camera
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, // Keep constraints simple
            audio: false 
        });

        // Check if component unmounted during await
        if (!isInitializing.current) {
            stream.getTracks().forEach(t => t.stop());
            return;
        }

        streamRef.current = stream;
        setCameraStatus('ready');
        
        // Force re-attach logic if video ref exists
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Wait for metadata to load before playing
            videoRef.current.onloadedmetadata = async () => {
                try {
                    await videoRef.current?.play();
                } catch (e) {
                    console.warn("Play failed:", e);
                }
            };
        }

    } catch (err: any) {
        console.error("Camera Init Error:", err);
        
        // Retry logic for timeouts
        if (retries < 3 && (err.name === 'NotReadableError' || err.message?.includes('Timeout'))) {
            console.log(`Retrying camera (${retries + 1}/3)...`);
            isInitializing.current = false; // Reset lock
            await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
            startCamera(retries + 1);
            return;
        }

        setCameraStatus('error');
        
        let msg = "Could not start camera.";
        if (err.name === 'NotAllowedError') msg = "Permission denied. Please allow camera access.";
        else if (err.name === 'NotFoundError') msg = "No camera device found.";
        else if (err.name === 'NotReadableError') msg = "Camera is busy/frozen. Please restart browser.";
        else if (err.message && err.message.includes('Timeout')) msg = "Hardware timeout. Please retry.";
        
        setCameraErrorMsg(msg);
    } finally {
        isInitializing.current = false;
    }
  };

  // Attach stream to video element whenever status is ready
  useEffect(() => {
    if (cameraStatus === 'ready' && videoRef.current && streamRef.current) {
        const videoEl = videoRef.current;
        if (videoEl.srcObject !== streamRef.current) {
             videoEl.srcObject = streamRef.current;
             videoEl.onloadedmetadata = () => {
                 videoEl.play().catch(e => console.warn("Autoplay prevented:", e));
             };
        }
    }
  }, [cameraStatus, hasStarted]); // Re-run when switching views

  // Initial startup
  useEffect(() => {
    if (enableCamera) {
        // Small delay on mount to avoid strict mode race conditions
        const t = setTimeout(() => {
            startCamera();
        }, 100);
        return () => {
            clearTimeout(t);
            isInitializing.current = false; // Release lock on unmount
            stopCamera();
        };
    }
    return () => stopCamera();
  }, [enableCamera]);


  // --- Proctoring Logic ---

  useEffect(() => {
      if (!enableCamera || !hasStarted || cameraStatus !== 'ready' || isPaused) return;

      const proctorInterval = setInterval(async () => {
          if (videoRef.current && canvasRef.current) {
              const video = videoRef.current;
              const canvas = canvasRef.current;
              
              if (video.readyState === 4) { // ENOUGH_DATA
                  // Draw frame to canvas
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                      
                      // Convert to base64
                      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                      const base64Data = dataUrl.split(',')[1];
                      
                      // Check people count
                      const peopleCount = await detectPeopleCount(base64Data);
                      
                      if (peopleCount > 1) {
                          handleProctoringViolation();
                      }
                  }
              }
          }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(proctorInterval);
  }, [enableCamera, hasStarted, cameraStatus, isPaused]);

  const handleProctoringViolation = () => {
      setIsPaused(true);
      setWarningCount(prev => prev + 1);
      setShowWarningModal(true);
  };

  const handleResumeExam = () => {
      if (warningCount > 3) {
          // Force Exit
          if (onBack) onBack(); 
          alert("Exam Terminated due to multiple malpractice warnings.");
      } else {
          setShowWarningModal(false);
          setIsPaused(false);
      }
  };


  // --- Event Handlers ---

  const handleRetryCamera = () => {
      startCamera();
  };

  const handleStartExam = () => {
      if (cameraStatus === 'ready') {
          setHasStarted(true);
      }
  };

  const handleAnswer = (val: string) => {
    setAnswers(prev => ({ ...prev, [questions[currentIdx].id]: val }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      onSubmit(answers);
    }
  };

  // --- RENDER: Gating Screen (System Check) ---
  if (enableCamera && !hasStarted) {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-gray-100">
                  <div className="bg-indigo-600 p-6 text-white text-center">
                      <ShieldCheck size={48} className="mx-auto mb-3 text-indigo-200" />
                      <h1 className="text-2xl font-bold">Proctoring Check</h1>
                      <p className="text-indigo-100 text-sm mt-1">Camera verification required.</p>
                  </div>

                  <div className="p-8 flex flex-col items-center">
                      {/* Video Preview Box */}
                      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden mb-6 ring-4 ring-gray-50 shadow-inner">
                          {cameraStatus === 'error' ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gray-900 text-gray-400">
                                  <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                                  <p className="text-red-400 font-medium mb-4">{cameraErrorMsg}</p>
                                  <button 
                                      onClick={handleRetryCamera}
                                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
                                  >
                                      <RefreshCw size={14} /> Retry Camera
                                  </button>
                              </div>
                          ) : (
                              <>
                                <video 
                                    ref={videoRef}
                                    playsInline
                                    muted 
                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                />
                                {cameraStatus === 'loading' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                    </div>
                                )}
                                {cameraStatus === 'ready' && (
                                    <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                                        <CheckCircle2 size={12} /> ACTIVE
                                    </div>
                                )}
                              </>
                          )}
                      </div>

                      <div className="flex gap-4 w-full">
                          {onBack && (
                              <button 
                                  onClick={onBack}
                                  className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                              >
                                  Cancel
                              </button>
                          )}
                          <button
                              onClick={handleStartExam}
                              disabled={cameraStatus !== 'ready'}
                              className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 ${
                                  cameraStatus === 'ready'
                                  ? 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02]' 
                                  : 'bg-gray-400 cursor-not-allowed'
                              }`}
                          >
                              {cameraStatus === 'ready' ? 'Start Exam' : 'Waiting...'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- RENDER: Assessment ---
  
  // Safety check for empty questions
  if (!questions || questions.length === 0) return <div className="p-10 text-center"><Loader2 className="animate-spin inline mr-2"/>Loading...</div>;

  const currentQ = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* Hidden Canvas for Proctoring */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in-50 duration-300">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserX className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Proctoring Warning</h2>
                <p className="text-gray-600 mb-6">
                    Multiple people detected in frame. This is a violation of exam protocols.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                    <p className="font-bold text-red-800">Warning {warningCount} of 3</p>
                    <p className="text-xs text-red-600 mt-1">
                        {warningCount >= 3 ? "Your exam will be terminated next." : "Please ensure you are alone."}
                    </p>
                </div>
                {warningCount > 3 ? (
                    <button 
                        onClick={() => onBack && onBack()}
                        className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                    >
                        Exit Exam
                    </button>
                ) : (
                    <button 
                        onClick={handleResumeExam}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                    >
                        I Understand, Resume Exam
                    </button>
                )}
            </div>
        </div>
      )}

      {/* Header */}
      <div className={`bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm ${isPaused ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="flex items-center gap-4">
             {onBack && (
                <button onClick={onBack} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft size={20} />
                </button>
            )}
            <div>
                <h1 className="font-bold text-gray-800 text-base md:text-lg leading-tight">{title}</h1>
                <p className="text-xs text-gray-500">{track} Track</p>
            </div>
        </div>
        <div className="flex items-center gap-4">
             {enableCamera && (
                 <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium animate-pulse border border-red-100">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    REC
                 </div>
             )}
            <div className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {currentIdx + 1} / {questions.length}
            </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={`w-full bg-gray-200 h-1.5 ${isPaused ? 'blur-sm' : ''}`}>
        <div 
            className="bg-indigo-600 h-1.5 transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }}
        />
      </div>

      <div className={`flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 lg:p-8 gap-6 ${isPaused ? 'blur-sm pointer-events-none select-none' : ''}`}>
        
        {/* Main Question Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-10 flex flex-col order-2 lg:order-1">
             <div className="mb-6 lg:mb-8">
                <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-wider mb-4">
                    {currentQ.type.replace('_', ' ')}
                </span>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">{currentQ.text}</h2>
             </div>

             <div className="flex-1">
                {currentQ.type === 'mcq' && currentQ.options ? (
                    <div className="space-y-3">
                        {currentQ.options.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => handleAnswer(opt)}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                    answers[currentQ.id] === opt 
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-medium' 
                                    : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs flex-shrink-0 ${
                                         answers[currentQ.id] === opt ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                                    }`}>
                                        {String.fromCharCode(65 + i)}
                                    </div>
                                    <span className="text-sm md:text-base">{opt}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <textarea
                        className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none text-base md:text-lg resize-none"
                        placeholder="Type your answer here..."
                        value={answers[currentQ.id] || ''}
                        onChange={(e) => handleAnswer(e.target.value)}
                    />
                )}
             </div>

             <div className="mt-8 flex justify-end">
                <button
                    onClick={handleNext}
                    disabled={!answers[currentQ.id] || isSubmitting}
                    className={`px-8 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-transform active:scale-95 ${
                        !answers[currentQ.id] || isSubmitting
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200'
                    }`}
                >
                    {isSubmitting ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        currentIdx === questions.length - 1 ? 'Finish Exam' : 'Next Question'
                    )}
                </button>
             </div>
        </div>

        {/* Sidebar / Camera (Only if enabled) */}
        {enableCamera && (
             <div className="lg:w-80 flex-shrink-0 flex flex-col gap-4 order-1 lg:order-2">
                <div className="bg-black rounded-2xl overflow-hidden shadow-lg aspect-video relative border-2 border-gray-800 ring-4 ring-gray-100 w-full max-w-sm mx-auto lg:max-w-none">
                    {cameraStatus === 'error' ? (
                         <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-500">
                             <AlertCircle className="w-8 h-8 mb-2" />
                             <p className="text-xs">Camera Error</p>
                             <button onClick={handleRetryCamera} className="mt-2 text-xs text-blue-400 underline">Retry</button>
                         </div>
                    ) : (
                        <video 
                            ref={videoRef}
                            playsInline
                            muted 
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                    )}
                    
                    {cameraStatus === 'loading' && (
                         <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                             <Loader2 className="animate-spin text-white" />
                         </div>
                    )}

                    <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10 pointer-events-none">
                        <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)] ${cameraStatus !== 'ready' ? 'bg-gray-500' : 'bg-red-500'}`}></div>
                        <span className="text-[10px] text-white font-mono uppercase tracking-widest drop-shadow-md">
                            {cameraStatus === 'ready' ? 'LIVE' : 'OFFLINE'}
                        </span>
                    </div>
                </div>

                <div className="hidden lg:block bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                    <p className="font-bold flex items-center gap-2 mb-1">
                        <Camera size={16} /> Session Monitored
                    </p>
                    <p className="opacity-80 text-xs leading-relaxed">
                        Please keep your face within the frame. Multiple people will trigger a violation.
                    </p>
                </div>
             </div>
        )}

      </div>
    </div>
  );
};

export default Assessment;