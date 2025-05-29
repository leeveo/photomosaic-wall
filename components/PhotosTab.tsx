import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Tile = {
  id: string
  image_url: string
  row: number
  col: number
  project_slug: string
}

type MosaicMeta = {
  slug: string
  title: string
  createdAt: string
  hasImage: boolean
  setupImage?: string | null 
  rows: number
  cols: number
  tilesCount: number
  eventDate?: string
}

type Props = {
  tiles: Tile[]
  projects: MosaicMeta[]
  selectedProject: string
  setSelectedProject: (value: string) => void
  setTiles: (tiles: Tile[]) => void
  setTileToDelete: (tile: { id: string; url: string } | null) => void
  setShowDeleteModal: (value: boolean) => void
  showDeleteModal: boolean
  tileToDelete: { id: string; url: string } | null
  deleteTile: (tileId: string, imageUrl: string) => Promise<void>
}

const PhotosTab: React.FC<Props> = ({
  tiles,
  projects,
  selectedProject,
  setSelectedProject,
  setTiles,
  setTileToDelete,
  setShowDeleteModal,
  showDeleteModal,
  tileToDelete,
  deleteTile,
}) => {
  // Direct rendering approach without processing URLs
  const filteredTiles = selectedProject === 'all'
    ? tiles
    : tiles.filter(tile => tile.project_slug === selectedProject);

  const refreshTiles = async () => {
    try {
      const { data: allTiles, error } = await supabase.from('tiles').select('*');
      
      if (error) {
        console.error("Error fetching tiles:", error);
        return;
      }
      
      console.log("Fetched tiles:", allTiles);
      setTiles(allTiles || []);
    } catch (err) {
      console.error("Error in refreshTiles:", err);
    }
  };

  // Load tiles on mount
  useEffect(() => {
    refreshTiles();
  }, []);

  const handlePrint = async (imageUrl: string) => {
    try {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const buffer = await blob.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      const response = await fetch('http://localhost:4000/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64,
          jobName: 'photo_' + Date.now()
        })
      })

      if (!response.ok) {
        const err = await response.text()
        alert('❌ Erreur impression : ' + err)
      } else {
        alert('🖨️ Impression lancée avec succès')
      }
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la préparation à l’impression.')
    }
  }

  // Function to get full image URL directly
  const getImageUrl = (filename: string): string => {
    if (filename.startsWith('http')) return filename;
    return `https://icchwywclqqoxshugiog.supabase.co/storage/v1/object/public/tiles/${filename}`;
  };

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold mb-6 text-black">🖼️ Photos par projet</h2>
      
      {/* Controls for project selection */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <label htmlFor="project-select" className="block text-sm font-medium text-gray-700 mb-0">
            Filtrer par projet :
          </label>
          <select
            id="project-select"
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-gray-100"
          >
            <option value="all">📦 Tous les projets</option>
            {projects.map(p => (
              <option key={p.slug} value={p.slug}>
                {p.title} ({p.tilesCount})
              </option>
            ))}
          </select>
          <button
            onClick={refreshTiles}
            className="inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            🔄 Actualiser
          </button>
        </div>

        {filteredTiles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucune photo trouvée pour ce projet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredTiles.map(tile => {
              // Generate the full URL directly
              const fullImageUrl = getImageUrl(tile.image_url);
              
              return (
                <div
                  key={tile.id}
                  className="relative rounded-md overflow-hidden group bg-gray-50 shadow-xl hover:shadow-2xl transition"
                >
                  {/* Use regular img tag for simplicity */}
                  <img 
                    src={fullImageUrl} 
                    alt={`Photo ${tile.project_slug} ${String.fromCharCode(65 + tile.row)}-${tile.col + 1}`}
                    className="w-full aspect-square object-cover rounded-t-md"
                    onError={(e) => {
                      console.error("Image failed to load:", fullImageUrl);
                      e.currentTarget.src = 'https://via.placeholder.com/300?text=Error';
                    }}
                  />
                  
                  <div className="absolute top-2 left-2 px-3 py-1 rounded-lg shadow-lg font-mono text-xs font-semibold bg-white/70 backdrop-blur-md text-gray-800 border border-white/60 flex flex-col items-start transition-all">
                    <span className="uppercase tracking-wide text-[11px] font-bold text-blue-700">{tile.project_slug}</span>
                    <span className="text-[11px] font-semibold text-gray-700">{String.fromCharCode(65 + tile.row)}-{tile.col + 1}</span>
                  </div>
                  <div className="absolute bottom-1 left-1 right-1 flex justify-between px-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handlePrint(tile.image_url)}
                      className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full text-xs shadow hover:from-blue-600 hover:to-purple-700"
                    >
                      🖨️
                    </button>
                    <button
                      onClick={() => {
                        setTileToDelete({ id: tile.id, url: tile.image_url })
                        setShowDeleteModal(true)
                      }}
                      className="p-2 bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-full text-xs shadow hover:from-red-600 hover:to-pink-700"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete modal with simplified image display */}
      {showDeleteModal && tileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-sm p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Supprimer cette image ?</h3>
            {/* Use img tag for simplicity */}
            <img 
              src={getImageUrl(tileToDelete.url)} 
              alt="Image to delete"
              className="w-full h-64 object-contain rounded mb-4 bg-gray-100"
            />
            <div className="text-right space-x-3">
              <button
                onClick={async () => {
                  try {
                    setShowDeleteModal(false);
                    if (!tileToDelete) return;
                    await deleteTile(tileToDelete.id, tileToDelete.url);
                    setTileToDelete(null);
                    setTiles(tiles.filter(tile => tile.id !== tileToDelete.id));
                  } catch (err) {
                    console.error("Error deleting tile:", err);
                    alert('Erreur lors de la suppression de l\'image.');
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md bg-gradient-to-br from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 shadow"
              >
                Supprimer
              </button>
              <button
                onClick={() => {
                  setTileToDelete(null)
                  setShowDeleteModal(false)
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 shadow"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PhotosTab;
