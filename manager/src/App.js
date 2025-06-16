import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage/HomePage';
import OrdersPage from './pages/Orders/OrdersPage';
import WarehousePage from './pages/WarehousePage/WarehousePage';
import NewOrderPage from './pages/NewOrderPage/NewOrderPage';
import ConsumersPage from './pages/ConsumersPage/ConsumersPage';
import SuppliesPage from './pages/SuppliesPage/SuppliesPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/new" element={<NewOrderPage />} />
        <Route path="/inventory" element={<WarehousePage />} />
        <Route path="/consumers" element={<ConsumersPage />} />
        <Route path="/supplies" element={<SuppliesPage />} />
      </Routes>
    </Router>
  );
}

export default App;
