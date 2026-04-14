import {
    BufferGeometry,
    BufferAttribute,
    MeshMatcapMaterial,
    LineBasicMaterial,
    TextureLoader
} from 'three';

// 动态计算资源路径，兼容本地开发和 GitHub Pages 部署
const getAssetPath = () => {
    const path = window.location.pathname;
    // 如果在 threejs-demo 子目录下（GitHub Pages）
    if (path.includes('/threejs-demo/')) {
        return '/threejs-demo/public/images/others/metal.png';
    }
    // 本地开发，根目录
    return '/public/images/others/metal.png';
};

const loader = new TextureLoader();
const texture = loader.load(getAssetPath());

class OpenCascadeBuilder {
    constructor() {
        this.material = {
            solid: new MeshMatcapMaterial({ matcap: texture }),
            edge: new LineBasicMaterial({ color: '#000000' })
        };
    }

    buildSolid(faceList) {
        const geometry = new BufferGeometry();
        const {
            position,
            normal,
            indices,
            uvs,
            colors
        } = this.#convertBufferAttribute(faceList);
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(position), 3));
        geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normal), 3));
        geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
        geometry.setAttribute('uv2', new BufferAttribute(new Float32Array(uvs), 2));
        geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
        geometry.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        geometry.userData = { faceList };
        return geometry;
    }

    buildEdge(edgeList) {
        const geometry = new BufferGeometry();
        const { position, indices, edgeData } = this.#convertEdgeBufferAttribute(edgeList);
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(position), 3));
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        geometry.userData = { edgeData, indices };
        return geometry;
    }

    #convertBufferAttribute(faceList) {
        const position = [];
        const normal = [];
        const indices = [];
        const uvs = [];
        const colors = [];

        let indexOffset = 0;
        let faceOffset = 0;

        faceList.forEach((face) => {
            position.push(...face.vertex);
            normal.push(...face.normal);
            uvs.push(...face.uv);

            for (let i = 0, l = face.index.length; i < l; i += 3) {
                indices.push(
                    face.index[i + 0] + indexOffset,
                    face.index[i + 1] + indexOffset,
                    face.index[i + 2] + indexOffset
                );
            }

            for (let i = 0, l = face.vertex.length; i < l; i += 3) {
                colors.push(face.faceIndex, faceOffset, 0);
            }

            faceOffset++;
            indexOffset += face.vertex.length / 3;
        });

        return {
            position,
            uvs,
            normal,
            indices,
            colors,
        };
    }

    #convertEdgeBufferAttribute(edgeList) {
        const globalEdgeData = { [-1]: { start: -1, end: -1 } };
        const position = [];
        const indices = [];

        let currentIndex = 0;

        edgeList.forEach((edge) => {
            const edgeData = {
                index: edge.index,
                start: indices.length,
                end: 0,
                position: []
            };

            for (let i = 0, l = edge.vertex.length - 3; i < l; i += 3) {
                position.push(
                    edge.vertex[i + 0],
                    edge.vertex[i + 1],
                    edge.vertex[i + 2],
                    edge.vertex[i + 3],
                    edge.vertex[i + 4],
                    edge.vertex[i + 5],
                );
                indices.push(currentIndex, currentIndex);
            }
            edgeData.end = indices.length - 1;
            globalEdgeData[currentIndex] = edgeData;
            currentIndex++;
        });
        return {
            position,
            indices,
            edgeData: globalEdgeData,
        };
    }
}

export { OpenCascadeBuilder }