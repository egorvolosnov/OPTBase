import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import './SuppliesPage.css';

const SuppliesPage = () => {
  const [supplies, setSupplies] = useState([]);
  const [filteredSupplies, setFilteredSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [sortOrder, setSortOrder] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'заказан',
    products: [],
    totalCost: 0
  });

  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliesRes, suppliersRes, productsRes] = await Promise.all([
          fetch('http://localhost:5000/api/supplies'),
          fetch('http://localhost:5000/api/suppliers'),
          fetch('http://localhost:5000/api/products')
        ]);

        if (!suppliesRes.ok || !suppliersRes.ok || !productsRes.ok) {
          throw new Error('Network response was not ok');
        }

        const [suppliesData, suppliersData, productsData] = await Promise.all([
          suppliesRes.json(),
          suppliersRes.json(),
          productsRes.json()
        ]);

        setSupplies(suppliesData);
        setFilteredSupplies(suppliesData);
        setSuppliers(suppliersData);
        setProducts(productsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Сортировка и фильтрация поставок
  useEffect(() => {
    let sorted = [...supplies];
    
    // Фильтрация по статусу
    if (statusFilter !== 'all') {
      sorted = sorted.filter(supply => supply.status === statusFilter);
    }
    
    // Сортировка по дате
    if (sortOrder === 'newest') {
      sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else {
      sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    
    setFilteredSupplies(sorted);
  }, [sortOrder, statusFilter, supplies]);

  // Удаление поставки
  const handleDeleteSupply = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить эту поставку?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/supplies/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete supply');

        // Обновляем список поставок
        const updatedSupplies = supplies.filter(supply => supply.id !== id);
        setSupplies(updatedSupplies);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // Добавление товара в новую поставку
  const handleAddProduct = () => {
    if (products.length > 0) {
      setFormData(prev => ({
        ...prev,
        products: [
          ...prev.products,
          {
            productId: products[0].id,
            name: products[0].name,
            quantity: 1,
            price: products[0].price,
            unit: products[0].unit
          }
        ],
        totalCost: prev.totalCost + products[0].price
      }));
    }
  };

  // Удаление товара из новой поставки
  const handleRemoveProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
      totalCost: prev.totalCost - (prev.products[index].price * prev.products[index].quantity)
    }));
  };

  // Изменение данных формы
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Изменение данных товара в форме
  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...formData.products];
    const oldTotal = formData.totalCost;
    let newTotal = oldTotal;

    if (field === 'productId') {
      const selectedProduct = products.find(p => p.id == value);
      if (selectedProduct) {
        newTotal -= updatedProducts[index].price * updatedProducts[index].quantity;
        updatedProducts[index] = {
          ...updatedProducts[index],
          productId: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          unit: selectedProduct.unit
        };
        newTotal += selectedProduct.price * updatedProducts[index].quantity;
      }
    } else {
      const numericValue = field === 'quantity' || field === 'price' ? parseInt(value) || 0 : value;
      newTotal -= updatedProducts[index].price * updatedProducts[index].quantity;
      updatedProducts[index][field] = numericValue;
      newTotal += updatedProducts[index].price * updatedProducts[index].quantity;
    }

    setFormData({
      ...formData,
      products: updatedProducts,
      totalCost: newTotal
    });
  };

  // Создание новой поставки
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/supplies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplierId: formData.supplierId,
          date: formData.date,
          status: formData.status,
          products: formData.products.map(p => ({
            productId: p.productId,
            quantity: p.quantity,
            price: p.price
          })),
          totalCost: formData.totalCost
        })
      });

      if (!response.ok) throw new Error('Failed to create supply');

      const suppliesResponse = await fetch('http://localhost:5000/api/supplies');
      const suppliesData = await suppliesResponse.json();
      setSupplies(suppliesData);
      
      setIsAddModalOpen(false);
      setFormData({
        supplierId: '',
        date: new Date().toISOString().split('T')[0],
        status: 'заказан',
        products: [],
        totalCost: 0
      });
    } catch (err) {
      setError(err.message);
    }
  };

  // Просмотр деталей поставки
  const handleViewClick = async (supply) => {
    try {
      const response = await fetch(`http://localhost:5000/api/supplies/${supply.id}/products`);
      if (!response.ok) throw new Error('Failed to fetch supply details');
      
      const productsData = await response.json();
      setSelectedSupply({
        ...supply,
        products: productsData
      });
      setIsViewModalOpen(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Загрузка данных...</div>;
  if (error) return <div className="error">Ошибка: {error}</div>;

  return (
    <div className="home-page">
      <Header />

      <section className="hero">
        <h1>Управление поставками</h1>
        <p>Просмотр, создание и управление поставками товаров</p>
      </section>

      <section className="dashboard">
        <div className="dashboard-grid">
          <div 
            className="dashboard-card"
            onClick={() => setIsAddModalOpen(true)}
          >
            <h3>➕ Новая поставка</h3>
            <p>Создать новую поставку товаров</p>
          </div>
          <div className="dashboard-card">
            <h3>🔍 Сортировка</h3>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Сначала новые</option>
              <option value="oldest">Сначала старые</option>
            </select>
          </div>
          <div className="dashboard-card">
            <h3>📦 Фильтр по статусу</h3>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="sort-select"
            >
              <option value="all">Все статусы</option>
              <option value="заказан">Заказан</option>
              <option value="отправлен">Отправлен</option>
              <option value="доставлен">Доставлен</option>
              <option value="отменен">Отменен</option>
            </select>
          </div>
        </div>
      </section>

      <section className="description">
        <div className="supplies-header">
          <h2>Список поставок</h2>
          <div className="supplies-count">
            Всего: {filteredSupplies.length} поставок
          </div>
        </div>
        <div className="supplies-table">
          <table>
            <thead>
              <tr>
                <th>№ Поставки</th>
                <th>Поставщик</th>
                <th>Дата</th>
                <th>Статус</th>
                <th>Сумма</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredSupplies.length > 0 ? (
                filteredSupplies.map(supply => (
                  <tr key={supply.id}>
                    <td>{supply.id}</td>
                    <td>{supply.supplierName}</td>
                    <td>{new Date(supply.date).toLocaleDateString('ru-RU')}</td>
                    <td>
                      <span className={`status-badge status-${supply.status.toLowerCase()}`}>
                        {supply.status}
                      </span>
                    </td>
                    <td>{typeof supply.totalCost === 'number' ? supply.totalCost.toLocaleString() : '—'} ₽</td>
                    <td className="actions-cell">
                      <button 
                        onClick={() => handleViewClick(supply)} 
                        className="action-link view-btn"
                      >
                        Просмотр
                      </button>
                      <button 
                        onClick={() => handleDeleteSupply(supply.id)}
                        className="action-link delete-btn"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-supplies">
                    Поставки не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Модальное окно просмотра поставки */}
      {isViewModalOpen && selectedSupply && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Детали поставки #{selectedSupply.id}</h2>
            <div className="modal-content">
              <div className="supply-section">
                <h3>Основная информация</h3>
                <p><strong>Поставщик:</strong> {selectedSupply.supplierName}</p>
                <p><strong>Дата:</strong> {new Date(selectedSupply.date).toLocaleDateString('ru-RU')}</p>
                <p><strong>Статус:</strong> {selectedSupply.status}</p>
                <p><strong>Общая сумма:</strong> {typeof selectedSupply.totalCost === 'number' ? selectedSupply.totalCost.toLocaleString() : '—'} ₽</p>
              </div>

              <div className="supply-section">
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
                    {selectedSupply.products.map((product, index) => (
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
            </div>
            <button 
              onClick={() => setIsViewModalOpen(false)} 
              className="modal-close"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно добавления поставки */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Создание новой поставки</h2>
            <form onSubmit={handleSubmit} className="modal-content">
              <div className="form-section">
                <div className="form-group">
                  <label>Поставщик:</label>
                  <select
                    name="supplierId"
                    value={formData.supplierId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Выберите поставщика</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.Id} value={supplier.Id}>
                        {supplier.name} ({supplier.first_name} {supplier.last_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Дата поставки:</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Статус:</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="заказан">Заказан</option>
                    <option value="отправлен">Отправлен</option>
                    <option value="доставлен">Доставлен</option>
                    <option value="отменен">Отменен</option>
                  </select>
                </div>
              </div>

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
                      <th>Сумма</th>
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
                            required
                          >
                            {products.map(p => (
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
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={product.price}
                            onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                            min="1"
                            required
                          />
                        </td>
                        <td>
                          {product.price * product.quantity} ₽
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

              <div className="form-section total-cost">
                <h3>Общая сумма: {formData.totalCost.toLocaleString()} ₽</h3>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={formData.products.length === 0 || !formData.supplierId}
                >
                  Создать поставку
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setFormData({
                      supplierId: '',
                      date: new Date().toISOString().split('T')[0],
                      status: 'заказан',
                      products: [],
                      totalCost: 0
                    });
                  }}
                  className="btn-secondary"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default SuppliesPage;