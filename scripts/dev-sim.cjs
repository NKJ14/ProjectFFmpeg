#!/usr/bin/env node
const { spawn } = require('child_process')
process.env.SIMULATE_LOAD = 'true'
process.env.NEXT_PUBLIC_SIMULATE_LOAD = 'true'
const cmd = 'npx'
const args = ['next', 'dev', '-p', '3001']
const child = spawn(cmd, args, { stdio: 'inherit', shell: true, env: process.env })
child.on('exit', code => process.exit(code))
