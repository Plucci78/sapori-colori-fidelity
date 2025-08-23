import React from 'react'

const SumUpIcons = {
  // Tipi di carta
  Visa: ({ size = 24, color = '#1a73e8' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke={color} strokeWidth="2" fill="none"/>
      <path d="M7 10h2l1 4h1l1-4h2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  Mastercard: ({ size = 24, color = '#ff5f00' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke={color} strokeWidth="2" fill="none"/>
      <circle cx="10" cy="12" r="2" stroke={color} strokeWidth="1.5" fill="none"/>
      <circle cx="14" cy="12" r="2" stroke={color} strokeWidth="1.5" fill="none"/>
    </svg>
  ),

  Maestro: ({ size = 24, color = '#0099df' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke={color} strokeWidth="2" fill="none"/>
      <path d="M8 10v4m2-2h4m2-2v4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),

  AmericanExpress: ({ size = 24, color = '#2e77bb' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke={color} strokeWidth="2" fill="none"/>
      <path d="M7 10h2m2 0h2m-4 2h4m-4 2h2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),

  // Modalità di pagamento
  Contactless: ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 8c2.5-2.5 6.5-2.5 9 0" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M10 12c1-1 3-1 4 0" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 16c.5-.5 1.5-.5 2 0" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  Chip: ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="9" y="9" width="6" height="6" rx="1" stroke={color} strokeWidth="2" fill="none"/>
      <path d="M12 9V7m0 10v-2m3-3h2m-10 0H5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  Swipe: ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="8" width="16" height="8" rx="2" stroke={color} strokeWidth="2" fill="none"/>
      <path d="M6 12h12" stroke={color} strokeWidth="2"/>
      <path d="M18 6L20 8l-2 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  Manual: ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="6" y="6" width="12" height="12" rx="2" stroke={color} strokeWidth="2" fill="none"/>
      <path d="M9 9h1m2 0h1m-4 3h1m2 0h1m-4 3h3" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  // Statistiche
  Money: ({ size = 32, color = '#28a745' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none"/>
      <path d="M15 9.5c0-.83-.67-1.5-1.5-1.5h-3C9.67 8 9 8.67 9 9.5s.67 1.5 1.5 1.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3c-.83 0-1.5-.67-1.5-1.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 6v2m0 8v2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  TrendingUp: ({ size = 32, color = '#2196f3' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 17l6-6 4 4 8-8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 7h4v4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  Receipt: ({ size = 32, color = '#ff9800' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2V4a2 2 0 00-2-2z" stroke={color} strokeWidth="2" fill="none"/>
      <path d="M8 8h8m-8 4h8m-8 4h4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),

  CreditCard: ({ size = 32, color = '#9c27b0' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke={color} strokeWidth="2" fill="none"/>
      <path d="M3 10h18" stroke={color} strokeWidth="2"/>
      <path d="M7 14h4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  // Azioni
  Print: ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 9V2h12v7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="6" y="14" width="12" height="8" rx="1" stroke={color} strokeWidth="2" fill="none"/>
    </svg>
  ),

  Filter: ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18l-7 7v6l-4-2v-4L3 6z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  Calendar: ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke={color} strokeWidth="2" fill="none"/>
      <path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  Euro: ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M18.5 8a7.5 7.5 0 00-13 0" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M18.5 16a7.5 7.5 0 01-13 0" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 10h6M3 14h6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  Refresh: ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M21 2v6h-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 12a9 9 0 0115-6.7L21 8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 22v-6h6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 12a9 9 0 01-15 6.7L3 16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  // Stati
  Success: ({ size = 16, color = '#28a745' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none"/>
      <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  Clock: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none"/>
      <path d="M12 7v5l3 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  Close: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  Error: ({ size = 16, color = '#dc3545' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none"/>
      <path d="M15 9l-6 6M9 9l6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  Empty: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke={color} strokeWidth="2" fill="none"/>
      <path d="M3 12h18" stroke={color} strokeWidth="2"/>
      <circle cx="12" cy="12" r="1" fill={color}/>
    </svg>
  ),

  Chart: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 3v18h18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 16l4-4 4 4 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default SumUpIcons