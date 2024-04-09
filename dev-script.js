const concurrently = require('concurrently')
const path = require('path')
const fs = require('fs')

const cdnPath = path.resolve(__dirname, './federation-cdn-mock')
const cdnAssetsPath = path.resolve(__dirname, './federation-cdn-mock/distx')

try {
  fs.statSync(cdnAssetsPath)  
} catch (error) {
  // create server asset dir
  fs.mkdirSync(cdnAssetsPath)
}

concurrently(
  [{
    cwd: cdnPath,
    command: 'npm run watch',
  }, {
    cwd: cdnPath,
    command: 'npm run serve',
  },
  {
    cwd: __dirname,
    command: 'npx nx run test-app:serve',
  }]
)
