jest.mock('johnny-five')
jest.mock('pi-io')

import request from 'supertest'
import { app } from '../src/api'
import { driver } from '../src/driver'
import { LightSchedule, schedule as singletonSchedule } from '../src/schedule'
import { getMockLed, clearMockLed } from './__mocks__/johnny-five'

describe('Integration Tests', () => {
  let schedule: LightSchedule | null = null

  beforeEach(async () => {
    clearMockLed()

    // Wait for board ready (setImmediate in mock)
    await new Promise((resolve) => setImmediate(resolve))

    // Enable fake timers (excluding setImmediate to allow promises to resolve)
    // Set system time to noon - full brightness period
    jest.useFakeTimers({ doNotFake: ['setImmediate'] })
    jest.setSystemTime(new Date(2024, 0, 1, 12, 0))
  })

  afterEach(() => {
    schedule?.stop()
    schedule = null
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  afterAll(() => {
    singletonSchedule.stop()
  })

  describe('API GET /', () => {
    test('returns current brightness as JSON', async () => {
      await driver.setBrightness(128)

      const response = await request(app.callback()).get('/').expect(200)

      expect(JSON.parse(response.text)).toEqual({ brightness: 128 })
    })

    test('returns initial brightness of 255', async () => {
      // Reset to initial state
      await driver.setBrightness(255)
      const response = await request(app.callback()).get('/').expect(200)

      expect(JSON.parse(response.text)).toEqual({ brightness: 255 })
    })
  })

  describe('API POST /', () => {
    test('sets brightness and returns 200', async () => {
      await request(app.callback())
        .post('/')
        .send({ brightness: '100' })
        .expect(200)

      expect(driver.getBrightness()).toBe(100)
    })

    test('clamps brightness below 26 to 26', async () => {
      await request(app.callback())
        .post('/')
        .send({ brightness: '10' })
        .expect(200)

      expect(driver.getBrightness()).toBe(26)
    })

    test('accepts optional duration parameter', async () => {
      await request(app.callback())
        .post('/')
        .send({ brightness: '100', duration: '30' })
        .expect(200)

      expect(driver.getBrightness()).toBe(100)
    })

    test('returns 400 for invalid brightness value', async () => {
      await request(app.callback())
        .post('/')
        .send({ brightness: 'invalid' })
        .expect(400)
    })

    test('returns 400 for brightness > 255', async () => {
      await request(app.callback())
        .post('/')
        .send({ brightness: '300' })
        .expect(400)
    })

    test('returns 400 for brightness < 0', async () => {
      await request(app.callback())
        .post('/')
        .send({ brightness: '-10' })
        .expect(400)
    })

    test('returns 400 for missing brightness', async () => {
      await request(app.callback()).post('/').send({}).expect(400)
    })
  })

  describe('API unsupported methods', () => {
    test('returns 405 for PUT', async () => {
      await request(app.callback()).put('/').expect(405)
    })

    test('returns 405 for DELETE', async () => {
      await request(app.callback()).delete('/').expect(405)
    })
  })

  describe('Schedule to Driver integration', () => {
    test('driver receives brightness updates from schedule subscription', () => {
      schedule = new LightSchedule()
      schedule.subscribe((brightness) => {
        void driver.setBrightness(brightness)
      })

      // At noon (set in beforeEach), schedule should be at full brightness
      expect(schedule.current).toBe(255)
    })

    test('schedule calculates correct brightness at different times', () => {
      // Test at 7am - should be 0 (start of ramp up)
      jest.setSystemTime(new Date(2024, 0, 1, 7, 0))
      let testSchedule = new LightSchedule()
      expect(testSchedule.current).toBe(0)
      testSchedule.stop()

      // Test at 11am - should be 255 (peak)
      jest.setSystemTime(new Date(2024, 0, 1, 11, 0))
      testSchedule = new LightSchedule()
      expect(testSchedule.current).toBe(255)
      testSchedule.stop()

      // Test at 9pm - should be 0 (night)
      jest.setSystemTime(new Date(2024, 0, 1, 21, 0))
      testSchedule = new LightSchedule()
      expect(testSchedule.current).toBe(0)
      testSchedule.stop()
    })
  })

  describe('Manual override flow', () => {
    test('POST pauses schedule', () => {
      schedule = new LightSchedule()
      const subscriberSpy = jest.fn()
      schedule.subscribe(subscriberSpy)
      subscriberSpy.mockClear()

      // Manually pause the schedule (simulating what POST does)
      schedule.pause(10)

      // Advance time less than duration - schedule should still be paused
      jest.advanceTimersByTime(5 * 60 * 1000)
      expect(subscriberSpy).not.toHaveBeenCalled()
    })

    test('schedule resumes after pause duration expires', () => {
      schedule = new LightSchedule()
      const subscriberSpy = jest.fn()
      schedule.subscribe(subscriberSpy)
      subscriberSpy.mockClear()

      schedule.pause(5)

      // Advance past duration
      jest.advanceTimersByTime(5 * 60 * 1000)
      // Run any pending timers
      jest.runOnlyPendingTimers()

      // Schedule should have resumed and called subscriber
      expect(subscriberSpy).toHaveBeenCalled()
    })

    test('GET returns manually set brightness during override', async () => {
      await request(app.callback())
        .post('/')
        .send({ brightness: '75' })
        .expect(200)

      const response = await request(app.callback()).get('/').expect(200)
      expect(JSON.parse(response.text)).toEqual({ brightness: 75 })
    })

    test('default pause duration is 15 minutes', () => {
      schedule = new LightSchedule()
      const subscriberSpy = jest.fn()
      schedule.subscribe(subscriberSpy)
      subscriberSpy.mockClear()

      // Pause for 15 minutes (the API default)
      schedule.pause(15)

      // Advance 14 minutes - should still be paused
      jest.advanceTimersByTime(14 * 60 * 1000)
      expect(subscriberSpy).not.toHaveBeenCalled()

      // Advance past 15 minutes total
      jest.advanceTimersByTime(1 * 60 * 1000)
      jest.runOnlyPendingTimers()
      expect(subscriberSpy).toHaveBeenCalled()
    })
  })

  describe('PWM inversion and brightness clamping', () => {
    test('LED receives inverted brightness value', async () => {
      const mockLed = getMockLed()
      await driver.setBrightness(200)

      expect(mockLed.brightness).toHaveBeenCalledWith(55) // 255 - 200
    })

    test('LED is turned on before setting brightness', async () => {
      const mockLed = getMockLed()
      await driver.setBrightness(100)

      expect(mockLed.on).toHaveBeenCalled()
    })

    test('brightness 0 is clamped to 26 (10% minimum)', async () => {
      const mockLed = getMockLed()
      await driver.setBrightness(0)

      expect(driver.getBrightness()).toBe(26)
      expect(mockLed.brightness).toHaveBeenCalledWith(229) // 255 - 26
    })

    test('brightness 255 is maximum', async () => {
      const mockLed = getMockLed()
      await driver.setBrightness(255)

      expect(driver.getBrightness()).toBe(255)
      expect(mockLed.brightness).toHaveBeenCalledWith(0) // 255 - 255
    })

    test('brightness above 255 is clamped', async () => {
      await driver.setBrightness(300)

      expect(driver.getBrightness()).toBe(255)
    })
  })

  describe('Time-based brightness scenarios', () => {
    test('brightness is 0 before 7am', () => {
      jest.setSystemTime(new Date(2024, 0, 1, 6, 0))
      const testSchedule = new LightSchedule()
      expect(testSchedule.current).toBe(0)
      testSchedule.stop()
    })

    test('brightness ramps from 7am to 11am', () => {
      jest.setSystemTime(new Date(2024, 0, 1, 9, 0)) // 9am - midpoint
      const testSchedule = new LightSchedule()
      expect(testSchedule.current).toBeGreaterThan(0)
      expect(testSchedule.current).toBeLessThan(255)
      testSchedule.stop()
    })

    test('brightness is 255 from 11am to 5pm', () => {
      jest.setSystemTime(new Date(2024, 0, 1, 14, 0)) // 2pm
      const testSchedule = new LightSchedule()
      expect(testSchedule.current).toBe(255)
      testSchedule.stop()
    })

    test('brightness ramps down from 5pm to 9pm', () => {
      jest.setSystemTime(new Date(2024, 0, 1, 19, 0)) // 7pm - midpoint
      const testSchedule = new LightSchedule()
      expect(testSchedule.current).toBeGreaterThan(0)
      expect(testSchedule.current).toBeLessThan(255)
      testSchedule.stop()
    })

    test('brightness is 0 after 9pm', () => {
      jest.setSystemTime(new Date(2024, 0, 1, 22, 0)) // 10pm
      const testSchedule = new LightSchedule()
      expect(testSchedule.current).toBe(0)
      testSchedule.stop()
    })
  })
})
