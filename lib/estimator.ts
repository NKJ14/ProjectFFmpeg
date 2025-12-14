import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
let ffprobePath: string | undefined
try{
  // optional: try to use ffprobe-static if available
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fp = require('ffprobe-static')
  ffprobePath = fp && fp.path
}catch(e){ ffprobePath = undefined }
import os from 'os'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import sharp from 'sharp'

ffmpeg.setFfmpegPath(ffmpegPath || undefined)
if(ffprobePath) ffmpeg.setFfprobePath(ffprobePath)

async function ffprobe(file:string):Promise<any>{
  return new Promise((resolve, reject)=>{
    ffmpeg.ffprobe(file, (err,data)=> err ? reject(err) : resolve(data))
  })
}

async function sampleFrames(file:string, count=8){
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'ffcmp-'))
  const outPattern = path.join(tmp,'frame-%03d.png')
  // use -vf fps=... or select based on duration
  await new Promise((resolve, reject)=>{
    ffmpeg(file)
      .outputOptions(['-vsync 0','-qscale:v 2','-frames:v '+(count)])
      .output(outPattern)
      .on('end', ()=> resolve(null))
      .on('error', (e)=> reject(e))
      .run()
  })
  const files = fs.readdirSync(tmp).filter(f=>f.endsWith('.png')).map(f=>path.join(tmp,f)).sort()
  return { tmp, files }
}

async function frameHash(imgPath:string){
  const img = sharp(imgPath).resize(64,64).greyscale().raw()
  const { data, info } = await img.toBuffer({ resolveWithObject: true })
  // compute a quick hash over raw pixels
  const h = crypto.createHash('sha256').update(data).digest('hex')
  // compute simple variance as complexity measure
  let sum=0, sum2=0
  for(let i=0;i<data.length;i++){ const v = data[i]; sum+=v; sum2+=v*v }
  const mean = sum/data.length
  const variance = sum2/data.length - mean*mean
  return { hash:h, variance }
}

export async function analyze(filePath:string){
  const stats = fs.statSync(filePath)
  const probe = await ffprobe(filePath).catch(()=>null)
  const duration = probe?.format?.duration ? Number(probe.format.duration) : 0
  const sizeBytes = stats.size
  // sample frames
  let tmpDir = null
  let files:string[] = []
  try{
    const s = await sampleFrames(filePath, 8)
    tmpDir = s.tmp
    files = s.files
  }catch(e){
    // graceful: no frames
  }

  const frameResults:any[] = []
  for(const f of files){
    try{ const r = await frameHash(f); frameResults.push(r) }catch(e){ }
  }

  const fingerprint = crypto.createHash('sha256').update(frameResults.map(r=>r.hash).join('|')).digest('hex')
  const meanVariance = frameResults.length ? frameResults.reduce((s,r)=>s+r.variance,0)/frameResults.length : 0
  // motion: mean absolute diff between consecutive frames (approx using variance diffs)
  let motion = 0
  for(let i=1;i<frameResults.length;i++){ motion += Math.abs(frameResults[i].variance - frameResults[i-1].variance) }
  motion = frameResults.length>1 ? motion/(frameResults.length-1) : 0

  // simple complexity metric normalized
  const complexity = Math.tanh((meanVariance*0.005) + (motion*0.01))

  if(tmpDir){
    try{ fs.rmSync(tmpDir, { recursive:true, force:true }) }catch(e){ }
  }

  return {
    sizeBytes,
    duration,
    fingerprint,
    complexity,
    meta: probe?.format || null
  }
}

export function predictVariant(original:{sizeBytes:number,complexity:number}, opts:{codec:string,crf:number,scale?:number}){
  const { sizeBytes, complexity } = original
  const scale = opts.scale ?? 1
  // heuristics (deterministic)
  const bitrateFactor = Math.max(0.25, Math.min(1.5, (28 - opts.crf)/28))
  const codecFactor = opts.codec.includes('av1') ? 0.7 : opts.codec.includes('x265') ? 0.8 : opts.codec.includes('vp9') ? 0.75 : 1
  const sizeEstimate = Math.round(sizeBytes * bitrateFactor * codecFactor * scale)
  const vmaf = Math.round(100 - (complexity*40) / (Math.log2(1 + (28-opts.crf) + 1)))
  return { sizeEstimate, vmaf }
}
