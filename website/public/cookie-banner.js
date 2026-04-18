/**
 * Cookie Consent Banner & Google Analytics Loader
 * For LDRGLPRx — matches the site design system (Inter font, brand colors).
 *
 * Usage: add <script src="cookie-banner.js"></script> before </body> on every page.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'ldrglprx_cookie_consent'; // 'accepted' | 'declined'

  // ── Google Analytics placeholder ──────────────────────────────────────────
  // Replace "G-XXXXXXXXXX" with your actual GA4 measurement ID.
  var GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

  /**
   * Loads the Google Analytics 4 script and initialises the dataLayer.
   * Called only when the user accepts cookies.
   */
  function loadGoogleAnalytics() {
    if (document.querySelector('script[src*="googletagmanager.com/gtag"]')) return;

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);
  }

  // ── Early exit if user already made a choice ──────────────────────────────
  var stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'accepted') {
    loadGoogleAnalytics();
    return;
  }
  if (stored === 'declined') {
    return;
  }

  // ── Build the banner ──────────────────────────────────────────────────────
  var banner = document.createElement('div');
  banner.id = 'cookie-consent-banner';

  // Styles — fixed bottom, slide-up animation, matching LDRGLPRx design system
  banner.style.cssText = [
    'position:fixed',
    'bottom:0',
    'left:0',
    'right:0',
    'z-index:10000',
    'background:#0a1628',
    'color:#ffffff',
    'font-family:"Inter",-apple-system,sans-serif',
    'font-size:0.95rem',
    'line-height:1.6',
    'padding:20px 24px',
    'display:flex',
    'flex-wrap:wrap',
    'align-items:center',
    'justify-content:center',
    'gap:16px',
    'box-shadow:0 -4px 24px rgba(0,0,0,0.25)',
    'transform:translateY(100%)',
    'transition:transform 0.45s cubic-bezier(0.22,1,0.36,1)',
  ].join(';');

  // Text
  var text = document.createElement('p');
  text.style.cssText = 'margin:0;max-width:680px;text-align:center;color:#cbd5e0;';
  text.innerHTML =
    'We use cookies to improve your experience and analyze site traffic. ' +
    'By continuing to use our site, you consent to our use of cookies. ' +
    '<a href="privacy.html" style="color:#00b894;text-decoration:underline;">Learn more</a>';

  // Button container
  var buttons = document.createElement('div');
  buttons.style.cssText = 'display:flex;gap:10px;flex-shrink:0;';

  // Accept button
  var acceptBtn = document.createElement('button');
  acceptBtn.textContent = 'Accept';
  acceptBtn.style.cssText = [
    'background:#00b894',
    'color:#ffffff',
    'border:none',
    'padding:10px 28px',
    'border-radius:8px',
    'font-family:inherit',
    'font-size:0.95rem',
    'font-weight:600',
    'cursor:pointer',
    'transition:background 0.2s',
  ].join(';');
  acceptBtn.addEventListener('mouseenter', function () { acceptBtn.style.background = '#00a381'; });
  acceptBtn.addEventListener('mouseleave', function () { acceptBtn.style.background = '#00b894'; });

  // Decline button
  var declineBtn = document.createElement('button');
  declineBtn.textContent = 'Decline';
  declineBtn.style.cssText = [
    'background:transparent',
    'color:#cbd5e0',
    'border:1px solid #cbd5e0',
    'padding:10px 28px',
    'border-radius:8px',
    'font-family:inherit',
    'font-size:0.95rem',
    'font-weight:600',
    'cursor:pointer',
    'transition:border-color 0.2s,color 0.2s',
  ].join(';');
  declineBtn.addEventListener('mouseenter', function () {
    declineBtn.style.borderColor = '#ffffff';
    declineBtn.style.color = '#ffffff';
  });
  declineBtn.addEventListener('mouseleave', function () {
    declineBtn.style.borderColor = '#cbd5e0';
    declineBtn.style.color = '#cbd5e0';
  });

  // Assemble
  buttons.appendChild(acceptBtn);
  buttons.appendChild(declineBtn);
  banner.appendChild(text);
  banner.appendChild(buttons);
  document.body.appendChild(banner);

  // ── Slide-up animation on next frame ──────────────────────────────────────
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      banner.style.transform = 'translateY(0)';
    });
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function hideBanner() {
    banner.style.transform = 'translateY(100%)';
    setTimeout(function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 500);
  }

  acceptBtn.addEventListener('click', function () {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    hideBanner();
    loadGoogleAnalytics();
  });

  declineBtn.addEventListener('click', function () {
    localStorage.setItem(STORAGE_KEY, 'declined');
    hideBanner();
  });
})();
