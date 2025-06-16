import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import './OrdersPage.css';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState({
    products: [],
    delivery: {},
    warehouse: {}
  });
  const [formData, setFormData] = useState({
    products: [],
    deliveryService: '',
    warehouseId: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showTodayOrders, setShowTodayOrders] = useState(false);
  const [allProducts, setAllProducts] = useState([]);

  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, productsRes] = await Promise.all([
          fetch('http://localhost:5000/api/orders'),
          fetch('http://localhost:5000/api/products')
        ]);

        if (!ordersRes.ok || !productsRes.ok) {
          throw new Error('Network response was not ok');
        }

        const [ordersData, productsData] = await Promise.all([
          ordersRes.json(),
          productsRes.json()
        ]);

        setOrders(ordersData);
        setFilteredOrders(ordersData);
        setAllProducts(productsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Фильтрация заказов
  useEffect(() => {
    let result = [...orders];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(order => 
        order.id.toString().includes(term) ||
        order.customer.toLowerCase().includes(term) ||
        order.date.includes(term) ||
        order.status.toLowerCase().includes(term)
      );
    }
    
    if (showTodayOrders) {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(order => order.date === today);
    }
    
    setFilteredOrders(result);
  }, [searchTerm, showTodayOrders, orders]);

  // Загрузка деталей заказа
  const fetchOrderDetails = async (orderId) => {
    try {
      const [orderRes, productsRes, deliveryRes] = await Promise.all([
        fetch(`http://localhost:5000/api/orders/${orderId}`),
        fetch(`http://localhost:5000/api/orders/${orderId}/products`),
        fetch(`http://localhost:5000/api/orders/${orderId}/delivery`)
      ]);

      if (!orderRes.ok || !productsRes.ok || !deliveryRes.ok) {
        throw new Error('Failed to fetch order details');
      }

      const [order, products, delivery] = await Promise.all([
        orderRes.json(),
        productsRes.json(),
        deliveryRes.json()
      ]);

      setOrderDetails({
        ...order,
        products,
        delivery,
      });

      setFormData({
        products: products.map(p => ({
          productId: p.productId,
          name: p.name,
          quantity: p.quantity,
          price: p.price,
          unit: p.unit
        })),
      });
    } catch (err) {
      setError(err.message);
    }
  };

  // Добавление товара
  const handleAddProduct = () => {
    if (allProducts.length > 0) {
      setFormData(prev => ({
        ...prev,
        products: [
          ...prev.products,
          {
            productId: allProducts[0].id,
            name: allProducts[0].name,
            quantity: 1,
            price: allProducts[0].price,
            unit: allProducts[0].unit
          }
        ]
      }));
    }
  };

  // Удаление товара
  const handleRemoveProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  // Удаление заказа
  const handleDeleteOrder = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${selectedOrder.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete order');

      // Обновляем список заказов
      const ordersResponse = await fetch('http://localhost:5000/api/orders');
      const ordersData = await ordersResponse.json();
      setOrders(ordersData);
      setFilteredOrders(ordersData);
      
      setIsDeleteModalOpen(false);
      setIsViewModalOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  // Обработчики модальных окон
  const handleViewClick = async (order) => {
    setSelectedOrder(order);
    await fetchOrderDetails(order.id);
    setIsViewModalOpen(true);
  };

  const handleEditClick = async (order) => {
    setSelectedOrder(order);
    await fetchOrderDetails(order.id);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (order) => {
    setSelectedOrder(order);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsViewModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
  };

  // Обработчики изменений формы
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...formData.products];
    
    if (field === 'productId') {
      const selectedProduct = allProducts.find(p => p.id == value);
      if (selectedProduct) {
        updatedProducts[index].productId = value;
        updatedProducts[index].name = selectedProduct.name;
        updatedProducts[index].price = selectedProduct.price;
        updatedProducts[index].unit = selectedProduct.unit;
      }
    } else {
      updatedProducts[index][field] = field === 'quantity' || field === 'price' 
        ? parseInt(value) || 0 
        : value;
    }
    
    setFormData(prev => ({ ...prev, products: updatedProducts }));
  };

  // Отправка изменений
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: formData.products.map(p => ({
            Id_product: p.productId,
            quantity: p.quantity,
            price: p.price
          })),
          deliveryService: formData.deliveryService
        })
      });

      if (!response.ok) throw new Error('Failed to update order');

      // Обновляем данные
      const ordersResponse = await fetch('http://localhost:5000/api/orders');
      const ordersData = await ordersResponse.json();
      setOrders(ordersData);
      await fetchOrderDetails(selectedOrder.id);
      
      setIsEditModalOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  // Обработчики UI
  const handleSearch = (e) => setSearchTerm(e.target.value);
  const toggleTodayOrders = () => setShowTodayOrders(!showTodayOrders);

  if (loading) return <div className="loading">Загрузка данных...</div>;
  if (error) return <div className="error">Ошибка: {error}</div>;

  return (
    <div className="home-page">
      <Header />

      <section className="hero">
        <h1>Управление заказами</h1>
        <p>Просмотр, создание и редактирование заказов потребителей</p>
      </section>

      <section className="dashboard">
        <div className="dashboard-grid">
          <Link to="/new" className="dashboard-card">
            <h3>➕ Создать новый заказ</h3>
            <p>Ручное создание заказа</p>
          </Link>
          <div 
            className={`dashboard-card ${showTodayOrders ? 'active' : ''}`} 
            onClick={toggleTodayOrders}
          >
            <h3>📅 Заказы на сегодня</h3>
            <p>{showTodayOrders ? 'Скрыть' : 'Показать'} сегодняшние заказы</p>
          </div>
          <div className="dashboard-card">
            <h3>🔍 Поиск заказов</h3>
            <input
              type="text"
              placeholder="Поиск по номеру, клиенту..."
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
          </div>
        </div>
      </section>

      <section className="description">
        <div className="orders-header">
          <h2>Список заказов</h2>
          <div className="orders-count">
            Найдено: {filteredOrders.length} заказов
          </div>
        </div>
        <div className="orders-table">
          <table>
            <thead>
              <tr>
                <th>№ Заказа</th>
                <th>Потребитель</th>
                <th>Дата</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.customer}</td>
                    <td>{new Date(order.date).toLocaleDateString('ru-RU')}</td>
                    <td>{order.amount.toLocaleString()} ₽</td>
                    <td>
                      <span className={`status-badge status-${order.status.toLowerCase().replace(' ', '-')}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleViewClick(order)} 
                        className="action-link"
                      >
                        Просмотр
                      </button>
                      <button 
                        onClick={() => handleEditClick(order)} 
                        className="action-link"
                      >
                        Изменить
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(order)} 
                        className="action-link delete"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-orders">
                    Заказы не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Модальное окно просмотра */}
      {isViewModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Детали заказа #{selectedOrder.id}</h2>
            <div className="modal-content">
              <div className="order-section">
                <h3>Основная информация</h3>
                <p><strong>Потребитель:</strong> {selectedOrder.customer}</p>
                <p><strong>Дата:</strong> {new Date(selectedOrder.date).toLocaleDateString('ru-RU')}</p>
                <p><strong>Сумма:</strong> {selectedOrder.amount.toLocaleString()} ₽</p>
                <p><strong>Статус:</strong> {selectedOrder.status}</p>
              </div>

              <div className="order-section">
                <h3>Товары</h3>
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Товар</th>
                      <th>Количество</th>
                      <th>Цена</th>
                      <th>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderDetails.products.map((product, index) => (
                      <tr key={index}>
                        <td>{product.name}</td>
                        <td>{product.quantity} {product.unit}</td>
                        <td>{product.price} ₽</td>
                        <td>{product.price * product.quantity} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="order-section">
                <h3>Доставка</h3>
                <p><strong>Дата отгрузки:</strong> {orderDetails.delivery.dateFrom ? new Date(orderDetails.delivery.dateFrom).toLocaleDateString('ru-RU') : 'Не указана'}</p>
                <p><strong>Дата прибытия:</strong> {orderDetails.delivery.dateTo ? new Date(orderDetails.delivery.dateTo).toLocaleDateString('ru-RU') : 'Не указана'}</p>
              </div>

              <div className="modal-actions">
                <button 
                  onClick={() => handleDeleteClick(selectedOrder)} 
                  className="btn-delete"
                >
                  Удалить заказ
                </button>
                <button onClick={handleCloseModal} className="modal-close">Закрыть</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Редактирование заказа #{selectedOrder.id}</h2>
            <form onSubmit={handleSubmit} className="modal-content">
              <div className="form-section">
                <div className="form-section-header">
                  <h3>Товары</h3>
                  <button 
                    type="button" 
                    onClick={handleAddProduct}
                    className="btn-add-product"
                  >
                    + Добавить товар
                  </button>
                </div>
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Товар</th>
                      <th>Количество</th>
                      <th>Цена</th>
                      <th>Ед. изм.</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.products.map((product, index) => (
                      <tr key={index}>
                        <td>
                          <select
                            value={product.productId}
                            onChange={(e) => handleProductChange(index, 'productId', e.target.value)}
                          >
                            {allProducts.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={product.quantity}
                            onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                            min="1"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={product.price}
                            onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                            min="1"
                          />
                        </td>
                        <td>
                          {product.unit}
                        </td>
                        <td>
                          <button 
                            type="button"
                            onClick={() => handleRemoveProduct(index)}
                            className="btn-remove-product"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Сохранить изменения</button>
                <button type="button" onClick={handleCloseModal} className="btn-secondary">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal confirmation-modal">
            <h2>Подтверждение удаления</h2>
            <div className="modal-content">
              <p>Вы уверены, что хотите удалить заказ #{selectedOrder?.id}?</p>
              <p>Это действие нельзя отменить.</p>
              
              <div className="modal-actions">
                <button 
                  onClick={handleDeleteOrder}
                  className="btn-delete"
                >
                  Да, удалить
                </button>
                <button 
                  onClick={handleCloseModal}
                  className="btn-secondary11"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default OrdersPage;