import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  Search,
  AlertCircle,
  FileText,
  Wallet,
  Filter,
  Edit2,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  BarChart2,
  PieChart as PieChartIcon,
  CalendarClock,
  ArrowUpCircle,
  TrendingUp
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import api from '@/utils/axiosConfig';

// Interface for recurring bill data
interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  category: string;
  createdAt: string;
  updatedAt: string;
}

interface Currency {
  code: string;
  symbol: string;
  name: string;
}

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  secondaryValue?: string;
  change?: number;
}

interface CategorySummary {
  category: string;
  amount: number;
  count: number;
  color: string;
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

// Define the categories as a constant at the top level
const BILL_CATEGORIES = [
  'Utilities',
  'Subscriptions',
  'Groceries',
  'Health & Fitness',
  'Education',
  'Personal Care',
  'Entertainment'
];

const RecurringBillsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentBill, setCurrentBill] = useState<RecurringBill | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [showStats, setShowStats] = useState(true);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<'all' | 'month' | 'week'>('month');
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [sortOption, setSortOption] = useState<string>('dueDate-asc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);
  const [listCurrentPage, setListCurrentPage] = useState(1);
  const [gridCurrentPage, setGridCurrentPage] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  // Constants for pagination
  const LIST_ITEMS_PER_PAGE = {
    mobile: 5,
    tablet: 6,
    desktop: 5
  };

  const GRID_ITEMS_PER_PAGE = {
    mobile: 5,
    tablet: 6,
    desktop: 8
  };

  // Available currencies
  const currencies: Currency[] = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  ];
  
  // Load currency from localStorage or default to GBP
  const getSavedCurrency = (): Currency => {
    // Use user ID to make the currency selection user-specific
    const userSpecificKey = user?.id ? `selectedCurrency_${user.id}` : null;
    const savedCurrencyCode = userSpecificKey ? localStorage.getItem(userSpecificKey) : null;
    
    if (savedCurrencyCode) {
      const foundCurrency = currencies.find(c => c.code === savedCurrencyCode);
      if (foundCurrency) return foundCurrency;
    }
    return { code: 'GBP', symbol: '£', name: 'British Pound' };
  };
  
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(getSavedCurrency());

  // Remove the frequency property from form state
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    dueDate: '',
    status: 'pending',
    category: BILL_CATEGORIES[0]
  });

  // Color palette for categories - Replace with direct CSS colors
  const categoryColors: Record<string, { bg: string; text: string; fill: string }> = {
    'Entertainment': { bg: 'bg-purple-500', text: 'text-purple-500', fill: '#a855f7' },
    'Utilities': { bg: 'bg-cyan-500', text: 'text-cyan-500', fill: '#06b6d4' },
    'Subscriptions': { bg: 'bg-pink-500', text: 'text-pink-500', fill: '#ec4899' },
    'Groceries': { bg: 'bg-emerald-500', text: 'text-emerald-500', fill: '#10b981' },
    'Health & Fitness': { bg: 'bg-blue-500', text: 'text-blue-500', fill: '#3b82f6' },
    'Education': { bg: 'bg-amber-500', text: 'text-amber-500', fill: '#f59e0b' },
    'Personal Care': { bg: 'bg-indigo-500', text: 'text-indigo-500', fill: '#6366f1' },
    'Other': { bg: 'bg-gray-500', text: 'text-gray-500', fill: '#71717a' }
  };

  // Get color for a category
  const getCategoryColor = (category: string): string => {
    return categoryColors[category]?.bg || 'bg-gray-500';
  };

  // Get text color for a category
  const getCategoryTextColor = (category: string): string => {
    return categoryColors[category]?.text || 'text-gray-500';
  };

  // Get fill color for a category
  const getCategoryFillColor = (category: string): string => {
    return categoryColors[category]?.fill || '#71717a';
  };

  // Fetch recurring bills data
  useEffect(() => {
    const fetchRecurringBills = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/recurring-bills', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setRecurringBills(response.data.recurringBills);
        setError(null);
      } catch (err) {
        console.error('Error fetching recurring bills:', err);
        setError('Failed to load recurring bills. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecurringBills();
  }, []);

  // Calculate category summary when bills change
  useEffect(() => {
    if (recurringBills.length > 0) {
      const summary: Record<string, { amount: number; count: number }> = {};
      
      recurringBills.forEach(bill => {
        if (!summary[bill.category]) {
          summary[bill.category] = { amount: 0, count: 0 };
        }
        summary[bill.category].amount += bill.amount;
        summary[bill.category].count += 1;
      });
      
      const categorySummaryArray = Object.entries(summary).map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        color: getCategoryColor(category)
      }));
      
      setCategorySummary(categorySummaryArray);
    }
  }, [recurringBills]);

  // Toggle sidebar on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: selectedCurrency.code
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', { 
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  // Calculate days until due
  const calculateDaysUntilDue = (dueDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateObj = new Date(dueDate);
    dueDateObj.setHours(0, 0, 0, 0);
    
    const diffTime = dueDateObj.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Add function to get the due date message
  const getDueDateMessage = (bill: RecurringBill): string => {
    if (bill.status === 'paid') {
      return 'Paid';
    }
    
    const daysUntilDue = calculateDaysUntilDue(bill.dueDate);
    if (daysUntilDue > 0) {
      return `Due in ${daysUntilDue} days`;
    } else if (daysUntilDue === 0) {
      return 'Due today';
    } else {
      return `Overdue by ${Math.abs(daysUntilDue)} days`;
    }
  };

  // Add useEffect to automatically mark pending bills as overdue
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

  // Filter bills based on search, status, category, and timeframe
  const getFilteredBills = () => {
    return recurringBills.filter(bill => {
      const matchesSearch = bill.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            bill.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || bill.status === selectedStatus;
      const matchesCategory = selectedCategory === 'all' || bill.category === selectedCategory;
      
      // Time frame filtering
      let matchesTimeFrame = true;
      if (selectedTimeFrame !== 'all') {
        const dueDate = new Date(bill.dueDate);
        const now = new Date();
        
        if (selectedTimeFrame === 'month') {
          const nextMonth = new Date(now);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          matchesTimeFrame = dueDate >= now && dueDate <= nextMonth;
        } else if (selectedTimeFrame === 'week') {
          const nextWeek = new Date(now);
          nextWeek.setDate(nextWeek.getDate() + 7);
          matchesTimeFrame = dueDate >= now && dueDate <= nextWeek;
        }
      }
      
      return matchesSearch && matchesStatus && matchesCategory && matchesTimeFrame;
    });
  };

  const filteredBills = getFilteredBills();

  // Get upcoming bills (next 7 days)
  const getUpcomingBills = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    return recurringBills.filter(bill => {
      const dueDate = new Date(bill.dueDate);
      return bill.status === 'pending' && dueDate >= today && dueDate <= nextWeek;
    });
  };

  // Get overdue bills
  const getOverdueBills = () => {
    return recurringBills.filter(bill => bill.status === 'overdue');
  };

  // Get paid bills
  const getPaidBills = () => {
    return recurringBills.filter(bill => bill.status === 'paid');
  };

  // Calculate statistics for dashboard
  const getTotalMonthlyCost = (): number => {
    return recurringBills.reduce((sum, bill) => sum + bill.amount, 0);
  };

  const getUpcomingTotal = (): number => {
    return getUpcomingBills().reduce((sum, bill) => sum + bill.amount, 0);
  };

  const getOverdueTotal = (): number => {
    return getOverdueBills().reduce((sum, bill) => sum + bill.amount, 0);
  };

  // Get all unique categories from bills
  const uniqueCategories = ['all', ...new Set(recurringBills.map(bill => bill.category))];

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Add function to sort bills
  const getSortedBills = () => {
    const filtered = getFilteredBills();
    
    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'dueDate-asc': // Latest (earliest in the month)
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'dueDate-desc': // Oldest
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        case 'name-asc': // A to Z
          return a.name.localeCompare(b.name);
        case 'name-desc': // Z to A
          return b.name.localeCompare(a.name);
        case 'amount-desc': // Highest bill amount
          return b.amount - a.amount;
        case 'amount-asc': // Lowest bill amount
          return a.amount - b.amount;
        default:
          return 0;
      }
    });
  };

  // Now add the pagination-related functions and components
  const getPaginatedListBills = () => {
    const sortedBills = getSortedBills();
    const startIndex = (listCurrentPage - 1) * (
      window.innerWidth >= 1024 ? LIST_ITEMS_PER_PAGE.desktop :
      window.innerWidth >= 640 ? LIST_ITEMS_PER_PAGE.tablet :
      LIST_ITEMS_PER_PAGE.mobile
    );
    const itemsPerPage = window.innerWidth >= 1024 ? LIST_ITEMS_PER_PAGE.desktop :
      window.innerWidth >= 640 ? LIST_ITEMS_PER_PAGE.tablet :
      LIST_ITEMS_PER_PAGE.mobile;
    return sortedBills.slice(startIndex, startIndex + itemsPerPage);
  };

  const getPaginatedGridBills = () => {
    const sortedBills = getSortedBills();
    const startIndex = (gridCurrentPage - 1) * (
      window.innerWidth >= 1024 ? GRID_ITEMS_PER_PAGE.desktop :
      window.innerWidth >= 640 ? GRID_ITEMS_PER_PAGE.tablet :
      GRID_ITEMS_PER_PAGE.mobile
    );
    const itemsPerPage = window.innerWidth >= 1024 ? GRID_ITEMS_PER_PAGE.desktop :
      window.innerWidth >= 640 ? GRID_ITEMS_PER_PAGE.tablet :
      GRID_ITEMS_PER_PAGE.mobile;
    return sortedBills.slice(startIndex, startIndex + itemsPerPage);
  };

  // Calculate total pages for list and grid views
  const totalListPages = Math.ceil(getSortedBills().length / (
    window.innerWidth >= 1024 ? LIST_ITEMS_PER_PAGE.desktop :
    window.innerWidth >= 640 ? LIST_ITEMS_PER_PAGE.tablet :
    LIST_ITEMS_PER_PAGE.mobile
  ));

  const totalGridPages = Math.ceil(getSortedBills().length / (
    window.innerWidth >= 1024 ? GRID_ITEMS_PER_PAGE.desktop :
    window.innerWidth >= 640 ? GRID_ITEMS_PER_PAGE.tablet :
    GRID_ITEMS_PER_PAGE.mobile
  ));

  // Pagination component
  const Pagination = ({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) => {
    return (
      <div className="flex items-center justify-center mt-6 space-x-2">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
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
        
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => onPageChange(i + 1)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              currentPage === i + 1
                ? 'bg-primary text-white font-medium'
                : 'bg-white text-gray-700 hover:bg-primary/10 hover:text-primary'
            } border border-gray-200`}
          >
            {i + 1}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
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
    );
  };

  // Add validation for overdue status with future dates
  const validateBillStatus = (data: typeof formData): boolean => {
    if (data.status === 'overdue') {
      const dueDate = new Date(data.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate > today) {
        setFormError("A bill cannot be marked as overdue if the due date is in the future.");
        return false;
      }
    }
    
    setFormError(null);
    return true;
  };

  // Update the handleAddBill function to remove frequency
  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate bill status
    if (!validateBillStatus(formData)) {
      return;
    }
    
    try {
      const billData = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        dueDate: formData.dueDate,
        status: formData.status as 'paid' | 'pending' | 'overdue',
        category: formData.category
      };
      
      const response = await api.post('/recurring-bills', billData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setRecurringBills(prev => [...prev, response.data]);
      setShowAddModal(false);
      setFormData({
        name: '',
        amount: '',
        dueDate: '',
        status: 'pending',
        category: BILL_CATEGORIES[0]
      });
      setFormError(null);
    } catch (err) {
      console.error('Error adding recurring bill:', err);
      setError('Failed to add recurring bill. Please try again.');
    }
  };

  // Update the handleEditBill function to remove frequency
  const handleEditBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBill) return;

    // Validate bill status
    if (!validateBillStatus(formData)) {
      return;
    }

    try {
      const billData = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        dueDate: formData.dueDate,
        status: formData.status as 'paid' | 'pending' | 'overdue',
        category: formData.category
      };
      
      const response = await api.put(`/recurring-bills/${currentBill.id}`, billData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setRecurringBills(prev => prev.map(bill => 
        bill.id === currentBill.id ? response.data : bill
      ));
      setShowEditModal(false);
      setCurrentBill(null);
      setFormError(null);
    } catch (err) {
      console.error('Error updating recurring bill:', err);
      setError('Failed to update recurring bill. Please try again.');
    }
  };

  // Update the Delete function to use modal instead of confirm
  const handleDeleteButtonClick = (id: string) => {
    setBillToDelete(id);
    setShowDeleteModal(true);
  };

  // Actual delete function
  const handleDeleteBill = async () => {
    if (!billToDelete) return;

    try {
      await api.delete(`/recurring-bills/${billToDelete}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setRecurringBills(prev => prev.filter(bill => bill.id !== billToDelete));
      setShowDeleteModal(false);
      setBillToDelete(null);
    } catch (err) {
      console.error('Error deleting recurring bill:', err);
      setError('Failed to delete recurring bill. Please try again.');
      setShowDeleteModal(false);
      setBillToDelete(null);
    }
  };

  // Mark bill as paid
  const handleMarkAsPaid = async (bill: RecurringBill) => {
    try {
      const response = await api.put(`/recurring-bills/${bill.id}`, {
        ...bill,
        status: 'paid'
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setRecurringBills(prev => prev.map(b => 
        b.id === bill.id ? response.data : b
      ));
    } catch (err) {
      console.error('Error updating bill status:', err);
      setError('Failed to update bill status. Please try again.');
    }
  };

  // Update openEditModal to remove frequency
  const openEditModal = (bill: RecurringBill) => {
    setCurrentBill(bill);
    setFormData({
      name: bill.name,
      amount: bill.amount.toString(),
      dueDate: new Date(bill.dueDate).toISOString().split('T')[0],
      status: bill.status,
      category: bill.category
    });
    setShowEditModal(true);
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'pending':
        return <Clock size={16} className="text-blue-600" />;
      case 'overdue':
        return <AlertTriangle size={16} className="text-red-600" />;
      default:
        return null;
    }
  };

  // Generate stat cards
  const getStatCards = (): StatCard[] => {
    return [
      {
        title: 'Total Monthly',
        value: formatCurrency(getTotalMonthlyCost()),
        icon: <DollarSign size={20} className="text-white" />,
        color: 'from-blue-500 to-blue-600',
        secondaryValue: `${recurringBills.length} bills`
      },
      {
        title: 'Due This Week',
        value: formatCurrency(getUpcomingTotal()),
        icon: <Clock size={20} className="text-white" />,
        color: 'from-amber-500 to-amber-600',
        secondaryValue: `${getUpcomingBills().length} bills`
      },
      {
        title: 'Overdue',
        value: formatCurrency(getOverdueTotal()),
        icon: <AlertTriangle size={20} className="text-white" />,
        color: 'from-red-500 to-red-600',
        secondaryValue: `${getOverdueBills().length} bills`
      },
      {
        title: 'Paid This Month',
        value: formatCurrency(getPaidBills().reduce((sum, bill) => sum + bill.amount, 0)),
        icon: <CheckCircle size={20} className="text-white" />,
        color: 'from-green-500 to-green-600',
        secondaryValue: `${getPaidBills().length} bills`
      }
    ];
  };

  // Generate a donut chart with SVG for category distribution
  const generateCategoryChart = () => {
    if (categorySummary.length === 0) return null;
    
    const total = categorySummary.reduce((sum, cat) => sum + cat.amount, 0);
    let currentAngle = 0;
    
    return (
      <div className="relative h-52 w-52 mx-auto">
        <svg viewBox="0 0 100 100" className="h-full w-full transform -rotate-90">
          {/* Background circle for empty chart */}
          <circle cx="50" cy="50" r="35" fill="#f5f5f5" />
          
          {categorySummary.map((category, i) => {
            const percentage = (category.amount / total) * 100;
            const angle = (percentage / 100) * 360;
            
            // Calculate SVG arc path
            const x1 = 50 + 35 * Math.cos((currentAngle * Math.PI) / 180);
            const y1 = 50 + 35 * Math.sin((currentAngle * Math.PI) / 180);
            const x2 = 50 + 35 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
            const y2 = 50 + 35 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M 50 50`,
              `L ${x1} ${y1}`,
              `A 35 35 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              `Z`
            ].join(' ');
            
            const segment = (
              <path
                key={i}
                d={pathData}
                fill={getCategoryFillColor(category.category)}
                stroke="#ffffff"
                strokeWidth="0.5"
                className="hover:opacity-90 transition-opacity cursor-pointer"
              />
            );
            
            currentAngle += angle;
            return segment;
          })}
          
          {/* Inner circle to create donut */}
          <circle cx="50" cy="50" r="25" fill="white" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-lg font-bold text-gray-800">{formatCurrency(total)}</span>
          <span className="text-xs text-gray-500">Total</span>
        </div>
      </div>
    );
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
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
                    item.id === 'bills'
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
                <Calendar size={20} className="text-primary mr-2" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent">Recurring Bills</h1>
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

        {/* Page Content */}
        <main className="p-6">
          {/* Introduction section */}
          <div className="mb-6 sm:mb-8 bg-gradient-to-r from-primary/5 to-transparent p-4 sm:p-6 lg:p-8 rounded-2xl border border-primary/10 relative overflow-hidden z-10">
            {/* Decorative elements - Responsive sizing and positioning */}
            <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 bg-gradient-to-br from-primary/5 to-transparent rounded-full -mt-20 -mr-20 opacity-40"></div>
            <div className="absolute bottom-0 left-1/4 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-tr from-primary/10 to-transparent rounded-full -mb-10 opacity-40"></div>
            <div className="absolute top-1/2 left-1/3 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-primary/5 to-primary/20 rounded-full transform -translate-y-1/2 opacity-40 blur-xl"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 lg:gap-8">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-[#2a5a4e] bg-clip-text text-transparent mb-2 sm:mb-3">
                  Recurring Bills
                </h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl">
                  Keep track of your regular expenses, subscriptions, and bills. Set due dates, manage payment status, and stay on top of your financial commitments.
                </p>
                
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4 sm:mt-5">
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 mr-1.5"></div>
                    <span>Paid</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500 mr-1.5"></div>
                    <span>Pending</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 mr-1.5"></div>
                    <span>Overdue</span>
                  </div>
                </div>
              </div>
              
              <div className="w-full sm:w-auto">
              <Button 
                onClick={() => setShowAddModal(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-[#2a5a4e] hover:shadow-lg hover:shadow-primary/10 transition-all transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base py-2.5 px-4 sm:py-3 sm:px-6"
              >
                  <Plus size={18} className="flex-shrink-0" /> 
                  <span className="whitespace-nowrap">Add New Bill</span>
              </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {showStats && (
            <>
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-800 flex items-center">
                  <BarChart2 size={16} className="text-primary mr-2 hidden sm:block" />
                  <TrendingUp size={16} className="text-primary mr-2 sm:hidden" />
                  Stats Overview
                </h3>
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg transition-all flex items-center bg-primary/10 text-primary"
                >
                  <BarChart2 size={14} className="mr-1 sm:mr-1.5" />
                  Hide
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-10">
                {getStatCards().map((card, index) => (
                  <div 
                    key={index} 
                    className="bg-white rounded-xl overflow-hidden shadow-sm sm:shadow-md border border-gray-100/80 hover:shadow-lg transition-all duration-300 hover:translate-y-[-2px]"
                  >
                    <div className="p-3 sm:p-6">
                      <div className="flex justify-between items-start mb-2 sm:mb-3">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wider line-clamp-1">{card.title}</p>
                        <div className={`w-8 sm:w-11 h-8 sm:h-11 rounded-lg flex items-center justify-center bg-gradient-to-br ${card.color} transform rotate-3 shadow-sm sm:shadow-md`}>
                          {card.icon}
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-4">
                        <h3 className="text-lg sm:text-2xl font-bold text-gray-800 tracking-tight">{card.value}</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center mt-1 sm:mt-2">
                          <p className="text-xs sm:text-sm text-gray-500 font-medium">{card.secondaryValue}</p>
                          {card.change !== undefined && (
                            <div className={`mt-1 sm:mt-0 sm:ml-3 flex items-center text-xs ${card.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {card.change >= 0 ? (
                                <ArrowUpCircle size={12} className="mr-1" />
                              ) : (
                                <ArrowUpCircle size={12} className="mr-1 transform rotate-180" />
                              )}
                              <span className="hidden sm:inline">{Math.abs(card.change)}% from last month</span>
                              <span className="sm:hidden">{Math.abs(card.change)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`h-0.5 sm:h-1 bg-gradient-to-r ${card.color}`}></div>
                  </div>
                ))}
              </div>
            </>
          )}
          {!showStats && (
            <div className="flex justify-end mb-4 sm:mb-6">
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg transition-all flex items-center bg-gray-100 text-gray-600 hover:bg-gray-200/70"
              >
                <BarChart2 size={14} className="mr-1 sm:mr-1.5" />
                Show Stats
              </button>
            </div>
          )}

          {/* Charts & Analysis Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* Category Distribution */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100/80 lg:col-span-1 transform transition-all hover:shadow-lg" data-category-chart>
              <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 flex items-center">
                    <PieChartIcon size={18} className="text-primary mr-2" />
                    Category Breakdown
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Monthly</span>
                </div>
              </div>
              <div className="p-6">
                {categorySummary.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <PieChartIcon size={28} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500">No data available yet</p>
                    <p className="text-xs text-gray-400 mt-1">Add bills to see category breakdown</p>
                  </div>
                ) : (
                  <div className="mb-4">
                    {generateCategoryChart()}
                    
                    <div className="mt-8">
                      <div className="grid grid-cols-1 gap-2">
                        {categorySummary.map((cat, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100/60">
                            <div className="flex items-center">
                              <div style={{ backgroundColor: getCategoryFillColor(cat.category) }} className="w-3.5 h-3.5 rounded-full mr-3"></div>
                              <span className="text-gray-700 font-medium">{cat.category}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="font-semibold text-gray-800">{formatCurrency(cat.amount)}</span>
                              <span className="text-xs text-gray-500">{cat.count} {cat.count === 1 ? 'bill' : 'bills'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Bills */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100/80 lg:col-span-2 transform transition-all hover:shadow-lg">
              <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 flex items-center">
                    <CalendarClock size={18} className="text-primary mr-2" /> 
                    Upcoming Bills
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Next 7 Days</span>
                </div>
              </div>
              <div className="p-0">
                {getUpcomingBills().length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CalendarClock size={28} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500">No upcoming bills due this week</p>
                    <p className="text-xs text-gray-400 mt-1">Your upcoming bills will appear here</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100/80">
                    {getUpcomingBills().slice(0, 5).map(bill => (
                      <li key={bill.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${getCategoryColor(bill.category)}/15 border border-${getCategoryColor(bill.category).replace('bg-', '')}/30`}>
                              <Calendar className={`text-${getCategoryColor(bill.category).replace('bg-', '')}`} size={20} />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-800">{bill.name}</h4>
                              <div className="flex items-center mt-1">
                                <Clock size={14} className="text-gray-400 mr-1.5" />
                                <p className="text-xs text-gray-500">{formatDate(bill.dueDate)}</p>
                                <span className="mx-2 text-gray-300">•</span>
                                <p className="text-xs font-medium text-blue-500">{getDueDateMessage(bill)}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="font-semibold text-gray-800">{formatCurrency(bill.amount)}</span>
                            <Button 
                              onClick={() => handleMarkAsPaid(bill)}
                              className="py-1.5 px-3 text-xs bg-green-500 hover:bg-green-600 text-white rounded-md shadow-sm hover:shadow-md transition-all"
                            >
                              <CheckCircle size={14} className="mr-1.5" />
                              Mark as Paid
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {getUpcomingBills().length > 5 && (
                  <div className="p-4 text-center border-t border-gray-100 bg-gray-50/50">
                    <button 
                      className="text-primary hover:text-primary/80 text-sm font-medium flex items-center justify-center mx-auto"
                      onClick={() => setSelectedStatus('pending')}
                    >
                      View all upcoming bills
                      <ChevronRight size={16} className="ml-1.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar & Filters */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100/80 p-4 sm:p-5 lg:p-6 mb-6 sm:mb-8">
            {/* Header and View Modes */}
            <div className="flex flex-col space-y-4 sm:space-y-5 lg:space-y-0 lg:flex-row lg:justify-between lg:items-center mb-5 sm:mb-6">
              <div className="flex flex-col space-y-4 sm:space-y-5 lg:space-y-0 lg:flex-row lg:items-center lg:gap-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center">
                  <Filter size={18} className="text-primary mr-2" />
                  View & Filter
                </h3>
                
                {/* View modes */}
                <div className="flex bg-gray-100/80 rounded-lg p-1 shadow-inner w-full sm:w-auto">
                  <button
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'}`}
                    onClick={() => setViewMode('list')}
                  >
                    <div className="flex items-center">
                      <FileText size={14} className="mr-1.5 sm:mr-2" />
                      List
                    </div>
                  </button>
                  <button
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'}`}
                    onClick={() => setViewMode('grid')}
                  >
                    <div className="flex items-center">
                      <BarChart2 size={14} className="mr-1.5 sm:mr-2" />
                      Grid
                    </div>
                  </button>
                  <button
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md flex items-center justify-center transition-all ${viewMode === 'calendar' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'}`}
                    onClick={() => setViewMode('calendar')}
                  >
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-1.5 sm:mr-2" />
                      Calendar
                    </div>
                  </button>
                </div>

                {/* Timeframe filter */}
                <div className="flex bg-gray-100/80 rounded-lg p-1 shadow-inner w-full sm:w-auto">
                  <button
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md transition-all ${selectedTimeFrame === 'all' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'}`}
                    onClick={() => setSelectedTimeFrame('all')}
                  >
                    All Time
                  </button>
                  <button
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md transition-all ${selectedTimeFrame === 'month' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'}`}
                    onClick={() => setSelectedTimeFrame('month')}
                  >
                    This Month
                  </button>
                  <button
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md transition-all ${selectedTimeFrame === 'week' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'}`}
                    onClick={() => setSelectedTimeFrame('week')}
                  >
                    This Week
                  </button>
                </div>
              </div>
            </div>
            
            {/* Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Sort options */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">Sort By</label>
                <div className="relative">
                  <select
                    className="block w-full pl-4 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                  >
                    <option value="dueDate-asc">Due Date (Earliest)</option>
                    <option value="dueDate-desc">Due Date (Latest)</option>
                    <option value="name-asc">Name (A to Z)</option>
                    <option value="name-desc">Name (Z to A)</option>
                    <option value="amount-desc">Amount (Highest)</option>
                    <option value="amount-asc">Amount (Lowest)</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Search */}
              <div className="relative sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">Search</label>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search bills by name or category..."
                    className="pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">Status</label>
                <div className="relative">
                  <select
                    className="block w-full pl-4 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="overdue">Overdue</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Category Filter */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">Category</label>
                <div className="relative">
                  <select
                    className="block w-full pl-4 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    {BILL_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            
            {/* Active Filters */}
            {(searchTerm || selectedStatus !== 'all' || selectedCategory !== 'all' || selectedTimeFrame !== 'month') && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-5 sm:mt-6 pt-5 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-0">
                  <span className="text-xs sm:text-sm text-gray-500">Active filters:</span>
                  
                  {searchTerm && (
                    <div className="bg-gray-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium text-gray-700 flex items-center">
                      Search: {searchTerm}
                      <button onClick={() => setSearchTerm('')} className="ml-1.5 sm:ml-2 text-gray-500 hover:text-gray-700">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  
                  {selectedStatus !== 'all' && (
                    <div className="bg-gray-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium text-gray-700 flex items-center">
                      Status: {selectedStatus}
                      <button onClick={() => setSelectedStatus('all')} className="ml-1.5 sm:ml-2 text-gray-500 hover:text-gray-700">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  
                  {selectedCategory !== 'all' && (
                    <div className="bg-gray-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium text-gray-700 flex items-center">
                      Category: {selectedCategory}
                      <button onClick={() => setSelectedCategory('all')} className="ml-1.5 sm:ml-2 text-gray-500 hover:text-gray-700">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  
                  {selectedTimeFrame !== 'month' && (
                    <div className="bg-gray-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium text-gray-700 flex items-center">
                      Time: {selectedTimeFrame === 'week' ? 'This Week' : 'All Time'}
                      <button onClick={() => setSelectedTimeFrame('month')} className="ml-1.5 sm:ml-2 text-gray-500 hover:text-gray-700">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedStatus('all');
                    setSelectedCategory('all');
                    setSelectedTimeFrame('month');
                  }}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  <Filter size={14} className="mr-1.5 sm:mr-2" />
                  Reset All
                </button>
              </div>
            )}
          </div>

          {/* Bills Display based on viewMode */}
          {isLoading ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-md">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
              <p className="mt-6 text-gray-600 font-medium">Loading your recurring bills...</p>
              <p className="mt-1 text-gray-400 text-sm">This may take a moment</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center shadow-sm">
              <AlertCircle size={22} className="mr-4 text-red-500" />
              <div>
                <p className="font-medium">Error loading bills</p>
                <p className="text-sm text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-md border border-gray-100/80">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Calendar className="text-primary/40" size={36} />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No recurring bills found</h3>
              {(searchTerm || selectedStatus !== 'all' || selectedCategory !== 'all' || selectedTimeFrame !== 'month') ? (
                <p className="text-gray-500 mb-4">Try adjusting your filters to see more results.</p>
              ) : (
                <>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">Start tracking your recurring bills by adding your first bill to stay on top of your finances.</p>
                  <Button 
                    onClick={() => setShowAddModal(true)}
                    className="bg-gradient-to-r from-primary to-[#2a5a4e] hover:from-primary/90 hover:to-[#2a5a4e]/90 px-6 py-2.5 shadow-md"
                  >
                    <Plus size={18} className="mr-2" />
                    Add Your First Bill
                  </Button>
                </>
              )}
            </div>
          ) : (
            <>
              {viewMode === 'list' && (
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100/80">
                  {/* Mobile List View (< 640px) */}
                  <div className="sm:hidden">
                    {getPaginatedListBills().map(bill => (
                      <div key={bill.id} className="border-b border-gray-100 last:border-b-0">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-gray-900 truncate mr-2">{bill.name}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(bill.status)} flex items-center gap-1 border ${
                              bill.status === 'paid' 
                                ? 'border-green-200' 
                                : bill.status === 'pending' 
                                  ? 'border-blue-200' 
                                  : 'border-red-200'
                            }`}>
                              {getStatusIcon(bill.status)}
                              <span className="capitalize">{bill.status}</span>
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-lg font-bold text-gray-800">{formatCurrency(bill.amount)}</div>
                            <div className="flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                              <div className={`w-2 h-2 rounded-full ${getCategoryColor(bill.category)} mr-1`}></div>
                              <span>{bill.category}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <div className={`flex items-center ${
                              bill.status === 'paid' ? 'text-green-600' : 
                              bill.status === 'pending' ? 'text-blue-600' : 
                              'text-red-600'
                            }`}>
                              <Calendar size={14} className="mr-1.5" />
                              <span>{formatDate(bill.dueDate)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {bill.status !== 'paid' && (
                                <button 
                                  onClick={() => handleMarkAsPaid(bill)}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                  title="Mark as Paid"
                                >
                                  <CheckCircle size={16} />
                                </button>
                              )}
                              <button 
                                onClick={() => openEditModal(bill)}
                                className="p-1.5 text-primary hover:bg-primary/5 rounded-md transition-colors"
                                title="Edit Bill"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteButtonClick(bill.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete Bill"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tablet List View (640px - 1024px) */}
                  <div className="hidden sm:block lg:hidden">
                    <div className="grid grid-cols-2 gap-4 p-4">
                      {getPaginatedListBills().map(bill => (
                        <div key={bill.id} className="bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all">
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-medium text-gray-900 truncate mr-2">{bill.name}</h3>
                              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(bill.status)} flex items-center gap-1.5 border ${
                                bill.status === 'paid' 
                                  ? 'border-green-200' 
                                  : bill.status === 'pending' 
                                    ? 'border-blue-200' 
                                    : 'border-red-200'
                              }`}>
                                {getStatusIcon(bill.status)}
                                <span className="capitalize">{bill.status}</span>
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-xl font-bold text-gray-800">{formatCurrency(bill.amount)}</div>
                              <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg">
                                <div className={`w-2.5 h-2.5 rounded-full ${getCategoryColor(bill.category)} mr-1.5`}></div>
                                <span>{bill.category}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm mb-4">
                              <div className={`flex items-center ${
                                bill.status === 'paid' ? 'text-green-600' : 
                                bill.status === 'pending' ? 'text-blue-600' : 
                                'text-red-600'
                              }`}>
                                <Calendar size={15} className="mr-1.5" />
                                <span>{formatDate(bill.dueDate)}</span>
                              </div>
                              <div className="text-gray-500">{getDueDateMessage(bill)}</div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              {bill.status !== 'paid' ? (
                                <button 
                                  onClick={() => handleMarkAsPaid(bill)}
                                  className="flex items-center px-3 py-1.5 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors"
                                >
                                  <CheckCircle size={14} className="mr-1.5" />
                                  Mark as Paid
                                </button>
                              ) : (
                                <div className="flex items-center text-xs text-green-600">
                                  <CheckCircle size={14} className="mr-1.5" />
                                  Paid
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => openEditModal(bill)}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Edit Bill"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteButtonClick(bill.id)}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Delete Bill"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop List View (> 1024px) - Keeping existing table layout */}
                  <div className="hidden lg:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Due Date
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {getPaginatedListBills().map(bill => (
                          <tr key={bill.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{bill.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-semibold text-gray-900">{formatCurrency(bill.amount)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-gray-700 font-medium">{formatDate(bill.dueDate)}</div>
                              <div className={`text-xs mt-0.5 flex items-center ${
                                bill.status === 'paid' 
                                  ? 'text-green-600' 
                                  : bill.status === 'pending' 
                                    ? 'text-blue-600' 
                                    : 'text-red-600'
                              }`}>
                                {bill.status === 'paid' ? (
                                  <CheckCircle size={12} className="mr-1" />
                                ) : bill.status === 'pending' ? (
                                  <Clock size={12} className="mr-1" />
                                ) : (
                                  <AlertTriangle size={12} className="mr-1" />
                                )}
                                <span>{getDueDateMessage(bill)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1.5 inline-flex text-xs leading-4 font-medium rounded-full ${getCategoryColor(bill.category)}/20 text-${getCategoryColor(bill.category).replace('bg-', '')}`}>
                                {bill.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1.5 inline-flex text-xs leading-4 font-medium rounded-full ${getStatusBadge(bill.status)} border ${
                                bill.status === 'paid' 
                                  ? 'border-green-200' 
                                  : bill.status === 'pending' 
                                    ? 'border-blue-200' 
                                    : 'border-red-200'
                              }`}>
                                {getStatusIcon(bill.status)}
                                <span className="ml-1 capitalize">{bill.status}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {bill.status !== 'paid' && (
                                  <button 
                                    onClick={() => handleMarkAsPaid(bill)} 
                                    className="text-green-600 hover:text-green-900 p-1.5 rounded-full hover:bg-green-50 transition-colors"
                                    title="Mark as Paid"
                                  >
                                    <CheckCircle size={18} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => openEditModal(bill)} 
                                  className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-full hover:bg-indigo-50 transition-colors"
                                  title="Edit Bill"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteButtonClick(bill.id)} 
                                  className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                                  title="Delete Bill"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </div>

                  {/* Pagination - Responsive for all views */}
                  <div className="py-2 border-t border-gray-100 bg-gray-50/50">
                    <Pagination 
                      currentPage={listCurrentPage} 
                      totalPages={totalListPages} 
                      onPageChange={(page) => setListCurrentPage(page)} 
                    />
                  </div>
                </div>
              )}

              {viewMode === 'grid' && (
                <>
                  {/* Mobile Grid View (< 640px) */}
                  <div className="sm:hidden space-y-3">
                    {getPaginatedGridBills().map(bill => (
                      <div key={bill.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100/80">
                        <div className={`h-1 ${getCategoryColor(bill.category)}`}></div>
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-medium text-gray-900 truncate mr-2">{bill.name}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(bill.status)} flex items-center gap-1 border ${
                              bill.status === 'paid' 
                                ? 'border-green-200' 
                                : bill.status === 'pending' 
                                  ? 'border-blue-200' 
                                  : 'border-red-200'
                            }`}>
                              {getStatusIcon(bill.status)}
                              <span className="capitalize">{bill.status}</span>
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-lg font-bold text-gray-800">{formatCurrency(bill.amount)}</div>
                            <div className="flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                              <div className={`w-2 h-2 rounded-full ${getCategoryColor(bill.category)} mr-1`}></div>
                              <span>{bill.category}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center">
                              <Calendar size={14} className="mr-1.5" />
                              {formatDate(bill.dueDate)}
                            </div>
                            <div className={`flex items-center ${
                              bill.status === 'paid' ? 'text-green-600' : 
                              bill.status === 'pending' ? 'text-blue-600' : 
                              'text-red-600'
                            }`}>
                              {getDueDateMessage(bill)}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                            {bill.status !== 'paid' ? (
                              <button 
                                onClick={() => handleMarkAsPaid(bill)}
                                className="flex items-center px-2.5 py-1 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors"
                              >
                                <CheckCircle size={14} className="mr-1" />
                                Mark as Paid
                              </button>
                            ) : (
                              <div className="flex items-center text-xs text-green-600">
                                <CheckCircle size={14} className="mr-1" />
                                Paid
                              </div>
                            )}
                            <div className="flex gap-1">
                              <button 
                                onClick={() => openEditModal(bill)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button 
                                onClick={() => handleDeleteButtonClick(bill.id)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tablet Grid View (640px - 1024px) */}
                  <div className="hidden sm:grid lg:hidden grid-cols-2 gap-4">
                    {getPaginatedGridBills().map(bill => (
                      <div key={bill.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100/80 hover:shadow-md transition-all">
                        <div className={`h-1.5 ${getCategoryColor(bill.category)}`}></div>
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="font-medium text-gray-900 truncate mr-2">{bill.name}</h3>
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(bill.status)} flex items-center gap-1.5 border ${
                              bill.status === 'paid' 
                                ? 'border-green-200' 
                                : bill.status === 'pending' 
                                  ? 'border-blue-200' 
                                  : 'border-red-200'
                            }`}>
                              {getStatusIcon(bill.status)}
                              <span className="capitalize">{bill.status}</span>
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-xl font-bold text-gray-800">{formatCurrency(bill.amount)}</div>
                            <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                              <div className={`w-2.5 h-2.5 rounded-full ${getCategoryColor(bill.category)} mr-2`}></div>
                              <span>{bill.category}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm mb-4">
                            <div className="flex items-center text-gray-600">
                              <Calendar size={15} className="mr-1.5" />
                              {formatDate(bill.dueDate)}
                            </div>
                            <div className={`${
                              bill.status === 'paid' ? 'text-green-600' : 
                              bill.status === 'pending' ? 'text-blue-600' : 
                              'text-red-600'
                            }`}>
                              {getDueDateMessage(bill)}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                            {bill.status !== 'paid' ? (
                              <button 
                                onClick={() => handleMarkAsPaid(bill)}
                                className="flex items-center px-3 py-1.5 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors"
                              >
                                <CheckCircle size={15} className="mr-1.5" />
                                Mark as Paid
                              </button>
                            ) : (
                              <div className="flex items-center text-sm text-green-600">
                                <CheckCircle size={15} className="mr-1.5" />
                                Paid
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button 
                                onClick={() => openEditModal(bill)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteButtonClick(bill.id)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Grid View (> 1024px) - Keeping existing layout */}
                  <div className="hidden lg:grid grid-cols-3 xl:grid-cols-4 gap-5">
                    {getPaginatedGridBills().map(bill => (
                      <div key={bill.id} className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-100/80 hover:shadow-lg transition-all duration-300 hover:translate-y-[-2px]">
                        <div className={`h-2 ${getCategoryColor(bill.category)}`}></div>
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="font-medium text-gray-900 truncate mr-2">{bill.name}</h3>
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(bill.status)} flex items-center gap-1.5 border ${
                              bill.status === 'paid' 
                                ? 'border-green-200' 
                                : bill.status === 'pending' 
                                  ? 'border-blue-200' 
                                  : 'border-red-200'
                            }`}>
                              {getStatusIcon(bill.status)}
                              <span className="capitalize">{bill.status}</span>
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between mb-5">
                            <div className="text-xl font-bold text-gray-800">{formatCurrency(bill.amount)}</div>
                            <div className="flex items-center text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                              <div className={`w-2.5 h-2.5 rounded-full ${getCategoryColor(bill.category)} mr-1.5`}></div>
                              <span>{bill.category}</span>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-100 pt-4 pb-2">
                            <div className="flex items-center justify-between text-sm mb-3">
                              <div className="text-gray-500 flex items-center">
                                <Calendar size={14} className="mr-1.5 text-gray-400" />
                                Due Date:
                              </div>
                              <div className="font-medium text-gray-800">{formatDate(bill.dueDate)}</div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="text-gray-500 flex items-center">
                                <Clock size={14} className="mr-1.5 text-gray-400" />
                                Status:
                              </div>
                              <div className={`font-medium flex items-center ${
                                bill.status === 'paid' ? 'text-green-600' : 
                                bill.status === 'pending' ? 'text-blue-600' : 
                                'text-red-600'
                              }`}>
                                {bill.status === 'paid' ? (
                                  <CheckCircle size={14} className="mr-1.5" />
                                ) : bill.status === 'pending' ? (
                                  <Clock size={14} className="mr-1.5" />
                                ) : (
                                  <AlertTriangle size={14} className="mr-1.5" />
                                )}
                                {getDueDateMessage(bill)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100">
                            {bill.status !== 'paid' ? (
                              <button 
                                onClick={() => handleMarkAsPaid(bill)}
                                className="py-1.5 px-3 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-all flex items-center shadow-sm"
                              >
                                <CheckCircle size={14} className="mr-1.5" />
                                Mark as Paid
                              </button>
                            ) : (
                              <div className="text-xs text-green-600 flex items-center py-1.5 px-3">
                                <CheckCircle size={14} className="mr-1.5" />
                                Paid
                              </div>
                            )}
                            <div className="flex space-x-1">
                              <button 
                                onClick={() => openEditModal(bill)} 
                                className="p-2 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-all"
                                title="Edit Bill"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button 
                                onClick={() => handleDeleteButtonClick(bill.id)} 
                                className="p-2 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-all"
                                title="Delete Bill"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination - Responsive for all views */}
                  <div className="mt-6 sm:mt-8 bg-white rounded-xl shadow-md border border-gray-100/80 py-4">
                    <Pagination 
                      currentPage={gridCurrentPage} 
                      totalPages={totalGridPages} 
                      onPageChange={(page) => setGridCurrentPage(page)} 
                    />
                  </div>
                </>
              )}

              {viewMode === 'calendar' && (
                <div className="bg-white rounded-xl shadow-md p-6 overflow-hidden border border-gray-100/80">
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                      <Calendar size={18} className="text-primary mr-2" />
                      Calendar View
                    </h3>
                    <p className="text-gray-500">Bills are shown by due date in this month</p>
                  </div>
                  <div className="grid grid-cols-7 gap-2 mb-3">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 35 }, (_, i) => {
                      const date = new Date();
                      date.setDate(1); // Start with the 1st of this month
                      const firstDayOfMonth = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
                      
                      // Adjust to show previous month days
                      date.setDate(i - firstDayOfMonth + 1);
                      
                      const isCurrentMonth = date.getMonth() === new Date().getMonth();
                      const isToday = date.toDateString() === new Date().toDateString();
                      
                      // Filter bills due on this date
                      const billsDueToday = getSortedBills().filter(bill => {
                        const billDate = new Date(bill.dueDate);
                        return billDate.toDateString() === date.toDateString();
                      });
                      
                      return (
                        <div
                          key={i}
                          className={`p-1.5 min-h-[100px] rounded-lg shadow-sm ${
                            isCurrentMonth ? 'bg-white border border-gray-100' : 'bg-gray-50/50 border border-gray-100/60'
                          } ${isToday ? 'ring-2 ring-primary/20' : ''}`}
                        >
                          <div className={`text-right text-sm p-1 font-medium ${
                            isCurrentMonth 
                              ? isToday ? 'text-primary' : 'text-gray-700' 
                              : 'text-gray-400'
                          }`}>
                            {date.getDate()}
                          </div>
                          
                          <div className="mt-1">
                            {billsDueToday.length > 0 ? (
                              <div className="space-y-1.5">
                                {billsDueToday.map(bill => (
                                  <div 
                                    key={bill.id}
                                    className={`px-2 py-1.5 text-xs truncate rounded-md shadow-sm hover:shadow-md transition-all cursor-pointer ${
                                      bill.status === 'paid' 
                                        ? 'bg-green-50 text-green-800 border border-green-100' 
                                        : bill.status === 'pending' 
                                          ? 'bg-blue-50 text-blue-800 border border-blue-100' 
                                          : 'bg-red-50 text-red-800 border border-red-100'
                                    }`}
                                    title={`${bill.name} - ${formatCurrency(bill.amount)}`}
                                    onClick={() => openEditModal(bill)}
                                  >
                                    <div className="flex items-center">
                                      <div className={`w-2 h-2 rounded-full ${getCategoryColor(bill.category)} mr-1.5`}></div>
                                      <span className="truncate">{bill.name}</span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between">
                                      <span className="font-medium">{formatCurrency(bill.amount)}</span>
                                      {bill.status === 'paid' ? (
                                        <CheckCircle size={12} />
                                      ) : bill.status === 'pending' ? (
                                        <Clock size={12} />
                                      ) : (
                                        <AlertTriangle size={12} />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              isCurrentMonth && <div className="h-2"></div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Add Bill Modal - Redesigned */}
      {showAddModal && (
        <div className={MODAL_STYLES.backdrop}>
          <div className={MODAL_STYLES.container}>
            <div className={MODAL_STYLES.header}>
              <div className="flex items-center">
                <div className={MODAL_STYLES.iconContainer}>
                  <Plus size={18} className={MODAL_STYLES.icon} />
                </div>
                <h2 className={MODAL_STYLES.title}>
                  Add New Recurring Bill
                </h2>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className={MODAL_STYLES.closeButton}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddBill} className={MODAL_STYLES.form}>
              {formError && (
                <div className="mb-4 p-3 bg-error/10 rounded-lg border border-error/30 text-error flex items-center">
                  <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                  <p>{formError}</p>
                </div>
              )}
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Bill Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={MODAL_STYLES.input}
                  placeholder="Enter bill name"
                  required
                />
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Amount
                </label>
                <div className="relative">
                  <span className={MODAL_STYLES.currencySymbol}>
                    {selectedCurrency.symbol}
                  </span>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className={`${MODAL_STYLES.input} ${MODAL_STYLES.currencyInput}`}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Due Date
                </label>
                <div className="relative">
                  <Calendar size={16} className={MODAL_STYLES.inputIcon} />
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    className={`${MODAL_STYLES.input} pl-10`}
                    required
                  />
                </div>
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Category
                </label>
                <div className="relative">
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`${MODAL_STYLES.input} pr-10 appearance-none`}
                    required
                  >
                    <option value="">Select a category</option>
                    {BILL_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Status
                </label>
                <div className="relative">
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className={`${MODAL_STYLES.input} pr-10 appearance-none`}
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              <div className={MODAL_STYLES.footer}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className={MODAL_STYLES.buttonCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={MODAL_STYLES.buttonSubmit}
                >
                  Add Bill
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bill Modal - Redesigned */}
      {showEditModal && currentBill && (
        <div className={MODAL_STYLES.backdrop}>
          <div className={MODAL_STYLES.container}>
            <div className={MODAL_STYLES.header}>
              <div className="flex items-center">
                <div className={MODAL_STYLES.iconContainer}>
                  <Edit3 size={18} className={MODAL_STYLES.icon} />
                </div>
                <h2 className={MODAL_STYLES.title}>
                  Edit Recurring Bill
                </h2>
              </div>
              <button 
                onClick={() => setShowEditModal(false)} 
                className={MODAL_STYLES.closeButton}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditBill} className={MODAL_STYLES.form}>
              {formError && (
                <div className="mb-4 p-3 bg-error/10 rounded-lg border border-error/30 text-error flex items-center">
                  <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                  <p>{formError}</p>
                </div>
              )}
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Bill Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={MODAL_STYLES.input}
                  placeholder="Enter bill name"
                  required
                />
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Amount
                </label>
                <div className="relative">
                  <span className={MODAL_STYLES.currencySymbol}>
                    {selectedCurrency.symbol}
                  </span>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className={`${MODAL_STYLES.input} ${MODAL_STYLES.currencyInput}`}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Due Date
                </label>
                <div className="relative">
                  <Calendar size={16} className={MODAL_STYLES.inputIcon} />
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    className={`${MODAL_STYLES.input} pl-10`}
                    required
                  />
                </div>
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Category
                </label>
                <div className="relative">
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`${MODAL_STYLES.input} pr-10 appearance-none`}
                    required
                  >
                    <option value="">Select a category</option>
                    {BILL_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              <div className={MODAL_STYLES.fieldGroup}>
                <label className={MODAL_STYLES.label}>
                  <span className={MODAL_STYLES.labelDot}></span>
                  Status
                </label>
                <div className="relative">
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className={`${MODAL_STYLES.input} pr-10 appearance-none`}
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              <div className={MODAL_STYLES.footer}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className={MODAL_STYLES.buttonCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={MODAL_STYLES.buttonSubmit}
                >
                  Update Bill
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Bill Modal - Redesigned */}
      {showDeleteModal && billToDelete && (
        <div className={MODAL_STYLES.backdrop}>
          <div className={MODAL_STYLES.deleteContainer}>
            <div className={MODAL_STYLES.deleteIcon}>
              <Trash2 className="text-error" size={28} />
            </div>
            <h2 className={MODAL_STYLES.deleteTitle}>
              Delete Recurring Bill
            </h2>
            <p className={MODAL_STYLES.deleteMessage}>
              Are you sure you want to delete this recurring bill? This action cannot be undone.
            </p>
            
            <div className={MODAL_STYLES.deleteButtonsContainer}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className={MODAL_STYLES.deleteButtonCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteBill}
                className={MODAL_STYLES.deleteButtonDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
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
                item.id === 'bills'
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
    </div>
  );
};

export default RecurringBillsPage; 