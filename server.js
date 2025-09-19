import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Configuración inicial
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configura Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('✅ Backend de UrbanTrack funcionando correctamente');
});

// 🔥 ENDPOINTS DE USUARIOS
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
// Registrar administrador
app.post('/users/admin', async (req, res) => {
  try {
    console.log('📨 Recibiendo solicitud para registrar admin:', req.body);
    
    const { usuario, contraseña } = req.body;

    if (!usuario || !contraseña) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // Verificar si el usuario ya existe
    const { data: existingUser, error: checkError } = await supabase
      .from('administrador')
      .select('*')
      .eq('usuario', usuario)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    // Insertar nuevo administrador
    const { data, error } = await supabase
      .from('administrador')
      .insert([{ usuario, contraseña }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Administrador registrado:', data);
    res.status(201).json({ 
      message: 'Administrador registrado exitosamente', 
      id: data.idadmin 
    });

  } catch (err) {
    console.error('❌ Error general:', err);
    res.status(500).json({ error: err.message });
  }
});

// Registrar cliente
app.post('/users/cliente', async (req, res) => {
  try {
    console.log('📨 Recibiendo solicitud para registrar cliente:', req.body);
    
    const { nombre, apellido, usuario, contraseña, rol, proyectoId } = req.body;

    if (!nombre || !apellido || !usuario || !contraseña) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Verificar si el usuario ya existe
    const { data: existingUser, error: checkError } = await supabase
      .from('cliente')
      .select('*')
      .eq('usuario', usuario)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    // 1. Insertar nuevo cliente
    const { data: clienteData, error: clienteError } = await supabase
      .from('cliente')
      .insert([{ 
        nombre, 
        apellido, 
        usuario, 
        contraseña, 
        rol: rol || 'cliente' 
      }])
      .select()
      .single();

    if (clienteError) {
      console.error('❌ Error al insertar cliente:', clienteError);
      return res.status(500).json({ error: clienteError.message });
    }

    // 2. Asignar proyecto al cliente si se proporcionó proyectoId
    if (proyectoId) {
      const { error: proyectoError } = await supabase
        .from('proyecto_cliente')
        .insert([{ 
          idproyecto: proyectoId, 
          idcliente: clienteData.idcliente 
        }]);

      if (proyectoError) {
        console.error('⚠️ Error al asignar proyecto:', proyectoError);
        // No hacemos return aquí para que al menos se cree el cliente
      }
    }

    console.log('✅ Cliente registrado:', clienteData);
    res.status(201).json({ 
      message: 'Cliente registrado exitosamente', 
      id: clienteData.idcliente 
    });

  } catch (err) {
    console.error('❌ Error general:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener proyectos (para testing)
app.get('/proyectos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('proyecto')
      .select('*');

    if (error) {
      console.error('Error Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    const proyectos = data.map(e => ({
      id: e.idproyecto,
      nombre: e.nombre,
    }));

    res.json(proyectos);

  } catch (err) {
    console.error('Error general:', err);
    res.status(500).json({ error: err.message });
  }
});

//Para crear proyectos
app.post('/proyectos', async (req, res) => {
  try {
    console.log('📨 Recibiendo solicitud para crear proyecto:', req.body);
    
    const { nombre} = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del proyecto es requerido' });
    }

    // Verificar si el proyecto ya existe
    const { data: existingProyecto, error: checkError } = await supabase
      .from('proyecto')
      .select('*')
      .ilike('nombre', nombre) //  Usamos ilike para case-insensitive
      .single();

    if (existingProyecto) {
      return res.status(400).json({ error: 'El proyecto ya existe' });
    }

    // Insertar nuevo proyecto
    const { data, error } = await supabase
      .from('proyecto')
      .insert([{ 
        nombre 
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Proyecto registrado:', data);
    res.status(201).json({ 
      message: 'Proyecto registrado exitosamente', 
      id: data.idproyecto 
    });

  } catch (err) {
    console.error('❌ Error general:', err);
    res.status(500).json({ error: err.message });
  }
});

//PARA EL LOGIN
app.post('/auth/login', async (req, res) => {
  try {
    console.log('📨 Recibiendo solicitud de login:', req.body);
    
    const { usuario, contraseña } = req.body;

    if (!usuario || !contraseña) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // 1. Buscar en administradores
    const { data: admin, error: adminError } = await supabase
      .from('administrador')
      .select('idadmin, usuario')
      .eq('usuario', usuario)
      .eq('contraseña', contraseña)
      .single();

    if (admin) {
      console.log('✅ Login exitoso como administrador');
      return res.json({ 
        success: true,
        message: 'Login exitoso',
        user: {
          id: admin.idadmin,
          usuario: admin.usuario,
          tipo: 'administrador'
        }
      });
    }

    // 2. Buscar en clientes
    const { data: cliente, error: clienteError } = await supabase
      .from('cliente')
      .select('idcliente, nombre, apellido, usuario, rol')
      .eq('usuario', usuario)
      .eq('contraseña', contraseña)
      .single();

    if (cliente) {
      console.log('✅ Login exitoso como cliente');
      return res.json({ 
        success: true,
        message: 'Login exitoso',
        user: {
          id: cliente.idcliente,
          usuario: cliente.usuario,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          rol: cliente.rol,
          tipo: 'cliente'
        }
      });
    }

    // 3. Si no encuentra en ninguna tabla
    console.log('❌ Credenciales inválidas');
    res.status(401).json({ 
      success: false,
      error: 'Credenciales inválidas' 
    });

  } catch (err) {
    console.error('❌ Error general en login:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ENDPOINT PARA OBTENER TODAS LAS ENCUESTAS (ADMIN)
app.get('/encuestas/all', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('encuesta')
      .select(`
        idencuesta,
        proyecto:proyecto_idproyecto(nombre),
        titulo,
        fecha
      `);
    if (error) {
      console.error('Error Supabase: ', error);
      return res.status(500).json({ error: error.message || error });
    }

    const encuestas = data.map(e => ({
      id: e.idencuesta,
      proyecto: e.proyecto?.nombre || null,
      titulo: e.titulo,
      fecha: e.fecha
    }));

    res.json(encuestas);
  } catch (error) {
    console.error('Error general: ', error);
    res.status(500).json({ error: error.message || error});
  }
});

app.get('/encuestas/:idencuesta/preguntas', async (req, res) => {
  try {
    const { idencuesta } = req.params;

    const { data, error } = await supabase
    .from('pregunta')
    .select(`
      idpregunta,
      encuesta:encuesta_idencuesta(titulo),
      pregunta,
      tipo  
    `)
    .eq('encuesta_idencuesta', idencuesta);

    if (error) {
      console.error('Error Supabase: ', error);
      return res.statusCode(500).json({ error: error.message || error});
    }
    if (data.length === 0) {
      return res.statusCode(404).json({message: 'No se encontraron preguntas para esta encuestas'});
    }

    const preguntas = data.map((e) => ({
      id: e.idpregunta,
      encuesta: e.encuesta?.titulo,
      pregunta: e.pregunta,
      tipo: e.tipo
    }));

    res.json(preguntas);
  } catch (error) {
    console.error('Error general: ', error);
    return res.statusCode(500).json({error: error.message || error });
  }
});

app.get('/encuestas/:idencuesta/resultados', async (req, res) => {
  try {
    const { idencuesta } = req.params;
    const { data: preguntasMultiples, error: preguntasMultiplesError } = await supabase
      .from('pregunta')
      .select('idpregunta, pregunta, tipo, opcion(idopcion, opcion)')
      .eq('encuesta_idencuesta', idencuesta)
      .eq('tipo', 'opcion_multiple');

    if (preguntasMultiplesError) throw preguntasMultiplesError;

    const preguntasOpcionMultiple = await Promise.all(
      preguntasMultiples.map(async (pregunta) => {
        const conteoOpciones = await Promise.all(
          pregunta.opcion.map(async (opcion) => {
            const { count, error } = await supabase
              .from('respuestas')
              .select('*', { count: 'exact', head: true })
              .eq('idopcion', opcion.idopcion);
            if (error) return { opcion: opcion.opcion, conteo: 0 };
            return { opcion: opcion.opcion, conteo: count };
          })
        );
        const totalPregunta = conteoOpciones.reduce((sum, item) => sum + item.conteo, 0);
        const porcentajesOpciones = conteoOpciones.map(op => ({
          ...op,
          porcentaje: totalPregunta > 0 ? (op.conteo / totalPregunta) * 100 : 0
        }));
        return {
          idpregunta: pregunta.idpregunta,
          pregunta: pregunta.pregunta,
          tipo: pregunta.tipo,
          total_respuestas: totalPregunta,
          opciones: porcentajesOpciones
        };
      })
    );

    const { data: preguntasAbiertasRaw, error: preguntasAbiertasError } = await supabase
      .from('pregunta')
      .select('idpregunta, pregunta, tipo')
      .eq('encuesta_idencuesta', idencuesta)
      .eq('tipo', 'abierta');

    if (preguntasAbiertasError) throw preguntasAbiertasError;

    const preguntasAbiertas = await Promise.all(
      preguntasAbiertasRaw.map(async (pregunta) => {
        const { data: respuestas, error: respuestasError } = await supabase
          .from('respuestas')
          .select('contenido_texto')
          .eq('pregunta_idpregunta', pregunta.idpregunta)
          .not('contenido_texto', 'is', null);

        if (respuestasError) return { ...pregunta, respuestas: [] };

        return {
          idpregunta: pregunta.idpregunta,
          pregunta: pregunta.pregunta,
          respuestas: respuestas.map(r => r.contenido_texto),
        };
      })
    );

    const totalRespuestasEncuesta = preguntasOpcionMultiple.reduce((sum, p) => sum + p.total_respuestas, 0);

    res.json({
      totalRespuestas: totalRespuestasEncuesta,
      preguntasOpcionMultiple: preguntasOpcionMultiple,
      preguntasAbiertas: preguntasAbiertas,
    });

  } catch (error) {
    console.error('Error obteniendo los resultados: ', error);
    res.status(500).json({ error: error.message || 'Ocurrió un error interno' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`✅ Endpoints disponibles:`);
  console.log(`   POST /users/admin`);
  console.log(`   POST /users/cliente`);
  console.log(`   POST /proyectos`); 
  console.log(`   GET  /proyectos`);
  console.log(`   GET  /`);
});