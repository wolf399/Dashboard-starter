export const ComingSoonBanner = ({ title, description, color = 'blue' }) => {
  const colors = {
    blue: { bg: '#DBEAFE', border: '#93C5FD', text: '#1E40AF' },
    yellow: { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' },
    green: { bg: '#ECFDF5', border: '#BBFBDF', text: '#065F46' },
  };

  const c = colors[color];

  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px',
      textAlign: 'center'
    }}>
      <p style={{ margin: 0, fontSize: '13px', color: c.text, fontWeight: 500 }}>
        🚧 <strong>{title}</strong> {description}
      </p>
    </div>
  );
};
