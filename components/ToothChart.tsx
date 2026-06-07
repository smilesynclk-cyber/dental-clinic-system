'use client'

import { useState } from 'react'

interface Tooth {
  number: number
  name: string
  type: 'permanent' | 'primary'
  quadrant: string
  selected?: boolean
  condition?: string
}

interface ToothChartProps {
  onToothSelect?: (toothNumber: number, toothType: string) => void
  selectedTooth?: number | null
  dentitionType: 'permanent' | 'primary' | 'mixed'
  onDentitionChange?: (type: 'permanent' | 'primary' | 'mixed') => void
}

// Permanent teeth (1-32)
const permanentTeeth: Tooth[] = [
  // Upper Right (1-8)
  { number: 18, name: '3rd Molar', type: 'permanent', quadrant: 'UR' },
  { number: 17, name: '2nd Molar', type: 'permanent', quadrant: 'UR' },
  { number: 16, name: '1st Molar', type: 'permanent', quadrant: 'UR' },
  { number: 15, name: '2nd Premolar', type: 'permanent', quadrant: 'UR' },
  { number: 14, name: '1st Premolar', type: 'permanent', quadrant: 'UR' },
  { number: 13, name: 'Canine', type: 'permanent', quadrant: 'UR' },
  { number: 12, name: 'Lateral Incisor', type: 'permanent', quadrant: 'UR' },
  { number: 11, name: 'Central Incisor', type: 'permanent', quadrant: 'UR' },
  // Upper Left (9-16)
  { number: 21, name: 'Central Incisor', type: 'permanent', quadrant: 'UL' },
  { number: 22, name: 'Lateral Incisor', type: 'permanent', quadrant: 'UL' },
  { number: 23, name: 'Canine', type: 'permanent', quadrant: 'UL' },
  { number: 24, name: '1st Premolar', type: 'permanent', quadrant: 'UL' },
  { number: 25, name: '2nd Premolar', type: 'permanent', quadrant: 'UL' },
  { number: 26, name: '1st Molar', type: 'permanent', quadrant: 'UL' },
  { number: 27, name: '2nd Molar', type: 'permanent', quadrant: 'UL' },
  { number: 28, name: '3rd Molar', type: 'permanent', quadrant: 'UL' },
  // Lower Left (17-24)
  { number: 38, name: '3rd Molar', type: 'permanent', quadrant: 'LL' },
  { number: 37, name: '2nd Molar', type: 'permanent', quadrant: 'LL' },
  { number: 36, name: '1st Molar', type: 'permanent', quadrant: 'LL' },
  { number: 35, name: '2nd Premolar', type: 'permanent', quadrant: 'LL' },
  { number: 34, name: '1st Premolar', type: 'permanent', quadrant: 'LL' },
  { number: 33, name: 'Canine', type: 'permanent', quadrant: 'LL' },
  { number: 32, name: 'Lateral Incisor', type: 'permanent', quadrant: 'LL' },
  { number: 31, name: 'Central Incisor', type: 'permanent', quadrant: 'LL' },
  // Lower Right (25-32)
  { number: 41, name: 'Central Incisor', type: 'permanent', quadrant: 'LR' },
  { number: 42, name: 'Lateral Incisor', type: 'permanent', quadrant: 'LR' },
  { number: 43, name: 'Canine', type: 'permanent', quadrant: 'LR' },
  { number: 44, name: '1st Premolar', type: 'permanent', quadrant: 'LR' },
  { number: 45, name: '2nd Premolar', type: 'permanent', quadrant: 'LR' },
  { number: 46, name: '1st Molar', type: 'permanent', quadrant: 'LR' },
  { number: 47, name: '2nd Molar', type: 'permanent', quadrant: 'LR' },
  { number: 48, name: '3rd Molar', type: 'permanent', quadrant: 'LR' }
]

// Primary teeth (A-T)
const primaryTeeth: Tooth[] = [
  { number: 55, name: '2nd Molar', type: 'primary', quadrant: 'UR' },
  { number: 54, name: '1st Molar', type: 'primary', quadrant: 'UR' },
  { number: 53, name: 'Canine', type: 'primary', quadrant: 'UR' },
  { number: 52, name: 'Lateral Incisor', type: 'primary', quadrant: 'UR' },
  { number: 51, name: 'Central Incisor', type: 'primary', quadrant: 'UR' },
  { number: 61, name: 'Central Incisor', type: 'primary', quadrant: 'UL' },
  { number: 62, name: 'Lateral Incisor', type: 'primary', quadrant: 'UL' },
  { number: 63, name: 'Canine', type: 'primary', quadrant: 'UL' },
  { number: 64, name: '1st Molar', type: 'primary', quadrant: 'UL' },
  { number: 65, name: '2nd Molar', type: 'primary', quadrant: 'UL' },
  { number: 75, name: '2nd Molar', type: 'primary', quadrant: 'LL' },
  { number: 74, name: '1st Molar', type: 'primary', quadrant: 'LL' },
  { number: 73, name: 'Canine', type: 'primary', quadrant: 'LL' },
  { number: 72, name: 'Lateral Incisor', type: 'primary', quadrant: 'LL' },
  { number: 71, name: 'Central Incisor', type: 'primary', quadrant: 'LL' },
  { number: 81, name: 'Central Incisor', type: 'primary', quadrant: 'LR' },
  { number: 82, name: 'Lateral Incisor', type: 'primary', quadrant: 'LR' },
  { number: 83, name: 'Canine', type: 'primary', quadrant: 'LR' },
  { number: 84, name: '1st Molar', type: 'primary', quadrant: 'LR' },
  { number: 85, name: '2nd Molar', type: 'primary', quadrant: 'LR' }
]

