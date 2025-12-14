import type { NextApiRequest, NextApiResponse } from 'next'
import { getJob } from '../../../lib/jobs'

export default function handler(req: NextApiRequest, res: NextApiResponse){
  const { id } = req.query
  if(!id || typeof id !== 'string') return res.status(400).json({ error: 'missing job id' })
  const job = getJob(id)
  if(!job) return res.status(404).json({ error: 'job not found' })
  res.status(200).json({ id: job.id, status: job.status, progress: job.progress, logs: job.logs, results: job.results })
}
