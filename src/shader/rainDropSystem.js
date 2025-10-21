/*
 * @Author: wuyifan 1208097313@qq.com
 * @Date: 2025-10-20 16:33:20
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2025-10-21 15:17:27
 * @FilePath: \threejs-demo\src\shader\rainDropSystem.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */

class Drop {
    constructor(options = {}) {
        // 直接将属性存储在实例上，而不是嵌套在 data 中
        this.x = 0;
        this.y = 0;
        this.r = 0;
        this.spreadX = 0;
        this.spreadY = 0;
        this.momentum = 0;
        this.momentumX = 0;
        this.lastSpawn = 0;
        this.nextSpawn = 0;
        this.parent = null;
        this.isNew = true;
        this.killed = false;
        this.shrink = 0;
        
        // 应用传入的选项
        Object.assign(this, options);
    }
}

const dropSize = 64;

const defaultOption = {
    minR: 10,                                    // 最小雨滴半径
    maxR: 40,                                    // 最大雨滴半径
    maxDrops: 900,                              // 最大雨滴数量
    rainChance: 0.3,                            // 下雨概率
    rainLimit: 3,                               // 每帧最大生成雨滴数
    dropletsRate: 50,                           // 小水滴生成速率
    dropletsSize: [2, 4],                        // 小水滴大小范围
    dropletsCleaningRadiusMultiplier: 0.43,     // 水滴清理半径倍数
    raining: true,                              // 是否正在下雨
    globalTimeScale: 1,                         // 全局时间缩放
    trailRate: 1,                               // 拖尾生成速率
    autoShrink: true,                           // 是否自动收缩
    spawnArea: [-0.1, 0.95],                    // 雨滴生成区域（相对于屏幕高度）
    trailScaleRange: [0.2, 0.5],                 // 拖尾大小范围
    collisionRadius: 0.65,                      // 碰撞检测半径倍数
    collisionRadiusIncrease: 0.01,              // 碰撞半径随动量增加
    dropFallMultiplier: 1,                      // 雨滴下落速度倍数
    collisionBoostMultiplier: 0.05,             // 碰撞后动量增加倍数
    collisionBoost: 1,                          // 碰撞后基础动量增加
};

class RainDropSystem {
    constructor(width, height, scale, textureAlpha, textureColor, options = {}) {
        this.canvas = null; // 主画布
        this.ctx = null; // 主画布上下文
        this.drops = []; // 雨滴数组
        this.dropsGfx = []; // 雨滴图形缓存数组
        this.clearDropsGfx = null; // 清理雨滴图形缓存
        this.textureCleaningIterations = 0; // 纹理清理迭代次数
        this.lastRender = null; // 上次渲染时间
        this.dropletsPixelDensity = 1; // 小水滴像素密度
        this.droplets = null; // 小水滴画布
        this.dropletsCtx = null; // 小水滴画布上下文
        this.dropletsCounter = 0; // 小水滴计数器

        this.width = width; // 画布宽度
        this.height = height; // 画布高度
        this.scale = scale; // 缩放比例
        this.textureAlpha = textureAlpha; // 雨滴透明度纹理
        this.textureColor = textureColor; // 雨滴颜色纹理
        this.options = Object.assign({}, defaultOption, options); // 合并默认配置和用户配置
        this.init(); // 初始化
    }

    get deltaR() {
        return this.options.maxR - this.options.minR;
    }

    get area() {
        return (this.width * this.height) / this.scale;
    }

    get areaMultiplier() {
        return Math.sqrt(this.area / (1024 * 768));
    }

    init() {
        this.canvas = createCanvas(this.width, this.height);
        this.ctx = this.canvas.getContext('2d');

        this.droplets = createCanvas(this.width * this.dropletsPixelDensity, this.height * this.dropletsPixelDensity);
        this.dropletsCtx = this.droplets.getContext('2d');

        this.clearDropsGfx = createCanvas(128, 128);
        const clearCtx = this.clearDropsGfxCtx = this.clearDropsGfx.getContext('2d');
        clearCtx.fillStyle = '#000';
        clearCtx.beginPath();
        clearCtx.arc(64, 64, 64, 0, Math.PI * 2);
        clearCtx.fill();


        this.renderDropsGfx();
        this.update();
    }

