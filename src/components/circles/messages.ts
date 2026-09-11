import type { CirclesErrorCode } from '@/lib/circles/api';

/** What each refusal means, in words a reader can act on. */
export function circlesErrorMessage(code: CirclesErrorCode | 'missing' | null): string {
  switch (code) {
    case 'circle_full':
      return 'This circle has just filled up. Choose another one.';
    case 'too_many_circles':
      return 'You can be in two circles at a time. Leave one to join another.';
    case 'already_member':
      return 'You are already in this circle.';
    case 'circle_not_open':
      return 'This circle is no longer taking new members.';
    case 'not_a_member':
      return 'Only members can see inside this circle.';
    case 'offline':
      return 'No connection right now. Your circle will catch up when you are back online.';
    case 'unavailable':
      return 'Circles is not available in this build of Serenity.';
    case 'missing':
      return 'This circle no longer exists.';
    case 'invalid':
      return 'That did not quite fit. Keep it to one short line, with no links.';
    default:
      return 'Something went wrong. Try again in a moment.';
  }
}
