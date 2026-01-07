export const mockLed = {
  on: jest.fn(),
  off: jest.fn(),
  brightness: jest.fn(),
}

export const getMockLed = () => mockLed

export const clearMockLed = () => {
  mockLed.on.mockClear()
  mockLed.off.mockClear()
  mockLed.brightness.mockClear()
}

export const Board = jest.fn().mockImplementation(() => ({
  on: jest.fn((event: string, callback: () => void) => {
    if (event === 'ready') {
      setImmediate(callback)
    }
  }),
}))

export const Led = jest.fn().mockImplementation(() => mockLed)
