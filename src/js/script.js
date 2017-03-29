const OrbitControls = require(`three-orbit-controls`)(THREE);
import {TweenMax, Power2, TimelineMax} from 'gsap';
import FlyControls from './lib/FlyControls';

const chickens = [];

const camera = {x: - 3, y: 2.5, z: - 3};

const colors = {
  chicken: {
    body: `#FFF`,
    mouth: `#FF9670`,
    wattle: `#FF6EA5`,
    eye: `#000`,
    wing: `#AEA1A8`,
    shadow: `#000`,
    leg: `#FF9670`
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

  chicken.userData = userData;
  chickens.push(chicken);

  // BODY
  const bodySize = {w: 1, h: 1, depth: 1.5};
  const body = box(bodySize, {x: 0, y: 1.5, z: 0}, colors.chicken.body);
  chicken.add(body);

  // HEAD
  const headSize = {w: 1, h: 1, depth: 1};
  const head = box(headSize, {x: 0, y: bodySize.h, z: - ((headSize.depth / 2) - (bodySize.depth / 2) + (headSize.depth / 2))}, colors.chicken.body);
  body.add(head);

  // EYES
  const eyeSize = {w: .1, h: .1, depth: .1};
  const eyeLeft = box(eyeSize, {x: - headSize.w / 2, y: head.position.y, z: head.position.z}, colors.chicken.eye);
  body.add(eyeLeft);

  const eyeRight = box(eyeSize, {x: headSize.w / 2, y: head.position.y, z: head.position.z}, colors.chicken.eye);
  body.add(eyeRight);

  // MOUTH
  const mouthSize = {w: .3, h: .3, depth: .5};
  const mouth = box(mouthSize, {x: 0, y: head.position.y, z: - 1}, colors.chicken.mouth);
  body.add(mouth);

  // WATTLE
  const wattleSize = {w: .3, h: .3, depth: .3};
  const wattle = box(wattleSize, {x: 0, y: head.position.y - wattleSize.h, z: - (bodySize.depth / 2 + wattleSize.depth / 2)}, colors.chicken.wattle);
  body.add(wattle);

  // WINGS
  const wingSize = {w: .2, h: .5, depth: 1};
  const wingLeft = box(wingSize, {x: - (bodySize.w / 2 + wingSize.w / 2), y: body.position.y, z: 0}, colors.chicken.wing);
  wingLeft.userData.part = `wingLeft`;
  chicken.add(wingLeft);

  const wingRight = box(wingSize, {x: bodySize.w / 2 + wingSize.w / 2, y: body.position.y, z: 0}, colors.chicken.wing);
  wingRight.userData.part = `wingRight`;
  chicken.add(wingRight);

  // LEGS
  const legs = new THREE.Object3D();
  legs.userData.part = `legs`;
  legs.position.setY(1);

  const legLeftObj = new THREE.Object3D();
  legLeftObj.userData.part = `legLeft`;
  legLeftObj.position.setX(- .3);
  legs.add(legLeftObj);

  const legRightObj = new THREE.Object3D();
  legRightObj.userData.part = `legRight`;
  legRightObj.position.setX(.3);
  legs.add(legRightObj);

  const legSize = {w: .1, h: 1, depth: .1};
  const legLeft = box(legSize, {x: 0, y: - legSize.h / 2, z: 0}, colors.chicken.leg);
  const legRight = box(legSize, {x: 0, y: - legSize.h / 2, z: 0}, colors.chicken.leg);

  legLeftObj.add(legLeft);
  legRightObj.add(legRight);

  //legLeftObj.rotation.x = - Math.PI / 4;
  //legRightObj.rotation.x = Math.PI / 4;

  chicken.add(legs);

  // SHADOW
  const shadowRadius = 1;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(shadowRadius, 32), new THREE.MeshBasicMaterial({color: colors.chicken.shadow, depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: .25}));
  shadow.userData.part = `shadow`;
  shadow.userData.radius = shadowRadius;
  shadow.userData.randomShadowAdd = 0.001;
  shadow.position.setY(shadow.userData.randomShadowAdd);
  shadow.rotateX(Math.PI / 2);
  chicken.add(shadow);

  this.scene.add(chicken);

  addTextToChicken(chicken, head, font);
};

const box = (size, position, color) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size.w, size.h, size.depth),
    new THREE.MeshPhongMaterial({color: color, shading: THREE.FlatShading})
  );

  mesh.position.set(position.x, position.y, position.z);
  return mesh;
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

/*
const randomIntFromInterval = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};
*/

const render = () => {
  this.renderer.render(this.scene, this.camera);
};

init();
