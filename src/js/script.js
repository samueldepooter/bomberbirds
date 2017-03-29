const OrbitControls = require(`three-orbit-controls`)(THREE);
import {TweenMax, Power2, TimelineMax} from 'gsap';
import FlyControls from './lib/FlyControls';

const chickens = [];

const camera = {x: 0, y: 5, z: 10};

const colors = {
  player: {
    body: `#FFF`,
    mouth: `#FF9670`,
    wattle: `#FF6EA5`,
    eye: `#000`,
    wing: `#AEA1A8`,
    shadow: `#000`,
    legs: `#FF9670`
  },
  lights: {
    main: `#FFF`,
    ambient: `#DECED6`
  },
  skybox: `#69CEEC`,
  ground: `#81DD7A`
};

const init = () => {

  // BASICS
  this.scene = new THREE.Scene();
  this.scene.background = new THREE.Color(colors.skybox);
  this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 200);
  this.camera.position.x = camera.x;
  this.camera.position.y = camera.y;
  this.camera.position.z = camera.z;

  this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
  this.renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(this.renderer.domElement);

  this.renderer.setPixelRatio(window.devicePixelRatio);

  // CONTROLS
  new OrbitControls(this.camera, this.renderer.domElement);

  document.addEventListener(`mousedown`, onMouseDown);
  document.addEventListener(`mouseup`, onMouseUp);
  document.addEventListener(`keydown`, onKeyDown);

  // LIGHTS
  const mainLight = new THREE.DirectionalLight(colors.lights.main, 1);
  this.scene.add(mainLight);

  const ambientLight = new THREE.AmbientLight(colors.lights.ambient, 1);
  this.scene.add(ambientLight);

  // HELPERS
  this.scene.add(new THREE.AxisHelper(1000));

  this.floor = createFloor(500, 500, 1);
  loadFont();

  animate();
};

const loadFont = () => {
  const loader = new THREE.FontLoader();
  loader.load(`//raw.githubusercontent.com/mrdoob/three.js/master/examples/fonts/helvetiker_regular.typeface.json`, font => {
    onFontLoaded(font);
  });
};

const onFontLoaded = font => {
  addPlayer(font);
};

const addTextToChicken = (chicken, relativeObject, font) => {

  const delay = 10;
  setTimeout(() => {
    const name = chicken.userData.id;
    const geometry = new THREE.TextGeometry(name, {
      font: font,
      size: .3,
      height: .01,
      curveSegments: 1,
      alpha: 0
    });
    geometry.center();
    const material = new THREE.MeshPhongMaterial({color: `#000`, opacity: 0, transparent: true});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.name = name;

    chicken.add(mesh);

    mesh.rotation.x = - Math.PI / 2;
    mesh.position.y = relativeObject.position.y + relativeObject.geometry.parameters.height / 2;
    mesh.position.z = relativeObject.position.z;

    TweenMax.to(material, .5, {
      delay: 1,
      opacity: 1,
      ease: Power2.easeOut
    });
  }, delay * chicken.userData.id);
};

const onMouseDown = e => {
  e.preventDefault();

};

const onMouseUp = e => {
  e.preventDefault();
};

const onKeyDown = e => {
  e.preventDefault();

  const key = e.keyCode;

  if (key === 32) {
    const shadow = findObject(this.player, `shadow`);
    animateChickenFly(this.player, shadow, 0);
  }
};

const addPlayer = font => {
  createChicken(font);
};

