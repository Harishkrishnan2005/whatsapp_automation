import { useEffect, useState } from 'react';
import api from '../utils/api';

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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/products?page=1&limit=${SERVER_FETCH_LIMIT}`);
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
  }, []);

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
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Product Management</h1>
            <p className="text-white/60 mt-2">Add, update, and manage product listings for the chatbot catalog.</p>
          </div>
          <div className="rounded-2xl backdrop-blur-md border border-white/20 shadow-xl p-6 w-full lg:w-auto">
            <p className="text-sm text-white/70">Total Products</p>
            <p className="text-4xl font-semibold text-white mt-2">{total}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-1 rounded-2xl backdrop-blur-md border border-white/20 shadow-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">{editing ? 'Edit Product' : 'Add New Product'}</h2>
            {message && <div className="mb-4 text-sm text-green-400 bg-green-600/20 border border-green-400/30 p-3 rounded-lg">{message}</div>}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-white/70 font-medium mb-2">Product Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-white/20 rounded-lg px-4 py-2 bg-white/10 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="Rice"
                  required
                />
              </div>
              <div>
                <label className="block text-white/70 font-medium mb-2">MRP - Maximum Retail Price (Rs)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.mrp}
                  onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                  className="w-full border border-white/20 rounded-lg px-4 py-2 bg-white/10 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="100.00"
                  required
                />
              </div>
              <div>
                <label className="block text-white/70 font-medium mb-2">Offer Discount (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.offerPercentage}
                  onChange={(e) => setForm({ ...form, offerPercentage: e.target.value })}
                  className="w-full border border-white/20 rounded-lg px-4 py-2 bg-white/10 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="0"
                  min="0"
                  max="100"
                />
                {form.mrp && form.offerPercentage && (
                  <p className="text-xs text-green-400 mt-1">
                    Selling Price: Rs {(form.mrp - (form.mrp * form.offerPercentage / 100)).toFixed(2)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-white/70 font-medium mb-2">Unit Type</label>
                <select
                  value={form.unitType}
                  onChange={(e) => setForm({ ...form, unitType: e.target.value })}
                  className="w-full border border-white/20 rounded-lg px-4 py-2 bg-white/10 text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  required
                >
                  <option value="kg" className="bg-slate-800">Kilogram (kg)</option>
                  <option value="gram" className="bg-slate-800">Gram (g)</option>
                  <option value="liter" className="bg-slate-800">Liter (L)</option>
                  <option value="piece" className="bg-slate-800">Piece</option>
                </select>
              </div>
              <div>
                <label className="block text-white/70 font-medium mb-2">Category</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-white/20 rounded-lg px-4 py-2 bg-white/10 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="Groceries"
                  required
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-white/70 font-medium">Specifications</label>
                  <button
                    type="button"
                    onClick={addSpecification}
                    className="rounded-md bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 px-3 py-1 text-xs font-semibold text-blue-200"
                  >
                    + Add Spec
                  </button>
                </div>
                <div className="space-y-2">
                  {form.specifications.map((spec, index) => (
                    <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input
                        value={spec.label}
                        onChange={(e) => updateSpecification(index, 'label', e.target.value)}
                        className="w-full border border-white/20 rounded-lg px-3 py-2 bg-white/10 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400"
                        placeholder="Label (e.g., Weight)"
                      />
                      <input
                        value={spec.value}
                        onChange={(e) => updateSpecification(index, 'value', e.target.value)}
                        className="w-full border border-white/20 rounded-lg px-3 py-2 bg-white/10 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400"
                        placeholder="Value (e.g., 5kg)"
                      />
                      <button
                        type="button"
                        onClick={() => removeSpecification(index)}
                        className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/70 hover:bg-white/10 transition"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white/70 font-medium mb-2">Product Image</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 px-4 py-2 text-sm font-semibold text-blue-200 transition">
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />
                  </label>
                  <span className="text-sm text-white/60 truncate">
                    {selectedImageName || (editing && form.image ? 'Current image selected' : 'No file chosen')}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-white/70 font-medium mb-2">Redirect URL</label>
                <input
                  value={form.redirectUrl}
                  onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })}
                  className="w-full border border-white/20 rounded-lg px-4 py-2 bg-white/10 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="https://example.com/product"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button className="flex-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 text-blue-200 rounded-lg px-4 py-2 transition font-semibold">
                  {editing ? 'Update Product' : 'Create Product'}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 border border-white/20 text-white/70 hover:text-white rounded-lg px-4 py-2 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="lg:col-span-2">
            <div className="rounded-2xl backdrop-blur-md border border-white/20 shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">Products</h2>
                  <p className="text-white/60 text-sm">Active product catalog for the chatbot and storefront.</p>
                  <p className="text-xs text-blue-400 mt-2">Tap any card to view full details.</p>
                </div>
              </div>
              {loading ? (
                <div className="text-center py-16 text-white/50">Loading products...</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleProducts.map((product) => (
                    <div
                      key={product._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedProduct(product)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedProduct(product);
                        }
                      }}
                      className="rounded-2xl border border-white/20 overflow-hidden shadow-lg cursor-pointer transition hover:shadow-2xl hover:border-white/40 hover:-translate-y-1 bg-white/5"
                    >
                      <div className="h-40 bg-slate-800/50 overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full flex items-center justify-center text-white/30">No image</div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-white truncate">{product.name}</h3>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${product.isActive ? 'bg-green-600/30 text-green-200 border border-green-400/30' : 'bg-red-600/30 text-red-200 border border-red-400/30'}`}>
                            {product.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-white/50 line-through">Rs {product.mrp?.toFixed(2)}</span>
                            <span className="text-lg font-bold text-green-400">Rs {product.offerPrice?.toFixed(2)}</span>
                            {product.offerPercentage > 0 && (
                              <span className="text-xs bg-red-600/30 text-red-200 border border-red-400/30 px-2 py-0.5 rounded font-semibold">
                                {product.offerPercentage}% OFF
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-white/60 mb-1">{product.unitType}</p>
                        <p className="text-sm text-white/60 mb-2">{product.category}</p>
                        {product.specifications?.length > 0 && (
                          <p className="text-xs text-white/60 mb-3">{product.specifications.length} specification(s)</p>
                        )}
                        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => startEdit(product)}
                            className="flex-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 text-blue-200 rounded-lg px-3 py-2 text-sm transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteProduct(product._id)}
                            className="flex-1 border border-white/20 text-white/70 hover:text-white rounded-lg px-3 py-2 text-sm transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-8 flex justify-end">
                <div className="flex gap-2">
                  <button
                    onClick={() => setClientPage((prev) => Math.max(1, prev - 1))}
                    disabled={clientPage === 1}
                    className="rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setClientPage((prev) => Math.min(clientTotalPages, prev + 1))}
                    disabled={clientPage >= clientTotalPages}
                    className="rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 px-4 py-2 text-sm font-semibold text-blue-200 disabled:opacity-50 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/70 p-4 sm:p-8 backdrop-blur-sm"
          onClick={() => setSelectedProduct(null)}
          role="presentation"
        >
          <div
            className="mx-auto max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-2xl backdrop-blur-md border border-white/20 shadow-2xl bg-slate-900/95"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {selectedProduct.image ? (
              <img src={selectedProduct.image} alt={selectedProduct.name} className="h-56 w-full object-cover rounded-2xl rounded-b-none" />
            ) : (
              <div className="h-56 w-full bg-slate-800 flex items-center justify-center text-white/30 rounded-2xl rounded-b-none">No image</div>
            )}

            <div className="p-5 sm:p-6">
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedProduct.name}</h3>
                  <p className="text-sm text-white/60 mt-2">{selectedProduct.category} | {selectedProduct.unitType}</p>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm text-white transition"
                >
                  Close
                </button>
              </div>

              <div className="mb-6 rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-sm text-white/60">Price Details</p>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-white/50 line-through">Rs {selectedProduct.mrp?.toFixed(2)}</span>
                  <span className="text-2xl font-bold text-green-400">Rs {selectedProduct.offerPrice?.toFixed(2)}</span>
                  {selectedProduct.offerPercentage > 0 && (
                    <span className="rounded bg-red-600/30 border border-red-400/30 px-2 py-1 text-xs font-semibold text-red-200">
                      {selectedProduct.offerPercentage}% OFF
                    </span>
                  )}
                </div>
              </div>

              {selectedProduct.specifications?.length > 0 ? (
                <div className="mb-6">
                  <h4 className="mb-3 text-sm font-semibold text-white">Specifications</h4>
                  <div className="space-y-2">
                    {selectedProduct.specifications.map((spec, index) => (
                      <div key={`${spec.label}-${index}`} className="flex items-start justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-sm font-medium text-white pr-3">{spec.label}</p>
                        <p className="text-sm text-white/70 text-right">{spec.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mb-6 text-sm text-white/50">No specifications added for this product.</p>
              )}

              {selectedProduct.redirectUrl ? (
                <a
                  href={selectedProduct.redirectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 px-4 py-2 text-sm font-semibold text-blue-200 transition"
                >
                  Open Redirect URL
                </a>
              ) : (
                <p className="text-sm text-white/50">No redirect URL available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Products;
