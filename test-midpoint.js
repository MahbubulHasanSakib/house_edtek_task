const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function midpoint(a, b) {
  let mid = '';
  let i = 0;
  
  while (true) {
    const charA = i < a.length ? a[i] : CHARSET[0];
    const charB = i < b.length ? b[i] : CHARSET[CHARSET.length - 1];
    
    const indexA = CHARSET.indexOf(charA);
    let indexB = CHARSET.indexOf(charB);
    
    if (i >= b.length && indexB === -1) indexB = CHARSET.length - 1;

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

console.log("midpoint('zzzkV', 'zzzr') =", midpoint('zzzkV', 'zzzr'));
console.log("midpoint('zzzk', 'zzzkV') =", midpoint('zzzk', 'zzzkV'));
