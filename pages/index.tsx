import React, { useState } from 'react'
import Upload from '../components/Upload'
import OptionsPanel, { CODECS } from '../components/OptionsPanel'
import Results from '../components/Results'
import Message from '../components/Message'
import { extractFrames, analyzeImage, FrameMetrics } from '../lib/frameUtils'

export default function Home(){
  const [file,setFile] = useState<File | null>(null)
  const [codec,setCodec] = useState(CODECS[0])
  const [selected, setSelected] = useState<string[]>([...CODECS])
  const [results,setResults] = useState<any[]>([])
  const [loading,setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const [error,setError] = useState<string | null>(null)
  const [info,setInfo] = useState<any | null>(null)
  const [frames, setFrames] = useState<HTMLImageElement[]>([])
  const [frameMetrics, setFrameMetrics] = useState<FrameMetrics[]>([])

  async function handleUpload(f:File){
    setFile(f); setError(null); setLoading(true); setResults([]); setInfo(null)
    try{
      // quick client-side sanity check: ensure frames can be extracted (reject corrupted/unsupported files early)
      try{
        const imgs = await extractFrames(f, 4)
        setFrames(imgs)
        setFrameMetrics(imgs.map(img=>analyzeImage(img)))
      }catch(err:any){
        setError('Unable to extract frames - video may be corrupted or unsupported. Upload denied.')
        setLoading(false)
        return
      }
      const fd = new FormData()
      fd.append('file', f)
      fd.append('codec', codec)
      fd.append('crf', '28')
      fd.append('variants', JSON.stringify(selected))
      setProgress(1)
      const progressTimer = setInterval(()=>{
        setProgress(p=>Math.min(95, p + Math.random()*8))
      }, 600)
      const res = await fetch('/api/analyze', { method:'POST', body: fd })
      clearInterval(progressTimer)
      setProgress(98)
      // defensively handle non-JSON responses (HTML error pages from dev server can appear)
      const ct = res.headers.get('content-type') || ''
      let data: any = null
      if (ct.includes('application/json')) {
        data = await res.json()
      } else {
        const text = await res.text()
        // server returned HTML (likely an error page) or plain text
        const snippet = text && text.length > 0 ? text.slice(0, 800) : '<empty response>'
        throw new Error(`Server returned non-JSON response (status ${res.status}): ${snippet}`)
      }
      if(!res.ok){ throw new Error(data?.error || 'Analyze failed') }
      setInfo(data)
      setResults(data.variants || [])
      // finish progress
      setProgress(100)
      setTimeout(()=>{ setProgress(0) }, 800)
    }catch(e:any){
      // Friendly messages for common cases
      const msg = e?.message || String(e)
      if(msg.includes('Server returned non-JSON')){
        setError('Server error: received unexpected HTML response. Check the dev server logs or try restarting (`npm run dev`).')
      } else if(msg.includes('Failed to fetch') || msg.includes('Could not connect')){
        setError('Unable to reach server. Is `npm run dev` running?')
      } else {
        setError(msg)
      }
      console.error('analyze error:', e)
    }finally{ setLoading(false) }
  }
  const CODEC_NAMES: Record<string,string> = { libx264: 'H.264 (x264)', libx265: 'H.265 (x265)', 'libvpx-vp9':'VP9', 'libaom-av1':'AV1' }

  return (
    <div className="container">
            {process.env.NEXT_PUBLIC_SIMULATE_LOAD === 'true' && (
              <div style={{marginTop:6,color:'#f6c35a',fontWeight:600}}>Demo mode: simulated server load enabled</div>
            )}
      <div className="hero">
        <div>
          <h1>FFmpeg Encoder Comparator</h1>

        </div>
        <div>
          <button className="btn">Showcase</button>
        </div>
      </div>
      {error && <Message type="error">{error}</Message>}
      <div className="grid">
        <div>
          <Upload onUpload={handleUpload} />
          <div className="card preview-card">
            <h3>Preview</h3>
            {file ? <video controls className="video-preview" src={URL.createObjectURL(file)} /> : <div className="muted">No file</div>}
            {loading && <div style={{marginTop:8}} className="muted"><span className="spinner" style={{marginRight:8}}></span>Analyzing... this usually takes a few seconds</div>}
            {progress>0 && (
              <div>
                <div style={{marginTop:8}} className="muted">Please wait — analyzing your upload. This may take a moment depending on server load.</div>
                <div className="progress-wrap" style={{marginTop:8}}>
                  <div className="progress-bar" style={{width:Math.min(100, progress) + '%'}} />
                </div>
              </div>
            )}
            {info && (
              <div style={{marginTop:10}} className="muted">
                <div>Size: {(info.sizeBytes/1024/1024).toFixed(2)} MB</div>
                <div>Fingerprint: {info.fingerprint?.slice(0,12)}...</div>
              </div>
            )}
          </div>
          {/* Frames comparison */}
          <div className="card" style={{marginTop:12}}>
            <h3>Frames & codec preview</h3>
            {frames.length===0 && <div className="muted">No frames available</div>}
            {frames.length>0 && (
              <div>
                <div className="frames-grid">
                        {frames.map((img,idx)=>{
                    const variant = results[idx] || results[idx % Math.max(1,results.length)] || { codec: CODECS[idx] }
                    return (
                      <div key={idx} className="frame-card">
                        <div className="codec-heading">{CODEC_NAMES[variant.codec] || variant.codec}</div>
                        <img src={img.src} style={{width:'100%',borderRadius:6}} />
                        <div className="feature-list">
                          <div>Resolution: {frameMetrics[idx]?.width}x{frameMetrics[idx]?.height}</div>
                          <div>Mean Luma: {frameMetrics[idx]?.meanLuma.toFixed(1)}</div>
                          <div>Luma Var: {frameMetrics[idx]?.lumaVariance.toFixed(1)}</div>
                          <div>Edge Energy: {frameMetrics[idx]?.edgeEnergy.toFixed(2)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="chart-table" style={{marginTop:12}}>
                  {results && results.length>0 ? (
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead>
                        <tr>
                          <th style={{textAlign:'left'}}>Metric</th>
                          {results.map((r:any, i:number)=>(<th key={i} style={{textAlign:'center'}}>{r.codec}</th>))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {k:'bitrate', label:'Bitrate'},
                          {k:'psnr', label:'PSNR'},
                          {k:'ssim', label:'SSIM'},
                          {k:'vmaf', label:'VMAF'},
                          {k:'playbackPerf', label:'Playback Performance'},
                          {k:'hdr', label:'HDR Available'},
                          {k:'colorfulness', label:'Colorfulness'},
                          {k:'motion', label:'Motion'},
                          {k:'chromaVariance', label:'Chroma Variance'},
                          {k:'sharpness', label:'Sharpness'},
                          {k:'entropy', label:'Entropy'},
                          {k:'recommendation', label:'Best Use Case'},
                        ].map((m:any)=>(
                          <tr key={m.k}>
                            <td style={{padding:'6px 8px',color:'var(--muted)'}}>{m.label}</td>
                            {results.map((r:any, i:number)=>{
                              let val: any = r[m.k] ?? r[m.k==='bitrate' ? 'bitrateEstimate' : m.k]
                              if(m.k==='bitrate'){
                                // show kbps if possible
                                if(info && info.duration && info.duration>0){ val = Math.round((r.bitrateEstimate / info.duration) / 1000) + ' kbps' }
                                else { val = Math.round(r.bitrateEstimate/1000) + ' kbps' }
                              }
                              if(m.k==='hdr') val = r.hdr ? 'Yes' : 'No'
                              if(m.k==='recommendation') val = r.recommendation
                              return (<td key={i} style={{textAlign:'center',padding:'6px 8px'}}>{String(val)}</td>)
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <div className="muted">No variants to compare</div>}
                </div>
                <div className="card" style={{marginTop:12}}>
                  <h3>Metric definitions</h3>
                  <div className="muted" style={{marginTop:8, lineHeight:1.5}}>
                    <div><strong>Bitrate:</strong> Approximate target bits per second after encoding (higher = larger file size, often higher quality).</div>
                    <div><strong>PSNR:</strong> Peak Signal-to-Noise Ratio — a simple numeric approximation of reconstruction fidelity (higher better).</div>
                    <div><strong>SSIM:</strong> Structural Similarity Index — perceptual similarity score (higher better).</div>
                    <div><strong>VMAF:</strong> Video Multi-method Assessment Fusion — a learned perceptual quality score (higher better).</div>
                    <div><strong>Playback Performance:</strong> Estimated smoothness and CPU/GPU decode requirements (higher = easier playback).</div>
                    <div><strong>HDR available:</strong> Whether the source appears to contain HDR metadata/content.</div>
                    <div><strong>Recommendation:</strong> Suggested common uses (e.g., YouTube uploads, live streaming, archival).</div>
                    <hr style={{margin:'10px 0',borderColor:'rgba(255,255,255,0.03)'}} />
                    <div><strong>Mean Luma:</strong> Average brightness (luminance) of a frame; useful for exposure analysis.</div>
                    <div><strong>Luma Var:</strong> Variance of luma values; higher indicates more contrast or texture.</div>
                    <div><strong>Edge Energy:</strong> Amount of high-frequency content (edges) — proxy for detail and sharpness.</div>
                    <div><strong>Colorfulness:</strong> Numeric proxy representing chroma intensity and saturation; higher = more colorful scenes.</div>
                    <div><strong>Motion:</strong> Estimated temporal complexity; higher = more motion between frames.</div>
                    <div><strong>Chroma Variance:</strong> Variation in color channels; can indicate color noise or rich color detail.</div>
                    <div><strong>Sharpness:</strong> Proxy for visual sharpness; higher generally correlates with more high-frequency detail.</div>
                    <div><strong>Entropy:</strong> Information entropy across frame luminance; higher = more visual information/complexity.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div>
          <OptionsPanel codec={codec} onCodec={(c:string)=>setCodec(c as any)} selected={selected} onToggle={(c)=>{
            setSelected(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev,c])
          }} />
          <Results items={results} />
        </div>
      </div>
    </div>
  )
}
