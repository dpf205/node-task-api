const mongoose = require('mongoose');
const validator = require('validator'); // https://www.npmjs.com/package/validator
const jwt = require('jsonwebtoken'); // jwt.io
const _ = require('lodash');

var UserSchema = new mongoose.Schema({
	email: {
		type: 'String',
		required: true,
		trim: true,
		minlength: 1,
		unique: true,
		validate: { // http://mongoosejs.com/docs/validation.html
			validator: validator.isEmail,
			message: '{VALUE} is  not a valid email'
		}
	},
	password: {
		type: String,
		trim: true,
		require: true,
		minlength: 6
	},
	tokens: [{
		access: {
			type: String,
			required: true
		},
		token: {
			type: String,
			required: true
		}
		}]
});

UserSchema.methods.toJSON = function () {
	var user = this;
	var userObject = user.toObject(); // toObject() converts mongoose object to object where only the properties available on the document exist

	return _.pick(userObject, ['_id', 'email']);
};

UserSchema.methods.generateAuthToken = function () {
	var user = this;
	var access = 'auth';

	var token = jwt.sign({
		_id: user._id.toHexString(),
		access
	}, 'abc123').toString();

	user.tokens.push({
		access, // destructured var access = 'auth';
		token
	});

	return user.save().then(() => { // success argument for the next .then() call
		return token;
	});
}; // es6 arrow functions will not bind the "this" keyword


var User = mongoose.model('User', UserSchema);

module.exports = {
	User
}; // {User: User}
