import React from 'react'

export default function Results({items}:{items:Array<any>}){
  return (
    <div className="card">
      <h3>Estimates</h3>
      <div className="results-list">
        {items.map((it,i)=> (
          <div key={i} className="result-card">
            <div>
              <div><strong>{it.name || it.codec}</strong></div>
              <div className="muted">size: {(it.sizeEstimate/1024/1024).toFixed(2)} MB · predicted VMAF: {it.vmaf}</div>
            </div>
            <div>
              <button className="btn" disabled title="Sample only">Real encode</button>
            </div>
          </div>
        ))}
        {items.length===0 && <div className="muted">No estimates yet</div>}
      </div>
    </div>
  )
}
