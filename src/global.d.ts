// Ambient module declarations for assets and untyped third-party packages
// imported from TypeScript source files in this project.

declare module "*.css";

declare module "*.webp" {
  const src: string;
  export default src;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.otf" {
  const src: string;
  export default src;
}

declare module "react-world-flags" {
  import * as React from "react";

  export interface FlagProps extends React.HTMLAttributes<HTMLElement> {
    code?: string;
    fallback?: React.ReactNode;
    height?: string | number;
    width?: string | number;
  }

  const Flag: React.FC<FlagProps>;
  export default Flag;
}
