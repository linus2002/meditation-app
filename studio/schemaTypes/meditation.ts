import { defineArrayMember, defineField, defineType } from 'sanity';

import { idField, imageFields, orderField } from './fields';
import { CATEGORIES, SOUNDSCAPES, TONES } from './options';

/** A playable session: the library, and the sessions inside programmes. */
export const meditation = defineType({
  name: 'meditation',
  title: 'Meditation',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    idField(),
    defineField({
      name: 'inLibrary',
      title: 'Show in the library',
      type: 'boolean',
      description:
        'Off for sessions that only belong to a programme; they still play from the programme’s page.',
      initialValue: true,
    }),
    defineField({ name: 'subtitle', title: 'Subtitle', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'narrator', title: 'Narrator', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: { list: CATEGORIES },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'durationMinutes',
      title: 'Length (minutes)',
      type: 'number',
      validation: (r) => r.required().integer().min(1),
    }),
    defineField({
      name: 'tone',
      title: 'Colour tone',
      type: 'string',
      options: { list: TONES },
      validation: (r) => r.required(),
    }),
    ...imageFields('image', 'Artwork'),
    defineField({
      name: 'cover',
      title: 'Player background (optional)',
      type: 'image',
      description:
        'Full-screen artwork behind the player, without lettering. Leave empty to use the artwork above.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'coverFocus',
      title: 'Player background focus (optional)',
      type: 'string',
      description: 'Which part stays in view in the tall player frame, e.g. "50% 30%".',
    }),
    defineField({
      name: 'soundscape',
      title: 'Soundscape',
      type: 'string',
      options: { list: SOUNDSCAPES },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'breathPattern',
      title: 'Breathing pattern',
      type: 'array',
      description: 'The phases the breathing circle follows, in order, repeated.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'breathPhase',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (r) => r.required() }),
            defineField({
              name: 'seconds',
              title: 'Seconds',
              type: 'number',
              validation: (r) => r.required().integer().min(1),
            }),
          ],
          preview: { select: { title: 'label', seconds: 'seconds' }, prepare: ({ title, seconds }) => ({ title: `${title} · ${seconds}s` }) },
        }),
      ],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: 'isSleep',
      title: 'Sleep session',
      type: 'boolean',
      description: 'Also show it on the Sleep screen.',
      initialValue: false,
    }),
    defineField({
      name: 'isDailyGoal',
      title: 'Daily goal session',
      type: 'boolean',
      initialValue: false,
    }),
    orderField,
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { title: 'title', subtitle: 'subtitle', media: 'image', inLibrary: 'inLibrary' },
    prepare: ({ title, subtitle, media, inLibrary }) => ({
      title,
      subtitle: inLibrary === false ? `Programme only · ${subtitle ?? ''}` : subtitle,
      media,
    }),
  },
});
