import type { StaticImageData } from 'next/image';

import aerialSea from '@/assets/images/aerial-sea.jpg';
import ancientTree from '@/assets/images/ancient-tree.jpg';
import duskRidge from '@/assets/images/dusk-ridge.jpg';
import forestBridge from '@/assets/images/forest-bridge.jpg';
import forestLight from '@/assets/images/forest-light.jpg';
import groupBanner from '@/assets/images/groupbanner.png';
import meditationSunrise from '@/assets/images/meditation-sunrise.jpg';
import milkyWay from '@/assets/images/milky-way.jpg';
import morningField from '@/assets/images/morning-field.jpg';
import mountainValley from '@/assets/images/mountain-valley.jpg';
import nightSky from '@/assets/images/night-sky.jpg';
import oceanWave from '@/assets/images/ocean-wave.jpg';
import openArms from '@/assets/images/open-arms.jpg';
import palmDusk from '@/assets/images/palm-dusk.jpg';
import recoOne from '@/assets/images/recoone.png';
import recoTwo from '@/assets/images/recotwo.png';
import starfield from '@/assets/images/starfield.jpg';
import sunriseHills from '@/assets/images/sunrise-hills.jpg';

/**
 * Photography is imported statically rather than referenced by path so Next can
 * emit intrinsic dimensions and a blur placeholder for every image.
 * Source: Unsplash (see src/assets/images/CREDITS.md).
 */
export const photos = {
  aerialSea,
  ancientTree,
  duskRidge,
  forestBridge,
  forestLight,
  groupBanner,
  meditationSunrise,
  milkyWay,
  morningField,
  mountainValley,
  nightSky,
  oceanWave,
  openArms,
  palmDusk,
  recoOne,
  recoTwo,
  starfield,
  sunriseHills,
} satisfies Record<string, StaticImageData>;

export type PhotoKey = keyof typeof photos;
