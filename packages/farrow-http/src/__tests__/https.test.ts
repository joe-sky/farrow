import request from 'supertest'

import fs from 'fs'
import path from 'path'

import { Https, HttpsPipelineOptions, Router, Response, useReq, useRes } from '../'

const CERT = fs.readFileSync(path.join(__dirname, './keys/https-cert.pem'))
const KEY = fs.readFileSync(path.join(__dirname, './keys/https-key.pem'))
const CA = fs.readFileSync(path.join(__dirname, 'keys/https-csr.pem'))

const createHttps = (options?: HttpsPipelineOptions) => {
  return Https({
    logger: false,
    tsl: {
      cert: CERT,
      ca: CA,
      key: KEY,
      rejectUnauthorized: false,
      agent: false,
    },
    ...options,
  })
}

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

describe('Https', () => {
  it('Response', async () => {
    let https = createHttps()

    https
      .match({
        pathname: '/test',
      })
      .use((data) => {
        return Response.text(JSON.stringify(data))
      })

    await request(https.server())
      .get('/test')
      .expect('Content-Type', /text/)
      .expect(
        'Content-Length',
        JSON.stringify({
          pathname: '/test',
        }).length.toString(),
      )
      .expect(
        200,
        JSON.stringify({
          pathname: '/test',
        }),
      )
  })

  it('Request', async () => {
    let https = createHttps()

    https.use(() => {
      let req = useReq()
      let res = useRes()

      res.statusCode = 200
      res.end(req.url)

      return Response.custom()
    })

    await request(https.server()).get('/test-abc').expect(200, '/test-abc')
  })

  it('Router', async () => {
    let https = createHttps()
    let router = Router()
    let server = https.server()

    router
      .match({
        pathname: '/abc',
      })
      .use((request) => {
        return Response.text(request.pathname)
      })

    https.use(router)
    https.route('/base').use(router)

    await request(server).get('/abc').expect(200, '/abc')
    await request(server).get('/base/abc').expect(200, '/abc')
  })
})
