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
          ${u.verified ? `<span class="chip bg-emerald-50 text-emerald-700 text-xs"><i data-lucide="badge-check" class="w-3.5 h-3.5"></i>Verificado</span>` : ''}
          ${lvl ? levelChip(lvl) : ''}
        </div>
        <div class="text-sm text-ink-500 mb-2">@${escapeHtml(u.handle)}</div>
        <div class="flex flex-wrap items-center gap-3 text-sm text-ink-500">
          ${co ? `<span class="flex items-center gap-1"><span>${co.flag}</span>${co.name}</span>` : ''}
          <span class="flex items-center gap-1">
            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
            Membro desde ${new Date(u.joinedTs).getFullYear()}
          </span>
          ${u.online ? `<span class="flex items-center gap-1 text-emerald-600 font-medium">
            <i data-lucide="circle" class="w-2.5 h-2.5 fill-emerald-400 text-emerald-400"></i>Online agora
          </span>` : ''}
        </div>
      </div>

      <!-- CTA -->
      <div class="flex gap-2 shrink-0 sm:pb-1">
        ${isMe
          ? `<button onclick="openEditProfileModal()"
               class="btn-outline rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2">
               <i data-lucide="pencil" class="w-4 h-4"></i>Editar perfil
             </button>`
          : `<button onclick="openChat(null,'${u.id}')"
               class="bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-sm transition">
               <i data-lucide="message-circle" class="w-4 h-4"></i>Conversar
             </button>`}
      </div>
    </div>

    <!-- STATS STRIP -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="bg-white border border-ink-100 rounded-2xl p-3 text-center shadow-sm">
        <div class="text-2xl font-extrabold text-ink-900">${avgRating}</div>
        <div class="flex justify-center mt-1">${stars(parseFloat(avgRating), 'w-3.5 h-3.5')}</div>
        <div class="text-xs text-ink-500 mt-1">${allReviews.length} avaliações</div>
      </div>
      <div class="bg-white border border-ink-100 rounded-2xl p-3 text-center shadow-sm">
        <div class="text-2xl font-extrabold text-ink-900">${ordersDone}</div>
        <div class="text-xs text-ink-500 mt-1">Pedidos concluídos</div>
      </div>
      <div class="bg-white border border-ink-100 rounded-2xl p-3 text-center shadow-sm">
        <div class="text-2xl font-extrabold text-ink-900">${u.approvalPct || 99}%</div>
        <div class="text-xs text-ink-500 mt-1">Taxa de aprovação</div>
      </div>
      <div class="bg-white border border-ink-100 rounded-2xl p-3 text-center shadow-sm">
        <div class="text-2xl font-extrabold text-ink-900">${u.repeatClientsPct || 0}%</div>
        <div class="text-xs text-ink-500 mt-1">Clientes recorrentes</div>
      </div>
    </div>

    <!-- TABS -->
    <div class="flex gap-3 border-b border-ink-100 mb-6" id="profile-tabs">
      <button class="tab tab-active pb-2" onclick="showProfileTab('gigs',this)">Serviços (${services.length})</button>
      <button class="tab pb-2" onclick="showProfileTab('about',this)">Sobre</button>
      <button class="tab pb-2" onclick="showProfileTab('reviews',this)">Avaliações (${allReviews.length})</button>
      ${u.portfolio && u.portfolio.length
        ? `<button class="tab pb-2" onclick="showProfileTab('portfolio',this)">Portfólio (${u.portfolio.length})</button>`
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
                <div class="font-semibold mb-1">Nenhum serviço publicado ainda.</div>
                ${isMe ? `<a href="#/new-service" class="mt-3 inline-block bg-brand-500 hover:bg-brand-600 text-white font-bold px-5 py-2 rounded-xl text-sm transition">+ Criar serviço</a>` : ''}
              </div>`
            : `<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">${services.map(s => serviceCard(s)).join('')}</div>`}
        </div>

        <!-- ABOUT -->
        <div id="pane-about" class="hidden">
          <div class="bg-white border border-ink-100 rounded-2xl p-6 space-y-5">
            <div>
              <h3 class="font-extrabold text-ink-900 mb-2 flex items-center gap-2">
                <i data-lucide="user" class="w-4 h-4 text-brand-500"></i>Sobre mim
              </h3>
              <p class="text-sm text-ink-600 leading-relaxed">${escapeHtml(u.bio || 'Sem bio ainda.')}</p>
            </div>
            ${u.skills && u.skills.length ? `
            <div>
              <h3 class="font-extrabold text-ink-900 mb-2 flex items-center gap-2">
                <i data-lucide="zap" class="w-4 h-4 text-brand-500"></i>Habilidades
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
                <div class="font-semibold">Sem avaliações ainda.</div>
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
                        <span class="font-semibold text-sm text-ink-900">${ru ? escapeHtml(ru.name) : 'Usuário'}</span>
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

      <!-- SIDEBAR -->
      <aside class="w-full lg:w-72 shrink-0 space-y-4">
        <div class="bg-white border border-ink-100 rounded-2xl p-5">
          <h3 class="font-extrabold text-ink-900 mb-4 flex items-center gap-2">
            <i data-lucide="user" class="w-4 h-4 text-brand-500"></i>Sobre
          </h3>
          <div class="space-y-3 text-sm">
            ${co ? `<div class="flex items-center gap-2 text-ink-600"><span>${co.flag}</span><span>${co.name}</span></div>` : ''}
            <div class="flex items-center gap-2 text-ink-600">
              <i data-lucide="calendar" class="w-4 h-4 text-ink-400"></i>
              <span>Membro desde ${new Date(u.joinedTs).getFullYear()}</span>
            </div>
            ${u.online ? `<div class="flex items-center gap-2 text-emerald-600 font-medium">
              <i data-lucide="wifi" class="w-4 h-4"></i><span>Online agora</span>
            </div>` : ''}
          </div>
        </div>

        ${u.skills && u.skills.length ? `
        <div class="bg-white border border-ink-100 rounded-2xl p-5">
          <h3 class="font-extrabold text-ink-900 mb-3 flex items-center gap-2">
            <i data-lucide="zap" class="w-4 h-4 text-brand-500"></i>Habilidades
          </h3>
          <div class="flex flex-wrap gap-2">
            ${u.skills.map(s => `<span class="chip bg-brand-50 text-brand-700 text-xs">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>` : ''}

        ${sbtCard(u)}

        <div class="bg-white border border-ink-100 rounded-2xl p-5">
          <h3 class="font-extrabold text-ink-900 mb-3 flex items-center gap-2">
            <i data-lucide="shield-check" class="w-4 h-4 text-brand-500"></i>Confiança
          </h3>
          <ul class="space-y-1.5 text-sm text-ink-600">
            <li class="flex items-center gap-1.5">
              <i data-lucide="${u.verified ? 'check' : 'x'}" class="w-3 h-3 ${u.verified ? 'text-emerald-600' : 'text-ink-300'}"></i>
              Identidade verificada
            </li>
            <li class="flex items-center gap-1.5">
              <i data-lucide="check" class="w-3 h-3 text-emerald-600"></i>Escrow on-chain
            </li>
            <li class="flex items-center gap-1.5">
              <i data-lucide="check" class="w-3 h-3 text-emerald-600"></i>Reputação on-chain (${u.jobs} jobs)
            </li>
          </ul>
        </div>
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
    if (!file.type.startsWith('image/')) { toast('Selecione uma imagem', 'warn'); return; }
    if (file.size > 3 * 1024 * 1024) { toast('Máximo 3MB', 'warn'); return; }
    const reader = new FileReader();
    reader.onload = function(ev) {
      const src = ev.target.result;
      const u = DB.users.find(x => x.id === userId);
      if (u) {
        u.avatar = src;
        u.avatarType = 'upload';
      }
      // Atualiza TODAS as imgs de avatar na tela (perfil + header)
      document.querySelectorAll('.profile-avatar-img').forEach(img => { img.src = src; });
      // Header avatar (dentro do botão do menu de perfil)
      document.querySelectorAll('[data-profile-avatar]').forEach(img => { img.src = src; });
      // Qualquer <img> cujo src seja o avatar antigo
      if (u) {
        document.querySelectorAll('img').forEach(img => {
          if (img.dataset.userId === userId) img.src = src;
        });
      }
      persistNow();
      renderHeader();
      toast('Foto de perfil atualizada!', 'success');
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

/* ─────────────────────────────────────────────────────────
   3. OVERRIDE: openEditProfileModal — modal compacto e responsivo
   ───────────────────────────────────────────────────────── */
window.openEditProfileModal = function() {
  const u = DB.users.find(x => x.id === STATE.currentUserId);
  if (!u) { toast('Usuário não encontrado', 'warn'); return; }

  const langOpts = LANGUAGES_LIST.map(l =>
    `<option value="${l.id}" ${(u.languages || []).includes(l.id) ? 'selected' : ''}>${l.flag} ${l.label}</option>`
  ).join('');

  $('#modal-root').innerHTML = `
  <div class="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm flex items-center justify-center p-3 fade-in"
       onclick="if(event.target===this)closeModal()">
    <div class="bg-white w-full max-w-lg rounded-2xl shadow-pop flex flex-col"
         style="max-height:min(90vh,700px)">

      <!-- Header fixo -->
      <div class="px-5 py-4 border-b border-ink-100 flex items-center justify-between shrink-0">
        <div class="font-extrabold flex items-center gap-2">
          <i data-lucide="pencil" class="w-5 h-5 text-brand-500"></i>Editar perfil
        </div>
        <button onclick="closeModal()" aria-label="Fechar"
          class="w-8 h-8 grid place-items-center rounded-lg hover:bg-ink-100/50">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Conteúdo com scroll -->
      <div class="overflow-y-auto flex-1 p-5 space-y-4">

        <!-- Avatar clicável para trocar foto -->
        <div class="flex items-center gap-4">
          <div class="relative shrink-0 cursor-pointer" onclick="closeModal();changeProfileAvatar('${u.id}')"
               title="Clique para trocar a foto">
            <div class="w-16 h-16 rounded-2xl overflow-hidden border-2 border-ink-100">
              <img src="${u.avatar}" class="w-full h-full object-cover profile-avatar-img"/>
            </div>
            <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-500 rounded-full grid place-items-center shadow">
              <i data-lucide="camera" class="w-3 h-3 text-white"></i>
            </div>
          </div>
          <div class="text-xs text-ink-500">
            <div class="font-bold text-ink-700 mb-0.5">Clique na foto para alterar</div>
            <div class="font-mono">@${escapeHtml(u.handle)}</div>
            <div class="font-mono mt-0.5">${(u.wallet || '').slice(0, 10)}…${(u.wallet || '').slice(-6)}</div>
            <div class="mt-1 text-[10px]">Handle e wallet não são editáveis.</div>
          </div>
        </div>

        <div>
          <label class="text-sm font-bold">Nome de exibição</label>
          <input id="ep-name" value="${escapeHtml(u.name)}"
            class="mt-1 w-full border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300"/>
        </div>

        <div>
          <label class="text-sm font-bold">Bio</label>
          <textarea id="ep-bio" rows="3"
            class="mt-1 w-full border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 resize-none">${escapeHtml(u.bio || '')}</textarea>
        </div>

        <div>
          <label class="text-sm font-bold">Skills <span class="font-normal text-ink-500">(separe por vírgula)</span></label>
          <input id="ep-skills" value="${(u.skills || []).map(escapeHtml).join(', ')}"
            class="mt-1 w-full border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300"
            placeholder="React, Solidity, Figma"/>
        </div>

        <div>
          <label class="text-sm font-bold">Idiomas <span class="font-normal text-ink-500">(Ctrl+clique para múltiplos)</span></label>
          <select id="ep-langs" multiple size="3"
            class="mt-1 w-full border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300">
            ${langOpts}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-bold">Resposta (horas)</label>
            <input id="ep-resp" type="number" min="1" max="48" value="${u.responseHours || 4}"
              class="mt-1 w-full border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300"/>
          </div>
          <div>
            <label class="text-sm font-bold">País</label>
            <select id="ep-country"
              class="mt-1 w-full border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300">
              ${COUNTRIES.map(c =>
                `<option value="${c.id}" ${u.country === c.id ? 'selected' : ''}>${c.flag} ${c.name}</option>`
              ).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- Botões fixos no rodapé -->
      <div class="px-5 py-4 border-t border-ink-100 flex gap-2 shrink-0">
        <button onclick="closeModal()"
          class="flex-1 border border-ink-100 hover:bg-ink-100/50 font-semibold py-2.5 rounded-xl text-sm">
          Cancelar
        </button>
        <button onclick="saveProfile()"
          class="flex-[2] bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
          <i data-lucide="check" class="w-4 h-4"></i>Salvar alterações
        </button>
      </div>
    </div>
  </div>`;
  icons();
};

/* ─────────────────────────────────────────────────────────
   4. OVERRIDE: viewWallet — oculta dados falsos para não-admin
   ───────────────────────────────────────────────────────── */
window.viewWallet = function() {
  // Apenas admin (STATE.isAdmin) vê os dados completos com histórico mock
  if (!STATE.isAdmin) {
    const me = getUser(STATE.currentUserId);
    return `
    <div class="max-w-2xl mx-auto px-5 py-14 text-center">
      <div class="w-16 h-16 rounded-2xl bg-brand-50 grid place-items-center mx-auto mb-5">
        <i data-lucide="wallet" class="w-8 h-8 text-brand-500"></i>
      </div>
      <h1 class="text-2xl font-extrabold mb-2">Carteira ITL</h1>
      <p class="text-ink-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
        Conecte sua carteira real via WalletConnect ou ITLX para ver saldo, 
        transações e sacar ITL diretamente.
      </p>

      <div class="bg-white border border-ink-100 rounded-2xl p-6 mb-6 text-left space-y-4">
        <div class="flex items-center gap-3 p-3 rounded-xl bg-ink-50 border border-ink-100">
          <i data-lucide="wallet" class="w-5 h-5 text-brand-500 shrink-0"></i>
          <div>
            <div class="text-xs text-ink-500">Carteira conectada</div>
            <div class="font-mono text-sm font-bold text-ink-900">${me && me.wallet ? me.wallet.slice(0,10)+'…'+me.wallet.slice(-6) : 'Nenhuma'}</div>
          </div>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-xl bg-ink-50 border border-ink-100">
          <i data-lucide="coins" class="w-5 h-5 text-brand-500 shrink-0"></i>
          <div>
            <div class="text-xs text-ink-500">Saldo ITL (on-chain)</div>
            <div class="font-bold text-ink-500 text-sm italic">Disponível após integração real com a Interlink Network</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-8">
        ${[
          ['ri-link', 'Interlink Explorer', 'Ver transações on-chain', 'https://explorer.interlinklabs.ai'],
          ['ri-question-line', 'Como funciona?', 'Entenda pagamentos ITL', '#/how'],
        ].map(([ic, title, desc, href]) => `
          <a href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}
             class="bg-white border border-ink-100 rounded-2xl p-4 text-left hover:border-brand-200 transition">
            <i class="${ic} text-2xl text-brand-500 mb-2 block"></i>
            <div class="font-bold text-sm text-ink-900">${title}</div>
            <div class="text-xs text-ink-500 mt-0.5">${desc}</div>
          </a>
        `).join('')}
      </div>

      <button onclick="openConnectWallet()"
        class="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-xl text-sm flex items-center gap-2 mx-auto shadow-pop">
        <i data-lucide="wallet" class="w-4 h-4"></i>Conectar carteira real
      </button>
    </div>`;
  }

  // Admin vê tudo (dados mock para testar)
  const me = getUser(STATE.currentUserId);
  const history = STATE.txHistory || [];
  const payouts = STATE.payouts || [];

  function txLabel(type) {
    return {
      escrow_lock: 'Escrow travado', escrow_release: 'Pagamento liberado',
      milestone_release: 'Milestone liberado', withdrawal: 'Saque ITL',
      deposit: 'Depósito', rating: 'Avaliação', profile_update: 'Perfil atualizado',
      dispute_open: 'Disputa aberta', dispute_resolve: 'Disputa resolvida',
      order_cancel_refund: 'Reembolso (cancelamento)',
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
        <div class="chip bg-amber-50 text-amber-700 mb-2">🔧 Modo Admin — Dados de Teste</div>
        <h1 class="text-3xl font-extrabold tracking-tight">Carteira ITL</h1>
        <p class="text-ink-500 text-sm">Dados simulados para teste de interface.</p>
      </div>
      <button onclick="openWithdrawModal()"
        class="bg-brand-500 hover:bg-brand-600 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-pop">
        <i data-lucide="banknote" class="w-4 h-4"></i>Testar Saque
      </button>
    </div>

    <div class="grid lg:grid-cols-3 gap-3">
      <div class="lg:col-span-1 space-y-4">
        <div class="rounded-3xl bg-gradient-to-br from-brand-500 to-sonic text-white p-6 shadow-pop">
          <div class="text-xs font-semibold opacity-90 flex items-center gap-2">
            <i data-lucide="wallet" class="w-3.5 h-3.5"></i>${STATE.walletProvider} • Interlink Network
          </div>
          <div class="mt-4 text-4xl font-extrabold text-sonic">${fmtITL(me.balanceITL || 0)}</div>
          <div class="text-xs opacity-90 mt-1">Saldo simulado (admin)</div>
          <div class="mt-4 pt-4 border-t border-white/20">
            <div class="text-[10px] uppercase tracking-wider opacity-75 font-bold">Wallet</div>
            <div class="font-mono text-xs break-all mt-1">${me.wallet}</div>
          </div>
        </div>

        <div class="bg-white border border-ink-100 rounded-2xl p-5">
          <div class="font-extrabold flex items-center gap-2 mb-3">
            <i data-lucide="receipt" class="w-5 h-5 text-brand-500"></i>Saques (mock)
          </div>
          ${payouts.length
            ? `<div class="space-y-2">${payouts.slice(0, 5).map(p => `
              <div class="rounded-xl border border-ink-100 p-3">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-bold">${fmtITL(p.amount)}</span>
                  <span class="chip bg-emerald-50 text-emerald-700">Confirmado</span>
                </div>
                <div class="font-mono text-[10px] text-brand-500 mt-1">${shortHash(p.hash)}</div>
              </div>`).join('')}</div>`
            : `<div class="text-sm text-ink-500 border border-dashed border-ink-100 rounded-xl p-3 text-center">Nenhum saque.</div>`}
        </div>
      </div>

      <div class="lg:col-span-2 bg-white border border-ink-100 rounded-2xl overflow-hidden">
        <div class="p-5 border-b border-ink-100 flex items-center justify-between">
          <div class="font-extrabold flex items-center gap-2">
            <i data-lucide="history" class="w-5 h-5 text-brand-500"></i>Histórico (mock)
          </div>
          <span class="text-xs text-ink-500">${history.length} registros</span>
        </div>
        ${history.length
          ? `<div class="divide-y divide-ink-100">${history.map(tx => `
            <div class="p-3 flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center shrink-0">
                <i data-lucide="${txIcon(tx.type)}" class="w-4 h-4 text-brand-500"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-bold text-sm">${txLabel(tx.type)}</div>
                <div class="text-xs text-ink-500">${timeAgo(tx.ts)} atrás</div>
                <div class="font-mono text-[10px] text-brand-500">${shortHash(tx.hash)}</div>
              </div>
              <div class="text-right">
                <div class="font-extrabold text-sm ${tx.type === 'withdrawal' ? 'text-rose-600' : 'text-ink-900'}">
                  ${tx.amount ? (tx.type === 'withdrawal' ? '-' : '') + fmtITL(tx.amount) : '—'}
                </div>
              </div>
            </div>`).join('')}</div>`
          : `<div class="p-10 text-center text-ink-500">Nenhuma transação.</div>`}
      </div>
    </div>
  </div>`;
};

/* ─────────────────────────────────────────────────────────
   5. OVERRIDE: openChat — fecha menus antes de abrir o chat
   ───────────────────────────────────────────────────────── */
const _origOpenChat = window.openChat;
window.openChat = function(orderId, otherUserId) {
  // Fecha TODOS os menus/dropdowns antes de abrir o drawer
  document.getElementById('profile-dropdown')?.classList.add('hidden');
  document.getElementById('lang-menu')?.classList.add('hidden');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) mobileMenu.classList.add('hidden');
  const mobIcon = document.getElementById('mobMenuIcon');
  if (mobIcon) { mobIcon.classList.add('ri-menu-line'); mobIcon.classList.remove('ri-close-line'); }
  // Pequeno delay para garantir que o DOM está limpo antes de injetar o drawer
  setTimeout(() => _origOpenChat.call(this, orderId, otherUserId), 10);
};

/* ─────────────────────────────────────────────────────────
   6. OVERRIDE: renderChat — corrige re-render e stepper em efêmeros
   ───────────────────────────────────────────────────────── */
window.renderChat = function(order, ephemeral) {
  const other = getUser(order.clientId === STATE.currentUserId ? order.freelancerId : order.clientId);
  if (!other) return;
  const svc = order.serviceId ? getService(order.serviceId) : null;
  const msgs = STATE.messages[order.id] || [];

  // Salva posição de scroll antes de re-renderizar (evita flash)
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

      <!-- Header -->
      <div class="p-3 border-b border-ink-100 flex items-center gap-3 shrink-0">
        <img src="${other.avatar}" class="w-10 h-10 rounded-xl object-cover"/>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-sm flex items-center gap-1">
            ${escapeHtml(other.name)}
            ${other.verified ? '<i data-lucide="badge-check" class="w-4 h-4 text-brand-500"></i>' : ''}
          </div>
          <div id="chat-subtitle" class="text-[11px] text-ink-500 truncate">
            ${svc ? escapeHtml(svc.title) : 'Conversa'}
          </div>
        </div>
        <button onclick="closeChat()" aria-label="Fechar chat"
          class="w-8 h-8 grid place-items-center rounded-lg hover:bg-ink-100/50">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Progress stepper APENAS quando há pedido real (não efêmero) e svc existe -->
      ${(!ephemeral && svc && order.id && !order.id.startsWith('pre_')) ? `
      <div class="px-4 py-2.5 bg-ink-50/70 border-b border-ink-100 shrink-0">
        <div class="flex items-center justify-between mb-1.5">
          ${statusChip(order.status)}
          <span class="text-[10px] text-ink-400">Pedido #${order.id.slice(-5)}</span>
        </div>
        ${orderProgressStepper(order, { compact: true })}
      </div>` : ''}

      <!-- Messages stream -->
      <div id="chat-stream"
           class="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3 bg-gradient-to-b from-white to-ink-100/30"
           style="overscroll-behavior:contain">
        ${msgs.length
          ? msgs.map(m => chatBubble(m)).join('')
          : `<div class="text-center text-ink-400 text-xs py-10">
               <i data-lucide="message-circle" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
               Inicie a conversa
             </div>`}
      </div>

      <!-- Attachment staging -->
      <div id="chat-attach-staging" class="hidden px-3 pt-2 border-t border-ink-100 bg-ink-50/50 shrink-0">
        <div class="flex items-center gap-1 mb-1">
          <i data-lucide="paperclip" class="w-3 h-3 text-ink-500"></i>
          <span class="text-[10px] font-bold text-ink-500 uppercase tracking-wider">Anexos prontos</span>
        </div>
        <div id="chat-attach-list" class="flex flex-wrap gap-1.5 pb-2"></div>
      </div>

      <!-- Input form -->
      <form id="chat-form" class="p-3 border-t border-ink-100 flex items-end gap-2 shrink-0"
            role="form" aria-label="Enviar mensagem">
        <input type="file" id="chat-file-input" multiple
          accept="image/*,.pdf,.doc,.docx,.zip,.txt,.xls,.xlsx,.ppt,.pptx,.mp4,.mov,.fig"
          class="sr-only" aria-label="Selecionar arquivo"/>

        <button type="button" id="chat-attach-btn" aria-label="Anexar arquivo"
          class="w-9 h-9 grid place-items-center rounded-lg hover:bg-brand-50 hover:text-brand-600 text-ink-400 transition shrink-0 self-center">
          <i data-lucide="paperclip" class="w-4 h-4"></i>
        </button>

        <label for="chat-input" class="sr-only">Mensagem</label>
        <textarea id="chat-input" rows="1" autocomplete="off"
          placeholder="Digite uma mensagem…" aria-label="Digite uma mensagem"
          class="flex-1 border border-ink-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 resize-none max-h-28 overflow-y-auto"
          style="min-height:36px;"></textarea>

        <button type="submit" aria-label="Enviar mensagem"
          class="w-10 h-10 grid place-items-center rounded-xl bg-brand-500 hover:bg-brand-600 text-white shrink-0 self-end transition">
          <i data-lucide="send" class="w-4 h-4"></i>
        </button>
      </form>
    </aside>
  </div>`;

  icons();

  // Scroll to bottom se estava no final antes
  const stream = document.getElementById('chat-stream');
  if (stream && wasAtBottom) {
    requestAnimationFrame(() => { stream.scrollTop = stream.scrollHeight; });
  }

  renderChatStagingArea();

  // Wire file input
  const attachBtn = document.getElementById('chat-attach-btn');
  const fileInput = document.getElementById('chat-file-input');
  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => handleChatFileSelect(e, order));
  }

  // Auto-grow textarea
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
    // Focus no input (melhora UX)
    requestAnimationFrame(() => textarea.focus());
  }

  // Form submit — use { once: false } mas previne duplo listener com flag
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
        id: uid('m'),
        from: STATE.currentUserId,
        text: v || '',
        ts: nowTs(),
        status: 'sent'
      };
      if (pending.length) {
        msg.attachments = pending.map(a => ({
          name: a.name, size: a.size, type: a.type, dataURL: a.dataURL || null,
        }));
      }

      STATE.messages[order.id] = STATE.messages[order.id] || [];
      STATE.messages[order.id].push(msg);
      window._chatPendingAttachments = [];

      // Limpa input ANTES de re-renderizar (evita flash)
      if (input) input.value = '';

      // Re-renderiza o chat preservando a mesma referência de `order`
      window.renderChat(order, ephemeral);

      // Supabase: persiste se pedido tem UUID real
      if (SB_READY && sb && STATE.sbProfile?.id && order.sbId) {
        const firstAttach = msg.attachments?.[0];
        const attachmentUrl = firstAttach
          ? (firstAttach.dataURL ? `[imagem:${firstAttach.name}]` : firstAttach.name)
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

      // Modo demo — respostas simuladas
      setTimeout(() => {
        if (msg.status === 'sent') msg.status = 'delivered';
        if (STATE.chatOpenOrderId === order.id) window.renderChat(order, ephemeral);
      }, 500);

      setTimeout(() => {
        if (STATE.chatOpenOrderId !== order.id) return;
        const chatSubtitle = document.getElementById('chat-subtitle');
        if (chatSubtitle) chatSubtitle.textContent = 'digitando…';
      }, 750);

      setTimeout(() => {
        if (STATE.chatOpenOrderId !== order.id) return;
        const fileReplies = ['Recebi os arquivos, obrigado!', 'Ótimo, já estou analisando.'];
        const textReplies = ['Combinado!', 'Já estou nisso.', 'Pode me mandar o briefing?', 'Vou subir um preview hoje.'];
        const pool = msg.attachments?.length ? fileReplies : textReplies;
        msg.status = 'read';
        STATE.messages[order.id].push({
          id: uid('m'),
          from: other.id,
          text: pool[Math.floor(Math.random() * pool.length)],
          ts: nowTs(),
          status: 'read'
        });
        if (STATE.chatOpenOrderId === order.id) window.renderChat(order, ephemeral);
      }, 2100);
    });
  }
};

