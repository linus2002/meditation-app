import { notFound } from 'next/navigation';

import { ProgramPageScreen } from '@/components/live/live-screens';
import { getProgram, programs } from '@/data/programs';

export function generateStaticParams() {
  return programs.map((program) => ({ id: program.id }));
}

/** The programme is looked up in the browser, so edits made in Sanity show without a rebuild. */
export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getProgram(id)) notFound();
  return <ProgramPageScreen id={id} />;
}
