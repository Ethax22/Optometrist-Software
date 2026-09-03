// PM2 process config. Run from the repo root on the VPS:
//   pm2 start deploy/ecosystem.config.js
//   pm2 save && pm2 startup   (once, so it survives reboots)
module.exports = {
  apps: [
    {
      name: "optometrist-app",
      cwd: __dirname + "/..",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