/* ─────────────────────────────────────────────────────────
   7. FIX: pickTrendingTag — versão única (remove duplicata)
   A versão correta já está definida no script principal;
   garantimos que a última definição prevalece.
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
   8. FIX: "Meus pedidos" no dropdown — navegação confiável
   ───────────────────────────────────────────────────────── */
window.goToDashboard = function(tab) {
  document.getElementById('profile-dropdown')?.classList.add('hidden');
  STATE.dashboardTab = tab || 'client';
  location.hash = '#/dashboard/' + (tab || 'client');
};

/* ─────────────────────────────────────────────────────────
   9. FIX: closeMenusOnOutside — vincula ao document
   ───────────────────────────────────────────────────────── */
document.addEventListener('click', function(e) {
  // Fecha dropdown de perfil se clicou fora dele
  const dd = document.getElementById('profile-dropdown');
  const wrap = document.getElementById('profile-menu-wrap');
  if (dd && !dd.classList.contains('hidden')) {
    if (!dd.contains(e.target) && wrap && !wrap.contains(e.target)) {
      dd.classList.add('hidden');
    }
  }
  // Fecha lang-menu se clicou fora
  const langMenu = document.getElementById('lang-menu');
  if (langMenu && !langMenu.classList.contains('hidden') && !langMenu.contains(e.target)) {
    langMenu.classList.add('hidden');
  }
  // Fecha sort menu da listagem
  const sortMenu = document.getElementById('sortMenu');
  if (sortMenu && !sortMenu.classList.contains('hidden') && !sortMenu.contains(e.target)) {
    sortMenu.classList.add('hidden');
  }
});

/* ─────────────────────────────────────────────────────────
   10. PATCH: renderHeader — usa goToDashboard no botão
   "Meus pedidos" para garantir navegação mobile
   ───────────────────────────────────────────────────────── */
const _origRenderHeader = window.renderHeader;
window.renderHeader = function() {
  _origRenderHeader.call(this);
  // Após renderizar, corrige o botão "Meus pedidos" no dropdown
  const btn = document.querySelector('#profile-dropdown button[data-action="orders"]');
  if (btn) {
    btn.onclick = () => { closeProfileMenu(); goToDashboard('client'); };
  }
  // Re-bind genérico: qualquer botão com data-goto no dropdown
  document.querySelectorAll('#profile-dropdown [data-goto]').forEach(el => {
    el.addEventListener('click', function() {
      closeProfileMenu();
      const dest = this.dataset.goto;
      if (dest) location.hash = dest;
    });
  });
};

console.log('[InterWork Fixes] ✅ Patch carregado com sucesso.');
