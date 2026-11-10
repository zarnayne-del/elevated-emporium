# Project rules

- Define page-specific branding metadata with the browser-safe brandHead helper; keep root metadata sitewide so page previews do not inherit unrelated copy or images.

- Keep order notifications in server-only modules and validate Telegram's acknowledgement before recording delivery; never log provider bodies or fetch exceptions because they can contain credentials.
- Keep checkout persistence independent of notification failure, and bound Telegram requests and message length so notifications cannot stall or invalidate checkout.
- Share lawful-order status definitions and forward-only transition checks between staff UI and server mutations to preserve existing statuses and prevent inconsistent updates.
- Public catalog access is limited by both RLS and application merchandise checks; privileged staff catalog reads remain unchanged to preserve records.
