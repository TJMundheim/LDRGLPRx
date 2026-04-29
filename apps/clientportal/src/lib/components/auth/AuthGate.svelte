<script lang="ts">
  import { currentUser } from '../../auth/store.svelte.js';
  import EmailEntry from './EmailEntry.svelte';
  import CodeEntry from './CodeEntry.svelte';

  interface Props {
    children?: import('svelte').Snippet;
  }

  const { children }: Props = $props();

  type Step = 'email' | 'code';
  let step = $state<Step>('email');
  let pendingEmail = $state('');
  let pendingSession = $state('');

  function onEmailSuccess(detail: { email: string; session: string }) {
    pendingEmail = detail.email;
    pendingSession = detail.session;
    step = 'code';
  }

  function onCodeSuccess() {
    // currentUser store is already updated by CodeEntry
  }

  function onBack() {
    step = 'email';
    pendingEmail = '';
    pendingSession = '';
  }
</script>

{#if currentUser.value}
  {@render children?.()}
{:else if step === 'email'}
  <EmailEntry onsuccess={onEmailSuccess} />
{:else}
  <CodeEntry
    email={pendingEmail}
    session={pendingSession}
    onsuccess={onCodeSuccess}
    onback={onBack}
  />
{/if}
