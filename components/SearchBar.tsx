'use client'

import Link from 'next/link'

export default function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const supabase = createClient()

  async function handleSearch(value: string) {
    setSearchTerm(value)
    if (value.length > 2) {
      const { data } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone')
        .or(`first_name.ilike.%${value}%,last_name.ilike.%${value}%,phone.ilike.%${value}%`)
        .limit(10)
      setResults(data || [])
    } else {
      setResults([])
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search by name or phone..."
        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
      />
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg mt-1 z-10 max-h-60 overflow-y-auto">
          {results.map((patient: any) => (
            <Link
              key={patient.id}
              href={`/patients/${patient.id}`}
              className="block p-3 hover:bg-gray-50 border-b last:border-b-0"
            >
              <div className="font-medium">{patient.first_name} {patient.last_name}</div>
              <div className="text-sm text-gray-500">{patient.phone}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}