
import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { Setup } from './components/Setup';
import { Simulation } from './components/Simulation';
import { Feedback } from './components/Feedback';
import { Login } from './components/Login';
import { SessionData, FeedbackData, MessageLog, PracticeRecord, TargetPersona } from './types';
import { mergeAgentFeedbackNotes } from './utils/agentFeedbackPrompt';
import {
  PREVIEW_FEEDBACK,
  STORAGE_USER_KEY,
  mergeSessionForSimulation,
  persistLastFeedback,
  loadStoredFeedback,
} from './utils/previewData';

const App: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>('');
  const [session, setSession] = useState<SessionData>({
    targetProfile: '',
    jobDescription: '',
  });
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [history, setHistory] = useState<PracticeRecord[]>([]);

  useEffect(() => {
    const savedName = localStorage.getItem(STORAGE_USER_KEY);
    if (savedName) {
      setUsername(savedName);
      setSession((prev) => ({ ...prev, user: savedName }));
    }

    const savedHistory = localStorage.getItem('mockconnect_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('mockconnect_history', JSON.stringify(history));
  }, [history]);

  const handleLogin = (name: string) => {
    setUsername(name);
    localStorage.setItem(STORAGE_USER_KEY, name);
    setSession((prev) => ({ ...prev, user: name }));
    navigate('/dashboard', { replace: true });
  };

  const startSetup = () => navigate('/setup');

  const handleDeleteRecord = (id: string) => {
    setHistory((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSetupComplete = (data: {
    targetProfile: string;
    jobDescription: string;
    persona: TargetPersona;
  }) => {
    setSession((prev) => ({ ...prev, ...data }));
    navigate('/simulation');
  };

  const handleSimulationEnd = (
    messages: MessageLog[],
    generatedFeedback: FeedbackData,
    duration: number
  ) => {
    setFeedback(generatedFeedback);
    persistLastFeedback(generatedFeedback);

    const newRecord: PracticeRecord = {
      id: crypto.randomUUID(),
      user: username,
      timestamp: Date.now(),
      duration,
      session: { ...session },
      messages,
      feedback: generatedFeedback,
    };

    setHistory((prev) => [newRecord, ...prev]);
    navigate('/feedback');
  };

  const handleRetry = (agentPerformanceFeedback?: string) => {
    if (feedback) {
      setSession((prev) => ({
        ...prev,
        previousFeedback: feedback,
        agentPromptAdjustments: mergeAgentFeedbackNotes(
          prev.agentPromptAdjustments,
          agentPerformanceFeedback
        ),
      }));
    }
    navigate('/simulation');
  };

  const resetToDashboard = () => {
    setSession((prev) => ({
      ...prev,
      targetProfile: '',
      jobDescription: '',
      persona: undefined,
      previousFeedback: undefined,
      agentPromptAdjustments: undefined,
    }));
    setFeedback(null);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setUsername('');
    localStorage.removeItem(STORAGE_USER_KEY);
    setSession({ targetProfile: '', jobDescription: '', agentPromptAdjustments: undefined });
    setFeedback(null);
    navigate('/login');
  };

  const userRecords = history.filter((record) => record.user === username);

  const simulationSession = useMemo(
    () => mergeSessionForSimulation(session, username),
    [session, username]
  );

  const feedbackForPage = feedback ?? loadStoredFeedback() ?? PREVIEW_FEEDBACK;

  const goHome = () => {
    if (username) navigate('/dashboard');
    else navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={goHome}>
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
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route
            path="/dashboard"
            element={
              <Dashboard
                onStart={startSetup}
                userRecords={userRecords}
                onDeleteRecord={handleDeleteRecord}
              />
            }
          />
          <Route path="/setup" element={<Setup onComplete={handleSetupComplete} />} />
          <Route
            path="/simulation"
            element={
              <Simulation
                session={simulationSession}
                onEnd={handleSimulationEnd}
                onCancel={resetToDashboard}
              />
            }
          />
          <Route
            path="/feedback"
            element={
              <Feedback
                feedback={feedbackForPage}
                onRetry={handleRetry}
                onDone={resetToDashboard}
              />
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm">
          <p>© 2026 MockConnect. Designed for introverts and non-native speakers.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-indigo-600 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-indigo-600 transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-indigo-600 transition-colors">
              Help
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
