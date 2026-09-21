import React, { useEffect, useRef, useState } from 'react';
import { Question, Track } from '../types';
import { ArrowLeft, Camera, Loader2, VideoOff } from 'lucide-react';

interface AssessmentProps {
  questions: Question[];
  track: Track;
  title: string;
  isSubmitting: boolean;
  enableCamera?: boolean;
  onSubmit: (answers: Record<number, string>) => void;
  onBack?: () => void;
}

const Assessment: React.FC<AssessmentProps> = ({
  questions,
  track,
  title,
  isSubmitting,
  enableCamera = false,
  onSubmit,
  onBack,
}) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!enableCamera) return;

    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (error) {
        setCameraError(error instanceof Error ? error.message : 'Camera unavailable');
      }
    };

    void startCamera();
    return () => stream?.getTracks().forEach(track => track.stop());
  }, [enableCamera]);

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-600 mb-4" />
        <p className="text-gray-500">Loading Assessment...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isComplete = questions.every(question => answers[question.id]?.trim());
  const selectAnswer = (value: string) => {
    setAnswers(previous => ({ ...previous, [currentQuestion.id]: value }));
  };

  return (
    <div className="max-w-5xl mx-auto p-6 flex gap-6">
      <div className="flex-1">
        <div className="bg-white rounded-xl shadow-lg border border-indigo-100 p-8 relative">
          {onBack && (
            <button onClick={onBack} className="absolute top-8 left-[-60px] p-3 bg-white text-gray-600 rounded-full shadow-md hidden xl:block" title="Back to Dashboard">
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">{currentQuestion.text}</h3>
            {currentQuestion.options?.length ? (
              <div className="space-y-3">
                {currentQuestion.options.map(option => (
                  <button
                    key={option}
                    onClick={() => selectAnswer(option)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${answers[currentQuestion.id] === option ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-200 hover:border-indigo-300'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                placeholder="Type your answer here..."
                value={answers[currentQuestion.id] || ''}
                onChange={event => selectAnswer(event.target.value)}
                className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
              />
            )}
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-gray-100">
            <button onClick={() => setCurrentIndex(index => index - 1)} disabled={currentIndex === 0} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">
              Previous
            </button>
            {currentIndex === questions.length - 1 ? (
              <button onClick={() => onSubmit(answers)} disabled={!isComplete || isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
                Submit Assessment
              </button>
            ) : (
              <button onClick={() => setCurrentIndex(index => index + 1)} className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium">
                Next Question
              </button>
            )}
          </div>
        </div>
      </div>

      {enableCamera && (
        <div className="w-64 hidden lg:block">
          <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-200 sticky top-6">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
              <Camera size={16} className="text-red-500" /> Live Proctoring
            </div>
            <div className="bg-black rounded-lg overflow-hidden aspect-video relative flex items-center justify-center">
              {cameraError ? <VideoOff className="text-gray-400" /> : <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assessment;
