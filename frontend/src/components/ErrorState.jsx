export default function ErrorState({ message, onRetry }) {
  return (
    <div className="bg-plate rounded-thali p-8 shadow-sm text-center flex flex-col items-center gap-3">
      <span className="text-3xl">📡</span>
      <p className="font-display text-xl text-ink">Can't reach the server</p>
      <p className="text-sm text-cardamom max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 bg-turmeric hover:bg-turmeric-dark text-white font-medium px-5 py-2 rounded-full"
        >
          Try again
        </button>
      )}
    </div>
  );
}
