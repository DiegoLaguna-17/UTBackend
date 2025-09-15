import express from 'express';
import { getProyectos } from '../controllers/proyectoController.js';

const router = express.Router();

router.get('/', getProyectos);

export default router;
