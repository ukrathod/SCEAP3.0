declare module 'three/examples/jsm/controls/OrbitControls' {
  import { Camera, EventDispatcher, MOUSE, TOUCH } from 'three';
  import { Vector3 } from 'three';
  import { Renderer } from 'three';

  export class OrbitControls extends EventDispatcher {
    constructor(object: Camera, domElement?: HTMLElement);
    domElement: HTMLElement;
    object: Camera;
    target: Vector3;
    mouseButtons: { LEFT: MOUSE; MIDDLE: MOUSE; RIGHT: MOUSE };
    touches: { ONE: TOUCH; TWO: TOUCH };
    enableDamping: boolean;
    dampingFactor: number;
    enablePan: boolean;
    enableRotate: boolean;
    enableZoom: boolean;
    minDistance: number;
    maxDistance: number;
    update(): void;
    dispose(): void;
  }
  export default OrbitControls;
}
