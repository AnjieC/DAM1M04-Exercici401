DROP DATABASE IF EXISTS tienda_pokemon;
CREATE DATABASE tienda_pokemon;
USE tienda_pokemon;

-- =========================================
-- TABLAS
-- =========================================

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,
  sale_date DATE,
  payment_method VARCHAR(50),
  total DECIMAL(10,2),

  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT,
  product_id INT,
  qty INT,
  unit_price DECIMAL(10,2),
  line_total DECIMAL(10,2),

  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);


-- =========================================
-- PRODUCTOS
-- =========================================

INSERT INTO products (name, category, price, stock, active) VALUES
('Poké Ball', 'Poké Balls', 200, 100, true),
('Super Ball', 'Poké Balls', 600, 80, true),
('Ultra Ball', 'Poké Balls', 1200, 60, true),
('Master Ball', 'Poké Balls', 0, 1, true),

('Poción', 'Medicina', 300, 50, true),
('Super Poción', 'Medicina', 700, 40, true),
('Hiper Poción', 'Medicina', 1200, 30, true),
('Poción Máxima', 'Medicina', 2500, 20, true),

('Revivir', 'Medicina', 1500, 15, true),
('Revivir Máximo', 'Medicina', 4000, 10, true),
('Antídoto', 'Medicina', 100, 70, true),
('Antiparalizador', 'Medicina', 200, 60, true),
('Despertar', 'Medicina', 250, 50, true),
('Cura Total', 'Medicina', 600, 40, true),

('Caramelo Raro', 'Objetos', 5000, 10, true),
('Repelente', 'Objetos', 350, 60, true),
('Super Repelente', 'Objetos', 500, 50, true),
('Max Repelente', 'Objetos', 700, 40, true),

('Piedra Fuego', 'Evolución', 2100, 5, true),
('Piedra Agua', 'Evolución', 2100, 5, true),
('Piedra Trueno', 'Evolución', 2100, 5, true),
('Piedra Hoja', 'Evolución', 2100, 5, true),
('Piedra Lunar', 'Evolución', 0, 3, true),

('Restaurar Todo', 'Medicina', 3000, 10, true),
('Éter', 'Medicina', 1200, 15, true),
('Elixir', 'Medicina', 3000, 10, true);


-- =========================================
-- CLIENTES (25)
-- =========================================

INSERT INTO customers (name, email, phone) VALUES
('Ash Ketchum', 'ash@pokemon.com', '600000001'),
('Misty', 'misty@pokemon.com', '600000002'),
('Brock', 'brock@pokemon.com', '600000003'),
('Gary Oak', 'gary@pokemon.com', '600000004'),
('May', 'may@pokemon.com', '600000005'),
('Dawn', 'dawn@pokemon.com', '600000006'),
('Serena', 'serena@pokemon.com', '600000007'),
('Iris', 'iris@pokemon.com', '600000008'),
('Cynthia', 'cynthia@pokemon.com', '600000009'),
('Leon', 'leon@pokemon.com', '600000010'),
('Red', 'red@pokemon.com', '600000011'),
('Blue', 'blue@pokemon.com', '600000012'),
('Lance', 'lance@pokemon.com', '600000013'),
('Steven', 'steven@pokemon.com', '600000014'),
('Wallace', 'wallace@pokemon.com', '600000015'),
('N', 'n@pokemon.com', '600000016'),
('Rosa', 'rosa@pokemon.com', '600000017'),
('Hilbert', 'hilbert@pokemon.com', '600000018'),
('Gloria', 'gloria@pokemon.com', '600000019'),
('Victor', 'victor@pokemon.com', '600000020'),
('Nemona', 'nemona@pokemon.com', '600000021'),
('Arven', 'arven@pokemon.com', '600000022'),
('Penny', 'penny@pokemon.com', '600000023'),
('Professor Oak', 'oak@pokemon.com', '600000024'),
('Professor Elm', 'elm@pokemon.com', '600000025');


-- =========================================
-- VENTAS
-- =========================================

INSERT INTO sales (customer_id, sale_date, payment_method, total) VALUES
(1, '2026-01-01', 'card', 1400),
(2, '2026-01-02', 'cash', 700),
(3, '2026-01-03', 'card', 3000),
(4, '2026-01-04', 'card', 2100),
(5, '2026-01-05', 'cash', 500);


-- =========================================
-- DETALLE DE VENTAS
-- =========================================

INSERT INTO sale_items (sale_id, product_id, qty, unit_price, line_total) VALUES
(1, 3, 1, 1200, 1200),
(1, 11, 2, 100, 200),

(2, 6, 1, 700, 700),

(3, 8, 1, 2500, 2500),
(3, 12, 1, 200, 200),

(4, 19, 1, 2100, 2100),

(5, 16, 1, 350, 350),
(5, 11, 1, 100, 100);