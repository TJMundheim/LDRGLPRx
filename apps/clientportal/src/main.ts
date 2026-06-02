import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';
import { ingestAuditHandoff } from './lib/auth/audit-handoff';
import { registerSW } from 'virtual:pwa-register';

// SW registration: install the new SW in the background but DO NOT force a
// reload when it takes control. Auto-reloads during the auth handoff
// (especially the ?new=1 → EmailEntry auto-send → CodeEntry transition)
// were interrupting the flow and dropping users back on EmailEntry with the
// 'Send Code' button after the code had already been sent. Users now pick
// up the new code on their next natural navigation/refresh.
registerSW({
  immediate: true,
  // No onNeedRefresh handler — new SW activates silently in the background.
});

ingestAuditHandoff();

const target = document.getElementById('app');
if (!target) {
  throw new Error('#app mount point missing from index.html');
}

export default mount(App, { target });
