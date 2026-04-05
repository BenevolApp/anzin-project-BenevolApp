import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Désactiver le replay en prod pour économiser le quota
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
});
