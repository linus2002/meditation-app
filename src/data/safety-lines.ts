/**
 * Phone numbers the app offers when someone may need real help now.
 *
 * Kept in one place so they can be checked and changed per region before a
 * release. These are the Philippines' national lines, checked 17 October 2026
 * against the NCMH listing on findahelpline.com and DOH reporting. Re-verify
 * them before each release; a wrong number here is worse than none.
 */

export interface SafetyLine {
  /** What the reader sees on the button, e.g. "NCMH Crisis Hotline". */
  label: string;
  /** Shown as written, so it can be read and dialled by hand. */
  display: string;
  /** Digits for the `tel:` link. */
  dial: string;
}

/** Police, fire and ambulance. */
export const emergencyLine: SafetyLine = {
  label: 'Emergency',
  display: '911',
  dial: '911',
};

/** National Center for Mental Health crisis line, free and open 24/7. */
export const crisisLines: SafetyLine[] = [
  { label: 'NCMH Crisis Hotline', display: '0917 899 8727', dial: '09178998727' },
  { label: 'NCMH Crisis Hotline (Smart)', display: '0919 057 1553', dial: '09190571553' },
  { label: 'NCMH Crisis Hotline (landline)', display: '1553', dial: '1553' },
];
