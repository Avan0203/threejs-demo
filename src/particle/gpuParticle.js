/*
 * @Author: wuyifan 1208097313@qq.com
 * @Date: 2025-08-14 13:34:44
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2025-08-19 11:00:41
 * @FilePath: \threejs-demo\src\particle\gpuParticle.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */
import {
    SphereGeometry,
    InstancedBufferGeometry,
    InstancedBufferAttribute,
    DataTexture,
    RGBAFormat,
    FloatType,
    MathUtils,
    Uniform,
    ShaderMaterial,
    UniformsUtils,
    Mesh
} from 'three';
import {
    initRenderer,
    initOrthographicCamera,
    initAxesHelper,
    initOrbitControls,
    initScene,
    resize,
    Image_Path
} from '../lib/tools/index.js';
import { ImageParticleMapper } from '../lib/custom/ImageParticleMapper.js'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';

const { randFloat } = MathUtils;

window.onload = () => {
    init();
};

const vertexShader = /*glsl*/  `
    uniform sampler2D positionTexture;
    attribute vec2 instancePosition;
    void main(){
        vec3 pos = position.xyz;
        pos += texture2D(positionTexture, instancePosition).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const fragmentShader = /*glsl*/`
    void main(){
        gl_FragColor=vec4(1.);
    }
`

const positionFragmentShader = /*glsl*/`
    void main(){
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 position = texture2D(positionTexture, uv);
        vec4 velocity = texture2D(velocityTexture, uv);
        position += velocity;

        gl_FragColor = vec4(position.xyz, 1.0);
    }
`;

const velocityFragmentShader = /*glsl*/`
    uniform sampler2D targetPosition;
    void main(){
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 position = texture2D(positionTexture, uv);
        vec4 velocity = texture2D(velocityTexture, uv);
        vec4 targetPosition = texture2D(targetPosition, uv);

        float d = distance(position.xyz, targetPosition.xyz);
        // 乘弹簧进度系数
        velocity += normalize(targetPosition - position) * d /20.0;
        // 施加摩擦力，摩擦力系数0.5
        vec4 friction = -velocity * 0.5;
        velocity += friction;

        gl_FragColor = vec4(velocity.xyz, 1.0);
    }
`;


async function init() {
    const renderer = initRenderer();
    const camera = initOrthographicCamera();
    camera.up.set(0, 0, 1);
    camera.updateProjectionMatrix();

    const scene = initScene();
    initAxesHelper(scene);
    renderer.setClearColor(0x000000);

    const controls = initOrbitControls(camera, renderer.domElement);

    const size = 128;
    const count = size * size;

    const images = ['rhodesIsland.jpeg', 'rhineLab.jpeg'];

    const particleMapper = new ImageParticleMapper(count, 50, 512, 0.2);
    const dataTextures = await Promise.all(images.map(async (path) => {
        const baseUrl = `../../${Image_Path}/logo/${path}`;
        const data = await particleMapper.getData(baseUrl);
        return new DataTexture(data, size, size, RGBAFormat, FloatType);
    }));


    const gpuCtRenderer = new GPUComputationRenderer(size, size, renderer);

    const velocityTexture = gpuCtRenderer.createTexture();
    for (let i = 0, l = velocityTexture.image.data.length; i < l; i += 4) {
        velocityTexture.image.data.set([randFloat(-500, 500), randFloat(-500, 500), 0, 1], i);
    }

    const positionVariable = gpuCtRenderer.addVariable('positionTexture', positionFragmentShader, gpuCtRenderer.createTexture());
    const velocityVariable = gpuCtRenderer.addVariable('velocityTexture', velocityFragmentShader, velocityTexture);

    gpuCtRenderer.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);
    gpuCtRenderer.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable]);


    gpuCtRenderer.init();

    let index = 0
    setInterval(() => {
        index ++;
        velocityVariable.material.uniforms.targetPosition = new Uniform(dataTextures[index % 2]);
    }, 3000)

    const geometry = new SphereGeometry(0.2, 8, 8);
    const instanceGeometry = new InstancedBufferGeometry();
    instanceGeometry.setAttribute('position', geometry.attributes.position);
    // instanceGeometry.setAttribute('uv', geometry.attributes.uv);
    instanceGeometry.setIndex(geometry.index);
    const initPosition = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
        initPosition.set([(i % size) / size, ~~(i / size) / size], i * 2);
    }
    instanceGeometry.setAttribute('instancePosition', new InstancedBufferAttribute(initPosition, 2));

    const uniforms = UniformsUtils.merge([{
        positionTexture: new Uniform(null),
        velocityTexture: new Uniform(null),
    }])
    const material = new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms
    });

    const mesh = new Mesh(instanceGeometry, material);
    scene.add(mesh);

    function update() {
        gpuCtRenderer.compute();
        uniforms.positionTexture.value = gpuCtRenderer.getCurrentRenderTarget(positionVariable).texture;
        uniforms.velocityTexture.value = gpuCtRenderer.getCurrentRenderTarget(velocityVariable).texture;
    }

    function render() {
        update();
        controls.update();

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    render();

    resize(renderer, camera);
}