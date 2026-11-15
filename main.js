/**
 * Config Studio — Servers & Fleet Manager Official Plugin v1.2.4
 * Unified Fleet Manager, servers.yaml inventory, native SSH/SFTP,
 * embedded Remote Agent integration, dynamic TOTP Web Crypto,
 * context menu file deployment and LAN discovery.
 */

(function () {
  const pluginId = 'servers';

  // --- SVG Icons (Zero-Emoji Lucide System) ---
  const ICONS = {
    server: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>',
    host: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
    agent: '<svg style="width:13px;height:13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
    sftp: '<svg style="width:13px;height:13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>',
    shell: '<svg style="width:13px;height:13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
    chevron: '<svg class="cs-fleet-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>',
    plus: '<svg style="width:13px;height:13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>',
    edit: '<svg style="width:12px;height:12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>',
    trash: '<svg style="width:12px;height:12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>',
    close: '<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
    folder: '<svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>',
    send: '<svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>',
    shield: '<svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    check: '<svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
    search: '<svg style="width:13px;height:13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>',
    key: '<svg style="width:13px;height:13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>',
    warning: '<svg style="width:13px;height:13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
    arrowRight: '<svg style="width:12px;height:12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>'
  };

  // --- State ---
  let servers = [];
  let activeServerId = localStorage.getItem('cs_active_server_id') || 'localhost';
  let activeTagFilter = 'all';
  let searchQuery = '';
  let pingData = {}; // map of serverId -> { status, ms, error }
  let headerUpdateFn = null;
  let splitPanelUpdateFn = null;
  let totpInterval = null;

  // --- API Helpers ---
  async function apiFetch(url, options = {}) {
    options.headers = Object.assign(
      {
        'X-ConfigStudio-Web': '1',
        'Content-Type': 'application/json'
      },
      options.headers || {}
    );
    const res = await fetch(url, options);
    if (!res.ok) {
      let errMsg = res.statusText;
      try {
        const j = await res.json();
        if (j.error) errMsg = j.error;
      } catch (e) {}
      throw new Error(errMsg);
    }
    return res.json();
  }

  // --- Notification & Toast Safe Helper ---
  function showToast(msg, type = 'info') {
    try {
      if (window.ConfigStudio && typeof window.ConfigStudio.showNotification === 'function') {
        window.ConfigStudio.showNotification(msg, type);
      } else if (window.ConfigStudio && typeof window.ConfigStudio.showToast === 'function') {
        window.ConfigStudio.showToast(msg, type);
      } else if (window.ConfigStudio && window.ConfigStudio.ui && typeof window.ConfigStudio.ui.toast === 'function') {
        window.ConfigStudio.ui.toast(msg, type);
      } else {
        console.log(`[Toast ${type}]`, msg);
      }
    } catch (e) {
      console.warn('[Toast fallback]', msg, e);
    }
  }

  // ==========================================================================
  // TOTP Web Crypto Engine (Zero-Dependency Base32 + HMAC-SHA1)
  // ==========================================================================
  function base32Decode(str) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanStr = str.toUpperCase().replace(/=+$/, '');
    let bits = '';
    for (let i = 0; i < cleanStr.length; i++) {
      const val = alphabet.indexOf(cleanStr[i]);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }
    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
    }
    return bytes;
  }

  async function generateTOTPWebCrypto(secret, timestampSeconds = Math.floor(Date.now() / 1000)) {
    if (!secret) return '';
    try {
      const keyBytes = base32Decode(secret);
      if (keyBytes.length === 0) return '';
      const step = 30;
      const counter = Math.floor(timestampSeconds / step);

      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setBigUint64(0, BigInt(counter), false);

      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: { name: 'SHA-1' } },
        false,
        ['sign']
      );

      const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, buffer);
      const hmac = new Uint8Array(signature);

      const offset = hmac[hmac.length - 1] & 0x0f;
      const code =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

      return (code % 1000000).toString().padStart(6, '0');
    } catch (e) {
      console.warn('[generateTOTPWebCrypto error]', e);
      return '';
    }
  }

  async function getAgentAuthToken(server) {
    if (!server.connection || !server.connection.agent) return '';
    const agentCfg = server.connection.agent;
    const secretId = agentCfg.vaultSecret || ('agent:' + server.id);
    let secretVal = null;
    try {
      if (window.ConfigStudio?.secrets?.get) {
        secretVal = await window.ConfigStudio.secrets.get(secretId);
      }
    } catch (_) {}

    if (!secretVal) {
      return secretId || '';
    }

    let keyId = 'cs_master';
    let secret = '';

    if (typeof secretVal === 'object') {
      keyId = secretVal.keyId || 'cs_master';
      secret = secretVal.secret || '';
    } else if (typeof secretVal === 'string') {
      try {
        const parsed = JSON.parse(secretVal);
        keyId = parsed.keyId || 'cs_master';
        secret = parsed.secret || '';
      } catch (_) {
        if (secretVal.includes(':')) {
          const parts = secretVal.split(':');
          keyId = parts[0];
          secret = parts[1];
        } else {
          keyId = secretVal;
        }
      }
    }

    if (secret) {
      try {
        const otp = await generateTOTPWebCrypto(secret);
        return `${keyId}:${otp}`;
      } catch (e) {
        console.warn('[TOTP generation failed]', e);
        return keyId;
      }
    }
    return keyId;
  }

  // --- Ensure SSH Host is registered in Core Host Storage for SFTP & Terminal ---
  function syncSSHHost(server) {
    if (!server.connection || !server.connection.ssh) return null;
    const sshCfg = server.connection.ssh;
    const hostObj = {
      id: server.id,
      name: server.name || server.id,
      host: sshCfg.host,
      port: sshCfg.port || 22,
      user: sshCfg.user || 'root',
      identityId: sshCfg.identity || '',
      authType: sshCfg.identity ? 'vault' : 'none',
      createdAt: new Date().toISOString()
    };

    if (window.ConfigStudio && window.ConfigStudio.ssh && typeof window.ConfigStudio.ssh.save === 'function') {
      try {
        window.ConfigStudio.ssh.save(hostObj);
        window.ConfigStudio.ssh.setLastActiveHostId(hostObj.id);
      } catch (e) {
        console.warn('[syncSSHHost error]', e);
      }
    } else {
      // Direct REST API sync to Core Host Storage
      fetch('/api/hosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-ConfigStudio-Web': '1' },
        body: JSON.stringify(hostObj)
      }).catch(err => console.warn('[syncSSHHost API error]', err));
    }

    return hostObj;
  }

  async function loadServers() {
    try {
      const data = await apiFetch('/api/servers');
      servers = data.servers || [];
      if (!servers.find(s => s.id === 'localhost')) {
        servers.unshift({
          id: 'localhost',
          name: 'Localhost (Этот ПК)',
          group: 'local',
          tags: ['local']
        });
      }
      refreshUI();
      // Trigger background ping
      pingAllServers();
    } catch (err) {
      console.error('[Fleet] Failed to load servers:', err);
    }
  }

  async function pingAllServers() {
    for (const s of servers) {
      if (s.id === 'localhost') {
        pingData['localhost'] = { status: 'online', ms: 0 };
        continue;
      }
      try {
        const res = await apiFetch(`/api/servers/ping/${encodeURIComponent(s.id)}`, { method: 'POST' });
        pingData[s.id] = { status: res.status, ms: res.latencyMs };
      } catch (e) {
        pingData[s.id] = { status: 'offline', ms: null, error: e.message };
      }
    }
    refreshUI();
  }

  function refreshUI() {
    if (headerUpdateFn) headerUpdateFn();
    if (splitPanelUpdateFn) splitPanelUpdateFn();
  }

  // --- Switch Server Action ---
  async function selectServer(server, protocolMode = 'auto') {
    activeServerId = server.id;
    localStorage.setItem('cs_active_server_id', server.id);

    if (server.id === 'localhost') {
      if (totpInterval) {
        clearInterval(totpInterval);
        totpInterval = null;
      }
      window.dispatchEvent(new CustomEvent('cs:switch-sidebar-tab', { detail: 'workspaces' }));
      if (typeof window.ConfigStudio.setRemoteEndpoint === 'function') {
        window.ConfigStudio.setRemoteEndpoint(null);
      }
      if (window.ConfigStudio.sysinfo?.setActiveNode) {
        window.ConfigStudio.sysinfo.setActiveNode('localhost', 'Localhost');
      }
      if (typeof window.ConfigStudio.refreshFiles === 'function') {
        try { await window.ConfigStudio.refreshFiles(); } catch (e) {}
      }
      showToast('Переключено на локальный инстанс', 'info');
      refreshUI();
      return;
    }

    const hasAgent = Boolean(server.connection && server.connection.agent && server.connection.agent.enabled);
    const hasSSH = Boolean(server.connection && server.connection.ssh && server.connection.ssh.enabled);

    if (protocolMode === 'agent' || (protocolMode === 'auto' && hasAgent)) {
      await connectAgent(server);
    } else if (protocolMode === 'sftp' || (protocolMode === 'auto' && hasSSH)) {
      await openSFTP(server);
    } else {
      showToast(`Узел ${server.name} выбран`, 'info');
    }
    refreshUI();
  }

  async function connectAgent(server) {
    if (!server.connection || !server.connection.agent) return;
    const agentCfg = server.connection.agent;
    const url = agentCfg.url;

    if (totpInterval) {
      clearInterval(totpInterval);
      totpInterval = null;
    }

    // Switch sidebar tab back to workspaces tree so agent files are visible
    window.dispatchEvent(new CustomEvent('cs:switch-sidebar-tab', { detail: 'workspaces' }));

    const initialToken = await getAgentAuthToken(server);

    // Direct endpoint connection
    if (typeof window.ConfigStudio.setRemoteEndpoint === 'function') {
      window.ConfigStudio.setRemoteEndpoint(url, initialToken);
    }
    if (window.ConfigStudio.sysinfo?.setActiveNode) {
      window.ConfigStudio.sysinfo.setActiveNode(server.id, server.name);
    }

    // Start 15-second TOTP refresher so dynamic OTP stays valid continuously
    totpInterval = setInterval(async () => {
      if (activeServerId !== server.id) {
        clearInterval(totpInterval);
        totpInterval = null;
        return;
      }
      try {
        const freshToken = await getAgentAuthToken(server);
        if (freshToken && typeof window.ConfigStudio.setRemoteEndpoint === 'function') {
          window.ConfigStudio.setRemoteEndpoint(url, freshToken);
        }
      } catch (_) {}
    }, 15000);

    if (typeof window.ConfigStudio.refreshFiles === 'function') {
      try { await window.ConfigStudio.refreshFiles(); } catch (e) {}
    }
    showToast(`Подключено к Агенту: ${server.name}`, 'success');
  }

  async function openSFTP(server) {
    if (!server.connection || !server.connection.ssh) return;
    const sshCfg = server.connection.ssh;
    const hostObj = syncSSHHost(server);

    if (totpInterval) {
      clearInterval(totpInterval);
      totpInterval = null;
    }

    // Reset remote endpoint so workspace/local/sftp is active
    if (typeof window.ConfigStudio.setRemoteEndpoint === 'function') {
      window.ConfigStudio.setRemoteEndpoint(null);
    }

    // Switch sidebar tab to SFTP
    window.dispatchEvent(new CustomEvent('cs:switch-sidebar-tab', { detail: 'sftp' }));
    window.dispatchEvent(new CustomEvent('cs:open-sftp-host', { detail: hostObj || sshCfg }));
    if (typeof window.ConfigStudio.openSftp === 'function') {
      window.ConfigStudio.openSftp(hostObj || sshCfg);
    }
    showToast(`Открыт SFTP проводник: ${server.name}`, 'info');
  }

  async function launchShell(server) {
    if (!server.connection || !server.connection.ssh) {
      showToast(`SSH не настроен для ${server.name}`, 'error');
      return;
    }
    const sshCfg = server.connection.ssh;
    const hostObj = syncSSHHost(server);

    // Open bottom dock terminal
    window.dispatchEvent(new CustomEvent('cs:open-ssh-terminal', { detail: hostObj || sshCfg }));
    if (typeof window.ConfigStudio.openTerminal === 'function') {
      window.ConfigStudio.openTerminal(hostObj || sshCfg);
    }
    showToast(`Запуск SSH шелла к ${server.name}...`, 'info');
  }

  // --- Universal Header Switcher Component ---
  window.ConfigStudio.registerHeaderItem({
    id: 'fleet-universal-switcher',
    pluginId: pluginId,
    order: 5,
    render: (container) => {
      container.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'cs-fleet-header-container';

      let isDropdownOpen = false;

      const triggerBtn = document.createElement('button');
      triggerBtn.className = 'cs-fleet-header-btn';
      triggerBtn.title = 'Выбор рабочего узла и флота серверов';

      function renderTrigger() {
        const active = servers.find(s => s.id === activeServerId) || servers[0] || { id: 'localhost', name: 'Localhost' };
        const ping = pingData[active.id] || { status: 'online', ms: active.id === 'localhost' ? 0 : null };
        const hasAgent = Boolean(active.connection?.agent?.enabled);
        const hasSSH = Boolean(active.connection?.ssh?.enabled);

        let badgeType = 'local';
        let badgeLabel = 'LOCAL';
        if (hasAgent && hasSSH) {
          badgeType = 'hybrid';
          badgeLabel = 'AGENT + SSH';
        } else if (hasAgent) {
          badgeType = 'agent';
          badgeLabel = 'AGENT RW';
        } else if (hasSSH) {
          badgeType = 'ssh';
          badgeLabel = 'SSH ONLY';
        }

        const dotClass = ping.status === 'offline' ? 'offline' : (ping.status === 'warn' ? 'warn' : 'online');
        const iconHtml = active.id === 'localhost' ? ICONS.host : ICONS.server;

        triggerBtn.innerHTML = `
          <span class="cs-fleet-status-dot ${dotClass}"></span>
          <span>${iconHtml}</span>
          <span class="cs-fleet-name">${escapeHtml(active.name)}</span>
          <span class="cs-fleet-badge ${badgeType}">${badgeLabel}</span>
          ${ICONS.chevron}
        `;
      }

      renderTrigger();

      // Dropdown Element
      const dropdown = document.createElement('div');
      dropdown.className = 'cs-fleet-dropdown';
      dropdown.style.display = 'none';

      function renderDropdown() {
        dropdown.innerHTML = '';

        // 1. Header
        const header = document.createElement('div');
        header.className = 'cs-fleet-dropdown-header';
        header.innerHTML = `
          <div class="cs-fleet-dropdown-title">
            <span>Флот серверов (servers.yaml)</span>
            <span class="cs-fleet-count-pill">${servers.length} узлов</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="cs-fleet-add-btn" id="cs-fleet-add-node-btn">
              ${ICONS.plus} <span>Узел</span>
            </button>
          </div>
        `;
        dropdown.appendChild(header);

        header.querySelector('#cs-fleet-add-node-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          closeDropdown();
          openEditModal(null);
        });

        // 2. Filter & Tags Bar (Core PillTabs Architecture)
        const filterBar = document.createElement('div');
        filterBar.className = 'cs-fleet-filter-bar';
        filterBar.addEventListener('click', (e) => e.stopPropagation());

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'cs-fleet-search-input';
        searchInput.placeholder = 'Поиск по имени, IP или #тегу...';
        searchInput.value = searchQuery;
        searchInput.addEventListener('input', (e) => {
          searchQuery = e.target.value.toLowerCase().trim();
          renderCards();
        });
        filterBar.appendChild(searchInput);

        // Collect all distinct tags
        const allTags = new Set();
        servers.forEach(s => (s.tags || []).forEach(t => allTags.add(t)));

        // Reset filter if active tag no longer exists
        if (activeTagFilter !== 'all' && !allTags.has(activeTagFilter)) {
          activeTagFilter = 'all';
        }

        const pillTrack = document.createElement('div');
        pillTrack.className = 'cs-fleet-pill-track';
        pillTrack.setAttribute('role', 'tablist');

        // Horizontal mouse wheel scrolling for the track
        pillTrack.addEventListener('wheel', (e) => {
          if (e.deltaY !== 0 && e.deltaX === 0) {
            e.preventDefault();
            pillTrack.scrollLeft += e.deltaY;
          }
        }, { passive: false });

        const tabsMap = new Map();

        function createPillTab(id, label, count) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.role = 'tab';
          btn.className = `cs-fleet-pill-tab ${activeTagFilter === id ? 'active' : ''}`;
          btn.setAttribute('aria-selected', activeTagFilter === id ? 'true' : 'false');
          btn.innerHTML = `
            <span>${escapeHtml(label)}</span>
            <span class="cs-fleet-pill-badge">${count}</span>
          `;
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeTagFilter === id) return;
            activeTagFilter = id;
            tabsMap.forEach((tabBtn, tabId) => {
              const isSel = tabId === activeTagFilter;
              tabBtn.classList.toggle('active', isSel);
              tabBtn.setAttribute('aria-selected', isSel ? 'true' : 'false');
            });
            renderCards();
          });
          tabsMap.set(id, btn);
          return btn;
        }

        // 'All' tab
        pillTrack.appendChild(createPillTab('all', 'Все', servers.length));

        // Individual tag tabs (sorted alphabetically)
        Array.from(allTags).sort().forEach(tag => {
          const count = servers.filter(s => (s.tags || []).includes(tag)).length;
          pillTrack.appendChild(createPillTab(tag, `#${tag}`, count));
        });

        filterBar.appendChild(pillTrack);
        dropdown.appendChild(filterBar);

        // 3. Servers List Container
        const listContainer = document.createElement('div');
        listContainer.className = 'cs-fleet-list';
        dropdown.appendChild(listContainer);

        function renderCards() {
          listContainer.innerHTML = '';

          const filtered = servers.filter(s => {
            if (activeTagFilter !== 'all' && !(s.tags || []).includes(activeTagFilter)) {
              return false;
            }
            if (searchQuery) {
              const nameMatch = (s.name || '').toLowerCase().includes(searchQuery);
              const idMatch = (s.id || '').toLowerCase().includes(searchQuery);
              const hostMatch = (s.connection?.ssh?.host || '').toLowerCase().includes(searchQuery);
              const tagMatch = (s.tags || []).some(t => t.toLowerCase().includes(searchQuery));
              return nameMatch || idMatch || hostMatch || tagMatch;
            }
            return true;
          });

          if (filtered.length === 0) {
            listContainer.innerHTML = `<div style="padding:16px;text-align:center;color:#64748b;font-size:11px;">Узлы не найдены</div>`;
            return;
          }

          filtered.forEach(s => {
            const card = createServerCard(s, () => {
              closeDropdown();
            });
            listContainer.appendChild(card);
          });
        }

        renderCards();

        // 4. Footer
        const footer = document.createElement('div');
        footer.className = 'cs-fleet-dropdown-footer';
        footer.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" class="cs-fleet-yaml-link" id="cs-fleet-dropdown-batch-btn" style="background:none;border:none;cursor:pointer;color:var(--cs-srv-accent);display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:0;">
              ${ICONS.agent} <span>Массовая установка</span>
            </button>
          </div>
          <button type="button" class="cs-fleet-yaml-link" id="cs-fleet-dropdown-raw-yaml-btn" style="background:none;border:none;cursor:pointer;color:inherit;font-size:inherit;padding:0;display:inline-flex;align-items:center;gap:4px;">
            <span>servers.yaml</span> ${ICONS.arrowRight}
          </button>
        `;
        footer.querySelector('#cs-fleet-dropdown-batch-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          closeDropdown();
          openBatchInstallModal();
        });
        footer.querySelector('#cs-fleet-dropdown-raw-yaml-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          closeDropdown();
          openRawYAMLModal();
        });
        dropdown.appendChild(footer);
      }

      function toggleDropdown() {
        isDropdownOpen = !isDropdownOpen;
        wrap.classList.toggle('open', isDropdownOpen);
        if (isDropdownOpen) {
          renderDropdown();
          dropdown.style.display = 'flex';
          setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
          }, 0);
        } else {
          closeDropdown();
        }
      }

      function closeDropdown() {
        isDropdownOpen = false;
        wrap.classList.remove('open');
        dropdown.style.display = 'none';
        document.removeEventListener('click', handleClickOutside);
      }

      function handleClickOutside(e) {
        if (!wrap.contains(e.target)) {
          closeDropdown();
        }
      }

      triggerBtn.addEventListener('click', toggleDropdown);
      wrap.appendChild(triggerBtn);
      wrap.appendChild(dropdown);
      container.appendChild(wrap);

      headerUpdateFn = () => {
        renderTrigger();
      };
    }
  });

  // --- Helper to Create Server Card Element ---
  function createServerCard(s, onActionClose) {
    const card = document.createElement('div');
    const isActive = s.id === activeServerId;
    card.className = `cs-fleet-card ${isActive ? 'active' : ''}`;

    const ping = pingData[s.id] || { status: 'online', ms: s.id === 'localhost' ? 0 : null };
    const dotClass = ping.status === 'offline' ? 'offline' : (ping.status === 'warn' ? 'warn' : 'online');
    const pingText = ping.ms !== null ? `${ping.ms} ms` : (ping.status === 'offline' ? 'оффлайн' : '—');

    const hasAgent = Boolean(s.connection?.agent?.enabled);
    const hasSSH = Boolean(s.connection?.ssh?.enabled);
    const hostInfo = s.id === 'localhost' ? '127.0.0.1 • Localhost' : (s.connection?.ssh?.host || s.connection?.agent?.url || s.id);

    let badgeLabel = 'LOCAL';
    let badgeType = 'local';
    if (s.id !== 'localhost') {
      if (hasAgent && hasSSH) { badgeLabel = 'AGENT + SSH'; badgeType = 'hybrid'; }
      else if (hasAgent) { badgeLabel = 'AGENT'; badgeType = 'agent'; }
      else if (hasSSH) { badgeLabel = 'SSH'; badgeType = 'ssh'; }
      else { badgeLabel = 'OFFLINE'; badgeType = 'local'; }
    }

    card.innerHTML = `
      <div class="cs-fleet-card-top">
        <div class="cs-fleet-card-title-group">
          <span class="cs-fleet-status-dot ${dotClass}"></span>
          <span class="cs-fleet-card-name">${escapeHtml(s.name)}</span>
          <span class="cs-fleet-card-ping">${pingText}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="cs-fleet-badge ${badgeType}">${badgeLabel}</span>
          ${s.id !== 'localhost' ? `<button class="cs-fleet-edit-btn" title="Настроить">${ICONS.edit}</button>` : ''}
        </div>
      </div>
      <div class="cs-fleet-card-meta">
        <div class="cs-fleet-card-host">${escapeHtml(hostInfo)}</div>
        ${s.group ? `<div class="cs-fleet-card-group-pill">[${escapeHtml(s.group)}]</div>` : ''}
      </div>
    `;

    if (s.id !== 'localhost') {
      const editBtn = card.querySelector('.cs-fleet-edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onActionClose) onActionClose();
          openEditModal(s);
        });
      }
    }

    // Dynamic Action Buttons
    const actionsRow = document.createElement('div');
    if (s.id === 'localhost') {
      actionsRow.className = 'cs-fleet-card-actions cols-1';
      actionsRow.innerHTML = `
        <button class="cs-fleet-btn-action cs-fleet-btn-local">
          ${ICONS.host} <span>Локальные файлы</span>
        </button>
      `;
      actionsRow.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        selectServer(s);
        if (onActionClose) onActionClose();
      });
    } else if (hasAgent && hasSSH) {
      // 4 BUTTONS HYBRID (Agent, SFTP, Shell, 1-Click Upgrade)
      actionsRow.className = 'cs-fleet-card-actions cols-4';
      actionsRow.innerHTML = `
        <button class="cs-fleet-btn-action cs-fleet-btn-agent" title="Файлы через Remote Agent (быстрый REST API с TOTP)">
          ${ICONS.agent} <span>Агент</span>
        </button>
        <button class="cs-fleet-btn-action cs-fleet-btn-sftp" title="Дерево директорий SFTP (нативный SSH SFTP клиент)">
          ${ICONS.sftp} <span>SFTP</span>
        </button>
        <button class="cs-fleet-btn-action cs-fleet-btn-shell" title="Открыть SSH PTY терминал к узлу">
          ${ICONS.shell} <span>Шелл</span>
        </button>
        <button class="cs-fleet-btn-action cs-fleet-btn-upgrade" title="1-Click Обновить Remote Agent по SSH">
          <span>⟳</span>
        </button>
      `;

      actionsRow.querySelector('.cs-fleet-btn-agent').addEventListener('click', (e) => {
        e.stopPropagation();
        selectServer(s, 'agent');
        if (onActionClose) onActionClose();
      });

      actionsRow.querySelector('.cs-fleet-btn-sftp').addEventListener('click', (e) => {
        e.stopPropagation();
        selectServer(s, 'sftp');
        if (onActionClose) onActionClose();
      });

      actionsRow.querySelector('.cs-fleet-btn-shell').addEventListener('click', (e) => {
        e.stopPropagation();
        launchShell(s);
        if (onActionClose) onActionClose();
      });

      actionsRow.querySelector('.cs-fleet-btn-upgrade').addEventListener('click', (e) => {
        e.stopPropagation();
        if (onActionClose) onActionClose();
        openInstallAgentDialog(s, true);
      });
    } else if (hasSSH && !hasAgent) {
      // SSH ONLY: SFTP + Shell + Onboarding CTA
      actionsRow.className = 'cs-fleet-card-actions';
      actionsRow.innerHTML = `
        <button class="cs-fleet-btn-action cs-fleet-btn-sftp" title="SFTP проводник">
          ${ICONS.sftp} <span>SFTP</span>
        </button>
        <button class="cs-fleet-btn-action cs-fleet-btn-shell" title="SSH Шелл">
          ${ICONS.shell} <span>Шелл</span>
        </button>
        <button class="cs-fleet-btn-action cs-fleet-btn-agent" style="border-style:dashed;" title="1-Click Установка агента Config Studio по SSH">
          ${ICONS.agent} <span>+Агент</span>
        </button>
      `;

      actionsRow.querySelector('.cs-fleet-btn-sftp').addEventListener('click', (e) => {
        e.stopPropagation();
        selectServer(s, 'sftp');
        if (onActionClose) onActionClose();
      });

      actionsRow.querySelector('.cs-fleet-btn-shell').addEventListener('click', (e) => {
        e.stopPropagation();
        launchShell(s);
        if (onActionClose) onActionClose();
      });

      actionsRow.querySelector('.cs-fleet-btn-agent').addEventListener('click', (e) => {
        e.stopPropagation();
        if (onActionClose) onActionClose();
        openInstallAgentDialog(s);
      });
    } else if (hasAgent && !hasSSH) {
      // Agent Only
      actionsRow.className = 'cs-fleet-card-actions cols-1';
      actionsRow.innerHTML = `
        <button class="cs-fleet-btn-action cs-fleet-btn-agent" title="Файлы через агент">
          ${ICONS.agent} <span>Агент</span>
        </button>
      `;

      actionsRow.querySelector('.cs-fleet-btn-agent').addEventListener('click', (e) => {
        e.stopPropagation();
        selectServer(s, 'agent');
        if (onActionClose) onActionClose();
      });
    }

    card.appendChild(actionsRow);

    // Clicking card itself activates default protocol
    card.addEventListener('click', () => {
      selectServer(s, 'auto');
      if (onActionClose) onActionClose();
    });

    return card;
  }

  // ==========================================================================
  // Context Menu: Send File to Fleet Node («Отправить на узел флота...»)
  // ==========================================================================
  if (typeof window.ConfigStudio.registerContextMenu === 'function') {
    window.ConfigStudio.registerContextMenu({
      id: 'fleet-send-file',
      title: 'Отправить на узел флота...',
      group: 'fleet',
      order: 15,
      onClick: async (file) => {
        let filename = file?.name || 'config.yaml';
        let content = file?.content;
        if (content === undefined) {
          const activeFile = window.ConfigStudio.getActiveFile?.();
          if (activeFile && (!file || activeFile.name === file.name)) {
            content = window.ConfigStudio.getActiveContent?.() || activeFile.content || '';
            filename = activeFile.name;
          } else if (file?.path) {
            try {
              const res = await fetch(`/api/fs/read?path=${encodeURIComponent(file.path)}`, {
                headers: { 'X-ConfigStudio-Web': '1' }
              });
              if (res.ok) {
                const data = await res.json();
                content = data.content || '';
              }
            } catch (_) {}
          }
        }
        openSendToFleetModal(filename, content || '');
      }
    });
  }

  async function openSendToFleetModal(filename, fileContent) {
    try {
      const data = await apiFetch('/api/servers');
      if (data && data.servers) {
        servers = data.servers;
        if (!servers.find(s => s.id === 'localhost')) {
          servers.unshift({
            id: 'localhost',
            name: 'Localhost (Этот ПК)',
            group: 'local',
            tags: ['local']
          });
        }
      }
    } catch (_) {}

    const overlay = document.createElement('div');
    overlay.className = 'cs-fleet-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cs-fleet-modal-content cs-fleet-modal-md';

    // Build target server options (Localhost + All servers in fleet)
    const targetOptions = servers.map(s => {
      const isLocal = s.id === 'localhost';
      const hasAgent = Boolean(s.connection?.agent?.enabled);
      const hasSSH = Boolean(s.connection?.ssh?.enabled);
      let badge = 'LOCAL';
      let badgeColor = 'blue';
      if (!isLocal) {
        if (hasAgent && hasSSH) { badge = 'AGENT + SSH'; badgeColor = 'green'; }
        else if (hasAgent) { badge = 'AGENT'; badgeColor = 'green'; }
        else if (hasSSH) { badge = 'SSH'; badgeColor = 'purple'; }
      }
      return {
        value: s.id,
        label: s.name,
        subtitle: isLocal ? 'Локальный хост' : (s.connection?.ssh?.host || s.connection?.agent?.url || s.id),
        badge,
        badgeColor,
        statusDot: pingData[s.id]?.status === 'online' ? 'online' : 'offline',
        server: s
      };
    });

    let selectedTargetId = targetOptions[0]?.value || 'localhost';
    let targetDropdownCtrl = null;

    modal.innerHTML = `
      <div class="cs-fleet-modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          ${ICONS.send}
          <span style="font-weight:700;font-size:14px;">Отправить файл на узел флота</span>
        </div>
        <button class="cs-fleet-modal-close">${ICONS.close}</button>
      </div>

      <div class="cs-fleet-modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px;">
        <div class="cs-fleet-form-group">
          <label class="cs-fleet-form-label">Файл для отправки</label>
          <input type="text" class="cs-fleet-form-input" value="${escapeHtml(filename)}" readonly style="opacity:0.75;cursor:not-allowed;" />
        </div>

        <div class="cs-fleet-form-group">
          <label class="cs-fleet-form-label">Целевой узел назначения</label>
          <div id="fleet-send-target-container"></div>
        </div>

        <div class="cs-fleet-form-group">
          <label class="cs-fleet-form-label" id="fleet-send-dest-dir-label">Рабочая папка назначения</label>
          <div style="display:flex;gap:8px;">
            <input type="text" class="cs-fleet-form-input" id="fleet-send-dest-dir" value="/opt/test" placeholder="/opt/test" style="flex:1;" />
            <button class="cs-fleet-btn-secondary" id="fleet-send-browse-btn" type="button" style="white-space:nowrap;">
              ${ICONS.folder} <span>Обзор...</span>
            </button>
          </div>
          <div id="fleet-send-folder-picker" style="display:none;" class="cs-remote-folder-picker">
            <div id="fleet-send-picker-crumbs" class="cs-remote-breadcrumbs"></div>
            <div id="fleet-send-picker-items" style="display:flex;flex-direction:column;gap:2px;"></div>
          </div>
        </div>

        <div class="cs-fleet-form-group">
          <label class="cs-fleet-form-label">Имя файла на целевом узле</label>
          <input type="text" class="cs-fleet-form-input" id="fleet-send-dest-filename" value="${escapeHtml(filename)}" />
        </div>
      </div>

      <div class="cs-fleet-modal-footer">
        <div></div>
        <div style="display:flex;gap:8px;">
          <button class="cs-fleet-btn-secondary" id="fleet-send-cancel">Отмена</button>
          <button class="cs-fleet-btn-primary" id="fleet-send-submit">${ICONS.send} <span>Отправить</span></button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeModal = () => {
      try { targetDropdownCtrl?.destroy(); } catch (_) {}
      overlay.remove();
    };

    modal.querySelector('.cs-fleet-modal-close').addEventListener('click', closeModal);
    modal.querySelector('#fleet-send-cancel').addEventListener('click', closeModal);

    const targetContainer = modal.querySelector('#fleet-send-target-container');
    const destDirLabel = modal.querySelector('#fleet-send-dest-dir-label');
    const destDirInput = modal.querySelector('#fleet-send-dest-dir');
    const destFilenameInput = modal.querySelector('#fleet-send-dest-filename');
    const browseBtn = modal.querySelector('#fleet-send-browse-btn');
    const pickerContainer = modal.querySelector('#fleet-send-folder-picker');
    const pickerCrumbs = modal.querySelector('#fleet-send-picker-crumbs');
    const pickerItems = modal.querySelector('#fleet-send-picker-items');
    const submitBtn = modal.querySelector('#fleet-send-submit');

    function updateTargetDirState(srvId) {
      selectedTargetId = srvId;
      const srv = servers.find(s => s.id === srvId);
      if (srvId === 'localhost') {
        destDirLabel.textContent = 'Рабочая папка на хосте (Localhost)';
        destDirInput.placeholder = 'Корень рабочей области (или подпапка)';
        destDirInput.value = localStorage.getItem('cs_last_dir_local') || '';
      } else {
        destDirLabel.textContent = `Рабочая папка на ${srv?.name || srvId}`;
        destDirInput.placeholder = '/opt/test';
        destDirInput.value = localStorage.getItem(`cs_last_dir_${srvId}`) || '/opt/test';
      }
      if (pickerActive) {
        loadFolderPicker(destDirInput.value || (srvId === 'localhost' ? '' : '/'));
      }
    }

    if (window.ConfigStudio?.ui?.renderDropdown && targetContainer) {
      targetDropdownCtrl = window.ConfigStudio.ui.renderDropdown(targetContainer, {
        options: targetOptions,
        value: selectedTargetId,
        placeholder: 'Выберите целевой узел...',
        searchable: targetOptions.length > 5,
        searchPlaceholder: 'Поиск узла...',
        onChange: (val) => updateTargetDirState(val)
      });
    } else {
      targetContainer.innerHTML = `
        <select class="cs-fleet-form-select" id="fleet-send-target-select">
          ${targetOptions.map(t => `<option value="${escapeHtml(t.value)}" ${t.value === selectedTargetId ? 'selected' : ''}>${escapeHtml(t.label)} (${t.subtitle})</option>`).join('')}
        </select>
      `;
      targetContainer.querySelector('select').addEventListener('change', (e) => updateTargetDirState(e.target.value));
    }

    // Interactive Folder Picker
    let pickerActive = false;
    browseBtn.addEventListener('click', () => {
      pickerActive = !pickerActive;
      pickerContainer.style.display = pickerActive ? 'flex' : 'none';
      if (pickerActive) {
        loadFolderPicker(destDirInput.value || (selectedTargetId === 'localhost' ? '' : '/'));
      }
    });

    async function loadFolderPicker(dirPath) {
      pickerItems.innerHTML = '<div style="color:#8b949e;padding:6px;font-size:11px;">⏳ Чтение каталога...</div>';
      renderBreadcrumbs(dirPath);

      const targetServer = servers.find(s => s.id === selectedTargetId);
      let items = [];

      try {
        if (selectedTargetId === 'localhost') {
          const res = await fetch(`/api/fs/tree?path=${encodeURIComponent(dirPath)}`, {
            headers: { 'X-ConfigStudio-Web': '1' }
          });
          if (res.ok) {
            const data = await res.json();
            items = (data.items || []).filter(i => i.isDir);
          }
        } else if (targetServer?.connection?.agent?.enabled) {
          const token = await getAgentAuthToken(targetServer);
          const res = await fetch(`/api/remote-proxy/api/fs/tree?path=${encodeURIComponent(dirPath)}`, {
            headers: {
              'X-ConfigStudio-Web': '1',
              'X-Remote-Target': targetServer.connection.agent.url,
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            items = (data.items || []).filter(i => i.isDir);
          }
        }
      } catch (e) {
        console.warn('[loadFolderPicker error]', e);
      }

      pickerItems.innerHTML = '';
      if (items.length === 0) {
        pickerItems.innerHTML = '<div style="color:#8b949e;padding:6px;font-size:11px;">(Нет доступных подпапок)</div>';
        return;
      }

      items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'cs-remote-folder-item';
        row.innerHTML = `${ICONS.folder} <span>${escapeHtml(item.name)}</span>`;
        row.addEventListener('click', () => {
          let newPath = '';
          if (selectedTargetId === 'localhost') {
            newPath = dirPath ? `${dirPath.replace(/\/+$/, '')}/${item.name}` : item.name;
          } else {
            newPath = dirPath === '/' ? `/${item.name}` : `${dirPath.replace(/\/+$/, '')}/${item.name}`;
          }
          destDirInput.value = newPath;
          loadFolderPicker(newPath);
        });
        pickerItems.appendChild(row);
      });
    }

    function renderBreadcrumbs(dirPath) {
      pickerCrumbs.innerHTML = '';
      const isLocal = selectedTargetId === 'localhost';
      const rootCrumb = document.createElement('span');
      rootCrumb.className = 'cs-remote-crumb';
      rootCrumb.textContent = isLocal ? 'Корень' : '/';
      rootCrumb.addEventListener('click', () => {
        destDirInput.value = isLocal ? '' : '/';
        loadFolderPicker(isLocal ? '' : '/');
      });
      pickerCrumbs.appendChild(rootCrumb);

      if (!dirPath || dirPath === '/') return;
      const parts = dirPath.split('/').filter(Boolean);
      let cumulative = '';
      parts.forEach(part => {
        cumulative += '/' + part;
        const currentPath = isLocal ? cumulative.replace(/^\//, '') : cumulative;
        const c = document.createElement('span');
        c.className = 'cs-remote-crumb';
        c.textContent = part;
        c.addEventListener('click', () => {
          destDirInput.value = currentPath;
          loadFolderPicker(currentPath);
        });
        pickerCrumbs.appendChild(c);
      });
    }

    // Submit Send Action
    submitBtn.addEventListener('click', async () => {
      const targetDir = destDirInput.value.trim();
      const targetFilename = destFilenameInput.value.trim() || filename;
      const targetServer = servers.find(s => s.id === selectedTargetId);

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>⏳ Отправка...</span>`;

      try {
        if (selectedTargetId === 'localhost') {
          const fullPath = targetDir ? `${targetDir.replace(/\/+$/, '')}/${targetFilename}` : targetFilename;
          await apiFetch('/api/fs/write', {
            method: 'POST',
            body: JSON.stringify({ path: fullPath, content: fileContent })
          });
          localStorage.setItem('cs_last_dir_local', targetDir);
        } else if (targetServer?.connection?.agent?.enabled) {
          const token = await getAgentAuthToken(targetServer);
          const fullPath = targetDir ? `${targetDir.replace(/\/+$/, '')}/${targetFilename}` : `/${targetFilename}`;
          const res = await fetch(`/api/remote-proxy/api/fs/write`, {
            method: 'POST',
            headers: {
              'X-ConfigStudio-Web': '1',
              'X-Remote-Target': targetServer.connection.agent.url,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: fullPath, content: fileContent })
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${res.status}`);
          }
          localStorage.setItem(`cs_last_dir_${targetServer.id}`, targetDir);
        } else if (targetServer?.connection?.ssh?.enabled) {
          const fullPath = targetDir ? `${targetDir.replace(/\/+$/, '')}/${targetFilename}` : `/root/${targetFilename}`;
          await apiFetch('/api/ssh/sftp/write', {
            method: 'POST',
            body: JSON.stringify({
              host: targetServer.connection.ssh.host,
              port: targetServer.connection.ssh.port || 22,
              user: targetServer.connection.ssh.user || 'root',
              identityId: targetServer.connection.ssh.identity || '',
              path: fullPath,
              content: fileContent
            })
          });
          localStorage.setItem(`cs_last_dir_${targetServer.id}`, targetDir);
        }

        showToast(`Файл "${targetFilename}" успешно отправлен на ${targetServer?.name || 'Localhost'}!`, 'success');
        if (typeof window.ConfigStudio.refreshFiles === 'function') {
          try { await window.ConfigStudio.refreshFiles(); } catch (_) {}
        }
        closeModal();
      } catch (err) {
        showToast(`Ошибка отправки: ${err.message}`, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${ICONS.send} <span>Отправить</span>`;
      }
    });
  }


  // ==========================================================================
  // Scoped Monitoring Tokens Dialog
  // ==========================================================================
  async function openTokensModal(server) {
    if (!server.connection?.agent?.enabled) {
      showToast('Агент не настроен для данного узла', 'error');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'cs-fleet-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cs-fleet-modal-content cs-fleet-modal-md';

    modal.innerHTML = `
      <div class="cs-fleet-modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          ${ICONS.shield}
          <span style="font-weight:700;font-size:14px;">Токены мониторинга (${escapeHtml(server.name)})</span>
        </div>
        <button class="cs-fleet-modal-close">${ICONS.close}</button>
      </div>

      <div class="cs-fleet-modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px;">
        <p style="font-size:12px;color:#8b949e;margin:0;">
          Изолированные Read-Only токены для Prometheus, Grafana, Zabbix или CI/CD. Имеют доступ только к метрикам и телеметрии.
        </p>

        <div style="padding:12px;background:rgba(0,0,0,0.3);border:1px solid #30363d;border-radius:10px;display:flex;flex-direction:column;gap:10px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#00d2b4;">+ Создать токен мониторинга</div>
          <div style="display:flex;gap:8px;">
            <input type="text" id="cs-new-tok-id" class="cs-fleet-form-input" placeholder="ID (например: prometheus)" style="flex:1;" />
            <input type="text" id="cs-new-tok-desc" class="cs-fleet-form-input" placeholder="Описание" style="flex:1;" />
          </div>
          <div style="display:flex;gap:16px;font-size:12px;color:#c9d1d9;">
            <label style="cursor:pointer;"><input type="checkbox" id="top-metrics" checked style="accent-color:#00d2b4;"> metrics (Prometheus)</label>
            <label style="cursor:pointer;"><input type="checkbox" id="top-health" checked style="accent-color:#00d2b4;"> health (Uptime)</label>
          </div>
          <button type="button" id="cs-btn-create-tok" class="cs-fleet-btn-primary" style="align-self:flex-start;padding:6px 12px;font-size:11px;">Сгенерировать токен</button>
        </div>

        <div id="cs-tokens-list" style="display:flex;flex-direction:column;gap:8px;max-height:220px;overflow-y:auto;">
          <div style="text-align:center;color:#8b949e;padding:10px;font-size:12px;">⏳ Загрузка списка токенов...</div>
        </div>
      </div>

      <div class="cs-fleet-modal-footer">
        <div></div>
        <button class="cs-fleet-btn-secondary cs-fleet-modal-close">Закрыть</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();
    modal.querySelectorAll('.cs-fleet-modal-close').forEach(b => b.addEventListener('click', closeModal));

    const listContainer = modal.querySelector('#cs-tokens-list');

    async function loadTokens() {
      listContainer.innerHTML = '<div style="text-align:center;color:#8b949e;padding:10px;font-size:12px;">⏳ Загрузка списка токенов...</div>';
      try {
        const token = await getAgentAuthToken(server);
        const res = await fetch(`/api/remote-proxy/api/tokens`, {
          method: 'GET',
          headers: {
            'X-ConfigStudio-Web': '1',
            'Authorization': `Bearer ${token}`,
            'X-Remote-Target': server.connection.agent.url
          }
        });

        if (res.ok) {
          const data = await res.json();
          renderTokens(data.tokens || []);
        } else {
          listContainer.innerHTML = `<div style="color:#f87171;font-size:12px;">Не удалось загрузить токены: HTTP ${res.status}</div>`;
        }
      } catch (e) {
        listContainer.innerHTML = `<div style="color:#f87171;font-size:12px;">Ошибка связи: ${e.message}</div>`;
      }
    }

    function renderTokens(tokens) {
      if (tokens.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center;color:#8b949e;padding:10px;font-size:12px;">Нет созданных токенов мониторинга</div>';
        return;
      }
      listContainer.innerHTML = '';
      tokens.forEach(tok => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:8px 10px;background:rgba(255,255,255,0.03);border:1px solid #30363d;border-radius:8px;display:flex;justify-content:space-between;align-items:center;font-size:12px;';
        item.innerHTML = `
          <div style="min-width:0;display:flex;flex-direction:column;gap:2px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-weight:600;color:#e6edf3;">${escapeHtml(tok.id)}</span>
              <span class="cs-remote-badge ro">${escapeHtml((tok.topics || []).join(', '))}</span>
            </div>
            <div style="font-family:monospace;font-size:11px;color:#8b949e;">${escapeHtml(tok.token)}</div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="cs-copy-tok cs-fleet-btn-secondary" style="padding:3px 8px;font-size:11px;">Копировать</button>
            <button class="cs-del-tok cs-fleet-btn-danger" style="padding:3px 8px;font-size:11px;">Удалить</button>
          </div>
        `;

        item.querySelector('.cs-copy-tok').onclick = () => {
          navigator.clipboard.writeText(tok.token);
          showToast('Токен скопирован в буфер обмена!', 'success');
        };

        item.querySelector('.cs-del-tok').onclick = async () => {
          if (!confirm(`Удалить токен ${tok.id}?`)) return;
          const token = await getAgentAuthToken(server);
          await fetch(`/api/remote-proxy/api/tokens/${encodeURIComponent(tok.id)}`, {
            method: 'DELETE',
            headers: {
              'X-ConfigStudio-Web': '1',
              'Authorization': `Bearer ${token}`,
              'X-Remote-Target': server.connection.agent.url
            }
          });
          loadTokens();
        };

        listContainer.appendChild(item);
      });
    }

    modal.querySelector('#cs-btn-create-tok').onclick = async () => {
      const idInp = modal.querySelector('#cs-new-tok-id');
      const descInp = modal.querySelector('#cs-new-tok-desc');
      const id = idInp.value.trim();
      const desc = descInp.value.trim();
      if (!id) {
        showToast('Введите ID токена', 'error');
        return;
      }

      const topics = [];
      if (modal.querySelector('#top-metrics').checked) topics.push('metrics');
      if (modal.querySelector('#top-health').checked) topics.push('health');

      try {
        const token = await getAgentAuthToken(server);
        const res = await fetch(`/api/remote-proxy/api/tokens`, {
          method: 'POST',
          headers: {
            'X-ConfigStudio-Web': '1',
            'Authorization': `Bearer ${token}`,
            'X-Remote-Target': server.connection.agent.url,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id, description: desc, topics })
        });
        if (res.ok) {
          showToast(`Токен ${id} создан!`, 'success');
          idInp.value = '';
          descInp.value = '';
          loadTokens();
        } else {
          showToast(`Ошибка создания токена: HTTP ${res.status}`, 'error');
        }
      } catch (e) {
        showToast(`Ошибка: ${e.message}`, 'error');
      }
    };

    loadTokens();
  }

  // ==========================================================================
  // Modal Dialog for Add / Edit Server
  // ==========================================================================
  // ==========================================================================
  // Modal Dialog for Add / Edit Server (PLUGIN-004: Compact Single-Step Form)
  // ==========================================================================
  async function openEditModal(server) {
    const isNew = !server;
    const srv = isNew ? {
      id: '',
      name: '',
      group: 'default',
      tags: [],
      sshHostRef: '',
      connection: {
        agent: { enabled: false, port: 8085 }
      },
      rollout: { canary: false, order: 10 }
    } : JSON.parse(JSON.stringify(server));

    srv.connection = srv.connection || {};
    srv.connection.agent = srv.connection.agent || { enabled: false, port: 8085 };
    srv.rollout = srv.rollout || { canary: false, order: 10 };

    // 1. Load Core Hosts from window.ConfigStudio.ssh or /api/hosts
    let coreHosts = [];
    if (window.ConfigStudio?.ssh && typeof window.ConfigStudio.ssh.fetchFromServer === 'function') {
      try {
        const list = await window.ConfigStudio.ssh.fetchFromServer();
        if (Array.isArray(list) && list.length > 0) {
          coreHosts = list;
        }
      } catch (e) {
        console.warn('[Fleet] Failed to load hosts via ssh service:', e);
      }
    }
    if (coreHosts.length === 0 && window.ConfigStudio?.ssh && typeof window.ConfigStudio.ssh.list === 'function') {
      const list = window.ConfigStudio.ssh.list();
      if (Array.isArray(list) && list.length > 0) {
        coreHosts = list;
      }
    }
    if (coreHosts.length === 0) {
      try {
        const res = await fetch('/api/hosts', { headers: { 'X-ConfigStudio-Web': '1' } });
        if (res.ok) {
          const data = await res.json();
          coreHosts = Array.isArray(data) ? data : (data.hosts || []);
        }
      } catch (e) {
        console.warn('[Fleet] Failed to load core hosts via fetch:', e);
      }
    }

    // Auto-link existing server if it matches a core host by host/id
    if (!srv.sshHostRef) {
      const targetHost = srv.host || srv.connection?.ssh?.host;
      if (targetHost) {
        const found = coreHosts.find(h => (h.host === targetHost || h.address === targetHost || h.id === srv.id));
        if (found) srv.sshHostRef = found.id;
      }
    }

    // 2. Load available Vault secrets for dropdowns
    let vaultSecrets = [];
    try {
      if (window.ConfigStudio?.secrets && typeof window.ConfigStudio.secrets.list === 'function') {
        const list = await window.ConfigStudio.secrets.list();
        vaultSecrets = Array.isArray(list) ? list : [];
      } else {
        const res = await fetch('/api/secrets', { headers: { 'X-ConfigStudio-Web': '1' } });
        if (res.ok) {
          const data = await res.json();
          vaultSecrets = Array.isArray(data) ? data : (data.secrets || []);
        }
      }
    } catch (e) {
      console.warn('[Fleet] Failed to load secrets from Vault:', e);
    }

    const overlay = document.createElement('div');
    overlay.className = 'cs-fleet-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cs-fleet-modal-content cs-fleet-modal-md';

    let activeDropdownControllers = [];

    modal.innerHTML = `
      <div class="cs-fleet-modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          ${ICONS.server}
          <span style="font-weight:700;font-size:14px;">${isNew ? 'Добавить узел во флот' : `Настройка узла: ${escapeHtml(srv.name || srv.id)}`}</span>
        </div>
        <button class="cs-fleet-modal-close">${ICONS.close}</button>
      </div>

      <div class="cs-fleet-modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px;">
        <div id="cs-fleet-validation-error"></div>

        ${isNew ? `
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">SSH-хост из базы ядра *</label>
            <div id="srv-host-picker-container"></div>
            <div id="srv-host-preview" style="display:none;margin-top:8px;"></div>
          </div>
        ` : `
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Привязка к хосту ядра</label>
            ${srv.sshHostRef ? `
              <div class="cs-fleet-core-host-pill" style="display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <span>🖥️</span>
                  <span style="font-weight:600;">${escapeHtml(srv.sshHostRef)}</span>
                  <span style="color:var(--cs-srv-text-muted);font-size:11px;">(${escapeHtml(srv.host || srv.connection?.ssh?.host || '')}:${srv.port || srv.connection?.ssh?.port || 22})</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span class="cs-fleet-badge hybrid" style="font-size:9px;">ЯДРО</span>
                  <button type="button" class="cs-fleet-btn-secondary" id="srv-rebind-host-btn" style="padding:2px 8px;font-size:10px;">Сменить</button>
                </div>
              </div>
              <div id="srv-host-picker-container" style="display:none;margin-top:8px;"></div>
              <div id="srv-host-preview" style="display:none;margin-top:8px;"></div>
            ` : `
              <div id="srv-host-picker-container"></div>
              <div id="srv-host-preview" style="display:none;margin-top:8px;"></div>
            `}
          </div>
        `}

        <div id="srv-manual-ssh-container" style="display:none;background:rgba(255,255,255,0.02);border:1px solid var(--cs-srv-border);border-radius:8px;padding:12px;">
          <div style="font-size:11.5px;font-weight:600;margin-bottom:10px;color:var(--cs-srv-text-primary);display:flex;align-items:center;gap:6px;">
            <span>🔑</span>
            <span>Параметры прямого подключения SSH</span>
          </div>
          <div class="cs-fleet-form-grid" style="grid-template-columns: minmax(0, 2fr) 90px minmax(0, 1fr); gap: 10px;">
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">Хост / IP *</label>
              <input type="text" class="cs-fleet-form-input" id="srv-manual-host" value="${escapeHtml(srv.host || srv.connection?.ssh?.host || '')}" placeholder="192.168.1.100" />
            </div>
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">Порт</label>
              <input type="number" class="cs-fleet-form-input" id="srv-manual-port" value="${srv.port || srv.connection?.ssh?.port || 22}" placeholder="22" />
            </div>
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">Пользователь</label>
              <input type="text" class="cs-fleet-form-input" id="srv-manual-user" value="${escapeHtml(srv.user || srv.connection?.ssh?.user || 'root')}" placeholder="root" />
            </div>
          </div>
          <div class="cs-fleet-form-group" style="margin-top:10px;">
            <label class="cs-fleet-form-label">SSH-ключ из Vault</label>
            <div id="srv-manual-secret-container"></div>
          </div>
          <div class="cs-fleet-checkbox-row" style="margin-top:8px;margin-bottom:0;">
            <input type="checkbox" id="srv-manual-save-core" checked />
            <label for="srv-manual-save-core" style="font-size:11px;cursor:pointer;">Сохранить этот хост в общую базу SSH ядра (/api/hosts)</label>
          </div>
        </div>

        <div class="cs-fleet-form-grid" style="grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px;">
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">ID узла *</label>
            <input type="text" class="cs-fleet-form-input" id="srv-id" value="${escapeHtml(srv.id || '')}" ${!isNew ? 'disabled' : ''} placeholder="alpine-01" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Имя узла</label>
            <input type="text" class="cs-fleet-form-input" id="srv-name" value="${escapeHtml(srv.name || '')}" placeholder="Production VPS" />
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--cs-srv-border);border-radius:10px;padding:14px;">
          <div class="cs-fleet-checkbox-row" style="margin-bottom:0;">
            <input type="checkbox" id="srv-agent-enabled" ${srv.connection?.agent?.enabled ? 'checked' : ''} />
            <label for="srv-agent-enabled" style="font-weight:600;font-size:12px;cursor:pointer;">Подключить Remote Agent</label>
          </div>
          <div id="srv-agent-details" style="${srv.connection?.agent?.enabled ? 'display:flex;' : 'display:none;'}margin-top:12px;flex-direction:column;gap:12px;">
            <div class="cs-fleet-form-grid" style="grid-template-columns: 130px minmax(0, 1fr); gap: 12px; align-items: start;">
              <div class="cs-fleet-form-group">
                <label class="cs-fleet-form-label" style="white-space: nowrap;">Порт агента</label>
                <input type="number" class="cs-fleet-form-input" id="srv-agent-port" min="1" max="65535" value="${srv.connection?.agent?.port || 8085}" style="min-width:0;box-sizing:border-box;font-family:monospace;" />
              </div>
              <div class="cs-fleet-form-group" style="min-width:0;">
                <label class="cs-fleet-form-label">Секрет Vault (TOTP)</label>
                <div id="srv-agent-secret-container"></div>
              </div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:2px;">
              <div class="cs-fleet-form-help" id="srv-agent-url-hint" style="color:#38bdf8;margin:0;font-size:11.5px;">
                Динамический URL: http://{host}:${srv.connection?.agent?.port || 8085}
              </div>
              ${!isNew && (srv.sshHostRef || srv.connection?.ssh?.host) ? `
                <button type="button" class="cs-fleet-btn-secondary" id="cs-modal-install-agent-btn" style="padding:5px 12px;font-size:11.5px;display:inline-flex;align-items:center;gap:6px;">
                  ${ICONS.agent} <span>1-Click Установить агент</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <div>
          <div class="cs-fleet-collapsible-header" id="srv-extra-toggle">
            <span>Дополнительные параметры (группа, теги)</span>
            <span id="srv-extra-arrow">▾</span>
          </div>
          <div id="srv-extra-content" style="display:none;margin-top:10px;flex-direction:column;gap:12px;">
            <div class="cs-fleet-form-grid" style="grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px;">
              <div class="cs-fleet-form-group">
                <label class="cs-fleet-form-label">Группа / Окружение</label>
                <input type="text" class="cs-fleet-form-input" id="srv-group" value="${escapeHtml(srv.group || 'default')}" placeholder="production" />
              </div>
              <div class="cs-fleet-form-group">
                <label class="cs-fleet-form-label">Теги (через запятую)</label>
                <input type="text" class="cs-fleet-form-input" id="srv-tags" value="${escapeHtml((srv.tags || []).join(', '))}" placeholder="linux, web" />
              </div>
            </div>
            <div class="cs-fleet-checkbox-row">
              <input type="checkbox" id="srv-rollout-canary" ${srv.rollout?.canary ? 'checked' : ''} />
              <label for="srv-rollout-canary" style="font-size:11px;cursor:pointer;">Канареечный узел (Canary: первым получает конфиги)</label>
            </div>
          </div>
        </div>
      </div>

      <div class="cs-fleet-modal-footer">
        <div>
          ${!isNew && srv.id !== 'localhost' ? '<button class="cs-fleet-btn-danger" id="cs-fleet-delete-btn">Удалить</button>' : ''}
        </div>
        <div style="display:flex;gap:8px;">
          <button class="cs-fleet-btn-secondary" id="cs-fleet-cancel-btn">Отмена</button>
          <button class="cs-fleet-btn-primary" id="cs-fleet-save-btn">${isNew ? 'Добавить узел' : 'Сохранить'}</button>
        </div>
      </div>
    `;

    // Setup Host Picker and Manual SSH Container
    const hostPickerContainer = modal.querySelector('#srv-host-picker-container');
    const hostPreview = modal.querySelector('#srv-host-preview');
    const manualContainer = modal.querySelector('#srv-manual-ssh-container');
    const rebindBtn = modal.querySelector('#srv-rebind-host-btn');

    if (rebindBtn && hostPickerContainer) {
      rebindBtn.addEventListener('click', () => {
        const pill = rebindBtn.closest('.cs-fleet-core-host-pill');
        if (pill) pill.style.display = 'none';
        hostPickerContainer.style.display = 'block';
      });
    }

    let manualSecretVal = srv.identity || srv.connection?.ssh?.identity || '';
    const manualSecretContainer = modal.querySelector('#srv-manual-secret-container');
    if (manualSecretContainer) {
      const sshSecretOptions = [
        { value: '', label: '-- Без ключа (пароль / агент) --', badge: 'AUTH', badgeColor: 'default' },
        ...vaultSecrets.map(s => ({
          value: s.id,
          label: s.title || s.id,
          subtitle: s.type || 'secret',
          badge: (s.type || 'VAULT').toUpperCase(),
          badgeColor: s.type?.includes('ssh') || s.type?.includes('key') ? 'blue' : 'default'
        }))
      ];
      if (window.ConfigStudio?.ui?.renderDropdown) {
        const mCtrl = window.ConfigStudio.ui.renderDropdown(manualSecretContainer, {
          options: sshSecretOptions,
          value: manualSecretVal,
          placeholder: 'Выберите SSH-ключ из Vault...',
          onChange: (val) => { manualSecretVal = val; }
        });
        activeDropdownControllers.push(mCtrl);
      }
    }

    // If editing a node with direct SSH but no core host ref, open manual container
    if (!isNew && !srv.sshHostRef && (srv.host || srv.connection?.ssh?.host)) {
      if (manualContainer) manualContainer.style.display = 'block';
    }

    if (hostPickerContainer) {
      const options = [
        {
          value: '',
          label: '-- Выберите хост из базы ядра --',
          subtitle: coreHosts.length > 0 ? `Доступно в ядре: ${coreHosts.length} хост(ов)` : 'В базе ядра пока нет хостов',
          badge: 'CORE',
          badgeColor: 'default',
        },
        ...coreHosts.map(h => {
          const hostAddr = h.host || h.address || '';
          const hostUser = h.user || h.username || 'root';
          const hostPort = h.port || 22;
          const labelTitle = h.name ? `${h.name} (${h.id})` : h.id;
          return {
            value: h.id,
            label: labelTitle,
            subtitle: `${hostUser}@${hostAddr}:${hostPort}`,
            badge: (h.group || 'SSH').toUpperCase(),
            badgeColor: 'blue',
            statusDot: 'online'
          };
        }),
        {
          value: '__manual__',
          label: '+ Ввести параметры SSH вручную',
          subtitle: 'Указать IP, порт и ключ без привязки',
          badge: 'MANUAL',
          badgeColor: 'default',
        }
      ];

      const onHostChange = (val) => {
        if (!val) {
          if (hostPreview) hostPreview.style.display = 'none';
          if (manualContainer) manualContainer.style.display = 'none';
          srv.sshHostRef = '';
          return;
        }
        if (val === '__manual__') {
          if (hostPreview) hostPreview.style.display = 'none';
          if (manualContainer) manualContainer.style.display = 'block';
          srv.sshHostRef = '';
          return;
        }
        if (manualContainer) manualContainer.style.display = 'none';
        const selected = coreHosts.find(h => h.id === val);
        if (selected) {
          srv.sshHostRef = selected.id;
          const hostAddr = selected.host || selected.address || '';
          const hostUser = selected.user || selected.username || 'root';
          const hostPort = selected.port || 22;

          if (isNew) {
            const idInput = modal.querySelector('#srv-id');
            const nameInput = modal.querySelector('#srv-name');
            const groupInput = modal.querySelector('#srv-group');
            const tagsInput = modal.querySelector('#srv-tags');

            const defaultId = (selected.name || selected.id).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
            if (idInput && (!idInput.value || idInput.value === 'alpine-01')) {
              idInput.value = defaultId;
            }
            if (nameInput && (!nameInput.value || nameInput.value === 'Production VPS')) {
              nameInput.value = selected.name || selected.id;
            }
            if (groupInput && (!groupInput.value || groupInput.value === 'default')) {
              groupInput.value = selected.group || 'default';
            }
            if (tagsInput && !tagsInput.value && selected.tags) {
              tagsInput.value = selected.tags.join(', ');
            }

            srv.id = idInput ? idInput.value : defaultId;
            srv.name = nameInput ? nameInput.value : (selected.name || selected.id);
          }
          if (hostPreview) {
            hostPreview.style.display = 'block';
            hostPreview.innerHTML = `
              <div class="cs-fleet-core-host-pill" style="margin-top:8px;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <span>🖥️</span>
                  <span style="font-weight:600;">${escapeHtml(hostUser)}@${escapeHtml(hostAddr)}:${hostPort}</span>
                </div>
                <span class="cs-fleet-badge hybrid" style="font-size:9px;">ЯДРО</span>
              </div>
            `;
          }
          const urlHint = modal.querySelector('#srv-agent-url-hint');
          const portVal = modal.querySelector('#srv-agent-port')?.value || 8085;
          if (urlHint && hostAddr) {
            urlHint.textContent = `Динамический URL: http://${hostAddr}:${portVal}`;
          }
        }
      };

      if (window.ConfigStudio?.ui?.renderDropdown) {
        const ctrl = window.ConfigStudio.ui.renderDropdown(hostPickerContainer, {
          options,
          value: srv.sshHostRef || '',
          placeholder: 'Выберите хост из ядра...',
          searchable: options.length > 4,
          searchPlaceholder: 'Поиск хоста...',
          onChange: onHostChange
        });
        activeDropdownControllers.push(ctrl);
      } else {
        hostPickerContainer.innerHTML = `
          <select class="cs-fleet-form-select" id="srv-host-select">
            ${options.map(o => `<option value="${escapeHtml(o.value)}" ${srv.sshHostRef === o.value ? 'selected' : ''}>${escapeHtml(o.label)} ${o.subtitle ? `— ${escapeHtml(o.subtitle)}` : ''}</option>`).join('')}
          </select>
        `;
        const sel = hostPickerContainer.querySelector('#srv-host-select');
        sel.addEventListener('change', (e) => onHostChange(e.target.value));
      }

      if (srv.sshHostRef) {
        onHostChange(srv.sshHostRef);
      }
    }

    // Toggle Agent Section
    const agentCheckbox = modal.querySelector('#srv-agent-enabled');
    const agentDetails = modal.querySelector('#srv-agent-details');
    if (agentCheckbox && agentDetails) {
      agentCheckbox.addEventListener('change', () => {
        agentDetails.style.display = agentCheckbox.checked ? 'flex' : 'none';
      });
    }

    // Secret dropdown in Agent section
    const secretContainer = modal.querySelector('#srv-agent-secret-container');
    if (secretContainer) {
      // Sort secrets: agent_credentials first, then others
      const sortedSecrets = [...vaultSecrets].sort((a, b) => {
        const aIsAgent = a.type === 'agent_credentials' || (a.id && a.id.startsWith('agent:'));
        const bIsAgent = b.type === 'agent_credentials' || (b.id && b.id.startsWith('agent:'));
        if (aIsAgent && !bIsAgent) return -1;
        if (!aIsAgent && bIsAgent) return 1;
        return (a.title || a.id).localeCompare(b.title || b.id);
      });

      const secOptions = [
        {
          value: '',
          label: '(Без Vault секрета)',
          subtitle: 'Публичный или ручной токен',
          badge: 'NONE',
          badgeColor: 'default',
        },
        ...sortedSecrets.map(v => {
          const isAgent = v.type === 'agent_credentials' || (v.id && v.id.startsWith('agent:'));
          return {
            value: v.id,
            label: v.title || v.id,
            subtitle: `ID: ${v.id}`,
            badge: isAgent ? 'AGENT' : (v.type || 'secret').toUpperCase(),
            badgeColor: isAgent ? 'cyan' : (v.type === 'token' ? 'purple' : (v.type === 'password' ? 'green' : 'blue')),
            statusDot: 'online'
          };
        })
      ];

      const agentSecret = srv.connection?.agent?.vaultSecret || srv.connection?.agent?.secretRef || (vaultSecrets.find(v => v.id === `agent:${srv.id}`) ? `agent:${srv.id}` : '');
      if (window.ConfigStudio?.ui?.renderDropdown) {
        const ctrl = window.ConfigStudio.ui.renderDropdown(secretContainer, {
          options: secOptions,
          value: agentSecret,
          placeholder: 'Выберите секрет из Vault...',
          searchable: secOptions.length > 5,
          searchPlaceholder: 'Поиск секрета...',
          onChange: (val) => {
            srv.connection = srv.connection || {};
            srv.connection.agent = srv.connection.agent || {};
            srv.connection.agent.vaultSecret = val || '';
            delete srv.connection.agent.secretRef;
          }
        });
        activeDropdownControllers.push(ctrl);
      } else {
        secretContainer.innerHTML = `
          <select class="cs-fleet-form-select" id="srv-agent-secret">
            ${secOptions.map(v => `<option value="${escapeHtml(v.value)}" ${agentSecret === v.value ? 'selected' : ''}>${escapeHtml(v.label)}</option>`).join('')}
          </select>
        `;
        const sel = secretContainer.querySelector('#srv-agent-secret');
        sel.addEventListener('change', (e) => {
          srv.connection = srv.connection || {};
          srv.connection.agent = srv.connection.agent || {};
          srv.connection.agent.vaultSecret = e.target.value || '';
          delete srv.connection.agent.secretRef;
        });
      }
    }

    // 1-Click Install Agent button
    const instBtn = modal.querySelector('#cs-modal-install-agent-btn');
    if (instBtn) {
      instBtn.addEventListener('click', () => {
        closeModal();
        openInstallAgentDialog(srv);
      });
    }

    // Collapsible toggle
    const extraToggle = modal.querySelector('#srv-extra-toggle');
    const extraContent = modal.querySelector('#srv-extra-content');
    const extraArrow = modal.querySelector('#srv-extra-arrow');
    if (extraToggle && extraContent) {
      let isExtraOpen = false;
      extraToggle.addEventListener('click', () => {
        isExtraOpen = !isExtraOpen;
        extraContent.style.display = isExtraOpen ? 'flex' : 'none';
        if (extraArrow) extraArrow.textContent = isExtraOpen ? '▴' : '▾';
      });
    }

    // Close actions
    function closeModal() {
      activeDropdownControllers.forEach(c => { try { c.destroy(); } catch (_) {} });
      activeDropdownControllers = [];
      overlay.remove();
    }
    modal.querySelector('.cs-fleet-modal-close').addEventListener('click', closeModal);
    modal.querySelector('#cs-fleet-cancel-btn').addEventListener('click', closeModal);

    // Save action
    modal.querySelector('#cs-fleet-save-btn').addEventListener('click', async () => {
      const idInput = modal.querySelector('#srv-id');
      const nameInput = modal.querySelector('#srv-name');
      const groupInput = modal.querySelector('#srv-group');
      const tagsInput = modal.querySelector('#srv-tags');
      const agentEnabled = modal.querySelector('#srv-agent-enabled')?.checked || false;
      const agentPort = parseInt(modal.querySelector('#srv-agent-port')?.value, 10) || 8085;
      const canaryChecked = modal.querySelector('#srv-rollout-canary')?.checked || false;

      if (idInput && isNew) srv.id = idInput.value.trim();
      if (nameInput) srv.name = nameInput.value.trim();
      if (groupInput) srv.group = groupInput.value.trim() || 'default';
      if (tagsInput) {
        srv.tags = tagsInput.value.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
      }

      srv.connection = srv.connection || {};
      srv.connection.agent = srv.connection.agent || {};
      srv.connection.agent.enabled = agentEnabled;
      srv.connection.agent.port = agentPort;

      srv.rollout = srv.rollout || {};
      srv.rollout.canary = canaryChecked;

      const isManual = modal.querySelector('#srv-manual-ssh-container')?.style.display === 'block';
      if (isManual) {
        const mHost = modal.querySelector('#srv-manual-host')?.value.trim();
        const mPort = parseInt(modal.querySelector('#srv-manual-port')?.value, 10) || 22;
        const mUser = modal.querySelector('#srv-manual-user')?.value.trim() || 'root';
        const saveCore = modal.querySelector('#srv-manual-save-core')?.checked;

        if (!mHost) {
          showToast('Укажите хост или IP для SSH', 'error');
          return;
        }

        srv.sshHostRef = '';
        srv.host = mHost;
        srv.port = mPort;
        srv.user = mUser;
        srv.identity = manualSecretVal;
        srv.connection = srv.connection || {};
        srv.connection.ssh = {
          enabled: true,
          host: mHost,
          port: mPort,
          user: mUser,
          identity: manualSecretVal
        };

        if (saveCore) {
          try {
            const newCoreHost = {
              id: srv.id,
              name: srv.name || srv.id,
              host: mHost,
              port: mPort,
              user: mUser,
              identityId: manualSecretVal,
              authType: manualSecretVal ? 'vault' : 'none',
              group: srv.group || 'default',
              tags: srv.tags || []
            };
            if (window.ConfigStudio?.ssh?.save) {
              await window.ConfigStudio.ssh.save(newCoreHost);
            } else {
              await fetch('/api/hosts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-ConfigStudio-Web': '1' },
                body: JSON.stringify(newCoreHost)
              });
            }
          } catch (e) {
            console.warn('[Fleet] Failed to sync manual host to core:', e);
          }
        }
      }

      if (!srv.id) {
        const errBanner = modal.querySelector('#cs-fleet-validation-error');
        if (errBanner) {
          errBanner.innerHTML = `
            <div style="background:rgba(239,68,68,0.15);border:1px solid #ef4444;border-radius:8px;padding:10px 12px;color:#fca5a5;font-size:12px;display:flex;align-items:center;gap:8px;">
              <span>${ICONS.warning}</span>
              <span>Пожалуйста, укажите уникальный ID узла</span>
            </div>
          `;
        }
        showToast('Укажите ID узла', 'error');
        return;
      }

      if (!srv.sshHostRef && !isManual && !srv.connection?.ssh?.host) {
        showToast('Выберите хост из ядра или укажите параметры SSH вручную', 'error');
        return;
      }

      if (!srv.name) srv.name = srv.id;

      try {
        await apiFetch('/api/servers', {
          method: 'POST',
          body: JSON.stringify(srv)
        });
        showToast(`Узел ${srv.name} сохранен`, 'success');
        closeModal();
        await loadServers();
      } catch (err) {
        showToast(`Ошибка сохранения: ${err.message}`, 'error');
      }
    });

    // Delete action
    const delBtn = modal.querySelector('#cs-fleet-delete-btn');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        if (!confirm(`Вы действительно хотите удалить узел "${srv.name}" из servers.yaml?`)) return;
        try {
          await apiFetch(`/api/servers/${encodeURIComponent(srv.id)}`, { method: 'DELETE' });
          showToast(`Узел ${srv.name} удален`, 'info');
          if (activeServerId === srv.id) {
            selectServer({ id: 'localhost' });
          }
          closeModal();
          await loadServers();
        } catch (err) {
          showToast(`Ошибка удаления: ${err.message}`, 'error');
        }
      });
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ==========================================================================
  // Direct servers.yaml Raw Editor (Monaco Tab via Core ConfigStudio API)
  // ==========================================================================
  async function openRawYAMLModal() {
    let rawContent = '';
    try {
      const res = await fetch('/api/servers/raw', {
        headers: { 'X-ConfigStudio-Web': '1' }
      });
      if (!res.ok) {
        let errMsg = res.statusText;
        try {
          const j = await res.json();
          if (j.error) errMsg = j.error;
        } catch (_) {}
        throw new Error(errMsg);
      }
      rawContent = await res.text();
    } catch (e) {
      showToast('Ошибка загрузки servers.yaml: ' + e.message, 'error');
      return;
    }

    if (window.ConfigStudio && typeof window.ConfigStudio.openCustomTab === 'function') {
      try {
        await window.ConfigStudio.openCustomTab({
          path: 'fleet://servers.yaml',
          name: 'servers.yaml',
          content: rawContent,
          language: 'yaml',
          badge: 'FLEET',
          onSave: async (newContent) => {
            const saveRes = await fetch('/api/servers/raw', {
              method: 'PUT',
              headers: {
                'X-ConfigStudio-Web': '1',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ content: newContent })
            });
            if (!saveRes.ok) {
              let msg = saveRes.statusText;
              try {
                const j = await saveRes.json();
                if (j.error) msg = j.error;
              } catch (_) {}
              throw new Error(msg);
            }
            showToast('servers.yaml успешно сохранен', 'success');
            await loadServers();
            renderDropdown();
          }
        });
        return;
      } catch (err) {
        console.warn('[servers] openCustomTab failed, falling back to modal:', err);
      }
    }

    const overlay = document.createElement('div');
    overlay.className = 'cs-fleet-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cs-fleet-modal-content cs-fleet-modal-lg cs-fleet-modal-fixed';

    modal.innerHTML = `
      <div class="cs-fleet-modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          ${ICONS.server}
          <span style="font-weight:700;font-size:14px;">Редактирование servers.yaml</span>
        </div>
        <button class="cs-fleet-modal-close">${ICONS.close}</button>
      </div>
      <div class="cs-fleet-modal-body" style="padding:16px;">
        <textarea id="cs-fleet-yaml-textarea" class="cs-fleet-form-textarea" rows="18" style="font-family:monospace;font-size:12px;background:var(--cs-srv-bg-base);color:var(--cs-srv-text-primary);">${escapeHtml(rawContent)}</textarea>
      </div>
      <div class="cs-fleet-modal-footer">
        <div></div>
        <div style="display:flex;gap:8px;">
          <button class="cs-fleet-btn-secondary" id="cs-fleet-yaml-cancel">Отмена</button>
          <button class="cs-fleet-btn-primary" id="cs-fleet-yaml-save">Сохранить YAML</button>
        </div>
      </div>
    `;

    function closeModal() {
      overlay.remove();
    }
    modal.querySelector('.cs-fleet-modal-close').addEventListener('click', closeModal);
    modal.querySelector('#cs-fleet-yaml-cancel').addEventListener('click', closeModal);

    modal.querySelector('#cs-fleet-yaml-save').addEventListener('click', async () => {
      const newYaml = modal.querySelector('#cs-fleet-yaml-textarea').value;
      try {
        const saveRes = await fetch('/api/servers/raw', {
          method: 'PUT',
          headers: {
            'X-ConfigStudio-Web': '1',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: newYaml })
        });
        if (!saveRes.ok) {
          let msg = saveRes.statusText;
          try {
            const j = await saveRes.json();
            if (j.error) msg = j.error;
          } catch (_) {}
          throw new Error(msg);
        }
        showToast('servers.yaml обновлен', 'success');
        closeModal();
        await loadServers();
        renderDropdown();
      } catch (err) {
        showToast(`Ошибка сохранения YAML: ${err.message}`, 'error');
      }
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ==========================================================================
  // 1-Click Remote Agent Installer / Upgrader Dialog (FEAT-003)
  // ==========================================================================
  function openInstallAgentDialog(srv, isUpgrade = false) {
    const overlay = document.createElement('div');
    overlay.className = 'cs-fleet-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cs-fleet-modal-content cs-fleet-modal-lg';

    modal.innerHTML = `
      <div class="cs-fleet-modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span>${ICONS.agent}</span>
          <span style="font-weight:700;font-size:14px;">${isUpgrade ? `1-Click Обновление Remote Agent на ${escapeHtml(srv.name)}` : `1-Click Установка Remote Agent на ${escapeHtml(srv.name)}`}</span>
        </div>
        <button class="cs-fleet-modal-close">${ICONS.close}</button>
      </div>

      <div class="cs-fleet-modal-body" style="padding:16px 20px;">
        <div style="background:var(--cs-srv-bg-subtle);border:1px solid var(--cs-srv-border);border-radius:10px;padding:14px;margin-bottom:14px;font-size:12px;color:var(--cs-srv-text-primary);">
          ${isUpgrade ? `
            <div><b>Режим:</b> <span style="font-family:monospace;color:var(--cs-srv-accent);">Атомарное обновление бинарника (Upgrade)</span></div>
            <div style="margin-top:4px;color:var(--cs-srv-text-muted);">Config Studio подключится по SSH к <span style="font-family:monospace;color:var(--cs-srv-accent);">${escapeHtml(srv.connection?.ssh?.user || 'root')}@${escapeHtml(srv.connection?.ssh?.host || srv.host)}:${srv.connection?.ssh?.port || srv.port || 22}</span>, создаст резервную копию бинарника (.bak), установит новую версию, сохранит текущие ключи TOTP/Vault и перезапустит службу агента.</div>
          ` : `
            <div><b>Целевой SSH сервер:</b> <span style="font-family:monospace;color:var(--cs-srv-accent);">${escapeHtml(srv.connection?.ssh?.user || 'root')}@${escapeHtml(srv.connection?.ssh?.host || srv.host)}:${srv.connection?.ssh?.port || srv.port || 22}</span></div>
            <div style="margin-top:4px;color:var(--cs-srv-text-muted);">Config Studio автоматически подключится по SSH, определит архитектуру (Linux x86_64/arm64), скопирует бинарник по SFTP, зарегистрирует и запустит службу демона (systemd/OpenRC) и переведет узел в гибридный режим.</div>
          `}
        </div>

        <div class="cs-fleet-form-grid" style="margin-bottom:12px;">
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Порт агента</label>
            <input type="number" id="cs-install-port" class="cs-fleet-form-input" value="${srv.connection?.agent?.port || 8085}" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Система инициализации</label>
            <div id="cs-install-service-type-container"></div>
          </div>
        </div>

        <div class="cs-fleet-checkbox-row" style="margin-bottom:14px;">
          <input type="checkbox" id="cs-install-sudo" checked />
          <label for="cs-install-sudo">Использовать sudo для привилегированных команд</label>
        </div>

        <!-- Terminal Logs Window -->
        <div id="cs-install-terminal" style="background:var(--cs-srv-bg-base);border:1px solid var(--cs-srv-border);border-radius:8px;padding:12px;font-family:monospace;font-size:11px;min-height:160px;max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;color:var(--cs-srv-accent);">
          <div style="color:var(--cs-srv-text-muted);">${isUpgrade ? '[Готов к обновлению] Нажмите «Обновить агент»...' : '[Готов к установке] Нажмите «Начать установку»...'}</div>
        </div>
      </div>

      <div class="cs-fleet-modal-footer">
        <div></div>
        <div style="display:flex;gap:8px;">
          <button class="cs-fleet-btn-secondary" id="cs-install-cancel-btn">Закрыть</button>
          <button class="cs-fleet-btn-primary" id="cs-install-run-btn" style="display:inline-flex;align-items:center;gap:6px;">
            ${ICONS.agent} <span>${isUpgrade ? 'Обновить агент' : 'Начать установку'}</span>
          </button>
        </div>
      </div>
    `;

    const serviceTypeContainer = modal.querySelector('#cs-install-service-type-container');
    let serviceTypeDropdown = null;

    if (serviceTypeContainer) {
      const svcOptions = [
        { value: 'auto', label: 'Автоопределение (systemd / OpenRC)', subtitle: 'Автоматический выбор', badge: 'AUTO', badgeColor: 'blue' },
        { value: 'systemd', label: 'systemd (/etc/systemd/system)', subtitle: 'Debian, Ubuntu, RHEL, CentOS, Fedora', badge: 'LINUX', badgeColor: 'purple' },
        { value: 'openrc', label: 'OpenRC (/etc/init.d)', subtitle: 'Alpine Linux, Gentoo', badge: 'ALPINE', badgeColor: 'green' },
        { value: 'none', label: 'Без службы (nohup фоновый процесс)', subtitle: 'Временный запуск без автозагрузки', badge: 'NOHUP', badgeColor: 'amber' }
      ];

      if (window.ConfigStudio?.ui?.renderDropdown) {
        serviceTypeDropdown = window.ConfigStudio.ui.renderDropdown(serviceTypeContainer, {
          options: svcOptions,
          value: 'auto',
          placeholder: 'Выберите тип службы...'
        });
      } else {
        serviceTypeContainer.innerHTML = `
          <select id="cs-install-service-type" class="cs-fleet-form-select">
            <option value="auto">Автоопределение (systemd / OpenRC)</option>
            <option value="systemd">systemd (/etc/systemd/system)</option>
            <option value="openrc">OpenRC (/etc/init.d)</option>
            <option value="none">Без службы (nohup)</option>
          </select>
        `;
      }
    }

    function closeModal() {
      try { serviceTypeDropdown?.destroy(); } catch (_) {}
      overlay.remove();
    }
    modal.querySelector('.cs-fleet-modal-close').addEventListener('click', closeModal);
    modal.querySelector('#cs-install-cancel-btn').addEventListener('click', closeModal);

    const runBtn = modal.querySelector('#cs-install-run-btn');
    const termEl = modal.querySelector('#cs-install-terminal');
    const portInput = modal.querySelector('#cs-install-port');
    const sudoInput = modal.querySelector('#cs-install-sudo');
    const svcSelect = modal.querySelector('#cs-install-service-type');

    runBtn.addEventListener('click', async () => {
      const customPort = parseInt(portInput.value, 10) || 8085;
      const useSudo = sudoInput ? sudoInput.checked : true;
      const serviceType = serviceTypeDropdown ? serviceTypeDropdown.getValue() : (svcSelect ? svcSelect.value : 'auto');

      runBtn.disabled = true;
      runBtn.innerHTML = `<span>⏳ ${isUpgrade ? 'Обновление...' : 'Установка...'}</span>`;
      termEl.innerHTML = `<div style="color:#e2e8f0;">[1/6] Запуск процесса ${isUpgrade ? 'обновления' : 'развертывания'} на ${escapeHtml(srv.connection?.ssh?.host || srv.host)}...</div>`;

      try {
        const res = await apiFetch(`/api/servers/install-agent/${encodeURIComponent(srv.id)}`, {
          method: 'POST',
          body: JSON.stringify({
            port: customPort,
            useSudo: useSudo,
            serviceType: serviceType,
            upgradeOnly: isUpgrade
          })
        });

        if (res.logs && res.logs.length > 0) {
          termEl.innerHTML = res.logs.map(line => {
            const isSuccess = line.startsWith('✓');
            const isErr = line.toLowerCase().includes('ошибка') || line.toLowerCase().includes('error');
            const color = isSuccess ? '#34d399' : (isErr ? '#f87171' : '#a5f3fc');
            return `<div style="color:${color};margin-bottom:2px;">${escapeHtml(line)}</div>`;
          }).join('');
        }

        if (res.success) {
          termEl.innerHTML += `<div style="color:#10b981;font-weight:700;margin-top:6px;">Успешно! Демон активен на ${escapeHtml(res.agentUrl)}. ${isUpgrade ? 'Агент успешно обновлен!' : 'Узел переведен в гибридный режим!'}</div>`;
          runBtn.innerHTML = `<span>Готово</span>`;
          showToast(isUpgrade ? `Агент на ${srv.name} успешно обновлен!` : `Агент успешно установлен на ${srv.name}!`, 'success');
          await loadServers();
          setTimeout(closeModal, 1800);
        } else {
          throw new Error(res.error || 'Сбой установки агента');
        }
      } catch (err) {
        termEl.innerHTML += `<div style="color:#ef4444;font-weight:700;margin-top:6px;">Ошибка: ${escapeHtml(err.message)}</div>`;
        runBtn.disabled = false;
        runBtn.innerHTML = `<span>Повторить</span>`;
        showToast(`Ошибка: ${err.message}`, 'error');
      }
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ==========================================================================
  // Fleet Batch Provisioning Modal
  // ==========================================================================
  function openBatchInstallModal(initialSelectedIds = []) {
    const nonLocalServers = servers.filter(s => s.id !== 'localhost');
    if (nonLocalServers.length === 0) {
      showToast('В инвентаре нет удаленных серверов (только localhost)', 'warning');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'cs-fleet-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cs-fleet-modal-content cs-fleet-modal-lg cs-fleet-modal-fixed';

    let selectedMap = new Set();
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      initialSelectedIds.forEach(id => selectedMap.add(id));
    } else {
      // Default: select nodes without enabled agent
      nonLocalServers.forEach(s => {
        if (!s.connection?.agent?.enabled) {
          selectedMap.add(s.id);
        }
      });
      if (selectedMap.size === 0) {
        nonLocalServers.forEach(s => selectedMap.add(s.id));
      }
    }

    let isRunning = false;
    let eventSource = null;

    modal.innerHTML = `
      <div class="cs-fleet-modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:var(--cs-srv-accent);">${ICONS.agent}</span>
          <span style="font-weight:700;font-size:14px;">Массовая установка агента (Fleet Batch Provisioning)</span>
        </div>
        <button class="cs-fleet-modal-close">${ICONS.close}</button>
      </div>

      <div class="cs-fleet-modal-body" style="padding:16px 20px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;">
        <!-- Banner -->
        <div style="background:var(--cs-srv-bg-subtle);border:1px solid var(--cs-srv-border);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--cs-srv-text-primary);">
          Параллельное автоматическое развертывание <b>config-studio-agent</b> на выбранные серверы флота: автоопределение ОС и архитектуры, потоковая передача бинарника по SFTP, регистрация службы (systemd/OpenRC) и генерация уникальных TOTP-секретов в Core Vault.
        </div>

        <!-- Deployment Settings Form -->
        <div id="cs-batch-settings-card" style="background:var(--cs-srv-bg-base);border:1px solid var(--cs-srv-border);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:12px;">
          <div class="cs-fleet-form-grid" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));gap:10px;">
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">Порт агента</label>
              <input type="number" id="cs-batch-port" class="cs-fleet-form-input" value="8085" />
            </div>
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">Параллелизм (потоки)</label>
              <input type="number" id="cs-batch-concurrency" class="cs-fleet-form-input" value="4" min="1" max="10" />
            </div>
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">Система службы</label>
              <div id="cs-batch-service-type-container"></div>
            </div>
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;font-size:12px;color:var(--cs-srv-text-primary);">
            <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" id="cs-batch-sudo" checked />
              <span>Использовать sudo</span>
            </label>
            <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" id="cs-batch-skip-healthy" checked />
              <span>Пропускать серверы с уже активным агентом</span>
            </label>
          </div>
        </div>

        <!-- Target Servers Header & Filters -->
        <div id="cs-batch-target-header" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span style="font-weight:600;font-size:12px;color:var(--cs-srv-text-primary);">
            Целевые серверы: <span id="cs-batch-selected-count" style="color:var(--cs-srv-accent);font-weight:700;">${selectedMap.size}</span> из ${nonLocalServers.length}
          </span>
          <div style="display:flex;gap:6px;">
            <button type="button" class="cs-fleet-btn-secondary" id="cs-batch-btn-no-agent" style="padding:3px 8px;font-size:11px;">Без агента</button>
            <button type="button" class="cs-fleet-btn-secondary" id="cs-batch-btn-all" style="padding:3px 8px;font-size:11px;">Все (${nonLocalServers.length})</button>
            <button type="button" class="cs-fleet-btn-secondary" id="cs-batch-btn-none" style="padding:3px 8px;font-size:11px;">Снять</button>
          </div>
        </div>

        <!-- Target Servers List -->
        <div id="cs-batch-target-list" style="max-height:220px;overflow-y:auto;border:1px solid var(--cs-srv-border);border-radius:8px;padding:6px;background:var(--cs-srv-bg-base);display:flex;flex-direction:column;gap:4px;">
        </div>

        <!-- Execution Progress Section (Hidden initially) -->
        <div id="cs-batch-progress-section" style="display:none;flex-direction:column;gap:10px;border-top:1px solid var(--cs-srv-border);padding-top:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
            <span style="font-weight:600;color:var(--cs-srv-text-primary);" id="cs-batch-progress-title">Выполнение развертывания...</span>
            <span style="font-family:monospace;color:var(--cs-srv-accent);font-weight:700;" id="cs-batch-progress-stats">0 / ${selectedMap.size} (0%)</span>
          </div>

          <!-- Progress Bar -->
          <div style="width:100%;height:6px;background:var(--cs-srv-bg-subtle);border-radius:3px;overflow:hidden;border:1px solid var(--cs-srv-border);">
            <div id="cs-batch-progress-bar" style="height:100%;width:0%;background:var(--cs-srv-accent);transition:width 0.25s ease;"></div>
          </div>

          <!-- Live Host Execution Cards -->
          <div id="cs-batch-execution-list" style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto;padding-right:2px;">
          </div>
        </div>
      </div>

      <div class="cs-fleet-modal-footer">
        <div id="cs-batch-status-hint" style="font-size:11px;color:var(--cs-srv-text-muted);">
          Выберите целевые серверы и нажмите «Начать установку».
        </div>
        <div style="display:flex;gap:8px;">
          <button class="cs-fleet-btn-secondary" id="cs-batch-close-btn">Закрыть</button>
          <button class="cs-fleet-btn-primary" id="cs-batch-run-btn" style="display:inline-flex;align-items:center;gap:6px;">
            ${ICONS.agent} <span>Начать установку (${selectedMap.size})</span>
          </button>
        </div>
      </div>
    `;

    // Dropdown for service type
    const serviceTypeContainer = modal.querySelector('#cs-batch-service-type-container');
    let serviceTypeDropdown = null;
    const svcOptions = [
      { value: 'auto', label: 'Автоопределение (systemd / OpenRC)', subtitle: 'Автоматический выбор', badge: 'AUTO', badgeColor: 'blue' },
      { value: 'systemd', label: 'systemd (/etc/systemd/system)', subtitle: 'Debian, Ubuntu, RHEL, CentOS', badge: 'LINUX', badgeColor: 'purple' },
      { value: 'openrc', label: 'OpenRC (/etc/init.d)', subtitle: 'Alpine Linux, Gentoo', badge: 'ALPINE', badgeColor: 'green' },
      { value: 'none', label: 'Без службы (nohup процесс)', subtitle: 'Временный запуск', badge: 'NOHUP', badgeColor: 'amber' }
    ];

    if (window.ConfigStudio?.ui?.renderDropdown) {
      serviceTypeDropdown = window.ConfigStudio.ui.renderDropdown(serviceTypeContainer, {
        options: svcOptions,
        value: 'auto',
        placeholder: 'Тип службы...'
      });
    } else {
      serviceTypeContainer.innerHTML = `
        <select id="cs-batch-service-type" class="cs-fleet-form-select">
          <option value="auto">Автоопределение (systemd / OpenRC)</option>
          <option value="systemd">systemd (/etc/systemd/system)</option>
          <option value="openrc">OpenRC (/etc/init.d)</option>
          <option value="none">Без службы (nohup)</option>
        </select>
      `;
    }

    const targetListEl = modal.querySelector('#cs-batch-target-list');
    const selectedCountEl = modal.querySelector('#cs-batch-selected-count');
    const runBtn = modal.querySelector('#cs-batch-run-btn');
    const closeBtn = modal.querySelector('#cs-batch-close-btn');
    const progressSection = modal.querySelector('#cs-batch-progress-section');
    const progressBar = modal.querySelector('#cs-batch-progress-bar');
    const progressStats = modal.querySelector('#cs-batch-progress-stats');
    const executionListEl = modal.querySelector('#cs-batch-execution-list');
    const statusHint = modal.querySelector('#cs-batch-status-hint');

    function updateSelectionView() {
      selectedCountEl.textContent = selectedMap.size;
      runBtn.innerHTML = `${ICONS.agent} <span>Начать установку (${selectedMap.size})</span>`;
      runBtn.disabled = selectedMap.size === 0;

      modal.querySelectorAll('.cs-batch-host-item').forEach(row => {
        const id = row.getAttribute('data-id');
        const chk = row.querySelector('input[type="checkbox"]');
        const isSel = selectedMap.has(id);
        if (chk) chk.checked = isSel;
        row.classList.toggle('selected', isSel);
      });
    }

    function renderTargetList() {
      targetListEl.innerHTML = '';
      nonLocalServers.forEach(s => {
        const hasAgent = Boolean(s.connection?.agent?.enabled);
        const hostInfo = s.connection?.ssh?.host ? `${s.connection.ssh.user || 'root'}@${s.connection.ssh.host}:${s.connection.ssh.port || 22}` : s.id;
        const isSel = selectedMap.has(s.id);

        const row = document.createElement('div');
        row.className = `cs-batch-host-item ${isSel ? 'selected' : ''}`;
        row.setAttribute('data-id', s.id);
        row.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
            <input type="checkbox" ${isSel ? 'checked' : ''} style="cursor:pointer;" />
            <div style="min-width:0;flex:1;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-weight:600;font-size:12px;color:var(--cs-srv-text-primary);">${escapeHtml(s.name || s.id)}</span>
                <span style="font-size:10px;font-family:monospace;color:var(--cs-srv-text-muted);">${escapeHtml(s.id)}</span>
              </div>
              <div style="font-size:11px;font-family:monospace;color:var(--cs-srv-text-muted);margin-top:1px;">${escapeHtml(hostInfo)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;shrink:0;">
            ${hasAgent ? `
              <span class="cs-batch-status-pill cs-batch-status-success">✓ Агент активен</span>
            ` : `
              <span class="cs-batch-status-pill cs-batch-status-pending">Только SSH</span>
            `}
          </div>
        `;

        row.addEventListener('click', (e) => {
          if (isRunning) return;
          if (e.target.tagName !== 'INPUT') {
            const chk = row.querySelector('input[type="checkbox"]');
            chk.checked = !chk.checked;
          }
          const chk = row.querySelector('input[type="checkbox"]');
          if (chk.checked) {
            selectedMap.add(s.id);
          } else {
            selectedMap.delete(s.id);
          }
          updateSelectionView();
        });

        targetListEl.appendChild(row);
      });
    }

    renderTargetList();

    // Quick filter buttons
    modal.querySelector('#cs-batch-btn-no-agent').addEventListener('click', () => {
      if (isRunning) return;
      selectedMap.clear();
      nonLocalServers.filter(s => !s.connection?.agent?.enabled).forEach(s => selectedMap.add(s.id));
      updateSelectionView();
    });

    modal.querySelector('#cs-batch-btn-all').addEventListener('click', () => {
      if (isRunning) return;
      selectedMap.clear();
      nonLocalServers.forEach(s => selectedMap.add(s.id));
      updateSelectionView();
    });

    modal.querySelector('#cs-batch-btn-none').addEventListener('click', () => {
      if (isRunning) return;
      selectedMap.clear();
      updateSelectionView();
    });

    function closeModal() {
      if (eventSource) {
        try { eventSource.close(); } catch (_) {}
      }
      try { serviceTypeDropdown?.destroy(); } catch (_) {}
      overlay.remove();
    }

    modal.querySelector('.cs-fleet-modal-close').addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    // Host status tracking for live execution
    const hostStatusMap = new Map();

    function renderExecutionRow(st) {
      let card = executionListEl.querySelector(`[data-exec-id="${st.serverId}"]`);
      if (!card) {
        card = document.createElement('div');
        card.setAttribute('data-exec-id', st.serverId);
        card.style.cssText = 'background:var(--cs-srv-bg-base);border:1px solid var(--cs-srv-border);border-radius:8px;padding:8px 12px;font-size:11.5px;';
        executionListEl.appendChild(card);
      }

      let pillClass = 'cs-batch-status-pending';
      let pillLabel = st.step || st.status || 'В очереди';
      if (st.status === 'connecting') {
        pillClass = 'cs-batch-status-connecting';
        pillLabel = `⏳ ${st.step || 'Подключение...'}`;
      } else if (st.status === 'installing') {
        pillClass = 'cs-batch-status-installing';
        pillLabel = `⚡ ${st.step || 'Установка...'}`;
      } else if (st.status === 'success') {
        pillClass = 'cs-batch-status-success';
        pillLabel = '✓ Успешно установлен';
      } else if (st.status === 'skipped') {
        pillClass = 'cs-batch-status-skipped';
        pillLabel = '✓ Пропущен (активен)';
      } else if (st.status === 'error') {
        pillClass = 'cs-batch-status-error';
        pillLabel = `✗ ${st.error || 'Ошибка'}`;
      }

      const hasLogs = st.logs && st.logs.length > 0;
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;min-width:0;">
            <span style="font-weight:600;color:var(--cs-srv-text-primary);">${escapeHtml(st.name || st.serverId)}</span>
            <span style="font-size:11px;font-family:monospace;color:var(--cs-srv-text-muted);">${escapeHtml(st.host || '')}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;shrink:0;">
            <span class="cs-batch-status-pill ${pillClass}">${escapeHtml(pillLabel)}</span>
            ${hasLogs ? `<button type="button" class="cs-batch-log-toggle" style="background:none;border:none;cursor:pointer;color:var(--cs-srv-accent);font-size:10.5px;text-decoration:underline;">Журнал (${st.logs.length})</button>` : ''}
          </div>
        </div>
        ${hasLogs ? `
          <div class="cs-batch-log-drawer" style="display:none;margin-top:6px;background:#090d16;padding:8px;border-radius:6px;font-family:monospace;font-size:10.5px;max-height:100px;overflow-y:auto;color:#cbd5e1;line-height:1.4;">
            ${st.logs.map(l => `<div>${escapeHtml(l)}</div>`).join('')}
          </div>
        ` : ''}
      `;

      if (hasLogs) {
        const toggleBtn = card.querySelector('.cs-batch-log-toggle');
        const drawer = card.querySelector('.cs-batch-log-drawer');
        if (toggleBtn && drawer) {
          toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = drawer.style.display !== 'none';
            drawer.style.display = isOpen ? 'none' : 'block';
            toggleBtn.textContent = isOpen ? `Журнал (${st.logs.length})` : 'Скрыть журнал';
          });
        }
      }
    }

    // Run Batch Install
    runBtn.addEventListener('click', async () => {
      if (selectedMap.size === 0 || isRunning) return;

      isRunning = true;
      runBtn.disabled = true;
      runBtn.innerHTML = `<span>⏳ Установка...</span>`;
      statusHint.textContent = 'Выполняется параллельное развертывание агентов...';

      // Hide settings and target selection, show progress section
      modal.querySelector('#cs-batch-settings-card').style.display = 'none';
      modal.querySelector('#cs-batch-target-header').style.display = 'none';
      modal.querySelector('#cs-batch-target-list').style.display = 'none';
      progressSection.style.display = 'flex';

      const targetIds = Array.from(selectedMap);
      const customPort = parseInt(modal.querySelector('#cs-batch-port').value, 10) || 8085;
      const concurrency = parseInt(modal.querySelector('#cs-batch-concurrency').value, 10) || 4;
      const useSudo = modal.querySelector('#cs-batch-sudo').checked;
      const skipHealthy = modal.querySelector('#cs-batch-skip-healthy').checked;
      const serviceType = serviceTypeDropdown ? serviceTypeDropdown.getValue() : 'auto';

      targetIds.forEach(id => {
        const srv = servers.find(s => s.id === id);
        const initStatus = {
          serverId: id,
          name: srv ? srv.name : id,
          host: srv?.connection?.ssh?.host || srv?.host || id,
          status: 'pending',
          step: 'В очереди',
          logs: []
        };
        hostStatusMap.set(id, initStatus);
        renderExecutionRow(initStatus);
      });

      const totalCount = targetIds.length;
      let completedCount = 0;

      function updateOverallProgress() {
        completedCount = 0;
        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (const st of hostStatusMap.values()) {
          if (st.status === 'success') { completedCount++; successCount++; }
          else if (st.status === 'error') { completedCount++; errorCount++; }
          else if (st.status === 'skipped') { completedCount++; skippedCount++; }
        }

        const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        progressBar.style.width = `${pct}%`;
        progressStats.textContent = `${completedCount} / ${totalCount} (${pct}%) • ✓ ${successCount} | ✗ ${errorCount} | — ${skippedCount}`;
      }

      updateOverallProgress();

      // Connect via SSE GET
      const params = new URLSearchParams();
      params.set('ids', targetIds.join(','));
      params.set('port', String(customPort));
      params.set('concurrency', String(concurrency));
      params.set('useSudo', useSudo ? 'true' : 'false');
      params.set('skipHealthy', skipHealthy ? 'true' : 'false');
      params.set('serviceType', serviceType);

      const url = `/api/servers/batch-install/stream?${params.toString()}`;
      eventSource = new EventSource(url);

      eventSource.addEventListener('progress', (e) => {
        try {
          const st = JSON.parse(e.data);
          const current = hostStatusMap.get(st.serverId) || {};
          const merged = Object.assign(current, st);
          hostStatusMap.set(st.serverId, merged);
          renderExecutionRow(merged);
          updateOverallProgress();
        } catch (err) {
          console.warn('[BatchInstall] Error parsing progress event:', err);
        }
      });

      let isDone = false;

      eventSource.addEventListener('done', async (e) => {
        isDone = true;
        try {
          const summary = JSON.parse(e.data);
          progressBar.style.width = '100%';
          runBtn.innerHTML = `<span>✓ Закрыть</span>`;
          runBtn.disabled = false;
          runBtn.onclick = closeModal;
          statusHint.textContent = `Готово! Успешно: ${summary.success}, Ошибок: ${summary.failed}, Пропущено: ${summary.skipped}`;
          showToast(`Массовая установка завершена! Успешно: ${summary.success}, Ошибок: ${summary.failed}`, summary.failed > 0 ? 'warning' : 'success');
        } catch (_) {
          showToast('Массовая установка завершена!', 'success');
        }
        eventSource.close();
        eventSource = null;
        isRunning = false;
        await loadServers();
      });

      eventSource.addEventListener('error', () => {
        if (isDone) return;
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        isRunning = false;
        runBtn.innerHTML = `<span>Закрыть</span>`;
        runBtn.disabled = false;
        runBtn.onclick = closeModal;
        statusHint.textContent = 'Связь с сервером завершена.';
        loadServers();
      });
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ==========================================================================
  // Register Sidebar Split Panel
  // ==========================================================================
  if (typeof window.ConfigStudio.registerSplitPanel === 'function') {
    window.ConfigStudio.registerSplitPanel({
      id: 'fleet-sidebar-panel',
      pluginId: pluginId,
      title: 'Флот серверов',
      icon: 'server',
      order: 3,
      render: (container) => {
        container.innerHTML = '';
        const panel = document.createElement('div');
        panel.className = 'cs-fleet-sidebar-container';

        function renderSidebar() {
          panel.innerHTML = `
            <div class="cs-fleet-sidebar-header">
              <span style="font-weight:700;font-size:12px;">Узлы инвентаря</span>
              <div style="display:flex;gap:6px;">
                <button class="cs-fleet-btn-secondary" id="cs-fleet-sidebar-batch-btn" title="Массовая установка агента" style="padding:4px 8px;font-size:11px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;">
                  ${ICONS.agent} <span>Массовая установка</span>
                </button>
                <button class="cs-fleet-add-btn" id="cs-fleet-sidebar-add-btn">${ICONS.plus} <span>Добавить</span></button>
              </div>
            </div>
            <div class="cs-fleet-sidebar-body" id="cs-fleet-sidebar-list"></div>
          `;

          panel.querySelector('#cs-fleet-sidebar-batch-btn')?.addEventListener('click', () => {
            openBatchInstallModal();
          });

          panel.querySelector('#cs-fleet-sidebar-add-btn').addEventListener('click', () => {
            openEditModal(null);
          });

          const listEl = panel.querySelector('#cs-fleet-sidebar-list');
          servers.forEach(s => {
            const card = createServerCard(s, null);
            listEl.appendChild(card);
          });
        }

        renderSidebar();
        container.appendChild(panel);
        splitPanelUpdateFn = renderSidebar;
      }
    });
  }

  // ==========================================================================
  // Inter-Plugin Service Registration
  // ==========================================================================
  if (window.ConfigStudio.services && typeof window.ConfigStudio.services.register === 'function') {
    window.ConfigStudio.services.register(
      'fleet-manager',
      {
        getServers: () => [...servers],
        getActiveServer: () => servers.find(s => s.id === activeServerId) || servers[0],
        switchServer: (id) => {
          const target = servers.find(s => s.id === id);
          if (target) selectServer(target);
        },
        pingServer: async (id) => {
          return await apiFetch(`/api/servers/ping/${encodeURIComponent(id)}`, { method: 'POST' });
        },
        openBatchInstall: (ids) => {
          openBatchInstallModal(ids);
        }
      },
      pluginId
    );
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial load
  loadServers();
})();
