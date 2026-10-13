window.__ModuleLoader__.load({
  id: "dsh-plan-build-mode",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const h = React.createElement;
    const primitives = require("@deepseek-ai/dsh-client-ui-primitives");
    const Menu = primitives.Menu;
    const IconPlanOutlineRegular = primitives.IconPlanOutlineRegular;
    const IconCodeOutlineRegular = primitives.IconCodeOutlineRegular;
    const IconChevronDownOutlineRegular = primitives.IconChevronDownOutlineRegular;

    const NS = "plan-build-mode";
    const SLOT = "conversation.input.plan";
    const CSS_ID = "dsh-plan-build-mode";
    // The settings namespace is the plugin's loader-entry id, which is what
    // `@deepseek-ai/dsh-settings` keys its forms on.
    const SETTINGS_NS = "plan-build-mode";
    const ROW_SLOT = "settings.general.item";
    const ROW_ID = "default-mode";
    // `settings.general.item` is a list slot. Occupied orders: permission -20,
    // language 0, transcript-view 12, developer-tools 15, link-opening 17,
    // performance-usage 30, current-version 100. -10 lands directly under the
    // permission row and above language.
    const ROW_ORDER = -10;

    const zh = {
      "mode.build": "Build",
      "mode.plan": "Plan",
      "mode.aria": "当前模式：{name}，点击切换",
      "mode.build.title": "Build 模式 — 直接动手实现（点击切换）",
      "mode.plan.title": "Plan 模式 — 只做计划，不执行改动（点击切换）",
      "mode.switchFailed": "切换模式失败",
      "default.title": "默认模式",
      "default.description": "选择新会话默认使用的 Plan / Build 模式",
      "default.loading": "加载中",
      "default.saveFailed": "默认模式未保存",
    };
    const en = {
      "mode.build": "Build",
      "mode.plan": "Plan",
      "mode.aria": "Current mode: {name}, press to switch",
      "mode.build.title": "Build mode — implement directly (press to switch)",
      "mode.plan.title": "Plan mode — plan only, no changes executed (press to switch)",
      "mode.switchFailed": "Failed to switch mode",
      "default.title": "Default mode",
      "default.description": "Plan or Build mode for newly created sessions",
      "default.loading": "Loading",
      "default.saveFailed": "The default mode was not saved",
    };

    const CSS = [
      ".pbm-wrap{align-items:center;gap:6px;display:inline-flex}",
      ".pbm-trigger{border-radius:var(--dsw-radius-sm);min-width:0;max-width:220px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;outline:none;align-items:center;gap:4px;padding:0 4px 0 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex}",
      ".pbm-trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
      ".pbm-trigger:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}",
      ".pbm-trigger:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}",
      ".pbm-triggerIcon{flex:none;display:inline-flex}",
      ".pbm-triggerIcon svg{width:14px;height:14px}",
      ".pbm-triggerLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}",
      ".pbm-chevron{color:var(--dsw-alias-label-caption);flex:none;transition:transform .12s;display:inline-flex}",
      ".pbm-chevronOpen{transform:rotate(180deg)}",
      ".pbm-active{background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-state-business-primary);padding:0 8px}",
      ".pbm-active:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-business-tertiary), var(--dsw-alias-state-business-primary) 6%)}",
      ".pbm-error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}",
      // Settings row, mirroring the shipped permission row's box model.
      ".pbm-row{border-bottom:.5px solid var(--dsw-alias-border-l2);align-items:center;gap:8px;padding:16px 0;display:flex}",
      ".pbm-rowText{flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:48px;display:flex}",
      ".pbm-rowTitle{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}",
      ".pbm-rowDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}",
      ".pbm-selector{border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-module-platform);height:36px;font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;border:none;align-items:center;gap:12px;padding:0 14px;font-size:14px;line-height:22px;display:inline-flex}",
      ".pbm-selector:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
      ".pbm-selector:disabled{cursor:default;color:var(--dsw-alias-label-dimmed)}",
      ".pbm-selectorChevron{flex:none}",
    ].join("");

    function ensureStyles() {
      if (document.querySelector('style[data-plugin-css="' + CSS_ID + '"]') !== null) return;
      const style = document.createElement("style");
      style.setAttribute("data-plugin-css", CSS_ID);
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    /**
     * Plan / Build mode selector.
     *
     * `useProjection` is injected by the slot renderer; `switchTo` comes from
     * this entry's `inject` face; `t` from the entry's `locale`.
     */
    function ModeSelect({ useProjection, locked, switchTo, t }) {
      const plan = useProjection("plan");
      const [open, setOpen] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState(null);
      const aliveRef = React.useRef(true);
      React.useEffect(() => () => {
        aliveRef.current = false;
      }, []);

      if (plan === void 0) return null;

      // `pending` marks an in-flight switch: show the mode being moved to.
      const effective = plan.pending ? !plan.active : plan.active;
      const current = effective ? "plan" : "build";

      const choose = (id) => {
        setOpen(false);
        if (id === current) return;
        setBusy(true);
        setError(null);
        Promise.resolve(switchTo(id)).then(
          (failure) => {
            if (!aliveRef.current) return;
            setBusy(false);
            setError(failure === void 0 ? null : failure);
          },
          (reason) => {
            if (!aliveRef.current) return;
            setBusy(false);
            setError(reason instanceof Error ? reason.message : String(reason));
          },
        );
      };

      const items = [
        {
          id: "build",
          label: t("mode.build"),
          icon: h(IconCodeOutlineRegular, { size: 14 }),
        },
        {
          id: "plan",
          label: t("mode.plan"),
          icon: h(IconPlanOutlineRegular, { size: 14 }),
        },
      ];

      const label = t(effective ? "mode.plan" : "mode.build");
      const trigger = h(
        "button",
        {
          type: "button",
          className: "pbm-trigger" + (effective ? " pbm-active" : ""),
          "aria-label": t("mode.aria", { name: label }),
          title: t(effective ? "mode.plan.title" : "mode.build.title"),
          disabled: locked === true || busy,
          onClick: () => setOpen(!open),
        },
        h(
          "span",
          { className: "pbm-triggerIcon", "aria-hidden": true },
          h(effective ? IconPlanOutlineRegular : IconCodeOutlineRegular, { size: 14 }),
        ),
        h("span", { className: "pbm-triggerLabel" }, label),
        h(
          "span",
          {
            className: "pbm-chevron" + (open ? " pbm-chevronOpen" : ""),
            "aria-hidden": true,
          },
          h(IconChevronDownOutlineRegular, {}),
        ),
      );

      return h(
        "span",
        { className: "pbm-wrap" },
        h(Menu, {
          open,
          anchor: trigger,
          items,
          selectedId: current,
          onSelect: choose,
          onClose: () => setOpen(false),
          side: "top",
          portal: true,
        }),
        error !== null
          ? h(
              "span",
              { className: "pbm-error", role: "status", title: error },
              t("mode.switchFailed"),
            )
          : null,
      );
    }

    /** The configured default, narrowed to the two modes the host accepts. */
    function modeOf(value) {
      return value !== null && typeof value === "object" && value.defaultMode === "plan"
        ? "plan"
        : "build";
    }

    /**
     * "Default mode" row for Settings → General, sitting directly under the
     * permission row. It changes the default for *subsequent* sessions only;
     * the composer control keeps switching the current one.
     *
     * `form` is the shared per-namespace form service (`ctx.configForms.get`),
     * which already derives from the describe mirror and queues writes against
     * the right revision — the shipped permission row's path.
     */
    function DefaultModeRow({ select, useDefaultMode, t }) {
      const state = useDefaultMode((snapshot) => snapshot);
      const [open, setOpen] = React.useState(false);
      const [failed, setFailed] = React.useState(false);

      React.useEffect(() => {
        if (state.writable !== true) setOpen(false);
      }, [state.writable]);

      if (state.status === "unavailable") return null;

      const busy = state.status === "loading";
      const current = modeOf(state.value);
      const label = busy
        ? t("default.loading")
        : t(current === "plan" ? "mode.plan" : "mode.build");
      const description = failed ? t("default.saveFailed") : t("default.description");

      const items = [
        { id: "build", label: t("mode.build"), icon: h(IconCodeOutlineRegular, { size: 14 }) },
        { id: "plan", label: t("mode.plan"), icon: h(IconPlanOutlineRegular, { size: 14 }) },
      ];

      const anchor = h(
        "button",
        {
          type: "button",
          className: "pbm-selector",
          "aria-haspopup": "menu",
          "aria-expanded": open,
          disabled: busy || state.writable !== true,
          onClick: () => setOpen(!open),
        },
        label,
        h(IconChevronDownOutlineRegular, { className: "pbm-selectorChevron" }),
      );

      return h("div", { className: "pbm-row" }, [
        h("div", { key: "text", className: "pbm-rowText" }, [
          h("div", { key: "title", className: "pbm-rowTitle" }, t("default.title")),
          h(
            "div",
            {
              key: "desc",
              className: "pbm-rowDesc",
              role: failed ? "alert" : void 0,
            },
            description,
          ),
        ]),
        h(Menu, {
          key: "menu",
          open,
          anchor,
          items,
          selectedId: current,
          onSelect: (id) => {
            setOpen(false);
            setFailed(false);
            select(id).then((accepted) => {
              if (accepted !== true) setFailed(true);
            });
          },
          onClose: () => setOpen(false),
          align: "end",
          portal: true,
        }),
      ]);
    }

    const inject = ["slots", "locale", "remote", "remote.commands", "configForms"];

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "plan-build-mode: dictionaries");
      ensureStyles();

      ctx.slots.inject(SLOT, () =>
        ctx.slots.register(
          {
            name: SLOT,
            // Shadow the shipped PlanChip (priority 0): lowest priority renders.
            priority: -1,
            locale: NS,
            inject: (sessionId) => ({
              switchTo: async (target) => {
                const command = target === "plan" ? "/plan" : "/plan off";
                const result = await ctx.remote.commands.execute(sessionId, command, []);
                if (!result.ok) return result.error.message + " (" + result.error.code + ")";
                if (result.value === void 0) return "unknown command: " + command;
                return null;
              },
            }),
          },
          ModeSelect,
        ),
      );

      const form = ctx.configForms.get(SETTINGS_NS);
      ctx.slots.inject(ROW_SLOT, () =>
        ctx.slots.register(
          {
            name: ROW_SLOT,
            id: ROW_ID,
            order: ROW_ORDER,
            locale: NS,
            inject: () => ({
              hooks: { defaultMode: form },
              select: (mode) => form.set("defaultMode", mode),
            }),
          },
          DefaultModeRow,
        ),
      );
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
