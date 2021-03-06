#!/usr/bin/env node

const config = require('./config')

const path = require('path')
const program = require('commander')

const commands = require('./commands')


//set up the command line interface with the commander module
program
  .version(config.version)
  .usage('<file ...>')
  .description('Prints metadata informat for each video.')

  .parse(process.argv)

//expand globs in file arguments
let filenames = commands.expandGlobsSync(program.args)

//run the fadeinout command on the program arguments
commands.runCommandAllSequential(program, filenames, metadataDumpCommand)

function metadataDumpCommand(program, filename, metadata) {
  console.log(`-- ${filename} --`)
  console.log(metadata)
  console.log('\n')
  return Promise.resolve()
}


