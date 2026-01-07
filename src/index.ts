import { startAPIServer } from './api'
import { driver } from './driver'
import { log } from './logger'
import { schedule } from './schedule'

log('Starting agent...')

let forceQuit = false
const quit = (): void => {
  if (forceQuit) {
    process.exit()
  } else {
    forceQuit = true
  }
  log('Exiting... (Press ctrl+c again to force exit)')
  driver.setBrightness(100).catch((err: unknown) => {
    log('Error setting brightness on exit:', err)
  })
  process.off('SIGINT', quit)
}
process.on('SIGINT', quit)

startAPIServer()

driver.setBrightness(schedule.current).catch((err: unknown) => {
  log('Error setting initial brightness:', err)
})

schedule.subscribe((v) => {
  driver.setBrightness(v).catch((err: unknown) => {
    log('Error setting brightness:', err)
  })
})
