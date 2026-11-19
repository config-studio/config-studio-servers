import { ServerNode } from './types';

/**
 * Validation and sanitization helpers for servers.yaml configurations
 */

export function sanitizeServerId(raw: string): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function validateServerConfig(server: Partial<ServerNode>): { valid: boolean; error?: string } {
  if (!server.id || !server.id.trim()) {
    return { valid: false, error: 'ID узла обязателен' };
  }

  const sanitizedId = sanitizeServerId(server.id);
  if (!sanitizedId) {
    return { valid: false, error: 'ID узла должен содержать латинские буквы, цифры, дефис или подчеркивание' };
  }

  // Node must have either sshHostRef, or direct SSH host, or direct legacy host, or agent config
  const hasHostRef = Boolean(server.sshHostRef && server.sshHostRef.trim());
  const hasDirectSsh = Boolean(server.connection?.ssh?.host && server.connection.ssh.host.trim());
  const hasLegacyHost = Boolean(server.host && server.host.trim());
  const hasAgentUrl = Boolean(server.connection?.agent?.url && server.connection.agent.url.trim());
  const hasAgentConfig = Boolean(
    server.connection?.agent?.enabled &&
    (server.connection.agent.url || server.connection.agent.vaultSecret || server.connection.agent.secretRef)
  );

  if (server.id !== 'localhost' && !hasHostRef && !hasDirectSsh && !hasLegacyHost && !hasAgentUrl && !hasAgentConfig) {
    return { valid: false, error: 'Необходимо указать хост (привязка к ядру, параметры SSH или параметры агента)' };
  }

  return { valid: true };
}

export function formatYamlSummary(server: ServerNode): string {
  const parts: string[] = [`ID: ${server.id}`, `Имя: ${server.name}`];
  if (server.sshHostRef) parts.push(`Core Host: ${server.sshHostRef}`);
  if (server.connection?.ssh?.host) parts.push(`SSH: ${server.connection.ssh.host}`);
  if (server.connection?.agent?.enabled) parts.push(`Agent: port ${server.connection.agent.port || 8085}`);
  if (server.group) parts.push(`Группа: ${server.group}`);
  return parts.join(' | ');
}
