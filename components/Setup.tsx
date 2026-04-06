
import React, { useState } from 'react';
import { TargetPersona } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface SetupProps {
  onComplete: (data: { targetProfile: string, jobDescription: string, demographicPreference: string, persona: TargetPersona }) => void;
}

export const Setup: React.FC<SetupProps> = ({ onComplete }) => {
  const [profile, setProfile] = useState('');
  const [jd, setJd] = useState('');
  const [demographic, setDemographic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const PREDEFINED_TAGS = [
    "An experienced Product Manager",
    "30-40 years old",
    "Tech fan",
    "Senior Software Engineer",
    "Startup Founder",
    "Hiring Manager",
    "Venture Capitalist",
    "Friendly & Approachable",
    "Direct & Professional"
  ];

  const DEMOGRAPHIC_TAGS = [
    "Female",
    "Male",
    "Non-binary",
    "Asian",
    "Black",
    "Hispanic",
    "White",
    "Middle Eastern",
    "20s",
    "30s",
    "40s",
    "50s+"
  ];

  const addTag = (tag: string, target: 'profile' | 'demographic') => {
    const setter = target === 'profile' ? setProfile : setDemographic;
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
      // Use Gemini to extract persona data from the input
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a professional networking persona based on these inputs:
          Target Person Description: ${profile}
          Target Job Description: ${jd}
          Demographic Preferences: ${demographic || "No preference (Default to adult male)"}
          
          The persona's name, background, and self-introduction MUST reflect the demographic preferences if provided.
          If gender is specified, select the appropriate voice type. If not specified, default to masculine.`,
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
              voiceType: { 
                type: Type.STRING, 
                enum: ['masculine', 'feminine'],
                description: 'The appropriate voice type based on the profile gender/name' 
              }
            },
            required: ['name', 'role', 'background', 'personality', 'company', 'voiceType']
          }
        }
      });

      const persona: TargetPersona = JSON.parse(response.text || '{}');
      onComplete({ targetProfile: profile, jobDescription: jd, demographicPreference: demographic, persona });
    } catch (error) {
      console.error("Error generating persona:", error);
      // Fallback persona if AI fails
      onComplete({ 
        targetProfile: profile, 
        jobDescription: jd, 
        demographicPreference: demographic,
        persona: {
          name: "Alex Rivera",
          role: "Senior Engineering Manager",
          background: "15 years in tech, former software architect at Google.",
          personality: "Direct, analytical, values brevity but appreciates well-researched questions.",
          company: "InnovateTech",
          voiceType: 'masculine'
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
        <p className="text-slate-500 mb-10">Describe who you're networking with and the role you want. (Text only, no URLs)</p>

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
            <div className="flex justify-between items-end mb-3">
              <label className="block text-sm font-bold text-slate-700">
                Persona Demographic Preference
              </label>
              <span className="text-xs text-slate-400 font-medium italic">Optional</span>
            </div>
            
            <input 
              type="text"
              value={demographic}
              onChange={(e) => setDemographic(e.target.value)}
              placeholder="Gender, ethnicity, age, etc. (e.g. Female, Asian, 40s)"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all mb-4"
            />

            <div className="flex flex-wrap gap-2 mb-3">
              {DEMOGRAPHIC_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag, 'demographic')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-full border border-slate-200 transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 italic">
              * If no preference is entered, the persona will default to an adult male voice.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">
              Target Job Description
            </label>
            <textarea 
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description you are targeting..."
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              required
            />
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
