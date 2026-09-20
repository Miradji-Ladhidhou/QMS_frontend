import { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';

// Résolution interne fixe (600×240 = 2,5:1, le même rapport que le cadre de signature des documents
// Word) : le rendu à l'écran s'adapte à la largeur disponible en CSS, les coordonnées sont converties
// à chaque tracé. Le PNG exporté est transparent, il se pose sur n'importe quel fond de document.
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 240;
const STROKE_WIDTH = 3.5;
const STROKE_COLOR = '#0f172a';

// Zone de signature manuscrite (doigt, stylet ou souris). onChange reçoit le PNG en data URL dès
// qu'un tracé est terminé, ou null quand la zone est vide/effacée — le parent ne considère la
// personne comme « ayant signé » que lorsque la valeur est non nulle.
export default function SignaturePad({ onChange, disabled = false, label = 'Signez dans le cadre' }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const context = canvasRef.current.getContext('2d');
    context.lineWidth = STROKE_WIDTH;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = STROKE_COLOR;
  }, []);

  function pointFromEvent(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  }

  function handlePointerDown(event) {
    if (disabled) return;
    event.preventDefault();
    canvasRef.current.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const point = pointFromEvent(event);
    lastPointRef.current = point;
    // Un simple appui laisse un point (signature réduite à un trait très court, ou un point de « i »).
    const context = canvasRef.current.getContext('2d');
    context.beginPath();
    context.arc(point.x, point.y, STROKE_WIDTH / 2, 0, Math.PI * 2);
    context.fillStyle = STROKE_COLOR;
    context.fill();
  }

  function handlePointerMove(event) {
    if (!drawingRef.current) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const context = canvasRef.current.getContext('2d');
    context.beginPath();
    context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    lastPointRef.current = point;
  }

  function finishStroke() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    setHasInk(true);
    onChange(canvasRef.current.toDataURL('image/png'));
  }

  function clear() {
    canvasRef.current.getContext('2d').clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    setHasInk(false);
    onChange(null);
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-md border border-dashed border-slate-400 bg-slate-50">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          aria-label={label}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          // touch-action: none — sans cela le navigateur mobile fait défiler la page pendant le tracé
          // au lieu de laisser dessiner.
          style={{ touchAction: 'none', aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
          className={`block w-full ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair'}`}
        />
        {!hasInk && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">{label}</p>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        disabled={!hasInk || disabled}
        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-40"
      >
        <Eraser size={13} />
        Effacer et recommencer
      </button>
    </div>
  );
}
