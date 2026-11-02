import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { getCcusageVersion } from './ccusage';
import { startServer } from './start';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HELP = `ccusage-dashboard v${packageJson.version}

Local web dashboard for coding agent token usage, powered by ccusage.

Usage:
  ccusage-dashboard [options]
  npx -y -p @taolux/ccusage-dashboard@latest ccusage-dashboard

Options:
  -p, --port <port>       Listen port (default: 8787; use 0 for a free port)
      --host <host>      Loopback host: 127.0.0.1, localhost or ::1
      --ccusage <path>   Custom ccusage executable
      --no-open          Do not open the dashboard in a browser
  -v, --version          Print version
  -h, --help             Show this help

The dashboard and your usage data stay on your machine.
`;

function printHelp() {
  console.log(HELP);
}

function openBrowser(url: string) {
  const platform = process.platform;
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.once('error', () => {
    console.log(`Could not open a browser automatically. Open ${url} manually.`);
  });
  child.unref();
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      port: { type: 'string', short: 'p', default: '8787' },
      host: { type: 'string', default: '127.0.0.1' },
      ccusage: { type: 'string' },
      'no-open': { type: 'boolean', default: false },
      version: { type: 'boolean', short: 'v', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: false,
    strict: true,
  });

  if (values.help) {
    printHelp();
    return;
  }
  if (values.version) {
    console.log(packageJson.version);
    return;
  }

  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: ${values.port}`);
  }
  if (!['127.0.0.1', 'localhost', '::1'].includes(values.host)) {
    throw new Error('Only loopback hosts are supported: 127.0.0.1, localhost or ::1.');
  }

  const packageBinDir = path.join(__dirname, '..', 'node_modules', '.bin');
  process.env.PATH = `${packageBinDir}${path.delimiter}${process.env.PATH || ''}`;
  process.env.NODE_ENV = 'production';
  process.env.LOG_LEVEL ||= 'warn';
  if (values.ccusage) process.env.CCUSAGE_BIN = values.ccusage;

  const ccusageVersion = await getCcusageVersion();
  const { app, url } = await startServer({
    port,
    host: values.host,
    serveStatic: true,
  });

  console.log(`ccusage-dashboard v${packageJson.version}`);
  console.log(`ccusage v${ccusageVersion}`);
  console.log(`Dashboard: ${url}`);
  console.log('Press Ctrl+C to stop.');

  if (!values['no-open']) openBrowser(url);

  let closing = false;
  async function shutdown() {
    if (closing) return;
    closing = true;
    await app.close();
    process.exit(0);
  }
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

try {
  await main();
} catch (error) {
  const code = error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : '';
  if (code === 'EADDRINUSE') {
    console.error('The port is already in use. Try --port 0 or another port.');
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }
  printHelp();
  process.exit(1);
}
