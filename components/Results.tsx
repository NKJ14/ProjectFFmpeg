import React from 'react'

const CODEC_NAMES: Record<string,string> = { libx264: 'H.264 (x264)', libx265: 'H.265 (x265)', 'libvpx-vp9':'VP9', 'libaom-av1':'AV1' }
export default function Results({items}:{items:Array<any>}){
  return (
    <div className="card">
      <h3>Predicted Variants</h3>
      <div className="results-list">
        {items.map((it,i)=> (
          <div key={i} className="result-card">
            <div>
              <div><strong>{it.name || CODEC_NAMES[it.codec] || it.codec}</strong></div>
              <div className="muted">size: {(it.sizeEstimate/1024/1024).toFixed(2)} MB · VMAF: {it.vmaf} · PSNR: {it.psnr} · SSIM: {it.ssim}</div>
              <div className="small muted">Recommend: {it.recommendation}</div>
            </div>
          </div>
        ))}
        {items.length===0 && <div className="muted">No estimates yet</div>}
      </div>
    </div>
  )
}
