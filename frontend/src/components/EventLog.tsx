export function EventLog() {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl py-3 px-4 flex items-center gap-2">
      <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
      <span className="text-xs text-zinc-500">Events available with sails-js v2</span>
    </div>
  );
}
