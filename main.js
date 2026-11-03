/**
 * Config Studio — Servers & Fleet Manager Official Plugin v1.0
 * Universal Fleet Switcher, servers.yaml management and Hybrid Actions (Agent, SFTP, Shell).
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
    close: '<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
  };

  // --- State ---
  let servers = [];
  let activeServerId = localStorage.getItem('cs_active_server_id') || 'localhost';
  let activeTagFilter = 'all';
  let searchQuery = '';
  let pingData = {}; // map of serverId -> { status, ms, error }
  let headerUpdateFn = null;
  let splitPanelUpdateFn = null;

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
      if (window.ConfigStudio && typeof window.ConfigStudio.showToast === 'function') {
        window.ConfigStudio.showToast(msg, type);
      } else if (window.ConfigStudio && typeof window.ConfigStudio.showNotification === 'function') {
        window.ConfigStudio.showNotification(msg, type);
      } else if (window.ConfigStudio && window.ConfigStudio.ui && typeof window.ConfigStudio.ui.toast === 'function') {
        window.ConfigStudio.ui.toast(msg, type);
      } else {
        console.log(`[Toast ${type}]`, msg);
      }
    } catch (e) {
      console.warn('[Toast fallback]', msg, e);
    }
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
      window.dispatchEvent(new CustomEvent('cs:switch-sidebar-tab', { detail: 'workspaces' }));
      if (typeof window.ConfigStudio.setRemoteEndpoint === 'function') {
        window.ConfigStudio.setRemoteEndpoint(null);
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

    // Switch sidebar tab back to workspaces tree so agent files are visible
    window.dispatchEvent(new CustomEvent('cs:switch-sidebar-tab', { detail: 'workspaces' }));

    // Direct endpoint connection
    if (typeof window.ConfigStudio.setRemoteEndpoint === 'function') {
      window.ConfigStudio.setRemoteEndpoint(url, agentCfg.vaultSecret || '');
    }
    if (typeof window.ConfigStudio.refreshFiles === 'function') {
      try { await window.ConfigStudio.refreshFiles(); } catch (e) {}
    }
    showToast(`Подключено к Агенту: ${server.name}`, 'success');
  }

  async function openSFTP(server) {
    if (!server.connection || !server.connection.ssh) return;
    const sshCfg = server.connection.ssh;
    const hostObj = syncSSHHost(server);

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
          <button class="cs-fleet-add-btn" id="cs-fleet-add-node-btn">
            ${ICONS.plus} <span>Узел</span>
          </button>
        `;
        dropdown.appendChild(header);

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
        if (isDropdownOpen) renderDropdown();
      };
    }
  });

  // --- Create Server Card (With Dynamic Action Buttons) ---
  function createServerCard(s, onActionClose) {
    const card = document.createElement('div');
    const isActive = s.id === activeServerId;
    card.className = `cs-fleet-card ${isActive ? 'active' : ''}`;

    const isLocal = s.id === 'localhost';
    const hasAgent = Boolean(s.connection?.agent?.enabled);
    const hasSSH = Boolean(s.connection?.ssh?.enabled);
    const ping = pingData[s.id] || { status: 'online', ms: isLocal ? 0 : null };

    const dotClass = ping.status === 'offline' ? 'offline' : (ping.status === 'warn' ? 'warn' : 'online');
    const pingStr = ping.ms !== null ? `${ping.ms}ms` : (ping.status === 'offline' ? 'офлайн' : '...');
    const isCanary = Boolean(s.rollout?.canary);

    let hostDisplay = '127.0.0.1';
    if (!isLocal) {
      hostDisplay = s.connection?.ssh?.host || s.connection?.agent?.url || s.host || 'remote';
      try {
        if (hostDisplay.startsWith('http')) {
          const u = new URL(hostDisplay);
          hostDisplay = u.hostname;
        }
      } catch (e) {}
    }

    const tagsHtml = (s.tags || []).map(t => `<span class="cs-fleet-card-tag">#${escapeHtml(t)}</span>`).join('');

    card.innerHTML = `
      <div class="cs-fleet-card-header">
        <div class="cs-fleet-card-title-group">
          <span class="cs-fleet-status-dot ${dotClass}"></span>
          <span>${escapeHtml(s.name)}</span>
          ${isCanary ? '<span class="cs-fleet-badge canary">CANARY</span>' : ''}
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:10px;font-family:monospace;color:#94a3b8;">${pingStr}</span>
          ${!isLocal ? `<button class="cs-fleet-edit-btn" title="Редактировать" style="background:transparent;border:none;color:#64748b;cursor:pointer;padding:2px;">${ICONS.edit}</button>` : ''}
        </div>
      </div>
      <div class="cs-fleet-card-meta">
        <span>${escapeHtml(hostDisplay)}</span>
        <div class="cs-fleet-card-tags">${tagsHtml}</div>
      </div>
    `;

    // Edit button click
    const editBtn = card.querySelector('.cs-fleet-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onActionClose) onActionClose();
        openEditModal(s);
      });
    }

    // Action Buttons Container
    const actionsRow = document.createElement('div');

    if (isLocal) {
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
        <button class="cs-fleet-btn-action cs-fleet-btn-agent" title="Открыть файлы через Remote Agent (быстрый REST API с TOTP)">
          ${ICONS.agent} <span>Агент</span>
        </button>
        <button class="cs-fleet-btn-action cs-fleet-btn-sftp" title="Открыть директории по SFTP (нативный SSH SFTP ядра)">
          ${ICONS.sftp} <span>SFTP</span>
        </button>
        <button class="cs-fleet-btn-action cs-fleet-btn-shell" title="Открыть SSH PTY терминал в нижнем доке">
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
      // 3 BUTTONS (SFTP, Shell, and 1-Click Install Agent)
      actionsRow.className = 'cs-fleet-card-actions';
      actionsRow.innerHTML = `
        <button class="cs-fleet-btn-action cs-fleet-btn-sftp" title="Открыть SFTP">
          ${ICONS.sftp} <span>SFTP</span>
        </button>
        <button class="cs-fleet-btn-action cs-fleet-btn-shell" title="Запустить SSH PTY Терминал">
          ${ICONS.shell} <span>Шелл</span>
        </button>
        <button class="cs-fleet-btn-action cs-fleet-btn-agent" style="border-style:dashed;" title="1-Click установка демона Config Studio Agent по SSH">
          <span>🚀 +Агент</span>
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
        openInstallAgentModal(s);
      });
    } else if (hasAgent && !hasSSH) {
      // 1 BUTTON AGENT ONLY
      actionsRow.className = 'cs-fleet-card-actions cols-1';
      actionsRow.innerHTML = `
        <button class="cs-fleet-btn-action cs-fleet-btn-agent" title="Открыть файлы через Агент">
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

  // --- Modal Dialog for Add / Edit Server ---
  async function openEditModal(existing = null) {
    const isNew = !existing;
    const srv = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: '',
      name: '',
      group: 'production',
      tags: [],
      connection: {
        ssh: { enabled: true, host: '', port: 22, user: 'root', identity: '' },
        agent: { enabled: false, url: '', vaultSecret: '' }
      },
      rollout: { canary: false, order: 10 }
    };

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
        <h3>${isNew ? 'Добавить узел во флот' : 'Настройка узла: ' + escapeHtml(srv.name)}</h3>
        <button class="cs-fleet-modal-close">${ICONS.close}</button>
      </div>
      <div class="cs-fleet-modal-tabs">
        <button class="cs-fleet-tab-btn active" data-tab="general">1. Основные</button>
        <button class="cs-fleet-tab-btn" data-tab="ssh">2. Подключение SSH</button>
        <button class="cs-fleet-tab-btn" data-tab="agent">3. Remote Agent</button>
        <button class="cs-fleet-tab-btn" data-tab="rollout">4. Развертывание</button>
      </div>
      <div class="cs-fleet-modal-body" id="cs-fleet-tab-content">
      </div>
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
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">ID узла (уникальный латинский идентификатор)</label>
            <input type="text" class="cs-fleet-form-input" id="srv-id" value="${escapeHtml(srv.id || '')}" ${!isNew ? 'disabled' : ''} placeholder="prod-web-01" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Отображаемое имя</label>
            <input type="text" class="cs-fleet-form-input" id="srv-name" value="${escapeHtml(srv.name || '')}" placeholder="Production Web 01" />
          </div>
          <div class="cs-fleet-form-row">
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">Группа / Папка</label>
              <input type="text" class="cs-fleet-form-input" id="srv-group" value="${escapeHtml(srv.group || '')}" placeholder="production/frontend" />
            </div>
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">Теги (через запятую)</label>
              <input type="text" class="cs-fleet-form-input" id="srv-tags" value="${escapeHtml((srv.tags || []).join(', '))}" placeholder="prod, web, nginx" />
            </div>
          </div>
        `;
      } else if (activeTab === 'ssh') {
        const ssh = srv.connection?.ssh || {};
        const isEnabled = ssh.enabled !== false;
        body.innerHTML = `
          <div class="cs-fleet-form-group" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="srv-ssh-enabled" ${isEnabled ? 'checked' : ''} />
            <label for="srv-ssh-enabled" class="cs-fleet-form-label" style="margin:0;cursor:pointer;">Включить доступ по нативному SSH/SFTP</label>
          </div>
          <div class="cs-fleet-form-row">
            <div class="cs-fleet-form-group" style="grid-column: span 1;">
              <label class="cs-fleet-form-label">Хост / IP</label>
              <input type="text" class="cs-fleet-form-input" id="srv-ssh-host" value="${escapeHtml(ssh.host || '')}" placeholder="192.168.1.10 или example.com" />
            </div>
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">Порт</label>
              <input type="number" class="cs-fleet-form-input" id="srv-ssh-port" value="${ssh.port || 22}" />
            </div>
          </div>
          <div class="cs-fleet-form-row">
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">Пользователь</label>
              <input type="text" class="cs-fleet-form-input" id="srv-ssh-user" value="${escapeHtml(ssh.user || 'root')}" />
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
        const hasSSH = Boolean(srv.connection?.ssh?.host);

        body.innerHTML = `
          ${hasSSH && !isEnabled ? `
            <div class="cs-fleet-install-box" style="margin-bottom:12px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <div>
                  <div style="font-weight:700;font-size:12px;color:#ffffff;display:flex;align-items:center;gap:6px;">
                    <span>🚀 1-Click Установка Агента на сервер</span>
                  </div>
                  <div style="font-size:11px;color:#94a3b8;margin-top:2px;">
                    Ядро Config Studio автоматически загрузит бинарник через SSH, настроит службу и выполнит сопряжение с кастомным портом.
                  </div>
                </div>
                <button type="button" class="cs-fleet-btn-install" id="cs-fleet-start-install-btn">
                  <span>🚀 Установить</span>
                </button>
              </div>
            </div>
          ` : ''}

          <div class="cs-fleet-form-group" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="srv-agent-enabled" ${isEnabled ? 'checked' : ''} />
            <label for="srv-agent-enabled" class="cs-fleet-form-label" style="margin:0;cursor:pointer;">Включить подключение к Config Studio Agent daemon</label>
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">URL Агента</label>
            <input type="text" class="cs-fleet-form-input" id="srv-agent-url" value="${escapeHtml(agent.url || '')}" placeholder="http://10.0.1.10:8085" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Секрет TOTP / Master Key из Core Vault</label>
            <div id="srv-agent-secret-container"></div>
          </div>
          <div class="cs-fleet-form-help">Агент обеспечивает быстрое чтение и запись файлов по HTTP REST API с двухфакторной TOTP верификацией.</div>
        `;

        const secretContainer = body.querySelector('#srv-agent-secret-container');
        if (secretContainer) {
          const options = [
            {
              value: '',
              label: '(Без Vault секрета / публичный)',
              subtitle: 'Без дополнительного TOTP или API токена',
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
              placeholder: 'Выберите TOTP / Master Key...',
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

        const installTriggerBtn = body.querySelector('#cs-fleet-start-install-btn');
        if (installTriggerBtn) {
          installTriggerBtn.addEventListener('click', () => {
            saveFormValuesToState();
            closeModal();
            openInstallAgentModal(srv);
          });
        }
      } else if (activeTab === 'rollout') {
        const roll = srv.rollout || {};
        const hooks = roll.hooks || {};
        body.innerHTML = `
          <div class="cs-fleet-form-group" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="srv-rollout-canary" ${roll.canary ? 'checked' : ''} />
            <label for="srv-rollout-canary" class="cs-fleet-form-label" style="margin:0;cursor:pointer;">Канареечный узел (Canary: получает обновления первым)</label>
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Порядок развертывания (Rollout Order)</label>
            <input type="number" class="cs-fleet-form-input" id="srv-rollout-order" value="${roll.order || 10}" />
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
        showToast('Укажите ID узла на первой вкладке (1. Основные)', 'error');
        activeTab = 'general';
        renderTab();
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

  // --- Raw servers.yaml Modal Editor ---
  async function openRawYAMLModal() {
    let yamlContent = '';
    try {
      const res = await fetch('/api/servers/raw', {
        headers: { 'X-ConfigStudio-Web': '1' }
      });
      yamlContent = await res.text();
    } catch (e) {
      yamlContent = '# Ошибка загрузки servers.yaml';
    }

    const overlay = document.createElement('div');
    overlay.className = 'cs-fleet-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cs-fleet-modal-content';
    modal.style.width = '700px';

    modal.innerHTML = `
      <div class="cs-fleet-modal-header">
        <h3>Редактирование servers.yaml (Инвентарь флота)</h3>
        <button class="cs-fleet-modal-close">${ICONS.close}</button>
      </div>
      <div class="cs-fleet-modal-body" style="padding:16px;">
        <textarea id="cs-fleet-yaml-textarea" class="cs-fleet-form-textarea" style="font-family:monospace;height:340px;resize:vertical;">${escapeHtml(yamlContent)}</textarea>
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
        showToast('Файл servers.yaml обновлен', 'success');
        closeModal();
        await loadServers();
      } catch (err) {
        showToast(`Ошибка в YAML: ${err.message}`, 'error');
      }
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // --- 1-Click Install Agent Modal Dialog with Custom Port ---
  async function openInstallAgentModal(srv) {
    const overlay = document.createElement('div');
    overlay.className = 'cs-fleet-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cs-fleet-modal-content';
    modal.style.width = '620px';

    const defaultPort = 8085;

    modal.innerHTML = `
      <div class="cs-fleet-modal-header">
        <h3>1-Click Установка Агента: ${escapeHtml(srv.name)}</h3>
        <button class="cs-fleet-modal-close">${ICONS.close}</button>
      </div>
      <div class="cs-fleet-modal-body" style="padding:18px;display:flex;flex-direction:column;gap:12px;">
        <div style="font-size:12px;color:#cbd5e1;line-height:1.5;">
          Автоматическая установка и запуск демона <b>config-studio-agent</b> через нативный SSH на <b>${escapeHtml(srv.connection?.ssh?.host || srv.name)}</b>.
        </div>

        <div class="cs-fleet-form-row">
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Кастомный порт агента</label>
            <input type="number" id="cs-install-port" class="cs-fleet-form-input" value="${defaultPort}" min="1" max="65535" />
            <span class="cs-fleet-form-help">Порт HTTP API демона (по умолчанию 8085)</span>
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Система службы</label>
            <div id="cs-install-service-type-container"></div>
          </div>
        </div>

        <div class="cs-fleet-form-group" style="flex-direction:row;align-items:center;gap:10px;">
          <input type="checkbox" id="cs-install-sudo" checked />
          <label for="cs-install-sudo" class="cs-fleet-form-label" style="margin:0;cursor:pointer;">Использовать sudo (рекомендуется для системных служб)</label>
        </div>

        <div class="cs-fleet-terminal-log" id="cs-install-terminal" style="display:none;"></div>
      </div>
      <div class="cs-fleet-modal-footer">
        <div></div>
        <div style="display:flex;gap:8px;">
          <button class="cs-fleet-btn-secondary" id="cs-install-cancel-btn">Отмена</button>
          <button class="cs-fleet-btn-primary" id="cs-install-run-btn">
            <span>🚀 Начать установку</span>
          </button>
        </div>
      </div>
    `;

    let serviceTypeDropdown = null;
    const serviceTypeContainer = modal.querySelector('#cs-install-service-type-container');
    if (serviceTypeContainer) {
      const svcOptions = [
        { value: 'auto', label: 'Автоопределение (systemd / OpenRC)', subtitle: 'Автоматически определяет init-систему', badge: 'AUTO', badgeColor: 'blue' },
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

    runBtn.addEventListener('click', async () => {
      const portInput = modal.querySelector('#cs-install-port');
      const sudoInput = modal.querySelector('#cs-install-sudo');
      const svcSelect = modal.querySelector('#cs-install-service-type');

      const customPort = parseInt(portInput.value, 10) || 8085;
      const useSudo = sudoInput ? sudoInput.checked : true;
      const serviceType = serviceTypeDropdown ? serviceTypeDropdown.getValue() : (svcSelect ? svcSelect.value : 'auto');

      runBtn.disabled = true;
      runBtn.innerHTML = `<span>⏳ Установка...</span>`;
      termEl.style.display = 'block';
      termEl.innerHTML = `<div>[Config Studio] Запуск 1-Click онбординга узла ${escapeHtml(srv.id)} на порт :${customPort}...</div>`;

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

  // --- Register Sidebar Split Panel ---
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
              <button class="cs-fleet-add-btn" id="cs-fleet-sidebar-add-btn">${ICONS.plus} <span>Добавить</span></button>
            </div>
            <div class="cs-fleet-sidebar-body" id="cs-fleet-sidebar-list"></div>
          `;

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

  // --- Inter-Plugin Service Registration ---
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
