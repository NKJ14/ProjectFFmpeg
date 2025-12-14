import fs from 'fs'
import fetch from 'node-fetch'
import FormData from 'form-data'

async function main(){
  const filePath = './samples/sample1.mp4'
  const stat = fs.statSync(filePath)
  const fd = new FormData()
  fd.append('file', fs.createReadStream(filePath), { filename: 'sample1.mp4', contentType: 'video/mp4' })
  console.log('posting sample, size', stat.size)
  const res = await fetch('http://localhost:3000/api/analyze', { method: 'POST', body: fd, headers: fd.getHeaders(), timeout: 60000 })
  console.log('status', res.status)
  try{ const json = await res.json(); console.log('body', json) }catch(e){ const text = await res.text(); console.log('non-json response:', text.slice(0,1000)) }
}

main().catch(e=>{ console.error(e); process.exit(1) })
