import { defineCliConfig } from 'sanity/cli';

import { posthogProxy } from './posthogProxy';

export default defineCliConfig({
  api: { projectId: 'jn0rojao', dataset: 'production' },
  // The Analytics tab's private route to PostHog (dev server only).
  vite: (config) => ({ ...config, plugins: [...(config.plugins ?? []), posthogProxy()] }),
});
