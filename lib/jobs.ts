import { v4 as uuidv4 } from 'uuid'

type JobStatus = 'pending'|'processing'|'finished'|'failed'

interface VariantResult {
  codec: string
  crf: number
  progress: number
  finished: boolean
  metrics?: any
}

interface Job {
  id: string
  status: JobStatus
  progress: number
  logs: string[]
  variants: VariantResult[]
  results?: any
}

const jobs = new Map<string, Job>()

export function createJob(variants: string[], baseMetrics: any){
  const id = uuidv4()
  const job: Job = {
    id,
    status: 'pending',
    progress: 0,
    logs: [],
    variants: variants.map((v, i)=>({ codec: v, crf: 28, progress: 0, finished: false }))
  }
  jobs.set(id, job)
  // start async simulation
  simulateJob(job, baseMetrics)
  return id
}

export function getJob(id: string){
  return jobs.get(id)
}

function sleep(ms:number){ return new Promise(r=>setTimeout(r, ms)) }

async function simulateJob(job: Job, baseMetrics: any){
  job.status = 'processing'
  job.logs.push('Job started')
  // staged processing per variant
  for(const v of job.variants){
    job.logs.push(`Starting encode simulated for ${v.codec}`)
    // simulate encode time proportional to complexity/size metric
    const base = Math.max(4000, Math.round((baseMetrics.sizeBytes/1024/1024 || 1) * 4000))
    const duration = base + Math.round(Math.random()*5000)
    const steps = 5
    for(let s=1;s<=steps;s++){
      await sleep(Math.round(duration/steps))
      v.progress = Math.round((s/steps)*100)
      job.progress = Math.round((job.variants.reduce((a,b)=>a+b.progress,0) / (job.variants.length*100)) * 100)
      job.logs.push(`${v.codec}: progress ${v.progress}%`)
    }
    // produce final metrics by adding small noise to baseMetrics
    v.finished = true
    v.metrics = {
      psnr: Math.max(10, Math.round((baseMetrics.complexity*10 + 20 + Math.random()*5)*100)/100),
      ssim: Math.max(0.5, Math.round((baseMetrics.complexity*0.01 + 0.8 + Math.random()*0.05)*100)/100),
      vmaf: Math.min(100, Math.round((70 + baseMetrics.complexity*5 + Math.random()*6)*100)/100),
      bitrate: Math.round((baseMetrics.sizeBytes/1000) * (0.7 + Math.random()*0.6))
    }
    job.logs.push(`${v.codec}: finished`) 
  }
  job.status = 'finished'
  job.progress = 100
  job.results = job.variants.map(v=>({ codec:v.codec, crf:v.crf, metrics:v.metrics }))
  job.logs.push('Job finished')
}

export type { Job, JobStatus }
