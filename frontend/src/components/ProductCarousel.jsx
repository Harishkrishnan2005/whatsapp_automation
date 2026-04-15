import ProductCard from './ProductCard';

export default function ProductCarousel({ products, onProductBuy }) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-600/60 bg-slate-900/70 p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Featured Products</p>
      <div className="flex flex-col gap-2">
        {products.map((product, index) => (
          <ProductCard
            key={product._id || index}
            product={product}
            onBuyClick={() => onProductBuy && onProductBuy(product)}
          />
        ))}
      </div>
    </div>
  );
}
