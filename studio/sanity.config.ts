import { defineConfig } from 'sanity';
import { structureTool, type StructureBuilder } from 'sanity/structure';
import { visionTool } from '@sanity/vision';

import { schemaTypes } from './schemaTypes';
import { analyticsTool } from './tools/analytics';
import { supportTool } from './tools/support';

/** The home screen's curated rows live in one fixed document. */
const HOME_PAGE_ID = 'homePage';

/** A list sorted by each document's Order field, the way the app shows it. */
const ordered = (S: StructureBuilder, type: string, title: string) =>
  S.listItem()
    .title(title)
    .schemaType(type)
    .child(S.documentTypeList(type).title(title).defaultOrdering([{ field: 'order', direction: 'asc' }]));

export default defineConfig({
  name: 'serenity',
  title: 'Serenity',
  projectId: 'jn0rojao',
  dataset: 'production',

  // Keep the sign-in as a token in the browser rather than a sanity.io cookie,
  // so the Analytics tab can show it to its Vercel function (api/posthog-api.ts),
  // which only answers members of this project.
  auth: { loginMethod: 'token' },

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Home screen')
              .id(HOME_PAGE_ID)
              .child(S.document().schemaType('homePage').documentId(HOME_PAGE_ID).title('Home screen')),
            S.divider(),
            ordered(S, 'meditation', 'Meditations'),
            ordered(S, 'program', 'Programmes'),
            ordered(S, 'yogaSession', 'Yoga'),
            ordered(S, 'story', 'Stories'),
            ordered(S, 'homeVideo', 'Videos'),
            S.divider(),
            ordered(S, 'category', 'Categories'),
            ordered(S, 'deckCard', 'Home shortcuts'),
            ordered(S, 'inspiration', 'Daily inspirations'),
            ordered(S, 'reflectionPrompt', 'Reflection prompts'),
          ]),
    }),
    visionTool(),
  ],

  // Analytics (a shared PostHog dashboard) and Support (concerns raised in the
  // app, kept in Neon) tabs beside the content.
  tools: (prev) => [...prev, analyticsTool, supportTool],

  schema: {
    types: schemaTypes,
    // The home screen is a single document, opened from its own menu item.
    templates: (templates) => templates.filter(({ schemaType }) => schemaType !== 'homePage'),
  },

  document: {
    actions: (actions, { schemaType }) =>
      schemaType === 'homePage'
        ? actions.filter(({ action }) => action && ['publish', 'discardChanges', 'restore'].includes(action))
        : actions,
  },
});
