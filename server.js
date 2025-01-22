require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(cors({
    origin: 'http://localhost:3001',
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type',
}));
app.use(bodyParser.json());

// Use environment variables for database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'loginpage'
};

// MySQL connection setup
const db = mysql.createConnection(dbConfig);

// Connect to MySQL
db.connect(err => {
    if (err) {
        console.error("Error connecting to the database:", err);
        return;
    }
    console.log("Database connected!");
});

// Register Endpoint
// Register Endpoint
app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        const saltRounds = 10;
        const hashedPassword = bcrypt.hashSync(password, saltRounds);

        const query = 'INSERT INTO newlogin (username, password, email, date) VALUES (?, ?, ?, NOW())';
        db.query(query, [username, hashedPassword, email], (err, results) => {
            if (err) {
                console.error("Error registering user:", err);

                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: "User already exists." });
                }

                return res.status(500).json({ message: "Error registering user. Please try again later." });
            }

            res.status(201).json({ message: "User registered successfully!" });
        });

    } catch (error) {
        console.error("Error hashing password:", error);
        res.status(500).json({ message: "Error processing registration." });
    }
});


// Login Endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const query = 'SELECT * FROM newlogin WHERE username = ?';
        db.query(query, [username], async (err, results) => {
            if (err) {
                console.error("Database query error:", err);
                return res.status(500).json({ message: "Database error." });
            }
            if (results.length === 0) {
                console.log("Username not found.");
                return res.status(400).json({ message: "Username not found." });
            }
            const user = results[0];
            const match = await bcrypt.compare(password, user.password);
            console.log("Password comparison result:", match);
            if (!match) {
                console.log("Incorrect password.");
                return res.status(400).json({ message: "Incorrect password." });
            }
            const token = jwt.sign({ username: user.username }, 'your_jwt_secret', { expiresIn: '1h' });
            console.log("Token generated:", token);
            res.status(200).json({ message: "Login successful!", token });
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Error during login." });
    }
});

// Start the server only if it's not in test mode
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

module.exports = app; // Export Express app for Jest testing
