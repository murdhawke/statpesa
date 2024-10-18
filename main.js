const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const cors = require('cors');

const rawData = fs.readFileSync('./config/config.json');
const config = JSON.parse(rawData);

const dbConfig = {
    host: 'localhost',
    user: config.db_username,
    password: config.db_password
};

const app = express();
app.use(express.static('public'));
const port = 1111;
app.use(cors());

const db = mysql.createConnection(dbConfig);

app.get('/data', (req, res) => {
    db.query('SELECT * FROM statpesa.exchange_rates', (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

app.get('/data/:date', (req, res) => {
    const date = req.params.date;
    db.query('SELECT * FROM statpesa.exchange_rates WHERE date = ?', [date], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
