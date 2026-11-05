import { expect, it } from 'vitest';
import { definitionFor } from './eligibility.ts';
import { rules } from './fixtures.ts';

it('I-exclusions: definition follows the state in rules', () => {
  expect(definitionFor(rules.definitions.A.orderState, rules)).toBe('A');
  expect(definitionFor(rules.definitions.B.orderState, rules)).toBe('B');
  expect(definitionFor('doručeno', rules)).toBeNull();
});
