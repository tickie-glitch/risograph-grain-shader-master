import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import wolf from '../../models/wolf.obj'
import brochure from '../../models/brochureDisplaced.obj'
import yarn from '../../models/yarn.obj'
import hellokitty from '../../models/hellokitty.obj'
import highheel from '../../models/highheel.obj'
import secretary from '../../models/secretary.obj'
import glsl from 'glslify'
import fragmentShaderLambert from '../shaders/grain.frag'
import Sphere from './sphere'
import { degToRad, lerp, randFloat } from 'three/src/math/MathUtils'
import Box from './box'
import { GUI } from 'dat.gui'

export default class Scene {
  canvas
  renderer
  scene
  camera
  controls
  width
  height
  mouse = {
    x: 0,
    y: 0,
  }
  targetMouse = {
    x: 0,
    y: 0,
  }
  guiController = {
    uNoiseCoef: 2.1,
    uNoiseMin: 0.5,
    uNoiseMax: 22.09,
    uNoiseScale: 0.8,
    light1X: 10,
    light2X: 10,
  }

  constructor(el) {
    this.canvas = el

    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()

    // this.myModels = [yarn, hellokitty, highheel, secretary]
    this.myModels = [
      { path: yarn, name: 'yarn' },
      { path: hellokitty, name: 'hellokitty' },
      { path: highheel, name: 'highheel' },
      { path: secretary, name: 'secretary' },
    ]
    this.clock = new THREE.Clock()
    this.init()
  }

  init() {
    this.setScene()
    this.setRender()
    this.setCamera()
    this.setControls()
    this.setContainer()
    this.setLight()
    this.setMaterial()
    // this.setSpheres()
    // this.setOtherModels()
    this.setMyModels()
    this.setBoxs()
    this.setModel()
    this.setGUI()

    this.handleResize()

    // start RAF
    this.events()

    this.clock.start()
  }

