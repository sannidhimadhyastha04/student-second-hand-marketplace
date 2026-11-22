const express = require("express");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/categories", async (_req, res) => {
  try {
    const result = await pool.query("SELECT category_id, category_name FROM categories ORDER BY category_name");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load categories." });
  }
});

router.get("/", async (req, res) => {
  const { search = "", category = "", minPrice = "", maxPrice = "" } = req.query;
  try {
    const result = await pool.query(
      `SELECT p.product_id, p.product_name, p.description, p.price, p.condition,
              p.status, p.created_at, u.name AS seller_name, u.department,
              c.category_id, c.category_name
       FROM products p
       JOIN users u ON u.user_id = p.seller_id
       JOIN categories c ON c.category_id = p.category_id
       WHERE p.status = 'Available'
         AND ($1 = '' OR p.product_name ILIKE '%' || $1 || '%' OR COALESCE(p.description, '') ILIKE '%' || $1 || '%')
         AND ($2 = '' OR c.category_id = NULLIF($2, '')::int)
         AND ($3 = '' OR p.price >= NULLIF($3, '')::numeric)
         AND ($4 = '' OR p.price <= NULLIF($4, '')::numeric)
       ORDER BY p.created_at DESC`,
      [search, category, minPrice, maxPrice]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load products. Check your filters." });
  }
});

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.category_name FROM products p
       JOIN categories c ON c.category_id = p.category_id
       WHERE p.seller_id = $1 ORDER BY p.created_at DESC`,
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load your listings." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name AS seller_name, u.department, c.category_name
       FROM products p JOIN users u ON u.user_id = p.seller_id
       JOIN categories c ON c.category_id = p.category_id
       WHERE p.product_id = $1`,
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Product not found." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load product." });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { category_id, product_name, description, price, condition } = req.body;
  if (!category_id || !product_name || !price || !condition) {
    return res.status(400).json({ message: "Category, product name, price and condition are required." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO products (seller_id, category_id, product_name, description, price, condition)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.user_id, category_id, product_name.trim(), description || "", price, condition]
    );
    res.status(201).json({ message: "Product listed successfully.", product: result.rows[0] });
  } catch (err) {
    if (err.code === "23503" || err.code === "23514") return res.status(400).json({ message: "Please provide a valid category, price and condition." });
    console.error(err);
    res.status(500).json({ message: "Could not list product." });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const { category_id, product_name, description, price, condition } = req.body;
  try {
    const result = await pool.query(
      `UPDATE products SET category_id=$1, product_name=$2, description=$3, price=$4, condition=$5
       WHERE product_id=$6 AND seller_id=$7 AND status='Available'
       RETURNING *`,
      [category_id, product_name, description || "", price, condition, req.params.id, req.user.user_id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Listing not found, unavailable, or not owned by you." });
    res.json({ message: "Listing updated.", product: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Could not update listing. Check the entered values." });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM products p WHERE p.product_id=$1 AND p.seller_id=$2
       AND p.status='Available'
       AND NOT EXISTS (SELECT 1 FROM purchase_requests r WHERE r.product_id=p.product_id)
       RETURNING p.product_id`,
      [req.params.id, req.user.user_id]
    );
    if (!result.rowCount) return res.status(409).json({ message: "Listing cannot be deleted. It may have requests, may be sold, or may not belong to you." });
    res.json({ message: "Listing deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete listing." });
  }
});

module.exports = router;
