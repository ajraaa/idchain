import { useState, useEffect } from 'react';

const Notification = ({ message, type = 'info', onClose, autoClose = true, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) {
    return null;
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getClassName = () => {
    const baseClass = 'notification';
    return `${baseClass} ${baseClass}--${type}`;
  };

  return (
    <div className={getClassName()} style={{marginTop: '1rem', borderRadius: '14px', boxShadow: '0 4px 24px rgba(0,0,0,0.13)', padding: '1.1rem 2rem 1.1rem 1.5rem', minWidth: 340, maxWidth: '90vw'}}>
      <div className="notification-content" style={{display: 'flex', alignItems: 'center', gap: '0.7rem', flex: 1}}>
        <span className="notification-icon" style={{fontSize: '1.5rem'}}>{getIcon()}</span>
        <span className="notification-message" style={{flex: 1}}>{message}</span>
      </div>
      <button 
        onClick={handleClose}
        className="notification-close"
        aria-label="Close notification"
        style={{background: 'none', border: 'none', color: '#888', fontSize: '1.3rem', cursor: 'pointer', marginLeft: '1rem', transition: 'color 0.2s', borderRadius: '6px'}}
      >
        ×
      </button>
    </div>
  );
};

export default Notification; 