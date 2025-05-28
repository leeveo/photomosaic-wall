'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from './Modal'

type BoothConfig = {
  backgroundColor: string
  backgroundImage: string
  buttonColor: string
  stepTexts: {
    step1: string
    step2: string
    step3: string
  }
}

type Project = {
  slug: string
  title: string
}

const PREDEFINED_BACKGROUNDS = [
  { name: 'Plage', value: '/backgrounds/beach.jpg' },
  { name: 'Fête', value: '/backgrounds/party.jpg' },
  { name: 'Étoiles', value: '/backgrounds/stars.jpg' },
]

interface PhotoBoothCustomizerProps {
  initialSlug?: string;
  forceSlug?: string;
  hideProjectSelect?: boolean;
  onDataChange?: (data: BoothConfig & { project_slug: string }) => void;
}

export default function PhotoBoothCustomizer({ 
  initialSlug = '', 
  forceSlug, 
  hideProjectSelect = false,
  onDataChange
}: PhotoBoothCustomizerProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedSlug, setSelectedSlug] = useState(initialSlug)
  const [config, setConfig] = useState<BoothConfig>({
    backgroundColor: '#000000',
    backgroundImage: '',
    buttonColor: '#16a34a',
    stepTexts: {
      step1: 'Prêt à commencer ?',
      step2: 'Cadrez-vous bien !',
      step3: 'Voici votre photo, voulez-vous la valider ?',
    },
  })

  const [showModal, setShowModal] = useState(false)
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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
        if (data) setProjects(data)
      });
    }
  }, [forceSlug, initialSlug, hideProjectSelect])

  useEffect(() => {
    if (!selectedSlug) return;

    const fetchDesign = async () => {
      const { data } = await supabase
        .from('designs')
        .select('*')
        .eq('project_slug', selectedSlug)
        .single();

      if (data) {
        setConfig({
          backgroundColor: data.background_color,
          backgroundImage: data.background_image,
          buttonColor: data.button_color,
          stepTexts: {
            step1: data.step1_text,
            step2: data.step2_text,
            step3: data.step3_text,
          },
        });
      } else {
        setConfig({
          backgroundColor: '#000000',
          backgroundImage: '',
          buttonColor: '#16a34a',
          stepTexts: {
            step1: 'Prêt à commencer ?',
            step2: 'Cadrez-vous bien !',
            step3: 'Voici votre photo, voulez-vous la valider ?',
          },
        });
      }
    };

    fetchDesign();
  }, [selectedSlug]);

  const handleChange = <K extends keyof BoothConfig>(key: K, value: BoothConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleTextChange = (step: keyof BoothConfig['stepTexts'], value: string) => {
    setConfig(prev => ({
      ...prev,
      stepTexts: { ...prev.stepTexts, [step]: value },
    }));
  };

  const handleBackgroundImageSelect = (url: string) => {
    setConfig(prev => ({ ...prev, backgroundImage: url }));
    setShowBgPicker(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSlug) return;

    const filename = `${selectedSlug}-${Date.now()}.${file.name.split('.').pop()}`;
    const { data, error } = await supabase.storage
      .from('backgrounds')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (!error) {
      const { data: urlData } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(filename);

      if (urlData?.publicUrl) {
        setConfig(prev => ({ ...prev, backgroundImage: urlData.publicUrl }));
      }
    } else {
      alert("Erreur lors de l'upload de l'image.");
    }
  };

  const handleSave = async () => {
    if (!selectedSlug) return;

    setIsSaving(true);
    
    const updateData = {
      project_slug: selectedSlug,
      background_color: config.backgroundColor,
      background_image: config.backgroundImage,
      button_color: config.buttonColor,
      step1_text: config.stepTexts.step1,
      step2_text: config.stepTexts.step2,
      step3_text: config.stepTexts.step3,
    };

    const { error } = await supabase
      .from('designs')
      .upsert(updateData, { onConflict: 'project_slug' });

    setIsSaving(false);
    
    if (!error) setShowModal(true);
    else alert('❌ Erreur lors de la sauvegarde.');
  };

  // Call onDataChange whenever config changes
  useEffect(() => {
    if (onDataChange && selectedSlug) {
      onDataChange({
        ...config,
        project_slug: selectedSlug
      });
    }
  }, [config, selectedSlug, onDataChange]);

  return (
    <div className="space-y-8 max-w-6xl">
      {!hideProjectSelect && (
        <div className="p-6 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-500 rounded-lg shadow text-white mb-2">
          <h2 className="text-3xl font-bold mb-2">🎨 Design du Photobooth</h2>
          <p className="text-white text-opacity-80">Personnalisez l'apparence de votre photobooth pour votre événement.</p>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
          
          {/* Design section */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl shadow-md border border-purple-100">
            <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Couleurs et Arrière-plan
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className="block mb-2 font-medium text-purple-700">Image d'arrière-plan</label>
                <div className="flex flex-wrap gap-3 items-center">
                  <label
                    htmlFor="background-upload"
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg shadow cursor-pointer font-medium hover:from-purple-600 hover:to-indigo-700 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Choisir un fichier
                    <input
                      id="background-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleUpload}
                      className="hidden"
                    />
                  </label>
                  
                  <button
                    onClick={() => setShowBgPicker(true)}
                    className="px-4 py-2 bg-white border border-purple-300 text-purple-700 rounded-lg shadow-sm hover:bg-purple-50 transition-all font-medium flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Galerie
                  </button>
                  
                  {config.backgroundImage && (
                    <div className="relative group h-14 w-14 rounded-lg shadow-sm overflow-hidden border border-purple-200">
                      <img 
                        src={config.backgroundImage} 
                        alt="Aperçu arrière-plan" 
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-purple-600">Choisissez une image d'arrière-plan pour votre photobooth.</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block mb-2 font-medium text-purple-700">Couleur d'arrière-plan</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={config.backgroundColor}
                      onChange={(e) => handleChange('backgroundColor', e.target.value)}
                      className="h-10 w-14 rounded shadow-sm cursor-pointer"
                    />
                    <span className="text-gray-700 font-mono text-sm">{config.backgroundColor}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block mb-2 font-medium text-purple-700">Couleur des boutons</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={config.buttonColor}
                      onChange={(e) => handleChange('buttonColor', e.target.value)}
                      className="h-10 w-14 rounded shadow-sm cursor-pointer"
                    />
                    <span className="text-gray-700 font-mono text-sm">{config.buttonColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Text section */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl shadow-md border border-blue-100">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Textes des étapes
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-medium text-blue-700">Étape 1 - Début</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="w-full border border-blue-200 bg-white rounded-lg pl-10 pr-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    value={config.stepTexts.step1}
                    onChange={(e) => handleTextChange('step1', e.target.value)}
                    placeholder="Texte pour l'étape 1"
                  />
                </div>
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-blue-700">Étape 2 - Cadrage</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-8h1V5h-1v2zm0 8h1v-2h-1v2zM9 5h1V3H9v2zm0 8h1v-2H9v2zm-2-8h1V3H7v2zm0 8h1v-2H7v2z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="w-full border border-blue-200 bg-white rounded-lg pl-10 pr-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    value={config.stepTexts.step2}
                    onChange={(e) => handleTextChange('step2', e.target.value)}
                    placeholder="Texte pour l'étape 2"
                  />
                </div>
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-blue-700">Étape 3 - Validation</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="w-full border border-blue-200 bg-white rounded-lg pl-10 pr-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    value={config.stepTexts.step3}
                    onChange={(e) => handleTextChange('step3', e.target.value)}
                    placeholder="Texte pour l'étape 3"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={!selectedSlug || isSaving}
            className={`relative w-full px-6 py-3 rounded-xl font-semibold shadow transition flex items-center justify-center ${
              !selectedSlug || isSaving
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700'
            }`}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enregistrement...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                </svg>
                Enregistrer les modifications
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Aperçu sur Mobile (Portrait)
              </h3>
            </div>
            <div className="p-6 flex justify-center bg-gray-100">
              <PreviewMockup config={config} ratioClass="aspect-[9/16]" widthClass="w-[240px]" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-gray-700 to-gray-900 p-4 text-white">
              <h3 className="font-semibold flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Aperçu sur Tablette (Paysage)
              </h3>
            </div>
            <div className="p-6 flex justify-center bg-gray-100">
              <PreviewMockup config={config} ratioClass="aspect-[16/9]" widthClass="w-full" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Success Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Design enregistré</h3>
          <p className="text-gray-600 mb-6">Les modifications du design ont été sauvegardées avec succès.</p>
          <button
            onClick={() => setShowModal(false)}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold shadow hover:from-blue-700 hover:to-purple-700"
          >
            OK
          </button>
        </div>
      </Modal>
      
      {/* Background Gallery Modal */}
      <Modal isOpen={showBgPicker} onClose={() => setShowBgPicker(false)}>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Galerie d'arrière-plans
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            {PREDEFINED_BACKGROUNDS.map((bg) => (
              <div
                key={bg.value}
                className="relative group cursor-pointer overflow-hidden border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all"
                onClick={() => handleBackgroundImageSelect(bg.value)}
              >
                <img src={bg.value} alt={bg.name} className="w-full h-32 object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent p-3">
                  <p className="text-white font-medium text-center">{bg.name}</p>
                </div>
                <div className="absolute inset-0 bg-indigo-600 bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all">
                  <div className="bg-white rounded-full p-2 transform scale-0 group-hover:scale-100 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setShowBgPicker(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-medium hover:bg-gray-300"
            >
              Annuler
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PreviewMockup({
  config,
  ratioClass,
  widthClass,
}: {
  config: BoothConfig;
  ratioClass: string;
  widthClass: string;
}) {
  return (
    <div className={`relative ${widthClass} ${ratioClass} overflow-hidden rounded-xl shadow-lg border-8 border-gray-800`}>
      <div
        className="absolute inset-0 flex flex-col items-center justify-between p-6"
        style={{
          background: config.backgroundImage
            ? `url(${config.backgroundImage}) center/cover no-repeat`
            : config.backgroundColor,
        }}
      >
        <div className="bg-black bg-opacity-50 p-4 rounded-xl w-full text-center backdrop-blur-sm">
          <h1 className="font-bold text-lg mb-2 text-white">{config.stepTexts.step1}</h1>
        </div>
        
        <div className="space-y-4 text-center">
          <p className="text-sm text-white bg-black bg-opacity-50 px-3 py-1 rounded-lg inline-block">
            {config.stepTexts.step2}
          </p>
          
          <button
            className="px-6 py-3 rounded-lg text-white font-semibold text-sm shadow-lg"
            style={{ backgroundColor: config.buttonColor }}
          >
            Prendre une Photo
          </button>
          
          <p className="text-xs text-white bg-black bg-opacity-50 px-3 py-1 rounded-lg inline-block">
            {config.stepTexts.step3}
          </p>
        </div>
        
        {/* Device details */}
        <div className="absolute top-0 w-full flex justify-center">
          <div className="h-5 w-20 bg-gray-800 rounded-b-xl"></div>
        </div>
        <div className="absolute bottom-2 w-10 h-1 bg-gray-300 rounded-full"></div>
      </div>
    </div>
  );
}
