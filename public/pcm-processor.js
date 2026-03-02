// Audio worklet processor: converts Float32 samples to Int16 PCM
// and posts the raw ArrayBuffer back to the main thread along with
// the frame's RMS energy level for silence detection.
class PcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const float32 = input[0];
    const int16 = new Int16Array(float32.length);
    let sumSquares = 0;
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      sumSquares += s * s;
    }

    const rms = Math.sqrt(sumSquares / float32.length);

    // Post an object with the PCM buffer and the RMS energy.
    // The main thread uses rms to detect silence.
    this.port.postMessage({ pcm: int16.buffer, rms }, [int16.buffer]);
    return true;
  }
}

registerProcessor('pcm-processor', PcmProcessor);
