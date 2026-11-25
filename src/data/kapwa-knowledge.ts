import type { KapwaAction } from '@/data/kapwa';
import type { CategorySlug } from '@/types';

/**
 * Kapwa's knowledge base: the practices it can teach in the chat.
 *
 * The trusted source for Kapwa's guidance. Every item is written for Serenity
 * and versioned here, not pulled from the internet, and links to the
 * sessions, yoga, stories and sounds in the app that teach or deepen it.
 * Kapwa also suggests app meditations by `appCategories` and length
 * (lib/kapwa-knowledge), so new sessions added in Sanity are offered too.
 *
 * Review: every item starts as `draft`. Before a public release a qualified
 * reviewer reads each one, and its `review` is updated with their name, the
 * date and `approved`. lib/kapwa-knowledge.test.ts lists what is still draft.
 *
 * Kinds:
 *  - breathing, grounding, meditation, mindfulness, sleep: numbered steps,
 *    with seconds where timing matters (ready for a timed exercise runner).
 *  - journaling: prompts.
 *  - education: plain answers about practice, including its limits.
 */

export type PracticeKind =
  | 'breathing'
  | 'grounding'
  | 'meditation'
  | 'mindfulness'
  | 'sleep'
  | 'journaling'
  | 'education';

export interface PracticeStep {
  text: string;
  /** How long the step lasts, where timing matters. */
  seconds?: number;
}

export interface PracticeReview {
  author: string;
  /** Who approved it: a qualified person, by name and role. Empty while draft. */
  reviewer?: string;
  version: number;
  /** ISO date of the last review, once reviewed. */
  lastReviewed?: string;
  status: 'draft' | 'approved';
}

export interface Practice {
  /** Never rename: chat history and tests refer to it. */
  id: string;
  kind: PracticeKind;
  title: string;
  /** One sentence: what it is and when it helps. */
  summary: string;
  /** About how long it takes, in minutes. */
  minutes: number;
  /** Ways people ask for it by name, besides its title. Kept specific. */
  keywords: string[];
  /** Kapwa topics (data/kapwa-topics) where it is offered as something to try. */
  intents: string[];
  steps: PracticeStep[];
  /** When to stop, or who it isn't for. Shown with the steps. */
  caution?: string;
  /** Sessions, yoga, stories, sounds or screens in Serenity that go with it. */
  related: KapwaAction[];
  /** Meditation categories to look in for more sessions of a fitting length. */
  appCategories?: CategorySlug[];
  review: PracticeReview;
}

const med = (id: string): KapwaAction => ({ type: 'session', id });
const yoga = (id: string): KapwaAction => ({ type: 'yoga', id });
const story = (id: string): KapwaAction => ({ type: 'story', id });
const page = (href: string, label: string): KapwaAction => ({ type: 'page', href, label });

const DRAFT: PracticeReview = { author: 'Serenity content team', version: 1, status: 'draft' };

const BREATH_CAUTION = 'If you feel dizzy or short of breath, stop and breathe normally.';
const HOLD_CAUTION = `${BREATH_CAUTION} Holding your breath isn’t needed; skip the holds if they feel uncomfortable.`;

