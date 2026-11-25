import { dataset, type Example, type Split } from '@/data/kapwa-dataset';
import { converse } from '@/lib/kapwa-dialogue';
import { practicesFor } from '@/lib/kapwa-dialogue';
import { readLength } from '@/lib/kapwa-knowledge';

/**
 * Measures Kapwa against its labelled dataset (data/kapwa-dataset), the way
 * the plan asks: intent accuracy on supported messages, honest handling of
 * unsupported ones, and safety on every critical case. Each message is sent
 * to `converse` on its own, as the first message of a chat.
 */

const SAFETY = new Set(['crisis', 'medical-urgent']);
/** An honest "I can't help with that", or asking what was meant, both count for out-of-scope messages. */
const UNKNOWN_OK = new Set(['fallback', 'clarify', 'not-weighing']);

export interface Result {
  example: Example;
  got: string;
  correct: boolean;
}

export interface SplitReport {
  split: Split;
  lang: 'en' | 'fil' | 'hi';
  /** Supported messages answered with a right intent. */
  intentAccuracy: number;
  intentTotal: number;
  /** Out-of-scope messages answered honestly. */
  unknownHandling: number;
  unknownTotal: number;
  /** Crisis and medical messages sent the safe way. */
  safety: number;
  safetyTotal: number;
  misses: Result[];
}

const expected = (example: Example) => (Array.isArray(example.intent) ? example.intent : [example.intent]);

export function judge(example: Example): Result {
  const got = converse(example.text).intentId;
  const want = expected(example);
  const correct = want.includes('fallback') ? UNKNOWN_OK.has(got) : want.includes(got);
  return { example, got, correct };
}

const share = (results: Result[]) => (results.length ? results.filter((result) => result.correct).length / results.length : 1);

/** One split in one language: English unless `lang` says otherwise. */
export function evaluate(split: Split, examples: Example[] = dataset, lang: 'en' | 'fil' | 'hi' = 'en'): SplitReport {
  const results = examples.filter((example) => example.split === split && (example.lang ?? 'en') === lang).map(judge);
  const kind = (result: Result) => {
    const want = expected(result.example);
    if (want.some((intent) => SAFETY.has(intent))) return 'safety';
    if (want.includes('fallback')) return 'unknown';
    return 'intent';
  };
  const of = (name: string) => results.filter((result) => kind(result) === name);
  return {
    split,
    lang,
    intentAccuracy: share(of('intent')),
    intentTotal: of('intent').length,
    unknownHandling: share(of('unknown')),
    unknownTotal: of('unknown').length,
    safety: share(of('safety')),
    safetyTotal: of('safety').length,
    misses: results.filter((result) => !result.correct),
  };
}

/** The plan's dataset schema, one row per example, derived from the engine so it can't drift. */
export interface DatasetRow {
  utterance: string;
  intent: string;
  also_accepted: string[];
  split: Split;
  entities: Record<string, string | number>;
  response_goal: string;
  next_question: string | null;
  exercise_id: string | null;
}

function responseGoal(intent: string): string {
  if (intent === 'crisis' || intent === 'medical-urgent') return 'safety_route_to_help';
  if (intent === 'fallback') return 'explain_scope_and_ask_to_rephrase';
  if (intent.startsWith('practice:')) return 'teach_practice_then_check_in';
  if (intent.startsWith('practices:')) return 'offer_practice_choices';
  if (intent === 'meditation-length') return 'offer_sessions_by_length';
  if (['greeting', 'thanks', 'goodbye', 'about', 'help'].includes(intent)) return 'conversation';
  if (practicesFor(intent).length) return 'validate_then_offer_practice';
  return 'validate_then_offer_content';
}

export function datasetRows(examples: Example[] = dataset): DatasetRow[] {
  return examples.map((example) => {
    const [intent, ...also] = expected(example);
    const turn = converse(example.text);
    const length = readLength(example.text);
    const entities: Record<string, string | number> = {};
    if (length.minutes) entities.minutes = length.minutes;
    if (length.feel) entities.length = length.feel;
    if (/\b(night|tonight|bed|bedtime|sleep)\b/i.test(example.text)) entities.time = 'night';
    else if (/\bmorning\b/i.test(example.text)) entities.time = 'morning';
    const practice = intent.startsWith('practice:') ? intent.slice('practice:'.length) : practicesFor(intent)[0]?.id;
    return {
      utterance: example.text,
      intent,
      also_accepted: also,
      split: example.split,
      entities,
      response_goal: responseGoal(intent),
      next_question: turn.followUp ?? null,
      exercise_id: practice ?? null,
    };
  });
}
