import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FleetStore } from '../src/state';
import { ServerNode } from '../src/types';
import { syncSSHHost } from '../src/hostSync';

describe('FleetStore State Management', () => {
  let store: FleetStore;

  const mockServers: ServerNode[] = [
    { id: 'localhost', name: 'Localhost', group: 'local', tags: ['local'] },
    {
      id: 'web-prod-01',
      name: 'Web Prod 1',
      group: 'prod',
      tags: ['web', 'prod'],
      connection: { ssh: { host: '10.0.0.1' } }
    },
    { id: 'db-stage', name: 'DB Stage', group: 'stage', tags: ['db', 'staging'] }
  ];

  beforeEach(() => {
    store = new FleetStore();
    store.setServers(mockServers);
  });

  it('should filter servers by tag correctly', () => {
    store.setActiveTagFilter('prod');
    const filtered = store.filterServers();
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'web-prod-01');
  });

  it('should filter servers by search query (name, IP or id)', () => {
    store.setSearchQuery('10.0.0.1');
    const filtered = store.filterServers();
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'web-prod-01');
  });

  it('should return all unique sorted tags', () => {
    const tags = store.getDistinctTags();
    assert.deepEqual(tags, ['db', 'local', 'prod', 'staging', 'web']);
  });

  it('should resolve host for node bound via sshHostRef', () => {
    const node: ServerNode = {
      id: 'srv-ref',
      name: 'Referenced Node',
      sshHostRef: 'my-core-host'
    };
    const synced = syncSSHHost(node);
    assert.ok(synced);
    assert.equal(synced.id, 'my-core-host');
  });
});
