# compelem Usage Skill

Guidance for AI agents working with the **compelem** WebComponent library.

## Quick Reference

**Version:** 0.30.0-beta.4
**Package:** `compelem`
**Author:** holyhigh2
**Internals:** signal-driven, no VDOM, dependencies collected at compile time

---

## Prerequisites (critical — read first)

compelem is **not a runtime-only library**. Every decorator exported from the package is a no-op stub; the view is generated at compile time into `static __ce_static__.buildTemplate`. Without the compiler plugin, instantiating any component throws:

```
[compelem] <x-foo> Component is not compiled @compelem/compiler plugin is required
```

```json
// tsconfig.json
{ "compilerOptions": { "experimentalDecorators": true } }
```

```ts
// vite.config.ts
import { compelemCompiler } from '@compelem/compiler'

export default defineConfig({
  plugins: [compelemCompiler()],
  oxc: { decorator: { legacy: true } },  // Vite 8 / Oxc: legacy decorators must be explicit
  esbuild: { keepNames: true },          // @tag registers by target.name
})
```

`myfx` (`^2.0.0-beta.4`) is a **peerDependency** left as a build-time external — the host app must install it (`@compelem/compiler` peers on the same range).

---

## Installation & Imports

```ts
import {
  CompElem, tag, prop, state, computed, watch, emits,
  csscope, Csscope, css, h, createRef,
  forEach, ifTrue, ifElse, when, show, model, bind, classes, styles, slot, html,
  query, queryAll, QueryCache, event, debounced, throttled, onced,
  defineComponents, defineComponentsSubset,
  signal, signalComputed, effect, batch, untrack, onCleanup, flushSync, onEffectError,
  setDefaults, slotOriginOf,
} from "compelem";
```

> There is **no** `transition` directive, `<transition>` pseudo-tag, animation runtime, or `startViewTransition` export. Those were removed together with `src/animate/`.

---

## Registering components

`@tag("x-foo")` only records the class into `DefinitionComponentMap`. It does **not** call `customElements.define`. Register once at the app entry:

```ts
import { defineComponents, defineComponentsSubset } from 'compelem'
defineComponents()                     // all @tag components
// defineComponentsSubset(['x-foo'])   // or a subset, to cut startup cost

@tag('x-foo', true)                    // or immediate registration
```

Skipping this leaves every `ce-*` / `x-*` element as an **un-upgraded shell** — present in the DOM, but inert and empty.

---

## Component Skeleton

```ts
@emits('change')
@tag("my-counter")
export class MyCounter extends CompElem {
  @prop({ type: Number, model: true }) value = 0;
  @prop({ type: Array }) items: Array<{ id: number, name: string }>;  // no default → type is required
  @state count = 0;

  @computed
  get doubled() { return this.count * 2 }

  @watch('count', { immediate: true })
  onCount(nv: number, ov: number) { console.log(nv, ov) }

  @csscope(Csscope.INNER)
  static get css() {
    return css`button{ color: var(--c, black); }`
  }
  get cssVars() { return { c: this.count > 9 ? 'red' : 'black' } }

  mounted() {
    this.emit('change', { value: this.count })
  }

  render(): Template {
    return h`<div>
      <span>${this.label}: ${this.count}</span>
      <button @click="${() => this.count++}">+1</button>
      ${forEach(this.items, it => it.id, it => h`<li key=${it.id}>${it.name}</li>`)}
      ${ifElse(this.count > 5, () => h`<b>big</b>`, () => h`<i>small</i>`)}
    </div>`
  }
}
```

---

## Key Decorators

All are compile-time-only. Wrong arguments or wrong targets fail the **build** (E-codes), never silently at runtime.

