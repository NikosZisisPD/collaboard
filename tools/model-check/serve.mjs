// Serves the model check page on localhost, opens it, and prints the
// result the page reports back.
//
//   npm run check:model
//   npm run check:model -- --model ministral-3:3b "Jump twice"
//   npm run check:model -- --no-open        (open the printed URL yourself)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const option = name => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const model = option('--model') ?? 'qwen3.5:4b';
const port = Number(option('--port') ?? 4174);
const prompt = args.filter((a, i) => !a.startsWith('--') && !['--model', '--port'].includes(args[i - 1])).join(' ');
const page = await readFile(new URL('./index.html', import.meta.url), 'utf8');

const server = createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page);
  } else if (req.method === 'POST' && req.url === '/report') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      res.writeHead(204).end();
      const report = JSON.parse(body);
      print(report);
      finish(report.passed ? 0 : 1);
    });
  } else {
    res.writeHead(404).end();
  }
});

server.listen(port, 'localhost', () => {
  const query = new URLSearchParams({ model, ...(prompt && { prompt }) });
  const url = `http://localhost:${port}/?${query}`;
  console.log(`Model check page: ${url}`);
  if (!args.includes('--no-open')) {
    spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
  }
  console.log('Waiting for the page to report…');
});

const timeout = setTimeout(() => {
  console.log('No report from the page within 5 minutes.');
  finish(1);
}, 5 * 60 * 1000);

function finish(code) {
  clearTimeout(timeout);
  process.exitCode = code;
  server.close();
  server.closeAllConnections();
}

function print(r) {
  const secs = ms => `${(ms / 1000).toFixed(1)} s`;
  const line = (label, value) => console.log(`  ${label.padEnd(9)} ${value}`);
  console.log(`\nModel check ${r.passed ? 'PASSED' : 'FAILED'}`);
  line('Ollama', r.ollamaVersion ?? '?');
  line('Model', r.model);
  line('Prompt', `“${r.prompt}”`);
  if (r.loadMs != null) line('Load', `${secs(r.loadMs)} (preload)`);
  if (r.replyMs) line('Replies', `${secs(r.replyMs[0])} and ${secs(r.replyMs[1])}`);
  if (r.first) {
    line('Speed', `${r.first.writingPerSecond ?? '?'} tokens/s writing, ${r.first.readingPerSecond ?? '?'} tokens/s reading`);
    line('Tokens', `${r.first.promptTokens} in, ${r.first.replyTokens} out`
      + (r.second?.cachedTokens != null ? `; ${r.second.cachedTokens} reused from cache on the second call` : ''));
    line('Reply', r.first.reply);
  }
  for (const c of Object.values(r.checks)) console.log(`  ${c.ok ? '✓' : '✗'} ${c.detail}`);
  if (r.error) console.log(`  Error: ${r.error}`);
}
