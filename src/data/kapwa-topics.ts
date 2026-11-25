import type { KapwaAction, KapwaIntent } from '@/data/kapwa';
import type { SoundscapeId } from '@/lib/audio/soundscapes';

/**
 * Kapwa's written answers to the questions people bring most: stress,
 * sadness, sleep, the future, self-esteem, relationships, self-understanding
 * and habits.
 *
 * Each topic is matched by keywords, not by the exact question, so "cant stop
 * overthinkng" and "overthinking" land in the same place as "How do I stop
 * overthinking everything?". The answer is given in full (`prepared`), even
 * when the AI is on, and offers what in Serenity fits it: a meditation, a
 * yoga session, a story, a sound, or a screen.
 *
 * The voice: someone who helps you slow down, without judging. Validate
 * first, explain gently, offer one small thing to try now, then the app.
 * These are not therapy, and say so where it matters.
 *
 * Every id here must exist in the content (src/content/content.json) or in
 * the soundscapes; lib/kapwa.test.ts checks. Every suggestion must be
 * understood by Kapwa itself; that is checked too.
 */

const med = (id: string): KapwaAction => ({ type: 'session', id });
const yoga = (id: string): KapwaAction => ({ type: 'yoga', id });
const story = (id: string): KapwaAction => ({ type: 'story', id });
const sound = (id: SoundscapeId): KapwaAction => ({ type: 'sound', id });
const page = (href: string, label: string): KapwaAction => ({ type: 'page', href, label });

const topic = (intent: Omit<KapwaIntent, 'prepared'>): KapwaIntent => ({ ...intent, prepared: true });

