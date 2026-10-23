/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

// React 19 keeps JSX element definitions in React.JSX. Expose that
// namespace globally for TSX files and tooling that still resolves JSX
// through the global JSX namespace.
import type * as React from "react";

declare global {
  namespace JSX {
    type Element = React.JSX.Element;
    type ElementClass = React.JSX.ElementClass;
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
    type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>;
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}
