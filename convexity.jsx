import React, { useState, useMemo, useEffect } from 'react';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip
} from 'recharts';
import { 
  ShieldCheck, 
  BarChart3, 
  Plus, 
  Trash2, 
  Info, 
  Zap, 
  ChevronRight,
  Activity,
  PieChart as PieIcon,
  Users,
  Mail,
  Briefcase,
  User,
  Menu,
  X,
  ArrowRight,
  Shield,
  Search,
  Globe,
  Cpu,
  Lock,
  Target,
  Database,
  Layers,
  TrendingDown,
  ChevronDown,
  Loader2,
  Sparkles
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection } from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'convexity-clarity';

// --- Quant Constants ---
const FACTOR_CATEGORIES = [
  { name: 'US Tech Beta', color: '#3b82f6' },
  { name: 'Rate Sensitivity', color: '#10b981' },
  { name: 'Small Cap / Value', color: '#f59e0b' },
  { name: 'Geopolitical Risk', color: '#ef4444' },
  { name: 'Commodity Alpha', color: '#8b5cf6' }
];

const TICKER_DATABASE = {
  'AAPL': { name: 'Apple Inc.', factors: [0.9, 0.2, 0.1, 0.1, 0.1], price: 185, type: 'Tech' },
  'NVDA': { name: 'NVIDIA Corp.', factors: [1.0, 0.3, 0.0, 0.2, 0.1], price: 820, type: 'Tech' },
  'TLT': { name: '20+ Yr Treasury', factors: [0.0, 0.9, 0.0, 0.4, -0.2], price: 92, type: 'Bond' },
  'GLD': { name: 'SPDR Gold Shares', factors: [0.1, -0.1, 0.0, 0.8, 0.9], price: 215, type: 'Commodity' },
  'VTI': { name: 'Vanguard Total Stock', factors: [0.7, 0.4, 0.3, 0.2, 0.2], price: 250, type: 'Index' },
  'MSFT': { name: 'Microsoft Corp.', factors: [0.85, 0.25, 0.05, 0.1, 0.05], price: 420, type: 'Tech' },
  'TSLA': { name: 'Tesla, Inc.', factors: [0.95, 0.4, 0.2, 0.3, 0.1], price: 175, type: 'Tech' },
  'BTC': { name: 'Bitcoin (Proxy)', factors: [0.6, 0.1, 0.5, 0.7, 0.3], price: 65000, type: 'Alt' }
};

const STRESS_SCENARIOS = {
  'Black Monday Redux': { market: -0.20, tech: -0.25, bond: 0.05, gold: 0.10, desc: 'A sudden 20% market-wide crash.' },
  'Inflation Spike': { market: -0.05, tech: -0.15, bond: -0.10, gold: 0.25, desc: 'Interest rates surge unexpectedly.' },
  'AI Bubble Burst': { market: -0.10, tech: -0.40, bond: 0.05, gold: 0.02, desc: 'Tech sector undergoes massive re-rating.' },
  'Debt Ceiling Crisis': { market: -0.08, tech: -0.06, bond: -0.15, gold: 0.15, desc: 'Sovereign credit concerns spike.' }
};

