import { Router, Request, Response } from "express";
import { pool } from "../db/client";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user!.id]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: "Server error." });
  }
});

router.patch("/:id/read", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET read = true
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Notification not found." });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: "Server error." });
  }
});

router.patch("/read-all", async (req: Request, res: Response) => {
  try {
    await pool.query("UPDATE notifications SET read = true WHERE user_id = $1", [req.user!.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error." });
  }
});

export default router;
