/* ============================================================
 * INTERWORK — MÓDULO DE DADOS E LÓGICA (data.js)
 * ============================================================ */

// 1. ESTADO GLOBAL (Configurações e Variáveis de Controle)
const STATE = {
  route: 'home',
  currentUserId: 'u_me',
  set(key, val) { this[key] = val; if(window.renderView) renderView(); },
  patch(obj) { Object.assign(this, obj); if(window.renderView) renderView(); },
  query: '', category: 'all', country: 'all', sort: 'relevance', trendingActive: false,
  page: 1, ratingMin: 0, priceMax: 0, priceMin: 0, verifiedOnly: false,
  availableOnly: false, freelancerLevel: 'all', deliveryFilter: 'all',
  languageFilter: 'all', availabilityFilter: 'all', selectedServiceId: null,
  orders: [], messages: {}, chatOpenOrderId: null, dashboardTab: 'client',
  clientOrdersTab: 'active', toastSeq: 0, walletConnected: false,
  authenticated: false, onboardingComplete: false, userRole: 'client',
  walletProvider: 'ITLX', network: 'interlink-mainnet', recentlyViewed: [],
  favorites: [], notifications: [], txHistory: [], payouts: [],
  selectedProfileHandle: null, language: 'en', translateChat: false,
  searchFocused: false, selectedTier: 'standard', selectedAddons: [],
  selectedToken: 'ITL', showQR: false, theme: 'blue',
  newServiceLogo: null, newServiceGallery: [], newServiceRequirements: [],
  newServiceFaqs: [], onboardingDismissed: false, restoredFromStorage: false,
  sbUser: null, isAdmin: false, sbProfile: null, sbReady: false
};

// 2. BANCO DE DADOS LOCAL E TABELAS
const DB = { users: [], services: [], reviews: [] };
const TOKENS = [{ id:'ITL', label:'ITL', rateITL:1, color:'#7C3AED', icon:'coins' }];
const LEVELS = [
  { id:'new', label:'New', min:0, color:'#94a3b8', icon:'sparkles' },
  { id:'level1', label:'Level 1', min:5, color:'#10b981', icon:'shield' },
  { id:'level2', label:'Level 2', min:25, color:'#1a73e8', icon:'shield-check' },
  { id:'top-rated', label:'Top Rated', min:80, color:'#f59e0b', icon:'award' },
  { id:'pro', label:'Pro', min:150, color:'#7C3AED', icon:'crown' }
];

function levelOf(jobs){ return [...LEVELS].reverse().find(l=>jobs>=l.min) || LEVELS[0]; }

// 3. REPUTAÇÃO E SBT (Soulbound Tokens)
const SBT_CONTRACT = '0xSBT0RepuT4tion1nterw0rk7C3AED1a73e8C0nTr4ct';
const SBT_BADGES = [
  { id:'human', label:'Verified Human', desc:'Proof of personhood via Interlink ID', icon:'badge-check', color:'#1a73e8', test: u => u.verified },
  { id:'linker', label:'Interlink Linker', desc:'Active member of the Interlink ecosystem', icon:'link-2', color:'#a78bfa', test: u => u.verified && (Date.now()-u.joinedTs) > 90*86400000 },
  { id:'veterano', label:'Veterano', desc:'1+ ano no ecossistema', icon:'history', color:'#7C3AED', test: u => (Date.now()-u.joinedTs) > 365*86400000 },
  { id:'cem', label:'100+ Entregas', desc:'Cem ou mais pedidos concluídos on-chain', icon:'package-check', color:'#10b981', test: u => (u.jobs||0) >= 100 },
  { id:'top', label:'Top Rated', desc:'Rating ≥ 4.85 com 50+ avaliações', icon:'award', color:'#f59e0b', test: u => u.rating >= 4.85 && (u.jobs||0) >= 25 },
  { id:'fast', label:'Express Pro', desc:'Responde em ≤ 3h em média', icon:'rocket', color:'#ef4444', test: u => (u.responseHours||99) <= 3 },
  { id:'trust', label:'Zero Disputas', desc:'Nenhuma disputa em 20+ pedidos', icon:'shield-check', color:'#06b6d4', test: u => ((u.disputes||0)===0) && (u.jobs||0) >= 20 },
  { id:'recur', label:'Cliente Fiel', desc:'90%+ de clientes recorrentes', icon:'repeat', color:'#0ea5e9', test: u => (u.repeatClientsPct||0) >= 90 }
];

