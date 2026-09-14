import type { StaticImageData } from 'next/image';

import { photos } from '@/data/images';
import type { SoundscapeId } from '@/lib/audio/soundscapes';
import type { YogaPose, YogaSide } from '@/lib/yoga';

/**
 * Guided yoga: short, gentle sequences written for Serenity, played one pose
 * at a time with a soft bell between poses.
 *
 * Every pose is beginner-friendly and none needs equipment beyond a wall, a
 * chair or a bed. Each session's length is the sum of its poses. Ids appear
 * in the URL (/yoga/<id>) and in the offline precache, so never rename one.
 */

export type YogaLevel = 'Gentle' | 'Beginner' | 'All levels';

export interface YogaSession {
  id: string;
  title: string;
  subtitle: string;
  /** Short label for when or what it's for, e.g. "Morning". */
  focus: string;
  level: YogaLevel;
  image: StaticImageData;
  imageAlt: string;
  /** The ambient bed that plays underneath, if ambience is on. */
  soundscape: SoundscapeId;
  description: string;
  poses: YogaPose[];
}

/** Shown before every session and on the Yoga tab. */
export const YOGA_SAFETY =
  'Move gently and never into pain — soften or skip any pose. If you’re pregnant, injured or have a health condition, check with a doctor before you start.';

const pose = (name: string, seconds: number, cue: string, side?: YogaSide): YogaPose => ({
  name,
  seconds,
  cue,
  ...(side ? { side } : {}),
});

/** The same pose on each side, left first. */
const bothSides = (name: string, seconds: number, cue: string): YogaPose[] => [
  pose(name, seconds, cue, 'left'),
  pose(name, seconds, cue, 'right'),
];

