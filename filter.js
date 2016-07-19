#!/usr/bin/env node


const config = require('./config')

const path = require('path')
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
  .description('Apply an ffmpeg filter to each file. A video filter and audio filter can be specified. Also has some preconfigured filters (--speed).')
  .option('--output-suffix [string]', 'Suffix for output filenames [filter]', 'filter')
  .option('--output-folder [string]', 'Folder for output filenames [filter]', 'filter')
  .option('--output-extension [string]', 'Extension for output filenames (default same as original)')
  .option('--speed [float]', 'Change the video and audio speed by the given factor. Eg. "--speed 1.2" increases the video speed by 1.2x')
  .option('--video-filter [string]', 'Video filter string to be passed to ffmpeg')
  .option('--audio-filter [string]', 'Audio filter string to be passed to ffmpeg')
  .option('-v, --verbose', 'Logs information about execution')
  .parse(process.argv)

//typecast arguments
if (typeof program.speed == "string")
  program.speed = parseFloat(program.speed)

//expand globs in file arguments
let filenames = commands.expandGlobsSync(program.args)

//ensure that the output folder exists
commands.ensureOutputFolder(program)

//run the fadeinout command on the program arguments
commands.runCommandAllSequential(program, filenames, filterCommand)

function filterCommand(options, filename, metadata) {

  const outputFilename = commands.getOutputFilename(options, filename)

  if (options.verbose) 
    console.log(`Applying filters to ${filename}, writing to ${outputFilename}`)

  //returns a promise that resolves or rejects according to the results of the filters
  return new Promise( function (resolve, reject) {
    let ff = ffmpeg(filename)

    if (options.videoFilter)
      ff = ff.videoFilter(options.videoFilter)

    if (options.audioFilter)
      ff = ff.audioFilter(options.audioFilter)

    if (options.speed) {
      ff = ff.videoFilter(`setpts=${1/options.speed}\*PTS`)
      ff = ff.audioFilter(`atempo=${options.speed}`)
    }

    ff.on('error', err => reject(err))
      .on('end', () => resolve())
      .save(outputFilename)
  })
}

