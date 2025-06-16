import { useState, useEffect } from 'react';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import '../Orders/OrdersPage.css'; // используем те же стили

const WarehousePage = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/warehouse-products');
        if (!response.ok) throw new Error('Ошибка загрузки данных');
        const data = await response.json();
        setProducts(data);
        setFilteredProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Фильтрация и сортировка
  useEffect(() => {
    let result = [...products];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(product =>
        product.productName.toLowerCase().includes(term) ||
        product.warehouseAddress.toLowerCase().includes(term)
      );
    }

    if (showLowStockOnly) {
      result = result.filter(product => product.stockQuantity < product.minQuantity);
    }

    setFilteredProducts(result);
  }, [searchTerm, showLowStockOnly, products]);

  if (loading) return <div className="loading">Загрузка данных...</div>;
  if (error) return <div className="error">Ошибка: {error}</div>;

  return (
    <div className="home-page">
      <Header />

      <section className="hero">
        <h1>Склад</h1>
        <p>Информация о товарах на складе</p>
      </section>

      <section className="dashboard">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>🔍 Поиск товаров</h3>
            <input
              type="text"
              placeholder="Поиск по названию или адресу склада..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <br /><br />
            <button 
              className={`btn-secondary11 ${showLowStockOnly ? 'btn-primary' : ''}`}
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              style={{ width: '100%' }}
            >
              {showLowStockOnly ? 'Показывать всё' : 'ТОЛЬКО НЕДОСТАТОК'}
            </button>
          </div>
        </div>
      </section>

      <section className="description">
        <div className="orders-header">
          <h2>Товары на складе</h2>
          <div className="orders-count">
            Найдено: {filteredProducts.length} товаров
          </div>
        </div>

        <div className="orders-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Артикул</th>
                <th>Цена</th>
                <th>Единица измерения</th>
                <th>Количество</th>
                <th>Мин. кол-во</th>
                <th>Склад</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={`${product.warehouseId}-${product.productId}`}>
                    <td>{product.productId}</td>
                    <td>{product.productName}</td>
                    <td>{product.scu}</td>
                    <td>{product.price} ₽</td>
                    <td>{product.unit}</td>
                    <td className={product.stockQuantity < product.minQuantity ? 'stock-low' : 'stock-ok'}>
                      {product.stockQuantity}
                    </td>
                    <td>{product.minQuantity}</td>
                    <td>{product.warehouseAddress}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-orders">
                    Товары не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default WarehousePage;