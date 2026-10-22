import logoAsset from '@/assets/geostudio-logo.png.asset.json';

/** Identidade visual do sistema (logo oficial Geo Studio, fundo transparente). */
export const brand = {
  name: 'Geo Studio',
  logo: logoAsset.url,
  /** Proporção original do logo (largura / altura) — usar sempre para evitar distorção. */
  ratio: 1265 / 259,
};

let logoData: string | null = null;
let loading: Promise<string | null> | null = null;

/** Carrega o logo como PNG (data URL) para os documentos gerados no navegador. */
export function preloadBrandLogo(): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!loading) {
    loading = (async () => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = brand.logo;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d')?.drawImage(img, 0, 0);
        logoData = c.toDataURL('image/png');
        return logoData;
      } catch { loading = null; return null; }
    })();
  }
  return loading;
}

/** Logo já carregado (ou null se ainda não disponível). */
export const brandLogoData = () => logoData;
