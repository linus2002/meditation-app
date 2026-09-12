/**
 * The cancer support track's switch.
 *
 * Off unless `NEXT_PUBLIC_SUPPORT_TRACK=1` is set at build time. It stays off
 * for real users until a qualified clinician has reviewed the moment list, the
 * session wording and every line of in-app copy — see the README. Your team
 * turns it on in `.env.local` to build and test.
 */
export const supportTrackEnabled = process.env.NEXT_PUBLIC_SUPPORT_TRACK === '1';
