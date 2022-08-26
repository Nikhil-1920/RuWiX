(function(window, undefined) {

    "use strict";
    if(!window.requestAnimationFrame) {

        window.requestAnimationFrame = (function() {

            return window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
            window.requestAnimationFrame || function(callback, element) {
                window.setTimeout(callback, 1000 / 60);
            }; 

        })();
    }

    var container, scrambler, undoRubik, newRubik, flatImage, rubikType, camera, scenes, renderer, projector, 
    rubikcube, w, h, w2, h2, targetRotationY = 0, targetRotationX = 0, radian = 500, mouse = { x: 0, y: 0 }, 
    mouseX = 0, mouseY = 0, mouseX0 = mouseX, mouseY0 = mouseY, cubeTouch, releasedCube, 
    
    isCubeRotation = false, colors = { inside: 0x2c2c2c, back: 0x00FFFF, bottom: 0x00FF00, left: 0xFFFF00,
        right: 0x0000FF, front: 0xFF0000, top: 0xFF00FF,
    },

    offsetX = 0.5 * Math.PI, offsetY = -Math.PI;


    function range(what, min, max, closed) {

        return true === closed ? ((what <= max) && (what >= min)) : ((what < max) && (what > min));
    }


    function recursive_offset(node) {

        var x = 0, y = 0, nodeStyle;

        while(node) {

            try { nodeStyle = window.getComputedStyle(node); } 
            catch(e) { nodeStyle = null; }

            if(node.scrollLeft) { x += node.scrollLeft; }
            if(node.scrollTop)  { y += node.scrollTop;  }
            if(node.offsetLeft) { x -= node.offsetLeft; }
            if(node.offsetTop)  { y -= node.offsetTop;  }

            if(nodeStyle && nodeStyle.marginLeft) { x -= parseInt(nodeStyle.marginLeft, 10); }
            if(nodeStyle && nodeStyle.marginTop)  { y -= parseInt(nodeStyle.marginTop, 10);  }
            node = node.parentNode
        }

        return { x: x, y: y };
    }


    function updateflatimage() { rubikcube.getFlatImage(flatImage); }


    function getCubelet(clientX, clientY) {

        mouse.x =  (clientX / w) * 2 - 1;
        mouse.y = -(clientY / h) * 2 + 1;

        var vector = new THREE.Vector3(mouse.x, mouse.y, 1), rays, intersects;
        projector.unprojectVector(vector, camera);

        rays = new THREE.Ray(camera.position, vector.subSelf(camera.position).normalize());
        intersects = rays.intersectObjects(rubikcube.children);

        return 0 < intersects.length ? { cubelet: intersects[0].object, 
            face: intersects[0].face, ray: rays, vector: vector }: null;
    }


    function onDocumentMouseDown(event) { onDocumentDown(event, false); }
    function onDocumentTouchStart(event) { onDocumentDown(event, true); }


    function onDocumentDown(event, isTouch) {

        event.preventDefault();

        var clientX = isTouch ? event.changedTouches[0].clientX : event.clientX,
            clientY = isTouch ? event.changedTouches[0].clientY : event.clientY,
            offset, target;

        offset = recursive_offset(event.target);
        clientX += offset.x; 
        clientY += offset.y;
        target = getCubelet(clientX, clientY);

        if(null == target) {

            isCubeRotation = true;
            mouseX0 = mouseX = (clientX / w);
            mouseY0 = mouseY = (clientY / h);

            if(isTouch) {
                container.addEventListener('touchmove',  onDocumentTouchMove, false);
                container.addEventListener('touchend',    onDocumentTouchEnd, false);
                container.addEventListener('touchcancel', onDocumentTouchEnd, false);
            }

            else {
                container.addEventListener('mousemove', onDocumentMouseMove, false);
                container.addEventListener('mouseup',     onDocumentMouseUp, false);
                container.addEventListener('mouseout',   onDocumentMouseOut, false);
            }
        }

        else {
            
            isCubeRotation = false;
            var cubeletscenes = rubikcube.getCubeletSeenCoords(target.cubelet),
            faces = rubikcube.getFacesAsSeen(target.cubelet), matname;

            if(null == faces) { return; }

            matname = target.cubelet.geometry.materials[target.face.materialIndex].name;
            cubeTouch = {

                cube: target.cubelet,
                seenas: {
                    
                    name: faces.faceseenas[matname],
                    xx: cubeletscenes.xx,
                    yy: cubeletscenes.yy,
                    zz: cubeletscenes.zz
                }
            };

            if(isTouch) {

                container.addEventListener('touchend',    onDocumentTouchEnd, false);
                container.addEventListener('touchcancel', onDocumentTouchEnd, false);
            }

            else {

                container.addEventListener('mouseup',   onDocumentMouseUp, false);
                container.addEventListener('mouseout', onDocumentMouseOut, false);
            }
        }
    }


    function onDocumentMouseMove(event) { onDocumentMove(event, false); }
    function onDocumentTouchMove(event) { onDocumentMove(event, true);  }


    function onDocumentMove(event, isTouch) {

        var clientX = isTouch ? event.changedTouches[0].clientX : event.clientX,
            clientY = isTouch ? event.changedTouches[0].clientY : event.clientY,
            offset;

        if(isCubeRotation) {

            offset = recursive_offset(event.target);
            clientX += offset.x; clientY += offset.y;

            if(clientX > w || clientX < 0 || clientY > h || clientY < 0) { return; }
            mouseX = (clientX / w);
            mouseY = (clientY / h);

            targetRotationY += mouseX - mouseX0;
            targetRotationX += mouseY - mouseY0;

            mouseX0 = mouseX;
            mouseY0 = mouseY;
        }
    }


    function onDocumentMouseUp(event) { onDocumentUp(event, false); }
    function onDocumentTouchEnd(event) { onDocumentUp(event, true); }


    function onDocumentUp(event, isTouch) {

        var clientX = isTouch ? event.changedTouches[0].clientX : event.clientX,
            clientY = isTouch ? event.changedTouches[0].clientY : event.clientY,
            offset = 0;

        if(isCubeRotation) {

            isCubeRotation = false;

            if(isTouch) {

                container.removeEventListener('touchmove',   onDocumentTouchMove, false);
                container.removeEventListener('touchend',     onDocumentTouchEnd, false);
                container.removeEventListener('touchcancel',  onDocumentTouchEnd, false);
            }

            else {

                container.removeEventListener('mousemove', onDocumentMouseMove, false);
                container.removeEventListener('mouseup',     onDocumentMouseUp, false);
                container.removeEventListener('mouseout',   onDocumentMouseOut, false);
            }
        }

        else {

            offset = recursive_offset(event.target);
            clientX += offset.x; 
            clientY += offset.y;

            var target = getCubelet(clientX, clientY), cubeletscenes, faces, matname, N, angle = -1;

            if(null == target) { return; }

            cubeletscenes = rubikcube.getCubeletSeenCoords(target.cubelet);
            faces = rubikcube.getFacesAsSeen(target.cubelet);

            if(null == faces) { return; }

            matname = target.cubelet.geometry.materials[target.face.materialIndex].name;

            releasedCube = {

                cube: target.cubelet,
                seenas: {
                    name: faces.faceseenas[matname],
                    xx: cubeletscenes.xx,
                    yy: cubeletscenes.yy,
                    zz: cubeletscenes.zz
                }
            };

            if(cubeTouch.seenas.name === releasedCube.seenas.name) {

                N = rubikcube.rubik.N;
                angle = -1;

                switch(cubeTouch.seenas.name) {

                    case 'right':
                    case  'left':
                        if(range(cubeTouch.seenas.yy, 0, N - 1) && range(releasedCube.seenas.yy, 0, N - 1)) {

                            if('left' === cubeTouch.seenas.name) { angle = -angle; }
                            if(releasedCube.seenas.zz < cubeTouch.seenas.zz) { angle = -angle; }
                            rubikcube.rotate({ axis: "y", row: cubeTouch.seenas.yy, angle: angle, duration: 1 });
                        }

                        else if(range(cubeTouch.seenas.zz, 0, N - 1) && range(releasedCube.seenas.zz, 0, N - 1)) {

                            if('right' === cubeTouch.seenas.name) { angle = -angle; }
                            if(releasedCube.seenas.yy < cubeTouch.seenas.yy) { angle = -angle; }
                            rubikcube.rotate({ axis: "z", row: cubeTouch.seenas.zz, angle: angle, duration: 1 });
                        }

                        else if(cubeTouch.seenas.yy === N - 1 && releasedCube.seenas.yy === N - 1) {

                            angle = -angle;
                            if(releasedCube.seenas.zz < cubeTouch.seenas.zz) { angle = -angle; }
                            rubikcube.rotate({ axis: "x", row: cubeTouch.seenas.xx, angle: angle, duration: 1 });
                        }

                        else if(cubeTouch.seenas.yy === 0 && releasedCube.seenas.yy === 0) {

                            angle = -angle;
                            if(releasedCube.seenas.zz < cubeTouch.seenas.zz) { angle = -angle; }
                            rubikcube.rotate({ axis: "x", row: cubeTouch.seenas.xx, angle: -angle, duration: 1 });
                        }

                        else if (cubeTouch.seenas.zz === 0 && releasedCube.seenas.zz === 0) {
                            
                            angle = -angle;
                            if(releasedCube.seenas.yy < cubeTouch.seenas.yy) { angle = -angle; }
                            rubikcube.rotate({ axis: "x", row:cubeTouch.seenas.xx, angle: angle, duration: 1 });
                        }

                        else if(cubeTouch.seenas.zz === N - 1 && releasedCube.seenas.zz === N - 1) {
                            
                            angle = -angle;
                            if(releasedCube.seenas.yy < cubeTouch.seenas.yy) { angle = -angle; }
                            rubikcube.rotate({ axis: "x", row: cubeTouch.seenas.xx, angle: -angle, duration: 1 });
                        }

                        break;

                    case    'top':
                    case 'bottom':
                        if(range(cubeTouch.seenas.zz, 0, N - 1) && range(releasedCube.seenas.zz, 0, N -1)) {
                            
                            if('bottom' === cubeTouch.seenas.name) { angle = -angle; }
                            if(releasedCube.seenas.xx < cubeTouch.seenas.xx) { angle = -angle; }
                            rubikcube.rotate({ axis: "z", row: cubeTouch.seenas.zz, angle: angle, duration: 1 });
                        }

                        else if(range(cubeTouch.seenas.xx, 0, N - 1) && range(releasedCube.seenas.xx, 0, N - 1)) {

                            if('bottom' === cubeTouch.seenas.name) { angle = -angle; }
                            if(releasedCube.seenas.zz < cubeTouch.seenas.zz) { angle = -angle; }
                            rubikcube.rotate({ axis: "x", row: cubeTouch.seenas.xx, angle: -angle, duration: 1 });
                        }

                        else if(cubeTouch.seenas.zz === N-1 && releasedCube.seenas.zz === N - 1) {
                            
                            if(releasedCube.seenas.xx < cubeTouch.seenas.xx) { angle = -angle; }
                            rubikcube.rotate({ axis: "y", row: cubeTouch.seenas.yy, angle: -angle, duration: 1 });
                        }

                        else if(cubeTouch.seenas.zz === 0 && releasedCube.seenas.zz === 0) {
                            
                            if(releasedCube.seenas.xx < cubeTouch.seenas.xx) { angle = -angle; }
                            rubikcube.rotate({ axis: "y", row: cubeTouch.seenas.yy, angle: angle, duration: 1 });
                        }

                        else if(cubeTouch.seenas.xx === N - 1 && releasedCube.seenas.xx === N - 1) {
                            
                            angle = -angle;
                            if(releasedCube.seenas.zz < cubeTouch.seenas.zz) { angle = -angle; }
                            rubikcube.rotate({ axis: "y", row: cubeTouch.seenas.yy, angle: -angle, duration: 1 });
                        }

                        else if(cubeTouch.seenas.xx === 0 && releasedCube.seenas.xx === 0) {
                            
                            angle = -angle;
                            if(releasedCube.seenas.zz < cubeTouch.seenas.zz) { angle = -angle; }
                            rubikcube.rotate({ axis: "y", row: cubeTouch.seenas.yy, angle: angle, duration: 1 });
                        }

                        break;

                    case  'back':
                    case 'front':
                        if(range(cubeTouch.seenas.yy, 0, N - 1) && range(releasedCube.seenas.yy, 0, N - 1)) {

                            if('back' === cubeTouch.seenas.name) { angle = -angle; }
                            if(releasedCube.seenas.xx < cubeTouch.seenas.xx) { angle = -angle; }
                            rubikcube.rotate({ axis: "y", row: cubeTouch.seenas.yy, angle: -angle, duration: 1 });
                        }

                        else if(range(cubeTouch.seenas.xx, 0, N - 1) && range(releasedCube.seenas.xx, 0, N - 1)) {

                            if('back' === cubeTouch.seenas.name) { angle = -angle; }
                            if(releasedCube.seenas.yy < cubeTouch.seenas.yy) { angle = -angle; }
                            rubikcube.rotate({ axis: "x", row: cubeTouch.seenas.xx, angle: angle, duration: 1 });
                        }

                        else if (cubeTouch.seenas.yy === N - 1 && releasedCube.seenas.yy === N - 1) {

                            angle = -angle;
                            if (releasedCube.seenas.xx < cubeTouch.seenas.xx) { angle = -angle; }
                            rubikcube.rotate({ axis: "z", row: cubeTouch.seenas.zz, angle: -angle, duration: 1 });
                        }

                        else if(cubeTouch.seenas.yy === 0 && releasedCube.seenas.yy === 0) { 

                            angle = -angle;
                            if(releasedCube.seenas.xx < cubeTouch.seenas.xx) { angle = -angle; }
                            rubikcube.rotate({ axis: "z", row: cubeTouch.seenas.zz, angle: angle, duration: 1 });
                        }

                        else if(cubeTouch.seenas.xx === N - 1 && releasedCube.seenas.xx === N - 1) { 

                            if(releasedCube.seenas.yy < cubeTouch.seenas.yy) { angle = -angle; }
                            rubikcube.rotate({ axis: "z", row: cubeTouch.seenas.zz, angle: -angle, duration: 1 });
                        }

                        else if(cubeTouch.seenas.xx === 0 && releasedCube.seenas.xx === 0) { 

                            if(releasedCube.seenas.yy < cubeTouch.seenas.yy) { angle = -angle; }
                            rubikcube.rotate({ axis: "z", row: cubeTouch.seenas.zz, angle: angle, duration: 1 });
                        }

                        break;
                }
            }

            if(isTouch) {

                container.removeEventListener('touchend',    onDocumentTouchEnd, false);
                container.removeEventListener('touchcancel', onDocumentTouchEnd, false);
            }

            else {

                container.removeEventListener('mouseup',   onDocumentMouseUp, false);
                container.removeEventListener('mouseout', onDocumentMouseOut, false);
            }
        }
    }


    function onDocumentMouseOut(event) {
        
        isCubeRotation = false;
        container.removeEventListener('mousemove', onDocumentMouseMove, false);
        container.removeEventListener('mouseup',     onDocumentMouseUp, false);
        container.removeEventListener('mouseout',   onDocumentMouseOut, false);
    }


    function animate() {
    
        camera.position.x = radian * Math.sin(targetRotationY * offsetY) * Math.cos(targetRotationX * offsetX);
        camera.position.y = radian * Math.sin(targetRotationX * offsetX);
        camera.position.z = radian * Math.cos(targetRotationY * offsetY) * Math.cos(targetRotationX * offsetX);
        camera.lookAt(scenes.position);
        
        TWEEN.update();
        renderer.render(scenes, camera);
        requestAnimationFrame(animate);
    }


    function setDimensions() {

        w = Math.min(window.innerWidth, 2000) - 20;
        h = Math.max(window.innerHeight -150, 650);

        w2 = w / 2;
        h2 = h / 2;

        container.style.width  = String(w) + "px";
        container.style.height = String(h) + "px";
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }


    var self = {

        init: function() {

            container = document.getElementById('container');
            newRubik  = document.getElementById('newrubik');
            scrambler = document.getElementById('scramble');
            undoRubik = document.getElementById('undo');
            flatImage = document.getElementById('flatimage');
            rubikType = document.getElementById('rubik-type');

            camera = new THREE.PerspectiveCamera(70, 1.0, 1, 1000);
            scenes = new THREE.Scene();
            camera.position.z = radian;
            scenes.add(camera);
            projector = new THREE.Projector();

            rubikcube = new Rubik(rubikType.options[rubikType.selectedIndex || 0].value, 200, 0.1, colors);
            scenes.add(rubikcube);
            rubikcube.onChange = updateflatimage;

            renderer = new THREE.CanvasRenderer();
            setDimensions();
            container.appendChild(renderer.domElement);

            window.addEventListener('resize', setDimensions, false);
            container.addEventListener('mousedown',   onDocumentMouseDown, false);
            container.addEventListener('touchstart', onDocumentTouchStart, false);

            newRubik.addEventListener('click', function() {

                if(rubikcube) { scenes.remove(rubikcube); }
                rubikcube = new Rubik(rubikType.options[rubikType.selectedIndex || 0].value, 200, 0.1, colors);
                scenes.add(rubikcube);
                rubikcube.onChange = updateflatimage;
                renderer.render(scenes, camera);
                updateflatimage();
            }, false);

            scrambler.addEventListener('click', function() {

                rubikcube.scramble(10); updateflatimage();
            }, false);

            undoRubik.addEventListener('click', function() {

                if(rubikcube.undo() == 'setRubikColors') {

                    colors = {

                        front: rubikcube.rubik.colors.front,
                        back: rubikcube.rubik.colors.back,
                        left: rubikcube.rubik.colors.left,
                        right: rubikcube.rubik.colors.right,
                        top: rubikcube.rubik.colors.top,
                        bottom: rubikcube.rubik.colors.bottom,
                        inside: rubikcube.rubik.colors.inside
                    };
                }

            }, false);

            renderer.render(scenes, camera);
            updateflatimage();
            requestAnimationFrame(animate);
        },

        animate: animate
    };
window.RubikApplication = self; }) (window);