| Decorator | Target | Notes |
|---|---|---|
| `@tag(name, immediate?)` | class | `immediate=true` → auto `customElements.define` |
| `@prop(options?)` | FIELD | External input, read-only inside. Options: `type`, `required`, `model`, `attribute`, `shallow`, `hasChanged`, `converter`, `isValid`. No default → `type` required. Field name must be lowerCamelCase |
| `@state(options?)` | FIELD | Internal mutable reactive state. `{shallow, hasChanged}`. Seed from a prop with the initializer: `@state page = this.pageSize`. `@state({prop:'x'})` is **removed** (`E-STATE-ARG`) |
| `@computed` | METHOD (getter) | Cached; recomputes only when tracked deps change |
| `@watch(source, options?)` | METHOD | `source` accepts dotted paths and arrays; options `{immediate, deep, once}`; handler `(nv, ov, sourceName, subNv?, subOv?)`; runs inside `untrack()` |
| `@emits(...names)` | class | Declares outbound events; supports `'update:*'`. Parent listeners must use kebab-case (`state-ready`) |
| `@csscope(...scopes)` | **static getter** | `INNER` → shadowRoot `adoptedStyleSheets`; `HOST` → nearest host shadowRoot; `GLOBAL` → document |
| `@event(name, targetFn?)` | METHOD | Binds a **non-view** event (window/document/the component itself). Target defaults to `this` |
| `@query(sel, cache?)` | FIELD | `shadowRoot.querySelector`; result is a reactive field gated by `isMounted` (`undefined` before `mounted()`). `QueryCache.ONCE` caches the first hit |
| `@queryAll(sel)` | FIELD | Same, but `querySelectorAll`. **No** cache parameter |
| `@debounced(wait, immediate?)` | METHOD | Debounced; `immediate=true` fires on the leading edge |
| `@throttled(wait)` | METHOD | Throttled |
| `@onced` | METHOD | Executes only once (a non-once copy `_$__`-suffixed is also generated) |

---

## Template Syntax (`h` tag function)

```ts
h`<div @click="${handler}" .value="${v}" ?disabled="${d}" *view-box:camel="${vb}">`
```

| Prefix | Meaning | Constraint |
|---|---|---|
| `@` | Event listener | Modifiers via dots: `@click.stop.once` |
| `.` | Component prop | Value **must be an interpolation**; only on component tags |
| `?` | Boolean attribute toggle | |
| `*` | Evaluate, then set the attribute | Format conversion: `:camel` / `:kebab` / `:snake` |
| `key=${id}` | `forEach` diff key | Duplicate / nil keys skip the item and report |
| `ref="${refObj}"` | DOM reference via `createRef()` | For nodes moved out of the view (tooltip/toast/overlay) |

Attribute names containing uppercase letters are kebab-cased **at compile time**, and only for custom/component tags (native tags keep browser lowercasing).

Insertion points: ATTR (inside an attribute value, one interpolation) · PROP (`.x` on a component tag, one interpolation) · TEXT (tag body, many) · SLOT (like TEXT but host must be a component) · TAG (`${show(...)}` directly on the tag).

> Directive scope (`EnterPointType`) has only three values — `TEXT` / `SLOT` / `TAG`. ATTR/PROP positions accept plain value expressions, never directives.

---

## Built-in Directives

| Directive | Position | Notes |
|---|---|---|
| `bind(obj)` | TAG | Sets props vs attributes automatically based on the target |
| `show(visible, cbk?)` | TAG | Toggles via `display` |
| `model(value, updateProp?, modelProp?)` | TAG | Two-way binding; adapts input/textarea/select/checkbox. **Static paths only** |
| `classes(obj\|arr\|str)` | TAG | Mergeable with a static `class` |
| `styles(obj\|str\|arr)` | TAG | Values may be `{value, important}`; mergeable with static `style` |
| `forEach(list, keyFn, tmpl)` | TEXT/SLOT | Keyed diff |
| `ifTrue(cond, tmpl)` | TEXT/SLOT | Renders when true |
| `ifElse(cond, ifTmpl, elseTmpl)` | TEXT/SLOT | Two branches |
| `when(value, cases)` | TEXT/SLOT | Array of `[(v)=>boolean, TplFn]` or a record; `'default'` is a reserved key |
| `slot(tmpl, name?)` | SLOT | Function slot, receives slot props |
| `html(str)` | TAG/TEXT/SLOT | Raw HTML. A module-level `const` in the same file can be folded into the build at compile time |

