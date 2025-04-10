import React from 'react';
import { Routes, Route } from 'react-router-dom';
import IndexPage from './pages/IndexPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import BudgetsPage from './pages/BudgetsPage';
import PotsPage from './pages/PotsPage';
import RecurringBillsPage from './pages/RecurringBillsPage';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/transactions" 
        element={
          <ProtectedRoute>
            <TransactionsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/budgets" 
        element={
          <ProtectedRoute>
            <BudgetsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pots" 
        element={
          <ProtectedRoute>
            <PotsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/recurring-bills" 
        element={
          <ProtectedRoute>
            <RecurringBillsPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

export default App; 