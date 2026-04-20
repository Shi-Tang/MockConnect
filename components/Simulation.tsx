
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SessionData, MessageLog, FeedbackData, TargetPersona } from '../types';
import { Type } from "@google/genai";
import { buildAgentFeedbackSystemBlock } from '../utils/agentFeedbackPrompt';
import {
  buildFeedbackDimensionRubricPrompt,
  dimensionScoreFieldSchemaLine,
  normalizeDimensionScores,
  sumDimensionScores,
} from '../utils/feedbackRubric';
import { SESSION_REVIEW_MODEL, SIMULATION_LIVE_MODEL } from '../utils/modelDisclosure';
import { SimulationDisclosureBanner } from './SimulationDisclosureBanner';

/** Default male voice when setup has no explicit contact gender/age cues */
const DEFAULT_MALE_VOICE = 'Puck';

/** Map persona to Gemini Live prebuilt voice (Gemini prebuilt set). */
function resolveLiveVoiceName(persona: TargetPersona | undefined): string {
  if (!persona || persona.demographicCuesPresent !== true) return DEFAULT_MALE_VOICE;
  const feminine = persona.voiceType === 'feminine';
  const band = persona.voiceAgeBand ?? 'middle';
  if (feminine) {
    if (band === 'youthful') return 'Leda';
    if (band === 'mature') return 'Vindemiatrix';
    return 'Kore';
  }
  if (band === 'youthful') return 'Fenrir';
  if (band === 'mature') return 'Gacrux';
  return 'Puck';
}

interface SimulationProps {
  session: SessionData;
  onEnd: (messages: MessageLog[], feedback: FeedbackData, duration: number) => void;
  onCancel: () => void;
}

