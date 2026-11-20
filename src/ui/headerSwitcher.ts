import { store } from '../state';
import { ICONS, PLUGIN_ID } from '../constants';
import { escapeHtml } from './domUtils';
import { createServerCard } from './serverCard';
import { openEditModal } from './editServerModal';
import { openBatchInstallModal } from './batchInstallModal';
import { openBatchImportLinksModal } from './batchImportLinksModal';
import { openRawYAMLModal } from './rawYamlModal';

/**
 * Universal Header Switcher Component
 * Registers the node switcher in Config Studio's top navigation bar.
 */

export function registerHeaderSwitcher(): void {
  if (typeof window === 'undefined' || !window.ConfigStudio?.registerHeaderItem) {
    return;
  }

  window.ConfigStudio.registerHeaderItem({
    id: 'fleet-universal-switcher',
    pluginId: PLUGIN_ID,
    order: 5,
    render: (container: HTMLElement) => {
      (container as any)._csUnsub?.();
      container.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'cs-fleet-header-container';

      let isDropdownOpen = false;
      let activeRenderCardsFn: (() => void) | null = null;

      const triggerBtn = document.createElement('button');
      triggerBtn.className = 'cs-fleet-header-btn';
      triggerBtn.title = 'Выбор рабочего узла и флота серверов';

      function renderTrigger() {
        const active = store.getActiveServer();
        const ping = store.getPingData(active.id) as any;
        const hasAgent = Boolean(active.connection?.agent?.enabled);
        const hasSSH = Boolean(active.connection?.ssh?.enabled || active.host);

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

        const dotClass = ping.status === 'offline' ? 'offline' : ping.status === 'warn' ? 'warn' : 'online';
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
        const servers = store.getServers();

        // 1. Header
        const header = document.createElement('div');
        header.className = 'cs-fleet-dropdown-header';
        header.innerHTML = `
          <div class="cs-fleet-dropdown-title">
            <span>Флот серверов (servers.yaml)</span>
            <span class="cs-fleet-count-pill">${servers.length} узлов</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="cs-fleet-add-btn" id="cs-fleet-add-node-btn">
              ${ICONS.plus} <span>Узел</span>
            </button>
          </div>
        `;
        dropdown.appendChild(header);

        header.querySelector('#cs-fleet-add-node-btn')?.addEventListener('click', e => {
          e.stopPropagation();
          closeDropdown();
          openEditModal(null);
        });

        // 2. Filter & Tags Bar (Core PillTabs Architecture)
        const filterBar = document.createElement('div');
        filterBar.className = 'cs-fleet-filter-bar';
        filterBar.addEventListener('click', e => e.stopPropagation());

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'cs-fleet-search-input';
        searchInput.placeholder = 'Поиск по имени, IP или #тегу...';
        searchInput.value = store.getSearchQuery();
        searchInput.addEventListener('input', e => {
          store.setSearchQuery((e.target as HTMLInputElement).value);
        });
        filterBar.appendChild(searchInput);

        const distinctTags = store.getDistinctTags();
        if (store.getActiveTagFilter() !== 'all' && !distinctTags.includes(store.getActiveTagFilter())) {
          store.setActiveTagFilter('all');
        }

        const pillTrack = document.createElement('div');
        pillTrack.className = 'cs-fleet-pill-track';
        pillTrack.setAttribute('role', 'tablist');

        // Horizontal mouse wheel scrolling for the track
        pillTrack.addEventListener(
          'wheel',
          e => {
            if (e.deltaY !== 0 && e.deltaX === 0) {
              e.preventDefault();
              pillTrack.scrollLeft += e.deltaY;
            }
          },
          { passive: false }
        );

        const tabsMap = new Map<string, HTMLButtonElement>();

        function createPillTab(id: string, label: string, count: number) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.role = 'tab';
          const isSel = store.getActiveTagFilter() === id;
          btn.className = `cs-fleet-pill-tab ${isSel ? 'active' : ''}`;
          btn.setAttribute('aria-selected', isSel ? 'true' : 'false');
          btn.innerHTML = `
            <span>${escapeHtml(label)}</span>
            <span class="cs-fleet-pill-badge">${count}</span>
          `;
          btn.addEventListener('click', e => {
            e.stopPropagation();
            if (store.getActiveTagFilter() === id) return;
            store.setActiveTagFilter(id);
            tabsMap.forEach((tabBtn, tabId) => {
              const active = tabId === store.getActiveTagFilter();
              tabBtn.classList.toggle('active', active);
              tabBtn.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            renderCards();
        activeRenderCardsFn = renderCards;
          });
          tabsMap.set(id, btn);
          return btn;
        }

        // 'All' tab
        pillTrack.appendChild(createPillTab('all', 'Все', servers.length));

        // Distinct tag tabs
        distinctTags.forEach(tag => {
          const count = servers.filter(s => (s.tags || []).includes(tag)).length;
          pillTrack.appendChild(createPillTab(tag, `#${tag}`, count));
        });

        filterBar.appendChild(pillTrack);
        dropdown.appendChild(filterBar);

        // 3. Servers List Container
        const listContainer = document.createElement('div');
        listContainer.className = 'cs-fleet-list';
        dropdown.appendChild(listContainer);

        function renderCards() {
          listContainer.innerHTML = '';
          const filtered = store.filterServers();

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
        activeRenderCardsFn = renderCards;

        // 4. Footer
        const footer = document.createElement('div');
        footer.className = 'cs-fleet-dropdown-footer';
        footer.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;">
            <button type="button" class="cs-fleet-yaml-link" id="cs-fleet-dropdown-import-btn" style="background:none;border:none;cursor:pointer;color:var(--cs-srv-accent);display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:0;">
              ${ICONS.link} <span>Импорт ссылок</span>
            </button>
            <button type="button" class="cs-fleet-yaml-link" id="cs-fleet-dropdown-batch-btn" style="background:none;border:none;cursor:pointer;color:inherit;opacity:0.85;display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:0;">
              ${ICONS.agent} <span>Массовая уст.</span>
            </button>
          </div>
          <button type="button" class="cs-fleet-yaml-link" id="cs-fleet-dropdown-raw-yaml-btn" style="background:none;border:none;cursor:pointer;color:inherit;font-size:inherit;padding:0;display:inline-flex;align-items:center;gap:4px;">
            <span>servers.yaml</span> ${ICONS.arrowRight}
          </button>
        `;

        footer.querySelector('#cs-fleet-dropdown-import-btn')?.addEventListener('click', e => {
          e.stopPropagation();
          closeDropdown();
          openBatchImportLinksModal();
        });

        footer.querySelector('#cs-fleet-dropdown-batch-btn')?.addEventListener('click', e => {
          e.stopPropagation();
          closeDropdown();
          openBatchInstallModal();
        });

        footer.querySelector('#cs-fleet-dropdown-raw-yaml-btn')?.addEventListener('click', e => {
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
        activeRenderCardsFn = null;
        wrap.classList.remove('open');
        dropdown.style.display = 'none';
        document.removeEventListener('click', handleClickOutside);
      }

      function handleClickOutside(e: MouseEvent) {
        if (!wrap.contains(e.target as Node)) {
          closeDropdown();
        }
      }

      triggerBtn.addEventListener('click', toggleDropdown);
      wrap.appendChild(triggerBtn);
      wrap.appendChild(dropdown);
      container.appendChild(wrap);

      // Subscribe to reactive store changes (with cleanup)
      (container as any)._csUnsub = store.subscribe(() => {
        renderTrigger();
        if (isDropdownOpen && activeRenderCardsFn) {
          activeRenderCardsFn();
        }
      });
    }
  });
}
