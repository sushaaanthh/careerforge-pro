import React, { useCallback, useEffect, useState } from 'react';

const Dashboard = ({ userEmail }) => {
  const [data, setData] = useState({ user: null, files: [] });
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState('');

  const premiumTemplates = [
    {
      name: 'Executive Modern',
      description: 'Balanced spacing, sharp hierarchy, and a polished corporate layout.'
    },
    {
      name: 'ATS One-Column Pro',
      description: 'Single-column structure optimized for readability and ATS parsing.'
    },
    {
      name: 'Minimal Serif Pro',
      description: 'Clean serif presentation for academic, consulting, and editorial roles.'
    }
  ];

  const fetchData = useCallback(async () => {
    if (!userEmail) return null;
    const res = await fetch(`http://localhost:5000/api/me?email=${encodeURIComponent(userEmail)}`);
    const json = await res.json();
    if (res.ok) {
      setData(json);
      return json;
    }
    return null;
  }, [userEmail]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!sessionId || !userEmail) return;

    let attempts = 0;
    const maxAttempts = 10;
    setIsConfirmingPayment(true);

    const interval = setInterval(async () => {
      attempts += 1;
      const latest = await fetchData();
      if (latest?.user?.isPro) {
        clearInterval(interval);
        setIsConfirmingPayment(false);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        setIsConfirmingPayment(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchData, userEmail]);

  const handleUpgrade = async () => {
    if (!userEmail) return alert('Please enter your email in the resume form first.');

    setIsUpgrading(true);
    setCheckoutStatus('');
    try {
      const res = await fetch('http://localhost:5000/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userEmail, email: userEmail })
      });

      const json = await res.json();
      if (!res.ok) {
        setCheckoutStatus(json?.error || 'Failed to start checkout.');
        return;
      }

      if (json?.url) {
        window.location.assign(json.url);
        return;
      }

      setCheckoutStatus('Stripe checkout URL missing from server response.');
    } catch (error) {
      setCheckoutStatus('Unable to start checkout right now. Please try again.');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <section className="cf-glass-card">
      <h2 className="cf-title">Dashboard</h2>
      <p>Plan: <strong>{data.user?.isPro ? 'Pro' : 'Free'}</strong></p>

      {!data.user?.isPro && (
        <div className="cf-glass-card upgrade-panel" style={{ marginBottom: 14 }}>
          <h3 className="cf-subtitle" style={{ marginTop: 0 }}>Upgrade to Pro</h3>
          <p className="upgrade-copy">
            Unlock Pro with a one-time payment of Rs. 499.
          </p>
          {checkoutStatus && <p className="upgrade-status">{checkoutStatus}</p>}
          <button className="cf-btn" onClick={handleUpgrade} disabled={isUpgrading}>
            {isUpgrading ? 'Redirecting...' : 'Upgrade to Pro'}
          </button>
        </div>
      )}

      <div className="cf-glass-card" style={{ marginBottom: 14 }}>
        <h3 className="cf-subtitle" style={{ marginTop: 0 }}>Premium Templates</h3>
        {isConfirmingPayment && (
          <p className="template-status">Confirming payment webhook... unlocking templates shortly.</p>
        )}

        {!data.user?.isPro && !isConfirmingPayment && (
          <p className="template-status">Locked templates are still visible so you can preview the Pro catalog.</p>
        )}

        <div className="template-grid">
          {premiumTemplates.map((template) => (
            <article key={template.name} className={`template-card ${data.user?.isPro ? 'is-unlocked' : 'is-locked'}`}>
              <div className="template-card__top">
                <div>
                  <h4 className="template-card__title">{template.name}</h4>
                  <p className="template-card__desc">{template.description}</p>
                </div>
                <span className="template-card__badge">
                  {data.user?.isPro ? 'Unlocked' : 'Pro'}
                </span>
              </div>

              <div className="template-card__preview">
                <span className="template-card__line template-card__line--short" />
                <span className="template-card__line" />
                <span className="template-card__line template-card__line--mid" />
              </div>

              <div className="template-card__footer">
                <span>{data.user?.isPro ? 'Available now' : 'Unlock after payment confirmation'}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <h3 className="cf-subtitle">Saved Files</h3>
      <ul className="cf-list">
        {data.files.map((f) => (
          <li key={f.id}>
            <span>{f.name}</span>
            <span>{new Date(f.updatedAt).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Dashboard;