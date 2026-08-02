/**
 * The inbound menu bot.
 *
 * Everything else in this application reaches out: broadcasts and flows send,
 * the inbox lets a person reply. Nothing answers automatically, because nothing
 * here is running when a customer writes at three in the morning.
 *
 * This is the other direction, and it does not run here at all — it runs as a
 * plugin inside the gateway, which is what lets it answer at any hour. What
 * lives in this file is the editing model and the calls that read and write the
 * plugin's configuration, so the menu can be built on a screen rather than by
 * hand-writing JSON against an API.
 */

/** One menu entry: what the customer types, and what they get back. */
export interface MenuOption {
  /** What the customer replies to choose this — "1", "2", and so on. */
  key: string;
  /** The reply. Becomes a submenu prompt when this node has children. */
  text: string;
  /** Nested submenu. Absent or empty means choosing this ends the flow. */
  options?: MenuOption[];
}

export interface MenuConfig {
  /**
   * The word that opens the menu, matched exactly and case-insensitively.
   *
   * Empty means *any* text message opens it, which on a live business line
   * means every customer gets a menu instead of a person. The editor warns
   * about that rather than silently accepting it.
   */
  trigger: string;
  greeting: string;
  options: MenuOption[];
  respondInGroups: boolean;
}

export const PLUGIN_ID = "chat-flow";

/** Deepest nesting the editor allows, so a menu stays navigable by a human. */
export const MAX_MENU_DEPTH = 3;

export const EMPTY_MENU: MenuConfig = {
  trigger: "hi",
  greeting: "",
  options: [],
  respondInGroups: false,
};

// ---------------------------------------------------------------------------
// Tree edits.
//
// Pure and path-addressed: a node is identified by its position, so an edit is
// the same operation whether it happens at the top level or three menus down.
// This is the part worth testing, because a drag that silently drops a subtree
// loses work the user cannot get back.
// ---------------------------------------------------------------------------

/** Position of a node, as the index at each level from the root. */
export type MenuPath = number[];

export function nodeAt(options: MenuOption[], path: MenuPath): MenuOption | null {
  let list = options;
  let node: MenuOption | null = null;

  for (const index of path) {
    node = list[index] ?? null;
    if (!node) return null;
    list = node.options ?? [];
  }

  return node;
}

/** Replaces the node at `path`, returning a new tree. */
export function updateAt(
  options: MenuOption[],
  path: MenuPath,
  change: (node: MenuOption) => MenuOption,
): MenuOption[] {
  if (path.length === 0) return options;
  const [head, ...rest] = path;

  return options.map((node, i) => {
    if (i !== head) return node;
    if (rest.length === 0) return change(node);
    return { ...node, options: updateAt(node.options ?? [], rest, change) };
  });
}

export function removeAt(options: MenuOption[], path: MenuPath): MenuOption[] {
  if (path.length === 0) return options;
  const [head, ...rest] = path;

  if (rest.length === 0) return options.filter((_, i) => i !== head);

  return options.map((node, i) =>
    i === head ? { ...node, options: removeAt(node.options ?? [], rest) } : node,
  );
}

/** Inserts `node` into the list at `parent`, at `index`. */
export function insertAt(
  options: MenuOption[],
  parent: MenuPath,
  index: number,
  node: MenuOption,
): MenuOption[] {
  if (parent.length === 0) {
    const next = [...options];
    next.splice(Math.max(0, Math.min(index, next.length)), 0, node);
    return next;
  }

  const [head, ...rest] = parent;
  return options.map((child, i) =>
    i === head
      ? { ...child, options: insertAt(child.options ?? [], rest, index, node) }
      : child,
  );
}

/** True when `maybeAncestor` is at or above `path` — a drag into its own subtree. */
export function isAncestor(maybeAncestor: MenuPath, path: MenuPath): boolean {
  if (maybeAncestor.length > path.length) return false;
  return maybeAncestor.every((step, i) => step === path[i]);
}

/**
 * Moves a node to a new parent and index.
 *
 * Refuses to move a node inside itself, which would detach the whole subtree
 * from the tree and lose it. The removal happens first, so the target index is
 * corrected when both are in the same list and the node came from above it.
 */
export function moveNode(
  options: MenuOption[],
  from: MenuPath,
  toParent: MenuPath,
  toIndex: number,
): MenuOption[] {
  if (from.length === 0) return options;
  if (isAncestor(from, toParent)) return options;

  const node = nodeAt(options, from);
  if (!node) return options;

  const fromParent = from.slice(0, -1);
  const fromIndex = from[from.length - 1];

  const without = removeAt(options, from);

  const sameList =
    fromParent.length === toParent.length &&
    fromParent.every((step, i) => step === toParent[i]);
  const corrected = sameList && fromIndex < toIndex ? toIndex - 1 : toIndex;

  return insertAt(without, toParent, corrected, node);
}

/**
 * Renumbers every level so keys read 1, 2, 3 down each menu.
 *
 * Run after any structural change. Keys are what the customer types, so a menu
 * that offers "1, 2, 4" after a deletion is a bug the customer sees.
 */
export function renumber(options: MenuOption[]): MenuOption[] {
  return options.map((node, i) => ({
    ...node,
    key: String(i + 1),
    ...(node.options?.length ? { options: renumber(node.options) } : {}),
  }));
}

export function depthOf(options: MenuOption[]): number {
  return options.reduce(
    (deepest, node) => Math.max(deepest, 1 + (node.options?.length ? depthOf(node.options) : 0)),
    0,
  );
}

export function countOptions(options: MenuOption[]): number {
  return options.reduce(
    (total, node) => total + 1 + (node.options?.length ? countOptions(node.options) : 0),
    0,
  );
}

/** Problems worth blocking a save for, in the order they should be shown. */
export function validateMenu(config: MenuConfig): string[] {
  const problems: string[] = [];

  if (!config.greeting.trim()) {
    problems.push("The greeting is what a customer sees first — it cannot be empty.");
  }
  if (config.options.length === 0) {
    problems.push("A menu needs at least one option.");
  }
  if (depthOf(config.options) > MAX_MENU_DEPTH) {
    problems.push(`Menus can nest ${MAX_MENU_DEPTH} deep. Anything further is hard to follow on a phone.`);
  }

  const blank = countBlank(config.options);
  if (blank > 0) {
    problems.push(`${blank} option${blank === 1 ? " has" : "s have"} no reply text.`);
  }

  return problems;
}

function countBlank(options: MenuOption[]): number {
  return options.reduce(
    (total, node) =>
      total + (node.text.trim() ? 0 : 1) + (node.options?.length ? countBlank(node.options) : 0),
    0,
  );
}

/**
 * Strips the tree to what the plugin accepts.
 *
 * An empty `options` array on a leaf makes the plugin treat it as a dead
 * submenu rather than an ending, so the key is dropped instead of sent empty.
 */
export function forGateway(config: MenuConfig): MenuConfig {
  return {
    trigger: config.trigger.trim(),
    greeting: config.greeting,
    respondInGroups: config.respondInGroups,
    options: clean(config.options),
  };
}

function clean(options: MenuOption[]): MenuOption[] {
  return options.map((node) => ({
    key: node.key,
    text: node.text,
    ...(node.options?.length ? { options: clean(node.options) } : {}),
  }));
}
