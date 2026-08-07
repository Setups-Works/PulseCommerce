"use client";

import * as React from "react";
import Image from "next/image";
import { Alert, Button, Card, Chip, Input, Label, Spinner, TextField } from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faFileLines, faTrash, faUpload, faVideo } from "@fortawesome/free-solid-svg-icons";
import { deleteMedia, updateMediaAlt, uploadMedia } from "@/services/media-service";
import { mediaPublicUrl } from "@/lib/supabase/env";
import type { Tables } from "@/types/database";

/**
 * The media library.
 *
 * Uploads go through a server action with a FormData payload rather than a
 * direct browser-to-storage call. That costs one hop and buys the checks that
 * matter: the caller's capability, the size ceiling and the MIME allow-list
 * are all enforced somewhere the browser cannot skip. Storage policies would
 * catch an unauthorised upload too, but not an oversized or wrong-typed one
 * with a plausible content type.
 *
 * Images preview through next/image, which is why the Supabase storage host is
 * in `remotePatterns` — scoped to this project's public object path, so
 * another project on the same domain cannot be proxied through the optimizer.
 */

type Media = Tables<"media">;

export function MediaLibrary({ items, canWrite }: { items: Media[]; canWrite: boolean }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    startTransition(async () => {
      // Sequential rather than parallel: a dozen 50 MB videos at once is a
      // dozen concurrent uploads competing for the same connection, and the
      // first failure in a Promise.all would leave the rest in limbo.
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.set("file", file);
        const result = await uploadMedia(body);
        if (!result.ok) {
          setError(`${file.name}: ${result.error}`);
          break;
        }
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert status="danger">
          <Alert.Description className="text-sm">{error}</Alert.Description>
        </Alert>
      ) : null}

      {canWrite ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Upload</h3>
              <p className="mt-0.5 text-xs text-muted">
                PNG, JPEG, WebP, AVIF, SVG, GIF, MP4, WebM or PDF. Up to 50 MB each.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              isDisabled={pending}
              onPress={() => inputRef.current?.click()}
            >
              {pending ? <Spinner size="sm" /> : <FontAwesomeIcon icon={faUpload} className="w-3" />}
              Choose files
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml,image/gif,video/mp4,video/webm,application/pdf"
            onChange={(e) => onFiles(e.target.files)}
          />
        </Card>
      ) : null}

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">Nothing uploaded yet.</p>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} canWrite={canWrite} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MediaCard({ item, canWrite }: { item: Media; canWrite: boolean }) {
  const [pending, startTransition] = React.useTransition();
  const [alt, setAlt] = React.useState(item.alt_text ?? "");
  const [copied, setCopied] = React.useState(false);
  const url = mediaPublicUrl(item.path);

  const dirty = alt !== (item.alt_text ?? "");

  return (
    <li>
      <Card className="overflow-hidden p-0">
        <div className="flex aspect-video items-center justify-center bg-surface-secondary">
          {item.kind === "image" ? (
            <Image
              src={url}
              alt={item.alt_text ?? ""}
              width={item.width ?? 400}
              height={item.height ?? 225}
              className="size-full object-contain"
              // The library is behind auth and never indexed; optimising every
              // thumbnail would bill for transformations nobody sees twice.
              unoptimized
            />
          ) : (
            <FontAwesomeIcon
              icon={item.kind === "video" ? faVideo : faFileLines}
              className="w-8 text-muted"
            />
          )}
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.filename}</p>
            <Chip size="sm">{formatBytes(item.size_bytes)}</Chip>
          </div>

          <TextField value={alt} onChange={setAlt} isDisabled={!canWrite}>
            <Label>Alt text</Label>
            <Input placeholder="Describe the image, or leave empty if decorative" />
          </TextField>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onPress={() => {
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              <FontAwesomeIcon icon={faCopy} className="w-3" />
              {copied ? "Copied" : "Copy URL"}
            </Button>

            {canWrite ? (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  isDisabled={pending || !dirty}
                  onPress={() => startTransition(() => void updateMediaAlt(item.id, alt))}
                >
                  {dirty ? "Save alt" : "Saved"}
                </Button>
                <Button
                  size="sm"
                  variant="danger-soft"
                  isDisabled={pending}
                  onPress={() => startTransition(() => void deleteMedia(item.id))}
                >
                  <FontAwesomeIcon icon={faTrash} className="w-3" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </Card>
    </li>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
