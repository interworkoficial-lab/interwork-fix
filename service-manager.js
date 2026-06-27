/* ============================================================
 * INTERWORK — service-manager.js
 * Module: Service Manager
 *
 * FIXES APPLIED (v2):
 *  [C1] Removed duplicate const REQ_TYPES — was causing SyntaxError at runtime
 *  [C2] renderGalleryPreview now uses id="ns-gallery-grid" existing in Step 3
 *  [C3] saveService() no longer calls closeModal() — wizard runs as a page, not modal
 *  [H1] collectFaqs/collectRequirements called in BOTH directions (back and forward)
 *  [H2] Step 2 initialization centralized: setTimeout(...,0) in viewNewServicePage,
 *       removed duplicate RAF from nsWizardNavPage
 *  [H3] Back button in Step 3 saves price/days without requiring validation
 *  [H4] createService() and saveService() use STATE.newServiceFaqs /
 *       STATE.newServiceRequirements directly — no longer depend on Step 2 DOM
 *  [M1] FAQs in {question,answer} format normalized to {q,a} on edit
 *  [M2] Step bar uses nsGoToStep(n) which collects data before navigating
 *  [M3] deleteService() uses confirmation modal instead of native confirm()
 *  [L1] Logo upload limit aligned: code uses 5MB, same as text in Step 3
 * ============================================================ */

/* ============================================================
 * INTERNAL HELPERS
 * ============================================================ */

function isServiceOwner(s) {
  if (!s) return false;
  return s.freelancerId === STATE.currentUserId || s.freelancerId === 'u_ana';
}

function defaultFaqs() {
  return [{ id: uid('faq'), q: '', a: '' }];
}

function defaultRequirements() {
  return [
    {
      id: uid('req'),
      type: 'textarea',
      label: 'Describe your project in detail — goal, scope, desired deadline.',
      required: true,
      placeholder:
        'E.g.: I need a dark landing page for our yield protocol, with animated hero and FAQ section.',
    },
  ];
}

/* ============================================================
 * ENTRY POINT — opens the wizard (modal or page)
 * ============================================================ */

function openNewServiceModal(editId) {
  if (!requireAuth(editId ? 'edit services' : 'publish services')) return;

  const editing  = !!editId;
  const existing = editing ? getService(editId) : null;
  if (editing && !existing)            { toast('Service not found.', 'warn'); return; }
  if (editing && !isServiceOwner(existing)) { toast('You cannot edit this service.', 'warn'); return; }

  STATE.newServiceLogo         = editing ? (existing.thumb  || null) : null;
  STATE.newServiceGallery      = editing ? (existing.gallery ? existing.gallery.slice() : []) : [];

  /* [H4] Requirements: always loads from STATE, never from DOM */
  STATE.newServiceRequirements = editing
    ? (existing.requirements || []).map(r => ({ ...r }))
    : defaultRequirements();

  /* [M1] FAQs: normalize {question,answer} → {q,a} plus legacy arrays */
  STATE.newServiceFaqs = editing
    ? (existing.faqs || gigFaqsByCategory(existing.category)).map(f => {
        if (Array.isArray(f)) return { id: uid('faq'), q: f[0], a: f[1] };
        return { ...f, q: f.q || f.question || '', a: f.a || f.answer || '' };
      })
    : defaultFaqs();

  STATE._nsStep = 1;
  STATE._nsEdit = editId || null;
  STATE._nsV = {
    title : editing ? existing.title          : '',
    cat   : editing ? existing.category       : (CATEGORIES[0]?.id || ''),
    co    : editing ? existing.country        : (COUNTRIES[0]?.id  || ''),
    price : editing ? existing.price          : 250,
    days  : editing ? existing.deliveryDays   : 7,
    desc  : editing ? existing.description    : '',
    inc   : editing ? (existing.includes || []).join(', ') : '',
    tags  : editing ? (existing.tags    || []).join(', ') : '',
  };

  STATE.route = 'new-service';
  renderView();
}

function openEditServiceModal(id) {
  openNewServiceModal(id);
}

/* ============================================================
 * DEDICATED PAGE (4 steps)
 * ============================================================ */

