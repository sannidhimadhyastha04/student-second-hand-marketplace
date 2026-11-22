-- Student Second-Hand Marketplace
-- Run this script in the student_marketplace database.

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(15) UNIQUE,
    department VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_email_format CHECK (POSITION('@' IN email) > 1)
);

CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    seller_id INT NOT NULL REFERENCES users(user_id),
    category_id INT NOT NULL REFERENCES categories(category_id),
    product_name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price > 0),
    condition VARCHAR(20) NOT NULL CHECK (condition IN ('New','Like New','Good','Fair')),
    status VARCHAR(20) NOT NULL DEFAULT 'Available'
      CHECK (status IN ('Available','Reserved','Sold')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT product_name_not_blank CHECK (LENGTH(TRIM(product_name)) > 0)
);

CREATE TABLE IF NOT EXISTS purchase_requests (
    request_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id),
    buyer_id INT NOT NULL REFERENCES users(user_id),
    request_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    request_status VARCHAR(20) NOT NULL DEFAULT 'Pending'
      CHECK (request_status IN ('Pending','Accepted','Rejected','Cancelled')),
    UNIQUE (product_id, buyer_id)
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    request_id INT UNIQUE NOT NULL REFERENCES purchase_requests(request_id),
    buyer_id INT NOT NULL REFERENCES users(user_id),
    seller_id INT NOT NULL REFERENCES users(user_id),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'Completed'
      CHECK (status IN ('Completed','Cancelled')),
    CHECK (buyer_id <> seller_id)
);

CREATE TABLE IF NOT EXISTS reviews (
    review_id SERIAL PRIMARY KEY,
    transaction_id INT UNIQUE NOT NULL REFERENCES transactions(transaction_id),
    reviewer_id INT NOT NULL REFERENCES users(user_id),
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    review_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Prevent a student from requesting their own listing.
CREATE OR REPLACE FUNCTION prevent_self_purchase()
RETURNS TRIGGER AS $$
DECLARE
    product_seller INT;
BEGIN
    SELECT seller_id INTO product_seller
    FROM products WHERE product_id = NEW.product_id;

    IF product_seller IS NULL THEN
        RAISE EXCEPTION 'Product does not exist';
    END IF;

    IF product_seller = NEW.buyer_id THEN
        RAISE EXCEPTION 'A seller cannot request their own product';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_self_purchase ON purchase_requests;
CREATE TRIGGER trg_prevent_self_purchase
BEFORE INSERT OR UPDATE OF product_id, buyer_id ON purchase_requests
FOR EACH ROW EXECUTE FUNCTION prevent_self_purchase();

-- Useful indexes for common filters and joins.
CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_requests_buyer ON purchase_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_requests_product_status ON purchase_requests(product_id, request_status);

-- A reusable joined view.
CREATE OR REPLACE VIEW product_details AS
SELECT p.product_id, p.product_name, p.description, p.price, p.condition,
       p.status, p.created_at, u.user_id AS seller_id, u.name AS seller_name,
       u.department, c.category_id, c.category_name
FROM products p
JOIN users u ON u.user_id = p.seller_id
JOIN categories c ON c.category_id = p.category_id;
