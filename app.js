// ============================================
// 1. Imports
// ============================================
require('dotenv').config();               // Loads .env into process.env
const express = require('express');
const mysql = require('mysql2');

// ============================================
// 2. App Setup
// ============================================
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));  // For form data
app.use(express.static('public'));                // For /css/style.css

// ============================================
// 3. Database Connection
// ============================================
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL');
});

// ============================================
// 4. Routes
// ============================================

// ---------- READ: Student List ----------
app.get('/', (req, res) => {
  const showDeleted = req.query.deleted === '1';

  db.query('SELECT * FROM students ORDER BY id DESC', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }
    res.render('index', {
      students: results,
      deleted: showDeleted,
      keyword: ''
    });
  });
});

// ---------- CREATE: Show Add Form ----------
app.get('/students/add', (req, res) => {
  res.render('add');
});

// ---------- CREATE: Process Add Form ----------
app.post('/students/add', (req, res) => {
  const { student_id, first_name, last_name, course, year_level, email } = req.body;

  const sql = `
    INSERT INTO students (student_id, first_name, last_name, course, year_level, email)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const values = [student_id, first_name, last_name, course, year_level, email];

  db.query(sql, values, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Unable to save student');
    }
    res.redirect('/');
  });
});

// ---------- SEARCH ----------
app.get('/students/search', (req, res) => {
  const keyword = req.query.keyword || '';
  const searchValue = `%${keyword}%`;

  const sql = `
    SELECT * FROM students
    WHERE student_id LIKE ?
       OR first_name LIKE ?
       OR last_name LIKE ?
       OR course LIKE ?
    ORDER BY id DESC
  `;

  db.query(sql, [searchValue, searchValue, searchValue, searchValue], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Search error');
    }
    res.render('index', {
      students: results,
      deleted: false,
      keyword: keyword   // Preserve the search term in the input box
    });
  });
});

// ---------- DELETE: Remove Student ----------
app.post('/students/delete/:id', (req, res) => {
  const id = req.params.id;

  // Parameterized query — prevents SQL injection
  db.query('DELETE FROM students WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Unable to delete student');
    }

    // If no row was affected, the ID didn't exist
    if (result.affectedRows === 0) {
      return res.status(404).send('Student not found');
    }

    // Redirect with a query param so we can show a success message
    res.redirect('/?deleted=1');
  });
});

// ============================================
// 5. Start Server
// ============================================
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});