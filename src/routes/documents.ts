import { Router, Request, Response } from "express";
import multer from "multer";
import { pool } from "../db/client";
import { authenticate } from "../middleware/auth";
import { uploadToR2 } from "../services/r2";

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and images are allowed."));
    }
  },
});

router.get("/:patientId", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT d.*, u.name as uploaded_by_name
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE d.patient_id = $1
       ORDER BY d.created_at DESC`,
      [req.params.patientId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: "Server error." });
  }
});

router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const { patient_id, doc_type } = req.body;
    if (!patient_id) {
      return res.status(400).json({ error: "patient_id is required." });
    }

    try {
      const patient = await pool.query("SELECT id FROM patients WHERE id = $1", [patient_id]);
      if (patient.rows.length === 0) {
        return res.status(404).json({ error: "Patient not found." });
      }

      const { url } = await uploadToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      const result = await pool.query(
        `INSERT INTO documents
           (patient_id, uploaded_by, file_name, file_url, file_type, doc_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          patient_id,
          req.user!.id,
          req.file.originalname,
          url,
          req.file.mimetype,
          doc_type || "other",
        ]
      );

      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Upload failed." });
    }
  }
);

export default router;
