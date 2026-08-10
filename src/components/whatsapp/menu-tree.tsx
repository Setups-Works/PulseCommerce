"use client";

import { ChevronRight, CornerDownRight, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MENU_DEPTH, type MenuOption, type MenuPath } from "@/lib/whatsapp/menu";

/**
 * The menu tree, editable by dragging.
 *
 * Drag-and-drop is done with the browser's own HTML5 events rather than a
 * library. The tree is small, the interactions are few, and the alternative was
 * a dependency larger than this whole feature.
 *
 * Because native drag-and-drop gives no keyboard path, every move is also
 * available as a button — up, down, indent, outdent. That is not a nicety: a
 * drag-only editor cannot be operated without a mouse.
 */

interface Props {
  options: MenuOption[];
  onChange: (next: MenuOption[]) => void;
  /** Where a dragged node should land. Parent path plus index within it. */
  onMove: (from: MenuPath, toParent: MenuPath, toIndex: number) => void;
  disabled?: boolean;
}

/** The node being dragged, shared by every row so they agree on the target. */
type Dragging = { path: MenuPath } | null;

export function MenuTree({ options, onChange, onMove, disabled }: Props) {
  const [dragging, setDragging] = useState<Dragging>(null);
  const [over, setOver] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Level
        options={options}
        parent={[]}
        depth={0}
        dragging={dragging}
        setDragging={setDragging}
        over={over}
        setOver={setOver}
        onChange={onChange}
        onMove={onMove}
        disabled={disabled}
        root={options}
      />

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        disabled={disabled || options.length >= 20}
        onClick={() => onChange([...options, { key: String(options.length + 1), text: "" }])}
      >
        <Plus className="size-4" />
        Add an option
      </Button>
    </div>
  );
}

interface LevelProps extends Props {
  parent: MenuPath;
  depth: number;
  dragging: Dragging;
  setDragging: (d: Dragging) => void;
  over: string | null;
  setOver: (k: string | null) => void;
  root: MenuOption[];
}

function Level(props: LevelProps) {
  const { options, parent, depth, dragging, setDragging, over, setOver, onMove, disabled } = props;

  const dropKey = (index: number) => `${parent.join(".")}:${index}`;

  const gap = (index: number) => (
    <div
      key={`gap-${dropKey(index)}`}
      onDragOver={(e) => {
        if (!dragging) return;
        e.preventDefault();
        setOver(dropKey(index));
      }}
      onDragLeave={() => setOver(over === dropKey(index) ? null : over)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragging) onMove(dragging.path, parent, index);
        setDragging(null);
        setOver(null);
      }}
      className={
        over === dropKey(index)
          ? "h-6 rounded border-2 border-dashed border-primary bg-primary/10"
          : dragging
            ? "h-2 rounded border border-dashed border-muted-foreground/30"
            : "h-0"
      }
      aria-hidden
    />
  );

  return (
    <div className={depth > 0 ? "ml-5 border-l pl-3" : ""}>
      {gap(0)}
      {options.map((node, index) => {
        const path = [...parent, index];
        return (
          <div key={path.join(".")}>
            <Row {...props} node={node} path={path} index={index} />
            {gap(index + 1)}
          </div>
        );
      })}
      {options.length === 0 && depth > 0 ? (
        <p className="py-1 text-[11px] text-muted-foreground">
          Empty submenu — choosing this ends the conversation.
        </p>
      ) : null}
      {disabled ? null : null}
    </div>
  );
}

