const express = require('express');
const fs = require('fs');
const path = require('path');
const hbs = require('hbs');
const MySQL = require('./utilsMySQL');

const app = express();
const port = 3000;

// Detectar si estem al Proxmox (si és pm2)
const isProxmox = !!process.env.PM2_HOME;

// Iniciar connexió MySQL
const db = new MySQL();
if (!isProxmox) {
  db.init({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'aws',
    database: 'sakila'
  });
} else {
  db.init({
    host: '127.0.0.1',
    port: 3306,
    user: 'super',
    password: '1234',
    database: 'sakila'
  });
}

// Static files - ONLY ONCE
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

// Disable cache
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Handlebars
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Registrar "Helpers .hbs" aquí
hbs.registerHelper('eq', (a, b) => a == b);
hbs.registerHelper('gt', (a, b) => a > b);

// Partials de Handlebars
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// Route
app.get('/', async (req, res) => {
  try {
    const categoryRows = await db.query(`
      SELECT category_id, name
      FROM category
      ORDER BY category_id
      LIMIT 5
    `);

    const filmRows = await db.query(`
      SELECT film_id, title, release_year
      FROM film
      ORDER BY film_id
      LIMIT 5
    `);

    const actorRows = await db.query(`
      SELECT a.actor_id, a.first_name, a.last_name, fa.film_id
      FROM actor a
      JOIN film_actor fa ON fa.actor_id = a.actor_id
      JOIN (
        SELECT film_id
        FROM film
        ORDER BY film_id
        LIMIT 5
      ) f ON f.film_id = fa.film_id
    `);

    const categoryJson = db.table_to_json(categoryRows, {
      category_id: 'number',
      name: 'string'
    });

    const filmJson = db.table_to_json(filmRows, {
      film_id: 'number',
      title: 'string',
      release_year: 'number'
    });

    const actorJson = db.table_to_json(actorRows, {
      actor_id: 'number',
      first_name: 'string',
      last_name: 'string',
      film_id: 'number'
    });

    // Asociar actores a cada película
    const filmsWithActors = filmJson.map(film => {
      const actors = actorJson
        .filter(actor => actor.film_id === film.film_id)
        .map(actor => ({
          actor_id: actor.actor_id,
          first_name: actor.first_name,
          last_name: actor.last_name
        }));

      return { ...film, actors };
    });

    // Llegir l'arxiu .json amb dades comunes per a totes les pàgines
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    res.render('index', {
      category: categoryJson,
      film: filmsWithActors,
      common: commonData,
      currentPage: 'home'
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

app.get('/movies', async (req, res) => {
  try {
    const filmRows = await db.query(`
      SELECT f.film_id, f.title, f.description, f.release_year, f.length, f.rating, l.name
      FROM film f
      JOIN language l ON f.language_id = l.language_id
      ORDER BY f.film_id
      LIMIT 15
`    );

    const actorRows = await db.query(`
      SELECT a.actor_id, a.first_name, a.last_name, fa.film_id
      FROM actor a
      JOIN film_actor fa ON fa.actor_id = a.actor_id
      JOIN (
        SELECT film_id
        FROM film
        ORDER BY film_id
        LIMIT 15
      ) f ON f.film_id = fa.film_id
    `);

    const filmJson = db.table_to_json(filmRows, {
      film_id: 'number',
      title: 'string',
      description: 'string',
      release_year: 'number'
    });

    const actorJson = db.table_to_json(actorRows, {
      actor_id: 'number',
      first_name: 'string',
      last_name: 'string',
      film_id: 'number'
    });

    // Asociar actores a cada película
    const filmsWithActors = filmJson.map(film => {
      const actors = actorJson
        .filter(actor => actor.film_id === film.film_id)
        .map(actor => ({
          first_name: actor.first_name,
          last_name: actor.last_name
        }));

      return { ...film, actors };
    });

    // Llegir l'arxiu .json amb dades comunes per a totes les pàgines
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    res.render('movies', {
      film: filmsWithActors,
      common: commonData,
      currentPage: 'movies'
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

app.get('/movie', async (req, res) => {
  try {
    // 1. Llegir el paràmetre id
    const filmId = parseInt(req.query.id, 10);

    // 2. Validar id
    if (!Number.isInteger(filmId) || filmId <= 0) {
      return res.status(400).send('Paràmetre id invàlid');
    }

    // 3. Query pel·lícula + idioma
    const filmRows = await db.query(`
      SELECT
        f.film_id,
        f.title,
        f.description,
        f.release_year,
        f.length,
        f.rating,
        l.name AS language
      FROM film f
      JOIN language l ON f.language_id = l.language_id
      WHERE f.film_id = ${[filmId]}
      LIMIT 1;
    `);

    // 4. Si no existeix
    if (!filmRows || filmRows.length === 0) {
      return res.status(404).send('Pel·lícula no trobada');
    }

    // 5. Actors de la pel·lícula
    const actorRows = await db.query(`
      SELECT a.first_name, a.last_name
      FROM actor a
      JOIN film_actor fa ON fa.actor_id = a.actor_id
      WHERE fa.film_id = ${[filmId]}
    `);

    // 6. Convertir a JSON
    const filmJson = db.table_to_json(filmRows, {
      film_id: 'number',
      title: 'string',
      description: 'string',
      release_year: 'number',
      length: 'number',
      rating: 'string',
      language: 'string'
    });

    const actorJson = db.table_to_json(actorRows, {
      first_name: 'string',
      last_name: 'string'
    });

    // 7. Afegir actors a la peli
    const filmData = {
      ...filmJson[0],
      actors: actorJson
    };

    // 8. Dades comunes
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    // 9. Render
    res.render('movie', {
      movie: filmData,
      common: commonData,
      currentPage: 'movies'
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

app.get('/movieEdit', async (req, res) => {
  try {
    // 1. Llegir id
    const filmId = parseInt(req.query.id, 10);

    // 2. Validar
    if (!Number.isInteger(filmId) || filmId <= 0) {
      return res.status(400).send('Paràmetre id invàlid');
    }

    // 3. Query pel·lícula
    const filmRows = await db.query(`
      SELECT
        f.film_id,
        f.title,
        f.description,
        f.release_year,
        f.length,
        f.rating,
        f.language_id
      FROM film f
      WHERE f.film_id = ${filmId}
      LIMIT 1;
    `);

    // 4. Si no existeix
    if (!filmRows || filmRows.length === 0) {
      return res.status(404).send('Pel·lícula no trobada');
    }

    // 5. Llista d’idiomes (per un select al formulari)
    const languageRows = await db.query(`
      SELECT language_id, name
      FROM language
      ORDER BY name;
    `);

    // 6. Convertir a JSON
    const filmJson = db.table_to_json(filmRows, {
      film_id: 'number',
      title: 'string',
      description: 'string',
      release_year: 'number',
      length: 'number',
      rating: 'string',
      language_id: 'number'
    })[0];

    const languageJson = db.table_to_json(languageRows, {
      language_id: 'number',
      name: 'string'
    });

    // 7. Dades comunes
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    // 8. Render
    res.render('movieEdit', {
      movie: filmJson,
      languages: languageJson,
      common: commonData,
      currentPage: 'movies'
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

app.post('/editarPeli', async (req, res) => {
  try {

    const table = req.body.table;

    if (table == "film") {

      // 1. Recollir dades
      const film_id = parseInt(req.body.film_id, 10);
      const title = req.body.nombre;
      const description = req.body.description;
      const release_year = parseInt(req.body.year, 10);
      const language_id = parseInt(req.body.language, 10);
      const length = parseInt(req.body.length, 10);
      const rating = req.body.rating;

      // 2. Validacions
      if (!Number.isInteger(film_id) || film_id <= 0) {
        return res.status(400).send('ID invàlid');
      }

      if (!title || !release_year || !language_id) {
        return res.status(400).send('Falten dades');
      }

      // 3. UPDATE pel·lícula
      await db.query(`
        UPDATE film
        SET 
          title = "${title}",
          description = "${description}",
          release_year = ${release_year},
          language_id = ${language_id},
          length = ${length},
          rating = "${rating}"
        WHERE film_id = ${film_id};
      `);

      // 4. Redirecció
      res.redirect(`/movie?id=${film_id}`);
    }

  } catch (err) {
    console.error(err);
    res.status(500).send('Error editant la pel·lícula');
  }
});

app.post('/esborrarPeli', async (req, res) => {
  try {
    const film_id = parseInt(req.body.film_id, 10);

    if (!film_id) {
      return res.status(400).send('ID inválido');
    }

    console.log("Borrando film:", film_id);

    await db.query(`
      DELETE FROM rental 
      WHERE inventory_id IN (
        SELECT inventory_id FROM inventory WHERE film_id = ${film_id}
      )
    `);

    await db.query(`DELETE FROM inventory WHERE film_id = ${film_id}`);
    await db.query(`DELETE FROM film_actor WHERE film_id = ${film_id}`);
    await db.query(`DELETE FROM film_category WHERE film_id = ${film_id}`);
    await db.query(`DELETE FROM film WHERE film_id = ${film_id}`);

    res.redirect('/movies');

  } catch (err) {
    console.error(err);
    res.status(500).send('Error esborrant la pel·lícula');
  }
});

app.get('/movieAdd', async (req, res) => {
  try {
    const languageRows = await db.query(`
      SELECT language_id, name
      FROM language
      ORDER BY name;
    `);

    const languageJson = db.table_to_json(languageRows, {
      language_id: 'number',
      name: 'string'
    });

    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    res.render('movieAdd', {
      languages: languageJson,
      common: commonData
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error carregant dades');
  }
});

app.post('/afegirPeli', async (req, res) => {
  try {

    const table = req.body.table;

    if (table == "film") {

      const title = req.body.nombre;
      const description = req.body.description;
      const release_year = parseInt(req.body.year, 10);
      const language_id = parseInt(req.body.language, 10);
      const length = parseInt(req.body.length, 10) || 0;
      const rating = req.body.rating || "G";

      if (!title || !release_year || !language_id) {
        return res.status(400).send('Falten dades');
      }

      await db.query(`
        INSERT INTO film 
        (title, description, release_year, language_id, length, rating, last_update)
        VALUES (
          "${title}",
          "${description}",
          ${release_year},
          ${language_id},
          ${length},
          "${rating}",
          NOW()
        );
      `);

      res.redirect('/movies');
    }

  } catch (err) {
    console.error(err);
    res.status(500).send('Error afegint la pel·lícula');
  }
});

app.get('/customers', async (req, res) => {
  try {
    const customerRows = await db.query(`
      SELECT customer_id, first_name, last_name
      FROM customer
      ORDER BY customer_id
      LIMIT 25
    `);

    const rentalRows = await db.query(`
      SELECT r.customer_id, f.title
      FROM (
        SELECT customer_id
        FROM customer
        ORDER BY customer_id
        LIMIT 25
      ) c
      JOIN rental r ON r.customer_id = c.customer_id
      JOIN inventory i ON i.inventory_id = r.inventory_id
      JOIN film f ON f.film_id = i.film_id
`    );

    const customerJson = db.table_to_json(customerRows, {
      customer_id: 'number',
      first_name: 'string',
      last_name: 'string'
    });

    const rentalJson = db.table_to_json(rentalRows, {
      customer_id: 'number',
      title: 'string'
    });

    const customersWithRentals = customerJson.map(customer => {
      const rentals = rentalJson
        .filter(r => r.customer_id === customer.customer_id)
        .slice(0, 5);

      return { ...customer, rentals };
    });

    // Llegir l'arxiu .json amb dades comunes per a totes les pàgines
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    res.render('customers', {
      customers: customersWithRentals,
      common: commonData,
      currentPage: 'customers'
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

// Start server
const httpServer = app.listen(port, () => {
  console.log(`http://localhost:${port}`);
  console.log(`http://localhost:${port}/movies`);
  console.log(`http://localhost:${port}/customers`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await db.end();
  httpServer.close();
  process.exit(0);
});