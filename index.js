fftLoaded = false;

document.body.onload = ()=>{
  var player = document.getElementById('player');
  var processStream = document.getElementById('processStream');
  function handleSuccess(stream) {
  
    if (window.URL) {
      player.srcObject = stream;
    } else {
      player.src = stream;
    }
    listen(stream);
  };

  navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(handleSuccess);
  createGraphs();
  loadFFT(()=>{
    fftLoaded = true;
  });


};

function createGraphs() {
  Plotly.plot( 'timeGraph', [
  {
    type: 'line',
    y: [] 
  }, 
  {
    margin: { t: 0 }
  }],
  {
    yaxis: {range: [-1, 1]}
  });
  Plotly.plot( 'fftGraph', [
  {
    type: 'bar',
    y: [] 
  }, 
  {
    margin: { t: 0 }
  }],
  {
    yaxis: {
      range: [0, 0.5],
      showgrid: false,
      zeroline: false,
      showline: false,
      // autotick: true,
      ticks: "",
      showticklabels: false
    },
    xaxis: {
      autorange: true,
      showgrid: false,
      zeroline: false,
      showline: false,
      // autotick: true,
      ticks: "",
      // showticklabels: false
    },
    showlegend: false,
    paper_bgcolor:'rgba(0,0,0,0)',
    plot_bgcolor:'rgba(0,0,0,0)',

  });

}


function updateGraph(data) {
  
  if (fftLoaded) {
    let fftData = doFFT(data, 48000);
    let fftGraphData = [];
    if (fftData) {
      fftGraphData = fftData[1].map(a=>a*1000);
      Plotly.restyle( 'fftGraph', 'x', [fftData[0]]);
      Plotly.restyle( 'fftGraph', 'y', [fftData[1]]);
    }
    let max = 0;
    let maxFreq = 0;
    let maxIndex = 0;
    for (let i=0; i < fftData[0].length; i++) {
      let freq = fftData[0][i];
      let value = fftData[1][i];
      if (value > max) {
        max = value;
        maxFreq = freq;
        maxIndex = i;
      }
    }
    document.body.style.backgroundColor = getColor(maxFreq, fftData[0][fftData[0].length-1]);
  }
   
  Plotly.restyle( 'timeGraph', 'y', [data]);
  Plotly.restyle( 'timeGraph', 'x', [data.map((value, index) => index)]);
  
}

function getColor(freq, maxFreq) {
  ratio = freq / maxFreq;
  let r = Math.floor(255 * ratio);
  let g = Math.floor(255 * ratio);
  let b = Math.floor(255 * ratio);
  let a = 1;
  return `rbga(${r},${g},${b},${a})`;
}



function listen(stream) {
  var context = new AudioContext();
  var source = context.createMediaStreamSource(stream);
  var processor = context.createScriptProcessor(256, 1, 1);

  source.connect(processor);
  processor.connect(context.destination);

  processor.onaudioprocess = function(e) {
    let data = e.inputBuffer.getChannelData(0)
    updateGraph(data)
  };
}

let fftw_plan_dft_r2c_1d,
  fftw_execute,
  fftw_destroy_plan;
let fft;
let FFTW_ESTIMATE = (1 << 6);


function loadFFT(cb) {
  fft = FFTWModule().then(function () {
    fftw_plan_dft_r2c_1d = fft.cwrap(
        'fftw_plan_dft_r2c_1d', 'number', ['number', 'number', 'number', 'number']
    );
    fftw_execute = fft.cwrap(
        'fftw_execute', 'void', ['number']
    );
    fftw_destroy_plan = fft.cwrap(
        'fftw_destroy_plan', 'void', ['number']
    );
    cb()
  });
}

function doFFT (doubles, freq) {
  try {
let src_ptr = fft._malloc(doubles.length * Float64Array.BYTES_PER_ELEMENT);
    let dst_ptr = fft._malloc(2 * (doubles.length / 2 + 1) * Float64Array.BYTES_PER_ELEMENT);
    let src = new Float64Array(fft.HEAPF64.buffer, src_ptr, doubles.length);
    let dst = new Float64Array(fft.HEAPF64.buffer, dst_ptr, doubles.length * 2);
    src.set(doubles);
    let plan = fftw_plan_dft_r2c_1d(doubles.length, src_ptr, dst_ptr, FFTW_ESTIMATE);
    fftw_execute(plan);
    fftw_destroy_plan(plan);
    fftdata = new Array(2);
    fftdata[0] = new Array(doubles.length / 2 + 1);
    fftdata[1] = new Array(doubles.length / 2 + 1);
    // let T = Math.floor(doubles.length / freq);
    let T = doubles.length / freq;
    for (let i = 0; i < doubles.length + 2; i += 2) {
        let val = Math.hypot(dst[i], dst[i + 1]) / (doubles.length / 2);
        let freq = i / 2 / T;
        fftdata[0][i / 2] = freq;
        fftdata[1][i / 2] = val;
    }
    fft._free(src_ptr);
    fft._free(dst_ptr);
    return fftdata;
  } catch(e) {
    return;
  }
    
}


