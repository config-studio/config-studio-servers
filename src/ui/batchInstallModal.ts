import { BatchInstallEvent, DropdownController } from '../types';
import { store } from '../state';
import { fleet } from '../fleet';
import { ICONS } from '../constants';
import { escapeHtml, showToast } from './domUtils';
import { openBatchImportLinksModal } from './batchImportLinksModal';

/**
 * Fleet Batch Provisioning Modal
 * Manages parallel remote agent deployment over SSE streaming.
 */

export function openBatchInstallModal(initialSelectedIds: string[] = []): void {
  const servers = store.getServers();
  const nonLocalServers = servers.filter(s => s.id !== 'localhost');
  if (nonLocalServers.length === 0) {
    showToast('В инвентаре нет удаленных серверов (только localhost)', 'warning');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'cs-fleet-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'cs-fleet-modal-content cs-fleet-modal-lg cs-fleet-modal-fixed';

  const selectedMap = new Set<string>();
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
  let batchAbortCtrl: AbortController | null = null;

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
      <div style="background:var(--cs-srv-bg-subtle);border:1px solid var(--cs-srv-border);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--cs-srv-text-primary);line-height:1.5;">
        <div>
          Параллельное автоматическое развертывание <b>config-studio-agent</b> на выбранные серверы флота: автоопределение ОС и архитектуры, потоковая передача бинарника по SFTP, регистрация службы (systemd/OpenRC) и генерация уникальных TOTP-секретов в Core Vault.
        </div>
        <div style="margin-top:6px;font-size:11.5px;color:var(--cs-srv-text-muted);">
          Уже развернули агентов через Ansible, Bash или консоль?
          <a href="#" id="cs-batch-switch-to-links" style="color:var(--cs-srv-accent);text-decoration:underline;cursor:pointer;font-weight:600;">Импортировать готовые ссылки cs-agent:// пакетом</a>
        </div>
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
  const serviceTypeContainer = modal.querySelector('#cs-batch-service-type-container') as HTMLElement;
  let serviceTypeDropdown: DropdownController | null = null;
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

  const targetListEl = modal.querySelector('#cs-batch-target-list') as HTMLElement;
  const selectedCountEl = modal.querySelector('#cs-batch-selected-count') as HTMLElement;
  const runBtn = modal.querySelector('#cs-batch-run-btn') as HTMLButtonElement;
  const closeBtn = modal.querySelector('#cs-batch-close-btn') as HTMLButtonElement;
  const progressSection = modal.querySelector('#cs-batch-progress-section') as HTMLElement;
  const progressBar = modal.querySelector('#cs-batch-progress-bar') as HTMLElement;
  const progressStats = modal.querySelector('#cs-batch-progress-stats') as HTMLElement;
  const executionListEl = modal.querySelector('#cs-batch-execution-list') as HTMLElement;
  const statusHint = modal.querySelector('#cs-batch-status-hint') as HTMLElement;

  function updateSelectionView() {
    selectedCountEl.textContent = String(selectedMap.size);
    runBtn.innerHTML = `${ICONS.agent} <span>Начать установку (${selectedMap.size})</span>`;
    runBtn.disabled = selectedMap.size === 0;

    modal.querySelectorAll('.cs-batch-host-item').forEach(row => {
      const id = row.getAttribute('data-id');
      const chk = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
      const isSel = id ? selectedMap.has(id) : false;
      if (chk) chk.checked = isSel;
      row.classList.toggle('selected', isSel);
    });
  }

  function renderTargetList() {
    targetListEl.innerHTML = '';
    nonLocalServers.forEach(s => {
      const hasAgent = Boolean(s.connection?.agent?.enabled);
      const hostInfo = s.connection?.ssh?.host
        ? `${s.connection.ssh.user || 'root'}@${s.connection.ssh.host}:${s.connection.ssh.port || 22}`
        : s.id;
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
          ${
            hasAgent
              ? '<span class="cs-batch-status-pill cs-batch-status-success">✓ Агент активен</span>'
              : '<span class="cs-batch-status-pill cs-batch-status-pending">Только SSH</span>'
          }
        </div>
      `;

      row.addEventListener('click', e => {
        if (isRunning) return;
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          const chk = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
          if (chk) chk.checked = !chk.checked;
        }
        const chk = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
        if (chk?.checked) {
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
  modal.querySelector('#cs-batch-btn-no-agent')?.addEventListener('click', () => {
    if (isRunning) return;
    selectedMap.clear();
    nonLocalServers.filter(s => !s.connection?.agent?.enabled).forEach(s => selectedMap.add(s.id));
    updateSelectionView();
  });

  modal.querySelector('#cs-batch-btn-all')?.addEventListener('click', () => {
    if (isRunning) return;
    selectedMap.clear();
    nonLocalServers.forEach(s => selectedMap.add(s.id));
    updateSelectionView();
  });

  modal.querySelector('#cs-batch-btn-none')?.addEventListener('click', () => {
    if (isRunning) return;
    selectedMap.clear();
    updateSelectionView();
  });

  function closeModal() {
    if (batchAbortCtrl) {
      try {
        batchAbortCtrl.abort();
      } catch (_) {}
      batchAbortCtrl = null;
    }
    try {
      serviceTypeDropdown?.destroy();
    } catch (_) {}
    overlay.remove();
  }

  modal.querySelector('.cs-fleet-modal-close')?.addEventListener('click', closeModal);
  closeBtn?.addEventListener('click', closeModal);

  modal.querySelector('#cs-batch-switch-to-links')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
    openBatchImportLinksModal();
  });

  // Host status tracking for live execution
  const hostStatusMap = new Map<string, BatchInstallEvent>();

  function renderExecutionRow(st: BatchInstallEvent) {
    let card = executionListEl.querySelector(`[data-exec-id="${st.serverId}"]`) as HTMLElement;
    if (!card) {
      card = document.createElement('div');
      card.setAttribute('data-exec-id', st.serverId);
      card.style.cssText =
        'background:var(--cs-srv-bg-base);border:1px solid var(--cs-srv-border);border-radius:8px;padding:8px 12px;font-size:11.5px;';
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
          ${hasLogs ? `<button type="button" class="cs-batch-log-toggle" style="background:none;border:none;cursor:pointer;color:var(--cs-srv-accent);font-size:10.5px;text-decoration:underline;">Журнал (${st.logs!.length})</button>` : ''}
        </div>
      </div>
      ${
        hasLogs
          ? `
        <div class="cs-batch-log-drawer" style="display:none;margin-top:6px;background:#090d16;padding:8px;border-radius:6px;font-family:monospace;font-size:10.5px;max-height:100px;overflow-y:auto;color:#cbd5e1;line-height:1.4;">
          ${st.logs!.map(l => `<div>${escapeHtml(l)}</div>`).join('')}
        </div>
      `
          : ''
      }
    `;

    if (hasLogs) {
      const toggleBtn = card.querySelector('.cs-batch-log-toggle') as HTMLButtonElement;
      const drawer = card.querySelector('.cs-batch-log-drawer') as HTMLElement;
      if (toggleBtn && drawer) {
        toggleBtn.addEventListener('click', e => {
          e.stopPropagation();
          const isOpen = drawer.style.display !== 'none';
          drawer.style.display = isOpen ? 'none' : 'block';
          toggleBtn.textContent = isOpen ? `Журнал (${st.logs!.length})` : 'Скрыть журнал';
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
    (modal.querySelector('#cs-batch-settings-card') as HTMLElement).style.display = 'none';
    (modal.querySelector('#cs-batch-target-header') as HTMLElement).style.display = 'none';
    (modal.querySelector('#cs-batch-target-list') as HTMLElement).style.display = 'none';
    progressSection.style.display = 'flex';

    const targetIds = Array.from(selectedMap);
    const customPort = parseInt((modal.querySelector('#cs-batch-port') as HTMLInputElement).value, 10) || 8085;
    const concurrency = parseInt((modal.querySelector('#cs-batch-concurrency') as HTMLInputElement).value, 10) || 4;
    const useSudo = (modal.querySelector('#cs-batch-sudo') as HTMLInputElement).checked;
    const skipHealthy = (modal.querySelector('#cs-batch-skip-healthy') as HTMLInputElement).checked;
    const svcSelect = modal.querySelector('#cs-batch-service-type') as HTMLSelectElement;
    const serviceType = serviceTypeDropdown?.getValue ? serviceTypeDropdown.getValue() : svcSelect ? svcSelect.value : 'auto';

    targetIds.forEach(id => {
      const srv = servers.find(s => s.id === id);
      const initStatus: BatchInstallEvent = {
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
        if (st.status === 'success') {
          completedCount++;
          successCount++;
        } else if (st.status === 'error') {
          completedCount++;
          errorCount++;
        } else if (st.status === 'skipped') {
          completedCount++;
          skippedCount++;
        }
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
    batchAbortCtrl = new AbortController();
    let isDone = false;

    function handleProgressEvent(dataStr: string) {
      try {
        const st = JSON.parse(dataStr);
        const current = hostStatusMap.get(st.serverId) || { serverId: st.serverId, status: 'pending' };
        const merged: BatchInstallEvent = Object.assign(current, st);
        hostStatusMap.set(st.serverId, merged);
        renderExecutionRow(merged);
        updateOverallProgress();
      } catch (err) {
        console.warn('[BatchInstall] Error parsing progress event:', err);
      }
    }

    async function handleDoneEvent(dataStr: string) {
      if (isDone) return;
      isDone = true;
      try {
        const summary = JSON.parse(dataStr);
        progressBar.style.width = '100%';
        closeBtn.style.display = 'none';
        runBtn.innerHTML = `<span>✓ Готово</span>`;
        runBtn.disabled = false;
        runBtn.onclick = closeModal;
        statusHint.textContent = `Готово! Успешно: ${summary.success}, Ошибок: ${summary.failed}, Пропущено: ${summary.skipped}`;
        showToast(
          `Массовая установка завершена! Успешно: ${summary.success}, Ошибок: ${summary.failed}`,
          summary.failed > 0 ? 'warning' : 'success'
        );
      } catch (_) {
        showToast('Массовая установка завершена!', 'success');
      }
      if (batchAbortCtrl) {
        try {
          batchAbortCtrl.abort();
        } catch (_) {}
        batchAbortCtrl = null;
      }
      isRunning = false;
      await fleet.loadAndSyncServers();
    }

    function handleStreamError() {
      if (isDone) return;
      if (batchAbortCtrl) {
        try {
          batchAbortCtrl.abort();
        } catch (_) {}
        batchAbortCtrl = null;
      }
      isRunning = false;
      closeBtn.style.display = 'none';
      runBtn.innerHTML = `<span>Закрыть</span>`;
      runBtn.disabled = false;
      runBtn.onclick = closeModal;
      statusHint.textContent = 'Связь с сервером завершена.';
      fleet.loadAndSyncServers();
    }

    // Stream with X-ConfigStudio-Web header
    (async () => {
      try {
        const streamRes = await fetch(url, {
          headers: {
            'X-ConfigStudio-Web': '1',
            Accept: 'text/event-stream'
          },
          signal: batchAbortCtrl?.signal
        });
        if (!streamRes.ok) {
          let msg = streamRes.statusText;
          try {
            const j = await streamRes.json();
            if (j && j.error) msg = j.error;
          } catch (_) {}
          throw new Error(`HTTP ${streamRes.status}: ${msg}`);
        }
        if (!streamRes.body) throw new Error('ReadableStream not available');

        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = 'message';
        let currentData = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              if (currentData) {
                if (currentEvent === 'progress') handleProgressEvent(currentData);
                else if (currentEvent === 'done') await handleDoneEvent(currentData);
                currentEvent = 'message';
                currentData = '';
              }
              continue;
            }
            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.slice(6).trim();
            } else if (trimmed.startsWith('data:')) {
              currentData += (currentData ? '\n' : '') + trimmed.slice(5).trim();
            }
          }
        }
        if (currentData) {
          if (currentEvent === 'progress') handleProgressEvent(currentData);
          else if (currentEvent === 'done') await handleDoneEvent(currentData);
        }
        if (!isDone) {
          handleStreamError();
        }
      } catch (err) {
        if (!isDone && !batchAbortCtrl?.signal.aborted) {
          console.warn('[BatchInstall] Stream error:', err);
          handleStreamError();
        }
      }
    })();
  });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
