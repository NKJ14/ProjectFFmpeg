export type FrameMetrics = {
  meanLuma: number
  lumaVariance: number
  edgeEnergy: number
  colorEntropy: number
  width: number
  height: number
}

function toGray(data: Uint8ClampedArray){
  const out = new Uint8ClampedArray(data.length/4)
  for(let i=0;i<data.length;i+=4){
    // Rec. 601 luma
    out[i/4] = Math.round(0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2])
  }
  return out
}

function entropy(hist: number[]){
  const total = hist.reduce((s,v)=>s+v,0)
  let e = 0
  for(const v of hist){ if(v===0) continue; const p = v/total; e -= p * Math.log2(p) }
  return e
}

export async function extractFrames(file: File, count = 4, maxSize = 640){
  return new Promise<HTMLImageElement[]>(async (resolve, reject)=>{
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = url
    video.muted = true
    video.playsInline = true
    let settled = false
    const timeout = setTimeout(()=>{ if(!settled){ settled=true; URL.revokeObjectURL(url); reject(new Error('Timed out loading video')) } }, 8000)
    video.addEventListener('error', ()=>{ if(settled) return; settled=true; clearTimeout(timeout); URL.revokeObjectURL(url); reject(new Error('Video failed to load; file may be corrupted')) })
    video.addEventListener('loadedmetadata', ()=>{
      const duration = isFinite(video.duration) ? video.duration : 0
      const times: number[] = []
      for(let i=0;i<count;i++){ times.push(Math.min(duration, Math.max(0, (i+0.5)/count * duration || 0))) }

      const canvas = document.createElement('canvas')
      const scale = Math.min(1, maxSize / Math.max(1, video.videoWidth))
      canvas.width = Math.max(1, Math.floor(video.videoWidth * scale))
      canvas.height = Math.max(1, Math.floor(video.videoHeight * scale))
      const ctx = canvas.getContext('2d')!

      const images: HTMLImageElement[] = []
      let idx = 0
      const captureNext = ()=>{
        if(idx>=times.length){ settled=true; clearTimeout(timeout); URL.revokeObjectURL(url); resolve(images); return }
        video.currentTime = times[idx]
      }
      video.addEventListener('seeked', ()=>{
        try{
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const img = new Image()
          img.src = canvas.toDataURL('image/png')
          images.push(img)
          idx++
          captureNext()
        }catch(e){ settled=true; clearTimeout(timeout); URL.revokeObjectURL(url); reject(e) }
      })
      // start
      captureNext()
    })
  })
}

export function analyzeImage(img: HTMLImageElement): FrameMetrics{
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img,0,0)
  const { data } = ctx.getImageData(0,0,canvas.width,canvas.height)
  const gray = toGray(data)
  let sum=0, sum2=0
  const hist = new Array(256).fill(0)
  for(let i=0;i<gray.length;i++){ const v = gray[i]; sum+=v; sum2+=v*v; hist[v]++ }
  const mean = sum/gray.length
  const variance = sum2/gray.length - mean*mean

  // simple sobel-ish edge energy
  let edge = 0
  for(let y=1;y<canvas.height-1;y++){
    for(let x=1;x<canvas.width-1;x++){
      const i = y*canvas.width + x
      const gx = -gray[i-canvas.width-1] -2*gray[i-1] - gray[i+canvas.width-1] + gray[i-canvas.width+1] + 2*gray[i+1] + gray[i+canvas.width+1]
      const gy = -gray[i-canvas.width-1] -2*gray[i-canvas.width] - gray[i-canvas.width+1] + gray[i+canvas.width-1] + 2*gray[i+canvas.width] + gray[i+canvas.width+1]
      edge += Math.sqrt(gx*gx + gy*gy)
    }
  }
  const avgEdge = edge / ( (canvas.width-2) * (canvas.height-2) )
  return { meanLuma: mean, lumaVariance: variance, edgeEnergy: avgEdge, colorEntropy: entropy(hist), width: canvas.width, height: canvas.height }
}
