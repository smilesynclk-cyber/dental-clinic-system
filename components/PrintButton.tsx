'use client'

export default function PrintButton() {
  const handlePrint = () => {
    window.print()
  }

  return (
    <button 
      onClick={handlePrint} 
      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
    >
      🖨️ Print Invoice
    </button>
  )
}