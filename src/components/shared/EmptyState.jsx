export default function EmptyState({ title, children, className = '' }) {
  return (
    <div className={`empty${className ? ` ${className}` : ''}`}>
      <b>{title}</b>
      {children}
    </div>
  );
}
