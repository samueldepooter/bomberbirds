const OrbitControls = require(`three-orbit-controls`)(THREE);
import FlyControls from './lib/FlyControls';
import {TweenMax, Power2, Circ, TimelineMax} from 'gsap';
import {isEmpty} from 'lodash';

import playground from './settings/playground';
import chickenSettings from './settings/chicken';
import lights from './settings/lights';
import camera from './settings/camera';
import interactions from './settings/interactions';

const freeView = false;
const showLaser = true;
const mouse = {x: 0, y: 0};
const keyPressed = [];
let firstPerson = false;

let you = {};
const chickens = [];
const spawnSize = 50;

let mainLight, ambientLight;
let pilarRay;

let interactionKey, interactionText;
let interaction = {};

let interactionsEl, holdEl;

const pilars = [];

const init = () => {

  interactionsEl = document.querySelector(`.interactions`);
  interactionKey = interactionsEl.childNodes[1];
  interactionText = interactionsEl.childNodes[3];

  holdEl = document.querySelector(`.hold`);

  /* BASICS */
  this.scene = new THREE.Scene();
  this.scene.background = new THREE.Color(playground.day.state ? playground.skybox.day : playground.skybox.night);
  this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, .5, 500);
  this.camera.rotation.y = THREE.Math.degToRad(180);
  this.camera.position.x = camera.position.x;
  this.camera.position.y = camera.position.y;
  this.camera.position.z = camera.position.z;

  this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
  this.renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(this.renderer.domElement);

  this.renderer.setPixelRatio(window.devicePixelRatio);

  this.frustrum = new THREE.Frustum();

  /* CONTROLS */
  if (freeView) new OrbitControls(this.camera, this.renderer.domElement);

  document.addEventListener(`mousedown`, onMouseDown);
  document.addEventListener(`mouseup`, onMouseUp);
  document.addEventListener(`mousemove`, onMouseMove);

  document.addEventListener(`keypress`, onKeyPress);
  document.addEventListener(`keyup`, onKeyUp);
  window.addEventListener(`resize`, onWindowResize);

  /* LIGHTS */
  mainLight = new THREE.DirectionalLight(playground.day.state ? lights.main.day.color : lights.main.night.color, playground.day.state ? lights.main.day.intensity : lights.main.night.intensity);
  mainLight.position.set(10, 10, 10);
  this.scene.add(mainLight);

  ambientLight = new THREE.AmbientLight(playground.day.state ? lights.ambient.day.color : lights.ambient.night.color, playground.day.state ? lights.ambient.day.intensity : lights.ambient.night.intensity);
  this.scene.add(ambientLight);

  /* AXIS */
  this.scene.add(new THREE.AxisHelper(1000));

  loadFont();

  animate();
};

const createPilars = () => {

  const pos = getWorldPosition(this.player.getObjectByName(`body`).getObjectByName(`head`));
  const direction = this.player.getObjectByName(`body`).getObjectByName(`head`).getWorldDirection();
  pilarRay = new THREE.Raycaster(pos, direction, 0, 5);

  interactions.levers.forEach((lever, i) => {

    const position = {x: (spawnSize / 2) + i * 3, y: 2, z: spawnSize / 2 + 3};

    const pilarMesh = box({w: 1, h: 4, depth: 1}, position, `#646360`);
    pilarMesh.name = `pilar${i}`;
    pilars.push(pilarMesh);
    this.scene.add(pilarMesh);

    const leverLength = 1.5;
    const leverMesh = box({w: .3, h: leverLength, depth: .3}, {x: position.x, y: position.y + .1, z: position.z}, `#FF601E`);
    leverMesh.rotation.x = THREE.Math.degToRad(- 60);
    leverMesh.geometry.translate(0, leverLength / 2, 0);

    leverMesh.name = `lever`;
    leverMesh.userData = lever;
    leverMesh.userData.pilarId = i;
    leverMesh.userData.pulled = false;
    leverMesh.userData.holding = 0;

    this.scene.add(leverMesh);

  });

};

