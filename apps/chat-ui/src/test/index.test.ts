import { expect, it } from 'vitest'

function sum(a: number, b: number) {
  return a + b
}

it('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3)
})
