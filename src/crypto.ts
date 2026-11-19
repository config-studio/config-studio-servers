import { ServerNode } from './types';
import { TOTP_STEP_SECONDS } from './constants';

/**
 * TOTP Web Crypto Engine (Zero-Dependency Base32 + HMAC-SHA1)
 * Conforms to RFC 6238 and RFC 4226 specifications.
 */

export function cleanBase32(secret: string): string {
  if (!secret) return '';
  return secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
}

export function isValidBase32(secret: string): boolean {
  const clean = cleanBase32(secret);
  return clean.length >= 16;
}

export function generateRandomBase32(length: number = 24): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  const cryptoObj =
    typeof window !== 'undefined' && window.crypto ? window.crypto : (globalThis as any).crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += alphabet[bytes[i] % alphabet.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  return result;
}

export function generateRandomKeyId(prefix: string = 'cs_key'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${rand}`;
}

export interface AgentConnectionLinkInfo {
  keyId: string;
  secret: string;
  host: string;
  port: number;
  tls: boolean;
  roots: string[];
  nodeName: string;
  nodeId: string;
}

export function parseAgentConnectionLink(raw: string): AgentConnectionLinkInfo {
  let link = (raw || '').trim();
  if (!link) {
    throw new Error('Пустая ссылка подключения');
  }

  // Normalise scheme
  if (link.startsWith('csagent://')) {
    link = 'cs-agent://' + link.slice('csagent://'.length);
  } else if (link.startsWith('cs://agent/')) {
    link = 'cs-agent://' + link.slice('cs://agent/'.length);
  } else if (!link.startsWith('cs-agent://')) {
    throw new Error('Некорректная схема: ссылка должна начинаться с cs-agent://');
  }

  // Use URL parser by replacing custom scheme with dummy http so standard URL API parses userinfo
  const httpEquivalent = 'http://' + link.slice('cs-agent://'.length);
  const u = new URL(httpEquivalent);

  const keyId = decodeURIComponent(u.username || '');
  const secret = decodeURIComponent(u.password || '');
  if (!keyId || !secret) {
    throw new Error('В ссылке отсутствуют учетные данные (формат: cs-agent://keyId:secret@host:port)');
  }

  const host = u.hostname;
  if (!host) {
    throw new Error('В ссылке отсутствует хост или IP-адрес');
  }

  const port = u.port ? parseInt(u.port, 10) : 8085;
  const tls = u.searchParams.get('tls') === '1' || u.searchParams.get('tls') === 'true';

  const rootsRaw = u.searchParams.get('roots') || u.searchParams.get('paths') || '';
  const roots = rootsRaw ? rootsRaw.split(',').map(r => r.trim()).filter(Boolean) : [];

  let nodeName = u.hash ? decodeURIComponent(u.hash.replace(/^#/, '')) : '';
  if (!nodeName) {
    nodeName = u.searchParams.get('name') || host;
  }

  let nodeId = u.searchParams.get('id') || '';
  if (!nodeId) {
    nodeId = nodeName
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  return {
    keyId,
    secret: secret.toUpperCase(),
    host,
    port,
    tls,
    roots,
    nodeName,
    nodeId: nodeId || 'agent-node'
  };
}

export function formatAgentConnectionLink(info: {
  keyId: string;
  secret: string;
  host: string;
  port: number;
  tls?: boolean;
  roots?: string[];
  nodeName?: string;
  nodeId?: string;
}): string {
  const host = info.host || '127.0.0.1';
  const port = info.port || 8085;
  const keyId = encodeURIComponent(info.keyId || 'cs_key');
  const secret = encodeURIComponent(cleanBase32(info.secret));

  const u = new URL(`http://${host}:${port}/`);
  if (info.roots && info.roots.length > 0) {
    u.searchParams.set('roots', info.roots.join(','));
  }
  if (info.tls) {
    u.searchParams.set('tls', '1');
  }
  if (info.nodeId) {
    u.searchParams.set('id', info.nodeId);
  }
  const name = info.nodeName || host;

  const queryPart = u.search ? u.search : '';
  return `cs-agent://${keyId}:${secret}@${host}:${port}/${queryPart}#${encodeURIComponent(name)}`;
}

