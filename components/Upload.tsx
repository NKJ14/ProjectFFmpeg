import React, { useRef, useState, useCallback } from 'react'

type Props = { onUpload: (f: File) => void }

export default function Upload({ onUpload }: Props) {
  const ref = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback((file: File) => {
    setError(null)
    if (!file) return false
    if (file.type !== 'video/mp4') { setError('Only MP4 files are allowed'); return false }
    if (file.size > 200 * 1024 * 1024) { setError('File too large (max 200MB)'); return false }
    return true
  }, [])

  function onChange(e: React.ChangeEvent<HTMLInputElement>){
    const f = e.target.files && e.target.files[0]
    if(!f) return
    if(validate(f)) onUpload(f)
  }

  function onDrop(e: React.DragEvent){
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0]
    if(!f) return
    if(validate(f)) onUpload(f)
  }

  return (
    <div className="card">
      <h3>Upload source video</h3>
      <p className="muted">Only MP4 accepted. Max 200MB.</p>
      <div onDrop={onDrop} onDragOver={(e)=>e.preventDefault()} style={{marginTop:12, border:'2px dashed rgba(255,255,255,0.04)', padding:12, borderRadius:8}}>
        <input
          ref={ref}
          type="file"
          accept="video/mp4"
          onChange={onChange}
        />
        {error && <div style={{color:'#ffb4b4',marginTop:8}}>{error}</div>}
      </div>
    </div>
  )
}
