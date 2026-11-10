// tests/smoke.mjs — wiring test: registers the plugin against mock V2 and V1
// contexts and checks skills, commands, level persistence and persona
// injection. Plain node, no dependencies. Run: npm test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.XDG_CONFIG_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'deathshadow-test-'));
const stateFile = path.join(process.env.XDG_CONFIG_HOME, 'opencode', '.deathshadow-active');

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginUrl = pathToFileURL(path.join(here, '..', '.opencode', 'plugins', 'deathshadow.mjs'));
const { default: plugin } = await import(pluginUrl);

// --- V2 ---
const skills = [];
const commands = [];
const hooks = {};
const prompted = [];
const ctx = {
  skill: { transform: async (fn) => fn({ add: (s) => skills.push(s) }) },
  command: { transform: async (fn) => fn({ add: (c) => commands.push(c) }) },
  session: {
    hook: async (name, fn) => { hooks[name] = fn; },
    prompt: async (p) => prompted.push(p),
  },
};
await plugin.setup(ctx);

assert.equal(plugin.id, 'deathshadow');
assert.deepEqual(skills.map((s) => s.id).sort(), ['deathshadow', 'deathshadow-rant', 'deathshadow-review']);
for (const skill of skills) {
  assert.ok(skill.name && skill.description && skill.content.length > 100, 'skill fields: ' + skill.id);
}
assert.deepEqual(commands.map((c) => c.name).sort(), ['deathshadow', 'deathshadow-rant', 'deathshadow-review']);
assert.ok(hooks.context && hooks.compaction, 'context + compaction hooks');

// off by default: no persona injected
let event = { system: [] };
await hooks.context(event);
assert.equal(event.system.length, 0, 'silent while off');

// /deathshadow ultra activates at ultra
const main = commands.find((c) => c.name === 'deathshadow');
await main.execute({ sessionID: 's1', prompt: { text: 'ultra' }, delivery: {} });
assert.equal(fs.readFileSync(stateFile, 'utf8'), 'ultra', 'level persisted');
assert.match(prompted[0].text, /ultra/, 'arguments reach the prompt');
event = { system: [] };
await hooks.context(event);
assert.equal(event.system.length, 1, 'persona injected while active');
assert.match(event.system[0].text, /Jason Knight/);
assert.match(event.system[0].text, /Active level: ultra/);

// review command has no $ARGUMENTS, so arguments are appended, not dropped
const review = commands.find((c) => c.name === 'deathshadow-review');
await review.execute({ sessionID: 's1', prompt: { text: 'index.html' }, delivery: {} });
assert.match(prompted[1].text, /index\.html$/, 'arguments appended');

// --- V1 ---
const v1 = await plugin.server({});
const config = {};
await v1.config(config);
assert.deepEqual(Object.keys(config.command).sort(), ['deathshadow', 'deathshadow-rant', 'deathshadow-review']);
assert.ok(config.skills.paths.some((p) => p.endsWith(path.join('deathshadow', 'skills'))));
const output = { system: ['tail'] };
await v1['experimental.chat.system.transform']({}, output);
assert.match(output.system[0], /^tail\n\n/, 'persona appended to the last system part');
assert.match(output.system[0], /Active level: ultra/);

await v1['command.execute.before']({ command: 'deathshadow', arguments: 'off' });
assert.equal(fs.readFileSync(stateFile, 'utf8'), 'off');
event = { system: [] };
await hooks.context(event);
assert.equal(event.system.length, 0, 'off silences the persona');

console.log('deathshadow smoke test OK');
