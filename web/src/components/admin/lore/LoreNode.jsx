// web/src/components/admin/lore/LoreNode.jsx
import React from "react";

export function LoreNode({
  node,
  depth,
  children,
  isSelected,
  hasChildren,
  isExpanded,
  onToggleExpanded,
  onSelect,
  onAddChild,
  onDelete
}) {
  const indent = Math.min(depth * 18, 200);

  return (
    <div className="lore-node" style={{ marginLeft: indent }}>
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
        <div className="lore-node-left">
          <button
            type="button"
            className="lore-caret"
            title={hasChildren ? (isExpanded ? "Collapse" : "Expand") : "No children"}
            disabled={!hasChildren}
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) onToggleExpanded?.(node.id);
            }}
          >
            {hasChildren ? (isExpanded ? "▾" : "▸") : "•"}
          </button>

          <div className="lore-node-title">
            <strong>{node.title || "Untitled"}</strong>
          </div>
        </div>

        <div className="lore-node-actions">
          <button
            type="button"
            title="Add child"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild?.(node.id);
            }}
          >
            +
          </button>
          <button
            type="button"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(node.id);
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
