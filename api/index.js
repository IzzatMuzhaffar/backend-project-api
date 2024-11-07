let express = require("express");
let path = require("path");
const cors = require("cors");
const { Pool } = require("pg");
const { DATABASE_URL, SECRET_KEY } = process.env;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

let app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        require: true,
    },
});

async function getPostgresVersion() {
    const client = await pool.connect();
    try {
        const response = await client.query("SELECT version()");
        console.log(response.rows[0]);
    } finally {
        client.release();
    }
}

getPostgresVersion();

// Delete booking by id endpoint
app.delete("/bookings/:id", async (req, res) => {
    const id = req.params.id;
    const client = await pool.connect();
    try {
        const deleteQuery = "DELETE FROM bookings WHERE id = $1";
        await client.query(deleteQuery, [id]);
        res.json({ status: "success", message: "Booking deleted successfully" });
    } catch (error) {
        console.error("Error: ", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Update booking by id endpoint
app.put("/bookings/:id", async (req, res) => {
    const id = req.params.id;
    const updatedData = req.body;
    const client = await pool.connect();
    try {
        const updateData =
            "UPDATE bookings SET title=$1, description=$2, date=$3, time=$4, phone_number=$5, email=$6 WHERE id=$7";
        const queryData = [
            updatedData.title,
            updatedData.description,
            updatedData.date,
            updatedData.time,
            updatedData.phone_number,
            updatedData.email,
            id,
        ];
        await client.query(updateData, queryData);
        res.json({ status: "success", message: "Booking updated successfully" });
    } catch (error) {
        console.error("error", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Show booking by user endpoint
app.get("/bookings/user/:user_id", async (req, res) => {
    const { user_id } = req.params;
    const client = await pool.connect();

    try {
        const posts = await client.query(
            "SELECT * FROM bookings WHERE user_id = $1",
            [user_id],
        );
        if (posts.rowCount > 0) {
            res.json(posts.rows);
        } else {
            res.status(404).json({ error: "no bookings found for this user" });
        }
    } catch (error) {
        console.error("Error: ", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Create booking endpoint
app.post("/bookings", async (req, res) => {
    const client = await pool.connect();
    try {
        const data = {
            title: req.body.title,
            description: req.body.description,
            date: req.body.date,
            time: req.body.time,
            phone_number: req.body.phone_number,
            email: req.body.email,
            user_id: req.body.user_id,
            created_at: new Date().toISOString(),
        };
        const query =
            "INSERT INTO bookings (title, description, date, time, phone_number, email, user_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id";
        const params = [
            data.title,
            data.description,
            data.date,
            data.time,
            data.phone_number,
            data.email,
            data.user_id,
            data.created_at,
        ];
        const result = await client.query(query, params);
        data.id = result.rows[0].id;
        res.json({
            status: "success",
            data: data,
            message: "Booking created successfully",
        });
    } catch (error) {
        console.error("error", error.message);
    } finally {
        client.release();
    }
});

// Signup endpoint
app.post("/signup", async (req, res) => {
    const client = await pool.connect();
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);

        const userResult = await client.query(
            "SELECT * FROM users WHERE username = $1",
            [username],
        );

        if (userResult.rows.length > 0) {
            return res.status(400).json({ message: "Username already taken" });
        }

        await client.query(
            "INSERT INTO users (username, password) VALUES ($1, $2)",
            [username, hashedPassword],
        );

        res.status(201).json({ message: "User registered succesfully" });
    } catch (error) {
        console.error("Error: ", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Login endpoint
app.post("/login", async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT * FROM users WHERE username = $1",
            [req.body.username],
        );

        const user = result.rows[0];

        if (!user)
            return res
                .status(400)
                .json({ message: "Username or password incorrect" });

        const passwordIsValid = await bcrypt.compare(
            req.body.password,
            user.password,
        );
        if (!passwordIsValid)
            return res.status(400).json({ auth: false, token: null });

        var token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, {
            expiresIn: 86400,
        });

        res.status(200).json({ auth: true, token: token });
    } catch (error) {
        console.error("Error: ", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

app.get("/", (req, res) => res.send("Express on Vercel"));

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});

module.exports = app;