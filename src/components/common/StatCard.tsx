import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple';
  subtitle?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  onClick
}) => {
  // `border` was computed for every colour but never applied to any element.
  const getColorStyles = () => {
    switch (color) {
      case 'indigo':
        return { bg: 'var(--primary-50)', text: 'var(--primary-600)' };
      case 'emerald':
        return { bg: 'var(--emerald-50)', text: 'var(--emerald-600)' };
      case 'amber':
        return { bg: 'var(--amber-50)', text: 'var(--amber-600)' };
      case 'rose':
        return { bg: 'var(--rose-50)', text: 'var(--rose-600)' };
      case 'sky':
        return { bg: 'var(--sky-50)', text: 'var(--sky-600)' };
      case 'purple':
        return { bg: 'var(--purple-50)', text: 'var(--purple-600)' };
    }
  };

  const style = getColorStyles();

  return (
    <div 
      className={`card ${onClick ? 'card-hover' : ''}`}
      onClick={onClick}
      style={{ 
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {title}
          </p>
          <p style={{ fontSize: '1.875rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-heading)' }}>
            {value}
          </p>
          {subtitle && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {subtitle}
            </p>
          )}
        </div>
        <div 
          style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: 'var(--radius-md)', 
            backgroundColor: style.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Icon size={24} color={style.text} />
        </div>
      </div>
    </div>
  );
};
