import { Router, Request, Response } from "express";
import { pool } from "../db/client";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requireRole("admin", "doctor", "billing"),
  async (req: Request, res: Response) => {
    const { search } = req.query;
    try {
      let query = `
        SELECT p.*, u.name as created_by_name
        FROM patients p
        LEFT JOIN users u ON p.created_by = u.id
        ORDER BY p.created_at DESC
      `;
      const params: string[] = [];

      if (search && typeof search === "string") {
        query = `
          SELECT p.*, u.name as created_by_name
          FROM patients p
          LEFT JOIN users u ON p.created_by = u.id
          WHERE p.name ILIKE $1 OR p.medical_record_number ILIKE $1
          ORDER BY p.created_at DESC
        `;
        params.push(`%${search}%`);
      }

      const result = await pool.query(query, params);
      return res.json(result.rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error." });
    }
  }
);

router.get(
  "/:id",
  requireRole("admin", "doctor", "billing"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const patientResult = await pool.query(
        `SELECT p.*, u.name as created_by_name
         FROM patients p
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.id = $1`,
        [id]
      );

      if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: "Patient not found." });
      }

      const claimsResult = await pool.query(
        "SELECT * FROM claims WHERE patient_id = $1 ORDER BY created_at DESC",
        [id]
      );

      const docsResult = await pool.query(
        "SELECT * FROM documents WHERE patient_id = $1 ORDER BY created_at DESC",
        [id]
      );

      return res.json({
        ...patientResult.rows[0],
        claims: claimsResult.rows,
        documents: docsResult.rows,
      });
    } catch (err) {
      return res.status(500).json({ error: "Server error." });
    }
  }
);

router.post(
  "/",
  requireRole("admin", "doctor"),
  async (req: Request, res: Response) => {
    const {
      name,
      date_of_birth,
      email,
      phone,
      address,
      insurance_provider,
      insurance_id,
      medical_record_number,
    } = req.body;

    if (!name || !date_of_birth || !medical_record_number) {
      return res.status(400).json({
        error: "name, date_of_birth, and medical_record_number are required.",
      });
    }

    try {
      const result = await pool.query(
        `INSERT INTO patients
           (name, date_of_birth, email, phone, address,
            insurance_provider, insurance_id, medical_record_number, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [
          name,
          date_of_birth,
          email,
          phone,
          address,
          insurance_provider,
          insurance_id,
          medical_record_number,
          req.user!.id,
        ]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(409).json({ error: "Medical record number already exists." });
      }
      return res.status(500).json({ error: "Server error." });
    }
  }
);

router.patch(
  "/:id",
  requireRole("admin"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const fields = req.body;
    const allowed = [
      "name",
      "date_of_birth",
      "email",
      "phone",
      "address",
      "insurance_provider",
      "insurance_id",
    ];

    const updates = Object.keys(fields).filter((k) => allowed.includes(k));
    if (updates.length === 0) {
      return res.status(400).json({ error: "No valid fields to update." });
    }

    const setClauses = updates.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = updates.map((k) => fields[k]);
    values.push(id);

    try {
      const result = await pool.query(
        `UPDATE patients SET ${setClauses}, updated_at = NOW()
         WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Patient not found." });
      }
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: "Server error." });
    }
  }
);

router.delete(
  "/:id",
  requireRole("admin"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        "DELETE FROM patients WHERE id = $1 RETURNING id",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Patient not found." });
      }
      return res.json({ deleted: id });
    } catch (err) {
      return res.status(500).json({ error: "Server error." });
    }
  }
);

export default router;
