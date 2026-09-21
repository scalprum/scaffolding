const { execFileSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
execFileSync(path.join(root, 'node_modules/.bin/nx'), ['run-many', '-t', 'build', '--projects=@scalprum/remote-types,@scalprum/core,@scalprum/react-core'], {
  cwd: root,
  stdio: 'inherit',
});
