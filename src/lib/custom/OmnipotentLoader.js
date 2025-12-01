/*
 * @Author: wuyifan 1208097313@qq.com
 * @Date: 2025-06-23 16:13:21
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2025-12-01 17:27:54
 * @FilePath: \threejs-demo\src\lib\custom\OmnipotentLoader.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */
import {
    Loader,
    LoadingManager
} from 'three';

// 动态导入映射：返回Promise，resolve为Loader类
const loaderImportMap = {
    gltf: () => import('three/examples/jsm/loaders/GLTFLoader.js').then(m => m.GLTFLoader),
    fbx: () => import('three/examples/jsm/loaders/FBXLoader.js').then(m => m.FBXLoader),
    obj: () => import('three/examples/jsm/loaders/OBJLoader.js').then(m => m.OBJLoader),
    hdr: () => import('three/examples/jsm/loaders/RGBELoader.js').then(m => m.RGBELoader),
    drc: () => import('three/examples/jsm/loaders/DRACOLoader.js').then(m => m.DRACOLoader),
    image: () => import('three').then(m => m.TextureLoader),
    cube: () => import('three').then(m => m.CubeTextureLoader),
    audio: () => import('three').then(m => m.AudioLoader)
}

const defaultManager = new LoadingManager();

class OmnipotentLoader extends Loader {
    constructor(manager = defaultManager) {
        super(manager);
        this.instances = {}
        this.loaderPromises = {} // 缓存动态导入的Promise
        this.libPath = {
            dracoDecoderPath: '',
            dracoEncoderPath: '',
        };
        this.workerLimit = 2;
    }

    /**
     * @description 设置加载器的路径
     * @param {{[key: string]: string}} path 路径对象
     * @return {void}
     * @example
     * loader.setLibPath({
     *     dracoDecoderPath: 'https://threejs.org/examples/js/libs/draco/',
     *     // 其他加载器的路径
     * })
     */
    setLibPath(path) {
        this.libPath = { ...this.libPath, ...path };
    }

    async setWorkerLimit(limit) {
        this.workerLimit = limit;
        // 等待所有正在加载的Promise完成
        const loaderTypes = Object.keys(this.instances).concat(Object.keys(this.loaderPromises));
        const uniqueTypes = [...new Set(loaderTypes)];
        const instances = await Promise.all(uniqueTypes.map(type => this.getLoaderInstance(type)));
        instances.forEach(loader => {
            if (Object.hasOwn(loader, 'setWorkerLimit')) {
                loader.setWorkerLimit(limit);
            }
        });
    }


    load(urls, onLoad, onProgress, onError) {
        // 对于需要立即返回值的loader（如TextureLoader），由于获取loader是异步的
        // 无法真正同步返回，所以返回Promise，调用者需要await
        // 对于使用回调的场景，异步执行，不返回Promise（保持向后兼容）
        
        const loadPromise = (async () => {
            try {
                if (Array.isArray(urls)) {
                    const loader = await this.getLoaderInstance('cube');
                    return loader.load(urls, onLoad, onProgress, onError);
                } else {
                    const fileType = this.#getFileType(urls);
                    if (fileType === 'unknown') {
                        const errorMessage = 'Unknown file type: ' + urls;
                        console.error(errorMessage);
                        if (onError) {
                            onError(new Error(errorMessage));
                            return;
                        }
                        throw new Error(errorMessage);
                    }
                    const loader = await this.getLoaderInstance(fileType);
                    const result = loader.load(urls, onLoad, onProgress, onError);
                    return result;
                }
            } catch (error) {
                console.error('Failed to get loader instance:', error);
                if (onError) {
                    onError(error);
                    return;
                }
                throw error;
            }
        })();

        // 如果没有提供回调，说明调用者期望立即返回值（如TextureLoader）
        // 返回Promise，调用者需要await
        if (!onLoad && !onProgress && !onError) {
            return loadPromise;
        }
        
        // 有回调的情况，异步执行但不返回Promise（保持向后兼容）
        // 但注意：对于TextureLoader等立即返回值的loader，调用者仍需要await
        return undefined;
    }

    async getLoaderInstance(fileType) {
        // 如果已有实例，直接返回
        if (this.instances[fileType]) {
            return this.instances[fileType];
        }

        // 如果正在加载，返回缓存的Promise
        if (this.loaderPromises[fileType]) {
            return this.loaderPromises[fileType];
        }

        // 创建新的加载Promise
        const importLoader = loaderImportMap[fileType];
        if (!importLoader) {
            throw new Error(`Unknown loader type: ${fileType}`);
        }

        this.loaderPromises[fileType] = importLoader().then(LoaderClass => {
            const loader = new LoaderClass(this.manager);
            if (this.path !== '') {
                loader.setPath(this.path);
            }
            
            // DRACOLoader特殊处理
            if (fileType === 'drc') {
                loader.setDecoderPath(this.libPath.dracoDecoderPath);
                loader.setDecoderConfig({type: 'js'});
            }
            
            this.instances[fileType] = loader;
            return loader;
        }).catch(error => {
            // 加载失败，清除Promise缓存，允许重试
            delete this.loaderPromises[fileType];
            throw error;
        });

        return this.loaderPromises[fileType];
    }

    async loadAsync(url, onProgress) {
        if (Array.isArray(url)) {
            console.error('loadAsync cant`t support array');
            return Promise.reject(new Error('loadAsync cant`t support array'));
        }
        const fileType = this.#getFileType(url);
        if (fileType === 'unknown') {
            return Promise.reject(new Error('Unknown file type: ' + url));
        }
        
        try {
            const loader = await this.getLoaderInstance(fileType);
            // 如果loader有loadAsync方法，直接使用
            if (typeof loader.loadAsync === 'function') {
                return loader.loadAsync(url, onProgress);
            }
            // 否则使用Promise包装load方法
            return new Promise((resolve, reject) => {
                loader.load(url, resolve, onProgress, (error) => {
                    console.error('Failed to load resource:', error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error('Failed to load resource:', error);
            return Promise.reject(error);
        }
    }

    parse(/*any*/) {
        console.warn('OmnipotentLoader can`t parse');
        return this;
    }

    async setPath(path) {
        // 等待所有正在加载的Promise完成
        const loaderTypes = Object.keys(this.instances).concat(Object.keys(this.loaderPromises));
        const uniqueTypes = [...new Set(loaderTypes)];
        const instances = await Promise.all(uniqueTypes.map(type => this.getLoaderInstance(type)));
        instances.forEach(loader => {
            loader.setPath(path);
        });
        return super.setPath(path);
    }

    #getFileType(url) {
        const ext = url.split('.').pop().toLowerCase();
        const typeMap = {
            'glb': 'gltf',
            'gltf': 'gltf',
            'fbx': 'fbx',
            'obj': 'obj',
            'png': 'image',
            'jpg': 'image',
            'jpeg': 'image',
            'webp': 'image',
            'mp3': 'audio',
            'wav': 'audio',
            'hdr': 'hdr',
            'drc': 'drc'
        };
        return typeMap[ext] || 'unknown';
    }
}

export { OmnipotentLoader }