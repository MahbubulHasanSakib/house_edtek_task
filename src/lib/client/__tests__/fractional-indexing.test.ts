import { describe, it, expect } from 'vitest';
import { generateFractionalIndex } from '../fractional-indexing';

describe('fractional-indexing', () => {
  const clientId = 'client-1';

  it('generates middle index when no prev or next provided', () => {
    const index = generateFractionalIndex(null, null, clientId);
    expect(index).toMatch(/^[a-zA-Z0-9]+-client-1$/);
  });

  it('generates an index between two given indexes', () => {
    const a = 'A-client-1';
    const c = 'C-client-1';
    const b = generateFractionalIndex(a, c, clientId);
    
    // b's index portion should be lexicographically between A and C
    const indexB = b.split('-')[0];
    expect(indexB > 'A').toBe(true);
    expect(indexB < 'C').toBe(true);
  });

  it('generates an index at the beginning', () => {
    const b = 'B-client-1';
    const a = generateFractionalIndex(null, b, clientId);
    
    const indexA = a.split('-')[0];
    const indexB = b.split('-')[0];
    expect(indexA < indexB).toBe(true);
  });

  it('generates an index at the end', () => {
    const y = 'Y-client-1';
    const z = generateFractionalIndex(y, null, clientId);
    
    const indexY = y.split('-')[0];
    const indexZ = z.split('-')[0];
    expect(indexZ > indexY).toBe(true);
  });
  
  it('handles tight spaces by increasing string length', () => {
    const a = 'A-client-1';
    const b = 'B-client-1';
    const mid = generateFractionalIndex(a, b, clientId);
    
    const indexMid = mid.split('-')[0];
    expect(indexMid > 'A').toBe(true);
    expect(indexMid < 'B').toBe(true);
    // Should be longer than 1 character since A and B are adjacent
    expect(indexMid.length).toBeGreaterThan(1);
  });
});
