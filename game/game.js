"use strict";

var canvas,canvasbox;

var gl;

//var points = [];
//var normals = [];
//var colors = [];

//lighting stuff
var lightAmbient;
var lightDiffuse;
var lightSpecular;
var materialAmbient;
var materialDiffuse;
var materialSpecular;
var materialShininess;

var ambientColor, diffuseColor, specularColor;
var modelView, projection;
var viewerPos;
var program;
//perspective is applied FROM the point of the eye.
//looking AT the origin

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;
var axis = 0;
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
var far = 40;
var  fovy = 30.0;
var aspect;

var viewMatrix,shadowViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var vBuffer,vPosition;
var nBuffer,vNormal;
var r_theta;
//var r_thetaLoc;
//var fColor;

var eye, at, up;
var lightPos;

var m;

//var red;
//var mycube;
var black;
var scene=[];


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



//each shape has its own rotation matrix, which will be sent to the shaders.


function Shape(x,y,z){
    this.rot = mat4();
    this.to_rot = [0,0,0];
    this.loc = vec3(x,y,z);
    this.points = [];
    this.normals=[];
    this.colors = [];
    this.velocity = [0,0,0];
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
    var vertexColors = [
        [ 0.0, 0.0, 0.0, 1.0 ],  // black
        [ 1.0, 0.0, 0.0, 1.0 ],  // red
        [ 1.0, 1.0, 0.0, 1.0 ],  // yellow
        [ 0.0, 1.0, 0.0, 1.0 ],  // green
        [ 0.0, 0.0, 1.0, 1.0 ],  // blue
        [ 1.0, 0.0, 1.0, 1.0 ],  // magenta
        [ 0.0, 1.0, 1.0, 1.0 ],  // cyan
        [ 1.0, 1.0, 1.0, 1.0 ]   // white
    ];
     var t1 = subtract(vertices[b], vertices[a]);
     var t2 = subtract(vertices[c], vertices[b]);
     var normal = cross(t1, t2);
     var normal = vec3(normal);
     //console.log("normal:");
     

    var indices = [ a, b, c, d ];
    for ( var i = 0; i < indices.length; ++i ) {
        this.points.push( vertices[indices[i]] );
        this.normals.push(normal);
        //this.normals.push(normal);
    }
    
    //this.colors.push(vertexColors[a]);
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

function Cube(x,y,z){
    Shape.apply(this,arguments);
    this.quad( 1, 0, 3, 2 );
    this.quad( 2, 3, 7, 6 );
    this.quad( 3, 0, 4, 7 );
    this.quad( 6, 5, 1, 2 );
    this.quad( 4, 5, 6, 7 );
    this.quad( 5, 4, 0, 1 );
    this.translate(x,y+0.5,z);
}

function Quad(){
    Shape.apply(this,arguments);
    this.quad( 3, 0, 4, 7 );
    this.translate(0,0.5,0);
    this.scale(20,0,20);
}

Quad.prototype=Object.create(Shape.prototype);
Quad.prototype.constructor=Quad;


  
Cube.prototype = Object.create(Shape.prototype);
Cube.prototype.constructor = Cube;

function LineSegment(p1,p2,color){
    Shape.apply(this,arguments);
    if(!((p1.length == p2.length)&&(p1.length==4))){
        throw "LineSegment(p1,p2): trying to create line segment from non-points";
        return;
    }
    this.points = [p1,p2];
    this.colors = [color,color];
}



LineSegment.prototype=Object.create(Shape.prototype);
LineSegment.prototype.constructor=LineSegment;



Cube.prototype.render=function(){
    //console.log(this.rot);
    //console.log(view);
    this.translate(this.velocity[0],this.velocity[1],this.velocity[2]);
    for(var i=0;i<this.velocity.length;i++){
        this.loc[i] += this.velocity[i];
    }
    var modelViewMatrix=mult(viewMatrix,this.rot);        
    
    //var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW );

    //var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    //var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW );

    //var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);



    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
    

    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),
       flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),
       flatten(diffuseProduct) );
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"),
       flatten(specularProduct) );
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"),
       flatten(lightPos) );
    gl.uniform1f(gl.getUniformLocation(program,
           "shininess"),materialShininess);

    
    //6 faces 4 points each: each face has a shadow!
    for(var i=0; i<this.points.length; i+=4) {
        //gl.uniform4fv(fColor, flatten(this.colors[i/4]));
        gl.drawArrays( gl.TRIANGLE_FAN, i, 4 );
        //gl.uniform4fv(fColor, flatten(black));
        //gl.drawArrays( gl.LINE_LOOP, i, 4 );
    }


    /*var shadowViewMatrix = mult(viewMatrix, translate(lightPos[0], lightPos[1], lightPos[2]));
    shadowViewMatrix = mult(shadowViewMatrix, m);
    shadowViewMatrix = mult(shadowViewMatrix, translate(-lightPos[0], -lightPos[1],-lightPos[2]));
    //load shadow matrix and color
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(shadowViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
        
    //gl.uniform4fv(fColor, flatten(black));
    //draw shadow for ea. face
    for(var i=0; i<this.points.length; i+=4) {
        gl.drawArrays(gl.TRIANGLE_FAN, i, 4);
    }*/
}

