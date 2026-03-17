---
name: skill-creator
description: How to create, name, and structure agent skills for the repository.
---

# Skill Creator

## Overview

Skills are domain-specific instruction files that teach AI agents how to perform specialized tasks in the codebase. This skill documents how to create new skills correctly.

## File Structure

```
.agents/skills/<skill-name>/SKILL.md
```

Each skill is a **single Markdown file** in its own directory. The directory name is the skill identifier.

### Naming Convention

| Rule | Example |
| --- | --- |
| 2-4 words, descriptive | `code-style`, `skill-creator` |
| Verb prefix for action skills | `write-e2e-test`, `prepare-pull-request` |

## SKILL.md Template

Every SKILL.md has YAML frontmatter and compact Markdown content:

````markdown
---
name: my-skill-name
description: One-sentence description of what this skill covers. Additionally, another one-sentence description when to use it ("Use when..." format).
---

# Skill Title

## Overview

Brief explanation of the domain (2-3 sentences max).

## Prerequisites

List tools/setup required. Cross-platform instructions (macOS + Windows).

## Workflow / Usage

The core content — how to do the thing.

## Related Skills

- [other-skill](../other-skill/SKILL.md) — short why
````

## Writing Rules

### Language

- **English only** — all skills, comments, and documentation must be in English.

### Extend, Don't Duplicate

When requirements evolve, **extend existing AGENTS/skills first**:

1. Find the owning instruction surface:
   - cross-cutting behavior -> root `AGENTS.md`
2. Insert guidance into the most relevant existing section (workflow, tooling, checklist, troubleshooting), not as an unrelated appendix.
3. Add a new skill only when the behavior is reusable and does not fit cleanly into a single existing skill.
4. Link related skills instead of repeating long duplicated instructions.

### Be Compact

- Prefer tables over verbose prose.
- Use code blocks with copy-paste-ready commands.
- Avoid repetition — reference other skills instead of duplicating content.
- Keep the entire skill under ~250 lines. If it's longer, consider splitting into multiple skills.

### Cross-Platform

Skills must work on **macOS, Linux and Windows**. Concrete rules:

| Avoid | Use Instead |
| --- | --- |
| Bash scripts (`.sh`) | Node.js scripts (`.mjs`) |
| `sed`, `awk`, `grep` in scripts | Node.js `fs`, `readline`, regex |
| `curl` in automation scripts | `fetch()` (Node.js 22+) |
| `/usr/local/bin` paths | Tool-specific commands via PATH |
| Unix-specific env (`$HOME`) | `process.env.HOME` or `os.homedir()` |

**Shell examples in SKILL.md** may use `bash` syntax for readability (curl, pipes) since they're human-facing. Automation **scripts** must be `.mjs` files.

### Tools and Prerequisites

Every skill that requires external tools must document setup instructions. Use the project's established toolchain:

| Tool | Setup | Used For |
| --- | --- | --- |
| **Node.js** | v22 LTS (see project-setup) | Frontend, scripts, tooling |
| **Docker / OrbStack** | Desktop install | Local services |
| **MCP servers** | JSON config in `.vscode/mcp.json` | Notion, Playwright, etc. |

When a skill references a tool not in this table, add a Prerequisites section explaining how to install and configure it.

### MCP Server References

If a skill uses an MCP server (e.g., Notion, Playwright), document the config:

```json
{
  "server-name": {
    "type": "http",
    "url": "https://mcp.example.com/mcp"
  }
}
```

And describe authentication/setup steps.

### Security considerations

If a skill involves sensitive operations (e.g., handling secrets, deploying to production), include a "Safety / workflow rules" section with guidelines to minimize risks.

If a skill requires tools, packages or MCP servers from external providers, ask the user for permission to continue, as they may be security risks. For example, if a skill requires installing a new npm package, or a cli tool, or connecting to a new MCP server, ask the user for explicit permission before proceeding!
To make it easier for the user, please also provide a brief explanation of why the tool is needed and what it will be used for, so they can make an informed decision. Include who's the author of the tool, and if it's widely used and trusted in the industry. Check the tool's documentation and source code (if open source) to verify its security and privacy practices. Research who's the owner/maintainer, if it's actively maintained and under which license it's available.

Security is important, and we want to avoid introducing tools that require elevated permissions or have security implications without explicit approval.
If and only IF the user gave you the permission, then proceed installing and describing external tools.
If the user denies permission, do not proceed with the installation or connection, and suggest alternative approaches if possible.

## Registering a Skill

After creating `SKILL.md`, ensure it is discoverable in the workspace skill inventory and has precise frontmatter (`name`, `description`) so agents can select it correctly.

## Quality Checklist

Before committing a new skill:

- [ ] **Naming**: kebab-case directory, matches `name` in frontmatter
- [ ] **Description**: One clear sentence in frontmatter, explains when to use
- [ ] **English**: All content in English
- [ ] **Cross-platform**: No platform-specific scripts, .mjs for automation
- [ ] **Security**: Document any external tools/MCP servers, ask for permission if needed
- [ ] **Prerequisites documented**: How to install every required tool
- [ ] **Compact**: Under ~250 lines, tables over prose
- [ ] **Related skills linked**: Cross-references to relevant skills
- [ ] **Examples included**: At least one copy-paste-ready workflow
- [ ] **Extended existing docs first**: Verified this is not better as an update to an existing instruction/skill section