  /**
   * Our Webgl renderer, an object that will draw everything in our canvas
   * https://threejs.org/docs/?q=rend#api/en/renderers/WebGLRenderer
   */
  setRender() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    })
  }

  /**
   * This is our scene, we'll add any object
   * https://threejs.org/docs/?q=scene#api/en/scenes/Scene
   */
  setScene() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xffffff)
    this.scene.background = new THREE.TextureLoader().load('demo2/img/grey-gradient2.png')
  }

  /**
   * Our Perspective camera, this is the point of view that we'll have
   * of our scene.
   * A perscpective camera is mimicing the human eyes so something far we'll
   * look smaller than something close
   * https://threejs.org/docs/?q=pers#api/en/cameras/PerspectiveCamera
   */
  setCamera() {
    const aspectRatio = this.width / this.height
    const fieldOfView = 50
    const nearPlane = 0.1
    const farPlane = 10000

    this.camera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane)
    this.camera.position.set(-11.7, 32.2, -7.1)

    this.scene.add(this.camera)
  }

  /**
   * Threejs controls to have controls on our scene
   * https://threejs.org/docs/?q=orbi#examples/en/controls/OrbitControls
   */
  setControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.autoRotate = true
  }

  /**
   * For the GUI at the top right bottom of the screen
   */
  setGUI() {
    const gui = new GUI()

    const lightsFolder = gui.addFolder('Lights position X')
    lightsFolder
      .add(this.guiController, 'light1X', -10, 10)
      .step(0.1)
      .onChange(this.guiChange)
    lightsFolder
      .add(this.guiController, 'light2X', -10, 10)
      .step(0.1)
      .onChange(this.guiChange)
    lightsFolder.open()

    const grainFolder = gui.addFolder('Grain')
    grainFolder
      .add(this.guiController, 'uNoiseCoef', 0, 20)
      .step(0.1)
      .onChange(this.guiChange)
    grainFolder
      .add(this.guiController, 'uNoiseMin', 0, 1)
      .step(0.1)
      .onChange(this.guiChange)
    grainFolder
      .add(this.guiController, 'uNoiseMax', 0, 22)
      .step(0.1)
      .onChange(this.guiChange)
    grainFolder
      .add(this.guiController, 'uNoiseScale', 0, 6)
      .step(0.1)
      .onChange(this.guiChange)
    grainFolder.open()
  }

  /**
   * GUI handle functions
   */
  guiChange = () => {
    this.uniforms.uNoiseCoef.value = this.guiController.uNoiseCoef
    this.uniforms.uNoiseMin.value = this.guiController.uNoiseMin
    this.uniforms.uNoiseMax.value = this.guiController.uNoiseMax
    this.uniforms.uNoiseScale.value = this.guiController.uNoiseScale

    this.lights[0].position.x = this.guiController.light1X
    this.lights[1].position.x = this.guiController.light2X
  }

  /**
   * Here will set our main Risopgrah grain material
   * https://threejs.org/docs/?q=ShaderMaterial#api/en/materials/ShaderMaterial
   */
  setMaterial() {
    this.uniforms = THREE.UniformsUtils.merge([
      THREE.ShaderLib.lambert.uniforms,
      {
        uNoiseMin: {
          value: this.guiController.uNoiseMin,
        },
      },
      {
        uNoiseCoef: {
          value: this.guiController.uNoiseCoef,
        },
      },
      {
        uNoiseMax: {
          value: this.guiController.uNoiseMax,
        },
      },
      {
        uNoiseScale: {
          value: this.guiController.uNoiseScale,
        },
      },
    ])

    this.customMaterial = new THREE.ShaderMaterial({
      vertexShader: THREE.ShaderLib.lambert.vertexShader,
      fragmentShader: glsl(fragmentShaderLambert),
      uniforms: this.uniforms,
      lights: true,
      transparent: true,
    })
  }

  /**
   * This is our global container that will contain every mesh of our scene
   * https://threejs.org/docs/#api/en/core/Object3D
   */
  setContainer() {
    this.container = new THREE.Object3D()
    this.scene.add(this.container)
  }

  setLight() {
    this.lights = []

    for (let i = 0; i < 2; i++) {
      const spotLight = new THREE.SpotLight(0xffffff)
      spotLight.position.set(10, 10, 10)
      spotLight.intensity = 1.1
      this.lights.push(spotLight)
      this.scene.add(spotLight)
    }
  }

  setBoxs() {
    const dist = 6

    let angle = 0

    for (let i = 0; i < 5; i++) {
      const position = new THREE.Vector3(Math.cos(angle) * dist, -2, Math.sin(angle) * dist)
      const scale = randFloat(1, 3)
      const object3D = new Box(this.customMaterial, scale, position)

      angle += degToRad(360 / 5)
      this.container.add(object3D)
    }
  }

  setMyModels() {
    const dist = 6
    let angle = 0
    const objLoader = new OBJLoader()

    this.myModels.forEach(model => {
      const position = new THREE.Vector3(Math.cos(angle) * dist, -2, Math.sin(angle) * dist)
      const scale = randFloat(1, 3)
      const object3D = new Box(this.customMaterial, scale, position)

      objLoader.load(model.path, obj => {
        const { geometry } = obj.children[0]
        const mesh = new THREE.Mesh(geometry, this.customMaterial)
        const s = 1
        // mesh.lookAt(0, 0, 0)
        mesh.scale.set(s, s, s)
        // mesh.scale.setScalar(s)
        mesh.rotation.y += degToRad(-90)
        // mesh.rotation.z += degToRad(45)
        // mesh.rotation.x += degToRad(45)
        // mesh.translateY(-2)
        mesh.userData = model.name
        mesh.position.z = randFloat(-10, 10)
        mesh.position.x = randFloat(-15, 15)
        this.container.add(mesh)
        // let randPos = Math.floor(Math.random() * 100)
        // if (randPos % 2 === 0) {
        //   console.log(randPos)
        //   mesh.position.z = randFloat(-12, -5)
        //   mesh.position.x = randFloat(-15, -8)
        // } else {
        //   console.log(randPos)
        //   mesh.position.z = randFloat(5, 12)
        //   mesh.position.x = randFloat(8, 15)
        // }

        this.model = mesh
      })

      angle += degToRad(360 / 5)
      this.container.add(object3D)
    })

    // for (let i = 0; i < this.myModels.length; i++) {
    //   const position = new THREE.Vector3(Math.cos(angle) * dist, -2, Math.sin(angle) * dist)
    //   console.log(position)
    //   const scale = randFloat(1, 3)
    //   const object3D = new Box(this.customMaterial, scale, position)

    //   objLoader.load(this.myModels[i], obj => {
    //     const { geometry } = obj.children[0]
    //     const mesh = new THREE.Mesh(geometry, this.customMaterial)
    //     const s = 1
    //     mesh.scale.set(s, s, s)
    //     // mesh.scale.setScalar(s)
    //     mesh.rotation.y += degToRad(-90)
    //     // mesh.rotation.z += degToRad(45)
    //     // mesh.rotation.x += degToRad(45)
    //     mesh.translateY(-2)
    //     // mesh.position.z = randFloat(15, 30)
    //     this.container.add(mesh)

    //     this.model = mesh
    //   })

    //   angle += degToRad(360 / 5)
    //   this.container.add(object3D)
    // }
  }

  setSpheres() {
    const dist = 3

    this.spheres = []

    let angle = 0

    for (let i = 0; i < 3; i++) {
      const position = new THREE.Vector3(Math.cos(angle) * dist, randFloat(-1, 1), Math.sin(angle) * dist)
      const scale = randFloat(0.6, 0.9)
      const object3D = new Sphere(this.customMaterial, scale, position)

      angle += degToRad(360 / 3)
      this.scene.add(object3D)
      this.spheres.push(object3D)
    }
  }

  setModel() {
    const objLoader = new OBJLoader()

    objLoader.load(brochure, obj => {
      const { geometry } = obj.children[0]
      const mesh = new THREE.Mesh(geometry, this.customMaterial)
      const s = 0.5
      mesh.scale.set(s, s, s)
      mesh.rotation.y += degToRad(-90)
      mesh.rotation.z += degToRad(65)
      mesh.rotation.x += degToRad(45)
      mesh.translateY(-2)
      // mesh.position.z -= 5
      this.container.add(mesh)

      this.model = mesh
    })
  }

  /**
   * List of events
   */
  events() {
    window.addEventListener('resize', this.handleResize, { passive: true })
    window.addEventListener('mousemove', this.handleMousemove, { passive: true })
    //window.addEventListener('mouseclick', this.handleMouseclick, { passive: true })
    // renderer.domElement.addEventListener('pointerdown', onDown, false)
    // renderer.domElement.addEventListener('pointerup', onUp, false)

    this.draw(0)
  }

  animateModels() {
    // console.log(this.clock.running)
    // console.log(this.clock.getElapsedTime())
    this.scene.traverse(obj => {
      if (obj.type === 'Mesh') {
        // obj.position.y = Math.sin(this.clock.getElapsedTime() * randFloat(0.05, 0.01)) + 2
        // let objList = []
        // objList.push(obj)
        // objList.forEach(obj => {
        //   obj.position.y = Math.sin(this.clock.getElapsedTime() * randFloat(0.05, 0.01))
        // })
        return
      }
    })
  }

  // EVENTS

  /**
   * Request animation frame function
   * This function is called 60/time per seconds with no performance issue
   * Everything that happens in the scene is drawed here
   * @param {Number} now
   */
  draw = now => {
    // now: time in ms

    this.mouse.x = lerp(this.mouse.x, this.targetMouse.x, 0.1)
    this.mouse.y = lerp(this.mouse.y, this.targetMouse.y, 0.1)

    this.raycaster.setFromCamera(this.targetMouse, this.camera)

    // calculate objects intersecting the picking ray
    const intersects = this.raycaster.intersectObjects(this.scene.children)

    for (let i = 0; i < intersects.length; i++) {
      console.log(intersects[i].object.userData)
      // intersects[i].object.scale.setScalar(2)
      // intersects[i].object.material.color.set(0xff0000)
    }

    this.scene.traverse(obj => {
      if (obj.type === 'Mesh') {
        // obj.position.y = Math.sin(now * randFloat(0.0005, 0.0001)) * 2
        obj.position.y = Math.sin(randFloat(0.001, 0.005))

        // let dist = new THREE.Vector2(obj.x, obj.y).sub(0, 0)
        let size = 5.0
        let magnitude = 1.5
        // v.z = Math.sin(dist.length() / size + now / 500) * magnitude
        obj.position.y = Math.sin(size + now / 500) * magnitude - this.mouse.y
        // obj.rotation.y += .1
      }
    })

    this.container.rotation.y = degToRad(20 * this.mouse.x)
    this.renderer.render(this.scene, this.camera)

    this.raf = window.requestAnimationFrame(this.draw)
  }

  // EVENTS
  handleMousemove = e => {
    const x = (e.clientX / window.innerWidth) * 2 - 1
    const y = -(e.clientY / window.innerHeight) * 2 + 1

    this.targetMouse.x = x
    this.targetMouse.y = y
  }

  /**
   * On resize, we need to adapt our camera based
   * on the new window width and height and the renderer
   */
  handleResize = () => {
    this.width = window.innerWidth
    this.height = window.innerHeight

    // Update camera
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()

    const DPR = window.devicePixelRatio ? window.devicePixelRatio : 1

    this.renderer.setPixelRatio(DPR)
    this.renderer.setSize(this.width, this.height)
  }
}
