import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  ChevronLeft,
  ChevronRight,
  CreditCard, 
  Download,
  Filter,
  Plus, 
  Search,
  Trash2,
  X,
  FileText,
  PieChart,
  Target,
  Calendar,
  LogOut,
  Menu,
  AlertCircle,
  Receipt
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axiosConfig';

// Types
interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
}

interface TransactionFormData {
  amount: string;
  category: string;
  description: string;
  date: string;
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
};

const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [dateRange, setDateRange] = useState<{startDate: string; endDate: string}>({
    startDate: '',
    endDate: ''
  });
  const [sortOption, setSortOption] = useState<string>('latest');
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Delete confirmation modal
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [formData, setFormData] = useState<TransactionFormData>({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Form errors
  const [formErrors, setFormErrors] = useState({
    amount: '',
    category: '',
    description: '',
    date: '',
  });

  // Pagination settings
  const itemsPerPage = 10;
  
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
    'General',
    'Income'
  ];
  
  // Sort options
  const sortOptions = [
    { value: 'latest', label: 'Latest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'highest', label: 'Highest Amount' },
    { value: 'lowest', label: 'Lowest Amount' }
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

  // Format currency (updated to use the selected currency)
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

  // Fetch transactions with pagination support
  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First request to get initial data and pagination info
      const initialResponse = await api.get('/transactions');
      console.log('Initial API Response:', initialResponse.data);
      
      // Check if the response has pagination info
      if (initialResponse.data && 
          typeof initialResponse.data.totalPages === 'number' && 
          Array.isArray(initialResponse.data.transactions)) {
        
        // Get the first page transactions
        let allTransactions = [...initialResponse.data.transactions];
        const totalAPIPages = initialResponse.data.totalPages;
        
        // If there are more pages, fetch them all
        if (totalAPIPages > 1) {
          const additionalRequests = [];
          
          // Create requests for pages 2 to totalPages
          for (let page = 2; page <= totalAPIPages; page++) {
            additionalRequests.push(api.get(`/transactions?page=${page}`));
          }
          
          // Execute all requests in parallel
          const results = await Promise.all(additionalRequests);
          
          // Combine all transactions
          results.forEach(response => {
            if (response.data && Array.isArray(response.data.transactions)) {
              allTransactions = [...allTransactions, ...response.data.transactions];
            }
          });
        }
        
        // Set combined transactions from all pages
        setTransactions(allTransactions);
        console.log(`Loaded ${allTransactions.length} transactions from ${totalAPIPages} pages`);
        
      } else if (Array.isArray(initialResponse.data)) {
        // Handle case where API returns array directly
        setTransactions(initialResponse.data);
      } else if (initialResponse.data && Array.isArray(initialResponse.data.transactions)) {
        // Handle case with no pagination info but transactions array
        setTransactions(initialResponse.data.transactions);
      } else {
        console.error('Unexpected API response format:', initialResponse.data);
        setTransactions([]);
        setError('Received unexpected data format from server');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchTransactions();
  }, []);
  
  // Calculate total transactions
  const calculateTotal = (transactions: Transaction[]): number => {
    return transactions.reduce((total, transaction) => {
      // Consider income as positive and expenses as negative
      if (transaction.category === 'Income') {
        return total + transaction.amount;
      } else {
        return total - transaction.amount;
      }
    }, 0);
  };
  
  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Search filter
      const searchMatch = searchQuery === '' || 
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchQuery.toLowerCase());
        
      // Category filter
      const categoryMatch = selectedCategory === '' || transaction.category === selectedCategory;
      
      // Date range filter
      let dateMatch = true;
      if (dateRange.startDate && dateRange.endDate) {
        const transactionDate = new Date(transaction.date).getTime();
        const startDate = new Date(dateRange.startDate).getTime();
        const endDate = new Date(dateRange.endDate).getTime();
        dateMatch = transactionDate >= startDate && transactionDate <= endDate;
      }
      
      return searchMatch && categoryMatch && dateMatch;
    }).sort((a, b) => {
      // Apply the selected sort option
      switch (sortOption) {
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'highest':
          return b.amount - a.amount;
        case 'lowest':
          return a.amount - b.amount;
        case 'latest':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
  }, [transactions, searchQuery, selectedCategory, dateRange, sortOption]);
  
  // Paginated transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage]);
  
  // Total pages
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  
  // Page navigation
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };
  
  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when field is edited
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
  };
  
  // Validate form
  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors = { ...formErrors };
    
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
      isValid = false;
    }
    
    if (!formData.category) {
      newErrors.category = 'Please select a category';
      isValid = false;
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Please enter a description';
      isValid = false;
    }
    
    if (!formData.date) {
      newErrors.date = 'Please select a date';
      isValid = false;
    } else {
      // Check if the date is in the future
      const selectedDate = new Date(formData.date);
      const today = new Date();
      
      // Reset both dates to start of day for proper comparison
      selectedDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate > today) {
        newErrors.date = 'Transactions cannot be created with a future date';
        isValid = false;
      }
    }
    
    setFormErrors(newErrors);
    return isValid;
  };
  
  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (isEditing && selectedTransaction) {
        // Update transaction
        await api.put(`/transactions/${selectedTransaction.id}`, {
          amount: Number(formData.amount),
          category: formData.category,
          description: formData.description,
          date: new Date(formData.date).toISOString()
        });
      } else {
        // Create new transaction
        await api.post('/transactions', {
          amount: Number(formData.amount),
          category: formData.category,
          description: formData.description,
          date: new Date(formData.date).toISOString()
        });
      }
      
      // Reset form and refresh data
      setFormData({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
      setIsEditing(false);
      setSelectedTransaction(null);
      fetchTransactions();
    } catch (error) {
      console.error('Error saving transaction:', error);
      setError('Failed to save transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Edit transaction
  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      amount: String(transaction.amount),
      category: transaction.category,
      description: transaction.description,
      date: new Date(transaction.date).toISOString().split('T')[0],
    });
    setIsEditing(true);
    setShowForm(true);
  };
  
  // Handle delete transaction click
  const handleDeleteClick = (id: string) => {
    setTransactionToDelete(id);
    setShowDeleteConfirmation(true);
  };
  
  // Confirm delete transaction
  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    
    setIsLoading(true);
    
    try {
      await api.delete(`/transactions/${transactionToDelete}`);
      await fetchTransactions();
      setShowDeleteConfirmation(false);
      setTransactionToDelete(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setError('Failed to delete transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cancel delete transaction
  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setTransactionToDelete(null);
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
    setIsEditing(false);
    setSelectedTransaction(null);
  };
  
  // Toggle form
  const toggleForm = () => {
    if (showForm) {
      resetForm();
    }
    setShowForm(!showForm);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setDateRange({
      startDate: '',
      endDate: ''
    });
    setSortOption('latest');
  };
  
  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, dateRange, sortOption]);

  // Update current page if it exceeds new total pages after filtering
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const modalRef = useRef<HTMLDivElement>(null);
  
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

  // Navigate to sections
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

  // Category color mapping
  const categoryColorMap: Record<string, { bg: string; text: string; icon?: React.ReactNode }> = {
    Income: { 
      bg: 'bg-success/10', 
      text: 'text-success',
      icon: <ArrowUpRight size={14} />
    },
    Bills: { 
      bg: 'bg-error/10', 
      text: 'text-error',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    },
    'Dining Out': { 
      bg: 'bg-orange-500/10', 
      text: 'text-orange-500',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 11H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2Z"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    },
    Entertainment: { 
      bg: 'bg-purple-500/10', 
      text: 'text-purple-500',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    },
    Groceries: { 
      bg: 'bg-green-600/10', 
      text: 'text-green-600',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
    },
    Transportation: { 
      bg: 'bg-blue-500/10', 
      text: 'text-blue-500',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.9 2 11 2 11.3V15c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
    },
    'Personal Care': { 
      bg: 'bg-pink-500/10', 
      text: 'text-pink-500',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 5V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v1"/><path d="M17 14h.01"/><path d="M7 14h.01"/><path d="M12 16v.01"/><path d="M3 20a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-1a3 3 0 0 0-3-3h-2l-3 2-3-2H8a3 3 0 0 0-3 3v1"/><path d="M12 14a3 3 0 0 0 3-3V5H9v6a3 3 0 0 0 3 3Z"/></svg>
    },
    Education: { 
      bg: 'bg-yellow-500/10', 
      text: 'text-yellow-600',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
    },
    Lifestyle: { 
      bg: 'bg-indigo-500/10', 
      text: 'text-indigo-500',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>
    },
    Shopping: { 
      bg: 'bg-cyan-500/10', 
      text: 'text-cyan-600',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 9 3 3 3-3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m16 6 3-3 3 3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>
    },
    General: { 
      bg: 'bg-gray-500/10', 
      text: 'text-gray-600',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
    }
  };

  // Get color mapping for a category, default to primary if not found
  const getCategoryColor = (category: string) => {
    return categoryColorMap[category] || { bg: 'bg-primary/10', text: 'text-primary' };
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
              { icon: Target, text: 'Savings', id: 'savings' },
              { icon: Calendar, text: 'Bills', id: 'bills' },
            ].map((item) => (
              <li key={item.id}>
                <button
                  className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 ${
                    item.id === 'transactions'
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
      <div className={`flex-1 ${isSidebarOpen ? 'sm:ml-64' : 'sm:ml-0'} transition-all duration-300 pb-20 sm:pb-0 min-w-0`}>
        {/* Header with toggle sidebar button */}
        <header className="bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center min-w-0">
              <button 
                onClick={toggleSidebar} 
                className="hidden sm:flex text-gray-500 hover:text-primary mr-4 transition-colors bg-gray-100 p-2 rounded-lg flex-shrink-0"
                aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center min-w-0">
                <CreditCard size={20} className="text-primary mr-2 flex-shrink-0" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent truncate">Transactions</h1>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-sm text-gray-500 flex items-center">
                <span className="mr-2">Currency:</span>
                <span className="font-medium text-gray-700">{selectedCurrency.symbol} {selectedCurrency.code}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center text-primary font-medium shadow-sm ring-2 ring-white flex-shrink-0">
                {user?.name?.charAt(0)}
              </div>
              <span className="ml-2 text-gray-700 font-medium hidden md:block truncate max-w-[150px]">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 sm:p-6">
          {/* Introduction section */}
          <div className="mb-8 bg-gradient-to-r from-primary/5 to-transparent p-4 sm:p-6 lg:p-8 rounded-2xl border border-primary/10 relative overflow-hidden z-0">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 bg-gradient-to-br from-primary/5 to-transparent rounded-full -mt-20 -mr-20 opacity-40"></div>
            <div className="absolute bottom-0 left-1/4 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-tr from-primary/10 to-transparent rounded-full -mb-10 opacity-40"></div>
            
            <div className="relative z-1 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 lg:gap-8">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent mb-2 sm:mb-3">
                  Financial Transactions
                </h1>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl">
                  View, track, and manage all your financial activities in one place. Add new transactions or filter existing ones to gain insights into your spending habits.
                </p>
                
                <div className="flex flex-wrap items-center gap-4 mt-4 sm:mt-5">
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-success mr-1.5"></div>
                    <span>Income</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-error mr-1.5"></div>
                    <span>Expenses</span>
                  </div>
                </div>
              </div>
              
              <div className="w-full sm:w-auto">
                <Button 
                  onClick={toggleForm} 
                  className="w-full sm:w-auto bg-gradient-to-r from-primary to-[#2a5a4e] hover:from-primary/90 hover:to-[#2a5a4e]/90 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base py-2.5 px-4 sm:py-3 sm:px-6"
                >
                  <div className="flex items-center justify-center">
                    <Plus size={18} className="mr-1.5" />
                    Add Transaction
                  </div>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 lg:gap-8 mb-4 sm:mb-8">
            {/* Total Transactions Card */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-100 shadow-sm sm:shadow-md p-3 sm:p-5 backdrop-blur-md bg-white/95 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-16 h-16 sm:w-32 sm:h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -mt-8 -mr-8 opacity-40"></div>
              
              <div className="relative z-10">
                <div className="flex items-center mb-2 sm:mb-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 sm:mr-3">
                    <CreditCard size={14} className="text-primary sm:hidden" />
                    <CreditCard size={16} className="text-primary hidden sm:block" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-600">Total Transactions</h3>
                </div>
                
                <div className="flex items-end mb-1.5 sm:mb-2">
                  <span className="text-lg sm:text-2xl lg:text-3xl font-semibold text-gray-800 mr-1.5 sm:mr-2">{transactions.length}</span>
                  <span className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">transactions</span>
                </div>
                
                <div className="w-full h-1 sm:h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary/70 to-primary/40 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>

            {/* Income Card */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-100 shadow-sm sm:shadow-md p-3 sm:p-5 backdrop-blur-md bg-white/95 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-16 h-16 sm:w-32 sm:h-32 bg-gradient-to-br from-success/5 to-transparent rounded-full -mt-8 -mr-8 opacity-40"></div>
              
              <div className="relative z-10">
                <div className="flex items-center mb-2 sm:mb-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-success/10 flex items-center justify-center mr-2 sm:mr-3">
                    <ArrowUpRight size={14} className="text-success sm:hidden" />
                    <ArrowUpRight size={16} className="text-success hidden sm:block" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-600">Total Income</h3>
                </div>
                
                <div className="flex items-end mb-1.5 sm:mb-2">
                  <span className="text-lg sm:text-2xl lg:text-3xl font-semibold text-success mr-1.5 sm:mr-2">
                    {formatCurrency(transactions.reduce((sum, t) => t.category === 'Income' ? sum + t.amount : sum, 0))}
                  </span>
                  <span className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">received</span>
                </div>
                
                <div className="w-full h-1 sm:h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-success/70 to-success/40 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>

            {/* Expenses Card */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-100 shadow-sm sm:shadow-md p-3 sm:p-5 backdrop-blur-md bg-white/95 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-16 h-16 sm:w-32 sm:h-32 bg-gradient-to-br from-error/5 to-transparent rounded-full -mt-8 -mr-8 opacity-40"></div>
              
              <div className="relative z-10">
                <div className="flex items-center mb-2 sm:mb-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-error/10 flex items-center justify-center mr-2 sm:mr-3">
                    <ArrowDownLeft size={14} className="text-error sm:hidden" />
                    <ArrowDownLeft size={16} className="text-error hidden sm:block" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-600">Total Expenses</h3>
                </div>
                
                <div className="flex items-end mb-1.5 sm:mb-2">
                  <span className="text-lg sm:text-2xl lg:text-3xl font-semibold text-error mr-1.5 sm:mr-2">
                    {formatCurrency(transactions.reduce((sum, t) => t.category !== 'Income' ? sum + t.amount : sum, 0))}
                  </span>
                  <span className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">spent</span>
                </div>
                
                <div className="w-full h-1 sm:h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-error/70 to-error/40 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>

            {/* Balance Card */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-100 shadow-sm sm:shadow-md p-3 sm:p-5 backdrop-blur-md bg-white/95 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-16 h-16 sm:w-32 sm:h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -mt-8 -mr-8 opacity-40"></div>
              
              <div className="relative z-10">
                <div className="flex items-center mb-2 sm:mb-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 sm:mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary w-3.5 h-3.5 sm:w-4 sm:h-4">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-600">Current Balance</h3>
                </div>
                
                <div className="flex items-end mb-1.5 sm:mb-2">
                  <span className={`text-lg sm:text-2xl lg:text-3xl font-semibold ${calculateTotal(filteredTransactions) >= 0 ? 'text-success' : 'text-error'} mr-1.5 sm:mr-2`}>
                    {formatCurrency(calculateTotal(filteredTransactions))}
                  </span>
                  <span className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">
                    {calculateTotal(filteredTransactions) >= 0 ? 'positive' : 'negative'}
                  </span>
                </div>
                
                <div className="w-full h-1 sm:h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full animate-pulse ${
                      calculateTotal(filteredTransactions) >= 0 
                        ? 'bg-gradient-to-r from-success/70 to-success/40'
                        : 'bg-gradient-to-r from-error/70 to-error/40'
                    }`}
                    style={{ width: `${Math.min(Math.abs(calculateTotal(filteredTransactions)) / 1000 * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters section */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 mb-8">
            {/* Filter card */}
            <Card className="backdrop-blur-md bg-white/95 border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden relative p-4 sm:p-6">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-primary/5 to-primary/10 rounded-full -mt-16 -mr-16 opacity-70"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-tr from-primary/5 to-primary/10 rounded-full -mb-12 -ml-12 opacity-70"></div>
              <div className="absolute top-1/2 left-1/3 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-primary/5 to-primary/20 rounded-full transform -translate-y-1/2 opacity-40 blur-xl"></div>
              
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-5 gap-3 sm:gap-4">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 shadow-inner shadow-primary/5">
                      <Filter size={18} className="text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent">
                      Transaction Filters
                    </h3>
                  </div>
                  <button
                    onClick={clearFilters}
                    className="text-sm w-full sm:w-auto flex items-center justify-center px-3 py-1.5 rounded-lg text-primary border border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                      <path d="M3 3h18v18H3zM15 9l-6 6m0-6l6 6"/>
                    </svg>
                    Clear Filters
                  </button>
                </div>
                
                <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-4 sm:p-5 mb-4 sm:mb-5 border border-gray-100/50 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-gray-400 group-hover:text-primary transition-colors" />
                      </div>
                      <input
                        type="text"
                        className="input-field pl-10 border-gray-200 focus:border-primary/50 transition-all rounded-lg bg-white shadow-sm hover:shadow focus:shadow-md w-full text-sm sm:text-base"
                        placeholder="Search by description or category"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-primary transition-colors">
                          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
                        </svg>
                      </div>
                      <select
                        className="input-field pl-10 border-gray-200 focus:border-primary/50 text-gray-700 transition-all rounded-lg bg-white shadow-sm hover:shadow focus:shadow-md appearance-none w-full text-sm sm:text-base"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        <option value="">All Categories</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-100/50 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="group">
                        <label htmlFor="startDate" className="flex items-center text-xs text-gray-500 mb-1.5 group-hover:text-primary transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-primary/60">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          Start Date
                        </label>
                        <div className="relative">
                          <input
                            id="startDate"
                            type="date"
                            className="input-field border-gray-200 focus:border-primary/50 transition-all rounded-lg bg-white shadow-sm hover:shadow focus:shadow-md w-full text-sm sm:text-base"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="group">
                        <label htmlFor="endDate" className="flex items-center text-xs text-gray-500 mb-1.5 group-hover:text-primary transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-primary/60">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          End Date
                        </label>
                        <div className="relative">
                          <input
                            id="endDate"
                            type="date"
                            className="input-field border-gray-200 focus:border-primary/50 transition-all rounded-lg bg-white shadow-sm hover:shadow focus:shadow-md w-full text-sm sm:text-base"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="group">
                      <label htmlFor="sortOption" className="flex items-center text-xs text-gray-500 mb-1.5 group-hover:text-primary transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-primary/60">
                          <path d="M11 5h10"/>
                          <path d="M11 9h7"/>
                          <path d="M11 13h4"/>
                          <path d="m3 17 3 3 3-3"/>
                          <path d="M6 18V4"/>
                        </svg>
                        Sort By
                      </label>
                      <div className="relative">
                        <select
                          id="sortOption"
                          className="input-field border-gray-200 focus:border-primary/50 transition-all rounded-lg bg-white shadow-sm hover:shadow focus:shadow-md appearance-none w-full text-sm sm:text-base"
                          value={sortOption}
                          onChange={(e) => setSortOption(e.target.value)}
                        >
                          {sortOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                            <path d="m6 9 6 6 6-6"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Active filters display */}
                  {(searchQuery || selectedCategory || dateRange.startDate || dateRange.endDate || sortOption !== 'latest') && (
                    <div className="mt-4 sm:mt-5 pt-4 border-t border-gray-200/70">
                      <p className="text-xs text-gray-500 mb-2 flex items-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-primary/60">
                          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
                        </svg>
                        Active Filters:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {searchQuery && (
                          <div className="flex items-center bg-primary/5 text-primary text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-primary/10">
                            <span className="truncate max-w-[150px] sm:max-w-none">Search: {searchQuery}</span>
                            <button 
                              onClick={() => setSearchQuery('')}
                              className="ml-1.5 p-0.5 hover:bg-primary/10 rounded-full"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                        
                        {selectedCategory && (
                          <div className={`flex items-center ${getCategoryColor(selectedCategory).bg} ${getCategoryColor(selectedCategory).text} text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-current border-opacity-10`}>
                            <span>Category: {selectedCategory}</span>
                            <button 
                              onClick={() => setSelectedCategory('')}
                              className="ml-1.5 p-0.5 hover:bg-black/5 rounded-full"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                        
                        {dateRange.startDate && dateRange.endDate && (
                          <div className="flex items-center bg-blue-500/5 text-blue-500 text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-blue-500/10">
                            <span className="truncate max-w-[200px] sm:max-w-none">
                              Date: {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
                            </span>
                            <button 
                              onClick={() => setDateRange({ startDate: '', endDate: '' })}
                              className="ml-1.5 p-0.5 hover:bg-blue-500/10 rounded-full"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                        
                        {sortOption !== 'latest' && (
                          <div className="flex items-center bg-purple-500/5 text-purple-500 text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-purple-500/10">
                            <span>Sort: {sortOptions.find(opt => opt.value === sortOption)?.label}</span>
                            <button 
                              onClick={() => setSortOption('latest')}
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
          
          {/* Transactions Table */}
          <Card className="overflow-hidden backdrop-blur-md bg-white/90 border border-gray-100/50 hover:shadow-lg transition-all duration-300">
            <div className="border-b pb-4 mb-5 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center">
              <CreditCard size={20} className="text-primary/80 mr-2" />
                <h2 className="text-lg sm:text-xl font-semibold text-primary">Transaction History</h2>
              </div>
              <div className="text-sm text-gray-500 flex items-center">
                <span className="hidden sm:inline mr-2">Showing</span>
                <span className="font-medium text-primary">{(currentPage - 1) * itemsPerPage + 1}</span>
                <span className="mx-1">to</span>
                <span className="font-medium text-primary">{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span>
                <span className="mx-1">of</span>
                <span className="font-medium text-primary">{filteredTransactions.length}</span>
                <span className="hidden sm:inline ml-1">results</span>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="text-center py-10 px-4">
                <div className="w-16 h-16 mx-auto bg-error/10 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle size={24} className="text-error" />
                </div>
                <p className="text-error mb-4">{error}</p>
                <Button onClick={fetchTransactions} className="bg-gradient-to-r from-primary to-[#2a5a4e] hover:from-primary/90 hover:to-[#2a5a4e]/90">Try Again</Button>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-20 h-20 mx-auto bg-gray-100/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                  <CreditCard size={40} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-500 mb-2">No transactions found</h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  {transactions.length === 0
                    ? "You haven't recorded any transactions yet."
                    : "No transactions match your filters."}
                </p>
                {transactions.length === 0 ? (
                  <Button onClick={toggleForm} className="bg-gradient-to-r from-primary to-[#2a5a4e] hover:from-primary/90 hover:to-[#2a5a4e]/90">Add Your First Transaction</Button>
                ) : (
                  <Button onClick={clearFilters} className="bg-gradient-to-r from-primary to-[#2a5a4e] hover:from-primary/90 hover:to-[#2a5a4e]/90">Clear Filters</Button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile View - Card Layout */}
                <div className="block sm:hidden">
                  <div className="space-y-4 px-4">
                    {paginatedTransactions.map((transaction, index) => (
                      <div
                        key={transaction.id}
                        className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 p-4 animate-fadeIn"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full ${getCategoryColor(transaction.category).bg} flex items-center justify-center`}>
                              {getCategoryColor(transaction.category).icon}
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">{transaction.description}</h3>
                              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${getCategoryColor(transaction.category).bg} ${getCategoryColor(transaction.category).text}`}>
                                <span className="mr-1">{getCategoryColor(transaction.category).icon}</span>
                                {transaction.category}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className={`text-sm font-medium ${transaction.category === 'Income' ? 'text-success' : 'text-error'} mb-1`}>
                              {formatCurrency(transaction.amount)}
                            </div>
                            <span className="text-xs text-gray-500">{formatDate(transaction.date)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => handleEdit(transaction)}
                            className="p-2 text-gray-500 hover:text-primary rounded-lg hover:bg-primary/10 transition-colors flex items-center text-sm"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M12 20h9"></path>
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(transaction.id)}
                            className="p-2 text-gray-500 hover:text-error rounded-lg hover:bg-error/10 transition-colors flex items-center text-sm"
                            title="Delete"
                          >
                            <Trash2 size={14} className="mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop View - Table Layout */}
                <div className="hidden sm:block">
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-full inline-block align-middle">
                      <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50/50 backdrop-blur-sm">
                              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 w-[100px] sm:w-[120px]">Date</th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500">Description</th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 w-[140px]">Category</th>
                              <th className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium text-gray-500 w-[120px] sm:w-[140px]">Amount</th>
                              <th className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium text-gray-500 w-[80px] sm:w-[100px]">Actions</th>
                      </tr>
                    </thead>
                          <tbody className="divide-y divide-gray-200">
                      {paginatedTransactions.map((transaction, index) => (
                        <tr 
                          key={transaction.id} 
                                className="hover:bg-gray-50/70 backdrop-blur-sm transition-colors animate-fadeIn"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                                <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-500 whitespace-nowrap">{formatDate(transaction.date)}</td>
                                <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium text-gray-700">
                                  <span className="truncate">{transaction.description}</span>
                                </td>
                                <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${getCategoryColor(transaction.category).bg} ${getCategoryColor(transaction.category).text}`}>
                              <span className="mr-1">{getCategoryColor(transaction.category).icon}</span>
                              {transaction.category}
                            </span>
                          </td>
                                <td className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end">
                                    <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center mr-2 flex-shrink-0">
                              {transaction.category === 'Income' ? (
                                  <ArrowUpRight size={14} className="text-success" />
                              ) : (
                                  <ArrowDownLeft size={14} className="text-error" />
                              )}
                                    </div>
                                    <span className={`text-xs sm:text-sm font-medium ${transaction.category === 'Income' ? 'text-success' : 'text-error'}`}>
                                {formatCurrency(transaction.amount)}
                              </span>
                            </div>
                          </td>
                                <td className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                              <button
                                onClick={() => handleEdit(transaction)}
                                className="p-1.5 text-gray-500 hover:text-primary rounded-full hover:bg-primary/10 transition-colors"
                                title="Edit"
                              >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 20h9"></path>
                                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteClick(transaction.id)}
                                className="p-1.5 text-gray-500 hover:text-error rounded-full hover:bg-error/10 transition-colors"
                                title="Delete"
                              >
                                      <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Pagination */}
                {filteredTransactions.length > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 border-t border-gray-100">
                    <div className="text-sm text-gray-500 mb-4 sm:mb-0 hidden sm:block">
                      Showing <span className="font-medium text-primary">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-primary">{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span> of <span className="font-medium text-primary">{filteredTransactions.length}</span> results
                    </div>
                    
                    {totalPages > 1 && (
                      <div className="flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-end">
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
                          <ChevronLeft size={18} />
                        </button>
                        
                        <div className="flex items-center space-x-1 sm:space-x-2">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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
                          
                          return (
                            <React.Fragment key={i}>
                              {i > 0 && pageToShow > (i === 1 ? 2 : (i === 4 ? totalPages - 1 : currentPage - 1 + (i - 2))) && (
                                <span className="text-gray-400">...</span>
                              )}
                              <button
                                onClick={() => goToPage(pageToShow)}
                                  className={`min-w-[2rem] h-8 sm:min-w-[2.5rem] sm:h-10 rounded-lg flex items-center justify-center transition-colors text-xs sm:text-sm ${
                                  currentPage === pageToShow
                                    ? 'bg-primary text-white font-medium'
                                    : 'bg-white text-gray-700 hover:bg-primary/10 hover:text-primary'
                                } border border-gray-200`}
                              >
                                {pageToShow}
                              </button>
                            </React.Fragment>
                          );
                        })}
                        </div>
                        
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
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
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
                item.id === 'transactions'
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

      {/* Transaction Form Modal */}
      {showForm && (
        <div className={MODAL_STYLES.backdrop}>
          <div 
            ref={modalRef}
            className={MODAL_STYLES.container}
          >
            <div className={MODAL_STYLES.header}>
              <div className="flex items-center">
                <div className={MODAL_STYLES.iconContainer}>
                  {isEditing ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={MODAL_STYLES.icon}>
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                  ) : (
                    <Receipt size={18} className={MODAL_STYLES.icon} />
                  )}
                </div>
                <h2 className={MODAL_STYLES.title}>
                  {isEditing ? 'Edit Transaction' : 'New Transaction'}
                </h2>
              </div>
              <button
                onClick={toggleForm}
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
            
            <form onSubmit={handleSubmit} className={MODAL_STYLES.form}>
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
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
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
                  value={formData.description}
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
                    value={formData.date}
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
                      {isEditing ? 'Updating...' : 'Saving...'}
                    </>
                  ) : (
                    isEditing ? 'Update Transaction' : 'Save Transaction'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn">
          <div 
            ref={deleteModalRef}
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-error" size={28} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Delete Transaction
              </h2>
              <p className="text-gray-600">
                Are you sure you want to delete this transaction? This action cannot be undone.
              </p>
            </div>
            
            <div className="flex justify-center space-x-3">
              <Button
                type="button"
                variant="outline"
                className="px-5"
                onClick={cancelDelete}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-error hover:bg-error/90 px-5"
                onClick={confirmDelete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Transaction'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage; 