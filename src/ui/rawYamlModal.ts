import { fleet } from '../fleet';
import { ICONS } from '../constants';
import { escapeHtml, showToast } from './domUtils';
import { fetchRawYaml, saveRawYaml } from '../api';

/**
 * Direct servers.yaml Raw Editor
 * Opens a native Monaco Editor tab via ConfigStudio.openCustomTab if supported,
 * or falls back to a clean modal textarea.
 */

export async function openRawYAMLModal(): Promise<void> {
  let rawContent = '';
  try {
    rawContent = await fetchRawYaml();
  } catch (e: any) {
    showToast('Ошибка загрузки servers.yaml: ' + e.message, 'error');
    return;
  }

  if (typeof window !== 'undefined' && window.ConfigStudio && typeof window.ConfigStudio.openCustomTab === 'function') {
    try {
      await window.ConfigStudio.openCustomTab({
        path: 'fleet://servers.yaml',
        name: 'servers.yaml',
        content: rawContent,
        language: 'yaml',
        badge: 'FLEET',
        onSave: async (newContent: string) => {
          await saveRawYaml(newContent);
          showToast('servers.yaml успешно сохранен', 'success');
          await fleet.loadAndSyncServers();
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
      <textarea id="cs-fleet-yaml-textarea" class="cs-fleet-form-textarea" rows="18" style="font-family:monospace;font-size:12px;background:var(--cs-srv-bg-base);color:var(--cs-srv-text-primary);">${escapeHtml(
        rawContent
      )}</textarea>
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
  modal.querySelector('.cs-fleet-modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('#cs-fleet-yaml-cancel')?.addEventListener('click', closeModal);

  modal.querySelector('#cs-fleet-yaml-save')?.addEventListener('click', async () => {
    const newYaml = (modal.querySelector('#cs-fleet-yaml-textarea') as HTMLTextAreaElement).value;
    try {
      await saveRawYaml(newYaml);
      showToast('servers.yaml обновлен', 'success');
      closeModal();
      await fleet.loadAndSyncServers();
    } catch (err: any) {
      showToast(`Ошибка сохранения YAML: ${err.message}`, 'error');
    }
  });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
