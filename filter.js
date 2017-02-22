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
  .description('Apply an ffmpeg filter to each file. A video filter and audio filter can be specified. Also has some preconfigured filters (--speed, --landscape).')
  .option('--output-suffix [string]', 'Suffix for output filenames [filter]', 'filter')
  .option('--output-folder [string]', 'Folder for output filenames [filter]', 'filter')
  .option('--output-extension [string]', 'Extension for output filenames (default same as original)')
  .option('--speed [float]', 'Change the video and audio speed by the given factor. Eg. "--speed 1.2" increases the video speed by 1.2x')
  .option('--landscape', 'Convert vertical video into landscape mode. Defaults to fuzzy-cropped stretched-original-background horizontal video, as seen on YouTube and the TV news.')
  .option('--landscape-mode [string]', 'Set the background effect mode for the landscape conversion: "fuzzy" (the default), "none" or "white".', 'fuzzy')
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

    if (options.landscape) {
      //ffmpeg input.mp4 -filter-complex [0:v]scale=ih*16/9:-1,boxblur=luma_radius=min(h\,w)/20:luma_power=1:chroma_radius=min(cw\,ch)/20:chroma_power=1[bg];[bg][0:v]overlay=(W-w)/2:(H-h)/2,crop=h=iw*9/16 output.mp4
      
      var filterChain = []
      //first scale the background
      filterChain.push({
            filter: 'scale', options:'ih*16/9:-1',
            inputs: '0:v', outputs: 'bg'
      })
      
      //then apply the background effect
      if (options.landscapeMode === 'white')
        filterChain.push({
            filter: 'drawbox', options:{color:'#ffffff', t:'max'},
            inputs: 'bg', outputs:'bg'
        })
      else if (options.landscapeMode === 'fuzzy')
        filterChain.push({
            filter: 'boxblur', options:{luma_radius:'min(h,w)/20', luma_power:'1', chroma_radius:'min(cw,ch)/20', chroma_power:'1'},
            inputs: 'bg', outputs: 'bg' 
        })


      //overlay the video on the background
      filterChain.push({ 
            filter: 'overlay', options: '(W-w)/2:(H-h)/2',
            inputs: ['bg', '0:v'], outputs: 'overlaid'
      })
      //and crop the oversized background to the correct aspect ratio
      filterChain.push({ 
            filter: 'crop', options:{h:'iw*9/16'},
            inputs: 'overlaid'
      })

      ff = ff.complexFilter(filterChain)
    } 

    ff.on('error', err => reject(err))
      .on('end', () => resolve())
      .save(outputFilename)
  })
}

