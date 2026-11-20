import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  base32Decode,
  generateTOTPWebCrypto,
  cleanBase32,
  isValidBase32,
  generateRandomBase32,
  generateRandomKeyId,
  parseAgentConnectionLink,
  parseMultipleAgentConnectionLinks,
  formatAgentConnectionLink
} from '../src/crypto';

describe('TOTP & Crypto Engine (RFC 6238 / RFC 4226)', () => {
  it('should correctly decode Base32 strings', () => {
    const secret = 'JBSWY3DPEE======'; // "Hello!" in Base32
    const decoded = base32Decode(secret);
    const text = new TextDecoder().decode(decoded);
    assert.equal(text, 'Hello!');
  });

  it('should ignore lowercase and padding in Base32', () => {
    const raw = base32Decode('jbswy3dpee===');
    const text = new TextDecoder().decode(raw);
    assert.equal(text, 'Hello!');
  });

  it('should clean and validate Base32 secrets', () => {
    assert.equal(cleanBase32('jbsw y3dp ee==='), 'JBSWY3DPEE');
    assert.equal(isValidBase32('JBSWY3DPEHPK3PXP'), true);
    assert.equal(isValidBase32('JBSWY3'), false); // Too short (< 16 chars)
    assert.equal(isValidBase32(''), false);
  });

  it('should generate valid random Base32 secret', () => {
    const sec24 = generateRandomBase32(24);
    assert.equal(sec24.length, 24);
    assert.equal(isValidBase32(sec24), true);
    assert.match(sec24, /^[A-Z2-7]{24}$/);
  });

  it('should generate valid random Key ID with 32 hex characters', () => {
    const key = generateRandomKeyId('cs_key');
    assert.match(key, /^cs_key_[0-9a-f]{32}$/);
  });

  it('should format and parse cs-agent:// connection URLs (VLESS/Hysteria style)', () => {
    const standardKey = 'cs_key_56643d5586e39415ec34721cfc1b31b6';
    const formatted = formatAgentConnectionLink({
      keyId: standardKey,
      secret: 'JBSWY3DPEHPK3PXP',
      host: '192.168.0.110',
      port: 8085,
      tls: false,
      roots: ['/opt/projects', '/var/www'],
      nodeName: 'Production VPS',
      nodeId: 'prod-vps'
    });

    assert.match(formatted, new RegExp(`^cs-agent:\/\/${standardKey}:JBSWY3DPEHPK3PXP@192\\.168\\.0\\.110:8085\/`));
    assert.match(formatted, /roots=%2Fopt%2Fprojects%2C%2Fvar%2Fwww/);
    assert.match(formatted, /#Production%20VPS/);

    const parsed = parseAgentConnectionLink(formatted);
    assert.equal(parsed.keyId, standardKey);
    assert.equal(parsed.secret, 'JBSWY3DPEHPK3PXP');
    assert.equal(parsed.host, '192.168.0.110');
    assert.equal(parsed.port, 8085);
    assert.equal(parsed.tls, false);
    assert.deepEqual(parsed.roots, ['/opt/projects', '/var/www']);
    assert.equal(parsed.nodeName, 'Production VPS');
  });

  it('should parse csagent:// link with query parameters and explicit token key', () => {
    const link = 'csagent://this_token_key_not_id:SECRETBASE32@vpn.example.com:9998/?roots=/home/deploy,/etc/nginx&tls=1#staging';
    const parsed = parseAgentConnectionLink(link);
    assert.equal(parsed.keyId, 'this_token_key_not_id');
    assert.equal(parsed.secret, 'SECRETBASE32');
    assert.equal(parsed.host, 'vpn.example.com');
    assert.equal(parsed.port, 9998);
    assert.equal(parsed.tls, true);
    assert.deepEqual(parsed.roots, ['/home/deploy', '/etc/nginx']);
    assert.equal(parsed.nodeName, 'staging');
    assert.equal(parsed.nodeId, 'staging');
  });

  it('should throw error for invalid link format', () => {
    assert.throws(() => parseAgentConnectionLink('https://google.com'), /схема/);
    assert.throws(() => parseAgentConnectionLink('cs-agent://user@host:8085/'), /учетные данные/);
  });

  it('should parse multiple links from batch text with comments and logs', () => {
    const rawBatchText = `
# Production Fleet Deployed via Ansible
cs-agent://cs_key_11111111111111111111111111111111:JBSWY3DPEHPK3PXP@192.168.1.10:8085/?roots=/opt/app#prod-web-01

# Node with custom port
[host-2] Result: cs-agent://cs_key_22222222222222222222222222222222:KRSXG5CTMVRXEZLU@192.168.1.11:9085/?roots=/var/www#prod-web-02

# Duplicate node name in batch
cs-agent://cs_key_33333333333333333333333333333333:ORSXG5CTMVRXEZLV@192.168.1.12:8085/?roots=/data#prod-web-01
`;

    const res = parseMultipleAgentConnectionLinks(rawBatchText);
    assert.equal(res.items.length, 3);

    // Item 1
    assert.equal(res.items[0].nodeId, 'prod-web-01');
    assert.equal(res.items[0].host, '192.168.1.10');
    assert.equal(res.items[0].port, 8085);
    assert.deepEqual(res.items[0].roots, ['/opt/app']);

    // Item 2
    assert.equal(res.items[1].nodeId, 'prod-web-02');
    assert.equal(res.items[1].host, '192.168.1.11');
    assert.equal(res.items[1].port, 9085);

    // Item 3 (auto-disambiguated unique ID for batch duplicate)
    assert.equal(res.items[2].nodeId, 'prod-web-01-2');
    assert.equal(res.items[2].host, '192.168.1.12');
  });

  it('should handle empty input and track warnings for non-link lines', () => {
    assert.deepEqual(parseMultipleAgentConnectionLinks(''), { items: [], warnings: [] });
    assert.deepEqual(parseMultipleAgentConnectionLinks('   \n# comment\n// comment\n'), { items: [], warnings: [] });

    const mixed = `
# Deployment report
Success on server 1: cs-agent://cs_key_11111111111111111111111111111111:JBSWY3DPEHPK3PXP@10.0.0.1:8085/?tls=1#secure-01
Warning: Host unreachable at 10.0.0.99
Another note: failed to connect
`;
    const res = parseMultipleAgentConnectionLinks(mixed);
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].nodeId, 'secure-01');
    assert.equal(res.items[0].tls, true);
    assert.equal(res.warnings.length, 2);
    assert.match(res.warnings[0].text, /Host unreachable/);
    assert.match(res.warnings[1].text, /failed to connect/);
  });
});
