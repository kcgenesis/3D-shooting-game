"use strict";

var canvas;
var gl;

var points = [];
var colors = [];

var near = -4;
var far = 4;

var theta  = 0.0;


var dr = 5.0 * Math.PI/180.0;
/*var eye_theta,eye_phi;
theta = phi = 2*dr;
*/

var left = -2.0;
var right = 2.0;
var ytop = 2.0;
var bottom = -2.0;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var vBuffer,vPosition;
var r_theta;
var r_thetaLoc;
var fColor;

var eye, at, up;
var light;

var m;

//var red;
var mycube;
var black;



//each shape has its own rotation matrix, which will be sent to the shaders.


function Shape(x,y,z){
    this.rot = mat4();
    this.to_rot = [0,0,0];
    this.loc = vec3(x,y,z);
    this.points = [];
    this.colors = [];
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
    var indices = [ a, b, c, d ];
    for ( var i = 0; i < indices.length; ++i ) {
        this.points.push( vertices[indices[i]] );
        this.colors.push(vertexColors[a]);
    }
    
}
Shape.prototype.translate = function(x,y,z){
   

    if (x===null){x=[0,0,0];} 
    
    for ( var i = 0; i < this.points.length; ++i ) {
        
        this.points[i] = mult(translate(x,y,z),this.points[i]);
        
    }
    
}

var Cube = function(x,y,z){
    
    Shape.apply(this,arguments);
    this.quad( 1, 0, 3, 2 );
    this.quad( 2, 3, 7, 6 );
    this.quad( 3, 0, 4, 7 );
    this.quad( 6, 5, 1, 2 );
    this.quad( 4, 5, 6, 7 );
    this.quad( 5, 4, 0, 1 );
    this.translate(x,y,z);
    
}

Cube.prototype = Object.create(Shape.prototype);
Cube.prototype.constructor = Cube;


Cube.prototype.load = function(){
    points = [];
    colors=[];
    
    for(var i=0;i<this.points.length;i++){
        points.push(this.points[i]);
    }
    for(var i=0;i<this.rot.length;i++){
        for(var j=0;j<this.rot[i].length;j++){
            r_theta[i][j]=this.rot[i][j];
        }
    }
    for(var i=0;i<this.colors.length;i++){
        colors.push(this.colors[i]);
    }
}




window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

    light = vec3(-2.0, 2.0, 0.0);
    r_theta = mat4();
// matrix for shadow projection

    m = mat4();
    m[3][3] = 0;
    m[3][1] = -1/light[1];


    at = vec3(0.0, 0.0, 0.0);
    up = vec3(0.0, 1.0, 0.0);
    eye = vec3(1.0, 1.0, 1.0);

    // color square red and shadow black

    //red = vec4(1.0, 0.0, 0.0, 1.0);
    mycube = new Cube(0,0.5,0); 

    black = vec4(0.0, 0.0, 0.0, 1.0);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );


    vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    r_thetaLoc = gl.getUniformLocation(program, "r_theta");
    fColor = gl.getUniformLocation(program, "fColor");
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );

    
    render();

}


var render = function() {
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // model-view matrix for square
        theta += 0.01;
        if(theta > 2*Math.PI) theta -= 2*Math.PI;

        modelViewMatrix = lookAt(eye, at, up);
        projectionMatrix = ortho( left, right, bottom, ytop, near, far );
    
        // send color and matrix for cube then render
        mycube.load();
        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );
        gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( vPosition );


        gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
        gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
        gl.uniformMatrix4fv(r_thetaLoc,false,flatten(r_theta));
        // rotate light source

        //light[0] = Math.sin(theta);
        //light[2] = Math.cos(theta);

        //6 faces 4 points each: each face has a shadow!
        for(var i=0; i<points.length; i+=4) {
            gl.uniform4fv(fColor, flatten(colors[i]));
            gl.drawArrays( gl.TRIANGLE_FAN, i, 4 );
            gl.uniform4fv(fColor, flatten(black));
            gl.drawArrays( gl.LINE_LOOP, i, 4 );

        }

        //obtain model view matrix for shadow
        
        modelViewMatrix = mult(modelViewMatrix, translate(light[0], light[1], light[2]));
            modelViewMatrix = mult(modelViewMatrix, m);
            modelViewMatrix = mult(modelViewMatrix, translate(-light[0], -light[1],-light[2]));
            //load shadow matrix and color
        gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
        gl.uniform4fv(fColor, flatten(black));
        //draw shadow for ea. face
        for(var i=0; i<points.length; i+=4) {
            
            gl.drawArrays(gl.TRIANGLE_FAN, i, 4);

        }


        requestAnimFrame(render);
    }
