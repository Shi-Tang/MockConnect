
import React, { useState, useCallback, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Setup } from './components/Setup';
import { Simulation } from './components/Simulation';
import { Feedback } from './components/Feedback';
import { Login } from './components/Login';
import { AppState, SessionData, FeedbackData, MessageLog, PracticeRecord, TargetPersona } from './types';

const App: React.FC = () => {
  const [currentState, setCurrentState] = useState<AppState>(AppState.LOGIN);
  const [username, setUsername] = useState<string>('');
  const [session, setSession] = useState<SessionData>({
    targetProfile: '',
    jobDescription: '',
  });
  const [lastMessages, setLastMessages] = useState<MessageLog[]>([]);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [history, setHistory] = useState<PracticeRecord[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('mockconnect_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('mockconnect_history', JSON.stringify(history));
  }, [history]);

  const handleLogin = (name: string) => {
    setUsername(name);
    setSession(prev => ({ ...prev, user: name }));
    setCurrentState(AppState.DASHBOARD);
  };

  const startSetup = () => setCurrentState(AppState.SETUP);
  
  const handleSetupComplete = (data: { targetProfile: string, jobDescription: string, demographicPreference: string, persona: TargetPersona }) => {
    setSession(prev => ({ ...prev, ...data }));
    setCurrentState(AppState.SIMULATION);
  };

  const handleSimulationEnd = (messages: MessageLog[], generatedFeedback: FeedbackData, duration: number) => {
    setLastMessages(messages);
    setFeedback(generatedFeedback);
    
    // Create a new practice record
    const newRecord: PracticeRecord = {
      id: crypto.randomUUID(),
      user: username,
      timestamp: Date.now(),
      duration,
      session: { ...session },
      messages,
      feedback: generatedFeedback
    };
    
    setHistory(prev => [newRecord, ...prev]);
    setCurrentState(AppState.FEEDBACK);
  };

  const handleRetry = () => {
    // Adaptive retry logic: update session with previous feedback
    if (feedback) {
      setSession(prev => ({
        ...prev,
        previousFeedback: feedback
      }));
    }
    setCurrentState(AppState.SIMULATION);
  };

  const resetToDashboard = () => {
    setSession({ ...session, targetProfile: '', jobDescription: '' });
    setFeedback(null);
    setLastMessages([]);
    setCurrentState(AppState.DASHBOARD);
  };

  const handleLogout = () => {
    setUsername('');
    setSession({ targetProfile: '', jobDescription: '' });
    setFeedback(null);
    setLastMessages([]);
    setCurrentState(AppState.LOGIN);
  };

  const userRecords = history.filter(record => record.user === username);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={resetToDashboard}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">MockConnect</h1>
        </div>
        {username && (
          <nav className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-slate-700">{username}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-500 text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </nav>
        )}
      </header>

      <main className="flex-grow">
        {currentState === AppState.LOGIN && <Login onLogin={handleLogin} />}
        {currentState === AppState.DASHBOARD && <Dashboard onStart={startSetup} userRecords={userRecords} />}
        {currentState === AppState.SETUP && <Setup onComplete={handleSetupComplete} />}
        {currentState === AppState.SIMULATION && (
          <Simulation 
            session={session} 
            onEnd={handleSimulationEnd} 
            onCancel={resetToDashboard}
          />
        )}
        {currentState === AppState.FEEDBACK && feedback && (
          <Feedback 
            feedback={feedback} 
            onRetry={handleRetry} 
            onDone={resetToDashboard} 
          />
        )}
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm">
          <p>© 2024 MockConnect. Designed for introverts and non-native speakers.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Help</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
