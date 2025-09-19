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

// Obtener encuestas de un cliente específico
app.get('/encuestas/cliente/:idCliente', async (req, res) => {
  try {
    const { idCliente } = req.params;
    console.log('cliente id: ' + idCliente);

    // Validar que el idCliente sea un número válido
    const clienteId = parseInt(idCliente);
    if (isNaN(clienteId)) {
      return res.status(400).json({ error: 'ID de cliente inválido' });
    }

    // Primero obtenemos los proyectos del cliente
    const { data: proyectosCliente, error: errorProyectos } = await supabase
      .from('proyecto_cliente')
      .select('idproyecto')
      .eq('idcliente', clienteId);

    if (errorProyectos) {
      console.error('Error proyectos cliente:', errorProyectos);
      return res.status(500).json({ error: errorProyectos.message });
    }

    // Si el cliente no tiene proyectos, retornar array vacío
    if (!proyectosCliente || proyectosCliente.length === 0) {
      return res.json([]);
    }

    const proyectoIds = proyectosCliente
      .map(p => parseInt(p.idproyecto))
      .filter(id => !isNaN(id));
    
    console.log('proyectos: ', proyectoIds);

    // Luego traemos las encuestas de esos proyectos
    const { data: encuestasData, error: errorEncuestas } = await supabase
      .from('encuesta')
      .select(`
        idencuesta,
        titulo,
        fecha,
        proyecto_idproyecto,
        proyecto:proyecto_idproyecto (nombre)
      `)
      .in('proyecto_idproyecto', proyectoIds);

    if (errorEncuestas) {
      console.error('Error encuestas:', errorEncuestas);
      return res.status(500).json({ error: errorEncuestas.message });
    }

    // Si no hay encuestas, retornar array vacío
    if (!encuestasData || encuestasData.length === 0) {
      return res.json([]);
    }

    const encuestasIds = encuestasData
      .map(e => parseInt(e.idencuesta))
      .filter(id => !isNaN(id));

    // Buscar respuestas del cliente específico para estas encuestas
    const { data: respuestasCliente, error: errorRespuestas } = await supabase
      .from('respuesta')
      .select('encuesta_idencuesta')
      .in('encuesta_idencuesta', encuestasIds)
      .eq('cliente_idcliente', clienteId);

    if (errorRespuestas) {
      console.error('Error respuestas:', errorRespuestas);
      return res.status(500).json({ error: errorRespuestas.message });
    }

    // Crear conjunto de encuestas que YA fueron respondidas por este cliente
    const encuestasRespondidas = new Set();
    if (respuestasCliente) {
      respuestasCliente.forEach(r => {
        encuestasRespondidas.add(parseInt(r.encuesta_idencuesta));
      });
    }

    // Filtrar encuestas que NO han sido respondidas por este cliente
    const encuestasNoRespondidas = encuestasData.filter(e => {
      return !encuestasRespondidas.has(parseInt(e.idencuesta));
    });

    // Mapear al formato final
    const encuestas = encuestasNoRespondidas.map(e => ({
      id: e.idencuesta,
      titulo: e.titulo,
      fecha: e.fecha,
      proyecto: e.proyecto ? e.proyecto.nombre : null,
    }));

    res.json(encuestas);

  } catch (err) {
    console.error('Error general:', err);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});
app.get('/encuestas/respuestas/:idEncuesta/:idCliente', async (req, res) => {
  try {
    const { idEncuesta, idCliente } = req.params;
    console.log('encuesta '+idEncuesta)
    console.log('cliente '+idCliente)
    // 1️⃣ Obtener la respuesta general del cliente para la encuesta
    const { data: respuestaData, error: errorRespuesta } = await supabase
  .from('respuesta')  // mayúscula R
  .select('idrespuesta')
  .eq('encuesta_idencuesta', parseInt(idEncuesta))
  .eq('cliente_idcliente', parseInt(idCliente))
  .single();

if (errorRespuesta) {
  console.error('Error al obtener la respuesta general:', errorRespuesta);
  return res.status(500).json({ error: errorRespuesta.message || errorRespuesta });
}

if (!respuestaData) {
  return res.status(404).json({ message: 'El cliente no ha respondido esta encuesta' });
}

console.log('id respuesta ' + respuestaData.idrespuesta);
const idRespuesta = respuestaData.idrespuesta;

    // 2️⃣ Obtener los detalles de cada respuesta
    const { data: detalles, error: errorDetalles } = await supabase
      .from('respuestas')
      .select(`
        pregunta_idpregunta,
        contenido_texto,
        idopcion,
        pregunta:pregunta(pregunta, tipo),
        opcion:opcion(opcion)
      `)
      .eq('respuesta_idrespuesta', idRespuesta);

    if (errorDetalles) {
      console.error('Error al obtener detalles de la respuesta:', errorDetalles);
      return res.status(500).json({ error: errorDetalles.message || errorDetalles });
    }

    // Devolver un formato más legible
    const resultado = detalles.map(d => ({
      idPregunta: d.Pregunta_IDPregunta,
      tipo: d.pregunta?.tipo,
      pregunta: d.pregunta?.pregunta,
      respuestaTexto: d.contenido_texto || null,
      opcionSeleccionada: d.opcion?.opcion || null
    }));
    console.log(resultado)
    res.json(resultado);



  } catch (err) {
    console.error('Error general:', err);
    res.status(500).json({ error: err.message || err });
  }
});
app.get('/encuestas/cliente/:idCliente/respondidas', async (req, res) => {
  try {
    const { idCliente } = req.params;
    console.log('cliente id: ' + idCliente);

    // Validar que el idCliente sea un número válido
    const clienteId = parseInt(idCliente);
    if (isNaN(clienteId)) {
      return res.status(400).json({ error: 'ID de cliente inválido' });
    }

    // Primero obtenemos los proyectos del cliente
    const { data: proyectosCliente, error: errorProyectos } = await supabase
      .from('proyecto_cliente')
      .select('idproyecto')
      .eq('idcliente', clienteId);

    if (errorProyectos) {
      console.error('Error proyectos cliente:', errorProyectos);
      return res.status(500).json({ error: errorProyectos.message });
    }

    // Si el cliente no tiene proyectos, retornar array vacío
    if (!proyectosCliente || proyectosCliente.length === 0) {
      return res.json([]);
    }

    const proyectoIds = proyectosCliente
      .map(p => parseInt(p.idproyecto))
      .filter(id => !isNaN(id));
    
    console.log('proyectos: ', proyectoIds);

    // Buscar respuestas del cliente específico
    const { data: respuestasCliente, error: errorRespuestas } = await supabase
      .from('respuesta')
      .select(`
        encuesta_idencuesta,
        encuesta:encuesta_idencuesta (
          idencuesta,
          titulo,
          fecha,
          proyecto_idproyecto,
          proyecto:proyecto_idproyecto (nombre)
        )
      `)
      .eq('cliente_idcliente', clienteId);

    if (errorRespuestas) {
      console.error('Error respuestas:', errorRespuestas);
      return res.status(500).json({ error: errorRespuestas.message });
    }

    // Si no hay respuestas, retornar array vacío
    if (!respuestasCliente || respuestasCliente.length === 0) {
      return res.json([]);
    }

    // Filtrar solo las encuestas que pertenecen a proyectos del cliente
    const encuestasRespondidas = respuestasCliente
      .filter(r => r.encuesta && proyectoIds.includes(parseInt(r.encuesta.proyecto_idproyecto)))
      .map(r => ({
        id: r.encuesta.idencuesta,
        titulo: r.encuesta.titulo,
        fecha: r.encuesta.fecha,
        proyecto: r.encuesta.proyecto ? r.encuesta.proyecto.nombre : null,
        fecha_respuesta: r.fecha_creacion // Opcional: incluir fecha de respuesta
      }));

    // Eliminar duplicados (por si hay múltiples respuestas a la misma encuesta)
    const encuestasUnicas = encuestasRespondidas.filter((encuesta, index, self) =>
      index === self.findIndex(e => e.id === encuesta.id)
    );

    res.json(encuestasUnicas);

  } catch (err) {
    console.error('Error general:', err);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

app.post('/encuesta/responder', async (req, res) => {
  try {
    const { idEncuesta, idCliente, respuestas } = req.body;
    // respuestas = [{ idPregunta: 3, contenido_texto: "hola" }, { idPregunta: 4, idOpcion: 5 }]

    // Insertamos en Respuesta
    const { data: respuestaData, error: errorRespuesta } = await supabase
      .from('respuesta')
      .insert([{
        encuesta_idencuesta: idEncuesta,
        cliente_idcliente: idCliente,
        fecha: new Date()
      }])
      .select()
      .single();

    if (errorRespuesta) {
      console.error(errorRespuesta);
      return res.status(500).json({ error: errorRespuesta.message });
    }

    const idRespuesta = respuestaData.idrespuesta;

    // Preparamos los detalles
    const detalles = respuestas.map(r => ({
      respuesta_idrespuesta: idRespuesta,
      pregunta_idpregunta: r.idPregunta,
      contenido_texto: r.contenido_texto || null,
      idopcion: r.idOpcion || null
    }));

    const { error: errorDetalles } = await supabase
      .from('respuestas')
      .insert(detalles);

    if (errorDetalles) {
      console.error(errorDetalles);
      return res.status(500).json({ error: errorDetalles.message });
    }

    res.json({ message: "Respuestas guardadas correctamente" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

app.get('/encuesta/preguntas/:idEncuesta', async (req, res) => {
  try {
    const { idEncuesta } = req.params;
    console.log('Encuesta id: ' + idEncuesta);

    // 1️⃣ Traer la encuesta
    const { data: encuesta, error: errorEncuesta } = await supabase
      .from('encuesta')
      .select('*')
      .eq('idencuesta', idEncuesta)
      .single(); // single() devuelve un objeto en lugar de array

    if (errorEncuesta || !encuesta) {
      console.error('Error al obtener la encuesta:', errorEncuesta);
      return res.status(404).json({ error: 'Encuesta no encontrada' });
    }

    // 2️⃣ Traer las preguntas
    const { data: preguntas, error: errorPreguntas } = await supabase
      .from('pregunta')
      .select('*')
      .eq('encuesta_idencuesta', idEncuesta);

    if (errorPreguntas) {
      console.error('Error al obtener preguntas:', errorPreguntas);
      return res.status(500).json({ error: errorPreguntas.message });
    }

    // 3️⃣ Traer opciones para cada pregunta de tipo multiple o escala
    const preguntasConOpciones = await Promise.all(
      preguntas.map(async (p) => {
        let opciones = [];
        if (p.tipo === 'opcion_multiple' || p.tipo === 'escala') {
          const { data: opts, error: errorOpciones } = await supabase
            .from('opcion')
            .select('*')
            .eq('pregunta_idpregunta', p.idpregunta);

          if (errorOpciones) {
            console.error('Error al obtener opciones:', errorOpciones);
          } else {
            opciones = opts;
          }
        }
        return { ...p, opciones };
      })
    );

    // 4️⃣ Devolver JSON
    res.json({
      IDEncuesta: encuesta.IDEncuesta,
      titulo: encuesta.titulo,
      preguntas: preguntasConOpciones
    });

  } catch (err) {
    console.error('Error interno del servidor:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
