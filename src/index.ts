#!/usr/bin/env node

import yargs from 'yargs'
import chalk from 'chalk'
import axios from 'axios'
import ora from 'ora'
import fs from 'fs'
import inquirer from 'inquirer'
import open from 'open'
import os from 'os'
import { exec } from 'child_process'

const backendUrl = 'https://dev.mlem-mlem.net'
const loginUrl = 'https://example.com'

const argv = yargs
  .usage('$0 <command>')
  .command('login', 'login to your account', async () => {
    await open(loginUrl)
    const args = await inquirer.prompt([
      {
        type: 'input',
        name: 'token',
        message: 'Please enter your access token',
      },
    ])

    axios.interceptors.request.use(req => {
      req.headers['Authorization'] = `Bearer ${args.token}`
      return req
    })

    axios.interceptors.response.use(
      res => {
        return res
      },
      err => {
        console.log(chalk.red(err.message))
        process.exit(1)
      }
    )

    fs.writeFile(`${os.homedir()}/.mlem-mlem`, args.token, err => {
      if (err) console.log(chalk.red(`Error saving file: ${err.message}`))
    })
  })
  .command('deploy', 'deploy your website', async () => {
    const args = await inquirer.prompt([
      {
        type: 'input',
        name: 'folder',
        message: 'Which folder do you want to deploy',
      },
      {
        type: 'input',
        name: 'alias',
        message: 'Please choose a name for your website',
      },
    ])

    await createWebAlias(args.alias)
    await createBucket()
    await createCloudfront()
    await createRecord()
    await uploadFiles(args.folder)
  })
  .alias('h', 'help')
  .alias('v', 'version')
  .demandCommand().argv

const createWebAlias = async (alias: string) => {
  try {
    const spinner = ora('Saving your website alias').start()
    await axios
      .post(`${backendUrl}/website`, { alias })
      .then(() => spinner.succeed('Saved'))
  } catch (error) {
    console.log(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

const createBucket = async () => {
  try {
    const spinner = ora('Creating s3 bucker').start()
    await axios
      .post(`${backendUrl}/bucket`)
      .then(() => spinner.succeed('Created'))
  } catch (error) {
    console.log(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

const createCloudfront = async () => {
  try {
    const spinner = ora('Creating cloudfront distribution').start()
    await axios
      .post(`${backendUrl}/cloudfront`)
      .then(() => spinner.succeed('Created'))
  } catch (error) {
    console.log(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

const createRecord = async () => {
  try {
    const spinner = ora('Creating route53 record').start()
    await axios
      .post(`${backendUrl}/record`)
      .then(() => spinner.succeed('Created'))
  } catch (error) {
    console.log(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

const uploadFiles = async (folderName: string) => {
  try {
    const spinner = ora('Uploading your static files').start()

    exec('git rev-parse --show-toplevel', (err, stdout) => {
      if (err) {
        console.log(chalk.red(`Error: ${err.message}`))
        process.exit(1)
      }

      const path = `${stdout.replace(/\n/, '')}/${folderName}`

      fs.readdir(path, async (err, files) => {
        const formData = files.map(f => ({
          file: fs.createReadStream(f),
        }))

        await axios
          .post(`${backendUrl}/bucket/upload`)
          .then(() => spinner.succeed('Uploaded'))
      })
    })
  } catch (error) {
    console.log(chalk.red(`Error: ${error.message}`))
  }
}
