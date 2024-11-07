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

// Delete review by id endpoint
app.delete("/reviews/review/:id", async (req, res) => {
    const id = req.params.id;
    const client = await pool.connect();
    try {
        const deleteQuery = "DELETE FROM reviews WHERE id = $1";
        await client.query(deleteQuery, [id]);
        res.json({ status: "success", message: "Review deleted successfully" });
    } catch (error) {
        console.error("error", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Delete product by id endpoint
app.delete("/products/product/:id", async (req, res) => {
    const id = req.params.id;
    const client = await pool.connect();
    try {
        const deleteQuery = "DELETE FROM products WHERE id = $1";
        await client.query(deleteQuery, [id]);
        res.json({ status: "success", message: "Product deleted successfully" });
    } catch (error) {
        console.error("error", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Update product by id endpoint
app.put("/products/product/:id", async (req, res) => {
    const id = req.params.id;
    const updatedData = req.body;
    const client = await pool.connect();
    try {
        const updateData =
            "UPDATE products SET name=$1, image_url=$2, specification=$3, pros=$4, cons=$5, referral_link=$6, video_url=$7, tagline=$8 WHERE id=$9";
        const queryData = [
            updatedData.name,
            updatedData.image_url,
            updatedData.specification,
            updatedData.pros,
            updatedData.cons,
            updatedData.referral_link,
            updatedData.video_url,
            updatedData.tagline,
            id,
        ];
        await client.query(updateData, queryData);
        res.json({ status: "success", message: "Product updated successfully" });
    } catch (error) {
        console.error("error", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Show reviews by product id endpoint
app.get("/reviews/product/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        const result = await client.query(
            "SELECT * FROM reviews WHERE product_id = $1",
            [id],
        );
        if (result.rowCount > 0) {
            res.json(result.rows);
        } else {
            res.status(404).json({ error: "Reviews not found" });
        }
    } catch (error) {
        console.error("error", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Create review endpoint
app.post("/reviews", async (req, res) => {
    const client = await pool.connect();
    try {
        const data = {
            review: req.body.review,
            recommend: req.body.recommend,
            product_id: req.body.product_id,
            created_by: req.body.created_by,
            created_at: new Date().toISOString(),
        };
        const query =
            "INSERT INTO reviews (review, recommend, product_id, created_by, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id";
        const params = [
            data.review,
            data.recommend,
            data.product_id,
            data.created_by,
            data.created_at,
        ];
        const result = await client.query(query, params);
        data.id = result.rows[0].id;
        res.json({
            status: "success",
            data: data,
            message: "Review created successfully",
        });
    } catch (error) {
        console.error("error", error.message);
    } finally {
        client.release();
    }
});

// Show product by id endpoint
app.get("/products/product/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        const result = await client.query("SELECT * FROM products WHERE id = $1", [
            id,
        ]);
        if (result.rowCount > 0) {
            res.json(result.rows);
        } else {
            res.status(404).json({ error: "Product not found" });
        }
    } catch (error) {
        console.error("error", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Show all products endpoint
app.get("/products", async (req, res) => {
    const client = await pool.connect();
    try {
        const query = "SELECT * FROM products";
        const result = await client.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("error", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Create product endpoint
app.post("/products", async (req, res) => {
    const client = await pool.connect();
    try {
        const data = {
            name: req.body.name,
            image_url: req.body.image_url,
            specification: req.body.specification,
            pros: req.body.pros,
            cons: req.body.cons,
            referral_link: req.body.referral_link,
            video_url: req.body.video_url,
            tagline: req.body.tagline,
            created_by: req.body.created_by,
            created_at: new Date().toISOString(),
        };
        const query =
            "INSERT INTO products (name, image_url, specification, pros, cons, referral_link, video_url, tagline, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id";
        const params = [
            data.name,
            data.image_url,
            data.specification,
            data.pros,
            data.cons,
            data.referral_link,
            data.video_url,
            data.tagline,
            data.created_by,
            data.created_at,
        ];
        const result = await client.query(query, params);
        data.id = result.rows[0].id;
        res.json({
            status: "success",
            data: data,
            message: "Product created successfully",
        });
    } catch (error) {
        console.error("error", error.message);
    } finally {
        client.release();
    }
});

app.get("/", (req, res) => res.send("Express on Vercel"));

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});

module.exports = app;