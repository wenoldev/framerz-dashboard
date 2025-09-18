export default function Footer() {
  return (
    <footer className="w-full bg-white py-6 border-t border-gray-200 border-t">
      <div className="max-w-6xl mx-auto text-center text-sm text-gray-700 px-4">
        <p>© {new Date().getFullYear()} Sluggy. All rights reserved.</p>
        <p className="mt-2">
          Made with <span className="text-red-500">♥</span> from India
        </p>
      </div>
    </footer>
  );
}
