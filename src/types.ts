/**
 * Core type definitions for Config Studio — Servers & Fleet Manager
 */

export interface ServerConnectionSSH {
  enabled?: boolean;
  host: string;
  port?: number;
  user?: string;
  identity?: string;
}

export interface ServerConnectionAgent {
  enabled?: boolean;
  url?: string;
  port?: number;
  vaultSecret?: string;
  secretRef?: string; // legacy alias
  tlsVerify?: boolean;
}

export interface ServerConnection {
  ssh?: ServerConnectionSSH;
  agent?: ServerConnectionAgent;
}

export interface ServerRollout {
  canary?: boolean;
  order?: number;
}

export interface ServerNode {
  id: string;
  name: string;
  group?: string;
  tags?: string[];
  sshHostRef?: string;
  host?: string; // legacy direct field
  port?: number; // legacy direct field
  user?: string; // legacy direct field
  identity?: string; // legacy direct field
  connection?: ServerConnection;
  rollout?: ServerRollout;
}

export interface CoreHost {
  id: string;
  name?: string;
  host?: string;
  address?: string;
  port?: number;
  user?: string;
  username?: string;
  identityId?: string;
  authType?: string;
  group?: string;
  tags?: string[];
  createdAt?: string;
}

export interface VaultSecret {
  id: string;
  title?: string;
  type?: string;
  value?: string;
  secret?: string;
  keyId?: string;
}

export interface PingResult {
  status: 'online' | 'offline' | 'warn';
  ms: number | null;
  error?: string;
}

export interface BatchInstallEvent {
  serverId: string;
  name?: string;
  host?: string;
  status: 'pending' | 'connecting' | 'installing' | 'success' | 'skipped' | 'error';
  step?: string;
  logs?: string[];
  error?: string;
}

export interface BatchInstallSummary {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

export interface DropdownOption {
  value: string;
  label: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  statusDot?: 'online' | 'offline' | 'warn';
  server?: ServerNode;
}

export interface DropdownController {
  getValue?: () => string;
  destroy: () => void;
}

export interface ConfigStudioUiBridge {
  toast?: (msg: string, type?: string) => void;
  renderDropdown?: (container: HTMLElement, options: any) => DropdownController;
}

export interface ConfigStudioSshBridge {
  save?: (host: CoreHost) => Promise<any> | any;
  setLastActiveHostId?: (id: string) => void;
  fetchFromServer?: () => Promise<CoreHost[]>;
  list?: () => CoreHost[];
}

export interface ConfigStudioSecretsBridge {
  get?: (id: string) => Promise<any>;
  set?: (item: any) => Promise<any>;
  delete?: (id: string) => Promise<any>;
  list?: () => Promise<VaultSecret[]>;
}

export interface ConfigStudioSysinfoBridge {
  setActiveNode?: (id: string, name: string) => void;
}

export interface ConfigStudioServicesBridge {
  register: (name: string, serviceApi: any, pluginId: string) => void;
  get?: (name: string) => any;
}

export interface ConfigStudioCustomTab {
  path: string;
  name: string;
  content: string;
  language: string;
  badge?: string;
  onSave?: (newContent: string) => Promise<void>;
}

export interface ConfigStudioGlobal {
  ui?: ConfigStudioUiBridge;
  ssh?: ConfigStudioSshBridge;
  secrets?: ConfigStudioSecretsBridge;
  sysinfo?: ConfigStudioSysinfoBridge;
  services?: ConfigStudioServicesBridge;
  registerHeaderItem?: (item: any) => void;
  registerSplitPanel?: (panel: any) => void;
  registerContextMenu?: (menu: any) => void;
  setRemoteEndpoint?: (url: string | null, token?: string) => void;
  refreshFiles?: () => Promise<void>;
  openSftp?: (host: any) => void;
  openTerminal?: (host: any) => void;
  openCustomTab?: (tab: ConfigStudioCustomTab) => Promise<void>;
  getActiveFile?: () => { name: string; content?: string; path?: string } | null;
  getActiveContent?: () => string | null;
  showNotification?: (msg: string, type?: string) => void;
  showToast?: (msg: string, type?: string) => void;
}

declare global {
  interface Window {
    ConfigStudio?: ConfigStudioGlobal;
  }
}