const loadFont = () => {
  const loader = new THREE.FontLoader();
  loader.load(`//raw.githubusercontent.com/mrdoob/three.js/master/examples/fonts/helvetiker_regular.typeface.json`, font => {
    onFontLoaded(font);
  });
};

const onFontLoaded = font => {
  this.floor = createFloor();
  createChicken(font);
  this.arena = createArena(spawnSize);
  createPilars();
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

    relativeObject.add(mesh);

    mesh.rotation.x = - Math.PI / 2;
    mesh.rotation.z = Math.PI;
    mesh.position.y = relativeObject.geometry.parameters.height / 2;

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

  if (this.controls) rotateChickenHead(e);
};

const rotateChickenHead = e => {
  const container = this.controls.getContainerDimensions();
  const halfWidth  = container.size[ 0 ] / 2;
  const halfHeight = container.size[ 1 ] / 2;

  const max = 30;

  const head = this.player.getObjectByName(`body`).getObjectByName(`head`);
  const rotationX = THREE.Math.degToRad(((e.pageY - container.offset[ 1 ]) - halfHeight) / halfHeight * max);
  const rotationY = THREE.Math.degToRad(- (((e.pageX - container.offset[ 0 ]) - halfWidth) / halfWidth) * max);
  head.rotation.x = rotationX;
  head.rotation.y = rotationY;
};

const onMouseDown = e => {

  e.preventDefault();

  animateChickenFly(this.player, you.shadow, 0);

};

const onMouseUp = e => {
  e.preventDefault();
};

const onKeyPress = e => {

  e.preventDefault();
  const key = e.key;

  if (!keyPressed[key] && !interaction.hold) interactQuick(key);

  switch (key) {

  case `n`:
    toggleDay();
    break;

  case `Enter`:
    toggleView();
    break;

  }

  keyPressed[key] = true;

};

const validateInteraction = (key, state = `quick`) => {

  // hold event
  if (state === `hold`) {

    if (!interaction.hold) {
      console.log(`Not a hold event!`);
      return false;
    }

    return true;

  // quick press event
  } else {

    if (isEmpty(interaction)) {
      console.log(`Nothing to interact with`);
      return false;
    }

    if (interaction.key !== key) {
      console.log(`Not the correct key`);
      return false;

    }
    return true;

  }
};

const interactQuick = key => {

  const check = validateInteraction(key);
  if (!check) return;

  const lever = findObject(this.scene, interaction.pilarId, `pilarId`);
  console.log(lever.userData);

  if (lever.userData.pilarId === 0) toggleTinyChicken(true);
  if (lever.userData.pilarId === 1) toggleDay();

  rotateLever();
};

const interactHold = (key, state) => {

  // if key is not held anymore -> reset
  if (!state) {
    interaction.holding = 0;
    holdEl.style.width = `0`;
    return;
  }

  // see if it's a hold event
  const check = validateInteraction(key, `hold`);
  if (!check) return;

  // if interaction is done, do nothing
  if (interaction.done) return;

  switch (key) {

  case `r`:

    interaction.holding++;
    holdEl.style.width = `${interaction.holding}%`;

    if (interaction.holding > 100) {
      interaction.done = true;

      // remove key so event is not shown anymore
      const lever = findObject(this.scene, interaction.pilarId, `pilarId`);
      lever.userData.key = ``;

      if (lever.userData.pilarId === 2) toggleTinyChicken(false);

      rotateLever();

      resetInteraction();
    }
  }

};

const resetInteraction = () => {

  interaction.holding = 0;
  holdEl.style.width = `0`;

  TweenMax.to(interactionKey, .5, {
    y: 60
  });
  TweenMax.to(interactionText, .5, {
    delay: .05,
    y: 60
  });

  interaction = {};
};

const rotateLever = () => {
  const lever = findObject(this.scene, interaction.pilarId, `pilarId`);
  TweenMax.to(lever.rotation, .5, {
    x: lever.userData.pulled ? THREE.Math.degToRad(- 60) : THREE.Math.degToRad(- 90),
    onComplete: () => lever.userData.pulled = !lever.userData.pulled
  });
};