Quad.prototype.render=function(){
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(viewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
    for(var i=0; i<this.points.length; i+=4) {
        //gl.uniform4fv(fColor, flatten(this.colors[i/4]));
        gl.drawArrays( gl.TRIANGLE_FAN, i, 4 );
    }
}






/*
LineSegment.prototype.render=function(){
    var modelViewMatrix=mult(viewMatrix,this.rot);
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
    
    //for(var i=0; i<this.points.length; i+=4) {
        gl.uniform4fv(fColor, flatten(black));
        gl.drawArrays( gl.LINES, 0, 1 );
    //}
}

*/





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
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);
    //gl.depthFunc(gl.LEQUAL);
    //gl.enable(gl.POLYGON_OFFSET_FILL);
    //  gl.polygonOffset(1.0, 2.0);

    lightPos = vec4(-2.0, 2.0, 0.0,0.0);
    r_theta = mat4();
    //lighting stuff
    lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
    lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
    lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

    //all materials (for now)
    materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
    materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0);
    materialSpecular = vec4( 1.0, 0.8, 0.0, 1.0 );
    materialShininess = 50.0;

    // matrix for shadow projection

    m = mat4();
    m[3][3] = 0;
    m[3][1] = -1/lightPos[1];


    at = vec3(0.0, 0.0, 0.0);
    up = vec3(0.0, 1.0, 0.0);

    eye = vec3(1.0, 1.0, 1.0);

    //mycube = new Cube(5,0.5,0);
    //scene.push(new Quad()); 
    scene.push(new Cube(5,0,0));
    black = vec4(0.0, 0.0, 0.0, 1.0);

    document.getElementById("mouseLoc").textContent ="no click";
    document.getElementById("worldLoc").textContent ="no click";
    //
    //  Add event listeners
    //
    document.getElementById( "inc_theta" ).onclick = function () {v_theta += dr;console.log(eye);};
    document.getElementById( "dec_theta" ).onclick = function () {v_theta -= dr;console.log(eye);};
    document.getElementById( "inc_phi" ).onclick = function () {v_phi += dr;console.log(eye);};
    document.getElementById( "dec_phi" ).onclick = function () {v_phi -= dr;console.log(eye);};

    document.getElementById("gl-canvas").onclick = function(e){
        //call unproject

        var vec = vec3(event.pageX - canvasbox.left, event.pageY - canvasbox.top, 0);
        document.getElementById("mouseLoc").textContent =
            "clientX: " + vec[0] +
            " - clientY: " + vec[1];
        var p0 = unproject(vec[0], vec[1], near, viewMatrix, projectionMatrix, viewport);
        var p1 = unproject(vec[0], vec[1], far, viewMatrix, projectionMatrix, viewport);
        //console.log(p0);
        //console.log(p1);

        /*document.getElementById("worldLoc").textContent = 
            "worldX: "+res[0]+
            "\nworldY: "+res[1]+
            "\nworldZ: "+res[2]+
            "\nworld[3]: "+res[3];*/

        //create a line
        //scene.push(new LineSegment(p0,p1,black));
        scene.push(new Cube(p1[0],p1[1],p1[2]));
        var vel = vec3();
        vel[0]=p1[0]-p0[0];
        vel[1]=p1[1]-p0[1];
        vel[2]=p1[2]-p0[2];
        var normV = normalize(vel);
        for(var i=0;i<normV.length;i++){
            normV[i] /= -2;
        }
        scene[scene.length-1].velocity[0]=normV[0];
        scene[scene.length-1].velocity[1]=normV[1];
        scene[scene.length-1].velocity[2]=normV[2]; 
        
        console.log(scene.length);

    }
    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );


    /*vBuffer = gl.createBuffer();
    vPosition = gl.getAttribLocation( program, "vPosition" );

    
    nBuffer = gl.createBuffer();
    vNormal = gl.getAttribLocation( program, "vNormal" );*/
    nBuffer = gl.createBuffer();
    //gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    //gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );

    vNormal = gl.getAttribLocation( program, "vNormal" );
    //gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    //gl.enableVertexAttribArray( vNormal );

    vBuffer = gl.createBuffer();
    //gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    //gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );

    vPosition = gl.getAttribLocation(program, "vPosition");
    //gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    //gl.enableVertexAttribArray(vPosition);
   
    
    //fColor = gl.getUniformLocation(program, "fColor");
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );

    
    render();

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


        for(var i=0;i<scene.length;i++){
            console.log("rendering element "+i);
            scene[i].render();
        }

        for(var i=0;i<scene.length;i++){
            if(scene[i].loc[1]<0){
                console.log("DELETOS");
                scene.splice(i,1);
            }
        }


        // send color and matrix for cube then render
        //mycube.load();

        /*
        modelViewMatrix=mult(viewMatrix,r_theta);        
        
        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );
        gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( vPosition );


        gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
        gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
        //gl.uniformMatrix4fv(r_thetaLoc,false,flatten(r_theta));
        // update light source

        

        //6 faces 4 points each: each face has a shadow!
        for(var i=0; i<points.length; i+=4) {
            gl.uniform4fv(fColor, flatten(colors[i]));
            gl.drawArrays( gl.TRIANGLE_FAN, i, 4 );
            gl.uniform4fv(fColor, flatten(black));
            gl.drawArrays( gl.LINE_LOOP, i, 4 );
        }
        */

        lightPos[0] = Math.sin(theta);
        lightPos[2] = Math.cos(theta);

/*
        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );
        gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( vPosition );
*/
        //gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
        
        //obtain model view matrix for shadow
        
        
        requestAnimFrame(render);
    }
