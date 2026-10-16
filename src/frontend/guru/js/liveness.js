"use strict";

class LivenessDetector {
  constructor(videoElement, options = {}) {
    this.video = videoElement;
    this.onStatus = options.onStatus || (() => {});
    this.cancelCurrent = null;
  }

  verify(options = {}) {
    if (typeof faceapi === "undefined" || !this.video || this.video.readyState < 2) {
      return Promise.reject(new Error("Kamera atau model liveness belum siap."));
    }
    this.cancel();

    const timeoutMs = options.timeoutMs || 15000;
    const onDotUpdate = options.onDotUpdate || (() => {});
    const deadline = Date.now() + timeoutMs;
    const calibrations = [];
    let baseline = null;
    let consecutiveSmiles = 0;
    let frameId = null;
    let timerId = null;
    let settled = false;

    return new Promise((resolve, reject) => {
      const finish = (result, error = null) => {
        if (settled) return;
        settled = true;
        if (frameId !== null) cancelAnimationFrame(frameId);
        if (timerId !== null) clearTimeout(timerId);
        this.cancelCurrent = null;
        if (error) reject(error);
        else resolve(result);
      };

      this.cancelCurrent = () => {
        this.onStatus("Verifikasi dibatalkan.");
        onDotUpdate("slate");
        finish(false);
      };

      this.onStatus("Lihat kamera dan tersenyum untuk verifikasi.");
      onDotUpdate("amber");

      const tick = async () => {
        if (settled) return;
        if (Date.now() >= deadline) {
          this.onStatus("Waktu verifikasi habis. Coba lagi.");
          onDotUpdate("rose");
          finish(false);
          return;
        }
        try {
          const detection = await faceapi
            .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions({
              inputSize: 320,
              scoreThreshold: 0.55,
            }))
            .withFaceLandmarks();
          if (!detection) {
            consecutiveSmiles = 0;
            this.onStatus("Arahkan wajah ke kamera.");
            onDotUpdate("slate");
          } else {
            const mouth = detection.landmarks.getMouth();
            const left = mouth[0];
            const right = mouth[6];
            const upperLip = mouth[3];
            const lowerLip = mouth[9];
            const face = detection.detection.box;
            const faceWidth = face.width || 1;
            const widthRatio = Math.hypot(right.x - left.x, right.y - left.y) / faceWidth;
            const openRatio = Math.hypot(lowerLip.x - upperLip.x, lowerLip.y - upperLip.y) / faceWidth;
            const smileMeasure = widthRatio + openRatio * 0.3;

            if (baseline === null) {
              calibrations.push(smileMeasure);
              if (calibrations.length >= 8) {
                baseline = calibrations.reduce((sum, value) => sum + value, 0) / calibrations.length;
              }
              this.onStatus("Menyiapkan verifikasi. Arahkan wajah lurus ke kamera.");
            } else if (smileMeasure - baseline >= 0.025) {
              consecutiveSmiles++;
              this.onStatus("Senyum terdeteksi. Pertahankan sebentar.");
              onDotUpdate("amber");
              if (consecutiveSmiles >= 4) {
                this.onStatus("Gerakan wajah terdeteksi.");
                onDotUpdate("emerald");
                finish(true);
                return;
              }
            } else {
              consecutiveSmiles = 0;
              this.onStatus("Tersenyum untuk verifikasi.");
            }
          }
        } catch (error) {
          finish(false, new Error("Model liveness gagal dijalankan. Muat ulang halaman dan coba lagi."));
          return;
        }
        timerId = setTimeout(() => {
          frameId = requestAnimationFrame(tick);
        }, 120);
      };

      frameId = requestAnimationFrame(tick);
    });
  }

  cancel() {
    if (this.cancelCurrent) this.cancelCurrent();
  }
}
