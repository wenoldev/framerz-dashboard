export default function RightSide() {
  return (
    <div className="flex flex-col items-center text-center space-y-4">
      {/* <img src="/login.jpg" alt="QR Code" className="w-40 h-40" /> */}

      <div className="flex items-center border px-3 py-2 rounded-md shadow">
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M10 13a5 5 0 005-5V6a2 2 0 10-4 0v2a1 1 0 01-1 1H8a2 2 0 100 4h2z" />
          <path d="M14 11v2a5 5 0 01-5 5H6a2 2 0 010-4h2a1 1 0 001-1v-2" />
        </svg>
        <span className="font-semibold">bit.ly/SFLivingShop</span>
      </div>

      <p className="text-sm text-gray-600 max-w-xs">
        Power your links, QR Codes, and landing pages with Bitly&apos;s Connections Platform
      </p>
    </div>
  )
}
