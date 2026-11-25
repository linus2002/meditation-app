'use client';

/* eslint-disable @next/next/no-img-element -- pictures come from the person's phone or Sanity's CDN at their own sizes. */

import * as React from 'react';
import { ImagePlus, Loader2, RotateCw, X } from 'lucide-react';

import { MAX_PICTURES, supportErrorText, uploadSupportPicture, type SupportImage } from '@/lib/support';
import { preparePicture, thumbnailUrl } from '@/lib/support-picture';
import { cn } from '@/lib/utils';

export interface PickedPicture {
  key: string;
  preview: string;
  width: number;
  height: number;
  /** Set once the server has it. */
  id?: string;
  status: 'preparing' | 'uploading' | 'ready' | 'failed';
  error?: string;
  /** Kept so a failed upload can be tried again without picking it again. */
  file: File;
}

/**
 * The pictures chosen for the message being written. Each is shrunk and sent
 * as soon as it is picked, so pressing Send only has the words left to send.
 */
export function usePictures() {
  const [pictures, setPictures] = React.useState<PickedPicture[]>([]);
  const counter = React.useRef(0);
  // Whether the screen is still there to show the result of an upload. Set on
  // every mount, since React may mount, unmount and mount again.
  const live = React.useRef(true);
  React.useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const update = (key: string, change: Partial<PickedPicture>) => {
    if (live.current) setPictures((current) => current.map((item) => (item.key === key ? { ...item, ...change } : item)));
  };

  const send = async (key: string, file: File) => {
    update(key, { status: 'preparing', error: undefined });
    try {
      const prepared = await preparePicture(file);
      update(key, { status: 'uploading', preview: prepared.preview, width: prepared.width, height: prepared.height });
      const { image } = await uploadSupportPicture(prepared.data);
      update(key, { status: 'ready', id: image.id });
    } catch (error) {
      update(key, { status: 'failed', error: supportErrorText(error) });
    }
  };

  const add = (files: FileList | File[]) => {
    const room = MAX_PICTURES - pictures.length;
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    const added = chosen.map((file) => ({
      key: `picture-${++counter.current}`,
      preview: '',
      width: 0,
      height: 0,
      status: 'preparing' as const,
      file,
    }));
    setPictures((current) => [...current, ...added]);
    for (const item of added) void send(item.key, item.file);
    return Array.from(files).length - chosen.length;
  };

  const remove = (key: string) => setPictures((current) => current.filter((item) => item.key !== key));
  const retry = (key: string) => {
    const item = pictures.find((entry) => entry.key === key);
    if (item) void send(key, item.file);
  };
  const clear = () => setPictures([]);
  /** Puts back pictures from a message that failed to send. */
  const restore = (items: PickedPicture[]) => setPictures(items.slice(0, MAX_PICTURES));

  const ready = pictures.filter((item) => item.status === 'ready');
  return {
    pictures,
    add,
    remove,
    retry,
    clear,
    restore,
    /** Ids of the pictures ready to go with the message. */
    ids: ready.map((item) => item.id as string).slice(0, MAX_PICTURES),
    /** What the message shows while sending, before the server answers. */
    shown: ready.map((item): SupportImage => ({ url: item.preview, width: item.width, height: item.height })),
    busy: pictures.some((item) => item.status === 'preparing' || item.status === 'uploading'),
    full: pictures.length >= MAX_PICTURES,
  };
}

/** The button that opens the phone's photo picker (or its camera, where offered). */
export function AddPictureButton({
  onPick,
  disabled,
  className,
  label = 'Add a picture',
  showLabel = false,
}: {
  onPick: (files: FileList) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  showLabel?: boolean;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files?.length) onPick(event.target.files);
          // Cleared, so choosing the same picture again still counts as a choice.
          event.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={disabled}
        aria-label={showLabel ? undefined : label}
        className={cn(
          'flex shrink-0 items-center justify-center gap-2 text-ink-muted transition-colors hover:text-ink disabled:opacity-40',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
          className,
        )}
      >
        <ImagePlus className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
        {showLabel ? <span>{label}</span> : null}
      </button>
    </>
  );
}

/** The chosen pictures as small tiles, each with its state and a way to take it out. */
export function PictureTray({
  pictures,
  onRemove,
  onRetry,
  className,
}: {
  pictures: PickedPicture[];
  onRemove: (key: string) => void;
  onRetry: (key: string) => void;
  className?: string;
}) {
  if (pictures.length === 0) return null;
  const failed = pictures.find((item) => item.status === 'failed');
  return (
    <div className={className}>
      <ul className="flex flex-wrap gap-2" aria-label="Pictures to send">
        {pictures.map((item, index) => (
          <li key={item.key} className="relative h-[72px] w-[72px] overflow-hidden rounded-xl bg-overlay/[0.06]">
            {item.preview ? (
              <img src={item.preview} alt={`Picture ${index + 1}`} className="h-full w-full object-cover" />
            ) : null}
            {item.status === 'preparing' || item.status === 'uploading' ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/35" role="status">
                <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden="true" />
                <span className="sr-only">Sending picture {index + 1}</span>
              </span>
            ) : null}
            {item.status === 'failed' ? (
              <button
                type="button"
                onClick={() => onRetry(item.key)}
                aria-label={`Picture ${index + 1} didn’t send. Try again`}
                className="absolute inset-0 flex items-center justify-center bg-black/55 text-white"
              >
                <RotateCw className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onRemove(item.key)}
              aria-label={`Remove picture ${index + 1}`}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {failed?.error ? <p className="mt-1.5 text-label leading-snug text-[#F28B82]">{failed.error}</p> : null}
    </div>
  );
}

/** Pictures in a sent message; tapping one shows it full size over the screen. */
export function MessagePictures({ images, mine }: { images: SupportImage[]; mine: boolean }) {
  const [open, setOpen] = React.useState<SupportImage | null>(null);
  const dialog = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [open]);

  if (images.length === 0) return null;
  return (
    <>
      <div className={cn('mt-2 grid gap-1.5', images.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
        {images.map((image, index) => (
          <button
            key={image.url}
            type="button"
            onClick={() => setOpen(image)}
            aria-label={`Open picture ${index + 1}`}
            className={cn(
              'overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2',
              mine ? 'bg-white/15 focus-visible:ring-white' : 'bg-overlay/[0.06] focus-visible:ring-focus/70',
            )}
          >
            <img
              src={thumbnailUrl(image.url)}
              alt=""
              loading="lazy"
              width={image.width || undefined}
              height={image.height || undefined}
              className="block max-h-[260px] w-full object-cover"
            />
          </button>
        ))}
      </div>

      <dialog
        ref={dialog}
        aria-label="Picture"
        onClose={() => setOpen(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/85"
      >
        {open ? (
          <div className="relative">
            <img
              src={thumbnailUrl(open.url, 1600)}
              alt="The picture, full size"
              className="block max-h-[86vh] max-w-[94vw] rounded-xl object-contain"
            />
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close picture"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
