// web/src/components/admin/lore/AdminLoreView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchAdminLore,
  createAdminLoreNode,
  updateAdminLoreNode,
  deleteAdminLoreNode
} from "../../../api";
import { LoreTree } from "./LoreTree";
import "./lore.less";

function buildChildMap(nodes) {
  const map = {};
  (nodes || []).forEach((n) => {
    const key =
      n.parent_id === null || typeof n.parent_id === "undefined"
        ? "root"
        : String(n.parent_id);
    if (!map[key]) map[key] = [];
    map[key].push(n);
  });
  return map;
}

export function AdminLoreView() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const selectedNode = useMemo(
    () => nodes.find((n) => String(n.id) === String(selectedId)) || null,
    [nodes, selectedId]
  );

  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");

  // Autosave UX states
  const [saveState, setSaveState] = useState("idle"); // idle | dirty | saving | saved | error
  const saveTimerRef = useRef(null);
  const lastSavedRef = useRef({ title: "", body: "", id: null });

  // Expand/collapse state (Set of expanded ids). Roots expanded by default.
  const [expanded, setExpanded] = useState(() => new Set());

  const childMap = useMemo(() => buildChildMap(nodes), [nodes]);

  async function loadLore({ keepSelection = true } = {}) {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAdminLore();
      if (res?.error) {
        setError(res.error);
        setNodes([]);
        return;
      }

      const nextNodes = res.nodes || [];
      setNodes(nextNodes);

      // Default selection: first root if none (or missing from list)
      const firstRoot =
        nextNodes.find((n) => n.parent_id === null || typeof n.parent_id === "undefined") ||
        nextNodes[0] ||
        null;
      const stillExists = nextNodes.some(
        (n) => String(n.id) === String(selectedId)
      );
      if (!keepSelection || !selectedId || !stillExists) {
        setSelectedId(firstRoot ? firstRoot.id : null);
      }

      // Expand all roots by default (first load)
      setExpanded((prev) => {
        if (prev && prev.size) return prev; // don't override user choice
        const next = new Set();
        // expand all root nodes that have children
        nextNodes.forEach((n) => {
          const key = String(n.id);
          const hasChildren = (childMap[key] || []).length > 0;
          if (n.parent_id === null && hasChildren) next.add(key);
        });
        return next;
      });
    } catch (e) {
      console.error("[LORE] load failed:", e);
      setError("Failed to load lore");
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLore({ keepSelection: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep editor in sync with selection
  useEffect(() => {
    // Cancel pending autosave when switching nodes
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;

    if (!selectedNode) {
      setDraftTitle("");
      setDraftBody("");
      setSaveState("idle");
      lastSavedRef.current = { title: "", body: "", id: null };
      return;
    }

    const nextTitle = selectedNode.title ?? "";
    const nextBody = selectedNode.body ?? "";

    setDraftTitle(nextTitle);
    setDraftBody(nextBody);
    setSaveState("idle");
    lastSavedRef.current = { title: nextTitle, body: nextBody, id: selectedNode.id };
  }, [selectedNode]);

  function markDirtyIfChanged(nextTitle, nextBody) {
    if (!selectedNode) return;

    const last = lastSavedRef.current;
    const changed =
      String(last.id) === String(selectedNode.id) &&
      (nextTitle !== last.title || nextBody !== last.body);

    setSaveState(changed ? "dirty" : "idle");
  }

  async function handleAddRoot() {
    const title = prompt("Root title:");
    if (!title) return;

    setError("");
    const res = await createAdminLoreNode({
      title,
      body: "",
      parent_id: null,
      sort_order: 0
    });

    if (res?.error) {
      setError(res.error);
      return;
    }

    await loadLore({ keepSelection: true });
    if (res?.id) setSelectedId(res.id);
  }

  async function handleAddChild(parentId) {
    const title = prompt("Child title:");
    if (!title) return;

    setError("");
    const res = await createAdminLoreNode({
      title,
      body: "",
      parent_id: parentId,
      sort_order: 0
    });

    if (res?.error) {
      setError(res.error);
      return;
    }

    // Ensure parent is expanded
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(String(parentId));
      return next;
    });

    await loadLore({ keepSelection: true });
    if (res?.id) setSelectedId(res.id);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this node and its children?")) return;

    setError("");
    const res = await deleteAdminLoreNode(id);
    if (res?.error) {
      setError(res.error);
      return;
    }

    // If deleting selected, clear selection
    if (String(selectedId) === String(id)) setSelectedId(null);

    await loadLore({ keepSelection: true });
  }

  async function doSaveNow({ force = false } = {}) {
    if (!selectedNode) return;
    const title = draftTitle;
    const body = draftBody;

    // If not dirty and not forced, skip
    const last = lastSavedRef.current;
    const isChanged =
      force ||
      String(last.id) !== String(selectedNode.id) ||
      title !== last.title ||
      body !== last.body;

    if (!isChanged) {
      setSaveState("idle");
      return;
    }

    setSaveState("saving");
    setError("");
    try {
      const res = await updateAdminLoreNode(selectedNode.id, {
        title,
        body,
        sort_order: selectedNode.sort_order ?? 0
      });

      if (res?.error) {
        setSaveState("error");
        setError(res.error);
        return;
      }

      lastSavedRef.current = { title, body, id: selectedNode.id };
      setSaveState("saved");

      // Refresh list so tree shows updated title
      const next = await fetchAdminLore();
      if (!next?.error) setNodes(next.nodes || []);

      // fade back to idle
      window.setTimeout(() => {
        setSaveState((s) => (s === "saved" ? "idle" : s));
      }, 900);
    } catch (e) {
      console.error("[LORE] save failed:", e);
      setSaveState("error");
      setError("Failed to save lore");
    }
  }

  function scheduleAutosave(nextTitle, nextBody) {
    if (!selectedNode) return;

    // clear old timer
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    // mark dirty state
    markDirtyIfChanged(nextTitle, nextBody);

    saveTimerRef.current = setTimeout(() => {
      doSaveNow();
    }, 650); // debounce window
  }

  function toggleExpanded(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="lore-admin">
      <div className="lore-header">
        <div>
          <h2 style={{ margin: 0 }}>Lore Editor</h2>
          <div className="lore-subtitle">
            Build a nested lore tree (root sections → sub-sections → …)
          </div>
        </div>
        <button onClick={handleAddRoot}>+ Add Root</button>
      </div>

      {error && <div className="lore-error">{error}</div>}

      {loading ? (
        <div>Loading lore…</div>
      ) : (
        <div className="lore-layout">
          <div className="lore-tree">
            <LoreTree
              nodes={nodes}
              childMap={childMap}
              expanded={expanded}
              onToggleExpanded={toggleExpanded}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAddChild={handleAddChild}
              onDelete={handleDelete}
            />
          </div>

          <div className="lore-editor">
            {!selectedNode ? (
              <div className="lore-empty">
                Select a node in the tree to edit its title and body.
              </div>
            ) : (
              <>
                <div className="lore-savebar">
                  <div className="lore-savebadge" data-state={saveState}>
                    {saveState === "saving" && "Saving…"}
                    {saveState === "dirty" && "Unsaved changes"}
                    {saveState === "saved" && "Saved"}
                    {saveState === "error" && "Save failed"}
                    {saveState === "idle" && " "}
                  </div>

                  <div className="lore-savebar-actions">
                    <button
                      type="button"
                      onClick={() => doSaveNow({ force: true })}
                      disabled={saveState === "saving"}
                    >
                      Save
                    </button>
                    <button
                      className="lore-danger"
                      onClick={() => handleDelete(selectedNode.id)}
                      disabled={saveState === "saving"}
                      type="button"
                    >
                      Delete Node
                    </button>
                  </div>
                </div>

                <div className="lore-editor-row">
                  <label className="lore-label">Title</label>
                  <input
                    className="lore-input"
                    value={draftTitle}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraftTitle(v);
                      scheduleAutosave(v, draftBody);
                    }}
                    placeholder="Section title…"
                  />
                </div>

                <div className="lore-editor-row">
                  <label className="lore-label">Body</label>
                  <textarea
                    className="lore-textarea"
                    value={draftBody}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraftBody(v);
                      scheduleAutosave(draftTitle, v);
                    }}
                    placeholder="Write the lore here…"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
