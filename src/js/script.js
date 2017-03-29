//const OrbitControls = require(`three-orbit-controls`)(THREE);
import FlyControls from './lib/FlyControls';
import {TweenMax, Power2, Circ, TimelineMax} from 'gsap';

import playground from './settings/playground';
import chickenSettings from './settings/chicken';
import lights from './settings/lights';
import camera from './settings/camera';

const mouse = {x: 0, y: 0};
const keyPressed = [];

let you = {};
const chickens = [];
const totalChickens = 100;
const playerChicken = 0;
const spawnSize = totalChickens < 250 ? 250 : totalChickens;

let mainLight, ambientLight;

const init = () => {

  /* BASICS */
  this.scene = new THREE.Scene();
  this.scene.background = new THREE.Color(playground.day.state ? playground.skybox.day : playground.skybox.night);
  this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 500);
  this.camera.position.x = camera.position.x;
  this.camera.position.y = camera.position.y;
  this.camera.position.z = camera.position.z;
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
  mainLight = new THREE.DirectionalLight(playground.day.state ? lights.main.day.color : lights.main.night.color, playground.day.state ? lights.main.day.intensity : lights.main.night.intensity);
  mainLight.position.set(10, 10, 10);
  this.scene.add(mainLight);

  ambientLight = new THREE.AmbientLight(playground.day.state ? lights.ambient.day.color : lights.ambient.night.color, playground.day.state ? lights.ambient.day.intensity : lights.ambient.night.intensity);
  this.scene.add(ambientLight);

  /* AXIS */
  this.scene.add(new THREE.AxisHelper(1000));

  this.floor = createFloor();

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
  this.arena = createArena(spawnSize);
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

  switch (key) {

  case `n`:
    toggleDay();
    break;
  }

};

const toggleDay = () => {
  playground.day.state = !playground.day.state;

  const eyeColor = new THREE.Color(playground.day.state ? chickenSettings.eye.day : chickenSettings.eye.night);
  chickens.forEach((chicken, i) => {
    const eyeLeftColor = findObject(chicken.children[0], `eyeLeft`).material.color;
    TweenMax.to(eyeLeftColor, playground.day.switchDuration, {
      delay: i * .1,
      r: eyeColor.r,
      g: eyeColor.g,
      b: eyeColor.b,
      ease: Power2.easeIn
    });

    const eyeRightColor = findObject(chicken.children[0], `eyeRight`).material.color;
    TweenMax.to(eyeRightColor, playground.day.switchDuration, {
      delay: playground.day.state ? 0 : i * .005,
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

const createChicken = (player = false, font, pos = {x: randomIntFromInterval(10, spawnSize - 10), y: 0, z: randomIntFromInterval(10, spawnSize - 10)}) => {

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

  chicken.position.set(pos.x, pos.y, pos.z);
  chicken.rotation.y = randomIntFromInterval(0, Math.PI * 2);

  chicken.userData = userData;
  chickens.push(chicken);

  // BODY
  const bodySize = {w: 1, h: 1, depth: 1.5};
  const body = box(bodySize, {x: 0, y: 1.25, z: 0}, chickenSettings.body);
  chicken.add(body);

  // HEAD
  const headSize = {w: 1, h: 1, depth: 1};
  const head = box(headSize, {x: 0, y: bodySize.h, z: - ((headSize.depth / 2) - (bodySize.depth / 2) + (headSize.depth / 2))}, chickenSettings.body);
  body.add(head);

  // EYES
  const eyeSize = {w: .1, h: .1, depth: .1};
  const eyeLeft = box(eyeSize, {x: - headSize.w / 2, y: head.position.y, z: head.position.z}, playground.day.state ? chickenSettings.eye.day : chickenSettings.eye.night, `basic`);
  eyeLeft.userData.part = `eyeLeft`;
  body.add(eyeLeft);

  const eyeRight = box(eyeSize, {x: headSize.w / 2, y: head.position.y, z: head.position.z}, playground.day.state ? chickenSettings.eye.day : chickenSettings.eye.night, `basic`);
  eyeRight.userData.part = `eyeRight`;
  body.add(eyeRight);

  // const eyeLeftLightSize = {r: .1, h: 1, segments: 32};
  // const eyeLeftLight = new THREE.Mesh(
  //   new THREE.ConeGeometry(eyeLeftLightSize.r, eyeLeftLightSize.h, eyeLeftLightSize.segments),
  //   new THREE.MeshBasicMaterial({
  //     color: chickenSettings.eye.light.color,
  //     transparent: true,
  //     opacity: playground.day.state ? chickenSettings.eye.light.opacity.day : chickenSettings.eye.light.opacity.night
  //   })
  // );
  // eyeLeftLight.rotation.set(THREE.Math.degToRad(60), 0, 0);
  // eyeLeft.add(eyeLeftLight);
  // you.eyeLights = {
  //   left: eyeLeftLight
  // };

  // MOUTH
  const mouthSize = {w: .3, h: .3, depth: .5};
  const mouth = box(mouthSize, {x: 0, y: head.position.y, z: - 1}, chickenSettings.mouth);
  body.add(mouth);

  // WATTLE
  const wattleSize = {w: .3, h: .3, depth: .3};
  const wattle = box(wattleSize, {x: 0, y: head.position.y - wattleSize.h, z: - (bodySize.depth / 2 + wattleSize.depth / 2)}, chickenSettings.wattle);
  body.add(wattle);

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

  //legLeftObj.rotation.x = - Math.PI / 4;
  //legRightObj.rotation.x = Math.PI / 4;

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

  if (player) {

    chicken.add(this.camera);
    this.controls = new FlyControls(chicken, this.renderer.domElement);
    this.controls.movementSpeed = .1;
    this.controls.rollSpeed = .05;
    this.controls.autoForward = false;
    this.controls.dragToLook = false;
    this.controls.mouseToTurn = false;

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

const box = (size, position, color, material = `phong`) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size.w, size.h, size.depth),
    material === `phong` ? new THREE.MeshPhongMaterial({color: color, shading: THREE.FlatShading}) : new THREE.MeshBasicMaterial({color: color})
  );

  mesh.position.set(position.x, position.y, position.z);
  return mesh;
};

const findObject = (parent, obj) => {
  return parent.children.find(child => child.userData.part === obj);
};

const createArena = size => {
  const arena = new THREE.Object3D;
  arena.position.set(0, 0, 0);
  this.scene.add(arena);

  for (let i = 0;i < 4;i ++) {

    const geometry = new THREE.BoxGeometry(size, playground.arena.size.h, playground.arena.size.depth);
    const material = new THREE.MeshPhongMaterial({color: playground.arena.color, shading: THREE.FlatShading});

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
    shadow.position.setY(- chicken.position.y + .001);

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
  if (chicken === this.player && !camera.moveWithJump) {
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

const randomIntFromInterval = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const render = () => {
  this.renderer.render(this.scene, this.camera);
};

init();
