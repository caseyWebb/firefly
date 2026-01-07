import { LightSchedule, schedule as singletonSchedule } from '../src/schedule'

let scheduleInstance: LightSchedule | null = null

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  scheduleInstance?.stop()
  scheduleInstance = null
  jest.clearAllTimers()
  jest.useRealTimers()
})

afterAll(() => {
  singletonSchedule.stop()
})

testTime(7, 0, 0)
testTime(7, 1, 1)
testTime(10, 59, 254)
testTime(11, 0, 255)
testTime(12, 0, 255)
testTime(17, 0, 255)
testTime(17, 1, 254)
testTime(20, 59, 1)
testTime(21, 0, 0)

test('updates automatically', () => {
  jest.setSystemTime(new Date(1, 1, 1, 7, 0))
  scheduleInstance = new LightSchedule()

  expect(scheduleInstance.current).toBe(0)

  jest.setSystemTime(new Date(1, 1, 1, 7, 3))
  jest.advanceTimersToNextTimer()

  expect(scheduleInstance.current).toBeGreaterThan(0)
})

test('calls subscribers on update', (done) => {
  jest.setSystemTime(new Date(1, 1, 1, 7, 0))
  scheduleInstance = new LightSchedule()

  expect(scheduleInstance.current).toBe(0)

  scheduleInstance.subscribe((v) => {
    expect(v).toBeGreaterThan(0)
    done()
  })

  jest.setSystemTime(new Date(1, 1, 1, 7, 3))
  jest.advanceTimersToNextTimer()
})

function testTime(hour: number, minute: number, expected: number): void {
  test(`is ${String(expected)} @ ${String(hour)}:${minute.toString().padStart(2, '0')}`, () => {
    jest.setSystemTime(new Date(1, 1, 1, hour, minute))
    scheduleInstance = new LightSchedule()
    expect(scheduleInstance.current).toBe(expected)
  })
}
