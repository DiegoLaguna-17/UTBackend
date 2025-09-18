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