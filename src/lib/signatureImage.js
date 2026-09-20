// Convertit une image importée (PNG/JPEG/WebP) en PNG 600×240 max, sans la déformer, prête à être
// envoyée comme signature du formateur (le serveur n'accepte que du PNG de taille bornée). Un scan
// de signature fait souvent plusieurs milliers de pixels : le redimensionnement évite le rejet.
const MAX_WIDTH = 600;
const MAX_HEIGHT = 240;

export function imageFileToSignaturePng(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Choisissez un fichier image (PNG ou JPEG).'));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(MAX_WIDTH / image.width, MAX_HEIGHT / image.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire cette image."));
    };
    image.src = url;
  });
}
