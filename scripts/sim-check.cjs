#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const file = process.argv[2] || './samples/sample1.mp4'
if(!fs.existsSync(file)){ console.error('file not found:', file); process.exit(2) }
const stats = fs.statSync(file)
const sizeMB = Math.max(0.001, stats.size / (1024*1024))
const baseDelay = 10000 + Math.round(Math.min(sizeMB,20)/20 * 10000)
const jitter = Math.round((Math.random()*4000)-2000)
const delay = Math.max(5000, baseDelay + jitter)
const maybeFailProb = Math.min(0.5, 0.05 + (Math.min(sizeMB,20)/20)*0.45)
console.log('file:', file)
console.log('sizeMB:', sizeMB)
console.log('simulated delay (ms):', delay)
console.log('simulated 503 probability:', maybeFailProb)
