# Mlem-Mlem-CLI

This project is a node command line tool to interact with [mlem-mlem server](https://github.com/Wyfy0107/Mlem-Mlem). This cli can be used to deploy your website on the AWS platform.

## How

Your website static files will be uploaded to AWS S3, then served to user by the CloudFront global CDN network. You can also choose a website name of you choice which will be created as a Route53 record connected to the CloudFront distribution. All websites are served with HTTPS.

## Installation

`npm install -g mlem-mlem-cli`

or

`yarn global add mlem-mlem-cli`

## Usage

In the terminal, navigate to your project folder. Make sure **git** is initialized in the folder as well, other wise the cli can not find your static files.

Then run:

`mlem login` to login with google.

This will return a token, paste that token to the prompt inside your terminal.

After that, run:

`mlem deploy`

This will ask you for the name of the folders that containing your static files and the name of your website. After providing all the input **mlem** will start creating resources on AWS and then upload your files
