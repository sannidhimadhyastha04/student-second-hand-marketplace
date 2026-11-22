-- 1. SELECT all products
SELECT * FROM products;

-- 2. WHERE: products below Rs. 300
SELECT product_name, price FROM products WHERE price < 300;

-- 3. ORDER BY: highest priced products first
SELECT product_name, price FROM products ORDER BY price DESC;

-- 4. UPDATE a product price (use a demo row)
UPDATE products SET price = 190 WHERE product_id = 1;

-- 5. DELETE a product only if it has no requests
DELETE FROM products p
WHERE p.product_id = 25
AND NOT EXISTS (SELECT 1 FROM purchase_requests r WHERE r.product_id=p.product_id);

-- 6. INNER JOIN product, seller and category
SELECT p.product_name, p.price, u.name AS seller, c.category_name
FROM products p JOIN users u ON u.user_id=p.seller_id
JOIN categories c ON c.category_id=p.category_id;

-- 7. LEFT JOIN: include categories with no listings
SELECT c.category_name, p.product_name
FROM categories c LEFT JOIN products p ON p.category_id=c.category_id;

-- 8. GROUP BY: count listings by category
SELECT c.category_name, COUNT(p.product_id) AS listing_count
FROM categories c LEFT JOIN products p ON p.category_id=c.category_id
GROUP BY c.category_id, c.category_name;

-- 9. HAVING: categories with at least 2 listings
SELECT c.category_name, COUNT(*) AS listing_count
FROM categories c JOIN products p ON p.category_id=c.category_id
GROUP BY c.category_id, c.category_name HAVING COUNT(*) >= 2;

-- 10. Subquery: products priced above average
SELECT product_name, price FROM products
WHERE price > (SELECT AVG(price) FROM products);

-- 11. Aggregate functions
SELECT COUNT(*) AS total, AVG(price) AS average_price,
       MIN(price) AS lowest_price, MAX(price) AS highest_price
FROM products;

-- 12. View
SELECT * FROM product_details;

-- 13. Window function: rank products by price within each category
SELECT product_name, category_id, price,
       RANK() OVER (PARTITION BY category_id ORDER BY price DESC) AS category_price_rank
FROM products;

-- 14. Index and query plan
EXPLAIN ANALYZE
SELECT * FROM products WHERE product_name ILIKE '%book%' AND status='Available';

-- 15. Trigger test: should fail when user 1 requests their own product
-- (Assuming product_id 1 belongs to seller_id 1)
-- INSERT INTO purchase_requests (product_id, buyer_id) VALUES (1, 1);

-- Transaction demonstration: this change is rolled back.
BEGIN;
UPDATE products SET price = 999 WHERE product_id = 1;
ROLLBACK;
SELECT product_id, price FROM products WHERE product_id = 1;

-- Useful application report: seller-wise listing count
SELECT u.name, COUNT(p.product_id) AS products_listed
FROM users u LEFT JOIN products p ON p.seller_id=u.user_id
GROUP BY u.user_id, u.name ORDER BY products_listed DESC;

-- Request status summary
SELECT request_status, COUNT(*) FROM purchase_requests GROUP BY request_status;
