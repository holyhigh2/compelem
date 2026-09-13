# compelem Usage Skill

This skill provides guidance for AI agents working with the **compelem** WebComponent library.

## Quick Reference

**Version:** 0.28.1  
**Package:** `compelem`  
**Author:** holyhigh2  
**Docs:** `AGENTS.md` (this repo)

---

## Installation & Imports

```ts
import { 
  CompElem, tag, prop, state, computed, watch, emits,
  csscope, Csscope, css, h,
  forEach, ifElse, model, show, classes, styles,
  bind, slot, html, transition, when,
  createRef, defineComponents, startViewTransition
} from "compelem";
```

---

## Component Skeleton

```ts
@emits('change')
@tag("my-counter")
export class MyCounter extends CompElem {
  @prop({ type: Number, model: true }) value = 0;
  @prop label: string;
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

| Decorator | Purpose | Key Options |
|---|---|---|
| `@tag(name, immediate?)` | Register component | `immediate=true` → auto `customElements.define` |
| `@prop(options?)` | External input (read-only) | `type`, `model`, `attribute`, `hasChanged`, `converter` |
| `@state(options?)` | Internal reactive state | `shallow`, `prop` (init from prop), `hasChanged` |
| `@computed` | Cached getter | Must be non-static getter |
| `@watch(source, options?)` | React to changes | `immediate`, `deep`, `once` |
| `@emits(...names)` | Declare events | Supports `'update:*'` wildcard |
| `@csscope(...scopes)` | Style scopes | `INNER`, `HOST`, `GLOBAL` |
| `@event(name, target?)` | Non-view events | Window/document/element events |
| `@query(selector, cache?)` | ShadowDOM query | `QueryCache.ONCE` for single query |

---

## Template Syntax (`h` tag function)

```ts
h`<div @click="${handler}" .value="${v}" ?disabled="${d}" *r="${r}">`
```

| Prefix | Meaning |
|---|---|
| `@` | Event listener |
| `.` | Component prop (type-safe) |
| `?` | Boolean attribute toggle |
| `*` | Evaluate then set (supports `:camel/:kebab/:snake`) |
| `key=${id}` | For `forEach` items |
| `ref="${refObj}"` | DOM reference via `createRef()` |

---

## Built-in Directives

| Directive | Position | Example |
|---|---|---|
| `bind(obj)` | TAG | `<div ${bind(obj)}>` |
| `show(cond, cb?)` | TAG | `<div ${show(visible)}>` |
| `model(val, prop?, modelProp?)` | TAG | `<input ${model(val)}>` |
| `classes(obj\|arr\|str)` | TAG | `<div ${classes({active: true})}>` |
| `styles(obj\|str)` | TAG | `<div ${styles({color: 'red'})}>` |
| `forEach(arr, keyFn, tmpl)` | TEXT/SLOT | `${forEach(list, i=>i.id, i=>h\`<li key=${i.id}>\`)}` |
| `ifTrue(cond, tmpl)` | TEXT/SLOT | `${ifTrue(show, () => h\`<span>\`)}` |
| `ifElse(cond, ifT, elseT)` | TEXT/SLOT | `${ifElse(c, t, f)}` |
| `when(val, cases)` | TEXT/SLOT | `${when(x, [[v=>v>0, t], ['default', f]])}` |
| `slot(tmpl, name?)` | SLOT | Dynamic slot content |
| `html(str)` | TAG/TEXT/SLOT | Raw HTML injection |
| `transition(name, inner, opts?)` | TEXT/SLOT | Animation on structural changes |

---

## Lifecycle Hooks

```ts
propsReady(props)  // After props set, before render
render()           // Return Template | null
beforeMount()      // Before first mount
mounted()          // After first mount
shouldUpdate(changed) // Return false to skip update
beforeDestroyed()  // Before destroy
destroyed()        // After destroy
```

---

## Instance Members (Read-only)

- `rootComponent`, `parentComponent`, `wrapperComponent`
- `renderRoot` / `renderRoots`, `shadowRoot`
- `slots`, `slotHooks`
- `cssSheets`, `globalCssSheet`
- `attrs`, `props`
- `isMounted`, `isDestroyed`

---

## Instance Methods

- `emit(evName, arg?, event?)` — Fire component event
- `nextTick(cbk)` — After DOM update
- `forceUpdate()` — Force re-render
- `updateProps(props, force?)` — Batch update props
- `insertStyleSheet(sheet)` — Dynamic CSS
- `destroy()` — Cleanup component

---

## Dynamic CSS Variables

```ts
get cssVars() { 
  return { 
    primaryColor: this.theme === 'dark' ? '#fff' : '#000',
    spacing: `${this.size}px`
  } 
}
// Generates: --primary-color, --spacing
```

---

## Event System

```ts
// Native events
<div @click="${handler}">
<div @resize="${handler}">        // Element resize
<div @outside.mousedown="${h}">  // Click outside
<div @mutate.attr="${h}">        // MutationObserver

// Component events (must @emits first)
<my-comp @change="${handler}">   // Receives custom data
```

**Modifiers:** `.stop` `.prevent` `.self` `.left` `.right` `.ctrl` `.alt` `.esc` `.debounce:100` `.throttle:100` `.once`

---

## Dev/Prod Builds (package.json exports)

```json
"exports": {
  ".": {
    "import": { "default": "dist/index.esm.js" },
    "require": { "default": "dist/index.cjs.js" },
    "development": { "default": "dist-dev/index.esm.js" },
    "production": { "default": "dist/index.prod.esm.js" }
  }
}
```

- `npm run prod` → `dist/index.prod.esm.js` (minified, no dev code)
- `npm run dev` → `dist-dev/index.esm.js` (with devtools hints, warnings)

---

## Common Patterns

### Two-way Binding (model prop)
```ts
@prop({ type: String, model: true }) value = '';
// Parent: <my-input .value="${val}" @update:value="${v => val = v}">
// Or: <my-input ${model(val)}>
```

### Dynamic Slots
```ts
render() {
  return h`<div>
    ${slot(args => h`<span>${args.title}</span>`, 'header')}
    <slot></slot>
  </div>`
}
```

### View Transitions (SPA routing)
```ts
await startViewTransition(() => {
  router.navigate('/new-page')
})
```

### Register Multiple Components
```ts
import { defineComponents } from 'compelem';
// After all @tag components are imported:
defineComponents()
```

---

## Debugging Tips

1. **DevTools hint**: Set `window.__COMPELEM_DEVTOOLS_NO_HINT__ = true` to silence
2. **React/Vue interop**: Add `emit-native` attr to convert events to CustomEvent
3. **No-view components**: `render()` returns `null` → no Shadow DOM, only HOST/GLOBAL styles
4. **Prop mutation**: Dev mode throws if you assign to `@prop` directly; use `model: true` or `emit('update:xxx')`

---

## TypeScript Config

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2017",
    "lib": ["ES2017", "DOM", "DOM.Iterable"]
  }
}
```

---

## File Structure Reference

```
src/
├── index.ts              # Main exports
├── CompElem.ts           # Base component class
├── config.ts             # Global config (setDefaults)
├── devtools.ts           # DevTools integration
├── decorators/           # All decorators
├── directives/           # Built-in directives
├── render/               # Template engine
├── events/               # Event system
├── transition/           # Animation system
└── types.ts              # All option types
```

---

## Anti-Patterns to Avoid

| ❌ Don't | ✅ Do |
|---|---|
| Assign to `@prop` inside component | Use `@prop({model:true})` or `emit('update:xxx')` |
| Use `@csscope` on non-static getter | Use on `static get css()` only |
| Forget `@emits` before `emit()` | Declare all events with `@emits` |
| Use `model` with dynamic paths | Use static property paths only |
| Duplicate `key` in `forEach` | Ensure unique keys |
| Use `@query` on no-view component | Use `render()` returning Template |

---

## Quick Commands

```bash
npm run prod    # Build production (dist/index.prod.esm.js)
npm run dev     # Build development (dist-dev/index.esm.js)
npm run lint    # ESLint check
npx tsc --noEmit  # Type check
```