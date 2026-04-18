
import React, { useState } from 'react';
import { TargetPersona } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface SetupProps {
  onComplete: (data: { targetProfile: string, jobDescription: string, persona: TargetPersona }) => void;
}

export const Setup: React.FC<SetupProps> = ({ onComplete }) => {
  const [profile, setProfile] = useState('');
  const [jd, setJd] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !jd) return;

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a professional networking persona from:
          Target Person Description: ${profile}
          Target Job Description: ${jd}

          demographicCuesPresent:
          Set true ONLY if the user EXPLICITLY describes the networking CONTACT (the person they will practice speaking with) with traits that matter for voice: gender (e.g. woman, female, man, male, she/her, he/him), age or life stage (e.g. 20s, 60s, teenager, retiree, senior, "in her sixties"), or clear voice/age cues about that contact.
          Set false if there are no such explicit cues—do NOT infer gender or age from job title alone (e.g. "engineer", "PM" without gender/age is NOT a cue).

          When demographicCuesPresent is false:
          - Set voiceType to "masculine" and voiceAgeBand to "middle" (the app will use the default male voice).

          When demographicCuesPresent is true:
          - Set voiceType to match the contact's described gender (masculine or feminine).
          - Set voiceAgeBand to youthful (roughly under ~35), middle (roughly 35–54), or mature (roughly 55+) based on the contact's described age or life stage. If age is unspecified but gender is, use middle.

          Infer name, role, background, personality, and company from the descriptions. Do not invent protected-class traits beyond what the user wrote.`,
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
      const cues = raw.demographicCuesPresent === true;
      const ageOk = (b: string | undefined): b is 'youthful' | 'middle' | 'mature' =>
        b === 'youthful' || b === 'middle' || b === 'mature';
      const persona: TargetPersona = {
        name: raw.name ?? 'Alex Rivera',
        role: raw.role ?? 'Professional',
        background: raw.background ?? '',
        personality: raw.personality ?? '',
        company: raw.company ?? '',
        demographicCuesPresent: cues,
        voiceType: cues ? (raw.voiceType === 'feminine' ? 'feminine' : 'masculine') : 'masculine',
        voiceAgeBand: cues ? (ageOk(raw.voiceAgeBand) ? raw.voiceAgeBand : 'middle') : 'middle'
      };
      onComplete({ targetProfile: profile, jobDescription: jd, persona });
    } catch (error) {
      console.error("Error generating persona:", error);
      onComplete({ 
        targetProfile: profile, 
        jobDescription: jd, 
        persona: {
          name: "Alex Rivera",
          role: "Senior Engineering Manager",
          background: "15 years in tech, former software architect at Google.",
          personality: "Direct, analytical, values brevity but appreciates well-researched questions.",
          company: "InnovateTech",
          voiceType: 'masculine',
          demographicCuesPresent: false,
          voiceAgeBand: 'middle'
        } 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 md:p-12">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Configure Your Simulation</h2>
        <p className="text-slate-500 mb-4">Describe who you're networking with and the role you want. (Text only, no URLs)</p>
        <p className="text-xs text-slate-400 mb-10 leading-relaxed">
          The agent uses a default male U.S. English voice unless you clearly describe this contact's gender and/or age in the fields below, in which case the voice matches that description while remaining U.S. English.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <div className="flex justify-between items-end mb-3">
              <label className="block text-sm font-bold text-slate-700">
                Target Person Description
              </label>
              <span className="text-xs text-slate-400 font-medium italic">Text only, no links</span>
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
              Target Job Description
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
                  Generating AI Persona...
                </span>
              ) : 'Ready Your Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
