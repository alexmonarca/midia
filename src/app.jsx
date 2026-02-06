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
  Download
} from 'lucide-react';

// Importação via CDN para compatibilidade com o ambiente de execução e build
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuração de ambiente segura para Vite e ambientes legados
const getEnv = (key, fallback) => {
  try {
    // Tenta acessar via import.meta.env (Vite)
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
    // Tenta acessar via process.env (Node/Webpack)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Silencia erros de acesso a meta-propriedades
  }
  return fallback;
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL', "https://wjyrinydwrazuzjczhbw.supabase.co");
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY', "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeXJpbnlkd3JhenV6amN6aGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0OTA3MTAsImV4cCI6MjA3OTA2NjcxMH0.lx5gKNPJLBfBouwH99MFFYHtjvxDZeohwoJr9JlSblg");

const App = () => {
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

  const [brandData, setBrandData] = useState({
    colors: ['#EA580C'],
    logo_base64: '',
    reference_images: [], 
    tone_of_voice: 'Profissional',
    personality: ''
  });
  const [newColor, setNewColor] = useState('#EA580C');

  useEffect(() => {
    const initSupabase = async () => {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      setSupabase(client);

      const { data: { session } } = await client.auth.getSession();
      let currentUser = session?.user;

      if (!session) {
        const { data: { user: anonUser }, error: authError } = await client.auth.signInAnonymously();
        if (authError) console.error("Erro na autenticação anônima:", authError);
        currentUser = anonUser;
      }
      
      setUser(currentUser);
      if (currentUser) {
        await ensureProfileExists(client, currentUser.id);
        await fetchCredits(client, currentUser.id);
        await fetchBrandSettings(client, currentUser.id);
        await fetchHistory(client, currentUser.id);
      }
      setLoading(false);
    };

    initSupabase();
  }, []);

  const ensureProfileExists = async (client, userId) => {
    try {
      const { data } = await client.from('profiles').select('id').eq('id', userId).single();
      if (!data) {
        await client.from('profiles').insert({ id: userId, credits_balance: 100 });
      }
    } catch (e) {
      console.warn("Verificando/Criando perfil...");
    }
  };

  const fetchCredits = async (client, userId) => {
    const { data } = await client.from('profiles').select('credits_balance').eq('id', userId).single();
    if (data) setCredits(data.credits_balance);
  };

  const fetchBrandSettings = async (client, userId) => {
    const { data } = await client.from('brand_settings').select('*').eq('id', userId).single();
    if (data) setBrandData(data);
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
      alert("Imagem muito grande (> 1.5MB). Por favor, comprima a imagem.");
      return;
    }
    const base64 = await convertToBase64(file);
    if (type === 'logo') setBrandData({ ...brandData, logo_base64: base64 });
    else if (type === 'reference') setBrandData({ ...brandData, reference_images: [...brandData.reference_images, base64] });
  };

  const handleSaveBrand = async () => {
    if (!supabase || !user) return;
    setSaveStatus('saving');
    try {
      const { error } = await supabase.from('brand_settings').upsert({ 
        id: user.id, 
        ...brandData, 
        updated_at: new Date().toISOString() 
      });
      if (error) throw error;
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) { 
      console.error(e);
      setSaveStatus('error');
    }
  };

  const handleGeneratePost = async () => {
    if (credits < 20 || !prompt) return;
    setGenerating(true);
    setGeneratedResult(null);

    // Simulação do fluxo n8n -> Gemini -> Imagen
    setTimeout(async () => {
      setGenerating(false);
      setGeneratedResult({
        image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop",
        caption: "✨ Potencializando sua marca com IA! \n\nO design estratégico foi gerado com base no seu manual de identidade e no briefing enviado. Pronto para escala! 🚀"
      });
      
      if (supabase && user) {
        const { error } = await supabase.rpc('consume_credits', { 
          user_id_param: user.id, 
          amount_to_consume: 20, 
          desc_param: `Geração ${selectedFormat}: ${prompt.substring(0, 15)}` 
        });
        
        if (!error) {
          setCredits(prev => prev - 20);
          fetchHistory(supabase, user.id);
        }
      }
    }, 4000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500/20 border-t-orange-500"></div>
        <p className="mt-4 text-slate-500 font-bold text-xs uppercase tracking-widest">Sincronizando com Supabase</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-200 overflow-x-hidden relative">
      <main className="flex-1 overflow-y-auto relative z-10">
        
        {/* Navbar */}
        <div className="sticky top-0 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-6 md:px-12 py-4 flex flex-wrap justify-between items-center z-30 gap-4">
          <div className="flex items-center gap-6 md:gap-12">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('chat')}>
              <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center text-white shadow-lg">
                <Sparkles size={18} fill="currentColor" />
              </div>
              <h1 className="text-lg font-bold text-white italic uppercase tracking-tighter">SocialIA</h1>
            </div>

            <nav className="flex gap-4 md:gap-8">
              <button onClick={() => setActiveTab('chat')} className={`text-sm font-bold transition-all pb-1 border-b-2 ${activeTab === 'chat' ? 'text-white border-orange-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>Chat IA</button>
              <button onClick={() => setActiveTab('brand')} className={`text-sm font-bold transition-all pb-1 border-b-2 ${activeTab === 'brand' ? 'text-white border-orange-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>Marca</button>
              <button onClick={() => setActiveTab('history')} className={`text-sm font-bold transition-all pb-1 border-b-2 ${activeTab === 'history' ? 'text-white border-orange-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>Histórico</button>
            </nav>
          </div>

          <div 
            onClick={() => setShowPlans(true)}
            className="flex items-center gap-4 bg-slate-900 border border-slate-800 hover:border-orange-500/50 px-4 py-2 rounded-2xl cursor-pointer transition-all active:scale-95 group shadow-xl"
          >
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-orange-500" fill="currentColor" />
              <span className="text-xl font-bold text-white tracking-tighter">{credits.toLocaleString()}</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase">pts</span>
            </div>
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white group-hover:bg-orange-500 transition">
              <Plus size={18} strokeWidth={3} />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 md:p-12 animate-in fade-in duration-500">
          
          {/* ABA: CHAT IA GESTOR */}
          {activeTab === 'chat' && (
            <div className="space-y-10">
              <div className="space-y-2 text-center md:text-left border-l-4 border-orange-600 pl-6">
                <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Gestor de Mídias IA</h2>
                <p className="text-slate-500 font-medium">Design e estratégia salvos automaticamente no seu perfil.</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-4 space-y-6">
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl space-y-8">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Briefing Criativo</label>
                      <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: Crie um post para Instagram sobre nossa nova promoção de verão..."
                        className="w-full h-44 p-5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-orange-500 outline-none transition-all text-slate-300 text-sm leading-relaxed"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Formato Sugerido</label>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          {id:'quadrado', l:'Feed Quadrado (1:1)', i:Monitor}, 
                          {id:'retrato', l:'Feed Retrato (4:5)', i:Smartphone}, 
                          {id:'stories', l:'Stories / Vertical (9:16)', i:Smartphone}
                        ].map(f => (
                          <button key={f.id} onClick={() => setSelectedFormat(f.id)} className={`flex items-center justify-between p-3 px-4 rounded-xl border-2 transition-all ${selectedFormat === f.id ? 'border-orange-500 bg-orange-500/5 text-white shadow-lg shadow-orange-500/10' : 'border-slate-800 bg-slate-950 text-slate-500'}`}>
                            <div className="flex items-center gap-3"> <f.i size={14} /> <span className="text-xs font-bold">{f.l}</span> </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={handleGeneratePost} 
                      disabled={generating || !prompt || credits < 20} 
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-800 text-white font-bold py-5 rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                    >
                      {generating ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <> <Zap size={18} fill="currentColor" /> <span className="uppercase tracking-widest text-sm">Gerar Conteúdo (-20 pts)</span> </>}
                    </button>
                  </div>
                </div>

                {/* Preview Area */}
                <div className="xl:col-span-8 flex flex-col items-center gap-8">
                  <div className={`bg-slate-900 border-4 border-slate-800 rounded-[3rem] shadow-3xl relative overflow-hidden flex items-center justify-center transition-all duration-700 w-full ${selectedFormat === 'stories' ? 'aspect-[9/16] max-h-[600px] mx-auto' : selectedFormat === 'retrato' ? 'aspect-[4/5] max-h-[600px] mx-auto' : 'aspect-square max-w-[500px]'}`}>
                    {generating ? (
                      <div className="text-center space-y-6 animate-pulse p-10">
                        <div className="w-20 h-20 bg-slate-950 rounded-[2rem] flex items-center justify-center text-orange-500 mx-auto shadow-2xl border border-slate-800"> <ImageIcon size={32} /> </div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-[0.3em]">IA Renderizando...</h4>
                      </div>
                    ) : generatedResult ? (
                      <div className="w-full h-full relative group">
                        <img src={generatedResult.image} className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-1000" alt="Generated" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <button className="bg-white text-slate-950 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-2xl hover:bg-orange-500 hover:text-white transition">
                             <Download size={18} /> Baixar Arte
                           </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-12 max-w-xs space-y-4 opacity-20 italic">
                        <ImageIcon size={48} className="mx-auto" />
                        <p className="text-xs font-bold uppercase tracking-widest">Aguardando Brainstorming</p>
                      </div>
                    )}
                  </div>

                  {generatedResult && (
                    <div className="w-full max-w-2xl bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 animate-in slide-in-from-bottom-4 duration-500">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-white flex items-center gap-2 italic"> <MessageSquare size={18} /> Copywriting Sugerido </h4>
                        <button className="text-[10px] font-bold bg-white text-slate-950 px-3 py-1.5 rounded-lg hover:bg-orange-500 hover:text-white transition uppercase">Copiar Texto</button>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">{generatedResult.caption}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA: MARCA */}
          {activeTab === 'brand' && (
            <div className="max-w-4xl space-y-10 animate-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                <div className="space-y-2 border-l-4 border-slate-800 pl-6">
                  <h2 className="text-2xl font-bold text-white tracking-tight uppercase tracking-widest opacity-90 italic">Manual da Marca</h2>
                  <p className="text-slate-500 font-medium">Salve as diretrizes visuais para que a IA nunca erre o tom.</p>
                </div>
                <button 
                  onClick={handleSaveBrand} 
                  disabled={saveStatus === 'saving'}
                  className={`min-w-[200px] font-bold px-8 py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                    saveStatus === 'success' ? 'bg-emerald-600 text-white' : 
                    saveStatus === 'error' ? 'bg-red-600 text-white' : 
                    'bg-white text-slate-950 hover:bg-orange-600 hover:text-white'
                  }`}
                >
                  {saveStatus === 'saving' ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent" /> : <Save size={18} />}
                  {saveStatus === 'success' ? 'Salvo no Supabase!' : saveStatus === 'error' ? 'Erro ao Salvar' : 'Salvar Identidade'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-xl space-y-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Upload de Logótipo</label>
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl flex items-center justify-center overflow-hidden">
                        {brandData.logo_base64 ? <img src={brandData.logo_base64} className="w-full h-full object-contain p-2" alt="Logo" /> : <ImageIcon size={24} className="text-slate-800" />}
                      </div>
                      <label className="flex-1 cursor-pointer">
                        <div className="bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition shadow-inner">
                          <Upload size={18} /> <span className="text-xs font-bold uppercase tracking-widest">Subir Imagem</span>
                        </div>
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Paleta Cromática</label>
                    <div className="flex flex-wrap gap-3">
                      {brandData.colors.map(color => (
                        <div key={color} className="relative group">
                          <div className="w-12 h-12 rounded-xl border border-white/10 shadow-lg" style={{ backgroundColor: color }}></div>
                          <button onClick={() => setBrandData({...brandData, colors: brandData.colors.filter(c => c !== color)})} className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"> <X size={10} /> </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-12 h-12 bg-transparent cursor-pointer p-0" />
                        <button onClick={() => setBrandData({...brandData, colors: [...new Set([...brandData.colors, newColor])]})} className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-600 hover:text-white transition"> <Plus size={18} /> </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-xl space-y-10">
                   <div className="space-y-4">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Briefing da Personalidade</label>
                     <textarea 
                       value={brandData.personality} 
                       onChange={(e) => setBrandData({...brandData, personality: e.target.value})} 
                       placeholder="Descreva sua marca, tom de voz e como ela deve se comunicar..." 
                       className="w-full h-64 bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm font-medium outline-none focus:border-orange-500 leading-relaxed shadow-inner" 
                     />
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA: HISTÓRICO */}
          {activeTab === 'history' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
               <div className="flex justify-between items-center border-l-4 border-slate-800 pl-6">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight uppercase tracking-widest opacity-90 italic">Extrato de Créditos</h2>
                  <p className="text-slate-500 font-medium text-sm">Registro de todas as criações e transações no seu perfil.</p>
                </div>
              </div>
               
               <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-800">
                     <tr>
                       <th className="px-8 py-6">Data</th>
                       <th className="px-8 py-6">Descrição da Atividade</th>
                       <th className="px-8 py-6 text-right">Consumo</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
                     {history.length > 0 ? history.map(h => (
                       <tr key={h.id} className="hover:bg-slate-800/30 transition">
                         <td className="px-8 py-6 text-slate-400 font-medium">{new Date(h.created_at).toLocaleDateString()}</td>
                         <td className="px-8 py-6 text-white font-bold">{h.description}</td>
                         <td className="px-8 py-6 text-orange-500 font-black text-right">{h.amount} pts</td>
                       </tr>
                     )) : (
                       <tr>
                         <td colSpan="3" className="px-8 py-16 text-center text-slate-600 font-bold italic">Nenhuma atividade registrada no seu histórico.</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL: PLANOS DE CRÉDITOS */}
      {showPlans && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm" onClick={() => setShowPlans(false)}></div>
          <div className="bg-slate-900 w-full max-w-4xl rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] z-10 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-10 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-600 rounded-2xl text-white shadow-lg"> <CreditCard size={24} /> </div>
                <h3 className="text-xl font-bold text-white italic uppercase tracking-widest">Recarga de Pontos</h3>
              </div>
              <button onClick={() => setShowPlans(false)} className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-inner"> <X size={24} /> </button>
            </div>
            
            <div className="p-10 overflow-y-auto">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   {q:100, p:49, l: 'Starter'}, 
                   {q:500, p:149, l: 'Pro'}, 
                   {q:1000, p:250, l: 'Expert', b:true}
                 ].map((plan) => (
                   <div key={plan.q} className={`bg-slate-950 p-8 rounded-[2.5rem] border-2 transition-all duration-300 group ${plan.b ? 'border-orange-600 scale-105 shadow-2xl' : 'border-slate-800 hover:border-slate-700'}`}>
                     <div className="flex justify-between items-start mb-6">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{plan.l}</span>
                        {plan.b && <Sparkles size={16} className="text-orange-500" />}
                     </div>
                     <div className="mb-8">
                       <div className="flex items-baseline gap-1"> 
                        <span className="text-5xl font-black text-white tracking-tighter">{plan.q}</span> 
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">pts</span> 
                       </div>
                       <p className="text-slate-500 text-[10px] mt-2 font-bold uppercase tracking-widest">Pagamento Único</p>
                     </div>
                     <button className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition shadow-lg ${plan.b ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-white text-slate-950 hover:bg-orange-600 hover:text-white'}`}>
                       R$ {plan.p}
                     </button>
                   </div>
                 ))}
               </div>
               
               <div className="mt-10 bg-slate-950 border border-slate-800 rounded-3xl p-8 flex items-center gap-4">
                  <ShieldCheck className="text-emerald-500" size={32} />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-white">Transação Segura</p>
                    <p className="text-slate-500 text-[10px] mt-1 font-medium">Os créditos adquiridos são adicionados instantaneamente ao seu saldo e não expiram.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Estilos Auxiliares para Scroll e Shadows */}
      <style>{`
        body { background-color: #020617; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .shadow-3xl { box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.8), 0 0 50px rgba(249, 115, 22, 0.05); }
      `}</style>
    </div>
  );
};

export default App;
