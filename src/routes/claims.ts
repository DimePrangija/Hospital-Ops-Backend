import { Router, Request, Response } from "express";
import { pool } from "../db/client";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { notifyUser } from "../services/websocket";

const router = Router();
router.use(authenticate);

router.get("/", async (req: Request, res: Response) => {
  const { status } = req.query;
  const { role, id: userId } = req.user!;

  try {
    let query: string;
    const params: (string | undefined)[] = [];

    if (role === "billing" || role === "admin") {
      query = `
        SELECT c.*, p.name as patient_name, p.medical_record_number,
               u.name as submitted_by_name
        FROM claims c
        JOIN patients p ON c.patient_id = p.id
        LEFT JOIN users u ON c.submitted_by = u.id
        ${status ? "WHERE c.status = $1" : ""}
        ORDER BY c.created_at DESC
      `;
      if (status) params.push(status as string);
    } else {
      query = `
        SELECT c.*, p.name as patient_name, p.medical_record_number,
               u.name as submitted_by_name
        FROM claims c
        JOIN patients p ON c.patient_id = p.id
        LEFT JOIN users u ON c.submitted_by = u.id
        WHERE p.created_by = $1
        ${status ? "AND c.status = $2" : ""}
        ORDER BY c.created_at DESC
      `;
      params.push(userId);
      if (status) params.push(status as string);
    }

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error." });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT c.*, p.name as patient_name, u.name as submitted_by_name
       FROM claims c
       JOIN patients p ON c.patient_id = p.id
       LEFT JOIN users u ON c.submitted_by = u.id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Claim not found." });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: "Server error." });
  }
});

router.post(
  "/",
  requireRole("admin", "billing"),
  async (req: Request, res: Response) => {
    const { patient_id, diagnosis_code, description, amount } = req.body;

    if (!patient_id || !diagnosis_code || !amount) {
      return res.status(400).json({
        error: "patient_id, diagnosis_code, and amount are required.",
      });
    }

    try {
      const patient = await pool.query(
        "SELECT id FROM patients WHERE id = $1",
        [patient_id]
      );
      if (patient.rows.length === 0) {
        return res.status(404).json({ error: "Patient not found." });
      }

      const result = await pool.query(
        `INSERT INTO claims
           (patient_id, submitted_by, diagnosis_code, description, amount)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [patient_id, req.user!.id, diagnosis_code, description, amount]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: "Server error." });
    }
  }
);

async function updateClaimStatus(
  req: Request,
  res: Response,
  newStatus: string
) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE claims SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Claim not found." });
    }

    const claim = result.rows[0];

    if (claim.submitted_by) {
      const notifResult = await pool.query(
        `INSERT INTO notifications (user_id, message, type, metadata)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          claim.submitted_by,
          `Claim for $${claim.amount} has been ${newStatus}.`,
          newStatus === "approved" ? "success"
            : newStatus === "denied" ? "error" : "info",
          JSON.stringify({ claim_id: claim.id, status: newStatus }),
        ]
      );

      notifyUser(claim.submitted_by, notifResult.rows[0]);
    }

    return res.json(claim);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error." });
  }
}

router.patch("/:id/approve", requireRole("admin", "billing"), (req, res) =>
  updateClaimStatus(req, res, "approved")
);

router.patch("/:id/deny", requireRole("admin", "billing"), (req, res) =>
  updateClaimStatus(req, res, "denied")
);

router.patch(
  "/:id/appeal",
  requireRole("admin", "billing", "doctor"),
  (req, res) => updateClaimStatus(req, res, "appealing")
);

export default router;
