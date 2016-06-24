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
  .option('--output-suffix [string]', 'Suffix for output filenames [-fadeinout]', '-fadeinout')
  .option('--output-folder [string]', 'Folder for output filenames [fadeinout]', 'fadeinout')
  .option('--output-extension [string]', 'Extension for output filenames [.mp4]', '.mp4')
  .option('-d, --fade-duration [seconds]', 'Fade duration in seconds', parseFloat, 1.0)
  .option('-v, --verbose', 'Logs information about execution')
  .parse(process.argv)


//ensure that the output folder exists
commands.ensureOutputFolder(program)

//run the fadeinout command on the program arguments
commands.runCommandAllSequential(program, program.args, fadeInOutCommand)

function fadeInOutCommand(program, filename, metadata) {
  return commands.applyFiltersAsync(program, filename, defineFadeInOutFilters(program, filename, metadata))
}

function defineFadeInOutFilters(program, filename, metadata) {
  //get duration in seconds from metadata
  const duration = metadata.format.duration

  if (program.verbose)
    console.log(`Generating fade in and out filters with fade duration ${program.fadeDuration} seconds`)


  //create filters
  let filters = []

  //fade in
  filters.push({
    filter: 'fade',
    options: `t=in:st=0:d=${program.fadeDuration}`
  })

  //fade out
  filters.push({
    filter: 'fade',
    options: `t=out:st=${duration-program.fadeDuration}:d=${program.fadeDuration}`
  })
  

  return filters
}