Structural directives (`forEach` / `ifTrue` / `ifElse` / `when` / `slot`) create or remove DOM subtrees. Non-structural ones (`show` / `bind` / `classes` / `styles` / `model` / `html`) only patch existing DOM.

---

## Lifecycle Hooks

```ts
propsReady(props)  // props resolved, before render
render()           // returns Template | null (runtime stub; compiler generates the view)
beforeMount()      // before first mount
mounted()          // after first mount; @query/i18n become readable here
afterUpdate()      // only when this component's view effects actually ran in the flush
beforeDestroyed()
destroyed()
```

Creation order: constructor (reads `__ce_static__`, installs `slots` accessor) → `setup()` → init props → init states → `propsReady` → shadowRoot + base sheets → `buildStaticView` → watch effects + `cssVars` effect → slot hooks → `beforeMount` → `isMounted = true` → fragment appended → `mounted`.

**No `shouldUpdate` / `updated`.** The update unit is an effect, not a component render pass. Use `@watch('field')` to react to a specific change; gate a subtree with `ifElse` or a `@computed` that drops the dependency via `untrack`.

---

## Instance Members

Read-only getters: `cid`, `attrs`, `props`, `renderRoot`, `renderRoots`, `parentComponent`, `wrapperComponent`, `rootComponent`, `slots`, `slotHooks`, `cssSheets`, `cssVars`, `isMounted`, `isDestroyed`.

- `slots` is a `Record<string, Node[]>` (unnamed = `default`), backed by a signal, installed on the concrete subclass prototype at construction. **Never declare `get slots()` in a subclass** — it shadows the framework accessor and always reads an empty stub.
- There is **no** `globalCssSheet` getter.

## Instance Methods

- `emit(evName, arg?, event?)` — fire a component event
- `nextTick(cbk)` — run after the next update
- `forceUpdate()` — re-run all **view** effects (skips `@watch` / `cssVars`)
- `updateProps(props, force?)` — batch-update props, triggers `@watch`
- `insertStyleSheet(sheet)` — add a sheet to this instance's shadowRoot
- `getSubViewNodes(tmplFn, ...args)` — render a compiled sub-view callback into nodes (the callback must carry provenance registered via `slot()`)
- `destroy()` — tear down

---

## Dynamic CSS Variables

```ts
get cssVars() {
  return {
    primaryColor: this.theme === 'dark' ? '#fff' : '#000',  // → --primary-color
    spacing: `${this.size}px`                               // → --spacing
  }
}
```

Keys are camelCased and kebab-cased into global (unprefixed) custom properties written to the host's inline style. Empty values become `initial`. Prefix your own names to avoid cross-component collisions.

---

## Data Flow: prop assignment channels

| Situation | Correct channel |
|---|---|
| Parent passes to child in a template | `.data="${this.rows}"` |
| Imperative update of any prop | `el.updateProps({ data: rows })` |
| `model: true` prop | `el.value = x` |
| `@state` | `this.someState = x` |

**`this.<non-model prop> = v` inside the component is rejected at compile time** (`E-PROP-ASSIGN`), not silently at runtime.

`model: true` sets three-way dispatch (`writeModelProp`):

1. Parent listens `update:xxx` → **emit only**, don't write locally (parent is authoritative and may clamp/format).
2. Nobody listens → **write locally** (otherwise the value evaporates; `emit()` returns early without a `wrapperComponent`).
3. Nobody listens but the host has `emit-native` → **write locally + dispatch a native `CustomEvent`**.

The criterion is "is anyone registered as a listener", not "is there a parent component".

`emit()` itself does **not** validate `@emits`. What `@emits` controls is whether a parent can bind `@xxx` — undeclared names are registered as native events and never receive emitted payloads.

---

## Event System

