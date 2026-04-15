import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function CreateProductCampaignModal({ isOpen, onClose, onCampaignCreated }) {
  const [campaignData, setCampaignData] = useState({
    message: '',
    audience: 'all',
    productIds: [],
    type: 'PRODUCT',
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [campaignDiscounts, setCampaignDiscounts] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      const productList = Array.isArray(response.data)
        ? response.data
        : response.data?.products || [];
      const activeProducts = productList.filter((p) => p.isActive);
      setProducts(activeProducts);
    } catch (err) {
      setError('Failed to fetch products');
      console.error(err);
    }
  };

  const getOfferPrice = (product) => {
    const mrp = Number(product.mrp || 0);
    const selectedDiscount = campaignDiscounts[product._id];
    const offerPercentage = Number.isFinite(Number(selectedDiscount))
      ? Number(selectedDiscount)
      : Number(product.offerPercentage || 0);
    const calculated = mrp - (mrp * (offerPercentage / 100));
    return Number.isFinite(calculated) ? Math.max(0, calculated) : 0;
  };

  const handleProductToggle = (productId) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
      setCampaignDiscounts((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    } else {
      newSelected.add(productId);
      setCampaignDiscounts((prev) => ({
        ...prev,
        [productId]: 10,
      }));
    }
    setSelectedProducts(newSelected);
  };

  const handleDiscountChange = (productId, value) => {
    const numericValue = Number(value);
    const clampedValue = Number.isFinite(numericValue)
      ? Math.min(100, Math.max(0, numericValue))
      : 0;

    setCampaignDiscounts((prev) => ({
      ...prev,
      [productId]: clampedValue,
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCampaignData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();

    if (selectedProducts.size === 0) {
      setError('Please select at least one product');
      return;
    }

    if (!campaignData.message.trim()) {
      setError('Please enter a campaign message');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/campaigns/product', {
        message: campaignData.message,
        audience: campaignData.audience,
        productIds: Array.from(selectedProducts),
        productOffers: Array.from(selectedProducts).map((productId) => ({
          productId,
          offerPercentage: Number(campaignDiscounts[productId] ?? 10),
        })),
      });

      setSuccess('Campaign created successfully!');
      setTimeout(() => {
        setCampaignData({
          message: '',
          audience: 'all',
          productIds: [],
          type: 'PRODUCT',
        });
        setSelectedProducts(new Set());
        setCampaignDiscounts({});
        onCampaignCreated?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create campaign');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-white">Create Product Campaign</h2>
            <p className="text-green-100 text-sm">Send products to customers</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-green-600 rounded-full p-2 transition"
          >
            x
          </button>
        </div>

        <form onSubmit={handleCreateCampaign} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Campaign Message *
            </label>
            <textarea
              name="message"
              value={campaignData.message}
              onChange={handleInputChange}
              placeholder="Enter your campaign message"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows="3"
            />
            <p className="text-xs text-gray-500 mt-1">
              This message will appear above the product list
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Target Audience *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="audience"
                  value="all"
                  checked={campaignData.audience === 'all'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-green-500 cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-700">All Customers</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="audience"
                  value="existing"
                  checked={campaignData.audience === 'existing'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-green-500 cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-700">Existing Customers</span>
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Selected audience: <span className="font-semibold">{campaignData.audience === 'existing' ? 'Existing Customers' : 'All Customers'}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Products * ({selectedProducts.size} selected)
            </label>
            {products.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                No products available. Create products first.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                {products.map((product) => (
                  <label
                    key={product._id}
                    className={`p-3 border rounded-lg cursor-pointer transition ${
                      selectedProducts.has(product._id)
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product._id)}
                        onChange={() => handleProductToggle(product._id)}
                        className="mt-1 w-4 h-4 text-green-500 cursor-pointer"
                      />
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs text-gray-400">No Image</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900">{product.name}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 flex-wrap">
                              <span className="line-through">Rs {Number(product.mrp || 0).toFixed(2)}</span>
                              <span className="font-bold text-green-600">Rs {getOfferPrice(product).toFixed(2)}</span>
                              {Number(
                                selectedProducts.has(product._id)
                                  ? campaignDiscounts[product._id] ?? 10
                                  : product.offerPercentage || 0
                              ) > 0 && (
                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                  {selectedProducts.has(product._id)
                                    ? Number(campaignDiscounts[product._id] ?? 10)
                                    : Number(product.offerPercentage || 0)
                                  }% OFF
                                </span>
                              )}
                            </div>
                            {selectedProducts.has(product._id) && (
                              <div className="mt-2 flex items-center gap-2">
                                <label className="text-xs font-semibold text-gray-700">Discount %</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={campaignDiscounts[product._id] ?? 10}
                                  onChange={(e) => handleDiscountChange(product._id, e.target.value)}
                                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
                                />
                              </div>
                            )}
                            <div className="mt-2 text-xs text-gray-600 space-y-1">
                              <p><span className="font-semibold text-gray-700">Unit:</span> {product.unitType || 'unit'}</p>
                              <p><span className="font-semibold text-gray-700">Category:</span> {product.category || 'General'}</p>
                              <p className="truncate"><span className="font-semibold text-gray-700">Redirect URL:</span> {product.redirectUrl || '-'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedProducts.size === 0}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
