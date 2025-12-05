import React, { useState } from 'react';
import { Course, Module, Activity } from '../types';
import { PlayCircle, Check, ChevronRight, Book, Code, List, Award, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; 

interface CourseRunnerProps {
  course: Course;
  onComplete: () => void;
}

const CourseRunner: React.FC<CourseRunnerProps> = ({ course, onComplete }) => {
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);

  // Safety check: Ensure modules exist
  if (!course || !course.modules || course.modules.length === 0) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
              <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
              <h2 className="text-xl font-bold text-gray-800">Course Content Unavailable</h2>
              <p className="text-gray-600 mt-2">The AI could not generate the modules correctly.</p>
              <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg">
                  Refresh & Try Again
              </button>
          </div>
      );
  }

  const activeModule = course.modules[activeModuleIdx];
  
  // Safety check: Ensure active module exists
  if (!activeModule) {
       return <div className="p-8 text-center">Loading module...</div>;
  }

  const isLastModule = activeModuleIdx === course.modules.length - 1;

  // Safety check: Ensure activities exist
  const activities = activeModule.activities || [];

  const handleActivitySubmit = (actIdx: number, isCorrect: boolean) => {
    if (isCorrect) {
        const id = `${activeModule.id}-act-${actIdx}`;
        setCompletedActivities(prev => new Set(prev).add(id));
    }
  };

  const allActivitiesComplete = activities.every((_, idx) => 
    completedActivities.has(`${activeModule.id}-act-${idx}`)
  );

  const handleNextModule = () => {
    if (isLastModule) {
        onComplete();
    } else {
        setActiveModuleIdx(prev => prev + 1);
        window.scrollTo(0,0);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 pt-20 px-4 gap-6 max-w-7xl mx-auto pb-20">
      {/* Sidebar: Modules List */}
      <div className="md:w-1/4 flex-shrink-0">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-24 overflow-hidden">
          <div className="p-4 bg-indigo-50 border-b border-indigo-100">
            <h3 className="font-bold text-indigo-900">{course.track} Course</h3>
            <span className="text-xs font-medium px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded-full">{course.level}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {course.modules.map((mod, idx) => (
              <button
                key={mod.id || idx}
                onClick={() => setActiveModuleIdx(idx)}
                className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${
                  idx === activeModuleIdx 
                    ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === activeModuleIdx ? 'bg-indigo-600 text-white' : 'bg-gray-200'
                }`}>
                    {idx + 1}
                </div>
                <span className="text-sm font-medium line-clamp-1">{mod.title}</span>
                {idx < activeModuleIdx && <Check size={14} className="ml-auto text-green-500" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:w-3/4 space-y-8">
        {/* Lesson Header */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <Book size={20} />
                <span className="font-semibold uppercase tracking-wide text-sm">Module {activeModuleIdx + 1}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{activeModule.title}</h1>
            <p className="text-gray-600 text-lg leading-relaxed">{activeModule.description}</p>
        </div>

        {/* Video Rec */}
        {activeModule.videoRecommendation && (
            <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center gap-6 shadow-lg">
                <div className="p-4 bg-white/10 rounded-full">
                    <PlayCircle size={40} className="text-red-500 bg-white rounded-full" />
                </div>
                <div className="flex-1">
                    <h4 className="text-lg font-semibold mb-1">Recommended Watch</h4>
                    <p className="text-slate-300 text-sm mb-3">Topic: {activeModule.videoRecommendation.title}</p>
                    <a 
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(activeModule.videoRecommendation.searchQuery)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-indigo-300 hover:text-indigo-200 underline"
                    >
                        Find on YouTube <ExternalLink size={14} />
                    </a>
                </div>
            </div>
        )}

        {/* Core Content */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 prose prose-indigo max-w-none">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Lesson Notes</h3>
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed font-sans">
                {activeModule.content}
            </div>
            
            {activeModule.examples && activeModule.examples.length > 0 && (
                <div className="mt-8 space-y-6">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Code size={24} className="text-indigo-600" /> Examples
                    </h3>
                    {activeModule.examples.map((ex, i) => (
                        <div key={i} className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-sm font-mono text-green-400">{ex}</pre>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Activities */}
        {activities.length > 0 && (
            <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <List size={28} className="text-indigo-600" /> Interactive Tasks
                </h3>
                
                {activities.map((act, idx) => (
                    <ActivityCard 
                        key={`${activeModule.id}-act-${idx}`} 
                        activity={act} 
                        onComplete={(success) => handleActivitySubmit(idx, success)}
                        isCompleted={completedActivities.has(`${activeModule.id}-act-${idx}`)}
                    />
                ))}
            </div>
        )}

        {/* Navigation Footer */}
        <div className="flex justify-end pt-8">
            <button
                onClick={handleNextModule}
                className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
                    allActivitiesComplete 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!allActivitiesComplete}
            >
                {isLastModule ? "Take Final Exam" : "Next Module"}
                {isLastModule ? <Award size={24} /> : <ChevronRight size={24} />}
            </button>
        </div>
      </div>
    </div>
  );
};

const ActivityCard: React.FC<{ activity: Activity, onComplete: (s: boolean) => void, isCompleted: boolean }> = ({ activity, onComplete, isCompleted }) => {
    const [userAnswer, setUserAnswer] = useState('');
    const [feedback, setFeedback] = useState<string | null>(null);
    const [dragItems, setDragItems] = useState<string[]>(activity.data || []);

    const handleSubmit = () => {
        let correct = false;
        
        // --- RELAXED VALIDATION LOGIC ---
        
        // 1. Normalize
        const cleanUser = userAnswer.trim().toLowerCase().replace(/[.,!?;:]/g, '');
        const cleanCorrect = activity.correctAnswer.trim().toLowerCase().replace(/[.,!?;:]/g, '');
        
        if (activity.type === 'drag_drop') {
            // Very forgiving for drag drop (usually checks order)
            // If the first item matches the first item of correct answer string (if it were parsed), or simplified check
            // Here assuming standard string comparison for simplicity in this demo structure
            if (activity.correctAnswer.toLowerCase().includes(dragItems[0].toLowerCase())) correct = true; 
        } else {
            // 2. Direct Match
            if (cleanUser === cleanCorrect) {
                correct = true;
            }
            // 3. Substring Match (e.g. User: "print" vs Correct: "print function")
            else if (cleanUser.length > 2 && (cleanCorrect.includes(cleanUser) || cleanUser.includes(cleanCorrect))) {
                correct = true;
            }
            // 4. Keyword Match (e.g. User: "It is a loop" vs Correct: "For Loop")
            else {
                const userWords = cleanUser.split(/\s+/);
                const correctWords = cleanCorrect.split(/\s+/);
                
                // Filter out small words (stop words) to avoid false positives on "a", "the", "is"
                const significantCorrectWords = correctWords.filter(w => w.length > 3);
                
                // If user has typed ANY significant word from the answer, we accept it.
                if (significantCorrectWords.some(w => userWords.includes(w))) {
                    correct = true;
                }
            }
        }

        if (correct) {
            setFeedback("Correct! Great job.");
            onComplete(true);
        } else {
            setFeedback("Not quite. Try again! " + (activity.hint ? `Hint: ${activity.hint}` : ""));
            onComplete(false); 
        }
    };

    // Drag and drop simple swap handler
    const moveItem = (from: number, to: number) => {
        const newItems = [...dragItems];
        const [moved] = newItems.splice(from, 1);
        newItems.splice(to, 0, moved);
        setDragItems(newItems);
    };

    return (
        <div className={`p-6 rounded-xl border-2 transition-all ${isCompleted ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">{activity.type.replace('_', ' ')}</span>
                    <p className="font-semibold text-gray-800 mt-1">{activity.prompt}</p>
                </div>
                {isCompleted && <CheckCircleIcon className="text-green-600" />}
            </div>

            {/* Render based on type */}
            {!isCompleted && (
                <div className="mt-4">
                    {activity.type === 'drag_drop' ? (
                        <div className="space-y-2">
                            {dragItems.map((item, i) => (
                                <div key={i} className="flex gap-2">
                                     <div className="bg-gray-100 p-3 rounded-lg flex-1 cursor-move border border-gray-300">
                                        {item}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {i > 0 && <button onClick={() => moveItem(i, i-1)} className="text-xs bg-gray-200 p-1">▲</button>}
                                        {i < dragItems.length -1 && <button onClick={() => moveItem(i, i+1)} className="text-xs bg-gray-200 p-1">▼</button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : activity.type === 'fix_error' ? (
                        <div>
                             <textarea 
                                className="w-full font-mono text-sm bg-slate-900 text-white p-4 rounded-lg"
                                rows={4}
                                value={userAnswer}
                                onChange={e => setUserAnswer(e.target.value)}
                                placeholder="// Fix the code here..."
                             />
                        </div>
                    ) : (
                        <input 
                            type="text" 
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Type answer..."
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                        />
                    )}

                    {feedback && (
                        <p className={`mt-3 text-sm font-medium ${feedback.startsWith('Correct') ? 'text-green-600' : 'text-red-600'}`}>
                            {feedback}
                        </p>
                    )}

                    <button 
                        onClick={handleSubmit}
                        className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
                    >
                        Check Answer
                    </button>
                </div>
            )}
        </div>
    );
};

const CheckCircleIcon = ({className}: {className?: string}) => (
    <svg className={`w-6 h-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default CourseRunner;