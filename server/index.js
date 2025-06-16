// server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Создание пула соединений с MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'wholesale_base',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.get('/api/orders', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        o.id, 
        o.date,
        o.status, 
        o.sum as amount,
        o.pay_type,
        CONCAT(c.first_name, ' ', c.last_name) as customer,
        CONCAT(m.first_name, ' ', m.last_name) as manager,
        d.date_from as delivery_date_from,
        d.date_to as delivery_date_to
      FROM orders o
      JOIN consumers c ON o.Id_customer = c.id
      JOIN managers m ON o.Id_manager = m.id
      JOIN deliveries d ON o.Id_delivery = d.id
      ORDER BY o.date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получение деталей конкретного заказа
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [order] = await pool.query(`
      SELECT 
        o.*,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.phone as customer_phone,
        c.address as customer_address,
        CONCAT(m.first_name, ' ', m.last_name) as manager_name,
        d.date_from, d.date_to
      FROM orders o
      JOIN consumers c ON o.Id_customer = c.id
      JOIN managers m ON o.Id_manager = m.id
      JOIN deliveries d ON o.Id_delivery = d.id
      WHERE o.id = ?
    `, [id]);
    
    if (!order.length) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});
// Получение товаров в заказе (убрана информация о складе)
app.get('/api/orders/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    const [products] = await pool.query(`
      SELECT 
        op.Id_product as productId,
        p.name,
        p.scu,
        op.quantity,
        op.sail as discount,
        p.price,
        (p.price * (1 - op.sail/100)) as final_price,
        p.unit
      FROM order_product op
      JOIN products p ON op.Id_product = p.id
      WHERE op.Id_order = ?
    `, [id]);
    
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получение информации о доставке
app.get('/api/orders/:id/delivery', async (req, res) => {
  try {
    const { id } = req.params;
    const [delivery] = await pool.query(`
      SELECT 
        d.*,
        dd.date as docDate
      FROM deliveries d
      JOIN docs_del dd ON d.Id_doc_del = dd.id
      JOIN orders o ON d.id = o.Id_delivery
      WHERE o.id = ?
    `, [id]);
    
    if (!delivery.length) {
      return res.json({});
    }
    
    res.json({
      service: "СДЭК",
      dateFrom: delivery[0].date_from,
      dateTo: delivery[0].date_to
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Обновление заказа (убрана информация о складе)
app.put('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { products, deliveryService } = req.body;

    // Начало транзакции
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Обновление товаров в заказе
      await connection.query('DELETE FROM order_product WHERE Id_order = ?', [id]);
      
      for (const product of products) {
        await connection.query(`
          INSERT INTO order_product (Id_order, Id_product, quantity, price)
          VALUES (?, ?, ?, ?)
        `, [id, product.productId, product.quantity, product.price]);
      }

      // Фиксация транзакции
      await connection.commit();
      res.json({ success: true });
    } catch (err) {
      // Откат транзакции при ошибке
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ------------------------------------
//новый заказ 

// Получение списка клиентов
app.get('/api/customers', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        Id as id,
        first_name,
        last_name,
        phone
      FROM consumers
      ORDER BY last_name, first_name
    `);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получение списка менеджеров
app.get('/api/managers', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        Id as id,
        first_name,
        last_name
      FROM managers
      ORDER BY last_name, first_name
    `);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получение списка продуктов
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        Id as id,
        name,
        price,
        unit
      FROM products
      ORDER BY name
    `);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Создание документа доставки
