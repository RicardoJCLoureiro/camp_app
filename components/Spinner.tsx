// components/Spinner.tsx
'use client';

export default function Spinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-20">
      <div className="w-16 h-16 border-4 border-t-[var(--color-flag_green)] border-gray-200 rounded-full animate-spin"></div>
    </div>
  );
}
