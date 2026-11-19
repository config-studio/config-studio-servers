import { ServerNode, PingResult } from './types';

/**
 * Reactive Fleet State Store
 * Manages servers list, active host, tag filtering, search, and ping metrics.
 */

export class FleetStore {
  private servers: ServerNode[] = [];
  private activeServerId: string = 'localhost';
  private activeTagFilter: string = 'all';
  private searchQuery: string = '';
  private pingData: Record<string, PingResult> = {};
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof localStorage !== 'undefined') {
      this.activeServerId = localStorage.getItem('cs_active_server_id') || 'localhost';
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[FleetStore] Listener error:', err);
      }
    }
  }

  public getServers(): ServerNode[] {
    return [...this.servers];
  }

  public setServers(list: ServerNode[]): void {
    this.servers = [...list];
    if (!this.servers.find(s => s.id === 'localhost')) {
      this.servers.unshift({
        id: 'localhost',
        name: 'Localhost (Этот ПК)',
        group: 'local',
        tags: ['local']
      });
    }
    this.notify();
  }

  public getActiveServerId(): string {
    return this.activeServerId;
  }

  public setActiveServerId(id: string): void {
    this.activeServerId = id;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cs_active_server_id', id);
    }
    this.notify();
  }

  public getActiveServer(): ServerNode {
    return (
      this.servers.find(s => s.id === this.activeServerId) ||
      this.servers[0] || { id: 'localhost', name: 'Localhost' }
    );
  }

  public getActiveTagFilter(): string {
    return this.activeTagFilter;
  }

  public setActiveTagFilter(tag: string): void {
    this.activeTagFilter = tag;
    this.notify();
  }

  public getSearchQuery(): string {
    return this.searchQuery;
  }

  public setSearchQuery(query: string): void {
    this.searchQuery = (query || '').toLowerCase().trim();
    this.notify();
  }

  public getPingData(serverId?: string): PingResult | Record<string, PingResult> {
    if (serverId) {
      return this.pingData[serverId] || { status: 'online', ms: serverId === 'localhost' ? 0 : null };
    }
    return { ...this.pingData };
  }

  public setPing(serverId: string, result: PingResult): void {
    this.pingData[serverId] = result;
    this.notify();
  }

  public getDistinctTags(): string[] {
    const allTags = new Set<string>();
    for (const s of this.servers) {
      if (Array.isArray(s.tags)) {
        for (const t of s.tags) {
          if (t) allTags.add(t);
        }
      }
    }
    return Array.from(allTags).sort();
  }

  public filterServers(): ServerNode[] {
    return this.servers.filter(s => {
      if (this.activeTagFilter !== 'all' && !(s.tags || []).includes(this.activeTagFilter)) {
        return false;
      }
      if (this.searchQuery) {
        const nameMatch = (s.name || '').toLowerCase().includes(this.searchQuery);
        const idMatch = (s.id || '').toLowerCase().includes(this.searchQuery);
        const hostMatch = (s.connection?.ssh?.host || s.host || '').toLowerCase().includes(this.searchQuery);
        const tagMatch = (s.tags || []).some(t => t.toLowerCase().includes(this.searchQuery));
        return nameMatch || idMatch || hostMatch || tagMatch;
      }
      return true;
    });
  }
}

export const store = new FleetStore();
