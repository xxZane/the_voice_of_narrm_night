import {
  AudioClassifier,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@latest";

let audioClassifier;

let audioContext = null;
let mediaStream = null;
let microphone = null;
let processor = null;
let silentGain = null;

let audioBuffer = [];

let classifyInterval = null;
let lastTriggerTime = 0;
let triggerCooldown = 1800;

let latestVolume = 0;

async function initAudioClassifier() {
  const audio = await FilesetResolver.forAudioTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@latest/wasm"
  );

  audioClassifier = await AudioClassifier.createFromModelPath(
    audio,
    "https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite"
  );

  console.log("YAMNet audio classifier loaded");
}

async function startMicrophone() {
  console.log("Start Mic clicked");

  await stopMicrophone();

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    audioContext = new AudioContext();

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    microphone = audioContext.createMediaStreamSource(mediaStream);

    processor = audioContext.createScriptProcessor(4096, 1, 1);

    silentGain = audioContext.createGain();
    silentGain.gain.value = 0;

    microphone.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioContext.destination);

    processor.onaudioprocess = function(event) {
      const input = event.inputBuffer.getChannelData(0);
      let sum = 0;

      for (let i = 0; i < input.length; i++) {
        const sample = input[i];
        audioBuffer.push(sample);
        sum += sample * sample;
      }

      latestVolume = Math.sqrt(sum / input.length);

      const maxSamples = audioContext.sampleRate * 3;

      if (audioBuffer.length > maxSamples) {
        audioBuffer = audioBuffer.slice(audioBuffer.length - maxSamples);
      }
    };

    classifyInterval = setInterval(classifyAudio, 1000);

    console.log("Microphone started");
  } catch (error) {
    console.error("Microphone error:", error);
  }
}

async function stopMicrophone() {
  console.log("Stop Mic clicked");

  if (classifyInterval) {
    clearInterval(classifyInterval);
    classifyInterval = null;
  }

  if (processor) {
    processor.disconnect();
    processor.onaudioprocess = null;
    processor = null;
  }

  if (microphone) {
    microphone.disconnect();
    microphone = null;
  }

  if (silentGain) {
    silentGain.disconnect();
    silentGain = null;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => {
      track.stop();
      console.log("Track stopped:", track.kind, track.readyState);
    });
    mediaStream = null;
  }

  if (audioContext) {
    await audioContext.close();
    audioContext = null;
  }

  audioBuffer = [];

  console.log("Microphone fully stopped");
}

function classifyAudio() {
  if (!audioClassifier || !audioContext) return;

  const sampleRate = audioContext.sampleRate;
  const requiredSamples = sampleRate;

  if (audioBuffer.length < requiredSamples) {
    console.log("Waiting for enough audio...");
    return;
  }

  const recentAudio = audioBuffer.slice(audioBuffer.length - requiredSamples);
  const audioData = new Float32Array(recentAudio);

  try {
    const results = audioClassifier.classify(audioData, sampleRate);

    if (
      !results ||
      !results[0] ||
      !results[0].classifications ||
      !results[0].classifications[0] ||
      !results[0].classifications[0].categories
    ) {
      console.log("No classification result", results);
      return;
    }

    const categories = results[0].classifications[0].categories;
    const top10 = categories.slice(0, 10);

    console.log(
      "Top10:",
      top10.map(item => item.categoryName + " " + item.score.toFixed(2))
    );

    let bestMatch = null;
    let bestLabel = null;
    let bestScore = 0;

    for (let item of top10) {
      const label = item.categoryName.toLowerCase();

      if (!window.mapLabelToSound) {
        console.error("window.mapLabelToSound is not available");
        return;
      }

      const result = window.mapLabelToSound(label);

      if (result) {
        let weightedScore = item.score;

        if (result.type === "flow") {
          weightedScore *= 0.2;
        }

        if (result.type === "burst") {
          weightedScore *= 1.5;
        }

        if (result.type === "soft") {
          weightedScore *= 2.8;
        }

        if (result.type === "attention") {
          weightedScore *= 1.8;
        }

        if (weightedScore > bestScore) {
          bestMatch = result;
          bestLabel = item.categoryName;
          bestScore = weightedScore;
        }
      }
    }

    if (!bestMatch) {
      console.log("No matched sound name in Top10");
      return;
    }

    console.log(
      "Matched:",
      bestLabel,
      "→",
      bestMatch.name,
      "/",
      bestMatch.type,
      bestScore
    );

    const now = Date.now();

    let threshold = 0.0015;

// 只对 soft 更宽松
if (bestMatch.type === "soft") {
  threshold = 0.0007;
}

if (
  bestScore > threshold &&
  latestVolume > 0.001 &&
  now - lastTriggerTime > triggerCooldown
) {
      console.log("SEND TO VISUAL:", bestMatch.type, bestMatch.name);

      if (window.setSound) {
        window.setSound(bestMatch.type, bestMatch.name);
      } else {
        console.error("window.setSound is not available");
      }

      if (window.addBulletNote) {
        window.addBulletNote(bestMatch.name);
      } else {
        console.error("window.addBulletNote is not available");
      }

      lastTriggerTime = now;
    }
  } catch (error) {
    console.error("Classification error:", error);
  }
}

window.startMicrophone = startMicrophone;
window.stopMicrophone = stopMicrophone;

initAudioClassifier();