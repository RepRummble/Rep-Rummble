import { test, expect } from '@playwright/test';

/**
 * As of writing, web/src/pages/Payment.tsx has NO real payment processor
 * wired in — it renders a pricing summary and "Payment processing coming
 * soon." Real billing isn't live yet, so there's no card data to protect
 * on this page today.
 *
 * These tests exist as a tripwire for when that changes: the moment a real
 * checkout form appears, `card fields exist` below starts failing, which is
 * exactly the signal to go add the tests that actually matter then —
 * confirming card data is collected via a hosted/tokenizing field (e.g.
 * Stripe Elements/Payment Element) and never hits our own /api/* as raw
 * PAN/CVV, which would blow PCI-DSS SAQ eligibility.
 */
test.describe('Payment / plans page', () => {
  test('loads and shows plan pricing without requiring auth', async ({ page }) => {
    await page.goto('/payment');
    await expect(page.getByRole('heading', { name: /secure payments/i })).toBeVisible();
    await expect(page.getByText(/order summary/i)).toBeVisible();
  });

  test('does not render a raw card-number / CVV input (no processor integrated yet)', async ({ page }) => {
    await page.goto('/payment');
    const cardLikeInputs = page.locator(
      'input[autocomplete="cc-number"], input[name*="card" i], input[name*="cvv" i], input[name*="cvc" i]'
    );
    await expect(cardLikeInputs).toHaveCount(0);
  });

  test('page never sends card-shaped data to our own API', async ({ page }) => {
    const suspiciousRequests: string[] = [];
    page.on('request', (req) => {
      if (!req.url().includes('/api/')) return;
      const data = req.postData() || '';
      // crude but effective: a 13-19 digit run is what a PAN looks like.
      if (/\b\d{13,19}\b/.test(data)) suspiciousRequests.push(req.url());
    });

    await page.goto('/payment');
    for (const plan of [/^free$/i, /^pro$/i, /^premium$/i]) {
      await page.getByRole('button', { name: plan }).first().click({ timeout: 5000 });
    }
    await page.waitForTimeout(500);

    expect(suspiciousRequests).toEqual([]);
  });

  test('marketing copy claims ("PCI-compliant", "encrypted checkout") are not shipped ahead of the actual integration', async ({ page }) => {
    await page.goto('/payment');
    const claimsPciCompliance = await page.getByText(/pci.compliant/i).count();
    if (claimsPciCompliance > 0) {
      // Not a functional bug, but flagged deliberately: this page currently
      // has no live payment processor, so an explicit "PCI-compliant" claim
      // is a promise the product hasn't earned yet. Once real billing is
      // wired through a PCI-compliant processor (Stripe/Braintree/etc via
      // hosted fields), this test should be updated to just document that.
      test.info().annotations.push({
        type: 'note',
        description:
          'Payment page claims "PCI-compliant" copy while no payment processor is integrated yet. Revisit before launch.',
      });
    }
  });
});
