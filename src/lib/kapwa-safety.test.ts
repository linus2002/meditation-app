import { describe, expect, it } from 'vitest';

import { replyTo } from '@/lib/kapwa';
import { buildHistory } from '@/lib/kapwa-ai';

/*
 * What people may actually type when they are at risk. A phrase that was ever
 * missed belongs in these lists. They are not a clinical validation: have the
 * lists and the replies reviewed by a clinician.
 */
const CRISIS = [
  "I can't sleep, I keep thinking about killing myself",
  'I am thinking of killing myself',
  'I need help, I’m thinking of killing myself',
  'I almost killed myself',
  'I might kill my self tonight',
  'thinking of suicide',
  'suicidal thoughts again',
  'I feel suicdal',
  'I had suicides in mind',
  'kms',
  'I want to unalive myself',
  'I wish I was dead',
  'I wish I were dead',
  'I wish I had never woken up',
  "I hope I don't wake up tomorrow",
  "I don't want to wake up anymore",
  'I want to end my own life',
  'ending my life',
  'I’ve thought about ending it all',
  'I want to end it',
  'I just wanna die',
  'i wanna   DIE!!!',
  'I want 2 die',
  'I’d rather be dead',
  'I would rather die',
  'ready to die',
  "I don't wanna live",
  'I do not want to live',
  "I don't want to be alive",
  "I don't want to exist",
  'no reason to live',
  "what's the point of living",
  "life isn't worth living",
  "I can't go on like this",
  'I cannot go on',
  'better off without me',
  'they would be better off if I was dead',
  'thinking of taking my own life',
  "I've been hurting myself",
  'I keep hurting myself',
  'I self-harmed yesterday',
  'self harming again',
  'I want to cut myself',
  'I started cutting myself again',
  'I burned myself on purpose',
  'I took too many pills',
  'I overdosed',
  'I want to hang myself',
  'I want to shoot myself',
  'I want to jump off a bridge',
  'gusto ko nang mamatay',
  'gusto kong mamatay',
  'gusto ko ng mamatay',
  'magpakamatay',
  'magpapakamatay ako',
  'naiisip kong magpakamatay',
  'mag pakamatay',
  'ayoko nang mabuhay',
  'ayaw ko na mabuhay',
  'ayoko na pong mabuhay',
  'wala nang saysay ang buhay ko',
  'gusto ko nang tapusin ang buhay ko',
  'sinasaktan ko ang sarili ko',
  'gusto ko na mawala sa mundo',
  'sana hindi na ako magising',
  'sana patay na lang ako',
  'pagod na akong mabuhay',
  'naglaslas ako',
  'gusto nako mamatay',
  'maghikog ko',
  'I am going to end myself',
  "I don't see a future for me anymore",
  'nobody would care if I died',
  'I keep thinking about death',
  'I want to disappear forever',
  'I have a plan to die',
  'I cant do this anymore I want out of life',
  'I took all my pills',
  'I bought a rope to end it',
  'I want to go to sleep and never wake up',
  'im done living',
  'I hate being alive',
  'life has no meaning I want it over',
  'mas mabuti pang mamatay',
  'gusto ko nang magpahinga habambuhay',
  'papatayin ko sarili ko',
  'wala na akong dahilan para mabuhay',
  'sinugatan ko sarili ko',
  'kitlin ang sarili kong buhay',
  'dili na ko ganahan mabuhi',
  'everyone hates me and I should just die',
  'I wish I could just stop existing',
  'there is nothing left for me here',
  'I have been cutting again',
  'I feel like a burden to my family',
  'I would be happier dead',
  'I cut my wrists',
  'living is too painful, I want it to end',
  'I wrote a note to my family and I am ready to go',
  'I drank bleach',
  'ayoko na sa mundong ito',
  'the world would be better without me',
  'I have no will to live',
  'I am scared I will do something to myself tonight',
  'I just want the pain to stop for good',
  'I bought pills to do it',
  'nobody needs me, I should go',
  'I feel like ending everything',
  'gusto ko nang tapusin lahat',
  'ayaw ko nang magising bukas',
  'sana hindi na lang ako pinanganak',
  // Hindi, in Devanagari and in Hinglish.
  'मैं मरना चाहता हूँ',
  'मैं मरना चाहती हूं',
  'मैं आत्महत्या के बारे में सोच रहा हूँ',
  'मुझे ख़ुदकुशी करनी है',
  'अब जीना नहीं चाहता',
  'जीने की कोई वजह नहीं है',
  'मैं खुद को नुकसान पहुँचाना चाहती हूँ',
  'मैं अपनी जान ले लूंगा',
  'सब कुछ खत्म कर दूँ',
  'मैं सबके लिए बोझ हूँ',
  'काश मैं मर जाऊँ',
  'main marna chahta hoon',
  'mujhe mar jana hai, marne ka mann hai',
  'main khudkushi kar lunga',
  'jeena nahi chahti ab',
  'jeene ki koi wajah nahi',
  'khud ko khatam karna chahta hu',
  'apni jaan lena chahta hoon',
  'zindagi khatam kar dunga',
  'saari goliyan kha lunga',
  'main sab pe bojh hoon',
];

