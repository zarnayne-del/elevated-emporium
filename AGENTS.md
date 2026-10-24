# Project rules

- Keep order notifications in server-only modules and validate Telegram's acknowledgement before recording delivery; never log provider bodies or fetch exceptions because they can contain credentials.
- Keep checkout persistence independent of notification failure, and bound Telegram requests and message length so notifications cannot stall or invalidate checkout.