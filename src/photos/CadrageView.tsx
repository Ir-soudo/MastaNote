import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, Crosshair, ImagePlus, RefreshCw, RotateCcw, RotateCw, X } from 'lucide-react';
import { cadrageDepuisVisage, cadrageInitial, corrigerCadrage, echelleMin, messageAlerte } from './noyau.js';
import {
  cameraDisponible,
  chargerImage,
  dessinerApercu,
  detecterVisage,
  libererImage,
  messageErreurCamera,
  octetsVersBlob,
  ouvrirCamera,
  produirePhoto
} from './navigateur.js';

// ==========================================================
// PRISE DE PHOTO D'UN ÉLÈVE : source (caméra ou galerie), recadrage, retouche, résultat.
// Tout se passe sur l'appareil. Ce composant gère UNE photo ; le parcours « un élève après l'autre » est dans StudioPhotos.
// À utiliser avec key={eleve.id} : l'écran repart à zéro pour chaque élève.
// ==========================================================

type Props = {
  eleve: { id: string; matricule: string; nom: string; prenoms: string };
  nomPrevu: string;
  reglages: any;
  photoExistante?: any;
  onValider: (photo: any) => void | Promise<void>;
  notify: (message: string, type?: 'success' | 'error') => void;
};

type Etape = 'choix' | 'camera' | 'edition' | 'resultat';

const formaterKo = (octets: number) => `${(octets / 1024).toFixed(1).replace('.', ',')} Ko`;

function Gabarit() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
      <ellipse cx="50" cy="45" rx="24" ry="28" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" strokeDasharray="3 2" />
      <line x1="12" y1="40" x2="88" y2="40" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
    </svg>
  );
}

