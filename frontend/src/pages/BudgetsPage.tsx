import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, 
  Plus, 
  ChevronLeft,
  ChevronRight,
  FileText,
  Target,
  Calendar,
  CreditCard,
  Search,
  Filter,
  Trash2,
  X,
  Menu,
  LogOut,
  MoreHorizontal,
  Edit3,
  AlertCircle,
  Check,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axiosConfig';

// Types
interface Budget {
  id: string;
  category: string;
  amount: number;
  spent: number;
  periodStart: string;
  periodEnd: string;
}

interface BudgetFormData {
  category: string;
  amount: string;
  period_start: string;
  period_end: string;
}

// Transaction interface
interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
}

// Currency interface
interface Currency {
  code: string;
  symbol: string;
  name: string;
}

// Common Modal Component styling
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
  // Delete modal specific styles
  deleteContainer: "bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4 border border-gray-100 text-center",
  deleteIcon: "w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4",
  deleteTitle: "text-xl font-bold text-gray-900 mb-2",
  deleteMessage: "text-gray-600 mb-6",
  deleteButtonsContainer: "flex justify-center space-x-3",
  deleteButtonCancel: "px-5",
  deleteButtonDelete: "bg-error hover:bg-error/90 px-5"
};

const BudgetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('highest-usage');
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  
  // Delete confirmation modal
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  
  // Transaction modal states
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [budgetTransactions, setBudgetTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const transactionsPerPage = 3;
  const transactionsModalRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [formData, setFormData] = useState<BudgetFormData>({
    category: '',
    amount: '',
    period_start: new Date().toISOString().split('T')[0],
    period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
  });

  // Form errors
  const [formErrors, setFormErrors] = useState({
    category: '',
    amount: '',
    period_start: '',
    period_end: '',
    general: '',
  });

  // State for budget update confirmation
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [duplicateBudget, setDuplicateBudget] = useState<Budget | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pagination settings
  const itemsPerPage = 6;
  
  // Available categories
  const categories = [
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
  
  // Sort options
  const sortOptions = [
    { value: 'highest-usage', label: 'Highest Usage' },
    { value: 'lowest-usage', label: 'Lowest Usage' },
    { value: 'highest-amount', label: 'Highest Amount' },
    { value: 'lowest-amount', label: 'Lowest Amount' },
    { value: 'end-date', label: 'End Date (Soonest)' }
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
  
  // Update currency when user changes
  useEffect(() => {
    if (user?.id) {
      setSelectedCurrency(getSavedCurrency());
    }
  }, [user?.id]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: selectedCurrency.code
    }).format(amount);
  };
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  // Fetch budgets
  const fetchBudgets = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/budgets');
      setBudgets(response.data || []);
    } catch (err) {
      console.error('Error fetching budgets:', err);
      setError('Failed to load your budgets. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load budgets on component mount
  useEffect(() => {
    fetchBudgets();
  }, []);
  
  // Filter and sort budgets
  const filteredBudgets = useMemo(() => {
    return budgets
      .filter(budget => {
        // Search query filter
        const matchesSearch = 
          budget.category.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Category filter
        const matchesCategory = 
          selectedCategory === '' || budget.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'highest-usage':
            return (b.spent / b.amount) - (a.spent / a.amount);
          case 'lowest-usage':
            return (a.spent / a.amount) - (b.spent / b.amount);
          case 'highest-amount':
            return b.amount - a.amount;
          case 'lowest-amount':
            return a.amount - b.amount;
          case 'end-date':
            return new Date(a.periodEnd).getTime() - new Date(b.periodEnd).getTime();
          default:
            return (b.spent / b.amount) - (a.spent / a.amount);
        }
      });
  }, [budgets, searchQuery, selectedCategory, sortOption]);

  // Pagination
  const totalPages = Math.ceil(filteredBudgets.length / itemsPerPage);
  const paginatedBudgets = filteredBudgets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Go to specific page
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error message when user types
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors({ ...formErrors, [name]: '' });
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
      const sameCategory = budget.category === formData.category;
      const sameAmount = budget.amount === Number(formData.amount);
      const samePeriodStart = new Date(budget.periodStart).toISOString().split('T')[0] === formData.period_start;
      const samePeriodEnd = new Date(budget.periodEnd).toISOString().split('T')[0] === formData.period_end;
      
      // Skip the current budget if we're editing
      if (isEditing && selectedBudget && budget.id === selectedBudget.id) {
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
  const validateForm = (): boolean => {
    const errors = {
      category: '',
      amount: '',
      period_start: '',
      period_end: '',
      general: '',
    };
    let isValid = true;

    if (!formData.category) {
      errors.category = 'Category is required';
      isValid = false;
    }

    if (!formData.amount) {
      errors.amount = 'Amount is required';
      isValid = false;
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      errors.amount = 'Amount must be a positive number';
      isValid = false;
    }

    if (!formData.period_start) {
      errors.period_start = 'Start date is required';
      isValid = false;
    }

    if (!formData.period_end) {
      errors.period_end = 'End date is required';
      isValid = false;
    } else if (new Date(formData.period_end) <= new Date(formData.period_start)) {
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

    setFormErrors(errors);
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
          category: formData.category,
          amount: Number(formData.amount),
          period_start: formData.period_start,
          period_end: formData.period_end,
          spent: duplicateBudget.spent
        });
        
        // Show success message
        setSuccessMessage(`Budget for "${formData.category}" was successfully updated to ${selectedCurrency.symbol}${formData.amount}`);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
        
        // Refetch budgets and reset form
        await fetchBudgets();
        resetForm();
        toggleForm(); // Close the modal
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
      if (isEditing && selectedBudget) {
        // Update existing budget
        await api.put(`/budgets/${selectedBudget.id}`, {
          category: formData.category,
          amount: Number(formData.amount),
          period_start: formData.period_start,
          period_end: formData.period_end,
          spent: selectedBudget.spent
        });
        
        if (isUpdatingExisting) {
          setSuccessMessage(`Budget for "${formData.category}" was successfully updated to ${selectedCurrency.symbol}${formData.amount}`);
          
          // Clear success message after 5 seconds
          setTimeout(() => {
            setSuccessMessage(null);
          }, 5000);
        }
      } else {
        // Create new budget
        const response = await api.post('/budgets', {
          category: formData.category,
          amount: Number(formData.amount),
          period_start: formData.period_start,
          period_end: formData.period_end
        });
        
        // Now associate existing transactions with this new budget
        const newBudgetId = response.data.id;
        
        if (newBudgetId) {
          // Fetch all transactions
          const transactionsResponse = await api.get('/transactions');
          const allTransactions = transactionsResponse.data.transactions || [];
          
          // Filter transactions that match the budget's category and date range
          const matchingTransactions = allTransactions.filter((transaction: any) => {
            const transactionDate = new Date(transaction.date);
            const periodStart = new Date(formData.period_start);
            const periodEnd = new Date(formData.period_end);
            
            return transaction.category === formData.category && 
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
      resetForm();
      toggleForm();
      
    } catch (err) {
      console.error('Error saving budget:', err);
      setError('Failed to save budget. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // If false due to duplicate needing confirmation, the confirmation dialog will be shown
      // Otherwise there are validation errors
      return;
    }

    // If validation passed, submit the form
    submitBudgetForm();
  };

  // Handle edit budget
  const handleEdit = (budget: Budget) => {
    setSelectedBudget(budget);
    setFormData({
      category: budget.category,
      amount: budget.amount.toString(),
      period_start: new Date(budget.periodStart).toISOString().split('T')[0],
      period_end: new Date(budget.periodEnd).toISOString().split('T')[0]
    });
    setIsEditing(true);
    setShowForm(true);
  };

  // Handle delete budget
  const handleDeleteClick = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent card click event
    }
    setBudgetToDelete(id);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!budgetToDelete) return;
    
    setIsLoading(true);
    
    try {
      await api.delete(`/budgets/${budgetToDelete}`);
      await fetchBudgets();
      setShowDeleteConfirmation(false);
      setBudgetToDelete(null);
    } catch (err) {
      console.error('Error deleting budget:', err);
      setError('Failed to delete budget. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setBudgetToDelete(null);
  };

  // Handle delete confirmation modal close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDeleteConfirmation && 
          deleteModalRef.current && 
          !deleteModalRef.current.contains(event.target as Node)) {
        cancelDelete();
      }
    };

    if (showDeleteConfirmation) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteConfirmation]);

  // Reset form
  const resetForm = () => {
    setFormData({
      category: '',
      amount: '',
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
    });
    setFormErrors({
      category: '',
      amount: '',
      period_start: '',
      period_end: '',
      general: '',
    });
    setIsEditing(false);
    setSelectedBudget(null);
  };

  // Toggle form visibility
  const toggleForm = () => {
    if (showForm) {
      resetForm();
    }
    setShowForm(!showForm);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSortOption('highest-usage');
    setCurrentPage(1);
  };

  // Calculate percentage for progress bar
  const calculatePercentage = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  // Handle modal close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showForm && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        toggleForm();
      }
    };

    // Only add the event listener if the form is showing
    if (showForm) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showForm]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showForm) {
        toggleForm();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showForm]);

  // Focus trap within modal
  useEffect(() => {
    if (showForm) {
      // Lock body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll when modal is closed
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showForm]);

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigate to section
  const navigateToSection = (section: string) => {
    switch (section) {
      case 'overview':
        navigate('/dashboard');
        break;
      case 'transactions':
        navigate('/transactions');
        break;
      case 'budgets':
        navigate('/budgets');
        break;
      case 'savings':
        navigate('/pots');
        break;
      case 'bills':
        navigate('/recurring-bills');
        break;
      default:
        navigate('/dashboard');
    }
  };

  // Get progress bar color based on usage percentage
  const getProgressBarColor = (spent: number, amount: number) => {
    const percentage = (spent / amount) * 100;
    
    if (percentage >= 90) return 'bg-gradient-to-r from-error/80 to-error';
    if (percentage >= 75) return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
    return 'bg-gradient-to-r from-green-400 to-green-500';
  };

  // Handle currency change
  const handleCurrencyChange = (currency: Currency) => {
    setSelectedCurrency(currency);
    setShowCurrencyDropdown(false);
  };

  // Fetch transactions for a specific budget
  const fetchBudgetTransactions = async (budgetId: string) => {
    setIsLoadingTransactions(true);
    setTransactionsError(null);
    
    try {
      // First try to get transactions directly from the budget
      const response = await api.get(`/budgets/${budgetId}/transactions`);
      
      if (response.data && Array.isArray(response.data.transactions)) {
        setBudgetTransactions(response.data.transactions);
      } else {
        // Fallback: Get all transactions and filter by category and date range
        const allTransactionsResponse = await api.get('/transactions');
        const allTransactions = allTransactionsResponse.data.transactions || [];
        
        // Get the budget details to know the date range and category
        const budgetResponse = await api.get(`/budgets/${budgetId}`);
        const budget = budgetResponse.data;
        
        if (budget) {
          const filtered = allTransactions.filter((transaction: Transaction) => {
            const transactionDate = new Date(transaction.date);
            const periodStart = new Date(budget.periodStart);
            const periodEnd = new Date(budget.periodEnd);
            
            return transaction.category === budget.category && 
                   transactionDate >= periodStart &&
                   transactionDate <= periodEnd;
          });
          
          setBudgetTransactions(filtered);
        } else {
          setBudgetTransactions([]);
        }
      }
    } catch (err) {
      console.error('Error fetching budget transactions:', err);
      setTransactionsError('Failed to load transactions for this budget.');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Handle view transactions
  const handleViewTransactions = (budget: Budget) => {
    setSelectedBudget(budget);
    setTransactionsPage(1);
    fetchBudgetTransactions(budget.id);
    setShowTransactionsModal(true);
  };

  // Close transactions modal
  const closeTransactionsModal = () => {
    setShowTransactionsModal(false);
    setBudgetTransactions([]);
    setSelectedBudget(null);
  };

  // Handle transaction modal close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTransactionsModal && 
          transactionsModalRef.current && 
          !transactionsModalRef.current.contains(event.target as Node)) {
        closeTransactionsModal();
      }
    };

    if (showTransactionsModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTransactionsModal]);

  // Calculate paginated transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (transactionsPage - 1) * transactionsPerPage;
    return budgetTransactions.slice(startIndex, startIndex + transactionsPerPage);
  }, [budgetTransactions, transactionsPage]);

  // Transaction pagination
  const totalTransactionPages = Math.ceil(budgetTransactions.length / transactionsPerPage);
  
  // Navigate transaction pages
  const goToTransactionPage = (page: number) => {
    setTransactionsPage(Math.max(1, Math.min(page, totalTransactionPages)));
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
                    item.id === 'budgets'
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
        {/* Top navigation */}
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
              <div className="flex items-center">
                <PieChart size={20} className="text-primary mr-2" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent">Budgets</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-gray-600 mr-2">Currency:</span>
                <span className="font-medium">{selectedCurrency.symbol} {selectedCurrency.code}</span>
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
        <main className="px-6 py-8">
          {/* Introduction section */}
          <div className="mb-8 bg-gradient-to-r from-primary/5 to-transparent p-4 sm:p-6 lg:p-8 rounded-2xl border border-primary/10 relative overflow-hidden z-0">
            {/* Decorative elements - Responsive sizing and positioning */}
            <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 bg-gradient-to-br from-primary/5 to-transparent rounded-full -mt-20 -mr-20 opacity-40"></div>
            <div className="absolute bottom-0 left-1/4 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-tr from-primary/10 to-transparent rounded-full -mb-10 opacity-40"></div>
            <div className="absolute top-1/2 left-1/3 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-primary/5 to-primary/20 rounded-full transform -translate-y-1/2 opacity-40 blur-xl"></div>
            
            <div className="relative z-1 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 lg:gap-8">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent mb-2 sm:mb-3">
                  Budget Management
                </h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl">
                  Track and control your spending by category to achieve your financial goals. Create budgets for essential categories to maintain better control over your expenses.
                </p>
                
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4 sm:mt-5">
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-success mr-1.5"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500 mr-1.5"></div>
                    <span>Warning</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-error mr-1.5"></div>
                    <span>Exceeded</span>
                  </div>
                </div>
              </div>
              
              <div className="w-full sm:w-auto">
                <Button 
                  variant="primary" 
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-[#2a5a4e] hover:shadow-lg hover:shadow-primary/10 transition-all transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base py-2.5 px-4 sm:py-3 sm:px-6"
                  onClick={toggleForm}
                >
                  <Plus size={18} className="flex-shrink-0" /> 
                  <span className="whitespace-nowrap">New Budget</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Filters */}
          <div className="mb-8">
            <Card className="p-4 sm:p-6 lg:p-8 border border-gray-100 bg-white/95 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
              {/* Decorative elements - Responsive */}
              <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 bg-gradient-to-br from-primary/5 to-primary/10 rounded-full -mt-16 -mr-16 opacity-70"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-tr from-primary/5 to-primary/10 rounded-full -mb-12 -ml-12 opacity-70"></div>
              <div className="absolute top-1/2 left-1/3 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-primary/5 to-primary/20 rounded-full transform -translate-y-1/2 opacity-40 blur-xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center mb-5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 shadow-inner shadow-primary/5">
                    <Filter size={16} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent">
                    Filter Budgets
                  </h3>
                </div>
                
                <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-100/50 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search Field */}
                    <div className="flex-1">
                      <label htmlFor="search" className="flex items-center text-xs text-gray-500 mb-1.5 group-hover:text-primary transition-colors">
                        <Search size={12} className="mr-1.5 text-primary/60" />
                        Search
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search size={14} className="text-gray-400 group-hover:text-primary transition-colors" />
                        </div>
                        <Input
                          id="search"
                          type="text"
                          placeholder="Search by category..."
                          className="pl-9 text-sm border-gray-200 focus:border-primary/50 transition-all rounded-lg bg-white shadow-sm hover:shadow focus:shadow-md w-full h-9 sm:h-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {/* Category Filter */}
                    <div>
                      <label htmlFor="category" className="flex items-center text-xs text-gray-500 mb-1.5 group-hover:text-primary transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-primary/60">
                          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
                        </svg>
                        Category
                      </label>
                      <div className="relative group">
                        <select
                          id="category"
                          className="w-full appearance-none pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-700 bg-white shadow-sm hover:shadow focus:shadow-md transition-all h-9 sm:h-10"
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                          <option value="">All Categories</option>
                          {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-primary transition-colors">
                            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
                          </svg>
                        </div>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                          <ChevronRight size={14} className="transform rotate-90 text-gray-400" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Sort Filter */}
                    <div>
                      <label htmlFor="sort" className="flex items-center text-xs text-gray-500 mb-1.5 group-hover:text-primary transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-primary/60">
                          <path d="M11 5h10"/>
                          <path d="M11 9h7"/>
                          <path d="M11 13h4"/>
                          <path d="m3 17 3 3 3-3"/>
                          <path d="M6 18V4"/>
                        </svg>
                        Sort By
                      </label>
                      <div className="relative group">
                        <select
                          id="sort"
                          className="w-full appearance-none pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-700 bg-white shadow-sm hover:shadow focus:shadow-md transition-all h-9 sm:h-10"
                          value={sortOption}
                          onChange={(e) => setSortOption(e.target.value)}
                        >
                          {sortOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-primary transition-colors">
                            <path d="M11 5h10"/>
                            <path d="M11 9h7"/>
                            <path d="M11 13h4"/>
                            <path d="m3 17 3 3 3-3"/>
                            <path d="M6 18V4"/>
                          </svg>
                        </div>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                          <ChevronRight size={14} className="transform rotate-90 text-gray-400" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Reset Button */}
                    <div>
                      <label className="flex items-center text-xs text-gray-500 mb-1.5 invisible">
                        <X size={12} className="mr-1.5 text-primary/60" />
                        Actions
                      </label>
                      <Button 
                        id="reset"
                        variant="outline" 
                        className="w-full h-9 sm:h-10 flex items-center justify-center gap-2 border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
                        onClick={clearFilters}
                      >
                        <X size={14} className="flex-shrink-0" />
                        Reset Filters
                      </Button>
                    </div>
                  </div>
                  
                  {/* Active filters display */}
                  {(searchQuery || selectedCategory || sortOption !== 'highest-usage') && (
                    <div className="mt-4 pt-4 border-t border-gray-200/70">
                      <p className="text-xs text-gray-500 mb-2 flex items-center">
                        <Filter size={12} className="mr-1.5 text-primary/60" />
                        Active Filters:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {searchQuery && (
                          <div className="flex items-center bg-primary/5 text-primary text-xs px-2.5 py-1 rounded-full border border-primary/10">
                            <span className="truncate max-w-[150px]">Search: {searchQuery}</span>
                            <button 
                              onClick={() => setSearchQuery('')}
                              className="ml-1.5 p-0.5 hover:bg-primary/10 rounded-full"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                        
                        {selectedCategory && (
                          <div className="flex items-center bg-blue-500/5 text-blue-500 text-xs px-2.5 py-1 rounded-full border border-blue-500/10">
                            <span className="truncate max-w-[150px]">Category: {selectedCategory}</span>
                            <button 
                              onClick={() => setSelectedCategory('')}
                              className="ml-1.5 p-0.5 hover:bg-blue-500/10 rounded-full"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                        
                        {sortOption !== 'highest-usage' && (
                          <div className="flex items-center bg-purple-500/5 text-purple-500 text-xs px-2.5 py-1 rounded-full border border-purple-500/10">
                            <span className="truncate max-w-[150px]">Sort: {sortOptions.find(opt => opt.value === sortOption)?.label}</span>
                            <button 
                              onClick={() => setSortOption('highest-usage')}
                              className="ml-1.5 p-0.5 hover:bg-purple-500/10 rounded-full"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
          
          {/* Budgets grid */}
          {isLoading ? (
            <div className="animate-fadeIn flex flex-col items-center justify-center min-h-[60vh] bg-white/50 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm p-10">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-2"></div>
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <PieChart size={24} className="text-primary" />
                </div>
              </div>
              <p className="mt-4 text-gray-500 font-medium">Loading your budgets...</p>
              <div className="mt-3 bg-gray-100 rounded-full h-1.5 w-48 overflow-hidden">
                <div className="bg-primary/40 h-full animate-pulse"></div>
              </div>
            </div>
          ) : error ? (
            <div className="animate-fadeIn flex flex-col items-center justify-center min-h-[60vh] text-center bg-white/50 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm p-10">
              <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4 shadow-inner shadow-error/5">
                <AlertCircle className="text-error" size={32} />
              </div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent mb-2">Oops! Something went wrong</h2>
              <p className="text-gray-500 max-w-md mb-6">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-primary to-[#2a5a4e] hover:shadow-lg hover:shadow-primary/10 transition-all transform hover:scale-[1.02] active:scale-[0.98] px-5 py-2.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                  <path d="M16 21h5v-5"></path>
                </svg>
                Try Again
              </Button>
            </div>
          ) : paginatedBudgets.length === 0 ? (
            <div className="animate-fadeIn flex flex-col items-center justify-center min-h-[60vh] text-center bg-white/70 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm p-10">
              {searchQuery || selectedCategory ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-gray-100/80 flex items-center justify-center mb-6 shadow-inner">
                    <Search className="text-gray-400" size={36} />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent mb-3">No matching budgets found</h2>
                  <p className="text-gray-600 max-w-md mb-6">We couldn't find any budgets that match your search criteria. Try adjusting your filters or create a new budget.</p>
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="px-6 flex items-center gap-2 hover:bg-gray-50 border-primary/20 text-primary hover:border-primary/40"
                  >
                    <Filter size={18} /> Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 shadow-inner">
                    <PieChart className="text-primary" size={42} />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent mb-3">Create your first budget</h2>
                  <p className="text-gray-600 max-w-md mb-8">
                    Track your spending by category and stay on top of your financial goals. Setting up budgets will help you manage your finances more effectively.
                  </p>
                  <Button 
                    onClick={toggleForm}
                    className="px-6 py-2.5 bg-gradient-to-r from-primary to-[#2a5a4e] shadow-lg hover:shadow-xl hover:shadow-primary/10 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                  >
                    <Plus size={20} className="mr-1" /> Create Your First Budget
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {paginatedBudgets.map((budget: Budget) => (
                  <Card 
                    key={budget.id} 
                    className="p-4 sm:p-6 hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 hover:border-primary/20 overflow-hidden relative"
                    onClick={() => handleViewTransactions(budget)}
                  >
                    {/* Desktop decorative elements */}
                    <div className="hidden sm:block absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 bg-gradient-to-br from-primary/5 to-primary/20 rounded-full"></div>
                    <div className="hidden sm:block absolute bottom-0 left-0 w-16 h-16 -ml-8 -mb-8 bg-gradient-to-tr from-primary/5 to-primary/10 rounded-full"></div>
                    
                    {/* Mobile Layout */}
                    <div className="sm:hidden">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-primary inline-block mr-2"></span>
                            <h3 className="text-sm font-medium text-gray-800 truncate max-w-[150px]">{budget.category}</h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(budget);
                            }}
                            className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors"
                            title="Edit Budget"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteClick(budget.id, e)}
                            className="p-1.5 rounded-full text-gray-500 hover:bg-error/10 hover:text-error transition-colors"
                            title="Delete Budget"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span className="flex items-center">
                          <Calendar size={12} className="mr-1" />
                          {formatDate(budget.periodStart)} - {formatDate(budget.periodEnd)}
                        </span>
                        <span className={`font-medium ${budget.spent >= budget.amount ? 'text-error' : 'text-success'}`}>
                          {formatCurrency(Math.max(budget.amount - budget.spent, 0))} left
                        </span>
                      </div>

                      <div className="relative pt-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">
                            {formatCurrency(budget.spent)} of {formatCurrency(budget.amount)}
                          </span>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                            calculatePercentage(budget.spent, budget.amount) > 90 
                              ? 'bg-error/10 text-error' 
                              : calculatePercentage(budget.spent, budget.amount) > 75
                                ? 'bg-yellow-50 text-yellow-600'
                                : 'bg-green-50 text-green-600'
                          }`}>
                            {calculatePercentage(budget.spent, budget.amount)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getProgressBarColor(budget.spent, budget.amount)} transition-all duration-500 ease-out`}
                            style={{ 
                              width: `${calculatePercentage(budget.spent, budget.amount)}%`,
                              boxShadow: '0 0 8px rgba(0,128,0,0.2)'
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Desktop Layout */}
                    <div className="hidden sm:block">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-primary inline-block"></span>
                            {budget.category}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            <span className="inline-flex items-center">
                              <Calendar size={14} className="mr-1 text-gray-400" />
                              {formatDate(budget.periodStart)} - {formatDate(budget.periodEnd)}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(budget);
                            }}
                            className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors"
                            title="Edit Budget"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteClick(budget.id, e)}
                            className="p-1.5 rounded-full text-gray-500 hover:bg-error/10 hover:text-error transition-colors"
                            title="Delete Budget"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mb-6 mt-6">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium text-gray-600 flex items-center">
                            <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
                            Spent: {formatCurrency(budget.spent)}
                          </span>
                          <span className="text-sm font-medium bg-gray-50 px-2 py-0.5 rounded">
                            {formatCurrency(budget.amount)}
                          </span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getProgressBarColor(budget.spent, budget.amount)} transition-all duration-500 ease-out`}
                            style={{ 
                              width: `${calculatePercentage(budget.spent, budget.amount)}%`,
                              boxShadow: '0 0 8px rgba(0,128,0,0.2)'
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-end mt-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
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
                      
                      <div className="flex justify-between items-center text-sm mt-auto pt-3 border-t border-gray-100">
                        <span className="text-gray-600">Remaining:</span>
                        <span className={`font-medium ${budget.spent >= budget.amount ? 'text-error' : 'text-success'}`}>
                          {formatCurrency(Math.max(budget.amount - budget.spent, 0))}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              {/* Pagination - Enhanced */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => goToPage(Math.max(currentPage - 1, 1))}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg flex items-center justify-center ${
                        currentPage === 1 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-700 hover:bg-primary/10 hover:text-primary'
                      } transition-colors border border-gray-200`}
                      aria-label="Previous page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      // Logic to determine which pages to show (unchanged)
                      let pageToShow: number;
                      if (totalPages <= 5) {
                        pageToShow = i + 1;
                      } else if (currentPage <= 3) {
                        if (i < 4) {
                          pageToShow = i + 1;
                        } else {
                          pageToShow = totalPages;
                        }
                      } else if (currentPage >= totalPages - 2) {
                        if (i === 0) {
                          pageToShow = 1;
                        } else {
                          pageToShow = totalPages - 4 + i;
                        }
                      } else {
                        if (i === 0) {
                          pageToShow = 1;
                        } else if (i === 4) {
                          pageToShow = totalPages;
                        } else {
                          pageToShow = currentPage - 1 + (i - 1);
                        }
                      }
                      
                      // Display ellipsis or page button
                      if (i > 0 && pageToShow > (i === 1 ? 2 : (i === 4 ? totalPages - 1 : currentPage - 1 + (i - 2)))) {
                        return (
                          <span key={`ellipsis-${i}`} className="text-gray-400">...</span>
                        );
                      }
                      
                      return (
                        <button
                          key={pageToShow}
                          onClick={() => goToPage(pageToShow)}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                            currentPage === pageToShow
                              ? 'bg-primary text-white font-medium'
                              : 'bg-white text-gray-700 hover:bg-primary/10 hover:text-primary'
                          } border border-gray-200`}
                        >
                          {pageToShow}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => goToPage(Math.min(currentPage + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg flex items-center justify-center ${
                        currentPage === totalPages 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-700 hover:bg-primary/10 hover:text-primary'
                      } transition-colors border border-gray-200`}
                      aria-label="Next page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
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
              className={`flex flex-col items-center justify-center py-2 px-1 text-xs ${
                item.id === 'budgets'
                  ? 'text-primary'
                  : 'text-gray-600 hover:text-primary'
              } focus:text-primary transition-colors`}
            >
              <item.icon size={20} className="mb-1" />
              <span className="truncate w-full text-center">{item.text}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Add/Edit Budget Modal */}
      {showForm && (
        <div className={MODAL_STYLES.backdrop}>
          <div 
            ref={modalRef}
            className={MODAL_STYLES.container}
          >
            {showUpdateConfirmation ? (
              // Update confirmation dialog
              <div className="animate-fadeIn">
                <div className="flex items-center mb-4">
                  <AlertCircle size={24} className="text-primary mr-3" />
                  <h3 className="text-lg font-semibold text-gray-800">Budget Already Exists</h3>
                </div>
                
                <p className="text-gray-600 mb-6">
                  A budget for this category and date range already exists. Would you like to update the existing budget instead?
                </p>
                
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateConfirmation(false)}
                  >
                    Create New
                  </Button>
                  <Button
                    onClick={() => handleUpdateConfirmation(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Update Existing
                  </Button>
                </div>
              </div>
            ) : (
              // Regular budget form
              <>
                <div className={MODAL_STYLES.header}>
                  <div className="flex items-center">
                    <div className={MODAL_STYLES.iconContainer}>
                      <PieChart size={18} className={MODAL_STYLES.icon} />
                    </div>
                    <h2 className={MODAL_STYLES.title}>
                      {isEditing ? 'Edit Budget' : 'Create Budget'}
                    </h2>
                  </div>
                  <button
                    onClick={toggleForm}
                    className={MODAL_STYLES.closeButton}
                  >
                    <X size={20} />
                  </button>
                </div>
                
                {formErrors.general && (
                  <div className="mb-5 p-3 bg-error/10 rounded-lg border border-error/30 text-error flex items-center">
                    <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                    <p>{formErrors.general}</p>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className={MODAL_STYLES.form}>
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
                        value={formData.category}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Category</option>
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
                        className={`${MODAL_STYLES.input} ${MODAL_STYLES.currencyInput} ${formErrors.amount ? 'border-error focus:ring-error/50' : ''}`}
                        value={formData.amount}
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
                          className={`${MODAL_STYLES.input} pl-10 ${formErrors.period_start ? 'border-error focus:ring-error/50' : ''}`}
                          value={formData.period_start}
                          onChange={handleInputChange}
                        />
                      </div>
                      {formErrors.period_start && (
                        <p className={MODAL_STYLES.error}>
                          <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                          {formErrors.period_start}
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
                          className={`${MODAL_STYLES.input} pl-10 ${formErrors.period_end ? 'border-error focus:ring-error/50' : ''}`}
                          value={formData.period_end}
                          onChange={handleInputChange}
                        />
                      </div>
                      {formErrors.period_end && (
                        <p className={MODAL_STYLES.error}>
                          <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                          {formErrors.period_end}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className={MODAL_STYLES.footer}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={toggleForm}
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
                          {isEditing ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        isEditing ? 'Update Budget' : 'Create Budget'
                      )}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal - redesigned to match Transactions page */}
      {showDeleteConfirmation && (
        <div className={MODAL_STYLES.backdrop}>
          <div 
            ref={deleteModalRef}
            className={MODAL_STYLES.deleteContainer}
          >
            <div className={MODAL_STYLES.deleteIcon}>
              <Trash2 className="text-error" size={28} />
            </div>
            <h2 className={MODAL_STYLES.deleteTitle}>
              Delete Budget
            </h2>
            <p className={MODAL_STYLES.deleteMessage}>
              Are you sure you want to delete this budget? This action cannot be undone.
            </p>
            
            <div className={MODAL_STYLES.deleteButtonsContainer}>
              <Button
                type="button"
                variant="outline"
                className={MODAL_STYLES.deleteButtonCancel}
                onClick={cancelDelete}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={MODAL_STYLES.deleteButtonDelete}
                onClick={confirmDelete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className={MODAL_STYLES.buttonLoading}></div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Transactions Modal */}
      {showTransactionsModal && selectedBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div 
            ref={transactionsModalRef}
            className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] overflow-auto border border-gray-100"
          >
            <div className="sticky top-0 bg-white z-10 p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <CreditCard size={20} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-primary inline-block mr-2"></span>
                      {selectedBudget.category}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {formatDate(selectedBudget.periodStart)} - {formatDate(selectedBudget.periodEnd)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeTransactionsModal}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Budget Amount</p>
                  <span className="text-lg font-semibold text-gray-900">{formatCurrency(selectedBudget.amount)}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Spent So Far</p>
                  <span className="text-lg font-semibold text-gray-900">{formatCurrency(selectedBudget.spent)}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Remaining</p>
                  <span className={`text-lg font-semibold ${selectedBudget.spent >= selectedBudget.amount ? 'text-error' : 'text-success'}`}>
                    {formatCurrency(Math.max(selectedBudget.amount - selectedBudget.spent, 0))}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <CreditCard size={18} className="mr-2 text-primary" />
                Related Transactions
              </h3>
              
              {isLoadingTransactions ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                </div>
              ) : transactionsError ? (
                <div className="text-center py-8 bg-error/5 rounded-lg border border-error/20">
                  <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="text-error" size={24} />
                  </div>
                  <p className="text-gray-600 mb-3">{transactionsError}</p>
                  <Button 
                    variant="outline" 
                    className="mt-2 border-error/20 text-error hover:bg-error/10"
                    onClick={() => fetchBudgetTransactions(selectedBudget.id)}
                  >
                    Try Again
                  </Button>
                </div>
              ) : budgetTransactions.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="text-gray-400" size={28} />
                  </div>
                  <p className="text-gray-700 font-medium mb-1">No transactions found</p>
                  <p className="text-gray-500 text-sm max-w-md mx-auto">There are no transactions in this category for the selected time period.</p>
                </div>
              ) : (
                <>
                  {/* Mobile View - List Layout */}
                  <div className="block sm:hidden space-y-3">
                    {paginatedTransactions.map((transaction) => (
                      <div 
                        key={transaction.id}
                        className="bg-white rounded-lg border border-gray-100 p-3 hover:border-primary/20 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate mb-1">
                              {transaction.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(transaction.date)}
                            </p>
                          </div>
                          <div className="ml-3">
                            <span className="text-sm font-medium">
                              {formatCurrency(transaction.amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View - Table Layout */}
                  <div className="hidden sm:block overflow-hidden border border-gray-200 rounded-lg shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedTransactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatDate(transaction.date)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                              {transaction.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                              {formatCurrency(transaction.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              
              {/* Pagination */}
              {totalTransactionPages > 1 && (
                <div className="flex justify-center items-center mt-6">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => goToTransactionPage(Math.max(transactionsPage - 1, 1))}
                      disabled={transactionsPage === 1}
                      className={`p-2 rounded-lg flex items-center justify-center ${
                        transactionsPage === 1 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-700 hover:bg-primary/10 hover:text-primary'
                      } transition-colors border border-gray-200`}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    
                    {Array.from({ length: totalTransactionPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => goToTransactionPage(i + 1)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          transactionsPage === i + 1
                            ? 'bg-primary text-white font-medium'
                            : 'bg-white text-gray-700 hover:bg-primary/10 hover:text-primary'
                        } border border-gray-200`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => goToTransactionPage(Math.min(transactionsPage + 1, totalTransactionPages))}
                      disabled={transactionsPage === totalTransactionPages}
                      className={`p-2 rounded-lg flex items-center justify-center ${
                        transactionsPage === totalTransactionPages 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-700 hover:bg-primary/10 hover:text-primary'
                      } transition-colors border border-gray-200`}
                      aria-label="Next page"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetsPage; 