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
  .option('--output-suffix [string]', 'Suffix for output filenames [-titlecard]', '-titlecard')
  .option('--output-folder [string]', 'Folder for output filenames [titlecard]', 'titlecard')
  .option('--card-image [string]', 'Path to replacement titlecard image\nDefaults to image captured from first post-titlecard frame.')
  .option('-d, --card-duration [seconds]', 'Duration of title card to be removed in seconds', parseFloat, 1.0)
  .option('-v, --verbose', 'Logs information about execution')
  .parse(process.argv)


//ensure that the output folder exists
commands.ensureOutputFolder(program)

//run the fadeinout command on the program arguments
commands.runCommandAllSync(program, removeTitlecardCommand)

function removeTitlecardCommand(program, filename, metadata) {
  return getTitlecardAsync(program,filename)
  .then(cardImageFilename=>removeTitlecardAsync(program, filename, cardImageFilename))
}

function getTitlecardAsync (program, filename) {

  //returns a promise that resolves or rejects according to the results of the filters
  return new Promise( function (resolve, reject) {

    //determine output filename by adding a suffix to the input filename
    const extname = path.extname(filename)
    const basename = path.basename(filename, extname)
    const outputPath = path.join(process.cwd(), program.outputFolder)
    const outputFilename = path.join(outputPath, basename+program.outputSuffix+extname)


  

    let cardImageFilename = null

    //if there is no card image specified, extract one from the video
    if (program.cardImage) {

      if (program.verbose) 
        console.log(`using ${program.cardImage} as titlecard image`)
    
      cardImageFilename=program.cardImage
      resolve(cardImageFilename)
    }
    else {
      //extract card to temporary filename
      cardImageFilename=path.join(outputPath, basename+program.outputSuffix+'.png')

      if (program.verbose)
        console.log(`extracting card image from input video file to ${cardImageFilename}`)

      ffmpeg(filename)
        .seekInput(program.cardDuration)
        .frames(1)
        .on('error', err => reject(err))
        .on('end', () => resolve(cardImageFilename))
        .save(cardImageFilename)
    }
  })
}


function removeTitlecardAsync (program, filename, cardImageFilename) {

  //returns a promise that resolves or rejects according to the results of the filters
  return new Promise( function (resolve, reject) {

    //determine output filename by adding a suffix to the input filename
    const extname = path.extname(filename)
    const basename = path.basename(filename, extname)
    const outputPath = path.join(process.cwd(), program.outputFolder)
    const outputFilename = path.join(outputPath, basename+program.outputSuffix+extname)


    if (program.verbose) 
      console.log(`removing titlecard from ${filename}, writing to ${outputFilename}`)
  

    ffmpeg(filename)
      .input(cardImageFilename)
      .complexFilter([`[0:v][1:v]overlay=0:0:enable='between(t,0,${program.cardDuration})'`])
      .on('error', err => reject(err))
      .on('end', () => resolve())
      .save(outputFilename)
  })
}
