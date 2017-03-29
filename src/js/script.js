//const OrbitControls = require(`three-orbit-controls`)(THREE);
import FlyControls from './lib/FlyControls';
import {TweenMax, Power2, Circ, TimelineMax} from 'gsap';

const mouse = {x: 0, y: 0};

const chickens = [];
const totalChickens = 100;
const playerChicken = 0;

const camera = {x: 0, y: 5, z: 10};
const moveCameraWithJump = false;

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

let you = {};

const keyPressed = [];

const init = () => {

  /* BASICS */
  this.scene = new THREE.Scene();
  this.scene.background = new THREE.Color(colors.skybox);
  this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 200);
  this.camera.position.x = camera.x;
  this.camera.position.y = camera.y;
  this.camera.position.z = camera.z;
  //this.camera.rotation.x = - Math.PI / 4;

  this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
  this.renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(this.renderer.domElement);

  //this.renderer.shadowMap.enabled = true;
  //this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  this.renderer.setPixelRatio(window.devicePixelRatio);

  this.frustrum = new THREE.Frustum();

  /* CONTROLS */
  //new OrbitControls(this.camera, this.renderer.domElement);

  document.addEventListener(`mousedown`, onMouseDown);
  document.addEventListener(`mouseup`, onMouseUp);
  document.addEventListener(`mousemove`, onMouseMove);

  document.addEventListener(`keydown`, onKeyDown);
  document.addEventListener(`keyup`, onKeyUp);

  /* LIGHTS */
  const mainLight = new THREE.DirectionalLight(colors.lights.main, 1);
  this.scene.add(mainLight);

  const ambientLight = new THREE.AmbientLight(colors.lights.ambient, 1);
  this.scene.add(ambientLight);

  /* AXIS */
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
  addChickens(font);
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

const onMouseMove = e => {

  e.preventDefault();

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (e.clientY / window.innerHeight) * 2 + 1;
};

const onMouseDown = e => {

  e.preventDefault();

  animateChickenFly(this.player, you.shadow, 0);

};

const onMouseUp = e => {
  e.preventDefault();
};

const onKeyDown = e => {

  e.preventDefault();
  const key = e.key;

  keyPressed[key] = true;

  // switch (key) {
  //
  // case `z`:
  //   break;
  // }

};

const onKeyUp = e => {

  e.preventDefault();
  const key = e.key;

  keyPressed[key] = false;

  switch (key) {

  case `z`:
    stopChickenWalk(.2);
    break;

  case `s`:
    stopChickenWalk(.2);
    break;
  }

};

const stopChickenWalk = speed => {

  you.legs.walking = false;

  TweenMax.to(you.legs.left.rotation, speed, {
    x: THREE.Math.degToRad(0),
    ease: Power2.easeInOut
  });

  TweenMax.to(you.legs.right.rotation, speed, {
    x: THREE.Math.degToRad(0),
    ease: Power2.easeInOut
  });
};

const animateChickenWalk = (chicken, reverse = false) => {

  if (chicken === this.player) chicken = you;

  if (chicken.legs.walking) return;
  chicken.legs.walking = true;

  const speed = .2;
  const angle = 20;

  TweenMax.to(chicken.legs.left.rotation, reverse ? speed * 2 : speed, {
    x: reverse ? THREE.Math.degToRad(angle) : THREE.Math.degToRad(- angle),
    ease: Power2.easeInOut,
    onComplete: () => {
      TweenMax.to(you.legs.left.rotation, reverse ? speed * 2 : speed, {
        x: reverse ? THREE.Math.degToRad(- angle) : THREE.Math.degToRad(angle),
        ease: Power2.easeInOut,
        onComplete: () => chicken.legs.walking = false
      });
    }
  });

  TweenMax.to(chicken.legs.right.rotation, reverse ? speed * 2 : speed, {
    x: reverse ? THREE.Math.degToRad(- angle) : THREE.Math.degToRad(angle),
    ease: Power2.easeInOut,
    onComplete: () => {
      TweenMax.to(you.legs.right.rotation, reverse ? speed * 2 : speed, {
        x: reverse ? THREE.Math.degToRad(angle) : THREE.Math.degToRad(- angle),
        ease: Power2.easeInOut,
        onComplete: () => chicken.legs.walking = false
      });
    }
  });

};

const addChickens = font => {
  for (let i = 0;i < totalChickens;i ++) {
    let player = i === playerChicken ? player = true : player = false;
    createChicken(player, font);
  }
};

