# InsurHero Landing Page - Next.js

Este proyecto es la migración del proyecto React/Vite a Next.js con App Router.

## Estructura del Proyecto

- `app/` - Directorio de App Router de Next.js
  - `layout.tsx` - Layout raíz con providers
  - `page.tsx` - Página principal (Server Component)
  - `not-found.tsx` - Página 404
  - `providers.tsx` - Providers del cliente (QueryClient, ThemeProvider, etc.)
  - `globals.css` - Estilos globales
- `components/` - Componentes React
  - `ui/` - Componentes UI de shadcn
  - `steps/` - Componentes de pasos del flujo de reserva
  - `BookingFlow.tsx` - Componente principal del flujo
  - `ProgressIndicator.tsx` - Indicador de progreso
- `contexts/` - Contextos de React
  - `LanguageContext.tsx` - Contexto de idioma
- `hooks/` - Hooks personalizados
- `lib/` - Utilidades y traducciones
- `public/` - Archivos estáticos

## Características

- ✅ Next.js 15 con App Router
- ✅ Server Components donde es posible
- ✅ Client Components marcados con "use client"
- ✅ Tailwind CSS para estilos
- ✅ shadcn/ui para componentes UI
- ✅ Soporte multiidioma (EN/ES)
- ✅ TanStack Query para manejo de estado del servidor
- ✅ Sonner para notificaciones toast

## Instalación

```bash
cd landing-next
npm install
# o
yarn install
```

## Desarrollo

```bash
npm run dev
# o
yarn dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Build

```bash
npm run build
# o
yarn build
```

## Inicio en Producción

```bash
npm start
# o
yarn start
```

## Migración Completada

- ✅ Estructura base de Next.js
- ✅ Configuración (package.json, tsconfig, tailwind, etc.)
- ✅ Estilos globales y assets
- ✅ Lib/utils y traducciones
- ✅ Contexto de idioma adaptado para Next.js
- ✅ Componentes UI de shadcn
- ✅ Componentes de pasos del flujo
- ✅ Página principal como Server Component
- ✅ Providers configurados
- ✅ Hooks personalizados

## Notas

- Los componentes que usan hooks de React o estado deben estar marcados con "use client"
- La página principal (`app/page.tsx`) es un Server Component que renderiza el BookingFlow
- El contexto de idioma usa localStorage para persistir la preferencia del usuario
- Las imágenes deben estar en `/public/assets/` y se acceden con `/assets/...`
