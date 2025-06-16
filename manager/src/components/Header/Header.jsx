import { Link } from 'react-router-dom';
import './Header.css'; // Стили для хедера

const Header = ({ userName = "Иванов И.И." }) => {
  return (
    <header className="header">
      <div className="logo">АРМ Менеджера | Оптовая база</div>
      <nav className="nav">
        <Link to="/" className="nav-link">Главная</Link>
        <Link to="/orders" className="nav-link">Заказы</Link>
        <Link to="/inventory" className="nav-link">Склад</Link>
        <Link to="/supplies" className="nav-link">Поставки</Link>
        <Link to="/consumers" className="nav-link">Потребители</Link>
      </nav>
      <div className="user-info">Менеджер: {userName}</div>
    </header>
  );
};

export default Header;