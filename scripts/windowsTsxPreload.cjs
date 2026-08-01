// Avoid a Windows os.userInfo() failure while tsx selects its temp directory.
if (process.platform === 'win32') {
  const os = require('node:os');
  const moduleApi = require('node:module');
  os.userInfo = () => ({
    uid: -1,
    gid: -1,
    username: process.env.USERNAME || 'windows',
    homedir: process.env.USERPROFILE || process.cwd(),
    shell: null,
  });
  moduleApi.syncBuiltinESMExports();
}
