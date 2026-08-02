import { expect, test } from "@playwright/test";
import {
  countOptions,
  depthOf,
  insertAt,
  isAncestor,
  moveNode,
  nodeAt,
  removeAt,
  renumber,
  updateAt,
  validateMenu,
  forGateway,
  type MenuOption,
} from "@/lib/whatsapp/menu";

/**
 * The menu tree edits.
 *
 * These run when somebody drags a row. A move that silently drops a subtree
 * destroys work with no undo, so the destructive cases are the ones worth
 * pinning: dragging a node into its own child, and moving within one list where
 * the removal shifts the target index.
 */

function tree(): MenuOption[] {
  return [
    { key: "1", text: "Order", options: [
      { key: "1", text: "Track" },
      { key: "2", text: "Buy" },
    ] },
    { key: "2", text: "Contact" },
    { key: "3", text: "Feedback" },
  ];
}

test.describe("reading the tree", () => {
  test("a path addresses a nested node", () => {
    expect(nodeAt(tree(), [0, 1])?.text).toBe("Buy");
  });

  test("a path that does not exist is null rather than a crash", () => {
    expect(nodeAt(tree(), [9])).toBeNull();
    expect(nodeAt(tree(), [0, 5])).toBeNull();
  });

  test("depth and totals count every level", () => {
    expect(depthOf(tree())).toBe(2);
    expect(countOptions(tree())).toBe(5);
  });
});

test.describe("editing", () => {
  test("updating a nested node leaves its siblings alone", () => {
    const next = updateAt(tree(), [0, 0], (n) => ({ ...n, text: "Where is it?" }));
    expect(nodeAt(next, [0, 0])?.text).toBe("Where is it?");
    expect(nodeAt(next, [0, 1])?.text).toBe("Buy");
  });

  test("removing a parent removes its children with it", () => {
    const next = removeAt(tree(), [0]);
    expect(next).toHaveLength(2);
    expect(countOptions(next)).toBe(2);
  });

  test("inserting into a submenu puts the node at the right index", () => {
    const next = insertAt(tree(), [0], 1, { key: "x", text: "Cancel" });
    expect(nodeAt(next, [0, 1])?.text).toBe("Cancel");
    expect(nodeAt(next, [0, 2])?.text).toBe("Buy");
  });
});

test.describe("moving", () => {
  test("a node cannot be dropped inside itself", () => {
    /*
     * The case that loses data. Without the guard the node is removed from the
     * tree and then inserted into a list that no longer exists, so the whole
     * subtree disappears with no way back.
     */
    const before = tree();
    const after = moveNode(before, [0], [0, 0], 0);
    expect(after).toEqual(before);
    expect(countOptions(after)).toBe(5);
  });

  test("moving down within one list accounts for its own removal", () => {
    // "Contact" (index 1) to the end. Removing it first shifts every later
    // index down by one; without correcting, it lands short of the target.
    const next = moveNode(tree(), [1], [], 3);
    expect(next.map((n) => n.text)).toEqual(["Order", "Feedback", "Contact"]);
  });

  test("moving up within one list does not over-correct", () => {
    const next = moveNode(tree(), [2], [], 0);
    expect(next.map((n) => n.text)).toEqual(["Feedback", "Order", "Contact"]);
  });

  test("a node keeps its children when it moves", () => {
    const next = moveNode(tree(), [0], [], 3);
    expect(next[2].text).toBe("Order");
    expect(next[2].options).toHaveLength(2);
    expect(countOptions(next)).toBe(5);
  });

  test("a node can move into another node's submenu", () => {
    const next = moveNode(tree(), [2], [0], 0);
    expect(nodeAt(next, [0, 0])?.text).toBe("Feedback");
    expect(next).toHaveLength(2);
  });

  test("isAncestor recognises a node as its own ancestor", () => {
    expect(isAncestor([0], [0, 1])).toBe(true);
    expect(isAncestor([0], [0])).toBe(true);
    expect(isAncestor([1], [0, 1])).toBe(false);
  });
});

test.describe("what the customer ends up typing", () => {
  test("keys are renumbered at every level after a change", () => {
    // Keys are what the customer types. A menu offering "1, 2, 4" after a
    // deletion is a bug they see.
    const next = renumber(removeAt(tree(), [1]));
    expect(next.map((n) => n.key)).toEqual(["1", "2"]);
    expect(next[0].options?.map((n) => n.key)).toEqual(["1", "2"]);
  });

  test("a leaf is sent without an empty options array", () => {
    // The plugin reads an empty array as a dead submenu rather than an ending.
    const sent = forGateway({
      trigger: "hi", greeting: "hello", respondInGroups: false,
      options: [{ key: "1", text: "Order", options: [] }],
    });
    expect("options" in sent.options[0]).toBe(false);
  });

  test("the trigger is trimmed, since it is matched exactly", () => {
    const sent = forGateway({
      trigger: "  hi  ", greeting: "hello", respondInGroups: false,
      options: [{ key: "1", text: "Order" }],
    });
    expect(sent.trigger).toBe("hi");
  });
});

test.describe("refusing to save something broken", () => {
  test("an empty greeting is refused", () => {
    expect(validateMenu({ trigger: "hi", greeting: "  ", options: tree(), respondInGroups: false }))
      .toContain("The greeting is what a customer sees first — it cannot be empty.");
  });

  test("a menu with no options is refused", () => {
    expect(validateMenu({ trigger: "hi", greeting: "hello", options: [], respondInGroups: false }))
      .toContain("A menu needs at least one option.");
  });

  test("an option with no reply is counted and named", () => {
    const problems = validateMenu({
      trigger: "hi", greeting: "hello", respondInGroups: false,
      options: [{ key: "1", text: "" }, { key: "2", text: "" }],
    });
    expect(problems.some((p) => p.includes("2 options have no reply text"))).toBe(true);
  });

  test("a valid menu has nothing to report", () => {
    expect(validateMenu({
      trigger: "hi", greeting: "hello", options: tree(), respondInGroups: false,
    })).toEqual([]);
  });
});
