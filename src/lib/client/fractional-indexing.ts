const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function midpoint(a: string, b: string): string {
  let mid = '';
  let i = 0;
  
  while (true) {
    const charA = i < a.length ? a[i] : CHARSET[0];
    const charB = i < b.length ? b[i] : CHARSET[CHARSET.length - 1];
    
    const indexA = CHARSET.indexOf(charA);
    let indexB = CHARSET.indexOf(charB);
    
    if (i >= b.length && indexB === -1) indexB = CHARSET.length - 1; // Default to end of charset if b is exhausted

    if (indexB - indexA > 1) {
      const midIndex = Math.floor((indexA + indexB) / 2);
      mid += CHARSET[midIndex];
      return mid;
    } else {
      mid += charA;
      i++;
      if (i >= a.length && i >= b.length) {
        mid += CHARSET[Math.floor(CHARSET.length / 2)];
        return mid;
      }
    }
  }
}

export function generateFractionalIndex(prev: string | null, next: string | null, clientId: string): string {
  let index = '';
  if (!prev && !next) {
    index = CHARSET[Math.floor(CHARSET.length / 2)];
  } else if (!prev) {
    // Insert at beginning
    index = midpoint(CHARSET[0], next!.split('-')[0]);
  } else if (!next) {
    // Insert at end
    index = midpoint(prev.split('-')[0], CHARSET[CHARSET.length - 1]);
  } else {
    // Insert between
    index = midpoint(prev.split('-')[0], next!.split('-')[0]);
  }
  
  // Append clientId to ensure uniqueness if two clients generate the same index concurrently
  return `${index}-${clientId}`;
}
