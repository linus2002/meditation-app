import * as React from 'react';
import { Card, Flex, Spinner, Text } from '@sanity/ui';
import { set, unset, useClient, type ObjectInputProps } from 'sanity';

interface RecordingValue {
  audio?: { asset?: { _ref?: string } };
  duration?: number;
  hash?: string;
}

/**
 * A session's recording, uploadable straight in the Studio.
 *
 * The app runs a session for exactly as long as its recording, so the length
 * has to be right. Rather than have an editor type it, this measures the file
 * the moment it is uploaded or replaced (the same way a phone will play it)
 * and writes the length in. Removing the audio clears the length too.
 */
export function RecordingInput(props: ObjectInputProps) {
  const { onChange, renderDefault } = props;
  const value = props.value as RecordingValue | undefined;
  const ref = value?.audio?.asset?._ref;
  const client = useClient({ apiVersion: '2024-01-01' });
  const [state, setState] = React.useState<'idle' | 'measuring' | 'error'>('idle');

  React.useEffect(() => {
    if (!ref) {
      if (value?.duration !== undefined) onChange([unset(['duration']), unset(['hash'])]);
      return;
    }
    let live = true;
    setState('measuring');
    client
      .fetch<string | null>(`*[_id == $ref][0].url`, { ref })
      .then(
        (url) =>
          new Promise<number>((resolve, reject) => {
            if (!url) return reject(new Error('no url'));
            const audio = new Audio();
            audio.preload = 'metadata';
            audio.onloadedmetadata = () => resolve(audio.duration);
            audio.onerror = () => reject(new Error('unreadable'));
            audio.src = url;
          }),
      )
      .then((seconds) => {
        if (!live) return;
        if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('no length');
        const rounded = Math.round(seconds * 1000) / 1000;
        if (value?.duration === undefined || Math.abs(value.duration - rounded) > 0.5) {
          // A file changed by hand no longer matches the one the upload script recorded.
          onChange([set(rounded, ['duration']), unset(['hash'])]);
        }
        setState('idle');
      })
      .catch(() => live && setState('error'));
    return () => {
      live = false;
    };
    // Only a different file needs measuring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  return (
    <>
      {renderDefault(props)}
      {state === 'measuring' ? (
        <Card padding={3} radius={2} tone="primary" marginTop={2}>
          <Flex align="center" gap={2}>
            <Spinner muted />
            <Text size={1}>Measuring the recording’s length…</Text>
          </Flex>
        </Card>
      ) : state === 'error' ? (
        <Card padding={3} radius={2} tone="critical" marginTop={2}>
          <Text size={1}>Could not read this file’s length. Check it is an MP3 or M4A that plays.</Text>
        </Card>
      ) : null}
    </>
  );
}
