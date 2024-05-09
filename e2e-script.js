const concurrently = require('concurrently')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')

const cdnPath = path.resolve(__dirname, './federation-cdn-mock')
const cdnAssetsPath = path.resolve(__dirname, './federation-cdn-mock/dist')

try {
  fs.statSync(cdnAssetsPath)  
} catch (error) {
  // create server asset dir
  fs.mkdirSync(cdnAssetsPath)
}

// install private package
execSync('npm install', { cwd: cdnPath, stdio: 'inherit'})
// ensure the deps exist before we start the servers
execSync('npm run build -c webpack.config.js', { cwd: cdnPath, stdio: 'inherit'})

const {result, commands} = concurrently(
  [{
    name: 'cdn-server',
    cwd: cdnPath,
    command: 'npm run serve',
  },
  {
    cwd: __dirname,
    name: 'test-app',
    command: 'npx nx run test-app:serve',
  }, {
    cwd: __dirname,
    name: 'e2e',
    command: 'npx wait-on http://localhost:4200 http://127.0.0.1:8001 && npx nx run test-app-e2e:e2e --skipNxCache',
  }],
  {
    successCondition: 'e2e',
    killOthers: ['success', 'failure'],
  }
)


result.catch((e) => {
  const e2eJob = e.find(({ command: {name} }) => name ==='e2e')
  if(!e2eJob) {
    console.error('E2E tests job not found')
    process.exit(1)  
  }

  if(e2eJob.exitCode === 0) {
    process.exit(0)
  } else {
    console.error('E2E tests failed')
    process.exit(1)
  }
})
