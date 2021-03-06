//  run test suite via npm run test-watch (refer to package.json)

const expect = require('expect');
const request = require('supertest');

const {ObjectID} = require('mongodb');
const {app} = require('./../server');
const {Task} = require('./../models/task');
const {User} = require('./../models/user');
const {tasks, populateTasks, users, populateUsers} = require('./seed/seed');

// populate db w/ test data
// run beforeEach before EVERY test to empty db and seed it before every supertest request
beforeEach(populateUsers);
beforeEach(populateTasks);


describe('POST /tasks', () => {
	it('should create a new task', (done) => {
		var text = 'dummy task text property';

		request(app)
			.post('/tasks')
			.set('x-auth', users[0].tokens[0].token)
			.send({text})
			.expect(200)
			.expect((res) => {
				expect(res.body.text).toBe(text);
			})
			.end((err, res) => {
				if (err) {
					return done(err);
				}

				Task.find({text}).then((tasks) => {
					expect(tasks.length).toBe(1);
					expect(tasks[0].text).toBe(text); // new task created and prepended
					done();
				}).catch((e) => done(e)); // arrow function passes error to done() using the statement syntaxt NOT the arrow function expression syntax
			});
	});

	it('should not create task with invalid body data', (done) => {
		request(app)
			.post('/tasks')
			.set('x-auth', users[0].tokens[0].token)
			.send({})
			.expect(400)
			.end((err, res) => {
				if (err) {
					return done(err);
				}

				Task.find().then((tasks) => {
					expect(tasks.length).toBe(2); //there should only be 2 docs in task collection, as added above in task array
					done();
				}).catch((e) => done(e));
			});
	});
});

describe('GET /tasks', () => {
	it('should get all tasks in db', (done) => {
		request(app)
			.get('/tasks')
			.set('x-auth', users[0].tokens[0].token)
			.expect(200)
			.expect((res) => {
				expect(res.body.tasks.length).toBe(1);
			})
			.end(done);
	});
});

describe('GET /tasks/:id', () => {
	it('should return a task document', (done) => {
		request(app)
			.get(`/tasks/${tasks[0]._id.toHexString()}`) // convert ObjectID to a string via .toHexString()
			.set('x-auth', users[0].tokens[0].token)
			.expect(200)
			.expect((res) => {
				expect(res.body.task.text).toBe(tasks[0].text);
			})
			.end(done);
	});

	it('should not return a task document created by other user', (done) => {
		request(app)
			.get(`/tasks/${tasks[1]._id.toHexString()}`) // convert ObjectID to a string via .toHexString()
			.set('x-auth', users[0].tokens[0].token)
			.expect(404)
			.end(done);
	});

	it('should return a 404 if task not found', (done) => {
		var hexId = new ObjectID().toHexString();

		request(app)
			.get(`/tasks/${hexId}`)
			.set('x-auth', users[0].tokens[0].token)
			.expect(404)
			.end(done);
	})


	it('should return 404 for invalid ObjectID', (done) => {
		request(app)
			.get('/tasks/123abc') // improper format for ObjectID
			.set('x-auth', users[0].tokens[0].token)
			.expect(404)
			.end(done)
	});


});

describe('DELETE /tasks/:id', () => {
	it('should remove a task', (done) => {

		var hexId = tasks[1]._id.toHexString();

		request(app)
			.delete(`/tasks/${hexId}`)
			.set('x-auth', users[1].tokens[0].token)
			.expect(200)
			.expect((res) => {
				expect(res.body.task._id).toBe(hexId);
			})
			.end((err, res) => {
				if (err) {
					return done(err)
				}

				Task.findById(hexId).then((task) => {
					expect(task).toNotExist();
					done();
				}).catch((e) => done(e));
			});
	});

	it('should remove a task', (done) => {

		var hexId = tasks[0]._id.toHexString();

		request(app)
			.delete(`/tasks/${hexId}`)
			.set('x-auth', users[1].tokens[0].token)
			.expect(404)
			.end((err, res) => {
				if (err) {
					return done(err)
				}

				Task.findById(hexId).then((task) => {
					expect(task).toExist();
					done();
				}).catch((e) => done(e));
			});
	});

	it('should return a 404 if task is not found', (done) => {
		var hexId = new ObjectID().toHexString();

		request(app)
			.delete(`/tasks/${hexId}`)
			.set('x-auth', users[1].tokens[0].token)
			.expect(404)
			.end(done);
	});

	it('should return 404 if ObjectID is invalid', (done) => {

		request(app)
			.get('/tasks/123abc') // improper format for ObjectID
			.set('x-auth', users[1].tokens[0].token)
			.expect(404)
			.end(done)
	});
});

