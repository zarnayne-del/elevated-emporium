# Mobile-compatible backend request path

## Root cause

The storefront catalog already uses a same-origin server function, but two customer flows still bypass the website and contact the backend storage/database hostname directly from the browser:

- Checkout uploads the payment screenshot with the browser backend client before calling the order server function. On affected cellular networks, that upload request cannot establish a connection, so checkout stops with `Failed to fetch` before the order is inserted.
- The homepage giveaway component reads prizes, entries, winners, and personal tickets directly with the browser backend client. Those requests fail on the same cellular path, so live counts remain unavailable or zero.
- The order confirmation page also reads the order phone number directly from the browser backend client.

The configured backend host is exposed to browser code through the required publishable `VITE_*` values, but customer-facing data operations should not depend on reaching that host. The app domain is the compatible public HTTPS boundary.

## Implementation

1. Add a validated server function for payment screenshot uploads. The browser sends the selected file to the website’s same-origin server-function endpoint; only the server contacts backend storage.
2. Keep order creation in the existing same-origin order server function, preserving the current database inserts, order-item validation, giveaway-entry trigger, and Telegram notification.
3. Add read-only same-origin giveaway server functions that return:
   - active prize
   - current ticket and participant counts
   - masked winner history
   - only the ticket IDs matching a submitted phone number
4. Update the homepage giveaway component to use those functions and remove all direct browser database queries.
5. Add a same-origin order-confirmation lookup and remove its direct browser database query.
6. Keep the current UI and design unchanged.

## Technical safeguards

- Validate file type and size server-side before upload.
- Return plain serializable DTOs from server functions.
- Load privileged backend clients only inside server handlers so secrets never enter browser bundles.
- Preserve existing products and inventory without updates, deletes, duplication, or reseeding.

## Verification

- Inspect browser network traffic and confirm product, giveaway, upload, order, and confirmation operations target only the app origin.
- Simulate the cellular failure by blocking the backend hostname in Playwright while leaving the app domain reachable.
- Verify products and giveaway statistics still load.
- Submit a test checkout with a real image file, verify the order exists and exactly one giveaway entry is created, then remove only the temporary test order and its dependent test data.
- Confirm the same flow works without the simulated block as the Wi-Fi-equivalent test.