export const kapwaTopics: KapwaIntent[] = [
  // ─── 1. Stressed or overwhelmed ───────────────────────────────────────────
  topic({
    id: 'overwhelmed',
    keywords: [
      'overwhelmed', 'overwhelming', 'too much', 'all at once', 'at once', 'happening all',
      'not doing that much', 'not doing much', 'too full', 'mind is full', 'so much going on',
      'everything is happening', 'cant cope', 'cant handle', 'swamped', 'drowning',
    ],
    replies: [
      'Feeling overwhelmed doesn’t mean you’re weak or doing too little. It often comes from the weight of everything you’re holding in your head: unfinished tasks, worries, other people’s needs, decisions you haven’t made yet. Your mind keeps all of it open at once, even when your hands aren’t busy.\n\nWhen everything feels like it’s happening at the same time, try this:\n1. Stop and take three slow breaths, longer out than in.\n2. Write down everything that’s on your mind, without sorting it.\n3. Circle just one thing you can do in the next hour. Leave the rest on the page for now.\n\nYou don’t have to solve it all today. If you’d like help settling first, start here:',
    ],
    actions: [med('panic-pause'), med('letting-go-of-stress-room'), yoga('calm-the-nerves'), sound('rain')],
    suggestions: ['Help me calm down right now', 'How do I stop overthinking?', 'I need to clear my mind'],
  }),
  topic({
    id: 'calm-now',
    keywords: [
      'calm down', 'calm me', 'calm myself', 'help me calm', 'need to calm', 'settle down',
      'freaking out', 'panicking', 'panic attack', 'anxiety attack', 'shaking', 'heart racing',
      'heart is racing', 'racing heart', 'cant relax',
    ],
    replies: [
      'Yes. Let’s do this together, right where you are.\n\n1. Put your feet flat on the floor and feel the ground under them.\n2. Breathe in through your nose for 4 counts.\n3. Breathe out slowly through your mouth for 6 counts, as if blowing through a straw.\n4. Repeat five times. A long out-breath tells your body it is safe to slow down.\n5. Now name 3 things you can see and 2 things you can hear.\n\nNothing else needs your attention for the next few minutes. If you’d like a voice to guide you:',
    ],
    actions: [med('panic-pause'), med('letting-go-of-stress-reset'), med('steady-mind-anchor'), sound('ocean')],
    suggestions: ['Guide me through a breathing exercise', 'Help me feel grounded', 'Why do I feel overwhelmed?'],
  }),
  topic({
    id: 'overthinking',
    keywords: [
      'overthink', 'overthinking', 'over thinking', 'over think', 'thinking too much', 'think too much',
      'cant stop thinking', 'racing thoughts', 'thoughts wont stop', 'mind wont stop', 'ruminating',
      'spiralling', 'spiraling', 'nag ooverthink', 'overthinker',
    ],
    replies: [
      'Overthinking is usually your mind trying to protect you: if it can think through every outcome, maybe nothing will catch you off guard. But thinking more rarely brings the certainty it promises, and it leaves you tired.\n\nA few things that help:\n• Notice the loop and name it: “I’m overthinking again.” Naming it gives you a little distance.\n• Ask: is this a problem I can act on today? If yes, choose one small step. If no, it can wait.\n• Give worries a set time, like 10 minutes in the late afternoon, and when they come up earlier, tell them “later”.\n• Move your attention into your body: your breath, your feet, your hands.\n\nThese practise watching thoughts without following each one:',
    ],
    actions: [med('steady-mind-observer'), med('quiet-the-noise'), med('letting-go-of-stress-worry-time'), yoga('breath-balance')],
    suggestions: ['How do I stop worrying about things I can’t control?', 'Help me become aware of my thoughts', 'I can’t sleep'],
  }),
  topic({
    id: 'mental-exhaustion',
    keywords: [
      'mentally exhausted', 'mentally tired', 'mentally drained', 'mental exhaustion', 'mentally drain', 'brain is so tired',
      'no energy left',
      'brain is tired', 'brain fog', 'exhausted', 'burnt', 'nothing physically', 'havent done anything',
      'no energy', 'worn out', 'pagod',
    ],
    replies: [
      'Mental tiredness is real tiredness. Thinking, deciding, worrying, holding back feelings and being “on” for other people all use energy, even when your body sits still. Many small decisions and constant notifications can drain you as much as a long walk.\n\nWhat tends to help:\n• Rest that is truly restful: not scrolling, but something with no input, like lying down with your eyes closed or a slow walk.\n• Let your body do something gentle, so your mind can step back.\n• Lower the bar for today. Choose the one or two things that matter and let the rest be “good enough”.\n\nThese are made for a tired mind:',
    ],
    actions: [med('calm-foundations-arrive'), yoga('restorative-rest'), med('stress-release'), sound('stream')],
    suggestions: ['What small habits can help me feel less stressed?', 'How do I deal with pressure without burning out?', 'What do I actually need right now?'],
  }),
  topic({
    id: 'worry-control',
    keywords: [
      'cant control', 'out of my control', 'not in my control', 'beyond my control', 'control',
      'worry about things', 'worrying about things', 'stop worrying', 'worry', 'worrying', 'worried',
      'what ifs',
    ],
    replies: [
      'Worrying about what you can’t control is very human. It can feel like caring, or like being ready. But it keeps your body braced for something that may never happen.\n\nTry sorting it, on paper if you can:\n• In my control: what I do, what I say, how I rest, who I ask for help.\n• Not in my control: other people’s choices, the past, most outcomes.\n\nFor the first list, pick one small action. For the second, try saying gently: “I can’t solve this right now, and that’s okay.” Then bring your attention back to your breath, which is always happening right now.\n\nThese help you set worries down for a while:',
    ],
    actions: [med('letting-go-of-stress-worry-time'), med('letting-go'), med('steady-mind-name-it'), story('rain-walk')],
    suggestions: ['How do I focus on the present?', 'Help me take things one day at a time', 'How do I stop overthinking?'],
  }),
  topic({
    id: 'breathing-exercise',
    keywords: [
      'breathing exercise', 'breathing exercises', 'breathing technique', 'breathe with me', 'breathing',
      'breath work', 'breathwork', 'box breathing', 'how to breathe', 'how do i breathe', 'breathe properly', 'some breathing', 'breathe to relax',
      'breathe', '5 minutes', 'five minutes',
      '5 minute', 'five minute',
    ],
    replies: [
      'Of course. Here’s a simple 5-minute breathing practice. Sit or lie comfortably and let your shoulders drop.\n\nMinute 1: just notice your breath without changing it.\nMinutes 2 to 4: box breathing. Breathe in for 4, hold for 4, out for 4, hold for 4. Picture tracing the four sides of a square.\nMinute 5: let the counting go. Breathe in naturally and let each out-breath be a little longer.\n\nIf holding your breath feels uncomfortable, skip the holds: in for 4, out for 6.\n\nOr let one of these guide you, with the breathing circle to follow on screen:',
    ],
    actions: [med('box-breathing'), med('coherent-breathing'), med('breath-school-belly'), page('/programs/breath-school', 'Breath School program')],
    suggestions: ['Help me calm down right now', 'Guide me through a body relaxation', 'How can I make meditation a daily habit?'],
  }),
  topic({
    id: 'pressure-burnout',
    keywords: [
      'pressure', 'burn out', 'burnout', 'burning out', 'burning myself out', 'burned out', 'deadline',
      'deadlines', 'workload', 'too much work', 'expectations', 'pressured', 'work is killing me',
      'hate my job', 'my job', 'my boss', 'work stress', 'stressed at work', 'overworked', 'work is too much',
    ],
    replies: [
      'Pressure on its own isn’t the problem. Burnout comes when there’s pressure without recovery, day after day. So the aim isn’t to never feel pressure, but to build small moments of rest into it.\n\nSome ways to protect yourself:\n• Work in blocks with real pauses: even 2 minutes of slow breathing between tasks helps your nervous system reset.\n• Notice your early signs, like a tight jaw, short temper or poor sleep, and treat them as a signal to slow down, not to push harder.\n• Ask what can be dropped, delayed or shared. Not everything urgent is important.\n• Protect your sleep. It is where recovery happens.\n\nIf you’ve felt this way for weeks, talking to someone you trust, or a professional, can really help.\n\nFor the pauses in between:',
    ],
    actions: [med('letting-go-of-stress-reset'), med('midday-reset'), yoga('desk-stretch'), med('focus-reset-close')],
    suggestions: ['Why am I mentally exhausted?', 'How do I make time for myself without guilt?', 'Help me build a nighttime routine'],
  }),
  topic({
    id: 'fix-everything',
    keywords: [
      'fix everything', 'fix it all', 'fix things', 'immediately', 'right away', 'need to fix',
      'solve everything', 'urgent', 'perfect', 'perfectionist', 'perfectionism', 'everything is fixed', 'until everything',
    ],
    replies: [
      'That urge to fix everything right now often comes from discomfort. When something is unresolved, it feels unsafe, and fixing it quickly feels like the way to make the feeling stop. Often it’s a habit learned from being the one others relied on.\n\nBut not everything needs to be solved today, and some things aren’t yours to solve at all.\n\nWhen the urge comes:\n1. Pause and take one slow breath before acting.\n2. Ask: “What happens if I wait until tomorrow?” Often, nothing bad.\n3. Choose the one thing that truly can’t wait, and let the rest be unfinished for now.\n\nLearning to sit with “not yet fixed” is a skill, and it gets easier. These help:',
    ],
    actions: [med('steady-mind-wave'), med('letting-go'), med('kind-to-yourself-what-you-need'), sound('forest')],
    suggestions: ['How do I stop worrying about things I can’t control?', 'How do I stop being so hard on myself?', 'What do I actually need right now?'],
  }),
  topic({
    id: 'clear-mind',
    keywords: [
      'clear my mind', 'clear my head', 'clear mind', 'clear head', 'reset', 'continue my day', 'before i continue',
      'fresh start', 'refresh', 'need a break', 'quick break',
    ],
    replies: [
      'A short pause can change the rest of your day. Try this 2-minute reset:\n\n1. Close your eyes or lower your gaze.\n2. Take three deep breaths, letting each out-breath be slow.\n3. Notice what’s in your mind and imagine setting each thought on a shelf. You can pick them up later.\n4. Feel your body: your feet, your back, your hands. Let your shoulders soften.\n5. Choose one intention for the next part of your day, like “one thing at a time”.\n\nIf you’d like more time, these are short and made for the middle of a day:',
    ],
    actions: [med('midday-reset'), med('letting-go-of-stress-reset'), yoga('afternoon-energy'), sound('brown')],
    suggestions: ['Help me focus', 'How do I create a peaceful start to my day?', 'How do I stop overthinking?'],
  }),

  // ─── 2. Sad or emotionally heavy ──────────────────────────────────────────
  topic({
    id: 'sad-no-reason',
    keywords: [
      'sad without', 'sad without knowing', 'the reason', 'sad for no reason', 'no reason', 'dont know why', 'without knowing', 'without a reason',
      'randomly sad', 'just sad', 'feel sad', 'feeling sad', 'sad', 'sadness', 'malungkot', 'nalulungkot',
      'cry', 'crying', 'cried', 'tears', 'feel down', 'feeling down', 'feel low', 'feeling low',
    ],
    replies: [
      'Sadness doesn’t always arrive with a clear reason, and that can feel confusing. Sometimes it comes from tiredness, hormones or the weather. Sometimes it’s feelings from days or weeks ago catching up with you once you finally slow down. Sometimes it’s just a wave that passes.\n\nYou don’t need to find the reason before you’re allowed to feel it. Try being curious instead of fixing it:\n• Where do you feel it in your body?\n• What would you say to a friend who felt this way?\n• What small comfort could you give yourself now: a warm drink, a blanket, a walk?\n\nIf the sadness stays most days for two weeks or more, please talk to someone you trust or a professional. You deserve support.\n\nThese are gentle company:',
    ],
    actions: [med('kind-to-yourself-hand-on-heart'), med('steady-mind-name-it'), story('attic-rain'), sound('rain')],
    suggestions: ['Can I just talk about what I’m feeling?', 'How can I be kinder to myself?', 'How do I accept feelings I don’t understand?'],
  }),
  topic({
    id: 'just-talk',
    keywords: [
      'just talk', 'talk about', 'can i talk', 'want to talk', 'need to talk', 'someone to talk', 'listen to me',
      'vent', 'venting', 'let it out', 'share how i feel', 'talk to you', 'like to talk', 'talk it through',
    ],
    replies: [
      'Of course you can. You don’t need to explain it well or make it make sense. Write it however it comes out, a few words or a lot, and I won’t judge any of it.\n\nIf it’s hard to begin, you could start with one of these:\n• “Today I feel…”\n• “What’s been sitting with me is…”\n• “What I wish someone understood is…”\n\nI’m a guide, not a therapist, so I can’t replace talking with a person who knows you. But I can listen, and help you find a quiet moment afterwards. If writing privately feels better, Reflections gives you a gentle prompt and a page that stays on your phone.',
    ],
    actions: [page('/reflections', 'Open Reflections'), med('steady-mind-name-it'), med('kind-to-yourself-hand-on-heart')],
    suggestions: ['Help me process what happened today', 'Why do I feel sad without a reason?', 'Ask me questions to understand myself'],
  }),
  topic({
    id: 'old-hurt',
    keywords: [
      'let go of something', 'been hurting me', 'hurting me', 'still hurt', 'still hurts', 'long time ago',
      'years ago', 'in the past', 'the past', 'past', 'old wound', 'cant move on', 'move on', 'moving on',
      'trauma', 'resentment', 'grudge',
    ],
    replies: [
      'Some hurts stay because they mattered. If something still aches after a long time, it doesn’t mean you’re weak or “should be over it”. Often it means the hurt was never fully felt or acknowledged, so it keeps asking for attention.\n\nLetting go is usually not one decision but a slow loosening:\n• Acknowledge it plainly: “That hurt me, and it still does.”\n• Notice what it’s connected to: a need for respect, safety, or being seen.\n• Each time it comes up, breathe with it rather than pushing it away. Feelings that are allowed tend to soften.\n• You can let go of the weight without saying what happened was okay.\n\nIf an old hurt is affecting your daily life, a counsellor can help you work through it safely.\n\nThese are made for setting weight down:',
    ],
    actions: [med('six-phase-forgiveness'), med('letting-go'), med('steady-mind-wave'), story('river-boat')],
    suggestions: ['How do I forgive someone without forgetting?', 'How do I accept feelings I don’t understand?', 'How can I be kinder to myself?'],
  }),
  topic({
    id: 'pretending-okay',
    keywords: [
      'pretending', 'pretend', 'pretending to be okay', 'act okay', 'acting okay', 'fake smile', 'faking',
      'not okay', 'im not ok', 'not ok', 'mask', 'fake a smile', 'faking a smile', 'hide my feelings', 'hiding my feelings', 'putting on a face',
    ],
    replies: [
      'Pretending to be okay is often how people get through days that ask a lot of them. It can protect you for a while, but carrying it all the time is exhausting.\n\nYou don’t have to stop all at once. Some small steps:\n• Be honest with yourself first. Saying “I’m not okay today” quietly, even just here, is a start.\n• Choose one safe person and share a little: “I’ve been having a hard time lately.”\n• Give yourself a few minutes each day where you don’t have to perform for anyone.\n\nIt’s okay not to be okay. You don’t need to earn rest or care by holding it together.\n\nFor a few honest minutes with yourself:',
    ],
    actions: [med('kind-to-yourself-common-ground'), med('steady-mind-name-it'), page('/reflections', 'Open Reflections'), sound('fireplace')],
    suggestions: ['Can I just talk about what I’m feeling?', 'What should I do when I feel emotionally drained?', 'How can I be kinder to myself?'],
  }),
  topic({
    id: 'emotionally-drained',
    keywords: [
      'emotionally drained', 'emotionally exhausted', 'emotionally tired', 'drained', 'running on empty',
      'empty inside', 'nothing left', 'numb', 'heavy', 'emotionally heavy', 'life is hard', 'struggling',
      'hard time', 'having a hard time', 'everything sucks', 'rough time', 'tired of everything',
    ],
    replies: [
      'Feeling emotionally drained usually means you’ve been giving more than you’ve been getting back: caring for others, holding in feelings, or getting through a hard stretch. It’s a signal, not a failure.\n\nWhat often helps:\n• Rest from people a little, if you can. Quiet time without anyone needing something from you.\n• Do one soothing thing for your body: a shower, a warm drink, stretching, an early night.\n• Say no to one thing this week that isn’t essential.\n• Let yourself feel, rather than staying strong. A few tears can be a release.\n\nIf you feel empty or numb most days, please reach out to someone you trust or a professional.\n\nThese ask nothing of you:',
    ],
    actions: [yoga('restorative-rest'), med('kind-to-yourself-warm-wishes'), story('bathhouse'), sound('rain')],
    suggestions: ['How do I make time for myself without guilt?', 'How do I set boundaries without guilt?', 'Why am I mentally exhausted?'],
  }),
  topic({
    id: 'self-kindness',
    keywords: [
      'kinder to myself', 'kind to myself', 'be kind', 'self compassion', 'selfcompassion', 'gentle with myself',
      'not doing well', 'take care of myself', 'self care', 'selfcare', 'look after myself',
    ],
    replies: [
      'When you’re not doing well, the voice inside often gets harsher, just when you need it to be softer. Being kind to yourself doesn’t mean pretending things are fine. It means treating yourself the way you would treat a friend who is struggling.\n\nTry this:\n1. Put a hand on your chest and take a slow breath.\n2. Say to yourself: “This is hard right now.”\n3. Then: “Other people feel this too. I’m not alone.”\n4. And: “May I be gentle with myself today.”\n\nThen choose one small caring act: eating something nourishing, going to bed earlier, stepping outside for a minute.\n\nThe Kind to Yourself program is built around this:',
    ],
    actions: [med('self-compassion'), med('kind-to-yourself-hand-on-heart'), page('/programs/kind-to-yourself', 'Kind to Yourself program'), yoga('evening-unwind')],
    suggestions: ['How do I stop being so hard on myself?', 'How do I forgive myself for my mistakes?', 'What should I remind myself of today?'],
  }),
  topic({
    id: 'lonely',
    keywords: [
      'lonely', 'loneliness', 'alone', 'by myself', 'surrounded by people', 'no friends', 'isolated',
      'nobody loves me', 'no one loves me', 'unloved', 'need a hug', 'ignore me', 'ignored me', 'friends ignore', 'left out', 'disconnected', 'nag iisa', 'mag isa',
    ],
    replies: [
      'Loneliness isn’t only about being alone. You can feel it in a full room when you don’t feel seen or understood, or when the conversations stay on the surface. It’s a sign of a real need for connection, not a flaw in you.\n\nSome things that can help:\n• Notice who you feel most yourself with, even one person, and reach out to them with something small: a message, a call.\n• Share a little more of what’s true for you. Closeness often grows from small honest moments.\n• Spend time somewhere with gentle company, like a class, a walk group or volunteering, where talking isn’t forced.\n• Be good company to yourself in the meantime.\n\nThese are about warmth and connection:',
    ],
    actions: [med('six-phase-connection'), med('kind-to-yourself-common-ground'), story('harbour-at-night'), sound('fireplace')],
    suggestions: ['How do I deal with being misunderstood?', 'How can I stop seeking validation from others?', 'Can I just talk about what I’m feeling?'],
  }),
  topic({
    id: 'process-today',
    keywords: [
      'process what happened', 'what happened today', 'process', 'processing', 'bad day', 'rough day',
      'hard day', 'terrible day', 'long day', 'my day', 'today was',
    ],
    replies: [
      'Let’s look at it gently, without judging how you reacted. You can answer these here or just in your head:\n\n1. What happened? Just the facts, as if telling a friend.\n2. What did you feel then, and what do you feel now?\n3. What part is still sitting with you?\n4. What was in your control, and what wasn’t?\n5. What do you need now: rest, comfort, a conversation, or just to let it be?\n\nYou don’t have to reach a conclusion. Naming things is often enough to make them lighter. Afterwards, let your body unwind:',
    ],
    actions: [page('/reflections', 'Open Reflections'), med('focus-reset-close'), med('evening-gratitude'), yoga('evening-unwind')],
    suggestions: ['Help me release the thoughts from today', 'Can I just talk about what I’m feeling?', 'Help me build a nighttime routine'],
  }),
  topic({
    id: 'accept-feelings',
    keywords: [
      'accept feelings', 'accept my feelings', 'accept emotions', 'feelings i dont understand', 'dont understand my feelings',
      'confused feelings', 'mixed feelings', 'confusing', 'understand my emotions', 'accept', 'accept my emotions',
      'feelings are confusing', 'make sense of', 'confused about what i feel',
    ],
    replies: [
      'Feelings don’t always come with explanations, and they can be mixed: relieved and sad, angry and guilty, all at once. You don’t have to understand a feeling to let it be there.\n\nA simple way to practise:\n1. Notice: “Something is here.”\n2. Find it in the body: is it tight, heavy, warm, buzzing?\n3. Name it loosely if you can: “maybe sadness”, “something like fear”. A guess is fine.\n4. Breathe around it, as if making a little more room.\n5. Remind yourself: “Feelings come and go. This one will change too.”\n\nUnderstanding often comes later, once the feeling feels safe enough to look at. These practise making room:',
    ],
    actions: [med('steady-mind-name-it'), med('letting-go-of-stress-room'), med('steady-mind-wave'), sound('ocean')],
    suggestions: ['What emotions have I been ignoring?', 'Why do I feel the way I feel today?', 'Can I just talk about what I’m feeling?'],
  }),

  // ─── 3. Can’t sleep ───────────────────────────────────────────────────────
  topic({
    id: 'sleep-tonight',
    keywords: [
      'fall asleep', 'falling asleep', 'help me sleep', 'sleep tonight', 'cant sleep', 'unable to sleep',
      'insomnia', 'sleepless', 'cant fall asleep', 'help me fall', 'get to sleep', 'hindi makatulog', 'di makatulog',
      'hindi ako makatulog', 'makatulog', 'counting sheep',
    ],
    replies: [
      'Let’s help your body get ready for sleep. Sleep isn’t something you can force; it’s something you make room for.\n\nTonight, try:\n1. Dim the lights and put your phone face down, or keep Serenity on with the screen low.\n2. Lie down and let the bed take your weight. Unclench your jaw, drop your shoulders.\n3. Breathe in for 4, hold for 7, out for 8. Do it four times.\n4. If thoughts come, let them pass like cars outside the window. No need to follow them.\n5. If you’re still awake after about 20 minutes, get up and do something calm in low light, then try again.\n\nPick one of these and let it play as you drift:',
    ],
    actions: [med('sleep-mastery-drifting-off'), story('night-ferry'), yoga('bedtime-yoga'), sound('rain')],
    suggestions: ['Why does my mind get so active at night?', 'Tell me a calming story', 'Guide me through a body relaxation'],
  }),
  topic({
    id: 'active-mind-night',
    keywords: [
      'when i lie down', 'lie down', 'lying down', 'in bed', 'at night', 'mind becomes active', 'mind active',
      'brain wont shut off', 'wont shut off', 'mind is racing', 'awake at night', 'busy mind', 'mind so active',
    ],
    replies: [
      'This happens to so many people. During the day, your mind is busy with tasks and noise. When you finally lie down in the dark and quiet, everything you didn’t have time to feel or think through comes forward. It isn’t a sign that something is wrong with you; your mind just finally has space.\n\nWhat helps:\n• Give your thoughts a place before bed: write down what’s on your mind and one next step for each, then close the notebook.\n• In bed, give your mind something simple to hold, like counting breaths backwards from 50, or a story or sound.\n• Make your out-breath longer than your in-breath; it slows a busy body.\n\nThese are made for exactly this:',
    ],
    actions: [med('sleep-mastery-worry-parking'), med('sleep-mastery-counting-down'), story('slow-train'), sound('brown')],
    suggestions: ['How do I stop replaying conversations?', 'How do I stop worrying about tomorrow?', 'Help me fall asleep tonight'],
  }),
  topic({
    id: 'bedtime-meditation',
    keywords: [
      'bedtime meditation', 'sleep meditation', 'meditation for sleep', 'meditate before bed', 'before bed',
      'meditate together', 'meditation together', 'meditation before i sleep', 'meditation before', 'quiet meditation', 'can we do', 'do one with me',
      'guided meditation',
    ],
    replies: [
      'I’d love to. Get comfortable, in bed or sitting, and let’s begin.\n\n1. Close your eyes and take three slow breaths.\n2. Feel where your body touches the bed or chair. Let it be heavy.\n3. Breathe naturally. Each time you breathe out, silently say “letting go”.\n4. When your mind wanders, and it will, notice where it went and gently come back to the breath. Coming back is the practice.\n5. In the last minutes, stop doing anything. Just rest.\n\nIf you’d like a voice and soft sound to carry you, start one of these. The Sleep tab also has a timer that fades the sound out:',
    ],
    actions: [med('night-wind-down'), med('sleepy-body-scan'), med('sleep-mastery-long-exhale'), page('/sleep', 'Open Sleep')],
    suggestions: ['Tell me a calming story', 'Help me build a nighttime routine', 'Guide me through a body relaxation'],
  }),
  topic({
    id: 'replaying',
    keywords: [
      'replaying', 'replay', 'replaying conversations', 'conversations in my head', 'what someone said',
      'what they said', 'what he said', 'what she said', 'keep thinking about', 'thinking about', 'thinking about what', 'she said', 'he said',
      'they said', 'things in my head',
      'said to me', 'embarrassing', 'cringe',
    ],
    replies: [
      'Replaying a conversation is your mind trying to finish something that feels unfinished: what you should have said, what they meant, whether you were understood. It wants certainty, and replaying feels like getting closer to it, but usually it just keeps the feeling fresh.\n\nTry this:\n1. Write the conversation down once, including what you wish you had said.\n2. Ask: is there anything I actually need to do? Apologise, clarify, set a boundary? If yes, plan it for tomorrow. If no, the story is finished for now.\n3. When it starts again, say gently “I’ve already thought about this,” and return to your breath or a sound.\n\nMost other people forget these moments far sooner than we do. These help you let the loop go:',
    ],
    actions: [med('steady-mind-observer'), med('sleep-mastery-worry-parking'), med('letting-go'), story('lighthouse')],
    suggestions: ['How do I stop overthinking?', 'How do I deal with being misunderstood?', 'Help me fall asleep tonight'],
  }),
  topic({
    id: 'bedtime-story',
    keywords: [
      'bedtime story', 'calming story', 'sleep story', 'tell me a story', 'read me a story', 'story before',
      'story', 'stories', 'read to me', 'read me', 'story to fall asleep', 'story before bed',
    ],
    replies: [
      'Here’s a very small one to start.\n\nIt is evening at the edge of a quiet lake. The water is still, holding the last light of the sky. A small wooden boat rests by the jetty, rocking so slightly you can barely see it. Somewhere, a bird calls once and then is quiet. The air smells of pine and cooling stone. There is nowhere to go, and nothing to finish. The light fades slowly, the way a breath leaves you, and the stars arrive one at a time…\n\nSerenity’s stories are read aloud, slow and gentle, with nothing that would wake you. Here are a few for tonight:',
    ],
    actions: [story('night-ferry'), story('snowed-in-cabin'), story('observatory'), page('/stories', 'All stories')],
    suggestions: ['Help me fall asleep tonight', 'Can we do a bedtime meditation?', 'What can I do when I’m tired but can’t sleep?'],
  }),
  topic({
    id: 'tired-cant-sleep',
    keywords: [
      'tired but', 'tired but cant sleep', 'exhausted but', 'tired and awake', 'wired', 'so tired', 'tired',
      'sleepy but', 'still awake', 'wide awake', 'wake up at night', 'waking up at night', 'waking up', 'every night', '3am', 'wake up at 3am',
    ],
    replies: [
      'Being tired but unable to sleep is often “tired and wired”: your body is exhausted, but your nervous system is still on alert from stress, screens, caffeine or a busy evening.\n\nA few things to try:\n• Stop trying to sleep. Aim only to rest. Lying still with slow breathing is restful in itself, and the pressure to sleep often keeps you awake.\n• Keep the room cool and dark, and the screen dim or away.\n• Do a body scan: relax each part of your body from your toes upwards.\n• If you’ve been awake for a long time, get up, sit in low light with something calm, and return when you feel sleepy.\n• Tomorrow: daylight in the morning, less caffeine after midday, and a slower last hour before bed.\n\nThese help a wired body come down:',
    ],
    actions: [med('sleepy-body-scan'), yoga('bedtime-yoga'), med('breath-school-four-seven-eight'), sound('night')],
    suggestions: ['Guide me through a body relaxation', 'Help me build a nighttime routine', 'Tell me a calming story'],
  }),
  topic({
    id: 'release-thoughts',
    keywords: [
      'release the thoughts', 'release thoughts', 'release my thoughts', 'unload my thoughts', 'thoughts ive been carrying',
      'carrying today', 'carrying',
      'release', 'let go of today', 'let go of the day', 'unload', 'put the day down', 'end of the day',
    ],
    replies: [
      'Let’s set the day down, piece by piece.\n\n1. Sit or lie comfortably and take a few slow breaths.\n2. Bring to mind one thing from today that’s still with you. Notice it without judging.\n3. As you breathe in, acknowledge it: “This happened.”\n4. As you breathe out, imagine placing it in a box by the door. It will be there tomorrow if you need it.\n5. Do the same with the next thought, and the next, until your mind feels a little lighter.\n6. End with one thing from today that was good, however small.\n\nThese are made for closing the day:',
    ],
    actions: [med('focus-reset-close'), med('sleep-mastery-unclench'), med('evening-gratitude'), sound('stream')],
    suggestions: ['Help me fall asleep tonight', 'How do I stop worrying about tomorrow?', 'Help me process what happened today'],
  }),
  topic({
    id: 'body-relaxation',
    keywords: [
      'body relaxation', 'relax my body', 'body scan', 'relaxation exercise', 'muscle relaxation', 'tense body',
      'body is tense', 'body is so tense', 'my body is', 'tension', 'relax', 'relaxing', 'relaxed', 'stiff', 'body',
      'shoulders', 'my body',
    ],
    replies: [
      'Let’s relax the body, one part at a time. Lie down or sit back comfortably.\n\n1. Take a slow breath and feel your whole body resting.\n2. Bring your attention to your feet. Tense them gently for 3 seconds, then let go and feel them soften.\n3. Move up: calves, thighs, hips, belly. Tense a little, then release.\n4. Hands into fists, then open. Shoulders up to your ears, then let them fall.\n5. Soften your face: forehead, eyes, jaw. Let your tongue rest.\n6. Feel your whole body heavy and warm. Stay here and breathe.\n\nOr follow along with a voice or gentle movement:',
    ],
    actions: [med('body-scan'), med('sleep-mastery-heavy-body'), yoga('neck-shoulders'), yoga('restorative-rest')],
    suggestions: ['Help me fall asleep tonight', 'Guide me through a breathing exercise', 'Help me calm down right now'],
  }),
  topic({
    id: 'worry-tomorrow',
    keywords: [
      'worrying about tomorrow', 'worry about tomorrow', 'tomorrow', 'next day', 'big day', 'about tomorrow', 'interview',
      'exam', 'exams', 'presentation', 'first day', 'monday',
    ],
    replies: [
      'Tomorrow can feel huge at night, because at night you can’t do anything about it yet. Your mind keeps rehearsing to feel prepared.\n\nTry this before you sleep:\n1. Write down what you’re worried about for tomorrow.\n2. Next to each, write one thing you will do about it, or “nothing needed”.\n3. Close the notebook and tell yourself: “Tomorrow-me will handle tomorrow. Tonight, I rest.”\n4. If it comes back in bed, return to slow breathing, out-breath longer than in-breath.\n\nRested, you will meet tomorrow better than you can plan it tonight. These help:',
    ],
    actions: [med('sleep-mastery-worry-parking'), med('six-phase-perfect-day'), med('relaxing-breath'), story('greenhouse')],
    suggestions: ['How do I stop overthinking?', 'Help me feel grounded', 'Help me fall asleep tonight'],
  }),

  // ─── 4. Anxious about the future ──────────────────────────────────────────
  topic({
    id: 'plans-fail',
    keywords: [
      'dont go the way', 'not go the way', 'way i planned', 'as planned', 'go as planned', 'dont go as planned', 'goes as planned', 'my plans', 'go wrong', 'goes wrong',
      'plans fail', 'plan fails', 'things dont work out', 'doesnt work out', 'not work out', 'plan',
    ],
    replies: [
      'That question can feel heavy. Here’s something worth remembering: you have already lived through many things that didn’t go as planned, and you’re still here, still finding your way. Plans are useful maps, but life rarely follows them exactly, for anyone.\n\nWhen the “what if” comes up:\n• Ask: if it did go differently, what would I actually do next? Usually there’s a next step, even if it isn’t the one you wanted.\n• Hold your plans a little more loosely: “This is what I hope for, and I can adapt.”\n• Come back to today. The future is built from what you do now, not from how much you worry about it.\n\nThese help you feel steady when things are uncertain:',
    ],
    actions: [med('steady-mind-steady-ground'), med('six-phase-future-dream'), med('letting-go'), yoga('steady-balance')],
    suggestions: ['How do I deal with the fear of failing?', 'How can I stop being afraid of the unknown?', 'Help me take things one day at a time'],
  }),
  topic({
    id: 'uncertainty',
    keywords: [
      'unknown', 'afraid of the unknown', 'uncertain', 'uncertainty', 'not knowing', 'remind myself',
      'scared of the future', 'afraid of the future', 'fear of the future', 'future', 'takot',
    ],
    replies: [
      'Not knowing is one of the hardest things for a human mind. We’re built to look for danger, and the unknown can feel like danger even when it’s just… unknown. It can also hold good things you can’t see yet.\n\nSome things you can remind yourself when it feels uncertain:\n• “I don’t need to know everything to take the next step.”\n• “I have handled uncertain times before.”\n• “Right now, in this moment, I am okay.”\n• “Not knowing also means it isn’t decided yet.”\n\nWhen fear rises, bring yourself into the present: feel your feet, notice five things you can see, breathe slowly. The present is the only place you can act from.\n\nThese help:',
    ],
    actions: [med('steady-mind-anchor'), med('steady-mind-steady-ground'), yoga('calm-the-nerves'), sound('forest')],
    suggestions: ['How do I focus on the present instead of the future?', 'Help me feel grounded', 'What if things don’t go the way I planned?'],
  }),
  topic({
    id: 'present-moment',
    keywords: [
      'present', 'focus on the present', 'the present', 'in the moment', 'be present', 'here and now', 'mindful',
      'mindfulness', 'what will happen next', 'happen next', 'always worrying', 'worry about the future',
    ],
    replies: [
      'Your mind travels to the future because it’s trying to keep you safe, but it can only plan there, never live there. The present is where your life actually happens.\n\nA simple way back, anytime:\n1. Stop and feel your feet on the ground.\n2. Notice 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.\n3. Take one slow breath and say: “Right now, I’m here.”\n\nDoing one ordinary thing with full attention, like washing a cup, drinking tea or walking, also trains your mind to stay. A mindful walk or a slow, quiet story is a good place to start:',
    ],
    actions: [med('mindful-walk'), med('breath-school-natural'), story('morning-kitchen'), yoga('breath-balance')],
    suggestions: ['Help me feel grounded', 'How can I become more aware of my thoughts?', 'Help me take things one day at a time'],
  }),
  topic({
    id: 'fear-failing',
    keywords: [
      'fear of failing', 'fear of failure', 'afraid of failing', 'scared of failing', 'afraid to fail', 'what if i fail',
      'failing', 'failure', 'fail', 'mess up', 'messing up', 'not succeed',
    ],
    replies: [
      'The fear of failing usually means something matters to you. That’s worth noticing: the fear is tied to something you care about.\n\nSome ways to hold it:\n• Separate what you do from who you are. A failed attempt is an event, not your identity.\n• Ask what you’d tell a friend who was afraid of trying. You’d probably be kinder to them than you are to yourself.\n• Make it smaller. What is one small step you can try, where failing would be okay?\n• Remember that most people you admire have failed many times. It is part of learning, not the opposite of it.\n\nThese help you meet the fear with steadiness:',
    ],
    actions: [med('steady-mind-wave'), med('kind-to-yourself-inner-voice'), med('better-mornings-intention'), yoga('gentle-core')],
    suggestions: ['Why do I keep doubting my abilities?', 'How can I become more confident?', 'What if things don’t go the way I planned?'],
  }),
  topic({
    id: 'grounded',
    keywords: [
      'grounded', 'more grounded', 'feel more grounded', 'ground me', 'grounding', 'feel grounded', 'feel steady', 'unsteady', 'floating',
      'disconnected from my body', 'unreal', 'anchor', 'centered', 'centred',
    ],
    replies: [
      'Let’s bring you back to the ground, right now.\n\n1. Press your feet into the floor. Feel the weight of your body in the chair or on the ground.\n2. Hold something with texture, like a cup, a fabric or a stone, and really notice it.\n3. Breathe in slowly for 4, out for 6. Do it five times.\n4. Name where you are: the room, the day, the time. “I’m here, it’s today.”\n5. Look around and notice three colours.\n\nYour body is always in the present. Coming back to it is the fastest way to feel steady:',
    ],
    actions: [med('steady-mind-anchor'), med('steady-mind-steady-ground'), yoga('steady-balance'), sound('heartbeat')],
    suggestions: ['Help me calm down right now', 'How do I focus on the present?', 'Help me take things one day at a time'],
  }),
  topic({
    id: 'comparison',
    keywords: [
      'comparing', 'compare', 'comparison', 'other people', 'others progress', 'everyone else', 'other peoples',
      'comparing myself', 'jealous', 'envy', 'social media', 'ahead of me',
    ],
    replies: [
      'Comparing is something every mind does, and social media makes it louder. But you are usually comparing your inside, with all its doubts, to other people’s outside, with only their best moments showing. That’s never a fair comparison.\n\nSome things that help:\n• Notice when it starts, and name it: “I’m comparing again.”\n• Turn it back toward yourself: compare who you are now to who you were a year ago.\n• Let other people’s success show you what’s possible, rather than what you lack.\n• Take breaks from the feeds that leave you feeling smaller.\n• Write down three things you’ve grown in, however quietly.\n\nThese help you come home to your own path:',
    ],
    actions: [med('kind-to-yourself-common-ground'), med('six-phase-gratitude'), med('kind-to-yourself-inner-voice'), story('pottery-wheel')],
    suggestions: ['What if I’m not where I’m supposed to be in life?', 'Help me recognise my strengths', 'How can I appreciate myself more?'],
  }),
  topic({
    id: 'behind-in-life',
    keywords: [
      'where im supposed to be', 'not where im supposed to be', 'not where i should be', 'supposed to be', 'behind in life', 'falling behind', 'behind', 'wasted my life',
      'too late', 'late in life', 'no direction', 'lost in life', 'stuck in life', 'stuck', 'purpose',
      'feel lost', 'i feel lost', 'so lost', 'lost', 'life together',
    ],
    replies: [
      'That feeling is so common, and it’s heavy. But “where you’re supposed to be” is usually a timeline borrowed from someone else: family, friends, social media. Real lives don’t move on a schedule. People find their path at 20, 35, 50 and beyond.\n\nSome gentle questions:\n• Whose timeline am I measuring myself against?\n• What have I been through, learned or survived to get here? That counts.\n• What matters to me now, not what I was told should matter?\n• What is one small step toward that, this week?\n\nYou’re not late for your own life. You’re in it, right now. These might help:',
    ],
    actions: [med('six-phase-future-dream'), med('kind-to-yourself-what-you-need'), page('/reflections', 'Open Reflections'), story('old-orchard')],
    suggestions: ['How do I stop comparing myself to others?', 'Help me take things one day at a time', 'What do I actually need right now?'],
  }),
  topic({
    id: 'one-day',
    keywords: [
      'one day at a time', 'day at a time', 'day by day', 'one step at a time', 'step by step', 'take things slow',
      'take it slow',
      'slow down', 'small steps', 'little by little', 'unti unti',
    ],
    replies: [
      'Yes. One day at a time is one of the kindest ways to live through a hard season.\n\nHere’s a simple daily rhythm:\n• Morning: take three breaths before your phone, and ask “What is one thing that matters today?”\n• Daytime: when you feel the future pulling, come back to “just this task, just this hour”.\n• Evening: notice one thing you did, and one thing that was good. That’s enough.\n\nYou don’t need to carry next month today. You only need to carry today, and some days, only the next hour.\n\nTo start each day gently, or to mark its end:',
    ],
    actions: [med('better-mornings-intention'), med('calm-foundations-everyday'), med('evening-gratitude'), page('/programs/better-mornings', 'Better Mornings program')],
    suggestions: ['Help me build a simple morning routine', 'How do I focus on the present?', 'What small habits help with stress?'],
  }),

  // ─── 5. Self-esteem ───────────────────────────────────────────────────────
  topic({
    id: 'appreciate-self',
    keywords: [
      'appreciate myself', 'appreciate me', 'love myself', 'self love', 'selflove', 'like myself',
      'relationship with myself', 'healthier relationship', 'self worth', 'selfworth', 'self esteem', 'selfesteem',
      'value myself', 'hate myself',
    ],
    replies: [
      'Learning to appreciate yourself is less about suddenly believing you’re amazing, and more about treating yourself with steady respect and care, like you would someone you love.\n\nSome small daily practices:\n• Each evening, write three things you did today, including small ones like getting up, being kind, or trying.\n• Notice how you talk to yourself. Would you speak to a friend that way? Try rephrasing one harsh thought a day.\n• Keep promises to yourself, even tiny ones. Trust in yourself is built that way.\n• Thank your body for one thing it did today.\n\nA healthier relationship with yourself grows slowly, through many small moments. These help:',
    ],
    actions: [med('self-compassion'), med('kind-to-yourself-warm-wishes'), med('evening-gratitude'), page('/programs/kind-to-yourself', 'Kind to Yourself program')],
    suggestions: ['How do I stop being so hard on myself?', 'Help me recognise my strengths', 'What should I remind myself of today?'],
  }),
  topic({
    id: 'self-doubt',
    keywords: [
      'doubting', 'doubt myself', 'doubt my abilities', 'self doubt', 'selfdoubt', 'my abilities', 'impostor',
      'imposter', 'not capable', 'cant do it', 'capable',
    ],
    replies: [
      'Doubt often shows up when you’re stretching into something new or that matters to you. It doesn’t mean you can’t do it; it often means you care about doing it well. Many capable people feel this way, quietly.\n\nWhen doubt speaks up:\n• Ask for evidence: what have you already done, learned or got through? Write a few down.\n• Notice whose voice the doubt sounds like. Sometimes it’s an old voice, not the truth.\n• Act anyway, in a small way. Confidence usually follows action, not the other way around.\n• Talk to yourself the way a good teacher would: “You’re learning. Keep going.”\n\nThese help soften the inner critic:',
    ],
    actions: [med('kind-to-yourself-inner-voice'), med('steady-mind-observer'), med('better-mornings-intention'), yoga('gentle-core')],
    suggestions: ['How can I become more confident without pretending?', 'Help me recognise my strengths', 'How do I deal with the fear of failing?'],
  }),
  topic({
    id: 'hard-on-self',
    keywords: [
      'hard on myself', 'too hard on myself', 'so hard on myself', 'harsh on myself', 'critical of myself',
      'inner critic', 'self critical', 'beat myself up', 'beating myself up', 'blame myself', 'my fault',
    ],
    replies: [
      'Being hard on yourself often started as a way to keep yourself safe or to do well. But constant criticism doesn’t make us better; it makes us tired and afraid. People actually grow more when they’re treated with kindness, and that includes by themselves.\n\nTry this the next time the critic speaks:\n1. Notice it: “There’s that harsh voice again.”\n2. Ask: “Would I say this to someone I love?”\n3. Rephrase it as a kind coach would: not “You always mess up,” but “That was hard. What can I learn, and what do I need now?”\n4. Put a hand on your heart and take one slow breath.\n\nThe Kind to Yourself program is made for this, step by step:',
    ],
    actions: [med('kind-to-yourself-inner-voice'), med('self-compassion'), page('/programs/kind-to-yourself', 'Kind to Yourself program'), sound('pad')],
    suggestions: ['How do I forgive myself for my mistakes?', 'How can I appreciate myself more?', 'What should I do when I feel not good enough?'],
  }),
  topic({
    id: 'strengths',
    keywords: [
      'strengths', 'my strengths', 'recognize my strengths', 'recognise my strengths', 'what am i good at',
      'good at', 'talents', 'good qualities', 'what i am good',
    ],
    replies: [
      'Let’s find them together. Strengths are often things that come so naturally you don’t notice them. Try answering these:\n\n1. What do people come to you for: advice, help, a laugh, calm?\n2. What hard time have you got through, and what did it take? Patience, courage, stubbornness?\n3. What do you do that makes time disappear?\n4. What would a close friend say they love about you?\n5. What small thing did you do well this week?\n\nWrite down what comes up, even if it feels awkward. Strengths aren’t only achievements; kindness, honesty, persistence and gentleness count too. Then sit for a moment with what you found:',
    ],
    actions: [page('/reflections', 'Open Reflections'), med('six-phase-gratitude'), med('kind-to-yourself-warm-wishes')],
    suggestions: ['How can I appreciate myself more?', 'How can I become more confident?', 'What should I remind myself of today?'],
  }),
  topic({
    id: 'not-good-enough',
    keywords: [
      'not good enough', 'never good enough', 'good enough', 'worthless', 'not enough', 'useless', 'a failure',
      'im a failure', 'not worthy', 'unworthy', 'inadequate', 'ugly', 'hate how i look', 'never enough',
    ],
    replies: [
      'I’m sorry you’re feeling this. “Not good enough” is a painful feeling, and it often comes from comparison, old messages from others, or a hard moment, rather than the truth about you.\n\nYour worth isn’t something you earn by doing more. It’s already there.\n\nWhen this feeling comes:\n• Name it as a feeling, not a fact: “I’m feeling not good enough right now.”\n• Ask: “Good enough for what, and by whose measure?”\n• Remember one moment you were kind, brave, or kept going. That person is you.\n• Do one small caring thing for yourself, even if you don’t feel you deserve it.\n\nIf this feeling is with you often, talking to someone you trust or a professional can really help.\n\nThese are gentle and kind:',
    ],
    actions: [med('kind-to-yourself-hand-on-heart'), med('self-compassion'), med('kind-to-yourself-common-ground'), story('library-afternoon')],
    suggestions: ['How do I stop being so hard on myself?', 'Help me recognise my strengths', 'How do I stop comparing myself to others?'],
  }),
  topic({
    id: 'confidence',
    keywords: [
      'confident', 'confidence', 'no confidence', 'zero confidence', 'self confidence', 'without pretending', 'believe in myself', 'shy',
      'insecure', 'insecurity', 'courage', 'brave',
    ],
    replies: [
      'Real confidence isn’t loud or perfect. It’s a quiet trust that you can handle things, even when you’re unsure. You don’t need to pretend to have it; it grows from small actions and kind self-talk.\n\nSome ways to build it, genuinely:\n• Keep small promises to yourself. Each one tells you “I can rely on me.”\n• Do one slightly uncomfortable thing each week, and notice that you survived it.\n• Stand and breathe as if you belong: feet grounded, shoulders soft, slow breath.\n• Let yourself be a learner. “I don’t know yet” is a confident thing to say.\n\nThese help you feel steadier in yourself:',
    ],
    actions: [med('better-mornings-intention'), med('kind-to-yourself-inner-voice'), yoga('posture-reset'), yoga('gentle-core')],
    suggestions: ['Why do I keep doubting my abilities?', 'How do I deal with the fear of failing?', 'Help me recognise my strengths'],
  }),
  topic({
    id: 'forgive-self',
    keywords: [
      'forgive myself', 'forgiving myself', 'my mistakes', 'let go of my mistakes', 'mistakes', 'mistake', 'regret', 'regrets', 'guilty',
      'guilt', 'ashamed', 'shame', 'i messed up',
    ],
    replies: [
      'Forgiving yourself doesn’t mean saying what happened didn’t matter. It means accepting that you are a human who made a mistake, learning from it, and choosing not to keep punishing yourself.\n\nA gentle way to begin:\n1. Name what happened honestly, without making it bigger or smaller.\n2. Notice what you knew and felt at the time. You were doing what you could with what you had then.\n3. If someone was hurt, consider whether there’s a way to make amends, and do it if you can.\n4. Ask: “What have I learned, and what will I do differently?”\n5. Say to yourself: “I made a mistake. I am not a mistake.”\n\nForgiveness often takes time and repetition. These help:',
    ],
    actions: [med('six-phase-forgiveness'), med('self-compassion'), med('kind-to-yourself-hand-on-heart'), sound('bowl')],
    suggestions: ['How do I stop being so hard on myself?', 'How do I let go of something that hurt me?', 'How can I be kinder to myself?'],
  }),
  topic({
    id: 'reminders-today',
    keywords: [
      'remind myself today', 'remind myself of', 'things i should remind', 'reminders', 'affirmation', 'affirmations',
      'something positive', 'encouragement', 'encourage me', 'motivate me', 'inspire me', 'quote',
      'something nice', 'cheer me up', 'make me feel better',
    ],
    replies: [
      'Here are a few things worth remembering today:\n\n• You don’t have to do everything today. Doing enough is enough.\n• Rest is not something you have to earn.\n• Your feelings are valid, even the confusing ones.\n• Progress isn’t always visible. Quiet growth still counts.\n• You’ve got through every hard day so far.\n• You’re allowed to start again, at any moment.\n• Be as patient with yourself as you would be with a friend.\n\nPick the one that feels most true and come back to it during the day. Serenity can also send you a short inspiration each day, and these meditations carry the same spirit:',
    ],
    actions: [page('/notifications', 'Daily inspiration'), med('better-mornings-gratitude'), med('kind-to-yourself-warm-wishes')],
    suggestions: ['How can I appreciate myself more?', 'Help me build a simple morning routine', 'What should I be grateful for today?'],
  }),

  // ─── 6. Relationships ─────────────────────────────────────────────────────
  topic({
    id: 'let-go-person',
    keywords: [
      'let go of someone', 'let go of him', 'let go of her', 'let go of them', 'still care about', 'still love',
      'breakup', 'break up', 'broke up', 'heartbreak', 'heartbroken', 'my ex', 'ex', 'divorce', 'moving on from',
      'left me', 'dumped', 'dumped me', 'cheated', 'cheated on me',
    ],
    replies: [
      'Letting go of someone you still care about is one of the hardest things a heart does. It’s okay that it hurts. Caring doesn’t switch off just because a relationship changed or ended.\n\nSome things that can help:\n• Let yourself grieve. Sadness, anger, missing them and relief can all come, sometimes in one day.\n• Create some distance if you can, like muting or limiting contact for a while, so your heart has room to heal.\n• Write what you wish you could say to them, without sending it.\n• Remember that letting go doesn’t mean the love wasn’t real. It means choosing your own peace.\n• Lean on people who care about you.\n\nThese are gentle company through it:',
    ],
    actions: [med('letting-go'), med('open-heart'), med('six-phase-forgiveness'), story('lighthouse')],
    suggestions: ['How do I cope with missing someone?', 'How do I find peace with things I can’t change?', 'How can I be kinder to myself?'],
  }),
  topic({
    id: 'missing-someone',
    keywords: [
      'missing someone', 'miss someone', 'i miss', 'miss him', 'miss her', 'miss them', 'miss my', 'missing',
      'grief', 'grieving', 'passed away', 'lost someone', 'died', 'far away', 'long distance', 'homesick',
    ],
    replies: [
      'Missing someone is a sign of how much they mean to you. Whether they’re far away, no longer in your life, or have passed away, the ache is love that doesn’t have anywhere to go right now.\n\nSome ways to hold it:\n• Let the feeling come without pushing it away. Missing someone isn’t something to fix.\n• Do something that connects you to them: write them a letter, look at a photo, visit a place you shared, cook something they liked.\n• Talk about them with someone who understands.\n• Be gentle with yourself on harder days, like anniversaries or special dates.\n\nIf you’re grieving and it feels too heavy to carry alone, a grief counsellor or support group can help.\n\nThese might be comforting:',
    ],
    actions: [med('six-phase-blessing'), med('open-heart'), med('kind-to-yourself-warm-wishes'), story('harbour-at-night')],
    suggestions: ['Why do I feel lonely?', 'How do I let go of someone I still care about?', 'Can I just talk about what I’m feeling?'],
  }),
  topic({
    id: 'validation',
    keywords: [
      'validation', 'seeking validation', 'approval', 'people pleasing', 'people pleaser', 'please everyone',
      'what people think', 'what others think', 'need to be liked', 'attention', 'reassurance', 'everyone to like me',
    ],
    replies: [
      'Wanting others to approve of us is deeply human. We’re wired to belong. It becomes painful when your sense of being okay depends mostly on what others think, because that is always changing and out of your hands.\n\nSome ways to build steadiness from inside:\n• Before asking for others’ opinions, ask yourself first: “What do I think? How do I feel about it?”\n• Notice the moments you’re seeking reassurance, and pause for one breath before you do.\n• Give yourself the acknowledgement you’re hoping for: “I did well with that.”\n• Remember that people who matter will value you for being real, not for being perfect.\n\nThese help you trust your own voice:',
    ],
    actions: [med('kind-to-yourself-what-you-need'), med('self-compassion'), med('steady-mind-observer'), yoga('posture-reset')],
    suggestions: ['How do I set boundaries without feeling guilty?', 'How can I appreciate myself more?', 'How can I become more confident?'],
  }),
  topic({
    id: 'boundaries',
    keywords: [
      'boundaries', 'boundary', 'set boundaries', 'say no', 'saying no', 'cant say no', 'without feeling guilty',
      'feel guilty', 'taken advantage', 'too nice', 'overcommit', 'say yes to everyone', 'yes to everyone',
    ],
    replies: [
      'Boundaries aren’t walls or punishments. They’re a way of saying “this is what I can give, and this is what I need”, which protects both you and your relationships. Feeling guilty at first is normal, especially if you’re used to putting others first. Guilt doesn’t mean you’re doing something wrong.\n\nSome ways to start:\n• Begin small, with lower-stakes situations.\n• Keep it simple and kind: “I can’t this time, but thank you for asking.” You don’t need a long explanation.\n• Notice how you feel afterwards. The guilt usually fades; the relief stays.\n• Remember: a “yes” you resent isn’t really kindness.\n\nA few minutes to check in with what you need:',
    ],
    actions: [med('kind-to-yourself-what-you-need'), med('self-compassion'), med('steady-mind-anchor'), sound('wind')],
    suggestions: ['How do I make time for myself without guilt?', 'What can I do when a relationship is exhausting?', 'How can I stop seeking validation?'],
  }),
  topic({
    id: 'forgive-other',
    keywords: [
      'forgive someone', 'forgive him', 'forgive her', 'forgive them', 'forgive', 'forgiving', 'forgiveness',
      'without forgetting', 'betrayed', 'betrayed me', 'betrayal', 'they hurt me', 'hurt by someone',
    ],
    replies: [
      'Forgiving someone doesn’t mean forgetting, excusing what happened, or letting them back into your life. It means slowly letting go of carrying the anger and pain so it no longer controls you. Forgiveness is mostly for you.\n\nSome things to hold:\n• You can forgive and still keep a boundary. Remembering what happened protects you.\n• Let yourself feel the hurt and anger first. Forgiveness that skips this rarely lasts.\n• Try to see the person as a whole, flawed human, without excusing what they did.\n• It’s okay if it takes a long time, or if you’re not ready yet.\n\nThe Forgiveness meditation is made for this:',
    ],
    actions: [med('six-phase-forgiveness'), med('letting-go'), med('open-heart'), sound('bowl')],
    suggestions: ['How do I let go of something that hurt me?', 'How do I set boundaries without guilt?', 'How do I find peace with things I can’t change?'],
  }),
  topic({
    id: 'misunderstood',
    keywords: [
      'misunderstood', 'not understood', 'dont understand me', 'doesnt understand me', 'understand everything',
      'expecting people', 'expect people', 'nobody understands', 'no one understands', 'no one gets me', 'nobody hears me', 'nobody gets me', 'not heard', 'unheard',
    ],
    replies: [
      'Feeling misunderstood can be lonely and frustrating, especially with people you care about. It helps to remember that no one can fully understand everything we feel. Everyone sees us through their own experiences, and our inner world is bigger than words can carry.\n\nSome things that can help:\n• Be specific about what you need: “I don’t need advice, I just need you to listen.”\n• Choose the right moment and person for deeper things.\n• Let go of the hope that one person will understand everything. Different people can meet different parts of you.\n• Understand yourself first. The clearer you are, the easier it is to explain.\n• Write down what you feel. Sometimes being understood by yourself is the first step.\n\nThese might help:',
    ],
    actions: [med('kind-to-yourself-common-ground'), page('/reflections', 'Open Reflections'), med('steady-mind-name-it'), story('rain-walk')],
    suggestions: ['Why do I feel lonely even around people?', 'Can I just talk about what I’m feeling?', 'How do I stop replaying conversations?'],
  }),
  topic({
    id: 'draining-relationship',
    keywords: [
      'relationship feels', 'relationship is', 'exhausting relationship', 'emotionally exhausting', 'toxic',
      'relationship', 'relationships', 'partner', 'boyfriend', 'girlfriend', 'husband', 'wife', 'friendship',
      'family', 'parents', 'arguing', 'fighting', 'conflict',
    ],
    replies: [
      'Relationships can be one of our greatest sources of comfort, and also one of the most draining. When a relationship feels exhausting, it’s worth gently asking why, without blaming yourself or the other person straight away.\n\nSome questions to reflect on:\n• Do I feel safe, heard and respected here, most of the time?\n• Am I giving much more than I receive?\n• What do I need that I haven’t asked for?\n• What is one boundary that would make this lighter?\n\nYou’re allowed to need space, to speak up, or to step back. If you ever feel unsafe, afraid or controlled in a relationship, please reach out to someone you trust or a support service.\n\nFor some breathing room:',
    ],
    actions: [med('kind-to-yourself-what-you-need'), med('stress-release'), yoga('neck-shoulders'), sound('forest')],
    suggestions: ['How do I set boundaries without guilt?', 'How do I find peace with things I can’t change?', 'How do I deal with being misunderstood?'],
  }),
  topic({
    id: 'peace-relationship',
    keywords: [
      'find peace', 'peace with', 'cannot change', 'cant change', 'things i cannot change', 'things i cant change',
      'change them', 'change him', 'change her', 'accept them', 'accept the situation', 'acceptance',
    ],
    replies: [
      'Some things in a relationship can’t be changed: who someone is, what happened, or how they choose to respond. Finding peace with that doesn’t mean liking it. It means stopping the exhausting fight against what is, so you can put your energy into what you can do.\n\nA gentle practice:\n1. Name what you can’t change: “I can’t make them understand me.”\n2. Let yourself feel the disappointment or sadness about it.\n3. Then name what you can choose: how close you stay, what you share, how you care for yourself.\n4. Breathe out slowly and say: “I accept what I can’t change, and I’ll care for what I can.”\n\nThese practise acceptance and release:',
    ],
    actions: [med('letting-go'), med('letting-go-of-stress-room'), med('six-phase-blessing'), story('river-boat')],
    suggestions: ['How do I forgive someone without forgetting?', 'How do I let go of someone I still care about?', 'How do I set boundaries without guilt?'],
  }),

  // ─── 7. Understanding myself ──────────────────────────────────────────────
  topic({
    id: 'feel-today',
    keywords: [
      'the way i feel', 'feel today', 'how i feel', 'feel this way', 'my mood', 'mood',
      'emotions ive been ignoring', 'ignoring', 'ignored', 'emotions', 'feelings', 'check in',
    ],
    replies: [
      'Let’s check in together. Feelings are signals, and they make more sense when we slow down and listen.\n\nTake a breath and gently ask yourself:\n1. How does my body feel right now: tired, tense, restless, heavy, calm?\n2. If I had to name today’s feeling in one word, what would it be?\n3. What happened in the last few days that might connect to it?\n4. Is there a feeling I’ve been too busy to notice: sadness, anger, worry, loneliness, even excitement?\n5. What would help that feeling right now?\n\nYou don’t need perfect answers. Just noticing is a kind of care. Reflections can hold what you find, and these help you listen inward:',
    ],
    actions: [med('steady-mind-name-it'), page('/reflections', 'Open Reflections'), page('/assessment', 'Take the check-in'), med('body-scan')],
    suggestions: ['What do I actually need right now?', 'How do I accept feelings I don’t understand?', 'Ask me questions to understand myself'],
  }),
  topic({
    id: 'what-i-need',
    keywords: [
      'what do i need', 'what i need', 'actually need', 'need right now', 'my needs', 'dont know what i need',
      'what would help me',
      'what do i want', 'what i want',
    ],
    replies: [
      'That’s a beautiful question to ask yourself. Often we’re so busy that we forget to check.\n\nTry going through these, and notice which one makes you sigh or soften:\n• Rest: do I need to stop, sleep, or do nothing for a while?\n• Comfort: do I need warmth, a hug, a kind word?\n• Connection: do I need to talk to someone, or to be with people?\n• Space: do I need quiet, or time alone?\n• Movement: does my body want to stretch, walk or shake something off?\n• Expression: do I need to cry, write, or say something out loud?\n• Nourishment: when did I last eat or drink water?\n\nWhatever you find, see if you can give yourself a little of it now. This meditation is built around this question:',
    ],
    actions: [med('kind-to-yourself-what-you-need'), yoga('evening-unwind'), med('calm-foundations-arrive'), sound('pad')],
    suggestions: ['What has been taking up my mental energy?', 'How do I make time for myself without guilt?', 'Why do I feel the way I feel today?'],
  }),
  topic({
    id: 'holding-on',
    keywords: [
      'mental energy', 'taking up', 'holding onto', 'holding on to', 'should release', 'what am i holding',
      'let go of', 'letting go', 'let go', 'baggage', 'too much baggage', 'carrying too much',
    ],
    replies: [
      'Let’s look at what’s been taking up space inside. Take a slow breath and ask:\n\n1. What have I thought about most this week?\n2. Which of those thoughts gives me energy, and which drains it?\n3. Is there a worry, a resentment, a “should”, or an old story I keep carrying?\n4. What would it feel like to put one of them down, even just for today?\n5. What’s one small thing that would help: a conversation, a decision, writing it out, or simply accepting it?\n\nLetting go is rarely one moment. It’s noticing you’ve picked it up again, and setting it down again, gently. These help:',
    ],
    actions: [med('letting-go'), med('letting-go-of-stress-map'), med('letting-go-of-stress-release'), page('/programs/letting-go-of-stress', 'Letting Go of Stress program')],
    suggestions: ['What habits make it harder to feel at peace?', 'What do I actually need right now?', 'Help me release the thoughts from today'],
  }),
  topic({
    id: 'peace-meaning',
    keywords: [
      'at peace', 'feeling at peace', 'what does peace', 'peace mean', 'inner peace', 'peaceful', 'peace',
      'contentment', 'content', 'happiness', 'happy',
    ],
    replies: [
      'That’s a lovely thing to explore, because peace looks different for everyone. For some it’s quiet and stillness; for others it’s feeling safe, being with people they love, or not needing to prove anything.\n\nSome questions to sit with:\n• When did I last feel truly at peace? Where was I, who was there, what was I doing?\n• What does peace feel like in my body: slow breath, soft shoulders, warmth?\n• What tends to take it away?\n• What is one small way to invite a little more of it into this week?\n\nPeace isn’t a place you finally arrive at. It’s something you return to, again and again. These are a good place to start:',
    ],
    actions: [med('open-water-open-sea'), med('open-heart'), page('/reflections', 'Open Reflections'), story('greenhouse')],
    suggestions: ['What habits make it harder to feel at peace?', 'What should I be grateful for today?', 'How do I create a peaceful start to my day?'],
  }),
  topic({
    id: 'gratitude',
    keywords: [
      'grateful', 'gratitude', 'thankful', 'blessings', 'count my blessings', 'appreciate life', 'good things',
    ],
    replies: [
      'Gratitude doesn’t mean pretending everything is fine. It means noticing what’s also there, alongside the hard things.\n\nTry finding one in each of these:\n• Something small that went well today, like a warm drink, a kind word, or a moment of sun.\n• Someone who has made your life a little easier or brighter.\n• Something your body did for you today.\n• Something you have now that you once hoped for.\n• Something about yourself you’re quietly glad of.\n\nGratitude practised regularly gently shifts where your attention rests. These make it a habit:',
    ],
    actions: [med('six-phase-gratitude'), med('evening-gratitude'), med('better-mornings-gratitude'), story('bakery-dawn')],
    suggestions: ['What should I remind myself of today?', 'How can I appreciate myself more?', 'Help me build a nighttime routine'],
  }),
  topic({
    id: 'thought-awareness',
    keywords: [
      'aware of my thoughts', 'aware', 'awareness', 'self aware', 'my thoughts', 'notice my thoughts',
      'observe my thoughts', 'watch my thoughts', 'thought patterns', 'negative thoughts', 'thoughts',
    ],
    replies: [
      'Becoming aware of your thoughts is the heart of meditation. You start to see thoughts as things passing through your mind, not orders you have to follow.\n\nA simple practice:\n1. Sit quietly and focus on your breath for a minute.\n2. When a thought appears, label it gently: “planning”, “worrying”, “remembering”, “judging”.\n3. Then return to the breath, without scolding yourself.\n4. Notice which labels come up most. That’s useful information about what your mind is busy with.\n\nDuring the day, try pausing a few times to ask: “What am I thinking right now?” Over time, you’ll catch thoughts earlier, and they’ll hold you less tightly. These train exactly this:',
    ],
    actions: [med('steady-mind-observer'), med('calm-foundations-thoughts'), med('focus-reset-wandering'), page('/programs/calm-foundations', 'Calm Foundations program')],
    suggestions: ['How do I stop overthinking?', 'What is a good routine for beginners?', 'How do I focus on the present?'],
  }),
  topic({
    id: 'peace-habits',
    keywords: [
      'habits making it harder', 'habits are making', 'making it harder', 'harder to be at peace', 'bad habits', 'my habits', 'harder to feel', 'habits', 'unhealthy habits', 'screen time',
      'doom scrolling', 'doomscrolling', 'scrolling', 'scroll too much', 'scroll', 'phone too much', 'addicted to my phone',
    ],
    replies: [
      'That’s an honest question to ask. Some habits quietly take our peace without us noticing. A few common ones:\n\n• Reaching for the phone first thing in the morning and last thing at night.\n• Scrolling when tired, instead of resting.\n• Saying yes to everything, leaving no space for yourself.\n• Skipping meals, water, movement or sleep when busy.\n• Constantly multitasking, so your mind never settles on one thing.\n• Replaying worries without writing them down or acting on them.\n\nYou don’t need to change them all. Pick one, and replace it with something small: three breaths before checking your phone, or 5 minutes of stretching before bed.\n\nThese can be your small replacements:',
    ],
    actions: [med('better-mornings-waking'), med('calm-foundations-everyday'), yoga('desk-stretch'), page('/notifications', 'Set a gentle reminder')],
    suggestions: ['What small habits can help me feel less stressed?', 'Help me build a simple morning routine', 'Help me build a nighttime routine'],
  }),
  topic({
    id: 'ask-me-questions',
    keywords: [
      'ask me questions', 'ask me', 'questions to help me', 'understand myself', 'know myself', 'self reflection',
      'reflect', 'reflection', 'journal', 'journaling', 'journalling', 'who am i',
    ],
    replies: [
      'I’d be glad to. Take your time with each one, and answer here, in your head, or in Reflections. There are no wrong answers.\n\n1. What has been on your mind most this week?\n2. What made you feel most like yourself recently?\n3. What drains you, and what fills you up?\n4. What are you avoiding, and why might that be?\n5. What would you do if you weren’t afraid of being judged?\n6. What do you need more of right now, and what do you need less of?\n7. What would the kindest version of you say to you today?\n\nPick one to start with. If you tell me your answer, I can suggest something that fits it.',
    ],
    actions: [page('/reflections', 'Open Reflections'), page('/assessment', 'Take the check-in'), med('kind-to-yourself-what-you-need')],
    suggestions: ['What do I actually need right now?', 'What emotions have I been ignoring?', 'What does feeling at peace mean to me?'],
  }),

  // ─── 8. Healthy habits ────────────────────────────────────────────────────
  topic({
    id: 'daily-habit',
    keywords: [
      'daily habit', 'every day', 'everyday', 'habit', 'keep a streak', 'make meditation', 'meditate daily', 'meditate every day',
      'daily practice', 'routine', 'regularly', 'streak',
    ],
    replies: [
      'The best way to make meditation a habit is to make it small and easy. A few minutes every day matters much more than a long session once a week.\n\nSome things that help:\n• Start with 3 to 5 minutes. Short enough that you can’t say no.\n• Attach it to something you already do: after brushing your teeth, with your morning coffee, or when you get into bed.\n• Use the same place each time, so your body starts to recognise it.\n• Set a gentle reminder at the time that suits you.\n• Missed a day? Just start again. No streak is more important than coming back.\n\nA program gives you a path to follow, a little each day:',
    ],
    actions: [page('/programs/calm-foundations', 'Calm Foundations program'), med('meditation-daily'), page('/notifications', 'Set a daily reminder'), page('/profile', 'See your streak')],
    suggestions: ['How do I stay consistent when I lose motivation?', 'What is a good routine for beginners?', 'Can you create a 7-day mindfulness challenge?'],
  }),
  topic({
    id: 'consistency',
    keywords: [
      'consistent', 'consistency', 'stay consistent', 'lose motivation', 'losing motivation', 'motivation',
      'unmotivated', 'no motivation', 'give up', 'keep going', 'discipline', 'lazy',
    ],
    replies: [
      'Motivation always comes and goes, for everyone. Consistency doesn’t depend on feeling motivated; it depends on making the habit so easy that you can do it even on low days.\n\nSome ways to keep going:\n• Have a “minimum version”: on hard days, just one minute or three breaths. It still counts.\n• Remember why you started. Write it somewhere you’ll see it.\n• Notice how you feel after, not before. That feeling is what brings you back.\n• Don’t aim for perfect. Aim for “more often than not”.\n• Be kind when you slip. Shame makes you quit; kindness makes you return.\n\nThese are short enough for any day:',
    ],
    actions: [med('letting-go-of-stress-reset'), med('midday-reset'), page('/notifications', 'Set a daily reminder'), page('/profile', 'See your progress')],
    suggestions: ['How can I make meditation a daily habit?', 'Can you create a 7-day mindfulness challenge?', 'What small habits help with stress?'],
  }),
  topic({
    id: 'morning-routine',
    keywords: [
      'morning routine', 'morning', 'mornings', 'start to my day', 'start my day', 'start of the day', 'wake up',
      'waking up', 'peaceful start', 'begin my day', 'when i wake',
    ],
    replies: [
      'Here’s a simple, peaceful morning routine. It takes about 15 minutes, and you can shorten it on busy days:\n\n1. Before reaching for your phone, take three slow breaths in bed. (1 min)\n2. Drink a glass of water and open a window or curtain for daylight. (2 min)\n3. Gentle stretching or a short yoga flow to wake your body. (5 min)\n4. A short meditation, or simply sitting with your breath. (5 min)\n5. Choose one intention for the day, like “be patient” or “one thing at a time”. (1 min)\n\nThe Better Mornings program walks you through this, and these fit right in:',
    ],
    actions: [yoga('morning-flow'), med('morning-clarity'), med('better-mornings-waking'), page('/programs/better-mornings', 'Better Mornings program')],
    suggestions: ['Help me build a nighttime routine', 'How can I make meditation a daily habit?', 'How can I be more intentional with my time?'],
  }),
  topic({
    id: 'beginner-routine',
    keywords: [
      'beginner', 'beginners', 'for beginners', 'new to meditation', 'never meditated', 'how to meditate', 'learn to meditate',
      'teach me to meditate', 'learn meditation',
      'how do i meditate', 'start meditating', 'first time', 'getting started', 'where do i start', 'where to start',
      'tried meditating', 'didnt work', 'doesnt work', 'cant meditate', 'how long should i meditate',
      'point of meditating', 'meditation isnt working', 'doing it wrong', 'mind wanders',
    ],
    replies: [
      'Welcome. Meditation is simply paying attention, usually to your breath, and gently coming back each time your mind wanders. Wandering isn’t failing; noticing it and coming back is the practice itself.\n\nA good beginner routine:\n• Week 1: 3 to 5 minutes a day, focusing on your breath. Same time each day.\n• Week 2: 5 to 10 minutes, adding a body scan a few times.\n• Week 3 onwards: try different kinds, like breathing, walking, kindness and sleep meditations, and see what suits you.\n\nTips: sit comfortably (a chair is fine), it’s okay to feel restless, and there’s no “perfect” session.\n\nCalm Foundations is made for beginners, a short step each day. Or start with one of these:',
    ],
    actions: [med('free-your-mind'), page('/programs/calm-foundations', 'Calm Foundations program'), med('calm-foundations-breath'), yoga('chair-yoga')],
    suggestions: ['How can I make meditation a daily habit?', 'Guide me through a breathing exercise', 'Can you create a 7-day mindfulness challenge?'],
  }),
  topic({
    id: 'me-time',
    keywords: [
      'time for myself', 'make time', 'me time', 'without feeling guilty', 'guilty for resting', 'guilty about resting',
      'no time for myself', 'selfish', 'rest without guilt', 'time to myself',
    ],
    replies: [
      'Taking time for yourself isn’t selfish. It’s like refuelling: when you rest and recover, you have more patience, care and energy for everyone and everything else. The guilt often comes from believing your worth depends on being useful. It doesn’t.\n\nSome ways to make it real:\n• Start small: 10 minutes a day that belongs only to you.\n• Put it in your calendar like any other appointment.\n• Tell the people around you: “I’m taking 15 minutes, then I’m all yours.”\n• When guilt comes, notice it and say: “Rest is part of taking care of my responsibilities.”\n\nIt can be a meditation, a stretch, a story or just a sound and a cup of tea. You can even schedule it in Serenity:',
    ],
    actions: [page('/calendar', 'Schedule time for you'), yoga('evening-unwind'), med('kind-to-yourself-what-you-need'), sound('fireplace')],
    suggestions: ['How do I set boundaries without guilt?', 'Help me build a nighttime routine', 'What small habits help with stress?'],
  }),
  topic({
    id: 'challenge-7day',
    keywords: [
      '7 day', '7day', 'seven day', '7 days', 'seven days', 'challenge', 'mindfulness challenge', 'week long',
      'one week', 'a week', 'plan for the week', 'weekly plan',
    ],
    replies: [
      'Here’s a gentle 7-day mindfulness challenge. Each day takes about 5 to 10 minutes:\n\nDay 1: Breath. 5 minutes of noticing your natural breath.\nDay 2: Body. A body scan, head to toe.\nDay 3: Mindful moment. Do one everyday task, like tea, a shower or a walk, with full attention.\nDay 4: Movement. A slow, gentle yoga session.\nDay 5: Kindness. A self-compassion meditation, and one kind act for someone else.\nDay 6: Gratitude. Write down three good things before bed.\nDay 7: Stillness. A quiet sit with only bells, then reflect on the week.\n\nYou can schedule these in the Calendar so Serenity reminds you each day. Here’s what to start with:',
    ],
    actions: [med('breath-school-natural'), med('body-scan'), yoga('breath-balance'), page('/calendar', 'Plan it in Calendar')],
    suggestions: ['How do I stay consistent when I lose motivation?', 'Help me build a simple morning routine', 'What is a good routine for beginners?'],
  }),
  topic({
    id: 'intentional-time',
    keywords: [
      'intentional', 'intentionally', 'with my time', 'manage my time', 'time management', 'wasting time',
      'waste so much time', 'wasting my day',
      'waste time', 'procrastinate', 'procrastinating', 'procrastination', 'priorities', 'prioritize', 'prioritise',
      'focus', 'distracted', 'concentrate',
    ],
    replies: [
      'Being intentional with your time isn’t about squeezing more in. It’s about choosing what matters, so your days feel like yours.\n\nSome simple ways:\n• Each morning, pick your “one thing”: the task that would make today feel worthwhile.\n• Work in focused blocks, like 25 to 45 minutes on one thing with notifications off, then a real break.\n• Before opening an app, pause and ask: “What am I here for?”\n• At the end of the day, notice where your time went, without judging, just learning.\n• Leave some space unplanned. Rest is a good use of time too.\n\nThese help you start with focus and come back to it:',
    ],
    actions: [med('focus-reset-before-work'), med('better-mornings-intention'), med('deep-focus'), sound('brown')],
    suggestions: ['Help me build a simple morning routine', 'What habits make it harder to feel at peace?', 'How do I make time for myself without guilt?'],
  }),
  topic({
    id: 'small-habits',
    keywords: [
      'small habits', 'little habits', 'simple habits', 'healthy habits', 'less stressed', 'feel less stressed',
      'reduce stress', 'manage stress', 'cope with stress', 'tips', 'self care tips',
    ],
    replies: [
      'Small habits, done often, make a real difference to stress. Here are a few easy ones:\n\n• Three slow breaths before checking your phone, eating, or starting a task.\n• A 2-minute stretch every couple of hours, especially neck and shoulders.\n• A short walk outside, even just around the block, ideally in daylight.\n• Drinking water regularly. Mild dehydration feels like stress.\n• Writing down worries instead of carrying them in your head.\n• One screen-free moment a day: a meal, a cup of tea, the first 10 minutes after waking.\n• Ending the day with one good thing that happened.\n\nPick one or two and try them this week. These are quick and fit anywhere:',
    ],
    actions: [med('letting-go-of-stress-reset'), yoga('desk-stretch'), yoga('neck-shoulders'), page('/activities', 'Daily activities')],
    suggestions: ['Help me build a simple morning routine', 'Help me build a nighttime routine', 'How can I make meditation a daily habit?'],
  }),
  topic({
    id: 'night-routine',
    keywords: [
      'nighttime routine', 'night time routine', 'night routine', 'evening routine', 'bedtime routine', 'before sleep',
      'wind down', 'winding down', 'sleep routine', 'routine at night',
    ],
    replies: [
      'Here’s a calming nighttime routine, about 30 to 45 minutes before you want to sleep:\n\n1. Dim the lights and lower the noise around you. It tells your body night is coming. (Start)\n2. Put your phone on charge away from your bed, or turn the screen low. (1 min)\n3. Write down tomorrow’s tasks and any worries, so your mind can let them go. (5 min)\n4. Gentle stretches or bedtime yoga to release the day from your body. (10 min)\n5. Wash, change, and do something soothing, like warm tea or a shower. (10 min)\n6. In bed: a sleep meditation, a story, or a soft sound with the sleep timer. (10+ min)\n\nThe Sleep Mastery program builds this up night by night. These fit right in:',
    ],
    actions: [yoga('bedtime-yoga'), med('night-wind-down'), story('snowed-in-cabin'), page('/programs/sleep-mastery', 'Sleep Mastery program')],
    suggestions: ['Help me fall asleep tonight', 'Tell me a calming story', 'Help me build a simple morning routine'],
  }),

  // ─── Finding things in Serenity ───────────────────────────────────────────
  topic({
    id: 'sounds',
    keywords: [
      'sound', 'sounds', 'soundscape', 'soundscapes', 'rain sounds', 'ocean sounds', 'nature sounds', 'white noise',
      'brown noise', 'noise', 'music', 'relaxing music', 'calm music', 'ambient', 'background sound', 'play something',
      'something calming to listen to', 'something to listen to', 'listen to something',
    ],
    replies: [
      'Sound can do a lot when words feel like too much. Serenity has sixteen soundscapes, like rain, ocean, forest, a crackling fire, a brook and brown noise, and you can layer them into your own mix in the Sleep tab.\n\nSome ideas:\n• To fall asleep: rain or ocean, with the sleep timer so it fades out on its own.\n• To focus: brown noise or a brook, kept low.\n• To calm down: a slow heartbeat or a singing bowl.\n• To feel cosy: the fireplace with a little wind.\n\nTap one to open it in Sleep:',
    ],
    actions: [sound('rain'), sound('ocean'), sound('brown'), sound('fireplace'), page('/sleep', 'Open Sleep')],
    suggestions: ['Help me fall asleep tonight', 'Help me focus', 'Tell me a calming story'],
  }),
  topic({
    id: 'yoga',
    keywords: [
      'yoga', 'yoga for', 'yoga for beginners', 'stretch', 'stretches', 'stretching', 'move my body', 'movement', 'exercise for', 'gentle exercise',
      'back is stiff', 'tight shoulders', 'stiff neck', 'sitting all day',
    ],
    replies: [
      'Moving gently is one of the quickest ways to calm the mind, because the body and mind settle together. Serenity’s yoga sessions are short and beginner-friendly, with nothing you need except a wall, a chair or a bed, and a soft bell between poses.\n\nSome to try:\n• In the morning: a slow wake-up flow.\n• At your desk: neck, shoulder and wrist stretches without leaving your chair.\n• When anxious: Calm the Nerves, to slow a racing body.\n• At night: yoga done lying in bed.\n\nIf something hurts, ease off. Gentle is the point. Pick one:',
    ],
    actions: [yoga('morning-flow'), yoga('desk-stretch'), yoga('calm-the-nerves'), yoga('bedtime-yoga'), page('/yoga', 'All yoga')],
    suggestions: ['Help me build a simple morning routine', 'Guide me through a body relaxation', 'Help me calm down right now'],
  }),
];
