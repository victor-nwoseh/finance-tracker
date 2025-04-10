import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  CreditCard, 
  DollarSign, 
  FileText, 
  MoreHorizontal, 
  PieChart, 
  Plus, 
  Target, 
  Wallet,
  LogOut,
  Calendar,
  TrendingUp,
  Menu,
  ChevronRight,
  AlertCircle,
  Activity,
  Award,
  Clock,
  X,
  Check,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Receipt,
  Edit,
  Tag
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axiosConfig';

// Types from our backend
interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
}

interface Budget {
  id: string;
  category: string;
  amount: number;
  spent: number;
  periodStart: string;
  periodEnd: string;
}

interface Pot {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}

interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  category: string;
}

interface Currency {
  code: string;
  symbol: string;
  name: string;
}

// Add TransactionFormData interface
interface TransactionFormData {
  amount: string;
  category: string;
  description: string;
  date: string;
}

// Add BudgetFormData interface
interface BudgetFormData {
  category: string;
  amount: string;
  period_start: string;
  period_end: string;
}

// Add SavingsGoalFormData interface
interface SavingsGoalFormData {
  name: string;
  target_amount: string;
  current_amount: string;
}

// Common Modal Component styling - add this near the top of the file
const MODAL_STYLES = {
  backdrop: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn",
  container: "bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4 border border-gray-100 animate-slideUp",
  header: "flex justify-between items-center mb-5",
  iconContainer: "w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3",
  icon: "text-primary",
  title: "text-xl font-semibold text-gray-900",
  closeButton: "p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors",
  form: "space-y-5", 
  fieldGroup: "space-y-1.5",
  requiredDot: "text-error ml-1",
  label: "block text-sm font-medium text-gray-700 flex items-center",
  labelDot: "w-1.5 h-1.5 rounded-full bg-primary mr-2",
  input: "w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:outline-none",
  inputIcon: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400",
  error: "mt-1 text-sm text-error flex items-center",
  errorIcon: "mr-1",
  footer: "mt-8 flex justify-end space-x-3",
  buttonCancel: "border border-gray-200 text-gray-700 hover:bg-gray-50",
  buttonSubmit: "bg-gradient-to-r from-primary to-[#2a5a4e] text-white hover:opacity-90",
  buttonLoading: "w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2",
  currencySymbol: "absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium",
  currencyInput: "pl-10", // Increased padding for currency inputs
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [pots, setPots] = useState<Pot[]>([]);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Add bill modal state
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const billModalRef = useRef<HTMLDivElement>(null);
  const [billFormData, setBillFormData] = useState({
    name: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'pending',
    category: ''
  });
  const [billFormError, setBillFormError] = useState<string | null>(null);
  
  // Success message state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Transaction form state
  const [transactionFormData, setTransactionFormData] = useState<TransactionFormData>({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Budget modal and form state
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const budgetModalRef = useRef<HTMLDivElement>(null);
  
  // Budget form state
  const [budgetFormData, setBudgetFormData] = useState<BudgetFormData>({
    category: '',
    amount: '',
    period_start: new Date().toISOString().split('T')[0],
    period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
  });
  
  // Budget form errors
  const [budgetFormErrors, setBudgetFormErrors] = useState({
    category: '',
    amount: '',
    period_start: '',
    period_end: '',
    general: '',
  });

  // State for budget update confirmation
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [duplicateBudget, setDuplicateBudget] = useState<Budget | null>(null);

  // Form errors
  const [formErrors, setFormErrors] = useState({
    amount: '',
    category: '',
    description: '',
    date: '',
  });

  // Available categories for transactions
  const categories = [
    'Income',
    'Entertainment',
    'Bills',
    'Groceries',
    'Dining Out',
    'Transportation',
    'Personal Care',
    'Education', 
    'Lifestyle',
    'Shopping',
    'General'
  ];
  
  // Available categories for recurring bills
  const BILL_CATEGORIES = [
    'Utilities',
    'Rent/Mortgage',
    'Subscriptions',
    'Insurance',
    'Memberships',
    'Loan Payment',
    'Phone/Internet',
    'Educational',
    'Healthcare',
    'Other'
  ];
  
  // Available currencies
  const currencies: Currency[] = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  ];
  
  // Load currency from localStorage or default to USD
  const getSavedCurrency = (): Currency => {
    // Use user ID to make the currency selection user-specific
    const userSpecificKey = user?.id ? `selectedCurrency_${user.id}` : null;
    const savedCurrencyCode = userSpecificKey ? localStorage.getItem(userSpecificKey) : null;
    
    if (savedCurrencyCode) {
      const foundCurrency = currencies.find(c => c.code === savedCurrencyCode);
      if (foundCurrency) return foundCurrency;
    }
    return { code: 'USD', symbol: '$', name: 'US Dollar' };
  };
  
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(getSavedCurrency());
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  
  // Update localStorage when currency changes
  const handleCurrencyChange = (currency: Currency) => {
    setSelectedCurrency(currency);
    // Store with user-specific key
    if (user?.id) {
      localStorage.setItem(`selectedCurrency_${user.id}`, currency.code);
    }
    setShowCurrencyDropdown(false);
  };
  
  // Update currency when user changes
  useEffect(() => {
    if (user?.id) {
      setSelectedCurrency(getSavedCurrency());
    }
  }, [user?.id]);
  
  // Function to format currency
  const formatCurrency = (amount: number): string => {
    return `${selectedCurrency.symbol}${amount.toFixed(2)}`;
  };

  // Fetch all data from backend
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          fetchTransactions(),
          fetchBudgets(),
          fetchPots(),
          fetchRecurringBills()
        ]);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError('Failed to load your financial data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Real API calls
  const fetchTransactions = async () => {
    try {
      const response = await api.get('/transactions');
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  };

  const fetchBudgets = async () => {
    try {
      const response = await api.get('/budgets');
      setBudgets(response.data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      throw error;
    }
  };

  const fetchPots = async () => {
    try {
      const response = await api.get('/pots');
      setPots(response.data.pots || []);
    } catch (error) {
      console.error('Error fetching pots:', error);
      throw error;
    }
  };

  const fetchRecurringBills = async () => {
    try {
      const response = await api.get('/recurring-bills');
      setRecurringBills(response.data.recurringBills || []);
    } catch (error) {
      console.error('Error fetching recurring bills:', error);
      throw error;
    }
  };

  // Calculate summary data
  const calculateTotalExpenses = () => {
    // Filter for current month only
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const currentMonthTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear &&
             transaction.category !== 'Income';
    });
    
    return currentMonthTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  };

  // Calculate the cash flow (income - expenses) for the current month
  const calculateCashFlow = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filter for current month transactions
    const currentMonthTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });
    
    // Calculate income (transactions with category "Income")
    const income = currentMonthTransactions
      .filter(transaction => transaction.category === 'Income')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    
    // Calculate expenses (all other transactions)
    const expenses = currentMonthTransactions
      .filter(transaction => transaction.category !== 'Income')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    
    // Return net cash flow
    return income - expenses;
  };

  // Calculate total savings information
  const calculateSavingsInfo = () => {
    const currentTotal = pots.reduce((sum, pot) => sum + pot.currentAmount, 0);
    const targetTotal = pots.reduce((sum, pot) => sum + pot.targetAmount, 0);
    return { currentTotal, targetTotal };
  };

  // Get upcoming bills (next 7 days)
  const getUpcomingBills = () => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    return recurringBills.filter(bill => {
      const dueDate = new Date(bill.dueDate);
      return bill.status !== 'paid' && dueDate >= today && dueDate <= nextWeek;
    });
  };

  // Get overdue bills
  const getOverdueBills = () => {
    return recurringBills.filter(bill => bill.status === 'overdue');
  };

  const upcomingBills = getUpcomingBills();
  const overdueBills = getOverdueBills();
  const upcomingBillsTotal = upcomingBills.reduce((sum, bill) => sum + bill.amount, 0);
  const overdueBillsTotal = overdueBills.reduce((sum, bill) => sum + bill.amount, 0);
  const { currentTotal: savingsCurrentTotal, targetTotal: savingsTargetTotal } = calculateSavingsInfo();

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  // Status color for recurring bills
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-success bg-success/10';
      case 'pending': return 'text-blue-600 bg-blue-100';
      case 'overdue': return 'text-error bg-error/10';
      default: return 'text-secondary bg-secondary/10';
    }
  };

  // Calculate percentage for progress bars
  const calculatePercentage = (current: number, target: number): number => {
    if (target <= 0) return 0;
    const percentage = (current / target) * 100;
    return Math.min(Math.round(percentage), 100); // Round and cap at 100%
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // New function to limit and sort items for dashboard display
  const getLimitedItems = <T extends any>(items: T[], count: number, sortFn?: (a: T, b: T) => number): T[] => {
    if (!items?.length) return [];
    
    const sortedItems = sortFn ? [...items].sort(sortFn) : items;
    return sortedItems.slice(0, count);
  };

  // Sort functions for different data types
  const sortTransactionsByDate = (a: Transaction, b: Transaction) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  };

  const sortBudgetsByUsage = (a: Budget, b: Budget) => {
    const aPercentage = a.spent / a.amount;
    const bPercentage = b.spent / b.amount;
    return bPercentage - aPercentage; // Higher percentage first
  };

  const sortPotsByProgress = (a: Pot, b: Pot) => {
    const aPercentage = a.currentAmount / a.targetAmount;
    const bPercentage = b.currentAmount / b.targetAmount;
    return bPercentage - aPercentage; // Higher percentage first
  };
  
  const sortBillsByDueDate = (a: RecurringBill, b: RecurringBill) => {
    // First sort by status (overdue first)
    if (a.status === 'overdue' && b.status !== 'overdue') return -1;
    if (a.status !== 'overdue' && b.status === 'overdue') return 1;
    
    // If both are overdue, sort by due date (longest overdue first)
    if (a.status === 'overdue' && b.status === 'overdue') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    
    // Then sort by status (pending second)
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    
    // If both are pending, sort by due date (closest date first)
    if (a.status === 'pending' && b.status === 'pending') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    
    // For other cases (e.g., both paid), sort by due date
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  };

  // Get limited items for dashboard display
  const limitedTransactions = getLimitedItems(transactions, 5, sortTransactionsByDate);
  const limitedBudgets = getLimitedItems(budgets, 3, sortBudgetsByUsage);
  const limitedPots = getLimitedItems(pots, 2, sortPotsByProgress);
  const limitedBills = getLimitedItems(recurringBills, 4, sortBillsByDueDate);
  
  // Auto-update bills from pending to overdue
  useEffect(() => {
    const updateOverdueBills = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const updatedBills = recurringBills.map(bill => {
        if (bill.status === 'pending') {
          const dueDate = new Date(bill.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          
          if (dueDate < today) {
            return { ...bill, status: 'overdue' as const };
          }
        }
        return bill;
      });
      
      // Only update if there are changes
      if (JSON.stringify(updatedBills) !== JSON.stringify(recurringBills)) {
        setRecurringBills(updatedBills);
      }
    };
    
    updateOverdueBills();
  }, [recurringBills]);
  
  // Handle mark bill as paid
  const handleMarkAsPaid = async (bill: RecurringBill) => {
    try {
      const response = await api.put(`/recurring-bills/${bill.id}`, {
        ...bill,
        status: 'paid'
      });
      
      setRecurringBills(prev => prev.map(b => 
        b.id === bill.id ? response.data : b
      ));
    } catch (error) {
      console.error('Error updating bill status:', error);
      setError('Failed to update bill status. Please try again.');
    }
  };

  // Navigate to full list pages
  const navigateToSection = (section: string) => {
    if (section === 'transactions') {
      navigate('/transactions');
      return;
    }
    
    if (section === 'budgets') {
      navigate('/budgets');
      return;
    }
    
    if (section === 'savings') {
      navigate('/pots');
      return;
    }
    
    if (section === 'bills') {
      navigate('/recurring-bills');
      return;
    }
    
    setActiveSection(section);
    // In a real implementation, this would navigate to dedicated pages for other sections
    // For now, we just set the active section for sections without dedicated pages
  };

  // Handle modal close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle transaction modal
      if (showTransactionModal && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowTransactionModal(false);
      }
      
      // Handle budget form modal
      if (showBudgetForm && budgetModalRef.current && !budgetModalRef.current.contains(event.target as Node)) {
        setShowBudgetForm(false);
      }
      
      // Handle bill modal
      if (showAddBillModal && billModalRef.current && !billModalRef.current.contains(event.target as Node)) {
        setShowAddBillModal(false);
      }
    };
    
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showTransactionModal) {
          setShowTransactionModal(false);
        }
        
        if (showBudgetForm) {
          setShowBudgetForm(false);
        }
        
        if (showAddBillModal) {
          setShowAddBillModal(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showTransactionModal, showBudgetForm, showAddBillModal]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showTransactionModal) {
        toggleTransactionModal();
      }
      
      if (event.key === 'Escape' && showAddBillModal) {
        toggleAddBillModal();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showTransactionModal, showAddBillModal]);

  // Focus trap within modal
  useEffect(() => {
    if (showTransactionModal || showAddBillModal) {
      // Lock body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll when modal is closed
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showTransactionModal, showAddBillModal]);

  // Toggle transaction modal
  const toggleTransactionModal = () => {
    if (showTransactionModal) {
      resetTransactionForm();
    }
    setShowTransactionModal(!showTransactionModal);
  };
  
  // Toggle add bill modal
  const toggleAddBillModal = () => {
    if (showAddBillModal) {
      resetBillForm();
    }
    setShowAddBillModal(!showAddBillModal);
  };
  
  // Reset bill form
  const resetBillForm = () => {
    setBillFormData({
      name: '',
      amount: '',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      category: ''
    });
    setBillFormError(null);
  };
  
  // Reset transaction form
  const resetTransactionForm = () => {
    setTransactionFormData({
      amount: '',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setFormErrors({
      amount: '',
      category: '',
      description: '',
      date: '',
    });
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTransactionFormData({ ...transactionFormData, [name]: value });
    
    // Clear error when field is edited
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
  };
  
  // Validate form
  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors = { ...formErrors };
    
    if (!transactionFormData.amount || isNaN(Number(transactionFormData.amount)) || Number(transactionFormData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
      isValid = false;
    }
    
    if (!transactionFormData.category) {
      newErrors.category = 'Please select a category';
      isValid = false;
    }
    
    if (!transactionFormData.description.trim()) {
      newErrors.description = 'Please enter a description';
      isValid = false;
    }
    
    if (!transactionFormData.date) {
      newErrors.date = 'Please select a date';
      isValid = false;
    }
    
    setFormErrors(newErrors);
    return isValid;
  };

  // Submit transaction form
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Create new transaction
      await api.post('/transactions', {
        amount: Number(transactionFormData.amount),
        category: transactionFormData.category,
        description: transactionFormData.description,
        date: new Date(transactionFormData.date).toISOString()
      });
      
      // Reset form and refresh data
      resetTransactionForm();
      setShowTransactionModal(false);
      
      // Refetch transactions
      fetchTransactions();
    } catch (error) {
      console.error('Error saving transaction:', error);
      setError('Failed to save transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Budget form functions
  const toggleBudgetForm = () => {
    if (showBudgetForm) {
      resetBudgetForm();
    }
    setShowBudgetForm(!showBudgetForm);
  };
  
  const resetBudgetForm = () => {
    setBudgetFormData({
      category: '',
      amount: '',
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
    });
    setBudgetFormErrors({
      category: '',
      amount: '',
      period_start: '',
      period_end: '',
      general: '',
    });
    setIsEditingBudget(false);
    setSelectedBudget(null);
  };
  
  const handleBudgetInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBudgetFormData({ ...budgetFormData, [name]: value });
    
    // Clear error message when user types
    if (budgetFormErrors[name as keyof typeof budgetFormErrors]) {
      setBudgetFormErrors({ ...budgetFormErrors, [name]: '' });
    }
  };
  
  // Check if a budget with the same parameters already exists
  const checkForDuplicateBudget = (): { 
    exactDuplicate: Budget | null, 
    sameCategoryAndDateRange: Budget | null 
  } => {
    let exactDuplicate: Budget | null = null;
    let sameCategoryAndDateRange: Budget | null = null;
    
    for (const budget of budgets) {
      const sameCategory = budget.category === budgetFormData.category;
      const sameAmount = budget.amount === Number(budgetFormData.amount);
      const samePeriodStart = new Date(budget.periodStart).toISOString().split('T')[0] === budgetFormData.period_start;
      const samePeriodEnd = new Date(budget.periodEnd).toISOString().split('T')[0] === budgetFormData.period_end;
      
      // Skip the current budget if we're editing
      if (isEditingBudget && selectedBudget && budget.id === selectedBudget.id) {
        continue;
      }
      
      if (sameCategory && samePeriodStart && samePeriodEnd) {
        if (sameAmount) {
          // Exact duplicate: same category, amount, and date range
          exactDuplicate = budget;
        } else {
          // Same category and date range, but different amount
          sameCategoryAndDateRange = budget;
        }
      }
    }
    
    return { exactDuplicate, sameCategoryAndDateRange };
  };
  
  // Validate form
  const validateBudgetForm = (): boolean => {
    const errors = {
      category: '',
      amount: '',
      period_start: '',
      period_end: '',
      general: '',
    };
    let isValid = true;

    if (!budgetFormData.category) {
      errors.category = 'Category is required';
      isValid = false;
    }

    if (!budgetFormData.amount) {
      errors.amount = 'Amount is required';
      isValid = false;
    } else if (isNaN(Number(budgetFormData.amount)) || Number(budgetFormData.amount) <= 0) {
      errors.amount = 'Amount must be a positive number';
      isValid = false;
    }

    if (!budgetFormData.period_start) {
      errors.period_start = 'Start date is required';
      isValid = false;
    }

    if (!budgetFormData.period_end) {
      errors.period_end = 'End date is required';
      isValid = false;
    } else if (new Date(budgetFormData.period_end) <= new Date(budgetFormData.period_start)) {
      errors.period_end = 'End date must be after start date';
      isValid = false;
    }
    
    // Check for duplicate budgets
    if (isValid) {
      const { exactDuplicate, sameCategoryAndDateRange } = checkForDuplicateBudget();
      
      if (exactDuplicate) {
        errors.general = 'A budget for this category, amount, and date range already exists.';
        isValid = false;
      } else if (sameCategoryAndDateRange) {
        // Don't set an error, but show confirmation dialog
        setDuplicateBudget(sameCategoryAndDateRange);
        setShowUpdateConfirmation(true);
        return false; // Interrupt the validation process until user confirms
      }
    }

    setBudgetFormErrors(errors);
    return isValid;
  };
  
  // Handle update confirmation
  const handleUpdateConfirmation = async (shouldUpdate: boolean) => {
    setShowUpdateConfirmation(false);
    
    if (shouldUpdate && duplicateBudget) {
      // Directly update the existing budget without going through form validation again
      setIsLoading(true);
      
      try {
        // Update existing budget with the new amount
        await api.put(`/budgets/${duplicateBudget.id}`, {
          category: budgetFormData.category,
          amount: Number(budgetFormData.amount),
          period_start: budgetFormData.period_start,
          period_end: budgetFormData.period_end,
          spent: duplicateBudget.spent
        });
        
        // Show success message
        setSuccessMessage(`Budget for "${budgetFormData.category}" was successfully updated to ${selectedCurrency.symbol}${budgetFormData.amount}`);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
        
        // Refetch budgets and reset form
        await fetchBudgets();
        resetBudgetForm();
        toggleBudgetForm();
      } catch (err) {
        console.error('Error updating budget:', err);
        setError('Failed to update budget. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else if (!shouldUpdate) {
      // User chose to create a new budget, proceed with creation
      submitBudgetForm(false);
    }
  };
  
  // Separate function for actual form submission
  const submitBudgetForm = async (isUpdatingExisting = false) => {
    setIsLoading(true);
    
    try {
      if (isEditingBudget && selectedBudget) {
        // Update existing budget
        await api.put(`/budgets/${selectedBudget.id}`, {
          category: budgetFormData.category,
          amount: Number(budgetFormData.amount),
          period_start: budgetFormData.period_start,
          period_end: budgetFormData.period_end,
          // Preserve the existing spent amount
          spent: selectedBudget.spent
        });
        
        // Show success message if we're updating an existing budget from the duplicate dialog
        if (isUpdatingExisting) {
          setSuccessMessage(`Budget for "${budgetFormData.category}" was successfully updated to ${selectedCurrency.symbol}${budgetFormData.amount}`);
          
          // Clear success message after 5 seconds
          setTimeout(() => {
            setSuccessMessage(null);
          }, 5000);
        }
      } else {
        // Create new budget
        const response = await api.post('/budgets', {
          category: budgetFormData.category,
          amount: Number(budgetFormData.amount),
          period_start: budgetFormData.period_start,
          period_end: budgetFormData.period_end
        });
        
        // Associate existing transactions with this new budget
        const newBudgetId = response.data.id;
        
        if (newBudgetId) {
          // Fetch all transactions
          const transactionsResponse = await api.get('/transactions');
          const allTransactions = transactionsResponse.data.transactions || [];
          
          // Filter transactions that match the budget's category and date range
          const matchingTransactions = allTransactions.filter((transaction: any) => {
            const transactionDate = new Date(transaction.date);
            const periodStart = new Date(budgetFormData.period_start);
            const periodEnd = new Date(budgetFormData.period_end);
            
            return transaction.category === budgetFormData.category && 
                  transactionDate >= periodStart &&
                  transactionDate <= periodEnd;
          });
          
          // Calculate total spent from matching transactions
          const totalSpent = matchingTransactions.reduce((sum: number, transaction: any) => {
            return sum + transaction.amount;
          }, 0);
          
          // If there are matching transactions, update the budget's spent amount
          if (matchingTransactions.length > 0) {
            await api.put(`/budgets/${newBudgetId}`, {
              spent: totalSpent
            });
          }
        }
      }
      
      // Refetch budgets and reset form
      await fetchBudgets();
      resetBudgetForm();
      toggleBudgetForm();
      
    } catch (err) {
      console.error('Error saving budget:', err);
      setError('Failed to save budget. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form submission
  const handleSubmitBudget = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateBudgetForm()) {
      // If false due to duplicate needing confirmation, the confirmation dialog will be shown
      // Otherwise there are validation errors
      return;
    }

    // If validation passed, submit the form
    submitBudgetForm();
  };
  
  // For handling budget form modal closing with click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showBudgetForm && budgetModalRef.current && !budgetModalRef.current.contains(event.target as Node)) {
        toggleBudgetForm();
      }
    };

    // Only add the event listener if the form is showing
    if (showBudgetForm) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBudgetForm]);

  // Handle ESC key for budget form
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showBudgetForm) {
        toggleBudgetForm();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showBudgetForm]);

  // Body scroll lock for budget modal
  useEffect(() => {
    if (showBudgetForm) {
      // Lock body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll when modal is closed
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showBudgetForm]);

  // Savings Goal Modal states
  const [showSavingsGoalForm, setShowSavingsGoalForm] = useState(false);
  const [isEditingSavingsGoal, setIsEditingSavingsGoal] = useState(false);
  const [selectedPot, setSelectedPot] = useState<Pot | null>(null);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [depositError, setDepositError] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  
  // Form refs for savings goal modals
  const savingsGoalModalRef = useRef<HTMLDivElement>(null);
  const depositModalRef = useRef<HTMLDivElement>(null);
  const withdrawModalRef = useRef<HTMLDivElement>(null);
  
  // Savings Goal form state
  const [savingsGoalFormData, setSavingsGoalFormData] = useState<SavingsGoalFormData>({
    name: '',
    target_amount: '',
    current_amount: '0',
  });

  // Savings Goal form errors
  const [savingsGoalFormErrors, setSavingsGoalFormErrors] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    general: '',
  });

  // Toggle savings goal form modal
  const toggleSavingsGoalForm = () => {
    setShowSavingsGoalForm(!showSavingsGoalForm);
    
    if (!showSavingsGoalForm) {
      // Reset form when opening
      setSavingsGoalFormData({
        name: '',
        target_amount: '',
        current_amount: '0',
      });
      setSavingsGoalFormErrors({
        name: '',
        target_amount: '',
        current_amount: '',
        general: '',
      });
      setIsEditingSavingsGoal(false);
      setSelectedPot(null);
    }
  };

  // Handle savings goal form input change
  const handleSavingsGoalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSavingsGoalFormData({
      ...savingsGoalFormData,
      [name]: value,
    });
    
    // Clear specific error when user starts typing in a field
    if (savingsGoalFormErrors[name as keyof typeof savingsGoalFormErrors]) {
      setSavingsGoalFormErrors({
        ...savingsGoalFormErrors,
        [name]: '',
      });
    }
  };

  // Validate savings goal form
  const validateSavingsGoalForm = (): boolean => {
    let isValid = true;
    const newErrors = {
      name: '',
      target_amount: '',
      current_amount: '',
      general: '',
    };

    // Name validation
    if (!savingsGoalFormData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    } else if (savingsGoalFormData.name.length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
      isValid = false;
    }

    // Target amount validation
    if (!savingsGoalFormData.target_amount.trim()) {
      newErrors.target_amount = 'Target amount is required';
      isValid = false;
    } else {
      const targetAmount = parseFloat(savingsGoalFormData.target_amount);
      if (isNaN(targetAmount) || targetAmount <= 0) {
        newErrors.target_amount = 'Please enter a valid positive amount';
        isValid = false;
      }
    }

    // Current amount validation
    if (savingsGoalFormData.current_amount.trim()) {
      const currentAmount = parseFloat(savingsGoalFormData.current_amount);
      const targetAmount = parseFloat(savingsGoalFormData.target_amount);
      if (isNaN(currentAmount) || currentAmount < 0) {
        newErrors.current_amount = 'Please enter a valid amount (0 or positive)';
        isValid = false;
      } else if (targetAmount > 0 && currentAmount > targetAmount) {
        newErrors.current_amount = 'Current amount cannot exceed target amount';
        isValid = false;
      }
    }

    setSavingsGoalFormErrors(newErrors);
    return isValid;
  };

  // Handle savings goal form submit
  const handleSavingsGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSavingsGoalForm()) return;
    
    setError(null);
    
    try {
      const potData = {
        name: savingsGoalFormData.name,
        target_amount: parseFloat(savingsGoalFormData.target_amount),
        current_amount: parseFloat(savingsGoalFormData.current_amount || '0'),
      };
      
      if (isEditingSavingsGoal && selectedPot) {
        await api.put(`/pots/${selectedPot.id}`, potData);
        setSuccessMessage('Savings goal updated successfully!');
      } else {
        await api.post('/pots', potData);
        setSuccessMessage('New savings goal created successfully!');
      }
      
      // Refresh pots
      fetchPots();
      
      // Close form
      setShowSavingsGoalForm(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Error saving pot:', err);
      setSavingsGoalFormErrors({
        ...savingsGoalFormErrors,
        general: 'Failed to save the savings goal. Please try again.',
      });
    }
  };

  // Open deposit form
  const openDepositForm = (pot: Pot) => {
    setSelectedPot(pot);
    setDepositAmount('');
    setDepositError('');
    setShowDepositForm(true);
  };

  // Open withdraw form
  const openWithdrawForm = (pot: Pot) => {
    setSelectedPot(pot);
    setWithdrawAmount('');
    setWithdrawError('');
    setShowWithdrawForm(true);
  };

  // Handle deposit submit
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPot) return;
    
    // Validate amount
    if (!depositAmount.trim()) {
      setDepositError('Please enter an amount');
      return;
    }
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setDepositError('Please enter a valid positive amount');
      return;
    }
    
    try {
      // Calculate new amount
      const newAmount = selectedPot.currentAmount + amount;
      
      // Ensure it doesn't exceed target
      if (newAmount > selectedPot.targetAmount) {
        setDepositError(`Deposit would exceed target by ${formatCurrency(newAmount - selectedPot.targetAmount)}`);
        return;
      }
      
      await api.post(`/pots/${selectedPot.id}/deposit`, { 
        amount 
      });
      
      // Refresh pots
      fetchPots();
      
      // Show success message
      setSuccessMessage(`Successfully deposited ${formatCurrency(amount)} to ${selectedPot.name}!`);
      
      // Close modal
      setShowDepositForm(false);
      
      // Clear message after delay
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Error making deposit:', err);
      setDepositError('Failed to make deposit. Please try again.');
    }
  };

  // Handle withdraw submit
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPot) return;
    
    // Validate amount
    if (!withdrawAmount.trim()) {
      setWithdrawError('Please enter an amount');
      return;
    }
    
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError('Please enter a valid positive amount');
      return;
    }
    
    if (amount > selectedPot.currentAmount) {
      setWithdrawError(`Cannot withdraw more than the current amount (${formatCurrency(selectedPot.currentAmount)})`);
      return;
    }
    
    try {
      await api.post(`/pots/${selectedPot.id}/withdraw`, { 
        amount 
      });
      
      // Refresh pots
      fetchPots();
      
      // Show success message
      setSuccessMessage(`Successfully withdrew ${formatCurrency(amount)} from ${selectedPot.name}!`);
      
      // Close modal
      setShowWithdrawForm(false);
      
      // Clear message after delay
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Error making withdrawal:', err);
      setWithdrawError('Failed to make withdrawal. Please try again.');
    }
  };

  // Handle modal close for savings goals
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle savings goal modals
      if (showSavingsGoalForm && savingsGoalModalRef.current && !savingsGoalModalRef.current.contains(event.target as Node)) {
        setShowSavingsGoalForm(false);
      }
      
      if (showDepositForm && depositModalRef.current && !depositModalRef.current.contains(event.target as Node)) {
        setShowDepositForm(false);
      }
      
      if (showWithdrawForm && withdrawModalRef.current && !withdrawModalRef.current.contains(event.target as Node)) {
        setShowWithdrawForm(false);
      }
    };
    
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showSavingsGoalForm) {
          setShowSavingsGoalForm(false);
        }
        
        if (showDepositForm) {
          setShowDepositForm(false);
        }
        
        if (showWithdrawForm) {
          setShowWithdrawForm(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showSavingsGoalForm, showDepositForm, showWithdrawForm]);

  // Handle bill form input change
  const handleBillInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBillFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Validate bill form
  const validateBillForm = (): boolean => {
    if (!billFormData.name.trim()) {
      setBillFormError('Bill name is required');
      return false;
    }
    
    if (!billFormData.amount || parseFloat(billFormData.amount) <= 0) {
      setBillFormError('Amount must be greater than zero');
      return false;
    }
    
    if (!billFormData.dueDate) {
      setBillFormError('Due date is required');
      return false;
    }
    
    if (!billFormData.category) {
      setBillFormError('Category is required');
      return false;
    }
    
    setBillFormError(null);
    return true;
  };
  
  // Submit bill form
  const handleSubmitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateBillForm()) {
      return;
    }
    
    try {
      const response = await api.post('/recurring-bills', {
        name: billFormData.name,
        amount: parseFloat(billFormData.amount),
        dueDate: billFormData.dueDate,
        status: billFormData.status,
        category: billFormData.category
      });
      
      // Add new bill to state
      setRecurringBills(prev => [...prev, response.data]);
      
      // Show success message and close modal
      setSuccessMessage('Recurring bill added successfully!');
      toggleAddBillModal();
      
      // Clear success message after a delay
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error adding recurring bill:', error);
      setBillFormError('Failed to add recurring bill. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#eef2f7]">
      {/* Sidebar */}
      <aside 
        className={`sm:fixed hidden sm:flex inset-y-0 left-0 z-20 flex-col bg-white border-r border-gray-100 shadow-md transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : '-ml-64 w-64'
        }`}
      >
        <div className="flex items-center h-16 px-5 py-5 border-b border-gray-100">
          <div className="flex items-center">
            <img 
              src="/smartfinance-logo.jpg" 
              alt="SmartFinance Logo" 
              className="h-9 w-auto"
            />
            <span className="ml-3 font-bold text-primary text-lg">
              SmartFinance
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-2 px-3">
            {[
              { icon: FileText, text: 'Overview', id: 'overview' },
              { icon: CreditCard, text: 'Transactions', id: 'transactions' },
              { icon: PieChart, text: 'Budgets', id: 'budgets' },
              { icon: Target, text: 'Savings Goals', id: 'savings' },
              { icon: Calendar, text: 'Recurring Bills', id: 'bills' },
            ].map((item) => (
              <li key={item.id}>
                <button
                  className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeSection === item.id
                      ? 'bg-gradient-to-r from-primary to-[#2a5a4e] text-white font-medium shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => navigateToSection(item.id)}
                >
                  <item.icon size={18} className="mr-3" />
                  <span>{item.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-4 py-5 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-error transition-colors"
          >
            <LogOut size={18} className="mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 ${isSidebarOpen ? 'sm:ml-64' : 'sm:ml-0'} transition-all duration-300 pb-20 sm:pb-0`}>
        {/* Navbar */}
        <header className="bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <button 
                onClick={toggleSidebar} 
                className="hidden sm:flex text-gray-500 hover:text-primary mr-4 transition-colors bg-gray-100 p-2 rounded-lg"
                aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                <Menu size={20} />
              </button>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent">Dashboard</h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <button 
                  onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                  className="flex items-center py-2 px-3 text-gray-600 hover:text-primary rounded-lg bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  <span className="mr-1 font-medium">{selectedCurrency.symbol}</span>
                  <span className="hidden md:inline">{selectedCurrency.code}</span>
                  <ChevronRight size={16} className={`ml-1 transform transition-transform ${showCurrencyDropdown ? 'rotate-90' : ''}`} />
                </button>
                
                {showCurrencyDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-2 z-50 border border-gray-100">
                    {currencies.map((currency) => (
                      <button
                        key={currency.code}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                          selectedCurrency.code === currency.code ? 'bg-gray-100 font-medium text-primary' : 'text-gray-600'
                        }`}
                        onClick={() => handleCurrencyChange(currency)}
                      >
                        <span className="mr-2">{currency.symbol}</span>
                        {currency.name} ({currency.code})
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center">
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center text-primary font-medium shadow-sm ring-2 ring-white">
                  {user?.name.charAt(0)}
                </div>
                <span className="ml-2 text-gray-700 font-medium hidden md:block">{user?.name}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {isLoading ? (
            // Loading state
            <div className="animate-fadeIn flex flex-col items-center justify-center min-h-[60vh]">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500">Loading your financial data...</p>
            </div>
          ) : error ? (
            // Error state
            <div className="animate-fadeIn flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
                <AlertCircle className="text-error" size={32} />
              </div>
              <h2 className="text-xl font-semibold text-primary mb-2">Oops! Something went wrong</h2>
              <p className="text-gray-500 max-w-md mb-6">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-8 animate-fadeIn">
              {/* Success message toast */}
              {successMessage && (
                <div className="fixed top-4 right-4 z-50 bg-success/10 border border-success/20 text-success p-4 rounded-lg shadow-lg max-w-md animate-fadeIn flex items-center">
                  <div className="p-2 rounded-full bg-success/10 mr-3">
                    <Check size={20} className="text-success" />
                  </div>
                  <div>
                    <h4 className="font-medium">Success!</h4>
                    <p>{successMessage}</p>
                  </div>
                  <button 
                    onClick={() => setSuccessMessage(null)} 
                    className="ml-3 text-success/60 hover:text-success p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              {/* Welcome section */}
              <section>
                <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-7 relative overflow-hidden shadow-sm border border-gray-100">
                  {/* Decorative elements - enhanced for responsiveness */}
                  <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 bg-primary/5 rounded-full -mt-24 -mr-24 opacity-70"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-40 sm:h-40 bg-primary/5 rounded-full -mb-16 -ml-16 opacity-70"></div>
                  <div className="absolute top-1/2 left-1/3 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-tr from-primary/5 to-primary/20 rounded-full transform -translate-y-1/2 opacity-40 blur-xl"></div>
                  
                  <div className="relative">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-2 lg:mb-0">
                      <div className="mb-4 lg:mb-0">
                        <div className="flex items-center mb-2">
                          <Award className="text-primary mr-2 w-5 h-5 sm:w-6 sm:h-6" />
                          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent">
                            Welcome back, {user?.name.split(' ')[0]}!
                          </h2>
                        </div>
                        <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6 lg:mb-7 max-w-2xl">
                          Here's an overview of your finances. Track your spending, manage your budgets, and achieve your savings goals all in one place.
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                      {/* Cash Flow Card */}
                      <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center">
                              <Activity size={16} className="text-gray-400 mr-1.5" />
                              <p className="text-gray-500 text-sm font-medium">Cash Flow</p>
                            </div>
                            <p className={`text-lg sm:text-xl lg:text-2xl font-bold mt-2 ${calculateCashFlow() >= 0 ? 'text-success' : 'text-error'}`}>
                              {calculateCashFlow() >= 0 ? '+' : '-'}{formatCurrency(Math.abs(calculateCashFlow()))}
                            </p>
                          </div>
                          <div className={`p-2 sm:p-3 rounded-xl ${calculateCashFlow() >= 0 ? 'bg-success/10' : 'bg-error/10'}`}>
                            {calculateCashFlow() >= 0 ? (
                              <ArrowDownRight className="text-success w-4 h-4 sm:w-5 sm:h-5" />
                            ) : (
                              <ArrowUpRight className="text-error w-4 h-4 sm:w-5 sm:h-5" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center mt-3">
                          <Clock size={14} className="text-gray-400 mr-1.5" />
                          <p className="text-xs sm:text-sm text-gray-500">This month</p>
                        </div>
                      </div>
                      
                      {/* Upcoming Bills Card */}
                      <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center">
                              <Calendar size={16} className="text-gray-400 mr-1.5" />
                              <p className="text-gray-500 text-sm font-medium">Upcoming Bills</p>
                            </div>
                            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mt-2">
                              {formatCurrency(upcomingBillsTotal)}
                            </p>
                          </div>
                          <div className="p-2 sm:p-3 rounded-xl bg-blue-50">
                            <Calendar className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                        </div>
                        <div className="flex items-center mt-3">
                          <Clock size={14} className="text-gray-400 mr-1.5" />
                          <p className="text-xs sm:text-sm text-gray-500">Next 7 days · {upcomingBills.length} bill{upcomingBills.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      
                      {/* Overdue Bills Card */}
                      <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center">
                              <AlertCircle size={16} className="text-gray-400 mr-1.5" />
                              <p className="text-gray-500 text-sm font-medium">Overdue Bills</p>
                            </div>
                            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-error mt-2">
                              {formatCurrency(overdueBillsTotal)}
                            </p>
                          </div>
                          <div className="p-2 sm:p-3 rounded-xl bg-error/10">
                            <AlertCircle className="text-error w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                        </div>
                        <div className="flex items-center mt-3">
                          <Clock size={14} className="text-gray-400 mr-1.5" />
                          <p className="text-xs sm:text-sm text-gray-500">{overdueBills.length} bill{overdueBills.length !== 1 ? 's' : ''} past due</p>
                        </div>
                      </div>
                      
                      {/* Savings Progress Card */}
                      <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center">
                              <Wallet size={16} className="text-gray-400 mr-1.5" />
                              <p className="text-gray-500 text-sm font-medium">Savings Progress</p>
                            </div>
                            <div className="mt-2">
                              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 flex items-baseline">
                                {formatCurrency(savingsCurrentTotal)}
                                <span className="text-xs sm:text-sm text-gray-500 font-normal ml-1">
                                  / {formatCurrency(savingsTargetTotal)}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="p-2 sm:p-3 rounded-xl bg-success/10">
                            <Wallet className="text-success w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-success to-success/70 rounded-full transition-all duration-500"
                              style={{ width: `${calculatePercentage(savingsCurrentTotal, savingsTargetTotal)}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center mt-2">
                            <Target size={14} className="text-gray-400 mr-1.5" />
                            <p className="text-xs sm:text-sm text-gray-500">
                              {pots.length} savings goal{pots.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Recent Transactions */}
              <section>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                  <div className="flex items-center">
                    <CreditCard size={20} className="text-primary mr-2" />
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent">Recent Transactions</h3>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto text-sm py-1.5 px-4 rounded-lg flex items-center justify-center"
                    onClick={toggleTransactionModal}
                  >
                    <Plus size={16} className="mr-1" />
                    Add Transaction
                  </Button>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden">
                  {limitedTransactions.length === 0 ? (
                    <div className="py-12 text-center px-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="text-gray-400" size={24} />
                      </div>
                      <p className="text-gray-500 mb-4">No transactions found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      {/* Mobile View */}
                      <div className="sm:hidden">
                        {limitedTransactions.map((transaction) => (
                          <div 
                            key={transaction.id} 
                            className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium text-gray-800">{transaction.description}</p>
                                <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
                              </div>
                              <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                transaction.category === 'Income' 
                                  ? 'bg-success/10 text-success' 
                                  : 'bg-primary/10 text-primary'
                              }`}>
                                {transaction.category}
                              </div>
                            </div>
                            <div className={`text-right font-medium ${
                              transaction.category === 'Income' ? 'text-success' : 'text-error'
                            }`}>
                              {transaction.category === 'Income' 
                                ? `+${formatCurrency(transaction.amount)}` 
                                : `-${formatCurrency(transaction.amount)}`
                              }
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Tablet and Desktop View */}
                      <div className="hidden sm:block">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {limitedTransactions.map((transaction) => (
                              <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(transaction.date)}
                                </td>
                                <td className="px-4 lg:px-6 py-3">
                                  <p className="text-sm font-medium text-gray-700">{transaction.description}</p>
                                </td>
                                <td className="px-4 lg:px-6 py-3 whitespace-nowrap">
                                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                                    {transaction.category}
                                  </span>
                                </td>
                                <td className={`px-4 lg:px-6 py-3 whitespace-nowrap text-sm text-right font-medium ${
                                  transaction.category === 'Income' ? 'text-success' : 'text-error'
                                }`}>
                                  {transaction.category === 'Income' 
                                    ? `+${formatCurrency(transaction.amount)}` 
                                    : `-${formatCurrency(transaction.amount)}`
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {transactions.length > limitedTransactions.length && (
                        <div className="text-center py-3 sm:py-4 border-t border-gray-100 px-4">
                          <button 
                            className="text-primary font-medium hover:text-primary/80 flex items-center justify-center mx-auto transition-colors text-sm sm:text-base"
                            onClick={() => navigate('/transactions')}
                          >
                            View all transactions
                            <ChevronRight size={16} className="ml-1" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
              
              {/* Budget Overview */}
              <section>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                  <div className="flex items-center">
                    <PieChart size={20} className="text-primary mr-2" />
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent">Budget Overview</h3>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto text-sm py-1.5 px-4 rounded-lg flex items-center justify-center"
                    onClick={toggleBudgetForm}
                  >
                    <Plus size={16} className="mr-1" />
                    New Budget
                  </Button>
                </div>
                
                {limitedBudgets.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden py-12 text-center px-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <PieChart className="text-gray-400" size={24} />
                    </div>
                    <p className="text-gray-500">No budgets found</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                      {limitedBudgets.map((budget) => (
                        <div key={budget.id} className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-800">{budget.category}</h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(budget.periodStart).toLocaleDateString()} - {' '}
                                {new Date(budget.periodEnd).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-500">
                                Spent: {formatCurrency(budget.spent)}
                              </span>
                              <span className="text-sm font-medium bg-gray-50 px-2 py-0.5 rounded">
                                {formatCurrency(budget.amount)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  budget.spent / budget.amount > 0.9 
                                    ? 'bg-gradient-to-r from-error/70 to-error' 
                                    : 'bg-gradient-to-r from-primary/70 to-primary'
                                }`}
                                style={{ width: `${calculatePercentage(budget.spent, budget.amount)}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <p className="text-xs text-gray-500 flex items-center">
                                <DollarSign size={12} className="mr-1" />
                                {formatCurrency(budget.amount - budget.spent)} remaining
                              </p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                calculatePercentage(budget.spent, budget.amount) > 90 
                                  ? 'bg-error/10 text-error' 
                                  : calculatePercentage(budget.spent, budget.amount) > 75
                                    ? 'bg-yellow-50 text-yellow-600'
                                    : 'bg-green-50 text-green-600'
                              }`}>
                                {calculatePercentage(budget.spent, budget.amount)}% used
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {budgets.length > limitedBudgets.length && (
                      <div className="text-center mt-4 sm:mt-5">
                        <button 
                          className="text-primary font-medium hover:text-primary/80 flex items-center justify-center mx-auto transition-colors text-sm sm:text-base"
                          onClick={() => navigate('/budgets')}
                        >
                          View all budgets
                          <ChevronRight size={16} className="ml-1" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
              
              {/* Two column layout for Savings Goals and Recurring Bills */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
                {/* Savings Goals */}
                <section className="flex flex-col">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div className="flex items-center">
                      <Target size={20} className="text-primary mr-2" />
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent">Savings Goals</h3>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full sm:w-auto text-sm py-1.5 px-4 rounded-lg flex items-center justify-center shadow-sm hover:shadow transition-all transform hover:scale-[1.03] active:scale-[0.98]"
                      onClick={toggleSavingsGoalForm}
                    >
                      <Plus size={16} className="mr-1.5" />
                      New Goal
                    </Button>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden flex-1 backdrop-blur-md bg-white/90 transition-shadow duration-300 hover:shadow-lg">
                    {limitedPots.length === 0 ? (
                      <div className="py-12 text-center px-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100/80 to-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                          <Target className="text-primary/40" size={32} />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-700 mb-2">No savings goals found</h4>
                        <p className="text-gray-500 max-w-xs mx-auto">Start your savings journey by creating your first savings goal.</p>
                      </div>
                    ) : (
                      <>
                        <div className="divide-y divide-gray-100">
                          {limitedPots.map((pot) => {
                            const percentage = calculatePercentage(pot.currentAmount, pot.targetAmount);
                            const remaining = pot.targetAmount - pot.currentAmount;
                            return (
                              <div key={pot.id} className="p-4 sm:p-5 hover:bg-gray-50/70 transition-colors relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
                                  <div className="flex items-start sm:items-center">
                                    <div className="p-2 rounded-lg bg-primary/10 mr-3">
                                      <Wallet size={16} className="text-primary" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-gray-800 group-hover:text-primary transition-colors">
                                        {pot.name}
                                      </h4>
                                      <div className={`text-xs px-2 py-1 rounded-full inline-flex items-center mt-1 sm:mt-0 ${
                                        percentage >= 90 ? 'bg-success/10 text-success' : 
                                        percentage >= 50 ? 'bg-blue-100 text-blue-600' : 
                                        'bg-amber-100 text-amber-600'
                                      }`}>
                                        {percentage}% complete
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-col sm:items-end">
                                    <div className="text-sm sm:text-right">
                                      <span className="text-gray-500">Current: </span>
                                      <span className="font-medium text-gray-800">{formatCurrency(pot.currentAmount)}</span>
                                    </div>
                                    <div className="text-sm sm:text-right mt-1">
                                      <span className="text-gray-500">Target: </span>
                                      <span className="font-medium text-primary">{formatCurrency(pot.targetAmount)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <div className="w-full bg-gray-100 rounded-full h-2 sm:h-2.5 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-700 animate-pulse-subtle ${
                                        percentage >= 90 ? 'bg-gradient-to-r from-success/80 to-success' : 
                                        percentage >= 50 ? 'bg-gradient-to-r from-blue-500/80 to-blue-500' : 
                                        'bg-gradient-to-r from-primary/80 to-primary'
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 gap-3">
                                    <p className="text-xs text-gray-500">
                                      {remaining > 0 ? `${formatCurrency(remaining)} to go` : 'Target reached!'}
                                    </p>
                                    
                                    <div className="flex gap-2 w-full sm:w-auto">
                                      <button 
                                        onClick={() => openDepositForm(pot)}
                                        className="flex-1 sm:flex-initial bg-gradient-to-r from-success/90 to-success text-white px-4 py-2 rounded-lg text-sm font-medium transition-all border border-transparent hover:border-success/20 shadow-sm hover:shadow transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center"
                                      >
                                        <ArrowUp size={14} className="mr-1.5" />
                                        Deposit
                                      </button>
                                      <button 
                                        onClick={() => openWithdrawForm(pot)}
                                        className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-medium transition-all border shadow-sm hover:shadow transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center ${
                                          pot.currentAmount <= 0 
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200 hover:border-gray-300'
                                        }`}
                                        disabled={pot.currentAmount <= 0}
                                      >
                                        <ArrowDown size={14} className="mr-1.5" />
                                        Withdraw
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {pots.length > limitedPots.length && (
                          <div className="text-center py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <button 
                              className="text-primary font-medium hover:text-primary/80 flex items-center justify-center mx-auto transition-all hover:bg-primary/5 px-4 py-1.5 rounded-lg"
                              onClick={() => navigateToSection('savings')}
                            >
                              View all savings goals
                              <ChevronRight size={16} className="ml-1.5 animate-bounce-x" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </section>

                {/* Recurring Bills */}
                <section className="flex flex-col">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div className="flex items-center">
                      <Calendar size={20} className="text-primary mr-2" />
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent">Recurring Bills</h3>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full sm:w-auto text-sm py-1.5 px-4 rounded-lg flex items-center justify-center shadow-sm hover:shadow transition-all transform hover:scale-[1.03] active:scale-[0.98]"
                      onClick={toggleAddBillModal}
                    >
                      <Plus size={16} className="mr-1.5" />
                      New Bill
                    </Button>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden flex-1 backdrop-blur-md bg-white/90 transition-shadow duration-300 hover:shadow-lg">
                    {limitedBills.length === 0 ? (
                      <div className="py-12 text-center px-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100/80 to-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                          <Calendar className="text-primary/40" size={32} />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-700 mb-2">No recurring bills found</h4>
                        <p className="text-gray-500 max-w-xs mx-auto">Add your recurring bills to keep track of your regular expenses.</p>
                      </div>
                    ) : (
                      <>
                        <div className="divide-y divide-gray-100">
                          {limitedBills.map((bill) => (
                            <div key={bill.id} className="p-5 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className={`w-10 h-10 rounded-full ${
                                    bill.status === 'paid' ? 'bg-success/10' : 
                                    bill.status === 'pending' ? 'bg-blue-50' : 
                                    'bg-error/10'
                                  } flex items-center justify-center`}>
                                    <Calendar size={16} className={
                                      bill.status === 'paid' ? 'text-success' : 
                                      bill.status === 'pending' ? 'text-blue-500' : 
                                      'text-error'
                                    } />
                                  </div>
                                  <div className="ml-3">
                                    <h4 className="font-medium text-gray-800">{bill.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                                      <Calendar size={12} className="mr-1" />
                                      Due {formatDate(bill.dueDate)}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col items-end">
                                  <span className="font-medium text-gray-800">
                                    {formatCurrency(bill.amount)}
                                  </span>
                                  <div className="flex items-center mt-1.5">
                                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                      bill.status === 'paid' ? 'bg-success/10 text-success' : 
                                      bill.status === 'pending' ? 'bg-blue-100 text-blue-600' : 
                                      'bg-error/10 text-error'
                                    }`}>
                                      {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                                    </span>
                                    
                                    {bill.status !== 'paid' && (
                                      <button
                                        onClick={() => handleMarkAsPaid(bill)}
                                        className="ml-2 px-2 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-md hover:bg-green-100 transition-colors flex items-center"
                                      >
                                        <CheckCircle size={14} className="mr-1" />
                                        Mark Paid
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {recurringBills.length > limitedBills.length && (
                          <div className="text-center py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <button 
                              className="text-primary font-medium hover:text-primary/80 flex items-center justify-center mx-auto transition-all hover:bg-primary/5 px-4 py-1.5 rounded-lg"
                              onClick={() => navigateToSection('bills')}
                            >
                              View all bills
                              <ChevronRight size={16} className="ml-1.5 animate-bounce-x" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
        <div className="grid grid-cols-6 gap-1">
          {[
            { icon: FileText, text: 'Overview', id: 'overview' },
            { icon: CreditCard, text: 'Transactions', id: 'transactions' },
            { icon: PieChart, text: 'Budgets', id: 'budgets' },
            { icon: Target, text: 'Savings', id: 'savings' },
            { icon: Calendar, text: 'Bills', id: 'bills' },
            { icon: LogOut, text: 'Logout', id: 'logout' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => item.id === 'logout' ? handleLogout() : navigateToSection(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 text-xs transition-colors ${
                activeSection === item.id 
                  ? 'text-primary font-medium bg-primary/5' 
                  : 'text-gray-600 hover:text-primary focus:text-primary'
              }`}
            >
              <item.icon 
                size={20} 
                className={`mb-1 ${activeSection === item.id ? 'text-primary' : ''}`}
              />
              <span className="truncate w-full text-center">{item.text}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Transaction Form Modal */}
      {showTransactionModal && (
        <div className={MODAL_STYLES.backdrop}>
          <div 
            ref={modalRef}
            className={MODAL_STYLES.container}
          >
            <div className={MODAL_STYLES.header}>
              <div className="flex items-center">
                <div className={MODAL_STYLES.iconContainer}>
                  <Receipt size={18} className={MODAL_STYLES.icon} />
                </div>
                <h2 className={MODAL_STYLES.title}>Add Transaction</h2>
              </div>
              <button
                onClick={toggleTransactionModal}
                className={MODAL_STYLES.closeButton}
              >
                <X size={20} />
              </button>
            </div>
            
            {error && (
              <div className="mb-5 p-3 bg-error/10 rounded-lg border border-error/30 text-error flex items-center">
                <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmitTransaction} className={MODAL_STYLES.form}>
              <div className={MODAL_STYLES.fieldGroup}>
                <label htmlFor="amount" className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Amount
                  <span className={MODAL_STYLES.requiredDot}>*</span>
                </label>
                <div className="relative">
                  <span className={MODAL_STYLES.currencySymbol}>
                    {selectedCurrency.symbol}
                  </span>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className={`${MODAL_STYLES.input} ${MODAL_STYLES.currencyInput} ${formErrors.amount ? 'border-error focus:ring-error/50' : ''}`}
                    value={transactionFormData.amount}
                    onChange={handleInputChange}
                  />
                </div>
                {formErrors.amount && (
                  <p className={MODAL_STYLES.error}>
                    <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                    {formErrors.amount}
                  </p>
                )}
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label htmlFor="category" className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Category
                  <span className={MODAL_STYLES.requiredDot}>*</span>
                </label>
                <div className="relative">
                  <select
                    id="category"
                    name="category"
                    className={`${MODAL_STYLES.input} pr-10 appearance-none ${formErrors.category ? 'border-error focus:ring-error/50' : ''}`}
                    value={transactionFormData.category}
                    onChange={handleInputChange}
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <ChevronRight size={16} className="transform rotate-90 text-gray-400" />
                  </div>
                </div>
                {formErrors.category && (
                  <p className={MODAL_STYLES.error}>
                    <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                    {formErrors.category}
                  </p>
                )}
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label htmlFor="description" className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Description
                  <span className={MODAL_STYLES.requiredDot}>*</span>
                </label>
                <input
                  id="description"
                  name="description"
                  type="text"
                  placeholder="What was this for?"
                  className={`${MODAL_STYLES.input} ${formErrors.description ? 'border-error focus:ring-error/50' : ''}`}
                  value={transactionFormData.description}
                  onChange={handleInputChange}
                />
                {formErrors.description && (
                  <p className={MODAL_STYLES.error}>
                    <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                    {formErrors.description}
                  </p>
                )}
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label htmlFor="date" className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Date
                  <span className={MODAL_STYLES.requiredDot}>*</span>
                </label>
                <div className="relative">
                  <Calendar size={16} className={MODAL_STYLES.inputIcon} />
                  <input
                    id="date"
                    name="date"
                    type="date"
                    className={`${MODAL_STYLES.input} pl-10 ${formErrors.date ? 'border-error focus:ring-error/50' : ''}`}
                    value={transactionFormData.date}
                    onChange={handleInputChange}
                  />
                </div>
                {formErrors.date && (
                  <p className={MODAL_STYLES.error}>
                    <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                    {formErrors.date}
                  </p>
                )}
              </div>
              
              <div className={MODAL_STYLES.footer}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleTransactionModal}
                  className={MODAL_STYLES.buttonCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={MODAL_STYLES.buttonSubmit}
                >
                  {isLoading ? (
                    <>
                      <div className={MODAL_STYLES.buttonLoading}></div>
                      Adding...
                    </>
                  ) : 'Add Transaction'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Form Modal */}
      {showBudgetForm && (
        <div className={MODAL_STYLES.backdrop}>
          <div 
            ref={budgetModalRef}
            className={MODAL_STYLES.container}
          >
            {/* Modal Content */}
            <>
              <div className={MODAL_STYLES.header}>
                <div className="flex items-center">
                  <div className={MODAL_STYLES.iconContainer}>
                    <PieChart size={18} className={MODAL_STYLES.icon} />
                  </div>
                  <h2 className={MODAL_STYLES.title}>
                    {isEditingBudget ? 'Edit Budget' : 'Create Budget'}
                  </h2>
                </div>
                <button
                  onClick={toggleBudgetForm}
                  className={MODAL_STYLES.closeButton}
                >
                  <X size={20} />
                </button>
              </div>
              
              {budgetFormErrors.general && (
                <div className="mb-5 p-3 bg-error/10 rounded-lg border border-error/30 text-error flex items-center">
                  <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                  <p>{budgetFormErrors.general}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmitBudget} className={MODAL_STYLES.form}>
                <div className={MODAL_STYLES.fieldGroup}>
                  <label htmlFor="category" className={MODAL_STYLES.label}>
                    <span className={MODAL_STYLES.labelDot}></span>
                    Category
                    <span className={MODAL_STYLES.requiredDot}>*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="category"
                      name="category"
                      className={`${MODAL_STYLES.input} pr-10 appearance-none ${budgetFormErrors.category ? 'border-error focus:ring-error/50' : ''}`}
                      value={budgetFormData.category}
                      onChange={handleBudgetInputChange}
                    >
                      <option value="">Select Category</option>
                      {categories
                        .filter(category => category !== 'Income')
                        .map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))
                      }
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <ChevronRight size={16} className="transform rotate-90 text-gray-400" />
                    </div>
                  </div>
                  {budgetFormErrors.category && (
                    <p className={MODAL_STYLES.error}>
                      <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                      {budgetFormErrors.category}
                    </p>
                  )}
                </div>
                
                <div className={MODAL_STYLES.fieldGroup}>
                  <label htmlFor="amount" className={MODAL_STYLES.label}>
                    <span className={MODAL_STYLES.labelDot}></span>
                    Budget Amount
                    <span className={MODAL_STYLES.requiredDot}>*</span>
                  </label>
                  <div className="relative">
                    <span className={MODAL_STYLES.currencySymbol}>
                      {selectedCurrency.symbol}
                    </span>
                    <input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className={`${MODAL_STYLES.input} ${MODAL_STYLES.currencyInput} ${budgetFormErrors.amount ? 'border-error focus:ring-error/50' : ''}`}
                      value={budgetFormData.amount}
                      onChange={handleBudgetInputChange}
                    />
                  </div>
                  {budgetFormErrors.amount && (
                    <p className={MODAL_STYLES.error}>
                      <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                      {budgetFormErrors.amount}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className={MODAL_STYLES.fieldGroup}>
                    <label htmlFor="period_start" className={MODAL_STYLES.label}>
                      <span className={MODAL_STYLES.labelDot}></span>
                      Start Date
                      <span className={MODAL_STYLES.requiredDot}>*</span>
                    </label>
                    <div className="relative">
                      <Calendar size={16} className={MODAL_STYLES.inputIcon} />
                      <input
                        id="period_start"
                        name="period_start"
                        type="date"
                        className={`${MODAL_STYLES.input} pl-10 ${budgetFormErrors.period_start ? 'border-error focus:ring-error/50' : ''}`}
                        value={budgetFormData.period_start}
                        onChange={handleBudgetInputChange}
                      />
                    </div>
                    {budgetFormErrors.period_start && (
                      <p className={MODAL_STYLES.error}>
                        <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                        {budgetFormErrors.period_start}
                      </p>
                    )}
                  </div>
                  
                  <div className={MODAL_STYLES.fieldGroup}>
                    <label htmlFor="period_end" className={MODAL_STYLES.label}>
                      <span className={MODAL_STYLES.labelDot}></span>
                      End Date
                      <span className={MODAL_STYLES.requiredDot}>*</span>
                    </label>
                    <div className="relative">
                      <Calendar size={16} className={MODAL_STYLES.inputIcon} />
                      <input
                        id="period_end"
                        name="period_end"
                        type="date"
                        className={`${MODAL_STYLES.input} pl-10 ${budgetFormErrors.period_end ? 'border-error focus:ring-error/50' : ''}`}
                        value={budgetFormData.period_end}
                        onChange={handleBudgetInputChange}
                      />
                    </div>
                    {budgetFormErrors.period_end && (
                      <p className={MODAL_STYLES.error}>
                        <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                        {budgetFormErrors.period_end}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className={MODAL_STYLES.footer}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={toggleBudgetForm}
                    className={MODAL_STYLES.buttonCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={MODAL_STYLES.buttonSubmit}
                  >
                    {isLoading ? (
                      <>
                        <div className={MODAL_STYLES.buttonLoading}></div>
                        {isEditingBudget ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      isEditingBudget ? 'Update Budget' : 'Create Budget'
                    )}
                  </Button>
                </div>
              </form>
            </>
          </div>
        </div>
      )}

      {/* Deposit Form Modal */}
      {showDepositForm && (
        <div className={MODAL_STYLES.backdrop}>
          <div 
            ref={depositModalRef}
            className={MODAL_STYLES.container}
          >
            <div className={MODAL_STYLES.header}>
              <div className="flex items-center">
                <div className={MODAL_STYLES.iconContainer}>
                  <Wallet size={18} className={MODAL_STYLES.icon} />
                </div>
                <h2 className={MODAL_STYLES.title}>Deposit to {selectedPot?.name}</h2>
              </div>
              <button
                onClick={() => setShowDepositForm(false)}
                className={MODAL_STYLES.closeButton}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleDepositSubmit} className={MODAL_STYLES.form}>
              <div className={MODAL_STYLES.fieldGroup}>
                <label htmlFor="amount" className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Amount
                  <span className={MODAL_STYLES.requiredDot}>*</span>
                </label>
                <div className="relative">
                  <span className={MODAL_STYLES.currencySymbol}>
                    {selectedCurrency.symbol}
                  </span>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className={`${MODAL_STYLES.input} ${MODAL_STYLES.currencyInput} ${depositError ? 'border-error focus:ring-error/50' : ''}`}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
                {depositError && (
                  <p className={MODAL_STYLES.error}>
                    <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                    {depositError}
                  </p>
                )}
              </div>
              
              <div className={MODAL_STYLES.footer}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDepositForm(false)}
                  className={MODAL_STYLES.buttonCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={MODAL_STYLES.buttonSubmit}
                >
                  {isLoading ? (
                    <>
                      <div className={MODAL_STYLES.buttonLoading}></div>
                      Depositing...
                    </>
                  ) : 'Deposit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Form Modal */}
      {showWithdrawForm && (
        <div className={MODAL_STYLES.backdrop}>
          <div 
            ref={withdrawModalRef}
            className={MODAL_STYLES.container}
          >
            <div className={MODAL_STYLES.header}>
              <div className="flex items-center">
                <div className={MODAL_STYLES.iconContainer}>
                  <Wallet size={18} className={MODAL_STYLES.icon} />
                </div>
                <h2 className={MODAL_STYLES.title}>Withdraw from {selectedPot?.name}</h2>
              </div>
              <button
                onClick={() => setShowWithdrawForm(false)}
                className={MODAL_STYLES.closeButton}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleWithdrawSubmit} className={MODAL_STYLES.form}>
              <div className={MODAL_STYLES.fieldGroup}>
                <label htmlFor="amount" className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Amount
                  <span className={MODAL_STYLES.requiredDot}>*</span>
                </label>
                <div className="relative">
                  <span className={MODAL_STYLES.currencySymbol}>
                    {selectedCurrency.symbol}
                  </span>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className={`${MODAL_STYLES.input} ${MODAL_STYLES.currencyInput} ${withdrawError ? 'border-error focus:ring-error/50' : ''}`}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                </div>
                {withdrawError && (
                  <p className={MODAL_STYLES.error}>
                    <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                    {withdrawError}
                  </p>
                )}
              </div>
              
              <div className={MODAL_STYLES.footer}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowWithdrawForm(false)}
                  className={MODAL_STYLES.buttonCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={MODAL_STYLES.buttonSubmit}
                >
                  {isLoading ? (
                    <>
                      <div className={MODAL_STYLES.buttonLoading}></div>
                      Withdrawing...
                    </>
                  ) : 'Withdraw'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Savings Goal Form Modal */}
      {showSavingsGoalForm && (
        <div className={MODAL_STYLES.backdrop}>
          <div 
            ref={savingsGoalModalRef}
            className={MODAL_STYLES.container}
          >
            <div className={MODAL_STYLES.header}>
              <div className="flex items-center">
                <div className={MODAL_STYLES.iconContainer}>
                  <Target size={18} className={MODAL_STYLES.icon} />
                </div>
                <h2 className={MODAL_STYLES.title}>Create New Savings Goal</h2>
              </div>
              <button
                onClick={toggleSavingsGoalForm}
                className={MODAL_STYLES.closeButton}
              >
                <X size={20} />
              </button>
            </div>
            
            {savingsGoalFormErrors.general && (
              <div className="mb-5 p-3 bg-error/10 rounded-lg border border-error/30 text-error flex items-center">
                <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                <p>{savingsGoalFormErrors.general}</p>
              </div>
            )}
            
            <form onSubmit={handleSavingsGoalSubmit} className={MODAL_STYLES.form}>
              <div className={MODAL_STYLES.fieldGroup}>
                <label htmlFor="name" className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Goal Name
                  <span className={MODAL_STYLES.requiredDot}>*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g., Emergency Fund, Vacation, New Car"
                  className={`${MODAL_STYLES.input} ${savingsGoalFormErrors.name ? 'border-error focus:ring-error/50' : ''}`}
                  value={savingsGoalFormData.name}
                  onChange={handleSavingsGoalInputChange}
                />
                {savingsGoalFormErrors.name && (
                  <p className={MODAL_STYLES.error}>
                    <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                    {savingsGoalFormErrors.name}
                  </p>
                )}
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label htmlFor="target_amount" className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Target Amount
                  <span className={MODAL_STYLES.requiredDot}>*</span>
                </label>
                <div className="relative">
                  <span className={MODAL_STYLES.currencySymbol}>
                    {selectedCurrency.symbol}
                  </span>
                  <input
                    id="target_amount"
                    name="target_amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className={`${MODAL_STYLES.input} ${MODAL_STYLES.currencyInput} ${savingsGoalFormErrors.target_amount ? 'border-error focus:ring-error/50' : ''}`}
                    value={savingsGoalFormData.target_amount}
                    onChange={handleSavingsGoalInputChange}
                  />
                </div>
                {savingsGoalFormErrors.target_amount && (
                  <p className={MODAL_STYLES.error}>
                    <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                    {savingsGoalFormErrors.target_amount}
                  </p>
                )}
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label htmlFor="current_amount" className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Initial Amount
                  <span className="text-gray-400 text-xs ml-2">(Optional)</span>
                </label>
                <div className="relative">
                  <span className={MODAL_STYLES.currencySymbol}>
                    {selectedCurrency.symbol}
                  </span>
                  <input
                    id="current_amount"
                    name="current_amount"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    className={`${MODAL_STYLES.input} ${MODAL_STYLES.currencyInput} ${savingsGoalFormErrors.current_amount ? 'border-error focus:ring-error/50' : ''}`}
                    value={savingsGoalFormData.current_amount}
                    onChange={handleSavingsGoalInputChange}
                  />
                </div>
                {savingsGoalFormErrors.current_amount && (
                  <p className={MODAL_STYLES.error}>
                    <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                    {savingsGoalFormErrors.current_amount}
                  </p>
                )}
              </div>
              
              <div className={MODAL_STYLES.footer}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleSavingsGoalForm}
                  className={MODAL_STYLES.buttonCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={MODAL_STYLES.buttonSubmit}
                >
                  {isLoading ? (
                    <>
                      <div className={MODAL_STYLES.buttonLoading}></div>
                      Creating...
                    </>
                  ) : 'Create Goal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bill Modal */}
      {showAddBillModal && (
        <div className={MODAL_STYLES.backdrop}>
          <div 
            ref={billModalRef}
            className={MODAL_STYLES.container}
          >
            <div className={MODAL_STYLES.header}>
              <div className="flex items-center">
                <div className={MODAL_STYLES.iconContainer}>
                  <Calendar size={18} className={MODAL_STYLES.icon} />
                </div>
                <h2 className={MODAL_STYLES.title}>Add Recurring Bill</h2>
              </div>
              <button
                onClick={toggleAddBillModal}
                className={MODAL_STYLES.closeButton}
              >
                <X size={20} />
              </button>
            </div>
            
            {billFormError && (
              <div className="mb-5 p-3 bg-error/10 rounded-lg border border-error/30 text-error flex items-center">
                <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                <p>{billFormError}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmitBill} className={MODAL_STYLES.form}>
              <div className={MODAL_STYLES.fieldGroup}>
                <label htmlFor="name" className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Bill Name
                  <span className={MODAL_STYLES.requiredDot}>*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter bill name"
                  className={MODAL_STYLES.input}
                  value={billFormData.name}
                  onChange={handleBillInputChange}
                />
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label htmlFor="amount" className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Amount
                  <span className={MODAL_STYLES.requiredDot}>*</span>
                </label>
                <div className="relative">
                  <span className={MODAL_STYLES.currencySymbol}>
                    {selectedCurrency.symbol}
                  </span>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className={`${MODAL_STYLES.input} ${MODAL_STYLES.currencyInput}`}
                    value={billFormData.amount}
                    onChange={handleBillInputChange}
                  />
                </div>
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label htmlFor="dueDate" className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Due Date
                  <span className={MODAL_STYLES.requiredDot}>*</span>
                </label>
                <div className="relative">
                  <Calendar size={16} className={MODAL_STYLES.inputIcon} />
                  <input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    className={`${MODAL_STYLES.input} pl-10`}
                    value={billFormData.dueDate}
                    onChange={handleBillInputChange}
                  />
                </div>
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label htmlFor="category" className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Category
                  <span className={MODAL_STYLES.requiredDot}>*</span>
                </label>
                <div className="relative">
                  <select
                    id="category"
                    name="category"
                    className={`${MODAL_STYLES.input} pr-10 appearance-none`}
                    value={billFormData.category}
                    onChange={handleBillInputChange}
                  >
                    <option value="">Select a category</option>
                    {categories
                      .filter(category => category !== 'Income')
                      .map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))
                    }
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <ChevronRight size={16} className="transform rotate-90 text-gray-400" />
                  </div>
                </div>
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label htmlFor="status" className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Status
                  <span className={MODAL_STYLES.requiredDot}>*</span>
                </label>
                <div className="relative">
                  <select
                    id="status"
                    name="status"
                    className={`${MODAL_STYLES.input} pr-10 appearance-none`}
                    value={billFormData.status}
                    onChange={handleBillInputChange}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <ChevronRight size={16} className="transform rotate-90 text-gray-400" />
                  </div>
                </div>
              </div>
              
              <div className={MODAL_STYLES.footer}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleAddBillModal}
                  className={MODAL_STYLES.buttonCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={MODAL_STYLES.buttonSubmit}
                >
                  {isLoading ? (
                    <>
                      <div className={MODAL_STYLES.buttonLoading}></div>
                      Adding...
                    </>
                  ) : 'Add Bill'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage; 
