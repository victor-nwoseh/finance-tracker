import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, PieChart, TrendingUp, CreditCard, Wallet, DollarSign } from 'lucide-react';
import Button from '../components/ui/Button';
import FeatureCard from '../components/FeatureCard';
import MobileFeatureAccordion from '../components/MobileFeatureAccordion';

const IndexPage: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);

  // Parallax effect on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="page-container">
      {/* Decorative blurred elements with enhanced animations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="decorative-blob w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-primary/30 top-[-5%] md:top-[-10%] lg:top-[-15%] right-[-5%] md:right-[-8%] lg:right-[-10%] animate-float-slow hidden sm:block"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        ></div>
        <div 
          className="decorative-blob w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 bg-blue-300/20 top-[40%] md:top-[35%] lg:top-[30%] left-[-10%] md:left-[-12%] lg:left-[-15%] animate-float hidden sm:block"
          style={{ transform: `translateY(${scrollY * -0.05}px)` }}
        ></div>
        <div 
          className="decorative-blob w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 bg-green-200/30 bottom-[5%] md:bottom-[8%] lg:bottom-[10%] right-[2%] md:right-[3%] lg:right-[5%] animate-float-fast hidden sm:block"
          style={{ transform: `translateY(${scrollY * 0.08}px)` }}
        ></div>
        <div className="absolute w-full h-24 md:h-28 lg:h-32 bottom-0 bg-gradient-to-t from-primary/5 to-transparent"></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12 relative z-10">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mb-12 sm:mb-16 lg:mb-20 mt-4 sm:mt-6 lg:mt-8">
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-lg transform hover:scale-105 transition-transform duration-300">
              <img 
                src="/smartfinance-logo.jpg" 
                alt="SmartFinance Logo" 
                className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain"
              />
            </div>
            {/* Floating currency symbols - now visible on mobile */}
            <span className="absolute -top-1 -left-1 text-xl sm:text-2xl md:text-3xl text-primary/30 animate-float-fast">$</span>
            <span className="absolute bottom-3 -right-1 text-lg sm:text-xl md:text-2xl text-primary/20 animate-float">€</span>
            <span className="absolute top-10 right-2 text-base sm:text-lg md:text-xl text-primary/25 animate-float-slow">£</span>
          </div>
          
          <h1 className="gradient-text text-4xl sm:text-5xl lg:text-6xl mb-4 sm:mb-5 lg:mb-6 max-w-xl sm:max-w-2xl font-bold leading-tight">
            SmartFinance
          </h1>
          
          <p className="text-secondary max-w-sm sm:max-w-md lg:max-w-xl mx-auto text-base sm:text-lg mb-6 sm:mb-7 lg:mb-8 px-4 sm:px-0">
            Take control of your finances with our comprehensive tracking tools. Monitor spending, set budgets, and reach your financial goals.
          </p>
          
          {/* Enhanced CTA buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 lg:gap-5 mt-2 w-full sm:w-auto px-4 sm:px-0">
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full sm:w-auto px-6 sm:px-7 lg:px-8 py-2.5 sm:py-3 min-w-[130px] sm:min-w-[150px] text-base sm:text-lg">
                Login
              </Button>
            </Link>
            <Link to="/register" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto px-6 sm:px-7 lg:px-8 py-2.5 sm:py-3 min-w-[130px] sm:min-w-[150px] text-base sm:text-lg">
                Register
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Feature Cards with improved layout */}
        <h2 className="text-center gradient-text text-2xl sm:text-3xl lg:text-4xl mb-8 sm:mb-10 lg:mb-12 max-w-xs sm:max-w-sm lg:max-w-lg mx-auto px-4 sm:px-0">
          Everything you need to manage your finances
        </h2>
        
        {/* Mobile Accordion View */}
        <div className="sm:hidden px-4 mb-12">
          <MobileFeatureAccordion
            features={[
              {
                icon: FileText,
                title: "Track Expenses",
                description: "Monitor your daily spending habits with detailed transaction records and beautiful visualization charts."
              },
              {
                icon: PieChart,
                title: "Set Budgets",
                description: "Create personalized budgets for different spending categories. Get alerted when you're close to limits."
              },
              {
                icon: TrendingUp,
                title: "Track Progress",
                description: "Visualize your financial journey with interactive charts and comprehensive financial reports."
              },
              {
                icon: Wallet,
                title: "Savings Goals",
                description: "Set and track savings goals with our intuitive pot system. Watch your money grow towards your dreams."
              },
              {
                icon: CreditCard,
                title: "Recurring Bills",
                description: "Never miss a payment again. Manage all your recurring bills in one centralized dashboard."
              },
              {
                icon: DollarSign,
                title: "Financial Insights",
                description: "Gain valuable insights about your spending habits and receive tips to improve your financial health."
              }
            ]}
          />
        </div>

        {/* Desktop/Tablet Card Grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-xs sm:max-w-3xl lg:max-w-6xl mx-auto mb-12 sm:mb-16 lg:mb-20 px-4 sm:px-6 lg:px-8">
          <FeatureCard 
            icon={FileText} 
            title="Track Expenses" 
            description="Monitor your daily spending habits with detailed transaction records and beautiful visualization charts."
          />
          <FeatureCard 
            icon={PieChart} 
            title="Set Budgets" 
            description="Create personalized budgets for different spending categories. Get alerted when you're close to limits."
          />
          <FeatureCard 
            icon={TrendingUp} 
            title="Track Progress" 
            description="Visualize your financial journey with interactive charts and comprehensive financial reports."
          />
          <FeatureCard 
            icon={Wallet} 
            title="Savings Goals" 
            description="Set and track savings goals with our intuitive pot system. Watch your money grow towards your dreams."
          />
          <FeatureCard 
            icon={CreditCard} 
            title="Recurring Bills" 
            description="Never miss a payment again. Manage all your recurring bills in one centralized dashboard."
          />
          <FeatureCard 
            icon={DollarSign} 
            title="Financial Insights" 
            description="Gain valuable insights about your spending habits and receive tips to improve your financial health."
          />
        </div>
        
        {/* Final CTA */}
        <div className="text-center py-6 sm:py-7 lg:py-8 max-w-xs sm:max-w-sm lg:max-w-xl mx-auto px-4 sm:px-0">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">Ready to take control of your finances?</h2>
          <Link to="/register" className="block sm:inline-block">
            <Button variant="primary" className="w-full sm:w-auto px-6 sm:px-7 lg:px-8 py-2.5 sm:py-3 text-base sm:text-lg">
              Start for free today
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="w-full bg-primary/5 py-4 sm:py-5 lg:py-6 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-secondary text-sm">
          <p>© 2025 SmartFinance. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default IndexPage; 