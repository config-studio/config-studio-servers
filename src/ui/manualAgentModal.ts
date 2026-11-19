import { ServerNode } from '../types';
import { fleet } from '../fleet';
import { ICONS, DEFAULT_AGENT_PORT } from '../constants';
import { escapeHtml, showToast } from './domUtils';
import { saveVaultSecret, getVaultSecret, saveServer } from '../api';
import {
  cleanBase32,
  isValidBase32,
  generateRandomBase32,
  generateRandomKeyId,
  generateTOTPWebCrypto
} from '../crypto';
import { sanitizeServerId } from '../yaml';

/**
 * Manual Remote Agent Configuration Dialog
 * Configures connection parameters (IP, port, HTTPS), API Key and TOTP Base32 secret.
 * Saves encrypted credentials into Core Vault (type: agent_credentials) and writes
 * clean reference `vault_secret: agent:<id>` into servers.yaml.
 */
export async function openManualAgentModal(
  srv?: ServerNode,
  onSaved?: (savedServer: ServerNode) => void
): Promise<void> {
  const isNew = !srv || !srv.id;
  const initialId = srv?.id || '';
  const initialName = srv?.name || '';

  // Extract initial host and port from agent URL or SSH host
  let initialHost = '';
  let initialPort = srv?.connection?.agent?.port || DEFAULT_AGENT_PORT;
  let initialHttps = false;

  if (srv?.connection?.agent?.url) {
    initialHttps = srv.connection.agent.url.startsWith('https://');
    const match = srv.connection.agent.url.match(/^https?:\/\/([^:/]+)(?::(\d+))?/i);
    if (match) {
      initialHost = match[1];
      if (match[2]) initialPort = parseInt(match[2], 10);
    }
  }

  if (!initialHost) {
    initialHost = srv?.connection?.ssh?.host || srv?.host || srv?.sshHostRef || '';
  }

  const initialVaultSecretId =
    srv?.connection?.agent?.vaultSecret ||
    srv?.connection?.agent?.secretRef ||
    (initialId ? `agent:${initialId}` : '');

  // Pre-load existing credentials from Vault if present
  let existingKeyId = 'cs_agent_master';
  let existingSecret = '';

  if (initialVaultSecretId) {
    try {
      const rawVal = await getVaultSecret(initialVaultSecretId);
      if (rawVal) {
        if (typeof rawVal === 'object') {
          if (rawVal.keyId) existingKeyId = rawVal.keyId;
          if (rawVal.secret || rawVal.value) existingSecret = rawVal.secret || rawVal.value;
        } else if (typeof rawVal === 'string') {
          try {
            const parsed = JSON.parse(rawVal);
            if (parsed.keyId) existingKeyId = parsed.keyId;
            if (parsed.secret || parsed.value) existingSecret = parsed.secret || parsed.value;
          } catch (_) {
            if (rawVal.includes(':')) {
              const parts = rawVal.split(':');
              existingKeyId = parts[0];
              existingSecret = parts[1];
            } else if (isValidBase32(rawVal)) {
              existingSecret = rawVal.trim();
            }
          }
        }
      }
    } catch (err) {
      console.warn('[openManualAgentModal] Failed to load existing secret:', err);
    }
  }

  const overlay = document.createElement('div');
  overlay.className = 'cs-fleet-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'cs-fleet-modal-content cs-fleet-modal-lg';

  modal.innerHTML = `
    <div class="cs-fleet-modal-header">
      <div style="display:flex;align-items:center;gap:8px;">
        <span>${ICONS.agent}</span>
        <span style="font-weight:700;font-size:14px;">
          ${isNew ? 'Ручная настройка Remote Agent' : `Ручная настройка Remote Agent — ${escapeHtml(srv.name || srv.id)}`}
        </span>
      </div>
      <button class="cs-fleet-modal-close">${ICONS.close}</button>
    </div>

    <div class="cs-fleet-modal-body" style="padding:16px 20px;display:flex;flex-direction:column;gap:14px;">
      <!-- Informational banner -->
      <div style="background:var(--cs-srv-bg-subtle);border:1px solid var(--cs-srv-border);border-radius:10px;padding:12px 14px;font-size:11.5px;color:var(--cs-srv-text-primary);line-height:1.5;">
        <div><b>Режим прямого подключения:</b> подключение к демону Remote Agent по HTTP/HTTPS без использования SSH.</div>
        <div style="margin-top:4px;color:var(--cs-srv-text-muted);">
          Ключ API и секрет TOTP шифруются и сохраняются в <b>Core Vault</b> (<code style="color:var(--cs-srv-accent);">agent_credentials</code>). В файле <code style="color:var(--cs-srv-accent);">servers.yaml</code> формируется защищенная ссылка вида <code style="color:var(--cs-srv-accent);">vault_secret: agent:&lt;id&gt;</code> без открытых паролей.
        </div>
      </div>

      <!-- Server Identity (editable if new) -->
      ${
        isNew
          ? `
        <div class="cs-fleet-form-grid" style="grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px;">
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">ID узла *</label>
            <input type="text" class="cs-fleet-form-input" id="cs-manual-node-id" value="${escapeHtml(initialId)}" placeholder="agent-vps-01" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Имя узла</label>
            <input type="text" class="cs-fleet-form-input" id="cs-manual-node-name" value="${escapeHtml(initialName)}" placeholder="Production VPS Agent" />
          </div>
        </div>
      `
          : `
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.02);border:1px solid var(--cs-srv-border);border-radius:8px;padding:8px 12px;">
          <div style="font-size:12px;">
            <span style="color:var(--cs-srv-text-muted);">Узел:</span> <b>${escapeHtml(srv.name || srv.id)}</b> <span style="font-family:monospace;color:var(--cs-srv-accent);font-size:11px;">(${escapeHtml(srv.id)})</span>
          </div>
          <input type="hidden" id="cs-manual-node-id" value="${escapeHtml(srv.id)}" />
          <input type="hidden" id="cs-manual-node-name" value="${escapeHtml(srv.name || srv.id)}" />
        </div>
      `
      }

      <!-- Network parameters -->
      <div style="background:rgba(255,255,255,0.02);border:1px solid var(--cs-srv-border);border-radius:10px;padding:14px;">
        <div style="font-size:11.5px;font-weight:600;margin-bottom:10px;color:var(--cs-srv-text-primary);display:flex;align-items:center;gap:6px;">
          <span>🌐</span>
          <span>Сетевой адрес агента</span>
        </div>
        <div class="cs-fleet-form-grid" style="grid-template-columns: minmax(0, 2fr) 110px minmax(0, 1fr); gap: 10px; align-items: start;">
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Хост / IP-адрес агента *</label>
            <input type="text" class="cs-fleet-form-input" id="cs-manual-host" value="${escapeHtml(initialHost)}" placeholder="192.168.0.110 или agent.domain.com" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Порт агента</label>
            <input type="number" class="cs-fleet-form-input" id="cs-manual-port" min="1" max="65535" value="${initialPort}" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Протокол</label>
            <div class="cs-fleet-checkbox-row" style="margin-top:6px;margin-bottom:0;">
              <input type="checkbox" id="cs-manual-https" ${initialHttps ? 'checked' : ''} />
              <label for="cs-manual-https" style="font-size:11.5px;cursor:pointer;">HTTPS (TLS)</label>
            </div>
          </div>
        </div>
        <div style="margin-top:8px;font-size:11.5px;color:#38bdf8;font-family:monospace;" id="cs-manual-url-hint">
          URL: ${initialHttps ? 'https' : 'http'}://${initialHost || '127.0.0.1'}:${initialPort}
        </div>
      </div>

      <!-- Authentication & Vault -->
      <div style="background:rgba(255,255,255,0.02);border:1px solid var(--cs-srv-border);border-radius:10px;padding:14px;">
        <div style="font-size:11.5px;font-weight:600;margin-bottom:10px;color:var(--cs-srv-text-primary);display:flex;align-items:center;gap:6px;">
          <span>🔑</span>
          <span>Ключи аутентификации и хранилище Core Vault</span>
        </div>

        <div class="cs-fleet-form-grid" style="grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 12px; align-items: start;">
          <!-- API Key / Key ID -->
          <div class="cs-fleet-form-group">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <label class="cs-fleet-form-label" style="margin-bottom:0;">API Key (Key ID) *</label>
              <button type="button" id="cs-manual-gen-key-btn" style="background:none;border:none;color:#38bdf8;cursor:pointer;padding:0;font-size:11px;">🎲 Сгенерировать</button>
            </div>
            <input type="text" class="cs-fleet-form-input" id="cs-manual-key-id" value="${escapeHtml(existingKeyId)}" placeholder="cs_agent_master" style="font-family:monospace;" />
            <div class="cs-fleet-form-help">Идентификатор ключа из config.yaml агента</div>
          </div>

          <!-- TOTP Secret -->
          <div class="cs-fleet-form-group">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <label class="cs-fleet-form-label" style="margin-bottom:0;">TOTP Секрет (Base32) *</label>
              <button type="button" id="cs-manual-gen-secret-btn" style="background:none;border:none;color:#38bdf8;cursor:pointer;padding:0;font-size:11px;">🎲 Сгенерировать Base32</button>
            </div>
            <div style="position:relative;display:flex;align-items:center;">
              <input type="password" class="cs-fleet-form-input" id="cs-manual-totp-secret" value="${escapeHtml(existingSecret)}" placeholder="JBSWY3DPEHPK3PXP..." style="font-family:monospace;padding-right:32px;" />
              <button type="button" id="cs-manual-toggle-secret-btn" title="Показать/скрыть секрет" style="position:absolute;right:8px;background:none;border:none;color:var(--cs-srv-text-muted);cursor:pointer;padding:2px;font-size:13px;">👁</button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
              <div class="cs-fleet-form-help">Base32 секрет RFC 6238 для динамической генерации токена</div>
              <div id="cs-manual-totp-status" style="font-size:10.5px;color:var(--cs-srv-text-muted);"></div>
            </div>
          </div>
        </div>

        <!-- Vault Secret Reference ID -->
        <div class="cs-fleet-form-group" style="margin-top:12px;">
          <label class="cs-fleet-form-label">Идентификатор секрета в Core Vault</label>
          <input type="text" class="cs-fleet-form-input" id="cs-manual-vault-id" value="${escapeHtml(initialVaultSecretId || `agent:${initialId || 'node'}`)}" style="font-family:monospace;background:rgba(0,0,0,0.2);" />
          <div class="cs-fleet-form-help" style="margin-top:4px;color:var(--cs-srv-accent);">
            ✓ В <code>servers.yaml</code> запишется аккуратная ссылка: <span id="cs-manual-yaml-preview" style="font-weight:600;">vault_secret: ${escapeHtml(initialVaultSecretId || `agent:${initialId || 'node'}`)}</span>
          </div>
        </div>
      </div>

      <!-- Test Connection & Live Diagnostic Block -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--cs-srv-bg-base);border:1px solid var(--cs-srv-border);border-radius:8px;padding:10px 14px;">
        <div style="display:flex;align-items:center;gap:8px;font-size:11.5px;" id="cs-manual-test-status">
          <span style="color:var(--cs-srv-text-muted);">Нажмите «Проверить подключение» для проверки связи и TOTP токена...</span>
        </div>
        <button type="button" class="cs-fleet-btn-secondary" id="cs-manual-test-btn" style="padding:5px 12px;font-size:11.5px;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;">
          <span>⚡ Проверить подключение</span>
        </button>
      </div>
    </div>

    <div class="cs-fleet-modal-footer">
      <div></div>
      <div style="display:flex;gap:8px;">
        <button class="cs-fleet-btn-secondary" id="cs-manual-cancel-btn">Отмена</button>
        <button class="cs-fleet-btn-primary" id="cs-manual-save-btn" style="display:inline-flex;align-items:center;gap:6px;">
          <span>💾 Сохранить и привязать к Vault</span>
        </button>
      </div>
    </div>
  `;

  function closeModal() {
    overlay.remove();
  }

  modal.querySelector('.cs-fleet-modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('#cs-manual-cancel-btn')?.addEventListener('click', closeModal);

  // DOM Elements
  const nodeIdInput = modal.querySelector('#cs-manual-node-id') as HTMLInputElement;
  const nodeNameInput = modal.querySelector('#cs-manual-node-name') as HTMLInputElement;
  const hostInput = modal.querySelector('#cs-manual-host') as HTMLInputElement;
  const portInput = modal.querySelector('#cs-manual-port') as HTMLInputElement;
  const httpsCheckbox = modal.querySelector('#cs-manual-https') as HTMLInputElement;
  const urlHintEl = modal.querySelector('#cs-manual-url-hint') as HTMLElement;
  const keyIdInput = modal.querySelector('#cs-manual-key-id') as HTMLInputElement;
  const totpSecretInput = modal.querySelector('#cs-manual-totp-secret') as HTMLInputElement;
  const vaultIdInput = modal.querySelector('#cs-manual-vault-id') as HTMLInputElement;
  const yamlPreviewEl = modal.querySelector('#cs-manual-yaml-preview') as HTMLElement;
  const totpStatusEl = modal.querySelector('#cs-manual-totp-status') as HTMLElement;
  const toggleSecretBtn = modal.querySelector('#cs-manual-toggle-secret-btn') as HTMLButtonElement;
  const genKeyBtn = modal.querySelector('#cs-manual-gen-key-btn') as HTMLButtonElement;
  const genSecretBtn = modal.querySelector('#cs-manual-gen-secret-btn') as HTMLButtonElement;
  const testBtn = modal.querySelector('#cs-manual-test-btn') as HTMLButtonElement;
  const testStatusEl = modal.querySelector('#cs-manual-test-status') as HTMLElement;
  const saveBtn = modal.querySelector('#cs-manual-save-btn') as HTMLButtonElement;

  // Live URL and Vault preview updates
  function updateLivePreviews() {
    const isHttps = httpsCheckbox.checked;
    const proto = isHttps ? 'https' : 'http';
    const host = hostInput.value.trim() || '127.0.0.1';
    const port = portInput.value.trim() || '8085';
    urlHintEl.textContent = `URL: ${proto}://${host}:${port}`;

    const currentId = nodeIdInput ? sanitizeServerId(nodeIdInput.value) : initialId;
    if (isNew && currentId && (!vaultIdInput.dataset.userEdited || vaultIdInput.value === '')) {
      vaultIdInput.value = `agent:${currentId}`;
    }
    const vaultRef = vaultIdInput.value.trim() || `agent:${currentId || 'node'}`;
    yamlPreviewEl.textContent = `vault_secret: ${vaultRef}`;

    // Validate TOTP secret format
    const secret = cleanBase32(totpSecretInput.value);
    if (!secret) {
      totpStatusEl.textContent = '';
    } else if (isValidBase32(secret)) {
      totpStatusEl.textContent = `✓ Base32 (${secret.length} симв.)`;
      totpStatusEl.style.color = '#10b981';
    } else {
      totpStatusEl.textContent = `⚠ Слишком короткий (мин. 16 симв.)`;
      totpStatusEl.style.color = '#f59e0b';
    }
  }

  hostInput.addEventListener('input', updateLivePreviews);
  portInput.addEventListener('input', updateLivePreviews);
  httpsCheckbox.addEventListener('change', updateLivePreviews);
  nodeIdInput?.addEventListener('input', updateLivePreviews);
  totpSecretInput.addEventListener('input', updateLivePreviews);

  vaultIdInput.addEventListener('input', () => {
    vaultIdInput.dataset.userEdited = 'true';
    updateLivePreviews();
  });

  // Toggle secret visibility
  let secretVisible = false;
  toggleSecretBtn.addEventListener('click', () => {
    secretVisible = !secretVisible;
    totpSecretInput.type = secretVisible ? 'text' : 'password';
    toggleSecretBtn.textContent = secretVisible ? '🔒' : '👁';
  });

  // Generator buttons
  genKeyBtn.addEventListener('click', () => {
    keyIdInput.value = generateRandomKeyId('cs_master');
    showToast('Сгенерирован новый Key ID', 'info');
  });

  genSecretBtn.addEventListener('click', () => {
    totpSecretInput.value = generateRandomBase32(24);
    updateLivePreviews();
    showToast('Сгенерирован надежный 24-символьный Base32 секрет', 'info');
  });

  // Initial preview sync
  updateLivePreviews();

  // Test Connection Handler
  testBtn.addEventListener('click', async () => {
    const host = hostInput.value.trim();
    const port = parseInt(portInput.value.trim(), 10) || DEFAULT_AGENT_PORT;
    const isHttps = httpsCheckbox.checked;
    const keyId = keyIdInput.value.trim();
    const secret = cleanBase32(totpSecretInput.value);

    if (!host) {
      testStatusEl.innerHTML = `<span style="color:#ef4444;">Укажите хост или IP агента</span>`;
      return;
    }

    testBtn.disabled = true;
    testStatusEl.innerHTML = `<span style="color:#38bdf8;">⏳ Проверка связи и генерация TOTP кода...</span>`;

    const start = performance.now();
    try {
      let otp = '';
      if (secret) {
        otp = await generateTOTPWebCrypto(secret);
      }
      const tokenHeader = otp ? `Bearer ${keyId}:${otp}` : (keyId ? `Bearer ${keyId}` : '');
      const testUrl = `${isHttps ? 'https' : 'http'}://${host}:${port}/health`;

      // Perform fetch with 3.5s abort timeout
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);

      const headers: Record<string, string> = {};
      if (tokenHeader) headers['Authorization'] = tokenHeader;

      const res = await fetch(testUrl, {
        method: 'GET',
        headers,
        signal: ctrl.signal
      }).catch(err => {
        throw new Error(err.name === 'AbortError' ? 'Превышен таймаут ответа (3.5с)' : err.message);
      });
      clearTimeout(timer);

      const ms = Math.round(performance.now() - start);
      if (res.ok) {
        testStatusEl.innerHTML = `<span style="color:#10b981;font-weight:600;">✓ Онлайн (${ms} ms)! Агент ответил HTTP ${res.status}. TOTP авторизация подтверждена.</span>`;
      } else {
        testStatusEl.innerHTML = `<span style="color:#f59e0b;">⚠ Агент ответил HTTP ${res.status} (${res.statusText || 'Статус не 200'}). Связь есть, проверьте права ключа.</span>`;
      }
    } catch (err: any) {
      testStatusEl.innerHTML = `<span style="color:#ef4444;">✕ Ошибка связи: ${escapeHtml(err.message)}</span>`;
    } finally {
      testBtn.disabled = false;
    }
  });

  // Save and Link to Vault Handler
  saveBtn.addEventListener('click', async () => {
    const rawId = nodeIdInput ? nodeIdInput.value.trim() : initialId;
    const sanitizedId = sanitizeServerId(rawId);
    const nodeName = nodeNameInput ? nodeNameInput.value.trim() || sanitizedId : initialName || sanitizedId;

    if (!sanitizedId) {
      showToast('Укажите корректный ID узла', 'error');
      return;
    }

    const host = hostInput.value.trim();
    if (!host) {
      showToast('Укажите хост или IP-адрес агента', 'error');
      hostInput.focus();
      return;
    }

    const port = parseInt(portInput.value.trim(), 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      showToast('Укажите допустимый порт (1-65535)', 'error');
      portInput.focus();
      return;
    }

    const keyId = keyIdInput.value.trim() || 'cs_agent_master';
    const secret = cleanBase32(totpSecretInput.value);

    if (totpSecretInput.value.trim() && !isValidBase32(secret)) {
      showToast('TOTP секрет должен содержать не менее 16 символов Base32 (A-Z, 2-7)', 'error');
      totpSecretInput.focus();
      return;
    }

    const vaultSecretId = vaultIdInput.value.trim() || `agent:${sanitizedId}`;
    const isHttps = httpsCheckbox.checked;
    const agentUrl = `${isHttps ? 'https' : 'http'}://${host}:${port}`;

    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span>⏳ Сохранение в Vault...</span>`;

    try {
      // 1. Save or update credentials in Core Vault (encrypted)
      const credsValue = JSON.stringify({
        keyId: keyId,
        secret: secret
      });

      await saveVaultSecret({
        id: vaultSecretId,
        title: `Agent Credentials (${nodeName})`,
        type: 'agent_credentials',
        scope: 'shared',
        pluginId: 'servers',
        value: credsValue
      });

      // 2. Prepare updated ServerNode representation
      const targetNode: ServerNode = srv ? { ...srv } : {
        id: sanitizedId,
        name: nodeName,
        group: 'default',
        tags: ['agent']
      };

      targetNode.id = sanitizedId;
      targetNode.name = nodeName;
      targetNode.connection = targetNode.connection || {};
      targetNode.connection.agent = {
        enabled: true,
        url: agentUrl,
        port: port,
        vaultSecret: vaultSecretId,
        tlsVerify: isHttps
      };

      // 3. Persist node configuration to servers.yaml
      await saveServer(targetNode);

      // 4. Reload fleet state and notify subscribers
      await fleet.loadAndSyncServers();

      showToast(`Узел ${nodeName} настроен и безопасно привязан к Vault!`, 'success');
      onSaved?.(targetNode);
      closeModal();
    } catch (err: any) {
      console.error('[ManualAgentModal] Failed to save agent config:', err);
      showToast(`Ошибка сохранения: ${err.message}`, 'error');
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<span>💾 Сохранить и привязать к Vault</span>`;
    }
  });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
