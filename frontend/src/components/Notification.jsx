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
    <div className={getClassName()}>
      <div className="notification-content">
        <span className="notification-icon">{getIcon()}</span>
        <span className="notification-message">{message}</span>
      </div>
      <button 
        onClick={handleClose}
        className="notification-close"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export default Notification; 