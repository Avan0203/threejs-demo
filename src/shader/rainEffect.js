/*
 * @Author: wuyifan 1208097313@qq.com
 * @Date: 2025-10-20 15:37:49
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2025-10-21 16:27:28
 * @FilePath: \threejs-demo\src\shader\rainEffect.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */
// 根据改写 "https://github.com/codrops/RainEffect",
import {
    Mesh,
    CanvasTexture,
    ShaderMaterial,
    Vector2,
    ClampToEdgeWrapping,
    PlaneGeometry
} from 'three';
import {
    initRenderer,
    initOrthographicCamera,
    initScene,
    initLoader,
    Image_Path,
    initGUI
} from '../lib/tools/index.js';

import { RainDropSystem } from './rainDropSystem.js';
window.onload = () => {
    init();
};

const textureMap = {
    'water-bg': 'water/texture-bg.png',
    'water-fg': 'water/texture-fg.png',
    'city': 'city.jpg',
    'sun-bg': 'weather/texture-sun-bg.png',
    'sun-fg': 'weather/texture-sun-fg.png',
    'rain-bg': 'weather/texture-rain-bg.png',
    'rain-fg': 'weather/texture-rain-fg.png',
    'drizzle-bg': 'weather/texture-drizzle-bg.png',
    'drizzle-fg': 'weather/texture-drizzle-fg.png',
    'storm-bg': 'weather/texture-storm-lightning-bg.png',
    'storm-fg': 'weather/texture-storm-lightning-fg.png',
    'fallout-bg': 'weather/texture-fallout-bg.png',
    'fallout-fg': 'weather/texture-fallout-fg.png',
    'drop-alpha': 'drop-alpha.png',
    'drop-color': 'drop-color.png',
    'drop-shine': 'drop-shine.png',
    'drop-shine2': 'drop-shine2.png',
};

