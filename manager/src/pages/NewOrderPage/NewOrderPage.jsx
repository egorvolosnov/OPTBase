import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import './NewOrderPage.css';

const NewOrderPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    customerId: '',
    managerId: '',
    payType: 'наличные',
    deliveryService: 'СДЭК',
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    products: [],
    totalAmount: 0
  });

  // Загрузка данных при монтировании
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersRes, productsRes, managersRes] = await Promise.all([
          fetch('http://localhost:5000/api/customers'),
          fetch('http://localhost:5000/api/products'),
          fetch('http://localhost:5000/api/managers')
        ]);

        if (!customersRes.ok || !productsRes.ok || !managersRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [customersData, productsData, managersData] = await Promise.all([
          customersRes.json(),
          productsRes.json(),
          managersRes.json()
        ]);

        setCustomers(customersData);
        setProducts(productsData);
        setManagers(managersData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Обработчики изменений формы
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProductSelect = (e) => {
    const productId = parseInt(e.target.value);
    if (productId && !formData.products.find(p => p.productId === productId)) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setFormData(prev => ({
          ...prev,
          products: [
            ...prev.products,
            {
              productId: product.id,
              name: product.name,
              quantity: 1,
              price: product.price,
              unit: product.unit
            }
          ],
          totalAmount: prev.totalAmount + product.price
        }));
      }
    }
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...formData.products];
    const oldValue = updatedProducts[index][field];
    updatedProducts[index][field] = value;

    // Пересчет общей суммы
    let newTotal = 0;
    if (field === 'quantity' || field === 'price') {
      updatedProducts.forEach(p => {
        newTotal += p.quantity * p.price;
      });
    } else {
      newTotal = formData.totalAmount;
    }

    setFormData(prev => ({
      ...prev,
      products: updatedProducts,
      totalAmount: newTotal
    }));
  };

  const removeProduct = (index) => {
    const updatedProducts = [...formData.products];
    const removedProduct = updatedProducts.splice(index, 1)[0];
    
    setFormData(prev => ({
      ...prev,
      products: updatedProducts,
      totalAmount: prev.totalAmount - (removedProduct.quantity * removedProduct.price)
    }));
  };

  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customerId || !formData.managerId || formData.products.length === 0) {
      setError('Пожалуйста, заполните все обязательные поля и добавьте хотя бы один товар');
      return;
    }

    try {
      // Сначала создаем документ доставки
      const docDeliveryResponse = await fetch('http://localhost:5000/api/docs-del', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          signature_base: false,
          signature_cun: false
        })
      });

      if (!docDeliveryResponse.ok) throw new Error('Failed to create delivery document');

      const docDeliveryData = await docDeliveryResponse.json();

      // Затем создаем доставку
      const deliveryResponse = await fetch('http://localhost:5000/api/deliveries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Id_doc_del: docDeliveryData.id,
          date_from: formData.dateFrom,
          date_to: formData.dateTo
        })
      });

      if (!deliveryResponse.ok) throw new Error('Failed to create delivery');

      const deliveryData = await deliveryResponse.json();

      // Затем создаем заказ
      const orderResponse = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Id_customer: parseInt(formData.customerId),
          Id_delivery: deliveryData.id,
          Id_manager: parseInt(formData.managerId),
          date: new Date().toISOString().split('T')[0],
          status: 'новый',
          sum: formData.totalAmount,
          pay_type: formData.payType
        })
      });

      if (!orderResponse.ok) throw new Error('Failed to create order');

      const orderData = await orderResponse.json();

      // Добавляем товары в заказ
      for (const product of formData.products) {
        await fetch('http://localhost:5000/api/order-product', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Id_order: orderData.id,
            Id_product: product.productId,
            quantity: product.quantity,
            sail: 0
          })
        });
      }

      // Перенаправляем на страницу заказов
      navigate('/orders');
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
      <h1>Создание нового заказа</h1>
      <p>Заполните форму для оформления нового заказа</p>
    </section>
    <section className="new-order-form1">
      <form onSubmit={handleSubmit}>
        <div className="form-section1">
          <h3>Основная информация</h3>
          <div className="form-row1">
            <div className="form-group1">
              <label>Потребитель <span className="required1">*</span></label>
              <select
                name="customerId"
                value={formData.customerId}
                onChange={handleInputChange}
                required
              >
                <option value="">Выберите потребителя</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.last_name} {customer.first_name} ({customer.phone})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group1">
              <label>Менеджер <span className="required1">*</span></label>
              <select
                name="managerId"
                value={formData.managerId}
                onChange={handleInputChange}
                required
              >
                <option value="">Выберите менеджера</option>
                {managers.map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.last_name} {manager.first_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row1">
            <div className="form-group1">
              <label>Способ оплаты</label>
              <select
                name="payType"
                value={formData.payType}
                onChange={handleInputChange}
              >
                <option value="наличные">Наличные</option>
                <option value="карта">Банковская карта</option>
                <option value="перевод">Банковский перевод</option>
              </select>
            </div>
            <div className="form-group1">
              <label>Общая сумма</label>
              <input
                type="text"
                value={formData.totalAmount.toLocaleString() + ' ₽'}
                readOnly
                className="readonly"
              />
            </div>
          </div>
        </div>
        <div className="form-section1">
          <h3>Товары</h3>
          <div className="form-group1">
            <label>Добавить товар</label>
            <div className="product-select-container1">
              <select
                onChange={handleProductSelect}
                value=""
              >
                <option value="">Выберите товар</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.price} ₽/{product.unit})
                  </option>
                ))}
              </select>
              <button 
                type="button" 
                className="btn-add1"
                onClick={() => document.querySelector('.product-select-container1 select').focus()}
              >
                Добавить
              </button>
            </div>
          </div>
          {formData.products.length > 0 && (
            <table className="products-table1">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Количество</th>
                  <th>Цена</th>
                  <th>Сумма</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {formData.products.map((product, index) => (
                  <tr key={index}>
                    <td>{product.name}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={product.quantity}
                        onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      /> {product.unit}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={product.price}
                        onChange={(e) => handleProductChange(index, 'price', parseInt(e.target.value) || 0)}
                      /> ₽
                    </td>
                    <td>{(product.quantity * product.price).toLocaleString()} ₽</td>
                    <td>
                      <button 
                        type="button" 
                        className="btn-remove1"
                        onClick={() => removeProduct(index)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="form-section1">
          <h3>Доставка</h3>
          <div className="form-row1">
            <div className="form-group1">
              <label>Дата отгрузки</label>
              <input
                type="date"
                name="dateFrom"
                value={formData.dateFrom}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group1">
              <label>Дата доставки</label>
              <input
                type="date"
                name="dateTo"
                value={formData.dateTo}
                onChange={handleInputChange}
                min={formData.dateFrom}
              />
            </div>
          </div>
        </div>
        {error && <div className="form-error1">{error}</div>}
        <div className="form-actions1">
          <button type="submit" className="btn-primary1">Создать заказ</button>
          <button 
            type="button" 
            className="btn-secondary1"
            onClick={() => navigate('/orders')}
          >
            Отмена
          </button>
        </div>
      </form>
    </section>
    <Footer />
  </div>
);
};

export default NewOrderPage;