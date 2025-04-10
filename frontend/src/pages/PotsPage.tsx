import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, 
  Plus,
  Menu, 
  LogOut,
  Target,
  Calendar,
  CreditCard,
  Edit3,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
  Check,
  AlertCircle,
  FileText,
  Wallet,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axiosConfig';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';

// Types
interface Pot {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  createdAt: string;
  updatedAt: string;
}

interface PotFormData {
  name: string;
  target_amount: string;
  current_amount: string;
}

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

const PotsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [pots, setPots] = useState<Pot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPot, setSelectedPot] = useState<Pot | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [potToDelete, setPotToDelete] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [depositError, setDepositError] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = {
    mobile: 5,    // Show more cards on mobile for the list view
    tablet: 4,    // Show 4 cards on tablet as requested
    desktop: 3    // Keep desktop view the same
  };
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  
  // Form refs
  const modalRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const depositModalRef = useRef<HTMLDivElement>(null);
  const withdrawModalRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [formData, setFormData] = useState<PotFormData>({
    name: '',
    target_amount: '',
    current_amount: '0',
  });

  // Form errors
  const [formErrors, setFormErrors] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    general: '',
  });

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

  // Fetch pots
  const fetchPots = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/pots');
      setPots(response.data.pots || []);
    } catch (err) {
      console.error('Error fetching pots:', err);
      setError('Failed to load your savings goals. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load pots on component mount
  useEffect(() => {
    fetchPots();
  }, []);

  // Handle input change for main form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear specific error when user starts typing in a field
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors({
        ...formErrors,
        [name]: '',
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors = {
      name: '',
      target_amount: '',
      current_amount: '',
      general: '',
    };

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
      isValid = false;
    }

    // Target amount validation
    if (!formData.target_amount.trim()) {
      newErrors.target_amount = 'Target amount is required';
      isValid = false;
    } else {
      const targetAmount = parseFloat(formData.target_amount);
      if (isNaN(targetAmount) || targetAmount <= 0) {
        newErrors.target_amount = 'Please enter a valid positive amount';
        isValid = false;
      }
    }

    // Current amount validation
    if (formData.current_amount.trim()) {
      const currentAmount = parseFloat(formData.current_amount);
      const targetAmount = parseFloat(formData.target_amount);
      if (isNaN(currentAmount) || currentAmount < 0) {
        newErrors.current_amount = 'Please enter a valid amount (0 or positive)';
        isValid = false;
      } else if (targetAmount > 0 && currentAmount > targetAmount) {
        newErrors.current_amount = 'Current amount cannot exceed target amount';
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
    
    setError(null);
    
    try {
      const potData = {
        name: formData.name,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount || '0'),
      };
      
      if (isEditing && selectedPot) {
        await api.put(`/pots/${selectedPot.id}`, potData);
        setSuccessMessage('Savings goal updated successfully!');
      } else {
        await api.post('/pots', potData);
        setSuccessMessage('New savings goal created successfully!');
      }
      
      // Refresh pots
      fetchPots();
      
      // Close form
      setShowForm(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Error saving pot:', err);
      setFormErrors({
        ...formErrors,
        general: 'Failed to save the savings goal. Please try again.',
      });
    }
  };

  // Handle deposit
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

  // Handle withdraw
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

  // Handle edit
  const handleEdit = (pot: Pot) => {
    setSelectedPot(pot);
    setFormData({
      name: pot.name,
      target_amount: pot.targetAmount.toString(),
      current_amount: pot.currentAmount.toString(),
    });
    setIsEditing(true);
    setShowForm(true);
  };

  // Handle delete
  const handleDeleteClick = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPotToDelete(id);
    setShowDeleteConfirmation(true);
  };

  // Handle delete pot
  const handleDeletePot = async () => {
    if (!potToDelete) return;
    
    try {
      await api.delete(`/pots/${potToDelete}`);
      
      // Refresh pots
      fetchPots();
      
      // Show success message
      setSuccessMessage('Savings goal deleted successfully!');
      
      // Close modal
      setShowDeleteConfirmation(false);
      
      // Clear delete target
      setPotToDelete(null);
      
      // Clear message after delay
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Error deleting pot:', err);
      setError('Failed to delete the savings goal. Please try again.');
      
      // Close modal
      setShowDeleteConfirmation(false);
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

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      target_amount: '',
      current_amount: '0',
    });
    setFormErrors({
      name: '',
      target_amount: '',
      current_amount: '',
      general: '',
    });
    setIsEditing(false);
    setSelectedPot(null);
  };

  // Toggle form
  const toggleForm = () => {
    setShowForm(!showForm);
    
    if (!showForm) {
      // Reset form when opening
      setFormData({
        name: '',
        target_amount: '',
        current_amount: '0',
      });
      setFormErrors({
        name: '',
        target_amount: '',
        current_amount: '',
        general: '',
      });
      setIsEditing(false);
      setSelectedPot(null);
    }
  };

  // Calculate percentage
  const calculatePercentage = (current: number, target: number): number => {
    if (target <= 0) return 0;
    const percentage = (current / target) * 100;
    return Math.round(Math.min(percentage, 100)); // Cap at 100% and round to nearest integer
  };

  // Get progress bar color
  const getProgressBarColor = (percentage: number): string => {
    if (percentage < 25) return 'bg-red-500';
    if (percentage < 50) return 'bg-yellow-500';
    if (percentage < 75) return 'bg-blue-500';
    return 'bg-green-500';
  };

  // Get progress color based on percentage
  const getColorClass = (percentage: number) => {
    if (percentage >= 90) return {
      bg: 'bg-gradient-to-r from-success/80 to-success',
      text: 'text-success',
      light: 'bg-success/10',
      border: 'border-success/20'
    };
    if (percentage >= 50) return {
      bg: 'bg-gradient-to-r from-blue-500/80 to-blue-500',
      text: 'text-blue-600',
      light: 'bg-blue-100/50',
      border: 'border-blue-200/50'
    };
    return {
      bg: 'bg-gradient-to-r from-primary/80 to-primary',
      text: 'text-primary',
      light: 'bg-primary/10',
      border: 'border-primary/20'
    };
  };

  // Close modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showForm && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowForm(false);
        resetForm();
      }
      
      if (showDeleteConfirmation && deleteModalRef.current && !deleteModalRef.current.contains(event.target as Node)) {
        setShowDeleteConfirmation(false);
        setPotToDelete(null);
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
        if (showForm) {
          setShowForm(false);
          resetForm();
        }
        
        if (showDeleteConfirmation) {
          setShowDeleteConfirmation(false);
          setPotToDelete(null);
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
  }, [showForm, showDeleteConfirmation, showDepositForm, showWithdrawForm]);

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

  // Reset current page when pots change
  useEffect(() => {
    setCurrentPage(1);
  }, [pots.length]);

  // Handle pagination page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // Scroll to top of cards section with a small offset for the header
    if (cardsContainerRef.current) {
      const headerOffset = 90; // Approximate header height plus some padding
      const elementPosition = cardsContainerRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
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
                    item.id === 'savings'
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
        {/* Header with toggle sidebar button */}
        <header className="bg-white sticky top-0 z-20 border-b border-gray-100 shadow-sm">
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
                <Target size={20} className="text-primary mr-2" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent">Savings Goals</h1>
              </div>
            </div>

            <div className="flex items-center">
              <div className="mr-4">
                <span className="text-sm text-gray-500 mr-2">Currency:</span>
                <span className="font-medium text-gray-700">{selectedCurrency.symbol} {selectedCurrency.code}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center text-primary font-medium shadow-sm ring-2 ring-white">
                {user?.name?.charAt(0)}
              </div>
              <span className="ml-2 text-gray-700 font-medium hidden md:block">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {/* Introduction section */}
          <div className="mb-8 bg-gradient-to-r from-primary/5 to-transparent p-4 sm:p-6 lg:p-8 rounded-2xl border border-primary/10 relative overflow-hidden z-10">
            {/* Decorative elements - Responsive sizing and positioning */}
            <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 bg-gradient-to-br from-primary/5 to-transparent rounded-full -mt-20 -mr-20 opacity-40"></div>
            <div className="absolute bottom-0 left-1/4 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-tr from-primary/10 to-transparent rounded-full -mb-10 opacity-40"></div>
            <div className="absolute top-1/2 left-1/3 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-primary/5 to-primary/20 rounded-full transform -translate-y-1/2 opacity-40 blur-xl"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 lg:gap-8">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent mb-2 sm:mb-3">
                  Savings Goals
                </h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl">
                  Create and track progress towards your financial goals. Set targets, deposit funds regularly, and watch your savings grow over time.
                </p>
                
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4 sm:mt-5">
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary mr-1.5"></div>
                    <span>Early Stage</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500 mr-1.5"></div>
                    <span>Halfway</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-success mr-1.5"></div>
                    <span>Nearly Complete</span>
                </div>
                </div>
              </div>
              
              <div className="w-full sm:w-auto">
              <Button 
                onClick={toggleForm} 
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-[#2a5a4e] hover:shadow-lg hover:shadow-primary/10 transition-all transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base py-2.5 px-4 sm:py-3 sm:px-6"
              >
                  <Plus size={18} className="flex-shrink-0" /> 
                  <span className="whitespace-nowrap">New Savings Goal</span>
              </Button>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="animate-fadeIn flex flex-col items-center justify-center min-h-[60vh] bg-white/50 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm p-10">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-2"></div>
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <Target size={24} className="text-primary" />
                </div>
              </div>
              <p className="mt-4 text-gray-500 font-medium">Loading your savings goals...</p>
              <div className="mt-3 bg-gray-100 rounded-full h-1.5 w-48 overflow-hidden">
                <div className="bg-primary/40 h-full animate-pulse"></div>
              </div>
            </div>
          )}

          {error && (
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
          )}

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

          {!isLoading && !error && pots.length === 0 && (
            <div className="animate-fadeIn flex flex-col items-center justify-center min-h-[60vh] text-center bg-white/70 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm p-10">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 shadow-inner">
                <Target className="text-primary" size={42} />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent mb-3">Create your first savings goal</h2>
              <p className="text-gray-600 max-w-md mb-8">
                Start planning for your future by setting up targeted savings goals. Track your progress and reach your financial milestones.
              </p>
              <Button 
                onClick={toggleForm}
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-[#2a5a4e] shadow-lg hover:shadow-xl hover:shadow-primary/10 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
              >
                <Plus size={20} className="mr-1" /> Create Your First Goal
              </Button>
            </div>
          )}

          {!isLoading && !error && pots.length > 0 && (
            <>
              {/* Statistics section */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
                {/* Total Saved Card */}
                <div className="bg-white/90 backdrop-blur-sm border border-gray-100 p-2.5 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-4">
                    <div className="p-1.5 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl bg-primary/10 flex-shrink-0">
                      <Wallet className="text-primary w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 font-medium mb-0.5">Total Saved</p>
                      <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-800 truncate">
                        {formatCurrency(pots.reduce((sum, pot) => sum + pot.currentAmount, 0))}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
                    <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 flex items-center">
                      <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 mr-1 text-success" />
                      Across {pots.length} {pots.length === 1 ? 'goal' : 'goals'}
                    </p>
                  </div>
                </div>
                
                {/* Target Amount Card */}
                <div className="bg-white/90 backdrop-blur-sm border border-gray-100 p-2.5 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-4">
                    <div className="p-1.5 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl bg-blue-500/10 flex-shrink-0">
                      <Target className="text-blue-500 w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 font-medium mb-0.5">Target Amount</p>
                      <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-800 truncate">
                        {formatCurrency(pots.reduce((sum, pot) => sum + pot.targetAmount, 0))}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
                    {(() => {
                      const totalSaved = pots.reduce((sum, pot) => sum + pot.currentAmount, 0);
                      const totalTarget = pots.reduce((sum, pot) => sum + pot.targetAmount, 0);
                      const remainingPercentage = Math.floor((totalSaved / totalTarget) * 100);
                      
                      return (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5 rounded-full ${
                              remainingPercentage >= 75 ? 'bg-success' : 
                              remainingPercentage >= 50 ? 'bg-blue-500' : 
                              'bg-primary'
                            }`}></span>
                            <span className="text-[10px] sm:text-xs lg:text-sm text-gray-500">Progress</span>
                          </div>
                          <span className={`text-[10px] sm:text-xs lg:text-sm font-medium px-1.5 sm:px-2 py-0.5 rounded-full ${
                            remainingPercentage >= 75 ? 'bg-success/10 text-success' : 
                            remainingPercentage >= 50 ? 'bg-blue-500/10 text-blue-500' : 
                            'bg-primary/10 text-primary'
                          }`}>
                            {remainingPercentage}%
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Remaining to Save Card */}
                <div className="bg-white/90 backdrop-blur-sm border border-gray-100 p-2.5 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all duration-300 col-span-2 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-4">
                    <div className="p-1.5 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl bg-success/10 flex-shrink-0">
                      <ArrowUpRight className="text-success w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 font-medium mb-0.5">Remaining to Save</p>
                      <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-800 truncate">
                        {formatCurrency(
                          pots.reduce((sum, pot) => sum + Math.max(pot.targetAmount - pot.currentAmount, 0), 0)
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-success"></span>
                        <span className="text-[10px] sm:text-xs lg:text-sm text-gray-500">Completed Goals</span>
                      </div>
                      <span className="text-[10px] sm:text-xs lg:text-sm font-medium bg-success/10 text-success px-1.5 sm:px-2 py-0.5 rounded-full">
                        {pots.filter(pot => pot.currentAmount >= pot.targetAmount).length} of {pots.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            
              {/* Savings Goals Section Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target size={16} className="text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">Your Savings Goals</h2>
                </div>
              </div>
            
              {/* Mobile View - List Layout */}
              <div className="block sm:hidden space-y-2">
                {pots
                  .slice((currentPage - 1) * cardsPerPage.mobile, currentPage * cardsPerPage.mobile)
                  .map(pot => {
                const percentage = calculatePercentage(pot.currentAmount, pot.targetAmount);
                  const colorClasses = getColorClass(percentage);
                  
                  return (
                    <div 
                      key={pot.id}
                      className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-lg overflow-hidden hover:border-primary/20 transition-all duration-300"
                    >
                      {/* Main Info Section */}
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-full ${colorClasses.light} flex items-center justify-center flex-shrink-0`}>
                              <Target className={`${colorClasses.text} w-5 h-5`} />
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-gray-800 truncate">{pot.name}</h3>
                              <p className="text-xs text-gray-500 mt-0.5">Created: {formatDate(pot.createdAt)}</p>
                            </div>
                            <div className={`ml-3 text-xs font-medium px-2 py-0.5 rounded-full ${colorClasses.light} ${colorClasses.text} flex-shrink-0`}>
                              {percentage}%
                            </div>
                          </div>
                        </div>

                        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${colorClasses.bg}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatCurrency(pot.currentAmount)} of {formatCurrency(pot.targetAmount)}</span>
                          <span className={`font-medium ${colorClasses.text}`}>
                            {percentage === 100 ? 'Completed!' : percentage > 75 ? 'Almost there!' : percentage > 50 ? 'Halfway' : 'In progress'}
                          </span>
                        </div>
                      </div>

                      {/* Actions Section */}
                      <div className="border-t border-gray-100 px-3 py-2 bg-gray-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(pot)}
                            className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full transition-all"
                            title="Edit Goal"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(pot.id, e)}
                            className="p-1.5 text-gray-500 hover:text-error hover:bg-error/10 rounded-full transition-all"
                            title="Delete Goal"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openWithdrawForm(pot)}
                            className={`p-1.5 rounded-full transition-all flex items-center ${
                              pot.currentAmount <= 0 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                            disabled={pot.currentAmount <= 0}
                            title="Withdraw"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            onClick={() => openDepositForm(pot)}
                            className="p-1.5 text-gray-500 hover:text-success hover:bg-success/10 rounded-full transition-all"
                            title="Deposit"
                          >
                            <ArrowUp size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tablet/Desktop View - Card Layout */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {pots
                  .slice(
                    (currentPage - 1) * (window.innerWidth >= 1024 ? cardsPerPage.desktop : cardsPerPage.tablet),
                    currentPage * (window.innerWidth >= 1024 ? cardsPerPage.desktop : cardsPerPage.tablet)
                  )
                  .map(pot => {
                    const percentage = calculatePercentage(pot.currentAmount, pot.targetAmount);
                  const colorClasses = getColorClass(percentage);
                
                return (
                    <Card 
                      key={pot.id} 
                      className="overflow-hidden backdrop-blur-md bg-white/95 border border-gray-100/70 hover:shadow-xl transition-all duration-300 group relative"
                    >
                      {/* Background decorative elements */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/70"></div>
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-primary/5 to-transparent rounded-full opacity-40"></div>
                      <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-gradient-to-tr from-primary/5 to-transparent rounded-full opacity-30"></div>
                      
                      <div className="p-6 relative">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="max-w-[70%]">
                            <h3 className="font-semibold text-lg text-gray-800 group-hover:text-primary transition-colors flex items-center">
                              <div className="p-2 rounded-lg bg-primary/10 mr-3 shadow-sm">
                                <Target size={18} className="text-primary" />
                          </div>
                              <span className="truncate">{pot.name}</span>
                        </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              Created: {formatDate(pot.createdAt)}
                            </p>
                          </div>
                          
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEdit(pot)}
                              className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full transition-all"
                              aria-label="Edit goal"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(pot.id, e)}
                              className="p-2 text-gray-500 hover:text-error hover:bg-error/10 rounded-full transition-all"
                              aria-label="Delete goal"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                        {/* Progress section */}
                        <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Progress</span>
                            <div className={`text-xs px-3 py-1 rounded-full font-medium ${colorClasses.light} ${colorClasses.text} shadow-sm`}>
                          {percentage}%
                        </div>
                      </div>
                      
                          <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden shadow-inner">
                            <div 
                              className={`h-full rounded-full transition-all duration-700 ${colorClasses.bg}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>

                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Current</p>
                              <p className="text-base font-semibold text-gray-900">{formatCurrency(pot.currentAmount)}</p>
                        </div>
                            <div className="h-8 border-l border-gray-200 mx-4"></div>
                            <div>
                              <p className="text-xs text-gray-500 text-right mb-1">Target</p>
                              <p className="text-base font-semibold text-primary">{formatCurrency(pot.targetAmount)}</p>
                            </div>
                          </div>
                      </div>
                      
                        {/* Information and status */}
                        <div className="mb-4 grid grid-cols-2 gap-2">
                          <div className={`p-2 rounded-lg ${colorClasses.light} ${colorClasses.border} border`}>
                            <p className="text-xs text-gray-500 mb-1">Remaining</p>
                            <p className="text-sm font-medium text-gray-800">
                              {formatCurrency(Math.max(pot.targetAmount - pot.currentAmount, 0))}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">Status</p>
                            <p className={`text-sm font-medium ${colorClasses.text}`}>
                              {percentage === 100 ? 'Completed!' : percentage > 75 ? 'Almost there!' : percentage > 50 ? 'Halfway there' : 'In progress'}
                            </p>
                          </div>
                      </div>
                      
                        {/* Actions */}
                        <div className="flex gap-2 mt-5">
                        <button 
                          onClick={() => openDepositForm(pot)}
                            className="flex-1 bg-gradient-to-r from-success/90 to-success text-white px-4 py-2.5 rounded-lg font-medium transition-all border border-transparent hover:border-success/20 shadow-sm hover:shadow transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center"
                        >
                            <ArrowUp size={16} className="mr-1.5" />
                          Deposit
                        </button>
                        <button 
                          onClick={() => openWithdrawForm(pot)}
                            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all border shadow-sm hover:shadow transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center ${
                              pot.currentAmount <= 0 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200 hover:border-gray-300'
                            }`}
                          disabled={pot.currentAmount <= 0}
                        >
                            <ArrowDown size={16} className="mr-1.5" />
                          Withdraw
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
              </div>
              
              {/* Pagination Controls - Consistent across all views */}
              {pots.length > (window.innerWidth >= 1024 ? cardsPerPage.desktop : 
                              window.innerWidth >= 640 ? cardsPerPage.tablet : 
                              cardsPerPage.mobile) && (
                <div className="mt-6 sm:mt-8 flex justify-center items-center">
                  <nav className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                      className={`p-2 rounded-md flex items-center justify-center transition-colors ${
                      currentPage === 1 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-gray-500 hover:text-primary hover:bg-primary/5'
                      }`}
                    aria-label="Previous page"
                  >
                      <ChevronLeft size={16} />
                  </button>
                  
                    {Array.from({ length: Math.ceil(pots.length / (
                      window.innerWidth >= 1024 ? cardsPerPage.desktop : 
                      window.innerWidth >= 640 ? cardsPerPage.tablet : 
                      cardsPerPage.mobile
                    )) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handlePageChange(i + 1)}
                        className={`min-w-[32px] h-8 flex items-center justify-center text-sm transition-colors rounded-md ${
                        currentPage === i + 1
                          ? 'bg-primary text-white font-medium'
                            : 'text-gray-600 hover:bg-primary/5 hover:text-primary'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  
                  <button
                      onClick={() => handlePageChange(Math.min(currentPage + 1, Math.ceil(pots.length / (
                        window.innerWidth >= 1024 ? cardsPerPage.desktop : 
                        window.innerWidth >= 640 ? cardsPerPage.tablet : 
                        cardsPerPage.mobile
                      ))))}
                      disabled={currentPage === Math.ceil(pots.length / (
                        window.innerWidth >= 1024 ? cardsPerPage.desktop : 
                        window.innerWidth >= 640 ? cardsPerPage.tablet : 
                        cardsPerPage.mobile
                      ))}
                      className={`p-2 rounded-md flex items-center justify-center transition-colors ${
                        currentPage === Math.ceil(pots.length / (
                          window.innerWidth >= 1024 ? cardsPerPage.desktop : 
                          window.innerWidth >= 640 ? cardsPerPage.tablet : 
                          cardsPerPage.mobile
                        ))
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:text-primary hover:bg-primary/5'
                      }`}
                    aria-label="Next page"
                  >
                      <ChevronRight size={16} />
                  </button>
                  </nav>
            </div>
              )}
            </>
          )}

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
                    item.id === 'savings'
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

          {/* Form Modal - Redesigned */}
          {showForm && (
            <div className={MODAL_STYLES.backdrop}>
              <div 
                ref={modalRef}
                className={MODAL_STYLES.container}
              >
                <div className={MODAL_STYLES.header}>
                  <div className="flex items-center">
                    <div className={MODAL_STYLES.iconContainer}>
                      <Target size={18} className={MODAL_STYLES.icon} />
                    </div>
                    <h2 className={MODAL_STYLES.title}>
                    {isEditing ? 'Edit Savings Goal' : 'Create New Savings Goal'}
                  </h2>
                  </div>
                  <button 
                    onClick={toggleForm}
                    className={MODAL_STYLES.closeButton}
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className={MODAL_STYLES.form}>
                  {formErrors.general && (
                    <div className="mb-4 p-3 bg-error/10 rounded-lg border border-error/30 text-error flex items-center">
                      <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                      <p>{formErrors.general}</p>
                    </div>
                  )}
                  
                  <div className={MODAL_STYLES.fieldGroup}>
                    <label className={MODAL_STYLES.label} htmlFor="name">
                      <span className={MODAL_STYLES.labelDot}></span>
                      Goal Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Emergency Fund, Vacation, New Car"
                      className={`${MODAL_STYLES.input} ${formErrors.name ? 'border-error focus:ring-error/50' : ''}`}
                    />
                    {formErrors.name && (
                      <p className={MODAL_STYLES.error}>
                        <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                        {formErrors.name}
                      </p>
                    )}
                  </div>
                  
                  <div className={MODAL_STYLES.fieldGroup}>
                    <label className={MODAL_STYLES.label} htmlFor="target_amount">
                      <span className={MODAL_STYLES.labelDot}></span>
                      Target Amount
                    </label>
                    <div className="relative">
                      <span className={MODAL_STYLES.currencySymbol}>
                        {selectedCurrency.symbol}
                      </span>
                      <input
                        id="target_amount"
                        name="target_amount"
                        value={formData.target_amount}
                        onChange={handleInputChange}
                        placeholder="Enter target amount"
                        className={`${MODAL_STYLES.input} ${MODAL_STYLES.currencyInput} ${formErrors.target_amount ? 'border-error focus:ring-error/50' : ''}`}
                        type="number"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    {formErrors.target_amount && (
                      <p className={MODAL_STYLES.error}>
                        <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                        {formErrors.target_amount}
                      </p>
                    )}
                  </div>
                  
                  <div className={MODAL_STYLES.fieldGroup}>
                    <label className={MODAL_STYLES.label} htmlFor="current_amount">
                      <span className={MODAL_STYLES.labelDot}></span>
                      Current Amount {!isEditing && '(Optional)'}
                    </label>
                    <div className="relative">
                      <span className={MODAL_STYLES.currencySymbol}>
                        {selectedCurrency.symbol}
                      </span>
                      <input
                        id="current_amount"
                        name="current_amount"
                        value={formData.current_amount}
                        onChange={handleInputChange}
                        placeholder="0"
                        className={`${MODAL_STYLES.input} ${MODAL_STYLES.currencyInput} ${formErrors.current_amount ? 'border-error focus:ring-error/50' : ''}`}
                        type="number"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    {formErrors.current_amount && (
                      <p className={MODAL_STYLES.error}>
                        <AlertCircle size={14} className={MODAL_STYLES.errorIcon} />
                        {formErrors.current_amount}
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
                      variant="primary"
                      isLoading={isLoading}
                      className={MODAL_STYLES.buttonSubmit}
                    >
                      {isEditing ? 'Update Goal' : 'Create Goal'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal - Redesigned */}
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
                  Delete Savings Goal
                </h2>
                <p className={MODAL_STYLES.deleteMessage}>
                  Are you sure you want to delete this savings goal? This action cannot be undone.
                </p>
                
                <div className={MODAL_STYLES.deleteButtonsContainer}>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteConfirmation(false)}
                    className={MODAL_STYLES.deleteButtonCancel}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="danger" 
                    onClick={handleDeletePot}
                    isLoading={isLoading}
                    className={MODAL_STYLES.deleteButtonDelete}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Deposit Modal - Enhanced design */}
          {showDepositForm && selectedPot && (
            <div className={MODAL_STYLES.backdrop}>
              <div 
                ref={depositModalRef}
                className={MODAL_STYLES.container}
              >
                <div className={MODAL_STYLES.header}>
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center mr-3">
                      <ArrowUp size={18} className="text-success" />
                    </div>
                    <h2 className={MODAL_STYLES.title}>
                    Deposit Funds
                  </h2>
                  </div>
                  <button 
                    onClick={() => setShowDepositForm(false)}
                    className={MODAL_STYLES.closeButton}
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                  <p className="text-gray-600 mb-2 text-sm">Adding funds to:</p>
                  <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-primary/10 mr-3">
                        <Target size={16} className="text-primary" />
                    </div>
                    <span className="font-medium text-gray-800">{selectedPot.name}</span>
                    </div>
                    <span className="text-sm bg-primary/5 px-2 py-0.5 rounded-full text-primary font-medium">
                      {calculatePercentage(selectedPot.currentAmount, selectedPot.targetAmount)}% complete
                    </span>
                  </div>
                </div>
                
                <form onSubmit={handleDepositSubmit}>
                  {depositError && (
                    <div className="p-4 bg-error/10 border border-error/20 text-error rounded-lg mb-5 flex items-start">
                      <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                      <span>{depositError}</span>
                    </div>
                  )}
                  
                  <div className={MODAL_STYLES.fieldGroup}>
                    <label className={MODAL_STYLES.label} htmlFor="deposit_amount">
                      <span className={MODAL_STYLES.labelDot}></span>
                      Amount to Deposit
                    </label>
                    <div className="relative">
                      <span className={MODAL_STYLES.currencySymbol}>
                        {selectedCurrency.symbol}
                      </span>
                      <input
                        id="deposit_amount"
                        name="deposit_amount"
                        value={depositAmount}
                        onChange={(e) => {
                          setDepositAmount(e.target.value);
                          setDepositError('');
                        }}
                        placeholder={`Enter amount to deposit`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        className={`${MODAL_STYLES.input} ${MODAL_STYLES.currencyInput} ${depositError ? 'border-error focus:ring-error/50' : 'focus:ring-success/50'}`}
                      />
                    </div>
                    </div>
                    
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg mb-6 mt-4">
                      <div>
                      <p className="text-xs text-gray-500 mb-1">Current Amount</p>
                      <p className="text-sm font-medium text-gray-800">{formatCurrency(selectedPot.currentAmount)}</p>
                      </div>
                      <div>
                      <p className="text-xs text-gray-500 mb-1">Target Amount</p>
                      <p className="text-sm font-medium text-gray-800">{formatCurrency(selectedPot.targetAmount)}</p>
                      </div>
                    
                    {depositAmount && !isNaN(parseFloat(depositAmount)) && parseFloat(depositAmount) > 0 && (
                      <>
                        <div className="col-span-2 h-px bg-gray-200 my-2"></div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">New Balance</p>
                          <p className="text-sm font-semibold text-success">
                            {formatCurrency(selectedPot.currentAmount + parseFloat(depositAmount))}
                          </p>
                    </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Remaining Goal</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {formatCurrency(Math.max(selectedPot.targetAmount - (selectedPot.currentAmount + parseFloat(depositAmount)), 0))}
                          </p>
                        </div>
                      </>
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
                      variant="primary"
                      isLoading={isLoading}
                      className="bg-gradient-to-r from-success to-success/80 text-white hover:opacity-90"
                    >
                      <div className="flex items-center">
                        <ArrowUp size={16} className="mr-1.5" />
                        Deposit Funds
                      </div>
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Withdraw Modal - Enhanced design */}
          {showWithdrawForm && selectedPot && (
            <div className={MODAL_STYLES.backdrop}>
              <div 
                ref={withdrawModalRef}
                className={MODAL_STYLES.container}
              >
                <div className={MODAL_STYLES.header}>
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                      <ArrowDown size={18} className="text-gray-600" />
                    </div>
                    <h2 className={MODAL_STYLES.title}>
                    Withdraw Funds
                  </h2>
                  </div>
                  <button 
                    onClick={() => setShowWithdrawForm(false)}
                    className={MODAL_STYLES.closeButton}
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                  <p className="text-gray-600 mb-2 text-sm">Withdrawing funds from:</p>
                  <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-primary/10 mr-3">
                        <Target size={16} className="text-primary" />
                    </div>
                    <span className="font-medium text-gray-800">{selectedPot.name}</span>
                    </div>
                    <span className="text-sm bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 font-medium">
                      Available: {formatCurrency(selectedPot.currentAmount)}
                    </span>
                  </div>
                </div>
                
                <form onSubmit={handleWithdrawSubmit}>
                  {withdrawError && (
                    <div className="p-4 bg-error/10 border border-error/20 text-error rounded-lg mb-5 flex items-start">
                      <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                      <span>{withdrawError}</span>
                    </div>
                  )}
                  
                  <div className={MODAL_STYLES.fieldGroup}>
                    <label className={MODAL_STYLES.label} htmlFor="withdraw_amount">
                      <span className={MODAL_STYLES.labelDot}></span>
                      Amount to Withdraw
                    </label>
                    <div className="relative">
                      <span className={MODAL_STYLES.currencySymbol}>
                        {selectedCurrency.symbol}
                      </span>
                      <input
                        id="withdraw_amount"
                        name="withdraw_amount"
                        value={withdrawAmount}
                        onChange={(e) => {
                          setWithdrawAmount(e.target.value);
                          setWithdrawError('');
                        }}
                        placeholder={`Enter amount to withdraw`}
                        type="number"
                        min="0.01"
                        max={selectedPot.currentAmount}
                        step="0.01"
                        className={`${MODAL_STYLES.input} ${MODAL_STYLES.currencyInput} ${withdrawError ? 'border-error focus:ring-error/50' : ''}`}
                      />
                    </div>
                    </div>
                    
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg mb-6 mt-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Current Amount</p>
                      <p className="text-sm font-medium text-gray-800">{formatCurrency(selectedPot.currentAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Target Amount</p>
                      <p className="text-sm font-medium text-gray-800">{formatCurrency(selectedPot.targetAmount)}</p>
                  </div>
                  
                    {withdrawAmount && !isNaN(parseFloat(withdrawAmount)) && parseFloat(withdrawAmount) > 0 && (
                      <>
                        <div className="col-span-2 h-px bg-gray-200 my-2"></div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">New Balance</p>
                          <p className="text-sm font-semibold text-gray-700">
                            {formatCurrency(Math.max(selectedPot.currentAmount - parseFloat(withdrawAmount), 0))}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Progress After Withdrawal</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {calculatePercentage(
                              Math.max(selectedPot.currentAmount - parseFloat(withdrawAmount), 0), 
                              selectedPot.targetAmount
                            )}%
                          </p>
                        </div>
                      </>
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
                      variant="primary"
                      isLoading={isLoading}
                      className="bg-gradient-to-r from-gray-700 to-gray-600 text-white hover:opacity-90"
                    >
                      <div className="flex items-center">
                        <ArrowDown size={16} className="mr-1.5" />
                        Withdraw Funds
                      </div>
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PotsPage; 