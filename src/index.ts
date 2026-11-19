/**
 * Config Studio — Servers & Fleet Manager Official Plugin
 * Modular TypeScript Entry Point
 */

import { store } from './state';
import { fleet } from './fleet';
import { PLUGIN_ID } from './constants';
import { apiFetch } from './api';
import { showToast } from './ui/domUtils';
import { registerHeaderSwitcher } from './ui/headerSwitcher';
import { registerSidebarPanel } from './ui/splitPanel';
import { openSendToFleetModal } from './ui/sendFileModal';
import { openBatchInstallModal } from './ui/batchInstallModal';

export function initServersPlugin(): void {
  if (typeof window === 'undefined' || !window.ConfigStudio) {
    return;
  }

  // 1. Context Menu: Send File to Fleet Node («Отправить на узел флота...»)
  if (typeof window.ConfigStudio.registerContextMenu === 'function') {
    window.ConfigStudio.registerContextMenu({
      id: 'fleet-send-file',
      title: 'Отправить на узел флота...',
      group: 'fleet',
      order: 15,
      onClick: async (file: any) => {
        let filename = file?.name || 'config.yaml';
        let content = file?.content;
        if (content === undefined) {
          const activeFile = window.ConfigStudio?.getActiveFile?.();
          if (activeFile && (!file || activeFile.name === file.name)) {
            content = window.ConfigStudio?.getActiveContent?.() || activeFile.content || '';
            filename = activeFile.name;
          } else if (file?.path) {
            try {
              const res = await fetch(`/api/fs/read?path=${encodeURIComponent(file.path)}`, {
                headers: { 'X-ConfigStudio-Web': '1' }
              });
              if (res.ok) {
                const data = await res.json();
                content = data.content || '';
              } else {
                console.warn('[Fleet] Failed to read file for send:', res.statusText);
              }
            } catch (err: any) {
              console.warn('[Fleet] Error reading file for send:', err);
              showToast('Не удалось прочитать файл: ' + (err.message || err), 'warning');
            }
          }
        }
        openSendToFleetModal(filename, content || '');
      }
    });
  }

  // 2. Register Header Switcher and Sidebar Panel
  registerHeaderSwitcher();
  registerSidebarPanel();

  // 3. Inter-Plugin Service Registration
  if (window.ConfigStudio.services && typeof window.ConfigStudio.services.register === 'function') {
    window.ConfigStudio.services.register(
      'fleet-manager',
      {
        getServers: () => store.getServers(),
        getActiveServer: () => store.getActiveServer(),
        switchServer: (id: string) => {
          const target = store.getServers().find(s => s.id === id);
          if (target) fleet.selectServer(target);
        },
        pingServer: async (id: string) => {
          return await apiFetch(`/api/servers/ping/${encodeURIComponent(id)}`, { method: 'POST' });
        },
        openBatchInstall: (ids?: string[]) => {
          openBatchInstallModal(ids);
        },
        openManualAgent: (server?: any) => {
          fleet.openManualAgentModal(server);
        }
      },
      PLUGIN_ID
    );
  }

  // 4. Initial server loading & pinging
  fleet.loadAndSyncServers();
}

// Auto-initialize when loaded in browser environment
if (typeof window !== 'undefined') {
  initServersPlugin();
}

export * from './types';
export * from './constants';
export * from './crypto';
export * from './api';
export * from './state';
export * from './hostSync';
export * from './yaml';
export * from './fleet';
export * from './ui/domUtils';
export * from './ui/serverCard';
export * from './ui/headerSwitcher';
export * from './ui/editServerModal';
export * from './ui/agentInstallModal';
export * from './ui/batchInstallModal';
export * from './ui/sendFileModal';
export * from './ui/tokensModal';
export * from './ui/rawYamlModal';
export * from './ui/splitPanel';
export * from './ui/manualAgentModal';
