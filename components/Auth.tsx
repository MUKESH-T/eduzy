import React, { useState } from 'react';
import { User } from '../types';
import { BookOpen, User as UserIcon, ArrowRight } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', preferences: 'Visual' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate auth
    onLogin({
      name: formData.name || 'Learner',
      email: formData.email,
      preferences: formData.preferences,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-8 bg-indigo-50 border-b border-indigo-100 flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-indigo-900">EDUZY</h1>
          <p className="text-indigo-600">Adaptive Learning Engine</p>
        </div>
        
        <div className="p-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-800 text-center">
            {isRegister ? 'Create your Account' : 'Welcome Back'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            {isRegister && (
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Learning Preference</label>
                 <select 
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.preferences}
                    onChange={(e) => setFormData({...formData, preferences: e.target.value})}
                 >
                    <option value="Visual">Visual (Videos/Diagrams)</option>
                    <option value="Text">Text-based (Reading)</option>
                    <option value="Hands-on">Hands-on (Coding)</option>
                 </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-6"
            >
              {isRegister ? 'Start Learning' : 'Login'} <ArrowRight size={18} />
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-indigo-600 font-semibold hover:underline"
            >
              {isRegister ? 'Login' : 'Register'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
