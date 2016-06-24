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
  .description('Overwrites the start of each video with a titlecard. If no titlecard image is given, the card will be extracted from the next frame of the video after the title card duration.')
  .option('--output-suffix [string]', 'Suffix for output filenames [titlecard]', 'titlecard')
  .option('--output-folder [string]', 'Folder for output filenames [titlecard]', 'titlecard')
  .option('--output-extension [string]', 'Extension for output filenames [.mp4]', '.mp4')
  .option('--card-image [string]', 'Path to replacement titlecard image\nDefaults to image captured from first post-titlecard frame.')
  .option('-d, --card-duration [seconds]', 'Duration of title card to be removed in seconds', parseFloat, 1.0)
  .option('-v, --verbose', 'Logs information about execution')
  .parse(process.argv)


//ensure that the output folder exists
commands.ensureOutputFolder(program)

//run the fadeinout command on the program arguments
commands.runCommandAllSequential(program, program.args, titlecardCommand)

function titlecardCommand(options, filename, metadata) {

  //if a card image filename was supplied, use that
  if (options.cardImage) {
    if (options.verbose) 
      console.log(`using ${options.cardImage} as titlecard image`)

    return titlecardAsync(options, filename, options.cardImage)
  }

  //otherwise extract one from the video file
  else
    return extractTitlecardAsync(options,filename)
      .then(cardImageFilename=>titlecardAsync(options, filename, cardImageFilename))
}

function extractTitlecardAsync (options, filename) {

  //determine output filename by adding a suffix to the input filename
  const outputFilename = commands.getOutputFilename(options, filename)  
  
  //extract card to temporary filename
  const cardImageFilename=commands.changeExtension(outputFilename, '.png')

  //returns a promise that resolves or rejects according to the results of the filters
  return new Promise( function (resolve, reject) {
    if (options.verbose)
      console.log(`extracting card image from input video file to ${cardImageFilename}`)

    ffmpeg(filename)
      .seekInput(options.cardDuration)
      .frames(1)
      .on('error', err => reject(err))
      .on('end', () => resolve(cardImageFilename))
      .save(cardImageFilename)
  })
}


function titlecardAsync (options, filename, cardImageFilename) {
  //determine output filename by adding a suffix to the input filename
  const outputFilename = commands.getOutputFilename(options, filename)  

  //returns a promise that resolves or rejects according to the results of the filters
  return new Promise( function (resolve, reject) {

    if (options.verbose) 
      console.log(`writing titlecard to ${filename} from ${cardImageFilename}, writing to ${outputFilename}`)

    ffmpeg(filename)
      .input(cardImageFilename)
      .complexFilter([`[0:v][1:v]overlay=0:0:enable='between(t,0,${options.cardDuration})'`])
      .on('error', err => reject(err))
      .on('end', () => resolve())
      .save(outputFilename)
  })
}
