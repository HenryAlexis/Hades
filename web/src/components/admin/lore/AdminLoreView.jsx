// web/src/components/admin/lore/AdminLoreView.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  fetchAdminLore,
  createAdminLoreNode,
  updateAdminLoreNode,
  deleteAdminLoreNode
} from "../../../api";
import { LoreTree } from "./LoreTree";
import "./lore.less";

export function AdminLoreView() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState(null);

  const selectedNode = useMemo(() => {
    if (!selectedId) return null;
    return nodes.find((n) => String(n.id) === String(selectedId)) || null;
  }, [nodes, selectedId]);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadLore() {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAdminLore();
      if (res?.error) {
        setError(res.error);
        setNodes([]);
        setSelectedId(null);
        return;
      }

      const nextNodes = res.nodes || [];
      setNodes(nextNodes);

      // keep selection if it still exists; otherwise pick first
      if (nextNodes.length) {
        const stillExists = selectedId
          ? nextNodes.some((n) => String(n.id) === String(selectedId))
          : false;

        if (!stillExists) {
          setSelectedId(nextNodes[0].id);
        }
      } else {
        setSelectedId(null);
      }
    } catch (e) {
      console.error("[LORE] load failed:", e);
      setError("Failed to load lore");
      setNodes([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep editor in sync with selection
  useEffect(() => {
    if (!selectedNode) {
      setDraftTitle("");
      setDraftBody("");
      return;
    }

    setDraftTitle(selectedNode.title ?? "");

    // DB/API might return either `body` or `content` depending on backend version
    setDraftBody(selectedNode.body ?? selectedNode.content ?? "");
  }, [selectedNode]);

  async function handleAddRoot() {
    const title = prompt("Root title:");
    if (!title) return;

    setError("");
    try {
      const res = await createAdminLoreNode({
        parent_id: null,
        title,
        // backend may accept either `body` or `content`
        body: "",
        content: "",
        sort_order: 0,
        position: 0
      });

      if (res?.error) {
        setError(res.error);
        return;
      }

      await loadLore();
      if (res?.id) setSelectedId(res.id);
    } catch (e) {
      console.error("[LORE] create root failed:", e);
      setError("Failed to create lore node");
    }
  }

  async function handleAddChild(parentId) {
    const title = prompt("Child title:");
    if (!title) return;

    setError("");
    try {
      const res = await createAdminLoreNode({
        parent_id: parentId,
        title,
        body: "",
        content: "",
        sort_order: 0,
        position: 0
      });

      if (res?.error) {
        setError(res.error);
        return;
      }

      await loadLore();
      if (res?.id) setSelectedId(res.id);
    } catch (e) {
      console.error("[LORE] create child failed:", e);
      setError("Failed to create lore node");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this node and its children?")) return;

    setError("");
    try {
      const res = await deleteAdminLoreNode(id);
      if (res?.error) {
        setError(res.error);
        return;
      }

      // If we deleted the selected node, clear selection before reload
      if (String(selectedId) === String(id)) setSelectedId(null);

      await loadLore();
    } catch (e) {
      console.error("[LORE] delete failed:", e);
      setError("Failed to delete lore node");
    }
  }

  async function handleSave() {
    if (!selectedNode) return;

    setSaving(true);
    setError("");
    try {
      const res = await updateAdminLoreNode(selectedNode.id, {
        title: draftTitle,
        // backend may accept either `body` or `content`
        body: draftBody,
        content: draftBody
      });

      if (res?.error) {
        setError(res.error);
        return;
      }

      await loadLore();
    } catch (e) {
      console.error("[LORE] save failed:", e);
      setError("Failed to save lore");
    } finally {
      setSaving(false);
    }
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

        <button type="button" onClick={handleAddRoot}>
          + Add Root
        </button>
      </div>

      {error && <div className="lore-error">{error}</div>}

      {loading ? (
        <div>Loading lore…</div>
      ) : (
        <div className="lore-layout">
          <div className="lore-tree">
            <LoreTree
              nodes={nodes}
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
                <div className="lore-editor-row">
                  <label className="lore-label">Title</label>
                  <input
                    className="lore-input"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="Section title…"
                  />
                </div>

                <div className="lore-editor-row">
                  <label className="lore-label">Body</label>
                  <textarea
                    className="lore-textarea"
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    placeholder="Write the lore here…"
                  />
                </div>

                <div className="lore-actions">
                  <button type="button" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </button>

                  <button
                    className="lore-danger"
                    type="button"
                    onClick={() => handleDelete(selectedNode.id)}
                    disabled={saving}
                  >
                    Delete Node
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}