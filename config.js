
const path = require('path')

const ffmpegBinPath = 'C:\\Users\\Adam\\bin\\ffmpeg-20150913-git-d13a2df-win64-static\\bin'
const ffmpegExtension = '.exe'

var config = {}

config.ffmpegPath = path.join(ffmpegBinPath, 'ffmpeg'+ffmpegExtension)

config.ffprobePath = path.join(ffmpegBinPath, 'ffprobe'+ffmpegExtension)


module.exports = config