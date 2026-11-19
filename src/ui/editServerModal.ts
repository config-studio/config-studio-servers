import { ServerNode, DropdownController } from '../types';
import { store } from '../state';
import { fleet } from '../fleet';
import { ICONS } from '../constants';
import { escapeHtml, showToast } from './domUtils';
import { fetchCoreHosts, fetchVaultSecrets } from '../hostSync';
import { saveServer, deleteServer } from '../api';
import { validateServerConfig } from '../yaml';
import { openInstallAgentDialog } from './agentInstallModal';
import { openManualAgentModal } from './manualAgentModal';

/**
 * Add / Edit Server Modal Dialog
 * Supports both Core SSH Host selection and manual SSH parameter inputs.
 */

export async function openEditModal(server: ServerNode | null): Promise<void> {
  const isNew = !server;
  const srv: ServerNode = isNew
    ? {
        id: '',
        name: '',
        group: 'default',
        tags: [],
        sshHostRef: '',
        connection: {
          agent: { enabled: false, port: 8085 }
        },
        rollout: { canary: false, order: 10 }
      }
    : JSON.parse(JSON.stringify(server));

  srv.connection = srv.connection || {};
  srv.connection.agent = srv.connection.agent || { enabled: false, port: 8085 };
  srv.rollout = srv.rollout || { canary: false, order: 10 };

  const coreHosts = await fetchCoreHosts();

  // Auto-link existing server if it matches a core host by host/id
  if (!srv.sshHostRef) {
    const targetHost = srv.host || srv.connection?.ssh?.host;
    if (targetHost) {
      const found = coreHosts.find(h => h.host === targetHost || h.address === targetHost || h.id === srv.id);
      if (found) srv.sshHostRef = found.id;
    }
  }

  const vaultSecrets = await fetchVaultSecrets();

  const overlay = document.createElement('div');
  overlay.className = 'cs-fleet-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'cs-fleet-modal-content cs-fleet-modal-md';

  let activeDropdownControllers: DropdownController[] = [];

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
            <div style="display:flex;align-items:center;gap:6px;">
              <button type="button" class="cs-fleet-btn-secondary" id="cs-modal-manual-agent-btn" style="padding:5px 12px;font-size:11.5px;display:inline-flex;align-items:center;gap:6px;" title="Ручная настройка IP, порта, API Key и TOTP секрета">
                ${ICONS.key} <span>Ручная настройка...</span>
              </button>
              ${!isNew && (srv.sshHostRef || srv.connection?.ssh?.host) ? `
                <button type="button" class="cs-fleet-btn-secondary" id="cs-modal-install-agent-btn" style="padding:5px 12px;font-size:11.5px;display:inline-flex;align-items:center;gap:6px;">
                  ${ICONS.agent} <span>1-Click Установить агент</span>
                </button>
              ` : ''}
            </div>
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
  const hostPickerContainer = modal.querySelector('#srv-host-picker-container') as HTMLElement;
  const hostPreview = modal.querySelector('#srv-host-preview') as HTMLElement;
  const manualContainer = modal.querySelector('#srv-manual-ssh-container') as HTMLElement;
  const rebindBtn = modal.querySelector('#srv-rebind-host-btn');

  if (rebindBtn && hostPickerContainer) {
    rebindBtn.addEventListener('click', () => {
      const pill = rebindBtn.closest('.cs-fleet-core-host-pill') as HTMLElement;
      if (pill) pill.style.display = 'none';
      hostPickerContainer.style.display = 'block';
    });
  }

  let manualSecretVal = srv.identity || srv.connection?.ssh?.identity || '';
  const manualSecretContainer = modal.querySelector('#srv-manual-secret-container') as HTMLElement;
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
        onChange: (val: string) => {
          manualSecretVal = val;
        }
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
        badgeColor: 'default'
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
          statusDot: 'online' as const
        };
      }),
      {
        value: '__manual__',
        label: '+ Ввести параметры SSH вручную',
        subtitle: 'Указать IP, порт и ключ без привязки',
        badge: 'MANUAL',
        badgeColor: 'default'
      }
    ];

    const onHostChange = (val: string) => {
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
          const idInput = modal.querySelector('#srv-id') as HTMLInputElement;
          const nameInput = modal.querySelector('#srv-name') as HTMLInputElement;
          const groupInput = modal.querySelector('#srv-group') as HTMLInputElement;
          const tagsInput = modal.querySelector('#srv-tags') as HTMLInputElement;

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
          srv.name = nameInput ? nameInput.value : selected.name || selected.id;
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
        const portVal = (modal.querySelector('#srv-agent-port') as HTMLInputElement)?.value || 8085;
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
      const sel = hostPickerContainer.querySelector('#srv-host-select') as HTMLSelectElement;
      sel.addEventListener('change', e => onHostChange((e.target as HTMLSelectElement).value));
    }

    if (srv.sshHostRef) {
      onHostChange(srv.sshHostRef);
    }
  }

  // Toggle Agent Section
  const agentCheckbox = modal.querySelector('#srv-agent-enabled') as HTMLInputElement;
  const agentDetails = modal.querySelector('#srv-agent-details') as HTMLElement;
  if (agentCheckbox && agentDetails) {
    agentCheckbox.addEventListener('change', () => {
      agentDetails.style.display = agentCheckbox.checked ? 'flex' : 'none';
    });
  }

  // Secret dropdown in Agent section
  const secretContainer = modal.querySelector('#srv-agent-secret-container') as HTMLElement;
  if (secretContainer) {
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
        badgeColor: 'default'
      },
      ...sortedSecrets.map(v => {
        const isAgent = v.type === 'agent_credentials' || (v.id && v.id.startsWith('agent:'));
        return {
          value: v.id,
          label: v.title || v.id,
          subtitle: `ID: ${v.id}`,
          badge: isAgent ? 'AGENT' : (v.type || 'secret').toUpperCase(),
          badgeColor: isAgent ? 'cyan' : v.type === 'token' ? 'purple' : v.type === 'password' ? 'green' : 'blue',
          statusDot: 'online' as const
        };
      })
    ];

    const agentSecret =
      srv.connection?.agent?.vaultSecret ||
      srv.connection?.agent?.secretRef ||
      (vaultSecrets.find(v => v.id === `agent:${srv.id}`) ? `agent:${srv.id}` : '');

    if (window.ConfigStudio?.ui?.renderDropdown) {
      const ctrl = window.ConfigStudio.ui.renderDropdown(secretContainer, {
        options: secOptions,
        value: agentSecret,
        placeholder: 'Выберите секрет из Vault...',
        searchable: secOptions.length > 5,
        searchPlaceholder: 'Поиск секрета...',
        onChange: (val: string) => {
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
      const sel = secretContainer.querySelector('#srv-agent-secret') as HTMLSelectElement;
      sel.addEventListener('change', e => {
        srv.connection = srv.connection || {};
        srv.connection.agent = srv.connection.agent || {};
        srv.connection.agent.vaultSecret = (e.target as HTMLSelectElement).value || '';
        delete srv.connection.agent.secretRef;
      });
    }
  }

  // Manual Agent Configuration button
  const manualAgentBtn = modal.querySelector('#cs-modal-manual-agent-btn');
  if (manualAgentBtn) {
    manualAgentBtn.addEventListener('click', () => {
      closeModal();
      openManualAgentModal(srv);
    });
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
  const extraContent = modal.querySelector('#srv-extra-content') as HTMLElement;
  const extraArrow = modal.querySelector('#srv-extra-arrow');
  if (extraToggle && extraContent) {
    let isExtraOpen = false;
    extraToggle.addEventListener('click', () => {
      isExtraOpen = !isExtraOpen;
      extraContent.style.display = isExtraOpen ? 'flex' : 'none';
      if (extraArrow) extraArrow.textContent = isExtraOpen ? '▴' : '▾';
    });
  }

  function closeModal() {
    activeDropdownControllers.forEach(c => {
      try {
        c.destroy();
      } catch (_) {}
    });
    activeDropdownControllers = [];
    overlay.remove();
  }

  modal.querySelector('.cs-fleet-modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('#cs-fleet-cancel-btn')?.addEventListener('click', closeModal);

  // Save action
  modal.querySelector('#cs-fleet-save-btn')?.addEventListener('click', async () => {
    const idInput = modal.querySelector('#srv-id') as HTMLInputElement;
    const nameInput = modal.querySelector('#srv-name') as HTMLInputElement;
    const groupInput = modal.querySelector('#srv-group') as HTMLInputElement;
    const tagsInput = modal.querySelector('#srv-tags') as HTMLInputElement;
    const agentEnabled = (modal.querySelector('#srv-agent-enabled') as HTMLInputElement)?.checked || false;
    const agentPort = parseInt((modal.querySelector('#srv-agent-port') as HTMLInputElement)?.value, 10) || 8085;
    const canaryChecked = (modal.querySelector('#srv-rollout-canary') as HTMLInputElement)?.checked || false;

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

    const isManual = (modal.querySelector('#srv-manual-ssh-container') as HTMLElement)?.style.display === 'block';
    if (isManual) {
      const mHost = (modal.querySelector('#srv-manual-host') as HTMLInputElement)?.value.trim();
      const mPort = parseInt((modal.querySelector('#srv-manual-port') as HTMLInputElement)?.value, 10) || 22;
      const mUser = (modal.querySelector('#srv-manual-user') as HTMLInputElement)?.value.trim() || 'root';
      const saveCore = (modal.querySelector('#srv-manual-save-core') as HTMLInputElement)?.checked;

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
    } else if (srv.sshHostRef) {
      const selectedHost = coreHosts.find(h => h.id === srv.sshHostRef);
      if (selectedHost) {
        const hAddr = selectedHost.host || selectedHost.address || '';
        const hPort = selectedHost.port || 22;
        const hUser = selectedHost.user || selectedHost.username || 'root';
        const hIdent = selectedHost.identityId || '';
        srv.connection = srv.connection || {};
        srv.connection.ssh = { enabled: true, host: hAddr, port: hPort, user: hUser, identity: hIdent };
        srv.host = hAddr;
        srv.port = hPort;
        srv.user = hUser;
        srv.identity = hIdent;
      }
    }

    if (agentEnabled && !srv.connection.agent?.url) {
      const h = srv.connection.ssh?.host || srv.host;
      if (h) {
        srv.connection = srv.connection || {};
        srv.connection.agent = srv.connection.agent || {};
        srv.connection.agent.url = `http://${h}:${agentPort}`;
      }
    }

    const validation = validateServerConfig(srv);
    if (!validation.valid) {
      const errBanner = modal.querySelector('#cs-fleet-validation-error');
      if (errBanner) {
        errBanner.innerHTML = `
          <div style="background:rgba(239,68,68,0.15);border:1px solid #ef4444;border-radius:8px;padding:10px 12px;color:#fca5a5;font-size:12px;display:flex;align-items:center;gap:8px;">
            <span>${ICONS.warning}</span>
            <span>${escapeHtml(validation.error || 'Ошибка валидации')}</span>
          </div>
        `;
      }
      showToast(validation.error || 'Ошибка валидации', 'error');
      return;
    }

    if (!srv.name) srv.name = srv.id;

    try {
      await saveServer(srv);
      showToast(`Узел ${srv.name} сохранен`, 'success');
      closeModal();
      await fleet.loadAndSyncServers();
    } catch (err: any) {
      showToast(`Ошибка сохранения: ${err.message}`, 'error');
    }
  });

  // Delete action
  const delBtn = modal.querySelector('#cs-fleet-delete-btn');
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      if (!confirm(`Вы действительно хотите удалить узел "${srv.name}" из servers.yaml?`)) return;
      try {
        await deleteServer(srv.id);
        showToast(`Узел ${srv.name} удален`, 'info');
        if (store.getActiveServerId() === srv.id) {
          fleet.selectServer({ id: 'localhost', name: 'Localhost' });
        }
        closeModal();
        await fleet.loadAndSyncServers();
      } catch (err: any) {
        showToast(`Ошибка удаления: ${err.message}`, 'error');
      }
    });
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