const surfaceOptions = [
  { value: 'M', label: 'Mesial' },
  { value: 'D', label: 'Distal' },
  { value: 'O', label: 'Occlusal' },
  { value: 'B', label: 'Buccal' },
  { value: 'L', label: 'Lingual' },
  { value: 'MO', label: 'Mesio-Occlusal' },
  { value: 'DO', label: 'Disto-Occlusal' },
  { value: 'MOD', label: 'Mesio-Occluso-Distal' }
]

export default function ToothChart({ 
  onToothSelect, 
  selectedTooth, 
  dentitionType = 'permanent',
  onDentitionChange 
}: ToothChartProps) {
  const [selectedSurface, setSelectedSurface] = useState('')
  const [selectedCondition, setSelectedCondition] = useState('')

  const getTeeth = () => {
    if (dentitionType === 'permanent') return permanentTeeth
    if (dentitionType === 'primary') return primaryTeeth
    // Mixed dentition - show both
    return [...permanentTeeth, ...primaryTeeth]
  }

  const teeth = getTeeth()

  const handleToothClick = (tooth: Tooth) => {
    if (onToothSelect) {
      onToothSelect(tooth.number, tooth.type)
    }
  }

  return (
    <div className="space-y-4">
      {/* Dentition Type Selector */}
      <div className="bg-gray-50 p-3 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dentition Type
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onDentitionChange?.('permanent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              dentitionType === 'permanent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Permanent (Adult)
          </button>
          <button
            type="button"
            onClick={() => onDentitionChange?.('primary')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              dentitionType === 'primary'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Primary (Baby)
          </button>
          <button
            type="button"
            onClick={() => onDentitionChange?.('mixed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              dentitionType === 'mixed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Mixed (Both)
          </button>
        </div>
      </div>

      {/* Tooth Chart Grid */}
      <div className="bg-white border rounded-lg p-4">
        {/* Upper Arch */}
        <div className="text-center mb-2">
          <span className="text-sm font-semibold text-gray-500">UPPER ARCH</span>
        </div>
        <div className="flex justify-center flex-wrap gap-1 mb-6">
          {teeth.filter(t => t.quadrant === 'UR' || t.quadrant === 'UL').sort((a, b) => {
            if (a.quadrant === 'UR') return a.number - b.number
            return b.number - a.number
          }).map(tooth => (
            <ToothButton
              key={`${tooth.type}-${tooth.number}`}
              tooth={tooth}
              isSelected={selectedTooth === tooth.number}
              onClick={() => handleToothClick(tooth)}
            />
          ))}
        </div>

        {/* Lower Arch */}
        <div className="text-center mb-2">
          <span className="text-sm font-semibold text-gray-500">LOWER ARCH</span>
        </div>
        <div className="flex justify-center flex-wrap gap-1">
          {teeth.filter(t => t.quadrant === 'LL' || t.quadrant === 'LR').sort((a, b) => {
            if (a.quadrant === 'LL') return b.number - a.number
            return a.number - b.number
          }).map(tooth => (
            <ToothButton
              key={`${tooth.type}-${tooth.number}`}
              tooth={tooth}
              isSelected={selectedTooth === tooth.number}
              onClick={() => handleToothClick(tooth)}
            />
          ))}
        </div>
      </div>

      {/* Selected Tooth Details */}
      {selectedTooth && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-semibold text-blue-800 mb-2">
            Selected Tooth: #{selectedTooth}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Surface
              </label>
              <select
                className="w-full border rounded-lg p-2 text-sm"
                value={selectedSurface}
                onChange={(e) => setSelectedSurface(e.target.value)}
              >
                <option value="">Select Surface</option>
                {surfaceOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label} ({s.value})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition
              </label>
              <select
                className="w-full border rounded-lg p-2 text-sm"
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
              >
                <option value="">Select Condition</option>
              <option value="Healthy">Healthy</option>
                <option value="Caries">Caries (Decay)</option>
                <option value="Filled">Existing Filling</option>
                <option value="Crown">Crown</option>
                <option value="Bridge">Bridge</option>
                <option value="Missing">Missing</option>
                <option value="Root Canal">Root Canal Treated</option>
                <option value="Impacted">Impacted</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ToothButton({ tooth, isSelected, onClick }: { tooth: Tooth; isSelected: boolean; onClick: () => void }) {
  const getColor = () => {
    if (isSelected) return 'bg-blue-600 text-white border-blue-700'
    if (tooth.type === 'primary') return 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100'
    return 'bg-white border-gray-300 hover:bg-gray-50'
  }

  const getLabel = () => {
    if (tooth.type === 'primary') {
      // Convert primary tooth number to letter (A-T)
      const letters: { [key: number]: string } = {
        55: 'E', 54: 'D', 53: 'C', 52: 'B', 51: 'A',
        61: 'A', 62: 'B', 63: 'C', 64: 'D', 65: 'E',
        75: 'E', 74: 'D', 73: 'C', 72: 'B', 71: 'A',
        81: 'A', 82: 'B', 83: 'C', 84: 'D', 85: 'E'
      }
      return letters[tooth.number] || tooth.number.toString()
    }
    return tooth.number.toString()
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-12 h-12 rounded-lg border-2 font-semibold text-sm transition-all duration-200 ${getColor()}`}
      title={`Tooth ${tooth.number} - ${tooth.name} (${tooth.type === 'primary' ? 'Baby' : 'Adult'})`}
    >
      {getLabel()}
    </button>
  )
}