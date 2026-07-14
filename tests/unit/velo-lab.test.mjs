import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  buildLabSystemPrompt,
  normalizeLabRequest,
  resolveOllamaUrl,
  selectRelevantKnowledge,
} from '../../scripts/velo-lab-server.mjs';

const root = path.resolve(import.meta.dirname, '..', '..');

test('Velo Lab accepts only loopback Ollama endpoints', () => {
  assert.equal(resolveOllamaUrl(), 'http://127.0.0.1:11434');
  assert.equal(resolveOllamaUrl('http://localhost:11434/api'), 'http://localhost:11434');
  assert.throws(() => resolveOllamaUrl('https://localhost:11434'), /loopback Ollama/);
  assert.throws(() => resolveOllamaUrl('http://ollama.example.com'), /loopback Ollama/);
});

test('Velo Lab bounds chat input and local teaching examples', () => {
  const normalized = normalizeLabRequest({
    model: 'qwen3:8b',
    messages: [
      { role: 'system', content: 'not accepted as system' },
      { role: 'assistant', content: 'Answer' },
      { role: 'user', content: 'Question' },
    ],
    experimentInstruction: 'x'.repeat(5_000),
    teachingExamples: Array.from({ length: 20 }, (_, index) => ({
      prompt: `Prompt ${index}`,
      preferred: `Answer ${index}`,
    })),
    temperature: 9,
  });
  assert.equal(normalized.messages[0].role, 'user');
  assert.equal(normalized.messages.at(-1).content, 'Question');
  assert.equal(normalized.experimentInstruction.length, 4_000);
  assert.equal(normalized.teachingExamples.length, 12);
  assert.equal(normalized.temperature, 2);
});

test('Velo Lab retrieval prefers matching curated guidance', () => {
  const entries = [
    { id: 'research', title: 'Research priority', topic: 'research', summary: 'damage and HP' },
    { id: 'eden', title: 'Stop Stamina', topic: 'Eden', summary: 'save stamina for a target' },
  ];
  assert.deepEqual(
    selectRelevantKnowledge(entries, 'What does Stop Stamina mean?').map((entry) => entry.id),
    ['eden']
  );
});

test('Velo Lab layers experiments and examples without claiming production changes', () => {
  const prompt = buildLabSystemPrompt({
    productionPrompt: 'You are Velo.',
    experimentInstruction: 'Answer in two paragraphs.',
    teachingExamples: [{ prompt: 'Hi', preferred: 'Hello, commander.' }],
  });
  assert.match(prompt, /^You are Velo\./u);
  assert.match(prompt, /LOCAL EXPERIMENT INSTRUCTION/u);
  assert.match(prompt, /LOCAL TEACHING EXAMPLES/u);
  assert.match(prompt, /never changes production by itself/u);
  assert.match(prompt, /Do not request secrets or perform cloud writes/u);
});

test('Velo Lab remains outside every production artifact input and copy list', () => {
  const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
  const vite = fs.readFileSync(path.join(root, 'vite.config.js'), 'utf8');
  const postBuild = fs.readFileSync(path.join(root, 'scripts', 'post-build.mjs'), 'utf8');
  const labApp = fs.readFileSync(path.join(root, 'tools', 'velo-lab', 'app.js'), 'utf8');
  const labServer = fs.readFileSync(path.join(root, 'scripts', 'velo-lab-server.mjs'), 'utf8');

  assert.match(packageJson, /"velo:lab": "node scripts\/velo-lab-server\.mjs"/u);
  assert.doesNotMatch(vite, /velo-lab/u);
  assert.doesNotMatch(postBuild, /velo-lab/u);
  assert.doesNotMatch(labApp, /from\s+['"][^'"]*firebase|https?:\/\/[^'"\s]*workers\.dev/iu);
  assert.doesNotMatch(labServer, /from\s+['"][^'"]*firebase|https?:\/\/[^'"\s]*workers\.dev/iu);
});
