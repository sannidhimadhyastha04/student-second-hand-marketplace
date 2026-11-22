const express = require("express");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ message: "Product ID is required." });

  try {
    const result = await pool.query(
      `INSERT INTO purchase_requests (product_id, buyer_id)
       SELECT p.product_id, $1 FROM products p
       WHERE p.product_id=$2 AND p.status='Available' AND p.seller_id <> $1
       RETURNING *`,
      [req.user.user_id, product_id]
    );
    if (!result.rowCount) return res.status(409).json({ message: "Product is unavailable or you cannot request your own listing." });
    res.status(201).json({ message: "Purchase request sent.", request: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "You have already requested this product." });
    console.error(err);
    res.status(500).json({ message: "Could not send request." });
  }
});

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.request_id, r.request_date, r.request_status, p.product_name, p.price,
              u.name AS seller_name
       FROM purchase_requests r JOIN products p ON p.product_id=r.product_id
       JOIN users u ON u.user_id=p.seller_id
       WHERE r.buyer_id=$1 ORDER BY r.request_date DESC`,
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load your requests." });
  }
});

router.get("/incoming", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.request_id, r.request_date, r.request_status, p.product_id,
              p.product_name, p.price, u.name AS buyer_name, u.department
       FROM purchase_requests r JOIN products p ON p.product_id=r.product_id
       JOIN users u ON u.user_id=r.buyer_id
       WHERE p.seller_id=$1 ORDER BY r.request_date DESC`,
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load incoming requests." });
  }
});

router.put("/:id/accept", requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const requestResult = await client.query(
      `SELECT r.request_id, r.product_id, r.buyer_id, r.request_status,
              p.seller_id, p.price, p.status AS product_status
       FROM purchase_requests r JOIN products p ON p.product_id=r.product_id
       WHERE r.request_id=$1 FOR UPDATE OF r, p`,
      [req.params.id]
    );
    if (!requestResult.rowCount) throw Object.assign(new Error("Request not found."), { status: 404 });
    const request = requestResult.rows[0];

    if (Number(request.seller_id) !== Number(req.user.user_id)) throw Object.assign(new Error("Only the seller can accept this request."), { status: 403 });
    if (request.request_status !== "Pending" || request.product_status !== "Available") {
      throw Object.assign(new Error("This request is no longer pending or the product is unavailable."), { status: 409 });
    }

    await client.query(
      "UPDATE purchase_requests SET request_status='Accepted' WHERE request_id=$1",
      [request.request_id]
    );
    await client.query(
      "UPDATE products SET status='Sold' WHERE product_id=$1",
      [request.product_id]
    );
    const transaction = await client.query(
      `INSERT INTO transactions (request_id, buyer_id, seller_id, amount)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [request.request_id, request.buyer_id, request.seller_id, request.price]
    );
    await client.query(
      `UPDATE purchase_requests SET request_status='Rejected'
       WHERE product_id=$1 AND request_id<>$2 AND request_status='Pending'`,
      [request.product_id, request.request_id]
    );

    await client.query("COMMIT");
    res.json({ message: "Request accepted and transaction recorded.", transaction: transaction.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || "Could not accept request." });
  } finally {
    client.release();
  }
});

router.put("/:id/reject", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE purchase_requests r SET request_status='Rejected'
       FROM products p
       WHERE r.product_id=p.product_id AND r.request_id=$1
         AND p.seller_id=$2 AND r.request_status='Pending'
       RETURNING r.*`,
      [req.params.id, req.user.user_id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Pending request not found or you are not the seller." });
    res.json({ message: "Request rejected.", request: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not reject request." });
  }
});

module.exports = router;
