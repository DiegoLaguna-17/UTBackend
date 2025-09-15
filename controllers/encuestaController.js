import { supabase } from '../utils/supabaseClient.js';

export const getEncuestas = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Encuesta')
      .select(`
        idencuesta,
        titulo,
        fecha,
        Proyecto:Proyecto_IDproyecto(nombre)
      `)
      .order('fecha', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
