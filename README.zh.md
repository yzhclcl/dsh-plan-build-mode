# dsh-plan-build-mode

[English](README.md) | 中文

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）提供 **Plan / Build** 模式切换，形如 opencode 的 Build/Plan 选择器。

它加了两样东西：

1. **输入框里的下拉控件**，紧挨在权限控件（「完全权限」）右侧。常显，可**双向**切换**当前**会话的模式。
2. **设置 → 通用设置**里的「默认模式」一行，位于权限行正下方。决定**新建会话**默认进入哪个模式。

## 它为什么存在

DSH 0.2.0-rc.2 **已经内置** Plan 模式（`@deepseek-ai/dsh-plan-mode`），但官方 composer 徽章 `PlanChip` 是「**只出不进**」的：

```js
if (!(plan.pending ? !plan.active : plan.active)) return null;
```

不在 Plan 模式时整个控件不渲染，因此**进入 Plan 只能手敲 `/plan` 命令**——用户无从发现。本插件用同一个座位（`conversation.input.plan`），换成一个双向可切换的下拉。

## 功能

- **常显下拉按钮**：显示当前模式（`Build` / `Plan`）+ 箭头图标。
- **菜单两项带勾选**：
  - **Build** — 直接动手实现（`/plan off`）
  - **Plan** — 只做计划、不执行改动（`/plan`）
- 处于 Plan 时按钮**变蓝高亮**（沿用官方 `--dsw-alias-state-business-*` 令牌）。
- **乐观显示**：切换进行中（`pending`）时按钮立刻反映目标模式。
- **默认模式行**：可选 `Build` / `Plan` 作为新会话的起始模式。当前会话不受影响，切它请用输入框控件。

## 安装

钉住版本，避免 pnpm 的发布冷却期给你装到旧版：

```sh
dsh plugin --profile web add dsh-plan-build-mode@1.1.0
```

直接从 GitHub 装（无需发布到 npm）：

```sh
dsh plugin --profile web add github:yzhclcl/dsh-plan-build-mode
```

桌面端：在应用内的**插件**页安装。CLI 不能修改 `profiles/desktop`。

装完必须**完全退出并重启**为这个 profile 提供服务的进程。客户端 bundle 的 rev 由文件元数据（`mtime`/`ctime`/`size`）算出，**只刷新页面不够**——rev 失配会让浏览器请求一个服务器已经 404 的地址，表现为 `client-modules: bundle script ... failed to load`。

## 使用

**输入框下拉** — 点开选 `Build` 或 `Plan`。底层就是官方 `/plan` 与 `/plan off` 命令，plan-mode 机制本身没有任何改动。

**默认模式** — 设置 → 通用设置 → 「默认模式」，在权限行下面。

> **注意**：首次保存这一行后，`~/.dsh/profiles/<profile>/cordis.patch.yml` 末尾会自动追加一个顶层条目：
>
> ```yaml
> - id: plan-build-mode
>   name: dsh-plan-build-mode
>   config:
>     defaultMode: plan
>   ```
>
> 这是 `config-editor` 的正常写入行为。想恢复默认，把这个条目删掉或把值改成 `build` 即可。

## 实现要点

| 关注点 | 做法 |
| --- | --- |
| 输入框落点 | `conversation.input.plan` —— 输入栏的 `modes` 行，与 `conversation.input.permission`（「完全权限」）相邻 |
| 遮蔽官方徽章 | `register({ priority: -1 })` —— `single` 槽只拒绝**相同** priority，最小者渲染 |
| 读状态 | `useProjection("plan")` → `{ active, pending }` |
| 切换 | `ctx.remote.commands.execute(sessionId, "/plan" \| "/plan off", [])` |
| 样式 | `style[data-plugin-css="dsh-plan-build-mode"]` 去重注入，复用官方尺寸/配色令牌 |
| 设置行落点 | `settings.general.item` list 槽，`id: "default-mode"`、`order: -10`（permission 是 `-20`，language 是 `0`） |
| 设置读写 | `ctx.configForms.get("plan-build-mode")` → `remote.settings.mutate(ns, [{op:"set",path:["defaultMode"],value}], revision)` |
| 配置字段 | `z.union([z.const("build"), z.const("plan")]).default("build").volatile()` —— 只有含 volatile 字段的条目才会出现在设置面 |
| 抑制自动表单 | `ctx.inject(["settings"], (child) => child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)))` |
| 新会话生效 | `session/created` 时，若会话「全新」（`seq === 0` 且非 seeded 且无 `parentSession`）且默认值是 `plan`，则 append `plan/mode` `{ active: true }` —— 这正是 `@deepseek-ai/dsh-plan-mode` 自己写的事件，且在持久化事件白名单内 |

### Plan 模式到底是什么

Plan 模式是**提示词层面的软引导**，不是沙箱。两种模式下所有工具**始终可用**；harness 往系统提示注入一段 `plan:policy`，要求模型先探索、先规划，而不是直接执行。真正的限制来自**权限预设**（沙箱模式 + 审批策略），那是独立的一套，不读 plan 状态。想要硬性只读保证，请把权限预设切到「只读」。

**回合中途切换是支持的**：意图会排队、在下一个回合边界落盘生效，而按钮会立刻反映目标模式。

## 兼容性

| dsh | 状态 |
| --- | --- |
| `0.2.0-rc.2` | Windows + web profile 已实测 —— 下拉、设置行、持久化、新会话钉默认值均验证通过 |

声明范围：`>=0.2.0-0 <0.3.0-0`。本插件依赖 0.2.x 的座位布局（`conversation.input.plan`、`settings.general.item`）与 `plan/mode` 事件，0.1.x 宿主不在支持范围内。

## 卸载

```sh
dsh plugin --profile web remove dsh-plan-build-mode
```

之后重启。官方 `PlanChip` 立即恢复原样——**本插件不修改任何官方文件**。

## 许可证

MIT
