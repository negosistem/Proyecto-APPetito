import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, X, Loader2, Upload, Image as ImageIcon, Video, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { menuService, Product } from '../services/menuService';

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formDish, setFormDish] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Entradas',
    is_active: true,
    image_url: '',
    video_url: ''
  });

  // File upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const fetchMenu = async () => {
    setIsLoading(true);
    try {
      const data = await menuService.getProducts();
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
      setEditingId(product.id);
      setFormDish({
        name: product.name,
        description: product.description || '',
        price: String(product.price),
        category: product.category,
        is_active: product.is_active,
        image_url: product.image_url || '',
        video_url: product.video_url || ''
      });
      // Set existing media previews
      setImagePreview(getMediaUrl(product.image_url));
      setVideoPreview(getMediaUrl(product.video_url));
    } else {
      setEditingId(null);
      setFormDish({
        name: '',
        description: '',
        price: '',
        category: 'Entradas',
        is_active: true,
        image_url: '',
        video_url: ''
      });
      setImagePreview(null);
      setVideoPreview(null);
    }
    setImageFile(null);
    setVideoFile(null);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de archivo no válido. Solo JPG, PNG, WebP');
      return;
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Archivo demasiado grande. Máximo 20MB');
      return;
    }

    setImageFile(file);
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'video/mp4') {
      toast.error('Tipo de archivo no válido. Solo MP4');
      return;
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Archivo demasiado grande. Máximo 20MB');
      return;
    }

    setVideoFile(file);
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setVideoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormDish(prev => ({ ...prev, image_url: '' }));
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setFormDish(prev => ({ ...prev, video_url: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDish.name || !formDish.price) {
      toast.error('Nombre y precio son obligatorios');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = formDish.image_url;
      let videoUrl = formDish.video_url;

      // Upload image if new file selected
      if (imageFile) {
        const result = await menuService.uploadMedia(imageFile, 'image');
        imageUrl = result.url;
      }

      // Upload video if new file selected
      if (videoFile) {
        const result = await menuService.uploadMedia(videoFile, 'video');
        videoUrl = result.url;
      }

      const productData = {
        ...formDish,
        price: parseFloat(formDish.price),
        image_url: imageUrl,
        video_url: videoUrl
      };

      if (editingId) {
        await menuService.updateProduct(editingId, productData);
        toast.success('¡Plato actualizado con éxito!');
      } else {
        await menuService.createProduct(productData);
        toast.success('¡Plato creado con éxito!');
      }
      setIsModalOpen(false);
      fetchMenu();
    } catch (error) {
      toast.error(editingId ? 'Error al actualizar el plato' : 'Error al crear el plato');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este plato?')) return;

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
              className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="h-32 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center text-4xl overflow-hidden relative">
                {plato.video_url ? (
                  <video
                    src={getMediaUrl(plato.video_url)!}
                    className="h-full w-full object-cover"
                    controls
                  />
                ) : plato.image_url ? (
                  <img
                    src={getMediaUrl(plato.image_url)!}
                    alt={plato.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-6xl">🍽️</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-900 truncate" title={plato.name}>{plato.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${plato.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {plato.is_active ? 'Disponible' : 'Agotado'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-1">{plato.category}</p>
                <p className="text-sm text-slate-600 mb-3 line-clamp-2 min-h-[2.5rem]">{plato.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-900">${plato.price.toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de Nuevo/Editar Plato */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId ? 'Editar Plato' : 'Nuevo Plato'}
                </h2>
                {editingId ? (
                  <button
                    onClick={() => handleDelete(editingId)}
                    className="p-2 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={formDish.name}
                    onChange={(e) => setFormDish({ ...formDish, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Ej: Tacos al Pastor"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Precio</label>
                    <input
                      type="number"
                      required
                      value={formDish.price}
                      onChange={(e) => setFormDish({ ...formDish, price: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                    <select
                      value={formDish.category}
                      onChange={(e) => setFormDish({ ...formDish, category: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      {categoriasEstaticas.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                  <textarea
                    value={formDish.description}
                    onChange={(e) => setFormDish({ ...formDish, description: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none h-24 resize-none"
                    placeholder="Describe el plato..."
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <ImageIcon className="w-4 h-4 inline mr-1" />
                    Imagen del producto
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer">
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-orange-500 transition-colors">
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-6 h-6 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            {imageFile ? imageFile.name : 'Subir imagen (JPG, PNG, WebP)'}
                          </span>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    {imagePreview && (
                      <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 relative group">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-1 right-1 p-1 bg-white/80 rounded-full hover:bg-white text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          title="Eliminar imagen"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Video Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Video className="w-4 h-4 inline mr-1" />
                    Video del producto
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer">
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-orange-500 transition-colors">
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-6 h-6 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            {videoFile ? videoFile.name : 'Subir video (MP4)'}
                          </span>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="video/mp4"
                        onChange={handleVideoChange}
                        className="hidden"
                      />
                    </label>
                    {videoPreview && (
                      <div className="w-32 h-24 rounded-lg overflow-hidden border border-slate-200 relative group">
                        <video src={videoPreview} className="w-full h-full object-cover" controls />
                        <button
                          type="button"
                          onClick={handleRemoveVideo}
                          className="absolute top-1 right-1 p-1 bg-white/80 rounded-full hover:bg-white text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                          title="Eliminar video"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formDish.is_active}
                    onChange={(e) => setFormDish({ ...formDish, is_active: e.target.checked })}
                    className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-slate-700 font-medium">Disponible inmediatamente</label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium shadow-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingId ? 'Actualizar producto' : 'Crear Plato'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
