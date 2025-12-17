// web/src/components/admin/lore/LoreTree.jsx
import React, { useMemo } from "react";
import { LoreNode } from "./LoreNode";

export function LoreTree({
  nodes,
  selectedId,
  onSelect,
  onAddChild,
  onDelete
}) {
  const byParent = useMemo(() => {
    const map = {};
    (nodes || []).forEach((n) => {
      const key =
        n.parent_id === null || typeof n.parent_id === "undefined"
          ? "root"
          : String(n.parent_id);

      if (!map[key]) map[key] = [];
      map[key].push(n);
    });

    // sort by sort_order/position when present, fallback id
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const aOrder =
          (typeof a.sort_order === "number" ? a.sort_order : null) ??
          (typeof a.position === "number" ? a.position : null) ??
          0;
        const bOrder =
          (typeof b.sort_order === "number" ? b.sort_order : null) ??
          (typeof b.position === "number" ? b.position : null) ??
          0;

        if (aOrder !== bOrder) return aOrder - bOrder;
        return (a.id ?? 0) - (b.id ?? 0);
      });
    });

    return map;
  }, [nodes]);

  function render(parentKey = "root", depth = 0) {
    return (byParent[parentKey] || []).map((node) => (
      <LoreNode
        key={node.id}
        node={node}
        depth={depth}
        isSelected={String(selectedId) === String(node.id)}
        onSelect={onSelect}
        onAddChild={onAddChild}
        onDelete={onDelete}
      >
        {render(String(node.id), depth + 1)}
      </LoreNode>
    ));
  }

  return <div className="lore-tree-inner">{render()}</div>;
}