import { defineArrayMember, defineField, defineType } from 'sanity';

import { idField, imageFields, orderField } from './fields';
import {
  CATEGORIES,
  CATEGORY_ICONS,
  INSPIRATION_TAGS,
  SOUNDSCAPES,
  STORY_CATEGORIES,
  TONES,
  YOGA_LEVELS,
} from './options';

export const program = defineType({
  name: 'program',
  title: 'Programme',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    idField(),
    defineField({ name: 'author', title: 'Guide', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'level', title: 'Level', type: 'string', description: 'e.g. Beginner', validation: (r) => r.required() }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 3, validation: (r) => r.required() }),
    defineField({
      name: 'sessions',
      title: 'Sessions, in order',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'meditation' }] })],
      validation: (r) => r.required().min(1).unique(),
    }),
    defineField({
      name: 'image',
      title: 'Artwork',
      type: 'image',
      options: { hotspot: true },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'scrim',
      title: 'Title shade',
      type: 'string',
      description: 'Tint over the artwork so the title stays readable, e.g. rgba(12,22,66,0.52).',
      validation: (r) => r.required(),
    }),
    orderField,
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'author', media: 'image' } },
});

export const story = defineType({
  name: 'story',
  title: 'Story',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    idField(),
    defineField({ name: 'description', title: 'One-line description', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: { list: STORY_CATEGORIES },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'voice', title: 'Narrator', type: 'string', validation: (r) => r.required() }),
    ...imageFields('image', 'Artwork'),
    defineField({
      name: 'soundscape',
      title: 'Soundscape',
      type: 'string',
      options: { list: SOUNDSCAPES },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'paragraphs',
      title: 'Story text',
      type: 'array',
      description: 'One entry per paragraph. Also read aloud, so write for the ear.',
      of: [defineArrayMember({ type: 'text', rows: 4 })],
      validation: (r) => r.required().min(1),
    }),
    orderField,
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'description', media: 'image' } },
});

export const yogaSession = defineType({
  name: 'yogaSession',
  title: 'Yoga session',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    idField(),
    defineField({ name: 'subtitle', title: 'Subtitle', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'focus', title: 'Focus', type: 'string', description: 'When or what it is for, e.g. Morning.', validation: (r) => r.required() }),
    defineField({
      name: 'level',
      title: 'Level',
      type: 'string',
      options: { list: YOGA_LEVELS },
      validation: (r) => r.required(),
    }),
    ...imageFields('image', 'Artwork'),
    defineField({
      name: 'soundscape',
      title: 'Soundscape',
      type: 'string',
      options: { list: SOUNDSCAPES },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 3, validation: (r) => r.required() }),
    defineField({
      name: 'poses',
      title: 'Poses, in order',
      type: 'array',
      description: 'The session length is the sum of the poses.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'pose',
          fields: [
            defineField({ name: 'name', title: 'Pose', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'seconds', title: 'Seconds', type: 'number', validation: (r) => r.required().integer().min(5) }),
            defineField({ name: 'cue', title: 'Instruction', type: 'text', rows: 2, validation: (r) => r.required() }),
            defineField({
              name: 'side',
              title: 'Side',
              type: 'string',
              description: 'Only for poses done once on each side.',
              options: { list: [{ title: 'Left', value: 'left' }, { title: 'Right', value: 'right' }] },
            }),
          ],
          preview: {
            select: { name: 'name', seconds: 'seconds', side: 'side' },
            prepare: ({ name, seconds, side }) => ({ title: `${name}${side ? ` (${side})` : ''} · ${seconds}s` }),
          },
        }),
      ],
      validation: (r) => r.required().min(1),
    }),
    orderField,
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'subtitle', media: 'image' } },
});

