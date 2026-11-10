# deathshadow

npm package: the deathshadow skill family (Jason Knight persona) for
OpenCode, pi-compatible via `pi.skills`.

## Layout

- `skills/<name>/SKILL.md` — the three skills; the source of truth for the
  persona, the review and the rant
- `.opencode/plugins/deathshadow.mjs` — OpenCode plugin. V2 (`id` + `setup`)
  and V1 (`server()`) in one default export. Registers skills + commands,
  injects the persona into the system prompt each turn while a level is
  active, persists `/deathshadow` level switches in
  `$XDG_CONFIG_HOME/opencode/.deathshadow-active` (default for new sessions:
  `.deathshadow-default`). Factory default: **off**.
- `.opencode/plugins/deathshadow-frontmatter.cjs` — frontmatter parser.
  Separate module on purpose: OpenCode's legacy plugin loader treats every
  function exported from the plugin module as a plugin.
- `.opencode/command/*.md` — slash commands: dense one-paragraph versions of
  the skills
- `tests/smoke.mjs` — wiring test against mock V2/V1 plugin contexts

## Test

`npm test` — plain node, no dependencies, uses a temp `XDG_CONFIG_HOME`.

## Publish

`npm publish` — unscoped package, publishes public. Requires `npm login` as
the package owner. Tag releases `vX.Y.Z`.
