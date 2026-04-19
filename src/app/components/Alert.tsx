"use client";

interface AlertProps {
  message: string;
  onClose: () => void;
}

export function Alert({ message, onClose }: AlertProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div className="window" style={{ width: '300px' }}>
        <div className="title-bar">
          <div className="title-bar-text">Alert</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onClose}></button>
          </div>
        </div>
        <div className="window-body" style={{ padding: '1rem', textAlign: 'center' }}>
          <p>{message}</p>
          <button onClick={onClose} style={{ marginTop: '1rem' }}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
