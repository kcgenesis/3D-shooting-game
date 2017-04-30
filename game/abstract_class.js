var Animal = function(name){
	if (this.constructor === Animal){
		throw new Error("Can't initialize abstract class!");
	}
	this.name = name;
}

Animal.prototype.say = function(){
	throw new Error("Abstract method!");
}

var Cat = function() {
    Animal.apply(this, arguments);
    // Cat initialization...
};
Cat.prototype = Object.create(Animal.prototype);
Cat.prototype.constructor = Cat;

Cat.prototype.say = function() {
    console.log('my name is '+this.name);
}

var c = new Cat("geordi");
c.say();