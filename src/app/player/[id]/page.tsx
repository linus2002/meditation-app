import { notFound } from 'next/navigation';

import { PlayerScreen } from '@/components/live/live-screens';
import { allSessions, getMeditation } from '@/data/meditations';

export function generateStaticParams() {
  return allSessions.map((meditation) => ({ id: meditation.id }));
}

/** The session is looked up in the browser, so edits made in Sanity show without a rebuild. */
export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getMeditation(id)) notFound();
  return <PlayerScreen id={id} />;
}