const toggleTinyChicken = state => {
  TweenMax.to(this.player.scale, .3, {
    x: state ? .3 : 1,
    y: state ? .3 : 1,
    z: state ? .3 : 1,
    ease: Power2.easeInOut
  });
};

const toggleView = () => {
  firstPerson = !firstPerson;

  TweenMax.to(this.camera.position, .2, {
    x: firstPerson ? 0 : camera.position.x,
    y: firstPerson ? 2.5 : camera.position.y,
    z: firstPerson ? 0 : camera.position.z,
    ease: Power2.easeInOut
  });
};

const toggleDay = () => {
  playground.day.state = !playground.day.state;

  // Change eye color
  const eyeColor = new THREE.Color(playground.day.state ? chickenSettings.eye.day : chickenSettings.eye.night);
  chickens.forEach(chicken => {
    const eyeLeftColor = findObject(chicken.children[0].children[0], `eyeLeft`).material.color;
    TweenMax.to(eyeLeftColor, playground.day.switchDuration, {
      delay: playground.day.state ? 0 : Math.random() * .5 + .1,
      r: eyeColor.r,
      g: eyeColor.g,
      b: eyeColor.b,
      ease: Power2.easeIn
    });

    const eyeRightColor = findObject(chicken.children[0].children[0], `eyeRight`).material.color;
    TweenMax.to(eyeRightColor, playground.day.switchDuration, {
      delay: playground.day.state ? 0 : Math.random() * .5 + .1,
      r: eyeColor.r,
      g: eyeColor.g,
      b: eyeColor.b,
      ease: Power2.easeIn
    });
  });

  // Main
  const mainLightColor = new THREE.Color(playground.day.state ? lights.main.day.color : lights.main.night.color);
  TweenMax.to(mainLight.color, playground.day.switchDuration, {
    r: mainLightColor.r,
    g: mainLightColor.g,
    b: mainLightColor.b,
    ease: Power2.easeIn
  });

  TweenMax.to(mainLight, playground.day.switchDuration, {
    intensity: playground.day.state ? lights.main.day.intensity : lights.main.night.intensity,
    ease: Power2.easeIn
  });

  // Ambient
  const ambientLightColor = new THREE.Color(playground.day.state ? lights.ambient.day.color : lights.ambient.night.color);
  TweenMax.to(ambientLight.color, playground.day.switchDuration, {
    r: ambientLightColor.r,
    g: ambientLightColor.g,
    b: ambientLightColor.b,
    ease: Power2.easeIn
  });

  TweenMax.to(ambientLight, playground.day.switchDuration, {
    intensity: playground.day.state ? lights.ambient.day.intensity : lights.ambient.night.intensity,
    ease: Power2.easeIn
  });

  const sceneBackgroundColor = new THREE.Color(playground.day.state ? playground.skybox.day : playground.skybox.night);
  TweenMax.to(this.scene.background, playground.day.switchDuration, {
    r: sceneBackgroundColor.r,
    g: sceneBackgroundColor.g,
    b: sceneBackgroundColor.b,
    ease: Power2.easeIn
  });

};