// 4. TRADUÇÕES E FILTROS
const LANGUAGES_LIST = [
  { id:'pt', label:'Português', flag:'🇧🇷' }, { id:'en', label:'English', flag:'🇬🇧' },
  { id:'es', label:'Español', flag:'🇪🇸' }, { id:'de', label:'Deutsch', flag:'🇩🇪' },
  { id:'ja', label:'日本語', flag:'🇯🇵' }, { id:'hi', label:'हिन्दी', flag:'🇮🇳' }
];

const FILTER_LANGUAGE_OPTIONS = LANGUAGES_LIST.filter(l => ['pt','en','es'].includes(l.id));
const DELIVERY_FILTERS = [
  { id:'all', label:'Qualquer prazo' }, { id:'upto3', label:'Até 3 dias' },
  { id:'upto7', label:'Até 7 dias' }, { id:'upto14', label:'Até 14 dias' }, { id:'over14', label:'+14 dias' }
];
const AVAILABILITY_FILTERS = [
  { id:'all', label:'Qualquer disponibilidade' }, { id:'online', label:'Online agora' }, { id:'24h', label:'Disponível em 24h' }
];

const I18N = {
  pt: { nav_explore:'Explorar', nav_orders:'Meus pedidos', nav_sell:'Vender serviço', nav_how:'Como funciona', net:'Interlink Network', connect:'Conectar wallet', search_ph:'O que você precisa hoje?' },
  en: { nav_explore:'Explore', nav_orders:'My orders', nav_sell:'Sell a service', nav_how:'How it works', net:'Interlink Network', connect:'Connect wallet', search_ph:'What do you need today?' }
};

// 5. INTEGRAÇÃO SUPABASE (Banco de Dados Online)
let sb = null;
const ADMIN_EMAILS = ['interworkoficial@gmail.com'];

if (typeof SUPABASE_URL !== 'undefined') {
  try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  } catch(e) { console.warn('[Supabase] Erro ao criar cliente:', e); }
}

async function sbSignIn(email, password){
  if (!sb) return { error: { message: 'Supabase não configurado.' } };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (!error) {
    STATE.sbUser = data.user;
    STATE.isAdmin = ADMIN_EMAILS.includes(data.user.email);
  }
  if(window.render) render();
  return { data, error };
}

async function sbSignUp(email, password){
  if (!sb) return { error: { message: 'Supabase não configurado.' } };
  const { data, error } = await sb.auth.signUp({ email, password });
  return { data, error };
}

async function sbSignOut(){
  if (!sb) return;
  await sb.auth.signOut();
  STATE.sbUser = null; STATE.isAdmin = false;
  if(window.render) render();
}

async function sbInitAuth(){
  if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    STATE.sbUser = session.user;
    STATE.isAdmin = ADMIN_EMAILS.includes(session.user.email);
    if(window.sbLoadProfile) STATE.sbProfile = await sbLoadProfile(session.user.id);
  }
  STATE.sbReady = true;
  if (STATE.route === 'admin' && window.render) render();
  
  sb.auth.onAuthStateChange(async (_event, session) => {
    STATE.sbUser = session?.user || null;
    STATE.isAdmin = session?.user ? ADMIN_EMAILS.includes(session.user.email) : false;
    if (session?.user) {
      if(window.sbLoadProfile) STATE.sbProfile = await sbLoadProfile(session.user.id);
    } else { STATE.sbProfile = null; }
    if(window.render) render();
  });
}

async function sbLoadServices(){
  if (!sb) return;
  const { data, error } = await sb.from('services').select('*').order('created_at', { ascending: false });
  if (error){ console.warn('[Supabase] Erro ao carregar serviços:', error.message); return; }
  const approvedReal = (data || []).filter(s => s.status === 'approved');
  if (approvedReal.length > 0) {
    DB.services = data.map(sbSvcToLocal);
  } else if (data && data.length > 0) {
    const dbIds = new Set(data.map(s => s.id));
    DB.services = [...data.map(sbSvcToLocal), ...DB.services.filter(s => s._mock && !dbIds.has(s.id))];
  }
  if(window.renderView) renderView();
}

