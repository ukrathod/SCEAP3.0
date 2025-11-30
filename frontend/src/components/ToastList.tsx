// ToastList - no explicit React import required with the jsx runtime

type Toast = { id: number; msg: string; type?: 'info' | 'success' | 'error' };

function Icon({ type }: { type?: string }) {
  if (type === 'success') return <span className="mr-2 text-green-300" aria-hidden>✔</span>;
  if (type === 'error') return <span className="mr-2 text-red-300" aria-hidden>✖</span>;
  return <span className="mr-2 text-gray-300" aria-hidden>ℹ</span>;
}

export default function ToastList({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 space-y-2 z-50" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div key={t.id} className={`bg-black text-white px-4 py-2 rounded shadow flex items-center animate-fade-in`} role="status">
          <Icon type={t.type} />
          <div className="mr-3">{t.msg}</div>
          <button className="ml-2 underline text-sm" onClick={() => onDismiss(t.id)}>Dismiss</button>
        </div>
      ))}
    </div>
  );
}
