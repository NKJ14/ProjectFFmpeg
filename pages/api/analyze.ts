import type { NextApiRequest, NextApiResponse } from 'next'
import multer from 'multer'
import nextConnect from 'next-connect'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { analyze, predictVariant } from '../../lib/estimator'

const uploadDir = path.join(process.cwd(),'uploads')
if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir)

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir) },
  filename: function (req, file, cb) { cb(null, uuidv4() + path.extname(file.originalname)) }
})
// accept only mp4 and limit size to 200MB
function fileFilter (req:any, file:any, cb:any) {
  const allowed = ['video/mp4']
  const ext = path.extname(file.originalname).toLowerCase()
  if (!allowed.includes(file.mimetype) || ext !== '.mp4') {
    return cb(new Error('Only MP4 files are allowed'))
  }
  cb(null, true)
}
const upload = multer({ storage, fileFilter, limits: { fileSize: 200 * 1024 * 1024 } })

const handler = nextConnect<NextApiRequest, NextApiResponse>({
  onError(err, req, res) {
    const msg = String(err.message || err)
    if(msg.includes('Only MP4') || msg.includes('File too large')) return res.status(400).json({ error: msg })
    res.status(500).json({ error: msg })
  }
})

handler.use(upload.single('file'))

handler.post(async (req:any, res)=>{
  if(!req.file) return res.status(400).json({error:'missing file'})
  const filePath = req.file.path
  try{
    const info = await analyze(filePath)
    // deterministic predictions for a few variants (no encoding)
    // If client passed a variants list, use it; otherwise use defaults
    const requested = req.body && req.body.variants ? JSON.parse(req.body.variants) : null
    const canonical = requested && Array.isArray(requested) && requested.length>0 ? requested : ['libx264','libx265','libaom-av1']
    const defaultCrf:any = { 'libx264':23, 'libx265':28, 'libvpx-vp9':32, 'libaom-av1':30 }
    const variants = canonical.map((c:string)=>{
      const crf = defaultCrf[c] || 28
      return { codec: c, crf, ...predictVariant({sizeBytes:info.sizeBytes, complexity:info.complexity}, {codec:c,crf}) }
    })
    res.status(200).json({ ...info, variants })
  }catch(e){
    res.status(500).json({ error: String(e) })
  } finally{
    // cleanup uploaded file - we only need it for analysis
    try{ fs.unlinkSync(filePath) }catch(e){ }
  }
})

export const config = {
  api: { bodyParser: false }
}

export default handler