async function sbCreateService(svc){
  if (!sb) return { error: { message: 'Supabase não configurado.' } };
  const me = window.getUser ? getUser(STATE.currentUserId) : null;
  const payload = localSvcToSb(svc, me);
  const { data, error } = await sb.from('services').insert(payload).select().single();
  if (error) return { error };
  const idx = DB.services.findIndex(s => s.id === svc.id);
  if (idx >= 0) DB.services[idx] = sbSvcToLocal(data);
  return { data };
}

function sbSvcToLocal(s){
  return {
    id: s.id, title: s.title, category: s.category, freelancerId: s.freelancer_id,
    freelancerUuid: s.freelancer_uuid || null, price: s.price, deliveryDays: s.delivery_days,
    country: s.country || 'br', rating: s.rating || 5, reviewsCount: s.reviews_count || 0,
    description: s.description || '', thumb: s.thumb || (window.thumbSVG ? thumbSVG(s.title, '#1a73e8') : null),
    gallery: s.gallery || [], tags: s.tags || [], includes: s.includes || [],
    requirements: s.requirements || [], faqs: s.faqs || [], status: s.status || 'pending',
    createdTs: new Date(s.created_at).getTime(), approvedAt: s.approved_at ? new Date(s.approved_at).getTime() : null,
    rejectedReason: s.rejected_reason || null, reviews: [], _sb: true
  };
}

function localSvcToSb(svc, me){
  return {
    id: svc.id, title: svc.title, category: svc.category, freelancer_id: svc.freelancerId,
    freelancer_uuid: STATE.sbProfile?.id || null, freelancer_name: me ? me.name : 'Anônimo',
    price: svc.price, delivery_days: svc.deliveryDays, country: svc.country || 'br',
    rating: svc.rating || 5, reviews_count: svc.reviewsCount || 0, description: svc.description || '',
    thumb: svc.thumb || null, gallery: svc.gallery || [], tags: svc.tags || [],
    includes: svc.includes || [], requirements: svc.requirements || [], faqs: svc.faqs || [],
    status: svc.status || 'pending'
  };
}

async function sbSendMessage(sbOrderId, text, attachmentUrl = null) {
  if (!sb || !STATE.sbProfile?.id || !sbOrderId) return null;
  const payload = { order_id: sbOrderId, sender_id: STATE.sbProfile.id, text: text || '', attachment_url: attachmentUrl || null };
  const { data, error } = await sb.from('messages').insert(payload).select().single();
  return error ? null : data;
}

async function sbLoadMessages(order) {
  if (!sb || !STATE.sbProfile?.id || !order.sbId) return;
  const { data, error } = await sb.from('messages').select('*').eq('order_id', order.sbId).order('created_at', { ascending: true });
  if (error || !data) return;
  const remote = data.map(m => ({
    id: m.id, _sbId: m.id, from: m.sender_id === STATE.sbProfile.id ? STATE.currentUserId : m.sender_id,
    text: m.text || '', attachments: m.attachment_url ? [{ name: m.attachment_url, size: '', type: '', dataURL: null }] : [],
    status: 'read', ts: new Date(m.created_at).getTime()
  }));
  const existing = STATE.messages[order.id] || [];
  const localOnly = existing.filter(l => !l._sbId && l.attachments?.some(a => a.dataURL));
  STATE.messages[order.id] = [...remote, ...localOnly].sort((a, b) => a.ts - b.ts);
}

// Escuta mudanças de serviços em tempo real
function sbSubscribeServices(){
  if (!sb) return;
  sb.channel('services-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, payload => {
    const changed = payload.new || payload.old;
    if (!changed) return;
    const idx = DB.services.findIndex(s => s.id === changed.id);
    if (payload.eventType === 'DELETE'){ if (idx >= 0) DB.services.splice(idx, 1); }
    else {
      const local = sbSvcToLocal(changed);
      if (idx >= 0) DB.services[idx] = local;
      else DB.services.unshift(local);
    }
    if(window.renderView) renderView();
  }).subscribe();
}
