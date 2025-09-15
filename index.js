import 'dotenv/config'; // reemplaza require('dotenv').config()
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Backend funcionando');
});
// index.js (o tu archivo principal)
app.get('/encuestas', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('encuesta')
      .select(`
        *,
        proyecto(nombre)
      `); // Asegúrate de traer el proyecto si lo vas a usar

    if (error) {
      console.error('Error Supabase:', error);
      return res.status(500).json({ error: error.message || error });
    }

    const encuestas = data.map(e => ({
      id: e.idencuesta,
      titulo: e.titulo,
      fecha: e.fecha,
      proyecto: e.proyecto?.nombre || null, // Protección si proyecto es null
    }));

    res.json(encuestas);

  } catch (err) {
    console.error('Error general:', err);
    res.status(500).json({ error: err.message || err });
  }
});
app.get('/proyectos',async (req,res)=>{
    try{
        const{data,error}=await supabase
        .from('proyecto').select('*');
        if (error) {
            console.error('Error Supabase:', error);
            return res.status(500).json({ error: error.message || error });
        }
        const proyectos = data.map(e => ({
            id: e.idproyecto,
            nombre: e.nombre,
        }));

        res.json(proyectos);
    }catch (err) {
    console.error('Error general:', err);
    res.status(500).json({ error: err.message || err });
  }
    

});
app.post('/encuestas', async (req, res) => {
  try {
    const { titulo, proyectoId, administradorId, preguntas } = req.body;

    // 1️⃣ Insertar la encuesta
    const { data: encuestaData, error: encuestaError } = await supabase
      .from('encuesta')
      .insert([{
        titulo,
        proyecto_idproyecto: proyectoId,
        administrador_idadmin: administradorId,
        fecha: new Date().toISOString().split('T')[0]
      }])
      .select()
      .single();

    if (encuestaError) throw encuestaError;

    const encuestaId = encuestaData.idencuesta;

    // 2️⃣ Insertar preguntas
    for (const preg of preguntas) {
      const { data: preguntaData, error: preguntaError } = await supabase
        .from('pregunta')
        .insert([{
          encuesta_idencuesta: encuestaId,
          pregunta: preg.pregunta,   // <-- asegúrate que Flutter envíe 'pregunta'
          tipo: preg.tipo
        }])
        .select()
        .single();

      if (preguntaError) throw preguntaError;

      const preguntaId = preguntaData.idpregunta;

      // 3️⃣ Insertar opciones si existen (solo múltiple o escala)
      if (preg.opciones && preg.opciones.length > 0) {
        const opcionesArray = preg.opciones.map(op => ({
          pregunta_idpregunta: preguntaId,  // <-- corregido
          opcion: op
        }));

        const { error: opcionesError } = await supabase
          .from('opcion')
          .insert(opcionesArray);

        if (opcionesError) throw opcionesError;
      }
    }

    res.status(200).json({ message: 'Encuesta creada con éxito', encuestaId });
  } catch (error) {
    console.error('Error al crear encuesta:', error);
    res.status(500).json({ error: error.message || error });
  }
});


app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
