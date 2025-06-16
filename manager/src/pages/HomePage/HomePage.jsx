import { Link } from 'react-router-dom';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import './HomePage.css'; // Стили (создадим ниже)

const HomePage = () => {
  return (
    <div className="home-page">
       <Header/>

      {/* Приветственный блок */}
      <section className="hero">
        <h1>Добро пожаловать в систему управления оптовой базой</h1>
        <p>Рабочее место менеджера для обработки заказов, управления складом и поставками</p>
      </section>

      {/* Описание системы */}
      <section className="description">
        <h2>Как работает система</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Приём заказа</h3>
            <p>Потребитель звонит менеджеру, вы создаёте заказ в системе, проверяя наличие товара на складе</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Подтверждение</h3>
            <p>Система автоматически резервирует товар и уведомляет логистов о подготовке к отгрузке</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Отгрузка</h3>
            <p>После отгрузки вы отмечаете заказ как выполненный, система обновляет остатки на складе</p>
          </div>
        </div>
      </section>

      {/* Блоки с ссылками на функционал БД */}
      <section className="dashboard">
        <h2>Быстрый доступ</h2>
        <div className="dashboard-grid">
          <Link to="/new" className="dashboard-card">
            <h3>➕ Новый заказ</h3>
            <p>Создать заказ по телефону</p>
          </Link>
          <Link to="/inventory" className="dashboard-card">
            <h3>⚠️ Низкие остатки</h3>
            <p>Товары, требующие пополнения</p>
          </Link>
          <Link to="/supplies" className="dashboard-card">
            <h3>🚚 Ожидаемые поставки</h3>
            <p>График поставок</p>
          </Link>
        </div>
      </section>

      <Footer/>
    </div>
  );
};

export default HomePage;