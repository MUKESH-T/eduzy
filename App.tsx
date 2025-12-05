import React, { useState, useEffect } from 'react';
import { User, Track, Question, Course, AssessmentResult, SkillLevel, CertificateRecord } from './types';
import Auth from './components/Auth';
import Assessment from './components/Assessment';
import CourseRunner from './components/CourseRunner';
import Chatbot from './components/Chatbot';
import Certificate from './components/Certificate';
import { generateInitialAssessment, evaluateAssessment, generateCourse, generateFinalAssessment } from './services/geminiService';
import { Loader2, Code2, Terminal, Cpu, LayoutDashboard, LogOut, RotateCcw, CheckCircle2, Play, Award, FileText, XCircle } from 'lucide-react';

type ViewState = 'auth' | 'track-select' | 'initial-assessment' | 'evaluating' | 'course-loading' | 'learning' | 'final-exam' | 'certificate' | 'view-certificates';

// Persist progress in memory during session
interface TrackProgress {
  result: AssessmentResult;
  course: Course;
  isCompleted?: boolean;
  finalScore?: number;
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
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  
  // Final Exam State
  const [finalQuestions, setFinalQuestions] = useState<Question[]>([]);
  
  // View Certificate State
  const [activeCertificate, setActiveCertificate] = useState<CertificateRecord | null>(null);

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
    setActiveCertificate(null);
    setView('track-select');
  };

  const handleLogout = () => {
    setUser(null);
    setUserProgress({});
    setCertificates([]);
    setView('auth');
  };

  const startAssessment = async (track: Track, forcedLevel?: SkillLevel) => {
    setIsProcessing(true);
    try {
      const questions = await generateInitialAssessment(track, forcedLevel);
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

    // CHECK: If user has already completed assessment for this track
    if (userProgress[track]) {
      const savedProgress = userProgress[track];
      setAssessmentResult(savedProgress.result);
      setCourse(savedProgress.course);
      
      // If completed, user usually shouldn't be here unless they clicked "Study Again" or logic reset
      // For dashboard clicks on completed items, we might show menu or go to cert? 
      // Current UI has specific buttons for "View Cert" or "Study Again".
      // If they click the main card area:
      if (savedProgress.isCompleted) {
        // If they click the main card on a completed course, show the latest cert
        const cert = certificates.find(c => c.track === track);
        if (cert) {
            setActiveCertificate(cert);
            setView('certificate');
        } else {
            // Fallback (shouldn't happen)
            setView('track-select');
        }
      } else {
        setView('learning');
      }
      return;
    }

    // Otherwise, start new assessment
    await startAssessment(track);
  };

  const handleStudyAgain = async (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    if (window.confirm(`Restart the ${track} course? You will begin with ADVANCED concepts. Your previous certificate will be saved.`)) {
        // Clear progress but keep certificate in `certificates` state
        const newProgress = { ...userProgress };
        delete newProgress[track];
        setUserProgress(newProgress);
        
        setSelectedTrack(track);
        // FORCE ADVANCED LEVEL
        await startAssessment(track, 'Advanced');
    }
  };

  const handleRetakeAssessment = async (e: React.MouseEvent, track: Track) => {
    e.stopPropagation(); 
    if (window.confirm(`Are you sure you want to retake the ${track} initial assessment? This will reset your current progress.`)) {
      const newProgress = { ...userProgress };
      delete newProgress[track];
      setUserProgress(newProgress);
      setSelectedTrack(track);
      await startAssessment(track);
    }
  };

  const handleRetakeFinalExam = async (e: React.MouseEvent, track: Track) => {
      e.stopPropagation();
      if (window.confirm("Do you want to retake the Final Exam?")) {
        setSelectedTrack(track);
        if (userProgress[track]) {
            const prog = userProgress[track];
            setIsProcessing(true);
            try {
                const questions = await generateFinalAssessment(track, prog.course.level);
                setFinalQuestions(questions);
                setCourse(prog.course);
                setView('final-exam');
            } catch (err) {
                console.error(err);
            } finally {
                setIsProcessing(false);
            }
        }
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
          course: generatedCourse,
          isCompleted: false
        }
      }));
      
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
        if (!selectedTrack || !user || !course) return;
        const result = await evaluateAssessment(selectedTrack, finalQuestions, answers);
        
        if (result.score >= 60) {
            // PASS
            const newCert: CertificateRecord = {
                id: `EDUZY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                track: selectedTrack,
                level: course.level,
                score: result.score,
                date: new Date().toLocaleDateString(),
                userName: user.name
            };

            // Save Certificate
            setCertificates(prev => [...prev, newCert]);
            setActiveCertificate(newCert);
            
            // Mark Course as completed
            setUserProgress(prev => ({
                ...prev,
                [selectedTrack]: {
                    ...prev[selectedTrack],
                    isCompleted: true,
                    finalScore: result.score
                }
            }));

            setView('certificate');
        } else {
            // FAIL
            alert("Sorry, you failed the test. Please try again later.");
            handleBackToDashboard(); 
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleViewCertificates = (e: React.MouseEvent, track: Track) => {
      e.stopPropagation();
      // Find latest cert for track or list all? Let's just show latest for simplicity or a list modal.
      // For now, show latest.
      const certs = certificates.filter(c => c.track === track);
      if (certs.length > 0) {
          setActiveCertificate(certs[certs.length - 1]);
          setView('certificate');
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
              { id: 'Python', icon: Terminal, gradient: 'from-yellow-400 to-yellow-600' },
              { id: 'Java', icon: Code2, gradient: 'from-red-400 to-red-600' },
              { id: 'C++', icon: Cpu, gradient: 'from-blue-400 to-blue-700' }
            ].map((trackItem) => {
              const trackId = trackItem.id as Track;
              const progress = userProgress[trackId];
              const hasProgress = !!progress;
              const isCompleted = progress?.isCompleted;
              const hasCertificate = certificates.some(c => c.track === trackId);

              return (
                <div key={trackId} className="relative group">
                  <button
                    onClick={() => handleTrackSelect(trackId)}
                    className="w-full h-full relative overflow-hidden bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all border border-gray-100 text-left flex flex-col"
                  >
                    <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
                      <trackItem.icon size={120} className="text-gray-900" />
                    </div>
                    
                    <div className={`w-14 h-14 bg-gradient-to-br ${trackItem.gradient} rounded-xl flex items-center justify-center mb-6 text-white shadow-lg`}>
                      <trackItem.icon size={28} />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{trackId}</h3>
                    
                    {isCompleted ? (
                        <div className="mt-auto">
                           <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold mb-2 border border-indigo-100">
                             <Award size={12} /> Certified
                           </div>
                           <p className="text-sm text-gray-500 flex items-center gap-1 font-medium group-hover:text-indigo-600 transition-colors">
                              View Certificate <FileText size={14} className="fill-current" />
                           </p>
                        </div>
                    ) : hasProgress ? (
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

                  {/* Context Actions */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                    
                    {/* View Certificate (Always visible if earned, even if studying again) */}
                    {hasCertificate && (
                        <button 
                            onClick={(e) => handleViewCertificates(e, trackId)}
                            className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all bg-white shadow-sm border border-indigo-100"
                            title="View Earned Certificate"
                        >
                            <Award size={16} />
                        </button>
                    )}

                    {/* Reset/Study Again Logic */}
                    {isCompleted ? (
                        <button 
                            onClick={(e) => handleStudyAgain(e, trackId)}
                            className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all bg-white shadow-sm"
                            title="Study Again (Advanced)"
                        >
                            <RotateCcw size={16} />
                        </button>
                    ) : hasProgress && (
                        <button 
                            onClick={(e) => handleRetakeAssessment(e, trackId)}
                            className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-all bg-white shadow-sm"
                            title="Reset Progress"
                        >
                            <XCircle size={16} />
                        </button>
                    )}
                  </div>
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

  if (view === 'certificate' && activeCertificate) {
    return <Certificate data={activeCertificate} onBack={handleBackToDashboard} />;
  }

  return <div>Loading...</div>;
}

export default App;