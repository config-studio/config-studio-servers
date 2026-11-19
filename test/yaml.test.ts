import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateServerConfig, sanitizeServerId } from '../src/yaml';

describe('Server & YAML Validator', () => {
  it('should sanitize node id to valid slug', () => {
    assert.equal(sanitizeServerId('Prod Server #1!'), 'prod-server-1');
    assert.equal(sanitizeServerId('NODE__02'), 'node__02');
  });

  it('should reject invalid node configurations without ID or Host', () => {
    const res1 = validateServerConfig({ id: '', name: 'Test' } as any);
    assert.equal(res1.valid, false);
    assert.match(res1.error || '', /ID узла обязателен/i);

    const res2 = validateServerConfig({ id: 'srv-1', name: 'Test' } as any);
    assert.equal(res2.valid, false);
    assert.match(res2.error || '', /хост/i);
  });

  it('should accept valid node with sshHostRef', () => {
    const res = validateServerConfig({
      id: 'srv-core',
      name: 'Core Linked',
      sshHostRef: 'host-123'
    } as any);
    assert.equal(res.valid, true);
  });

  it('should accept valid agent-only node with agent url', () => {
    const res = validateServerConfig({
      id: 'srv-agent',
      name: 'Agent VPS',
      connection: {
        agent: { enabled: true, url: 'http://10.0.0.5:8085' }
      }
    } as any);
    assert.equal(res.valid, true);
  });

  it('should accept valid manual agent node with vaultSecret and port', () => {
    const res = validateServerConfig({
      id: 'srv-manual-agent',
      name: 'Manual Agent',
      connection: {
        agent: {
          enabled: true,
          port: 8085,
          vaultSecret: 'agent:srv-manual-agent'
        }
      }
    } as any);
    assert.equal(res.valid, true);
  });
});
