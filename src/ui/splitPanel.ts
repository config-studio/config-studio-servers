import { store } from '../state';
import { ICONS, PLUGIN_ID } from '../constants';
import { createServerCard } from './serverCard';
import { openEditModal } from './editServerModal';
import { openBatchInstallModal } from './batchInstallModal';
import { openBatchImportLinksModal } from './batchImportLinksModal';

/**
 * Sidebar Split Panel Component
 * Registers the Fleet Manager panel in Config Studio's left sidebar.
 */

export function registerSidebarPanel(): void {
  if (typeof window === 'undefined' || !window.ConfigStudio?.registerSplitPanel) {
    return;
  }

  window.ConfigStudio.registerSplitPanel({
    id: 'fleet-sidebar-panel',
    pluginId: PLUGIN_ID,
    title: 'Флот серверов',
    icon: 'server',
    order: 3,
    render: (container: HTMLElement) => {
      (container as any)._csUnsub?.();
      container.innerHTML = '';
      const panel = document.createElement('div');
      panel.className = 'cs-fleet-sidebar-container';

      panel.innerHTML = `
        <div class="cs-fleet-sidebar-header">
          <span style="font-weight:700;font-size:12px;">Узлы инвентаря</span>
          <div style="display:flex;gap:6px;">
            <button class="cs-fleet-btn-secondary" id="cs-fleet-sidebar-import-links-btn" title="Пакетный импорт ссылок cs-agent://" style="padding:4px 8px;font-size:11px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;">
              ${ICONS.link} <span>Импорт</span>
            </button>
            <button class="cs-fleet-btn-secondary" id="cs-fleet-sidebar-batch-btn" title="Массовая установка агента по SSH" style="padding:4px 8px;font-size:11px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;">
              ${ICONS.agent} <span>Массовая уст.</span>
            </button>
            <button class="cs-fleet-add-btn" id="cs-fleet-sidebar-add-btn">${ICONS.plus} <span>Добавить</span></button>
          </div>
        </div>
        <div class="cs-fleet-sidebar-body" id="cs-fleet-sidebar-list"></div>
      `;

      panel.querySelector('#cs-fleet-sidebar-import-links-btn')?.addEventListener('click', () => {
        openBatchImportLinksModal();
      });

      panel.querySelector('#cs-fleet-sidebar-batch-btn')?.addEventListener('click', () => {
        openBatchInstallModal();
      });

      panel.querySelector('#cs-fleet-sidebar-add-btn')?.addEventListener('click', () => {
        openEditModal(null);
      });

      const listEl = panel.querySelector('#cs-fleet-sidebar-list') as HTMLElement;

      function updateCards() {
        listEl.innerHTML = '';
        const servers = store.getServers();
        servers.forEach(s => {
          const card = createServerCard(s, null);
          listEl.appendChild(card);
        });
      }

      updateCards();
      container.appendChild(panel);

      (container as any)._csUnsub = store.subscribe(() => {
        updateCards();
      });
    }
  });
}
