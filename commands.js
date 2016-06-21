const config = require('./config')

const path = require('path')
const fse = require('fs-extra')
const ffmpeg = require('fluent-ffmpeg')
const process = require('process')

//!!! this file should not depend on ffmpeg
//instead of passing "program" around we should pass a config object
//not all commands depend on metadata - make that part of the command
//  so command signature should be just (filename, config) => Promise


//paths to the ffmpeg binaries for fluent-ffmpeg
ffmpeg.setFfmpegPath(config.ffmpegPath)
ffmpeg.setFfprobePath(config.ffprobePath)

//ensure that the output folder exists
function ensureOutputFolder(program) {
  const outputPath = path.join(process.cwd(), program.outputFolder)

  //ensure that output path exists
  try {
    fse.ensureDirSync(outputPath)
  }
  catch (ex) {
    console.log("Error creating output folder: ", err)
    process.exit(1)
  }
}


function applyFiltersAsync (program, filename, filters) {

  //returns a promise that resolves or rejects according to the results of the filters
  return new Promise( function (resolve, reject) {

    //determine output filename by adding a suffix to the input filename
    const extname = path.extname(filename)
    const basename = path.basename(filename, extname)
    const outputPath = path.join(process.cwd(), program.outputFolder)
    const outputFilename = path.join(outputPath, basename+program.outputSuffix+extname)


    if (program.verbose) 
      console.log(`Applying filters to ${filename}, writing to ${outputFilename}`)
  
    ffmpeg(filename)
      .videoFilters(filters)
      .on('error', err => reject(err))
      .on('end', () => resolve())
      .save(outputFilename)
  })
}

//wraps the ffprobe function of the fluent-ffmpeg module in a promise
function getMetadataAsync (program, filename) {
  if (program.verbose) 
    console.log(`Getting metadata for ${filename}`)

  //returns a promise that resolves or rejects according the the results of the probe
  return new Promise (function (resolve, reject) {
    ffmpeg.ffprobe(filename, (err, metadata) => {
      if (err)
        reject(err)
      resolve(metadata)
    })
  })
}

//command is a function with the signature (program, filename, metadata) => Promise
function runCommandAsync (program, filename, command) {
  return getMetadataAsync(program, filename)
  .then(metadata => command(program, filename, metadata))
  .then( () => {
    if (program.verbose) console.log("... done")
  })
  .catch( (err) => {
    console.log("Error running command: ", err)
    process.exit(1)
  })
}

//runs the command on each argument of the program
//command has the signature (program, filename, metadata)
function runCommandAllSync(program, command) {
  //for each filename
  program.args.reduce( 
    //wait for the previous file to complete
    (promise, filename) => promise.then(
      //then start processing the next file
      () => runCommandAsync(program, filename, command)
    ), 
    //start with an empty promise
    Promise.resolve()
  )
}

module.exports = {getMetadataAsync, applyFiltersAsync, runCommandAsync, runCommandAllSync, ensureOutputFolder}