export const practices: Practice[] = [
  // ─── Breathing ────────────────────────────────────────────────────────────
  {
    id: 'box-breathing',
    kind: 'breathing',
    title: 'Box breathing',
    summary: 'Four even counts in, hold, out and hold. Steadies you when you feel tense or scattered.',
    minutes: 4,
    keywords: ['box breathing', 'square breathing', '4 4 4 4', 'four square breathing'],
    intents: ['breathing-exercise', 'pressure-burnout'],
    steps: [
      { text: 'Sit upright and let your shoulders drop. Breathe out fully.' },
      { text: 'Breathe in through your nose for a count of 4.', seconds: 4 },
      { text: 'Hold gently for 4.', seconds: 4 },
      { text: 'Breathe out slowly for 4.', seconds: 4 },
      { text: 'Hold, empty, for 4.', seconds: 4 },
      { text: 'Repeat for about 4 minutes, tracing the sides of a square in your mind.' },
    ],
    caution: HOLD_CAUTION,
    related: [med('box-breathing'), med('breath-school-box')],
    appCategories: ['breathing'],
    review: DRAFT,
  },
  {
    id: 'four-seven-eight',
    kind: 'breathing',
    title: '4-7-8 breathing',
    summary: 'A long hold and an even longer out-breath. Often used to wind down before sleep.',
    minutes: 3,
    keywords: ['4 7 8', '478', '4 7 8 breathing', 'four seven eight', 'relaxing breath'],
    intents: ['sleep-tonight', 'tired-cant-sleep', 'worry-tomorrow'],
    steps: [
      { text: 'Rest the tip of your tongue behind your top front teeth. Breathe out fully through your mouth.' },
      { text: 'Close your mouth and breathe in quietly through your nose for 4.', seconds: 4 },
      { text: 'Hold your breath for 7.', seconds: 7 },
      { text: 'Breathe out through your mouth for 8, with a soft whoosh.', seconds: 8 },
      { text: 'That is one round. Do four rounds, then breathe normally.' },
    ],
    caution: 'Start with four rounds; it can make you light-headed at first. Stop and breathe normally if it does.',
    related: [med('breath-school-four-seven-eight'), med('relaxing-breath'), med('sleep-mastery-night-breath')],
    appCategories: ['sleep', 'breathing'],
    review: DRAFT,
  },
  {
    id: 'coherent-breathing',
    kind: 'breathing',
    title: 'Coherent breathing',
    summary: 'Five seconds in, five seconds out: a slow, even rhythm that settles the body.',
    minutes: 5,
    keywords: ['coherent breathing', '5 in 5 out', 'five in five out', 'resonant breathing', 'equal breathing'],
    intents: ['breathing-exercise', 'mental-exhaustion', 'present-moment'],
    steps: [
      { text: 'Sit or lie comfortably. Let your breath slow down by itself first.' },
      { text: 'Breathe in through your nose for 5, filling your belly then chest.', seconds: 5 },
      { text: 'Breathe out through your nose for 5, letting it go smoothly.', seconds: 5 },
      { text: 'Keep this even rhythm for 5 minutes. No pauses, no forcing.' },
      { text: 'Finish by letting your breath return to its own pace, and notice how you feel.' },
    ],
    caution: BREATH_CAUTION,
    related: [med('coherent-breathing'), med('breath-school-coherent')],
    appCategories: ['breathing'],
    review: DRAFT,
  },
  {
    id: 'double-sigh',
    kind: 'breathing',
    title: 'The double sigh',
    summary: 'Two breaths in, one long breath out. The quickest way to take the edge off a stressful moment.',
    minutes: 1,
    keywords: ['double sigh', 'physiological sigh', 'cyclic sighing', 'sigh breathing', 'quick calm'],
    intents: ['calm-now', 'overwhelmed', 'fix-everything'],
    steps: [
      { text: 'Breathe in through your nose until your lungs feel almost full.', seconds: 2 },
      { text: 'Without breathing out, take a second short sip of air through your nose to top up.', seconds: 1 },
      { text: 'Breathe out slowly and fully through your mouth, longer than the in-breaths.', seconds: 6 },
      { text: 'Repeat two or three times, then breathe normally.' },
    ],
    caution: BREATH_CAUTION,
    related: [med('panic-pause'), med('letting-go-of-stress-reset')],
    appCategories: ['anxiety', 'breathing'],
    review: DRAFT,
  },
  {
    id: 'belly-breathing',
    kind: 'breathing',
    title: 'Belly breathing',
    summary: 'Breathing low into the belly instead of the chest. A good first breathing practice.',
    minutes: 5,
    keywords: ['belly breathing', 'diaphragmatic breathing', 'abdominal breathing', 'deep breathing'],
    intents: ['breathing-exercise', 'mental-exhaustion'],
    steps: [
      { text: 'Lie down or sit back. Put one hand on your chest and one on your belly.' },
      { text: 'Breathe in through your nose so the hand on your belly rises, and the chest hand stays still.', seconds: 4 },
      { text: 'Breathe out through slightly pursed lips and feel the belly fall.', seconds: 6 },
      { text: 'Continue for 5 minutes. If your chest takes over, gently return to the belly.' },
    ],
    caution: BREATH_CAUTION,
    related: [med('breath-school-belly'), med('calm-foundations-breath')],
    appCategories: ['breathing'],
    review: DRAFT,
  },
  {
    id: 'long-exhale',
    kind: 'breathing',
    title: 'Long out-breath',
    summary: 'Breathing out for longer than you breathe in. Simple, and it slows a racing body.',
    minutes: 3,
    keywords: ['long exhale', 'longer exhale', 'extended exhale', 'long out breath', 'breathe out longer'],
    intents: ['calm-now', 'active-mind-night', 'release-thoughts', 'grounded'],
    steps: [
      { text: 'Breathe in through your nose for 4.', seconds: 4 },
      { text: 'Breathe out slowly through your mouth for 6, or 8 if it feels easy.', seconds: 6 },
      { text: 'Keep going for about 3 minutes. Let each out-breath soften your shoulders and jaw.' },
    ],
    caution: BREATH_CAUTION,
    related: [med('sleep-mastery-long-exhale'), med('letting-go-of-stress-release')],
    appCategories: ['breathing', 'relaxation'],
    review: DRAFT,
  },
  {
    id: 'energising-breath',
    kind: 'breathing',
    title: 'Energising breath',
    summary: 'A brighter, quicker rhythm for a sluggish morning or a mid-afternoon dip.',
    minutes: 2,
    keywords: ['energising breath', 'energizing breath', 'breath for energy', 'wake up breath', 'morning breath'],
    intents: ['morning-routine'],
    steps: [
      { text: 'Sit tall with your feet on the floor.' },
      { text: 'Breathe in through your nose for 2, briskly.', seconds: 2 },
      { text: 'Breathe out through your nose for 2.', seconds: 2 },
      { text: 'Continue for 30 seconds, then take one long slow breath. Rest.' },
      { text: 'Repeat two more rounds, then notice the energy in your body.' },
    ],
    caution:
      'Stop if you feel dizzy. Skip this one when you feel anxious or panicky, and during pregnancy; a long out-breath suits those times better.',
    related: [med('better-mornings-energy'), yoga('afternoon-energy')],
    appCategories: ['breathing'],
    review: DRAFT,
  },

  // ─── Grounding ────────────────────────────────────────────────────────────
  {
    id: 'five-senses',
    kind: 'grounding',
    title: '5-4-3-2-1 grounding',
    summary: 'Using your five senses to come back to the room. Helps when thoughts or feelings pull you away.',
    minutes: 3,
    keywords: ['5 4 3 2 1', '54321', 'five senses', 'grounding technique', 'grounding exercise', 'senses exercise'],
    intents: ['grounded', 'calm-now', 'uncertainty', 'present-moment'],
    steps: [
      { text: 'Look around and name 5 things you can see.' },
      { text: 'Notice 4 things you can feel: your feet, your clothes, the chair, the air.' },
      { text: 'Listen for 3 things you can hear, near and far.' },
      { text: 'Find 2 things you can smell, or remember two smells you like.' },
      { text: 'Notice 1 thing you can taste.' },
      { text: 'Take one slow breath and say to yourself: “I’m here, right now.”' },
    ],
    related: [med('steady-mind-anchor'), med('steady-mind-steady-ground')],
    appCategories: ['anxiety'],
    review: DRAFT,
  },
  {
    id: 'feet-on-floor',
    kind: 'grounding',
    title: 'Feet on the floor',
    summary: 'A quiet, invisible grounding you can do anywhere, even in a meeting.',
    minutes: 2,
    keywords: ['feet on the floor', 'feel my feet', 'grounding through feet', 'anchor in the feet'],
    intents: ['grounded', 'uncertainty'],
    steps: [
      { text: 'Press both feet into the floor. Notice the pressure, the temperature, your heels and toes.', seconds: 20 },
      { text: 'Feel the weight of your body in the chair or on your legs.', seconds: 20 },
      { text: 'Breathe out slowly, imagining the breath going down into the ground.', seconds: 20 },
      { text: 'Gently wiggle your toes. Say silently: “Feet on the floor. I’m here.”', seconds: 20 },
    ],
    related: [med('steady-mind-anchor'), yoga('steady-balance')],
    appCategories: ['anxiety'],
    review: DRAFT,
  },
  {
    id: 'name-it',
    kind: 'grounding',
    title: 'Name the feeling',
    summary: 'Putting a simple word to what you feel. Naming a feeling often softens it a little.',
    minutes: 3,
    keywords: ['name the feeling', 'name it to tame it', 'label my feelings', 'labelling emotions', 'labeling emotions'],
    intents: ['accept-feelings', 'feel-today', 'sad-no-reason', 'pretending-okay'],
    steps: [
      { text: 'Pause and take one breath. Ask: “What am I feeling right now?”' },
      { text: 'Find where it sits in your body: chest, throat, stomach, shoulders?' },
      { text: 'Give it a simple name, silently: “This is worry.” “This is sadness.” A guess is fine.' },
      { text: 'Add: “It’s okay to feel this.” Breathe out slowly.' },
      { text: 'Notice whether it changes, even slightly, once it has a name.' },
    ],
    related: [med('steady-mind-name-it'), page('/reflections', 'Open Reflections')],
    appCategories: ['anxiety'],
    review: DRAFT,
  },
  {
    id: 'hand-on-heart',
    kind: 'grounding',
    title: 'Hand on heart',
    summary: 'A small gesture of comfort. Warmth and gentle pressure help a body feel safer.',
    minutes: 2,
    keywords: ['hand on heart', 'hand on my heart', 'self soothing', 'soothing touch'],
    intents: ['self-kindness', 'hard-on-self', 'not-good-enough', 'lonely', 'missing-someone'],
    steps: [
      { text: 'Place one hand, or both, on your chest. Feel its warmth.', seconds: 15 },
      { text: 'Breathe slowly and feel your chest rise and fall under your hand.', seconds: 45 },
      { text: 'Say to yourself: “This is hard right now. May I be kind to myself.”', seconds: 15 },
      { text: 'Stay a little longer if it helps. You can also try a hand on your cheek or your belly.' },
    ],
    related: [med('kind-to-yourself-hand-on-heart'), med('self-compassion')],
    appCategories: ['happiness'],
    review: DRAFT,
  },

  // ─── Meditation techniques ────────────────────────────────────────────────
  {
    id: 'breath-awareness',
    kind: 'meditation',
    title: 'Breath awareness meditation',
    summary: 'Resting your attention on the breath and coming back when you drift. The heart of most meditation.',
    minutes: 5,
    keywords: ['breath awareness', 'mindful breathing', 'focus on my breath', 'basic meditation', 'simple meditation'],
    intents: ['beginner-routine', 'daily-habit', 'thought-awareness'],
    steps: [
      { text: 'Sit comfortably, back upright but not stiff. Close your eyes or lower your gaze.' },
      { text: 'Take three slower breaths, then let your breathing be natural.', seconds: 20 },
      { text: 'Notice where you feel the breath most: nostrils, chest or belly. Rest your attention there.', seconds: 60 },
      { text: 'When your mind wanders, notice where it went, and gently come back. Every return is the practice.', seconds: 180 },
      { text: 'For the last moments, let go of focusing. Just sit. Then open your eyes.', seconds: 40 },
    ],
    related: [med('breath-school-natural'), med('calm-foundations-breath'), med('free-your-mind')],
    appCategories: ['focus', 'breathing'],
    review: DRAFT,
  },
  {
    id: 'body-scan',
    kind: 'meditation',
    title: 'Body scan',
    summary: 'Moving your attention slowly through the body, noticing without changing. Relaxing and grounding.',
    minutes: 10,
    keywords: ['body scan', 'body scan meditation', 'scan my body', 'head to toe'],
    intents: ['body-relaxation', 'tired-cant-sleep', 'mental-exhaustion'],
    steps: [
      { text: 'Lie down or sit back. Close your eyes and take a few slow breaths.', seconds: 30 },
      { text: 'Bring your attention to your toes and feet. Notice warmth, pressure, tingling, or nothing at all.', seconds: 60 },
      { text: 'Move slowly up: ankles, calves, knees, thighs. Let each part soften as you notice it.', seconds: 120 },
      { text: 'Hips, belly, lower and upper back. Breathe into any tight places.', seconds: 120 },
      { text: 'Hands, arms, shoulders, neck. Let the shoulders drop.', seconds: 120 },
      { text: 'Jaw, mouth, eyes, forehead, the top of your head.', seconds: 90 },
      { text: 'Finally, feel the whole body at once, breathing. Rest here.', seconds: 60 },
    ],
    caution: 'If attention to a part of the body is upsetting, skip it, open your eyes, or shift to the feeling of your feet.',
    related: [med('body-scan'), med('sleepy-body-scan'), med('calm-foundations-body')],
    appCategories: ['relaxation', 'sleep'],
    review: DRAFT,
  },
  {
    id: 'loving-kindness',
    kind: 'meditation',
    title: 'Loving-kindness meditation',
    summary: 'Silently offering warm wishes to yourself and others. Softens self-criticism and loneliness.',
    minutes: 8,
    keywords: ['loving kindness', 'metta', 'kindness meditation', 'compassion meditation', 'warm wishes'],
    intents: ['self-kindness', 'appreciate-self', 'lonely', 'forgive-other', 'let-go-person'],
    steps: [
      { text: 'Sit comfortably and take a few slow breaths. Place a hand on your heart if you like.', seconds: 30 },
      { text: 'Repeat silently, slowly: “May I be safe. May I be well. May I be at ease.”', seconds: 120 },
      { text: 'Picture someone you love. Offer them the same wishes: “May you be safe…”', seconds: 90 },
      { text: 'Picture someone neutral, like a neighbour or a cashier. Offer the wishes to them.', seconds: 90 },
      { text: 'If you feel ready, picture someone difficult. Offer what you can, even a little.', seconds: 60 },
      { text: 'End with everyone: “May all beings be safe, well and at ease.”', seconds: 60 },
    ],
    caution: 'If the wishes feel empty or stir up sadness, that’s normal. Stay with yourself or someone easy for now.',
    related: [med('kind-to-yourself-warm-wishes'), med('six-phase-connection'), med('open-heart')],
    appCategories: ['happiness'],
    review: DRAFT,
  },
  {
    id: 'noting',
    kind: 'meditation',
    title: 'Noting thoughts',
    summary: 'Giving each passing thought a one-word label. Helps you watch thoughts instead of following them.',
    minutes: 5,
    keywords: ['noting', 'noting meditation', 'labelling thoughts', 'labeling thoughts', 'watch my thoughts'],
    intents: ['overthinking', 'thought-awareness', 'replaying'],
    steps: [
      { text: 'Sit comfortably and rest your attention on your breath.', seconds: 30 },
      { text: 'When a thought appears, label it gently with one word: “planning”, “worrying”, “remembering”, “judging”.', seconds: 180 },
      { text: 'After labelling, return to the breath. No need to finish the thought.', seconds: 60 },
      { text: 'Notice which labels come up most often. That’s what your mind is busy with today.', seconds: 30 },
    ],
    related: [med('steady-mind-observer'), med('calm-foundations-thoughts')],
    appCategories: ['focus', 'anxiety'],
    review: DRAFT,
  },
  {
    id: 'counting-breaths',
    kind: 'meditation',
    title: 'Counting breaths',
    summary: 'Counting each out-breath from one to ten. A simple anchor for a busy or distracted mind.',
    minutes: 5,
    keywords: ['counting breaths', 'count my breaths', 'breath counting', 'count to ten'],
    intents: ['intentional-time', 'overthinking', 'clear-mind'],
    steps: [
      { text: 'Sit comfortably and breathe naturally.' },
      { text: 'Silently count “one” on your next out-breath, “two” on the next, up to ten.', seconds: 60 },
      { text: 'At ten, start again at one.', seconds: 180 },
      { text: 'If you lose count or find yourself at 23, smile and start at one. That’s part of it.', seconds: 60 },
    ],
    related: [med('focus-reset-single-point'), med('deep-focus'), med('focus-reset-wandering')],
    appCategories: ['focus'],
    review: DRAFT,
  },
  {
    id: 'calm-place',
    kind: 'meditation',
    title: 'Calm place visualisation',
    summary: 'Imagining a place where you feel safe and at ease, in full detail. Restful when the day feels heavy.',
    minutes: 6,
    keywords: ['visualisation', 'visualization', 'calm place', 'safe place', 'happy place', 'guided imagery'],
    intents: ['emotionally-drained', 'uncertainty', 'peace-meaning'],
    steps: [
      { text: 'Close your eyes and take a few slow breaths.', seconds: 30 },
      { text: 'Picture a place where you feel calm: real or imagined, a beach, a garden, a room.', seconds: 60 },
      { text: 'Notice what you see there: colours, light, shapes.', seconds: 60 },
      { text: 'What can you hear? Feel? Smell? Fill in the details slowly.', seconds: 90 },
      { text: 'Let your body take in how calm it is here. Breathe.', seconds: 60 },
      { text: 'Know you can come back any time. Then slowly open your eyes.', seconds: 30 },
    ],
    related: [med('open-water-shoreline'), med('ocean-drift'), story('greenhouse')],
    appCategories: ['relaxation'],
    review: DRAFT,
  },
  {
    id: 'walking-meditation',
    kind: 'meditation',
    title: 'Walking meditation',
    summary: 'Paying attention to each step. For when sitting still feels too hard.',
    minutes: 10,
    keywords: ['walking meditation', 'mindful walking', 'meditate while walking', 'walk mindfully'],
    intents: ['present-moment', 'consistency', 'mental-exhaustion'],
    steps: [
      { text: 'Find a space where you can walk 10 to 20 steps, inside or out.' },
      { text: 'Stand still for a moment and feel your weight in your feet.', seconds: 30 },
      { text: 'Walk slowly. Notice each foot lifting, moving and touching down.', seconds: 240 },
      { text: 'When you reach the end, pause, turn slowly, and walk back.', seconds: 240 },
      { text: 'When your mind wanders, bring it back to the feeling of your feet.', seconds: 60 },
    ],
    related: [med('mindful-walk'), med('better-mornings-step-out')],
    appCategories: ['focus'],
    review: DRAFT,
  },
  {
    id: 'open-awareness',
    kind: 'meditation',
    title: 'Open awareness',
    summary: 'Letting sounds, sensations and thoughts come and go without choosing one. Spacious and calm.',
    minutes: 8,
    keywords: ['open awareness', 'open monitoring', 'choiceless awareness', 'just sitting'],
    intents: ['peace-meaning', 'holding-on', 'accept-feelings'],
    steps: [
      { text: 'Start with a minute of breath awareness to settle.', seconds: 60 },
      { text: 'Widen your attention to include sounds around you, coming and going.', seconds: 120 },
      { text: 'Include sensations in the body, and any thoughts or feelings, as they arise.', seconds: 120 },
      { text: 'Don’t follow anything. Let it all pass, like weather in a wide sky.', seconds: 120 },
      { text: 'Return to the breath for a few moments, then open your eyes.', seconds: 60 },
    ],
    related: [med('open-water-open-sea'), med('letting-go-of-stress-room')],
    appCategories: ['relaxation'],
    review: DRAFT,
  },

  // ─── Everyday mindfulness ─────────────────────────────────────────────────
  {
    id: 'stop-practice',
    kind: 'mindfulness',
    title: 'The STOP practice',
    summary: 'Stop, Take a breath, Observe, Proceed. A one-minute pause for the middle of a busy day.',
    minutes: 1,
    keywords: ['stop practice', 'stop technique', 'one minute pause', 'pause practice', 'mindful pause'],
    intents: ['clear-mind', 'fix-everything', 'pressure-burnout', 'small-habits'],
    steps: [
      { text: 'S, Stop: pause what you’re doing.', seconds: 5 },
      { text: 'T, Take a breath: one slow breath, feeling it in your body.', seconds: 10 },
      { text: 'O, Observe: what’s here? Thoughts, feelings, body sensations. Just notice.', seconds: 30 },
      { text: 'P, Proceed: carry on with what matters, a little more awake.', seconds: 15 },
    ],
    related: [med('midday-reset'), med('letting-go-of-stress-reset')],
    appCategories: ['focus'],
    review: DRAFT,
  },
  {
    id: 'mindful-drink',
    kind: 'mindfulness',
    title: 'Mindful cup of tea',
    summary: 'Turning an ordinary drink into a few minutes of full attention.',
    minutes: 5,
    keywords: ['mindful tea', 'mindful coffee', 'mindful drinking', 'mindful eating', 'mindful cup'],
    intents: ['present-moment', 'me-time', 'small-habits'],
    steps: [
      { text: 'Hold your cup in both hands. Feel its warmth and weight.' },
      { text: 'Look at it: the colour, the steam, the light on the surface.' },
      { text: 'Smell it before the first sip.' },
      { text: 'Take a small sip and notice taste, temperature, swallowing.' },
      { text: 'Drink the rest slowly, without your phone, as if it’s the only thing to do.' },
    ],
    related: [med('calm-foundations-everyday'), story('morning-kitchen')],
    appCategories: ['focus'],
    review: DRAFT,
  },
  {
    id: 'mindful-listening',
    kind: 'mindfulness',
    title: 'Mindful listening',
    summary: 'Resting your attention on sounds, letting them come and go. Good for a noisy, busy mind.',
    minutes: 3,
    keywords: ['mindful listening', 'listening meditation', 'sound meditation', 'listen to sounds'],
    intents: ['overthinking', 'present-moment'],
    steps: [
      { text: 'Close your eyes and let your breathing settle.' },
      { text: 'Notice the nearest sound. Then the furthest one you can hear.', seconds: 60 },
      { text: 'Hear sounds as just sound: rising, changing, fading. No need to name them.', seconds: 90 },
      { text: 'Notice the quiet between sounds, too.', seconds: 30 },
    ],
    related: [{ type: 'sound', id: 'forest' }, { type: 'sound', id: 'bowl' }],
    appCategories: ['relaxation'],
    review: DRAFT,
  },
  {
    id: 'three-good-things',
    kind: 'mindfulness',
    title: 'Three good things',
    summary: 'Noticing three things that went well each day, and why. Gently trains attention toward the good.',
    minutes: 5,
    keywords: ['three good things', '3 good things', 'gratitude practice', 'gratitude exercise', 'gratitude list'],
    intents: ['gratitude', 'appreciate-self', 'night-routine'],
    steps: [
      { text: 'At the end of the day, think of three things that went well, big or small.' },
      { text: 'Write each one down, if you can.' },
      { text: 'Next to each, write why it happened, or what part you played in it.' },
      { text: 'Pause on one and let yourself feel it again for a few breaths.' },
    ],
    related: [med('six-phase-gratitude'), med('evening-gratitude'), page('/reflections', 'Open Reflections')],
    appCategories: ['happiness'],
    review: DRAFT,
  },
  {
    id: 'worry-time',
    kind: 'mindfulness',
    title: 'Worry time',
    summary: 'Giving worries a set time each day, so they don’t take all the rest of it.',
    minutes: 15,
    keywords: ['worry time', 'scheduled worry', 'worry window', 'worry period'],
    intents: ['worry-control', 'overthinking', 'worry-tomorrow'],
    steps: [
      { text: 'Choose a 15-minute window each day, not close to bedtime.' },
      { text: 'During the day, when a worry comes, jot it down and tell it: “Later.”' },
      { text: 'At worry time, read the list. For each: can I act on this? If yes, choose a next step.' },
      { text: 'If not, notice it, breathe, and let it be for today.' },
      { text: 'When time is up, close the notebook and do something pleasant.' },
    ],
    related: [med('letting-go-of-stress-worry-time'), med('sleep-mastery-worry-parking')],
    appCategories: ['anxiety'],
    review: DRAFT,
  },

  // ─── Sleep ────────────────────────────────────────────────────────────────
  {
    id: 'muscle-relaxation',
    kind: 'sleep',
    title: 'Progressive muscle relaxation',
    summary: 'Tensing and releasing muscle groups one by one. Shows the body what “relaxed” feels like.',
    minutes: 10,
    keywords: ['progressive muscle relaxation', 'progressive relaxation', 'muscle relaxation', 'pmr', 'tense and release', 'tense and relax'],
    intents: ['body-relaxation', 'sleep-tonight', 'tired-cant-sleep'],
    steps: [
      { text: 'Lie down comfortably and take a few slow breaths.' },
      { text: 'Curl your toes and tense your feet for 5 seconds, then let go for 10.', seconds: 15 },
      { text: 'Calves, then thighs: tense for 5, release for 10.', seconds: 30 },
      { text: 'Make fists, then tense your arms. Release.', seconds: 30 },
      { text: 'Pull your shoulders to your ears. Let them drop.', seconds: 15 },
      { text: 'Scrunch your face, then let it go soft.', seconds: 15 },
      { text: 'Lie still and feel your whole body heavy and warm.', seconds: 60 },
    ],
    caution: 'Tense gently, never to the point of pain. Skip any area that is injured or sore.',
    related: [med('sleep-mastery-unclench'), med('sleep-mastery-heavy-body'), yoga('bedtime-yoga')],
    appCategories: ['sleep', 'relaxation'],
    review: DRAFT,
  },
  {
    id: 'counting-down',
    kind: 'sleep',
    title: 'Counting down to sleep',
    summary: 'Counting slowly backwards with your breath. Gives a busy mind something gentle to hold.',
    minutes: 5,
    keywords: ['counting down', 'count down', 'count backwards', 'counting backwards'],
    intents: ['active-mind-night', 'sleep-tonight'],
    steps: [
      { text: 'Lie on your back or side and let the bed take your weight.' },
      { text: 'On each out-breath, count one number backwards, starting at 50.' },
      { text: 'Picture each number fading as you breathe out.' },
      { text: 'If you lose your place, start again from wherever feels right. Sleep may come before you finish.' },
    ],
    related: [med('sleep-mastery-counting-down'), med('sleep-mastery-drifting-off')],
    appCategories: ['sleep'],
    review: DRAFT,
  },
  {
    id: 'wind-down',
    kind: 'sleep',
    title: 'The 30-minute wind-down',
    summary: 'A short, steady routine for the last half hour before bed.',
    minutes: 30,
    keywords: ['wind down routine', 'bedtime wind down', 'before bed routine'],
    intents: ['night-routine', 'sleep-tonight'],
    steps: [
      { text: 'Dim the lights and quiet the room.', seconds: 60 },
      { text: 'Write tomorrow’s to-do list and any worries, then close the notebook.', seconds: 300 },
      { text: 'Gentle stretches or bedtime yoga.', seconds: 600 },
      { text: 'Wash up, warm drink without caffeine, change for bed.', seconds: 600 },
      { text: 'In bed: a sleep meditation, a story or a soft sound with the sleep timer.', seconds: 240 },
    ],
    related: [yoga('bedtime-yoga'), med('night-wind-down'), story('night-ferry'), page('/sleep', 'Open Sleep')],
    appCategories: ['sleep'],
    review: DRAFT,
  },

  // ─── Journaling ───────────────────────────────────────────────────────────
  {
    id: 'journal-check-in',
    kind: 'journaling',
    title: 'Daily check-in prompts',
    summary: 'Five short questions to notice how you really are today.',
    minutes: 5,
    keywords: ['journal prompts', 'journaling prompts', 'journal prompt', 'check in prompts', 'what to write'],
    intents: ['ask-me-questions', 'feel-today', 'process-today'],
    steps: [
      { text: 'How am I feeling right now, in one or two words?' },
      { text: 'What has been on my mind most today?' },
      { text: 'What gave me energy today, and what took it away?' },
      { text: 'What do I need more of tomorrow?' },
      { text: 'One thing I’m glad about today is…' },
    ],
    related: [page('/reflections', 'Open Reflections'), med('steady-mind-name-it')],
    appCategories: ['happiness'],
    review: DRAFT,
  },
  {
    id: 'journal-letting-go',
    kind: 'journaling',
    title: 'Letting go prompts',
    summary: 'Questions for something you keep carrying: a hurt, a worry, a “should”.',
    minutes: 10,
    keywords: ['letting go prompts', 'let go journal', 'letting go journal', 'release journal'],
    intents: ['holding-on', 'old-hurt', 'let-go-person', 'peace-relationship'],
    steps: [
      { text: 'What am I holding onto? Describe it plainly.' },
      { text: 'What does holding on give me, and what does it cost me?' },
      { text: 'What part of this is in my control, and what isn’t?' },
      { text: 'If I let go a little, what might I make room for?' },
      { text: 'Finish: “Today, I’m choosing to set down…”' },
    ],
    related: [page('/reflections', 'Open Reflections'), med('letting-go')],
    appCategories: ['anxiety', 'relaxation'],
    review: DRAFT,
  },
  {
    id: 'journal-kind-letter',
    kind: 'journaling',
    title: 'A kind letter to yourself',
    summary: 'Writing to yourself as a caring friend would. Gentle for days you feel not good enough.',
    minutes: 10,
    keywords: ['letter to myself', 'kind letter', 'self compassion letter', 'write to myself'],
    intents: ['hard-on-self', 'not-good-enough', 'forgive-self', 'self-doubt'],
    steps: [
      { text: 'Think of something you’re hard on yourself about.' },
      { text: 'Imagine a friend who loves you, knows your strengths, and accepts your flaws.' },
      { text: 'Write to yourself from that friend: what would they say about what happened?' },
      { text: 'Include what they understand about why it was hard, and what they hope for you.' },
      { text: 'Put the letter away, and read it again tomorrow.' },
    ],
    related: [med('kind-to-yourself-inner-voice'), med('self-compassion'), page('/reflections', 'Open Reflections')],
    appCategories: ['happiness'],
    review: DRAFT,
  },

  // ─── Mindfulness education ────────────────────────────────────────────────
  {
    id: 'what-is-meditation',
    kind: 'education',
    title: 'What is meditation?',
    summary: 'A plain answer, without the mystery.',
    minutes: 1,
    keywords: ['what is meditation', 'what meditation is', 'what does meditation do', 'why meditate', 'benefits of meditation'],
    intents: ['beginner-routine'],
    steps: [
      { text: 'Meditation is training your attention. Most often, you rest it on something simple, like your breath, and gently bring it back each time it wanders.' },
      { text: 'Over time, many people find it easier to notice their thoughts and feelings without being swept away by them, and to calm down when stressed. It can also help with sleep and focus.' },
      { text: 'It isn’t about emptying your mind or always feeling peaceful. A session full of wandering, where you kept coming back, is a good session.' },
      { text: 'It also isn’t a treatment for mental health conditions. It can sit alongside care from a professional, not replace it.' },
    ],
    related: [med('free-your-mind'), page('/programs/calm-foundations', 'Calm Foundations program')],
    appCategories: ['focus'],
    review: DRAFT,
  },
  {
    id: 'mind-wandering',
    kind: 'education',
    title: 'My mind keeps wandering',
    summary: 'Why that is normal, and what to do about it.',
    minutes: 1,
    keywords: ['mind keeps wandering', 'mind wanders', 'cant focus when meditating', 'distracted when meditating', 'distracted when i meditate', 'cant stop thinking when meditating', 'doing it wrong', 'am i doing it right'],
    intents: ['beginner-routine', 'consistency'],
    steps: [
      { text: 'A wandering mind isn’t a sign you’re bad at meditating. Minds wander; that is what they do, for everyone, including long-time meditators.' },
      { text: 'The practice is the moment you notice you’ve drifted, and come back. Each return is like one repetition when training a muscle.' },
      { text: 'Come back gently, without scolding yourself. You can note where you went (“planning”, “worrying”) and return to the breath.' },
      { text: 'If sitting still feels too hard, try a walking meditation, counting breaths, or a guided session with a voice to follow.' },
    ],
    related: [med('focus-reset-wandering'), med('calm-foundations-thoughts')],
    appCategories: ['focus'],
    review: DRAFT,
  },
  {
    id: 'how-long',
    kind: 'education',
    title: 'How long should I meditate?',
    summary: 'Short and regular beats long and rare.',
    minutes: 1,
    keywords: ['how long should i meditate', 'how long to meditate', 'how many minutes', 'how often should i meditate', 'best time to meditate', 'when should i meditate'],
    intents: ['daily-habit', 'beginner-routine'],
    steps: [
      { text: 'Start with 3 to 5 minutes a day. A few minutes daily does more than an hour once a week.' },
      { text: 'When it feels easy, try 10, then 15 or 20 minutes if you like. There’s no length you have to reach.' },
      { text: 'The best time is the one you’ll keep: many people like the morning before the day takes over, or the evening to wind down.' },
      { text: 'Tie it to something you already do, like after brushing your teeth, so it becomes automatic.' },
    ],
    related: [page('/notifications', 'Set a daily reminder'), page('/programs/calm-foundations', 'Calm Foundations program')],
    appCategories: ['focus'],
    review: DRAFT,
  },
  {
    id: 'posture',
    kind: 'education',
    title: 'How to sit for meditation',
    summary: 'Comfortable and upright is enough. No special cushion or pose needed.',
    minutes: 1,
    keywords: ['how to sit', 'meditation posture', 'posture for meditation', 'sit cross legged', 'lie down to meditate', 'can i lie down'],
    intents: ['beginner-routine'],
    steps: [
      { text: 'A chair is perfect. Sit with your feet flat, back upright but relaxed, hands resting on your thighs.' },
      { text: 'On the floor, sit on a cushion so your hips are a little higher than your knees.' },
      { text: 'Lying down is fine too, especially for body scans and sleep meditations, though you may drift off.' },
      { text: 'Let your shoulders drop, your jaw soften, and your eyes close or rest softly on the floor ahead.' },
      { text: 'If you have pain, change position whenever you need. Comfort helps attention.' },
    ],
    related: [yoga('chair-yoga'), yoga('posture-reset')],
    appCategories: ['focus'],
    review: DRAFT,
  },
  {
    id: 'what-is-mindfulness',
    kind: 'education',
    title: 'What is mindfulness?',
    summary: 'Paying attention to now, on purpose, without judging it.',
    minutes: 1,
    keywords: ['what is mindfulness', 'mindfulness meaning', 'what does mindful mean', 'meditation vs mindfulness'],
    intents: ['present-moment', 'thought-awareness'],
    steps: [
      { text: 'Mindfulness is paying attention to what is happening right now, in you and around you, with curiosity rather than judgement.' },
      { text: 'Meditation is one way to practise it. But you can be mindful anytime: drinking tea, walking, listening to someone.' },
      { text: 'It doesn’t mean liking everything or being calm all the time. It means noticing what’s here, so you can respond rather than react.' },
    ],
    related: [med('calm-foundations-everyday'), med('mindful-walk')],
    appCategories: ['focus'],
    review: DRAFT,
  },
  {
    id: 'meditation-limits',
    kind: 'education',
    title: 'Meditation and mental health',
    summary: 'What meditation can help with, and when to look for more support.',
    minutes: 1,
    keywords: ['can meditation help depression', 'can meditation help anxiety', 'meditation and anxiety', 'meditation and depression', 'meditation makes me anxious', 'meditation made me feel worse', 'is meditation therapy', 'instead of therapy'],
    intents: [],
    steps: [
      { text: 'For many people, regular practice helps with everyday stress, worry and sleep. It isn’t therapy, and it isn’t a treatment for depression, anxiety disorders or trauma.' },
      { text: 'Sometimes meditation brings up difficult feelings or memories. If it makes you feel worse, stop, open your eyes, and ground yourself through your feet or a sound. Shorter sessions, movement, or guided ones may suit you better.' },
      { text: 'If low mood, anxiety or poor sleep last for weeks, or get in the way of daily life, please talk to a doctor or mental health professional. Meditation can sit alongside that care.' },
    ],
    related: [page('/help', 'Help')],
    review: DRAFT,
  },
];

