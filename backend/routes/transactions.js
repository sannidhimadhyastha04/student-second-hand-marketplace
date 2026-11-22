const express = require("express");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.transaction_id, t.amount, t.transaction_date, t.status,
              p.product_name, buyer.name AS buyer_name, seller.name AS seller_name,
              t.buyer_id, t.seller_id
       FROM transactions t
       JOIN purchase_requests r ON r.request_id=t.request_id
       JOIN products p ON p.product_id=r.product_id
       JOIN users buyer ON buyer.user_id=t.buyer_id
       JOIN users seller ON seller.user_id=t.seller_id
       WHERE t.buyer_id=$1 OR t.seller_id=$1
       ORDER BY t.transaction_date DESC`,
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load transactions." });
  }
});

module.exports = router;
