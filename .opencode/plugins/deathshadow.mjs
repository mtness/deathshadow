// deathshadow — OpenCode plugin.
//
// Registers the deathshadow skills and slash commands, and — while a level
// is active — injects the Jason Knight persona into the system prompt every
// turn. Modeled on @dietrichgebert/ponytail's plugin (MIT), cut to the lean
// v1: no multi-agent hooks, no band.
//
// OpenCode loads this as a server plugin — add it to your opencode.json:
//   { "plugins": ["deathshadow"] }
//
// One default export serves both plugin APIs: V2 reads `id` + `setup`, V1
// calls `server()`.

import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The frontmatter parser is CommonJS; bridge to it from this ES module.
const require = createRequire(import.meta.url);
const { parseCommandFile, parseSkillFile } = require('./deathshadow-frontmatter.cjs');

const LEVELS = ['lite', 'full', 'ultra', 'off'];

const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
const statePath = path.join(configHome, 'opencode', '.deathshadow-active');
const defaultPath = path.join(configHome, 'opencode', '.deathshadow-default');

function readState(file) {
  try {
    return fs.readFileSync(file, 'utf8').trim().toLowerCase();
  } catch (e) {
    return '';
  }
}

function writeState(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}

function normalize(mode) {
  return LEVELS.includes(mode) ? mode : null;
}

// Unlike ponytail the factory default is OFF: a profane persona should not
// gatecrash every session. /deathshadow turns it on.
function getDefault() {
  return normalize(readState(defaultPath)) || 'off';
}

function readMode() {
  return normalize(readState(statePath)) || getDefault();
}

function persistMode(args) {
  const wanted = String(args == null ? '' : args).trim().toLowerCase();
  const [first, second] = wanted.split(/\s+/);
  // `/deathshadow default <level>` saves the level for new sessions.
  if (first === 'default') {
    const mode = normalize(second);
    if (mode) {
      writeState(defaultPath, mode);
      console.log('deathshadow default ' + mode);
    }
    return;
  }
  // Bare /deathshadow switches on at full, or keeps the active level.
  const mode = !wanted ? (readMode() === 'off' ? 'full' : readMode()) : normalize(wanted);
  if (!mode) return;
  writeState(statePath, mode);
  console.log('deathshadow ' + mode);
}

// The persona injected every turn is the deathshadow skill itself: the
// SKILL.md body plus the active level. Read once, cached.
let instructionsCache = null;
function getInstructions(mode) {
  if (instructionsCache === null) {
    const file = path.resolve(__dirname, '../../skills/deathshadow/SKILL.md');
    const parsed = parseSkillFile(file);
    instructionsCache = parsed ? parsed.body.trim() : '';
  }
  return instructionsCache + '\n\nActive level: ' + mode + '.';
}

function readCommands() {
  const dir = path.join(__dirname, '..', 'command');
  try {
    return fs.readdirSync(dir)
      .filter((file) => file.endsWith('.md'))
      .map((file) => {
        const parsed = parseCommandFile(path.join(dir, file));
        return parsed && { name: path.basename(file, '.md'), ...parsed };
      })
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

function readSkills() {
  const dir = path.resolve(__dirname, '../../skills');
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const file = path.join(dir, entry.name, 'SKILL.md');
        const parsed = parseSkillFile(file);
        return parsed && {
          id: entry.name,
          name: parsed.name || entry.name,
          description: parsed.description,
          path: file,
          content: parsed.body,
        };
      })
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

// Templates without $ARGUMENTS would drop what the user typed after the
// command (/deathshadow-rant tailwind), so append it instead.
function withArguments(template, input) {
  const text = String(input == null ? '' : input);
  if (template.includes('$ARGUMENTS')) return template.replaceAll('$ARGUMENTS', text);
  return text.trim() ? template + '\n\n' + text.trim() : template;
}

export default {
  id: 'deathshadow',

  async setup(ctx) {
    const commands = readCommands();
    const skills = readSkills();

    await ctx.skill.transform((editor) => {
      for (const skill of skills) editor.add(skill);
    });

    await ctx.command.transform((editor) => {
      for (const command of commands) {
        editor.add({
          name: command.name,
          description: command.description,
          execute: async ({ sessionID, prompt, delivery }) => {
            if (command.name === 'deathshadow') persistMode(prompt.text);
            const withoutMentions = (items) => items?.map(({ mention, ...item }) => item);
            await ctx.session.prompt({
              ...prompt,
              sessionID,
              text: withArguments(command.template, prompt.text),
              files: withoutMentions(prompt.files),
              agents: withoutMentions(prompt.agents),
              skills: withoutMentions(prompt.skills),
              delivery,
            });
          },
        });
      }
    });

    // Push the persona as its own system part every turn, so the level set
    // by /deathshadow holds for the session — and stays silent (off) when it
    // was never invited. Summary compaction shares the event shape; without
    // its own hook the compacted session would lose the persona.
    const addPersona = (event) => {
      const mode = readMode();
      if (mode === 'off') return;
      event.system.push({ type: 'text', text: getInstructions(mode) });
    };
    await ctx.session.hook('context', addPersona);
    await ctx.session.hook('compaction', addPersona);
  },

  // OpenCode V1: the same three behaviors on the V1 hook names.
  async server({ client } = {}) {
    const log = (level, message) => {
      try { client && client.app && client.app.log({ body: { service: 'deathshadow', level, message } }); } catch (e) {}
    };

    return {
      // Register slash commands + skills directory.
      config: async (config) => {
        if (!config.command) config.command = {};
        for (const command of readCommands()) {
          config.command[command.name] = { description: command.description, template: command.template };
        }

        config.skills = config.skills || {};
        config.skills.paths = config.skills.paths || [];
        const skillsDir = path.resolve(__dirname, '../../skills');
        if (!config.skills.paths.includes(skillsDir)) {
          config.skills.paths.push(skillsDir);
        }
      },

      'experimental.chat.system.transform': async (_input, output) => {
        const mode = readMode();
        if (mode === 'off') return;
        const instructions = getInstructions(mode);
        if (output.system.length > 0) {
          output.system[output.system.length - 1] += '\n\n' + instructions;
        } else {
          output.system.push(instructions);
        }
      },

      'command.execute.before': async (input) => {
        if (!input || input.command !== 'deathshadow') return;
        persistMode(input.arguments);
        log('info', 'deathshadow ' + readMode());
      },
    };
  },
};
