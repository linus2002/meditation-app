import { photos } from '@/data/images';
import type { Story, StoryCategory } from '@/types';

/**
 * Original stories, written for this app — nothing licensed, nothing scraped.
 * They are deliberately low-stakes and slow: no jeopardy, no twist, nothing
 * that would pull someone back awake near the end.
 *
 * The text is the source for both reading and narration, so it is punctuated
 * for the ear as much as the eye — short sentences, few clauses, and full
 * stops where a voice would naturally rest.
 */
export const stories: Story[] = [
  {
    id: 'lighthouse',
    title: 'The Lighthouse Keeper',
    description: 'A long night watch, and nothing at all going wrong',
    category: 'sleep',
    voice: 'Ines Moreau',
    image: photos.oceanWave,
    imageAlt: 'A slow wave rolling across open water at dusk',
    soundscape: 'ocean',
    paragraphs: [
      'The keeper climbs the stairs at dusk, the way she has for eleven years. There are ninety-four steps. She does not count them any more, but her legs still know where the landing is, and they slow a little before it without being asked.',
      'At the top, the lamp room is cold and smells faintly of brass polish. She sets down her tea. The glass is already clean. She cleans it anyway, in slow circles, because the doing of it is the point.',
      'Outside, the sea moves the way it always moves. Not toward anything. Just up, and over, and down, and back. The light swings out across it, finds nothing, and swings out again.',
      'A ship passes far out, low and patient, its own lights small and steady. She watches it for a while. It does not need her tonight. Most nights nothing needs her. That is what a good night looks like from up here.',
      'She sits. The lamp turns. The room fills with light and empties again, fills and empties, in no hurry whatsoever.',
      'Somewhere below, the water works at the rocks the way it has for longer than there have been keepers, or stairs, or names for any of it. It is not trying to wear them down. It simply is what it does, and the rocks are what they do, and between them nothing is being decided.',
      'Her tea goes cold. She does not mind. The night is long and there is nothing in it that has to be finished.',
      'The light goes out across the water. Finds nothing. Comes back. Goes out again.',
    ],
  },
  {
    id: 'night-ferry',
    title: 'The Night Ferry',
    description: 'Crossing dark water with nowhere to be until morning',
    category: 'sleep',
    voice: 'Noah Brandt',
    image: photos.milkyWay,
    imageAlt: 'The Milky Way arcing above a dark mountain range',
    soundscape: 'night',
    paragraphs: [
      'The ferry leaves at ten, and it is never full. There are perhaps a dozen of you, spread out across a cabin built for two hundred, each with a whole row of seats and no reason to speak.',
      'The engine settles into its note about a minute after leaving. It is a low sound, more felt than heard, and it does not change for the rest of the crossing.',
      'Through the window there is nothing to look at, which turns out to be the best thing to look at. Black water, a darker line where it meets the sky, and now and then a light on a far shore that takes a long time to move.',
      'A crew member walks the aisle once, checking nothing in particular, and does not come back.',
      'Someone has left a paperback face-down on a seat. Nobody moves it. It will still be there at the far side.',
      'The boat lifts, very slightly, and settles. Lifts, and settles. Not enough to notice unless you are looking for it, and there is no reason to look for it.',
      'You are not steering. You are not navigating. Someone above you is doing all of that, competently, as they have a thousand times before, and the whole arrangement asks nothing of you except that you sit here until it is done.',
      'Four hours of dark water. No stops. Nothing to decide until the lights of the harbour, and those are a long way off yet.',
    ],
  },
  {
    id: 'slow-train',
    title: 'The Slow Train',
    description: 'An unhurried afternoon through fields and small stations',
    category: 'sleep',
    voice: 'Ava Lindqvist',
    image: photos.morningField,
    imageAlt: 'Open fields under a low afternoon sun',
    soundscape: 'drone',
    paragraphs: [
      'It is the slow service, the one that stops everywhere, and you have taken it on purpose.',
      'The carriage smells of warm dust and old upholstery. Sunlight comes through the window in a long bar and lies across the seat beside you, and you can feel it through your sleeve.',
      'Fields go past. Then a hedge, close and fast. Then fields again, further off and slower, and behind them hills that barely move at all. Three speeds at once, out of one window.',
      'The train slows for a station with two benches and a name you do not recognise. Nobody gets on. Nobody gets off. After a while, with no particular urgency, it starts again.',
      'The rhythm underneath is not quite regular. There is a pattern, and then a longer gap, and then the pattern again. Your body learns it without being asked.',
      'A level crossing. A lane. A parked car with nobody in it. A man on a bicycle, stopped, waiting, looking at nothing.',
      'You have hours yet. The ticket says so. There is no version of this afternoon in which you arrive early, and nothing you do in this seat will change when the train gets in.',
      'Fields. A hedge. Fields. The light moves slowly up the seat as the sun goes down.',
    ],
  },
  {
    id: 'rain-walk',
    title: 'A Walk in the Rain',
    description: 'Wet streets, warm coat, nowhere in particular to be',
    category: 'relaxation',
    voice: 'Ines Moreau',
    image: photos.duskRidge,
    imageAlt: 'Layered hills under low grey cloud',
    soundscape: 'rain',
    paragraphs: [
      'It has been raining since before you woke, the steady kind that has settled in and made itself comfortable.',
      'You go out into it anyway, coat buttoned, hood up, hands in pockets. Within a minute your shoulders come down from where they had been sitting all morning.',
      'The street is quieter than usual. Rain does that. Everyone who could stay in has stayed in, so the pavement is yours, and the sound of it is yours too.',
      'It taps on the hood, very close to your ears, and further off it hisses on the road. Two different rains, arriving at once.',
      'Gutters run. Leaves lift and turn over under the weight of the water. A drainpipe somewhere is doing something complicated and rhythmic that you can hear from half a street away.',
      'You pass a lit window. A kitchen, someone moving about in it, unaware of being seen. You keep walking. It is a good thing to notice and then leave alone.',
      'Your feet find a pace and keep it without being told. Not fast. There is nowhere you are heading.',
      'The rain does not let up and you stop expecting it to, and that is when the walk becomes properly pleasant. Nothing to wait out. Just this, for as long as you want it.',
    ],
  },
  {
    id: 'morning-kitchen',
    title: 'The Morning Kitchen',
    description: 'Ten quiet minutes before the day starts asking',
    category: 'mindfulness',
    voice: 'Noah Brandt',
    image: photos.sunriseHills,
    imageAlt: 'Sun cresting a line of rolling hills',
    soundscape: 'pad',
    paragraphs: [
      'You are up before you needed to be, and the kitchen is still dark at the edges.',
      'The kettle goes on. It starts quietly, almost politely, and then works itself up into that full rolling sound before it clicks off and the room is silent again.',
      'The tap runs cold over your hands for a moment longer than it needs to. You notice that you let it.',
      'Steam comes off the cup and leans toward the window. You watch it for the length of one breath, then another.',
      'Outside, the light is arriving without any announcement. The wall opposite is grey, then slightly less grey, then faintly warm along its top edge.',
      'A bird starts up somewhere and gets no answer. It tries again. Still nothing. It seems untroubled by this.',
      'There is a list of things today will want from you. It is not here yet. It is in another room, on a screen, and it will still be there in ten minutes, unchanged and no larger.',
      'For now there is a warm cup, a cold tap, a grey wall going slowly gold. This is the whole of it, and it is enough to be going on with.',
    ],
  },
  {
    id: 'old-orchard',
    title: 'The Old Orchard',
    description: 'Long grass, low branches, and an afternoon with no edges',
    category: 'relaxation',
    voice: 'Ava Lindqvist',
    image: photos.ancientTree,
    imageAlt: 'Sunlight breaking through the canopy of a broad old tree',
    soundscape: 'forest',
    paragraphs: [
      'The orchard has not been properly tended in years, and it is all the better for it.',
      'The grass is long and goes over at the top, and it drags gently at your ankles as you walk in. The trees are old, low-branched, leaning in whatever direction the wind settled them.',
      'You find a place where two roots come up out of the ground and make something almost like a chair, and you sit down in it.',
      'Above you the leaves are doing their slow shuffle. The light comes through in pieces and moves around on the grass, never landing anywhere for long.',
      'There is fruit on the ground, more than anyone could use. Wasps are working at some of it, unhurried, entirely occupied. They have no interest in you at all.',
      'Somewhere out of sight a wood pigeon says its five soft notes, stops, and after a while says them again in exactly the same way.',
      'Nothing here is being maintained. The trees are getting on with it. The grass is getting on with it. It has all been managing perfectly well without supervision.',
      'You let your shoulders go. You let your jaw go. The leaves shuffle. The light moves around. The afternoon has no particular plans for you.',
    ],
  },
];

export const storyCategories: { value: StoryCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'relaxation', label: 'Relaxation' },
  { value: 'mindfulness', label: 'Mindfulness' },
];

export function getStory(id: string): Story | undefined {
  return stories.find((story) => story.id === id);
}

export const sleepStories = stories.filter((story) => story.category === 'sleep');
