import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';
import { ingestAuditHandoff } from './lib/auth/audit-handoff';
import { registerSW } from 'virtual:pwa-register';

// Aggressive update strategy: when a new SW takes control, reload immediately so
// users see latest code without manually hard-refreshing. Pre-launch — no multi-tab concerns.
registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload();
  },
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

ingestAuditHandoff();

const target = document.getElementById('app');
if (!target) {
  throw new Error('#app mount point missing from index.html');
}

export default mount(App, { target });
