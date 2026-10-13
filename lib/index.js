/**
 * Host half of the Plan / Build mode switcher.
 *
 * The composer control is entirely browser-side: it talks to the existing
 * `/plan` command through the remote command channel and reads state from the
 * `plan` session projection owned by `@deepseek-ai/dsh-plan-mode`.
 *
 * This half owns the *default* mode for newly created sessions:
 *
 *   - `Config.defaultMode` is a volatile field, which is what makes it appear
 *     on the settings surface (`@deepseek-ai/dsh-settings` only serves profile
 *     entries whose schema carries volatile fields) and what lets the loader
 *     push a new value into the running plugin without a reload.
 *   - On `session/created` a brand-new conversation is pinned to the configured
 *     mode by appending the first-party `plan/mode` event — the same event
 *     `@deepseek-ai/dsh-plan-mode` itself writes, and one of the few names on
 *     the persisted session-event allowlist.
 *
 * "Brand new" is deliberately narrow: `seq === 0` (an empty event log),
 * not seeded (excludes fork and subagent sessions) and no `parentSession`.
 * Restored sessions and live ones therefore keep whatever mode they already
 * carry; only the default for the next conversation changes.
 */
import z from "@deepseek-ai/schemastery";

/** Plan / Build default for newly created sessions. */
export const Config = z.object({
  defaultMode: z
    .union([z.const("build"), z.const("plan")])
    .default("build")
    .description("新会话默认使用的模式（build = 直接创作，plan = 先出计划）。")
    .volatile(),
});

export const inject = ["sessions"];

/** Append the plan-mode marker that `@deepseek-ai/dsh-plan-mode` reads back. */
const PLAN_EVENT = "plan/mode";

export function apply(ctx, config) {
  // This plugin ships its own settings row, so suppress the auto-generated
  // form page for the same namespace (mirrors the shipped permission row).
  ctx.inject(["settings"], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
  });

  const defaultMode = () => {
    try {
      const value = config.defaultMode.get();
      return value === "plan" ? "plan" : "build";
    } catch {
      return "build";
    }
  };

  const pin = (session) => {
    try {
      if (session.header.isSeeded === true) return;
      if (session.header.parentSession !== void 0) return;
      if (session.seq !== 0) return;
      // `build` is the projection's own initial state; writing an event for it
      // would only add noise to the log.
      if (defaultMode() !== "plan") return;
      session.append(PLAN_EVENT, { active: true });
    } catch (error) {
      // `SessionStore.announce` runs creation listeners without a per-listener
      // guard, so a throw here would escape into session creation.
      ctx.logger.warn(
        "dsh-plan-build-mode: failed to pin the default plan mode: %o",
        error,
      );
    }
  };

  ctx.on("session/created", (session) => {
    pin(session);
  });
  // Sessions that already existed when this plugin activated (the same
  // belt-and-braces sweep `@deepseek-ai/dsh-permission-presets` performs).
  for (const session of ctx.sessions.list()) pin(session);
}
