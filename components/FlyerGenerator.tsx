'use client'

import { useEffect, useState, useRef } from 'react'
import { toPng } from 'html-to-image'
import { supabase } from '@/lib/supabase'
import { useQRCode } from 'next-qrcode'
import Image from 'next/image'

type Project = {
  slug: string
  title: string
}

// Define a type for the flyer data
type FlyerData = {
  title: string
  subtitle: string
  titleColor: string
  titleSize: string
  titleFont: string
  titlePosition: string
  subtitleColor: string
  subtitleSize: string
  subtitleFont: string
  subtitlePosition: string
  qrCodeColor: string
  qrCodeBgColor: string
  qrCodePosition: string
  adaptQrToBackground: boolean
  background: string
  uploadedBackground: string | null
  backgroundBlur: number
  project_slug: string
}

// Font options
const FONT_OPTIONS = [
  { name: 'Sans-serif', value: 'Arial, Helvetica, sans-serif' },
  { name: 'Serif', value: 'Georgia, Times New Roman, serif' },
  { name: 'Monospace', value: 'Courier New, monospace' },
  { name: 'Cursive', value: 'cursive' },
  { name: 'Fantasy', value: 'fantasy' },
  { name: 'System UI', value: 'system-ui' },
]

// Enhanced position options with 9-point grid
const POSITION_OPTIONS = [
  { name: "Haut Gauche", value: "top-left" },
  { name: "Haut Centre", value: "top-center" },
  { name: "Haut Droite", value: "top-right" },
  { name: "Milieu Gauche", value: "middle-left" },
  { name: "Milieu Centre", value: "middle-center" },
  { name: "Milieu Droite", value: "middle-right" },
  { name: "Bas Gauche", value: "bottom-left" },
  { name: "Bas Centre", value: "bottom-center" },
  { name: "Bas Droite", value: "bottom-right" },
]

interface FlyerGeneratorProps {
  initialSlug?: string;
  forceSlug?: string;
  hideProjectSelect?: boolean;
  onDataChange?: (data: FlyerData) => void;
}

