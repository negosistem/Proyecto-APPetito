import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Upload, Image as ImageIcon, Video, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Product, ProductIngredient, ProductExtra } from '../services/menuService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSave: (productData: any, imageFile: File | null, videoFile: File | null, newGalleryFiles: File[], galleryImages: any[]) => Promise<void>;
  isSubmitting: boolean;
  onDelete?: (id: number) => Promise<void>;
}

type TabType = 'general' | 'ingredients' | 'extras';

export function ProductConfigModal({ isOpen, onClose, product, onSave, isSubmitting, onDelete }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  
  // General Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Entradas');
  const [isActive, setIsActive] = useState(true);
  const [prepTime, setPrepTime] = useState('');
  const [defaultNotes, setDefaultNotes] = useState('');

  // Media
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<{ url: string; file?: File; id?: number; isExisting: boolean; isDeleted?: boolean }[]>([]);
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [existingVideoUrl, setExistingVideoUrl] = useState('');

  // Ingredients and Extras
  const [ingredients, setIngredients] = useState<Omit<ProductIngredient, 'id' | 'is_active'>[]>([]);
  const [extras, setExtras] = useState<Omit<ProductExtra, 'id' | 'is_active'>[]>([]);

  // Input States for adding new items
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientRemovable, setNewIngredientRemovable] = useState(true);
  
  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraPrice, setNewExtraPrice] = useState('');

  const categoriasEstaticas = ['Entradas', 'Platos Principales', 'Postres', 'Bebidas'];

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setName(product.name);
        setDescription(product.description || '');
        setPrice(String(product.price));
        setCategory(product.category);
        setIsActive(product.is_active);
        setPrepTime(product.tiempo_preparacion ? String(product.tiempo_preparacion) : '');
        setDefaultNotes(product.default_notes || '');
        setExistingImageUrl(product.image_url || '');
        setExistingVideoUrl(product.video_url || '');
        setImagePreview(getMediaUrl(product.image_url));
        setVideoPreview(getMediaUrl(product.video_url));
        setGalleryImages(product.images?.map(img => ({
          url: getMediaUrl(img.url) || '',
          id: img.id,
          isExisting: true
        })) || []);
        setIngredients(product.ingredients || []);
        setExtras(product.extras || []);
      } else {
        setName('');
        setDescription('');
        setPrice('');
        setCategory('Entradas');
        setIsActive(true);
        setPrepTime('');
        setDefaultNotes('');
        setImageFile(null);
        setVideoFile(null);
        setImagePreview(null);
        setVideoPreview(null);
        setExistingImageUrl('');
        setExistingVideoUrl('');
        setGalleryImages([]);
        setIngredients([]);
        setExtras([]);
      }
      setActiveTab('general');
    }
  }, [isOpen, product]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const getMediaUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${url}`;
  };

  const handleMediaValidation = (file: File, type: 'image' | 'video') => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Archivo demasiado grande. Máximo 20MB');
      return false;
    }
    if (type === 'image' && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Tipo de imagen no válido.');
      return false;
    }
    if (type === 'video' && file.type !== 'video/mp4') {
      toast.error('Tipo de video no válido. Solo MP4.');
      return false;
    }
    return true;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && handleMediaValidation(file, 'image')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && handleMediaValidation(file, 'video')) {
      setVideoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setVideoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const currentActiveImages = galleryImages.filter(img => !img.isDeleted);
    
    if (currentActiveImages.length + files.length > 5) {
      toast.error('Máximo 5 imágenes permitidas en la galería');
      return;
    }

    const newImages = files.map(file => ({
      url: URL.createObjectURL(file),
      file,
      isExisting: false
    }));

    setGalleryImages(prev => [...prev, ...newImages]);
  };

  const handleAddIngredient = () => {
    if (!newIngredientName.trim()) return;
    setIngredients([...ingredients, { name: newIngredientName.trim(), removable: newIngredientRemovable }]);
    setNewIngredientName('');
    setNewIngredientRemovable(true);
  };

  const handleAddExtra = () => {
    if (!newExtraName.trim() || !newExtraPrice || isNaN(Number(newExtraPrice))) return;
    setExtras([...extras, { name: newExtraName.trim(), price: Number(newExtraPrice) }]);
    setNewExtraName('');
    setNewExtraPrice('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) {
      toast.error('El nombre y precio son obligatorios');
      return;
    }

    const newFiles = galleryImages.filter(img => !img.isExisting).map(img => img.file!);
    
    const parsedPrepTime = prepTime === '' || isNaN(Number(prepTime)) ? null : Number(prepTime);

    const productData = {
      name,
      description,
      price: parseFloat(price),
      category,
      is_active: isActive,
      tiempo_preparacion: parsedPrepTime,
      default_notes: defaultNotes,
      ingredients,
      extras,
      image_url: existingImageUrl, // Will be overridden if imageFile is present inside the onSave logic
      video_url: existingVideoUrl, 
    };

    await onSave(productData, imageFile, videoFile, newFiles, galleryImages);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">
                {product ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              {product && onDelete ? (
                <button 
                  onClick={() => onDelete(product.id)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors text-slate-400 hover:text-red-600"
                  title="Eliminar producto"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              ) : (
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
                  title="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-slate-200 shrink-0 bg-white px-6">
              {[
                { id: 'general', label: 'General' },
                { id: 'ingredients', label: `Ingredientes (${ingredients.length})` },
                { id: 'extras', label: `Extras (${extras.length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                    activeTab === tab.id 
                      ? 'border-orange-500 text-orange-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 relative">
               {activeTab === 'general' && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del producto *</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Ej: Hamburguesa Clásica" />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Precio *</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                <input type="number" value={price} onChange={e => setPrice(e.target.value)} required className="w-full pl-8 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="0.00" />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
                                {categoriasEstaticas.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none h-20 resize-none" placeholder="Describe el plato..." />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-1">
                              <Clock size={16} className="text-slate-500" />
                              Tiempo preparación <span className="text-xs text-slate-400 font-normal">(opcional)</span>
                            </label>
                            <div className="relative flex items-center">
                              <input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none pr-12" placeholder="ej. 15" />
                              <span className="absolute right-4 text-sm text-slate-400">min</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Notas Sugeridas <span className="text-xs text-slate-400 font-normal">(opciones pre-cargadas para la orden)</span></label>
                            <input type="text" value={defaultNotes} onChange={e => setDefaultNotes(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Ej: Término de la carne 3/4" />
                          </div>
                          
                          <div className="flex items-center gap-2 pt-2">
                            <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500" />
                            <label htmlFor="isActive" className="text-sm text-slate-700 font-medium cursor-pointer">Producto Activo (Visible en Menú)</label>
                          </div>
                       </div>
                       
                       {/* Assets Column */}
                       <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2"><ImageIcon className="w-4 h-4 inline mr-1" />Imagen Principal</label>
                            <div className="flex items-center gap-4">
                              <label className="flex-1 cursor-pointer">
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-orange-500 bg-white transition-colors text-center">
                                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                                  <span className="text-sm text-slate-600">{imageFile ? imageFile.name : 'Subir Imagen JPG/PNG'}</span>
                                </div>
                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="hidden" />
                              </label>
                              {imagePreview && (
                                <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 relative group shrink-0">
                                  <img src={imagePreview} className="w-full h-full object-cover" />
                                  <button type="button" onClick={() => setImagePreview(null)} className="absolute top-1 right-1 p-1 bg-white/80 rounded-full hover:bg-white text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2"><Video className="w-4 h-4 inline mr-1" />Video MP4</label>
                            <div className="flex items-center gap-4">
                              <label className="flex-1 cursor-pointer">
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-orange-500 bg-white transition-colors text-center">
                                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                                  <span className="text-sm text-slate-600">{videoFile ? videoFile.name : 'Subir Video'}</span>
                                </div>
                                <input type="file" accept="video/mp4" onChange={handleVideoChange} className="hidden" />
                              </label>
                              {videoPreview && (
                                <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 relative group shrink-0">
                                  <video src={videoPreview} className="w-full h-full object-cover" muted />
                                  <button type="button" onClick={() => setVideoPreview(null)} className="absolute top-1 right-1 p-1 bg-white/80 rounded-full hover:bg-white text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2"><ImageIcon className="w-4 h-4 inline mr-1" />Galería Adicional</label>
                            <div className="grid grid-cols-4 gap-2">
                              {galleryImages.map((img, idx) => !img.isDeleted && (
                                <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-200 relative group">
                                  <img src={img.url} className="w-full h-full object-cover" />
                                  <button type="button" onClick={() => setGalleryImages(prev => prev.map((item, i) => i === idx ? { ...item, isDeleted: true } : item))} className="absolute top-1 right-1 p-1 bg-white/80 rounded-full hover:bg-white text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                </div>
                              ))}
                              {galleryImages.filter(img => !img.isDeleted).length < 5 && (
                                <label className="aspect-square border-2 border-dashed bg-white border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all">
                                  <Plus className="w-6 h-6 text-slate-400" />
                                  <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleGalleryChange} className="hidden" />
                                </label>
                              )}
                            </div>
                          </div>

                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'ingredients' && (
                 <div className="space-y-6">
                   <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-end gap-4 shadow-sm">
                     <div className="flex-1">
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del ingrediente</label>
                       <input type="text" value={newIngredientName} onChange={e => setNewIngredientName(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddIngredient())} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Ej: Cebolla" />
                     </div>
                     <div className="pb-2">
                       <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                         <input type="checkbox" checked={newIngredientRemovable} onChange={e => setNewIngredientRemovable(e.target.checked)} className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4" />
                         Se puede quitar
                       </label>
                     </div>
                     <button type="button" onClick={handleAddIngredient} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors">Añadir</button>
                   </div>
                   
                   <div className="space-y-2">
                     {ingredients.length === 0 ? (
                       <div className="text-center py-10 text-slate-400">Sin ingredientes configurados</div>
                     ) : (
                       ingredients.map((ing, idx) => (
                         <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                            <span className="font-medium text-slate-800 ml-2">{ing.name}</span>
                            <div className="flex items-center gap-4 mt-2 sm:mt-0">
                               <span className={`text-xs px-2 py-1 rounded-full ${ing.removable ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                                 {ing.removable ? 'Removible' : 'Fijo'}
                               </span>
                               <button type="button" onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1 bg-red-50 hover:bg-red-100 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                         </div>
                       ))
                     )}
                   </div>
                 </div>
               )}

               {activeTab === 'extras' && (
                 <div className="space-y-6">
                   <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-end gap-4 shadow-sm">
                     <div className="flex-1">
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del extra</label>
                       <input type="text" value={newExtraName} onChange={e => setNewExtraName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Ej: Queso Cheddar" />
                     </div>
                     <div className="w-32">
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio</label>
                       <input type="number" value={newExtraPrice} onChange={e => setNewExtraPrice(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddExtra())} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="0.00" />
                     </div>
                     <button type="button" onClick={handleAddExtra} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors">Añadir</button>
                   </div>
                   
                   <div className="space-y-2">
                     {extras.length === 0 ? (
                       <div className="text-center py-10 text-slate-400">Sin extras configurados</div>
                     ) : (
                       extras.map((ex, idx) => (
                         <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                            <span className="font-medium text-slate-800 ml-2">{ex.name}</span>
                            <div className="flex items-center gap-4 mt-2 sm:mt-0">
                               <span className="font-bold text-slate-600">+${Number(ex.price).toFixed(2)}</span>
                               <button type="button" onClick={() => setExtras(extras.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1 bg-red-50 hover:bg-red-100 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                         </div>
                       ))
                     )}
                   </div>
                 </div>
               )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 bg-white shrink-0">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
