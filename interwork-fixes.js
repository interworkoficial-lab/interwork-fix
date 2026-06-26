/**
 * INTERWORK — PATCH DE CORREÇÕES
 * Inclua este script APÓS o script principal (inline do index.html)
 * <script src="interwork-fixes.js"></script>
 *
 * Correções aplicadas:
 *  1. Remove "Edit cover" do viewProfile
 *  2. Corrige Edit Profile (modal tamanho + foto pelo avatar do perfil)
 *  3. Corrige changeProfileAvatar (atualiza todas as imgs corretas)
 *  4. Carteira — oculta dados falsos para usuários não-admin
 *  5. "Meus pedidos" no dropdown — navegação confiável
 *  6. Chat — fecha menus antes de abrir, fix re-render, remove status em chats efêmeros
 *  7. Dupla declaração de gigCarouselHideControls removida via override seguro
 *  8. pickTrendingTag — versão única e correta
 */

/* ─────────────────────────────────────────────────────────
   1. OVERRIDE: viewProfile — sem "Edit cover", câmera no avatar
   ───────────────────────────────────────────────────────── */
window.viewProfile = function(handle) {
  const u = DB.users.find(x => x.handle === handle);
  if (!u) return `<div class="max-w-3xl mx-auto p-10 text-center text-ink-500">
    Perfil não encontrado. <a href="#/home" class="text-brand-500 font-semibold">Voltar</a>
  </div>`;

  const co = getCountry(u.country);
  const services = DB.services.filter(s => s.freelancerId === u.id);
  const ordersDone = STATE.orders.filter(o => o.freelancerId === u.id && o.status === 'approved').length + (u.jobs || 0);
  const lvl = u.level || levelOf(u.jobs);
  const allReviews = services.flatMap(s => s.reviews.map(r => ({ ...r, serviceTitle: s.title })));
  const avgRating = allReviews.length
    ? (allReviews.reduce((a, r) => a + (r.stars || 0), 0) / allReviews.length).toFixed(1)
    : u.rating.toFixed(1);
  const isMe = u.id === STATE.currentUserId;

  return `
  <!-- COVER BANNER — sem botão "Edit cover" -->
  <div class="cover h-36 sm:h-44 w-full relative"></div>

  <!-- PROFILE HEAD -->
  <div class="max-w-5xl mx-auto px-4 sm:px-6">
    <div class="flex flex-col sm:flex-row sm:items-end gap-3 -mt-14 sm:-mt-16 mb-5">

      <!-- Avatar com câmera sempre clicável pelo dono -->
      <div class="relative shrink-0">
        <div class="w-28 h-28 rounded-3xl shadow-lg border-4 border-white overflow-hidden bg-white">
          <img src="${u.avatar}" class="w-full h-full object-cover profile-avatar-img" alt="${escapeHtml(u.name)}"/>
        </div>
        ${isMe ? `
          <button onclick="changeProfileAvatar('${u.id}')"
            class="absolute bottom-1 right-1 bg-white border border-ink-100 rounded-full p-1.5 shadow hover:bg-ink-50 transition"
            title="Trocar foto de perfil">
            <i data-lucide="camera" class="w-3.5 h-3.5 text-ink-600"></i>
          </button>` : ''}
        <span class="absolute top-2 left-2 w-3.5 h-3.5 rounded-full border-2 border-white ${u.online ? 'bg-emerald-400' : 'bg-ink-300'}"></span>
      </div>

      <!-- Name + chips -->
      <div class="flex-1 min-w-0 pt-2 sm:pt-0 sm:pb-1">
        <div class="flex flex-wrap items-center gap-2 mb-1">
          <h1 class="text-xl sm:text-2xl font-extrabold text-ink-900 leading-tight">${escapeHtml(u.name)}</h1>
          ${u.verified ? `<span class="chip bg-emerald-50 text-emerald-700 text-xs"><i data-lucide="badge-check" class="w-3.5 h-3.5"></i>Verified</span>` : ''}
          ${lvl ? levelChip(lvl) : ''}
        </div>
        <div class="text-sm text-ink-500 mb-2">@${escapeHtml(u.handle)}</div>
        <div class="flex flex-wrap items-center gap-3 text-sm text-ink-500">
          ${co ? `<span class="flex items-center gap-1"><span>${co.flag}</span>${co.name}</span>` : ''}
          <span class="flex items-center gap-1">
            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
            Member since ${new Date(u.joinedTs).getFullYear()}
          </span>
        </div>
      </div>

      <!-- CTA -->
      <div class="flex gap-2 shrink-0 sm:pb-1">
        ${isMe
          ? `<button onclick="openEditProfileModal()"
               class="btn-outline rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2">
               <i data-lucide="pencil" class="w-4 h-4"></i>Edit profile
             </button>`
          : `<button onclick="openChat(null,'${u.id}')"
               class="bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-sm transition">
               <i data-lucide="message-circle" class="w-4 h-4"></i>Message
             </button>`}
      </div>
    </div>

    <!-- STATS STRIP -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="bg-white border border-ink-100 rounded-2xl p-3 text-center shadow-sm">
        <div class="text-2xl font-extrabold text-ink-900">${avgRating}</div>
        <div class="flex justify-center mt-1">${stars(parseFloat(avgRating), 'w-3.5 h-3.5')}</div>
        <div class="text-xs text-ink-500 mt-1">${allReviews.length} reviews</div>
      </div>
      <div class="bg-white border border-ink-100 rounded-2xl p-3 text-center shadow-sm">
        <div class="text-2xl font-extrabold text-ink-900">${ordersDone}</div>
        <div class="text-xs text-ink-500 mt-1">Orders completed</div>
      </div>
      <div class="bg-white border border-ink-100 rounded-2xl p-3 text-center shadow-sm">
        <div class="text-2xl font-extrabold text-ink-900">${u.approvalPct || 99}%</div>
        <div class="text-xs text-ink-500 mt-1">Approval rate</div>
      </div>
      <div class="bg-white border border-ink-100 rounded-2xl p-3 text-center shadow-sm">
        <div class="text-2xl font-extrabold text-ink-900">${u.repeatClientsPct || 0}%</div>
        <div class="text-xs text-ink-500 mt-1">Repeat clients</div>
      </div>
    </div>

    <!-- TABS -->
    <div class="flex gap-3 border-b border-ink-100 mb-6" id="profile-tabs">
      <button class="tab tab-active pb-2" onclick="showProfileTab('gigs',this)">Services (${services.length})</button>
      <button class="tab pb-2" onclick="showProfileTab('about',this)">About</button>
      <button class="tab pb-2" onclick="showProfileTab('reviews',this)">Reviews (${allReviews.length})</button>
      ${u.portfolio && u.portfolio.length
        ? `<button class="tab pb-2" onclick="showProfileTab('portfolio',this)">Portfolio (${u.portfolio.length})</button>`
        : ''}
    </div>

    <!-- MAIN + SIDEBAR -->
    <div class="flex flex-col lg:flex-row gap-8 pb-16">
      <div class="flex-1 min-w-0">

        <!-- GIGS -->
        <div id="pane-gigs">
          ${services.length === 0
            ? `<div class="bg-white border border-ink-100 rounded-2xl p-10 text-center text-ink-500">
                <i data-lucide="package-open" class="w-12 h-12 mx-auto mb-3 text-ink-300"></i>
                <div class="font-semibold mb-1">No services published yet.</div>
                ${isMe ? `<a href="#/new-service" class="mt-3 inline-block bg-brand-500 hover:bg-brand-600 text-white font-bold px-5 py-2 rounded-xl text-sm transition">+ Create service</a>` : ''}
              </div>`
            : `<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">${services.map(s => serviceCard(s)).join('')}</div>`}
        </div>

        <!-- ABOUT -->
        <div id="pane-about" class="hidden">
          <div class="bg-white border border-ink-100 rounded-2xl p-6 space-y-5">
            <div>
              <h3 class="font-extrabold text-ink-900 mb-2 flex items-center gap-2">
                <i data-lucide="user" class="w-4 h-4 text-brand-500"></i>About me
              </h3>
              <p class="text-sm text-ink-600 leading-relaxed">${escapeHtml(u.bio || 'No bio yet.')}</p>
            </div>
            ${u.skills && u.skills.length ? `
            <div>
              <h3 class="font-extrabold text-ink-900 mb-2 flex items-center gap-2">
                <i data-lucide="zap" class="w-4 h-4 text-brand-500"></i>Skills
              </h3>
              <div class="flex flex-wrap gap-2">
                ${u.skills.map(s => `<span class="chip bg-brand-50 text-brand-700 text-xs">${escapeHtml(s)}</span>`).join('')}
              </div>
            </div>` : ''}
          </div>
        </div>

        <!-- REVIEWS -->
        <div id="pane-reviews" class="hidden">
          ${allReviews.length === 0
            ? `<div class="bg-white border border-ink-100 rounded-2xl p-10 text-center text-ink-500">
                <i data-lucide="star" class="w-10 h-10 mx-auto mb-3 text-ink-300"></i>
                <div class="font-semibold">No reviews yet.</div>
              </div>`
            : `<div class="space-y-4">${allReviews.slice(0, 12).map(r => {
                const ru = getUser(r.userId);
                return `
                <div class="bg-white border border-ink-100 rounded-2xl p-5">
                  <div class="flex items-start gap-3 mb-3">
                    <div class="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-ink-100">
                      ${ru ? `<img src="${ru.avatar}" class="w-9 h-9 rounded-lg"/>` : '<div class="w-9 h-9 rounded-lg bg-ink-200 grid place-items-center font-bold">?</div>'}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-semibold text-sm text-ink-900">${ru ? escapeHtml(ru.name) : 'User'}</span>
                        <span class="text-xs text-ink-400">${timeAgo(r.ts)}</span>
                      </div>
                      <div class="text-xs text-ink-400 truncate">${escapeHtml(r.serviceTitle || '')}</div>
                    </div>
                    <div class="shrink-0">${stars(r.stars, 'w-3.5 h-3.5')}</div>
                  </div>
                  <p class="text-sm text-ink-600 leading-relaxed">${escapeHtml(r.text || '')}</p>
                </div>`;
              }).join('')}</div>`}
        </div>

        <!-- PORTFOLIO -->
        ${u.portfolio && u.portfolio.length ? `
        <div id="pane-portfolio" class="hidden">
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            ${u.portfolio.map(p => `
              <div class="bg-white border border-ink-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                <div class="h-32 overflow-hidden">
                  <img src="${p.thumb}" alt="${escapeHtml(p.title)}" class="w-full h-full object-cover"/>
                </div>
                <div class="p-3">
                  <div class="text-sm font-semibold text-ink-900 line-clamp-1">${escapeHtml(p.title)}</div>
                </div>
              </div>`).join('')}
          </div>
        </div>` : ''}

      </div><!-- /MAIN -->

      <!-- SIDEBAR — limpa, só skills e about -->
      <aside class="w-full lg:w-72 shrink-0 space-y-4">
        <div class="bg-white border border-ink-100 rounded-2xl p-5">
          <h3 class="font-extrabold text-ink-900 mb-4 flex items-center gap-2">
            <i data-lucide="user" class="w-4 h-4 text-brand-500"></i>About
          </h3>
          <div class="space-y-3 text-sm">
            ${co ? `<div class="flex items-center gap-2 text-ink-600"><span>${co.flag}</span><span>${co.name}</span></div>` : ''}
            <div class="flex items-center gap-2 text-ink-600">
              <i data-lucide="calendar" class="w-4 h-4 text-ink-400"></i>
              <span>Member since ${new Date(u.joinedTs).getFullYear()}</span>
            </div>
            ${u.responseHours ? `<div class="flex items-center gap-2 text-ink-600">
              <i data-lucide="clock" class="w-4 h-4 text-ink-400"></i>
              <span>Responds in ~${u.responseHours}h</span>
            </div>` : ''}
          </div>
        </div>

        ${u.skills && u.skills.length ? `
        <div class="bg-white border border-ink-100 rounded-2xl p-5">
          <h3 class="font-extrabold text-ink-900 mb-3 flex items-center gap-2">
            <i data-lucide="zap" class="w-4 h-4 text-brand-500"></i>Skills
          </h3>
          <div class="flex flex-wrap gap-2">
            ${u.skills.map(s => `<span class="chip bg-brand-50 text-brand-700 text-xs">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>` : ''}
      </aside>
    </div>
  </div>`;
};

/* ─────────────────────────────────────────────────────────
   2. OVERRIDE: changeProfileAvatar — atualiza TODAS as imgs corretas
   ───────────────────────────────────────────────────────── */
window.changeProfileAvatar = function(userId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Select an image', 'warn'); return; }
    if (file.size > 3 * 1024 * 1024) { toast('Max 3MB', 'warn'); return; }
    const reader = new FileReader();
    reader.onload = function(ev) {
      const src = ev.target.result;
      const u = DB.users.find(x => x.id === userId);
      if (u) {
        u.avatar = src;
        u.avatarType = 'upload';
      }
      document.querySelectorAll('.profile-avatar-img').forEach(img => { img.src = src; });
      document.querySelectorAll('[data-profile-avatar]').forEach(img => { img.src = src; });
      if (u) {
        document.querySelectorAll('img').forEach(img => {
          if (img.dataset.userId === userId) img.src = src;
        });
      }
      persistNow();
      renderHeader();
      toast('Profile photo updated!', 'success');
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

/* ─────────────────────────────────────────────────────────
   3. OVERRIDE: viewWallet — oculta dados falsos para não-admin
   ───────────────────────────────────────────────────────── */
window.viewWallet = function() {
  if (!STATE.isAdmin) {
    const me = getUser(STATE.currentUserId);
    return `
    <div class="max-w-2xl mx-auto px-5 py-14 text-center">
      <div class="w-16 h-16 rounded-2xl bg-brand-50 grid place-items-center mx-auto mb-5">
        <i data-lucide="wallet" class="w-8 h-8 text-brand-500"></i>
      </div>
      <h1 class="text-2xl font-extrabold mb-2">ITL Wallet</h1>
      <p class="text-ink-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
        Connect your real wallet via WalletConnect or ITLX to see your balance,
        transactions and withdraw ITL directly.
      </p>

      <div class="bg-white border border-ink-100 rounded-2xl p-6 mb-6 text-left space-y-4">
        <div class="flex items-center gap-3 p-3 rounded-xl bg-ink-50 border border-ink-100">
          <i data-lucide="wallet" class="w-5 h-5 text-brand-500 shrink-0"></i>
          <div>
            <div class="text-xs text-ink-500">Connected wallet</div>
            <div class="font-mono text-sm font-bold text-ink-900">${me && me.wallet ? me.wallet.slice(0,10)+'…'+me.wallet.slice(-6) : 'None'}</div>
          </div>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-xl bg-ink-50 border border-ink-100">
          <i data-lucide="coins" class="w-5 h-5 text-brand-500 shrink-0"></i>
          <div>
            <div class="text-xs text-ink-500">ITL balance (on-chain)</div>
            <div class="font-bold text-ink-500 text-sm italic">Available after real integration with the Interlink Network</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-8">
        <a href="https://explorer.interlinklabs.ai" target="_blank" rel="noopener"
           class="bg-white border border-ink-100 rounded-2xl p-4 text-left hover:border-brand-200 transition">
          <i class="ri-link text-2xl text-brand-500 mb-2 block"></i>
          <div class="font-bold text-sm text-ink-900">Interlink Explorer</div>
          <div class="text-xs text-ink-500 mt-0.5">View on-chain transactions</div>
        </a>
        <a href="#/how"
           class="bg-white border border-ink-100 rounded-2xl p-4 text-left hover:border-brand-200 transition">
          <i class="ri-question-line text-2xl text-brand-500 mb-2 block"></i>
          <div class="font-bold text-sm text-ink-900">How it works?</div>
          <div class="text-xs text-ink-500 mt-0.5">Understand ITL payments</div>
        </a>
      </div>

      <button onclick="openConnectWallet()"
        class="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-xl text-sm flex items-center gap-2 mx-auto shadow-pop">
        <i data-lucide="wallet" class="w-4 h-4"></i>Connect real wallet
      </button>
    </div>`;
  }

  // Admin vê tudo (dados mock para testar)
  const me = getUser(STATE.currentUserId);
  const history = STATE.txHistory || [];
  const payouts = STATE.payouts || [];

  function txLabel(type) {
    return {
      escrow_lock: 'Escrow locked', escrow_release: 'Payment released',
      milestone_release: 'Milestone released', withdrawal: 'ITL Withdrawal',
      deposit: 'Deposit', rating: 'Review', profile_update: 'Profile updated',
      dispute_open: 'Dispute opened', dispute_resolve: 'Dispute resolved',
      order_cancel_refund: 'Refund (cancellation)',
    }[type] || type;
  }
  function txIcon(type) {
    return {
      escrow_lock: 'lock', escrow_release: 'unlock', withdrawal: 'banknote',
      deposit: 'arrow-down-to-line', rating: 'star', profile_update: 'user-cog',
      dispute_open: 'gavel', dispute_resolve: 'shield-check', order_cancel_refund: 'rotate-ccw',
    }[type] || 'arrow-left-right';
  }

  return `
  <div class="max-w-6xl mx-auto px-5 py-10">
    <div class="flex items-end justify-between mb-6 flex-wrap gap-3">
      <div>
        <div class="chip bg-amber-50 text-amber-700 mb-2">🔧 Admin Mode — Test Data</div>
        <h1 class="text-3xl font-extrabold tracking-tight">ITL Wallet</h1>
        <p class="text-ink-500 text-sm">Simulated data for interface testing.</p>
      </div>
      <button onclick="openWithdrawModal()"
        class="bg-brand-500 hover:bg-brand-600 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-pop">
        <i data-lucide="banknote" class="w-4 h-4"></i>Test Withdrawal
      </button>
    </div>

    <div class="grid lg:grid-cols-3 gap-3">
      <div class="lg:col-span-1 space-y-4">
        <div class="rounded-3xl bg-gradient-to-br from-brand-500 to-sonic text-white p-6 shadow-pop">
          <div class="text-xs font-semibold opacity-90 flex items-center gap-2">
            <i data-lucide="wallet" class="w-3.5 h-3.5"></i>${STATE.walletProvider} • Interlink Network
          </div>
          <div class="mt-4 text-4xl font-extrabold text-sonic">${fmtITL(me.balanceITL || 0)}</div>
          <div class="text-xs opacity-90 mt-1">Simulated balance (admin)</div>
          <div class="mt-4 pt-4 border-t border-white/20">
            <div class="text-[10px] uppercase tracking-wider opacity-75 font-bold">Wallet</div>
            <div class="font-mono text-xs break-all mt-1">${me.wallet}</div>
          </div>
        </div>

        <div class="bg-white border border-ink-100 rounded-2xl p-5">
          <div class="font-extrabold flex items-center gap-2 mb-3">
            <i data-lucide="receipt" class="w-5 h-5 text-brand-500"></i>Withdrawals (mock)
          </div>
          ${payouts.length
            ? `<div class="space-y-2">${payouts.slice(0, 5).map(p => `
              <div class="rounded-xl border border-ink-100 p-3">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-bold">${fmtITL(p.amount)}</span>
                  <span class="chip bg-emerald-50 text-emerald-700">Confirmed</span>
                </div>
                <div class="font-mono text-[10px] text-brand-500 mt-1">${shortHash(p.hash)}</div>
              </div>`).join('')}</div>`
            : `<div class="text-sm text-ink-500 border border-dashed border-ink-100 rounded-xl p-3 text-center">No withdrawals.</div>`}
        </div>
      </div>

      <div class="lg:col-span-2 bg-white border border-ink-100 rounded-2xl overflow-hidden">
        <div class="p-5 border-b border-ink-100 flex items-center justify-between">
          <div class="font-extrabold flex items-center gap-2">
            <i data-lucide="history" class="w-5 h-5 text-brand-500"></i>History (mock)
          </div>
          <span class="text-xs text-ink-500">${history.length} records</span>
        </div>
        ${history.length
          ? `<div class="divide-y divide-ink-100">${history.map(tx => `
            <div class="p-3 flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center shrink-0">
                <i data-lucide="${txIcon(tx.type)}" class="w-4 h-4 text-brand-500"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-bold text-sm">${txLabel(tx.type)}</div>
                <div class="text-xs text-ink-500">${timeAgo(tx.ts)} ago</div>
                <div class="font-mono text-[10px] text-brand-500">${shortHash(tx.hash)}</div>
              </div>
              <div class="text-right">
                <div class="font-extrabold text-sm ${tx.type === 'withdrawal' ? 'text-rose-600' : 'text-ink-900'}">
                  ${tx.amount ? (tx.type === 'withdrawal' ? '-' : '') + fmtITL(tx.amount) : '—'}
                </div>
              </div>
            </div>`).join('')}</div>`
          : `<div class="p-10 text-center text-ink-500">No transactions yet.</div>`}
      </div>
    </div>
  </div>`;
};

/* ─────────────────────────────────────────────────────────
   4. OVERRIDE: openChat — fecha menus antes de abrir o chat
   ───────────────────────────────────────────────────────── */
const _origOpenChat = window.openChat;
window.openChat = function(orderId, otherUserId) {
  document.getElementById('profile-dropdown')?.classList.add('hidden');
  document.getElementById('lang-menu')?.classList.add('hidden');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) mobileMenu.classList.add('hidden');
  const mobIcon = document.getElementById('mobMenuIcon');
  if (mobIcon) { mobIcon.classList.add('ri-menu-line'); mobIcon.classList.remove('ri-close-line'); }
  setTimeout(() => _origOpenChat.call(this, orderId, otherUserId), 10);
};

/* ─────────────────────────────────────────────────────────
   5. OVERRIDE: renderChat — corrige re-render e stepper em efêmeros
   ───────────────────────────────────────────────────────── */
window.renderChat = function(order, ephemeral) {
  const other = getUser(order.clientId === STATE.currentUserId ? order.freelancerId : order.clientId);
  if (!other) return;
  const svc = order.serviceId ? getService(order.serviceId) : null;
  const msgs = STATE.messages[order.id] || [];

  const prevStream = document.getElementById('chat-stream');
  const wasAtBottom = prevStream
    ? prevStream.scrollHeight - prevStream.scrollTop - prevStream.clientHeight < 40
    : true;

  const chatRoot = document.getElementById('chat-root');
  if (!chatRoot) return;

  chatRoot.innerHTML = `
  <div class="fixed inset-0 z-40 pointer-events-none">
    <div class="absolute inset-0 bg-ink-900/40 pointer-events-auto" onclick="closeChat()"></div>
    <aside class="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl pointer-events-auto flex flex-col fade-in">

      <div class="p-3 border-b border-ink-100 flex items-center gap-3 shrink-0">
        <img src="${other.avatar}" class="w-10 h-10 rounded-xl object-cover"/>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-sm flex items-center gap-1">
            ${escapeHtml(other.name)}
            ${other.verified ? '<i data-lucide="badge-check" class="w-4 h-4 text-brand-500"></i>' : ''}
          </div>
          <div id="chat-subtitle" class="text-[11px] text-ink-500 truncate">
            ${svc ? escapeHtml(svc.title) : 'Conversation'}
          </div>
        </div>
        <button onclick="closeChat()" aria-label="Close chat"
          class="w-8 h-8 grid place-items-center rounded-lg hover:bg-ink-100/50">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      ${(!ephemeral && svc && order.id && !order.id.startsWith('pre_')) ? `
      <div class="px-4 py-2.5 bg-ink-50/70 border-b border-ink-100 shrink-0">
        <div class="flex items-center justify-between mb-1.5">
          ${statusChip(order.status)}
          <span class="text-[10px] text-ink-400">Order #${order.id.slice(-5)}</span>
        </div>
        ${orderProgressStepper(order, { compact: true })}
      </div>` : ''}

      <div id="chat-stream"
           class="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3 bg-gradient-to-b from-white to-ink-100/30"
           style="overscroll-behavior:contain">
        ${msgs.length
          ? msgs.map(m => chatBubble(m)).join('')
          : `<div class="text-center text-ink-400 text-xs py-10">
               <i data-lucide="message-circle" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
               Start the conversation
             </div>`}
      </div>

      <div id="chat-attach-staging" class="hidden px-3 pt-2 border-t border-ink-100 bg-ink-50/50 shrink-0">
        <div class="flex items-center gap-1 mb-1">
          <i data-lucide="paperclip" class="w-3 h-3 text-ink-500"></i>
          <span class="text-[10px] font-bold text-ink-500 uppercase tracking-wider">Attachments ready</span>
        </div>
        <div id="chat-attach-list" class="flex flex-wrap gap-1.5 pb-2"></div>
      </div>

      <form id="chat-form" class="p-3 border-t border-ink-100 flex items-end gap-2 shrink-0"
            role="form" aria-label="Send message">
        <input type="file" id="chat-file-input" multiple
          accept="image/*,.pdf,.doc,.docx,.zip,.txt,.xls,.xlsx,.ppt,.pptx,.mp4,.mov,.fig"
          class="sr-only" aria-label="Select file"/>

        <button type="button" id="chat-attach-btn" aria-label="Attach file"
          class="w-9 h-9 grid place-items-center rounded-lg hover:bg-brand-50 hover:text-brand-600 text-ink-400 transition shrink-0 self-center">
          <i data-lucide="paperclip" class="w-4 h-4"></i>
        </button>

        <label for="chat-input" class="sr-only">Message</label>
        <textarea id="chat-input" rows="1" autocomplete="off"
          placeholder="Type a message…" aria-label="Type a message"
          class="flex-1 border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 resize-none max-h-28 overflow-y-auto"
          style="min-height:36px;"></textarea>

        <button type="submit" aria-label="Send message"
          class="w-10 h-10 grid place-items-center rounded-xl bg-brand-500 hover:bg-brand-600 text-white shrink-0 self-end transition">
          <i data-lucide="send" class="w-4 h-4"></i>
        </button>
      </form>
    </aside>
  </div>`;

  icons();

  const stream = document.getElementById('chat-stream');
  if (stream && wasAtBottom) {
    requestAnimationFrame(() => { stream.scrollTop = stream.scrollHeight; });
  }

  renderChatStagingArea();

  const attachBtn = document.getElementById('chat-attach-btn');
  const fileInput = document.getElementById('chat-file-input');
  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => handleChatFileSelect(e, order));
  }

  const textarea = document.getElementById('chat-input');
  if (textarea) {
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 112) + 'px';
    });
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('chat-form')?.dispatchEvent(new Event('submit'));
      }
    });
    requestAnimationFrame(() => textarea.focus());
  }

  const form = document.getElementById('chat-form');
  if (form && !form._listenerAdded) {
    form._listenerAdded = true;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const v = (input?.value || '').trim();
      const pending = window._chatPendingAttachments || [];
      if (!v && !pending.length) return;

      const msg = {
        id: uid('m'), from: STATE.currentUserId, text: v || '', ts: nowTs(), status: 'sent'
      };
      if (pending.length) {
        msg.attachments = pending.map(a => ({
          name: a.name, size: a.size, type: a.type, dataURL: a.dataURL || null,
        }));
      }

      STATE.messages[order.id] = STATE.messages[order.id] || [];
      STATE.messages[order.id].push(msg);
      window._chatPendingAttachments = [];
      if (input) input.value = '';
      window.renderChat(order, ephemeral);

      if (SB_READY && sb && STATE.sbProfile?.id && order.sbId) {
        const firstAttach = msg.attachments?.[0];
        const attachmentUrl = firstAttach
          ? (firstAttach.dataURL ? `[image:${firstAttach.name}]` : firstAttach.name)
          : null;
        sbSendMessage(order.sbId, v, attachmentUrl).then(saved => {
          if (saved) {
            msg._sbId = saved.id;
            msg.status = 'delivered';
            if (STATE.chatOpenOrderId === order.id) window.renderChat(order, ephemeral);
          }
        });
        return;
      }

      // Demo mode — simulated replies
      setTimeout(() => {
        if (msg.status === 'sent') msg.status = 'delivered';
        if (STATE.chatOpenOrderId === order.id) window.renderChat(order, ephemeral);
      }, 500);

      setTimeout(() => {
        if (STATE.chatOpenOrderId !== order.id) return;
        const chatSubtitle = document.getElementById('chat-subtitle');
        if (chatSubtitle) chatSubtitle.textContent = 'typing…';
      }, 750);

      setTimeout(() => {
        if (STATE.chatOpenOrderId !== order.id) return;
        const fileReplies = ['Got the files, thanks!', 'Great, already reviewing.'];
        const textReplies = ['Got it!', 'Already on it.', 'Can you send the brief?', "I'll upload a preview today."];
        const pool = msg.attachments?.length ? fileReplies : textReplies;
        msg.status = 'read';
        STATE.messages[order.id].push({
          id: uid('m'), from: other.id,
          text: pool[Math.floor(Math.random() * pool.length)],
          ts: nowTs(), status: 'read'
        });
        if (STATE.chatOpenOrderId === order.id) window.renderChat(order, ephemeral);
      }, 2100);
    });
  }
};

