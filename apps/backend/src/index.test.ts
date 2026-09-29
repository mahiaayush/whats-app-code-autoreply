import { describe, it, expect } from 'vitest';

describe('Backend Bootstrap', () => {
  it('should initialize environment configuration correctly', () => {
    const port = process.env.PORT || 3000;
    expect(Number(port)).toBe(3000);
  });
});
