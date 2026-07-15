import mysql from 'mysql2/promise';

async function seed() {
  // Credenciales SOLO por variables de entorno (el repo es público).
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('Faltan DB_HOST / DB_USER / DB_PASSWORD en el entorno (ver .env.example)');
    process.exit(1);
  }

  // First connection without DB to create it
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  try {
    console.log('Creando base de datos BDIntegraEsteticaBase si no existe...');
    await connection.query('CREATE DATABASE IF NOT EXISTS BDIntegraEsteticaBase');
    await connection.end();

    // Reconnect with DB
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'BDIntegraEsteticaBase',
        port: parseInt(process.env.DB_PORT || '3306'),
    });

    console.log('Iniciando tablas...');
    
    // Create Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tblUsuarios (
        IdUsuario INT PRIMARY KEY,
        Usuario VARCHAR(100),
        IdPuesto INT,
        Login VARCHAR(50),
        Password VARCHAR(50),
        Status TINYINT DEFAULT 1
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tblCategorias (
        IdCategoria INT PRIMARY KEY,
        Categoria VARCHAR(100),
        EsExtra TINYINT DEFAULT 0
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tblProductos (
        IdProducto INT PRIMARY KEY,
        Producto VARCHAR(255),
        Precio1 DECIMAL(10,2),
        Precio2 DECIMAL(10,2) DEFAULT 0,
        Precio3 DECIMAL(10,2) DEFAULT 0,
        IVA DECIMAL(10,2) DEFAULT 0,
        Status TINYINT DEFAULT 1,
        Multiple TINYINT DEFAULT 0,
        IdCategoria INT,
        ArchivoImagen VARCHAR(500)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tblClientes (
        IdCliente INT AUTO_INCREMENT PRIMARY KEY,
        NombreCliente VARCHAR(255) NOT NULL,
        Telefono VARCHAR(30),
        CorreoElectronico VARCHAR(255),
        FechaRegistro DATETIME DEFAULT NOW(),
        Status TINYINT DEFAULT 1
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tblCitas (
        IdCita INT AUTO_INCREMENT PRIMARY KEY,
        IdCliente INT NOT NULL,
        Titulo VARCHAR(255),
        Descripcion TEXT,
        FechaCita DATETIME NOT NULL,
        Duracion INT DEFAULT 60,
        Status TINYINT DEFAULT 1,
        IdUsuario INT,
        FechaRegistro DATETIME DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tblVentas (
        IdVenta INT PRIMARY KEY,
        IdApertura INT,
        IdComputadora INT DEFAULT 1,
        Folio VARCHAR(20),
        Total DECIMAL(10,2),
        FechaVenta DATETIME,
        IdAperturaPago INT,
        Efectivo DECIMAL(10,2),
        Tarjeta DECIMAL(10,2),
        Transferencia DECIMAL(10,2),
        Cancelada TINYINT DEFAULT 0,
        VentaEn TINYINT DEFAULT 1,
        Cliente VARCHAR(255),
        IdCliente INT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tblDetalleVentas (
        IdDetalleVenta INT AUTO_INCREMENT PRIMARY KEY,
        IdVenta INT,
        IdProducto INT,
        Cantidad DECIMAL(10,2),
        Precio DECIMAL(10,2),
        Fecha DATETIME,
        Folio VARCHAR(20),
        IdApertura INT,
        TipoPrecio INT,
        Descuento DECIMAL(10,2),
        EsExtra TINYINT DEFAULT 0,
        IdDetallePadre INT
      )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS tblAperturasCierres (
            IdApertura INT AUTO_INCREMENT PRIMARY KEY,
            IdUsuarioApertura INT,
            FechaApertura DATETIME,
            FondoCaja DECIMAL(10,2),
            IdSupervisorCierre INT DEFAULT 0,
            FechaCierre DATETIME,
            Efectivo DECIMAL(10,2),
            Tarjeta DECIMAL(10,2),
            TotalVentas DECIMAL(10,2),
            Cancelados INT DEFAULT 0
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS tblMovimientos (
            IdMovimiento INT AUTO_INCREMENT PRIMARY KEY,
            IdApertura INT,
            Concepto VARCHAR(255),
            Efectivo DECIMAL(10,2),
            FechaRetiro DATETIME
        )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tblConfigTicket (
        Id INT PRIMARY KEY DEFAULT 1,
        Header1 VARCHAR(255),
        Header2 VARCHAR(255),
        Header3 VARCHAR(255),
        Header4 VARCHAR(255),
        Header5 VARCHAR(255),
        Footer1 VARCHAR(255),
        Footer2 VARCHAR(255),
        Footer3 VARCHAR(255),
        PrintKitchenDefault TINYINT DEFAULT 0,
        RequireCustomerName TINYINT DEFAULT 1,
        LogoPath VARCHAR(500),
        AppTitle VARCHAR(255),
        PrimaryColor VARCHAR(20),
        PrimaryHover VARCHAR(20),
        AccentColor VARCHAR(20),
        BgColor VARCHAR(20),
        SurfaceColor VARCHAR(20)
      )
    `);

    // 1. Seed Users
    const [users] = await pool.query('SELECT * FROM tblUsuarios');
    if ((users as any[]).length === 0) {
      console.log('Seeding default admin...');
      await pool.query(
        'INSERT INTO tblUsuarios (IdUsuario, Usuario, IdPuesto, Login, Password, Status) VALUES (?, ?, ?, ?, ?, ?)',
        [1, 'Administrador', 1, 'admin', 'admin123', 1]
      );
    }

    // 2. Seed Categories
    const [categories] = await pool.query('SELECT * FROM tblCategorias');
    if ((categories as any[]).length === 0) {
      console.log('Seeding sample categories...');
      await pool.query('INSERT INTO tblCategorias (IdCategoria, Categoria, EsExtra) VALUES ?', [[
        [1, 'Cortes', 0],
        [2, 'Barba', 0],
        [3, 'Tintes', 0],
        [4, 'Extras', 1]
      ]]);
    }

    // 3. Seed Products
    const [products] = await pool.query('SELECT * FROM tblProductos');
    if ((products as any[]).length === 0) {
      console.log('Seeding sample products...');
      await pool.query('INSERT INTO tblProductos (IdProducto, Producto, Precio1, Precio2, Precio3, IVA, Status, Multiple, IdCategoria) VALUES ?', [[
        [1, 'Corte Clásico', 150, 0, 0, 0, 1, 0, 1],
        [2, 'Corte con Diseño', 180, 0, 0, 0, 1, 0, 1],
        [3, 'Delineado de Barba', 80, 0, 0, 0, 1, 0, 2],
        [4, 'Corte y Barba', 200, 0, 0, 0, 1, 0, 1],
        [5, 'Mascarilla Negra', 50, 0, 0, 0, 1, 0, 4],
        [6, 'Lavado de Cabello', 30, 0, 0, 0, 1, 0, 4]
      ]]);
    }

    // 4. Seed Config
    const [config] = await pool.query('SELECT * FROM tblConfigTicket');
    if ((config as any[]).length === 0) {
      console.log('Seeding default config...');
      await pool.query('INSERT INTO tblConfigTicket SET ?', [{
        Id: 1,
        Header1: 'HL CUTS',
        Header2: 'Barber Shop & Beauty',
        Header3: 'Tel: 123-456-7890',
        Footer1: 'Gracias por su preferencia',
        Footer2: '¡Vuelva pronto!',
        RequireCustomerName: 1,
        AppTitle: 'HL Cuts',
        PrimaryColor: '#c9a84c',
        PrimaryHover: '#a8863a',
        AccentColor: '#e2c272'
      }]);
    }

    console.log('Database initialized and seeded successfully.');
    await pool.end();
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    process.exit();
  }
}

seed();