export const homeVideo = defineType({
  name: 'homeVideo',
  title: 'Video',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    idField(),
    defineField({ name: 'eyebrow', title: 'Small line under the title', type: 'string', description: 'e.g. 2 min watch', validation: (r) => r.required() }),
    defineField({
      name: 'video',
      title: 'Video file',
      type: 'file',
      description: 'Portrait (9:16) MP4. Smaller files load faster: 720p is plenty on a phone.',
      options: { accept: 'video/mp4' },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'poster',
      title: 'Poster image',
      type: 'image',
      description: 'A still shown on the card before the video loads.',
      validation: (r) => r.required(),
    }),
    orderField,
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'eyebrow', media: 'poster' } },
});

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  description: 'The six moods sessions are filed under. The set is fixed by the app.',
  fields: [
    defineField({
      name: 'slug',
      title: 'Category',
      type: 'string',
      options: { list: CATEGORIES },
      readOnly: ({ document }) => Boolean(document?._createdAt),
      validation: (r) => r.required(),
    }),
    defineField({ name: 'name', title: 'Display name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'sessionCount', title: 'Session count shown', type: 'number', validation: (r) => r.required().integer().min(0) }),
    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'string',
      options: { list: CATEGORY_ICONS },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'tone',
      title: 'Colour tone',
      type: 'string',
      options: { list: TONES },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'image', title: 'Tile artwork', type: 'image', options: { hotspot: true }, validation: (r) => r.required() }),
    orderField,
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'name', subtitle: 'slug', media: 'image' } },
});

export const deckCard = defineType({
  name: 'deckCard',
  title: 'Home shortcut',
  type: 'document',
  description: 'The menu buttons on the home screen (Daily Activities, Happiness, Relaxation).',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    idField(),
    defineField({ name: 'caption', title: 'Caption', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'href', title: 'Opens', type: 'string', description: 'An app path, e.g. /activities or /discover?category=happiness', validation: (r) => r.required() }),
    defineField({
      name: 'tone',
      title: 'Colour tone',
      type: 'string',
      options: { list: TONES },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'image', title: 'Artwork', type: 'image', options: { hotspot: true }, validation: (r) => r.required() }),
    orderField,
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'caption', media: 'image' } },
});

export const inspiration = defineType({
  name: 'inspiration',
  title: 'Daily inspiration',
  type: 'document',
  fields: [
    defineField({
      name: 'key',
      title: 'ID',
      type: 'string',
      description: 'Stored in readers’ history. Never change or reuse one.',
      validation: (r) => r.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { name: 'lowercase-with-dashes' }),
    }),
    defineField({ name: 'text', title: 'Message', type: 'text', rows: 2, validation: (r) => r.required().max(140) }),
    defineField({
      name: 'tags',
      title: 'Fits when',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: INSPIRATION_TAGS, layout: 'grid' },
      validation: (r) => r.required().min(1),
    }),
    orderField,
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'text', subtitle: 'key' } },
});

export const reflectionPrompt = defineType({
  name: 'reflectionPrompt',
  title: 'Reflection prompt',
  type: 'document',
  fields: [
    defineField({
      name: 'key',
      title: 'ID',
      type: 'string',
      description: 'Stored with each reader’s reflections. Never change or reuse one.',
      validation: (r) => r.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { name: 'lowercase-with-dashes' }),
    }),
    defineField({ name: 'question', title: 'Question', type: 'string', validation: (r) => r.required() }),
    orderField,
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'question', subtitle: 'key' } },
});

/** One document: what the home screen's curated rows show, in order. */
export const homePage = defineType({
  name: 'homePage',
  title: 'Home screen',
  type: 'document',
  fields: [
    defineField({
      name: 'recommended',
      title: 'Recommended',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'recommendedItem',
          fields: [
            defineField({ name: 'meditation', title: 'Session', type: 'reference', to: [{ type: 'meditation' }], validation: (r) => r.required() }),
            defineField({ name: 'collection', title: 'Label on the artwork', type: 'string', description: 'e.g. Sleep Collection', validation: (r) => r.required() }),
            defineField({ name: 'image', title: 'Card artwork (optional)', type: 'image', description: 'Leave empty to use the session’s own artwork.' }),
          ],
          preview: {
            select: { title: 'meditation.title', subtitle: 'collection', media: 'image', fallback: 'meditation.image' },
            prepare: ({ title, subtitle, media, fallback }) => ({ title, subtitle, media: media ?? fallback }),
          },
        }),
      ],
    }),
    defineField({
      name: 'today',
      title: 'Your meditations for today',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'todayItem',
          fields: [
            defineField({ name: 'meditation', title: 'Session', type: 'reference', to: [{ type: 'meditation' }], validation: (r) => r.required() }),
            defineField({ name: 'rating', title: 'Rating shown', type: 'number', validation: (r) => r.required().min(0).max(5) }),
          ],
          preview: {
            select: { title: 'meditation.title', rating: 'rating', media: 'meditation.image' },
            prepare: ({ title, rating, media }) => ({ title, subtitle: `★ ${rating}`, media }),
          },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Home screen' }) },
});
