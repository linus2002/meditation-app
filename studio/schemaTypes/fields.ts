import { defineField } from 'sanity';

import { ID_DESCRIPTION } from './options';

/** The id the app uses in links, e.g. `box-breathing`. Lowercase words and dashes. */
export const idField = (source = 'title') =>
  defineField({
    name: 'slug',
    title: 'ID',
    type: 'slug',
    description: ID_DESCRIPTION,
    options: { source, maxLength: 64 },
    validation: (rule) =>
      rule.required().custom((value) =>
        !value?.current || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.current)
          ? true
          : 'Use lowercase letters, numbers and dashes only',
      ),
  });

/** Position in lists. Lower comes first. */
export const orderField = defineField({
  name: 'order',
  title: 'Order',
  type: 'number',
  description: 'Position in lists. Lower numbers come first.',
  validation: (rule) => rule.integer(),
});

/** An image plus the alt text read out by screen readers. */
export const imageFields = (name = 'image', title = 'Image', required = true) => [
  defineField({
    name,
    title,
    type: 'image',
    options: { hotspot: true },
    validation: (rule) => (required ? rule.required() : rule),
  }),
  defineField({
    name: `${name}Alt`,
    title: `${title} description`,
    type: 'string',
    description: 'What the picture shows, for people using a screen reader.',
    validation: (rule) => (required ? rule.required() : rule),
  }),
];