/* ─────────────────────────────────────────────────────────
   6. FIX: pickTrendingTag — versão única e correta
   ───────────────────────────────────────────────────────── */
window.pickTrendingTag = function(tag) {
  STATE.query = tag;
  STATE.category = 'all';
  STATE.trendingActive = false;
  closeSearchDropdown();
  if (STATE.route !== 'home') {
    STATE.route = 'home';
    window.location.hash = '#/home';
  }
  render();
  setTimeout(() => {
    const el = document.getElementById('explore-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);
};

/* ─────────────────────────────────────────────────────────
   7. goToDashboard — navegação confiável
   ───────────────────────────────────────────────────────── */
window.goToDashboard = function(tab) {
  document.getElementById('profile-dropdown')?.classList.add('hidden');
  STATE.dashboardTab = tab || 'client';
  STATE.route = 'dashboard';
  location.hash = '#/dashboard/' + (tab || 'client');
  render();
};

/* ─────────────────────────────────────────────────────────
   8. closeMenusOnOutside — vincula ao document
   ───────────────────────────────────────────────────────── */
document.addEventListener('click', function(e) {
  const dd = document.getElementById('profile-dropdown');
  const wrap = document.getElementById('profile-menu-wrap');
  if (dd && !dd.classList.contains('hidden')) {
    if (!dd.contains(e.target) && wrap && !wrap.contains(e.target)) {
      dd.classList.add('hidden');
    }
  }
  const langMenu = document.getElementById('lang-menu');
  if (langMenu && !langMenu.classList.contains('hidden') && !langMenu.contains(e.target)) {
    langMenu.classList.add('hidden');
  }
  const sortMenu = document.getElementById('sortMenu');
  if (sortMenu && !sortMenu.classList.contains('hidden') && !sortMenu.contains(e.target)) {
    sortMenu.classList.add('hidden');
  }
});

/* ═══════════════════════════════════════════════════════════
   PATCH v2 — Tradução EN + Header com "My orders" comentado
   ═══════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────
   v2.1 statusChip em inglês
   ───────────────────────────────────────────────────────── */
window.statusChip = function(status) {
  const map = {
    awaiting_requirements: ['Awaiting info',    'bg-amber-100 text-amber-800',   'info'],
    in_progress:           ['In progress',       'bg-amber-50 text-amber-700',    'loader-2'],
    awaiting_delivery:     ['In progress',       'bg-violet-50 text-violet-700',  'hourglass'],
    delivered:             ['Delivered',          'bg-blue-50 text-blue-700',      'package'],
    approved:              ['Approved',           'bg-emerald-50 text-emerald-700','check-circle-2'],
    cancelled:             ['Cancelled',          'bg-slate-100 text-slate-700',   'x-circle'],
    disputed:              ['In dispute',         'bg-rose-50 text-rose-700',      'alert-octagon'],
  };
  const [lbl, c, i] = map[status] || ['—', 'bg-ink-100 text-ink-700', 'circle'];
  return `<span class="chip ${c}"><i data-lucide="${i}" class="w-3.5 h-3.5"></i>${lbl}</span>`;
};

/* ─────────────────────────────────────────────────────────
   v2.2 clientActions em inglês
   ───────────────────────────────────────────────────────── */
window.clientActions = function(o) {
  if (o.status === 'cancelled') {
    return `<span class="chip bg-slate-100 text-slate-700"><i data-lucide="x-circle" class="w-3.5 h-3.5"></i>Cancelled</span>`;
  }
  if (o.cancelRequest && o.cancelRequest.by !== o.clientId) {
    return `<button onclick="acceptCancellation('${o.id}','client')" class="chip bg-emerald-500 hover:bg-emerald-600 text-white"><i data-lucide="check" class="w-3.5 h-3.5"></i>Accept cancellation</button>`;
  }
  if (o.cancelRequest) {
    return `<span class="chip bg-orange-50 text-orange-700"><i data-lucide="hourglass" class="w-3.5 h-3.5"></i>Cancellation requested</span>`;
  }
  if (o.status === 'awaiting_requirements') {
    return `<button onclick="openRequirementsModal('${o.id}')" class="chip bg-amber-500 hover:bg-amber-600 text-white"><i data-lucide="clipboard-list" class="w-3.5 h-3.5"></i>Fill in brief</button>
      <button onclick="cancelOrder('${o.id}','client')" class="chip bg-slate-100 hover:bg-slate-200 text-slate-700"><i data-lucide="x" class="w-3.5 h-3.5"></i>Cancel</button>`;
  }
  if (o.status === 'delivered' && !o.rated) {
    return `<button onclick="approveOrder('${o.id}')" class="chip bg-emerald-500 hover:bg-emerald-600 text-white"><i data-lucide="check" class="w-3.5 h-3.5"></i>Approve</button>`;
  }
  if (o.status === 'approved' && !o.rated) {
    return `<button onclick="openRateModal('${o.id}')" class="chip bg-amber-400 hover:bg-amber-500 text-white"><i data-lucide="star" class="w-3.5 h-3.5"></i>Leave a review</button>`;
  }
  if (o.status === 'approved' && o.rated) {
    return `<span class="chip bg-emerald-50 text-emerald-700"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>Completed</span>
      <button onclick="openReceiptModal('${o.id}')" class="chip bg-ink-100/60 hover:bg-ink-100 text-ink-700" title="Download receipt"><i data-lucide="receipt" class="w-3.5 h-3.5"></i>Receipt</button>`;
  }
  if (o.status === 'in_progress' || o.status === 'awaiting_delivery') {
    return `<button onclick="cancelOrder('${o.id}','client')" class="chip bg-slate-100 hover:bg-slate-200 text-slate-700"><i data-lucide="x" class="w-3.5 h-3.5"></i>Request cancellation</button>`;
  }
  return `<span class="chip bg-ink-100/60 text-ink-500"><i data-lucide="clock" class="w-3.5 h-3.5"></i>Waiting</span>`;
};

/* ─────────────────────────────────────────────────────────
   v2.3 freelancerActions em inglês
   ───────────────────────────────────────────────────────── */
window.freelancerActions = function(o) {
  if (o.status === 'cancelled') {
    return `<span class="chip bg-slate-100 text-slate-700"><i data-lucide="x-circle" class="w-3.5 h-3.5"></i>Cancelled</span>`;
  }
  if (o.cancelRequest && o.cancelRequest.by !== o.freelancerId) {
    return `<button onclick="acceptCancellation('${o.id}','freelancer')" class="chip bg-emerald-500 hover:bg-emerald-600 text-white"><i data-lucide="check" class="w-3.5 h-3.5"></i>Accept cancellation</button>`;
  }
  if (o.cancelRequest) {
    return `<span class="chip bg-orange-50 text-orange-700"><i data-lucide="hourglass" class="w-3.5 h-3.5"></i>Cancellation requested</span>`;
  }
  if (o.status === 'awaiting_requirements') {
    return `<span class="chip bg-amber-50 text-amber-700"><i data-lucide="clipboard-list" class="w-3.5 h-3.5"></i>Awaiting brief</span>`;
  }
  if (o.status === 'in_progress' || o.status === 'awaiting_delivery') {
    return `<button onclick="openDeliverModal('${o.id}')" class="chip bg-brand-500 hover:bg-brand-600 text-white"><i data-lucide="upload" class="w-3.5 h-3.5"></i>Deliver</button>
      <button onclick="cancelOrder('${o.id}','freelancer')" class="chip bg-slate-100 hover:bg-slate-200 text-slate-700"><i data-lucide="x" class="w-3.5 h-3.5"></i>Cancel</button>`;
  }
  if (o.status === 'delivered') {
    return `<span class="chip bg-violet-50 text-violet-700">Awaiting approval</span>`;
  }
  if (o.status === 'approved') {
    return `<span class="chip bg-emerald-50 text-emerald-700">Received</span>
      <button onclick="openReceiptModal('${o.id}')" class="chip bg-ink-100/60 hover:bg-ink-100 text-ink-700"><i data-lucide="receipt" class="w-3.5 h-3.5"></i>Receipt</button>`;
  }
  return `<span class="chip bg-emerald-50 text-emerald-700">Received</span>`;
};

/* ─────────────────────────────────────────────────────────
   v2.4 dashClient em inglês
   ───────────────────────────────────────────────────────── */
window.dashClient = function() {
  const orders = STATE.orders.filter(o => o.clientId === STATE.currentUserId);
  const active  = orders.filter(o => !['approved','cancelled'].includes(o.status));
  const done    = orders.filter(o => o.status === 'approved');
  const tab     = STATE.clientOrdersTab === 'done' ? 'done' : 'active';
  const listed  = tab === 'done' ? done : active;

  return `
  <div class="grid grid-cols-2 gap-3 mb-5">
    <div class="bg-white border border-ink-100 rounded-2xl p-3">
      <div class="text-xs text-ink-500 font-semibold mb-1">In progress</div>
      <div class="text-2xl font-extrabold">${active.length}</div>
    </div>
    <div class="bg-white border border-ink-100 rounded-2xl p-3">
      <div class="text-xs text-ink-500 font-semibold mb-1">Completed</div>
      <div class="text-2xl font-extrabold">${done.length}</div>
    </div>
  </div>

  <div class="bg-white border border-ink-100 rounded-2xl overflow-hidden">
    <div class="flex border-b border-ink-100">
      <button onclick="STATE.clientOrdersTab='active';render()"
        class="flex-1 py-3 text-sm font-bold border-b-2 transition
          ${tab==='active'?'border-ink-900 text-ink-900':'border-transparent text-ink-400'}">
        In progress${active.length ? ` (${active.length})` : ''}
      </button>
      <button onclick="STATE.clientOrdersTab='done';render()"
        class="flex-1 py-3 text-sm font-bold border-b-2 transition
          ${tab==='done'?'border-ink-900 text-ink-900':'border-transparent text-ink-400'}">
        Completed${done.length ? ` (${done.length})` : ''}
      </button>
    </div>

    ${listed.length === 0
      ? `<div class="py-14 text-center text-ink-400">
           <div class="text-4xl mb-3">${tab==='done'?'✅':'📦'}</div>
           <div class="font-semibold text-ink-600 mb-1">${tab==='done'?'No completed orders yet':'No active orders'}</div>
           <a href="#/home" class="mt-3 inline-block text-sm font-bold text-brand-500">Explore services →</a>
         </div>`
      : `<div class="divide-y divide-ink-100">${listed.map(o => orderRow(o,'client')).join('')}</div>`}
  </div>`;
};

/* ─────────────────────────────────────────────────────────
   v2.5 dashFreelancer em inglês
   ───────────────────────────────────────────────────────── */
window.dashFreelancer = function() {
  const freelancerId = 'u_ana';
  const u       = getUserSafe(freelancerId);
  const me      = getUserSafe(STATE.currentUserId);
  const mySvc   = DB.services.filter(sv => sv.freelancerId === freelancerId);
  const myOrders= STATE.orders.filter(o => o.freelancerId === freelancerId);
  const pending = myOrders.filter(o => !['approved','cancelled'].includes(o.status));
  const frTab   = STATE._frTab || 'orders';

  return `
  <div class="bg-white border border-ink-100 rounded-2xl p-5 mb-4 flex items-center justify-between gap-3">
    <div>
      <div class="text-xs text-ink-400 font-semibold mb-0.5">Available balance</div>
      <div class="text-2xl font-extrabold text-brand-600">${fmtITL(me.balanceITL||0)}</div>
    </div>
    <button onclick="openWithdrawModal()"
      class="bg-brand-500 hover:bg-brand-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2">
      <i data-lucide="banknote" class="w-4 h-4"></i>Withdraw
    </button>
  </div>

  <div class="grid grid-cols-2 gap-3 mb-4">
    <div class="bg-white border border-ink-100 rounded-2xl p-3">
      <div class="text-xs text-ink-500 font-semibold mb-1">Open orders</div>
      <div class="text-2xl font-extrabold">${pending.length}</div>
    </div>
    <div class="bg-white border border-ink-100 rounded-2xl p-3">
      <div class="text-xs text-ink-500 font-semibold mb-1">Rating</div>
      <div class="text-2xl font-extrabold">${u.rating.toFixed(1)} ★</div>
    </div>
  </div>

  <div class="bg-white border border-ink-100 rounded-2xl overflow-hidden">
    <div class="flex border-b border-ink-100">
      <button onclick="STATE._frTab='orders';render()"
        class="flex-1 py-3 text-sm font-bold border-b-2 transition
          ${frTab==='orders'?'border-ink-900 text-ink-900':'border-transparent text-ink-400'}">
        Orders${pending.length ? ` (${pending.length})` : ''}
      </button>
      <button onclick="STATE._frTab='services';render()"
        class="flex-1 py-3 text-sm font-bold border-b-2 transition
          ${frTab==='services'?'border-ink-900 text-ink-900':'border-transparent text-ink-400'}">
        Services${mySvc.length ? ` (${mySvc.length})` : ''}
      </button>
    </div>

    ${frTab === 'orders' ? (myOrders.length === 0
      ? `<div class="py-14 text-center text-ink-400">
           <div class="text-4xl mb-3">📦</div>
           <div class="font-semibold text-ink-600 mb-1">No orders yet</div>
           <p class="text-sm text-ink-400">When a client hires you, it will appear here.</p>
         </div>`
      : `<div class="divide-y divide-ink-100">${myOrders.map(o => orderRow(o,'freelancer')).join('')}</div>`
    ) : ''}

    ${frTab === 'services' ? `
      <div class="p-3 flex items-center justify-between border-b border-ink-100">
        <span class="text-sm font-semibold text-ink-600">${mySvc.length} service${mySvc.length!==1?'s':''}</span>
        <button onclick="openNewServiceModal()"
          class="text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl">
          + New service
        </button>
      </div>
      <div class="divide-y divide-ink-100">
        ${mySvc.length === 0
          ? `<div class="py-12 text-center text-ink-400">
               <div class="text-4xl mb-3">🛠</div>
               <div class="font-semibold text-ink-600 mb-1">No services published yet</div>
               <button onclick="openNewServiceModal()" class="mt-2 text-sm font-bold text-brand-500">+ Create your first</button>
             </div>`
          : mySvc.map(sv => `
            <div class="flex items-center gap-3 p-3">
              <img src="${sv.thumb}" class="w-14 h-14 rounded-xl object-cover shrink-0"/>
              <div class="flex-1 min-w-0">
                <a href="#/service/${sv.id}" class="text-sm font-bold text-ink-900 line-clamp-2 hover:text-brand-600">${escapeHtml(sv.title)}</a>
                <div class="flex items-center gap-2 mt-1">
                  ${stars(sv.rating,'w-3 h-3')}
                  <span class="text-xs text-ink-500">${sv.rating.toFixed(1)} · ${fmtITL(sv.price)}</span>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button onclick="openEditServiceModal('${sv.id}')" class="w-9 h-9 grid place-items-center rounded-xl hover:bg-ink-100 text-ink-400">
                  <i data-lucide="pencil" class="w-4 h-4"></i>
                </button>
                <button onclick="deleteService('${sv.id}')" class="w-9 h-9 grid place-items-center rounded-xl hover:bg-rose-50 text-ink-300 hover:text-rose-500">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>`).join('')}
      </div>` : ''}
  </div>`;
};

/* ─────────────────────────────────────────────────────────
   v2.6 openEditProfileModal em inglês
   ───────────────────────────────────────────────────────── */
window.openEditProfileModal = function() {
  const u = DB.users.find(x => x.id === STATE.currentUserId);
  if (!u) { toast('User not found', 'warn'); return; }

  const langOpts = LANGUAGES_LIST.map(l =>
    `<option value="${l.id}" ${(u.languages||[]).includes(l.id)?'selected':''}>${l.flag} ${l.label}</option>`
  ).join('');

  $('#modal-root').innerHTML = `
  <div class="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm flex items-center justify-center p-3 fade-in"
       onclick="if(event.target===this)closeModal()">
    <div class="bg-white w-full max-w-md rounded-2xl shadow-pop flex flex-col overflow-hidden"
         style="max-height:min(88vh,640px)">

      <div class="px-4 py-3 border-b border-ink-100 flex items-center justify-between shrink-0">
        <span class="font-extrabold text-sm flex items-center gap-2">
          <i data-lucide="pencil" class="w-4 h-4 text-brand-500"></i>Edit profile
        </span>
        <button onclick="closeModal()" class="w-7 h-7 grid place-items-center rounded-lg hover:bg-ink-100/50">
          <i data-lucide="x" class="w-4 h-4 text-ink-400"></i>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div class="flex items-center gap-3">
          <div class="relative shrink-0 cursor-pointer"
               onclick="closeModal();changeProfileAvatar('${u.id}')" title="Change photo">
            <div class="w-14 h-14 rounded-xl overflow-hidden border border-ink-100">
              <img src="${u.avatar}" class="w-full h-full object-cover profile-avatar-img"/>
            </div>
            <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-500 rounded-full grid place-items-center shadow">
              <i data-lucide="camera" class="w-3 h-3 text-white"></i>
            </div>
          </div>
          <div class="text-xs text-ink-500 min-w-0">
            <div class="font-mono truncate">@${escapeHtml(u.handle)}</div>
            <div class="font-mono truncate mt-0.5">${(u.wallet||'').slice(0,8)}…${(u.wallet||'').slice(-4)}</div>
            <div class="text-[10px] text-ink-400 mt-0.5">Handle and wallet cannot be edited.</div>
          </div>
        </div>

        <div>
          <label class="text-xs font-bold text-ink-600">Display name</label>
          <input id="ep-name" value="${escapeHtml(u.name)}"
            class="mt-1 w-full border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300"/>
        </div>

        <div>
          <label class="text-xs font-bold text-ink-600">Bio</label>
          <textarea id="ep-bio" rows="2"
            class="mt-1 w-full border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 resize-none">${escapeHtml(u.bio||'')}</textarea>
        </div>

        <div>
          <label class="text-xs font-bold text-ink-600">Skills <span class="font-normal text-ink-400">(comma separated)</span></label>
          <input id="ep-skills" value="${(u.skills||[]).map(escapeHtml).join(', ')}"
            class="mt-1 w-full border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300"
            placeholder="React, Solidity, Figma"/>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs font-bold text-ink-600">Country</label>
            <select id="ep-country"
              class="mt-1 w-full border border-ink-100 rounded-xl px-2 py-2 text-sm outline-none focus:border-brand-300">
              ${COUNTRIES.map(c =>
                `<option value="${c.id}" ${u.country===c.id?'selected':''}>${c.flag} ${c.name}</option>`
              ).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs font-bold text-ink-600">Response time (h)</label>
            <input id="ep-resp" type="number" min="1" max="48" value="${u.responseHours||4}"
              class="mt-1 w-full border border-ink-100 rounded-xl px-2 py-2 text-sm outline-none focus:border-brand-300"/>
          </div>
        </div>

        <div>
          <label class="text-xs font-bold text-ink-600">Languages <span class="font-normal text-ink-400">(Ctrl+click for multiple)</span></label>
          <select id="ep-langs" multiple size="3"
            class="mt-1 w-full border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300">
            ${langOpts}
          </select>
        </div>
      </div>

      <div class="px-4 py-3 border-t border-ink-100 flex gap-2 shrink-0">
        <button onclick="closeModal()"
          class="flex-1 border border-ink-100 hover:bg-ink-50 font-semibold py-2 rounded-xl text-sm">
          Cancel
        </button>
        <button onclick="saveProfile()"
          class="flex-[2] bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-2">
          <i data-lucide="check" class="w-4 h-4"></i>Save changes
        </button>
      </div>
    </div>
  </div>`;
  icons();
};

/* ─────────────────────────────────────────────────────────
   v2.7 QR CODE VÁLIDO no modal de pagamento
   ───────────────────────────────────────────────────────── */
(function patchQRCode() {
  const _orig = window.confirmHire;
  window.confirmHire = function(serviceId, tierKey) {
    const briefEl = document.getElementById('hire-brief');
    const brief = briefEl ? briefEl.value.trim() : '';
    const s = getService(serviceId);
    const tier = { priceITL: s.price, days: s.deadline||s.days||7, revisions: 2, includes: s.includes||[] };
    const me = getUser(STATE.currentUserId);
    const total = +(tier.priceITL * 1.02).toFixed(2);

    if (me.balanceITL < total) { toast('Insufficient balance.', 'error'); return; }

    const msToggle = document.getElementById('hire-milestones-toggle');
    const useMilestones = msToggle && msToggle.checked;
    let milestonesConfig = null;
    if (useMilestones) {
      const preset = MILESTONE_PRESETS[window._hireMilestonePreset || 0];
      milestonesConfig = preset.pcts.map((pct, i) => ({
        id: uid('ms'), name: preset.names[i], pct,
        amountITL: +((tier.priceITL * pct / 100)).toFixed(2),
        status: i === 0 ? 'pending' : 'locked',
        releaseTx: null, releasedAt: null,
      }));
    }

    const hash = txHash();
    const qrPayload = `INTERWORK PAYMENT\nAmount: ${total} ITL\nRef: ${hash.slice(0,16)}\nTo: InterWork Escrow`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&qzone=2&ecc=M&data=${encodeURIComponent(qrPayload)}`;

    $('#modal-root').innerHTML = `
    <div class="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm grid place-items-center p-3 fade-in">
      <div id="tx-card" class="bg-white w-full max-w-sm rounded-2xl shadow-pop overflow-hidden">

        <div class="px-5 py-4 border-b border-ink-100 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-brand-50 grid place-items-center shrink-0">
            <i data-lucide="qr-code" class="w-5 h-5 text-brand-500"></i>
          </div>
          <div>
            <div class="font-extrabold text-sm">Payment approval</div>
            <div class="text-xs text-ink-500">Scan with your wallet to confirm</div>
          </div>
        </div>

        <div class="px-4 py-4 space-y-3">
          <div class="flex items-center gap-4">
            <div class="w-[120px] h-[120px] shrink-0 rounded-xl border border-ink-100 overflow-hidden bg-white p-1.5 shadow-sm">
              <img src="${qrUrl}" class="w-full h-full object-contain" alt="Payment QR Code"/>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[11px] text-ink-400 mb-1">Total in escrow</div>
              <div class="font-extrabold text-xl text-brand-700 leading-tight">${fmtITL(total)}</div>
              <div class="text-xs font-bold text-brand-500 mb-2">ITL</div>
              <div class="text-[10px] text-ink-400 leading-snug">Scan with ITLX, MetaMask or WalletConnect</div>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-1 text-center text-[10px]">
            ${['Open wallet','Scan QR','Approve tx','Confirm below'].map((step, i) => `
            <div class="flex flex-col items-center gap-1 ${i===3?'bg-amber-50':'bg-brand-50'} rounded-lg px-1 py-2">
              <div class="w-5 h-5 rounded-full ${i===3?'bg-amber-400':'bg-brand-500'} text-white grid place-items-center font-bold text-[9px]">${i+1}</div>
              <span class="${i===3?'text-amber-700':'text-ink-600'} leading-tight">${step}</span>
            </div>`).join('')}
          </div>

          <div class="rounded-xl bg-ink-50 border border-ink-100 px-3 py-2 text-[10px] text-ink-500 font-mono break-all">
            Ref: ${hash.slice(0,20)}…
          </div>

          <div class="flex items-center gap-1.5 text-[10px] text-ink-400 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
            <i data-lucide="info" class="w-3 h-3 shrink-0"></i>
            <span>Demo — transaction simulated locally.</span>
          </div>

          <div class="flex gap-2 pt-1">
            <button onclick="closeModal()"
              class="flex-1 border border-ink-100 hover:bg-ink-50 font-semibold py-2.5 rounded-xl text-xs text-ink-500">
              Cancel
            </button>
            <button id="qr-confirm-btn"
              onclick="qrConfirmPayment(${JSON.stringify(serviceId)},${JSON.stringify(tierKey||STATE.selectedTier)},${JSON.stringify(brief)},${JSON.stringify(total)},${JSON.stringify(hash)},${JSON.stringify(tier)},${JSON.stringify(milestonesConfig)})"
              class="flex-[2] bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition">
              <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>Confirm ${fmtITL(total)}
            </button>
          </div>
        </div>
      </div>
    </div>`;
    icons();
  };
})();

/* ─────────────────────────────────────────────────────────
   v2.8 HEADER COMPLETO — "My orders" COMENTADO no menu
   ───────────────────────────────────────────────────────── */
(function patchHeaderFinal() {
  window.renderHeader = function() {
    const me = getUser(STATE.currentUserId);
    const authed = isAuthed();
    const langObj = LANGUAGES_LIST.find(l => l.id === STATE.language) || LANGUAGES_LIST[0];

    document.getElementById('app-header').innerHTML = `
    <header class="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">

        <!-- Logo -->
        <a href="#/home" class="flex items-center gap-2 shrink-0">
          <span class="w-7 h-7 rounded-lg bg-[#8b7cff] grid place-items-center text-white shrink-0">
            <i class="ri-briefcase-4-fill text-sm"></i>
          </span>
          <span class="font-extrabold text-slate-900 tracking-tight hidden sm:inline">InterWork</span>
        </a>

        <!-- Desktop nav -->
        <nav class="hidden xl:flex items-center gap-6 text-sm font-medium text-slate-600 flex-1 justify-center">
          <a href="#/earn" class="hover:text-slate-900 transition whitespace-nowrap ${STATE.route==='earn'?'text-brand-600 font-bold':''}">Earn ITL</a>
          <a href="#/how" class="hover:text-slate-900 transition whitespace-nowrap">How It Works</a>
          <a href="#/community" class="hover:text-slate-900 transition whitespace-nowrap ${STATE.route==='community'?'text-brand-600 font-bold':''}">Community</a>
          <a href="#/why-join" class="hover:text-slate-900 transition whitespace-nowrap ${STATE.route==='why-join'?'text-brand-600 font-bold':''}">Why Join</a>
        </nav>

        <!-- Right actions -->
        <div class="flex items-center gap-2 shrink-0">

          <!-- Language — desktop only -->
          <button onclick="toggleLangMenu(event)"
            class="hidden xl:flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
            <span class="text-base">${langObj.flag}</span>
            <span class="text-xs">${langObj.id.toUpperCase()}</span>
            <i class="ri-arrow-down-s-line opacity-50 text-xs"></i>
          </button>

          ${authed ? `
            <!-- Avatar -->
            <div class="relative shrink-0" id="profile-menu-wrap">
              <button onclick="toggleProfileMenu(event)"
                class="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-slate-200 hover:border-[#8b7cff] transition focus:outline-none"
                aria-label="Profile menu">
                ${me?.avatar && me.avatarType !== 'initials'
                  ? `<img src="${me.avatar}" class="w-full h-full object-cover profile-avatar-img"/>`
                  : `<div class="w-full h-full bg-[#efeaff] text-[#5b4ee0] font-bold flex items-center justify-center text-sm">${(me?.name||'U')[0].toUpperCase()}</div>`}
              </button>
              ${unreadCount() ? `
              <span class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] text-white font-bold pointer-events-none">
                ${unreadCount() > 9 ? '9+' : unreadCount()}
              </span>` : ''}
            </div>

            <!-- Profile dropdown -->
            <div id="profile-dropdown"
              class="hidden absolute right-4 top-14 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-[60] overflow-hidden">

              <!-- User info -->
              <div class="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <div class="w-9 h-9 rounded-full overflow-hidden border border-slate-200 shrink-0">
                  ${me?.avatar && me.avatarType !== 'initials'
                    ? `<img src="${me.avatar}" class="w-full h-full object-cover profile-avatar-img"/>`
                    : `<div class="w-full h-full bg-[#efeaff] text-[#5b4ee0] font-bold flex items-center justify-center text-sm">${(me?.name||'U')[0].toUpperCase()}</div>`}
                </div>
                <div class="min-w-0">
                  <div class="font-bold text-sm text-slate-900 truncate">${escapeHtml(me?.name||'User')}</div>
                  <div class="text-xs text-slate-400 truncate">@${escapeHtml(me?.handle||'')}</div>
                </div>
              </div>

              <!-- Menu items -->
              <div class="py-1.5">

                <!-- View profile -->
                <a href="#/u/${me?.handle||''}" onclick="closeProfileMenu()"
                  class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition">
                  <div class="w-7 h-7 rounded-lg bg-slate-100 grid place-items-center shrink-0">
                    <i class="ri-user-line text-slate-500 text-sm"></i>
                  </div>
                  <span class="font-medium">View profile</span>
                </a>

                <!-- MY ORDERS — hidden for now
                <button onclick="closeProfileMenu();goToDashboard('client')"
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition text-left">
                  <div class="w-7 h-7 rounded-lg bg-slate-100 grid place-items-center shrink-0">
                    <i class="ri-briefcase-line text-slate-500 text-sm"></i>
                  </div>
                  <span class="font-medium">My orders</span>
                </button>
                -->

                <!-- Notifications -->
                <button onclick="closeProfileMenu();go('#/notifications')"
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition text-left">
                  <div class="w-7 h-7 rounded-lg bg-slate-100 grid place-items-center shrink-0 relative">
                    <i class="ri-notification-3-line text-slate-500 text-sm"></i>
                    ${unreadCount() ? `<span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full text-[8px] text-white font-bold grid place-items-center">${unreadCount()}</span>` : ''}
                  </div>
                  <div class="flex-1 flex items-center justify-between">
                    <span class="font-medium">Notifications</span>
                    ${unreadCount() ? `<span class="text-xs font-bold text-rose-500">${unreadCount()} new</span>` : ''}
                  </div>
                </button>

                <!-- Change photo -->
                <button onclick="closeProfileMenu();changeProfileAvatar('${me?.id||STATE.currentUserId}')"
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition text-left">
                  <div class="w-7 h-7 rounded-lg bg-slate-100 grid place-items-center shrink-0">
                    <i class="ri-camera-line text-slate-500 text-sm"></i>
                  </div>
                  <span class="font-medium">Change photo</span>
                </button>

              </div>

              <!-- Disconnect -->
              <div class="border-t border-slate-100 py-1.5">
                <button onclick="closeProfileMenu();disconnectWallet()"
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition text-left">
                  <div class="w-7 h-7 rounded-lg bg-rose-50 grid place-items-center shrink-0">
                    <i class="ri-logout-box-r-line text-rose-500 text-sm"></i>
                  </div>
                  <span class="font-medium">Disconnect wallet</span>
                </button>
              </div>
            </div>
          ` : `
            <button onclick="openConnectWallet()"
              class="btn-primary-alt flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs sm:text-sm shadow-sm">
              <i class="ri-wallet-line text-sm"></i>
              <span class="hidden sm:inline">Connect Wallet</span>
            </button>
          `}

          <!-- Hamburger — mobile/tablet only -->
          <button onclick="toggleMobileMenu()" class="xl:hidden text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition" aria-label="Menu">
            <i id="mobMenuIcon" class="ri-menu-line text-lg"></i>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <div id="mobileMenu" class="hidden xl:hidden border-t border-slate-100 bg-white">
        <nav class="px-4 py-3 flex flex-col gap-1 text-sm font-medium text-slate-700">
          <a href="#/earn" onclick="toggleMobileMenu()"
            class="py-2.5 px-3 rounded-lg hover:bg-slate-50 ${STATE.route==='earn'?'bg-slate-50 text-brand-600 font-bold':''}">
            Earn ITL
          </a>
          <a href="#/how" onclick="toggleMobileMenu()" class="py-2.5 px-3 rounded-lg hover:bg-slate-50">
            How It Works
          </a>
          <a href="#/community" onclick="toggleMobileMenu()"
            class="py-2.5 px-3 rounded-lg hover:bg-slate-50 ${STATE.route==='community'?'bg-slate-50 text-brand-600 font-bold':''}">
            Community Rewards
          </a>
          <a href="#/why-join" onclick="toggleMobileMenu()"
            class="py-2.5 px-3 rounded-lg hover:bg-slate-50 ${STATE.route==='why-join'?'bg-slate-50 text-brand-600 font-bold':''}">
            Why Join
          </a>

          <!-- MY ORDERS — hidden for now
          <a href="#/dashboard/client" onclick="toggleMobileMenu()"
            class="py-2.5 px-3 rounded-lg hover:bg-slate-50">
            My orders
          </a>
          -->

          <div class="border-t border-slate-100 mt-1 pt-2">
            <button onclick="toggleLangMenu(event)" class="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-50 flex items-center justify-between">
              <span>Language</span>
              <span class="text-lg">${langObj.flag}</span>
            </button>
          </div>
        </nav>
      </div>

      <!-- Lang menu -->
      <div id="lang-menu" class="hidden absolute right-4 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-[60]">
        ${LANGUAGES_LIST.map(l => `
          <button onclick="setLang('${l.id}')"
            class="w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3
              ${STATE.language===l.id?'bg-slate-50 text-[#5b4ee0] font-bold':'hover:bg-slate-50 text-slate-700'}">
            <span class="text-lg">${l.flag}</span>
            <span class="flex-1">${l.label}</span>
            ${STATE.language===l.id?'<i class="ri-check-line"></i>':''}
          </button>`).join('')}
      </div>
    </header>`;

    icons();
  };
})();
/**
 * INTERWORK — PATCH DE CORREÇÕES
 * Inclua este script APÓS o script principal (inline do index.html)
 * <script src="interwork-fixes.js"></script>
 *
 * Correções aplicadas:
 *  1. Remove "Edit cover" do viewProfile
 *  2. Corrige Edit Profile (modal tamanho + foto pelo avatar do perfil)
 *  3. Corrige changeProfileAvatar (atualiza todas as imgs corretas)
 *  4. Carteira — oculta dados falsos para usuários não-admin
 *  5. "Meus pedidos" no dropdown — navegação confiável
 *  6. Chat — fecha menus antes de abrir, fix re-render, remove status em chats efêmeros
 *  7. Dupla declaração de gigCarouselHideControls removida via override seguro
 *  8. pickTrendingTag — versão única e correta
 */

/* ─────────────────────────────────────────────────────────
   1. OVERRIDE: viewProfile — sem "Edit cover", câmera no avatar
   ───────────────────────────────────────────────────────── */
window.viewProfile = function(handle) {
  const u = DB.users.find(x => x.handle === handle);
  if (!u) return `<div class="max-w-3xl mx-auto p-10 text-center text-ink-500">
    Perfil não encontrado. <a href="#/home" class="text-brand-500 font-semibold">Voltar</a>
  </div>`;

  const co = getCountry(u.country);
  const services = DB.services.filter(s => s.freelancerId === u.id);
  const ordersDone = STATE.orders.filter(o => o.freelancerId === u.id && o.status === 'approved').length + (u.jobs || 0);
  const lvl = u.level || levelOf(u.jobs);
  const allReviews = services.flatMap(s => s.reviews.map(r => ({ ...r, serviceTitle: s.title })));
  const avgRating = allReviews.length
    ? (allReviews.reduce((a, r) => a + (r.stars || 0), 0) / allReviews.length).toFixed(1)
    : u.rating.toFixed(1);
  const isMe = u.id === STATE.currentUserId;

  return `
  <!-- COVER BANNER — sem botão "Edit cover" -->
  <div class="cover h-36 sm:h-44 w-full relative"></div>

  <!-- PROFILE HEAD -->
  <div class="max-w-5xl mx-auto px-4 sm:px-6">
    <div class="flex flex-col sm:flex-row sm:items-end gap-3 -mt-14 sm:-mt-16 mb-5">

      <!-- Avatar com câmera sempre clicável pelo dono -->
      <div class="relative shrink-0">
        <div class="w-28 h-28 rounded-3xl shadow-lg border-4 border-white overflow-hidden bg-white">
          <img src="${u.avatar}" class="w-full h-full object-cover profile-avatar-img" alt="${escapeHtml(u.name)}"/>
        </div>
        ${isMe ? `
          <button onclick="changeProfileAvatar('${u.id}')"
            class="absolute bottom-1 right-1 bg-white border border-ink-100 rounded-full p-1.5 shadow hover:bg-ink-50 transition"
            title="Trocar foto de perfil">
            <i data-lucide="camera" class="w-3.5 h-3.5 text-ink-600"></i>
          </button>` : ''}
        <span class="absolute top-2 left-2 w-3.5 h-3.5 rounded-full border-2 border-white ${u.online ? 'bg-emerald-400' : 'bg-ink-300'}"></span>
      </div>

      <!-- Name + chips -->
      <div class="flex-1 min-w-0 pt-2 sm:pt-0 sm:pb-1">
        <div class="flex flex-wrap items-center gap-2 mb-1">
          <h1 class="text-xl sm:text-2xl font-extrabold text-ink-900 leading-tight">${escapeHtml(u.name)}</h1>
          ${u.verified ? `<span class="chip bg-emerald-50 text-emerald-700 text-xs"><i data-lucide="badge-check" class="w-3.5 h-3.5"></i>Verified</span>` : ''}
          ${lvl ? levelChip(lvl) : ''}
        </div>
        <div class="text-sm text-ink-500 mb-2">@${escapeHtml(u.handle)}</div>
        <div class="flex flex-wrap items-center gap-3 text-sm text-ink-500">
          ${co ? `<span class="flex items-center gap-1"><span>${co.flag}</span>${co.name}</span>` : ''}
          <span class="flex items-center gap-1">
            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
            Member since ${new Date(u.joinedTs).getFullYear()}
          </span>
        </div>
      </div>

      <!-- CTA -->
      <div class="flex gap-2 shrink-0 sm:pb-1">
        ${isMe
          ? `<button onclick="openEditProfileModal()"
               class="btn-outline rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2">
               <i data-lucide="pencil" class="w-4 h-4"></i>Edit profile
             </button>`
          : `<button onclick="openChat(null,'${u.id}')"
               class="bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-sm transition">
               <i data-lucide="message-circle" class="w-4 h-4"></i>Message
             </button>`}
      </div>
    </div>

    <!-- STATS STRIP -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="bg-white border border-ink-100 rounded-2xl p-3 text-center shadow-sm">
        <div class="text-2xl font-extrabold text-ink-900">${avgRating}</div>
        <div class="flex justify-center mt-1">${stars(parseFloat(avgRating), 'w-3.5 h-3.5')}</div>
        <div class="text-xs text-ink-500 mt-1">${allReviews.length} reviews</div>
      </div>
      <div class="bg-white border border-ink-100 rounded-2xl p-3 text-center shadow-sm">
        <div class="text-2xl font-extrabold text-ink-900">${ordersDone}</div>
        <div class="text-xs text-ink-500 mt-1">Orders completed</div>
      </div>
      <div class="bg-white border border-ink-100 rounded-2xl p-3 text-center shadow-sm">
        <div class="text-2xl font-extrabold text-ink-900">${u.approvalPct || 99}%</div>
        <div class="text-xs text-ink-500 mt-1">Approval rate</div>
      </div>
      <div class="bg-white border border-ink-100 rounded-2xl p-3 text-center shadow-sm">
        <div class="text-2xl font-extrabold text-ink-900">${u.repeatClientsPct || 0}%</div>
        <div class="text-xs text-ink-500 mt-1">Repeat clients</div>
      </div>
    </div>

    <!-- TABS -->
    <div class="flex gap-3 border-b border-ink-100 mb-6" id="profile-tabs">
      <button class="tab tab-active pb-2" onclick="showProfileTab('gigs',this)">Services (${services.length})</button>
      <button class="tab pb-2" onclick="showProfileTab('about',this)">About</button>
      <button class="tab pb-2" onclick="showProfileTab('reviews',this)">Reviews (${allReviews.length})</button>
      ${u.portfolio && u.portfolio.length
        ? `<button class="tab pb-2" onclick="showProfileTab('portfolio',this)">Portfolio (${u.portfolio.length})</button>`
        : ''}
    </div>

    <!-- MAIN + SIDEBAR -->
    <div class="flex flex-col lg:flex-row gap-8 pb-16">
      <div class="flex-1 min-w-0">

        <!-- GIGS -->
        <div id="pane-gigs">
          ${services.length === 0
            ? `<div class="bg-white border border-ink-100 rounded-2xl p-10 text-center text-ink-500">
                <i data-lucide="package-open" class="w-12 h-12 mx-auto mb-3 text-ink-300"></i>
                <div class="font-semibold mb-1">No services published yet.</div>
                ${isMe ? `<a href="#/new-service" class="mt-3 inline-block bg-brand-500 hover:bg-brand-600 text-white font-bold px-5 py-2 rounded-xl text-sm transition">+ Create service</a>` : ''}
              </div>`
            : `<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">${services.map(s => serviceCard(s)).join('')}</div>`}
        </div>

        <!-- ABOUT -->
        <div id="pane-about" class="hidden">
          <div class="bg-white border border-ink-100 rounded-2xl p-6 space-y-5">
            <div>
              <h3 class="font-extrabold text-ink-900 mb-2 flex items-center gap-2">
                <i data-lucide="user" class="w-4 h-4 text-brand-500"></i>About me
              </h3>
              <p class="text-sm text-ink-600 leading-relaxed">${escapeHtml(u.bio || 'No bio yet.')}</p>
            </div>
            ${u.skills && u.skills.length ? `
            <div>
              <h3 class="font-extrabold text-ink-900 mb-2 flex items-center gap-2">
                <i data-lucide="zap" class="w-4 h-4 text-brand-500"></i>Skills
              </h3>
              <div class="flex flex-wrap gap-2">
                ${u.skills.map(s => `<span class="chip bg-brand-50 text-brand-700 text-xs">${escapeHtml(s)}</span>`).join('')}
              </div>
            </div>` : ''}
          </div>
        </div>

        <!-- REVIEWS -->
        <div id="pane-reviews" class="hidden">
          ${allReviews.length === 0
            ? `<div class="bg-white border border-ink-100 rounded-2xl p-10 text-center text-ink-500">
                <i data-lucide="star" class="w-10 h-10 mx-auto mb-3 text-ink-300"></i>
                <div class="font-semibold">No reviews yet.</div>
              </div>`
            : `<div class="space-y-4">${allReviews.slice(0, 12).map(r => {
                const ru = getUser(r.userId);
                return `
                <div class="bg-white border border-ink-100 rounded-2xl p-5">
                  <div class="flex items-start gap-3 mb-3">
                    <div class="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-ink-100">
                      ${ru ? `<img src="${ru.avatar}" class="w-9 h-9 rounded-lg"/>` : '<div class="w-9 h-9 rounded-lg bg-ink-200 grid place-items-center font-bold">?</div>'}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-semibold text-sm text-ink-900">${ru ? escapeHtml(ru.name) : 'User'}</span>
                        <span class="text-xs text-ink-400">${timeAgo(r.ts)}</span>
                      </div>
                      <div class="text-xs text-ink-400 truncate">${escapeHtml(r.serviceTitle || '')}</div>
                    </div>
                    <div class="shrink-0">${stars(r.stars, 'w-3.5 h-3.5')}</div>
                  </div>
                  <p class="text-sm text-ink-600 leading-relaxed">${escapeHtml(r.text || '')}</p>
                </div>`;
              }).join('')}</div>`}
        </div>

        <!-- PORTFOLIO -->
        ${u.portfolio && u.portfolio.length ? `
        <div id="pane-portfolio" class="hidden">
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            ${u.portfolio.map(p => `
              <div class="bg-white border border-ink-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                <div class="h-32 overflow-hidden">
                  <img src="${p.thumb}" alt="${escapeHtml(p.title)}" class="w-full h-full object-cover"/>
                </div>
                <div class="p-3">
                  <div class="text-sm font-semibold text-ink-900 line-clamp-1">${escapeHtml(p.title)}</div>
                </div>
              </div>`).join('')}
          </div>
        </div>` : ''}

      </div><!-- /MAIN -->

      <!-- SIDEBAR — limpa, só skills e about -->
      <aside class="w-full lg:w-72 shrink-0 space-y-4">
        <div class="bg-white border border-ink-100 rounded-2xl p-5">
          <h3 class="font-extrabold text-ink-900 mb-4 flex items-center gap-2">
            <i data-lucide="user" class="w-4 h-4 text-brand-500"></i>About
          </h3>
          <div class="space-y-3 text-sm">
            ${co ? `<div class="flex items-center gap-2 text-ink-600"><span>${co.flag}</span><span>${co.name}</span></div>` : ''}
            <div class="flex items-center gap-2 text-ink-600">
              <i data-lucide="calendar" class="w-4 h-4 text-ink-400"></i>
              <span>Member since ${new Date(u.joinedTs).getFullYear()}</span>
            </div>
            ${u.responseHours ? `<div class="flex items-center gap-2 text-ink-600">
              <i data-lucide="clock" class="w-4 h-4 text-ink-400"></i>
              <span>Responds in ~${u.responseHours}h</span>
            </div>` : ''}
          </div>
        </div>

        ${u.skills && u.skills.length ? `
        <div class="bg-white border border-ink-100 rounded-2xl p-5">
          <h3 class="font-extrabold text-ink-900 mb-3 flex items-center gap-2">
            <i data-lucide="zap" class="w-4 h-4 text-brand-500"></i>Skills
          </h3>
          <div class="flex flex-wrap gap-2">
            ${u.skills.map(s => `<span class="chip bg-brand-50 text-brand-700 text-xs">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>` : ''}
      </aside>
    </div>
  </div>`;
};

/* ─────────────────────────────────────────────────────────
   2. OVERRIDE: changeProfileAvatar — atualiza TODAS as imgs corretas
   ───────────────────────────────────────────────────────── */
window.changeProfileAvatar = function(userId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Select an image', 'warn'); return; }
    if (file.size > 3 * 1024 * 1024) { toast('Max 3MB', 'warn'); return; }
    const reader = new FileReader();
    reader.onload = function(ev) {
      const src = ev.target.result;
      const u = DB.users.find(x => x.id === userId);
      if (u) {
        u.avatar = src;
        u.avatarType = 'upload';
      }
      document.querySelectorAll('.profile-avatar-img').forEach(img => { img.src = src; });
      document.querySelectorAll('[data-profile-avatar]').forEach(img => { img.src = src; });
      if (u) {
        document.querySelectorAll('img').forEach(img => {
          if (img.dataset.userId === userId) img.src = src;
        });
      }
      persistNow();
      renderHeader();
      toast('Profile photo updated!', 'success');
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

/* ─────────────────────────────────────────────────────────
   3. OVERRIDE: viewWallet — oculta dados falsos para não-admin
   ───────────────────────────────────────────────────────── */
window.viewWallet = function() {
  if (!STATE.isAdmin) {
    const me = getUser(STATE.currentUserId);
    return `
    <div class="max-w-2xl mx-auto px-5 py-14 text-center">
      <div class="w-16 h-16 rounded-2xl bg-brand-50 grid place-items-center mx-auto mb-5">
        <i data-lucide="wallet" class="w-8 h-8 text-brand-500"></i>
      </div>
      <h1 class="text-2xl font-extrabold mb-2">ITL Wallet</h1>
      <p class="text-ink-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
        Connect your real wallet via WalletConnect or ITLX to see your balance,
        transactions and withdraw ITL directly.
      </p>

      <div class="bg-white border border-ink-100 rounded-2xl p-6 mb-6 text-left space-y-4">
        <div class="flex items-center gap-3 p-3 rounded-xl bg-ink-50 border border-ink-100">
          <i data-lucide="wallet" class="w-5 h-5 text-brand-500 shrink-0"></i>
          <div>
            <div class="text-xs text-ink-500">Connected wallet</div>
            <div class="font-mono text-sm font-bold text-ink-900">${me && me.wallet ? me.wallet.slice(0,10)+'…'+me.wallet.slice(-6) : 'None'}</div>
          </div>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-xl bg-ink-50 border border-ink-100">
          <i data-lucide="coins" class="w-5 h-5 text-brand-500 shrink-0"></i>
          <div>
            <div class="text-xs text-ink-500">ITL balance (on-chain)</div>
            <div class="font-bold text-ink-500 text-sm italic">Available after real integration with the Interlink Network</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-8">
        <a href="https://explorer.interlinklabs.ai" target="_blank" rel="noopener"
           class="bg-white border border-ink-100 rounded-2xl p-4 text-left hover:border-brand-200 transition">
          <i class="ri-link text-2xl text-brand-500 mb-2 block"></i>
          <div class="font-bold text-sm text-ink-900">Interlink Explorer</div>
          <div class="text-xs text-ink-500 mt-0.5">View on-chain transactions</div>
        </a>
        <a href="#/how"
           class="bg-white border border-ink-100 rounded-2xl p-4 text-left hover:border-brand-200 transition">
          <i class="ri-question-line text-2xl text-brand-500 mb-2 block"></i>
          <div class="font-bold text-sm text-ink-900">How it works?</div>
          <div class="text-xs text-ink-500 mt-0.5">Understand ITL payments</div>
        </a>
      </div>

      <button onclick="openConnectWallet()"
        class="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-xl text-sm flex items-center gap-2 mx-auto shadow-pop">
        <i data-lucide="wallet" class="w-4 h-4"></i>Connect real wallet
      </button>
    </div>`;
  }

  // Admin vê tudo (dados mock para testar)
  const me = getUser(STATE.currentUserId);
  const history = STATE.txHistory || [];
  const payouts = STATE.payouts || [];

  function txLabel(type) {
    return {
      escrow_lock: 'Escrow locked', escrow_release: 'Payment released',
      milestone_release: 'Milestone released', withdrawal: 'ITL Withdrawal',
      deposit: 'Deposit', rating: 'Review', profile_update: 'Profile updated',
      dispute_open: 'Dispute opened', dispute_resolve: 'Dispute resolved',
      order_cancel_refund: 'Refund (cancellation)',
    }[type] || type;
  }
  function txIcon(type) {
    return {
      escrow_lock: 'lock', escrow_release: 'unlock', withdrawal: 'banknote',
      deposit: 'arrow-down-to-line', rating: 'star', profile_update: 'user-cog',
      dispute_open: 'gavel', dispute_resolve: 'shield-check', order_cancel_refund: 'rotate-ccw',
    }[type] || 'arrow-left-right';
  }

  return `
  <div class="max-w-6xl mx-auto px-5 py-10">
    <div class="flex items-end justify-between mb-6 flex-wrap gap-3">
      <div>
        <div class="chip bg-amber-50 text-amber-700 mb-2">🔧 Admin Mode — Test Data</div>
        <h1 class="text-3xl font-extrabold tracking-tight">ITL Wallet</h1>
        <p class="text-ink-500 text-sm">Simulated data for interface testing.</p>
      </div>
      <button onclick="openWithdrawModal()"
        class="bg-brand-500 hover:bg-brand-600 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-pop">
        <i data-lucide="banknote" class="w-4 h-4"></i>Test Withdrawal
      </button>
    </div>

    <div class="grid lg:grid-cols-3 gap-3">
      <div class="lg:col-span-1 space-y-4">
        <div class="rounded-3xl bg-gradient-to-br from-brand-500 to-sonic text-white p-6 shadow-pop">
          <div class="text-xs font-semibold opacity-90 flex items-center gap-2">
            <i data-lucide="wallet" class="w-3.5 h-3.5"></i>${STATE.walletProvider} • Interlink Network
          </div>
          <div class="mt-4 text-4xl font-extrabold text-sonic">${fmtITL(me.balanceITL || 0)}</div>
          <div class="text-xs opacity-90 mt-1">Simulated balance (admin)</div>
          <div class="mt-4 pt-4 border-t border-white/20">
            <div class="text-[10px] uppercase tracking-wider opacity-75 font-bold">Wallet</div>
            <div class="font-mono text-xs break-all mt-1">${me.wallet}</div>
          </div>
        </div>

        <div class="bg-white border border-ink-100 rounded-2xl p-5">
          <div class="font-extrabold flex items-center gap-2 mb-3">
            <i data-lucide="receipt" class="w-5 h-5 text-brand-500"></i>Withdrawals (mock)
          </div>
          ${payouts.length
            ? `<div class="space-y-2">${payouts.slice(0, 5).map(p => `
              <div class="rounded-xl border border-ink-100 p-3">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-bold">${fmtITL(p.amount)}</span>
                  <span class="chip bg-emerald-50 text-emerald-700">Confirmed</span>
                </div>
                <div class="font-mono text-[10px] text-brand-500 mt-1">${shortHash(p.hash)}</div>
              </div>`).join('')}</div>`
            : `<div class="text-sm text-ink-500 border border-dashed border-ink-100 rounded-xl p-3 text-center">No withdrawals.</div>`}
        </div>
      </div>

      <div class="lg:col-span-2 bg-white border border-ink-100 rounded-2xl overflow-hidden">
        <div class="p-5 border-b border-ink-100 flex items-center justify-between">
          <div class="font-extrabold flex items-center gap-2">
            <i data-lucide="history" class="w-5 h-5 text-brand-500"></i>History (mock)
          </div>
          <span class="text-xs text-ink-500">${history.length} records</span>
        </div>
        ${history.length
          ? `<div class="divide-y divide-ink-100">${history.map(tx => `
            <div class="p-3 flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center shrink-0">
                <i data-lucide="${txIcon(tx.type)}" class="w-4 h-4 text-brand-500"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-bold text-sm">${txLabel(tx.type)}</div>
                <div class="text-xs text-ink-500">${timeAgo(tx.ts)} ago</div>
                <div class="font-mono text-[10px] text-brand-500">${shortHash(tx.hash)}</div>
              </div>
              <div class="text-right">
                <div class="font-extrabold text-sm ${tx.type === 'withdrawal' ? 'text-rose-600' : 'text-ink-900'}">
                  ${tx.amount ? (tx.type === 'withdrawal' ? '-' : '') + fmtITL(tx.amount) : '—'}
                </div>
              </div>
            </div>`).join('')}</div>`
          : `<div class="p-10 text-center text-ink-500">No transactions yet.</div>`}
      </div>
    </div>
  </div>`;
};

/* ─────────────────────────────────────────────────────────
   4. OVERRIDE: openChat — fecha menus antes de abrir o chat
   ───────────────────────────────────────────────────────── */
const _origOpenChat = window.openChat;
window.openChat = function(orderId, otherUserId) {
  document.getElementById('profile-dropdown')?.classList.add('hidden');
  document.getElementById('lang-menu')?.classList.add('hidden');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) mobileMenu.classList.add('hidden');
  const mobIcon = document.getElementById('mobMenuIcon');
  if (mobIcon) { mobIcon.classList.add('ri-menu-line'); mobIcon.classList.remove('ri-close-line'); }
  setTimeout(() => _origOpenChat.call(this, orderId, otherUserId), 10);
};

/* ─────────────────────────────────────────────────────────
   5. OVERRIDE: renderChat — corrige re-render e stepper em efêmeros
   ───────────────────────────────────────────────────────── */
window.renderChat = function(order, ephemeral) {
  const other = getUser(order.clientId === STATE.currentUserId ? order.freelancerId : order.clientId);
  if (!other) return;
  const svc = order.serviceId ? getService(order.serviceId) : null;
  const msgs = STATE.messages[order.id] || [];

  const prevStream = document.getElementById('chat-stream');
  const wasAtBottom = prevStream
    ? prevStream.scrollHeight - prevStream.scrollTop - prevStream.clientHeight < 40
    : true;

  const chatRoot = document.getElementById('chat-root');
  if (!chatRoot) return;

  chatRoot.innerHTML = `
  <div class="fixed inset-0 z-40 pointer-events-none">
    <div class="absolute inset-0 bg-ink-900/40 pointer-events-auto" onclick="closeChat()"></div>
    <aside class="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl pointer-events-auto flex flex-col fade-in">

      <div class="p-3 border-b border-ink-100 flex items-center gap-3 shrink-0">
        <img src="${other.avatar}" class="w-10 h-10 rounded-xl object-cover"/>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-sm flex items-center gap-1">
            ${escapeHtml(other.name)}
            ${other.verified ? '<i data-lucide="badge-check" class="w-4 h-4 text-brand-500"></i>' : ''}
          </div>
          <div id="chat-subtitle" class="text-[11px] text-ink-500 truncate">
            ${svc ? escapeHtml(svc.title) : 'Conversation'}
          </div>
        </div>
        <button onclick="closeChat()" aria-label="Close chat"
          class="w-8 h-8 grid place-items-center rounded-lg hover:bg-ink-100/50">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      ${(!ephemeral && svc && order.id && !order.id.startsWith('pre_')) ? `
      <div class="px-4 py-2.5 bg-ink-50/70 border-b border-ink-100 shrink-0">
        <div class="flex items-center justify-between mb-1.5">
          ${statusChip(order.status)}
          <span class="text-[10px] text-ink-400">Order #${order.id.slice(-5)}</span>
        </div>
        ${orderProgressStepper(order, { compact: true })}
      </div>` : ''}

      <div id="chat-stream"
           class="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3 bg-gradient-to-b from-white to-ink-100/30"
           style="overscroll-behavior:contain">
        ${msgs.length
          ? msgs.map(m => chatBubble(m)).join('')
          : `<div class="text-center text-ink-400 text-xs py-10">
               <i data-lucide="message-circle" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
               Start the conversation
             </div>`}
      </div>

      <div id="chat-attach-staging" class="hidden px-3 pt-2 border-t border-ink-100 bg-ink-50/50 shrink-0">
        <div class="flex items-center gap-1 mb-1">
          <i data-lucide="paperclip" class="w-3 h-3 text-ink-500"></i>
          <span class="text-[10px] font-bold text-ink-500 uppercase tracking-wider">Attachments ready</span>
        </div>
        <div id="chat-attach-list" class="flex flex-wrap gap-1.5 pb-2"></div>
      </div>

      <form id="chat-form" class="p-3 border-t border-ink-100 flex items-end gap-2 shrink-0"
            role="form" aria-label="Send message">
        <input type="file" id="chat-file-input" multiple
          accept="image/*,.pdf,.doc,.docx,.zip,.txt,.xls,.xlsx,.ppt,.pptx,.mp4,.mov,.fig"
          class="sr-only" aria-label="Select file"/>

        <button type="button" id="chat-attach-btn" aria-label="Attach file"
          class="w-9 h-9 grid place-items-center rounded-lg hover:bg-brand-50 hover:text-brand-600 text-ink-400 transition shrink-0 self-center">
          <i data-lucide="paperclip" class="w-4 h-4"></i>
        </button>

        <label for="chat-input" class="sr-only">Message</label>
        <textarea id="chat-input" rows="1" autocomplete="off"
          placeholder="Type a message…" aria-label="Type a message"
          class="flex-1 border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 resize-none max-h-28 overflow-y-auto"
          style="min-height:36px;"></textarea>

        <button type="submit" aria-label="Send message"
          class="w-10 h-10 grid place-items-center rounded-xl bg-brand-500 hover:bg-brand-600 text-white shrink-0 self-end transition">
          <i data-lucide="send" class="w-4 h-4"></i>
        </button>
      </form>
    </aside>
  </div>`;

  icons();

  const stream = document.getElementById('chat-stream');
  if (stream && wasAtBottom) {
    requestAnimationFrame(() => { stream.scrollTop = stream.scrollHeight; });
  }

  renderChatStagingArea();

  const attachBtn = document.getElementById('chat-attach-btn');
  const fileInput = document.getElementById('chat-file-input');
  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => handleChatFileSelect(e, order));
  }

  const textarea = document.getElementById('chat-input');
  if (textarea) {
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 112) + 'px';
    });
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('chat-form')?.dispatchEvent(new Event('submit'));
      }
    });
    requestAnimationFrame(() => textarea.focus());
  }

  const form = document.getElementById('chat-form');
  if (form && !form._listenerAdded) {
    form._listenerAdded = true;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const v = (input?.value || '').trim();
      const pending = window._chatPendingAttachments || [];
      if (!v && !pending.length) return;

      const msg = {
        id: uid('m'), from: STATE.currentUserId, text: v || '', ts: nowTs(), status: 'sent'
      };
      if (pending.length) {
        msg.attachments = pending.map(a => ({
          name: a.name, size: a.size, type: a.type, dataURL: a.dataURL || null,
        }));
      }

      STATE.messages[order.id] = STATE.messages[order.id] || [];
      STATE.messages[order.id].push(msg);
      window._chatPendingAttachments = [];
      if (input) input.value = '';
      window.renderChat(order, ephemeral);

      if (SB_READY && sb && STATE.sbProfile?.id && order.sbId) {
        const firstAttach = msg.attachments?.[0];
        const attachmentUrl = firstAttach
          ? (firstAttach.dataURL ? `[image:${firstAttach.name}]` : firstAttach.name)
          : null;
        sbSendMessage(order.sbId, v, attachmentUrl).then(saved => {
          if (saved) {
            msg._sbId = saved.id;
            msg.status = 'delivered';
            if (STATE.chatOpenOrderId === order.id) window.renderChat(order, ephemeral);
          }
        });
        return;
      }

      // Demo mode — simulated replies
      setTimeout(() => {
        if (msg.status === 'sent') msg.status = 'delivered';
        if (STATE.chatOpenOrderId === order.id) window.renderChat(order, ephemeral);
      }, 500);

      setTimeout(() => {
        if (STATE.chatOpenOrderId !== order.id) return;
        const chatSubtitle = document.getElementById('chat-subtitle');
        if (chatSubtitle) chatSubtitle.textContent = 'typing…';
      }, 750);

      setTimeout(() => {
        if (STATE.chatOpenOrderId !== order.id) return;
        const fileReplies = ['Got the files, thanks!', 'Great, already reviewing.'];
        const textReplies = ['Got it!', 'Already on it.', 'Can you send the brief?', "I'll upload a preview today."];
        const pool = msg.attachments?.length ? fileReplies : textReplies;
        msg.status = 'read';
        STATE.messages[order.id].push({
          id: uid('m'), from: other.id,
          text: pool[Math.floor(Math.random() * pool.length)],
          ts: nowTs(), status: 'read'
        });
        if (STATE.chatOpenOrderId === order.id) window.renderChat(order, ephemeral);
      }, 2100);
    });
  }
};

