"use client";

import * as React from "react";
import {
  Alert,
  Button,
  Card,
  Chip,
  Description,
  Input,
  Label,
  Spinner,
  Switch,
  TextField,
} from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowUp,
  faFloppyDisk,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import {
  createContentRow,
  deleteContentRow,
  moveContentRow,
  setContentStatus,
  updateContentRow,
} from "@/services/content-admin-service";
import type { Tables } from "@/types/database";

/**
 * The FAQ editor.
 *
 * This is the reference implementation for every content section — the other
 * editors differ only in which fields they render. Worth reading once before
 * writing the next one.
 *
 * Three decisions that are not obvious:
 *
 *   * Rows are edited in place rather than in a modal. An FAQ answer is a
 *     paragraph, and a list of eight of them is something an editor scans and
 *     tweaks; a dialog per row turns eight small edits into eight open-edit-
 *     save-close cycles.
 *
 *   * Each row tracks its own pending and error state, not one flag for the
 *     whole page. Saving row three should not grey out row five, and a failure
 *     on one row should say so next to that row rather than at the top.
 *
 *   * `useTransition` around the server actions, so the list stays interactive
 *     while a save is in flight and React can show the pending state without a
 *     manual `saving` boolean per action.
 *
 * The actions themselves check the caller's capability and write to the audit
 * log — see services/content-admin-service.ts. Nothing here is trusted.
 */

type Faq = Tables<"faqs">;

export function FaqEditor({ rows, canWrite }: { rows: Faq[]; canWrite: boolean }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "That did not save.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {!canWrite ? (
        <Alert status="default">
          <Alert.Description className="text-sm">
            You have read-only access. Ask an editor or an admin to make changes.
          </Alert.Description>
        </Alert>
      ) : null}

      {error ? (
        <Alert status="danger">
          <Alert.Description className="text-sm">{error}</Alert.Description>
        </Alert>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {rows.length} question{rows.length === 1 ? "" : "s"} ·{" "}
          {rows.filter((r) => r.status === "published").length} published
        </p>
        <Button
          variant="primary"
          size="sm"
          isDisabled={!canWrite || pending}
          onPress={() =>
            run(() =>
              createContentRow("faqs", {
                question: "New question",
                answer: "",
                status: "draft",
                show_on_landing: true,
                // Appended rather than inserted, so adding one does not
                // renumber the list an editor has already ordered.
                position: rows.length,
              }),
            )
          }
        >
          <FontAwesomeIcon icon={faPlus} className="w-3" />
          Add question
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">
            No questions yet. The public pages are falling back to the list compiled into the build.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <FaqRow
              key={row.id}
              row={row}
              canWrite={canWrite}
              pending={pending}
              isFirst={index === 0}
              isLast={index === rows.length - 1}
              run={run}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FaqRow({
  row,
  canWrite,
  pending,
  isFirst,
  isLast,
  run,
}: {
  row: Faq;
  canWrite: boolean;
  pending: boolean;
  isFirst: boolean;
  isLast: boolean;
  run: (action: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [question, setQuestion] = React.useState(row.question);
  const [answer, setAnswer] = React.useState(row.answer);
  const [onLanding, setOnLanding] = React.useState(row.show_on_landing);

  /*
   * `dirty` compares against the row as last rendered from the server, so it
   * clears itself when a save round-trips and the page revalidates — no manual
   * "just saved" flag to reset, and no stale Save button left enabled.
   */
  const dirty =
    question !== row.question || answer !== row.answer || onLanding !== row.show_on_landing;

  const published = row.status === "published";

  return (
    <li>
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <TextField value={question} onChange={setQuestion} isDisabled={!canWrite}>
              <Label>Question</Label>
              <Input />
            </TextField>
            <TextField value={answer} onChange={setAnswer} isDisabled={!canWrite}>
              <Label>Answer</Label>
              <Input />
              <Description>Shown verbatim on the page and in the FAQ structured data.</Description>
            </TextField>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <Chip size="sm" color={published ? "success" : "default"}>
              {published ? "Published" : row.status}
            </Chip>

            <div className="flex gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="Move up"
                isDisabled={!canWrite || pending || isFirst}
                onPress={() => run(() => moveContentRow("faqs", row.id, "up"))}
              >
                <FontAwesomeIcon icon={faArrowUp} className="w-3" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="Move down"
                isDisabled={!canWrite || pending || isLast}
                onPress={() => run(() => moveContentRow("faqs", row.id, "down"))}
              >
                <FontAwesomeIcon icon={faArrowDown} className="w-3" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="danger-soft"
                aria-label="Delete question"
                isDisabled={!canWrite || pending}
                onPress={() => run(() => deleteContentRow("faqs", row.id))}
              >
                <FontAwesomeIcon icon={faTrash} className="w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-4">
            <Switch
              isSelected={onLanding}
              isDisabled={!canWrite}
              onChange={setOnLanding}
              className="text-sm"
            >
              Show on the landing page
            </Switch>

            <Switch
              isSelected={published}
              isDisabled={!canWrite || pending}
              onChange={(next) =>
                run(() => setContentStatus("faqs", row.id, next ? "published" : "draft"))
              }
              className="text-sm"
            >
              Published
            </Switch>
          </div>

          <Button
            size="sm"
            variant="primary"
            isDisabled={!canWrite || pending || !dirty}
            onPress={() =>
              run(() =>
                updateContentRow("faqs", row.id, {
                  question,
                  answer,
                  show_on_landing: onLanding,
                }),
              )
            }
          >
            {pending ? <Spinner size="sm" /> : <FontAwesomeIcon icon={faFloppyDisk} className="w-3" />}
            {dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </Card>
    </li>
  );
}
