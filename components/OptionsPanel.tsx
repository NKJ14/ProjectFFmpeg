import React from 'react'

export const CODECS = ['libx264','libx265','libvpx-vp9','libaom-av1'] as const

type Props = {
  codec: string
  onCodec: (c:string)=>void
  selected: string[]
  onToggle: (c:string)=>void
}

export default function OptionsPanel({codec,onCodec, selected, onToggle}:Props){
  return (
    <div className="card options">
      <h3>Encode Options</h3>
      <div className="muted">Pick codecs to compare</div>
      <div className="codec-list" style={{marginTop:8}}>
        {CODECS.map(c=> (
          <label key={c} style={{display:'inline-flex',alignItems:'center',gap:8}}>
            <input type="checkbox" checked={selected.includes(c)} onChange={()=>onToggle(c)} />
            <span className={`codec ${codec===c? 'active':''}`}>{c}</span>
          </label>
        ))}
      </div>
      <div style={{marginTop:8}}>
        <label className="muted">Preview codec (UI only)</label>
        <div className="row" style={{marginTop:6}}>
          {CODECS.map(c=> (
            <button key={c} className={`codec ${codec===c? 'active':''}`} onClick={()=>onCodec(c)}>{c}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