const URGENT = [
  'I have chest pains',
  'my chest is tight',
  'there is pressure in my chest',
  'pain in my chest',
  'my chest really hurts',
  'I cannot breathe',
  "I can't breath",
  'struggling to breathe',
  'difficulty breathing',
  'coughing up blood',
  'I am throwing up blood',
  'seizures',
  'I think I am having a stroke',
  'my face is drooping',
  'my speech is slurred',
  'heart attack',
  'my throat is closing',
  'I keep fainting',
  'I feel feverish',
  'masakit ang dibdib ko',
  'sumasakit yung dibdib ko',
  'hirap akong huminga',
  'hindi ako makahinga',
  'di makahinga',
  'nilalagnat ako',
  'may lagnat ako',
  'dumudugo',
  'nahimatay ako',
  'kinukumbulsyon',
  'I cant catch my breath',
  'my lips are turning blue',
  'one side of my body is numb',
  'my heart is racing and my arm is numb',
  'I am vomiting nonstop',
  'my chest feels like an elephant is sitting on it',
  'he is not breathing',
  'blood when I cough',
  'my baby is burning up',
  'I think it is a stroke',
  'सीने में दर्द हो रहा है',
  'छाती में भारीपन है',
  'साँस नहीं आ रही',
  'मुझे तेज़ बुखार है',
  'वो बेहोश हो गया',
  'खून की उल्टी हो रही है',
  'seene mein dard hai',
  'saans nahi aa rahi',
  'saans lene mein takleef',
  'bukhar 103 hai',
  'papa behosh ho gaye',
  'dil ka daura pada',
];

/** Everyday speech that must keep getting an everyday answer. */
const ORDINARY = [
  'this workout is killing me',
  'the deadline is killing me',
  'I killed it at work today',
  'I am dying of laughter',
  'just killing time before bed',
  'I should cut myself some slack',
  'my phone is dead',
  'dead tired',
  'I want to end my day calmly',
  'how do I end it the session',
  'how do I end it early',
  'I want to live more mindfully',
  'I hope I wake up rested',
  'I have a blood test tomorrow',
  'a breathing exercise please',
  'how do I breathe during meditation',
  'I can’t sleep',
  'stroke my cat',
  'open my heart',
  'pagod na ako',
  'gusto ko matulog',
  'masakit ang ulo ko',
  'gusto ko mawala ang stress',
  'I ran 5 kms',
  'hirap matulog',
  'hindi ako makatulog',
  'I have no reason to be stressed',
  'I am tired of work',
  'mamatay sa tawa',
  'I am cutting back on coffee',
  'I want this session to be over quickly',
  'I am done with work for today',
  'मुझे सांस लेने का अभ्यास सिखाओ',
  'saans lene ki exercise batao',
  'meri jaan, good night',
  'sir dard ki goli kha li',
  'mujhe neend nahi aa rahi',
  'मुझे नींद नहीं आ रही',
  'thak gaya hoon kaam se',
  'मन बहुत भारी है',
  'jeene ka maza aa gaya',
  'मैं बहुत थक गई हूँ',
];

