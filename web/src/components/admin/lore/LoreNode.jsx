// web/src/components/admin/lore/LoreNode.jsx
import React, { useMemo, useState } from "react";

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
  onDelete,
  featureCount,
  characterOptions = [],
  characterSelections = {},
  onUpdateCharacters,
  onEnsureNodeCharacters
}) {
  const indent = Math.min(depth * 18, 200);
  const [showCharacters, setShowCharacters] = useState(false);
  const selectedCharacterIds = useMemo(
    () => characterSelections[String(node.id)] || [],
    [characterSelections, node.id]
  );

  function toggleCharacter(id) {
    const idStr = String(id);
    const current = new Set((selectedCharacterIds || []).map(String));
    if (current.has(idStr)) current.delete(idStr);
    else current.add(idStr);
    const next = Array.from(current);
    onUpdateCharacters?.(node.id, next);
  }

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
            {typeof featureCount === "number" && featureCount > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: "0.8rem",
                  opacity: 0.8,
                  padding: "1px 6px",
                  borderRadius: 10,
                  border: "1px solid #3a2a16",
                  background: "rgba(255, 255, 255, 0.06)"
                }}
              >
                • {featureCount}
              </span>
            )}
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
          <button
          type="button"
          title="Link characters"
          onClick={(e) => {
            e.stopPropagation();
            setShowCharacters((prev) => {
              const next = !prev;
              if (next) onEnsureNodeCharacters?.(node.id);
              return next;
            });
          }}
        >
          👤
        </button>
        </div>
      </div>

      {showCharacters && characterOptions.length > 0 && (
        <div
          style={{
            marginTop: 6,
            marginLeft: 8,
            padding: "6px 8px",
            border: "1px solid #2f4356",
            borderRadius: 8,
            background: "rgba(16, 24, 32, 0.65)",
            color: "#e2e9f3"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: "0.9rem", marginBottom: 6 }}>Characters</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {characterOptions.map((opt) => {
              const checked = selectedCharacterIds.map(String).includes(String(opt.id));
              return (
                <label key={opt.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCharacter(opt.id)}
                    style={{ cursor: "pointer" }}
                  />
                  <span>{opt.name || `#${opt.id}`}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
