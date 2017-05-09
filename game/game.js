"use strict";

var canvas,canvasbox;
var program;
var gl;

var points = [];
var colors = [];
var KEYCODE_w = 87;
var KEYCODE_a = 65;
var KEYCODE_s = 83;
var KEYCODE_d = 68;

//perspective is applied FROM the point of the eye.
//looking AT the origin


//theta light rotation
var theta  = 0.0;

var viewport;

//EYE variables
var dr = 5.0 * Math.PI/180.0;
var v_theta,v_phi,v_radius;
v_theta = v_phi = 2*dr;
v_radius = 30;
//ortho viewing variables
var left = -2.0;
var right = 2.0;
var ytop = 2.0;
var bottom = -2.0;
//perspective viewing variables
var near = 1;
var far = 45;
var  fovy = 40.0;
var aspect;

var viewMatrix,shadowViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var vBuffer,vPosition;
var u_fColor;

var ambientColor, diffuseColor, specularColor;
var lightPos = vec4(-2.0, 2.0, 0.0,1.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var shadowAmbient = vec4( 0.0, 0.0, 0.0, 1.0 );
var shadowDiffuse = vec4( 0.0, 0.0, 0.0, 1.0);
var shadowSpecular = vec4( 0.0, 0.0, 0.0, 1.0 );
var shadowShininess = 0.0;

var nBuffer,vNormal;
//var r_theta;
//var r_thetaLoc;


var eye, at, up;

var m;

//var red;
//var mycube;
var black,red,blue;
var scene=[];
var tracks =[];
var dim=[];
var escaped=0;
var eliminated=0;
var fired=0;

var rx,ry,rz;

function unproject(clickX, clickY, clickZ, view, proj, viewport) {
    var m = mult(proj, view);
    var invertedM=inverse4(m);
    //console.log(invertedM);
    var cY = viewport[3] - clickY;//height from bottom
    var input = vec4();
    var dest = vec4();
    input[0] = (clickX - viewport[0]) / viewport[2]  * 2.0 - 1.0;
    input[1] = (cY - viewport[1]) / viewport[3]  * 2.0 - 1.0;
    input[2] = 2.0 * clickZ - 1.0;
    input[3] = 1.0;
    //var out = vec4();
    //vec4.transformMat4(out, input, invertedM);
    var out = mult(invertedM,input);
    if(out[3] === 0.0) { return null; }
    dest[0] = out[0] / out[3];
    dest[1] = out[1] / out[3];
    dest[2] = out[2] / out[3];
    return dest;
}

function Shape(x,y,z){
    this.rot = mat4();
    this.rot_velocity = [0,0,0];
    this.loc = vec3(x,y,z);
    this.points = [];
    this.colors = [];
    this.normals =[];
    this.velocity = [0,0,0];
    this.vertexColors = [
        [ 0.0, 0.0, 0.0, 1.0 ],  // black
        [ 1.0, 0.0, 0.0, 1.0 ],  // red
        [ 1.0, 1.0, 0.0, 1.0 ],  // yellow
        [ 0.0, 1.0, 0.0, 1.0 ],  // green
        [ 0.0, 0.0, 1.0, 1.0 ],  // blue
        [ 1.0, 0.0, 1.0, 1.0 ],  // magenta
        [ 0.0, 1.0, 1.0, 1.0 ],  // cyan
        [ 1.0, 1.0, 1.0, 1.0 ]   // white
    ];
}

Shape.prototype.quad = function(a,b,c,d){
    var vertices = [ 
        vec4( -0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5, -0.5, -0.5, 1.0 ),
        vec4( -0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5, -0.5, -0.5, 1.0 )
    ];
    var t1 = subtract(vertices[b], vertices[a]);
     var t2 = subtract(vertices[c], vertices[b]);
     var normal = cross(t1, t2);
     var normal = vec3(normal);
     //console.log(normal);
    var indices = [ a, b, c, d ];
    for ( var i = 0; i < indices.length; ++i ) {
        this.points.push( vertices[indices[i]] );
        this.normals.push(normal);
    }
    this.colors.push(this.vertexColors[a]);

}

Shape.prototype.translate = function(x,y,z){
    if (x===null){x=[0,0,0];} 
    
    for ( var i = 0; i < this.points.length; ++i ) {
        
        this.points[i] = mult(translate(x,y,z),this.points[i]);
        
    }
}
Shape.prototype.scale = function(x,y,z){
    if (x===null){x=[0,0,0];} 
    
    for ( var i = 0; i < this.points.length; ++i ) {
        
        this.points[i] = mult(scalem(x,y,z),this.points[i]);
        
    }
}

function Cube(x,y,z,scale){
    Shape.apply(this,arguments);
    this.quad( 1, 0, 3, 2 );
    this.quad( 2, 3, 7, 6 );
    this.quad( 3, 0, 4, 7 );
    this.quad( 6, 5, 1, 2 );
    this.quad( 4, 5, 6, 7 );
    this.quad( 5, 4, 0, 1 );
    if(scale){
        this.scale(scale,scale,scale);
        this.scaleVal = scale;
    }
    
    
    
}
Cube.prototype = Object.create(Shape.prototype);
Cube.prototype.constructor = Cube;


function Enemy(x,y,z,scale){
    Cube.apply(this,arguments);
    this.translate(x,y+0.5,z);
    this.loc[0]=x;
    this.loc[1]=y+0.5;
    this.loc[2]=z;
    this.materialAmbient = vec4( 0.5, 0.0, 1.0, 1.0 );
    this.materialDiffuse = vec4( 1.0, 0.8, 0.5, 1.0);
    this.materialSpecular = vec4( 0.5, 0.2, 1.0, 1.0 );
    this.materialShininess = 100.0;
}
Enemy.prototype = Object.create(Cube.prototype);
Enemy.prototype.constructor = Enemy;

function Bullet(x,y,z,scale){
    Cube.apply(this,arguments);
    this.translate(x,y,z);
    this.loc[0]=x;
    this.loc[1]=y;
    this.loc[2]=z;
    this.materialAmbient = vec4( 0.0, 0.5, 0.0, 1.0 );
    this.materialDiffuse = vec4( 0.0, 0.8, 1.0, 1.0);
    this.materialSpecular = vec4( 0.5, 0.2, 1.0, 1.0 );
    this.materialShininess = 100.0;
}
Bullet.prototype = Object.create(Cube.prototype);
Bullet.prototype.constructor = Enemy;




//negative to positive 10 in x and z
function Quad(){
    Shape.apply(this,arguments);
    this.quad( 3, 0, 4, 7 );
    this.translate(0,0.5,0);
    var s1=20;
    var s2 = 20;
    this.scale(s1,0,s2);
    this.materialAmbient = vec4( 0.5, 1.0, 0.5, 1.0 );
    this.materialDiffuse = vec4( 0.8, 0.8, 0.8, 1.0);
    this.materialSpecular = vec4( 1.0, 0.8, 0.2, 1.0 );
    this.materialShininess = 50.0;
}




Quad.prototype=Object.create(Shape.prototype);
Quad.prototype.constructor=Quad;
Quad.prototype.dim = function(){
    var ret = vec4();
    ret[0] = this.points[2][0]; //min x
    ret[1] = this.points[0][0]; //max x
    ret[2] = this.points[2][2] ;//min z
    ret[3] = this.points[0][2]; //max z
    return ret;
}

  




Cube.prototype.render=function(){
    //console.log(this.rot);
    //console.log(view);
    this.translate(this.velocity[0],this.velocity[1],this.velocity[2]);
    for(var i=0;i<this.velocity.length;i++){
        this.loc[i] += this.velocity[i];
    }
    //this.translate(-this.loc[0],-this.loc[1],-this.loc[2]);
    //this.rotate(this.rot_velocity[0],this.rot_velocity[1],this.rot_velocity[2]);   
    var modelViewMatrix=mult(viewMatrix,this.rot);
    //this.translate(this.loc[0],this.loc[1],this.loc[2]);        
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
    
    var ambientProduct = mult(lightAmbient, this.materialAmbient);
    var diffuseProduct = mult(lightDiffuse, this.materialDiffuse);
    var specularProduct = mult(lightSpecular, this.materialSpecular);

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),
       flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),
       flatten(diffuseProduct) );
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"),
       flatten(specularProduct) );
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"),
       flatten(lightPos) );

    gl.uniform1f(gl.getUniformLocation(program,
       "shininess"),this.materialShininess);

    //6 faces 4 points each: each face has a shadow!
    for(var i=0; i<this.points.length; i+=4) {
        gl.uniform4fv(u_fColor, flatten(this.colors[i/4]));
        gl.drawArrays( gl.TRIANGLE_FAN, i, 4 );
        gl.uniform4fv(u_fColor, flatten(black));
        gl.drawArrays( gl.LINE_LOOP, i, 4 );
    }

    var ambientProduct = mult(lightAmbient, shadowAmbient);
    var diffuseProduct = mult(lightDiffuse, shadowDiffuse);
    var specularProduct = mult(lightSpecular, shadowSpecular);

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),
       flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),
       flatten(diffuseProduct) );
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"),
       flatten(specularProduct) );
    gl.uniform1f(gl.getUniformLocation(program,
       "shininess"),shadowShininess);

    var shadowViewMatrix = mult(viewMatrix, translate(lightPos[0], lightPos[1], lightPos[2]));
    shadowViewMatrix = mult(shadowViewMatrix, m);
    shadowViewMatrix = mult(shadowViewMatrix, translate(-lightPos[0], -lightPos[1],-lightPos[2]));
    //load shadow matrix and color
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(shadowViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
        
    gl.uniform4fv(u_fColor, flatten(black));
    //draw shadow for ea. face
    for(var i=0; i<this.points.length; i+=4) {
        gl.drawArrays(gl.TRIANGLE_FAN, i, 4);
    }
}