export default function FlyerGenerator({ 
  initialSlug = '', 
  forceSlug, 
  hideProjectSelect = false,
  onDataChange 
}: FlyerGeneratorProps) {
  const { Canvas } = useQRCode()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string>(initialSlug || '')
  const [title, setTitle] = useState('Participez à notre mosaïque photo !')
  const [subtitle, setSubtitle] = useState('Scannez le QR code ci-dessous pour accéder au photobooth')
  
  // Text styling states with enhanced positioning
  const [titleColor, setTitleColor] = useState('#ffffff')
  const [titleSize, setTitleSize] = useState('24')
  const [titleFont, setTitleFont] = useState('Arial, Helvetica, sans-serif')
  const [titlePosition, setTitlePosition] = useState('top-center') // 9-point grid position
  
  const [subtitleColor, setSubtitleColor] = useState('#ffffff')
  const [subtitleSize, setSubtitleSize] = useState('16')
  const [subtitleFont, setSubtitleFont] = useState('Arial, Helvetica, sans-serif')
  const [subtitlePosition, setSubtitlePosition] = useState('bottom-center') // 9-point grid position
  
  // QR code styling
  const [qrCodeColor, setQrCodeColor] = useState('#000000')
  const [qrCodeBgColor, setQrCodeBgColor] = useState('#ffffff')
  const [qrCodePosition, setQrCodePosition] = useState('middle-center') // 9-point grid position
  const [adaptQrToBackground, setAdaptQrToBackground] = useState(false)
  
  const [background, setBackground] = useState<string>('#4f46e5')
  const [uploadedBackground, setUploadedBackground] = useState<string | null>(null)
  const [backgroundBlur, setBackgroundBlur] = useState<number>(0) // 0-10 blur level
  const [isGenerating, setIsGenerating] = useState(false)
  
  const flyerRef = useRef<HTMLDivElement>(null)
  // Hidden flyer element used only for downloading at correct scale
  const downloadFlyerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // If forceSlug is provided, use it and don't allow changing
    if (forceSlug) {
      setSelectedSlug(forceSlug);
    } else if (initialSlug) {
      setSelectedSlug(initialSlug);
    }
    
    // Only fetch projects if we're not forcing a specific slug
    if (!hideProjectSelect) {
      supabase.from('projects').select('slug, title').then(({ data }) => {
        if (data) setProjects(data);
      });
    }
  }, [forceSlug, initialSlug, hideProjectSelect])

  // Call onDataChange whenever relevant state changes
  useEffect(() => {
    if (onDataChange && selectedSlug) {
      onDataChange({
        title,
        subtitle,
        titleColor,
        titleSize,
        titleFont,
        titlePosition,
        subtitleColor,
        subtitleSize,
        subtitleFont,
        subtitlePosition,
        qrCodeColor,
        qrCodeBgColor,
        qrCodePosition,
        adaptQrToBackground,
        background,
        uploadedBackground,
        backgroundBlur,
        project_slug: selectedSlug
      });
    }
  }, [
    title, subtitle, titleColor, titleSize, titleFont, titlePosition,
    subtitleColor, subtitleSize, subtitleFont, subtitlePosition,
    qrCodeColor, qrCodeBgColor, qrCodePosition, adaptQrToBackground,
    background, uploadedBackground, backgroundBlur, selectedSlug,
    onDataChange
  ]);

  const handleDownload = async () => {
    if (!downloadFlyerRef.current) return;
    setIsGenerating(true);
    
    try {
      // A5 dimensions in pixels at 300 DPI:
      // 14.8 cm × 21 cm = 148 mm × 210 mm
      // At 300 DPI (11.811 pixels per mm): 1748 × 2480 pixels
      const dataUrl = await toPng(downloadFlyerRef.current, { 
        width: 1748, // 148 mm × 11.811 pixels/mm
        height: 2480, // 210 mm × 11.811 pixels/mm
        pixelRatio: 1,
        quality: 0.95
      });
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `flyer-${selectedSlug || 'mosaique'}-A5.png`;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGenerating(false);
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedBackground(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  const boothUrl = typeof window !== 'undefined' && selectedSlug ? `${window.location.origin}/photo?id=${selectedSlug}` : '';

  // Function to adapt QR code colors based on background
  const getAdaptiveQrColors = () => {
    // If not adapting, return the user selected colors
    if (!adaptQrToBackground) {
      return {
        dark: qrCodeColor,
        light: qrCodeBgColor,
      };
    }

    // For dark backgrounds use light QR code, for light backgrounds use dark QR code
    // This is a simple implementation - more sophisticated color analysis could be used
    const isDarkBackground = background.toLowerCase() === '#000000' || 
                            background.toLowerCase() === 'black' || 
                            background.startsWith('#0') ||
                            background.startsWith('#1') ||
                            background.startsWith('#2') ||
                            background.startsWith('#3');
    
    if (isDarkBackground || uploadedBackground) {
      // For dark or image backgrounds, use white QR with black dots
      return {
        dark: '#000000',
        light: '#FFFFFF',
      };
    } else {
      // For light backgrounds, use transparent background with dark dots
      return {
        dark: '#000000',
        light: '#FFFFFF',
      };
    }
  };

  // Enhanced position utility functions for 9-point grid
  const getPositionClasses = (position: string) => {
    switch (position) {
      // Top row
      case 'top-left':
        return 'mt-4 mb-auto self-start';
      case 'top-center':
        return 'mt-4 mb-auto self-center';
      case 'top-right':
        return 'mt-4 mb-auto self-end';
      
      // Middle row
      case 'middle-left':
        return 'mt-auto mb-auto self-start';
      case 'middle-center':
        return 'mt-auto mb-auto self-center';
      case 'middle-right':
        return 'mt-auto mb-auto self-end';
      
      // Bottom row
      case 'bottom-left':
        return 'mt-auto mb-4 self-start';
      case 'bottom-center':
        return 'mt-auto mb-4 self-center';
      case 'bottom-right':
        return 'mt-auto mb-4 self-end';
      
      default:
        return 'mt-auto mb-auto self-center';
    }
  };
  
  return (
    <div className="space-y-8 max-w-6xl">
      {!hideProjectSelect && (
        <div className="p-6 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-500 rounded-lg shadow text-white mb-2">
          <h2 className="text-3xl font-bold mb-2">🖨️ Générer un flyer avec QR Code</h2>
          <p className="text-white text-opacity-80">Créez un flyer personnalisé pour inviter à votre mosaïque photo.</p>
        </div>
      )}

      <div className="grid md:grid-cols-5 gap-8">
        {/* Left side - Form */}
        <div className="md:col-span-3 space-y-6">
          {/* Project selection section */}
          {!hideProjectSelect && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl shadow-md border border-indigo-100">
              <h3 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Sélection du projet
              </h3>
              
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <select
                  className="w-full border border-indigo-200 bg-white rounded-lg pl-10 pr-3 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  value={selectedSlug}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  disabled={!!forceSlug}
                >
                  <option value="">-- Sélectionnez un projet --</option>
                  {projects.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          {/* Content section with position controls */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-xl shadow-md border border-blue-100">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Textes du flyer
            </h3>
            
            <div className="space-y-6">
              {/* Title section with styling and position */}
              <div className="p-4 bg-white rounded-lg shadow-sm border border-blue-100">
                <h4 className="text-sm font-medium text-blue-700 mb-3">Titre principal</h4>
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full border border-blue-200 bg-white rounded-lg pl-10 pr-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      placeholder="Titre du flyer"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {/* Color picker */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Couleur</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={titleColor}
                          onChange={(e) => setTitleColor(e.target.value)}
                          className="h-8 w-8 rounded shadow-sm cursor-pointer"
                        />
                        <input
                          type="text"
                          value={titleColor}
                          onChange={(e) => setTitleColor(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                        />
                      </div>
                    </div>
                    
                    {/* Font size */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Taille (px)</label>
                      <input
                        type="number"
                        value={titleSize}
                        onChange={(e) => setTitleSize(e.target.value)}
                        min="10"
                        max="72"
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                      />
                    </div>
                    
                    {/* Font family */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Police</label>
                      <select
                        value={titleFont}
                        onChange={(e) => setTitleFont(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1 bg-white"
                      >
                        {FONT_OPTIONS.map(font => (
                          <option key={font.value} value={font.value}>
                            {font.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Enhanced Position selector - 9-point grid */}
                  <div className="mt-4">
                    <label className="block text-xs text-gray-500 mb-1">Position</label>
                    <div className="grid grid-cols-3 gap-1">
                      {POSITION_OPTIONS.map(pos => (
                        <button
                          key={pos.value}
                          type="button"
                          onClick={() => setTitlePosition(pos.value)}
                          className={`py-1 px-1 rounded text-xs font-medium ${
                            titlePosition === pos.value
                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                              : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200'
                          }`}
                          title={pos.name}
                        >
                          {pos.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Preview */}
                  <div className="mt-2 bg-gray-100 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Aperçu:</p>
                    <p style={{
                      color: titleColor,
                      fontSize: `${titleSize}px`,
                      fontFamily: titleFont
                    }}>
                      {title || "Titre du flyer"}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Subtitle section with styling and enhanced position */}
              <div className="p-4 bg-white rounded-lg shadow-sm border border-blue-100">
                <h4 className="text-sm font-medium text-blue-700 mb-3">Sous-titre</h4>
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className="w-full border border-blue-200 bg-white rounded-lg pl-10 pr-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      placeholder="Instructions pour le QR code"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {/* Color picker */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Couleur</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={subtitleColor}
                          onChange={(e) => setSubtitleColor(e.target.value)}
                          className="h-8 w-8 rounded shadow-sm cursor-pointer"
                        />
                        <input
                          type="text"
                          value={subtitleColor}
                          onChange={(e) => setSubtitleColor(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                        />
                      </div>
                    </div>
                    
                    {/* Font size */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Taille (px)</label>
                      <input
                        type="number"
                        value={subtitleSize}
                        onChange={(e) => setSubtitleSize(e.target.value)}
                        min="10"
                        max="72"
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                      />
                    </div>
                    
                    {/* Font family */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Police</label>
                      <select
                        value={subtitleFont}
                        onChange={(e) => setSubtitleFont(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1 bg-white"
                      >
                        {FONT_OPTIONS.map(font => (
                          <option key={font.value} value={font.value}>
                            {font.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Enhanced Position selector - 9-point grid */}
                  <div className="mt-4">
                    <label className="block text-xs text-gray-500 mb-1">Position</label>
                    <div className="grid grid-cols-3 gap-1">
                      {POSITION_OPTIONS.map(pos => (
                        <button
                          key={pos.value}
                          type="button"
                          onClick={() => setSubtitlePosition(pos.value)}
                          className={`py-1 px-1 rounded text-xs font-medium ${
                            subtitlePosition === pos.value
                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                              : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200'
                          }`}
                          title={pos.name}
                        >
                          {pos.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Preview */}
                  <div className="mt-2 bg-gray-100 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Aperçu:</p>
                    <p style={{
                      color: subtitleColor,
                      fontSize: `${subtitleSize}px`,
                      fontFamily: subtitleFont
                    }}>
                      {subtitle || "Sous-titre du flyer"}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* QR Code styling section with enhanced position */}
              <div className="p-4 bg-white rounded-lg shadow-sm border border-blue-100">
                <h4 className="text-sm font-medium text-blue-700 mb-3">QR Code</h4>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="adaptQrToBackground"
                      checked={adaptQrToBackground}
                      onChange={(e) => setAdaptQrToBackground(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="adaptQrToBackground" className="ml-2 text-sm text-gray-700">
                      Adapter automatiquement les couleurs du QR code au fond
                    </label>
                  </div>
                  
                  {!adaptQrToBackground && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Couleur du code</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={qrCodeColor}
                            onChange={(e) => setQrCodeColor(e.target.value)}
                            className="h-8 w-8 rounded shadow-sm cursor-pointer"
                          />
                          <input
                            type="text"
                            value={qrCodeColor}
                            onChange={(e) => setQrCodeColor(e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Couleur du fond</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={qrCodeBgColor}
                            onChange={(e) => setQrCodeBgColor(e.target.value)}
                            className="h-8 w-8 rounded shadow-sm cursor-pointer"
                          />
                          <input
                            type="text"
                            value={qrCodeBgColor}
                            onChange={(e) => setQrCodeBgColor(e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Enhanced Position selector - 9-point grid */}
                  <div className="mt-4">
                    <label className="block text-xs text-gray-500 mb-1">Position</label>
                    <div className="grid grid-cols-3 gap-1">
                      {POSITION_OPTIONS.map(pos => (
                        <button
                          key={pos.value}
                          type="button"
                          onClick={() => setQrCodePosition(pos.value)}
                          className={`py-1 px-1 rounded text-xs font-medium ${
                            qrCodePosition === pos.value
                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                              : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200'
                          }`}
                          title={pos.name}
                        >
                          {pos.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Preview */}
                  <div className="mt-2 bg-gray-100 p-4 rounded-lg flex justify-center">
                    <div className="bg-white rounded-lg">
                      {selectedSlug && boothUrl ? (
                        <Canvas
                          text={boothUrl}
                          options={{
                            width: 80,
                            margin: 2,
                            color: getAdaptiveQrColors(),
                          }}
                        />
                      ) : (
                        <div className="w-[80px] h-[80px] bg-gray-300 rounded flex items-center justify-center">
                          <span className="text-gray-500 text-[8px]">QR Code</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Design section */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl shadow-md border border-purple-100">
            <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Design du flyer
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className="block mb-2 font-medium text-purple-700">Couleur arrière-plan</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={background.startsWith('#') ? background : '#4f46e5'}
                    onChange={(e) => setBackground(e.target.value)}
                    className="h-10 w-14 rounded shadow-sm cursor-pointer"
                  />
                  <div className="flex-1 relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      placeholder="#ffffff"
                      className="w-full border border-purple-200 bg-white rounded-lg pl-10 pr-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    />
                  </div>
                </div>
                <p className="mt-1 text-xs text-purple-600">Vous pouvez entrer un code hexadécimal ou un nom de couleur CSS</p>
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-purple-700">Image arrière-plan</label>
                <div className="bg-white p-4 rounded-lg border border-purple-100 mb-3">
                  <div className="flex flex-wrap gap-3 items-center mb-3">
                    <label
                      htmlFor="flyer-background-upload"
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg shadow cursor-pointer font-medium hover:from-purple-600 hover:to-indigo-700 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Choisir une image
                      <input
                        id="flyer-background-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    
                    {uploadedBackground && (
                      <div className="relative group h-14 w-14 rounded-lg shadow-sm overflow-hidden border border-purple-200">
                        {uploadedBackground && (
                          <Image 
                            src={uploadedBackground} 
                            alt="Aperçu arrière-plan" 
                            className="h-full w-full object-cover"
                            width={56}
                            height={56}
                          />
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p><span className="font-medium">Recommandations :</span></p>
                    <ul className="mt-1 ml-4 list-disc text-xs space-y-1 text-gray-600">
                      <li>Utilisez une image de haute qualité (min 1500px de large)</li>
                      <li>Format recommandé : JPG ou PNG</li>
                      <li>Images foncées ou avec motifs légers pour un meilleur contraste avec le texte</li>
                      <li>Évitez les images trop chargées ou avec trop de détails</li>
                    </ul>
                  </div>
                </div>
                
                {uploadedBackground && (
                  <div className="bg-white p-4 rounded-lg border border-purple-100">
                    <label className="block text-sm text-gray-700 mb-1">Effet de flou</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="0" 
                        max="10" 
                        value={backgroundBlur}
                        onChange={(e) => setBackgroundBlur(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <span className="text-sm text-gray-500 w-8 text-center">{backgroundBlur}</span>
                    </div>
                    <p className="text-xs text-purple-600 mt-1">Ajustez le flou pour améliorer la lisibilité du texte</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Download section */}
          <button
            onClick={handleDownload}
            disabled={!selectedSlug || isGenerating}
            className={`relative w-full px-6 py-3 rounded-xl font-semibold shadow transition flex items-center justify-center ${
              !selectedSlug || isGenerating
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700'
            }`}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Génération en cours...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Télécharger le flyer
              </>
            )}
          </button>
        </div>
        
        {/* Right side - Preview */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-gray-700 to-gray-900 p-4 text-white">
              <h3 className="font-semibold flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
                Aperçu du flyer (Format A5)
              </h3>
            </div>
            <div className="p-6 flex justify-center bg-gray-100">
              <div 
                ref={flyerRef}
                className="w-[210px] h-[297px] border-8 border-white shadow-xl rounded-xl overflow-hidden relative"
                style={{
                  background: uploadedBackground
                    ? `url(${uploadedBackground}) center/cover no-repeat`
                    : background.startsWith('http')
                      ? `url(${background}) center/cover no-repeat`
                      : background,
                  aspectRatio: '148/210'
                }}
              >
                {/* Apply the background blur effect if an image is used */}
                {uploadedBackground && backgroundBlur > 0 && (
                  <div 
                    className="absolute inset-0" 
                    style={{ 
                      backdropFilter: `blur(${backgroundBlur}px)`,
                      WebkitBackdropFilter: `blur(${backgroundBlur}px)`,
                      background: 'transparent'
                    }}
                  ></div>
                )}
                
                <div className="absolute inset-0 bg-black/30" />
                <div className="relative z-10 flex flex-col items-stretch h-full text-white p-4">
                  {/* Title with position - using 9-point grid */}
                  <div className={`${getPositionClasses(titlePosition)} text-center`}>
                    <h1 style={{
                      color: titleColor,
                      fontSize: `${titleSize}px`,
                      fontFamily: titleFont,
                      fontWeight: 'bold',
                      textShadow: '1px 1px 3px rgba(0,0,0,0.6)',
                      maxWidth: '100%',
                    }}>
                      {title}
                    </h1>
                  </div>
                  
                  {/* QR code with position - using 9-point grid */}
                  <div className={`flex flex-col items-center ${getPositionClasses(qrCodePosition)}`}>
                    {/* QR code with adaptive colors */}
                    <div className="rounded-lg shadow-md" style={{ 
                      display: 'inline-flex', 
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: adaptQrToBackground ? 'transparent' : qrCodeBgColor
                    }}>
                      {selectedSlug && boothUrl ? (
                        <Canvas
                          text={boothUrl}
                          options={{
                            width: 45,
                            margin: 0,
                            color: getAdaptiveQrColors(),
                          }}
                        />
                      ) : (
                        <div className="w-[45px] h-[45px] bg-gray-300 rounded flex items-center justify-center">
                          <span className="text-gray-500 text-[6px]">QR Code</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Subtitle with position - using 9-point grid */}
                  <div className={`${getPositionClasses(subtitlePosition)} text-center`}>
                    <p style={{
                      color: subtitleColor,
                      fontSize: `${subtitleSize}px`,
                      fontFamily: subtitleFont,
                      textAlign: 'center',
                      maxWidth: '100%',
                      textShadow: '1px 1px 3px rgba(0,0,0,0.6)'
                    }}>
                      {subtitle}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Usage guide */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200 shadow-md">
            <div className="flex items-start mb-3">
              <div className="bg-amber-100 rounded-full p-1 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-700" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <h5 className="font-medium text-amber-800">Comment utiliser ce flyer</h5>
            </div>
            <ul className="space-y-2 text-sm text-amber-800 ml-9">
              <li className="flex items-center">
                <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mr-2"></span>
                Téléchargez le flyer généré en format A5 (14.8 × 21 cm)
              </li>
              <li className="flex items-center">
                <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mr-2"></span>
                Imprimez sans redimensionnement (échelle 100%) sur papier A5
              </li>
              <li className="flex items-center">
                <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mr-2"></span>
                Les participants pourront scanner le QR code avec leur téléphone
              </li>
              <li className="flex items-center">
                <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mr-2"></span>
                Pour impression sur A4, sélectionnez &quot;Ajuster à la page&quot;
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Invisible flyer element used only for download - positioned off-screen */}
      <div 
        className="fixed left-[-9999px] top-[-9999px]"
        aria-hidden="true"
      >
        <div 
          ref={downloadFlyerRef}
          className="w-[1748px] h-[2480px] overflow-hidden relative" 
          style={{
            background: uploadedBackground
              ? `url(${uploadedBackground}) center/cover no-repeat`
              : background.startsWith('http')
                ? `url(${background}) center/cover no-repeat`
                : background,
          }}
        >
          {/* Apply the background blur effect if an image is used */}
          {uploadedBackground && backgroundBlur > 0 && (
            <div 
              className="absolute inset-0" 
              style={{ 
                backdropFilter: `blur(${backgroundBlur}px)`,
                WebkitBackdropFilter: `blur(${backgroundBlur}px)`,
                background: 'transparent'
              }}
            ></div>
          )}
          
          <div className="absolute inset-0 bg-black/30" />
          
          {/* Match the exact structure of the preview layout but scaled up */}
          <div className="relative z-10 flex flex-col items-stretch h-full text-white p-[200px]">
            {/* Title with position - using 9-point grid */}
            <div className={`${getPositionClasses(titlePosition)} text-center`}>
              <h1 style={{
                color: titleColor,
                fontSize: `${Math.max(parseInt(titleSize) * 7, 100)}px`,
                fontFamily: titleFont,
                fontWeight: 'bold',
                textShadow: '8px 8px 16px rgba(0,0,0,0.6)',
                maxWidth: '100%',
                lineHeight: 1.2,
              }}>
                {title}
              </h1>
            </div>
            
            {/* QR code with position - using 9-point grid - LARGER SIZE */}
            <div className={`flex flex-col items-center ${getPositionClasses(qrCodePosition)}`}>
              {/* QR code with adaptive colors */}
              <div className="rounded-[40px] shadow-xl" style={{ 
                display: 'inline-flex', 
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: adaptQrToBackground ? 'transparent' : qrCodeBgColor,
                padding: adaptQrToBackground ? '0' : '20px'
              }}>
                {selectedSlug && boothUrl ? (
                  <Canvas
                    text={boothUrl}
                    options={{
                      width: 600, // Much larger QR code for the print version (previously 300)
                      margin: 20,
                      color: getAdaptiveQrColors(),
                    }}
                  />
                ) : (
                  <div className="w-[600px] h-[600px] bg-gray-300 rounded flex items-center justify-center">
                    <span className="text-gray-500 text-[64px]">QR Code</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Subtitle with position - using 9-point grid */}
            <div className={`${getPositionClasses(subtitlePosition)} text-center`}>
              <p style={{
                color: subtitleColor,
                fontSize: `${Math.max(parseInt(subtitleSize) * 5, 80)}px`,
                fontFamily: subtitleFont,
                textAlign: 'center',
                maxWidth: '100%', 
                margin: '0 auto',
                textShadow: '4px 4px 10px rgba(0,0,0,0.6)',
                lineHeight: 1.3,
              }}>
                {subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
