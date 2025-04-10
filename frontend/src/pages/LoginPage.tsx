import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, AlertCircle } from 'lucide-react';
import AuthCard from '../components/auth/AuthCard';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, error: authError, isLoading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      // Set a user-friendly error message
      if (error?.response?.status === 401) {
        setErrors({ auth: 'Invalid email or password' });
      } else {
        setErrors({ auth: 'An error occurred. Please try again later.' });
      }
    }
  };

  return (
    <AuthCard
      title="Welcome Back"
      subtitle="Sign in to your account to continue"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div className="form-group">
          <label htmlFor="email" className="form-label text-sm sm:text-base mb-1.5 sm:mb-2 block text-gray-700 font-medium">
            Email Address
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            icon={Mail}
            error={errors.email}
            className="text-sm sm:text-base"
          />
          {errors.email && (
            <p className="form-error flex items-center mt-1 text-xs sm:text-sm text-error">
              <AlertCircle size={12} className="mr-1 sm:mr-1.5 flex-shrink-0" />
              {errors.email}
            </p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label text-sm sm:text-base mb-1.5 sm:mb-2 block text-gray-700 font-medium">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            className="text-sm sm:text-base"
          />
          {errors.password && (
            <p className="form-error flex items-center mt-1 text-xs sm:text-sm text-error">
              <AlertCircle size={12} className="mr-1 sm:mr-1.5 flex-shrink-0" />
              {errors.password}
            </p>
          )}
        </div>

        {/* Display auth error */}
        {(errors.auth || authError) && (
          <div className="bg-error/10 text-error text-xs sm:text-sm p-2.5 sm:p-3 rounded-lg flex items-center">
            <AlertCircle size={14} className="mr-1.5 sm:mr-2 flex-shrink-0" />
            {errors.auth || 'Invalid email or password'}
          </div>
        )}

        <Button
          type="submit"
          className="w-full mt-4 sm:mt-5 text-sm sm:text-base py-2 sm:py-2.5"
          isLoading={authLoading}
        >
          Sign In
        </Button>

        <p className="text-center text-xs sm:text-sm text-secondary mt-4 sm:mt-5">
          Don't have an account?{' '}
          <Link 
            to="/register" 
            className="text-primary hover:underline hover:text-primary/80 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </form>
    </AuthCard>
  );
};

export default LoginPage; 