Quad.prototype.render=function(){



    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(viewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );

    var ambientProduct = mult(lightAmbient, this.materialAmbient);
    var diffuseProduct = mult(lightDiffuse, this.materialDiffuse);
    var specularProduct = mult(lightSpecular, this.materialSpecular);

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),
       flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),
       flatten(diffuseProduct) );
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"),
       flatten(specularProduct) );
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"),
       flatten(lightPos) );

    gl.uniform1f(gl.getUniformLocation(program,
       "shininess"),this.materialShininess);

    for(var i=0; i<this.points.length; i+=4) {
        gl.uniform4fv(u_fColor, flatten(this.colors[i/4]));
        gl.drawArrays( gl.TRIANGLE_FAN, i, 4 );
    }
}


Cube.prototype.setColor = function(color){
    for(var i=0;i<this.colors.length;i++){
        this.colors[i] = color;
    }
}

Cube.prototype.rotate = function(thetaX,thetaY,thetaZ){
    var cosx = Math.cos(thetaX/180*Math.PI);
    var sinx = Math.sin(thetaX/180*Math.PI);
var cosy = Math.cos(thetaY/180*Math.PI);
    var siny = Math.sin(thetaY/180*Math.PI);
var cosz = Math.cos(thetaZ/180*Math.PI);
    var sinz = Math.sin(thetaZ/180*Math.PI);

    var rx= mat4( 1.0,  0.0,  0.0, 0.0, //row major
                           0.0,  cosx, -sinx, 0.0,
                           0.0,  sinx,  cosx, 0.0,
                           0.0,  0.0,  0.0, 1.0 );

    var ry = mat4( cosy, 0.0, siny, 0.0,
                         0.0, 1.0,  0.0, 0.0,
                         -siny,0.0,  cosy, 0.0,
                         0.0, 0.0,  0.0, 1.0 );
    var rz = mat4( cosz, -sinz, 0.0, 0.0,
                         sinz,  cosz, 0.0, 0.0,
                         0.0,  0.0, 1.0, 0.0,
                         0.0,  0.0, 0.0, 1.0 );

    this.rot = mult(rx,this.rot);
    this.rot = mult(ry,this.rot);
    this.rot = mult(rz,this.rot);
}


