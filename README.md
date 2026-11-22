# CampusSwap — Student Second-Hand Marketplace

A DBMS mini-project where students can list, browse and request pre-owned college items. Built using PostgreSQL, Node.js, Express and vanilla HTML/CSS/JavaScript.

## Features

- Student registration and login (bcrypt password hashing, JWT authentication)
- Browse, search and filter available listings
- Create, update and delete your own listings (deletion is restricted when requests exist)
- Send purchase requests; self-purchase and duplicate requests are prevented
- Sellers can accept or reject incoming requests
- Accepting a request uses a PostgreSQL transaction and row locking; it marks the product sold, records the transaction and rejects other pending requests atomically
- Student dashboard for listings, incoming requests, own requests and transactions
- SQL schema with constraints, indexes, view, trigger, sample data and query demonstrations

## Requirements

- Node.js 18 or later
- PostgreSQL 14 or later
- pgAdmin (optional, useful for running SQL scripts)
- VS Code

## Setup on Windows

1. Install PostgreSQL and remember the password for the `postgres` database user.
2. Open pgAdmin and create a database named `student_marketplace`.
3. In pgAdmin, select that database and open **Tools → Query Tool**.
4. Open `database/schema.sql` in VS Code, copy its contents into Query Tool and execute.
5. Execute `database/seed.sql` the same way to add sample categories, demo users and product listings.
6. In VS Code, open the project folder and run:

   ```bash
   npm install
   ```

7. Copy `.env.example` to a new file named `.env`. Enter your PostgreSQL password and set a long random `JWT_SECRET`.
8. Start the app:

   ```bash
   npm run dev
   ```

9. Open `http://localhost:5000`.

## First login / demo flow

The seeded users are sample records with unusable placeholder password hashes. Do not try to log in as those users. Use **Login / Register → Register** to create two real accounts:
- Account A: create a listing (for example, a DBMS book).
- Account B: browse and send a request for that listing.
- Account A: open Dashboard → Incoming requests → Accept.
- Verify that the product becomes Sold and a transaction appears in both users' dashboards.

## Database scripts

- `database/schema.sql`: tables, constraints, trigger, indexes and `product_details` view.
- `database/seed.sql`: sample categories, users and products.
- `database/queries.sql`: more than 15 SQL demonstrations including joins, subquery, GROUP BY, HAVING, aggregates, view, window function, EXPLAIN ANALYZE, trigger test and ROLLBACK.

Run the query script in pgAdmin Query Tool after running the schema and seed scripts. Some statements intentionally modify demo data; read each comment before running. The trigger test is commented out because it is expected to fail.

## API overview

All routes are prefixed with `/api`.

| Method | Endpoint | Authentication | Purpose |
|---|---|---:|---|
| GET | `/health` | No | API/database health |
| POST | `/auth/register` | No | Register |
| POST | `/auth/login` | No | Login and receive JWT |
| GET | `/auth/me` | Yes | Current user |
| GET | `/products/categories` | No | Categories |
| GET | `/products` | No | Browse/search/filter |
| GET | `/products/:id` | No | Product detail |
| GET | `/products/mine` | Yes | My listings |
| POST | `/products` | Yes | Create listing |
| PUT | `/products/:id` | Yes | Update own available listing |
| DELETE | `/products/:id` | Yes | Delete eligible own listing |
| POST | `/requests` | Yes | Request a product |
| GET | `/requests/mine` | Yes | My outgoing requests |
| GET | `/requests/incoming` | Yes | Requests for my listings |
| PUT | `/requests/:id/accept` | Yes | Accept request and create transaction |
| PUT | `/requests/:id/reject` | Yes | Reject request |
| GET | `/transactions` | Yes | My transaction history |

For protected routes send `Authorization: Bearer YOUR_JWT_TOKEN`.

## Mandatory DBMS evidence checklist

- [x] Relational schema with primary and foreign keys
- [x] NOT NULL, UNIQUE and CHECK constraints
- [x] SQL CREATE, INSERT, UPDATE, DELETE and SELECT
- [x] INNER JOIN and LEFT JOIN
- [x] Subquery, GROUP BY, HAVING and aggregate functions
- [x] View
- [x] Transactions (COMMIT / ROLLBACK)
- [x] Indexes and EXPLAIN ANALYZE
- [x] Window function
- [x] Trigger
- [x] Seed data
- [x] More than 15 query examples
- [x] Backend API integration with PostgreSQL

## Normalization notes

The design separates users, categories, products, purchase requests, transactions and reviews. Category names are stored once in `categories`; seller and buyer details are stored in `users`; products and requests reference those rows using foreign keys. This avoids repeating descriptive data and supports 3NF for the stated project requirements.

## Known limitations

- This is an academic prototype, not a production marketplace.
- No real payment processing, delivery service, live chat or image upload.
- Contact exchange and in-person handover should be handled safely by students outside this prototype.
- JWT is stored in browser localStorage for simplicity; production applications should consider secure, HttpOnly cookies and additional security controls.
- Demo seed users cannot log in; register users through the application.
- Product photos are represented by category illustrations in this starter version.

## Future enhancements

- Product image upload and moderation
- College email verification
- Wishlist and saved searches
- Reviews after completed transactions
- Admin moderation dashboard
- Pagination and full-text search
- Notifications for request status changes
