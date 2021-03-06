/*@ forloop :: forall A. (int, int, (int, A) => A, A) => A */
function forloop(lo, hi, body, acc){
  if (lo < hi) {
    var newAcc = body(lo, acc);
    return forloop(lo + 1, hi, body, newAcc);
  }
  return acc;
}

/*@ minIndex :: ({a:list [int] | 0 < (len a)}) => {v:int | (0 <= v && v < (len a))} */ 
function minIndex(a){

  /*@ step :: (int, int) => int */
  function step(i, min){
    var a = 12;
    if (nth(a, i) < nth(a, min)) { 
      return i;
    } 
    return min; 
  };
  return forloop(0, length(a), step, 0);
}
