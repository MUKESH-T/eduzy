import React, { useState, useEffect, useRef } from 'react';
import { Question, Track } from '../types';
import { Loader2, CheckCircle, ArrowLeft, Camera, AlertCircle, VideoOff } from 'lucide-react';

interface AssessmentProps {
  questions: Question[];
  track: Track;
  title: string;
  isSubmitting: boolean;
  enableCamera?: boolean;
  onSubmit: (answers: Record<number, string>) => void;
  onBack?: () => void;
}

const Assessment: React.FC<AssessmentProps> = ({ questions, track, title, isSubmitting, enableCamera, onSubmit, onBack }) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState(false);
  const [cameraErrorMessage, setCameraErrorMessage] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startCamera = async () => {
      if (enableCamera) {
        try {
          // Check if navigator.mediaDevices exists
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
             throw new Error("Media API not available");
          }

          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraError(false);
          setCameraErrorMessage("");
        } catch (err: any) {
          // Handle specific errors gracefully
          setCameraError(true);
          if (err.name === 'NotFoundError' || err.message?.includes('not found')) {
             setCameraErrorMessage("No camera detected");
          } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
             setCameraErrorMessage("Camera permission denied");
          } else {
             setCameraErrorMessage("Camera unavailable");
          }
          // Log as info/warn instead of error to avoid cluttering console with "failures" on devices without cams
          console.warn("Camera initialization skipped:", err.message);
        }
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [enableCamera]);

  const handleOptionSelect = (qId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const isComplete = questions.every(q => answers[q.id]);
  const currentQ = questions[currentIndex];

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-600 mb-4" />
        <p className="text-gray-500">Loading Assessment...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 flex gap-6">
      
      {/* Main Assessment Area */}
      <div className="flex-1">
        <div className="bg-white rounded-xl shadow-lg border border-indigo-100 p-8 relative">
           {onBack && (
            <button 
              onClick={onBack}
              className="absolute top-8 left-[-60px] p-3 bg-white text-gray-600 hover:text-indigo-600 rounded-full shadow-md hover:shadow-lg transition-all hidden xl:block"
              title="Back to Dashboard"
            >
              <ArrowLeft size={24} />
            </button>
           )}

          <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                  {onBack && <button onClick={onBack} className="xl:hidden text-gray-500"><ArrowLeft size={20} /></button>}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                    <p className="text-indigo-500 font-medium">{track} Track</p>
                  </div>
              </div>
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold">
                  Q {currentIndex + 1} / {questions.length}
              </span>
          </div>

          <div className="mb-8 min-h-[200px]">
             <h3 className="text-lg font-medium text-gray-900 mb-4">{currentQ.text}</h3>
             
             {currentQ.type === 'mcq' && currentQ.options && (
               <div className="space-y-3">
                 {currentQ.options.map((opt, idx) => (
                   <button
                     key={idx}
                     onClick={() => handleOptionSelect(currentQ.id, opt)}
                     className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                       answers[currentQ.id] === opt 
                       ? 'border-indigo-600 bg-indigo-50 text-indigo-900' 
                       : 'border-gray-200 hover:border-indigo-300'
                     }`}
                   >
                     {opt}
                   </button>
                 ))}
               </div>
             )}

             {(currentQ.type === 'fill_blank' || currentQ.type === 'logic') && (
               <div className="mt-4">
                  {currentQ.options && currentQ.options.length > 0 ? (
                      <div className="space-y-3">
                      {currentQ.options.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleOptionSelect(currentQ.id, opt)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            answers[currentQ.id] === opt 
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900' 
                            : 'border-gray-200 hover:border-indigo-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                      <input 
                      type="text" 
                      placeholder="Type your answer here..."
                      value={answers[currentQ.id] || ''}
                      onChange={(e) => handleOptionSelect(currentQ.id, e.target.value)}
                      className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                      />
                  )}
               </div>
             )}
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-gray-100">
             <button 
               onClick={handlePrev} 
               disabled={currentIndex === 0}
               className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
             >
               Previous
             </button>
             
             {currentIndex === questions.length - 1 ? (
               <button
                  onClick={() => onSubmit(answers)}
                  disabled={!isComplete || isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
                  Submit Assessment
               </button>
             ) : (
               <button
                  onClick={handleNext}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium"
               >
                  Next Question
               </button>
             )}
          </div>
        </div>
      </div>

      {/* Live Camera Feed Panel - Only show column if enabled, handles errors gracefully */}
      {enableCamera && (
        <div className="w-64 hidden lg:block space-y-4">
            <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-200 sticky top-6">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
                    <Camera size={16} className={`text-red-500 ${!cameraError ? 'animate-pulse' : ''}`} /> 
                    Live Proctoring
                </div>
                <div className="bg-black rounded-lg overflow-hidden aspect-video relative flex items-center justify-center">
                    {cameraError ? (
                        <div className="text-gray-400 text-xs text-center p-4 flex flex-col items-center justify-center h-full w-full bg-gray-900">
                            <VideoOff className="w-8 h-8 mb-2 opacity-50" />
                            <span className="font-semibold text-gray-300 mb-1">{cameraErrorMessage}</span>
                            <span className="opacity-60 text-[10px]">Exam mode active</span>
                        </div>
                    ) : (
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            muted 
                            playsInline 
                            className="w-full h-full object-cover"
                        />
                    )}
                    {!cameraError && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                    {cameraError ? "Session recorded via alternative telemetry." : "Your session is being monitored for authenticity."}
                </p>
            </div>
        </div>
      )}
    </div>
  );
};

export default Assessment;