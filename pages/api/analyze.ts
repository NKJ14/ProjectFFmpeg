import type { NextApiRequest, NextApiResponse } from 'next'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import { analyze, predictVariant } from '../../lib/estimator'
import { createJob } from '../../lib/jobs'

// If a deploy has SIMULATE_LOAD enabled in production, warn in logs so it's obvious
if(process.env.SIMULATE_LOAD && process.env.NODE_ENV === 'production'){
  console.warn('SIMULATE_LOAD is enabled in production. On serverless platforms this may cause function timeouts and HTML error responses.')
}
// In development, default to running simulation when SIMULATE_LOAD isn't explicitly set
if(process.env.SIMULATE_LOAD === undefined && process.env.NODE_ENV === 'development'){
  console.info('SIMULATE_LOAD not set: simulation will run by default in development. Set SIMULATE_LOAD=false to disable locally.')
}

// Use memory storage to be safer on serverless deployments; we'll write a temp file for ffmpeg
const uploadDir = path.join(os.tmpdir(), 'ffcmp-uploads')
if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
const storage = multer.memoryStorage()
// accept only mp4 and limit size to 200MB
function fileFilter (req:any, file:any, cb:any) {
  const allowed = ['video/mp4']
  const ext = path.extname(file.originalname).toLowerCase()
  if (!allowed.includes(file.mimetype) || ext !== '.mp4') {
    return cb(new Error('Only MP4 files are allowed'))
  }
  cb(null, true)
}
const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } })

function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: any) {
  return new Promise((resolve, reject)=>{
    fn(req, res, (err: any)=>{
      if(err) reject(err); else resolve(undefined)
    })
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try{
    await runMiddleware(req, res, upload.single('file'))
  }catch(err:any){
    const msg = String(err.message || err)
    if(msg.includes('Only MP4') || msg.includes('File too large')) return res.status(400).json({ error: msg })
    return res.status(500).json({ error: msg })
  }

  const anyReq = req as any
  if(!anyReq.file) return res.status(400).json({error:'missing file'})
  // write uploaded buffer to a temp file for ffmpeg processing
  const tempDir = fs.mkdtempSync(path.join(uploadDir, 'u-'))
  const filePath = path.join(tempDir, uuidv4() + path.extname(anyReq.file.originalname || '.mp4'))
  try{ fs.writeFileSync(filePath, anyReq.file.buffer) }catch(e:any){ console.error('failed to write uploaded file', e); return res.status(500).json({ error: 'Failed to process upload' }) }
  try{
    // Simulate server load/delay only when explicitly enabled via SIMULATE_LOAD
    // (do NOT turn on by default in production; enabling it on serverless platforms
    // can cause platform timeouts and HTML error pages to be returned)
    const simulateEnv = process.env.SIMULATE_LOAD
    // Default to simulation in development when SIMULATE_LOAD is not set, otherwise
    // respect explicit truthy/falsey values. This lets `npm run dev` show delays/errors
    // for local demos while keeping production safe unless explicitly enabled.
    const simulate = simulateEnv === undefined ? (process.env.NODE_ENV === 'development') : (String(simulateEnv).toLowerCase() === '1' || String(simulateEnv).toLowerCase() === 'true')
    if(simulate){
      // use file size to scale delay and failure chance
      const stats = fs.statSync(filePath)
      const sizeMB = Math.max(0.001, stats.size / (1024*1024))
      // map size 0..20MB -> delay 10..20s (simulates realistic server load locally)
      const baseDelay = 10000 + Math.round(Math.min(sizeMB,20)/20 * 10000)
      // jitter +/- 2s
      const jitter = Math.round((Math.random()*4000)-2000)
      const delay = Math.max(5000, baseDelay + jitter)
      // failure chance grows with size (small files rarely fail)
      const maybeFail = Math.random() < Math.min(0.5, 0.05 + (Math.min(sizeMB,20)/20)*0.45)
      // expose the delay in a debug header so it's easier to diagnose in production
      res.setHeader('X-Simulated-Delay', String(delay))
      await new Promise((r)=>setTimeout(r, delay))
      if(maybeFail){ console.warn('simulate load: returning 503 (sizeMB=%s, delay=%s)', sizeMB, delay) ; return res.status(503).json({ error: 'Server busy: limit exceeded, please wait for server load to normalize' }) }
    }
    const info = await analyze(filePath)
    // deterministic predictions for a few variants (no encoding)
    // If client passed a variants list, use it; otherwise use defaults
    const requested = anyReq.body && anyReq.body.variants ? JSON.parse(anyReq.body.variants) : null
    const canonical = requested && Array.isArray(requested) && requested.length>0 ? requested : ['libx264','libx265','libaom-av1']
    const defaultCrf:any = { 'libx264':23, 'libx265':28, 'libvpx-vp9':32, 'libaom-av1':30 }
    const variants = canonical.map((c:string)=>{
      const crf = defaultCrf[c] || 28
      return { codec: c, crf, ...predictVariant({sizeBytes:info.sizeBytes, complexity:info.complexity}, {codec:c,crf}) }
    })
      const ALL_CODECS = ['libx264','libx265','libvpx-vp9','libaom-av1']


    // Start a background simulated encoding job (for local/demo runs) and return a jobId
    const jobId = createJob(canonical, { sizeBytes: info.sizeBytes, complexity: info.complexity })
    // Return 202 Accepted with a jobId so the client can poll for progress
      // also include deterministic predictions for all common codecs so the UI
      // can show comparisons for any selected codec without re-uploading
      const allVariants = ALL_CODECS.map((c:string)=>{
        const crf = defaultCrf[c] || 28
        return { codec: c, crf, ...predictVariant({sizeBytes:info.sizeBytes, complexity:info.complexity}, {codec:c,crf}) }
      })
      res.status(200).json({ ...info, variants, allVariants })
  }catch(e:any){
    console.error('analyze handler error', e)
    res.status(500).json({ error: String(e) })
  } finally{
    // cleanup uploaded file - we only need it for analysis
    try{ fs.rmSync(tempDir, { recursive:true, force:true }) }catch(e){ }
  }
}

export const config = {
  api: { bodyParser: false }
}