describe('PATCH /tasks/:id', () => {

	it('should update the task', (done) => {

		var hexId = tasks[0]._id.toHexString();
		var newText = "this should be the new text";

		request(app)
			.patch(`/tasks/${hexId}`)
			.set('x-auth', users[0].tokens[0].token)
			.send({
				completed: true,
				text: newText
			})
			.expect(200)
			.expect((res) => {
				expect(res.body.task.text).toBe(newText);
				expect(res.body.task.completed).toBe(true);
				expect(res.body.task.completedAt).toBeA('number');
			})
			.end(done);

	});

	it('should not update the task created by other user', (done) => {

		var hexId = tasks[0]._id.toHexString();
		var newText = "this should be the new text";

		request(app)
			.patch(`/tasks/${hexId}`)
			.set('x-auth', users[1].tokens[0].token)
			.send({
				completed: true,
				text: newText
			})
			.expect(404)
			.end(done);

	});


	it('should clear completedAt property when task is not completed', (done) => {
		var hexId = tasks[1]._id.toHexString();
		var newText = "this should be the new text";

		request(app)
			.patch(`/tasks/${hexId}`)
			.set('x-auth', users[1].tokens[0].token)
			.send({
				completed: false,
				text: newText
			})
			.expect(200)
			.expect((res) => {
				expect(res.body.task.text).toBe(newText);
				expect(res.body.task.completed).toBe(false);
				expect(res.body.task.completedAt).toNotExist();
			})
			.end(done);
	})
});

describe('GET /users/me', () => {
	it('should return user if authentication is successful', (done) => {
		request(app)
			.get('/users/me')
			.set('x-auth', users[0].tokens[0].token) // set x-auth in the header
			.expect(200)
			.expect((res) => {
				expect(res.body._id).toBe(users[0]._id.toHexString());
				expect(res.body.email).toBe(users[0].email);
			})
			.end(done)
	});

	it('should return a 401 if authentication fails', (done) => {
	 	request(app)
			.get('/users/me')
			.expect(401)
			.expect((res) => {
				expect(res.body).toEqual({});
			})
			.end(done);
	});
});

describe('POST /users', () => {
	it('should create a user', (done) => {

		var email =  'example.email@example.com';
		var password = '123abc!';

		request(app)
			.post('/users')
			.send({email, password})
			.expect(200)
			.expect((res) => {
				expect(res.headers['x-auth']).toExist() // use bracket notation since x-auth has a dash in it
				expect(res.body._id).toExist();
				expect(res.body.email).toBe(email);
			})
			.end((err) => {
				if(err){
					return  done(err);
				}
				User.findOne({email}).then((user) => {
					expect(user).toExist();
					expect(user.password).toNotBe(password);
					done();
				}).catch((e) => done(e));
			});
	});

	it('should return validation errors if request is invalid (like an invalid/absent email or password)', (done) => {
			request(app)
			  .post('/users')
			  .send({
				  email: 'invalid_email-format',
				  password: '122'
			  })
			  .expect(400)
			  .end(done);

	});

	it('should not create user if email is already in use, even w/ a valid password', (done) => {

		request(app)
		 .post('/users')
		 .send({
			 email: users[0].email,
			 password: 'password123!'
		 })
		 .expect(400)
		 .end(done);
	});
});

describe('POST /users/login', () => {
	it('should login user and return auth token', (done) => {
		request(app)
			.post('/users/login')
			.send({
				 email: users[1].email,
	   			 password: users[1].password
			})
			.expect(200)
			.expect((res) => {
				expect(res.headers['x-auth']).toExist(); // use bracket notation since x-auth has a dash in it
			})
			.end((err, res) => {
				if(err){
					return done(err);
				}
			User.findById(users[1]._id).then((user) => {
					expect(user.tokens[1]).toInclude({
						access: 'auth',
						token: res.headers['x-auth']
					});
					done()
				}).catch((e) => done(e));
			});
	});

	it('should reject invalid login', (done) => {
		request(app)
			.post('/users/login')
			.send({
				email: users[1].email,
				password:  users[1] + 'invalidPassword'
			})
			.expect(400)
			.expect((res) => {
				expect(res.headers['x-auth']).toNotExist();
			})
			.end((err, res) => {
				if(err){
					return done(err);
				}

			User.findById(users[1]._id).then((user) => {
				expect(user.tokens.length).toBe(1);
				done();
			}).catch((e) => done(e));
		});
	});
});

describe('DELETE /users/me/token', () => {
	it('should  remove auth token when on logout', (done) => {
		request(app)
			.delete('/users/me/token')
			.set('x-auth', users[0].tokens[0].token)  // set x-auth in the header
			.expect(200)
			.end((err, res) => {
				if(err){
					return done(err);
				}

				User.findById(users[0]._id).then((user) => {
					expect(user.tokens.length).toBe(0);
					done();
				}).catch((e) => done(e));
			});
	});
});
