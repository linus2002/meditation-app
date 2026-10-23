'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Sparkles, X } from 'lucide-react';

import { GradientButton } from '@/components/shared/gradient-button';
import { categories } from '@/data/categories';
import { useBack } from '@/hooks/use-back';
import { picksFor } from '@/hooks/use-assessment-picks';
import {
  ASSESSMENT_QUESTIONS,
  buildProfile,
  topTopics,
  type AssessmentAnswers,
} from '@/lib/assessment';
import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';

const TOTAL = ASSESSMENT_QUESTIONS.length;

/**
 * The assessment, one question per screen: a progress bar, the question, and
 * its options as outlined cards with a check on the right, then Back and
 * Continue along the foot. Finishing saves the answers — which takes the
 * invitation off the home screen and moves the suggestions to the front of the
 * library's own lists — and shows the plan they produced.
 *
 * A pushed screen like Daily Activities, so it carries no bottom navigation.
 */
export default function AssessmentPage() {
  const router = useRouter();
  const goBack = useBack();
  const { completeAssessment } = useApp();

  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<AssessmentAnswers>({});
  const [done, setDone] = React.useState(false);
  const scrollTop = React.useRef<HTMLDivElement>(null);

  const question = ASSESSMENT_QUESTIONS[step];
  const picked = answers[question.id] ?? [];
  const isLast = step === TOTAL - 1;

  // Each question starts at the top, wherever the last one was scrolled to.
  React.useEffect(() => {
    scrollTop.current?.scrollIntoView({ block: 'start' });
  }, [step, done]);

  const toggle = (optionId: string) => {
    setAnswers((current) => {
      const previous = current[question.id] ?? [];
      const next = question.multiple
        ? previous.includes(optionId)
          ? previous.filter((id) => id !== optionId)
          : [...previous, optionId]
        : [optionId];
      return { ...current, [question.id]: next };
    });
  };

  const onContinue = () => {
    if (picked.length === 0) return;
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    completeAssessment(answers);
    setDone(true);
  };

  const onBack = () => (step === 0 ? goBack() : setStep(step - 1));

  if (done) return <AssessmentResult answers={answers} onFinish={() => router.replace('/home')} />;

  return (
    <div className="relative flex min-h-full flex-col">
      <div ref={scrollTop} />

      <header className="px-4 pt-[calc(var(--header-gap)-1px)]">
        <div className="grid grid-cols-[36px_1fr_36px] items-center gap-2">
          <span />
          <p className="text-center text-caption font-medium text-ink-muted">
            Question {step + 1} of {TOTAL}
          </p>
          <Link
            href="/home"
            aria-label="Close assessment"
            className="tap-target flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </Link>
        </div>

        <div
          role="progressbar"
          aria-label="Assessment progress"
          aria-valuemin={0}
          aria-valuemax={TOTAL}
          aria-valuenow={step + 1}
          className="mx-1 mt-3 h-1.5 overflow-hidden rounded-full bg-overlay/10"
        >
          <div
            className="h-full rounded-full bg-action-pill transition-[width] duration-300 ease-out"
            style={{ width: `${((step + 1) / TOTAL) * 100}%` }}
          />
        </div>
      </header>

      <main key={question.id} className="flex-1 px-5 pb-6 pt-7 animate-in fade-in slide-in-from-right-4 duration-300">
        <h1 id="question-title" className="text-[1.5rem] font-semibold leading-[1.2] tracking-[-0.01em] text-ink">
          {question.title}
        </h1>
        <p className="mt-2 text-body-sm leading-[1.45] text-ink-muted">{question.description}</p>

        <div
          role={question.multiple ? 'group' : 'radiogroup'}
          aria-labelledby="question-title"
          className="mt-6 space-y-3"
        >
          {question.options.map((option) => {
            const selected = picked.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                role={question.multiple ? 'checkbox' : 'radio'}
                aria-checked={selected}
                onClick={() => toggle(option.id)}
                className={cn(
                  'flex w-full items-center gap-3.5 rounded-[18px] border px-4 py-3.5 text-left transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                  selected
                    ? 'border-aurora-blue bg-aurora-blue/10'
                    : 'border-overlay/15 bg-surface hover:border-overlay/30',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-semibold leading-snug text-ink">
                    {option.label}
                  </span>
                  {option.description ? (
                    <span className="mt-0.5 block text-caption leading-snug text-ink-muted">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center border-[1.5px] transition-colors',
                    question.multiple ? 'rounded-[7px]' : 'rounded-full',
                    selected ? 'border-aurora-blue bg-aurora-blue text-white' : 'border-overlay/30',
                  )}
                >
                  {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="sticky bottom-0 grid grid-cols-2 gap-3 bg-canvas/90 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 items-center justify-center rounded-full border border-overlay/20 text-[0.9375rem] font-medium text-ink transition-colors hover:bg-overlay/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          Back
        </button>
        <GradientButton onClick={onContinue} disabled={picked.length === 0} className="h-12">
          {isLast ? 'See my plan' : 'Continue'}
        </GradientButton>
      </footer>
    </div>
  );
}

/** The plan the answers produced: the reader's focus areas, then the suggestions. */
function AssessmentResult({
  answers,
  onFinish,
}: {
  answers: AssessmentAnswers;
  onFinish: () => void;
}) {
  const picks = React.useMemo(() => picksFor(answers), [answers]);
  const focus = topTopics(buildProfile(answers)).map(
    (slug) => categories.find((category) => category.slug === slug)?.name ?? slug,
  );

  return (
    <div className="relative flex min-h-full flex-col">
      <main className="flex-1 px-5 pb-6 pt-[calc(var(--header-gap)+12px)] animate-in fade-in duration-500">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-action-pill text-white shadow-pill">
          <Sparkles aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <h1 className="mt-5 text-[1.5rem] font-semibold leading-[1.2] tracking-[-0.01em] text-ink">
          Your plan is ready
        </h1>
        <p className="mt-2 text-body-sm leading-[1.45] text-ink-muted">
          We’ve picked these for you from your answers. They’ll come first in Meditations, Programs, Stories and Yoga.
        </p>

        {focus.length > 0 ? (
          <div className="mt-5">
            <p className="text-caption font-medium text-ink-faint">Your focus</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {focus.map((name) => (
                <li
                  key={name}
                  className="rounded-full border border-aurora-blue/50 bg-aurora-blue/10 px-3 py-1.5 text-caption font-medium text-ink"
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ul className="mt-6 space-y-2.5">
          {picks.slice(0, 8).map((pick) => (
            <li key={pick.key}>
              <Link
                href={pick.href}
                className="flex items-center gap-3.5 rounded-tile bg-surface p-3 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                  <Image src={pick.image} alt="" fill sizes="56px" placeholder="blur" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-label font-semibold uppercase tracking-[0.06em] text-aurora-blue">
                    {pick.kind}
                  </span>
                  <span className="mt-0.5 block truncate text-body-sm font-semibold leading-tight text-ink">
                    {pick.title}
                  </span>
                  <span className="mt-1 block text-label leading-none text-ink-faint">{pick.meta}</span>
                </span>
                <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={1.8} />
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <footer className="sticky bottom-0 bg-canvas/90 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <GradientButton onClick={onFinish} className="h-12 w-full">
          Go to home
        </GradientButton>
      </footer>
    </div>
  );
}
