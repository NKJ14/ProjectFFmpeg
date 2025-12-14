#!/usr/bin/env node
require('ts-node/register/transpile-only');
;(async ()=>{
  try{
    const { analyze, predictVariant } = require('../lib/estimator')
    const file = process.argv[2]
    if(!file){ console.error('Usage: node run-analyze.cjs <file>'); process.exit(2) }
    const info = await analyze(file)
    console.log(JSON.stringify(info, null, 2))
    console.log('prediction', predictVariant({sizeBytes:info.sizeBytes, complexity:info.complexity}, {codec:'libx264', crf:23}))
  }catch(e){ console.error(e); process.exit(1) }
})()
