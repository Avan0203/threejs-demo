/*
 * @Author: wuyifan 1208097313@qq.com
 * @Date: 2025-12-25 11:08:53
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2025-12-25 11:31:45
 * @FilePath: \threejs-demo\src\intersection\selectionManager.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */
import {
    Mesh,
    BoxGeometry,
    MeshNormalMaterial,
    MOUSE,
} from 'three';
import {
    initRenderer,
    initOrthographicCamera,
    initCustomGrid,
    initAxesHelper,
    initTrackballControls,
    initScene,
    resize
} from '../lib/tools/index.js';

window.onload = () => {
    init();
};

function init() {
    const renderer = initRenderer();
    const camera = initOrthographicCamera();
    camera.up.set(0, 0, 1);
    camera.updateProjectionMatrix();

    const scene = initScene();
    initAxesHelper(scene);
    renderer.setClearColor(0xffffff);
    initCustomGrid(scene);

    const controls = initTrackballControls(camera, renderer.domElement);
    controls.panSpeed = 20;
    // 设置 Blender 选择模式：
    // - 中键：旋转视图
    // - 中键 + Shift：平移视图
    // - 滚轮：缩放（默认）
    // - 左键和右键：无事件触发
    controls.mouseButtons = {
        LEFT: -1,           // 禁用左键
        MIDDLE: MOUSE.ROTATE, // 中键旋转，中键+Shift平移
        RIGHT: -1           // 禁用右键
    };

    // 实现中键+Shift的动态检测
    // TrackballControls 不会自动检查 Shift 键，需要手动实现
    const domElement = renderer.domElement;
    let isMiddleMouseDragging = false;
    let lastShiftState = false;
    
    // TrackballControls 的状态常量
    const STATE_ROTATE = 0;
    const STATE_PAN = 2;
    
    // 监听鼠标移动，检测 Shift 键状态变化并切换操作模式
    const handleMouseMove = (event) => {
        if (isMiddleMouseDragging) {
            const currentShiftState = event.shiftKey;
            
            // 如果 Shift 键状态改变，需要切换操作模式
            if (currentShiftState !== lastShiftState) {
                lastShiftState = currentShiftState;
                
                // 切换状态并重新初始化坐标点
                if (currentShiftState) {
                    // 按下 Shift，切换到平移模式
                    if (!controls.noPan && controls.state === STATE_ROTATE) {
                        controls.state = STATE_PAN;
                        // 重新初始化 PAN 坐标点
                        controls._panStart.copy(controls._getMouseOnScreen(event.pageX, event.pageY));
                        controls._panEnd.copy(controls._panStart);
                    }
                } else {
                    // 释放 Shift，切换回旋转模式
                    if (!controls.noRotate && controls.state === STATE_PAN) {
                        controls.state = STATE_ROTATE;
                        // 重新初始化 ROTATE 坐标点
                        controls._moveCurr.copy(controls._getMouseOnCircle(event.pageX, event.pageY));
                        controls._movePrev.copy(controls._moveCurr);
                    }
                }
            }
        }
    };
    
    // 监听鼠标按下事件，检查 Shift 键并设置初始状态
    // 使用 bubble 阶段，确保在 TrackballControls 的 onMouseDown 之后执行
    domElement.addEventListener('mousedown', (event) => {
        if (event.button === 1) { // 中键
            isMiddleMouseDragging = true;
            lastShiftState = event.shiftKey;
            
            // 如果按下 Shift，需要修改为 PAN 模式
            // 在 TrackballControls 处理完 mousedown 之后修改状态
            if (event.shiftKey && !controls.noPan) {
                controls.state = STATE_PAN;
                controls.noZoom = true;
                // 初始化 PAN 坐标点
                controls._panStart.copy(controls._getMouseOnScreen(event.pageX, event.pageY));
                controls._panEnd.copy(controls._panStart);
            }
            
            window.addEventListener('mousemove', handleMouseMove);
        }
    }, false); // 使用 bubble 阶段，在 TrackballControls 之后执行
    
    // 监听鼠标释放事件
    const handleMouseUp = (event) => {
        if (event.button === 1) { // 中键
            isMiddleMouseDragging = false;
            window.removeEventListener('mousemove', handleMouseMove);
        }
        controls.noZoom = false;
    };
    
    window.addEventListener('mouseup', handleMouseUp);
    const mesh = new Mesh(new BoxGeometry(3, 3, 3), new MeshNormalMaterial());
    scene.add(mesh);
    
    
    function render() {
        controls.update();

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    render();

    resize(renderer, camera);
}