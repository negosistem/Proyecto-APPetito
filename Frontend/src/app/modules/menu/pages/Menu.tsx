import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, X, Loader2, Upload, Image as ImageIcon, Video, Trash2, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { toast } from 'sonner';

import { menuService, Product } from '../services/menuService';
import { formatNumber } from '@/lib/formatNumber';
import { ProductConfigModal } from '../components/ProductConfigModal';

const categoriasEstaticas = ['Entradas', 'Platos Principales', 'Postres', 'Bebidas'];

const getMediaUrl = (url: string | null | undefined) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${url}`;
};

export default function Menu() {
  const [platosData, setPlatosData] = useState<Product[]>([]);
  const [categorias, setCategorias] = useState<string[]>(categoriasEstaticas);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMenu = async () => {
    setIsLoading(true);
    try {
      const data = await menuService.getProducts(true);
      setPlatosData(data);

      // Extraer categorías únicas de los datos reales si existen
      if (data.length > 0) {
        const uniqueCats = await menuService.getCategories(data);
        if (uniqueCats.length > 0) {
          setCategorias(uniqueCats);
        }
      }
    } catch (error) {
      toast.error('Error al cargar el menú');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchMenu();
  }, []);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
    } else {
      setEditingProduct(null);
    }
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (
    productData: any, 
    imageFile: File | null, 
    videoFile: File | null, 
    newGalleryFiles: File[], 
    galleryImagesState: any[]
  ) => {
    setIsSubmitting(true);
    try {
      let imageUrl = productData.image_url;
      let videoUrl = productData.video_url;

      if (imageFile) {
        const result = await menuService.uploadMedia(imageFile, 'image');
        imageUrl = result.url;
      }
      if (videoFile) {
        const result = await menuService.uploadMedia(videoFile, 'video');
        videoUrl = result.url;
      }
      
      const finalImages = galleryImagesState
        .filter(img => img.isExisting && !img.isDeleted)
        .map(img => ({
          url: img.url.replace(import.meta.env.VITE_API_URL || 'http://localhost:8000', ''),
          order: 0
        }));

      const payload = {
        ...productData,
        image_url: imageUrl,
        video_url: videoUrl,
        images: finalImages
      };

      let savedProduct: Product;
      if (editingProduct?.id) {
        savedProduct = await menuService.updateProduct(editingProduct.id, payload);
      } else {
        savedProduct = await menuService.createProduct(payload);
      }

      if (newGalleryFiles.length > 0) {
        await menuService.uploadImages(savedProduct.id, newGalleryFiles);
      }

      toast.success(editingProduct?.id ? '¡Plato actualizado con éxito!' : '¡Plato creado con éxito!');
      setIsModalOpen(false);
      fetchMenu();
    } catch (error) {
      toast.error(editingProduct?.id ? 'Error al actualizar el plato' : 'Error al crear el plato');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿De verdad desea eliminar el producto?')) return;

    try {
      await menuService.deleteProduct(id);
      toast.success('Plato eliminado');
      setIsModalOpen(false);
      fetchMenu();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || 'Error al eliminar el plato');
    }
  };

  const platosFiltrados = platosData.filter(plato => {
    const matchCategoria = categoriaActiva === 'Todos' || plato.category === categoriaActiva;
    const matchSearch = plato.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (plato.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    return matchCategoria && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Menú</h1>
          <p className="text-slate-600">Gestión de platos y categorías</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-shadow flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Plato
        </motion.button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar plato..."
          className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setCategoriaActiva('Todos')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${categoriaActiva === 'Todos'
            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
        >
          Todos
        </motion.button>
        {categorias.map((cat) => (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCategoriaActiva(cat)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${categoriaActiva === cat
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            {cat}
          </motion.button>
        ))}
      </div>

      {/* Menu Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {platosFiltrados.map((plato, index) => (
            <motion.div
              key={plato.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleOpenModal(plato)}
              className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <ProductMedia plato={plato} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-900 truncate" title={plato.name}>{plato.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${plato.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {plato.is_active ? 'Disponible' : 'Agotado'}
                  </span>
                </div>
                
                {/* Visual Indicators for specific configurations */}
                <div className="flex gap-2 mb-2">
                  {(plato.ingredients && plato.ingredients.length > 0) && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium">Ingredientes Configurados</span>
                  )}
                  {(plato.extras && plato.extras.length > 0) && (
                    <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded font-medium border border-orange-100">+{plato.extras.length} Extras</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs text-slate-500">{plato.category}</p>
                  {plato.tiempo_preparacion && (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-[10px] font-medium px-2 py-0.5 rounded-full border border-amber-200">
                      <Clock size={10} />
                      {plato.tiempo_preparacion} min
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-3 line-clamp-2 min-h-[2.5rem]">{plato.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-900 text-right">{formatNumber(plato.price)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      <ProductConfigModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        onSave={handleSaveProduct}
        isSubmitting={isSubmitting}
        onDelete={handleDelete}
      />
    </div>
  );
}

// Sub-component for product media with mini-carousel
function ProductMedia({ plato }: { plato: Product }) {
  const [currentIdx, setCurrentIdx] = useState(0);

  // Combine single image and gallery
  const allImages = [
    ...(plato.image_url ? [plato.image_url] : []),
    ...(plato.images?.map(img => img.url) || [])
  ];

  const hasMultiple = allImages.length > 1;

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx(prev => (prev + 1) % allImages.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx(prev => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="h-32 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center text-4xl overflow-hidden relative group/media">
      {plato.video_url ? (
        <video
          src={getMediaUrl(plato.video_url)!}
          className="h-full w-full object-cover"
          onMouseOver={e => e.currentTarget.play()}
          onMouseOut={e => e.currentTarget.pause()}
          muted
          loop
        />
      ) : allImages.length > 0 ? (
        <>
          <img
            src={getMediaUrl(allImages[currentIdx])!}
            alt={plato.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          {hasMultiple && (
            <>
              <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover/media:opacity-100 transition-opacity">
                <button onClick={prev} className="p-1 bg-white/80 rounded-full hover:bg-white text-slate-800 shadow-sm">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={next} className="p-1 bg-white/80 rounded-full hover:bg-white text-slate-800 shadow-sm">
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {allImages.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-all ${i === currentIdx ? 'bg-orange-500 w-3' : 'bg-white/60'}`}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <span className="text-6xl">🍽️</span>
      )}
    </div>
  );
}