export const yogaSessions: YogaSession[] = [
  {
    id: 'morning-flow',
    title: 'Morning Wake-Up Flow',
    subtitle: 'Wake the body gently',
    focus: 'Morning',
    level: 'Beginner',
    image: photos.sunriseHills,
    imageAlt: 'Sunrise over rolling hills',
    soundscape: 'forest',
    description:
      'Ten unhurried minutes to loosen a stiff body and wake up without rushing. Kneeling and standing poses, all beginner-friendly.',
    poses: [
      pose('Easy seated breath', 60, 'Sit tall, cross-legged or on a chair. Close your eyes and breathe slowly through your nose.'),
      pose('Neck rolls', 45, 'Let your chin drop toward your chest, then roll one ear toward each shoulder. Slow and easy.'),
      pose('Cat–cow', 60, 'On hands and knees, arch your back as you breathe in and round it as you breathe out.'),
      pose('Downward dog', 45, 'Tuck your toes and lift your hips up and back. Keep your knees as bent as you like.'),
      ...bothSides('Low lunge', 45, 'Step one foot forward between your hands, lower the back knee and lift your chest.'),
      pose('Mountain pose', 45, 'Stand tall with feet hip-width apart. Feel the floor under your feet and soften your shoulders.'),
      ...bothSides('Standing side stretch', 30, 'Reach both arms up, then lean gently to one side. Keep breathing into your ribs.'),
      pose('Forward fold', 45, 'Hinge at the hips and let your upper body hang. Soft knees, heavy head.'),
      pose('Chair pose', 30, 'Bend your knees as if sitting back into a chair, arms reaching forward.'),
      ...bothSides('Tree pose', 30, 'Rest one foot on the opposite ankle or calf — never the knee. Use a wall if you like.'),
      pose('Closing breath', 60, 'Hands on your belly. Take a few slow breaths and notice how you feel now.'),
    ],
  },
  {
    id: 'desk-stretch',
    title: 'Desk Break Stretch',
    subtitle: 'Five minutes in your chair',
    focus: 'At your desk',
    level: 'Gentle',
    image: photos.forestLight,
    imageAlt: 'Sunlight through forest trees',
    soundscape: 'pad',
    description:
      'For stiff shoulders and a tired neck in the middle of the day. Everything is done sitting down — no mat, no changing clothes.',
    poses: [
      pose('Seated breath', 45, 'Sit tall with both feet flat on the floor. Rest your hands on your thighs and breathe slowly.'),
      pose('Shoulder rolls', 30, 'Lift your shoulders to your ears, roll them back, and let them drop. Repeat slowly.'),
      ...bothSides('Neck side stretch', 30, 'Tilt one ear toward your shoulder. Let the opposite shoulder stay heavy.'),
      ...bothSides('Seated twist', 30, 'Hold the back of the chair and turn gently from your belly, then your chest. Never force it.'),
      pose('Wrist and finger stretch', 30, 'Extend one arm, palm up, and gently draw the fingers back with your other hand. Then swap.'),
      pose('Seated cat–cow', 45, 'Hands on your knees: arch forward as you breathe in, round your back as you breathe out.'),
      pose('Closing breath', 30, 'Close your eyes for a few breaths before you go back to your day.'),
    ],
  },
  {
    id: 'evening-unwind',
    title: 'Evening Unwind',
    subtitle: 'Slow floor stretches',
    focus: 'Evening',
    level: 'Gentle',
    image: photos.palmDusk,
    imageAlt: 'Palm trees at dusk',
    soundscape: 'ocean',
    description:
      'Fifteen minutes on the floor to let the day go. Slow, low stretches that finish lying down.',
    poses: [
      pose('Child’s pose', 90, 'Knees wide, big toes together. Sit back toward your heels and rest your forehead down.'),
      pose('Cat–cow', 60, 'On hands and knees, breathe in to arch and breathe out to round. Let it be slow.'),
      ...bothSides('Thread the needle', 45, 'From hands and knees, slide one arm under the other and rest your shoulder and cheek down.'),
      ...bothSides('Low lunge', 45, 'One foot forward, back knee down. Sink your hips a little and breathe.'),
      pose('Seated forward fold', 90, 'Sit with your legs out long and fold forward from your hips. Bend your knees as much as you need.'),
      pose('Butterfly', 60, 'Soles of the feet together, knees falling open. Sit tall or fold gently forward.'),
      ...bothSides('Lying twist', 60, 'Lying on your back, let both knees drop to one side and look the other way.'),
      pose('Happy baby', 45, 'On your back, hold your feet or shins and let your knees fall toward your armpits. Rock gently.'),
      pose('Legs up the wall', 120, 'Lie close to a wall and rest your legs up it. Arms by your sides, palms up.'),
      pose('Rest', 135, 'Lie flat and let your whole body be heavy. Nothing to do now but breathe.'),
    ],
  },
  {
    id: 'bedtime-yoga',
    title: 'Yoga for Bedtime',
    subtitle: 'Done lying in bed',
    focus: 'Before sleep',
    level: 'Gentle',
    image: photos.nightSky,
    imageAlt: 'A calm night sky full of stars',
    soundscape: 'night',
    description:
      'Twelve minutes you can do in bed with the lights down. No standing, no effort — just a slow slide toward sleep.',
    poses: [
      pose('Lying breath', 60, 'Lie on your back, one hand on your chest and one on your belly. Let your breath slow down.'),
      pose('Knees to chest', 60, 'Hug both knees in and rock gently from side to side.'),
      ...bothSides('Lying twist', 60, 'Let both knees fall to one side, arms out wide. Breathe into your back.'),
      pose('Reclined butterfly', 90, 'Soles of the feet together, knees falling open. Put a pillow under each knee if you like.'),
      pose('Legs up the headboard', 120, 'Rest your legs up the headboard or a wall, or simply on a pillow.'),
      pose('Body melt', 270, 'Lie however is comfortable. Let each part of your body grow heavy, from your feet to your face.'),
    ],
  },
  {
    id: 'back-release',
    title: 'Hips & Lower Back Release',
    subtitle: 'Ease a tight, tired back',
    focus: 'Back and hips',
    level: 'Beginner',
    image: photos.mountainValley,
    imageAlt: 'A quiet mountain valley',
    soundscape: 'rain',
    description:
      'Twelve minutes for hips and a lower back that sit too much. Gentle floor poses — move slowly and skip anything that pinches.',
    poses: [
      pose('Child’s pose', 60, 'Sit back toward your heels with your arms long in front. Breathe into your lower back.'),
      pose('Cat–cow', 60, 'On hands and knees, arch as you breathe in and round as you breathe out.'),
      pose('Sphinx', 60, 'Lie on your front, elbows under your shoulders. Lift your chest a little and relax your legs.'),
      ...bothSides('Low lunge', 45, 'One foot forward, back knee down. Tuck your tailbone slightly to feel the front of the hip.'),
      ...bothSides('Figure-four stretch', 60, 'On your back, cross one ankle over the opposite knee and draw both legs gently toward you.'),
      pose('Bridge', 45, 'On your back with knees bent, press through your feet and lift your hips a little.'),
      pose('Knees to chest', 45, 'Hug your knees in and let your lower back rest on the floor.'),
      ...bothSides('Lying twist', 45, 'Drop both knees to one side and let your back soften.'),
      pose('Rest', 150, 'Lie flat, or with knees bent and feet on the floor. Let your back settle.'),
    ],
  },
  {
    id: 'breath-balance',
    title: 'Breath & Balance',
    subtitle: 'Steady body, steady mind',
    focus: 'Focus',
    level: 'All levels',
    image: photos.morningField,
    imageAlt: 'A morning field in soft light',
    soundscape: 'chimes',
    description:
      'Ten minutes of calm breathing and simple balance poses to gather your attention. Keep a wall or chair nearby.',
    poses: [
      pose('Seated breath', 60, 'Sit tall and breathe slowly. Let each exhale be a little longer than the inhale.'),
      pose('Box breathing', 60, 'Breathe in for four, hold for four, out for four, hold for four. Repeat.'),
      pose('Mountain pose', 45, 'Stand tall, weight even across both feet. Soft knees, easy shoulders.'),
      ...bothSides('Tree pose', 45, 'One foot on the opposite ankle or calf, hands at your chest. Fix your gaze on one spot.'),
      ...bothSides('Warrior II', 45, 'Feet wide, front knee bent over the ankle, arms stretched out. Look past your front hand.'),
      pose('Chair pose', 30, 'Sit back as if into a chair, arms forward. Breathe steadily.'),
      pose('Eagle arms', 30, 'Cross one arm under the other and bring your palms together if you can. Lift the elbows gently.'),
      ...bothSides('Standing knee lift', 30, 'Lift one knee to hip height and balance. Hold a wall or chair any time.'),
      pose('Standing forward fold', 45, 'Fold forward with soft knees and let your head hang.'),
      pose('Rest', 90, 'Sit or lie down and let your breathing return to normal.'),
    ],
  },
];

export function getYogaSession(id: string): YogaSession | undefined {
  return yogaSessions.find((session) => session.id === id);
}
