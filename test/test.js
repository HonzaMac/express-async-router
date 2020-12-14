const assert = require('assert')
const request = require('supertest')
const express = require("express")
const asyncRouter = require("./../index")
describe('Async Express Router', function () {
    describe("for non error middlewares", () => {
        it('should support simply chained middlewares', function (done) {
            const app = express()
            const router = express.Router()

            function handler1(req, res, next) {
                res.setHeader('x-user-id', String(req.params.id))
                next()
            }

            function lastHandler(req, res) {
                res.send(req.params.id)
            }

            const subrouter = asyncRouter.create()
            subrouter.use(function (req, res, next) {
                res.setHeader('x-router', String(req.params.id))
                next()
            })

            router.get('/user/:id', handler1, subrouter, lastHandler)
            app.use(router)

            request(app)
                .get('/user/1')
                .expect('x-router', 'undefined')
                .expect('x-user-id', '1')
                .expect(200, '1', done)
        })

        it('should support arrays in the middlewares', function (done) {
            const app = express()
            const router = asyncRouter.create()

            function handler1(req, res, next) {
                res.setHeader('x-user-id', String(req.params.id))
                next()
            }

            function lastHandler(req, res) {
                res.send(req.params.id)
            }

            const subrouter = asyncRouter.create()
            subrouter.use(function (req, res, next) {
                res.setHeader('x-router', String(req.params.id))
                next()
            })

            router.get('/user/:id', [handler1, subrouter], lastHandler)
            app.use(router)

            request(app)
                .get('/user/3')
                .expect('x-router', 'undefined')
                .expect('x-user-id', '3')
                .expect(200, '3', done)
        })

        it('should support multiple arrays in the middlewares', function (done) {
            const app = express()
            const router = asyncRouter.create()
            const visit = []

            function handler1(req, res, next) {
                visit.push(1)
                next()
            }

            function lastHandler(req, res) {
                visit.push('last')
                res.send(visit.join(','))
            }

            const subrouter = asyncRouter.create()
            subrouter.use(function (req, res, next) {
                visit.push(2)
                next()
            })

            router.get('/user/:id', handler1, [handler1, [handler1, [handler1, subrouter]], handler1], lastHandler)
            app.use(router)

            request(app)
                .get('/user/3')
                .expect(200, '1,1,1,1,2,1,last', done)
        })

        it('should support .all match', function (done) {
            const app = express()
            const router = asyncRouter.create()
            const visit = []

            function handler1(req, res, next) {
                visit.push(1)
                next()
            }

            function lastHandler(req, res) {
                visit.push('last')
                res.send(visit.join(','))
            }

            const subrouter = asyncRouter.create()
            subrouter.use(function (req, res, next) {
                visit.push(2)
                next()
            })

            router.use([handler1, [handler1, [handler1, [handler1, subrouter]], handler1], lastHandler])
            app.use(router)

            request(app)
                .post('/anything')
                .expect(200, '1,1,1,1,2,1,last', done)
        })

    })

    describe("for routes with promises", () => {
        it("should handle next() from promises", (done) => {
            const app = express()
            const router = asyncRouter.create()
            const visit = []

            function handler1(input) {
                return Promise.resolve(input + "2")
                    .then((a) => Promise.resolve(a + "3"))
            }

            function lastHandler(req, res, next) {
                visit.push('last')
                res.send(visit.join(','))
                next()
            }

            router.get('/user/:id', (req, res, next) => {
                handler1("1").then((input) => {
                    visit.push(input)
                    next()
                })
            }, lastHandler)
            app.use(router)

            request(app)
                .get('/user/1')
                .expect(200, '123,last')
                .expect(() => assert.strictEqual(visit.join(','), "123,last"))
                .end(done)

        })
    })
    describe("for error middlewares", () => {
        it("should propagate to last error handler", (done) => {
            const app = express()
            const router = express.Router()
            const visit = []

            function handler1(_req, _res) {
                visit.push(1)
                throw new Error("I got param")
            }

            function errorHandler(err, req, res, next) {
                visit.push(3)
                res.status(500).end("1")
                next()
            }

            const subrouter = asyncRouter.create()
            subrouter.use(function (req, res, next) {
                visit.push(2)
                next()
            })

            router.get('/route-with-error', handler1, subrouter)
            app.use(router)
            app.use(errorHandler)

            request(app)
                .get('/route-with-error')
                .expect(500, done)
                .expect(() => {
                    assert.equal(visit.join(","), "1,3")
                })

        })
    })

})


