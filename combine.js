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
  .usage('[options] <videofile ...>')
  .description('combines the specified video files with their cooresponding audio files (which should be in the same folder and differ only in extension)')
  .option('--output-suffix [string]', 'Suffix for output filenames', '')
  .option('--output-folder [string]', 'Folder for output filenames [combine]', 'combine')
  .option('--audio-extension [string]', 'Extension for audio files [.m4a]', '.m4a')
  .option('-v, --verbose', 'Logs information about execution')
  .parse(process.argv)


//ensure that the output folder exists
commands.ensureOutputFolder(program)

//run the combine command on all program arguments
commands.runCommandAllSync(program, combineCommand)


function combineCommand (program, filename, metadata) {

  //returns a promise that resolves or rejects according to the results of the combine
  return new Promise( function (resolve, reject) {

    const outputPath = path.join(process.cwd(), program.outputFolder)

    //determine output filename by adding a suffix to the input filename
    const extname = path.extname(filename)
    const basename = path.basename(filename, extname)

    const ext = '.mp4'

    const inputFilenameAudio = path.join(path.dirname(filename), basename+program.audioExtension)
    const outputFilename = path.join(outputPath, basename+program.outputSuffix+ext)


    if (program.verbose) {
      console.log(`\nCombining from ${filename} and ${inputFilenameAudio}, writing to ${outputFilename}`)
    }

    //!!! could detect audio/video format by extension and decide whether to 
    //  - copy (eg. when audio extension is ".aac" or ".m4a"
    //  - or transcode

    ffmpeg(filename)
      .addInput(inputFilenameAudio)
      .audioCodec('aac')
      .videoCodec('copy')

      .on('error', err => reject(err))
      .on('end', () => resolve())
      .save(outputFilename)
  })
}
