"use strict";
var ConfigStudioServersPlugin = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    DEFAULT_AGENT_PORT: () => DEFAULT_AGENT_PORT,
    FleetController: () => FleetController,
    FleetStore: () => FleetStore,
    ICONS: () => ICONS,
    PING_CONCURRENCY: () => PING_CONCURRENCY,
    PLUGIN_ID: () => PLUGIN_ID,
    TOTP_REFRESH_INTERVAL_MS: () => TOTP_REFRESH_INTERVAL_MS,
    TOTP_STEP_SECONDS: () => TOTP_STEP_SECONDS,
    apiFetch: () => apiFetch,
    base32Decode: () => base32Decode,
    cleanBase32: () => cleanBase32,
    createServerCard: () => createServerCard,
    deleteServer: () => deleteServer,
    escapeHtml: () => escapeHtml,
    fetchCoreHosts: () => fetchCoreHosts,
    fetchRawYaml: () => fetchRawYaml,
    fetchServers: () => fetchServers,
    fetchVaultSecrets: () => fetchVaultSecrets,
    fleet: () => fleet,
    formatAgentConnectionLink: () => formatAgentConnectionLink,
    formatYamlSummary: () => formatYamlSummary,
    generateRandomBase32: () => generateRandomBase32,
    generateRandomKeyId: () => generateRandomKeyId,
    generateTOTPWebCrypto: () => generateTOTPWebCrypto,
    getAgentAuthToken: () => getAgentAuthToken,
    getVaultSecret: () => getVaultSecret,
    initServersPlugin: () => initServersPlugin,
    installAgent: () => installAgent,
    isValidBase32: () => isValidBase32,
    openBatchInstallModal: () => openBatchInstallModal,
    openEditModal: () => openEditModal,
    openInstallAgentDialog: () => openInstallAgentDialog,
    openManualAgentModal: () => openManualAgentModal,
    openRawYAMLModal: () => openRawYAMLModal,
    openSendToFleetModal: () => openSendToFleetModal,
    openTokensModal: () => openTokensModal,
    parseAgentConnectionLink: () => parseAgentConnectionLink,
    pingServer: () => pingServer,
    registerHeaderSwitcher: () => registerHeaderSwitcher,
    registerSidebarPanel: () => registerSidebarPanel,
    sanitizeServerId: () => sanitizeServerId,
    saveRawYaml: () => saveRawYaml,
    saveServer: () => saveServer,
    saveVaultSecret: () => saveVaultSecret,
    showToast: () => showToast,
    store: () => store,
    syncSSHHost: () => syncSSHHost,
    validateServerConfig: () => validateServerConfig
  });

  // src/state.ts
  var FleetStore = class {
    constructor() {
      __publicField(this, "servers", []);
      __publicField(this, "activeServerId", "localhost");
      __publicField(this, "activeTagFilter", "all");
      __publicField(this, "searchQuery", "");
      __publicField(this, "pingData", {});
      __publicField(this, "listeners", /* @__PURE__ */ new Set());
      if (typeof localStorage !== "undefined") {
        this.activeServerId = localStorage.getItem("cs_active_server_id") || "localhost";
      }
    }
    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    notify() {
      for (const listener of this.listeners) {
        try {
          listener();
        } catch (err) {
          console.error("[FleetStore] Listener error:", err);
        }
      }
    }
    getServers() {
      return [...this.servers];
    }
    setServers(list) {
      this.servers = [...list];
      if (!this.servers.find((s) => s.id === "localhost")) {
        this.servers.unshift({
          id: "localhost",
          name: "Localhost (\u042D\u0442\u043E\u0442 \u041F\u041A)",
          group: "local",
          tags: ["local"]
        });
      }
      this.notify();
    }
    getActiveServerId() {
      return this.activeServerId;
    }
    setActiveServerId(id) {
      this.activeServerId = id;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("cs_active_server_id", id);
      }
      this.notify();
    }
    getActiveServer() {
      return this.servers.find((s) => s.id === this.activeServerId) || this.servers[0] || { id: "localhost", name: "Localhost" };
    }
    getActiveTagFilter() {
      return this.activeTagFilter;
    }
    setActiveTagFilter(tag) {
      this.activeTagFilter = tag;
      this.notify();
    }
    getSearchQuery() {
      return this.searchQuery;
    }
    setSearchQuery(query) {
      this.searchQuery = (query || "").toLowerCase().trim();
      this.notify();
    }
    getPingData(serverId) {
      if (serverId) {
        return this.pingData[serverId] || { status: "online", ms: serverId === "localhost" ? 0 : null };
      }
      return { ...this.pingData };
    }
    setPing(serverId, result) {
      this.pingData[serverId] = result;
      this.notify();
    }
    getDistinctTags() {
      const allTags = /* @__PURE__ */ new Set();
      for (const s of this.servers) {
        if (Array.isArray(s.tags)) {
          for (const t of s.tags) {
            if (t) allTags.add(t);
          }
        }
      }
      return Array.from(allTags).sort();
    }
    filterServers() {
      return this.servers.filter((s) => {
        if (this.activeTagFilter !== "all" && !(s.tags || []).includes(this.activeTagFilter)) {
          return false;
        }
        if (this.searchQuery) {
          const nameMatch = (s.name || "").toLowerCase().includes(this.searchQuery);
          const idMatch = (s.id || "").toLowerCase().includes(this.searchQuery);
          const hostMatch = (s.connection?.ssh?.host || s.host || "").toLowerCase().includes(this.searchQuery);
          const tagMatch = (s.tags || []).some((t) => t.toLowerCase().includes(this.searchQuery));
          return nameMatch || idMatch || hostMatch || tagMatch;
        }
        return true;
      });
    }
  };
  var store = new FleetStore();

  // src/constants.ts
  var PLUGIN_ID = "servers";
  var DEFAULT_AGENT_PORT = 8085;
  var TOTP_STEP_SECONDS = 30;
  var TOTP_REFRESH_INTERVAL_MS = 15e3;
  var PING_CONCURRENCY = 5;
  var ICONS = {
    server: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>',
    host: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
    agent: '<svg style="width:13px;height:13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
    sftp: '<svg style="width:13px;height:13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>',
    shell: '<svg style="width:13px;height:13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
    chevron: '<svg class="cs-fleet-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>',
    plus: '<svg style="width:13px;height:13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>',
    edit: '<svg style="width:12px;height:12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>',
    trash: '<svg style="width:12px;height:12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>',
    close: '<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
    folder: '<svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>',
    send: '<svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>',
    shield: '<svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    check: '<svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
    search: '<svg style="width:13px;height:13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>',
    key: '<svg style="width:13px;height:13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>',
    warning: '<svg style="width:13px;height:13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
    arrowRight: '<svg style="width:12px;height:12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>'
  };

  // src/crypto.ts
  function cleanBase32(secret) {
    if (!secret) return "";
    return secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
  }
  function isValidBase32(secret) {
    const clean = cleanBase32(secret);
    return clean.length >= 16;
  }
  function generateRandomBase32(length = 24) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let result = "";
    const cryptoObj = typeof window !== "undefined" && window.crypto ? window.crypto : globalThis.crypto;
    if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
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
  function generateRandomKeyId(prefix = "cs_key") {
    const bytes = new Uint8Array(16);
    const cryptoObj = typeof window !== "undefined" && window.crypto ? window.crypto : globalThis.crypto;
    if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
      cryptoObj.getRandomValues(bytes);
      const hex2 = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      return `${prefix}_${hex2}`;
    }
    let hex = "";
    for (let i = 0; i < 32; i++) {
      hex += Math.floor(Math.random() * 16).toString(16);
    }
    return `${prefix}_${hex}`;
  }
  function parseAgentConnectionLink(raw) {
    let link = (raw || "").trim();
    if (!link) {
      throw new Error("\u041F\u0443\u0441\u0442\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F");
    }
    if (link.startsWith("csagent://")) {
      link = "cs-agent://" + link.slice("csagent://".length);
    } else if (link.startsWith("cs://agent/")) {
      link = "cs-agent://" + link.slice("cs://agent/".length);
    } else if (!link.startsWith("cs-agent://")) {
      throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0441\u0445\u0435\u043C\u0430: \u0441\u0441\u044B\u043B\u043A\u0430 \u0434\u043E\u043B\u0436\u043D\u0430 \u043D\u0430\u0447\u0438\u043D\u0430\u0442\u044C\u0441\u044F \u0441 cs-agent://");
    }
    const httpEquivalent = "http://" + link.slice("cs-agent://".length);
    const u = new URL(httpEquivalent);
    const keyId = decodeURIComponent(u.username || "");
    const secret = decodeURIComponent(u.password || "");
    if (!keyId || !secret) {
      throw new Error("\u0412 \u0441\u0441\u044B\u043B\u043A\u0435 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 (\u0444\u043E\u0440\u043C\u0430\u0442: cs-agent://keyId:secret@host:port)");
    }
    const host = u.hostname;
    if (!host) {
      throw new Error("\u0412 \u0441\u0441\u044B\u043B\u043A\u0435 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u0445\u043E\u0441\u0442 \u0438\u043B\u0438 IP-\u0430\u0434\u0440\u0435\u0441");
    }
    const port = u.port ? parseInt(u.port, 10) : 8085;
    const tls = u.searchParams.get("tls") === "1" || u.searchParams.get("tls") === "true";
    const rootsRaw = u.searchParams.get("roots") || u.searchParams.get("paths") || "";
    const roots = rootsRaw ? rootsRaw.split(",").map((r) => r.trim()).filter(Boolean) : [];
    let nodeName = u.hash ? decodeURIComponent(u.hash.replace(/^#/, "")) : "";
    if (!nodeName) {
      nodeName = u.searchParams.get("name") || host;
    }
    let nodeId = u.searchParams.get("id") || "";
    if (!nodeId) {
      nodeId = nodeName.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
    }
    return {
      keyId,
      secret: secret.toUpperCase(),
      host,
      port,
      tls,
      roots,
      nodeName,
      nodeId: nodeId || "agent-node"
    };
  }
  function formatAgentConnectionLink(info) {
    const host = info.host || "127.0.0.1";
    const port = info.port || 8085;
    const keyId = encodeURIComponent(info.keyId || "cs_key");
    const secret = encodeURIComponent(cleanBase32(info.secret));
    const u = new URL(`http://${host}:${port}/`);
    if (info.roots && info.roots.length > 0) {
      u.searchParams.set("roots", info.roots.join(","));
    }
    if (info.tls) {
      u.searchParams.set("tls", "1");
    }
    if (info.nodeId) {
      u.searchParams.set("id", info.nodeId);
    }
    const name = info.nodeName || host;
    const queryPart = u.search ? u.search : "";
    return `cs-agent://${keyId}:${secret}@${host}:${port}/${queryPart}#${encodeURIComponent(name)}`;
  }
  function base32Decode(str) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const cleanStr = (str || "").toUpperCase().replace(/=+$/, "");
    let bits = "";
    for (let i = 0; i < cleanStr.length; i++) {
      const val = alphabet.indexOf(cleanStr[i]);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, "0");
    }
    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
    }
    return bytes;
  }
  async function generateTOTPWebCrypto(secret, timestampSeconds = Math.floor(Date.now() / 1e3)) {
    if (!secret) return "";
    try {
      const keyBytes = base32Decode(secret);
      if (keyBytes.length === 0) return "";
      const counter = Math.floor(timestampSeconds / TOTP_STEP_SECONDS);
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setBigUint64(0, BigInt(counter), false);
      const cryptoSubtle = typeof window !== "undefined" && window.crypto?.subtle ? window.crypto.subtle : globalThis.crypto?.subtle;
      if (!cryptoSubtle) {
        console.warn("[TOTP] crypto.subtle is not available in current environment");
        return "";
      }
      const cryptoKey = await cryptoSubtle.importKey(
        "raw",
        keyBytes,
        { name: "HMAC", hash: { name: "SHA-1" } },
        false,
        ["sign"]
      );
      const signature = await cryptoSubtle.sign("HMAC", cryptoKey, buffer);
      const hmac = new Uint8Array(signature);
      const offset = hmac[hmac.length - 1] & 15;
      const code = (hmac[offset] & 127) << 24 | (hmac[offset + 1] & 255) << 16 | (hmac[offset + 2] & 255) << 8 | hmac[offset + 3] & 255;
      return (code % 1e6).toString().padStart(6, "0");
    } catch (err) {
      console.warn("[generateTOTPWebCrypto error]", err);
      return "";
    }
  }
  async function getAgentAuthToken(server) {
    if (!server.connection || !server.connection.agent) return "";
    const agentCfg = server.connection.agent;
    const secretId = agentCfg.vaultSecret || agentCfg.secretRef || "agent:" + server.id;
    let secretVal = null;
    try {
      if (typeof window !== "undefined" && window.ConfigStudio?.secrets?.get) {
        secretVal = await window.ConfigStudio.secrets.get(secretId);
      }
    } catch (err) {
      console.warn(`[getAgentAuthToken] Failed to read secret ${secretId} from bridge:`, err);
    }
    if (!secretVal && typeof fetch !== "undefined") {
      try {
        const res = await fetch(`/api/secrets/${encodeURIComponent(secretId)}`, {
          headers: { "X-ConfigStudio-Web": "1" }
        });
        if (res.ok) {
          const data = await res.json();
          secretVal = data && typeof data === "object" && !data.secret && !data.value ? data : data.secret || data.value || data;
        }
      } catch (err) {
        console.warn(`[getAgentAuthToken] Failed to fetch secret ${secretId} via REST API:`, err);
      }
    }
    if (!secretVal) {
      return secretId || "";
    }
    let keyId = "cs_key";
    let secret = "";
    if (typeof secretVal === "object") {
      keyId = secretVal.keyId || "cs_key";
      secret = secretVal.secret || secretVal.value || "";
    } else if (typeof secretVal === "string") {
      try {
        const parsed = JSON.parse(secretVal);
        keyId = parsed.keyId || "cs_key";
        secret = parsed.secret || parsed.value || "";
      } catch (_) {
        if (secretVal.includes(":")) {
          const parts = secretVal.split(":");
          keyId = parts[0];
          secret = parts[1];
        } else if (/^[A-Z2-7=]{16,}$/i.test(secretVal.trim())) {
          secret = secretVal.trim();
          keyId = "cs_key";
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
        console.warn("[TOTP generation failed]", err);
        return keyId;
      }
    }
    return keyId;
  }

  // src/hostSync.ts
  function syncSSHHost(server) {
    const sshCfg = server.connection?.ssh || (server.host ? {
      host: server.host,
      port: server.port || 22,
      user: server.user || "root",
      identity: server.identity || ""
    } : null);
    if (!sshCfg || !sshCfg.host) {
      if (server.sshHostRef) {
        return { id: server.sshHostRef, name: server.name || server.id, host: server.sshHostRef };
      }
      return null;
    }
    const hostObj = {
      id: server.id,
      name: server.name || server.id,
      host: sshCfg.host,
      port: sshCfg.port || 22,
      user: sshCfg.user || "root",
      identityId: sshCfg.identity || "",
      authType: sshCfg.identity ? "vault" : "none",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (typeof window !== "undefined" && window.ConfigStudio?.ssh && typeof window.ConfigStudio.ssh.save === "function") {
      try {
        window.ConfigStudio.ssh.save(hostObj);
        if (typeof window.ConfigStudio.ssh.setLastActiveHostId === "function") {
          window.ConfigStudio.ssh.setLastActiveHostId(hostObj.id);
        }
      } catch (err) {
        console.warn("[syncSSHHost error]", err);
      }
    } else if (typeof fetch !== "undefined") {
      fetch("/api/hosts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-ConfigStudio-Web": "1" },
        body: JSON.stringify(hostObj)
      }).catch((err) => console.warn("[syncSSHHost API error]", err));
    }
    return hostObj;
  }
  async function fetchCoreHosts() {
    let coreHosts = [];
    if (typeof window !== "undefined" && window.ConfigStudio?.ssh) {
      if (typeof window.ConfigStudio.ssh.fetchFromServer === "function") {
        try {
          const list = await window.ConfigStudio.ssh.fetchFromServer();
          if (Array.isArray(list) && list.length > 0) {
            return list;
          }
        } catch (err) {
          console.warn("[fetchCoreHosts] Failed to load hosts via ssh service:", err);
        }
      }
      if (typeof window.ConfigStudio.ssh.list === "function") {
        const list = window.ConfigStudio.ssh.list();
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    }
    if (typeof fetch !== "undefined") {
      try {
        const res = await fetch("/api/hosts", { headers: { "X-ConfigStudio-Web": "1" } });
        if (res.ok) {
          const data = await res.json();
          coreHosts = Array.isArray(data) ? data : data.hosts || [];
        }
      } catch (err) {
        console.warn("[fetchCoreHosts] Failed to load core hosts via fetch:", err);
      }
    }
    return coreHosts;
  }
  async function fetchVaultSecrets() {
    let vaultSecrets = [];
    if (typeof window !== "undefined" && window.ConfigStudio?.secrets && typeof window.ConfigStudio.secrets.list === "function") {
      try {
        const list = await window.ConfigStudio.secrets.list();
        if (Array.isArray(list)) return list;
      } catch (err) {
        console.warn("[fetchVaultSecrets] Failed via bridge:", err);
      }
    }
    if (typeof fetch !== "undefined") {
      try {
        const res = await fetch("/api/secrets", { headers: { "X-ConfigStudio-Web": "1" } });
        if (res.ok) {
          const data = await res.json();
          vaultSecrets = Array.isArray(data) ? data : data.secrets || [];
        }
      } catch (err) {
        console.warn("[fetchVaultSecrets] Failed to load secrets from Vault:", err);
      }
    }
    return vaultSecrets;
  }

  // src/api.ts
  async function apiFetch(url, options = {}) {
    const headers = Object.assign(
      {
        "X-ConfigStudio-Web": "1",
        "Content-Type": "application/json"
      },
      options.headers || {}
    );
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errMsg = res.statusText || `HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j && j.error) errMsg = j.error;
      } catch (_) {
      }
      throw new Error(errMsg);
    }
    return res.json();
  }
  async function fetchServers() {
    const data = await apiFetch("/api/servers");
    return data.servers || [];
  }
  async function saveServer(server) {
    return await apiFetch("/api/servers", {
      method: "POST",
      body: JSON.stringify(server)
    });
  }
  async function deleteServer(serverId) {
    return await apiFetch(`/api/servers/${encodeURIComponent(serverId)}`, {
      method: "DELETE"
    });
  }
  async function pingServer(serverId) {
    return await apiFetch(`/api/servers/ping/${encodeURIComponent(serverId)}`, {
      method: "POST"
    });
  }
  async function fetchRawYaml() {
    const res = await fetch("/api/servers/raw", {
      headers: { "X-ConfigStudio-Web": "1" }
    });
    if (!res.ok) {
      let errMsg = res.statusText || `HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j && j.error) errMsg = j.error;
      } catch (_) {
      }
      throw new Error(errMsg);
    }
    return await res.text();
  }
  async function saveRawYaml(content) {
    const res = await fetch("/api/servers/raw", {
      method: "PUT",
      headers: {
        "X-ConfigStudio-Web": "1",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content })
    });
    if (!res.ok) {
      let errMsg = res.statusText || `HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j && j.error) errMsg = j.error;
      } catch (_) {
      }
      throw new Error(errMsg);
    }
  }
  async function installAgent(serverId, payload) {
    return await apiFetch(`/api/servers/install-agent/${encodeURIComponent(serverId)}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
  async function saveVaultSecret(item) {
    if (typeof window !== "undefined" && window.ConfigStudio?.secrets?.set) {
      try {
        await window.ConfigStudio.secrets.set(item);
        return { success: true };
      } catch (err) {
        console.warn("[saveVaultSecret] Bridge set failed, falling back to REST API:", err);
      }
    }
    return await apiFetch("/api/secrets/save", {
      method: "POST",
      body: JSON.stringify({
        id: item.id,
        title: item.title,
        type: item.type,
        scope: item.scope || "shared",
        pluginId: item.pluginId || "servers",
        value: item.value
      })
    });
  }
  async function getVaultSecret(id) {
    if (!id) return null;
    if (typeof window !== "undefined" && window.ConfigStudio?.secrets?.get) {
      try {
        const val = await window.ConfigStudio.secrets.get(id);
        if (val) return val;
      } catch (_) {
      }
    }
    try {
      const res = await apiFetch("/api/secrets/get", {
        method: "POST",
        body: JSON.stringify({ id })
      });
      return res && res.value ? res.value : null;
    } catch (_) {
      return null;
    }
  }

  // src/ui/domUtils.ts
  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function showToast(msg, type = "info") {
    try {
      if (typeof window !== "undefined" && window.ConfigStudio) {
        if (typeof window.ConfigStudio.showNotification === "function") {
          window.ConfigStudio.showNotification(msg, type);
          return;
        }
        if (typeof window.ConfigStudio.showToast === "function") {
          window.ConfigStudio.showToast(msg, type);
          return;
        }
        if (window.ConfigStudio.ui && typeof window.ConfigStudio.ui.toast === "function") {
          window.ConfigStudio.ui.toast(msg, type);
          return;
        }
      }
      console.log(`[Toast ${type}]`, msg);
    } catch (err) {
      console.warn("[Toast fallback]", msg, err);
    }
  }

  // src/yaml.ts
  function sanitizeServerId(raw) {
    if (!raw) return "";
    return raw.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
  }
  function validateServerConfig(server) {
    if (!server.id || !server.id.trim()) {
      return { valid: false, error: "ID \u0443\u0437\u043B\u0430 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u0435\u043D" };
    }
    const sanitizedId = sanitizeServerId(server.id);
    if (!sanitizedId) {
      return { valid: false, error: "ID \u0443\u0437\u043B\u0430 \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043B\u0430\u0442\u0438\u043D\u0441\u043A\u0438\u0435 \u0431\u0443\u043A\u0432\u044B, \u0446\u0438\u0444\u0440\u044B, \u0434\u0435\u0444\u0438\u0441 \u0438\u043B\u0438 \u043F\u043E\u0434\u0447\u0435\u0440\u043A\u0438\u0432\u0430\u043D\u0438\u0435" };
    }
    const hasHostRef = Boolean(server.sshHostRef && server.sshHostRef.trim());
    const hasDirectSsh = Boolean(server.connection?.ssh?.host && server.connection.ssh.host.trim());
    const hasLegacyHost = Boolean(server.host && server.host.trim());
    const hasAgentUrl = Boolean(server.connection?.agent?.url && server.connection.agent.url.trim());
    const hasAgentConfig = Boolean(
      server.connection?.agent?.enabled && (server.connection.agent.url || server.connection.agent.vaultSecret || server.connection.agent.secretRef)
    );
    if (server.id !== "localhost" && !hasHostRef && !hasDirectSsh && !hasLegacyHost && !hasAgentUrl && !hasAgentConfig) {
      return { valid: false, error: "\u041D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E \u0443\u043A\u0430\u0437\u0430\u0442\u044C \u0445\u043E\u0441\u0442 (\u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0430 \u043A \u044F\u0434\u0440\u0443, \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B SSH \u0438\u043B\u0438 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0430\u0433\u0435\u043D\u0442\u0430)" };
    }
    return { valid: true };
  }
  function formatYamlSummary(server) {
    const parts = [`ID: ${server.id}`, `\u0418\u043C\u044F: ${server.name}`];
    if (server.sshHostRef) parts.push(`Core Host: ${server.sshHostRef}`);
    if (server.connection?.ssh?.host) parts.push(`SSH: ${server.connection.ssh.host}`);
    if (server.connection?.agent?.enabled) parts.push(`Agent: port ${server.connection.agent.port || 8085}`);
    if (server.group) parts.push(`\u0413\u0440\u0443\u043F\u043F\u0430: ${server.group}`);
    return parts.join(" | ");
  }

  // src/ui/manualAgentModal.ts
  async function openManualAgentModal(srv, onSaved) {
    const isNew = !srv || !srv.id;
    const initialId = srv?.id || "";
    const initialName = srv?.name || "";
    const initialRoots = srv?.connection?.agent?.roots || [];
    let initialHost = "";
    let initialPort = srv?.connection?.agent?.port || DEFAULT_AGENT_PORT;
    let initialHttps = false;
    if (srv?.connection?.agent?.url) {
      initialHttps = srv.connection.agent.url.startsWith("https://");
      const match = srv.connection.agent.url.match(/^https?:\/\/([^:/]+)(?::(\d+))?/i);
      if (match) {
        initialHost = match[1];
        if (match[2]) initialPort = parseInt(match[2], 10);
      }
    }
    if (!initialHost) {
      initialHost = srv?.connection?.ssh?.host || srv?.host || srv?.sshHostRef || "";
    }
    const initialVaultSecretId = srv?.connection?.agent?.vaultSecret || srv?.connection?.agent?.secretRef || (initialId ? `agent:${initialId}` : "");
    let existingKeyId = generateRandomKeyId("cs_key");
    let existingSecret = "";
    if (initialVaultSecretId) {
      try {
        const rawVal = await getVaultSecret(initialVaultSecretId);
        if (rawVal) {
          if (typeof rawVal === "object") {
            if (rawVal.keyId) existingKeyId = rawVal.keyId;
            if (rawVal.secret || rawVal.value) existingSecret = rawVal.secret || rawVal.value;
          } else if (typeof rawVal === "string") {
            try {
              const parsed = JSON.parse(rawVal);
              if (parsed.keyId) existingKeyId = parsed.keyId;
              if (parsed.secret || parsed.value) existingSecret = parsed.secret || parsed.value;
            } catch (_) {
              if (rawVal.includes(":")) {
                const parts = rawVal.split(":");
                existingKeyId = parts[0];
                existingSecret = parts[1];
              } else if (isValidBase32(rawVal)) {
                existingSecret = rawVal.trim();
              }
            }
          }
        }
      } catch (err) {
        console.warn("[openManualAgentModal] Failed to load existing secret:", err);
      }
    }
    const overlay = document.createElement("div");
    overlay.className = "cs-fleet-modal-overlay";
    const modal = document.createElement("div");
    modal.className = "cs-fleet-modal-content cs-fleet-modal-lg";
    modal.innerHTML = `
    <div class="cs-fleet-modal-header">
      <div style="display:flex;align-items:center;gap:8px;">
        <span>${ICONS.agent}</span>
        <span style="font-weight:700;font-size:14px;">
          ${isNew ? "\u0420\u0443\u0447\u043D\u0430\u044F \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 Remote Agent" : `\u0420\u0443\u0447\u043D\u0430\u044F \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 Remote Agent \u2014 ${escapeHtml(srv.name || srv.id)}`}
        </span>
      </div>
      <button class="cs-fleet-modal-close">${ICONS.close}</button>
    </div>

    <div class="cs-fleet-modal-body" style="padding:16px 20px;display:flex;flex-direction:column;gap:14px;">
      <!-- Quick Import / Export Card (VLESS / Hysteria style URL) -->
      <div style="background:linear-gradient(135deg, rgba(56,189,248,0.08), rgba(99,102,241,0.08));border:1px solid rgba(56,189,248,0.3);border-radius:10px;padding:12px 14px;">
        <div style="font-size:12px;font-weight:600;margin-bottom:8px;color:var(--cs-srv-text-primary);display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span>\u26A1</span>
            <span>1-Click \u0418\u043C\u043F\u043E\u0440\u0442 \u043F\u043E \u0441\u0441\u044B\u043B\u043A\u0435 \u0430\u0433\u0435\u043D\u0442\u0430 (cs-agent://)</span>
          </div>
          <button type="button" id="cs-manual-copy-link-btn" title="\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u0441\u0435 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u043A\u0430\u043A \u0441\u0441\u044B\u043B\u043A\u0443 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F cs-agent://" style="background:none;border:none;color:#38bdf8;cursor:pointer;font-size:11.5px;display:inline-flex;align-items:center;gap:4px;padding:0;">
            \u{1F4CB} \u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0443 cs-agent://
          </button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="text" class="cs-fleet-form-input" id="cs-manual-import-link" placeholder="\u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443: cs-agent://key:secret@host:port/?roots=/opt,/var#node-name" style="font-family:monospace;font-size:11.5px;" />
          <button type="button" class="cs-fleet-btn-secondary" id="cs-manual-import-btn" style="white-space:nowrap;padding:6px 14px;font-size:11.5px;">
            \u0418\u043C\u043F\u043E\u0440\u0442
          </button>
        </div>
        <div id="cs-manual-import-status" style="font-size:11px;margin-top:5px;color:var(--cs-srv-text-muted);">
          \u0421\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 \u0441\u0442\u0440\u043E\u043A\u0443 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u043F\u0440\u044F\u043C\u043E \u0438\u0437 \u043A\u043E\u043D\u0441\u043E\u043B\u0438 Remote Agent (\u043A\u043E\u043C\u0430\u043D\u0434\u0430: <code style="color:var(--cs-srv-accent);">config-studio-agent link</code>)
        </div>
      </div>

      <!-- Server Identity (editable if new) -->
      ${isNew ? `
        <div class="cs-fleet-form-grid" style="grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px;">
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">ID \u0443\u0437\u043B\u0430 *</label>
            <input type="text" class="cs-fleet-form-input" id="cs-manual-node-id" value="${escapeHtml(initialId)}" placeholder="agent-vps-01" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">\u0418\u043C\u044F \u0443\u0437\u043B\u0430</label>
            <input type="text" class="cs-fleet-form-input" id="cs-manual-node-name" value="${escapeHtml(initialName)}" placeholder="Production VPS Agent" />
          </div>
        </div>
      ` : `
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.02);border:1px solid var(--cs-srv-border);border-radius:8px;padding:8px 12px;">
          <div style="font-size:12px;">
            <span style="color:var(--cs-srv-text-muted);">\u0423\u0437\u0435\u043B:</span> <b>${escapeHtml(srv.name || srv.id)}</b> <span style="font-family:monospace;color:var(--cs-srv-accent);font-size:11px;">(${escapeHtml(srv.id)})</span>
          </div>
          <input type="hidden" id="cs-manual-node-id" value="${escapeHtml(srv.id)}" />
          <input type="hidden" id="cs-manual-node-name" value="${escapeHtml(srv.name || srv.id)}" />
        </div>
      `}

      <!-- Network parameters & Multi-Root Workspaces -->
      <div style="background:rgba(255,255,255,0.02);border:1px solid var(--cs-srv-border);border-radius:10px;padding:14px;">
        <div style="font-size:11.5px;font-weight:600;margin-bottom:10px;color:var(--cs-srv-text-primary);display:flex;align-items:center;gap:6px;">
          <span>\u{1F310}</span>
          <span>\u0421\u0435\u0442\u0435\u0432\u043E\u0439 \u0430\u0434\u0440\u0435\u0441 \u0438 \u0440\u0430\u0431\u043E\u0447\u0438\u0435 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0438</span>
        </div>
        <div class="cs-fleet-form-grid" style="grid-template-columns: minmax(0, 2fr) 110px minmax(0, 1fr); gap: 10px; align-items: start;">
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">\u0425\u043E\u0441\u0442 / IP-\u0430\u0434\u0440\u0435\u0441 \u0430\u0433\u0435\u043D\u0442\u0430 *</label>
            <input type="text" class="cs-fleet-form-input" id="cs-manual-host" value="${escapeHtml(initialHost)}" placeholder="192.168.0.110 \u0438\u043B\u0438 agent.domain.com" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">\u041F\u043E\u0440\u0442 \u0430\u0433\u0435\u043D\u0442\u0430</label>
            <input type="number" class="cs-fleet-form-input" id="cs-manual-port" min="1" max="65535" value="${initialPort}" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">\u041F\u0440\u043E\u0442\u043E\u043A\u043E\u043B</label>
            <div class="cs-fleet-checkbox-row" style="margin-top:6px;margin-bottom:0;">
              <input type="checkbox" id="cs-manual-https" ${initialHttps ? "checked" : ""} />
              <label for="cs-manual-https" style="font-size:11.5px;cursor:pointer;">HTTPS (TLS)</label>
            </div>
          </div>
        </div>

        <!-- Multiple Working Directories (Allowed Roots) -->
        <div class="cs-fleet-form-group" style="margin-top:10px;">
          <label class="cs-fleet-form-label">\u0411\u0430\u0437\u043E\u0432\u044B\u0435 \u0440\u0430\u0431\u043E\u0447\u0438\u0435 \u043F\u0430\u043F\u043A\u0438 (\u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E)</label>
          <input type="text" class="cs-fleet-form-input" id="cs-manual-roots" value="${escapeHtml(initialRoots.join(", "))}" placeholder="/opt, /var/www, /etc" style="font-family:monospace;" />
          <div class="cs-fleet-form-help">\u041A\u0430\u0442\u0430\u043B\u043E\u0433\u0438 \u0444\u0430\u0439\u043B\u043E\u0432\u043E\u0439 \u0441\u0438\u0441\u0442\u0435\u043C\u044B \u0430\u0433\u0435\u043D\u0442\u0430 \u0434\u043B\u044F \u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u0438 \u0438 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0439</div>
        </div>

        <div style="margin-top:8px;font-size:11.5px;color:#38bdf8;font-family:monospace;" id="cs-manual-url-hint">
          URL: ${initialHttps ? "https" : "http"}://${initialHost || "127.0.0.1"}:${initialPort}
        </div>
      </div>

      <!-- Authentication & Vault -->
      <div style="background:rgba(255,255,255,0.02);border:1px solid var(--cs-srv-border);border-radius:10px;padding:14px;">
        <div style="font-size:11.5px;font-weight:600;margin-bottom:10px;color:var(--cs-srv-text-primary);display:flex;align-items:center;gap:6px;">
          <span>\u{1F511}</span>
          <span>\u041A\u043B\u044E\u0447\u0438 \u0430\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u0438 \u0438 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 Core Vault</span>
        </div>

        <div class="cs-fleet-form-grid" style="grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 12px; align-items: start;">
          <!-- API Token Key -->
          <div class="cs-fleet-form-group">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <label class="cs-fleet-form-label" style="margin-bottom:0;">\u041A\u043B\u044E\u0447 API \u0442\u043E\u043A\u0435\u043D\u0430 (cs_key_...) *</label>
              <button type="button" id="cs-manual-gen-key-btn" style="background:none;border:none;color:#38bdf8;cursor:pointer;padding:0;font-size:11px;">\u{1F3B2} \u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C</button>
            </div>
            <input type="text" class="cs-fleet-form-input" id="cs-manual-key-id" value="${escapeHtml(existingKeyId)}" placeholder="cs_key_56643d5586e39415ec34721cfc1b31b6" style="font-family:monospace;" />
            <div class="cs-fleet-form-help">\u041F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u044B\u0439 API-\u043A\u043B\u044E\u0447 \u0430\u0433\u0435\u043D\u0442\u0430 \u0438\u0437 agent.yaml (cs_key_..., 32 hex-\u0441\u0438\u043C\u0432\u043E\u043B\u0430)</div>
          </div>

          <!-- TOTP Secret -->
          <div class="cs-fleet-form-group">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <label class="cs-fleet-form-label" style="margin-bottom:0;">TOTP \u0421\u0435\u043A\u0440\u0435\u0442 (Base32) *</label>
              <button type="button" id="cs-manual-gen-secret-btn" style="background:none;border:none;color:#38bdf8;cursor:pointer;padding:0;font-size:11px;">\u{1F3B2} \u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C Base32</button>
            </div>
            <div style="position:relative;display:flex;align-items:center;">
              <input type="password" class="cs-fleet-form-input" id="cs-manual-totp-secret" value="${escapeHtml(existingSecret)}" placeholder="JBSWY3DPEHPK3PXP..." style="font-family:monospace;padding-right:32px;" />
              <button type="button" id="cs-manual-toggle-secret-btn" title="\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C/\u0441\u043A\u0440\u044B\u0442\u044C \u0441\u0435\u043A\u0440\u0435\u0442" style="position:absolute;right:8px;background:none;border:none;color:var(--cs-srv-text-muted);cursor:pointer;padding:2px;font-size:13px;">\u{1F441}</button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
              <div class="cs-fleet-form-help">Base32 \u0441\u0435\u043A\u0440\u0435\u0442 RFC 6238 \u0434\u043B\u044F \u0434\u0438\u043D\u0430\u043C\u0438\u0447\u0435\u0441\u043A\u043E\u0439 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438 \u0442\u043E\u043A\u0435\u043D\u0430</div>
              <div id="cs-manual-totp-status" style="font-size:10.5px;color:var(--cs-srv-text-muted);"></div>
            </div>
          </div>
        </div>

        <!-- Vault Secret Reference ID -->
        <div class="cs-fleet-form-group" style="margin-top:12px;">
          <label class="cs-fleet-form-label">\u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0441\u0435\u043A\u0440\u0435\u0442\u0430 \u0432 Core Vault</label>
          <input type="text" class="cs-fleet-form-input" id="cs-manual-vault-id" value="${escapeHtml(initialVaultSecretId || `agent:${initialId || "node"}`)}" style="font-family:monospace;background:rgba(0,0,0,0.2);" />
          <div class="cs-fleet-form-help" style="margin-top:4px;color:var(--cs-srv-accent);">
            \u2713 \u0412 <code>servers.yaml</code> \u0437\u0430\u043F\u0438\u0448\u0435\u0442\u0441\u044F \u0430\u043A\u043A\u0443\u0440\u0430\u0442\u043D\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430: <span id="cs-manual-yaml-preview" style="font-weight:600;">vault_secret: ${escapeHtml(initialVaultSecretId || `agent:${initialId || "node"}`)}</span>
          </div>
        </div>
      </div>

      <!-- Test Connection & Live Diagnostic Block -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--cs-srv-bg-base);border:1px solid var(--cs-srv-border);border-radius:8px;padding:10px 14px;">
        <div style="display:flex;align-items:center;gap:8px;font-size:11.5px;" id="cs-manual-test-status">
          <span style="color:var(--cs-srv-text-muted);">\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435\xBB \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0441\u0432\u044F\u0437\u0438 \u0438 TOTP \u0442\u043E\u043A\u0435\u043D\u0430...</span>
        </div>
        <button type="button" class="cs-fleet-btn-secondary" id="cs-manual-test-btn" style="padding:5px 12px;font-size:11.5px;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;">
          <span>\u26A1 \u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435</span>
        </button>
      </div>
    </div>

    <div class="cs-fleet-modal-footer">
      <div></div>
      <div style="display:flex;gap:8px;">
        <button class="cs-fleet-btn-secondary" id="cs-manual-cancel-btn">\u041E\u0442\u043C\u0435\u043D\u0430</button>
        <button class="cs-fleet-btn-primary" id="cs-manual-save-btn" style="display:inline-flex;align-items:center;gap:6px;">
          <span>\u{1F4BE} \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C \u043A Vault</span>
        </button>
      </div>
    </div>
  `;
    function closeModal() {
      overlay.remove();
    }
    modal.querySelector(".cs-fleet-modal-close")?.addEventListener("click", closeModal);
    modal.querySelector("#cs-manual-cancel-btn")?.addEventListener("click", closeModal);
    const importInput = modal.querySelector("#cs-manual-import-link");
    const importBtn = modal.querySelector("#cs-manual-import-btn");
    const importStatusEl = modal.querySelector("#cs-manual-import-status");
    const copyLinkBtn = modal.querySelector("#cs-manual-copy-link-btn");
    const nodeIdInput = modal.querySelector("#cs-manual-node-id");
    const nodeNameInput = modal.querySelector("#cs-manual-node-name");
    const hostInput = modal.querySelector("#cs-manual-host");
    const portInput = modal.querySelector("#cs-manual-port");
    const httpsCheckbox = modal.querySelector("#cs-manual-https");
    const rootsInput = modal.querySelector("#cs-manual-roots");
    const urlHintEl = modal.querySelector("#cs-manual-url-hint");
    const keyIdInput = modal.querySelector("#cs-manual-key-id");
    const totpSecretInput = modal.querySelector("#cs-manual-totp-secret");
    const vaultIdInput = modal.querySelector("#cs-manual-vault-id");
    const yamlPreviewEl = modal.querySelector("#cs-manual-yaml-preview");
    const totpStatusEl = modal.querySelector("#cs-manual-totp-status");
    const toggleSecretBtn = modal.querySelector("#cs-manual-toggle-secret-btn");
    const genKeyBtn = modal.querySelector("#cs-manual-gen-key-btn");
    const genSecretBtn = modal.querySelector("#cs-manual-gen-secret-btn");
    const testBtn = modal.querySelector("#cs-manual-test-btn");
    const testStatusEl = modal.querySelector("#cs-manual-test-status");
    const saveBtn = modal.querySelector("#cs-manual-save-btn");
    function updateLivePreviews() {
      const isHttps = httpsCheckbox.checked;
      const proto = isHttps ? "https" : "http";
      const host = hostInput.value.trim() || "127.0.0.1";
      const port = portInput.value.trim() || "8085";
      urlHintEl.textContent = `URL: ${proto}://${host}:${port}`;
      const currentId = nodeIdInput ? sanitizeServerId(nodeIdInput.value) : initialId;
      if (isNew && currentId && (!vaultIdInput.dataset.userEdited || vaultIdInput.value === "")) {
        vaultIdInput.value = `agent:${currentId}`;
      }
      const vaultRef = vaultIdInput.value.trim() || `agent:${currentId || "node"}`;
      yamlPreviewEl.textContent = `vault_secret: ${vaultRef}`;
      const secret = cleanBase32(totpSecretInput.value);
      if (!secret) {
        totpStatusEl.textContent = "";
      } else if (isValidBase32(secret)) {
        totpStatusEl.textContent = `\u2713 Base32 (${secret.length} \u0441\u0438\u043C\u0432.)`;
        totpStatusEl.style.color = "#10b981";
      } else {
        totpStatusEl.textContent = `\u26A0 \u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 (\u043C\u0438\u043D. 16 \u0441\u0438\u043C\u0432.)`;
        totpStatusEl.style.color = "#f59e0b";
      }
    }
    function handleImportFromLink(linkStr) {
      const raw = linkStr.trim();
      if (!raw) return false;
      try {
        const parsed = parseAgentConnectionLink(raw);
        hostInput.value = parsed.host;
        portInput.value = String(parsed.port);
        httpsCheckbox.checked = parsed.tls;
        keyIdInput.value = parsed.keyId;
        totpSecretInput.value = parsed.secret;
        if (parsed.roots && parsed.roots.length > 0) {
          rootsInput.value = parsed.roots.join(", ");
        }
        if (nodeNameInput) {
          nodeNameInput.value = parsed.nodeName;
        }
        if (nodeIdInput && isNew) {
          nodeIdInput.value = parsed.nodeId;
        }
        vaultIdInput.value = `agent:${parsed.nodeId}`;
        updateLivePreviews();
        importStatusEl.innerHTML = `<span style="color:#10b981;font-weight:600;">\u2713 \u0421\u0441\u044B\u043B\u043A\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u0430: ${escapeHtml(parsed.nodeName)} (${escapeHtml(parsed.host)}:${parsed.port})</span>`;
        showToast(`\u0421\u0441\u044B\u043B\u043A\u0430 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u0430: ${parsed.nodeName}`, "success");
        setTimeout(() => testBtn.click(), 100);
        return true;
      } catch (err) {
        importStatusEl.innerHTML = `<span style="color:#ef4444;">\u2715 \u041E\u0448\u0438\u0431\u043A\u0430 \u0438\u043C\u043F\u043E\u0440\u0442\u0430 \u0441\u0441\u044B\u043B\u043A\u0438: ${escapeHtml(err.message)}</span>`;
        return false;
      }
    }
    importBtn.addEventListener("click", () => {
      handleImportFromLink(importInput.value);
    });
    importInput.addEventListener("input", () => {
      const val = importInput.value.trim();
      if (val.startsWith("cs-agent://") || val.startsWith("csagent://") || val.startsWith("cs://agent/")) {
        handleImportFromLink(val);
      }
    });
    copyLinkBtn.addEventListener("click", async () => {
      const host = hostInput.value.trim() || "127.0.0.1";
      const port = parseInt(portInput.value.trim(), 10) || DEFAULT_AGENT_PORT;
      const isHttps = httpsCheckbox.checked;
      const keyId = keyIdInput.value.trim() || generateRandomKeyId("cs_key");
      const secret = cleanBase32(totpSecretInput.value) || "JBSWY3DPEHPK3PXP";
      const rawRoots = rootsInput.value.split(",").map((r) => r.trim()).filter(Boolean);
      const nodeName = nodeNameInput ? nodeNameInput.value.trim() : srv?.name || host;
      const nodeId = nodeIdInput ? sanitizeServerId(nodeIdInput.value) : srv?.id || "node";
      const link = formatAgentConnectionLink({
        keyId,
        secret,
        host,
        port,
        tls: isHttps,
        roots: rawRoots,
        nodeName,
        nodeId
      });
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(link);
        } else {
          const ta = document.createElement("textarea");
          ta.value = link;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        showToast("\u0421\u0441\u044B\u043B\u043A\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F cs-agent:// \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0430 \u0432 \u0431\u0443\u0444\u0435\u0440 \u043E\u0431\u043C\u0435\u043D\u0430!", "success");
        importStatusEl.innerHTML = `<span style="color:#38bdf8;">\u2713 \u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E: <code style="word-break:break-all;">${escapeHtml(link)}</code></span>`;
      } catch (err) {
        showToast(`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C: ${err.message}`, "error");
      }
    });
    hostInput.addEventListener("input", updateLivePreviews);
    portInput.addEventListener("input", updateLivePreviews);
    httpsCheckbox.addEventListener("change", updateLivePreviews);
    rootsInput.addEventListener("input", updateLivePreviews);
    nodeIdInput?.addEventListener("input", updateLivePreviews);
    totpSecretInput.addEventListener("input", updateLivePreviews);
    vaultIdInput.addEventListener("input", () => {
      vaultIdInput.dataset.userEdited = "true";
      updateLivePreviews();
    });
    let secretVisible = false;
    toggleSecretBtn.addEventListener("click", () => {
      secretVisible = !secretVisible;
      totpSecretInput.type = secretVisible ? "text" : "password";
      toggleSecretBtn.textContent = secretVisible ? "\u{1F512}" : "\u{1F441}";
    });
    genKeyBtn.addEventListener("click", () => {
      keyIdInput.value = generateRandomKeyId("cs_key");
      showToast("\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043D \u043D\u043E\u0432\u044B\u0439 Key ID (cs_key_...)", "info");
    });
    genSecretBtn.addEventListener("click", () => {
      totpSecretInput.value = generateRandomBase32(24);
      updateLivePreviews();
      showToast("\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043D \u043D\u0430\u0434\u0435\u0436\u043D\u044B\u0439 24-\u0441\u0438\u043C\u0432\u043E\u043B\u044C\u043D\u044B\u0439 Base32 \u0441\u0435\u043A\u0440\u0435\u0442", "info");
    });
    updateLivePreviews();
    testBtn.addEventListener("click", async () => {
      const host = hostInput.value.trim();
      const port = parseInt(portInput.value.trim(), 10) || DEFAULT_AGENT_PORT;
      const isHttps = httpsCheckbox.checked;
      const keyId = keyIdInput.value.trim();
      const secret = cleanBase32(totpSecretInput.value);
      if (!host) {
        testStatusEl.innerHTML = `<span style="color:#ef4444;">\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0445\u043E\u0441\u0442 \u0438\u043B\u0438 IP \u0430\u0433\u0435\u043D\u0442\u0430</span>`;
        return;
      }
      testBtn.disabled = true;
      testStatusEl.innerHTML = `<span style="color:#38bdf8;">\u23F3 \u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0441\u0432\u044F\u0437\u0438 \u0438 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F TOTP \u043A\u043E\u0434\u0430...</span>`;
      const start = performance.now();
      try {
        let otp = "";
        if (secret) {
          otp = await generateTOTPWebCrypto(secret);
        }
        const tokenHeader = otp ? `Bearer ${keyId}:${otp}` : keyId ? `Bearer ${keyId}` : "";
        const testUrl = `${isHttps ? "https" : "http"}://${host}:${port}/health`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);
        const headers = {};
        if (tokenHeader) headers["Authorization"] = tokenHeader;
        const res = await fetch(testUrl, {
          method: "GET",
          headers,
          signal: ctrl.signal
        }).catch((err) => {
          throw new Error(err.name === "AbortError" ? "\u041F\u0440\u0435\u0432\u044B\u0448\u0435\u043D \u0442\u0430\u0439\u043C\u0430\u0443\u0442 \u043E\u0442\u0432\u0435\u0442\u0430 (3.5\u0441)" : err.message);
        });
        clearTimeout(timer);
        const ms = Math.round(performance.now() - start);
        if (res.ok) {
          testStatusEl.innerHTML = `<span style="color:#10b981;font-weight:600;">\u2713 \u041E\u043D\u043B\u0430\u0439\u043D (${ms} ms)! \u0410\u0433\u0435\u043D\u0442 \u043E\u0442\u0432\u0435\u0442\u0438\u043B HTTP ${res.status}. TOTP \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430.</span>`;
        } else {
          testStatusEl.innerHTML = `<span style="color:#f59e0b;">\u26A0 \u0410\u0433\u0435\u043D\u0442 \u043E\u0442\u0432\u0435\u0442\u0438\u043B HTTP ${res.status} (${res.statusText || "\u0421\u0442\u0430\u0442\u0443\u0441 \u043D\u0435 200"}). \u0421\u0432\u044F\u0437\u044C \u0435\u0441\u0442\u044C, \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0440\u0430\u0432\u0430 \u043A\u043B\u044E\u0447\u0430.</span>`;
        }
      } catch (err) {
        testStatusEl.innerHTML = `<span style="color:#ef4444;">\u2715 \u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0432\u044F\u0437\u0438: ${escapeHtml(err.message)}</span>`;
      } finally {
        testBtn.disabled = false;
      }
    });
    saveBtn.addEventListener("click", async () => {
      const rawId = nodeIdInput ? nodeIdInput.value.trim() : initialId;
      const sanitizedId = sanitizeServerId(rawId);
      const nodeName = nodeNameInput ? nodeNameInput.value.trim() || sanitizedId : initialName || sanitizedId;
      if (!sanitizedId) {
        showToast("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 ID \u0443\u0437\u043B\u0430", "error");
        return;
      }
      const host = hostInput.value.trim();
      if (!host) {
        showToast("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0445\u043E\u0441\u0442 \u0438\u043B\u0438 IP-\u0430\u0434\u0440\u0435\u0441 \u0430\u0433\u0435\u043D\u0442\u0430", "error");
        hostInput.focus();
        return;
      }
      const port = parseInt(portInput.value.trim(), 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        showToast("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u043F\u043E\u0440\u0442 (1-65535)", "error");
        portInput.focus();
        return;
      }
      const keyId = keyIdInput.value.trim() || generateRandomKeyId("cs_key");
      const secret = cleanBase32(totpSecretInput.value);
      if (totpSecretInput.value.trim() && !isValidBase32(secret)) {
        showToast("TOTP \u0441\u0435\u043A\u0440\u0435\u0442 \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043D\u0435 \u043C\u0435\u043D\u0435\u0435 16 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 Base32 (A-Z, 2-7)", "error");
        totpSecretInput.focus();
        return;
      }
      const vaultSecretId = vaultIdInput.value.trim() || `agent:${sanitizedId}`;
      const isHttps = httpsCheckbox.checked;
      const agentUrl = `${isHttps ? "https" : "http"}://${host}:${port}`;
      const roots = rootsInput.value.split(",").map((r) => r.trim()).filter(Boolean);
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span>\u23F3 \u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u0432 Vault...</span>`;
      try {
        const credsValue = JSON.stringify({
          keyId,
          secret
        });
        await saveVaultSecret({
          id: vaultSecretId,
          title: `Agent Credentials (${nodeName})`,
          type: "agent_credentials",
          scope: "shared",
          pluginId: "servers",
          value: credsValue
        });
        const targetNode = srv ? { ...srv } : {
          id: sanitizedId,
          name: nodeName,
          group: "default",
          tags: ["agent"]
        };
        targetNode.id = sanitizedId;
        targetNode.name = nodeName;
        targetNode.connection = targetNode.connection || {};
        targetNode.connection.agent = {
          enabled: true,
          url: agentUrl,
          port,
          vaultSecret: vaultSecretId,
          tlsVerify: isHttps,
          roots
        };
        await saveServer(targetNode);
        await fleet.loadAndSyncServers();
        showToast(`\u0423\u0437\u0435\u043B ${nodeName} \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D \u0438 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D \u043A Vault!`, "success");
        onSaved?.(targetNode);
        closeModal();
      } catch (err) {
        console.error("[ManualAgentModal] Failed to save agent config:", err);
        showToast(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F: ${err.message}`, "error");
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<span>\u{1F4BE} \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C \u043A Vault</span>`;
      }
    });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // src/fleet.ts
  var FleetController = class {
    constructor() {
      __publicField(this, "totpInterval", null);
    }
    async loadAndSyncServers() {
      try {
        const serverList = await fetchServers();
        store.setServers(serverList);
        this.pingAllServers();
      } catch (err) {
        console.error("[Fleet] Failed to load servers:", err);
      }
    }
    async pingAllServers() {
      const servers = store.getServers();
      const nonLocal = servers.filter((s) => {
        if (s.id === "localhost") {
          store.setPing("localhost", { status: "online", ms: 0 });
          return false;
        }
        return true;
      });
      for (let i = 0; i < nonLocal.length; i += PING_CONCURRENCY) {
        const chunk = nonLocal.slice(i, i + PING_CONCURRENCY);
        await Promise.allSettled(
          chunk.map(async (s) => {
            try {
              const res = await pingServer(s.id);
              store.setPing(s.id, { status: res.status, ms: res.latencyMs });
            } catch (e) {
              store.setPing(s.id, { status: "offline", ms: null, error: e?.message });
            }
          })
        );
      }
    }
    async selectServer(server, protocolMode = "auto") {
      store.setActiveServerId(server.id);
      if (server.id === "localhost") {
        this.clearTotpTimer();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cs:switch-sidebar-tab", { detail: "workspaces" }));
          if (typeof window.ConfigStudio?.setRemoteEndpoint === "function") {
            window.ConfigStudio.setRemoteEndpoint(null);
          }
          if (window.ConfigStudio?.sysinfo?.setActiveNode) {
            window.ConfigStudio.sysinfo.setActiveNode("localhost", "Localhost");
          }
          if (typeof window.ConfigStudio?.refreshFiles === "function") {
            try {
              await window.ConfigStudio.refreshFiles();
            } catch (_) {
            }
          }
        }
        showToast("\u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D\u043E \u043D\u0430 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0438\u043D\u0441\u0442\u0430\u043D\u0441", "info");
        return;
      }
      const hasAgent = Boolean(server.connection?.agent?.enabled);
      const hasSSH = Boolean(server.connection?.ssh?.enabled || server.connection?.ssh?.host || server.host || server.sshHostRef);
      if (protocolMode === "agent" || protocolMode === "auto" && hasAgent) {
        await this.connectAgent(server);
      } else if (protocolMode === "sftp" || protocolMode === "auto" && hasSSH) {
        await this.openSFTP(server);
      } else {
        showToast(`\u0423\u0437\u0435\u043B ${server.name} \u0432\u044B\u0431\u0440\u0430\u043D`, "info");
      }
    }
    async connectAgent(server) {
      if (!server.connection || !server.connection.agent) return;
      const agentCfg = server.connection.agent;
      let url = agentCfg.url;
      if (!url) {
        const fallbackHost = server.connection?.ssh?.host || server.host || server.sshHostRef;
        if (fallbackHost) {
          url = `http://${fallbackHost}:${agentCfg.port || 8085}`;
        }
      }
      if (!url) {
        showToast(`URL \u0430\u0433\u0435\u043D\u0442\u0430 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0434\u043B\u044F ${server.name}`, "warning");
        return;
      }
      this.clearTotpTimer();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cs:switch-sidebar-tab", { detail: "workspaces" }));
        const initialToken = await getAgentAuthToken(server);
        if (typeof window.ConfigStudio?.setRemoteEndpoint === "function") {
          window.ConfigStudio.setRemoteEndpoint(url, initialToken);
        }
        if (window.ConfigStudio?.sysinfo?.setActiveNode) {
          window.ConfigStudio.sysinfo.setActiveNode(server.id, server.name);
        }
        this.totpInterval = setInterval(async () => {
          if (store.getActiveServerId() !== server.id) {
            this.clearTotpTimer();
            return;
          }
          try {
            const freshToken = await getAgentAuthToken(server);
            if (freshToken && typeof window.ConfigStudio?.setRemoteEndpoint === "function") {
              window.ConfigStudio.setRemoteEndpoint(url, freshToken);
            }
          } catch (err) {
            console.warn("[Fleet] TOTP interval refresh error:", err);
          }
        }, TOTP_REFRESH_INTERVAL_MS);
        if (typeof window.ConfigStudio?.refreshFiles === "function") {
          try {
            await window.ConfigStudio.refreshFiles();
          } catch (_) {
          }
        }
      }
      showToast(`\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E \u043A \u0410\u0433\u0435\u043D\u0442\u0443: ${server.name}`, "success");
    }
    async openSFTP(server) {
      const hasSSH = Boolean(server.connection?.ssh || server.host || server.sshHostRef);
      if (!hasSSH) return;
      const hostObj = syncSSHHost(server);
      this.clearTotpTimer();
      if (typeof window !== "undefined") {
        if (typeof window.ConfigStudio?.setRemoteEndpoint === "function") {
          window.ConfigStudio.setRemoteEndpoint(null);
        }
        window.dispatchEvent(new CustomEvent("cs:switch-sidebar-tab", { detail: "sftp" }));
        window.dispatchEvent(new CustomEvent("cs:open-sftp-host", { detail: hostObj || server.connection?.ssh }));
        if (typeof window.ConfigStudio?.openSftp === "function") {
          window.ConfigStudio.openSftp(hostObj || server.connection?.ssh);
        }
      }
      showToast(`\u041E\u0442\u043A\u0440\u044B\u0442 SFTP \u043F\u0440\u043E\u0432\u043E\u0434\u043D\u0438\u043A: ${server.name}`, "info");
    }
    async launchShell(server) {
      const hasSSH = Boolean(server.connection?.ssh || server.host || server.sshHostRef);
      if (!hasSSH) {
        showToast(`SSH \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D \u0434\u043B\u044F ${server.name}`, "error");
        return;
      }
      const hostObj = syncSSHHost(server);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cs:open-ssh-terminal", { detail: hostObj || server.connection?.ssh }));
        if (typeof window.ConfigStudio?.openTerminal === "function") {
          window.ConfigStudio.openTerminal(hostObj || server.connection?.ssh);
        }
      }
      showToast(`\u0417\u0430\u043F\u0443\u0441\u043A SSH \u0448\u0435\u043B\u043B\u0430 \u043A ${server.name}...`, "info");
    }
    async openManualAgentModal(server) {
      return openManualAgentModal(server);
    }
    clearTotpTimer() {
      if (this.totpInterval) {
        clearInterval(this.totpInterval);
        this.totpInterval = null;
      }
    }
  };
  var fleet = new FleetController();

  // src/ui/agentInstallModal.ts
  function openInstallAgentDialog(srv, isUpgrade = false) {
    const overlay = document.createElement("div");
    overlay.className = "cs-fleet-modal-overlay";
    const modal = document.createElement("div");
    modal.className = "cs-fleet-modal-content cs-fleet-modal-lg";
    modal.innerHTML = `
    <div class="cs-fleet-modal-header">
      <div style="display:flex;align-items:center;gap:8px;">
        <span>${ICONS.agent}</span>
        <span style="font-weight:700;font-size:14px;">${isUpgrade ? `1-Click \u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 Remote Agent \u043D\u0430 ${escapeHtml(srv.name)}` : `1-Click \u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 Remote Agent \u043D\u0430 ${escapeHtml(srv.name)}`}</span>
      </div>
      <button class="cs-fleet-modal-close">${ICONS.close}</button>
    </div>

    <div class="cs-fleet-modal-body" style="padding:16px 20px;">
      <div style="background:var(--cs-srv-bg-subtle);border:1px solid var(--cs-srv-border);border-radius:10px;padding:14px;margin-bottom:14px;font-size:12px;color:var(--cs-srv-text-primary);">
        ${isUpgrade ? `
          <div><b>\u0420\u0435\u0436\u0438\u043C:</b> <span style="font-family:monospace;color:var(--cs-srv-accent);">\u0410\u0442\u043E\u043C\u0430\u0440\u043D\u043E\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0431\u0438\u043D\u0430\u0440\u043D\u0438\u043A\u0430 (Upgrade)</span></div>
          <div style="margin-top:4px;color:var(--cs-srv-text-muted);">Config Studio \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0441\u044F \u043F\u043E SSH \u043A <span style="font-family:monospace;color:var(--cs-srv-accent);">${escapeHtml(
      srv.connection?.ssh?.user || srv.user || "root"
    )}@${escapeHtml(srv.connection?.ssh?.host || srv.host || "")}:${srv.connection?.ssh?.port || srv.port || 22}</span>, \u0441\u043E\u0437\u0434\u0430\u0441\u0442 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u0443\u044E \u043A\u043E\u043F\u0438\u044E \u0431\u0438\u043D\u0430\u0440\u043D\u0438\u043A\u0430 (.bak), \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442 \u043D\u043E\u0432\u0443\u044E \u0432\u0435\u0440\u0441\u0438\u044E, \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442 \u0442\u0435\u043A\u0443\u0449\u0438\u0435 \u043A\u043B\u044E\u0447\u0438 TOTP/Vault \u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442 \u0441\u043B\u0443\u0436\u0431\u0443 \u0430\u0433\u0435\u043D\u0442\u0430.</div>
        ` : `
          <div><b>\u0426\u0435\u043B\u0435\u0432\u043E\u0439 SSH \u0441\u0435\u0440\u0432\u0435\u0440:</b> <span style="font-family:monospace;color:var(--cs-srv-accent);">${escapeHtml(
      srv.connection?.ssh?.user || srv.user || "root"
    )}@${escapeHtml(srv.connection?.ssh?.host || srv.host || "")}:${srv.connection?.ssh?.port || srv.port || 22}</span></div>
          <div style="margin-top:4px;color:var(--cs-srv-text-muted);">Config Studio \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0441\u044F \u043F\u043E SSH, \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442 \u0430\u0440\u0445\u0438\u0442\u0435\u043A\u0442\u0443\u0440\u0443 (Linux x86_64/arm64), \u0441\u043A\u043E\u043F\u0438\u0440\u0443\u0435\u0442 \u0431\u0438\u043D\u0430\u0440\u043D\u0438\u043A \u043F\u043E SFTP, \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0435\u0442 \u0438 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442 \u0441\u043B\u0443\u0436\u0431\u0443 \u0434\u0435\u043C\u043E\u043D\u0430 (systemd/OpenRC) \u0438 \u043F\u0435\u0440\u0435\u0432\u0435\u0434\u0435\u0442 \u0443\u0437\u0435\u043B \u0432 \u0433\u0438\u0431\u0440\u0438\u0434\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C.</div>
        `}
      </div>

      <div class="cs-fleet-form-grid" style="margin-bottom:12px;">
        <div class="cs-fleet-form-group">
          <label class="cs-fleet-form-label">\u041F\u043E\u0440\u0442 \u0430\u0433\u0435\u043D\u0442\u0430</label>
          <input type="number" id="cs-install-port" class="cs-fleet-form-input" value="${srv.connection?.agent?.port || 8085}" />
        </div>
        <div class="cs-fleet-form-group">
          <label class="cs-fleet-form-label">\u0421\u0438\u0441\u0442\u0435\u043C\u0430 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438</label>
          <div id="cs-install-service-type-container"></div>
        </div>
      </div>

      <div class="cs-fleet-checkbox-row" style="margin-bottom:10px;">
        <input type="checkbox" id="cs-install-sudo" checked />
        <label for="cs-install-sudo">\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C sudo \u0434\u043B\u044F \u043F\u0440\u0438\u0432\u0438\u043B\u0435\u0433\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u043A\u043E\u043C\u0430\u043D\u0434</label>
      </div>

      <div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.02);border:1px solid var(--cs-srv-border);border-radius:8px;padding:8px 12px;font-size:11.5px;">
        <span style="color:var(--cs-srv-text-muted);">\u0410\u0433\u0435\u043D\u0442 \u0443\u0436\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D \u0438\u043B\u0438 \u043D\u0435\u0442 \u043F\u0440\u044F\u043C\u043E\u0433\u043E SSH-\u0434\u043E\u0441\u0442\u0443\u043F\u0430?</span>
        <button type="button" id="cs-install-manual-btn" style="background:none;border:none;color:#38bdf8;cursor:pointer;padding:0;text-decoration:underline;font-size:11.5px;display:inline-flex;align-items:center;gap:4px;">
          <span>\u0420\u0443\u0447\u043D\u0430\u044F \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 (IP, \u043F\u043E\u0440\u0442, TOTP) \u2192</span>
        </button>
      </div>

      <!-- Terminal Logs Window -->
      <div id="cs-install-terminal" style="background:var(--cs-srv-bg-base);border:1px solid var(--cs-srv-border);border-radius:8px;padding:12px;font-family:monospace;font-size:11px;min-height:160px;max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;color:var(--cs-srv-accent);">
        <div style="color:var(--cs-srv-text-muted);">${isUpgrade ? "[\u0413\u043E\u0442\u043E\u0432 \u043A \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044E] \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0430\u0433\u0435\u043D\u0442\xBB..." : "[\u0413\u043E\u0442\u043E\u0432 \u043A \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0435] \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041D\u0430\u0447\u0430\u0442\u044C \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0443\xBB..."}</div>
      </div>
    </div>

    <div class="cs-fleet-modal-footer">
      <div></div>
      <div style="display:flex;gap:8px;">
        <button class="cs-fleet-btn-secondary" id="cs-install-cancel-btn">\u0417\u0430\u043A\u0440\u044B\u0442\u044C</button>
        <button class="cs-fleet-btn-primary" id="cs-install-run-btn" style="display:inline-flex;align-items:center;gap:6px;">
          ${ICONS.agent} <span>${isUpgrade ? "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0430\u0433\u0435\u043D\u0442" : "\u041D\u0430\u0447\u0430\u0442\u044C \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0443"}</span>
        </button>
      </div>
    </div>
  `;
    const serviceTypeContainer = modal.querySelector("#cs-install-service-type-container");
    let serviceTypeDropdown = null;
    if (serviceTypeContainer) {
      const svcOptions = [
        { value: "auto", label: "\u0410\u0432\u0442\u043E\u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 (systemd / OpenRC)", subtitle: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0432\u044B\u0431\u043E\u0440", badge: "AUTO", badgeColor: "blue" },
        { value: "systemd", label: "systemd (/etc/systemd/system)", subtitle: "Debian, Ubuntu, RHEL, CentOS, Fedora", badge: "LINUX", badgeColor: "purple" },
        { value: "openrc", label: "OpenRC (/etc/init.d)", subtitle: "Alpine Linux, Gentoo", badge: "ALPINE", badgeColor: "green" },
        { value: "none", label: "\u0411\u0435\u0437 \u0441\u043B\u0443\u0436\u0431\u044B (nohup \u0444\u043E\u043D\u043E\u0432\u044B\u0439 \u043F\u0440\u043E\u0446\u0435\u0441\u0441)", subtitle: "\u0412\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0439 \u0437\u0430\u043F\u0443\u0441\u043A \u0431\u0435\u0437 \u0430\u0432\u0442\u043E\u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438", badge: "NOHUP", badgeColor: "amber" }
      ];
      if (window.ConfigStudio?.ui?.renderDropdown) {
        serviceTypeDropdown = window.ConfigStudio.ui.renderDropdown(serviceTypeContainer, {
          options: svcOptions,
          value: "auto",
          placeholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0438\u043F \u0441\u043B\u0443\u0436\u0431\u044B..."
        });
      } else {
        serviceTypeContainer.innerHTML = `
        <select id="cs-install-service-type" class="cs-fleet-form-select">
          <option value="auto">\u0410\u0432\u0442\u043E\u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 (systemd / OpenRC)</option>
          <option value="systemd">systemd (/etc/systemd/system)</option>
          <option value="openrc">OpenRC (/etc/init.d)</option>
          <option value="none">\u0411\u0435\u0437 \u0441\u043B\u0443\u0436\u0431\u044B (nohup)</option>
        </select>
      `;
      }
    }
    function closeModal() {
      try {
        serviceTypeDropdown?.destroy();
      } catch (_) {
      }
      overlay.remove();
    }
    modal.querySelector(".cs-fleet-modal-close")?.addEventListener("click", closeModal);
    modal.querySelector("#cs-install-cancel-btn")?.addEventListener("click", closeModal);
    modal.querySelector("#cs-install-manual-btn")?.addEventListener("click", () => {
      closeModal();
      openManualAgentModal(srv);
    });
    const runBtn = modal.querySelector("#cs-install-run-btn");
    const termEl = modal.querySelector("#cs-install-terminal");
    const portInput = modal.querySelector("#cs-install-port");
    const sudoInput = modal.querySelector("#cs-install-sudo");
    const svcSelect = modal.querySelector("#cs-install-service-type");
    runBtn?.addEventListener("click", async () => {
      const customPort = parseInt(portInput.value, 10) || 8085;
      const useSudo = sudoInput ? sudoInput.checked : true;
      const serviceType = serviceTypeDropdown?.getValue ? serviceTypeDropdown.getValue() : svcSelect ? svcSelect.value : "auto";
      runBtn.disabled = true;
      runBtn.innerHTML = `<span>\u23F3 ${isUpgrade ? "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435..." : "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430..."}</span>`;
      termEl.innerHTML = `<div style="color:#e2e8f0;">[1/6] \u0417\u0430\u043F\u0443\u0441\u043A \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0430 ${isUpgrade ? "\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F" : "\u0440\u0430\u0437\u0432\u0435\u0440\u0442\u044B\u0432\u0430\u043D\u0438\u044F"} \u043D\u0430 ${escapeHtml(
        srv.connection?.ssh?.host || srv.host || ""
      )}...</div>`;
      try {
        const res = await installAgent(srv.id, {
          port: customPort,
          useSudo,
          serviceType,
          upgradeOnly: isUpgrade
        });
        if (res.logs && res.logs.length > 0) {
          termEl.innerHTML = res.logs.map((line) => {
            const isSuccess = line.startsWith("\u2713");
            const isErr = line.toLowerCase().includes("\u043E\u0448\u0438\u0431\u043A\u0430") || line.toLowerCase().includes("error");
            const color = isSuccess ? "#34d399" : isErr ? "#f87171" : "#a5f3fc";
            return `<div style="color:${color};margin-bottom:2px;">${escapeHtml(line)}</div>`;
          }).join("");
        }
        if (res.success) {
          termEl.innerHTML += `<div style="color:#10b981;font-weight:700;margin-top:6px;">\u0423\u0441\u043F\u0435\u0448\u043D\u043E! \u0414\u0435\u043C\u043E\u043D \u0430\u043A\u0442\u0438\u0432\u0435\u043D \u043D\u0430 ${escapeHtml(
            res.agentUrl
          )}. ${isUpgrade ? "\u0410\u0433\u0435\u043D\u0442 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D!" : "\u0423\u0437\u0435\u043B \u043F\u0435\u0440\u0435\u0432\u0435\u0434\u0435\u043D \u0432 \u0433\u0438\u0431\u0440\u0438\u0434\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C!"}</div>`;
          runBtn.innerHTML = `<span>\u0413\u043E\u0442\u043E\u0432\u043E</span>`;
          showToast(
            isUpgrade ? `\u0410\u0433\u0435\u043D\u0442 \u043D\u0430 ${srv.name} \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D!` : `\u0410\u0433\u0435\u043D\u0442 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D \u043D\u0430 ${srv.name}!`,
            "success"
          );
          await fleet.loadAndSyncServers();
          setTimeout(closeModal, 1800);
        } else {
          throw new Error(res.error || "\u0421\u0431\u043E\u0439 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438 \u0430\u0433\u0435\u043D\u0442\u0430");
        }
      } catch (err) {
        termEl.innerHTML += `<div style="color:#ef4444;font-weight:700;margin-top:6px;">\u041E\u0448\u0438\u0431\u043A\u0430: ${escapeHtml(err.message)}</div>`;
        runBtn.disabled = false;
        runBtn.innerHTML = `<span>\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C</span>`;
        showToast(`\u041E\u0448\u0438\u0431\u043A\u0430: ${err.message}`, "error");
      }
    });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // src/ui/editServerModal.ts
  async function openEditModal(server) {
    const isNew = !server;
    const srv = isNew ? {
      id: "",
      name: "",
      group: "default",
      tags: [],
      sshHostRef: "",
      connection: {
        agent: { enabled: false, port: 8085 }
      },
      rollout: { canary: false, order: 10 }
    } : JSON.parse(JSON.stringify(server));
    srv.connection = srv.connection || {};
    srv.connection.agent = srv.connection.agent || { enabled: false, port: 8085 };
    srv.rollout = srv.rollout || { canary: false, order: 10 };
    const coreHosts = await fetchCoreHosts();
    if (!srv.sshHostRef) {
      const targetHost = srv.host || srv.connection?.ssh?.host;
      if (targetHost) {
        const found = coreHosts.find((h) => h.host === targetHost || h.address === targetHost || h.id === srv.id);
        if (found) srv.sshHostRef = found.id;
      }
    }
    const vaultSecrets = await fetchVaultSecrets();
    const overlay = document.createElement("div");
    overlay.className = "cs-fleet-modal-overlay";
    const modal = document.createElement("div");
    modal.className = "cs-fleet-modal-content cs-fleet-modal-md";
    let activeDropdownControllers = [];
    modal.innerHTML = `
    <div class="cs-fleet-modal-header">
      <div style="display:flex;align-items:center;gap:8px;">
        ${ICONS.server}
        <span style="font-weight:700;font-size:14px;">${isNew ? "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0443\u0437\u0435\u043B \u0432\u043E \u0444\u043B\u043E\u0442" : `\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u0443\u0437\u043B\u0430: ${escapeHtml(srv.name || srv.id)}`}</span>
      </div>
      <button class="cs-fleet-modal-close">${ICONS.close}</button>
    </div>

    <div class="cs-fleet-modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px;">
      <div id="cs-fleet-validation-error"></div>

      ${isNew ? `
        <div class="cs-fleet-form-group">
          <label class="cs-fleet-form-label">SSH-\u0445\u043E\u0441\u0442 \u0438\u0437 \u0431\u0430\u0437\u044B \u044F\u0434\u0440\u0430 *</label>
          <div id="srv-host-picker-container"></div>
          <div id="srv-host-preview" style="display:none;margin-top:8px;"></div>
        </div>
      ` : `
        <div class="cs-fleet-form-group">
          <label class="cs-fleet-form-label">\u041F\u0440\u0438\u0432\u044F\u0437\u043A\u0430 \u043A \u0445\u043E\u0441\u0442\u0443 \u044F\u0434\u0440\u0430</label>
          ${srv.sshHostRef ? `
            <div class="cs-fleet-core-host-pill" style="display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span>\u{1F5A5}\uFE0F</span>
                <span style="font-weight:600;">${escapeHtml(srv.sshHostRef)}</span>
                <span style="color:var(--cs-srv-text-muted);font-size:11px;">(${escapeHtml(srv.host || srv.connection?.ssh?.host || "")}:${srv.port || srv.connection?.ssh?.port || 22})</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span class="cs-fleet-badge hybrid" style="font-size:9px;">\u042F\u0414\u0420\u041E</span>
                <button type="button" class="cs-fleet-btn-secondary" id="srv-rebind-host-btn" style="padding:2px 8px;font-size:10px;">\u0421\u043C\u0435\u043D\u0438\u0442\u044C</button>
              </div>
            </div>
            <div id="srv-host-picker-container" style="display:none;margin-top:8px;"></div>
            <div id="srv-host-preview" style="display:none;margin-top:8px;"></div>
          ` : `
            <div id="srv-host-picker-container"></div>
            <div id="srv-host-preview" style="display:none;margin-top:8px;"></div>
          `}
        </div>
      `}

      <div id="srv-manual-ssh-container" style="display:none;background:rgba(255,255,255,0.02);border:1px solid var(--cs-srv-border);border-radius:8px;padding:12px;">
        <div style="font-size:11.5px;font-weight:600;margin-bottom:10px;color:var(--cs-srv-text-primary);display:flex;align-items:center;gap:6px;">
          <span>\u{1F511}</span>
          <span>\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u043F\u0440\u044F\u043C\u043E\u0433\u043E \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F SSH</span>
        </div>
        <div class="cs-fleet-form-grid" style="grid-template-columns: minmax(0, 2fr) 90px minmax(0, 1fr); gap: 10px;">
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">\u0425\u043E\u0441\u0442 / IP *</label>
            <input type="text" class="cs-fleet-form-input" id="srv-manual-host" value="${escapeHtml(srv.host || srv.connection?.ssh?.host || "")}" placeholder="192.168.1.100" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">\u041F\u043E\u0440\u0442</label>
            <input type="number" class="cs-fleet-form-input" id="srv-manual-port" value="${srv.port || srv.connection?.ssh?.port || 22}" placeholder="22" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C</label>
            <input type="text" class="cs-fleet-form-input" id="srv-manual-user" value="${escapeHtml(srv.user || srv.connection?.ssh?.user || "root")}" placeholder="root" />
          </div>
        </div>
        <div class="cs-fleet-form-group" style="margin-top:10px;">
          <label class="cs-fleet-form-label">SSH-\u043A\u043B\u044E\u0447 \u0438\u0437 Vault</label>
          <div id="srv-manual-secret-container"></div>
        </div>
        <div class="cs-fleet-checkbox-row" style="margin-top:8px;margin-bottom:0;">
          <input type="checkbox" id="srv-manual-save-core" checked />
          <label for="srv-manual-save-core" style="font-size:11px;cursor:pointer;">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u044D\u0442\u043E\u0442 \u0445\u043E\u0441\u0442 \u0432 \u043E\u0431\u0449\u0443\u044E \u0431\u0430\u0437\u0443 SSH \u044F\u0434\u0440\u0430 (/api/hosts)</label>
        </div>
      </div>

      <div class="cs-fleet-form-grid" style="grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px;">
        <div class="cs-fleet-form-group">
          <label class="cs-fleet-form-label">ID \u0443\u0437\u043B\u0430 *</label>
          <input type="text" class="cs-fleet-form-input" id="srv-id" value="${escapeHtml(srv.id || "")}" ${!isNew ? "disabled" : ""} placeholder="alpine-01" />
        </div>
        <div class="cs-fleet-form-group">
          <label class="cs-fleet-form-label">\u0418\u043C\u044F \u0443\u0437\u043B\u0430</label>
          <input type="text" class="cs-fleet-form-input" id="srv-name" value="${escapeHtml(srv.name || "")}" placeholder="Production VPS" />
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--cs-srv-border);border-radius:10px;padding:14px;">
        <div class="cs-fleet-checkbox-row" style="margin-bottom:0;">
          <input type="checkbox" id="srv-agent-enabled" ${srv.connection?.agent?.enabled ? "checked" : ""} />
          <label for="srv-agent-enabled" style="font-weight:600;font-size:12px;cursor:pointer;">\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C Remote Agent</label>
        </div>
        <div id="srv-agent-details" style="${srv.connection?.agent?.enabled ? "display:flex;" : "display:none;"}margin-top:12px;flex-direction:column;gap:12px;">
          <div class="cs-fleet-form-grid" style="grid-template-columns: 130px minmax(0, 1fr); gap: 12px; align-items: start;">
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label" style="white-space: nowrap;">\u041F\u043E\u0440\u0442 \u0430\u0433\u0435\u043D\u0442\u0430</label>
              <input type="number" class="cs-fleet-form-input" id="srv-agent-port" min="1" max="65535" value="${srv.connection?.agent?.port || 8085}" style="min-width:0;box-sizing:border-box;font-family:monospace;" />
            </div>
            <div class="cs-fleet-form-group" style="min-width:0;">
              <label class="cs-fleet-form-label">\u0421\u0435\u043A\u0440\u0435\u0442 Vault (TOTP)</label>
              <div id="srv-agent-secret-container"></div>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:2px;">
            <div class="cs-fleet-form-help" id="srv-agent-url-hint" style="color:#38bdf8;margin:0;font-size:11.5px;">
              \u0414\u0438\u043D\u0430\u043C\u0438\u0447\u0435\u0441\u043A\u0438\u0439 URL: http://{host}:${srv.connection?.agent?.port || 8085}
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <button type="button" class="cs-fleet-btn-secondary" id="cs-modal-manual-agent-btn" style="padding:5px 12px;font-size:11.5px;display:inline-flex;align-items:center;gap:6px;" title="\u0420\u0443\u0447\u043D\u0430\u044F \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 IP, \u043F\u043E\u0440\u0442\u0430, API Key \u0438 TOTP \u0441\u0435\u043A\u0440\u0435\u0442\u0430">
                ${ICONS.key} <span>\u0420\u0443\u0447\u043D\u0430\u044F \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430...</span>
              </button>
              ${!isNew && (srv.sshHostRef || srv.connection?.ssh?.host) ? `
                <button type="button" class="cs-fleet-btn-secondary" id="cs-modal-install-agent-btn" style="padding:5px 12px;font-size:11.5px;display:inline-flex;align-items:center;gap:6px;">
                  ${ICONS.agent} <span>1-Click \u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0430\u0433\u0435\u043D\u0442</span>
                </button>
              ` : ""}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="cs-fleet-collapsible-header" id="srv-extra-toggle">
          <span>\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B (\u0433\u0440\u0443\u043F\u043F\u0430, \u0442\u0435\u0433\u0438)</span>
          <span id="srv-extra-arrow">\u25BE</span>
        </div>
        <div id="srv-extra-content" style="display:none;margin-top:10px;flex-direction:column;gap:12px;">
          <div class="cs-fleet-form-grid" style="grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px;">
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">\u0413\u0440\u0443\u043F\u043F\u0430 / \u041E\u043A\u0440\u0443\u0436\u0435\u043D\u0438\u0435</label>
              <input type="text" class="cs-fleet-form-input" id="srv-group" value="${escapeHtml(srv.group || "default")}" placeholder="production" />
            </div>
            <div class="cs-fleet-form-group">
              <label class="cs-fleet-form-label">\u0422\u0435\u0433\u0438 (\u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E)</label>
              <input type="text" class="cs-fleet-form-input" id="srv-tags" value="${escapeHtml((srv.tags || []).join(", "))}" placeholder="linux, web" />
            </div>
          </div>
          <div class="cs-fleet-checkbox-row">
            <input type="checkbox" id="srv-rollout-canary" ${srv.rollout?.canary ? "checked" : ""} />
            <label for="srv-rollout-canary" style="font-size:11px;cursor:pointer;">\u041A\u0430\u043D\u0430\u0440\u0435\u0435\u0447\u043D\u044B\u0439 \u0443\u0437\u0435\u043B (Canary: \u043F\u0435\u0440\u0432\u044B\u043C \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 \u043A\u043E\u043D\u0444\u0438\u0433\u0438)</label>
          </div>
        </div>
      </div>
    </div>

    <div class="cs-fleet-modal-footer">
      <div>
        ${!isNew && srv.id !== "localhost" ? '<button class="cs-fleet-btn-danger" id="cs-fleet-delete-btn">\u0423\u0434\u0430\u043B\u0438\u0442\u044C</button>' : ""}
      </div>
      <div style="display:flex;gap:8px;">
        <button class="cs-fleet-btn-secondary" id="cs-fleet-cancel-btn">\u041E\u0442\u043C\u0435\u043D\u0430</button>
        <button class="cs-fleet-btn-primary" id="cs-fleet-save-btn">${isNew ? "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0443\u0437\u0435\u043B" : "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"}</button>
      </div>
    </div>
  `;
    const hostPickerContainer = modal.querySelector("#srv-host-picker-container");
    const hostPreview = modal.querySelector("#srv-host-preview");
    const manualContainer = modal.querySelector("#srv-manual-ssh-container");
    const rebindBtn = modal.querySelector("#srv-rebind-host-btn");
    if (rebindBtn && hostPickerContainer) {
      rebindBtn.addEventListener("click", () => {
        const pill = rebindBtn.closest(".cs-fleet-core-host-pill");
        if (pill) pill.style.display = "none";
        hostPickerContainer.style.display = "block";
      });
    }
    let manualSecretVal = srv.identity || srv.connection?.ssh?.identity || "";
    const manualSecretContainer = modal.querySelector("#srv-manual-secret-container");
    if (manualSecretContainer) {
      const sshSecretOptions = [
        { value: "", label: "-- \u0411\u0435\u0437 \u043A\u043B\u044E\u0447\u0430 (\u043F\u0430\u0440\u043E\u043B\u044C / \u0430\u0433\u0435\u043D\u0442) --", badge: "AUTH", badgeColor: "default" },
        ...vaultSecrets.map((s) => ({
          value: s.id,
          label: s.title || s.id,
          subtitle: s.type || "secret",
          badge: (s.type || "VAULT").toUpperCase(),
          badgeColor: s.type?.includes("ssh") || s.type?.includes("key") ? "blue" : "default"
        }))
      ];
      if (window.ConfigStudio?.ui?.renderDropdown) {
        const mCtrl = window.ConfigStudio.ui.renderDropdown(manualSecretContainer, {
          options: sshSecretOptions,
          value: manualSecretVal,
          placeholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 SSH-\u043A\u043B\u044E\u0447 \u0438\u0437 Vault...",
          onChange: (val) => {
            manualSecretVal = val;
          }
        });
        activeDropdownControllers.push(mCtrl);
      }
    }
    if (!isNew && !srv.sshHostRef && (srv.host || srv.connection?.ssh?.host)) {
      if (manualContainer) manualContainer.style.display = "block";
    }
    if (hostPickerContainer) {
      const options = [
        {
          value: "",
          label: "-- \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0445\u043E\u0441\u0442 \u0438\u0437 \u0431\u0430\u0437\u044B \u044F\u0434\u0440\u0430 --",
          subtitle: coreHosts.length > 0 ? `\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0432 \u044F\u0434\u0440\u0435: ${coreHosts.length} \u0445\u043E\u0441\u0442(\u043E\u0432)` : "\u0412 \u0431\u0430\u0437\u0435 \u044F\u0434\u0440\u0430 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0445\u043E\u0441\u0442\u043E\u0432",
          badge: "CORE",
          badgeColor: "default"
        },
        ...coreHosts.map((h) => {
          const hostAddr = h.host || h.address || "";
          const hostUser = h.user || h.username || "root";
          const hostPort = h.port || 22;
          const labelTitle = h.name ? `${h.name} (${h.id})` : h.id;
          return {
            value: h.id,
            label: labelTitle,
            subtitle: `${hostUser}@${hostAddr}:${hostPort}`,
            badge: (h.group || "SSH").toUpperCase(),
            badgeColor: "blue",
            statusDot: "online"
          };
        }),
        {
          value: "__manual__",
          label: "+ \u0412\u0432\u0435\u0441\u0442\u0438 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B SSH \u0432\u0440\u0443\u0447\u043D\u0443\u044E",
          subtitle: "\u0423\u043A\u0430\u0437\u0430\u0442\u044C IP, \u043F\u043E\u0440\u0442 \u0438 \u043A\u043B\u044E\u0447 \u0431\u0435\u0437 \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438",
          badge: "MANUAL",
          badgeColor: "default"
        }
      ];
      const onHostChange = (val) => {
        if (!val) {
          if (hostPreview) hostPreview.style.display = "none";
          if (manualContainer) manualContainer.style.display = "none";
          srv.sshHostRef = "";
          return;
        }
        if (val === "__manual__") {
          if (hostPreview) hostPreview.style.display = "none";
          if (manualContainer) manualContainer.style.display = "block";
          srv.sshHostRef = "";
          return;
        }
        if (manualContainer) manualContainer.style.display = "none";
        const selected = coreHosts.find((h) => h.id === val);
        if (selected) {
          srv.sshHostRef = selected.id;
          const hostAddr = selected.host || selected.address || "";
          const hostUser = selected.user || selected.username || "root";
          const hostPort = selected.port || 22;
          if (isNew) {
            const idInput = modal.querySelector("#srv-id");
            const nameInput = modal.querySelector("#srv-name");
            const groupInput = modal.querySelector("#srv-group");
            const tagsInput = modal.querySelector("#srv-tags");
            const defaultId = (selected.name || selected.id).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
            if (idInput && (!idInput.value || idInput.value === "alpine-01")) {
              idInput.value = defaultId;
            }
            if (nameInput && (!nameInput.value || nameInput.value === "Production VPS")) {
              nameInput.value = selected.name || selected.id;
            }
            if (groupInput && (!groupInput.value || groupInput.value === "default")) {
              groupInput.value = selected.group || "default";
            }
            if (tagsInput && !tagsInput.value && selected.tags) {
              tagsInput.value = selected.tags.join(", ");
            }
            srv.id = idInput ? idInput.value : defaultId;
            srv.name = nameInput ? nameInput.value : selected.name || selected.id;
          }
          if (hostPreview) {
            hostPreview.style.display = "block";
            hostPreview.innerHTML = `
            <div class="cs-fleet-core-host-pill" style="margin-top:8px;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span>\u{1F5A5}\uFE0F</span>
                <span style="font-weight:600;">${escapeHtml(hostUser)}@${escapeHtml(hostAddr)}:${hostPort}</span>
              </div>
              <span class="cs-fleet-badge hybrid" style="font-size:9px;">\u042F\u0414\u0420\u041E</span>
            </div>
          `;
          }
          const urlHint = modal.querySelector("#srv-agent-url-hint");
          const portVal = modal.querySelector("#srv-agent-port")?.value || 8085;
          if (urlHint && hostAddr) {
            urlHint.textContent = `\u0414\u0438\u043D\u0430\u043C\u0438\u0447\u0435\u0441\u043A\u0438\u0439 URL: http://${hostAddr}:${portVal}`;
          }
        }
      };
      if (window.ConfigStudio?.ui?.renderDropdown) {
        const ctrl = window.ConfigStudio.ui.renderDropdown(hostPickerContainer, {
          options,
          value: srv.sshHostRef || "",
          placeholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0445\u043E\u0441\u0442 \u0438\u0437 \u044F\u0434\u0440\u0430...",
          searchable: options.length > 4,
          searchPlaceholder: "\u041F\u043E\u0438\u0441\u043A \u0445\u043E\u0441\u0442\u0430...",
          onChange: onHostChange
        });
        activeDropdownControllers.push(ctrl);
      } else {
        hostPickerContainer.innerHTML = `
        <select class="cs-fleet-form-select" id="srv-host-select">
          ${options.map((o) => `<option value="${escapeHtml(o.value)}" ${srv.sshHostRef === o.value ? "selected" : ""}>${escapeHtml(o.label)} ${o.subtitle ? `\u2014 ${escapeHtml(o.subtitle)}` : ""}</option>`).join("")}
        </select>
      `;
        const sel = hostPickerContainer.querySelector("#srv-host-select");
        sel.addEventListener("change", (e) => onHostChange(e.target.value));
      }
      if (srv.sshHostRef) {
        onHostChange(srv.sshHostRef);
      }
    }
    const agentCheckbox = modal.querySelector("#srv-agent-enabled");
    const agentDetails = modal.querySelector("#srv-agent-details");
    if (agentCheckbox && agentDetails) {
      agentCheckbox.addEventListener("change", () => {
        agentDetails.style.display = agentCheckbox.checked ? "flex" : "none";
      });
    }
    const secretContainer = modal.querySelector("#srv-agent-secret-container");
    if (secretContainer) {
      const sortedSecrets = [...vaultSecrets].sort((a, b) => {
        const aIsAgent = a.type === "agent_credentials" || a.id && a.id.startsWith("agent:");
        const bIsAgent = b.type === "agent_credentials" || b.id && b.id.startsWith("agent:");
        if (aIsAgent && !bIsAgent) return -1;
        if (!aIsAgent && bIsAgent) return 1;
        return (a.title || a.id).localeCompare(b.title || b.id);
      });
      const secOptions = [
        {
          value: "",
          label: "(\u0411\u0435\u0437 Vault \u0441\u0435\u043A\u0440\u0435\u0442\u0430)",
          subtitle: "\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439 \u0438\u043B\u0438 \u0440\u0443\u0447\u043D\u043E\u0439 \u0442\u043E\u043A\u0435\u043D",
          badge: "NONE",
          badgeColor: "default"
        },
        ...sortedSecrets.map((v) => {
          const isAgent = v.type === "agent_credentials" || v.id && v.id.startsWith("agent:");
          return {
            value: v.id,
            label: v.title || v.id,
            subtitle: `ID: ${v.id}`,
            badge: isAgent ? "AGENT" : (v.type || "secret").toUpperCase(),
            badgeColor: isAgent ? "cyan" : v.type === "token" ? "purple" : v.type === "password" ? "green" : "blue",
            statusDot: "online"
          };
        })
      ];
      const agentSecret = srv.connection?.agent?.vaultSecret || srv.connection?.agent?.secretRef || (vaultSecrets.find((v) => v.id === `agent:${srv.id}`) ? `agent:${srv.id}` : "");
      if (window.ConfigStudio?.ui?.renderDropdown) {
        const ctrl = window.ConfigStudio.ui.renderDropdown(secretContainer, {
          options: secOptions,
          value: agentSecret,
          placeholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0435\u043A\u0440\u0435\u0442 \u0438\u0437 Vault...",
          searchable: secOptions.length > 5,
          searchPlaceholder: "\u041F\u043E\u0438\u0441\u043A \u0441\u0435\u043A\u0440\u0435\u0442\u0430...",
          onChange: (val) => {
            srv.connection = srv.connection || {};
            srv.connection.agent = srv.connection.agent || {};
            srv.connection.agent.vaultSecret = val || "";
            delete srv.connection.agent.secretRef;
          }
        });
        activeDropdownControllers.push(ctrl);
      } else {
        secretContainer.innerHTML = `
        <select class="cs-fleet-form-select" id="srv-agent-secret">
          ${secOptions.map((v) => `<option value="${escapeHtml(v.value)}" ${agentSecret === v.value ? "selected" : ""}>${escapeHtml(v.label)}</option>`).join("")}
        </select>
      `;
        const sel = secretContainer.querySelector("#srv-agent-secret");
        sel.addEventListener("change", (e) => {
          srv.connection = srv.connection || {};
          srv.connection.agent = srv.connection.agent || {};
          srv.connection.agent.vaultSecret = e.target.value || "";
          delete srv.connection.agent.secretRef;
        });
      }
    }
    const manualAgentBtn = modal.querySelector("#cs-modal-manual-agent-btn");
    if (manualAgentBtn) {
      manualAgentBtn.addEventListener("click", () => {
        closeModal();
        openManualAgentModal(srv);
      });
    }
    const instBtn = modal.querySelector("#cs-modal-install-agent-btn");
    if (instBtn) {
      instBtn.addEventListener("click", () => {
        closeModal();
        openInstallAgentDialog(srv);
      });
    }
    const extraToggle = modal.querySelector("#srv-extra-toggle");
    const extraContent = modal.querySelector("#srv-extra-content");
    const extraArrow = modal.querySelector("#srv-extra-arrow");
    if (extraToggle && extraContent) {
      let isExtraOpen = false;
      extraToggle.addEventListener("click", () => {
        isExtraOpen = !isExtraOpen;
        extraContent.style.display = isExtraOpen ? "flex" : "none";
        if (extraArrow) extraArrow.textContent = isExtraOpen ? "\u25B4" : "\u25BE";
      });
    }
    function closeModal() {
      activeDropdownControllers.forEach((c) => {
        try {
          c.destroy();
        } catch (_) {
        }
      });
      activeDropdownControllers = [];
      overlay.remove();
    }
    modal.querySelector(".cs-fleet-modal-close")?.addEventListener("click", closeModal);
    modal.querySelector("#cs-fleet-cancel-btn")?.addEventListener("click", closeModal);
    modal.querySelector("#cs-fleet-save-btn")?.addEventListener("click", async () => {
      const idInput = modal.querySelector("#srv-id");
      const nameInput = modal.querySelector("#srv-name");
      const groupInput = modal.querySelector("#srv-group");
      const tagsInput = modal.querySelector("#srv-tags");
      const agentEnabled = modal.querySelector("#srv-agent-enabled")?.checked || false;
      const agentPort = parseInt(modal.querySelector("#srv-agent-port")?.value, 10) || 8085;
      const canaryChecked = modal.querySelector("#srv-rollout-canary")?.checked || false;
      if (idInput && isNew) srv.id = idInput.value.trim();
      if (nameInput) srv.name = nameInput.value.trim();
      if (groupInput) srv.group = groupInput.value.trim() || "default";
      if (tagsInput) {
        srv.tags = tagsInput.value.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
      }
      srv.connection = srv.connection || {};
      srv.connection.agent = srv.connection.agent || {};
      srv.connection.agent.enabled = agentEnabled;
      srv.connection.agent.port = agentPort;
      srv.rollout = srv.rollout || {};
      srv.rollout.canary = canaryChecked;
      const isManual = modal.querySelector("#srv-manual-ssh-container")?.style.display === "block";
      if (isManual) {
        const mHost = modal.querySelector("#srv-manual-host")?.value.trim();
        const mPort = parseInt(modal.querySelector("#srv-manual-port")?.value, 10) || 22;
        const mUser = modal.querySelector("#srv-manual-user")?.value.trim() || "root";
        const saveCore = modal.querySelector("#srv-manual-save-core")?.checked;
        if (!mHost) {
          showToast("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0445\u043E\u0441\u0442 \u0438\u043B\u0438 IP \u0434\u043B\u044F SSH", "error");
          return;
        }
        srv.sshHostRef = "";
        srv.host = mHost;
        srv.port = mPort;
        srv.user = mUser;
        srv.identity = manualSecretVal;
        srv.connection = srv.connection || {};
        srv.connection.ssh = {
          enabled: true,
          host: mHost,
          port: mPort,
          user: mUser,
          identity: manualSecretVal
        };
        if (saveCore) {
          try {
            const newCoreHost = {
              id: srv.id,
              name: srv.name || srv.id,
              host: mHost,
              port: mPort,
              user: mUser,
              identityId: manualSecretVal,
              authType: manualSecretVal ? "vault" : "none",
              group: srv.group || "default",
              tags: srv.tags || []
            };
            if (window.ConfigStudio?.ssh?.save) {
              await window.ConfigStudio.ssh.save(newCoreHost);
            } else {
              await fetch("/api/hosts", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-ConfigStudio-Web": "1" },
                body: JSON.stringify(newCoreHost)
              });
            }
          } catch (e) {
            console.warn("[Fleet] Failed to sync manual host to core:", e);
          }
        }
      } else if (srv.sshHostRef) {
        const selectedHost = coreHosts.find((h) => h.id === srv.sshHostRef);
        if (selectedHost) {
          const hAddr = selectedHost.host || selectedHost.address || "";
          const hPort = selectedHost.port || 22;
          const hUser = selectedHost.user || selectedHost.username || "root";
          const hIdent = selectedHost.identityId || "";
          srv.connection = srv.connection || {};
          srv.connection.ssh = { enabled: true, host: hAddr, port: hPort, user: hUser, identity: hIdent };
          srv.host = hAddr;
          srv.port = hPort;
          srv.user = hUser;
          srv.identity = hIdent;
        }
      }
      if (agentEnabled && !srv.connection.agent?.url) {
        const h = srv.connection.ssh?.host || srv.host;
        if (h) {
          srv.connection = srv.connection || {};
          srv.connection.agent = srv.connection.agent || {};
          srv.connection.agent.url = `http://${h}:${agentPort}`;
        }
      }
      const validation = validateServerConfig(srv);
      if (!validation.valid) {
        const errBanner = modal.querySelector("#cs-fleet-validation-error");
        if (errBanner) {
          errBanner.innerHTML = `
          <div style="background:rgba(239,68,68,0.15);border:1px solid #ef4444;border-radius:8px;padding:10px 12px;color:#fca5a5;font-size:12px;display:flex;align-items:center;gap:8px;">
            <span>${ICONS.warning}</span>
            <span>${escapeHtml(validation.error || "\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0438")}</span>
          </div>
        `;
        }
        showToast(validation.error || "\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0438", "error");
        return;
      }
      if (!srv.name) srv.name = srv.id;
      try {
        await saveServer(srv);
        showToast(`\u0423\u0437\u0435\u043B ${srv.name} \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D`, "success");
        closeModal();
        await fleet.loadAndSyncServers();
      } catch (err) {
        showToast(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F: ${err.message}`, "error");
      }
    });
    const delBtn = modal.querySelector("#cs-fleet-delete-btn");
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        if (!confirm(`\u0412\u044B \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0445\u043E\u0442\u0438\u0442\u0435 \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0443\u0437\u0435\u043B "${srv.name}" \u0438\u0437 servers.yaml?`)) return;
        try {
          await deleteServer(srv.id);
          showToast(`\u0423\u0437\u0435\u043B ${srv.name} \u0443\u0434\u0430\u043B\u0435\u043D`, "info");
          if (store.getActiveServerId() === srv.id) {
            fleet.selectServer({ id: "localhost", name: "Localhost" });
          }
          closeModal();
          await fleet.loadAndSyncServers();
        } catch (err) {
          showToast(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F: ${err.message}`, "error");
        }
      });
    }
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // src/ui/serverCard.ts
  function createServerCard(s, onActionClose) {
    const card = document.createElement("div");
    const isActive = s.id === store.getActiveServerId();
    card.className = `cs-fleet-card ${isActive ? "active" : ""}`;
    const ping = store.getPingData(s.id);
    const dotClass = ping.status === "offline" ? "offline" : ping.status === "warn" ? "warn" : "online";
    const pingText = ping.ms !== null ? `${ping.ms} ms` : ping.status === "offline" ? "\u043E\u0444\u0444\u043B\u0430\u0439\u043D" : "\u2014";
    const hasAgent = Boolean(s.connection?.agent?.enabled);
    const hasSSH = Boolean(s.connection?.ssh?.enabled || s.connection?.ssh?.host || s.host || s.sshHostRef);
    const hostInfo = s.id === "localhost" ? "127.0.0.1 \u2022 Localhost" : s.connection?.ssh?.host || s.connection?.agent?.url || s.host || s.id;
    let badgeLabel = "LOCAL";
    let badgeType = "local";
    if (s.id !== "localhost") {
      if (hasAgent && hasSSH) {
        badgeLabel = "AGENT + SSH";
        badgeType = "hybrid";
      } else if (hasAgent) {
        badgeLabel = "AGENT";
        badgeType = "agent";
      } else if (hasSSH) {
        badgeLabel = "SSH";
        badgeType = "ssh";
      } else {
        badgeLabel = "OFFLINE";
        badgeType = "local";
      }
    }
    card.innerHTML = `
    <div class="cs-fleet-card-top">
      <div class="cs-fleet-card-title-group">
        <span class="cs-fleet-status-dot ${dotClass}"></span>
        <span class="cs-fleet-card-name">${escapeHtml(s.name)}</span>
        <span class="cs-fleet-card-ping">${pingText}</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="cs-fleet-badge ${badgeType}">${badgeLabel}</span>
        ${s.id !== "localhost" ? `<button class="cs-fleet-edit-btn" title="\u041D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C">${ICONS.edit}</button>` : ""}
      </div>
    </div>
    <div class="cs-fleet-card-meta">
      <div class="cs-fleet-card-host">${escapeHtml(hostInfo)}</div>
      ${s.group ? `<div class="cs-fleet-card-group-pill">[${escapeHtml(s.group)}]</div>` : ""}
    </div>
  `;
    if (s.id !== "localhost") {
      const editBtn = card.querySelector(".cs-fleet-edit-btn");
      if (editBtn) {
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (onActionClose) onActionClose();
          openEditModal(s);
        });
      }
    }
    const actionsRow = document.createElement("div");
    if (s.id === "localhost") {
      actionsRow.className = "cs-fleet-card-actions cols-1";
      actionsRow.innerHTML = `
      <button class="cs-fleet-btn-action cs-fleet-btn-local">
        ${ICONS.host} <span>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u0444\u0430\u0439\u043B\u044B</span>
      </button>
    `;
      actionsRow.querySelector("button")?.addEventListener("click", (e) => {
        e.stopPropagation();
        fleet.selectServer(s);
        if (onActionClose) onActionClose();
      });
    } else if (hasAgent && hasSSH) {
      actionsRow.className = "cs-fleet-card-actions cols-4";
      actionsRow.innerHTML = `
      <button class="cs-fleet-btn-action cs-fleet-btn-agent" title="\u0424\u0430\u0439\u043B\u044B \u0447\u0435\u0440\u0435\u0437 Remote Agent (\u0431\u044B\u0441\u0442\u0440\u044B\u0439 REST API \u0441 TOTP)">
        ${ICONS.agent} <span>\u0410\u0433\u0435\u043D\u0442</span>
      </button>
      <button class="cs-fleet-btn-action cs-fleet-btn-sftp" title="\u0414\u0435\u0440\u0435\u0432\u043E \u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440\u0438\u0439 SFTP (\u043D\u0430\u0442\u0438\u0432\u043D\u044B\u0439 SSH SFTP \u043A\u043B\u0438\u0435\u043D\u0442)">
        ${ICONS.sftp} <span>SFTP</span>
      </button>
      <button class="cs-fleet-btn-action cs-fleet-btn-shell" title="\u041E\u0442\u043A\u0440\u044B\u0442\u044C SSH PTY \u0442\u0435\u0440\u043C\u0438\u043D\u0430\u043B \u043A \u0443\u0437\u043B\u0443">
        ${ICONS.shell} <span>\u0428\u0435\u043B\u043B</span>
      </button>
      <button class="cs-fleet-btn-action cs-fleet-btn-upgrade" title="1-Click \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C Remote Agent \u043F\u043E SSH">
        <span>\u27F3</span>
      </button>
    `;
      actionsRow.querySelector(".cs-fleet-btn-agent")?.addEventListener("click", (e) => {
        e.stopPropagation();
        fleet.selectServer(s, "agent");
        if (onActionClose) onActionClose();
      });
      actionsRow.querySelector(".cs-fleet-btn-sftp")?.addEventListener("click", (e) => {
        e.stopPropagation();
        fleet.selectServer(s, "sftp");
        if (onActionClose) onActionClose();
      });
      actionsRow.querySelector(".cs-fleet-btn-shell")?.addEventListener("click", (e) => {
        e.stopPropagation();
        fleet.launchShell(s);
        if (onActionClose) onActionClose();
      });
      actionsRow.querySelector(".cs-fleet-btn-upgrade")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (onActionClose) onActionClose();
        openInstallAgentDialog(s, true);
      });
    } else if (hasSSH && !hasAgent) {
      actionsRow.className = "cs-fleet-card-actions";
      actionsRow.innerHTML = `
      <button class="cs-fleet-btn-action cs-fleet-btn-sftp" title="SFTP \u043F\u0440\u043E\u0432\u043E\u0434\u043D\u0438\u043A">
        ${ICONS.sftp} <span>SFTP</span>
      </button>
      <button class="cs-fleet-btn-action cs-fleet-btn-shell" title="SSH \u0428\u0435\u043B\u043B">
        ${ICONS.shell} <span>\u0428\u0435\u043B\u043B</span>
      </button>
      <button class="cs-fleet-btn-action cs-fleet-btn-agent" style="border-style:dashed;" title="1-Click \u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0430\u0433\u0435\u043D\u0442\u0430 Config Studio \u043F\u043E SSH">
        ${ICONS.agent} <span>+\u0410\u0433\u0435\u043D\u0442</span>
      </button>
    `;
      actionsRow.querySelector(".cs-fleet-btn-sftp")?.addEventListener("click", (e) => {
        e.stopPropagation();
        fleet.selectServer(s, "sftp");
        if (onActionClose) onActionClose();
      });
      actionsRow.querySelector(".cs-fleet-btn-shell")?.addEventListener("click", (e) => {
        e.stopPropagation();
        fleet.launchShell(s);
        if (onActionClose) onActionClose();
      });
      actionsRow.querySelector(".cs-fleet-btn-agent")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (onActionClose) onActionClose();
        openInstallAgentDialog(s);
      });
    } else if (hasAgent && !hasSSH) {
      actionsRow.className = "cs-fleet-card-actions cols-1";
      actionsRow.innerHTML = `
      <button class="cs-fleet-btn-action cs-fleet-btn-agent" title="\u0424\u0430\u0439\u043B\u044B \u0447\u0435\u0440\u0435\u0437 \u0430\u0433\u0435\u043D\u0442">
        ${ICONS.agent} <span>\u0410\u0433\u0435\u043D\u0442</span>
      </button>
    `;
      actionsRow.querySelector(".cs-fleet-btn-agent")?.addEventListener("click", (e) => {
        e.stopPropagation();
        fleet.selectServer(s, "agent");
        if (onActionClose) onActionClose();
      });
    }
    card.appendChild(actionsRow);
    card.addEventListener("click", () => {
      fleet.selectServer(s, "auto");
      if (onActionClose) onActionClose();
    });
    return card;
  }

  // src/ui/batchInstallModal.ts
  function openBatchInstallModal(initialSelectedIds = []) {
    const servers = store.getServers();
    const nonLocalServers = servers.filter((s) => s.id !== "localhost");
    if (nonLocalServers.length === 0) {
      showToast("\u0412 \u0438\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0435 \u043D\u0435\u0442 \u0443\u0434\u0430\u043B\u0435\u043D\u043D\u044B\u0445 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u0432 (\u0442\u043E\u043B\u044C\u043A\u043E localhost)", "warning");
      return;
    }
    const overlay = document.createElement("div");
    overlay.className = "cs-fleet-modal-overlay";
    const modal = document.createElement("div");
    modal.className = "cs-fleet-modal-content cs-fleet-modal-lg cs-fleet-modal-fixed";
    const selectedMap = /* @__PURE__ */ new Set();
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      initialSelectedIds.forEach((id) => selectedMap.add(id));
    } else {
      nonLocalServers.forEach((s) => {
        if (!s.connection?.agent?.enabled) {
          selectedMap.add(s.id);
        }
      });
      if (selectedMap.size === 0) {
        nonLocalServers.forEach((s) => selectedMap.add(s.id));
      }
    }
    let isRunning = false;
    let batchAbortCtrl = null;
    modal.innerHTML = `
    <div class="cs-fleet-modal-header">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="color:var(--cs-srv-accent);">${ICONS.agent}</span>
        <span style="font-weight:700;font-size:14px;">\u041C\u0430\u0441\u0441\u043E\u0432\u0430\u044F \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0430\u0433\u0435\u043D\u0442\u0430 (Fleet Batch Provisioning)</span>
      </div>
      <button class="cs-fleet-modal-close">${ICONS.close}</button>
    </div>

    <div class="cs-fleet-modal-body" style="padding:16px 20px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;">
      <!-- Banner -->
      <div style="background:var(--cs-srv-bg-subtle);border:1px solid var(--cs-srv-border);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--cs-srv-text-primary);">
        \u041F\u0430\u0440\u0430\u043B\u043B\u0435\u043B\u044C\u043D\u043E\u0435 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u0440\u0430\u0437\u0432\u0435\u0440\u0442\u044B\u0432\u0430\u043D\u0438\u0435 <b>config-studio-agent</b> \u043D\u0430 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0441\u0435\u0440\u0432\u0435\u0440\u044B \u0444\u043B\u043E\u0442\u0430: \u0430\u0432\u0442\u043E\u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u041E\u0421 \u0438 \u0430\u0440\u0445\u0438\u0442\u0435\u043A\u0442\u0443\u0440\u044B, \u043F\u043E\u0442\u043E\u043A\u043E\u0432\u0430\u044F \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0430 \u0431\u0438\u043D\u0430\u0440\u043D\u0438\u043A\u0430 \u043F\u043E SFTP, \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0441\u043B\u0443\u0436\u0431\u044B (systemd/OpenRC) \u0438 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0445 TOTP-\u0441\u0435\u043A\u0440\u0435\u0442\u043E\u0432 \u0432 Core Vault.
      </div>

      <!-- Deployment Settings Form -->
      <div id="cs-batch-settings-card" style="background:var(--cs-srv-bg-base);border:1px solid var(--cs-srv-border);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:12px;">
        <div class="cs-fleet-form-grid" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));gap:10px;">
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">\u041F\u043E\u0440\u0442 \u0430\u0433\u0435\u043D\u0442\u0430</label>
            <input type="number" id="cs-batch-port" class="cs-fleet-form-input" value="8085" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">\u041F\u0430\u0440\u0430\u043B\u043B\u0435\u043B\u0438\u0437\u043C (\u043F\u043E\u0442\u043E\u043A\u0438)</label>
            <input type="number" id="cs-batch-concurrency" class="cs-fleet-form-input" value="4" min="1" max="10" />
          </div>
          <div class="cs-fleet-form-group">
            <label class="cs-fleet-form-label">\u0421\u0438\u0441\u0442\u0435\u043C\u0430 \u0441\u043B\u0443\u0436\u0431\u044B</label>
            <div id="cs-batch-service-type-container"></div>
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;font-size:12px;color:var(--cs-srv-text-primary);">
          <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" id="cs-batch-sudo" checked />
            <span>\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C sudo</span>
          </label>
          <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" id="cs-batch-skip-healthy" checked />
            <span>\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0442\u044C \u0441\u0435\u0440\u0432\u0435\u0440\u044B \u0441 \u0443\u0436\u0435 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u043C \u0430\u0433\u0435\u043D\u0442\u043E\u043C</span>
          </label>
        </div>
      </div>

      <!-- Target Servers Header & Filters -->
      <div id="cs-batch-target-header" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span style="font-weight:600;font-size:12px;color:var(--cs-srv-text-primary);">
          \u0426\u0435\u043B\u0435\u0432\u044B\u0435 \u0441\u0435\u0440\u0432\u0435\u0440\u044B: <span id="cs-batch-selected-count" style="color:var(--cs-srv-accent);font-weight:700;">${selectedMap.size}</span> \u0438\u0437 ${nonLocalServers.length}
        </span>
        <div style="display:flex;gap:6px;">
          <button type="button" class="cs-fleet-btn-secondary" id="cs-batch-btn-no-agent" style="padding:3px 8px;font-size:11px;">\u0411\u0435\u0437 \u0430\u0433\u0435\u043D\u0442\u0430</button>
          <button type="button" class="cs-fleet-btn-secondary" id="cs-batch-btn-all" style="padding:3px 8px;font-size:11px;">\u0412\u0441\u0435 (${nonLocalServers.length})</button>
          <button type="button" class="cs-fleet-btn-secondary" id="cs-batch-btn-none" style="padding:3px 8px;font-size:11px;">\u0421\u043D\u044F\u0442\u044C</button>
        </div>
      </div>

      <!-- Target Servers List -->
      <div id="cs-batch-target-list" style="max-height:220px;overflow-y:auto;border:1px solid var(--cs-srv-border);border-radius:8px;padding:6px;background:var(--cs-srv-bg-base);display:flex;flex-direction:column;gap:4px;">
      </div>

      <!-- Execution Progress Section (Hidden initially) -->
      <div id="cs-batch-progress-section" style="display:none;flex-direction:column;gap:10px;border-top:1px solid var(--cs-srv-border);padding-top:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
          <span style="font-weight:600;color:var(--cs-srv-text-primary);" id="cs-batch-progress-title">\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u0440\u0430\u0437\u0432\u0435\u0440\u0442\u044B\u0432\u0430\u043D\u0438\u044F...</span>
          <span style="font-family:monospace;color:var(--cs-srv-accent);font-weight:700;" id="cs-batch-progress-stats">0 / ${selectedMap.size} (0%)</span>
        </div>

        <!-- Progress Bar -->
        <div style="width:100%;height:6px;background:var(--cs-srv-bg-subtle);border-radius:3px;overflow:hidden;border:1px solid var(--cs-srv-border);">
          <div id="cs-batch-progress-bar" style="height:100%;width:0%;background:var(--cs-srv-accent);transition:width 0.25s ease;"></div>
        </div>

        <!-- Live Host Execution Cards -->
        <div id="cs-batch-execution-list" style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto;padding-right:2px;">
        </div>
      </div>
    </div>

    <div class="cs-fleet-modal-footer">
      <div id="cs-batch-status-hint" style="font-size:11px;color:var(--cs-srv-text-muted);">
        \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0446\u0435\u043B\u0435\u0432\u044B\u0435 \u0441\u0435\u0440\u0432\u0435\u0440\u044B \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041D\u0430\u0447\u0430\u0442\u044C \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0443\xBB.
      </div>
      <div style="display:flex;gap:8px;">
        <button class="cs-fleet-btn-secondary" id="cs-batch-close-btn">\u0417\u0430\u043A\u0440\u044B\u0442\u044C</button>
        <button class="cs-fleet-btn-primary" id="cs-batch-run-btn" style="display:inline-flex;align-items:center;gap:6px;">
          ${ICONS.agent} <span>\u041D\u0430\u0447\u0430\u0442\u044C \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0443 (${selectedMap.size})</span>
        </button>
      </div>
    </div>
  `;
    const serviceTypeContainer = modal.querySelector("#cs-batch-service-type-container");
    let serviceTypeDropdown = null;
    const svcOptions = [
      { value: "auto", label: "\u0410\u0432\u0442\u043E\u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 (systemd / OpenRC)", subtitle: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0432\u044B\u0431\u043E\u0440", badge: "AUTO", badgeColor: "blue" },
      { value: "systemd", label: "systemd (/etc/systemd/system)", subtitle: "Debian, Ubuntu, RHEL, CentOS", badge: "LINUX", badgeColor: "purple" },
      { value: "openrc", label: "OpenRC (/etc/init.d)", subtitle: "Alpine Linux, Gentoo", badge: "ALPINE", badgeColor: "green" },
      { value: "none", label: "\u0411\u0435\u0437 \u0441\u043B\u0443\u0436\u0431\u044B (nohup \u043F\u0440\u043E\u0446\u0435\u0441\u0441)", subtitle: "\u0412\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0439 \u0437\u0430\u043F\u0443\u0441\u043A", badge: "NOHUP", badgeColor: "amber" }
    ];
    if (window.ConfigStudio?.ui?.renderDropdown) {
      serviceTypeDropdown = window.ConfigStudio.ui.renderDropdown(serviceTypeContainer, {
        options: svcOptions,
        value: "auto",
        placeholder: "\u0422\u0438\u043F \u0441\u043B\u0443\u0436\u0431\u044B..."
      });
    } else {
      serviceTypeContainer.innerHTML = `
      <select id="cs-batch-service-type" class="cs-fleet-form-select">
        <option value="auto">\u0410\u0432\u0442\u043E\u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 (systemd / OpenRC)</option>
        <option value="systemd">systemd (/etc/systemd/system)</option>
        <option value="openrc">OpenRC (/etc/init.d)</option>
        <option value="none">\u0411\u0435\u0437 \u0441\u043B\u0443\u0436\u0431\u044B (nohup)</option>
      </select>
    `;
    }
    const targetListEl = modal.querySelector("#cs-batch-target-list");
    const selectedCountEl = modal.querySelector("#cs-batch-selected-count");
    const runBtn = modal.querySelector("#cs-batch-run-btn");
    const closeBtn = modal.querySelector("#cs-batch-close-btn");
    const progressSection = modal.querySelector("#cs-batch-progress-section");
    const progressBar = modal.querySelector("#cs-batch-progress-bar");
    const progressStats = modal.querySelector("#cs-batch-progress-stats");
    const executionListEl = modal.querySelector("#cs-batch-execution-list");
    const statusHint = modal.querySelector("#cs-batch-status-hint");
    function updateSelectionView() {
      selectedCountEl.textContent = String(selectedMap.size);
      runBtn.innerHTML = `${ICONS.agent} <span>\u041D\u0430\u0447\u0430\u0442\u044C \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0443 (${selectedMap.size})</span>`;
      runBtn.disabled = selectedMap.size === 0;
      modal.querySelectorAll(".cs-batch-host-item").forEach((row) => {
        const id = row.getAttribute("data-id");
        const chk = row.querySelector('input[type="checkbox"]');
        const isSel = id ? selectedMap.has(id) : false;
        if (chk) chk.checked = isSel;
        row.classList.toggle("selected", isSel);
      });
    }
    function renderTargetList() {
      targetListEl.innerHTML = "";
      nonLocalServers.forEach((s) => {
        const hasAgent = Boolean(s.connection?.agent?.enabled);
        const hostInfo = s.connection?.ssh?.host ? `${s.connection.ssh.user || "root"}@${s.connection.ssh.host}:${s.connection.ssh.port || 22}` : s.id;
        const isSel = selectedMap.has(s.id);
        const row = document.createElement("div");
        row.className = `cs-batch-host-item ${isSel ? "selected" : ""}`;
        row.setAttribute("data-id", s.id);
        row.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
          <input type="checkbox" ${isSel ? "checked" : ""} style="cursor:pointer;" />
          <div style="min-width:0;flex:1;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-weight:600;font-size:12px;color:var(--cs-srv-text-primary);">${escapeHtml(s.name || s.id)}</span>
              <span style="font-size:10px;font-family:monospace;color:var(--cs-srv-text-muted);">${escapeHtml(s.id)}</span>
            </div>
            <div style="font-size:11px;font-family:monospace;color:var(--cs-srv-text-muted);margin-top:1px;">${escapeHtml(hostInfo)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;shrink:0;">
          ${hasAgent ? '<span class="cs-batch-status-pill cs-batch-status-success">\u2713 \u0410\u0433\u0435\u043D\u0442 \u0430\u043A\u0442\u0438\u0432\u0435\u043D</span>' : '<span class="cs-batch-status-pill cs-batch-status-pending">\u0422\u043E\u043B\u044C\u043A\u043E SSH</span>'}
        </div>
      `;
        row.addEventListener("click", (e) => {
          if (isRunning) return;
          if (e.target.tagName !== "INPUT") {
            const chk2 = row.querySelector('input[type="checkbox"]');
            if (chk2) chk2.checked = !chk2.checked;
          }
          const chk = row.querySelector('input[type="checkbox"]');
          if (chk?.checked) {
            selectedMap.add(s.id);
          } else {
            selectedMap.delete(s.id);
          }
          updateSelectionView();
        });
        targetListEl.appendChild(row);
      });
    }
    renderTargetList();
    modal.querySelector("#cs-batch-btn-no-agent")?.addEventListener("click", () => {
      if (isRunning) return;
      selectedMap.clear();
      nonLocalServers.filter((s) => !s.connection?.agent?.enabled).forEach((s) => selectedMap.add(s.id));
      updateSelectionView();
    });
    modal.querySelector("#cs-batch-btn-all")?.addEventListener("click", () => {
      if (isRunning) return;
      selectedMap.clear();
      nonLocalServers.forEach((s) => selectedMap.add(s.id));
      updateSelectionView();
    });
    modal.querySelector("#cs-batch-btn-none")?.addEventListener("click", () => {
      if (isRunning) return;
      selectedMap.clear();
      updateSelectionView();
    });
    function closeModal() {
      if (batchAbortCtrl) {
        try {
          batchAbortCtrl.abort();
        } catch (_) {
        }
        batchAbortCtrl = null;
      }
      try {
        serviceTypeDropdown?.destroy();
      } catch (_) {
      }
      overlay.remove();
    }
    modal.querySelector(".cs-fleet-modal-close")?.addEventListener("click", closeModal);
    closeBtn?.addEventListener("click", closeModal);
    const hostStatusMap = /* @__PURE__ */ new Map();
    function renderExecutionRow(st) {
      let card = executionListEl.querySelector(`[data-exec-id="${st.serverId}"]`);
      if (!card) {
        card = document.createElement("div");
        card.setAttribute("data-exec-id", st.serverId);
        card.style.cssText = "background:var(--cs-srv-bg-base);border:1px solid var(--cs-srv-border);border-radius:8px;padding:8px 12px;font-size:11.5px;";
        executionListEl.appendChild(card);
      }
      let pillClass = "cs-batch-status-pending";
      let pillLabel = st.step || st.status || "\u0412 \u043E\u0447\u0435\u0440\u0435\u0434\u0438";
      if (st.status === "connecting") {
        pillClass = "cs-batch-status-connecting";
        pillLabel = `\u23F3 ${st.step || "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435..."}`;
      } else if (st.status === "installing") {
        pillClass = "cs-batch-status-installing";
        pillLabel = `\u26A1 ${st.step || "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430..."}`;
      } else if (st.status === "success") {
        pillClass = "cs-batch-status-success";
        pillLabel = "\u2713 \u0423\u0441\u043F\u0435\u0448\u043D\u043E \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D";
      } else if (st.status === "skipped") {
        pillClass = "cs-batch-status-skipped";
        pillLabel = "\u2713 \u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D (\u0430\u043A\u0442\u0438\u0432\u0435\u043D)";
      } else if (st.status === "error") {
        pillClass = "cs-batch-status-error";
        pillLabel = `\u2717 ${st.error || "\u041E\u0448\u0438\u0431\u043A\u0430"}`;
      }
      const hasLogs = st.logs && st.logs.length > 0;
      card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
          <span style="font-weight:600;color:var(--cs-srv-text-primary);">${escapeHtml(st.name || st.serverId)}</span>
          <span style="font-size:11px;font-family:monospace;color:var(--cs-srv-text-muted);">${escapeHtml(st.host || "")}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;shrink:0;">
          <span class="cs-batch-status-pill ${pillClass}">${escapeHtml(pillLabel)}</span>
          ${hasLogs ? `<button type="button" class="cs-batch-log-toggle" style="background:none;border:none;cursor:pointer;color:var(--cs-srv-accent);font-size:10.5px;text-decoration:underline;">\u0416\u0443\u0440\u043D\u0430\u043B (${st.logs.length})</button>` : ""}
        </div>
      </div>
      ${hasLogs ? `
        <div class="cs-batch-log-drawer" style="display:none;margin-top:6px;background:#090d16;padding:8px;border-radius:6px;font-family:monospace;font-size:10.5px;max-height:100px;overflow-y:auto;color:#cbd5e1;line-height:1.4;">
          ${st.logs.map((l) => `<div>${escapeHtml(l)}</div>`).join("")}
        </div>
      ` : ""}
    `;
      if (hasLogs) {
        const toggleBtn = card.querySelector(".cs-batch-log-toggle");
        const drawer = card.querySelector(".cs-batch-log-drawer");
        if (toggleBtn && drawer) {
          toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = drawer.style.display !== "none";
            drawer.style.display = isOpen ? "none" : "block";
            toggleBtn.textContent = isOpen ? `\u0416\u0443\u0440\u043D\u0430\u043B (${st.logs.length})` : "\u0421\u043A\u0440\u044B\u0442\u044C \u0436\u0443\u0440\u043D\u0430\u043B";
          });
        }
      }
    }
    runBtn.addEventListener("click", async () => {
      if (selectedMap.size === 0 || isRunning) return;
      isRunning = true;
      runBtn.disabled = true;
      runBtn.innerHTML = `<span>\u23F3 \u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430...</span>`;
      statusHint.textContent = "\u0412\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u043F\u0430\u0440\u0430\u043B\u043B\u0435\u043B\u044C\u043D\u043E\u0435 \u0440\u0430\u0437\u0432\u0435\u0440\u0442\u044B\u0432\u0430\u043D\u0438\u0435 \u0430\u0433\u0435\u043D\u0442\u043E\u0432...";
      modal.querySelector("#cs-batch-settings-card").style.display = "none";
      modal.querySelector("#cs-batch-target-header").style.display = "none";
      modal.querySelector("#cs-batch-target-list").style.display = "none";
      progressSection.style.display = "flex";
      const targetIds = Array.from(selectedMap);
      const customPort = parseInt(modal.querySelector("#cs-batch-port").value, 10) || 8085;
      const concurrency = parseInt(modal.querySelector("#cs-batch-concurrency").value, 10) || 4;
      const useSudo = modal.querySelector("#cs-batch-sudo").checked;
      const skipHealthy = modal.querySelector("#cs-batch-skip-healthy").checked;
      const svcSelect = modal.querySelector("#cs-batch-service-type");
      const serviceType = serviceTypeDropdown?.getValue ? serviceTypeDropdown.getValue() : svcSelect ? svcSelect.value : "auto";
      targetIds.forEach((id) => {
        const srv = servers.find((s) => s.id === id);
        const initStatus = {
          serverId: id,
          name: srv ? srv.name : id,
          host: srv?.connection?.ssh?.host || srv?.host || id,
          status: "pending",
          step: "\u0412 \u043E\u0447\u0435\u0440\u0435\u0434\u0438",
          logs: []
        };
        hostStatusMap.set(id, initStatus);
        renderExecutionRow(initStatus);
      });
      const totalCount = targetIds.length;
      let completedCount = 0;
      function updateOverallProgress() {
        completedCount = 0;
        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        for (const st of hostStatusMap.values()) {
          if (st.status === "success") {
            completedCount++;
            successCount++;
          } else if (st.status === "error") {
            completedCount++;
            errorCount++;
          } else if (st.status === "skipped") {
            completedCount++;
            skippedCount++;
          }
        }
        const pct = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
        progressBar.style.width = `${pct}%`;
        progressStats.textContent = `${completedCount} / ${totalCount} (${pct}%) \u2022 \u2713 ${successCount} | \u2717 ${errorCount} | \u2014 ${skippedCount}`;
      }
      updateOverallProgress();
      const params = new URLSearchParams();
      params.set("ids", targetIds.join(","));
      params.set("port", String(customPort));
      params.set("concurrency", String(concurrency));
      params.set("useSudo", useSudo ? "true" : "false");
      params.set("skipHealthy", skipHealthy ? "true" : "false");
      params.set("serviceType", serviceType);
      const url = `/api/servers/batch-install/stream?${params.toString()}`;
      batchAbortCtrl = new AbortController();
      let isDone = false;
      function handleProgressEvent(dataStr) {
        try {
          const st = JSON.parse(dataStr);
          const current = hostStatusMap.get(st.serverId) || { serverId: st.serverId, status: "pending" };
          const merged = Object.assign(current, st);
          hostStatusMap.set(st.serverId, merged);
          renderExecutionRow(merged);
          updateOverallProgress();
        } catch (err) {
          console.warn("[BatchInstall] Error parsing progress event:", err);
        }
      }
      async function handleDoneEvent(dataStr) {
        if (isDone) return;
        isDone = true;
        try {
          const summary = JSON.parse(dataStr);
          progressBar.style.width = "100%";
          closeBtn.style.display = "none";
          runBtn.innerHTML = `<span>\u2713 \u0413\u043E\u0442\u043E\u0432\u043E</span>`;
          runBtn.disabled = false;
          runBtn.onclick = closeModal;
          statusHint.textContent = `\u0413\u043E\u0442\u043E\u0432\u043E! \u0423\u0441\u043F\u0435\u0448\u043D\u043E: ${summary.success}, \u041E\u0448\u0438\u0431\u043E\u043A: ${summary.failed}, \u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E: ${summary.skipped}`;
          showToast(
            `\u041C\u0430\u0441\u0441\u043E\u0432\u0430\u044F \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430! \u0423\u0441\u043F\u0435\u0448\u043D\u043E: ${summary.success}, \u041E\u0448\u0438\u0431\u043E\u043A: ${summary.failed}`,
            summary.failed > 0 ? "warning" : "success"
          );
        } catch (_) {
          showToast("\u041C\u0430\u0441\u0441\u043E\u0432\u0430\u044F \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430!", "success");
        }
        if (batchAbortCtrl) {
          try {
            batchAbortCtrl.abort();
          } catch (_) {
          }
          batchAbortCtrl = null;
        }
        isRunning = false;
        await fleet.loadAndSyncServers();
      }
      function handleStreamError() {
        if (isDone) return;
        if (batchAbortCtrl) {
          try {
            batchAbortCtrl.abort();
          } catch (_) {
          }
          batchAbortCtrl = null;
        }
        isRunning = false;
        closeBtn.style.display = "none";
        runBtn.innerHTML = `<span>\u0417\u0430\u043A\u0440\u044B\u0442\u044C</span>`;
        runBtn.disabled = false;
        runBtn.onclick = closeModal;
        statusHint.textContent = "\u0421\u0432\u044F\u0437\u044C \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430.";
        fleet.loadAndSyncServers();
      }
      (async () => {
        try {
          const streamRes = await fetch(url, {
            headers: {
              "X-ConfigStudio-Web": "1",
              Accept: "text/event-stream"
            },
            signal: batchAbortCtrl?.signal
          });
          if (!streamRes.ok) {
            let msg = streamRes.statusText;
            try {
              const j = await streamRes.json();
              if (j && j.error) msg = j.error;
            } catch (_) {
            }
            throw new Error(`HTTP ${streamRes.status}: ${msg}`);
          }
          if (!streamRes.body) throw new Error("ReadableStream not available");
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let currentEvent = "message";
          let currentData = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) {
                if (currentData) {
                  if (currentEvent === "progress") handleProgressEvent(currentData);
                  else if (currentEvent === "done") await handleDoneEvent(currentData);
                  currentEvent = "message";
                  currentData = "";
                }
                continue;
              }
              if (trimmed.startsWith("event:")) {
                currentEvent = trimmed.slice(6).trim();
              } else if (trimmed.startsWith("data:")) {
                currentData += (currentData ? "\n" : "") + trimmed.slice(5).trim();
              }
            }
          }
          if (currentData) {
            if (currentEvent === "progress") handleProgressEvent(currentData);
            else if (currentEvent === "done") await handleDoneEvent(currentData);
          }
          if (!isDone) {
            handleStreamError();
          }
        } catch (err) {
          if (!isDone && !batchAbortCtrl?.signal.aborted) {
            console.warn("[BatchInstall] Stream error:", err);
            handleStreamError();
          }
        }
      })();
    });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // src/ui/rawYamlModal.ts
  async function openRawYAMLModal() {
    let rawContent = "";
    try {
      rawContent = await fetchRawYaml();
    } catch (e) {
      showToast("\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 servers.yaml: " + e.message, "error");
      return;
    }
    if (typeof window !== "undefined" && window.ConfigStudio && typeof window.ConfigStudio.openCustomTab === "function") {
      try {
        await window.ConfigStudio.openCustomTab({
          path: "fleet://servers.yaml",
          name: "servers.yaml",
          content: rawContent,
          language: "yaml",
          badge: "FLEET",
          onSave: async (newContent) => {
            await saveRawYaml(newContent);
            showToast("servers.yaml \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D", "success");
            await fleet.loadAndSyncServers();
          }
        });
        return;
      } catch (err) {
        console.warn("[servers] openCustomTab failed, falling back to modal:", err);
      }
    }
    const overlay = document.createElement("div");
    overlay.className = "cs-fleet-modal-overlay";
    const modal = document.createElement("div");
    modal.className = "cs-fleet-modal-content cs-fleet-modal-lg cs-fleet-modal-fixed";
    modal.innerHTML = `
    <div class="cs-fleet-modal-header">
      <div style="display:flex;align-items:center;gap:8px;">
        ${ICONS.server}
        <span style="font-weight:700;font-size:14px;">\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 servers.yaml</span>
      </div>
      <button class="cs-fleet-modal-close">${ICONS.close}</button>
    </div>
    <div class="cs-fleet-modal-body" style="padding:16px;">
      <textarea id="cs-fleet-yaml-textarea" class="cs-fleet-form-textarea" rows="18" style="font-family:monospace;font-size:12px;background:var(--cs-srv-bg-base);color:var(--cs-srv-text-primary);">${escapeHtml(
      rawContent
    )}</textarea>
    </div>
    <div class="cs-fleet-modal-footer">
      <div></div>
      <div style="display:flex;gap:8px;">
        <button class="cs-fleet-btn-secondary" id="cs-fleet-yaml-cancel">\u041E\u0442\u043C\u0435\u043D\u0430</button>
        <button class="cs-fleet-btn-primary" id="cs-fleet-yaml-save">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C YAML</button>
      </div>
    </div>
  `;
    function closeModal() {
      overlay.remove();
    }
    modal.querySelector(".cs-fleet-modal-close")?.addEventListener("click", closeModal);
    modal.querySelector("#cs-fleet-yaml-cancel")?.addEventListener("click", closeModal);
    modal.querySelector("#cs-fleet-yaml-save")?.addEventListener("click", async () => {
      const newYaml = modal.querySelector("#cs-fleet-yaml-textarea").value;
      try {
        await saveRawYaml(newYaml);
        showToast("servers.yaml \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D", "success");
        closeModal();
        await fleet.loadAndSyncServers();
      } catch (err) {
        showToast(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F YAML: ${err.message}`, "error");
      }
    });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // src/ui/headerSwitcher.ts
  function registerHeaderSwitcher() {
    if (typeof window === "undefined" || !window.ConfigStudio?.registerHeaderItem) {
      return;
    }
    window.ConfigStudio.registerHeaderItem({
      id: "fleet-universal-switcher",
      pluginId: PLUGIN_ID,
      order: 5,
      render: (container) => {
        container._csUnsub?.();
        container.innerHTML = "";
        const wrap = document.createElement("div");
        wrap.className = "cs-fleet-header-container";
        let isDropdownOpen = false;
        let activeRenderCardsFn = null;
        const triggerBtn = document.createElement("button");
        triggerBtn.className = "cs-fleet-header-btn";
        triggerBtn.title = "\u0412\u044B\u0431\u043E\u0440 \u0440\u0430\u0431\u043E\u0447\u0435\u0433\u043E \u0443\u0437\u043B\u0430 \u0438 \u0444\u043B\u043E\u0442\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u0432";
        function renderTrigger() {
          const active = store.getActiveServer();
          const ping = store.getPingData(active.id);
          const hasAgent = Boolean(active.connection?.agent?.enabled);
          const hasSSH = Boolean(active.connection?.ssh?.enabled || active.host);
          let badgeType = "local";
          let badgeLabel = "LOCAL";
          if (hasAgent && hasSSH) {
            badgeType = "hybrid";
            badgeLabel = "AGENT + SSH";
          } else if (hasAgent) {
            badgeType = "agent";
            badgeLabel = "AGENT RW";
          } else if (hasSSH) {
            badgeType = "ssh";
            badgeLabel = "SSH ONLY";
          }
          const dotClass = ping.status === "offline" ? "offline" : ping.status === "warn" ? "warn" : "online";
          const iconHtml = active.id === "localhost" ? ICONS.host : ICONS.server;
          triggerBtn.innerHTML = `
          <span class="cs-fleet-status-dot ${dotClass}"></span>
          <span>${iconHtml}</span>
          <span class="cs-fleet-name">${escapeHtml(active.name)}</span>
          <span class="cs-fleet-badge ${badgeType}">${badgeLabel}</span>
          ${ICONS.chevron}
        `;
        }
        renderTrigger();
        const dropdown = document.createElement("div");
        dropdown.className = "cs-fleet-dropdown";
        dropdown.style.display = "none";
        function renderDropdown() {
          dropdown.innerHTML = "";
          const servers = store.getServers();
          const header = document.createElement("div");
          header.className = "cs-fleet-dropdown-header";
          header.innerHTML = `
          <div class="cs-fleet-dropdown-title">
            <span>\u0424\u043B\u043E\u0442 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u0432 (servers.yaml)</span>
            <span class="cs-fleet-count-pill">${servers.length} \u0443\u0437\u043B\u043E\u0432</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="cs-fleet-add-btn" id="cs-fleet-add-node-btn">
              ${ICONS.plus} <span>\u0423\u0437\u0435\u043B</span>
            </button>
          </div>
        `;
          dropdown.appendChild(header);
          header.querySelector("#cs-fleet-add-node-btn")?.addEventListener("click", (e) => {
            e.stopPropagation();
            closeDropdown();
            openEditModal(null);
          });
          const filterBar = document.createElement("div");
          filterBar.className = "cs-fleet-filter-bar";
          filterBar.addEventListener("click", (e) => e.stopPropagation());
          const searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.className = "cs-fleet-search-input";
          searchInput.placeholder = "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0438\u043C\u0435\u043D\u0438, IP \u0438\u043B\u0438 #\u0442\u0435\u0433\u0443...";
          searchInput.value = store.getSearchQuery();
          searchInput.addEventListener("input", (e) => {
            store.setSearchQuery(e.target.value);
          });
          filterBar.appendChild(searchInput);
          const distinctTags = store.getDistinctTags();
          if (store.getActiveTagFilter() !== "all" && !distinctTags.includes(store.getActiveTagFilter())) {
            store.setActiveTagFilter("all");
          }
          const pillTrack = document.createElement("div");
          pillTrack.className = "cs-fleet-pill-track";
          pillTrack.setAttribute("role", "tablist");
          pillTrack.addEventListener(
            "wheel",
            (e) => {
              if (e.deltaY !== 0 && e.deltaX === 0) {
                e.preventDefault();
                pillTrack.scrollLeft += e.deltaY;
              }
            },
            { passive: false }
          );
          const tabsMap = /* @__PURE__ */ new Map();
          function createPillTab(id, label, count) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.role = "tab";
            const isSel = store.getActiveTagFilter() === id;
            btn.className = `cs-fleet-pill-tab ${isSel ? "active" : ""}`;
            btn.setAttribute("aria-selected", isSel ? "true" : "false");
            btn.innerHTML = `
            <span>${escapeHtml(label)}</span>
            <span class="cs-fleet-pill-badge">${count}</span>
          `;
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              if (store.getActiveTagFilter() === id) return;
              store.setActiveTagFilter(id);
              tabsMap.forEach((tabBtn, tabId) => {
                const active = tabId === store.getActiveTagFilter();
                tabBtn.classList.toggle("active", active);
                tabBtn.setAttribute("aria-selected", active ? "true" : "false");
              });
              renderCards();
              activeRenderCardsFn = renderCards;
            });
            tabsMap.set(id, btn);
            return btn;
          }
          pillTrack.appendChild(createPillTab("all", "\u0412\u0441\u0435", servers.length));
          distinctTags.forEach((tag) => {
            const count = servers.filter((s) => (s.tags || []).includes(tag)).length;
            pillTrack.appendChild(createPillTab(tag, `#${tag}`, count));
          });
          filterBar.appendChild(pillTrack);
          dropdown.appendChild(filterBar);
          const listContainer = document.createElement("div");
          listContainer.className = "cs-fleet-list";
          dropdown.appendChild(listContainer);
          function renderCards() {
            listContainer.innerHTML = "";
            const filtered = store.filterServers();
            if (filtered.length === 0) {
              listContainer.innerHTML = `<div style="padding:16px;text-align:center;color:#64748b;font-size:11px;">\u0423\u0437\u043B\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B</div>`;
              return;
            }
            filtered.forEach((s) => {
              const card = createServerCard(s, () => {
                closeDropdown();
              });
              listContainer.appendChild(card);
            });
          }
          renderCards();
          activeRenderCardsFn = renderCards;
          const footer = document.createElement("div");
          footer.className = "cs-fleet-dropdown-footer";
          footer.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" class="cs-fleet-yaml-link" id="cs-fleet-dropdown-batch-btn" style="background:none;border:none;cursor:pointer;color:var(--cs-srv-accent);display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:0;">
              ${ICONS.agent} <span>\u041C\u0430\u0441\u0441\u043E\u0432\u0430\u044F \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430</span>
            </button>
          </div>
          <button type="button" class="cs-fleet-yaml-link" id="cs-fleet-dropdown-raw-yaml-btn" style="background:none;border:none;cursor:pointer;color:inherit;font-size:inherit;padding:0;display:inline-flex;align-items:center;gap:4px;">
            <span>servers.yaml</span> ${ICONS.arrowRight}
          </button>
        `;
          footer.querySelector("#cs-fleet-dropdown-batch-btn")?.addEventListener("click", (e) => {
            e.stopPropagation();
            closeDropdown();
            openBatchInstallModal();
          });
          footer.querySelector("#cs-fleet-dropdown-raw-yaml-btn")?.addEventListener("click", (e) => {
            e.stopPropagation();
            closeDropdown();
            openRawYAMLModal();
          });
          dropdown.appendChild(footer);
        }
        function toggleDropdown() {
          isDropdownOpen = !isDropdownOpen;
          wrap.classList.toggle("open", isDropdownOpen);
          if (isDropdownOpen) {
            renderDropdown();
            dropdown.style.display = "flex";
            setTimeout(() => {
              document.addEventListener("click", handleClickOutside);
            }, 0);
          } else {
            closeDropdown();
          }
        }
        function closeDropdown() {
          isDropdownOpen = false;
          activeRenderCardsFn = null;
          wrap.classList.remove("open");
          dropdown.style.display = "none";
          document.removeEventListener("click", handleClickOutside);
        }
        function handleClickOutside(e) {
          if (!wrap.contains(e.target)) {
            closeDropdown();
          }
        }
        triggerBtn.addEventListener("click", toggleDropdown);
        wrap.appendChild(triggerBtn);
        wrap.appendChild(dropdown);
        container.appendChild(wrap);
        container._csUnsub = store.subscribe(() => {
          renderTrigger();
          if (isDropdownOpen && activeRenderCardsFn) {
            activeRenderCardsFn();
          }
        });
      }
    });
  }

  // src/ui/splitPanel.ts
  function registerSidebarPanel() {
    if (typeof window === "undefined" || !window.ConfigStudio?.registerSplitPanel) {
      return;
    }
    window.ConfigStudio.registerSplitPanel({
      id: "fleet-sidebar-panel",
      pluginId: PLUGIN_ID,
      title: "\u0424\u043B\u043E\u0442 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u0432",
      icon: "server",
      order: 3,
      render: (container) => {
        container._csUnsub?.();
        container.innerHTML = "";
        const panel = document.createElement("div");
        panel.className = "cs-fleet-sidebar-container";
        panel.innerHTML = `
        <div class="cs-fleet-sidebar-header">
          <span style="font-weight:700;font-size:12px;">\u0423\u0437\u043B\u044B \u0438\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u044F</span>
          <div style="display:flex;gap:6px;">
            <button class="cs-fleet-btn-secondary" id="cs-fleet-sidebar-batch-btn" title="\u041C\u0430\u0441\u0441\u043E\u0432\u0430\u044F \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0430\u0433\u0435\u043D\u0442\u0430" style="padding:4px 8px;font-size:11px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;">
              ${ICONS.agent} <span>\u041C\u0430\u0441\u0441\u043E\u0432\u0430\u044F \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430</span>
            </button>
            <button class="cs-fleet-add-btn" id="cs-fleet-sidebar-add-btn">${ICONS.plus} <span>\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C</span></button>
          </div>
        </div>
        <div class="cs-fleet-sidebar-body" id="cs-fleet-sidebar-list"></div>
      `;
        panel.querySelector("#cs-fleet-sidebar-batch-btn")?.addEventListener("click", () => {
          openBatchInstallModal();
        });
        panel.querySelector("#cs-fleet-sidebar-add-btn")?.addEventListener("click", () => {
          openEditModal(null);
        });
        const listEl = panel.querySelector("#cs-fleet-sidebar-list");
        function updateCards() {
          listEl.innerHTML = "";
          const servers = store.getServers();
          servers.forEach((s) => {
            const card = createServerCard(s, null);
            listEl.appendChild(card);
          });
        }
        updateCards();
        container.appendChild(panel);
        container._csUnsub = store.subscribe(() => {
          updateCards();
        });
      }
    });
  }

  // src/ui/sendFileModal.ts
  async function openSendToFleetModal(filename, fileContent) {
    const servers = store.getServers();
    const overlay = document.createElement("div");
    overlay.className = "cs-fleet-modal-overlay";
    const modal = document.createElement("div");
    modal.className = "cs-fleet-modal-content cs-fleet-modal-md";
    const targetOptions = servers.map((s) => {
      const isLocal = s.id === "localhost";
      const hasAgent = Boolean(s.connection?.agent?.enabled);
      const hasSSH = Boolean(s.connection?.ssh?.enabled || s.host);
      let badge = "LOCAL";
      let badgeColor = "blue";
      if (!isLocal) {
        if (hasAgent && hasSSH) {
          badge = "AGENT + SSH";
          badgeColor = "green";
        } else if (hasAgent) {
          badge = "AGENT";
          badgeColor = "green";
        } else if (hasSSH) {
          badge = "SSH";
          badgeColor = "purple";
        }
      }
      const ping = store.getPingData(s.id);
      return {
        value: s.id,
        label: s.name,
        subtitle: isLocal ? "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0445\u043E\u0441\u0442" : s.connection?.ssh?.host || s.connection?.agent?.url || s.host || s.id,
        badge,
        badgeColor,
        statusDot: ping?.status === "online" ? "online" : "offline",
        server: s
      };
    });
    let selectedTargetId = targetOptions[0]?.value || "localhost";
    let targetDropdownCtrl = null;
    modal.innerHTML = `
    <div class="cs-fleet-modal-header">
      <div style="display:flex;align-items:center;gap:8px;">
        ${ICONS.send}
        <span style="font-weight:700;font-size:14px;">\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0444\u0430\u0439\u043B \u043D\u0430 \u0443\u0437\u0435\u043B \u0444\u043B\u043E\u0442\u0430</span>
      </div>
      <button class="cs-fleet-modal-close">${ICONS.close}</button>
    </div>

    <div class="cs-fleet-modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px;">
      <div class="cs-fleet-form-group">
        <label class="cs-fleet-form-label">\u0424\u0430\u0439\u043B \u0434\u043B\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438</label>
        <input type="text" class="cs-fleet-form-input" value="${escapeHtml(filename)}" readonly style="opacity:0.75;cursor:not-allowed;" />
      </div>

      <div class="cs-fleet-form-group">
        <label class="cs-fleet-form-label">\u0426\u0435\u043B\u0435\u0432\u043E\u0439 \u0443\u0437\u0435\u043B \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F</label>
        <div id="fleet-send-target-container"></div>
      </div>

      <div class="cs-fleet-form-group">
        <label class="cs-fleet-form-label" id="fleet-send-dest-dir-label">\u0420\u0430\u0431\u043E\u0447\u0430\u044F \u043F\u0430\u043F\u043A\u0430 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F</label>
        <div style="display:flex;gap:8px;">
          <input type="text" class="cs-fleet-form-input" id="fleet-send-dest-dir" value="/opt/test" placeholder="/opt/test" style="flex:1;" />
          <button class="cs-fleet-btn-secondary" id="fleet-send-browse-btn" type="button" style="white-space:nowrap;">
            ${ICONS.folder} <span>\u041E\u0431\u0437\u043E\u0440...</span>
          </button>
        </div>
        <div id="fleet-send-folder-picker" style="display:none;" class="cs-remote-folder-picker">
          <div id="fleet-send-picker-crumbs" class="cs-remote-breadcrumbs"></div>
          <div id="fleet-send-picker-items" style="display:flex;flex-direction:column;gap:2px;"></div>
        </div>
      </div>

      <div class="cs-fleet-form-group">
        <label class="cs-fleet-form-label">\u0418\u043C\u044F \u0444\u0430\u0439\u043B\u0430 \u043D\u0430 \u0446\u0435\u043B\u0435\u0432\u043E\u043C \u0443\u0437\u043B\u0435</label>
        <input type="text" class="cs-fleet-form-input" id="fleet-send-dest-filename" value="${escapeHtml(filename)}" />
      </div>
    </div>

    <div class="cs-fleet-modal-footer">
      <div></div>
      <div style="display:flex;gap:8px;">
        <button class="cs-fleet-btn-secondary" id="fleet-send-cancel">\u041E\u0442\u043C\u0435\u043D\u0430</button>
        <button class="cs-fleet-btn-primary" id="fleet-send-submit">${ICONS.send} <span>\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C</span></button>
      </div>
    </div>
  `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    const closeModal = () => {
      try {
        targetDropdownCtrl?.destroy();
      } catch (_) {
      }
      overlay.remove();
    };
    modal.querySelector(".cs-fleet-modal-close")?.addEventListener("click", closeModal);
    modal.querySelector("#fleet-send-cancel")?.addEventListener("click", closeModal);
    const targetContainer = modal.querySelector("#fleet-send-target-container");
    const destDirLabel = modal.querySelector("#fleet-send-dest-dir-label");
    const destDirInput = modal.querySelector("#fleet-send-dest-dir");
    const destFilenameInput = modal.querySelector("#fleet-send-dest-filename");
    const browseBtn = modal.querySelector("#fleet-send-browse-btn");
    const pickerContainer = modal.querySelector("#fleet-send-folder-picker");
    const pickerCrumbs = modal.querySelector("#fleet-send-picker-crumbs");
    const pickerItems = modal.querySelector("#fleet-send-picker-items");
    const submitBtn = modal.querySelector("#fleet-send-submit");
    function updateTargetDirState(srvId) {
      selectedTargetId = srvId;
      const srv = servers.find((s) => s.id === srvId);
      if (srvId === "localhost") {
        destDirLabel.textContent = "\u0420\u0430\u0431\u043E\u0447\u0430\u044F \u043F\u0430\u043F\u043A\u0430 \u043D\u0430 \u0445\u043E\u0441\u0442\u0435 (Localhost)";
        destDirInput.placeholder = "\u041A\u043E\u0440\u0435\u043D\u044C \u0440\u0430\u0431\u043E\u0447\u0435\u0439 \u043E\u0431\u043B\u0430\u0441\u0442\u0438 (\u0438\u043B\u0438 \u043F\u043E\u0434\u043F\u0430\u043F\u043A\u0430)";
        destDirInput.value = typeof localStorage !== "undefined" && localStorage.getItem("cs_last_dir_local") || "";
      } else {
        destDirLabel.textContent = `\u0420\u0430\u0431\u043E\u0447\u0430\u044F \u043F\u0430\u043F\u043A\u0430 \u043D\u0430 ${srv?.name || srvId}`;
        destDirInput.placeholder = "/opt/test";
        destDirInput.value = typeof localStorage !== "undefined" && localStorage.getItem(`cs_last_dir_${srvId}`) || "/opt/test";
      }
      if (pickerActive) {
        loadFolderPicker(destDirInput.value || (srvId === "localhost" ? "" : "/"));
      }
    }
    if (window.ConfigStudio?.ui?.renderDropdown && targetContainer) {
      targetDropdownCtrl = window.ConfigStudio.ui.renderDropdown(targetContainer, {
        options: targetOptions,
        value: selectedTargetId,
        placeholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0446\u0435\u043B\u0435\u0432\u043E\u0439 \u0443\u0437\u0435\u043B...",
        searchable: targetOptions.length > 5,
        searchPlaceholder: "\u041F\u043E\u0438\u0441\u043A \u0443\u0437\u043B\u0430...",
        onChange: (val) => updateTargetDirState(val)
      });
    } else {
      targetContainer.innerHTML = `
      <select class="cs-fleet-form-select" id="fleet-send-target-select">
        ${targetOptions.map(
        (t) => `<option value="${escapeHtml(t.value)}" ${t.value === selectedTargetId ? "selected" : ""}>${escapeHtml(
          t.label
        )} (${escapeHtml(t.subtitle)})</option>`
      ).join("")}
      </select>
    `;
      const sel = targetContainer.querySelector("select");
      sel?.addEventListener("change", (e) => updateTargetDirState(e.target.value));
    }
    let pickerActive = false;
    browseBtn.addEventListener("click", () => {
      pickerActive = !pickerActive;
      pickerContainer.style.display = pickerActive ? "flex" : "none";
      if (pickerActive) {
        loadFolderPicker(destDirInput.value || (selectedTargetId === "localhost" ? "" : "/"));
      }
    });
    async function loadFolderPicker(dirPath) {
      pickerItems.innerHTML = '<div style="color:#8b949e;padding:6px;font-size:11px;">\u23F3 \u0427\u0442\u0435\u043D\u0438\u0435 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430...</div>';
      renderBreadcrumbs(dirPath);
      const targetServer = servers.find((s) => s.id === selectedTargetId);
      let items = [];
      try {
        if (selectedTargetId === "localhost") {
          const res = await fetch(`/api/fs/tree?path=${encodeURIComponent(dirPath)}`, {
            headers: { "X-ConfigStudio-Web": "1" }
          });
          if (res.ok) {
            const data = await res.json();
            items = (data.items || []).filter((i) => i.isDir);
          }
        } else if (targetServer?.connection?.agent?.enabled && targetServer.connection.agent.url) {
          const token = await getAgentAuthToken(targetServer);
          const res = await fetch(`/api/remote-proxy/api/fs/tree?path=${encodeURIComponent(dirPath)}`, {
            headers: {
              "X-ConfigStudio-Web": "1",
              "X-Remote-Target": targetServer.connection.agent.url,
              Authorization: `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            items = (data.items || []).filter((i) => i.isDir);
          }
        }
      } catch (err) {
        console.warn("[loadFolderPicker error]", err);
      }
      pickerItems.innerHTML = "";
      if (items.length === 0) {
        pickerItems.innerHTML = '<div style="color:#8b949e;padding:6px;font-size:11px;">(\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0445 \u043F\u043E\u0434\u043F\u0430\u043F\u043E\u043A)</div>';
        return;
      }
      items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "cs-remote-folder-item";
        row.innerHTML = `${ICONS.folder} <span>${escapeHtml(item.name)}</span>`;
        row.addEventListener("click", () => {
          let newPath = "";
          if (selectedTargetId === "localhost") {
            newPath = dirPath ? `${dirPath.replace(/\/+$/, "")}/${item.name}` : item.name;
          } else {
            newPath = dirPath === "/" ? `/${item.name}` : `${dirPath.replace(/\/+$/, "")}/${item.name}`;
          }
          destDirInput.value = newPath;
          loadFolderPicker(newPath);
        });
        pickerItems.appendChild(row);
      });
    }
    function renderBreadcrumbs(dirPath) {
      pickerCrumbs.innerHTML = "";
      const isLocal = selectedTargetId === "localhost";
      const rootCrumb = document.createElement("span");
      rootCrumb.className = "cs-remote-crumb";
      rootCrumb.textContent = isLocal ? "\u041A\u043E\u0440\u0435\u043D\u044C" : "/";
      rootCrumb.addEventListener("click", () => {
        destDirInput.value = isLocal ? "" : "/";
        loadFolderPicker(isLocal ? "" : "/");
      });
      pickerCrumbs.appendChild(rootCrumb);
      if (!dirPath || dirPath === "/") return;
      const parts = dirPath.split("/").filter(Boolean);
      let cumulative = "";
      parts.forEach((part) => {
        cumulative += "/" + part;
        const currentPath = isLocal ? cumulative.replace(/^\//, "") : cumulative;
        const c = document.createElement("span");
        c.className = "cs-remote-crumb";
        c.textContent = part;
        c.addEventListener("click", () => {
          destDirInput.value = currentPath;
          loadFolderPicker(currentPath);
        });
        pickerCrumbs.appendChild(c);
      });
    }
    submitBtn.addEventListener("click", async () => {
      const targetDir = destDirInput.value.trim();
      const targetFilename = destFilenameInput.value.trim() || filename;
      const targetServer = servers.find((s) => s.id === selectedTargetId);
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>\u23F3 \u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430...</span>`;
      try {
        if (selectedTargetId === "localhost") {
          const fullPath = targetDir ? `${targetDir.replace(/\/+$/, "")}/${targetFilename}` : targetFilename;
          await apiFetch("/api/fs/write", {
            method: "POST",
            body: JSON.stringify({ path: fullPath, content: fileContent })
          });
          if (typeof localStorage !== "undefined") localStorage.setItem("cs_last_dir_local", targetDir);
        } else if (targetServer?.connection?.agent?.enabled && targetServer.connection.agent.url) {
          const token = await getAgentAuthToken(targetServer);
          const fullPath = targetDir ? `${targetDir.replace(/\/+$/, "")}/${targetFilename}` : `/${targetFilename}`;
          const res = await fetch(`/api/remote-proxy/api/fs/write`, {
            method: "POST",
            headers: {
              "X-ConfigStudio-Web": "1",
              "X-Remote-Target": targetServer.connection.agent.url,
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ path: fullPath, content: fileContent })
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${res.status}`);
          }
          if (typeof localStorage !== "undefined") localStorage.setItem(`cs_last_dir_${targetServer.id}`, targetDir);
        } else if (targetServer?.connection?.ssh?.enabled || targetServer?.host) {
          const sshHost = targetServer.connection?.ssh?.host || targetServer.host || "";
          const sshPort = targetServer.connection?.ssh?.port || targetServer.port || 22;
          const sshUser = targetServer.connection?.ssh?.user || targetServer.user || "root";
          const sshIdentity = targetServer.connection?.ssh?.identity || targetServer.identity || "";
          const fullPath = targetDir ? `${targetDir.replace(/\/+$/, "")}/${targetFilename}` : `/root/${targetFilename}`;
          await apiFetch("/api/ssh/sftp/write", {
            method: "POST",
            body: JSON.stringify({
              host: sshHost,
              port: sshPort,
              user: sshUser,
              identityId: sshIdentity,
              path: fullPath,
              content: fileContent
            })
          });
          if (typeof localStorage !== "undefined") localStorage.setItem(`cs_last_dir_${targetServer.id}`, targetDir);
        }
        showToast(`\u0424\u0430\u0439\u043B "${targetFilename}" \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u043D\u0430 ${targetServer?.name || "Localhost"}!`, "success");
        if (typeof window.ConfigStudio?.refreshFiles === "function") {
          try {
            await window.ConfigStudio.refreshFiles();
          } catch (_) {
          }
        }
        closeModal();
      } catch (err) {
        showToast(`\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438: ${err.message}`, "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${ICONS.send} <span>\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C</span>`;
      }
    });
  }

  // src/ui/tokensModal.ts
  async function openTokensModal(server) {
    if (!server.connection?.agent?.enabled || !server.connection.agent.url) {
      showToast("\u0410\u0433\u0435\u043D\u0442 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D \u0434\u043B\u044F \u0434\u0430\u043D\u043D\u043E\u0433\u043E \u0443\u0437\u043B\u0430", "error");
      return;
    }
    const agentUrl = server.connection.agent.url;
    const overlay = document.createElement("div");
    overlay.className = "cs-fleet-modal-overlay";
    const modal = document.createElement("div");
    modal.className = "cs-fleet-modal-content cs-fleet-modal-md";
    modal.innerHTML = `
    <div class="cs-fleet-modal-header">
      <div style="display:flex;align-items:center;gap:8px;">
        ${ICONS.shield}
        <span style="font-weight:700;font-size:14px;">\u0422\u043E\u043A\u0435\u043D\u044B \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433\u0430 (${escapeHtml(server.name)})</span>
      </div>
      <button class="cs-fleet-modal-close">${ICONS.close}</button>
    </div>

    <div class="cs-fleet-modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px;">
      <p style="font-size:12px;color:#8b949e;margin:0;">
        \u0418\u0437\u043E\u043B\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 Read-Only \u0442\u043E\u043A\u0435\u043D\u044B \u0434\u043B\u044F Prometheus, Grafana, Zabbix \u0438\u043B\u0438 CI/CD. \u0418\u043C\u0435\u044E\u0442 \u0434\u043E\u0441\u0442\u0443\u043F \u0442\u043E\u043B\u044C\u043A\u043E \u043A \u043C\u0435\u0442\u0440\u0438\u043A\u0430\u043C \u0438 \u0442\u0435\u043B\u0435\u043C\u0435\u0442\u0440\u0438\u0438.
      </p>

      <div style="padding:12px;background:rgba(0,0,0,0.3);border:1px solid #30363d;border-radius:10px;display:flex;flex-direction:column;gap:10px;">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#00d2b4;">+ \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0442\u043E\u043A\u0435\u043D \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433\u0430</div>
        <div style="display:flex;gap:8px;">
          <input type="text" id="cs-new-tok-id" class="cs-fleet-form-input" placeholder="ID (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: prometheus)" style="flex:1;" />
          <input type="text" id="cs-new-tok-desc" class="cs-fleet-form-input" placeholder="\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" style="flex:1;" />
        </div>
        <div style="display:flex;gap:16px;font-size:12px;color:#c9d1d9;">
          <label style="cursor:pointer;"><input type="checkbox" id="top-metrics" checked style="accent-color:#00d2b4;"> metrics (Prometheus)</label>
          <label style="cursor:pointer;"><input type="checkbox" id="top-health" checked style="accent-color:#00d2b4;"> health (Uptime)</label>
        </div>
        <button type="button" id="cs-btn-create-tok" class="cs-fleet-btn-primary" style="align-self:flex-start;padding:6px 12px;font-size:11px;">\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0442\u043E\u043A\u0435\u043D</button>
      </div>

      <div id="cs-tokens-list" style="display:flex;flex-direction:column;gap:8px;max-height:220px;overflow-y:auto;">
        <div style="text-align:center;color:#8b949e;padding:10px;font-size:12px;">\u23F3 \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u043F\u0438\u0441\u043A\u0430 \u0442\u043E\u043A\u0435\u043D\u043E\u0432...</div>
      </div>
    </div>

    <div class="cs-fleet-modal-footer">
      <div></div>
      <button class="cs-fleet-btn-secondary cs-fleet-modal-close">\u0417\u0430\u043A\u0440\u044B\u0442\u044C</button>
    </div>
  `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    const closeModal = () => overlay.remove();
    modal.querySelectorAll(".cs-fleet-modal-close").forEach((b) => b.addEventListener("click", closeModal));
    const listContainer = modal.querySelector("#cs-tokens-list");
    async function loadTokens() {
      listContainer.innerHTML = '<div style="text-align:center;color:#8b949e;padding:10px;font-size:12px;">\u23F3 \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u043F\u0438\u0441\u043A\u0430 \u0442\u043E\u043A\u0435\u043D\u043E\u0432...</div>';
      try {
        const token = await getAgentAuthToken(server);
        const res = await fetch(`/api/remote-proxy/api/tokens`, {
          method: "GET",
          headers: {
            "X-ConfigStudio-Web": "1",
            Authorization: `Bearer ${token}`,
            "X-Remote-Target": agentUrl
          }
        });
        if (res.ok) {
          const data = await res.json();
          renderTokens(data.tokens || []);
        } else {
          listContainer.innerHTML = `<div style="color:#f87171;font-size:12px;">\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0442\u043E\u043A\u0435\u043D\u044B: HTTP ${res.status}</div>`;
        }
      } catch (e) {
        listContainer.innerHTML = `<div style="color:#f87171;font-size:12px;">\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0432\u044F\u0437\u0438: ${e.message}</div>`;
      }
    }
    function renderTokens(tokens) {
      if (tokens.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center;color:#8b949e;padding:10px;font-size:12px;">\u041D\u0435\u0442 \u0441\u043E\u0437\u0434\u0430\u043D\u043D\u044B\u0445 \u0442\u043E\u043A\u0435\u043D\u043E\u0432 \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433\u0430</div>';
        return;
      }
      listContainer.innerHTML = "";
      tokens.forEach((tok) => {
        const item = document.createElement("div");
        item.style.cssText = "padding:8px 10px;background:rgba(255,255,255,0.03);border:1px solid #30363d;border-radius:8px;display:flex;justify-content:space-between;align-items:center;font-size:12px;";
        item.innerHTML = `
        <div style="min-width:0;display:flex;flex-direction:column;gap:2px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-weight:600;color:#e6edf3;">${escapeHtml(tok.id)}</span>
            <span class="cs-remote-badge ro">${escapeHtml((tok.topics || []).join(", "))}</span>
          </div>
          <div style="font-family:monospace;font-size:11px;color:#8b949e;">${escapeHtml(tok.token)}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="cs-copy-tok cs-fleet-btn-secondary" style="padding:3px 8px;font-size:11px;">\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C</button>
          <button class="cs-del-tok cs-fleet-btn-danger" style="padding:3px 8px;font-size:11px;">\u0423\u0434\u0430\u043B\u0438\u0442\u044C</button>
        </div>
      `;
        item.querySelector(".cs-copy-tok").onclick = () => {
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(tok.token);
            showToast("\u0422\u043E\u043A\u0435\u043D \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D \u0432 \u0431\u0443\u0444\u0435\u0440 \u043E\u0431\u043C\u0435\u043D\u0430!", "success");
          } else {
            prompt("\u0421\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 \u0442\u043E\u043A\u0435\u043D:", tok.token);
          }
        };
        item.querySelector(".cs-del-tok").onclick = async () => {
          if (!confirm(`\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0442\u043E\u043A\u0435\u043D ${tok.id}?`)) return;
          const token = await getAgentAuthToken(server);
          await fetch(`/api/remote-proxy/api/tokens/${encodeURIComponent(tok.id)}`, {
            method: "DELETE",
            headers: {
              "X-ConfigStudio-Web": "1",
              Authorization: `Bearer ${token}`,
              "X-Remote-Target": agentUrl
            }
          });
          loadTokens();
        };
        listContainer.appendChild(item);
      });
    }
    const createBtn = modal.querySelector("#cs-btn-create-tok");
    createBtn.onclick = async () => {
      const idInp = modal.querySelector("#cs-new-tok-id");
      const descInp = modal.querySelector("#cs-new-tok-desc");
      const id = idInp.value.trim();
      const desc = descInp.value.trim();
      if (!id) {
        showToast("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 ID \u0442\u043E\u043A\u0435\u043D\u0430", "error");
        return;
      }
      const topics = [];
      if (modal.querySelector("#top-metrics")?.checked) topics.push("metrics");
      if (modal.querySelector("#top-health")?.checked) topics.push("health");
      try {
        const token = await getAgentAuthToken(server);
        const res = await fetch(`/api/remote-proxy/api/tokens`, {
          method: "POST",
          headers: {
            "X-ConfigStudio-Web": "1",
            Authorization: `Bearer ${token}`,
            "X-Remote-Target": agentUrl,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ id, description: desc, topics })
        });
        if (res.ok) {
          showToast(`\u0422\u043E\u043A\u0435\u043D ${id} \u0441\u043E\u0437\u0434\u0430\u043D!`, "success");
          idInp.value = "";
          descInp.value = "";
          loadTokens();
        } else {
          showToast(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0442\u043E\u043A\u0435\u043D\u0430: HTTP ${res.status}`, "error");
        }
      } catch (e) {
        showToast(`\u041E\u0448\u0438\u0431\u043A\u0430: ${e.message}`, "error");
      }
    };
    loadTokens();
  }

  // src/index.ts
  function initServersPlugin() {
    if (typeof window === "undefined" || !window.ConfigStudio) {
      return;
    }
    if (typeof window.ConfigStudio.registerContextMenu === "function") {
      window.ConfigStudio.registerContextMenu({
        id: "fleet-send-file",
        title: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043D\u0430 \u0443\u0437\u0435\u043B \u0444\u043B\u043E\u0442\u0430...",
        group: "fleet",
        order: 15,
        onClick: async (file) => {
          let filename = file?.name || "config.yaml";
          let content = file?.content;
          if (content === void 0) {
            const activeFile = window.ConfigStudio?.getActiveFile?.();
            if (activeFile && (!file || activeFile.name === file.name)) {
              content = window.ConfigStudio?.getActiveContent?.() || activeFile.content || "";
              filename = activeFile.name;
            } else if (file?.path) {
              try {
                const res = await fetch(`/api/fs/read?path=${encodeURIComponent(file.path)}`, {
                  headers: { "X-ConfigStudio-Web": "1" }
                });
                if (res.ok) {
                  const data = await res.json();
                  content = data.content || "";
                } else {
                  console.warn("[Fleet] Failed to read file for send:", res.statusText);
                }
              } catch (err) {
                console.warn("[Fleet] Error reading file for send:", err);
                showToast("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0444\u0430\u0439\u043B: " + (err.message || err), "warning");
              }
            }
          }
          openSendToFleetModal(filename, content || "");
        }
      });
    }
    registerHeaderSwitcher();
    registerSidebarPanel();
    if (window.ConfigStudio.services && typeof window.ConfigStudio.services.register === "function") {
      window.ConfigStudio.services.register(
        "fleet-manager",
        {
          getServers: () => store.getServers(),
          getActiveServer: () => store.getActiveServer(),
          switchServer: (id) => {
            const target = store.getServers().find((s) => s.id === id);
            if (target) fleet.selectServer(target);
          },
          pingServer: async (id) => {
            return await apiFetch(`/api/servers/ping/${encodeURIComponent(id)}`, { method: "POST" });
          },
          openBatchInstall: (ids) => {
            openBatchInstallModal(ids);
          },
          openManualAgent: (server) => {
            fleet.openManualAgentModal(server);
          }
        },
        PLUGIN_ID
      );
    }
    fleet.loadAndSyncServers();
  }
  if (typeof window !== "undefined") {
    initServersPlugin();
  }
  return __toCommonJS(index_exports);
})();
