import { ServerNode } from '../types';
import { store } from '../state';
import { fleet } from '../fleet';
import { ICONS } from '../constants';
import { escapeHtml } from './domUtils';
import { openEditModal } from './editServerModal';
import { openInstallAgentDialog } from './agentInstallModal';

/**
 * Server Card UI Component
 * Renders an interactive card representing a fleet host (Local, Hybrid, SSH-only, Agent-only).
 */

export function createServerCard(s: ServerNode, onActionClose?: (() => void) | null): HTMLElement {
  const card = document.createElement('div');
  const isActive = s.id === store.getActiveServerId();
  card.className = `cs-fleet-card ${isActive ? 'active' : ''}`;

  const ping = store.getPingData(s.id) as any;
  const dotClass = ping.status === 'offline' ? 'offline' : (ping.status === 'warn' ? 'warn' : 'online');
  const pingText = ping.ms !== null ? `${ping.ms} ms` : (ping.status === 'offline' ? 'оффлайн' : '—');

  const hasAgent = Boolean(s.connection?.agent?.enabled);
  const hasSSH = Boolean(s.connection?.ssh?.enabled || s.connection?.ssh?.host || s.host || s.sshHostRef);
  const hostInfo = s.id === 'localhost' ? '127.0.0.1 • Localhost' : (s.connection?.ssh?.host || s.connection?.agent?.url || s.host || s.id);

  let badgeLabel = 'LOCAL';
  let badgeType = 'local';
  if (s.id !== 'localhost') {
    if (hasAgent && hasSSH) {
      badgeLabel = 'AGENT + SSH';
      badgeType = 'hybrid';
    } else if (hasAgent) {
      badgeLabel = 'AGENT';
      badgeType = 'agent';
    } else if (hasSSH) {
      badgeLabel = 'SSH';
      badgeType = 'ssh';
    } else {
      badgeLabel = 'OFFLINE';
      badgeType = 'local';
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
        ${s.id !== 'localhost' ? `<button class="cs-fleet-edit-btn" title="Настроить">${ICONS.edit}</button>` : ''}
      </div>
    </div>
    <div class="cs-fleet-card-meta">
      <div class="cs-fleet-card-host">${escapeHtml(hostInfo)}</div>
      ${s.group ? `<div class="cs-fleet-card-group-pill">[${escapeHtml(s.group)}]</div>` : ''}
    </div>
  `;

  if (s.id !== 'localhost') {
    const editBtn = card.querySelector('.cs-fleet-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onActionClose) onActionClose();
        openEditModal(s);
      });
    }
  }

  // Dynamic Action Buttons
  const actionsRow = document.createElement('div');
  if (s.id === 'localhost') {
    actionsRow.className = 'cs-fleet-card-actions cols-1';
    actionsRow.innerHTML = `
      <button class="cs-fleet-btn-action cs-fleet-btn-local">
        ${ICONS.host} <span>Локальные файлы</span>
      </button>
    `;
    actionsRow.querySelector('button')?.addEventListener('click', (e) => {
      e.stopPropagation();
      fleet.selectServer(s);
      if (onActionClose) onActionClose();
    });
  } else if (hasAgent && hasSSH) {
    // 4 BUTTONS HYBRID (Agent, SFTP, Shell, 1-Click Upgrade)
    actionsRow.className = 'cs-fleet-card-actions cols-4';
    actionsRow.innerHTML = `
      <button class="cs-fleet-btn-action cs-fleet-btn-agent" title="Файлы через Remote Agent (быстрый REST API с TOTP)">
        ${ICONS.agent} <span>Агент</span>
      </button>
      <button class="cs-fleet-btn-action cs-fleet-btn-sftp" title="Дерево директорий SFTP (нативный SSH SFTP клиент)">
        ${ICONS.sftp} <span>SFTP</span>
      </button>
      <button class="cs-fleet-btn-action cs-fleet-btn-shell" title="Открыть SSH PTY терминал к узлу">
        ${ICONS.shell} <span>Шелл</span>
      </button>
      <button class="cs-fleet-btn-action cs-fleet-btn-upgrade" title="1-Click Обновить Remote Agent по SSH">
        <span>⟳</span>
      </button>
    `;

    actionsRow.querySelector('.cs-fleet-btn-agent')?.addEventListener('click', (e) => {
      e.stopPropagation();
      fleet.selectServer(s, 'agent');
      if (onActionClose) onActionClose();
    });

    actionsRow.querySelector('.cs-fleet-btn-sftp')?.addEventListener('click', (e) => {
      e.stopPropagation();
      fleet.selectServer(s, 'sftp');
      if (onActionClose) onActionClose();
    });

    actionsRow.querySelector('.cs-fleet-btn-shell')?.addEventListener('click', (e) => {
      e.stopPropagation();
      fleet.launchShell(s);
      if (onActionClose) onActionClose();
    });

    actionsRow.querySelector('.cs-fleet-btn-upgrade')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onActionClose) onActionClose();
      openInstallAgentDialog(s, true);
    });
  } else if (hasSSH && !hasAgent) {
    // SSH ONLY: SFTP + Shell + Onboarding CTA
    actionsRow.className = 'cs-fleet-card-actions';
    actionsRow.innerHTML = `
      <button class="cs-fleet-btn-action cs-fleet-btn-sftp" title="SFTP проводник">
        ${ICONS.sftp} <span>SFTP</span>
      </button>
      <button class="cs-fleet-btn-action cs-fleet-btn-shell" title="SSH Шелл">
        ${ICONS.shell} <span>Шелл</span>
      </button>
      <button class="cs-fleet-btn-action cs-fleet-btn-agent" style="border-style:dashed;" title="1-Click Установка агента Config Studio по SSH">
        ${ICONS.agent} <span>+Агент</span>
      </button>
    `;

    actionsRow.querySelector('.cs-fleet-btn-sftp')?.addEventListener('click', (e) => {
      e.stopPropagation();
      fleet.selectServer(s, 'sftp');
      if (onActionClose) onActionClose();
    });

    actionsRow.querySelector('.cs-fleet-btn-shell')?.addEventListener('click', (e) => {
      e.stopPropagation();
      fleet.launchShell(s);
      if (onActionClose) onActionClose();
    });

    actionsRow.querySelector('.cs-fleet-btn-agent')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onActionClose) onActionClose();
      openInstallAgentDialog(s);
    });
  } else if (hasAgent && !hasSSH) {
    // Agent Only
    actionsRow.className = 'cs-fleet-card-actions cols-1';
    actionsRow.innerHTML = `
      <button class="cs-fleet-btn-action cs-fleet-btn-agent" title="Файлы через агент">
        ${ICONS.agent} <span>Агент</span>
      </button>
    `;

    actionsRow.querySelector('.cs-fleet-btn-agent')?.addEventListener('click', (e) => {
      e.stopPropagation();
      fleet.selectServer(s, 'agent');
      if (onActionClose) onActionClose();
    });
  }

  card.appendChild(actionsRow);

  // Clicking card itself activates default protocol
  card.addEventListener('click', () => {
    fleet.selectServer(s, 'auto');
    if (onActionClose) onActionClose();
  });

  return card;
}