const onWindowResize = () => {
  this.camera.aspect = window.innerWidth / window.innerHeight;
  this.camera.updateProjectionMatrix();

  this.renderer.setSize(window.innerWidth, window.innerHeight);
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

const createChicken = (font, pos = {x: spawnSize / 2, y: 0, z: spawnSize / 2}) => {

  const userData = {
    id: 1,
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
  chicken.name = `chicken`;

  chicken.position.set(pos.x, pos.y, pos.z);
  //chicken.rotation.y = randomIntFromInterval(0, Math.PI * 2);

  chicken.userData = userData;
  chickens.push(chicken);

  // BODY
  const bodySize = {w: 1, h: 1, depth: 1.5};
  const body = box(bodySize, {x: 0, y: 1.25, z: 0}, chickenSettings.body);
  body.name = `body`;
  chicken.add(body);

  // HEAD
  const headSize = {w: 1, h: 1, depth: 1};
  const head = box(headSize, {x: 0, y: bodySize.h, z: ((headSize.depth / 2) - (bodySize.depth / 2) + (headSize.depth / 2))}, chickenSettings.body);
  head.name = `head`;
  body.add(head);

  if (showLaser) {
    const laserSize = {w: .02, h: .02, depth: 100};
    const laser = box(laserSize, {x: 0, y: 0, z: 0}, `#FF331A`);
    laser.geometry.translate(0, 0, laserSize.depth / 2);
    laser.name = `laser`;
    head.add(laser);
  }

  // EYES
  const eyeSize = {w: .1, h: .1, depth: .1};
  const eyeLeft = box(eyeSize, {x: - headSize.w / 2, y: 0, z: 0}, playground.day.state ? chickenSettings.eye.day : chickenSettings.eye.night, `basic`);
  eyeLeft.userData.part = `eyeLeft`;
  head.add(eyeLeft);

  const eyeRight = box(eyeSize, {x: headSize.w / 2, y: 0, z: 0}, playground.day.state ? chickenSettings.eye.day : chickenSettings.eye.night, `basic`);
  eyeRight.userData.part = `eyeRight`;
  head.add(eyeRight);

  // MOUTH
  const mouthSize = {w: .3, h: .3, depth: .5};
  const mouth = box(mouthSize, {x: 0, y: 0, z: headSize.depth / 2 + mouthSize.depth / 2}, chickenSettings.mouth);
  head.add(mouth);

  // WATTLE
  const wattleSize = {w: .3, h: .3, depth: .3};
  const wattle = box(wattleSize, {x: 0, y: - wattleSize.h, z: headSize.depth / 2 + wattleSize.depth / 2}, chickenSettings.wattle);
  head.add(wattle);

  // WINGS
  const wingSize = {w: .2, h: .5, depth: 1};
  const wingLeft = box(wingSize, {x: - (bodySize.w / 2 + wingSize.w / 2), y: body.position.y, z: 0}, chickenSettings.wing);
  wingLeft.userData.part = `wingLeft`;
  chicken.add(wingLeft);

  const wingRight = box(wingSize, {x: bodySize.w / 2 + wingSize.w / 2, y: body.position.y, z: 0}, chickenSettings.wing);
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
  const legLeft = box(legSize, {x: 0, y: - legSize.h / 2, z: 0}, chickenSettings.leg);
  const legRight = box(legSize, {x: 0, y: - legSize.h / 2, z: 0}, chickenSettings.leg);

  legLeftObj.add(legLeft);
  legRightObj.add(legRight);

  chicken.add(legs);

  // SHADOW
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(chickenSettings.shadow.radius, 32), new THREE.MeshBasicMaterial({color: chickenSettings.shadow.color, depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: .25}));
  shadow.userData.part = `shadow`;
  shadow.userData.radius = chickenSettings.shadow.radius;
  shadow.position.setY(.001);
  shadow.rotateX(Math.PI / 2);
  chicken.add(shadow);

  this.scene.add(chicken);

  addTextToChicken(chicken, head, font);

  chicken.add(this.camera);
  this.controls = new FlyControls(chicken, this.renderer.domElement);
  this.controls.movementSpeed = .1;
  this.controls.rollSpeed = .05;
  this.controls.autoForward = false;
  this.controls.dragToLook = false;
  this.controls.mouseToTurn = false;

  this.player = chicken;

  you = {
    head: head,
    body: body,
    legs: {
      walking: false,
      left: legLeftObj,
      right: legRightObj
    },
    shadow: shadow
  };
};

const box = (size, position, color, material = `phong`) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size.w, size.h, size.depth),
    material === `phong` ? new THREE.MeshPhongMaterial({color: color, shading: THREE.FlatShading}) : new THREE.MeshBasicMaterial({color: color})
  );

  mesh.position.set(position.x, position.y, position.z);
  return mesh;
};

