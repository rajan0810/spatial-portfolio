"use client";

import { useEffect } from "react";

import { useEditor, type EditorNode, type NodeKind } from "@/lib/store/editor";

const ICONS: Record<NodeKind, string> = {
  scene: "◈",
  player: "◉",
  folder: "▸",
  project: "▣",
  skill: "◆",
  achievement: "★",
  timeline: "▤",
  contact: "◎",
};

/**
 * The hierarchy: the site map, as a scene tree.
 *
 * Click selects; double-click (or F) frames it in the scene view; arrow keys
 * walk the tree. Every row is a real button, so the whole map is reachable by
 * keyboard and read as a list by a screen reader.
 */
export function Hierarchy() {
  const nodes = useEditor((s) => s.nodes);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const requestFrame = useEditor((s) => s.requestFrame);
  const expanded = useEditor((s) => s.expanded);
  const toggleExpanded = useEditor((s) => s.toggleExpanded);

  // F frames the selection, wherever focus is (unless typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key.toLowerCase() === "f") requestFrame();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestFrame]);

  const flat = flatten(nodes, expanded);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowDown" && flat[index + 1]) select(flat[index + 1].node.id);
    if (e.key === "ArrowUp" && flat[index - 1]) select(flat[index - 1].node.id);
    if (e.key === "ArrowRight" && flat[index].node.children && !expanded[flat[index].node.id]) toggleExpanded(flat[index].node.id);
    if (e.key === "ArrowLeft" && flat[index].node.children && expanded[flat[index].node.id]) toggleExpanded(flat[index].node.id);
  };

  return (
    <section className="ed-panel" aria-label="Hierarchy">
      <header className="ed-panel__head">
        <span>Hierarchy</span>
        <span className="ed-dim">{countNodes(nodes)} objects</span>
      </header>
      <div className="ed-panel__body" role="tree">
        {flat.map(({ node, depth }, index) => {
          const isSelected = node.id === selectedId;
          const hasChildren = Boolean(node.children?.length);
          const open = expanded[node.id];
          return (
            <button
              key={node.id}
              type="button"
              role="treeitem"
              aria-selected={isSelected}
              aria-expanded={hasChildren ? open : undefined}
              className={`ed-row ${isSelected ? "is-selected" : ""}`}
              style={{ paddingLeft: 8 + depth * 14 }}
              onClick={() => select(node.id)}
              onDoubleClick={() => {
                select(node.id);
                requestFrame();
              }}
              onKeyDown={(e) => onKeyDown(e, index)}
            >
              <span
                className={`ed-row__twisty ${hasChildren ? "" : "is-hidden"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(node.id);
                }}
                aria-hidden
              >
                {open ? "▾" : "▸"}
              </span>
              <span className={`ed-row__icon ed-kind-${node.kind}`} aria-hidden>
                {ICONS[node.kind]}
              </span>
              <span className="ed-row__name">{node.name}</span>
              {node.kind === "folder" && node.children?.length === 0 ? (
                <span className="ed-dim ed-row__meta">empty</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function flatten(
  nodes: EditorNode[],
  expanded: Record<string, boolean>,
  depth = 0,
  out: { node: EditorNode; depth: number }[] = [],
) {
  for (const node of nodes) {
    out.push({ node, depth });
    if (node.children && expanded[node.id]) flatten(node.children, expanded, depth + 1, out);
  }
  return out;
}

function countNodes(nodes: EditorNode[]): number {
  return nodes.reduce((n, node) => n + 1 + (node.children ? countNodes(node.children) : 0), 0);
}
