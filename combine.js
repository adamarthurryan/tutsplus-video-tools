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
  .description('Combines each video files with a cooresponding audio files (which should be in the same folder and differ only in extension).')
  .option('--output-suffix [string]', 'Suffix for output filenames', '')
  .option('--output-folder [string]', 'Folder for output filenames [combine]', 'combine')
  .option('--output-extension [string]', 'Extension for output filenames [.mp4]', '.mp4')
  .option('--audio-extension [string]', 'Extension for audio files [.m4a]', '.m4a')
  .option('--audio-suffix [string]', 'Suffix for audio files')
  .option('--audio-folder [string]', 'Folder for audio files (default is same folder as video files)')

  .option('-v, --verbose', 'Logs information about execution')
  .parse(process.argv)


//expand globs in file arguments
let filenames = commands.expandGlobsSync(program.args)

//ensure that the output folder exists
commands.ensureOutputFolder(program)

//run the combine command on all program arguments
commands.runCommandAllSequential(program, filenames, combineCommand)

function combineCommand (options, filename, metadata) {

  const outputFilename = commands.getOutputFilename(options, filename)

  let inputFilenameAudio = commands.changeExtension(filename, options.audioExtension)

  if (options.audioSuffix && options.audioSuffix != '')
    inputFilenameAudio = commands.addSuffix(inputFilenameAudio, options.audioSuffix)

  if (options.audioFolder)
    inputFilenameAudio = commands.changeFolder(inputFilenameAudio, options.audioFolder)
  

  if (options.verbose) {
    console.log(`\nCombining from ${filename} and ${inputFilenameAudio}, writing to ${outputFilename}`)
  }

  //returns a promise that resolves or rejects according to the results of the combine
  return new Promise( function (resolve, reject) {
  
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
