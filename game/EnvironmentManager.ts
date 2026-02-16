
import * as THREE from 'three';
import { COLORS, SEGMENT_LENGTH, ROAD_WIDTH, DRAW_DISTANCE } from '../constants';

export class EnvironmentManager {
  scene: THREE.Scene;
  roadMaterials: THREE.MeshStandardMaterial[] = [];
  roadMeshes: THREE.Mesh[] = [];
  dustSystem: THREE.Points;
  sun: THREE.DirectionalLight;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Sky
    scene.background = new THREE.Color(COLORS.SKY_TOP);
    scene.fog = new THREE.Fog(COLORS.FOG_SUNNY, 50, DRAW_DISTANCE);

    // Light
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    this.sun = new THREE.DirectionalLight(0xffdfba, 1.5);
    this.sun.position.set(50, 100, 50);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.far = 200;
    this.sun.shadow.bias = -0.001;
    scene.add(this.sun);

    // Road Texture
    const roadMat = this.createAsphalt(false);
    this.roadMaterials.push(roadMat);

    // Init Road Segments
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LENGTH, 10, 10);
    for (let i = 0; i < 4; i++) {
        const mesh = new THREE.Mesh(roadGeo, roadMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.z = -i * SEGMENT_LENGTH;
        mesh.receiveShadow = true;
        scene.add(mesh);
        this.roadMeshes.push(mesh);
    }

    // Dust
    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 2000;
    const pos = new Float32Array(dustCount * 3);
    for(let i=0; i<dustCount*3; i++) pos[i] = (Math.random()-0.5) * 200;
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0x888888, size: 0.1, transparent: true, opacity: 0.5 });
    this.dustSystem = new THREE.Points(dustGeo, dustMat);
    scene.add(this.dustSystem);
  }

  update(playerZ: number, isRaining: boolean) {
    // Endless Scroll Road
    const firstMesh = this.roadMeshes[0];
    if (playerZ < firstMesh.position.z - SEGMENT_LENGTH) {
        // Recycle to back
        const lastZ = this.roadMeshes[this.roadMeshes.length - 1].position.z;
        firstMesh.position.z = lastZ - SEGMENT_LENGTH;
        this.roadMeshes.push(this.roadMeshes.shift()!);
    }

    // Weather Visuals
    const roadMat = this.roadMaterials[0];
    if (isRaining) {
        if(roadMat.roughness > 0.1) {
            roadMat.roughness = 0.05; // Wet
            roadMat.color.setHex(0xaaaaaa);
            this.scene.fog!.color.set(COLORS.FOG_RAIN);
        }
    } else {
        if(roadMat.roughness < 0.8) {
            roadMat.roughness = 0.8; // Dry
            roadMat.color.setHex(0xffffff);
            this.scene.fog!.color.set(COLORS.FOG_SUNNY);
        }
    }

    // Dust near player
    this.dustSystem.position.z = playerZ - 20;
  }

  private createAsphalt(wet: boolean) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#222';
    ctx.fillRect(0,0,512,512);
    
    // Noise
    for(let i=0; i<10000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#333' : '#111';
        ctx.fillRect(Math.random()*512, Math.random()*512, 2, 2);
    }
    // Lines
    ctx.fillStyle = COLORS.LANE_MARKER;
    ctx.fillRect(166, 0, 10, 512);
    ctx.fillRect(332, 0, 10, 512);

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1, 10);
    map.anisotropy = 16;

    return new THREE.MeshStandardMaterial({
        map: map,
        roughness: wet ? 0.0 : 0.8,
        metalness: 0.1
    });
  }
}
