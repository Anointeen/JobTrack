import React from 'react';
import { Award, Percent } from 'lucide-react';

interface SuccessRateCardProps {
  totalApplications: number;
  totalOffers: number;
}

export const SuccessRateCard: React.FC<SuccessRateCardProps> = ({
  totalApplications,
  totalOffers
}) => {
  const hasApplications = totalApplications > 0;
  const rate = hasApplications 
    ? ((totalOffers / totalApplications) * 100).toFixed(1) 
    : '0';

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', color: 'var(--slate-900)' }}>
              Application Success Rate
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)', marginTop: '2px' }}>
              Offers relative to total submitted applications
            </p>
          </div>
          <div 
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: 'var(--radius-md)', 
              backgroundColor: 'var(--emerald-50)', 
              color: 'var(--emerald-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Award size={22} />
          </div>
        </div>

        {!hasApplications ? (
          <div 
            style={{ 
              padding: '1.5rem 1rem', 
              backgroundColor: 'var(--slate-50)', 
              borderRadius: 'var(--radius-md)', 
              textAlign: 'center',
              border: '1px dashed var(--slate-300)'
            }}
          >
            <Percent size={28} color="var(--slate-400)" style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate-700)' }}>
              Start adding applications to see your success rate.
            </p>
            <p style={{ fontSize: '0.78125rem', color: 'var(--slate-500)', marginTop: '4px' }}>
              Your conversion percentage will calculate automatically as your job search progresses.
            </p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.75rem 0' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--emerald-600)', lineHeight: 1 }}>
                {rate}%
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--slate-500)', fontWeight: 500 }}>
                ({totalOffers} offer{totalOffers !== 1 ? 's' : ''} / {totalApplications} total)
              </span>
            </div>

            {/* Visual Progress Gauge */}
            <div 
              style={{ 
                height: '8px', 
                backgroundColor: 'var(--slate-100)', 
                borderRadius: 'var(--radius-full)', 
                overflow: 'hidden',
                margin: '1rem 0'
              }}
            >
              <div 
                style={{ 
                  height: '100%', 
                  width: `${Math.min(Math.max(parseFloat(rate), 2), 100)}%`, 
                  backgroundColor: 'var(--emerald-500)',
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.6s ease-out'
                }} 
              />
            </div>
            
            <p style={{ fontSize: '0.8125rem', color: 'var(--slate-600)' }}>
              {parseFloat(rate) >= 15 
                ? '🔥 Outstanding conversion rate! Keep up the momentum.' 
                : parseFloat(rate) > 0 
                ? '👍 Great progress! Continuous follow-ups increase offer rates.' 
                : '💡 Tip: Tailor your resume for targeted positions to increase callbacks.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