window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    canvasbox = canvas.getBoundingClientRect();
    aspect =  canvas.width/canvas.height;
    viewport = [
        0,
        0,
        document.getElementById("gl-canvas").width,
        document.getElementById("gl-canvas").height
    ];
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.1, 0.1, 0.1, 1 );
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

    
    //r_theta = mat4();



    


    // matrix for shadow projection

    m = mat4();
    m[3][3] = 0;
    m[3][1] = -1/lightPos[1];


    at = vec3(0.0, 0.0, 0.0);
    up = vec3(0.0, 1.0, 0.0);

    eye = vec3(1.0, 1.0, 1.0);

    //mycube = new Cube(5,0.5,0);
    scene.push(new Quad());
    dim = scene[0].dim();
    for(var i=dim[0];i<dim[1];i+=2){
        tracks.push(i);
    }
    
    //tracks
   
    black = vec4(0.0, 0.0, 0.0, 1.0);
    red = vec4( 1.0, 0.0, 0.0, 1.0 );
    blue = vec4( 0.0, 0.0, 1.0, 1.0 );
    document.getElementById("escaped").textContent ="0";
    document.getElementById("eliminated").textContent ="0";
    document.getElementById("accuracy").textContent ="N/A";
    //
    //  Add event listeners
    //
    document.getElementById("gl-canvas").onclick = function(e){
        //call unproject
        fired++;
        var percent = Math.floor(eliminated/fired*100);
        document.getElementById("accuracy").textContent = percent.toString() + "%";
        var vec = vec3(event.pageX - canvasbox.left, event.pageY - canvasbox.top, 0);
        var p0 = unproject(vec[0], vec[1], near, viewMatrix, projectionMatrix, viewport);
        var p1 = unproject(vec[0], vec[1], far, viewMatrix, projectionMatrix, viewport);
       
        scene.push(new Bullet(p1[0],p1[1],p1[2],0.25));
        var vel = vec3();
        vel[0]=p1[0]-p0[0];
        vel[1]=p1[1]-p0[1];
        vel[2]=p1[2]-p0[2];
        var normV = normalize(vel);
        for(var i=0;i<normV.length;i++){
            normV[i] /= -1;
        }
        scene[scene.length-1].velocity[0]=normV[0];
        scene[scene.length-1].velocity[1]=normV[1];
        scene[scene.length-1].velocity[2]=normV[2]; 
        
        console.log(scene.length);

    }
    document.addEventListener('keydown',keycontrol);
    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );


    vBuffer = gl.createBuffer();
    //gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    //gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    vPosition = gl.getAttribLocation( program, "vPosition" );
    //gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    //gl.enableVertexAttribArray( vPosition );

    nBuffer = gl.createBuffer();
    vNormal = gl.getAttribLocation( program, "vNormal" );
    u_fColor = gl.getUniformLocation(program, "u_fColor");
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );

    
    render();
    //console.log(tracks);
    setInterval(function(){
        var n = Math.floor(Math.random()*tracks.length);
        //console.log(n);
        var contains=false;
        for(var j=1;j<scene.length;j++){
            if((scene[j].loc[0] == tracks[n])&&(scene[j].loc[1] == 0.5)){
                contains=true; 
                //console.log("CONTAINS");       
            }
        }
        if(contains){
            return;
        }
        scene.push(new Enemy(tracks[n],0,dim[2]));
        scene[scene.length-1].velocity[2] = 0.1*(Math.random()*0.5)+0.05;    
        scene[scene.length-1].setColor(black);
    },500);
}


