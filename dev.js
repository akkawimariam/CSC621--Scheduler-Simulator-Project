#!/usr/bin/env node
/**
 * Run API + frontend with one command (one terminal).
 * On Windows: ensures PATH can find the shell when using shell: true.
 */
const { spawn } = require('child_process');
const path = require('path');

const root = __dirname;
const frontend = path.join(root, 'frontend');

// On Windows, Cursor/VS Code often has a minimal PATH — add System32 so shell works
if (process.platform === 'win32' && process.env.SystemRoot) {
  const system32 = path.join(process.env.SystemRoot, 'System32');
  const ps = path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0');
  process.env.PATH = [system32, ps, process.env.PATH].filter(Boolean).join(path.delimiter);
}

function prefix(name) {
  const c = { api: '\x1b[34m', web: '\x1b[32m', reset: '\x1b[0m' };
  const k = name === 'api' ? 'api' : 'web';
  return (data) => {
    const lines = String(data).trim().split('\n').filter(Boolean);
    lines.forEach((line) => console.log(`${c[k]}[${name}]${c.reset} ${line}`));
  };
}

const opts = { stdio: ['ignore', 'pipe', 'pipe'] };
const api = spawn('python api.py', [], { ...opts, cwd: root, shell: true });
const web = spawn('npm run dev', [], { ...opts, cwd: frontend, shell: true });

api.stdout.on('data', prefix('api'));
api.stderr.on('data', prefix('api'));
web.stdout.on('data', prefix('web'));
web.stderr.on('data', prefix('web'));

function killAll() {
  try { if (api.pid) api.kill(); } catch (_) {}
  try { if (web.pid) web.kill(); } catch (_) {}
  process.exit(0);
}

api.on('error', (err) => {
  console.error('[api] Failed to start:', err.message);
  killAll();
});
web.on('error', (err) => {
  console.error('[web] Failed to start:', err.message);
  killAll();
});

api.on('exit', (code) => {
  if (code != null && code !== 0) {
    console.error(`[api] exited with code ${code}`);
    killAll();
  }
});
web.on('exit', (code) => {
  if (code != null && code !== 0) {
    console.error(`[web] exited with code ${code}`);
    killAll();
  }
});

process.on('SIGINT', killAll);
process.on('SIGTERM', killAll);

console.log('API: http://localhost:5000  |  Web: http://localhost:5173');
console.log('Press Ctrl+C to stop both.\n');