    renderDropsGfx() {
        let dropBuffer = createCanvas(dropSize, dropSize);
        let dropBufferCtx = dropBuffer.getContext('2d');

        this.dropsGfx = Array.apply(null, { length: 255 }).map((current, i) => {
            const drop = createCanvas(dropSize, dropSize);
            const dropCtx = drop.getContext('2d');

            // 清空缓冲区
            dropBufferCtx.clearRect(0, 0, dropSize, dropSize);

            // 绘制颜色纹理
            dropBufferCtx.globalCompositeOperation = 'source-over';
            dropBufferCtx.drawImage(this.textureColor, 0, 0, dropSize, dropSize);

            // 添加蓝色叠加层，作为深度
            dropBufferCtx.globalCompositeOperation = 'screen';
            dropBufferCtx.fillStyle = `rgba(0, 0, ${i}, 1)`;
            dropBufferCtx.fillRect(0, 0, dropSize, dropSize);

            // 绘制透明度遮罩
            dropCtx.globalCompositeOperation = 'source-over';
            dropCtx.drawImage(this.textureAlpha, 0, 0, dropSize, dropSize);

            // 颜色与透明度合成
            dropCtx.globalCompositeOperation = 'source-in';
            dropCtx.drawImage(dropBuffer, 0, 0, dropSize, dropSize);
            return drop;
        });
    }

    isLimited() {
        return this.drops.length >= this.options.maxDrops * this.areaMultiplier;
    }

    addDrop(drop) {
        if (this.isLimited() || drop == null) return false;
        this.drops.push(drop);
        return true;
    }

    clearDrops() {
        this.drops.forEach((drop) => {
            // 随机延迟后开始收缩
            setTimeout(() => {
                drop.shrink = 0.1 + random(0.5);
            }, random(1200))
        })
        this.clearTexture();
    }

    clearTexture() {
        this.textureCleaningIterations = 50;
    }

