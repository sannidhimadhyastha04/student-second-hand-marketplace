
const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

// Get all reviews
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.review_id,
        r.transaction_id,
        r.reviewer_id,
        r.rating,
        r.comment,
        r.review_date,
        u.name AS reviewer_name
      FROM reviews r
      JOIN users u
        ON u.user_id = r.reviewer_id
      ORDER BY r.review_date DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Could not load reviews."
    });
  }
});

// Submit a review
router.post("/", requireAuth, async (req, res) => {
  const { transaction_id, rating, comment } = req.body;
  const reviewer_id = req.user.user_id;

  const transactionId = Number(transaction_id);
  const numericRating = Number(rating);

  if (
    !Number.isSafeInteger(transactionId) ||
    transactionId <= 0 ||
    !Number.isInteger(numericRating) ||
    numericRating < 1 ||
    numericRating > 5 ||
    (comment != null && typeof comment !== "string")
  ) {
    return res.status(400).json({
      message: "Enter a valid transaction and rating (1–5)."
    });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO reviews
        (transaction_id, reviewer_id, rating, comment)
      SELECT
        t.transaction_id, $2, $3, $4
      FROM transactions t
      WHERE t.transaction_id = $1
        AND t.buyer_id = $2
        AND t.status = 'Completed'
      RETURNING *
      `,
      [
        transactionId,
        reviewer_id,
        numericRating,
        comment?.trim() || null
      ]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        message:
          "Only the buyer of a completed transaction can submit a review."
      });
    }

    res.status(201).json({
      message: "Review submitted successfully!",
      review: result.rows[0]
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        message: "This transaction has already been reviewed."
      });
    }

    if (err.code === "23514") {
      return res.status(400).json({
        message: "Rating must be between 1 and 5."
      });
    }

    console.error(err);

    res.status(500).json({
      message: "Could not submit review."
    });
  }
});

module.exports = router;