```ts
// Native
h`<div @click="${handler}">`

// Extended native (detail object, not a raw Event)
h`<div @resize="${h}">`
h`<div @outside.mousedown="${h}">`   // default modifier is click
h`<div @mutate.attr="${h}">`         // at least one of attr/child/char/tree is required

// Component events (must be declared by @emits to be bindable from a parent)
h`<my-comp @change="${handler}">`
```

**Modifiers** (dot-separated, combinable):
`debounce:100` `throttle:100` `once` `capture` `passive` · `stop` `prevent` `self` · `left` `right` `middle` · `ctrl` `alt` `shift` `meta` + `esc`/letters (parallel keys = alternatives).

Delegation details: `focus`/`blur`/`visibilitychange`/`wheel` always dispatch in the capture phase; `mouseenter`/`mouseleave`/`pointerenter`/`pointerleave` are not delegated; `scroll` and other element-level events are registered individually; everything else delegates on `renderRoot` with separate capture/bubble buckets.

Cross-framework: add the `emit-native` attribute so `emit()` dispatches `new CustomEvent(name, { bubbles:false, composed:false, cancelable:true, detail: arg })`.

---

## Signals (public API)

| API | Description |
|---|---|
| `signal(initial)` | Read/write signal; use `.value` |
| `signalComputed(fn)` | Derived signal (exported as `signalComputed` to avoid clashing with `@computed`) |
| `effect(fn, {asChild?})` | Runs immediately, subscribes to deps; returns `EffectNode` with `run()` / `dispose()` / `disposed` |
| `batch(fn)` | Coalesce writes; one flush on exit |
| `flushSync()` | Settle pending flush immediately |
| `untrack(fn)` | Read without subscribing (`@watch` callbacks run this way) |
| `onCleanup(fn)` | Register cleanup for the current effect |
| `onEffectError(cb)` | Global handler for effect errors; isolated per effect, `console.error` by default |

Signals do not require a component instance — they work for stores, routers, and shared state.

---

## Common Patterns

### Two-way binding
```ts
@prop({ type: String, model: true }) value = '';
// Parent: h`<my-input .value="${this.val}" @update:value="${({value}) => this.val = value}">`
// Or:     h`<my-input ${model(this.val)}>`
```

### Dynamic slots
```ts
render() {
  return h`<div>
    ${slot(args => h`<span>${args.title}</span>`, 'header')}
    <slot></slot>
  </div>`
}
```
Slot props come from attributes bound on the child's `<slot>` element (`<slot .data="${this.row}">`). Assert projected content with `slotEl.assignedNodes()`, not `shadowRoot.innerHTML`.

### Empty state + list (two sibling slots, never a ternary)
```ts
h`<div>
  ${ifTrue(items.length < 1, () => h`<span>暂无</span>`)}
  ${forEach(items, i => i.key, i => h`<div>${i.name}</div>`)}
</div>`
```

### No-view layout component
```ts
@tag('x-main')
export class XMain extends CompElem {
  @csscope(Csscope.HOST, Csscope.GLOBAL)
  static get css() { return css`x-main{display:block;flex:1;overflow:hidden}` }
  // no render() → no Shadow DOM
}
```

### Global defaults
```ts
setDefaults({
  css: [tailwindCss],
  'ce-input': { size: 'small' },   // keys must be lowercase hyphenated tag names
})
```

---

## Builds (package.json exports)

```json
"exports": {
  ".": {
    "development": { "types": "./dist-dev/index.d.ts", "import": "./dist-dev/index.esm.js", "require": "./dist-dev/index.cjs.js" },
    "production":  { "types": "./dist/index.d.ts",     "import": "./dist/index.esm.js",     "require": "./dist/index.cjs.js" },
    "import":  { "types": "./dist/index.d.ts", "default": "./dist/index.esm.js" },
    "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs.js" }
  }
}
```

- `npm run build:prod` → `dist/` (terser-minified, `debug/info/log` dropped), esm + cjs
- `npm run build:dev` → `dist-dev/` (unminified), esm + cjs + **UMD `compelem.umd.js`** (`window.compelem`; myfx global name is `myff`)
- `npm run build` runs both; `npm run typecheck` runs `tsc --noEmit`. This repo has **no dev server and no dependency on `@compelem/compiler`** — probe pages and the Vite debug config live in the sibling private project `F:\github\compelem-harness` (`npm run dev` there serves :8818 with `compelem` aliased to `../compelem/src/index.ts`).