export function base32Decode(str: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanStr = (str || '').toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (let i = 0; i < cleanStr.length; i++) {
    const val = alphabet.indexOf(cleanStr[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

export async function generateTOTPWebCrypto(
  secret: string,
  timestampSeconds: number = Math.floor(Date.now() / 1000)
): Promise<string> {
  if (!secret) return '';
  try {
    const keyBytes = base32Decode(secret);
    if (keyBytes.length === 0) return '';
    const counter = Math.floor(timestampSeconds / TOTP_STEP_SECONDS);

    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, BigInt(counter), false);

    // Cross-environment subtle crypto resolution (browser window.crypto or node crypto.subtle)
    const cryptoSubtle =
      typeof window !== 'undefined' && window.crypto?.subtle
        ? window.crypto.subtle
        : (globalThis as any).crypto?.subtle;

    if (!cryptoSubtle) {
      console.warn('[TOTP] crypto.subtle is not available in current environment');
      return '';
    }

    const cryptoKey = await cryptoSubtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );

    const signature = await cryptoSubtle.sign('HMAC', cryptoKey, buffer);
    const hmac = new Uint8Array(signature);

    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    return (code % 1000000).toString().padStart(6, '0');
  } catch (err) {
    console.warn('[generateTOTPWebCrypto error]', err);
    return '';
  }
}

export async function getAgentAuthToken(server: ServerNode): Promise<string> {
  if (!server.connection || !server.connection.agent) return '';
  const agentCfg = server.connection.agent;
  const secretId = agentCfg.vaultSecret || agentCfg.secretRef || ('agent:' + server.id);
  let secretVal: any = null;

  try {
    if (typeof window !== 'undefined' && window.ConfigStudio?.secrets?.get) {
      secretVal = await window.ConfigStudio.secrets.get(secretId);
    }
  } catch (err) {
    console.warn(`[getAgentAuthToken] Failed to read secret ${secretId} from bridge:`, err);
  }

  // Fallback: query core REST API if bridge method is missing or returned empty
  if (!secretVal && typeof fetch !== 'undefined') {
    try {
      const res = await fetch(`/api/secrets/${encodeURIComponent(secretId)}`, {
        headers: { 'X-ConfigStudio-Web': '1' }
      });
      if (res.ok) {
        const data = await res.json();
        secretVal = data && typeof data === 'object' && !data.secret && !data.value ? data : (data.secret || data.value || data);
      }
    } catch (err) {
      console.warn(`[getAgentAuthToken] Failed to fetch secret ${secretId} via REST API:`, err);
    }
  }

  if (!secretVal) {
    return secretId || '';
  }

  let keyId = 'cs_key';
  let secret = '';

  if (typeof secretVal === 'object') {
    keyId = secretVal.keyId || 'cs_key';
    secret = secretVal.secret || secretVal.value || '';
  } else if (typeof secretVal === 'string') {
    try {
      const parsed = JSON.parse(secretVal);
      keyId = parsed.keyId || 'cs_key';
      secret = parsed.secret || parsed.value || '';
    } catch (_) {
      if (secretVal.includes(':')) {
        const parts = secretVal.split(':');
        keyId = parts[0];
        secret = parts[1];
      } else if (/^[A-Z2-7=]{16,}$/i.test(secretVal.trim())) {
        secret = secretVal.trim();
        keyId = 'cs_key';
      } else {
        keyId = secretVal;
      }
    }
  }

  if (secret) {
    try {
      const otp = await generateTOTPWebCrypto(secret);
      return `${keyId}:${otp}`;
    } catch (err) {
      console.warn('[TOTP generation failed]', err);
      return keyId;
    }
  }
  return keyId;
}