    update() {
        // 清空画布
        this.clearCanvas();

        // 计算时间差和时间缩放
        let now = Date.now();
        if (this.lastRender === null) {
            this.lastRender = now;
        }
        let deltaT = now - this.lastRender;
        // 相对于60fps的时间缩放(1/60)*1000
        let timeScale = deltaT / 16.6666;
        if (timeScale > 1.1) {
            timeScale = 1.1;
        }
        timeScale *= this.options.globalTimeScale;
        this.lastRender = now;

        // 更新所有雨滴
        this.updateDrops(timeScale);

        // 动画下一帧
        requestAnimationFrame(this.update.bind(this));
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    updateDrops(timeScale) {
        let newDrops = [];

        // 更新小水滴效果
        this.updateDroplets(timeScale);
        // 生成新的雨滴
        const rainDrops = this.updateRain(timeScale);
        newDrops = newDrops.concat(rainDrops);

        const aspHeight = this.height / this.scale;
        const aspWidth = this.width / this.scale;

        // 按位置排序雨滴（从后往前绘制，实现深度效果）
        this.drops.sort((a, b) => {
            const va = (a.y * aspWidth) + a.x;
            const vb = (b.y * aspWidth) + b.x;
            return va > vb ? 1 : va == vb ? 0 : -1;
        });

        const {
            minR, maxR, dropFallMultiplier, autoShrink,
            trailRate, raining, trailScaleRange, collisionBoostMultiplier,
            collisionBoost, globalTimeScale, collisionRadius, collisionRadiusIncrease
        } = this.options;

        const pi = Math.PI;

        // 遍历所有雨滴进行更新（更新重力效果）
        this.drops.forEach((drop, i) => {
            if (drop.killed) return;

            // 雨滴有概率"向下爬行"
            if (chance((drop.r - (minR * dropFallMultiplier)) * (0.1 / this.deltaR) * timeScale)) {
                drop.momentum += random((drop.r / maxR) * 4);
            }

            // 清理小雨滴
            if (autoShrink && drop.r <= minR && chance(0.05 * timeScale)) {
                drop.shrink += 0.01;
            }

            // 更新收缩效果
            drop.r -= drop.shrink * timeScale;
            if (drop.r <= 0) drop.killed = true;

            // 更新拖尾效果
            if (raining) {
                drop.lastSpawn += drop.momentum * timeScale * trailRate;
                if (drop.lastSpawn > drop.nextSpawn && !this.isLimited()) {
                    // 创建拖尾雨滴
                    const trailDrop = new Drop({
                        x: drop.x + random(-drop.r, drop.r) * 0.1,
                        y: drop.y - drop.r * 0.01,
                        r: drop.r * random(trailScaleRange[0], trailScaleRange[1]),
                        spreadY: drop.momentum * 0.1,
                        parent: drop,
                    });

                    newDrops.push(trailDrop);

                    drop.r *= Math.pow(0.97, timeScale);
                    drop.lastSpawn = 0;
                    drop.nextSpawn = random(minR, maxR) - (drop.momentum * 2 * trailRate) + (maxR - drop.r);
                }
            }

            // 标准化扩散效果（逐渐减少扩散）
            drop.spreadX *= Math.pow(0.4, timeScale);
            drop.spreadY *= Math.pow(0.7, timeScale);

            // 更新位置
            let moved = drop.momentum > 0;
            if (moved && !drop.killed) {
                drop.y += drop.momentum * globalTimeScale;
                drop.x += drop.momentumX * globalTimeScale;
                if (drop.y > aspHeight + drop.r) {
                    drop.killed = true;
                }
            }

            // 碰撞检测
            let checkCollision = (moved || drop.isNew) && !drop.killed;
            drop.isNew = false;
            if (checkCollision) {
                this.drops.slice(i + 1, i + 70).forEach((drop2) => {
                    if (
                        drop != drop2 &&
                        drop.r > drop2.r &&
                        drop.parent != drop2 &&
                        drop2.parent != drop &&
                        !drop2.killed
                    ) {
                        const dx = drop2.x - drop.x;
                        const dy = drop2.y - drop.y;
                        const d = Math.sqrt((dx * dx) + (dy * dy));
                        if (d < (drop.r + drop2.r) * (collisionRadius + (drop.momentum * collisionRadiusIncrease * timeScale))) {

                            const r1 = drop.r;
                            const r2 = drop2.r;
                            const a1 = pi * (r1 * r1);
                            const a2 = pi * (r2 * r2);
                            let targetR = Math.sqrt((a1 + (a2 * 0.8)) / pi);
                            if (targetR > this.options.maxR) {
                                targetR = this.options.maxR;
                            }
                            drop.r = targetR;
                            drop.momentumX += dx * 0.1;
                            drop.spreadX = 0;
                            drop.spreadY = 0;
                            drop2.killed = true;
                            drop.momentum = Math.max(drop2.momentum, Math.min(40, drop.momentum + (targetR * collisionBoostMultiplier) + collisionBoost));
                        }
                    }
                });
            }

            // 减缓动量
            drop.momentum -= Math.max(1, (minR * 0.5) - drop.momentum) * 0.1 * timeScale;
            if (drop.momentum < 0) drop.momentum = 0;
            drop.momentumX *= Math.pow(0.7, timeScale);

            // 如果雨滴未销毁，添加到新数组并绘制
            if (!drop.killed) {
                newDrops.push(drop);
                // 如果雨滴移动了且启用了小水滴清理，清理对应区域的小水滴
                if (moved && this.options.dropletsRate > 0) this.clearDroplets(drop.x, drop.y, drop.r * this.options.dropletsCleaningRadiusMultiplier);
                // 绘制雨滴
                this.drawDrop(this.ctx, drop);
            }


        }, this)

        // 更新雨滴数组
        this.drops = newDrops;
    }

    updateDroplets(timeScale) {
        // 如果正在清理纹理，逐渐清除小水滴
        if (this.textureCleaningIterations > 0) {
            this.textureCleaningIterations -= 1 * timeScale;

            this.dropletsCtx.globalCompositeOperation = 'destination-out';
            this.dropletsCtx.fillStyle = `rgba(0,0,0,${0.05 * timeScale})`;
            this.dropletsCtx.fillRect(0, 0, this.width * this.dropletsPixelDensity, this.height * this.dropletsPixelDensity);
        }

        // 如果正在下雨，生成小水滴
        if (this.options.raining) {
            this.dropletsCounter += this.options.dropletsRate * timeScale * this.areaMultiplier;

            const [minR, maxR] = this.options.dropletsSize;
            const aspWidth = this.width / this.scale;
            const aspHeight = this.height / this.scale;
            times(this.dropletsCounter, () => {
                this.dropletsCounter--;
                // 在随机位置绘制小水滴
                this.drawDroplet(
                    random(aspWidth),
                    random(aspHeight),
                    random(minR, maxR, (n) => {
                        return n * n;
                    })
                )
            })
        }

        // 将小水滴画布绘制到主画布上
        this.ctx.drawImage(this.droplets, 0, 0, this.width, this.height);
    }

    drawDroplet(x, y, r) {
        this.drawDrop(this.dropletsCtx, new Drop({
            x: x * this.dropletsPixelDensity,
            y: y * this.dropletsPixelDensity,
            r: r * this.dropletsPixelDensity
        }));
    }

    clearDroplets(x, y, r = 30) {
        const ctx = this.dropletsCtx;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(
            this.clearDropsGfx,
            (x - r) * this.dropletsPixelDensity * this.scale,
            (y - r) * this.dropletsPixelDensity * this.scale,
            (r * 2) * this.dropletsPixelDensity * this.scale,
            (r * 2) * this.dropletsPixelDensity * this.scale * 1.5
        );
    }

    drawDrop(ctx, drop) {
        if (this.dropsGfx.length > 0) {
            let {
                x, y, r, spreadX, spreadY
            } = drop;
            let scaleX = 1;
            let scaleY = 1.5;

            let d = Math.max(0, Math.min(1, ((r - this.options.minR) / (this.deltaR)) * 0.9));
            d *= 1 / (((spreadX + spreadY) * 0.5) + 1);

            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            d = Math.floor(d * (this.dropsGfx.length - 1));
            ctx.drawImage(
                this.dropsGfx[d],
                (x - (r * scaleX * (spreadX + 1))) * this.scale,
                (y - (r * scaleY * (spreadY + 1))) * this.scale,
                (r * 2 * scaleX * (spreadX + 1)) * this.scale,
                (r * 2 * scaleY * (spreadY + 1)) * this.scale
            );
        }
    }

    updateRain(timeScale) {
        let rainDrops = [];
        if (this.options.raining) {
            const limit = this.options.rainLimit * timeScale * this.areaMultiplier;
            let count = 0;

            const aspWidth = this.width / this.scale;
            const aspHeight = this.height / this.scale;
            const [minSpawnY, maxSpawnY] = this.options.spawnArea;

            while (chance(this.options.rainChance * timeScale * this.areaMultiplier) && count < limit) {
                count++;

                if (this.drops.length < this.options.maxDrops * this.areaMultiplier) {
                    // 生成随机半径（使用立方函数偏向大半径）
                    const r = random(this.options.minR, this.options.maxR, (n) => {
                        return Math.pow(n, 3);
                    });

                    const drop = new Drop({
                        x: random(aspWidth),
                        y: random(aspHeight * minSpawnY, aspHeight * maxSpawnY),
                        r,
                        spreadX: 1.5,
                        spreadY: 1.5,
                        momentum: 1 + ((r - this.options.minR) * 0.1) + random(2),
                    });
                    rainDrops.push(drop);
                }
            }
        }
        return rainDrops;
    }

}


/**
   * @description: 创建canvas
   * @param {*} width
   * @param {*} height
   * @return {*}
   */
function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

/**
 * @description: callback 执行 n 次
 * @param {*} n
 * @param {Function} callback
 * @return {*}
 */
function times(n, callback) {
    for (let i = 0; i < n; i++) {
        callback.call(this, i)
    }
}

/**
 * @description: 生成随机数
 * @param {number} from
 * @param {number} to
 * @param {(n:number)=>number} interpolation
 * @return {number}
 */
function random(from = undefined, to = undefined, interpolation = undefined) {
    if (from === undefined) {
        from = 0;
        to = 1;
    } else if (from !== undefined && to === undefined) {
        to = from;
        from = 0;
    }

    const delta = to - from;

    if (interpolation === undefined) {
        interpolation = (n) => n
    }

    return from + interpolation(Math.random()) * delta
}

/**
 * @description: 概率判断小于c
 * @param {number} c
 * @return {boolean}
 */
function chance(c) {
    return random() <= c;
}

export { RainDropSystem }