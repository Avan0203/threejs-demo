/*
 * @Date: 2024-07-19 22:28:29
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2026-02-08 15:52:59
 * @FilePath: \threejs-demo\pageList.js
 */
const list = [
  {
    category: "animation",
    title: "Animation",
    pages: [
      {
        path: "/animate/keyframeTrack.html",
        title: "Custom Keyframe Track",
      },
      {
        path: "/animate/loadModalWithAnimation.html",
        title: "Load Modal With Animation",
      },
      {
        path: "/animate/animateControl.html",
        title: "Animate Control",
      },
      {
        path: "/animate/characterControl.html",
        title: "Character Control",
      },
      {
        path: "/tween/portal.html",
        title: "Portal",
      },
    ],
  },
  {
    category: "renderer",
    title: "Renderer",
    pages: [
      {
        path: "/render/useRenderTarget.html",
        title: "Use Render Target",
      },
      {
        path: "/render/scissorTest.html",
        title: "Use Scissor Test",
      },
      {
        path: "/render/renderDeepPeeling.html",
        title: "Use Deep Peeling",
      },
      {
        path: "/render/renderWBOIT.html",
        title: "Use Deep WBOIT",
      },
    ],
  },
  {
    category: "composer",
    title: "Composer",
    pages: [
      {
        path: "/composer/useOITRenderPass.html",
        title: "OIT Render Pass",
      },
      {
        path: "/composer/useCopyShader.html",
        title: "Copy Shader",
      },
      {
        path: "/composer/useBackgroundPass.html",
        title: "Background Pass",
      },
      {
        path: "/composer/unRealBloom.html",
        title: "unRealBloom Pass",
      },
    ],
  },
  {
    category: "controls",
    title: "Controls",
    pages: [
      {
        path: "/controls/useArcballControls.html",
        title: "Use ArcBall Controls",
      },
      {
        path: "/controls/useOrbitControls.html",
        title: "Use Orbit Controls",
      },
      {
        path: "/controls/useTrackballControls.html",
        title: "Use Trackball Controls",
      },
      {
        path: "/controls/useFirstPersonControls.html",
        title: "Use First Person Controls",
      },
      {
        path: "/controls/usePointerLockControls.html",
        title: "Use Pointer Lock Controls",
      },
      {
        path: "/controls/useBlenderControls.html",
        title: "Use Blender Controls",
      }
    ],
  },
  {
    category: "camera",
    title: "Camera",
    pages: [
      {
        path: "/camera/layer.html",
        title: "Layer",
      },
      {
        path: "/camera/dynamicGrid.html",
        title: "Dynamic Grid",
      },
      {
        path: "/camera/focusObject.html",
        title: "Focus Object",
      },
      {
        path: "/camera/saveState.html",
        title: "Save Camera State",
      },
      {
        path: "/camera/cubeCamera.html",
        title: "Cube Camera reflection",
      },
      {
        path: "/camera/uiCamera.html",
        title: "UI Camera",
      }
    ],
  },
  {
    category: "light",
    title: "Light",
    pages: [
      {
        path: "/light/shadow.html",
        title: "Shadow",
      },
      {
        path: "/light/shadowRender.html",
        title: "Custom Direction Light Shadow",
      },
    ],
  },
  {
    category: "geometry",
    title: "Geometry",
    pages: [
      {
        path: "/geometry/parametricGeometry.html",
        title: "Parametric Geometry",
      },
      {
        path: "/geometry/ring.html",
        title: "Ring Geometry",
      },
      {
        path: "/geometry/extrudeGeometry.html",
        title: "Extrude Geometry",
      },
      {
        path: "/geometry/formulaPolygon.html",
        title: "Create Mesh Using Formula",
      },
      {
        path: "/geometry/lathePolygon.html",
        title: "Lathe Geometry",
      },
      {
        path: "/geometry/shapeGeometry.html",
        title: "Shape Geometry",
      },
    ],
  },
  {
    category: "material",
    title: "Material",
    pages: [
      {
        path: "/material/clipping.html",
        title: "Clipping Plane",
      },
      {
        path: "/material/clippingSphere.html",
        title: "Clipping Sphere",
      },
      {
        path: "/material/polygonOffsetTest.html",
        title: "PolygonOffset",
      },
      {
        path: "/material/stencil.html",
        title: "Stencil",
      },
      {
        path: "/material/transport.html",
        title: "Texture Transport",
      },
      {
        path: "/material/blendingTest.html",
        title: "Blending (WIP)",
      },
      {
        path: "/material/depthTest.html",
        title: "Depth Test",
      },
      {
        path: "/material/stencilMaterial.html",
        title: "Magic Box",
      },
    ],
  },
  {
    category: "shader",
    title: "Shader",
    pages: [
      {
        path: "/shader/shaderToy.html",
        title: "Shader Toy Test",
      },
      {
        path: "/shader/fresnelEffect.html",
        title: "Fresnel Effect",
      },
      {
        path: "/shader/materialTest.html",
        title: "Custom Material",
      },
      {
        path: "/shader/cloud.html",
        title: "Cloud",
      },
      {
        path: "/shader/audioContext.html",
        title: "Audio Context Visualization",
      },
      {
        path: "/shader/grass.html",
        title: "Grass Land",
      },
      {
        path: '/shader/city.html',
        title: 'Smart City'
      },
      {
        path: "/shader/rainEffect.html",
        title: "Rain Effect",
      }
    ],
  },
  {
    category: "Physics",
    title: "Physics",
    pages: [
      {
        path: "/cannon/index.html",
        title: "Cannon 1",
      },
      {
        path: "/cannon/throw.html",
        title: "Throw Circle",
      },
      {
        path: "/cannon/lockConstraint.html",
        title: "Bridge (Lock Constraint)",
      },
      {
        path: "/cannon/pointConstraint.html",
        title: "Bridge (Point Constraint)",
      },
      {
        path: "/cannon/heightField.html",
        title: "Height Field",
      },
      {
        path: "/cannon/pointerLockControl.html",
        title: "Pointer Lock Controls",
      },
      {
        path: "/cannon/bowling.html",
        title: "Bowling Game",
      },
      {
        path: "/cannon/vehicle.html",
        title: "Vehicle",
      },
      {
        path: "/cannon/breaker.html",
        title: "Breaker Block",
      },
    ],
  },
  {
    category: "line",
    title: "Line",
    pages: [
      {
        path: "/line/useLine.html",
        title: "Use Line",
      },
      {
        path: "/line/lineExtend.html",
        title: "Line Extend",
      },
      {
        path: "/line/boldLine.html",
        title: "Bold Line",
      },
      {
        path:"/line/drawBoard.html",
        title:"Draw Board"
      }
    ],
  },
  {
    category: "particle",
    title: "Particle",
    pages: [
      {
        path: "/particle/common.html",
        title: "Common",
      },
      {
        path: "/particle/particlesTexture.html",
        title: "Particles Texture",
      },
      {
        path: "/particle/geometry.html",
        title: "Geometry",
      },
      {
        path: "/particle/GRAVITY.html",
        title: "Gravity",
      },
      {
        path: "/particle/image.html",
        title: "Image",
      },
      {
        path: "/particle/galaxy.html",
        title: "Galaxy",
      },
      {
        path: "/particle/rainPoints.html",
        title: "Rain (particle)",
      },
    ],
  },
  {
    category: "texture",
    title: "Texture",
    pages: [
      {
        path: "/texture/commonTexture.html",
        title: "Common Texture",
      },
      {
        path: "/texture/colorMap.html",
        title: "View House 3D with `.map` Texture",
      },
      {
        path: "/texture/useTexture.html",
        title: "Use Texture",
      },
      {
        path: "/texture/useSpriteTexture.html",
        title: "Use Sprite Texture",
      },
      {
        path: "/texture/canvasTexture.html",
        title: "Use Canvas Texture",
      },
      {
        path: "/texture/textureAtlas.html",
        title: "Texture Atlas",
      }
    ],
  },
  {
    category: "canvas",
    title: "Canvas",
    pages: [
      {
        path: "/canvas/canvasGradient.html",
        title: "Canvas Draw Gradient",
      },
      {
        path: "/canvas/addWaterMark.html",
        title: "WaterMark",
      },
      {
        path: "/canvas/mediaDevices.html",
        title: "Microphone Visualization",
      },
    ],
  },
  {
    category: "loader",
    title: "Loader",
    pages: [
      {
        path: "/loader/gltfLoader.html",
        title: "GLTF Loader",
      },
      {
        path: "/loader/cubeTextureLoader.html",
        title: "Cube Texture Loader",
      },
      {
        path: "/loader/rgbeLoader.html",
        title: "RGBE Loader",
      },
      {
        path: "/texture/commonTexture.html",
        title: "FBX Loader",
      },
      {
        path: "/loader/objLoader.html",
        title: "OBJ Loader",
      },
      {
        path: "/loader/usdzLoader.html",
        title: "USDZ Loader",
      },
      {
        path: "/loader/geojsonLoader.html",
        title: "Geojson Loader",
      },
    ],
  },
  {
    category: "intersection",
    title: "Intersection",
    pages: [
      {
        path: "/intersection/selectInstanceMesh.html",
        title: "Select InstanceMesh",
      },
      {
        path: "/intersection/gpuPick.html",
        title: "GPU Pick",
      },
      {
        path: "/intersection/voxelsGenerate.html",
        title: "Voxels Generate",
      }
    ],
  },
  {
    category: "object",
    title: "Object",
    pages: [
      {
        path: "/object/instanceMesh.html",
        title: "Use Instance Mesh",
      },
      {
        path: "/geometry/edgeGeometry.html",
        title: "Edge Geometry",
      },
      {
        path: "/object/rainInstanceMesh.html",
        title: "Heave Rain",
      },
    ],
  },
  {
    category: "helper",
    title: "Helper",
    pages: [
      {
        path: "/helper/viewHelperTest.html",
        title: "View Helper Test",
      },
      {
        path: "/helper/rulerHelper.html",
        title: "Ruler Helper Demo",
      },
      {
        path: "/helper/viewIndicatorHelper.html",
        title: "View Indicator Helper",
      }
    ],
  },
  {
    category: "math",
    title: "Math",
    pages: [
      {
        path: "/math/modalMatrix.html",
        title: "Solar System (ModalMatrix)",
      },
      {
        path: "/math/rotateMatrix.html",
        title: "Robotic Arm (Matrix4)",
      },
      {
        path: "/math/viewMatrix.html",
        title: "Look At Ball (ViewMatrix)",
      },
      {
        path: "/math/orthographic.html",
        title: "Frustum (ProjectionMatrix)",
      },
    ],
  },
  {
    category: "noise",
    title: "Noise",
    pages: [
      {
        path: "/noise/perlinNoiseDemo1.html",
        title: "Perlin Noise Demo 1",
      },
      {
        path: "/noise/terrainGenerate.html",
        title: "Terrain Generate",
      },
    ],
  },
  {
    category: "algorithms",
    title: "Algorithms",
    pages: [
      {
        path: "/algorithms/quadTreeDemo.html",
        title: "Quad Tree Demo",
      },
      {
        path: "/algorithms/isSamplePolygon.html",
        title: "Judge if Sample Polygon",
      },
      {
        path: "/algorithms/splitMesh.html",
        title: "Split Mesh",
      },
      {
        path: "/algorithms/mazeGenerate.html",
        title: "Maze Generate",
      },
      {
        path: "/algorithms/contain.html",
        title: "Contain",
      },
      {
        path: "/cannon/maze3D.html",
        title: "Maze Adventure",
      },
      {
        path: "/algorithms/occlusionCulling.html",
        title: "Occlusion Culling by Ray",
      }
    ],
  },
  {
    category: "occt",
    title: "OpenCascade",
    pages: [
      {
        path: "/occt/occt.html",
        title: "OpenCascade Test (no worker)",
      },
      {
        path: "/occt/baseShape.html",
        title: "baseShape",
      },
      {
        path: "/occt/face.html",
        title: "Face",
      },
      {
        path: "/occt/importStep.html",
        title: "Import Step File",
      }
    ]
  },
  {
    category: "plot",
    title: "Plot",
    pages: [
      { path: "/plot/triangularMesh.html", title: "Triangular Mesh Plot" },
    ],
  },
  {
    category: "booleanOperation",
    title: "Boolean Operation",
    pages: [
      {
        path: "/booleanOperation/3d.html",
        title: "3D Boolean Operation",
      },
      {
        path: "/booleanOperation/2d.html",
        title: "2D Boolean Operation",
      },
      {
        path: "/booleanOperation/intersection.html",
        title: "intersection",
      },
    ],
  },
  {
    category: "others",
    title: "Others",
    pages: [
      {
        path: "/triangle/triangle.html",
        title: "Triangle",
      },
      {
        path: "/zFighting/pologyOffsetTest.html",
        title: "Polygon Offset Test",
      },
      {
        path: "/tween/useTween.html",
        title: "Use Tween",
      },
    ],
  },
];

export { list };
