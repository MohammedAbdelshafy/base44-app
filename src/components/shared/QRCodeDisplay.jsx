import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

function getNetworkUrl() {
  const { location, hostname } = window;
  const port = location.port || '5173';
  const path = '/mbm';
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${location.protocol}//${hostname}${port ? `:${port}` : ''}${path}`;
  }
  return null;
}

async function detectLocalIP() {
  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    const promise = new Promise((resolve) => {
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          const ip = e.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/)?.[1];
          if (ip) {
            pc.close();
            resolve(ip);
          }
        }
      };
    });
    await pc.createOffer().then((o) => pc.setLocalDescription(o));
    const ip = await Promise.race([
      promise,
      new Promise((r) => setTimeout(() => r(null), 2000)),
    ]);
    pc.close();
    return ip;
  } catch {
    return null;
  }
}

export default function QRCodeDisplay({ size = 160 }) {
  const [show, setShow] = useState(false);
  const [url, setUrl] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    const existing = getNetworkUrl();
    if (existing) {
      setUrl(existing);
      return;
    }
    const port = window.location.port || '5173';
    detectLocalIP().then((ip) => {
      setUrl(ip ? `http://${ip}:${port}/mbm` : window.location.href);
    });
  }, []);

  useEffect(() => {
    if (show && canvasRef.current && url) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: { dark: '#e2e8f0', light: 'transparent' },
      });
    }
  }, [show, url, size]);

  return (
    <>
      <button
        onClick={() => setShow(!show)}
        className="text-gray-500 hover:text-gray-300 p-1"
        title="Show QR code"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <line x1="14" y1="14" x2="14" y2="14" /><line x1="14" y1="17" x2="14" y2="17" />
          <line x1="17" y1="14" x2="17" y2="14" /><line x1="14" y1="21" x2="17" y2="21" />
          <line x1="21" y1="14" x2="21" y2="17" /><line x1="21" y1="21" x2="21" y2="21" />
        </svg>
      </button>

      {show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShow(false)}
        >
          <div
            className="bg-[#111125] border border-white/10 rounded-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <canvas ref={canvasRef} />
            <p className="text-xs text-gray-500 mt-3 break-all max-w-[220px]">{url}</p>
            <p className="text-[10px] text-gray-600 mt-1">Scan with your phone camera</p>
            <button
              onClick={() => setShow(false)}
              className="mt-3 text-[11px] text-purple-400 hover:text-purple-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
