import Koa from 'koa'
import koaBody from 'koa-body'

import { driver } from './driver'
import { log } from './logger'
import { schedule } from './schedule'

interface BrightnessRequest {
  brightness: string
  duration?: string
}

export const app = new Koa()

app.use(koaBody())

app.use(async (ctx) => {
  switch (ctx.method.toUpperCase()) {
    case 'GET':
      ctx.status = 200
      ctx.body = JSON.stringify({
        brightness: driver.getBrightness(),
      })
      break
    case 'POST':
      {
        try {
          const body = ctx.request.body as BrightnessRequest | undefined
          const value = parseInt(body?.brightness ?? '')
          if (isNaN(value) || value < 0 || value > 255) {
            throw new Error()
          } else {
            let duration = parseInt(body?.duration ?? '')
            if (isNaN(duration)) duration = 15
            ctx.status = 200
            await driver.setBrightness(value)
            schedule.pause(duration)
          }
        } catch {
          ctx.status = 400
          ctx.message = `Invalid request body. Expected object { "brightness": 0-255, "duration": 15 }, received ${JSON.stringify(
            ctx.request.body,
          )}`
        }
      }
      break
    default:
      ctx.status = 405
  }
})

export function startAPIServer(): void {
  app.listen(8080, '0.0.0.0')
  log('API Server started on 0.0.0.0:8080')
}
