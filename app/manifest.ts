import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cadernos Vivos',
    short_name: 'Cadernos',
    description: 'Universos de prova, memoria e disputa.',
    start_url: '/',
    display: 'standalone',
    background_color: '#171b21',
    theme_color: '#171b21',
    orientation: 'portrait',
    lang: 'pt-BR',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Abrir Mapa',
        short_name: 'Mapa',
        description: 'Entrar no mapa do universo',
        url: '/c/demo/mapa',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Abrir Provas',
        short_name: 'Provas',
        description: 'Entrar no painel de evidencias',
        url: '/c/demo/provas',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Abrir Debate',
        short_name: 'Debate',
        description: 'Entrar no inbox de perguntas',
        url: '/c/demo/debate',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
