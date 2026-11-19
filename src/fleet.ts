import { ServerNode } from './types';
import { store } from './state';
import { PING_CONCURRENCY, TOTP_REFRESH_INTERVAL_MS } from './constants';
import { getAgentAuthToken } from './crypto';
import { syncSSHHost } from './hostSync';
import { apiFetch, fetchServers, pingServer } from './api';
import { showToast } from './ui/domUtils';
import { openManualAgentModal } from './ui/manualAgentModal';

/**
 * Fleet Orchestration Controller
 * Handles host switching, SFTP/Shell launching, agent connection with live TOTP refresh,
 * and concurrent ping background monitoring.
 */

export class FleetController {
  private totpInterval: any = null;

  public async loadAndSyncServers(): Promise<void> {
    try {
      const serverList = await fetchServers();
      store.setServers(serverList);
      // Trigger background ping
      this.pingAllServers();
    } catch (err: any) {
      console.error('[Fleet] Failed to load servers:', err);
    }
  }

  public async pingAllServers(): Promise<void> {
    const servers = store.getServers();
    const nonLocal = servers.filter(s => {
      if (s.id === 'localhost') {
        store.setPing('localhost', { status: 'online', ms: 0 });
        return false;
      }
      return true;
    });

    for (let i = 0; i < nonLocal.length; i += PING_CONCURRENCY) {
      const chunk = nonLocal.slice(i, i + PING_CONCURRENCY);
      await Promise.allSettled(
        chunk.map(async s => {
          try {
            const res = await pingServer(s.id);
            store.setPing(s.id, { status: res.status, ms: res.latencyMs });
          } catch (e: any) {
            store.setPing(s.id, { status: 'offline', ms: null, error: e?.message });
          }
        })
      );
    }
  }

  public async selectServer(server: ServerNode, protocolMode: 'auto' | 'agent' | 'sftp' = 'auto'): Promise<void> {
    store.setActiveServerId(server.id);

    if (server.id === 'localhost') {
      this.clearTotpTimer();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cs:switch-sidebar-tab', { detail: 'workspaces' }));
        if (typeof window.ConfigStudio?.setRemoteEndpoint === 'function') {
          window.ConfigStudio.setRemoteEndpoint(null);
        }
        if (window.ConfigStudio?.sysinfo?.setActiveNode) {
          window.ConfigStudio.sysinfo.setActiveNode('localhost', 'Localhost');
        }
        if (typeof window.ConfigStudio?.refreshFiles === 'function') {
          try {
            await window.ConfigStudio.refreshFiles();
          } catch (_) {}
        }
      }
      showToast('Переключено на локальный инстанс', 'info');
      return;
    }

    const hasAgent = Boolean(server.connection?.agent?.enabled);
    const hasSSH = Boolean(server.connection?.ssh?.enabled || server.connection?.ssh?.host || server.host || server.sshHostRef);

    if (protocolMode === 'agent' || (protocolMode === 'auto' && hasAgent)) {
      await this.connectAgent(server);
    } else if (protocolMode === 'sftp' || (protocolMode === 'auto' && hasSSH)) {
      await this.openSFTP(server);
    } else {
      showToast(`Узел ${server.name} выбран`, 'info');
    }
  }

  public async connectAgent(server: ServerNode): Promise<void> {
    if (!server.connection || !server.connection.agent) return;
    const agentCfg = server.connection.agent;
    let url = agentCfg.url;
    if (!url) {
      const fallbackHost = server.connection?.ssh?.host || server.host || server.sshHostRef;
      if (fallbackHost) {
        url = `http://${fallbackHost}:${agentCfg.port || 8085}`;
      }
    }
    if (!url) {
      showToast(`URL агента не указан для ${server.name}`, 'warning');
      return;
    }

    this.clearTotpTimer();

    if (typeof window !== 'undefined') {
      // Switch sidebar tab back to workspaces tree so agent files are visible
      window.dispatchEvent(new CustomEvent('cs:switch-sidebar-tab', { detail: 'workspaces' }));

      const initialToken = await getAgentAuthToken(server);

      // Direct endpoint connection
      if (typeof window.ConfigStudio?.setRemoteEndpoint === 'function') {
        window.ConfigStudio.setRemoteEndpoint(url, initialToken);
      }
      if (window.ConfigStudio?.sysinfo?.setActiveNode) {
        window.ConfigStudio.sysinfo.setActiveNode(server.id, server.name);
      }

      // Start TOTP refresher so dynamic OTP stays valid continuously
      this.totpInterval = setInterval(async () => {
        if (store.getActiveServerId() !== server.id) {
          this.clearTotpTimer();
          return;
        }
        try {
          const freshToken = await getAgentAuthToken(server);
          if (freshToken && typeof window.ConfigStudio?.setRemoteEndpoint === 'function') {
            window.ConfigStudio.setRemoteEndpoint(url, freshToken);
          }
        } catch (err) {
          console.warn('[Fleet] TOTP interval refresh error:', err);
        }
      }, TOTP_REFRESH_INTERVAL_MS);

      if (typeof window.ConfigStudio?.refreshFiles === 'function') {
        try {
          await window.ConfigStudio.refreshFiles();
        } catch (_) {}
      }
    }

    showToast(`Подключено к Агенту: ${server.name}`, 'success');
  }

  public async openSFTP(server: ServerNode): Promise<void> {
    const hasSSH = Boolean(server.connection?.ssh || server.host || server.sshHostRef);
    if (!hasSSH) return;

    const hostObj = syncSSHHost(server);
    this.clearTotpTimer();

    if (typeof window !== 'undefined') {
      // Reset remote endpoint so workspace/local/sftp is active
      if (typeof window.ConfigStudio?.setRemoteEndpoint === 'function') {
        window.ConfigStudio.setRemoteEndpoint(null);
      }

      // Switch sidebar tab to SFTP
      window.dispatchEvent(new CustomEvent('cs:switch-sidebar-tab', { detail: 'sftp' }));
      window.dispatchEvent(new CustomEvent('cs:open-sftp-host', { detail: hostObj || server.connection?.ssh }));
      if (typeof window.ConfigStudio?.openSftp === 'function') {
        window.ConfigStudio.openSftp(hostObj || server.connection?.ssh);
      }
    }

    showToast(`Открыт SFTP проводник: ${server.name}`, 'info');
  }

  public async launchShell(server: ServerNode): Promise<void> {
    const hasSSH = Boolean(server.connection?.ssh || server.host || server.sshHostRef);
    if (!hasSSH) {
      showToast(`SSH не настроен для ${server.name}`, 'error');
      return;
    }

    const hostObj = syncSSHHost(server);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cs:open-ssh-terminal', { detail: hostObj || server.connection?.ssh }));
      if (typeof window.ConfigStudio?.openTerminal === 'function') {
        window.ConfigStudio.openTerminal(hostObj || server.connection?.ssh);
      }
    }

    showToast(`Запуск SSH шелла к ${server.name}...`, 'info');
  }

  public async openManualAgentModal(server?: ServerNode): Promise<void> {
    return openManualAgentModal(server);
  }

  public clearTotpTimer(): void {
    if (this.totpInterval) {
      clearInterval(this.totpInterval);
      this.totpInterval = null;
    }
  }
}

export const fleet = new FleetController();
