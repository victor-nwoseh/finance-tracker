import React, { ButtonHTMLAttributes } from 'react';
import { Loader } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger';
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  let baseClassName = '';
  
  switch (variant) {
    case 'primary':
      baseClassName = 'btn-primary';
      break;
    case 'outline':
      baseClassName = 'btn-outline';
      break;
    case 'danger':
      baseClassName = 'bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md shadow-sm';
      break;
    default:
      baseClassName = 'btn-primary';
  }
  
  return (
    <button
      className={`${baseClassName} ${className} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <Loader className="animate-spin w-4 h-4 mr-2" />
          {children}
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default Button; 