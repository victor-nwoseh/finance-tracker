import React from 'react';
import { LucideIcon } from 'lucide-react';
import { 
  ChartBar, 
  Clock, 
  Target, 
  TrendingUp as TrendIcon, 
  AlertCircle,
  CheckCircle2,
  Sparkles,
  BarChart3,
  PieChart,
  ArrowUpRight,
  Bell,
  Lightbulb
} from 'lucide-react';

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface MobileFeatureAccordionProps {
  features: FeatureItem[];
}

const MobileFeatureAccordion: React.FC<MobileFeatureAccordionProps> = ({ features }) => {
  // Helper function to get relevant icons for each feature's benefits
  const getBenefitIcons = (index: number): LucideIcon[] => {
    const iconSets = [
      [ChartBar, BarChart3, Sparkles], // Track Expenses
      [Target, Bell, Clock], // Set Budgets
      [TrendIcon, PieChart, ArrowUpRight], // Track Progress
      [Target, Sparkles, ArrowUpRight], // Savings Goals
      [Clock, Bell, CheckCircle2], // Recurring Bills
      [Lightbulb, ChartBar, Target] // Financial Insights
    ];
    return iconSets[index] || [CheckCircle2, CheckCircle2, CheckCircle2];
  };

  // Helper function to split description into key points
  const getDescriptionPoints = (description: string): string[] => {
    // Split the description into 2-3 points based on common separators
    const points = description.split(/[.,]/).filter(point => point.trim().length > 0);
    return points.slice(0, 3).map(point => point.trim());
  };

  return (
    <div className="space-y-3">
      {features.map((feature, index) => {
        const Icon = feature.icon;
        const benefitIcons = getBenefitIcons(index);
        const points = getDescriptionPoints(feature.description);
        
        return (
          <div
            key={index}
            className="group bg-white/50 hover:bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md overflow-hidden"
          >
            <div className="w-full flex items-center p-4">
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-gray-900 group-hover:text-primary transition-colors duration-300">
                  {feature.title}
                </span>
              </div>
            </div>

            {/* Enhanced Visual Description */}
            <div className="max-h-0 group-hover:max-h-[300px] transition-all duration-300 ease-in-out overflow-hidden">
              <div className="p-4 pt-0">
                <div className="h-px w-full bg-gray-100 mb-4"></div>
                <div className="space-y-3">
                  {points.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3 group/item">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-7 h-7 rounded-full bg-primary/5 flex items-center justify-center group-hover/item:bg-primary/10 transition-colors duration-200">
                          {React.createElement(benefitIcons[idx], {
                            className: 'w-4 h-4 text-primary/70'
                          })}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {point}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Visual decoration */}
                <div className="mt-3 h-1 w-full bg-gradient-to-r from-primary/5 via-primary/10 to-transparent rounded-full"></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MobileFeatureAccordion; 