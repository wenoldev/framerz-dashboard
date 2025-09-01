export default function Footer() {
  return (
    <footer className="w-full bg-gray-900 py-6 mt-12">
      <div className="max-w-6xl mx-auto text-center text-sm text-white px-4">
        <p>© {new Date().getFullYear()} Sluggy. All rights reserved.</p>
        <p className="mt-2">
          Made with <span className="text-red-500">♥</span> from India
        </p>
      </div>
    </footer>
  );
}