async function init() {
    const renderer = initRenderer();
    
    // 使用正交相机用于全屏显示
    const camera = initOrthographicCamera();
    camera.left = -1;
    camera.right = 1;
    camera.top = 1;
    camera.bottom = -1;
    camera.near = 0;
    camera.far = 1;
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0); // 确保相机正对平面
    camera.updateProjectionMatrix();

    const scene = initScene();

    const loader = initLoader();

    await Promise.all(Object.entries(textureMap).map(([key, url]) => {
        return loader.loadAsync(`../../${Image_Path}/rainEffect/${url}`).then(texture => {
            textureMap[key] = texture;
        });
    }))


    // 注意：这里不需要创建 RenderTarget，直接使用静态纹理作为背景

    // ===== 天气配置 =====
    const weatherConfigs = {
        rain: {
            name: '下雨',
            fg: 'rain-fg',
            bg: 'rain-bg',
            rainChance: 0.35,
            dropletsRate: 50,
            trailRate: 1,
            trailScaleRange: [0.2, 0.45],
            collisionRadius: 0.45,
            dropletsCleaningRadiusMultiplier: 0.28,
        },
        storm: {
            name: '暴雨',
            fg: 'rain-fg',
            bg: 'rain-bg',
            flashFg: 'storm-fg',
            flashBg: 'storm-bg',
            rainChance: 0.4,
            dropletsRate: 80,
            trailRate: 2.5,
            trailScaleRange: [0.25, 0.4],
            collisionRadius: 0.45,
            dropletsCleaningRadiusMultiplier: 0.28,
            flashChance: 0.1, // 闪电概率
        },
        drizzle: {
            name: '毛毛雨',
            fg: 'drizzle-fg',
            bg: 'drizzle-bg',
            rainChance: 0.15,
            dropletsRate: 10,
            trailRate: 1,
            trailScaleRange: [0.2, 0.45],
            collisionRadius: 0.45,
            dropletsCleaningRadiusMultiplier: 0.28,
        },
        sunny: {
            name: '晴天',
            fg: 'sun-fg',
            bg: 'sun-bg',
            rainChance: 0,
            dropletsRate: 0,
            trailRate: 0,
            trailScaleRange: [0.2, 0.45],
            collisionRadius: 0.45,
            dropletsCleaningRadiusMultiplier: 0.28,
        }
    };

    let currentWeather = 'rain'; // 当前天气类型
    let flashValue = { v: 0 }; // 闪电强度
    let flashInterval = null; // 闪电定时器
    // let audioContext = null; // 音频上下文 (暂时不使用)
    let rainAudio = null; // 雨声音频
    let isAudioEnabled = true; // 音频开关

    // ===== 音频初始化函数 =====
    async function initAudio() {
        try {
            // 创建音频上下文 (暂时不使用)
            // audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 创建音频元素
            rainAudio = new Audio();
            rainAudio.src = '../../public/audio/rain.mp3';
            rainAudio.loop = true;
            rainAudio.volume = 0.3; // 设置初始音量
            
            // 等待音频加载
            await new Promise((resolve, reject) => {
                rainAudio.addEventListener('canplaythrough', resolve);
                rainAudio.addEventListener('error', reject);
            });
            
            // 音频初始化成功
        } catch (error) {
            console.warn('音频初始化失败:', error);
        }
    }

    // ===== 音频控制函数 =====
    function playRainAudio() {
        if (rainAudio && isAudioEnabled) {
            rainAudio.play().catch(e => console.warn('音频播放失败:', e));
        }
    }

    function pauseRainAudio() {
        if (rainAudio) {
            rainAudio.pause();
        }
    }

    function setAudioVolume(volume) {
        if (rainAudio) {
            rainAudio.volume = Math.max(0, Math.min(1, volume));
        }
    }

    const rainDropSystem = new RainDropSystem(
        window.innerWidth,
        window.innerHeight,
        window.devicePixelRatio,
        textureMap['drop-alpha'].image,
        textureMap['drop-color'].image,
        {
            trailRate: 1,
            trailScaleRange: [0.2, 0.45],
            collisionRadius: 0.45,
            dropletsCleaningRadiusMultiplier: 0.28,
        }
    );


    // ===== 5. 创建前景/背景纹理画布 =====
    const textureFgCanvas = document.createElement('canvas');
    textureFgCanvas.width = 96;
    textureFgCanvas.height = 64;
    const textureFgCtx = textureFgCanvas.getContext('2d');

    const textureBgCanvas = document.createElement('canvas');
    textureBgCanvas.width = 384;
    textureBgCanvas.height = 256;
    const textureBgCtx = textureBgCanvas.getContext('2d');

    // 绘制前景和背景纹理
    function generateTextures(fg, bg, alpha = 1) {
        textureFgCtx.globalAlpha = alpha;
        textureFgCtx.drawImage(fg, 0, 0, 96, 64);

        textureBgCtx.globalAlpha = alpha;
        textureBgCtx.drawImage(bg, 0, 0, 384, 256);
    }

    generateTextures(
        textureMap['rain-fg'].image,
        textureMap['rain-bg'].image
    );

    // ===== 6. 创建 Three.js 纹理 =====
    const rainTexture = new CanvasTexture(rainDropSystem.canvas);
    rainTexture.flipY = true; // 翻转Y轴，修正雨滴方向
    rainTexture.wrapS = ClampToEdgeWrapping;
    rainTexture.wrapT = ClampToEdgeWrapping;
    
    const fgTexture = new CanvasTexture(textureFgCanvas);
    fgTexture.flipY = false;
    fgTexture.wrapS = ClampToEdgeWrapping;
    fgTexture.wrapT = ClampToEdgeWrapping;
    
    // 背景纹理需要翻转Y轴来修正上下颠倒
    const bgTexture = textureMap['city'];
    bgTexture.flipY = true;
    bgTexture.wrapS = ClampToEdgeWrapping;
    bgTexture.wrapT = ClampToEdgeWrapping;

    // ===== 7. 创建雨滴效果的 Shader Material =====
    const shaderMaterial = new ShaderMaterial({
        uniforms: {
            u_waterMap: { value: rainTexture },
            u_textureFg: { value: fgTexture },
            u_textureBg: { value: bgTexture }, // 使用修正后的背景纹理
            u_resolution: { value: new Vector2(window.innerWidth, window.innerHeight) },
            u_parallax: { value: new Vector2(0, 0) },
            u_parallaxFg: { value: 20.0 },
            u_parallaxBg: { value: 5.0 },
            u_textureRatio: { value: textureMap['city'].image.width / textureMap['city'].image.height },
            u_minRefraction: { value: 256.0 },
            u_refractionDelta: { value: 256.0 },
            u_brightness: { value: 1.04 },
            u_alphaMultiply: { value: 6.0 },
            u_alphaSubtract: { value: 3.0 },
            u_renderShine: { value: false },
            u_renderShadow: { value: false },
        },
        vertexShader:/*glsl*/ `
            varying vec2 v_texCoord;
            void main() {
                v_texCoord = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /*glsl*/ `
            precision mediump float;

            uniform sampler2D u_waterMap;
            uniform sampler2D u_textureShine;
            uniform sampler2D u_textureFg;
            uniform sampler2D u_textureBg;

            varying vec2 v_texCoord;
            uniform vec2 u_resolution;
            uniform vec2 u_parallax;
            uniform float u_parallaxFg;
            uniform float u_parallaxBg;
            uniform float u_textureRatio;
            uniform bool u_renderShine;
            uniform bool u_renderShadow;
            uniform float u_minRefraction;
            uniform float u_refractionDelta;
            uniform float u_brightness;
            uniform float u_alphaMultiply;
            uniform float u_alphaSubtract;

            vec4 blend(vec4 bg, vec4 fg) {
                vec3 bgm = bg.rgb * bg.a;
                vec3 fgm = fg.rgb * fg.a;
                float ia = 1.0 - fg.a;
                float a = fg.a + bg.a * ia;
                vec3 rgb;
                if (a != 0.0) {
                    rgb = (fgm + bgm * ia) / a;
                } else {
                    rgb = vec3(0.0);
                }
                return vec4(rgb, a);
            }

            vec2 pixel() {
                return vec2(1.0) / u_resolution;
            }

            vec2 parallax(float v) {
                return u_parallax * pixel() * v;
            }

            vec2 texCoord() {
                return v_texCoord;
            }

            vec2 scaledTexCoord() {
                float ratio = u_resolution.x / u_resolution.y;
                vec2 scale = vec2(1.0);
                vec2 offset = vec2(0.0);
                float ratioDelta = ratio - u_textureRatio;
                if (ratioDelta >= 0.0) {
                    scale.y = 1.0 + ratioDelta;
                    offset.y = ratioDelta / 2.0;
                } else {
                    scale.x = 1.0 - ratioDelta;
                    offset.x = -ratioDelta / 2.0;
                }
                return (texCoord() + offset) / scale;
            }

            vec4 fgColor(float x, float y) {
                float p2 = u_parallaxFg * 2.0;
                vec2 scale = vec2(
                    (u_resolution.x + p2) / u_resolution.x,
                    (u_resolution.y + p2) / u_resolution.y
                );
                vec2 scaledTexCoord = texCoord() / scale;
                vec2 offset = vec2(
                    (1.0 - (1.0 / scale.x)) / 2.0,
                    (1.0 - (1.0 / scale.y)) / 2.0
                );
                return texture2D(u_waterMap,
                    (scaledTexCoord + offset) + (pixel() * vec2(x, y)) + parallax(u_parallaxFg)
                );
            }

            void main() {
                vec4 bg = texture2D(u_textureBg, scaledTexCoord() + parallax(u_parallaxBg));
                vec4 cur = fgColor(0.0, 0.0);

                float d = cur.b;
                float x = cur.g;
                float y = cur.r;

                float a = clamp(cur.a * u_alphaMultiply - u_alphaSubtract, 0.0, 1.0);

                vec2 refraction = (vec2(x, y) - 0.5) * 2.0;
                vec2 refractionParallax = parallax(u_parallaxBg - u_parallaxFg);
                vec2 refractionPos = scaledTexCoord()
                    + (pixel() * refraction * (u_minRefraction + (d * u_refractionDelta)))
                    + refractionParallax;

                vec4 tex = texture2D(u_textureFg, refractionPos);

                vec4 fg = vec4(tex.rgb * u_brightness, a);

                if (u_renderShadow) {
                    float borderAlpha = fgColor(0.0, -(d * 6.0)).a;
                    borderAlpha = borderAlpha * u_alphaMultiply - (u_alphaSubtract + 0.5);
                    borderAlpha = clamp(borderAlpha, 0.0, 1.0);
                    borderAlpha *= 0.2;
                    vec4 border = vec4(0.0, 0.0, 0.0, borderAlpha);
                    fg = blend(border, fg);
                }

                gl_FragColor = blend(bg, fg);
            }
        `,
        depthTest: false,
        depthWrite: false,
    });

    // ===== 8. 创建全屏显示场景 =====
    const planeGeometry = new PlaneGeometry(2, 2);
    const plane = new Mesh(planeGeometry, shaderMaterial);
    plane.position.z = 0;
    scene.add(plane);

    // ===== 9. 闪电效果函数 =====
    function flash(baseFg, baseBg, flashFg, flashBg) {
        function transitionFlash(to, t = 0.025) {
            return new Promise((resolve) => {
                const startTime = Date.now();
                const startValue = flashValue.v;
                const deltaValue = to - startValue;
                
                function animate() {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / (t * 1000), 1);
                    const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOut cubic
                    
                    flashValue.v = startValue + deltaValue * easedProgress;
                    
                    // 更新纹理
                    generateTextures(baseFg, baseBg);
                    if (flashFg && flashBg) {
                        generateTextures(flashFg, flashBg, flashValue.v);
                    }
                    fgTexture.needsUpdate = true;
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        resolve();
                    }
                }
                animate();
            });
        }

        let lastFlash = transitionFlash(1);
        const flashCount = Math.floor(Math.random() * 5) + 2; // 2-6次闪电
        
        for (let i = 0; i < flashCount; i++) {
            lastFlash = lastFlash.then(() => {
                return transitionFlash(Math.random() * 0.9 + 0.1);
            });
        }
        
        lastFlash = lastFlash.then(() => {
            return transitionFlash(1, 0.1);
        }).then(() => {
            transitionFlash(0, 0.25);
        });
    }

    // ===== 10. 天气切换函数 =====
    function switchWeather(weatherType) {
        const config = weatherConfigs[weatherType];
        if (!config) return;

        currentWeather = weatherType;
        
        // 清除之前的闪电定时器
        if (flashInterval) {
            clearInterval(flashInterval);
            flashInterval = null;
        }
        
        // 更新雨滴系统参数
        rainDropSystem.options.rainChance = config.rainChance;
        rainDropSystem.options.dropletsRate = config.dropletsRate;
        rainDropSystem.options.trailRate = config.trailRate;
        rainDropSystem.options.trailScaleRange = config.trailScaleRange;
        rainDropSystem.options.raining = config.rainChance > 0;

        // 更新纹理
        generateTextures(
            textureMap[config.fg].image,
            textureMap[config.bg].image
        );
        fgTexture.needsUpdate = true;

        // 更新背景纹理
        const newBgTexture = textureMap[config.bg];
        newBgTexture.flipY = true;
        newBgTexture.wrapS = ClampToEdgeWrapping;
        newBgTexture.wrapT = ClampToEdgeWrapping;
        shaderMaterial.uniforms.u_textureBg.value = newBgTexture;

        // 设置闪电效果
        if (config.flashChance > 0) {
            flashInterval = setInterval(() => {
                if (Math.random() < config.flashChance) {
                    flash(
                        textureMap[config.fg].image,
                        textureMap[config.bg].image,
                        config.flashFg ? textureMap[config.flashFg].image : null,
                        config.flashBg ? textureMap[config.flashBg].image : null
                    );
                }
            }, 500);
        }

        // 控制音频播放
        if (config.rainChance > 0) {
            playRainAudio();
        } else {
            pauseRainAudio();
        }

        // 清空现有雨滴
        rainDropSystem.clearDrops();
    }

    // ===== 10. 鼠标视差效果 =====
    const parallax = { x: 0, y: 0 };
    document.addEventListener('mousemove', (event) => {
        const x = event.clientX;
        const y = event.clientY;
        parallax.x = ((x / window.innerWidth) * 2) - 1;
        parallax.y = ((y / window.innerHeight) * 2) - 1;

        shaderMaterial.uniforms.u_parallax.value.set(parallax.x, parallax.y);
    });

    // ===== 10. 创建GUI控制 =====
    const gui = initGUI();
    const weatherFolder = gui.addFolder('天气控制');
    
    const weatherOptions = { weather: currentWeather };
    
    weatherFolder.add(weatherOptions, 'weather', {
        '下雨': 'rain',
        '暴雨': 'storm', 
        '毛毛雨': 'drizzle',
        '晴天': 'sunny'
    }).onChange((value) => {
        switchWeather(value);
    });
    
    // 添加shader参数控制
    const shaderFolder = gui.addFolder('Shader参数');
    shaderFolder.add(shaderMaterial.uniforms.u_brightness, 'value', 0.5, 2.0).name('亮度');
    shaderFolder.add(shaderMaterial.uniforms.u_alphaMultiply, 'value', 1, 20).name('透明度倍数');
    shaderFolder.add(shaderMaterial.uniforms.u_alphaSubtract, 'value', 0, 10).name('透明度减少');
    shaderFolder.add(shaderMaterial.uniforms.u_minRefraction, 'value', 100, 500).name('最小折射');
    shaderFolder.add(shaderMaterial.uniforms.u_refractionDelta, 'value', 100, 500).name('折射范围');
    
    // 添加雨滴参数控制
    const rainFolder = gui.addFolder('雨滴参数');
    rainFolder.add(rainDropSystem.options, 'rainChance', 0, 1).name('下雨概率');
    rainFolder.add(rainDropSystem.options, 'dropletsRate', 0, 100).name('小水滴速率');
    rainFolder.add(rainDropSystem.options, 'trailRate', 0, 5).name('拖尾速率');
    rainFolder.add(rainDropSystem.options, 'collisionRadius', 0.1, 1).name('碰撞半径');
    
    // 添加闪电控制
    const flashFolder = gui.addFolder('闪电效果');
    const flashControls = {
        triggerFlash: () => {
            const config = weatherConfigs[currentWeather];
            if (config.flashFg && config.flashBg) {
                flash(
                    textureMap[config.fg].image,
                    textureMap[config.bg].image,
                    textureMap[config.flashFg].image,
                    textureMap[config.flashBg].image
                );
            }
        },
        flashIntensity: 1.0
    };
    
    flashFolder.add(flashControls, 'triggerFlash').name('触发闪电');
    flashFolder.add(flashControls, 'flashIntensity', 0, 2).name('闪电强度').onChange((value) => {
        flashValue.v = value;
        fgTexture.needsUpdate = true;
    });
    
    // 添加音频控制
    const audioFolder = gui.addFolder('音频控制');
    const audioControls = {
        audioEnabled: isAudioEnabled,
        volume: 0.3,
        playAudio: () => playRainAudio(),
        pauseAudio: () => pauseRainAudio()
    };
    
    audioFolder.add(audioControls, 'audioEnabled').name('启用音频').onChange((value) => {
        isAudioEnabled = value;
        if (value && currentWeather !== 'sunny') {
            playRainAudio();
        } else {
            pauseRainAudio();
        }
    });
    
    audioFolder.add(audioControls, 'volume', 0, 1).name('音量').onChange((value) => {
        setAudioVolume(value);
    });
    
    audioFolder.add(audioControls, 'playAudio').name('播放音频');
    audioFolder.add(audioControls, 'pauseAudio').name('暂停音频');
    
    weatherFolder.open();
    shaderFolder.open();
    rainFolder.open();
    flashFolder.open();
    audioFolder.open();

    // ===== 11. 初始化音频 =====
    initAudio().then(() => {
        // 根据当前天气播放音频
        if (currentWeather !== 'sunny') {
            playRainAudio();
        }
    });

    // ===== 12. 渲染循环 =====
    function render() {
        // 更新雨滴纹理
        rainTexture.needsUpdate = true;

        // 渲染最终的雨滴效果
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    render();

    // ===== 13. 窗口大小调整 =====
    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // 更新渲染器
        renderer.setSize(width, height);

        // 更新 shader uniforms
        shaderMaterial.uniforms.u_resolution.value.set(width, height);
    });
}