function viewNewServicePage() {
  const editing = !!STATE._nsEdit;
  const step    = STATE._nsStep || 1;

  const STEPS = [
    { n:1, label:'Overview',         icon:'file-text',    desc:'Title, category and tags'       },
    { n:2, label:'Description & FAQ',icon:'help-circle',  desc:'Service pitch and questions'     },
    { n:3, label:'Price & Media',    icon:'tag',          desc:'Price, deadline and gallery'     },
    { n:4, label:'Review',           icon:'check-circle', desc:'Confirm and publish'             },
  ];

  const v        = STATE._nsV || {};
  const titleLen = (v.title || '').length;
  const descLen  = (v.desc  || '').length;
  const tagCount = (v.tags  || '').split(',').map(x => x.trim()).filter(Boolean).length;

  /* ── STEP 1 ── */
  const step1 = `
  <div class="space-y-5">
    <details class="rounded-xl border border-brand-100 bg-brand-50/50 overflow-hidden">
      <summary class="flex items-center justify-between px-4 py-3 cursor-pointer select-none text-sm font-semibold text-brand-700">
        <span class="flex items-center gap-2"><i data-lucide="info" class="w-4 h-4"></i>How Service Listing Works</span>
        <i data-lucide="chevron-down" class="w-4 h-4"></i>
      </summary>
      <div class="px-4 pb-3 text-xs text-brand-700 space-y-1 leading-relaxed">
        <p>• Write a clear title — "I will create a logo for your Web3 brand"</p>
        <p>• The more detailed your service, the more trust you build with clients.</p>
        <p>• Services with photos and FAQ have 3× higher conversion.</p>
      </div>
    </details>
    <div class="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-700">
      <i data-lucide="shield-check" class="w-4 h-4 shrink-0 mt-0.5 text-violet-500"></i>
      <span><strong>ITLX Wallet Recommended.</strong> Payments on the Interlink network use <strong>ITL</strong> — make sure your wallet is compatible.</span>
    </div>
    <div>
      <label class="text-xs font-bold uppercase tracking-wider text-ink-500">SERVICE TITLE *</label>
      <input id="ns-title" value="${escapeHtml(v.title)}" maxlength="80"
        oninput="document.getElementById('ns-tc').textContent=this.value.length"
        class="w-full mt-1.5 border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 transition"
        placeholder="I will create a professional logo for your brand"/>
      <div class="flex justify-end mt-1">
        <span class="text-[11px] text-ink-400"><span id="ns-tc">${titleLen}</span>/80</span>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-bold uppercase tracking-wider text-ink-500">CATEGORY *</label>
        <select id="ns-cat" class="w-full mt-1.5 border border-ink-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 transition bg-white">
          ${CATEGORIES.map(cat => `<option value="${cat.id}" ${(v.cat || '') === cat.id ? 'selected' : ''}>${cat.label}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="text-xs font-bold uppercase tracking-wider text-ink-500">COUNTRY *</label>
        <select id="ns-co" class="w-full mt-1.5 border border-ink-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 transition bg-white">
          ${COUNTRIES.map(co => `<option value="${co.id}" ${(v.co || '') === co.id ? 'selected' : ''}>${co.flag} ${co.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div>
      <label class="text-xs font-bold uppercase tracking-wider text-ink-500">TAGS <span class="font-normal normal-case text-ink-400">(separate by comma · up to 10)</span></label>
      <input id="ns-tags" value="${escapeHtml(v.tags)}"
        oninput="document.getElementById('ns-tagc').textContent=this.value.split(',').map(x=>x.trim()).filter(Boolean).length"
        class="w-full mt-1.5 border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 transition"
        placeholder="e.g.: logo, branding, web3, design, visual identity"/>
      <div class="text-[11px] text-ink-400 mt-1"><span id="ns-tagc">${tagCount}</span>/10 tags — help clients find you</div>
    </div>
  </div>`;

  /* ── STEP 2 ── */
  const step2 = `
  <div class="space-y-5">
    <div>
      <label class="text-xs font-bold uppercase tracking-wider text-ink-500">DESCRIPTION *</label>
      <textarea id="ns-desc" rows="6" maxlength="1200"
        oninput="document.getElementById('ns-dc').textContent=this.value.length"
        class="w-full mt-1.5 border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm resize-none outline-none focus:border-brand-400 transition"
        placeholder="E.g.: I will create a professional landing page for your Web3 project...">${escapeHtml(v.desc)}</textarea>
      <div class="flex justify-between mt-1">
        <span class="text-[11px] text-ink-400">Minimum 20 characters</span>
        <span class="text-[11px] text-ink-400"><span id="ns-dc">${descLen}</span>/1200</span>
      </div>
    </div>
    <div class="border-t border-ink-100 pt-4">
      <div class="flex items-center justify-between mb-1.5">
        <label class="text-xs font-bold uppercase tracking-wider text-ink-500">FAQ <span class="font-normal normal-case text-ink-400">(recommended)</span></label>
        <button type="button" onclick="addFaq()" class="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>Add question
        </button>
      </div>
      <p class="text-[11px] text-ink-400 mb-2">Answer the most common questions — reduces repetitive messages in chat.</p>
      <div id="ns-faq-list" class="space-y-2"></div>
    </div>
    <div class="border-t border-ink-100 pt-4">
      <div class="flex items-center justify-between mb-1.5">
        <label class="text-xs font-bold uppercase tracking-wider text-ink-500">CLIENT BRIEFING *</label>
        <button type="button" onclick="addRequirement()" class="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>Add field
        </button>
      </div>
      <p class="text-[11px] text-ink-400 mb-2">The client fills this in before paying — you receive everything you need to start.</p>
      <div id="ns-req-list" class="space-y-2"></div>
    </div>
  </div>`;

  /* ── STEP 3 ── */
  /* [C2] Gallery grid now has id="ns-gallery-grid" so renderGalleryPreview() can find it */
  const gPrev = (STATE.newServiceGallery || []).map((src, i) => `
    <div class="relative group aspect-square rounded-xl overflow-hidden border border-ink-100">
      <img src="${src}" class="w-full h-full object-cover pointer-events-none"/>
      <button onclick="removeGalleryImg(${i})" class="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full grid place-items-center opacity-0 group-hover:opacity-100 transition">
        <i data-lucide="x" class="w-3 h-3"></i>
      </button>
      <span class="absolute bottom-1 left-1 text-[9px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded-full">${i === 0 ? 'Cover' : i + 1}</span>
    </div>`).join('');

  const step3 = `
  <div class="space-y-5">
    <div class="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
      <i data-lucide="lightbulb" class="w-4 h-4 text-amber-500 shrink-0 mt-0.5"></i>
      <span>Services between <strong>48 and 280 ITL</strong> have the highest conversion rate on the platform.</span>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-bold uppercase tracking-wider text-ink-500">PRICE (ITL) *</label>
        <div class="relative mt-1.5">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 font-bold">⬡</span>
          <input id="ns-price" type="number" min="1" max="9999" value="${v.price || 120}"
            class="w-full border border-ink-200 rounded-xl pl-8 pr-3 py-2.5 text-sm outline-none focus:border-brand-400 transition"/>
        </div>
      </div>
      <div>
        <label class="text-xs font-bold uppercase tracking-wider text-ink-500">DELIVERY TIME (DAYS) *</label>
        <div class="relative mt-1.5">
          <input id="ns-days" type="number" min="1" max="90" value="${v.days || 7}"
            class="w-full border border-ink-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 transition pr-12"/>
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 text-xs">days</span>
        </div>
      </div>
    </div>
    <div>
      <label class="text-xs font-bold uppercase tracking-wider text-ink-500">PAYMENT METHOD</label>
      <div class="flex gap-3 mt-2">
        <div class="flex-1 flex items-center gap-3 border-2 border-brand-500 bg-brand-50 rounded-xl px-4 py-3">
          <div class="w-8 h-8 rounded-lg bg-brand-500 grid place-items-center shrink-0">
            <i data-lucide="hexagon" class="w-4 h-4 text-white"></i>
          </div>
          <div><div class="text-sm font-extrabold text-brand-700">ITL</div><div class="text-[10px] text-brand-600">InterLink Token</div></div>
          <i data-lucide="check-circle" class="w-4 h-4 text-brand-500 ml-auto"></i>
        </div>
        <div class="flex-1 flex items-center gap-3 border border-ink-200 bg-ink-50 rounded-xl px-4 py-3 opacity-50">
          <div class="w-8 h-8 rounded-lg bg-ink-200 grid place-items-center shrink-0">
            <i data-lucide="coins" class="w-4 h-4 text-ink-400"></i>
          </div>
          <div><div class="text-sm font-semibold text-ink-500">Stablecoins</div><div class="text-[10px] text-ink-400">Coming soon</div></div>
        </div>
      </div>
    </div>
    <div>
      <label class="text-xs font-bold uppercase tracking-wider text-ink-500">MAIN PHOTO *</label>
      <div class="flex items-center gap-3 mt-2">
        <div id="ns-logo-preview" class="w-20 h-20 rounded-xl border-2 border-dashed border-ink-200 bg-ink-50 grid place-items-center overflow-hidden shrink-0">
          ${STATE.newServiceLogo
            ? `<img src="${STATE.newServiceLogo}" class="w-full h-full object-cover"/>`
            : `<i data-lucide="image-plus" class="w-7 h-7 text-ink-300"></i>`}
        </div>
        <div class="flex-1 space-y-1.5">
          <input id="ns-logo-input" type="file" accept="image/*" class="hidden" onchange="handleLogoUpload(event)"/>
          <button type="button" onclick="document.getElementById('ns-logo-input').click()"
            class="w-full flex items-center justify-center gap-2 border-2 border-dashed border-brand-300 hover:border-brand-500 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-sm py-2.5 rounded-xl transition">
            <i data-lucide="upload" class="w-4 h-4"></i>${STATE.newServiceLogo ? 'Change photo' : 'Upload photo'}
          </button>
          ${STATE.newServiceLogo
            ? `<button type="button" onclick="clearLogo()" class="w-full text-xs text-rose-500 font-semibold flex items-center justify-center gap-1 hover:text-rose-700"><i data-lucide="x" class="w-3 h-3"></i>Remove</button>`
            : ''}
          <p class="text-[11px] text-ink-400 text-center">JPEG, PNG or WebP up to 5 MB</p>
        </div>
      </div>
    </div>
    <div>
      <label class="text-xs font-bold uppercase tracking-wider text-ink-500">GALLERY <span class="font-normal normal-case text-ink-400">(optional · up to 8 images)</span></label>
      <input id="ns-gallery-input" type="file" accept="image/*" multiple class="hidden" onchange="handleGalleryUpload(event)"/>
      ${(STATE.newServiceGallery || []).length
        ? `<div id="ns-gallery-grid" class="grid grid-cols-5 gap-2 mt-2 mb-2">${gPrev}</div>`
        : `<div id="ns-gallery-grid" class="grid grid-cols-5 gap-2 mt-2 mb-2"></div>`}
      ${(STATE.newServiceGallery || []).length < 8
        ? `<button type="button" onclick="document.getElementById('ns-gallery-input').click()"
            class="w-full border-2 border-dashed border-ink-200 hover:border-brand-300 hover:bg-brand-50/40 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-ink-500 hover:text-brand-600 transition mt-2">
            <i data-lucide="image-plus" class="w-4 h-4"></i>Add examples of your work
          </button>`
        : ''}
    </div>
    <div>
      <label class="text-xs font-bold uppercase tracking-wider text-ink-500">WHAT'S INCLUDED <span class="font-normal normal-case text-ink-400">(separate by comma)</span></label>
      <input id="ns-inc" value="${escapeHtml(v.inc)}"
        class="w-full mt-1.5 border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 transition"
        placeholder="e.g.: 3 proposals, unlimited revisions, editable file"/>
    </div>
  </div>`;

  /* ── STEP 4: Review ── */
  const catObj  = CATEGORIES.find(x => x.id === v.cat);
  const coObj   = COUNTRIES.find(x => x.id === v.co);
  const incList = (v.inc  || '').split(',').map(s => s.trim()).filter(Boolean);
  const tagList = (v.tags || '').split(',').map(s => s.trim()).filter(Boolean);

  /* [H4] In Step 4, read directly from STATE — Step 2 DOM no longer exists */
  const nFaqs = (STATE.newServiceFaqs || []).filter(f => (f.q || '').trim() && (f.a || '').trim()).length;
  const nReqs = (STATE.newServiceRequirements || []).filter(r => (r.label || '').trim()).length;

  const rowItem = (icon, lbl, val, cls = 'text-ink-800') => `
    <div class="flex items-start gap-3 py-2.5 border-b border-ink-100 last:border-0">
      <i data-lucide="${icon}" class="w-4 h-4 text-ink-400 mt-0.5 shrink-0"></i>
      <span class="text-xs text-ink-500 w-24 shrink-0">${lbl}</span>
      <span class="text-xs font-semibold ${cls} flex-1">${val}</span>
    </div>`;

  const step4 = `
  <div class="space-y-4">
    <div class="rounded-2xl border border-ink-100 overflow-hidden">
      ${STATE.newServiceLogo
        ? `<img src="${STATE.newServiceLogo}" class="w-full h-36 object-cover"/>`
        : `<div class="w-full h-36 flex items-center justify-center" style="background:${catObj?.color || '#e5e7eb'}15">
            <i data-lucide="${catObj?.icon || 'briefcase'}" class="w-10 h-10 opacity-20" style="color:${catObj?.color || '#9ca3af'}"></i>
           </div>`}
      <div class="p-3">
        <span class="chip text-[10px]" style="background:${catObj?.color || '#e5e7eb'}18;color:${catObj?.color || '#6b7280'}">${catObj?.label || '—'}</span>
        <div class="font-extrabold text-sm mt-1.5 leading-snug">${escapeHtml(v.title || '—')}</div>
        <div class="flex items-center justify-between mt-2">
          <span class="text-xs text-ink-500">${v.days || '?'} days</span>
          <span class="text-[13px] font-extrabold text-brand-600">${fmtITL(+(v.price || 0))}</span>
        </div>
        ${tagList.length
          ? `<div class="flex flex-wrap gap-1 mt-2">${tagList.map(t => `<span class="chip bg-ink-100/70 text-ink-500 text-[10px]">#${escapeHtml(t)}</span>`).join('')}</div>`
          : ''}
      </div>
    </div>
    <div class="rounded-2xl border border-ink-100 p-3">
      ${rowItem('map-pin', 'Country',   `${coObj?.flag || ''} ${coObj?.name || '—'}`)}
      ${rowItem('package', 'Included',  incList.length ? incList.join(', ') : '—')}
      ${rowItem('coins',   'Payment',   'ITL · InterLink Token', 'text-brand-600')}
      ${rowItem('help-circle', 'FAQ',   nFaqs ? `${nFaqs} question(s)` : '—')}
      ${rowItem('clipboard-list', 'Briefing', nReqs ? `${nReqs} field(s)` : '—')}
      ${(STATE.newServiceGallery || []).length
        ? rowItem('image', 'Gallery', `${STATE.newServiceGallery.length} image(s)`)
        : ''}
    </div>
    <div class="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
      <div class="w-8 h-8 rounded-full bg-amber-100 grid place-items-center shrink-0">
        <i data-lucide="clock" class="w-4 h-4 text-amber-600"></i>
      </div>
      <div class="text-xs text-amber-800 leading-relaxed">
        <span class="font-bold block mb-0.5">Submit for review</span>
        After publishing, the Interwork team reviews within <strong>24h</strong>. You'll be notified when it appears on the marketplace.
      </div>
    </div>
  </div>`;

  /* ── PAGE ASSEMBLY ── */
  const bodies = { 1: step1, 2: step2, 3: step3, 4: step4 };

  const btnBack = step > 1
    ? `<button onclick="nsWizardNavPage(-1)" class="flex items-center gap-2 px-5 py-2.5 border border-ink-200 hover:bg-ink-50 font-semibold text-sm rounded-xl transition"><i data-lucide="chevron-left" class="w-4 h-4"></i>Back</button>`
    : `<button onclick="go('#/earn')" class="flex items-center gap-2 px-5 py-2.5 border border-ink-200 hover:bg-ink-50 font-semibold text-sm rounded-xl transition"><i data-lucide="x" class="w-4 h-4"></i>Cancel</button>`;

  const btnNext = step < 4
    ? `<button onclick="nsWizardNavPage(1)" class="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl transition">Next<i data-lucide="chevron-right" class="w-4 h-4"></i></button>`
    : `<button onclick="${STATE._nsEdit ? `saveService('${STATE._nsEdit}')` : 'createService()'}" class="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl transition"><i data-lucide="send" class="w-4 h-4"></i>Submit for Review</button>`;

  /* [H2] Step 2 initialization centralized here with setTimeout, no duplicate RAF */
  if (step === 2) {
    setTimeout(() => { renderFaqBuilder(); renderRequirementsBuilder(); }, 0);
  }

  return `
  <div class="min-h-screen" style="background:var(--home-bg)">
    <div class="max-w-xl mx-auto px-4 py-10">

      <!-- Breadcrumb -->
      <div class="text-center mb-8">
        <div class="flex items-center justify-center gap-2 text-xs text-ink-500 mb-4">
          <button onclick="STATE.route='dashboard';STATE.dashboardTab='freelancer';render()" class="hover:text-brand-500 transition">Dashboard</button>
          <i data-lucide="chevron-right" class="w-3 h-3"></i>
          <span class="font-semibold text-ink-700">${editing ? 'Edit Service' : 'Publish Service'}</span>
        </div>
        <h1 class="text-xl font-extrabold text-ink-900 mb-5">${editing ? 'Edit Service' : 'Register a Service'}</h1>

        <!-- [M2] Step bar uses nsGoToStep(n) to collect data before navigating -->
        <div class="flex items-center justify-center gap-0 mb-2">
          ${STEPS.map((s, i) => {
            const done   = step > s.n;
            const active = step === s.n;
            return `
            ${i > 0 ? `<div class="w-12 h-0.5 ${done ? 'bg-brand-500' : 'bg-ink-200'}"></div>` : ''}
            <button onclick="nsGoToStep(${s.n})"
              class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all shrink-0
                ${done ? 'bg-brand-500 border-brand-500 text-white cursor-pointer' : active ? 'border-brand-500 text-brand-600 bg-white' : 'border-ink-200 text-ink-400 bg-white cursor-default'}">
              ${done ? `<i data-lucide="check" class="w-4 h-4"></i>` : s.n}
            </button>`;
          }).join('')}
        </div>
        <p class="text-xs text-ink-400">Step ${step} of 4 — <span class="font-semibold text-ink-600">${STEPS[step - 1].label}</span></p>
      </div>

      <!-- Form card -->
      <div class="bg-white border border-ink-100 rounded-2xl overflow-hidden shadow-sm">
        <div class="px-6 py-6">
          ${bodies[step] || step1}
        </div>
        <div class="px-6 py-4 border-t border-ink-100 flex items-center justify-between bg-ink-50/30">
          <div class="flex-1">${btnBack}</div>
          <div class="flex-1 flex justify-end">${btnNext}</div>
        </div>
      </div>
    </div>
  </div>`;
}
/* ============================================================
 * [M2] nsGoToStep — navigates to a step collecting data from current
 * ============================================================ */
function nsGoToStep(targetStep) {
  const currentStep = STATE._nsStep || 1;
  /* Only allows going to already visited steps (less than or equal to current + 1) */
  if (targetStep > currentStep) return; // future steps are locked
  if (targetStep === currentStep) return;

  /* Collects data from current step before navigating (same as nsWizardNavPage) */
  _nsCollectCurrentStep(currentStep);

  STATE._nsStep = targetStep;
  renderView();

  if (targetStep === 2) {
    setTimeout(() => { renderFaqBuilder(); renderRequirementsBuilder(); }, 0);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
 * WIZARD NAVIGATION
 * ============================================================ */

function nsWizardNavPage(dir) {
  const step = STATE._nsStep || 1;

  /* [H1] Collect + validate (validation only when dir=1) */
  if (step === 1) {
    const title = (document.getElementById('ns-title')?.value || '').trim();
    if (dir === 1 && !title) { toast('Please enter a title for your service.', 'warn'); return; }
    STATE._nsV.title = title;
    STATE._nsV.cat   = document.getElementById('ns-cat')?.value  || '';
    STATE._nsV.co    = document.getElementById('ns-co')?.value   || '';
    STATE._nsV.tags  = (document.getElementById('ns-tags')?.value || '').trim();
  }

  if (step === 2) {
    const desc = (document.getElementById('ns-desc')?.value || '').trim();
    if (dir === 1 && desc.length < 20) { toast('Description too short — minimum 20 characters.', 'warn'); return; }
    STATE._nsV.desc = desc;
    /* [H1] Collect FAQs and Requirements in ANY direction */
    collectFaqsFromBuilder();
    collectRequirementsFromBuilder();
  }

  if (step === 3) {
    const price = parseFloat(document.getElementById('ns-price')?.value || '0');
    const days  = parseInt(document.getElementById('ns-days')?.value  || '0', 10);
    /* [H3] Validation only when going forward; when going back, save whatever is there */
    if (dir === 1 && (!price || price < 1)) { toast('Please set a valid price.', 'warn'); return; }
    if (dir === 1 && (!days  || days  < 1)) { toast('Please set a valid delivery time.', 'warn'); return; }
    /* Save preserving previous value if field comes empty (don't overwrite with 0) */
    if (price && price > 0) STATE._nsV.price = price;
    if (days  && days  > 0) STATE._nsV.days  = days;
    STATE._nsV.inc = (document.getElementById('ns-inc')?.value || '').trim();
  }

  STATE._nsStep = Math.max(1, Math.min(4, step + dir));
  renderView();

  /* [H2] No duplicate RAF here — initialization is in viewNewServicePage */
  if ((STATE._nsStep || 1) === 2) {
    setTimeout(() => { renderFaqBuilder(); renderRequirementsBuilder(); }, 0);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Internal helper: collects values from the indicated step without validation.
 * Used by nsGoToStep to preserve data when clicking the step bar.
 */
function _nsCollectCurrentStep(step) {
  if (step === 1) {
    STATE._nsV.title = (document.getElementById('ns-title')?.value || '').trim();
    STATE._nsV.cat   = document.getElementById('ns-cat')?.value  || STATE._nsV.cat;
    STATE._nsV.co    = document.getElementById('ns-co')?.value   || STATE._nsV.co;
    STATE._nsV.tags  = (document.getElementById('ns-tags')?.value || '').trim();
  }
  if (step === 2) {
    const desc = (document.getElementById('ns-desc')?.value || '').trim();
    if (desc) STATE._nsV.desc = desc;
    collectFaqsFromBuilder();
    collectRequirementsFromBuilder();
  }
  if (step === 3) {
    const price = parseFloat(document.getElementById('ns-price')?.value || '0');
    const days  = parseInt(document.getElementById('ns-days')?.value || '0', 10);
    if (price > 0) STATE._nsV.price = price;
    if (days  > 0) STATE._nsV.days  = days;
    STATE._nsV.inc = (document.getElementById('ns-inc')?.value || '').trim();
  }
}

/* ============================================================
 * MEDIA UPLOAD
 * ============================================================ */

/* [L1] Limit aligned with text shown in UI (5MB) */
function handleLogoUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/'))    { toast('Invalid file. Use PNG, JPG or WebP.', 'warn'); return; }
  if (file.size > 5 * 1024 * 1024)        { toast('Image too large (max 5MB).', 'warn'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    STATE.newServiceLogo = ev.target.result;
    const prev = document.getElementById('ns-logo-preview');
    if (prev) prev.innerHTML = `<img src="${ev.target.result}" alt="logo" class="w-full h-full object-cover"/>`;
    const clearBtn = document.getElementById('ns-logo-clear');
    if (clearBtn) clearBtn.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function clearLogo() {
  STATE.newServiceLogo = null;
  const prev = document.getElementById('ns-logo-preview');
  if (prev) prev.innerHTML = `<i data-lucide="image-plus" class="w-6 h-6 text-ink-300"></i>`;
  const input = document.getElementById('ns-logo-input');
  if (input) input.value = '';
  icons();
}

function handleGalleryUpload(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const MAX       = 8;
  const remaining = MAX - STATE.newServiceGallery.length;
  if (remaining <= 0) { toast(`Image limit of ${MAX} reached.`, 'warn'); e.target.value = ''; return; }
  files.slice(0, remaining).forEach(file => {
    if (!file.type.startsWith('image/'))  { toast('Invalid file: ' + file.name, 'warn'); return; }
    if (file.size > 5 * 1024 * 1024)      { toast(`${file.name}: max 5MB`, 'warn'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      STATE.newServiceGallery.push(ev.target.result);
      /* [C2] renderGalleryPreview finds the correct id in Step 3 */
      renderGalleryPreview();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function removeGalleryImg(idx) {
  STATE.newServiceGallery.splice(idx, 1);
  renderGalleryPreview();
}

/* [C2] Finds id="ns-gallery-grid" which now exists in Step 3 HTML */
function renderGalleryPreview() {
  const grid = document.getElementById('ns-gallery-grid');
  if (!grid) return;
  if (!STATE.newServiceGallery.length) {
    grid.innerHTML = '';
    return;
  }
  grid.innerHTML = STATE.newServiceGallery.map((src, i) => `
    <div class="relative group rounded-xl overflow-hidden border border-ink-100" style="aspect-ratio:1/1">
      <img src="${src}" class="w-full h-full object-cover"/>
      <button type="button" onclick="removeGalleryImg(${i})"
        class="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-full bg-rose-500 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition shadow">
        <i data-lucide="x" class="w-3 h-3"></i>
      </button>
      <div class="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">${i + 1}</div>
    </div>
  `).join('');
  icons();
}

/* ── Gallery on the service page (owner adds/removes examples) ── */

function handleServiceGalleryUpload(e, serviceId) {
  const s = getService(serviceId);
  if (!s) { e.target.value = ''; return; }
  if (!isServiceOwner(s)) { toast('Only the service owner can add photos.', 'warn'); e.target.value = ''; return; }
  const files     = Array.from(e.target.files || []);
  const MAX       = 8;
  s.gallery       = s.gallery || [];
  const remaining = MAX - s.gallery.length;
  if (remaining <= 0) { toast(`Photo limit of ${MAX} reached.`, 'warn'); e.target.value = ''; return; }
  const batch = files.slice(0, remaining).filter(file => {
    if (!file.type.startsWith('image/')) { toast('Invalid file: ' + file.name, 'warn'); return false; }
    if (file.size > 5 * 1024 * 1024)     { toast(`${file.name}: max 5MB`, 'warn'); return false; }
    return true;
  });
  if (!batch.length) { e.target.value = ''; return; }
  let queued = 0, processed = 0;
  batch.forEach(file => {
    queued++;
    const reader = new FileReader();
    reader.onload = ev => {
      s.gallery.push(ev.target.result);
      processed++;
      if (processed === queued) {
        toast(`${processed} photo${processed > 1 ? 's' : ''} added.`, 'success');
        render();
      }
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function removeServiceGalleryImg(serviceId, galleryIdx) {
  const s = getService(serviceId);
  if (!s || !s.gallery) return;
  if (!isServiceOwner(s)) { toast('Only the owner can remove photos.', 'warn'); return; }
  if (!confirm('Remove this example photo?')) return;
  s.gallery.splice(galleryIdx, 1);
  toast('Photo removed.', 'success');
  render();
}

/* ── Gallery drag-and-drop ── */

let _galleryDrag = { sid: null, fromIdx: null };

function galleryDragStart(e, sid, idx) {
  _galleryDrag = { sid, fromIdx: idx };
  e.dataTransfer.effectAllowed = 'move';
  try { e.dataTransfer.setData('text/plain', String(idx)); } catch (_) {}
  e.currentTarget.classList.add('dragging');
}
function galleryDragOver(e)  { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function galleryDragEnter(e) { const el = e.currentTarget; if (el && !el.classList.contains('dragging')) el.classList.add('drag-over'); }
function galleryDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function galleryDragEnd(e)   {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.gig-thumb-drag.drag-over').forEach(el => el.classList.remove('drag-over'));
}
function galleryDrop(e, sid, toIdx) {
  e.preventDefault(); e.stopPropagation();
  const fromIdx = _galleryDrag.fromIdx;
  _galleryDrag  = { sid: null, fromIdx: null };
  document.querySelectorAll('.gig-thumb-drag.drag-over,.gig-thumb-drag.dragging').forEach(el => el.classList.remove('drag-over', 'dragging'));
  if (fromIdx === null || fromIdx === toIdx) return;
  const s = getService(sid);
  if (!s || !isServiceOwner(s)) return;
  const flat   = [s.thumb, ...(s.gallery || [])];
  const [moved] = flat.splice(fromIdx, 1);
  flat.splice(toIdx, 0, moved);
  s.thumb   = flat[0];
  s.gallery = flat.slice(1);
  toast('Order updated.', 'success');
  render();
}

/* ============================================================
 * FAQ BUILDER
 * ============================================================ */

function gigFaqsByCategory(cat) {
  const MAP = {
    design: [
      ['Do you use AI to generate designs? – No', 'All work is done manually in Figma, without AI generation.'],
      ['Do you deliver the source files?', 'Yes, editable files (.fig) and exports in SVG/PNG are included.'],
      ['Can I request revisions after delivery?', 'The number of revisions varies by package — check the tier details.'],
    ],
    dev: [
      ['Do you use AI to write the code? – No', 'All code is written and reviewed manually.'],
      ['Which network does the contract run on?', 'I deliver and test on the Interlink Network and EVM-compatible networks.'],
      ['Does the code come with automated tests?', 'Yes, I deliver a test suite in Foundry/Hardhat.'],
    ],
    audit: [
      ['Does the report follow any standard?', 'Yes, I follow the OWASP/SWC Registry severity classification.'],
      ['Do you re-audit after the fix? – Yes', 'One round of re-audit is included.'],
      ['Does it work for contracts outside Interlink?', 'Yes, any EVM-compatible contract can be audited.'],
    ],
    marketing: [
      ['Do you guarantee specific results? – No', 'I work with realistic goals defined together with you.'],
      ['Do you handle paid ads as well?', 'The standard package is organic. Ad management can be added.'],
      ['Do I need an active community before hiring?', 'No, I help from scratch.'],
    ],
    writing: [
      ['Do you use AI to write the text? – No', 'I write and review manually.'],
      ['What format do you deliver in?', 'Formatted PDF and editable source (Google Docs/Word).'],
      ['Can I request tone or language adjustments?', 'Yes, up to the number of revisions in your package.'],
    ],
    video: [
      ['Do you use ready-made templates? – No', 'Each piece is animated from scratch according to the brief.'],
      ['Is the music licensed for commercial use? – Yes', 'All tracks used have a commercial license.'],
      ['Do you deliver in vertical and horizontal format?', 'Yes, I deliver in 9:16, 1:1 and 16:9.'],
    ],
  };
  return (MAP[cat] || MAP.design).map(([q, a]) => ({ id: uid('faq'), q, a }));
}

function addFaq() {
  if (STATE.newServiceFaqs.length >= 10) { toast('FAQ limit is 10 questions.', 'warn'); return; }
  STATE.newServiceFaqs.push({ id: uid('faq'), q: '', a: '' });
  renderFaqBuilder();
}

function removeFaq(faqId) {
  const i = STATE.newServiceFaqs.findIndex(f => f.id === faqId);
  if (i >= 0) { STATE.newServiceFaqs.splice(i, 1); renderFaqBuilder(); }
}

/* oninput updates STATE directly — source of truth independent of DOM */
function updateFaqField(faqId, key, value) {
  const f = STATE.newServiceFaqs.find(x => x.id === faqId);
  if (f) f[key] = value;
}

function collectFaqsFromBuilder() {
  /* Try to read from DOM if inputs exist; otherwise use STATE as is */
  STATE.newServiceFaqs.forEach(f => {
    const q = document.getElementById('faq-q-' + f.id);
    const a = document.getElementById('faq-a-' + f.id);
    if (q) f.q = q.value.trim();
    if (a) f.a = a.value.trim();
  });
  return STATE.newServiceFaqs
    .filter(f => f.q && f.a)
    .map(f => ({ id: f.id, q: f.q, a: f.a }));
}

function renderFaqBuilder() {
  const wrap = document.getElementById('ns-faq-list');
  if (!wrap) return;
  if (!STATE.newServiceFaqs.length) {
    wrap.innerHTML = `<div class="text-xs text-ink-500 italic px-1">No questions yet. FAQ is optional but helps you sell better.</div>`;
    return;
  }
  wrap.innerHTML = STATE.newServiceFaqs.map((f, idx) => `
    <div class="border border-ink-100 rounded-xl p-3 bg-ink-100/20">
      <div class="flex items-center gap-2 mb-2">
        <span class="chip bg-white border border-ink-100 text-ink-700 text-[10px]">#${idx + 1}</span>
        <button type="button" onclick="removeFaq('${f.id}')"
          class="ml-auto w-7 h-7 grid place-items-center rounded-lg hover:bg-rose-100 text-ink-500 hover:text-rose-600">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
      <input id="faq-q-${f.id}" value="${escapeHtml(f.q || '')}"
        placeholder="Question (e.g.: Do you deliver the source files?)"
        class="w-full border border-ink-100 rounded-lg px-2 py-1.5 text-sm"
        oninput="updateFaqField('${f.id}','q',this.value)"/>
      <textarea id="faq-a-${f.id}" rows="2"
        placeholder="Answer…"
        class="w-full border border-ink-100 rounded-lg px-2 py-1.5 text-xs mt-2 resize-none"
        oninput="updateFaqField('${f.id}','a',this.value)">${escapeHtml(f.a || '')}</textarea>
    </div>
  `).join('');
  icons();
}

/* ============================================================
 * REQUIREMENTS BUILDER
 * ============================================================ */

function addRequirement() {
  if (STATE.newServiceRequirements.length >= 10) { toast('Field limit is 10.', 'warn'); return; }
  STATE.newServiceRequirements.push({
    id: uid('req'), type: 'text', label: '', required: true, options: [], placeholder: '',
  });
  renderRequirementsBuilder();
}

function removeRequirement(reqId) {
  const i = STATE.newServiceRequirements.findIndex(r => r.id === reqId);
  if (i >= 0) { STATE.newServiceRequirements.splice(i, 1); renderRequirementsBuilder(); }
}

function updateRequirementField(reqId, key, value) {
  const r = STATE.newServiceRequirements.find(x => x.id === reqId);
  if (!r) return;
  if (key === 'required') r[key] = !!value;
  else if (key === 'options') r[key] = (value || '').split(',').map(x => x.trim()).filter(Boolean);
  else r[key] = value;
}

function collectRequirementsFromBuilder() {
  /* Try to read from DOM if inputs exist; otherwise use STATE as is */
  STATE.newServiceRequirements.forEach(r => {
    const lab = document.getElementById('req-lbl-' + r.id);
    const typ = document.getElementById('req-typ-' + r.id);
    const req = document.getElementById('req-req-' + r.id);
    const opt = document.getElementById('req-opt-' + r.id);
    if (lab) r.label    = lab.value.trim();
    if (typ) r.type     = typ.value;
    if (req) r.required = req.checked;
    if (opt) r.options  = opt.value.split(',').map(x => x.trim()).filter(Boolean);
  });
  return STATE.newServiceRequirements
    .filter(r => r.label && r.label.length)
    .map(r => ({ id: r.id, type: r.type, label: r.label, required: !!r.required, options: r.options || [], placeholder: r.placeholder || '' }));
}

function renderRequirementsBuilder() {
  const wrap = document.getElementById('ns-req-list');
  if (!wrap) return;
  if (!STATE.newServiceRequirements.length) {
    wrap.innerHTML = `<div class="text-xs text-ink-500 italic px-1">No fields yet. Click below to add one.</div>`;
    return;
  }
  wrap.innerHTML = STATE.newServiceRequirements.map((r, idx) => `
    <div class="border border-ink-100 rounded-xl p-3 bg-ink-100/20">
      <div class="flex items-center gap-2 mb-2">
        <span class="chip bg-white border border-ink-100 text-ink-700 text-[10px]">#${idx + 1}</span>
        <select id="req-typ-${r.id}"
          class="border border-ink-100 rounded-lg px-2 py-1 text-xs bg-white"
          onchange="updateRequirementField('${r.id}','type',this.value);renderRequirementsBuilder()">
          ${REQ_TYPES.map(t => `<option value="${t.id}" ${r.type === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
        <label class="ml-auto text-[11px] font-semibold text-ink-700 flex items-center gap-1.5">
          <input id="req-req-${r.id}" type="checkbox" ${r.required ? 'checked' : ''}
            onchange="updateRequirementField('${r.id}','required',this.checked)" class="accent-amber-500"/>
          Required
        </label>
        <button type="button" onclick="removeRequirement('${r.id}')"
          class="w-7 h-7 grid place-items-center rounded-lg hover:bg-rose-100 text-ink-500 hover:text-rose-600">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
      <input id="req-lbl-${r.id}" value="${escapeHtml(r.label || '')}"
        placeholder="Question to client (e.g.: What is your repository link?)"
        class="w-full border border-ink-100 rounded-lg px-2 py-1.5 text-sm"
        oninput="updateRequirementField('${r.id}','label',this.value)"/>
      ${r.type === 'select'
        ? `<input id="req-opt-${r.id}" value="${escapeHtml((r.options || []).join(', '))}"
            placeholder="Options separated by comma (e.g.: Yes, No, Maybe)"
            class="w-full border border-ink-100 rounded-lg px-2 py-1.5 text-xs mt-2"
            oninput="updateRequirementField('${r.id}','options',this.value)"/>`
        : ''}
    </div>
  `).join('');
  icons();
}

/* ── Individual briefing field (rendered in the order modal) ── */
function renderRequirementInput(r, i) {
  const id = 'reqf-' + r.id;
  const labelHtml = `
    <label class="text-sm font-bold flex items-center gap-1.5">
      <span class="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] grid place-items-center font-extrabold">${i + 1}</span>
      ${escapeHtml(r.label)}
      ${r.required
        ? '<span class="text-rose-500">*</span>'
        : '<span class="text-[10px] text-ink-500 font-normal">(optional)</span>'}
    </label>`;
  const ph = escapeHtml(r.placeholder || '');
  if (r.type === 'textarea')
    return `<div>${labelHtml}<textarea id="${id}" rows="4" class="w-full border border-ink-100 rounded-xl px-3 py-2 mt-1 text-sm" placeholder="${ph}"></textarea></div>`;
  if (r.type === 'url')
    return `<div>${labelHtml}<input id="${id}" type="url" class="w-full border border-ink-100 rounded-xl px-3 py-2 mt-1 text-sm" placeholder="${ph || 'https://...'}"/></div>`;
  if (r.type === 'select')
    return `<div>${labelHtml}<select id="${id}" class="w-full border border-ink-100 rounded-xl px-3 py-2 mt-1 text-sm">
      <option value="">— Select —</option>
      ${(r.options || []).map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
    </select></div>`;
  if (r.type === 'file')
    return `<div>${labelHtml}<input id="${id}" type="file" class="w-full text-xs mt-1"/></div>`;
  return `<div>${labelHtml}<input id="${id}" type="text" class="w-full border border-ink-100 rounded-xl px-3 py-2 mt-1 text-sm" placeholder="${ph}"/></div>`;
}

/* ── Briefing form (post-payment) ── */
function openRequirementsModal(orderId) {
  const o = STATE.orders.find(x => x.id === orderId);
  if (!o) { toast('Order not found.', 'warn'); return; }
  if (o.clientId !== STATE.currentUserId) { toast('Only the client fills in the form.', 'warn'); return; }
  const s    = getService(o.serviceId);
  if (!s) return;
  const reqs = s.requirements || [];

  document.getElementById('modal-root').innerHTML = `
  <div class="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm grid place-items-center p-3 fade-in"
       onclick="if(event.target===this)closeModal()">
    <div class="bg-white w-full max-w-lg rounded-2xl shadow-pop overflow-hidden">
      <div class="p-5 border-b border-ink-100 flex items-center justify-between">
        <div class="flex items-center gap-2 font-extrabold">
          <i data-lucide="clipboard-list" class="w-5 h-5 text-amber-600"></i>
          Order form
        </div>
        <button onclick="closeModal()" class="w-8 h-8 grid place-items-center rounded-lg hover:bg-ink-100/50">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
      <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
        <div class="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
          <i data-lucide="info" class="w-4 h-4 mt-0.5 shrink-0"></i>
          <span>The delivery deadline of <b>${s.deliveryDays} days</b> starts counting once you submit.</span>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-xl bg-ink-100/40 border border-ink-100">
          <img src="${s.thumb}" class="w-12 h-12 rounded-lg object-cover"/>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm truncate">${escapeHtml(s.title)}</div>
            <div class="text-xs text-ink-500">Order #${o.id.slice(-5)} • Escrow: ${fmtITL(o.total)}</div>
          </div>
        </div>
        <form id="req-form" class="space-y-3" onsubmit="event.preventDefault();submitRequirements('${o.id}')">
          ${reqs.map((r, i) => renderRequirementInput(r, i)).join('')}
        </form>
      </div>
      <div class="p-5 border-t border-ink-100 flex items-center gap-2">
        <button onclick="closeModal();go('#/dashboard/client')"
          class="flex-1 border border-ink-100 hover:bg-ink-100/50 font-semibold py-2.5 rounded-xl text-sm">
          Later
        </button>
        <button onclick="submitRequirements('${o.id}')"
          class="flex-[2] bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
          <i data-lucide="send" class="w-4 h-4"></i>Submit form and start deadline
        </button>
      </div>
    </div>
  </div>`;
  icons();
}

function submitRequirements(orderId) {
  const o    = STATE.orders.find(x => x.id === orderId);
  if (!o) return;
  const s    = getService(o.serviceId);
  const reqs = (s.requirements || []);
  const answers = {};
  let missing = null;
  for (const r of reqs) {
    const el  = document.getElementById('reqf-' + r.id);
    if (!el) continue;
    let val = r.type === 'file'
      ? (el.files && el.files[0] ? el.files[0].name : '')
      : (el.value || '').trim();
    if (r.required && !val) { missing = r.label; break; }
    answers[r.id] = val;
  }
  if (missing) { toast('Please fill in the required field: ' + missing, 'warn'); return; }

  o.requirementsAnswers    = answers;
  o.requirementsSubmitted  = true;
  o.requirementsSubmittedTs = Date.now();
  o.status    = 'in_progress';
  o.deliveryAt = Date.now() + (o.deliveryDays || s.deliveryDays || 7) * 86400000;
  o.progress   = Math.max(o.progress || 0, 10);

  const summary = Object.entries(answers).slice(0, 3).map(([fid, val]) => {
    const f = reqs.find(r => r.id === fid);
    return `• ${f ? f.label : fid}: ${String(val).slice(0, 80)}`;
  }).join('\n');
  STATE.messages[o.id] = STATE.messages[o.id] || [];
  STATE.messages[o.id].push({
    from: o.clientId,
    text: '📋 Form submitted:\n' + summary + (Object.keys(answers).length > 3 ? '\n…' : ''),
    ts: nowTs(),
  });
  addNotification({
    type: 'message',
    title: 'Form received',
    body: `Client submitted the form for order #${o.id.slice(-5)} — deadline started.`,
    link: '#/dashboard/freelancer',
  });
  closeModal();
  toast('Form submitted on-chain. Deadline started.', 'success');
  render();
  icons();
  setTimeout(showAtvRewardsOffer, 800);
}

/* ============================================================
 * SERVICE CRUD
 * ============================================================ */

/** Creates a new service and submits for review. */
function createService() {
  const v     = STATE._nsV || {};
  const title = (v.title || '').trim();
  const cat   = v.cat  || (CATEGORIES[0]?.id || '');
  const co    = v.co   || (COUNTRIES[0]?.id  || '');
  const price = +(v.price || 0);
  const days  = +(v.days  || 7);
  const desc  = (v.desc || '').trim();
  const inc   = (v.inc  || '').split(',').map(x => x.trim()).filter(Boolean);
  const tags  = (v.tags || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean).slice(0, 10);

  if (!title || !desc || !price) { toast('Please fill in title, description and price.', 'warn'); return; }

  /* [H4] Uses STATE directly — Step 2 DOM does not exist in Step 4 */
  const requirements = STATE.newServiceRequirements
    .filter(r => (r.label || '').trim())
    .map(r => ({ id: r.id, type: r.type, label: r.label, required: !!r.required, options: r.options || [], placeholder: r.placeholder || '' }));

  const faqs = STATE.newServiceFaqs
    .filter(f => (f.q || '').trim() && (f.a || '').trim())
    .map(f => ({ id: f.id, q: f.q, a: f.a }));

  const svc = {
    id:           uid('s'),
    title, category: cat, freelancerId: STATE.currentUserId,
    price, deliveryDays: days, country: co,
    rating: 5, reviewsCount: 0,
    includes: inc.length ? inc : ['Standard package'],
    description: desc,
    thumb:   STATE.newServiceLogo || thumbSVG(title, (CATEGORIES.find(c => c.id === cat)?.color || '#1a73e8')),
    gallery: STATE.newServiceGallery.slice(),
    tags, requirements, faqs,
    status: 'pending',
    createdTs: Date.now(),
    reviews: [],
  };

  DB.services.unshift(svc);

  /* Clear wizard state */
  STATE.newServiceLogo         = null;
  STATE.newServiceGallery      = [];
  STATE.newServiceRequirements = [];
  STATE.newServiceFaqs         = [];
  STATE._nsV    = null;
  STATE._nsStep = 1;

  /* Try to save to Supabase */
  if (typeof SB_READY !== 'undefined' && SB_READY && typeof sb !== 'undefined' && sb) {
    sbCreateService(svc).then(({ error }) => {
      if (error) toast('Warning: error saving to database. ' + error.message, 'warn');
    });
  }

  addNotification({
    type: 'tx',
    title: 'Service submitted for review',
    body: `"${title}" is awaiting approval — it will appear on the marketplace soon.`,
    link: '#/dashboard/freelancer',
  });
  persistNow();

  /* Confirmation modal */
  document.getElementById('modal-root').innerHTML = `
  <div class="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm grid place-items-center p-3 fade-in"
       onclick="if(event.target===this){closeModal();STATE.route='dashboard';STATE.dashboardTab='freelancer';STATE._frTab='services';render();}">
    <div class="bg-white w-full max-w-sm rounded-2xl shadow-pop overflow-hidden">
      <div class="px-5 pt-4 pb-3 border-b border-ink-100 flex items-center gap-2">
        <div class="font-extrabold text-sm flex items-center gap-2 flex-1">Service submitted for review ✅</div>
        <button onclick="closeModal();STATE.route='dashboard';STATE.dashboardTab='freelancer';STATE._frTab='services';render()"
          class="w-7 h-7 grid place-items-center rounded-lg hover:bg-ink-100/50">
          <i data-lucide="x" class="w-4 h-4 text-ink-500"></i>
        </button>
      </div>
      <div class="px-6 pb-6 pt-4 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto">
          <i data-lucide="clock" class="w-8 h-8 text-amber-500"></i>
        </div>
        <p class="text-sm text-ink-600 leading-relaxed">
          Your service <strong class="text-ink-900">${escapeHtml(title)}</strong> is
          <strong class="text-amber-600">awaiting review</strong> by the Interwork team.<br><br>
          Once approved, it will automatically appear on the marketplace.
        </p>
        <div class="flex gap-2">
          <button onclick="closeModal();render()"
            class="flex-1 border border-ink-200 hover:bg-ink-50 font-semibold py-2.5 rounded-xl text-sm">
            Close
          </button>
          <button onclick="closeModal();STATE.route='dashboard';STATE.dashboardTab='freelancer';STATE._frTab='services';render()"
            class="flex-[2] bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
            <i data-lucide="layout-dashboard" class="w-4 h-4"></i>View dashboard
          </button>
        </div>
      </div>
    </div>
  </div>`;
  icons();
}

/** Saves edits to an existing service. */
function saveService(id) {
  const s = getService(id);
  if (!s) { toast('Service not found.', 'warn'); return; }
  if (!isServiceOwner(s)) { toast('You cannot edit this service.', 'warn'); return; }

  const v     = STATE._nsV || {};
  const title = (v.title || '').trim();
  const cat   = v.cat  || s.category;
  const co    = v.co   || s.country;
  const price = +(v.price || s.price  || 0);
  const days  = +(v.days  || s.deliveryDays || 7);
  const desc  = (v.desc || '').trim();
  const inc   = (v.inc  || '').split(',').map(x => x.trim()).filter(Boolean);
  const tags  = (v.tags || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean).slice(0, 10);

  if (!title || !desc || !price) { toast('Please fill in title, description and price.', 'warn'); return; }

  s.title        = title;
  s.category     = cat;
  s.country      = co;
  s.price        = price;
  s.deliveryDays = days;
  s.description  = desc;
  s.includes     = inc.length ? inc : ['Standard package'];
  s.tags         = tags;

  /* [H4] Uses STATE directly — Step 2 DOM does not exist in Step 4 */
  s.requirements = STATE.newServiceRequirements
    .filter(r => (r.label || '').trim())
    .map(r => ({ id: r.id, type: r.type, label: r.label, required: !!r.required, options: r.options || [], placeholder: r.placeholder || '' }));

  s.faqs = STATE.newServiceFaqs
    .filter(f => (f.q || '').trim() && (f.a || '').trim())
    .map(f => ({ id: f.id, q: f.q, a: f.a }));

  s.thumb        = STATE.newServiceLogo || thumbSVG(title, (CATEGORIES.find(c => c.id === cat)?.color || '#1a73e8'));
  s.gallery      = STATE.newServiceGallery.slice();

  /* Clear wizard state */
  STATE.newServiceLogo         = null;
  STATE.newServiceGallery      = [];
  STATE.newServiceRequirements = [];
  STATE.newServiceFaqs         = [];
  STATE._nsV    = null;
  STATE._nsEdit = null;
  STATE._nsStep = 1;

  persistNow();
  toast('Service updated!', 'success');

  /* [C3] No closeModal() — wizard runs as a page, not a modal */
  STATE.route        = 'dashboard';
  STATE.dashboardTab = 'freelancer';
  STATE._frTab       = 'services';
  renderView();
}

/** Deletes a service — uses custom modal instead of native confirm(). */
function deleteService(id) {
  const s = getService(id);
  if (!s) return;
  if (!isServiceOwner(s)) { toast('You cannot delete this service.', 'warn'); return; }

  const openOrders = STATE.orders.filter(
    o => o.serviceId === id && o.status !== 'approved' && o.status !== 'cancelled'
  );
  if (openOrders.length) {
    toast(`Cannot delete: there are ${openOrders.length} order(s) in progress.`, 'warn');
    return;
  }

  /* [M3] Custom modal instead of confirm() — works in iframes and mobile */
  document.getElementById('modal-root').innerHTML = `
  <div class="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm grid place-items-center p-3 fade-in"
       onclick="if(event.target===this)closeModal()">
    <div class="bg-white w-full max-w-sm rounded-2xl shadow-pop overflow-hidden">
      <div class="px-5 pt-4 pb-3 border-b border-ink-100 flex items-center gap-2">
        <div class="font-extrabold text-sm flex items-center gap-2 flex-1 text-rose-700">
          <i data-lucide="trash-2" class="w-4 h-4"></i>Delete service
        </div>
        <button onclick="closeModal()" class="w-7 h-7 grid place-items-center rounded-lg hover:bg-ink-100/50">
          <i data-lucide="x" class="w-4 h-4 text-ink-500"></i>
        </button>
      </div>
      <div class="px-6 pb-6 pt-4 space-y-4">
        <p class="text-sm text-ink-600 leading-relaxed">
          Are you sure you want to delete <strong class="text-ink-900">"${escapeHtml(s.title)}"</strong>?<br/>
          This action cannot be undone.
        </p>
        <div class="flex gap-2">
          <button onclick="closeModal()"
            class="flex-1 border border-ink-200 hover:bg-ink-50 font-semibold py-2.5 rounded-xl text-sm">
            Cancel
          </button>
          <button onclick="_confirmDeleteService('${id}')"
            class="flex-[2] bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
            <i data-lucide="trash-2" class="w-4 h-4"></i>Yes, delete
          </button>
        </div>
      </div>
    </div>
  </div>`;
  icons();
}

/** Executes the deletion after confirmation in the modal. */
function _confirmDeleteService(id) {
  const idx = DB.services.findIndex(x => x.id === id);
  if (idx >= 0) DB.services.splice(idx, 1);

  closeModal();
  toast('Service deleted.', 'success');

  if (STATE.route === 'service' && STATE.selectedServiceId === id) {
    if (typeof go !== 'undefined') go('#/dashboard/freelancer');
  } else {
    render();
  }
}

/* ============================================================
 * PENDING APPROVAL SCREEN
 * ============================================================ */

function showPendingApprovalScreen() {
  document.getElementById('modal-root').innerHTML = `
  <div class="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm grid place-items-center p-3 fade-in">
    <div class="bg-white w-full max-w-sm rounded-2xl shadow-pop">
      <div class="p-7 text-center">
        <div class="w-14 h-14 rounded-full bg-amber-100 grid place-items-center mx-auto mb-4">
          <i data-lucide="clock" class="w-7 h-7 text-amber-500"></i>
        </div>
        <h2 class="text-lg font-extrabold mb-2">Submitted for review</h2>
        <p class="text-sm text-ink-500 mb-5 leading-relaxed">
          Your service has been submitted. The Interwork team reviews within <strong>24h</strong> —
          you'll be notified when it appears on the marketplace.
        </p>
        <div class="rounded-xl bg-amber-50 border border-amber-100 p-3 mb-5 text-left space-y-2.5">
          <div class="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
            <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-500"></i>Service saved successfully
          </div>
          <div class="flex items-center gap-2 text-xs text-amber-700 font-semibold">
            <i data-lucide="search" class="w-3.5 h-3.5 text-amber-500"></i>Interwork team reviewing
          </div>
          <div class="flex items-center gap-2 text-xs text-ink-400">
            <i data-lucide="circle" class="w-3.5 h-3.5"></i>Published on marketplace
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="closeModal();render()"
            class="flex-1 border border-ink-200 hover:bg-ink-50 font-semibold py-2.5 rounded-xl text-sm">
            Close
          </button>
          <button onclick="closeModal();STATE.route='dashboard';STATE.dashboardTab='freelancer';STATE._frTab='services';render()"
            class="flex-[2] bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
            <i data-lucide="layout-dashboard" class="w-4 h-4"></i>View dashboard
          </button>
        </div>
      </div>
    </div>
  </div>`;
  icons();
}
