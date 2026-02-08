# Three.js Demo Showcase

<p align="center">
  <img src="./public/gif/audioContext.gif" width="48%" alt="Audio Context" />
  <img src="./public/gif/bowling.gif" width="48%" alt="Bowling" />
</p>
<p align="center">
  <img src="./public/gif/breaker.gif" width="48%" alt="Breaker" />
  <img src="./public/gif/city.gif" width="48%" alt="City" />
</p>
<p align="center">
  <img src="./public/gif/galaxy.gif" width="48%" alt="Galaxy" />
  <img src="./public/gif/modalMatrix.gif" width="48%" alt="Modal Matrix" />
</p>
<p align="center">
  <img src="./public/gif/rain.gif" width="48%" alt="Rain" />
  <img src="./public/gif/voxelsGenerate.gif" width="48%" alt="Voxels Generate" />
</p>

**👉 [Live Preview](https://avan0203.github.io/threejs-demo/) • [Get Started](#getting-started) • [Add Your Own Case](#adding-new-cases)**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Powered by Three.js](https://img.shields.io/badge/Powered%20by-Three.js-blue?logo=three.js)](https://threejs.org/)

---

## Introduction

**Three.js Demo** is a dynamic case library built with [Three.js](https://threejs.org/) and modern web technologies. It serves as both a **learning playground** and a **feasibility testbed** for interactive 3D web experiences.

Whether you're exploring shaders, physics simulations, or model interactions — this project has you covered!

### Featured Capabilities

- 📦 **Model Import** (GLTF, OBJ, etc.)  
- 🧊 **Geometry Transformations** (scale, rotate, morph)  
- 📷 **Advanced Camera Controls** (orbit, fly, first-person)  
- 🔍 **Object Picking & Selection**  
- 🎨 **Custom Shader Effects**  
- ⚙️ **Physics Integration** (via Cannon.js or similar)  
- ...and more experimental features!

![Three.js Demo Cover](./public/images/cover.png)

---

## Getting Started

Clone the repo and spin up the dev server in seconds:

```shell
# Install dependencies (using pnpm)
pnpm install

# Start the development server
pnpm dev

```
Visit http://localhost:6500 (or your configured port) to explore the demos!

---

## Adding New Cases

Want to contribute a new demo? Follow these steps:

1. Register your case in pageList.js:
```javascript
{
  type: 'shaders',
  name: 'My Cool Shader',
  path: '/shaders/my-cool-shader'
}
```

2. Create your demo files under the appropriate directory (e.g., `src/pages/shaders/my-cool-shader/`).
3. Generate a preview screenshot:
```shell
# First time? Install browser for Puppeteer:
npx puppeteer browsers install chrome

# Then generate screenshots
pnpm screenshot
```
4. Preview your work:
```shell
pnpm dev
```
Your new case will appear in the gallery automatically! 🎉

---

## Contribution

We ❤️ contributions! Whether it's:

* A bug fix 🐞
* A new demo idea 💡
* Documentation improvement 📝
* Performance optimization ⚡

Feel free to:

* 📥 Open an Issue
* 🔄 Submit a Pull Request

Let’s build the best Three.js learning resource together!

---

## License

This project is open-source under the MIT License.

See the `LICENSE` file for details.

> Made with ❤️ and WebGL
>
> Powered by Three.js, Vite, and a sprinkle of creativity ✨