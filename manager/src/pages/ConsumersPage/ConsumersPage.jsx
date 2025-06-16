import { useState, useEffect } from 'react';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import '../Orders/OrdersPage.css'; // используем те же стили

const ConsumersPage = () => {
  const [consumers, setConsumers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Модальное окно
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentConsumer, setCurrentConsumer] = useState({
    Id: null,
    first_name: '',
    last_name: '',
    middle_name: '',
    phone: '',
    email: '',
    address: '',
    date_of_registration: ''
  });

  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/consumers');
        if (!response.ok) throw new Error('Ошибка загрузки данных');
        const data = await response.json();
        setConsumers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Фильтрация по поиску
  const filteredConsumers = consumers.filter(c =>
    c.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  // Обработчики модального окна
  const openAddModal = () => {
    setCurrentConsumer({
      Id: null,
      first_name: '',
      last_name: '',
      middle_name: '',
      phone: '',
      email: '',
      address: '',
      date_of_registration: ''
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (consumer) => {
    setCurrentConsumer({ ...consumer });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentConsumer(prev => ({ ...prev, [name]: value }));
  };

  // Добавление или обновление клиента
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isEditing 
        ? `http://localhost:5000/api/consumers/${currentConsumer.Id}` 
        : `http://localhost:5000/api/consumers`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentConsumer)
      });

      if (!response.ok) throw new Error('Ошибка сохранения');

      const updated = await fetch('http://localhost:5000/api/consumers').then(res => res.json());
      setConsumers(updated);
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };

  // Удаление клиента
  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого клиента?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/consumers/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Ошибка удаления');

      const updated = await fetch('http://localhost:5000/api/consumers').then(res => res.json());
      setConsumers(updated);
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
        <h1>Клиенты</h1>
        <p>Список зарегистрированных потребителей</p>
      </section>

      <section className="dashboard">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>🔍 Поиск клиентов</h3>
            <input
              type="text"
              placeholder="Поиск по имени или телефону..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button onClick={openAddModal} className="btn-primary dashboard-card">
            ➕ Добавить нового клиента
          </button>
        </div>
      </section>

      <section className="description">
        <div className="orders-header">
          <h2>Список клиентов</h2>
          <div className="orders-count">
            Найдено: {filteredConsumers.length} клиентов
          </div>
        </div>

        <div className="orders-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>ФИО</th>
                <th>Телефон</th>
                <th>Email</th>
                <th>Адрес</th>
                <th>Дата регистрации</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredConsumers.length > 0 ? (
                filteredConsumers.map(consumer => (
                  <tr key={consumer.Id}>
                    <td>{consumer.Id}</td>
                    <td>{`${consumer.last_name} ${consumer.first_name} ${consumer.middle_name || ''}`}</td>
                    <td>{consumer.phone}</td>
                    <td>{consumer.email}</td>
                    <td>{consumer.address}</td>
                    <td>
                      {consumer.date_of_registration
                        ? new Date(consumer.date_of_registration).toLocaleDateString()
                        : ''}
                    </td>
                    <td>
                      <button
                        onClick={() => openEditModal(consumer)}
                        className="action-link"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDelete(consumer.Id)}
                        className="action-link"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-orders">
                    Клиенты не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Модальное окно добавления/редактирования */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{isEditing ? 'Редактировать клиента' : 'Добавить нового клиента'}</h2>
            <form onSubmit={handleSubmit} className="modal-content">
              <div className="form-section">
                <div className="form-group">
                  <label>Имя</label>
                  <input
                    type="text"
                    name="first_name"
                    value={currentConsumer.first_name || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Фамилия</label>
                  <input
                    type="text"
                    name="last_name"
                    value={currentConsumer.last_name || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Отчество</label>
                  <input
                    type="text"
                    name="middle_name"
                    value={currentConsumer.middle_name || ''}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Телефон</label>
                  <input
                    type="text"
                    name="phone"
                    value={currentConsumer.phone || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={currentConsumer.email || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Адрес</label>
                  <input
                    type="text"
                    name="address"
                    value={currentConsumer.address || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                {isEditing && (
                  <div className="form-group">
                    <label>Дата регистрации</label>
                    <input
                      type="date"
                      name="date_of_registration"
                      value={
                        currentConsumer.date_of_registration
                          ? new Date(currentConsumer.date_of_registration).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={handleChange}
                      disabled
                    />
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {isEditing ? 'Сохранить' : 'Добавить'}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary">
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

export default ConsumersPage;