function keycontrol(event){
  if(((event.keyCode == KEYCODE_w)
  ||(event.keyCode == KEYCODE_a)
  ||(event.keyCode == KEYCODE_s)
  ||(event.keyCode == KEYCODE_d))) {
   
    if(event.keyCode == KEYCODE_w) {
      if(v_theta*180/Math.PI<174){v_theta += dr;}
      console.log(v_theta);

    }
    else if(event.keyCode == KEYCODE_a) {
      if(v_phi*180/Math.PI>5){
        v_phi -= dr;
      }
        
    }
    else if(event.keyCode == KEYCODE_s) {
        if(v_theta*180/Math.PI>6){
          v_theta -= dr;console.log(v_theta*180/Math.PI);
        }
    }
    else if(event.keyCode == KEYCODE_d) {
        if(v_phi*180/Math.PI<81){v_phi += dr;}
        console.log(v_phi*180/Math.PI);
    }
  }
}










var render = function() {
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        theta += 0.01;
        if(theta > 2*Math.PI) theta -= 2*Math.PI;

    var eyex,eyey,eyez;
    eyex=v_radius*Math.cos(v_phi)*Math.cos(v_theta);
    eyey=v_radius*Math.cos(v_phi)*Math.sin(v_theta);
    eyez=v_radius*Math.sin(v_phi);
    eye = vec3(eyex,eyey,eyez);

    viewMatrix = lookAt(eye, at, up);
    projectionMatrix = perspective(fovy, aspect, near, far);
        

        //loop through all the objects created
        //render them

        //y = loc[1]-0.5*scale
        for(var i=0;i<scene.length;i++){
            scene[i].render();
            //throw new Error("Something went badly wrong!");
        }

        for(var i=1;i<scene.length;i++){
            if(scene[i].scaleVal){
                //console.log(scene[i].scale);
                if(scene[i].loc[1]-0.5*scene[i].scaleVal<0){
                    console.log("DELETOS");
                    scene.splice(i,1);    
                }    
            }else{
                if(scene[i].loc[1]-0.5<0){
                    console.log("DELETOS");
                    scene.splice(i,1);
                }    
            }
        }

        for(var i=1;i<scene.length;i++){
            for (var j=1;j<scene.length;j++){
                if((Math.abs(scene[i].loc[0] - scene[j].loc[0])<0.5)
                    &&(Math.abs(scene[i].loc[1] - scene[j].loc[1])<0.5)
                    &&(Math.abs(scene[i].loc[2] - scene[j].loc[2])<0.5)
                    &&(i!=j)){
                    console.log("DELETOS");
                    scene[i].setColor(red);
                    scene[j].setColor(red);
                    //setTimeout(function(){
                        scene.splice(i,1);
                        if(j<i){
                            scene.splice(j,1);    
                        }else{
                            scene.splice(j-1,1);
                        }
                        eliminated++;
                        document.getElementById("eliminated").textContent =eliminated.toString();
                    //},10);
                    
                }
            }
        }

        for(var i=1;i<scene.length;i++){
            if((scene[i].loc[2]>9.5)&&(scene[i].loc[1]==0.5)){
                scene.splice(i,1);
                escaped++;
                document.getElementById("escaped").textContent =escaped.toString();
                
            }
        }
       
        lightPos[0] = Math.sin(theta);
        lightPos[2] = Math.cos(theta);

        requestAnimFrame(render);
    }
