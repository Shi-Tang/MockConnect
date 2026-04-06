
import React from 'react';
import { FeedbackData } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface FeedbackProps {
  feedback: FeedbackData;
  onRetry: () => void;
  onDone: () => void;
}

export const Feedback: React.FC<FeedbackProps> = ({ feedback, onRetry, onDone }) => {
  const chartData = [
    { subject: 'Confidence', A: feedback.score - 5, fullMark: 100 },
    { subject: 'Clarity', A: feedback.score + 10 > 100 ? 100 : feedback.score + 10, fullMark: 100 },
    { subject: 'Engagement', A: feedback.score, fullMark: 100 },
    { subject: 'Research', A: feedback.score - 15, fullMark: 100 },
    { subject: 'Impact', A: feedback.score + 5 > 100 ? 100 : feedback.score + 5, fullMark: 100 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Summary & Chart */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Session Review</h2>
                <p className="text-slate-500">Simulation performance metrics</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-extrabold text-indigo-600">{feedback.score}</div>
                <div className="text-xs text-slate-400 uppercase font-bold">Overall Score</div>
              </div>
            </div>

            <div className="h-64 mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Radar
                    name="Performance"
                    dataKey="A"
                    stroke="#4f46e5"
                    fill="#4f46e5"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
              <h4 className="font-bold text-indigo-900 mb-2">Conversation Summary</h4>
              <p className="text-indigo-800 leading-relaxed">{feedback.conversationSummary}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Key Strengths</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {feedback.strengths.map((s, i) => (
                <div key={i} className="flex items-start space-x-3 p-4 bg-green-50 rounded-xl border border-green-100">
                  <div className="mt-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-green-800 font-medium">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Improvements & CTA */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl">
            <h3 className="text-xl font-bold mb-6">Areas for Debugging</h3>
            <ul className="space-y-6">
              {feedback.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold shrink-0">{i + 1}</div>
                  <div>
                    <h5 className="font-bold text-slate-200 mb-1">Issue Detected</h5>
                    <p className="text-slate-400 text-sm">{w}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-10 pt-10 border-t border-slate-800">
              <h4 className="font-bold text-indigo-400 mb-4 uppercase text-xs tracking-widest">Actionable Tips</h4>
              <ul className="space-y-3">
                {feedback.suggestions.map((s, i) => (
                  <li key={i} className="text-slate-300 text-sm flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={onRetry}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all transform hover:-translate-y-1"
            >
              Initiate Adaptive Retry
            </button>
            <button 
              onClick={onDone}
              className="w-full py-5 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all"
            >
              Finish for Today
            </button>
            <p className="text-center text-xs text-slate-400 mt-4 px-4">
              Next session will be adjusted: <strong>{feedback.difficultyAdjustment}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