const createChicken = (font, pos = {x: 0, y: 0, z: 0}) => {

  const userData = {
    id: 1,
    position: {
      x: pos.x,
      y: pos.y,
      z: pos.z
    },
    speeds: {
      wings: .5
    }
  };

  const chicken = new THREE.Object3D();
  this.player = chicken;

  chicken.add(this.camera);
  this.controls = new FlyControls(chicken, this.renderer.domElement);
  this.controls.movementSpeed = .1;
  this.controls.autoForward = false;
  this.controls.dragToLook = false;
  this.controls.mouseToTurn = false;

  chicken.position.set(pos.x, pos.y, pos.z);
  chicken.rotation.y = randomIntFromInterval(0, Math.PI * 2);

  chicken.userData = userData;
  chickens.push(chicken);

  // BODY
  const bodyC = {w: 1, h: 1, depth: 1.5};
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyC.w, bodyC.h, bodyC.depth), new THREE.MeshPhongMaterial({color: colors.player.body, shading: THREE.FlatShading}));
  body.position.setY(bodyC.h / 2);
  chicken.add(body);

  // HEAD
  const headC = {w: 1, h: 1, depth: 1};
  const head = new THREE.Mesh(new THREE.BoxGeometry(headC.w, headC.h, headC.depth), new THREE.MeshPhongMaterial({color: colors.player.body, shading: THREE.FlatShading}));
  head.position.setY(bodyC.h + headC.h / 2);
  head.position.setZ(- ((headC.depth / 2) - (bodyC.depth / 2) + (headC.depth / 2)));
  chicken.add(head);

  // WINGS
  const wing = {w: .2, h: .5, depth: 1};

  const wingLeft = new THREE.Mesh(new THREE.BoxGeometry(wing.w, wing.h, wing.depth), new THREE.MeshPhongMaterial({color: colors.player.wing, shading: THREE.FlatShading}));
  wingLeft.position.set(- (bodyC.w / 2 + wing.w / 2), bodyC.h / 2, 0);
  wingLeft.userData.part = `wingLeft`;

  const wingRight = new THREE.Mesh(new THREE.BoxGeometry(wing.w, wing.h, wing.depth), new THREE.MeshPhongMaterial({color: colors.player.wing, shading: THREE.FlatShading}));
  wingRight.position.set(bodyC.w / 2 + wing.w / 2, bodyC.h / 2, 0);
  wingRight.userData.part = `wingRight`;

  chicken.add(wingLeft);
  chicken.add(wingRight);

  // MOUTH
  const mouthC = {w: .3, h: .3, depth: .5};
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(mouthC.w, mouthC.h, mouthC.depth), new THREE.MeshPhongMaterial({color: colors.player.mouth, shading: THREE.FlatShading}));
  mouth.position.set(0, head.position.y, - (bodyC.depth / 2 + mouthC.depth / 2));
  chicken.add(mouth);

  // WATTLE
  const wattleC = {w: .3, h: .3, depth: .3};
  const wattle = new THREE.Mesh(new THREE.BoxGeometry(wattleC.w, wattleC.h, wattleC.depth), new THREE.MeshPhongMaterial({color: colors.player.wattle, shading: THREE.FlatShading}));
  wattle.position.set(0, head.position.y - wattleC.h, - (bodyC.depth / 2 + wattleC.depth / 2));
  chicken.add(wattle);

  // EYES
  const eyeC = {w: .1, h: .1, depth: .1};

  const eyeLeft = new THREE.Mesh(new THREE.BoxGeometry(eyeC.w, eyeC.h, eyeC.depth), new THREE.MeshBasicMaterial({color: colors.player.eye}));
  eyeLeft.position.set(- headC.w / 2, head.position.y, head.position.z);

  const eyeRight = new THREE.Mesh(new THREE.BoxGeometry(eyeC.w, eyeC.h, eyeC.depth), new THREE.MeshBasicMaterial({color: colors.player.eye}));
  eyeRight.position.set(headC.w / 2, head.position.y, head.position.z);
  chicken.add(eyeRight);
  chicken.add(eyeLeft);

  // SHADOW
  const shadowRadius = 1;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(shadowRadius, 32), new THREE.MeshBasicMaterial({color: colors.player.shadow, depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: .25}));
  shadow.userData.part = `shadow`;
  shadow.userData.radius = shadowRadius;
  shadow.userData.randomShadowAdd = 0.001;
  shadow.position.setY(shadow.userData.randomShadowAdd);
  shadow.rotateX(Math.PI / 2);
  chicken.add(shadow);

  this.scene.add(chicken);

  addTextToChicken(chicken, head, font);
};

