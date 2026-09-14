import { notFound } from 'next/navigation';

import { YogaPlayer } from '@/components/yoga/yoga-player';
import { getYogaSession, yogaSessions } from '@/data/yoga';

/*
 * Full screen, outside the (app) group, like the meditation player. Every
 * session is prerendered, so each works in the static mobile build and offline.
 */
export function generateStaticParams() {
  return yogaSessions.map((session) => ({ id: session.id }));
}

export default async function YogaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getYogaSession(id);

  if (!session) {
    notFound();
  }

  return <YogaPlayer session={session} />;
}
