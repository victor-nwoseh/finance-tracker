import React from 'react';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const AuthCard: React.FC<AuthCardProps> = ({ title, subtitle, children }) => {
  return (
    <div className="page-container min-h-screen flex items-center justify-center py-8 sm:py-12 lg:py-16">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="decorative-blob w-60 sm:w-72 lg:w-80 h-60 sm:h-72 lg:h-80 bg-primary/20 top-[-5%] sm:top-[-8%] lg:top-[-10%] right-[-8%] sm:right-[-6%] lg:right-[-5%] animate-float-slow"></div>
        <div className="decorative-blob w-72 sm:w-80 lg:w-96 h-72 sm:h-80 lg:h-96 bg-blue-200/20 bottom-[5%] sm:bottom-[8%] lg:bottom-[10%] left-[-10%] sm:left-[-12%] lg:left-[-15%] animate-float hidden sm:block"></div>
        <div className="decorative-blob w-48 sm:w-56 lg:w-64 h-48 sm:h-56 lg:h-64 bg-green-200/30 bottom-[20%] sm:bottom-[25%] lg:bottom-[30%] right-[2%] sm:right-[3%] lg:right-[5%] animate-float-fast hidden sm:block"></div>
      </div>
      
      <div className="w-full max-w-[340px] sm:max-w-[400px] lg:max-w-md p-3 sm:p-4 z-10">
        <div className="glassmorphism glass-card overflow-hidden animate-fadeIn">
          {/* Top accent gradient */}
          <div className="h-1.5 sm:h-2 bg-gradient-to-r from-primary to-primary/70 w-full"></div>
          
          {/* Logo */}
          <div className="relative flex justify-center -mt-6 sm:-mt-7 lg:-mt-8">
            <div className="w-16 sm:w-18 lg:w-20 h-16 sm:h-18 lg:h-20 rounded-xl bg-white shadow-md flex items-center justify-center rotate-[3deg] hover:rotate-[8deg] transition-all duration-300">
              <img 
                src="/smartfinance-logo.jpg" 
                alt="SmartFinance Logo" 
                className="w-12 sm:w-14 lg:w-16 h-12 sm:h-14 lg:h-16 object-contain rounded-lg"
              />
            </div>
            
            {/* Floating dollar icons */}
            <span className="absolute -top-3 sm:-top-4 left-8 sm:left-10 text-lg sm:text-xl text-primary/30 animate-float">$</span>
            <span className="absolute top-10 sm:top-12 -right-1 sm:-right-2 text-lg sm:text-xl text-primary/20 animate-float-fast">$</span>
          </div>
          
          {/* Content */}
          <div className="mt-4 sm:mt-5 lg:mt-6 text-center px-2">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">{title}</h2>
            {subtitle && <p className="mt-1.5 sm:mt-2 text-secondary text-xs sm:text-sm">{subtitle}</p>}
          </div>
          
          <div className="mt-6 sm:mt-7 lg:mt-8 px-4 sm:px-5 lg:px-6 pb-6 sm:pb-7 lg:pb-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCard; 