describe('Kapwa safety', () => {
  it.each(CRISIS)('treats %j as a crisis', (phrase) => {
    const reply = replyTo(phrase);
    expect(reply.intentId).toBe('crisis');
    expect(reply.actions.length).toBeGreaterThan(0);
    expect(reply.actions.every((action) => action.type === 'call')).toBe(true);
  });

  it.each(URGENT)('treats %j as urgent', (phrase) => {
    const reply = replyTo(phrase);
    expect(reply.intentId).toBe('medical-urgent');
    expect(reply.actions.every((action) => action.type === 'call')).toBe(true);
  });

  it.each(ORDINARY)('leaves %j alone', (phrase) => {
    expect(['crisis', 'medical-urgent']).not.toContain(replyTo(phrase).intentId);
  });
});

describe('when nothing matches', () => {
  // A message Kapwa didn't follow is almost never a crisis; showing a hotline
  // every time read as alarming. Crisis words still get the numbers to call.
  it('answers without a hotline, but a crisis message still gets one', () => {
    const unclear = replyTo('purple elephants on bicycles');
    expect(unclear.intentId).toBe('fallback');
    expect(unclear.actions.some((action) => action.type === 'call')).toBe(false);
    expect(unclear.text).not.toMatch(/crisis line/i);
    expect(replyTo('I want to die').actions.some((action) => action.type === 'call')).toBe(true);
  });
});

describe('what reaches the AI', () => {
  const you = (text: string, id = `you-${text}`) => ({ id, from: 'you' as const, text });
  const kapwa = (text: string, id = `kapwa-${text}`) => ({ id, from: 'kapwa' as const, text });
  const sent = (turns: { content: string }[]) => turns.map((turn) => turn.content);

  it('leaves out a crisis message and the reply to it', () => {
    const history = buildHistory(
      [you('hello'), kapwa('Hi'), you('I want to die'), kapwa('Please call')],
      'teach me box breathing',
    );
    expect(sent(history)).toEqual(['hello', 'Hi', 'teach me box breathing']);
  });

  it('leaves out a medical message and the reply to it', () => {
    const history = buildHistory([you('I have chest pains'), kapwa('Call 911')], 'focus');
    expect(sent(history)).toEqual(['focus']);
  });

  it('leaves out follow-ups that were answered as part of a crisis', () => {
    const history = buildHistory(
      [{ ...you('yes, tonight'), private: true }, { ...kapwa('Stay with someone'), private: true }],
      'focus',
    );
    expect(sent(history)).toEqual(['focus']);
  });
});

describe('after a crisis', () => {
  const at = 1_000_000;

  it('keeps answering with care for a while, then lets go', async () => {
    const { SAFETY_HOLD_MS, safetyHold } = await import('@/lib/kapwa');
    const chat = [{ safety: 'crisis' as const, at }];
    expect(safetyHold(chat, at + 1000)).toBe('crisis');
    expect(safetyHold(chat, at + SAFETY_HOLD_MS + 1)).toBeNull();
  });

  it('lets a crisis outweigh a later medical sign', async () => {
    const { safetyHold } = await import('@/lib/kapwa');
    const chat = [{ safety: 'crisis' as const, at }, { safety: 'medical-urgent' as const, at: at + 5 }];
    expect(safetyHold(chat, at + 10)).toBe('crisis');
  });

  it('follows up with numbers to call, never a session', async () => {
    const { heldReply } = await import('@/lib/kapwa');
    expect(heldReply('crisis').actions.every((action) => action.type === 'call')).toBe(true);
  });
});
