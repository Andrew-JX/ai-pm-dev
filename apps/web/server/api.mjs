import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readProjectState } from './project-state.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cliPath = resolve(repoRoot, 'bin', 'ai-pm-dev.mjs');

function json(status, body) {
  return { status, body };
}

function parseBody(body) {
  if (!body) {
    return {};
  }
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

async function runCli(args, input = '') {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => {
      resolveRun({ ok: false, stdout, stderr: stderr || error.message, code: 1 });
    });
    child.on('close', (code) => {
      resolveRun({ ok: code === 0, stdout, stderr, code: code || 0 });
    });
    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

export async function handleApiRequest(request) {
  const url = new URL(request.url, 'http://localhost');
  const method = request.method.toUpperCase();

  if (method === 'GET' && url.pathname === '/api/project') {
    const target = url.searchParams.get('target') || process.cwd();
    return json(200, readProjectState(target));
  }

  if (method === 'POST' && url.pathname === '/api/prd') {
    const body = parseBody(request.body);
    const target = resolve(body.target || process.cwd());
    const idea = String(body.idea || '').trim();
    if (!idea) {
      return json(400, { error: 'idea is required' });
    }
    const input = `${idea}\n${body.targetUsers || ''}\n${body.painPoints || ''}\n`;
    const result = await runCli(['prd', '--quick', '--target', target], input);
    return json(result.ok ? 200 : 500, {
      result,
      project: readProjectState(target),
    });
  }

  if (method === 'POST' && url.pathname === '/api/check') {
    const body = parseBody(request.body);
    const target = resolve(body.target || process.cwd());
    const args = ['prd', 'check', '--target', target];
    if (body.strict) {
      args.splice(2, 0, '--strict');
    }
    const result = await runCli(args);
    return json(result.ok ? 200 : 409, {
      result,
      project: readProjectState(target),
    });
  }

  if (method === 'POST' && url.pathname === '/api/checkpoint') {
    const body = parseBody(request.body);
    const target = resolve(body.target || process.cwd());
    const phase = String(body.phase || 'build').trim();
    const args = ['checkpoint', phase, '--target', target];
    if (body.note) {
      args.splice(2, 0, '--note', String(body.note));
    }
    const result = await runCli(args);
    return json(result.ok ? 200 : 500, {
      result,
      project: readProjectState(target),
    });
  }

  if (method === 'POST' && url.pathname === '/api/note') {
    const body = parseBody(request.body);
    const target = resolve(body.target || process.cwd());
    const note = String(body.note || '').trim();
    if (!note) {
      return json(400, { error: 'note is required' });
    }
    const result = await runCli(['note', note, '--target', target]);
    return json(result.ok ? 200 : 500, {
      result,
      project: readProjectState(target),
    });
  }

  if (method === 'POST' && url.pathname === '/api/decision') {
    const body = parseBody(request.body);
    const target = resolve(body.target || process.cwd());
    const decision = String(body.decision || '').trim();
    if (!decision) {
      return json(400, { error: 'decision is required' });
    }
    const args = ['decide', decision, '--target', target];
    if (body.why) {
      args.splice(2, 0, '--why', String(body.why));
    }
    const result = await runCli(args);
    return json(result.ok ? 200 : 500, {
      result,
      project: readProjectState(target),
    });
  }

  return json(404, { error: 'not found' });
}