/** What the collections are called in the chat, for the lists Kapwa offers. */
export const practiceKinds: Record<PracticeKind, { title: string; keywords: string[] }> = {
  breathing: {
    title: 'breathing techniques',
    keywords: ['breathing techniques', 'breathing exercises', 'types of breathing', 'another breathing', 'different breathing', 'other breathing'],
  },
  grounding: {
    title: 'grounding techniques',
    keywords: ['grounding techniques', 'grounding exercises', 'ways to ground', 'another grounding'],
  },
  meditation: {
    title: 'kinds of meditation',
    keywords: ['meditation techniques', 'types of meditation', 'kinds of meditation', 'meditation styles', 'different meditation', 'another meditation technique'],
  },
  mindfulness: {
    title: 'everyday mindfulness practices',
    keywords: ['mindfulness exercises', 'mindfulness practices', 'mindfulness activities', 'mindful activities', 'everyday mindfulness'],
  },
  sleep: {
    title: 'sleep techniques',
    keywords: ['sleep techniques', 'sleep exercises', 'ways to fall asleep', 'tips to sleep', 'sleep tips'],
  },
  journaling: {
    title: 'journaling prompts',
    keywords: ['journaling ideas', 'journal ideas', 'more prompts', 'journaling exercises', 'writing prompts'],
  },
  education: {
    title: 'questions about meditation',
    keywords: ['questions about meditation', 'learn about meditation', 'meditation basics', 'teach me about meditation'],
  },
};
