// app/manifest.ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TrainingBook Command',
    short_name: 'Trainingbook',
    description: 'Operational Management System',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F172A', // Slate 900 matches your app theme
    theme_color: '#0F172A',
    orientation: 'portrait',
    icons: [
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
  }
}