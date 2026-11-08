import { Loader } from 'three';
import { SplatMesh } from '../spark/dist/spark.module.js';

class GaussianSplatLoader extends Loader {
    load(url, onLoad, onProgress, onError) {
        const loadPromise = this.loadAsync(url, onProgress);

        if (!onLoad && !onProgress && !onError) {
            return loadPromise;
        }

        loadPromise
            .then(mesh => onLoad?.(mesh))
            .catch(error => {
                if (onError) {
                    onError(error);
                } else {
                    console.error('Failed to load Gaussian splat PLY:', error);
                }
            });

        return undefined;
    }

    async loadAsync(url, onProgress) {
        const path = this.path ? `${this.path}${url}` : url;
        const resolvedUrl = this.manager.resolveURL(path);

        return this.#loadSplat({
            url: resolvedUrl,
            onProgress,
        }, resolvedUrl);
    }

    async loadFile(file, onProgress) {
        const fileBytes = await file.arrayBuffer();

        return this.#loadSplat({
            fileBytes,
            fileName: file.name,
            onProgress,
        }, file.name);
    }

    async #loadSplat(options, source) {
        this.manager.itemStart(source);

        try {
            const splatMesh = new SplatMesh(options);
            const loadedMesh = await splatMesh.initialized;
            this.manager.itemEnd(source);
            return loadedMesh;
        } catch (error) {
            this.manager.itemError(source);
            this.manager.itemEnd(source);
            throw error;
        }
    }
}

export { GaussianSplatLoader };
