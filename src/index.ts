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
import { readdir, lstat } from 'fs/promises'
import FormData from 'form-data'

const backendUrl = 'https://dev.mlem-mlem.net'
const loginUrl = 'https://login.mlem-mlem.net'
let token = ''

fs.readFile(`${os.homedir()}/.mlem-mlem`, (err, file) => {
  if (err) console.log(chalk.red(err))
  token = file.toString()
})

axios.interceptors.request.use(req => {
  req.headers['Authorization'] = `Bearer ${token}`
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
    await createBucket(args.alias)
    await createCloudfront(args.alias)
    await createRecord(args.alias)
    await uploadFiles(args.alias, args.folder)
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
    console.log(chalk.red(`Error: ${error}`))
    process.exit(1)
  }
}

const createBucket = async (alias: string) => {
  try {
    const spinner = ora('Creating s3 bucker').start()
    await axios
      .post(`${backendUrl}/website/bucket`, { alias })
      .then(() => spinner.succeed('Created'))
  } catch (error) {
    console.log(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

const createCloudfront = async (alias: string) => {
  try {
    const spinner = ora('Creating cloudfront distribution').start()
    await axios
      .post(`${backendUrl}/website/cloudfront`, { alias })
      .then(() => spinner.succeed('Created'))
  } catch (error) {
    console.log(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

const createRecord = async (alias: string) => {
  try {
    const spinner = ora('Creating route53 record').start()
    await axios
      .post(`${backendUrl}/website/record`, { alias })
      .then(() => spinner.succeed('Created'))
  } catch (error) {
    console.log(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

const uploadFiles = async (alias: string, folderName: string) => {
  try {
    const spinner = ora('Uploading your static files').start()

    exec('git rev-parse --show-toplevel', async (err, stdout) => {
      if (err) {
        console.log(chalk.red(`Error: ${err.message}`))
        process.exit(1)
      }

      const rootPath = `${stdout.replace(/\n/, '')}/${folderName}`

      const locations = await getAllFilesLocations(rootPath)

      const formData = new FormData()

      locations.forEach(file => {
        const key = file.replace(`${rootPath}/`, '')
        formData.append(key, fs.createReadStream(file))
      })

      await axios
        .post(`${backendUrl}/website/bucket/upload/${alias}`, formData, {
          headers: formData.getHeaders(),
        })
        .then(() => spinner.succeed('Upload Complete'))
        .catch(err => console.log(chalk.red(err.message)))
    })
  } catch (error) {
    console.log(chalk.red(`Error: ${error.message}`))
  }
}

const getAllFilesLocations = async (rootPath: string): Promise<string[]> => {
  const fileNames = await readdir(rootPath).catch(err =>
    console.log(chalk.red(err))
  )

  if (fileNames) {
    const res = await Promise.all(
      fileNames.map(async name => {
        const isDirectory = await lstat(`${rootPath}/${name}`)
          .then(res => res.isDirectory())
          .catch(err => console.log(chalk.red(err)))

        if (isDirectory) {
          return getAllFilesLocations(`${rootPath}/${name}`)
        } else {
          return [`${rootPath}/${name}`]
        }
      })
    )

    return res.reduce((a, b) => a.concat(b), [])
  }

  return []
}
