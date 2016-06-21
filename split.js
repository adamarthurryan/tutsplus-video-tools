#!/usr/bin/env node

const config = require('./config')

const path = require('path')
const fse = require('fs-extra')
const program = require('commander')

const commands = require('./commands')

const ffmpeg = require('fluent-ffmpeg')

//paths to the ffmpeg binaries for fluent-ffmpeg
ffmpeg.setFfmpegPath(config.ffmpegPath)
ffmpeg.setFfprobePath(config.ffprobePath)



//set up the command line interface with the commander module
program
  .version(config.version)
  .usage('[options] <file ...>')
  .option('--output-suffix [string]', 'Suffix for output filenames', '')
  .option('--output-folder [string]', 'Folder for output filenames [split]', 'split')
  .option('-v, --verbose', 'Logs information about execution')
  .parse(process.argv)


//ensure that the output folder exists
commands.ensureOutputFolder(program)

//run the split command on all program arguments
commands.runCommandAllSync(program, splitCommand)


function splitCommand (program, filename, metadata) {

  //returns a promise that resolves or rejects according to the results of the split
  return new Promise( function (resolve, reject) {

    const outputPath = path.join(process.cwd(), program.outputFolder)

    //determine output filename by adding a suffix to the input filename
    const extname = path.extname(filename)
    const basename = path.basename(filename, extname)

    const extVideo = '.m4v'
    const extAudio = '.m4a'

    const outputFilenameVideo = path.join(outputPath, basename+program.outputSuffix+extVideo)
    const outputFilenameAudio = path.join(outputPath, basename+program.outputSuffix+extAudio)


    if (program.verbose) {
      console.log(`\nSplitting from ${filename}, writing to ${outputFilenameVideo} and ${outputFilenameAudio}`)
    }

    ffmpeg(filename)

      .output(outputFilenameVideo)
      .noAudio()
      .videoCodec('copy')

      .output(outputFilenameAudio)
      .noVideo()
      .audioCodec('copy')

      .on('error', err => reject(err))
      .on('end', () => resolve())
      .run()
  })
}
