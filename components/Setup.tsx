
import React, { useState } from 'react';
import { TargetPersona } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import {
  buildPersonaGenerationContents,
  PERSONA_GENERATION_MODEL,
} from '../utils/personaGenerationPrompt';
import { buildPersonaReviewParagraphs } from '../utils/personaReviewNarrative';

interface SetupProps {
  onComplete: (data: { targetProfile: string, jobDescription: string, persona: TargetPersona }) => void;
}

type Step = 'form' | 'review';

const FALLBACK_PERSONA: TargetPersona = {
  name: "Alex Rivera",
  role: "Senior Engineering Manager",
  background: "15 years in tech, former software architect at Google.",
  personality: "Direct, analytical, values brevity but appreciates well-researched questions.",
  company: "InnovateTech",
  voiceType: 'masculine',
  demographicCuesPresent: false,
  voiceAgeBand: 'middle'
};

export const Setup: React.FC<SetupProps> = ({ onComplete }) => {
  const [profile, setProfile] = useState('');
  const [jd, setJd] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [reviewPromptText, setReviewPromptText] = useState('');
  const [pendingPersona, setPendingPersona] = useState<TargetPersona | null>(null);

  const PREDEFINED_TAGS = [
    "Product Manager",
    "Senior Software Engineer",
    "Startup Founder",
    "Hiring Manager",
    "Venture Capitalist",
    "Tech enthusiast",
    "Friendly & approachable",
    "Direct & professional"
  ];

  const JOB_DESCRIPTION_TAGS = [
    "Lawyer",
    "Product Manager",
    "Project Manager",
    "Engineer",
    "Data Scientist",
    "Designer",
    "Entry-level",
    "3–5 years experience",
    "5+ years experience",
    "Senior / staff level",
    "Remote",
    "Hybrid",
    "Leadership responsibilities",
    "Cross-functional collaboration",
    "Fast-paced environment"
  ];

  const addTag = (tag: string, target: 'profile' | 'jd') => {
    const setter = target === 'profile' ? setProfile : setJd;
    setter(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return tag;
      if (trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('?')) {
        return `${trimmed} ${tag}`;
      }
      return `${trimmed}, ${tag}`;
    });
  };

  const parsePersonaFromResponse = (raw: Partial<TargetPersona>): TargetPersona => {
    const cues = raw.demographicCuesPresent === true;
    const ageOk = (b: string | undefined): b is 'youthful' | 'middle' | 'mature' =>
      b === 'youthful' || b === 'middle' || b === 'mature';
    return {
      name: raw.name ?? 'Alex Rivera',
      role: raw.role ?? 'Professional',
      background: raw.background ?? '',
      personality: raw.personality ?? '',
      company: raw.company ?? '',
      demographicCuesPresent: cues,
      voiceType: cues ? (raw.voiceType === 'feminine' ? 'feminine' : 'masculine') : 'masculine',
      voiceAgeBand: cues ? (ageOk(raw.voiceAgeBand) ? raw.voiceAgeBand : 'middle') : 'middle'
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !jd) return;

    const contents = buildPersonaGenerationContents(profile, jd);
    setReviewPromptText(contents);

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: PERSONA_GENERATION_MODEL,
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              role: { type: Type.STRING },
              background: { type: Type.STRING },
              personality: { type: Type.STRING },
              company: { type: Type.STRING },
              demographicCuesPresent: { type: Type.BOOLEAN },
              voiceType: { 
                type: Type.STRING, 
                enum: ['masculine', 'feminine'],
                description: 'Gendered voice bucket for the contact; masculine when no demographic cues'
              },
              voiceAgeBand: {
                type: Type.STRING,
                enum: ['youthful', 'middle', 'mature'],
                description: 'Age register for speech when demographic cues exist; middle when none'
              }
            },
            required: ['name', 'role', 'background', 'personality', 'company', 'demographicCuesPresent', 'voiceType', 'voiceAgeBand']
          }
        }
      });

      const raw = JSON.parse(response.text || '{}') as Partial<TargetPersona>;
      setPendingPersona(parsePersonaFromResponse(raw));
    } catch (error) {
      console.error("Error generating persona:", error);
      setPendingPersona(FALLBACK_PERSONA);
    } finally {
      setIsGenerating(false);
      setStep('review');
    }
  };

  const handleConfirmReview = () => {
    if (!pendingPersona) return;
    onComplete({ targetProfile: profile, jobDescription: jd, persona: pendingPersona });
  };

  const handleBackToEdit = () => {
    setStep('form');
    setPendingPersona(null);
    setReviewPromptText('');
  };

  if (step === 'review' && pendingPersona) {
    const personaParagraphs = buildPersonaReviewParagraphs(pendingPersona, jd);

    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 md:p-12 space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Review your networking persona</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Read the summary below to check that the AI understood who you are practicing with and your job context. If
              something feels off, go back and adjust your descriptions. Persona details are generated using{' '}
              <span className="font-mono text-xs text-slate-700">{PERSONA_GENERATION_MODEL}</span>.
            </p>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-5 py-5 text-slate-800 leading-relaxed space-y-4">
            {personaParagraphs.map((p, i) => (
              <p key={i} className="text-[15px]">
                {p}
              </p>
            ))}
          </div>

          <details className="rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600">
            <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-slate-700">
              Technical: full instruction text sent to the model
            </summary>
            <div className="border-t border-slate-200 px-1 pb-1">
              <pre className="max-h-[min(280px,40vh)] overflow-auto whitespace-pre-wrap break-words p-4 text-xs text-slate-800 font-mono leading-relaxed">
                {reviewPromptText}
              </pre>
              <p className="px-4 pb-3 text-xs text-slate-500">
                The API also requests structured JSON output via a schema (not shown).
              </p>
            </div>
          </details>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 space-y-2">
            <p className="font-bold">Please check before continuing</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Confirm the persona and job context match what you intend before the simulation starts.</li>
              <li>
                For your privacy, avoid highly personal details (e.g. government IDs, exact address, health, or financial
                specifics). Your text is included in API calls.
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleConfirmReview}
              className="flex-1 py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-all"
            >
              Confirm and start simulation
            </button>
            <button
              type="button"
              onClick={handleBackToEdit}
              className="flex-1 py-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
            >
              Back to edit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 md:p-12">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Configure Your Simulation</h2>
        <p className="text-slate-500 mb-4">Describe who you're networking with and the role you want.</p>
        <p className="text-xs text-slate-400 mb-10 leading-relaxed">
          The agent uses a default male U.S. English voice unless you clearly describe this contact's gender and/or age in the fields below, in which case the voice matches that description while remaining U.S. English.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <div className="flex justify-between items-end mb-3">
              <label className="block text-sm font-bold text-slate-700">
                Target Contact Description
              </label>
            </div>
            
            <textarea 
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              placeholder="Describe the person's background, role, and personality..."
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all mb-4"
              required
            />

            <div className="flex flex-wrap gap-2">
              {PREDEFINED_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag, 'profile')}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100 transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">
              Your Target Job Description
            </label>
            <textarea 
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description you are targeting..."
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all mb-4"
              required
            />
            <div className="flex flex-wrap gap-2">
              {JOB_DESCRIPTION_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag, 'jd')}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100 transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={isGenerating || !profile || !jd}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg ${
                isGenerating ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing…
                </span>
              ) : 'Ready Your Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
