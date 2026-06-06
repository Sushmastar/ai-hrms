import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Page not found</h2>
        <p className="text-gray-500 mb-6">This page doesn't exist or you don't have access to it.</p>
        <Link href="/login"
          className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
