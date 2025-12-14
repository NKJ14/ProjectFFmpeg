import { analyze, predictVariant } from '../lib/estimator'
import path from 'path'

async function main(){
  const file = process.argv[2]
  if(!file){ console.error('Usage: node demo-analyze.js <file>'); process.exit(2) }
  const info = await analyze(file)
  console.log('analysis', info)
  console.log('example prediction', predictVariant({sizeBytes:info.sizeBytes, complexity:info.complexity}, {codec:'libx264', crf:23}))
}

main().catch(e=>{ console.error(e); process.exit(1) })
