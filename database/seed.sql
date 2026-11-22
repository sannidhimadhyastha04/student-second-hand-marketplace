-- Demo data only. Passwords here are intentionally unusable placeholders.
-- Register real users through the application to create valid bcrypt hashes.

INSERT INTO categories (category_name) VALUES
('Books'), ('Electronics'), ('Stationery'), ('Lab Equipment'), ('Others')
ON CONFLICT (category_name) DO NOTHING;

-- Demo users: replace password_hash values with bcrypt hashes if testing login.
INSERT INTO users (name, email, password_hash, phone, department) VALUES
('Aarav Sharma','aarav@example.edu','not-a-login-hash','9000000001','ISE'),
('Ananya Rao','ananya@example.edu','not-a-login-hash','9000000002','CSE'),
('Rahul Kumar','rahul@example.edu','not-a-login-hash','9000000003','ECE'),
('Priya Shetty','priya@example.edu','not-a-login-hash','9000000004','ISE'),
('Kiran Das','kiran@example.edu','not-a-login-hash','9000000005','CSE'),
('Meera Nair','meera@example.edu','not-a-login-hash','9000000006','AIML'),
('Vikram Pai','vikram@example.edu','not-a-login-hash','9000000007','EEE'),
('Diya Hegde','diya@example.edu','not-a-login-hash','9000000008','ISE'),
('Arjun Rao','arjun@example.edu','not-a-login-hash','9000000009','ME'),
('Nisha Bhat','nisha@example.edu','not-a-login-hash','9000000010','CSE'),
('Rohan Shetty','rohan@example.edu','not-a-login-hash','9000000011','ECE'),
('Isha Kumar','isha@example.edu','not-a-login-hash','9000000012','ISE'),
('Sahil Jain','sahil@example.edu','not-a-login-hash','9000000013','CIVIL'),
('Tara Das','tara@example.edu','not-a-login-hash','9000000014','AIML'),
('Neel Patil','neel@example.edu','not-a-login-hash','9000000015','EEE')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (seller_id, category_id, product_name, description, price, condition) VALUES
(1,1,'DBMS Textbook','Database management systems textbook',200,'Good'),
(2,1,'Python Programming','Beginner Python reference book',250,'Like New'),
(3,2,'Scientific Calculator','Casio scientific calculator',500,'Good'),
(4,3,'Engineering Drawing Kit','Basic drawing instruments',150,'Fair'),
(5,4,'Breadboard Kit','Electronics lab breadboard kit',300,'Like New'),
(6,1,'Operating Systems Book','Operating systems textbook',220,'Good'),
(7,2,'USB Keyboard','Wired USB keyboard',350,'Good'),
(8,3,'Notebook Bundle','Five unused notebooks',100,'New'),
(9,4,'Digital Multimeter','Student lab multimeter',650,'Good'),
(10,1,'Computer Networks Book','Computer networking textbook',280,'Like New'),
(11,2,'Wireless Mouse','USB wireless mouse',250,'Good'),
(12,3,'Drawing Sheets','Pack of engineering drawing sheets',80,'New'),
(13,4,'Soldering Iron','Basic soldering iron',400,'Fair'),
(14,1,'Java Programming Book','Core Java study book',180,'Good'),
(15,5,'Laptop Stand','Foldable laptop stand',450,'Like New'),
(1,2,'HDMI Cable','One metre HDMI cable',120,'Good'),
(2,3,'Scientific Notebook','Lab record notebook',60,'New'),
(3,1,'Data Structures Book','DSA textbook',300,'Good'),
(4,5,'Backpack','Used college backpack',350,'Fair'),
(5,2,'Headphones','Wired headphones',275,'Good'),
(6,3,'Geometry Box','Engineering geometry tools',90,'Like New'),
(7,4,'Arduino Starter Parts','Basic project components',550,'Good'),
(8,1,'Computer Organization Book','COA reference book',210,'Good'),
(9,5,'Desk Lamp','LED study lamp',320,'Like New'),
(10,2,'Pendrive 32GB','USB storage device',200,'Good');

-- Requests and transactions are intentionally not seeded so students can
-- demonstrate the workflow through two registered application accounts.
