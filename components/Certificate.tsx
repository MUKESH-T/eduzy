<<<<<<< HEAD
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
=======
import React, { useState } from 'react';
import { CertificateRecord } from '../types';
import { Home, Printer, Image as ImageIcon, Loader2, ArrowLeft } from 'lucide-react';

interface CertificateProps {
  data: CertificateRecord;
  onBack: () => void;
}

const Certificate: React.FC<CertificateProps> = ({ data, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleDownloadImage = async () => {
    setIsGenerating(true);
    const element = document.getElementById('certificate-node');
    
    // Check if html2canvas is loaded globally
    if (element && (window as any).html2canvas) {
        try {
            const canvas = await (window as any).html2canvas(element, {
                scale: 2, // Improve quality
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });
            
            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.href = image;
            link.download = `EDUZY-Certificate-${data.userName.replace(/\s+/g, '-')}.png`;
            link.click();
        } catch (error) {
            console.error("Certificate generation failed:", error);
            alert("Could not generate image. Please try the 'Print / Save PDF' option.");
        } finally {
            setIsGenerating(false);
        }
    } else {
        setIsGenerating(false);
        alert("Image generation library not loaded. Please try refreshing or use 'Print / Save PDF'.");
    }
  };

  const handleDownloadPDF = async () => {
      // Basic PDF print is handled via browser print dialog for best compatibility,
      // but we can add jsPDF logic if strictly requested.
      // Given constraint "platform-supported format", browser print > PDF is native.
      // However, if we need strict 'Download PDF' button:
      setIsGenerating(true);
      const element = document.getElementById('certificate-node');
      if (element && (window as any).html2canvas && (window as any).jspdf) {
          try {
             const canvas = await (window as any).html2canvas(element, { scale: 2 });
             const imgData = canvas.toDataURL('image/png');
             const { jsPDF } = (window as any).jspdf;
             const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
             const pdfWidth = pdf.internal.pageSize.getWidth();
             const pdfHeight = pdf.internal.pageSize.getHeight();
             
             pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
             pdf.save(`EDUZY-Certificate-${data.userName.replace(/\s+/g, '-')}.pdf`);
          } catch(e) {
              console.error(e);
          } finally {
              setIsGenerating(false);
          }
      } else {
          // Fallback
          window.print();
          setIsGenerating(false);
      }
  };
>>>>>>> ae5520bf0e2d24334e05a6e15e53058baafaa16d

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
<<<<<<< HEAD
        <h2 className="text-3xl font-bold mb-2">Congratulations, {user.name}!</h2>
        <p className="text-gray-400">You have successfully completed the course.</p>
      </div>

      {/* Certificate Frame - Print Area */}
      <div className="print-area bg-white p-2 rounded-lg shadow-2xl max-w-4xl w-full">
=======
        <h2 className="text-3xl font-bold mb-2">Certificate of Achievement</h2>
        <p className="text-gray-400">Successfully verified on {data.date}</p>
      </div>

      {/* Certificate Frame - Print Area */}
      <div id="certificate-node" className="print-area bg-white p-2 rounded-lg shadow-2xl max-w-4xl w-full">
>>>>>>> ae5520bf0e2d24334e05a6e15e53058baafaa16d
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
<<<<<<< HEAD
            {user.name}
=======
            {data.userName}
>>>>>>> ae5520bf0e2d24334e05a6e15e53058baafaa16d
          </h2>

          <p className="text-gray-600 italic text-lg mb-4">has successfully completed the adaptive learning track</p>
          
          <div className="bg-indigo-50 px-8 py-3 rounded-full border border-indigo-100 mb-6">
<<<<<<< HEAD
            <h3 className="text-2xl font-bold text-indigo-800">{course.track} Programming</h3>
            <p className="text-indigo-600 font-medium">{course.level} Level</p>
=======
            <h3 className="text-2xl font-bold text-indigo-800">{data.track} Programming</h3>
            <p className="text-indigo-600 font-medium">{data.level} Level</p>
>>>>>>> ae5520bf0e2d24334e05a6e15e53058baafaa16d
          </div>

          <div className="grid grid-cols-2 gap-12 w-full max-w-2xl mt-8">
            <div className="text-center">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Final Score</p>
<<<<<<< HEAD
                <p className="text-2xl font-bold text-slate-900">{score}%</p>
            </div>
            <div className="text-center">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Date Issued</p>
                <p className="text-2xl font-bold text-slate-900">{date}</p>
=======
                <p className="text-2xl font-bold text-slate-900">{data.score}%</p>
            </div>
            <div className="text-center">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Date Issued</p>
                <p className="text-2xl font-bold text-slate-900">{data.date}</p>
>>>>>>> ae5520bf0e2d24334e05a6e15e53058baafaa16d
            </div>
          </div>

          <div className="mt-12 w-full flex justify-between items-end border-t border-gray-300 pt-6">
            <div className="text-left">
<<<<<<< HEAD
                <p className="text-xs text-gray-400 font-mono">ID: {certId}</p>
=======
                <p className="text-xs text-gray-400 font-mono">ID: {data.id}</p>
>>>>>>> ae5520bf0e2d24334e05a6e15e53058baafaa16d
                <p className="text-xs text-gray-400">Verify at eduzy.ai/verify</p>
            </div>
            <div className="text-center">
                 <div className="h-12 w-32 border-b border-gray-400 mb-1 mx-auto"></div>
                 <p className="font-serif text-slate-800">Eduzy AI Director</p>
            </div>
          </div>

        </div>
      </div>

<<<<<<< HEAD
      <div className="mt-8 flex gap-4 no-print">
=======
      <div className="mt-8 flex flex-wrap justify-center gap-4 no-print">
>>>>>>> ae5520bf0e2d24334e05a6e15e53058baafaa16d
         <button 
            onClick={onBack}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg"
          >
            <Home size={20} /> Dashboard
          </button>
<<<<<<< HEAD
          <button 
            onClick={() => window.print()} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-1"
          >
            <Download size={20} /> Download / Print
=======
          
          <button 
            onClick={handleDownloadImage} 
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />} 
            Download Image
          </button>

          <button 
            onClick={handleDownloadPDF} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-1"
          >
            <Printer size={20} /> Download PDF / Print
>>>>>>> ae5520bf0e2d24334e05a6e15e53058baafaa16d
          </button>
      </div>
    </div>
  );
};

export default Certificate;