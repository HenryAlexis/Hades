// web/src/components/admin/lore/LoreNode.jsx
import React from "react";

export function LoreNode({
  node,
  depth,
  children,
  isSelected,
  onSelect,
  onAddChild,
  onDelete
}) {
  return (
    <div className="lore-node" style={{ marginLeft: depth * 24 }}>
      <div
        className={`lore-node-box ${isSelected ? "is-selected" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => onSelect?.(node.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelect?.(node.id);
        }}
        aria-label={`Lore node ${node.title || "Untitled"}`}
      >
        <div className="lore-node-title">
          <strong>{node.title || "Untitled"}</strong>
        </div>

        <div className="lore-node-actions">
          <button
            type="button"
            title="Add child"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.id);
            }}
          >
            +
          </button>
          <button
            type="button"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}