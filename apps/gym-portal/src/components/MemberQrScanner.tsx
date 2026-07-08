import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

interface MemberQrScannerProps {
  onScan: (payload: string) => Promise<void>;
}

/**
 * Webcam-based QR scanner for the front desk: staff hold a member's phone up
 * to this camera to check them in, as an alternative to the member scanning
 * the door poster themselves. Decodes frames client-side with jsQR; the
 * server independently verifies the payload before recording attendance.
 */
export function MemberQrScanner({ onScan }: MemberQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const stop = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  };

  useEffect(() => () => stop(), []);

  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      frameRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      frameRef.current = requestAnimationFrame(tick);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(image.data, image.width, image.height);

    if (code && !busyRef.current) {
      busyRef.current = true;
      setError(null);
      setNotice(null);
      onScan(code.data)
        .then(() => setNotice("Checked in."))
        .catch((cause) => setError(cause instanceof Error ? cause.message : "Check-in failed."))
        .finally(() => {
          busyRef.current = false;
          // Brief pause so the same code isn't re-scanned instantly.
          setTimeout(() => {
            if (streamRef.current) frameRef.current = requestAnimationFrame(tick);
          }, 1500);
        });
      return;
    }

    frameRef.current = requestAnimationFrame(tick);
  };

  const start = async () => {
    setError(null);
    setNotice(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      frameRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Could not access a camera. Check browser permissions, or use manual check-in instead.");
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        Scan member QR
        <span className="hint muted">Hold their phone's member pass up to this camera</span>
      </div>

      {active ? (
        <>
          <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#000" }}>
            <video ref={videoRef} muted playsInline style={{ width: "100%", display: "block", maxHeight: 260, objectFit: "cover" }} />
          </div>
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <button type="button" className="btn" onClick={stop}>
            Stop camera
          </button>
        </>
      ) : (
        <button type="button" className="btn primary" onClick={() => void start()}>
          Start camera
        </button>
      )}

      {notice && <div className="success-text">{notice}</div>}
      {error && (
        <div className="error-text" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
