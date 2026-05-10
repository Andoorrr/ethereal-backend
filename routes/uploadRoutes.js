// backend/routes/uploadRoutes.js
import { Router } from 'express';
import { upload } from '../config/cloudinary.js';
import { proteger } from '../middleware/auth.js';

const router = Router();

// POST /api/upload — sube 1 imagen, devuelve la URL de Cloudinary
router.post('/', proteger, upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, mensaje: 'No se recibió ninguna imagen.' });
  res.json({ ok: true, url: req.file.path });
});

export default router;