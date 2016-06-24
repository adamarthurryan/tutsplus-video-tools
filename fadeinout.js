#!/usr/bin/env node

const config = require('./config')

const path = require('path')
const program = require('commander')

const commands = require('./commands')


//set up the command line interface with the commander module
program
  .version(config.version)
  .usage('[options] <file ...>')
  .description('Adds a fade from or to black to the beginning and end of each video.')
  .option('--output-suffix [string]', 'Suffix for output filenames [fadeinout]', 'fadeinout')
  .option('--output-folder [string]', 'Folder for output filenames [fadeinout]', 'fadeinout')
  .option('--output-extension [string]', 'Extension for output filenames (default same as original)')
  .option('--no-fade-in ', 'Do not apply a fade in [false]', false)
  .option('--no-fade-out', 'Do not apply a fade out [false]', false)
  .option('-d, --fade-duration [seconds]', 'Fade duration in seconds', parseFloat, 1.0)
  .option('-v, --verbose', 'Logs information about execution')
  .parse(process.argv)



//ensure that the output folder exists
commands.ensureOutputFolder(program)

//run the fadeinout command on the program arguments
commands.runCommandAllSequential(program, program.args, fadeInOutCommand)

function fadeInOutCommand(options, filename, metadata) {
  return commands.applyFiltersAsync(options, filename, defineFadeInOutFilters(options, filename, metadata))
}

function defineFadeInOutFilters(options, filename, metadata) {
  //get duration in seconds from metadata
  const duration = metadata.format.duration

  if (options.verbose)
    console.log(`Generating fade ${(!options.noFadeIn)?"in":""}${(!options.noFadeIn)||(!options.noFadeOut)?" and ":""}${(!options.noFadeOut)?"out":""} filters with fade duration ${program.fadeDuration} seconds`)


  //create filters
  let filters = []

  //fade in
  if (!options.noFadeIn) {
    filters.push({
      filter: 'fade',
      options: `t=in:st=0:d=${options.fadeDuration}`
    })
  }
  
  if (options.noFadeOut) {
    //fade out
    filters.push({
      filter: 'fade',
      options: `t=out:st=${duration-options.fadeDuration}:d=${options.fadeDuration}`
    })
  }
  

  return filters
}

