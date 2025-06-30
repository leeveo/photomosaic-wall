'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePhotoMosaicStore } from '@/lib/store'
import Modal from './Modal'
import PhotoBoothCustomizer from './PhotoBoothCustomizer'
import FlyerGenerator from './FlyerGenerator'
import Image from 'next/image'
import { TABLE_NAMES } from '@/lib/tableNames';
import { supabaseHelpers } from '@/lib/supabase';
import { useRouter } from 'next/navigation'

const LABEL_FORMATS = [
  { name: '76mm x 76mm', widthMM: 76, heightMM: 76 },
  { name: '60mm x 40mm', widthMM: 60, heightMM: 40 },
  { name: '100mm x 150mm', widthMM: 100, heightMM: 150 },
]

export default function CreateProject() {
  const { setImage, setGrid } = usePhotoMosaicStore()

  const [slug, setSlug] = useState<string>(() => generateUniqueSlug());
  const [title, setTitle] = useState('')
  const [rows, setRows] = useState(5)
  const [cols, setCols] = useState(8)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState(LABEL_FORMATS[0])
  const [eventDate, setEventDate] = useState<string>('') // New state for event date
  const [isModalOpen, setIsModalOpen] = useState(false) // State for modal visibility
  const [step, setStep] = useState(0); // Wizard step state - FIX: added missing semicolon
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [_unused, setCreatedSlug] = useState<string | null>(null);
  /* eslint-enable @typescript-eslint/no-unused-vars  */
  const [projectCreated, setProjectCreated] = useState(false) // Ajout: savoir si le projet est créé
  
  // Additional fields for FlyerGenerator
  const [flyerTitle, setFlyerTitle] = useState('Participez à notre mosaïque photo !')
  const [flyerSubtitle, setFlyerSubtitle] = useState('Scannez le QR code ci-dessous pour accéder au photobooth')
  const [flyerTitleColor, setFlyerTitleColor] = useState('#ffffff')
  const [flyerTitleSize, setFlyerTitleSize] = useState('24')
  const [flyerTitleFont, setFlyerTitleFont] = useState('Arial, Helvetica, sans-serif')
  const [flyerTitlePosition, setFlyerTitlePosition] = useState('top-center')
  const [flyerSubtitleColor, setFlyerSubtitleColor] = useState('#ffffff')
  const [flyerSubtitleSize, setFlyerSubtitleSize] = useState('16')
  const [flyerSubtitleFont, setFlyerSubtitleFont] = useState('Arial, Helvetica, sans-serif')
  const [flyerSubtitlePosition, setFlyerSubtitlePosition] = useState('bottom-center')
  const [flyerQrCodePosition, setFlyerQrCodePosition] = useState('middle-center')
  const [flyerBackground, setFlyerBackground] = useState('#4f46e5')
  const [flyerBackgroundImage, setFlyerBackgroundImage] = useState<string | null>(null)
  const [flyerBackgroundBlur, setFlyerBackgroundBlur] = useState(0)
  
  // Additional fields for PhotoBoothCustomizer
  const [boothBackgroundColor, setBoothBackgroundColor] = useState('#000000')
  const [boothBackgroundImage, setBoothBackgroundImage] = useState('')
  const [boothButtonColor, setBoothButtonColor] = useState('#16a34a')
  const [boothStep1Text, setBoothStep1Text] = useState('Prêt à commencer ?')
  const [boothStep2Text, setBoothStep2Text] = useState('Cadrez-vous bien !')
  const [boothStep3Text, setBoothStep3Text] = useState('Voici votre photo, voulez-vous la valider ?')
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter();

  useEffect(() => {
    if (!imageSize || !selectedFormat) return
    const imageRatio = imageSize.width / imageSize.height
    const labelRatio = selectedFormat.widthMM / selectedFormat.heightMM
    const calculatedCols = Math.round(rows * imageRatio * labelRatio)
    setCols(calculatedCols)
  }, [rows, selectedFormat, imageSize])

  // Wrap drawGridPreview in useCallback to prevent dependency issues
  const drawGridPreview = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !localPreview || !imageSize) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fix: Use window.Image() to avoid confusion with the imported Next.js Image component
    const img = new window.Image()
    img.src = localPreview
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height

      const cellW = img.width / cols
      const cellH = img.height / rows

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      ctx.strokeStyle = 'red'
      ctx.lineWidth = 1

      for (let r = 0; r <= rows; r++) {
        ctx.beginPath()
        ctx.moveTo(0, r * cellH)
        ctx.lineTo(canvas.width, r * cellH)
        ctx.stroke()
      }

      for (let c = 0; c <= cols; c++) {
        ctx.beginPath()
        ctx.moveTo(c * cellW, 0)
        ctx.lineTo(c * cellW, canvas.height)
        ctx.stroke()
      }
    }
  }, [localPreview, rows, cols, imageSize])

  useEffect(() => {
    drawGridPreview()
  }, [drawGridPreview])

  // Générateur de slug unique (ex: "proj-1681234567890-4f3a2b")
  function generateUniqueSlug() {
    const rand = Math.random().toString(36).substring(2, 8);
    return `proj-${Date.now()}-${rand}`;
  }

  // À chaque création de projet, regénère un slug unique
  useEffect(() => {
    setSlug(generateUniqueSlug());
  }, []);

  // Add this function to check if the user has the appropriate permissions
  const checkPermissions = async () => {
    try {
      // Test write access to projects table
      const { error: projectError } = await supabase
        .from('projects')
        .select('count')
        .limit(1);
      
      if (projectError) {
        console.error('Database permission issue:', projectError);
        return false;
      }
      
      // Test write access to storage
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testFileName = `permission-test-${Date.now()}.txt`;
      
      const { error: storageError } = await supabase.storage
        .from('backgrounds')
        .upload(testFileName, testBlob, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (storageError) {
        console.error('Storage permission issue:', storageError);
        return false;
      }
      
      // Clean up test file
      await supabase.storage
        .from('backgrounds')
        .remove([testFileName]);
        
      return true;
    } catch (err) {
      console.error('Error checking permissions:', err);
      return false;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate that slug exists
    if (!slug) {
      alert('Veuillez d\'abord définir un identifiant (slug) pour le projet');
      return;
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Fix: Use window.Image() here as well
      const img = new window.Image()
      img.src = result
      img.onload = async () => {
        const maxWidth = 800
        const scale = img.width > maxWidth ? maxWidth / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const compressed = canvas.toDataURL('image/jpeg', 0.7)
        setLocalPreview(compressed) // Set local preview immediately
        setImageSize({ width: canvas.width, height: canvas.height })

        try {
          // Create a unique and sanitized filename
          // Correction : safeSlug = slug (déjà unique et sans caractères spéciaux)
          const safeSlug = slug;
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 8);
          const filename = `${safeSlug}-${timestamp}-${randomString}.jpg`;
          
          // First, try to create a Blob from the compressed data URL
          const blobData = await fetch(compressed).then(r => r.blob());
          
          // Log the upload attempt
          console.log('Attempting to upload:', filename);
          console.log('File size:', Math.round(blobData.size / 1024), 'KB');
          
          const { data, error } = await supabase.storage
            .from('backgrounds')
            .upload(filename, blobData, {
              cacheControl: '3600',
              upsert: true,
              contentType: 'image/jpeg'
            });

          if (error) {
            console.error('Upload error details:', error);
            // Continue anyway as we already have the local preview
            console.log('Using local preview only due to upload error');
          } else {
            console.log('Upload successful:', data);
            
            // Get the public URL of the uploaded file
            const { data: urlData } = supabase.storage
              .from('backgrounds')
              .getPublicUrl(filename);

            if (urlData?.publicUrl) {
              console.log('Public URL:', urlData.publicUrl);
              // We can keep using the compressed local preview
              // or use the URL if needed
            }
          }
        } catch (err) {
          console.error('Error during upload process:', err);
          // Fallback to local preview only
          console.log('Using local preview only due to upload process error');
        }
      }
    }
    reader.readAsDataURL(file)
  }

  // Function to collect all customized fields
  const collectCustomizedData = () => {
    return {
      // Project setup data
      project_slug: slug,
      title,
      image: localPreview,
      rows,
      cols,
      event_date: eventDate,
      label_format: JSON.stringify(selectedFormat), // Store the selected label format

      // PhotoBooth customization data (keep only these for setups)
      booth_background_color: boothBackgroundColor,
      booth_background_image: boothBackgroundImage,
      booth_button_color: boothButtonColor,
      booth_step1_text: boothStep1Text,
      booth_step2_text: boothStep2Text,
      booth_step3_text: boothStep3Text
    };
  };

  // Save all settings from FlyerGenerator
  const handleFlyerDataUpdate = (data: FlyerData) => {
    setFlyerTitle(data.title);
    setFlyerSubtitle(data.subtitle);
    setFlyerTitleColor(data.titleColor);
    setFlyerTitleSize(data.titleSize);
    setFlyerTitleFont(data.titleFont);
    setFlyerTitlePosition(data.titlePosition);
    setFlyerSubtitleColor(data.subtitleColor);
    setFlyerSubtitleSize(data.subtitleSize);
    setFlyerSubtitleFont(data.subtitleFont);
    setFlyerSubtitlePosition(data.subtitlePosition);
    setFlyerQrCodePosition(data.qrCodePosition);
    setFlyerBackground(data.background);
    setFlyerBackgroundImage(data.uploadedBackground);
    setFlyerBackgroundBlur(data.backgroundBlur);
  };

  // Save all settings from PhotoBoothCustomizer
  const handleBoothDataUpdate = (data: BoothData) => {
    setBoothBackgroundColor(data.backgroundColor);
    setBoothBackgroundImage(data.backgroundImage);
    setBoothButtonColor(data.buttonColor);
    setBoothStep1Text(data.stepTexts.step1);
    setBoothStep2Text(data.stepTexts.step2);
    setBoothStep3Text(data.stepTexts.step3);
  };

  // Ajout: fonction pour obtenir l'id de l'utilisateur courant (admin_users)
  // Ajout: fonction utilitaire pour lire le cookie côté client (supporte plusieurs noms)
  function getCookie(names: string[]): string | null {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';').map(c => c.trim());
    for (const name of names) {
      const found = cookies.find(c => c.startsWith(`${name}=`));
      if (found) return found.split('=')[1];
    }
    return null;
  }

  // Modifie la fonction pour obtenir l'id utilisateur depuis le cookie partagé (comme UserProfileMenu)
  const getCurrentAdminUserId = async (): Promise<string | null> => {
    // Cherche d'abord shared_auth_token, puis admin_session
    const token = typeof document !== 'undefined'
      ? getCookie(['shared_auth_token', 'admin_session'])
      : null;
    if (token) {
      try {
        const decodedToken = decodeURIComponent(token);
        const userData = JSON.parse(atob(decodedToken));
        if (userData.userId) return userData.userId;
      } catch (e) {
        console.error('[DEBUG] Erreur lors du décodage du cookie partagé:', e, token);
      }
    }
    // Si aucun cookie trouvé, retourne null (pour cohérence avec UserProfileMenu)
    return null;
  };

  // Nouvelle fonction pour créer le projet dans projectsmosaic
  const handleCreateProjectMosaic = async () => {
    if (!slug || !title) {
      alert('Veuillez remplir le nom et le slug du projet.');
      return false;
    }

    try {
      // Vérifier si le projet existe déjà dans projectsmosaic
      const { data: existing, error: existingError } = await supabase
        .from('projectsmosaic')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();

      if (existingError) {
        console.error('Error checking existing projectsmosaic:', existingError);
        alert(`Erreur lors de la vérification du projet: ${existingError.message}`);
        return false;
      }

      if (existing) {
        setProjectCreated(true);
        return true; // Le projet existe déjà
      }

      // Récupérer l'id de l'utilisateur courant
      const created_by = await getCurrentAdminUserId();
      if (!created_by) {
        alert("Impossible de récupérer l'utilisateur courant.");
        return false;
      }

      // Créer le projet dans projectsmosaic
      const { error: insertError } = await supabase
        .from('projectsmosaic')
        .insert([{
          slug,
          title,
          rows,
          cols,
          image: localPreview,
          created_by,
          created_at: new Date().toISOString()
        }]);

      if (insertError) {
        console.error('Error creating projectsmosaic:', insertError);
        alert(`Erreur création projet: ${insertError.message}`);
        return false;
      }

      setProjectCreated(true);
      return true;
    } catch (err) {
      console.error('Unexpected error creating projectsmosaic:', err);
      alert('Une erreur inattendue s\'est produite lors de la création du projet.');
      return false;
    }
  };

  const handleCreate = async () => {
    if (!slug || !title || !localPreview || !eventDate) {
      alert('Veuillez remplir tous les champs.');
      return;
    }

    // S'assurer que le projet existe (sécurité)
    if (!projectCreated) {
      const ok = await handleCreateProjectMosaic();
      if (!ok) return;
    }

    // Nettoyer les setups précédents
    await supabase.from(TABLE_NAMES.SETUPS).delete().eq('project_slug', slug);

    // Collecter toutes les données personnalisées
    const setupData = collectCustomizedData();

    const { error: errSetup } = await supabase.from('setups').insert([setupData]);

    if (errSetup) {
      console.error('Error saving setup data:', errSetup);
      alert('Erreur lors de l\'enregistrement des paramètres de configuration');
      return;
    }

    setImage(localPreview);
    setGrid(rows, cols);
    setIsModalOpen(true);
    // setStep(1); // <-- Supprime cette ligne pour ne pas revenir à l'étape 2

    // Redirection vers la page admin/dashboard après succès
    setTimeout(() => {
      router.push('/admin'); // ou '/dashboard' selon votre route
    }, 1200); // Laisse le temps d'afficher le modal de succès
  };

  // Save data for current step before moving to next step
  const handleNextStep = async () => {
    // Si on passe de l'étape 0 à 1, il faut s'assurer que le projet existe AVANT d'aller plus loin
    if (step === 0) {
      // Créer le projet si pas déjà fait
      const ok = await handleCreateProjectMosaic();
      if (!ok) return;
      setStep(1);
    } 
    // Si on passe de l'étape 1 (Design) à l'étape 2 (Flyer), sauvegarder le design
    else if (step === 1) {
      // Sauvegarder le design du photobooth
      const boothData = {
        project_slug: slug,
        background_color: boothBackgroundColor,
        background_image: boothBackgroundImage,
        button_color: boothButtonColor,
        step1_text: boothStep1Text,
        step2_text: boothStep2Text,
        step3_text: boothStep3Text
      };

      // Upsert dans la table designs
      const { error } = await supabase.from('designs').upsert(boothData, { onConflict: 'project_slug' });
      if (error) {
        console.error('Error saving booth design:', error);
        alert('Erreur lors de l\'enregistrement du design du photobooth');
        return;
      }
      setStep(2);
    }
  };

  // Final save of all data
  const handleFinalSave = async () => {
    // Enregistrer le flyer
    const flyerData = {
      project_slug: slug,
      title: flyerTitle,
      subtitle: flyerSubtitle,
      title_color: flyerTitleColor,
      title_size: flyerTitleSize,
      title_font: flyerTitleFont,
      title_position: flyerTitlePosition,
      subtitle_color: flyerSubtitleColor,
      subtitle_size: flyerSubtitleSize,
      subtitle_font: flyerSubtitleFont,
      subtitle_position: flyerSubtitlePosition,
      qr_code_position: flyerQrCodePosition,
      background: flyerBackground,
      background_image: flyerBackgroundImage,
      background_blur: flyerBackgroundBlur
    };

    // Upsert dans la table flyers
    const { error: flyerError } = await supabase.from('flyers').upsert(flyerData, { onConflict: 'project_slug' });
    if (flyerError) {
      console.error('Error saving flyer data:', flyerError);
    }

    // Appeler la sauvegarde finale (setups, etc)
    handleCreate();
  };

  // Wizard steps rendering
  const steps = [
    {
      label: "Projet",
      content: (
        <div className="p-8 bg-white rounded-xl shadow-md space-y-8">
          {/* Project info section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-blue-100">
            <h3 className="text-xl font-semibold text-blue-800 mb-5 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Informations du projet
              <span className="ml-2 text-xs text-red-500 font-normal">* Champs obligatoires</span>
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 font-medium text-blue-700">
                  Nom du projet <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  <input
                    className="w-full border border-blue-200 bg-white rounded-lg px-10 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nom de votre événement"
                  />
                </div>
              </div>
              {/* Slug (identifiant) - champ supprimé, slug généré automatiquement */}
              {/* <div>
                <label className="block mb-2 font-medium text-blue-700">
                  Slug (identifiant) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </span>
                  <input
                    className="w-full border border-blue-200 bg-white rounded-lg px-10 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    value={slug}
                    onChange={handleSlugChange}
                    placeholder="identifiant-unique-sans-espaces"
                  />
                </div>
                <p className="mt-1 text-xs text-blue-600">Utilisé pour les URL, uniquement lettres, chiffres et tirets</p>
              </div> */}
              <div>
                <label className="block mb-2 font-medium text-blue-700">
                  Date de l&apos;événement <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full border border-blue-200 bg-white rounded-lg px-10 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-2 font-medium text-blue-700">
                  Image principale <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="main-image-upload"
                    className="inline-flex items-center px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow cursor-pointer font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Choisir une image
                    <input
                      id="main-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {localPreview ? (
                    <div className="relative group">
                      <Image
                        src={localPreview}
                        alt="Aperçu"
                        width={64}
                        height={64}
                        className="h-16 w-16 object-cover rounded-lg shadow border border-indigo-200"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Format section */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-purple-100">
            <h3 className="text-xl font-semibold text-purple-800 mb-5 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              Format et dimensions
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block mb-3 font-medium text-purple-700">Format d&apos;étiquette</label>
                <div className="flex flex-wrap gap-4">
                  {LABEL_FORMATS.map(format => (
                    <label 
                      key={format.name} 
                      className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                        selectedFormat.name === format.name 
                          ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg border border-purple-400' 
                          : 'bg-white border border-purple-200 text-purple-800 hover:bg-purple-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        checked={selectedFormat.name === format.name}
                        onChange={() => setSelectedFormat(format)}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                          selectedFormat.name === format.name ? 'bg-white' : 'bg-purple-100'
                        }`}>
                          {selectedFormat.name === format.name && (
                            <div className="h-3 w-3 rounded-full bg-indigo-600"></div>
                          )}
                        </div>
                        <span className="font-medium">{format.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500">Nombre de lignes</label>
                      <div className="flex items-center mt-1">
                        <button 
                          className="h-10 w-10 rounded-l-lg bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center justify-center"
                          onClick={() => rows > 1 && setRows(rows - 1)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <input
                          type="number"
                          value={rows}
                          onChange={(e) => setRows(Number(e.target.value))}
                          min={1}
                          className="h-10 w-16 border-y border-purple-200 text-center focus:outline-none text-lg font-semibold text-purple-800"
                        />
                        <button 
                          className="h-10 w-10 rounded-r-lg bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center justify-center"
                          onClick={() => setRows(rows + 1)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500">Nombre de colonnes</label>
                      <div className="font-semibold text-xl text-indigo-700 mt-1">{cols}</div>
                      <span className="text-xs text-gray-500">(calculé automatiquement)</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-3 rounded-lg">
                  <div className="text-xs text-indigo-100">Total photos</div>
                  <div className="text-xl font-bold">{rows * cols}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 rounded-lg">
                  <div className="text-xs text-blue-100">Format étiquette</div>
                  <div className="text-xl font-bold">{selectedFormat.widthMM} × {selectedFormat.heightMM}<span className="text-sm"> mm</span></div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-3 rounded-lg col-span-2">
                  <div className="text-xs text-purple-100">Dimension finale</div>
                  <div className="text-xl font-bold">
                    {((selectedFormat.widthMM * cols) / 10).toFixed(1)} × {((selectedFormat.heightMM * rows) / 10).toFixed(1)}<span className="text-sm"> cm</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {localPreview && (
            <div className="flex flex-col md:flex-row gap-8 mt-6">
              <div className="flex-1 bg-white p-4 rounded-xl shadow-md border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Aperçu du découpage
                  </h4>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Grille {rows}×{cols}</span>
                </div>
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-3 rounded-lg shadow-inner">
                  <canvas ref={canvasRef} style={{ 
                    maxWidth: '100%', 
                    border: '1px solid #ccc', 
                    borderRadius: 8,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }} />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  Plan de collage
                </h4>
                <GridReference 
                  rows={rows} 
                  cols={cols} 
                  formatWidthMM={selectedFormat.widthMM}
                  formatHeightMM={selectedFormat.heightMM}
                  image={localPreview}
                />
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      label: "Design",
      content: (
        <div className="bg-white rounded-xl shadow-md p-8">
          <PhotoBoothCustomizer 
            initialSlug={slug} 
            forceSlug={slug} 
            hideProjectSelect 
            onDataChange={handleBoothDataUpdate}
          />
        </div>
      )
    },
    {
      label: "Flyer",
      content: (
        <div className="bg-white rounded-xl shadow-md p-8">
          <FlyerGenerator 
            initialSlug={slug} 
            forceSlug={slug} 
            hideProjectSelect 
            onDataChange={handleFlyerDataUpdate}
          />
        </div>
      )
    }
  ]

  // Wizard header
  function StepHeader() {
    return (
      <div className="flex items-center justify-center gap-4 mb-8">
        {steps.map((s, idx) => (
          <div key={s.label} className="flex items-center">
            <div className={`rounded-full w-8 h-8 flex items-center justify-center font-bold text-white ${step === idx ? 'bg-indigo-600' : 'bg-gray-300'}`}>
              {idx + 1}
            </div>
            <span className={`ml-2 font-semibold ${step === idx ? 'text-indigo-700' : 'text-gray-500'}`}>{s.label}</span>
            {idx < steps.length - 1 && <span className="mx-3 text-gray-400">→</span>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header gradient */}
      <div className="p-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg shadow text-white mb-2">
        <h2 className="text-3xl font-bold mb-2">Créer un nouveau projet</h2>
        <p className="text-white text-opacity-80">Configurez un nouveau mur mosaïque photo pour votre événement.</p>
        <p className="text-white text-opacity-70 mt-2">
          Importez l’image principale, choisissez le format des étiquettes et définissez le nombre de lignes pour générer automatiquement votre grille mosaïque personnalisée.
        </p>
      </div>

      {/* Wizard steps header */}
      <StepHeader />

      {/* Wizard step content */}
      <div>
        {steps[step].content}
      </div>

      {/* Wizard navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className={`px-6 py-2 rounded font-semibold shadow transition ${step === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-br from-gray-200 to-gray-400 text-gray-700 hover:from-gray-300 hover:to-gray-500'}`}
        >
          ← Précédent
        </button>
        {step < steps.length - 1 ? (
          <button
            onClick={handleNextStep}
            disabled={
              (step === 0 && (!slug || !title || !localPreview || !eventDate))
            }
            className={`px-6 py-2 rounded font-semibold shadow transition ${
              (step === 0 && (!slug || !title || !localPreview || !eventDate))
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
            }`}
          >
            Suivant →
          </button>
        ) : (
          <button
            onClick={handleFinalSave}
            disabled={!slug || !title || !localPreview || !eventDate}
            className={`px-6 py-2 rounded font-semibold shadow transition ${
              (!slug || !title || !localPreview || !eventDate)
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-br from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
            }`}
          >
            🚀 Enregistrer et lancer le projet
          </button>
        )}
      </div>

      {/* Modal for success message */}
      <Modal isOpen={isModalOpen} onClose={() => {
        setIsModalOpen(false);
        router.push('/admin'); // ou '/dashboard'
      }}>
        <div className="text-center">
          <h3 className="text-2xl font-bold text-purple-700 mb-4">✅ Projet créé avec succès !</h3>
          <p className="text-gray-600">Votre projet a été créé et est prêt à être utilisé.</p>
          <button
            onClick={() => {
              setIsModalOpen(false);
              router.push('/admin'); // ou '/dashboard'
            }}
            className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold shadow"
          >
            OK
          </button>
        </div>
      </Modal>
    </div>
  )
}

// Ajoutez ce composant à la fin du fichier (en dehors de CreateProject)
function GridReference({ 
  rows, 
  cols, 
  formatWidthMM, 
  formatHeightMM, 
  image 
}: { 
  rows: number; 
  cols: number; 
  formatWidthMM: number;
  formatHeightMM: number;
  image: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);

  // Calculate total dimensions in cm
  const totalWidthCM = (formatWidthMM * cols) / 10;
  const totalHeightCM = (formatHeightMM * rows) / 10;

  // Generate printable collage plan
  const generatePrintablePlan = useCallback(() => {
    if (!canvasRef.current || !image) return;
    
    setIsGenerating(true);
    setGeneratedPreview(null);
    
    // Create a high-resolution canvas for printing
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Scale: 1mm = 10px for better detail on screen and print
    // This creates a high-resolution image that properly scales when printed
    const SCALE_FACTOR = 10;
    
    // Set canvas size based on real dimensions (10px = 1mm for better resolution)
    canvas.width = formatWidthMM * cols * SCALE_FACTOR;
    canvas.height = formatHeightMM * rows * SCALE_FACTOR;
    
    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    
    // Draw horizontal grid lines
    for (let r = 0; r <= rows; r++) {
      const y = r * formatHeightMM * SCALE_FACTOR;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Draw vertical grid lines
    for (let c = 0; c <= cols; c++) {
      const x = c * formatWidthMM * SCALE_FACTOR;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Add labels to cells
    ctx.fillStyle = '#000000';
    const fontSize = Math.min(formatWidthMM, formatHeightMM) * SCALE_FACTOR * 0.2;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ref = `${String.fromCharCode(65 + r)}${c + 1}`;
        const x = c * formatWidthMM * SCALE_FACTOR + (formatWidthMM * SCALE_FACTOR / 2);
        const y = r * formatHeightMM * SCALE_FACTOR + (formatHeightMM * SCALE_FACTOR / 2);
        
        ctx.fillText(ref, x, y);
      }
    }

    // Generate a small preview of the canvas
    const previewCanvas = document.createElement('canvas');
    const previewCtx = previewCanvas.getContext('2d');
    if (previewCtx) {
      // Create a scaled-down preview
      const MAX_PREVIEW_WIDTH = 300;
      const scale = Math.min(1, MAX_PREVIEW_WIDTH / canvas.width);
      
      previewCanvas.width = canvas.width * scale;
      previewCanvas.height = canvas.height * scale;
      
      previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
      setGeneratedPreview(previewCanvas.toDataURL('image/jpeg'));
    }
    
    setIsGenerating(false);
  }, [rows, cols, formatWidthMM, formatHeightMM, image]);
  
  // Download the generated plan
  const downloadPrintablePlan = useCallback(() => {
    if (!canvasRef.current) return;
    
    // First ensure the canvas has content
    if (!generatedPreview) {
      generatePrintablePlan();
      // Need to wait for generation to complete, so exit for now
      return;
    }
    
    // Then create download link
    const link = document.createElement('a');
    link.download = `grille-${rows}x${cols}-${formatWidthMM}x${formatHeightMM}mm.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatePrintablePlan, rows, cols, formatWidthMM, formatHeightMM, generatedPreview]);

  // Generate the preview on component mount or when parameters change
  useEffect(() => {
    if (image) {
      generatePrintablePlan();
    }
  }, [generatePrintablePlan, image]);

  // Fix: Only return a single root element (no extra comments or code outside the <div>)
  return (
    <div className="space-y-6 max-w-full">
      {/* Cell reference mini-grid preview */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-indigo-100">
        <h4 className="text-sm font-medium text-gray-500 uppercase mb-3">Référencement des cellules</h4>
        <div
          className="custom-scrollbar"
          style={{
            maxWidth: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 28px)`,
              gridTemplateRows: `repeat(${rows}, 28px)`,
              gap: 2,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#fff',
              padding: 4,
              width: 'max-content',
            }}
          >
            {Array.from({ length: rows * cols }).map((_, idx) => {
              const row = Math.floor(idx / cols)
              const col = idx % cols
              const ref = `${String.fromCharCode(65 + row)}${col + 1}`
              return (
                <div
                  key={ref}
                  style={{
                    width: 26,
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#4B5563',
                    background: 'linear-gradient(to bottom, #F9FAFB, #F3F4F6)',
                    borderRadius: 4,
                    border: '1px solid #e5e7eb',
                    userSelect: 'none',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                  title={ref}
                >
                  {ref}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {generatedPreview && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
            <h4 className="font-medium text-indigo-800">Aperçu du plan de collage</h4>
            <p className="text-xs text-indigo-500">Plan à l&apos;échelle réelle pour impression</p>
          </div>
          <div className="p-4">
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <Image 
                src={generatedPreview} 
                alt="Aperçu du plan de collage" 
                width={400}
                height={300}
                style={{ maxWidth: '100%', height: 'auto', display: 'block' }} 
              />
            </div>
          </div>
        </div>
      )}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md border border-indigo-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3">
          <h4 className="font-semibold text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m-1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Informations d&apos;impression
          </h4>
        </div>
        <div className="p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center p-3 bg-white rounded-lg shadow-sm border border-blue-50">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-gray-500">Format total</div>
                <div className="font-bold text-lg text-blue-800">{totalWidthCM.toFixed(1)} × {totalHeightCM.toFixed(1)} cm</div>
              </div>
            </div>
            <div className="flex items-center p-3 bg-white rounded-lg shadow-sm border border-blue-50">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 002-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-gray-500">Format étiquettes</div>
                <div className="font-bold text-lg text-indigo-800">{formatWidthMM} × {formatHeightMM} mm</div>
              </div>
            </div>
            <div className="flex items-center p-3 bg-white rounded-lg shadow-sm border border-blue-50">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-gray-500">Configuration</div>
                <div className="font-bold text-lg text-purple-800">{rows} × {cols}</div>
              </div>
            </div>
            <div className="flex items-center p-3 bg-white rounded-lg shadow-sm border border-blue-50">
              <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-gray-500">Nombre d&apos;étiquettes</div>
                <div className="font-bold text-lg text-pink-800">{rows * cols}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <button
          className="relative px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition flex items-center justify-center font-semibold group overflow-hidden"
          onClick={downloadPrintablePlan}
          disabled={isGenerating || !image}
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 group-hover:opacity-20 transition-opacity"></span>
          {isGenerating ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Génération en cours...</span>
            </div>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger plan de collage à l&apos;échelle réelle
            </>
          )}
        </button>
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200 shadow-md">
          <div className="flex items-start mb-3">
            <div className="bg-amber-100 rounded-full p-1 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-700" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            </div>
            <h5 className="font-medium text-amber-800">Instructions d&apos;impression</h5>
          </div>
          <ul className="space-y-2 text-sm text-amber-800 ml-9">
            <li className="flex items-center">
              <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mr-2"></span>
              Format à l&apos;échelle réelle (10 pixels = 1mm)
            </li>
            <li className="flex items-center">
              <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mr-2"></span>
              Option d&apos;impression: <strong>Taille réelle</strong> ou <strong>100%</strong>
            </li>
            <li className="flex items-center">
              <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mr-2"></span>
              Pour grands formats: impression Poster ou plusieurs pages
            </li>
          </ul>
        </div>
      </div>
      <canvas 
        ref={canvasRef} 
        className="hidden"
      />
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          background-color: #F3F4F6;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #CBD5E1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94A3B8;
        }
      `}</style>
    </div>
  )
}

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
  qrCodePosition: string
  background: string
  uploadedBackground: string | null
  backgroundBlur: number
  project_slug: string
}

type BoothData = {
  backgroundColor: string
  backgroundImage: string
  buttonColor: string
  stepTexts: {
    step1: string
    step2: string
    step3: string
  }
  project_slug: string
}