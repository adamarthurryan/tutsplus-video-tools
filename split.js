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
  .description('Splits the videos files into separate video and audio channels.')
  .option('--output-suffix [string]', 'Suffix for output filenames', '')
  .option('--output-folder [string]', 'Folder for output filenames [split]', 'split')
  .option('--output-audio-extension [string]', 'Extension for output audio files [.m4a]', '.m4a')
  .option('--output-video-extension [string]', 'Extension for output video files [.m4v]', '.m4v')
  .option('-v, --verbose', 'Logs information about execution')
  .parse(process.argv)


//ensure that the output folder exists
commands.ensureOutputFolder(program)

//run the split command on all program arguments
commands.runCommandAllSequential(program, program.args, splitCommand)


function splitCommand (options, filename, metadata) {

  const outputFilenameVideo = commands.getOutputFilename(Object.assign({}, options, {outputExtension: options.outputVideoExtension}), filename)
  const outputFilenameAudio = commands.getOutputFilename(Object.assign({}, options, {outputExtension: options.outputAudioExtension}), filename)

  if (options.verbose) {
    console.log(`\nSplitting from ${filename}, writing to ${outputFilenameVideo} and ${outputFilenameAudio}`)
  }

  //returns a promise that resolves or rejects according to the results of the split
  return new Promise( function (resolve, reject) {

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
