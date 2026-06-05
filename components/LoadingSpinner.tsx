export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🦷</span>
          </div>
        </div>
        <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        <p className="text-sm text-gray-400 mt-1">Please wait while we prepare your dashboard</p>
      </div>
    </div>
  )
}