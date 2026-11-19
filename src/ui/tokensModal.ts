import { ServerNode } from '../types';
import { ICONS } from '../constants';
import { escapeHtml, showToast } from './domUtils';
import { getAgentAuthToken } from '../crypto';

/**
 * Scoped Monitoring Tokens Dialog
 * Manages Prometheus / Grafana telemetry tokens on a remote agent node.
 */

export async function openTokensModal(server: ServerNode): Promise<void> {
  if (!server.connection?.agent?.enabled || !server.connection.agent.url) {
    showToast('Агент не настроен для данного узла', 'error');
    return;
  }

  const agentUrl = server.connection.agent.url;

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

  const listContainer = modal.querySelector('#cs-tokens-list') as HTMLElement;

  async function loadTokens() {
    listContainer.innerHTML =
      '<div style="text-align:center;color:#8b949e;padding:10px;font-size:12px;">⏳ Загрузка списка токенов...</div>';
    try {
      const token = await getAgentAuthToken(server);
      const res = await fetch(`/api/remote-proxy/api/tokens`, {
        method: 'GET',
        headers: {
          'X-ConfigStudio-Web': '1',
          Authorization: `Bearer ${token}`,
          'X-Remote-Target': agentUrl
        }
      });

      if (res.ok) {
        const data = await res.json();
        renderTokens(data.tokens || []);
      } else {
        listContainer.innerHTML = `<div style="color:#f87171;font-size:12px;">Не удалось загрузить токены: HTTP ${res.status}</div>`;
      }
    } catch (e: any) {
      listContainer.innerHTML = `<div style="color:#f87171;font-size:12px;">Ошибка связи: ${e.message}</div>`;
    }
  }

  function renderTokens(tokens: any[]) {
    if (tokens.length === 0) {
      listContainer.innerHTML =
        '<div style="text-align:center;color:#8b949e;padding:10px;font-size:12px;">Нет созданных токенов мониторинга</div>';
      return;
    }
    listContainer.innerHTML = '';
    tokens.forEach(tok => {
      const item = document.createElement('div');
      item.style.cssText =
        'padding:8px 10px;background:rgba(255,255,255,0.03);border:1px solid #30363d;border-radius:8px;display:flex;justify-content:space-between;align-items:center;font-size:12px;';
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

      (item.querySelector('.cs-copy-tok') as HTMLButtonElement).onclick = () => {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(tok.token);
          showToast('Токен скопирован в буфер обмена!', 'success');
        } else {
          prompt('Скопируйте токен:', tok.token);
        }
      };

      (item.querySelector('.cs-del-tok') as HTMLButtonElement).onclick = async () => {
        if (!confirm(`Удалить токен ${tok.id}?`)) return;
        const token = await getAgentAuthToken(server);
        await fetch(`/api/remote-proxy/api/tokens/${encodeURIComponent(tok.id)}`, {
          method: 'DELETE',
          headers: {
            'X-ConfigStudio-Web': '1',
            Authorization: `Bearer ${token}`,
            'X-Remote-Target': agentUrl
          }
        });
        loadTokens();
      };

      listContainer.appendChild(item);
    });
  }

  const createBtn = modal.querySelector('#cs-btn-create-tok') as HTMLButtonElement;
  createBtn.onclick = async () => {
    const idInp = modal.querySelector('#cs-new-tok-id') as HTMLInputElement;
    const descInp = modal.querySelector('#cs-new-tok-desc') as HTMLInputElement;
    const id = idInp.value.trim();
    const desc = descInp.value.trim();
    if (!id) {
      showToast('Введите ID токена', 'error');
      return;
    }

    const topics: string[] = [];
    if ((modal.querySelector('#top-metrics') as HTMLInputElement)?.checked) topics.push('metrics');
    if ((modal.querySelector('#top-health') as HTMLInputElement)?.checked) topics.push('health');

    try {
      const token = await getAgentAuthToken(server);
      const res = await fetch(`/api/remote-proxy/api/tokens`, {
        method: 'POST',
        headers: {
          'X-ConfigStudio-Web': '1',
          Authorization: `Bearer ${token}`,
          'X-Remote-Target': agentUrl,
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
    } catch (e: any) {
      showToast(`Ошибка: ${e.message}`, 'error');
    }
  };

  loadTokens();
}
