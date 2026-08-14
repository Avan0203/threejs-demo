/*
 * @Date: 2024-01-19 13:45:51
 * @LastEditors: Yifan Wu 1208097313@qq.com
 * @LastEditTime: 2024-01-23 15:49:19
 * @FilePath: /threejs-demo/src/composer/OITRenderPass.js
 */
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import {
    Color,
    Vector2,
    WebGLRenderTarget,
    DepthTexture,
    DataTexture,
    NoBlending,
    ShaderMaterial
} from 'three';
import {
    catchRenderTarget,
    catchTexture,
    printfImage
} from '../lib/util/catch.js'



const renderMaterial = new ShaderMaterial({
    uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        opacity: { value: 1.0 },
    },
    vertexShader: /*glsl*/ `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
    fragmentShader: /*glsl*/ `
        uniform float opacity;
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        varying vec2 vUv;
        void main() {
            gl_FragColor = texture2D( tDiffuse, vUv );
            gl_FragColor.a *= opacity;
            if (gl_FragColor.a <= 0.0) {
                discard;
            }
            gl_FragDepth = texture2D( tDepth, vUv ).x;
        }`,
    transparent: true,
    depthTest: true,
    depthWrite: true,
});


class OITRenderPass extends Pass {
    constructor(scene, camera, clearColor, clearAlpha) {
        super();
        this.scene = scene;
        this.camera = camera;

        this.uniforms = {
            uPrevDepthTexture: { value: null },
            uReciprocalScreenSize: { value: new Vector2(1, 1) }
        }
        this.layersNumber = 0;
        this.size = new Vector2(1, 1);
        this.layers = [];

        this.dataTexture = new DataTexture([1, 1, 1, 1], 1, 1);
        this.quad = new FullScreenQuad(renderMaterial);
        this.clearDepth = false;

        this.debug = false

        this.clearColor = clearColor;
        this.clearAlpha = (clearAlpha !== undefined) ? clearAlpha : 0;

        this.clear = true;
        this.clearDepth = false;
        this.needsSwap = false;
        this._oldClearColor = new Color();
    }

    setSize(width, height) {
        this.size.set(width, height);
        this.uniforms.uReciprocalScreenSize.value.set(1 / width, 1 / height);

        this.layers.forEach((target) => {
            target.setSize(width, height);
            target.depthTexture.dispose();
            target.depthTexture = new DepthTexture(width, height);
        });

        this.dataTexture.dispose();
        this.dataTexture = new DataTexture(new Uint8Array(width * height * 4), width, height)
    }

    render(renderer, writeBuffer, readBuffer/*, deltaTime, maskActive */) {
        this.replaceMaterials();
        const oldAutoClear = renderer.autoClear;
        renderer.autoClear = false;

        let oldClearAlpha;

        if (this.clearColor) {

            renderer.getClearColor(this._oldClearColor);

            oldClearAlpha = renderer.getClearAlpha();

            renderer.setClearColor(this.clearColor, this.clearAlpha);
        }

        if (this.clearDepth) {

            renderer.clearDepth();

        }



        this.layers.reduceRight((prevDepthTexture, layer, i) => {
            this.uniforms.uPrevDepthTexture.value = prevDepthTexture;

            if (this.debug) {
                const textureURL = catchTexture(prevDepthTexture, renderer, layer);
                printfImage('prevDepthTexture' + i, textureURL)
            }

            renderer.setRenderTarget(layer);
            renderer.clear();
            renderer.render(this.scene, this.camera);

            if (this.debug) {
                const targetURL = catchRenderTarget(renderer, layer);
                printfImage('layer' + i, targetURL)
            }

            return layer.depthTexture;

        }, this.dataTexture);

        renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);

        if (this.clear) {
            renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
        }

        this.layers.forEach((layer) => {
            this.quad.material.uniforms.tDiffuse.value = layer.texture;
            this.quad.material.uniforms.tDepth.value = layer.depthTexture;

            this.quad.material.needsUpdate = true;
            this.quad.render(renderer);
        })

        if (this.debug) {
            const result = catchRenderTarget(renderer, readBuffer);
            printfImage('result', result)
        }

        if (this.clearColor) {

            renderer.setClearColor(this._oldClearColor, oldClearAlpha);

        }

        renderer.autoClear = oldAutoClear;
    }

    setLayerNumber(layersNum) {
        layersNum = Math.floor(layersNum);
        if (layersNum <= 0) {
            return console.warn('OITRenderPass layersNumber cannot be smaller than 1');
        }

        this.layersNumber = layersNum;

        while (layersNum < this.layers.length) {
            this.layers.pop().dispose();
        }

        const { x, y } = this.size;

        while (layersNum > this.layers.length) {
            const renderTarget = new WebGLRenderTarget(x, y, { depthTexture: new DepthTexture(x, y) });
            this.layers.push(renderTarget);
        }
    }

    replaceMaterials() {
        this.scene.traverse((object) => {
            if (object?.isMesh) {
                if (Array.isArray(object.material)) {
                    object.material.forEach((material, i) => {
                        if (!material.userData?.isOITMaterial) {
                            const oitMaterial = material.clone();

                            oitMaterial.blending = NoBlending;
                            oitMaterial.userData.isOITMaterial = true;
                            oitMaterial.userData.originalMaterial = material;
                            oitMaterial.onBeforeCompile = onBeforeCompile.bind(this);
                            oitMaterial.needsUpdate = true;

                            object.material[i] = oitMaterial;
                        }
                    });
                } else {
                    if (!object.material.userData?.isOITMaterial) {
                        const oitMaterial = object.material.clone();
                        oitMaterial.blending = NoBlending;
                        oitMaterial.userData.isOITMaterial = true;
                        oitMaterial.userData.originalMaterial = object.material;
                        oitMaterial.onBeforeCompile = onBeforeCompile.bind(this);
                        oitMaterial.needsUpdate = true;

                        object.material = oitMaterial;
                    }
                }
            }
        })
    }

    debuggerMode() {
        this.debug = !this.debug
    }
}

const depthPeelingShader = /*glsl*/ `
        if (gl_FragColor.a <= 0.0) {
            discard;
        }
        vec2 screenPos = gl_FragCoord.xy * uReciprocalScreenSize;
        float prevDepth = texture2D(uPrevDepthTexture, screenPos).x;
        if (prevDepth >= gl_FragCoord.z){
            discard;
        }
    `;

function onBeforeCompile(shader) {
    shader.uniforms.uReciprocalScreenSize = this.uniforms.uReciprocalScreenSize;
    shader.uniforms.uPrevDepthTexture = this.uniforms.uPrevDepthTexture;

    shader.fragmentShader = /* glsl */ `
    uniform vec2 uReciprocalScreenSize;
    uniform sampler2D uPrevDepthTexture;
    ${shader.fragmentShader}`;

    shader.fragmentShader = shader.fragmentShader.replace(
        /}\s*$/,
        `${depthPeelingShader}\n}`
    );
}

export { OITRenderPass };