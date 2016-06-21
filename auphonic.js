#!/usr/bin/env node

//!!! should keep track of created productions and delete them after the file has been downloaded
//!!! username/password should be loaded from config if possible


const path = require('path')
const program = require('commander')
const request = require('request')
const config = require('./config')
const fs = require('fs')

const commands = require('./commands')

//set up the command line interface with the commander module
program
  .version(config.version)
  .usage('[options] <file ...>')
  .option('--output-suffix <string>', 'Suffix for output filenames [-auphonic]', '-auphonic')
  .option('--output-folder <string>', 'Folder for output filenames [auphonic]', 'auphonic')
  .option('-u, --username <username>', 'Username for Auphonic API account (required)')
  .option('-p, --password <password>', 'Password for Auphonic API account (required)')
  .option('-n, --noise-reduction', 'Apply noise reduction [false]', false)
  .option('-l, --loudness-target <amount>', "Loudness target in dB [-18]", -18, parseInt)
  .option('-v, --verbose', 'Logs information about execution')
  .option('--debug', 'Dump debugging info to the console')
  .parse(process.argv)




//ensure that the output folder exists
commands.ensureOutputFolder(program)

//each argument after the options is an input filename
Promise.all(program.args.map((filename) => runAuphonicAsync(program, filename)))
  .then( () => {if (program.verbose) console.log("Done all")} )
  .catch(err => console.log("Error running commands: ", err)) 
  


function runAuphonicAsync (program, filename) {
  return startProductionAsync(program,filename)
  .then(uuid => awaitProductionAsync(program, filename, uuid))
  .then(auphonicFileData => getFileAsync(program, filename, auphonicFileData))
  .then( () => if (program.verbose) console.log("... done"))
  .catch(err => console.log("Error running command: ", err))
}


//upload the file to a new production in auphonic
//resolves to the uuid of the production
function startProductionAsync(program, filename) {
  //returns a promise that resolves or rejects according to the results of the filters
  return new Promise( (resolve, reject) => {

    if (program.verbose)
      console.log("Uploading file to auphonic: ", filename)

    //create the form data
    let formData = {
      denoise: (program.noiseReduction === true).toString(),
      loudnesstarget: program.loudnessTarget,
      input_file: fs.createReadStream(filename),
      action: 'start',
    }


    //create a request for uploading the file
    request.post({
        url: `https://${program.username}:${program.password}@auphonic.com/api/simple/productions.json`, 
        formData: formData
      }, (err, response, body) => {
        if (err) 
          reject(err)

        data = JSON.parse(body).data

        resolve(data.uuid)
    })
  })
}

//poll the production until the status is "Done"
//resolves to the url link to the downloadable result file
function awaitProductionAsync(program, filename, uuid) {
  return new Promise ( (resolve, reject) => {
    request.get(`https://${program.username}:${program.password}@auphonic.com/api/production/${uuid}.json`,        
      (err, response, body) => {
        if (err)
          reject(err)

        data = JSON.parse(body).data

        if (program.verbose)
          console.log("Received production status for " + filename +": ", data.status_string)

        //if status is done
        if (data.status == 3) {
          resolve(data.output_files[0].download_url)
        }
        else if (data.status == 2 || data.status == 9 || data.status == 13 || data.status == 11)
          reject(`Product returned error status (${data.status}): ${data.status_string}`)
        else {
          setTimeout(() => resolve(awaitProductionAsync(program, filename, uuid)), 1000)
        }

      }
    )
  })

}

//download the file from the given download url
//and save it to the appropriate location
function getFileAsync(program, filename, downloadUrl) {

  return new Promise ((resolve, reject) => {

    //get the extension of the download file
    const downloadExt = '.'+downloadUrl.split('.').pop()

    //get the base name of the input file
    const extname = path.extname(filename)
    const basename = path.basename(filename, extname)
    //and the path to the output folder
    const outputPath = path.join(process.cwd(), program.outputFolder)


    //determine output filename by combining output path and suffix with input filename and extension of downloaded file
    const outputFilename = path.join(outputPath, basename+program.outputSuffix+downloadExt)

    const downloadUrlPath = downloadUrl.split("//")[1]

    if (program.verbose)
      console.log("Downloading file from auphonic: ", outputFilename)

    request.get(`https://${program.username}:${program.password}@${downloadUrlPath}`)
      .on('error', (err) => reject(err))
      .pipe(fs.createWriteStream(outputFilename))
      .on('finish', () => resolve(outputFilename))
  })

}
