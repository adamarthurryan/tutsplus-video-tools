
const path = require('path')

const nconf = require('nconf')

const os = require('os')
const process = require('process')

const fs = require('fs')

const conffilePath = path.join(os.homedir(), '.tutsplus-video-tools.json')

nconf
  .env()
  .file({file: conffilePath})



// ffmpegBinPath: 'C:\\Users\\Adam\\bin\\ffmpeg-20150913-git-d13a2df-win64-static\\bin'
let ffmpegBinPath = nconf.get('ffmpegBinPath')

let ffmpegExtension = ''
if (os.platform() == 'win32')
  ffmpegExtension = '.exe'

let config = {}

config.ffmpegPath = path.join(ffmpegBinPath , 'ffmpeg'+ffmpegExtension)
config.ffprobePath = path.join(ffmpegBinPath , 'ffprobe'+ffmpegExtension)

config.requireFfmpeg = function () {
  if (ffmpegBinPath == undefined) { 
    console.log(`Error: No ffmpeg bin path was specified. Set this as an as an environment variable, or in the ${conffilePath} config file`)
    process.exit(2)
  }

  //test that the ffmpeg and ffprobe files exist?
  try {
    fs.accessSync(config.ffmpegPath, fs.X_OK)
  }
  catch (ex) {
    console.log(`Error: No ffmpeg binary was found in the specified ffmpeg bin path ${config.ffmpegPath} was specified. Set this as an as an environment variable, or in the ${conffilePath} config file`)
    process.exit(2)
  } 
  try {
    fs.accessSync(config.ffprobePath, fs.X_OK)
  }
  catch (ex) {
    console.log(`Error: No ffprobe binary was found in the specified ffmpeg bin path ${config.ffprobePath} was specified. Set this as an as an environment variable, or in the ${conffilePath} config file`)
    process.exit(2)
  } 
}


config.auphonicUsername = nconf.get('auphonicUsername')
config.auphonicPassword = nconf.get('auphonicPassword')

config.requireAuphonicUser = function () {
  if (config.auphonicUsername == undefined) { 
    console.log(`Error: No Auphonic username was specified. Set this as an as an environment variable, or in the ${conffilePath} config file`)
    process.exit(2)
  }
  if (config.auphonicPassword == undefined) { 
    console.log(`Error: No Auphonic password was specified. Set this as an as an environment variable, or in the ${conffilePath} config file`)
    process.exit(2)
  }

}


module.exports = config