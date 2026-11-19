import { ServerNode, CoreHost, VaultSecret } from './types';

/**
 * Synchronization layer with Core SSH Host Storage and Secrets Vault
 */

export function syncSSHHost(server: ServerNode): CoreHost | null {
  const sshCfg = server.connection?.ssh || (server.host ? {
    host: server.host,
    port: server.port || 22,
    user: server.user || 'root',
    identity: server.identity || ''
  } : null);

  if (!sshCfg || !sshCfg.host) {
    if (server.sshHostRef) {
      return { id: server.sshHostRef, name: server.name || server.id, host: server.sshHostRef };
    }
    return null;
  }

  const hostObj: CoreHost = {
    id: server.id,
    name: server.name || server.id,
    host: sshCfg.host,
    port: sshCfg.port || 22,
    user: sshCfg.user || 'root',
    identityId: sshCfg.identity || '',
    authType: sshCfg.identity ? 'vault' : 'none',
    createdAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined' && window.ConfigStudio?.ssh && typeof window.ConfigStudio.ssh.save === 'function') {
    try {
      window.ConfigStudio.ssh.save(hostObj);
      if (typeof window.ConfigStudio.ssh.setLastActiveHostId === 'function') {
        window.ConfigStudio.ssh.setLastActiveHostId(hostObj.id);
      }
    } catch (err) {
      console.warn('[syncSSHHost error]', err);
    }
  } else if (typeof fetch !== 'undefined') {
    // Direct REST API sync to Core Host Storage
    fetch('/api/hosts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-ConfigStudio-Web': '1' },
      body: JSON.stringify(hostObj)
    }).catch(err => console.warn('[syncSSHHost API error]', err));
  }

  return hostObj;
}

export async function fetchCoreHosts(): Promise<CoreHost[]> {
  let coreHosts: CoreHost[] = [];

  if (typeof window !== 'undefined' && window.ConfigStudio?.ssh) {
    if (typeof window.ConfigStudio.ssh.fetchFromServer === 'function') {
      try {
        const list = await window.ConfigStudio.ssh.fetchFromServer();
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      } catch (err) {
        console.warn('[fetchCoreHosts] Failed to load hosts via ssh service:', err);
      }
    }

    if (typeof window.ConfigStudio.ssh.list === 'function') {
      const list = window.ConfigStudio.ssh.list();
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  }

  if (typeof fetch !== 'undefined') {
    try {
      const res = await fetch('/api/hosts', { headers: { 'X-ConfigStudio-Web': '1' } });
      if (res.ok) {
        const data = await res.json();
        coreHosts = Array.isArray(data) ? data : (data.hosts || []);
      }
    } catch (err) {
      console.warn('[fetchCoreHosts] Failed to load core hosts via fetch:', err);
    }
  }

  return coreHosts;
}

export async function fetchVaultSecrets(): Promise<VaultSecret[]> {
  let vaultSecrets: VaultSecret[] = [];

  if (typeof window !== 'undefined' && window.ConfigStudio?.secrets && typeof window.ConfigStudio.secrets.list === 'function') {
    try {
      const list = await window.ConfigStudio.secrets.list();
      if (Array.isArray(list)) return list;
    } catch (err) {
      console.warn('[fetchVaultSecrets] Failed via bridge:', err);
    }
  }

  if (typeof fetch !== 'undefined') {
    try {
      const res = await fetch('/api/secrets', { headers: { 'X-ConfigStudio-Web': '1' } });
      if (res.ok) {
        const data = await res.json();
        vaultSecrets = Array.isArray(data) ? data : (data.secrets || []);
      }
    } catch (err) {
      console.warn('[fetchVaultSecrets] Failed to load secrets from Vault:', err);
    }
  }

  return vaultSecrets;
}
