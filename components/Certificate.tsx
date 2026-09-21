import React from 'react';
import { User, Course } from '../types';
import { Download, ArrowLeft, Home } from 'lucide-react';

interface CertificateProps {
  user: User;
  course: Course;
  score: number;
  onBack: () => void;
}

const Certificate: React.FC<CertificateProps> = ({ user, course, score, onBack }) => {
  const date = new Date().toLocaleDateString();
  const certId = `EDUZY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
      
      {/* Navigation - No Print */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 no-print">
        <button 
            onClick={onBack}
            className="text-white/80 hover:text-white flex items-center gap-2 transition-colors"
        >
            <ArrowLeft size={20} /> Back to Dashboard
        </button>
      </div>

      <div className="mb-8 text-center text-white no-print">
        <h2 className="text-3xl font-bold mb-2">Congratulations, {user.name}!</h2>
        <p className="text-gray-400">You have successfully completed the course.</p>
      </div>

      {/* Certificate Frame - Print Area */}
      <div className="print-area bg-white p-2 rounded-lg shadow-2xl max-w-4xl w-full">
        <div className="border-8 border-double border-indigo-900 p-10 flex flex-col items-center text-center bg-slate-50 relative">
          
          {/* Watermark/Logo */}
          <div className="absolute opacity-5 pointer-events-none top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
             <h1 className="text-9xl font-bold text-slate-900">EDUZY</h1>
          </div>

          <div className="mb-8">
            <h1 className="text-5xl font-serif font-bold text-indigo-900 tracking-wider">CERTIFICATE</h1>
            <p className="text-xl text-indigo-500 uppercase tracking-widest mt-2">of Achievement</p>
          </div>

          <p className="text-gray-600 italic text-lg mb-2">This is to certify that</p>
          <h2 className="text-4xl font-bold text-slate-800 mb-6 border-b-2 border-indigo-200 pb-2 px-12 font-serif">
            {user.name}
          </h2>

          <p className="text-gray-600 italic text-lg mb-4">has successfully completed the adaptive learning track</p>
          
          <div className="bg-indigo-50 px-8 py-3 rounded-full border border-indigo-100 mb-6">
            <h3 className="text-2xl font-bold text-indigo-800">{course.track} Programming</h3>
            <p className="text-indigo-600 font-medium">{course.level} Level</p>
          </div>

          <div className="grid grid-cols-2 gap-12 w-full max-w-2xl mt-8">
            <div className="text-center">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Final Score</p>
                <p className="text-2xl font-bold text-slate-900">{score}%</p>
            </div>
            <div className="text-center">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Date Issued</p>
                <p className="text-2xl font-bold text-slate-900">{date}</p>
            </div>
          </div>

          <div className="mt-12 w-full flex justify-between items-end border-t border-gray-300 pt-6">
            <div className="text-left">
                <p className="text-xs text-gray-400 font-mono">ID: {certId}</p>
                <p className="text-xs text-gray-400">Verify at eduzy.ai/verify</p>
            </div>
            <div className="text-center">
                 <div className="h-12 w-32 border-b border-gray-400 mb-1 mx-auto"></div>
                 <p className="font-serif text-slate-800">Eduzy AI Director</p>
            </div>
          </div>

        </div>
      </div>

      <div className="mt-8 flex gap-4 no-print">
         <button 
            onClick={onBack}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg"
          >
            <Home size={20} /> Dashboard
          </button>
          <button 
            onClick={() => window.print()} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-1"
          >
            <Download size={20} /> Download / Print
          </button>
      </div>
    </div>
  );
};

export default Certificate;