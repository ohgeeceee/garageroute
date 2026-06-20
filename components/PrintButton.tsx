"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
    >
      Print flyer
    </button>
  );
}
