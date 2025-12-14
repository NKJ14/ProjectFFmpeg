import React, { useState } from 'react'
import Upload from '../components/Upload'
import OptionsPanel, { CODECS } from '../components/OptionsPanel'
import Results from '../components/Results'
import Message from '../components/Message'

export default function Home(){
  const [file,setFile] = useState<File | null>(null)
  const [codec,setCodec] = useState(CODECS[0])
  const [selected, setSelected] = useState<string[]>([...CODECS])
  const [results,setResults] = useState<any[]>([])
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState<string | null>(null)
  const [info,setInfo] = useState<any | null>(null)

  async function handleUpload(f:File){
    setFile(f); setError(null); setLoading(true); setResults([]); setInfo(null)
    try{
      const fd = new FormData()
      fd.append('file', f)
      fd.append('codec', codec)
      fd.append('crf', '28')
      fd.append('variants', JSON.stringify(selected))
      const res = await fetch('/api/analyze', { method:'POST', body: fd })
      const data = await res.json()
      if(!res.ok){ throw new Error(data?.error || 'Analyze failed') }
      setInfo(data)
      setResults(data.variants || [])
    }catch(e:any){
      setError(e.message || 'Unknown error')
    }finally{ setLoading(false) }
  }

  return (
    <div className="container">
      <h1>FFmpeg Comparator (prototype)</h1>
      {error && <Message type="error">{error}</Message>}
      <div className="grid">
        <div>
          <Upload onUpload={handleUpload} />
          <div className="card">
            <h3>Preview</h3>
            {file ? <video controls src={URL.createObjectURL(file)} style={{width:'100%',borderRadius:6}} /> : <div className="muted">No file</div>}
            {loading && <div style={{marginTop:8}} className="muted"><span className="spinner" style={{marginRight:8}}></span>Analyzing... this usually takes a few seconds</div>}
            {error && <div style={{marginTop:8,color:'#ffb4b4'}}>{error}</div>}
            {info && (
              <div style={{marginTop:10}} className="muted">
                <div>Size: {(info.sizeBytes/1024/1024).toFixed(2)} MB</div>
                <div>Duration: {info.duration ? info.duration.toFixed(2)+'s' : 'unknown'}</div>
                <div>Fingerprint: {info.fingerprint?.slice(0,12)}...</div>
              </div>
            )}
          </div>
        </div>
        <div>
          <OptionsPanel codec={codec} onCodec={setCodec} selected={selected} onToggle={(c)=>{
            setSelected(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev,c])
          }} />
          <Results items={results} />
        </div>
      </div>
    </div>
  )
}