export const Simulation: React.FC<SimulationProps> = ({ session, onEnd, onCancel }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [isEnding, setIsEnding] = useState(false);
  const [timer, setTimer] = useState(1800); // 30 minutes
  const [liveTranscription, setLiveTranscription] = useState('');
  const initialTimerRef = useRef(1800);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptionRef = useRef({ user: '', model: '' });
  /** Set true only when we call `session.close()` from endSession so onclose does not treat it as a failure. */
  const intentionalDisconnectRef = useRef(false);

  // Audio encoding/decoding helpers
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };
  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const demographicVoice = session.persona?.demographicCuesPresent === true;
  const pronoun =
    !demographicVoice || session.persona?.voiceType !== 'feminine' ? 'he' : 'she';
  const reflexivePronoun = pronoun === 'he' ? 'himself' : 'herself';

  const startSimulation = async () => {
    setConnectionError(null);
    setIsConnecting(true);

    if (!process.env.API_KEY) {
      setConnectionError(
        'Missing Gemini API key. Create a .env.local file with GEMINI_API_KEY=your_key and restart the dev server.'
      );
      setIsConnecting(false);
      return;
    }

    let stream: MediaStream | null = null;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }
      if (videoRef.current) videoRef.current.srcObject = stream;
      const hasVideo = stream.getVideoTracks().length > 0;

      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Networking agent system prompt (Gemini Live): persona, rules, voice, and boundaries.
      const systemInstruction = `
        You are simulating a networking conversation. 
        Persona Name: ${session.persona?.name}
        Role: ${session.persona?.role} at ${session.persona?.company}
        Background: ${session.persona?.background}
        Personality Style: ${session.persona?.personality}
        User networking profile (from setup): ${session.targetProfile}
        Users' Target Job Description: ${session.jobDescription}
        
        ${session.previousFeedback ? `The user is retrying this scenario. Previous feedback was: ${JSON.stringify(session.previousFeedback)}. Focus on challenging them on their weaknesses.` : ''}
        ${buildAgentFeedbackSystemBlock(session.agentPromptAdjustments)}

        Voice and language (mandatory):
        - All spoken output must use General American (U.S.) English accent, rhythm, and intonation. Even if the persona's background is international or non-native English in real life, for this simulation you speak as a fluent U.S. English speaker.
        - Do not imitate a non-American accent in audio. Story details may mention other regions; your speech stays U.S. English.

        Rules:
        - MANDATORY START: You MUST initiate the conversation. Do not wait for the user to speak first.
        - Immediately introduce yourself as ${session.persona?.name} and mention your role.
        - Set a professional but welcoming tone. Say something like: "Hello! I'm ${session.persona?.name}, ${session.persona?.role}. I saw your request to connect regarding the ${session.jobDescription.split(' ').slice(0, 5).join(' ')}... context. Glad we could find a moment. What's on your mind?"
        - Act as this person naturally. Use first-person pronouns ("I", "me", "my") when referring to yourself.
        - Ask insightful follow-up questions.
        - Be realistic. If the pitch is poor, be politely skeptical.
        - Goal: Help the user practice until they are ready for a referral.

        Restrictions:
        - Do not perform to be too warm or too nice. Simulate real networking situations at best. If a user say very unrespectful words, or not behaving professionally, you should directly express your discomfort.
        - Do not include any viewpoints that may lead to bias, discrimination, or any related issues into your conversation.

        Professional conduct and topic boundaries (mandatory):
        - You must always behave in a fully professional manner appropriate for a workplace networking conversation.
        - Do not discuss anything not suitable for work (NSFW), highly sensitive topics (e.g., explicit politics or religion as debate, medical or legal advice, polarizing controversy), or the user's private affairs (e.g., family life, romantic relationships, finances, mental or physical health details, children, or confidential employer information).
        - If the user inadvertently shares personal or emotional details (such as family life or feelings), do not show curiosity or invite them to explore those topics further. At most give a brief neutral acknowledgment, then steer the conversation back to professional networking aligned with their setup (profile, role, company, and job description above).
        - If the user clearly expresses discomfort with the current topic or asks to change subject, apologize sincerely and immediately, mentally re-read the configured session context (User networking profile and Target Job Description, plus your persona and company), and pivot to a clearly appropriate career- or industry-focused networking topic grounded in that configuration—without dwelling on what went wrong.
      `;

      const voiceName = resolveLiveVoiceName(session.persona);

      const sessionPromise = ai.live.connect({
        model: SIMULATION_LIVE_MODEL,
        callbacks: {
          onopen: () => {
            // SDK does not await this callback; kick off resume without blocking setup.
            void inputAudioContext.resume();
            void outputAudioContextRef.current?.resume();
            setIsActive(true);
            setIsConnecting(false);
            
            // Microphone stream
            const source = inputAudioContext.createMediaStreamSource(stream!);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000'
              };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);

            // Frame stream (visual context) — only when a camera track exists
            let frameInterval: ReturnType<typeof setInterval> | undefined;
            if (hasVideo) {
              frameInterval = setInterval(() => {
                if (!videoRef.current || !canvasRef.current) return;
                const ctx = canvasRef.current.getContext('2d');
                if (!ctx) return;
                canvasRef.current.width = 320;
                canvasRef.current.height = 240;
                ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                canvasRef.current.toBlob(blob => {
                  if (blob) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64 = (reader.result as string).split(',')[1];
                      sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }));
                    };
                    reader.readAsDataURL(blob);
                  }
                }, 'image/jpeg', 0.5);
              }, 1000);
              (sessionRef as any).currentInterval = frameInterval;
            }

            // CRITICAL: Trigger the model to introduce itself first
            sessionPromise.then(s => {
              s.sendRealtimeInput({ 
                text: "The user has joined the meeting. Please start the conversation by introducing yourself and welcoming the user." 
              });
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              const buffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAudioContextRef.current.destination);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            // Handle Transcriptions for feedback step
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              transcriptionRef.current.user += text + " ";
              setLiveTranscription(prev => prev + text + " ");
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              transcriptionRef.current.model += text + " ";
              setLiveTranscription(prev => prev + text + " ");
            }
            if (message.serverContent?.turnComplete) {
              const uText = transcriptionRef.current.user.trim();
              const mText = transcriptionRef.current.model.trim();
              if (uText || mText) {
                setMessages(prev => [
                  ...prev,
                  { role: 'user', text: uText || "(Silent Listening)" },
                  { role: 'model', text: mText }
                ]);
              }
              transcriptionRef.current = { user: '', model: '' };
              setLiveTranscription('');
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Session Error:", e);
            setConnectionError('Live session failed (network or API). Check GEMINI_API_KEY, billing, and try again.');
            setIsConnecting(false);
            setIsActive(false);
            stream?.getTracks().forEach(t => t.stop());
          },
          onclose: () => {
            if (!intentionalDisconnectRef.current) {
              setConnectionError(
                'The live session disconnected. This is often caused by an unsupported Live API option, model access, or network issues—check the browser console for details, confirm your API key has Gemini Live enabled, and try again.'
              );
              stream?.getTracks().forEach(t => t.stop());
            }
            intentionalDisconnectRef.current = false;
            setIsActive(false);
            setIsConnecting(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          // Native audio Live sessions: do not set languageCode here—unsupported combinations
          // can cause the server to close the socket right after setup (see Google Live API docs).
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      stream?.getTracks().forEach(t => t.stop());
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Could not start the simulation.';
      if (msg.includes('Permission') || msg.includes('NotAllowedError') || msg.includes('NotReadableError')) {
        setConnectionError(
          'Microphone (and ideally camera) access was blocked. Allow permissions for this site in your browser settings, then try again.'
        );
      } else if (msg.includes('getUserMedia') || msg.includes('mediaDevices')) {
        setConnectionError('Could not access microphone. Use HTTPS or localhost, and allow mic access.');
      } else {
        setConnectionError(
          `${msg} If this persists, confirm GEMINI_API_KEY in .env.local, restart Vite, and check network access to Google’s API.`
        );
      }
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isActive && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0 && isActive) {
      endSession();
    }
    return () => clearInterval(interval);
  }, [isActive, timer]);

  const endSession = async () => {
    if (isEnding) return;
    setIsEnding(true);
    intentionalDisconnectRef.current = true;

    // Stop recording/streaming
    if (sessionRef.current) {
      if ((sessionRef as any).currentInterval) clearInterval((sessionRef as any).currentInterval);
      sessionRef.current.close();
    } else {
      intentionalDisconnectRef.current = false;
    }
    
    // Process final feedback using Gemini Chat
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const conversationText = messages.map(m => `${m.role}: ${m.text}`).join('\n');
      
      const response = await ai.models.generateContent({
        model: SESSION_REVIEW_MODEL,
        contents: `Evaluate this networking simulation for a job seeker. 
          Target Role: ${session.persona?.role}
          Job: ${session.jobDescription}
          User networking profile (from setup): ${session.targetProfile}
          Persona: ${session.persona?.name} (refer to this character as ${pronoun}/${reflexivePronoun}; audio uses U.S. English).
          
          Conversation Log:
          ${conversationText}
          
          CRITICAL EVALUATION RULES:
          1. Differentiate between the 'user' and the 'model' (${session.persona?.name}).
          2. ONLY evaluate the user's networking ability.
          3. DO NOT give the user high dimension scores just because ${session.persona?.name} (model) spoke fluently or professionally.
          4. If the user was silent or gave one-word answers, every dimension score should be very low, regardless of how much ${session.persona?.name} spoke.
          5. In the 'conversationSummary', explicitly mention the user's specific actions and how they contributed to the outcome.
          6. Ensure 'strengths' and 'weaknesses' are strictly about the user's performance, not ${session.persona?.name}'s.

          ${buildFeedbackDimensionRubricPrompt()}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dimensionScores: {
                type: Type.OBJECT,
                description:
                  'Five integers 0-20 each; must match rubric in prompt and sum to overall quality (app computes total 0-100)',
                properties: {
                  confidence: { type: Type.NUMBER, description: dimensionScoreFieldSchemaLine('confidence') },
                  clarity: { type: Type.NUMBER, description: dimensionScoreFieldSchemaLine('clarity') },
                  engagement: { type: Type.NUMBER, description: dimensionScoreFieldSchemaLine('engagement') },
                  research: { type: Type.NUMBER, description: dimensionScoreFieldSchemaLine('research') },
                  impact: { type: Type.NUMBER, description: dimensionScoreFieldSchemaLine('impact') },
                },
                required: ['confidence', 'clarity', 'engagement', 'research', 'impact'],
              },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              conversationSummary: { type: Type.STRING },
              difficultyAdjustment: { type: Type.STRING, description: 'How to adjust difficulty for next time' },
            },
            required: [
              'dimensionScores',
              'strengths',
              'weaknesses',
              'suggestions',
              'conversationSummary',
              'difficultyAdjustment',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}') as Partial<FeedbackData> & {
        dimensionScores?: FeedbackData['dimensionScores'];
      };
      const dimensionScores = normalizeDimensionScores(parsed.dimensionScores);
      const feedback: FeedbackData = {
        score: sumDimensionScores(dimensionScores),
        dimensionScores,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        conversationSummary:
          typeof parsed.conversationSummary === 'string'
            ? parsed.conversationSummary
            : 'No summary returned.',
        difficultyAdjustment:
          typeof parsed.difficultyAdjustment === 'string'
            ? parsed.difficultyAdjustment
            : 'Maintain current difficulty level',
      };
      const duration = initialTimerRef.current - timer;
      onEnd(messages, feedback, duration);
    } catch (err) {
      console.error("Failed to generate feedback:", err);
      // Fallback feedback
      const duration = initialTimerRef.current - timer;
      const fallbackDims = normalizeDimensionScores({
        confidence: 10,
        clarity: 10,
        engagement: 10,
        research: 10,
        impact: 10,
      });
      onEnd(messages, {
        score: sumDimensionScores(fallbackDims),
        dimensionScores: fallbackDims,
        strengths: ["Attempted to engage in the simulation"],
        weaknesses: ["Insufficient data for a detailed analysis"],
        suggestions: ["Try to speak more clearly and provide more detail in your elevator pitch next time."],
        conversationSummary: "The simulation ended before a comprehensive evaluation could be generated.",
        difficultyAdjustment: "Maintain current difficulty level",
      }, duration);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Dedicated loading UI for the feedback generation phase
  if (isEnding) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-stretch overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <div className="max-w-xl p-8 text-center">
            <div className="relative mx-auto mb-8 h-24 w-24">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            </div>
            <h2 className="mb-4 text-3xl font-bold text-white">Generating Session Review</h2>
            <p className="text-slate-400">
              Analyzing your conversation with <strong>{session.persona?.name}</strong>...
              <br />
              Evaluating clarity, confidence, and impact.
            </p>
            <div className="mt-8 flex justify-center space-x-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-500"></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-500 delay-100"></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-500 delay-200"></div>
            </div>
          </div>
        </div>
        <SimulationDisclosureBanner />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-stretch overflow-hidden">
      {!isActive && !isConnecting && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto">
        <div className="text-center p-8 max-w-xl">
          <h2 className="text-3xl font-bold text-white mb-6">Simulation Ready</h2>
          <p className="text-slate-400 mb-6">
            You will be speaking with <strong>{session.persona?.name}</strong>. 
            Once you enter, <strong>{pronoun} will introduce {reflexivePronoun} first</strong>. Listen carefully and then respond with your pitch.
          </p>
          {connectionError && (
            <p className="text-sm text-amber-200/90 bg-amber-950/40 border border-amber-800/50 rounded-xl px-4 py-3 mb-8 text-left max-w-lg mx-auto">
              {connectionError}
            </p>
          )}
          <div className="flex space-x-4 justify-center">
            <button 
              onClick={startSimulation}
              className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xl transition-all"
            >
              Enter Room
            </button>
            <button 
              onClick={onCancel}
              className="px-10 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
        </div>
      )}

      {(isActive || isConnecting) && (
        <div className="flex min-h-0 w-full flex-1 flex-col">
          {/* Header Info */}
          <div className="p-6 flex justify-between items-center text-white bg-slate-900/50 backdrop-blur-md">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-500">
                <img src={`https://picsum.photos/seed/${session.persona?.name}/48/48`} alt="Persona" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{session.persona?.name}</h3>
                <p className="text-xs text-slate-400 uppercase tracking-widest">{session.persona?.role}</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase font-bold">Time Left</p>
                <p className={`text-xl font-mono ${timer < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{formatTime(timer)}</p>
              </div>
              <button 
                onClick={endSession}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all"
                disabled={isEnding}
              >
                End Session
              </button>
            </div>
          </div>

          {/* Main Visual Area */}
          <div className="flex-grow flex flex-col md:flex-row p-6 gap-6 relative">
            {/* The "Persona" Card */}
            <div className="flex-grow bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 flex flex-col items-center justify-center relative shadow-2xl">
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent animate-pulse"></div>
              </div>
              
              <div className="z-10 text-center">
                <div className="w-32 h-32 rounded-full bg-slate-700 mx-auto mb-6 flex items-center justify-center border-4 border-indigo-500/30 overflow-hidden">
                   {isActive ? (
                     <div className="flex space-x-1 items-end h-8">
                       {[1, 2, 3, 4, 5].map(i => (
                         <div key={i} className={`w-1.5 bg-indigo-400 rounded-full animate-bounce`} style={{ animationDelay: `${i * 0.1}s`, height: `${Math.random() * 100 + 20}%` }}></div>
                       ))}
                     </div>
                   ) : (
                     <div className="text-slate-500">Connecting...</div>
                   )}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isConnecting ? 'Establishing Connection...' : `${session.persona?.name} is Speaking...`}
                </h2>
              </div>
            </div>

            {/* Camera Feed (User) */}
            <div className="w-full md:w-80 h-60 md:h-auto bg-black rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover mirror"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute bottom-4 left-4 right-4 bg-black/40 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-white font-bold uppercase">Microphone Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Preview footer */}
          <div className="min-h-24 bg-slate-800/80 border-t border-slate-700 p-6 flex items-center justify-center">
            <div className="max-w-4xl w-full text-center">
               <p className="text-slate-300 italic text-base leading-relaxed">
                 {liveTranscription || (messages.length > 0 ? messages[messages.length - 1].text : "Transcribing interaction...")}
               </p>
            </div>
          </div>
        </div>
      )}

      <SimulationDisclosureBanner />
    </div>
  );
};
