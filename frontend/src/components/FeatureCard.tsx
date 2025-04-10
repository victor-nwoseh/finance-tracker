import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description }) => {
  return (
    <div className="glass-card group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-light to-primary/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
          <Icon className="text-primary" size={28} strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-semibold mb-3 text-primary group-hover:text-primary/80 transition-colors duration-300">{title}</h3>
        <p className="text-secondary text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

export default FeatureCard; 