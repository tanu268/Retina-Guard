# Team 2 Frontend Handoff: `Login.tsx` / `HoverRevealCards` Contract Defect

## Defect
During G14 automated browser E2E execution, clicking the Technician card on the Login page resulted in a total crash of the UI via a React `ErrorBoundary` ("This screen stopped responding"). 

## Original Symptom
- **Error**: React invariant violation. Expected a string (for built-in components) or a class/function (for composite components) but got: `<span />`.
- **Trigger**: Rendering `Login.tsx` passing instantiated JSX to `cards.tsx`.

## Root Cause
`Login.tsx` was passing an already instantiated JSX element for the icon:
```tsx
icon: (
  <span className="flex h-11 w-11 ...">
    <Icon className="h-5 w-5" strokeWidth={1.75} />
  </span>
)
```
However, the `HoverRevealCards` component in `cards.tsx` treats `item.icon` as a component reference (type `React.ElementType`), and renders it as:
```tsx
const Icon = item.icon;
...
{Icon && (
  <Icon className="h-5 w-5 text-white/90 drop-shadow-md" strokeWidth={2.5} />
)}
```
Passing an instantiated `<span />` element means React attempted to render `< (<span />) />`, resulting in the crash.

## Production Change Made
File: `RetinaGuard-Frontend-v3/src/pages/landing/Login.tsx`

The `icon` property mapped to `HoverRevealCards` now correctly passes the uninstantiated component reference (the raw lucide `Icon`):
```tsx
icon: icon, // where icon is typeof ScanEye, Stethoscope, etc.
```

Additionally, `onItemClick` was changed to `onClick` attached directly to the `item`, conforming to the `CardItem` interface defined in `cards.tsx`.

## Behavioral Effect
The crash is resolved. The cards now render without crashing and properly invoke the role selection logic when clicked.

## Required Team 2 Validation
Team 1 has created a browser recording indicating the login page is now functional, but **Team 2 must independently validate this fix**. 
- Verify the `HoverRevealCards` visual styling aligns with design requirements now that the local `span` wrapper in `Login.tsx` was removed. 
- Ensure no other usages of `HoverRevealCards` were broken by strict adherence to the `React.ElementType` contract.
