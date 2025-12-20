// server/src/routes/adminLoreRoutes.js
import express from "express";
import { db } from "../db.js";

const router = express.Router();

// --------------------------------------------------
// ADMIN AUTH GUARD (same rule as other admin routes)
// --------------------------------------------------
function requireAdmin(req, res, next) {
  if (req.cookies.admin_auth === "yes") return next();
  return res.status(401).json({ error: "Not authenticated as admin" });
}

// ==================================================
// GET FULL LORE TREE
// ==================================================
// GET /api/admin/lore
router.get("/", requireAdmin, (req, res) => {
  db.all(
    `
      SELECT
        id,
        parent_id,
        title,
        content AS body,
        position AS sort_order,
        created_at,
        updated_at
      FROM lore_nodes
      ORDER BY
        (parent_id IS NOT NULL) ASC,
        parent_id ASC,
        position ASC,
        id ASC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error("[LORE] Load tree failed:", err);
        return res.status(500).json({ error: "DB error loading lore" });
      }
      res.json({ nodes: rows || [] });
    }
  );
});

// ==================================================
// CREATE LORE NODE
// ==================================================
// POST /api/admin/lore
router.post("/", requireAdmin, (req, res) => {
  const { parent_id = null, title = "", body = "", sort_order = 0 } =
    req.body || {};

  if (typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "title is required" });
  }

  const parentIdValue =
    parent_id === null || parent_id === undefined || parent_id === ""
      ? null
      : Number(parent_id);

  const sortOrderValue =
    typeof sort_order === "number" ? sort_order : Number(sort_order) || 0;

  db.run(
    `
      INSERT INTO lore_nodes (parent_id, title, content, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [parentIdValue, title, typeof body === "string" ? body : "", sortOrderValue],
    function (err) {
      if (err) {
        console.error("[LORE] Create failed:", err);
        return res.status(500).json({ error: "DB error creating lore node" });
      }
      res.json({ ok: true, id: this.lastID });
    }
  );
});

// ==================================================
// UPDATE LORE NODE
// ==================================================
// PATCH /api/admin/lore/:id
router.patch("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, body, sort_order } = req.body || {};

  const fields = [];
  const params = [];

  if (typeof title === "string") {
    fields.push("title = ?");
    params.push(title);
  }
  if (typeof body === "string") {
    fields.push("content = ?");
    params.push(body);
  }
  if (typeof sort_order === "number" || typeof sort_order === "string") {
    fields.push("position = ?");
    params.push(typeof sort_order === "number" ? sort_order : Number(sort_order) || 0);
  }

  // ✅ Improvement: only update parent_id if it was explicitly sent
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, "parent_id")) {
    const parent_id = req.body.parent_id;
    fields.push("parent_id = ?");
    params.push(parent_id === null || parent_id === "" ? null : Number(parent_id));
  }

  if (!fields.length) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const sql = `
    UPDATE lore_nodes
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  params.push(Number(id));

  db.run(sql, params, function (err) {
    if (err) {
      console.error("[LORE] Update failed:", err);
      return res.status(500).json({ error: "DB error updating lore node" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Lore node not found" });
    }
    res.json({ ok: true });
  });
});

// ==================================================
// LORE FEATURES (per-node key/values)
// ==================================================
// GET /api/admin/lore/:nodeId/features
router.get("/:nodeId/features", requireAdmin, (req, res) => {
  const nodeId = Number(req.params.nodeId);
  if (Number.isNaN(nodeId)) {
    return res.status(400).json({ error: "Invalid node id" });
  }

  db.get(`SELECT id FROM lore_nodes WHERE id = ?`, [nodeId], (err, row) => {
    if (err) {
      console.error("[LORE] Feature list lookup failed:", err);
      return res.status(500).json({ error: "DB error checking lore node" });
    }
    if (!row) {
      return res.status(404).json({ error: "Lore node not found" });
    }

    db.all(
      `
        SELECT id, node_id, title, value, sort_order, created_at, updated_at
        FROM lore_features
        WHERE node_id = ?
        ORDER BY sort_order ASC, id ASC
      `,
      [nodeId],
      (err2, rows) => {
        if (err2) {
          console.error("[LORE] Feature list failed:", err2);
          return res.status(500).json({ error: "DB error loading features" });
        }
        res.json({ features: rows || [] });
      }
    );
  });
});

// POST /api/admin/lore/:nodeId/features
router.post("/:nodeId/features", requireAdmin, (req, res) => {
  const nodeId = Number(req.params.nodeId);
  if (Number.isNaN(nodeId)) {
    return res.status(400).json({ error: "Invalid node id" });
  }

  const { title, value = "", sort_order = 0 } = req.body || {};
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }

  db.get(`SELECT id FROM lore_nodes WHERE id = ?`, [nodeId], (err, row) => {
    if (err) {
      console.error("[LORE] Feature create lookup failed:", err);
      return res.status(500).json({ error: "DB error checking lore node" });
    }
    if (!row) {
      return res.status(404).json({ error: "Lore node not found" });
    }

    const sortOrderValue =
      typeof sort_order === "number" ? sort_order : Number(sort_order) || 0;

    db.run(
      `
        INSERT INTO lore_features (node_id, title, value, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [nodeId, title, typeof value === "string" ? value : String(value ?? ""), sortOrderValue],
      function (insertErr) {
        if (insertErr) {
          console.error("[LORE] Feature create failed:", insertErr);
          return res.status(500).json({ error: "DB error creating feature" });
        }
        res.json({ ok: true, id: this.lastID });
      }
    );
  });
});

// PATCH /api/admin/lore/features/:id
router.patch("/features/:id", requireAdmin, (req, res) => {
  const featureId = Number(req.params.id);
  if (Number.isNaN(featureId)) {
    return res.status(400).json({ error: "Invalid feature id" });
  }

  const { title, value, sort_order } = req.body || {};
  const fields = [];
  const params = [];

  if (typeof title === "string") {
    fields.push("title = ?");
    params.push(title);
  }
  if (typeof value === "string") {
    fields.push("value = ?");
    params.push(value);
  }
  if (typeof sort_order === "number" || typeof sort_order === "string") {
    fields.push("sort_order = ?");
    params.push(typeof sort_order === "number" ? sort_order : Number(sort_order) || 0);
  }

  if (!fields.length) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const sql = `
    UPDATE lore_features
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  params.push(featureId);

  db.run(sql, params, function (err) {
    if (err) {
      console.error("[LORE] Feature update failed:", err);
      return res.status(500).json({ error: "DB error updating feature" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Lore feature not found" });
    }
    res.json({ ok: true });
  });
});

// DELETE /api/admin/lore/features/:id
router.delete("/features/:id", requireAdmin, (req, res) => {
  const featureId = Number(req.params.id);
  if (Number.isNaN(featureId)) {
    return res.status(400).json({ error: "Invalid feature id" });
  }

  db.run(`DELETE FROM lore_features WHERE id = ?`, [featureId], function (err) {
    if (err) {
      console.error("[LORE] Feature delete failed:", err);
      return res.status(500).json({ error: "DB error deleting feature" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Lore feature not found" });
    }
    res.json({ ok: true });
  });
});

// ==================================================
// DELETE LORE NODE (CASCADE CHILDREN)
// ==================================================
// DELETE /api/admin/lore/:id
router.delete("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM lore_nodes WHERE id = ?`, [Number(id)], function (err) {
    if (err) {
      console.error("[LORE] Delete failed:", err);
      return res.status(500).json({ error: "DB error deleting lore node" });
    }
    res.json({ ok: true });
  });
});

export { router as adminLoreRouter };
