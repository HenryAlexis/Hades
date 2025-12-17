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
      SELECT id, parent_id, title, body, sort_order, created_at, updated_at
      FROM lore_nodes
      ORDER BY
        (parent_id IS NOT NULL) ASC,
        parent_id ASC,
        sort_order ASC,
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
      INSERT INTO lore_nodes (parent_id, title, body, sort_order, created_at, updated_at)
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
    fields.push("body = ?");
    params.push(body);
  }
  if (typeof sort_order === "number" || typeof sort_order === "string") {
    fields.push("sort_order = ?");
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