// addon-todoist-chore-board/web-ui/src/components/Modal.jsx
import React, { useEffect } from 'react';

const Modal = ({ isOpen, onClose, children, labelledBy, className = '' }) => {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = event => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? undefined}>
      <div className="modal__overlay" onClick={handleOverlayClick}>
        <div className={`modal__dialog ${className}`}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