export default function CadrageView({ eleve, nomPrevu, reglages, photoExistante, onValider, notify }: Props) {
  const W: number = reglages.largeur;
  const H: number = reglages.hauteur;
  const largeurApercu = Math.min(300, W);
  const hauteurApercu = Math.round((largeurApercu * H) / W);

  const [etape, setEtape] = useState<Etape>('choix');
  const [face, setFace] = useState<'user' | 'environment'>('user');
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [image, setImage] = useState<any>(null);
  const [rot90, setRot90] = useState(0);
  const [angleFin, setAngleFin] = useState(0);
  const [params, setParams] = useState<any>(null);
  const [luminosite, setLuminosite] = useState(0);
  const [contraste, setContraste] = useState(0);
  const [visage, setVisage] = useState<any>(undefined);
  const [resultat, setResultat] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<any>(null);
  const imageRef = useRef<any>(null);
  const pointeurs = useRef(new Map<number, { x: number; y: number }>());
  const distancePrecedente = useRef(0);

  // Aperçus (photo déjà enregistrée, résultat) : adresses temporaires libérées dès qu'elles ne servent plus
  const [urlExistante, setUrlExistante] = useState('');
  useEffect(() => {
    if (!photoExistante?.donnees) {
      setUrlExistante('');
      return undefined;
    }
    const url = URL.createObjectURL(octetsVersBlob(photoExistante.donnees));
    setUrlExistante(url);
    return () => URL.revokeObjectURL(url);
  }, [photoExistante]);
  const [urlResultat, setUrlResultat] = useState('');
  useEffect(() => {
    if (!resultat?.donnees) {
      setUrlResultat('');
      return undefined;
    }
    const url = URL.createObjectURL(octetsVersBlob(resultat.donnees));
    setUrlResultat(url);
    return () => URL.revokeObjectURL(url);
  }, [resultat]);

  // À la fermeture : la caméra s'éteint et la mémoire de l'image est rendue
  useEffect(
    () => () => {
      camRef.current?.arreter();
      camRef.current = null;
      libererImage(imageRef.current);
    },
    []
  );

  // L'angle du cadrage suit la rotation choisie ; le cadrage est ramené dans le possible
  useEffect(() => {
    if (!image) return;
    setParams((p: any) => (p ? corrigerCadrage({ ...p, angle: rot90 + angleFin }, image.largeur, image.hauteur, W, H) : p));
  }, [rot90, angleFin, image]);

  // Aperçu en direct pendant le déplacement et les réglages
  useEffect(() => {
    if (etape !== 'edition' || !image || !params || !canvasRef.current) return;
    dessinerApercu(canvasRef.current, image, params, reglages, { luminosite, contraste });
  }, [etape, image, params, luminosite, contraste, W, H]);

  // ---------- sources ----------

  const arreterCamera = () => {
    camRef.current?.arreter();
    camRef.current = null;
  };

  const demarrerCamera = async (faceVoulue: 'user' | 'environment') => {
    setErreur('');
    setOccupe(true);
    try {
      arreterCamera();
      setEtape('camera');
      camRef.current = await ouvrirCamera(videoRef.current as HTMLVideoElement, { face: faceVoulue });
      setFace(faceVoulue);
    } catch (err) {
      setErreur(messageErreurCamera(err));
      setEtape('choix');
    } finally {
      setOccupe(false);
    }
  };

  const commencerEdition = async (img: any, { centre = false } = {}) => {
    libererImage(imageRef.current);
    imageRef.current = img;
    setImage(img);
    setRot90(0);
    setAngleFin(0);
    setLuminosite(0);
    setContraste(0);
    setResultat(null);
    const boite = await detecterVisage(img);
    setVisage(boite);
    setParams(
      centre || !boite
        ? cadrageInitial(img.largeur, img.hauteur, W, H, { positionVerticale: centre ? 0.5 : 0.45 })
        : cadrageDepuisVisage(img.largeur, img.hauteur, W, H, boite)
    );
    setEtape('edition');
  };

  const capturer = async () => {
    setErreur('');
    try {
      const img = camRef.current.capturer();
      arreterCamera();
      await commencerEdition(img, { centre: true });
    } catch (err: any) {
      setErreur(err?.message || 'Capture impossible.');
    }
  };

  const surFichier = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    setErreur('');
    setOccupe(true);
    try {
      await commencerEdition(await chargerImage(fichier));
    } catch (err: any) {
      setErreur(err?.message || 'Image illisible.');
    } finally {
      setOccupe(false);
    }
  };

  // ---------- gestes : déplacer, zoomer ----------

  const deplacer = (dx: number, dy: number) =>
    setParams((p: any) => {
      const t = (p.angle * Math.PI) / 180;
      const cos = Math.cos(t);
      const sin = Math.sin(t);
      return corrigerCadrage({ ...p, cx: p.cx - (dx * cos + dy * sin) / p.echelle, cy: p.cy - (-dx * sin + dy * cos) / p.echelle }, image.largeur, image.hauteur, W, H);
    });

  const zoomer = (facteur: number) =>
    setParams((p: any) => {
      const plafond = echelleMin(image.largeur, image.hauteur, W, H, p.angle) * 8;
      return corrigerCadrage({ ...p, echelle: Math.min(plafond, p.echelle * facteur) }, image.largeur, image.hauteur, W, H);
    });

  const surPointeurBas = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    distancePrecedente.current = 0;
  };

  const surPointeurHaut = (e: React.PointerEvent<HTMLDivElement>) => {
    pointeurs.current.delete(e.pointerId);
    distancePrecedente.current = 0;
  };

  const surPointeurMouvement = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!image || !params) return;
    const pts = pointeurs.current;
    const avant = pts.get(e.pointerId);
    if (!avant) return;
    const maintenant = { x: e.clientX, y: e.clientY };
    pts.set(e.pointerId, maintenant);
    if (pts.size === 1) {
      const k = W / e.currentTarget.getBoundingClientRect().width; // pixels de sortie par pixel d'écran
      deplacer((maintenant.x - avant.x) * k, (maintenant.y - avant.y) * k);
    } else if (pts.size === 2) {
      const [a, b] = Array.from(pts.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (distancePrecedente.current > 0 && d > 0) zoomer(d / distancePrecedente.current);
      distancePrecedente.current = d;
    }
  };

  const recentrer = () => {
    if (!image) return;
    setRot90(0);
    setAngleFin(0);
    setParams(visage ? cadrageDepuisVisage(image.largeur, image.hauteur, W, H, visage) : cadrageInitial(image.largeur, image.hauteur, W, H));
  };

  // ---------- résultat ----------

  const valider = async () => {
    setOccupe(true);
    setErreur('');
    try {
      setResultat(await produirePhoto(image, params, reglages, { luminosite, contraste, visage }));
      setEtape('resultat');
    } catch (err: any) {
      setErreur(err?.message || 'Traitement impossible.');
    } finally {
      setOccupe(false);
    }
  };

  const garder = async () => {
    if (!resultat) return;
    setOccupe(true);
    try {
      await onValider({
        eleveId: eleve.id,
        donnees: resultat.donnees,
        poidsOctets: resultat.poidsOctets,
        largeur: resultat.largeur,
        hauteur: resultat.hauteur,
        alertes: resultat.alertes,
        mesures: resultat.mesures,
        creeLe: Date.now()
      });
      notify('Photo enregistrée sur cet appareil.', 'success');
      setEtape('choix');
    } catch (err: any) {
      setErreur(err?.message || "Enregistrement impossible : l'espace de l'appareil est peut-être plein.");
    } finally {
      setOccupe(false);
    }
  };

  const minEch = params && image ? echelleMin(image.largeur, image.hauteur, W, H, params.angle) : 1;
  const zoomRelatif = params ? Math.min(8, Math.max(1, params.echelle / minEch)) : 1;

  const bouton = 'text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50';
  const secondaire = `${bouton} bg-slate-800 hover:bg-slate-700 text-slate-200`;
  const principal = `${bouton} bg-emerald-600 hover:bg-emerald-700 text-white`;
  const cadre = 'relative mx-auto rounded-2xl overflow-hidden border border-slate-700 select-none';

  return (
    <div className="space-y-4">
      {erreur && <p className="text-xs text-rose-300 leading-relaxed">{erreur}</p>}

      {/* ---- CHOIX DE LA SOURCE ---- */}
      {etape === 'choix' && (
        <div className="space-y-4">
          {photoExistante && urlExistante && (
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
              <img src={urlExistante} alt="Photo actuelle" className="w-16 rounded-lg" style={{ aspectRatio: `${W} / ${H}`, objectFit: 'cover' }} />
              <div className="text-xs text-slate-300">
                <p className="font-bold text-white">Photo actuelle</p>
                <p>
                  {photoExistante.largeur}×{photoExistante.hauteur} · {formaterKo(photoExistante.poidsOctets)}
                </p>
                <p className={photoExistante.alertes?.length ? 'text-amber-300' : 'text-emerald-300'}>
                  {photoExistante.alertes?.length ? `${photoExistante.alertes.length} alerte(s)` : 'Conforme'}
                </p>
              </div>
            </div>
          )}
          <p className="text-[11px] text-slate-500">Fichier prévu : {nomPrevu}</p>
          <div className="grid grid-cols-1 gap-2">
            <button onClick={() => demarrerCamera(face)} disabled={occupe || !cameraDisponible()} className={principal}>
              <Camera className="w-4 h-4" />
              {photoExistante ? 'Refaire avec la caméra' : 'Prendre la photo avec la caméra'}
            </button>
            <label className={`${secondaire} cursor-pointer`}>
              <ImagePlus className="w-4 h-4" />
              Choisir dans la galerie
              <input type="file" accept="image/*" className="hidden" onChange={surFichier} />
            </label>
            <label className={`${secondaire} cursor-pointer`}>
              <Camera className="w-4 h-4" />
              Appareil photo du téléphone
              <input type="file" accept="image/*" capture="user" className="hidden" onChange={surFichier} />
            </label>
          </div>
          {!cameraDisponible() && <p className="text-[11px] text-slate-500">La caméra intégrée n&apos;est pas disponible ici : utilisez la galerie ou l&apos;appareil photo du téléphone.</p>}
        </div>
      )}

      {/* ---- CAMÉRA EN DIRECT (la vidéo reste montée pour que le navigateur puisse la démarrer) ---- */}
      <div className={etape === 'camera' ? 'space-y-3' : 'hidden'}>
        <div className={`${cadre} bg-black`} style={{ width: largeurApercu, maxWidth: '100%', aspectRatio: `${W} / ${H}` }}>
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full"
            style={{ objectFit: 'cover', transform: face === 'user' ? 'scaleX(-1)' : 'none' }}
          />
          <Gabarit />
        </div>
        <p className="text-[11px] text-slate-400 text-center">Visage de face, centré dans l&apos;ovale, lumière devant l&apos;élève, fond uni.</p>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => demarrerCamera(face === 'user' ? 'environment' : 'user')} disabled={occupe} className={secondaire}>
            <RefreshCw className="w-3.5 h-3.5" />
            Basculer
          </button>
          <button onClick={capturer} disabled={occupe} className={principal}>
            <Camera className="w-4 h-4" />
            Photo
          </button>
          <button
            onClick={() => {
              arreterCamera();
              setEtape('choix');
            }}
            className={secondaire}
          >
            <X className="w-3.5 h-3.5" />
            Annuler
          </button>
        </div>
      </div>

      {/* ---- RECADRAGE ET RETOUCHE ---- */}
      {etape === 'edition' && image && params && (
        <div className="space-y-4">
          <div
            className={`${cadre} bg-white cursor-grab`}
            style={{ width: largeurApercu, maxWidth: '100%', aspectRatio: `${W} / ${H}`, touchAction: 'none' }}
            onPointerDown={surPointeurBas}
            onPointerMove={surPointeurMouvement}
            onPointerUp={surPointeurHaut}
            onPointerCancel={surPointeurHaut}
            onWheel={(e) => zoomer(e.deltaY < 0 ? 1.08 : 1 / 1.08)}
          >
            <canvas ref={canvasRef} width={largeurApercu} height={hauteurApercu} className="block w-full h-full" />
            <Gabarit />
          </div>
          <p className="text-[11px] text-slate-500 text-center">Glissez pour déplacer, pincez pour zoomer. L&apos;ovale n&apos;apparaît pas sur la photo finale.</p>

          <div className="space-y-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
            <label className="block text-[11px] text-slate-400">
              Zoom
              <input
                type="range"
                min="1"
                max="8"
                step="0.01"
                value={zoomRelatif}
                onChange={(e) => setParams((p: any) => corrigerCadrage({ ...p, echelle: minEch * Number(e.target.value) }, image.largeur, image.hauteur, W, H))}
                className="w-full accent-indigo-500"
              />
            </label>
            <label className="block text-[11px] text-slate-400">
              Inclinaison fine ({angleFin}°)
              <input type="range" min="-15" max="15" step="0.5" value={angleFin} onChange={(e) => setAngleFin(Number(e.target.value))} className="w-full accent-indigo-500" />
            </label>
            <label className="block text-[11px] text-slate-400">
              Luminosité ({luminosite})
              <input type="range" min="-50" max="50" step="1" value={luminosite} onChange={(e) => setLuminosite(Number(e.target.value))} className="w-full accent-indigo-500" />
            </label>
            <label className="block text-[11px] text-slate-400">
              Contraste ({contraste})
              <input type="range" min="-50" max="50" step="1" value={contraste} onChange={(e) => setContraste(Number(e.target.value))} className="w-full accent-indigo-500" />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setRot90((r) => (r + 270) % 360)} className={secondaire}>
                <RotateCcw className="w-3.5 h-3.5" />
                90°
              </button>
              <button onClick={() => setRot90((r) => (r + 90) % 360)} className={secondaire}>
                <RotateCw className="w-3.5 h-3.5" />
                90°
              </button>
              <button onClick={recentrer} className={secondaire}>
                <Crosshair className="w-3.5 h-3.5" />
                Recentrer
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                libererImage(imageRef.current);
                imageRef.current = null;
                setImage(null);
                setParams(null);
                setEtape('choix');
              }}
              disabled={occupe}
              className={secondaire}
            >
              <X className="w-3.5 h-3.5" />
              Reprendre
            </button>
            <button onClick={valider} disabled={occupe} className={principal}>
              <Check className="w-4 h-4" />
              {occupe ? 'Traitement…' : 'Valider le cadrage'}
            </button>
          </div>
        </div>
      )}

      {/* ---- RÉSULTAT ---- */}
      {etape === 'resultat' && resultat && (
        <div className="space-y-4">
          <img src={urlResultat} alt="Photo finale" className="mx-auto rounded-2xl border border-slate-700" style={{ width: largeurApercu, maxWidth: '100%' }} />
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 space-y-1.5">
            <p>
              <strong className="text-white">{nomPrevu}</strong>
            </p>
            <p>
              {resultat.largeur}×{resultat.hauteur} · {formaterKo(resultat.poidsOctets)} · qualité JPEG {Math.round(resultat.qualiteJpeg * 100)} %
            </p>
            {resultat.alertes.length === 0 ? (
              <p className="text-emerald-300">Conforme : aucune alerte.</p>
            ) : (
              <ul className="space-y-1 text-amber-300 list-disc pl-4">
                {resultat.alertes.map((code: string) => (
                  <li key={code}>{messageAlerte(code)}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setEtape('edition')} disabled={occupe} className={secondaire}>
              Retoucher
            </button>
            <button
              onClick={() => {
                libererImage(imageRef.current);
                imageRef.current = null;
                setImage(null);
                setParams(null);
                setResultat(null);
                setEtape('choix');
              }}
              disabled={occupe}
              className={secondaire}
            >
              Reprendre
            </button>
            <button onClick={garder} disabled={occupe} className={principal}>
              <Check className="w-4 h-4" />
              Garder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}