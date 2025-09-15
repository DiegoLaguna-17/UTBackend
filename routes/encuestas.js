import express from 'express';
import { crearEncuesta, getEncuestas } from '../controllers/encuestaController.js';

const router = express.Router();

router.post('/', crearEncuesta);
router.get('/', getEncuestas);

export default router;
