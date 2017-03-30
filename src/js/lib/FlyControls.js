import * as THREE from 'three';
import TweenMax from 'gsap';
import keys from '../global/keys';

const FlyControls = function (object, domElement) {

  this.object = object;
  this.domElement = domElement;

  this.domElement.setAttribute(`tabindex`, - 1);

  this.movementSpeed = 1;
  this.rollSpeed = 0.005;

  this.dragToLook = true;
  this.autoForward = false;

  this.tmpQuaternion = new THREE.Quaternion();

  this.mouseStatus = 0;

  this.moveState = {up: 0, down: 0, left: 0, right: 0, forward: 0, back: 0, pitchUp: 0, pitchDown: 0, yawLeft: 0, yawRight: 0, rollLeft: 0, rollRight: 0};
  this.moveVector = new THREE.Vector3(0, 0, 0);
  this.rotationVector = new THREE.Vector3(0, 0, 0);

  this.keydown = event => {

    if (event.altKey) return;

    const key = event.keyCode;

    switch (key) {

    case keys.SHIFT:
      this.movementSpeedMultiplier = .1;
      break;

    case keys.Z:
      TweenMax.to(this.moveState, .5, {
        forward: 1,
        onUpdate: () => {
          this.updateMovementAndRotationVector();
        }
      });
      break;

    case keys.S:
      TweenMax.to(this.moveState, .5, {
        back: .5,
        onUpdate: () => this.updateMovementAndRotationVector()
      });
      break;

    case keys.Q:
      TweenMax.to(this.moveState, .5, {
        yawLeft: .75,
        onUpdate: () => this.updateMovementAndRotationVector()
      });
      break;

    case keys.D:
      TweenMax.to(this.moveState, .5, {
        yawRight: .75,
        onUpdate: () => this.updateMovementAndRotationVector()
      });
      break;
    }
  };

  this.keyup = event => {

    switch (event.keyCode) {

    case keys.SHIFT:
      this.movementSpeedMultiplier = 1;
      break;

    case keys.Z:
      TweenMax.to(this.moveState, .5, {
        forward: 0,
        onUpdate: () => this.updateMovementAndRotationVector()
      });
      break;

    case keys.S:
      TweenMax.to(this.moveState, .5, {
        back: 0,
        onUpdate: () => this.updateMovementAndRotationVector()
      });
      break;

    case keys.Q:
      TweenMax.to(this.moveState, .5, {
        yawLeft: 0,
        onUpdate: () => this.updateMovementAndRotationVector()
      });
      break;

    case keys.D:
      TweenMax.to(this.moveState, .5, {
        //right: 0,
        yawRight: 0,
        onUpdate: () => this.updateMovementAndRotationVector()
      });
      break;
    }
  };

  this.updateMovementAndRotationVector = () => {
    this.updateMovementVector();
    this.updateRotationVector();
  };

  this.mousemove = event => {

    if (!this.mouseToTurn) return;

    if (!this.dragToLook || this.mouseStatus > 0) {

      const container = this.getContainerDimensions();
      const halfWidth  = container.size[ 0 ] / 2;
      const halfHeight = container.size[ 1 ] / 2;

      this.moveState.yawLeft   = - ((event.pageX - container.offset[ 0 ]) - halfWidth) / halfWidth;
      this.moveState.pitchDown = ((event.pageY - container.offset[ 1 ]) - halfHeight) / halfHeight;

      this.updateRotationVector();
    }
  };

  this.update = delta => {

    const moveMult = delta * this.movementSpeed;
    const rotMult = (delta / 2) * this.rollSpeed;

    this.object.translateX(this.moveVector.x * moveMult);
    this.object.translateY(this.moveVector.y * moveMult);
    this.object.translateZ(this.moveVector.z * moveMult);

    this.tmpQuaternion.set(this.rotationVector.x * rotMult, this.rotationVector.y * rotMult, this.rotationVector.z * rotMult, 1).normalize();
    this.object.quaternion.multiply(this.tmpQuaternion);

		// expose the rotation vector for convenience
    this.object.rotation.setFromQuaternion(this.object.quaternion, this.object.rotation.order);

  };

  this.updateMovementVector = () => {

    this.moveVector.x = (- this.moveState.left + this.moveState.right);
    this.moveVector.y = (- this.moveState.down + this.moveState.up);
    this.moveVector.z = this.moveState.forward - this.moveState.back;

		//console.log( 'move:', [ this.moveVector.x, this.moveVector.y, this.moveVector.z ] );

  };

  this.updateRotationVector = () => {

    this.rotationVector.x = (- this.moveState.pitchDown + this.moveState.pitchUp);
    this.rotationVector.y = (- this.moveState.yawRight  + this.moveState.yawLeft);
    this.rotationVector.z = (- this.moveState.rollRight + this.moveState.rollLeft);

    //console.log(`rotate:`, [ this.rotationVector.x, this.rotationVector.y, this.rotationVector.z ]);

  };

  this.getContainerDimensions = function() {

    if (this.domElement !== document) {

      return {
        size: [ this.domElement.offsetWidth, this.domElement.offsetHeight ],
        offset: [ this.domElement.offsetLeft,  this.domElement.offsetTop ]
      };

    } else {

      return {
        size: [ window.innerWidth, window.innerHeight ],
        offset: [ 0, 0 ]
      };

    }

  };

  //document.addEventListener(`mousemove`, this.mousemove);
  document.addEventListener(`keydown`, this.keydown);
  document.addEventListener(`keyup`, this.keyup);

  // disable right click (also dev console shortcut!!!)
  //document.addEventListener(`contextmenu`, event => event.preventDefault());

  this.updateMovementVector();
  this.updateRotationVector();

};

export default FlyControls;
