import { supabase } from '../utils/supabaseClient.js';

// Registrar administrador
export const registerAdmin = async (req, res) => {
  try {
    const { usuario, contraseña } = req.body;

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
      console.error('Error Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ 
      message: 'Administrador registrado exitosamente', 
      id: data.idadmin 
    });

  } catch (err) {
    console.error('Error general:', err);
    res.status(500).json({ error: err.message });
  }
};

// Registrar cliente
export const registerClient = async (req, res) => {
  try {
    const { nombre, apellido, usuario, contraseña, rol, proyectoId } = req.body;

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
      console.error('Error al insertar cliente:', clienteError);
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
        console.error('Error al asignar proyecto:', proyectoError);
        // No hacemos return aquí para que al menos se cree el cliente
      }
    }

    res.status(201).json({ 
      message: 'Cliente registrado exitosamente', 
      id: clienteData.idcliente 
    });

  } catch (err) {
    console.error('Error general:', err);
    res.status(500).json({ error: err.message });
  }
};

// Login (si lo necesitas)
export const login = async (req, res) => {
  try {
    const { usuario, contraseña } = req.body;

    // Buscar en administradores
    const { data: admin, error: adminError } = await supabase
      .from('administrador')
      .select('*')
      .eq('usuario', usuario)
      .eq('contraseña', contraseña)
      .single();

    if (admin) {
      return res.json({ 
        message: 'Login exitoso', 
        user: admin, 
        tipo: 'administrador' 
      });
    }

    // Buscar en clientes
    const { data: cliente, error: clienteError } = await supabase
      .from('cliente')
      .select('*')
      .eq('usuario', usuario)
      .eq('contraseña', contraseña)
      .single();

    if (cliente) {
      return res.json({ 
        message: 'Login exitoso', 
        user: cliente, 
        tipo: 'cliente' 
      });
    }

    res.status(401).json({ error: 'Credenciales inválidas' });

  } catch (err) {
    console.error('Error general:', err);
    res.status(500).json({ error: err.message });
  }
};