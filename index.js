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

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
