//  run test suite via npm run test-watch (refer to package.json)

const expect = require('expect');
const request = require('supertest');

const {
	ObjectID
} = require('mongodb');
const {
	app
} = require('./../server');
const {
	Task
} = require('./../models/task');

// populate db w/ test data
const tasks = [{
	_id: new ObjectID(),
	text: '1st test task'
}, {
	_id: new ObjectID(),
	text: '2nd test task',
	completed: true,
	completedAt: 333

}];

// run beforeEach before EVERY test to empty db and seed it before every supertest request
beforeEach((done) => {
	Task.remove({}).then(() => {
		return Task.insertMany(tasks);
	}).then(() => done()); // use a callback to call done() via expression based syntax
});

describe('POST /tasks', () => {
	it('should create a new task', (done) => {
		var text = 'Test text property of a task';

		request(app)
			.post('/tasks')
			.send({
				text
			})
			.expect(200)
			.expect((res) => {
				expect(res.body.text).toBe(text);
			})
			.end((err, res) => {
				if (err) {
					return done(err);
				}

				Task.find({
					text
				}).then((tasks) => {
					expect(tasks.length).toBe(1);
					expect(tasks[0].text).toBe(text); // new task created and prepended
					done();
				}).catch((e) => done(e)); // arrow function passes error to done() using the statement syntaxt NOT the arrow function expression syntax
			});
	});

	it('should not create task with invalid body data', (done) => {
		request(app)
			.post('/tasks')
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
			.expect(200)
			.expect((res) => {
				expect(res.body.tasks.length).toBe(2);
			})
			.end(done);
	});
});

describe('GET /tasks/:id', () => {
	it('should return task document', (done) => {
		request(app)
			.get(`/tasks/${tasks[0]._id.toHexString()}`) // convert ObjectID to a string via .toHexString()
			.expect(200)
			.expect((res) => {
				expect(res.body.task.text).toBe(tasks[0].text);
			})
			.end(done);
	});

	it('should return a 404 if task not found', (done) => {
		var hexId = new ObjectID().toHexString();

		request(app)
			.get(`/tasks/${hexId}`)
			.expect(404)
			.end(done);
	})


	it('should return 404 for invalid ObjectID', (done) => {
		request(app)
			.get('/tasks/123abc') // improper format for ObjectID
			.expect(404)
			.end(done)
	});


});

describe('DELETE /tasks/:id', () => {
	it('should remove a task', (done) => {

		var hexId = tasks[1]._id.toHexString();

		request(app)
			.delete(`/tasks/${hexId}`)
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

	it('should return a 404 if task is not found', (done) => {
		var hexId = new ObjectID().toHexString();

		request(app)
			.delete(`/tasks/${hexId}`)
			.expect(404)
			.end(done);
	});

	it('should return 404 if ObjectID is invalid', (done) => {

		request(app)
			.get('/tasks/123abc') // improper format for ObjectID
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


	it('should clear completedAt when task is not completed', (done) => {
		var hexId = tasks[1]._id.toHexString();
		var newText = "this should be the new text";

		request(app)
			.patch(`/tasks/${hexId}`)
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
