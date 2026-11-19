import { ServerNode, DropdownController } from '../types';
import { fleet } from '../fleet';
import { ICONS } from '../constants';
import { escapeHtml, showToast } from './domUtils';
import { installAgent } from '../api';
import { openManualAgentModal } from './manualAgentModal';

/**
 * 1-Click Remote Agent Installer / Upgrader Dialog
 */

export function openInstallAgentDialog(srv: ServerNode, isUpgrade: boolean = false): void {
  const overlay = document.createElement('div');
  overlay.className = 'cs-fleet-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'cs-fleet-modal-content cs-fleet-modal-lg';

  modal.innerHTML = `
    <div class="cs-fleet-modal-header">
      <div style="display:flex;align-items:center;gap:8px;">
        <span>${ICONS.agent}</span>
        <span style="font-weight:700;font-size:14px;">${
          isUpgrade
            ? `1-Click Обновление Remote Agent на ${escapeHtml(srv.name)}`
            : `1-Click Установка Remote Agent на ${escapeHtml(srv.name)}`
        }</span>
      </div>
      <button class="cs-fleet-modal-close">${ICONS.close}</button>
    </div>

    <div class="cs-fleet-modal-body" style="padding:16px 20px;">
      <div style="background:var(--cs-srv-bg-subtle);border:1px solid var(--cs-srv-border);border-radius:10px;padding:14px;margin-bottom:14px;font-size:12px;color:var(--cs-srv-text-primary);">
        ${
          isUpgrade
            ? `
          <div><b>Режим:</b> <span style="font-family:monospace;color:var(--cs-srv-accent);">Атомарное обновление бинарника (Upgrade)</span></div>
          <div style="margin-top:4px;color:var(--cs-srv-text-muted);">Config Studio подключится по SSH к <span style="font-family:monospace;color:var(--cs-srv-accent);">${escapeHtml(
            srv.connection?.ssh?.user || srv.user || 'root'
          )}@${escapeHtml(srv.connection?.ssh?.host || srv.host || '')}:${srv.connection?.ssh?.port || srv.port || 22}</span>, создаст резервную копию бинарника (.bak), установит новую версию, сохранит текущие ключи TOTP/Vault и перезапустит службу агента.</div>
        `
            : `
          <div><b>Целевой SSH сервер:</b> <span style="font-family:monospace;color:var(--cs-srv-accent);">${escapeHtml(
            srv.connection?.ssh?.user || srv.user || 'root'
          )}@${escapeHtml(srv.connection?.ssh?.host || srv.host || '')}:${srv.connection?.ssh?.port || srv.port || 22}</span></div>
          <div style="margin-top:4px;color:var(--cs-srv-text-muted);">Config Studio автоматически подключится по SSH, определит архитектуру (Linux x86_64/arm64), скопирует бинарник по SFTP, зарегистрирует и запустит службу демона (systemd/OpenRC) и переведет узел в гибридный режим.</div>
        `
        }
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

      <div class="cs-fleet-checkbox-row" style="margin-bottom:10px;">
        <input type="checkbox" id="cs-install-sudo" checked />
        <label for="cs-install-sudo">Использовать sudo для привилегированных команд</label>
      </div>

      <div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.02);border:1px solid var(--cs-srv-border);border-radius:8px;padding:8px 12px;font-size:11.5px;">
        <span style="color:var(--cs-srv-text-muted);">Агент уже запущен или нет прямого SSH-доступа?</span>
        <button type="button" id="cs-install-manual-btn" style="background:none;border:none;color:#38bdf8;cursor:pointer;padding:0;text-decoration:underline;font-size:11.5px;display:inline-flex;align-items:center;gap:4px;">
          <span>Ручная настройка (IP, порт, TOTP) →</span>
        </button>
      </div>

      <!-- Terminal Logs Window -->
      <div id="cs-install-terminal" style="background:var(--cs-srv-bg-base);border:1px solid var(--cs-srv-border);border-radius:8px;padding:12px;font-family:monospace;font-size:11px;min-height:160px;max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;color:var(--cs-srv-accent);">
        <div style="color:var(--cs-srv-text-muted);">${
          isUpgrade ? '[Готов к обновлению] Нажмите «Обновить агент»...' : '[Готов к установке] Нажмите «Начать установку»...'
        }</div>
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

  const serviceTypeContainer = modal.querySelector('#cs-install-service-type-container') as HTMLElement;
  let serviceTypeDropdown: DropdownController | null = null;

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
    try {
      serviceTypeDropdown?.destroy();
    } catch (_) {}
    overlay.remove();
  }

  modal.querySelector('.cs-fleet-modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('#cs-install-cancel-btn')?.addEventListener('click', closeModal);
  modal.querySelector('#cs-install-manual-btn')?.addEventListener('click', () => {
    closeModal();
    openManualAgentModal(srv);
  });

  const runBtn = modal.querySelector('#cs-install-run-btn') as HTMLButtonElement;
  const termEl = modal.querySelector('#cs-install-terminal') as HTMLElement;
  const portInput = modal.querySelector('#cs-install-port') as HTMLInputElement;
  const sudoInput = modal.querySelector('#cs-install-sudo') as HTMLInputElement;
  const svcSelect = modal.querySelector('#cs-install-service-type') as HTMLSelectElement;

  runBtn?.addEventListener('click', async () => {
    const customPort = parseInt(portInput.value, 10) || 8085;
    const useSudo = sudoInput ? sudoInput.checked : true;
    const serviceType = serviceTypeDropdown?.getValue ? serviceTypeDropdown.getValue() : svcSelect ? svcSelect.value : 'auto';

    runBtn.disabled = true;
    runBtn.innerHTML = `<span>⏳ ${isUpgrade ? 'Обновление...' : 'Установка...'}</span>`;
    termEl.innerHTML = `<div style="color:#e2e8f0;">[1/6] Запуск процесса ${isUpgrade ? 'обновления' : 'развертывания'} на ${escapeHtml(
      srv.connection?.ssh?.host || srv.host || ''
    )}...</div>`;

    try {
      const res = await installAgent(srv.id, {
        port: customPort,
        useSudo: useSudo,
        serviceType: serviceType,
        upgradeOnly: isUpgrade
      });

      if (res.logs && res.logs.length > 0) {
        termEl.innerHTML = res.logs
          .map((line: string) => {
            const isSuccess = line.startsWith('✓');
            const isErr = line.toLowerCase().includes('ошибка') || line.toLowerCase().includes('error');
            const color = isSuccess ? '#34d399' : isErr ? '#f87171' : '#a5f3fc';
            return `<div style="color:${color};margin-bottom:2px;">${escapeHtml(line)}</div>`;
          })
          .join('');
      }

      if (res.success) {
        termEl.innerHTML += `<div style="color:#10b981;font-weight:700;margin-top:6px;">Успешно! Демон активен на ${escapeHtml(
          res.agentUrl
        )}. ${isUpgrade ? 'Агент успешно обновлен!' : 'Узел переведен в гибридный режим!'}</div>`;
        runBtn.innerHTML = `<span>Готово</span>`;
        showToast(
          isUpgrade ? `Агент на ${srv.name} успешно обновлен!` : `Агент успешно установлен на ${srv.name}!`,
          'success'
        );
        await fleet.loadAndSyncServers();
        setTimeout(closeModal, 1800);
      } else {
        throw new Error(res.error || 'Сбой установки агента');
      }
    } catch (err: any) {
      termEl.innerHTML += `<div style="color:#ef4444;font-weight:700;margin-top:6px;">Ошибка: ${escapeHtml(err.message)}</div>`;
      runBtn.disabled = false;
      runBtn.innerHTML = `<span>Повторить</span>`;
      showToast(`Ошибка: ${err.message}`, 'error');
    }
  });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
