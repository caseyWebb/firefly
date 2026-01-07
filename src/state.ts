import { Subscribable } from './subscribable'

class State extends Subscribable {
  public current = 0
}

export const state = new State()