const createChicken = (player = false, font, pos = {x: randomIntFromInterval(0, totalChickens), y: 0, z: randomIntFromInterval(0, totalChickens)}) => {

  const userData = {
    id: chickens.length + 1,
    player: player,
    position: {
      x: pos.x,
      y: pos.y,
      z: pos.z
    },
    speeds: {
      jump: .5,
      wings: .5
    }
  };

  const chicken = new THREE.Object3D();

  if (player) {
    chicken.add(this.camera);
    this.controls = new FlyControls(chicken, this.renderer.domElement);
    this.controls.movementSpeed = .1;
    this.controls.rollSpeed = .05;
    this.controls.autoForward = false;
    this.controls.dragToLook = false;
    this.controls.mouseToTurn = false;
  }
  chicken.position.set(pos.x, pos.y, pos.z);
  chicken.rotation.y = randomIntFromInterval(0, Math.PI * 2);

  chicken.userData = userData;
  chickens.push(chicken);

  // BODY
  const bodySize = {w: 1, h: 1, depth: 1.5};
  const body = box(bodySize, {x: 0, y: 1.25, z: 0}, colors.chicken.body);
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

  if (player) {
    this.player = chicken;

    you = {
      legs: {
        walking: false,
        left: legLeftObj,
        right: legRightObj
      },
      shadow: shadow
    };
  }
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

  if (keyPressed[` `]) animateChickenFly(this.player, you.shadow, 0);
  if (keyPressed[`z`]) animateChickenWalk(this.player);
  if (keyPressed[`s`]) animateChickenWalk(this.player, true);

  if (!this.player) return;

  this.controls.update(1);

  chickens.forEach(chicken => {

    const shadow = findObject(chicken, `shadow`);
    shadow.position.setY(- chicken.position.y + shadow.userData.randomShadowAdd);

    if (chicken !== this.player) animateChickenFly(chicken, shadow);
  });

  this.floor.position.x = this.player.position.x;
  this.floor.position.z = this.player.position.z;

  render();
};

const animateChickenFly = (chicken, shadow, delay = Math.random() * 3 + .5) => {

  if (chicken.userData.flyAnimation) return;
  chicken.userData.flyAnimation = true;

  // Wings animation
  const wingSpeed = {up: chicken.userData.speeds.wings, down: chicken.userData.speeds.wings / 2};
  const jumpSpeed = {up: chicken.userData.speeds.jump, down: chicken.userData.speeds.jump * 1.25};

  const wingLeft = findObject(chicken, `wingLeft`);
  const wingLeftVisible = isObjectVisible(wingLeft);
  if (wingLeftVisible) setTimeout(() => animateChickenWing(wingLeft, delay, wingSpeed), 250);

  const wingRight = findObject(chicken, `wingRight`);
  const wingRightVisible = isObjectVisible(wingRight);
  if (wingRightVisible) setTimeout(() => animateChickenWing(wingRight, delay, wingSpeed), 250);

  // Jump animation
  const start = chicken.userData.position.y;
  const delta = 1;

  const tl = new TimelineMax();
  tl.to(chicken.position, jumpSpeed.up, {
    delay: delay,
    y: start + delta,
    ease: Power2.easeInOut,
    onComplete: () => {
      TweenMax.to(chicken.position, jumpSpeed.down, {
        y: start,
        ease: Power2.easeInOut,
        onComplete: () => {chicken.userData.flyAnimation = false;}
      });
    }
  }, 0).to(shadow.scale, jumpSpeed.up, {
    delay: delay,
    x: shadow.userData.radius * .75,
    y: shadow.userData.radius * .75,
    z: shadow.userData.radius * .75,
    ease: Power2.easeInOut,
    onComplete: () => {
      TweenMax.to(shadow.scale, jumpSpeed.down, {
        x: shadow.userData.radius,
        y: shadow.userData.radius,
        z: shadow.userData.radius,
        ease: Power2.easeInOut
      });
    }
  }, 0);

  // Normalize camera for player
  if (chicken === this.player && !moveCameraWithJump) {
    TweenMax.to(this.camera.position, jumpSpeed.up, {
      y: camera.y - delta,
      ease: Power2.easeInOut,
      onComplete: () => {
        TweenMax.to(this.camera.position, jumpSpeed.down, {
          y: camera.y,
          ease: Power2.easeInOut
        });
      }
    });
  }
};

const isObjectVisible = obj => {

  const frustum = new THREE.Frustum();
  const cameraViewProjectionMatrix = new THREE.Matrix4();

  this.camera.updateMatrixWorld();
  this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);
  cameraViewProjectionMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
  frustum.setFromMatrix(cameraViewProjectionMatrix);

  return frustum.intersectsObject(obj);

};

const animateChickenWing = (wing, delay, speed) => {

  const angle = {begin: 0, to: 160};
  const repeat = 3;

  if (wing.userData.animateWing) return;
  wing.userData.animateWing = true;

  for (let i = 0;i < repeat;i ++) {

    TweenMax.to(wing.rotation, (speed.down / repeat) * (1 + (i * ((speed.down / repeat) * 2))), {
      delay: delay + ((speed.down + speed.up) / repeat * i),
      z: wing.userData.part === `wingLeft` ? THREE.Math.degToRad(angle.to) : THREE.Math.degToRad(- angle.to),
      ease: Circ.easeInOut,
      onComplete: () => {
        TweenMax.to(wing.rotation, (speed.up / repeat) * (1 + (i * ((speed.up / repeat) * 2))), {
          z: wing.userData.part === `wingLeft` ? THREE.Math.degToRad(angle.begin) : THREE.Math.degToRad(- angle.begin),
          ease: Circ.easeInOut,
          onComplete: () => {wing.userData.animateWing = false;}
        });
      }
    });
  }
};

const randomIntFromInterval = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const render = () => {
  this.renderer.render(this.scene, this.camera);
};

init();
