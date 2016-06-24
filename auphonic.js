#!/usr/bin/env node

//!!! username/password should be loaded from config if possible


const path = require('path')
const program = require('commander')
const request = require('request')
const config = require('./config')
const fs = require('fs')
const process = require('process')

const commands = require('./commands')

//set up the command line interface with the commander module
program
  .version(config.version)
  .usage('[options] <file ...>')
  .description('Processes each file with the auphonic API. Works with video files, but for faster upload it is better to split videos and only run this command on the audio channel.')
  .option('--output-suffix <string>', 'Suffix for output filenames [-auphonic]', '-auphonic')
  .option('--output-folder <string>', 'Folder for output filenames [auphonic]', 'auphonic')
  .option('--output-extension [string]', 'Extension for output filenames [.m4a]', '.m4a')
  .option('-u, --username <username>', 'Username for Auphonic API account (required)')
  .option('-p, --password <password>', 'Password for Auphonic API account (required)')
  .option('-n, --noise-reduction', 'Apply noise reduction [false]', false)
  .option('-l, --loudness-target <amount>', "Loudness target in dB [-18]", -18, parseInt)
  .option('-v, --verbose', 'Logs information about execution')
  .option('--debug', 'Dump debugging info to the console')
  .parse(process.argv)

//!!! should enforce username and password
if (program.username === undefined) {
  console.log("Auphonic username is not set. Use the -u <username> flag.")
  process.exit(1)
}
if (program.password === undefined) {
  console.log("Auphonic password is not set. Use the -p <password> flag.")
  process.exit(1)
}

//ensure that the output folder exists
commands.ensureOutputFolder(program)

commands.runCommandAllConcurrent(program, program.args, auphonicCommand)

function auphonicCommand (options, filename, metadata) {
  let pUuid = createProductionAsync(options, filename)
    .then( uuid => uploadFileToProductionAsync(options,filename, uuid))
    .then( uuid => startProductionAsync(options, filename, uuid))

  let pAuphonicFileData = pUuid.then (uuid => awaitProductionAsync(options, filename, uuid))

  let pDownloadResult = pAuphonicFileData.then(auphonicFileData => getFileAsync(options, filename, auphonicFileData))

  Promise.all([pUuid, pAuphonicFileData, pDownloadResult])
    .then(([uuid, auphonicFileData, downloadResult]) => deleteProductionAsync(options, filename, uuid, auphonicFileData, downloadResult))
    .then(() => {})
    .catch(err => console.log("Error running command: ", err))
}

//create a new production in auphonic
//resolves to the uuid of the production
function createProductionAsync(options, filename) {
  return new Promise( (resolve, reject) => {
    if (options.verbose)
      console.log("Creating Auphonic production for", filename)

    request.post({
        url: `https://${options.username}:${options.password}@auphonic.com/api/productions.json`, 
        json: true,
        body: {
          output_files: [{format:'aac', ending:'m4a'}],
          algorithms: {leveler:true, normloudness: true, loudnesstarget: options.loudnessTarget, denoise: options.denoise},
          title: `TVT - ${filename}`,
          tags: ['tvt', 'tuts video tools']
        }
      }, (err, response, body) => {
        if (err) 
          reject(err)
        else if (body.status_code != 200) 
          reject(`Auphonic API request failed with ${body.status_code}: ${body.error_message}`)
        else 
          resolve(body.data.uuid)
      }
    )
  })
}

//upload the file to the auphonic production with the given uuid
//resolves to the uuid of the production
function uploadFileToProductionAsync(options, filename, uuid) {
  //returns a promise that resolves or rejects according to the results of the filters
  return new Promise( (resolve, reject) => {

    if (options.verbose)
      console.log("Uploading file to auphonic", filename)

    //create the form data
    let formData = {
      input_file: fs.createReadStream(filename)
    }

    //create a request for uploading the file
    request.post({
        url: `https://${options.username}:${options.password}@auphonic.com/api/production/${uuid}/upload.json`, 
        json: true,
        formData: formData
      }, (err, response, body) => {
        if (err) 
          reject(err)
        else if (body.status_code != 200) 
          reject(`Auphonic API request failed with ${body.status_code}: ${body.error_message}`)
        else 
          resolve(uuid)
      }
    )
  })
}


function startProductionAsync(options, filename, uuid) {
  return new Promise( (resolve, reject) => {
    if (options.verbose)
      console.log("Starting Auphonic production for ", filename)

    request.post({
        url: `https://${options.username}:${options.password}@auphonic.com/api/production/${uuid}/start.json`, 
        json: true
      }, (err, response, body) => {
        if (err) 
          reject(err)
        else if (body.status_code != 200) 
          reject(`Auphonic API request failed with ${body.status_code}: ${body.error_message}`)
        else
          resolve(uuid)
      }
    )
  })

}


//poll the production until the status is "Done"
//resolves to the url link to the downloadable result file
function awaitProductionAsync(options, filename, uuid) {
  return new Promise ( (resolve, reject) => {
    request.get({
      url: `https://${options.username}:${options.password}@auphonic.com/api/production/${uuid}.json`,
      json: true
      }, (err, response, body) => {
        if (err) 
          reject(err)
        else if (body.status_code != 200) 
          reject(`Auphonic API request failed with ${body.status_code}: ${body.error_message}`)
        else {
          const data = body.data

          if (options.verbose)
            console.log(`Received production status for ${filename}: ${data.status_string}`)

          //if status is done, resolve
          if (data.status == 3) {
            resolve(data.output_files[0].download_url)
          }
          //if the status is an error, reject
          else if (data.status == 2 || data.status == 9 || data.status == 13 || data.status == 11)
            reject(`Product returned error status (${data.status}): ${data.status_string}`)
          //otherwise pause for a second and retry
          else {
            setTimeout(() => resolve(awaitProductionAsync(options, filename, uuid)), 1000)
          }
        }
      }
    )
  })
}

function deleteProductionAsync(options, filename, uuid, auphonicFileData, downloadResult) {
  return new Promise( (resolve, reject) => {
    if (options.verbose)
      console.log("Cleaning up Auphonic production for ", filename)

    request.delete({
        url: `https://${options.username}:${options.password}@auphonic.com/api/production/${uuid}.json`, 
        json: true
      }, (err, response, body) => {
        if (err) 
          reject(err)
        else if (body.status_code != 200) 
          reject(`Auphonic API request failed with ${body.status_code}: ${body.error_message}`)
        else
          resolve(uuid)
      }
    )
  })
}

//download the file from the given download url
//and save it to the appropriate location
function getFileAsync(options, filename, downloadUrl) {

  //get the extension of the download file
  const downloadExt = '.'+downloadUrl.split('.').pop()
  //and the path part of the download url
  const downloadUrlPath = downloadUrl.split("//")[1]

  //create an output filename by combining the input file name with the extension of the file provided by auphonic
  const outputFilename = commands.changeExtension(commands.getOutputFilename(options, filename), downloadExt)

  return new Promise ((resolve, reject) => {

    if (options.verbose)
      console.log(`Downloading file from auphonic at URL ${downloadUrlPath} to ${outputFilename}`)

    //download the file
    request.get(`https://${options.username}:${options.password}@${downloadUrlPath}`)
      .on('error', (err) => reject(err))
      .pipe(fs.createWriteStream(outputFilename))
      .on('finish', () => resolve(outputFilename))
  })

}
