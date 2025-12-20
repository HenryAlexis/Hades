// web/src/components/admin/characters/AdminCharactersView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import {
  fetchAdminCharacters,
  createAdminCharacter,
  updateAdminCharacter,
  deleteAdminCharacter,
  fetchAdminCharacterAttrs,
  createAdminCharacterAttr,
  updateAdminCharacterAttr,
  deleteAdminCharacterAttr
} from "../../../api";
import "./characters.less";

function medievalButtonStyle(danger = false) {
  return {
    border: "1px solid " + (danger ? "#aa3333" : "#4a3823"),
    background: danger ? "linear-gradient(#5b1010, #3b0505)" : "linear-gradient(#3b2a14, #22160b)",
    color: danger ? "#ffe3e3" : "#f3e6d0",
    borderRadius: 8,
    padding: "0.45rem 0.75rem",
    cursor: "pointer"
  };
}

export function AdminCharactersView() {
  const [characters, setCharacters] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const selected = useMemo(
    () => characters.find((c) => String(c.id) === String(selectedId)) || null,
    [characters, selectedId]
  );

  const [draftName, setDraftName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [attrs, setAttrs] = useState([]);
  const [attrsLoading, setAttrsLoading] = useState(false);
  const [attrsError, setAttrsError] = useState("");
  const [attrSavingId, setAttrSavingId] = useState(null);
  const [expandedAttrIds, setExpandedAttrIds] = useState(new Set());
  const attrSaveTimersRef = useRef({});

  async function loadCharacters() {
    setLoadingList(true);
    setListError("");
    try {
      const res = await fetchAdminCharacters();
      if (res?.error) {
        setListError(res.error);
        setCharacters([]);
        return;
      }
      setCharacters(res.characters || []);
      if (!selectedId && res.characters?.length) {
        setSelectedId(res.characters[0].id);
      }
    } catch (e) {
      console.error("[CHAR] load failed:", e);
      setListError("Failed to load characters");
      setCharacters([]);
    } finally {
      setLoadingList(false);
    }
  }

  async function loadAttrs(charId) {
    if (!charId) {
      setAttrs([]);
      setAttrsError("");
      return;
    }
    setAttrsLoading(true);
    setAttrsError("");
    try {
      const res = await fetchAdminCharacterAttrs(charId);
      if (res?.error) {
        setAttrsError(res.error);
        setAttrs([]);
        return;
      }
      setAttrs(res.attributes || []);
      setExpandedAttrIds(new Set()); // collapse all by default
    } catch (e) {
      console.error("[CHAR] load attrs failed:", e);
      setAttrsError("Failed to load attributes");
      setAttrs([]);
    } finally {
      setAttrsLoading(false);
    }
  }

  useEffect(() => {
    loadCharacters();
  }, []);

  useEffect(() => {
    if (selected) {
      setDraftName(selected.name || "");
      loadAttrs(selected.id);
    } else {
      setDraftName("");
      setAttrs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function handleAddCharacter() {
    const name = prompt("Character name:");
    if (!name) return;
    setListError("");
    try {
      const res = await createAdminCharacter({ name });
      if (res?.error) {
        setListError(res.error);
        return;
      }
      await loadCharacters();
      if (res?.id) setSelectedId(res.id);
    } catch (e) {
      console.error("[CHAR] add failed:", e);
      setListError("Failed to add character");
    }
  }

  async function handleSaveCharacter() {
    if (!selected?.id) return;
    setSavingName(true);
    setListError("");
    try {
      const res = await updateAdminCharacter(selected.id, { name: draftName });
      if (res?.error) {
        setListError(res.error);
        return;
      }
      setCharacters((prev) =>
        prev.map((c) => (String(c.id) === String(selected.id) ? { ...c, name: draftName } : c))
      );
    } catch (e) {
      console.error("[CHAR] save failed:", e);
      setListError("Failed to save character");
    } finally {
      setSavingName(false);
    }
  }

  async function handleDeleteCharacter() {
    if (!selected?.id) return;
    if (!window.confirm("Delete this character and its attributes?")) return;
    setListError("");
    try {
      const res = await deleteAdminCharacter(selected.id);
      if (res?.error) {
        setListError(res.error);
        return;
      }
      setSelectedId(null);
      await loadCharacters();
    } catch (e) {
      console.error("[CHAR] delete failed:", e);
      setListError("Failed to delete character");
    }
  }

  function updateAttrLocal(id, field, value) {
    setAttrs((prev) => prev.map((a) => (String(a.id) === String(id) ? { ...a, [field]: value } : a)));
    const target = (attrs || []).find((a) => String(a.id) === String(id));
    if (target) {
      const nextAttr = { ...target, [field]: value };
      scheduleAttrAutosave(nextAttr);
    }
  }

  function scheduleAttrAutosave(attr) {
    if (!attr?.id) return;
    const key = String(attr.id);
    if (attrSaveTimersRef.current[key]) clearTimeout(attrSaveTimersRef.current[key]);

    attrSaveTimersRef.current[key] = setTimeout(async () => {
      setAttrSavingId(attr.id);
      setAttrsError("");
      try {
        const res = await updateAdminCharacterAttr(attr.id, {
          attr_key: attr.attr_key ?? "",
          attr_value: attr.attr_value ?? "",
          sort_order: attr.sort_order ?? 0
        });
        if (res?.error) {
          setAttrsError(res.error);
        }
      } catch (e) {
        console.error("[CHAR ATTR] autosave failed:", e);
        setAttrsError("Failed to save attribute");
      } finally {
        setAttrSavingId((current) => (current === attr.id ? null : current));
        attrSaveTimersRef.current[key] = null;
      }
    }, 650);
  }

  async function handleAddAttr() {
    if (!selected?.id) return;
    const key = prompt("Attribute key:");
    if (!key) return;
    setAttrsError("");
    try {
      const res = await createAdminCharacterAttr(selected.id, {
        attr_key: key,
        attr_value: "",
        sort_order: 0
      });
      if (res?.error) {
        setAttrsError(res.error);
        return;
      }
      await loadAttrs(selected.id);
      if (res?.id) {
        setExpandedAttrIds((prev) => {
          const next = new Set(prev);
          next.delete(String(res.id)); // ensure collapsed on create
          return next;
        });
      }
    } catch (e) {
      console.error("[CHAR ATTR] add failed:", e);
      setAttrsError("Failed to add attribute");
    }
  }

  async function handleSaveAttr(attr) {
    if (!attr?.id) return;
    setAttrSavingId(attr.id);
    setAttrsError("");
    try {
      const res = await updateAdminCharacterAttr(attr.id, {
        attr_key: attr.attr_key ?? "",
        attr_value: attr.attr_value ?? "",
        sort_order: attr.sort_order ?? 0
      });
      if (res?.error) {
        setAttrsError(res.error);
        return;
      }
      await loadAttrs(selected.id);
    } catch (e) {
      console.error("[CHAR ATTR] save failed:", e);
      setAttrsError("Failed to save attribute");
    } finally {
      setAttrSavingId(null);
    }
  }

  async function handleDeleteAttr(id) {
    if (!id) return;
    if (!window.confirm("Delete this attribute?")) return;
    setAttrSavingId(id);
    setAttrsError("");
    try {
      const res = await deleteAdminCharacterAttr(id);
      if (res?.error) {
        setAttrsError(res.error);
        return;
      }
      await loadAttrs(selected.id);
    } catch (e) {
      console.error("[CHAR ATTR] delete failed:", e);
      setAttrsError("Failed to delete attribute");
    } finally {
      setAttrSavingId(null);
    }
  }

  return (
    <div className="admin-characters">
      <div className="characters-layout">
        <div className="characters-list">
          <div className="characters-toolbar">
            <div style={{ fontWeight: 600 }}>Characters</div>
            <button type="button" style={medievalButtonStyle()} onClick={handleAddCharacter}>
              + Add
            </button>
          </div>
          {loadingList ? (
            <div>Loading…</div>
          ) : listError ? (
            <div className="lore-error">{listError}</div>
          ) : (
            <div className="lore-tree-inner">
              {(characters || []).map((c) => (
                <div
                  key={c.id}
                  className={`lore-node-box ${String(selectedId) === String(c.id) ? "is-selected" : ""}`}
                  style={{ marginBottom: 6, cursor: "pointer" }}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div className="lore-node-title">
                    <strong>{c.name || "Untitled"}</strong>
                  </div>
                </div>
              ))}
              {!characters?.length && <div className="lore-empty">No characters yet.</div>}
            </div>
          )}
        </div>

        <div className="characters-editor">
          {!selected ? (
            <div className="lore-empty">Select or add a character.</div>
          ) : (
            <>
              <div className="lore-savebar">
                <div className="lore-savebadge" data-state={savingName ? "saving" : "idle"}>
                  {savingName ? "Saving…" : " "}
                </div>
                <div className="lore-savebar-actions">
                  <button type="button" onClick={handleSaveCharacter} disabled={savingName}>
                    Save
                  </button>
                  <button
                    type="button"
                    className="lore-danger"
                    onClick={handleDeleteCharacter}
                    disabled={savingName}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="lore-editor-row">
                <label className="lore-label">Name</label>
                <input
                  className="lore-input"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Character name"
                />
              </div>

              <div className="lore-editor-row" style={{ marginBottom: 8 }}>
                <div className="lore-features-header">
                  <label className="lore-label" style={{ margin: 0 }}>
                    Attributes
                  </label>
                  <button
                    type="button"
                    className="lore-features-toggle"
                    onClick={handleAddAttr}
                  >
                    +
                  </button>
                </div>
                <div className="lore-features-panel">
                  {attrsLoading ? (
                    <div style={{ padding: "0.25rem 0", opacity: 0.8 }}>Loading attributes…</div>
                  ) : attrsError ? (
                    <div className="lore-error" style={{ marginBottom: 6 }}>
                      {attrsError}
                    </div>
                  ) : (
                    <>
                      {(attrs || []).map((a) => (
                        <div
                          key={a.id}
                          className={`attr-row ${
                            expandedAttrIds.has(String(a.id)) ? "is-expanded" : "is-collapsed"
                          }`}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr auto",
                              gap: 8,
                              alignItems: "center",
                              marginBottom: expandedAttrIds.has(String(a.id)) ? 8 : 0
                            }}
                          >
                            <div className="attr-key">
                              <label className="lore-label">Key</label>
                              <input
                                className="lore-input"
                                value={a.attr_key || ""}
                                onChange={(e) => updateAttrLocal(a.id, "attr_key", e.target.value)}
                                placeholder="Key"
                              />
                            </div>
                            <div className="attr-value">
                              <label className="lore-label">Value</label>
                              <input
                                className="lore-input"
                                value={a.attr_value || ""}
                                onChange={(e) => updateAttrLocal(a.id, "attr_value", e.target.value)}
                                placeholder="Value"
                              />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                className="lore-features-toggle"
                                onClick={() =>
                                  setExpandedAttrIds((prev) => {
                                    const next = new Set(prev);
                                    const key = String(a.id);
                                    if (next.has(key)) next.delete(key);
                                    else next.add(key);
                                    return next;
                                  })
                                }
                              >
                                {expandedAttrIds.has(String(a.id)) ? "–" : "+"}
                              </button>
                            </div>
                          </div>
                          {expandedAttrIds.has(String(a.id)) && (
                            <div className="lore-feature-actions">
                              <button
                                type="button"
                                onClick={() => handleSaveAttr(a)}
                                disabled={attrSavingId === a.id}
                              >
                                {attrSavingId === a.id ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                className="lore-danger"
                                onClick={() => handleDeleteAttr(a.id)}
                                disabled={attrSavingId === a.id}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      {!attrs?.length && <div className="lore-empty">No attributes yet.</div>}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
