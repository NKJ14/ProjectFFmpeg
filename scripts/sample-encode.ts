/**
 * Sample script showing how to perform a server-side encode.
 * This file is intentionally not used by the app.
 */
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import path from 'path'

ffmpeg.setFfmpegPath(ffmpegPath || undefined)

export function encodeSample(input:string, output:string, codec='libx264', crf=23){
  return new Promise((resolve, reject)=>{
    ffmpeg(input)
      .videoCodec(codec)
      .outputOptions(['-crf '+crf, '-preset fast'])
      .on('end', ()=> resolve(output))
      .on('error', (e:any)=> reject(e))
      .save(output)
  })
}
