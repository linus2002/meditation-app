import { defineCliConfig } from 'sanity/cli';

import { posthogProxy } from './posthogProxy';
import { supportProxy } from './supportProxy';

export default defineCliConfig({
  api: { projectId: 'jn0rojao', dataset: 'production' },
  // The Analytics and Support tabs' private routes (dev server only).
  vite: (config) => ({ ...config, plugins: [...(config.plugins ?? []), posthogProxy(), supportProxy()] }),
});
