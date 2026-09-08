import { notFound } from 'next/navigation';

import { PlayerView } from '@/components/player/player-view';
import { getMeditation, meditations } from '@/data/meditations';

export function generateStaticParams() {
  return meditations.map((meditation) => ({ id: meditation.id }));
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meditation = getMeditation(id);

  if (!meditation) {
    notFound();
  }

  return <PlayerView meditation={meditation} />;
}
