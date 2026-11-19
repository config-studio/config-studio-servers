import { DropdownController, DropdownOption } from '../types';
import { store } from '../state';
import { ICONS } from '../constants';
import { escapeHtml, showToast } from './domUtils';
import { getAgentAuthToken } from '../crypto';
import { apiFetch } from '../api';

/**
 * Context Menu: Send File to Fleet Node Modal
 * Provides target node selection, interactive directory browsing, and file transmission.
 */

export async function openSendToFleetModal(filename: string, fileContent: string): Promise<void> {
  const servers = store.getServers();

  const overlay = document.createElement('div');
  overlay.className = 'cs-fleet-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'cs-fleet-modal-content cs-fleet-modal-md';

  // Build target server options (Localhost + All servers in fleet)
  const targetOptions: DropdownOption[] = servers.map(s => {
    const isLocal = s.id === 'localhost';
    const hasAgent = Boolean(s.connection?.agent?.enabled);
    const hasSSH = Boolean(s.connection?.ssh?.enabled || s.host);
    let badge = 'LOCAL';
    let badgeColor = 'blue';
    if (!isLocal) {
      if (hasAgent && hasSSH) {
        badge = 'AGENT + SSH';
        badgeColor = 'green';
      } else if (hasAgent) {
        badge = 'AGENT';
        badgeColor = 'green';
      } else if (hasSSH) {
        badge = 'SSH';
        badgeColor = 'purple';
      }
    }
    const ping = store.getPingData(s.id) as any;
    return {
      value: s.id,
      label: s.name,
      subtitle: isLocal ? 'Локальный хост' : s.connection?.ssh?.host || s.connection?.agent?.url || s.host || s.id,
      badge,
      badgeColor,
      statusDot: ping?.status === 'online' ? 'online' : 'offline',
      server: s
    };
  });

  let selectedTargetId = targetOptions[0]?.value || 'localhost';
  let targetDropdownCtrl: DropdownController | null = null;

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
    try {
      targetDropdownCtrl?.destroy();
    } catch (_) {}
    overlay.remove();
  };

  modal.querySelector('.cs-fleet-modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('#fleet-send-cancel')?.addEventListener('click', closeModal);

  const targetContainer = modal.querySelector('#fleet-send-target-container') as HTMLElement;
  const destDirLabel = modal.querySelector('#fleet-send-dest-dir-label') as HTMLElement;
  const destDirInput = modal.querySelector('#fleet-send-dest-dir') as HTMLInputElement;
  const destFilenameInput = modal.querySelector('#fleet-send-dest-filename') as HTMLInputElement;
  const browseBtn = modal.querySelector('#fleet-send-browse-btn') as HTMLButtonElement;
  const pickerContainer = modal.querySelector('#fleet-send-folder-picker') as HTMLElement;
  const pickerCrumbs = modal.querySelector('#fleet-send-picker-crumbs') as HTMLElement;
  const pickerItems = modal.querySelector('#fleet-send-picker-items') as HTMLElement;
  const submitBtn = modal.querySelector('#fleet-send-submit') as HTMLButtonElement;

  function updateTargetDirState(srvId: string) {
    selectedTargetId = srvId;
    const srv = servers.find(s => s.id === srvId);
    if (srvId === 'localhost') {
      destDirLabel.textContent = 'Рабочая папка на хосте (Localhost)';
      destDirInput.placeholder = 'Корень рабочей области (или подпапка)';
      destDirInput.value = (typeof localStorage !== 'undefined' && localStorage.getItem('cs_last_dir_local')) || '';
    } else {
      destDirLabel.textContent = `Рабочая папка на ${srv?.name || srvId}`;
      destDirInput.placeholder = '/opt/test';
      destDirInput.value = (typeof localStorage !== 'undefined' && localStorage.getItem(`cs_last_dir_${srvId}`)) || '/opt/test';
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
      onChange: (val: string) => updateTargetDirState(val)
    });
  } else {
    targetContainer.innerHTML = `
      <select class="cs-fleet-form-select" id="fleet-send-target-select">
        ${targetOptions
          .map(
            t =>
              `<option value="${escapeHtml(t.value)}" ${t.value === selectedTargetId ? 'selected' : ''}>${escapeHtml(
                t.label
              )} (${escapeHtml(t.subtitle)})</option>`
          )
          .join('')}
      </select>
    `;
    const sel = targetContainer.querySelector('select') as HTMLSelectElement;
    sel?.addEventListener('change', e => updateTargetDirState((e.target as HTMLSelectElement).value));
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

  async function loadFolderPicker(dirPath: string) {
    pickerItems.innerHTML = '<div style="color:#8b949e;padding:6px;font-size:11px;">⏳ Чтение каталога...</div>';
    renderBreadcrumbs(dirPath);

    const targetServer = servers.find(s => s.id === selectedTargetId);
    let items: Array<{ name: string; isDir: boolean }> = [];

    try {
      if (selectedTargetId === 'localhost') {
        const res = await fetch(`/api/fs/tree?path=${encodeURIComponent(dirPath)}`, {
          headers: { 'X-ConfigStudio-Web': '1' }
        });
        if (res.ok) {
          const data = await res.json();
          items = (data.items || []).filter((i: any) => i.isDir);
        }
      } else if (targetServer?.connection?.agent?.enabled && targetServer.connection.agent.url) {
        const token = await getAgentAuthToken(targetServer);
        const res = await fetch(`/api/remote-proxy/api/fs/tree?path=${encodeURIComponent(dirPath)}`, {
          headers: {
            'X-ConfigStudio-Web': '1',
            'X-Remote-Target': targetServer.connection.agent.url,
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          items = (data.items || []).filter((i: any) => i.isDir);
        }
      }
    } catch (err) {
      console.warn('[loadFolderPicker error]', err);
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

  function renderBreadcrumbs(dirPath: string) {
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
        if (typeof localStorage !== 'undefined') localStorage.setItem('cs_last_dir_local', targetDir);
      } else if (targetServer?.connection?.agent?.enabled && targetServer.connection.agent.url) {
        const token = await getAgentAuthToken(targetServer);
        const fullPath = targetDir ? `${targetDir.replace(/\/+$/, '')}/${targetFilename}` : `/${targetFilename}`;
        const res = await fetch(`/api/remote-proxy/api/fs/write`, {
          method: 'POST',
          headers: {
            'X-ConfigStudio-Web': '1',
            'X-Remote-Target': targetServer.connection.agent.url,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ path: fullPath, content: fileContent })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        if (typeof localStorage !== 'undefined') localStorage.setItem(`cs_last_dir_${targetServer.id}`, targetDir);
      } else if (targetServer?.connection?.ssh?.enabled || targetServer?.host) {
        const sshHost = targetServer.connection?.ssh?.host || targetServer.host || '';
        const sshPort = targetServer.connection?.ssh?.port || targetServer.port || 22;
        const sshUser = targetServer.connection?.ssh?.user || targetServer.user || 'root';
        const sshIdentity = targetServer.connection?.ssh?.identity || targetServer.identity || '';

        const fullPath = targetDir ? `${targetDir.replace(/\/+$/, '')}/${targetFilename}` : `/root/${targetFilename}`;
        await apiFetch('/api/ssh/sftp/write', {
          method: 'POST',
          body: JSON.stringify({
            host: sshHost,
            port: sshPort,
            user: sshUser,
            identityId: sshIdentity,
            path: fullPath,
            content: fileContent
          })
        });
        if (typeof localStorage !== 'undefined') localStorage.setItem(`cs_last_dir_${targetServer.id}`, targetDir);
      }

      showToast(`Файл "${targetFilename}" успешно отправлен на ${targetServer?.name || 'Localhost'}!`, 'success');
      if (typeof window.ConfigStudio?.refreshFiles === 'function') {
        try {
          await window.ConfigStudio.refreshFiles();
        } catch (_) {}
      }
      closeModal();
    } catch (err: any) {
      showToast(`Ошибка отправки: ${err.message}`, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `${ICONS.send} <span>Отправить</span>`;
    }
  });
}
