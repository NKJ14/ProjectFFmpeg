import React from 'react'

export default function Message({type = 'info', children}:{type?: 'info'|'error'|'success', children: React.ReactNode}){
  const bg = type === 'error' ? '#3b0b0b' : type === 'success' ? '#052e2e' : 'transparent'
  const color = type === 'error' ? '#ffb4b4' : type === 'success' ? '#9ff6f8' : 'var(--muted)'
  return (
    <div style={{padding:8,borderRadius:6,background:bg,color,marginBottom:12}}>{children}</div>
  )
}
