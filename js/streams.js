const stream = ( () => {
  const btnOne       = document.getElementById('streamsBtnOne'),
        outputOne    = document.getElementById('streamsOutOne'),
        btnTwoStart  = document.getElementById('streamsBtnTwoStart'),
        btnTwoEnd    = document.getElementById('streamsBtnTwoEnd'),
        outputTwo    = document.getElementById('streamsOutTwo'),
        weightSlider = document.getElementById('weightSlider'),
        heightSlider = document.getElementById('heightSlider'),
        weightOutput = document.getElementById('weightOutput'),
        heightOutput = document.getElementById('heightOutput'),
        bmiOutput    = document.getElementById('bmiOutput');

  // TODO: refactor to a Observable
  function isPrime(number){
    if (number === 1 || number === 0){
      return false;
    }
    if (number === 2 || number === 3){
      return true;
    }
    const limit = Math.ceil(Math.sqrt(number));
    for(let i = 2; i <= limit; i++){
      if(number % i === 0){
        return false;
      }
    }
    return true;
  }

  function streamValuesSync(){
    return Rx.Observable.range(0, Number.MAX_VALUE)
      .do( x => console.log(x))
      .take(10)
      .filter( x => isPrime(x))
      .reduce( (acc, val) => {
        acc.vals.push(val);
        acc.sum += val;
        return acc;
      }, {vals: [], sum: 0});
  }

  function streamValuesAsync(){
    return Rx.Observable.range(0, Number.MAX_VALUE, Rx.Scheduler.async)
      .filter( x => isPrime(x))
      .scan( (acc, val) => {
        acc.val = val;
        acc.sum += val;
  	    return acc;
      }, {val: 0, sum: 0})
      .throttle(ev => Rx.Observable.interval(1000))
  }

  function streamMain(){
    return {
      sync: Rx.Observable.fromEvent(btnOne, 'click')
              .map( () => outputOne.innerHTML = '')
              .flatMap(streamValuesSync),
      async: Rx.Observable.fromEvent(btnTwoStart, 'click')
                    .map( () => outputTwo.innerHTML = '')
                    .flatMap(streamValuesAsync)
                    .takeUntil(Rx.Observable.fromEvent(btnTwoEnd, 'click'))
    }
  }

  function bmiSink(){
    const height$ = Rx.Observable.fromEvent(heightSlider, 'input')
                   .map(ev => ev.target.value),
          weight$ = Rx.Observable.fromEvent(weightSlider, 'input')
                   .map(ev => ev.target.value);
    return Rx.Observable.combineLatest(
             weight$.startWith(70),
             height$.startWith(170),
             (weight, height) => {
               const heightMeters = height * 0.01;
               const bmi = Math.round(weight / (heightMeters * heightMeters));
               return {weight, height, bmi};
             }
           );
  }

  function bmiEffect(bmiSink$){
    return bmiSink$.subscribe(
      (state) => {
        weightOutput.innerHTML = `${state.weight} kg`;
        heightOutput.innerHTML = `${state.height} cm`;
        bmiOutput.innerHTML = `BMI: ${state.bmi}`;
      },
      e => console.log(e)
    )
  }

  function streamDOMEffects(){
    return {
      sync: (sumPrimesSync$) => {
        return sumPrimesSync$
        .subscribe(
          x => {
            x.vals.map( (e,i,a) => {
              if(a.indexOf(e) !== a.length - 1){
                outputOne.innerHTML += `${e} + `
              } else {
                outputOne.innerHTML += `${e} = ${x.sum}`
              }
            })
          },
          e => outputOne.innerHTML = `${e}`,
          () => console.log('Sum Primes synchronously completed')
        )
      },
      async: (sumPrimesAsync$) => {
        return sumPrimesAsync$.subscribe(
          x => outputTwo.innerHTML = `sum of primes for x <= ${x.val} = ${x.sum}`,
          e => outputTwo.innerHTML = `${e}`,
          () => console.log('Sum Primes async completed')
        )
      },
    }
  }

  function streamRun(main, effects){
    const sinks     = main(),
          drivers   = effects();

    Object.keys(drivers).forEach( key => {
      drivers[key](sinks[key]);
    });

  }

  function main(){
    streamRun(streamMain, streamDOMEffects);
    bmiEffect(bmiSink());
  }

  return {
    main
  }
})();
stream.main();
