const concurrently = require('concurrently');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const cdnPath = path.resolve(__dirname, './federation-cdn-mock');
const cdnAssetsPath = path.resolve(__dirname, './federation-cdn-mock/dist');

try {
  fs.statSync(cdnAssetsPath);
} catch (error) {
  // create server asset dir
  fs.mkdirSync(cdnAssetsPath);
}

// ensure the deps exist before we start the servers
execSync('npx nx run-many -t build --projects=@scalprum/remote-types,@scalprum/core,@scalprum/react-core --output-style=stream --skip-nx-cache', {
  cwd: __dirname,
  stdio: 'inherit',
});
execSync('npm run build', { cwd: cdnPath, stdio: 'inherit' });

const { commands } = concurrently([
  {
    cwd: cdnPath,
    command: 'npm run watch',
  },
  {
    cwd: cdnPath,
    command: 'npm run serve',
  },
  {
    cwd: __dirname,
    command: 'npx nx run test-app:serve',
  },
]);

// cleanup dev servers
process.on('SIGINT', () => {
  commands.forEach((c) => {
    c.close();
  });
});
