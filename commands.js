const config = require('./config')

const path = require('path')
const fse = require('fs-extra')
const ffmpeg = require('fluent-ffmpeg')
const process = require('process')
const glob = require('glob')


//!!! add a progress bar
// https://www.npmjs.com/package/progress
// https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#progress-transcoding-progress-information



//instead of passing "program" around we should pass a config object
//not all commands depend on metadata - make that part of the command
//  so command signature should be just (filename, config) => Promise


//assert that the ffmpeg path is configured
config.requireFfmpeg()

//paths to the ffmpeg binaries for fluent-ffmpeg
ffmpeg.setFfmpegPath(config.ffmpegPath)
ffmpeg.setFfprobePath(config.ffprobePath)


//syncronously expands each of the given arguments into an array of matched filenames
//!!! this could be improved by running each glob expansion in parallel
function expandGlobsSync(args) {
  return args
    //expand each globbed argument
    .map(arg => glob.sync(arg, {}))
    //flatten the array
    .reduce((a,b) => a.concat(b), [])
}

//ensure that the output folder exists
function ensureOutputFolder(options) {
  const outputPath = path.join(process.cwd(), options.outputFolder)

  //ensure that output path exists
  try {
    fse.ensureDirSync(outputPath)
  }
  catch (ex) {
    console.log("Error creating output folder: ", err)
    process.exit(1)
  }
}

function addSuffix(filename, suffix) {
  const ext = path.extname(filename)
  const basename = path.basename(filename, ext)
  const dirname = path.dirname(filename)
  const newFilename = path.join(dirname, basename+"-"+suffix+ext)
  return newFilename
}

function changeFolder(filename, folder) {
  const ext = path.extname(filename)
  const basename = path.basename(filename, ext)
  const oldDirname = path.dirname(filename)
  const newFilename = path.join(folder, basename+ext)
  return newFilename
}

function changeExtension(filename, ext) {
  const oldExt = path.extname(filename)
  const basename = path.basename(filename, oldExt)
  const dirname = path.dirname(filename)
  const newFilename = path.join(dirname, basename+ext)
  return newFilename
}

//returns the output filename for the given input filename and options
//options specify an outputFolder and outputSuffix, which are combined with the input filename
function getOutputFilename(options, filename) {
    const basename = path.basename(filename)
    const outputPath = path.join(process.cwd(), options.outputFolder) //??? do we need the process.cwd() in the path?
    let outputFilename = path.join(outputPath, basename)

    if (options.outputExtension)
      outputFilename = changeExtension(outputFilename, options.outputExtension)
    if (options.outputSuffix)
      outputFilename = addSuffix(outputFilename, options.outputSuffix)

    return outputFilename
}

function applyFiltersAsync (options, filename, filters) {

  const outputFilename = getOutputFilename(options, filename)

  if (options.verbose) 
    console.log(`Applying filters to ${filename}, writing to ${outputFilename}`)

  //returns a promise that resolves or rejects according to the results of the filters
  return new Promise( function (resolve, reject) {
    ffmpeg(filename)
      .videoFilter(filters)    
      .on('error', err => reject(err))
      .on('end', () => resolve())
      .save(outputFilename)
  })
}


//wraps the ffprobe function of the fluent-ffmpeg module in a promise
function getMetadataAsync (options, filename) {
  if (options.verbose) 
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

//command is a function with the signature (options, filename, metadata) => Promise
function runCommandAsync (options, filename, command) {
  return getMetadataAsync(options, filename)
  .then(metadata => command(options, filename, metadata))
  .then( () => {
  })
  .catch( (err) => {
    console.log("Error running command: ", err)
    process.exit(1)
  })
}

//runs the command on each file in the array
//command has the signature (options, filename, metadata)
//processes files one after the other
function runCommandAllSequential(options, filenames, command) {
  //for each filename
  filenames.reduce( 
    //wait for the previous file to complete
    (promise, filename) => promise.then(
      //then start processing the next file
      () => runCommandAsync(options, filename, command)
    )
    //handle errors
    .catch((err) => {
      console.log("Error running command: ", err)
      process.exit(1)
    }), 
    //start with an empty promise
    Promise.resolve()
  )
}

//runs the command on each file in the array
//command has the signature (options, filename, metadata)
//processes files concurrently
function runCommandAllConcurrent(options, filenames, command) {
  //for each filename
  filenames.map( 
    //wait for the previous file to complete
    (filename) => runCommandAsync(options, filename, command)
    //handle errors
    .catch((err) => {
      console.log("Error running command: ", err)
      process.exit(1)
    })
  )
}

function runCommandAllConcurrentBatches(options, filenames, command, batchSize=0) {
  //split filenames up into batches
  let batches = []
  if (batchSize==0)
    batches=[filenames]
  else
    batches = splitArray(filenames, batchSize)

  //for each filename
  batches.reduce( 
    
    //wait for the previous file to complete
    (promise, batch) => promise.then( ()=>
      //make a promise that will conclude when all the files are processed
      Promise.all(batch.map(
        //create a promise for each file and start running
        (filename) => runCommandAsync(options, filename, command)
      ))
      //handle errors
      .catch((err) => {
        console.log("Error running command: ", err)
        process.exit(1)
      })

    ),

    //start with an empty promise
    Promise.resolve()
  )

}

function splitArray(input, maxLength) {
  let count = Math.ceil(input.length/maxLength)
  let output = []

  for (var i=0; i<count; i++) {
    output.push(input.slice(maxLength*i, maxLength*(i+1)))
  }

  return output
}


module.exports = {
    getMetadataAsync, 
    applyFiltersAsync, 
    runCommandAsync, 
    runCommandAllSequential, 
    runCommandAllConcurrent, 
    runCommandAllConcurrentBatches,
    ensureOutputFolder, 
    getOutputFilename,
    changeExtension,
    addSuffix,
    changeFolder,
    expandGlobsSync
  }