const findObject = (parent, obj) => {
  return parent.children.find(child => child.userData.part === obj);
};

const createFloor = (w, h, segments) => {
  const geometry = new THREE.PlaneGeometry(w, h, segments);
  const material = new THREE.MeshBasicMaterial({color: colors.ground, side: THREE.DoubleSide});
  const floor = new THREE.Mesh(geometry, material);

  floor.rotation.x = THREE.Math.degToRad(90);

  this.scene.add(floor);
  return floor;
};

const animate = () => {
  requestAnimationFrame(animate);

  if (!this.player) return;

  this.controls.update(1);

  chickens.forEach(chicken => {
    const shadow = findObject(chicken, `shadow`);
    shadow.position.setY(- chicken.position.y + shadow.userData.randomShadowAdd);
  });

  this.floor.position.x = this.player.position.x;
  this.floor.position.z = this.player.position.z;

  render();
};

const animateChickenFly = (chicken, shadow, delay = Math.random() * 3 + .5) => {

  if (chicken.userData.flyAnimation) return;
  chicken.userData.flyAnimation = true;

  const start = chicken.userData.position.y;
  const delta = 1;

  const wingLeft = findObject(chicken, `wingLeft`);
  animateChickenWing(wingLeft, delay);

  const wingRight = findObject(chicken, `wingRight`);
  animateChickenWing(wingRight, delay);

  const tl = new TimelineMax();
  tl.to(chicken.position, chicken.userData.speeds.wings, {
    delay: delay,
    y: start + delta,
    ease: Power2.easeInOut,
    onComplete: () => {
      TweenMax.to(chicken.position, chicken.userData.speeds.wings * 1.25, {
        y: start,
        ease: Power2.easeInOut,
        onComplete: () => {chicken.userData.flyAnimation = false;}
      });
    }
  }, 0).to(shadow.scale, chicken.userData.speeds.wings, {
    delay: delay,
    x: shadow.userData.radius * .75,
    y: shadow.userData.radius * .75,
    z: shadow.userData.radius * .75,
    ease: Power2.easeInOut,
    onComplete: () => {
      TweenMax.to(shadow.scale, chicken.userData.speeds.wings * 1.25, {
        x: shadow.userData.radius,
        y: shadow.userData.radius,
        z: shadow.userData.radius,
        ease: Power2.easeInOut
      });
    }
  }, 0);

  if (chicken === this.player) {
    TweenMax.to(this.camera.position, chicken.userData.speeds.wings, {
      y: camera.y - delta,
      ease: Power2.easeInOut,
      onComplete: () => {
        TweenMax.to(this.camera.position, chicken.userData.speeds.wings * 1.25, {
          y: camera.y,
          ease: Power2.easeInOut
        });
      }
    });
  }
};

const animateChickenWing = (wing, delay) => {

  const speed = wing.parent.userData.speeds.wings;
  const start = 180;
  const end = 0;

  if (wing.userData.animateWing) return;
  wing.userData.animateWing = true;

  TweenMax.to(wing.rotation, speed / 2, {
    delay: delay,
    z: wing.userData.part === `wingRight` ? THREE.Math.degToRad(- start) : THREE.Math.degToRad(start),
    ease: Power2.easeInOut,
    onComplete: () => {
      TweenMax.to(wing.rotation, speed, {
        z: THREE.Math.degToRad(end),
        ease: Power2.easeInOut,
        onComplete: () => {wing.userData.animateWing = false;}
      });
    }
  });
};

const randomIntFromInterval = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const render = () => {
  this.renderer.render(this.scene, this.camera);
};

init();
