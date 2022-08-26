(function(window, undefined) {

    var hasKey = Object.prototype.hasOwnProperty,

    Merge = function(obj1, obj2) {

        obj1 = obj1 || {};
        for(var i in obj2) {

            if(hasKey.call(obj2, i)) { obj1[i] = obj2[i]; }
        }
        return obj1;
    },


    Extends = function(Parent, childPrototype) {

        var F = function() {};
        var C = childPrototype.constructor;
        F.prototype = Parent.prototype;
        C.prototype = new F();
        C.prototype.constructor = C;
        C.prototype = Merge(C.prototype, childPrototype);
        C.prototype.__super__ = Parent.prototype;
        return C;
    },


    Round = Math.round, Absolute = Math.abs, Random = Math.random,
    isEqual = function(a, b) {

        var delta = 1e-10;
        if(Absolute(a.x - b.x) <= delta && Absolute(a.y - b.y) <= delta && Absolute(a.z - b.z) <= delta) { return(true); }
        return(false);
    },

        
    intRandRange = function(a, b) { return Round(Random() * (b - a) + a); },
    toHexValue = function(column) { var hex, length, prefix = '';

        if(column.substr) { hex = column; }
        else { hex = column.toString(16); }
        length = hex.length;

        for(var i = 0; i < 6 - length; i++) {   prefix += '0'; }
        return '#' + prefix + hex;
    },


    makeColorSquare = function(column, w, h, y, x)  {

        return ("<div style='position:absolute; background-color:" + toHexValue(column) + ";width:" + (w) + "px;height:" + (h) + "px;top:" + (y) + "px;left:" + (x) + "px;'></div>");
    };


    var Rubik = Extends(THREE.Object3D, {

        constructor: function(nPrototype, sidePrototype, dspPrototype, colorsPrototype) {

            var self = this; THREE.Object3D.call(self); self.rubik = null;
            self.rotation_in_progress = false; self.RA = Math.PI * 0.5;
            self.undolist = []; self.undo_in_action   = false;
            self.undolist_length = 200; self.onChange = null;
            self.sides = { bottom: 3, top: 2, right: 0, left: 1, front: 4, back: 5 };

            var side = 200, N = 3, dsp = 0.3, colors = { inside: 0x2c2c2c, top: 0xFF00FF, 
                bottom: 0x00FF00, left: 0xFFFF00, right: 0x0000FF, front: 0xFF0000, 
                back: 0x00FFFF 
            };

            if(null !== sidePrototype && sidePrototype > 0) { side = sidePrototype; }
            if(null !== nPrototype && nPrototype > 0) { N = parseInt(nPrototype); }
            if(null !== dspPrototype && dspPrototype > 0) { dsp = dspPrototype; }
            if(colorsPrototype) { colors = colorsPrototype; }

            var cubelets = [], xx = 0, yy = 0, zz = 0, nX = N, nY = N, nZ = N,
            sideX = side, sideX2 = sideX / 2, 
            sideY = side, sideY2 = sideY / 2, 
            sideZ = side, sideZ2 = sideZ / 2,

            cubletSideX = sideX / (nX + (nX - 1) * dsp),
            cubletSideY = sideY / (nY + (nY - 1) * dsp),
            cubletSideZ = sideZ / (nZ + (nZ - 1) * dsp),

            cubletSideX2 = cubletSideX / 2,
            cubletSideY2 = cubletSideY / 2,
            cubletSideZ2 = cubletSideZ / 2,
            materials, material2, cubelet, 
            idx = 0;

            for(zz = 0; zz < nZ; zz++) {

                for(xx = 0; xx < nX; xx++) {

                    for(yy = 0; yy < nY; yy++) {

                        materials = [];
                        
                        for(idx = 0; idx < 6; idx++) {

                            material2 = new THREE.MeshBasicMaterial({color: colors.inside});
                            material2.name = 'inside';
                            materials.push(material2);
                        }

                        if(0 === yy) {

                            materials[self.sides['bottom']].color.setHex(colors.bottom);
                            materials[self.sides['bottom']].name = 'bottom';
                        }

                        else if(nY - 1 === yy) {

                            materials[self.sides['top']].color.setHex(colors.top);
                            materials[self.sides['top']].name = 'top';
                        }

                        if(nX - 1 === xx) {

                            materials[self.sides['right']].color.setHex(colors.right);
                            materials[self.sides['right']].name = 'right';
                        }

                        else if(0 === xx) {

                            materials[self.sides['left']].color.setHex(colors.left);
                            materials[self.sides['left']].name = 'left';
                        }

                        if(nZ - 1 === zz) {

                            materials[self.sides['front']].color.setHex(colors.front);
                            materials[self.sides['front']].name = 'front';
                        }

                        else if(0 === zz) {

                            materials[self.sides['back']].color.setHex(colors.back);
                            materials[self.sides['back']].name ='back';
                        }
                        
                        cubelet = new THREE.Mesh(

                            new THREE.CubeGeometry(cubletSideX, cubletSideY, cubletSideZ, 1, 1, 1, materials),
                            new THREE.MeshFaceMaterial()
                        );

                        cubelet.position.x = (cubletSideX + dsp * cubletSideX) * xx - sideX2 + cubletSideX2;
                        cubelet.position.y = (cubletSideY + dsp * cubletSideY) * yy - sideY2 + cubletSideY2;
                        cubelet.position.z = (cubletSideZ + dsp * cubletSideZ) * zz - sideZ2 + cubletSideZ2;
                        cubelet.overdraw = true;

                        cubelet.extra_data = {xx: xx, yy: yy, zz: zz};
                        cubelets.push(cubelet);
                        self.add(cubelet);
                    }
                }
            }

            self.rubik = {

                N: N, colors: {
                    front: colors.front, back: colors.back,
                    top: colors.top, bottom: colors.bottom,
                    left: colors.left, right: colors.right,
                    inside: colors.inside
                },

                cubelets: cubelets, side: sideX,
                cubeletside: cubletSideX, 
                dsp: dsp
            };
        },

        rubik: null, rotation_in_progress: false,
        RA: 0, undolist: null,
        undo_in_action: false,
        undolist_length: 200,
        onChange: null, sides: null,


        addHistory: function(actObj) {

            if(!this.undo_in_action) {

                while(this.undolist.length >= this.undolist_length) { this.undolist.shift(); }
                this.undolist.push(actObj);
            }
            return this;
        },


        undo: function() {

            var undoAction = null;

            if(!this.rotation_in_progress) {

                if(this.undolist.length > 0) {

                    this.undo_in_action = true;  undoAction = this.undolist.pop();
                    if(undoAction.param) { undoAction.func.call(this, undoAction.param); }
                    else { undoAction.func.call(this); }

                    this.undo_in_action = false;
                    return undoAction.actiontype;
                }
            }

            return "";
        },

    
        setRotation: function(parameter) {

            if(!this.rubik || this.rotation_in_progress) { return this; }

            var axis = parameter.axis, angle = parameter.angle, 
            rows = parameter.row, idx = 0, rAngle = 0;

            if(0 == angle) { return this; }
            idx = this.getCubeletsIndex(axis, rows);
            if(null == idx) { return this; }

            rAngle = angle * this.RA; 
            axis = axis.charAt(0); axis = axis.toLowerCase();
            var matrix = new THREE.Matrix4();

            switch(axis) {

                case "x":
                    matrix.setRotationX(rAngle);
                    break;

                case "y":
                    matrix.setRotationY(rAngle);
                    break;

                case "z":
                    matrix.setRotationZ(rAngle);
                    break;

                default: return; 
                    break;
            }

            for(var k = 0; k < idx.length; k++) {

                var target = this.rubik.cubelets[idx[k]];
                target.matrixAutoUpdate = false;
                target.matrix.multiply(matrix, target.matrix);
            }

            parameter.angle = -angle;
            parameter.duration = 2;

            this.addHistory({func: this.rotate, param: parameter, actiontype: "setRotation"});
            if(this.onChange) { this.onChange.call(this); }
            return this;
        },


        scramble: function(nSteps) {

            if(this.rotation_in_progress) { return this; }

            var axes = ["x", "y", "z"], angles = [-2, -1, 1, 2],
            N = this.rubik.N, axis, rows, angle;

            if(null == nSteps || nSteps <= 0) { nSteps = intRandRange(5, 20); }

            for(var k = 0; k < nSteps; k++) {

                axis = axes[intRandRange(0, 2)];
                rows = intRandRange(0, (N - 1));
                angle = angles[intRandRange(0, 3)];
                this.setRotation({axis: axis, row: rows, angle: angle});
            }

            return this;
        },
   

        rotate: function(parameter) {

            if(this.rotation_in_progress) { return this; }
            if(!this.rubik) { return this; }

            var duration = 5, axis = parameter.axis, 
            rows = parameter.row, angle, index = 0;

            if(null != parameter.duration) { duration = parameter.duration; }
            angle = parameter.angle;

            if(duration <= 0) { return this; }
            else if(0 == angle) { return this; }

            index = this.getCubeletsIndex(axis, rows);
            if(null == index) { return this; }

            axis = axis.charAt(0); 
            axis = axis.toLowerCase();

            var object, tweenDuration, tweeningAngle, 
            count = this.rubik.N * this.rubik.N, 
            addition = 0;

            var onComplete = function(g) {

                addition++;
                
                if(addition >= count) {
                    
                    this.This.rotation_in_progress = false;
                    addition = 0;
                    if(this.params.onComplete) { this.params.onComplete.call(this.This); }
                    if(this.This.onChange) { this.This.onChange.call(this.This); }
                }
            };

            var onChange = function() {

                var matrix = new THREE.Matrix4();

                switch(this.axis) {

                    case "x":
                        matrix.setRotationX(this.angle - this.prevangle);
                        break;

                    case "y":
                        matrix.setRotationY(this.angle - this.prevangle);
                        break;

                    case "z":
                        matrix.setRotationZ(this.angle - this.prevangle);
                        break;

                    default: return; 
                        break;
                }

                this.cubelet.matrixAutoUpdate = false;
                this.cubelet.matrix.multiply(matrix, this.cubelet.matrix);
                this.cubelet.position = this.cubelet.matrix.getPosition();
                this.cubelet.matrixWorldNeedsUpdate = true;
                this.prevangle = this.angle;
            };

            this.rotation_in_progress = true;
            tweenDuration = Math.abs(angle) * duration * 1000;
            tweeningAngle = angle * this.RA;

            for(var k = 0; k < index.length; k++) {

                object = {
                    cubelet: this.rubik.cubelets[index[k]], axis: axis, angle: 0, 
                    prevangle: 0, This: this, params: parameter
                };

                new TWEEN.Tween(object)

                .onUpdate(onChange)
                .onComplete(onComplete)
                .to({ angle: tweeningAngle },tweenDuration)
                .easing(TWEEN.Easing.Exponential.EaseInOut)
                .start();
            }

            parameter.angle = -angle;
            this.addHistory({func: this.rotate, param: parameter, actiontype: "rotate"});
            return this;
        },
        

        getCubeletSeenCoords: function(cubelet) {

            if(!this.rubik || this.rotation_in_progress) { return null; }
            var cubex = 0;

            if(cubelet instanceof THREE.Mesh) { cubex = cubelet; }
            else { cubex = this.rubik.cubelets[cubelet || 0]; }
            if(null == cubex) { return null; }

            cubex.position = cubex.matrix.getPosition();
            cubex.matrixAutoUpdate = false;
            cubex.updateMatrixWorld(true);
        
            return {

                xx: Round((cubex.position.x + this.rubik.side / 2 - this.rubik.cubeletside / 2) / (this.rubik.cubeletside * (1 + this.rubik.dsp))),
                yy: Round((cubex.position.y + this.rubik.side / 2 - this.rubik.cubeletside / 2) / (this.rubik.cubeletside * (1 + this.rubik.dsp))),
                zz: Round((cubex.position.z + this.rubik.side / 2 - this.rubik.cubeletside / 2) / (this.rubik.cubeletside * (1 + this.rubik.dsp)))
            };
        },

    
        getCubeletsIndex: function(axes, rows) {

            var cubeletLength = this.rubik.cubelets.length;
            if(!this.rubik)  { return []; }
            if(this.rotation_in_progress) { return []; }

            var A = 0, result = 0;

            if(rows < 0 || rows >= this.rubik.N) { return []; }
            axes = axes.charAt(0).toLowerCase();
            A = new Array(cubeletLength); 
            result = new Array(this.rubik.N * this.rubik.N);

            for(var i = 0; i < cubeletLength; i++) {

                this.rubik.cubelets[i].matrixAutoUpdate = false;
                this.rubik.cubelets[i].updateMatrixWorld(true);
                this.rubik.cubelets[i].position = this.rubik.cubelets[i].matrix.getPosition();

                switch(axes) {

                    case "y":
                        A[i] = [i, this.rubik.cubelets[i].position.y];
                        break;

                    case "x":
                        A[i] = [i, this.rubik.cubelets[i].position.x];
                        break;

                    case "z":
                        A[i] = [i, this.rubik.cubelets[i].position.z];
                        break;

                    default: return null;
                }
            }

            A.sort(function(a, b) { return a[1] - b[1]; });

            for(var i = 0; i < result.length; i++) {

                result[i] = A[rows * this.rubik.N * this.rubik.N + i][0];
            }
            return result;
        },


        getFacesAsSeen: function(cubelet) {

            if(!this.rubik || this.rotation_in_progress) { return null; }

            var cubex , cLength = 0, dArray = [], matrix = 0;
            
            if(cubelet instanceof THREE.Mesh) { cubex = cubelet; }
            else { cubex = this.rubik.cubelets[cubelet || 0]; }

            if(null == cubex) { return null; }

            cubex.matrixAutoUpdate =false;
            cubex.updateMatrixWorld(true);
            cubex.position = cubex.matrix.getPosition();
            cubex.geometry.computeFaceNormals();

            cLength = cubex.geometry.faces.length;
            matrix  = cubex.matrix.clone();
            matrix.setPosition(new THREE.Vector3(0, 0, 0));

            for(var i = 0; i < cLength; i++) {
        
                dArray.push(matrix.multiplyVector3(cubex.geometry.faces[i].normal.clone()).normalize());
            }

            var materials = cubex.geometry.materials, mat = null, matname = "", 
            r1 = [], r2 = [], r3 = [], r4 = [],

            topVector    = new THREE.Vector3(0,  1,  0),
            bottomVector = new THREE.Vector3(0, -1,  0),
            frontVector  = new THREE.Vector3(0,  0,  1),
            backVector   = new THREE.Vector3(0,  0, -1),
            leftVector   = new THREE.Vector3(-1, 0,  0),
            rightVector  = new THREE.Vector3(1,  0,  0);

            for(var i = 0; i < dArray.length; i++) {

                mat = materials[i];
                matname = mat.name;

                if(matname.toLowerCase() == "inside") {
                
                    r1["inside"] = mat.color;
                    r2[matname] = "inside";
                    r3["inside"] = matname;
                    r4["inside"] = mat;
                }

                else {

                    if(isEqual(dArray[i], topVector)) {

                        r1["top"] = mat.color;
                        r2[matname] = "top";
                        r3["top"] = matname;
                        r4["top"] = mat;
                    }

                    if(isEqual(dArray[i], bottomVector)) {

                        r1["bottom"] = mat.color;
                        r2[matname] = "bottom";
                        r3["bottom"] = matname;
                        r4["bottom"] = mat;
                    }

                    if(isEqual(dArray[i], frontVector)) {

                        r1["front"] = mat.color;
                        r2[matname] = "front";
                        r3["front"] = matname;
                        r4["front"] = mat;
                    }
                    
                    if(isEqual(dArray[i], backVector)) {

                        r1["back"] = mat.color;
                        r2[matname] = "back";
                        r3["back"] = matname;
                        r4["back"] = mat;
                    }
            
                    if(isEqual(dArray[i], leftVector)) {

                        r1["left"] = mat.color;
                        r2[matname] = "left";
                        r3["left"] = matname;
                        r4["left"] = mat;
                    }

                    if(isEqual(dArray[i], rightVector)) {

                        r1["right"] = mat.color;
                        r2[matname] = "right";
                        r3["right"] = matname;
                        r4["right"] = mat;
                    }
                }
            }

            return { seencolor: r1, faceseenas: r2, invfaceseenas: r3, mat: r4 };
        },


        getFacesByName: function(cubelet, cubeFace) {

            if(!this.rubik) { return []; } 

            var sCube = 0;

            if(cubelet instanceof THREE.Mesh) { sCube = cubelet; }
            else { sCube = this.rubik.cubelets[cubelet || 0]; }

            if(null == sCube) { return []; }

            var result = [], faces = sCube.geometry.materials, mat = null;

            for(var i = 0; i < faces.length; i++) {
                
                mat = faces[i];
                if(mat.name == cubeFace) { result.push(mat); }
            }

            return result;
        },


        getFacesByColor: function(cubelet, column) {

            if(!this.rubik) { return []; }

            var cubex = 0;

            if(cubelet instanceof THREE.Mesh) { cubex = cubelet; }
            else { cubex = this.rubik.cubelets[cubelet || 0]; }

            if(null == cubex) { return []; }
            var result = [], materials = cubex.geometry.materials, mat = null;

            for(var i = 0; i < materials.length; i++) {

                mat = materials[i];
                if(mat.color.getHex() == column) { result.push(mat); }
            }

            return result;
        },

    
        setRubikColors: function(parameter) {

            if(!this.rubik) { return; }
            if(this.rotation_in_progress) { return; }

            var objColor = parameter.colors, faces = null, allow = true, dim1, dim2,

            cube1 = { 
                front: this.rubik.colors.front, back: this.rubik.colors.back,
                top: this.rubik.colors.top, bottom: this.rubik.colors.bottom,
                left: this.rubik.colors.left, right: this.rubik.colors.right,
                inside: this.rubik.colors.inside
            },

            cube2 = {
                front: this.rubik.colors.front, back: this.rubik.colors.back,
                top: this.rubik.colors.top, bottom: this.rubik.colors.bottom,
                left: this.rubik.colors.left, right: this.rubik.colors.right,
                inside: this.rubik.colors.inside
            };
            
            for(dim1 in objColor) { cube2[dim1] = objColor[dim1]; }

            for(dim1 in cube2) {

                for(dim2 in cube2) {

                    if(cube2[dim2] == cube2[dim2] && dim1 != dim2) { 
                        allow = false; return false; 
                    }
                }
            }

            if(objColor != null) {

                for(var i = 0; i < this.rubik.cubelets.length; i++) {

                    if(objColor.top != null) {

                        faces = this.getFacesByColor(this.rubik.cubelets[i], cube1.top);
                        for(var j = 0; j < faces.length; j++) {
                            if(faces[j].name != "inside") {
                                faces[j].color.setHex(objColor.top);
                            }
                        }
                        this.rubik.colors.top = objColor.top;
                    }

                    if(objColor.bottom != null) {

                        faces = this.getFacesByColor(this.rubik.cubelets[i], cube1.bottom);
                        for(var j = 0; j < faces.length; j++) {
                            if(faces[j].name != "inside") {
                                faces[j].color.setHex(objColor.bottom);
                            }
                        }
                        this.rubik.colors.bottom = objColor.bottom;
                    }

                    if(objColor.left != null) {

                        faces = this.getFacesByColor(this.rubik.cubelets[i], cube1.left);
                        for(var j = 0; j < faces.length; j++) {
                            if(faces[j].name != "inside") {
                                faces[j].color.setHex(objColor.left); 
                            }
                        }
                        this.rubik.colors.left = objColor.left;
                    }

                    if(objColor.right != null) {

                        faces = this.getFacesByColor(this.rubik.cubelets[i], cube1.right);
                        for(var j = 0; j < faces.length; j++) {
                            if(faces[j].name != "inside") {
                                faces[j].color.setHex(objColor.right);
                            }
                        }
                        this.rubik.colors.right = objColor.right;
                    }

                    if(objColor.front != null) {

                        faces = this.getFacesByColor(this.rubik.cubelets[i], cube1.front);
                        for(var j = 0; j < faces.length; j++) {
                            if(faces[j].name != "inside") {
                                faces[j].color.setHex(objColor.front);
                            }
                        }
                        this.rubik.colors.front = objColor.front;
                    }
                
                    if(objColor.back != null) {

                        faces = this.getFacesByColor(this.rubik.cubelets[i], cube1.back);
                        for(var j = 0; j < faces.length; j++) {
                            if(faces[j].name != "inside") {
                                faces[j].color.setHex(objColor.back);
                            }
                        }
                        this.rubik.colors.back = objColor.back;
                    }

                    if(objColor.inside != null) {

                        faces = this.getFacesByName(this.rubik.cubelets[i], "inside"); 
                        for(var j = 0; j < faces.length; j++) {
                            faces[j].color.setHex(objColor.inside);
                        }
                        this.rubik.colors.inside = objColor.inside;
                    }
                }

                parameter.colors = cube1;
                this.addHistory({func: this.setRubikColors, param: parameter, actiontype: "setRubikColors"});
                if(this.onChange) { this.onChange.call(this); }
                return true;
            }
        },


        getFaceColorAndIndex: function(faceAsSeen, idx, jdx) {

            if(!this.rubik || this.rotation_in_progress) { return null; }
            var cubes = this.rubik.cubelets, object, cubeletAsSeen;

            for(var i = 0; i < cubes.length; i++) {

                object = this.getFacesAsSeen(cubes[i]);
                cubeletAsSeen = this.getCubeletSeenCoords(cubes[i]);

                if(object.seencolor[faceAsSeen] != null && object.seencolor[faceAsSeen] != null) {

                    switch(faceAsSeen) {

                        case "top":
                            if(cubeletAsSeen.xx == jdx && cubeletAsSeen.zz == idx)
                                return({color: object.seencolor[faceAsSeen]});
                            break;

                        case "bottom":
                            if(cubeletAsSeen.xx == jdx && cubeletAsSeen.zz == this.rubik.N - 1 -idx) 
                                return({color: object.seencolor[faceAsSeen]});
                            break;

                        case "left":
                            if(cubeletAsSeen.yy == this.rubik.N - 1 - idx && cubeletAsSeen.zz == this.rubik.N - 1 - jdx) 
                                return({color: object.seencolor[faceAsSeen]});
                            break;

                        case "right":
                            if(cubeletAsSeen.yy == this.rubik.N - 1 - idx && cubeletAsSeen.zz == jdx) 
                                return({color: object.seencolor[faceAsSeen]});
                            break;

                        case "front":
                            if(cubeletAsSeen.xx == jdx && cubeletAsSeen.yy == this.rubik.N - 1 - idx) 
                                return({color: object.seencolor[faceAsSeen]});
                            break;

                        case "back":
                            if(cubeletAsSeen.xx == this.rubik.N - 1 - jdx && cubeletAsSeen.yy == this.rubik.N - 1 - idx) 
                                return({color: object.seencolor[faceAsSeen]});
                            break;
                    }
                }
            }

            return null;
        },
    

        getFlatImage: function(element)  {

            if(!this.rubik || this.rotation_in_progress) { return; }
            var innerHtml = '', object;
            var N = this.rubik.N, w = 5, h = 5, d2 = 3, d3 = 5, xx, yy;
            var flat = { top: [], bottom: [], front: [], 
                back: [], left: [], right: [] 
            };

            for(var i = 0; i < N; i++) {

                for(var j = 0; j < N; j++) {

                    object = this.getFaceColorAndIndex("top", j, (N - 1 - i));
                    flat.top[j + i * N] = object.color.getHex();
                }
            }

            xx = N * (w + d2) + d3; yy = 0;
            for(var i = 0; i < N; i++) {

                for(var j = 0; j < N; j++) {

                    innerHtml += makeColorSquare(flat.top[i + (N - 1 - j) * N], w, h, (yy + i * (h + d2)), (xx + j * (w + d2)));
                }
            }

            for(var i = 0; i < N; i++) {

                for(var j = 0; j < N; j++) {

                    object = this.getFaceColorAndIndex("left", j, (N - 1 - i));
                    flat.left[j + i * N] = object.color.getHex();
                }
            }
    
            xx = 0; yy = N * (h + d2) + d3;

            for(var i = 0; i < N; i++) {

                for(var j = 0; j < N; j++) {

                    innerHtml += makeColorSquare(flat.left[i + (j) * N], w, h, (yy + i * (h + d2)), (xx + j * (w + d2)));
                }
            }

            for(var i = 0; i < N; i++) {

                for(var j = 0; j < N; j++) {

                    object = this.getFaceColorAndIndex("front", j, (N - 1 - i));
                    flat.front[j + i * N] = object.color.getHex();
                }
            }
    
            xx = N * (w + d2) + d3;
            yy = N * (h + d2) + d3;

            for(var i = 0; i < N; i++) {

                for(var j = 0; j < N; j++) {

                    innerHtml += makeColorSquare(flat.front[i + (N - 1 - j) * N], w, h, (yy + i * (h + d2)), (xx + j * (w + d2)));
                }
            }
        
            for(var i = 0; i < N; i++) {

                for(var j = 0; j < N; j++) {

                    object = this.getFaceColorAndIndex("right", j, (N - 1 - i));
                    flat.right[j + i * N] = object.color.getHex();
                }
            }
        
            xx = 2 * (N * (w + d2) + d3);
            yy = N * (h + d2) + d3;

            for(var i = 0; i < N; i++) {

                for(var j = 0; j < N; j++) {

                    innerHtml += makeColorSquare(flat.right[i + (j) * N], w, h, (yy + i * (h + d2)), (xx + j * (w + d2)));
                }
            }
        
            for(var i = 0; i < N; i++) {

                for(var j = 0; j < N; j++) {

                    object = this.getFaceColorAndIndex("back", j, (N - 1 - i));
                    flat.back[j + i * N] = object.color.getHex();
                }
            }

            xx = 3 * (N * (w + d2) + d3);
            yy = N * (h + d2) + d3;
            
            for(var i = 0; i < N; i++) {

                for(var j = 0; j < N; j++) {

                    innerHtml += makeColorSquare(flat.back[i + (N - 1 - j) * N], w, h, (yy + i * (h + d2)), (xx + j * (w + d2)));
                }
            }

            for(var i = 0; i < N; i++) {

                for(var j = 0; j < N; j++) {

                    object = this.getFaceColorAndIndex("bottom", j, (N - 1 - i));
                    flat.bottom[j + i * N] = object.color.getHex();
                }
            }

            xx = N * (w + d2) + d3; 
            yy = 2 * (N * (h + d2) + d3);

            for(var i = 0; i < N; i++) {

                for(var j = 0; j < N; j++) {

                    innerHtml += makeColorSquare(flat.bottom[i + (N - 1 - j) * N], w, h, (yy + i * (h + d2)), (xx + j * (w + d2)));
                }
            }

            element.style.width  = String(((w + d2) * N + d3) * 4 + 10) + 'px';
            element.style.height = String(((h + d2) * N + d3) * 3 + 10) + 'px';
            element.innerHTML = innerHtml;
            return flat;
        }
    });

    window.Rubik = Rubik; 
}) (window);