const findObject = (parent, obj, key = `part`) => {
  return parent.children.find(child => child.userData[key] === obj);
};

const createArena = size => {
  const arena = new THREE.Object3D();
  arena.name = `arena`;

  arena.position.set(0, 0, 0);
  this.scene.add(arena);

  for (let i = 0;i < 4;i ++) {

    const geometry = new THREE.BoxGeometry(size, playground.arena.size.h, playground.arena.size.depth);
    const material = new THREE.MeshPhongMaterial({color: playground.arena.color, shading: THREE.FlatShading, transparent: true, opacity: .5});

    const mesh = new THREE.Mesh(geometry, material);

    if (i === 0) {
      mesh.position.set(size / 2, 0, 0);
    } else if (i === 1) {
      mesh.position.set(size, 0, size / 2);
      mesh.rotation.y = Math.PI / 2;
    } else if (i === 2) {
      mesh.position.set(size - size / 2, 0, size);
    } else if (i === 3) {
      mesh.position.set(0, 0, size / 2);
      mesh.rotation.y = Math.PI / 2;
    }

    arena.add(mesh);

  }
};

const createFloor = () => {
  const geometry = new THREE.PlaneGeometry(playground.ground.size.w, playground.ground.size.h, playground.ground.size.segments);
  const material = new THREE.MeshPhongMaterial({color: playground.ground.color, side: THREE.DoubleSide, shading: THREE.FlatShading, shininess: 5});
  const floor = new THREE.Mesh(geometry, material);

  floor.rotation.x = THREE.Math.degToRad(90);
  floor.name = `floor`;

  this.scene.add(floor);
  return floor;
};

const animate = () => {
  requestAnimationFrame(animate);

  if (!this.player) return;

  checkObjectInteraction();

  if (keyPressed[` `]) animateChickenFly(this.player, you.shadow, 0);
  if (keyPressed[`z`]) animateChickenWalk(this.player);
  if (keyPressed[`s`]) animateChickenWalk(this.player, true);

  // custom check if r is constantly down
  if (keyPressed[`r`]) interactHold(`r`, true);
  // check if back up
  if (!keyPressed[`r`]) interactHold(`r`, false);

  this.controls.update(1);

  chickens.forEach(chicken => {

    const shadow = findObject(chicken, `shadow`);
    shadow.position.setY(- chicken.position.y + .001);

    if (chicken !== this.player) animateChickenFly(chicken, shadow);
  });

  render();
};

const getWorldPosition = object => {
  const vector = new THREE.Vector3();
  vector.setFromMatrixPosition(object.matrixWorld);
  return vector;
};

const checkObjectInteraction = () => {

  const pos = getWorldPosition(this.player.getObjectByName(`body`).getObjectByName(`head`));
  const direction = this.player.getObjectByName(`body`).getObjectByName(`head`).getWorldDirection();

  pilarRay.set(pos, direction);

  const intersect = pilarRay.intersectObjects(this.scene.children);

  if (intersect.length) {
    if (intersect[0].object.userData.key) {

      interaction = intersect[0].object.userData;

      // do nothing if it's already done
      if (interaction.done) return;

      TweenMax.to(interactionKey, .5, {
        y: 0
      });
      TweenMax.to(interactionText, .5, {
        delay: .05,
        y: 0
      });

      interactionKey.textContent = intersect[0].object.userData.key;
      interactionText.textContent = intersect[0].object.userData.hold ? `[HOLD] ${intersect[0].object.userData.text}` : intersect[0].object.userData.text;

      return;
    }
  }

  // reset everything if nothing is happening
  resetInteraction();

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
  if (chicken === this.player && !camera.moveWithJump && !firstPerson) {
    TweenMax.to(this.camera.position, jumpSpeed.up, {
      y: camera.position.y - delta,
      ease: Power2.easeInOut,
      onComplete: () => {
        TweenMax.to(this.camera.position, jumpSpeed.down, {
          y: camera.position.y,
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

/*
const randomIntFromInterval = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};
*/

const render = () => {
  this.renderer.render(this.scene, this.camera);
};

init();
