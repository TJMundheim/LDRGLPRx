<script lang="ts">
  import WelcomeScreen from './WelcomeScreen.svelte';
  import IntakeForm from './IntakeForm.svelte';
  import IntakeReport from './IntakeReport.svelte';
  import CheckoutStub from './CheckoutStub.svelte';

  import { intakeSections } from '../../content/intakeQuestions';
  import { products } from '../../content/products';
  import { labs } from '../../content/labs';
  import { tiers } from '../../content/tiers';
  import { evaluateIntake } from '../../intake/router';
  import { buildIntakeReport } from '../../intake/report';
  import { submitDiscovery } from '../../api/operations.js';

  import type { IntakeAnswer } from '../../data/intake';
  import type { IntakeReport as IntakeReportType } from '../../intake/report';

  type Step = 'welcome' | 'intake' | 'report' | 'checkout';

  // ── Props ──────────────────────────────────────────────────────────────────
  interface Props {
    userId?: string;
    onGoToPricing?: (tierId: string) => void;
  }
  let { userId = 'local-user', onGoToPricing }: Props = $props();

  // ── Step state ────────────────────────────────────────────────────────────
  let step = $state<Step>('welcome');
  let report = $state<IntakeReportType | null>(null);
  let lastAnswers = $state<IntakeAnswer[]>([]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleStart(): void {
    step = 'intake';
  }

  function handleIntakeComplete(answers: IntakeAnswer[]): void {
    lastAnswers = answers;
    const result = evaluateIntake(answers, intakeSections);
    // Cast tiers — MembershipTier id is now string (extended in catalog.ts)
    report = buildIntakeReport(result, products, labs, tiers);
    step = 'report';
    // Fire-and-forget: persist discovery to the server. Failure is non-blocking.
    void submitDiscovery({
      answers: answers.map((a) => ({
        questionId: a.questionId,
        valueJson: JSON.stringify(a.value),
      })),
    }).catch(() => {
      // Best-effort submission — user can still see their report offline
    });
  }

  function handleCheckout(): void {
    step = 'checkout';
  }

  function handleBackToReport(): void {
    step = 'report';
  }
</script>

<div class="discovery-shell" data-step={step}>
  {#if step === 'welcome'}
    <WelcomeScreen onStart={handleStart} />

  {:else if step === 'intake'}
    <IntakeForm
      sections={intakeSections}
      {userId}
      onComplete={handleIntakeComplete}
    />

  {:else if step === 'report' && report !== null}
    <IntakeReport
      {report}
      onCheckout={handleCheckout}
      {onGoToPricing}
    />

  {:else if step === 'checkout' && report !== null}
    <CheckoutStub
      cart={report.suggestedCart}
      recommendedTier={report.recommendedTier}
      onBack={handleBackToReport}
    />

  {:else}
    <!-- Fallback — should not render in normal flow -->
    <div style="padding: 48px 20px; text-align: center; color: var(--text-muted, #9ba3b2);">
      Something went wrong. <button onclick={() => { step = 'welcome'; }}>Start over</button>
    </div>
  {/if}
</div>

<style>
  .discovery-shell {
    min-height: 100vh;
    background: var(--bg, #0f1117);
    color: var(--text, #e8eaf0);
  }
</style>