function Row(props: LevelProps & { node: MenuOption; path: MenuPath; index: number }) {
  const {
    node, path, index, options, parent, depth, dragging, setDragging, onChange, onMove, disabled,
    root,
  } = props;

  const children = node.options ?? [];
  const canIndent = index > 0 && depth + 1 < MAX_MENU_DEPTH;
  const canOutdent = depth > 0;

  const replace = (change: (n: MenuOption) => MenuOption) =>
    onChange(applyAt(root, path, change));

  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = "move";
        setDragging({ path });
      }}
      onDragEnd={() => setDragging(null)}
      className={`rounded-md border bg-card p-2 ${
        dragging && dragging.path.join(".") === path.join(".") ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical
          className={`mt-1.5 size-4 shrink-0 text-muted-foreground ${
            disabled ? "" : "cursor-grab active:cursor-grabbing"
          }`}
          aria-hidden
        />

        <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-semibold tabular-nums">
          {node.key}
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <Textarea
            rows={2}
            value={node.text}
            disabled={disabled}
            placeholder={
              children.length
                ? "Prompt for this submenu — list what the numbers below mean"
                : "The reply this option sends"
            }
            onChange={(e) => replace((n) => ({ ...n, text: e.target.value }))}
          />

          <div className="flex flex-wrap items-center gap-1">
            <IconButton label="Move up" disabled={disabled || index === 0}
              onClick={() => onMove(path, parent, index - 1)}>↑</IconButton>
            <IconButton label="Move down" disabled={disabled || index === options.length - 1}
              onClick={() => onMove(path, parent, index + 2)}>↓</IconButton>
            <IconButton
              label="Make a submenu of the option above"
              disabled={disabled || !canIndent}
              onClick={() => {
                const above = [...parent, index - 1];
                onMove(path, above, (nodeChildren(root, above)?.length ?? 0));
              }}
            >
              <ChevronRight className="size-3.5" />
            </IconButton>
            <IconButton
              label="Move out one level"
              disabled={disabled || !canOutdent}
              onClick={() => onMove(path, parent.slice(0, -1), parent[parent.length - 1] + 1)}
            >
              <CornerDownRight className="size-3.5 rotate-180" />
            </IconButton>

            <Button
              type="button" size="sm" variant="ghost"
              className="h-6 gap-1 px-2 text-[11px]"
              disabled={disabled || depth + 1 >= MAX_MENU_DEPTH || children.length >= 20}
              onClick={() =>
                replace((n) => ({
                  ...n,
                  options: [...(n.options ?? []), { key: String(children.length + 1), text: "" }],
                }))
              }
            >
              <Plus className="size-3.5" />
              Sub-option
            </Button>

            <Button
              type="button" size="sm" variant="ghost"
              className="h-6 px-2 text-[11px] text-warning"
              disabled={disabled}
              onClick={() => {
                if (
                  children.length > 0 &&
                  !window.confirm(
                    `Delete option ${node.key} and its ${children.length} sub-option${
                      children.length === 1 ? "" : "s"
                    }?`,
                  )
                ) {
                  return;
                }
                onChange(dropAt(root, path));
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {children.length > 0 ? (
        <div className="mt-2">
          <Level {...props} options={children} parent={path} depth={depth + 1} />
        </div>
      ) : null}
    </div>
  );
}

function IconButton({
  children, label, disabled, onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button" size="sm" variant="ghost"
      className="h-6 w-6 p-0 text-[11px]"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

// Local tree helpers, kept here because they only serve the editor. The moving
// and validation logic lives in lib/whatsapp/menu.ts, where it is tested.
function applyAt(
  options: MenuOption[],
  path: MenuPath,
  change: (n: MenuOption) => MenuOption,
): MenuOption[] {
  const [head, ...rest] = path;
  return options.map((node, i) => {
    if (i !== head) return node;
    if (rest.length === 0) return change(node);
    return { ...node, options: applyAt(node.options ?? [], rest, change) };
  });
}

function dropAt(options: MenuOption[], path: MenuPath): MenuOption[] {
  const [head, ...rest] = path;
  if (rest.length === 0) return options.filter((_, i) => i !== head);
  return options.map((node, i) =>
    i === head ? { ...node, options: dropAt(node.options ?? [], rest) } : node,
  );
}

function nodeChildren(options: MenuOption[], path: MenuPath): MenuOption[] | null {
  let list = options;
  let node: MenuOption | null = null;
  for (const step of path) {
    node = list[step] ?? null;
    if (!node) return null;
    list = node.options ?? [];
  }
  return node?.options ?? [];
}
