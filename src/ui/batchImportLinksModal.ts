import { ServerNode } from '../types';
import { store } from '../state';
import { fleet } from '../fleet';
import { ICONS } from '../constants';
import { escapeHtml, showToast } from './domUtils';
import {
  parseMultipleAgentConnectionLinks,
  ParsedBatchAgentLink,
  generateTOTPWebCrypto
} from '../crypto';
import { saveServer, saveVaultSecret } from '../api';

/**
 * Batch Agent Link Import Modal
 * Parses multiple cs-agent:// links (from Ansible, Bash, Cloud-Init, or console scripts),
 * previews nodes with conflict resolution, optionally pings each node, stores secrets in Core Vault,
 * and bulk-registers nodes into servers.yaml.
 */

export function openBatchImportLinksModal(): void {
  const existingServers = store.getServers();
  const existingGroups = Array.from(new Set(existingServers.map(s => s.group).filter(Boolean)));
  const existingIds = new Set(existingServers.map(s => s.id));

  const overlay = document.createElement('div');
  overlay.className = 'cs-fleet-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'cs-fleet-modal-content cs-fleet-modal-lg cs-fleet-modal-fixed';

  let parsedItems: (ParsedBatchAgentLink & { selected: boolean; pingStatus?: string; pingColor?: string })[] = [];
  let isImporting = false;
  let isPinging = false;

  modal.innerHTML = `
    <div class="cs-fleet-modal-header">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="color:var(--cs-srv-accent);">${ICONS.link}</span>
        <span style="font-weight:700;font-size:14px;">Пакетный импорт агентов по ссылкам (Batch Link Import)</span>
      </div>
      <button class="cs-fleet-modal-close">${ICONS.close}</button>
    </div>

    <div class="cs-fleet-modal-body" style="padding:16px 20px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;">
      <!-- Banner -->
      <div style="background:var(--cs-srv-bg-subtle);border:1px solid var(--cs-srv-border);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--cs-srv-text-primary);line-height:1.5;">
        Вставьте список ссылок подключения <code>cs-agent://...</code> (полученных после развертывания скриптом, Ansible или из консоли агентов).
        Система автоматически извлечет сетевой адрес, API токен, Base32 TOTP секрет и рабочие папки, сохранит учетные данные в <b>Core Vault</b> и зарегистрирует узлы в <b>servers.yaml</b>.
      </div>

      <!-- Links Input Area -->
      <div style="background:var(--cs-srv-bg-base);border:1px solid var(--cs-srv-border);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <label class="cs-fleet-form-label" style="font-weight:600;font-size:12px;">
            Ссылки подключения (по одной на строку или фрагменты логов)
          </label>
          <div style="display:flex;gap:6px;">
            <button type="button" class="cs-fleet-btn-secondary" id="cs-batch-links-paste-btn" style="padding:2px 8px;font-size:11px;">
              📋 Вставить
            </button>
            <button type="button" class="cs-fleet-btn-secondary" id="cs-batch-links-sample-btn" style="padding:2px 8px;font-size:11px;">
              Пример
            </button>
            <button type="button" class="cs-fleet-btn-secondary" id="cs-batch-links-clear-btn" style="padding:2px 8px;font-size:11px;">
              Очистить
            </button>
          </div>
        </div>

        <textarea
          id="cs-batch-links-textarea"
          class="cs-fleet-form-input"
          style="width:100%;height:100px;font-family:monospace;font-size:11px;resize:vertical;line-height:1.4;"
          placeholder="cs-agent://cs_key_...:BASE32...@192.168.1.10:8085/?roots=/opt/projects#prod-web-01&#10;cs-agent://cs_key_...:BASE32...@192.168.1.11:8085/?roots=/opt/projects#prod-web-02"
        ></textarea>

        <!-- Live Parse Summary Bar -->
        <div id="cs-batch-parse-summary" style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--cs-srv-text-muted);">
          <span>Введите или вставьте ссылки для предварительного анализа...</span>
          <span id="cs-batch-count-badge" style="font-weight:600;display:none;"></span>
        </div>
      </div>

      <!-- Batch Target Defaults (Group, Tags, Conflict Rule) -->
      <div style="background:var(--cs-srv-bg-base);border:1px solid var(--cs-srv-border);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;">
        <div style="font-weight:600;font-size:12px;color:var(--cs-srv-text-primary);">Настройки импортируемой партии</div>
        <div class="cs-fleet-form-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));gap:10px;">
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Группа флота</label>
            <input type="text" id="cs-batch-group" class="cs-fleet-form-input" list="cs-batch-existing-groups" value="Agents" />
            <datalist id="cs-batch-existing-groups">
              ${existingGroups.map(g => `<option value="${escapeHtml(g)}"></option>`).join('')}
            </datalist>
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">Теги узлов (через запятую)</label>
            <input type="text" id="cs-batch-tags" class="cs-fleet-form-input" value="agent, remote" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">При совпадении ID в инвентаре</label>
            <select id="cs-batch-conflict-mode" class="cs-fleet-form-input">
              <option value="update" selected>Обновить существующий узел</option>
              <option value="unique">Создать уникальный ID (-2, -3)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Preview Table Section -->
      <div id="cs-batch-preview-section" style="display:none;flex-direction:column;gap:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="font-weight:600;font-size:12px;color:var(--cs-srv-text-primary);">
            Распознанные серверы: <span id="cs-batch-selected-stat" style="color:var(--cs-srv-accent);font-weight:700;">0 / 0</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button type="button" class="cs-fleet-btn-secondary" id="cs-batch-btn-select-all" style="padding:2px 8px;font-size:11px;">Выбрать все</button>
            <button type="button" class="cs-fleet-btn-secondary" id="cs-batch-btn-deselect-all" style="padding:2px 8px;font-size:11px;">Снять</button>
            <button type="button" class="cs-fleet-btn-secondary" id="cs-batch-btn-ping-all" style="padding:2px 8px;font-size:11px;display:inline-flex;align-items:center;gap:4px;">
              ⚡ <span>Проверить связь</span>
            </button>
          </div>
        </div>

        <div style="border:1px solid var(--cs-srv-border);border-radius:8px;max-height:230px;overflow-y:auto;background:var(--cs-srv-bg-base);">
          <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left;">
            <thead>
              <tr style="background:var(--cs-srv-bg-subtle);border-bottom:1px solid var(--cs-srv-border);color:var(--cs-srv-text-muted);">
                <th style="padding:6px 8px;width:28px;text-align:center;">✓</th>
                <th style="padding:6px 8px;">Имя узла</th>
                <th style="padding:6px 8px;">ID узла</th>
                <th style="padding:6px 8px;">Адрес хоста</th>
                <th style="padding:6px 8px;">Рабочие папки (Roots)</th>
                <th style="padding:6px 8px;">Ключ / TOTP</th>
                <th style="padding:6px 8px;width:110px;">Статус связи</th>
              </tr>
            </thead>
            <tbody id="cs-batch-preview-tbody"></tbody>
          </table>
        </div>
      </div>

      <!-- Execution Progress & Live Log -->
      <div id="cs-batch-progress-section" style="display:none;flex-direction:column;gap:8px;border-top:1px solid var(--cs-srv-border);padding-top:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
          <span style="font-weight:600;color:var(--cs-srv-text-primary);" id="cs-batch-progress-label">Импорт узлов...</span>
          <span style="font-family:monospace;color:var(--cs-srv-accent);font-weight:700;" id="cs-batch-progress-percent">0%</span>
        </div>
        <div style="width:100%;height:6px;background:var(--cs-srv-bg-subtle);border-radius:3px;overflow:hidden;border:1px solid var(--cs-srv-border);">
          <div id="cs-batch-progress-bar" style="height:100%;width:0%;background:var(--cs-srv-accent);transition:width 0.2s ease;"></div>
        </div>
        <div id="cs-batch-log-console" style="max-height:120px;overflow-y:auto;background:#0d1117;color:#c9d1d9;font-family:monospace;font-size:11px;padding:8px 10px;border-radius:6px;line-height:1.4;display:flex;flex-direction:column;gap:2px;"></div>
      </div>
    </div>

    <div class="cs-fleet-modal-footer">
      <div style="font-size:11px;color:var(--cs-srv-text-muted);" id="cs-batch-footer-info">
        Готово к импорту: 0 узлов
      </div>
      <div style="display:flex;gap:8px;">
        <button type="button" class="cs-fleet-btn-secondary cs-fleet-modal-cancel">Отмена</button>
        <button type="button" class="cs-fleet-btn-primary" id="cs-batch-import-submit-btn" disabled style="display:inline-flex;align-items:center;gap:6px;">
          ${ICONS.check} <span>Импортировать в флот</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.appendChild(modal);

  // Close handlers
  const closeModal = () => {
    if (isImporting) {
      if (!confirm('Импорт узлов находится в процессе выполнения. Прервать закрытие?')) return;
    }
    overlay.remove();
  };
  modal.querySelector('.cs-fleet-modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('.cs-fleet-modal-cancel')?.addEventListener('click', closeModal);

  // Elements
  const textarea = modal.querySelector('#cs-batch-links-textarea') as HTMLTextAreaElement;
  const summaryEl = modal.querySelector('#cs-batch-parse-summary') as HTMLElement;
  const badgeEl = modal.querySelector('#cs-batch-count-badge') as HTMLElement;
  const previewSection = modal.querySelector('#cs-batch-preview-section') as HTMLElement;
  const previewTbody = modal.querySelector('#cs-batch-preview-tbody') as HTMLElement;
  const selectedStatEl = modal.querySelector('#cs-batch-selected-stat') as HTMLElement;
  const footerInfoEl = modal.querySelector('#cs-batch-footer-info') as HTMLElement;
  const submitBtn = modal.querySelector('#cs-batch-import-submit-btn') as HTMLButtonElement;
  const groupInput = modal.querySelector('#cs-batch-group') as HTMLInputElement;
  const tagsInput = modal.querySelector('#cs-batch-tags') as HTMLInputElement;
  const conflictSelect = modal.querySelector('#cs-batch-conflict-mode') as HTMLSelectElement;

  const progressSection = modal.querySelector('#cs-batch-progress-section') as HTMLElement;
  const progressBar = modal.querySelector('#cs-batch-progress-bar') as HTMLElement;
  const progressPercent = modal.querySelector('#cs-batch-progress-percent') as HTMLElement;
  const progressLabel = modal.querySelector('#cs-batch-progress-label') as HTMLElement;
  const logConsole = modal.querySelector('#cs-batch-log-console') as HTMLElement;

  function addLog(msg: string, color = '#c9d1d9') {
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.style.color = color;
    line.textContent = `[${time}] ${msg}`;
    logConsole.appendChild(line);
    logConsole.scrollTop = logConsole.scrollHeight;
  }

  // Update UI and table after parse
  function updateParsedView() {
    const rawText = textarea.value.trim();
    if (!rawText) {
      parsedItems = [];
      previewSection.style.display = 'none';
      badgeEl.style.display = 'none';
      summaryEl.innerHTML = '<span>Введите или вставьте ссылки для предварительного анализа...</span>';
      submitBtn.disabled = true;
      footerInfoEl.textContent = 'Готово к импорту: 0 узлов';
      return;
    }

    const parseResult = parseMultipleAgentConnectionLinks(rawText);
    const conflictMode = conflictSelect.value;

    parsedItems = parseResult.items.map(item => {
      let finalId = item.nodeId;
      if (conflictMode === 'unique' && existingIds.has(finalId)) {
        let counter = 2;
        while (existingIds.has(`${item.nodeId}-${counter}`)) {
          counter++;
        }
        finalId = `${item.nodeId}-${counter}`;
      }
      return {
        ...item,
        nodeId: finalId,
        selected: true,
        pingStatus: 'Не проверено',
        pingColor: 'var(--cs-srv-text-muted)'
      };
    });

    // Summary Badge
    badgeEl.style.display = 'inline-block';
    if (parsedItems.length > 0) {
      badgeEl.style.color = '#10b981';
      badgeEl.textContent = `✓ Найдено: ${parsedItems.length}`;
      let warnText = '';
      if (parseResult.warnings.length > 0) {
        warnText = ` (пропущено некорректных строк: ${parseResult.warnings.length})`;
      }
      summaryEl.innerHTML = `<span style="color:#10b981;font-weight:600;">Распознано ${parsedItems.length} ссылок${warnText}</span>`;
      previewSection.style.display = 'flex';
    } else {
      badgeEl.style.color = '#ef4444';
      badgeEl.textContent = '0 ссылок';
      summaryEl.innerHTML = `<span style="color:#ef4444;">Не удалось найти валидных ссылок cs-agent://</span>`;
      previewSection.style.display = 'none';
    }

    renderTable();
    updateSubmitState();
  }

  function renderTable() {
    previewTbody.innerHTML = '';
    parsedItems.forEach((item, idx) => {
      const isExisting = existingIds.has(item.nodeId);
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid var(--cs-srv-border)';

      const rootsDisplay = item.roots && item.roots.length > 0 ? item.roots.join(', ') : '/';
      const conflictBadge = isExisting
        ? `<span style="display:inline-block;padding:1px 4px;border-radius:4px;font-size:9px;background:#f59e0b22;color:#f59e0b;font-weight:600;margin-left:4px;">обновление</span>`
        : `<span style="display:inline-block;padding:1px 4px;border-radius:4px;font-size:9px;background:#10b98122;color:#10b981;font-weight:600;margin-left:4px;">новый</span>`;

      row.innerHTML = `
        <td style="padding:6px 8px;text-align:center;">
          <input type="checkbox" class="cs-batch-item-check" data-idx="${idx}" ${item.selected ? 'checked' : ''} />
        </td>
        <td style="padding:6px 8px;font-weight:600;color:var(--cs-srv-text-primary);">
          <input type="text" class="cs-fleet-form-input cs-batch-item-name" data-idx="${idx}" value="${escapeHtml(item.nodeName)}" style="padding:2px 4px;font-size:11px;width:110px;" />
        </td>
        <td style="padding:6px 8px;font-family:monospace;color:var(--cs-srv-accent);">
          <span style="font-weight:600;">${escapeHtml(item.nodeId)}</span>
          ${conflictBadge}
        </td>
        <td style="padding:6px 8px;font-family:monospace;">
          ${escapeHtml(item.host)}:${item.port}
          ${item.tls ? '<span style="color:#10b981;font-size:9px;font-weight:700;">TLS</span>' : ''}
        </td>
        <td style="padding:6px 8px;font-size:10px;color:var(--cs-srv-text-muted);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(rootsDisplay)}">
          ${escapeHtml(rootsDisplay)}
        </td>
        <td style="padding:6px 8px;font-family:monospace;font-size:10px;">
          <span title="${escapeHtml(item.keyId)}">${escapeHtml(item.keyId.slice(0, 10))}...</span>
          <span style="color:var(--cs-srv-text-muted);">/ •••••</span>
        </td>
        <td style="padding:6px 8px;font-weight:600;font-size:10px;color:${item.pingColor || 'var(--cs-srv-text-muted)'};" id="cs-batch-ping-cell-${idx}">
          ${escapeHtml(item.pingStatus || 'Не проверено')}
        </td>
      `;

      // Checkbox handler
      const chk = row.querySelector('.cs-batch-item-check') as HTMLInputElement;
      chk.addEventListener('change', () => {
        parsedItems[idx].selected = chk.checked;
        updateSubmitState();
      });

      // Name edit handler
      const nameInput = row.querySelector('.cs-batch-item-name') as HTMLInputElement;
      nameInput.addEventListener('input', () => {
        parsedItems[idx].nodeName = nameInput.value.trim() || parsedItems[idx].nodeId;
      });

      previewTbody.appendChild(row);
    });
  }

  function updateSubmitState() {
    const selectedCount = parsedItems.filter(i => i.selected).length;
    selectedStatEl.textContent = `${selectedCount} / ${parsedItems.length}`;
    footerInfoEl.textContent = `Готово к импорту: ${selectedCount} узлов`;
    submitBtn.disabled = selectedCount === 0 || isImporting;
    submitBtn.innerHTML = `${ICONS.check} <span>Импортировать ${selectedCount} узлов</span>`;
  }

  // Ping handler
  async function pingItem(idx: number) {
    const item = parsedItems[idx];
    const cell = modal.querySelector(`#cs-batch-ping-cell-${idx}`);
    if (cell) {
      cell.innerHTML = '<span style="color:var(--cs-srv-accent);">⌛ Тест...</span>';
    }

    const start = performance.now();
    try {
      const otp = await generateTOTPWebCrypto(item.secret);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      const testUrl = `${item.tls ? 'https' : 'http'}://${item.host}:${item.port}/api/status`;

      const res = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${item.keyId}:${otp}` },
        signal: ctrl.signal
      }).catch(err => {
        throw new Error(err.name === 'AbortError' ? 'Таймаут (3.5с)' : err.message);
      });
      clearTimeout(timer);

      const ms = Math.round(performance.now() - start);
      if (res.ok) {
        let level = 'Read/Write';
        try {
          const d = await res.json();
          if (d.accessLevel) level = d.accessLevel;
        } catch (_) {}
        item.pingStatus = `✓ Онлайн (${ms}ms) [${level}]`;
        item.pingColor = '#10b981';
      } else {
        item.pingStatus = `⚠ HTTP ${res.status}`;
        item.pingColor = '#f59e0b';
      }
    } catch (err: any) {
      item.pingStatus = `✕ ${err.message || 'Сбой'}`;
      item.pingColor = '#ef4444';
    }

    if (cell) {
      cell.style.color = item.pingColor;
      cell.textContent = item.pingStatus;
    }
  }

  modal.querySelector('#cs-batch-btn-ping-all')?.addEventListener('click', async () => {
    if (isPinging) return;
    isPinging = true;
    const pingBtn = modal.querySelector('#cs-batch-btn-ping-all') as HTMLButtonElement;
    pingBtn.disabled = true;
    pingBtn.innerHTML = '⌛ <span>Проверка...</span>';

    const selectedIndices = parsedItems.map((item, idx) => item.selected ? idx : -1).filter(i => i >= 0);
    await Promise.allSettled(selectedIndices.map(idx => pingItem(idx)));

    pingBtn.disabled = false;
    pingBtn.innerHTML = '⚡ <span>Проверить связь</span>';
    isPinging = false;
  });

  // Action Buttons
  modal.querySelector('#cs-batch-btn-select-all')?.addEventListener('click', () => {
    parsedItems.forEach(i => i.selected = true);
    renderTable();
    updateSubmitState();
  });

  modal.querySelector('#cs-batch-btn-deselect-all')?.addEventListener('click', () => {
    parsedItems.forEach(i => i.selected = false);
    renderTable();
    updateSubmitState();
  });

  textarea.addEventListener('input', () => {
    updateParsedView();
  });

  conflictSelect.addEventListener('change', () => {
    updateParsedView();
  });

  // Paste from clipboard
  modal.querySelector('#cs-batch-links-paste-btn')?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        textarea.value = text;
        updateParsedView();
        showToast('Ссылки успешно вставлены из буфера обмена', 'success');
      }
    } catch (err) {
      showToast('Не удалось получить доступ к буферу обмена. Вставьте вручную (Ctrl+V)', 'warning');
    }
  });

  // Clear button
  modal.querySelector('#cs-batch-links-clear-btn')?.addEventListener('click', () => {
    textarea.value = '';
    updateParsedView();
  });

  // Sample button
  modal.querySelector('#cs-batch-links-sample-btn')?.addEventListener('click', () => {
    textarea.value = `# Демонстрационный список узлов агентов
cs-agent://cs_key_56643d5586e39415ec34721cfc1b31b6:JBSWY3DPEHPK3PXP@192.168.1.101:8085/?roots=/opt/projects,/var/www#prod-frontend-01
cs-agent://cs_key_77743d5586e39415ec34721cfc1b31b7:KRSXG5CTMVRXEZLU@192.168.1.102:8085/?roots=/opt/projects,/var/log#prod-backend-01
cs-agent://cs_key_88843d5586e39415ec34721cfc1b31b8:ORSXG5CTMVRXEZLV@192.168.1.103:9085/?roots=/data/db#prod-database-01`;
    updateParsedView();
  });

  // Submit Batch Import
  submitBtn.addEventListener('click', async () => {
    const targets = parsedItems.filter(i => i.selected);
    if (targets.length === 0 || isImporting) return;

    isImporting = true;
    submitBtn.disabled = true;
    progressSection.style.display = 'flex';
    logConsole.innerHTML = '';

    const targetGroup = groupInput.value.trim() || 'Agents';
    const targetTags = tagsInput.value
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    if (targetTags.length === 0) {
      targetTags.push('agent', 'remote');
    }

    addLog(`Запуск пакетного импорта: целевых узлов: ${targets.length}, группа: "${targetGroup}"`, '#38bdf8');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const item = targets[i];
      const percent = Math.round(((i + 1) / targets.length) * 100);
      progressBar.style.width = `${percent}%`;
      progressPercent.textContent = `${percent}%`;
      progressLabel.textContent = `Импорт узла ${i + 1} из ${targets.length}: ${item.nodeName}`;

      try {
        // 1. Core Vault Secret synchronization
        const vaultSecretId = `agent:${item.nodeId}`;
        const secretVal = JSON.stringify({
          keyId: item.keyId,
          secret: item.secret
        });

        await saveVaultSecret({
          id: vaultSecretId,
          title: `Agent Credentials (${item.nodeName})`,
          type: 'agent_credentials',
          scope: 'shared',
          pluginId: 'servers',
          value: secretVal
        });
        addLog(`[${item.nodeId}] Секрет Core Vault (${vaultSecretId}) сохранен`, '#10b981');

        // 2. Build ServerNode configuration
        const serverNode: ServerNode = {
          id: item.nodeId,
          name: item.nodeName || item.nodeId,
          group: targetGroup,
          tags: targetTags,
          icon: 'server',
          connection: {
            agent: {
              enabled: true,
              url: `${item.tls ? 'https' : 'http'}://${item.host}:${item.port}`,
              port: item.port,
              roots: item.roots && item.roots.length > 0 ? item.roots : ['/'],
              vaultSecret: vaultSecretId,
              tlsVerify: false
            }
          }
        };

        // 3. Save into servers.yaml
        await saveServer(serverNode);
        addLog(`[${item.nodeId}] Узел успешно зарегистрирован в servers.yaml (${item.host}:${item.port})`, '#10b981');
        successCount++;
      } catch (err: any) {
        addLog(`[${item.nodeId}] Ошибка импорта: ${err.message || err}`, '#ef4444');
        failCount++;
      }
    }

    addLog(`Пакетный импорт завершен: успешно: ${successCount}, ошибок: ${failCount}`, successCount > 0 ? '#10b981' : '#ef4444');

    // Reload fleet store to update UI cards immediately
    try {
      await fleet.loadServers();
    } catch (_) {}

    showToast(`Импортировано ${successCount} агентов в флот!`, successCount > 0 ? 'success' : 'error');

    isImporting = false;
    submitBtn.innerHTML = `${ICONS.check} <span>Готово</span>`;
    setTimeout(() => {
      if (failCount === 0) {
        closeModal();
      }
    }, 1500);
  });
}