`myfx` stays external in every format.

---

## Debugging Tips

1. **DevTools hint**: set `window.__COMPELEM_DEVTOOLS_NO_HINT__ = true` to silence the install prompt.
2. **Not compiled**: an "Component is not compiled" throw means the compiler plugin is missing or the file is excluded from its include set.
3. **`el.someProp = v` has no effect** — props are wired through compiler-injected accessors; use `.prop=` in a template, `updateProps()`, or a component-specific setter.
4. **React/Vue interop**: add `emit-native` to convert component events into `CustomEvent`s.
5. **No `@query` result** — the component has no Shadow DOM (no-view), or you read it before `mounted()`.
6. Compiler diagnostics can be traced with `DEPS_TRACE=1` (prints `[deps-fail] <reason>` to stderr).

---

## TypeScript Config

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"]
  }
}
```

---

## File Structure Reference

```
src/
├── index.ts              # Public exports
├── CompElem.ts           # Base component class
├── IComponent.ts         # Component interface
├── signal.ts             # Signal runtime (signal/computed/effect/batch/...)
├── config.ts             # Global config (setDefaults)
├── constants.ts          # Definition maps
├── devtools.ts           # DevTools integration
├── types.ts              # All option types + CompiledStatic contract
├── utils.ts / helpers.ts # Internal helpers (query, css vars, class/style diff)
├── decorators/           # No-op decorator stubs (semantics moved to compiler)
├── directive/            # Directive engine (execEach / execCond / execDir)
├── directives/           # Built-in directives
├── render/               # Template engine, write primitives, slot provenance
└── events/               # Event system (delegation, model prop, extended events)
```

---

## Anti-Patterns to Avoid

| ❌ Don't | ✅ Do |
|---|---|
| Ship without `@compelem/compiler` | Mount the compiler plugin |
| Assume `defineComponents()` was called | Call it once at the app entry (or use `immediate`) |
| Assign to a non-model `@prop` inside the component | `model: true`, `emit('update:xxx')`, or `updateProps()` |
| Pass arrays/objects via attributes | Use `.data="${...}"` or `updateProps()` |
| Put a directive inside an attribute value string | Use a separate attribute slot: `<div class="a" ${classes({...})}>` |
| Switch a `${}` between a sub-template and a directive | Two sibling slots: `ifTrue` + `forEach` |
| `@csscope` on an instance getter | Only on `static get css()` |
| `emit()` an event you never declared | Declare with `@emits` — otherwise parents can't bind it |
| Declare `get slots()` in a subclass | Leave it to the framework |
| Use `super` inside `render()` | Compose with props/slots instead |
| `@state({prop: 'x'})` | `@state x = this.x` |
| Expect `shouldUpdate` / `updated` | `@watch('field')` or gate a subtree with `ifElse` |
| Reach for `transition` / `startViewTransition` | Not part of the library — use CSS or the View Transitions API directly |

## Lazy Dependencies in Structural Directives

Dependencies read inside an `ifTrue` / `ifElse` / `when` branch are collected **only when that branch first renders**. Variables read solely inside a false branch are not tracked until the condition flips.

```ts
// ❌ this.detail is not tracked while count is 0
render() {
  return h`<div>${ifTrue(this.count > 0, () => h`<span>${this.detail}</span>`)}</div>`
}

// ✅ read it in the root context, or watch it explicitly
@watch('detail')
onDetailChange() {}
```

---

## Quick Commands

```bash
npm run build       # prod + dev builds (dist/, dist-dev/)
npm run build:prod  # minified
npm run build:dev   # unminified + UMD
npm run typecheck   # tsc --noEmit
# dev server / probes live in ../compelem-harness:
#   npm run dev · npm run probe:round4 · npm run probe:slot
```