const Dashboard = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [newTicker, setNewTicker] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [activeScenario, setActiveScenario] = useState(null);
  const [convexityEnabled, setConvexityEnabled] = useState(false);
  const [user, setUser] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Auth Lifecycle ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- Firestore Data Sync ---
  useEffect(() => {
    if (!user) return;
    // Path: /artifacts/{appId}/users/{userId}/data/portfolio
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'portfolioData');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPortfolio(data.holdings || []);
        setConvexityEnabled(data.convexityEnabled || false);
      } else {
        // Initialize with default data if doc doesn't exist
        const defaultPortfolio = [
          { ticker: 'AAPL', amount: 12000 },
          { ticker: 'NVDA', amount: 8000 },
          { ticker: 'VTI', amount: 25000 }
        ];
        setDoc(docRef, { holdings: defaultPortfolio, convexityEnabled: false });
      }
    }, (err) => console.error("Firestore Error:", err));
    return () => unsubscribe();
  }, [user]);

  const saveToCloud = async (newHoldings, newConvexity) => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'portfolioData');
    await setDoc(docRef, { 
      holdings: newHoldings !== undefined ? newHoldings : portfolio, 
      convexityEnabled: newConvexity !== undefined ? newConvexity : convexityEnabled 
    }, { merge: true });
  };

  const totalValue = useMemo(() => portfolio.reduce((sum, item) => sum + item.amount, 0), [portfolio]);

  const factorAnalysis = useMemo(() => {
    if (totalValue === 0) return FACTOR_CATEGORIES.map(cat => ({ subject: cat.name, value: 0 }));
    const totals = [0, 0, 0, 0, 0];
    portfolio.forEach(item => {
      const data = TICKER_DATABASE[item.ticker];
      if (data) {
        data.factors.forEach((f, i) => {
          totals[i] += f * (item.amount / totalValue);
        });
      }
    });
    return FACTOR_CATEGORIES.map((cat, i) => ({
      subject: cat.name,
      value: Math.min(totals[i] * 100, 100),
      fullMark: 100,
      color: cat.color
    }));
  }, [portfolio, totalValue]);

  const healthScore = useMemo(() => {
    if (portfolio.length === 0) return 0;
    const variance = factorAnalysis.reduce((acc, f) => acc + Math.pow(f.value - 40, 2), 0) / 5;
    return Math.max(0, Math.min(100, Math.round(95 - (variance / 10))));
  }, [factorAnalysis, portfolio]);

  const simulateReturn = (scenario) => {
    let rawReturn = 0;
    portfolio.forEach(item => {
      const data = TICKER_DATABASE[item.ticker];
      if (data) {
        if (data.type === 'Tech') rawReturn += scenario.tech * (item.amount / totalValue);
        else if (data.type === 'Bond') rawReturn += scenario.bond * (item.amount / totalValue);
        else if (data.type === 'Commodity') rawReturn += scenario.gold * (item.amount / totalValue);
        else rawReturn += scenario.market * (item.amount / totalValue);
      }
    });

    if (convexityEnabled) {
      const cost = -0.005;
      const protectedReturn = Math.max(rawReturn, -0.05);
      return protectedReturn + cost;
    }
    return rawReturn;
  };

  const addHolding = () => {
    const t = newTicker.toUpperCase();
    if (TICKER_DATABASE[t] && newAmount > 0) {
      const existingIdx = portfolio.findIndex(p => p.ticker === t);
      let updated;
      if (existingIdx > -1) {
        updated = [...portfolio];
        updated[existingIdx].amount += parseFloat(newAmount);
      } else {
        updated = [...portfolio, { ticker: t, amount: parseFloat(newAmount) }];
      }
      saveToCloud(updated);
      setNewTicker('');
      setNewAmount('');
    }
  };

  const removeHolding = (index) => {
    const updated = portfolio.filter((_, i) => i !== index);
    saveToCloud(updated);
  };

  const toggleConvexity = () => {
    const nextState = !convexityEnabled;
    saveToCloud(undefined, nextState);
  };

  // --- Gemini API: AI Risk Insight ---
  const generateAIReport = async () => {
    if (portfolio.length === 0) return;
    setIsGenerating(true);
    const apiKey = ""; // Runtime provided
    const model = "gemini-2.5-flash-preview-09-2025";
    
    const holdingsStr = portfolio.map(h => `${h.ticker} ($${h.amount})`).join(', ');
    const userQuery = `Analyze this portfolio: ${holdingsStr}. Current Diversification Score: ${healthScore}/100. 
    Dominant Risk: ${factorAnalysis.sort((a,b) => b.value - a.value)[0].subject}. 
    Convexity Agent is ${convexityEnabled ? 'ON' : 'OFF'}. 
    Provide a professional, 2-paragraph risk assessment for a retail investor. 
    Be direct about hidden factor correlations.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userQuery }] }],
          systemInstruction: { parts: [{ text: "You are a senior quantitative risk analyst at a major hedge fund. Speak with authority and mathematical precision. Avoid generic advice." }] }
        })
      });

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      setAiReport(text);
    } catch (error) {
      console.error("AI Generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 relative z-10 w-full">
      {/* Top Landscape KPI Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col justify-center border border-slate-800 shadow-xl">
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Assets Under Audit</div>
          <div className="text-2xl font-black">${totalValue.toLocaleString()}</div>
          <div className="mt-2 text-[10px] font-bold text-blue-400 flex items-center gap-1">
            <TrendingDown size={12} className="rotate-180" /> Cloud Sync Active
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
            <Target size={12} /> Diversification Score
          </div>
          <div className="text-3xl font-black text-slate-900">{healthScore}<span className="text-sm text-slate-300">/100</span></div>
          <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-1000 ${healthScore > 80 ? 'bg-emerald-500' : healthScore > 60 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${healthScore}%` }} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
            <Activity size={12} /> Dominant Factor
          </div>
          <div className="text-lg font-black text-slate-800 truncate">{factorAnalysis.sort((a,b) => b.value - a.value)[0].subject}</div>
          <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Beta Weight: {Math.round(factorAnalysis[0].value)}%</div>
        </div>
        <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-center ${convexityEnabled ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
          <div className="flex justify-between items-center">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Convexity Agent</div>
            <div onClick={toggleConvexity} className={`w-10 h-5 rounded-full cursor-pointer relative transition-colors ${convexityEnabled ? 'bg-white/20' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${convexityEnabled ? 'translate-x-5' : ''}`} />
            </div>
          </div>
          <div className="text-lg font-black uppercase">{convexityEnabled ? 'Anti-Fragile' : 'Exposed'}</div>
        </div>
      </div>

      {/* Main Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Asset Terminal */}
        <div className="lg:col-span-3 space-y-6 h-full">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Asset Terminal</h3>
              <Layers size={14} className="text-slate-400" />
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto max-h-[350px] space-y-2 custom-scrollbar">
              {!portfolio.length && <div className="text-center py-10 text-[10px] text-slate-400 font-bold uppercase italic tracking-widest">Awaiting Liquidity...</div>}
              {portfolio.map((item, idx) => (
                <div key={idx} className="group flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-300 hover:shadow-md transition-all">
                  <div>
                    <div className="font-black text-slate-900 text-sm leading-tight">{item.ticker}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{TICKER_DATABASE[item.ticker]?.type}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-xs">${item.amount.toLocaleString()}</div>
                      <div className="text-[9px] text-slate-400 font-black">{((item.amount / (totalValue || 1)) * 100).toFixed(1)}%</div>
                    </div>
                    <button onClick={() => removeHolding(idx)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
              <div className="flex gap-2">
                <input 
                  type="text" placeholder="Ticker" value={newTicker} onChange={e => setNewTicker(e.target.value.toUpperCase())}
                  className="w-1/3 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 ring-blue-500 outline-none"
                />
                <input 
                  type="number" placeholder="Value" value={newAmount} onChange={e => setNewAmount(e.target.value)}
                  className="w-2/3 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 ring-blue-500 outline-none"
                />
              </div>
              <button 
                onClick={addHolding} disabled={!TICKER_DATABASE[newTicker] || !newAmount}
                className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 disabled:opacity-50 transition-all shadow-lg"
              >
                Execute Buy Order
              </button>
            </div>
          </section>

          {/* AI Insight Trigger Card */}
          <section className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Sparkles size={40} /></div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-3 relative z-10">AI Risk Audit</h3>
            <p className="text-[10px] font-bold opacity-80 mb-6 leading-relaxed relative z-10">Use LLM-Factor analysis to derive non-linear risk correlations in your portfolio.</p>
            <button 
              onClick={generateAIReport}
              disabled={isGenerating || portfolio.length === 0}
              className="w-full bg-white text-indigo-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2 relative z-10 shadow-lg"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : "Run AI Diagnostic"}
            </button>
          </section>
        </div>

        {/* Center: Factor Radar & AI Report */}
        <div className="lg:col-span-5 h-full space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col min-h-[400px]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Sensitivity Radar</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">PCA Decomposition v4.2</p>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 size={20} /></div>
            </div>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={factorAnalysis}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                  <Radar name="Exposure" dataKey="value" stroke="#2563eb" strokeWidth={4} fill="#3b82f6" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {aiReport && (
            <section className="bg-white border-2 border-indigo-100 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 mb-4 text-indigo-600">
                <Sparkles size={16} />
                <h3 className="text-xs font-black uppercase tracking-widest">Hedge Fund Intelligence Report</h3>
              </div>
              <div className="prose prose-sm prose-slate max-w-none">
                <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                  {aiReport}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Model: Gemini 2.5 Flash</span>
                 <button onClick={() => setAiReport(null)} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500">Dismiss</button>
              </div>
            </section>
          )}
        </div>

        {/* Right: Stress Test Terminal */}
        <div className="lg:col-span-4 h-full space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Black Swan Simulator</h3>
              <Zap size={18} className="text-amber-500" />
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              {Object.entries(STRESS_SCENARIOS).map(([name, data]) => {
                const impact = simulateReturn(data);
                const isSelected = activeScenario === name;
                return (
                  <div 
                    key={name} onClick={() => setActiveScenario(name)} 
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer group relative ${isSelected ? 'bg-slate-900 border-slate-900 shadow-xl' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className={`text-xs font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>{name}</div>
                      <div className={`text-base font-black ${impact >= 0 ? 'text-emerald-500' : (isSelected ? 'text-red-400' : 'text-red-600')}`}>
                        {(impact * 100).toFixed(1)}%
                      </div>
                    </div>
                    <p className={`text-[10px] font-bold leading-tight ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>{data.desc}</p>
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-white/10 animate-in fade-in slide-in-from-top-1">
                        <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Impact Analysis</div>
                        <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
                          Primary exposure to {factorAnalysis[0].subject} creates {Math.abs(impact) > 0.15 ? 'Critical' : 'Moderate'} risk. 
                          {convexityEnabled ? ' Hedging agent successfully compressed drawdown.' : ' Portfolio remains unhedged.'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-slate-900 rounded-xl border border-slate-800">
               <div className="flex items-center gap-3 text-blue-400 mb-2">
                 <Database size={14} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Multi-Asset Support</span>
               </div>
               <div className="flex gap-3 flex-wrap">
                 {['Equity', 'Options', 'ETF', 'Crypto', 'Commodity'].map(tag => (
                   <span key={tag} className="text-[9px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md font-bold">● {tag}</span>
                 ))}
               </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const scrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'what-we-do', 'dashboard', 'team', 'careers', 'contact'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) setActiveSection(section);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-white text-slate-900 selection:bg-blue-100 font-sans antialiased">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-xl z-[100] border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => scrollTo('home')}>
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-100">
                <Zap className="text-white fill-white w-5 h-5" />
            </div>
            <span className="font-black text-2xl tracking-tighter text-slate-900 uppercase">CONVEXITY</span>
          </div>

          <div className="hidden lg:flex items-center gap-10">
            {['What we do', 'Dashboard', 'Team', 'Careers', 'Contact'].map((item) => {
              const id = item.toLowerCase().replace(/ /g, '-');
              return (
                <button 
                  key={item} onClick={() => scrollTo(id)}
                  className={`text-xs font-black uppercase tracking-[0.25em] transition-all relative py-2 ${activeSection === id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-900'}`}
                >
                  {item}
                  {activeSection === id && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full animate-in fade-in zoom-in-50" />}
                </button>
              );
            })}
            <button 
              onClick={() => scrollTo('dashboard')}
              className="bg-slate-900 text-white px-7 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-200 transition-all active:scale-95"
            >
              Audit Portfolio
            </button>
          </div>

          <button className="lg:hidden p-2 text-slate-900" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-48 pb-24 px-6 md:px-12 max-w-7xl mx-auto min-h-[85vh] flex flex-col justify-center relative">
        <div className="absolute top-40 right-10 w-[600px] h-[600px] bg-blue-50 blur-[150px] rounded-full pointer-events-none -z-10 animate-pulse"></div>
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-100 text-slate-900 rounded-xl text-xs font-black uppercase tracking-[0.3em] mb-10 shadow-sm border border-slate-200">
            AI-Driven Institutional Risk Intelligence
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-slate-900 leading-[0.9] mb-10 tracking-tighter">
            Audit your risk <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-indigo-700">with institutional precision.</span>
          </h1>
          <p className="text-lg md:text-2xl text-slate-500 font-medium leading-relaxed mb-12 max-w-2xl">
            Professional-grade risk auditing, built for individual investors. Decompose complex portfolio returns into transparent, actionable macro factors.
          </p>
          <div className="flex flex-col sm:flex-row gap-5">
            <button onClick={() => scrollTo('dashboard')} className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-200 transition-all flex items-center justify-center gap-3 group active:scale-95">
              Start Audit <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => scrollTo('what-we-do')} className="px-10 py-5 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-black text-lg hover:border-slate-900 transition-all active:scale-95">
              Methodology
            </button>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="what-we-do" className="py-32 bg-slate-50 px-6 md:px-12 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">Core Framework</h2>
            <h3 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter">Intelligence over Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Search, title: 'Factor Analysis (PCA)', color: 'blue', desc: 'Break down your portfolio into real-world drivers like Interest Rate Sensitivity, Momentum, and Volatility Premium.' },
              { icon: ShieldCheck, title: 'Tail Risk Hedging', color: 'emerald', desc: 'Deploy automated delta-hedging strategies that activate during systemic market collapses to preserve your wealth.' },
              { icon: Database, title: 'Multi-Asset Support', color: 'purple', desc: 'Analyze complex exposure across Equities, Options, ETFs, Crypto, and Commodities in one unified risk terminal.' }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group hover:-translate-y-2 duration-500">
                <div className={`w-14 h-14 bg-${feature.color}-50 rounded-2xl flex items-center justify-center mb-8 text-${feature.color}-600 group-hover:bg-${feature.color}-600 group-hover:text-white transition-all duration-500`}>
                  <feature.icon size={28} />
                </div>
                <h4 className="text-2xl font-black mb-4 tracking-tight text-slate-900">{feature.title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Section (Landscape One-Pager) */}
      <section id="dashboard" className="py-32 px-6 md:px-12 bg-white overflow-hidden scroll-mt-20">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-slate-900">Risk Terminal v1.0</h2>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                <Globe size={14} className="text-blue-500" /> Professional-Grade Multi-Asset Simulation Engine
              </p>
            </div>
            <div className="flex gap-4">
               <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                 <span className="text-[10px] font-black uppercase text-slate-600">Live Connection</span>
               </div>
            </div>
          </div>
          <Dashboard />
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-32 bg-slate-900 text-white px-6 md:px-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/20 to-transparent"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-20">
            <h2 className="text-xs font-black text-blue-400 uppercase tracking-[0.5em] mb-4 text-center md:text-left">Strategic Pillars</h2>
            <h3 className="text-5xl md:text-7xl font-black tracking-tighter text-center md:text-left">Engineered Excellence</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div className="group cursor-default">
              <div className="text-blue-500 font-black text-xs uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Search size={16} /> 01. Quantitative Research
              </div>
              <h4 className="text-3xl font-black mb-6 tracking-tight">Factor Modeling</h4>
              <p className="text-slate-400 text-base leading-relaxed font-medium">
                Our research team develops proprietary risk signals and multi-asset factor models based on institutional-grade non-linear math.
              </p>
            </div>
            <div className="group cursor-default">
              <div className="text-emerald-500 font-black text-xs uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Shield size={16} /> 02. Financial Engineering
              </div>
              <h4 className="text-3xl font-black mb-6 tracking-tight">Derivative Systems</h4>
              <p className="text-slate-400 text-base leading-relaxed font-medium">
                Expert architects building the backtesting pipelines and real-time delta-hedging logic that powers our Convexity Agents.
              </p>
            </div>
            <div className="group cursor-default">
              <div className="text-purple-500 font-black text-xs uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Cpu size={16} /> 03. Core Development
              </div>
              <h4 className="text-3xl font-black mb-6 tracking-tight">System Infrastructure</h4>
              <p className="text-slate-400 text-base leading-relaxed font-medium">
                A dedicated dev team focused on ultra-low latency data execution and intuitive, information-dense UX design.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Careers Section */}
      <section id="careers" className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-6">Talent Acquisition</h2>
            <h3 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 leading-tight">Build the future of <br/> sovereign wealth.</h3>
          </div>
          <button className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-3 group active:scale-95">
            View Roles <Briefcase size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: 'Quant Engineer (Rust)', loc: 'Remote', type: 'Full-time' },
            { title: 'Senior AI Architect', loc: 'San Francisco', type: 'Full-time' }
          ].map((job, idx) => (
            <div key={idx} className="group p-10 bg-white border-2 border-slate-100 rounded-[2.5rem] hover:border-blue-600 hover:shadow-2xl transition-all cursor-pointer flex justify-between items-center">
              <div>
                <h4 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors mb-2">{job.title}</h4>
                <div className="flex gap-4">
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">{job.loc}</span>
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">{job.type}</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                <ChevronRight size={24} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 bg-white px-6 md:px-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto bg-blue-600 rounded-[4rem] p-12 md:p-24 relative overflow-hidden flex flex-col lg:flex-row gap-20 items-center shadow-3xl shadow-blue-200">
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/10 to-transparent pointer-events-none"></div>
          
          <div className="lg:w-1/2 text-white z-10">
            <h2 className="text-5xl md:text-8xl font-black mb-10 tracking-tighter leading-[0.8]">Let's solve <br/> for clarity.</h2>
            <p className="text-blue-100 text-xl font-medium mb-12 opacity-90 leading-relaxed max-w-md">Institutional-grade risk management for sophisticated individual portfolios and family offices.</p>
            <div className="flex items-center gap-6 group cursor-pointer w-fit">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-blue-600 transition-all duration-500"><Mail size={28} /></div>
              <span className="text-2xl font-black border-b-2 border-transparent group-hover:border-white transition-all">hello@convexity.ai</span>
            </div>
          </div>

          <div className="lg:w-1/2 w-full z-10">
            <div className="bg-white p-12 md:p-16 rounded-[3rem] shadow-2xl">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Full Name</label>
                  <input type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm text-slate-900 font-bold outline-none focus:ring-2 ring-blue-500" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Email Address</label>
                  <input type="email" className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm text-slate-900 font-bold outline-none focus:ring-2 ring-blue-500" placeholder="john@domain.com" />
                </div>
                <button className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-base uppercase tracking-[0.25em] hover:bg-slate-800 transition-all shadow-xl active:scale-95">
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-white border-t border-slate-100 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12 mb-16">
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-2 rounded-xl shadow-sm">
                <Zap className="text-slate-400 w-6 h-6" />
              </div>
              <span className="font-black text-2xl text-slate-400 tracking-tighter uppercase">CONVEXITY</span>
            </div>
            <div className="flex gap-12 text-[11px] text-slate-400 font-black uppercase tracking-[0.3em]">
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Legal</a>
              <a href="#" className="hover:text-slate-900 transition-colors">API</a>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-slate-50 gap-6">
            <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.4em]">© 2024 CONVEXITY CAPITAL MARKETS LLC.</p>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-slate-300 font-mono italic px-3 py-1 bg-slate-50 rounded-full">ENGINE_V:1.0.9</span>
              <span className="text-[10px] text-slate-300 font-mono italic px-3 py-1 bg-slate-50 rounded-full">AUTH:LEVEL_4</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