/* ─────────────────────────────────────────────────────────
   6. FIX: pickTrendingTag — versão única e correta
   ───────────────────────────────────────────────────────── */
window.pickTrendingTag = function(tag) {
  STATE.query = tag;
  STATE.category = 'all';
  STATE.trendingActive = false;
  closeSearchDropdown();
  if (STATE.route !== 'home') {
    STATE.route = 'home';
    window.location.hash = '#/home';
  }
  render();
  setTimeout(() => {
    const el = document.getElementById('explore-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);
};

/* ─────────────────────────────────────────────────────────
   7. goToDashboard — navegação confiável
   ───────────────────────────────────────────────────────── */
window.goToDashboard = function(tab) {
  document.getElementById('profile-dropdown')?.classList.add('hidden');
  STATE.dashboardTab = tab || 'client';
  STATE.route = 'dashboard';
  location.hash = '#/dashboard/' + (tab || 'client');
  render();
};

/* ─────────────────────────────────────────────────────────
   8. closeMenusOnOutside — vincula ao document
   ───────────────────────────────────────────────────────── */
document.addEventListener('click', function(e) {
  const dd = document.getElementById('profile-dropdown');
  const wrap = document.getElementById('profile-menu-wrap');
  if (dd && !dd.classList.contains('hidden')) {
    if (!dd.contains(e.target) && wrap && !wrap.contains(e.target)) {
      dd.classList.add('hidden');
    }
  }
  const langMenu = document.getElementById('lang-menu');
  if (langMenu && !langMenu.classList.contains('hidden') && !langMenu.contains(e.target)) {
    langMenu.classList.add('hidden');
  }
  const sortMenu = document.getElementById('sortMenu');
  if (sortMenu && !sortMenu.classList.contains('hidden') && !sortMenu.contains(e.target)) {
    sortMenu.classList.add('hidden');
  }
});

/* ═══════════════════════════════════════════════════════════
   PATCH v2 — Tradução EN + Header com "My orders" comentado
   ═══════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────
   v2.1 statusChip em inglês
   ───────────────────────────────────────────────────────── */
window.statusChip = function(status) {
  const map = {
    awaiting_requirements: ['Awaiting info',    'bg-amber-100 text-amber-800',   'info'],
    in_progress:           ['In progress',       'bg-amber-50 text-amber-700',    'loader-2'],
    awaiting_delivery:     ['In progress',       'bg-violet-50 text-violet-700',  'hourglass'],
    delivered:             ['Delivered',          'bg-blue-50 text-blue-700',      'package'],
    approved:              ['Approved',           'bg-emerald-50 text-emerald-700','check-circle-2'],
    cancelled:             ['Cancelled',          'bg-slate-100 text-slate-700',   'x-circle'],
    disputed:              ['In dispute',         'bg-rose-50 text-rose-700',      'alert-octagon'],
  };
  const [lbl, c, i] = map[status] || ['—', 'bg-ink-100 text-ink-700', 'circle'];
  return `<span class="chip ${c}"><i data-lucide="${i}" class="w-3.5 h-3.5"></i>${lbl}</span>`;
};

/* ─────────────────────────────────────────────────────────
   v2.2 clientActions em inglês
   ───────────────────────────────────────────────────────── */
window.clientActions = function(o) {
  if (o.status === 'cancelled') {
    return `<span class="chip bg-slate-100 text-slate-700"><i data-lucide="x-circle" class="w-3.5 h-3.5"></i>Cancelled</span>`;
  }
  if (o.cancelRequest && o.cancelRequest.by !== o.clientId) {
    return `<button onclick="acceptCancellation('${o.id}','client')" class="chip bg-emerald-500 hover:bg-emerald-600 text-white"><i data-lucide="check" class="w-3.5 h-3.5"></i>Accept cancellation</button>`;
  }
  if (o.cancelRequest) {
    return `<span class="chip bg-orange-50 text-orange-700"><i data-lucide="hourglass" class="w-3.5 h-3.5"></i>Cancellation requested</span>`;
  }
  if (o.status === 'awaiting_requirements') {
    return `<button onclick="openRequirementsModal('${o.id}')" class="chip bg-amber-500 hover:bg-amber-600 text-white"><i data-lucide="clipboard-list" class="w-3.5 h-3.5"></i>Fill in brief</button>
      <button onclick="cancelOrder('${o.id}','client')" class="chip bg-slate-100 hover:bg-slate-200 text-slate-700"><i data-lucide="x" class="w-3.5 h-3.5"></i>Cancel</button>`;
  }
  if (o.status === 'delivered' && !o.rated) {
    return `<button onclick="approveOrder('${o.id}')" class="chip bg-emerald-500 hover:bg-emerald-600 text-white"><i data-lucide="check" class="w-3.5 h-3.5"></i>Approve</button>`;
  }
  if (o.status === 'approved' && !o.rated) {
    return `<button onclick="openRateModal('${o.id}')" class="chip bg-amber-400 hover:bg-amber-500 text-white"><i data-lucide="star" class="w-3.5 h-3.5"></i>Leave a review</button>`;
  }
  if (o.status === 'approved' && o.rated) {
    return `<span class="chip bg-emerald-50 text-emerald-700"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>Completed</span>
      <button onclick="openReceiptModal('${o.id}')" class="chip bg-ink-100/60 hover:bg-ink-100 text-ink-700" title="Download receipt"><i data-lucide="receipt" class="w-3.5 h-3.5"></i>Receipt</button>`;
  }
  if (o.status === 'in_progress' || o.status === 'awaiting_delivery') {
    return `<button onclick="cancelOrder('${o.id}','client')" class="chip bg-slate-100 hover:bg-slate-200 text-slate-700"><i data-lucide="x" class="w-3.5 h-3.5"></i>Request cancellation</button>`;
  }
  return `<span class="chip bg-ink-100/60 text-ink-500"><i data-lucide="clock" class="w-3.5 h-3.5"></i>Waiting</span>`;
};

/* ─────────────────────────────────────────────────────────
   v2.3 freelancerActions em inglês
   ───────────────────────────────────────────────────────── */
window.freelancerActions = function(o) {
  if (o.status === 'cancelled') {
    return `<span class="chip bg-slate-100 text-slate-700"><i data-lucide="x-circle" class="w-3.5 h-3.5"></i>Cancelled</span>`;
  }
  if (o.cancelRequest && o.cancelRequest.by !== o.freelancerId) {
    return `<button onclick="acceptCancellation('${o.id}','freelancer')" class="chip bg-emerald-500 hover:bg-emerald-600 text-white"><i data-lucide="check" class="w-3.5 h-3.5"></i>Accept cancellation</button>`;
  }
  if (o.cancelRequest) {
    return `<span class="chip bg-orange-50 text-orange-700"><i data-lucide="hourglass" class="w-3.5 h-3.5"></i>Cancellation requested</span>`;
  }
  if (o.status === 'awaiting_requirements') {
    return `<span class="chip bg-amber-50 text-amber-700"><i data-lucide="clipboard-list" class="w-3.5 h-3.5"></i>Awaiting brief</span>`;
  }
  if (o.status === 'in_progress' || o.status === 'awaiting_delivery') {
    return `<button onclick="openDeliverModal('${o.id}')" class="chip bg-brand-500 hover:bg-brand-600 text-white"><i data-lucide="upload" class="w-3.5 h-3.5"></i>Deliver</button>
      <button onclick="cancelOrder('${o.id}','freelancer')" class="chip bg-slate-100 hover:bg-slate-200 text-slate-700"><i data-lucide="x" class="w-3.5 h-3.5"></i>Cancel</button>`;
  }
  if (o.status === 'delivered') {
    return `<span class="chip bg-violet-50 text-violet-700">Awaiting approval</span>`;
  }
  if (o.status === 'approved') {
    return `<span class="chip bg-emerald-50 text-emerald-700">Received</span>
      <button onclick="openReceiptModal('${o.id}')" class="chip bg-ink-100/60 hover:bg-ink-100 text-ink-700"><i data-lucide="receipt" class="w-3.5 h-3.5"></i>Receipt</button>`;
  }
  return `<span class="chip bg-emerald-50 text-emerald-700">Received</span>`;
};

/* ─────────────────────────────────────────────────────────
   v2.4 dashClient em inglês
   ───────────────────────────────────────────────────────── */
window.dashClient = function() {
  const orders = STATE.orders.filter(o => o.clientId === STATE.currentUserId);
  const active  = orders.filter(o => !['approved','cancelled'].includes(o.status));
  const done    = orders.filter(o => o.status === 'approved');
  const tab     = STATE.clientOrdersTab === 'done' ? 'done' : 'active';
  const listed  = tab === 'done' ? done : active;

  return `
  <div class="grid grid-cols-2 gap-3 mb-5">
    <div class="bg-white border border-ink-100 rounded-2xl p-3">
      <div class="text-xs text-ink-500 font-semibold mb-1">In progress</div>
      <div class="text-2xl font-extrabold">${active.length}</div>
    </div>
    <div class="bg-white border border-ink-100 rounded-2xl p-3">
      <div class="text-xs text-ink-500 font-semibold mb-1">Completed</div>
      <div class="text-2xl font-extrabold">${done.length}</div>
    </div>
  </div>

  <div class="bg-white border border-ink-100 rounded-2xl overflow-hidden">
    <div class="flex border-b border-ink-100">
      <button onclick="STATE.clientOrdersTab='active';render()"
        class="flex-1 py-3 text-sm font-bold border-b-2 transition
          ${tab==='active'?'border-ink-900 text-ink-900':'border-transparent text-ink-400'}">
        In progress${active.length ? ` (${active.length})` : ''}
      </button>
      <button onclick="STATE.clientOrdersTab='done';render()"
        class="flex-1 py-3 text-sm font-bold border-b-2 transition
          ${tab==='done'?'border-ink-900 text-ink-900':'border-transparent text-ink-400'}">
        Completed${done.length ? ` (${done.length})` : ''}
      </button>
    </div>

    ${listed.length === 0
      ? `<div class="py-14 text-center text-ink-400">
           <div class="text-4xl mb-3">${tab==='done'?'✅':'📦'}</div>
           <div class="font-semibold text-ink-600 mb-1">${tab==='done'?'No completed orders yet':'No active orders'}</div>
           <a href="#/home" class="mt-3 inline-block text-sm font-bold text-brand-500">Explore services →</a>
         </div>`
      : `<div class="divide-y divide-ink-100">${listed.map(o => orderRow(o,'client')).join('')}</div>`}
  </div>`;
};

/* ─────────────────────────────────────────────────────────
   v2.5 dashFreelancer em inglês
   ───────────────────────────────────────────────────────── */
window.dashFreelancer = function() {
  const freelancerId = 'u_ana';
  const u       = getUserSafe(freelancerId);
  const me      = getUserSafe(STATE.currentUserId);
  const mySvc   = DB.services.filter(sv => sv.freelancerId === freelancerId);
  const myOrders= STATE.orders.filter(o => o.freelancerId === freelancerId);
  const pending = myOrders.filter(o => !['approved','cancelled'].includes(o.status));
  const frTab   = STATE._frTab || 'orders';

  return `
  <div class="bg-white border border-ink-100 rounded-2xl p-5 mb-4 flex items-center justify-between gap-3">
    <div>
      <div class="text-xs text-ink-400 font-semibold mb-0.5">Available balance</div>
      <div class="text-2xl font-extrabold text-brand-600">${fmtITL(me.balanceITL||0)}</div>
    </div>
    <button onclick="openWithdrawModal()"
      class="bg-brand-500 hover:bg-brand-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2">
      <i data-lucide="banknote" class="w-4 h-4"></i>Withdraw
    </button>
  </div>

  <div class="grid grid-cols-2 gap-3 mb-4">
    <div class="bg-white border border-ink-100 rounded-2xl p-3">
      <div class="text-xs text-ink-500 font-semibold mb-1">Open orders</div>
      <div class="text-2xl font-extrabold">${pending.length}</div>
    </div>
    <div class="bg-white border border-ink-100 rounded-2xl p-3">
      <div class="text-xs text-ink-500 font-semibold mb-1">Rating</div>
      <div class="text-2xl font-extrabold">${u.rating.toFixed(1)} ★</div>
    </div>
  </div>

  <div class="bg-white border border-ink-100 rounded-2xl overflow-hidden">
    <div class="flex border-b border-ink-100">
      <button onclick="STATE._frTab='orders';render()"
        class="flex-1 py-3 text-sm font-bold border-b-2 transition
          ${frTab==='orders'?'border-ink-900 text-ink-900':'border-transparent text-ink-400'}">
        Orders${pending.length ? ` (${pending.length})` : ''}
      </button>
      <button onclick="STATE._frTab='services';render()"
        class="flex-1 py-3 text-sm font-bold border-b-2 transition
          ${frTab==='services'?'border-ink-900 text-ink-900':'border-transparent text-ink-400'}">
        Services${mySvc.length ? ` (${mySvc.length})` : ''}
      </button>
    </div>

    ${frTab === 'orders' ? (myOrders.length === 0
      ? `<div class="py-14 text-center text-ink-400">
           <div class="text-4xl mb-3">📦</div>
           <div class="font-semibold text-ink-600 mb-1">No orders yet</div>
           <p class="text-sm text-ink-400">When a client hires you, it will appear here.</p>
         </div>`
      : `<div class="divide-y divide-ink-100">${myOrders.map(o => orderRow(o,'freelancer')).join('')}</div>`
    ) : ''}

    ${frTab === 'services' ? `
      <div class="p-3 flex items-center justify-between border-b border-ink-100">
        <span class="text-sm font-semibold text-ink-600">${mySvc.length} service${mySvc.length!==1?'s':''}</span>
        <button onclick="openNewServiceModal()"
          class="text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl">
          + New service
        </button>
      </div>
      <div class="divide-y divide-ink-100">
        ${mySvc.length === 0
          ? `<div class="py-12 text-center text-ink-400">
               <div class="text-4xl mb-3">🛠</div>
               <div class="font-semibold text-ink-600 mb-1">No services published yet</div>
               <button onclick="openNewServiceModal()" class="mt-2 text-sm font-bold text-brand-500">+ Create your first</button>
             </div>`
          : mySvc.map(sv => `
            <div class="flex items-center gap-3 p-3">
              <img src="${sv.thumb}" class="w-14 h-14 rounded-xl object-cover shrink-0"/>
              <div class="flex-1 min-w-0">
                <a href="#/service/${sv.id}" class="text-sm font-bold text-ink-900 line-clamp-2 hover:text-brand-600">${escapeHtml(sv.title)}</a>
                <div class="flex items-center gap-2 mt-1">
                  ${stars(sv.rating,'w-3 h-3')}
                  <span class="text-xs text-ink-500">${sv.rating.toFixed(1)} · ${fmtITL(sv.price)}</span>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button onclick="openEditServiceModal('${sv.id}')" class="w-9 h-9 grid place-items-center rounded-xl hover:bg-ink-100 text-ink-400">
                  <i data-lucide="pencil" class="w-4 h-4"></i>
                </button>
                <button onclick="deleteService('${sv.id}')" class="w-9 h-9 grid place-items-center rounded-xl hover:bg-rose-50 text-ink-300 hover:text-rose-500">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>`).join('')}
      </div>` : ''}
  </div>`;
};

/* ─────────────────────────────────────────────────────────
   v2.6 openEditProfileModal em inglês
   ───────────────────────────────────────────────────────── */
window.openEditProfileModal = function() {
  const u = DB.users.find(x => x.id === STATE.currentUserId);
  if (!u) { toast('User not found', 'warn'); return; }

  const langOpts = LANGUAGES_LIST.map(l =>
    `<option value="${l.id}" ${(u.languages||[]).includes(l.id)?'selected':''}>${l.flag} ${l.label}</option>`
  ).join('');

  $('#modal-root').innerHTML = `
  <div class="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm flex items-center justify-center p-3 fade-in"
       onclick="if(event.target===this)closeModal()">
    <div class="bg-white w-full max-w-md rounded-2xl shadow-pop flex flex-col overflow-hidden"
         style="max-height:min(88vh,640px)">

      <div class="px-4 py-3 border-b border-ink-100 flex items-center justify-between shrink-0">
        <span class="font-extrabold text-sm flex items-center gap-2">
          <i data-lucide="pencil" class="w-4 h-4 text-brand-500"></i>Edit profile
        </span>
        <button onclick="closeModal()" class="w-7 h-7 grid place-items-center rounded-lg hover:bg-ink-100/50">
          <i data-lucide="x" class="w-4 h-4 text-ink-400"></i>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div class="flex items-center gap-3">
          <div class="relative shrink-0 cursor-pointer"
               onclick="closeModal();changeProfileAvatar('${u.id}')" title="Change photo">
            <div class="w-14 h-14 rounded-xl overflow-hidden border border-ink-100">
              <img src="${u.avatar}" class="w-full h-full object-cover profile-avatar-img"/>
            </div>
            <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-500 rounded-full grid place-items-center shadow">
              <i data-lucide="camera" class="w-3 h-3 text-white"></i>
            </div>
          </div>
          <div class="text-xs text-ink-500 min-w-0">
            <div class="font-mono truncate">@${escapeHtml(u.handle)}</div>
            <div class="font-mono truncate mt-0.5">${(u.wallet||'').slice(0,8)}…${(u.wallet||'').slice(-4)}</div>
            <div class="text-[10px] text-ink-400 mt-0.5">Handle and wallet cannot be edited.</div>
          </div>
        </div>

        <div>
          <label class="text-xs font-bold text-ink-600">Display name</label>
          <input id="ep-name" value="${escapeHtml(u.name)}"
            class="mt-1 w-full border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300"/>
        </div>

        <div>
          <label class="text-xs font-bold text-ink-600">Bio</label>
          <textarea id="ep-bio" rows="2"
            class="mt-1 w-full border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 resize-none">${escapeHtml(u.bio||'')}</textarea>
        </div>

        <div>
          <label class="text-xs font-bold text-ink-600">Skills <span class="font-normal text-ink-400">(comma separated)</span></label>
          <input id="ep-skills" value="${(u.skills||[]).map(escapeHtml).join(', ')}"
            class="mt-1 w-full border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300"
            placeholder="React, Solidity, Figma"/>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs font-bold text-ink-600">Country</label>
            <select id="ep-country"
              class="mt-1 w-full border border-ink-100 rounded-xl px-2 py-2 text-sm outline-none focus:border-brand-300">
              ${COUNTRIES.map(c =>
                `<option value="${c.id}" ${u.country===c.id?'selected':''}>${c.flag} ${c.name}</option>`
              ).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs font-bold text-ink-600">Response time (h)</label>
            <input id="ep-resp" type="number" min="1" max="48" value="${u.responseHours||4}"
              class="mt-1 w-full border border-ink-100 rounded-xl px-2 py-2 text-sm outline-none focus:border-brand-300"/>
          </div>
        </div>

        <div>
          <label class="text-xs font-bold text-ink-600">Languages <span class="font-normal text-ink-400">(Ctrl+click for multiple)</span></label>
          <select id="ep-langs" multiple size="3"
            class="mt-1 w-full border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300">
            ${langOpts}
          </select>
        </div>
      </div>

      <div class="px-4 py-3 border-t border-ink-100 flex gap-2 shrink-0">
        <button onclick="closeModal()"
          class="flex-1 border border-ink-100 hover:bg-ink-50 font-semibold py-2 rounded-xl text-sm">
          Cancel
        </button>
        <button onclick="saveProfile()"
          class="flex-[2] bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-2">
          <i data-lucide="check" class="w-4 h-4"></i>Save changes
        </button>
      </div>
    </div>
  </div>`;
  icons();
};

/* ─────────────────────────────────────────────────────────
   v2.7 QR CODE VÁLIDO no modal de pagamento
   ───────────────────────────────────────────────────────── */
(function patchQRCode() {
  const _orig = window.confirmHire;
  window.confirmHire = function(serviceId, tierKey) {
    const briefEl = document.getElementById('hire-brief');
    const brief = briefEl ? briefEl.value.trim() : '';
    const s = getService(serviceId);
    const tier = { priceITL: s.price, days: s.deadline||s.days||7, revisions: 2, includes: s.includes||[] };
    const me = getUser(STATE.currentUserId);
    const total = +(tier.priceITL * 1.02).toFixed(2);

    if (me.balanceITL < total) { toast('Insufficient balance.', 'error'); return; }

    const msToggle = document.getElementById('hire-milestones-toggle');
    const useMilestones = msToggle && msToggle.checked;
    let milestonesConfig = null;
    if (useMilestones) {
      const preset = MILESTONE_PRESETS[window._hireMilestonePreset || 0];
      milestonesConfig = preset.pcts.map((pct, i) => ({
        id: uid('ms'), name: preset.names[i], pct,
        amountITL: +((tier.priceITL * pct / 100)).toFixed(2),
        status: i === 0 ? 'pending' : 'locked',
        releaseTx: null, releasedAt: null,
      }));
    }

    const hash = txHash();
    const qrPayload = `INTERWORK PAYMENT\nAmount: ${total} ITL\nRef: ${hash.slice(0,16)}\nTo: InterWork Escrow`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&qzone=2&ecc=M&data=${encodeURIComponent(qrPayload)}`;

    $('#modal-root').innerHTML = `
    <div class="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm grid place-items-center p-3 fade-in">
      <div id="tx-card" class="bg-white w-full max-w-sm rounded-2xl shadow-pop overflow-hidden">

        <div class="px-5 py-4 border-b border-ink-100 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-brand-50 grid place-items-center shrink-0">
            <i data-lucide="qr-code" class="w-5 h-5 text-brand-500"></i>
          </div>
          <div>
            <div class="font-extrabold text-sm">Payment approval</div>
            <div class="text-xs text-ink-500">Scan with your wallet to confirm</div>
          </div>
        </div>

        <div class="px-4 py-4 space-y-3">
          <div class="flex items-center gap-4">
            <div class="w-[120px] h-[120px] shrink-0 rounded-xl border border-ink-100 overflow-hidden bg-white p-1.5 shadow-sm">
              <img src="${qrUrl}" class="w-full h-full object-contain" alt="Payment QR Code"/>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[11px] text-ink-400 mb-1">Total in escrow</div>
              <div class="font-extrabold text-xl text-brand-700 leading-tight">${fmtITL(total)}</div>
              <div class="text-xs font-bold text-brand-500 mb-2">ITL</div>
              <div class="text-[10px] text-ink-400 leading-snug">Scan with ITLX, MetaMask or WalletConnect</div>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-1 text-center text-[10px]">
            ${['Open wallet','Scan QR','Approve tx','Confirm below'].map((step, i) => `
            <div class="flex flex-col items-center gap-1 ${i===3?'bg-amber-50':'bg-brand-50'} rounded-lg px-1 py-2">
              <div class="w-5 h-5 rounded-full ${i===3?'bg-amber-400':'bg-brand-500'} text-white grid place-items-center font-bold text-[9px]">${i+1}</div>
              <span class="${i===3?'text-amber-700':'text-ink-600'} leading-tight">${step}</span>
            </div>`).join('')}
          </div>

          <div class="rounded-xl bg-ink-50 border border-ink-100 px-3 py-2 text-[10px] text-ink-500 font-mono break-all">
            Ref: ${hash.slice(0,20)}…
          </div>

          <div class="flex items-center gap-1.5 text-[10px] text-ink-400 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
            <i data-lucide="info" class="w-3 h-3 shrink-0"></i>
            <span>Demo — transaction simulated locally.</span>
          </div>

          <div class="flex gap-2 pt-1">
            <button onclick="closeModal()"
              class="flex-1 border border-ink-100 hover:bg-ink-50 font-semibold py-2.5 rounded-xl text-xs text-ink-500">
              Cancel
            </button>
            <button id="qr-confirm-btn"
              onclick="qrConfirmPayment(${JSON.stringify(serviceId)},${JSON.stringify(tierKey||STATE.selectedTier)},${JSON.stringify(brief)},${JSON.stringify(total)},${JSON.stringify(hash)},${JSON.stringify(tier)},${JSON.stringify(milestonesConfig)})"
              class="flex-[2] bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition">
              <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>Confirm ${fmtITL(total)}
            </button>
          </div>
        </div>
      </div>
    </div>`;
    icons();
  };
})();

/* ─────────────────────────────────────────────────────────
   v2.8 HEADER COMPLETO — "My orders" COMENTADO no menu
   ───────────────────────────────────────────────────────── */
(function patchHeaderFinal() {
  window.renderHeader = function() {
    const me = getUser(STATE.currentUserId);
    const authed = isAuthed();
    const langObj = LANGUAGES_LIST.find(l => l.id === STATE.language) || LANGUAGES_LIST[0];

    document.getElementById('app-header').innerHTML = `
    <header class="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">

        <!-- Logo -->
        <a href="#/home" class="flex items-center gap-2 shrink-0">
          <span class="w-7 h-7 rounded-lg bg-[#8b7cff] grid place-items-center text-white shrink-0">
            <i class="ri-briefcase-4-fill text-sm"></i>
          </span>
          <span class="font-extrabold text-slate-900 tracking-tight hidden sm:inline">InterWork</span>
        </a>

        <!-- Desktop nav -->
        <nav class="hidden xl:flex items-center gap-6 text-sm font-medium text-slate-600 flex-1 justify-center">
          <a href="#/earn" class="hover:text-slate-900 transition whitespace-nowrap ${STATE.route==='earn'?'text-brand-600 font-bold':''}">Earn ITL</a>
          <a href="#/how" class="hover:text-slate-900 transition whitespace-nowrap">How It Works</a>
          <a href="#/community" class="hover:text-slate-900 transition whitespace-nowrap ${STATE.route==='community'?'text-brand-600 font-bold':''}">Community</a>
          <a href="#/why-join" class="hover:text-slate-900 transition whitespace-nowrap ${STATE.route==='why-join'?'text-brand-600 font-bold':''}">Why Join</a>
        </nav>

        <!-- Right actions -->
        <div class="flex items-center gap-2 shrink-0">

          <!-- Language — desktop only -->
          <button onclick="toggleLangMenu(event)"
            class="hidden xl:flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
            <span class="text-base">${langObj.flag}</span>
            <span class="text-xs">${langObj.id.toUpperCase()}</span>
            <i class="ri-arrow-down-s-line opacity-50 text-xs"></i>
          </button>

          ${authed ? `
            <!-- Avatar -->
            <div class="relative shrink-0" id="profile-menu-wrap">
              <button onclick="toggleProfileMenu(event)"
                class="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-slate-200 hover:border-[#8b7cff] transition focus:outline-none"
                aria-label="Profile menu">
                ${me?.avatar && me.avatarType !== 'initials'
                  ? `<img src="${me.avatar}" class="w-full h-full object-cover profile-avatar-img"/>`
                  : `<div class="w-full h-full bg-[#efeaff] text-[#5b4ee0] font-bold flex items-center justify-center text-sm">${(me?.name||'U')[0].toUpperCase()}</div>`}
              </button>
              ${unreadCount() ? `
              <span class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] text-white font-bold pointer-events-none">
                ${unreadCount() > 9 ? '9+' : unreadCount()}
              </span>` : ''}
            </div>

            <!-- Profile dropdown -->
            <div id="profile-dropdown"
              class="hidden absolute right-4 top-14 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-[60] overflow-hidden">

              <!-- User info -->
              <div class="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <div class="w-9 h-9 rounded-full overflow-hidden border border-slate-200 shrink-0">
                  ${me?.avatar && me.avatarType !== 'initials'
                    ? `<img src="${me.avatar}" class="w-full h-full object-cover profile-avatar-img"/>`
                    : `<div class="w-full h-full bg-[#efeaff] text-[#5b4ee0] font-bold flex items-center justify-center text-sm">${(me?.name||'U')[0].toUpperCase()}</div>`}
                </div>
                <div class="min-w-0">
                  <div class="font-bold text-sm text-slate-900 truncate">${escapeHtml(me?.name||'User')}</div>
                  <div class="text-xs text-slate-400 truncate">@${escapeHtml(me?.handle||'')}</div>
                </div>
              </div>

              <!-- Menu items -->
              <div class="py-1.5">

                <!-- View profile -->
                <a href="#/u/${me?.handle||''}" onclick="closeProfileMenu()"
                  class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition">
                  <div class="w-7 h-7 rounded-lg bg-slate-100 grid place-items-center shrink-0">
                    <i class="ri-user-line text-slate-500 text-sm"></i>
                  </div>
                  <span class="font-medium">View profile</span>
                </a>

                <!-- MY ORDERS — hidden for now
                <button onclick="closeProfileMenu();goToDashboard('client')"
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition text-left">
                  <div class="w-7 h-7 rounded-lg bg-slate-100 grid place-items-center shrink-0">
                    <i class="ri-briefcase-line text-slate-500 text-sm"></i>
                  </div>
                  <span class="font-medium">My orders</span>
                </button>
                -->

                <!-- Notifications -->
                <button onclick="closeProfileMenu();go('#/notifications')"
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition text-left">
                  <div class="w-7 h-7 rounded-lg bg-slate-100 grid place-items-center shrink-0 relative">
                    <i class="ri-notification-3-line text-slate-500 text-sm"></i>
                    ${unreadCount() ? `<span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full text-[8px] text-white font-bold grid place-items-center">${unreadCount()}</span>` : ''}
                  </div>
                  <div class="flex-1 flex items-center justify-between">
                    <span class="font-medium">Notifications</span>
                    ${unreadCount() ? `<span class="text-xs font-bold text-rose-500">${unreadCount()} new</span>` : ''}
                  </div>
                </button>

                <!-- Change photo -->
                <button onclick="closeProfileMenu();changeProfileAvatar('${me?.id||STATE.currentUserId}')"
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition text-left">
                  <div class="w-7 h-7 rounded-lg bg-slate-100 grid place-items-center shrink-0">
                    <i class="ri-camera-line text-slate-500 text-sm"></i>
                  </div>
                  <span class="font-medium">Change photo</span>
                </button>

              </div>

              <!-- Disconnect -->
              <div class="border-t border-slate-100 py-1.5">
                <button onclick="closeProfileMenu();disconnectWallet()"
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition text-left">
                  <div class="w-7 h-7 rounded-lg bg-rose-50 grid place-items-center shrink-0">
                    <i class="ri-logout-box-r-line text-rose-500 text-sm"></i>
                  </div>
                  <span class="font-medium">Disconnect wallet</span>
                </button>
              </div>
            </div>
          ` : `
            <button onclick="openConnectWallet()"
              class="btn-primary-alt flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs sm:text-sm shadow-sm">
              <i class="ri-wallet-line text-sm"></i>
              <span class="hidden sm:inline">Connect Wallet</span>
            </button>
          `}

          <!-- Hamburger — mobile/tablet only -->
          <button onclick="toggleMobileMenu()" class="xl:hidden text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition" aria-label="Menu">
            <i id="mobMenuIcon" class="ri-menu-line text-lg"></i>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <div id="mobileMenu" class="hidden xl:hidden border-t border-slate-100 bg-white">
        <nav class="px-4 py-3 flex flex-col gap-1 text-sm font-medium text-slate-700">
          <a href="#/earn" onclick="toggleMobileMenu()"
            class="py-2.5 px-3 rounded-lg hover:bg-slate-50 ${STATE.route==='earn'?'bg-slate-50 text-brand-600 font-bold':''}">
            Earn ITL
          </a>
          <a href="#/how" onclick="toggleMobileMenu()" class="py-2.5 px-3 rounded-lg hover:bg-slate-50">
            How It Works
          </a>
          <a href="#/community" onclick="toggleMobileMenu()"
            class="py-2.5 px-3 rounded-lg hover:bg-slate-50 ${STATE.route==='community'?'bg-slate-50 text-brand-600 font-bold':''}">
            Community Rewards
          </a>
          <a href="#/why-join" onclick="toggleMobileMenu()"
            class="py-2.5 px-3 rounded-lg hover:bg-slate-50 ${STATE.route==='why-join'?'bg-slate-50 text-brand-600 font-bold':''}">
            Why Join
          </a>

          <!-- MY ORDERS — hidden for now
          <a href="#/dashboard/client" onclick="toggleMobileMenu()"
            class="py-2.5 px-3 rounded-lg hover:bg-slate-50">
            My orders
          </a>
          -->

          <div class="border-t border-slate-100 mt-1 pt-2">
            <button onclick="toggleLangMenu(event)" class="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-50 flex items-center justify-between">
              <span>Language</span>
              <span class="text-lg">${langObj.flag}</span>
            </button>
          </div>
        </nav>
      </div>

      <!-- Lang menu -->
      <div id="lang-menu" class="hidden absolute right-4 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-[60]">
        ${LANGUAGES_LIST.map(l => `
          <button onclick="setLang('${l.id}')"
            class="w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3
              ${STATE.language===l.id?'bg-slate-50 text-[#5b4ee0] font-bold':'hover:bg-slate-50 text-slate-700'}">
            <span class="text-lg">${l.flag}</span>
            <span class="flex-1">${l.label}</span>
            ${STATE.language===l.id?'<i class="ri-check-line"></i>':''}
          </button>`).join('')}
      </div>
    </header>`;

    icons();
  };
})();

console.log('[InterWork Fixes v3] ✅ All patches loaded — EN translations + My orders hidden.');
console.log('[InterWork Fixes v3] ✅ All patches loaded — EN translations + My orders hidden.');