app.post('/api/docs-del', async (req, res) => {
  try {
    const { date, signature_base, signature_cun } = req.body;
    const [result] = await pool.query(`
      INSERT INTO docs_del (date, signature_base, signature_cun)
      VALUES (?, ?, ?)
    `, [date, signature_base || false, signature_cun || false]);
    
    res.json({ id: result.insertId });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Создание доставки
app.post('/api/deliveries', async (req, res) => {
  try {
    const { Id_doc_del, date_from, date_to } = req.body;
    const [result] = await pool.query(`
      INSERT INTO deliveries (Id_doc_del, date_from, date_to)
      VALUES (?, ?, ?)
    `, [Id_doc_del, date_from, date_to]);
    
    res.json({ id: result.insertId });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Создание заказа
app.post('/api/orders', async (req, res) => {
  try {
    const { Id_customer, Id_delivery, Id_manager, date, status, sum, pay_type } = req.body;
    const [result] = await pool.query(`
      INSERT INTO orders (Id_customer, Id_delivery, Id_manager, date, status, sum, pay_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [Id_customer, Id_delivery, Id_manager, date, status || 'новый', sum, pay_type]);
    
    res.json({ id: result.insertId });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Добавление товара в заказ
app.post('/api/order-product', async (req, res) => {
  try {
    const { Id_order, Id_product, quantity, sail } = req.body;
    await pool.query(`
      INSERT INTO order_product (Id_order, Id_product, quantity, sail)
      VALUES (?, ?, ?, ?)
    `, [Id_order, Id_product, quantity, sail || 0]);
    
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE endpoint для удаления заказа
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Начинаем транзакцию
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Удаляем связанные товары в заказе
      await connection.query('DELETE FROM order_product WHERE Id_order = ?', [id]);
      
      // Удаляем сам заказ
      await connection.query('DELETE FROM orders WHERE id = ?', [id]);
      
      // Коммитим транзакцию
      await connection.commit();
      res.json({ success: true });
    } catch (err) {
      // Откатываем транзакцию при ошибке
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});
// ------------------------------------
//Склад 

// Получение всех товаров на складе
app.get('/api/warehouse-products', async (req, res) => {
  try {
    const query = `
      SELECT 
        wp.Id_warehouse as warehouseId,
        w.address as warehouseAddress,
        p.Id as productId,
        p.name as productName,
        p.scu,
        p.price,
        p.unit,
        wp.quantity as stockQuantity,
        p.min_quantity as minQuantity
      FROM warehouse_product wp
      JOIN products p ON wp.Id_product = p.Id
      JOIN warehouses w ON wp.Id_warehouse = w.Id
      ORDER BY w.address, p.name
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

//--------------------------------
//Клиент 
// Получение списка клиентов
app.get('/api/consumers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM consumers ORDER BY last_name, first_name');
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Добавить клиента
app.post('/api/consumers', async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      middle_name,
      phone,
      email,
      address,
      date_of_registration = new Date().toISOString().split('T')[0]
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO consumers (first_name, last_name, middle_name, phone, email, address, date_of_registration)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, middle_name, phone, email, address, null]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Редактировать клиента
app.put('/api/consumers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      middle_name,
      phone,
      email,
      address
    } = req.body;

    await pool.query(
      `UPDATE consumers SET first_name = ?, last_name = ?, middle_name = ?, phone = ?, email = ?, address = ?
       WHERE Id = ?`,
      [first_name, last_name, middle_name, phone, email, address, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Удалить клиента
app.delete('/api/consumers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM consumers WHERE Id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Обновленный server.js с правильными запросами для заказов

// Получение списка поставок
// In your /api/supplies endpoint, ensure total_cost is included
app.get('/api/supplies', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.Id as id,
        s.date,
        s.status,
        s.total_cost as totalCost,
        sup.name as supplierName,
        CONCAT(sup.first_name, ' ', sup.last_name) as contactPerson
      FROM supplies s
      JOIN suppliers sup ON s.Id_supplier = sup.Id
      ORDER BY s.date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получение товаров в поставке
app.get('/api/supplies/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT 
        p.Id as productId,
        p.name,
        sp.quantity,
        sp.price,
        p.unit
      FROM supply_product sp
      JOIN products p ON sp.Id_product = p.Id
      WHERE sp.Id_supply = ?
    `, [id]);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Создание новой поставки
app.post('/api/supplies', async (req, res) => {
  try {
    const { supplierId, date, status, products, totalCost } = req.body;
    
    // Начинаем транзакцию
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Создаем документ поставки
      const [docResult] = await connection.query(
        'INSERT INTO docs_sup (date) VALUES (?)',
        [new Date().toISOString().split('T')[0]]
      );
      const docId = docResult.insertId;

      // Создаем поставку
      const [supplyResult] = await connection.query(
        'INSERT INTO supplies (Id_supplier, Id_doc_sup, date, status, total_cost) VALUES (?, ?, ?, ?, ?)',
        [supplierId, docId, date, status, totalCost]
      );
      const supplyId = supplyResult.insertId;

      // Добавляем товары
      for (const product of products) {
        await connection.query(
          'INSERT INTO supply_product (Id_supply, Id_product, quantity, price) VALUES (?, ?, ?, ?)',
          [supplyId, product.productId, product.quantity, product.price]
        );
      }

      // Коммитим транзакцию
      await connection.commit();
      res.json({ success: true, id: supplyId });
    } catch (err) {
      // Откатываем транзакцию при ошибке
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получение списка поставщиков
app.get('/api/suppliers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM suppliers');
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Добавьте этот endpoint для удаления поставки
app.delete('/api/supplies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Начинаем транзакцию
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Удаляем связанные товары в поставке
      await connection.query('DELETE FROM supply_product WHERE Id_supply = ?', [id]);
      
      // Получаем Id документа поставки
      const [supply] = await connection.query('SELECT Id_doc_sup FROM supplies WHERE Id = ?', [id]);
      
      if (supply.length === 0) {
        return res.status(404).json({ error: 'Supply not found' });
      }
      
      const docId = supply[0].Id_doc_sup;
      
      // Удаляем саму поставку
      await connection.query('DELETE FROM supplies WHERE Id = ?', [id]);
      
      // Удаляем документ поставки
      await connection.query('DELETE FROM docs_sup WHERE Id = ?', [docId]);
      
      // Коммитим транзакцию
      await connection.commit();
      res.json({ success: true });
    } catch (err) {
      // Откатываем транзакцию при ошибке
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

