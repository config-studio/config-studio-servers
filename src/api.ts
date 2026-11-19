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
