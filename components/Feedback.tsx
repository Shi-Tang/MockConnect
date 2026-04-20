
import React, { useState, useCallback, useMemo } from 'react';
import { FeedbackData } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import {
  RADAR_AXIS_INFO,
  RADAR_SCORING_EXPLANATION,
  buildRadarChartData,
  isRadarAxisLabel,
  type RadarAxisLabel,
} from '../utils/feedbackRubric';

interface FeedbackProps {
  feedback: FeedbackData;
  onRetry: (agentPerformanceFeedback?: string) => void;
  onDone: () => void;
}

const QUICK_TAGS = [
  'The tone felt rude or dismissive',
  'The agent did not reflect my configured background / role',
  'Responses felt too vague or generic',
  'The agent interrupted or rushed the conversation',
];

export const Feedback: React.FC<FeedbackProps> = ({ feedback, onRetry, onDone }) => {
  const [agentNotes, setAgentNotes] = useState('');
  const [hoveredRadarAxis, setHoveredRadarAxis] = useState<RadarAxisLabel | null>(null);

  const appendTag = useCallback((tag: string) => {
    setAgentNotes((prev) => {
      const line = prev.trim();
      if (line.includes(tag)) return prev;
      if (!line) return tag;
      return `${line}\n${tag}`;
    });
  }, []);

  const handleRetry = () => {
    onRetry(agentNotes.trim() || undefined);
  };

  const chartData = useMemo(() => buildRadarChartData(feedback), [feedback]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
      {/* Part 1: Session Review — metrics, summary, strengths, debugging, tips */}
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

        <div className="mb-8">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={(props: {
                    x: number;
                    y: number;
                    textAnchor: string;
                    verticalAnchor: string;
                    /** Recharts 3 passes the tick label here, not as a top-level `value`. */
                    payload?: { value?: string | number; coordinate?: number };
                  }) => {
                    const { x, y, textAnchor, verticalAnchor, payload } = props;
                    const label =
                      payload?.value !== undefined && payload.value !== ''
                        ? String(payload.value)
                        : '';
                    const axis = isRadarAxisLabel(label) ? label : null;
                    const active = axis && hoveredRadarAxis === axis;
                    return (
                      <g
                        key={label || String(payload?.coordinate ?? x)}
                        className="cursor-help"
                        onMouseEnter={() => axis && setHoveredRadarAxis(axis)}
                        onMouseLeave={() => setHoveredRadarAxis(null)}
                      >
                        <circle cx={x} cy={y} r={22} fill="transparent" />
                        <text
                          x={x}
                          y={y}
                          textAnchor={textAnchor as 'start' | 'middle' | 'end'}
                          verticalAnchor={verticalAnchor as 'start' | 'middle' | 'end'}
                          fill={active ? '#4f46e5' : '#64748b'}
                          fontSize={12}
                          className="pointer-events-none transition-colors"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 20]} tick={false} axisLine={false} />
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
          <div
            className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 min-h-[5.5rem]"
            role="region"
            aria-live="polite"
            aria-label="Metric description"
          >
            {hoveredRadarAxis ? (
              <div>
                <p className="text-sm font-bold text-slate-900">{hoveredRadarAxis}</p>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  {RADAR_AXIS_INFO[hoveredRadarAxis].description}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed mt-2 pt-2 border-t border-slate-200/90">
                  {RADAR_SCORING_EXPLANATION}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed">
                Hover a metric name on the chart to see what it measures and how your score is represented.
              </p>
            )}
          </div>
        </div>

        <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 mb-8">
          <h4 className="font-bold text-indigo-900 mb-2">Conversation Summary</h4>
          <p className="text-indigo-800 leading-relaxed">{feedback.conversationSummary}</p>
        </div>

        <div className="border-t border-slate-100 pt-8 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 lg:items-start">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Key Strengths</h3>
              <div className="grid sm:grid-cols-1 gap-4">
                {feedback.strengths.length > 0 ? (
                  feedback.strengths.map((s, i) => (
                    <div key={i} className="flex items-start space-x-3 p-4 bg-green-50 rounded-xl border border-green-100">
                      <div className="mt-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-green-800 font-medium">{s}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic">No strengths listed for this session.</p>
                )}
              </div>
            </div>

            <div className="min-w-0 lg:border-l lg:border-slate-100 lg:pl-8 pt-8 lg:pt-0 border-t border-slate-100 lg:border-t-0">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Areas for Debugging</h3>
              <ul className="space-y-5">
                {feedback.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm shrink-0 border border-red-200">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 mb-1">Issue detected</p>
                      <p className="text-slate-600 text-sm leading-relaxed">{w}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8 mt-8">
          <h4 className="font-bold text-indigo-600 mb-4 uppercase text-xs tracking-widest">Actionable Tips</h4>
          <ul className="space-y-3">
            {feedback.suggestions.map((s, i) => (
              <li key={i} className="text-slate-700 text-sm flex items-start gap-3">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actions — above Quick pulse so primary actions follow Session Review */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-end">
          <button 
            onClick={onDone}
            type="button"
            className="order-2 sm:order-1 py-4 px-8 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all sm:min-w-[200px]"
          >
            Finish for Today
          </button>
          <button 
            onClick={handleRetry}
            type="button"
            className="order-1 sm:order-2 py-4 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all sm:min-w-[240px]"
          >
            Initiate Adaptive Retry
          </button>
        </div>
        <div className="w-full max-w-xl sm:max-w-2xl sm:ml-auto rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left">
          <p className="text-xs text-slate-500 leading-relaxed">
            Optional partner notes are in the section below—add them before retry if you want them included.
          </p>
        </div>
      </div>

      {/* Quick pulse — separate section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100">
            <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-slate-900 leading-snug">
              Quick pulse on your practice partner
            </h3>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              Totally optional—if something felt off about the person you practiced with, jot it down. We&apos;ll nudge the next run (tone, staying in your story, pacing).
            </p>
          </div>
        </div>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Shortcuts</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => appendTag(tag)}
              className="px-3 py-1.5 text-xs font-semibold rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors text-left max-w-full"
            >
              + {tag}
            </button>
          ))}
        </div>

        <label htmlFor="partner-feedback-notes" className="block text-sm font-bold text-slate-700 mb-2">
          Your notes
        </label>
        <textarea
          id="partner-feedback-notes"
          value={agentNotes}
          onChange={(e) => setAgentNotes(e.target.value)}
          placeholder="e.g. Felt a bit brisk when I mentioned my career pivot—warmer next time would help."
          rows={4}
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y min-h-[100px]"
        />
      </div>
    </div>
  );
};
