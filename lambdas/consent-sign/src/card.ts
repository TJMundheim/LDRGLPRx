// Step 2 of the e-sign flow: save a card for the prescription.
// Nothing is charged here — the coordinator charges it later, after the
// physician approves. No card digits ever reach this Lambda beyond last4.
import { page, esc } from './render';
import { formatPrice } from './lanes';

export interface CardStepOpts {
  laneLabel?: string;
  priceCents?: number;
  clientSecret: string;
  publishableKey: string;
  query: string;
}

/** "Biome NS Rx — $125 per 30-day supply" / "your prescription" when unset. */
export function productLine(laneLabel?: string, priceCents?: number): string {
  const price = formatPrice(priceCents);
  if (!laneLabel) return price ? `Your prescription — ${price} per 30-day supply` : 'Your prescription';
  return price ? `${laneLabel} — ${price} per 30-day supply` : laneLabel;
}

const NOT_CHARGED =
  'Nothing is charged today. Your card is charged only after the physician approves your prescription, and you’ll get a receipt.';

const SCRIPT = (pk: string, cs: string, query: string) => `
<script src="https://js.stripe.com/v3/"></script>
<script>
(function () {
  var stripe = Stripe(${JSON.stringify(pk)});
  var elements = stripe.elements({ clientSecret: ${JSON.stringify(cs)} });
  elements.create('payment', { layout: 'tabs' }).mount('#pe');
  var form = document.getElementById('cardform');
  var btn = document.getElementById('cardbtn');
  var errBox = document.getElementById('carderr');
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    btn.disabled = true; btn.textContent = 'Saving\\u2026'; errBox.textContent = '';
    stripe.confirmSetup({ elements: elements, redirect: 'if_required' }).then(function (res) {
      if (res.error || !res.setupIntent) {
        btn.disabled = false; btn.textContent = 'Save my card';
        errBox.textContent = (res.error && res.error.message) || 'We could not save that card. Please try again.';
        return;
      }
      var post = document.getElementById('postform');
      document.getElementById('sid').value = res.setupIntent.id;
      post.submit();
    });
  });
})();
</script>`;

export function renderCardStep(o: CardStepOpts): string {
  return page('Save a card for your prescription', `
<h1>Save a card for your prescription</h1>
<p>Your documents are signed and recorded. One last step.</p>
<div class="card">
<h2>${esc(productLine(o.laneLabel, o.priceCents))}</h2>
<p>${esc(NOT_CHARGED)}</p>
<form id="cardform">
<div id="pe"></div>
<div class="err" id="carderr" style="display:block;background:transparent;border:0;color:#991b1b;padding:6px 0"></div>
<button id="cardbtn" type="submit">Save my card</button>
</form>
<form id="postform" method="post" action="?${esc(o.query)}&amp;step=card">
<input type="hidden" id="sid" name="setupIntentId" value="">
</form>
<p class="legend">&mdash; Dr. TJ</p>
</div>${SCRIPT(o.publishableKey, o.clientSecret, o.query)}`);
}

export const renderCardError = (query: string, msg: string) =>
  page('Card not saved', `<div class="card"><h1>We could not save that card</h1>
<p>${esc(msg)}</p><p>Your signed documents are safe &mdash; only the card step needs another try.</p>
<p><a href="?${esc(query)}">Try again</a></p></div>`);

export const renderDone = (brand?: string, last4?: string) =>
  page('Signed and saved', `<div class="card"><h1>Signed and saved.</h1>
<p>Your privacy notice and authorization are recorded, and your card is on file${
    last4 ? ` (${esc(brand ?? 'card')} ····${esc(last4)})` : ''
  }.</p>
<p>${esc(NOT_CHARGED)}</p>
<p>Your care coordinator will confirm your next step. A copy of both signed documents has been emailed to you.</p></div>`);
