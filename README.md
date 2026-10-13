# dsh-plan-build-mode

English | [中文](README.zh.md)

A **Plan / Build** mode switcher for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`), shaped like opencode's Build/Plan selector.

Two things it adds:

1. **A dropdown in the composer**, sitting immediately to the right of the permission control (`完全权限` / `Full access`). It is always visible and switches the **current** session both ways.
2. **A "Default mode" row in Settings → General**, directly under the permission row. It decides which mode **newly created** sessions start in.

## Why it exists

DSH 0.2.0-rc.2 already ships Plan mode (`@deepseek-ai/dsh-plan-mode`), but the official composer chip `PlanChip` is **exit-only**:

```js
if (!(plan.pending ? !plan.active : plan.active)) return null;
```

When the session is not in Plan mode the chip renders nothing at all, so **the only way into Plan mode is typing `/plan` by hand** — there is no discoverable entry point. This plugin takes the same seat (`conversation.input.plan`) and supplies a two-way dropdown instead.

## Features

- **Always-visible dropdown** showing the current mode (`Build` or `Plan`) with a chevron.
- **Two menu items with a check mark**:
  - **Build** — implement directly (`/plan off`)
  - **Plan** — plan only, no changes executed (`/plan`)
- **Blue highlight** while in Plan mode (uses the official `--dsw-alias-state-business-*` tokens).
- **Optimistic display** — while a switch is in flight (`pending`), the button already shows the target mode.
- **Default mode row** — pick `Build` / `Plan` as the starting mode for new sessions. The current session is unaffected; use the composer control for that.

## Install

Pin the version, so pnpm's release cooldown cannot hand you an older build:

```sh
dsh plugin --profile web add dsh-plan-build-mode@1.1.0
```

Straight from GitHub (no npm publish needed):

```sh
dsh plugin --profile web add github:yzhclcl/dsh-plan-build-mode
```

Desktop app: install from the in-app **Plugins** page. The CLI cannot modify `profiles/desktop`.

Then **fully quit and restart** the process serving the profile. The client bundle revision is derived from file metadata (`mtime`/`ctime`/`size`), so a page refresh alone is not enough — a stale revision makes the browser request a URL the server now 404s, which surfaces as `client-modules: bundle script ... failed to load`.

## Use

**Composer dropdown** — click it, pick `Build` or `Plan`. It maps to the shipped `/plan` and `/plan off` commands, so nothing about the plan-mode machinery changes.

**Default mode** — Settings → General → *Default mode*, under the permission row.

> **Note**: the first time you save this row, `~/.dsh/profiles/<profile>/cordis.patch.yml` gains a top-level entry at the end:
>
> ```yaml
> - id: plan-build-mode
>   name: dsh-plan-build-mode
>   config:
>     defaultMode: plan
>   ```
>
> That is the normal `config-editor` write path. Delete the entry (or set `build`) to go back to the default.

## How it works

| Concern | Approach |
| --- | --- |
| Composer seat | `conversation.input.plan` — the `modes` row of the input bar, adjacent to `conversation.input.permission` |
| Shadowing the official chip | `register({ priority: -1 })` — a `single` slot only rejects *equal* priority; the lowest priority renders |
| Reading state | `useProjection("plan")` → `{ active, pending }` |
| Switching | `ctx.remote.commands.execute(sessionId, "/plan" \| "/plan off", [])` |
| Styles | deduplicated injection via `style[data-plugin-css="dsh-plan-build-mode"]`, reusing official size/colour tokens |
| Settings row seat | `settings.general.item` list slot, `id: "default-mode"`, `order: -10` (permission is `-20`, language is `0`) |
| Settings read/write | `ctx.configForms.get("plan-build-mode")` → `remote.settings.mutate(ns, [{op:"set",path:["defaultMode"],value}], revision)` |
| Config field | `z.union([z.const("build"), z.const("plan")]).default("build").volatile()` — only entries carrying volatile fields reach the settings surface |
| Suppressing the auto form | `ctx.inject(["settings"], (child) => child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)))` |
| Pinning new sessions | On `session/created`, if the session is brand new (`seq === 0`, not seeded, no `parentSession`) and the default is `plan`, append `plan/mode` `{ active: true }` — the same first-party event `@deepseek-ai/dsh-plan-mode` writes, and one of the names on the persisted event allowlist |

### What "Plan mode" actually is

Plan mode is a **soft, prompt-level** guide, not a sandbox. All tools stay available in both modes; the harness injects a `plan:policy` prompt section that tells the model to explore and plan rather than execute. Real restriction comes from the **permission presets** (sandbox mode + approval policy), which are independent and read no plan state. If you want a hard read-only guarantee, switch the permission preset to Read Only.

Switching mid-turn is supported: the intent is queued and applied at the next turn boundary, while the button immediately reflects the target.

## Compatibility

| dsh | Status |
| --- | --- |
| `0.2.0-rc.2` | Verified on Windows, web profile — dropdown, settings row, persistence, and new-session pinning all exercised |

Declared range: `>=0.2.0-0 <0.3.0-0`. The plugin targets the 0.2.x seat layout (`conversation.input.plan`, `settings.general.item`) and the `plan/mode` event, so older 0.1.x hosts are out of scope.

## Uninstall

```sh
dsh plugin --profile web remove dsh-plan-build-mode
```

Restart afterwards. The official `PlanChip` returns to its original behaviour immediately — **this plugin modifies no official file**.

## License

MIT
