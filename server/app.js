const express = require('express');
const fs = require('fs');
const path = require('path');
const hbs = require('express-handlebars');
const MySQL = require('./utilsMySQL');

const app = express();
const port = 3000;

// Detectar Proxmox
const isProxmox = !!process.env.PM2_HOME;

// MYSQL
const db = new MySQL();

if (!isProxmox) {
  db.init({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'aws',
    database: 'tienda_pokemon'
  });
} else {
  db.init({
    host: '127.0.0.1',
    port: 3306,
    user: 'super',
    password: '1234',
    database: 'tienda_pokemon'
  });
}

// Static
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Cache OFF
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// HBS
app.engine('hbs', hbs.engine({

  extname: '.hbs',

  defaultLayout: 'main',

  layoutsDir: path.join(__dirname, 'layouts'),

  partialsDir: path.join(__dirname, 'views', 'partials'),

  helpers: {

    eq: (a, b) => a == b,

    gt: (a, b) => a > b,

    formatDate: (date) => {

      return new Date(date).toLocaleDateString('es-ES');

    }

  }

}));

app.set('view engine', 'hbs');

app.set('views', path.join(__dirname, 'views'));

// ==========================================
// HOME DASHBOARD
// ==========================================

app.get('/', async (req, res) => {

  try {

    // ==========================
    // KPI
    // ==========================

    // Ventas hoy
    const ventasHoyRows = await db.query(`
      SELECT IFNULL(SUM(total),0) AS total
      FROM sales
      WHERE sale_date = CURDATE()
    `);

    // Ventas mes
    const ventasMesRows = await db.query(`
      SELECT IFNULL(SUM(total),0) AS total
      FROM sales
      WHERE MONTH(sale_date) = MONTH(CURDATE())
      AND YEAR(sale_date) = YEAR(CURDATE())
    `);

    // Pedidos hoy
    const pedidosHoyRows = await db.query(`
      SELECT COUNT(*) AS total
      FROM sales
      WHERE sale_date = CURDATE()
    `);

    // Pedidos mes
    const pedidosMesRows = await db.query(`
      SELECT COUNT(*) AS total
      FROM sales
      WHERE MONTH(sale_date) = MONTH(CURDATE())
      AND YEAR(sale_date) = YEAR(CURDATE())
    `);

    // Stock bajo
    const stockRows = await db.query(`
      SELECT id, name, stock
      FROM products
      WHERE stock <= 10
      ORDER BY stock ASC
      LIMIT 5
    `);

    // ==========================
    // LISTADOS
    // ==========================

    // Últimas ventas
    const ventasRows = await db.query(`
      SELECT
        s.id,
        s.sale_date,
        s.total,
        c.name AS customer
      FROM sales s
      JOIN customers c ON c.id = s.customer_id
      ORDER BY s.sale_date DESC
      LIMIT 5
    `);

    // Productos más vendidos
    const topRows = await db.query(`
      SELECT
        p.name,
        p.stock,
        SUM(si.qty) AS vendidos
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      GROUP BY p.id
      ORDER BY vendidos DESC
      LIMIT 5
    `);

    // ==========================
    // JSON
    // ==========================

    const ventasHoyJson = db.table_to_json(ventasHoyRows, {
      total: 'number'
    });

    const ventasMesJson = db.table_to_json(ventasMesRows, {
      total: 'number'
    });

    const pedidosHoyJson = db.table_to_json(pedidosHoyRows, {
      total: 'number'
    });

    const pedidosMesJson = db.table_to_json(pedidosMesRows, {
      total: 'number'
    });

    const stockJson = db.table_to_json(stockRows, {
      id: 'number',
      name: 'string',
      stock: 'number'
    });

    const ventasJson = db.table_to_json(ventasRows, {
      id: 'number',
      sale_date: 'string',
      total: 'number',
      customer: 'string'
    });

    const topJson = db.table_to_json(topRows, {
      name: 'string',
      stock: 'number',
      vendidos: 'number'
    });

    // Common JSON
    const commonData = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, 'data', 'common.json'),
        'utf8'
      )
    );

    // Render
    res.render('index', {

      ventasHoy: ventasHoyJson[0].total,
      ventasMes: ventasMesJson[0].total,

      pedidosHoy: pedidosHoyJson[0].total,
      pedidosMes: pedidosMesJson[0].total,

      stockBajo: stockJson,

      ultimasVentas: ventasJson,

      topProductos: topJson,

      common: commonData,
      currentPage: 'home'
    });

  } catch (err) {

    console.error(err);
    res.status(500).send('Error base de datos');

  }

});

// ==========================================
// SERVER
// ==========================================

const httpServer = app.listen(port, () => {

  console.log(`http://localhost:${port}`);

});

// Graceful shutdown
process.on('SIGINT', async () => {

  await db.end();
  httpServer.close();
  process.exit(0);

});