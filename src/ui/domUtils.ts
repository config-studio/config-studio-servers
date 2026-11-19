/**
 * Safe DOM manipulation, HTML escaping and cross-version notification bridge
 */

export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function showToast(
  msg: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
): void {
  try {
    if (typeof window !== 'undefined' && window.ConfigStudio) {
      if (typeof window.ConfigStudio.showNotification === 'function') {
        window.ConfigStudio.showNotification(msg, type);
        return;
      }
      if (typeof window.ConfigStudio.showToast === 'function') {
        window.ConfigStudio.showToast(msg, type);
        return;
      }
      if (window.ConfigStudio.ui && typeof window.ConfigStudio.ui.toast === 'function') {
        window.ConfigStudio.ui.toast(msg, type);
        return;
      }
    }
    console.log(`[Toast ${type}]`, msg);
  } catch (err) {
    console.warn('[Toast fallback]', msg, err);
  }
}
