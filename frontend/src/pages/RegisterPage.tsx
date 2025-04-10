import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, User, AlertCircle, Check } from 'lucide-react';
import AuthCard from '../components/auth/AuthCard';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axiosConfig';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
    
    if (!formData.name) {
      newErrors.name = 'Full name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Register the user
      const registerResponse = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      
      // Registration success
      setSuccess(true);
      console.log('Registration successful', registerResponse.data);
      
      // Auto-login after successful registration
      // This is optional - you could just redirect to login instead
      // await login(formData.email, formData.password);
      // navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration failed:', error);
      
      // Handle different error responses
      if (error.response && error.response.status === 409) {
        setErrors({
          email: 'User with this email already exists'
        });
      } else {
        setErrors({
          form: error.response?.data?.message || 'Registration failed. Please try again.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check password strength
  const getPasswordStrength = (password: string) => {
    if (!password) return 0;
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    
    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 1;
    
    // Contains lowercase
    if (/[a-z]/.test(password)) strength += 1;
    
    // Contains number
    if (/[0-9]/.test(password)) strength += 1;
    
    // Contains special char
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const passwordStrengthWidth = `${(passwordStrength / 5) * 100}%`;
  const passwordStrengthColor = 
    passwordStrength < 2 ? 'bg-red-500' : 
    passwordStrength < 4 ? 'bg-yellow-500' : 
    'bg-green-500';

  return (
    <AuthCard 
      title="Create Your Account" 
      subtitle="SmartFinance"
    >
      {success ? (
        <div className="text-center py-4 sm:py-5 lg:py-6 animate-fadeIn">
          <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
            <Check className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
          </div>
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-primary mb-2">Registration Successful!</h3>
          <p className="text-secondary text-sm sm:text-base mb-4 sm:mb-5 lg:mb-6">Your account has been created successfully.</p>
          <Link to="/login">
            <Button variant="primary" className="w-full">
              Proceed to Login
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {errors.form && (
            <div className="bg-red-50 text-error p-3 sm:p-4 rounded-lg text-xs sm:text-sm flex items-center space-x-2 border border-red-100 animate-fadeIn">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}
          
          <Input
            icon={User}
            label="Full Name"
            type="text"
            name="name"
            placeholder="Enter your full name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            className="transition-all duration-300 focus:shadow-md text-sm sm:text-base"
          />
          
          <Input
            icon={Mail}
            label="Email"
            type="email"
            name="email"
            placeholder="Enter your email address"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            className="transition-all duration-300 focus:shadow-md text-sm sm:text-base"
          />
          
          <PasswordInput
            label="Password"
            name="password"
            placeholder="Create a password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            className="text-sm sm:text-base"
          />
          
          {/* Password strength meter with improved responsive styling */}
          {formData.password && (
            <div className="mt-1 animate-fadeIn">
              <div className="w-full h-1 sm:h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${passwordStrengthColor} transition-all duration-500 ease-out`} 
                  style={{ width: passwordStrengthWidth }}
                ></div>
              </div>
              <div className="grid grid-cols-5 gap-1 text-[10px] sm:text-xs text-secondary mt-1.5 sm:mt-2">
                <div className={`flex flex-col items-center ${passwordStrength >= 1 ? 'text-success font-medium' : ''}`}>
                  <span className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full mb-0.5 sm:mb-1 flex items-center justify-center ${passwordStrength >= 1 ? 'bg-success text-white' : 'bg-gray-200'}`}>
                    {passwordStrength >= 1 && <Check className="w-2 h-2 sm:w-3 sm:h-3" />}
                  </span>
                  <span>8+ chars</span>
                </div>
                <div className={`flex flex-col items-center ${passwordStrength >= 2 ? 'text-success font-medium' : ''}`}>
                  <span className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full mb-0.5 sm:mb-1 flex items-center justify-center ${passwordStrength >= 2 ? 'bg-success text-white' : 'bg-gray-200'}`}>
                    {passwordStrength >= 2 && <Check className="w-2 h-2 sm:w-3 sm:h-3" />}
                  </span>
                  <span>ABC</span>
                </div>
                <div className={`flex flex-col items-center ${passwordStrength >= 3 ? 'text-success font-medium' : ''}`}>
                  <span className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full mb-0.5 sm:mb-1 flex items-center justify-center ${passwordStrength >= 3 ? 'bg-success text-white' : 'bg-gray-200'}`}>
                    {passwordStrength >= 3 && <Check className="w-2 h-2 sm:w-3 sm:h-3" />}
                  </span>
                  <span>abc</span>
                </div>
                <div className={`flex flex-col items-center ${passwordStrength >= 4 ? 'text-success font-medium' : ''}`}>
                  <span className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full mb-0.5 sm:mb-1 flex items-center justify-center ${passwordStrength >= 4 ? 'bg-success text-white' : 'bg-gray-200'}`}>
                    {passwordStrength >= 4 && <Check className="w-2 h-2 sm:w-3 sm:h-3" />}
                  </span>
                  <span>123</span>
                </div>
                <div className={`flex flex-col items-center ${passwordStrength >= 5 ? 'text-success font-medium' : ''}`}>
                  <span className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full mb-0.5 sm:mb-1 flex items-center justify-center ${passwordStrength >= 5 ? 'bg-success text-white' : 'bg-gray-200'}`}>
                    {passwordStrength >= 5 && <Check className="w-2 h-2 sm:w-3 sm:h-3" />}
                  </span>
                  <span>!@#</span>
                </div>
              </div>
            </div>
          )}
          
          <PasswordInput
            label="Confirm Password"
            name="confirmPassword"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            className="text-sm sm:text-base"
          />
          
          <div className="mt-2">
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full shadow-sm hover:shadow-md transition-all duration-300 text-sm sm:text-base py-2 sm:py-2.5"
            >
              Create Account
            </Button>
          </div>
        </form>
      )}
      
      <div className="mt-6 sm:mt-7 lg:mt-8 text-center">
        <p className="text-secondary text-xs sm:text-sm">
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="text-primary font-medium hover:underline transition-all hover:text-opacity-80"
          >
            Login
          </Link>
        </p>
      </div>
    </AuthCard>
  );
};

export default RegisterPage; 