import { notFound } from 'next/navigation';

import { YogaScreen } from '@/components/live/live-screens';
import { getYogaSession, yogaSessions } from '@/data/yoga';

/*
 * Full screen, outside the (app) group, like the meditation player. Every
 * session is prerendered, so each works in the static mobile build and offline.
 * The session itself is looked up in the browser, so edits made in Sanity show
 * without a rebuild.
 */
export function generateStaticParams() {
  return yogaSessions.map((session) => ({ id: session.id }));
}

export default async function YogaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getYogaSession(id)) notFound();
  return <YogaScreen id={id} />;
}
