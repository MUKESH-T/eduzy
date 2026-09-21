import React, { useState, useEffect } from 'react';
import { User, Track, Question, Course, AssessmentResult } from './types';
import Auth from './components/Auth';
import Assessment from './components/Assessment';
import CourseRunner from './components/CourseRunner';
import Chatbot from './components/Chatbot';
import Certificate from './components/Certificate';
import { generateInitialAssessment, evaluateAssessment, generateCourse, generateFinalAssessment } from './services/geminiService';
import { Loader2, Code2, Terminal, Cpu, LayoutDashboard, LogOut, RotateCcw, CheckCircle2, Play } from 'lucide-react';

type ViewState = 'auth' | 'track-select' | 'initial-assessment' | 'evaluating' | 'course-loading' | 'learning' | 'final-exam' | 'certificate';

// Persist progress in memory during session
interface TrackProgress {
  result: AssessmentResult;
  course: Course;
}

function App() {
  // State
  const [view, setView] = useState<ViewState>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  
  // Assessment State
  const [initialQuestions, setInitialQuestions] = useState<Question[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  
  // Course State
  const [course, setCourse] = useState<Course | null>(null);
  const [userProgress, setUserProgress] = useState<Record<string, TrackProgress>>({});
  
  // Final Exam State
  const [finalQuestions, setFinalQuestions] = useState<Question[]>([]);
  const [finalScore, setFinalScore] = useState(0);

  // Loading States
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Handlers ---

  const handleLogin = (u: User) => {
    setUser(u);
    setView('track-select');
  };

  const handleBackToDashboard = () => {
    // Reset current view state but keep user and progress
    setCourse(null);
    setAssessmentResult(null);
    setSelectedTrack(null);
    setInitialQuestions([]);
    setFinalQuestions([]);
    setFinalScore(0);
    setView('track-select');
  };

  const handleLogout = () => {
    setUser(null);
    setUserProgress({});
    setView('auth');
  };

  const startAssessment = async (track: Track) => {
    setIsProcessing(true);
    try {
      const questions = await generateInitialAssessment(track);
      setInitialQuestions(questions);
      setView('initial-assessment');
    } catch (e) {
      console.error(e);
      alert("Failed to generate assessment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTrackSelect = async (track: Track) => {
    setSelectedTrack(track);

    // CHECK: If user has already completed assessment for this track, skip to course
    if (userProgress[track]) {
      const savedProgress = userProgress[track];
      setAssessmentResult(savedProgress.result);
      setCourse(savedProgress.course);
      setView('learning');
      return;
    }

    // Otherwise, start new assessment
    await startAssessment(track);
  };

  const handleRetakeAssessment = async (e: React.MouseEvent, track: Track) => {
    e.stopPropagation(); // Prevent triggering the card click
    
    if (window.confirm(`Are you sure you want to retake the ${track} assessment? This will reset your current course progress.`)) {
      // Clear saved progress
      const newProgress = { ...userProgress };
      delete newProgress[track];
      setUserProgress(newProgress);
      
      setSelectedTrack(track);
      await startAssessment(track);
    }
  };

  const handleInitialAssessmentSubmit = async (answers: Record<number, string>) => {
    setIsProcessing(true);
    setView('evaluating');
    try {
      if (!selectedTrack) return;
      
      // 1. Evaluate
      const result = await evaluateAssessment(selectedTrack, initialQuestions, answers);
      setAssessmentResult(result);
      
      // 2. Generate Course
      const generatedCourse = await generateCourse(selectedTrack, result.level, result.weakAreas);
      setCourse(generatedCourse);

      // 3. Save Progress
      setUserProgress(prev => ({
        ...prev,
        [selectedTrack]: {
          result: result,
          course: generatedCourse
        }
      }));
      
      // Artificial delay to let user read evaluation if we showed it, but let's jump to intro
      setView('course-loading'); 
      setTimeout(() => setView('learning'), 2000);

    } catch (e) {
      console.error(e);
      alert("Error evaluating results.");
      setView('track-select');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCourseComplete = async () => {
    setIsProcessing(true);
    try {
        if (!selectedTrack || !course) return;
        const questions = await generateFinalAssessment(selectedTrack, course.level);
        setFinalQuestions(questions);
        setView('final-exam');
    } catch (e) {
        console.error(e);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleFinalExamSubmit = async (answers: Record<number, string>) => {
    setIsProcessing(true);
    try {
        if (!selectedTrack) return;
        const result = await evaluateAssessment(selectedTrack, finalQuestions, answers);
        
        if (result.score >= 60) {
            setFinalScore(result.score);
            setView('certificate');
        } else {
            alert(`You scored ${result.score}%. You need 60% to pass. Please review the course and try again.`);
            setView('learning');
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsProcessing(false);
    }
  };

  // --- Render Views ---

  if (view === 'auth') {
    return <Auth onLogin={handleLogin} />;
  }

  if (view === 'track-select') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-6 right-6">
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 flex items-center gap-2 text-sm font-medium transition-colors">
                <LogOut size={16} /> Logout
            </button>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome, {user?.name}</h1>
        <p className="text-gray-600 mb-12 text-center max-w-md">Choose a programming track to begin your adaptive learning journey.</p>
        
        {isProcessing ? (
           <div className="flex flex-col items-center">
             <Loader2 className="animate-spin w-12 h-12 text-indigo-600 mb-4" />
             <p className="text-indigo-600 font-medium animate-pulse">Generating Content...</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
            {[
              { id: 'Python', icon: Terminal, color: 'bg-yellow-500', gradient: 'from-yellow-400 to-yellow-600' },
              { id: 'Java', icon: Code2, color: 'bg-red-500', gradient: 'from-red-400 to-red-600' },
              { id: 'C++', icon: Cpu, color: 'bg-blue-600', gradient: 'from-blue-400 to-blue-700' }
            ].map((track) => {
              const hasProgress = !!userProgress[track.id];
              return (
                <div key={track.id} className="relative group">
                  <button
                    onClick={() => handleTrackSelect(track.id as Track)}
                    className="w-full h-full relative overflow-hidden bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all border border-gray-100 text-left flex flex-col"
                  >
                    <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
                      <track.icon size={120} className="text-gray-900" />
                    </div>
                    
                    <div className={`w-14 h-14 bg-gradient-to-br ${track.gradient} rounded-xl flex items-center justify-center mb-6 text-white shadow-lg`}>
                      <track.icon size={28} />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{track.id}</h3>
                    
                    {hasProgress ? (
                       <div className="mt-auto">
                         <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold mb-2 border border-green-100">
                           <CheckCircle2 size={12} /> Course Ready
                         </div>
                         <p className="text-sm text-gray-500 flex items-center gap-1 font-medium group-hover:text-indigo-600 transition-colors">
                            Continue Learning <Play size={14} className="fill-current" />
                         </p>
                       </div>
                    ) : (
                       <p className="text-gray-500 text-sm mt-auto">Start with AI Assessment</p>
                    )}
                  </button>

                  {/* Retake Button for existing courses */}
                  {hasProgress && (
                    <button 
                      onClick={(e) => handleRetakeAssessment(e, track.id as Track)}
                      className="absolute top-4 right-4 p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all z-10"
                      title="Retake Assessment"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (view === 'initial-assessment') {
    return (
      <Assessment 
        questions={initialQuestions}
        track={selectedTrack!}
        title="Initial Proficiency Assessment"
        isSubmitting={isProcessing}
        onSubmit={handleInitialAssessmentSubmit}
        onBack={handleBackToDashboard}
      />
    );
  }

  if (view === 'evaluating' || view === 'course-loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-900 text-white p-6">
        <Loader2 className="animate-spin w-16 h-16 mb-8 text-indigo-400" />
        <h2 className="text-3xl font-bold mb-4">
            {view === 'evaluating' ? 'AI is Analyzing Your Performance...' : 'Building Your Personalized Course...'}
        </h2>
        
        {assessmentResult && (
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl max-w-lg w-full mt-4 border border-white/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                    <span className="text-indigo-200">Assessment Score</span>
                    <span className="text-3xl font-bold">{assessmentResult.score}%</span>
                </div>
                <div className="space-y-2">
                    <p><strong>Skill Level:</strong> <span className="text-yellow-300 font-bold ml-2">{assessmentResult.level}</span></p>
                    <p className="text-sm text-gray-300 mt-2">{assessmentResult.feedback}</p>
                    {assessmentResult.weakAreas.length > 0 && (
                      <div className="mt-4 bg-black/20 p-3 rounded-lg">
                        <p className="text-xs text-indigo-300 uppercase font-bold mb-1">Focus Areas</p>
                        <p className="text-sm">{assessmentResult.weakAreas.join(', ')}</p>
                      </div>
                    )}
                </div>
            </div>
        )}
      </div>
    );
  }

  if (view === 'learning' && course) {
    return (
      <>
        <nav className="fixed top-0 w-full bg-white z-40 border-b border-gray-200 px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-6">
                <div className="font-bold text-xl text-indigo-800 tracking-tight">EDUZY <span className="text-gray-400 font-normal text-sm">| {course.track}</span></div>
                <button 
                  onClick={handleBackToDashboard}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 font-medium px-3 py-1 rounded-md hover:bg-indigo-50 transition-colors"
                >
                  <LayoutDashboard size={16} /> Dashboard
                </button>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-800">{user?.name}</p>
                    <p className="text-xs text-gray-500">{course.level} Track</p>
                </div>
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold shadow-inner">
                    {user?.name[0]}
                </div>
            </div>
        </nav>
        <CourseRunner course={course} onComplete={handleCourseComplete} />
        <Chatbot />
      </>
    );
  }

  if (view === 'final-exam') {
    return (
        <Assessment 
        questions={finalQuestions}
        track={selectedTrack!}
        title="Final Certification Exam"
        isSubmitting={isProcessing}
        onSubmit={handleFinalExamSubmit}
        enableCamera={true}
        onBack={handleBackToDashboard}
      />
    );
  }

  if (view === 'certificate' && course && user) {
    return <Certificate user={user} course={course} score={finalScore} onBack={handleBackToDashboard} />;
  }

  return <div>Loading...</div>;
}

export default App;