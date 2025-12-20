// server/src/routes/adminCharacterRoutes.js
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
// CHARACTERS CRUD
// ==================================================
// GET /api/admin/characters
router.get("/", requireAdmin, (_req, res) => {
  db.all(
    `SELECT id, name FROM characters ORDER BY id ASC`,
    [],
    (err, rows) => {
      if (err) {
        console.error("[CHAR] list failed:", err);
        return res.status(500).json({ error: "DB error loading characters" });
      }
      res.json({ characters: rows || [] });
    }
  );
});

// POST /api/admin/characters
router.post("/", requireAdmin, (req, res) => {
  const { name = "" } = req.body || {};
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  db.run(
    `
      INSERT INTO characters (name, created_at, updated_at)
      VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [name],
    function (err) {
      if (err) {
        console.error("[CHAR] create failed:", err);
        return res.status(500).json({ error: "DB error creating character" });
      }
      res.json({ ok: true, id: this.lastID });
    }
  );
});

// PATCH /api/admin/characters/:id
router.patch("/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid character id" });

  const { name } = req.body || {};
  if (typeof name !== "string") {
    return res.status(400).json({ error: "No fields to update" });
  }

  db.run(
    `
      UPDATE characters
      SET name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [name, id],
    function (err) {
      if (err) {
        console.error("[CHAR] update failed:", err);
        return res.status(500).json({ error: "DB error updating character" });
      }
      if (this.changes === 0) return res.status(404).json({ error: "Character not found" });
      res.json({ ok: true });
    }
  );
});

// DELETE /api/admin/characters/:id
router.delete("/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid character id" });

  db.run(`DELETE FROM characters WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error("[CHAR] delete failed:", err);
      return res.status(500).json({ error: "DB error deleting character" });
    }
    if (this.changes === 0) return res.status(404).json({ error: "Character not found" });
    res.json({ ok: true });
  });
});

// ==================================================
// CHARACTER ATTRIBUTES
// ==================================================
// GET /api/admin/characters/:id/attributes
router.get("/:id/attributes", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid character id" });

  db.get(`SELECT id FROM characters WHERE id = ?`, [id], (err, row) => {
    if (err) {
      console.error("[CHAR ATTR] check failed:", err);
      return res.status(500).json({ error: "DB error checking character" });
    }
    if (!row) return res.status(404).json({ error: "Character not found" });

    db.all(
      `
        SELECT id, character_id, attr_key, attr_value, sort_order, created_at, updated_at
        FROM character_attributes
        WHERE character_id = ?
        ORDER BY sort_order ASC, id ASC
      `,
      [id],
      (err2, rows) => {
        if (err2) {
          console.error("[CHAR ATTR] list failed:", err2);
          return res.status(500).json({ error: "DB error loading attributes" });
        }
        res.json({ attributes: rows || [] });
      }
    );
  });
});

// POST /api/admin/characters/:id/attributes
router.post("/:id/attributes", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid character id" });

  const { attr_key = "", attr_value = "", sort_order = 0 } = req.body || {};
  if (typeof attr_key !== "string" || !attr_key.trim()) {
    return res.status(400).json({ error: "attr_key is required" });
  }

  db.get(`SELECT id FROM characters WHERE id = ?`, [id], (err, row) => {
    if (err) {
      console.error("[CHAR ATTR] create check failed:", err);
      return res.status(500).json({ error: "DB error checking character" });
    }
    if (!row) return res.status(404).json({ error: "Character not found" });

    const sortOrderValue =
      typeof sort_order === "number" ? sort_order : Number(sort_order) || 0;

    db.run(
      `
        INSERT INTO character_attributes (character_id, attr_key, attr_value, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [id, attr_key, typeof attr_value === "string" ? attr_value : String(attr_value ?? ""), sortOrderValue],
      function (err2) {
        if (err2) {
          console.error("[CHAR ATTR] create failed:", err2);
          return res.status(500).json({ error: "DB error creating attribute" });
        }
        res.json({ ok: true, id: this.lastID });
      }
    );
  });
});

// PATCH /api/admin/characters/attribute/:attrId
router.patch("/attribute/:attrId", requireAdmin, (req, res) => {
  const attrId = Number(req.params.attrId);
  if (Number.isNaN(attrId)) {
    return res.status(400).json({ error: "Invalid attribute id" });
  }

  const { attr_key, attr_value, sort_order } = req.body || {};
  const fields = [];
  const params = [];

  if (typeof attr_key === "string") {
    fields.push("attr_key = ?");
    params.push(attr_key);
  }
  if (typeof attr_value === "string") {
    fields.push("attr_value = ?");
    params.push(attr_value);
  }
  if (typeof sort_order === "number" || typeof sort_order === "string") {
    fields.push("sort_order = ?");
    params.push(typeof sort_order === "number" ? sort_order : Number(sort_order) || 0);
  }

  if (!fields.length) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const sql = `
    UPDATE character_attributes
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  params.push(attrId);

  db.run(sql, params, function (err) {
    if (err) {
      console.error("[CHAR ATTR] update failed:", err);
      return res.status(500).json({ error: "DB error updating attribute" });
    }
    if (this.changes === 0) return res.status(404).json({ error: "Attribute not found" });
    res.json({ ok: true });
  });
});

// DELETE /api/admin/characters/attribute/:attrId
router.delete("/attribute/:attrId", requireAdmin, (req, res) => {
  const attrId = Number(req.params.attrId);
  if (Number.isNaN(attrId)) {
    return res.status(400).json({ error: "Invalid attribute id" });
  }

  db.run(`DELETE FROM character_attributes WHERE id = ?`, [attrId], function (err) {
    if (err) {
      console.error("[CHAR ATTR] delete failed:", err);
      return res.status(500).json({ error: "DB error deleting attribute" });
    }
    if (this.changes === 0) return res.status(404).json({ error: "Attribute not found" });
    res.json({ ok: true });
  });
});

export { router as adminCharacterRouter };
