import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import api from '../utils/api';
import useAnalyticsStore from '../store/analyticsStore';
import { getDateRangePayload } from '../utils/dateRange';

const initialForm = {
  name: '',
  mrp: '',
  offerPercentage: '',
  offerPrice: '',
  unitType: 'unit',
  category: '',
  image: '',
  redirectUrl: '',
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
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
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
    try {
      const mrp = Number(form.mrp);
      const offerPercentage = Number(form.offerPercentage) || 0;

      if (isNaN(mrp) || mrp <= 0) {
        setMessage('Please enter a valid MRP greater than 0.');
        return;
      }

      if (isNaN(offerPercentage) || offerPercentage < 0 || offerPercentage > 100) {
        setMessage('Please enter a valid offer percentage between 0 and 100.');
        return;
      }

      const offerPrice = mrp - (mrp * (offerPercentage / 100));
      const specifications = form.specifications
        .map((spec) => ({
          label: spec.label.trim(),
          value: spec.value.trim(),
        }))
        .filter((spec) => spec.label && spec.value);

      const payload = {
        name: form.name,
        mrp,
        offerPercentage,
        offerPrice,
        unitType: form.unitType,
        category: form.category,
        image: form.image,
        redirectUrl: form.redirectUrl,
        specifications,
        isActive: form.isActive,
      };

      if (editing) {
        await api.put(`/products/${editing._id}`, payload);
        setMessage('Product updated successfully');
      } else {
        await api.post('/products', payload);
        setMessage('Product added successfully');
      }
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Unable to save product', error);
      setMessage(error?.response?.data?.message || 'Unable to save product. Please try again.');
    }
  };

  const startEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      mrp: product.mrp,
      offerPercentage: product.offerPercentage || 0,
      offerPrice: product.offerPrice,
      unitType: product.unitType || 'unit',
      category: product.category,
      image: product.image,
      redirectUrl: product.redirectUrl,
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

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Products</h1>
          <p className="mt-2 text-slate-500 font-medium">Add and manage the products shown in your catalog.</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Items</p>
           <p className="text-sm font-bold text-slate-900 mt-1">{total} Active Products</p>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-3">
        <section className="lg:col-span-1 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-sm h-fit">
          <h2 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-2">
             {editing ? 'Edit Product' : 'Add New Product'}
             <span className="h-2 w-2 rounded-full bg-blue-600 block" />
          </h2>
          
          {message && <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100 text-[10px] font-black text-blue-700 uppercase tracking-widest">{message}</div>}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Product Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-50/50 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                placeholder="Enter product name"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Price (MRP)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.mrp}
                  onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                  className="w-full bg-slate-50/50 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Discount %</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.offerPercentage}
                  onChange={(e) => setForm({ ...form, offerPercentage: e.target.value })}
                  className="w-full bg-slate-50/50 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                  placeholder="0"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Unit Type</label>
                <select
                  value={form.unitType}
                  onChange={(e) => setForm({ ...form, unitType: e.target.value })}
                  className="w-full bg-slate-50/50 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all cursor-pointer"
                  required
                >
                  <option value="unit">Piece / Unit</option>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="gram">Gram (g)</option>
                  <option value="liter">Liter (L)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Category</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-50/50 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all"
                  placeholder="e.g. Clothes, Food"
                  required
                />
              </div>
            </div>

            <div className="border-t border-slate-50 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Specifications</label>
                <button
                  type="button"
                  onClick={addSpecification}
                  className="text-[9px] font-black uppercase text-blue-600 tracking-widest hover:underline"
                >
                  + Add Detail
                </button>
              </div>
              <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                {form.specifications.map((spec, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <input
                      value={spec.label}
                      onChange={(e) => updateSpecification(index, 'label', e.target.value)}
                      className="bg-slate-50 border-none rounded-lg px-3 py-2 text-[10px] font-bold text-slate-600 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
                      placeholder="Size"
                    />
                    <input
                      value={spec.value}
                      onChange={(e) => updateSpecification(index, 'value', e.target.value)}
                      className="bg-slate-50 border-none rounded-lg px-3 py-2 text-[10px] font-bold text-slate-600 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
                      placeholder="XL"
                    />
                    <button type="button" onClick={() => removeSpecification(index)} className="h-8 w-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center text-xs hover:bg-rose-100 transition-all"><FiX /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-50 pt-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Product Image</label>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer group">
                  <div className="bg-slate-50 border-slate-100 border rounded-xl px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center group-hover:bg-slate-100 transition-all">
                     {selectedImageName ? selectedImageName : 'Upload Image'}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
                </label>
                {form.image && <div className="h-10 w-10 rounded-lg bg-slate-900 overflow-hidden ring-2 ring-white shadow-sm"><img src={form.image} className="h-full w-full object-cover" /></div>}
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-4 rounded-2xl shadow-xl shadow-blue-500/10 text-xs font-black uppercase tracking-[0.2em] mt-8">
              {editing ? 'Update Product' : 'Add Product'}
            </button>
            {editing && <button type="button" onClick={resetForm} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors mt-4">Cancel</button>}
          </form>
        </section>

          <section className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between px-4">
               <div>
                  <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Product List</h2>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage all your products here</p>
               </div>
            </div>

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2">
                 {[1, 2, 3, 4].map((i) => (
                   <div key={`product-skeleton-${i}`} className="h-64 bg-white rounded-[2rem] animate-pulse shadow-sm" />
                 ))}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <div
                    key={product._id}
                    className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => setSelectedProduct(product)}>
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Image</div>
                      )}
                      <div className="absolute top-4 right-4">
                         <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm ${product.isActive ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                           {product.isActive ? 'Active' : 'Hidden'}
                         </span>
                      </div>
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="mb-4">
                         <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1">{product.category}</p>
                         <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight line-clamp-1">{product.name}</h3>
                      </div>

                      <div className="mb-6 space-y-1">
                         <div className="flex items-baseline gap-2">
                            <p className="text-lg font-black text-slate-900 tracking-tighter">Rs {product.offerPrice?.toFixed(2)}</p>
                            <p className="text-[10px] font-bold text-slate-400 line-through">Rs {product.mrp?.toFixed(2)}</p>
                         </div>
                         {product.offerPercentage > 0 && (
                           <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Save {product.offerPercentage}%</span>
                         )}
                      </div>

                      <div className="mt-auto flex gap-2 pt-4 border-t border-slate-50">
                         <button onClick={() => startEdit(product)} className="flex-1 py-2 rounded-xl bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all">Edit</button>
                         <button onClick={() => deleteProduct(product._id)} className="flex-1 py-2 rounded-xl bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 transition-all">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {products.length > clientLimit && (
              <div className="flex justify-end gap-2 px-2">
                 <button disabled={clientPage === 1} onClick={() => setClientPage(p => p - 1)} className="btn-secondary h-12 px-6 text-[10px] uppercase font-black">Back</button>
                 <button disabled={clientPage >= clientTotalPages} onClick={() => setClientPage(p => p + 1)} className="btn-primary h-12 px-8 text-[10px] uppercase font-black">Next</button>
              </div>
            )}
         </section>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
             <div className="h-64 bg-slate-100 relative">
                {selectedProduct.image ? <img src={selectedProduct.image} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-black text-slate-300">NO IMAGE</div>}
                <button onClick={() => setSelectedProduct(null)} className="absolute top-8 right-8 h-10 w-10 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/40 transition-all"><FiX /></button>
             </div>
             
             <div className="p-12 overflow-y-auto custom-scrollbar">
                <div className="mb-8 flex justify-between items-start">
                   <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{selectedProduct.category}</p>
                      <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight uppercase leading-none">{selectedProduct.name}</h3>
                   </div>
                   <span className="text-2xl font-black text-slate-900 tracking-tighter">Rs {selectedProduct.offerPrice?.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                   <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-28">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Unit Type</p>
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{selectedProduct.unitType}</p>
                   </div>
                   <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-28">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Discount</p>
                      <p className="text-sm font-black text-emerald-600 uppercase tracking-tight">{selectedProduct.offerPercentage}% OFF</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Specifications</h4>
                   {selectedProduct.specifications?.length > 0 ? (
                      <div className="space-y-2">
                         {selectedProduct.specifications.map((spec, index) => (
                           <div key={index} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{spec.label}</span>
                              <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">{spec.value}</span>
                           </div>
                         ))}
                      </div>
                   ) : <p className="text-xs font-bold text-slate-300 italic px-1">No details added.</p>}
                </div>
             </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};


export default Products;
