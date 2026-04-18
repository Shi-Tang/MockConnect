
import React, { useMemo } from 'react';
import { PracticeRecord } from '../types';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface DashboardProps {
  onStart: () => void;
  userRecords: PracticeRecord[];
}

export const Dashboard: React.FC<DashboardProps> = ({ onStart, userRecords }) => {
  const stats = useMemo(() => {
    if (userRecords.length === 0) return null;

    const totalDuration = userRecords.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const uniquePersonas = new Set(userRecords.map(r => r.session.persona?.name)).size;
    
    // Calculate improvement
    const sortedRecords = [...userRecords].sort((a, b) => a.timestamp - b.timestamp);
    const firstScore = sortedRecords[0].feedback.score;
    const latestScore = sortedRecords[sortedRecords.length - 1].feedback.score;
    const improvement = latestScore - firstScore;

    // Prepare chart data
    const chartData = sortedRecords.map((r, i) => ({
      name: `Session ${i + 1}`,
      score: r.feedback.score,
      date: new Date(r.timestamp).toLocaleDateString()
    }));

    return {
      totalDuration: Math.round(totalDuration / 60), // in minutes
      uniquePersonas,
      improvement,
      latestScore,
      chartData
    };
  }, [userRecords]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 lg:py-24">
      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full mb-6 uppercase tracking-wider">
            AI-Powered Coaching
          </span>
          <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
            Debug Your <span className="text-indigo-600">Networking</span> Conversations.
          </h1>
          <p className="text-xl text-slate-600 mb-10 leading-relaxed">
            Practice high-stakes networking pitches with realistic AI personas. 
            Perfect for introverts and non-native speakers looking to land that dream referral.
          </p>
          <div>
            <button 
              onClick={onStart}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-1 active:scale-95 text-lg"
            >
              Start Practice Session
            </button>
          </div>
          
          {userRecords.length > 0 && (
            <div className="mt-16">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                <span className="w-2 h-6 bg-indigo-600 rounded-full mr-3"></span>
                Your Recent Sessions
              </h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {userRecords.slice(0, 5).map((record) => (
                  <div key={record.id} className="p-4 bg-white border border-slate-100 rounded-xl flex justify-between items-center hover:border-indigo-200 transition-all group shadow-sm">
                    <div>
                      <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {record.session.persona?.name || 'Unknown Persona'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(record.timestamp).toLocaleDateString()} • {record.session.persona?.role || 'Networking'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-700">{record.feedback.score}%</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Score</div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${record.feedback.score >= 80 ? 'bg-green-500' : record.feedback.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-12 flex items-center space-x-4 text-slate-500 text-sm font-medium">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <img key={i} src={`https://picsum.photos/seed/${i + 20}/32/32`} className="w-8 h-8 rounded-full border-2 border-white" alt="User" />
              ))}
            </div>
            <span>Joined by 2,000+ job seekers this week</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 bg-indigo-100 rounded-3xl blur-2xl opacity-50 animate-pulse"></div>
          <div className="relative bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Progress Tracking
            </h2>

            {!stats ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-slate-500">No practice data yet. Start your first session to see your progress!</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-2xl font-bold text-slate-900">{stats.totalDuration}m</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Total Mock</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-2xl font-bold text-indigo-600">
                      {stats.improvement > 0 ? `+${stats.improvement}` : stats.improvement}%
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Improvement</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-2xl font-bold text-slate-900">{stats.uniquePersonas}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Personas</div>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        hide 
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#94a3b8'}}
                      />
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        itemStyle={{color: '#4f46e5', fontWeight: 'bold'}}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#4f46e5" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorScore)" 
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-indigo-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Current Mastery</div>
                      <div className="text-3xl font-bold">{stats.latestScore}%</div>
                    </div>
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
