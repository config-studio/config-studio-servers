/**
 * Config Studio — Servers & Fleet Manager Official Plugin v1.2.0
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
    check: '<svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
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

  // --- Ensure SSH Host is registered for SFTP & Terminal ---
  function syncSSHHost(server) {
    if (!server.connection || !server.connection.ssh) return null;
    const sshCfg = server.connection.ssh;
    const hostObj = {
      id: 'host-' + server.id,
      name: server.name,
      host: sshCfg.host,
      port: sshCfg.port || 22,
      user: sshCfg.user || 'root',
      identityId: sshCfg.identity || '',
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
      const hostKey = 'cs_ssh_hosts_v1';
      let hosts = [];
      try {
        hosts = JSON.parse(localStorage.getItem(hostKey) || '[]');
      } catch (e) {}

      const idx = hosts.findIndex(h => h.id === hostObj.id || (h.host === sshCfg.host && h.user === (sshCfg.user || 'root')));
      if (idx >= 0) {
        hosts[idx] = Object.assign(hosts[idx], hostObj);
      } else {
        hosts.push(hostObj);
      }

      try {
        localStorage.setItem(hostKey, JSON.stringify(hosts));
        localStorage.setItem('cs_ssh_last_host_id', hostObj.id);
      } catch (e) {}
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
            <button class="cs-fleet-add-btn" id="cs-fleet-lan-scan-btn" title="Поиск агентов в LAN">
              🔍 <span>LAN</span>
            </button>
            <button class="cs-fleet-add-btn" id="cs-fleet-add-node-btn">
              ${ICONS.plus} <span>Узел</span>
            </button>
          </div>
        `;
        dropdown.appendChild(header);

        header.querySelector('#cs-fleet-lan-scan-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          closeDropdown();
          openDiscoveryModal();
        });

        header.querySelector('#cs-fleet-add-node-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          closeDropdown();
          openEditModal(null);
        });

        // 2. Filter & Tags Bar
        const filterBar = document.createElement('div');
        filterBar.className = 'cs-fleet-filter-bar';

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

        const tagsScroll = document.createElement('div');
        tagsScroll.className = 'cs-fleet-tags-scroll';

        const allPill = document.createElement('button');
        allPill.className = `cs-fleet-tag-pill ${activeTagFilter === 'all' ? 'active' : ''}`;
        allPill.textContent = `Все (${servers.length})`;
        allPill.addEventListener('click', () => {
          activeTagFilter = 'all';
          renderDropdown();
        });
        tagsScroll.appendChild(allPill);

        allTags.forEach(tag => {
          const count = servers.filter(s => (s.tags || []).includes(tag)).length;
          const pill = document.createElement('button');
          pill.className = `cs-fleet-tag-pill ${activeTagFilter === tag ? 'active' : ''}`;
          pill.textContent = `#${tag} (${count})`;
          pill.addEventListener('click', () => {
            activeTagFilter = tag;
            renderDropdown();
          });
          tagsScroll.appendChild(pill);
        });

        filterBar.appendChild(tagsScroll);
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
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="cs-fleet-status-dot online"></span>
            <span>Готов к работе</span>
          </div>
          <span class="cs-fleet-yaml-link">servers.yaml ➔</span>
        `;
        footer.querySelector('.cs-fleet-yaml-link').addEventListener('click', (e) => {
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
        ${s.group ? `<div style="color:#00d2b4;font-size:10px;font-family:monospace;">[${escapeHtml(s.group)}]</div>` : ''}
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
      // 3 BUTTONS HYBRID (Agent, SFTP, Shell)
      actionsRow.className = 'cs-fleet-card-actions';
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
          <span>⚡ +Агент</span>
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
  // Context Menu: Send File to Fleet Node («📁 Отправить на узел флота...»)
  // ==========================================================================
  if (typeof window.ConfigStudio.registerContextMenu === 'function') {
    window.ConfigStudio.registerContextMenu({
      id: 'fleet-send-file',
      title: '📁 Отправить на узел флота...',
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
    const overlay = document.createElement('div');
    overlay.className = 'cs-fleet-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cs-fleet-modal-content';
    modal.style.maxWidth = '520px';

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
  // LAN Broadcast & Subnet Discovery Engine
  // ==========================================================================
  function detectDefaultSubnet() {
    for (const s of servers) {
      const match = (s.connection?.ssh?.host || s.connection?.agent?.url || '').match(/(\d+\.\d+\.\d+)\.\d+/);
      if (match) return match[1];
    }
    const hostMatch = window.location.hostname.match(/^(\d+\.\d+\.\d+)\.\d+$/);
    if (hostMatch) return hostMatch[1];
    return '192.168.0';
  }

  let isScanning = false;
  async function scanSubnet(subnet = '192.168.0', onFound = null) {
    if (isScanning) return [];
    isScanning = true;
    const cleanSubnet = subnet.replace(/\.$/, '');
    const found = [];
    const batchSize = 32;

    for (let start = 1; start <= 254; start += batchSize) {
      const end = Math.min(start + batchSize - 1, 254);
      const batch = [];
      for (let i = start; i <= end; i++) {
        const ip = `${cleanSubnet}.${i}`;
        const targetUrl = `http://${ip}:8085`;
        batch.push(
          fetch(`/api/remote-proxy/health`, {
            headers: {
              'X-ConfigStudio-Web': '1',
              'X-Remote-Target': targetUrl
            },
            signal: AbortSignal.timeout(750)
          })
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json().catch(() => null);
              if (data && data.status === 'ok') {
                const item = {
                  ip,
                  url: targetUrl,
                  hostname: data.hostname || ip,
                  version: data.version,
                  uptime: data.uptime,
                  adopted: data.adopted === undefined ? true : !!data.adopted
                };
                found.push(item);
                if (typeof onFound === 'function') onFound(item);
              }
            }
          })
          .catch(() => {})
        );
      }
      await Promise.allSettled(batch);
    }

    isScanning = false;
    return found;
  }

  async function adoptDiscoveredAgent(agent) {
    showToast(`Сопряжение с узлом ${agent.hostname}...`, 'info');
    try {
      const res = await fetch(`/api/remote-proxy/api/adopt`, {
        method: 'POST',
        headers: {
          'X-ConfigStudio-Web': '1',
          'X-Remote-Target': agent.url,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = `HTTP ${res.status}`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error) errMsg = parsed.error;
        } catch (_) {
          if (errText) errMsg = errText;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (!data.keyId || !data.secret) {
        throw new Error('Узел не предоставил учетные данные');
      }

      const srvId = 'agent-' + agent.ip.replace(/\./g, '-');
      const vaultSecretId = `agent:${srvId}`;

      // 1. Save credentials to Core Vault
      if (window.ConfigStudio?.secrets?.set) {
        await window.ConfigStudio.secrets.set({
          id: vaultSecretId,
          title: `Remote Agent: ${data.hostname || agent.hostname || agent.ip}`,
          type: 'token',
          scope: 'shared',
          pluginId: pluginId,
          value: JSON.stringify({ keyId: data.keyId, secret: data.secret })
        });
      }

      // 2. Add node to servers.yaml
      const newNode = {
        id: srvId,
        name: data.hostname || agent.hostname || agent.ip,
        group: 'discovered',
        tags: ['agent', 'lan'],
        connection: {
          agent: {
            enabled: true,
            url: agent.url,
            vaultSecret: vaultSecretId,
            tlsVerify: false
          }
        },
        rollout: { canary: false, order: 10 }
      };

      await apiFetch('/api/servers', {
        method: 'POST',
        body: JSON.stringify(newNode)
      });

      showToast(`Узел ${newNode.name} успешно принят во флот!`, 'success');
      await loadServers();
      return true;
    } catch (e) {
      showToast(`Ошибка сопряжения: ${e.message}`, 'error');
      return false;
    }
  }

  function openDiscoveryModal() {
    const overlay = document.createElement('div');
    overlay.className = 'cs-fleet-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cs-fleet-modal-content';
    modal.style.maxWidth = '580px';

    const defaultSubnet = detectDefaultSubnet();

    modal.innerHTML = `
      <div class="cs-fleet-modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span>🔍</span>
          <span style="font-weight:700;font-size:14px;">Автообнаружение агентов в локальной сети</span>
        </div>
        <button class="cs-fleet-modal-close">${ICONS.close}</button>
      </div>

      <div class="cs-fleet-modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px;">
        <p style="font-size:12px;color:#8b949e;margin:0;">
          Параллельное сканирование локальной подсети для обнаружения запущенных демонов config-studio-agent (порт :8085).
        </p>

        <div style="display:flex;gap:8px;align-items:center;">
          <input type="text" class="cs-fleet-form-input" id="cs-lan-subnet" value="${escapeHtml(defaultSubnet)}" placeholder="192.168.0" style="flex:1;" />
          <button class="cs-fleet-btn-primary" id="cs-lan-scan-btn" type="button" style="white-space:nowrap;">
            <span>🔍 Сканировать LAN</span>
          </button>
        </div>

        <div id="cs-lan-progress" style="display:none;align-items:center;gap:8px;font-size:12px;color:#00d2b4;">
          <span class="cs-scan-pulse"></span>
          <span id="cs-lan-progress-text">Сканирование подсети...</span>
        </div>

        <div class="cs-discovery-drawer" id="cs-lan-results" style="max-height:260px;overflow-y:auto;">
          <div style="text-align:center;color:#64748b;font-size:11.5px;padding:12px;">Нажмите «Сканировать LAN» для запуска поиска</div>
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

    const scanBtn = modal.querySelector('#cs-lan-scan-btn');
    const subnetInput = modal.querySelector('#cs-lan-subnet');
    const progressEl = modal.querySelector('#cs-lan-progress');
    const progressText = modal.querySelector('#cs-lan-progress-text');
    const resultsContainer = modal.querySelector('#cs-lan-results');

    async function triggerScan() {
      const subnet = subnetInput.value.trim() || '192.168.0';
      scanBtn.disabled = true;
      scanBtn.innerHTML = `<span>⏳ Поиск...</span>`;
      progressEl.style.display = 'flex';
      progressText.textContent = `Сканирование ${subnet}.1..254...`;
      resultsContainer.innerHTML = '';

      let foundCount = 0;

      await scanSubnet(subnet, (agent) => {
        foundCount++;
        const alreadyInFleet = servers.some(s => s.connection?.agent?.url === agent.url || s.connection?.ssh?.host === agent.ip);
        const itemEl = document.createElement('div');
        itemEl.className = 'cs-discovered-item';
        itemEl.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:2px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-weight:700;color:#e6edf3;font-size:12px;">${escapeHtml(agent.hostname)}</span>
              <span class="cs-remote-badge ${alreadyInFleet ? 'online' : 'unadopted'}">
                ${alreadyInFleet ? 'Во флоте' : 'Доступен'}
              </span>
            </div>
            <div style="font-family:monospace;font-size:11px;color:#8b949e;">${escapeHtml(agent.ip)}:8085 • v${escapeHtml(agent.version || '1.0')}</div>
          </div>
          <div>
            ${alreadyInFleet
              ? `<span style="font-size:11px;color:#34d399;font-weight:600;">✓ Подключен</span>`
              : `<button class="cs-fleet-btn-primary cs-adopt-btn" style="padding:4px 10px;font-size:11px;">${ICONS.plus} <span>Принять (Adopt)</span></button>`
            }
          </div>
        `;

        if (!alreadyInFleet) {
          const btn = itemEl.querySelector('.cs-adopt-btn');
          btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.innerHTML = `<span>⏳ Сопряжение...</span>`;
            const ok = await adoptDiscoveredAgent(agent);
            if (ok) {
              btn.replaceWith(document.createRange().createContextualFragment(`<span style="font-size:11px;color:#34d399;font-weight:600;">✓ Принят во флот!</span>`));
            } else {
              btn.disabled = false;
              btn.innerHTML = `<span>Повторить</span>`;
            }
          });
        }

        resultsContainer.appendChild(itemEl);
      });

      progressEl.style.display = 'none';
      scanBtn.disabled = false;
      scanBtn.innerHTML = `<span>🔍 Сканировать LAN</span>`;

      if (foundCount === 0) {
        resultsContainer.innerHTML = `<div style="text-align:center;color:#8b949e;padding:16px;font-size:12px;">Узлы config-studio-agent не обнаружены в подсети ${escapeHtml(subnet)}.*</div>`;
      }
    }

    scanBtn.addEventListener('click', triggerScan);
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
    modal.className = 'cs-fleet-modal-content';
    modal.style.maxWidth = '540px';

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
  async function openEditModal(server) {
    const isNew = !server;
    const srv = isNew ? {
      id: '',
      name: '',
      group: 'default',
      tags: [],
      connection: {
        ssh: { enabled: true, port: 22, user: 'root' },
        agent: { enabled: false, port: 8085 }
      },
      rollout: { canary: false, order: 10 }
    } : JSON.parse(JSON.stringify(server));

    srv.connection = srv.connection || {};
    srv.connection.ssh = srv.connection.ssh || { enabled: false, port: 22, user: 'root' };
    srv.connection.agent = srv.connection.agent || { enabled: false, port: 8085 };
    srv.rollout = srv.rollout || { canary: false, order: 10 };

    // Load available Vault secrets for dropdowns
    let vaultSecrets = [];
    try {
      if (window.ConfigStudio.secrets && typeof window.ConfigStudio.secrets.list === 'function') {
        vaultSecrets = await window.ConfigStudio.secrets.list();
      }
    } catch (e) {}

    const overlay = document.createElement('div');
    overlay.className = 'cs-fleet-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cs-fleet-modal-content';

    let activeTab = 'general';
    let activeDropdownControllers = [];

    modal.innerHTML = `
      <div class="cs-fleet-modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          ${ICONS.server}
          <span style="font-weight:700;font-size:14px;">${isNew ? 'Добавить узел во флот' : `Настройка узла: ${escapeHtml(srv.name)}`}</span>
        </div>
        <button class="cs-fleet-modal-close">${ICONS.close}</button>
      </div>

      <div class="cs-fleet-tabs-nav">
        <button class="cs-fleet-tab-btn active" data-tab="general">1. Основные</button>
        <button class="cs-fleet-tab-btn" data-tab="ssh">2. Подключение SSH</button>
        <button class="cs-fleet-tab-btn" data-tab="agent">3. Remote Agent</button>
        <button class="cs-fleet-tab-btn" data-tab="rollout">4. Развертывание</button>
      </div>

      <div class="cs-fleet-modal-body" id="cs-fleet-tab-content"></div>

      <div class="cs-fleet-modal-footer">
        <div>
          ${!isNew && srv.id !== 'localhost' ? '<button class="cs-fleet-btn-danger" id="cs-fleet-delete-btn">Удалить</button>' : ''}
        </div>
        <div style="display:flex;gap:8px;">
          <button class="cs-fleet-btn-secondary" id="cs-fleet-cancel-btn">Отмена</button>
          <button class="cs-fleet-btn-primary" id="cs-fleet-save-btn">Сохранить</button>
        </div>
      </div>
    `;

    function renderTab() {
      activeDropdownControllers.forEach(c => { try { c.destroy(); } catch (_) {} });
      activeDropdownControllers = [];

      const body = modal.querySelector('#cs-fleet-tab-content');
      modal.querySelectorAll('.cs-fleet-tab-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === activeTab);
      });

      if (activeTab === 'general') {
        body.innerHTML = `
          <div id="cs-fleet-validation-error"></div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">ID узла (уникальный латинский идентификатор) *</label>
            <input type="text" class="cs-fleet-form-input" id="srv-id" value="${escapeHtml(srv.id || '')}" ${!isNew ? 'disabled' : ''} placeholder="prod-web-01" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Имя узла (Отображается в шапке и меню)</label>
            <input type="text" class="cs-fleet-form-input" id="srv-name" value="${escapeHtml(srv.name || '')}" placeholder="Production Web Server 1" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Группа / Окружение</label>
            <input type="text" class="cs-fleet-form-input" id="srv-group" value="${escapeHtml(srv.group || 'default')}" placeholder="production, staging, k8s" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Теги (через запятую)</label>
            <input type="text" class="cs-fleet-form-input" id="srv-tags" value="${escapeHtml((srv.tags || []).join(', '))}" placeholder="linux, web, edge, db" />
          </div>
        `;
      } else if (activeTab === 'ssh') {
        const ssh = srv.connection?.ssh || {};
        const isEnabled = Boolean(ssh.enabled);

        body.innerHTML = `
          <div class="cs-fleet-checkbox-row">
            <input type="checkbox" id="srv-ssh-enabled" ${isEnabled ? 'checked' : ''} />
            <label for="srv-ssh-enabled">Включить прямое SSH / SFTP управление</label>
          </div>
          <div class="cs-fleet-form-grid">
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">Хост / IP адрес</label>
              <input type="text" class="cs-fleet-form-input" id="srv-ssh-host" value="${escapeHtml(ssh.host || '')}" placeholder="192.168.1.100 или vps.example.com" />
            </div>
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">SSH Порт</label>
              <input type="number" class="cs-fleet-form-input" id="srv-ssh-port" value="${ssh.port || 22}" />
            </div>
          </div>
          <div class="cs-fleet-form-grid">
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">Пользователь</label>
              <input type="text" class="cs-fleet-form-input" id="srv-ssh-user" value="${escapeHtml(ssh.user || 'root')}" placeholder="root или deploy" />
            </div>
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">Ключ из Core Vault</label>
              <div id="srv-ssh-identity-container"></div>
            </div>
          </div>
          <div class="cs-fleet-form-help">Безопасность Zero-Secret: закрытые ключи и пароли не сохраняются в YAML, а безопасно считываются из Core Vault.</div>
        `;

        const identityContainer = body.querySelector('#srv-ssh-identity-container');
        if (identityContainer) {
          const options = [
            {
              value: '',
              label: '(Авто / Агент ОС / Без ключа)',
              subtitle: 'Использовать системный SSH-agent или интерактивный пароль',
              badge: 'AUTO',
              badgeColor: 'default',
            },
            ...vaultSecrets.map(v => ({
              value: v.id,
              label: v.title ? v.title : v.id,
              subtitle: `ID: ${v.id}`,
              badge: (v.type || 'secret').toUpperCase(),
              badgeColor: v.type === 'token' ? 'purple' : (v.type === 'password' ? 'green' : 'blue'),
              statusDot: 'online'
            }))
          ];

          if (window.ConfigStudio?.ui?.renderDropdown) {
            const ctrl = window.ConfigStudio.ui.renderDropdown(identityContainer, {
              options,
              value: ssh.identity || '',
              placeholder: 'Выберите ключ из Vault...',
              searchable: options.length > 5,
              searchPlaceholder: 'Поиск секрета / ключа...',
              onChange: (val) => {
                srv.connection = srv.connection || {};
                srv.connection.ssh = srv.connection.ssh || {};
                srv.connection.ssh.identity = val || '';
              }
            });
            activeDropdownControllers.push(ctrl);
          } else {
            identityContainer.innerHTML = `
              <select class="cs-fleet-form-select" id="srv-ssh-identity">
                <option value="">(Авто / Агент ОС / Без ключа)</option>
                ${vaultSecrets.map(v => {
                  const label = v.title ? `${v.title} [${v.id}]` : `${v.id} (${v.type || 'secret'})`;
                  return `<option value="${escapeHtml(v.id)}" ${ssh.identity === v.id ? 'selected' : ''}>${escapeHtml(label)}</option>`;
                }).join('')}
              </select>
            `;
          }
        }
      } else if (activeTab === 'agent') {
        const agent = srv.connection?.agent || {};
        const isEnabled = Boolean(agent.enabled);

        body.innerHTML = `
          <div class="cs-fleet-checkbox-row">
            <input type="checkbox" id="srv-agent-enabled" ${isEnabled ? 'checked' : ''} />
            <label for="srv-agent-enabled">Включить Remote Agent (REST API на порту :8085)</label>
          </div>

          <!-- 1-Click Install Banner -->
          ${srv.connection?.ssh?.host ? `
            <div style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.3);border-radius:10px;padding:12px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;flex-direction:column;gap:2px;">
                <span style="font-weight:700;font-size:12px;color:#38bdf8;">1-Click Remote Agent Installer</span>
                <span style="font-size:11px;color:#94a3b8;">Автоматическая установка и запуск агента на ${escapeHtml(srv.connection.ssh.host)} по SSH</span>
              </div>
              <button type="button" class="cs-fleet-btn-primary" id="cs-open-installer-btn" style="padding:6px 12px;font-size:11px;white-space:nowrap;">
                ⚡ <span>Установить агент</span>
              </button>
            </div>
          ` : ''}

          <div class="cs-fleet-form-grid">
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">URL Агента</label>
              <input type="text" class="cs-fleet-form-input" id="srv-agent-url" value="${escapeHtml(agent.url || '')}" placeholder="http://192.168.1.100:8085" />
            </div>
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">TLS / HTTPS</label>
              <div class="cs-fleet-checkbox-row" style="margin-top:6px;">
                <input type="checkbox" id="srv-agent-tls" ${agent.tlsVerify ? 'checked' : ''} />
                <label for="srv-agent-tls" style="font-size:11px;">Проверять TLS сертификат</label>
              </div>
            </div>
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Секрет TOTP / Master Key из Core Vault</label>
            <div id="srv-agent-secret-container"></div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
            <div class="cs-fleet-form-help">Агент обеспечивает быстрое чтение и запись файлов по HTTP REST API с двухфакторной TOTP верификацией.</div>
            <button type="button" class="cs-fleet-btn-secondary" id="cs-srv-manage-tokens-btn" style="padding:4px 10px;font-size:11px;white-space:nowrap;">
              🔑 <span>Токены мониторинга...</span>
            </button>
          </div>
        `;

        if (srv.connection?.ssh?.host) {
          const instBtn = body.querySelector('#cs-open-installer-btn');
          if (instBtn) {
            instBtn.addEventListener('click', () => {
              saveFormValuesToState();
              openInstallAgentDialog(srv);
            });
          }
        }

        const tokensBtn = body.querySelector('#cs-srv-manage-tokens-btn');
        if (tokensBtn) {
          tokensBtn.addEventListener('click', () => {
            saveFormValuesToState();
            openTokensModal(srv);
          });
        }

        const secretContainer = body.querySelector('#srv-agent-secret-container');
        if (secretContainer) {
          const options = [
            {
              value: '',
              label: '(Без Vault секрета / публичный)',
              subtitle: 'Без аутентификации или используется ручной токен',
              badge: 'NONE',
              badgeColor: 'default',
            },
            ...vaultSecrets.map(v => ({
              value: v.id,
              label: v.title ? v.title : v.id,
              subtitle: `ID: ${v.id}`,
              badge: (v.type || 'secret').toUpperCase(),
              badgeColor: v.type === 'token' ? 'purple' : (v.type === 'password' ? 'green' : 'blue'),
              statusDot: 'online'
            }))
          ];

          if (window.ConfigStudio?.ui?.renderDropdown) {
            const ctrl = window.ConfigStudio.ui.renderDropdown(secretContainer, {
              options,
              value: agent.vaultSecret || '',
              placeholder: 'Выберите секрет из Vault...',
              searchable: options.length > 5,
              searchPlaceholder: 'Поиск секрета...',
              onChange: (val) => {
                srv.connection = srv.connection || {};
                srv.connection.agent = srv.connection.agent || {};
                srv.connection.agent.vaultSecret = val || '';
              }
            });
            activeDropdownControllers.push(ctrl);
          } else {
            secretContainer.innerHTML = `
              <select class="cs-fleet-form-select" id="srv-agent-secret">
                <option value="">(Без Vault секрета / публичный)</option>
                ${vaultSecrets.map(v => {
                  const label = v.title ? `${v.title} [${v.id}]` : `${v.id} (${v.type || 'secret'})`;
                  return `<option value="${escapeHtml(v.id)}" ${agent.vaultSecret === v.id ? 'selected' : ''}>${escapeHtml(label)}</option>`;
                }).join('')}
              </select>
            `;
          }
        }
      } else if (activeTab === 'rollout') {
        const rollout = srv.rollout || {};
        const hooks = rollout.hooks || {};

        body.innerHTML = `
          <div class="cs-fleet-checkbox-row">
            <input type="checkbox" id="srv-rollout-canary" ${rollout.canary ? 'checked' : ''} />
            <label for="srv-rollout-canary">Канареечный узел (Canary: получает обновления первым)</label>
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Порядок развертывания (Rollout Order)</label>
            <input type="number" class="cs-fleet-form-input" id="srv-rollout-order" value="${rollout.order || 10}" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Команда Pre-Apply (перед применением конфига)</label>
            <input type="text" class="cs-fleet-form-input" id="srv-hook-pre" value="${escapeHtml(hooks.preApply || '')}" placeholder="nginx -t" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Команда Post-Apply (после сохранения)</label>
            <input type="text" class="cs-fleet-form-input" id="srv-hook-post" value="${escapeHtml(hooks.postApply || '')}" placeholder="systemctl reload nginx" />
          </div>
        `;
      }
    }

    renderTab();

    // Tab buttons click
    modal.querySelectorAll('.cs-fleet-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        saveFormValuesToState();
        activeTab = btn.getAttribute('data-tab');
        renderTab();
      });
    });

    function saveFormValuesToState() {
      if (activeTab === 'general') {
        const idInput = modal.querySelector('#srv-id');
        if (idInput && isNew) srv.id = idInput.value.trim();
        const nameInput = modal.querySelector('#srv-name');
        if (nameInput) srv.name = nameInput.value.trim();
        const groupInput = modal.querySelector('#srv-group');
        if (groupInput) srv.group = groupInput.value.trim();
        const tagsInput = modal.querySelector('#srv-tags');
        if (tagsInput) {
          srv.tags = tagsInput.value.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
        }
      } else if (activeTab === 'ssh') {
        srv.connection = srv.connection || {};
        srv.connection.ssh = srv.connection.ssh || {};
        const enabled = modal.querySelector('#srv-ssh-enabled');
        if (enabled) srv.connection.ssh.enabled = enabled.checked;
        const host = modal.querySelector('#srv-ssh-host');
        if (host) srv.connection.ssh.host = host.value.trim();
        const port = modal.querySelector('#srv-ssh-port');
        if (port) srv.connection.ssh.port = parseInt(port.value, 10) || 22;
        const user = modal.querySelector('#srv-ssh-user');
        if (user) srv.connection.ssh.user = user.value.trim() || 'root';
        const identity = modal.querySelector('#srv-ssh-identity');
        if (identity) srv.connection.ssh.identity = identity.value;
      } else if (activeTab === 'agent') {
        srv.connection = srv.connection || {};
        srv.connection.agent = srv.connection.agent || {};
        const enabled = modal.querySelector('#srv-agent-enabled');
        if (enabled) srv.connection.agent.enabled = enabled.checked;
        const url = modal.querySelector('#srv-agent-url');
        if (url) srv.connection.agent.url = url.value.trim();
        const tls = modal.querySelector('#srv-agent-tls');
        if (tls) srv.connection.agent.tlsVerify = tls.checked;
        const secret = modal.querySelector('#srv-agent-secret');
        if (secret) srv.connection.agent.vaultSecret = secret.value;
      } else if (activeTab === 'rollout') {
        srv.rollout = srv.rollout || {};
        srv.rollout.hooks = srv.rollout.hooks || {};
        const canary = modal.querySelector('#srv-rollout-canary');
        if (canary) srv.rollout.canary = canary.checked;
        const order = modal.querySelector('#srv-rollout-order');
        if (order) srv.rollout.order = parseInt(order.value, 10) || 10;
        const pre = modal.querySelector('#srv-hook-pre');
        if (pre) srv.rollout.hooks.preApply = pre.value.trim();
        const post = modal.querySelector('#srv-hook-post');
        if (post) srv.rollout.hooks.postApply = post.value.trim();
      }
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
      saveFormValuesToState();
      if (!srv.id) {
        activeTab = 'general';
        renderTab();
        const errBanner = modal.querySelector('#cs-fleet-validation-error');
        if (errBanner) {
          errBanner.innerHTML = `
            <div style="background:rgba(239,68,68,0.15);border:1px solid #ef4444;border-radius:8px;padding:10px 12px;color:#fca5a5;font-size:12px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
              <span>⚠️</span>
              <span>Пожалуйста, укажите уникальный ID узла на вкладке «1. Основные»</span>
            </div>
          `;
        }
        showToast('Укажите ID узла на первой вкладке (1. Основные)', 'error');
        setTimeout(() => {
          const inp = modal.querySelector('#srv-id');
          if (inp) {
            inp.focus();
            inp.style.borderColor = '#ef4444';
          }
        }, 50);
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
  // Direct servers.yaml Raw Modal
  // ==========================================================================
  async function openRawYAMLModal() {
    let rawContent = '';
    try {
      const data = await apiFetch('/api/servers/raw');
      rawContent = data.content || '';
    } catch (e) {
      showToast('Ошибка загрузки servers.yaml: ' + e.message, 'error');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'cs-fleet-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cs-fleet-modal-content';
    modal.style.maxWidth = '720px';

    modal.innerHTML = `
      <div class="cs-fleet-modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          ${ICONS.server}
          <span style="font-weight:700;font-size:14px;">Редактирование servers.yaml</span>
        </div>
        <button class="cs-fleet-modal-close">${ICONS.close}</button>
      </div>
      <div class="cs-fleet-modal-body" style="padding:16px;">
        <textarea id="cs-fleet-yaml-textarea" class="cs-fleet-form-textarea" rows="18" style="font-family:monospace;font-size:12px;background:#0d1117;color:#38bdf8;">${escapeHtml(rawContent)}</textarea>
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
        await apiFetch('/api/servers/raw', {
          method: 'PUT',
          body: JSON.stringify({ content: newYaml })
        });
        showToast('✓ servers.yaml обновлен', 'success');
        closeModal();
        await loadServers();
      } catch (err) {
        showToast(`Ошибка сохранения YAML: ${err.message}`, 'error');
      }
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ==========================================================================
  // 1-Click Remote Agent Installer Dialog
  // ==========================================================================
  function openInstallAgentDialog(srv) {
    const overlay = document.createElement('div');
    overlay.className = 'cs-fleet-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cs-fleet-modal-content';
    modal.style.maxWidth = '640px';

    modal.innerHTML = `
      <div class="cs-fleet-modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span>⚡</span>
          <span style="font-weight:700;font-size:14px;">1-Click Установка Remote Agent на ${escapeHtml(srv.name)}</span>
        </div>
        <button class="cs-fleet-modal-close">${ICONS.close}</button>
      </div>

      <div class="cs-fleet-modal-body" style="padding:16px 20px;">
        <div style="background:rgba(255,255,255,0.03);border:1px solid #30363d;border-radius:10px;padding:14px;margin-bottom:14px;font-size:12px;color:#c9d1d9;">
          <div><b>Целевой SSH сервер:</b> <span style="font-family:monospace;color:#38bdf8;">${escapeHtml(srv.connection?.ssh?.user || 'root')}@${escapeHtml(srv.connection?.ssh?.host)}:${srv.connection?.ssh?.port || 22}</span></div>
          <div style="margin-top:4px;color:#8b949e;">Config Studio автоматически подключится по SSH, определит архитектуру (Linux x86_64/arm64), скопирует бинарник по SFTP, зарегистрирует и запустит службу демона (systemd/OpenRC) и переведет узел в гибридный режим.</div>
        </div>

        <div class="cs-fleet-form-grid" style="margin-bottom:12px;">
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Порт агента</label>
            <input type="number" id="cs-install-port" class="cs-fleet-form-input" value="8085" />
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
        <div id="cs-install-terminal" style="background:#090d13;border:1px solid #21262d;border-radius:8px;padding:12px;font-family:monospace;font-size:11px;min-height:160px;max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;color:#38bdf8;">
          <div style="color:#64748b;">[Готов к установке] Нажмите «Начать установку»...</div>
        </div>
      </div>

      <div class="cs-fleet-modal-footer">
        <div></div>
        <div style="display:flex;gap:8px;">
          <button class="cs-fleet-btn-secondary" id="cs-install-cancel-btn">Закрыть</button>
          <button class="cs-fleet-btn-primary" id="cs-install-run-btn">
            ⚡ <span>Начать установку</span>
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
      runBtn.innerHTML = `<span>⏳ Установка...</span>`;
      termEl.innerHTML = `<div style="color:#e2e8f0;">[1/6] Запуск процесса развертывания на ${escapeHtml(srv.connection?.ssh?.host)}...</div>`;

      try {
        const res = await apiFetch(`/api/servers/install-agent/${encodeURIComponent(srv.id)}`, {
          method: 'POST',
          body: JSON.stringify({
            port: customPort,
            useSudo: useSudo,
            serviceType: serviceType
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
          termEl.innerHTML += `<div style="color:#34d399;font-weight:700;margin-top:6px;">🎉 Успешно! Демон активен на ${escapeHtml(res.agentUrl)}. Узел переведен в гибридный режим!</div>`;
          runBtn.innerHTML = `<span>✓ Готово</span>`;
          showToast(`Агент успешно установлен на ${srv.name}!`, 'success');
          await loadServers();
          setTimeout(closeModal, 1800);
        } else {
          throw new Error(res.error || 'Сбой установки агента');
        }
      } catch (err) {
        termEl.innerHTML += `<div style="color:#f87171;font-weight:700;margin-top:6px;">❌ Ошибка: ${escapeHtml(err.message)}</div>`;
        runBtn.disabled = false;
        runBtn.innerHTML = `<span>Повторить</span>`;
        showToast(`Ошибка: ${err.message}`, 'error');
      }
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
                <button class="cs-fleet-add-btn" id="cs-fleet-sidebar-lan-btn" title="Поиск агентов в LAN">🔍 <span>LAN</span></button>
                <button class="cs-fleet-add-btn" id="cs-fleet-sidebar-add-btn">${ICONS.plus} <span>Добавить</span></button>
              </div>
            </div>
            <div class="cs-fleet-sidebar-body" id="cs-fleet-sidebar-list"></div>
          `;

          panel.querySelector('#cs-fleet-sidebar-lan-btn').addEventListener('click', () => {
            openDiscoveryModal();
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
