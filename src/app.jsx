import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Image as ImageIcon,
  Sparkles, 
  Zap,
  History as HistoryIcon,
  Plus,
  Settings,
  Monitor,
  Smartphone,
  Layers,
  X,
  MessageSquare,
  User,
  ShieldCheck,
  TrendingUp,
  Save,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  Bug,
  Lock,
  RefreshCw,
  Info
} from 'lucide-react';

// URL do seu workflow n8n que cria e responde para esse react
const N8N_WEBHOOK_URL = "https://webhook.monarcahub.com/webhook/midias";

// Configuração de ambiente segura
const getEnv = (key, fallback) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {}
  return fallback;
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL', "https://wjyrinydwrazuzjczhbw.supabase.co");
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY', "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeXJpbnlkd3JhenV6amN6aGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0OTA3MTAsImV4cCI6MjA3OTA2NjcxMH0.lx5gKNPJLBfBouwH99MFFYHtjvxDZeohwoJr9JlSblg");

export default function App() {
  const [supabase, setSupabase] = useState(null);
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [selectedFormat, setSelectedFormat] = useState('quadrado');
  const [showPlans, setShowPlans] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [generatedResult, setGeneratedResult] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [authError, setAuthError] = useState(false);

  // Configurações de Identidade Visual
  const [brandData, setBrandData] = useState({
    colors: ['#EA580C'],
    logo_base64: '',
    reference_images: [], // Array para até 3 imagens de referência que o usuário subiu no painel para sua marca
    tone_of_voice: 'Profissional',
    personality: ''
  });
  const [newColor, setNewColor] = useState('#EA580C');

  useEffect(() => {
    const loadSupabaseScript = () => {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.async = true;
      script.onload = () => {
        if (window.supabase) {
          initSupabase(window.supabase);
        }
      };
      document.head.appendChild(script);
    };

    const initSupabase = async (supabaseSdk) => {
      try {
        const client = supabaseSdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        setSupabase(client);

        const { data: { session } } = await client.auth.getSession();
        let currentUser = session?.user;

        if (!session) {
          const { data: { user: anonUser }, error: signInError } = await client.auth.signInAnonymously();
          if (signInError) {
            if (signInError.message.includes("Anonymous sign-ins are disabled")) {
              setAuthError(true);
              throw new Error("Login Anônimo Desativado.");
            }
            throw signInError;
          }
          currentUser = anonUser;
        }
        
        setUser(currentUser);
        if (currentUser) {
          await ensureProfileExists(client, currentUser.id);
          await fetchCredits(client, currentUser.id);
          await fetchBrandSettings(client, currentUser.id);
          await fetchHistory(client, currentUser.id);
        }
      } catch (err) {
        console.error("Erro ao inicializar Supabase:", err.message);
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSupabaseScript();
  }, []);

  const ensureProfileExists = async (client, userId) => {
    try {
      const { data } = await client.from('profiles').select('id').eq('id', userId).single();
      if (!data) {
        await client.from('profiles').insert({ id: userId, credits_balance: 100 });
      }
    } catch (e) {}
  };

  const fetchCredits = async (client, userId) => {
    const { data } = await client.from('profiles').select('credits_balance').eq('id', userId).single();
    if (data) setCredits(data.credits_balance);
  };

  const handleAddTestCredits = async () => {
    if (!supabase || !user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ credits_balance: credits + 100 })
        .eq('id', user.id);
      
      if (!error) {
        setCredits(prev => prev + 100);
        setErrorMsg(""); 
      }
    } catch (e) {
      setErrorMsg("Erro ao adicionar créditos.");
    }
  };

  const fetchBrandSettings = async (client, userId) => {
    const { data } = await client.from('brand_settings').select('*').eq('id', userId).single();
    if (data) {
        // Garantir que reference_images seja sempre um array - não está funcionando (precisa corrigir pra salvar também no supabase)
        const normalizedData = {
            ...data,
            reference_images: Array.isArray(data.reference_images) ? data.reference_images : []
        };
        setBrandData(normalizedData);
    }
  };

  const fetchHistory = async (client, userId) => {
    const { data } = await client
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setHistory(data);
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
    });
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1500000) {
      alert("Imagem superior a 1.5MB.");
      return;
    }
    const base64 = await convertToBase64(file);
    
    if (type === 'logo') {
      setBrandData({ ...brandData, logo_base64: base64 });
    } else if (type === 'reference') {
      if (brandData.reference_images.length >= 3) {
        alert("Limite de 3 imagens de referência atingido.");
        return;
      }
      setBrandData({ 
        ...brandData, 
        reference_images: [...brandData.reference_images, base64] 
      });
    }
    // Limpar input para permitir re-upload do mesmo arquivo se necessário
    e.target.value = "";
  };

  const removeReferenceImage = (index) => {
    const newRefs = brandData.reference_images.filter((_, i) => i !== index);
    setBrandData({ ...brandData, reference_images: newRefs });
  };

  const handleSaveBrand = async () => {
    if (!supabase || !user) return;
    setSaveStatus('saving');
    try {
      await supabase.from('brand_settings').upsert({ 
        id: user.id, 
        ...brandData, 
        updated_at: new Date().toISOString() 
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) { 
      setSaveStatus('error');
    }
  };

  const handleGeneratePost = async () => {
    if (credits < 20) {
      setErrorMsg("Saldo insuficiente. Clique no (+) ou no ícone de recarga.");
      return;
    }
    if (!prompt) {
      setErrorMsg("O prompt está vazio.");
      return;
    }

    setGenerating(true);
    setGeneratedResult(null);
    setErrorMsg("");

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          prompt: prompt,
          format: selectedFormat,
          brand: {
            colors: brandData.colors,
            personality: brandData.personality,
            tone: brandData.tone_of_voice,
            logo: brandData.logo_base64,
            references: brandData.reference_images // Enviando as referências
          }
        })
      });

      if (!response.ok) throw new Error(`n8n HTTP ${response.status}`);

      const data = await response.json();
      const imageUrl = data.image || data.url || (data[0] && (data[0].image || data[0].url));
      const caption = data.caption || data.text || (data[0] && (data[0].caption || data[0].text));

      if (imageUrl) {
        setGeneratedResult({ image: imageUrl, caption: caption || "" });

        const { error: rpcError } = await supabase.rpc('consume_credits', { 
          user_id_param: user.id, 
          amount_to_consume: 20, 
          desc_param: `Post ${selectedFormat}: ${prompt.substring(0, 15)}` 
        });
        
        if (!error) {
          setCredits(prev => prev - 20);
          fetchHistory(supabase, user.id);
        }
      } else {
        throw new Error("n8n não retornou uma imagem.");
      }
    } catch (err) {
      setErrorMsg(`Falha: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500/20 border-t-orange-500"></div>
        <p className="mt-4 text-slate-500 font-bold text-[10px] uppercase tracking-widest animate-pulse">Sincronizando...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-center font-sans">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mb-6 border border-red-500/20 shadow-2xl">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 italic uppercase tracking-tighter">Acesso Bloqueado</h2>
        <p className="text-slate-500 max-w-md text-sm leading-relaxed mb-8">Ative o login anônimo no Supabase para prosseguir.</p>
        <button onClick={() => window.location.reload()} className="bg-white text-slate-950 font-bold px-8 py-3 rounded-xl hover:bg-orange-500 hover:text-white transition shadow-lg uppercase text-xs tracking-widest">Recarregar</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-200 overflow-x-hidden relative">
      <main className="flex-1 overflow-y-auto relative z-10">
        
        {/* Navbar */}
        <div className="sticky top-0 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-6 md:px-12 py-4 flex flex-wrap justify-between items-center z-30 gap-4 shadow-2xl">
          <div className="flex items-center gap-6 md:gap-12">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('chat')}>
              <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center text-white shadow-lg">
                <Sparkles size={18} fill="currentColor" />
              </div>
              <h1 className="text-lg font-bold text-white italic uppercase tracking-tighter hidden sm:block">SocialIA</h1>
            </div>

            <nav className="flex gap-4 md:gap-8">
              <button onClick={() => setActiveTab('chat')} className={`text-sm font-bold transition-all pb-1 border-b-2 ${activeTab === 'chat' ? 'text-white border-orange-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>Chat IA</button>
              <button onClick={() => setActiveTab('brand')} className={`text-sm font-bold transition-all pb-1 border-b-2 ${activeTab === 'brand' ? 'text-white border-orange-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>Marca</button>
              <button onClick={() => setActiveTab('history')} className={`text-sm font-bold transition-all pb-1 border-b-2 ${activeTab === 'history' ? 'text-white border-orange-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>Histórico</button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={handleAddTestCredits} title="Resetar Créditos (Teste)" className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-orange-500 transition-all active:scale-90">
              <RefreshCw size={18} />
            </button>

            <div 
              onClick={() => setShowPlans(true)}
              className="flex items-center gap-4 bg-slate-900 border border-slate-800 hover:border-orange-500/50 px-4 py-2 rounded-2xl cursor-pointer transition-all active:scale-95 group shadow-xl"
            >
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-orange-500" fill="currentColor" />
                <span className="text-xl font-bold text-white tracking-tighter">{credits.toLocaleString()}</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase">pts</span>
              </div>
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white group-hover:bg-orange-500 transition shadow-inner">
                <Plus size={18} strokeWidth={3} />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 md:p-12 animate-in fade-in duration-700">
          
          {activeTab === 'chat' && (
            <div className="space-y-10">
              <div className="space-y-2 text-center md:text-left border-l-4 border-orange-600 pl-6">
                <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase tracking-widest opacity-90">Gestor de Mídias IA</h2>
                <p className="text-slate-500 font-medium text-base">Crie artes usando o Flux e seu manual de marca.</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-4 space-y-6">
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                      <Layers size={18} className="text-orange-500" />
                      <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Briefing Criativo</h3>
                    </div>
                    
                    <div className="space-y-6">
                      <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: Um post minimalista para anunciar a nova coleção de café..."
                        className="w-full h-44 p-5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-orange-500 outline-none transition-all placeholder:text-slate-800 text-slate-300 text-sm leading-relaxed shadow-inner"
                      />
                      
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Proporção</label>
                        <div className="grid grid-cols-1 gap-2">
                          {[{id:'quadrado', l:'Feed Quadrado', i:Monitor}, {id:'retrato', l:'Feed Retrato', i:Smartphone}, {id:'stories', l:'Stories / Reels', i:Smartphone}].map(f => (
                            <button key={f.id} onClick={() => setSelectedFormat(f.id)} className={`flex items-center justify-between p-3 px-4 rounded-xl border-2 transition-all ${selectedFormat === f.id ? 'border-orange-500 bg-orange-500/5 text-white shadow-lg' : 'border-slate-800 bg-slate-950 text-slate-500'}`}>
                              <div className="flex items-center gap-3"> <f.i size={14} /> <span className="text-xs font-bold">{f.l}</span> </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {errorMsg && (
                        <div className={`p-4 rounded-2xl flex flex-col gap-1 border animate-in slide-in-from-top-2 ${credits < 20 ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                          <div className="flex items-center gap-2 uppercase tracking-widest text-[10px] font-black"> 
                            <AlertCircle size={14} /> {credits < 20 ? "Saldo Baixo" : "Erro no Webhook"} 
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium normal-case leading-tight">{errorMsg}</p>
                        </div>
                      )}

                      <button 
                        onClick={handleGeneratePost}
                        disabled={generating || !prompt}
                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
                      >
                        {generating ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <> <Zap size={18} fill="currentColor" /> <span className="text-sm uppercase tracking-wider italic">Gerar no Flux (-20 pts)</span> </>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-8 flex flex-col items-center gap-8">
                  <div className={`bg-slate-900 border-4 border-slate-800 rounded-[3rem] shadow-3xl relative overflow-hidden flex items-center justify-center transition-all duration-700 w-full ${selectedFormat === 'stories' ? 'aspect-[9/16] max-h-[600px] mx-auto' : selectedFormat === 'retrato' ? 'aspect-[4/5] max-h-[600px] mx-auto' : 'aspect-square max-w-[500px]'}`}>
                    {generating ? (
                      <div className="text-center space-y-6 animate-pulse p-10">
                        <div className="w-20 h-20 bg-slate-950 rounded-[2rem] flex items-center justify-center text-orange-500 mx-auto shadow-2xl border border-slate-800"> <Bug size={32} /> </div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-[0.3em] italic">Processando no Flux...</h4>
                      </div>
                    ) : generatedResult ? (
                      <div className="w-full h-full relative group">
                        <img src={generatedResult.image} className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-1000" alt="Generated" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                           <button className="bg-white text-slate-950 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-2xl hover:bg-orange-500 hover:text-white transition"> <Download size={18} /> Download </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-12 max-w-xs space-y-4 opacity-20 italic">
                        <ImageIcon size={48} className="mx-auto" />
                        <p className="text-xs font-bold uppercase tracking-widest text-center">Aguardando a mágica do n8n</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'brand' && (
            <div className="max-w-4xl space-y-10 animate-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                <div className="space-y-2 border-l-4 border-slate-800 pl-6">
                  <h2 className="text-2xl font-bold text-white tracking-tight uppercase tracking-widest opacity-90 italic">Manual da Marca</h2>
                  <p className="text-slate-500 font-medium text-sm">Estes dados orientam o Flux a respeitar seu estilo.</p>
                </div>
                <button 
                  onClick={handleSaveBrand} 
                  disabled={saveStatus === 'saving'}
                  className={`min-w-[200px] font-bold px-8 py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                    saveStatus === 'success' ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 
                    saveStatus === 'error' ? 'bg-red-600 text-white shadow-red-600/20' : 
                    'bg-white text-slate-950 hover:bg-orange-600 hover:text-white transition-all active:scale-95'
                  }`}
                >
                  {saveStatus === 'saving' ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent" /> : <Save size={18} />}
                  {saveStatus === 'success' ? 'Sincronizado!' : saveStatus === 'error' ? 'Erro de Sinc.' : 'Salvar Manual'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                  {/* LOGO */}
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl space-y-6">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"> <Sparkles size={12} className="text-orange-500" /> Logótipo Principal</label>
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner group relative">
                        {brandData.logo_base64 ? (
                            <>
                                <img src={brandData.logo_base64} className="w-full h-full object-contain p-2" alt="Logo" />
                                <button onClick={() => setBrandData({...brandData, logo_base64: ''})} className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"> <Trash2 size={18} /> </button>
                            </>
                        ) : <ImageIcon size={24} className="text-slate-800" />}
                      </div>
                      <label className="flex-1 cursor-pointer">
                        <div className="bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition shadow-inner">
                          <Upload size={18} /> <span className="text-xs font-bold uppercase tracking-widest">Subir Logo</span>
                        </div>
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* CORES */}
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl space-y-6">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Paleta de Cores</label>
                    <div className="flex flex-wrap gap-3">
                      {brandData.colors.map(color => (
                        <div key={color} className="relative group">
                          <div className="w-12 h-12 rounded-xl border border-white/10 shadow-lg" style={{ backgroundColor: color }}></div>
                          <button onClick={() => setBrandData({...brandData, colors: brandData.colors.filter(c => c !== color)})} className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition shadow-lg"> <X size={10} /> </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-12 h-12 bg-transparent cursor-pointer p-0" />
                        <button onClick={() => setBrandData({...brandData, colors: [...new Set([...brandData.colors, newColor])]})} className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-600 hover:text-white transition"> <Plus size={18} /> </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* REFERÊNCIAS VISUAIS (NOVO) */}
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl space-y-6">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Imagens de Referência ({brandData.reference_images.length}/3)</label>
                        <div title="O Flux usará o estilo/composição destas imagens" className="text-slate-600 hover:text-orange-500 cursor-help transition"> <Info size={14} /> </div>
                    </div>
                    
                    <div className="flex gap-4">
                        {brandData.reference_images.map((img, idx) => (
                            <div key={idx} className="w-16 h-16 bg-slate-950 rounded-xl border border-slate-800 relative group overflow-hidden">
                                <img src={img} className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => removeReferenceImage(idx)} 
                                    className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                                > 
                                    <Trash2 size={14} /> 
                                </button>
                            </div>
                        ))}
                        
                        {brandData.reference_images.length < 3 && (
                            <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-700 hover:text-orange-500 hover:border-orange-500 transition cursor-pointer">
                                <Plus size={20} />
                                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'reference')} className="hidden" />
                            </label>
                        )}
                    </div>
                    <p className="text-[9px] text-slate-600 italic">As referências ajudam a IA a entender o enquadramento e a iluminação desejada.</p>
                  </div>

                  {/* PERSONALIDADE */}
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl flex-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Manual de Personalidade</label>
                    <textarea 
                        value={brandData.personality} 
                        onChange={(e) => setBrandData({...brandData, personality: e.target.value})} 
                        placeholder="Ex: Minha marca é jovem, utiliza um tom de voz sarcástico e foca em sustentabilidade..." 
                        className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm font-medium outline-none focus:border-orange-500 transition-all leading-relaxed shadow-inner" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
               <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-800">
                     <tr> <th className="px-8 py-6">Data</th> <th className="px-8 py-6">Atividade</th> <th className="px-8 py-6 text-right">Créditos</th> </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
                     {history.length > 0 ? history.map(h => (
                       <tr key={h.id} className="hover:bg-slate-800/30 transition">
                         <td className="px-8 py-6 text-slate-400 font-medium">{new Date(h.created_at).toLocaleDateString()}</td>
                         <td className="px-8 py-6 text-white font-bold">{h.description}</td>
                         <td className="px-8 py-6 text-orange-500 font-black text-right">{h.amount} pts</td>
                       </tr>
                     )) : ( <tr> <td colSpan="3" className="px-8 py-16 text-center text-slate-600 font-bold italic text-xs uppercase tracking-widest">Sem registros recentes.</td> </tr> )}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL PLANOS */}
      {showPlans && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={() => setShowPlans(false)}></div>
          <div className="bg-slate-900 w-full max-w-4xl rounded-[3rem] border border-slate-800 shadow-3xl relative overflow-hidden flex flex-col max-h-[90vh] z-[110]" onClick={e => e.stopPropagation()}>
            <div className="p-10 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-600 rounded-2xl text-white shadow-lg shadow-orange-600/20"> <CreditCard size={24} /> </div>
                <h3 className="text-xl font-bold text-white italic uppercase tracking-widest tracking-tighter">Recarga de Créditos</h3>
              </div>
              <button onClick={() => setShowPlans(false)} className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all"> <X size={24} /> </button>
            </div>
            
            <div className="p-10 overflow-y-auto">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   {q:100, p:49, l: 'Starter', d: 'Ótimo para começar'}, 
                   {q:500, p:149, l: 'Pro', d: 'Uso frequente'}, 
                   {q:1000, p:250, l: 'Expert', b:true, d: 'Custo benefício'}
                 ].map((plan) => (
                   <div key={plan.q} className={`bg-slate-950 p-8 rounded-[2.5rem] border-2 transition-all duration-300 group flex flex-col justify-between ${plan.b ? 'border-orange-600 scale-105 shadow-2xl relative z-10' : 'border-slate-800 hover:border-slate-700'}`}>
                     {plan.b && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg"> Popular </div>}
                     <div className="mb-8">
                       <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">{plan.l}</span>
                       <div className="flex items-baseline gap-1"> 
                        <span className="text-5xl font-black text-white tracking-tighter">{plan.q}</span> 
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">pts</span> 
                       </div>
                       <p className="text-slate-500 text-[10px] mt-2 font-bold uppercase tracking-widest">R$ {plan.p} único</p>
                       <p className="text-[10px] text-slate-600 mt-4 leading-relaxed font-medium">{plan.d}</p>
                     </div>
                     <button className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition shadow-lg ${plan.b ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-white text-slate-950 hover:bg-orange-600 hover:text-white'}`}> Selecionar </button>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        body { background-color: #020617; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .shadow-3xl { box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.8), 0 0 50px rgba(249, 115, 22, 0.05); }
      `}</style>
    </div>
  );
}
