import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiFilter, FiPackage } from 'react-icons/fi';
import api from '../utils/api';
import useAnalyticsStore from '../store/analyticsStore';
import { getDateRangePayload } from '../utils/dateRange';

const initialForm = {
  name: '',
  stock: '',
  mrp: '',
  offerPercentage: '',
  offerPrice: '',
  unitType: 'unit',
  category: '',
  image: '',
  imageFile: null,
  redirectUrl: '',
  rating: '',
  specifications: [{ label: '', value: '' }],
  isActive: true,
};

const Products = () => {
  const SERVER_FETCH_LIMIT = 200;
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [clientPage, setClientPage] = useState(1);
  const clientLimit = 6;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedImageName, setSelectedImageName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const dateRange = useAnalyticsStore((state) => state.dateRange);
  const searchQuery = useAnalyticsStore((state) => state.searchQuery);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRangePayload(dateRange);
      const params = new URLSearchParams({
        page: '1',
        limit: String(SERVER_FETCH_LIMIT),
      });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (searchQuery) params.set('search', searchQuery);

      const response = await api.get(`/products?${params.toString()}`);
      setProducts(response.data.products);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [dateRange, searchQuery]);

  useEffect(() => {
    setClientPage(1);
  }, [dateRange, searchQuery]);

  const resetForm = () => {
    setForm(initialForm);
    setEditing(null);
    setMessage('');
    setSelectedImageName('');
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImageName(file.name);
    setForm((prev) => ({ 
      ...prev, 
      imageFile: file,
      image: URL.createObjectURL(file) 
    }));
  };

  const addSpecification = () => {
    setForm((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { label: '', value: '' }],
    }));
  };

  const updateSpecification = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      specifications: prev.specifications.map((spec, specIndex) => {
        if (specIndex !== index) return spec;
        return { ...spec, [field]: value };
      }),
    }));
  };

  const removeSpecification = (index) => {
    setForm((prev) => {
      const updated = prev.specifications.filter((_, specIndex) => specIndex !== index);
      return {
        ...prev,
        specifications: updated.length ? updated : [{ label: '', value: '' }],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const mrpNum = Number(form.mrp);
      const stockNum = Number(form.stock) || 0;
      const offerPercentageNum = Number(form.offerPercentage) || 0;
      const ratingNum = form.rating === '' ? 0 : Number(form.rating);

      if (isNaN(mrpNum) || mrpNum <= 0) {
        setMessage('Please enter a valid MRP greater than 0.');
        setLoading(false);
        return;
      }

      if (isNaN(stockNum) || stockNum < 0) {
        setMessage('Please enter a valid quantity.');
        setLoading(false);
        return;
      }

      if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
        setMessage('Please enter an average rating between 0 and 5.');
        setLoading(false);
        return;
      }

      const offerPrice = mrpNum - (mrpNum * (offerPercentageNum / 100));
      const specifications = form.specifications
        .map((spec) => ({
          label: spec.label.trim(),
          value: spec.value.trim(),
        }))
        .filter((spec) => spec.label && spec.value);

      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('stock', stockNum);
      formData.append('mrp', mrpNum);
      formData.append('offerPercentage', offerPercentageNum);
      formData.append('offerPrice', offerPrice);
      formData.append('unitType', form.unitType);
      formData.append('category', form.category);
      formData.append('redirectUrl', form.redirectUrl);
      formData.append('rating', ratingNum);
      formData.append('isActive', form.isActive);
      formData.append('specifications', JSON.stringify(specifications));

      if (form.imageFile) {
        formData.append('image', form.imageFile);
      } else {
        formData.append('image', form.image);
      }

      const config = {
        headers: { 'Content-Type': 'multipart/form-data' }
      };

      if (editing) {
        await api.put(`/products/${editing._id}`, formData, config);
        setMessage('Product updated successfully');
      } else {
        await api.post('/products', formData, config);
        setMessage('Product added successfully');
      }
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Unable to save product', error);
      setMessage(error?.response?.data?.message || 'Unable to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      stock: product.stock ?? 0,
      mrp: product.mrp,
      offerPercentage: product.offerPercentage || 0,
      offerPrice: product.offerPrice,
      unitType: product.unitType || 'unit',
      category: product.category,
      image: product.image,
      redirectUrl: product.redirectUrl,
      rating: product.rating ?? 0,
      specifications: product.specifications?.length ? product.specifications : [{ label: '', value: '' }],
      isActive: product.isActive,
    });
    setMessage('');
    setSelectedImageName('');
  };

  const deleteProduct = async (id) => {
    const previousProducts = products;
    const previousTotal = total;

    setProducts((prev) => prev.filter((product) => product._id !== id));
    setTotal((prev) => Math.max(0, prev - 1));

    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (error) {
      console.error('Unable to delete product', error);
      setProducts(previousProducts);
      setTotal(previousTotal);
    }
  };

  const clientTotalPages = Math.max(1, Math.ceil(products.length / clientLimit));
  const visibleProducts = products.slice((clientPage - 1) * clientLimit, clientPage * clientLimit);
  const liveOfferPrice = Number(form.mrp || 0) > 0
    ? (Number(form.mrp || 0) - (Number(form.mrp || 0) * (Number(form.offerPercentage || 0) / 100)))
    : 0;

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      {/* Header & Catalog Hub */}
      <div className="relative overflow-hidden rounded-[2.75rem] border border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-blue-50/70 px-8 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-emerald-100/40 blur-3xl" />
      <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Products</h1>
             <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
             <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-black text-slate-500 uppercase tracking-[0.22em] leading-none shadow-sm">Catalog Studio</span>
          </div>
          <p className="mt-3 max-w-2xl text-slate-600 font-medium tracking-tight leading-relaxed">
            Organize inventory with cleaner pricing, richer product metadata, and a storefront-ready catalog layout.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/90 backdrop-blur p-2 rounded-[1.75rem] border border-slate-200/60 shadow-sm w-full xl:w-auto">
          <div className="flex-1 xl:w-80 relative group">
            <FiFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search products, categories, units..." 
              value={searchQuery}
              onChange={(e) => useAnalyticsStore.getState().setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-12 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] font-black text-slate-400">
               ⌘ K
            </div>
          </div>
          <div className="flex items-center gap-4 px-6 border-l border-slate-100">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
               <FiPackage className="h-5 w-5" />
            </div>
            <div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Inventory</p>
               <p className="text-xs font-black text-slate-900 mt-1 uppercase leading-none">{total} Products</p>
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        <aside className="lg:col-span-4 h-fit sticky top-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/70 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                   {editing ? 'Update Product' : 'Add Product'}
                   <span className="h-2 w-2 rounded-full bg-blue-600 block" />
                </h2>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Capture the product details your storefront and chatbot both rely on.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Live Price</p>
                <p className="mt-1 text-lg font-black text-slate-900">Rs {liveOfferPrice.toFixed(2)}</p>
              </div>
            </div>
            
            {message && <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 text-[10px] font-black text-blue-700 uppercase tracking-widest">{message}</div>}
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Product Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                  placeholder="Enter product name"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Base MRP</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.mrp}
                    onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Offer Percentage</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.offerPercentage}
                    onChange={(e) => setForm({ ...form, offerPercentage: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                    placeholder="Available quantity"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Unit Type</label>
                  <select
                    value={form.unitType}
                    onChange={(e) => setForm({ ...form, unitType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-black uppercase tracking-tight text-slate-600 outline-none focus:bg-white transition-all cursor-pointer appearance-none"
                    required
                  >
                    <option value="unit">PIECE / UNIT</option>
                    <option value="kg">KILOGRAM (KG)</option>
                    <option value="liter">LITER (L)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all"
                    placeholder="e.g. Grocery"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Avg Rating</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all"
                    placeholder="0.0 to 5.0"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Website Link</label>
                <input
                  type="url"
                  value={form.redirectUrl}
                  onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all"
                  placeholder="https://your-product-page.com"
                />
              </div>

              <div className="pt-4 border-t border-slate-50">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-4 block flex justify-between items-center">
                    Product Image
                    {form.image && <span className="text-emerald-500 font-bold tracking-normal">UPLOADED</span>}
                 </label>
                 <label className="cursor-pointer group block">
                   <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[1.5rem] p-6 text-center group-hover:bg-slate-100 group-hover:border-blue-300 transition-all">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedImageName ? selectedImageName : 'Add Product Image'}</p>
                   </div>
                   <input type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
                 </label>
              </div>

              <button type="submit" className="w-full py-5 rounded-[1.5rem] bg-gradient-to-r from-slate-900 to-blue-950 text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-900/20 hover:brightness-110 active:scale-95 transition-all mt-4">
                {editing ? 'Update Product' : 'Save Product'}
              </button>
              {editing && <button type="button" onClick={resetForm} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors mt-6">Cancel Edit</button>}
            </form>
          </div>
        </aside>

        <main className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between px-6">
             <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Product Showcase</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Live inventory cards</p>
             </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-[400px] bg-white rounded-[2.5rem] animate-pulse border border-slate-100 shadow-sm" />)
            ) : (
              visibleProducts.map((product) => (
                <div key={product._id} className="bg-white rounded-[2.5rem] border border-slate-200/70 shadow-[0_20px_50px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col group hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(15,23,42,0.12)] transition-all duration-500 relative">
                  <div className="h-56 bg-slate-100 relative overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => setSelectedProduct(product)}>
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Asset Missing</div>
                    )}
                    <div className="absolute top-6 right-6">
                       <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-xl ${product.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'}`}>
                         {product.isActive ? 'Active' : 'Offline'}
                       </span>
                    </div>
                  </div>
                  
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="mb-6 flex items-start justify-between gap-3">
                       <div>
                         <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.24em] mb-2 leading-none">{product.category}</p>
                         <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none line-clamp-1">{product.name}</h3>
                       </div>
                       <div className="rounded-xl bg-slate-50 px-3 py-2 text-right">
                         <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Unit</p>
                         <p className="mt-1 text-[10px] font-black uppercase text-slate-700">{product.unitType}</p>
                       </div>
                    </div>

                    <div className="mb-8">
                       <div className="flex items-baseline gap-3">
                          <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">₹{product.offerPrice?.toFixed(2)}</p>
                          <p className="text-[10px] font-bold text-slate-400 line-through tracking-tight leading-none">₹{product.mrp?.toFixed(2)}</p>
                       </div>
                       <div className="mt-5 grid grid-cols-3 gap-2">
                          <div className="rounded-2xl bg-slate-50 px-3 py-3">
                            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Qty</p>
                            <p className="mt-1 text-sm font-black text-slate-800">{product.stock ?? 0}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-3">
                            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Offer</p>
                            <p className="mt-1 text-sm font-black text-slate-800">{product.offerPercentage ?? 0}%</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-3">
                            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Rating</p>
                            <p className="mt-1 text-sm font-black text-slate-800">{product.rating ?? 0}</p>
                          </div>
                       </div>
                    </div>

                    <div className="mt-auto flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                       <button onClick={() => startEdit(product)} className="flex-1 py-3 rounded-2xl bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">Edit Product</button>
                       <button onClick={() => deleteProduct(product._id)} className="px-5 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-500 hover:text-white transition-all"><FiX className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {products.length > clientLimit && (
            <div className="mt-8 px-10 py-8 bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm flex items-center justify-between">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grid Index {clientPage} of {clientTotalPages}</p>
               <div className="flex gap-4">
                  <button disabled={clientPage === 1} onClick={() => setClientPage(p => p - 1)} className="h-12 px-8 rounded-2xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all disabled:opacity-30">Regress</button>
                  <button disabled={clientPage >= clientTotalPages} onClick={() => setClientPage(p => p + 1)} className="h-12 px-10 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-30">Advance</button>
               </div>
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedProduct(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[70vh]">
               <div className="md:w-1/2 bg-slate-100 relative h-64 md:h-full">
                  {selectedProduct.image ? <img src={selectedProduct.image} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-black text-slate-300">ASSET MISSING</div>}
                  <button onClick={() => setSelectedProduct(null)} className="absolute top-10 right-10 h-12 w-12 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/40 transition-all"><FiX className="h-6 w-6" /></button>
               </div>
               
               <div className="md:w-1/2 p-14 overflow-y-auto custom-scrollbar flex flex-col">
                  <div className="mb-10">
                     <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4 leading-none">{selectedProduct.category} PRODUCT</p>
                     <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-tight mb-6">{selectedProduct.name}</h3>
                     <div className="flex items-center gap-6">
                        <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">₹{selectedProduct.offerPrice?.toFixed(2)}</span>
                        {selectedProduct.offerPercentage > 0 && (
                          <span className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">{selectedProduct.offerPercentage}% DISCOUNT</span>
                        )}
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5 mb-10">
                     <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col justify-between h-36">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Node Variant</p>
                        <p className="text-lg font-black text-slate-800 uppercase tracking-tight">{selectedProduct.unitType}</p>
                     </div>
                     <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col justify-between h-36">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status Code</p>
                        <p className={`text-lg font-black uppercase tracking-tight ${selectedProduct.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>{selectedProduct.isActive ? 'Operational' : 'Idle'}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-10">
                     <div className="rounded-[1.75rem] border border-slate-100 bg-white px-5 py-5">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Quantity</p>
                        <p className="mt-2 text-lg font-black text-slate-800">{selectedProduct.stock ?? 0}</p>
                     </div>
                     <div className="rounded-[1.75rem] border border-slate-100 bg-white px-5 py-5">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Rating</p>
                        <p className="mt-2 text-lg font-black text-slate-800">{selectedProduct.rating ?? 0}</p>
                     </div>
                     <div className="rounded-[1.75rem] border border-slate-100 bg-white px-5 py-5">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Link</p>
                        <p className="mt-2 text-xs font-black text-slate-800 break-all line-clamp-2">{selectedProduct.redirectUrl || 'Not added'}</p>
                     </div>
                  </div>

                  <div className="space-y-6 flex-1">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Resource Specifications</h4>
                     <div className="space-y-3">
                        {selectedProduct.specifications?.length > 0 ? (
                           selectedProduct.specifications.map((spec, index) => (
                             <div key={index} className="flex items-center justify-between px-6 py-4 rounded-2xl border border-slate-100 bg-white shadow-sm hover:border-blue-200 transition-all group">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-400">{spec.label}</span>
                                <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{spec.value}</span>
                             </div>
                           ))
                        ) : <p className="text-xs font-black text-slate-300 uppercase tracking-widest px-1 italic">Buffer empty.</p>}
                     </div>
                  </div>

                  <div className="mt-12">
                     <button onClick={() => setSelectedProduct(null)} className="w-full py-5 rounded-[1.5rem] bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-black transition-all">Close Instance</button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Products;
