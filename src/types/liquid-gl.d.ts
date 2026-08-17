declare module 'liquid-gl' {
  interface LiquidGLOptions {
    snapshot?: string;
    target?: string | HTMLElement;
    resolution?: number;
    refraction?: number;
    aberration?: number;
    bevelDepth?: number;
    bevelWidth?: number;
    frost?: number;
    shadow?: boolean;
    specular?: boolean;
    reveal?: 'fade' | 'none';
    tilt?: boolean;
    tiltFactor?: number;
    tiltEase?: number;
    magnify?: number;
    on?: {
      init?: (instance: any) => void;
    };
  }

  export default function liquidGL(options?: LiquidGLOptions): any;
}
