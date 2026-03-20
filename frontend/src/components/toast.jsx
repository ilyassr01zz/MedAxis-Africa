import { useState } from 'react'

export function useToast() {
  const [visible, setVisible] = useState(false)
  const showToast = () => {
    setVisible(true)
    setTimeout(() => setVisible(false), 2000)
  }
  return { visible, showToast }
}

export default function Toast({ visible, message = 'This feature will be available in the full release' }) {
  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      backgroundColor: '#1A1A2E', color: '#FFFFFF',
      borderRadius: 8, padding: '12px 20px',
      fontSize: 13, fontWeight: 500,
      fontFamily: "'Space Grotesk', sans-serif",
      zIndex: 9999, whiteSpace: 'nowrap',
      pointerEvents: 'none',
    }}>
      {message}
    </div>
  )
}
