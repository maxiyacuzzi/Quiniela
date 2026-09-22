// Achica y recomprime la imagen en el navegador antes de mandarla al server:
// las fotos de cámara del celular pueden pesar varios MB, y tanto las Server
// Actions de Next.js como el límite de payload de las funciones serverless
// (AWS Lambda, 6MB) rechazan eso. Para leer un ticket alcanza con bastante
// menos resolución.
const DIMENSION_MAXIMA = 1280;
const CALIDAD_JPEG = 0.75;

export function comprimirImagen(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > DIMENSION_MAXIMA || height > DIMENSION_MAXIMA) {
          const escala = DIMENSION_MAXIMA / Math.max(width, height);
          width = Math.round(width * escala);
          height = Math.round(height * escala);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo procesar la imagen"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", CALIDAD_JPEG);
        resolve({ base64: dataUrl.split(",")[1] ?? "", mimeType: "image/jpeg" });
      };
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}
