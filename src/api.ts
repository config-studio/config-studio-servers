import { ServerNode } from './types';

/**
 * REST and SSE API client layer for Config Studio Core & Servers Plugin
 */

export async function apiFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = Object.assign(
    {
      'X-ConfigStudio-Web': '1',
      'Content-Type': 'application/json'
    },
    options.headers || {}
  );

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errMsg = res.statusText || `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j && j.error) errMsg = j.error;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return res.json();
}

export async function fetchServers(): Promise<ServerNode[]> {
  const data = await apiFetch<{ servers: ServerNode[] }>('/api/servers');
  return data.servers || [];
}

export async function saveServer(server: ServerNode): Promise<any> {
  return await apiFetch('/api/servers', {
    method: 'POST',
    body: JSON.stringify(server)
  });
}

export async function deleteServer(serverId: string): Promise<any> {
  return await apiFetch(`/api/servers/${encodeURIComponent(serverId)}`, {
    method: 'DELETE'
  });
}

export async function pingServer(serverId: string): Promise<{ status: 'online' | 'offline' | 'warn'; latencyMs: number }> {
  return await apiFetch(`/api/servers/ping/${encodeURIComponent(serverId)}`, {
    method: 'POST'
  });
}

export async function fetchRawYaml(): Promise<string> {
  const res = await fetch('/api/servers/raw', {
    headers: { 'X-ConfigStudio-Web': '1' }
  });
  if (!res.ok) {
    let errMsg = res.statusText || `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j && j.error) errMsg = j.error;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return await res.text();
}

export async function saveRawYaml(content: string): Promise<void> {
  const res = await fetch('/api/servers/raw', {
    method: 'PUT',
    headers: {
      'X-ConfigStudio-Web': '1',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  });
  if (!res.ok) {
    let errMsg = res.statusText || `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j && j.error) errMsg = j.error;
    } catch (_) {}
    throw new Error(errMsg);
  }
}

export async function installAgent(
  serverId: string,
  payload: { port: number; useSudo: boolean; serviceType: string; upgradeOnly?: boolean }
): Promise<any> {
  return await apiFetch(`/api/servers/install-agent/${encodeURIComponent(serverId)}`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function saveVaultSecret(item: {
  id: string;
  title: string;
  type: string;
  scope?: string;
  pluginId?: string;
  value: string;
}): Promise<any> {
  if (typeof window !== 'undefined' && window.ConfigStudio?.secrets?.set) {
    try {
      await window.ConfigStudio.secrets.set(item as any);
      return { success: true };
    } catch (err) {
      console.warn('[saveVaultSecret] Bridge set failed, falling back to REST API:', err);
    }
  }

  return await apiFetch('/api/secrets/save', {
    method: 'POST',
    body: JSON.stringify({
      id: item.id,
      title: item.title,
      type: item.type,
      scope: item.scope || 'shared',
      pluginId: item.pluginId || 'servers',
      value: item.value
    })
  });
}

export async function getVaultSecret(id: string): Promise<any> {
  if (!id) return null;
  if (typeof window !== 'undefined' && window.ConfigStudio?.secrets?.get) {
    try {
      const val = await window.ConfigStudio.secrets.get(id);
      if (val) return val;
    } catch (_) {}
  }

  try {
    const res = await apiFetch<{ id: string; value: string }>('/api/secrets/get', {
      method: 'POST',
      body: JSON.stringify({ id })
    });
    return res && res.value ? res.value : null;
  } catch (_) {
    return null;
  }
}
