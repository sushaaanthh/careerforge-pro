import React from 'react';
import { Crown, X } from 'lucide-react';

const UpgradePopup = ({ onClose, onUpgrade }) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 10000
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: '24px', padding: '2rem',
        maxWidth: '400px', textAlign: 'center', position: 'relative'
      }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        <Crown size={48} color="#f59e0b" style={{ marginBottom: '1rem' }} />
        <h2 style={{ color: '#1e3c72', marginBottom: '0.5rem' }}>Upgrade to Pro</h2>
        <p style={{ color: '#5b6e8c', marginBottom: '1.5rem' }}>
          Free plan allows only 1 resume download. Get unlimited resumes, cover letters, cloud storage, and premium features.
        </p>
        <button
          onClick={onUpgrade}
          style={{
            background: '#1e3c72', color: 'white', border: 'none',
            padding: '0.75rem 1.5rem', borderRadius: '40px', fontSize: '1rem',
            fontWeight: '600', cursor: 'pointer', width: '100%'
          }}
        >
          Upgrade Now
        </button>
      </div>
    </div>
  );
};

export default UpgradePopup;